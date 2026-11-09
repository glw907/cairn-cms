package newview

import (
	"image/color"
	"testing"

	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/colorprofile"
)

func sameColor(a, b color.Color) bool {
	ar, ag, ab, aa := a.RGBA()
	br, bg, bb, ba := b.RGBA()
	return ar == br && ag == bg && ab == bb && aa == ba
}

func TestStylesResolveWarmStoneForBothBackgrounds(t *testing.T) {
	tests := []struct {
		name string
		dark bool
		get  func(Styles) lipgloss.Style
		want string
	}{
		{"light text", false, func(s Styles) lipgloss.Style { return s.Text }, "#28231d"},
		{"dark text", true, func(s Styles) lipgloss.Style { return s.Text }, "#eae7e3"},
		{"light muted", false, func(s Styles) lipgloss.Style { return s.Muted }, "#615d57"},
		{"dark muted", true, func(s Styles) lipgloss.Style { return s.Muted }, "#a8a49e"},
		{"light ok", false, func(s Styles) lipgloss.Style { return s.OK }, "#197037"},
		{"dark ok", true, func(s Styles) lipgloss.Style { return s.OK }, "#7ccd8e"},
		{"light failing", false, func(s Styles) lipgloss.Style { return s.Failing }, "#b71824"},
		{"dark failing", true, func(s Styles) lipgloss.Style { return s.Failing }, "#ff8e86"},
		{"light warn", false, func(s Styles) lipgloss.Style { return s.Warn }, "#915200"},
		{"dark accent", true, func(s Styles) lipgloss.Style { return s.Accent }, "#9d84ec"},
		{"light title", false, func(s Styles) lipgloss.Style { return s.Title }, "#28231d"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.get(NewStyles(tt.dark, colorprofile.TrueColor)).GetForeground()
			if !sameColor(got, lipgloss.Color(tt.want)) {
				t.Errorf("foreground = %v, want %s", got, tt.want)
			}
		})
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
	for _, tt := range []struct {
		dark       bool
		text, fail string
	}{
		{true, "#eae7e3", "#ff8e86"},
		{false, "#28231d", "#b71824"},
	} {
		hs := th.Theme(tt.dark)
		f := hs.Focused
		if !f.Title.GetBold() || !sameColor(f.Title.GetForeground(), lipgloss.Color(tt.text)) {
			t.Errorf("dark=%v: title bold=%v fg=%v, want bold %s", tt.dark, f.Title.GetBold(), f.Title.GetForeground(), tt.text)
		}
		if !sameColor(f.ErrorMessage.GetForeground(), lipgloss.Color(tt.fail)) {
			t.Errorf("dark=%v: error fg = %v, want %s", tt.dark, f.ErrorMessage.GetForeground(), tt.fail)
		}
		if got := f.SelectSelector.Value(); got != "> " {
			t.Errorf("dark=%v: selector = %q, want %q", tt.dark, got, "> ")
		}
		if hs.Blurred.Title.GetBold() != f.Title.GetBold() {
			t.Errorf("dark=%v: blurred styles diverge from focused", tt.dark)
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
