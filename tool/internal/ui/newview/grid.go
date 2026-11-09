package newview

import (
	"strings"

	"charm.land/lipgloss/v2"
	"github.com/charmbracelet/x/ansi"
)

// The layout grid, counted from column 0. Content starts at ColMargin; list text and an item's
// detail start at ColList; a label grid's values, and every line a value wraps onto, start at
// ColValue, two columns past the longest label in use ("Invite an editor", 16 wide). A label
// cell is LabelWidth wide, so ColValue is ColMargin plus LabelWidth.
const (
	ColMargin  = 2
	ColList    = 4
	LabelWidth = 18
	ColValue   = ColMargin + LabelWidth

	// MaxMeasure caps a paragraph's width; the floor keeps a narrow window from wrapping to nothing.
	MaxMeasure = 76
	minMeasure = 20
)

var (
	margin  = strings.Repeat(" ", ColMargin)
	listPad = strings.Repeat(" ", ColList)
	valPad  = strings.Repeat(" ", ColValue)
)

// Grid lays blocks out for one window width: it holds the palette, the glyph tier, and the
// width every wrap measures against.
type Grid struct {
	Styles Styles
	Glyphs Glyphs
	// Width is the window width in cells.
	Width int
}

// ContentWidth is the measure paragraphs wrap to: the window width minus 4, capped at 76.
func (g Grid) ContentWidth() int {
	return max(min(g.Width-4, MaxMeasure), minMeasure)
}

// ValueWidth is the room a label grid value has before the right edge of the measure.
func (g Grid) ValueWidth() int { return g.ContentWidth() - LabelWidth }

// Frame stacks blocks under one leading blank line, with exactly one blank line between
// blocks. An empty block is dropped, so a block that does not apply needs no special case.
func Frame(blocks ...string) string {
	kept := make([]string, 0, len(blocks))
	for _, b := range blocks {
		if b != "" {
			kept = append(kept, b)
		}
	}
	return "\n" + strings.Join(kept, "\n\n")
}

// Wrap breaks text to w cells at spaces only; Hardwrap catches a token longer than the line.
// Wordwrap also breaks after a hyphen, which splits words like "sign-in", so hyphens ride
// through as non-breaking hyphens.
func Wrap(s string, w int) []string {
	s = strings.ReplaceAll(s, "-", "‑")
	out := ansi.Hardwrap(ansi.Wordwrap(s, w, ""), w, true)
	return strings.Split(strings.ReplaceAll(out, "‑", "-"), "\n")
}

// Balance wraps prose like CSS text-wrap: balance. It keeps the line count that wrapping at w
// gives, at the narrowest width that still gives it, so no line ends up a lone word.
func Balance(s string, w int) []string {
	ls := Wrap(s, w)
	if len(ls) < 2 {
		return ls
	}
	for n := w - 1; n > 0; n-- {
		next := Wrap(s, n)
		if len(next) != len(ls) {
			break
		}
		ls = next
	}
	return ls
}

// lines balances text to w, styles each line, and prefixes it with pad.
func (g Grid) lines(r func(...string) string, text string, w int, pad string) string {
	ls := Balance(text, w)
	for i, l := range ls {
		ls[i] = pad + r(l)
	}
	return strings.Join(ls, "\n")
}

// Para is a paragraph at the margin, wrapped to the measure, in the role's style.
func (g Grid) Para(r Role, text string) string {
	return g.lines(g.Styles.Style(r).Render, text, g.ContentWidth(), margin)
}

// Title is a bold title at the margin.
func (g Grid) Title(s string) string { return margin + g.Styles.Title.Render(s) }

// Detail is the current item's sentence, muted, directly under the item at column 4, with the
// permission name in bold wherever it appears.
func (g Grid) Detail(text string) string {
	ls := g.emphasized(g.Styles.Muted, text, g.ContentWidth()-(ColList-ColMargin))
	for i, l := range ls {
		ls[i] = listPad + l
	}
	return strings.Join(ls, "\n")
}

// emphasized balances text to w and styles each line in ink, with the permission name the
// Cloudflare approval asks for in bold wherever it appears. The name's spaces do not break, so it
// never splits across two lines.
func (g Grid) emphasized(ink lipgloss.Style, text string, w int) []string {
	held := strings.ReplaceAll(permissionName, " ", " ")
	ls := Balance(strings.ReplaceAll(text, permissionName, held), w)
	for i, l := range ls {
		var sb strings.Builder
		for j, part := range strings.Split(l, held) {
			if j > 0 {
				sb.WriteString(g.Styles.Title.Render(permissionName))
			}
			if part != "" {
				sb.WriteString(ink.Render(part))
			}
		}
		ls[i] = sb.String()
	}
	return ls
}

// Mark is one row of a mark list: a one-cell mark at column 2, one space, text at column 4.
func Mark(glyph, text string) string { return margin + glyph + " " + text }

// Cell is one label grid row: the label at column 2, padded to LabelWidth in labelStyle, and
// the value lines from column 20. A value that wraps continues at column 20.
func (g Grid) Cell(label string, labelStyle lipgloss.Style, value ...string) string {
	out := make([]string, len(value))
	for i, v := range value {
		out[i] = valPad + v
		if i == 0 {
			out[i] = margin + labelStyle.Width(LabelWidth).Render(label) + v
		}
	}
	return strings.Join(out, "\n")
}

// WrapValue balances text to the value column's width and styles each line.
func (g Grid) WrapValue(r Role, text string) []string {
	ls := Balance(text, g.ValueWidth())
	st := g.Styles.Style(r)
	for i, l := range ls {
		ls[i] = st.Render(l)
	}
	return ls
}

// Pack sets styled items on lines no wider than w, a muted separator between items on a line.
func (g Grid) Pack(w int, items ...string) []string {
	sep := g.Styles.Muted.Render(" " + g.Glyphs.Sep + " ")
	var out []string
	cur := ""
	for _, it := range items {
		switch {
		case cur == "":
			cur = it
		case ansi.StringWidth(cur+sep+it) <= w:
			cur += sep + it
		default:
			out = append(out, cur)
			cur = it
		}
	}
	return append(out, cur)
}
