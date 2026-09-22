package doctor

import "testing"

// TestReadWranglerConfigMatchesCorpus asserts the Go reader's output equals the engine's own
// answer for every committed corpus case, case by case. The engine's answer was lifted at
// authoring time from the TypeScript test named in each case file (loadWranglerCorpus enforces
// that every case names one), never re-derived here: this test cannot run the engine's own
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
