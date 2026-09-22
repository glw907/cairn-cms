package render

import (
	"slices"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestSeverityClassCoversEveryShippedCheck asserts every id in health.All has a class of its own
// rather than falling to the unclassed default, so a check added without a ranking decision is a
// failing test rather than a row silently sorted next to version drift.
func TestSeverityClassCoversEveryShippedCheck(t *testing.T) {
	for _, c := range health.All {
		if _, found := checkClasses[c.ID()]; !found {
			t.Errorf("check %q has no severity class", c.ID())
		}
	}
}

// TestSeverityClassOrder pins the five classes against the checks each covers, so a later edit
// that moves a check between classes has to say so here.
func TestSeverityClassOrder(t *testing.T) {
	tests := []struct {
		id   string
		want int
	}{
		{"serving", classUnreachable},
		{"delegation", classUnreachable},
		{"publish-path", classPublish},
		{"deploy", classPublish},
		{"https-forced", classService},
		{"email", classService},
		{"errors", classService},
		{"creds", classCredentials},
		{"engine", classDrift},
		{"a-check-nobody-has-ranked", unclassedClass},
	}
	for _, tt := range tests {
		t.Run(tt.id, func(t *testing.T) {
			if got := severityClass(tt.id); got != tt.want {
				t.Errorf("severityClass(%q) = %d, want %d", tt.id, got, tt.want)
			}
		})
	}
}

// TestCriticalFailure asserts the two-severity predicate: a failure of a check whose class is
// above credentials carries a run to CRITICAL, and credentials and version drift do not.
func TestCriticalFailure(t *testing.T) {
	for _, id := range []string{"serving", "delegation", "publish-path", "deploy", "https-forced", "email", "errors"} {
		if !criticalFailure(id) {
			t.Errorf("criticalFailure(%q) = false, want true", id)
		}
	}
	for _, id := range []string{"creds", "engine", "a-check-nobody-has-ranked"} {
		if criticalFailure(id) {
			t.Errorf("criticalFailure(%q) = true, want false", id)
		}
	}
}

// TestRankAgreesWithStateSeverity asserts the render's key agrees with spine.State.Severity
// where the two overlap: inside one severity class, a failing check always ranks above an
// unobservable one, which is the module's one severity order read through this package's key.
func TestRankAgreesWithStateSeverity(t *testing.T) {
	in := []health.CheckResult{
		{ID: "email", Outcome: spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCredMissing}},
		{ID: "errors", Outcome: spine.Outcome{State: spine.Failing, Code: spine.CodeErrorsAboveThreshold}},
	}
	got := rankResults(in)
	for i := 1; i < len(got); i++ {
		a, b := got[i-1], got[i]
		if severityClass(a.ID) != severityClass(b.ID) {
			continue
		}
		if a.Outcome.State.Severity() < b.Outcome.State.Severity() {
			t.Errorf("inside class %d, %q (severity %d) ranked above %q (severity %d)",
				severityClass(a.ID), a.ID, a.Outcome.State.Severity(), b.ID, b.Outcome.State.Severity())
		}
	}
}

// TestRankResultsTieBreak asserts the exact order on a fixture built with a deliberate tie: two
// failing checks in one class, separated by nothing but their ids, plus one unobservable check in
// the same class that the state key has to rank beneath both.
func TestRankResultsTieBreak(t *testing.T) {
	in := []health.CheckResult{
		{ID: "errors", Outcome: spine.Outcome{State: spine.Failing}},
		{ID: "email", Outcome: spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCredMissing}},
		{ID: "https-forced", Outcome: spine.Outcome{State: spine.Failing}},
		{ID: "serving", Outcome: spine.Outcome{State: spine.Failing}},
		{ID: "engine", Outcome: spine.Outcome{State: spine.Failing}},
	}
	want := []string{"serving", "errors", "https-forced", "email", "engine"}
	var got []string
	for _, c := range rankResults(in) {
		got = append(got, c.ID)
	}
	if !slices.Equal(got, want) {
		t.Errorf("rankResults order = %v, want %v", got, want)
	}
}

// TestRankResultsDoesNotMutate asserts ranking returns a new slice: the sweep's own order is the
// registry's and the render must not rewrite it in place.
func TestRankResultsDoesNotMutate(t *testing.T) {
	in := []health.CheckResult{
		{ID: "engine", Outcome: spine.Outcome{State: spine.Failing}},
		{ID: "serving", Outcome: spine.Outcome{State: spine.Failing}},
	}
	rankResults(in)
	if in[0].ID != "engine" {
		t.Errorf("input reordered in place: first id = %q, want %q", in[0].ID, "engine")
	}
}

// TestRankReportsWorstFirstThenListOrder asserts sites rank by their worst live failure, and
// that two sites whose worst failures share a class keep the order the registry listed them in.
func TestRankReportsWorstFirstThenListOrder(t *testing.T) {
	got := rankReports(fixtures.TwelveSites())
	if got[0].Site != "topo.907.life" {
		t.Errorf("first site = %q, want the unreachable one", got[0].Site)
	}
	if got[1].Site != "907.life" {
		t.Errorf("second site = %q, want the broken deploy", got[1].Site)
	}
	if got[2].Site != "aksailingclub.org" {
		t.Errorf("third site = %q, want the email failure", got[2].Site)
	}
	// cairn.pub and xcathletes.org both fail engine alone, so the registry's own order decides.
	drift := []string{}
	for _, r := range got {
		if worstClass(r) == classDrift {
			drift = append(drift, r.Site)
		}
	}
	if !slices.Equal(drift, []string{"cairn.pub", "xcathletes.org"}) {
		t.Errorf("version-drift sites = %v, want registry order", drift)
	}
}

// TestWorstClassIgnoresHeldFailures asserts a held failure does not rank a site: a hold is the
// operator saying they have weighed it, so it must not push the site above one nobody has.
func TestWorstClassIgnoresHeldFailures(t *testing.T) {
	if got := worstClass(fixtures.OneSick()[0]); got != classPublish {
		t.Errorf("worstClass = %d, want %d: the held https-forced failure must not rank the site", got, classPublish)
	}
}
