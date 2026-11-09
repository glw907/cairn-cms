package setup

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"slices"
	"strconv"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// scrubbedEnv returns env as a child's environment, without any variable that holds a
// credential: CLOUDFLARE_API_TOKEN, GH_TOKEN, GITHUB_TOKEN, and every CAIRN_*_TOKEN. It is
// sorted, so a child's environment does not depend on map order.
func scrubbedEnv(env map[string]string) []string {
	out := make([]string, 0, len(env))
	for name, value := range env {
		upper := strings.ToUpper(name)
		switch {
		case upper == "CLOUDFLARE_API_TOKEN", upper == "GH_TOKEN", upper == "GITHUB_TOKEN":
			continue
		case strings.HasPrefix(upper, "CAIRN_") && strings.HasSuffix(upper, "_TOKEN"):
			continue
		}
		out = append(out, name+"="+value)
	}
	slices.Sort(out)
	return out
}

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

// gitEnv is the child environment for git: the scrubbed parent environment, with the owner's
// user and system git config and every prompt kept out. GIT_CONFIG_COUNT and its pairs pass
// through, so a test harness can point github.com at a local repository.
func gitEnv(env map[string]string) []string {
	return append(scrubbedEnv(env), "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0")
}

// pushEnv adds the installation token to a git environment as an http.extraheader for
// github.com, through git-config(1)'s GIT_CONFIG_COUNT pairs, so it never reaches argv or
// .git/config. The pair goes after any inherited pairs, which keeps those pairs working. The
// caller registers header with the output scrub before git runs.
func pushEnv(env map[string]string, token providers.Credential) (out []string, header string) {
	n, err := strconv.Atoi(env["GIT_CONFIG_COUNT"])
	if err != nil || n < 0 {
		n = 0
	}
	header = gitAuthHeader(token)
	out = slices.DeleteFunc(gitEnv(env), func(kv string) bool { return strings.HasPrefix(kv, "GIT_CONFIG_COUNT=") })
	key := strconv.Itoa(n)
	out = append(out,
		"GIT_CONFIG_COUNT="+strconv.Itoa(n+1),
		"GIT_CONFIG_KEY_"+key+"=http.https://github.com/.extraheader",
		"GIT_CONFIG_VALUE_"+key+"="+header,
	)
	return out, header
}
