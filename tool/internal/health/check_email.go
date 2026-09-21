package health

import (
	"context"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// cloudflareSPFInclude is the SPF mechanism Cloudflare's own Email Sending onboarding writes,
// captured live on an onboarded zone (docs/internal/record/2026-08-11-t4b-email-spike.md): a
// sending subdomain's SPF TXT record must include it for Cloudflare's own mail servers to be an
// authorized sender.
const cloudflareSPFInclude = "include:_spf.mx.cloudflare.net"

// dkimSelectors is the best-effort DKIM selector list this check probes for, ported from
// create-cairn-site's own DNS carry-over probe list (records.mjs's PROBE_PLAN.dkimSelectors):
// Google's, Fastmail's rotation, and Microsoft 365's documented default pair. DNS has no
// enumeration primitive, so this check can only ever confirm DKIM against a selector it already
// knows to ask for.
var dkimSelectors = []string{"google", "fm1", "fm2", "fm3", "selector1", "selector2"}

// emailCheck runs the magic-link sending domain's credential-free DNS hygiene, then, once that
// passes, the zone's own Cloudflare Email Sending readiness.
type emailCheck struct{}

// ID implements Check.
func (emailCheck) ID() string { return "email" }

// Condition implements Check. src/lib/diagnostics/conditions.ts's email.sender-not-onboarded
// covers every Failing verdict this check can reach: a missing or misconfigured DMARC, SPF, or
// DKIM record and an unenabled sending subdomain are all fixed the same way, by re-running the
// sending domain's onboarding, which rewrites all of them together.
func (emailCheck) Condition() spine.Condition { return spine.ConditionEmailSenderNotOnboarded }

// Needs implements Check. The DNS-hygiene half needs no credential, but the check's second half
// reads the zone's Email Sending subdomains through Cloudflare, so the whole check is gated on
// that credential rather than running the DNS half alone when it is absent.
func (emailCheck) Needs() Tier { return TierCF }

// Run implements Check, in the credential-free-then-Cloudflare order the two halves must run in:
// a DNS misconfiguration is reported on its own terms before ever asking whether Cloudflare
// considers the subdomain enabled.
func (emailCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	if outcome, ok := checkDMARC(ctx, c.Probe, r.Domain); !ok {
		return outcome
	}
	if outcome, ok := checkSPF(ctx, c.Probe, r.Domain); !ok {
		return outcome
	}
	if outcome, ok := checkDKIM(ctx, c.Probe, r.Domain); !ok {
		return outcome
	}
	return checkSendingSubdomain(ctx, r, c)
}

// dmarcPolicy returns the "p=" tag's value out of a DMARC TXT record's semicolon-separated tags,
// or "" when the record carries none.
func dmarcPolicy(txt string) string {
	for _, tag := range strings.Split(txt, ";") {
		tag = strings.TrimSpace(tag)
		if value, found := strings.CutPrefix(tag, "p="); found {
			return value
		}
	}
	return ""
}

// checkDMARC reads domain's "_dmarc" TXT record and reports Failing when none exists or its
// policy is "none": a DMARC record published at p=none asks receivers to take no action on a
// spoofed message, which reconciliation row 28 (records.mjs's own DMARC-is-TXT expectation)
// treats as no real policy at all.
func checkDMARC(ctx context.Context, probe *providers.Probe, domain string) (spine.Outcome, bool) {
	records, err := probe.LookupTXT(ctx, "_dmarc."+domain)
	if err != nil || len(records) == 0 {
		return spine.Outcome{State: spine.Failing, Detail: "no _dmarc TXT record published"}, false
	}
	for _, txt := range records {
		if !strings.HasPrefix(strings.ToUpper(txt), "V=DMARC1") {
			continue
		}
		policy := dmarcPolicy(txt)
		if policy == "none" {
			return spine.Outcome{State: spine.Failing, Detail: "dmarc policy is p=none"}, false
		}
		if policy != "" {
			return spine.Outcome{}, true
		}
	}
	return spine.Outcome{State: spine.Failing, Detail: "no _dmarc TXT record published"}, false
}

// checkSPF reads domain's own TXT records, the sending subdomain Cloudflare's Email Sending
// onboards by default, and reports Failing unless one is an SPF record naming Cloudflare's own
// mail servers as an authorized sender.
func checkSPF(ctx context.Context, probe *providers.Probe, domain string) (spine.Outcome, bool) {
	records, err := probe.LookupTXT(ctx, domain)
	if err == nil {
		for _, txt := range records {
			if strings.HasPrefix(strings.ToLower(txt), "v=spf1") && strings.Contains(txt, cloudflareSPFInclude) {
				return spine.Outcome{}, true
			}
		}
	}
	return spine.Outcome{State: spine.Failing, Detail: "sending subdomain SPF record missing " + cloudflareSPFInclude}, false
}

// checkDKIM reports Failing unless at least one of dkimSelectors resolves a TXT record under
// domain: a best-effort list can confirm DKIM is configured but can never prove it absent, since
// a provider outside the list is invisible to it.
func checkDKIM(ctx context.Context, probe *providers.Probe, domain string) (spine.Outcome, bool) {
	for _, selector := range dkimSelectors {
		records, err := probe.LookupTXT(ctx, selector+"._domainkey."+domain)
		if err == nil && len(records) > 0 {
			return spine.Outcome{}, true
		}
	}
	return spine.Outcome{State: spine.Failing, Detail: "no dkim selector txt resolved"}, false
}

// checkSendingSubdomain reads the zone's Cloudflare Email Sending subdomains and reports on the
// entry named after r.Domain, the apex a site's `wrangler email sending enable` onboards.
func checkSendingSubdomain(ctx context.Context, r record.Record, c Clients) spine.Outcome {
	if r.Cloudflare.ZoneID == "" {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "no zone id recorded for this site"}
	}
	subdomains, err := c.CF.EmailSendingSubdomains(ctx, r.Cloudflare.ZoneID)
	if err != nil {
		return apiErrorOutcome(err)
	}
	for _, subdomain := range subdomains {
		if subdomain.Name != r.Domain {
			continue
		}
		if subdomain.Enabled {
			return spine.Outcome{State: spine.OK}
		}
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkEmailNotReady)}
	}
	return spine.Outcome{State: spine.Failing, Detail: "sending subdomain not onboarded"}
}
