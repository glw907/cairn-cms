package providers

import (
	"errors"
	"net/http"
	"testing"
)

// packument is a hand-built npm packument, standing in for a corpus fixture: the fixture corpus
// (packages/create-cairn-site/fixtures/) was extracted from the Node CLI's own fakes, and that
// CLI never calls the npm registry, so no npm body exists there to read through Corpus. The
// "versions" object's key order below is the fact this test proves Versions preserves: 0.1.0
// before 0.2.0 before 1.0.0, the order a real registry packument writes them in.
const packument = `{
  "name": "@glw907/cairn-cms",
  "dist-tags": { "latest": "1.0.0" },
  "versions": {
    "0.1.0": { "name": "@glw907/cairn-cms", "version": "0.1.0" },
    "0.2.0": { "name": "@glw907/cairn-cms", "version": "0.2.0" },
    "1.0.0": { "name": "@glw907/cairn-cms", "version": "1.0.0" }
  }
}`

func TestLatestReadsDistTag(t *testing.T) {
	n := NewNPM(fixtureRoundTripper{status: http.StatusOK, body: []byte(packument)})

	latest, err := n.Latest("@glw907/cairn-cms")
	if err != nil {
		t.Fatalf("Latest: %v", err)
	}
	if latest != "1.0.0" {
		t.Errorf("Latest = %q, want %q", latest, "1.0.0")
	}
}

// TestVersionsPreservesPublishOrder is the 2.0-seam test: 2.0's engine detail view lists the
// versions a site skipped, in the order this method returns them, so the ordering itself is the
// contract under test, not merely the set of versions.
func TestVersionsPreservesPublishOrder(t *testing.T) {
	n := NewNPM(fixtureRoundTripper{status: http.StatusOK, body: []byte(packument)})

	versions, err := n.Versions("@glw907/cairn-cms")
	if err != nil {
		t.Fatalf("Versions: %v", err)
	}
	want := []string{"0.1.0", "0.2.0", "1.0.0"}
	if len(versions) != len(want) {
		t.Fatalf("got %v, want %v", versions, want)
	}
	for i, v := range want {
		if versions[i] != v {
			t.Errorf("versions[%d] = %q, want %q", i, versions[i], v)
		}
	}
}

func TestNPMErrorOnNotFound(t *testing.T) {
	n := NewNPM(fixtureRoundTripper{status: http.StatusNotFound, body: []byte(`{"error":"Not found"}`)})

	_, err := n.Latest("@glw907/does-not-exist")
	var npmErr *NPMError
	if !errors.As(err, &npmErr) {
		t.Fatalf("err = %v (%T), want *NPMError", err, err)
	}
	if npmErr.Status != http.StatusNotFound {
		t.Errorf("Status = %d, want %d", npmErr.Status, http.StatusNotFound)
	}
}

func TestNewNPMSendsNoAuthorizationHeader(t *testing.T) {
	var gotAuth string
	rt := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		gotAuth = req.Header.Get("Authorization")
		return fixtureRoundTripper{status: http.StatusOK, body: []byte(packument)}.RoundTrip(req)
	})
	n := NewNPM(rt)

	if _, err := n.Latest("@glw907/cairn-cms"); err != nil {
		t.Fatalf("Latest: %v", err)
	}
	if gotAuth != "" {
		t.Errorf("Authorization header = %q, want none: NPM is always unauthenticated", gotAuth)
	}
}

// roundTripFunc adapts a function to http.RoundTripper, so a test can inspect a request in place
// without declaring a named type for one-off use.
type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}
