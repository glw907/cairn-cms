package render

import (
	"reflect"
	"slices"
	"testing"
)

// TestFrameSections is criterion 25: Frame is exactly the three sections the 2.0 HUD pins, each
// a slice of lines, so a HUD can hold the header still and scroll the body without knowing what
// a body composed.
func TestFrameSections(t *testing.T) {
	lines := reflect.TypeFor[[]string]()
	var got []string
	for f := range reflect.TypeFor[Frame]().Fields() {
		if f.Type != lines {
			t.Errorf("Frame.%s is %s, want []string", f.Name, f.Type)
		}
		got = append(got, f.Name)
	}
	if want := []string{"Header", "Body", "Footer"}; !slices.Equal(got, want) {
		t.Errorf("Frame's fields are %v, want %v in that order", got, want)
	}
}

// TestFrameLinesOrder is criterion 25's second half: Lines concatenates the three sections in
// header, body, footer order, which is the order every golden is cut in.
func TestFrameLinesOrder(t *testing.T) {
	f := Frame{
		Header: []string{"h1", "h2"},
		Body:   []string{"b1"},
		Footer: []string{"f1", "f2"},
	}
	want := []string{"h1", "h2", "b1", "f1", "f2"}
	if got := f.Lines(); !slices.Equal(got, want) {
		t.Errorf("Lines() = %v, want %v", got, want)
	}
	if got := (Frame{}).Lines(); len(got) != 0 {
		t.Errorf("the zero Frame's Lines() = %v, want no lines", got)
	}
}
