package doctor

import (
	"encoding/json"
	"strings"
	"testing"
)

// TestReadWranglerConfigMatchesCorpus asserts the Go reader's output equals the engine's
// answer for every committed corpus case, case by case. The engine's answer was lifted at
// authoring time from the TypeScript test named in each case file (loadWranglerCorpus enforces
// that every case names one), never re-derived here: this test cannot run the engine's
// reader, so proving agreement depends entirely on the committed expectation being a faithful
// copy.
func TestReadWranglerConfigMatchesCorpus(t *testing.T) {
	for _, c := range loadWranglerCorpus(t) {
		t.Run(c.Name, func(t *testing.T) {
			s := snapshotWithFiles(t, c.Files)
			facts, found, err := ReadWranglerConfig(s)

			if c.WantError != "" {
				if err == nil {
					t.Fatalf("source %s: want error %q, got nil", c.SourceTest, c.WantError)
				}
				if err.Error() != c.WantError {
					t.Fatalf("source %s: error = %q, want %q", c.SourceTest, err.Error(), c.WantError)
				}
				return
			}
			if err != nil {
				t.Fatalf("source %s: unexpected error: %v", c.SourceTest, err)
			}
			if found != c.Found {
				t.Fatalf("source %s: found = %v, want %v", c.SourceTest, found, c.Found)
			}
			if !found {
				return
			}
			want := WranglerFacts{
				HasEmailBinding:      c.Facts.HasEmailBinding,
				HasAuthDB:            c.Facts.HasAuthDB,
				ObservabilityEnabled: c.Facts.ObservabilityEnabled,
				HasPublicOrigin:      c.Facts.HasPublicOrigin,
				PublicOrigin:         c.Facts.PublicOrigin,
				R2Buckets:            c.Facts.R2Buckets,
			}
			if !wranglerFactsEqual(facts, want) {
				t.Errorf("source %s: facts = %+v, want %+v", c.SourceTest, facts, want)
			}
		})
	}
}

// wranglerFactsEqual compares two WranglerFacts, treating a nil R2Buckets the same as an empty
// one: the corpus writes an empty JSON array ([]string{}) for "declares none", and the Go reader
// never allocates a slice for that case, which reflect.DeepEqual would otherwise fail on.
func wranglerFactsEqual(a, b WranglerFacts) bool {
	if a.HasEmailBinding != b.HasEmailBinding ||
		a.HasAuthDB != b.HasAuthDB ||
		a.ObservabilityEnabled != b.ObservabilityEnabled ||
		a.HasPublicOrigin != b.HasPublicOrigin ||
		a.PublicOrigin != b.PublicOrigin {
		return false
	}
	if len(a.R2Buckets) != len(b.R2Buckets) {
		return false
	}
	for i := range a.R2Buckets {
		if a.R2Buckets[i] != b.R2Buckets[i] {
			return false
		}
	}
	return true
}

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
