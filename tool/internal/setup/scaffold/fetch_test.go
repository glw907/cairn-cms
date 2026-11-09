package scaffold

import (
	"archive/tar"
	"errors"
	"net/http"
	"strings"
	"testing"
)

func TestFetchResolvesTagAndCarriesVersionAndIntegrity(t *testing.T) {
	tarball := tarballOf(t, map[string]string{"catalog.json": "{}", "waymark/package.json": "{}"})
	reg := newRegistry(t, tarball, integrityOf(tarball))

	tpl, err := NewFetcher(reg).Fetch(t.Context(), "next")
	if err != nil {
		t.Fatalf("Fetch(next): %v", err)
	}
	if tpl.Version != testVersion {
		t.Errorf("Version = %q, want %q", tpl.Version, testVersion)
	}
	if tpl.Integrity != integrityOf(tarball) {
		t.Errorf("Integrity = %q, want the tarball's digest", tpl.Integrity)
	}

	// "latest" is another version, listed with an unusable digest: the default tag must reach
	// it, so the failure names that version.
	_, err = NewFetcher(reg).Fetch(t.Context(), "")
	if err == nil || !strings.Contains(err.Error(), "0.98.0") {
		t.Errorf("Fetch(default) error = %v, want the latest version's", err)
	}
	if _, err := NewFetcher(reg).Fetch(t.Context(), "nosuch"); err == nil {
		t.Error("Fetch(nosuch) succeeded, want an unknown dist-tag error")
	}
}

func TestFetchVersionRefusesAChangedIntegrity(t *testing.T) {
	tarball := tarballOf(t, map[string]string{"waymark/a": "x"})
	reg := newRegistry(t, tarball, integrityOf(tarball))
	if _, err := NewFetcher(reg).FetchVersion(t.Context(), testVersion, integrityOf(tarball)); err != nil {
		t.Fatalf("FetchVersion with the recorded integrity: %v", err)
	}
	if _, err := NewFetcher(reg).FetchVersion(t.Context(), testVersion, "sha512-other"); err == nil {
		t.Error("FetchVersion accepted an integrity that differs from the recorded one")
	}
}

func TestDigestMismatchFailsOnceWithoutRetry(t *testing.T) {
	tarball := tarballOf(t, map[string]string{"waymark/a": "x"})
	reg := newRegistry(t, tarball, integrityOf([]byte("some other tarball")))

	_, err := NewFetcher(reg).Fetch(t.Context(), "next")
	if !errors.Is(err, ErrIntegrity) {
		t.Fatalf("Fetch error = %v, want ErrIntegrity", err)
	}
	tarGets := 0
	for _, u := range reg.requests {
		if u == reg.tarURL {
			tarGets++
		}
	}
	if tarGets != 1 {
		t.Errorf("tarball requested %d times, want 1 (a mismatch is never retried)", tarGets)
	}
}

func TestFetchRefusesAnIntegrityWithoutSHA512(t *testing.T) {
	tarball := tarballOf(t, map[string]string{"waymark/a": "x"})
	reg := newRegistry(t, tarball, "sha1-2jmj7l5rSw0yVb/vlWAYkK/YBwI=")
	if _, err := NewFetcher(reg).Fetch(t.Context(), "next"); err == nil {
		t.Error("Fetch accepted a version with no sha512 digest")
	}
}

func TestUnsafeEntriesFailTheFetch(t *testing.T) {
	ok := tarEntry{name: "package/template/waymark/ok.txt", body: "fine"}
	tests := []struct {
		name  string
		entry tarEntry
	}{
		{"climbs out", tarEntry{name: "package/template/../../evil.txt", body: "x"}},
		{"climbs out below a folder", tarEntry{name: "package/template/waymark/../../../evil.txt", body: "x"}},
		{"absolute", tarEntry{name: "package/template//etc/passwd", body: "x"}},
		{"backslash", tarEntry{name: `package/template/waymark\..\evil.txt`, body: "x"}},
		{"symlink", tarEntry{name: "package/template/waymark/link", typeflag: tar.TypeSymlink, link: "/etc/passwd"}},
		{"hard link", tarEntry{name: "package/template/waymark/hard", typeflag: tar.TypeLink, link: "package/package.json"}},
		{"fifo", tarEntry{name: "package/template/waymark/pipe", typeflag: tar.TypeFifo}},
		{"file below a file", tarEntry{name: "package/template/waymark/ok.txt/inner", body: "x"}},
		{"a .git folder", tarEntry{name: "package/template/waymark/.git/config", body: "[core]\n\tfsmonitor = evil\n"}},
		{"a .GIT folder", tarEntry{name: "package/template/waymark/.GIT/hooks/post-checkout", body: "x"}},
		{"a .git file", tarEntry{name: "package/template/.git", body: "gitdir: /elsewhere\n"}},
		{"a .git directory entry", tarEntry{name: "package/template/waymark/sub/.Git/", typeflag: tar.TypeDir}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tarball := makeTarball(t, []tarEntry{ok, tt.entry})
			reg := newRegistry(t, tarball, integrityOf(tarball))
			_, err := NewFetcher(reg).Fetch(t.Context(), "next")
			if !errors.Is(err, ErrUnsafeEntry) {
				t.Fatalf("Fetch error = %v, want ErrUnsafeEntry", err)
			}
		})
	}
}

// TestNamesThatOnlyStartWithGitAreKept pins that the .git refusal matches a whole path segment.
func TestNamesThatOnlyStartWithGitAreKept(t *testing.T) {
	tarball := makeTarball(t, []tarEntry{
		{name: "package/template/waymark/.github/workflows/deploy.yml", body: "on: push\n"},
		{name: "package/template/waymark/.gitignore", body: "node_modules\n"},
		{name: "package/template/waymark/notes.git/a", body: "x"},
	})
	reg := newRegistry(t, tarball, integrityOf(tarball))
	tpl, err := NewFetcher(reg).Fetch(t.Context(), "next")
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if len(tpl.entries) != 3 {
		t.Errorf("extracted %d entries, want all 3", len(tpl.entries))
	}
}

func TestEntriesOutsideTheTemplateAreIgnored(t *testing.T) {
	tarball := makeTarball(t, []tarEntry{
		{name: "package/template/waymark/ok.txt", body: "fine"},
		{name: "package/dist/link", typeflag: tar.TypeSymlink, link: "/etc/passwd"},
		{name: "package/other/../../x", body: "not ours"},
	})
	reg := newRegistry(t, tarball, integrityOf(tarball))
	tpl, err := NewFetcher(reg).Fetch(t.Context(), "next")
	if err != nil {
		t.Fatalf("Fetch: %v", err)
	}
	if len(tpl.entries) != 1 {
		t.Errorf("extracted %d entries, want only the template's one", len(tpl.entries))
	}
}

func TestFetchSendsOnlyToTheRegistryAndFollowsNoRedirect(t *testing.T) {
	tarball := tarballOf(t, map[string]string{"waymark/a": "x"})
	reg := newRegistry(t, tarball, integrityOf(tarball))
	reg.tarURL = "https://evil.example/cairn-cms.tgz"
	reg.packument = strings.Replace(reg.packument,
		"https://registry.npmjs.org/@glw907/cairn-cms/-/cairn-cms-"+testVersion+".tgz", reg.tarURL, 1)
	if _, err := NewFetcher(reg).Fetch(t.Context(), "next"); err == nil {
		t.Error("Fetch downloaded from a host other than the registry")
	}
	for _, u := range reg.requests {
		if strings.Contains(u, "evil.example") {
			t.Errorf("a request reached %s", u)
		}
	}

	redirect := roundTripFunc(func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusFound,
			Header:     http.Header{"Location": {"https://evil.example/"}},
			Body:       http.NoBody,
			Request:    req,
		}, nil
	})
	if _, err := NewFetcher(redirect).Fetch(t.Context(), "next"); err == nil {
		t.Error("Fetch followed or accepted a redirect")
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }

func TestCatalogDecodesEntriesWithExtraFields(t *testing.T) {
	catalog := `{"themes":[
	  {"id":"waymark","name":"Waymark","description":"Neutral.","path":"waymark",
	   "preview":"https://example.test/p.png","tags":["a","b"],"nested":{"x":1}},
	  {"id":"second","name":"Second","description":"Other.","path":"second","tier":2}
	]}`
	tpl := fetchOK(t, tarballOf(t, map[string]string{
		"catalog.json": catalog,
		"waymark/a":    "x",
		"second/b":     "y",
	}))
	themes, err := tpl.Catalog()
	if err != nil {
		t.Fatalf("Catalog: %v", err)
	}
	if len(themes) != 2 || themes[0].ID != "waymark" || themes[1].Path != "second" || themes[1].Name != "Second" {
		t.Errorf("themes = %+v", themes)
	}
}

func TestCatalogRefusesBadEntries(t *testing.T) {
	tests := []struct{ name, catalog string }{
		{"escaping path", `{"themes":[{"id":"a","path":"../x"}]}`},
		{"missing directory", `{"themes":[{"id":"a","path":"nothere"}]}`},
		{"repeated id", `{"themes":[{"id":"a","path":"waymark"},{"id":"a","path":"waymark"}]}`},
		{"empty", `{"themes":[]}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tpl := fetchOK(t, tarballOf(t, map[string]string{"catalog.json": tt.catalog, "waymark/a": "x"}))
			if _, err := tpl.Catalog(); err == nil {
				t.Error("Catalog accepted it")
			}
		})
	}
}
