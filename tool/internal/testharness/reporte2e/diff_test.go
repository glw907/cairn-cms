package reporte2e

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// baseBinEnv names the environment variable that holds the path of a cairn binary built with
// the cairne2e tag from the branch's merge base. The session builds it; the test never does.
const baseBinEnv = "CAIRN_E2E_BASE_BIN"

// diffTimeout bounds one differential test, its rerun included. Each health run waits seconds
// on real DNS for the delegation and email checks, and a sweep pays that once per site.
const diffTimeout = 5 * time.Minute

// otherSiteID is the second site the sweep comparison registers, so the every-site run prints
// more than one block. It passes record.ValidateSiteID.
const otherSiteID = "other-site-d4e5f6"

// checkedKey begins the plain body's clock line, whose remainder is the run's age, stamp, and
// elapsed time and nothing else.
const checkedKey = "checked: "

// clockMask replaces the remainder of every checked line.
const clockMask = "<clock>"

// baseBinary returns the merge base's cairn binary, skipping the test when none was named and
// failing it when the named path is not an executable file.
func baseBinary(t *testing.T) string {
	t.Helper()
	path := os.Getenv(baseBinEnv)
	if path == "" {
		t.Skip(baseBinEnv + " is unset: the differential needs a cairn binary built with -tags cairne2e from the merge base")
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("%s names %s: %v", baseBinEnv, path, err)
	}
	if !info.Mode().IsRegular() || info.Mode().Perm()&0o111 == 0 {
		t.Fatalf("%s names %s, which is not an executable file", baseBinEnv, path)
	}
	return path
}

// pipeResult is one child's captured streams and its exit code.
type pipeResult struct {
	stdout []byte
	stderr []byte
	code   int
	err    error
}

// runPipe runs bin with args under the fixture's environment, its stdout and stderr each a pipe
// into its own buffer. A non-zero exit is a verdict and leaves err nil; a child that could not
// start, or that ctx killed, sets it.
func runPipe(ctx context.Context, f *fixture, bin string, args ...string) pipeResult {
	var stderr bytes.Buffer
	r := runChild(ctx, f, bin, nil, &stderr, args...)
	r.stderr = stderr.Bytes()
	return r
}

// runChild runs bin with args under the fixture's environment with overrides applied, its stdout
// a pipe into a buffer and its stderr on the given writer, and its stdin empty. A non-zero exit
// is a verdict and leaves err nil; a child that could not start, or that ctx killed, sets it.
func runChild(ctx context.Context, f *fixture, bin string, overrides map[string]string, stderr io.Writer, args ...string) pipeResult {
	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Env = f.environ(overrides)
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = stderr
	cmd.WaitDelay = 5 * time.Second
	err := cmd.Run()
	code := 0
	if exit, ok := errors.AsType[*exec.ExitError](err); ok && exit.ExitCode() >= 0 {
		code, err = exit.ExitCode(), nil
	}
	return pipeResult{stdout: stdout.Bytes(), code: code, err: err}
}

// runAll runs every bin in bins at once with the same args and returns their results in order.
// Running them together keeps the clock and the DNS answers as close as the runs can share.
func runAll(t *testing.T, ctx context.Context, f *fixture, bins []string, args ...string) []pipeResult {
	t.Helper()
	results := make([]pipeResult, len(bins))
	var wg sync.WaitGroup
	for i, bin := range bins {
		wg.Go(func() { results[i] = runPipe(ctx, f, bin, args...) })
	}
	wg.Wait()
	for i, r := range results {
		if r.err != nil {
			t.Fatalf("run %d of cairn %s (%s): %v; stderr %q", i, strings.Join(args, " "), bins[i], r.err, r.stderr)
		}
	}
	return results
}

// maskClock replaces the remainder of every line that begins with checkedKey with clockMask and
// reports how many lines it masked. It keys on the line prefix alone, since the age is absent
// under one second and the elapsed part is optional, so the phrase has no fixed shape to match.
func maskClock(out []byte) ([]byte, int) {
	lines := bytes.Split(out, []byte("\n"))
	masked := 0
	for i, line := range lines {
		if bytes.HasPrefix(line, []byte(checkedKey)) {
			lines[i] = []byte(checkedKey + clockMask)
			masked++
		}
	}
	return bytes.Join(lines, []byte("\n")), masked
}

// firstDiff describes the first line where a and b differ, or returns "" when they are equal.
func firstDiff(a, b []byte) string {
	if bytes.Equal(a, b) {
		return ""
	}
	la, lb := strings.Split(string(a), "\n"), strings.Split(string(b), "\n")
	for i := range max(len(la), len(lb)) {
		var x, y string
		if i < len(la) {
			x = la[i]
		}
		if i < len(lb) {
			y = lb[i]
		}
		if x != y || i >= len(la) || i >= len(lb) {
			return "line " + strconv.Itoa(i+1) + ":\n  -" + strconv.Quote(x) + "\n  +" + strconv.Quote(y)
		}
	}
	return "an unknown line"
}

// TestReportE2EDiffDoctorPipe runs cairn doctor through the base and branch binaries over one
// site directory with no PUBLIC_ORIGIN, so no check reaches the network and the output is a
// function of the directory alone, and finds the two pipe bodies byte-identical.
func TestReportE2EDiffDoctorPipe(t *testing.T) {
	t.Parallel()
	base := baseBinary(t)
	f := newFixture(t, 0)
	dir := doctorSite(t)
	ctx, cancel := context.WithTimeout(t.Context(), diffTimeout)
	defer cancel()

	r := runAll(t, ctx, f, []string{base, f.bin}, "doctor", dir)
	baseOut, branchOut := r[0].stdout, r[1].stdout
	t.Logf("doctor: base %d bytes, branch %d bytes", len(baseOut), len(branchOut))
	if lines := bytes.Count(baseOut, []byte("\n")); lines < 5 {
		t.Fatalf("the base doctor printed %d lines, not a report over a cairn site: %q", lines, baseOut)
	}
	if d := firstDiff(baseOut, branchOut); d != "" {
		t.Errorf("cairn doctor's pipe body differs between base and branch at %s\nbase:\n%s\nbranch:\n%s", d, baseOut, branchOut)
	}
}

// TestReportE2EDiffHealthPipe runs cairn health for one site and for every site through the base
// and branch binaries against one proxy and one registry, and finds the pipe bodies identical
// once each checked line's clock text is masked. A control pair of base runs, compared under the
// same mask, shows the mask covers the whole run-to-run difference. A diff that survives one
// rerun fails, since the DNS-bound rows and a day count turning are the only other inputs that
// may move between runs.
func TestReportE2EDiffHealthPipe(t *testing.T) {
	t.Parallel()
	base := baseBinary(t)
	f := newFixture(t, 0)
	other := strings.NewReplacer(siteID, otherSiteID, `"name": "`+siteName+`"`, `"name": "Other Site"`).Replace(siteRecord)
	if err := os.WriteFile(filepath.Join(f.env["CAIRN_STATE_DIR"], otherSiteID+".json"), []byte(other), 0o600); err != nil {
		t.Fatal(err)
	}

	for _, tt := range []struct {
		name  string
		args  []string
		sites int
	}{
		{"one site", []string{"health", siteID}, 1},
		{"every site", []string{"health"}, 2},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctx, cancel := context.WithTimeout(t.Context(), diffTimeout)
			defer cancel()
			diff := compareHealth(t, ctx, f, base, tt.args, tt.sites)
			if diff != "" {
				t.Logf("first attempt differs outside the clock lines, rerunning once:\n%s", diff)
				diff = compareHealth(t, ctx, f, base, tt.args, tt.sites)
			}
			if diff != "" {
				t.Error(diff)
			}
		})
	}
}

// TestReportE2EDiffHealthForcedColorPipe runs cairn health for one site into a pipe with --color
// always under CAIRN_THEME=light and under COLORFGBG=0;15, and finds the branch's bytes equal to
// the base's once the clock lines are masked. Both variables choose a ground for a terminal, so
// neither may repaint a pipe the operator forced into colour. Each output must carry an escape, so
// a run that stopped painting cannot pass.
func TestReportE2EDiffHealthForcedColorPipe(t *testing.T) {
	t.Parallel()
	base := baseBinary(t)
	f := newFixture(t, 0)
	for _, tt := range []struct {
		name      string
		overrides map[string]string
	}{
		{"CAIRN_THEME=light", map[string]string{"CAIRN_THEME": "light"}},
		{"COLORFGBG=0;15", map[string]string{"COLORFGBG": "0;15"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctx, cancel := context.WithTimeout(t.Context(), diffTimeout)
			defer cancel()
			r := runToFiles(t, ctx, f, []string{base, f.bin}, tt.overrides, "health", siteID, "--color", "always")
			masked := make([][]byte, len(r))
			for i, res := range r {
				out, n := maskClock(res.stdout)
				if n != 1 || !bytes.Contains(out, []byte("\x1b[")) || !bytes.Contains(out, []byte("verdict: ")) {
					t.Fatalf("run %d masked %d checked lines, want 1 and a coloured report:\n%q", i, n, res.stdout)
				}
				masked[i] = out
			}
			if d := firstDiff(masked[0], masked[1]); d != "" {
				t.Errorf("a forced-colour pipe under %s differs between base and branch at %s\nbase:\n%q\nbranch:\n%q", tt.name, d, masked[0], masked[1])
			}
		})
	}
}

// compareHealth runs args through four children at once, a differential pair of base and branch
// and a control pair of base and base, and returns a description of any difference left after
// masking, or "". A masked line count that is not sites in every output fails the test outright,
// since no rerun moves it.
func compareHealth(t *testing.T, ctx context.Context, f *fixture, base string, args []string, sites int) string {
	t.Helper()
	bins := []string{base, f.bin, base, base}
	names := []string{"base", "branch", "control base", "control base again"}
	r := runAll(t, ctx, f, bins, args...)
	masked := make([][]byte, len(r))
	for i, res := range r {
		out, n := maskClock(res.stdout)
		t.Logf("%s: %d bytes, %d checked lines masked", names[i], len(res.stdout), n)
		if n != sites {
			t.Fatalf("%s masked %d checked lines, want %d:\n%s", names[i], n, sites, res.stdout)
		}
		if !bytes.Contains(out, []byte("verdict: ")) || !bytes.Contains(out, []byte(siteName)) {
			t.Fatalf("%s printed no health report for %s:\n%s", names[i], siteName, res.stdout)
		}
		masked[i] = out
	}
	var b strings.Builder
	if d := firstDiff(masked[0], masked[1]); d != "" {
		b.WriteString("cairn " + strings.Join(args, " ") + " differs between base and branch at " + d + "\nbase:\n" + string(masked[0]) + "\nbranch:\n" + string(masked[1]) + "\n")
	}
	if d := firstDiff(masked[2], masked[3]); d != "" {
		b.WriteString("the control pair of base runs differs at " + d + "\nfirst:\n" + string(masked[2]) + "\nsecond:\n" + string(masked[3]) + "\n")
	}
	return b.String()
}

// plainHelpSentence is the one line the branch's `cairn --help` adds to the root's Long, the
// sentence that documents CAIRN_PLAIN. No other pipe byte may differ from the base.
const plainHelpSentence = "Set CAIRN_PLAIN=1 to print plain output at a terminal, the same output a pipe receives.\n"

// TestReportE2EDiffListsPipe runs each list command and the root help through the base and branch
// binaries, stdout and stderr each a pipe, beside a control pair of base runs, and finds the
// streams and exit codes byte-identical. Each stdout must be non-empty, so a command that returned
// before drawing its listing cannot pass. Help is the one exception: the branch's output is the
// base's with plainHelpSentence added once and nothing else.
func TestReportE2EDiffListsPipe(t *testing.T) {
	t.Parallel()
	base := baseBinary(t)
	f := newFixture(t, 0)

	for _, tt := range []struct {
		name string
		args []string
		// help names the run whose branch output carries plainHelpSentence.
		help bool
	}{
		{"sites", []string{"sites"}, false},
		{"auth list", []string{"auth", "list"}, false},
		{"adopt list", []string{"adopt", "list"}, false},
		{"help", []string{"--help"}, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctx, cancel := context.WithTimeout(t.Context(), diffTimeout)
			defer cancel()
			r := runAll(t, ctx, f, []string{base, f.bin, base, base}, tt.args...)
			for i, name := range []string{"base", "branch", "control base", "control base again"} {
				t.Logf("%s: stdout %d bytes, stderr %d bytes, exit %d", name, len(r[i].stdout), len(r[i].stderr), r[i].code)
				if len(bytes.TrimSpace(r[i].stdout)) == 0 {
					t.Fatalf("%s printed nothing on stdout for cairn %s; stderr %q", name, strings.Join(tt.args, " "), r[i].stderr)
				}
			}
			branch := r[1].stdout
			if tt.help {
				if n := bytes.Count(r[0].stdout, []byte(plainHelpSentence)); n != 0 {
					t.Fatalf("the base help carries the CAIRN_PLAIN sentence %d times, want 0", n)
				}
				if n := bytes.Count(branch, []byte(plainHelpSentence)); n != 1 {
					t.Fatalf("the branch help carries the CAIRN_PLAIN sentence %d times, want 1:\n%s", n, branch)
				}
				branch = bytes.Replace(branch, []byte(plainHelpSentence), nil, 1)
			}
			compareRuns(t, "base and branch", pipeResult{stdout: r[0].stdout, stderr: r[0].stderr, code: r[0].code}, pipeResult{stdout: branch, stderr: r[1].stderr, code: r[1].code})
			compareRuns(t, "the control pair of base runs", r[2], r[3])
		})
	}
}

// compareRuns fails the test on any difference between a's and b's stdout, stderr, or exit code.
func compareRuns(t *testing.T, pair string, a, b pipeResult) {
	t.Helper()
	if d := firstDiff(a.stdout, b.stdout); d != "" {
		t.Errorf("%s differ on stdout at %s\nfirst:\n%s\nsecond:\n%s", pair, d, a.stdout, b.stdout)
	}
	if d := firstDiff(a.stderr, b.stderr); d != "" {
		t.Errorf("%s differ on stderr at %s\nfirst:\n%s\nsecond:\n%s", pair, d, a.stderr, b.stderr)
	}
	if a.code != b.code {
		t.Errorf("%s exit %d and %d", pair, a.code, b.code)
	}
}

// removedErrors are the messages.go errors this branch deleted. No command line reached any of
// them on the base, so the differential has no row for them.
var removedErrors = []string{"noCredentialsError", "networkDownError", "rateLimitedError", "crashedCheckError"}

// unreachedErrors are the messages.go errors that stay live but that no fixture command reaches:
// a keyring the tagged build's file store never fails, a panic no release-build input raises,
// and the installer's refusals that need an unfinished setup record or a setup token.
var unreachedErrors = []string{
	"keyringUnavailableError", "commandCrashedMessage", "newUnfinishedError",
	"newSeveralUnfinishedError", "newNoRunForPlanError", "newSetupTokenSpaceError",
}

// errorCase is one command line the error differential runs, and the error it reaches.
type errorCase struct {
	// err names the messages.go constructor the line reaches.
	err       string
	args      []string
	overrides map[string]string
}

// promptNewlineRow is the one row whose stderr differs from the base by design: a piped
// `auth set` ends its `NAME: ` prompt line, which the base left open so the error joined it.
const promptNewlineRow = "emptyPipedValueError"

// errorCases returns the error differential's table. Every installer line refuses before setup
// starts, so no row reaches the network or the loopback port. ackDir holds the hold files the
// --ack-file rows read.
func errorCases(t *testing.T, ackDir string) []errorCase {
	t.Helper()
	ack := func(name, content string, perm os.FileMode) string {
		path := filepath.Join(ackDir, name)
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
		if err := os.Chmod(path, perm); err != nil {
			t.Fatal(err)
		}
		return path
	}
	plan := filepath.Join(ackDir, "plan.json")
	answers := []string{"--name", "Site", "--email", "owner@site.example", "--posture", "invite"}
	return []errorCase{
		{"flagError", []string{"health", "--bogus"}, nil},
		{"unknownCommandError", []string{"healt"}, nil},
		{"authNoSubcommandError", []string{"auth"}, nil},
		{"colorInvalidError", []string{"--color", "sometimes", "sites"}, nil},
		{"widthInvalidError", []string{"--width", "5", "sites"}, nil},
		{"themeInvalidError", []string{"--theme", "pink", "sites"}, nil},
		{"unknownSiteError", []string{"health", "nosuch-a1b2c3"}, nil},
		{"invalidSinceError", []string{"logs", siteID, "--since", "tuesday"}, nil},
		{"healthTooManyArgsError", []string{"health", siteID, otherSiteID}, nil},
		{"doctorTooManyArgsError", []string{"doctor", "one", "two"}, nil},
		{"adoptNoWorkerError", []string{"adopt"}, nil},
		{"adoptUnknownWorkerError", []string{"adopt", "--worker", "nope-web"}, nil},
		{"adoptNoDomainError", []string{"adopt", "--worker", "other-site-web"}, nil},
		{"noCloudflareCredentialError", []string{"adopt", "list"}, map[string]string{"CAIRN_CF_READ_TOKEN": "", "CAIRN_CF_ACCOUNT_ID": ""}},
		{"emptyPipedValueError", []string{"auth", "set", "CAIRN_GH_READ_TOKEN"}, nil},
		{"notACredentialError", []string{"auth", "set", "NOT_A_CREDENTIAL"}, nil},
		{"ackFlagError", []string{"health", siteID, "--ack", "bogus"}, nil},
		{"ackFileNotFoundError", []string{"health", siteID, "--ack-file", filepath.Join(ackDir, "absent.json")}, nil},
		{"ackFileMalformedError", []string{"health", siteID, "--ack-file", ack("malformed.json", "not json", 0o600)}, nil},
		{"ackFileMissingCheckIDError", []string{"health", siteID, "--ack-file", ack("no-id.json", `[{"expires": "2099-01-01"}]`, 0o600)}, nil},
		{"ackFileMissingExpiryError", []string{"health", siteID, "--ack-file", ack("no-expiry.json", `[{"checkId": "deploy"}]`, 0o600)}, nil},
		{"ackFileMalformedDateError", []string{"health", siteID, "--ack-file", ack("bad-date.json", `[{"checkId": "deploy", "expires": "tuesday"}]`, 0o600)}, nil},
		{"ackFileUnreadableError", []string{"health", siteID, "--ack-file", ack("unreadable.json", "[]", 0o000)}, nil},
		{"newConflictError", []string{"new", "--plan", plan, "--apply", plan}, nil},
		{"newRequiresError", []string{"new", "--json"}, nil},
		{"newRequiresError, an answer", []string{"new", "--plan", plan}, nil},
		{"newBadPostureError", []string{"new", "--plan", plan, "--name", "Site", "--email", "owner@site.example", "--posture", "bogus"}, nil},
		{"newSandboxedError", []string{"new", "--apply", plan}, map[string]string{"SANDBOX_RUNTIME": "1"}},
		{"newPlanUnreadableError", []string{"new", "--apply", plan}, nil},
		{"newNoSetupError", []string{"new", "--resume", "nosuch-a1b2c3"}, nil},
		{"newBadEmail", []string{"new", "--dry-run", "--name", "Site", "--email", "not-an-email", "--posture", "invite"}, nil},
		{"newUsageError, a name", []string{"new", "--dry-run", "--name", "!!!", "--email", "owner@site.example", "--posture", "invite"}, nil},
		{"newHostOutsideZoneError", append(append([]string{"new", "--plan", plan}, answers...), "--host", "www.one.example", "--zone", "two.example"), nil},
	}
}

// TestReportE2EDiffErrors runs each command line in errorCases through the base and branch
// binaries, and a second base run as the control, stderr to a file as an operator's redirect
// takes it, and finds stdout, stderr, and the exit code byte-identical. Each row must print on
// stderr and exit non-zero, so a line that stopped reaching its error fails rather than passes.
func TestReportE2EDiffErrors(t *testing.T) {
	t.Parallel()
	base := baseBinary(t)
	f := newFixture(t, 0)
	t.Logf("removed on this branch, no row: %s", strings.Join(removedErrors, ", "))
	t.Logf("live but unreached by the fixture, no row: %s", strings.Join(unreachedErrors, ", "))

	for _, tt := range errorCases(t, t.TempDir()) {
		t.Run(tt.err, func(t *testing.T) {
			t.Parallel()
			ctx, cancel := context.WithTimeout(t.Context(), diffTimeout)
			defer cancel()
			r := runToFiles(t, ctx, f, []string{base, f.bin, base}, tt.overrides, tt.args...)
			t.Logf("cairn %s: stderr %d bytes, exit %d", strings.Join(tt.args, " "), len(r[1].stderr), r[1].code)
			for i, name := range []string{"base", "branch", "control base"} {
				if len(r[i].stderr) == 0 || r[i].code == 0 {
					t.Fatalf("%s printed no error: exit %d, stdout %q, stderr %q", name, r[i].code, r[i].stdout, r[i].stderr)
				}
			}
			baseRun := r[0]
			if tt.err == promptNewlineRow {
				// The one approved stderr difference from the base: the prompt line now ends.
				baseRun.stderr = bytes.Replace(baseRun.stderr, []byte("CAIRN_GH_READ_TOKEN: "), []byte("CAIRN_GH_READ_TOKEN: \n"), 1)
			}
			compareRuns(t, "base and branch", baseRun, r[1])
			compareRuns(t, "the control pair of base runs", r[0], r[2])
		})
	}
}

// TestReportE2EDiffExitCodes runs one command line per exit code through the base and branch
// binaries and finds each exits with the code its verdict names, the same on both. The WARNING
// line is doctor with PUBLIC_ORIGIN set, which leaves the missing migration's warning-severity
// failure as the worst result; health reaches no WARNING here, since its email check
// waits on real DNS and reports unknown.
func TestReportE2EDiffExitCodes(t *testing.T) {
	t.Parallel()
	base := baseBinary(t)
	f := newFixture(t, 0)
	for _, tt := range []struct {
		name      string
		args      []string
		overrides map[string]string
		want      int
	}{
		{"0 OK", []string{"sites"}, nil, 0},
		{"1 WARNING", []string{"doctor", doctorSite(t)}, map[string]string{"PUBLIC_ORIGIN": "https://" + siteDomain}, 1},
		{"2 CRITICAL", []string{"health", siteID}, nil, 2},
		{"3 UNKNOWN", []string{"sites", "--expect-sites", "5"}, nil, 3},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctx, cancel := context.WithTimeout(t.Context(), diffTimeout)
			defer cancel()
			r := runToFiles(t, ctx, f, []string{base, f.bin, base}, tt.overrides, tt.args...)
			t.Logf("cairn %s: base exit %d, branch exit %d, control exit %d", strings.Join(tt.args, " "), r[0].code, r[1].code, r[2].code)
			for i, name := range []string{"base", "branch", "control base"} {
				if r[i].code != tt.want {
					t.Errorf("%s exit %d, want %d; stderr %q", name, r[i].code, tt.want, r[i].stderr)
				}
			}
		})
	}
}

// runToFiles runs every bin in bins at once with the same overrides and args, each child's stderr
// on a file of its own, and returns their results in order with stderr read back from the files.
func runToFiles(t *testing.T, ctx context.Context, f *fixture, bins []string, overrides map[string]string, args ...string) []pipeResult {
	t.Helper()
	dir := t.TempDir()
	results := make([]pipeResult, len(bins))
	files := make([]*os.File, len(bins))
	for i := range bins {
		file, err := os.Create(filepath.Join(dir, "stderr-"+strconv.Itoa(i)))
		if err != nil {
			t.Fatal(err)
		}
		files[i] = file
	}
	var wg sync.WaitGroup
	for i, bin := range bins {
		wg.Go(func() { results[i] = runChild(ctx, f, bin, overrides, files[i], args...) })
	}
	wg.Wait()
	for i, file := range files {
		if err := file.Close(); err != nil {
			t.Fatal(err)
		}
		if results[i].err != nil {
			t.Fatalf("run %d of cairn %s (%s): %v", i, strings.Join(args, " "), bins[i], results[i].err)
		}
		data, err := os.ReadFile(file.Name())
		if err != nil {
			t.Fatal(err)
		}
		results[i].stderr = data
	}
	return results
}

// doctorSite writes a doctor site directory under the test's temporary directory and returns it.
func doctorSite(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	writeDoctorSite(t, dir)
	return dir
}

// writeDoctorSite writes into dir a cairn site directory every doctor check reads without the
// network: its wrangler.jsonc declares no PUBLIC_ORIGIN, and the fixture's environment sets none,
// so the posture check never fetches robots.txt. The site's own migrations lack one the engine
// ships, so the report holds a failing row beside its passing ones.
func writeDoctorSite(t *testing.T, dir string) {
	t.Helper()
	for rel, content := range map[string]string{
		"wrangler.jsonc":                                                 `{"send_email": [{"name": "EMAIL"}], "d1_databases": [{"binding": "AUTH_DB"}], "observability": {"enabled": true}}`,
		"vite.config.ts":                                                 "import { sveltekit } from '@sveltejs/kit/vite';\nexport default { plugins: [sveltekit({})] };\n",
		"src/hooks.server.ts":                                            "import { createAuthGuard } from '@glw907/cairn-cms';\nexport const handle = createAuthGuard();\n",
		"src/site/site.config.yaml":                                      "siteName: Test Site\n",
		"src/routes/admin/+layout.svelte":                                "<!-- CairnAdminShell --><script>runtime.shellLoad()</script>",
		"src/content/.cairn/site-facts.json":                             `{"version":1}`,
		"node_modules/@glw907/cairn-cms/migrations/0000_auth.sql":        "-- auth\n",
		"node_modules/@glw907/cairn-cms/migrations/0004_login_nonce.sql": "-- nonce\n",
		"migrations/0000_auth.sql":                                       "-- auth\n",
		"node_modules/@glw907/cairn-cms/package.json":                    `{"peerDependencies": {}}`,
		"package-lock.json":                                              `{"packages":{}}`,
	} {
		full := filepath.Join(dir, rel)
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}
