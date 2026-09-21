package hygiene

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// moduleRoot resolves the tool module's root directory the same way buildtags_test.go and
// identicalfiles_test.go do, from thisFile's own path, so all three hygiene tests agree on what
// "under tool/" means.
func moduleRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	root := filepath.Dir(filepath.Dir(filepath.Dir(thisFile)))
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		t.Fatalf("resolved root %s has no go.mod: %v", root, err)
	}
	if filepath.Base(root) != "tool" {
		t.Fatalf("resolved root %s, want a directory named tool", root)
	}
	return root
}

// grepModuleExcludingSpine walks every .go file under root except internal/spine and this file
// itself, and reports the relative paths of files whose content contains needle.
func grepModuleExcludingSpine(t *testing.T, root, needle, skipFile string) []string {
	t.Helper()
	var offenders []string
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if d.Name() == ".git" {
				return filepath.SkipDir
			}
			if filepath.Base(path) == "spine" && filepath.Base(filepath.Dir(path)) == "internal" {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") {
			return nil
		}
		rel, relErr := filepath.Rel(root, path)
		if relErr != nil {
			rel = path
		}
		if filepath.ToSlash(rel) == skipFile {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if strings.Contains(string(data), needle) {
			offenders = append(offenders, rel)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", root, err)
	}
	return offenders
}

// TestOneSeverityTable asserts exactly one ordering of the three spine.State values, or of an
// equivalent exit-level ranking, exists under tool/: spine.State.Severity. It goes red the moment
// a second precedence table (a probe-token-shaped precedenceRank/combineLevel pair) reappears in
// any other package.
func TestOneSeverityTable(t *testing.T) {
	root := moduleRoot(t)
	for _, needle := range []string{"precedenceRank", "combineLevel"} {
		if offenders := grepModuleExcludingSpine(t, root, needle, "internal/hygiene/severity_test.go"); len(offenders) > 0 {
			t.Errorf("found %q outside internal/spine, a second severity ordering: %v", needle, offenders)
		}
	}
}

// TestOneReasonToOutcomeTranslation asserts exactly one translation from a classified
// providers.Reason to a verdict exists under tool/: spine.ReasonToOutcome. It goes red the moment
// another file switches on a providers.Reason value, or reintroduces a reasonLevel-shaped
// function outside spine: a second translation with no test naming it as the duplicate it is.
func TestOneReasonToOutcomeTranslation(t *testing.T) {
	root := moduleRoot(t)
	if offenders := grepModuleExcludingSpine(t, root, "reasonLevel", "internal/hygiene/severity_test.go"); len(offenders) > 0 {
		t.Errorf("found %q outside internal/spine, a second reason-to-outcome translation: %v", "reasonLevel", offenders)
	}
	if offenders := grepModuleExcludingSpine(t, root, "case providers.Reason", "internal/hygiene/severity_test.go"); len(offenders) > 0 {
		t.Errorf("found a switch case on a providers.Reason value outside internal/spine: %v", offenders)
	}
}
