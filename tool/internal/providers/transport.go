package providers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// requestTimeout bounds every request this package makes. The Node CLI this ports from
// (packages/create-cairn-site/src/cloudflare/api.mjs) sets no client timeout at all, so a
// stalled TLS dial there can hang forever; the scheduled, unattended cairn run must never wait
// on one dead connection for the rest of its life.
const requestTimeout = 15 * time.Second

// defaultRetryAfter is the wait used when a 429 or 503 carries no Retry-After header, matching
// the Node client's DEFAULT_RETRY_AFTER_MS (api.mjs).
const defaultRetryAfter = time.Second

// client is the shared HTTP transport every provider's public type wraps: it pins requests to
// one host, applies a credential to every request, times out, never follows a redirect, and
// retries a rate-limited GET exactly once. It carries no base-URL field; a caller builds its own
// full URL, and Do refuses anything that resolves to a different host before dialing.
type client struct {
	host       string
	cred       Credential
	httpClient *http.Client
}

// newClient returns a client pinned to host, applying cred to every outgoing request. A caller
// sets httpClient.Transport afterward to inject a test seam; a nil Transport already defaults to
// http.DefaultTransport.
func newClient(host string, cred Credential) *client {
	return &client{
		host: host,
		cred: cred,
		httpClient: &http.Client{
			Timeout: requestTimeout,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

// Do refuses req before dialing when its URL host does not match the client's pinned host,
// applies the client's credential, and sends it. A GET that comes back 429 or 503 is retried
// exactly once, after waiting out Retry-After (or defaultRetryAfter when the header is absent or
// unparseable); a second such response is returned to the caller unretried. Every other method,
// and a second 429 or 503, is returned as-is. A redirect response is likewise returned unfollowed,
// per the CheckRedirect set in newClient.
//
// When the advised wait is longer than req's own remaining context deadline, Do does not sleep
// at all: the wait would only spend the request's whole remaining budget waiting, then fail on
// the deadline anyway, indistinguishable from a hang to a caller watching the clock. The
// rate-limited response is returned unretried instead, the same shape as a second 429 or 503, so
// the caller's own classification (ReasonRateLimited) still applies with no wasted wait.
func (c *client) Do(req *http.Request) (*http.Response, error) {
	if req.URL.Host != c.host {
		return nil, fmt.Errorf("providers: refusing request to host %q, client is pinned to %q", req.URL.Host, c.host)
	}
	c.cred.apply(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	if req.Method != http.MethodGet || !isRetryableStatus(resp.StatusCode) {
		return resp, nil
	}

	wait := parseRetryAfter(resp.Header.Get("Retry-After"))
	if deadline, ok := req.Context().Deadline(); ok && wait > time.Until(deadline) {
		return resp, nil
	}

	_ = resp.Body.Close()
	timer := time.NewTimer(wait)
	defer timer.Stop()
	select {
	case <-req.Context().Done():
		return nil, req.Context().Err()
	case <-timer.C:
	}

	retryReq := req.Clone(req.Context())
	c.cred.apply(retryReq)
	return c.httpClient.Do(retryReq)
}

// isRetryableStatus reports whether status is one of the two rate-limit shapes Do retries once.
func isRetryableStatus(status int) bool {
	return status == http.StatusTooManyRequests || status == http.StatusServiceUnavailable
}

// parseRetryAfter converts a Retry-After header value (seconds, per RFC 9110) to a duration,
// falling back to defaultRetryAfter when the header is absent or not a plain non-negative
// integer.
func parseRetryAfter(header string) time.Duration {
	if header == "" {
		return defaultRetryAfter
	}
	seconds, err := strconv.Atoi(header)
	if err != nil || seconds < 0 {
		return defaultRetryAfter
	}
	return time.Duration(seconds) * time.Second
}
