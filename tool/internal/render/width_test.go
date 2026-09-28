package render

import (
	"strings"
	"testing"
)

// TestWidthRungConstants pins criterion 18's numbers: a floor of 40, a single-column threshold of
// 60, and a wide cap of 120.
func TestWidthRungConstants(t *testing.T) {
	if widthFloor != 40 {
		t.Errorf("widthFloor = %d, want 40", widthFloor)
	}
	if widthNarrow != 60 {
		t.Errorf("widthNarrow = %d, want 60", widthNarrow)
	}
	if Width80 != 80 {
		t.Errorf("Width80 = %d, want 80", Width80)
	}
	if width100 != 100 {
		t.Errorf("width100 = %d, want 100", width100)
	}
	if widthCap != 120 {
		t.Errorf("widthCap = %d, want 120", widthCap)
	}
}

// TestContentClampsToCap is criterion 18's wide cap: content stops growing past widthCap.
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
	r80 := th.rule(false, 80)
	r90 := th.rule(false, 90)
	if r80 == r90 {
		t.Fatal("rule(80) and rule(90) are byte-identical; width must be honoured exactly, not snapped to a rung")
	}
	if got := th.width(r80); got != 80 {
		t.Errorf("width(rule(80)) = %d, want 80", got)
	}
	if got := th.width(r90); got != 90 {
		t.Errorf("width(rule(90)) = %d, want 90", got)
	}
}

// TestDegenerateWidthsNeverPanic is criterion 20: 0, 1, 2, 5, 19, and a negative value each render
// without panicking, on both rule and clamp.
func TestDegenerateWidthsNeverPanic(t *testing.T) {
	th := NewTheme(true, ProfileTrueColor)
	widths := []int{0, 1, 2, 5, 19, -1, -400}
	for _, w := range widths {
		for _, ascii := range []bool{false, true} {
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Errorf("rule(%v, %d) panicked: %v", ascii, w, r)
					}
				}()
				_ = th.rule(ascii, w)
			}()
			func() {
				defer func() {
					if r := recover(); r != nil {
						t.Errorf("clamp(..., %d) panicked: %v", w, r)
					}
				}()
				got := th.clamp("a long line of dynamic content a site handed us", w)
				if gotW := th.width(got); gotW > max(w, 1) {
					t.Errorf("clamp(..., %d) = %q, %d cells, want at most %d", w, got, gotW, max(w, 1))
				}
			}()
		}
	}
}

// TestClampNeverExceedsWidth is the nearest sound form of criterion 19 that this task's own
// primitives can prove: 20a has no body compositor yet (Task 20b-i), so this exercises clamp,
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
			got := th.clamp(s, w)
			if gotW := th.width(got); gotW > w {
				t.Errorf("clamp(%d) over width: got %d cells for width %d", w, gotW, w)
			}
		}
	}
}
