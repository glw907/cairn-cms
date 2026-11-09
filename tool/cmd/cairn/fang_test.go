package main

import (
	"bytes"
	"context"
	"strings"
	"testing"
)

// TestThemedHelpCarriesNoEscapeUnderNoColor runs the root's help through fang, which paints a
// terminal, with NO_COLOR set, and holds the output to no ESC byte. The buffer is not a terminal
// so fang's own writer strips, which is the contract that matters: nothing the themed path
// writes can carry colour into a stream that asked for none.
func TestThemedHelpCarriesNoEscapeUnderNoColor(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	d, _ := testDeps(t)
	var out bytes.Buffer
	cmd := newRootCmd(d)
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs([]string{"--help"})
	if err := fangExecute(context.Background(), cmd); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "USAGE") {
		t.Errorf("help did not take fang's layout:\n%s", out.String())
	}
	if strings.Contains(out.String(), "\x1b") {
		t.Errorf("help carries an escape under NO_COLOR: %q", out.String())
	}
}

// TestPlainHelpCarriesNoEscapeUnderNoColor holds the path every non-terminal and NO_COLOR run
// takes, executeThemed with no terminal behind it, to cobra's plain help with no escape.
func TestPlainHelpCarriesNoEscapeUnderNoColor(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	d, _ := testDeps(t)
	var out bytes.Buffer
	cmd := newRootCmd(d)
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs([]string{"--help"})
	if err := executeThemed(context.Background(), d, cmd); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "Usage:") {
		t.Errorf("a non-terminal run did not keep cobra's help:\n%s", out.String())
	}
	if strings.Contains(out.String(), "\x1b") {
		t.Errorf("help carries an escape under NO_COLOR: %q", out.String())
	}
}
