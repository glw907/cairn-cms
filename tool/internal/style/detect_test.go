package style

import (
	"os"
	"runtime"
	"testing"

	"github.com/charmbracelet/colorprofile"
)

// emptyTermProfile is what --color=auto settles on for a terminal that sets no TERM, which is
// the one row of the detection table whose right answer is not the same on every platform.
//
// On Unix an empty TERM means no terminfo entry, so nothing advertises colour support and cairn
// paints none. On Windows it means Windows Terminal or cmd.exe, neither of which sets TERM at
// all; colorprofile asks the OS instead (colorprofile@v0.4.3, envColorProfile's windows branch)
// and a build at or past 14931 answers TrueColor. Both answers are correct for their platform,
// and pinning the Unix one everywhere is what made the Windows CI leg red. Verified by reading
// the dependency's source, not by running on Windows: only the CI leg can confirm the build
// number the runner reports.
func emptyTermProfile() colorprofile.Profile {
	if runtime.GOOS == "windows" {
		return colorprofile.TrueColor
	}
	return colorprofile.ASCII
}

// TestDetectColourOrder covers criterion 14's detection table: NO_COLOR beats --color=always,
// --color=never and --color=always both settle it before TERM or TTY are consulted, and auto
// falls through to TERM=dumb and non-TTY before the terminfo lookup.
func TestDetectColourOrder(t *testing.T) {
	tests := []struct {
		name  string
		isTTY bool
		env   Env
		want  colorprofile.Profile
	}{
		{"no_color_wins_over_always", true, Env{NoColor: "1", Color: "always", Term: "xterm-256color"}, colorprofile.ASCII},
		{"no_color_non_empty_string", true, Env{NoColor: "0", Color: "auto", Term: "xterm-256color"}, colorprofile.ASCII},
		{"color_never", true, Env{Color: "never", Term: "xterm-256color"}, colorprofile.ASCII},
		{"color_always_forces_truecolor", false, Env{Color: "always", Term: "dumb"}, colorprofile.TrueColor},
		{"auto_term_dumb", true, Env{Color: "auto", Term: "dumb"}, colorprofile.ASCII},
		{"auto_non_tty", false, Env{Color: "auto", Term: "xterm-256color"}, colorprofile.ASCII},
		{"auto_ansi256", true, Env{Color: "auto", Term: "xterm-256color"}, colorprofile.ANSI256},
		{"auto_ansi16", true, Env{Color: "auto", Term: "xterm"}, colorprofile.ANSI},
		{"auto_empty_term", true, Env{Color: "auto", Term: ""}, emptyTermProfile()},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, _ := detect(tt.isTTY, true, tt.env)
			if got != tt.want {
				t.Errorf("detect(%v, true, %+v) = %v, want %v", tt.isTTY, tt.env, got, tt.want)
			}
		})
	}
}

// TestDetectASCIITier covers criterion 13: the ASCII glyph tier is a separate, TTY-shaped
// condition that --color and NO_COLOR never move, so an operator forcing colour into a pipe
// still reads the ASCII tier there.
func TestDetectASCIITier(t *testing.T) {
	tests := []struct {
		name  string
		isTTY bool
		vtOK  bool
		env   Env
		want  bool
	}{
		{"tty_normal_term", true, true, Env{Term: "xterm-256color"}, false},
		{"non_tty", false, true, Env{Term: "xterm-256color"}, true},
		{"term_dumb", true, true, Env{Term: "dumb"}, true},
		{"windows_console_refuses_vt", true, false, Env{Term: "xterm"}, true},
		{"color_always_into_a_pipe_stays_ascii", false, true, Env{Color: "always", Term: "xterm-256color"}, true},
		{"no_color_on_a_real_tty_stays_unicode", true, true, Env{NoColor: "1", Term: "xterm-256color"}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, gotASCII := detect(tt.isTTY, tt.vtOK, tt.env)
			if gotASCII != tt.want {
				t.Errorf("detect(%v, %v, %+v) ascii = %v, want %v", tt.isTTY, tt.vtOK, tt.env, gotASCII, tt.want)
			}
		})
	}
}

// TestNoColorAloneForcesNoColorProfile is criterion 24's determinism claim for NO_COLOR: it alone
// forces the no-colour profile, independent of TERM, Color, or TTY state.
func TestNoColorAloneForcesNoColorProfile(t *testing.T) {
	for _, tty := range []bool{true, false} {
		for _, color := range []string{"auto", "always", "never"} {
			got, _ := detect(tty, true, Env{NoColor: "1", Color: color, Term: "xterm-256color"})
			if got != colorprofile.ASCII {
				t.Errorf("detect(tty=%v, color=%s) with NO_COLOR set = %v, want colorprofile.ASCII", tty, color, got)
			}
		}
	}
}

// TestDetectRealStdout is a smoke test over the impure wrapper itself: a test binary's
// stdout is not a terminal, so with no NO_COLOR set the profile is colorprofile.ASCII and the tier is
// ASCII, and the function does not panic reading a real *os.File.
func TestDetectRealStdout(t *testing.T) {
	got := Detect(os.Stdout, Env{Color: "auto"})
	if os.Getenv("NO_COLOR") == "" && !isRealTTY() {
		if got.Profile != colorprofile.ASCII {
			t.Errorf("Profile = %v, want colorprofile.ASCII for a non-TTY stdout", got.Profile)
		}
		if !got.ASCII {
			t.Error("ASCII = false, want true for a non-TTY stdout")
		}
		if got.Columns != 0 {
			t.Errorf("Columns = %d, want 0 for a non-TTY stdout", got.Columns)
		}
		if got.TTY {
			t.Error("TTY = true, want false for a non-TTY stdout")
		}
	}
}

// TestDetectNilStdout covers the stream-less caller: a command built with no process
// stdout must read as a pipe rather than probing a nil file descriptor.
func TestDetectNilStdout(t *testing.T) {
	got := Detect(nil, Env{Color: "always"})
	if got.TTY {
		t.Error("TTY = true, want false with no stdout")
	}
	if got.Columns != 0 {
		t.Errorf("Columns = %d, want 0 with no stdout", got.Columns)
	}
	if !got.ASCII {
		t.Error("ASCII = false, want true with no stdout")
	}
	if got.Profile != colorprofile.TrueColor {
		t.Errorf("Profile = %v, want colorprofile.TrueColor: --color=always forces colour", got.Profile)
	}
}

// isRealTTY reports whether this test process itself has a real terminal on stdout, so
// TestDetectRealStdout can skip its assertion under `go test` run interactively rather
// than assume every CI and every desk always pipes stdout.
func isRealTTY() bool {
	fi, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}
