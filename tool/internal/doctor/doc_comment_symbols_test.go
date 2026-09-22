package doctor

import (
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"
	"testing"
)

// TestFourEngineSymbolsAppearInDocComments proves the package's doc comments name the four
// engine symbols the check:tool-heuristics tripwire scans for. That scanner is written by the
// doctor-retirement pass that removes the engine's own cairn-doctor; this test is what keeps
// the four names findable here until it lands. The four: CairnAdminShell and .shellLoad from
// admin.mount-shape's heuristic,
// createAuthGuard and checkOrigin: false from config.csrf-disable's. Reads every non-test .go
// file's comments directly with go/parser, rather than trusting a single hand-picked doc
// comment, so the assertion survives a symbol moving to a different file's comment.
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
			t.Errorf("package doc comments do not mention %q, want retire-2's future tripwire to find it here", symbol)
		}
	}
}
