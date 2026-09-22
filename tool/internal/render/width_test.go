package render

import (
	"strings"
	"testing"
)

// TestWidthRungConstants pins criterion 18's numbers: a floor of 40, a single-column threshold of
// 60, and a wide cap of 120.
func TestWidthRungConstants(t *testing.T) {
	if WidthFloor != 40 {
		t.Errorf("WidthFloor = %d, want 40", WidthFloor)
	}
	if WidthNarrow != 60 {
		t.Errorf("WidthNarrow = %d, want 60", WidthNarrow)
	}
	if Width80 != 80 {
		t.Errorf("Width80 = %d, want 80", Width80)
	}
	if Width100 != 100 {
		t.Errorf("Width100 = %d, want 100", Width100)
	}
	if WidthCap != 120 {
		t.Errorf("WidthCap = %d, want 120", WidthCap)
	}
}

// TestContentClampsToCap is criterion 18's wide cap: content stops growing past WidthCap.
func TestContentClampsToCap(t *testing.T) {
	tests := []struct {
		in, want int
	}{
		{0, 1}, {1, 1}, {-5, 1}, {40, 40}, {120, 120}, {121, 120}, {2560, 120},
	}
	for _, tt := range tests {
		if got := content(tt.in); got != tt.want {
			t.Errorf("content(%d) = %d, want %d", tt.in, got, tt.want)
		}
	}
}

// TestRuleHonoursRequestedWidthExactly is the conductor's 2026-09-21 ruling on criterion 18: the
// requested width is honoured exactly, the rungs are behavioural thresholds only, never a snap. A
// render at width 90 is not byte-identical to one at width 80.
func TestRuleHonoursRequestedWidthExactly(t *testing.T) {
	th := NewTheme(true, ProfileNoColor)
	r80 := th.Rule(false, 80)
	r90 := th.Rule(false, 90)
	if r80 == r90 {
		t.Fatal("Rule(80) and Rule(90) are byte-identical; width must be honoured exactly, not snapped to a rung")
	}
	if got := th.Width(r80); got != 80 {
		t.Errorf("Width(Rule(80)) = %d, want 80", got)
	}
	if got := th.Width(r90); got != 90 {
		t.Errorf("Width(Rule(90)) = %d, want 90", got)
	}
}

// TestDegenerateWidthsNeverPanic is criterion 20: 0, 1, 2, 5, 19, and a negative value each render
// without panicking, on both Rule and Clamp.
func TestDegenerateWidthsNeverPanic(t *testing.T) {
	th := NewTheme(true, ProfileTrueColor)
	widths := []int{0, 1, 2, 5, 19, -1, -400}
	for _, w := range widths {
		for _, ascii := range []bool{false, true} {
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Errorf("Rule(%v, %d) panicked: %v", ascii, w, r)
					}
				}()
				_ = th.Rule(ascii, w)
			}()
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Errorf("Clamp(..., %d) panicked: %v", w, r)
					}
				}()
				got := th.Clamp("a long line of dynamic content a site handed us", w)
				if gotW := th.Width(got); gotW > max(w, 1) {
					t.Errorf("Clamp(..., %d) = %q, %d cells, want at most %d", w, got, gotW, max(w, 1))
				}
			}()
		}
	}
}

// TestClampNeverExceedsWidth is the nearest sound form of criterion 19 that this task's own
// primitives can prove: 20a has no body compositor yet (Task 20b-i), so this exercises Clamp,
// the primitive every dynamic field passes through, across the plan's own sweep widths, over
// long and CJK content rather than a full frame. width.go's own doc comment records the
// deviation from criterion 19's two-table sweep (Task 20b-ii's own scope).
func TestClampNeverExceedsWidth(t *testing.T) {
	th := NewTheme(true, ProfileTrueColor)
	sweepWidths := []int{20, 40, 60, 72, 79, 80, 81, 100, 120, 200, 400}
	longLine := strings.Repeat("the quick brown fox jumps over the lazy dog ", 20)
	cjk := strings.Repeat("你好世界", 40)
	for _, w := range sweepWidths {
		for _, s := range []string{longLine, cjk} {
			got := th.Clamp(s, w)
			if gotW := th.Width(got); gotW > w {
				t.Errorf("Clamp(%d) over width: got %d cells for width %d", w, gotW, w)
			}
		}
	}
}
