package reporte2e

import (
	"encoding/json"
	"maps"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
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

// siteRecord is the fixture site's registry record, an adopted live site. The fixture's
// environment carries a Cloudflare credential and no GitHub one, so the Cloudflare checks read the
// fake and the GitHub checks report they could not run.
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

// The second site's identity. Its checks pass wherever a fake can make them pass, so the
// every-site sweep shows a healthy block beside the fixture site's failing one.
const (
	otherSiteDomain = "other-site.example"
	otherSiteZone   = "0a1b2c3d4e5f60718293a4b5c6d7e8f9"
)

// fixtureAccount is the account id siteRecord carries, which the Cloudflare fake answers for.
const fixtureAccount = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"

// fixtureZone is siteRecord's zone, whose settings leave HTTPS unforced.
const fixtureZone = "9f8e7d6c5b4a39281706f5e4d3c2b1a0"

// headSHA is the commit every fake branch head and build points at, so no deploy reads behind.
const headSHA = "4f3c2b1a0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b"

// fixtureCFToken is the Cloudflare read token the fixture's environment carries. The fake accepts
// any token.
const fixtureCFToken = "fixture-cloudflare-token"

// fixture is one test's world: the built binary, a proxy faking the site host and Cloudflare, and
// the child environment that points the binary at both and at a scratch registry, keyring, and
// home.
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
	proxy := testharness.NewProxy(t, map[string]http.Handler{
		siteDomain:           slowSite(siteDelay),
		"api.cloudflare.com": cloudflareFake(),
	})
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
			"CAIRN_CF_ACCOUNT_ID":   fixtureAccount,
			"CAIRN_CF_READ_TOKEN":   fixtureCFToken,
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
// An override with an empty value removes the variable. Nothing comes from the test process, so
// a CI runner's own CI variable never reaches a child.
func (f *fixture) environ(overrides map[string]string) []string {
	env := maps.Clone(f.env)
	maps.Copy(env, overrides)
	out := make([]string, 0, len(env))
	for name, value := range env {
		if value == "" {
			continue
		}
		out = append(out, name+"="+value)
	}
	slices.Sort(out)
	return out
}

// writeJSON writes v as a JSON body with status.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// cfResult writes a successful Cloudflare v4 envelope around result.
func cfResult(w http.ResponseWriter, result any) {
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "errors": []any{}, "messages": []any{}, "result": result})
}

// nameServers is every fake zone's delegation.
var nameServers = []string{"ada.ns.cloudflare.com", "bob.ns.cloudflare.com"}

// cloudflareFake answers the Cloudflare routes the health checks, logs, and adopt list read. The fixture
// site's zone leaves Always Use HTTPS off, so its https-forced row fails; the other site's zone
// forces HTTPS with HSTS. Any other route answers 404, which a check reports as could not run.
func cloudflareFake() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/client/v4")
		now := time.Now().UTC()
		switch {
		case path == "/user/tokens/verify":
			cfResult(w, map[string]any{"id": "fixture-token-id", "status": "active"})
		case path == "/accounts/"+fixtureAccount+"/workers/scripts":
			cfResult(w, []map[string]any{
				{"id": "my-site-web", "tag": "tag-my-site"},
				{"id": "other-site-web", "tag": "tag-other-site"},
			})
		case path == "/accounts/"+fixtureAccount+"/workers/domains":
			// Only the fixture site's Worker has a Custom Domain, so adopt list draws both of its
			// groups: one Worker it can adopt and one it cannot.
			cfResult(w, []map[string]any{{"hostname": siteDomain, "service": "my-site-web", "zone_id": fixtureZone}})
		case strings.HasSuffix(path, "/triggers"):
			cfResult(w, []map[string]any{{"uuid": "trigger-1", "repo_connection": map[string]any{"repo_name": "site-web"}}})
		case strings.HasPrefix(path, "/accounts/") && strings.HasSuffix(path, "/builds"):
			cfResult(w, []map[string]any{{
				"build_uuid":             "build-1",
				"status":                 "stopped",
				"build_outcome":          "success",
				"created_on":             now.Add(-2 * time.Hour).Format(time.RFC3339),
				"build_trigger_metadata": map[string]any{"commit_hash": headSHA},
			}})
		case path == "/zones" && r.URL.Query().Get("name") == "":
			cfResult(w, []map[string]any{
				{"id": fixtureZone, "name": siteDomain, "status": "active", "name_servers": nameServers},
				{"id": otherSiteZone, "name": otherSiteDomain, "status": "active", "name_servers": nameServers},
			})
		case path == "/zones":
			name := r.URL.Query().Get("name")
			zone := fixtureZone
			if name == otherSiteDomain {
				zone = otherSiteZone
			}
			cfResult(w, []map[string]any{{
				"id": zone, "name": name, "status": "active",
				"name_servers": nameServers,
			}})
		case path == "/zones/"+fixtureZone+"/settings":
			cfResult(w, []map[string]any{{"id": "always_use_https", "value": "off"}})
		case path == "/zones/"+otherSiteZone+"/settings":
			cfResult(w, []map[string]any{
				{"id": "always_use_https", "value": "on"},
				{"id": "security_header", "value": map[string]any{"strict_transport_security": map[string]any{"enabled": true}}},
			})
		case strings.HasSuffix(path, "/email/sending/subdomains"):
			domain := siteDomain
			if strings.Contains(path, otherSiteZone) {
				domain = otherSiteDomain
			}
			cfResult(w, []map[string]any{{"name": domain, "enabled": true}})
		case r.Method == http.MethodPost && strings.HasSuffix(path, "/workers/observability/telemetry/query"):
			events := logEvents(now)
			cfResult(w, map[string]any{"events": map[string]any{"events": events, "count": len(events)}})
		default:
			writeJSON(w, http.StatusNotFound, map[string]any{"success": false, "errors": []map[string]any{{"code": 7003, "message": "no such route in the fixture"}}})
		}
	})
}

// logEvents is the Workers Logs fake's window: four engine records over the last hours, one at
// error level, which the errors check counts under its threshold.
func logEvents(now time.Time) []map[string]any {
	records := []struct {
		ago    time.Duration
		level  string
		event  string
		fields map[string]any
	}{
		{12 * time.Minute, "info", "commit.succeeded", map[string]any{"email": "editor@my-site.example", "path": "src/content/posts/spring-hours.md"}},
		{47 * time.Minute, "error", "commit.failed", map[string]any{"email": "editor@my-site.example", "reason": "conflict"}},
		{2 * time.Hour, "info", "auth.link.sent", map[string]any{"email": "editor@my-site.example"}},
		{5 * time.Hour, "warn", "guard.refused", map[string]any{"reason": "no-session", "path": "/admin/content"}},
	}
	events := make([]map[string]any, 0, len(records))
	for _, rec := range records {
		at := now.Add(-rec.ago)
		source := map[string]any{"level": rec.level, "event": rec.event, "timestamp": at.Format(time.RFC3339)}
		maps.Copy(source, rec.fields)
		events = append(events, map[string]any{"source": source, "timestamp": at.UnixMilli()})
	}
	return events
}
