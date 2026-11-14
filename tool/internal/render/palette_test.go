package render

import (
	"testing"

	"github.com/charmbracelet/colorprofile"
)

// TestThemeGlyphSetExposesBothTiers holds that theme.GlyphSet carries both glyph tiers, so a body
// can select between them by reading RenderInput.ASCII without the theme itself ever choosing.
func TestThemeGlyphSetExposesBothTiers(t *testing.T) {
	th := newTheme(true, colorprofile.TrueColor, false)
	if th.GlyphSet.Unicode.Pass != unicodeGlyphs.Pass {
		t.Error("theme.GlyphSet.Unicode is not the Unicode tier")
	}
	if th.GlyphSet.ASCII.Pass != asciiGlyphs.Pass {
		t.Error("theme.GlyphSet.ASCII is not the ASCII tier")
	}
}
