package main

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/store"
)

// twoGroupRoutes returns the Cloudflare routes for an account holding two Workers, one with a
// Custom Domain and one without. The second is the shape the 2026-09-21 live run found on the
// verification account: cairn provisions Workers Custom Domains and never Workers Routes, so a
// Worker serving a site through a route carries no domain for discovery to read.
func twoGroupRoutes() routeRoundTripper {
	return routeRoundTripper{
		"/client/v4/accounts/" + testAccountID + "/workers/scripts": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":[{"id":"with-domain","tag":"tag1"},{"id":"route-served","tag":"tag2"}]}`),
		},
		"/client/v4/accounts/" + testAccountID + "/workers/domains": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":[{"hostname":"live.example","service":"with-domain","zone_id":"zone-1"}]}`),
		},
		"/client/v4/zones": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":[{"id":"zone-1","name":"example","status":"active"}]}`),
		},
		"/client/v4/accounts/" + testAccountID + "/builds/workers/tag1/triggers": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":[]}`),
		},
		"/client/v4/accounts/" + testAccountID + "/builds/workers/tag2/triggers": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":[]}`),
		},
	}
}

// TestAdoptListNamesTheWorkersDiscoveryCannotAdopt covers the group a route-served Worker would
// otherwise vanish into. The JSON carries the split as the optional adoptable field, and the
// plain listing carries it as a blank line with the notice on stderr.
func TestAdoptListNamesTheWorkersDiscoveryCannotAdopt(t *testing.T) {
	d := credentialedDeps(t)
	d.transport = twoGroupRoutes()

	stdout, _, err := execTree(t, d, "adopt", "list")
	if err != nil {
		t.Fatalf("adopt list: %v", err)
	}
	var payload struct {
		Candidates []render.AdoptCandidate `json:"candidates"`
	}
	if err := json.Unmarshal([]byte(stdout), &payload); err != nil {
		t.Fatalf("stdout %q is not JSON: %v", stdout, err)
	}
	if len(payload.Candidates) != 2 {
		t.Fatalf("got %d candidates, want both Workers listed", len(payload.Candidates))
	}
	byWorker := map[string]render.AdoptCandidate{}
	for _, c := range payload.Candidates {
		byWorker[c.Worker] = c
	}
	if !byWorker["with-domain"].Adoptable {
		t.Error("the Worker with a Custom Domain does not read as adoptable")
	}
	if byWorker["route-served"].Adoptable {
		t.Error("the Worker with no Custom Domain reads as adoptable; discovery cannot build its record")
	}
}

// TestAdoptListPlainSeparatesTheTwoGroups covers the human listing: stdout stays one
// tab-separated record per line so a shell reading it keeps working, the blank line is the group
// boundary, and the notice explaining the boundary and how to adopt anyway goes to stderr.
func TestAdoptListPlainSeparatesTheTwoGroups(t *testing.T) {
	d := credentialedDeps(t)
	d.transport = twoGroupRoutes()

	stdout, stderr, err := execTree(t, d, "adopt", "list", "--json=false")
	if err != nil {
		t.Fatalf("adopt list --json=false: %v", err)
	}
	lines := strings.Split(strings.TrimRight(stdout, "\n"), "\n")
	want := []string{"with-domain\tlive.example\t", "", "route-served\t\t"}
	if len(lines) != len(want) {
		t.Fatalf("stdout = %q, want three lines with a blank one between the groups", stdout)
	}
	for i := range want {
		if lines[i] != want[i] {
			t.Errorf("line %d = %q, want %q", i, lines[i], want[i])
		}
	}
	if !strings.Contains(stderr, "--domain") {
		t.Errorf("stderr = %q, want the notice naming how to adopt a route-served Worker", stderr)
	}
	if !strings.Contains(stderr, pasteNotice) {
		t.Errorf("stderr = %q, want the paste notice the plain listing already carried", stderr)
	}
}

// TestAdoptListWithNoRouteServedWorkerPrintsNoNotice asserts the notice is conditional: an
// account whose every Worker has a Custom Domain reads exactly as it did before this round.
func TestAdoptListWithNoRouteServedWorkerPrintsNoNotice(t *testing.T) {
	d := credentialedDeps(t)
	routes := twoGroupRoutes()
	routes["/client/v4/accounts/"+testAccountID+"/workers/scripts"] = routedResponse{
		status: http.StatusOK,
		body:   []byte(`{"success":true,"result":[{"id":"with-domain","tag":"tag1"}]}`),
	}
	d.transport = routes

	stdout, stderr, err := execTree(t, d, "adopt", "list", "--json=false")
	if err != nil {
		t.Fatalf("adopt list --json=false: %v", err)
	}
	if strings.Contains(stdout, "\n\n") {
		t.Errorf("stdout = %q, want no group boundary", stdout)
	}
	if strings.Contains(stderr, "--domain") {
		t.Errorf("stderr = %q, want no route-served notice", stderr)
	}
}

// TestAdoptWithNoDomainNamesTheFlagThatResolvesIt replaces the raw "record: domain is empty" a
// live run hit on four production sites, which named neither the Worker nor a way forward.
func TestAdoptWithNoDomainNamesTheFlagThatResolvesIt(t *testing.T) {
	d := credentialedDeps(t)
	d.transport = twoGroupRoutes()

	_, _, err := execTree(t, d, "adopt", "--worker", "route-served")
	if err == nil {
		t.Fatal("adopt accepted a Worker with no Custom Domain and no --domain")
	}
	got := err.Error()
	if strings.Contains(got, "domain is empty") {
		t.Errorf("error %q is still the validator's own raw message", got)
	}
	for _, want := range []string{"route-served", "--domain"} {
		if !strings.Contains(got, want) {
			t.Errorf("error %q does not name %q", got, want)
		}
	}
}

// TestAdoptFromExplicitValuesWritesTheRecord covers adoption of a Worker discovery cannot build a
// record for: the operator names the domain, and the zone id, the one other value discovery
// would have filled, comes from a read-only zone listing rather than from a second flag.
func TestAdoptFromExplicitValuesWritesTheRecord(t *testing.T) {
	d := credentialedDeps(t)
	d.transport = twoGroupRoutes()
	d.resolver = publicIPResolver{}

	if _, _, err := execTree(t, d, "adopt", "--worker", "route-served", "--domain", "routed.example"); err != nil {
		t.Fatalf("adopt --domain: %v", err)
	}

	dir, err := d.registryDir()
	if err != nil {
		t.Fatal(err)
	}
	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	entries, errs := st.List()
	if len(errs) != 0 {
		t.Fatalf("List: %v", errs)
	}
	if len(entries) != 1 {
		t.Fatalf("the registry holds %d records, want 1", len(entries))
	}
	rec := entries[0].Record
	if rec.Domain != "routed.example" {
		t.Errorf("record domain = %q, want the domain the operator named", rec.Domain)
	}
	if rec.Cloudflare.WorkerName != "route-served" {
		t.Errorf("record worker = %q, want route-served", rec.Cloudflare.WorkerName)
	}
	if rec.Cloudflare.ZoneID != "zone-1" {
		t.Errorf("record zone id = %q, want the zone the domain sits in, read off the account", rec.Cloudflare.ZoneID)
	}
}

// publicIPResolver answers every lookup with one public address, so adoption's own
// resolves-to-a-public-address check settles without a live DNS query.
type publicIPResolver struct{}

// LookupTXT implements providers.Resolver.
func (publicIPResolver) LookupTXT(context.Context, string) ([]string, error) { return nil, nil }

// LookupNS implements providers.Resolver.
func (publicIPResolver) LookupNS(context.Context, string) ([]*net.NS, error) { return nil, nil }

// LookupIP implements providers.Resolver.
func (publicIPResolver) LookupIP(context.Context, string, string) ([]net.IP, error) {
	return []net.IP{net.ParseIP("203.0.113.10")}, nil
}
