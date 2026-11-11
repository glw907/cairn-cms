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
			assertRefusalOrder(t, err.Error())
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

// assertRefusalOrder checks the refusal lists its remedies from the cheapest: a bare retry, which
// needs no prompt and no settings change, then the parameter, then the exclusions. An agent that
// ran a piped call got the refusal in round 8 and took the last remedy's premise, so the first
// step must name every way a call stops being bare, and no line may hide it in a long run of text.
func assertRefusalOrder(t *testing.T, text string) {
	t.Helper()
	bare := strings.Index(text, "Run the same call again, bare")
	param := strings.Index(text, "dangerouslyDisableSandbox")
	exclusions := strings.Index(text, "add `cairn *` and `npx create-cairn-site *`")
	if bare < 0 || param < 0 || exclusions < 0 || bare >= param || param >= exclusions {
		t.Fatalf("refusal %q must give the bare retry, then the parameter, then the exclusions", text)
	}
	for _, way := range []string{"`cd`", "pipe", "redirect", "`;`", "`&&`", "option before", "create-cairn-site", "version or tag"} {
		if !strings.Contains(text[bare:param], way) {
			t.Errorf("the bare-retry step lacks %q", way)
		}
	}
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		if len(line) > 100 {
			t.Errorf("refusal line is %d characters, want at most 100: %q", len(line), line)
		}
	}
	// An agent that shortens the output with tail keeps only the last lines, which must send it back
	// to step 1, and step 2 must apply to a bare call that still stops, not only to a first call.
	if last := lines[len(lines)-1]; !strings.Contains(last, "step 1") || !strings.Contains(last, "no pipe") {
		t.Errorf("the last line %q must send a piped call back to step 1", last)
	}
	if !strings.Contains(text, "if a bare call prints this message") {
		t.Error("step 2 must apply when a bare call prints the refusal")
	}
	if !strings.Contains(text, "likely switched the parameter off") {
		t.Error("step 3 must hedge: the refusal cannot know the owner switched the parameter off")
	}
}
