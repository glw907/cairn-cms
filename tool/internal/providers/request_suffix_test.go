package providers

import (
	"context"
	"net/http"
	"testing"
)

// TestProviderErrorsNameTheRequestPathOnly asserts a failed call's error text names its method and
// path, and never the query string.
func TestProviderErrorsNameTheRequestPathOnly(t *testing.T) {
	ctx := context.Background()
	cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: http.StatusForbidden, body: []byte(`{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}`)})
	_, err := cf.DNSRecords(ctx, "abc123")
	if want := "cloudflare: forbidden (status 403, code 10000) on GET /zones/abc123/dns_records"; err == nil || err.Error() != want {
		t.Errorf("Cloudflare error = %v, want %q", err, want)
	}

	gh := NewGitHub(Credential{}, fixtureRoundTripper{status: http.StatusNotFound, body: []byte(`{"message":"Not Found"}`)})
	err = gh.getJSON(ctx, "/repos/o/r/contents/package.json?ref=secret-branch", nil)
	if want := "github: not-found (status 404) on GET /repos/o/r/contents/package.json"; err == nil || err.Error() != want {
		t.Errorf("GitHub error = %v, want %q", err, want)
	}
}
