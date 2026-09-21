package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/internal/health"
	"github.com/glw907/cairn-cms/tool/internal/render"
	"github.com/glw907/cairn-cms/tool/internal/spine"
	"github.com/spf13/cobra"
)

// blockingRoundTripper never answers on its own: it returns only when the request's context is
// done, which is how a test holds a sweep open until a signal cancels it.
type blockingRoundTripper struct{}

func (blockingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	<-req.Context().Done()
	return nil, req.Context().Err()
}

// okReport returns a settled report whose every check passed.
func okReport() health.Report {
	return health.Report{
		SchemaVersion: 1,
		Site:          "ecxc.ski",
		Checks: []health.CheckResult{
			{ID: "creds", Outcome: spine.Outcome{State: spine.OK, Detail: "both tokens answer"}},
			{ID: "serving", Outcome: spine.Outcome{State: spine.OK, Detail: "200 in 84ms"}},
		},
	}
}

// fixtureDetail stands in for whatever the health messages table rendered for a verdict. The
// body writer carries Outcome.Detail through untouched, so a fixture value proves the
// passthrough without copying a catalogued line into a test.
const fixtureDetail = "the fixture's own measured line"

// failingReport returns a settled report carrying one failing check beside two that did not
// fail, so a body that filters can be told apart from one that does not.
func failingReport() health.Report {
	return health.Report{
		SchemaVersion: 1,
		Site:          "907.life",
		Checks: []health.CheckResult{
			{ID: "creds", Outcome: spine.Outcome{State: spine.OK, Detail: "both tokens answer"}},
			{ID: "https", Outcome: spine.Outcome{State: spine.Failing, Detail: fixtureDetail}},
			{ID: "errors", Outcome: spine.Outcome{State: spine.Unknown, Reason: spine.ReasonCode("reason.cred-missing")}},
		},
	}
}

// writeHealthTo runs writeHealth over a command whose streams are buffers, and returns both.
func writeHealthTo(t *testing.T, r health.Report, verdict spine.Verdict, f healthFlags, rf *rootFlags) (stdout, stderr string) {
	t.Helper()
	d, _ := testDeps(t)
	var out, errOut bytes.Buffer
	cmd := &cobra.Command{}
	cmd.SetOut(&out)
	cmd.SetErr(&errOut)
	if err := writeHealth(cmd, d, r, verdict, render.StatusState{}, f, rf, 0); err != nil {
		t.Fatalf("writeHealth: %v", err)
	}
	return out.String(), errOut.String()
}

// TestQuietWritesNothingOnAnOKRun covers what makes a cron-driven green run silent and
// mail-free: a run with nothing to report writes no byte to either stream.
func TestQuietWritesNothingOnAnOKRun(t *testing.T) {
	stdout, stderr := writeHealthTo(t, okReport(), spine.VerdictOK, healthFlags{}, &rootFlags{quiet: true})

	if stdout != "" {
		t.Errorf("stdout = %q, want empty on a quiet OK run", stdout)
	}
	if stderr != "" {
		t.Errorf("stderr = %q, want empty on a quiet OK run", stderr)
	}
}

// TestQuietOnANonOKRunPrintsTheVerdictAndTheFailingChecks asserts the quiet body carries the
// verdict word and each failing check's own measured line, and nothing that passed or could not
// run.
func TestQuietOnANonOKRunPrintsTheVerdictAndTheFailingChecks(t *testing.T) {
	stdout, stderr := writeHealthTo(t, failingReport(), spine.VerdictCritical, healthFlags{}, &rootFlags{quiet: true})

	if !strings.Contains(stdout, spine.VerdictCritical.String()) {
		t.Errorf("stdout %q does not carry the verdict word", stdout)
	}
	if !strings.Contains(stdout, fixtureDetail) {
		t.Errorf("stdout %q does not carry the failing check's own line", stdout)
	}
	for _, unwanted := range []string{"creds", "errors"} {
		if strings.Contains(stdout, unwanted) {
			t.Errorf("stdout %q carries %q, which did not fail", stdout, unwanted)
		}
	}
	if stderr != "" {
		t.Errorf("stderr = %q, want empty", stderr)
	}
}

// TestQuietTallyCountsTheWholeRun is the conductor's 2026-09-21 ruling on the quiet body: the
// tally and the verdict describe the run that happened, and --quiet filters the rows after. The
// failing fixture carries one failure, one pass and one skip, so a body counting its own cut
// slice would say "1 failing, 0 passing" and say nothing of the skip.
func TestQuietTallyCountsTheWholeRun(t *testing.T) {
	stdout, _ := writeHealthTo(t, failingReport(), spine.VerdictCritical, healthFlags{}, &rootFlags{quiet: true})

	for _, want := range []string{"1 failing", "1 could not run", "1 passing"} {
		if !strings.Contains(stdout, want) {
			t.Errorf("the quiet body's tally does not carry %q:\n%s", want, stdout)
		}
	}
	if strings.Contains(stdout, "0 passing") {
		t.Errorf("the quiet body counts its own cut slice rather than the run:\n%s", stdout)
	}
}

// TestStatusLineCarriesTheTokenExpiry is the conductor's 2026-09-21 ruling on criterion 11: the
// expiry reaches the status line from the creds check's own structured field whenever the run
// measured one, inside or outside the fourteen-day warning window. It runs over the production
// wiring, runStatus and render.Render, rather than over a hand-built Credential.
func TestStatusLineCarriesTheTokenExpiry(t *testing.T) {
	now := time.Date(2026, 9, 20, 14, 32, 0, 0, time.UTC)
	expiry := now.Add(90 * 24 * time.Hour)
	raw, err := json.Marshal(expiry)
	if err != nil {
		t.Fatal(err)
	}
	report := health.Report{
		SchemaVersion: 1,
		Site:          "907.life",
		Checks: []health.CheckResult{{
			ID: "creds",
			Outcome: spine.Outcome{
				State:  spine.OK,
				Detail: "cloudflare, via keyring; github, via keyring",
				Fields: []spine.OutcomeField{{Key: health.FieldGitHubTokenExpiry, Value: raw}},
			},
			CheckedAt: now,
		}},
	}

	status := runStatus(health.Clients{HaveCF: true, CFFrom: "keyring", HaveGH: true, GHFrom: "keyring"},
		0, false, []health.Report{report})
	frame := render.Render(render.RenderInput{
		View:    render.ViewHealth,
		Body:    render.BodySingle,
		Width:   100,
		Dark:    true,
		Reports: []health.Report{report},
		Status:  status,
		Verdict: spine.VerdictOK,
		Now:     now,
	})

	text := strings.Join(frame.Lines(), "\n")
	if !strings.Contains(text, "expires 2026-12-19") {
		t.Errorf("the status line does not carry the token's expiry:\n%s", text)
	}
}

// TestJSONWinsOverQuiet asserts the combination is not silent: under --json the payload is the
// output, so suppressing it would hand an agent an empty stdout, which the exit contract
// reserves for a wrong invocation.
func TestJSONWinsOverQuiet(t *testing.T) {
	stdout, stderr := writeHealthTo(t, okReport(), spine.VerdictOK, healthFlags{asJSON: true}, &rootFlags{quiet: true})

	var payload map[string]any
	if err := json.Unmarshal([]byte(stdout), &payload); err != nil {
		t.Fatalf("stdout %q is not the JSON payload: %v", stdout, err)
	}
	if payload["verdict"] != spine.VerdictOK.String() {
		t.Errorf("payload verdict = %v, want %q", payload["verdict"], spine.VerdictOK)
	}
	if payload["exitCode"] != float64(spine.VerdictOK) {
		t.Errorf("payload exitCode = %v, want %d", payload["exitCode"], int(spine.VerdictOK))
	}
	if stderr != "" {
		t.Errorf("stderr = %q, want empty", stderr)
	}
}

// TestHealthJSONAndQuietTogetherIsNotAUsageError drives the flag pair through the real tree, so
// the rule holds at the command surface and not only in the body writer.
func TestHealthJSONAndQuietTogetherIsNotAUsageError(t *testing.T) {
	d, _ := testDeps(t)
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	stdout, _, err := execTree(t, d, "health", "ecxc-ski-a1b2c3", "--json", "--quiet")
	if err != nil {
		t.Fatalf("health --json --quiet: %v", err)
	}
	if !strings.HasPrefix(strings.TrimSpace(stdout), "{") {
		t.Errorf("stdout = %q, want the JSON payload", stdout)
	}
}

// TestHealthNamesSitesListWhenTheSiteIsUnknown covers the shape an operator gets wrong: a site
// the registry does not hold. Bare `cairn health` no longer errors this way: it sweeps every
// registered site, which TestHealthSweepOverAnEmptyRegistryIsUnknown covers instead.
func TestHealthNamesSitesListWhenTheSiteIsUnknown(t *testing.T) {
	d, _ := testDeps(t)

	_, _, err := execTree(t, d, "health", "no-such-site-a1b2c3")
	if err == nil {
		t.Fatal("health no-such-site-a1b2c3 succeeded; want an error")
	}
	if !strings.Contains(err.Error(), "cairn sites list") {
		t.Errorf("failed with %q, which does not name `cairn sites list`", err)
	}
}

// TestSinceGrammarIsOneTableForHealthAndLogs covers the rows Task 17 states, through both
// flags: one grammar, so neither command can drift into accepting a window the other rejects.
func TestSinceGrammarIsOneTableForHealthAndLogs(t *testing.T) {
	tests := []struct {
		value  string
		accept bool
	}{
		{"90m", true},
		{"24h", true},
		{"7d", true},
		{"7", false},
		{"-1h", false},
		{"0h", false},
		{"1.5h", false},
		{"30s", false},
	}

	for _, tt := range tests {
		t.Run(tt.value, func(t *testing.T) {
			_, err := parseSince(tt.value)
			if tt.accept && err != nil {
				t.Fatalf("parseSince(%q) = %v, want it accepted", tt.value, err)
			}
			if !tt.accept && err == nil {
				t.Fatalf("parseSince(%q) was accepted; want it refused", tt.value)
			}

			for _, command := range []string{"health", "logs"} {
				d, _ := testDeps(t)
				writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")
				_, _, runErr := execTree(t, d, command, "ecxc-ski-a1b2c3", "--since", tt.value)

				refused := runErr != nil && strings.Contains(runErr.Error(), "--since")
				if tt.accept && refused {
					t.Errorf("%s --since %q was refused: %v", command, tt.value, runErr)
				}
				if !tt.accept && !refused {
					t.Errorf("%s --since %q was not refused; got %v", command, tt.value, runErr)
				}
			}
		})
	}
}

// TestSignalCancelsTheRunAndExitsUnknown covers the signal path. Windows has no SIGTERM and
// delivers SIGINT differently, so there the same behaviour is proved by cancelling the root
// context directly; both paths assert the same code, which is why this is one test guarded on
// runtime.GOOS rather than three files behind build tags.
func TestSignalCancelsTheRunAndExitsUnknown(t *testing.T) {
	d, code := testDeps(t)
	d.transport = blockingRoundTripper{}
	d.env = fakeEnv(map[string]string{
		"CAIRN_CF_ACCOUNT_ID": testAccountID,
		"CAIRN_CF_READ_TOKEN": "cf-token",
		"CAIRN_GH_READ_TOKEN": "gh-token",
	})
	writeTestRecord(t, d, "ecxc-ski-a1b2c3", "ecxc.ski", "ecxc-ski")

	parent, cancelParent := context.WithCancel(context.Background())
	defer cancelParent()
	ctx, stop := notifyContext(parent)
	defer stop()

	cmd := newRootCmd(d)
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs([]string{"health", "ecxc-ski-a1b2c3"})

	returned := make(chan error, 1)
	go func() { returned <- cmd.ExecuteContext(ctx) }()

	if runtime.GOOS == "windows" {
		cancelParent()
	} else {
		p, err := os.FindProcess(os.Getpid())
		if err != nil {
			t.Fatalf("FindProcess: %v", err)
		}
		if err := p.Signal(syscall.SIGTERM); err != nil {
			t.Fatalf("signal: %v", err)
		}
	}

	select {
	case err := <-returned:
		if err != nil {
			t.Fatalf("the cancelled run returned %v, want nil after reporting its verdict", err)
		}
	case <-time.After(30 * time.Second):
		t.Fatal("the cancelled run never returned; it was waiting to be killed instead")
	}

	if *code != int(spine.VerdictUnknown) {
		t.Errorf("exit code = %d, want %d (%s)", *code, int(spine.VerdictUnknown), spine.VerdictUnknown)
	}
}

// TestPrintedVerdictWordMatchesTheExitCode covers the rule that keeps an operator reading the
// line and a routine reading the code from disagreeing: the word the body prints and the code
// the body's own exit line carries are the same verdict, for all four values.
func TestPrintedVerdictWordMatchesTheExitCode(t *testing.T) {
	for _, v := range []spine.Verdict{spine.VerdictOK, spine.VerdictWarning, spine.VerdictCritical, spine.VerdictUnknown} {
		stdout, _ := writeHealthTo(t, failingReport(), v, healthFlags{}, &rootFlags{})
		lines := strings.Split(strings.TrimRight(stdout, "\n"), "\n")
		if len(lines) < 2 {
			t.Fatalf("verdict %v: body is %q", v, stdout)
		}

		last := lines[len(lines)-1]
		code, err := strconv.Atoi(strings.TrimPrefix(last, "exit: "))
		if err != nil {
			t.Fatalf("verdict %v: last line %q carries no exit code: %v", v, last, err)
		}
		if code != int(v) {
			t.Errorf("verdict %v: exit line reports %d", v, code)
		}
		if word := spine.Verdict(code).String(); !strings.Contains(lines[0], word) {
			t.Errorf("exit code %d means %s, but the first line reads %q", code, word, lines[0])
		}
	}
}
