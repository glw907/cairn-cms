package spine

import (
	"strings"
	"testing"
)

// TestConditionNoneIsTheOnlyUndotted asserts every declared Condition other than ConditionNone
// carries a dotted id, and ConditionNone is the package's only undotted value.
func TestConditionNoneIsTheOnlyUndotted(t *testing.T) {
	if ConditionNone != "" {
		t.Fatalf("ConditionNone = %q, want the empty string", ConditionNone)
	}
	for _, c := range Conditions() {
		if !strings.Contains(string(c), ".") {
			t.Errorf("Condition %q carries no dot; only ConditionNone may be undotted", c)
		}
	}
}

// TestConditionsNeverCollideWithReasonOrParkCodes asserts the three vocabularies stay disjoint: a
// ReasonCode or a ParkCode is never mistaken for a Condition, since they answer different
// questions (why a check could not observe a verdict, versus which known failure mode it named).
func TestConditionsNeverCollideWithReasonOrParkCodes(t *testing.T) {
	all := Conditions()
	conditionSet := make(map[string]bool, len(all)+1)
	conditionSet[string(ConditionNone)] = true
	for _, c := range all {
		conditionSet[string(c)] = true
	}

	for _, r := range fixedReasonCodes {
		if conditionSet[string(r)] {
			t.Errorf("ReasonCode %q collides with a Condition constant", r)
		}
	}

	for _, p := range allParkCodes {
		if conditionSet[string(p)] {
			t.Errorf("ParkCode %q collides with a Condition constant", p)
		}
	}
}
