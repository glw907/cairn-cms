package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/internal/spine"
)

// startDoctorRobotsServer serves a fixed, unmanaged robots.txt over loopback, so
// ai.posture-effective settles to a pass instead of an unchecked result the way it would with
// no reachable origin at all. Using a real (loopback) HTTP server rather than stubbing
// doctor.FetchRobots proves cairn doctor's own network path end to end, the same shape the
// exit-code arithmetic under test depends on: an unrelated unchecked result would otherwise
// outrank a warning fixture's own single failure (spine's own severity order, CRITICAL then
// UNKNOWN then WARNING then OK).
func startDoctorRobotsServer(t *testing.T) string {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("User-agent: *\nDisallow:\n"))
	}))
	t.Cleanup(srv.Close)
	return srv.URL
}

// doctorCleanWranglerJSONC is a wrangler.jsonc every check this pass ports reads cleanly, its
// PUBLIC_ORIGIN pointed at a caller-supplied loopback origin.
func doctorCleanWranglerJSONC(origin string) string {
	return `{
  "send_email": [{"name": "EMAIL"}],
  "d1_databases": [{"binding": "AUTH_DB"}],
  "observability": {"enabled": true},
  "vars": {"PUBLIC_ORIGIN": "` + origin + `"}
}`
}

// doctorCleanSiteFiles writes the file set every one of cairn doctor's eleven checks passes or
// skips cleanly against, the command-level twin of internal/doctor's own report_test.go fixture.
// A case that wants exactly one failing check copies this map and overwrites one entry.
func doctorCleanSiteFiles(origin string) map[string]string {
	return map[string]string{
		"wrangler.jsonc":                              doctorCleanWranglerJSONC(origin),
		"svelte.config.js":                            "export default { kit: { csrf: { checkOrigin: false } } };\n",
		"src/hooks.server.ts":                         "import { createAuthGuard } from '@glw907/cairn-cms';\nexport const handle = createAuthGuard();\n",
		"src/theme/site.config.yaml":                  "siteName: Test Site\n",
		"src/routes/admin/+layout.svelte":             "<!-- CairnAdminShell --><script>runtime.shellLoad()</script>",
		"src/content/.cairn/site-facts.json":          `{"version":1}`,
		"node_modules/@glw907/cairn-cms/package.json": `{"peerDependencies": {}}`,
		"package-lock.json":                           `{"packages":{}}`,
	}
}

// writeDoctorFixture writes files under a fresh temp directory and returns its path.
func writeDoctorFixture(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	for rel, content := range files {
		full := filepath.Join(dir, rel)
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			t.Fatalf("mkdir for %s: %v", rel, err)
		}
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			t.Fatalf("write %s: %v", rel, err)
		}
	}
	return dir
}

// TestDoctorExitCodes proves the four exit codes the tool's monitoring-plugin convention
// promises, each over the real command tree (cmd.SetArgs, through execTree) against a fixture
// directory, never a unit call straight into the doctor package.
func TestDoctorExitCodes(t *testing.T) {
	origin := startDoctorRobotsServer(t)

	t.Run("a blocker failure exits 2", func(t *testing.T) {
		files := doctorCleanSiteFiles(origin)
		files["wrangler.jsonc"] = `{
  "observability": {"enabled": true},
  "vars": {"PUBLIC_ORIGIN": "` + origin + `"}
}`
		dir := writeDoctorFixture(t, files)

		d, code := testDeps(t)
		stdout, _, err := execTree(t, d, "doctor", dir)
		if err != nil {
			t.Fatalf("doctor %s: %v", dir, err)
		}
		if *code != int(spine.VerdictCritical) {
			t.Errorf("exit code = %d, want %d (CRITICAL)", *code, int(spine.VerdictCritical))
		}
		if !strings.Contains(stdout, "FAIL  Wrangler bindings are missing") {
			t.Errorf("stdout = %q, want the bindings failure line", stdout)
		}
	})

	t.Run("a warning failure exits 1", func(t *testing.T) {
		files := doctorCleanSiteFiles(origin)
		files["wrangler.jsonc"] = `{
  "send_email": [{"name": "EMAIL"}],
  "d1_databases": [{"binding": "AUTH_DB"}],
  "observability": {"enabled": false},
  "vars": {"PUBLIC_ORIGIN": "` + origin + `"}
}`
		dir := writeDoctorFixture(t, files)

		d, code := testDeps(t)
		stdout, _, err := execTree(t, d, "doctor", dir)
		if err != nil {
			t.Fatalf("doctor %s: %v", dir, err)
		}
		if *code != int(spine.VerdictWarning) {
			t.Errorf("exit code = %d, want %d (WARNING)", *code, int(spine.VerdictWarning))
		}
		if !strings.Contains(stdout, "FAIL  Workers Logs has no sink") {
			t.Errorf("stdout = %q, want the observability failure line", stdout)
		}
	})

	t.Run("an unchecked result with no failure exits 3", func(t *testing.T) {
		files := doctorCleanSiteFiles(origin)
		delete(files, "node_modules/@glw907/cairn-cms/package.json")
		dir := writeDoctorFixture(t, files)

		d, code := testDeps(t)
		stdout, _, err := execTree(t, d, "doctor", dir)
		if err != nil {
			t.Fatalf("doctor %s: %v", dir, err)
		}
		if *code != int(spine.VerdictUnknown) {
			t.Errorf("exit code = %d, want %d (UNKNOWN)", *code, int(spine.VerdictUnknown))
		}
		if strings.Contains(stdout, "FAIL") {
			t.Errorf("stdout = %q, want no failure line", stdout)
		}
		if !strings.Contains(stdout, "UNCHECKED  A framework dependency sits below the engine floor") {
			t.Errorf("stdout = %q, want the dependency-floors unchecked line", stdout)
		}
	})

	t.Run("a clean run exits 0", func(t *testing.T) {
		dir := writeDoctorFixture(t, doctorCleanSiteFiles(origin))

		d, code := testDeps(t)
		stdout, _, err := execTree(t, d, "doctor", dir)
		if err != nil {
			t.Fatalf("doctor %s: %v", dir, err)
		}
		if *code != int(spine.VerdictOK) {
			t.Errorf("exit code = %d, want %d (OK)", *code, int(spine.VerdictOK))
		}
		if strings.Contains(stdout, "FAIL") || strings.Contains(stdout, "UNCHECKED") {
			t.Errorf("stdout = %q, want no failure or unchecked line", stdout)
		}
	})
}

// TestDoctorOutsideACairnSitePrintsOneLineAndExitsUnknown is the fifth test: a directory
// carrying neither a wrangler config nor a package.json naming @glw907/cairn-cms earns one line
// and exit 3, never a wall of eleven failures.
func TestDoctorOutsideACairnSitePrintsOneLineAndExitsUnknown(t *testing.T) {
	dir := t.TempDir()

	d, code := testDeps(t)
	stdout, _, err := execTree(t, d, "doctor", dir)
	if err != nil {
		t.Fatalf("doctor %s: %v", dir, err)
	}
	if *code != int(spine.VerdictUnknown) {
		t.Errorf("exit code = %d, want %d (UNKNOWN)", *code, int(spine.VerdictUnknown))
	}
	want := notACairnSiteLine(dir) + "\n"
	if stdout != want {
		t.Errorf("stdout = %q, want %q", stdout, want)
	}
	if strings.Count(stdout, "\n") != 1 {
		t.Errorf("stdout = %q, want exactly one line", stdout)
	}
}

// TestDoctorQuietDoesNotSuppressOutsideACairnSite covers the one carve-out to --quiet
// suppressing a whole report: it silences only an OK run, and the outside-a-cairn-site verdict
// is UNKNOWN, never OK.
func TestDoctorQuietDoesNotSuppressOutsideACairnSite(t *testing.T) {
	dir := t.TempDir()

	d, _ := testDeps(t)
	stdout, _, err := execTree(t, d, "doctor", dir, "--quiet")
	if err != nil {
		t.Fatalf("doctor %s --quiet: %v", dir, err)
	}
	if stdout == "" {
		t.Error("--quiet printed nothing for a run that is not OK")
	}
}

// TestDoctorQuietPrintsNothingOnAnOKRun and TestDoctorQuietPrintsTheWholeReportOnAFailingRun are
// the acceptance criterion's own two halves: --quiet on a clean run writes nothing at all, and
// on a failing run writes the whole report, health_quiet_test.go's own rule carried over.
func TestDoctorQuietPrintsNothingOnAnOKRun(t *testing.T) {
	origin := startDoctorRobotsServer(t)
	dir := writeDoctorFixture(t, doctorCleanSiteFiles(origin))

	d, code := testDeps(t)
	stdout, _, err := execTree(t, d, "doctor", dir, "--quiet")
	if err != nil {
		t.Fatalf("doctor %s --quiet: %v", dir, err)
	}
	if len(stdout) != 0 {
		t.Errorf("stdout = %q, want no bytes at all", stdout)
	}
	if *code != int(spine.VerdictOK) {
		t.Errorf("exit code = %d, want %d (OK)", *code, int(spine.VerdictOK))
	}
}

func TestDoctorQuietPrintsTheWholeReportOnAFailingRun(t *testing.T) {
	origin := startDoctorRobotsServer(t)
	files := doctorCleanSiteFiles(origin)
	files["wrangler.jsonc"] = `{
  "observability": {"enabled": true},
  "vars": {"PUBLIC_ORIGIN": "` + origin + `"}
}`
	dir := writeDoctorFixture(t, files)

	d, _ := testDeps(t)
	loud, _, err := execTree(t, d, "doctor", dir)
	if err != nil {
		t.Fatalf("doctor %s: %v", dir, err)
	}
	quiet, _, err := execTree(t, d, "doctor", dir, "--quiet")
	if err != nil {
		t.Fatalf("doctor %s --quiet: %v", dir, err)
	}
	if quiet != loud {
		t.Errorf("--quiet stdout = %q, want the same bytes as without it, %q", quiet, loud)
	}
	if len(quiet) == 0 {
		t.Error("--quiet printed nothing for a run that is not OK")
	}
}

// TestADoctorUsageErrorExitsUnknownWithEmptyStdout runs cairn doctor's own usage errors against
// the real built binary (usage_test.go's runBinary), the byte-empty-stdout rule
// TestAUsageErrorExitsUnknownWithEmptyStdout already proves for the whole tree, asserted here for
// this command specifically: a second positional directory and an unknown flag both refuse
// before any check runs.
func TestADoctorUsageErrorExitsUnknownWithEmptyStdout(t *testing.T) {
	for _, args := range [][]string{
		{"doctor", "one-dir", "two-dir"},
		{"doctor", "--not-a-real-flag"},
	} {
		t.Run(strings.Join(args, " "), func(t *testing.T) {
			stdout, stderr, code := runBinary(t, args...)

			if code != int(spine.VerdictUnknown) {
				t.Errorf("exit code = %d, want %d", code, int(spine.VerdictUnknown))
			}
			if len(stdout) != 0 {
				t.Errorf("stdout = %q, want no bytes at all", stdout)
			}
			if !strings.Contains(stderr, "cairn: ") {
				t.Errorf("stderr = %q, want a cairn: prefixed line", stderr)
			}
		})
	}
}
