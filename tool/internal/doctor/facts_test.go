package doctor

import (
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestAbsentSiteFactsMakesAllThreeChecksUnknown asserts config.media-bucket, auth.role-wiring,
// and ai.posture-effective all report unchecked with the exact factsAbsentDetail message when
// site-facts.json does not exist, and that the whole run's spine.ExitCode reads VerdictUnknown
// from those results alone, over the package's own verdicts rather than a process exit code (no
// command exists until Task 8).
func TestAbsentSiteFactsMakesAllThreeChecksUnknown(t *testing.T) {
	s := snapshotWithFiles(t, nil)

	checks := []Check{ConfigMediaBucket, AuthRoleWiring, AIPostureEffective}
	var results []Result
	for _, c := range checks {
		result := c.Run(s)
		t.Run(c.ID, func(t *testing.T) {
			if result.Status != StatusUnchecked {
				t.Fatalf("Status = %v, want StatusUnchecked (detail %q)", result.Status, result.Detail)
			}
			if result.Detail != "needs engine 0.97.0 or later, and one build" {
				t.Errorf("Detail = %q, want the exact absent-facts message", result.Detail)
			}
		})
		results = append(results, result)
	}

	got := spine.ExitCode([]spine.SiteVerdicts{Verdicts(results)}, nil, 0)
	if got != spine.VerdictUnknown {
		t.Errorf("ExitCode = %v, want VerdictUnknown", got)
	}
}

// TestSiteFactsVersionMismatch asserts a site-facts.json carrying a version other than 1 fails
// ReadSiteFacts with a message naming the file and the version found, rather than guessing at
// its shape.
func TestSiteFactsVersionMismatch(t *testing.T) {
	s := snapshotWithFiles(t, map[string]string{
		"src/content/.cairn/site-facts.json": `{"version": 2, "mediaBucketBinding": "MEDIA"}`,
	})

	_, found, err := ReadSiteFacts(s)
	if found {
		t.Fatal("found = true, want false on a version mismatch")
	}
	if err == nil {
		t.Fatal("err = nil, want an error naming the file and the version found")
	}
	if !strings.Contains(err.Error(), siteFactsRelPath) {
		t.Errorf("error %q does not name the file %q", err.Error(), siteFactsRelPath)
	}
	if !strings.Contains(err.Error(), "2") {
		t.Errorf("error %q does not name the version found", err.Error())
	}
}

// TestSiteFactsVersionMismatchPropagatesAsUnchecked asserts a version mismatch surfaces through
// a facts-dependent check as unchecked, carrying the same file-and-version message, rather than
// a panic or a silently wrong result.
func TestSiteFactsVersionMismatchPropagatesAsUnchecked(t *testing.T) {
	s := snapshotWithFiles(t, map[string]string{
		"src/content/.cairn/site-facts.json": `{"version": 3}`,
	})

	result := ConfigMediaBucket.Run(s)
	if result.Status != StatusUnchecked {
		t.Fatalf("Status = %v, want StatusUnchecked (detail %q)", result.Status, result.Detail)
	}
	if !strings.Contains(result.Detail, siteFactsRelPath) || !strings.Contains(result.Detail, "3") {
		t.Errorf("Detail = %q, want it to name the file and the version found", result.Detail)
	}
}

// TestReadSiteFactsParsesEveryField asserts ReadSiteFacts fills every optional field when present
// and leaves each Has flag false when the corresponding key is omitted, the same
// declared/omitted distinction the engine's own writer makes.
func TestReadSiteFactsParsesEveryField(t *testing.T) {
	s := snapshotWithFiles(t, map[string]string{
		"src/content/.cairn/site-facts.json": `{
			"version": 1,
			"mediaBucketBinding": "MEDIA_BUCKET",
			"roles": {"owner": "owner", "editor": "editor", "contributor": "editor"},
			"aiPosture": "decline"
		}`,
	})

	facts, found, err := ReadSiteFacts(s)
	if err != nil {
		t.Fatalf("ReadSiteFacts: %v", err)
	}
	if !found {
		t.Fatal("found = false, want true")
	}
	if !facts.HasMediaBucketBinding || facts.MediaBucketBinding != "MEDIA_BUCKET" {
		t.Errorf("MediaBucketBinding = (%v, %q), want (true, MEDIA_BUCKET)", facts.HasMediaBucketBinding, facts.MediaBucketBinding)
	}
	if !facts.HasAIPosture || facts.AIPosture != "decline" {
		t.Errorf("AIPosture = (%v, %q), want (true, decline)", facts.HasAIPosture, facts.AIPosture)
	}
	if got := customRoleNames(facts.Roles); len(got) != 1 || got[0] != "contributor" {
		t.Errorf("customRoleNames = %v, want [contributor]", got)
	}
}

// TestReadSiteFactsOmittedFields asserts a minimal site-facts.json (media only, the showcase's
// own committed shape) leaves roles and aiPosture unset rather than defaulting to a zero value
// that would read as a declared empty posture.
func TestReadSiteFactsOmittedFields(t *testing.T) {
	s := snapshotWithFiles(t, map[string]string{
		"src/content/.cairn/site-facts.json": `{"version": 1, "mediaBucketBinding": "MEDIA_BUCKET"}`,
	})

	facts, found, err := ReadSiteFacts(s)
	if err != nil {
		t.Fatalf("ReadSiteFacts: %v", err)
	}
	if !found {
		t.Fatal("found = false, want true")
	}
	if facts.HasAIPosture {
		t.Error("HasAIPosture = true, want false when the key is omitted")
	}
	if len(facts.Roles) != 0 {
		t.Errorf("Roles = %v, want empty when the key is omitted", facts.Roles)
	}
}
