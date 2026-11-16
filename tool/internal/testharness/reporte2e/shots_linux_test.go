package reporte2e

import (
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"io/fs"
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
		"CAIRN_CF_READ_TOKEN": fixtureCFToken,
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
