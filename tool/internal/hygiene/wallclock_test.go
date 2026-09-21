package hygiene

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// clockFreePackages names the packages whose every time value arrives as an input. The health
// sweep promises that a replay through the same clock produces a byte-identical report, and logs
// promises the same of a query's timeframe, so a system-clock read inside either breaks a promise
// silently: the output still looks right on any single run.
var clockFreePackages = []string{"internal/health", "internal/logs"}

func TestNoWallClockReadsInClockFreePackages(t *testing.T) {
	root := moduleRoot(t)

	for _, pkg := range clockFreePackages {
		dir := filepath.Join(root, filepath.FromSlash(pkg))
		entries, err := os.ReadDir(dir)
		if err != nil {
			t.Fatalf("read %s: %v", pkg, err)
		}
		for _, entry := range entries {
			name := entry.Name()
			if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
				continue
			}
			// Parsing rather than scanning the text keeps a doc comment that names time.Now from
			// reading as a call.
			fset := token.NewFileSet()
			file, err := parser.ParseFile(fset, filepath.Join(dir, name), nil, parser.SkipObjectResolution)
			if err != nil {
				t.Fatalf("parse %s/%s: %v", pkg, name, err)
			}
			ast.Inspect(file, func(n ast.Node) bool {
				sel, ok := n.(*ast.SelectorExpr)
				if !ok {
					return true
				}
				switch sel.Sel.Name {
				case "Now", "Since", "Until":
				default:
					return true
				}
				if provider, ok := sel.X.(*ast.Ident); ok && provider.Name == "time" {
					t.Errorf("%s/%s:%d reads the system clock; take the time as a parameter instead",
						pkg, name, fset.Position(sel.Pos()).Line)
				}
				return true
			})
		}
	}
}
