package render

import (
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/doctor"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// The two group words a doctor run adds to the section vocabulary. A skipped check's
// precondition did not hold for this site, so it is neither a failure nor a check that could not
// run, and an info result is a passing check that carries a note worth reading.
const (
	labelDoesNotApply = "does not apply"
	labelNotes        = "notes"
)

// doctorSections is one doctor run split the way its terminal body groups it.
type doctorSections struct {
	// failing holds every failure, the critical ones first and each severity in run order.
	failing []doctor.CheckedResult
	// critical marks which of failing raise a condition whose severity carries the run to
	// CRITICAL, index for index.
	critical    []bool
	couldNotRun []doctor.CheckedResult
	notes       []doctor.CheckedResult
	skipped     []doctor.CheckedResult
	passing     int
}

// splitDoctor groups checked by status. A failure's severity comes from doctor.Verdicts, the
// same conversion the exit code folds, so a row's mark can never disagree with the verdict.
func splitDoctor(checked []doctor.CheckedResult) doctorSections {
	var s doctorSections
	var warnings []doctor.CheckedResult
	verdicts := doctor.Verdicts(checked)
	for i, cr := range checked {
		switch cr.Result.Status {
		case doctor.StatusFail:
			if verdicts[i].Severity == spine.CriticalFailure {
				s.failing = append(s.failing, cr)
				s.critical = append(s.critical, true)
				continue
			}
			warnings = append(warnings, cr)
		case doctor.StatusUnchecked:
			s.couldNotRun = append(s.couldNotRun, cr)
		case doctor.StatusInfo:
			s.notes = append(s.notes, cr)
		case doctor.StatusSkip:
			s.skipped = append(s.skipped, cr)
		default:
			s.passing++
		}
	}
	for _, cr := range warnings {
		s.failing = append(s.failing, cr)
		s.critical = append(s.critical, false)
	}
	return s
}

// tally renders the verdict line's counts in the section words, the way a health report's
// tally does: a state with none is omitted, and the passing count always prints.
func (s doctorSections) tally(sep string) string {
	var parts []string
	if n := len(s.failing); n > 0 {
		parts = append(parts, count(n, labelFailing))
	}
	if n := len(s.couldNotRun); n > 0 {
		parts = append(parts, count(n, labelCouldNotRun))
	}
	return strings.Join(append(parts, count(s.passing, labelPassing)), sep)
}

// renderDoctor draws a cairn doctor run on a terminal: the verdict line, the failures and the
// checks that could not run under their titles, the notes, then the passing checks folded to
// one count line and the skipped ones to one muted line naming them, and the verdict again.
// A doctor check's name is a sentence, so every row's name takes a line to itself and its
// detail, why, and fix sit under it at the name column. A pipe never reaches this body: it
// prints doctor.Format.
func renderDoctor(t theme, in RenderInput) Frame {
	width := in.width()
	s := splitDoctor(in.Checked)
	subject := sanitize(in.Site)
	tally := s.tally(" " + t.marks.Sep + " ")
	g := t.marks

	var body []string
	title := func(label string) {
		body = append(body, "")
		body = append(body, style.Title(t.Theme, label, width)...)
	}
	if len(s.failing) > 0 {
		title(labelFailing)
		for i, cr := range s.failing {
			glyph, role := g.FailingWarn, style.RoleUnknown
			if s.critical[i] {
				glyph, role = g.Failing, style.RoleFailing
			}
			body = append(body, t.doctorFailRows(cr, glyph, role, width)...)
		}
	}
	if len(s.couldNotRun) > 0 {
		title(labelCouldNotRun)
		for _, cr := range s.couldNotRun {
			body = append(body, style.MarkRow(t.Theme, g.CouldNotRun, style.RoleUnknown,
				sanitize(cr.Check.Title(cr.Result.Status)), sanitize(cr.Result.Detail), width)...)
		}
	}
	if len(s.notes) > 0 {
		title(labelNotes)
		for _, cr := range s.notes {
			body = append(body, style.ContinuationLine(t.Theme, style.RoleMuted,
				sanitize(cr.Check.Title(cr.Result.Status)), colIndent+2, width)...)
			body = append(body, style.ContinuationLine(t.Theme, style.RoleMuted,
				sanitize(cr.Result.Detail), colIndent+2, width)...)
		}
	}
	if s.passing > 0 || len(s.skipped) > 0 {
		body = append(body, "")
	}
	if s.passing > 0 {
		body = append(body, style.MarkRow(t.Theme, g.Pass, passRole(in.Verdict),
			count(s.passing, labelPassing), "", width)...)
	}
	if len(s.skipped) > 0 {
		body = append(body, t.skipLine(s.skipped, width)...)
	}

	return t.clampFrame(Frame{
		header: t.verdictLines(in.Verdict, subject, tally, width),
		body:   body,
		footer: append([]string{""}, t.verdictLines(in.Verdict, subject, tally, width)...),
	}, width)
}

// doctorFailRows draws one failing check: the mark and the check's title, its detail under the
// title, the condition's why muted under that, and the fix with its documentation address.
func (t theme) doctorFailRows(cr doctor.CheckedResult, glyph string, role style.Role, width int) []string {
	name := sanitize(cr.Check.Title(cr.Result.Status))
	col := t.DetailColumn(name, width)
	out := style.MarkRow(t.Theme, glyph, role, name, sanitize(cr.Result.Detail), width)
	// The lookup cannot miss: Title above has already panicked for a failing check whose
	// condition has no registry entry.
	text, _ := spine.TextFor(cr.Check.Condition)
	out = append(out, style.ContinuationLine(t.Theme, style.RoleMuted, sanitize(text.Why), col, width)...)
	return append(out, t.fixLines(text.Remediation, doctor.DocsURL(text.DocsAnchor), col, width)...)
}

// skipLine folds every skipped check into one muted line: the count at the margin and the
// checks' titles at the value column, or under the count at the name column where the value
// column has no room for them.
func (t theme) skipLine(skipped []doctor.CheckedResult, width int) []string {
	names := make([]string, 0, len(skipped))
	for _, cr := range skipped {
		names = append(names, sanitize(cr.Check.Title(cr.Result.Status)))
	}
	label := count(len(skipped), labelDoesNotApply)
	text := strings.Join(names, " "+t.marks.Sep+" ")
	head := style.ContinuationLine(t.Theme, style.RoleMuted, label, colIndent, width)
	// An empty name gives the grid's value column at this width, which is the name column
	// below the one-column threshold.
	col := t.DetailColumn("", width)
	if col == colIndent+2 || colIndent+t.Width(label)+2 > col {
		return append(head, style.ContinuationLine(t.Theme, style.RoleMuted, text, colIndent+2, width)...)
	}
	lines := t.WrapGreedy(text, width-col)
	head[0] += strings.Repeat(" ", col-colIndent-t.Width(label)) + t.Style(style.RoleMuted).Render(lines[0])
	return append(head, style.ContinuationLine(t.Theme, style.RoleMuted, strings.Join(lines[1:], " "), col, width)...)
}
