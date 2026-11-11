package providers

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unicode/utf8"
)

// requestTimeout bounds every request this package makes. The Node CLI this ports from
// (the retired Node wizard) set no client timeout at all, so a
// stalled TLS dial there can hang forever; the scheduled, unattended cairn run must never wait
// on one dead connection for the rest of its life.
const requestTimeout = 15 * time.Second

// defaultRetryAfter is the wait used when a 429 or 503 carries no Retry-After header, matching
// the Node client's DEFAULT_RETRY_AFTER_MS (api.mjs).
const defaultRetryAfter = time.Second

// client is the shared HTTP transport every provider's public type wraps: it pins requests to
// one host, applies a credential to every request, times out, never follows a redirect, and
// retries a rate-limited GET exactly once and a request that never left this computer a few
// times. It carries no base-URL field; a caller builds the full URL, and Do refuses anything that
// resolves to a different host before dialing.
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
// applies the client's credential, and sends it through the rate-limit retry and the dial retry.
// A redirect response is returned unfollowed, per the CheckRedirect set in newClient. A failed
// request's error keeps the method and the cause and drops the URL, whose path or query can
// carry a one-time code.
func (c *client) Do(req *http.Request) (*http.Response, error) {
	if req.URL.Host != c.host {
		return nil, fmt.Errorf("providers: refusing request to host %q, client is pinned to %q", req.URL.Host, c.host)
	}
	c.cred.apply(req)
	resp, err := retryRateLimited(c.httpClient, req, sendRetryingDial)
	if ue, ok := errors.AsType[*url.Error](err); ok {
		return nil, &TransportError{Op: ue.Op, Host: c.host, Err: ue.Err}
	}
	return resp, err
}

// TransportError reports a request that got no response: the method, the host the client is pinned
// to, and the cause. It carries no URL, since a path or a query can hold a one-time code. Its
// text names a fixed class of cause and never the cause's own words, which Go can fill with a
// proxy URL's credentials or a header's value. A stop shows that text as the failure's detail,
// so an owner or an agent can tell a lookup that dropped from a token that lacks a permission.
type TransportError struct {
	// Op is the method as net/http names it, such as Get or Post.
	Op string
	// Host is the host the client is pinned to.
	Host string
	// Err is the cause the transport reported. It stays whole for errors.Is and errors.As.
	Err error
}

// Provider names the service Host belongs to, such as github or npm, or returns "" for a host no
// client in this package is pinned to.
func (e *TransportError) Provider() string {
	switch e.Host {
	case cloudflareHost, cloudflareOAuthHost:
		return "cloudflare"
	case githubHost, githubWebHost:
		return "github"
	case npmHost:
		return "npm"
	}
	return ""
}

// Error implements the error interface.
func (e *TransportError) Error() string {
	return e.Op + " request to " + e.Host + ": " + transportClass(e.Err)
}

// classLimit cuts the resolver strings transportClass quotes.
const classLimit = 60

// cutRunes returns s cut to at most n bytes without splitting a rune.
func cutRunes(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for n > 0 && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n]
}

// transportClass names what kind of failure err is, from a fixed set of phrases and the short
// resolver strings a DNS error carries. It never repeats err's text, since Go's cause text can
// quote a proxy address with credentials, a header value, or a status line.
func transportClass(err error) string {
	if err == nil {
		return "transport error"
	}
	if ue, ok := errors.AsType[*url.Error](err); ok {
		err = ue.Err
	}
	if de, ok := errors.AsType[*net.DNSError](err); ok {
		return "DNS lookup of " + cutRunes(de.Name, classLimit) + " failed: " + cutRunes(de.Err, classLimit)
	}
	op, isOp := errors.AsType[*net.OpError](err)
	switch {
	case isTLSError(err):
		return "TLS error"
	case isOp && op.Op == "proxyconnect", strings.Contains(strings.ToLower(err.Error()), "proxy"):
		return "proxy error"
	case errors.Is(err, context.DeadlineExceeded), errors.Is(err, os.ErrDeadlineExceeded), isTimeout(err):
		return "timed out"
	case isOp && op.Op == "dial":
		switch {
		case errors.Is(err, syscall.ECONNREFUSED):
			return "connection refused"
		case errors.Is(err, syscall.ENETUNREACH), errors.Is(err, syscall.EHOSTUNREACH):
			return "network unreachable"
		case errors.Is(err, syscall.ETIMEDOUT):
			return "timed out"
		}
		return "could not connect"
	case errors.Is(err, io.EOF), errors.Is(err, io.ErrUnexpectedEOF), errors.Is(err, syscall.ECONNRESET), errors.Is(err, syscall.EPIPE):
		return "connection closed unexpectedly"
	}
	return "transport error"
}

// isTimeout reports whether err is a net.Error that timed out.
func isTimeout(err error) bool {
	ne, ok := errors.AsType[net.Error](err)
	return ok && ne.Timeout()
}

// isTLSError reports whether err is a certificate or handshake failure, including an alert the
// server sent.
func isTLSError(err error) bool {
	if _, ok := errors.AsType[*tls.CertificateVerificationError](err); ok {
		return true
	}
	if _, ok := errors.AsType[x509.UnknownAuthorityError](err); ok {
		return true
	}
	if _, ok := errors.AsType[*x509.UnknownAuthorityError](err); ok {
		return true
	}
	if _, ok := errors.AsType[x509.HostnameError](err); ok {
		return true
	}
	if _, ok := errors.AsType[x509.CertificateInvalidError](err); ok {
		return true
	}
	// crypto/tls reports an alert the server sent as a *net.OpError with this Op and an unexported
	// cause, so the Op is the only match. No other package in the standard library sets it.
	if op, ok := errors.AsType[*net.OpError](err); ok && op.Op == "remote error" {
		return true
	}
	if _, ok := errors.AsType[tls.AlertError](err); ok {
		return true
	}
	_, ok := errors.AsType[tls.RecordHeaderError](err)
	return ok
}

// Unwrap returns the cause.
func (e *TransportError) Unwrap() error { return e.Err }

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
// NPM's packument turns a non-2xx status into its typed error, and TokenExpiry reads a
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

// doWithRetry is retryRateLimited over a plain send: the one Probe uses, which adds no dial
// retry.
func doWithRetry(hc *http.Client, req *http.Request) (*http.Response, error) {
	return retryRateLimited(hc, req, (*http.Client).Do)
}

// retryRateLimited sends req through send and, for a GET that comes back 429 or 503, waits out Retry-After
// (or defaultRetryAfter when the header is absent or unparseable) and retries exactly once; a
// second such response is returned to the caller unretried. Every other method, and a second 429
// or 503, is returned as-is. It is the one retry implementation every client in this package
// shares: client.Do calls it after pinning the host and applying a credential, passing the dial
// retry as send, and Probe.do reaches it through doWithRetry with a plain send, so the serving and
// https probes and the site poll send once. The health credential and API checks use the provider
// clients, and share the dial retry.
//
// When the advised wait is longer than req's remaining context deadline, retryRateLimited does not
// sleep at all: the wait would only spend the request's whole remaining budget waiting, then fail
// on the deadline anyway, indistinguishable from a hang to a caller watching the clock. The
// rate-limited response is returned unretried instead, the same shape as a second 429 or 503, so
// the caller's classification (ReasonRateLimited) still applies with no wasted wait.
func retryRateLimited(hc *http.Client, req *http.Request, send func(*http.Client, *http.Request) (*http.Response, error)) (*http.Response, error) {
	resp, err := send(hc, req)
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

	return send(hc, req.Clone(req.Context()))
}

// maxSendAttempts is how many times sendRetryingDial sends one request in all.
const maxSendAttempts = 3

// sendRetryingDial sends req via hc and retries a failure that is safe to repeat, waiting 1s and
// then 2s, up to maxSendAttempts sends in all. The cases, by what the failure proves:
//
//   - A *net.DNSError, or a *net.OpError whose Op is "dial" (timeout, refusal, no route): no
//     connection was made, so no request reached the provider. Safe to repeat for every method,
//     POST and PUT included.
//   - Any other transport failure (a reset, an EOF, a timeout after the connection was made):
//     the provider may have received and acted on the request. Repeated only for GET and HEAD,
//     which change nothing, and not for a TLS or proxy failure, which a second try cannot change;
//     a POST, PUT, PATCH, or DELETE returns the error as is.
//   - Behind an HTTP proxy Go wraps a connect failure as Op "proxyconnect", not "dial", so a POST
//     is repeated there only when the lookup of the proxy host's name failed, which also means no
//     connection was made. That errs on the safe side.
//   - A response with any HTTP status is never repeated here, so a 401, 429, or 503 reaches the
//     caller. retryRateLimited's separate one-shot GET retry of 429 and 503 is unchanged.
//
// Each attempt sends a fresh clone with its body rebuilt from GetBody, so a replayed body is
// whole. A request whose body cannot be rebuilt is never repeated. The loop ends at once when
// req's context does.
func sendRetryingDial(hc *http.Client, req *http.Request) (*http.Response, error) {
	wait := time.Second
	for attempt := 1; ; attempt++ {
		resp, err := hc.Do(req)
		if err == nil || attempt == maxSendAttempts || req.Context().Err() != nil || !repeatable(req, err) {
			return resp, err
		}
		if werr := dialRetryWait(req.Context(), wait); werr != nil {
			return nil, err
		}
		wait *= 2
		next := req.Clone(req.Context())
		if req.GetBody != nil {
			body, berr := req.GetBody()
			if berr != nil {
				return nil, err
			}
			next.Body = body
		}
		req = next
	}
}

// repeatable reports whether a request that failed with err may be sent again, per
// sendRetryingDial's cases.
func repeatable(req *http.Request, err error) bool {
	if req.Body != nil && req.Body != http.NoBody && req.GetBody == nil {
		return false
	}
	if _, ok := errors.AsType[*net.DNSError](err); ok {
		return true
	}
	if op, ok := errors.AsType[*net.OpError](err); ok && op.Op == "dial" {
		return true
	}
	if class := transportClass(err); class == "TLS error" || class == "proxy error" {
		return false
	}
	return req.Method == http.MethodGet || req.Method == http.MethodHead
}

// dialRetryWait waits d before a retried dial, or ends early with ctx's error. Tests replace it
// so none of them sleeps.
var dialRetryWait = func(ctx context.Context, d time.Duration) error {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

// isErrorStatus reports whether status is outside the 2xx range, the one boundary every provider
// in this package turns into its error type.
func isErrorStatus(status int) bool {
	return status < 200 || status >= 300
}

// isRetryableStatus reports whether status is one of the two rate-limit shapes retryRateLimited
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

// SetDialRetryWait replaces how the dial retry waits between attempts and returns a function that
// restores the previous wait. It exists for tests in other packages, such as the health checks,
// that must not sleep through a retry. It is never for production code, and a test that calls it
// must not run in parallel, since the wait is one package-wide value.
func SetDialRetryWait(wait func(ctx context.Context, d time.Duration) error) (restore func()) {
	previous := dialRetryWait
	dialRetryWait = wait
	return func() { dialRetryWait = previous }
}
