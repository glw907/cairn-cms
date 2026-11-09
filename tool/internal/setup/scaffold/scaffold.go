package scaffold

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Config is one scaffold run.
type Config struct {
	// Template is the fetched template.
	Template *Template
	// Theme is the catalog id to scaffold; empty names the catalog's only entry.
	Theme string
	// Site holds the values the substitutions write.
	Site Site
	// Commit is the first commit's identity and message.
	Commit Commit
	// Dir is the site folder. It must not exist, or be empty.
	Dir string
}

// Result describes a written site.
type Result struct {
	// Dir is the site folder's absolute path.
	Dir string
	// CommitSHA is the first commit's SHA.
	CommitSHA string
	// EngineVersion is the exact engine version the site's package.json pins.
	EngineVersion string
}

// Scaffold writes the site into cfg.Dir and commits it locally on the repository's default
// branch, with origin set to the repository's https URL. The site is built in a sibling temp
// folder and moved into place only once every step has passed, so a failure leaves nothing at
// cfg.Dir.
func Scaffold(ctx context.Context, cfg Config) (Result, error) {
	if cfg.Template == nil {
		return Result{}, errors.New("scaffold: no template")
	}
	if err := cfg.Site.validate(); err != nil {
		return Result{}, err
	}
	if strings.TrimSpace(cfg.Commit.Message) == "" || cfg.Commit.AuthorName == "" || cfg.Commit.AuthorEmail == "" {
		return Result{}, errors.New("scaffold: the commit needs an author name, an author email, and a message")
	}
	th, err := cfg.Template.theme(cfg.Theme)
	if err != nil {
		return Result{}, err
	}
	dst, err := filepath.Abs(cfg.Dir)
	if err != nil {
		return Result{}, fmt.Errorf("scaffold: resolve %s: %w", cfg.Dir, err)
	}
	if err := requireFree(dst); err != nil {
		return Result{}, err
	}
	parent := filepath.Dir(dst)
	if err := os.MkdirAll(parent, 0o755); err != nil {
		return Result{}, fmt.Errorf("scaffold: create %s: %w", parent, err)
	}
	stage, err := os.MkdirTemp(parent, ".cairn-new-")
	if err != nil {
		return Result{}, fmt.Errorf("scaffold: create a staging folder: %w", err)
	}
	moved := false
	defer func() {
		if !moved {
			_ = os.RemoveAll(stage)
		}
	}()

	if err := cfg.Template.writeTree(stage, th); err != nil {
		return Result{}, err
	}
	if err := substitute(stage, cfg.Site, cfg.Template.Version); err != nil {
		return Result{}, err
	}
	origin := "https://github.com/" + cfg.Site.Owner + "/" + cfg.Site.Repo + ".git"
	sha, err := initRepository(ctx, stage, cfg.Site.DefaultBranch, origin, cfg.Commit)
	if err != nil {
		return Result{}, err
	}
	if err := os.Remove(dst); err != nil && !os.IsNotExist(err) {
		return Result{}, fmt.Errorf("scaffold: clear the empty folder %s: %w", dst, err)
	}
	if err := os.Rename(stage, dst); err != nil {
		return Result{}, fmt.Errorf("scaffold: move the site into %s: %w", dst, err)
	}
	moved = true
	return Result{Dir: dst, CommitSHA: sha, EngineVersion: cfg.Template.Version}, nil
}

// requireFree accepts a path that does not exist or is an empty directory.
func requireFree(dst string) error {
	entries, err := os.ReadDir(dst)
	switch {
	case os.IsNotExist(err):
		return nil
	case err != nil:
		return fmt.Errorf("scaffold: %s is not a usable folder: %w", dst, err)
	case len(entries) > 0:
		return fmt.Errorf("scaffold: %s already exists and is not empty", dst)
	}
	return nil
}
