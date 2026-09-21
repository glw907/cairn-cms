package health

import (
	"context"
	"net/http"
	"net/url"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// adminLoginPath is the path the site-specific marker's /admin redirect must land on, ported
// from packages/create-cairn-site/src/cloudflare/hostname.mjs's ADMIN_LOGIN_PATH.
const adminLoginPath = "/admin/login"

// servingCheck ports confirmHostname (packages/create-cairn-site/src/cloudflare/hostname.mjs):
// it probes the record's own domain for the site-specific marker pair, distinguishing a
// certificate still issuing, a hostname not yet propagated, and a hostname serving something
// else entirely.
type servingCheck struct{}

// ID implements Check.
func (servingCheck) ID() string { return "serving" }

// Condition implements Check. src/lib/diagnostics/conditions.ts carries no id for Serving, so it
// declares no cairn-doctor condition.
func (servingCheck) Condition() spine.Condition { return spine.ConditionNone }

// Needs implements Check. Serving reaches only the site's own public domain, never a provider
// API, so it needs no credential.
func (servingCheck) Needs() Tier { return TierNone }

// Run implements Check.
func (servingCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	return probeServing(ctx, c.Probe, r.Domain)
}

// probeServing is confirmHostname's own logic: HTTPS is tried first, falling back to HTTP only
// when HTTPS never reaches an HTTP response at all (a missing certificate, DNS not yet
// resolving, or a refused connection). Reaching HTTP with the marker pair intact means only the
// certificate is still issuing; reaching neither at all defers to the DNS diagnosis.
func probeServing(ctx context.Context, probe *providers.Probe, domain string) spine.Outcome {
	if primary := probeOrigin(ctx, probe, "https://"+domain); primary.reachable {
		if primary.matches {
			return spine.Outcome{State: spine.OK}
		}
		return spine.Outcome{State: spine.Failing, Detail: "hostname-not-serving"}
	}

	if fallback := probeOrigin(ctx, probe, "http://"+domain); fallback.reachable {
		if fallback.matches {
			return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkCertificatePending)}
		}
		return spine.Outcome{State: spine.Failing, Detail: "hostname-not-serving"}
	}

	return diagnoseUnreachable(ctx, probe, domain)
}

// originProbe is one origin's reachability and marker match, mirroring hostname.mjs's own
// probeOrigin return shape: matches is only meaningful when reachable is true.
type originProbe struct {
	reachable bool
	matches   bool
}

// probeOrigin fetches origin's "/" and "/admin" (unfollowed), the way hostname.mjs's
// matchesMarker does, treating a transport failure on either fetch as unreachable rather than a
// mismatch.
func probeOrigin(ctx context.Context, probe *providers.Probe, origin string) originProbe {
	root, err := probe.Get(ctx, origin+"/")
	if err != nil {
		return originProbe{}
	}
	_ = root.Body.Close()

	admin, err := probe.GetNoFollow(ctx, origin+"/admin")
	if err != nil {
		return originProbe{}
	}
	_ = admin.Body.Close()

	return originProbe{reachable: true, matches: matchesMarker(origin, root, admin)}
}

// matchesMarker reports whether root and admin, both already fetched from origin, together
// answer the site-specific marker pair: root must be 200, and admin must be a 303 to
// adminLoginPath.
func matchesMarker(origin string, root, admin *http.Response) bool {
	if root.StatusCode != http.StatusOK || admin.StatusCode != http.StatusSeeOther {
		return false
	}

	location := admin.Header.Get("Location")
	if location == "" {
		return false
	}
	target, err := url.Parse(location)
	if err != nil {
		return false
	}
	if target.IsAbs() {
		return target.Path == adminLoginPath
	}
	base, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return base.ResolveReference(target).Path == adminLoginPath
}

// diagnoseUnreachable is confirmHostname's propagation split (hostname.mjs's diagnoseUnreachable)
// for the case where neither scheme connects at all: it reads the apex AAAA record, the same
// record a Custom Domain attach itself writes, against the zone's own authoritative
// nameservers, which no recursive resolver's negative cache sits in front of. Present there
// means only the caller's own resolver has not caught up; absent, or no authoritative read
// possible at all, means the record has not propagated. domain's own nameservers are
// discovered through the ordinary recursive lookup first, since a stale delegation is not the
// case under diagnosis here.
func diagnoseUnreachable(ctx context.Context, probe *providers.Probe, domain string) spine.Outcome {
	nameservers, err := probe.LookupNS(ctx, domain)
	if err != nil || len(nameservers) == 0 {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkHostnameRecordsAbsent)}
	}

	for _, ns := range nameservers {
		addrs, err := probe.LookupAuthoritative(ctx, ns.Host, domain)
		if err != nil {
			// This nameserver could not be reached at all; try the next one before giving up.
			continue
		}
		if len(addrs) > 0 {
			return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkHostnameResolverLagging)}
		}
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkHostnameRecordsAbsent)}
	}

	// Every nameserver's authoritative query failed outright: the conservative default, the same
	// one used when no nameservers could be discovered at all.
	return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkHostnameRecordsAbsent)}
}
