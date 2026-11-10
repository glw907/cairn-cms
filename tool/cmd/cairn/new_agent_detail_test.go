package main

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/agentview"
)

// TestAStopPrintsItsDetailLineAfterTheFourParts asserts the stderr print of a stop ends with the
// provider's detail, and prints no extra line for a stop without one.
func TestAStopPrintsItsDetailLineAfterTheFourParts(t *testing.T) {
	for _, tc := range []struct {
		name   string
		detail string
		want   string
	}{
		{"with a detail", "cloudflare: forbidden (status 403, code 10000) on GET /zones/z1/dns_records", "Happened.\nDid.\nDo.\ncloudflare: forbidden (status 403, code 10000) on GET /zones/z1/dns_records\n"},
		{"without a detail", "", "Happened.\nDid.\nDo.\n"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var errOut strings.Builder
			cmd := newNewCmd(mustDeps(t), &rootFlags{})
			cmd.SetErr(&errOut)
			a := &agentRun{cmd: cmd, out: agentview.NewWriter(&strings.Builder{})}
			f := &setup.Failure{Step: setup.StepProvision, Reason: setup.ReasonProvider, Happened: "Happened.", Did: "Did.", Do: "Do.", Detail: tc.detail}
			_ = a.finish(setup.Result{}, f)
			if errOut.String() != tc.want {
				t.Errorf("stderr = %q, want %q", errOut.String(), tc.want)
			}
		})
	}
}

// TestAStepFailedEventCarriesTheDetailAndValidates asserts the detail reaches the event's JSON and
// the published schema accepts it.
func TestAStepFailedEventCarriesTheDetailAndValidates(t *testing.T) {
	f := &setup.Failure{Step: setup.StepProvision, Reason: setup.ReasonProvider, Happened: "H.", Did: "D.", Do: "Do.", Detail: "cloudflare: forbidden (status 403, code 10000) on GET /zones/z1/dns_records"}
	data, err := json.Marshal(setup.Event{SchemaVersion: setup.EventSchemaVersion, Kind: setup.StepFailed, Timestamp: time.Date(2026, 11, 10, 0, 0, 0, 0, time.UTC), Step: f.Step, Failure: f})
	if err != nil {
		t.Fatal(err)
	}
	var event map[string]any
	if err := json.Unmarshal(data, &event); err != nil {
		t.Fatal(err)
	}
	failure, _ := event["failure"].(map[string]any)
	if got := failure["detail"]; got != f.Detail {
		t.Errorf("detail = %v, want %q", got, f.Detail)
	}
	validateAgainstSchema(t, []map[string]any{event})
}
