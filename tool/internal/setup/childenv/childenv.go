// Package childenv builds the environment setup hands a process it starts, so no credential the
// owner's shell holds reaches git, npm, or a browser.
package childenv

import (
	"maps"
	"os"
	"regexp"
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

// ScrubSecrets returns the environment a browser launcher starts from, which needs no
// credential. It drops every variable Scrub drops and every one whose value carries user
// information after a scheme, such as a DATABASE_URL of the form scheme://user:password@host.
// It also drops every name that ends in _TOKEN, _SECRET, _PASSWORD, _PASSWD, _PASS, _PWD,
// _PASSPHRASE, _KEY, _APIKEY, _PAT, _AUTH, _CREDENTIALS, _DSN, _COOKIE, or _SESSION, which covers
// AWS_SECRET_ACCESS_KEY. A suffix needs a name part before it: PWD, the working directory, is
// kept. DESKTOP_SESSION and KDE_FULL_SESSION are kept too; xdg-open reads them to find the
// desktop.
func ScrubSecrets(env map[string]string) []string {
	return keep(env, func(upper, value string) bool {
		if credential(upper) || credentialURL.MatchString(value) {
			return false
		}
		if upper == "DESKTOP_SESSION" || upper == "KDE_FULL_SESSION" {
			return true
		}
		for _, suffix := range []string{"_TOKEN", "_SECRET", "_PASSWORD", "_PASSWD", "_PASS", "_PWD", "_PASSPHRASE", "_KEY", "_APIKEY",
			"_PAT", "_AUTH", "_CREDENTIALS", "_DSN", "_COOKIE", "_SESSION"} {
			if strings.HasSuffix(upper, suffix) {
				return false
			}
		}
		return true
	})
}

// credentialURL matches a value with user information after a scheme: an @ between :// and the
// next slash or space. It matches anywhere in the value, with no URL parse, so a password that
// does not parse, such as one holding # or a bad % escape, still counts, and a user name alone
// counts too, since a token often rides in that place. A DSN with no scheme, such as MySQL's
// user:password@tcp(host)/db, does not match; the _DSN suffix drops it by name.
var credentialURL = regexp.MustCompile(`://[^/\s]*@`)

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
// repository carries runs.
//
// It also sets http.sslVerify on, core.sshCommand empty, http.proxy to HTTPSProxy(env), and
// credential.helper and core.askPass empty. Each beats the same plain key in a repository's
// .git/config. An empty http.proxy turns off env's proxy too, so the value carries env's. An
// empty credential.helper clears every helper the repository names, plain or URL-scoped. With
// core.askPass empty as well, a 401 runs nothing the repository chose. These pairs do not beat
// remote.<name>.proxy, which git reads over http.proxy; the caller sets that one. Nor do they
// beat a plain http.sslCAInfo or http.sslCAPath, a URL-scoped http.<url>.* key,
// url.<base>.insteadOf, remote.<name>.pushurl, or http.curloptResolve.
//
// pairs follow setup's own through git-config(1)'s GIT_CONFIG_COUNT, so a caller's pair outranks
// setup's, and no pair env carries survives.
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
	own := []Pair{
		{"core.hooksPath", hooks}, {"core.fsmonitor", "false"},
		{"http.sslVerify", "true"}, {"http.proxy", HTTPSProxy(env)}, {"core.sshCommand", ""},
		{"credential.helper", ""}, {"core.askPass", ""},
	}
	pairs = append(own, pairs...)
	for i, p := range pairs {
		n := strconv.Itoa(i)
		out = append(out, "GIT_CONFIG_KEY_"+n+"="+p.Key, "GIT_CONFIG_VALUE_"+n+"="+p.Value)
	}
	return append(out, "GIT_CONFIG_COUNT="+strconv.Itoa(len(pairs)))
}

// HTTPSProxy returns the proxy git reads from env for an https remote: https_proxy, then
// HTTPS_PROXY, and only when neither is set, all_proxy, then ALL_PROXY. It returns "" when env
// names none, which, as a git proxy setting, turns proxying off.
func HTTPSProxy(env map[string]string) string {
	for _, name := range []string{"https_proxy", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"} {
		if v, ok := env[name]; ok {
			return v
		}
	}
	return ""
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
