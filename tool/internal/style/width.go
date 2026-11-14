package style

import (
	"strings"

	"github.com/charmbracelet/x/ansi"
	"github.com/clipperhouse/displaywidth"
)

// DefaultWidth is the width a command composes into when the terminal reports none.
const DefaultWidth = 80

// widthCap is the widest a frame ever composes into. Content stops growing here; a wider
// terminal's remainder is left empty, and left alignment holds at every width.
const widthCap = 120

// ContentWidth clamps w to the range a frame composes into: never wider than widthCap, never
// narrower than one cell.
func ContentWidth(w int) int {
	return min(max(w, 1), widthCap)
}

// widthTable is one East Asian Width reading of the Unicode width data. It is a value a Theme
// carries rather than a package-level setting, so two frames at two tiers can be composed in one
// process without either one moving the other's arithmetic; x/ansi's tables are the
// counter-example, switched once at init from RUNEWIDTH_EASTASIAN and shared by every caller.
type widthTable int

const (
	// tableNarrow reads East Asian Width=Ambiguous as one cell, which is what nearly every
	// terminal does and what the Unicode tier assumes.
	tableNarrow widthTable = iota
	// tableWide reads Ambiguous as two cells, the reading a terminal configured for a CJK locale
	// takes. The ASCII tier measures under it: that tier is what such a terminal is given, and
	// budgeting the wider of the two readings keeps arbitrary site content inside a fixed column.
	tableWide
)

// options returns the displaywidth settings w measures with. Escape handling is left off and
// ansi.Strip does that job instead (measure), since x/ansi's parser is the one callers compose
// their escapes with.
func (w widthTable) options() displaywidth.Options {
	return displaywidth.Options{EastAsianWidth: w == tableWide}
}

// measure returns s in cells under w, escape sequences discounted.
func (w widthTable) measure(s string) int {
	return w.options().String(ansi.Strip(s))
}

// Width measures s in the cells a layout budgets, escape sequences discounted, under the width
// table NewTheme chose.
func (t Theme) Width(s string) int {
	return t.widths.measure(s)
}

// WrapGreedy word-wraps text to width, clamped to the range a frame composes into, and returns
// the lines, never cutting a word that carries meaning. A single token longer than width is
// hard-wrapped rather than truncated, since the tokens that overflow are URLs and domains, where
// the tail is the part that identifies it.
//
// The break is the space and nothing else. A library word wrap also breaks after a hyphen, which
// turns an ISO date into two numbers and a stray dash.
func (t Theme) WrapGreedy(text string, width int) []string {
	return t.wrap(text, ContentWidth(width))
}

// Wrap is WrapGreedy with one more rule: when the last line is a single word, it pulls one word
// down from the line above, so a sentence never ends on a stray verb sitting alone. It gives up
// where the line above has nothing to spare, which is the one shape where an orphan is the honest
// result: a single token wider than the width has nowhere else to go.
func (t Theme) Wrap(text string, width int) []string {
	width = ContentWidth(width)
	lines := t.wrap(text, width)
	if len(lines) < 2 {
		return lines
	}
	last := len(lines) - 1
	if len(strings.Fields(lines[last])) != 1 {
		return lines
	}
	words := strings.Fields(lines[last-1])
	if len(words) < 2 {
		return lines
	}
	moved := words[len(words)-1]
	if t.Width(moved)+1+t.Width(lines[last]) > width {
		return lines
	}
	lines[last-1] = strings.Join(words[:len(words)-1], " ")
	lines[last] = moved + " " + lines[last]
	return lines
}

// wrap is the greedy wrap at an already-clamped width.
func (t Theme) wrap(text string, width int) []string {
	width = max(width, 1)
	if text == "" {
		return nil
	}
	var out []string
	cur := ""
	for i, tok := range strings.Split(text, " ") {
		sep := ""
		if i > 0 && cur != "" {
			sep = " "
		}
		if cur != "" && t.Width(cur)+t.Width(sep)+t.Width(tok) > width {
			out = append(out, strings.TrimRight(cur, " "))
			cur, sep = "", ""
		}
		for t.Width(tok) > width {
			head, tail := t.cutAt(tok, width)
			out = append(out, head)
			tok = tail
		}
		cur += sep + tok
	}
	if cur != "" {
		out = append(out, strings.TrimRight(cur, " "))
	}
	return out
}

// cutAt splits s after width cells, returning the head and the remainder. It walks runes rather
// than bytes so a multi-byte or double-width rune is never split down the middle.
func (t Theme) cutAt(s string, width int) (head, tail string) {
	n := 0
	for i, r := range s {
		rw := t.Width(string(r))
		if n+rw > width && i > 0 {
			return s[:i], s[i:]
		}
		n += rw
	}
	return s, ""
}
