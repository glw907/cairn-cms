package spine

import (
	"os"
	"slices"
	"strings"
	"testing"
)

// diffIDSets returns the ids exclusive to a in onlyInA and the ids exclusive to b in onlyInB. Both
// are empty exactly when a and b hold the same set of ids, regardless of order or duplicates.
func diffIDSets(a, b []string) (onlyInA, onlyInB []string) {
	inB := make(map[string]bool, len(b))
	for _, id := range b {
		inB[id] = true
	}
	for _, id := range a {
		if !inB[id] {
			onlyInA = append(onlyInA, id)
		}
	}
	inA := make(map[string]bool, len(a))
	for _, id := range a {
		inA[id] = true
	}
	for _, id := range b {
		if !inA[id] {
			onlyInB = append(onlyInB, id)
		}
	}
	return onlyInA, onlyInB
}

// TestDiffIDSets proves diffIDSets catches the three ways two id sets can disagree: a renamed id
// (each side carries one the other lacks), an id the mirror carries that the constants do not,
// and an id the constants carry that the mirror does not. TestConditionsMatchEmbeddedMirror below
// relies on this same function to hold the real constant and mirror sets to the same bar.
func TestDiffIDSets(t *testing.T) {
	tests := []struct {
		name        string
		a, b        []string
		wantOnlyInA []string
		wantOnlyInB []string
	}{
		{
			name: "equal sets",
			a:    []string{"a", "b", "c"},
			b:    []string{"a", "b", "c"},
		},
		{
			name:        "renamed id",
			a:           []string{"a", "b", "c"},
			b:           []string{"a", "b", "c-renamed"},
			wantOnlyInA: []string{"c"},
			wantOnlyInB: []string{"c-renamed"},
		},
		{
			name:        "mirror carries an id constants do not",
			a:           []string{"a", "b"},
			b:           []string{"a", "b", "c"},
			wantOnlyInB: []string{"c"},
		},
		{
			name:        "constants carry an id the mirror does not",
			a:           []string{"a", "b", "c"},
			b:           []string{"a", "b"},
			wantOnlyInA: []string{"c"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			onlyInA, onlyInB := diffIDSets(tt.a, tt.b)
			if !slices.Equal(onlyInA, tt.wantOnlyInA) {
				t.Errorf("onlyInA = %v, want %v", onlyInA, tt.wantOnlyInA)
			}
			if !slices.Equal(onlyInB, tt.wantOnlyInB) {
				t.Errorf("onlyInB = %v, want %v", onlyInB, tt.wantOnlyInB)
			}
		})
	}
}

// TestConditionsMatchEmbeddedMirror asserts the typed Conditions() constants and conditions.json's
// own id set are identical, replacing the former TestConditionsMatchRegistry, which walked up to
// the repository root to read src/lib/diagnostics/conditions.ts. The mirror now carries the text,
// so the comparison is embed against constant, not constant against a second repository's source.
//
// A failure here is a decision for a human, never an automatic follow. Condition ids are frozen in
// the tool's own copy and published in tool/docs/reference/json-output.md, so renaming one here to
// match the engine breaks every agent reading that contract. Renaming the id is a major-version
// event carrying a "Consumers must:" line; adding one is not.
func TestConditionsMatchEmbeddedMirror(t *testing.T) {
	var constantIDs []string
	for _, c := range Conditions() {
		constantIDs = append(constantIDs, string(c))
	}
	mirrorIDs := embeddedConditionIDs()

	onlyInConstants, onlyInMirror := diffIDSets(constantIDs, mirrorIDs)
	if len(onlyInConstants) > 0 || len(onlyInMirror) > 0 {
		slices.Sort(onlyInConstants)
		slices.Sort(onlyInMirror)
		t.Fatalf("condition id sets differ; read the note above before changing either side:\nonly in constants:      %v\nonly in embedded mirror: %v", onlyInConstants, onlyInMirror)
	}
}

// repoRootSymbol is the providers package's repository-root finder, held as a runtime-built
// string so this file's own source never spells it out literally, which would trip the very
// check TestConditionTestFilesNameNoRepoRoot performs against this file.
var repoRootSymbol = "providers" + "." + "RepoRoot"

// TestConditionTestFilesNameNoRepoRoot asserts neither this file nor condition_test.go names the
// providers package's repository-root finder: the old drift test walked up to the repository
// root to read conditions.ts, and the replacement reads the embedded mirror instead, needing no
// repository at all.
func TestConditionTestFilesNameNoRepoRoot(t *testing.T) {
	for _, name := range []string{"conditions_test.go", "condition_test.go"} {
		data, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		if strings.Contains(string(data), repoRootSymbol) {
			t.Errorf("%s names the providers package's repository-root finder; the mirror-based test should need no repository", name)
		}
	}
}

// TestTextFor proves the text accessor on the three cases the drift test's sibling coverage does
// not reach: a condition carrying every field, one carrying no logEvent, and an id the mirror
// does not hold.
func TestTextFor(t *testing.T) {
	t.Run("every field", func(t *testing.T) {
		got, ok := TextFor(ConditionAuthCSRFOriginMismatch)
		if !ok {
			t.Fatalf("TextFor(%q) not found", ConditionAuthCSRFOriginMismatch)
		}
		want := ConditionText{
			ID:          ConditionAuthCSRFOriginMismatch,
			Severity:    CriticalFailure,
			Title:       "Non-admin form Origin rejected",
			Why:         "A non-admin unsafe form POST carried an Origin that did not match the site, so cairn's restored framework Origin check rejected it.",
			Remediation: "Post the form from the same origin, or check a proxy that strips or rewrites the Origin header.",
			DocsAnchor:  "is-it-working.md#non-admin-origin-rejected",
			LogEvent:    "guard.refused",
		}
		if got != want {
			t.Errorf("TextFor(%q) = %+v, want %+v", ConditionAuthCSRFOriginMismatch, got, want)
		}
	})

	t.Run("no logEvent", func(t *testing.T) {
		got, ok := TextFor(ConditionAdminMountIncomplete)
		if !ok {
			t.Fatalf("TextFor(%q) not found", ConditionAdminMountIncomplete)
		}
		if got.LogEvent != "" {
			t.Errorf("LogEvent = %q, want empty", got.LogEvent)
		}
		if got.Severity != WarningFailure {
			t.Errorf("Severity = %v, want WarningFailure", got.Severity)
		}
		if got.Title != "Custom /admin mount looks incomplete" {
			t.Errorf("Title = %q, want the mirror's title", got.Title)
		}
	})

	t.Run("id the mirror does not hold", func(t *testing.T) {
		got, ok := TextFor(Condition("no.such-condition"))
		if ok {
			t.Fatalf("TextFor(%q) = %+v, ok = true, want not found", Condition("no.such-condition"), got)
		}
		if got != (ConditionText{}) {
			t.Errorf("TextFor on a miss returned %+v, want the zero value", got)
		}
	})
}
