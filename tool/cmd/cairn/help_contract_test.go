package main

import (
	"strconv"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/doctor"
	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// TestHelpListsEveryExitCode holds the help text a program reads to spine's verdicts, so the
// contract survives with no docs page beside the binary.
func TestHelpListsEveryExitCode(t *testing.T) {
	d, _ := testDeps(t)
	for _, args := range [][]string{{"help", "agents"}, {"--help"}, {"health", "--help"}, {"doctor", "--help"}} {
		name := strings.Join(args, " ")
		out, _, err := execTree(t, d, args...)
		if err != nil {
			t.Fatalf("cairn %s: %v", name, err)
		}
		for _, v := range namedVerdicts() {
			if want := strconv.Itoa(int(v)) + " " + v.String(); !strings.Contains(out, want) {
				t.Errorf("cairn %s does not list exit code %q", name, want)
			}
		}
	}
}

// TestHelpAgentsListsEveryJSONField holds the agents page to the field names the payloads write.
// The list is spelled out because a field added to a schema should reach the page through a
// person choosing its one-line meaning.
func TestHelpAgentsListsEveryJSONField(t *testing.T) {
	d, _ := testDeps(t)
	out, _, err := execTree(t, d, "help", "agents")
	if err != nil {
		t.Fatalf("cairn help agents: %v", err)
	}
	fields := []string{
		"schemaVersion", "kind", "verdict", "exitCode",
		"checkId", "state", "checkedAt", "tier", "detail", "code", "condition", "reason",
		"fix", "hold", "fields", "observed",
		"summary", "actor", "outward", "url", "command", "until", "expired", "value", "source",
		"operator", "developer", "provider-console", "registrar",
		"none", "cloudflare", "github", "both",
	}
	for _, f := range fields {
		if !strings.Contains(out, f) {
			t.Errorf("cairn help agents does not mention JSON field or word %q", f)
		}
	}
}

// TestDoctorHelpListsEveryCheckAndSeverity reads the check set from the doctor package, so a
// check added there without its entry in cairn doctor --help fails here.
func TestDoctorHelpListsEveryCheckAndSeverity(t *testing.T) {
	d, _ := testDeps(t)
	out, _, err := execTree(t, d, "doctor", "--help")
	if err != nil {
		t.Fatalf("cairn doctor --help: %v", err)
	}
	snap, err := doctor.NewSnapshot(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	checked := doctor.Run(snap)
	if len(checked) == 0 {
		t.Fatal("doctor ran no checks")
	}
	for _, cr := range checked {
		id := cr.Check.ID
		if id == "admin.mount-shape" {
			if !strings.Contains(out, id+" (never fails)") {
				t.Errorf("cairn doctor --help does not say %q never fails", id)
			}
			continue
		}
		word := "blocker"
		if text, ok := spine.TextFor(cr.Check.Condition); ok && text.Severity == spine.WarningFailure {
			word = "warning"
		}
		if !strings.Contains(out, id+" "+word) {
			t.Errorf("cairn doctor --help does not give %q the severity %q", id, word)
		}
	}
	for _, w := range []string{"PASS", "FAIL", "SKIP", "INFO", "UNCHECKED", "reason.not-run", "reason.not-observable"} {
		if !strings.Contains(out, w) {
			t.Errorf("cairn doctor --help does not mention %q", w)
		}
	}
}
