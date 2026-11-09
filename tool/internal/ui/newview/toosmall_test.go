package newview

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestMinimumSize(t *testing.T) {
	if MinWidth != 50 || MinRows != 21 {
		t.Fatalf("minimum is %dx%d, want 50x21", MinWidth, MinRows)
	}
	tests := []struct {
		w, h int
		want bool
	}{
		{50, 21, true}, {80, 24, true}, {49, 21, false}, {50, 20, false}, {49, 20, false},
	}
	for _, tt := range tests {
		if got := Fits(tt.w, tt.h); got != tt.want {
			t.Errorf("Fits(%d, %d) = %v, want %v", tt.w, tt.h, got, tt.want)
		}
	}
}

func TestTooSmallGoldens(t *testing.T) {
	tests := []struct {
		name          string
		width, height int
		mustName      []string
		mustNot       string
	}{
		{"toosmall-49x24", 49, 24, []string{"Setup needs 50 columns. This window has 49."}, "rows"},
		{"toosmall-80x20", 80, 20, []string{"This step needs 21 rows. This window has 20."}, "columns"},
		{"toosmall-44x14", 44, 14, []string{"Setup needs 50 columns. This window has 44.", "This step needs 21 rows. This window has 14."}, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ansi.Strip(testGrid(tt.width).TooSmall(tt.height, MinRows))
			flat := strings.Join(strings.Fields(got), " ")
			for _, s := range tt.mustName {
				if !strings.Contains(flat, s) {
					t.Errorf("frame does not say %q:\n%s", s, got)
				}
			}
			if tt.mustNot != "" && strings.Contains(flat, tt.mustNot) {
				t.Errorf("frame names %q though the window is large enough there:\n%s", tt.mustNot, got)
			}
			for i, l := range strings.Split(got, "\n") {
				if w := ansi.StringWidth(l); w > tt.width {
					t.Errorf("line %d is %d cells in a %d-wide window", i, w, tt.width)
				}
			}
			path := filepath.Join("testdata", tt.name+".golden")
			if updating() {
				writeGolden(t, path, got)
			}
			if want := readGolden(t, path); got != want {
				t.Errorf("frame differs from %s:\n%s\nwant:\n%s", path, got, want)
			}
		})
	}
}

func writeGolden(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
