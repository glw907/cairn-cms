package fixtures

import (
	"context"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// runOptions is the Options every health.Run call in this file sweeps against; its threshold and
// window are never read by a stub check, so their values only need to satisfy Options.Validate.
var runOptions = health.Options{ErrorThreshold: 1, LogWindow: time.Minute, Now: Now}

// stubCheck plays back one fixture's own CheckResult.Outcome as health.Run's Check.Run result,
// standing in for the real check that produced it.
type stubCheck struct {
	id      string
	outcome spine.Outcome
}

func (c stubCheck) ID() string       { return c.id }
func (stubCheck) Needs() health.Tier { return health.TierNone }
func (c stubCheck) Run(context.Context, record.Record, health.Clients, health.Options) spine.Outcome {
	return c.outcome
}

// TestFixtureDegradedMatchesHealthRun drives every exported fixture's own check results through
// health.Run and asserts the settled report's Degraded agrees with the fixture's own restated
// value, proving report's local rule has not drifted from health.Run's.
func TestFixtureDegradedMatchesHealthRun(t *testing.T) {
	for _, f := range All() {
		t.Run(f.Name, func(t *testing.T) {
			for _, r := range f.Reports {
				checks := make([]health.Check, len(r.Checks))
				for i, c := range r.Checks {
					checks[i] = stubCheck{id: c.ID, outcome: c.Outcome}
				}
				rec := record.Record{Name: r.Site, Domain: r.Domain}
				got, err := health.Run(context.Background(), rec, health.Clients{}, checks, runOptions, nil)
				if err != nil {
					t.Fatalf("Run: %v", err)
				}
				if got.Degraded != r.Degraded {
					t.Errorf("%s: health.Run Degraded = %v, fixture Degraded = %v", r.Site, got.Degraded, r.Degraded)
				}
			}
		})
	}
}

// TestEveryFixtureCredsRowAgreesWithItsOwnCredentialStory holds the corpus to reports health.Run
// could produce. The creds check is the one that reads both provider tokens directly, so a token
// missing from a run reaches it first: a report whose creds row passes while another of its
// checks was skipped for a missing credential is a frame nothing can produce, and so is the
// reverse, a creds row skipped for a missing credential in a report where every other check
// settled on the credentials it needed.
func TestEveryFixtureCredsRowAgreesWithItsOwnCredentialStory(t *testing.T) {
	for _, f := range All() {
		t.Run(f.Name, func(t *testing.T) {
			for _, r := range f.Reports {
				creds, found := credsRow(r)
				if !found {
					continue
				}
				credsBlocked := creds.Outcome.Reason == spine.ReasonCredMissing
				othersBlocked := anyOtherCredMissing(r)

				if creds.Outcome.State == spine.OK && othersBlocked {
					t.Errorf("%s: creds passed while another check skipped for a missing credential", r.Site)
				}
				if credsBlocked && !othersBlocked {
					t.Errorf("%s: creds skipped for a missing credential while no other check did", r.Site)
				}
				// A failing (rejected or expiring) creds row carries a Code rather than a
				// Reason: credsCheck.Run only sets Reason on the Unknown state a missing token
				// produces, and only sets Code on the Failing state a present, bad token
				// produces, so a row combining the two shapes is not one the check can settle
				// into.
				if creds.Outcome.State == spine.Failing {
					if creds.Outcome.Code == spine.CodeNone {
						t.Errorf("%s: creds failed with no Code", r.Site)
					}
					if creds.Outcome.Reason != "" {
						t.Errorf("%s: creds failed while also carrying Reason %q", r.Site, creds.Outcome.Reason)
					}
				}
			}
		})
	}
}

// credsRow returns r's creds check.
func credsRow(r health.Report) (health.CheckResult, bool) {
	for _, c := range r.Checks {
		if c.ID == "creds" {
			return c, true
		}
	}
	return health.CheckResult{}, false
}

// anyOtherCredMissing reports whether any check of r besides creds was skipped for a missing
// credential.
func anyOtherCredMissing(r health.Report) bool {
	for _, c := range r.Checks {
		if c.ID != "creds" && c.Outcome.Reason == spine.ReasonCredMissing {
			return true
		}
	}
	return false
}
