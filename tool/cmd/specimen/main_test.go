package main

import (
	"bytes"
	"flag"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"
	"github.com/glw907/cairn-cms/tool/v2/internal/style"
)

// updateGolden rewrites the specimen golden from the current blocks; a reviewer reads the
// resulting diff as the language's change.
var updateGolden = flag.Bool("update", false, "rewrite the specimen golden from this program")

// golden is the committed dark specimen.
const golden = "testdata/specimen.golden"

// TestSpecimenGolden compares the dark specimen with the committed golden, byte for byte.
func TestSpecimenGolden(t *testing.T) {
	var buf bytes.Buffer
	if err := run(&buf, []string{"-theme", "dark"}); err != nil {
		t.Fatal(err)
	}
	got := buf.String()
	if *updateGolden {
		if err := os.MkdirAll(filepath.Dir(golden), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(golden, []byte(got), 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(golden)
	if err != nil {
		t.Fatalf("%v; run `go test ./cmd/specimen -update` to cut it", err)
	}
	// Line endings normalize before comparison, so a checkout that translated them fails on the
	// specimen rather than on every line of it.
	if got != strings.ReplaceAll(string(want), "\r\n", "\n") {
		t.Errorf("specimen differs from %s\n--- got ---\n%s\n--- want ---\n%s", golden, got, want)
	}
}

// TestSpecimenFitsEightyColumns holds every line of both grounds to the 80 columns the
// screenshots are taken at.
func TestSpecimenFitsEightyColumns(t *testing.T) {
	measure := style.NewTheme(true, colorprofile.TrueColor, false)
	for _, dark := range []bool{true, false} {
		for i, l := range strings.Split(specimen(dark), "\n") {
			if w := measure.Width(l); w > width {
				t.Errorf("dark=%v line %d is %d cells: %q", dark, i+1, w, ansi.Strip(l))
			}
		}
	}
}

// TestThemeFlagPicksTheInkBranch asserts the two grounds paint differently and that any other
// -theme value or an argument is refused.
func TestThemeFlagPicksTheInkBranch(t *testing.T) {
	if specimen(true) == specimen(false) {
		t.Error("the dark and light specimens are identical")
	}
	for _, args := range [][]string{{"-theme", "blue"}, {"extra"}, {"-width", "60"}} {
		if err := run(&bytes.Buffer{}, args); err == nil {
			t.Errorf("run(%q) succeeded, want an error", args)
		}
	}
}
