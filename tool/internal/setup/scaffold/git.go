package scaffold

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup/childenv"
)

// Commit is the fixed identity and message of the site's first commit.
type Commit struct {
	AuthorName  string
	AuthorEmail string
	Message     string
}

var errNoEnv = errors.New("scaffold: no environment for git; set Env, as the process's environment by name")

// git runs git in dir from env, scrubbed of credentials, plus extra, capturing both output
// streams. The owner's user and system git config are ignored, so a signing setting on the
// owner's machine cannot stop or alter a commit, and core.hooksPath is a fresh empty folder, so
// no hook in dir runs. Nothing git prints reaches the terminal; a failure carries its stderr. A
// nil env is refused: git would start without PATH, HOME, or the owner's proxy settings.
func git(ctx context.Context, env map[string]string, dir string, extra []string, args ...string) (string, error) {
	if env == nil {
		return "", errNoEnv
	}
	hooks, err := os.MkdirTemp("", "cairn-no-hooks-")
	if err != nil {
		return "", fmt.Errorf("scaffold: make an empty hooks folder: %w", err)
	}
	defer func() { _ = os.RemoveAll(hooks) }()
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	cmd.Env = append(childenv.Git(env, hooks), extra...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("scaffold: git %s: %w: %s", args[0], err, strings.TrimSpace(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
}

// initRepository makes dir a git repository on branch, adds origin, commits everything with
// the fixed identity, and returns the commit's SHA. The empty --template copies no template
// folder, git's default one included, whose config or info/attributes could add a filter that
// the commit's add would run.
func initRepository(ctx context.Context, env map[string]string, dir, branch, originURL string, c Commit) (string, error) {
	if _, err := git(ctx, env, dir, nil, "init", "--quiet", "--template=", "-b", branch); err != nil {
		return "", err
	}
	if _, err := git(ctx, env, dir, nil, "remote", "add", "origin", originURL); err != nil {
		return "", err
	}
	return commitAll(ctx, env, dir, c)
}

// identity is c's fixed author and committer.
func identity(c Commit) []string {
	return []string{
		"GIT_AUTHOR_NAME=" + c.AuthorName, "GIT_AUTHOR_EMAIL=" + c.AuthorEmail,
		"GIT_COMMITTER_NAME=" + c.AuthorName, "GIT_COMMITTER_EMAIL=" + c.AuthorEmail,
	}
}

// commitAll stages everything in dir, commits it with c's fixed identity, and returns the SHA.
func commitAll(ctx context.Context, env map[string]string, dir string, c Commit) (string, error) {
	if _, err := git(ctx, env, dir, nil, "add", "--all"); err != nil {
		return "", err
	}
	if _, err := git(ctx, env, dir, identity(c), "commit", "--quiet", "--no-verify", "--no-gpg-sign", "-m", c.Message); err != nil {
		return "", err
	}
	return git(ctx, env, dir, nil, "rev-parse", "HEAD")
}

// commitFile commits the tree's copy of rel alone with c's fixed identity and returns the SHA.
// Whatever else the index or the tree holds stays out of the commit.
func commitFile(ctx context.Context, env map[string]string, dir, rel string, c Commit) (string, error) {
	if _, err := git(ctx, env, dir, identity(c), "commit", "--quiet", "--no-verify", "--no-gpg-sign", "-m", c.Message, "--", rel); err != nil {
		return "", err
	}
	return git(ctx, env, dir, nil, "rev-parse", "HEAD")
}
