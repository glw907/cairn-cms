package providers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestRepoRootFromFindsCairnCmsRoot walks up from this test file's own directory (three levels
// under the repository root) and asserts the resolved directory really holds the engine's
// package.json.
func TestRepoRootFromFindsCairnCmsRoot(t *testing.T) {
	here, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	root, err := repoRootFrom(here)
	if err != nil {
		t.Fatalf("repoRootFrom: unexpected failure: %v", err)
	}
	data, err := os.ReadFile(filepath.Join(root, "package.json"))
	if err != nil {
		t.Fatalf("read %s/package.json: %v", root, err)
	}
	var pkg struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		t.Fatal(err)
	}
	if pkg.Name != "@glw907/cairn-cms" {
		t.Errorf("resolved root's package.json name = %q, want @glw907/cairn-cms", pkg.Name)
	}
}

// TestRepoRootFromNamesExtractionTriggerWhenNotFound walks up from a fresh temp directory, which
// carries no package.json all the way to the filesystem root, and asserts the returned error
// names corpusExtractionTrigger rather than a bare "not found".
func TestRepoRootFromNamesExtractionTriggerWhenNotFound(t *testing.T) {
	tmp := t.TempDir()
	_, err := repoRootFrom(tmp)
	if err == nil {
		t.Fatal("repoRootFrom: want an error walking up from a directory with no cairn-cms package.json")
	}
	if !strings.Contains(err.Error(), corpusExtractionTrigger) {
		t.Errorf("error = %q, want it to contain %q", err, corpusExtractionTrigger)
	}
}

// TestCorpusReadsRealFixture asserts Corpus resolves a real fixture and strips the provenance
// wrapper, returning the captured status and the bare body bytes.
func TestCorpusReadsRealFixture(t *testing.T) {
	status, body, err := Corpus("cloudflare", "zone.not-found.404.json")
	if err != nil {
		t.Fatal(err)
	}
	if status != 404 {
		t.Errorf("status = %d, want 404", status)
	}
	var parsed struct {
		Success bool `json:"success"`
		Errors  []struct {
			Code int `json:"code"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatal(err)
	}
	if parsed.Success {
		t.Error("body.success = true, want false for a not-found fixture")
	}
	if len(parsed.Errors) == 0 || parsed.Errors[0].Code != 1001 {
		t.Errorf("body.errors[0].code = %v, want 1001", parsed.Errors)
	}
}
