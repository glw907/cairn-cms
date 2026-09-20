package providers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// corpusExtractionTrigger names the fixture corpus's own retirement condition
// (packages/create-cairn-site/fixtures/README.md, "When this corpus moves"), quoted in a
// RepoRoot failure so a reader sees why the walk failed rather than a bare "file not found".
const corpusExtractionTrigger = "the fixture corpus moves with the Go tool on the day it leaves this repository (packages/create-cairn-site/fixtures/README.md)"

// RepoRoot walks up from the calling test file's own directory to the repository root, the
// directory holding a package.json whose "name" is "@glw907/cairn-cms", and fails t naming
// corpusExtractionTrigger when none is found.
func RepoRoot(t testing.TB) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(1)
	if !ok {
		t.Fatal("providers: resolve caller's source file")
		return ""
	}
	return repoRootFrom(t, filepath.Dir(thisFile))
}

// repoRootFrom is RepoRoot's walk, factored out so a test can drive it from a directory of its
// own choosing instead of the real caller's location.
func repoRootFrom(t testing.TB, start string) string {
	t.Helper()
	dir := start
	for {
		if name, err := packageJSONName(filepath.Join(dir, "package.json")); err == nil && name == "@glw907/cairn-cms" {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatalf("providers: no package.json named \"@glw907/cairn-cms\" found walking up from %s; %s", start, corpusExtractionTrigger)
			return ""
		}
		dir = parent
	}
}

// packageJSONName reads a package.json's "name" field, or returns an error for a missing or
// unparseable file.
func packageJSONName(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var pkg struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return "", err
	}
	return pkg.Name, nil
}

// Corpus reads one fixture from the extraction corpus at
// packages/create-cairn-site/fixtures/<provider>/<name>, resolved through RepoRoot, and returns
// the captured HTTP status alongside the raw "body" bytes, stripped of the
// {"provenance": ..., "body": ...} wrapper every fixture file carries, so a caller's
// json.Unmarshal target never needs to know about provenance.
func Corpus(t testing.TB, provider, name string) (status int, body []byte) {
	t.Helper()
	root := RepoRoot(t)
	path := filepath.Join(root, "packages", "create-cairn-site", "fixtures", provider, name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("providers: read fixture %s: %v", path, err)
		return 0, nil
	}
	var wrapper struct {
		Provenance struct {
			Status int `json:"status"`
		} `json:"provenance"`
		Body json.RawMessage `json:"body"`
	}
	if err := json.Unmarshal(data, &wrapper); err != nil {
		t.Fatalf("providers: parse fixture %s: %v", path, err)
		return 0, nil
	}
	return wrapper.Provenance.Status, wrapper.Body
}
