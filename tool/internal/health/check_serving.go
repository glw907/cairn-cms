package health

import (
	"context"
	"net/http"
	"net/url"
	"time"

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

// Needs implements Check. Serving reaches only the site's own public domain, never a provider
// API, so it needs no credential.
func (servingCheck) Needs() Tier { return TierNone }

// Run implements Check.
func (servingCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	return probeServing(ctx, c.Probe, r, r.Domain)
}

// probeServing is confirmHostname's own logic: HTTPS is tried first, falling back to HTTP only
// when HTTPS never reaches an HTTP response at all (a missing certificate, DNS not yet
// resolving, or a refused connection). Reaching HTTP with the marker pair intact means only the
// certificate is still issuing; reaching neither at all defers to the DNS diagnosis.
func probeServing(ctx context.Context, probe *providers.Probe, r record.Record, domain string) spine.Outcome {
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

	return diagnoseUnreachable(ctx, probe, r, domain, providers.RequestTimeout)
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
// possible at all, means the record has not propagated.
//
// The candidate nameservers are discovered live first and the record's saved pair is only a
// fallback, in that order, for two reasons. A recurring check must measure today's delegation,
// not a pair a domain may have since moved away from, so an ordinary LookupNS is tried first and
// wins outright whenever it answers with at least one nameserver. Only when that lookup answers
// with none, or errors outright, does the sweep fall back to r's own saved assigned pair
// (assignedNameServers): minutes after a registrar delegation, the operator's own resolver can
// still hold a negative answer for NS while Cloudflare's nameservers already serve the apex
// record, and only the saved pair can catch that case as resolver-lagging rather than
// records-absent. When neither source yields a nameserver, or every authoritative query in the
// sweep fails outright, the outcome is records-absent, the conservative default. budget is the
// wall-clock ceiling for the whole sweep below, not a per-nameserver allowance, so a domain whose
// nameservers are all unreachable cannot hold the check for budget times the nameserver count.
func diagnoseUnreachable(ctx context.Context, probe *providers.Probe, r record.Record, domain string, budget time.Duration) spine.Outcome {
	hosts := discoveredNameServerHosts(ctx, probe, domain)
	if len(hosts) == 0 {
		hosts = assignedNameServers(r)
	}
	if len(hosts) == 0 {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkHostnameRecordsAbsent)}
	}

	sweepCtx, cancel := context.WithTimeout(ctx, budget)
	defer cancel()
	for _, host := range hosts {
		addrs, err := probe.LookupAuthoritative(sweepCtx, host, domain)
		if err != nil {
			// net.Resolver.LookupIP reports both an unreachable nameserver and a record that
			// simply does not exist as a *net.DNSError (the not-found case satisfies
			// IsNotFound), so this arm covers absence as well as unreachability; either way the
			// sweep tries the next nameserver rather than treating this one's error as decisive
			// on its own.
			continue
		}
		if len(addrs) > 0 {
			return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkHostnameResolverLagging)}
		}
		// An empty, error-free answer is the seam's other legal absence signal.
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkHostnameRecordsAbsent)}
	}

	// Every nameserver's authoritative query failed outright: the conservative default, the same
	// one used when no nameservers could be discovered at all.
	return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkHostnameRecordsAbsent)}
}

// discoveredNameServerHosts asks the ordinary recursive resolver for domain's own nameservers,
// returning their hostnames, or nil when the lookup errors or answers with none.
func discoveredNameServerHosts(ctx context.Context, probe *providers.Probe, domain string) []string {
	nameservers, err := probe.LookupNS(ctx, domain)
	if err != nil || len(nameservers) == 0 {
		return nil
	}
	hosts := make([]string, len(nameservers))
	for i, ns := range nameservers {
		hosts[i] = ns.Host
	}
	return hosts
}
