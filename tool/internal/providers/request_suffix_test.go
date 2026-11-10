package providers

import (
	"context"
	"net/http"
	"strings"
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

// TestAManifestConversionErrorNamesNoCode asserts the one-time manifest code never reaches an
// error's text. The code sits in the conversion route's path, and anyone who reads it can fetch the
// new App's key. A failure's text goes to stderr, an event, and the failure screen.
func TestAManifestConversionErrorNamesNoCode(t *testing.T) {
	const code = "c0de-one-time-secret"
	gh := NewGitHub(Credential{}, fixtureRoundTripper{status: http.StatusBadGateway, body: []byte(`{"message":"Bad Gateway"}`)})
	_, err := gh.ConvertManifest(context.Background(), code)
	if err == nil {
		t.Fatal("ConvertManifest on a 502 returned no error")
	}
	if strings.Contains(err.Error(), code) {
		t.Errorf("the error text %q holds the manifest code", err.Error())
	}
	if want := "github: unknown (status 502) on POST /app-manifests/{code}/conversions"; err.Error() != want {
		t.Errorf("error = %q, want %q", err.Error(), want)
	}
}

// TestACloudflareErrorPathKeepsEscapedSegments asserts the request path in an error's text stays
// in its escaped form, so a name with a control character reaches a terminal as an escape.
func TestACloudflareErrorPathKeepsEscapedSegments(t *testing.T) {
	cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: http.StatusForbidden, body: []byte(`{"success":false,"errors":[{"code":10000}]}`)})
	err := cf.PutWorkerSecret(context.Background(), "a\x1b[31mb", "NAME", "value")
	if err == nil {
		t.Fatal("PutWorkerSecret on a 403 returned no error")
	}
	if strings.ContainsRune(err.Error(), 0x1b) {
		t.Errorf("the error text %q holds a raw escape byte", err.Error())
	}
}

// TestEscapeRefKeepsSlashes asserts a ref keeps its slashes and escapes anything else, so a branch
// named feature/x reaches the commits route as GitHub reads it.
func TestEscapeRefKeepsSlashes(t *testing.T) {
	for ref, want := range map[string]string{
		"main":        "main",
		"feature/x":   "feature/x",
		"fix/a b":     "fix/a%20b",
		"release?x=1": "release%3Fx=1",
		"":            "",
	} {
		if got := escapeRef(ref); got != want {
			t.Errorf("escapeRef(%q) = %q, want %q", ref, got, want)
		}
	}
}
