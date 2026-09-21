package health

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// delegationCheck ports checkDelegation (packages/create-cairn-site/src/cloudflare/zone.mjs):
// it compares the domain's actual nameservers against the pair Cloudflare assigned this account
// at provisioning, then, once they match, reads the zone's own activation state.
type delegationCheck struct{}

// ID implements Check.
func (delegationCheck) ID() string { return "delegation" }

// Condition implements Check. src/lib/diagnostics/conditions.ts carries no id for Delegation, so
// it declares no cairn-doctor condition.
func (delegationCheck) Condition() spine.Condition { return spine.ConditionNone }

// Needs implements Check. Once the nameservers match, Delegation reads the zone's own activation
// state through the Cloudflare API.
func (delegationCheck) Needs() Tier { return TierCF }

// Run implements Check. Unlike checkDelegation's alreadyActive short circuit, which exists only
// to skip a needless lookup during interactive provisioning, Run always measures the live
// nameservers and, once they match, the live zone state: a recurring health check has no
// provisioning-time flag to trust, and the zone the account was assigned can only be confirmed
// by asking it.
func (delegationCheck) Run(ctx context.Context, r record.Record, c Clients, _ Options) spine.Outcome {
	assigned := assignedNameServers(r)
	if len(assigned) == 0 {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "no assigned nameservers recorded for this site"}
	}

	actual, _ := c.Probe.LookupNS(ctx, r.Domain)
	if !nameServersMatch(assigned, actual) {
		if looksLikeCloudflareNS(actual) {
			return spine.Outcome{State: spine.Failing, Detail: "wrong-nameservers"}
		}
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkDelegationPending)}
	}

	zone, err := c.CF.ZoneByName(ctx, r.Domain)
	if err != nil {
		return apiErrorOutcome(err)
	}
	if zone == nil {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotObservable, Detail: "cloudflare reports no zone for this domain"}
	}
	if zone.Status != "active" {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ParkReason(spine.ParkDelegationPropagating)}
	}
	return spine.Outcome{State: spine.OK}
}

// assignedNameServers reads the "nameServers" key the Node CLI persists under a record's
// "cloudflare" object (chapter2.mjs: cloudflare: { domain, zoneId, nameServers, alreadyActive }).
// record.Cloudflare does not type that key, so it round-trips through Extra; a record with no
// such key, or one this package cannot decode as a string slice, reports nil.
func assignedNameServers(r record.Record) []string {
	for _, extra := range r.Cloudflare.Extra {
		if extra.Key != "nameServers" {
			continue
		}
		var nameServers []string
		if err := json.Unmarshal(extra.Value, &nameServers); err != nil {
			return nil
		}
		return nameServers
	}
	return nil
}

// nameServersMatch reports whether every assigned nameserver appears in actual, comparing
// case-insensitively and ignoring a trailing root dot, the way zone.mjs's own
// actualLower.has(ns.toLowerCase()) comparison does.
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

// cloudflareNSSuffix is the suffix every Cloudflare-assigned nameserver hostname carries, ported
// from zone.mjs's CLOUDFLARE_NS_PATTERN (/\.ns\.cloudflare\.com$/i).
const cloudflareNSSuffix = ".ns.cloudflare.com"

// looksLikeCloudflareNS reports whether actual carries at least one Cloudflare-shaped
// nameserver, which zone.mjs reads as "delegated to Cloudflare, but not to this account" rather
// than "not delegated at all".
func looksLikeCloudflareNS(actual []*net.NS) bool {
	for _, ns := range actual {
		if strings.HasSuffix(normalizeNS(ns.Host), cloudflareNSSuffix) {
			return true
		}
	}
	return false
}

// normalizeNS lowercases host and strips a trailing root dot, so a DNS response's
// fully-qualified form compares equal to Cloudflare's own unqualified nameserver names.
func normalizeNS(host string) string {
	return strings.ToLower(strings.TrimSuffix(host, "."))
}

// apiErrorOutcome classifies a Cloudflare or GitHub API failure, shared by every check that
// reads one of those APIs but does not itself measure the credential (delegation,
// HTTPS-forced, HSTS, email, deploy). Unlike credsCheck, a 401 or 403 here is Unknown with its
// own reason.api.<Reason> code rather than Failing: only the creds check treats a rejected
// credential as the fault under test. An error this package cannot classify at all (a dial
// failure, a context deadline) is Unknown with reason.timeout.
func apiErrorOutcome(err error) spine.Outcome {
	var pe providers.ProviderError
	if !errors.As(err, &pe) {
		return spine.Outcome{State: spine.Unknown, Reason: spine.ReasonTimeout}
	}
	return spine.Outcome{State: spine.Unknown, Reason: spine.APIReason(pe.ClassifiedReason())}
}
