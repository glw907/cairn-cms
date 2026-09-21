// Package adopt turns a Cloudflare Worker into a registry record. It sits above record and
// store, which is why it is not part of spine: spine is the vocabulary every layer shares and
// depends on nothing in this module but providers.
package adopt

import (
	"context"
	"crypto/rand"
	"fmt"
	"net"
	"strings"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/record"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/store"
)

// Candidate is one Worker on a Cloudflare account, as discovery observed it: what it is called,
// what it serves, and whether Workers Builds deploys it from a repository.
type Candidate struct {
	// Worker is the Workers script id.
	Worker string
	// Repo is the GitHub repository Builds deploys from, as "owner/name", and is empty when no
	// trigger names one.
	Repo string
	// Zone is the name of the DNS zone holding Domain, not Domain itself.
	Zone string
	// ZoneID is that zone's Cloudflare id, the value the HTTPS-forced and email checks read a
	// site's zone settings and sending subdomains through.
	ZoneID string
	// Domain is the Custom Domain attached to this Worker, and is empty when none is. cairn
	// provisions Workers Custom Domains and never Workers Routes
	// (packages/create-cairn-site/src/cloudflare/hostname.mjs), so discovery reads only the
	// Custom Domains route, and a Worker serving a site through a route leaves this empty.
	Domain string
	// AccountID is the Cloudflare account the Worker lives in.
	AccountID string
	// Connected reports whether Workers Builds holds a trigger for this Worker.
	Connected bool
}

// Discover returns every Worker on the account as a Candidate, each carrying its custom domain,
// that domain's zone name, and its Builds connection. It reads only: nothing it does touches a
// registry, which is what lets a listing command call it against a read-only store.
func Discover(ctx context.Context, cf *providers.Cloudflare, accountID string) ([]Candidate, error) {
	workers, err := cf.ListWorkers(ctx)
	if err != nil {
		return nil, fmt.Errorf("adopt: list workers: %w", err)
	}
	domains, err := cf.WorkerDomains(ctx)
	if err != nil {
		return nil, fmt.Errorf("adopt: list worker domains: %w", err)
	}

	byService := make(map[string]providers.WorkerDomain, len(domains))
	for _, d := range domains {
		byService[d.Service] = d
	}

	// The zone listing is skipped when no Worker has a custom domain, so an account with no
	// domains at all never needs the wider zone read this call performs.
	zoneNames := map[string]string{}
	if len(domains) > 0 {
		zones, err := cf.ListZones(ctx)
		if err != nil {
			return nil, fmt.Errorf("adopt: list zones: %w", err)
		}
		for _, z := range zones {
			zoneNames[z.ID] = z.Name
		}
	}

	candidates := make([]Candidate, 0, len(workers))
	for _, w := range workers {
		c := Candidate{Worker: w.Name, AccountID: accountID}
		if d, ok := byService[w.Name]; ok {
			c.Domain = d.Hostname
			c.Zone = zoneNames[d.ZoneID]
			c.ZoneID = d.ZoneID
		}
		triggers, err := cf.BuildsConnections(ctx, w.Tag)
		if err != nil {
			return nil, fmt.Errorf("adopt: read builds triggers for %s: %w", w.Name, err)
		}
		c.Connected = len(triggers) > 0
		for _, tr := range triggers {
			if tr.RepoConnection != nil {
				c.Repo = tr.RepoConnection.ProviderAccountName + "/" + tr.RepoConnection.RepoName
				break
			}
		}
		candidates = append(candidates, c)
	}
	return candidates, nil
}

// ZoneFor returns the account's zone covering domain, or a nil Zone with no error when none
// does. A domain matches the longest zone name it equals or sits beneath, so a zone for a
// subdomain wins over the apex zone that also contains it. It exists for adoption from explicit
// values, where the operator names a domain discovery never saw and the record still needs the
// zone id the HTTPS-forced and email checks read through. One listing answers it, the same call
// Discover already makes, rather than a lookup per candidate zone name.
func ZoneFor(ctx context.Context, cf *providers.Cloudflare, domain string) (*providers.Zone, error) {
	zones, err := cf.ListZones(ctx)
	if err != nil {
		return nil, fmt.Errorf("adopt: list zones: %w", err)
	}
	var best *providers.Zone
	for i, z := range zones {
		if domain != z.Name && !strings.HasSuffix(domain, "."+z.Name) {
			continue
		}
		if best == nil || len(z.Name) > len(best.Name) {
			best = &zones[i]
		}
	}
	return best, nil
}

// AlreadyAdopted reports whether st already holds a record for c's Worker. A Candidate with no
// Worker name matches nothing, so an empty name never collides with a record that carries none.
func AlreadyAdopted(st *store.Store, c Candidate) bool {
	_, found := adoptedRecord(st, c)
	return found
}

// adoptedRecord returns the record st holds for c's Worker, and whether one exists. A record the
// store cannot parse is passed over: it names no worker, so it can neither match nor be the
// record a second adoption should return.
func adoptedRecord(st *store.Store, c Candidate) (record.Record, bool) {
	if c.Worker == "" {
		return record.Record{}, false
	}
	entries, _ := st.List()
	for _, e := range entries {
		if e.Record.Cloudflare.WorkerName == c.Worker {
			return e.Record, true
		}
	}
	return record.Record{}, false
}

// Adopt writes a registry record for c under a fresh id and returns it. name is the site's
// display name and the stem of that id. ctx bounds the one network call Adopt makes, the
// resolution check below, so a run's own deadline reaches it.
//
// Adopting the same Worker twice yields one record: a second call returns the record already
// held and writes nothing. The record carries no secret, since Adopt sets only identifiers.
//
// A Candidate whose Domain fails record.ValidateDomain is refused, and so is one whose Domain
// resolves to an address outside the public internet. record.ValidateDomain is resolution-free
// by design, so the live half of that check is here.
func Adopt(ctx context.Context, st *store.Store, c Candidate, name string, resolve providers.Resolver) (record.Record, error) {
	if err := record.ValidateDomain(c.Domain); err != nil {
		return record.Record{}, fmt.Errorf("adopt: worker %s: %w", c.Worker, err)
	}
	if existing, found := adoptedRecord(st, c); found {
		return existing, nil
	}
	if err := refusePrivateAddress(ctx, resolve, c.Domain); err != nil {
		return record.Record{}, err
	}

	id, err := newSiteID(name)
	if err != nil {
		return record.Record{}, err
	}

	r := record.Record{
		Name:    name,
		Step:    string(spine.StepLive),
		Domain:  c.Domain,
		Adopted: true,
		Cloudflare: record.Cloudflare{
			AccountID:  c.AccountID,
			ZoneID:     c.ZoneID,
			WorkerName: c.Worker,
		},
	}
	if owner, repo, ok := strings.Cut(c.Repo, "/"); ok {
		r.GitHub.Repo.Owner = owner
		r.GitHub.Repo.Repo = repo
	}
	if err := st.Save(id, r); err != nil {
		return record.Record{}, fmt.Errorf("adopt: worker %s: %w", c.Worker, err)
	}
	return r, nil
}

// refusePrivateAddress reports an error when domain resolves to any address off the public
// internet. A domain that cannot be resolved at all is refused too: adoption cannot show the
// site is reachable, and accepting it would register a site every later check reports unknown.
func refusePrivateAddress(ctx context.Context, resolve providers.Resolver, domain string) error {
	addrs, err := resolve.LookupIP(ctx, "ip", domain)
	if err != nil {
		return fmt.Errorf("adopt: resolve %s: %w", domain, err)
	}
	if len(addrs) == 0 {
		return fmt.Errorf("adopt: %s resolves to no address", domain)
	}
	for _, ip := range addrs {
		if isNonPublic(ip) {
			return fmt.Errorf("adopt: %s resolves to %s, which is not a public address", domain, ip)
		}
	}
	return nil
}

// isNonPublic reports whether ip is in a range no site on the public internet is served from.
func isNonPublic(ip net.IP) bool {
	return ip.IsPrivate() ||
		ip.IsLoopback() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsUnspecified()
}

// idSuffixLength is the six-character random tail the Node CLI's site id shape requires
// (packages/create-cairn-site/src/state.mjs).
const idSuffixLength = 6

// newSiteID returns a fresh registry id for a site called name: name slugged, then a random
// suffix from crypto/rand. The suffix comes from rand.Text, whose alphabet lowercases into the
// shape's own character set, so no rejection sampling and no modulo bias is involved.
func newSiteID(name string) (string, error) {
	stem := slugify(name)
	if stem == "" {
		return "", fmt.Errorf("adopt: site name %q slugs to nothing", name)
	}
	id := stem + "-" + strings.ToLower(rand.Text()[:idSuffixLength])
	if err := record.ValidateSiteID(id); err != nil {
		return "", err
	}
	return id, nil
}

// slugify reduces name to lowercase alphanumeric segments joined by single hyphens, with no
// leading or trailing hyphen. A name with no alphanumeric character at all slugs to the empty
// string, which newSiteID refuses.
func slugify(name string) string {
	var b strings.Builder
	pendingHyphen := false
	for _, r := range strings.ToLower(name) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			if pendingHyphen && b.Len() > 0 {
				b.WriteByte('-')
			}
			pendingHyphen = false
			b.WriteRune(r)
			continue
		}
		pendingHyphen = true
	}
	return b.String()
}
