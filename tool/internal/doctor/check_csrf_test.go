package doctor

import (
	"strings"
	"testing"
)

// csrfDisabled is the tutorial's disable, lifted from doctor-checks-local.test.ts's CSRF_DISABLED.
const csrfDisabled = `const config = { kit: { csrf: { checkOrigin: false } } };
export default config;
`

// cairnHooks is the tutorial's hooks wiring, lifted from doctor-checks-local.test.ts's CAIRN_HOOKS:
// the engine guard imported from the package and handed the export.
const cairnHooks = `import type { Handle } from '@sveltejs/kit';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
const guard = createAuthGuard();
export const handle: Handle = ({ event, resolve }) => guard({ event, resolve });
`

// TestConfigCsrfDisable proves config.csrf-disable's three reachable statuses against corpus
// cases lifted from doctor-checks-local.test.ts's 'config.csrf-disable' describe block
// (:330-412): pass (the disable found and the hooks file wires the cairn guard), fail (the
// disable is commented out, absent, present with no guard, or present with an unwired hooks
// file), and unchecked (neither candidate config file exists).
func TestConfigCsrfDisable(t *testing.T) {
	tests := []struct {
		name          string
		files         map[string]string
		wantStatus    Status
		wantDetailHas []string
	}{
		{
			name: "pass: disable present and hooks wires the cairn guard (doctor-checks-local.test.ts:331-338)",
			files: map[string]string{
				"svelte.config.js":    csrfDisabled,
				"src/hooks.server.ts": cairnHooks,
			},
			wantStatus:    StatusPass,
			wantDetailHas: []string{"checkOrigin: false", "guard"},
		},
		{
			name: "pass: accepts the guard wiring in .js when no .ts hooks file exists (doctor-checks-local.test.ts:340-345)",
			files: map[string]string{
				"svelte.config.js":    csrfDisabled,
				"src/hooks.server.js": cairnHooks,
			},
			wantStatus: StatusPass,
		},
		{
			name: "fail: the only checkOrigin: false sits on a commented-out line (doctor-checks-local.test.ts:347-358)",
			files: map[string]string{
				"svelte.config.js":    "const config = { kit: {\n  // csrf: { checkOrigin: false },\n} };\nexport default config;\n",
				"src/hooks.server.ts": cairnHooks,
			},
			wantStatus:    StatusFail,
			wantDetailHas: []string{"heuristic"},
		},
		{
			name: "fail: disable present but no hooks file exists (doctor-checks-local.test.ts:360-365)",
			files: map[string]string{
				"svelte.config.js": csrfDisabled,
			},
			wantStatus:    StatusFail,
			wantDetailHas: []string{"no cairn guard found", "no CSRF protection"},
		},
		{
			name: "fail: hooks file never mentions cairn (doctor-checks-local.test.ts:367-374)",
			files: map[string]string{
				"svelte.config.js":    csrfDisabled,
				"src/hooks.server.ts": "export const handle = ({ event, resolve }) => resolve(event);\n",
			},
			wantStatus:    StatusFail,
			wantDetailHas: []string{"no cairn guard found"},
		},
		{
			name: "fail: the disable is absent (doctor-checks-local.test.ts:376-382)",
			files: map[string]string{
				"svelte.config.js": "export default { kit: {} };",
			},
			wantStatus:    StatusFail,
			wantDetailHas: []string{"heuristic"},
		},
		{
			name:          "unchecked: neither svelte.config.js nor vite.config.ts exists (doctor-checks-local.test.ts:384-389)",
			files:         map[string]string{},
			wantStatus:    StatusUnchecked,
			wantDetailHas: []string{"svelte.config.js", "vite.config.ts"},
		},
		{
			name: "pass: reads the disable off vite.config.ts when svelte.config.js is absent (doctor-checks-local.test.ts:391-396)",
			files: map[string]string{
				"vite.config.ts":      csrfDisabled,
				"src/hooks.server.ts": cairnHooks,
			},
			wantStatus: StatusPass,
		},
		{
			name: "fail: both config files exist but neither carries the disable (doctor-checks-local.test.ts:398-407)",
			files: map[string]string{
				"svelte.config.js": "export default { kit: {} };",
				"vite.config.ts":   "export default { plugins: [] };",
			},
			wantStatus:    StatusFail,
			wantDetailHas: []string{"heuristic"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			result := ConfigCsrfDisable.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			for _, want := range tt.wantDetailHas {
				if !strings.Contains(result.Detail, want) {
					t.Errorf("Detail = %q, want it to contain %q", result.Detail, want)
				}
			}
			if tt.wantStatus == StatusFail && result.Severity != severityFor(ConfigCsrfDisable.Condition) {
				t.Errorf("Severity = %v, want the registry severity for %s", result.Severity, ConfigCsrfDisable.Condition)
			}
		})
	}
}

// TestHasUncommentedDisableGapCase is the named gap case (plan constraint): a commented-out
// checkOrigin: false disable must never read as present. Proven directly against the helper,
// which fails without the comment-marker guard: a naive regex search over the raw text finds the
// commented-out disable and returns true.
func TestHasUncommentedDisableGapCase(t *testing.T) {
	text := "const config = { kit: {\n  // csrf: { checkOrigin: false },\n} };\n"
	if hasUncommentedDisable(text) {
		t.Fatal("hasUncommentedDisable(text) = true for a commented-out disable, want false")
	}
}

func TestConfigCsrfDisableConditionID(t *testing.T) {
	if string(ConfigCsrfDisable.Condition) != "config.csrf-disable-missing" {
		t.Errorf("Condition = %q, want config.csrf-disable-missing", ConfigCsrfDisable.Condition)
	}
}
