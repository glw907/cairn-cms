package health

import (
	"slices"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestFailSeverityCoversExactlyTheCheckSet asserts the table names every check in All and no id
// outside it. Without this a tenth check would land with no severity row and be reported at the
// map's zero value, which nobody would have chosen for it.
func TestFailSeverityCoversExactlyTheCheckSet(t *testing.T) {
	for _, check := range All {
		if _, ok := failSeverity[check.ID()]; !ok {
			t.Errorf("check %q has no entry in failSeverity", check.ID())
		}
	}
	for id := range failSeverity {
		if !slices.ContainsFunc(All, func(c Check) bool { return c.ID() == id }) {
			t.Errorf("failSeverity names %q, which is not a check in All", id)
		}
	}
}

// TestEngineIsTheOnlyWarningFailure pins which failures a routine may leave until morning. It is
// written as an explicit list rather than a count so promoting or demoting a check is a diff a
// reviewer reads.
func TestEngineIsTheOnlyWarningFailure(t *testing.T) {
	var warning []string
	for id, s := range failSeverity {
		if s == spine.WarningFailure {
			warning = append(warning, id)
		}
	}
	slices.Sort(warning)
	if !slices.Equal(warning, []string{"engine"}) {
		t.Errorf("WARNING-class failures = %v, want [engine]", warning)
	}
}

// TestFailSeverityOfAnUnknownCheckIsCritical covers the map's own miss: a check id nothing
// declares is reported at full weight, never softened by accident.
func TestFailSeverityOfAnUnknownCheckIsCritical(t *testing.T) {
	if got := FailSeverityOf("no-such-check"); got != spine.CriticalFailure {
		t.Errorf("FailSeverityOf(%q) = %v, want CriticalFailure", "no-such-check", got)
	}
}

// severityNow is the instant the holds in this file are measured against.
func severityNow() time.Time {
	return time.Date(2026, 9, 21, 12, 0, 0, 0, time.UTC)
}

// failing returns a failing result for id carrying code.
func failing(id string, code spine.Code) CheckResult {
	return CheckResult{ID: id, Outcome: spine.Outcome{State: spine.Failing, Code: code}}
}

// TestVerdictsCarryTheSeverityTable is the criterion's own table: the whole-run verdict for one
// site, read through the same conversion and arithmetic cairn health exits on.
//
// The engine row is the tier this task adds. The creds row is the deliberate counter-case: a
// GitHub token nearing its expiry fails the creds check, and it stays CRITICAL, because the
// window to fix it closes on its own and every run after it closes observes nothing. It reaches
// the report as spine.CodeCredsExpiringSoon rather than as a reason code, since spine.Outcome
// carries a Reason only on an Unknown state.
func TestVerdictsCarryTheSeverityTable(t *testing.T) {
	held := failing("deploy", spine.CodeDeployBuildFailed)
	held.Acknowledged = true
	held.AckExpires = severityNow().Add(24 * time.Hour)

	lapsed := failing("deploy", spine.CodeDeployBuildFailed)
	lapsed.AckExpires = severityNow().Add(-24 * time.Hour)

	tests := []struct {
		name   string
		checks []CheckResult
		want   spine.Verdict
	}{
		{"no site at all, which is what an empty registry produces", nil, spine.VerdictUnknown},
		{
			"version drift alone",
			[]CheckResult{{ID: "serving", Outcome: spine.Outcome{State: spine.OK}}, failing("engine", spine.CodeEngineBehind)},
			spine.VerdictWarning,
		},
		{
			"an expiring GitHub token alone",
			[]CheckResult{{ID: "serving", Outcome: spine.Outcome{State: spine.OK}}, failing("creds", spine.CodeCredsExpiringSoon)},
			spine.VerdictCritical,
		},
		{
			"version drift beside a build failure",
			[]CheckResult{failing("engine", spine.CodeEngineBehind), failing("deploy", spine.CodeDeployBuildFailed)},
			spine.VerdictCritical,
		},
		{"an acknowledged failing check", []CheckResult{held}, spine.VerdictWarning},
		{"the same check with an expired acknowledgement", []CheckResult{lapsed}, spine.VerdictCritical},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var sites []spine.SiteVerdicts
			if tt.checks != nil {
				sites = []spine.SiteVerdicts{Verdicts(Report{Checks: tt.checks})}
			}
			var listErrs []error
			if tt.checks == nil {
				listErrs = []error{spine.ErrExpectSites}
			}
			if got := spine.ExitCode(sites, listErrs, 0); got != tt.want {
				t.Errorf("ExitCode = %v (%d), want %v (%d)", got, int(got), tt.want, int(tt.want))
			}
		})
	}
}
