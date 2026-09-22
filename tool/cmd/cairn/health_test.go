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

// TestQuietOnANonOKRunPrintsTheNormalBody asserts --quiet's only effect is the OK run it
// suppresses: on any other verdict it writes the same bytes the same run writes without the
// flag. A reduced body left the one output a cron mail carries unable to say what else the run
// measured, which is what an operator reads the mail for.
func TestQuietOnANonOKRunPrintsTheNormalBody(t *testing.T) {
	quiet, quietErr := writeHealthTo(t, failingReport(), spine.VerdictCritical, healthFlags{}, &rootFlags{quiet: true})
	loud, _ := writeHealthTo(t, failingReport(), spine.VerdictCritical, healthFlags{}, &rootFlags{})

	if quiet != loud {
		t.Errorf("the quiet body differs from the same run's own body\n--- quiet ---\n%s\n--- without --quiet ---\n%s", quiet, loud)
	}
	if !strings.Contains(quiet, fixtureDetail) {
		t.Errorf("stdout %q does not carry the failing check's own line", quiet)
	}
	if quietErr != "" {
		t.Errorf("stderr = %q, want empty", quietErr)
	}
}

// TestQuietBodyNamesEveryStateTheRunProduced holds the body an operator reads on a non-OK quiet
// run to the whole run: the fixture carries one failure, one pass and one check that could not
// run, and all three reach both the tally and the rows.
func TestQuietBodyNamesEveryStateTheRunProduced(t *testing.T) {
	stdout, _ := writeHealthTo(t, failingReport(), spine.VerdictCritical, healthFlags{}, &rootFlags{quiet: true})

	for _, want := range []string{
		spine.VerdictCritical.String(),
		"1 failing", "1 could not run", "1 passing",
		"https", "creds", "errors",
	} {
		if !strings.Contains(stdout, want) {
			t.Errorf("the quiet body does not carry %q:\n%s", want, stdout)
		}
	}
}

// TestQuietSuppressesTheFrameOnOKAlone pins the one gate both the single-site path and the sweep
// read. OK is the whole of it: a WARNING run is not OK, and a held failure and a drifting engine
// version both land there, so a routine that suppressed WARNING would hide what an operator
// acknowledged rather than reporting it.
func TestQuietSuppressesTheFrameOnOKAlone(t *testing.T) {
	for _, verdict := range []spine.Verdict{
		spine.VerdictOK, spine.VerdictWarning, spine.VerdictCritical, spine.VerdictUnknown,
	} {
		t.Run(verdict.String(), func(t *testing.T) {
			if got := quietSuppressesFrame(false, verdict); got {
				t.Errorf("a run without --quiet suppressed its %v frame", verdict)
			}
			want := verdict == spine.VerdictOK
			if got := quietSuppressesFrame(true, verdict); got != want {
				t.Errorf("quietSuppressesFrame(true, %v) = %v, want %v", verdict, got, want)
			}
		})
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
