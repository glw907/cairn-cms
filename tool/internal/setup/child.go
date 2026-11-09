package setup

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/childenv"
)

// runChild runs name in dir with env and returns what it wrote. Both streams are captured, so
// nothing a child prints reaches the terminal; a failure carries the end of its stderr.
func runChild(ctx context.Context, dir string, env []string, name string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	cmd.Env = env
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%s %s: %w: %s", name, args[0], err, tail(stderr.String()))
	}
	return strings.TrimSpace(stdout.String()), nil
}

// tail keeps the last few hundred bytes of s, enough to name a failure.
func tail(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 400 {
		s = s[len(s)-400:]
	}
	return s
}

// gitEnv is the child environment for git: the scrubbed parent environment with the owner's git
// config and prompts kept out and the run's empty hooks folder as core.hooksPath, so no hook in
// the site folder runs while the keyring holds the run's credentials. Config.GitConfigPairs
// follow setup's own pairs.
func (r *run) gitEnv() []string {
	return childenv.Git(r.cfg.Env, r.hooks, r.cfg.GitConfigPairs...)
}

// pushEnv is gitEnv with the installation token as an http.extraheader for github.com, so it
// never reaches argv or .git/config. The caller registers header and its base64 credential,
// encoded, with the output scrub before git runs.
func (r *run) pushEnv(token providers.Credential) (env []string, header, encoded string) {
	header, encoded = gitAuthHeader(token)
	pairs := append([]childenv.Pair{{Key: "http.https://github.com/.extraheader", Value: header}}, r.cfg.GitConfigPairs...)
	return childenv.Git(r.cfg.Env, r.hooks, pairs...), header, encoded
}
