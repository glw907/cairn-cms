package providers

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"
)

// Resolver is the DNS lookup surface Probe depends on, satisfied by *net.Resolver in production
// and a fake in tests. Its three methods are *net.Resolver's own signatures, so no adapter is
// needed to satisfy it in production code.
type Resolver interface {
	LookupTXT(ctx context.Context, name string) ([]string, error)
	LookupNS(ctx context.Context, name string) ([]*net.NS, error)
	LookupIP(ctx context.Context, network, host string) ([]net.IP, error)
}

// Probe is the tool's unauthenticated HTTP and DNS client, used by the checks (Task 13 onward)
// that reach an arbitrary site's own domain rather than a fixed provider API. It carries no
// Credential field and never sends an Authorization header, since a check probing a third
// party's DNS or a custom domain has no business presenting this operator's own token to it.
type Probe struct {
	resolver  Resolver
	following *http.Client
	noFollow  *http.Client
}

// NewProbe returns a Probe sending every HTTP request through rt and every DNS lookup through
// resolver.
func NewProbe(rt http.RoundTripper, resolver Resolver) *Probe {
	return &Probe{
		resolver:  resolver,
		following: &http.Client{Timeout: requestTimeout, Transport: rt},
		noFollow: &http.Client{
			Timeout:   requestTimeout,
			Transport: rt,
			CheckRedirect: func(*http.Request, []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

// Get performs a GET against rawURL, following redirects, the behavior a check wants when it
// only cares about the page a domain finally serves.
func (p *Probe) Get(rawURL string) (*http.Response, error) {
	return p.do(p.following, rawURL)
}

// GetNoFollow performs a GET against rawURL and returns a redirect response unfollowed, the
// behavior the hostname and delegation checks (Task 13) want when the redirect itself, and its
// Location, is the thing under test.
func (p *Probe) GetNoFollow(rawURL string) (*http.Response, error) {
	return p.do(p.noFollow, rawURL)
}

// do sends a GET through hc, applying the same timeout and single-retry-on-rate-limit policy
// transport.go's client.Do applies for every other provider. It cannot share that type: Get and
// GetNoFollow need two different redirect policies on the same Probe, while every other client
// in this package refuses every redirect unconditionally.
func (p *Probe) do(hc *http.Client, rawURL string) (*http.Response, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("providers: build request for %s: %w", rawURL, err)
	}
	req.Header.Set("User-Agent", userAgent())

	resp, err := doRetrying(hc, req)
	if err != nil {
		return nil, err
	}
	body, err := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if err != nil {
		return nil, fmt.Errorf("providers: read response body for %s: %w", rawURL, err)
	}
	resp.Body = io.NopCloser(bytes.NewReader(body))
	return resp, nil
}

// doRetrying sends req via hc and, for a GET that comes back 429 or 503, waits out Retry-After
// (or defaultRetryAfter) and retries exactly once, mirroring transport.go's client.Do. It
// duplicates that method's retry half rather than calling it, since client.Do also pins a host
// and applies a Credential, neither of which Probe has.
func doRetrying(hc *http.Client, req *http.Request) (*http.Response, error) {
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

// LookupTXT resolves name's TXT records, bounded by the package's shared request timeout.
func (p *Probe) LookupTXT(name string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	return p.resolver.LookupTXT(ctx, name)
}

// LookupNS resolves name's NS records, bounded by the package's shared request timeout.
func (p *Probe) LookupNS(name string) ([]*net.NS, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	return p.resolver.LookupNS(ctx, name)
}

// LookupA resolves name's IPv4 addresses, bounded by the package's shared request timeout.
func (p *Probe) LookupA(name string) ([]net.IP, error) {
	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()
	return p.resolver.LookupIP(ctx, "ip4", name)
}
