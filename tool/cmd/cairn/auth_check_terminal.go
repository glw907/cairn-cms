package main

import (
	"fmt"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/health"
	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// authCheckLines is cairn auth check on a terminal: the verdict line the run exits on, then the
// permissions that failed with their fix on the arrow, those that could not run, and those that
// passed folded to one row each, and the verdict line again to close. A permission folds into
// the group its state names, so the groups and the tally cannot disagree with the rows.
func authCheckLines(v view, rows []checkRow, verdict spine.Verdict, siteID string) []string {
	t := v.t
	var failing, unknown, passing []checkRow
	for _, r := range rows {
		switch r.verdict.State {
		case spine.Failing:
			failing = append(failing, r)
		case spine.Unknown:
			unknown = append(unknown, r)
		default:
			passing = append(passing, r)
		}
	}
	var parts []string
	for _, g := range []struct {
		n    int
		word string
	}{{len(failing), labelCheckFailing}, {len(unknown), labelCheckCouldNotRun}, {len(passing), labelCheckPassing}} {
		if g.n > 0 || g.word == labelCheckPassing {
			parts = append(parts, fmt.Sprintf("%d %s", g.n, g.word))
		}
	}
	head := style.VerdictLine(t, verdict.String(), checkVerdictRole(verdict), siteID, strings.Join(parts, " "+v.marks.Sep+" "), v.width)

	// A failing row's mark follows the verdict, as a health check's does: filled when the run is
	// CRITICAL and outlined when it only warns. Nothing passing is green under a failure.
	failMark, failRole := v.marks.FailingWarn, style.RoleUnknown
	if verdict == spine.VerdictCritical {
		failMark, failRole = v.marks.Failing, style.RoleFailing
	}
	passRole := style.RoleMuted
	if verdict == spine.VerdictOK {
		passRole = style.RoleOK
	}
	// One table sizes every row's label and credential columns, so the three groups line up. Its
	// header is blank and dropped, and the rows sit two cells in to leave the mark its margin.
	cells := make([][]string, 0, len(rows))
	for _, g := range [][]checkRow{failing, unknown, passing} {
		for _, r := range g {
			cells = append(cells, []string{r.Label, r.Credential})
		}
	}
	table := style.Table(t, []string{"", ""}, cells, v.width-2)[1:]
	out := head
	section := func(title, mark string, role style.Role, group []checkRow, fix bool) {
		if len(group) == 0 {
			return
		}
		out = append(append(out, ""), style.Title(t, title, v.width)...)
		for _, r := range group {
			out = append(out, "  "+t.Style(role).Render(mark)+" "+table[0][2:])
			table = table[1:]
			if r.display != "" {
				out = append(out, style.ContinuationLine(t, style.RoleSubtle, authCheckDetail(r.display), authCheckTextCol, v.width)...)
			}
			// A rejected token lacks no permission, so the permission fix would misdirect it.
			if fix && r.display != providers.ReasonUnauthorized.String() {
				out = append(out, style.FixLine(t, fmt.Sprintf(tmplAuthCheckFix, r.Label, r.Credential), "", authCheckTextCol, v.width)...)
			}
		}
	}
	section(labelCheckFailing, failMark, failRole, failing, true)
	section(labelCheckCouldNotRun, v.marks.CouldNotRun, style.RoleUnknown, unknown, false)
	// One missing credential can block several rows, so the group carries its fix once.
	if slices.ContainsFunc(unknown, func(r checkRow) bool {
		return r.verdict.Reason == spine.ReasonCredMissing && r.display != authCheckSiteRequiredReason
	}) {
		if fix, ok := health.FixForReason(spine.ReasonCredMissing); ok {
			out = append(out, style.FixLine(t, fix.Text, "", authCheckTextCol, v.width)...)
		}
	}
	section(labelCheckPassing, v.marks.Pass, passRole, passing, false)
	return append(append(out, ""), head...)
}

// authCheckTextCol is where a permission's label, its detail, and its fix sit: the column
// style.MarkRow puts a name at, after the mark and one space.
const authCheckTextCol = 4

// authCheckDetail turns a row's display into the words a terminal shows. A reason that reached the
// row as its stable machine token reads as the prose the health checks print for the same reason,
// and every other display already is prose.
func authCheckDetail(display string) string {
	if display == "unreachable" {
		return health.ReasonPhrase(spine.ReasonOffline)
	}
	for _, r := range providers.Reasons() {
		if r.String() == display {
			return health.ReasonPhrase(spine.APIReason(r))
		}
	}
	return display
}

// checkVerdictRole is the ink a verdict word takes: full saturation for CRITICAL alone, and green
// only for a run that is itself OK.
func checkVerdictRole(v spine.Verdict) style.Role {
	switch v {
	case spine.VerdictCritical:
		return style.RoleFailing
	case spine.VerdictOK:
		return style.RoleOK
	default:
		return style.RoleUnknown
	}
}
