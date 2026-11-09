package scaffold

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// repoRoot is the cairn-cms checkout the tests read the real template from.
const repoRoot = "../../../.."

// tarEntry is one tarball member; a zero Typeflag means a regular file.
type tarEntry struct {
	name     string
	body     string
	typeflag byte
	link     string
	mode     int64
}

// makeTarball packs entries into a gzip tarball.
func makeTarball(t *testing.T, entries []tarEntry) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(zw)
	for _, e := range entries {
		flag := e.typeflag
		if flag == 0 {
			flag = tar.TypeReg
		}
		mode := e.mode
		if mode == 0 {
			mode = 0o644
		}
		hdr := &tar.Header{Name: e.name, Typeflag: flag, Mode: mode, Linkname: e.link}
		if flag == tar.TypeReg {
			hdr.Size = int64(len(e.body))
		}
		if err := tw.WriteHeader(hdr); err != nil {
			t.Fatal(err)
		}
		if flag == tar.TypeReg {
			if _, err := tw.Write([]byte(e.body)); err != nil {
				t.Fatal(err)
			}
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// templateFiles reads the real Waymark template the way pack-engine-template.mjs composes it:
// templates/waymark plus the setup overlay, with .gitignore shipped as gitignore, and the
// catalog beside it. It returns each file's path below template/ and its content.
func templateFiles(t *testing.T) map[string]string {
	t.Helper()
	out := map[string]string{}
	add := func(root, prefix string) {
		err := filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return err
			}
			rel, err := filepath.Rel(root, p)
			if err != nil {
				return err
			}
			rel = filepath.ToSlash(rel)
			if rel == "README.md" && strings.Contains(root, "setup-overlay") {
				return nil
			}
			if rel == ".gitignore" {
				rel = "gitignore"
			}
			data, err := os.ReadFile(p)
			if err != nil {
				return err
			}
			out[prefix+rel] = string(data)
			return nil
		})
		if err != nil {
			t.Fatalf("read %s: %v", root, err)
		}
	}
	add(filepath.Join(repoRoot, "templates/waymark"), "waymark/")
	add(filepath.Join(repoRoot, "scripts/build/setup-overlay"), "waymark/")
	catalog, err := os.ReadFile(filepath.Join(repoRoot, "templates/catalog.json"))
	if err != nil {
		t.Fatal(err)
	}
	out["catalog.json"] = string(catalog)
	return out
}

// tarballOf wraps template files under package/template/, as npm roots a tarball.
func tarballOf(t *testing.T, files map[string]string) []byte {
	t.Helper()
	var entries []tarEntry
	for name, body := range files {
		entries = append(entries, tarEntry{name: "package/template/" + name, body: body})
	}
	entries = append(entries, tarEntry{name: "package/package.json", body: `{"name":"@glw907/cairn-cms"}`})
	return makeTarball(t, entries)
}

func integrityOf(b []byte) string {
	sum := sha512.Sum512(b)
	return "sha512-" + base64.StdEncoding.EncodeToString(sum[:])
}

// registry is a RoundTripper serving a fixed packument and tarball; it counts every request.
type registry struct {
	t         *testing.T
	packument string
	tarball   []byte
	tarURL    string
	requests  []string
}

const testVersion = "0.99.0-rc.9"

// newRegistry serves tarball as testVersion under the "latest" tag and tag "next".
func newRegistry(t *testing.T, tarball []byte, integrity string) *registry {
	t.Helper()
	tarURL := "https://registry.npmjs.org/@glw907/cairn-cms/-/cairn-cms-" + testVersion + ".tgz"
	doc := map[string]any{
		"dist-tags": map[string]string{"latest": "0.98.0", "next": testVersion},
		"versions": map[string]any{
			"0.98.0":    map[string]any{"dist": map[string]string{"tarball": "https://registry.npmjs.org/old.tgz", "integrity": "sha512-AAAA"}},
			testVersion: map[string]any{"dist": map[string]string{"tarball": tarURL, "integrity": integrity}},
		},
	}
	raw, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}
	return &registry{t: t, packument: string(raw), tarball: tarball, tarURL: tarURL}
}

func (r *registry) RoundTrip(req *http.Request) (*http.Response, error) {
	r.requests = append(r.requests, req.URL.String())
	respond := func(status int, body []byte) (*http.Response, error) {
		return &http.Response{
			StatusCode: status,
			Header:     http.Header{},
			Body:       readCloser{bytes.NewReader(body)},
			Request:    req,
		}, nil
	}
	switch req.URL.String() {
	case engineDoc:
		return respond(200, []byte(r.packument))
	case r.tarURL:
		return respond(200, r.tarball)
	}
	return respond(404, nil)
}

type readCloser struct{ *bytes.Reader }

func (readCloser) Close() error { return nil }

// fetchOK fetches the template of tarball served as testVersion.
func fetchOK(t *testing.T, tarball []byte) *Template {
	t.Helper()
	reg := newRegistry(t, tarball, integrityOf(tarball))
	tpl, err := NewFetcher(reg).Fetch(t.Context(), "next")
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	return tpl
}

// testSite is a complete, valid Site.
func testSite() Site {
	return Site{
		Name:           "My Café: The Site!",
		Repository:     "my-caf-the-site",
		Worker:         "my-caf-the-site",
		Database:       "my-caf-the-site-auth",
		Bucket:         "my-caf-the-site-media",
		DatabaseID:     "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
		AccountID:      "0123456789abcdef0123456789abcdef",
		Address:        "blog.example.test",
		EmailFrom:      "no-reply@example.test",
		Posture:        Invite,
		Owner:          "octo-owner",
		Repo:           "my-caf-the-site",
		DefaultBranch:  "trunk",
		AppID:          "424242",
		InstallationID: "737373",
	}
}

func testCommit() Commit {
	return Commit{AuthorName: "Cairn Setup", AuthorEmail: "setup@cairn.invalid", Message: "Create the site"}
}

// scaffoldOK scaffolds the real template into a fresh folder and returns it.
func scaffoldOK(t *testing.T, site Site) (string, Result) {
	t.Helper()
	tpl := fetchOK(t, tarballOf(t, templateFiles(t)))
	dir := filepath.Join(t.TempDir(), "site")
	res, err := Scaffold(t.Context(), Config{Template: tpl, Site: site, Commit: testCommit(), Dir: dir})
	if err != nil {
		t.Fatalf("Scaffold: %v", err)
	}
	return dir, res
}

func readFile(t *testing.T, dir, rel string) string {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(dir, filepath.FromSlash(rel)))
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}
