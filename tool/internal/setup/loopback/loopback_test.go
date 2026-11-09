package loopback

import (
	"context"
	"encoding/json"
	"errors"
	"html"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeClock stands in for the wall clock. After records each limit the server asks for and hands
// back a channel the test fires, so the 30-minute stop runs without waiting.
type fakeClock struct {
	mu     sync.Mutex
	now    time.Time
	limits []time.Duration
	fire   chan time.Time
}

func newFakeClock() *fakeClock {
	return &fakeClock{now: time.Date(2026, 11, 8, 12, 0, 0, 0, time.UTC), fire: make(chan time.Time, 1)}
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) After(d time.Duration) <-chan time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.limits = append(c.limits, d)
	return c.fire
}

func (c *fakeClock) advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
}

func (c *fakeClock) asked() []time.Duration {
	c.mu.Lock()
	defer c.mu.Unlock()
	return append([]time.Duration(nil), c.limits...)
}

// harness drives one server. client keeps the cookies the server sets, as the owner's browser
// does; anon keeps none, as another process or another browser would.
type harness struct {
	t      *testing.T
	s      *Server
	clock  *fakeClock
	client *http.Client
	anon   *http.Client
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	clock := newFakeClock()
	s, err := New(Config{SiteName: "Field Notes", Now: clock.Now, After: clock.After, addr: "127.0.0.1:0"})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	noFollow := func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	client := &http.Client{Timeout: 5 * time.Second, CheckRedirect: noFollow, Jar: jar}
	anon := &http.Client{Timeout: 5 * time.Second, CheckRedirect: noFollow}
	return &harness{t: t, s: s, clock: clock, client: client, anon: anon}
}

func (h *harness) port() string {
	return h.s.port
}

// base is the server's origin, with no path and no key.
func (h *harness) base() string {
	return "http://127.0.0.1:" + h.s.port
}

// keyTarget is the path and query of the URL the opener is handed.
func (h *harness) keyTarget() string {
	h.t.Helper()
	u, err := url.Parse(h.s.URL())
	if err != nil {
		h.t.Fatalf("parse the server URL: %v", err)
	}
	return u.RequestURI()
}

// open makes the request the owner's browser makes when the opener launches it, and fails the
// test unless it trades the key for the cookie.
func (h *harness) open() {
	h.t.Helper()
	resp, _ := h.do(http.MethodGet, h.keyTarget(), nil)
	if resp.StatusCode != http.StatusSeeOther || resp.Header.Get("Location") != "/" {
		h.t.Fatalf("opening the key URL: status %d Location %q, want 303 to /", resp.StatusCode, resp.Header.Get("Location"))
	}
	if len(resp.Cookies()) != 1 {
		h.t.Fatalf("opening the key URL set cookies %v, want one", resp.Cookies())
	}
}

// do sends one request as the owner's browser; edit, when set, changes the request before it goes.
func (h *harness) do(method, target string, edit func(*http.Request)) (*http.Response, string) {
	h.t.Helper()
	return h.send(h.client, method, target, edit)
}

// bare sends one request with no cookie jar.
func (h *harness) bare(method, target string, edit func(*http.Request)) (*http.Response, string) {
	h.t.Helper()
	return h.send(h.anon, method, target, edit)
}

func (h *harness) send(client *http.Client, method, target string, edit func(*http.Request)) (*http.Response, string) {
	h.t.Helper()
	req, err := http.NewRequest(method, h.base()+target, nil)
	if err != nil {
		h.t.Fatalf("new request %s: %v", target, err)
	}
	if edit != nil {
		edit(req)
	}
	resp, err := client.Do(req)
	if err != nil {
		h.t.Fatalf("%s %s: %v", method, target, err)
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		h.t.Fatalf("read %s: %v", target, err)
	}
	return resp, string(body)
}

// poll sends the request done.html's poll makes: a same-origin fetch that carries the cookie.
func (h *harness) poll() (*http.Response, string) {
	h.t.Helper()
	return h.do(http.MethodGet, "/next", browserHeaders("same-origin", "cors"))
}

func (h *harness) get(target string) (*http.Response, string) {
	h.t.Helper()
	return h.do(http.MethodGet, target, nil)
}

// arm arms a route and fails the test on error.
func (h *harness) arm(r Route) string {
	h.t.Helper()
	nonce, err := h.s.Arm(r)
	if err != nil {
		h.t.Fatalf("Arm %s: %v", r, err)
	}
	return nonce
}

// delivered reports whether a callback reached the runner on r within a short window.
func (h *harness) delivered(r Route) (Callback, bool) {
	h.t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	cb, err := h.s.Wait(ctx, r)
	if errors.Is(err, context.DeadlineExceeded) {
		return Callback{}, false
	}
	if err != nil {
		h.t.Fatalf("Wait %s: %v", r, err)
	}
	return cb, true
}

func TestHostAllowlist(t *testing.T) {
	h := newHarness(t)
	h.open()
	port := h.port()
	tests := []struct {
		name string
		host string
		want int
	}{
		{"IPv4 loopback with the port", "127.0.0.1:" + port, http.StatusOK},
		{"localhost with the port", "localhost:" + port, http.StatusOK},
		{"localhost in capitals", "LOCALHOST:" + port, http.StatusOK},
		{"IPv6 loopback with the port", "[::1]:" + port, http.StatusOK},
		{"rebound hostname", "evil.example:" + port, http.StatusForbidden},
		{"rebound hostname with no port", "evil.example", http.StatusForbidden},
		{"loopback with no port", "127.0.0.1", http.StatusForbidden},
		{"loopback with another port", "127.0.0.1:1", http.StatusForbidden},
		{"localhost with a trailing dot", "localhost.:" + port, http.StatusForbidden},
		{"loopback as a subdomain", "127.0.0.1.nip.io:" + port, http.StatusForbidden},
	}
	// The client's jar files cookies by the Host a request names, so each request carries the
	// session cookie by hand to reach the page behind the Host check.
	session := h.client.Jar.Cookies(&url.URL{Scheme: "http", Host: "127.0.0.1:" + port})
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, _ := h.bare(http.MethodGet, "/", func(r *http.Request) {
				r.Host = tt.host
				for _, c := range session {
					r.AddCookie(c)
				}
			})
			if resp.StatusCode != tt.want {
				t.Errorf("Host %q: status %d, want %d", tt.host, resp.StatusCode, tt.want)
			}
		})
	}
	// Go's client always sends a Host, so the empty case goes to the check directly.
	if h.s.allowedHost("") {
		t.Error("an empty Host was allowed")
	}
}

func TestWrongHostReachesNoCallback(t *testing.T) {
	h := newHarness(t)
	nonce := h.arm(CloudflareCallback)
	resp, _ := h.do(http.MethodGet, "/cloudflare/callback?code=abc&state="+nonce, func(r *http.Request) {
		r.Host = "evil.example:" + h.port()
	})
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status %d, want 403", resp.StatusCode)
	}
	if _, ok := h.delivered(CloudflareCallback); ok {
		t.Fatal("a callback with a foreign Host reached the runner")
	}
}

func TestPathsNobodyWaitsOnAnswer404(t *testing.T) {
	h := newHarness(t)
	for _, target := range []string{
		"/cloudflare/callback?code=abc&state=x",
		"/github/manifest?code=abc&state=x",
		"/github/callback?code=abc&installation_id=1&setup_action=install",
		"/done.html",
		"/error.html",
		"/next",
		"/cloudflare/go",
		"/favicon.ico",
		"/cloudflare/callback/",
		"//cloudflare/callback",
	} {
		resp, _ := h.get(target)
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("GET %s: status %d, want 404", target, resp.StatusCode)
		}
	}
}

func TestMethodsAreGETOnly(t *testing.T) {
	h := newHarness(t)
	nonce := h.arm(CloudflareCallback)
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodHead} {
		for _, target := range []string{"/", "/cloudflare/callback?code=abc&state=" + nonce} {
			resp, _ := h.do(method, target, nil)
			if resp.StatusCode != http.StatusMethodNotAllowed {
				t.Errorf("%s %s: status %d, want 405", method, target, resp.StatusCode)
			}
		}
	}
	if _, ok := h.delivered(CloudflareCallback); ok {
		t.Fatal("a POST callback reached the runner")
	}
}

func TestEveryResponseCarriesTheNoStoreHeaders(t *testing.T) {
	h := newHarness(t)
	h.open()
	cases := []struct {
		name string
		edit func(*http.Request)
		path string
		anon bool
	}{
		{"root", nil, "/", false},
		{"root without the cookie", nil, "/", true},
		{"forbidden", func(r *http.Request) { r.Host = "evil.example" }, "/", false},
		{"not found", nil, "/nope", false},
		{"next", nil, "/next", false},
		{"next without the cookie", nil, "/next", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			send := h.do
			if c.anon {
				send = h.bare
			}
			resp, _ := send(http.MethodGet, c.path, func(r *http.Request) {
				r.Header.Set("Origin", "https://evil.example")
				if c.edit != nil {
					c.edit(r)
				}
			})
			if got := resp.Header.Get("Cache-Control"); got != "no-store" {
				t.Errorf("Cache-Control %q, want no-store", got)
			}
			if got := resp.Header.Get("Referrer-Policy"); got != "no-referrer" {
				t.Errorf("Referrer-Policy %q, want no-referrer", got)
			}
			for name := range resp.Header {
				if strings.HasPrefix(strings.ToLower(name), "access-control-") {
					t.Errorf("response carries the CORS header %s", name)
				}
			}
		})
	}
}

func TestCloudflareCallback(t *testing.T) {
	h := newHarness(t)
	h.open()
	stale := h.arm(CloudflareCallback)
	nonce := h.arm(CloudflareCallback)
	if nonce == stale {
		t.Fatal("re-arming kept the same nonce")
	}
	if len(nonce) != 32 {
		t.Errorf("nonce %q is %d characters, want 32 hex characters for 128 bits", nonce, len(nonce))
	}

	refused := []struct {
		name  string
		query string
	}{
		{"stale state", "code=abc&state=" + stale},
		{"wrong state", "code=abc&state=00000000000000000000000000000000"},
		{"missing state", "code=abc"},
		{"empty state", "code=abc&state="},
		{"state with a different length", "code=abc&state=" + nonce + "0"},
		{"missing code", "state=" + nonce},
		{"code with a space", "code=a%20b&state=" + nonce},
		{"code with markup", "code=%3Cx%3E&state=" + nonce},
		{"code twice", "code=abc&code=def&state=" + nonce},
		{"state twice", "code=abc&state=" + nonce + "&state=" + nonce},
		{"semicolon in the query", "code=abc;x=1&state=" + nonce},
		{"error with a bad shape", "error=Access%20Denied&state=" + nonce},
		{"code of one dot", "code=.&state=" + nonce},
		{"code of two dots", "code=..&state=" + nonce},
		{"code of dots and dashes only", "code=.-_.&state=" + nonce},
	}
	for _, tt := range refused {
		t.Run(tt.name, func(t *testing.T) {
			resp, _ := h.get("/cloudflare/callback?" + tt.query)
			if resp.StatusCode != http.StatusBadRequest {
				t.Errorf("status %d, want 400", resp.StatusCode)
			}
			if cb, ok := h.delivered(CloudflareCallback); ok {
				t.Errorf("a refused callback reached the runner: %+v", cb)
			}
		})
	}

	// A refused callback changes nothing: the route still answers the real one.
	resp, _ := h.get("/cloudflare/callback?code=ory_ac_Ab-9.x_Y&scope=a+b&state=" + nonce)
	if resp.StatusCode != http.StatusSeeOther || resp.Header.Get("Location") != "/" {
		t.Fatalf("good callback: status %d Location %q, want 303 to /", resp.StatusCode, resp.Header.Get("Location"))
	}
	cb, ok := h.delivered(CloudflareCallback)
	if !ok {
		t.Fatal("the good callback did not reach the runner")
	}
	if cb.Code != "ory_ac_Ab-9.x_Y" || cb.State != nonce || cb.Error != "" {
		t.Errorf("callback %+v, want the code and state that arrived", cb)
	}

	// One nonce per approval: the same callback again finds no one waiting.
	resp, _ = h.get("/cloudflare/callback?code=ory_ac_Ab-9.x_Y&state=" + nonce)
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("replayed callback: status %d, want 404", resp.StatusCode)
	}
}

func TestCloudflareDenialReachesTheRunner(t *testing.T) {
	h := newHarness(t)
	h.open()
	nonce := h.arm(CloudflareCallback)
	resp, _ := h.get("/cloudflare/callback?error=access_denied&state=" + nonce)
	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("status %d, want 303", resp.StatusCode)
	}
	cb, ok := h.delivered(CloudflareCallback)
	if !ok {
		t.Fatal("the denial did not reach the runner")
	}
	if cb.Error != "access_denied" || cb.Code != "" {
		t.Errorf("callback %+v, want Error access_denied and no code", cb)
	}
}

func TestGitHubManifestCallback(t *testing.T) {
	h := newHarness(t)
	h.open()
	nonce := h.arm(GitHubManifest)
	for _, query := range []string{
		"code=abc",
		"code=abc&state=" + strings.Repeat("f", 32),
		"state=" + nonce,
		"code=a%2Fb&state=" + nonce,
		// The manifest code becomes a path segment of GitHub's conversions URL, so a dot is
		// refused outright.
		"code=.&state=" + nonce,
		"code=..&state=" + nonce,
		"code=..%2Fx&state=" + nonce,
		"code=a.b&state=" + nonce,
	} {
		resp, _ := h.get("/github/manifest?" + query)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("%s: status %d, want 400", query, resp.StatusCode)
		}
	}
	if _, ok := h.delivered(GitHubManifest); ok {
		t.Fatal("a refused manifest callback reached the runner")
	}
	resp, _ := h.get("/github/manifest?code=a1b2c3&state=" + nonce)
	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("good callback: status %d, want 303", resp.StatusCode)
	}
	cb, ok := h.delivered(GitHubManifest)
	if !ok || cb.Code != "a1b2c3" || cb.State != nonce {
		t.Fatalf("callback %+v delivered %v, want the code and state", cb, ok)
	}
}

func TestGitHubInstallCallback(t *testing.T) {
	h := newHarness(t)
	h.open()
	h.arm(GitHubCallback)
	for _, query := range []string{
		"code=abc&installation_id=12a&setup_action=install",
		"code=abc&installation_id=-1&setup_action=install",
		"installation_id=12&setup_action=install",
		"code=abc&setup_action=install",
		"code=abc&installation_id=12",
		"code=abc&installation_id=12&setup_action=Install%21",
		"code=abc&installation_id=12&setup_action=install&state=" + strings.Repeat("0", 32),
		"code=.&installation_id=12&setup_action=install",
		"code=..&installation_id=12&setup_action=install",
		"code=..%2Fx&installation_id=12&setup_action=install",
		"code=a.b&installation_id=12&setup_action=install",
	} {
		resp, _ := h.get("/github/callback?" + query)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("%s: status %d, want 400", query, resp.StatusCode)
		}
	}
	if _, ok := h.delivered(GitHubCallback); ok {
		t.Fatal("a refused install callback reached the runner")
	}

	// GitHub may leave state off the install redirect; the read-back authenticates it instead.
	resp, _ := h.get("/github/callback?code=c0de&installation_id=179774962&setup_action=install")
	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("callback with no state: status %d, want 303", resp.StatusCode)
	}
	cb, ok := h.delivered(GitHubCallback)
	if !ok {
		t.Fatal("the install callback did not reach the runner")
	}
	if cb.Code != "c0de" || cb.InstallationID != "179774962" || cb.SetupAction != "install" {
		t.Errorf("callback %+v, want the code, installation id, and setup action", cb)
	}

	// The second install approval arms the route again, and a matching state is accepted.
	nonce := h.arm(GitHubCallback)
	resp, _ = h.get("/github/callback?code=c0de2&installation_id=2&setup_action=install&state=" + nonce)
	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("callback with state: status %d, want 303", resp.StatusCode)
	}
	if cb, ok := h.delivered(GitHubCallback); !ok || cb.InstallationID != "2" {
		t.Errorf("second callback %+v delivered %v", cb, ok)
	}
}

func TestWaitOnARouteNeverArmed(t *testing.T) {
	h := newHarness(t)
	if _, err := h.s.Wait(context.Background(), GitHubManifest); err == nil {
		t.Fatal("Wait on an unarmed route returned no error")
	}
}

func TestCallbackBeforeWaitIsKept(t *testing.T) {
	h := newHarness(t)
	h.open()
	nonce := h.arm(CloudflareCallback)
	if resp, _ := h.get("/cloudflare/callback?code=abc&state=" + nonce); resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("status %d, want 303", resp.StatusCode)
	}
	if cb, ok := h.delivered(CloudflareCallback); !ok || cb.Code != "abc" {
		t.Fatalf("a callback that landed before Wait was lost: %+v %v", cb, ok)
	}
}

// TestCallbacksNeedTheSession pins that a callback answers only the browser holding the session
// cookie: a request without it, whether another process or a browser that never opened the tab,
// is refused with a page that says where to finish, leaves the route armed, and delivers nothing,
// and a replay after the real callback finds the route closed.
func TestCallbacksNeedTheSession(t *testing.T) {
	routes := []struct {
		route Route
		query func(nonce string) string
	}{
		{CloudflareCallback, func(n string) string { return "code=ory_ac_abc.def&state=" + n }},
		{GitHubManifest, func(n string) string { return "code=a1b2c3&state=" + n }},
		{GitHubCallback, func(string) string { return "code=c0de&installation_id=179774962&setup_action=install" }},
	}
	for _, rt := range routes {
		t.Run(string(rt.route), func(t *testing.T) {
			h := newHarness(t)
			h.open()
			nonce := h.arm(rt.route)
			target := string(rt.route) + "?" + rt.query(nonce)

			for _, c := range []struct {
				name string
				edit func(*http.Request)
			}{
				{"no Sec-Fetch headers", nil},
				{"a provider's redirect in a browser without the cookie", browserHeaders("cross-site", "navigate")},
			} {
				resp, body := h.bare(http.MethodGet, target, c.edit)
				if resp.StatusCode != http.StatusForbidden {
					t.Errorf("without the cookie from %s: status %d, want 403", c.name, resp.StatusCode)
				}
				if !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/html") ||
					!strings.Contains(body, "This browser did not start setup. Finish the approval in the browser tab that setup opened, or open the provider's link in that browser.") ||
					!strings.Contains(body, "cairn · Field Notes") {
					t.Errorf("without the cookie from %s: want the other-browser page, got %q\n%s", c.name, resp.Header.Get("Content-Type"), body)
				}
				if strings.Contains(body, nonce) || strings.Contains(body, "code=") {
					t.Errorf("the other-browser page echoes the request:\n%s", body)
				}
				if cb, ok := h.delivered(rt.route); ok {
					t.Fatalf("a callback without the cookie reached the runner: %+v", cb)
				}
			}

			// The refusal left the route armed: the owner's redirect still lands.
			resp, _ := h.do(http.MethodGet, target, browserHeaders("cross-site", "navigate"))
			if resp.StatusCode != http.StatusSeeOther {
				t.Fatalf("with the cookie: status %d, want 303", resp.StatusCode)
			}
			if _, ok := h.delivered(rt.route); !ok {
				t.Fatal("the callback with the cookie did not reach the runner")
			}
			for name, send := range map[string]func(string, string, func(*http.Request)) (*http.Response, string){
				"with the cookie": h.do, "without it": h.bare,
			} {
				if resp, _ := send(http.MethodGet, target, nil); resp.StatusCode != http.StatusNotFound {
					t.Errorf("replay %s: status %d, want 404", name, resp.StatusCode)
				}
			}
		})
	}
}

func TestRootPages(t *testing.T) {
	h := newHarness(t)
	h.open()

	resp, body := h.get("/")
	if resp.StatusCode != http.StatusOK || !strings.Contains(body, `http-equiv="refresh"`) {
		t.Fatalf("root before any page: status %d, want the waiting page that reloads itself", resp.StatusCode)
	}

	const authorize = "https://dash.cloudflare.com/oauth2/auth?response_type=code&client_id=x&state=y"
	if err := h.s.Show(RedirectPage(authorize)); err != nil {
		t.Fatalf("Show redirect: %v", err)
	}
	resp, _ = h.get("/")
	if resp.StatusCode != http.StatusFound || resp.Header.Get("Location") != authorize {
		t.Fatalf("redirect page: status %d Location %q", resp.StatusCode, resp.Header.Get("Location"))
	}

	// A callback that lands moves the tab to the waiting page at once.
	nonce := h.arm(CloudflareCallback)
	h.get("/cloudflare/callback?code=abc&state=" + nonce)
	if resp, body := h.get("/"); resp.StatusCode != http.StatusOK || !strings.Contains(body, `http-equiv="refresh"`) {
		t.Fatalf("after the callback: status %d, want the waiting page", resp.StatusCode)
	}

	const retry = "https://dash.cloudflare.com/oauth2/auth?a=1&b=2"
	if err := h.s.Show(ScopeErrorPage(retry)); err != nil {
		t.Fatalf("Show scope error: %v", err)
	}
	resp, _ = h.get("/")
	if resp.StatusCode != http.StatusSeeOther || resp.Header.Get("Location") != "/error.html" {
		t.Fatalf("scope error: status %d Location %q, want 303 to /error.html", resp.StatusCode, resp.Header.Get("Location"))
	}
	resp, body = h.get("/error.html")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("error.html: status %d", resp.StatusCode)
	}
	if !strings.Contains(body, `href="/cloudflare/go"`) {
		t.Errorf("error.html's Try again does not go through /cloudflare/go:\n%s", body)
	}
	if strings.Contains(body, "dash.cloudflare.com") {
		t.Errorf("error.html carries the retry URL in its source:\n%s", body)
	}
	if !strings.Contains(body, "<strong>API Tokens: Write</strong>") {
		t.Errorf("error.html does not set the permission name in bold:\n%s", body)
	}
	if !strings.Contains(body, "cairn · Field Notes · approval 1 of 4") {
		t.Error("error.html does not name the site")
	}

	if err := h.s.Show(DonePage()); err != nil {
		t.Fatalf("Show done: %v", err)
	}
	if resp, _ := h.get("/error.html"); resp.StatusCode != http.StatusNotFound {
		t.Errorf("error.html after done: status %d, want 404", resp.StatusCode)
	}
	resp, _ = h.get("/")
	if resp.StatusCode != http.StatusSeeOther || resp.Header.Get("Location") != "/done.html" {
		t.Fatalf("done: status %d Location %q, want 303 to /done.html", resp.StatusCode, resp.Header.Get("Location"))
	}
	resp, body = h.get("/done.html")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("done.html: status %d", resp.StatusCode)
	}
	// A 404 from /next means the session is spent or gone, so the page sends the owner to the
	// terminal rather than polling on in silence.
	for _, want := range []string{"Approvals complete", "set up Field Notes", "fetch('/next'",
		"Check your terminal: setup shows what to do next.", "r.status === 404"} {
		if !strings.Contains(body, want) {
			t.Errorf("done.html lacks %q", want)
		}
	}
	csp := resp.Header.Get("Content-Security-Policy")
	m := regexp.MustCompile(`<script nonce="([^"]+)">`).FindStringSubmatch(body)
	if m == nil || !strings.Contains(csp, "'nonce-"+m[1]+"'") {
		t.Errorf("done.html's script nonce does not match its Content-Security-Policy %q", csp)
	}
}

const consentAuthorize = "https://dash.cloudflare.com/oauth2/auth?response_type=code&client_id=x&state=y&code_challenge=z"

// TestConsentPage pins that the tab's first page for approval 1 is setup's own, carrying the
// permission instruction, and that the authorize URL leaves the server only as the go route's
// redirect.
func TestConsentPage(t *testing.T) {
	h := newHarness(t)
	h.arm(CloudflareCallback)
	if err := h.s.Show(ConsentPage(consentAuthorize)); err != nil {
		t.Fatalf("Show consent: %v", err)
	}
	h.open()

	resp, body := h.do(http.MethodGet, "/", browserHeaders("same-origin", "navigate"))
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("root with the consent page: status %d Location %q, want 200", resp.StatusCode, resp.Header.Get("Location"))
	}
	for _, want := range []string{
		"<title>Approve setup on Cloudflare</title>",
		"On the Cloudflare page, select <strong>API Tokens: Write</strong>, and then select Allow.",
		"Cloudflare leaves <strong>API Tokens: Write</strong> unselected, and setup needs it to create your site's deploy key.",
		`href="/cloudflare/go"`,
		"Continue to Cloudflare",
		"cairn · Field Notes · approval 1 of 4",
	} {
		if !strings.Contains(body, want) {
			t.Errorf("the consent page lacks %q:\n%s", want, body)
		}
	}
	if i, j := strings.Index(body, "API Tokens: Write"), strings.Index(body, "Continue to Cloudflare"); i < 0 || j < i {
		t.Error("the consent page's instruction does not come before its button")
	}
	if strings.Contains(body, "dash.cloudflare.com") || strings.Contains(body, "code_challenge") {
		t.Errorf("the consent page carries the authorize URL in its source:\n%s", body)
	}
	if strings.Contains(body, `http-equiv="refresh"`) {
		t.Error("the consent page reloads itself away from the instruction")
	}

	for _, c := range []struct {
		name string
		edit func(*http.Request)
	}{
		{"from the button", browserHeaders("same-origin", "navigate")},
		{"typed or opened directly", browserHeaders("none", "navigate")},
	} {
		resp, body := h.do(http.MethodGet, "/cloudflare/go", c.edit)
		if resp.StatusCode != http.StatusFound || resp.Header.Get("Location") != consentAuthorize {
			t.Errorf("go route %s: status %d Location %q, want 302 to the authorize URL", c.name, resp.StatusCode, resp.Header.Get("Location"))
		}
		if strings.Contains(body, "code_challenge") {
			t.Errorf("go route %s echoes the authorize URL in its body", c.name)
		}
	}
}

// TestTheGoRouteAnswersOnlyTheOwnerWhileArmed pins that /cloudflare/go hands out the authorize
// URL only to the session's own same-origin navigation, only while the consent or scope-error
// page shows and approval 1's callback is armed.
func TestTheGoRouteAnswersOnlyTheOwnerWhileArmed(t *testing.T) {
	shown := func(h *harness) {
		h.arm(CloudflareCallback)
		if err := h.s.Show(ConsentPage(consentAuthorize)); err != nil {
			h.t.Fatalf("Show consent: %v", err)
		}
		h.open()
	}
	tests := []struct {
		name  string
		setup func(h *harness)
		anon  bool
		edit  func(*http.Request)
		want  int
		// explained reports that the refusal carries the page asking for a current browser.
		explained bool
	}{
		{"before any page", func(h *harness) { h.open() }, false, nil, http.StatusNotFound, false},
		{"with the route unarmed", func(h *harness) {
			if err := h.s.Show(ConsentPage(consentAuthorize)); err != nil {
				h.t.Fatalf("Show consent: %v", err)
			}
			h.open()
		}, false, nil, http.StatusNotFound, false},
		{"on the redirect page", func(h *harness) {
			h.arm(CloudflareCallback)
			if err := h.s.Show(RedirectPage(consentAuthorize)); err != nil {
				h.t.Fatalf("Show redirect: %v", err)
			}
			h.open()
		}, false, nil, http.StatusNotFound, false},
		{"after the callback landed", func(h *harness) {
			nonce := h.arm(CloudflareCallback)
			if err := h.s.Show(ConsentPage(consentAuthorize)); err != nil {
				h.t.Fatalf("Show consent: %v", err)
			}
			h.open()
			h.get("/cloudflare/callback?code=abc&state=" + nonce)
		}, false, nil, http.StatusNotFound, false},
		{"after done", func(h *harness) {
			shown(h)
			if err := h.s.Show(DonePage()); err != nil {
				h.t.Fatalf("Show done: %v", err)
			}
		}, false, nil, http.StatusNotFound, false},
		{"without the cookie", shown, true, nil, http.StatusNotFound, false},
		{"from a cross-site link", shown, false, browserHeaders("cross-site", "navigate"), http.StatusNotFound, false},
		{"from a same-site page", shown, false, browserHeaders("same-site", "navigate"), http.StatusNotFound, false},
		// A tool replaying the cookie sends no Fetch Metadata, so the headers must be present. An
		// older browser or a privacy extension sends none either, so that refusal says what to use.
		{"with no Sec-Fetch headers", shown, false, nil, http.StatusNotFound, true},
		{"with no Sec-Fetch-Mode", shown, false, func(r *http.Request) { r.Header.Set("Sec-Fetch-Site", "same-origin") }, http.StatusNotFound, true},
		{"with no Sec-Fetch-Site", shown, false, func(r *http.Request) { r.Header.Set("Sec-Fetch-Mode", "navigate") }, http.StatusNotFound, true},
		{"fetched by a same-origin script", shown, false, browserHeaders("same-origin", "cors"), http.StatusNotFound, false},
		{"fetched with no Sec-Fetch-Site", shown, false, func(r *http.Request) { r.Header.Set("Sec-Fetch-Mode", "cors") }, http.StatusNotFound, false},
		{"as a cross-site image", shown, false, browserHeaders("cross-site", "no-cors"), http.StatusNotFound, false},
		{"under a rebound Host", shown, false, func(r *http.Request) { r.Host = "evil.example:" + r.URL.Port() }, http.StatusForbidden, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := newHarness(t)
			tt.setup(h)
			send := h.do
			if tt.anon {
				send = h.bare
			}
			resp, body := send(http.MethodGet, "/cloudflare/go", tt.edit)
			if resp.StatusCode != tt.want {
				t.Errorf("status %d, want %d", resp.StatusCode, tt.want)
			}
			if loc := resp.Header.Get("Location"); loc != "" || strings.Contains(body, "dash.cloudflare.com") {
				t.Errorf("a refused request learned the authorize URL: Location %q", loc)
			}
			const oldBrowser = "This browser does not send the information setup needs to keep your approval safe. Use a current Chrome, Edge, Firefox, or Safari."
			if got := strings.Contains(body, oldBrowser); got != tt.explained {
				t.Errorf("the refusal carries the current-browser page: %v, want %v\n%s", got, tt.explained, body)
			}
		})
	}

	h := newHarness(t)
	shown(h)
	if resp, _ := h.do(http.MethodPost, "/cloudflare/go", nil); resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("POST /cloudflare/go: status %d, want 405", resp.StatusCode)
	}
}

// TestTryAgainGoesThroughTheGoRoute pins that the scope-error page's button reaches the retry
// URL through /cloudflare/go, so the page source never holds it.
func TestTryAgainGoesThroughTheGoRoute(t *testing.T) {
	h := newHarness(t)
	h.open()
	const retry = "https://dash.cloudflare.com/oauth2/auth?a=1&b=2"
	h.arm(CloudflareCallback)
	if err := h.s.Show(ScopeErrorPage(retry)); err != nil {
		t.Fatalf("Show scope error: %v", err)
	}
	resp, _ := h.do(http.MethodGet, "/cloudflare/go", browserHeaders("same-origin", "navigate"))
	if resp.StatusCode != http.StatusFound || resp.Header.Get("Location") != retry {
		t.Fatalf("Try again: status %d Location %q, want 302 to the retry URL", resp.StatusCode, resp.Header.Get("Location"))
	}
}

func TestShowRefusesAURLThatIsNotHTTPS(t *testing.T) {
	h := newHarness(t)
	for _, u := range []string{"http://dash.cloudflare.com/", "javascript:alert(1)", "/relative", "https://"} {
		if err := h.s.Show(RedirectPage(u)); err == nil {
			t.Errorf("Show(RedirectPage(%q)) accepted it", u)
		}
		if err := h.s.Show(ScopeErrorPage(u)); err == nil {
			t.Errorf("Show(ScopeErrorPage(%q)) accepted it", u)
		}
		if err := h.s.Show(ConsentPage(u)); err == nil {
			t.Errorf("Show(ConsentPage(%q)) accepted it", u)
		}
		if err := h.s.SetNext(u); err == nil {
			t.Errorf("SetNext(%q) accepted it", u)
		}
	}
}

func TestManifestPage(t *testing.T) {
	h := newHarness(t)
	if err := h.s.Show(ManifestPage(`{"name":"x"}`)); err == nil {
		t.Fatal("ManifestPage shown with the manifest route unarmed")
	}
	nonce := h.arm(GitHubManifest)
	manifest := `{"name":"cairn-field-notes","url":"https://cairn.pub","note":"<a & \"b\">"}`
	if err := h.s.Show(ManifestPage(manifest)); err != nil {
		t.Fatalf("Show manifest: %v", err)
	}
	h.open()
	resp, body := h.get("/")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	action := regexp.MustCompile(`<form method="post" action="([^"]+)"`).FindStringSubmatch(body)
	if action == nil || html.UnescapeString(action[1]) != "https://github.com/settings/apps/new?state="+nonce {
		t.Fatalf("form action %v, want the GitHub new-App URL with the armed state", action)
	}
	value := regexp.MustCompile(`name="manifest" value="([^"]*)"`).FindStringSubmatch(body)
	if value == nil || html.UnescapeString(value[1]) != manifest {
		t.Fatalf("manifest field %v, want the manifest intact", value)
	}
	if csp := resp.Header.Get("Content-Security-Policy"); !strings.Contains(csp, "form-action https://github.com") {
		t.Errorf("Content-Security-Policy %q does not limit the form to GitHub", csp)
	}
}

const signIn = "https://field-notes.example/admin/auth/confirm?token=abc"

// browserHeaders returns an edit that sets the Sec-Fetch headers a browser sends, after the
// cookie edits in before.
func browserHeaders(site, mode string, before ...func(*http.Request)) func(*http.Request) {
	return func(r *http.Request) {
		for _, edit := range before {
			edit(r)
		}
		r.Header.Set("Sec-Fetch-Site", site)
		r.Header.Set("Sec-Fetch-Mode", mode)
	}
}

func TestTheKeyURL(t *testing.T) {
	h := newHarness(t)
	u, err := url.Parse(h.s.URL())
	if err != nil {
		t.Fatalf("parse %s: %v", h.s.URL(), err)
	}
	if u.Scheme != "http" || u.Host != "127.0.0.1:"+h.port() || u.Path != "/" {
		t.Errorf("URL %s, want http://127.0.0.1:%s/ with the key", h.s.URL(), h.port())
	}
	q := u.Query()
	key := q.Get("k")
	if len(q) != 1 || !regexp.MustCompile(`^[0-9a-f]{32}$`).MatchString(key) {
		t.Fatalf("query %q, want only k, 32 hex characters for 128 bits", u.RawQuery)
	}
	if other := newHarness(t); other.keyTarget() == h.keyTarget() {
		t.Error("two servers share one key")
	}

	// A browser the opener launches marks the request as typed by the owner.
	resp, body := h.do(http.MethodGet, h.keyTarget(), browserHeaders("none", "navigate"))
	if resp.StatusCode != http.StatusSeeOther || resp.Header.Get("Location") != "/" {
		t.Fatalf("key URL: status %d Location %q, want 303 to /", resp.StatusCode, resp.Header.Get("Location"))
	}
	if len(resp.Cookies()) != 1 {
		t.Fatalf("key URL set cookies %v, want one", resp.Cookies())
	}
	if strings.Contains(body, key) {
		t.Error("the key URL's response echoes the key")
	}
	if got := h.clock.asked(); len(got) != 1 || got[0] != ChainLimit {
		t.Errorf("limits asked %v, want the chain's clock started by the key", got)
	}

	for _, c := range []struct {
		name string
		edit func(*http.Request)
	}{
		{"with no Sec-Fetch headers", nil},
		{"on the waiting page's reload", browserHeaders("same-origin", "navigate")},
		{"back from a provider's redirect", browserHeaders("cross-site", "navigate")},
	} {
		resp, body := h.do(http.MethodGet, "/", c.edit)
		if resp.StatusCode != http.StatusOK || !strings.Contains(body, `http-equiv="refresh"`) {
			t.Errorf("root %s: status %d, want the waiting page", c.name, resp.StatusCode)
		}
		if len(resp.Cookies()) != 0 {
			t.Errorf("root %s set the cookie again", c.name)
		}
	}
}

// TestOnlyTheKeyOpensTheSession pins that a request without the key gets no cookie, starts no
// clock, and leaves /next shut, and that a refused request leaves the key for the owner.
func TestOnlyTheKeyOpensTheSession(t *testing.T) {
	tests := []struct {
		name   string
		target func(key string) string
		edit   func(*http.Request)
		want   int
	}{
		{"no key", func(string) string { return "/" }, nil, http.StatusNotFound},
		{"an empty key", func(string) string { return "/?k=" }, nil, http.StatusNotFound},
		{"a wrong key", func(string) string { return "/?k=" + strings.Repeat("0", 32) }, nil, http.StatusNotFound},
		{"the key with a character more", func(k string) string { return "/?k=" + k + "0" }, nil, http.StatusNotFound},
		{"the key cut short", func(k string) string { return "/?k=" + k[:31] }, nil, http.StatusNotFound},
		{"no key from a cross-site image", func(string) string { return "/" }, browserHeaders("cross-site", "no-cors"), http.StatusNotFound},
		{"the key from a cross-site image", func(k string) string { return "/?k=" + k }, browserHeaders("cross-site", "no-cors"), http.StatusForbidden},
		{"the key from a cross-site link", func(k string) string { return "/?k=" + k }, browserHeaders("cross-site", "navigate"), http.StatusForbidden},
		{"the key from a same-site page", func(k string) string { return "/?k=" + k }, browserHeaders("same-site", "navigate"), http.StatusForbidden},
		{"the key fetched by a script", func(k string) string { return "/?k=" + k }, browserHeaders("none", "cors"), http.StatusForbidden},
		{"the key in a no-cors fetch", func(k string) string { return "/?k=" + k }, func(r *http.Request) { r.Header.Set("Sec-Fetch-Mode", "no-cors") }, http.StatusForbidden},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := newHarness(t)
			if err := h.s.SetNext(signIn); err != nil {
				t.Fatalf("SetNext: %v", err)
			}
			key := strings.TrimPrefix(h.keyTarget(), "/?k=")
			if len(key) != 32 {
				t.Fatalf("server URL %s carries no 32-character key", h.s.URL())
			}
			resp, body := h.do(http.MethodGet, tt.target(key), tt.edit)
			if resp.StatusCode != tt.want {
				t.Errorf("status %d, want %d", resp.StatusCode, tt.want)
			}
			if len(resp.Cookies()) != 0 {
				t.Fatalf("the request was given the cookie %v", resp.Cookies())
			}
			if strings.Contains(body, key) {
				t.Error("the response echoes the key")
			}
			if got := h.clock.asked(); len(got) != 0 {
				t.Errorf("the request started the clock: %v", got)
			}
			if _, show := h.s.Countdown(); show {
				t.Error("the request started the countdown")
			}
			if resp, _ := h.get("/next"); resp.StatusCode != http.StatusNotFound {
				t.Errorf("next after the request: status %d, want 404", resp.StatusCode)
			}
			if resp, _ := h.get("/"); resp.StatusCode != http.StatusNotFound {
				t.Errorf("root after the request: status %d, want 404", resp.StatusCode)
			}

			// The key is still the owner's to use.
			h.open()
			if resp, _ := h.poll(); resp.StatusCode != http.StatusOK {
				t.Errorf("next for the owner: status %d, want 200", resp.StatusCode)
			}
		})
	}
}

func TestTheKeyOpensTheSessionOnce(t *testing.T) {
	h := newHarness(t)
	if err := h.s.SetNext(signIn); err != nil {
		t.Fatalf("SetNext: %v", err)
	}
	h.open()

	for _, edit := range []func(*http.Request){nil, browserHeaders("none", "navigate")} {
		resp, _ := h.bare(http.MethodGet, h.keyTarget(), edit)
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("the key a second time: status %d, want 404", resp.StatusCode)
		}
		if len(resp.Cookies()) != 0 {
			t.Fatalf("the key a second time was given the cookie %v", resp.Cookies())
		}
	}
	if resp, _ := h.bare(http.MethodGet, "/", nil); resp.StatusCode != http.StatusNotFound {
		t.Errorf("root without the cookie: status %d, want 404", resp.StatusCode)
	}
	if resp, _ := h.bare(http.MethodGet, "/next", nil); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next without the cookie: status %d, want 404", resp.StatusCode)
	}
	if got := h.clock.asked(); len(got) != 1 {
		t.Errorf("limits asked %v, want the one from the first use of the key", got)
	}

	// The owner, who brought the key first, keeps the session.
	if resp, _ := h.get("/"); resp.StatusCode != http.StatusOK {
		t.Errorf("root for the owner: status %d, want 200", resp.StatusCode)
	}
	if resp, _ := h.poll(); resp.StatusCode != http.StatusOK {
		t.Errorf("next for the owner: status %d, want 200", resp.StatusCode)
	}
}

func TestNext(t *testing.T) {
	h := newHarness(t)

	resp, _ := h.bare(http.MethodGet, h.keyTarget(), nil)
	cookies := resp.Cookies()
	if len(cookies) != 1 {
		t.Fatalf("the key URL set cookies %v, want one", cookies)
	}
	cookie := cookies[0]
	// Lax, not Strict: the tab returns to the root from Cloudflare and GitHub through a redirect
	// that a cross-site page started, and a browser sends a Strict cookie on none of those.
	if !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode || cookie.Path != "/" {
		t.Errorf("cookie %+v, want HttpOnly, SameSite=Lax, Path=/", cookie)
	}
	if len(cookie.Value) < 32 {
		t.Errorf("cookie value %q is too short to be random", cookie.Value)
	}
	if cookie.MaxAge != 7200 {
		t.Errorf("cookie Max-Age %d, want two hours", cookie.MaxAge)
	}

	withCookie := func(value string) func(*http.Request) {
		return func(r *http.Request) { r.AddCookie(&http.Cookie{Name: cookie.Name, Value: value}) }
	}
	// done.html's poll is a same-origin fetch.
	poll := browserHeaders("same-origin", "cors", withCookie(cookie.Value))

	if resp, _ := h.bare(http.MethodGet, "/next", nil); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next without the cookie: status %d, want 404", resp.StatusCode)
	}
	if resp, _ := h.bare(http.MethodGet, "/next", withCookie(strings.Repeat("A", len(cookie.Value)))); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next with a wrong cookie: status %d, want 404", resp.StatusCode)
	}
	if resp, _ := h.bare(http.MethodGet, "/next", poll); resp.StatusCode != http.StatusNoContent {
		t.Errorf("next before the URL: status %d, want 204", resp.StatusCode)
	}

	if err := h.s.SetNext(signIn); err != nil {
		t.Fatalf("SetNext: %v", err)
	}
	if resp, _ := h.bare(http.MethodGet, "/next", nil); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next without the cookie once ready: status %d, want 404", resp.StatusCode)
	}
	// A Lax cookie rides a cross-site page's link, so /next refuses any request another site
	// started, and the refusal leaves the URL for the poll.
	for _, site := range []string{"cross-site", "same-site", "none"} {
		if resp, _ := h.bare(http.MethodGet, "/next", browserHeaders(site, "navigate", withCookie(cookie.Value))); resp.StatusCode != http.StatusNotFound {
			t.Errorf("next with the cookie from Sec-Fetch-Site %s: status %d, want 404", site, resp.StatusCode)
		}
	}
	// Another process that read the cookie and replays it sends no Fetch Metadata, and a
	// navigation to /next is not the poll, so each is refused.
	for _, c := range []struct {
		name string
		edit func(*http.Request)
	}{
		{"no Sec-Fetch headers", withCookie(cookie.Value)},
		{"no Sec-Fetch-Mode", func(r *http.Request) {
			withCookie(cookie.Value)(r)
			r.Header.Set("Sec-Fetch-Site", "same-origin")
		}},
		{"no Sec-Fetch-Site", func(r *http.Request) {
			withCookie(cookie.Value)(r)
			r.Header.Set("Sec-Fetch-Mode", "cors")
		}},
		{"a same-origin navigation", browserHeaders("same-origin", "navigate", withCookie(cookie.Value))},
	} {
		// done.html reads only the status, so a refusal here carries no page.
		if resp, body := h.bare(http.MethodGet, "/next", c.edit); resp.StatusCode != http.StatusNotFound || strings.Contains(body, "<html") {
			t.Errorf("next with the cookie and %s: status %d, want a bare 404\n%s", c.name, resp.StatusCode, body)
		}
	}
	resp, body := h.bare(http.MethodGet, "/next", poll)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("next once ready: status %d, want 200", resp.StatusCode)
	}
	// The answer is the session's last use, so it clears the cookie.
	if c := resp.Cookies(); len(c) != 1 || c[0].Name != cookie.Name || c[0].MaxAge >= 0 || c[0].Value != "" {
		t.Errorf("the answer set cookies %v, want the session cookie cleared", c)
	}
	var got struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal([]byte(body), &got); err != nil || got.URL != signIn {
		t.Fatalf("next body %q, want the URL as JSON (%v)", body, err)
	}
	if resp, _ := h.bare(http.MethodGet, "/next", poll); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next after it answered: status %d, want 404", resp.StatusCode)
	}
}

func TestPortInUse(t *testing.T) {
	held, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer func() { _ = held.Close() }()

	s, err := New(Config{addr: held.Addr().String()})
	if err == nil {
		_ = s.Close()
		t.Fatal("New bound a port another listener holds")
	}
	if _, ok := errors.AsType[*PortInUseError](err); !ok {
		t.Fatalf("error %T %v, want *PortInUseError", err, err)
	}
	if err.Error() != "Port 49152 is in use. Another setup may be running." {
		t.Errorf("reason %q", err.Error())
	}
}

func TestDefaultAddressIsThePortOnIPv4LoopbackOnly(t *testing.T) {
	if Port != 49152 {
		t.Fatalf("Port %d, want 49152", Port)
	}
	if got := listenAddr(Config{}); got != "127.0.0.1:49152" {
		t.Errorf("listen address %q, want 127.0.0.1:49152", got)
	}
}

func TestChainClock(t *testing.T) {
	h := newHarness(t)
	if _, show := h.s.Countdown(); show {
		t.Fatal("countdown showing before the tab opened")
	}
	if got := h.clock.asked(); len(got) != 0 {
		t.Fatalf("the clock started before the tab opened: %v", got)
	}

	nonce := h.arm(CloudflareCallback)
	h.get("/")
	if got := h.clock.asked(); len(got) != 0 {
		t.Fatalf("a root request without the key started the clock: %v", got)
	}
	h.open()
	h.get("/")
	if got := h.clock.asked(); len(got) != 1 || got[0] != 30*time.Minute {
		t.Fatalf("limits asked %v, want one 30-minute limit from the key", got)
	}

	h.clock.advance(25*time.Minute - time.Second)
	if _, show := h.s.Countdown(); show {
		t.Error("countdown showing before 25 minutes")
	}
	h.clock.advance(time.Second)
	left, show := h.s.Countdown()
	if !show || left != 5*time.Minute {
		t.Errorf("at 25 minutes: Countdown() = %v, %v, want 5m0s, true", left, show)
	}
	h.clock.advance(4*time.Minute + 30*time.Second)
	if left, _ := h.s.Countdown(); left != 30*time.Second {
		t.Errorf("at 29m30s: left %v, want 30s", left)
	}

	h.clock.advance(30 * time.Second)
	h.clock.fire <- h.clock.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if _, err := h.s.Wait(ctx, CloudflareCallback); !errors.Is(err, ErrChainTimeout) {
		t.Fatalf("Wait after 30 minutes: %v, want ErrChainTimeout", err)
	}
	select {
	case <-h.s.Expired():
	default:
		t.Fatal("Expired not closed after 30 minutes")
	}
	if resp, _ := h.get("/cloudflare/callback?code=abc&state=" + nonce); resp.StatusCode != http.StatusNotFound {
		t.Errorf("callback after the stop: status %d, want 404", resp.StatusCode)
	}
	// The waiting page's reload finds the stop page, which says what to do next.
	for name, send := range map[string]func(string, string, func(*http.Request)) (*http.Response, string){
		"with the cookie": h.do, "without it": h.bare,
	} {
		resp, body := send(http.MethodGet, "/", nil)
		if resp.StatusCode != http.StatusGone {
			t.Errorf("root %s after the stop: status %d, want 410", name, resp.StatusCode)
		}
		for _, want := range []string{"Setup stopped", "Nothing was left half done.", "Run cairn new again in your terminal to continue.", "cairn · Field Notes"} {
			if !strings.Contains(body, want) {
				t.Errorf("root %s after the stop lacks %q", name, want)
			}
		}
		if strings.Contains(body, `http-equiv="refresh"`) {
			t.Errorf("the stop page %s reloads itself", name)
		}
	}
	for _, target := range []string{"/next", "/done.html", "/error.html", "/cloudflare/go", "/nope"} {
		if resp, _ := h.get(target); resp.StatusCode != http.StatusNotFound {
			t.Errorf("GET %s after the stop: status %d, want 404", target, resp.StatusCode)
		}
	}
	if _, err := h.s.Arm(GitHubManifest); !errors.Is(err, ErrChainTimeout) {
		t.Errorf("Arm after the stop: %v, want ErrChainTimeout", err)
	}
	if _, show := h.s.Countdown(); show {
		t.Error("countdown still showing after the stop")
	}
}

func TestDoneStopsTheClock(t *testing.T) {
	h := newHarness(t)
	h.open()
	if err := h.s.Show(DonePage()); err != nil {
		t.Fatalf("Show done: %v", err)
	}
	h.clock.advance(31 * time.Minute)
	h.clock.fire <- h.clock.Now()
	if _, show := h.s.Countdown(); show {
		t.Error("countdown showing after done")
	}
	time.Sleep(50 * time.Millisecond)
	select {
	case <-h.s.Expired():
		t.Fatal("the chain stopped after done.html was shown")
	default:
	}
	if resp, _ := h.get("/done.html"); resp.StatusCode != http.StatusOK {
		t.Errorf("done.html after the limit: status %d, want 200", resp.StatusCode)
	}
	// A watch that runs 40 minutes past the tab's opening still hands done.html its link.
	h.clock.advance(9 * time.Minute)
	if err := h.s.SetNext(signIn); err != nil {
		t.Fatalf("SetNext: %v", err)
	}
	if resp, _ := h.poll(); resp.StatusCode != http.StatusOK {
		t.Errorf("next 40 minutes in: status %d, want 200", resp.StatusCode)
	}
}
