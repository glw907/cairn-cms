package newview

import (
	"image/color"

	"charm.land/huh/v2"
	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// Role is a semantic ink role, the table internal/style carries. The view paints through a role
// and never writes a colour value.
type Role = style.Role

// The Warm Stone roles.
const (
	RoleText    = style.RoleText
	RoleMuted   = style.RoleMuted
	RoleSubtle  = style.RoleSubtle
	RoleOK      = style.RoleOK
	RoleFailing = style.RoleFailing
	RoleUnknown = style.RoleUnknown
	RoleAccent  = style.RoleAccent
	RoleRule    = style.RoleRule
)

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
	theme   style.Theme
}

// NewStyles resolves every role for a background and a colour profile. At no colour the styles
// carry no colour and no weight, so a pipe or NO_COLOR reader gets no escape bytes.
func NewStyles(dark bool, p colorprofile.Profile) Styles {
	s := Styles{Dark: dark, profile: p, theme: style.NewTheme(dark, p, false)}
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
func (s Styles) NoColor() bool { return style.NoColor(s.profile) }

// Fg returns the role's colour, or lipgloss.NoColor where the role falls back to the terminal's
// own foreground: no colour at all, or an ANSI-16 terminal and a role with no slot.
func (s Styles) Fg(r Role) color.Color { return s.theme.Color(installerInk(r)) }

// Style returns the role at regular weight.
func (s Styles) Style(r Role) lipgloss.Style { return s.theme.Style(installerInk(r)) }

// Strong returns the role at bold weight, plain at no colour.
func (s Styles) Strong(r Role) lipgloss.Style { return s.theme.Strong(installerInk(r)) }

// Link returns the role carrying url as an OSC 8 hyperlink, plain at no colour. Callers pass
// the URL itself as the text where it fits, so a terminal without OSC 8 still shows it.
func (s Styles) Link(r Role, url string) lipgloss.Style { return s.theme.Link(installerInk(r), url) }

// installerInk keeps the installer's body text in its own warm ink: the CLI's RoleText takes the
// terminal's foreground, and every view paint resolves a role here, so mapping it at this one
// point leaves each call site's RoleText as it is.
func installerInk(r Role) Role {
	if r == RoleText {
		return style.RoleInstallerText
	}
	return r
}

// Glyphs is one tier of marks. Every mark is one cell wide, followed by exactly one space.
type Glyphs struct {
	Pass, Fail, Pending, Sep, Ellipsis string
	// Arrows is the up and down key label in a footer hint.
	Arrows string
}

// GlyphsFor returns the Unicode tier, or the ASCII tier for a terminal that cannot show it.
func GlyphsFor(ascii bool) Glyphs {
	m := style.MarksFor(ascii)
	g := Glyphs{Pass: m.Pass, Fail: m.Failing, Pending: m.NotStarted, Sep: m.Sep, Ellipsis: m.Ellipsis, Arrows: "↑↓"}
	if ascii {
		g.Arrows = "Up/Down"
	}
	return g
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
