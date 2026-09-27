package spine

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"runtime"
	"slices"
	"testing"
)

// vocabularyCheck names one string vocabulary this package hand-derives from its own const
// block: the file the constants and the backing list are declared in, the constant type the
// block declares, the package-level slice variable that is supposed to carry every one of them,
// and the constant names the list is allowed to omit (a sentinel "no value" member with no place
// in the published vocabulary).
type vocabularyCheck struct {
	file     string
	typeName string
	listVar  string
	exempt   []string
}

// vocabularies is every hand-written list this package proves complete against its own const
// block. A constant added here and never added to its list would otherwise miss Codes,
// ReasonCodes (which folds parkCodes in), or Conditions silently, since Go has no way to
// enumerate a const block at run time.
var vocabularies = []vocabularyCheck{
	{file: "code.go", typeName: "Code", listVar: "codes", exempt: []string{"CodeNone"}},
	{file: "park.go", typeName: "ParkCode", listVar: "parkCodes"},
	{file: "outcome.go", typeName: "ReasonCode", listVar: "fixedReasonCodes"},
	{file: "condition.go", typeName: "Condition", listVar: "conditions", exempt: []string{"ConditionNone"}},
}

// TestVocabulariesCoverTheirConstBlocks asserts each vocabulary in vocabularies names every
// constant of its own type, in declaration order, so a constant appended to a const block and
// never added to its backing list fails here instead of silently missing the vocabulary its list
// builds. It also fails if a typeName matches nothing in its file, so a misspelled type name
// cannot pass this test by comparing two empty lists.
func TestVocabulariesCoverTheirConstBlocks(t *testing.T) {
	for _, v := range vocabularies {
		t.Run(v.typeName, func(t *testing.T) {
			path := vocabularySourcePath(t, v.file)
			fset := token.NewFileSet()
			f, err := parser.ParseFile(fset, path, nil, 0)
			if err != nil {
				t.Fatalf("parse %s: %v", path, err)
			}

			all := constNamesOfType(f, v.typeName)
			if len(all) == 0 {
				t.Fatalf("found no %s constant in %s; check typeName for a misspelling", v.typeName, path)
			}
			var want []string
			for _, name := range all {
				if !slices.Contains(v.exempt, name) {
					want = append(want, name)
				}
			}

			got, err := varElementNames(f, v.listVar)
			if err != nil {
				t.Fatalf("read %s in %s: %v", v.listVar, path, err)
			}

			if !slices.Equal(got, want) {
				t.Errorf("%s constants in declaration order = %v, backing list %s = %v", v.typeName, want, v.listVar, got)
			}
		})
	}
}

// vocabularySourcePath resolves file relative to this test file's own directory via
// runtime.Caller, so the parse below finds it regardless of the caller's working directory.
func vocabularySourcePath(t *testing.T, file string) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve this file's own path")
	}
	return filepath.Join(filepath.Dir(thisFile), file)
}

// constNamesOfType returns every package-level constant name f declares whose type is an
// explicit identifier named typeName, in declaration order. It covers both a lone `const Name
// Type = value` declaration and a `const ( ... )` block whose specs each repeat the type.
func constNamesOfType(f *ast.File, typeName string) []string {
	var names []string
	for _, decl := range f.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.CONST {
			continue
		}
		for _, spec := range gen.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok {
				continue
			}
			ident, ok := vs.Type.(*ast.Ident)
			if !ok || ident.Name != typeName {
				continue
			}
			for _, name := range vs.Names {
				names = append(names, name.Name)
			}
		}
	}
	return names
}

// varElementNames returns the identifier names in the composite-literal slice a package-level
// `var name = []T{...}` declares, in source order.
func varElementNames(f *ast.File, name string) ([]string, error) {
	for _, decl := range f.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.VAR {
			continue
		}
		for _, spec := range gen.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok {
				continue
			}
			for i, n := range vs.Names {
				if n.Name != name {
					continue
				}
				lit, ok := vs.Values[i].(*ast.CompositeLit)
				if !ok {
					return nil, fmt.Errorf("%s is not a slice composite literal", name)
				}
				var elems []string
				for _, elt := range lit.Elts {
					ident, ok := elt.(*ast.Ident)
					if !ok {
						return nil, fmt.Errorf("%s carries an element that is not a bare identifier", name)
					}
					elems = append(elems, ident.Name)
				}
				return elems, nil
			}
		}
	}
	return nil, fmt.Errorf("no package-level var named %s", name)
}
