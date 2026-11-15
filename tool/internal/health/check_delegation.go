package health

import (
	"context"
	"net"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// delegationCheck checks delegation:
// it compares the domain's actual nameservers against the pair Cloudflare assigned this account
// at provisioning, then, once they match, reads the zone's activation state.
type delegationCheck struct{}

// ID implements Check.
func (delegationCheck) ID() string { return "delegation" }

// Needs implements Check. Once the nameservers match, Delegation reads the zone's activation
// state through the Cloudflare API.
func (delegationCheck) Needs() Tier { return TierCF }

// Run implements Check. It always measures the live nameservers and, once they match, the live
// zone state: a recurring health check has no provisioning-time flag to trust, and the zone the
// account was assigned can only be confirmed by asking it. The pair to compare against comes from the record when it carries one and from
// the zone otherwise, so an adopted record missing the key still settles a verdict.
func (delegationCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	assigned := r.Cloudflare.NameServers()

	// A record adopted before the registry carried the pair, or written by a tool that never
	// recorded it, is not unobservable: the zone itself reports the nameservers Cloudflare
	// assigned it, and reading them here is the same fact from its authority. The zone is
	// read once and reused below, so the fallback costs no extra call on the path that needs it.
	var zone *providers.Zone
	if len(assigned) == 0 {
		z, settled := readZone(ctx, c, r.Domain)
		if settled != nil {
			return *settled
		}
		if len(z.NameServers) == 0 {
			return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: detailDelegationNoAssignedNS}
		}
		zone, assigned = z, z.NameServers
	}

	actual, _ := c.Probe.LookupNS(ctx, r.Domain)
	if !nameServersMatch(assigned, actual) {
		if looksLikeCloudflareNS(actual) {
			return spine.Outcome{State: spine.Failing, Code: spine.CodeDelegationWrongNS, Detail: detailDelegationWrongNameservers}
		}
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkDelegationPending)}
	}

	if zone == nil {
		z, settled := readZone(ctx, c, r.Domain)
		if settled != nil {
			return *settled
		}
		zone = z
	}
	if zone.Status != "active" {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkDelegationPropagating)}
	}
	return spine.Outcome{State: spine.OK}
}

// readZone reads the account's zone for domain. A non-nil outcome settles the check: the read
// failed, or the account has no such zone.
func readZone(ctx context.Context, c Clients, domain string) (*providers.Zone, *spine.Outcome) {
	z, err := c.CF.ZoneByName(ctx, domain)
	if err != nil {
		out := apiErrorOutcome(err)
		return nil, &out
	}
	if z == nil {
		out := spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: detailDelegationNoZone}
		return nil, &out
	}
	return z, nil
}

// nameServersMatch reports whether every assigned nameserver appears in actual, comparing
// case-insensitively and ignoring a trailing root dot.
func nameServersMatch(assigned []string, actual []*net.NS) bool {
	actualLower := make(map[string]bool, len(actual))
	for _, ns := range actual {
		actualLower[normalizeNS(ns.Host)] = true
	}
	for _, ns := range assigned {
		if !actualLower[normalizeNS(ns)] {
			return false
		}
	}
	return true
}

// cloudflareNSSuffix is the suffix every Cloudflare-assigned nameserver hostname carries.
const cloudflareNSSuffix = ".ns.cloudflare.com"

// looksLikeCloudflareNS reports whether actual carries at least one Cloudflare-shaped
// nameserver, which reads as "delegated to Cloudflare, but not to this account" rather than "not
// delegated at all".
func looksLikeCloudflareNS(actual []*net.NS) bool {
	for _, ns := range actual {
		if strings.HasSuffix(normalizeNS(ns.Host), cloudflareNSSuffix) {
			return true
		}
	}
	return false
}

// normalizeNS lowercases host and strips a trailing root dot, so a DNS response's
// fully-qualified form compares equal to Cloudflare's unqualified nameserver names.
func normalizeNS(host string) string {
	return strings.ToLower(strings.TrimSuffix(host, "."))
}
