// Package style is the terminal language every cairn command speaks: the Warm Stone palette,
// the mark tables for both glyph tiers, and the width measure and wrap that budget a line in
// cells. It imports no Bubble Tea, so a print-and-exit command and the installer share it.
package style

import (
	"image/color"

	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"
)

// Role is a semantic ink role. Every style a command paints resolves through one of these, so no
// file outside this one writes a colour value.
type Role int

// The CLI's roles, the Warm Stone token table. There is no
// role for the reference ground: the terminal owns the background, and the two ground hexes
// appear only in the contrast test.
const (
	RoleText Role = iota
	RoleMuted
	RoleSubtle
	RoleOK
	RoleFailing
	RoleUnknown
	RoleAccent
	RoleRule

	// RoleInstallerText is the warm near-black or near-white ink the installer's view paints its
	// body text in, where the CLI's RoleText takes the terminal's own foreground. It sits after
	// RoleRule so a walk from RoleText to RoleRule covers only the CLI's roles.
	//
	// WATCH: remove once the installer paints through the shared terminal language.
	RoleInstallerText
)

// ink carries one role's value at every rung a terminal can offer: a hex pair for TrueColor, an
// xterm-256 pair for the named ANSI256 rung, and one ANSI-16 slot shared by both branches, empty
// when the role carries no explicit slot at all. RoleText carries no ink at any rung, so body text
// takes the terminal's own foreground and reads on a dark or a light ground alike. RoleMuted is
// the terminal's default foreground at ANSI-16: slot 8 is the background on Solarized Dark, and
// SGR 2 (faint) measures under 2:1 contrast on several common themes, so neither is ever used for
// a role that must stay readable.
type ink struct {
	lightHex, darkHex string
	light256, dark256 string
	ansi16            string
}

// warmStone is the one table in this module that writes a hex value.
var warmStone = map[Role]ink{
	RoleMuted:   {"#615d57", "#a8a49e", "243", "246", ""},
	RoleSubtle:  {"#504c47", "#c1bdb8", "240", "250", "7"},
	RoleOK:      {"#197037", "#7ccd8e", "28", "114", "2"},
	RoleFailing: {"#b71824", "#ff8e86", "160", "210", "1"},
	RoleUnknown: {"#915200", "#f7ac4d", "130", "215", "3"},
	RoleAccent:  {"#7246cf", "#9d84ec", "97", "141", "5"},
	// The rule's risk on a Solarized Dark terminal (slot 8 is that theme's background,
	// so a rule vanishes) is accepted here: a vanished rule costs a separator, not a state,
	// and it is the one role the ANSI-16 slot-8 test exempts.
	RoleRule: {"#c9c3bb", "#4a443b", "251", "238", "8"},

	RoleInstallerText: {"#28231d", "#eae7e3", "235", "255", ""},
}

// NoColor reports whether p carries no colour at all. Unknown and NoTTY count as no colour, so a
// zero profile reads as a pipe, and no style at such a profile emits an escape byte.
func NoColor(p colorprofile.Profile) bool {
	return p <= colorprofile.ASCII
}

// Pair returns role's light and dark hex colours, for a caller that must hand both to a library
// that picks the ground itself. RoleText has no ink, so both of its colours are lipgloss.NoColor.
func Pair(r Role) (light, dark color.Color) {
	v := warmStone[r]
	return lipgloss.Color(v.lightHex), lipgloss.Color(v.darkHex)
}

// Theme resolves a role to a style for one background and one colour profile, and measures text
// under one East Asian Width reading. Build it with NewTheme; the zero value is the light
// background at no colour, measuring narrow.
type Theme struct {
	dark    bool
	profile colorprofile.Profile
	widths  widthTable
}

// NewTheme returns the theme for a background and a colour profile. ascii selects the width
// table the ASCII tier measures under, which budgets Ambiguous runes at two cells, and is
// otherwise independent of the profile.
func NewTheme(dark bool, p colorprofile.Profile, ascii bool) Theme {
	t := Theme{dark: dark, profile: p, widths: tableNarrow}
	if ascii {
		t.widths = tableWide
	}
	return t
}

// resolve resolves role through lipgloss's light/dark and per-profile seams, so the value a
// terminal receives is named at every rung, ANSI256 included, rather than nearest-matched down
// from 24 bits. The ANSI-16 argument is only selected when the caller has confirmed role carries
// an explicit slot, so an empty slot never reaches a terminal even though the zero value still
// has to type-check here.
func (t Theme) resolve(role Role) color.Color {
	v := warmStone[role]
	ld := lipgloss.LightDark(t.dark)
	ansi16 := lipgloss.Color(v.ansi16)
	return lipgloss.Complete(t.profile)(
		ld(ansi16, ansi16),
		ld(lipgloss.Color(v.light256), lipgloss.Color(v.dark256)),
		ld(lipgloss.Color(v.lightHex), lipgloss.Color(v.darkHex)),
	)
}

// noInk reports whether role falls back to the terminal's own foreground: RoleText at every
// profile, no colour at all, or an ANSI-16 terminal and a role with no slot.
func (t Theme) noInk(role Role) bool {
	return role == RoleText || NoColor(t.profile) || (t.profile == colorprofile.ANSI && warmStone[role].ansi16 == "")
}

// Color returns role's colour, or lipgloss.NoColor where the role falls back to the terminal's
// own foreground.
func (t Theme) Color(role Role) color.Color {
	if t.noInk(role) {
		return lipgloss.NoColor{}
	}
	return t.resolve(role)
}

// Style returns role's style: the zero style at no colour, so a body that leans on colour alone
// fails visibly rather than in production; the zero style for RoleText, and at ANSI-16 for a
// role with no slot; and role's resolved colour at every other rung.
func (t Theme) Style(role Role) lipgloss.Style {
	s := lipgloss.NewStyle()
	if t.noInk(role) {
		return s
	}
	return s.Foreground(t.resolve(role))
}

// Strong returns role's style at bold weight, for the verdict word and the subject it names. At
// no colour it returns the zero style, bold included: a cron mail, a CI log, or an agent reading
// a pipe gets no escape bytes at all, not merely no colour.
func (t Theme) Strong(role Role) lipgloss.Style {
	if NoColor(t.profile) {
		return t.Style(role)
	}
	return t.Style(role).Bold(true)
}

// Link returns role's style carrying url as an OSC 8 hyperlink, and the zero style at no colour,
// where a pipe has no use for the sequence. Callers pass the URL itself as the text, so a
// terminal that ignores the sequence shows the same destination.
func (t Theme) Link(role Role, url string) lipgloss.Style {
	if NoColor(t.profile) {
		return lipgloss.NewStyle()
	}
	return t.Style(role).Hyperlink(url)
}

// DocLink returns the style a documentation link is drawn in: Text ink with a plain underline
// (SGR 4), carrying url as an OSC 8 hyperlink. No underline colour is set: lipgloss emits SGR 58
// in its semicolon form, which a terminal without SGR 58 support can misread as other attributes
// such as blink or a colour. At no colour it returns the zero style, underline and hyperlink
// included.
func (t Theme) DocLink(url string) lipgloss.Style {
	if NoColor(t.profile) {
		return lipgloss.NewStyle()
	}
	return t.Link(RoleText, url).Underline(true)
}

// Sized returns role's style constrained to a fixed-width cell: Width(w).MaxWidth(w), padding
// inside the styled block and cut at the same width.
func (t Theme) Sized(role Role, w int) lipgloss.Style {
	return fixed(t.Style(role), w)
}

// SizedStrong returns Strong's style constrained to a fixed-width cell.
func (t Theme) SizedStrong(role Role, w int) lipgloss.Style {
	return fixed(t.Strong(role), w)
}

// SizedLink returns Link's style constrained to a fixed-width cell.
func (t Theme) SizedLink(role Role, url string, w int) lipgloss.Style {
	return fixed(t.Link(role, url), w)
}

// fixed pads s to w cells and cuts it there; a negative w counts as zero.
func fixed(s lipgloss.Style, w int) lipgloss.Style {
	w = max(w, 0)
	return s.Width(w).MaxWidth(w)
}
