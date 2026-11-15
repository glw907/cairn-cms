package render

import (
	"cmp"
	"encoding/json"
	"slices"
	"strconv"
	"strings"
	"time"

	"charm.land/lipgloss/v2"
	"charm.land/lipgloss/v2/table"
	"github.com/glw907/cairn-cms/tool/v2/internal/health"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// The many-sites body is the labelled status strip, with the plain table as its narrow fallback.
// Every strip column is a check id spelled out, so the strip answers "which check" as well as
// "how many" with no legend and no two-letter cipher under it. The table is not a rival
// direction: it is the same information without the grid, for a terminal too narrow to carry the
// labels. Neither prints a legend.

// The strip's column budget.
const (
	// siteLead is the cells before the site column: the margin, the site's verdict mark, and the
	// space after it, so the site name starts on the grid's name column.
	siteLead = 4
	// stripSep is the gutter between two heading columns, and the gutter before the verdict.
	stripSep = 1
	// siteColCap bounds the site column, so one 57-character domain cannot push the strip into
	// its fallback for every other site on the screen.
	siteColCap = 28
	// siteColFloor is the narrowest the site column ever draws, the width of the shortest
	// heading it sits beside.
	siteColFloor = 4
	// verdictColWidth holds the longest verdict word.
	verdictColWidth = 8
)

// stripHeadings is the one abbreviation the strip takes. https-forced is twelve cells of heading
// over a one-cell mark, and the nine full ids plus the site and verdict columns do not fit in a
// hundred. The truncation is one a reader can undo, which is the only kind the copy standard
// allows; the check id is https-forced everywhere else, this heading included in every other
// body.
var stripHeadings = map[string]string{"https-forced": "https"}

// stripColumns returns the check ids the strip draws a column for, in the order the engine runs
// them. health.All is the source, so a check added there gains a column rather than vanishing
// from the fleet screen.
func stripColumns() []string {
	out := make([]string, 0, len(health.All))
	for _, c := range health.All {
		out = append(out, c.ID())
	}
	return out
}

// stripHeading returns the heading a check id draws under.
func stripHeading(id string) string {
	if h, found := stripHeadings[id]; found {
		return h
	}
	return id
}

// stripHeadingsFor returns the headings for ids, in order.
func stripHeadingsFor(ids []string) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		out = append(out, stripHeading(id))
	}
	return out
}

// stripWidth returns the width the labelled strip needs: the lead, the site column, a gutter,
// every heading with a gutter between each pair, a gutter, and the verdict column. It is the
// whole of the fallback rule, computed rather than guessed, so a heading change moves the
// threshold visibly rather than silently.
func (t theme) stripWidth(headings []string, siteCol, verdictCol int) int {
	total := siteLead + siteCol + stripSep + stripSep + verdictCol
	for i, h := range headings {
		if i > 0 {
			total += stripSep
		}
		total += t.Width(h)
	}
	return total
}

// siteColWidth sizes the site column to the longest sanitized name it must hold, capped at
// siteColCap.
func (t theme) siteColWidth(rs []health.Report) int {
	n := siteColFloor
	for _, r := range rs {
		n = max(n, t.Width(sanitize(r.Site)))
	}
	return min(n, siteColCap)
}

// siteVerdict folds one site's checks into the verdict its row carries, through health's
// conversion and spine's arithmetic alone: the render paints a verdict and never computes one,
// so an operator reading a row and a routine reading the exit code cannot disagree.
func siteVerdict(r health.Report) spine.Verdict {
	return health.Verdicts(r).Verdict()
}

// fleetTally counts the sites by the verdict each reports, worst first, omitting a verdict no
// site carries.
func (t theme) fleetTally(rs []health.Report, sep string) string {
	byVerdict := map[spine.Verdict]int{}
	for _, r := range rs {
		byVerdict[siteVerdict(r)]++
	}
	var parts []string
	for _, v := range []spine.Verdict{spine.VerdictCritical, spine.VerdictUnknown, spine.VerdictWarning, spine.VerdictOK} {
		if n := byVerdict[v]; n > 0 {
			parts = append(parts, count(n, v.String()))
		}
	}
	return strings.Join(parts, sep)
}

// renderMany draws a fleet: one row per site under real column headings, the run's state,
// and every fix beneath, ranked. No count of fixes the screen declined to show is printed: that
// is a fact an operator cannot act on, and the list is already ranked.
func renderMany(t theme, in RenderInput) Frame {
	width := in.width()
	ranked := rankReports(in.Reports)
	subject := count(len(ranked), "sites")
	if len(ranked) == 1 {
		subject = count(1, "site")
	}
	tally := t.fleetTally(ranked, " "+t.marks.Sep+" ")

	f := Frame{header: t.verdictLines(in.Verdict, subject, tally, width)}
	if len(ranked) > 0 {
		f.header = append(f.header, style.ContinuationLine(t.Theme, style.RoleMuted,
			checkedPhrase(freshest(ranked, in.Now), in.Now, in.Status.Elapsed), colIndent, width)...)
	}

	var body []string
	if len(ranked) > 0 {
		body = append(body, "")
		body = append(body, t.siteBlock(in, ranked, width)...)
	}
	if lines := t.statusLines(in, colIndent, width); len(lines) > 0 {
		body = append(body, "")
		body = append(body, lines...)
	}
	if fixes := t.fleetFixes(in, ranked, width); len(fixes) > 0 {
		body = append(body, "")
		body = append(body, style.Title(t.Theme, labelWhatToFix, width)...)
		body = append(body, fixes...)
	}
	f.body = body

	f.footer = append([]string{""}, t.verdictLines(in.Verdict, subject, tally, width)...)
	return t.clampFrame(f, width)
}

// labelWhatToFix heads the fleet's fix list. It names what the list holds and nothing else: a
// ranked list reads as ranked, and a label that states its ordering has made a promise a
// later check id can break.
const labelWhatToFix = "what to fix"

// labelAlsoOn opens the line naming the other sites one repair applies to, after the site its
// head line names. The list is never cut: a site left off it is a site the operator does not
// know needs the same work.
const labelAlsoOn = "also on: "

// wordTokens is the blocked-group head's collective word for a group more than one missing
// token together explains, since no single token's name would cover what stopped it. It is the
// plural of "token", the word for one credential.
const wordTokens = "tokens"

// freshest returns the instant the most recently checked site settled, the one clock the fleet
// header measures against.
func freshest(rs []health.Report, fallback time.Time) time.Time {
	var newest time.Time
	for _, r := range rs {
		if at := checkedAt(r, fallback); at.After(newest) {
			newest = at
		}
	}
	if newest.IsZero() {
		return fallback
	}
	return newest
}

// siteBlock draws the fleet's rows: the labelled strip where the headings fit the requested
// width, and the plain table where they do not. Either sits on the grid: each site's verdict
// mark at the margin and the block itself from the name column, so the headings line up over
// the site names.
func (t theme) siteBlock(in RenderInput, rs []health.Report, width int) []string {
	ids := stripColumns()
	siteCol := t.siteColWidth(rs)
	var block []string
	if t.stripWidth(stripHeadingsFor(ids), siteCol, verdictColWidth) <= width {
		block = t.stripBlock(in, rs, ids, siteCol)
	} else {
		block = t.tableBlock(in, rs, siteCol, width)
	}
	// Both blocks draw their heading line first and then one line per site, in rs's order.
	out := make([]string, 0, len(block))
	for i, l := range block {
		if i == 0 || i > len(rs) {
			out = append(out, strings.Repeat(" ", siteLead)+l)
			continue
		}
		mark, role := t.siteMark(siteVerdict(rs[i-1]), in.Verdict)
		out = append(out, strings.Repeat(" ", colIndent)+t.Style(role).Render(mark)+
			strings.Repeat(" ", max(siteLead-colIndent-t.Width(mark), 1))+l)
	}
	return out
}

// siteMark returns the mark and ink one site's row takes from the verdict it reports, inside a
// frame whose verdict is frame: the same mark a check reaching that verdict would take.
func (t theme) siteMark(v, frame spine.Verdict) (mark string, role style.Role) {
	switch v {
	case spine.VerdictCritical:
		return t.marks.Failing, style.RoleFailing
	case spine.VerdictWarning:
		return t.marks.FailingWarn, style.RoleUnknown
	case spine.VerdictUnknown:
		return t.marks.CouldNotRun, style.RoleUnknown
	default:
		return t.marks.Pass, passRole(frame)
	}
}

// stripBlock draws the labelled status strip: one row per site, one real heading per check, the
// marks centred so they form a grid under their headings, and the site's verdict at the end
// of the row it belongs to.
func (t theme) stripBlock(in RenderInput, rs []health.Report, ids []string, siteCol int) []string {
	head := []string{strings.Repeat(" ", siteCol+stripSep)}
	for i, id := range ids {
		if i > 0 {
			head = append(head, " ")
		}
		heading := stripHeading(id)
		head = append(head, t.cell(style.RoleMuted, heading, t.Width(heading)))
	}
	out := []string{strings.TrimRight(row(head...), " ")}

	for _, r := range rs {
		byID := map[string]health.CheckResult{}
		for _, c := range r.Checks {
			byID[c.ID] = c
		}
		cells := []string{t.SizedStrong(style.RoleText, siteCol).Render(t.fitted(r.Site, siteCol)), " "}
		for i, id := range ids {
			if i > 0 {
				cells = append(cells, " ")
			}
			n := t.Width(stripHeading(id))
			c, found := byID[id]
			if !found {
				cells = append(cells, t.centredCell(style.RoleMuted, t.marks.Sep, n))
				continue
			}
			glyph, role := t.mark(in, c)
			cells = append(cells, t.centredCell(role, glyph, n))
		}
		v := siteVerdict(r)
		cells = append(cells, " ",
			t.SizedStrong(rowVerdictRole(v, in.Verdict), verdictColWidth).Render(v.String()))
		out = append(out, strings.TrimRight(row(cells...), " "))
	}
	return out
}

// fitted returns text sanitized and cut to n cells, marked with the tier's ellipsis where it
// was cut, so a fixed column holds one line whatever a site chose to name itself. A cell left to
// wrap would push every column beside it onto a second line.
func (t theme) fitted(text string, n int) string {
	text = sanitize(text)
	if t.Width(text) <= n {
		return text
	}
	ell := t.marks.Ellipsis
	return t.clamp(text, max(n-t.Width(ell), 0)) + ell
}

// rowVerdictRole returns the ink one site's verdict word takes inside a frame whose verdict
// is frame. A site reporting OK inside a failing sweep is muted like every other passing mark:
// the only saturated ink on a failing screen belongs to what failed.
func rowVerdictRole(row, frame spine.Verdict) style.Role {
	if row == spine.VerdictOK {
		return passRole(frame)
	}
	return verdictRole(row)
}

// centredCell renders one mark centred in a column measured by the layout's width table, so
// the marks form a grid under their headings rather than hugging each column's left edge.
func (t theme) centredCell(role style.Role, text string, n int) string {
	w := t.Width(text)
	if w >= n {
		return t.cell(role, text, n)
	}
	left := (n - w) / 2
	return strings.Repeat(" ", left) + t.Style(role).Render(text) + strings.Repeat(" ", n-w-left)
}

// The plain table's headings and their columns: the counts by state, the engine version each
// site is running, and how old the data is. A state a site does not have is left blank rather
// than zero: an empty cell is the calmest way to say a site has none of it.
//
// Declaration order is also the order the columns are given up in at a narrow width, from the
// right: the two leading columns always draw, and each one after them draws only if it fits
// whole. A column that cannot be drawn whole is dropped rather than squeezed, because the table
// is already the strip's fallback and a second fallback that shortens "errors" to "e" and
// pushes a count off the edge prints a fact no reader can use.
//
// Below widthNarrow the three count columns fold into one labelChecks cell and the columns after
// them drop, so a narrow table reads site, verdict, and checks; foldedCounts says what that cell
// carries.
var tableColumns = []struct {
	heading string
	width   int
}{
	{"site", 0},
	{"verdict", verdictColWidth + 2},
	{labelFailing, 9},
	{labelCouldNotRun, 15},
	{labelHeld, 6},
	{"engine", 9},
	{"checked", 9},
}

// tableMandatoryColumns is how many leading tableColumns entries draw at every width: the site
// and its verdict, the two a row means nothing without.
const tableMandatoryColumns = 2

// tableFit returns the column widths the table draws at width, after the lead, and how many
// columns that is. The site column takes siteCol, shrunk toward siteColFloor only when the two
// mandatory columns alone do not fit, since a site column narrow enough to ellipsize every name
// buys nothing.
func tableFit(siteCol, width int) (widths []int, columns int) {
	width -= siteLead
	widths = make([]int, len(tableColumns))
	for i, c := range tableColumns {
		widths[i] = c.width
	}
	widths[0] = siteCol + 2

	mandatory := 0
	for i := range tableMandatoryColumns {
		mandatory += widths[i]
	}
	if mandatory > width {
		widths[0] = max(widths[0]-(mandatory-width), siteColFloor+2)
		mandatory = widths[0] + widths[1]
	}

	total := mandatory
	columns = tableMandatoryColumns
	for i := tableMandatoryColumns; i < len(widths); i++ {
		if total+widths[i] > width {
			break
		}
		total += widths[i]
		columns++
	}
	return widths[:columns], columns
}

// engineCheckID is the check whose outcome carries the installed engine version.
const engineCheckID = "engine"

// engineVersion returns the engine version r's engine check measured, and empty where the
// check did not run or reported none. It is read from the check's structured field: the version
// appears in the check's prose detail too, and a column that parsed that sentence would go wrong
// the first time it was reworded.
func engineVersion(r health.Report) string {
	for _, c := range r.Checks {
		if c.ID != engineCheckID {
			continue
		}
		for _, f := range c.Outcome.Fields {
			if f.Key != health.FieldEngineInstalledVersion {
				continue
			}
			var version string
			if err := json.Unmarshal(f.Value, &version); err != nil {
				return ""
			}
			return sanitize(version)
		}
	}
	return ""
}

// tableBlock draws the plain ruleless table, the strip's fallback below the width its
// headings need: one row per site, the verdict, the counts by state, and how old the data is. No
// rules, no boxes, and no glyph carrying a fact alone.
func (t theme) tableBlock(in RenderInput, rs []health.Report, siteCol, width int) []string {
	widths, columns := tableFit(siteCol, width)
	siteCol = widths[0] - 2
	headings := make([]string, columns)
	for i := range widths {
		headings[i] = tableColumns[i].heading
	}
	folded := width < widthNarrow
	room := 0
	if folded {
		widths, headings = widths[:tableMandatoryColumns], headings[:tableMandatoryColumns]
		room = width - siteLead - widths[0] - widths[1]
		if room >= t.Width(labelChecks) {
			widths, headings = append(widths, room), append(headings, labelChecks)
		}
		columns = len(widths)
	}

	verdicts := make([]spine.Verdict, 0, len(rs))
	rows := make([][]string, 0, len(rs))
	for _, r := range rs {
		s := split(r)
		v := siteVerdict(r)
		verdicts = append(verdicts, v)
		row := []string{
			t.fitted(r.Site, siteCol), v.String(), blankZero(len(s.Failing)), blankZero(len(s.CouldNotRun)),
			blankZero(len(s.Held)), engineVersion(r), relative(in.Now.Sub(checkedAt(r, in.Now))) + " ago",
		}
		if folded {
			cell := t.foldedCounts(s, room)
			// A blank cell reads as a site with nothing to count, so a room too narrow for one
			// site's first count drops the column for every site.
			if cell == "" && len(s.Failing)+len(s.CouldNotRun)+len(s.Held) > 0 {
				columns = min(columns, tableMandatoryColumns)
			}
			row = []string{row[0], row[1], cell}
		}
		rows = append(rows, row)
	}
	widths, headings = widths[:columns], headings[:columns]
	for i := range rows {
		rows[i] = rows[i][:columns]
	}

	total := 0
	for _, w := range widths {
		total += w
	}
	tb := table.New().
		Headers(headings...).
		Rows(rows...).
		BorderTop(false).BorderBottom(false).BorderLeft(false).BorderRight(false).
		BorderRow(false).BorderColumn(false).BorderHeader(false).
		Width(min(total, width-siteLead)).
		Wrap(false).
		StyleFunc(func(r, c int) lipgloss.Style {
			role, strong := tableRole(r, c, rows, verdicts, in.Verdict, folded)
			if strong {
				return t.SizedStrong(role, widths[c])
			}
			return t.Sized(role, widths[c])
		})

	var out []string
	for l := range strings.SplitSeq(tb.String(), "\n") {
		if strings.TrimSpace(sanitize(l)) == "" {
			continue
		}
		out = append(out, strings.TrimRight(l, " "))
	}
	return out
}

// tableRole returns the ink one table cell takes and whether it is set bold: the site and the
// verdict carry the row, a non-empty failing or could-not-run count takes the ink of the state
// it counts, and everything else is muted. A folded checks cell mixes the states in one string,
// so it takes the text ink rather than any one state's.
func tableRole(r, c int, rows [][]string, verdicts []spine.Verdict, frame spine.Verdict, folded bool) (role style.Role, strong bool) {
	if r == table.HeaderRow {
		return style.RoleMuted, false
	}
	switch {
	case c == 0:
		return style.RoleText, true
	case c == 1:
		return rowVerdictRole(verdicts[r], frame), true
	case folded:
		return style.RoleText, false
	case c == 2 && rows[r][c] != "":
		return style.RoleFailing, false
	case c == 3 && rows[r][c] != "":
		return style.RoleUnknown, false
	default:
		return style.RoleMuted, false
	}
}

// labelChecks heads the folded counts column a table narrower than widthNarrow draws.
const labelChecks = "checks"

// foldedCounts joins a site's non-zero failing, could-not-run, and held counts with the tier's
// separator, in that order, keeping only the leading counts that fit room whole. A count that
// does not fit is dropped with every count after it, the same rule the wide table gives its
// columns, since the row is one line and a count cut in half is no count at all.
func (t theme) foldedCounts(s sections, room int) string {
	sep := " " + t.marks.Sep + " "
	var out string
	for _, part := range []struct {
		n    int
		word string
	}{{len(s.Failing), labelFailing}, {len(s.CouldNotRun), labelCouldNotRun}, {len(s.Held), labelHeld}} {
		if part.n == 0 {
			continue
		}
		next := count(part.n, part.word)
		if out != "" {
			next = out + sep + next
		}
		if t.Width(next) > room {
			break
		}
		out = next
	}
	return out
}

// blankZero renders a count, and renders a zero as nothing at all.
func blankZero(n int) string {
	if n == 0 {
		return ""
	}
	return strconv.Itoa(n)
}

// fleetFix is one repair the fleet screen prints, with the facts it is ranked and drawn by.
type fleetFix struct {
	// site is the sanitized name of the worst-ranked site the fix belongs to, the one the entry's
	// head line names.
	site string
	// alsoOn lists the remaining sites the same repair applies to, in the fleet's ranked
	// order. It is empty for a repair that belongs to one site.
	alsoOn []string
	// siteRank is the site's index in the ranked fleet, the tie-break between two fixes the
	// severity key cannot separate.
	siteRank int
	// check is the check id the fix is named by on a separate line.
	check string
	// ids lists every check this one fix unblocks, set only where it covers more than one, so a
	// group says what it covers once rather than printing the same sentence per check.
	ids []string
	// tail is the muted field the head line ends on: the condition id where the check declared
	// one, and otherwise the variable naming the token whose absence blocked the group.
	tail string
	// class is the fix's severity class, the first key it is ranked by.
	class int
	// severity is spine's state severity, the second key.
	severity int
	// blocked marks a fix for a check that could not run, which is listed after the failures.
	blocked bool
	// fix is the fix line itself.
	fix health.Fix
}

// fleetFixes renders every repair the fleet screen carries, ranked, each printed exactly once.
//
// Every fix is printed. A count of repairs the screen declined to show is a fact an operator
// cannot act on, and the list is already ranked; if a fleet ever outgrows the screen the honest
// form is a named cap with a sentence, never a cipher.
func (t theme) fleetFixes(in RenderInput, rs []health.Report, width int) []string {
	var out []string
	for _, f := range rankFleetFixes(collectFleetFixes(in, rs)) {
		out = append(out, t.fixEntry(in, f, width)...)
	}
	return out
}

// collectFleetFixes gathers one entry per repair: one per failing check that resolves to a fix,
// and one per distinct fix covering a site's checks that could not run, however many of them it
// covers.
//
// The key is the fix sentence alone, across the whole frame. One remedy printed once per site
// is the same instruction three times on one screen, which reads as three jobs; a fleet the
// operator upgrades in one pass is exactly the case this screen exists for. The repeats become
// the entry's site list, in the fleet's ranked order, so nothing is lost.
func collectFleetFixes(in RenderInput, rs []health.Report) []fleetFix {
	var out []fleetFix
	at := map[string]int{}
	add := func(f fleetFix) {
		if f.fix.Text == "" {
			return
		}
		if i, found := at[f.fix.Text]; found {
			if out[i].site != f.site && !slices.Contains(out[i].alsoOn, f.site) {
				out[i].alsoOn = append(out[i].alsoOn, f.site)
			}
			out[i].ids = mergeCoveredIDs(out[i], f)
			return
		}
		at[f.fix.Text] = len(out)
		out = append(out, f)
	}
	for i, r := range rs {
		site := sanitize(r.Site)
		s := split(r)
		for _, c := range s.Failing {
			fix, ok := health.FixFor(c.Outcome)
			if !ok {
				continue
			}
			add(fleetFix{
				site: site, siteRank: i, check: sanitize(c.ID), tail: conditionID(c.Outcome),
				class: severityClass(c.ID), severity: c.Outcome.State.Severity(), fix: fix,
			})
		}
		for _, g := range groupFixes(s.CouldNotRun) {
			check := g.ids[0]
			if g.credMissing {
				switch vars := missingVariables(in.Status); len(vars) {
				case 0:
					// The run named no missing credential, so there is no token to head with and
					// the first covered check id stays.
				case 1:
					check = vars[0]
				default:
					check = wordTokens
				}
			}
			f := fleetFix{
				site: site, siteRank: i, check: check, tail: g.tail,
				class: severityClass(g.ids[0]), blocked: true, ids: g.ids, fix: g.fix,
			}
			add(f)
		}
	}
	return out
}

// mergeCoveredIDs returns the check ids one remedy unblocks on every site it now covers, once
// src has been folded into dst. The merged entry says what dst and src actually share, the
// intersection of what each named on its own, never their union: a check one site's group covers
// and the other's does not is not something the merged line may claim for both, since a site
// whose group differs by even one check does not carry the fix for every id the union would list.
// It returns nil below two shared ids, which is the shape that prints no covered-checks line at
// all.
func mergeCoveredIDs(dst, src fleetFix) []string {
	dstIDs := dst.ids
	if len(dstIDs) == 0 {
		dstIDs = []string{dst.check}
	}
	srcIDs := src.ids
	if len(srcIDs) == 0 {
		srcIDs = []string{src.check}
	}
	var ids []string
	for _, id := range dstIDs {
		if slices.Contains(srcIDs, id) {
			ids = append(ids, id)
		}
	}
	if len(ids) < 2 {
		return nil
	}
	return ids
}

// blockedGroup is one fix and every check that could not run for the reason it repairs.
type blockedGroup struct {
	// ids lists the covered check ids, worst first.
	ids []string
	// tail is the condition id the first covered check declared, where one did.
	tail string
	// credMissing reports whether every check in the group was skipped for a missing
	// credential, which is what makes the group's head a token rather than a check id.
	credMissing bool
	// fix is the shared fix.
	fix health.Fix
}

// groupFixes collects the fixes for one site's unobservable checks, one entry per distinct fix,
// naming every check it covers. A site whose whole sweep was skipped for one missing token is one
// entry, not nine: the token is what the operator fixes, once. Where one missing input caused
// several skips, the entry carries the one fix under its key rather than letting the last skipped
// row appear to own a fix that covers two: ambiguity costs more than duplication.
func groupFixes(blocked []health.CheckResult) []blockedGroup {
	var out []blockedGroup
	for _, c := range blocked {
		fix, ok := health.FixFor(c.Outcome)
		if !ok {
			fix, ok = health.FixForReason(c.Outcome.Reason)
		}
		if !ok || fix.Text == "" {
			continue
		}
		id := sanitize(c.ID)
		credMissing := c.Outcome.Reason == spine.ReasonCredMissing
		found := false
		for i := range out {
			if out[i].fix == fix {
				out[i].ids = append(out[i].ids, id)
				out[i].credMissing = out[i].credMissing && credMissing
				found = true
				break
			}
		}
		if !found {
			out = append(out, blockedGroup{
				ids: []string{id}, tail: conditionID(c.Outcome), credMissing: credMissing, fix: fix,
			})
		}
	}
	return out
}

// missingVariables returns the variables of every credential this run could not find, in the
// order the status names them. A group of checks skipped for a missing credential is headed by
// the one variable this returns, or by the collective word where it returns more than one: the
// per-credential Disables lists say which checks a token gates, never which token a given skip
// went without, so the run's missing set is the only thing that can name the head.
func missingVariables(s StatusState) []string {
	var vars []string
	for _, c := range s.Credentials {
		if c.missing() {
			vars = append(vars, sanitize(c.Variable))
		}
	}
	return vars
}

// rankFleetFixes orders the list by the one severity key, with every fix for a check that could
// not run listed after the failures: a check blocked by a missing setting is a thing the
// operator can fix.
func rankFleetFixes(fs []fleetFix) []fleetFix {
	out := slices.Clone(fs)
	slices.SortStableFunc(out, func(a, b fleetFix) int {
		return cmp.Or(
			compareBool(a.blocked, b.blocked),
			cmp.Compare(a.class, b.class),
			cmp.Compare(b.severity, a.severity),
			cmp.Compare(a.siteRank, b.siteRank),
			cmp.Compare(a.check, b.check),
		)
	})
	return out
}

// compareBool orders false before true.
func compareBool(a, b bool) int {
	switch {
	case a == b:
		return 0
	case b:
		return -1
	default:
		return 1
	}
}

// fixEntry draws one repair as a mark row: the failure's mark, the site as the row's name, and
// the check the fix is named by as its detail, with the greppable handle after it. The fix line
// sits beneath at the row's detail column and, for a fix covering more than one check or site,
// the checks and sites it covers follow there.
//
// The check name carries the documentation link here rather than a printed URL: a fleet list is
// an index, and `cairn health <site>` is where the full fix with its URL lives.
func (t theme) fixEntry(in RenderInput, f fleetFix, width int) []string {
	site := t.fitted(f.site, width-colIndent-2)
	col := t.DetailColumn(site, width)
	mark, role := t.marks.CouldNotRun, style.RoleUnknown
	switch {
	case f.blocked:
	case criticalFailure(f.check):
		mark, role = t.marks.Failing, style.RoleFailing
	default:
		mark = t.marks.FailingWarn
	}
	out := style.MarkRow(t.Theme, mark, role, site, "", width)

	check := t.fitted(f.check, width-col)
	checkStyle := t.Style(style.RoleSubtle)
	if url := fixURL(f.fix); url != "" && !style.NoColor(in.Profile) && linkable(url) {
		checkStyle = t.Link(style.RoleSubtle, url)
	}
	line := strings.Repeat(" ", col) + checkStyle.Render(check)
	if col > t.Width(out[0]) {
		line = out[0] + strings.Repeat(" ", col-t.Width(out[0])) + checkStyle.Render(check)
		out = out[:0]
	}
	// The handle keeps the check's line only where it fits whole, and otherwise takes a line of
	// its own at the detail column. Half a condition id is a greppable handle for nothing, so
	// below a width that holds it whole it is not printed at all, and --json carries it at every
	// width.
	var tailLines []string
	if f.tail != "" {
		tail := t.Style(style.RoleMuted).Render(f.tail)
		switch {
		case t.Width(line)+2+t.Width(f.tail) <= width:
			line += "  " + tail
		case t.Width(f.tail) <= width-col:
			tailLines = []string{strings.Repeat(" ", col) + tail}
		}
	}
	out = append(out, line)
	out = append(out, tailLines...)
	// The sentence wraps through Wrap, which keeps a lone word from dangling on its last line, so
	// FixLine is handed the first line alone and the rest follow at its column.
	sentence := t.Wrap(sanitize(f.fix.Text), width-col)
	if len(sentence) > 0 {
		out = append(out, style.FixLine(t.Theme, sentence[0], "", col, width)...)
		out = append(out, atColumn(t.Style(style.RoleSubtle), col, sentence[1:])...)
	}
	// A merged entry can cover, or list "also on:", as many sites as the fleet holds: one shared
	// token disables the same checks fleet-wide, so both lists below wrap through Wrap too.
	if len(f.ids) > 1 {
		out = append(out, atColumn(t.Style(style.RoleMuted), col,
			t.Wrap(keyFixFor+strings.Join(f.ids, ", "), width-col))...)
	}
	if len(f.alsoOn) > 0 {
		lead := strings.Repeat(" ", col) + t.Style(style.RoleMuted).Render(labelAlsoOn)
		listCol := col + t.Width(labelAlsoOn)
		out = append(out, t.hangingAt(t.Style(style.RoleMuted), lead, listCol,
			strings.Join(t.fittedEach(f.alsoOn, width-listCol), ", "), width, true)...)
	}
	return out
}

// fittedEach returns names each cut to n cells and marked where it was cut. A name wider than
// the column it wraps into would otherwise be hard-wrapped in the middle, which turns one site
// into two strings that name none.
func (t theme) fittedEach(names []string, n int) []string {
	out := make([]string, 0, len(names))
	for _, name := range names {
		out = append(out, t.fitted(name, n))
	}
	return out
}
