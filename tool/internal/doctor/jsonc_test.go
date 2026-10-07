package doctor

import (
	"encoding/json"
	"strings"
	"testing"
)

// TestStripJsoncBlockCommentSpansLines proves a /* */ comment whose body spans several lines is
// blanked in full, a case the committed corpus does not exercise: its jsonc cases only ever carry a
// single-line block comment.
func TestStripJsoncBlockCommentSpansLines(t *testing.T) {
	input := "{\n  /* this comment\n     spans several\n     lines */\n  \"name\": \"site\"\n}"
	got := stripJsonc(input)
	for _, word := range []string{"comment", "spans", "lines", "/*", "*/"} {
		if strings.Contains(got, word) {
			t.Errorf("stripJsonc(%q) = %q, want %q blanked", input, got, word)
		}
	}
	var decoded map[string]string
	if err := json.Unmarshal([]byte(got), &decoded); err != nil {
		t.Fatalf("stripJsonc(%q) = %q, which does not decode: %v", input, got, err)
	}
	if decoded["name"] != "site" {
		t.Errorf("name = %q, want site", decoded["name"])
	}
}

// TestFactsFromConfigIgnoresMisCasedKey proves the acceptance criterion that a mis-cased key is
// not read: "Observability" (capital O) produces no observability fact, the same verdict the
// engine gives, since JSON.parse's property access is exact-case and this reader decodes into
// map[string]any and indexes with the exact lowercase key rather than a struct, which
// encoding/json would otherwise match to a field case-insensitively.
func TestFactsFromConfigIgnoresMisCasedKey(t *testing.T) {
	facts, err := factsFromJsonc([]byte(`{ "Observability": { "enabled": true } }`))
	if err != nil {
		t.Fatalf("factsFromJsonc: %v", err)
	}
	if facts.ObservabilityEnabled {
		t.Error("ObservabilityEnabled = true, want false: the mis-cased \"Observability\" key must not be read")
	}
}
