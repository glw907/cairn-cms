package health

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// validOptions is the minimal Options every test in this package that does not itself exercise
// Options.Validate needs to pass Run's zero-value rejection.
var validOptions = Options{ErrorThreshold: 1, LogWindow: time.Minute, Now: fixedNow}

// fixedNow is the clock every test in this package sweeps against so a settled CheckResult's
// CheckedAt, and every age a check measures, is reproducible.
func fixedNow() time.Time {
	return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
}

// fixedOutcomeCheck is a Check whose Run always returns a fixed spine.Outcome, standing in for a
// real check in a test that only needs to observe Run's own orchestration.
type fixedOutcomeCheck struct {
	id      string
	tier    Tier
	outcome spine.Outcome
}

func (c fixedOutcomeCheck) ID() string  { return c.id }
func (c fixedOutcomeCheck) Needs() Tier { return c.tier }
func (c fixedOutcomeCheck) Run(context.Context, record.Record, Clients, Options) spine.Outcome {
	return c.outcome
}

// cancelingCheck cancels its own run's context before returning, standing in for the real-world
// deadline or Ctrl-C a running sweep can hit mid-check.
type cancelingCheck struct {
	id     string
	cancel context.CancelFunc
}

func (c cancelingCheck) ID() string { return c.id }
func (cancelingCheck) Needs() Tier  { return TierNone }
func (c cancelingCheck) Run(context.Context, record.Record, Clients, Options) spine.Outcome {
	c.cancel()
	return spine.Outcome{State: spine.OK}
}

// panickingCheck panics with value on every Run call, standing in for a check with a bug that
// must not take the rest of the sweep down with it.
type panickingCheck struct{ value any }

func (panickingCheck) ID() string  { return "panics" }
func (panickingCheck) Needs() Tier { return TierNone }
func (c panickingCheck) Run(context.Context, record.Record, Clients, Options) spine.Outcome {
	panic(c.value)
}

// statefulStubCheck counts its own invocations and folds the count into its Outcome, standing in
// for a check that (unlike creds) carries mutable state. TestRunIsPureOverItsInputs gives each of
// its two Run calls a fresh instance with its own zeroed counter, so the resulting reports are
// identical only if Run itself calls each check's Run method exactly once per sweep and
// introduces no hidden state of its own between separate calls.
type statefulStubCheck struct {
	calls *int
}

func (statefulStubCheck) ID() string  { return "stub" }
func (statefulStubCheck) Needs() Tier { return TierNone }
func (c statefulStubCheck) Run(context.Context, record.Record, Clients, Options) spine.Outcome {
	*c.calls++
	return spine.Outcome{State: spine.OK, Detail: fmt.Sprintf("call %d", *c.calls)}
}

func TestRunOnCheckCallbackFiresOncePerCheckInOrder(t *testing.T) {
	checks := []Check{
		fixedOutcomeCheck{id: "a", outcome: spine.Outcome{State: spine.OK}},
		fixedOutcomeCheck{id: "b", outcome: spine.Outcome{State: spine.OK}},
		fixedOutcomeCheck{id: "c", outcome: spine.Outcome{State: spine.OK}},
	}
	var seen []string
	opts := validOptions
	opts.OnCheck = func(cr CheckResult) { seen = append(seen, cr.ID) }

	if _, err := Run(context.Background(), record.Record{}, Clients{}, checks, opts, nil); err != nil {
		t.Fatalf("Run: %v", err)
	}

	want := []string{"a", "b", "c"}
	if !slices.Equal(seen, want) {
		t.Errorf("OnCheck saw %v, want %v", seen, want)
	}
}

func TestRunNilOnCheckRunsUnchanged(t *testing.T) {
	checks := []Check{fixedOutcomeCheck{id: "a", outcome: spine.Outcome{State: spine.OK}}}

	report, err := Run(context.Background(), record.Record{}, Clients{}, checks, validOptions, nil)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(report.Checks) != 1 || report.Checks[0].ID != "a" {
		t.Errorf("Checks = %+v, want one result for %q", report.Checks, "a")
	}
}

// TestRunPartialResultsOnCancelledContext cancels the context from inside the first of three
// checks and asserts the report still carries all three: the first with its real outcome, and
// the remaining two Unknown with reason.not-run rather than dropped.
func TestRunPartialResultsOnCancelledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	checks := []Check{
		cancelingCheck{id: "first", cancel: cancel},
		fixedOutcomeCheck{id: "second", outcome: spine.Outcome{State: spine.OK}},
		fixedOutcomeCheck{id: "third", outcome: spine.Outcome{State: spine.OK}},
	}

	report, err := Run(ctx, record.Record{}, Clients{}, checks, validOptions, nil)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(report.Checks) != 3 {
		t.Fatalf("len(Checks) = %d, want 3", len(report.Checks))
	}
	if got := report.Checks[0]; got.ID != "first" || got.Outcome.State != spine.OK {
		t.Errorf("Checks[0] = %+v, want the settled first check", got)
	}
	for i, id := range []string{"second", "third"} {
		got := report.Checks[i+1]
		if got.ID != id {
			t.Errorf("Checks[%d].ID = %q, want %q", i+1, got.ID, id)
		}
		if got.Outcome.State != spine.Unknown || got.Outcome.Reason != spine.ReasonNotRun {
			t.Errorf("Checks[%d].Outcome = %+v, want Unknown/reason.not-run", i+1, got.Outcome)
		}
	}
}

// TestRunRecoversPanickingCheck asserts a panicking check reports Unknown/reason.not-run and
// that the recovered value's contents never reach the report, even in a verbose render.
func TestRunRecoversPanickingCheck(t *testing.T) {
	type sentinel struct{ secret string }
	checks := []Check{panickingCheck{value: sentinel{secret: "do-not-leak-me"}}}

	report, err := Run(context.Background(), record.Record{}, Clients{}, checks, validOptions, nil)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(report.Checks) != 1 {
		t.Fatalf("len(Checks) = %d, want 1", len(report.Checks))
	}
	cr := report.Checks[0]
	if cr.Outcome.State != spine.Unknown || cr.Outcome.Reason != spine.ReasonNotRun {
		t.Errorf("Outcome = %+v, want Unknown/reason.not-run", cr.Outcome)
	}

	data, err := report.JSON(true)
	if err != nil {
		t.Fatalf("JSON(true): %v", err)
	}
	if strings.Contains(string(data), "do-not-leak-me") {
		t.Error("the recovered panic value's contents leaked into the report")
	}
}

func TestRunSkipsCheckWhoseTierClientIsAbsentAndSetsDegraded(t *testing.T) {
	checks := []Check{fixedOutcomeCheck{id: "cf-only", tier: TierCF, outcome: spine.Outcome{State: spine.OK}}}

	report, err := Run(context.Background(), record.Record{}, Clients{HaveCF: false}, checks, validOptions, nil)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	cr := report.Checks[0]
	if cr.Outcome.State != spine.Unknown || cr.Outcome.Reason != spine.ReasonCredMissing {
		t.Errorf("Outcome = %+v, want Unknown/reason.cred-missing", cr.Outcome)
	}
	if !report.Degraded {
		t.Error("Degraded = false, want true for a cred-missing skip")
	}
}

func TestRunDegradedClearForNonCredMissingUnknown(t *testing.T) {
	checks := []Check{fixedOutcomeCheck{id: "timeout", outcome: spine.Outcome{State: spine.Unknown, Reason: spine.ReasonTimeout}}}

	report, err := Run(context.Background(), record.Record{}, Clients{}, checks, validOptions, nil)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if report.Degraded {
		t.Error("Degraded = true, want false for a report whose only Unknown is a timeout")
	}
}

// TestRunIsPureOverItsInputs runs the whole All set plus a fresh statefulStubCheck twice, each
// against its own zeroed counter and the same fixed clock, and asserts the two reports render to
// byte-identical JSON.
func TestRunIsPureOverItsInputs(t *testing.T) {
	clients := okCredsClients()
	r := record.Record{Name: "site", Domain: "example.com"}

	run := func() Report {
		checks := append(slices.Clone(All), statefulStubCheck{calls: new(int)})
		report, err := Run(context.Background(), r, clients, checks, validOptions, nil)
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		return report
	}

	first, err := run().JSON(true)
	if err != nil {
		t.Fatalf("JSON(true): %v", err)
	}
	second, err := run().JSON(true)
	if err != nil {
		t.Fatalf("JSON(true): %v", err)
	}
	if string(first) != string(second) {
		t.Errorf("two Run calls over equivalent fresh inputs produced different reports:\n%s\n---\n%s", first, second)
	}
}
