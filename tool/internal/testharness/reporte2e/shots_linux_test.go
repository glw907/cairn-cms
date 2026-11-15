package reporte2e

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"maps"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/testharness"
)

// shotsDirEnv names the directory the shot fixture writes into. With it unset the fixture test
// skips, so no gate ever waits on it.
const shotsDirEnv = "CAIRN_SHOTS_DIR"

// shotsDeadline bounds how long the fixture waits for the done file before it fails.
const shotsDeadline = 20 * time.Minute

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

// TestReportE2EShotFixture holds a fixture open for screenshots taken by hand. It writes into
// $CAIRN_SHOTS_DIR a registry of two sites, a keyring holding all three credentials, a doctor
// site directory, the proxy's CA as ca.pem, a copy of the branch binary as cairn-bin, and
// shots.env, one VAR=value per line naming the child environment. It then serves the fakes until
// a file named done appears in the directory. The outer process's own environment is never
// changed: the proxy and HOME reach a child only through the env -i line built from shots.env,
// since a proxy set in the shell also catches the terminal's own requests.
//
// Through the fakes, cairn health my-site-a1b2c3 --ack serving=<ACK date> shows a passing creds
// row, a failing https-forced row, a held serving row, and could-not-run rows for the
// delegation and email checks, whose DNS lookups reach no fake. cairn logs my-site-a1b2c3 shows
// four entries.
func TestReportE2EShotFixture(t *testing.T) {
	dir := os.Getenv(shotsDirEnv)
	if dir == "" {
		t.Skip(shotsDirEnv + " is unset: the shot fixture runs only when a session takes screenshots")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	// The fixture owns these names alone, so a rerun into the same directory starts clean.
	for _, name := range []string{"state", "kr", "home", "site", "ca.pem", "cairn-bin", "shots.env", "done"} {
		if err := os.RemoveAll(filepath.Join(dir, name)); err != nil {
			t.Fatal(err)
		}
	}

	state := privateDir(t, filepath.Join(dir, "state"))
	other := strings.NewReplacer(
		siteID, otherSiteID,
		`"name": "`+siteName+`"`, `"name": "Other Site"`,
		fixtureZone, otherSiteZone,
		"my-site", "other-site",
	).Replace(siteRecord)
	for id, rec := range map[string]string{siteID: siteRecord, otherSiteID: other} {
		writeFile(t, filepath.Join(state, id+".json"), []byte(rec), 0o600)
	}

	keyring := privateDir(t, filepath.Join(dir, "kr"))
	for name, value := range map[string]string{
		"CAIRN_CF_ACCOUNT_ID": fixtureAccount,
		"CAIRN_CF_READ_TOKEN": "fixture-cloudflare-token",
		"CAIRN_GH_READ_TOKEN": "fixture-github-token",
	} {
		// The tagged build's file keyring names each entry by the hex of "cairn", a NUL, and the
		// entry's name.
		writeFile(t, filepath.Join(keyring, hex.EncodeToString([]byte("cairn\x00"+name))), []byte(value), 0o600)
	}

	site := filepath.Join(dir, "site")
	writeDoctorSite(t, site)

	proxy := testharness.NewProxy(t, map[string]http.Handler{
		"api.cloudflare.com": cloudflareFake(),
		"api.github.com":     githubFake(),
		"registry.npmjs.org": npmFake(),
		siteDomain:           siteHostFake(false),
		otherSiteDomain:      siteHostFake(true),
	})
	ca, err := os.ReadFile(proxy.CAFile)
	if err != nil {
		t.Fatal(err)
	}
	writeFile(t, filepath.Join(dir, "ca.pem"), ca, 0o644)
	copyBinary(t, testharness.Cairn(t), filepath.Join(dir, "cairn-bin"))

	env := []string{
		"HTTPS_PROXY=" + proxy.URL,
		"SSL_CERT_FILE=" + filepath.Join(dir, "ca.pem"),
		"CAIRN_STATE_DIR=" + state,
		"CAIRN_E2E_KEYRING_DIR=" + keyring,
		"HOME=" + privateDir(t, filepath.Join(dir, "home")),
		"SITE_DIR=" + site,
		"ACK=serving=" + time.Now().UTC().AddDate(0, 0, 30).Format(time.DateOnly),
	}
	writeFile(t, filepath.Join(dir, "shots.env"), []byte(strings.Join(env, "\n")+"\n"), 0o644)
	t.Logf("shot fixture ready in %s; touch %s to stop", dir, filepath.Join(dir, "done"))

	deadline := time.After(shotsDeadline)
	tick := time.NewTicker(500 * time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-deadline:
			t.Fatalf("no done file in %s after %s", dir, shotsDeadline)
		case <-t.Context().Done():
			return
		case <-tick.C:
			if _, err := os.Stat(filepath.Join(dir, "done")); err == nil {
				t.Logf("done file found; %d requests served, refused %v", len(proxy.Requests()), proxy.Refused())
				return
			} else if !errors.Is(err, fs.ErrNotExist) {
				t.Fatal(err)
			}
		}
	}
}

// writeFile writes data to path at perm whatever the umask.
func writeFile(t *testing.T, path string, data []byte, perm os.FileMode) {
	t.Helper()
	if err := os.WriteFile(path, data, perm); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(path, perm); err != nil {
		t.Fatal(err)
	}
}

// copyBinary copies the built binary out of the harness's build directory, which TestMain
// removes when the run ends, so the session can name it by a stable path.
func copyBinary(t *testing.T, from, to string) {
	t.Helper()
	src, err := os.Open(from)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = src.Close() }()
	dst, err := os.OpenFile(to, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.Copy(dst, src); err != nil {
		_ = dst.Close()
		t.Fatal(err)
	}
	if err := dst.Close(); err != nil {
		t.Fatal(err)
	}
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

// cloudflareFake answers the Cloudflare routes the health checks and logs read. The fixture
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
		case path == "/zones":
			name := r.URL.Query().Get("name")
			zone := fixtureZone
			if name == otherSiteDomain {
				zone = otherSiteZone
			}
			cfResult(w, []map[string]any{{
				"id": zone, "name": name, "status": "active",
				"name_servers": []string{"ada.ns.cloudflare.com", "bob.ns.cloudflare.com"},
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

// githubFake answers the GitHub routes the health checks read: a token that expires in 90 days,
// one main branch at headSHA, and a manifest on the npm fake's latest engine version.
func githubFake() http.Handler {
	manifest := base64.StdEncoding.EncodeToString([]byte(`{"dependencies": {"@glw907/cairn-cms": "^0.99.0"}}`))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		now := time.Now().UTC()
		path := r.URL.Path
		switch {
		case path == "/rate_limit":
			w.Header().Set("github-authentication-token-expiration", now.AddDate(0, 0, 90).Format("2006-01-02 15:04:05 MST"))
			writeJSON(w, http.StatusOK, map[string]any{})
		case strings.HasSuffix(path, "/contents/package.json"):
			writeJSON(w, http.StatusOK, map[string]any{"content": manifest, "encoding": "base64"})
		case strings.HasSuffix(path, "/branches"):
			writeJSON(w, http.StatusOK, []map[string]any{{"name": "main", "commit": map[string]any{"sha": headSHA}}})
		case strings.HasSuffix(path, "/commits"):
			writeJSON(w, http.StatusOK, []map[string]any{{"commit": map[string]any{"committer": map[string]any{"date": now.Add(-26 * time.Hour).Format(time.RFC3339)}}}})
		case strings.Contains(path, "/commits/"):
			writeJSON(w, http.StatusOK, map[string]any{
				"sha":    headSHA,
				"author": map[string]any{"login": "cairn-cms[bot]"},
				"commit": map[string]any{"committer": map[string]any{"date": now.Add(-26 * time.Hour).Format(time.RFC3339)}},
			})
		default:
			writeJSON(w, http.StatusNotFound, map[string]any{"message": "Not Found"})
		}
	})
}

// npmFake answers every packument request with an engine whose latest version is the one the
// GitHub fake's manifest names.
func npmFake() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"dist-tags": map[string]any{"latest": "0.99.0"},
			"versions":  map[string]any{"0.98.0": map[string]any{}, "0.99.0": map[string]any{}},
		})
	})
}

// siteHostFake answers a site host. A cairn site redirects /admin to /admin/login with 303; a
// host that is not one answers 200 everywhere, which the serving check reads as a site that
// serves something other than cairn.
func siteHostFake(cairn bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cairn && r.URL.Path == "/admin" {
			w.Header().Set("Location", "/admin/login")
			w.WriteHeader(http.StatusSeeOther)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
}
