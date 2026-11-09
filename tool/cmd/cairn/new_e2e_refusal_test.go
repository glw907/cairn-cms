package main

import (
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/setup/agentview"
)

// TestNewE2EPlanRefusesBeforeAnythingRunsWhenTheFlagsAreWrong holds the binding contract of
// exit 3: nothing ran, so stdout is empty, even for a refusal the run itself finds.
func TestNewE2EPlanRefusesBeforeAnythingRunsWhenTheFlagsAreWrong(t *testing.T) {
	const twoThemes = `{"themes":[{"id":"waymark","name":"Waymark","path":"waymark"},{"id":"harbor","name":"Harbor","path":"waymark"}]}`
	for _, tc := range []struct {
		name    string
		catalog string
		extra   []string
		want    string
	}{
		{"several themes and no --site-theme", twoThemes, nil, "--site-theme"},
		{"a --host outside the --zone", "", []string{"--host", "elsewhere.example.org"}, "--host"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := newE2ERun(t)
			r.w.catalog = tc.catalog
			r.flags = append(r.flags, tc.extra...)
			res := r.planRun()
			if res.ExitCode != 3 || res.Stdout != "" || !strings.Contains(res.Stderr, tc.want) {
				t.Errorf("exit %d, stdout %q, stderr %q; want 3, empty, naming %s", res.ExitCode, res.Stdout, res.Stderr, tc.want)
			}
		})
	}
}

// TestNewE2EAHostOutsideAnOpenZoneIsRefusedAtApply: with the zone left open the plan cannot tell
// whether the host fits, so it writes the plan, and --apply refuses it before anything runs.
func TestNewE2EAHostOutsideAnOpenZoneIsRefusedAtApply(t *testing.T) {
	r := newE2ERun(t)
	r.flags = []string{"--name", "Example Site", "--email", "owner@example.com", "--posture", "decline", "--host", "elsewhere.example.org"}
	if res := r.planRun(); res.ExitCode != 0 {
		t.Fatalf("plan: exit %d\nstdout:\n%s\nstderr:\n%s", res.ExitCode, res.Stdout, res.Stderr)
	}
	r.editPlan(t, func(p *agentview.Plan) { p.Zone = e2eZone })
	res := r.c.Run(r.bin, "new", "--apply", r.plan)
	if res.ExitCode != 3 || res.Stdout != "" || !strings.Contains(res.Stderr, "elsewhere.example.org") {
		t.Errorf("apply: exit %d, stdout %q, stderr %q; want 3, empty, naming the address", res.ExitCode, res.Stdout, res.Stderr)
	}
}

func TestNewE2EResumeRefusesSiteTheme(t *testing.T) {
	r := newE2ERun(t)
	r.planLeftOpen(t)
	id, _, _ := strings.Cut(strings.TrimSpace(r.status()), " ")
	res := r.c.Run(r.bin, "new", "--resume", id, "--site-theme", "waymark")
	if res.ExitCode != 3 || res.Stdout != "" || !strings.Contains(res.Stderr, "--site-theme") {
		t.Errorf("exit %d, stdout %q, stderr %q; want 3, empty, naming --site-theme", res.ExitCode, res.Stdout, res.Stderr)
	}
}
