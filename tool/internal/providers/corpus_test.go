package providers

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// fakeTB is a minimal testing.TB stand-in that records a Fatalf call instead of aborting this
// test's own process, so repoRootFrom's failure path can be asserted directly.
type fakeTB struct {
	testing.TB
	fatal string
}

// fatalAbort unwinds fakeTB.Fatalf's panic once repoRootFrom's own t.Fatalf fires, distinct from
// a panic a real bug in repoRootFrom would raise.
type fatalAbort struct{}

func (f *fakeTB) Helper() {}

func (f *fakeTB) Fatalf(format string, args ...any) {
	f.fatal = fmt.Sprintf(format, args...)
	panic(fatalAbort{})
}

// callRepoRootFrom runs repoRootFrom against a fakeTB, recovering the panic fakeTB.Fatalf raises
// so the caller can inspect the recorded message instead of the test aborting.
func callRepoRootFrom(ft *fakeTB, start string) (root string, panicked bool) {
	defer func() {
		if r := recover(); r != nil {
			if _, ok := r.(fatalAbort); !ok {
				panic(r)
			}
			panicked = true
		}
	}()
	return repoRootFrom(ft, start), false
}

// TestRepoRootFromFindsCairnCmsRoot walks up from this test file's own directory (three levels
// under the repository root) and asserts the resolved directory really holds the engine's
// package.json.
func TestRepoRootFromFindsCairnCmsRoot(t *testing.T) {
	ft := &fakeTB{}
	here, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	root, panicked := callRepoRootFrom(ft, here)
	if panicked {
		t.Fatalf("repoRootFrom: unexpected failure: %s", ft.fatal)
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
// carries no package.json all the way to the filesystem root, and asserts the failure message
// names corpusExtractionTrigger rather than a bare "not found".
func TestRepoRootFromNamesExtractionTriggerWhenNotFound(t *testing.T) {
	tmp := t.TempDir()
	ft := &fakeTB{}
	_, panicked := callRepoRootFrom(ft, tmp)
	if !panicked {
		t.Fatal("repoRootFrom: want a failure walking up from a directory with no cairn-cms package.json")
	}
	if !strings.Contains(ft.fatal, corpusExtractionTrigger) {
		t.Errorf("failure message = %q, want it to contain %q", ft.fatal, corpusExtractionTrigger)
	}
}

// TestCorpusReadsRealFixture asserts Corpus resolves a real fixture and strips the provenance
// wrapper, returning the captured status and the bare body bytes.
func TestCorpusReadsRealFixture(t *testing.T) {
	status, body := Corpus(t, "cloudflare", "zone.not-found.404.json")
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
