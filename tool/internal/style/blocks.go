package style

import (
	"strings"

	"charm.land/lipgloss/v2"
)

// The grid every print-and-exit block lays its lines on. Columns count cells from zero, so the
// margin is also the mark's column.
const (
	// margin is the cells left empty at the start of every line, and the column a mark sits at.
	margin = 2
	// nameCol is where a row's name starts, after the mark and one space.
	nameCol = 4
	// valueCol is where a row's value or detail starts when its name leaves room.
	valueCol = 20
	// tableNameMax caps a table's name column, which otherwise sizes to its longest name.
	tableNameMax = 32
	// tableGap separates two table columns.
	tableGap = 2
	// oneColumnBelow is the width under which a row drops to one column: its value moves under
	// its name, at nameCol.
	oneColumnBelow = 60
)

// marks returns the glyph tier the theme was built for. NewTheme's ascii flag picks the wide
// width table and the ASCII marks together, so the table identifies the tier.
func (t Theme) marks() Marks {
	return MarksFor(t.ascii())
}

// DetailColumn returns the column a mark row's detail, its continuation lines, and its fix line
// sit at: valueCol when name fits before it with a space to spare, and nameCol when name is
// longer than that or width is under the one-column threshold. A caller adding lines under a
// MarkRow passes this column so they line up with the row's detail.
func (t Theme) DetailColumn(name string, width int) int {
	if ContentWidth(width) < oneColumnBelow || nameCol+t.Width(name) >= valueCol {
		return nameCol
	}
	return valueCol
}

// VerdictLine is the block a report opens and closes with: the verdict word in role's ink and
// bold, the subject bold, and the tally muted. The tally takes lines of its own at the margin
// when the three do not fit on one, since a tally is a fact and is never cut.
func VerdictLine(t Theme, word string, role Role, subject, tally string, width int) []string {
	width = ContentWidth(width)
	pad := spaces(margin)
	head := pad + t.Strong(role).Render(word)
	used := margin + t.Width(word)
	if subject != "" {
		head += "  " + t.Strong(RoleText).Render(subject)
		used += 2 + t.Width(subject)
	}
	if tally == "" {
		return []string{head}
	}
	if used+2+t.Width(tally) <= width {
		return []string{head + "  " + t.Style(RoleMuted).Render(tally)}
	}
	return append([]string{head}, t.column(t.Style(RoleMuted), margin, tally, width)...)
}

// Title is a section title: bold, lowercased, at the margin, with no rule beside it. The section
// names are lowercase nouns, so the block lowercases what it is given rather than trusting each
// caller to.
func Title(t Theme, title string, width int) []string {
	return t.column(t.Strong(RoleText), margin, strings.ToLower(title), ContentWidth(width))
}

// MarkRow is one report row: mark in role's ink at the margin, name at nameCol, and detail in the
// subtle ink at DetailColumn. A name too long for the value column takes a line to itself, with
// the detail under it at nameCol; below the one-column threshold every row takes that shape. The
// detail wraps on its column and is never truncated.
func MarkRow(t Theme, mark string, role Role, name, detail string, width int) []string {
	width = ContentWidth(width)
	col := t.DetailColumn(name, width)
	lead := spaces(margin) + t.Style(role).Render(mark) + spaces(max(nameCol-margin-t.Width(mark), 1))
	head := lead + t.Style(RoleText).Render(name)
	body := t.WrapGreedy(detail, width-col)
	if col == nameCol || len(body) == 0 {
		return append([]string{head}, atCol(t.Style(RoleSubtle), col, body)...)
	}
	head += spaces(col-nameCol-t.Width(name)) + t.Style(RoleSubtle).Render(body[0])
	return append([]string{head}, atCol(t.Style(RoleSubtle), col, body[1:])...)
}

// LabelRow is a label and its value, with no mark: the label subtle at the margin and the value
// at valueCol. A label too long for the value column, or a width under the one-column
// threshold, puts the value under the label at nameCol.
func LabelRow(t Theme, label, value string, width int) []string {
	width = ContentWidth(width)
	head := spaces(margin) + t.Style(RoleSubtle).Render(label)
	if width < oneColumnBelow || margin+t.Width(label) >= valueCol {
		return append([]string{head}, t.column(t.Style(RoleText), nameCol, value, width)...)
	}
	body := t.WrapGreedy(value, width-valueCol)
	if len(body) == 0 {
		return []string{head}
	}
	head += spaces(valueCol-margin-t.Width(label)) + t.Style(RoleText).Render(body[0])
	return append([]string{head}, atCol(t.Style(RoleText), valueCol, body[1:])...)
}

// ContinuationLine is a further fact under a row, in role's ink, wrapped on col. Pass the row's
// DetailColumn so the line sits under the row's detail.
func ContinuationLine(t Theme, role Role, text string, col, width int) []string {
	return t.column(t.Style(role), col, text, ContentWidth(width))
}

// FixLine is the fix under the row it repairs: the fix mark in the accent ink two cells before
// col, the imperative text subtle and wrapped on col, then url on a line of its own at col in
// the DocLink style, an OSC 8 link where the profile carries colour. An empty url prints no second line, and an
// empty text prints nothing. A fix is never truncated. Pass the row's DetailColumn.
func FixLine(t Theme, text, url string, col, width int) []string {
	width = ContentWidth(width)
	col = max(col, nameCol)
	fix := t.marks().Fix
	lead := spaces(col-margin) + t.Style(RoleAccent).Render(fix) + spaces(max(margin-t.Width(fix), 1))
	body := t.WrapGreedy(text, width-col)
	if len(body) == 0 {
		return nil
	}
	out := append([]string{lead + t.Style(RoleSubtle).Render(body[0])}, atCol(t.Style(RoleSubtle), col, body[1:])...)
	if url == "" {
		return out
	}
	return append(out, t.column(t.DocLink(url), col, url, width)...)
}

// Table lays header and rows out in columns at the margin, the header muted. The first column is
// the name column: it sizes to its longest cell up to tableNameMax, and a longer name is cut with
// the ellipsis. Every other column sizes to its longest cell. Columns that do not fit width are
// dropped from the right, and the name column always stays.
func Table(t Theme, header []string, rows [][]string, width int) []string {
	width = ContentWidth(width)
	widths := make([]int, len(header))
	for _, r := range append([][]string{header}, rows...) {
		for i := range min(len(r), len(widths)) {
			widths[i] = max(widths[i], t.Width(r[i]))
		}
	}
	if len(widths) == 0 {
		return nil
	}
	widths[0] = min(widths[0], tableNameMax, width-margin)
	keep, used := 1, margin+widths[0]
	for keep < len(widths) && used+tableGap+widths[keep] <= width {
		used += tableGap + widths[keep]
		keep++
	}
	line := func(cells []string, role Role) string {
		var b strings.Builder
		b.WriteString(spaces(margin))
		for i := range keep {
			cell := ""
			if i < len(cells) {
				cell = cells[i]
			}
			if i == 0 {
				cell = t.truncate(cell, widths[0])
			}
			if i > 0 {
				b.WriteString(spaces(tableGap))
			}
			b.WriteString(t.Style(role).Render(cell) + spaces(widths[i]-t.Width(cell)))
		}
		return strings.TrimRight(b.String(), " ")
	}
	out := []string{line(header, RoleMuted)}
	for _, r := range rows {
		out = append(out, line(r, RoleText))
	}
	return out
}

// ProgressLine is the one line a run shows while it works: a spinner frame and text, both muted,
// at the margin, cut with the ellipsis to fit width. frame picks the spinner frame and wraps
// around, so a caller may pass a running count; the ASCII tier has one static frame.
func ProgressLine(t Theme, frame int, text string, width int) string {
	width = ContentWidth(width)
	spin := t.marks().Spinner
	if frames := []rune(spin); len(frames) > 1 && !t.ascii() {
		spin = string(frames[((frame%len(frames))+len(frames))%len(frames)])
	}
	lead := spaces(margin) + t.Style(RoleMuted).Render(spin) + " "
	room := width - margin - t.Width(spin) - 1
	return lead + t.Style(RoleMuted).Render(t.truncate(text, room))
}

// ErrorBlock is how an error reads on a terminal: the failing mark and what happened in bold, why
// muted under it at nameCol where there is a why, and the fix on the fix mark at the margin where
// there is one. An empty why or fix prints nothing for it.
func ErrorBlock(t Theme, what, why, fix string, width int) []string {
	width = ContentWidth(width)
	m := t.marks().Failing
	lead := spaces(margin) + t.Style(RoleFailing).Render(m) + spaces(max(nameCol-margin-t.Width(m), 1))
	body := t.WrapGreedy(what, width-nameCol)
	if len(body) == 0 {
		body = []string{""}
	}
	out := append([]string{lead + t.Strong(RoleText).Render(body[0])}, atCol(t.Strong(RoleText), nameCol, body[1:])...)
	out = append(out, t.column(t.Style(RoleMuted), nameCol, why, width)...)
	return append(out, FixLine(t, fix, "", nameCol, width)...)
}

// ascii reports whether the theme was built for the ASCII tier.
func (t Theme) ascii() bool {
	return t.widths == tableWide
}

// column wraps text on col and renders every line at col in st.
func (t Theme) column(st lipgloss.Style, col int, text string, width int) []string {
	return atCol(st, col, t.WrapGreedy(text, width-col))
}

// atCol renders already-wrapped lines at col in st.
func atCol(st lipgloss.Style, col int, lines []string) []string {
	out := make([]string, 0, len(lines))
	for _, l := range lines {
		out = append(out, spaces(col)+st.Render(l))
	}
	return out
}

// truncate cuts s to n cells, ending it with the tier's ellipsis when it was cut. A width too
// narrow for the ellipsis itself gets a plain cut.
func (t Theme) truncate(s string, n int) string {
	if t.Width(s) <= n {
		return s
	}
	if n <= 0 {
		return ""
	}
	e := t.marks().Ellipsis
	if t.Width(e) >= n {
		head, _ := t.cutAt(s, n)
		return head
	}
	head, _ := t.cutAt(s, n-t.Width(e))
	return head + e
}

func spaces(n int) string {
	return strings.Repeat(" ", max(n, 0))
}
