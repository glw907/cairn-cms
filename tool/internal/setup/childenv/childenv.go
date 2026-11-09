// Package childenv builds the environment setup hands a process it starts, so no credential the
// owner's shell holds reaches git, npm, or a browser.
package childenv

import (
	"maps"
	"os"
	"slices"
	"strconv"
	"strings"
)

// Scrub returns env as NAME=value lines, sorted by name, without any variable that holds a
// credential setup or the owner's tools read: CLOUDFLARE_API_TOKEN, GH_TOKEN, GITHUB_TOKEN, and
// every CAIRN_*_TOKEN. Names compare without regard to case. It is the environment git and npm
// start from; a wider rule would drop a variable such as NPM_TOKEN that the owner's .npmrc
// names, and npm stops on a config variable it cannot resolve.
func Scrub(env map[string]string) []string {
	return keep(env, func(upper string) bool {
		switch {
		case upper == "CLOUDFLARE_API_TOKEN", upper == "GH_TOKEN", upper == "GITHUB_TOKEN":
			return false
		case strings.HasPrefix(upper, "CAIRN_") && strings.HasSuffix(upper, "_TOKEN"):
			return false
		}
		return true
	})
}

// ScrubSecrets drops every variable whose name ends in _TOKEN, _SECRET, or _PASSWORD, which
// covers each name Scrub drops. It is the environment a browser launcher starts from, which
// needs none of them.
func ScrubSecrets(env map[string]string) []string {
	return keep(env, func(upper string) bool {
		return !strings.HasSuffix(upper, "_TOKEN") && !strings.HasSuffix(upper, "_SECRET") && !strings.HasSuffix(upper, "_PASSWORD")
	})
}

// Git returns the environment for one git call: Scrub(env), the owner's user and system git
// config kept out, prompts off, and core.hooksPath set to hooks, which must be an empty folder
// only setup can write, so no hook a repository carries runs. pairs are further config keys and
// values, in turn. Every pair rides git-config(1)'s GIT_CONFIG_COUNT after the pairs env already
// carries, which keep working, so a test harness can still point github.com at a local
// repository.
func Git(env map[string]string, hooks string, pairs ...string) []string {
	n, err := strconv.Atoi(env["GIT_CONFIG_COUNT"])
	if err != nil || n < 0 {
		n = 0
	}
	out := slices.DeleteFunc(Scrub(env), func(kv string) bool { return strings.HasPrefix(kv, "GIT_CONFIG_COUNT=") })
	out = append(out, "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0")
	pairs = append([]string{"core.hooksPath", hooks}, pairs...)
	for i := 0; i+1 < len(pairs); i += 2 {
		key := strconv.Itoa(n)
		out = append(out, "GIT_CONFIG_KEY_"+key+"="+pairs[i], "GIT_CONFIG_VALUE_"+key+"="+pairs[i+1])
		n++
	}
	return append(out, "GIT_CONFIG_COUNT="+strconv.Itoa(n))
}

// Map reads environ, in the NAME=value form os.Environ returns, into a map. A later entry of a
// name wins, as it does for a child process.
func Map(environ []string) map[string]string {
	out := make(map[string]string, len(environ))
	for _, kv := range environ {
		name, value, _ := strings.Cut(kv, "=")
		out[name] = value
	}
	return out
}

func keep(env map[string]string, ok func(upper string) bool) []string {
	out := make([]string, 0, len(env))
	for _, name := range slices.Sorted(maps.Keys(env)) {
		if ok(strings.ToUpper(name)) {
			out = append(out, name+"="+env[name])
		}
	}
	return out
}
