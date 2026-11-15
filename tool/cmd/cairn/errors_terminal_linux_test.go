package main

import (
	"bytes"
	"context"
	"os"
	"strings"
	"testing"

	"github.com/creack/pty"
)

// TestErrorPrintsABlockOnlyOnATerminal runs the tree with stderr on a real terminal and holds the
// four ways an error reaches it: the block under --color never carries no escape byte, the block
// at auto colour does, and CAIRN_PLAIN and a pipe both print the bytes a pipe always has. An
// unknown command fails before the root's PersistentPreRunE, so this is also the proof that the
// printer reads --color itself.
func TestErrorPrintsABlockOnlyOnATerminal(t *testing.T) {
	controller, tty, err := pty.Open()
	if err != nil {
		t.Skipf("no pty: %v", err)
	}
	t.Cleanup(func() { _ = controller.Close(); _ = tty.Close() })

	const pipeBytes = "cairn: \"healt\" is not a cairn command.\nRun `cairn --help` for the commands\n"
	run := func(stderr *os.File, vars map[string]string, args ...string) string {
		t.Helper()
		d, _ := testDeps(t)
		d.stderr = stderr
		d.env = fakeEnv(vars)
		var out, errOut bytes.Buffer
		runTree(context.Background(), d, &out, &errOut, args)
		return errOut.String()
	}
	term := map[string]string{varTerm: "xterm-256color", "LANG": "C.UTF-8"}

	never := run(tty, term, "healt", "--color", "never")
	if strings.Contains(never, "\x1b") {
		t.Errorf("--color never on a terminal printed an escape byte: %q", never)
	}
	if !strings.Contains(never, "■") || !strings.Contains(never, "→ Run `cairn --help`") || strings.Contains(never, "cairn: ") {
		t.Errorf("--color never on a terminal = %q, want the error block", never)
	}

	if auto := run(tty, term, "healt"); !strings.Contains(auto, "\x1b[") {
		t.Errorf("control: the block at auto colour on a terminal carries no escape, so the never row proves nothing: %q", auto)
	}

	plain := map[string]string{varTerm: "xterm-256color", "LANG": "C.UTF-8", varPlain: "1"}
	if got := run(tty, plain, "healt"); got != pipeBytes {
		t.Errorf("CAIRN_PLAIN on a terminal = %q, want the pipe's %q", got, pipeBytes)
	}
	if got := run(nil, term, "healt"); got != pipeBytes {
		t.Errorf("a pipe = %q, want %q", got, pipeBytes)
	}
}

// TestCrashPrintsABlockOnATerminal holds that the recovered panic takes the block too, wrapped at
// the terminal's width and with no fix line, since its second line is a report address rather
// than a Run line.
func TestCrashPrintsABlockOnATerminal(t *testing.T) {
	controller, tty, err := pty.Open()
	if err != nil {
		t.Skipf("no pty: %v", err)
	}
	t.Cleanup(func() { _ = controller.Close(); _ = tty.Close() })
	// The block wraps at the terminal's measured width, so the size is set rather than left to the
	// pty's default of none.
	if err := pty.Setsize(tty, &pty.Winsize{Rows: 24, Cols: 120}); err != nil {
		t.Fatal(err)
	}

	d, _ := testDeps(t)
	d.stderr = tty
	d.env = fakeEnv(map[string]string{varTerm: "xterm-256color", "LANG": "C.UTF-8"})
	d.registryDir = func() (string, error) { panic("boom") }
	var out, errOut bytes.Buffer
	runTree(context.Background(), d, &out, &errOut, []string{"sites", "list", "--color", "never"})

	want := "  ■ cairn sites list crashed with a string.\n" +
		"    This is a bug in cairn. Report it at https://github.com/glw907/cairn-cms/issues\n"
	if got := errOut.String(); got != want {
		t.Errorf("crash on a terminal =\n%q\nwant\n%q", got, want)
	}
}
