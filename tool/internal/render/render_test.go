package render

import (
	"reflect"
	"slices"
	"testing"
)

// TestFrameSections holds Frame to exactly three sections, each a slice of lines, in header,
// body, footer order.
func TestFrameSections(t *testing.T) {
	lines := reflect.TypeFor[[]string]()
	var got []string
	for f := range reflect.TypeFor[Frame]().Fields() {
		if f.Type != lines {
			t.Errorf("Frame.%s is %s, want []string", f.Name, f.Type)
		}
		got = append(got, f.Name)
	}
	if want := []string{"header", "body", "footer"}; !slices.Equal(got, want) {
		t.Errorf("Frame's fields are %v, want %v in that order", got, want)
	}
}

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
