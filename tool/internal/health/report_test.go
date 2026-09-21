package health

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestReportDeclaresNoMarshalJSON asserts Report, CheckResult, and spine.Outcome implement no
// json.Marshaler: Report.JSON must be the only path bytes leave through, so a bare
// json.Marshal(report) elsewhere in the codebase can never silently reproduce (or fail to
// reproduce) this file's redaction.
func TestReportDeclaresNoMarshalJSON(t *testing.T) {
	if _, ok := any(Report{}).(json.Marshaler); ok {
		t.Error("Report implements json.Marshaler")
	}
	if _, ok := any(CheckResult{}).(json.Marshaler); ok {
		t.Error("CheckResult implements json.Marshaler")
	}
	if _, ok := any(spine.Outcome{}).(json.Marshaler); ok {
		t.Error("spine.Outcome implements json.Marshaler")
	}
}

// TestReportJSONRedactsVerboseOnlyValues covers the task's own fixture: a build UUID and a
// repository slug embedded in a Detail string. A verbose render keeps both; a non-verbose render
// carries neither.
func TestReportJSONRedactsVerboseOnlyValues(t *testing.T) {
	uuid := "1b2e3c4d-5f60-4a1b-9c2d-7e8f9a0b1c2d"
	slug := "glw907/ecxc-ski"
	fullSHA := "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e"
	detail := "build " + uuid + " for " + slug + " at " + fullSHA
	report := Report{
		Checks: []CheckResult{{ID: "deploy", Outcome: spine.Outcome{State: spine.Failing, Detail: detail}}},
	}

	verbose, err := report.JSON(true)
	if err != nil {
		t.Fatalf("JSON(true): %v", err)
	}
	for _, want := range []string{uuid, slug, fullSHA} {
		if !strings.Contains(string(verbose), want) {
			t.Errorf("verbose render dropped %q", want)
		}
	}

	nonVerbose, err := report.JSON(false)
	if err != nil {
		t.Fatalf("JSON(false): %v", err)
	}
	for _, leaked := range []string{uuid, slug, fullSHA} {
		if strings.Contains(string(nonVerbose), leaked) {
			t.Errorf("non-verbose render leaked verbose-only value %q", leaked)
		}
	}
}

// TestReportJSONFieldOrderRoundTrips asserts an Outcome's Fields survive Report.JSON in the
// order they were appended, the reason Fields is a slice rather than a map.
func TestReportJSONFieldOrderRoundTrips(t *testing.T) {
	report := Report{
		Checks: []CheckResult{{
			ID: "deploy",
			Outcome: spine.Outcome{
				State: spine.OK,
				Fields: []spine.OutcomeField{
					{Key: "workerExists", Value: json.RawMessage("true")},
					{Key: "lastBuild", Value: json.RawMessage(`"ok"`)},
					{Key: "behind", Value: json.RawMessage("false")},
				},
			},
		}},
	}

	data, err := report.JSON(true)
	if err != nil {
		t.Fatalf("JSON(true): %v", err)
	}

	var decoded struct {
		Checks []struct {
			Outcome struct {
				Fields []struct {
					Key string
				}
			}
		}
	}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(decoded.Checks) != 1 {
		t.Fatalf("len(Checks) = %d, want 1", len(decoded.Checks))
	}

	want := []string{"workerExists", "lastBuild", "behind"}
	got := decoded.Checks[0].Outcome.Fields
	if len(got) != len(want) {
		t.Fatalf("len(Fields) = %d, want %d", len(got), len(want))
	}
	for i, key := range want {
		if got[i].Key != key {
			t.Errorf("Fields[%d].Key = %q, want %q", i, got[i].Key, key)
		}
	}
}

// TestReportJSONRedactsFieldValues asserts a Fields entry carrying a verbose-only value is
// redacted the same way Detail is, non-verbose only.
func TestReportJSONRedactsFieldValues(t *testing.T) {
	fullSHA := `"9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e"`
	report := Report{
		Checks: []CheckResult{{
			ID: "deploy",
			Outcome: spine.Outcome{
				State:  spine.OK,
				Fields: []spine.OutcomeField{{Key: "lastBuildSHA", Value: json.RawMessage(fullSHA)}},
			},
		}},
	}

	nonVerbose, err := report.JSON(false)
	if err != nil {
		t.Fatalf("JSON(false): %v", err)
	}
	if strings.Contains(string(nonVerbose), "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e") {
		t.Error("non-verbose render leaked a full SHA carried in a Fields entry")
	}

	verbose, err := report.JSON(true)
	if err != nil {
		t.Fatalf("JSON(true): %v", err)
	}
	if !strings.Contains(string(verbose), "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e") {
		t.Error("verbose render dropped a full SHA carried in a Fields entry")
	}
}
