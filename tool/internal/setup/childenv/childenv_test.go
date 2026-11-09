package childenv

import (
	"os"
	"slices"
	"testing"
)

func TestScrubDropsEveryCredential(t *testing.T) {
	in := map[string]string{
		"PATH": "/usr/bin", "HOME": "/home/x",
		"CLOUDFLARE_API_TOKEN": "a", "GH_TOKEN": "b", "github_token": "c",
		"CAIRN_CLOUDFLARE_TOKEN": "d", "CAIRN_GITHUB_TOKEN": "e", "cairn_other_token": "f",
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
	}
	want := []string{"DISPLAY=:0", "PATH=/usr/bin", "SECRETS_DIR=/s", "TOKEN_COUNT=3"}
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
		"GIT_CONFIG_GLOBAL=" + os.DevNull, "GIT_CONFIG_NOSYSTEM=1", "GIT_TERMINAL_PROMPT=0",
		"GIT_CONFIG_KEY_1=core.hooksPath", "GIT_CONFIG_VALUE_1=/tmp/empty",
		"GIT_CONFIG_KEY_2=http.extraheader", "GIT_CONFIG_VALUE_2=x",
		"GIT_CONFIG_COUNT=3",
	}
	if got := Git(in, "/tmp/empty", "http.extraheader", "x"); !slices.Equal(got, want) {
		t.Errorf("Git =\n%q\nwant\n%q", got, want)
	}
	for _, bad := range []string{"", "-1", "x"} {
		got := Git(map[string]string{"GIT_CONFIG_COUNT": bad}, "/tmp/empty")
		if !slices.Contains(got, "GIT_CONFIG_KEY_0=core.hooksPath") || got[len(got)-1] != "GIT_CONFIG_COUNT=1" {
			t.Errorf("Git with GIT_CONFIG_COUNT %q = %q, want the hooks pair first and a count of 1", bad, got)
		}
	}
}

func TestMapReadsEnvironLines(t *testing.T) {
	got := Map([]string{"A=1", "B=x=y", "A=2", "EMPTY="})
	if len(got) != 3 || got["A"] != "2" || got["B"] != "x=y" || got["EMPTY"] != "" {
		t.Errorf("Map = %v", got)
	}
}
