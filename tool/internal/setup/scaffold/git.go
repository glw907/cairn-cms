package scaffold

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// childEnv returns env without any variable that holds a credential: CLOUDFLARE_API_TOKEN,
// GH_TOKEN, GITHUB_TOKEN, and every CAIRN_*_TOKEN. A child process inherits the parent's
// environment otherwise, and git or npm has no use for these.
func childEnv(env []string) []string {
	out := make([]string, 0, len(env))
	for _, kv := range env {
		name, _, _ := strings.Cut(kv, "=")
		upper := strings.ToUpper(name)
		switch {
		case upper == "CLOUDFLARE_API_TOKEN", upper == "GH_TOKEN", upper == "GITHUB_TOKEN":
			continue
		case strings.HasPrefix(upper, "CAIRN_") && strings.HasSuffix(upper, "_TOKEN"):
			continue
		}
		out = append(out, kv)
	}
	return out
}

// Commit is the fixed identity and message of the site's first commit.
type Commit struct {
	AuthorName  string
	AuthorEmail string
	Message     string
}

// git runs git in dir with the scrubbed environment plus extra, capturing both output streams.
// Nothing it prints reaches the terminal; a failure carries its stderr.
func git(ctx context.Context, dir string, extra []string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	cmd.Env = append(childEnv(os.Environ()), extra...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("scaffold: git %s: %w: %s", args[0], err, strings.TrimSpace(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
}

// initRepository makes dir a git repository on branch, adds origin, commits everything with
// the fixed identity, and returns the commit's SHA. User and system git config are ignored, so
// a signing or hooks setting on the owner's machine cannot stop or alter the commit.
func initRepository(ctx context.Context, dir, branch, originURL string, c Commit) (string, error) {
	isolate := []string{"GIT_CONFIG_GLOBAL=" + os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0"}
	identity := append(isolate,
		"GIT_AUTHOR_NAME="+c.AuthorName, "GIT_AUTHOR_EMAIL="+c.AuthorEmail,
		"GIT_COMMITTER_NAME="+c.AuthorName, "GIT_COMMITTER_EMAIL="+c.AuthorEmail,
	)
	steps := []struct {
		env  []string
		args []string
	}{
		{isolate, []string{"init", "--quiet", "-b", branch}},
		{isolate, []string{"remote", "add", "origin", originURL}},
		{isolate, []string{"add", "--all"}},
		{identity, []string{"commit", "--quiet", "--no-verify", "--no-gpg-sign", "-m", c.Message}},
	}
	for _, st := range steps {
		if _, err := git(ctx, dir, st.env, st.args...); err != nil {
			return "", err
		}
	}
	return git(ctx, dir, isolate, "rev-parse", "HEAD")
}
