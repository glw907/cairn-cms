package agentview

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

func TestWriterWritesOneJSONLinePerEvent(t *testing.T) {
	var buf bytes.Buffer
	w := NewWriter(&buf)
	at := time.Date(2026, 11, 8, 12, 0, 0, 0, time.UTC)
	w.Emit(setup.Event{SchemaVersion: 1, Kind: setup.StepStarted, Timestamp: at, Step: "scaffold"})
	w.Emit(setup.Event{SchemaVersion: 1, Kind: setup.Waiting, Timestamp: at, Step: "approve-cloudflare", Waiting: setup.WaitCloudflare, Sentence: "Select Allow."})
	lines := strings.Split(strings.TrimSuffix(buf.String(), "\n"), "\n")
	if len(lines) != 2 {
		t.Fatalf("got %d lines, want 2:\n%s", len(lines), buf.String())
	}
	var first map[string]any
	if err := json.Unmarshal([]byte(lines[0]), &first); err != nil {
		t.Fatal(err)
	}
	if first["schemaVersion"] != float64(1) || first["kind"] != "step_started" || first["timestamp"] != "2026-11-08T12:00:00Z" || first["step"] != "scaffold" {
		t.Errorf("first line = %v", first)
	}
	if w.Err() != nil {
		t.Errorf("Err = %v", w.Err())
	}
}

type failingWriter struct{}

func (failingWriter) Write([]byte) (int, error) { return 0, errors.New("closed pipe") }

func TestWriterKeepsTheFirstWriteError(t *testing.T) {
	w := NewWriter(failingWriter{})
	w.Emit(setup.Event{Kind: setup.StepDone})
	w.Emit(setup.Event{Kind: setup.StepDone})
	if w.Err() == nil {
		t.Error("a failed write left no error")
	}
}

func TestChoicesComeFromFlagsOrNameTheMissingFlag(t *testing.T) {
	accounts := []providers.Account{{ID: "acc1", Name: "One"}, {ID: "acc2", Name: "Two"}}
	zones := []providers.Zone{{ID: "z1", Name: "example.com"}, {ID: "z2", Name: "example.org"}}
	themes := []scaffold.Theme{{ID: "waymark"}, {ID: "plain"}}
	ctx := context.Background()

	v := &View{Account: "acc2", Zone: "example.org", Theme: "plain"}
	if got, err := v.ChooseAccount(ctx, accounts); err != nil || got != "acc2" {
		t.Errorf("ChooseAccount = %q, %v", got, err)
	}
	if got, err := v.ChooseZone(ctx, zones); err != nil || got != "z2" {
		t.Errorf("ChooseZone by name = %q, %v", got, err)
	}
	if got, err := (&View{Zone: "z1"}).ChooseZone(ctx, zones); err != nil || got != "z1" {
		t.Errorf("ChooseZone by id = %q, %v", got, err)
	}
	if got, err := v.ChooseTheme(ctx, themes); err != nil || got != "plain" {
		t.Errorf("ChooseTheme = %q, %v", got, err)
	}
	if len(v.Accounts) != 2 || len(v.Zones) != 2 {
		t.Errorf("the view kept %d accounts and %d zones, want the listed options", len(v.Accounts), len(v.Zones))
	}

	empty := &View{}
	for _, tc := range []struct {
		flag string
		call func() error
		want []string
	}{
		{"--account", func() error { _, err := empty.ChooseAccount(ctx, accounts); return err }, []string{"acc1", "acc2"}},
		{"--zone", func() error { _, err := empty.ChooseZone(ctx, zones); return err }, []string{"example.com", "example.org"}},
		{"--site-theme", func() error { _, err := empty.ChooseTheme(ctx, themes); return err }, []string{"waymark", "plain"}},
	} {
		err := tc.call()
		ue, ok := errors.AsType[*UsageError](err)
		if !ok || !strings.Contains(ue.Error(), tc.flag) {
			t.Fatalf("%s: err = %v, want a usage error naming it", tc.flag, err)
		}
		for _, w := range tc.want {
			if !strings.Contains(ue.Error(), w) {
				t.Errorf("%s: %q does not list option %s", tc.flag, ue.Error(), w)
			}
		}
	}
	if _, err := (&View{Zone: "nope.example"}).ChooseZone(ctx, zones); err == nil {
		t.Error("a zone outside the list was accepted")
	}
}

func TestConfirmSummaryByMode(t *testing.T) {
	ctx := context.Background()
	s := setup.Summary{OwnerEmail: "a@b.co", Addresses: []string{"blog.example.com"}}

	if _, err := (&View{Mode: Plan}).ConfirmSummary(ctx, s, ""); !errors.Is(err, setup.ErrPlanned) {
		t.Errorf("plan mode: %v, want ErrPlanned", err)
	}
	edit, err := (&View{Mode: Resume}).ConfirmSummary(ctx, s, "")
	if err != nil || edit.OwnerEmail != "a@b.co" || edit.Host != "blog.example.com" {
		t.Errorf("resume mode = %+v, %v; want the summary confirmed as shown", edit, err)
	}
	if _, err := (&View{Mode: Resume}).ConfirmSummary(ctx, s, "Enter a valid email address."); err == nil {
		t.Error("resume mode answered a refusal it cannot fix")
	}

	v := &View{Mode: Apply, Edit: setup.SummaryEdit{OwnerEmail: "new@b.co", Host: "example.com"}}
	if edit, err := v.ConfirmSummary(ctx, s, ""); err != nil || edit != v.Edit {
		t.Errorf("apply mode = %+v, %v; want the plan's edit", edit, err)
	}
	for _, tc := range []struct {
		name string
		edit setup.SummaryEdit
		want string
	}{
		{"address refused", setup.SummaryEdit{OwnerEmail: "a@b.co", Host: "example.com"}, "address"},
		{"email refused", setup.SummaryEdit{OwnerEmail: "nope", Host: "example.com"}, "ownerEmail"},
	} {
		v := &View{Mode: Apply, Edit: tc.edit}
		_, err := v.ConfirmSummary(ctx, s, "That address already points to another site.")
		if ue, ok := errors.AsType[*UsageError](err); !ok || !strings.Contains(ue.Error(), tc.want) {
			t.Errorf("%s: err = %v, want a usage error naming %s", tc.name, err, tc.want)
		}
	}
}

func TestOpenBrowserShowsTheLinkOnlyWhenNoBrowserOpens(t *testing.T) {
	const link = "http://127.0.0.1:49152/?key=one-time"
	var stderr bytes.Buffer
	v := &View{Stderr: &stderr, GOOS: runtime.GOOS, Env: map[string]string{"BROWSER": "true"}}
	if err := v.OpenBrowser(context.Background(), link); err != nil {
		t.Fatal(err)
	}
	if stderr.Len() != 0 {
		t.Errorf("a browser that opened still printed %q", stderr.String())
	}

	v = &View{Stderr: &stderr, GOOS: runtime.GOOS, Env: map[string]string{"BROWSER": "false"}}
	if err := v.OpenBrowser(context.Background(), link); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(stderr.String(), link) {
		t.Errorf("stderr = %q, want the fallback link", stderr.String())
	}
}

func testRecord() record.Record {
	return record.Record{
		Name:       "Example Site",
		Step:       "installed",
		Domain:     "example.com",
		Cloudflare: record.Cloudflare{AccountID: "acc1", ZoneID: "z1"},
		Setup: record.Setup{
			RunID: "run1", SchemaVersion: record.SetupSchemaVersion,
			AIPosture: "decline", ThemeID: "waymark", OwnerEmail: "owner@example.com", Address: "example.com",
			AppSlug: "cairn-example-site",
		},
	}
}

func TestPlanOfNamesEveryDerivedValue(t *testing.T) {
	zones := []providers.Zone{{ID: "z1", Name: "example.com"}, {ID: "z2", Name: "example.org"}}
	accounts := []providers.Account{{ID: "acc1", Name: "One"}, {ID: "acc2", Name: "Two"}}
	p, err := PlanOf(testRecord(), accounts, zones)
	if err != nil {
		t.Fatal(err)
	}
	if p.RunID != "run1" || p.Repository != "example-site" || p.Worker != "example-site" || p.Database != "example-site-auth" ||
		p.Bucket != "example-site-media" || p.App != "cairn-example-site" || p.Folder != "./example-site" ||
		p.OwnerEmail != "owner@example.com" || p.Address != "example.com" || p.Account != "acc1" || p.Zone != "example.com" ||
		p.Posture != setup.Decline || p.Theme != "waymark" {
		t.Errorf("plan = %+v", p)
	}
	if len(p.Zones) != 2 || len(p.Accounts) != 2 {
		t.Errorf("options = %v, %v; want both listed when several", p.Zones, p.Accounts)
	}
	single, _ := PlanOf(testRecord(), accounts[:1], zones[:1])
	if single.Zones != nil || single.Accounts != nil {
		t.Errorf("a single choice listed options: %+v", single)
	}
}

func TestPlanFileIsWrittenOwnerOnlyAndRoundTrips(t *testing.T) {
	path := filepath.Join(t.TempDir(), "plan.json")
	p, _ := PlanOf(testRecord(), nil, nil)
	if err := WritePlan(path, p); err != nil {
		t.Fatal(err)
	}
	if runtime.GOOS != "windows" {
		if info, err := os.Stat(path); err != nil || info.Mode().Perm() != 0o600 {
			t.Errorf("plan mode = %v, %v; want 0600", info.Mode(), err)
		}
	}
	got, err := ReadPlan(path)
	if err != nil || got.RunID != "run1" || got.Repository != "example-site" {
		t.Errorf("ReadPlan = %+v, %v", got, err)
	}
	if err := os.WriteFile(path, []byte(`{"runId":"run1","surprise":1}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := ReadPlan(path); err == nil || !strings.Contains(err.Error(), "surprise") {
		t.Errorf("a key the plan never has: %v, want a refusal naming it", err)
	}
}

func TestCheckRefusesEditedClosedFieldsAndBadOpenOnes(t *testing.T) {
	rec := testRecord()
	zones := []providers.Zone{{ID: "z1", Name: "example.com"}, {ID: "z2", Name: "example.org"}}
	accounts := []providers.Account{{ID: "acc1", Name: "One"}, {ID: "acc2", Name: "Two"}}
	base, _ := PlanOf(rec, accounts, zones)
	if err := Check(base, rec); err != nil {
		t.Fatalf("an untouched plan: %v", err)
	}

	tests := []struct {
		name string
		edit func(p *Plan)
		want string
	}{
		{"repository", func(p *Plan) { p.Repository = "mine" }, "repository"},
		{"worker", func(p *Plan) { p.Worker = "mine" }, "worker"},
		{"database", func(p *Plan) { p.Database = "mine" }, "database"},
		{"bucket", func(p *Plan) { p.Bucket = "mine" }, "bucket"},
		{"app", func(p *Plan) { p.App = "mine" }, "app"},
		{"runId", func(p *Plan) { p.RunID = "other" }, "runId"},
		{"posture", func(p *Plan) { p.Posture = setup.Invite }, "posture"},
		{"siteName", func(p *Plan) { p.SiteName = "Other" }, "siteName"},
		{"invalid email", func(p *Plan) { p.OwnerEmail = "not an email" }, "ownerEmail"},
		{"empty email", func(p *Plan) { p.OwnerEmail = "" }, "ownerEmail"},
		{"address outside the zone", func(p *Plan) { p.Address = "example.net" }, "address"},
		{"open account", func(p *Plan) { p.Account = "" }, "account"},
		{"account outside the list", func(p *Plan) { p.Account = "acc9" }, "account"},
		{"account other than the plan's", func(p *Plan) { p.Account = "acc2" }, "account"},
		{"open zone", func(p *Plan) { p.Zone = "" }, "zone"},
		{"zone outside the list", func(p *Plan) { p.Zone = "example.net" }, "zone"},
		{"zone other than the plan's", func(p *Plan) { p.Zone = "example.org" }, "zone"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := base
			tt.edit(&p)
			err := Check(p, rec)
			ue, ok := errors.AsType[*UsageError](err)
			if !ok || !strings.Contains(ue.Error(), tt.want) {
				t.Errorf("Check = %v, want a usage error naming %s", err, tt.want)
			}
		})
	}

	p := base
	p.Address, p.OwnerEmail = "blog.example.com", "new@example.com"
	if err := Check(p, rec); err != nil {
		t.Errorf("the open fields edited to valid values: %v", err)
	}
}
