package doctor

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// jsonGoldenPath is the committed payload, which lives with the other six under
// internal/render's corpus rather than with this package's text reports: render is where the
// published schemas resolve and where every payload golden is validated against one.
var jsonGoldenPath = filepath.Join("..", "render", "testdata", "json", "doctor.json")

// jsonGoldenDir is the stable directory the golden payload names. A real run stamps the
// resolved temp directory a test built, which no committed file could carry.
const jsonGoldenDir = "/srv/example-site"

// jsonGoldenNow is the instant the golden payload is stamped with.
var jsonGoldenNow = time.Date(2026, 9, 21, 12, 0, 0, 0, time.UTC)

// goldenPayloadCase returns the report fixture the payload golden is cut from: every-status,
// the one run carrying all five doctor statuses at once, so the committed payload exercises
// every wire state the schema declares and both arms of its reason conditional.
func goldenPayloadCase(t *testing.T) goldenReportCase {
	t.Helper()
	for _, c := range goldenReportCases() {
		if c.name == "every-status" {
			return c
		}
	}
	t.Fatal("goldenReportCases carries no every-status case")
	return goldenReportCase{}
}

// marshalGoldenPayload runs the every-status fixture and marshals it with the golden's stable
// directory and instant.
func marshalGoldenPayload(t *testing.T) []byte {
	t.Helper()
	c := goldenPayloadCase(t)
	checked := Run(buildSnapshot(t, c.files, c.origin, c.robots))
	data, err := Marshal(JSONInput{
		Dir:     jsonGoldenDir,
		Checked: checked,
		Verdict: spine.ExitCode([]spine.SiteVerdicts{Verdicts(Results(checked))}, nil, 0),
		Now:     jsonGoldenNow,
	})
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	return append(data, '\n')
}

// TestGoldenDoctorPayload cuts the committed payload from the real checks and compares it byte
// for byte. internal/render validates the same file against cairn-doctor.schema.json and holds
// json-output.md to every key in it, so the bytes here are the whole published contract.
func TestGoldenDoctorPayload(t *testing.T) {
	got := marshalGoldenPayload(t)

	if *updateGolden {
		if err := os.WriteFile(jsonGoldenPath, got, 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}

	want, err := os.ReadFile(jsonGoldenPath)
	if err != nil {
		t.Fatalf("%v; run `go test ./internal/doctor -run TestGolden -update` to cut it", err)
	}
	if string(got) != strings.ReplaceAll(string(want), "\r\n", "\n") {
		t.Errorf("payload differs from %s\n--- got ---\n%s\n--- want ---\n%s", jsonGoldenPath, got, want)
	}
}

// TestGoldenPayloadCarriesEveryWireState asserts the committed payload exercises every state a
// doctor check can reach the wire in, which is what makes the schema's skip-and-unknown
// conditional tested in both arms rather than only in the arm the corpus happens to hit.
func TestGoldenPayloadCarriesEveryWireState(t *testing.T) {
	var decoded struct {
		Checks []struct {
			State  string `json:"state"`
			Reason string `json:"reason"`
			Note   string `json:"note"`
		} `json:"checks"`
	}
	if err := json.Unmarshal(marshalGoldenPayload(t), &decoded); err != nil {
		t.Fatalf("the golden payload does not parse: %v", err)
	}

	var states []string
	var withNote int
	for _, c := range decoded.Checks {
		states = append(states, c.State)
		if c.Note != "" {
			withNote++
		}
		if (c.State == stateWordSkip || c.State == stateWordUnknown) && c.Reason == "" {
			t.Errorf("a %s check carries no reason", c.State)
		}
		if c.State == stateWordPass && c.Reason != "" {
			t.Errorf("a pass carries the reason %q", c.Reason)
		}
	}
	for _, want := range []string{stateWordPass, stateWordFail, stateWordSkip, stateWordUnknown} {
		if !slices.Contains(states, want) {
			t.Errorf("the golden payload carries no %q check: %v", want, states)
		}
	}
	if withNote != 1 {
		t.Errorf("%d checks carry a note, want the fixture's one info result", withNote)
	}
}

// TestAnInfoIsWrittenAsAPassCarryingANote covers the one mapping a reader could mistake for
// drift: info is not one of the frozen wire words, so it is written as a pass, and the note is
// what still tells the two apart.
func TestAnInfoIsWrittenAsAPassCarryingANote(t *testing.T) {
	got := wireCheck(CheckedResult{
		Check:  Check{ID: "admin.mount-shape", Condition: spine.ConditionAdminMountIncomplete},
		Result: Result{ID: "admin.mount-shape", Status: StatusInfo, Detail: "no wired /admin mount detected"},
	})
	if got.State != stateWordPass {
		t.Errorf("state = %q, want %q", got.State, stateWordPass)
	}
	if got.Note != "no wired /admin mount detected" {
		t.Errorf("note = %q, want the info sentence", got.Note)
	}
	if got.Detail != "" {
		t.Errorf("detail = %q, want the sentence under note alone", got.Detail)
	}
}

// TestAFailureCarriesItsConditionsFix asserts a failing check publishes the remediation and the
// docs section its condition declares, rather than leaving a consumer to look either up.
func TestAFailureCarriesItsConditionsFix(t *testing.T) {
	got := wireCheck(CheckedResult{
		Check:  Check{ID: "config.observability", Condition: spine.ConditionConfigObservabilityOff},
		Result: Result{ID: "config.observability", Status: StatusFail, Detail: "observability.enabled is not true"},
	})
	want := conditionText(spine.ConditionConfigObservabilityOff)
	if got.Fix == nil {
		t.Fatal("a failing check carries no fix")
	}
	if got.Fix.Summary != want.Remediation {
		t.Errorf("fix.summary = %q, want the condition's remediation %q", got.Fix.Summary, want.Remediation)
	}
	if got.Fix.URL != docsURL(want.DocsAnchor) {
		t.Errorf("fix.url = %q, want %q", got.Fix.URL, docsURL(want.DocsAnchor))
	}
}

// TestARunWithNoChecksWritesAnEmptyArray covers the directory that is not a cairn site: the
// payload still parses, and checks is [] rather than null, so a consumer indexing it needs no
// special case.
func TestARunWithNoChecksWritesAnEmptyArray(t *testing.T) {
	data, err := Marshal(JSONInput{
		Dir:     jsonGoldenDir,
		Verdict: spine.ExitCode([]spine.SiteVerdicts{Verdicts(nil)}, nil, 0),
		Now:     jsonGoldenNow,
	})
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}
	if !strings.Contains(string(data), `"checks":[]`) {
		t.Errorf("payload = %s, want an empty checks array", data)
	}

	var decoded map[string]any
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("the payload does not parse: %v", err)
	}
	if decoded["verdict"] != spine.VerdictUnknown.String() {
		t.Errorf("verdict = %v, want %v", decoded["verdict"], spine.VerdictUnknown)
	}
	if decoded["exitCode"] != float64(spine.VerdictUnknown) {
		t.Errorf("exitCode = %v, want %d", decoded["exitCode"], int(spine.VerdictUnknown))
	}
}
