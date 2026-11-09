package main

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// runNewTree runs the tree over args and returns both streams and the exit code.
func runNewTree(t *testing.T, args ...string) (stdout, stderr string, code int) {
	t.Helper()
	var out, errOut bytes.Buffer
	code = runTree(context.Background(), mustDeps(t), &out, &errOut, args)
	return out.String(), errOut.String(), code
}

// TestNewNamesTheMissingFlag runs the agent lane's two answer-taking modes with each required
// field left out. A usage error exits 3, names the flag, and leaves stdout empty.
func TestNewNamesTheMissingFlag(t *testing.T) {
	full := map[string]string{"--name": "Example Site", "--email": "owner@example.com", "--posture": "decline"}
	modes := map[string][]string{
		"plan":    {"--plan", "plan.json"},
		"dry-run": {"--dry-run", "--json"},
	}
	for mode, modeArgs := range modes {
		for missing := range full {
			t.Run(mode+" without "+missing, func(t *testing.T) {
				args := append([]string{"new"}, modeArgs...)
				for flag, value := range full {
					if flag != missing {
						args = append(args, flag, value)
					}
				}
				stdout, stderr, code := runNewTree(t, args...)
				if code != int(spine.VerdictUnknown) {
					t.Errorf("exit code = %d, want %d", code, int(spine.VerdictUnknown))
				}
				if stdout != "" {
					t.Errorf("stdout = %q, want empty", stdout)
				}
				if !strings.Contains(stderr, missing) {
					t.Errorf("stderr = %q, want it to name %s", stderr, missing)
				}
			})
		}
	}
}

func TestNewRefusesBadValuesAndConflicts(t *testing.T) {
	good := []string{"--name", "Example Site", "--email", "owner@example.com", "--posture", "decline"}
	tests := []struct {
		name string
		args []string
		want []string
	}{
		{"posture outside the two", []string{"--plan", "p.json", "--name", "X", "--email", "a@b.co", "--posture", "maybe"}, []string{"--posture", "decline"}},
		{"new with resume", []string{"--new", "--resume", "site-a1b2c3"}, []string{"--new", "--resume"}},
		{"plan with apply", append([]string{"--plan", "p.json", "--apply", "p.json"}, good...), []string{"--plan", "--apply"}},
		{"dry run with plan", append([]string{"--dry-run", "--plan", "p.json"}, good...), []string{"--dry-run", "--plan"}},
		{"json without dry run", append([]string{"--json", "--plan", "p.json"}, good...), []string{"--json", "--dry-run"}},
		{"apply with an answer flag", []string{"--apply", "p.json", "--name", "X"}, []string{"--apply", "--name"}},
		{"apply with a choice flag", []string{"--apply", "p.json", "--zone", "example.com"}, []string{"--apply", "--zone"}},
		{"resume with a site theme", []string{"--resume", "site-a1b2c3", "--site-theme", "waymark"}, []string{"--resume", "--site-theme"}},
		{"resume with a name", []string{"--resume", "site-a1b2c3", "--name", "X"}, []string{"--resume", "--name"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stdout, stderr, code := runNewTree(t, append([]string{"new"}, tt.args...)...)
			if code != int(spine.VerdictUnknown) || stdout != "" {
				t.Errorf("code = %d, stdout = %q; want 3 and empty", code, stdout)
			}
			for _, w := range tt.want {
				if !strings.Contains(stderr, w) {
					t.Errorf("stderr = %q, want it to name %s", stderr, w)
				}
			}
			if lines := strings.Split(strings.TrimRight(stderr, "\n"), "\n"); len(lines) < 2 {
				t.Errorf("stderr = %q, a usage error names where to read usage", stderr)
			}
		})
	}
}

// TestNewResumeTakesTheChoiceFlags shows --resume past the flag check: the run then fails for
// the id it was given, not for the choice flags.
func TestNewResumeTakesTheChoiceFlags(t *testing.T) {
	_, stderr, code := runNewTree(t, "new", "--resume", "site-nope", "--account", "acc1", "--zone", "example.com")
	if code != int(spine.VerdictUnknown) || !strings.Contains(stderr, "site-nope") || strings.Contains(stderr, "--zone") {
		t.Errorf("code = %d, stderr = %q; want the missing record named, no conflict", code, stderr)
	}
}

// TestNewWithNoModePrintsTheAgentGuide covers the run without a terminal and without a plan.
func TestNewWithNoModePrintsTheAgentGuide(t *testing.T) {
	stdout, _, code := runNewTree(t, "new")
	if code != 0 {
		t.Fatalf("exit code = %d, want 0", code)
	}
	for _, want := range []string{"--plan", "--apply", "--resume", "--dry-run"} {
		if !strings.Contains(stdout, want) {
			t.Errorf("guide does not mention %s:\n%s", want, stdout)
		}
	}
}

// TestNewChoosesItsLaneByTheTerminal runs a mode-less cairn new with and without a terminal. With
// one it takes the terminal lane and fetches the template first. The test transport's npm has no
// template, so the run stops with 1 and prints no guide. The lane refuses an answer flag, since
// the questions ask it. Without a terminal the run prints the guide.
func TestNewChoosesItsLaneByTheTerminal(t *testing.T) {
	t.Setenv("SSH_CONNECTION", "")
	t.Setenv("SSH_TTY", "")
	t.Setenv("BROWSER", "true")
	for _, tc := range []struct {
		name     string
		terminal bool
		args     []string
		code     int
		stdout   string
		stderr   []string
	}{
		{"terminal", true, nil, 1, "", []string{"download the site template"}},
		{"terminal with an answer flag", true, []string{"--name", "X"}, int(spine.VerdictUnknown), "", []string{"--plan", "--name"}},
		{"no terminal", false, nil, 0, "--plan", nil},
	} {
		t.Run(tc.name, func(t *testing.T) {
			d := mustDeps(t)
			d.interactive = func() bool { return tc.terminal }
			var out, errOut bytes.Buffer
			code := runTree(context.Background(), d, &out, &errOut, append([]string{"new"}, tc.args...))
			if code != tc.code {
				t.Errorf("exit %d, want %d; stderr %q", code, tc.code, errOut.String())
			}
			if (tc.stdout == "") != (out.Len() == 0) || !strings.Contains(out.String(), tc.stdout) {
				t.Errorf("stdout = %q, want %q", out.String(), tc.stdout)
			}
			for _, w := range tc.stderr {
				if !strings.Contains(errOut.String(), w) {
					t.Errorf("stderr = %q, want it to name %s", errOut.String(), w)
				}
			}
		})
	}
}

// TestNewIsHiddenUntilItShips keeps cairn new out of the root help and the completions.
func TestNewIsHiddenUntilItShips(t *testing.T) {
	root := newRootCmd(mustDeps(t))
	cmd, _, err := root.Find([]string{"new"})
	if err != nil || cmd.Name() != "new" {
		t.Fatalf("Find(new) = %v, %v", cmd, err)
	}
	if !cmd.Hidden {
		t.Error("cairn new is not Hidden; it ships in pass P6")
	}
	stdout, _, _ := runNewTree(t, "--help")
	if strings.Contains(stdout, "cairn new") || strings.Contains(stdout, "  new ") {
		t.Errorf("root help lists new:\n%s", stdout)
	}
}

// TestProductionConfigWiresEveryClient builds the config the agent lane runs and checks each
// seam the runner calls is filled, and that Register reaches the output scrub.
func TestProductionConfigWiresEveryClient(t *testing.T) {
	d := mustDeps(t)
	var registered []providers.Credential
	d.register = func(c providers.Credential) { registered = append(registered, c) }

	in := newInput{answers: setup.Answers{SiteName: "Example Site", OwnerEmail: "a@b.co", Posture: setup.Invite}, tag: "next"}
	cfg, err := productionConfig(d, in, nil, func(setup.Event) {})
	if err != nil {
		t.Fatalf("productionConfig: %v", err)
	}
	if cfg.RunID == "" || cfg.Dir == "" || cfg.Vault == nil || cfg.Store == nil || cfg.CloudflareOAuth == nil ||
		cfg.Cloudflare == nil || cfg.GitHub == nil || cfg.GitHubWeb == nil || cfg.Listen == nil ||
		cfg.FetchTemplate == nil || cfg.WriteSite == nil || cfg.FinalizeSite == nil || cfg.SiteGet == nil ||
		cfg.Git == nil || cfg.NodeVersion == nil || cfg.Emit == nil || cfg.Register == nil {
		t.Errorf("a seam is unfilled: %+v", cfg)
	}
	cfg.Register(providers.NewCredential("a-secret-value"))
	if len(registered) != 1 {
		t.Errorf("Register reached the scrub %d times, want 1", len(registered))
	}
}
