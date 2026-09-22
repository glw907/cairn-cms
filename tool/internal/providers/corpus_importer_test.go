package providers

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

// testOnlySymbols are corpus.go's two exported entry points. They read the fixture corpus out of
// the repository working tree, which a `go install github.com/glw907/cairn-cms/tool/cmd/cairn@v*`
// build has no copy of, so a non-test caller would ship a binary that fails on a clean machine
// in a way no test in this module could observe.
var testOnlySymbols = []string{"RepoRoot", "Corpus"}

// secondaryCommands are the module's commands other than cairn itself. Neither is a dependency of
// the shipped binary, and each builds tooling the released artifact must not carry: copylist
// reads internal/health's message tables to regenerate a golden, and mangen shells out to `go
// build` to harvest a command tree.
var secondaryCommands = []string{
	"github.com/glw907/cairn-cms/tool/cmd/copylist",
	"github.com/glw907/cairn-cms/tool/cmd/mangen",
}

// TestCorpusResolverHasNoNonTestCaller walks every non-test Go file in the module and fails on any
// reference to corpus.go's own exported symbols. Compiling into package providers is unavoidable
// (corpus.go is not a _test.go file), so the property that keeps `go install` honest is that
// nothing outside a test ever calls in.
func TestCorpusResolverHasNoNonTestCaller(t *testing.T) {
	root := moduleRoot(t)
	fset := token.NewFileSet()

	var offenders []string
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			// tools/ is a separate module, and testdata is not compiled.
			if name := d.Name(); name == "testdata" || name == "tools" || name == "man" {
				return fs.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		if rel, _ := filepath.Rel(root, path); filepath.ToSlash(rel) == "internal/providers/corpus.go" {
			return nil
		}

		file, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			return err
		}
		ast.Inspect(file, func(n ast.Node) bool {
			id, ok := n.(*ast.Ident)
			if ok && slices.Contains(testOnlySymbols, id.Name) {
				offenders = append(offenders, fset.Position(id.Pos()).String()+": "+id.Name)
			}
			return true
		})
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", root, err)
	}

	for _, offender := range offenders {
		t.Errorf("non-test reference to a corpus resolver symbol: %s", offender)
	}
}

// TestSecondaryCommandsAreNotLinkedIntoCairn asserts the copy lister and the man generator are
// absent from the shipped binary's own dependency graph, which is what lets a release archive and
// a `go install` build carry neither.
func TestSecondaryCommandsAreNotLinkedIntoCairn(t *testing.T) {
	const cairn = "github.com/glw907/cairn-cms/tool/cmd/cairn"
	out, err := exec.Command("go", "list", "-deps", cairn).Output()
	if err != nil {
		t.Fatalf("go list -deps %s: %v", cairn, err)
	}
	deps := strings.Fields(string(out))

	// A typo in either import path would make the assertion vacuous, so confirm the graph this
	// test is reading is the real one before asserting what is missing from it.
	if !slices.Contains(deps, "github.com/glw907/cairn-cms/tool/internal/providers") {
		t.Fatalf("go list -deps %s reported %d packages and not this one", cairn, len(deps))
	}
	for _, command := range secondaryCommands {
		if slices.Contains(deps, command) {
			t.Errorf("cairn depends on %s", command)
		}
	}
}

// moduleRoot resolves tool/ from this package's own directory, so the walk above covers the whole
// module however `go test` was invoked.
func moduleRoot(t *testing.T) string {
	t.Helper()
	wd, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatalf("resolve module root: %v", err)
	}
	return wd
}
