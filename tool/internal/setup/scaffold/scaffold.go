package scaffold

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ConfigMessage is the message of the second commit, the one that writes the site's Cloudflare
// and GitHub settings.
const ConfigMessage = "Connect the site to Cloudflare and GitHub"

// Config is one scaffold run.
type Config struct {
	// Template is the fetched template.
	Template *Template
	// Theme is the catalog id to scaffold; empty names the catalog's only entry.
	Theme string
	// Site holds the values the substitutions write. Write leaves DatabaseID unread.
	Site Site
	// Commit is the first commit's identity and message. The second commit takes the same
	// identity and ConfigMessage.
	Commit Commit
	// Dir is the site folder. It must not exist, or be empty.
	Dir string
	// Env is the environment git starts from, by name. Every variable that holds a credential is
	// dropped before git sees it.
	Env map[string]string
}

// Result describes a written site.
type Result struct {
	// Dir is the site folder's absolute path.
	Dir string
	// CommitSHA is the last commit's SHA.
	CommitSHA string
	// EngineVersion is the exact engine version the site's package.json pins.
	EngineVersion string
}

// FinalizeConfig is the second pass over a folder Write made.
type FinalizeConfig struct {
	// Dir is the site folder Write returned.
	Dir string
	// Base is the SHA of Write's commit. The folder's HEAD must be Base, or a commit whose parent
	// is Base: a second pass that committed before its caller could record it.
	Base string
	// Site holds the values the second pass writes, DatabaseID included.
	Site Site
	// Commit is the identity the second commit carries; its Message is ignored for
	// ConfigMessage.
	Commit Commit
	// Env is the environment git starts from, as Config.Env.
	Env map[string]string
}

// Scaffold writes the site into cfg.Dir in both passes and commits each locally on the
// repository's default branch, with origin set to the repository's https URL. The site is built
// in a sibling temp folder and moved into place only once every step has passed, so a failure
// leaves nothing at cfg.Dir.
func Scaffold(ctx context.Context, cfg Config) (Result, error) {
	if err := cfg.Site.validate(true); err != nil {
		return Result{}, err
	}
	return write(ctx, cfg, func(stage string) (string, error) {
		return secondCommit(ctx, cfg.Env, stage, cfg.Site, cfg.Commit)
	})
}

// Write is the first pass: it writes the template and every edit that needs no Cloudflare
// resource, commits locally, and moves the folder into place. Like Scaffold, a failure leaves
// nothing at cfg.Dir.
func Write(ctx context.Context, cfg Config) (Result, error) {
	if err := cfg.Site.validate(false); err != nil {
		return Result{}, err
	}
	return write(ctx, cfg, nil)
}

// Finalize is the second pass: from the folder at Base it writes the Worker, database, and
// GitHub App settings and commits them, returning the new SHA. A rerun after a second pass that
// committed resets to Base and writes again, so Finalize can always be repeated. A failed edit
// resets the folder to Base.
func Finalize(ctx context.Context, cfg FinalizeConfig) (string, error) {
	if err := cfg.Site.validate(true); err != nil {
		return "", err
	}
	if _, err := onBase(ctx, cfg.Env, cfg.Dir, cfg.Base); err != nil {
		return "", err
	}
	if _, err := git(ctx, cfg.Env, cfg.Dir, nil, "reset", "--quiet", "--hard", cfg.Base); err != nil {
		return "", err
	}
	sha, err := secondCommit(ctx, cfg.Env, cfg.Dir, cfg.Site, cfg.Commit)
	if err != nil {
		_, _ = git(ctx, cfg.Env, cfg.Dir, nil, "reset", "--quiet", "--hard", cfg.Base)
		return "", err
	}
	return sha, nil
}

// InstallationMessage is the message of the commit that writes a new GitHub App installation
// into a finalized site's settings.
const InstallationMessage = "Update the GitHub App installation"

// SettingsFile is the site file that holds the GitHub App identity, in slash form under the
// site folder.
func SettingsFile() string { return targets.CairnConfig }

// NamesApp reports whether the site's settings at commit in dir hold s's GitHub App identity,
// its installation id included. env is the environment git starts from, as Config.Env.
func NamesApp(ctx context.Context, env map[string]string, dir, commit string, s Site) (bool, error) {
	content, err := git(ctx, env, dir, nil, "show", commit+":"+targets.CairnConfig)
	if err != nil {
		return false, err
	}
	return strings.Contains(content, githubApp(s)), nil
}

// UpdateInstallation writes cfg.Site's GitHub App identity over the one a finalized site's
// settings hold and commits that file alone on Base with InstallationMessage, returning the new
// SHA. Like Finalize it takes a folder at Base or at a commit whose parent is Base, which it
// resets to Base first, so the caller must know that it made that commit and never pushed it. At
// Base itself nothing is reset, and nothing but the settings file goes into the commit. A failed
// edit or commit restores the file.
func UpdateInstallation(ctx context.Context, cfg FinalizeConfig) (string, error) {
	if err := cfg.Site.validate(true); err != nil {
		return "", err
	}
	head, err := onBase(ctx, cfg.Env, cfg.Dir, cfg.Base)
	if err != nil {
		return "", err
	}
	if head != cfg.Base {
		if _, err := git(ctx, cfg.Env, cfg.Dir, nil, "reset", "--quiet", "--hard", cfg.Base); err != nil {
			return "", err
		}
	}
	c := cfg.Commit
	c.Message = InstallationMessage
	var sha string
	err = editInstallation(cfg.Dir, cfg.Site)
	if err == nil {
		sha, err = commitFile(ctx, cfg.Env, cfg.Dir, targets.CairnConfig, c)
	}
	if err != nil {
		_, _ = git(ctx, cfg.Env, cfg.Dir, nil, "checkout", "--quiet", "HEAD", "--", targets.CairnConfig)
		return "", err
	}
	return sha, nil
}

// onBase returns the folder's HEAD when it is base or a commit whose parent is base: a pass that
// committed before its caller could record it.
func onBase(ctx context.Context, env map[string]string, dir, base string) (string, error) {
	head, err := git(ctx, env, dir, nil, "rev-parse", "HEAD")
	if err != nil {
		return "", err
	}
	if head != base {
		parent, err := git(ctx, env, dir, nil, "rev-parse", "HEAD^")
		if err != nil || parent != base {
			return "", fmt.Errorf("scaffold: %s is not at the commit %s", dir, base)
		}
	}
	return head, nil
}

// write runs the first pass in a staging folder, then more (when non-nil) on it, and moves the
// result into place.
func write(ctx context.Context, cfg Config, more func(stage string) (string, error)) (Result, error) {
	if cfg.Template == nil {
		return Result{}, errors.New("scaffold: no template")
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
	if err := substitute(stage, cfg.Site, cfg.Template.Version, firstPass); err != nil {
		return Result{}, err
	}
	origin := "https://github.com/" + cfg.Site.Owner + "/" + cfg.Site.Repo + ".git"
	sha, err := initRepository(ctx, cfg.Env, stage, cfg.Site.DefaultBranch, origin, cfg.Commit)
	if err != nil {
		return Result{}, err
	}
	if more != nil {
		if sha, err = more(stage); err != nil {
			return Result{}, err
		}
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

// secondCommit applies the second pass's edits in dir and commits them. None of them reads the
// engine version, which the first pass already pinned.
func secondCommit(ctx context.Context, env map[string]string, dir string, s Site, c Commit) (string, error) {
	if err := substitute(dir, s, "", secondPass); err != nil {
		return "", err
	}
	c.Message = ConfigMessage
	return commitAll(ctx, env, dir, c)
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
