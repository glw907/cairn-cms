package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

// TestImplicitlyVerboseCommandsWarnBeforeTheyPrint covers the two commands whose whole output
// is identifiers: adopt list names Workers, zones, and repositories, and a logs entry carries
// the editor's email on some events. Neither has a --verbose flag to hide behind, so each says
// so on stderr before it prints.
func TestImplicitlyVerboseCommandsWarnBeforeTheyPrint(t *testing.T) {
	warned := map[string]bool{}

	// adopt list defaults to --json, where the notice travels inside the payload instead, so the
	// stderr line it is asserted on here is the one a --json=false run prints.
	for _, args := range [][]string{
		{"logs", "ecxc-ski-a1b2c3"},
		{"adopt", "list", "--json=false"},
		{"sites", "list"},
		{"health", "ecxc-ski-a1b2c3"},
		{"auth", "list"},
	} {
		d, _ := testDeps(t)
		writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

		// Each run fails for want of a credential or a route; the notice is written before any
		// of that, which is the point: it precedes the output it is warning about.
		_, stderr, _ := execTree(t, d, args...)
		warned[strings.Join(args, " ")] = strings.Contains(stderr, pasteNotice)
	}

	for _, command := range []string{"logs ecxc-ski-a1b2c3", "adopt list --json=false"} {
		if !warned[command] {
			t.Errorf("%s printed no paste notice; it is implicitly verbose", command)
		}
	}
	for command, did := range warned {
		if did && command != "logs ecxc-ski-a1b2c3" && command != "adopt list --json=false" {
			t.Errorf("%s printed the paste notice; only the two implicitly verbose commands do", command)
		}
	}
}

// TestLogsTakesExactlyOneSite asserts the site is required rather than defaulted: a log query
// with no site named would have to guess which one, and a registry holds many.
func TestLogsTakesExactlyOneSite(t *testing.T) {
	logs := findCommand(t, newRootCmd(mustDeps(t)), "logs")

	if err := logs.Args(logs, nil); err == nil {
		t.Error("logs accepted zero arguments; it must name a site")
	}
	if err := logs.Args(logs, []string{"a", "b"}); err == nil {
		t.Error("logs accepted two arguments; it must name one site")
	}
}

// findCommand returns the named command beneath root.
func findCommand(t *testing.T, root *cobra.Command, path ...string) *cobra.Command {
	t.Helper()
	cmd, _, err := root.Find(path)
	if err != nil {
		t.Fatalf("Find(%v): %v", path, err)
	}
	return cmd
}

// TestLogsUnderJSONWritesNothingToStderr covers the rule that makes `cairn logs x --json 2>&1`
// safe: under --json stderr carries nothing but an error, --verbose adds no line of its own, and
// the sensitive-data notice travels inside the payload as containsPersonalData.
func TestLogsUnderJSONWritesNothingToStderr(t *testing.T) {
	d := credentialedDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")
	d.transport = routeRoundTripper{
		"/client/v4/accounts/" + testAccountID + "/workers/observability/telemetry/query": {
			status: http.StatusOK,
			body:   []byte(`{"success":true,"result":{"events":[]}}`),
		},
	}

	stdout, stderr, err := execTree(t, d, "logs", "ecxc-ski-a1b2c3", "--json", "--verbose")
	if err != nil {
		t.Fatalf("logs --json --verbose: %v", err)
	}
	if stderr != "" {
		t.Errorf("stderr = %q, want empty under --json", stderr)
	}

	var payload struct {
		ContainsPersonalData bool `json:"containsPersonalData"`
	}
	if err := json.Unmarshal([]byte(stdout), &payload); err != nil {
		t.Fatalf("stdout %q is not the JSON payload: %v", stdout, err)
	}
	if !payload.ContainsPersonalData {
		t.Error("the payload does not carry containsPersonalData; the notice reaches nobody under --json")
	}
}

// TestSitesListUnderJSONWritesOnlyThePayloadToStdout asserts --verbose adds no plain line ahead
// of the object: a consumer would be handed a stream that is no longer JSON.
func TestSitesListUnderJSONWritesOnlyThePayloadToStdout(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	stdout, _, err := execTree(t, d, "sites", "list", "--json", "--verbose")
	if err != nil {
		t.Fatalf("sites list --json --verbose: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(stdout), &payload); err != nil {
		t.Fatalf("stdout %q is not the JSON payload alone: %v", stdout, err)
	}
}
