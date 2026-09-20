package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/secrets"
)

// fakeProvider stands in for a keyring in loadEnv tests, so precedence is
// tested without touching a real keyring.
type fakeProvider struct {
	name   string
	values map[string]string
}

func (f fakeProvider) Name() string { return f.name }

func (f fakeProvider) Get(name string) (string, bool, error) {
	v, ok := f.values[name]
	return v, ok, nil
}

func fakeEnv(values map[string]string) func(string) string {
	return func(name string) string { return values[name] }
}

func TestLoadEnvEnvironmentWinsOverProvider(t *testing.T) {
	env := fakeEnv(map[string]string{
		"CAIRN_CF_ACCOUNT_ID": "env-account",
		"CAIRN_CF_READ_TOKEN": "env-cf-token",
		"CAIRN_GH_READ_TOKEN": "env-gh-token",
	})
	keyring := fakeProvider{name: "keyring", values: map[string]string{
		"CAIRN_CF_ACCOUNT_ID": "keyring-account",
		"CAIRN_CF_READ_TOKEN": "keyring-cf-token",
		"CAIRN_GH_READ_TOKEN": "keyring-gh-token",
	}}

	got, missing := loadEnv(env, keyring)

	if got.AccountID != "env-account" || got.AccountIDFrom != "environment" {
		t.Errorf("AccountID = (%q, %q), want (\"env-account\", \"environment\")", got.AccountID, got.AccountIDFrom)
	}
	if got.CFTokenFrom != "environment" || got.GHTokenFrom != "environment" {
		t.Errorf("CFTokenFrom, GHTokenFrom = %q, %q, want both \"environment\"", got.CFTokenFrom, got.GHTokenFrom)
	}
	if len(missing) != 0 {
		t.Errorf("missing = %v, want none", missing)
	}
}

func TestLoadEnvProviderAnswersWhenEnvironmentAbsent(t *testing.T) {
	env := fakeEnv(nil)
	keyring := fakeProvider{name: "keyring", values: map[string]string{
		"CAIRN_GH_READ_TOKEN": "keyring-gh-token",
	}}

	got, missing := loadEnv(env, keyring)

	if got.GHTokenFrom != "keyring" {
		t.Errorf("GHTokenFrom = %q, want %q", got.GHTokenFrom, "keyring")
	}
	if len(missing) != 2 {
		t.Fatalf("missing = %v, want exactly CAIRN_CF_ACCOUNT_ID and CAIRN_CF_READ_TOKEN", missing)
	}
	for _, m := range missing {
		if m.Var == "CAIRN_GH_READ_TOKEN" {
			t.Errorf("missing lists CAIRN_GH_READ_TOKEN, which the keyring resolved")
		}
	}
}

func TestLoadEnvAllAbsentIsAllMissing(t *testing.T) {
	got, missing := loadEnv(fakeEnv(nil))

	if got.AccountIDFrom != "" || got.CFTokenFrom != "" || got.GHTokenFrom != "" {
		t.Errorf("got = %+v, want every From field empty", got)
	}
	if len(missing) != 3 {
		t.Fatalf("missing = %v, want all three variables", missing)
	}
	for i, name := range authVariables {
		if missing[i].Var != name {
			t.Errorf("missing[%d].Var = %q, want %q", i, missing[i].Var, name)
		}
	}
}

// TestOSGetenvOnlyInEnvGo asserts no other file under cmd/cairn calls
// os.Getenv directly. loadEnv's env parameter is the one chokepoint every
// command reads the environment through.
func TestOSGetenvOnlyInEnvGo(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		if name == "env.go" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(".", name))
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(data), "os.Getenv(") {
			t.Errorf("%s calls os.Getenv directly; read through loadEnv's env parameter instead", name)
		}
	}
}

var _ secrets.Provider = fakeProvider{}
