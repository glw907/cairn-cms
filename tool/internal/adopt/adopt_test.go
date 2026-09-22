package adopt

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/glw907/cairn-cms/tool/internal/store"
)

// routedRoundTripper serves one canned body per request path prefix, so a discovery test can
// answer the four Cloudflare routes Discover walks without a live account. A path no route
// matches answers 404, which surfaces as a provider error rather than an empty success.
type routedRoundTripper struct {
	routes map[string]string
}

func (rt routedRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	for prefix, body := range rt.routes {
		if strings.Contains(req.URL.Path, prefix) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(body)),
				Header:     make(http.Header),
				Request:    req,
			}, nil
		}
	}
	return &http.Response{
		StatusCode: http.StatusNotFound,
		Body:       io.NopCloser(strings.NewReader(`{"success":false,"errors":[{"code":7003}]}`)),
		Header:     make(http.Header),
		Request:    req,
	}, nil
}

// discoveryRoutes is the two-Worker account every Discover test below reads: one Worker with a
// custom domain and a Builds trigger, one with neither.
func discoveryRoutes() map[string]string {
	return map[string]string{
		"/workers/scripts":                   `{"success":true,"result":[{"id":"ecxc-ski","tag":"tag-ecxc"},{"id":"spare","tag":"tag-spare"}]}`,
		"/workers/domains":                   `{"success":true,"result":[{"hostname":"www.ecxc.ski","service":"ecxc-ski","zone_id":"zone-1"}]}`,
		"/zones":                             `{"success":true,"result":[{"id":"zone-1","name":"ecxc.ski","status":"active"}]}`,
		"/builds/workers/tag-ecxc/triggers":  `{"success":true,"result":[{"uuid":"trigger-1","repo_connection":{"provider_account_name":"glw907","repo_name":"ecxc-ski"}}]}`,
		"/builds/workers/tag-spare/triggers": `{"success":true,"result":[]}`,
	}
}

// newDiscoveryClient returns a Cloudflare client answering discoveryRoutes.
func newDiscoveryClient() *providers.Cloudflare {
	return providers.NewCloudflare("account-1", providers.NewCredential("token"), routedRoundTripper{routes: discoveryRoutes()})
}

// TestDiscoverFillsEveryCandidateField asserts Discover lists every Worker on the account, fills
// the domain and zone id from the Worker domains route, the zone name from the zone's own name
// rather than the domain, and Connected and Repo from the Builds triggers. The zone id is what
// the HTTPS-forced and email checks read a site's zone through; a record adopted without one
// reports both of them unobservable.
func TestDiscoverFillsEveryCandidateField(t *testing.T) {
	got, err := Discover(context.Background(), newDiscoveryClient(), "account-1")
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	want := []Candidate{
		{Worker: "ecxc-ski", Repo: "glw907/ecxc-ski", Zone: "ecxc.ski", ZoneID: "zone-1", Domain: "www.ecxc.ski", AccountID: "account-1", Connected: true},
		{Worker: "spare", AccountID: "account-1"},
	}
	if len(got) != len(want) {
		t.Fatalf("Discover returned %d candidates, want %d: %+v", len(got), len(want), got)
	}
	for i := range want {
		if !reflect.DeepEqual(got[i], want[i]) {
			t.Errorf("candidate %d = %+v, want %+v", i, got[i], want[i])
		}
	}
}

// TestDiscoverPerformsNoWrite asserts the listing path writes nothing, against a registry
// directory made read-only: Discover returns its candidates and the directory's modification
// time and entry list are both unchanged. The mtime and entry assertions, not the mode, are what
// carry the test on Windows and under a root uid, where a 0500 mode does not block a write.
func TestDiscoverPerformsNoWrite(t *testing.T) {
	dir := t.TempDir()
	writeRecord(t, dir, "ecxc-ski-a1b2c3", `{"name":"ecxc","schemaVersion":1}`)

	if err := os.Chmod(dir, 0o500); err != nil {
		t.Fatalf("chmod: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(dir, 0o700) })

	before, err := os.Stat(dir)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	beforeNames := dirNames(t, dir)

	got, err := Discover(context.Background(), newDiscoveryClient(), "account-1")
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	if len(got) == 0 {
		t.Fatal("Discover returned no candidates, so the no-write assertion below proves nothing")
	}

	after, err := os.Stat(dir)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if !after.ModTime().Equal(before.ModTime()) {
		t.Errorf("registry directory mtime changed from %v to %v", before.ModTime(), after.ModTime())
	}
	if afterNames := dirNames(t, dir); !slicesEqual(beforeNames, afterNames) {
		t.Errorf("registry directory entries changed from %v to %v", beforeNames, afterNames)
	}
}

// TestDiscoverSkipsTheZoneListingWithNoDomains asserts an account whose Workers have no custom
// domain never reaches the zones route, so discovery does not need the wider zone read on an
// account that has nothing to name.
func TestDiscoverSkipsTheZoneListingWithNoDomains(t *testing.T) {
	routes := discoveryRoutes()
	routes["/workers/domains"] = `{"success":true,"result":[]}`
	delete(routes, "/zones")
	cf := providers.NewCloudflare("account-1", providers.NewCredential("token"), routedRoundTripper{routes: routes})

	got, err := Discover(context.Background(), cf, "account-1")
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("Discover returned %d candidates, want 2", len(got))
	}
	for _, c := range got {
		if c.Zone != "" || c.Domain != "" {
			t.Errorf("candidate %q carries Zone %q and Domain %q, want both empty", c.Worker, c.Zone, c.Domain)
		}
	}
}

// fakeResolver answers LookupIP from a fixed address list, standing in for DNS in the resolution
// check. Its LookupTXT and LookupNS are unused here and report no records.
type fakeResolver struct {
	addrs []net.IP
	err   error
}

func (r fakeResolver) LookupIP(_ context.Context, _, _ string) ([]net.IP, error) {
	return r.addrs, r.err
}
func (r fakeResolver) LookupTXT(context.Context, string) ([]string, error) { return nil, nil }
func (r fakeResolver) LookupNS(context.Context, string) ([]*net.NS, error) { return nil, nil }

// publicResolver answers every lookup with one routable address.
func publicResolver() fakeResolver {
	return fakeResolver{addrs: []net.IP{net.ParseIP("104.16.0.1")}}
}

// liveCandidate is the Candidate the adoption tests below start from.
func liveCandidate() Candidate {
	return Candidate{
		Worker:    "ecxc-ski",
		Repo:      "glw907/ecxc-ski",
		Zone:      "ecxc.ski",
		Domain:    "www.ecxc.ski",
		AccountID: "account-1",
		Connected: true,
	}
}

// TestAdoptWritesTheRecordShape asserts the adopted record's fields, its step, its adopted flag,
// and that it carries no key beyond the identifiers Adopt sets, which is how the test proves no
// secret reached the registry.
func TestAdoptWritesTheRecordShape(t *testing.T) {
	dir := t.TempDir()
	st := openStore(t, dir)

	got, err := Adopt(context.Background(), st, liveCandidate(), "ECXC Ski", publicResolver())
	if err != nil {
		t.Fatalf("Adopt: %v", err)
	}
	if got.Name != "ECXC Ski" {
		t.Errorf("Name = %q, want %q", got.Name, "ECXC Ski")
	}
	if got.Step != string(spine.StepLive) {
		t.Errorf("Step = %q, want %q", got.Step, string(spine.StepLive))
	}
	if !got.Adopted {
		t.Error("Adopted = false, want true")
	}
	if got.Domain != "www.ecxc.ski" {
		t.Errorf("Domain = %q, want %q", got.Domain, "www.ecxc.ski")
	}
	if got.Cloudflare.WorkerName != "ecxc-ski" || got.Cloudflare.AccountID != "account-1" {
		t.Errorf("Cloudflare = %+v, want the candidate's worker and account", got.Cloudflare)
	}
	if got.GitHub.Repo.Owner != "glw907" || got.GitHub.Repo.Repo != "ecxc-ski" {
		t.Errorf("GitHub.Repo = %+v, want glw907/ecxc-ski", got.GitHub.Repo)
	}
	if len(got.Extra) != 0 {
		t.Errorf("Extra = %+v, want no untyped keys", got.Extra)
	}

	entries, errs := st.List()
	if len(errs) != 0 {
		t.Fatalf("List: %v", errs)
	}
	if len(entries) != 1 {
		t.Fatalf("registry holds %d records, want 1", len(entries))
	}
	assertNoSecretKeys(t, dir, entries[0].ID)
}

// TestAdoptGeneratesAFreshIDInTheNodeShape asserts the generated id matches the Node CLI's site
// id shape, carries the slugged name as its stem, and differs between two adoptions of the same
// name into the same registry.
func TestAdoptGeneratesAFreshIDInTheNodeShape(t *testing.T) {
	shape := regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$`)
	dir := t.TempDir()
	st := openStore(t, dir)

	seen := map[string]bool{}
	for range 20 {
		c := liveCandidate()
		c.Worker = "ecxc-ski-" + rand6(t)
		if _, err := Adopt(context.Background(), st, c, "ECXC Ski", publicResolver()); err != nil {
			t.Fatalf("Adopt: %v", err)
		}
		entries, errs := st.List()
		if len(errs) != 0 {
			t.Fatalf("List: %v", errs)
		}
		for _, e := range entries {
			seen[e.ID] = true
		}
	}
	if len(seen) != 20 {
		t.Errorf("20 adoptions produced %d distinct ids, want 20", len(seen))
	}
	for id := range seen {
		if !shape.MatchString(id) {
			t.Errorf("id %q does not match the Node CLI site id shape", id)
		}
		if !strings.HasPrefix(id, "ecxc-ski-") {
			t.Errorf("id %q does not carry the slugged name as its stem", id)
		}
	}
}

// TestAdoptRefusesAnUnusableDomain covers the shape half of the domain rule, which
// record.ValidateDomain owns, and the empty-domain case a Worker with no custom domain produces.
func TestAdoptRefusesAnUnusableDomain(t *testing.T) {
	tests := []struct {
		name   string
		domain string
	}{
		{"no custom domain", ""},
		{"a URL rather than a hostname", "https://www.ecxc.ski/"},
		{"an IP literal", "104.16.0.1"},
		{"an empty label", "www..ecxc.ski"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			st := openStore(t, t.TempDir())
			c := liveCandidate()
			c.Domain = tt.domain
			if _, err := Adopt(context.Background(), st, c, "ECXC Ski", publicResolver()); err == nil {
				t.Fatal("Adopt accepted the candidate, want an error")
			}
			if entries, _ := st.List(); len(entries) != 0 {
				t.Errorf("registry holds %d records after a refused adoption, want 0", len(entries))
			}
		})
	}
}

// TestAdoptRefusesANonPublicAddress covers the resolution half of the domain rule: a domain
// resolving into a private, link-local, or loopback range is refused, and a routable address is
// adopted.
func TestAdoptRefusesANonPublicAddress(t *testing.T) {
	tests := []struct {
		name    string
		addr    string
		adopted bool
	}{
		{"private 10.0.0.0/8", "10.1.2.3", false},
		{"link-local 169.254.0.0/16", "169.254.1.2", false},
		{"loopback 127.0.0.0/8", "127.0.0.1", false},
		{"unspecified", "0.0.0.0", false},
		{"IPv6 loopback", "::1", false},
		{"public", "104.16.0.1", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			st := openStore(t, t.TempDir())
			resolve := fakeResolver{addrs: []net.IP{net.ParseIP(tt.addr)}}
			_, err := Adopt(context.Background(), st, liveCandidate(), "ECXC Ski", resolve)
			if tt.adopted && err != nil {
				t.Fatalf("Adopt: %v", err)
			}
			if !tt.adopted && err == nil {
				t.Fatal("Adopt accepted a candidate resolving off the public internet, want an error")
			}
			entries, _ := st.List()
			if want := map[bool]int{true: 1, false: 0}[tt.adopted]; len(entries) != want {
				t.Errorf("registry holds %d records, want %d", len(entries), want)
			}
		})
	}
}

// TestAdoptRefusesAnUnresolvableDomain asserts a lookup that fails, and one that returns no
// address at all, are both refused rather than adopted on no evidence.
func TestAdoptRefusesAnUnresolvableDomain(t *testing.T) {
	tests := []struct {
		name     string
		resolver fakeResolver
	}{
		{"the lookup fails", fakeResolver{err: &net.DNSError{Err: "no such host", IsNotFound: true}}},
		{"the lookup returns no address", fakeResolver{}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			st := openStore(t, t.TempDir())
			if _, err := Adopt(context.Background(), st, liveCandidate(), "ECXC Ski", tt.resolver); err == nil {
				t.Fatal("Adopt accepted an unresolvable candidate, want an error")
			}
		})
	}
}

// TestAdoptingTwiceYieldsOneRecord asserts a second adoption of the same Worker returns the
// record already held and writes no second one.
func TestAdoptingTwiceYieldsOneRecord(t *testing.T) {
	st := openStore(t, t.TempDir())

	first, err := Adopt(context.Background(), st, liveCandidate(), "ECXC Ski", publicResolver())
	if err != nil {
		t.Fatalf("first Adopt: %v", err)
	}
	second, err := Adopt(context.Background(), st, liveCandidate(), "ECXC Ski Again", publicResolver())
	if err != nil {
		t.Fatalf("second Adopt: %v", err)
	}
	if second.Name != first.Name {
		t.Errorf("second Adopt returned name %q, want the held record's %q", second.Name, first.Name)
	}
	entries, errs := st.List()
	if len(errs) != 0 {
		t.Fatalf("List: %v", errs)
	}
	if len(entries) != 1 {
		t.Errorf("registry holds %d records after two adoptions, want 1", len(entries))
	}
}

// TestAlreadyAdopted asserts the Worker-name match, including that a Candidate carrying no
// Worker name never matches a record carrying none either.
func TestAlreadyAdopted(t *testing.T) {
	st := openStore(t, t.TempDir())
	if _, err := Adopt(context.Background(), st, liveCandidate(), "ECXC Ski", publicResolver()); err != nil {
		t.Fatalf("Adopt: %v", err)
	}

	tests := []struct {
		name   string
		worker string
		want   bool
	}{
		{"the adopted worker", "ecxc-ski", true},
		{"another worker", "spare", false},
		{"no worker name", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := liveCandidate()
			c.Worker = tt.worker
			if got := AlreadyAdopted(st, c); got != tt.want {
				t.Errorf("AlreadyAdopted = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestAdoptErrorsAreGoErrorValues asserts every error string adopt.go builds is a lowercase,
// package-prefixed Go error value rather than a sentence written for an operator to read. It
// scans the source's own errors.New and fmt.Errorf literals.
func TestAdoptErrorsAreGoErrorValues(t *testing.T) {
	data, err := os.ReadFile("adopt.go")
	if err != nil {
		t.Fatalf("read adopt.go: %v", err)
	}
	literals := regexp.MustCompile(`(?:errors\.New|fmt\.Errorf)\("([^"]*)"`).FindAllStringSubmatch(string(data), -1)
	if len(literals) == 0 {
		t.Fatal("found no error literals in adopt.go, so this test proves nothing")
	}
	for _, m := range literals {
		lit := m[1]
		if !strings.HasPrefix(lit, "adopt: ") {
			t.Errorf("error literal %q is not prefixed with the package name", lit)
			continue
		}
		body := strings.TrimPrefix(lit, "adopt: ")
		if body == "" || strings.ToLower(body[:1]) != body[:1] {
			t.Errorf("error literal %q starts with a capital", lit)
		}
		if strings.HasSuffix(body, ".") {
			t.Errorf("error literal %q ends with a period", lit)
		}
	}
}

// openStore returns a Store rooted at dir, creating the directory at the registry's own mode
// first so Open's ownership and mode checks see a real registry root.
func openStore(t *testing.T, dir string) *store.Store {
	t.Helper()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	// t.TempDir creates its numbered subdirectory at 0777, which the store refuses; a real
	// registry directory is 0700.
	if err := os.Chmod(dir, 0o700); err != nil {
		t.Fatalf("chmod: %v", err)
	}
	st, err := store.Open(dir)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	return st
}

// writeRecord drops a record file into dir at the registry's own file mode.
func writeRecord(t *testing.T, dir, id, body string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, id+".json"), []byte(body), 0o600); err != nil {
		t.Fatalf("write record: %v", err)
	}
}

// dirNames returns dir's entry names, sorted by the directory read's own order.
func dirNames(t *testing.T, dir string) []string {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read dir: %v", err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}
	return names
}

// slicesEqual reports whether a and b hold the same strings in the same order.
func slicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// assertNoSecretKeys asserts the written record's JSON carries only the keys Adopt sets, so a
// field the Node CLI would have filled with a credential cannot have been written here.
func assertNoSecretKeys(t *testing.T, dir, id string) {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(dir, id+".json"))
	if err != nil {
		t.Fatalf("read record: %v", err)
	}
	var top map[string]json.RawMessage
	if err := json.Unmarshal(data, &top); err != nil {
		t.Fatalf("parse record: %v", err)
	}
	allowed := map[string]bool{
		"name": true, "step": true, "domain": true, "schemaVersion": true,
		"adopted": true, "github": true, "cloudflare": true,
	}
	for key := range top {
		if !allowed[key] {
			t.Errorf("record carries unexpected top-level key %q", key)
		}
	}
	for _, banned := range []string{"apiToken", "pem", "clientSecret", "webhookSecret", "secretRefs"} {
		if bytes.Contains(data, []byte(banned)) {
			t.Errorf("record carries %q", banned)
		}
	}
}

// rand6 returns six lowercase alphanumeric characters, so a test can give each candidate its own
// Worker name without two adoptions colliding.
func rand6(t *testing.T) string {
	t.Helper()
	id, err := newSiteID("x")
	if err != nil {
		t.Fatalf("newSiteID: %v", err)
	}
	return strings.TrimPrefix(id, "x-")
}
