package spine

import "testing"

// TestCatalogueCoversEveryVerdictAndStateWord asserts Catalogue names all four verdicts and all
// four state words exactly once, so `make copy-list`'s golden cannot silently drop one.
func TestCatalogueCoversEveryVerdictAndStateWord(t *testing.T) {
	got := Catalogue()
	if len(got) != 8 {
		t.Fatalf("Catalogue() returned %d entries, want 8", len(got))
	}

	want := []string{"OK", "WARNING", "CRITICAL", "UNKNOWN", "pass", "fail", "skip", "held"}
	seen := make(map[string]bool, len(got))
	for _, s := range got {
		seen[s] = true
	}
	for _, w := range want {
		if !seen[w] {
			t.Errorf("Catalogue() = %v, missing %q", got, w)
		}
	}
}
