package logs

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/providers"
)

// eventUnionMember matches one quoted member of the CairnLogEvent union in
// src/lib/log/events.ts: a line whose trimmed form starts with `| '<name>'`.
var eventUnionMember = regexp.MustCompile(`^\s*\|\s*'([a-zA-Z0-9_.]+)'`)

// eventIDsIn reads events.ts and returns every event name the union declares.
func eventIDsIn(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var ids []string
	for line := range strings.SplitSeq(string(data), "\n") {
		if m := eventUnionMember.FindStringSubmatch(line); m != nil {
			ids = append(ids, m[1])
		}
	}
	return ids, nil
}

// TestEventVocabularyMatchesEngine reads src/lib/log/events.ts through providers.RepoRoot and
// asserts Events() carries the same set the TypeScript union declares, so an event added or
// renamed on the engine side fails here rather than silently drifting the CLI's completion
// vocabulary. It fails, rather than skips, when the repository cannot be found: a Go module
// that builds with no repository present must not silently pass a check it cannot run.
func TestEventVocabularyMatchesEngine(t *testing.T) {
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatalf("providers.RepoRoot: %v", err)
	}
	path := filepath.Join(root, "src", "lib", "log", "events.ts")

	tsIDs, err := eventIDsIn(path)
	if err != nil {
		t.Fatalf("scan %s: %v", path, err)
	}
	if len(tsIDs) == 0 {
		t.Fatalf("found no event ids in %s; the scan is broken", path)
	}
	slices.Sort(tsIDs)

	goIDs := Events()
	slices.Sort(goIDs)

	if !slices.Equal(tsIDs, goIDs) {
		t.Fatalf("event id sets differ:\nevents.ts: %v\nlogs:      %v", tsIDs, goIDs)
	}
}

// TestEventsReturnsACopy asserts a caller mutating the returned slice cannot corrupt the
// vocabulary a later call reads.
func TestEventsReturnsACopy(t *testing.T) {
	first := Events()
	if len(first) == 0 {
		t.Fatal("Events() returned no events")
	}
	first[0] = "mutated"

	second := Events()
	if second[0] == "mutated" {
		t.Error("mutating Events()'s result changed a later call's result")
	}
}
