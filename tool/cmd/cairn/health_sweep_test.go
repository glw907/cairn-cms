package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestSweepDeadlineDefaultSizing covers the arithmetic the 2026-09-20 amendment corrected: the
// default whole-run budget is the single-site budget times the site count, capped at
// maxSweepTimeout, never the single-site budget divided by the count.
func TestSweepDeadlineDefaultSizing(t *testing.T) {
	tests := []struct {
		name      string
		perSite   time.Duration
		siteCount int
		want      time.Duration
	}{
		{"four sites at the default stays under the cap", defaultTimeout, 4, defaultTimeout * 4},
		{"ten sites at the default is capped", defaultTimeout, 10, maxSweepTimeout},
		{"an empty registry still gets one site's worth of budget", defaultTimeout, 0, defaultTimeout},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rf := &rootFlags{timeout: tt.perSite}
			ctx, cancel := sweepDeadline(context.Background(), rf, tt.siteCount)
			defer cancel()

			deadline, ok := ctx.Deadline()
			if !ok {
				t.Fatal("sweepDeadline returned a context with no deadline")
			}
			got := time.Until(deadline)
			// A few milliseconds of test overhead separate "now" from the moment
			// sweepDeadline computed the deadline, so this checks the budget landed within a
			// tolerance rather than to the nanosecond.
			if diff := tt.want - got; diff < -time.Second || diff > time.Second {
				t.Errorf("sweepDeadline budget = %s, want close to %s", got, tt.want)
			}
		})
	}
}

// TestSweepDeadlineExplicitTimeoutIsTheWholeRunBudget asserts an explicit --timeout is taken
// exactly as given, not multiplied by the site count.
func TestSweepDeadlineExplicitTimeoutIsTheWholeRunBudget(t *testing.T) {
	rf := &rootFlags{timeout: 30 * time.Second, timeoutSet: true}
	ctx, cancel := sweepDeadline(context.Background(), rf, 10)
	defer cancel()

	deadline, ok := ctx.Deadline()
	if !ok {
		t.Fatal("sweepDeadline returned a context with no deadline")
	}
	if got := time.Until(deadline); got > 30*time.Second || got < 29*time.Second {
		t.Errorf("sweepDeadline budget = %s, want close to 30s", got)
	}
}

// TestSiteBudgetDividesOnlyWhenExplicit is the divide-only-when-explicit rule at the unit level:
// the default sizing gives every site the full single-site budget regardless of how many sites
// remain, and an explicit --timeout divides the envelope's remaining time by the sites still to
// run.
func TestSiteBudgetDividesOnlyWhenExplicit(t *testing.T) {
	t.Run("default sizing gives the full budget however many sites remain", func(t *testing.T) {
		rf := &rootFlags{timeout: defaultTimeout}
		envelope, cancel := context.WithTimeout(context.Background(), defaultTimeout*5)
		defer cancel()

		for _, remaining := range []int{1, 5} {
			ctx, siteCancel := siteBudget(envelope, rf, remaining)
			deadline, ok := ctx.Deadline()
			siteCancel()
			if !ok {
				t.Fatal("siteBudget returned a context with no deadline")
			}
			if got := time.Until(deadline); got > defaultTimeout || got < defaultTimeout-time.Second {
				t.Errorf("remaining=%d: site budget = %s, want close to the full %s", remaining, got, defaultTimeout)
			}
		}
	})

	t.Run("an explicit timeout divides the envelope by the sites still to run", func(t *testing.T) {
		rf := &rootFlags{timeout: 100 * time.Second, timeoutSet: true}
		envelope, cancel := context.WithTimeout(context.Background(), 100*time.Second)
		defer cancel()

		ctx, siteCancel := siteBudget(envelope, rf, 4)
		deadline, ok := ctx.Deadline()
		siteCancel()
		if !ok {
			t.Fatal("siteBudget returned a context with no deadline")
		}
		want := 25 * time.Second
		if got := time.Until(deadline); got > want+time.Second || got < want-time.Second {
			t.Errorf("site budget = %s, want close to %s (100s / 4 remaining)", got, want)
		}
	})
}

// TestHealthSweepRunsEverySiteInListOrder covers criterion 6: bare `cairn health` prints three
// reports in store.List order (by Record.Name, id as tiebreak), never registration order.
func TestHealthSweepRunsEverySiteInListOrder(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "site-charlie-cccccc", "charlie.example", "charlie")
	writeTestRecord(t, d, "site-alpha-aaaaaa", "alpha.example", "alpha")
	writeTestRecord(t, d, "site-bravo-bbbbbb", "bravo.example", "bravo")

	out, _, err := execTree(t, d, "health")
	if err != nil {
		t.Fatalf("cairn health: %v", err)
	}

	positions := map[string]int{}
	for _, domain := range []string{"alpha.example", "bravo.example", "charlie.example"} {
		pos := strings.Index(out, domain)
		if pos < 0 {
			t.Fatalf("output %q does not name %s", out, domain)
		}
		positions[domain] = pos
	}
	if positions["alpha.example"] >= positions["bravo.example"] || positions["bravo.example"] >= positions["charlie.example"] {
		t.Errorf("sites printed out of List order: %v", positions)
	}
}

// TestHealthSweepCompletesAtTheDefaultOnFourAndTenSites is the end-to-end proof behind
// TestSweepDeadlineDefaultSizing's arithmetic: bare `cairn health` over registries too large for
// the old divide-always rule (which gave a four-site sweep 30 seconds a site and a ten-site sweep
// 12, both under the transport's own request timeout) completes with no site reported
// reason.timeout, because every site now gets the full single-site budget regardless of how many
// others are registered.
func TestHealthSweepCompletesAtTheDefaultOnFourAndTenSites(t *testing.T) {
	for _, n := range []int{4, 10} {
		t.Run(fmt.Sprintf("%d sites", n), func(t *testing.T) {
			d, _ := testDeps(t)
			for i := range n {
				id := fmt.Sprintf("site-s%02d-aaaaaa", i)
				writeTestRecord(t, d, id, fmt.Sprintf("s%02d.example", i), fmt.Sprintf("worker%02d", i))
			}

			out, _, err := execTree(t, d, "health")
			if err != nil {
				t.Fatalf("cairn health: %v", err)
			}
			if strings.Contains(out, "reason.timeout") {
				t.Errorf("output %q names a site reason.timeout at the default sizing over %d sites", out, n)
			}
			for i := range n {
				domain := fmt.Sprintf("s%02d.example", i)
				if !strings.Contains(out, domain) {
					t.Errorf("output %q does not name site %s; the sweep did not reach every site", out, domain)
				}
			}
		})
	}
}

// TestHealthSweepOverAnEmptyRegistryIsUnknown covers criterion 11's second half: an empty
// registry is UNKNOWN, not an error, since the tool cannot say whether any site is healthy.
func TestHealthSweepOverAnEmptyRegistryIsUnknown(t *testing.T) {
	d, code := testDeps(t)

	if _, _, err := execTree(t, d, "health"); err != nil {
		t.Fatalf("cairn health over an empty registry: %v, want no error", err)
	}
	if *code != int(spine.VerdictUnknown) {
		t.Errorf("exit code = %d, want %d (%s)", *code, int(spine.VerdictUnknown), spine.VerdictUnknown)
	}
}

// TestHealthSweepReportsAMalformedRecordAndCountsIt covers criterion 9: a record the store
// cannot parse is named and counted, never silently dropped from the sweep.
func TestHealthSweepReportsAMalformedRecordAndCountsIt(t *testing.T) {
	d, code := testDeps(t)
	writeTestRecord(t, d, "site-alpha-aaaaaa", "alpha.example", "alpha")
	writeTestRecord(t, d, "site-bravo-bbbbbb", "bravo.example", "bravo")

	dir, err := d.registryDir()
	if err != nil {
		t.Fatalf("registryDir: %v", err)
	}
	if err := os.WriteFile(dir+"/site-broken-cccccc.json", []byte("not json"), 0o600); err != nil {
		t.Fatalf("write malformed record: %v", err)
	}

	out, errOut, err := execTree(t, d, "health")
	if err != nil {
		t.Fatalf("cairn health: %v", err)
	}
	if !strings.Contains(out, "alpha.example") || !strings.Contains(out, "bravo.example") {
		t.Errorf("output %q is missing one of the two valid sites", out)
	}
	if !strings.Contains(errOut, "site-broken-cccccc") {
		t.Errorf("stderr %q does not name the malformed record", errOut)
	}
	// A registry the sweep could not list in full contributes UNKNOWN, the same rule sites list
	// follows; the two valid sites' own checks can still raise the combined verdict past it
	// (worseVerdict never lets an unrelated list error mask a genuine failure), so this only
	// asserts the run is not falsely OK.
	if *code == int(spine.VerdictOK) {
		t.Errorf("exit code = %d (OK), want a non-OK verdict for a registry with a malformed record", *code)
	}
}

// cancelOnFirstRequest cancels the given context's own cancel func the first time a request
// reaches RoundTrip, then answers with that request's own (now-cancelled) context error. This
// makes a sweep's budget expiry deterministic in a test: no sleep, no goroutine race, since the
// cancellation happens synchronously inside the very first HTTP call the first site's checks
// make.
type cancelOnFirstRequest struct {
	cancel context.CancelFunc
	once   sync.Once
}

func (c *cancelOnFirstRequest) RoundTrip(req *http.Request) (*http.Response, error) {
	c.once.Do(c.cancel)
	return nil, req.Context().Err()
}

// TestHealthSweepBudgetCutReportsSettledAndNamesTheRest covers criterion 8: a run cut short by
// its budget (here, cancellation arriving mid-first-site) prints the sites already settled and
// names every unsettled one by id as UNKNOWN with reason.timeout, and both count toward the exit
// code.
func TestHealthSweepBudgetCutReportsSettledAndNamesTheRest(t *testing.T) {
	d, code := testDeps(t)
	writeTestRecord(t, d, "site-alpha-aaaaaa", "alpha.example", "alpha")
	writeTestRecord(t, d, "site-bravo-bbbbbb", "bravo.example", "bravo")
	writeTestRecord(t, d, "site-charlie-cccccc", "charlie.example", "charlie")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d.transport = &cancelOnFirstRequest{cancel: cancel}

	cmd := newRootCmd(d)
	var out, errOut strings.Builder
	cmd.SetOut(&out)
	cmd.SetErr(&errOut)
	cmd.SetArgs([]string{"health"})

	if err := cmd.ExecuteContext(ctx); err != nil {
		t.Fatalf("cairn health cut by cancellation: %v, want nil after reporting a verdict", err)
	}

	got := out.String()
	if !strings.Contains(got, "site-bravo-bbbbbb") || !strings.Contains(got, "reason.timeout") {
		t.Errorf("output %q does not name site-bravo-bbbbbb as reason.timeout", got)
	}
	if !strings.Contains(got, "site-charlie-cccccc") {
		t.Errorf("output %q does not name site-charlie-cccccc among the unsettled sites", got)
	}
	if !strings.Contains(got, "alpha.example") {
		t.Errorf("output %q does not print the first (settled) site's own report", got)
	}
	if *code != int(spine.VerdictUnknown) {
		t.Errorf("exit code = %d, want %d (%s)", *code, int(spine.VerdictUnknown), spine.VerdictUnknown)
	}
}

// TestHealthSweepExplicitTimeoutCutReportsSettledAndNamesTheRest is
// TestHealthSweepBudgetCutReportsSettledAndNamesTheRest's twin under an explicit --timeout,
// exercising the divide-by-remaining-sites branch rather than the default sizing.
func TestHealthSweepExplicitTimeoutCutReportsSettledAndNamesTheRest(t *testing.T) {
	d, code := testDeps(t)
	writeTestRecord(t, d, "site-alpha-aaaaaa", "alpha.example", "alpha")
	writeTestRecord(t, d, "site-bravo-bbbbbb", "bravo.example", "bravo")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d.transport = &cancelOnFirstRequest{cancel: cancel}

	cmd := newRootCmd(d)
	var out, errOut strings.Builder
	cmd.SetOut(&out)
	cmd.SetErr(&errOut)
	cmd.SetArgs([]string{"health", "--timeout", "5s"})

	if err := cmd.ExecuteContext(ctx); err != nil {
		t.Fatalf("cairn health --timeout 5s cut by cancellation: %v, want nil after reporting a verdict", err)
	}

	got := out.String()
	if !strings.Contains(got, "alpha.example") {
		t.Errorf("output %q does not print the first (settled) site's own report", got)
	}
	if !strings.Contains(got, "site-bravo-bbbbbb") || !strings.Contains(got, "reason.timeout") {
		t.Errorf("output %q does not name site-bravo-bbbbbb as reason.timeout", got)
	}
	if *code != int(spine.VerdictUnknown) {
		t.Errorf("exit code = %d, want %d (%s)", *code, int(spine.VerdictUnknown), spine.VerdictUnknown)
	}
}
