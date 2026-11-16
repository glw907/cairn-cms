package newview

import (
	"image/color"
	"testing"

	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"

	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

func sameColor(a, b color.Color) bool {
	ar, ag, ab, aa := a.RGBA()
	br, bg, bb, ba := b.RGBA()
	return ar == br && ag == bg && ab == bb && aa == ba
}

// TestStylesMapEachFieldToItsRole pins which role each named style paints in. Text and Title
// paint in style.RoleInstallerText, the installer's own ink. The hex values themselves are style's
// to test.
func TestStylesMapEachFieldToItsRole(t *testing.T) {
	tests := []struct {
		name string
		get  func(Styles) lipgloss.Style
		role Role
	}{
		{"text", func(s Styles) lipgloss.Style { return s.Text }, style.RoleInstallerText},
		{"muted", func(s Styles) lipgloss.Style { return s.Muted }, RoleMuted},
		{"subtle", func(s Styles) lipgloss.Style { return s.Subtle }, RoleSubtle},
		{"ok", func(s Styles) lipgloss.Style { return s.OK }, RoleOK},
		{"failing", func(s Styles) lipgloss.Style { return s.Failing }, RoleFailing},
		{"warn", func(s Styles) lipgloss.Style { return s.Warn }, RoleUnknown},
		{"accent", func(s Styles) lipgloss.Style { return s.Accent }, RoleAccent},
		{"rule", func(s Styles) lipgloss.Style { return s.Rule }, RoleRule},
		{"title", func(s Styles) lipgloss.Style { return s.Title }, style.RoleInstallerText},
		{"accent strong", func(s Styles) lipgloss.Style { return s.AccentStrong }, RoleAccent},
	}
	for _, dark := range []bool{false, true} {
		th := style.NewTheme(dark, colorprofile.TrueColor, false)
		s := NewStyles(dark, colorprofile.TrueColor)
		for _, tt := range tests {
			if got, want := tt.get(s).GetForeground(), th.Color(tt.role); !sameColor(got, want) {
				t.Errorf("dark=%v %s: foreground = %v, want %v", dark, tt.name, got, want)
			}
		}
	}
}

func TestStrongRolesAreBold(t *testing.T) {
	s := NewStyles(true, colorprofile.TrueColor)
	if !s.Title.GetBold() || !s.Key.GetBold() || !s.AccentStrong.GetBold() {
		t.Error("Title, Key and AccentStrong must be bold")
	}
	if s.Text.GetBold() || s.Muted.GetBold() {
		t.Error("regular roles must not be bold")
	}
}

func TestNoColorStylesAreBare(t *testing.T) {
	s := NewStyles(true, colorprofile.NoTTY)
	if s.Title.GetBold() {
		t.Error("Title is bold at no colour; a pipe must get no escape bytes")
	}
	if _, ok := s.Failing.GetForeground().(lipgloss.NoColor); !ok {
		t.Errorf("Failing foreground = %v at no colour, want NoColor", s.Failing.GetForeground())
	}
}

func TestANSI16FallsBackToTheTerminalForegroundWithoutASlot(t *testing.T) {
	s := NewStyles(true, colorprofile.ANSI)
	if _, ok := s.Text.GetForeground().(lipgloss.NoColor); !ok {
		t.Errorf("Text foreground = %v at ANSI-16, want NoColor (no slot)", s.Text.GetForeground())
	}
	if _, ok := s.Failing.GetForeground().(lipgloss.NoColor); ok {
		t.Error("Failing has ANSI-16 slot 1 and must keep a colour")
	}
}

func TestHuhThemeExistsForLightAndDark(t *testing.T) {
	th := HuhTheme(NewStyles(true, colorprofile.TrueColor))
	for _, dark := range []bool{true, false} {
		ref := style.NewTheme(dark, colorprofile.TrueColor, false)
		text, fail := ref.Color(style.RoleInstallerText), ref.Color(RoleFailing)
		hs := th.Theme(dark)
		f := hs.Focused
		if !f.Title.GetBold() || !sameColor(f.Title.GetForeground(), text) {
			t.Errorf("dark=%v: title bold=%v fg=%v, want bold %v", dark, f.Title.GetBold(), f.Title.GetForeground(), text)
		}
		if !sameColor(f.ErrorMessage.GetForeground(), fail) {
			t.Errorf("dark=%v: error fg = %v, want %v", dark, f.ErrorMessage.GetForeground(), fail)
		}
		if got := f.SelectSelector.Value(); got != "> " {
			t.Errorf("dark=%v: selector = %q, want %q", dark, got, "> ")
		}
		if hs.Blurred.Title.GetBold() != f.Title.GetBold() {
			t.Errorf("dark=%v: blurred styles diverge from focused", dark)
		}
	}
}

func TestGlyphTiersAreOneCellWide(t *testing.T) {
	for _, ascii := range []bool{false, true} {
		g := GlyphsFor(ascii)
		for _, m := range []string{g.Pass, g.Fail, g.Pending, g.Sep} {
			if w := lipgloss.Width(m); w != 1 {
				t.Errorf("ascii=%v: mark %q is %d cells, want 1", ascii, m, w)
			}
		}
	}
}
