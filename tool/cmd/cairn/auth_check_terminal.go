package main

import (
	"fmt"
	"strings"

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
	out := head
	section := func(title, mark string, role style.Role, group []checkRow, fix bool) {
		if len(group) == 0 {
			return
		}
		out = append(append(out, ""), style.Title(t, title, v.width)...)
		for _, r := range group {
			detail := r.Credential
			if r.display != "" {
				detail += " " + v.marks.Sep + " " + r.display
			}
			out = append(out, style.MarkRow(t, mark, role, r.Label, detail, v.width)...)
			if fix {
				out = append(out, style.FixLine(t, fmt.Sprintf(tmplAuthCheckFix, r.Label, r.Credential), "", t.DetailColumn(r.Label, v.width), v.width)...)
			}
		}
	}
	section(labelCheckFailing, failMark, failRole, failing, true)
	section(labelCheckCouldNotRun, v.marks.CouldNotRun, style.RoleUnknown, unknown, false)
	section(labelCheckPassing, v.marks.Pass, passRole, passing, false)
	return append(append(out, ""), head...)
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
