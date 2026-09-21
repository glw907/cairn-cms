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
	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// The many-sites body is the labelled status strip, with the plain table as its narrow fallback.
// Every strip column is a check id spelled out, so the strip answers "which check" as well as
// "how many" with no legend and no two-letter cipher under it. The table is not a rival
// direction: it is the same information without the grid, for a terminal too narrow to carry the
// labels, which is why choosing the strip ships both. Neither prints a legend.

// The strip's own column budget.
const (
	// stripSep is the gutter between two heading columns, and the gutter before the verdict.
	stripSep = 1
	// siteColCap bounds the site column, so one 57-character domain cannot push the strip into
	// its own fallback for every other site on the screen.
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

// stripWidth returns the width the labelled strip needs: the site column, a gutter, every
// heading with a gutter between each pair, a gutter, and the verdict column. It is the whole of
// the fallback rule, computed rather than guessed, so a heading change moves the threshold
// visibly rather than silently.
func (t Theme) stripWidth(headings []string, siteCol, verdictCol int) int {
	total := siteCol + stripSep + stripSep + verdictCol
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
func (t Theme) siteColWidth(rs []health.Report) int {
	n := siteColFloor
	for _, r := range rs {
		n = max(n, t.Width(Sanitize(r.Site)))
	}
	return min(n, siteColCap)
}

// siteVerdict folds one site's checks into the verdict its own row carries, through spine's
// arithmetic alone: the render paints a verdict and never computes one, so an operator reading a
// row and a routine reading the exit code cannot disagree.
func siteVerdict(r health.Report) Verdict {
	vs := make(spine.SiteVerdicts, 0, len(r.Checks))
	for _, c := range r.Checks {
		vs = append(vs, spine.CheckVerdict{
			ID: c.ID, State: c.Outcome.State, Reason: c.Outcome.Reason, Acknowledged: c.Acknowledged,
		})
	}
	return vs.Verdict()
}

// fleetTally counts the sites by the verdict each reports, worst first, omitting a verdict no
// site carries.
func (t Theme) fleetTally(rs []health.Report, sep string) string {
	byVerdict := map[Verdict]int{}
	for _, r := range rs {
		byVerdict[siteVerdict(r)]++
	}
	var parts []string
	for _, v := range []Verdict{spine.VerdictCritical, spine.VerdictUnknown, spine.VerdictWarning, spine.VerdictOK} {
		if n := byVerdict[v]; n > 0 {
			parts = append(parts, count(n, v.String()))
		}
	}
	return strings.Join(parts, sep)
}

// renderMany draws a fleet: one row per site under real column headings, the run's own state,
// and every fix beneath, ranked. No count of fixes the screen declined to show is printed: that
// is a fact an operator cannot act on, and the list is already ranked.
func renderMany(t Theme, in RenderInput) Frame {
	width := in.width()
	ranked := rankReports(in.Reports)
	subject := count(len(ranked), "sites")
	if len(ranked) == 1 {
		subject = count(1, "site")
	}
	tally := t.fleetTally(ranked, " "+t.glyphs(in.ASCII).Sep+" ")

	f := Frame{Header: t.verdictLines(in.Verdict, subject, tally, width)}
	if len(ranked) > 0 {
		f.Header = append(f.Header, t.indented(t.Style(RoleMuted), 0,
			checkedPhrase(freshest(ranked, in.Now), in.Now, in.Status.Elapsed), width)...)
	}

	var body []string
	if len(ranked) > 0 {
		body = append(body, "")
		body = append(body, t.siteBlock(in, ranked, width)...)
	}
	if lines := t.statusLines(in, 0, width); len(lines) > 0 {
		body = append(body, "")
		body = append(body, lines...)
	}
	if fixes := t.fleetFixes(in, ranked, width); len(fixes) > 0 {
		body = append(body, "", t.insetRule(in.ASCII, labelWhatToFix, width))
		body = append(body, fixes...)
	}
	f.Body = body

	f.Footer = append([]string{""}, t.verdictFooterLines(in.Verdict, subject, tally, width)...)
	return t.clampFrame(f, width)
}

// labelWhatToFix heads the fleet's fix list. It names what the list holds and nothing else: a
// ranked list reads as ranked, and a label that states its own ordering has made a promise a
// later check id can break.
const labelWhatToFix = "what to fix"

// labelAlsoOn opens the line naming the other sites one repair applies to, after the site its
// own head line names. The list is never cut: a site left off it is a site the operator does not
// know needs the same work.
//
// The wording is drafted to the copy standard's grammar and is owed to Task 22a's editorial
// gate, like every other string this body introduced.
const labelAlsoOn = "also on: "

// wordTokens is the blocked-group head's collective word for a group more than one missing
// token together explains, since no single token's own name would cover what stopped it.
// copy-standard.md's section 2.9 fixes "token" as the word for one credential; this is its
// plural rather than a fresh coinage, and is owed to the editorial gate like every other string
// this body introduced.
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
// width, and the plain table where they do not.
func (t Theme) siteBlock(in RenderInput, rs []health.Report, width int) []string {
	ids := stripColumns()
	siteCol := t.siteColWidth(rs)
	if t.stripWidth(stripHeadingsFor(ids), siteCol, verdictColWidth) <= width {
		return t.stripBlock(in, rs, ids, siteCol)
	}
	return t.tableBlock(in, rs, siteCol, width)
}

// stripBlock draws the labelled status strip: one row per site, one real heading per check, the
// marks centred so they form a grid under their headings, and the site's own verdict at the end
// of the row it belongs to.
func (t Theme) stripBlock(in RenderInput, rs []health.Report, ids []string, siteCol int) []string {
	head := []string{strings.Repeat(" ", siteCol+stripSep)}
	for i, id := range ids {
		if i > 0 {
			head = append(head, " ")
		}
		heading := stripHeading(id)
		head = append(head, t.cell(RoleMuted, heading, t.Width(heading)))
	}
	out := []string{strings.TrimRight(row(head...), " ")}

	for _, r := range rs {
		byID := map[string]health.CheckResult{}
		for _, c := range r.Checks {
			byID[c.ID] = c
		}
		cells := []string{t.SizedStrong(RoleText, siteCol).Render(t.fitted(in.ASCII, r.Site, siteCol)), " "}
		for i, id := range ids {
			if i > 0 {
				cells = append(cells, " ")
			}
			n := t.Width(stripHeading(id))
			c, found := byID[id]
			if !found {
				cells = append(cells, t.centredCell(RoleMuted, t.glyphs(in.ASCII).Sep, n))
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

// fitted returns text sanitized and cut to n cells, marked with the tier's own ellipsis where it
// was cut, so a fixed column holds one line whatever a site chose to name itself. A cell left to
// wrap would push every column beside it onto a second line.
func (t Theme) fitted(ascii bool, text string, n int) string {
	text = Sanitize(text)
	if t.Width(text) <= n {
		return text
	}
	ell := t.glyphs(ascii).Ellipsis
	return t.Clamp(text, max(n-t.Width(ell), 0)) + ell
}

// rowVerdictRole returns the ink one site's verdict word takes inside a frame whose own verdict
// is frame. A site reporting OK inside a failing sweep is muted like every other passing mark:
// the only saturated ink on a failing screen belongs to what failed.
func rowVerdictRole(row, frame Verdict) Role {
	if row == spine.VerdictOK {
		return passRole(frame)
	}
	return verdictRole(row)
}

// centredCell renders one mark centred in a column measured by the layout's own width table, so
// the marks form a grid under their headings rather than hugging each column's left edge.
func (t Theme) centredCell(role Role, text string, n int) string {
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

// engineCheckID is the check whose outcome carries the installed engine version.
const engineCheckID = "engine"

// engineVersion returns the engine version r's own engine check measured, and empty where the
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
			return Sanitize(version)
		}
	}
	return ""
}

// tableBlock draws the plain ruleless table, the strip's own fallback below the width its
// headings need: one row per site, the verdict, the counts by state, and how old the data is. No
// rules, no boxes, and no glyph carrying a fact alone.
func (t Theme) tableBlock(in RenderInput, rs []health.Report, siteCol, width int) []string {
	widths := make([]int, len(tableColumns))
	headings := make([]string, len(tableColumns))
	for i, c := range tableColumns {
		widths[i], headings[i] = c.width, c.heading
		if i == 0 {
			widths[i] = siteCol + 2
		}
	}

	verdicts := make([]Verdict, 0, len(rs))
	rows := make([][]string, 0, len(rs))
	for _, r := range rs {
		s := split(r)
		v := siteVerdict(r)
		verdicts = append(verdicts, v)
		rows = append(rows, []string{
			t.fitted(in.ASCII, r.Site, siteCol), v.String(), blankZero(len(s.Failing)), blankZero(len(s.CouldNotRun)),
			blankZero(len(s.Held)), engineVersion(r), relative(in.Now.Sub(checkedAt(r, in.Now))) + " ago",
		})
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
		Width(min(total, width)).
		Wrap(false).
		StyleFunc(func(r, c int) lipgloss.Style {
			role, strong := tableRole(r, c, rows, verdicts, in.Verdict)
			if strong {
				return t.SizedStrong(role, widths[c])
			}
			return t.Sized(role, widths[c])
		})

	var out []string
	for l := range strings.SplitSeq(tb.String(), "\n") {
		if strings.TrimSpace(Sanitize(l)) == "" {
			continue
		}
		out = append(out, strings.TrimRight(l, " "))
	}
	return out
}

// tableRole returns the ink one table cell takes and whether it is set bold: the site and the
// verdict carry the row, a non-empty failing or could-not-run count takes the ink of the state
// it counts, and everything else is muted.
func tableRole(r, c int, rows [][]string, verdicts []Verdict, frame Verdict) (role Role, strong bool) {
	if r == table.HeaderRow {
		return RoleMuted, false
	}
	switch {
	case c == 0:
		return RoleText, true
	case c == 1:
		return rowVerdictRole(verdicts[r], frame), true
	case c == 2 && rows[r][c] != "":
		return RoleFailing, false
	case c == 3 && rows[r][c] != "":
		return RoleUnknown, false
	default:
		return RoleMuted, false
	}
}

// blankZero renders a count, and renders a zero as nothing at all.
func blankZero(n int) string {
	if n == 0 {
		return ""
	}
	return strconv.Itoa(n)
}

// The fleet fix list's own column budget. The sentence gets its own width: the site and the
// check name the fix on one line, and the sentence sits beneath them with a hanging indent, so
// it never has to share a line with two columns and leave a stray verb behind.
const (
	fixIndent   = 2
	fixArrowCol = 2
	fixCheckCol = 14
	fixSentence = 6
	// fixGutter is the space kept between the site and the check, which a long name may not eat.
	fixGutter = 2
)

// fleetFix is one repair the fleet screen prints, with the facts it is ranked and drawn by.
type fleetFix struct {
	// site is the sanitized name of the worst-ranked site the fix belongs to, the one the entry's
	// head line names.
	site string
	// alsoOn lists the remaining sites the same repair applies to, in the fleet's own ranked
	// order. It is empty for a repair that belongs to one site.
	alsoOn []string
	// siteRank is the site's own index in the ranked fleet, the tie-break between two fixes the
	// severity key cannot separate.
	siteRank int
	// check is the check id the fix is named by on its own line.
	check string
	// ids lists every check this one fix unblocks, set only where it covers more than one, so a
	// group says what it covers once rather than printing the same sentence per check.
	ids []string
	// tail is the muted field the head line ends on: the condition id where the check declared
	// one, and otherwise the variable naming the token whose absence blocked the group.
	tail string
	// class is the fix's severity class, the first key it is ranked by.
	class int
	// severity is spine's own state severity, the second key.
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
func (t Theme) fleetFixes(in RenderInput, rs []health.Report, width int) []string {
	siteCol := t.siteColWidth(rs) + 2
	var out []string
	for _, f := range rankFleetFixes(collectFleetFixes(in, rs)) {
		out = append(out, t.fixEntry(in, f, siteCol, width)...)
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
// the entry's own site list, in the fleet's ranked order, so nothing is lost.
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
		site := Sanitize(r.Site)
		s := split(r)
		for _, c := range s.Failing {
			fix, ok := health.FixFor(c.Outcome)
			if !ok {
				continue
			}
			add(fleetFix{
				site: site, siteRank: i, check: Sanitize(c.ID), tail: conditionID(c.Outcome),
				class: severityClass(c.ID), severity: c.Outcome.State.Severity(), fix: fix,
			})
		}
		for _, g := range groupBlockedFixes(s.CouldNotRun) {
			check := g.ids[0]
			switch vars := blockingVariables(in.Status, g.ids); len(vars) {
			case 0:
				// No single missing token's Disables list explains the whole group; the check id
				// stays, since the group was not blocked by a credential this run named.
			case 1:
				check = vars[0]
			default:
				check = wordTokens
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
	// fix is the shared fix.
	fix health.Fix
}

// groupBlockedFixes collects the fixes for one site's unobservable checks, one entry per
// distinct fix, naming every check it covers. A site whose whole sweep was skipped for one
// missing token is one entry, not nine: the token is what the operator fixes, once.
func groupBlockedFixes(blocked []health.CheckResult) []blockedGroup {
	var out []blockedGroup
	for _, c := range blocked {
		fix, ok := health.FixFor(c.Outcome)
		if !ok {
			fix, ok = health.FixForReason(c.Outcome.Reason)
		}
		if !ok || fix.Text == "" {
			continue
		}
		id := Sanitize(c.ID)
		found := false
		for i := range out {
			if out[i].fix == fix {
				out[i].ids = append(out[i].ids, id)
				found = true
				break
			}
		}
		if !found {
			out = append(out, blockedGroup{ids: []string{id}, tail: conditionID(c.Outcome), fix: fix})
		}
	}
	return out
}

// blockingVariables returns the missing tokens' own variables that, taken together, explain
// every check in ids, one entry per token that disables at least one of them, or nil where the
// group is not fully explained by a missing token this run named. A length of one is the case a
// grouped entry names on its own head line; a length above one is what tells the caller to fall
// back to the collective word instead of naming a token that does not cover the whole group.
func blockingVariables(s StatusState, ids []string) []string {
	if len(ids) == 0 {
		return nil
	}
	var vars []string
	covered := map[string]bool{}
	for _, c := range s.Credentials {
		if !c.missing() {
			continue
		}
		contributes := false
		for _, id := range ids {
			if slices.Contains(c.Disables, id) {
				covered[id] = true
				contributes = true
			}
		}
		if contributes {
			vars = append(vars, Sanitize(c.Variable))
		}
	}
	if len(covered) < len(ids) {
		return nil
	}
	return vars
}

// rankFleetFixes orders the list by the one severity key, with every fix for a check that could
// not run listed after the failures: a check blocked by a missing setting is a thing the
// operator can fix, and it was invisible on the fleet screen before it was listed at all.
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

// fixEntry draws one repair: the site and the check on one line with the greppable handle after
// them, the sentence beneath with a hanging indent, and, for a fix covering more than one check,
// the checks it covers.
//
// The check name carries the documentation link here rather than a printed URL: a fleet list is
// an index, and `cairn health <site>` is where the full fix with its URL lives.
func (t Theme) fixEntry(in RenderInput, f fleetFix, siteCol, width int) []string {
	// The check cell takes a fixed width only where something follows it. A padded cell at the
	// end of a line is trailing whitespace inside a styled block, which no trim can reach and
	// every golden would carry.
	checkCol := fixCheckCol
	if f.tail == "" {
		checkCol = t.Width(f.check)
	}
	nameCell := t.Sized(RoleMuted, checkCol)
	if url := fixURL(f.fix); url != "" && in.Profile != ProfileNoColor && linkable(url) {
		nameCell = t.SizedLink(RoleMuted, url, checkCol)
	}
	head := row(
		strings.Repeat(" ", fixIndent),
		t.cell(RoleAccent, t.glyphs(in.ASCII).Arrow, fixArrowCol),
		t.SizedStrong(RoleText, siteCol).Render(t.fitted(in.ASCII, f.site, siteCol-fixGutter)),
		nameCell.Render(t.fitted(in.ASCII, f.check, checkCol)),
		t.Style(RoleMuted).Render(f.tail),
	)
	out := []string{strings.TrimRight(head, " ")}
	out = append(out, atColumn(t.Style(RoleSubtle), fixSentence,
		t.wrapNoOrphan(Sanitize(f.fix.Text), width-fixSentence))...)
	// A merged entry can cover, or list "also on:", as many sites as the fleet holds: one shared
	// token disables the same checks fleet-wide, so both lists below wrap through wrapNoOrphan
	// rather than plain wrap, the same guard the sentence above already takes.
	if len(f.ids) > 1 {
		out = append(out, atColumn(t.Style(RoleMuted), fixSentence,
			t.wrapNoOrphan(keyFixFor+strings.Join(f.ids, ", "), width-fixSentence))...)
	}
	if len(f.alsoOn) > 0 {
		lead := strings.Repeat(" ", fixSentence) + t.Style(RoleMuted).Render(labelAlsoOn)
		out = append(out, t.hangingAtNoOrphan(t.Style(RoleMuted), lead, fixSentence+t.Width(labelAlsoOn),
			strings.Join(f.alsoOn, ", "), width)...)
	}
	return out
}

// hangingAtNoOrphan is layout.go's hangingAt through wrapNoOrphan rather than wrap: a fleet-wide
// "also on:" list is exactly the comma-joined shape a naive break can leave one site name
// dangling on, which wrapNoOrphan already exists to prevent for the sentence above it.
func (t Theme) hangingAtNoOrphan(st lipgloss.Style, lead string, col int, text string, width int) []string {
	body := t.wrapNoOrphan(text, width-col)
	pad := strings.Repeat(" ", col)
	out := make([]string, 0, len(body))
	for i, l := range body {
		if i == 0 {
			out = append(out, lead+st.Render(l))
			continue
		}
		out = append(out, pad+st.Render(l))
	}
	return out
}
