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
// credential setup or the owner's tools read: CLOUDFLARE_API_TOKEN, CLOUDFLARE_API_KEY,
// CF_API_KEY, CLOUDFLARE_EMAIL (which only pairs with the key), GH_TOKEN, GITHUB_TOKEN, and every
// CAIRN_*_TOKEN. Names compare without regard to case. It is the environment git and npm start
// from; a wider rule would drop a variable such as NPM_TOKEN that the owner's .npmrc names, and
// npm stops on a config variable it cannot resolve.
func Scrub(env map[string]string) []string {
	return keep(env, func(upper string) bool { return !credential(upper) })
}

// credential reports whether upper, a variable name in upper case, is one Scrub drops.
func credential(upper string) bool {
	switch upper {
	case "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CF_API_KEY", "CLOUDFLARE_EMAIL", "GH_TOKEN", "GITHUB_TOKEN":
		return true
	}
	return strings.HasPrefix(upper, "CAIRN_") && strings.HasSuffix(upper, "_TOKEN")
}

// ScrubSecrets drops every variable Scrub drops and every one whose name ends in _TOKEN,
// _SECRET, _PASSWORD, _KEY, _PAT, or _CREDENTIALS, which covers AWS_SECRET_ACCESS_KEY. It is the
// environment a browser launcher starts from, which needs none of them.
func ScrubSecrets(env map[string]string) []string {
	return keep(env, func(upper string) bool {
		if credential(upper) {
			return false
		}
		for _, suffix := range []string{"_TOKEN", "_SECRET", "_PASSWORD", "_KEY", "_PAT", "_CREDENTIALS"} {
			if strings.HasSuffix(upper, suffix) {
				return false
			}
		}
		return true
	})
}

// Git returns the environment for one git call: Scrub(env) without any variable that points git
// at another repository, config, program, or helper, or that has it trace what it sends; the
// owner's user and system git config kept out; prompts off; GIT_TRACE_REDACT on; core.fsmonitor
// off; and core.hooksPath set to hooks, which must be an empty folder only setup can write, so no
// hook a repository carries runs. pairs are further config keys and values, in turn. Every pair
// rides git-config(1)'s GIT_CONFIG_COUNT after the pairs env already carries, which keep working,
// so a test harness can still point github.com at a local repository.
//
// Git panics on an empty hooks: git would then run the hooks the repository carries, and every
// caller holds a folder it made.
func Git(env map[string]string, hooks string, pairs ...string) []string {
	if hooks == "" {
		panic("childenv: Git needs an empty hooks folder; an empty path would run the repository's own hooks")
	}
	n, err := strconv.Atoi(env["GIT_CONFIG_COUNT"])
	if err != nil || n < 0 {
		n = 0
	}
	out := slices.DeleteFunc(Scrub(env), func(kv string) bool {
		name, _, _ := strings.Cut(kv, "=")
		return gitRedirect(strings.ToUpper(name))
	})
	out = append(out, "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0", "GIT_TRACE_REDACT=1")
	pairs = append([]string{"core.hooksPath", hooks, "core.fsmonitor", "false"}, pairs...)
	for i := 0; i+1 < len(pairs); i += 2 {
		key := strconv.Itoa(n)
		out = append(out, "GIT_CONFIG_KEY_"+key+"="+pairs[i], "GIT_CONFIG_VALUE_"+key+"="+pairs[i+1])
		n++
	}
	return append(out, "GIT_CONFIG_COUNT="+strconv.Itoa(n))
}

// gitRedirect reports whether upper, a variable name in upper case, is one Git drops. Every
// GIT_TRACE variable goes, GIT_TRACE_REDACT included, which Git then sets itself.
func gitRedirect(upper string) bool {
	switch upper {
	case "GIT_CONFIG_COUNT", "GIT_CONFIG_PARAMETERS", "GIT_CONFIG", "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE",
		"GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_EXEC_PATH", "GIT_SSH_COMMAND", "GIT_ASKPASS",
		"GIT_CURL_VERBOSE":
		return true
	}
	return strings.HasPrefix(upper, "GIT_TRACE")
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
