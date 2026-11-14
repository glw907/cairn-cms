package style

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"testing"
)

// colourSetters are the lipgloss.Style methods that take a colour.
var colourSetters = []string{
	"Foreground", "Background", "BorderForeground", "BorderBackground",
	"BorderTopForeground", "BorderRightForeground", "BorderBottomForeground", "BorderLeftForeground",
	"BorderTopBackground", "BorderRightBackground", "BorderBottomBackground", "BorderLeftBackground",
	"BorderForegroundBlend", "UnderlineColor", "MarginBackground",
}

var hexLiteral = regexp.MustCompile(`^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`)

// purityFindings parses one Go source and returns a "line: reason" entry per colour write. It
// matches setter names without type information, so the one name that collides in this module,
// context.Background, is excluded by its package selector.
func purityFindings(filename, src string) ([]string, error) {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, filename, src, 0)
	if err != nil {
		return nil, err
	}
	var out []string
	report := func(n ast.Node, why string) {
		out = append(out, strconv.Itoa(fset.Position(n.Pos()).Line)+": "+why)
	}
	ast.Inspect(f, func(n ast.Node) bool {
		switch n := n.(type) {
		case *ast.CallExpr:
			sel, ok := n.Fun.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			pkg, _ := sel.X.(*ast.Ident)
			if pkg != nil && pkg.Name == "lipgloss" && (sel.Sel.Name == "Color" || sel.Sel.Name == "ANSIColor") {
				report(n, "lipgloss."+sel.Sel.Name+" call")
			}
			if slices.Contains(colourSetters, sel.Sel.Name) && (pkg == nil || pkg.Name != "context") {
				report(n, "colour setter "+sel.Sel.Name)
			}
		case *ast.CompositeLit:
			if sel, ok := n.Type.(*ast.SelectorExpr); ok && sel.Sel.Name == "RGBA" {
				if pkg, ok := sel.X.(*ast.Ident); ok && pkg.Name == "color" {
					report(n, "color.RGBA literal")
				}
			}
		case *ast.BasicLit:
			if n.Kind == token.STRING {
				if s, err := strconv.Unquote(n.Value); err == nil && hexLiteral.MatchString(s) {
					report(n, "hex string "+s)
				}
			}
		}
		return true
	})
	return out, nil
}

func TestPurityDetection(t *testing.T) {
	cases := []struct {
		name, src string
		want      int
	}{
		{"chain from NewStyle", `var _ = lipgloss.NewStyle().Bold(true).Foreground(x)`, 1},
		{"setter on a value", `func f(s lipgloss.Style) { s.Background(x) }`, 1},
		{"border setter", `var _ = s.BorderForeground(x)`, 1},
		{"lipgloss.Color", `var _ = lipgloss.Color("212")`, 1},
		{"lipgloss.ANSIColor", `var _ = lipgloss.ANSIColor(3)`, 1},
		{"RGBA literal", `var _ = color.RGBA{R: 1}`, 1},
		{"hex 3", `var _ = "#fff"`, 1},
		{"hex 4", `var _ = "#fff8"`, 1},
		{"hex 6", `var _ = "#28231d"`, 1},
		{"hex 8", `var _ = "#28231dff"`, 1},
		{"context.Background is fine", `var _ = context.Background()`, 0},
		{"layout setters are fine", `var _ = lipgloss.NewStyle().Bold(true).Width(3)`, 0},
		{"non-colour strings are fine", `var _ = []string{"#", "#12", "#12345", "#ggg", "a #fff"}`, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := purityFindings("x.go", "package x\n"+tc.src)
			if err != nil {
				t.Fatal(err)
			}
			if len(got) != tc.want {
				t.Fatalf("findings = %v, want %d", got, tc.want)
			}
		})
	}
}

func TestPurity(t *testing.T) {
	root := filepath.Join("..", "..")
	skip := filepath.Join(root, "internal", "style")
	var bad []string
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if path == skip {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		src, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		found, err := purityFindings(path, string(src))
		if err != nil {
			return err
		}
		for _, f := range found {
			bad = append(bad, path+":"+f)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, b := range bad {
		t.Error(b)
	}
}
