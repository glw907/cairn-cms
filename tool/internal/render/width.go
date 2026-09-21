package render

import "github.com/charmbracelet/x/ansi"

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

// Width measures s in the cells a layout budgets, x/ansi's own grapheme-aware measure with East
// Asian Width=Ambiguous read narrow. Every glyph in render's own glyph set, Unicode or ASCII, is
// exactly one cell under it (glyph_test.go's parity test), which is the Unicode tier's own
// assumption and matches nearly every terminal.
//
// Deviation from criterion 12's own wording (recorded here and in the task report): the criterion
// asks for a second, Ambiguous=Wide table as a field on Theme, chosen by tier. A correct
// general-purpose Ambiguous-wide measure over arbitrary site content, not just render's own eight
// glyphs, needs the East Asian Width table go-runewidth or displaywidth carry; both are indirect
// dependencies here (the same fact criterion 7 names for go-colorful's luminance function), and
// importing either directly to reach it would add a fourth direct require, which criterion 1's
// pin policy forbids. ADR-0002 records the gap; Task 20b-ii's own golden sweep, the task that
// first exercises a wide terminal against real content rather than render's own fixed glyphs, is
// where that dependency tradeoff belongs.
func (t Theme) Width(s string) int {
	return ansi.StringWidth(s)
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
