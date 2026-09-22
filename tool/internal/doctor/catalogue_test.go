package doctor

import (
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"
)

// notOperatorFacing names the string consts a check_*.go file declares that Catalogue is right
// to leave out: an input the checks match against, or a path they read. Every other string const
// in those files is something an operator reads, so it belongs in the catalogue.
var notOperatorFacing = []string{
	"contentSignalDecline",
	"contentSignalInvite",
	"enginePackageJSONPath",
}

// TestCatalogueCarriesEveryCheckString asserts Catalogue lists every operator-facing string
// const the check files declare. The catalogue is a hand-written list, so a check adding a
// string and forgetting the entry would otherwise drop that string out of
// tool/testdata/copy.golden.md and out of every copy review the golden gates.
func TestCatalogueCarriesEveryCheckString(t *testing.T) {
	catalogued := make(map[string]bool, len(Catalogue()))
	for _, entry := range Catalogue() {
		catalogued[entry] = true
	}

	files, err := filepath.Glob("check_*.go")
	if err != nil {
		t.Fatalf("glob check_*.go: %v", err)
	}
	var exercised []string
	fset := token.NewFileSet()
	for _, name := range files {
		if strings.HasSuffix(name, "_test.go") {
			continue
		}
		f, err := parser.ParseFile(fset, name, nil, 0)
		if err != nil {
			t.Fatalf("parse %s: %v", name, err)
		}
		for constName, value := range stringConsts(t, f) {
			if slices.Contains(notOperatorFacing, constName) {
				exercised = append(exercised, constName)
				continue
			}
			if !catalogued[value] {
				t.Errorf("%s declares %s, which Catalogue does not list", name, constName)
			}
		}
	}

	for _, name := range notOperatorFacing {
		if !slices.Contains(exercised, name) {
			t.Errorf("notOperatorFacing names %s, which no check file declares any more", name)
		}
	}
}

// stringConsts returns every package-level string const f declares, keyed by name. A const built
// from a chain of string literals joined by + (the multi-line style check_posture.go's
// tmplPostureManagedLayerNote and tmplPostureForeignSignalNote use) is folded into one value, so
// a concatenated const is checked the same as a plain one.
func stringConsts(t *testing.T, f *ast.File) map[string]string {
	t.Helper()
	out := map[string]string{}
	for _, decl := range f.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.CONST {
			continue
		}
		for _, spec := range gen.Specs {
			vs, ok := spec.(*ast.ValueSpec)
			if !ok || len(vs.Names) != len(vs.Values) {
				continue
			}
			for i, val := range vs.Values {
				value, ok := stringLiteralValue(t, val)
				if !ok {
					continue
				}
				out[vs.Names[i].Name] = value
			}
		}
	}
	return out
}

// stringLiteralValue returns the string value of val, unquoting a plain string literal and
// concatenating a chain of + expressions whose leaves are all string literals. ok is false for
// any other expression shape, which the caller skips the same as it always skipped a non-literal.
func stringLiteralValue(t *testing.T, val ast.Expr) (string, bool) {
	t.Helper()
	switch v := val.(type) {
	case *ast.BasicLit:
		if v.Kind != token.STRING {
			return "", false
		}
		value, err := strconv.Unquote(v.Value)
		if err != nil {
			t.Fatalf("unquote %s: %v", v.Value, err)
		}
		return value, true
	case *ast.BinaryExpr:
		if v.Op != token.ADD {
			return "", false
		}
		left, ok := stringLiteralValue(t, v.X)
		if !ok {
			return "", false
		}
		right, ok := stringLiteralValue(t, v.Y)
		if !ok {
			return "", false
		}
		return left + right, true
	default:
		return "", false
	}
}
