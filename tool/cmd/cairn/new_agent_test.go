package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/agentview"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
)

// newGolden compares got with testdata/new/<name>, or rewrites it under -update, the flag `make
// flags` also sets.
func newGolden(t *testing.T, name, got string) {
	t.Helper()
	path := filepath.Join("..", "..", "testdata", "new", name)
	if *updateFlags {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(got), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("%v; run `go test ./cmd/cairn -run TestNew -update`", err)
	}
	if string(want) != got {
		t.Errorf("%s is stale; run `go test ./cmd/cairn -run TestNew -update` and read the diff\ngot:\n%s\nwant:\n%s", name, got, want)
	}
}

func TestNewDryRunJSONIsGolden(t *testing.T) {
	stdout, stderr, code := runNewTree(t, "new", "--dry-run", "--json", "--name", "Example Site", "--email", "owner@example.com", "--posture", "decline")
	if code != 0 || stderr != "" {
		t.Fatalf("code = %d, stderr = %q", code, stderr)
	}
	newGolden(t, "dry-run.json", stdout)
	if !json.Valid([]byte(stdout)) || strings.Count(stdout, "\n") != 1 {
		t.Errorf("dry-run payload is not one JSON line: %q", stdout)
	}
}

func TestNewDryRunWithoutJSONNamesWhatItWouldCreate(t *testing.T) {
	stdout, _, code := runNewTree(t, "new", "--dry-run", "--name", "Example Site", "--email", "owner@example.com", "--posture", "invite")
	if code != 0 {
		t.Fatalf("code = %d", code)
	}
	for _, want := range []string{"example-site", "example-site-auth", "example-site-media", "cairn-example-site"} {
		if !strings.Contains(stdout, want) {
			t.Errorf("dry run does not name %s:\n%s", want, stdout)
		}
	}
}

func TestNewExitCodesAreGolden(t *testing.T) {
	newGolden(t, "exit-codes.txt", newExitCodes+"\n")
}

func TestNewExitCodeForAStop(t *testing.T) {
	for reason, want := range map[setup.Reason]int{
		setup.ReasonProvider: 1, setup.ReasonTemplate: 1, setup.ReasonDeclined: 1, setup.ReasonDeployFailed: 1,
		setup.ReasonStopped: 2, setup.ReasonChainTimeout: 2,
	} {
		if got := newExitFor(&setup.Failure{Reason: reason}); got != want {
			t.Errorf("exit code for %s = %d, want %d", reason, got, want)
		}
	}
}

// newRecord saves a setup record into d's registry and returns its id.
func newRecord(t *testing.T, d deps, mutate func(r *record.Record)) string {
	t.Helper()
	dir, err := d.registryDir()
	if err != nil {
		t.Fatal(err)
	}
	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	r := record.Record{
		Name: "Example Site", Step: string(spine.StepInstalled), Domain: "example.com", SchemaVersion: 1,
		Cloudflare: record.Cloudflare{AccountID: "acc1", ZoneID: "z1"},
		Setup: record.Setup{
			RunID: "run1", SchemaVersion: record.SetupSchemaVersion, AIPosture: "decline", ThemeID: "waymark",
			OwnerEmail: "owner@example.com", Address: "example.com", AppSlug: "cairn-example-site",
			IDs:            record.SetupIDs{AppID: 77},
			KeyringEntries: []string{"setup/run1/cloudflare-refresh"}, KeysKept: true,
		},
	}
	if mutate != nil {
		mutate(&r)
	}
	id, err := st.SaveNew("example-site", r)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func runNewWith(t *testing.T, d deps, args ...string) (stdout, stderr string, code int) {
	t.Helper()
	var out, errOut strings.Builder
	code = runTree(context.Background(), d, &out, &errOut, args)
	return out.String(), errOut.String(), code
}

func TestNewStatusReportsWhatAnUnfinishedRunHolds(t *testing.T) {
	d := mustDeps(t)
	unfinished := newRecord(t, d, func(r *record.Record) {
		r.GitHub.Repo = record.GitHubRepo{ID: 5, Owner: "octo", Repo: "example-site"}
	})
	finished := newRecord(t, d, func(r *record.Record) {
		r.Step = string(spine.StepLive)
		r.Setup.RunID = "done-run"
		r.Setup.KeyringEntries, r.Setup.KeysKept = nil, false
	})
	wizard := newRecord(t, d, func(r *record.Record) { r.Setup = record.Setup{} })

	stdout, stderr, code := runNewWith(t, d, "new", "status")
	if code != 0 || stderr != "" {
		t.Fatalf("code = %d, stderr = %q", code, stderr)
	}
	rows := map[string]string{}
	for line := range strings.SplitSeq(stdout, "\n") {
		if id, _, ok := strings.Cut(line, " "); ok {
			rows[id] = line
		}
	}
	if row := rows[unfinished]; !strings.Contains(row, "unfinished") || !strings.Contains(row, string(spine.StepInstalled)) {
		t.Errorf("row for the record left at installed = %q, want it unfinished at its step", row)
	}
	for _, want := range []string{"setup/run1/cloudflare-refresh", "cairn-example-site", "octo/example-site"} {
		if !strings.Contains(stdout, want) {
			t.Errorf("status does not name what the run holds, %s:\n%s", want, stdout)
		}
	}
	if row := rows[finished]; !strings.Contains(row, "finished") || strings.Contains(row, "unfinished") {
		t.Errorf("row for the live record = %q, want finished", row)
	}
	if _, ok := rows[wizard]; ok {
		t.Error("status listed a record with no setup object")
	}
	if strings.Contains(stdout, "setup/run1/cloudflare-refresh") && strings.Count(stdout, "setup/run1/cloudflare-refresh") != 1 {
		t.Errorf("a finished record's entries were listed:\n%s", stdout)
	}
}

func TestNewStatusWithNoRecords(t *testing.T) {
	stdout, _, code := runNewTree(t, "new", "status")
	if code != 0 || !strings.Contains(stdout, newStatusNone) {
		t.Errorf("code = %d, stdout = %q, want the empty line", code, stdout)
	}
}

func TestNewPlanRefusesToStartOverAnUnfinishedSetup(t *testing.T) {
	good := []string{"new", "--plan", "p.json", "--name", "Other Site", "--email", "o@example.com", "--posture", "decline"}
	t.Run("one", func(t *testing.T) {
		d := mustDeps(t)
		id := newRecord(t, d, nil)
		stdout, stderr, code := runNewWith(t, d, good...)
		if code != 3 || stdout != "" || !strings.Contains(stderr, "--resume "+id) || !strings.Contains(stderr, "--new") {
			t.Errorf("code = %d, stdout = %q, stderr = %q; want 3 naming --resume %s and --new", code, stdout, stderr, id)
		}
	})
	t.Run("several", func(t *testing.T) {
		d := mustDeps(t)
		a := newRecord(t, d, nil)
		b := newRecord(t, d, func(r *record.Record) { r.Setup.RunID = "second" })
		_, stderr, code := runNewWith(t, d, good...)
		if code != 3 || !strings.Contains(stderr, a) || !strings.Contains(stderr, b) || !strings.Contains(stderr, "--resume <id>") {
			t.Errorf("code = %d, stderr = %q; want 3 listing both ids and naming --resume", code, stderr)
		}
	})
	t.Run("resume names an id that is not there", func(t *testing.T) {
		d := mustDeps(t)
		_, stderr, code := runNewWith(t, d, "new", "--resume", "nope-abc123")
		if code != 3 || !strings.Contains(stderr, "nope-abc123") {
			t.Errorf("code = %d, stderr = %q", code, stderr)
		}
	})
}

func writeTestPlan(t *testing.T, rec record.Record, edit func(p *agentview.Plan)) string {
	t.Helper()
	p, err := agentview.PlanOf(rec, []providers.Account{{ID: "acc1", Name: "One"}, {ID: "acc2", Name: "Two"}},
		[]providers.Zone{{ID: "z1", Name: "example.com"}, {ID: "z2", Name: "example.org"}})
	if err != nil {
		t.Fatal(err)
	}
	if edit != nil {
		edit(&p)
	}
	path := filepath.Join(t.TempDir(), "plan.json")
	if err := agentview.WritePlan(path, p); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestNewApplyRefusesWithUsageErrorsThatNameTheField(t *testing.T) {
	tests := []struct {
		name string
		edit func(p *agentview.Plan)
		want string
	}{
		{"an edited closed field", func(p *agentview.Plan) { p.Repository = "something-else" }, "repository"},
		{"an edited run id", func(p *agentview.Plan) { p.RunID = "nope" }, "runId"},
		{"an invalid email", func(p *agentview.Plan) { p.OwnerEmail = "not-an-email" }, "ownerEmail"},
		{"an open account left open", func(p *agentview.Plan) { p.Account = "" }, "account"},
		{"an open zone left open", func(p *agentview.Plan) { p.Zone = "" }, "zone"},
		{"an address outside the zone", func(p *agentview.Plan) { p.Address = "example.net" }, "address"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := mustDeps(t)
			var rec record.Record
			newRecord(t, d, func(r *record.Record) { rec = *r })
			path := writeTestPlan(t, rec, tt.edit)
			stdout, stderr, code := runNewWith(t, d, "new", "--apply", path)
			if code != 3 || stdout != "" {
				t.Errorf("code = %d, stdout = %q; want 3 and no stream", code, stdout)
			}
			if !strings.Contains(stderr, tt.want) {
				t.Errorf("stderr = %q, want it to name %s", stderr, tt.want)
			}
		})
	}
	t.Run("a missing file", func(t *testing.T) {
		_, stderr, code := runNewTree(t, "new", "--apply", filepath.Join(t.TempDir(), "absent.json"))
		if code != 3 || !strings.Contains(stderr, "absent.json") {
			t.Errorf("code = %d, stderr = %q", code, stderr)
		}
	})
}
