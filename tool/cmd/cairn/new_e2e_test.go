package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"slices"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/agentview"
	"github.com/glw907/cairn-cms/tool/v2/internal/testharness"
)

// The end-to-end cases build the real binary with the harness and run it against fakes for
// Cloudflare, GitHub, and npm, served from the recorded corpus. They skip on every system but
// Linux, where the harness runs.

func TestMain(m *testing.M) {
	testharness.Main(m)
}

// e2eRun is one child run of the cairn binary against the fakes.
type e2eRun struct {
	c     *testharness.Case
	w     *e2eWorld
	bin   string
	plan  string
	flags []string
}

func newE2ERun(t *testing.T) *e2eRun {
	t.Helper()
	w, hosts := newE2EWorld(t)
	c := testharness.NewCase(t, testharness.Config{Hosts: hosts})
	w.remotes = c.Remotes
	return &e2eRun{c: c, w: w, bin: testharness.Cairn(t), plan: filepath.Join(c.Dir, "plan.json"), flags: []string{
		"--name", "Example Site", "--email", "owner@example.com", "--posture", "decline", "--zone", e2eZone,
	}}
}

func (r *e2eRun) planRun() testharness.Result {
	args := append([]string{"new", "--plan", r.plan, "--tag", "latest"}, r.flags...)
	return r.c.Run(r.bin, args...)
}

// stream parses stdout as one JSON object per line.
func stream(t *testing.T, stdout string) []map[string]any {
	t.Helper()
	var out []map[string]any
	for line := range strings.SplitSeq(strings.TrimSuffix(stdout, "\n"), "\n") {
		var e map[string]any
		if err := json.Unmarshal([]byte(line), &e); err != nil {
			t.Fatalf("stdout line is not JSON: %q: %v", line, err)
		}
		out = append(out, e)
	}
	return out
}

func kinds(events []map[string]any) []string {
	out := make([]string, len(events))
	for i, e := range events {
		out[i] = fmt.Sprint(e["kind"])
	}
	return out
}

// validateAgainstSchema checks each event against the published schema with the structural
// subset this contract needs: required keys, types, constants, enums, no undeclared key, and the
// allOf branches whose condition holds.
func validateAgainstSchema(t *testing.T, events []map[string]any) {
	t.Helper()
	root, err := providers.RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(root, "schema", "cairn-setup-event.schema.json"))
	if err != nil {
		t.Fatal(err)
	}
	var schema map[string]any
	if err := json.Unmarshal(data, &schema); err != nil {
		t.Fatal(err)
	}
	for i, e := range events {
		for _, problem := range schemaProblems(e, schema, "$") {
			t.Errorf("event %d (%v): %s", i, e["kind"], problem)
		}
	}
}

func schemaProblems(value any, schema map[string]any, path string) []string {
	var out []string
	if want, ok := schema["type"].(string); ok {
		got := ""
		switch v := value.(type) {
		case map[string]any:
			got = "object"
		case []any:
			got = "array"
		case string:
			got = "string"
		case bool:
			got = "boolean"
		case float64:
			got = "number"
			if v == float64(int64(v)) {
				got = "integer"
			}
		}
		if got != want && (want != "number" || got != "integer") {
			return []string{fmt.Sprintf("%s is a %s, want a %s", path, got, want)}
		}
	}
	if c, ok := schema["const"]; ok && fmt.Sprint(c) != fmt.Sprint(value) {
		out = append(out, fmt.Sprintf("%s is %v, want %v", path, value, c))
	}
	if enum, ok := schema["enum"].([]any); ok && !slices.ContainsFunc(enum, func(a any) bool { return fmt.Sprint(a) == fmt.Sprint(value) }) {
		out = append(out, fmt.Sprintf("%s is %v, outside %v", path, value, enum))
	}
	switch v := value.(type) {
	case map[string]any:
		out = append(out, objectProblems(v, schema, path)...)
	case []any:
		if items, ok := schema["items"].(map[string]any); ok {
			for i, it := range v {
				out = append(out, schemaProblems(it, items, fmt.Sprintf("%s[%d]", path, i))...)
			}
		}
	}
	return out
}

func requiredProblems(v map[string]any, schema map[string]any, path string) []string {
	var out []string
	req, _ := schema["required"].([]any)
	for _, k := range req {
		if _, ok := v[asStr(k)]; !ok {
			out = append(out, fmt.Sprintf("%s lacks the required key %q", path, k))
		}
	}
	return out
}

func objectProblems(v map[string]any, schema map[string]any, path string) []string {
	out := requiredProblems(v, schema, path)
	props, _ := schema["properties"].(map[string]any)
	for k, child := range v {
		if sub, ok := props[k].(map[string]any); ok {
			out = append(out, schemaProblems(child, sub, path+"."+k)...)
		} else if extra, ok := schema["additionalProperties"].(bool); ok && !extra {
			out = append(out, fmt.Sprintf("%s.%s is not declared", path, k))
		}
	}
	all, _ := schema["allOf"].([]any)
	for _, a := range all {
		branch := asMap(a)
		cond, _ := branch["if"].(map[string]any)
		if len(requiredProblems(v, cond, path)) > 0 {
			continue
		}
		matches := true
		cprops, _ := cond["properties"].(map[string]any)
		for k, sub := range cprops {
			if child, ok := v[k]; ok && len(schemaProblems(child, asMap(sub), path+"."+k)) > 0 {
				matches = false
			}
		}
		if matches {
			then, _ := branch["then"].(map[string]any)
			out = append(out, requiredProblems(v, then, path)...)
		}
	}
	return out
}

var timestampPattern = regexp.MustCompile(`"timestamp":"[^"]*"`)

// normalized is the stream with each timestamp replaced, the one field that differs run to run.
func normalized(stdout string) string {
	return timestampPattern.ReplaceAllString(stdout, `"timestamp":"<timestamp>"`)
}

func nonGETCloudflare(res testharness.Result) []string {
	var out []string
	for _, r := range res.Requests {
		if strings.HasSuffix(r.Host, "cloudflare.com") && r.Host != "dash.cloudflare.com" && r.Method != "GET" {
			out = append(out, r.Method+" "+r.Host+r.Path)
		}
	}
	return out
}

func TestNewE2EPlanStopsAtTheSummary(t *testing.T) {
	r := newE2ERun(t)
	res := r.planRun()
	if res.ExitCode != 0 {
		t.Fatalf("exit code = %d, want 0\nstdout:\n%s\nstderr:\n%s", res.ExitCode, res.Stdout, res.Stderr)
	}
	events := stream(t, res.Stdout)
	validateAgainstSchema(t, events)

	// The waiting events come in approval order, each with the copy deck's sentence.
	var waits []string
	for _, e := range events {
		if e["kind"] != "waiting" {
			continue
		}
		state := setup.WaitState(fmt.Sprint(e["waiting"]))
		waits = append(waits, string(state))
		if want := setup.WaitSentence(state, "Example Site", "example-site"); e["sentence"] != want {
			t.Errorf("waiting %s sentence = %q, want %q", state, e["sentence"], want)
		}
	}
	wantWaits := []string{"approve-cloudflare", "approve-create-app", "approve-install-all", "approve-install-repo"}
	if !slices.Equal(waits, wantWaits) {
		t.Errorf("waiting states = %v, want %v", waits, wantWaits)
	}

	// A plan ends at the summary: the stream's last line is the summary, and no watch step began.
	last := events[len(events)-1]
	if last["kind"] != "summary" {
		t.Errorf("last event = %v, want the summary", last["kind"])
	}
	for _, e := range events {
		if e["kind"] == "step_failed" || e["step"] == "scaffold" {
			t.Errorf("a plan reached %v %v", e["kind"], e["step"])
		}
	}
	s := asMap(last["summary"])
	if s["repository"] != "example-site" || s["zone"] != e2eZone || s["ownerEmail"] != "owner@example.com" {
		t.Errorf("summary = %v", s)
	}

	if bad := nonGETCloudflare(res); len(bad) != 0 {
		t.Errorf("a plan sent non-GET requests to the Cloudflare API: %v", bad)
	}
	if len(res.Refused) != 0 {
		t.Errorf("the proxy refused %v", res.Refused)
	}
	if len(r.w.badAuth) != 0 {
		t.Errorf("Cloudflare calls without the planted access token: %v", r.w.badAuth)
	}
	if _, err := os.Stat(filepath.Join(r.c.Dir, "example-site")); err == nil {
		t.Error("a plan wrote the site folder")
	}

	if runtime.GOOS != "windows" {
		if info, err := os.Stat(r.plan); err != nil || info.Mode().Perm() != 0o600 {
			t.Errorf("plan file mode = %v, %v; want 0600", info.Mode(), err)
		}
	}
	p, err := agentview.ReadPlan(r.plan)
	if err != nil {
		t.Fatal(err)
	}
	if p.RunID == "" || p.Repository != "example-site" || p.OwnerEmail != "owner@example.com" || p.Zone != e2eZone || len(p.Zones) < 2 || p.Address != e2eZone {
		t.Errorf("plan = %+v; want the run id, the names, the email, and the account's domains", p)
	}

	planData, _ := os.ReadFile(r.plan)
	leaks := r.w.leaks(map[string]string{"stdout": res.Stdout, "stderr": res.Stderr, "plan.json": string(planData)}, r.c.Home, filepath.Join(r.c.Dir))
	if len(leaks) != 0 {
		t.Errorf("a credential reached an output: %v", leaks)
	}
	// The same grep finds the planted values where they belong, so a clean result elsewhere
	// means they were absent and not that the grep cannot see them.
	if len(r.w.leaks(nil, r.c.KeyringDir)) == 0 {
		t.Error("the keyring holds none of the planted values, so the leak check proved nothing")
	}

	newGolden(t, "events.plan.ndjson", normalizedForGolden(res.Stdout, p.RunID))
}

// normalizedForGolden also replaces the run id, drawn at random.
func normalizedForGolden(stdout, runID string) string {
	return strings.ReplaceAll(normalized(stdout), runID, "<run-id>")
}

func TestNewE2EPlanNamesAnOpenChoiceLeftOpen(t *testing.T) {
	r := newE2ERun(t)
	r.flags = []string{"--name", "Example Site", "--email", "owner@example.com", "--posture", "decline"}
	res := r.planRun()
	if res.ExitCode != 3 {
		t.Fatalf("exit code = %d, want 3\n%s", res.ExitCode, res.Stderr)
	}
	if !strings.Contains(res.Stderr, "--zone") || !strings.Contains(res.Stderr, e2eZone) {
		t.Errorf("stderr = %q, want it to name --zone and list the domains", res.Stderr)
	}
	if bad := nonGETCloudflare(res); len(bad) != 0 {
		t.Errorf("non-GET Cloudflare requests: %v", bad)
	}
}

// watchSteps are the eight steps after the summary's Enter, in watch order.
var watchSteps = []string{"scaffold", "provision", "commit", "deploy-key", "push", "first-deploy", "domains", "sign-in"}

// stepsOf returns the step of every event of kind, in stream order.
func stepsOf(events []map[string]any, kind string) []string {
	var out []string
	for _, e := range events {
		if e["kind"] == kind {
			out = append(out, fmt.Sprint(e["step"]))
		}
	}
	return out
}

// editPlan rewrites the plan file the way an agent would after the owner's review.
func (r *e2eRun) editPlan(t *testing.T, edit func(p *agentview.Plan)) {
	t.Helper()
	p, err := agentview.ReadPlan(r.plan)
	if err != nil {
		t.Fatal(err)
	}
	edit(&p)
	if err := agentview.WritePlan(r.plan, p); err != nil {
		t.Fatal(err)
	}
}

func (r *e2eRun) status() string {
	return r.c.Run(r.bin, "new", "status").Stdout
}

func TestNewE2EApplyCreatesTheSiteFromTheEditedPlan(t *testing.T) {
	r := newE2ERun(t)
	if res := r.planRun(); res.ExitCode != 0 {
		t.Fatalf("plan: exit %d\n%s\n%s", res.ExitCode, res.Stdout, res.Stderr)
	}
	// Another process, the plan's, left the record at a step short of live.
	if status := r.status(); !strings.Contains(status, "unfinished  step installed") || !strings.Contains(status, "keyring entries: setup/") {
		t.Errorf("status after a plan = %q, want the record unfinished at installed, with its keyring entries", status)
	}
	r.editPlan(t, func(p *agentview.Plan) { p.OwnerEmail, p.Address = "new@example.com", "blog."+e2eZone })
	r.c.BareRepo(e2eOwner, "example-site")

	res := r.c.Run(r.bin, "new", "--apply", r.plan)
	if res.ExitCode != 0 {
		t.Fatalf("apply: exit %d\nstdout:\n%s\nstderr:\n%s", res.ExitCode, res.Stdout, res.Stderr)
	}
	events := stream(t, res.Stdout)
	validateAgainstSchema(t, events)
	if events[0]["kind"] != "resumed" {
		t.Errorf("first event = %v, want resumed", events[0]["kind"])
	}
	last := events[len(events)-1]
	if last["kind"] != "summary" {
		t.Fatalf("last event = %v, want the final summary", last["kind"])
	}
	s := asMap(last["summary"])
	if s["ownerEmail"] != "new@example.com" || fmt.Sprint(s["addresses"]) != "[blog."+e2eZone+"]" {
		t.Errorf("summary = %v, want the plan's edited email and address", s)
	}
	for _, kind := range []string{"step_started", "step_done"} {
		var after []string
		for _, step := range stepsOf(events, kind) {
			if slices.Contains(watchSteps, step) {
				after = append(after, step)
			}
		}
		if !slices.Equal(after, watchSteps) {
			t.Errorf("%s steps = %v, want the eight in watch order %v", kind, after, watchSteps)
		}
	}
	if waits := stepsOf(events, "waiting"); len(waits) != 0 {
		t.Errorf("an apply waited on the owner at %v", waits)
	}

	// The edited address was rechecked the way the opening checked the default.
	var rechecked bool
	for _, req := range res.Requests {
		if req.Host == "api.cloudflare.com" && strings.Contains(req.Path, "dns_records?name=blog."+e2eZone) {
			rechecked = true
		}
	}
	if !rechecked {
		t.Error("the plan's edited address was never checked for DNS records")
	}
	if got := r.w.emailTo; got != "new@example.com" {
		t.Errorf("the sign-in email went to %q, want the plan's address", got)
	}
	if len(r.w.d1Create) != 1 || r.w.d1Create[0] != "example-site-auth" {
		t.Errorf("databases created = %v", r.w.d1Create)
	}
	if bad := r.w.badAuth; len(bad) != 0 {
		t.Errorf("Cloudflare calls without the access token: %v", bad)
	}
	if len(res.Refused) != 0 {
		t.Errorf("the proxy refused %v", res.Refused)
	}
	if got := r.c.KeyringEntries(); len(got) != 0 {
		t.Errorf("the keyring still holds %d entries after the run", len(got))
	}
	if status := r.status(); !strings.Contains(status, "finished  step live") {
		t.Errorf("status after the run = %q, want the record finished", status)
	}

	// No credential, one-time code, or sign-in token reached any output or any file setup wrote
	// outside the keyring.
	planData, _ := os.ReadFile(r.plan)
	leaks := r.w.leaks(map[string]string{"stdout": res.Stdout, "stderr": res.Stderr, "plan.json": string(planData)},
		r.c.Home, filepath.Join(r.c.Dir, "example-site", ".git"))
	if len(leaks) != 0 {
		t.Errorf("a credential reached an output: %v", leaks)
	}
	if !slices.ContainsFunc(r.w.secrets, func(s string) bool { return len(s) == 43 }) {
		t.Error("the sign-in token was never learned, so the leak check did not cover it")
	}
	newGolden(t, "events.apply.ndjson", normalized(res.Stdout))
}

func TestNewE2EApplyRefusesAnAddressThatAnotherSiteHolds(t *testing.T) {
	r := newE2ERun(t)
	if res := r.planRun(); res.ExitCode != 0 {
		t.Fatalf("plan: exit %d\n%s", res.ExitCode, res.Stderr)
	}
	r.editPlan(t, func(p *agentview.Plan) { p.Address = "taken." + e2eZone })
	res := r.c.Run(r.bin, "new", "--apply", r.plan)
	if res.ExitCode != 3 || !strings.Contains(res.Stderr, "address") {
		t.Errorf("exit %d, stderr %q; want 3 naming the address", res.ExitCode, res.Stderr)
	}
	if bad := nonGETCloudflare(res); len(bad) != 0 {
		t.Errorf("the refused apply sent %v", bad)
	}
	if status := r.status(); !strings.Contains(status, "unfinished") {
		t.Errorf("status = %q, want the setup still unfinished", status)
	}
}

func TestNewE2EAStoppedApplyIsUnfinishedAndResumes(t *testing.T) {
	r := newE2ERun(t)
	if res := r.planRun(); res.ExitCode != 0 {
		t.Fatalf("plan: exit %d\n%s", res.ExitCode, res.Stderr)
	}
	// No repository exists to push to, so the apply stops at the push.
	res := r.c.Run(r.bin, "new", "--apply", r.plan)
	if res.ExitCode != 1 {
		t.Fatalf("exit %d, want 1\nstderr:\n%s", res.ExitCode, res.Stderr)
	}
	events := stream(t, res.Stdout)
	validateAgainstSchema(t, events)
	last := events[len(events)-1]
	if last["kind"] != "step_failed" || last["step"] != "push" || asMap(last["failure"])["reason"] != "push" {
		t.Errorf("last event = %v, want step_failed at the push, an unfinished stream", last)
	}
	if !strings.Contains(res.Stderr, "Setup couldn't push the site to GitHub.") {
		t.Errorf("stderr = %q, want the four-part stop", res.Stderr)
	}
	status := r.status()
	if !strings.Contains(status, "unfinished  step deploy-key-stored") || !strings.Contains(status, "GitHub App: cairn-example-site") ||
		!strings.Contains(status, "repository: "+e2eOwner+"/example-site") {
		t.Errorf("status = %q, want the stop's step and what it holds", status)
	}

	id, _, _ := strings.Cut(strings.TrimSpace(status), " ")
	r.c.BareRepo(e2eOwner, "example-site")
	res = r.c.Run(r.bin, "new", "--resume", id)
	if res.ExitCode != 0 {
		t.Fatalf("resume: exit %d\nstdout:\n%s\nstderr:\n%s", res.ExitCode, res.Stdout, res.Stderr)
	}
	events = stream(t, res.Stdout)
	validateAgainstSchema(t, events)
	if events[0]["kind"] != "resumed" || events[len(events)-1]["kind"] != "summary" {
		t.Errorf("resumed stream runs %v, want resumed first and a summary last", kinds(events))
	}
	if len(r.w.d1Create) != 1 {
		t.Errorf("databases created = %v, want one across the stop and the resume", r.w.d1Create)
	}
	if status := r.status(); !strings.Contains(status, "finished  step live") {
		t.Errorf("status after the resume = %q", status)
	}
}
