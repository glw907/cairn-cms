package main

import (
	"context"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// settledCheck is a check that answers a fixed outcome with no client and no network. It is what
// deps.checks exists for: proving the --quiet rule needs an all-OK run end to end, and the real
// check set cannot reach OK against a test's fixture transport, which answers 404 for everything.
type settledCheck struct {
	id      string
	outcome spine.Outcome
}

// ID implements health.Check.
func (c settledCheck) ID() string { return c.id }

// Needs implements health.Check. A settled check reads no provider, so no credential gates it.
func (settledCheck) Needs() health.Tier { return health.TierNone }

// Run implements health.Check.
func (c settledCheck) Run(context.Context, record.Record, health.Clients, health.Options) spine.Outcome {
	return c.outcome
}

// passingChecks is the check set an all-OK run sweeps.
func passingChecks() []health.Check {
	return []health.Check{settledCheck{id: "serving", outcome: spine.Outcome{State: spine.OK, Detail: "the hostname answers"}}}
}

// failingChecks is the check set a CRITICAL run sweeps.
func failingChecks() []health.Check {
	return []health.Check{settledCheck{
		id:      "serving",
		outcome: spine.Outcome{State: spine.Failing, Code: spine.CodeServingMismatch, Detail: "the hostname does not answer"},
	}}
}

// TestQuietPrintsNothingOnAnOKRunOnEveryPath is the rule tool/CHANGELOG.md and
// tool/docs/tripwire.md's wrappers already state: a green `cairn health --quiet` prints nothing,
// whatever shape the run takes. It used to hold on the fleet frame alone, which needs a terminal
// and more than one site, so a bare `cairn health --quiet` under cron, systemd, launchd, or Task
// Scheduler mailed a full body every green run. Every row here is a non-terminal stdout, which is
// what a scheduler gives the process.
func TestQuietPrintsNothingOnAnOKRunOnEveryPath(t *testing.T) {
	tests := []struct {
		name  string
		sites int
		args  []string
	}{
		{"one site named", 1, []string{"health", "site-s00-aaaaaa", "--quiet"}},
		{"a bare sweep over one site", 1, []string{"health", "--quiet"}},
		{"a bare sweep over two sites", 2, []string{"health", "--quiet"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, code := testDeps(t)
			d.checks = passingChecks()
			for i := range tt.sites {
				writeTestRecord(t, d, siteID(i), siteDomain(i), "worker")
			}

			stdout, _, err := execTree(t, d, tt.args...)
			if err != nil {
				t.Fatalf("%v: %v", tt.args, err)
			}
			if len(stdout) != 0 {
				t.Errorf("stdout = %q, want no bytes at all", stdout)
			}
			if *code != int(spine.VerdictOK) {
				t.Errorf("exit code = %d, want 0", *code)
			}
		})
	}
}

// TestQuietPrintsTheWholeBodyOnAnyOtherVerdict is the other half of the same rule: --quiet
// suppresses a green run and nothing else, so a failure still reaches the scheduler's mail. The
// body is compared against the same run without the flag, so suppressing output cannot quietly
// become abbreviating it.
func TestQuietPrintsTheWholeBodyOnAnyOtherVerdict(t *testing.T) {
	for _, args := range [][]string{{"health", "site-s00-aaaaaa"}, {"health"}} {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			d, code := testDeps(t)
			d.checks = failingChecks()
			writeTestRecord(t, d, siteID(0), siteDomain(0), "worker")
			writeTestRecord(t, d, siteID(1), siteDomain(1), "worker")

			loud, _, err := execTree(t, d, args...)
			if err != nil {
				t.Fatalf("%v: %v", args, err)
			}
			quiet, _, err := execTree(t, d, append(args, "--quiet")...)
			if err != nil {
				t.Fatalf("%v --quiet: %v", args, err)
			}

			if quiet != loud {
				t.Errorf("--quiet body = %q, want the same bytes as without it, %q", quiet, loud)
			}
			if len(quiet) == 0 {
				t.Error("--quiet printed nothing for a run that is not OK")
			}
			if *code != int(spine.VerdictCritical) {
				t.Errorf("exit code = %d, want %d (CRITICAL)", *code, int(spine.VerdictCritical))
			}
		})
	}
}

// TestJSONWinsOverQuietInASweep covers the precedence over the sweep path specifically, where
// the buffering this round added is the thing that could have swallowed the stream. The
// single-site body writer's own copy of the rule is TestJSONWinsOverQuiet, in health_test.go.
func TestJSONWinsOverQuietInASweep(t *testing.T) {
	d, _ := testDeps(t)
	d.checks = passingChecks()
	writeTestRecord(t, d, siteID(0), siteDomain(0), "worker")

	stdout, _, err := execTree(t, d, "health", "--quiet", "--json")
	if err != nil {
		t.Fatalf("health --quiet --json: %v", err)
	}
	if !strings.Contains(stdout, `"kind":"summary"`) {
		t.Errorf("stdout = %q, want the JSON stream --json promises", stdout)
	}
}

// siteID returns the registry id the quiet tests register site i under.
func siteID(i int) string {
	return "site-s" + string(rune('0'+i/10)) + string(rune('0'+i%10)) + "-aaaaaa"
}

// siteDomain returns the domain for the same site.
func siteDomain(i int) string {
	return "s" + string(rune('0'+i/10)) + string(rune('0'+i%10)) + ".example"
}
