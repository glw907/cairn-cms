package render

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"strings"
	"testing"
)

// forbiddenImports names the two import paths criterion 3 forbids everywhere in this package
// except profile.go: os and golang.org/x/term, the one TTY check's own two capabilities.
var forbiddenImports = []string{"os", "golang.org/x/term"}

// forbiddenSelectors names the colorprofile detection entry points and the lipgloss package-level
// writer and Print family criterion 3 forbids by name everywhere except profile.go. colorprofile
// is checked as package.Selector; lipgloss.Writer and the Print family are checked the same way.
var forbiddenSelectors = map[string][]string{
	"colorprofile": {"Detect", "Env", "Terminfo", "Tmux"},
	"lipgloss":     {"Writer", "Print", "Printf", "Println", "Sprint", "Sprintf", "Sprintln", "Fprint", "Fprintf", "Fprintln"},
}

// lipglossSetters names the lipgloss.Style methods criterion 8 confines to palette.go: Style and
// Sized are the only two ways the rest of this package may get a lipgloss.Style. Render, the
// getter family (Get*), and Copy are not setters and are not listed. Width, MaxWidth, Height,
// MaxHeight, Align*, and Border* are deliberately absent too: this check has no type information
// (a plain AST walk, not go/types), so it can only match a selector by name, and those names
// collide with this package's own methods (Theme.Width) and would false-positive on a legitimate
// call. The remaining names are lipgloss-specific enough that a collision is not a real risk.
var lipglossSetters = []string{
	"Foreground", "Background", "Bold", "Italic", "Underline", "UnderlineStyle", "Strikethrough",
	"StrikethroughSpaces", "Faint", "Blink", "Reverse",
	"Padding", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft", "Margin", "MarginTop",
	"MarginRight", "MarginBottom", "MarginLeft", "BorderStyle",
	"Hyperlink", "ColorWhitespace", "Transform", "TabWidth",
}

// sourceFile is one non-test .go file in this package's own directory, parsed once for every
// purity check below to share.
type sourceFile struct {
	name string
	file *ast.File
	fset *token.FileSet
}

// packageSourceFiles parses every .go file in this directory. includeTests controls whether
// _test.go files are included: the bubbletea check runs over everything, the rest scope to
// production code only, since a test double is not a caller a reviewer needs to police.
func packageSourceFiles(t *testing.T, includeTests bool) []sourceFile {
	t.Helper()
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatal(err)
	}
	var out []sourceFile
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".go") {
			continue
		}
		if !includeTests && strings.HasSuffix(name, "_test.go") {
			continue
		}
		fset := token.NewFileSet()
		file, err := parser.ParseFile(fset, name, nil, parser.SkipObjectResolution)
		if err != nil {
			t.Fatalf("parse %s: %v", name, err)
		}
		out = append(out, sourceFile{name: name, file: file, fset: fset})
	}
	return out
}

// TestForbiddenImportsOutsideProfileGo falsifies criterion 3: os and golang.org/x/term import
// only in profile.go. A dispatch that needs to falsify this test adds the import, confirms the
// named failure, and removes it again.
func TestForbiddenImportsOutsideProfileGo(t *testing.T) {
	for _, sf := range packageSourceFiles(t, false) {
		if sf.name == "profile.go" {
			continue
		}
		for _, imp := range sf.file.Imports {
			path := strings.Trim(imp.Path.Value, `"`)
			for _, forbidden := range forbiddenImports {
				if path == forbidden {
					t.Errorf("%s imports %q; that is profile.go's own TTY check alone", sf.name, path)
				}
			}
		}
	}
}

// TestForbiddenSelectorsOutsideProfileGo falsifies criterion 3's second half: colorprofile's
// detection entry points and lipgloss's package-level Writer and Print family, named everywhere
// but profile.go. Naming them by selector, rather than banning the colorprofile or lipgloss
// import outright, is what lets palette.go's pure lipgloss.Complete and lipgloss.LightDark land
// without tripping this test.
func TestForbiddenSelectorsOutsideProfileGo(t *testing.T) {
	for _, sf := range packageSourceFiles(t, false) {
		if sf.name == "profile.go" {
			continue
		}
		ast.Inspect(sf.file, func(n ast.Node) bool {
			sel, ok := n.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			pkg, ok := sel.X.(*ast.Ident)
			if !ok {
				return true
			}
			for _, name := range forbiddenSelectors[pkg.Name] {
				if sel.Sel.Name == name {
					t.Errorf("%s:%d uses %s.%s, forbidden outside profile.go", sf.name, sf.fset.Position(sel.Pos()).Line, pkg.Name, name)
				}
			}
			return true
		})
	}
}

// TestNoBubbleteaImport falsifies the second half of criterion 3: this package imports no
// bubbletea package at all, in production code or in a test, since a purity break in a test would
// still mean the seam only holds by convention.
func TestNoBubbleteaImport(t *testing.T) {
	for _, sf := range packageSourceFiles(t, true) {
		for _, imp := range sf.file.Imports {
			path := strings.Trim(imp.Path.Value, `"`)
			if strings.Contains(path, "bubbletea") {
				t.Errorf("%s imports %q; render carries no bubbletea type (criterion 25)", sf.name, path)
			}
		}
	}
}

// TestNoLipglossSetterOutsidePaletteGo falsifies criterion 8: Theme.Style and Theme.Sized are the
// only two ways to get a lipgloss.Style out of this package, so no other file chains a raw
// lipgloss setter off the style either one returns.
func TestNoLipglossSetterOutsidePaletteGo(t *testing.T) {
	for _, sf := range packageSourceFiles(t, false) {
		if sf.name == "palette.go" {
			continue
		}
		ast.Inspect(sf.file, func(n ast.Node) bool {
			call, ok := n.(*ast.CallExpr)
			if !ok {
				return true
			}
			sel, ok := call.Fun.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			for _, name := range lipglossSetters {
				if sel.Sel.Name == name {
					t.Errorf("%s:%d calls .%s(...), a lipgloss setter reserved for palette.go", sf.name, sf.fset.Position(sel.Pos()).Line, name)
				}
			}
			return true
		})
	}
}
