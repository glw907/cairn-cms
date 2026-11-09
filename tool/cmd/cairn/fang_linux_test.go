package main

import (
	"bytes"
	"context"
	"os"
	"strconv"
	"strings"
	"testing"

	"golang.org/x/sys/unix"
)

// openPTY opens a pseudo-terminal pair and returns its terminal end, the file a process's stdout
// is when a person runs it.
func openPTY(t *testing.T) *os.File {
	t.Helper()
	ptm, err := os.OpenFile("/dev/ptmx", os.O_RDWR, 0)
	if err != nil {
		t.Skipf("no pseudo-terminal: %v", err)
	}
	t.Cleanup(func() { _ = ptm.Close() })
	if err := unix.IoctlSetPointerInt(int(ptm.Fd()), unix.TIOCSPTLCK, 0); err != nil {
		t.Fatalf("unlock the pseudo-terminal: %v", err)
	}
	n, err := unix.IoctlGetInt(int(ptm.Fd()), unix.TIOCGPTN)
	if err != nil {
		t.Fatalf("name the pseudo-terminal: %v", err)
	}
	pts, err := os.OpenFile("/dev/pts/"+strconv.Itoa(n), os.O_RDWR|unix.O_NOCTTY, 0)
	if err != nil {
		t.Fatalf("open the pseudo-terminal: %v", err)
	}
	t.Cleanup(func() { _ = pts.Close() })
	return pts
}

// TestHelpOnATerminalFollowsTheColorFlag runs the root's help with a colour terminal behind
// stdout. Bare --help takes fang's painted layout; --color never, before or after --help, takes
// cobra's plain help with no escape.
func TestHelpOnATerminalFollowsTheColorFlag(t *testing.T) {
	t.Setenv("TERM", "xterm-256color")
	t.Setenv("NO_COLOR", "")
	_ = os.Unsetenv("NO_COLOR")
	for _, tc := range []struct {
		name   string
		args   []string
		want   string
		escape bool
	}{
		{"auto paints fang's help", []string{"--help"}, "USAGE", true},
		{"never before help", []string{"--color", "never", "--help"}, "Usage:", false},
		{"never after help", []string{"--help", "--color=never"}, "Usage:", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			d, _ := testDeps(t)
			d.stdout = openPTY(t)
			d.env = fakeEnv(map[string]string{"TERM": "xterm-256color"})
			var out bytes.Buffer
			cmd := newRootCmd(d)
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tc.args)
			if err := executeThemed(context.Background(), d, cmd, tc.args); err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(out.String(), tc.want) {
				t.Errorf("help lacks %q:\n%s", tc.want, out.String())
			}
			if got := strings.Contains(out.String(), "\x1b"); got != tc.escape {
				t.Errorf("help carries an escape: %v, want %v: %q", got, tc.escape, out.String())
			}
		})
	}
}
