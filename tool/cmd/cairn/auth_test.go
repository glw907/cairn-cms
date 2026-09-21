package main

import (
	"bytes"
	"errors"
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

// fakeWriter records the last Set call, standing in for a keyring so a
// test can assert what auth set writes without touching one.
type fakeWriter struct {
	calls       int
	name, value string
	err         error
}

func (f *fakeWriter) Set(name, value string) error {
	f.calls++
	f.name, f.value = name, value
	return f.err
}

func fakeReadPassword(value string, err error) func(*cobra.Command, string) (string, error) {
	return func(*cobra.Command, string) (string, error) { return value, err }
}

func TestAuthSetDeclaresNoValueFlagOrPositionalValueArg(t *testing.T) {
	cmd := newAuthSetCmd(fakeReadPassword("unused", nil), &fakeWriter{})

	if cmd.Flags().HasFlags() {
		t.Errorf("auth set declares a flag; it must read the value from a prompt only")
	}
	if err := cmd.Args(cmd, []string{"CAIRN_CF_ACCOUNT_ID", "extra"}); err == nil {
		t.Error("auth set accepted a second positional argument; it must accept only <name>")
	}
	if err := cmd.Args(cmd, nil); err == nil {
		t.Error("auth set accepted zero arguments; it must require <name>")
	}
}

func TestAuthSetRefusesNameOutsideTheThree(t *testing.T) {
	w := &fakeWriter{}
	cmd := newAuthSetCmd(fakeReadPassword("secret", nil), w)

	if err := cmd.RunE(cmd, []string{"NOT_A_REAL_VARIABLE"}); err == nil {
		t.Fatal("want an error for a name outside the three variables")
	}
	if w.calls != 0 {
		t.Errorf("writer called %d times, want 0 for a refused name", w.calls)
	}
}

func TestAuthSetWritesThePromptedValue(t *testing.T) {
	w := &fakeWriter{}
	cmd := newAuthSetCmd(fakeReadPassword("s3cr3t-value", nil), w)
	var out bytes.Buffer
	cmd.SetOut(&out)

	if err := cmd.RunE(cmd, []string{"CAIRN_GH_READ_TOKEN"}); err != nil {
		t.Fatalf("RunE() = %v, want nil", err)
	}
	if w.name != "CAIRN_GH_READ_TOKEN" || w.value != "s3cr3t-value" {
		t.Errorf("writer got (%q, %q), want (\"CAIRN_GH_READ_TOKEN\", \"s3cr3t-value\")", w.name, w.value)
	}
	if strings.Contains(out.String(), "s3cr3t-value") {
		t.Error("auth set printed the value; it must never appear in output")
	}
}

func TestAuthSetPropagatesPromptError(t *testing.T) {
	w := &fakeWriter{}
	cmd := newAuthSetCmd(fakeReadPassword("", errors.New("no terminal")), w)

	if err := cmd.RunE(cmd, []string{"CAIRN_CF_READ_TOKEN"}); err == nil {
		t.Fatal("want an error when the prompt fails")
	}
	if w.calls != 0 {
		t.Errorf("writer called %d times, want 0 when the prompt fails", w.calls)
	}
}

func TestAuthListPrintsProviderAndNoValue(t *testing.T) {
	env := fakeEnv(map[string]string{"CAIRN_CF_ACCOUNT_ID": "acct-123"})
	keyring := fakeProvider{name: "keyring", values: map[string]string{"CAIRN_GH_READ_TOKEN": "ghp_secret"}}
	cmd := newAuthListCmd(env, keyring)
	var out bytes.Buffer
	cmd.SetOut(&out)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE() = %v, want nil", err)
	}
	got := out.String()

	for _, want := range []string{"CAIRN_CF_ACCOUNT_ID", "environment", "CAIRN_GH_READ_TOKEN", "keyring", "CAIRN_CF_READ_TOKEN", "not set"} {
		if !strings.Contains(got, want) {
			t.Errorf("output %q missing %q", got, want)
		}
	}
	for _, value := range []string{"acct-123", "ghp_secret"} {
		if strings.Contains(got, value) {
			t.Errorf("output %q leaks a resolved value %q", got, value)
		}
	}
}
