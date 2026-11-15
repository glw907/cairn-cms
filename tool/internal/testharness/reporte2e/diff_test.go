package reporte2e

import (
	"bytes"
	"context"
	"errors"
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

// pipeResult is one child's captured streams.
type pipeResult struct {
	stdout []byte
	stderr []byte
	err    error
}

// runPipe runs bin with args under the fixture's environment, its stdout and stderr each a pipe
// into its own buffer. A non-zero exit is a verdict and leaves err nil; a child that could not
// start, or that ctx killed, sets it.
func runPipe(ctx context.Context, f *fixture, bin string, args ...string) pipeResult {
	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Env = f.environ(nil)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	cmd.WaitDelay = 5 * time.Second
	err := cmd.Run()
	if exit, ok := errors.AsType[*exec.ExitError](err); ok && exit.ExitCode() >= 0 {
		err = nil
	}
	return pipeResult{stdout: stdout.Bytes(), stderr: stderr.Bytes(), err: err}
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
