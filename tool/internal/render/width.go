package render

import "github.com/charmbracelet/x/ansi"

// The named width rungs. A terminal narrower than
// widthNarrow drops to a single column; content stops growing at style.ContentWidth's cap and a
// wider terminal keeps its unused margin rather than receiving a stretched layout. Left alignment
// holds at every width: a centred block would float away from the prompt on a maximized terminal
// and bake its padding into a piped file. These are behavioural thresholds a body reads, never a
// snap: the requested width is honoured exactly at every value between them (width_test.go).
const (
	// widthNarrow is the threshold below which a body drops to a single column.
	widthNarrow = 60
	// width100 is the rung at which a fix line's condition id moves to trail the URL line rather
	// than taking a line by itself.
	width100 = 100
)

// clamp cuts s to width cells, measured by Width, never longer. It is the last thing a dynamic
// string passes through before it reaches a fixed-width field: a line the layout composed is
// already within budget, so clamp only ever fires on data a site handed us. A width below 1 is
// treated as 1, so a degenerate width never panics and never returns text wider than requested.
func (t theme) clamp(s string, width int) string {
	width = max(width, 1)
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

// rule returns a horizontal rule of n cells in the tier's rule glyph. A negative or zero n
// returns the empty string, so a degenerate width never panics.
func (t theme) rule(n int) string {
	if n <= 0 {
		return ""
	}
	g := t.marks.Rule
	out := make([]byte, 0, n*len(g))
	for range n {
		out = append(out, g...)
	}
	return string(out)
}
