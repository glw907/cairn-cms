package newview

import (
	"strings"
	"testing"

	"charm.land/bubbles/v2/key"
	"github.com/charmbracelet/x/ansi"
)

func TestFooterRendersHintsThroughHelp(t *testing.T) {
	g := testGrid(80)
	start := key.NewBinding(key.WithKeys("enter"), key.WithHelp("Enter", "start"))
	quit := key.NewBinding(key.WithKeys("ctrl+c"), key.WithHelp("Ctrl+C", "quit"))
	got := g.Footer(start, quit)

	if want := "  Enter start · Ctrl+C quit"; ansi.Strip(got) != want {
		t.Errorf("footer = %q, want %q", ansi.Strip(got), want)
	}
	if !strings.Contains(got, g.Styles.Key.Render("Enter")) {
		t.Error("the key is not drawn in the bold key style")
	}
	if !strings.Contains(got, g.Styles.Muted.Render("start")) {
		t.Error("the verb is not drawn muted")
	}
}

func TestFooterSkipsADisabledBinding(t *testing.T) {
	g := testGrid(80)
	back := key.NewBinding(key.WithKeys("shift+tab"), key.WithHelp("Shift+Tab", "back"))
	back.SetEnabled(false)
	next := key.NewBinding(key.WithKeys("enter"), key.WithHelp("Enter", "next"))
	if got := ansi.Strip(g.Footer(next, back)); got != "  Enter next" {
		t.Errorf("footer = %q, want the disabled hint left out", got)
	}
}

func TestFooterUsesTheASCIISeparator(t *testing.T) {
	g := testGrid(80)
	g.Glyphs = GlyphsFor(true)
	a := key.NewBinding(key.WithKeys("a"), key.WithHelp("a", "one"))
	b := key.NewBinding(key.WithKeys("b"), key.WithHelp("b", "two"))
	if got := ansi.Strip(g.Footer(a, b)); got != "  a one - b two" {
		t.Errorf("footer = %q", got)
	}
}

func TestFooterBreaksBetweenHintsAtTheMeasure(t *testing.T) {
	g := testGrid(60)
	hints := []key.Binding{
		key.NewBinding(key.WithKeys("enter"), key.WithHelp("Enter", "set up")),
		key.NewBinding(key.WithKeys("e"), key.WithHelp("e", "edit email")),
		key.NewBinding(key.WithKeys("a"), key.WithHelp("a", "edit address")),
		key.NewBinding(key.WithKeys("ctrl+c"), key.WithHelp("Ctrl+C", "quit")),
	}
	got := ansi.Strip(g.Footer(hints...))
	if want := "  Enter set up · e edit email · a edit address\n  Ctrl+C quit"; got != want {
		t.Errorf("footer = %q, want %q", got, want)
	}
	for line := range strings.SplitSeq(got, "\n") {
		if w := ansi.StringWidth(line); w > g.Width-3 {
			t.Errorf("footer line %q is %d wide; it must end before the window's last column", line, w)
		}
	}
}
