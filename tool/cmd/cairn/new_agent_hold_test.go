package main

import (
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/agentview"
)

// TestAUsageErrorBeforeTheOpeningEndsLeavesStdoutEmpty holds the opening's first event: a usage
// error found before the opening finishes ran nothing, so exit 3 carries no stream, while a stop
// at that step shows the stream that led to it.
func TestAUsageErrorBeforeTheOpeningEndsLeavesStdoutEmpty(t *testing.T) {
	for _, tc := range []struct {
		name    string
		err     error
		wantOut bool
	}{
		{"usage error", &agentview.UsageError{Problem: "cairn: give --site-theme"}, false},
		{"a stop", &setup.Failure{Step: "opening-checks", Reason: setup.ReasonGitMissing, Happened: "no git"}, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var out strings.Builder
			a := &agentRun{cmd: newNewCmd(mustDeps(t)), out: agentview.NewWriter(&out)}
			a.emit(setup.Event{Kind: setup.StepStarted, Step: setup.StepOpeningChecks})
			if out.Len() != 0 {
				t.Fatalf("the opening's first event reached stdout early: %q", out.String())
			}
			_ = a.finish(setup.Result{}, tc.err)
			if (out.Len() != 0) != tc.wantOut {
				t.Errorf("stdout = %q, want output %v", out.String(), tc.wantOut)
			}
		})
	}
}
