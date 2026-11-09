package newview

import (
	"slices"
	"strings"

	"charm.land/bubbles/v2/help"
	"charm.land/bubbles/v2/key"
	"github.com/charmbracelet/x/ansi"
)

// Footer renders key hints through bubbles help at the margin: a bold key, a muted verb, and a
// muted separator glyph between hints. It holds hints only; an explanation belongs in a block.
// Hints that do not fit the measure on one line break between hints onto the next, so a hint is
// never split and the footer never reaches the window's right edge.
func (g Grid) Footer(bs ...key.Binding) string {
	h := help.New()
	h.ShortSeparator = " " + g.Glyphs.Sep + " "
	h.Styles.ShortKey = g.Styles.Key
	h.Styles.ShortDesc = g.Styles.Muted
	h.Styles.ShortSeparator = g.Styles.Muted

	var lines []string
	var line []key.Binding
	for _, b := range bs {
		next := append(slices.Clone(line), b)
		if len(line) > 0 && ansi.StringWidth(h.ShortHelpView(next)) > g.ContentWidth() {
			lines = append(lines, margin+h.ShortHelpView(line))
			line = []key.Binding{b}
			continue
		}
		line = next
	}
	lines = append(lines, margin+h.ShortHelpView(line))
	return strings.Join(lines, "\n")
}
