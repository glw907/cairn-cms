package render

import (
	"github.com/charmbracelet/x/ansi"
	"github.com/clipperhouse/displaywidth"
)

// The named width rungs (docs/design/render-reference/measurements.txt). A terminal narrower than
// WidthNarrow drops to a single column; content stops growing at WidthCap and a wider terminal
// keeps its unused margin rather than receiving a stretched layout. Left alignment holds at every
// width: a centred block would float away from the prompt on a maximized terminal and bake its
// padding into a piped file. These are behavioural thresholds a body reads, never a snap: the
// requested width is honoured exactly at every value between them (width_test.go).
const (
	// WidthFloor is the narrowest width a frame ever composes into.
	WidthFloor = 40
	// WidthNarrow is the threshold below which a body drops to a single column.
	WidthNarrow = 60
	// Width80 is the rung at which a many-site body's columns settle.
	Width80 = 80
	// Width100 is the rung at which a fix line's condition id moves to trail the URL line rather
	// than taking its own.
	Width100 = 100
	// WidthCap is the widest a frame ever composes into. Content stops growing here; a wider
	// terminal's remainder is left empty.
	WidthCap = 120
)

// content clamps w to the range a frame composes into: never wider than WidthCap, never
// narrower than one cell.
func content(w int) int {
	switch {
	case w > WidthCap:
		return WidthCap
	case w < 1:
		return 1
	default:
		return w
	}
}

// widthTable is one East Asian Width reading of the Unicode width data, the two a Theme
// measures under. It is a value a Theme carries rather than a package-level setting, so two
// frames at two tiers can be composed in one process without either one moving the other's
// arithmetic; x/ansi's own tables are the counter-example, switched once at init from
// RUNEWIDTH_EASTASIAN and shared by every caller in the binary.
type widthTable int

const (
	// tableNarrow reads East Asian Width=Ambiguous as one cell, which is what nearly every
	// terminal does and what the Unicode glyph tier assumes.
	tableNarrow widthTable = iota
	// tableWide reads Ambiguous as two cells, the reading a terminal configured for a CJK locale
	// takes. The ASCII tier measures under it: that tier is what such a terminal is given, and
	// budgeting the wider of the two readings is what keeps arbitrary site content inside a fixed
	// column there.
	tableWide
)

// options returns the displaywidth settings w measures with. Escape handling is left off and
// ansi.Strip does that job instead (measure), since x/ansi's parser is the one this package
// already composes its escapes with.
func (w widthTable) options() displaywidth.Options {
	return displaywidth.Options{EastAsianWidth: w == tableWide}
}

// measure returns s in cells under w, escape sequences discounted.
func (w widthTable) measure(s string) int {
	return w.options().String(ansi.Strip(s))
}

// Width measures s in the cells a layout budgets, under the width table the Theme's own tier
// chose: Ambiguous=narrow for the Unicode tier, Ambiguous=wide for the ASCII tier. Every glyph in
// render's own glyph set is exactly one cell under the narrow table (glyph_test.go's parity
// test), and the ASCII tier's glyphs are plain ASCII and exact under both.
func (t Theme) Width(s string) int {
	return t.widths.measure(s)
}

// Clamp cuts s to width cells, measured by Width, never longer. It is the last thing a dynamic
// string passes through before it reaches a fixed-width field: a line the layout composed is
// already within budget, so Clamp only ever fires on data a site handed us. A width below 1 is
// treated as 1, so a degenerate width never panics and never returns text wider than requested.
func (t Theme) Clamp(s string, width int) string {
	if width < 1 {
		width = 1
	}
	if t.Width(s) <= width {
		return s
	}
	for n := width; n > 0; n-- {
		cut := ansi.Truncate(s, n, "")
		if t.Width(cut) <= width {
			return cut
		}
	}
	return ""
}

// Rule returns a horizontal rule of n cells in the tier's own rule glyph. A negative or zero n
// returns the empty string, so a degenerate width never panics.
func (t Theme) Rule(ascii bool, n int) string {
	if n <= 0 {
		return ""
	}
	g := t.GlyphSet.Unicode.Rule
	if ascii {
		g = t.GlyphSet.ASCII.Rule
	}
	out := make([]byte, 0, n*len(g))
	for range n {
		out = append(out, g...)
	}
	return string(out)
}
