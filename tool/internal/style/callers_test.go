package style

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"
)

// stylePath is this package's import path, which a caller file must import to name it.
const stylePath = "github.com/glw907/cairn-cms/tool/v2/internal/style"

// exportedNames returns every exported top-level constant, variable, function, and type declared
// in this package's non-test files. Methods are left out, since go doc's package listing does not
// list them either.
func exportedNames(t *testing.T) []string {
	t.Helper()
	fset := token.NewFileSet()
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, path := range files {
		if strings.HasSuffix(path, "_test.go") {
			continue
		}
		f, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			t.Fatal(err)
		}
		for _, decl := range f.Decls {
			switch d := decl.(type) {
			case *ast.FuncDecl:
				if d.Recv == nil && d.Name.IsExported() {
					names = append(names, d.Name.Name)
				}
			case *ast.GenDecl:
				for _, spec := range d.Specs {
					switch s := spec.(type) {
					case *ast.TypeSpec:
						if s.Name.IsExported() {
							names = append(names, s.Name.Name)
						}
					case *ast.ValueSpec:
						for _, n := range s.Names {
							if n.IsExported() {
								names = append(names, n.Name)
							}
						}
					}
				}
			}
		}
	}
	slices.Sort(names)
	return names
}

// selectedNames returns every name a non-test Go file under the module root, outside this
// package, selects from this package through the name it imports it under.
func selectedNames(t *testing.T, root string) map[string]bool {
	t.Helper()
	fset := token.NewFileSet()
	seen := map[string]bool{}
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(root, path)
		rel = filepath.ToSlash(rel)
		if d.IsDir() {
			// tools/ is a separate module, and testdata and man are not compiled.
			if name := d.Name(); name == "testdata" || name == "tools" || name == "man" || rel == "internal/style" {
				return fs.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		f, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			return err
		}
		local := ""
		for _, imp := range f.Imports {
			if p, _ := strconv.Unquote(imp.Path.Value); p == stylePath {
				local = "style"
				if imp.Name != nil {
					local = imp.Name.Name
				}
			}
		}
		if local == "" {
			return nil
		}
		ast.Inspect(f, func(n ast.Node) bool {
			if sel, ok := n.(*ast.SelectorExpr); ok {
				if id, ok := sel.X.(*ast.Ident); ok && id.Name == local {
					seen[sel.Sel.Name] = true
				}
			}
			return true
		})
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", root, err)
	}
	return seen
}

// TestEveryExportHasACaller fails on an exported name of this package that no non-test file
// outside it selects. The package exports only what a caller in the tree uses; cmd/specimen
// counts as a caller.
func TestEveryExportHasACaller(t *testing.T) {
	seen := selectedNames(t, filepath.Join("..", ".."))
	for _, name := range exportedNames(t) {
		if !seen[name] {
			t.Errorf("style.%s has no caller in a non-test file outside internal/style", name)
		}
	}
}
