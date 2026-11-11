package setup

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

func TestADirectFailureCarriesAProviderErrorsDetail(t *testing.T) {
	denied := &providers.GitHubError{Status: 500, Reason: providers.ReasonUnknown,
		Method: "DELETE", Path: "/app/installations/77"}
	w := newWorld(t)
	w.gh.deleteErr = fmt.Errorf("delete installation: %w", denied)
	_, err := w.run(context.Background())
	f := failureOf(t, err)
	if f.Reason != ReasonInstallDelete || f.Detail != denied.Error() {
		t.Errorf("failure = %+v, want the install-delete stop with detail %q", f, denied.Error())
	}

	r := &run{}
	pathErr := &fs.PathError{Op: "open", Path: "/home/owner/.config/cairn/site.json", Err: fs.ErrPermission}
	if f := r.failure(ReasonRecord, "x", "y", pathErr); f.Detail != "" {
		t.Errorf("Detail = %q for a local error, want none", f.Detail)
	}
}

func TestATransportErrorsDetailHoldsOnlyItsStructuredParts(t *testing.T) {
	inner := context.DeadlineExceeded
	longParse := "providers: parse response body: " + strings.Repeat("x", 300)
	for _, tc := range []struct {
		name string
		err  error
		want string
	}{
		{"a transport error", &providers.TransportError{Op: "Get", Host: "api.cloudflare.com", Err: inner},
			"cloudflare: Get request to api.cloudflare.com: timed out"},
		{"a wrapped transport error", fmt.Errorf("list: %w", &providers.TransportError{Op: "Post", Host: "api.cloudflare.com", Err: inner}),
			"cloudflare: Post request to api.cloudflare.com: timed out"},
		{"a long transport error", &providers.TransportError{Op: "Get", Host: strings.Repeat("y", 300), Err: errors.New("x")},
			("cloudflare: Get request to " + strings.Repeat("y", 300))[:len("cloudflare: ")+200]},
		{"a transport error cut inside a multi-byte rune", &providers.TransportError{Op: "Get", Host: strings.Repeat("é", 150), Err: errors.New("x")},
			"cloudflare: Get request to " + strings.Repeat("é", 92)},
		{"a parse error", errors.New("providers: parse response body: invalid character '<'"),
			"cloudflare: providers: parse response body: invalid character '<'"},
		{"a read error", errors.New("providers: read response body: unexpected EOF"),
			"cloudflare: providers: read response body: unexpected EOF"},
		{"a long parse error", errors.New(longParse), "cloudflare: " + longParse[:200]},
		{"a local error naming a path", &fs.PathError{Op: "open", Path: "/home/owner/.local/key", Err: fs.ErrPermission}, ""},
		{"a plain error", errors.New("dial tcp 203.0.113.7:443: i/o timeout"), ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			w.cf.createErr["r2"] = tc.err
			_, err := w.run(context.Background())
			f := failureOf(t, err)
			if f.Detail != tc.want {
				t.Errorf("Detail = %q, want %q", f.Detail, tc.want)
			}
			for _, leak := range []string{"SECRET", "pass", "frag", "/zones", "?"} {
				if strings.Contains(f.Detail, leak) {
					t.Errorf("Detail = %q leaks %q", f.Detail, leak)
				}
			}
		})
	}
}

func TestTheFirstSweepFailingIsAProviderStopNotAnInstallDelete(t *testing.T) {
	for _, tc := range []struct {
		name string
		err  error
	}{
		{"a GitHub 500", &providers.GitHubError{Status: 500, Reason: providers.ReasonUnknown, Method: "GET", Path: "/app/installations"}},
		{"a transport error", &providers.TransportError{Op: "Get", Host: "api.github.com", Err: errors.New("i/o timeout")}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			w.gh.listErrs = []error{tc.err}
			_, err := w.run(context.Background())
			f := failureOf(t, err)
			if f.Reason != ReasonProvider || strings.Contains(f.Left, "may still reach all your repositories") ||
				strings.Contains(f.Happened, "remove the GitHub App's access") {
				t.Errorf("failure = %+v, want the provider wording", f)
			}
			if f.Detail == "" {
				t.Error("the failure carries no detail")
			}
			if slices.ContainsFunc(w.log, func(s string) bool { return strings.HasPrefix(s, "gh:delete") }) {
				t.Errorf("a deletion ran: %v", w.log)
			}
		})
	}
}

func TestTheAuthorityWaitKeepsRetryingUntilTheDeadline(t *testing.T) {
	siteIndex := func(w *world) int {
		return slices.IndexFunc(w.log, func(s string) bool { return strings.HasPrefix(s, "site:") })
	}
	lastAuthority := func(w *world) int {
		last := -1
		for i, l := range w.log {
			if strings.HasPrefix(l, "authority:") {
				last = i
			}
		}
		return last
	}
	t.Run("errors then an answer proceeds on the answer", func(t *testing.T) {
		w := newWorld(t)
		asked := map[string]int{}
		w.authority = func(host string) ([]net.IP, error) {
			asked[host]++
			if asked[host] <= 3 {
				return nil, errors.New("read udp: i/o timeout")
			}
			return []net.IP{net.ParseIP("2606:4700::1")}, nil
		}
		if _, err := w.run(context.Background()); err != nil {
			t.Fatalf("Run: %v", err)
		}
		if s, a := siteIndex(w), lastAuthority(w); s < 0 || a > s {
			t.Errorf("the site was asked at %d before the nameserver's last answer at %d: %v", s, a, w.log)
		}
		for host, n := range asked {
			if n != 4 {
				t.Errorf("asked %d times for %s, want 4", n, host)
			}
		}
	})
	t.Run("a name the zone never gets runs to the deadline and then returns", func(t *testing.T) {
		w := newWorld(t)
		asked := 0
		w.authority = func(string) ([]net.IP, error) {
			asked++
			return nil, &net.DNSError{Err: "no such host", Name: "x", IsNotFound: true}
		}
		start := w.clock.Now()
		if _, err := w.run(context.Background()); err != nil {
			t.Fatalf("Run: %v", err)
		}
		if want := int(HTTPSLimit / pollEvery); asked < want {
			t.Errorf("the nameserver was asked %d times, want at least %d, one every poll to the deadline", asked, want)
		}
		if got := w.clock.Now().Sub(start); got < HTTPSLimit {
			t.Errorf("the clock advanced %s, want at least the %s deadline", got, HTTPSLimit)
		}
		if s, a := siteIndex(w), lastAuthority(w); s < 0 || a > s {
			t.Errorf("the site was asked at %d before the last lookup at %d: %v", s, a, w.log)
		}
	})
}

// TestAnUnaskableNameserverEndsTheAuthorityWaitAfterAMinute asserts a nameserver that cannot be
// asked at all does not cost the run its whole HTTPS limit: six lookups in a row that fail for
// any reason but "not found" hand the wait to the ordinary site poll, and a "not found" restarts
// the count.
func TestAnUnaskableNameserverEndsTheAuthorityWaitAfterAMinute(t *testing.T) {
	blocked := errors.New("read udp: i/o timeout")
	live := []net.IP{net.ParseIP("2606:4700::1")}
	t.Run("six errors in a row return before any site request", func(t *testing.T) {
		w := newWorld(t)
		asked := 0
		var firstAsked, firstSite time.Time
		w.authority = func(string) ([]net.IP, error) {
			if asked++; asked == 1 {
				firstAsked = w.clock.Now()
			}
			return nil, blocked
		}
		site := w.cfg.SiteGet
		w.cfg.SiteGet = func(ctx context.Context, u string) (int, string, error) {
			if firstSite.IsZero() {
				firstSite = w.clock.Now()
			}
			return site(ctx, u)
		}
		if _, err := w.run(context.Background()); err != nil {
			t.Fatalf("Run: %v", err)
		}
		if asked != 6 {
			t.Errorf("the nameserver was asked %d times, want 6", asked)
		}
		if got := firstSite.Sub(firstAsked); got < 5*pollEvery || got > 7*pollEvery {
			t.Errorf("the site was first asked %s after the first lookup, want about a minute", got)
		}
	})
	t.Run("a not-found between errors restarts the count", func(t *testing.T) {
		w := newWorld(t)
		asked := 0
		w.authority = func(host string) ([]net.IP, error) {
			asked++
			switch {
			case asked == 6:
				return nil, &net.DNSError{Err: "no such host", Name: host, IsNotFound: true}
			case asked <= 11:
				return nil, blocked
			}
			return live, nil
		}
		if _, err := w.run(context.Background()); err != nil {
			t.Fatalf("Run: %v", err)
		}
		if asked < 12 {
			t.Errorf("the nameserver was asked %d times, want past 11: the not-found should have reset the count", asked)
		}
	})
}

func TestAWaitWithNoAuthorityReturnsAtOnce(t *testing.T) {
	r := &run{}
	if err := r.awaitAuthority(context.Background(), time.Time{}); err != nil {
		t.Errorf("awaitAuthority = %v, want nil", err)
	}
}
