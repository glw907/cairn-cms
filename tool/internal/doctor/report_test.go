package doctor

import (
	"flag"
	"maps"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// updateGolden regenerates every golden text report from the current checks. `make -C tool
// golden` does not cover this package: the report is plain text built here, never a render
// package body, so that target does not reach it; run
// `go test ./internal/doctor -run TestGolden -update` and read the diff instead.
var updateGolden = flag.Bool("update", false, "rewrite the golden text reports from this package's checks")

// cleanWranglerJSONC is a wrangler.jsonc every config check this pass ports reads cleanly: both
// bindings declared, observability on, and a PUBLIC_ORIGIN the command layer would resolve into
// Snapshot.PublicOrigin's OriginFromVars.
const cleanWranglerJSONC = `{
  "send_email": [{"name": "EMAIL"}],
  "d1_databases": [{"binding": "AUTH_DB"}],
  "observability": {"enabled": true},
  "vars": {"PUBLIC_ORIGIN": "https://example.com"}
}`

// cleanSiteFiles is the file set a passing site carries for every check this pass ports: valid
// wrangler bindings, the CSRF disable paired with a wired guard, a valid site.config.yaml at its
// canonical path, a wired /admin mount, an installed engine satisfying its own peer floors, and a
// site-facts.json declaring no media bucket and no custom roles (so both facts-dependent checks
// that read it settle as a clean skip rather than a pass needing more fixture).
func cleanSiteFiles() map[string]string {
	return map[string]string{
		"wrangler.jsonc":                              cleanWranglerJSONC,
		"svelte.config.js":                            "export default { kit: { csrf: { checkOrigin: false } } };\n",
		"src/hooks.server.ts":                         "import { createAuthGuard } from '@glw907/cairn-cms';\nexport const handle = createAuthGuard();\n",
		"src/theme/site.config.yaml":                  "siteName: Test Site\n",
		"src/routes/admin/+layout.svelte":             "<!-- CairnAdminShell --><script>runtime.shellLoad()</script>",
		"src/content/.cairn/site-facts.json":          `{"version":1}`,
		"node_modules/@glw907/cairn-cms/package.json": enginePackageJSONFixture,
		"package-lock.json": npmLockFixture(map[string]string{
			"svelte":        "5.56.10",
			"@sveltejs/kit": "2.70.0",
		}),
	}
}

// cleanOrigin and cleanRobots are what the command layer would have resolved and fetched for
// cleanSiteFiles's own wrangler vars and a live, unmanaged robots.txt declining nothing.
func cleanOrigin() PublicOrigin {
	return PublicOrigin{Value: "https://example.com", Source: OriginFromVars}
}

func cleanRobots() Robots {
	return Robots{Present: true, Body: "User-agent: *\nDisallow:\n"}
}

// withFile returns a copy of files with rel set to content, added or overwritten, leaving files
// itself untouched.
func withFile(files map[string]string, rel, content string) map[string]string {
	out := make(map[string]string, len(files)+1)
	maps.Copy(out, files)
	out[rel] = content
	return out
}

// withoutFile returns a copy of files with rel removed, leaving files itself untouched.
func withoutFile(files map[string]string, rel string) map[string]string {
	out := make(map[string]string, len(files))
	for k, v := range files {
		if k != rel {
			out[k] = v
		}
	}
	return out
}

// buildSnapshot writes files into a fresh temp directory and returns the Snapshot a command
// layer would have handed the checks: Dir resolved, PublicOrigin and Robots stamped.
func buildSnapshot(t *testing.T, files map[string]string, origin PublicOrigin, robots Robots) Snapshot {
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
	snap, err := NewSnapshot(dir)
	if err != nil {
		t.Fatalf("NewSnapshot(%s): %v", dir, err)
	}
	snap.PublicOrigin = origin
	snap.Robots = robots
	return snap
}

// goldenReportCase is one committed text-report fixture: the directory contents and resolved
// origin/robots a command layer would have handed Run, and the golden file its Format output is
// compared against.
type goldenReportCase struct {
	// name is the golden file's own stem under testdata/golden.
	name string
	// files is the Snapshot's directory contents.
	files map[string]string
	// origin and robots are what the command layer stamps onto the Snapshot before any check
	// runs.
	origin PublicOrigin
	robots Robots
}

// goldenReportCases is the committed corpus: an all-clean run, one blocker failure, one warning
// failure, an unchecked result, and a run carrying every status at once.
func goldenReportCases() []goldenReportCase {
	return []goldenReportCase{
		{
			name:   "all-clean",
			files:  cleanSiteFiles(),
			origin: cleanOrigin(),
			robots: cleanRobots(),
		},
		{
			// config.bindings-missing is a blocker (spine.CriticalFailure): dropping both
			// declared bindings fails only that one check.
			name: "one-blocker-failure",
			files: withFile(cleanSiteFiles(), "wrangler.jsonc", `{
  "observability": {"enabled": true},
  "vars": {"PUBLIC_ORIGIN": "https://example.com"}
}`),
			origin: cleanOrigin(),
			robots: cleanRobots(),
		},
		{
			// config.csrf-disable-missing is a warning: the disable is still present in
			// svelte.config.js, but the hooks file no longer wires the cairn guard, so only
			// config.csrf-disable fails (config.no-referrer-blanket still passes: the file
			// carries no Referrer-Policy line at all).
			name: "one-warning-failure",
			files: withFile(cleanSiteFiles(), "src/hooks.server.ts",
				"export const handle = async ({ event, resolve }) => resolve(event);\n"),
			origin: cleanOrigin(),
			robots: cleanRobots(),
		},
		{
			// ai.posture-effective is unchecked when the command layer's own GET did not
			// produce a robots.txt body; every other check still reads cleanSiteFiles cleanly.
			name:   "unchecked-result",
			files:  cleanSiteFiles(),
			origin: cleanOrigin(),
			robots: Robots{Present: false, Reason: RobotsAbsentTransportFailure},
		},
		{
			// Every one of the five doctor statuses in one run: config.observability fails
			// (warning), admin.mount-shape reports info (no mount files at all),
			// ai.posture-effective is unchecked (no robots body), config.media-bucket and
			// auth.role-wiring skip (cleanSiteFiles declares neither), and the rest pass.
			name: "every-status",
			files: withoutFile(withFile(cleanSiteFiles(), "wrangler.jsonc", `{
  "send_email": [{"name": "EMAIL"}],
  "d1_databases": [{"binding": "AUTH_DB"}],
  "observability": {"enabled": false},
  "vars": {"PUBLIC_ORIGIN": "https://example.com"}
}`), "src/routes/admin/+layout.svelte"),
			origin: cleanOrigin(),
			robots: Robots{Present: false, Reason: RobotsAbsentTransportFailure},
		},
	}
}

// goldenPath is c's committed file, one plain-text report per case.
func (c goldenReportCase) goldenPath() string {
	return filepath.Join("testdata", "golden", c.name+".txt")
}

// TestGolden cuts every committed text report from the real checks and compares it to its
// golden file. The literal bytes are the acceptance surface, including the failure block's why,
// fix, and docs URL lines, so a change to any of them is a change a reviewer reads.
func TestGolden(t *testing.T) {
	for _, c := range goldenReportCases() {
		t.Run(c.name, func(t *testing.T) {
			snap := buildSnapshot(t, c.files, c.origin, c.robots)
			got := Format(Run(snap)) + "\n"

			if *updateGolden {
				if err := os.MkdirAll(filepath.Dir(c.goldenPath()), 0o755); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(c.goldenPath(), []byte(got), 0o644); err != nil {
					t.Fatal(err)
				}
				return
			}

			want, err := os.ReadFile(c.goldenPath())
			if err != nil {
				t.Fatalf("%v; run `go test ./internal/doctor -run TestGolden -update` to cut it", err)
			}
			if got != strings.ReplaceAll(string(want), "\r\n", "\n") {
				t.Errorf("report differs from %s\n--- got ---\n%s\n--- want ---\n%s", c.goldenPath(), got, want)
			}
		})
	}
}

// TestGoldenFailureBlockCarriesDocsURL holds the one-blocker and one-warning goldens to the
// acceptance criterion that a failure block carries its docs URL: both conditions this corpus
// raises declare a docsAnchor in the embedded mirror.
func TestGoldenFailureBlockCarriesDocsURL(t *testing.T) {
	for _, name := range []string{"one-blocker-failure", "one-warning-failure", "every-status"} {
		t.Run(name, func(t *testing.T) {
			body, err := os.ReadFile(filepath.Join("testdata", "golden", name+".txt"))
			if err != nil {
				t.Fatalf("read golden: %v", err)
			}
			if !strings.Contains(string(body), "  Docs: https://cairn.pub/docs/admin/") {
				t.Errorf("%s carries no docs URL line:\n%s", name, body)
			}
		})
	}
}

// TestDocsURLDropsTheMdExtension pins the published docs URL's exact shape: the mirror's
// basename without .md, joined to its fragment.
func TestDocsURLDropsTheMdExtension(t *testing.T) {
	got := docsURL("is-it-working.md#deploy-the-worker-with-its-bindings")
	want := "https://cairn.pub/docs/admin/is-it-working#deploy-the-worker-with-its-bindings"
	if got != want {
		t.Errorf("docsURL = %q, want %q", got, want)
	}
}

// TestDocsURLIsEmptyForNoAnchor covers the condition-carries-no-docsAnchor case, which every
// registry entry this pass raises happens not to hit today but the function must still handle:
// a report must print no broken URL line for it.
func TestDocsURLIsEmptyForNoAnchor(t *testing.T) {
	if got := docsURL(""); got != "" {
		t.Errorf("docsURL(\"\") = %q, want empty", got)
	}
}
