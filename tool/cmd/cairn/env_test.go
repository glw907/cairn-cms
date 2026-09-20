package main

import (
	"errors"
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

// fakeFailingProvider always returns an error from Get, standing in for a
// backend that is present but broken, as opposed to a fakeProvider's plain
// miss.
type fakeFailingProvider struct {
	name string
	err  error
}

func (f fakeFailingProvider) Name() string { return f.name }

func (f fakeFailingProvider) Get(string) (string, bool, error) {
	return "", false, f.err
}

func fakeEnv(values map[string]string) func(string) string {
	return func(name string) string { return values[name] }
}

// displayFor returns the display text loadEnv recorded for name, without
// sourceLines' "not set" substitution, so a test can tell a plain miss
// apart from a provider error.
func displayFor(e env, name string) string {
	for _, r := range e.resolutions {
		if r.name == name {
			return r.display
		}
	}
	return ""
}

func TestLoadEnvEnvironmentWinsOverProvider(t *testing.T) {
	envFn := fakeEnv(map[string]string{
		"CAIRN_CF_ACCOUNT_ID": "env-account",
		"CAIRN_CF_READ_TOKEN": "env-cf-token",
		"CAIRN_GH_READ_TOKEN": "env-gh-token",
	})
	keyring := fakeProvider{name: "keyring", values: map[string]string{
		"CAIRN_CF_ACCOUNT_ID": "keyring-account",
		"CAIRN_CF_READ_TOKEN": "keyring-cf-token",
		"CAIRN_GH_READ_TOKEN": "keyring-gh-token",
	}}

	got, missing := loadEnv(envFn, keyring)

	if got.accountID() != "env-account" || displayFor(got, "CAIRN_CF_ACCOUNT_ID") != "environment" {
		t.Errorf("accountID, from = (%q, %q), want (\"env-account\", \"environment\")", got.accountID(), displayFor(got, "CAIRN_CF_ACCOUNT_ID"))
	}
	if displayFor(got, "CAIRN_CF_READ_TOKEN") != "environment" || displayFor(got, "CAIRN_GH_READ_TOKEN") != "environment" {
		t.Errorf("CAIRN_CF_READ_TOKEN, CAIRN_GH_READ_TOKEN from = %q, %q, want both \"environment\"", displayFor(got, "CAIRN_CF_READ_TOKEN"), displayFor(got, "CAIRN_GH_READ_TOKEN"))
	}
	if len(missing) != 0 {
		t.Errorf("missing = %v, want none", missing)
	}
}

func TestLoadEnvProviderAnswersWhenEnvironmentAbsent(t *testing.T) {
	envFn := fakeEnv(nil)
	keyring := fakeProvider{name: "keyring", values: map[string]string{
		"CAIRN_GH_READ_TOKEN": "keyring-gh-token",
	}}

	got, missing := loadEnv(envFn, keyring)

	if from := displayFor(got, "CAIRN_GH_READ_TOKEN"); from != "keyring" {
		t.Errorf("CAIRN_GH_READ_TOKEN from = %q, want %q", from, "keyring")
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

	for _, name := range authVariables {
		if from := displayFor(got, name); from != "" {
			t.Errorf("%s from = %q, want empty", name, from)
		}
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

// TestLoadEnvBlankExportedVariableIsMissing proves loadEnv and secrets.Env agree: an
// exported-but-blank variable resolves as not set, exactly like one never exported, so auth
// list never reports the environment as the source of a credential nobody actually set.
func TestLoadEnvBlankExportedVariableIsMissing(t *testing.T) {
	envFn := fakeEnv(map[string]string{"CAIRN_CF_READ_TOKEN": ""})

	got, missing := loadEnv(envFn)

	if from := displayFor(got, "CAIRN_CF_READ_TOKEN"); from != "" {
		t.Errorf("CAIRN_CF_READ_TOKEN from = %q, want empty", from)
	}
	found := false
	for _, m := range missing {
		if m.Var == "CAIRN_CF_READ_TOKEN" {
			found = true
		}
	}
	if !found {
		t.Error("missing does not list CAIRN_CF_READ_TOKEN, which was exported blank")
	}

	cmd := newAuthListCmd(envFn)
	var out strings.Builder
	cmd.SetOut(&out)
	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE() = %v, want nil", err)
	}
	if strings.Contains(out.String(), "CAIRN_CF_READ_TOKEN\tenvironment") {
		t.Errorf("auth list output %q says the environment answered a blank variable", out.String())
	}
}

// TestLoadEnvRecordsProviderError proves a failing provider's own error is never discarded: the
// variable it was trying to answer is reported missing, and its display line names the failing
// provider without repeating the error text.
func TestLoadEnvRecordsProviderError(t *testing.T) {
	broken := fakeFailingProvider{name: "keyring", err: errors.New("dbus: could not connect, secret leaked mid-message")}

	got, missing := loadEnv(fakeEnv(nil), broken)

	want := "keyring: error"
	if from := displayFor(got, "CAIRN_GH_READ_TOKEN"); from != want {
		t.Errorf("CAIRN_GH_READ_TOKEN from = %q, want %q", from, want)
	}
	if strings.Contains(displayFor(got, "CAIRN_GH_READ_TOKEN"), "leaked") {
		t.Error("display line leaked the provider's own error text")
	}
	found := false
	for _, m := range missing {
		if m.Var == "CAIRN_GH_READ_TOKEN" {
			found = true
		}
	}
	if !found {
		t.Error("missing does not list CAIRN_GH_READ_TOKEN, which the provider failed to answer")
	}
}

// TestOSGetenvOnlyInEnvGo asserts no other file under cmd/cairn calls
// os.Getenv directly. loadEnv's envFn parameter is the one chokepoint every
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
			t.Errorf("%s calls os.Getenv directly; read through loadEnv's envFn parameter instead", name)
		}
	}
}

var _ secrets.Provider = fakeProvider{}
var _ secrets.Provider = fakeFailingProvider{}
