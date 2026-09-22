package providers

import (
	"context"
	"fmt"
	"io"
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

// newClient returns a client pinned to host, applying cred to every outgoing request and sending
// every request through rt. A nil rt defaults to http.DefaultTransport, the same default
// http.Client itself applies.
func newClient(host string, cred Credential, rt http.RoundTripper) *client {
	if rt == nil {
		rt = http.DefaultTransport
	}
	return &client{
		host: host,
		cred: cred,
		httpClient: &http.Client{
			Timeout:   requestTimeout,
			Transport: rt,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

// Do refuses req before dialing when its URL host does not match the client's pinned host,
// applies the client's credential, and sends it through doWithRetry. A redirect response is
// returned unfollowed, per the CheckRedirect set in newClient.
func (c *client) Do(req *http.Request) (*http.Response, error) {
	if req.URL.Host != c.host {
		return nil, fmt.Errorf("providers: refusing request to host %q, client is pinned to %q", req.URL.Host, c.host)
	}
	c.cred.apply(req)
	return doWithRetry(c.httpClient, req)
}

// getWith performs a GET against base+path through c, sending accept as the request's Accept
// header alongside the User-Agent every host this package talks to expects. It returns the raw
// status, response headers, and body with no classification, the one GET shape both the GitHub
// and the npm client read through.
func (c *client) getWith(ctx context.Context, base, path, accept string) (int, http.Header, []byte, error) {
	return c.rawGet(ctx, base+path, http.Header{
		"Accept":     {accept},
		"User-Agent": {userAgent()},
	})
}

// rawGet performs a GET against url through c, setting header on the request, and returns the
// raw status, response headers, and body with no classification: a caller like GitHub.getJSON or
// NPM's packument turns a non-2xx status into its own typed error, and TokenExpiry reads a
// header straight off the response rather than building a second request just to read one.
func (c *client) rawGet(ctx context.Context, url string, header http.Header) (status int, respHeader http.Header, body []byte, err error) {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, url, nil)
	if err != nil {
		return 0, nil, nil, fmt.Errorf("providers: build request for %s: %w", url, err)
	}
	for k, vs := range header {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}

	resp, err := c.Do(req)
	if err != nil {
		return 0, nil, nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, nil, nil, fmt.Errorf("providers: read response body: %w", err)
	}
	return resp.StatusCode, resp.Header, data, nil
}

// doWithRetry sends req via hc and, for a GET that comes back 429 or 503, waits out Retry-After
// (or defaultRetryAfter when the header is absent or unparseable) and retries exactly once; a
// second such response is returned to the caller unretried. Every other method, and a second 429
// or 503, is returned as-is. It is the one retry implementation every client in this package
// shares: client.Do calls it after pinning the host and applying a credential, and Probe.do calls
// it directly, since Probe carries neither.
//
// When the advised wait is longer than req's own remaining context deadline, doWithRetry does not
// sleep at all: the wait would only spend the request's whole remaining budget waiting, then fail
// on the deadline anyway, indistinguishable from a hang to a caller watching the clock. The
// rate-limited response is returned unretried instead, the same shape as a second 429 or 503, so
// the caller's own classification (ReasonRateLimited) still applies with no wasted wait.
func doWithRetry(hc *http.Client, req *http.Request) (*http.Response, error) {
	resp, err := hc.Do(req)
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

	return hc.Do(req.Clone(req.Context()))
}

// isErrorStatus reports whether status is outside the 2xx range, the one boundary every provider
// in this package turns into its own error type.
func isErrorStatus(status int) bool {
	return status < 200 || status >= 300
}

// isRetryableStatus reports whether status is one of the two rate-limit shapes doWithRetry
// retries once.
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
