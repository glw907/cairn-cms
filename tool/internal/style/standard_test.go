package style

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"slices"
	"strings"
	"testing"
)

// standardPath is the terminal standard, relative to this package.
const standardPath = "../../docs/design/terminal-standard.md"

// tableRow splits a markdown table row into its trimmed cells.
func tableRow(line string) []string {
	cells := strings.Split(strings.Trim(strings.TrimSpace(line), "|"), "|")
	for i, c := range cells {
		cells[i] = strings.TrimSpace(c)
	}
	return cells
}

// functionColumn returns the entries of the Function column of the first
// markdown table whose header has a cell exactly "Function", with backticks and
// spaces stripped. It reports false when no such table exists.
func functionColumn(doc string) ([]string, bool) {
	lines := strings.Split(doc, "\n")
	for i := 0; i < len(lines); i++ {
		if !strings.HasPrefix(strings.TrimSpace(lines[i]), "|") {
			continue
		}
		col := slices.Index(tableRow(lines[i]), "Function")
		if col < 0 {
			// Skip the rest of this table so its body rows are not read as headers.
			for i+1 < len(lines) && strings.HasPrefix(strings.TrimSpace(lines[i+1]), "|") {
				i++
			}
			continue
		}
		var names []string
		// The row after the header is the delimiter row.
		for j := i + 2; j < len(lines) && strings.HasPrefix(strings.TrimSpace(lines[j]), "|"); j++ {
			cells := tableRow(lines[j])
			if col >= len(cells) {
				continue
			}
			name := strings.NewReplacer("`", "", " ", "").Replace(cells[col])
			if name != "" {
				names = append(names, name)
			}
		}
		return names, true
	}
	return nil, false
}

// TestStandardBlocksMatchTable holds the Function column of the standard's
// block table and the exported top-level functions of blocks.go to the same set.
func TestStandardBlocksMatchTable(t *testing.T) {
	raw, err := os.ReadFile(standardPath)
	if err != nil {
		t.Fatalf("read the standard: %v", err)
	}
	documented, ok := functionColumn(string(raw))
	if !ok {
		t.Fatalf("no table with a Function column in %s", standardPath)
	}

	file, err := parser.ParseFile(token.NewFileSet(), "blocks.go", nil, 0)
	if err != nil {
		t.Fatalf("parse blocks.go: %v", err)
	}
	var exported []string
	for _, decl := range file.Decls {
		if fn, isFunc := decl.(*ast.FuncDecl); isFunc && fn.Recv == nil && fn.Name.IsExported() {
			exported = append(exported, fn.Name.Name)
		}
	}

	for _, name := range documented {
		if !slices.Contains(exported, name) {
			t.Errorf("%s is in the standard's table but is not an exported function in blocks.go", name)
		}
	}
	for _, name := range exported {
		if !slices.Contains(documented, name) {
			t.Errorf("%s is an exported function in blocks.go but is not in the standard's table", name)
		}
	}
}
