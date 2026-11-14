package render

import (
	"slices"
	"testing"
)

// TestFrameLinesOrder: Lines concatenates the three sections in
// header, body, footer order, which is the order every golden is cut in.
func TestFrameLinesOrder(t *testing.T) {
	f := Frame{
		header: []string{"h1", "h2"},
		body:   []string{"b1"},
		footer: []string{"f1", "f2"},
	}
	want := []string{"h1", "h2", "b1", "f1", "f2"}
	if got := f.Lines(); !slices.Equal(got, want) {
		t.Errorf("Lines() = %v, want %v", got, want)
	}
	if got := (Frame{}).Lines(); len(got) != 0 {
		t.Errorf("the zero Frame's Lines() = %v, want no lines", got)
	}
}
