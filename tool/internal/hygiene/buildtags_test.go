// Package hygiene holds repo-wide invariants for the tool module that no
// single package's own tests can see.
package hygiene

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// TestNoBuildTags asserts no .go file under the tool module carries a
// //go:build line. The module ships no platform-specific behavior gated by
// build tags; GOOS filename suffixes are the only mechanism it uses.
func TestNoBuildTags(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	// thisFile is tool/internal/hygiene/buildtags_test.go; walk from the
	// module root three directories up.
	root := filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(thisFile))))

	var offenders []string
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if d.Name() == ".git" {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") || path == thisFile {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if strings.Contains(string(data), "//go:build") {
			rel, relErr := filepath.Rel(root, path)
			if relErr != nil {
				rel = path
			}
			offenders = append(offenders, rel)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", root, err)
	}
	if len(offenders) > 0 {
		t.Errorf("found //go:build lines, not permitted under tool/: %v", offenders)
	}
}
