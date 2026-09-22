package health

import "github.com/glw907/cairn-cms/tool/internal/spine"

// failSeverity names, per check id, the weight that check's own Failing outcome carries. It sits
// beside All because the two must cover the same set, which severity_test.go asserts: a tenth
// check cannot land without an entry here.
//
// engine is the one WARNING. A site a release or two behind still serves every page it served
// yesterday, so a failing engine check is work to schedule rather than a fault to be woken for,
// and paging an operator for it nightly is what teaches them to ignore the routine.
//
// creds stays CRITICAL even when the only fault is a token nearing its expiry. The window to fix
// it closes on its own, and every run after it closes observes nothing at all, so an expiring
// token is a fault the operator can still fix before it lands rather than one to sit on.
var failSeverity = map[string]spine.FailSeverity{
	"creds":        spine.CriticalFailure,
	"serving":      spine.CriticalFailure,
	"delegation":   spine.CriticalFailure,
	"https-forced": spine.CriticalFailure,
	"email":        spine.CriticalFailure,
	"deploy":       spine.CriticalFailure,
	"publish-path": spine.CriticalFailure,
	"engine":       spine.WarningFailure,
	"errors":       spine.CriticalFailure,
}

// FailSeverityOf returns the weight a Failing outcome from the check named id carries. An id the
// table does not name reports spine.CriticalFailure, so a check that somehow reached a run
// without a severity is reported at full weight rather than silently softened.
func FailSeverityOf(id string) spine.FailSeverity {
	return failSeverity[id]
}

// Verdicts reduces r to the per-check subset spine's exit arithmetic reads, carrying each
// check's declared fail severity. It is the one report-to-verdict conversion in the module:
// spine holds the arithmetic and never learns a check id, so the id-keyed half belongs here,
// and a second conversion elsewhere could disagree with the exit code a routine reads.
func Verdicts(r Report) spine.SiteVerdicts {
	vs := make(spine.SiteVerdicts, 0, len(r.Checks))
	for _, c := range r.Checks {
		vs = append(vs, spine.CheckVerdict{
			ID:           c.ID,
			State:        c.Outcome.State,
			Reason:       c.Outcome.Reason,
			Acknowledged: c.Acknowledged,
			Severity:     FailSeverityOf(c.ID),
		})
	}
	return vs
}
