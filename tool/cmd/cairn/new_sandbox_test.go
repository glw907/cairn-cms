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
	cmd.SetArgs([]string{"--dry-run", "--name", "Site", "--email", "owner@example.com", "--posture", "decline"})
	if err := cmd.Execute(); err != nil && strings.Contains(err.Error(), "sandbox") {
		t.Fatalf("a dry run was refused as sandboxed: %v", err)
	}
}
