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

// TestHelpTakesTheGroundFromThemeAndTheVariables runs `cairn --help` on a terminal and reads the
// ground from Muted's 256-colour code: --theme beats CAIRN_THEME in both directions, so an
// explicit --theme dark wins over CAIRN_THEME=light although dark is the flag's default.
func TestHelpTakesTheGroundFromThemeAndTheVariables(t *testing.T) {
	t.Setenv("TERM", "xterm-256color")
	t.Setenv("COLORTERM", "")
	_ = os.Unsetenv("NO_COLOR")
	const mutedDark, mutedLight = "38;5;248", "38;5;241"
	for _, tc := range []struct {
		name string
		args []string
		env  string
		want string
	}{
		{"flag dark over CAIRN_THEME light", []string{"--theme", "dark", "--help"}, themeLight, mutedDark},
		{"flag light over CAIRN_THEME dark", []string{"--help", "--theme", "light"}, themeDark, mutedLight},
		{"CAIRN_THEME light alone", []string{"--help"}, themeLight, mutedLight},
		{"nothing set", []string{"--help"}, "", mutedDark},
	} {
		t.Run(tc.name, func(t *testing.T) {
			d, _ := testDeps(t)
			d.stdout = openPTY(t)
			d.env = fakeEnv(map[string]string{"TERM": "xterm-256color", varTheme: tc.env})
			var out bytes.Buffer
			cmd := newRootCmd(d)
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tc.args)
			if err := executeThemed(context.Background(), d, cmd, tc.args); err != nil {
				t.Fatal(err)
			}
			if codes := sgrCodes(out.String()); !codes[tc.want] {
				t.Errorf("help carries no %q; codes: %v", tc.want, codes)
			}
		})
	}
}

// TestPlainHelpOnATerminal holds that CAIRN_PLAIN=1 turns help to cobra's plain output even on a
// terminal.
func TestPlainHelpOnATerminal(t *testing.T) {
	t.Setenv("TERM", "xterm-256color")
	_ = os.Unsetenv("NO_COLOR")
	d, _ := testDeps(t)
	d.stdout = openPTY(t)
	d.env = fakeEnv(map[string]string{"TERM": "xterm-256color", varPlain: "1"})
	var out bytes.Buffer
	cmd := newRootCmd(d)
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs([]string{"--help"})
	if err := executeThemed(context.Background(), d, cmd, []string{"--help"}); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "Usage:") || strings.Contains(out.String(), "\x1b") {
		t.Errorf("CAIRN_PLAIN help is not plain cobra output: %q", out.String())
	}
}
