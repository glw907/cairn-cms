package health

import (
	"context"
	"errors"
	"net"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// cloudflareSPFInclude is the SPF mechanism Cloudflare's own Email Sending onboarding writes,
// captured live on an onboarded zone (docs/internal/record/2026-08-11-t4b-email-spike.md): a
// sending subdomain's SPF TXT record must include it for Cloudflare's own mail servers to be an
// authorized sender. Already lowercase, since every comparison against it lowercases its side too.
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

// Needs implements Check. The DNS-hygiene half needs no credential and always runs; Run itself
// consults Clients.HaveCF for the second half, the way credsCheck inspects its own clients
// rather than declaring a tier that would skip the whole check.
func (emailCheck) Needs() Tier { return TierNone }

// Run implements Check, in the credential-free-then-Cloudflare order the two halves must run in:
// a DNS misconfiguration is reported on its own terms before ever asking whether Cloudflare
// considers the subdomain enabled. Only the never-onboarded sending subdomain declares
// email.sender-not-onboarded; a DMARC, SPF, or DKIM record that onboarding already wrote and
// something later weakened is DNS hygiene to repair in place, not an onboarding to re-run, so
// those verdicts name no condition. When the DNS half passes but no Cloudflare credential is
// available, Run reports Unknown reason.cred-missing, the same reason a tier-gated check reports
// when Run skips it outright, so the sweep still marks the report Degraded.
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
	if !c.HaveCF {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCredMissing}
	}
	return checkSendingSubdomain(ctx, r, c)
}

// isDNSAbsence reports whether err is a DNS lookup's own report that the queried record does not
// exist, a *net.DNSError with IsNotFound true, rather than a transport-level failure (a down
// resolver, an offline machine) this check could not observe through at all.
func isDNSAbsence(err error) bool {
	var dnsErr *net.DNSError
	return errors.As(err, &dnsErr) && dnsErr.IsNotFound
}

// dmarcPolicy returns the "p=" tag's value out of a lowercased DMARC TXT record's
// semicolon-separated tags, or "" when the record carries none.
func dmarcPolicy(lowerTXT string) string {
	for tag := range strings.SplitSeq(lowerTXT, ";") {
		tag = strings.TrimSpace(tag)
		if value, found := strings.CutPrefix(tag, "p="); found {
			return value
		}
	}
	return ""
}

// checkDMARC reads domain's "_dmarc" TXT record and reports Failing when none exists, its policy
// tag is absent, or its policy is "none": a DMARC record published at p=none asks receivers to
// take no action on a spoofed message, which records.mjs's own DMARC-is-TXT expectation treats as
// no real policy at all. Every tag is read from a lowercased
// copy of the record, since DNS TXT values carry no case convention and "p=None" is exactly the
// live misconfiguration this check exists to catch.
func checkDMARC(ctx context.Context, probe *providers.Probe, domain string) (spine.Outcome, bool) {
	records, err := probe.LookupTXT(ctx, "_dmarc."+domain)
	if err != nil && !isDNSAbsence(err) {
		return apiErrorOutcome(err), false
	}
	for _, txt := range records {
		lower := strings.ToLower(txt)
		if !strings.HasPrefix(lower, "v=dmarc1") {
			continue
		}
		policy := dmarcPolicy(lower)
		switch policy {
		case "none":
			return spine.Outcome{State: spine.Failing, Detail: "dmarc policy is p=none"}, false
		case "":
			return spine.Outcome{State: spine.Failing, Detail: "dmarc record carries no p= policy"}, false
		default:
			return spine.Outcome{}, true
		}
	}
	return spine.Outcome{State: spine.Failing, Detail: "no _dmarc TXT record published"}, false
}

// checkSPF reads domain's own TXT records, the sending subdomain Cloudflare's Email Sending
// onboards by default, and reports Failing unless one is an SPF record naming Cloudflare's own
// mail servers as an authorized sender. Each record is lowercased once before either match, so a
// registrar or DNS provider's own casing on the record never hides a genuine include.
func checkSPF(ctx context.Context, probe *providers.Probe, domain string) (spine.Outcome, bool) {
	records, err := probe.LookupTXT(ctx, domain)
	if err != nil && !isDNSAbsence(err) {
		return apiErrorOutcome(err), false
	}
	for _, txt := range records {
		lower := strings.ToLower(txt)
		if strings.HasPrefix(lower, "v=spf1") && strings.Contains(lower, cloudflareSPFInclude) {
			return spine.Outcome{}, true
		}
	}
	return spine.Outcome{State: spine.Failing, Detail: "sending subdomain SPF record missing " + cloudflareSPFInclude}, false
}

// checkDKIM reports Failing unless at least one of dkimSelectors resolves a TXT record under
// domain: a best-effort list can confirm DKIM is configured but can never prove it absent, since
// a provider outside the list is invisible to it. A transport-level failure on any one selector's
// lookup stops the sweep and reports Unknown rather than treating that selector as merely absent.
func checkDKIM(ctx context.Context, probe *providers.Probe, domain string) (spine.Outcome, bool) {
	for _, selector := range dkimSelectors {
		records, err := probe.LookupTXT(ctx, selector+"._domainkey."+domain)
		if err != nil && !isDNSAbsence(err) {
			return apiErrorOutcome(err), false
		}
		if len(records) > 0 {
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
	return spine.Outcome{State: spine.Failing, Condition: spine.ConditionEmailSenderNotOnboarded, Detail: "sending subdomain not onboarded"}
}
