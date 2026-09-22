package doctor

import (
	"regexp"
	"testing"
)

// renamedLayoutServer is a four-file mount whose composer is renamed to cms: the shellLoad
// member-access lives on a non-default identifier, and the shared shell renders in the layout
// component. Lifted from doctor-checks-admin-mount.test.ts's RENAMED_LAYOUT_SERVER (:14-19).
const renamedLayoutServer = `import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn';
const cms = createCairnAdmin({ runtime });
export const load = cms.shellLoad;
`

// shellLayout renders the shared chrome. Lifted from doctor-checks-admin-mount.test.ts's
// SHELL_LAYOUT (:21-28).
const shellLayout = `<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/components';
  let { data, children } = $props();
</script>

<CairnAdminShell {data}>
  {@render children()}
</CairnAdminShell>
`

// TestAdminMountShape proves admin.mount-shape's two reachable statuses, pass and info, over the
// corpus lifted from doctor-checks-admin-mount.test.ts's 'admin.mount-shape' describe block
// (:30-79). This check never reaches StatusFail or StatusUnchecked on a readable directory; that
// property is proven separately in TestAdminMountShapeNeverFails.
func TestAdminMountShape(t *testing.T) {
	tests := []struct {
		name          string
		files         map[string]string
		wantStatus    Status
		wantDetailRes []*regexp.Regexp
	}{
		{
			name: "pass: a renamed composer that wires shellLoad and renders CairnAdminShell (doctor-checks-admin-mount.test.ts:32-40)",
			files: map[string]string{
				"src/routes/admin/+layout.server.ts": renamedLayoutServer,
				"src/routes/admin/+layout.svelte":    shellLayout,
			},
			wantStatus:    StatusPass,
			wantDetailRes: []*regexp.Regexp{regexp.MustCompile(`shellLoad`), regexp.MustCompile(`CairnAdminShell`)},
		},
		{
			name:       "info: all mount files absent (doctor-checks-admin-mount.test.ts:42-49)",
			files:      map[string]string{},
			wantStatus: StatusInfo,
			wantDetailRes: []*regexp.Regexp{
				regexp.MustCompile(`CairnAdminShell`),
				regexp.MustCompile(`shellLoad`),
				regexp.MustCompile(`\+layout`),
				regexp.MustCompile(`\[\.\.\.path\]`),
			},
		},
		{
			name: "pass: detects the shell render from the catch-all page when the layout carries shellLoad (doctor-checks-admin-mount.test.ts:73-81)",
			files: map[string]string{
				"src/routes/admin/+layout.server.js":      "export const load = cms.shellLoad;",
				"src/routes/admin/[...path]/+page.svelte": shellLayout,
			},
			wantStatus: StatusPass,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := snapshotWithFiles(t, tt.files)
			result := AdminMountShape.Run(s)
			if result.Status != tt.wantStatus {
				t.Fatalf("Status = %v, want %v (detail %q)", result.Status, tt.wantStatus, result.Detail)
			}
			for _, want := range tt.wantDetailRes {
				if !want.MatchString(result.Detail) {
					t.Errorf("Detail = %q, want it to match %q", result.Detail, want)
				}
			}
		})
	}
}

// TestAdminMountShapeNeverFails asserts the property this check must hold over every corpus
// input, rather than case by case: admin.mount-shape never returns StatusFail. A fail is a hard
// deploy gate, and a warning-severity heuristic that could not see an unconventionally wired site
// must never go falsely red. Lifted from doctor-checks-admin-mount.test.ts's
// 'never returns fail for any input' (:52-68).
func TestAdminMountShapeNeverFails(t *testing.T) {
	inputs := []map[string]string{
		{},
		{"src/routes/admin/+layout.server.ts": renamedLayoutServer},
		{"src/routes/admin/+layout.svelte": shellLayout},
		{"src/routes/admin/[...path]/+page.svelte": "<p>unrelated</p>"},
		{
			"src/routes/admin/+layout.server.ts": renamedLayoutServer,
			"src/routes/admin/+layout.svelte":    shellLayout,
		},
	}
	for i, files := range inputs {
		s := snapshotWithFiles(t, files)
		result := AdminMountShape.Run(s)
		if result.Status == StatusFail {
			t.Errorf("input %d: Status = StatusFail, want never fail (files %+v)", i, files)
		}
	}
}

func TestAdminMountShapeConditionID(t *testing.T) {
	if string(AdminMountShape.Condition) != "admin.mount-incomplete" {
		t.Errorf("Condition = %q, want admin.mount-incomplete", AdminMountShape.Condition)
	}
}
