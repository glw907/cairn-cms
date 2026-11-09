package newview

import (
	"charm.land/bubbles/v2/help"
	"charm.land/bubbles/v2/key"
)

// Footer renders key hints through bubbles help at the margin: a bold key, a muted verb, and a
// muted separator glyph between hints. It holds hints only; an explanation belongs in a block.
func (g Grid) Footer(bs ...key.Binding) string {
	h := help.New()
	h.ShortSeparator = " " + g.Glyphs.Sep + " "
	h.Styles.ShortKey = g.Styles.Key
	h.Styles.ShortDesc = g.Styles.Muted
	h.Styles.ShortSeparator = g.Styles.Muted
	return margin + h.ShortHelpView(bs)
}
