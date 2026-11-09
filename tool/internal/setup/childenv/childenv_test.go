package childenv

import (
	"os"
	"slices"
	"strings"
	"testing"
)

func TestScrubDropsEveryCredential(t *testing.T) {
	in := map[string]string{
		"PATH": "/usr/bin", "HOME": "/home/x",
		"CLOUDFLARE_API_TOKEN": "a", "GH_TOKEN": "b", "github_token": "c",
		"CAIRN_CLOUDFLARE_TOKEN": "d", "CAIRN_GITHUB_TOKEN": "e", "cairn_other_token": "f",
		"CLOUDFLARE_API_KEY": "h", "cf_api_key": "i", "CLOUDFLARE_EMAIL": "j", "CF_EMAIL": "k", "cf_api_token": "l",
		"CAIRN_STATE_DIR": "/tmp/state", "TOKEN_COUNT": "3", "GIT_CONFIG_COUNT": "1", "NPM_TOKEN": "g",
	}
	want := []string{"CAIRN_STATE_DIR=/tmp/state", "GIT_CONFIG_COUNT=1", "HOME=/home/x", "NPM_TOKEN=g", "PATH=/usr/bin", "TOKEN_COUNT=3"}
	if got := Scrub(in); !slices.Equal(got, want) {
		t.Errorf("Scrub = %q, want %q", got, want)
	}
}

func TestScrubSecretsDropsEveryTokenSecretAndPassword(t *testing.T) {
	in := map[string]string{
		"PATH": "/usr/bin", "DISPLAY": ":0",
		"CLOUDFLARE_API_TOKEN": "a", "GH_TOKEN": "b", "CAIRN_GITHUB_TOKEN": "c", "NPM_TOKEN": "d",
		"AWS_SECRET": "e", "client_secret": "f", "DB_PASSWORD": "g", "TOKEN_COUNT": "3", "SECRETS_DIR": "/s",
		"OPENAI_API_KEY": "h", "cloudflare_api_key": "i", "GH_PAT": "j", "gcp_credentials": "k",
		"AWS_SECRET_ACCESS_KEY": "l", "CLOUDFLARE_EMAIL": "m", "CF_API_KEY": "n",
		"XKB_KEYMAP": "us", "KEY_REPEAT": "fast",
		"MAPS_APIKEY": "o", "smtp_passwd": "p", "MAIL_PASS": "q", "REGISTRY_AUTH": "r", "CF_EMAIL": "s", "CF_API_TOKEN": "t",
		"DATABASE_URL": "postgres://app:hunter2@db.example.test:5432/site", "MIRROR": "https://deploy@git.example.test/r",
		"HOMEPAGE": "https://example.test/a@b", "SSH_AUTH_SOCK": "/run/agent", "PASSAGE": "x", "AUTHOR": "y",
	}
	want := []string{
		"AUTHOR=y", "DISPLAY=:0", "HOMEPAGE=https://example.test/a@b", "KEY_REPEAT=fast", "PASSAGE=x", "PATH=/usr/bin",
		"SECRETS_DIR=/s", "SSH_AUTH_SOCK=/run/agent", "TOKEN_COUNT=3", "XKB_KEYMAP=us",
	}
	if got := ScrubSecrets(in); !slices.Equal(got, want) {
		t.Errorf("ScrubSecrets = %q, want %q", got, want)
	}
}

// TestGitCarriesOnlyTheGivenPairs pins that the config pairs a git child reads are Git's own and
// the ones its caller passes, in that order, and never the pairs the environment carries.
func TestGitCarriesOnlyTheGivenPairs(t *testing.T) {
	in := map[string]string{
		"PATH": "/usr/bin", "GH_TOKEN": "b",
		"GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "url./decoy/.insteadOf", "GIT_CONFIG_VALUE_0": "https://github.com/",
	}
	want := []string{
		"PATH=/usr/bin",
		"GIT_CONFIG_GLOBAL=" + os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0", "GIT_TRACE_REDACT=1",
		"GIT_CONFIG_KEY_0=core.hooksPath", "GIT_CONFIG_VALUE_0=/tmp/empty",
		"GIT_CONFIG_KEY_1=core.fsmonitor", "GIT_CONFIG_VALUE_1=false",
		"GIT_CONFIG_KEY_2=http.extraheader", "GIT_CONFIG_VALUE_2=x",
		"GIT_CONFIG_KEY_3=url./r/.insteadOf", "GIT_CONFIG_VALUE_3=https://github.com/",
		"GIT_CONFIG_COUNT=4",
	}
	got := Git(in, "/tmp/empty", Pair{"http.extraheader", "x"}, Pair{"url./r/.insteadOf", "https://github.com/"})
	if !slices.Equal(got, want) {
		t.Errorf("Git =\n%q\nwant\n%q", got, want)
	}
}

// TestGitKeepsNoInheritedGitVariable pins that every variable git reads by a GIT_ name, in any
// case, and the SSH askpass helpers come only from Git itself: an inherited one could point git
// at another repository, config, template, program, helper, or certificate, or have it trace a
// request. The variables Git sets carry its own values, and the rest of env is kept.
func TestGitKeepsNoInheritedGitVariable(t *testing.T) {
	inherited := []string{
		"GIT_CONFIG_COUNT", "GIT_CONFIG_KEY_0", "GIT_CONFIG_VALUE_0", "GIT_CONFIG_PARAMETERS", "GIT_CONFIG",
		"GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "GIT_TERMINAL_PROMPT", "GIT_TRACE_REDACT",
		"GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_TEMPLATE_DIR", "git_template_dir",
		"GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_EXEC_PATH", "GIT_SSH_COMMAND", "GIT_SSH",
		"GIT_ASKPASS", "GIT_SSL_NO_VERIFY", "GIT_SSL_CAINFO", "GIT_ATTR_SOURCE", "GIT_NAMESPACE",
		"GIT_REPLACE_REF_BASE", "GIT_TRACE", "GIT_TRACE2_EVENT", "git_trace_setup", "GIT_CURL_VERBOSE",
		"GIT_AUTHOR_NAME", "SSH_ASKPASS", "ssh_askpass_require",
	}
	in := map[string]string{"PATH": "/usr/bin", "HOME": "/home/x", "HTTPS_PROXY": "http://proxy.example.test:3128"}
	for _, name := range inherited {
		in[name] = "inherited"
	}
	got := Git(in, "/tmp/empty")
	for _, kv := range got {
		if strings.HasSuffix(kv, "=inherited") {
			t.Errorf("Git kept the inherited %q", kv)
		}
	}
	for _, want := range []string{
		"HOME=/home/x", "HTTPS_PROXY=http://proxy.example.test:3128", "PATH=/usr/bin",
		"GIT_CONFIG_GLOBAL=" + os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0", "GIT_TRACE_REDACT=1",
		"GIT_CONFIG_KEY_0=core.hooksPath", "GIT_CONFIG_VALUE_0=/tmp/empty", "GIT_CONFIG_COUNT=2",
	} {
		if !slices.Contains(got, want) {
			t.Errorf("Git = %q, want %q in it", got, want)
		}
	}
}

func TestGitRefusesAnEmptyHooksPath(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Error("Git with no hooks folder returned an environment")
		}
	}()
	Git(map[string]string{"PATH": "/usr/bin"}, "")
}

func TestMapReadsEnvironLines(t *testing.T) {
	got := Map([]string{"A=1", "B=x=y", "A=2", "EMPTY="})
	if len(got) != 3 || got["A"] != "2" || got["B"] != "x=y" || got["EMPTY"] != "" {
		t.Errorf("Map = %v", got)
	}
}
