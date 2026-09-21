package main

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/logx"
	"github.com/glw907/cairn-cms/tool/internal/secrets"
	"github.com/spf13/cobra"
)

// erroringReader always fails, standing in for a stdin whose read itself breaks rather than
// simply carrying no data.
type erroringReader struct{ err error }

func (r erroringReader) Read([]byte) (int, error) { return 0, r.err }

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
// operator with a locked keyring is not told their credential is simply gone. The cell itself
// ends at "the OS keyring did not open" (criterion 6): it is a list cell, not a second
// instruction line the row's own layout has no room for.
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
	if !strings.Contains(got, keyringUnavailableDisplay) {
		t.Errorf("output %q does not carry messages.go's keyringUnavailableDisplay", got)
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

// TestPromptPasswordFallsBackToStdinWhenTheTerminalReadFails covers the ratified 2026-09-21
// path: under `go test`, stdin is not a terminal, so term.ReadPassword fails and the fallback
// below reads the injected stream instead of hanging or erroring.
func TestPromptPasswordFallsBackToStdinWhenTheTerminalReadFails(t *testing.T) {
	tests := []struct {
		name  string
		piped string
		want  string
	}{
		{name: "a bare LF is stripped", piped: "s3cr3t\n", want: "s3cr3t"},
		{name: "a trailing CRLF is stripped", piped: "s3cr3t\r\n", want: "s3cr3t"},
		{name: "no trailing newline at all still reads the value", piped: "s3cr3t", want: "s3cr3t"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := &cobra.Command{}
			cmd.SetErr(&bytes.Buffer{})

			got, err := promptPassword(cmd, "CAIRN_GH_READ_TOKEN", strings.NewReader(tt.piped))
			if err != nil {
				t.Fatalf("promptPassword() = %v, want nil", err)
			}
			if got != tt.want {
				t.Errorf("promptPassword() = %q, want %q", got, tt.want)
			}
		})
	}
}

// TestPromptPasswordRefusesAnEmptyPipedValue covers the last sentence of criterion 6: an empty
// value is an error, and it never appears in the error text.
func TestPromptPasswordRefusesAnEmptyPipedValue(t *testing.T) {
	cmd := &cobra.Command{}
	cmd.SetErr(&bytes.Buffer{})

	_, err := promptPassword(cmd, "CAIRN_GH_READ_TOKEN", strings.NewReader("\n"))
	if err == nil {
		t.Fatal("promptPassword() = nil, want an error for an empty piped value")
	}
	if !strings.Contains(err.Error(), "CAIRN_GH_READ_TOKEN") {
		t.Errorf("error %q does not name the variable", err)
	}
}

// TestPromptPasswordPropagatesAStdinReadError covers a stdin that fails outright, distinct from
// one that simply carries no data.
func TestPromptPasswordPropagatesAStdinReadError(t *testing.T) {
	cmd := &cobra.Command{}
	cmd.SetErr(&bytes.Buffer{})

	_, err := promptPassword(cmd, "CAIRN_GH_READ_TOKEN", erroringReader{err: errors.New("pipe closed")})
	if err == nil {
		t.Fatal("promptPassword() = nil, want an error when stdin itself fails")
	}
}

// TestNewDepsWiresTheProcessOwnStdin asserts the production wiring reads os.Stdin, per
// criterion 7's own requirement that a test cover the default.
func TestNewDepsWiresTheProcessOwnStdin(t *testing.T) {
	d := newDeps()
	if d.stdin != io.Reader(os.Stdin) {
		t.Error("newDeps() does not wire stdin to the process's own os.Stdin")
	}
}

// TestNoCommandBlocksOnClosedStdin drives every command with an empty, already-exhausted stdin
// and asserts each returns well within a generous bound: a blocked unattended run produces no
// output and no exit code, and there is no recovery.
func TestNoCommandBlocksOnClosedStdin(t *testing.T) {
	d, _ := testDeps(t)
	d.stdin = strings.NewReader("")
	d.readPassword = func(cmd *cobra.Command, name string) (string, error) {
		return promptPassword(cmd, name, d.stdin)
	}
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	commands := [][]string{
		{"sites", "list"},
		{"health"},
		{"health", "ecxc-ski-a1b2c3"},
		{"logs", "ecxc-ski-a1b2c3"},
		{"adopt"},
		{"adopt", "list"},
		{"auth", "list"},
		{"auth", "set", "CAIRN_CF_READ_TOKEN"},
		{"auth", "unset", "CAIRN_CF_READ_TOKEN"},
		{"auth", "probe"},
	}
	for _, args := range commands {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			done := make(chan struct{})
			go func() {
				cmd := newRootCmd(d)
				cmd.SetOut(&bytes.Buffer{})
				cmd.SetErr(&bytes.Buffer{})
				cmd.SetArgs(args)
				_ = cmd.Execute()
				close(done)
			}()
			select {
			case <-done:
			case <-time.After(5 * time.Second):
				t.Fatalf("cairn %s did not return; it is waiting on stdin", strings.Join(args, " "))
			}
		})
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

// watchingReader records what an observed writer held at the moment stdin was first read, which
// is how a test sees ordering rather than only the final output.
type watchingReader struct {
	io.Reader
	watched  *bytes.Buffer
	atRead   string
	readOnce bool
}

func (r *watchingReader) Read(p []byte) (int, error) {
	if !r.readOnce {
		r.readOnce = true
		r.atRead = r.watched.String()
	}
	return r.Reader.Read(p)
}

// TestPromptPasswordFlushesThePromptBeforeReading covers the ordering the operator sees: main
// wraps stderr in a logx.Writer, which holds a line until its newline, and the prompt carries
// none. Without the flush the operator types blind and the prompt lands after the value.
func TestPromptPasswordFlushesThePromptBeforeReading(t *testing.T) {
	var out bytes.Buffer
	cmd := &cobra.Command{}
	cmd.SetErr(logx.New(&out, nil))
	stdin := &watchingReader{Reader: strings.NewReader("s3cr3t\n"), watched: &out}

	if _, err := promptPassword(cmd, "CAIRN_GH_READ_TOKEN", stdin); err != nil {
		t.Fatalf("promptPassword() = %v, want nil", err)
	}
	if !stdin.readOnce {
		t.Fatal("stdin was never read, so the test proves no ordering")
	}
	if !strings.Contains(stdin.atRead, "CAIRN_GH_READ_TOKEN: ") {
		t.Errorf("stderr held %q when stdin was read, want the prompt already visible", stdin.atRead)
	}
}
