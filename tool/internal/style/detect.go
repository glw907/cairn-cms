package style

import (
	"os"

	"github.com/charmbracelet/colorprofile"
	"golang.org/x/term"
)

// Env is the subset of the environment Detect reads: the two variables cmd/cairn's loadEnv
// resolves (NoColor, Term), plus the operator's --color choice (Color: "auto", "always", or
// "never"). It carries no more than that so the same Env value can only ever produce the same
// profile, which keeps every frame built from it checkable by construction.
type Env struct {
	NoColor string
	Term    string
	Color   string
}

// Terminal is everything Detect measured about one output stream, returned as one value so the
// module's single TTY check has a single result rather than a growing return list.
type Terminal struct {
	// Profile is the colour rung to paint at: ASCII, ANSI, ANSI256, or TrueColor, never Unknown
	// or NoTTY.
	Profile colorprofile.Profile
	// Columns is the terminal's column count, and 0 when stdout is not a terminal or the size
	// could not be read. A frame takes it when the operator passed no --width.
	Columns int
	// ASCII reports whether output should render at the ASCII glyph tier.
	ASCII bool
	// TTY reports whether stdout is a terminal. It selects the body: a pipe always takes the
	// plain body, whatever --color says, and ASCII is a separate axis, since a TERM=dumb
	// terminal is still a terminal.
	TTY bool
}

// Detect is the module's one TTY check, through IsTerminal. It reports the colour profile to
// paint with, the terminal's column count when stdout is a terminal (0 otherwise), whether
// output should render at the ASCII glyph tier, and whether stdout is a terminal at all.
//
// Detection order for colour: NO_COLOR, present and non-empty, always means no colour, even under
// --color=always, per the no-color.org convention that NO_COLOR overrides everything.
// --color=never means no colour; --color=always forces TrueColor regardless of the terminal.
// --color=auto, the default, falls through to TERM=dumb and a non-TTY stdout (both no colour),
// then to the terminfo database for the ANSI/ANSI256/TrueColor rung.
//
// The ASCII glyph tier is decided by a separate, TTY-shaped condition: not a TTY, TERM=dumb, or a
// Windows console that refuses virtual-terminal mode. --color and NO_COLOR never affect it, so an
// operator who forces colour into a pipe still reads the ASCII tier there.
//
// cmd/cairn is the one impure caller: it resolves env.NoColor and env.Term from loadEnv and
// passes its stdout, and no other file in this package or in render reads the environment.
func Detect(stdout *os.File, env Env) Terminal {
	if stdout == nil {
		// A caller with no stream at all (a test's command, a run whose stdout was closed) is
		// treated as a pipe rather than probed: every branch below needs a file descriptor.
		profile, ascii := detect(false, false, env)
		return Terminal{Profile: profile, ASCII: ascii}
	}

	isTTY := IsTerminal(stdout)
	vtOK := !isTTY || enableVirtualTerminal(stdout.Fd())
	profile, ascii := detect(isTTY, vtOK, env)
	out := Terminal{Profile: profile, ASCII: ascii, TTY: isTTY}

	if isTTY {
		if w, _, err := term.GetSize(int(stdout.Fd())); err == nil && w > 0 {
			out.Columns = w
		}
	}
	return out
}

// IsTerminal reports whether f is a terminal, and false for a nil f. It holds the module's one
// term.IsTerminal call: Detect asks it of stdout, and cairn new asks it of stdin and stdout to
// choose the terminal view.
func IsTerminal(f *os.File) bool {
	return f != nil && term.IsTerminal(int(f.Fd()))
}

// detect is Detect's pure core: every input it needs travels as a parameter, so detect_test.go
// can drive the full detection table (the colour order and the ASCII condition) without a real
// terminal. isTTY and vtOK are Detect's two term package results; everything else already
// arrives as data on env.
func detect(isTTY, vtOK bool, env Env) (profile colorprofile.Profile, ascii bool) {
	ascii = !isTTY || env.Term == "dumb" || !vtOK

	switch {
	case env.NoColor != "":
		profile = colorprofile.ASCII
	case env.Color == "never":
		profile = colorprofile.ASCII
	case env.Color == "always":
		profile = colorprofile.TrueColor
	case env.Term == "dumb":
		profile = colorprofile.ASCII
	case !isTTY:
		profile = colorprofile.ASCII
	default:
		// colorprofile.Terminfo only ever distinguishes NoTTY, ANSI, or TrueColor (Tc/RGB
		// capabilities): it never reports ANSI256 (verified local, colorprofile@v0.4.3/env.go),
		// so the named 256 rung is unreachable through it. colorprofile.Env reads TERM's
		// "-256color" convention instead, which is the one signal a 256-colour terminal
		// actually advertises there.
		profile = paintable(colorprofile.Env([]string{"TERM=" + env.Term}))
	}
	return profile, ascii
}

// paintable folds colorprofile's terminfo verdict onto the four rungs a Theme paints at.
// Unknown, NoTTY, and ASCII (no colour support at all) all collapse to ASCII: a terminal whose
// terminfo entry claims none of the higher rungs gets the same "paint nothing" treatment as an
// operator who asked for it.
func paintable(p colorprofile.Profile) colorprofile.Profile {
	switch p {
	case colorprofile.ANSI, colorprofile.ANSI256, colorprofile.TrueColor:
		return p
	default:
		return colorprofile.ASCII
	}
}
