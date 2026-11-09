package main

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/agentview"
	"github.com/glw907/cairn-cms/tool/v2/internal/testharness"
)

// setupTokenVar is the variable a run takes its Cloudflare token from, spelled here as an
// operator types it.
const setupTokenVar = "CAIRN_CF_SETUP_TOKEN" // secret-guard-allow: a variable name, not a value

// newTokenRun is newE2ERun with the setup token in the child's environment. The faked Cloudflare
// API then accepts that token alone, so any call made on another credential is logged as bad.
func newTokenRun(t *testing.T) *e2eRun {
	t.Helper()
	r := newE2ERun(t)
	r.c.Env[setupTokenVar] = e2eCFSetupToken
	r.w.cfBearer = e2eCFSetupToken
	return r
}

// logChildEnv replaces the node and npm stubs with ones that also append their whole environment
// to a log, and returns the log's path. The node stub still answers its version check.
func logChildEnv(t *testing.T, c *testharness.Case) string {
	t.Helper()
	log := filepath.Join(filepath.Dir(c.Dir), "child-env.log")
	for name, body := range map[string]string{
		"node": "export -p >> '" + log + "'\necho v24.11.1\n",
		"npm":  "export -p >> '" + log + "'\n",
	} {
		if err := os.WriteFile(filepath.Join(c.BinDir, name), []byte("#!/bin/sh\n"+body), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	return log
}

// cloudflareAuthCalls returns every request that belongs to the Cloudflare approval or reads
// what only a user token can: the OAuth authorize, exchange, and revoke, the /user read, and
// any deploy-key mint or delete.
func cloudflareAuthCalls(reqs []testharness.Request) []string {
	var out []string
	for _, r := range reqs {
		path, _, _ := strings.Cut(r.Path, "?")
		switch {
		case r.Host == "dash.cloudflare.com":
		case r.Host == "api.cloudflare.com" && path == "/client/v4/user":
		case r.Host == "api.cloudflare.com" && strings.HasPrefix(path, "/client/v4/user/tokens") && r.Method != "GET":
		default:
			continue
		}
		out = append(out, r.Method+" "+r.Host+r.Path)
	}
	return out
}

// credentialOf returns the credential the approve-cloudflare done event names, and the one the
// last summary carries.
func credentialOf(events []map[string]any) (done, summary any) {
	for _, e := range events {
		switch {
		case e["kind"] == "step_done" && e["step"] == "approve-cloudflare":
			done = e["credential"]
		case e["kind"] == "summary":
			summary = asMap(e["summary"])["credential"]
		}
	}
	return done, summary
}

func TestNewE2ETheSetupTokenStandsInForTheCloudflareApproval(t *testing.T) {
	r := newTokenRun(t)
	envLog := logChildEnv(t, r.c)
	plan := r.planRun()
	if plan.ExitCode != 0 {
		t.Fatalf("plan: exit %d\nstdout:\n%s\nstderr:\n%s", plan.ExitCode, plan.Stdout, plan.Stderr)
	}
	events := stream(t, plan.Stdout)
	validateAgainstSchema(t, events)
	if waits := waitStates(events); slices.Contains(waits, "approve-cloudflare") || slices.Contains(waits, "reconsent-cloudflare") {
		t.Errorf("a token run waited on the Cloudflare approval: %v", waits)
	}
	if done, summary := credentialOf(events); done != "token" || summary != "token" {
		t.Errorf("credential on the approve-cloudflare done event = %v, on the summary = %v; want token for both", done, summary)
	}
	for name := range r.c.KeyringEntries() {
		if strings.Contains(name, "cloudflare") {
			t.Errorf("a token run wrote the Cloudflare keyring entry %s", name)
		}
	}

	// The plan file's email is the only email the apply has, and it stands in for --email.
	r.editPlan(t, func(p *agentview.Plan) { p.OwnerEmail = "new@example.com" })
	r.c.BareRepo(e2eOwner, "example-site")
	apply := r.c.Run(r.bin, "new", "--apply", r.plan)
	if apply.ExitCode != 0 {
		t.Fatalf("apply: exit %d\nstdout:\n%s\nstderr:\n%s", apply.ExitCode, apply.Stdout, apply.Stderr)
	}
	events = stream(t, apply.Stdout)
	validateAgainstSchema(t, events)
	if _, summary := credentialOf(events); summary != "token" {
		t.Errorf("the final summary's credential = %v, want token", summary)
	}
	if got := r.w.emailTo; got != "new@example.com" {
		t.Errorf("the sign-in email went to %q, want the plan's address", got)
	}

	if calls := cloudflareAuthCalls(apply.Requests); len(calls) != 0 {
		t.Errorf("a token run made approval or user-token calls: %v", calls)
	}
	if bad := r.w.badAuth; len(bad) != 0 {
		t.Errorf("Cloudflare calls on a credential other than the setup token: %v", bad)
	}
	if got, ok := r.w.opened(providers.DeploySecretName); !ok || got != e2eCFSetupToken {
		t.Errorf("the deploy-key secret opens to %q (stored %v), want the setup token", got, ok)
	}
	if got := r.c.KeyringEntries(); len(got) != 0 {
		t.Errorf("the keyring still holds %d entries after the run", len(got))
	}

	logged, err := os.ReadFile(envLog)
	if err != nil || !strings.Contains(string(logged), "PATH") {
		t.Fatalf("the stubs logged no environment (%v), so the child check proved nothing", err)
	}
	planData, _ := os.ReadFile(r.plan)
	leaks := r.w.leaks(map[string]string{
		"plan stdout": plan.Stdout, "plan stderr": plan.Stderr, "apply stdout": apply.Stdout, "apply stderr": apply.Stderr,
		"plan.json": string(planData), "child environment": string(logged),
	}, r.c.Home, filepath.Join(r.c.Dir, "example-site", ".git"))
	if len(leaks) != 0 {
		t.Errorf("a credential reached an output: %v", leaks)
	}
}

func TestNewE2EATokenPlanWithoutAnEmailIsRefusedBeforeAnyCall(t *testing.T) {
	r := newTokenRun(t)
	r.flags = []string{"--name", "Example Site", "--posture", "decline", "--zone", e2eZone}
	res := r.planRun()
	if res.ExitCode != 3 || res.Stdout != "" || !strings.Contains(res.Stderr, "--email") {
		t.Errorf("exit %d, stdout %q, stderr %q; want 3, empty, naming --email", res.ExitCode, res.Stdout, res.Stderr)
	}
	if len(res.Requests) != 0 {
		t.Errorf("the refused plan made requests: %v", res.Requests)
	}
}

func TestNewE2ECloudflareAPITokenAloneRunsTheApproval(t *testing.T) {
	r := newE2ERun(t)
	r.c.Env["CLOUDFLARE_API_TOKEN"] = e2eCFSetupToken
	res := r.planRun()
	if res.ExitCode != 0 {
		t.Fatalf("plan: exit %d\nstdout:\n%s\nstderr:\n%s", res.ExitCode, res.Stdout, res.Stderr)
	}
	events := stream(t, res.Stdout)
	validateAgainstSchema(t, events)
	if waits := waitStates(events); !slices.Contains(waits, "approve-cloudflare") {
		t.Errorf("waiting states = %v, want the Cloudflare approval", waits)
	}
	if done, summary := credentialOf(events); done != "approval" || summary != "approval" {
		t.Errorf("credential on the approve-cloudflare done event = %v, on the summary = %v; want approval for both", done, summary)
	}
	if calls := cloudflareAuthCalls(res.Requests); !slices.ContainsFunc(calls, func(c string) bool { return strings.Contains(c, "/oauth2/token") }) {
		t.Errorf("approval calls = %v, want the OAuth exchange", calls)
	}
}

func TestNewE2EATokenResumeNeedsTheVariableAgain(t *testing.T) {
	r := newTokenRun(t)
	if res := r.planRun(); res.ExitCode != 0 {
		t.Fatalf("plan: exit %d\n%s", res.ExitCode, res.Stderr)
	}
	delete(r.c.Env, setupTokenVar)
	before := len(r.c.Proxy.Requests())
	res := r.c.Run(r.bin, "new", "--apply", r.plan)
	if res.ExitCode != 1 || !strings.Contains(res.Stderr, setupTokenVar) {
		t.Fatalf("apply without the token: exit %d, stderr %q; want 1 naming %s", res.ExitCode, res.Stderr, setupTokenVar)
	}
	events := stream(t, res.Stdout)
	validateAgainstSchema(t, events)
	if last := events[len(events)-1]; last["kind"] != "step_failed" {
		t.Errorf("last event = %v, want step_failed", last)
	}
	for _, req := range res.Requests[before:] {
		if strings.HasSuffix(req.Host, "cloudflare.com") {
			t.Errorf("the stopped resume called Cloudflare: %s %s%s", req.Method, req.Host, req.Path)
		}
	}
	if status := r.status(); !strings.Contains(status, "unfinished") {
		t.Errorf("status = %q, want the setup still unfinished", status)
	}

	r.c.Env[setupTokenVar] = e2eCFSetupToken
	r.c.BareRepo(e2eOwner, "example-site")
	if res := r.c.Run(r.bin, "new", "--apply", r.plan); res.ExitCode != 0 {
		t.Fatalf("apply with the token again: exit %d\nstdout:\n%s\nstderr:\n%s", res.ExitCode, res.Stdout, res.Stderr)
	}
}
