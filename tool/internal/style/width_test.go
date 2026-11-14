package style

import (
	"reflect"
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
)

// TestContentClampsToCap: ContentWidth stops growing past widthCap.
func TestContentClampsToCap(t *testing.T) {
	tests := []struct {
		in, want int
	}{
		{0, 1}, {1, 1}, {-5, 1}, {40, 40}, {120, 120}, {121, 120}, {2560, 120},
	}
	for _, tt := range tests {
		if got := ContentWidth(tt.in); got != tt.want {
			t.Errorf("ContentWidth(%d) = %d, want %d", tt.in, got, tt.want)
		}
	}
}

// TestWidthTablesDisagreeOnAmbiguous: the two tables are the two readings NewTheme's ascii
// argument picks between.
func TestWidthTablesDisagreeOnAmbiguous(t *testing.T) {
	narrow := NewTheme(true, colorprofile.TrueColor, false)
	wide := NewTheme(true, colorprofile.TrueColor, true)
	if narrow.Width("●") != 1 || wide.Width("●") != 2 {
		t.Errorf("● measures %d/%d, want 1/2", narrow.Width("●"), wide.Width("●"))
	}
	if got := narrow.Width("\x1b[31mab\x1b[0m"); got != 2 {
		t.Errorf("escape sequences are not discounted: %d, want 2", got)
	}
	if (Theme{}).Width("●") != 1 {
		t.Error("the zero Theme must measure narrow")
	}
}

// TestWrapBreaksOnlyOnTheSpace: a hyphen never breaks, an overlong token is hard-wrapped, and a
// width past the cap clamps to it.
func TestWrapBreaksOnlyOnTheSpace(t *testing.T) {
	th := NewTheme(true, colorprofile.TrueColor, false)
	got := th.WrapGreedy("renew by 2026-09-25 please", 12)
	want := []string{"renew by", "2026-09-25", "please"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("WrapGreedy = %q, want %q", got, want)
	}
	if got := th.WrapGreedy("abcdefghij", 4); !reflect.DeepEqual(got, []string{"abcd", "efgh", "ij"}) {
		t.Errorf("hard wrap = %q", got)
	}
	long := strings.Repeat("word ", 60)
	for _, l := range th.WrapGreedy(long, 500) {
		if th.Width(l) > widthCap {
			t.Errorf("line %q is wider than the cap", l)
		}
	}
	if th.WrapGreedy("", 10) != nil {
		t.Error("empty text must wrap to no lines")
	}
}

// TestWrapPullsAWordOffAnOrphan: Wrap leaves no single word alone on the last line where the
// line above can spare one, and WrapGreedy does.
func TestWrapPullsAWordOffAnOrphan(t *testing.T) {
	th := NewTheme(true, colorprofile.TrueColor, false)
	text := "aaaa bbbb cccc dddd"
	if got := th.WrapGreedy(text, 14); !reflect.DeepEqual(got, []string{"aaaa bbbb cccc", "dddd"}) {
		t.Fatalf("WrapGreedy = %q", got)
	}
	if got := th.Wrap(text, 14); !reflect.DeepEqual(got, []string{"aaaa bbbb", "cccc dddd"}) {
		t.Errorf("Wrap = %q, want the last word pulled down", got)
	}
	if got := th.Wrap("aaaaaaaaaaaaaa b", 14); !reflect.DeepEqual(got, []string{"aaaaaaaaaaaaaa", "b"}) {
		t.Errorf("Wrap gave up wrongly: %q", got)
	}
}

// TestWrapMeasuresUnderTheThemesTable: the ASCII tier budgets an Ambiguous rune at two cells.
func TestWrapMeasuresUnderTheThemesTable(t *testing.T) {
	text := "●● ●● ●●"
	narrow := NewTheme(true, colorprofile.TrueColor, false).WrapGreedy(text, 8)
	wide := NewTheme(true, colorprofile.TrueColor, true).WrapGreedy(text, 8)
	if len(narrow) != 1 || len(wide) != 3 {
		t.Errorf("narrow %q wide %q, want one line and three", narrow, wide)
	}
}

// TestDegenerateWrapWidthsNeverPanic: 0, 1, and a negative width neither panic nor loop.
func TestDegenerateWrapWidthsNeverPanic(t *testing.T) {
	th := NewTheme(true, colorprofile.TrueColor, false)
	for _, w := range []int{0, 1, 2, -1, -400} {
		for _, l := range th.Wrap("a long line of 你好世界 content", w) {
			if th.Width(l) > 2 && w < 2 {
				t.Errorf("width %d produced line %q", w, l)
			}
		}
		_ = th.WrapGreedy("x", w)
	}
}
