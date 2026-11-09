// Package childenv builds the environment setup hands a process it starts, so no credential the
// owner's shell holds reaches git, npm, or a browser.
package childenv

import (
	"maps"
	"net/url"
	"os"
	"slices"
	"strconv"
	"strings"
)

// Scrub returns env as NAME=value lines, sorted by name, without any variable that holds a
// credential setup or the owner's tools read: CLOUDFLARE_API_TOKEN, CLOUDFLARE_API_KEY,
// CF_API_TOKEN, CF_API_KEY, CLOUDFLARE_EMAIL and CF_EMAIL (which only pair with the key),
// GH_TOKEN, GITHUB_TOKEN, and every CAIRN_*_TOKEN. Names compare without regard to case. It is
// the environment git and npm start from; a wider rule would drop a variable such as NPM_TOKEN
// that the owner's .npmrc names, and npm stops on a config variable it cannot resolve.
func Scrub(env map[string]string) []string {
	return keep(env, func(upper, _ string) bool { return !credential(upper) })
}

// credential reports whether upper, a variable name in upper case, is one Scrub drops.
func credential(upper string) bool {
	switch upper {
	case "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CF_API_TOKEN", "CF_API_KEY", "CLOUDFLARE_EMAIL", "CF_EMAIL",
		"GH_TOKEN", "GITHUB_TOKEN":
		return true
	}
	return strings.HasPrefix(upper, "CAIRN_") && strings.HasSuffix(upper, "_TOKEN")
}

// ScrubSecrets drops every variable Scrub drops, every one whose name ends in _TOKEN, _SECRET,
// _PASSWORD, _PASSWD, _PASS, _KEY, _APIKEY, _PAT, _AUTH, or _CREDENTIALS, which covers
// AWS_SECRET_ACCESS_KEY, and every one whose value is a URL that carries user information, such
// as a DATABASE_URL of the form scheme://user:password@host. It is the environment a browser
// launcher starts from, which needs none of them.
func ScrubSecrets(env map[string]string) []string {
	return keep(env, func(upper, value string) bool {
		if credential(upper) || credentialURL(value) {
			return false
		}
		for _, suffix := range []string{"_TOKEN", "_SECRET", "_PASSWORD", "_PASSWD", "_PASS", "_KEY", "_APIKEY", "_PAT", "_AUTH", "_CREDENTIALS"} {
			if strings.HasSuffix(upper, suffix) {
				return false
			}
		}
		return true
	})
}

// credentialURL reports whether value is a URL with user information. A user name alone counts,
// since a token often rides in that place.
func credentialURL(value string) bool {
	if !strings.Contains(value, "://") {
		return false
	}
	u, err := url.Parse(value)
	return err == nil && u.User != nil
}

// Pair is one git config key and its value.
type Pair struct {
	Key   string
	Value string
}

// Git returns the environment for one git call. It starts from Scrub(env) without any variable
// whose name begins GIT_, in any case, or SSH_ASKPASS and SSH_ASKPASS_REQUIRE, since git reads
// variables by those names that point it at another repository, config, template, program,
// helper, or certificate, or have it trace what it sends. Then it sets its own: the owner's user
// and system git config kept out, prompts off, GIT_TRACE_REDACT on, core.fsmonitor off, and
// core.hooksPath set to hooks, which must be an empty folder only setup can write, so no hook a
// repository carries runs. pairs follow those two through git-config(1)'s GIT_CONFIG_COUNT, and
// no pair env carries survives.
//
// Git panics on an empty hooks: git would then run the hooks the repository carries, and every
// caller holds a folder it made.
func Git(env map[string]string, hooks string, pairs ...Pair) []string {
	if hooks == "" {
		panic("childenv: Git needs an empty hooks folder; an empty path would run the repository's own hooks")
	}
	out := slices.DeleteFunc(Scrub(env), func(kv string) bool {
		name, _, _ := strings.Cut(kv, "=")
		return gitVariable(strings.ToUpper(name))
	})
	out = append(out, "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0", "GIT_TRACE_REDACT=1")
	pairs = append([]Pair{{"core.hooksPath", hooks}, {"core.fsmonitor", "false"}}, pairs...)
	for i, p := range pairs {
		n := strconv.Itoa(i)
		out = append(out, "GIT_CONFIG_KEY_"+n+"="+p.Key, "GIT_CONFIG_VALUE_"+n+"="+p.Value)
	}
	return append(out, "GIT_CONFIG_COUNT="+strconv.Itoa(len(pairs)))
}

// gitVariable reports whether upper, a variable name in upper case, is one Git drops.
func gitVariable(upper string) bool {
	return strings.HasPrefix(upper, "GIT_") || upper == "SSH_ASKPASS" || upper == "SSH_ASKPASS_REQUIRE"
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

func keep(env map[string]string, ok func(upper, value string) bool) []string {
	out := make([]string, 0, len(env))
	for _, name := range slices.Sorted(maps.Keys(env)) {
		if ok(strings.ToUpper(name), env[name]) {
			out = append(out, name+"="+env[name])
		}
	}
	return out
}
