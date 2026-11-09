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

// TestAUsageErrorSetupWrapsIntoAStepFailedLeavesStdoutEmpty is the stream Run produces for a
// usage error found inside the first step: Run wraps it in a Failure and emits step_failed
// before it returns, and the refusal still ran nothing, so stdout stays empty.
func TestAUsageErrorSetupWrapsIntoAStepFailedLeavesStdoutEmpty(t *testing.T) {
	ue := &agentview.UsageError{Problem: "cairn: give --site-theme"}
	f := &setup.Failure{Step: setup.StepOpeningChecks, Reason: setup.ReasonProvider, Happened: "stopped", Err: ue}
	var out strings.Builder
	a := &agentRun{cmd: newNewCmd(mustDeps(t)), out: agentview.NewWriter(&out)}
	a.emit(setup.Event{Kind: setup.StepStarted, Step: setup.StepOpeningChecks})
	a.emit(setup.Event{Kind: setup.StepFailed, Step: f.Step, Failure: f})
	err := a.finish(setup.Result{}, f)
	if out.Len() != 0 {
		t.Errorf("stdout = %q, want empty", out.String())
	}
	if _, coded := err.(codedError); coded || err == nil || !strings.Contains(err.Error(), "--site-theme") {
		t.Errorf("finish = %v, want the usage error, which exits 3", err)
	}
}
