// Package health holds the tool's 1.0 health sweep: the Check contract every provisioning
// signal implements, the Report a sweep produces, and Run, the pure function that drives one set
// of checks to a settled Report. 2.0's HUD polls the same Check functions with no wrapper.
package health

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// Tier names which provider credential a Check needs before Run will call it.
type Tier int

// The four Tier values a Check's Needs can return.
const (
	// TierNone means the check needs no provider credential at all.
	TierNone Tier = iota
	// TierCF means the check needs a Cloudflare credential.
	TierCF
	// TierGH means the check needs a GitHub credential.
	TierGH
	// TierBoth means the check needs both.
	TierBoth
)

// String names the tier in the wire vocabulary: "none", "cloudflare", "github", or "both". A
// Tier this package does not know names itself "none": a credential requirement nothing can
// satisfy is not a requirement a reader can act on.
func (t Tier) String() string {
	switch t {
	case TierCF:
		return "cloudflare"
	case TierGH:
		return "github"
	case TierBoth:
		return "both"
	default:
		return "none"
	}
}

// MarshalJSON writes the tier as its word. Tier's four values and its four words are one to one,
// which is what makes a marshaller the right home for the mapping here and the wrong home for
// spine.State, whose three values answer five wire words.
func (t Tier) MarshalJSON() ([]byte, error) {
	return json.Marshal(t.String())
}

// Check is one health measurement: a pure function over a site record, the run's injected
// provider clients, and its options, with no store access, no globals, and no I/O beyond the
// clients it is handed. That purity is the 2.0 seam: the HUD polls the same functions per site
// with no wrapper.
type Check interface {
	// ID names the check, stable across releases: it is the key an acknowledgement targets and
	// the id a rendered report lists a check by.
	ID() string
	// Needs reports which provider credential this check requires. Run skips a check whose
	// required client is absent rather than calling it.
	Needs() Tier
	// Run measures the check's verdict against r, using c's clients and o's tunables. The
	// returned Outcome names its own cairn-doctor condition id, so a check whose failures have
	// different remedies declares a different Condition per verdict.
	Run(ctx context.Context, r record.Record, c Clients, o Options) spine.Outcome
}

// All is the complete 1.0 health check set, in report order. It is a literal slice, never
// populated by init(), so adding a check always means modifying this file directly.
var All = []Check{
	credsCheck{},
	servingCheck{},
	delegationCheck{},
	httpsForcedCheck{},
	emailCheck{},
	deployCheck{},
	publishPathCheck{},
	engineCheck{},
	errorsCheck{},
}

// reportSchemaVersion is Report's own JSON schema version.
const reportSchemaVersion = 1

// needsClient reports whether tier's required credential is present in c.
func needsClient(tier Tier, c Clients) bool {
	switch tier {
	case TierCF:
		return c.HaveCF
	case TierGH:
		return c.HaveGH
	case TierBoth:
		return c.HaveCF && c.HaveGH
	default:
		return true
	}
}

// Run sweeps every check in checks against r, in order, and returns the settled Report. Run is
// pure over its inputs: the same checks, record, clients, options, and acks, replayed through the
// same Options.Now, produce a byte-identical Report every time, which is what lets a caller
// golden-test a run or, in 2.0, a HUD poll loop call it with no wrapper. Options.Now is the
// sweep's only clock, handed to every check through Options so a check has no reason to read the
// system clock itself.
//
// Run rejects a zero Options outright, since a threshold, window, or clock left at its zero value
// would otherwise run silently rather than loudly. A check whose Needs tier's client is absent is never called:
// Run records it Unknown with reason.cred-missing and sets Degraded, the one report-level signal
// that distinguishes a missing credential from every other Unknown. A cancelled or expired ctx
// stops the sweep after the check already in flight settles; every remaining check is recorded
// Unknown with reason.not-run rather than dropped from the report. A panicking check is
// recovered the same way, so one broken check never loses the rest of the sweep.
func Run(ctx context.Context, r record.Record, c Clients, checks []Check, o Options, acks Acks) (Report, error) {
	if err := o.Validate(); err != nil {
		return Report{}, err
	}

	report := Report{
		SchemaVersion: reportSchemaVersion,
		Site:          r.Name,
		Domain:        r.Domain,
		Checks:        make([]CheckResult, 0, len(checks)),
	}

	for _, check := range checks {
		result := settle(ctx, check, r, c, o)
		if result.Outcome.Reason == spine.ReasonCredMissing {
			report.Degraded = true
		}
		applyAck(&result, acks, o.Now())
		report.Checks = append(report.Checks, result)
		if o.OnCheck != nil {
			o.OnCheck(result)
		}
	}

	report.Acknowledged = activeAckIDs(acks, o.Now())
	return report, nil
}

// settle runs one check, skipping it when its tier's client is absent or the run's context has
// already ended, and recovering a panic into an Unknown result rather than propagating it.
func settle(ctx context.Context, check Check, r record.Record, c Clients, o Options) CheckResult {
	result := CheckResult{ID: check.ID(), Tier: check.Needs(), CheckedAt: o.Now()}

	select {
	case <-ctx.Done():
		result.Outcome = spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotRun, Detail: ctx.Err().Error()}
		return result
	default:
	}

	if !needsClient(result.Tier, c) {
		result.Outcome = credMissingOutcome()
		return result
	}

	result.Outcome = recoverRun(ctx, check, r, c, o)
	return result
}

// recoverRun calls check.Run, converting a panic into an Unknown outcome rather than letting it
// unwind the sweep. The recovered value itself is never placed in the outcome; only its type is,
// so a sentinel-bearing panic never reaches a rendered report.
func recoverRun(ctx context.Context, check Check, r record.Record, c Clients, o Options) (outcome spine.Outcome) {
	defer func() {
		if p := recover(); p != nil {
			outcome = spine.Outcome{
				State:  spine.Unknown,
				Reason: spine.ReasonNotRun,
				Detail: fmt.Sprintf("%s panicked with a %T", check.ID(), p),
			}
		}
	}()
	return check.Run(ctx, r, c, o)
}

// applyAck marks result acknowledged when acks carries an unexpired entry for its id. An entry
// that matches result.ID but has already expired has no softening effect on Acknowledged, but
// its Expires still lands in result.AckExpires, which is how a rendered report names the
// acknowledgement as expired rather than simply absent. An id with no entry in acks at all
// leaves both fields at their zero value. applyAck never changes result.Outcome: an
// acknowledgement is metadata about a verdict, never a softening of the verdict itself.
func applyAck(result *CheckResult, acks Acks, now time.Time) {
	ack, ok := acks.find(result.ID)
	if !ok {
		return
	}
	result.AckExpires = ack.Expires
	if now.Before(ack.Expires) {
		result.Acknowledged = true
	}
}

// activeAckIDs returns the CheckID of every unexpired entry in acks, in acks's own order,
// regardless of whether a check in the current sweep actually carries that id.
func activeAckIDs(acks Acks, now time.Time) []string {
	var ids []string
	for _, ack := range acks {
		if now.Before(ack.Expires) {
			ids = append(ids, ack.CheckID)
		}
	}
	return ids
}
