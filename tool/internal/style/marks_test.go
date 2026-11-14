package style

import (
	"reflect"
	"testing"

	"github.com/charmbracelet/colorprofile"
)

// ambiguousRunes names the East Asian Width=Ambiguous runes in unicodeMarks. They are the runes
// the two width tables disagree on: one cell narrow, two wide. Held's U+25CC and the spinner's
// braille are EAW=Neutral, and '?' is Narrow, so all three are absent.
var ambiguousRunes = map[rune]bool{
	'●': true, // U+25CF pass
	'■': true, // U+25A0 failing
	'□': true, // U+25A1 failing at warning
	'○': true, // U+25CB not started
	'▲': true, // U+25B2 warning
	'→': true, // U+2192 fix
	'─': true, // U+2500 rule
	'·': true, // U+00B7 separator
	'…': true, // U+2026 ellipsis
}

// markFields returns every field of m by name.
func markFields(m Marks) map[string]string {
	out := map[string]string{}
	v := reflect.ValueOf(m)
	for i := range v.NumField() {
		out[v.Type().Field(i).Name] = v.Field(i).String()
	}
	return out
}

// TestMarkWidths: every single-character mark of both tiers is one cell under the narrow table,
// each spinner frame on its own is one cell, and every single-character ASCII mark is one cell
// under both tables. The ASCII ellipsis and spinner are "..." and measure three under both.
func TestMarkWidths(t *testing.T) {
	narrow := NewTheme(true, colorprofile.TrueColor, false)
	wide := NewTheme(true, colorprofile.TrueColor, true)
	for _, ascii := range []bool{false, true} {
		for name, mark := range markFields(MarksFor(ascii)) {
			if name == "Spinner" && !ascii {
				frames := []rune(mark)
				if len(frames) != 8 {
					t.Errorf("Unicode Spinner has %d frames, want 8", len(frames))
				}
				for _, f := range frames {
					if w := narrow.Width(string(f)); w != 1 {
						t.Errorf("spinner frame %q is %d cells under the narrow table, want 1", f, w)
					}
				}
				continue
			}
			if ascii && (name == "Ellipsis" || name == "Spinner") {
				if mark != "..." {
					t.Errorf("ASCII %s = %q, want \"...\"", name, mark)
				}
				if narrow.Width(mark) != 3 || wide.Width(mark) != 3 {
					t.Errorf("ASCII %s measures %d/%d, want 3/3", name, narrow.Width(mark), wide.Width(mark))
				}
				continue
			}
			if w := narrow.Width(mark); w != 1 {
				t.Errorf("ascii=%v %s %q is %d cells under the narrow table, want 1", ascii, name, mark, w)
			}
			if ascii {
				if w := wide.Width(mark); w != 1 {
					t.Errorf("ASCII %s %q is %d cells under the wide table, want 1", name, mark, w)
				}
			}
		}
	}
}

// TestMarkParity: each ASCII mark is as wide as its Unicode counterpart, so a degrade
// substitution never shifts a column budget. Ellipsis and Spinner are exempt: their tiers differ
// in width by design.
func TestMarkParity(t *testing.T) {
	th := NewTheme(true, colorprofile.TrueColor, false)
	u, a := markFields(unicodeMarks), markFields(asciiMarks)
	for name, um := range u {
		if name == "Ellipsis" || name == "Spinner" {
			continue
		}
		if uw, aw := th.Width(um), th.Width(a[name]); uw != aw {
			t.Errorf("%s: unicode %q is %d cells, ascii %q is %d cells", name, um, uw, a[name], aw)
		}
	}
}

// TestEllipsisIsNeverATilde: a tilde reads as vi filler and collides with the rule mark.
func TestEllipsisIsNeverATilde(t *testing.T) {
	if unicodeMarks.Ellipsis == "~" || asciiMarks.Ellipsis == "~" {
		t.Fatal("ellipsis is a tilde")
	}
}

// TestAmbiguousRunesMatchTheTables: a Unicode mark is in ambiguousRunes exactly when the narrow
// and wide tables disagree on it, so the ASCII tier's wide table never meets one.
func TestAmbiguousRunesMatchTheTables(t *testing.T) {
	narrow := NewTheme(true, colorprofile.TrueColor, false)
	wide := NewTheme(true, colorprofile.TrueColor, true)
	for name, mark := range markFields(unicodeMarks) {
		if name == "Spinner" {
			continue
		}
		for _, r := range mark {
			differs := narrow.Width(string(r)) != wide.Width(string(r))
			if differs != ambiguousRunes[r] {
				t.Errorf("%s %q: tables disagree = %v, ambiguousRunes = %v", name, r, differs, ambiguousRunes[r])
			}
		}
	}
}

// TestMarksForPicksATier pins the tier choice.
func TestMarksForPicksATier(t *testing.T) {
	if MarksFor(false).Pass != "●" || MarksFor(true).Pass != "+" {
		t.Errorf("MarksFor tiers wrong: %q, %q", MarksFor(false).Pass, MarksFor(true).Pass)
	}
}
