package doctor

import (
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"
	"testing"
)

// TestFourEngineSymbolsAppearInDocComments proves the package's doc comments name the four
// engine symbols the check:tool-heuristics tripwire scans for: CairnAdminShell and .shellLoad
// from admin.mount-shape's heuristic, createAuthGuard and checkOrigin: false from
// config.csrf-disable's. Reads every non-test .go file's comments directly with go/parser,
// rather than trusting a single hand-picked doc comment, so the assertion survives a symbol
// moving to a different file's comment.
func TestFourEngineSymbolsAppearInDocComments(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatalf("glob *.go: %v", err)
	}
	var allComments strings.Builder
	fset := token.NewFileSet()
	for _, name := range files {
		if strings.HasSuffix(name, "_test.go") {
			continue
		}
		f, err := parser.ParseFile(fset, name, nil, parser.ParseComments)
		if err != nil {
			t.Fatalf("parse %s: %v", name, err)
		}
		for _, group := range f.Comments {
			allComments.WriteString(group.Text())
			allComments.WriteByte('\n')
		}
	}
	text := allComments.String()

	symbols := []string{"CairnAdminShell", ".shellLoad", "createAuthGuard", "checkOrigin: false"}
	for _, symbol := range symbols {
		if !strings.Contains(text, symbol) {
			t.Errorf("package doc comments do not mention %q, want check:tool-heuristics to find it here", symbol)
		}
	}
}
