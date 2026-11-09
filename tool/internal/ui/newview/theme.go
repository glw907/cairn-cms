package newview

import (
	"image/color"

	"charm.land/huh/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"
)

// Role is a semantic ink role. The view paints through a role and never writes a colour
// value outside this file.
type Role int

// The Warm Stone roles, the same table internal/render carries.
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

// ink carries one role at every rung a terminal offers: a hex pair for TrueColor, an xterm-256
// pair, and one ANSI-16 slot. An empty slot means the terminal's own foreground, because slot 8
// is the background on Solarized Dark and faint text measures under 2:1 on common themes.
type ink struct {
	lightHex, darkHex string
	light256, dark256 string
	ansi16            string
}

// warmStone repeats internal/render's table value for value. render keeps its own copy
// unexported, and exporting it would widen a surface that package pins by name.
var warmStone = map[Role]ink{
	RoleText:    {"#28231d", "#eae7e3", "235", "255", ""},
	RoleMuted:   {"#615d57", "#a8a49e", "243", "246", ""},
	RoleSubtle:  {"#504c47", "#c1bdb8", "240", "250", "7"},
	RoleOK:      {"#197037", "#7ccd8e", "28", "114", "2"},
	RoleFailing: {"#b71824", "#ff8e86", "160", "210", "1"},
	RoleUnknown: {"#915200", "#f7ac4d", "130", "215", "3"},
	RoleAccent:  {"#7246cf", "#9d84ec", "97", "141", "5"},
	RoleRule:    {"#c9c3bb", "#4a443b", "251", "238", "8"},
}

// Styles is the view's palette, resolved once for one background and one colour profile. The
// root builds it at start and passes it to components; nothing recomputes it per frame.
type Styles struct {
	// Dark reports the background the roles were resolved for.
	Dark bool

	// Text, Muted, Subtle, OK, Failing, Warn, Accent and Rule are the roles at regular weight.
	Text, Muted, Subtle, OK, Failing, Warn, Accent, Rule lipgloss.Style
	// Title is Text at bold weight; Key is the same, for key hints.
	Title, Key lipgloss.Style
	// AccentStrong is Accent at bold weight, for the select cursor.
	AccentStrong lipgloss.Style

	profile colorprofile.Profile
}

// NewStyles resolves every role for a background and a colour profile. At NoTTY and Ascii the
// styles carry no colour and no weight, so a pipe or NO_COLOR reader gets no escape bytes.
func NewStyles(dark bool, p colorprofile.Profile) Styles {
	s := Styles{Dark: dark, profile: p}
	s.Text = s.Style(RoleText)
	s.Muted = s.Style(RoleMuted)
	s.Subtle = s.Style(RoleSubtle)
	s.OK = s.Style(RoleOK)
	s.Failing = s.Style(RoleFailing)
	s.Warn = s.Style(RoleUnknown)
	s.Accent = s.Style(RoleAccent)
	s.Rule = s.Style(RoleRule)
	s.Title = s.Strong(RoleText)
	s.Key = s.Title
	s.AccentStrong = s.Strong(RoleAccent)
	return s
}

// NoColor reports whether the profile carries no colour at all.
func (s Styles) NoColor() bool {
	return s.profile == colorprofile.NoTTY || s.profile == colorprofile.Ascii
}

func (s Styles) color(r Role) color.Color {
	v := warmStone[r]
	ld := lipgloss.LightDark(s.Dark)
	c16 := lipgloss.Color(v.ansi16)
	return lipgloss.Complete(s.profile)(
		ld(c16, c16),
		ld(lipgloss.Color(v.light256), lipgloss.Color(v.dark256)),
		ld(lipgloss.Color(v.lightHex), lipgloss.Color(v.darkHex)),
	)
}

// Fg returns the role's colour, or NoColor where the role falls back to the terminal's own
// foreground: no colour at all, or an ANSI-16 terminal and a role with no slot.
func (s Styles) Fg(r Role) color.Color {
	if s.NoColor() || (s.profile == colorprofile.ANSI && warmStone[r].ansi16 == "") {
		return lipgloss.NoColor{}
	}
	return s.color(r)
}

// Style returns the role at regular weight.
func (s Styles) Style(r Role) lipgloss.Style {
	return lipgloss.NewStyle().Foreground(s.Fg(r))
}

// Strong returns the role at bold weight, plain at no colour.
func (s Styles) Strong(r Role) lipgloss.Style {
	if s.NoColor() {
		return lipgloss.NewStyle()
	}
	return s.Style(r).Bold(true)
}

// Link returns the role carrying url as an OSC 8 hyperlink, plain at no colour. Callers pass
// the URL itself as the text where it fits, so a terminal without OSC 8 still shows it.
func (s Styles) Link(r Role, url string) lipgloss.Style {
	if s.NoColor() {
		return lipgloss.NewStyle()
	}
	return s.Style(r).Hyperlink(url)
}

// Glyphs is one tier of marks. Every mark is one cell wide, followed by exactly one space.
type Glyphs struct {
	Pass, Fail, Pending, Sep, Ellipsis string
	// Arrows is the up and down key label in a footer hint.
	Arrows string
}

// GlyphsFor returns the Unicode tier, or the ASCII tier for a terminal that cannot show it.
func GlyphsFor(ascii bool) Glyphs {
	if ascii {
		return Glyphs{Pass: "+", Fail: "!", Pending: "o", Sep: "-", Ellipsis: "...", Arrows: "Up/Down"}
	}
	return Glyphs{Pass: "●", Fail: "■", Pending: "○", Sep: "·", Ellipsis: "…", Arrows: "↑↓"}
}

// HuhTheme is the Warm Stone huh theme. Huh asks for the light or the dark variant when it
// renders, so the palette is resolved for the background it names, at the profile s carries.
// Every form holds one field, so the focus bar marks nothing and is left off, and the blurred
// styles never show.
func HuhTheme(s Styles) huh.Theme {
	return huh.ThemeFunc(func(isDark bool) *huh.Styles {
		p := NewStyles(isDark, s.profile)
		hs := huh.ThemeBase(isDark)
		f := &hs.Focused
		f.Base = lipgloss.NewStyle()
		f.Card = f.Base
		f.Title = p.Title
		f.Description = p.Muted
		f.ErrorIndicator = lipgloss.NewStyle()
		f.ErrorMessage = p.Failing
		f.SelectSelector = p.AccentStrong.SetString("> ")
		f.Option = p.Muted
		f.SelectedOption = p.Title
		f.UnselectedOption = p.Muted
		f.TextInput.Prompt = p.Accent
		f.TextInput.Text = p.Text
		f.TextInput.Cursor = p.Accent
		f.TextInput.Placeholder = p.Muted
		hs.Blurred = hs.Focused
		return hs
	})
}
