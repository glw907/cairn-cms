package spine

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// allReasonCodes enumerates every fixed ReasonCode constant, so a test that needs the whole set
// does not retype it.
var allReasonCodes = []ReasonCode{
	ReasonCredMissing, ReasonCredForbidden, ReasonCredRevoked, ReasonCredExpiring,
	ReasonTimeout, ReasonOffline, ReasonNotRun, ReasonNotObservable,
}

// conditionRegistryKey matches one of REGISTRY's own top-level keys in
// src/lib/diagnostics/conditions.ts: a quoted, dotted id starting a line at the object's
// indentation, immediately followed by its own opening brace.
var conditionRegistryKey = regexp.MustCompile(`^\s*'([a-z][a-z.-]*)':\s*\{`)

// conditionIDsIn reads conditions.ts and returns every id REGISTRY declares.
func conditionIDsIn(path string) (map[string]bool, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	found := make(map[string]bool)
	inRegistry := false
	for line := range strings.SplitSeq(string(data), "\n") {
		if strings.Contains(line, "export const REGISTRY") {
			inRegistry = true
			continue
		}
		if !inRegistry {
			continue
		}
		if strings.HasPrefix(strings.TrimSpace(line), "};") {
			break
		}
		if m := conditionRegistryKey.FindStringSubmatch(line); m != nil {
			found[m[1]] = true
		}
	}
	return found, nil
}

// TestConditionsMatchRegistry reads src/lib/diagnostics/conditions.ts through providers.RepoRoot
// and asserts Conditions() equals REGISTRY's own id set, so a condition id added or renamed on
// the TypeScript side fails here.
//
// A failure is a decision for a human, never an automatic follow. Condition ids are frozen in
// the tool's own copy and published in tool/docs/reference/json-output.md, so renaming one here
// to match the engine breaks every agent reading that contract. Renaming the id is a
// major-version event carrying a "Consumers must:" line; adding one is not.
func TestConditionsMatchRegistry(t *testing.T) {
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}
	path := filepath.Join(root, "src", "lib", "diagnostics", "conditions.ts")

	registryIDs, err := conditionIDsIn(path)
	if err != nil {
		t.Fatalf("scan %s: %v", path, err)
	}
	if len(registryIDs) == 0 {
		t.Fatalf("found no condition ids in %s; the scan is broken", path)
	}

	var tsIDs []string
	for id := range registryIDs {
		tsIDs = append(tsIDs, id)
	}
	slices.Sort(tsIDs)

	var goIDs []string
	for _, c := range Conditions() {
		goIDs = append(goIDs, string(c))
	}
	slices.Sort(goIDs)

	if !slices.Equal(tsIDs, goIDs) {
		t.Fatalf("condition id sets differ; read the note above before changing either side:\nconditions.ts: %v\nspine:         %v", tsIDs, goIDs)
	}
}

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

	for _, r := range allReasonCodes {
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
