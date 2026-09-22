package main

import (
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// decodeDoctorPayload parses one cairn doctor --json payload, failing the test when stdout does
// not hold exactly one parseable object.
func decodeDoctorPayload(t *testing.T, stdout string) map[string]any {
	t.Helper()
	if strings.TrimSpace(stdout) == "" {
		t.Fatal("stdout is empty; --json always writes the payload")
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(stdout), &out); err != nil {
		t.Fatalf("stdout does not parse as one JSON object: %v\n%s", err, stdout)
	}
	return out
}

// TestDoctorJSONOutsideACairnSitePayload covers the case a caller is most likely to hit
// by accident: a directory that is not a cairn-cms site settles no check, and the run still
// writes a parseable payload rather than the one-line prose the text report prints.
func TestDoctorJSONOutsideACairnSitePayload(t *testing.T) {
	dir := t.TempDir()

	d, code := testDeps(t)
	stdout, stderr, err := execTree(t, d, "doctor", dir, "--json")
	if err != nil {
		t.Fatalf("doctor %s --json: %v", dir, err)
	}

	payload := decodeDoctorPayload(t, stdout)
	if payload["verdict"] != spine.VerdictUnknown.String() {
		t.Errorf("verdict = %v, want %v", payload["verdict"], spine.VerdictUnknown)
	}
	if payload["exitCode"] != float64(spine.VerdictUnknown) {
		t.Errorf("exitCode = %v, want %d", payload["exitCode"], int(spine.VerdictUnknown))
	}
	checks, ok := payload["checks"].([]any)
	if !ok || len(checks) != 0 {
		t.Errorf("checks = %v, want an empty array", payload["checks"])
	}
	if *code != int(spine.VerdictUnknown) {
		t.Errorf("exit code = %d, want %d", *code, int(spine.VerdictUnknown))
	}
	if stderr != "" {
		t.Errorf("stderr = %q, want nothing", stderr)
	}
}

// TestDoctorJSONBeatsQuiet holds the command to the rule json-output.md freezes: --json wins
// over --quiet, so the payload prints on a run --quiet would otherwise silence entirely.
func TestDoctorJSONBeatsQuiet(t *testing.T) {
	origin := startDoctorRobotsServer(t)
	dir := writeDoctorFixture(t, doctorCleanSiteFiles(origin))

	d, code := testDeps(t)
	stdout, _, err := execTree(t, d, "doctor", dir, "--json", "--quiet")
	if err != nil {
		t.Fatalf("doctor %s --json --quiet: %v", dir, err)
	}
	if *code != int(spine.VerdictOK) {
		t.Errorf("exit code = %d, want %d (OK)", *code, int(spine.VerdictOK))
	}

	payload := decodeDoctorPayload(t, stdout)
	if payload["verdict"] != spine.VerdictOK.String() {
		t.Errorf("verdict = %v, want %v", payload["verdict"], spine.VerdictOK)
	}
	if checks, ok := payload["checks"].([]any); !ok || len(checks) == 0 {
		t.Errorf("checks = %v, want the run's own results", payload["checks"])
	}
}

// TestDoctorJSONVerboseWritesNothingToStderr holds the other frozen rule: stdout is the payload
// and stderr is diagnostics, so a successful --json run leaves stderr byte-empty whatever
// --verbose says.
func TestDoctorJSONVerboseWritesNothingToStderr(t *testing.T) {
	origin := startDoctorRobotsServer(t)
	dir := writeDoctorFixture(t, doctorCleanSiteFiles(origin))

	d, _ := testDeps(t)
	stdout, stderr, err := execTree(t, d, "doctor", dir, "--json", "--verbose")
	if err != nil {
		t.Fatalf("doctor %s --json --verbose: %v", dir, err)
	}
	if len(stderr) != 0 {
		t.Errorf("stderr = %q, want no bytes at all", stderr)
	}
	decodeDoctorPayload(t, stdout)
}

// TestDoctorJSONPayloadNamesTheDirectoryItRead asserts the payload carries the resolved
// directory, which is what lets a caller correlating two runs tell them apart.
func TestDoctorJSONPayloadNamesTheDirectoryItRead(t *testing.T) {
	origin := startDoctorRobotsServer(t)
	dir := writeDoctorFixture(t, doctorCleanSiteFiles(origin))

	d, _ := testDeps(t)
	stdout, _, err := execTree(t, d, "doctor", dir, "--json")
	if err != nil {
		t.Fatalf("doctor %s --json: %v", dir, err)
	}
	want, err := filepath.EvalSymlinks(dir)
	if err != nil {
		t.Fatalf("EvalSymlinks(%s): %v", dir, err)
	}
	payload := decodeDoctorPayload(t, stdout)
	if payload["dir"] != want {
		t.Errorf("dir = %v, want the resolved %q", payload["dir"], want)
	}
}
