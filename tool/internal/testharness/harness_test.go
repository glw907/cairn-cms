package testharness

import (
	"html"
	"maps"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"sync/atomic"
	"testing"
)

func TestMain(m *testing.M) {
	Main(m)
}

// fakeSite is the test address the self-test fakes. A .invalid name never resolves, so a run
// that bypasses the proxy fails at the lookup instead of reaching a real host.
const fakeSite = "site.cairn-e2e.invalid"

// manifest is the value the walk's form carries to the fake github.com, which checks it.
const manifest = `{"name":"x"}`

// newProbeCase returns a self-test case and the tab stand-in its walk starts from. The case fakes
// the test address and the two hosts a setup tab redirects through.
func newProbeCase(t *testing.T) (*Case, *httptest.Server) {
	t.Helper()
	tab := newTab(t)
	site := http.NewServeMux()
	site.HandleFunc("GET /hello", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("hello from the fake"))
	})
	site.HandleFunc("GET /signed-in", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("<p>signed in</p>"))
	})
	dash := http.NewServeMux()
	dash.HandleFunc("GET /oauth2/auth", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, r.URL.Query().Get("redirect_uri"), http.StatusFound)
	})
	github := http.NewServeMux()
	github.HandleFunc("POST /settings/apps/new", func(w http.ResponseWriter, r *http.Request) {
		if r.FormValue("manifest") != manifest || r.URL.Query().Get("state") != "s1" {
			http.Error(w, "unexpected manifest form", http.StatusBadRequest)
			return
		}
		http.Redirect(w, r, tab.URL+"/github/manifest", http.StatusFound)
	})
	c := NewCase(t, Config{Hosts: map[string]http.Handler{
		fakeSite:              site,
		"dash.cloudflare.com": dash,
		"github.com":          github,
	}})
	return c, tab
}

// newTab serves a stand-in for setup's loopback tab: a redirect out to the fake Cloudflare
// consent, a form to the fake GitHub, a button link, a meta refresh, and the done page's poll of
// /next, which answers only to the cookie the first page set.
func newTab(t *testing.T) *httptest.Server {
	t.Helper()
	var waits atomic.Int32
	mux := http.NewServeMux()
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	mux.HandleFunc("GET /start", func(w http.ResponseWriter, r *http.Request) {
		http.SetCookie(w, &http.Cookie{Name: "session", Value: "s", Path: "/"})
		http.Redirect(w, r, "https://dash.cloudflare.com/oauth2/auth?redirect_uri="+url.QueryEscape(srv.URL+"/cloudflare/callback"), http.StatusFound)
	})
	mux.HandleFunc("GET /cloudflare/callback", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`<form method="post" action="https://github.com/settings/apps/new?state=s1">` +
			`<input type="hidden" name="manifest" value="` + html.EscapeString(manifest) + `"></form>`))
	})
	mux.HandleFunc("GET /github/manifest", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`<a class="button" href="/wait">Continue</a>`))
	})
	mux.HandleFunc("GET /wait", func(w http.ResponseWriter, _ *http.Request) {
		n := waits.Add(1)
		if n == 1 {
			_, _ = w.Write([]byte(`<meta http-equiv="refresh" content="0">`))
			return
		}
		_, _ = w.Write([]byte(`<script>fetch('/next', { cache: 'no-store' })</script>`))
	})
	mux.HandleFunc("GET /next", func(w http.ResponseWriter, r *http.Request) {
		if c, err := r.Cookie("session"); err != nil || c.Value != "s" {
			http.Error(w, "no session", http.StatusForbidden)
			return
		}
		_, _ = w.Write([]byte(`{"url":"https://` + fakeSite + `/signed-in"}`))
	})
	return srv
}

// gitRun runs git outside any case, with the owner's config kept out.
func gitRun(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1",
		"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@example.test", "GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@example.test")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
	return strings.TrimSpace(string(out))
}

// piece is one thing the harness gives a child. prepare readies the case and returns the probe's
// arguments; carried asserts the piece carried the probe's call; remove takes the piece away, and
// the run must then fail with failure in its stderr.
type piece struct {
	name    string
	prepare func(t *testing.T, c *Case, tab *httptest.Server) []string
	carried func(t *testing.T, c *Case, r Result, tab *httptest.Server)
	remove  func(t *testing.T, c *Case)
	failure string
}

var pieces = []piece{
	{
		name: "the proxy",
		prepare: func(*testing.T, *Case, *httptest.Server) []string {
			return []string{"https", "https://" + fakeSite + "/hello"}
		},
		carried: func(t *testing.T, _ *Case, r Result, _ *httptest.Server) {
			if r.Stdout != "hello from the fake" {
				t.Errorf("stdout %q, want the fake's body", r.Stdout)
			}
			if want := []Request{{"GET", fakeSite, "/hello"}}; !slices.Equal(r.Requests, want) {
				t.Errorf("proxy requests %v, want %v", r.Requests, want)
			}
		},
		remove:  func(_ *testing.T, c *Case) { delete(c.Env, "HTTPS_PROXY") },
		failure: "lookup " + fakeSite,
	},
	{
		name: "the CA",
		prepare: func(*testing.T, *Case, *httptest.Server) []string {
			return []string{"https", "https://" + fakeSite + "/hello"}
		},
		carried: func(t *testing.T, _ *Case, r Result, _ *httptest.Server) {
			if r.Stdout != "hello from the fake" {
				t.Errorf("stdout %q, want the fake's body", r.Stdout)
			}
		},
		remove:  func(_ *testing.T, c *Case) { delete(c.Env, "SSL_CERT_FILE") },
		failure: "certificate signed by unknown authority",
	},
	{
		name: "the BROWSER helper",
		prepare: func(_ *testing.T, _ *Case, tab *httptest.Server) []string {
			return []string{"browser", tab.URL + "/start"}
		},
		carried: func(t *testing.T, _ *Case, r Result, tab *httptest.Server) {
			o := tab.URL
			wantVisits := []string{
				"GET " + o + "/start",
				"GET https://dash.cloudflare.com/oauth2/auth?redirect_uri=" + url.QueryEscape(o+"/cloudflare/callback"),
				"GET " + o + "/cloudflare/callback",
				"POST https://github.com/settings/apps/new?state=s1",
				"GET " + o + "/github/manifest",
				"GET " + o + "/wait",
				"GET " + o + "/wait",
				"GET " + o + "/next",
				"GET https://" + fakeSite + "/signed-in",
			}
			if !slices.Equal(r.BrowserVisits, wantVisits) {
				t.Errorf("browser visits:\n%s\nwant:\n%s", strings.Join(r.BrowserVisits, "\n"), strings.Join(wantVisits, "\n"))
			}
			wantRequests := []Request{
				{"GET", "dash.cloudflare.com", "/oauth2/auth?redirect_uri=" + url.QueryEscape(o+"/cloudflare/callback")},
				{"POST", "github.com", "/settings/apps/new?state=s1"},
				{"GET", fakeSite, "/signed-in"},
			}
			if !slices.Equal(r.Requests, wantRequests) {
				t.Errorf("proxy requests %v, want %v", r.Requests, wantRequests)
			}
		},
		remove:  func(_ *testing.T, c *Case) { delete(c.Env, "BROWSER") },
		failure: "the no-display stop fired",
	},
	{
		name: "the git rewrite",
		prepare: func(t *testing.T, c *Case, _ *httptest.Server) []string {
			bare := c.BareRepo("owner", "site")
			work := t.TempDir()
			gitRun(t, work, "init", "--quiet", "--initial-branch=main")
			gitRun(t, work, "commit", "--quiet", "--allow-empty", "-m", "seed")
			gitRun(t, work, "push", "--quiet", bare, "main")
			return []string{"git-clone", "https://github.com/owner/site.git", filepath.Join(c.Dir, "clone")}
		},
		carried: func(t *testing.T, c *Case, _ Result, _ *httptest.Server) {
			if got := gitRun(t, filepath.Join(c.Dir, "clone"), "log", "-1", "--format=%s"); got != "seed" {
				t.Errorf("the clone's head is %q, want the seeded commit", got)
			}
		},
		remove: func(_ *testing.T, c *Case) {
			delete(c.Env, "GIT_CONFIG_COUNT")
			delete(c.Env, "GIT_CONFIG_KEY_0")
			delete(c.Env, "GIT_CONFIG_VALUE_0")
		},
		// Without the rewrite git goes through the proxy to the fake github.com, which serves no
		// repository.
		failure: "repository 'https://github.com/owner/site.git/' not found",
	},
	{
		name: "the keyring file store",
		prepare: func(*testing.T, *Case, *httptest.Server) []string {
			return []string{"keyring", "run7", "planted-access-token"}
		},
		carried: func(t *testing.T, c *Case, _ Result, _ *httptest.Server) {
			want := map[string]string{"setup/run7/cloudflare-access": "planted-access-token"}
			if got := c.KeyringEntries(); !maps.Equal(got, want) {
				t.Errorf("keyring entries %v, want %v", got, want)
			}
		},
		remove:  func(_ *testing.T, c *Case) { delete(c.Env, "CAIRN_E2E_KEYRING_DIR") },
		failure: "keyring unavailable",
	},
	{
		name:    "the node stub",
		prepare: func(*testing.T, *Case, *httptest.Server) []string { return []string{"node"} },
		carried: func(t *testing.T, _ *Case, r Result, _ *httptest.Server) {
			if !strings.HasPrefix(r.Stdout, "v24.") {
				t.Errorf("node reported %q, want v24", r.Stdout)
			}
			if want := []string{"--version"}; !slices.Equal(r.NodeCalls, want) {
				t.Errorf("node calls %q, want %q", r.NodeCalls, want)
			}
		},
		remove: func(t *testing.T, c *Case) {
			if err := os.Remove(filepath.Join(c.BinDir, "node")); err != nil {
				t.Fatal(err)
			}
		},
		failure: "executable file not found",
	},
	{
		name:    "the npm stub",
		prepare: func(*testing.T, *Case, *httptest.Server) []string { return []string{"npm"} },
		carried: func(t *testing.T, _ *Case, r Result, _ *httptest.Server) {
			if want := []string{"install"}; !slices.Equal(r.NPMCalls, want) {
				t.Errorf("npm calls %q, want %q", r.NPMCalls, want)
			}
		},
		remove: func(t *testing.T, c *Case) {
			if err := os.Remove(filepath.Join(c.BinDir, "npm")); err != nil {
				t.Fatal(err)
			}
		},
		failure: "executable file not found",
	},
}

// TestEachPieceCarriesItsCall runs the probe once per piece with the harness whole, where the
// call must arrive, and once with that piece taken away, where the run must fail.
func TestEachPieceCarriesItsCall(t *testing.T) {
	for _, p := range pieces {
		t.Run(p.name, func(t *testing.T) {
			c, tab := newProbeCase(t)
			r := c.Run(Binary(t, "internal/testharness/probe"), p.prepare(t, c, tab)...)
			if r.ExitCode != 0 {
				t.Fatalf("with the harness whole, exit %d: %s", r.ExitCode, r.Stderr)
			}
			p.carried(t, c, r, tab)
		})
		t.Run(p.name+" removed", func(t *testing.T) {
			c, tab := newProbeCase(t)
			args := p.prepare(t, c, tab)
			p.remove(t, c)
			r := c.Run(Binary(t, "internal/testharness/probe"), args...)
			if r.ExitCode == 0 {
				t.Fatalf("with %s removed the run succeeded; stdout %q", p.name, r.Stdout)
			}
			if !strings.Contains(r.Stderr, p.failure) {
				t.Errorf("with %s removed, stderr %q, want it to name %q", p.name, r.Stderr, p.failure)
			}
		})
	}
}

// TestProxyRefusesAnUnfakedHost sends a request to a host the case does not fake; the proxy must
// refuse the CONNECT and serve nothing.
func TestProxyRefusesAnUnfakedHost(t *testing.T) {
	c, _ := newProbeCase(t)
	r := c.Run(Binary(t, "internal/testharness/probe"), "https", "https://unfaked.cairn-e2e.invalid/")
	if r.ExitCode == 0 {
		t.Fatalf("a request to an unfaked host succeeded: %q", r.Stdout)
	}
	if want := []string{"unfaked.cairn-e2e.invalid:443"}; !slices.Equal(r.Refused, want) {
		t.Errorf("refused %v, want %v", r.Refused, want)
	}
	if len(r.Requests) != 0 {
		t.Errorf("the proxy served %v, want nothing", r.Requests)
	}
}

// TestCairnRunsUnderTheHarness builds cairn with the test tag and runs it as a case's child.
func TestCairnRunsUnderTheHarness(t *testing.T) {
	c, _ := newProbeCase(t)
	r := c.Run(Cairn(t), "--version")
	if r.ExitCode != 0 || strings.TrimSpace(r.Stdout) == "" {
		t.Fatalf("cairn --version: exit %d, stdout %q, stderr %q", r.ExitCode, r.Stdout, r.Stderr)
	}
}
