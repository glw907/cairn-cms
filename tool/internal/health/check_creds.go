package health

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// credExpiryWindow is how far ahead of a GitHub fine-grained token's expiry the creds check
// starts reporting Failing. Without this check, nothing fails before a token minted at the
// shortest acceptable expiry lapses, and the lapse then surfaces only as a scattering of
// per-tier Unknowns once every other check loses its credential at once.
const credExpiryWindow = 14 * 24 * time.Hour

// credsCheck verifies both provider credentials the tool itself holds. It is the first member of
// All, needs no client Run would otherwise gate it on (it inspects Clients.HaveCF and
// Clients.HaveGH itself instead), and so always runs.
type credsCheck struct{}

// ID implements Check.
func (credsCheck) ID() string { return "creds" }

// Condition implements Check. The spec's health table marks the credential check "new", so it
// declares no cairn-doctor condition id.
func (credsCheck) Condition() spine.Condition { return spine.ConditionNone }

// Needs implements Check.
func (credsCheck) Needs() Tier { return TierNone }

// Run implements Check, verifying Cloudflare and GitHub independently and combining them into
// the check's one Outcome: whichever side is more severe wins the State and Reason, and Detail
// names both sides' verdict together with the provider each credential resolved through.
func (credsCheck) Run(ctx context.Context, _ record.Record, c Clients, _ Options) spine.Outcome {
	cf := checkCloudflareCredential(ctx, c)
	gh := checkGitHubCredential(ctx, c)

	combined := worseCredentialOutcome(cf.outcome, gh.outcome)
	combined.Detail = credentialLine("cloudflare", cf) + "; " + credentialLine("github", gh)
	return combined
}

// credentialSide is the outcome of measuring one provider's credential, paired with the provider
// name it resolved through, so Run can name that provider in the combined check's Detail without
// ever touching the credential's value.
type credentialSide struct {
	outcome spine.Outcome
	from    string
}

// checkCloudflareCredential verifies c's Cloudflare credential, the way credentialErrorOutcome
// classifies every other credential check.
func checkCloudflareCredential(ctx context.Context, c Clients) credentialSide {
	if !c.HaveCF {
		return credentialSide{outcome: spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCredMissing}}
	}
	if _, err := c.CF.VerifyToken(ctx); err != nil {
		return credentialSide{outcome: credentialErrorOutcome(err), from: c.CFFrom}
	}
	return credentialSide{outcome: spine.Outcome{State: spine.OK}, from: c.CFFrom}
}

// checkGitHubCredential verifies c's GitHub credential: an unreadable or revoked token
// classifies the same way checkCloudflareCredential's does, and a readable one that expires
// within credExpiryWindow is Failing on its own, since that is what this check exists to catch
// before every tier-gated check starts losing its credential at once.
func checkGitHubCredential(ctx context.Context, c Clients) credentialSide {
	if !c.HaveGH {
		return credentialSide{outcome: spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCredMissing}}
	}

	expiry, err := c.GH.TokenExpiry(ctx)
	if err != nil {
		return credentialSide{outcome: credentialErrorOutcome(err), from: c.GHFrom}
	}
	if !expiry.IsZero() && time.Until(expiry) < credExpiryWindow {
		detail := fmt.Sprintf("%s: expires %s", spine.ReasonCredExpiring, expiry.Format(time.RFC3339))
		return credentialSide{outcome: spine.Outcome{State: spine.Failing, Detail: detail}, from: c.GHFrom}
	}
	return credentialSide{outcome: spine.Outcome{State: spine.OK}, from: c.GHFrom}
}

// credentialErrorOutcome classifies err through spine.ReasonToOutcome, the module's one
// translation from a classified provider Reason to a verdict, then relabels a Failing verdict's
// Detail as reason.cred-revoked: a bad credential is exactly what the creds check measures, the
// one place a 401 or 403 answers Failing rather than the Unknown every other check reports for
// the same pair. An error this package cannot classify at all, a dial failure or a context
// deadline, is Unknown with reason.timeout: the endpoint itself could not be reached, not merely
// rejected.
func credentialErrorOutcome(err error) spine.Outcome {
	var pe providers.ProviderError
	if !errors.As(err, &pe) {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonTimeout}
	}
	outcome := spine.ReasonToOutcome(pe.ClassifiedReason())
	if outcome.State == spine.Failing {
		outcome.Detail = string(spine.ReasonCredRevoked)
	}
	return outcome
}

// credentialRank orders an Unknown credentialSide's Reason for worseCredentialOutcome's tie
// break: a missing credential outranks a transient timeout, since it is the more actionable,
// durable state for an operator to see first.
func credentialRank(reason spine.ReasonCode) int {
	if reason == spine.ReasonCredMissing {
		return 1
	}
	return 0
}

// worseCredentialOutcome returns whichever of a and b is more severe, by spine.State.Severity,
// breaking a tie between two Unknowns by credentialRank.
func worseCredentialOutcome(a, b spine.Outcome) spine.Outcome {
	switch {
	case b.State.Severity() > a.State.Severity():
		return b
	case a.State.Severity() > b.State.Severity():
		return a
	case a.State == spine.Unknown && credentialRank(b.Reason) > credentialRank(a.Reason):
		return b
	default:
		return a
	}
}

// credentialLine renders one side's verdict for the combined check's Detail: the provider name,
// which secret store it resolved through (never the value), and its own Detail or Reason text.
func credentialLine(name string, side credentialSide) string {
	parts := []string{name}
	if side.from != "" {
		parts = append(parts, "via "+side.from)
	}
	if side.outcome.Detail != "" {
		parts = append(parts, side.outcome.Detail)
	}
	if side.outcome.Reason != "" {
		parts = append(parts, string(side.outcome.Reason))
	}
	return strings.Join(parts, ", ")
}
