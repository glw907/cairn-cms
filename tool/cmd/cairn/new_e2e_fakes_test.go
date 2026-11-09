package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"maps"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// e2eWorld is the faked services' shared state: the GitHub App's installations, the repository,
// and the log of what each service saw that a proxy-level count cannot say.
type e2eWorld struct {
	t *testing.T

	mu       sync.Mutex
	installs []e2eInstall
	repoName string
	badAuth  []string
	d1Create []string
	// remotes is the directory of bare repositories the child pushes to.
	remotes string
	// deployed turns true once the Actions run for the pushed commit has been read, which is when
	// the Worker the run deploys appears.
	deployed bool
	// emailTo and emailText are what the sign-in email carried.
	emailTo, emailText string
	// catalog replaces the template's catalog.json when set, for a run that meets several themes.
	catalog string
	custom  []byte
	// secrets holds every value the world planted, for the leak grep.
	secrets []string
}

type e2eInstall struct {
	ID        int64
	Selection string
}

// corpusBody reads a recorded response body from the fixture corpus.
func corpusBody(t *testing.T, provider, name string) map[string]any {
	t.Helper()
	_, body, err := providers.Corpus(provider, name)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(body, &m); err != nil {
		t.Fatalf("decode %s/%s: %v", provider, name, err)
	}
	return m
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// cfEmpty is the envelope of a list route with nothing in it.
func cfEmpty() map[string]any {
	return map[string]any{"success": true, "errors": []any{}, "messages": []any{}, "result": []any{}}
}

// newE2EWorld returns the world and the handler of each host the child may reach. The corpus
// supplies every response shape it records; the world only edits the values that must be planted
// or must agree with the run.
func newE2EWorld(t *testing.T) (*e2eWorld, map[string]http.Handler) {
	t.Helper()
	creds := corpusBody(t, "github", "test-only.app-credentials.json")
	w := &e2eWorld{t: t, repoName: "example-site"}
	w.secrets = []string{
		e2eCFAccess, e2eCFRefresh, e2eCFCode, e2eManifestCode, e2eInstallCode, e2eGHUserToken, e2eGHInstToken, e2eDeployKey,
		asStr(creds["client_secret"]), asStr(creds["webhook_secret"]),
		// One distinctive line of the App's private key stands for the whole PEM.
		strings.Split(asStr(creds["pem"]), "\n")[2],
	}
	return w, map[string]http.Handler{
		"dash.cloudflare.com": http.HandlerFunc(w.dash),
		"api.cloudflare.com":  http.HandlerFunc(w.cloudflare),
		"github.com":          http.HandlerFunc(w.githubWeb),
		"api.github.com":      http.HandlerFunc(w.githubAPI),
		"registry.npmjs.org":  http.HandlerFunc(w.registry),
		e2eZone:               http.HandlerFunc(w.site),
		"www." + e2eZone:      http.HandlerFunc(w.site),
		"blog." + e2eZone:     http.HandlerFunc(w.site),
	}
}

// dash fakes Cloudflare's OAuth server: the consent redirect and the token endpoint.
func (w *e2eWorld) dash(rw http.ResponseWriter, r *http.Request) {
	switch r.Method + " " + r.URL.Path {
	case "GET /oauth2/auth":
		q := r.URL.Query()
		back, err := url.Parse(q.Get("redirect_uri"))
		if err != nil || q.Get("code_challenge") == "" {
			http.Error(rw, "bad authorize request", http.StatusBadRequest)
			return
		}
		bq := back.Query()
		bq.Set("code", e2eCFCode)
		bq.Set("state", q.Get("state"))
		back.RawQuery = bq.Encode()
		http.Redirect(rw, r, back.String(), http.StatusFound)
	case "POST /oauth2/token":
		_ = r.ParseForm()
		switch r.PostForm.Get("grant_type") {
		case "authorization_code":
			if r.PostForm.Get("code") != e2eCFCode || r.PostForm.Get("code_verifier") == "" {
				writeJSON(rw, http.StatusBadRequest, corpusBody(w.t, "cloudflare", "oauth_token.invalid-grant.400.json"))
				return
			}
		case "refresh_token":
			if r.PostForm.Get("refresh_token") != e2eCFRefresh {
				writeJSON(rw, http.StatusBadRequest, corpusBody(w.t, "cloudflare", "oauth_token.invalid-grant.400.json"))
				return
			}
		}
		tok := corpusBody(w.t, "cloudflare", "oauth_token.success.200.json")
		tok["access_token"], tok["refresh_token"] = e2eCFAccess, e2eCFRefresh
		writeJSON(rw, http.StatusOK, tok)
	case "POST /oauth2/revoke":
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "oauth_revoke.success.200.json"))
	default:
		http.NotFound(rw, r)
	}
}

var (
	cfAccountRoute = regexp.MustCompile(`^/client/v4/accounts/[0-9a-f]+/(.+)$`)
	cfZoneRoute    = regexp.MustCompile(`^/client/v4/zones/[0-9a-f]+/(.+)$`)
)

// cloudflare fakes the Cloudflare API routes the opening's reads and the first watch steps call.
func (w *e2eWorld) cloudflare(rw http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Authorization") != "Bearer "+e2eCFAccess {
		w.mu.Lock()
		w.badAuth = append(w.badAuth, r.Method+" "+r.URL.Path)
		w.mu.Unlock()
		writeJSON(rw, http.StatusUnauthorized, map[string]any{"success": false, "errors": []any{map[string]any{"code": 10000, "message": "Authentication error"}}})
		return
	}
	if page, _ := strconv.Atoi(r.URL.Query().Get("page")); page > 1 {
		writeJSON(rw, http.StatusOK, cfEmpty())
		return
	}
	path := r.URL.Path
	route := r.Method + " " + path
	if m := cfAccountRoute.FindStringSubmatch(path); m != nil {
		route = r.Method + " /accounts/*/" + m[1]
	}
	if m := cfZoneRoute.FindStringSubmatch(path); m != nil {
		route = r.Method + " /zones/*/" + m[1]
	}
	switch {
	case route == "GET /client/v4/accounts":
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "accounts.list.200.json"))
	case route == "GET /client/v4/user":
		body := corpusBody(w.t, "cloudflare", "user.get.200.json")
		asMap(body["result"])["email"] = "owner@example.test"
		writeJSON(rw, http.StatusOK, body)
	case route == "GET /client/v4/zones":
		// The recording holds one zone; a second makes the account's domains several, which
		// the plan lists and the --zone flag chooses between.
		body := corpusBody(w.t, "cloudflare", "zones.active.200.json")
		first := asMap(asSlice(body["result"])[0])
		second := maps.Clone(first)
		second["id"], second["name"] = "00000000000000000000000000000009", "carin-test-5.org"
		body["result"] = []any{first, second}
		writeJSON(rw, http.StatusOK, body)
	case route == "GET /accounts/*/workers/scripts":
		w.mu.Lock()
		deployed := w.deployed
		w.mu.Unlock()
		body := cfEmpty()
		if deployed {
			body["result"] = []any{map[string]any{"id": "example-site", "tag": "tag-0001"}}
		}
		writeJSON(rw, http.StatusOK, body)
	case route == "GET /accounts/*/workers/domains", route == "GET /zones/*/workers/routes":
		writeJSON(rw, http.StatusOK, cfEmpty())
	case route == "GET /accounts/*/d1/database":
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "d1_database.name-check.200.json"))
	case strings.HasPrefix(route, "GET /accounts/*/r2/buckets/"):
		writeJSON(rw, http.StatusNotFound, corpusBody(w.t, "cloudflare", "r2_bucket.name-check.404.json"))
	case route == "GET /zones/*/dns_records":
		if strings.HasPrefix(r.URL.Query().Get("name"), "taken.") {
			writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "zone_dns_records.named.200.json"))
			return
		}
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "zone_dns_records.none.200.json"))
	case route == "GET /client/v4/user/tokens/permission_groups":
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "user_token_permission_groups.list.200.json"))
	case route == "POST /client/v4/user/tokens":
		body := corpusBody(w.t, "cloudflare", "user_tokens.create.200.json")
		asMap(body["result"])["value"] = e2eDeployKey
		writeJSON(rw, http.StatusOK, body)
	case route == "PUT /accounts/*/workers/domains":
		var req struct{ Hostname string }
		_ = json.NewDecoder(r.Body).Decode(&req)
		body := corpusBody(w.t, "cloudflare", "workers_domains.put.200.json")
		asMap(body["result"])["hostname"] = req.Hostname
		writeJSON(rw, http.StatusOK, body)
	case strings.HasPrefix(route, "PUT /accounts/*/workers/scripts/") && strings.HasSuffix(route, "/secrets"):
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "worker_secrets.put.200.json"))
	case route == "POST /accounts/*/email/sending/send":
		var req struct{ To, Text string }
		_ = json.NewDecoder(r.Body).Decode(&req)
		w.mu.Lock()
		w.emailTo, w.emailText = req.To, req.Text
		// The sign-in token is drawn at random, so the world learns it from the email it rides in
		// and then checks no output carried it.
		if _, after, ok := strings.Cut(req.Text, "token="); ok {
			token, _, _ := strings.Cut(after, "\n")
			w.secrets = append(w.secrets, token)
		}
		w.mu.Unlock()
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "email_send.success.200.json"))
	case route == "GET /zones/*/email/sending/subdomains":
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "cloudflare", "zone_email_sending_subdomains.list.200.json"))
	case route == "POST /accounts/*/d1/database":
		var req struct{ Name string }
		_ = json.NewDecoder(r.Body).Decode(&req)
		w.mu.Lock()
		w.d1Create = append(w.d1Create, req.Name)
		w.mu.Unlock()
		body := corpusBody(w.t, "cloudflare", "d1_database.create.200.json")
		asMap(body["result"])["name"] = req.Name
		writeJSON(rw, http.StatusOK, body)
	case route == "POST /accounts/*/r2/buckets":
		var req struct{ Name string }
		_ = json.NewDecoder(r.Body).Decode(&req)
		body := corpusBody(w.t, "cloudflare", "r2_buckets.create.200.json")
		asMap(body["result"])["name"] = req.Name
		writeJSON(rw, http.StatusOK, body)
	case route == "POST /zones/*/email/sending/subdomains":
		var req struct{ Name string }
		_ = json.NewDecoder(r.Body).Decode(&req)
		body := corpusBody(w.t, "cloudflare", "email_subdomain_create.success.200.json")
		body["name"] = req.Name
		writeJSON(rw, http.StatusOK, map[string]any{"success": true, "errors": []any{}, "messages": []any{}, "result": body})
	case strings.HasPrefix(route, "POST /accounts/*/d1/database/") && strings.HasSuffix(route, "/query"):
		// The sign-in batch writes the owner, sweeps tokens, and inserts one; any other query is
		// the table listing of an empty database.
		var req struct {
			Batch []struct{ SQL string } `json:"batch"`
		}
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &req)
		body := corpusBody(w.t, "cloudflare", "d1_query.batch.200.json")
		results := asSlice(body["result"])
		if len(req.Batch) == 3 {
			asMap(asMap(results[0])["meta"])["changes"] = 1
			asMap(asMap(results[1])["meta"])["changes"] = 0
			asMap(asMap(results[2])["meta"])["changes"] = 1
			asMap(results[2])["results"] = []any{}
			body["result"] = results
		} else {
			body["result"] = results[:1]
			asMap(results[0])["results"] = []any{}
		}
		writeJSON(rw, http.StatusOK, body)
	default:
		w.t.Logf("e2e: unfaked Cloudflare route %s", r.Method+" "+r.URL.RequestURI())
		http.NotFound(rw, r)
	}
}

// githubWeb fakes github.com: the App manifest form, the two install pages, and the OAuth code
// exchange. Each page redirects the tab back to the loopback the way GitHub does.
func (w *e2eWorld) githubWeb(rw http.ResponseWriter, r *http.Request) {
	loop := "http://127.0.0.1:49152"
	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/settings/apps/new":
		if r.FormValue("manifest") == "" {
			http.Error(rw, "no manifest", http.StatusBadRequest)
			return
		}
		http.Redirect(rw, r, loop+"/github/manifest?code="+e2eManifestCode+"&state="+url.QueryEscape(r.URL.Query().Get("state")), http.StatusFound)
	case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/installations/new"):
		id := w.install("all")
		http.Redirect(rw, r, loop+"/github/callback?code="+e2eInstallCode+"&installation_id="+strconv.FormatInt(id, 10)+"&setup_action=install", http.StatusFound)
	case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/installations/new/permissions"):
		id := w.install("selected")
		http.Redirect(rw, r, loop+"/github/callback?code="+e2eInstallCode+"&installation_id="+strconv.FormatInt(id, 10)+"&setup_action=install", http.StatusFound)
	case r.Method == http.MethodPost && r.URL.Path == "/login/oauth/access_token":
		var req struct {
			ClientSecret string `json:"client_secret"`
			Code         string `json:"code"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		if req.Code != e2eInstallCode || req.ClientSecret == "" {
			writeJSON(rw, http.StatusOK, corpusBody(w.t, "github", "login_oauth_access_token.bad-verification-code.200.json"))
			return
		}
		writeJSON(rw, http.StatusOK, map[string]any{"access_token": e2eGHUserToken, "token_type": "bearer", "scope": ""})
	default:
		w.t.Logf("e2e: unfaked github.com route %s", r.Method+" "+r.URL.RequestURI())
		http.NotFound(rw, r)
	}
}

// install records a new installation of the App and returns its id. The first is the
// all-repositories one the sweep removes; the second is scoped to the new repository.
func (w *e2eWorld) install(selection string) int64 {
	w.mu.Lock()
	defer w.mu.Unlock()
	id := e2eInstall1
	if selection == "selected" {
		id = e2eInstall2
	}
	w.installs = append(w.installs, e2eInstall{ID: id, Selection: selection})
	return id
}

var ghInstallRoute = regexp.MustCompile(`^/app/installations/(\d+)(/access_tokens)?$`)

// githubAPI fakes api.github.com for the App conversion, the repository, and the installation
// reads and deletes.
func (w *e2eWorld) githubAPI(rw http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	switch {
	case r.Method == http.MethodPost && strings.HasPrefix(path, "/app-manifests/") && strings.HasSuffix(path, "/conversions"):
		if !strings.Contains(path, e2eManifestCode) {
			writeJSON(rw, http.StatusNotFound, corpusBody(w.t, "github", "not_found.default.404.json"))
			return
		}
		creds := corpusBody(w.t, "github", "test-only.app-credentials.json")
		body := corpusBody(w.t, "github", "app_manifest_conversion.created.201.json")
		body["slug"], body["name"] = "cairn-example-site", "cairn-example-site"
		body["pem"], body["client_secret"], body["webhook_secret"] = creds["pem"], creds["client_secret"], creds["webhook_secret"]
		asMap(body["owner"])["login"] = e2eOwner
		writeJSON(rw, http.StatusCreated, body)
	case r.Method == http.MethodGet && path == "/app/installations":
		if strings.Count(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "), ".") != 2 {
			writeJSON(rw, http.StatusUnauthorized, corpusBody(w.t, "github", "app_installations.bad-credentials.401.json"))
			return
		}
		writeJSON(rw, http.StatusOK, w.installList())
	case r.Method == http.MethodDelete && ghInstallRoute.MatchString(path):
		id, _ := strconv.ParseInt(ghInstallRoute.FindStringSubmatch(path)[1], 10, 64)
		w.mu.Lock()
		for i, in := range w.installs {
			if in.ID == id {
				w.installs = append(w.installs[:i], w.installs[i+1:]...)
				break
			}
		}
		w.mu.Unlock()
		rw.WriteHeader(http.StatusNoContent)
	case r.Method == http.MethodPost && ghInstallRoute.MatchString(path):
		writeJSON(rw, http.StatusCreated, map[string]any{"token": e2eGHInstToken, "expires_at": "2099-01-01T00:00:00Z"})
	case r.Method == http.MethodPost && path == "/user/repos":
		var req struct {
			Name string `json:"name"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		w.mu.Lock()
		w.repoName = req.Name
		w.mu.Unlock()
		body := corpusBody(w.t, "github", "repo_create.ok.201.json")
		body["name"], body["id"] = req.Name, e2eRepoID
		owner := asMap(body["owner"])
		owner["login"], owner["id"] = e2eOwner, e2eOwnerID
		writeJSON(rw, http.StatusCreated, body)
	case r.Method == http.MethodGet && path == "/user":
		body := corpusBody(w.t, "github", "user_get.ok.200.json")
		body["login"], body["id"] = e2eOwner, e2eOwnerID
		writeJSON(rw, http.StatusOK, body)
	case r.Method == http.MethodGet && path == "/user/installations":
		list := w.installList()
		writeJSON(rw, http.StatusOK, map[string]any{"total_count": len(list), "installations": list})
	case r.Method == http.MethodGet && strings.HasPrefix(path, "/user/installations/") && strings.HasSuffix(path, "/repositories"):
		writeJSON(rw, http.StatusOK, map[string]any{"total_count": 1, "repositories": []map[string]any{{"id": e2eRepoID}}})
	case r.Method == http.MethodGet && strings.HasPrefix(path, "/repos/"+e2eOwner+"/") && strings.Contains(path, "/commits/"):
		repo := strings.Split(path, "/")[3]
		out, err := exec.Command("git", "--git-dir", filepath.Join(w.remotes, e2eOwner, repo+".git"), "rev-parse", "refs/heads/main").Output()
		if err != nil {
			writeJSON(rw, http.StatusConflict, corpusBody(w.t, "github", "git_data.empty-repo.409.json"))
			return
		}
		writeJSON(rw, http.StatusOK, map[string]any{"sha": strings.TrimSpace(string(out))})
	case r.Method == http.MethodGet && strings.HasSuffix(path, "/actions/secrets/public-key"):
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "github", "repo_actions_secrets_public_key.ok.200.json"))
	case r.Method == http.MethodPut && strings.Contains(path, "/actions/secrets/"):
		writeJSON(rw, http.StatusCreated, corpusBody(w.t, "github", "repo_actions_secret_put.ok.201.json"))
	case r.Method == http.MethodGet && strings.HasSuffix(path, "/actions/runs"):
		w.mu.Lock()
		w.deployed = true
		w.mu.Unlock()
		writeJSON(rw, http.StatusOK, corpusBody(w.t, "github", "actions_runs.for-commit.200.json"))
	case r.Method == http.MethodGet && path == "/installation/repositories":
		writeJSON(rw, http.StatusOK, map[string]any{"total_count": 1, "repositories": []map[string]any{{"id": e2eRepoID}}})
	default:
		w.t.Logf("e2e: unfaked api.github.com route %s", r.Method+" "+r.URL.RequestURI())
		http.NotFound(rw, r)
	}
}

func (w *e2eWorld) installList() []map[string]any {
	w.mu.Lock()
	defer w.mu.Unlock()
	list := []map[string]any{}
	for _, in := range w.installs {
		list = append(list, map[string]any{"id": in.ID, "app_id": e2eAppID, "repository_selection": in.Selection})
	}
	return list
}

// site answers the live site: its home page, and a sign-in redirect for the admin.
func (w *e2eWorld) site(rw http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/admin" {
		http.Redirect(rw, r, "/admin/login", http.StatusSeeOther)
		return
	}
	_, _ = rw.Write([]byte("ok"))
}

// engineTarball is the real Waymark template the way the engine package ships it: the template
// directory, its setup overlay, and the catalog, rooted at package/template/.
func engineTarball(t *testing.T, catalogOverride string) []byte {
	t.Helper()
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	files := map[string]string{}
	add := func(dir, prefix string) {
		err := filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return err
			}
			rel, _ := filepath.Rel(dir, p)
			rel = filepath.ToSlash(rel)
			if rel == "README.md" && strings.Contains(dir, "setup-overlay") {
				return nil
			}
			if rel == ".gitignore" {
				rel = "gitignore"
			}
			data, err := os.ReadFile(p)
			files[prefix+rel] = string(data)
			return err
		})
		if err != nil {
			t.Fatalf("read %s: %v", dir, err)
		}
	}
	add(filepath.Join(root, "templates", "waymark"), "waymark/")
	add(filepath.Join(root, "scripts", "build", "setup-overlay"), "waymark/")
	catalog, err := os.ReadFile(filepath.Join(root, "templates", "catalog.json"))
	if err != nil {
		t.Fatal(err)
	}
	files["catalog.json"] = string(catalog)
	if catalogOverride != "" {
		files["catalog.json"] = catalogOverride
	}

	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(zw)
	write := func(name, body string) {
		hdr := &tar.Header{Name: name, Typeflag: tar.TypeReg, Mode: 0o644, Size: int64(len(body))}
		if err := tw.WriteHeader(hdr); err != nil {
			t.Fatal(err)
		}
		if _, err := tw.Write([]byte(body)); err != nil {
			t.Fatal(err)
		}
	}
	for name, body := range files {
		write("package/template/"+name, body)
	}
	write("package/package.json", `{"name":"@glw907/cairn-cms"}`)
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// registry fakes the npm registry: the engine's packument and its one tarball.
func (w *e2eWorld) registry(rw http.ResponseWriter, r *http.Request) {
	tarPath := "/@glw907/cairn-cms/-/cairn-cms-" + e2eEngineVersion + ".tgz"
	switch r.URL.Path {
	case "/@glw907/cairn-cms":
		sum := sha512.Sum512(w.tarball())
		writeJSON(rw, http.StatusOK, map[string]any{
			"dist-tags": map[string]string{"latest": e2eEngineVersion, "next": e2eEngineVersion},
			"versions": map[string]any{e2eEngineVersion: map[string]any{"dist": map[string]string{
				"tarball":   "https://registry.npmjs.org" + tarPath,
				"integrity": "sha512-" + base64.StdEncoding.EncodeToString(sum[:]),
			}}},
		})
	case tarPath:
		_, _ = rw.Write(w.tarball())
	default:
		http.NotFound(rw, r)
	}
}

var (
	tarballOnce  sync.Once
	tarballBytes []byte
)

func (w *e2eWorld) tarball() []byte {
	if w.catalog != "" {
		w.mu.Lock()
		defer w.mu.Unlock()
		if w.custom == nil {
			w.custom = engineTarball(w.t, w.catalog)
		}
		return w.custom
	}
	tarballOnce.Do(func() { tarballBytes = engineTarball(w.t, "") })
	return tarballBytes
}

// leaks returns every planted value found in a stream given by name, or in any file under dirs.
func (w *e2eWorld) leaks(streams map[string]string, dirs ...string) []string {
	var found []string
	check := func(where, data string) {
		for _, s := range w.secrets {
			if strings.Contains(data, s) {
				found = append(found, fmt.Sprintf("%s holds %q", where, s))
			}
		}
	}
	for name, data := range streams {
		check(name, data)
	}
	for _, dir := range dirs {
		_ = filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return nil
			}
			if data, err := os.ReadFile(p); err == nil {
				check(p, string(data))
			}
			return nil
		})
	}
	return found
}

// asMap, asStr, and asSlice assert a decoded JSON value's type, and panic, which the proxy's
// server logs as a failed request, when the corpus shape is not the one the fake expects.
func asMap(v any) map[string]any {
	m, ok := v.(map[string]any)
	if !ok {
		panic(fmt.Sprintf("e2e: %T is not an object", v))
	}
	return m
}

func asStr(v any) string {
	s, ok := v.(string)
	if !ok {
		panic(fmt.Sprintf("e2e: %T is not a string", v))
	}
	return s
}

func asSlice(v any) []any {
	l, ok := v.([]any)
	if !ok {
		panic(fmt.Sprintf("e2e: %T is not a list", v))
	}
	return l
}
