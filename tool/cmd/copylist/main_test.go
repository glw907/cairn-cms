package main

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strconv"
	"strings"
	"testing"
)

// TestRenderMatchesCommittedGolden asserts a fresh render() equals the committed
// tool/testdata/copy.golden.md, so a new operator-facing string cannot land invisibly: it shows
// up as a one-line diff in review (tool/docs/design/copy-standard.md section 4.3). Run
// `make copy-list` and commit the diff when this test fails for a real reason.
func TestRenderMatchesCommittedGolden(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	goldenPath := filepath.Join(filepath.Dir(thisFile), "..", "..", "testdata", "copy.golden.md")

	committed, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read %s: %v", goldenPath, err)
	}
	if got, want := render(), string(committed); got != want {
		t.Errorf("render() does not match %s; run `make copy-list` and commit the diff.\ngot:\n%s\nwant:\n%s", goldenPath, got, want)
	}
}

// TestCataloguesAreSortedAndDeduplicated asserts every package's own catalogue is sorted with no
// repeated entry, the shape `make copy-list`'s output and the committed golden both depend on for
// a stable, reviewable diff.
func TestCataloguesAreSortedAndDeduplicated(t *testing.T) {
	for _, pkg := range catalogues() {
		if len(pkg.entries) == 0 {
			t.Errorf("package %q carries no entries", pkg.name)
		}
		if !slices.IsSorted(pkg.entries) {
			t.Errorf("package %q entries are not sorted: %v", pkg.name, pkg.entries)
		}
		seen := make(map[string]bool, len(pkg.entries))
		for _, e := range pkg.entries {
			if seen[e] {
				t.Errorf("package %q carries a duplicate entry: %q", pkg.name, e)
			}
			seen[e] = true
		}
	}
}

// TestCheckDoesNotDependOnCopyReview asserts the Makefile's own `check` target never acquires a
// dependency on `copy-review`: copy-review runs tellgrader, a Linux-only binary, and
// .github/workflows/tool.yml runs `make -C tool check` on macOS and Windows runners too, where
// that dependency would hard-fail rather than skip (tool/docs/design/copy-standard.md section
// 4.5's own rule for keeping the editorial aid out of CI).
func TestCheckDoesNotDependOnCopyReview(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	makefilePath := filepath.Join(filepath.Dir(thisFile), "..", "..", "Makefile")
	data, err := os.ReadFile(makefilePath)
	if err != nil {
		t.Fatalf("read %s: %v", makefilePath, err)
	}

	for line := range strings.SplitSeq(string(data), "\n") {
		if strings.HasPrefix(line, "check:") && strings.Contains(line, "copy-review") {
			t.Errorf("Makefile's check target names copy-review as a dependency: %q", line)
		}
	}
}

// TestNoCmdCairnFileImportsCopylist asserts cmd/copylist has no non-test importer under
// cmd/cairn, so this binary can never enter the shipped `cairn` binary. copylist is itself
// `package main`, which Go's own compiler already refuses to import; this test is the standing
// proof of that refusal, so a later restructuring that changed copylist's package name would
// still be caught here rather than by a compiler error nobody reads as a policy statement.
func TestNoCmdCairnFileImportsCopylist(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	cairnDir := filepath.Join(filepath.Dir(filepath.Dir(thisFile)), "cairn")
	entries, err := os.ReadDir(cairnDir)
	if err != nil {
		t.Fatalf("read %s: %v", cairnDir, err)
	}

	fset := token.NewFileSet()
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") || strings.HasSuffix(entry.Name(), "_test.go") {
			continue
		}
		path := filepath.Join(cairnDir, entry.Name())
		f, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
		if err != nil {
			t.Fatalf("parse %s: %v", path, err)
		}
		for _, imp := range f.Imports {
			importPath, err := strconv.Unquote(imp.Path.Value)
			if err != nil {
				t.Fatalf("unquote import in %s: %v", path, err)
			}
			if strings.Contains(importPath, "cmd/copylist") {
				t.Errorf("%s imports %s; cmd/copylist must never enter the shipped binary", entry.Name(), importPath)
			}
		}
	}
}
