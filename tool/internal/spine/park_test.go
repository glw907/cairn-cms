package spine

import (
	"slices"
	"testing"
)

// TestParkCodesAreAllListed holds the park vocabulary closed: every ParkCode constant declared in
// park.go is in parkCodes, which ReasonCodes publishes, and nothing else is, so a code added as a
// constant but left out of the list never reaches the reason catalogue.
func TestParkCodesAreAllListed(t *testing.T) {
	declared := declaredConsts(t, "park.go", "ParkCode")

	var listed []string
	for _, c := range parkCodes {
		listed = append(listed, string(c))
	}
	slices.Sort(listed)

	if !slices.Equal(declared, listed) {
		t.Fatalf("declared ParkCode constants and parkCodes differ:\ndeclared: %v\nlisted:   %v", declared, listed)
	}
}
