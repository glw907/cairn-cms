package render

import (
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// The single-site column budget. A glyph never sets a column: it sits in a measured field, so a
// terminal that renders an East Asian Ambiguous glyph two cells wide shifts nothing after it.
const (
	colIndent = 2
	colGlyph  = 2
	colWord   = 6
	colName   = 14
)

// renderSingle draws one site's health: the rows grouped by what the operator must do, in the
// order they must do it, under lowercase inset rules, with each fix under the row it repairs.
//
// There is no rail down the failing group. The failing group is always first and always under
// its own rule, so its edge is never in question; a rail buys an edge the reader already has and
// spends a fourth ink on it.
func renderSingle(t Theme, in RenderInput) Frame {
	width := in.width()
	report := firstReport(in)
	s := split(report)
	subject := Sanitize(report.Site)
	tally := s.tally(" " + t.glyphs(in.ASCII).Sep + " ")

	f := Frame{Header: t.verdictLines(in.Verdict, subject, tally, width)}
	f.Header = append(f.Header,
		indented(t.Style(RoleMuted), 0, checkedPhrase(checkedAt(report, in.Now), in.Now), width)...)

	var body []string
	section := func(label string, cs []health.CheckResult) {
		if len(cs) == 0 {
			return
		}
		body = append(body, "", t.insetRule(in.ASCII, label, width))
		for _, c := range cs {
			body = append(body, t.checkRows(in, c, width)...)
		}
	}
	section(labelFailing, s.Failing)
	section(labelCouldNotRun, s.CouldNotRun)
	section(labelHeld, s.Held)

	// A run with nothing to do is the one frame that can afford to show its work, so every
	// check is listed in the order the sweep ran them. Anywhere a failure is on screen the same
	// checks fold into one muted line instead: nothing green belongs below a failure.
	switch {
	case len(s.Passing) == 0:
	case in.Verdict == spine.VerdictOK:
		section(labelPassing, s.Passing)
	default:
		body = append(body, "")
		body = append(body, t.foldLine(in, s.Passing, width)...)
	}
	f.Body = body

	f.Footer = append([]string{""}, t.verdictLines(in.Verdict, subject, tally, width)...)
	return t.clampFrame(f, width)
}

// firstReport returns the report a single-site frame draws, or a zero Report when the run
// reached no site at all, which is what an empty registry renders as.
func firstReport(in RenderInput) health.Report {
	if len(in.Reports) == 0 {
		return health.Report{}
	}
	return in.Reports[0]
}

// glyphs returns the tier a body draws from. render.Render never re-derives the tier: it reads
// RenderInput.ASCII, which profile.go's detector alone fills.
func (t Theme) glyphs(ascii bool) Glyphs {
	if ascii {
		return t.GlyphSet.ASCII
	}
	return t.GlyphSet.Unicode
}

// mark returns the glyph and ink one check's state takes.
//
// A held failure is always the held glyph, never the filled or outlined fail mark: the
// filled-against-outlined distinction says how bad an unheld failure is, and a held failure has
// already been weighed. An unheld failure takes the filled mark when its own severity would
// carry the run to CRITICAL and the outlined mark when it would only reach WARNING, from the
// same predicate the verdict uses, so a mark can never disagree with its own row.
func (t Theme) mark(in RenderInput, c health.CheckResult) (glyph string, role Role) {
	g := t.glyphs(in.ASCII)
	switch {
	case c.Outcome.State == spine.Failing && c.Acknowledged:
		return g.Held, RoleUnknown
	case c.Outcome.State == spine.Failing && criticalFailure(c.ID):
		return g.Fail, RoleFailing
	case c.Outcome.State == spine.Failing:
		return g.FailWarn, RoleUnknown
	case c.Outcome.State == spine.Unknown:
		return g.Skip, RoleUnknown
	default:
		return g.Pass, passRole(in.Verdict)
	}
}

// keepsWord reports whether a row prints its state word beside the glyph. The word is dropped
// only where hue carries the state: at the Unicode tier in colour, where the check id is the
// row's subject and belongs as close to the margin as the glyph allows. The ASCII tier and any
// ProfileNoColor terminal keep it unconditionally, since with no hue and no filled glyph the
// word is the state's last carrier. It is decided here rather than by a flag: there is nothing
// an operator can pass to remove the word from a frame that needs it.
func keepsWord(in RenderInput) bool {
	return in.ASCII || in.Profile == ProfileNoColor
}

// wordRole returns the ink a state word takes. A held row keeps full-strength ink on its word
// while spending no hue at all, and joins the attention ink once its hold is close to expiry.
func (t Theme) wordRole(c health.CheckResult, escalating bool) Role {
	switch {
	case c.Outcome.State == spine.Failing && c.Acknowledged && escalating:
		return RoleUnknown
	case c.Outcome.State == spine.Failing && c.Acknowledged:
		return RoleText
	case c.Outcome.State == spine.Failing && criticalFailure(c.ID):
		return RoleFailing
	case c.Outcome.State == spine.Failing, c.Outcome.State == spine.Unknown:
		return RoleUnknown
	default:
		return RoleMuted
	}
}

// detailCol is the column a row's detail starts at, which the state word moves six cells right
// when the tier keeps one.
func detailCol(in RenderInput) int {
	if keepsWord(in) {
		return colIndent + colGlyph + colWord + colName
	}
	return colIndent + colGlyph + colName
}

// checkRows draws one check: the glyph, the state word where the tier keeps it, the check id,
// the detail in its own column, the hold field where the row carries one, and the fix beneath.
func (t Theme) checkRows(in RenderInput, c health.CheckResult, width int) []string {
	hold, escalating := holdField(c, in.Now)
	glyph, glyphRole := t.mark(in, c)

	cells := []string{strings.Repeat(" ", colIndent), t.cell(glyphRole, glyph, colGlyph)}
	if keepsWord(in) {
		word := spine.StateWord(c.Outcome.State, c.Acknowledged)
		cells = append(cells, t.cell(t.wordRole(c, escalating), word, colWord))
	}
	cells = append(cells, t.SizedStrong(RoleText, colName).Render(Sanitize(c.ID)))

	holdRole := RoleMuted
	if escalating {
		holdRole = RoleUnknown
	}
	detail := Sanitize(checkDetail(c))

	// Below the narrow rung the body drops to one column: the row names the check and every
	// field beneath it sits at one shallow indent rather than in a column budget the width
	// cannot pay for.
	narrow := width < WidthNarrow
	col := detailCol(in)
	if narrow {
		col = colIndent + colGlyph
	}

	cond := conditionID(c.Outcome)
	tail := ""
	if cond != "" {
		tail = "  " + cond
	}
	lines, placed := t.detailLines(detail, tail, col, width)

	var head []string
	switch {
	case narrow || len(lines) == 0:
		head = append(head, row(cells...))
		head = append(head, lines...)
	default:
		head = append(head, row(cells...)+strings.TrimLeft(lines[0], " "))
		head = append(head, lines[1:]...)
	}

	fix, hasFix := health.FixFor(c.Outcome)
	block := t.fixBlock(in, fix, hasFix, width)
	if !placed {
		t.placeCondition(head, block, t.Style(RoleMuted).Render(tail), width)
	}

	out := append(head, indented(t.Style(holdRole), col, hold, width)...)
	return append(out, block...)
}

// detailLines renders one check's detail into its own column, and reports whether the condition
// id's tail was placed on the last of them. Below 100 columns the fix block's URL has already
// taken the width, so the detail re-flows to make room for the id rather than leaving it to a
// line of its own.
func (t Theme) detailLines(detail, tail string, col, width int) (lines []string, placed bool) {
	avail := width - col
	if tail == "" || width >= Width100 {
		return atColumn(t.Style(RoleSubtle), col, wrap(detail, avail)), false
	}
	wrapped, ok := wrapLeavingTail(detail, avail, t.Width(tail))
	lines = atColumn(t.Style(RoleSubtle), col, wrapped)
	if !ok || len(lines) == 0 {
		return lines, false
	}
	lines[len(lines)-1] += t.Style(RoleMuted).Render(tail)
	return lines, true
}

// checkDetail returns the line a check contributes: the detail it measured, or, where it
// measured none, the reason code it could not run under. health's own messages table carries no
// prose for a reason code, so the code itself is what is left to print.
func checkDetail(c health.CheckResult) string {
	if c.Outcome.Detail != "" {
		return c.Outcome.Detail
	}
	return string(c.Outcome.Reason)
}

// fixBlock renders one fix under the row it repairs: the imperative sentence wrapped with a
// hanging indent, then the full documentation URL on its own line, clickable where the terminal
// supports OSC 8 and whole everywhere else. A fix is never truncated.
func (t Theme) fixBlock(in RenderInput, fix health.Fix, hasFix bool, width int) []string {
	if !hasFix || fix.Text == "" {
		return nil
	}
	g := t.glyphs(in.ASCII)
	indent := colIndent + colGlyph
	col := indent + t.Width(g.Arrow) + 1
	lead := strings.Repeat(" ", indent) + t.Style(RoleAccent).Render(g.Arrow) + " "
	out := hangingAt(t.Style(RoleSubtle), lead, col, Sanitize(fix.Text), width)

	url := fixURL(fix)
	if url == "" {
		return out
	}
	// The link's text is the URL itself, so a terminal that renders the hyperlink and one that
	// prints the text show the same destination.
	style := t.Style(RoleMuted)
	if in.Profile != ProfileNoColor && linkable(url) {
		style = t.Link(RoleMuted, url)
	}
	return append(out, indented(style, col, url, width)...)
}

// placeCondition writes the condition id onto the tail of a line it shares, in place. The id
// never occupies a line of its own: on its own line under a detail it reads as debris rather
// than as the greppable handle for the failure beside it.
//
// At 100 columns and above it trails the fix block's last line, so the handle and the page that
// documents it share a line. Below that the URL has already taken the width, so the id trails
// the check's own detail and wraps with it. Where no line has room for it at all, which happens
// only at the narrowest widths, it is not printed: a bare line is the defect this corrects, and
// --json carries the id at every width.
func (t Theme) placeCondition(detail, block []string, tail string, width int) {
	if tail == "" {
		return
	}
	order := [][]string{detail, block}
	if width >= Width100 {
		order = [][]string{block, detail}
	}
	for _, lines := range order {
		if attachTail(t, lines, tail, width) {
			return
		}
	}
}

// attachTail appends tail to the last line in lines with room for it, searching from the end,
// and reports whether it found one.
func attachTail(t Theme, lines []string, tail string, width int) bool {
	for i := len(lines) - 1; i >= 0; i-- {
		if t.Width(lines[i])+t.Width(tail) <= width {
			lines[i] += tail
			return true
		}
	}
	return false
}

// foldLine folds every passing check into one line. Its dot takes the frame's own pass ink,
// which is the same rule every other passing mark follows: green only in a run whose verdict
// is OK.
func (t Theme) foldLine(in RenderInput, passing []health.CheckResult, width int) []string {
	names := make([]string, 0, len(passing))
	for _, c := range passing {
		names = append(names, Sanitize(c.ID))
	}
	g := t.glyphs(in.ASCII)
	label := count(len(passing), labelPassing)
	lead := t.Style(passRole(in.Verdict)).Render(g.Pass) + " " + t.Style(RoleMuted).Render(label) + "  "
	col := t.Width(g.Pass) + 1 + t.Width(label) + 2
	return hangingAt(t.Style(RoleMuted), lead, col, strings.Join(names, " "+g.Sep+" "), width)
}

// clampFrame cuts every emitted line to the requested width, the last thing a terminal body
// passes through. It fires only on a line data made too long, never on one the layout composed,
// which is what keeps a hostile detail from wrapping a row onto a line of its own.
func (t Theme) clampFrame(f Frame, width int) Frame {
	for _, section := range [][]string{f.Header, f.Body, f.Footer} {
		for i, l := range section {
			section[i] = t.Clamp(l, width)
		}
	}
	return f
}
