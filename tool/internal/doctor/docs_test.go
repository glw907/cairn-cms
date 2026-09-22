package doctor

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// referenceDir is where the published pages this package is pinned to live, relative to the
// repository root. They sit in the engine's own reference arm, which the npm tarball carries.
const referenceDir = "docs/reference"

// readPage reads one published page under referenceDir, resolving it through
// providers.RepoRoot rather than climbing out of this package with a relative path.
func readPage(t *testing.T, name string) string {
	t.Helper()
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}
	data, err := os.ReadFile(filepath.Join(root, referenceDir, name))
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

// TestBothPublishedPagesNameEveryCheckID holds the two pages that publish cairn doctor's check
// ids to the registry itself: cli-cairn-json-output.md's frozen list, where an id is a promise
// a consumer reads, and cli-cairn-doctor.md, where an operator reads what each id observes.
// Both are read from checks rather than from a literal list, so a check added or renamed
// without its docs fails here.
//
// It lives in this package rather than beside internal/render's own freeze-list test because
// internal/doctor imports internal/render for DoctorSchemaVersion, which makes a render test
// file importing this package an import cycle Go rejects.
func TestBothPublishedPagesNameEveryCheckID(t *testing.T) {
	frozen := frozenSection(t, readPage(t, "cli-cairn-json-output.md"))
	page := readPage(t, "cli-cairn-doctor.md")

	for _, c := range checks {
		t.Run(c.ID, func(t *testing.T) {
			if !strings.Contains(frozen, "`"+c.ID+"`") {
				t.Errorf("cli-cairn-json-output.md's frozen list does not name %q", c.ID)
			}
			if !strings.Contains(page, "`"+c.ID+"`") {
				t.Errorf("cli-cairn-doctor.md does not name %q", c.ID)
			}
		})
	}
}

// frozenSection returns cli-cairn-json-output.md's "What freezes at 1.0" section alone. A check
// id named anywhere else on the page is not the promise this test is about.
func frozenSection(t *testing.T, doc string) string {
	t.Helper()
	start, end := strings.Index(doc, "## What freezes at 1.0"), strings.Index(doc, "## What does not freeze")
	if start < 0 || end < start {
		t.Fatal("cli-cairn-json-output.md carries no freeze-list section")
	}
	return doc[start:end]
}

// TestTheCommandPageNamesTheThreeWaysToExitThree holds cli-cairn-doctor.md to the one exit code
// a caller cannot switch on: 3 covers a usage error, a run whose only non-passing results are
// unknown, and a directory that is not a cairn site.
func TestTheCommandPageNamesTheThreeWaysToExitThree(t *testing.T) {
	page := readPage(t, "cli-cairn-doctor.md")
	for _, phrase := range []string{"usage error", "`UNCHECKED`", "not a cairn-cms site"} {
		if !strings.Contains(page, phrase) {
			t.Errorf("cli-cairn-doctor.md does not name %q as a way to exit 3", phrase)
		}
	}
}
