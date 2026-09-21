package render

import (
	"image/color"

	"charm.land/lipgloss/v2"
)

// Role is a semantic ink role. Every style a body paints resolves through one of these, so no
// file outside this one writes a colour value (purity_test.go's grep test).
type Role int

// The CLI's roles, the Warm Stone token table from docs/design/reviews/family.md. There is no
// role for the reference ground: the terminal owns the background, and the two ground hexes
// appear only in palette_test.go's contrast test. RoleAck folds into RoleMuted and RoleStale
// folds into RoleUnknown; neither survives as its own role.
const (
	RoleText Role = iota
	RoleMuted
	RoleSubtle
	RoleOK
	RoleFailing
	RoleUnknown
	RoleAccent
	RoleRule
)

// ink carries one role's value at every rung a terminal can offer: a hex pair for TrueColor, an
// xterm-256 pair for the named ANSI256 rung (criterion 6), and one ANSI-16 slot shared by both
// branches, empty when the role carries no explicit slot at all. RoleText and RoleMuted are the
// terminal's own default foreground at ANSI-16: slot 8 is the background on Solarized Dark, and
// SGR 2 (faint) measures under 2:1 contrast on several common themes, so neither is ever used for
// a role that must stay readable (criterion 5).
type ink struct {
	lightHex, darkHex string
	light256, dark256 string
	ansi16            string
}

// warmStone is the one table in this module that writes a hex value (criterion 4). Every other
// file resolves colour through Theme.Style or Theme.Sized.
var warmStone = map[Role]ink{
	RoleText:    {"#28231d", "#eae7e3", "235", "255", ""},
	RoleMuted:   {"#615d57", "#a8a49e", "243", "246", ""},
	RoleSubtle:  {"#504c47", "#c1bdb8", "240", "250", "7"},
	RoleOK:      {"#197037", "#7ccd8e", "28", "114", "2"},
	RoleFailing: {"#b71824", "#ff8e86", "160", "210", "1"},
	RoleUnknown: {"#915200", "#f7ac4d", "130", "215", "3"},
	RoleAccent:  {"#7246cf", "#9d84ec", "97", "141", "5"},
	// The rule's own risk on a Solarized Dark terminal (slot 8 is that theme's background,
	// so a rule vanishes) is accepted here: a vanished rule costs a separator, not a state,
	// and it is the one role the ANSI-16 slot-8 test exempts.
	RoleRule: {"#c9c3bb", "#4a443b", "251", "238", "8"},
}

// groundHex is the reference ground from family.md, light and dark. It names no Role: the
// terminal owns the background, and this pair exists only so palette_test.go can measure every
// role's contrast against it.
var groundHex = struct{ light, dark string }{"#fdfbf9", "#221f1a"}

// Theme resolves a role to a style for one background and one colour profile, and carries both
// glyph tiers a body chooses between. It is the seam the 2.0 HUD imports unchanged: NewTheme
// takes exactly a background and a profile, never a third parameter, because Profile alone does
// not encode which glyph tier to draw (ProfileNoColor is not the same axis as ASCII); the tier
// lives on GlyphSet instead, and render.Render picks a side by reading RenderInput.ASCII, which
// profile.go's detector alone fills.
type Theme struct {
	dark     bool
	profile  Profile
	GlyphSet GlyphSet
}

// NewTheme returns the theme for a background and a colour profile. It reads nothing else:
// profile_test.go asserts the signature and glyph_test.go asserts GlyphSet carries both tiers.
func NewTheme(dark bool, p Profile) Theme {
	return Theme{
		dark:     dark,
		profile:  p,
		GlyphSet: GlyphSet{Unicode: unicodeGlyphs, ASCII: asciiGlyphs},
	}
}

// color resolves role through lipgloss's own light/dark and per-profile seams, so the value a
// terminal receives is named at every rung (criterion 6's ANSI256 rung included) rather than
// nearest-matched down from 24 bits. The ANSI-16 argument is only ever selected when Style has
// already confirmed role carries an explicit slot (criterion 5), so an empty slot never reaches a
// terminal even though the zero value still has to type-check here.
func (t Theme) color(role Role) color.Color {
	v := warmStone[role]
	ld := lipgloss.LightDark(t.dark)
	ansi16 := lipgloss.Color(v.ansi16)
	return lipgloss.Complete(t.profile.colorprofile())(
		ld(ansi16, ansi16),
		ld(lipgloss.Color(v.light256), lipgloss.Color(v.dark256)),
		ld(lipgloss.Color(v.lightHex), lipgloss.Color(v.darkHex)),
	)
}

// Style returns role's style: the zero style at ProfileNoColor, so a body that leans on colour
// alone fails visibly rather than in production; a foreground with no explicit colour at
// ProfileANSI16 for RoleText and RoleMuted, the terminal's own default; and role's resolved
// colour at every other rung. Style and Sized are the only two ways to get a lipgloss.Style from
// this package (purity_test.go's grep test forbids a raw lipgloss setter outside this file).
func (t Theme) Style(role Role) lipgloss.Style {
	s := lipgloss.NewStyle()
	if t.profile == ProfileNoColor {
		return s
	}
	if t.profile == ProfileANSI16 && warmStone[role].ansi16 == "" {
		return s
	}
	return s.Foreground(t.color(role))
}

// Strong returns role's style at bold weight, for the two things a frame emphasizes: the verdict
// word and the subject it names. It is a Theme method rather than a setter a body chains, which
// is what keeps criterion 8's rule (Style and Sized are the only ways out of here) intact.
//
// At ProfileNoColor it returns the zero style unchanged, bold included: that rung is what
// NO_COLOR, --color=never, and a plain pipe all resolve to, and its readers (a cron mail, a CI
// log, an agent) get no escape bytes at all, not merely no colour.
func (t Theme) Strong(role Role) lipgloss.Style {
	if t.profile == ProfileNoColor {
		return t.Style(role)
	}
	return t.Style(role).Bold(true)
}

// SizedStrong returns Strong's style constrained to a fixed-width cell, the pairing a bold
// column field needs.
func (t Theme) SizedStrong(role Role, w int) lipgloss.Style {
	if w < 0 {
		w = 0
	}
	return t.Strong(role).Width(w).MaxWidth(w)
}

// Link returns role's style carrying url as an OSC 8 hyperlink. A terminal that understands the
// sequence makes the text clickable and one that does not prints the text unchanged, which is why
// every caller passes the URL itself as the text: the two terminals then show the same
// destination. Callers gate this on the colour profile, since a pipe has no use for the sequence.
func (t Theme) Link(role Role, url string) lipgloss.Style {
	return t.Style(role).Hyperlink(url)
}

// Sized returns role's style constrained to a fixed-width cell: Width(w).MaxWidth(w), the
// construction go-conventions names for this package and Task 20b's bodies (padding inside the
// styled block, cut at the same width, so a selected row can later take a full-width ground).
func (t Theme) Sized(role Role, w int) lipgloss.Style {
	if w < 0 {
		w = 0
	}
	return t.Style(role).Width(w).MaxWidth(w)
}
