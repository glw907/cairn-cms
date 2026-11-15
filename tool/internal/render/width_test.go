package render

import (
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
	"github.com/glw907/cairn-cms/tool/v2/internal/render/fixtures"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// TestFrameHonoursRequestedWidthExactly holds the width contract: the requested width is honoured
// exactly, and the rungs are behavioural thresholds only, never a snap. A render at width 90 is
// not byte-identical to one at width 80, and neither prints a line past its width.
func TestFrameHonoursRequestedWidthExactly(t *testing.T) {
	render := func(w int) []string {
		return Render(input(fixtures.OneSick(), BodySingle, w, colorprofile.ASCII, false, spine.VerdictCritical)).Lines()
	}
	r80, r90 := render(80), render(90)
	if strings.Join(r80, "\n") == strings.Join(r90, "\n") {
		t.Fatal("the frames at 80 and 90 are byte-identical; width must be honoured exactly, not snapped to a rung")
	}
	th := newTheme(true, colorprofile.ASCII, false)
	for w, lines := range map[int][]string{80: r80, 90: r90} {
		for _, l := range lines {
			if got := th.Width(l); got > w {
				t.Errorf("a line at width %d is %d cells: %q", w, got, l)
			}
		}
	}
}

// TestDegenerateWidthsNeverPanic is criterion 20: 0, 1, 2, 5, 19, and a negative value each render
// without panicking on clamp.
func TestDegenerateWidthsNeverPanic(t *testing.T) {
	widths := []int{0, 1, 2, 5, 19, -1, -400}
	for _, w := range widths {
		for _, ascii := range []bool{false, true} {
			th := newTheme(true, colorprofile.TrueColor, ascii)
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Errorf("clamp(..., %d) panicked: %v", w, r)
					}
				}()
				got := th.clamp("a long line of dynamic content a site handed us", w)
				if gotW := th.Width(got); gotW > max(w, 1) {
					t.Errorf("clamp(..., %d) = %q, %d cells, want at most %d", w, got, gotW, max(w, 1))
				}
			}()
		}
	}
}

// TestClampNeverExceedsWidth sweeps clamp, the primitive every dynamic field passes through,
// across the sweep widths over long and CJK content, so no field it cuts outgrows its budget.
func TestClampNeverExceedsWidth(t *testing.T) {
	th := newTheme(true, colorprofile.TrueColor, false)
	sweepWidths := []int{20, 40, 60, 72, 79, 80, 81, 100, 120, 200, 400}
	longLine := strings.Repeat("the quick brown fox jumps over the lazy dog ", 20)
	cjk := strings.Repeat("你好世界", 40)
	for _, w := range sweepWidths {
		for _, s := range []string{longLine, cjk} {
			got := th.clamp(s, w)
			if gotW := th.Width(got); gotW > w {
				t.Errorf("clamp(%d) over width: got %d cells for width %d", w, gotW, w)
			}
		}
	}
}
