package render

import (
	"cmp"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/health"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// colIndent is the margin every terminal body's lines start at, the column style's blocks put a
// mark and a title in.
const colIndent = 2

// renderSingle draws one site's health: the rows grouped by what the operator must do, in the
// order they must do it, under lowercase titles, with each fix under the row it repairs.
func renderSingle(t theme, in RenderInput) Frame {
	width := in.width()
	report := firstReport(in)
	s := split(report)
	subject := sanitize(report.Site)
	tally := s.tally(" " + t.marks.Sep + " ")

	f := Frame{header: t.verdictLines(in.Verdict, subject, tally, width)}
	f.header = append(f.header, style.ContinuationLine(t.Theme, style.RoleMuted,
		checkedPhrase(checkedAt(report, in.Now), in.Now, in.Status.Elapsed), colIndent, width)...)

	var body []string
	section := func(label string, cs []health.CheckResult) {
		if len(cs) == 0 {
			return
		}
		body = append(body, "")
		body = append(body, style.Title(t.Theme, label, width)...)
		for _, c := range cs {
			body = append(body, t.checkRows(in, c, width)...)
		}
	}
	section(labelFailing, s.Failing)
	section(labelCouldNotRun, s.CouldNotRun)
	section(labelHeld, s.Held)

	// Passing checks fold into one count line in every run. Its mark takes the frame's pass ink,
	// so nothing green sits below a failure.
	if len(s.Passing) > 0 {
		body = append(body, "")
		body = append(body, t.foldLine(in, s.Passing, width)...)
	}
	// A passing creds check folds with the rest, and its credential detail follows the count line
	// at its detail column, so a token's expiry still shows in a run where nothing failed.
	if slices.ContainsFunc(s.Passing, func(c health.CheckResult) bool { return c.ID == credsRowID }) {
		col := t.DetailColumn(count(len(s.Passing), labelPassing), width)
		body = append(body, t.statusLines(in, col, width)...)
	}
	f.body = body

	f.footer = append([]string{""}, t.verdictLines(in.Verdict, subject, tally, width)...)
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

// mark returns the glyph and ink one check's state takes.
//
// A held failure is always the held glyph, never the filled or outlined fail mark: the
// filled-against-outlined distinction says how bad an unheld failure is, and a held failure has
// already been weighed. An unheld failure takes the filled mark when its severity would
// carry the run to CRITICAL and the outlined mark when it would only reach WARNING, from the
// same predicate the verdict uses, so a mark can never disagree with its row.
func (t theme) mark(in RenderInput, c health.CheckResult) (glyph string, role style.Role) {
	g := t.marks
	switch {
	case c.Outcome.State == spine.Failing && c.Acknowledged:
		return g.Held, style.RoleUnknown
	case c.Outcome.State == spine.Failing && criticalFailure(c.ID):
		return g.Failing, style.RoleFailing
	case c.Outcome.State == spine.Failing:
		return g.FailingWarn, style.RoleUnknown
	case c.Outcome.State == spine.Unknown:
		return g.CouldNotRun, style.RoleUnknown
	default:
		return g.Pass, passRole(in.Verdict)
	}
}

// checkRows draws one check as a mark row: the mark, the check id, and the detail on the grid,
// then the hold field, the credential detail on the creds row, and the fix, each at the row's
// detail column.
func (t theme) checkRows(in RenderInput, c health.CheckResult, width int) []string {
	hold, escalating := holdField(c, in.Now)
	glyph, role := t.mark(in, c)
	name := sanitize(c.ID)
	col := t.DetailColumn(name, width)
	detail := sanitize(checkDetail(c))
	head := style.MarkRow(t.Theme, glyph, role, name, detail, width)

	fix, hasFix := health.FixFor(c.Outcome)
	block := t.fixBlock(fix, hasFix, col, width)
	if cond := conditionID(c.Outcome); cond != "" {
		tail := t.Style(style.RoleMuted).Render("  " + cond)
		// Below 100 columns the fix block's URL has already taken the width, so the detail
		// re-flows to make room for the id rather than leaving it to no line at all.
		lines, ok := t.wrapLeavingTail(detail, width-col, t.Width(tail))
		switch {
		case width < width100 && ok:
			head = style.MarkRow(t.Theme, glyph, role, name, lines[0], width)
			for _, l := range lines[1:] {
				head = append(head, style.ContinuationLine(t.Theme, style.RoleSubtle, l, col, width)...)
			}
			head[len(head)-1] += tail
		default:
			t.placeCondition(head, block, tail, width)
		}
	}

	holdRole := style.RoleMuted
	if escalating {
		holdRole = style.RoleUnknown
	}
	out := append(head, style.ContinuationLine(t.Theme, holdRole, hold, col, width)...)
	// The credential and keyring detail sit on the creds row rather than in the header block: it
	// is detail about the check the operator is already reading.
	if c.ID == credsRowID {
		out = append(out, t.statusLines(in, col, width)...)
	}
	return append(out, block...)
}

// checkDetail returns the line a check contributes: the detail it measured, or, where it
// measured none, the prose health's messages table carries for the reason it could not run
// under. A body never prints the reason code itself: the code is a handle to grep and to file a
// report against, which --json carries at every width, and a row on the screen owes the operator
// a sentence about what happened instead.
func checkDetail(c health.CheckResult) string {
	return cmp.Or(c.Outcome.Detail, health.ReasonPhrase(c.Outcome.Reason))
}

// fixBlock renders one fix under the row it repairs, at the row's detail column: the imperative
// sentence on the fix mark, then the documentation address on a line by itself, clickable where
// the terminal supports OSC 8 and the address passes linkable. A fix is never truncated.
//
// The address is shown without its scheme, which keeps the documentation pages' addresses on the
// detail column at 80 columns; the OSC 8 target is still the full URL. One too long for the
// detail column even so moves left to the name column rather than breaking, since an address
// split across two lines cannot be copied whole. Only one too long for that column as well
// breaks.
func (t theme) fixBlock(fix health.Fix, hasFix bool, col, width int) []string {
	if !hasFix {
		return nil
	}
	return t.fixLines(fix.Text, fixURL(fix), true, col, width)
}

// fixLines is fixBlock's layout for a fix sentence and its resolved address, the form a doctor
// failure's fix shares. An empty text draws nothing and an empty url draws the sentence alone.
// bare prints the address without its scheme, measured as printed, while the link keeps it.
func (t theme) fixLines(text, url string, bare bool, col, width int) []string {
	if text == "" {
		return nil
	}
	out := style.FixLine(t.Theme, sanitize(text), "", col, width)
	if url == "" {
		return out
	}
	shown := url
	if bare {
		shown = strings.TrimPrefix(strings.TrimPrefix(url, "https://"), "http://")
	}
	ink := t.Style(style.RoleMuted)
	if linkable(url) {
		ink = t.DocLink(url)
	} else {
		shown = sanitize(shown)
	}
	if col+t.Width(shown) > width {
		col = min(col, colIndent+2)
	}
	return append(out, t.indented(ink, col, shown, width)...)
}

// placeCondition writes the condition id onto the tail of a line it shares, in place. The id
// never occupies a line by itself: on a line by itself under a detail it reads as debris rather
// than as the greppable handle for the failure beside it.
//
// At 100 columns and above it trails the fix block's last line where that line has room, so the
// handle and the page that documents it share a line, and the check's detail otherwise. Below
// that the detail comes first. Where no line has room for it at all it is not printed, and
// --json carries the id at every width.
func (t theme) placeCondition(detail, block []string, tail string, width int) {
	order := [][]string{detail, block}
	if width >= width100 {
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
func attachTail(t theme, lines []string, tail string, width int) bool {
	for i := len(lines) - 1; i >= 0; i-- {
		if t.Width(lines[i])+t.Width(tail) <= width {
			lines[i] += tail
			return true
		}
	}
	return false
}

// foldLine folds every passing check into one mark row: the count as the row's name and the
// check ids as its detail. Its mark takes the frame's pass ink, the rule every passing mark
// follows: green only in a run whose verdict is OK.
func (t theme) foldLine(in RenderInput, passing []health.CheckResult, width int) []string {
	names := make([]string, 0, len(passing))
	for _, c := range passing {
		names = append(names, sanitize(c.ID))
	}
	g := t.marks
	name := count(len(passing), labelPassing)
	col := t.DetailColumn(name, width)
	// The ids are packed whole, so a line breaks between two ids, and a broken line keeps its
	// separator at its end, leaving room for it, rather than opening the next line on one.
	sep := " " + g.Sep + " "
	room := width - col - t.Width(" "+g.Sep)
	var lines []string
	for _, id := range names {
		if n := len(lines); n > 0 && t.Width(lines[n-1]+sep+id) <= room {
			lines[n-1] += sep + id
			continue
		}
		if n := len(lines); n > 0 {
			lines[n-1] += " " + g.Sep
		}
		lines = append(lines, id)
	}
	out := style.MarkRow(t.Theme, g.Pass, passRole(in.Verdict), name, lines[0], width)
	for _, l := range lines[1:] {
		out = append(out, style.ContinuationLine(t.Theme, style.RoleSubtle, l, col, width)...)
	}
	return out
}

// clampFrame cuts every emitted line to the requested width, the last thing a terminal body
// passes through. It fires only on a line data made too long, never on one the layout composed,
// which is what keeps a hostile detail from wrapping a row onto a line by itself.
func (t theme) clampFrame(f Frame, width int) Frame {
	for _, section := range [][]string{f.header, f.body, f.footer} {
		for i, l := range section {
			section[i] = t.clamp(l, width)
		}
	}
	return f
}
