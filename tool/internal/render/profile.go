package render

import (
	"os"

	"github.com/charmbracelet/colorprofile"
	"golang.org/x/term"
)

// Profile is a colour rung this package paints at. Unlike colorprofile.Profile (six values, one
// of them "no terminal at all"), Profile carries only the four a Theme resolves a role against;
// TTY-ness and the ASCII glyph tier are DetectProfile's other two return values, read once at the
// one impure boundary and carried on RenderInput rather than re-encoded into this enum.
type Profile int

const (
	// ProfileNoColor paints no colour at all. Theme.Style returns the zero style here.
	ProfileNoColor Profile = iota
	// ProfileANSI16 paints the sixteen named terminal slots (criterion 5's table).
	ProfileANSI16
	// ProfileANSI256 paints the named xterm-256 rung (criterion 6).
	ProfileANSI256
	// ProfileTrueColor paints the 24-bit hex values directly.
	ProfileTrueColor
)

// colorprofile maps p to the six-value type lipgloss.Complete expects. It is not one of this
// package's forbidden colorprofile entry points (Detect, Env, Terminfo): it names no OS
// resource and reads nothing, it only relabels a value this package already holds.
func (p Profile) colorprofile() colorprofile.Profile {
	switch p {
	case ProfileANSI16:
		return colorprofile.ANSI
	case ProfileANSI256:
		return colorprofile.ANSI256
	case ProfileTrueColor:
		return colorprofile.TrueColor
	default:
		return colorprofile.Ascii
	}
}

// Env is the subset of the environment DetectProfile reads: the two variables cmd/cairn's loadEnv
// resolves (NoColor, Term), plus the operator's own --color choice (Color: "auto", "always", or
// "never"). It carries no more than that so this package's own determinism promise (criterion 24)
// stays checkable by construction: the same Env value can only ever produce the same profile.
type Env struct {
	NoColor string
	Term    string
	Color   string
}

// DetectProfile is this package's one TTY check (criterion 14) and its one caller of
// term.IsTerminal; purity_test.go's grep test names this file as the sole exception for both. It
// reports the colour profile to paint with, the terminal's column count when stdout is a
// terminal (0 otherwise), and whether output should render at the ASCII glyph tier.
//
// Detection order for colour: NO_COLOR, present and non-empty, always means no colour, even under
// --color=always, per the no-color.org convention that NO_COLOR overrides everything.
// --color=never means no colour; --color=always forces ProfileTrueColor regardless of the
// terminal. --color=auto, the default, falls through to TERM=dumb and a non-TTY stdout (both no
// colour), then to the terminfo database for the ANSI/ANSI256/TrueColor rung.
//
// The ASCII glyph tier is decided by a separate, TTY-shaped condition (criterion 13): not a TTY,
// TERM=dumb, or a Windows console that refuses virtual-terminal mode. --color and NO_COLOR never
// affect it, so an operator who forces colour into a pipe still reads the ASCII tier there.
//
// cmd/cairn is the one impure caller: it resolves env.NoColor and env.Term from loadEnv and
// passes its own stdout, and render itself reads nothing beyond this file.
func DetectProfile(stdout *os.File, env Env) (profile Profile, columns int, ascii bool) {
	isTTY := term.IsTerminal(int(stdout.Fd()))
	vtOK := !isTTY || enableVirtualTerminal(stdout.Fd())
	profile, ascii = detect(isTTY, vtOK, env)

	if isTTY {
		if w, _, err := term.GetSize(int(stdout.Fd())); err == nil && w > 0 {
			columns = w
		}
	}
	return profile, columns, ascii
}

// detect is DetectProfile's pure core: every input it needs travels as a parameter, so
// profile_test.go can drive the full detection table (the colour order and the ASCII condition)
// without a real terminal. isTTY and vtOK are DetectProfile's own two term package results;
// everything else already arrives as data on env.
func detect(isTTY, vtOK bool, env Env) (profile Profile, ascii bool) {
	ascii = !isTTY || env.Term == "dumb" || !vtOK

	switch {
	case env.NoColor != "":
		profile = ProfileNoColor
	case env.Color == "never":
		profile = ProfileNoColor
	case env.Color == "always":
		profile = ProfileTrueColor
	case env.Term == "dumb":
		profile = ProfileNoColor
	case !isTTY:
		profile = ProfileNoColor
	default:
		// colorprofile.Terminfo only ever distinguishes NoTTY, ANSI, or TrueColor (Tc/RGB
		// capabilities): it never reports ANSI256 (verified local, colorprofile@v0.4.3/env.go),
		// so criterion 6's named 256 rung is unreachable through it. colorprofile.Env reads
		// TERM's own "-256color" convention instead, which is the one signal a 256-colour
		// terminal actually advertises there.
		profile = fromColorprofile(colorprofile.Env([]string{"TERM=" + env.Term}))
	}
	return profile, ascii
}

// fromColorprofile maps colorprofile's terminfo verdict onto this package's four-value Profile.
// Unknown, NoTTY, and ASCII (no colour support at all) all collapse to ProfileNoColor: a terminal
// whose terminfo entry claims none of the higher rungs gets the same "paint nothing" treatment as
// an operator who asked for it.
func fromColorprofile(p colorprofile.Profile) Profile {
	switch p {
	case colorprofile.ANSI:
		return ProfileANSI16
	case colorprofile.ANSI256:
		return ProfileANSI256
	case colorprofile.TrueColor:
		return ProfileTrueColor
	default:
		return ProfileNoColor
	}
}
