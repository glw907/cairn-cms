package loopback

import (
	"context"
	"encoding/json"
	"errors"
	"html"
	"io"
	"net"
	"net/http"
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

type harness struct {
	t      *testing.T
	s      *Server
	clock  *fakeClock
	client *http.Client
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	clock := newFakeClock()
	s, err := New(Config{SiteName: "Field Notes", Now: clock.Now, After: clock.After, addr: "127.0.0.1:0"})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	client := &http.Client{
		Timeout:       5 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}
	return &harness{t: t, s: s, clock: clock, client: client}
}

func (h *harness) port() string {
	h.t.Helper()
	_, port, err := net.SplitHostPort(strings.TrimPrefix(h.s.URL(), "http://"))
	if err != nil {
		h.t.Fatalf("split %s: %v", h.s.URL(), err)
	}
	return port
}

// do sends one request to the server; edit, when set, changes the request before it goes.
func (h *harness) do(method, target string, edit func(*http.Request)) (*http.Response, string) {
	h.t.Helper()
	req, err := http.NewRequest(method, h.s.URL()+target, nil)
	if err != nil {
		h.t.Fatalf("new request %s: %v", target, err)
	}
	if edit != nil {
		edit(req)
	}
	resp, err := h.client.Do(req)
	if err != nil {
		h.t.Fatalf("%s %s: %v", method, target, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		h.t.Fatalf("read %s: %v", target, err)
	}
	return resp, string(body)
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
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, _ := h.do(http.MethodGet, "/", func(r *http.Request) { r.Host = tt.host })
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
	cases := []struct {
		name string
		edit func(*http.Request)
		path string
	}{
		{"root", nil, "/"},
		{"forbidden", func(r *http.Request) { r.Host = "evil.example" }, "/"},
		{"not found", nil, "/nope"},
		{"next without the cookie", nil, "/next"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			resp, _ := h.do(http.MethodGet, c.path, func(r *http.Request) {
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
	nonce := h.arm(GitHubManifest)
	for _, query := range []string{
		"code=abc",
		"code=abc&state=" + strings.Repeat("f", 32),
		"state=" + nonce,
		"code=a%2Fb&state=" + nonce,
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
	nonce := h.arm(GitHubCallback)
	for _, query := range []string{
		"code=abc&installation_id=12a&setup_action=install",
		"code=abc&installation_id=-1&setup_action=install",
		"installation_id=12&setup_action=install",
		"code=abc&setup_action=install",
		"code=abc&installation_id=12",
		"code=abc&installation_id=12&setup_action=Install%21",
		"code=abc&installation_id=12&setup_action=install&state=" + strings.Repeat("0", 32),
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
	nonce = h.arm(GitHubCallback)
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
	nonce := h.arm(CloudflareCallback)
	if resp, _ := h.get("/cloudflare/callback?code=abc&state=" + nonce); resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("status %d, want 303", resp.StatusCode)
	}
	if cb, ok := h.delivered(CloudflareCallback); !ok || cb.Code != "abc" {
		t.Fatalf("a callback that landed before Wait was lost: %+v %v", cb, ok)
	}
}

func TestRootPages(t *testing.T) {
	h := newHarness(t)

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
	if !strings.Contains(body, `href="https://dash.cloudflare.com/oauth2/auth?a=1&amp;b=2"`) {
		t.Errorf("error.html's Try again does not link the retry URL:\n%s", body)
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
	for _, want := range []string{"Approvals complete", "set up Field Notes", "fetch('/next'"} {
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

func TestShowRefusesAURLThatIsNotHTTPS(t *testing.T) {
	h := newHarness(t)
	for _, u := range []string{"http://dash.cloudflare.com/", "javascript:alert(1)", "/relative", "https://"} {
		if err := h.s.Show(RedirectPage(u)); err == nil {
			t.Errorf("Show(RedirectPage(%q)) accepted it", u)
		}
		if err := h.s.Show(ScopeErrorPage(u)); err == nil {
			t.Errorf("Show(ScopeErrorPage(%q)) accepted it", u)
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

func TestNext(t *testing.T) {
	h := newHarness(t)

	resp, _ := h.get("/")
	var cookie *http.Cookie
	for _, c := range resp.Cookies() {
		if cookie != nil {
			t.Fatalf("root set more than one cookie: %v", resp.Cookies())
		}
		cookie = c
	}
	if cookie == nil {
		t.Fatal("the first root request set no cookie")
	}
	if !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode || cookie.Path != "/" {
		t.Errorf("cookie %+v, want HttpOnly, SameSite=Strict, Path=/", cookie)
	}
	if len(cookie.Value) < 32 {
		t.Errorf("cookie value %q is too short to be random", cookie.Value)
	}
	if resp, _ := h.get("/"); len(resp.Cookies()) != 0 {
		t.Error("a second root request set the cookie again")
	}

	withCookie := func(value string) func(*http.Request) {
		return func(r *http.Request) { r.AddCookie(&http.Cookie{Name: cookie.Name, Value: value}) }
	}

	if resp, _ := h.get("/next"); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next without the cookie: status %d, want 404", resp.StatusCode)
	}
	if resp, _ := h.do(http.MethodGet, "/next", withCookie(strings.Repeat("A", len(cookie.Value)))); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next with a wrong cookie: status %d, want 404", resp.StatusCode)
	}
	if resp, _ := h.do(http.MethodGet, "/next", withCookie(cookie.Value)); resp.StatusCode != http.StatusNoContent {
		t.Errorf("next before the URL: status %d, want 204", resp.StatusCode)
	}

	const signIn = "https://field-notes.example/admin/auth/confirm?token=abc"
	if err := h.s.SetNext(signIn); err != nil {
		t.Fatalf("SetNext: %v", err)
	}
	if resp, _ := h.get("/next"); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next without the cookie once ready: status %d, want 404", resp.StatusCode)
	}
	resp, body := h.do(http.MethodGet, "/next", withCookie(cookie.Value))
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("next once ready: status %d, want 200", resp.StatusCode)
	}
	var got struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal([]byte(body), &got); err != nil || got.URL != signIn {
		t.Fatalf("next body %q, want the URL as JSON (%v)", body, err)
	}
	if resp, _ := h.do(http.MethodGet, "/next", withCookie(cookie.Value)); resp.StatusCode != http.StatusNotFound {
		t.Errorf("next after it answered: status %d, want 404", resp.StatusCode)
	}
}

func TestPortInUse(t *testing.T) {
	held, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer held.Close()

	s, err := New(Config{addr: held.Addr().String()})
	if err == nil {
		_ = s.Close()
		t.Fatal("New bound a port another listener holds")
	}
	var inUse *PortInUseError
	if !errors.As(err, &inUse) {
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
	h.get("/")
	if got := h.clock.asked(); len(got) != 1 || got[0] != 30*time.Minute {
		t.Fatalf("limits asked %v, want one 30-minute limit from the first root request", got)
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
	if resp, _ := h.get("/"); resp.StatusCode != http.StatusNotFound {
		t.Errorf("root after the stop: status %d, want 404", resp.StatusCode)
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
	h.get("/")
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
}
