package providers

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
)

// Resolver is the DNS lookup surface Probe depends on, satisfied by *net.Resolver in production
// and a fake in tests. Its three methods are *net.Resolver's own signatures, so no adapter is
// needed to satisfy it in production code.
type Resolver interface {
	LookupTXT(ctx context.Context, name string) ([]string, error)
	LookupNS(ctx context.Context, name string) ([]*net.NS, error)
	LookupIP(ctx context.Context, network, host string) ([]net.IP, error)
}

// Probe is the tool's unauthenticated HTTP and DNS client, used by the checks that reach an
// arbitrary site's own domain rather than a fixed provider API. It carries no
// Credential field and never sends an Authorization header, since a check probing a third
// party's DNS or a custom domain has no business presenting this operator's own token to it.
type Probe struct {
	resolver  Resolver
	following *http.Client
	noFollow  *http.Client
}

// NewProbe returns a Probe sending every HTTP request through rt and every DNS lookup through
// resolver. A nil resolver defaults to net.DefaultResolver.
func NewProbe(rt http.RoundTripper, resolver Resolver) *Probe {
	if resolver == nil {
		resolver = net.DefaultResolver
	}
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
func (p *Probe) Get(ctx context.Context, rawURL string) (*http.Response, error) {
	return p.do(ctx, p.following, rawURL)
}

// GetNoFollow performs a GET against rawURL and returns a redirect response unfollowed, the
// behavior the hostname and delegation checks want when the redirect itself, and its Location,
// is the thing under test.
func (p *Probe) GetNoFollow(ctx context.Context, rawURL string) (*http.Response, error) {
	return p.do(ctx, p.noFollow, rawURL)
}

// do sends a GET through hc, applying the same timeout and single-retry-on-rate-limit policy
// transport.go's doWithRetry applies for every other provider. It cannot share client.Do: Get
// and GetNoFollow need two different redirect policies on the same Probe, while every other
// client in this package refuses every redirect unconditionally.
func (p *Probe) do(ctx context.Context, hc *http.Client, rawURL string) (*http.Response, error) {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("providers: build request for %s: %w", rawURL, err)
	}
	req.Header.Set("User-Agent", userAgent())

	resp, err := doWithRetry(hc, req)
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

// LookupTXT resolves name's TXT records, bounded by the package's shared request timeout.
func (p *Probe) LookupTXT(ctx context.Context, name string) ([]string, error) {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	return p.resolver.LookupTXT(reqCtx, name)
}

// LookupNS resolves name's NS records, bounded by the package's shared request timeout.
func (p *Probe) LookupNS(ctx context.Context, name string) ([]*net.NS, error) {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	return p.resolver.LookupNS(reqCtx, name)
}

// LookupA resolves name's IPv4 addresses, bounded by the package's shared request timeout.
func (p *Probe) LookupA(ctx context.Context, name string) ([]net.IP, error) {
	reqCtx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	return p.resolver.LookupIP(reqCtx, "ip4", name)
}
