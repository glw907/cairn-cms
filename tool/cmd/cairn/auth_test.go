package main

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/secrets"
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

// fakeDeleter stands in for a keyring's delete half, so auth unset can be tested without
// touching one.
type fakeDeleter struct {
	calls int
	name  string
	err   error
}

func (f *fakeDeleter) Delete(name string) error {
	f.calls++
	f.name = name
	return f.err
}

// authSetDeps builds the dependency set auth set runs over, from a fake prompt and a fake
// keyring writer.
func authSetDeps(read func(*cobra.Command, string) (string, error), w *fakeWriter) deps {
	return deps{readPassword: read, keyringWriter: w}
}

func TestAuthSetDeclaresNoValueFlagOrPositionalValueArg(t *testing.T) {
	cmd := newAuthSetCmd(authSetDeps(fakeReadPassword("unused", nil), &fakeWriter{}))

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
	cmd := newAuthSetCmd(authSetDeps(fakeReadPassword("secret", nil), w))

	if err := cmd.RunE(cmd, []string{"NOT_A_REAL_VARIABLE"}); err == nil {
		t.Fatal("want an error for a name outside the three variables")
	}
	if w.calls != 0 {
		t.Errorf("writer called %d times, want 0 for a refused name", w.calls)
	}
}

func TestAuthSetWritesThePromptedValue(t *testing.T) {
	w := &fakeWriter{}
	cmd := newAuthSetCmd(authSetDeps(fakeReadPassword("s3cr3t-value", nil), w))
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
	cmd := newAuthSetCmd(authSetDeps(fakeReadPassword("", errors.New("no terminal")), w))

	if err := cmd.RunE(cmd, []string{"CAIRN_CF_READ_TOKEN"}); err == nil {
		t.Fatal("want an error when the prompt fails")
	}
	if w.calls != 0 {
		t.Errorf("writer called %d times, want 0 when the prompt fails", w.calls)
	}
}

func TestAuthListPrintsProviderAndNoValue(t *testing.T) {
	d := deps{
		env:     fakeEnv(map[string]string{"CAIRN_CF_ACCOUNT_ID": "acct-123"}),
		keyring: fakeProvider{name: "keyring", values: map[string]string{"CAIRN_GH_READ_TOKEN": "ghp_secret"}},
	}
	cmd := newAuthListCmd(d)
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

// TestAuthListNamesTheEnvironmentFallbackWhenTheKeyringIsUnavailable covers the row Get's own
// flattening hides: a variable neither the environment nor loadEnv's chain resolved, because the
// keyring itself could not be consulted, prints a line distinct from a plain "not set", so an
// operator with a locked keyring is not told their credential is simply gone.
func TestAuthListNamesTheEnvironmentFallbackWhenTheKeyringIsUnavailable(t *testing.T) {
	d := deps{
		env:           fakeEnv(nil),
		keyring:       fakeProvider{name: "keyring"},
		keyringStatus: func(string) (bool, error) { return false, secrets.ErrKeyringUnavailable },
	}
	cmd := newAuthListCmd(d)
	var out bytes.Buffer
	cmd.SetOut(&out)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE() = %v, want nil", err)
	}
	got := out.String()
	if strings.Contains(got, "not set") {
		t.Errorf("output %q says \"not set\"; want it to name the keyring as unreachable", got)
	}
	if !strings.Contains(got, "environment") {
		t.Errorf("output %q does not name the environment fallback", got)
	}
}

// TestAuthListLeavesAResolvedVariableAlone proves keyringAwareDisplay never overrides a variable
// something did resolve: the keyring-unavailable check only ever fires on an unresolved "not
// set" line, so credential-resolution behaviour through loadEnv stays exactly what it was.
func TestAuthListLeavesAResolvedVariableAlone(t *testing.T) {
	d := deps{
		env:           fakeEnv(map[string]string{"CAIRN_CF_ACCOUNT_ID": "acct-123"}),
		keyring:       fakeProvider{name: "keyring"},
		keyringStatus: func(string) (bool, error) { return false, secrets.ErrKeyringUnavailable },
	}
	cmd := newAuthListCmd(d)
	var out bytes.Buffer
	cmd.SetOut(&out)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("RunE() = %v, want nil", err)
	}
	if !strings.Contains(out.String(), "CAIRN_CF_ACCOUNT_ID\tenvironment") {
		t.Errorf("output %q does not still name the environment for a resolved variable", out.String())
	}
}

// TestAuthSetNamesTheEnvironmentFallbackWhenTheKeyringIsUnavailable covers the write side of the
// same distinction: a keyring the process cannot reach is a different outcome from any other
// write failure, and it says where the value can still go.
func TestAuthSetNamesTheEnvironmentFallbackWhenTheKeyringIsUnavailable(t *testing.T) {
	w := &fakeWriter{err: secrets.ErrKeyringUnavailable}
	cmd := newAuthSetCmd(authSetDeps(fakeReadPassword("secret", nil), w))

	err := cmd.RunE(cmd, []string{"CAIRN_CF_READ_TOKEN"})
	if err == nil {
		t.Fatal("want an error when the keyring cannot be reached")
	}
	if !strings.Contains(err.Error(), "CAIRN_CF_READ_TOKEN") || !strings.Contains(err.Error(), "environment") {
		t.Errorf("error %q does not name the variable and the environment fallback", err)
	}
}

// unsetDeps builds the dependency set auth unset runs over.
func unsetDeps(del *fakeDeleter) deps {
	return deps{keyringDeleter: del}
}

// TestAuthUnsetTable covers the four rows the ratified 2026-09-21 note asks for: a present entry,
// an absent one, an unavailable backend, and a name outside the known set.
func TestAuthUnsetTable(t *testing.T) {
	tests := []struct {
		name       string
		arg        string
		deleterErr error
		wantErr    bool
		want       []string
	}{
		{
			name: "a present entry is deleted",
			arg:  "CAIRN_CF_READ_TOKEN",
			want: []string{"CAIRN_CF_READ_TOKEN", "deleted"},
		},
		{
			name:       "an absent entry is success, not an error",
			arg:        "CAIRN_GH_READ_TOKEN",
			deleterErr: secrets.ErrNotFound,
			want:       []string{"CAIRN_GH_READ_TOKEN", "was not stored"},
		},
		{
			name:       "an unavailable backend names the environment fallback",
			arg:        "CAIRN_CF_ACCOUNT_ID",
			deleterErr: secrets.ErrKeyringUnavailable,
			wantErr:    true,
			want:       []string{"CAIRN_CF_ACCOUNT_ID", "environment"},
		},
		{
			name:    "a name outside the known set is refused",
			arg:     "NOT_A_REAL_VARIABLE",
			wantErr: true,
			want:    []string{"NOT_A_REAL_VARIABLE"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			del := &fakeDeleter{err: tt.deleterErr}
			cmd := newAuthUnsetCmd(unsetDeps(del))
			var out bytes.Buffer
			cmd.SetOut(&out)

			err := cmd.RunE(cmd, []string{tt.arg})
			if (err != nil) != tt.wantErr {
				t.Fatalf("RunE() error = %v, wantErr %v", err, tt.wantErr)
			}

			got := out.String()
			if err != nil {
				got = err.Error()
			}
			for _, want := range tt.want {
				if !strings.Contains(got, want) {
					t.Errorf("output %q missing %q", got, want)
				}
			}
		})
	}
}

// TestAuthUnsetRefusesAnUnknownNameWithoutCallingTheDeleter mirrors auth set's own refusal test:
// a name outside the three variables never reaches the keyring at all.
func TestAuthUnsetRefusesAnUnknownNameWithoutCallingTheDeleter(t *testing.T) {
	del := &fakeDeleter{}
	cmd := newAuthUnsetCmd(unsetDeps(del))

	if err := cmd.RunE(cmd, []string{"NOT_A_REAL_VARIABLE"}); err == nil {
		t.Fatal("want an error for a name outside the three variables")
	}
	if del.calls != 0 {
		t.Errorf("deleter called %d times, want 0 for a refused name", del.calls)
	}
}

// TestRestoreOnCancelRestoresWhenTheContextCancels covers the echo-off prompt's half of the
// signal path: term.ReadPassword restores the terminal on its own return, and a signal at the
// prompt never lets it return, so a cancelled run has to restore the state itself.
func TestRestoreOnCancelRestoresWhenTheContextCancels(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	restored := make(chan struct{})
	stop := restoreOnCancel(ctx, func() { close(restored) })
	defer stop()

	cancel()

	select {
	case <-restored:
	case <-time.After(2 * time.Second):
		t.Fatal("the terminal was never restored after the context cancelled mid-prompt")
	}
}

// TestRestoreOnCancelDoesNotRestoreOnANormalReturn asserts the watch stands down when the
// prompt returned on its own, so a later cancellation of the same context cannot reach into a
// terminal this command has finished with.
func TestRestoreOnCancelDoesNotRestoreOnANormalReturn(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	calls := make(chan struct{}, 1)
	stop := restoreOnCancel(ctx, func() { calls <- struct{}{} })
	stop()

	cancel()
	select {
	case <-calls:
		t.Error("restore ran after the prompt had already returned")
	case <-time.After(100 * time.Millisecond):
	}
}
