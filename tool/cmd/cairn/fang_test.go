package main

import (
	"bytes"
	"context"
	"io"
	"os"
	"strings"
	"testing"

	"charm.land/lipgloss/v2"
	"github.com/glw907/cairn-cms/tool/v2/internal/render"
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

// TestHelpInksMatchRendersPalette ties the help's copied Warm Stone hexes to render's palette,
// read through the TrueColor foreground render.Theme.Style resolves each role to.
func TestHelpInksMatchRendersPalette(t *testing.T) {
	for _, tc := range []struct {
		name string
		ink  warmStoneInk
		role render.Role
	}{
		{"text", inkText, render.RoleText},
		{"muted", inkMuted, render.RoleMuted},
		{"failing", inkFailing, render.RoleFailing},
		{"unknown", inkUnknown, render.RoleUnknown},
		{"accent", inkAccent, render.RoleAccent},
	} {
		for _, side := range []struct {
			dark bool
			hex  string
		}{{false, tc.ink.light}, {true, tc.ink.dark}} {
			got := render.NewTheme(side.dark, render.ProfileTrueColor).Style(tc.role).GetForeground()
			if got == nil {
				t.Fatalf("%s (dark %v): render's style has no foreground", tc.name, side.dark)
			}
			gr, gg, gb, _ := got.RGBA()
			wr, wg, wb, _ := lipgloss.Color(side.hex).RGBA()
			if gr != wr || gg != wg || gb != wb {
				t.Errorf("%s (dark %v): help ink %s differs from render's palette", tc.name, side.dark, side.hex)
			}
		}
	}
}

// TestTTYWriterKeepsEveryWriteInTheScrubbedStream holds the writer fang paints through to Write
// alone: no method that writes past the scrubbed stream, and still the file shape colorprofile's
// terminal check asks for.
func TestTTYWriterKeepsEveryWriteInTheScrubbedStream(t *testing.T) {
	var out bytes.Buffer
	tw := ttyWriter{term: os.Stdout, out: &out}
	var w any = tw
	if _, ok := w.(io.StringWriter); ok {
		t.Error("the writer has WriteString")
	}
	if _, ok := w.(io.ReaderFrom); ok {
		t.Error("the writer has ReadFrom")
	}
	if _, ok := w.(io.WriterAt); ok {
		t.Error("the writer has WriteAt")
	}
	if _, ok := w.(interface {
		io.ReadWriteCloser
		Fd() uintptr
	}); !ok {
		t.Error("the writer is not a file to colorprofile, so fang would never paint")
	}
	if _, err := io.WriteString(tw, "help"); err != nil || out.String() != "help" {
		t.Errorf("io.WriteString reached the scrubbed stream as %q (%v), want %q", out.String(), err, "help")
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
	if err := executeThemed(context.Background(), d, cmd, []string{"--help"}); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "Usage:") {
		t.Errorf("a non-terminal run did not keep cobra's help:\n%s", out.String())
	}
	if strings.Contains(out.String(), "\x1b") {
		t.Errorf("help carries an escape under NO_COLOR: %q", out.String())
	}
}
