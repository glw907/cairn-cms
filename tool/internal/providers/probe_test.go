package providers

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"sync/atomic"
	"testing"
	"time"
)

// TestProbeHasNoCredentialField asserts Probe carries no field of type Credential at any
// nesting depth a caller could reach directly, since a probe reaches an arbitrary third-party
// domain, not one of this operator's own provider APIs.
func TestProbeHasNoCredentialField(t *testing.T) {
	credType := reflect.TypeFor[Credential]()
	for field := range reflect.TypeFor[Probe]().Fields() {
		if field.Type == credType {
			t.Errorf("Probe.%s has type Credential, want none", field.Name)
		}
	}
}

func TestProbeSendsNoAuthorizationHeader(t *testing.T) {
	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	p := NewProbe(http.DefaultTransport, &fakeResolver{})
	resp, err := p.Get(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if gotAuth != "" {
		t.Errorf("Authorization header = %q, want none", gotAuth)
	}
	_ = resp.Body.Close()
}

// TestGetFollowsRedirectChain proves Get resolves a 302 chain to its final response, unlike
// every other client in this package.
func TestGetFollowsRedirectChain(t *testing.T) {
	var finalHits atomic.Int32
	final := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		finalHits.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer final.Close()

	redirecting := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, final.URL, http.StatusFound)
	}))
	defer redirecting.Close()

	p := NewProbe(http.DefaultTransport, &fakeResolver{})
	resp, err := p.Get(context.Background(), redirecting.URL)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("StatusCode = %d, want %d (Get should follow the redirect)", resp.StatusCode, http.StatusOK)
	}
	if got := finalHits.Load(); got != 1 {
		t.Errorf("final server saw %d requests, want 1", got)
	}
}

// TestGetNoFollowReturnsRedirectUnfollowed proves GetNoFollow returns a 303 itself, with its
// Location, rather than resolving it.
func TestGetNoFollowReturnsRedirectUnfollowed(t *testing.T) {
	var finalHits atomic.Int32
	final := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		finalHits.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer final.Close()

	redirecting := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, final.URL, http.StatusSeeOther)
	}))
	defer redirecting.Close()

	p := NewProbe(http.DefaultTransport, &fakeResolver{})
	resp, err := p.GetNoFollow(context.Background(), redirecting.URL)
	if err != nil {
		t.Fatalf("GetNoFollow: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusSeeOther {
		t.Errorf("StatusCode = %d, want %d", resp.StatusCode, http.StatusSeeOther)
	}
	if resp.Header.Get("Location") != final.URL {
		t.Errorf("Location = %q, want %q", resp.Header.Get("Location"), final.URL)
	}
	if got := finalHits.Load(); got != 0 {
		t.Errorf("final server saw %d requests, want 0 (redirect must not be followed)", got)
	}
}

// fakeResolver is a Resolver whose three methods return canned values, so a DNS test never
// touches the real network.
type fakeResolver struct {
	txt     []string
	txtErr  error
	ns      []*net.NS
	nsErr   error
	ips     []net.IP
	ipsErr  error
	gotName string
}

func (r *fakeResolver) LookupTXT(_ context.Context, name string) ([]string, error) {
	r.gotName = name
	return r.txt, r.txtErr
}

func (r *fakeResolver) LookupNS(_ context.Context, name string) ([]*net.NS, error) {
	r.gotName = name
	return r.ns, r.nsErr
}

func (r *fakeResolver) LookupIP(_ context.Context, network, host string) ([]net.IP, error) {
	r.gotName = host
	if network != "ip4" {
		panic("LookupA must request the ip4 network, got " + network)
	}
	return r.ips, r.ipsErr
}

func TestProbeLookupTXT(t *testing.T) {
	r := &fakeResolver{txt: []string{"v=spf1 -all"}}
	p := NewProbe(http.DefaultTransport, r)

	got, err := p.LookupTXT(context.Background(), "example.com")
	if err != nil {
		t.Fatalf("LookupTXT: %v", err)
	}
	if len(got) != 1 || got[0] != "v=spf1 -all" || r.gotName != "example.com" {
		t.Errorf("LookupTXT = %v, name = %q, want [v=spf1 -all] for example.com", got, r.gotName)
	}
}

func TestProbeLookupNS(t *testing.T) {
	want := []*net.NS{{Host: "ns1.example.com."}}
	r := &fakeResolver{ns: want}
	p := NewProbe(http.DefaultTransport, r)

	got, err := p.LookupNS(context.Background(), "example.com")
	if err != nil {
		t.Fatalf("LookupNS: %v", err)
	}
	if len(got) != 1 || got[0].Host != "ns1.example.com." {
		t.Errorf("LookupNS = %v, want %v", got, want)
	}
}

func TestProbeLookupA(t *testing.T) {
	want := net.ParseIP("192.0.2.1")
	r := &fakeResolver{ips: []net.IP{want}}
	p := NewProbe(http.DefaultTransport, r)

	got, err := p.LookupA(context.Background(), "example.com")
	if err != nil {
		t.Fatalf("LookupA: %v", err)
	}
	if len(got) != 1 || !got[0].Equal(want) {
		t.Errorf("LookupA = %v, want [%v]", got, want)
	}
}

// TestNewProbeNilResolverDefaultsToNetDefaultResolver asserts a nil Resolver means
// net.DefaultResolver rather than a nil-pointer panic on first lookup.
func TestNewProbeNilResolverDefaultsToNetDefaultResolver(t *testing.T) {
	p := NewProbe(http.DefaultTransport, nil)
	if p.resolver != net.DefaultResolver {
		t.Errorf("resolver = %v, want net.DefaultResolver for a nil Resolver", p.resolver)
	}
}

// TestNewProbeWithAuthorityNilAuthorityDefaultsToDefaultAuthorityLookup asserts a nil
// AuthorityLookup means defaultAuthorityLookup rather than a nil-function panic on first call,
// matching how a nil Resolver defaults to net.DefaultResolver.
func TestNewProbeWithAuthorityNilAuthorityDefaultsToDefaultAuthorityLookup(t *testing.T) {
	p := NewProbeWithAuthority(http.DefaultTransport, &fakeResolver{}, nil)
	got := reflect.ValueOf(p.authority).Pointer()
	want := reflect.ValueOf(defaultAuthorityLookup).Pointer()
	if got != want {
		t.Errorf("authority = %v, want defaultAuthorityLookup for a nil AuthorityLookup", got)
	}
}

// TestLookupAuthoritativeReturnsOnContextDeadline proves LookupAuthoritative's own timeout
// wrapping returns rather than blocking when a slow AuthorityLookup outlives the caller's
// context, the same failure mode TestSharedTimeoutPolicy proves for the package's other clients.
func TestLookupAuthoritativeReturnsOnContextDeadline(t *testing.T) {
	slow := func(ctx context.Context, nameserver, host string) ([]net.IP, error) {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
			return nil, nil
		}
	}
	p := NewProbeWithAuthority(http.DefaultTransport, &fakeResolver{}, slow)

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	done := make(chan error, 1)
	go func() {
		_, err := p.LookupAuthoritative(ctx, "ns1.example.test", "example.test")
		done <- err
	}()

	select {
	case err := <-done:
		if err == nil {
			t.Fatal("LookupAuthoritative: want an error when the lookup outlives the context deadline")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("did not return within 2s of a 50ms deadline; the lookup is hanging")
	}
}

// rewriteHostTransport dials the real network through base, but replaces req's host with target
// first, so a test can point a fixed-host client (GitHub, NPM) at a local httptest server while
// still exercising client.Do's real host-pin check against the client's original, unmodified
// host.
type rewriteHostTransport struct {
	target string
}

func (rt rewriteHostTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	clone := req.Clone(req.Context())
	clone.URL.Scheme = "http"
	clone.URL.Host = rt.target
	clone.Host = rt.target
	return http.DefaultTransport.RoundTrip(clone)
}

// TestSharedTimeoutPolicy is the "one shared table test" the task names for the timeout half: it
// drives GitHub's and NPM's shared *client type, and Probe's own doWithRetry, through a handler
// that outlives a short caller-supplied deadline, and asserts every one returns rather than
// hanging. It calls the unexported client.Do and doWithRetry directly with a request built on a
// short local context, the same way transport_test.go's own TestDoReturnsOnContextDeadline
// proves this for Cloudflare's client, since routing through the exported GitHub and Probe
// methods would mean waiting out the real 15-second requestTimeout those methods hardcode.
func TestSharedTimeoutPolicy(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()
	u, err := url.Parse(srv.URL)
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		call func(ctx context.Context) error
	}{
		{"github", func(ctx context.Context) error {
			gh := NewGitHub(Credential{}, rewriteHostTransport{target: u.Host})
			req, err := http.NewRequestWithContext(ctx, http.MethodGet, githubBase, nil)
			if err != nil {
				return err
			}
			resp, err := gh.client.Do(req)
			if resp != nil {
				_ = resp.Body.Close()
			}
			return err
		}},
		{"npm", func(ctx context.Context) error {
			n := NewNPM(rewriteHostTransport{target: u.Host})
			req, err := http.NewRequestWithContext(ctx, http.MethodGet, npmBase, nil)
			if err != nil {
				return err
			}
			resp, err := n.client.Do(req)
			if resp != nil {
				_ = resp.Body.Close()
			}
			return err
		}},
		{"probe", func(ctx context.Context) error {
			req, err := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL, nil)
			if err != nil {
				return err
			}
			resp, err := doWithRetry(&http.Client{Transport: http.DefaultTransport}, req)
			if resp != nil {
				_ = resp.Body.Close()
			}
			return err
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
			defer cancel()

			done := make(chan error, 1)
			go func() { done <- tt.call(ctx) }()
			select {
			case err := <-done:
				if err == nil {
					t.Fatal("want an error when the handler outlives the request's deadline, got nil")
				}
			case <-time.After(2 * time.Second):
				t.Fatal("did not return within 2s of a 50ms deadline; the request is hanging")
			}
		})
	}
}

// TestSharedRetryPolicy is TestSharedTimeoutPolicy's sibling for the retry half: each client sees
// one 429 and then a 200, and each must retry exactly once. Retry-After is set to "0" so the
// wait between the two requests is negligible, matching TestDoRetriesRateLimitedGET's own style.
func TestSharedRetryPolicy(t *testing.T) {
	tests := []struct {
		name string
		call func(u *url.URL, srv *httptest.Server) error
	}{
		{"github", func(u *url.URL, srv *httptest.Server) error {
			gh := NewGitHub(Credential{}, rewriteHostTransport{target: u.Host})
			req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, githubBase, nil)
			if err != nil {
				return err
			}
			resp, err := gh.client.Do(req)
			if resp != nil {
				_ = resp.Body.Close()
			}
			return err
		}},
		{"npm", func(u *url.URL, srv *httptest.Server) error {
			n := NewNPM(rewriteHostTransport{target: u.Host})
			req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, npmBase, nil)
			if err != nil {
				return err
			}
			resp, err := n.client.Do(req)
			if resp != nil {
				_ = resp.Body.Close()
			}
			return err
		}},
		{"probe", func(u *url.URL, srv *httptest.Server) error {
			req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, srv.URL, nil)
			if err != nil {
				return err
			}
			resp, err := doWithRetry(&http.Client{Transport: http.DefaultTransport}, req)
			if resp != nil {
				_ = resp.Body.Close()
			}
			return err
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var hits atomic.Int32
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if hits.Add(1) == 1 {
					w.Header().Set("Retry-After", "0")
					w.WriteHeader(http.StatusTooManyRequests)
					return
				}
				w.WriteHeader(http.StatusOK)
			}))
			defer srv.Close()
			u, err := url.Parse(srv.URL)
			if err != nil {
				t.Fatal(err)
			}

			if err := tt.call(u, srv); err != nil {
				t.Fatalf("%s: %v", tt.name, err)
			}
			if got := hits.Load(); got != 2 {
				t.Errorf("server saw %d requests, want exactly 2 (one retry)", got)
			}
		})
	}
}
