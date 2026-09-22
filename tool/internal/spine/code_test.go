package spine

import (
	"strings"
	"testing"
)

// TestCodeNoneIsTheOnlyUndotted asserts every declared Code other than CodeNone carries a dot,
// and CodeNone is the package's only undotted value, the same shape TestConditionNoneIsTheOnly
// Undotted holds for Condition.
func TestCodeNoneIsTheOnlyUndotted(t *testing.T) {
	if CodeNone != "" {
		t.Fatalf("CodeNone = %q, want the empty string", CodeNone)
	}
	for _, c := range Codes() {
		if !strings.Contains(string(c), ".") {
			t.Errorf("Code %q carries no dot; only CodeNone may be undotted", c)
		}
	}
}

// TestCodesAreToolPrefixed asserts every declared Code starts with "tool.", the prefix that
// keeps a Code from ever being mistaken for a Condition, which carries the engine's own
// domain-prefixed ids (edge., email., config., and so on).
func TestCodesAreToolPrefixed(t *testing.T) {
	for _, c := range Codes() {
		if !strings.HasPrefix(string(c), "tool.") {
			t.Errorf("Code %q does not start with \"tool.\"", c)
		}
	}
}

// TestCodesNeverCollideWithConditions asserts the two vocabularies stay disjoint, so a fix table
// keyed on "whichever of Condition or Code a verdict carries" never resolves the wrong row.
func TestCodesNeverCollideWithConditions(t *testing.T) {
	conditionSet := make(map[string]bool, len(Conditions())+1)
	conditionSet[string(ConditionNone)] = true
	for _, cond := range Conditions() {
		conditionSet[string(cond)] = true
	}
	for _, c := range Codes() {
		if conditionSet[string(c)] {
			t.Errorf("Code %q collides with a Condition constant", c)
		}
	}
}

// TestCodeStringReturnsItsOwnValue asserts String is not a formatting no-op mistake: it must
// return exactly the value the constant holds.
func TestCodeStringReturnsItsOwnValue(t *testing.T) {
	if got, want := CodeHTTPSHSTSOff.String(), "tool.https-hsts-off"; got != want {
		t.Errorf("String() = %q, want %q", got, want)
	}
}
