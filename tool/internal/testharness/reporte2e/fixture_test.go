package reporte2e

import (
	"maps"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/testharness"
)

// siteID is the fixture registry's one site. It passes record.ValidateSiteID, which a bare
// "my-site" does not.
const siteID = "my-site-a1b2c3"

// siteName is the fixture site's display name, which heads its report.
const siteName = "My Site"

// siteDomain is the fixture site's domain, the one host the proxy fakes.
const siteDomain = "my-site.example"

// siteRecord is the fixture site's registry record, an adopted live site with no credential the
// keyring holds, so every provider check reports it could not run and only the site host
// answers.
const siteRecord = `{
  "name": "` + siteName + `",
  "step": "live",
  "domain": "` + siteDomain + `",
  "schemaVersion": 1,
  "adopted": true,
  "github": {
    "repo": {
      "id": 123456789,
      "owner": "my-site",
      "repo": "my-site-web",
      "defaultBranch": "main"
    },
    "installationId": 20200042
  },
  "cloudflare": {
    "accountId": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    "zoneId": "9f8e7d6c5b4a39281706f5e4d3c2b1a0",
    "workerName": "my-site-web"
  },
  "secretRefs": {
    "github.clientSecret": "keyring://cairn/` + siteID + `/clientSecret",
    "cloudflare.apiToken": "keyring://cairn/` + siteID + `/apiToken"
  }
}
`

// fixture is one test's world: the built binary, a proxy faking the site host, and the child
// environment that points the binary at both and at a scratch registry, keyring, and home.
type fixture struct {
	bin   string
	proxy *testharness.Proxy
	env   map[string]string
}

// newFixture builds a fixture whose site host answers each request after siteDelay, which is
// what keeps a run going long enough to watch. It skips the test on any system but Linux, for
// the reason testharness.NewCase gives.
func newFixture(t *testing.T, siteDelay time.Duration) *fixture {
	t.Helper()
	if runtime.GOOS != "linux" {
		t.Skip("the report end-to-end tests run on Linux only: Go reads SSL_CERT_FILE on Unix other than macOS")
	}
	root := t.TempDir()
	state := privateDir(t, filepath.Join(root, "state"))
	if err := os.WriteFile(filepath.Join(state, siteID+".json"), []byte(siteRecord), 0o600); err != nil {
		t.Fatal(err)
	}
	proxy := testharness.NewProxy(t, map[string]http.Handler{siteDomain: slowSite(siteDelay)})
	return &fixture{
		bin:   testharness.Cairn(t),
		proxy: proxy,
		env: map[string]string{
			"HOME":                  privateDir(t, filepath.Join(root, "home")),
			"LANG":                  "C.UTF-8",
			"TERM":                  "xterm-256color",
			"HTTPS_PROXY":           proxy.URL,
			"SSL_CERT_FILE":         proxy.CAFile,
			"CAIRN_STATE_DIR":       state,
			"CAIRN_E2E_KEYRING_DIR": privateDir(t, filepath.Join(root, "keyring")),
		},
	}
}

// privateDir creates path at mode 0700 whatever the umask, the mode the store requires of a
// registry directory.
func privateDir(t *testing.T, path string) string {
	t.Helper()
	if err := os.Mkdir(path, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(path, 0o700); err != nil {
		t.Fatal(err)
	}
	return path
}

// slowSite answers every request with 200 after delay, or as soon as the client gives up.
func slowSite(delay time.Duration) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-time.After(delay):
		case <-r.Context().Done():
			return
		}
		w.WriteHeader(http.StatusOK)
	})
}

// environ returns the child's whole environment, the fixture's with overrides applied, sorted.
// Nothing comes from the test process, so a CI runner's own CI variable never reaches a child.
func (f *fixture) environ(overrides map[string]string) []string {
	env := maps.Clone(f.env)
	maps.Copy(env, overrides)
	out := make([]string, 0, len(env))
	for name, value := range env {
		out = append(out, name+"="+value)
	}
	slices.Sort(out)
	return out
}

// served reports whether the proxy served the site host at least once, which shows the run
// reached the slow host rather than settling before the progress line was due.
func (f *fixture) served() bool {
	return slices.ContainsFunc(f.proxy.Requests(), func(r testharness.Request) bool {
		return r.Host == siteDomain
	})
}
