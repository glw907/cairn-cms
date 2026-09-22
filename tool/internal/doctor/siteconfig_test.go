package doctor

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// showcaseSiteConfig reads the showcase's own committed site.config.yaml, the corpus's one
// real-world case.
func showcaseSiteConfig(t *testing.T) []byte {
	t.Helper()
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}
	body, err := os.ReadFile(filepath.Join(root, "examples", "showcase", "src", "theme", "site.config.yaml"))
	if err != nil {
		t.Fatalf("read showcase site.config.yaml: %v", err)
	}
	return body
}

// TestSiteConfigFindsAtEveryCandidatePath proves the five found cases: the showcase's own
// committed config at the canonical path, and a minimal valid config at each of the three legacy
// paths.
func TestSiteConfigFindsAtEveryCandidatePath(t *testing.T) {
	showcase := showcaseSiteConfig(t)
	tests := []struct {
		name string
		path string
		body []byte
	}{
		{name: "the showcase's committed config at the canonical path", path: siteConfigPath(), body: showcase},
		{name: "legacy path: site.config.yaml", path: "site.config.yaml", body: []byte("siteName: Legacy Root\n")},
		{name: "legacy path: src/lib/site.config.yaml", path: "src/lib/site.config.yaml", body: []byte("siteName: Legacy Lib\n")},
		{name: "legacy path: src/site.config.yaml", path: "src/site.config.yaml", body: []byte("siteName: Legacy Src\n")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, map[string]string{tt.path: string(tt.body)})
			outcome, err := s.siteConfig()
			if err != nil {
				t.Fatalf("SiteConfig: %v", err)
			}
			if outcome.Status != siteConfigValid {
				t.Fatalf("Status = %v, want siteConfigValid (reason %q)", outcome.Status, outcome.Reason)
			}
			if outcome.Path != tt.path {
				t.Errorf("Path = %q, want %q", outcome.Path, tt.path)
			}
		})
	}
}

// TestSiteConfigInvalidCases proves the three predicate failures at the canonical path: a file
// that is not YAML, a file whose root is a sequence rather than a mapping, and a file with an
// empty siteName. None satisfies the predicate.
func TestSiteConfigInvalidCases(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "not YAML", body: "{not: yaml: [\n"},
		{name: "sequence root", body: "- one\n- two\n"},
		{name: "empty siteName", body: "siteName: \"\"\n"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, map[string]string{siteConfigPath(): tt.body})
			outcome, err := s.siteConfig()
			if err != nil {
				t.Fatalf("SiteConfig: %v", err)
			}
			if outcome.Status != siteConfigInvalid {
				t.Fatalf("Status = %v, want siteConfigInvalid", outcome.Status)
			}
			if outcome.Reason == "" {
				t.Error("Reason is empty for an invalid outcome")
			}
		})
	}
}

// TestSiteConfigNotFound proves the not-found outcome: a directory with no file at any of the
// four candidate paths.
func TestSiteConfigNotFound(t *testing.T) {
	s := snapshotWithFiles(t, nil)
	outcome, err := s.siteConfig()
	if err != nil {
		t.Fatalf("SiteConfig: %v", err)
	}
	if outcome.Status != siteConfigNotFound {
		t.Fatalf("Status = %v, want siteConfigNotFound", outcome.Status)
	}
	if outcome.Path != "" {
		t.Errorf("Path = %q, want empty", outcome.Path)
	}
}
