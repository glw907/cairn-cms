package newview

import (
	"strings"
	"testing"

	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"
)

func testGrid(width int) Grid {
	return Grid{Styles: NewStyles(true, colorprofile.TrueColor), Glyphs: GlyphsFor(false), Width: width}
}

// column returns the display column where needle starts in the ANSI-stripped line, or -1.
func column(line, needle string) int {
	plain := ansi.Strip(line)
	before, _, found := strings.Cut(plain, needle)
	if !found {
		return -1
	}
	return ansi.StringWidth(before)
}

func TestContentWidth(t *testing.T) {
	tests := []struct{ width, want int }{
		{80, 76}, {200, 76}, {60, 56}, {50, 46}, {24, 20}, {5, 20},
	}
	for _, tt := range tests {
		if got := testGrid(tt.width).ContentWidth(); got != tt.want {
			t.Errorf("ContentWidth at %d = %d, want %d", tt.width, got, tt.want)
		}
	}
}

func TestCellValuesLandOnColumn20(t *testing.T) {
	g := testGrid(80)
	labels := []string{"Domain", "Storage bucket", "Invite an editor", "Sign-in email"}
	for _, label := range labels {
		row := g.Cell(label, g.Styles.Muted, "value", "second line")
		ls := strings.Split(row, "\n")
		if got := column(ls[0], "value"); got != 20 {
			t.Errorf("%q: value at column %d, want 20", label, got)
		}
		if got := column(ls[0], label); got != 2 {
			t.Errorf("%q: label at column %d, want 2", label, got)
		}
		if got := column(ls[1], "second line"); got != 20 {
			t.Errorf("%q: wrapped line at column %d, want 20", label, got)
		}
	}
}

func TestWrappedValueLinesStayInTheMeasure(t *testing.T) {
	g := testGrid(60)
	text := "Cloudflare sends email only from a domain on your account, so setup needs one."
	row := g.Cell("Why", g.Styles.Muted, g.WrapValue(RoleText, text)...)
	ls := strings.Split(row, "\n")
	if len(ls) < 2 {
		t.Fatalf("expected the value to wrap, got %q", row)
	}
	for i, l := range ls {
		if w := ansi.StringWidth(l); w > g.ContentWidth()+ColMargin {
			t.Errorf("line %d is %d cells, past the measure", i, w)
		}
		if i > 0 && column(l, strings.TrimSpace(ansi.Strip(l))) != ColValue {
			t.Errorf("line %d starts at column %d, want %d", i, column(l, strings.TrimSpace(ansi.Strip(l))), ColValue)
		}
	}
}

func TestMarkAndDetailColumns(t *testing.T) {
	g := testGrid(80)
	if got := column(Mark("●", "Create the repository"), "Create"); got != 4 {
		t.Errorf("mark text at column %d, want 4", got)
	}
	if got := column(Mark("●", "x"), "●"); got != 2 {
		t.Errorf("mark at column %d, want 2", got)
	}
	for i, l := range strings.Split(g.Detail("Setup is waiting for the second approval in your browser tab, which opens next."), "\n") {
		if got := column(l, strings.TrimSpace(ansi.Strip(l))); got != 4 {
			t.Errorf("detail line %d at column %d, want 4", i, got)
		}
	}
}

func TestParaStartsAtTheMargin(t *testing.T) {
	for i, l := range strings.Split(testGrid(80).Para(RoleText, "You approve four requests in your browser."), "\n") {
		if got := column(l, "You"); i == 0 && got != 2 {
			t.Errorf("paragraph at column %d, want 2", got)
		}
	}
}

func TestFrameSeparatesBlocksWithOneBlankLine(t *testing.T) {
	got := Frame("a", "", "b", "c")
	if want := "\na\n\nb\n\nc"; got != want {
		t.Errorf("Frame = %q, want %q", got, want)
	}
}

func lastLineWords(ls []string) int { return len(strings.Fields(ls[len(ls)-1])) }

func TestBalanceLeavesNoLoneWordAndKeepsTheLineCount(t *testing.T) {
	texts := []string{
		"Setup creates your site on GitHub and Cloudflare and publishes it to your domain.",
		"The admin sends sign-in links by email. Cloudflare sends email only from a domain on your account.",
		"Approve each request in the setup tab. The next request opens in the same tab.",
	}
	for _, text := range texts {
		for _, w := range []int{76, 60, 46} {
			plain := Wrap(text, w)
			got := Balance(text, w)
			if len(got) != len(plain) {
				t.Errorf("w=%d: balanced into %d lines, plain wrap gives %d", w, len(got), len(plain))
			}
			if len(got) > 1 && lastLineWords(got) < 2 {
				t.Errorf("w=%d: last line is one lone word: %q", w, got[len(got)-1])
			}
			if len(got) < 2 {
				continue
			}
			widest := 0
			for _, l := range got {
				widest = max(widest, ansi.StringWidth(l))
			}
			if narrower := Wrap(text, widest-1); len(narrower) == len(got) {
				t.Errorf("w=%d: wrapping at %d keeps %d lines, so %d was not the narrowest", w, widest-1, len(got), widest)
			}
		}
	}
}

func TestPlainWrapStrandsALoneWordWhereBalanceDoesNot(t *testing.T) {
	text := "Setup creates your site on GitHub and Cloudflare and publishes it to your domain."
	if lastLineWords(Wrap(text, 76)) >= 2 {
		t.Fatal("fixture no longer strands a word at 76; pick a longer sentence")
	}
	if lastLineWords(Balance(text, 76)) < 2 {
		t.Error("Balance left a lone word")
	}
}

func TestWrapKeepsHyphenatedWordsWhole(t *testing.T) {
	for _, l := range Wrap("Cloudflare sends a sign-in link to the address", 24) {
		if strings.HasSuffix(l, "sign-") || strings.HasPrefix(l, "in ") {
			t.Errorf("sign-in split across lines: %q", l)
		}
	}
}

func TestPackFillsLinesUpToTheWidth(t *testing.T) {
	g := testGrid(80)
	ls := g.Pack(30, "alpha-one", "beta-two", "gamma-three")
	if len(ls) != 2 {
		t.Fatalf("Pack gave %d lines, want 2: %q", len(ls), ls)
	}
	if got := ansi.Strip(ls[0]); got != "alpha-one · beta-two" {
		t.Errorf("first line = %q", got)
	}
}
