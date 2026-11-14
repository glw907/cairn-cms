package render

import (
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
)

// TestRuleHonoursRequestedWidthExactly holds the width contract: the requested width is honoured
// exactly, and the rungs are behavioural thresholds only, never a snap. A render at width 90 is
// not byte-identical to one at width 80.
func TestRuleHonoursRequestedWidthExactly(t *testing.T) {
	th := newTheme(true, colorprofile.ASCII, false)
	r80 := th.rule(80)
	r90 := th.rule(90)
	if r80 == r90 {
		t.Fatal("rule(80) and rule(90) are byte-identical; width must be honoured exactly, not snapped to a rung")
	}
	if got := th.Width(r80); got != 80 {
		t.Errorf("width(rule(80)) = %d, want 80", got)
	}
	if got := th.Width(r90); got != 90 {
		t.Errorf("width(rule(90)) = %d, want 90", got)
	}
}

// TestDegenerateWidthsNeverPanic is criterion 20: 0, 1, 2, 5, 19, and a negative value each render
// without panicking, on both rule and clamp.
func TestDegenerateWidthsNeverPanic(t *testing.T) {
	widths := []int{0, 1, 2, 5, 19, -1, -400}
	for _, w := range widths {
		for _, ascii := range []bool{false, true} {
			th := newTheme(true, colorprofile.TrueColor, ascii)
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Errorf("rule(%v, %d) panicked: %v", ascii, w, r)
					}
				}()
				_ = th.rule(w)
			}()
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
