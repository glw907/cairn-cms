package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// TestNewClientSetsExplicitTimeout guards against silently reverting to the Node client's
// no-timeout behavior: newClient must always set a positive http.Client.Timeout.
func TestNewClientSetsExplicitTimeout(t *testing.T) {
	c := newClient("example.com", Credential{}, http.DefaultTransport)
	if c.httpClient.Timeout <= 0 {
		t.Fatalf("newClient: httpClient.Timeout = %v, want a positive explicit timeout", c.httpClient.Timeout)
	}
}

// TestNewClientNilRoundTripperDefaultsToDefaultTransport asserts a nil RoundTripper still means
// http.DefaultTransport, the same default http.Client itself applies to a nil Transport, rather
// than a client that can never dial.
func TestNewClientNilRoundTripperDefaultsToDefaultTransport(t *testing.T) {
	c := newClient("example.com", Credential{}, nil)
	if c.httpClient.Transport != http.DefaultTransport {
		t.Errorf("httpClient.Transport = %v, want http.DefaultTransport for a nil RoundTripper", c.httpClient.Transport)
	}
}

// TestDoReturnsOnContextDeadline proves a request whose context deadline fires before a slow
// handler responds returns rather than blocking, the failure mode porting the Node client's
// no-timeout behavior verbatim would reintroduce.
func TestDoReturnsOnContextDeadline(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	u, err := url.Parse(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	c := newClient(u.Host, Credential{}, http.DefaultTransport)

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatal(err)
	}

	done := make(chan error, 1)
	go func() {
		_, doErr := c.Do(req)
		done <- doErr
	}()

	select {
	case doErr := <-done:
		if doErr == nil {
			t.Fatal("Do: want an error when the handler outlives the request's context deadline")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Do: did not return within 2s of a 50ms context deadline; the request is hanging")
	}
}

// TestDoDoesNotFollowRedirects asserts a 302 is returned to the caller unfollowed, and that the
// redirect target never sees a request, matching CheckRedirect's http.ErrUseLastResponse.
func TestDoDoesNotFollowRedirects(t *testing.T) {
	var secondHits atomic.Int32
	second := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		secondHits.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer second.Close()

	first := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, second.URL, http.StatusFound)
	}))
	defer first.Close()

	u, err := url.Parse(first.URL)
	if err != nil {
		t.Fatal(err)
	}
	c := newClient(u.Host, Credential{}, http.DefaultTransport)

	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, first.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := c.Do(req)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusFound {
		t.Errorf("StatusCode = %d, want %d (redirect returned unfollowed)", resp.StatusCode, http.StatusFound)
	}
	if got := secondHits.Load(); got != 0 {
		t.Errorf("redirect target saw %d requests, want 0", got)
	}
}

// TestDoRefusesMismatchedHost asserts a request built for a different host than the client is
// pinned to is refused before any dial, so no code path can accidentally point a Cloudflare
// client at an attacker-controlled host.
func TestDoRefusesMismatchedHost(t *testing.T) {
	c := newClient("api.cloudflare.com", Credential{}, http.DefaultTransport)
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, "https://evil.api.cloudflare.com/foo", nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := c.Do(req); err == nil {
		t.Fatal("Do: want an error for a request to a mismatched host, got nil")
	}
}

// TestDoRetriesRateLimitedGET covers both Retry-After shapes the Node client's own policy
// (packages/create-cairn-site/src/cloudflare/api.mjs) handles: a numeric header, and no header at
// all (the default wait), asserting exactly one retry in each case, and that a second
// rate-limited response is not retried again.
func TestDoRetriesRateLimitedGET(t *testing.T) {
	tests := []struct {
		name           string
		status         int
		retryAfter     string
		secondStatus   int
		wantFinalCode  int
		wantHitsOnGood int
	}{
		{"429 with Retry-After succeeds on retry", http.StatusTooManyRequests, "0", http.StatusOK, http.StatusOK, 2},
		{"429 with no header still retries once", http.StatusTooManyRequests, "", http.StatusTooManyRequests, http.StatusTooManyRequests, 2},
		{"503 with Retry-After succeeds on retry", http.StatusServiceUnavailable, "0", http.StatusOK, http.StatusOK, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var hits atomic.Int32
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				n := hits.Add(1)
				if n == 1 {
					if tt.retryAfter != "" {
						w.Header().Set("Retry-After", tt.retryAfter)
					}
					w.WriteHeader(tt.status)
					return
				}
				w.WriteHeader(tt.secondStatus)
			}))
			defer srv.Close()

			u, err := url.Parse(srv.URL)
			if err != nil {
				t.Fatal(err)
			}
			c := newClient(u.Host, Credential{}, http.DefaultTransport)

			req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, srv.URL, nil)
			if err != nil {
				t.Fatal(err)
			}
			resp, err := c.Do(req)
			if err != nil {
				t.Fatalf("Do: %v", err)
			}
			defer func() { _ = resp.Body.Close() }()

			if resp.StatusCode != tt.wantFinalCode {
				t.Errorf("StatusCode = %d, want %d", resp.StatusCode, tt.wantFinalCode)
			}
			if got := hits.Load(); got != int32(tt.wantHitsOnGood) {
				t.Errorf("server saw %d requests, want exactly %d (one retry)", got, tt.wantHitsOnGood)
			}
		})
	}
}

// TestDoDoesNotRetryNonGET asserts the retry policy is GET-only, matching the Node client: a
// failed write is reported to the caller rather than retried blind, since a create or an attach
// that failed partway may or may not have taken effect.
func TestDoDoesNotRetryNonGET(t *testing.T) {
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	u, err := url.Parse(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	c := newClient(u.Host, Credential{}, http.DefaultTransport)

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, srv.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := c.Do(req)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if got := hits.Load(); got != 1 {
		t.Errorf("server saw %d requests for a rate-limited POST, want exactly 1 (no retry)", got)
	}
}

// TestDoDoesNotWaitPastRequestBudget asserts a Retry-After longer than a request's own remaining
// context deadline does not surface as a context error: Do must return the rate-limited response
// unretried at once, rather than sleeping past the deadline and returning a bare "context
// deadline exceeded" that hides the real 429 or 503 from the caller's classification.
func TestDoDoesNotWaitPastRequestBudget(t *testing.T) {
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Retry-After", "3600")
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	u, err := url.Parse(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	c := newClient(u.Host, Credential{}, http.DefaultTransport)

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatal(err)
	}

	done := make(chan struct {
		resp *http.Response
		err  error
	}, 1)
	go func() {
		resp, doErr := c.Do(req)
		done <- struct {
			resp *http.Response
			err  error
		}{resp, doErr}
	}()

	select {
	case result := <-done:
		if result.err != nil {
			t.Fatalf("Do: %v, want the rate-limited response returned unretried", result.err)
		}
		defer func() { _ = result.resp.Body.Close() }()
		if result.resp.StatusCode != http.StatusTooManyRequests {
			t.Errorf("StatusCode = %d, want %d", result.resp.StatusCode, http.StatusTooManyRequests)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Do: did not return within 2s; an hour-long Retry-After must not be waited out")
	}
	if got := hits.Load(); got != 1 {
		t.Errorf("server saw %d requests, want exactly 1 (no retry when Retry-After exceeds the budget)", got)
	}
}

// TestCredentialAppliesAuthorizationHeader and its sibling below cover cred.go's apply, which has
// no dedicated test file of its own per this task's file list.
func TestCredentialAppliesAuthorizationHeader(t *testing.T) {
	c := NewCredential("super-secret-token")
	req, err := http.NewRequest(http.MethodGet, "https://example.com", nil)
	if err != nil {
		t.Fatal(err)
	}
	c.apply(req)
	if got := req.Header.Get("Authorization"); got != "Bearer super-secret-token" {
		t.Errorf("Authorization header = %q, want %q", got, "Bearer super-secret-token")
	}
}

// TestZeroCredentialAppliesNoHeader asserts an unauthenticated (zero-value) Credential sends no
// Authorization header, the behavior the unauthenticated GitHub and Probe clients rely on.
func TestZeroCredentialAppliesNoHeader(t *testing.T) {
	var c Credential
	req, err := http.NewRequest(http.MethodGet, "https://example.com", nil)
	if err != nil {
		t.Fatal(err)
	}
	c.apply(req)
	if got := req.Header.Get("Authorization"); got != "" {
		t.Errorf("Authorization header = %q, want none for a zero Credential", got)
	}
}

// TestCredentialNeverLeaksInFormatting asserts every formatting and marshaling path a Credential
// can reach through fmt or encoding/json redacts the wrapped value.
func TestCredentialNeverLeaksInFormatting(t *testing.T) {
	const secret = "super-secret-token"
	c := NewCredential(secret)

	formatted := fmt.Sprintf("%v %+v %#v %s", c, c, c, c)
	if strings.Contains(formatted, secret) {
		t.Errorf("formatted output %q leaks the credential", formatted)
	}

	data, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), secret) {
		t.Errorf("json.Marshal output %q leaks the credential", data)
	}

	text, err := c.MarshalText()
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(text), secret) {
		t.Errorf("MarshalText output %q leaks the credential", text)
	}
}
