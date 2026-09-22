package render

import "testing"

// eachGlyphPair walks the eight state and structural fields glyph.go's tables share, in the
// fixed order measurements.txt records them. Ellipsis is deliberately absent: the Unicode
// ellipsis is one character and the ASCII form is three periods (criterion 10), so the two can
// never be cell-width-equal, and criterion 11's parity rule is about a degrade substitution never
// shifting a column budget, which only the state and structural marks stand in a column for.
func eachGlyphPair(t *testing.T, f func(t *testing.T, field string, u, a string)) {
	t.Helper()
	pairs := []struct {
		field string
		u, a  string
	}{
		{"Pass", unicodeGlyphs.Pass, asciiGlyphs.Pass},
		{"Fail", unicodeGlyphs.Fail, asciiGlyphs.Fail},
		{"FailWarn", unicodeGlyphs.FailWarn, asciiGlyphs.FailWarn},
		{"Skip", unicodeGlyphs.Skip, asciiGlyphs.Skip},
		{"Held", unicodeGlyphs.Held, asciiGlyphs.Held},
		{"Arrow", unicodeGlyphs.Arrow, asciiGlyphs.Arrow},
		{"Rule", unicodeGlyphs.Rule, asciiGlyphs.Rule},
		{"Sep", unicodeGlyphs.Sep, asciiGlyphs.Sep},
	}
	for _, p := range pairs {
		f(t, p.field, p.u, p.a)
	}
}

// TestGlyphWidthParity is criterion 11: every ASCII glyph is exactly as wide, in cells, as its
// Unicode counterpart, so a degrade substitution never shifts a column budget.
func TestGlyphWidthParity(t *testing.T) {
	th := NewTheme(true, ProfileTrueColor)
	eachGlyphPair(t, func(t *testing.T, field, u, a string) {
		uw, aw := th.Width(u), th.Width(a)
		if uw != aw {
			t.Errorf("%s: unicode %q is %d cells, ascii %q is %d cells", field, u, uw, a, aw)
		}
	})
}

// TestEllipsisIsNeverATilde is criterion 10's own named regression: a tilde reads as vi filler
// and collides with the rule glyph.
func TestEllipsisIsNeverATilde(t *testing.T) {
	if unicodeGlyphs.Ellipsis == "~" || asciiGlyphs.Ellipsis == "~" {
		t.Fatal("ellipsis is a tilde")
	}
	if asciiGlyphs.Ellipsis != "..." {
		t.Errorf("ASCII ellipsis = %q, want \"...\"", asciiGlyphs.Ellipsis)
	}
}

// TestAmbiguousRunesMatchMeasurements is criterion 12: every Unicode glyph in the set except '?'
// is East Asian Width=Ambiguous, per docs/design/render-reference/measurements.txt.
func TestAmbiguousRunesMatchMeasurements(t *testing.T) {
	ambiguous := map[rune]bool{
		'●': true, '■': true, '□': true, '?': false,
		'○': true, '→': true, '─': true, '·': true, '…': true,
	}
	for r, want := range ambiguous {
		if got := ambiguousRunes[r]; got != want {
			t.Errorf("ambiguousRunes[%q] = %v, want %v", r, got, want)
		}
	}
	if len(ambiguousRunes) != 8 {
		t.Errorf("len(ambiguousRunes) = %d, want 8 (every glyph but '?')", len(ambiguousRunes))
	}
}
