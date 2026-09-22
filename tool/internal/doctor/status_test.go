package doctor

import (
	"os"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestResultCheckVerdictContributesTheDecidedTable is table-driven over all five doctor
// statuses, asserting the exact contribution each makes to a run's exit code: pass, skip, and
// info are free (0), a blocker fail is CRITICAL (2), a warning fail is WARNING (1), and an
// unchecked result is UNKNOWN (3).
func TestResultCheckVerdictContributesTheDecidedTable(t *testing.T) {
	tests := []struct {
		name     string
		result   Result
		wantCode int
	}{
		{"pass", Result{ID: "a", Status: StatusPass}, 0},
		{"fail blocker", Result{ID: "a", Status: StatusFail, Severity: spine.CriticalFailure}, 2},
		{"fail warning", Result{ID: "a", Status: StatusFail, Severity: spine.WarningFailure}, 1},
		{"skip", Result{ID: "a", Status: StatusSkip}, 0},
		{"info", Result{ID: "a", Status: StatusInfo}, 0},
		{"unchecked", Result{ID: "a", Status: StatusUnchecked}, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := int(tt.result.checkVerdict().Verdict()); got != tt.wantCode {
				t.Errorf("checkVerdict().Verdict() = %d, want %d", got, tt.wantCode)
			}
		})
	}
}

// TestVerdictsOfPassSkipInfoIsOK asserts a run of only pass, skip, and info folds to
// spine.VerdictOK, the spec's own "today's exit-0 runs stay exit 0".
func TestVerdictsOfPassSkipInfoIsOK(t *testing.T) {
	results := []Result{
		{ID: "a", Status: StatusPass},
		{ID: "b", Status: StatusSkip},
		{ID: "c", Status: StatusInfo},
	}
	if got := Verdicts(results).Verdict(); got != spine.VerdictOK {
		t.Errorf("Verdicts(...).Verdict() = %v, want %v", got, spine.VerdictOK)
	}
}

// TestVerdictsOfNoChecksIsUnknown asserts a run with zero checks folds to spine.VerdictUnknown,
// the outside-a-cairn-site exit.
func TestVerdictsOfNoChecksIsUnknown(t *testing.T) {
	if got := Verdicts(nil).Verdict(); got != spine.VerdictUnknown {
		t.Errorf("Verdicts(nil).Verdict() = %v, want %v", got, spine.VerdictUnknown)
	}
}

// TestSpineStateWordIsNamedNowhere is a source scan over this package's own non-test files: it
// asserts none names spine.StateWord, since decision 2 gives this package its own five-status
// conversion rather than reusing StateWord's three-state, five-word vocabulary.
func TestSpineStateWordIsNamedNowhere(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read dir: %v", err)
	}
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		body, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		if strings.Contains(string(body), "StateWord") {
			t.Errorf("%s names StateWord; this package converts through its own status table instead", name)
		}
	}
}
