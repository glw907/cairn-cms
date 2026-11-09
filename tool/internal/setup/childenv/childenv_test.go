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
		"CLOUDFLARE_API_KEY": "h", "cf_api_key": "i", "CLOUDFLARE_EMAIL": "j",
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
	}
	want := []string{"DISPLAY=:0", "KEY_REPEAT=fast", "PATH=/usr/bin", "SECRETS_DIR=/s", "TOKEN_COUNT=3", "XKB_KEYMAP=us"}
	if got := ScrubSecrets(in); !slices.Equal(got, want) {
		t.Errorf("ScrubSecrets = %q, want %q", got, want)
	}
}

func TestGitAddsItsPairsAfterTheInheritedOnes(t *testing.T) {
	in := map[string]string{
		"PATH": "/usr/bin", "GH_TOKEN": "b",
		"GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "url./r/.insteadOf", "GIT_CONFIG_VALUE_0": "https://github.com/",
	}
	want := []string{
		"GIT_CONFIG_KEY_0=url./r/.insteadOf", "GIT_CONFIG_VALUE_0=https://github.com/", "PATH=/usr/bin",
		"GIT_CONFIG_GLOBAL=" + os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0", "GIT_TRACE_REDACT=1",
		"GIT_CONFIG_KEY_1=core.hooksPath", "GIT_CONFIG_VALUE_1=/tmp/empty",
		"GIT_CONFIG_KEY_2=core.fsmonitor", "GIT_CONFIG_VALUE_2=false",
		"GIT_CONFIG_KEY_3=http.extraheader", "GIT_CONFIG_VALUE_3=x",
		"GIT_CONFIG_COUNT=4",
	}
	if got := Git(in, "/tmp/empty", "http.extraheader", "x"); !slices.Equal(got, want) {
		t.Errorf("Git =\n%q\nwant\n%q", got, want)
	}
	for _, bad := range []string{"", "-1", "x"} {
		got := Git(map[string]string{"GIT_CONFIG_COUNT": bad}, "/tmp/empty")
		if !slices.Contains(got, "GIT_CONFIG_KEY_0=core.hooksPath") || got[len(got)-1] != "GIT_CONFIG_COUNT=2" {
			t.Errorf("Git with GIT_CONFIG_COUNT %q = %q, want the hooks pair first and a count of 2", bad, got)
		}
	}
}

// TestGitDropsWhatRedirectsOrTracesGit pins that no inherited variable can point git at another
// repository, config, helper, or program, or have it trace a request, while the harness's
// GIT_CONFIG_KEY and GIT_CONFIG_VALUE pairs still reach it.
func TestGitDropsWhatRedirectsOrTracesGit(t *testing.T) {
	dropped := []string{
		"GIT_CONFIG_PARAMETERS", "GIT_CONFIG", "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE",
		"GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_EXEC_PATH", "GIT_SSH_COMMAND",
		"GIT_ASKPASS", "GIT_TRACE", "GIT_TRACE_PACKET", "GIT_TRACE_CURL", "GIT_TRACE2_EVENT",
		"git_trace_setup", "GIT_CURL_VERBOSE", "GIT_TRACE_REDACT",
	}
	in := map[string]string{
		"PATH": "/usr/bin", "GIT_CONFIG_COUNT": "1",
		"GIT_CONFIG_KEY_0": "url./r/.insteadOf", "GIT_CONFIG_VALUE_0": "https://github.com/",
	}
	for _, name := range dropped {
		in[name] = "0"
	}
	got := Git(in, "/tmp/empty")
	for _, kv := range got {
		name, _, _ := strings.Cut(kv, "=")
		if slices.ContainsFunc(dropped, func(d string) bool { return strings.EqualFold(d, name) }) && kv != "GIT_TRACE_REDACT=1" {
			t.Errorf("Git kept %q", kv)
		}
	}
	for _, want := range []string{"GIT_TRACE_REDACT=1", "GIT_CONFIG_KEY_0=url./r/.insteadOf", "GIT_CONFIG_VALUE_0=https://github.com/", "PATH=/usr/bin"} {
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
