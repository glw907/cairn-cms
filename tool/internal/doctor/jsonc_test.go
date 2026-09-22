package doctor

import "testing"

// TestStripJsoncBlockCommentSpansLines proves the fourth stripper case the acceptance criteria
// name that the committed corpus does not exercise: a /* */ comment whose body spans multiple
// lines is removed in full. The corpus's jsonc cases only ever carry a single-line block
// comment, so this reaches the multiline branch of stripJsonc's own indexString/'\n' scan
// directly; there is no isolated TypeScript test for this shape, since stripJsonc is not
// exported from wrangler-config.ts, so this is a plain Go unit test on the ported algorithm
// itself rather than a corpus case with a file:line citation.
func TestStripJsoncBlockCommentSpansLines(t *testing.T) {
	input := "{\n  /* this comment\n     spans several\n     lines */\n  \"name\": \"site\"\n}"
	got := stripJsonc(input)
	want := "{\n  \n  \"name\": \"site\"\n}"
	if got != want {
		t.Errorf("stripJsonc(%q) = %q, want %q", input, got, want)
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
