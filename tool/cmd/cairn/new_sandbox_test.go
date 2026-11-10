package main

import (
	"bytes"
	"strings"
	"testing"
)

// TestInSandboxReadsClaudeCodesMarker pins the one signal the refusal rests on: a sandboxed call
// carries SANDBOX_RUNTIME and an excluded call does not.
func TestInSandboxReadsClaudeCodesMarker(t *testing.T) {
	tests := []struct {
		name string
		env  map[string]string
		want bool
	}{
		{"no marker", nil, false},
		{"empty marker", map[string]string{"SANDBOX_RUNTIME": ""}, false},
		{"marker set", map[string]string{"SANDBOX_RUNTIME": "1"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := inSandbox(fakeEnv(tt.env)); got != tt.want {
				t.Errorf("inSandbox = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestASandboxedSetupStopsBeforeItServesAnything runs each mode that serves the approval page
// inside a sandbox and expects the one actionable refusal and no setup event. A dry run reads
// nothing and serves nothing, so it is not refused.
func TestASandboxedSetupStopsBeforeItServesAnything(t *testing.T) {
	sandboxed := map[string]string{"SANDBOX_RUNTIME": "1"}
	tests := []struct {
		name string
		args []string
	}{
		{"plan", []string{"--plan", "plan.json", "--name", "Site", "--email", "owner@example.com", "--posture", "decline"}},
		{"apply", []string{"--apply", "plan.json"}},
		{"resume", []string{"--resume", "abc123"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := mustDeps(t)
			d.env = fakeEnv(sandboxed)
			cmd := newNewCmd(d, &rootFlags{})
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.args)
			err := cmd.Execute()
			if err == nil || !strings.Contains(err.Error(), "runs inside a sandbox") {
				t.Fatalf("Execute error = %v, want the sandbox refusal", err)
			}
			for _, want := range []string{"no `cd`, pipe, or redirect", "exclude the command from the sandbox"} {
				if !strings.Contains(err.Error(), want) {
					t.Errorf("refusal %q lacks %q", err, want)
				}
			}
			if strings.Contains(out.String(), `{"`) {
				t.Errorf("wrote a setup event before refusing: %q", out.String())
			}
		})
	}
}

// TestADryRunInASandboxIsNotRefused checks the one mode that needs no approval page.
func TestADryRunInASandboxIsNotRefused(t *testing.T) {
	d := mustDeps(t)
	d.env = fakeEnv(map[string]string{"SANDBOX_RUNTIME": "1"})
	cmd := newNewCmd(d, &rootFlags{})
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs([]string{"--dry-run", "--json", "--name", "Site", "--email", "owner@example.com", "--posture", "decline"})
	if err := cmd.Execute(); err != nil {
		t.Fatalf("a dry run in a sandbox failed: %v", err)
	}
	if !strings.Contains(out.String(), `"kind":"dryRun"`) {
		t.Errorf("dry run printed %q, want the dryRun payload", out.String())
	}
}

// TestTheGuideAndTheTerminalRunMeetTheSandboxStopOnlyWhereTheTabIsServed pins the two calls with no
// mode flag: no terminal prints the agent guide, which serves nothing and so runs in a sandbox, and a
// terminal run would serve the tab and is refused there.
func TestTheGuideAndTheTerminalRunMeetTheSandboxStopOnlyWhereTheTabIsServed(t *testing.T) {
	run := func(t *testing.T, interactive bool) (string, error) {
		t.Helper()
		d := mustDeps(t)
		d.env = fakeEnv(map[string]string{"SANDBOX_RUNTIME": "1"})
		d.interactive = func() bool { return interactive }
		cmd := newNewCmd(d, &rootFlags{})
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		cmd.SetArgs(nil)
		err := cmd.Execute()
		return out.String(), err
	}
	t.Run("no terminal prints the guide", func(t *testing.T) {
		out, err := run(t, false)
		if err != nil || out != agentPage {
			t.Errorf("no-terminal call = %q, %v; want the agent guide and no error", out, err)
		}
	})
	t.Run("a terminal run is refused", func(t *testing.T) {
		_, err := run(t, true)
		if err == nil || !strings.Contains(err.Error(), "runs inside a sandbox") {
			t.Errorf("terminal run error = %v, want the sandbox refusal", err)
		}
	})
}
