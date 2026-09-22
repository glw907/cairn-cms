package doctor

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// wranglerFactsCase is one committed corpus case's expected facts, the literal JSON copied from
// the named TypeScript assertion's own expect() call. Only the fields a ported check reads are
// present (see WranglerFacts's own doc comment for what is deliberately not ported).
type wranglerFactsCase struct {
	HasEmailBinding      bool     `json:"hasEmailBinding"`
	HasAuthDB            bool     `json:"hasAuthDb"`
	ObservabilityEnabled bool     `json:"observabilityEnabled"`
	HasPublicOrigin      bool     `json:"hasPublicOrigin"`
	PublicOrigin         string   `json:"publicOrigin"`
	R2Buckets            []string `json:"r2Buckets"`
}

// wranglerCorpusCase is one committed case file under testdata/corpus/wrangler: the input files
// to write into a temp directory, the file:line of the TypeScript test it was lifted from, and
// either the expected facts or the expected clean error message.
type wranglerCorpusCase struct {
	Name       string            `json:"name"`
	SourceTest string            `json:"sourceTest"`
	Files      map[string]string `json:"files"`
	Found      bool              `json:"found"`
	Facts      wranglerFactsCase `json:"facts"`
	WantError  string            `json:"wantError"`
}

// loadWranglerCorpus reads every case file under testdata/corpus/wrangler, failing the test if
// the directory is empty or a file fails to parse: a corpus that silently shrank to zero cases
// would otherwise pass this test while proving nothing.
func loadWranglerCorpus(t *testing.T) []wranglerCorpusCase {
	t.Helper()
	entries, err := os.ReadDir("testdata/corpus/wrangler")
	if err != nil {
		t.Fatalf("read corpus dir: %v", err)
	}
	var cases []wranglerCorpusCase
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		body, err := os.ReadFile(filepath.Join("testdata/corpus/wrangler", entry.Name()))
		if err != nil {
			t.Fatalf("read %s: %v", entry.Name(), err)
		}
		var c wranglerCorpusCase
		if err := json.Unmarshal(body, &c); err != nil {
			t.Fatalf("parse %s: %v", entry.Name(), err)
		}
		if c.SourceTest == "" && c.WantError == "" {
			t.Fatalf("%s: every corpus case must name the TypeScript test it was lifted from", entry.Name())
		}
		cases = append(cases, c)
	}
	if len(cases) == 0 {
		t.Fatal("corpus dir testdata/corpus/wrangler holds no cases")
	}
	return cases
}

// snapshotWithFiles builds a resolved temp directory holding files, and returns the Snapshot a
// check would read it through. A name carrying a directory separator gets its parent directory
// created first, so a case can write a nested path like "src/theme/site.config.yaml".
func snapshotWithFiles(t *testing.T, files map[string]string) Snapshot {
	t.Helper()
	dir := resolvedTempDir(t)
	for name, body := range files {
		target := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			t.Fatalf("mkdir for %s: %v", name, err)
		}
		if err := os.WriteFile(target, []byte(body), 0o644); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}
	return Snapshot{Dir: dir}
}

// buildSymlinkedNodeModulesDir builds a temp directory whose node_modules entry is a symlink
// resolving outside the directory, the pnpm and npm-workspace monorepo layout
// config.dependency-floors's containment refusal must recognize. Built at test time rather than
// committed, since git cannot commit a symlink pointing outside the repository. Returns the
// resolved site directory (not the symlink target).
func buildSymlinkedNodeModulesDir(t *testing.T) string {
	t.Helper()
	root := resolvedTempDir(t)
	site := filepath.Join(root, "site")
	realNodeModules := filepath.Join(root, "real-node-modules")
	for _, d := range []string{site, realNodeModules} {
		if err := os.Mkdir(d, 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", d, err)
		}
	}
	if err := os.Symlink(realNodeModules, filepath.Join(site, "node_modules")); err != nil {
		t.Fatalf("symlink node_modules: %v", err)
	}
	return site
}

// TestBuildSymlinkedNodeModulesDirEscapesContainment proves the builder's own shape: a read
// through the site's node_modules resolves outside the site directory, the pnpm and
// npm-workspace monorepo layout Task 5's config.dependency-floors must recognize and report as
// unchecked rather than crash on.
func TestBuildSymlinkedNodeModulesDirEscapesContainment(t *testing.T) {
	site := buildSymlinkedNodeModulesDir(t)
	if err := os.WriteFile(filepath.Join(filepath.Dir(site), "real-node-modules", "package.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("write package.json: %v", err)
	}
	_, _, err := ReadUnder(site, "node_modules/package.json")
	if err == nil {
		t.Fatal("ReadUnder through the symlinked node_modules did not refuse containment")
	}
}
