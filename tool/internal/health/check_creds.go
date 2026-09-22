package health

import (
	"context"
	"strings"
	"time"

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

// Needs implements Check.
func (credsCheck) Needs() Tier { return TierNone }

// Run implements Check, verifying Cloudflare and GitHub independently and combining them into
// the check's one Outcome: whichever side is more severe wins the State and Reason, and Detail
// names both sides' verdict together with the provider each credential resolved through.
func (credsCheck) Run(ctx context.Context, _ record.Record, c Clients, o Options) spine.Outcome {
	cf := checkCloudflareCredential(ctx, c)
	gh := checkGitHubCredential(ctx, c, o.Now())

	combined := worseCredentialOutcome(cf.outcome, gh.outcome)
	combined.Detail = credentialLine("cloudflare", cf) + "; " + credentialLine("github", gh)
	// The expiry travels as a field whatever the verdict. A healthy token's own OK outcome
	// carries no Detail at all, so without this the date the check already measured is reachable
	// nowhere but inside the fourteen-day warning, and the command layer would have to spend a
	// second request on a fact this one already holds.
	combined.Fields = nil
	if !gh.expiry.IsZero() {
		combined.Fields = []spine.OutcomeField{observedField(FieldGitHubTokenExpiry, gh.expiry, spine.SourceGitHub)}
	}
	return combined
}

// FieldGitHubTokenExpiry names the GitHub token's own expiry on the creds check's Outcome. The
// command layer reads it by key to put the date on the run's status line.
const FieldGitHubTokenExpiry = "githubTokenExpiry"

// credentialSide is the outcome of measuring one provider's credential, paired with the provider
// name it resolved through, so Run can name that provider in the combined check's Detail without
// ever touching the credential's value.
type credentialSide struct {
	outcome spine.Outcome
	from    string
	// expiry is the token's own expiry where the provider publishes one, and the zero time
	// otherwise. Only the GitHub side ever sets it.
	expiry time.Time
}

// checkCloudflareCredential verifies c's Cloudflare credential, the way credentialErrorOutcome
// classifies every other credential check.
func checkCloudflareCredential(ctx context.Context, c Clients) credentialSide {
	if !c.HaveCF {
		return credentialSide{outcome: credMissingOutcome()}
	}
	if _, err := c.CF.VerifyToken(ctx); err != nil {
		return credentialSide{outcome: credentialErrorOutcome(err), from: c.CFFrom}
	}
	return credentialSide{outcome: spine.Outcome{State: spine.OK}, from: c.CFFrom}
}

// checkGitHubCredential verifies c's GitHub credential: an unreadable or revoked token
// classifies the same way checkCloudflareCredential's does, and a readable one that expires
// within credExpiryWindow is Failing on its own, since that is what this check exists to catch
// before every tier-gated check starts losing its credential at once. A zero TokenExpiry means
// GitHub reported no expiry at all (a classic PAT, an OAuth token, or a non-expiring
// fine-grained PAT), so the expiring-soon warning cannot apply; that is OK, with Detail saying so
// plainly, never Unknown, since an Unknown here would turn every scheduled run holding such a
// token into exit UNKNOWN.
func checkGitHubCredential(ctx context.Context, c Clients, now time.Time) credentialSide {
	if !c.HaveGH {
		return credentialSide{outcome: credMissingOutcome()}
	}

	expiry, err := c.GH.TokenExpiry(ctx)
	if err != nil {
		return credentialSide{outcome: credentialErrorOutcome(err), from: c.GHFrom}
	}
	if expiry.IsZero() {
		return credentialSide{outcome: spine.Outcome{State: spine.OK, Detail: detailCredsGitHubNoExpiry()}, from: c.GHFrom}
	}
	if expiry.Sub(now) < credExpiryWindow {
		outcome := spine.Outcome{State: spine.Failing, Code: spine.CodeCredsExpiringSoon, Detail: detailCredsGitHubExpiring(expiry, now)}
		return credentialSide{outcome: outcome, from: c.GHFrom, expiry: expiry}
	}
	return credentialSide{outcome: spine.Outcome{State: spine.OK}, from: c.GHFrom, expiry: expiry}
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
// which secret store it resolved through (never the value), and its own prose. A side whose
// Detail is empty because ReasonToOutcome (via credentialErrorOutcome) set Code instead renders
// through detailForCredCode, so the joined line never falls back to a bare Reason token for a
// rejected credential.
func credentialLine(name string, side credentialSide) string {
	parts := []string{name}
	if side.from != "" {
		parts = append(parts, "via "+side.from)
	}
	switch {
	case side.outcome.Detail != "":
		parts = append(parts, side.outcome.Detail)
	case side.outcome.Code != spine.CodeNone:
		parts = append(parts, detailForCredCode(side.outcome.Code))
	case side.outcome.Reason != "":
		parts = append(parts, string(side.outcome.Reason))
	}
	return strings.Join(parts, ", ")
}

// detailForCredCode renders the two credential-rejection codes ReasonToOutcome can set, in the
// generic form catalogue section 3.4 calls for: ReasonToOutcome carries no provider name of its
// own, so this stays provider-neutral and credentialLine supplies the provider as the line's own
// leading word.
func detailForCredCode(code spine.Code) string {
	switch code {
	case spine.CodeCredsForbidden:
		return detailCredsForbidden()
	default:
		return detailCredsUnauthorized()
	}
}
