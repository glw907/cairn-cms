package render

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// forbiddenImports names the two import paths no file in this package takes: os and
// golang.org/x/term are the TTY check's two capabilities, and style.Detect owns that check.
var forbiddenImports = []string{"os", "golang.org/x/term"}

// forbiddenSelectors names the colorprofile detection entry points and the lipgloss package-level
// writer and Print family, forbidden by name in every file. Naming them by selector, rather than
// banning the colorprofile or lipgloss import outright, leaves the pure calls a body makes, such
// as lipgloss.JoinHorizontal and the colorprofile.Profile type, untouched.
var forbiddenSelectors = map[string][]string{
	"colorprofile": {"Detect", "Env", "Terminfo", "Tmux"},
	"lipgloss":     {"Writer", "Print", "Printf", "Println", "Sprint", "Sprintf", "Sprintln", "Fprint", "Fprintf", "Fprintln"},
}

// sourceFile is one non-test .go file in this package's directory, parsed once for every
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

// TestNoForbiddenImports holds the seam: no file in this package imports os or
// golang.org/x/term, so a frame never depends on the terminal it is printed to.
func TestNoForbiddenImports(t *testing.T) {
	for _, sf := range packageSourceFiles(t, false) {
		for _, imp := range sf.file.Imports {
			path := strings.Trim(imp.Path.Value, `"`)
			if slices.Contains(forbiddenImports, path) {
				t.Errorf("%s imports %q; terminal detection is style.Detect's", sf.name, path)
			}
		}
	}
}

// TestNoForbiddenSelectors holds the seam's second half: no file names colorprofile's detection
// entry points or lipgloss's package-level Writer and Print family.
func TestNoForbiddenSelectors(t *testing.T) {
	for _, sf := range packageSourceFiles(t, false) {
		ast.Inspect(sf.file, func(n ast.Node) bool {
			sel, ok := n.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			pkg, ok := sel.X.(*ast.Ident)
			if !ok {
				return true
			}
			if slices.Contains(forbiddenSelectors[pkg.Name], sel.Sel.Name) {
				t.Errorf("%s:%d uses %s.%s, which reads or writes the terminal", sf.name, sf.fset.Position(sel.Pos()).Line, pkg.Name, sel.Sel.Name)
			}
			return true
		})
	}
}

// TestNoBubbleteaImport holds the other seam: this package imports no
// bubbletea package at all, in production code or in a test, since a purity break in a test would
// still mean the seam only holds by convention.
func TestNoBubbleteaImport(t *testing.T) {
	for _, sf := range packageSourceFiles(t, true) {
		for _, imp := range sf.file.Imports {
			path := strings.Trim(imp.Path.Value, `"`)
			if strings.Contains(path, "bubbletea") {
				t.Errorf("%s imports %q; render carries no bubbletea type", sf.name, path)
			}
		}
	}
}

// renderDirectRequires is ADR-0002's pin policy for the terminal output render and style draw:
// lipgloss, colorprofile, and x/ansi, plus displaywidth, which style measures with so both width
// tables come from the one library x/ansi's narrow measure already rests on. A fifth is a
// decision, not an import, so it fails here first.
var renderDirectRequires = []string{
	"charm.land/lipgloss/v2",
	"github.com/charmbracelet/colorprofile",
	"github.com/charmbracelet/x/ansi",
	"github.com/clipperhouse/displaywidth",
}

// otherDirectRequires is how many direct requires the rest of the module carries: the CLI
// framework, the keyring library, the two x/ packages, YAML (promoted from indirect for
// internal/doctor's site-config parse, ADR-0002's addendum), pflag (promoted from indirect
// when cmd/cairn's flag-list test began walking the command tree's flag sets, which are
// pflag values cobra hands back), and x/crypto, whose nacl/box seals the deploy secret for
// GitHub's Actions secrets API, plus Bubble Tea v2, teatest v2, Huh v2 and Bubbles v2 for the
// terminal view, its frame harness, its forms and its key-hint footers (ADR-0004), plus Fang
// v2, which themes Cobra help for a terminal reader, plus creack/pty and charmbracelet/x/vt, the
// test-only pseudo-terminal and terminal emulator the report end-to-end tests drive the binary
// through. They are counted rather than named, because internal/secrets confines one of those
// import paths to its file and that check reads every .go file in the module as text, this one
// included.
const otherDirectRequires = 14

// TestRenderDirectRequiresArePinned holds ADR-0002's pin policy to its list, and the module
// to its total. A fifth library taken for this package, or one of the four dropped, fails here
// and is named in the diff; a new direct require anywhere else in the module fails the count.
func TestRenderDirectRequiresArePinned(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "..", "go.mod"))
	if err != nil {
		t.Fatal(err)
	}
	var direct, mine []string
	for line := range strings.SplitSeq(string(data), "\n") {
		trimmed := strings.TrimSpace(line)
		path, version, found := strings.Cut(trimmed, " ")
		switch {
		case !found, strings.HasSuffix(trimmed, "// indirect"):
			continue
		case !strings.HasPrefix(version, "v"), !strings.Contains(path, "."):
			continue
		}
		direct = append(direct, path)
		if slices.Contains(renderDirectRequires, path) {
			mine = append(mine, path)
		}
	}
	slices.Sort(mine)
	want := slices.Clone(renderDirectRequires)
	slices.Sort(want)
	if !slices.Equal(mine, want) {
		t.Errorf("render's direct requires are\n%v\nwant\n%v", mine, want)
	}
	if n, total := len(direct), len(renderDirectRequires)+otherDirectRequires; n != total {
		t.Errorf("go.mod carries %d direct requires, want %d: %v", n, total, direct)
	}
}
