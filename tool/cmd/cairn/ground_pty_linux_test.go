package main

import (
	"bytes"
	"testing"

	"github.com/creack/pty"
	"github.com/spf13/cobra"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// TestPlainReadsAsNotATerminal puts both streams on a real terminal and holds that CAIRN_PLAIN=1
// turns every styled path to the pipe path: detectTerminal answers what a nil stream answers,
// the progress line is off, and the paste notice is writeNotice's plain line. The control run
// without the variable proves the terminal is one.
func TestPlainReadsAsNotATerminal(t *testing.T) {
	controller, tty, err := pty.Open()
	if err != nil {
		t.Skipf("no pty: %v", err)
	}
	t.Cleanup(func() { _ = controller.Close(); _ = tty.Close() })

	base, _ := testDeps(t)
	base.stdout, base.stderr = tty, tty
	vars := map[string]string{varTerm: "xterm-256color"}
	base.env = fakeEnv(vars)
	rf := &rootFlags{theme: themeDark, color: colorAuto}

	if !detectTerminal(base, rf).TTY || !showsProgress(base, rf, healthFlags{}) {
		t.Fatal("control: a pty did not read as a terminal, so the plain rows prove nothing")
	}

	plain := base
	plainVars := map[string]string{varTerm: "xterm-256color", varPlain: "1"}
	plain.env = fakeEnv(plainVars)
	pipe := base
	pipe.stdout, pipe.stderr = nil, nil

	if got, want := detectTerminal(plain, rf), detectTerminal(pipe, rf); got != want {
		t.Errorf("detectTerminal under CAIRN_PLAIN = %+v, want the pipe's %+v", got, want)
	}
	if want := style.Detect(nil, style.Env{Term: "xterm-256color", Color: colorAuto}); detectTerminal(plain, rf) != want {
		t.Errorf("detectTerminal under CAIRN_PLAIN = %+v, want Detect(nil)'s %+v", detectTerminal(plain, rf), want)
	}
	if showsProgress(plain, rf, healthFlags{}) {
		t.Error("the progress line draws under CAIRN_PLAIN")
	}

	notice := func(d deps) string {
		var buf bytes.Buffer
		cmd := &cobra.Command{}
		cmd.SetErr(&buf)
		if err := writePasteNotice(cmd, d, rf); err != nil {
			t.Fatal(err)
		}
		return buf.String()
	}
	if got, want := notice(plain), notice(pipe); got != want {
		t.Errorf("paste notice under CAIRN_PLAIN = %q, want the pipe's %q", got, want)
	}
	if notice(base) == notice(pipe) {
		t.Error("control: the paste notice on a terminal matches the pipe's, so the plain row proves nothing")
	}
}
