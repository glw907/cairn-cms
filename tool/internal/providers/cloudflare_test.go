package providers

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"testing"
)

// fixtureRoundTripper serves one fixed status and body for every request, standing in for
// Cloudflare's API in a test.
type fixtureRoundTripper struct {
	status int
	body   []byte
}

func (rt fixtureRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return &http.Response{
		StatusCode: rt.status,
		Body:       io.NopCloser(bytes.NewReader(rt.body)),
		Header:     make(http.Header),
		Request:    req,
	}, nil
}

// TestClassifyReason covers every Reason value's mapping rule, including the two the task names
// explicitly: a 403 with code 10000 classifies as ReasonForbidden, and a 401 as ReasonUnauthorized,
// regardless of the accompanying code, since neither status carries a code-specific override.
func TestClassifyReason(t *testing.T) {
	tests := []struct {
		name         string
		status, code int
		want         Reason
	}{
		{"401 classifies as unauthorized", http.StatusUnauthorized, 10000, ReasonUnauthorized},
		{"403 with code 10000 classifies as forbidden", http.StatusForbidden, 10000, ReasonForbidden},
		{"404 classifies as not found", http.StatusNotFound, 7003, ReasonNotFound},
		{"429 classifies as rate limited", http.StatusTooManyRequests, 0, ReasonRateLimited},
		{"503 classifies as rate limited", http.StatusServiceUnavailable, 0, ReasonRateLimited},
		{"code 8000008 classifies as builds app not authorized", http.StatusNotFound, 8000008, ReasonBuildsAppNotAuthorized},
		{"code 8000012 classifies as builds repo not selected", http.StatusNotFound, 8000012, ReasonBuildsRepoNotSelected},
		{"code 10203 classifies as sender not configured", http.StatusForbidden, 10203, ReasonSenderNotConfigured},
		{"code 10204 classifies as sender not configured", http.StatusForbidden, 10204, ReasonSenderNotConfigured},
		{"code 12000 classifies as builds not connected", http.StatusNotFound, 12000, ReasonBuildsNotConnected},
		{"an unmapped status and code classifies as unknown", http.StatusTeapot, 0, ReasonUnknown},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := classifyReason(tt.status, tt.code); got != tt.want {
				t.Errorf("classifyReason(%d, %d) = %v, want %v", tt.status, tt.code, got, tt.want)
			}
		})
	}
}

// TestReasonMappingFromCorpusFixtures drives the classification end to end, over a client whose
// RoundTripper serves a real captured fixture, for every Reason the fixture corpus carries a
// live-captured body for. The corpus's own rule (packages/create-cairn-site/fixtures/README.md:
// "every body here is a real captured API response") is why this is not all nine Reason values:
// the corpus never captured a plain 401, a generic 403, a rate limit, or an unconnected Builds
// worker, and inventing one to fill the gap would violate that rule, so those four are covered
// only by TestClassifyReason's direct unit table above, not by a corpus fixture.
func TestReasonMappingFromCorpusFixtures(t *testing.T) {
	tests := []struct {
		name    string
		fixture string
		want    Reason
	}{
		{"not found", "zone.not-found.404.json", ReasonNotFound},
		{"builds app not authorized", "builds_connection_put.app-not-authorized.404.json", ReasonBuildsAppNotAuthorized},
		{"builds repo not selected", "builds_connection_put.repo-not-selected.404.json", ReasonBuildsRepoNotSelected},
		{"sender not configured", "email_send.refused-sender-not-configured.403.json", ReasonSenderNotConfigured},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, body := Corpus(t, "cloudflare", tt.fixture)
			cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: status, body: body})

			_, err := cf.VerifyToken()

			var apiErr *APIError
			if !errors.As(err, &apiErr) {
				t.Fatalf("VerifyToken: err = %v (%T), want *APIError", err, err)
			}
			if apiErr.Status != status {
				t.Errorf("Status = %d, want %d", apiErr.Status, status)
			}
			if apiErr.Reason != tt.want {
				t.Errorf("Reason = %v, want %v", apiErr.Reason, tt.want)
			}
		})
	}
}

// TestVerifyTokenDecodesSuccess proves the happy-path decode: a 200 v4 envelope carrying
// result.id in its result field returns that id with no error. The corpus's own
// user_token_verify.success.200.json stores only the pieces the Node fake reconstructs an
// envelope from (see fake-cloudflare.mjs's sendSuccess call site), not the wire-exact wrapped
// body, so this test builds the envelope by hand around a fixed id rather than reading it from
// Corpus.
func TestVerifyTokenDecodesSuccess(t *testing.T) {
	body := []byte(`{"success":true,"errors":[],"result":{"id":"00000000000000000000000000000001","status":"active"}}`)
	cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: http.StatusOK, body: body})

	id, err := cf.VerifyToken()
	if err != nil {
		t.Fatalf("VerifyToken: %v", err)
	}
	if id != "00000000000000000000000000000001" {
		t.Errorf("id = %q, want the fixed token id", id)
	}
}

// TestNewCloudflareRefusesMismatchedHost asserts the RoundTripper is the client's only test
// seam: a request this client builds always targets cloudflareHost, so even a RoundTripper that
// would happily serve any host never sees a request for a different one.
func TestNewCloudflareRefusesMismatchedHost(t *testing.T) {
	cf := NewCloudflare("acct123", Credential{}, fixtureRoundTripper{status: http.StatusOK, body: []byte(`{}`)})
	if cf.client.host != cloudflareHost {
		t.Errorf("client.host = %q, want %q", cf.client.host, cloudflareHost)
	}
}
