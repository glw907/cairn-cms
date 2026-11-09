package agentview

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"slices"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup"
)

// PlanSchemaVersion is the version of the plan file's shape.
const PlanSchemaVersion = 1

// maxPlanFile bounds the plan file read; a real one is under a kilobyte.
const maxPlanFile = 1 << 20

// Choice is one option of an open choice.
type Choice struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Plan is the file --plan writes and --apply reads. It holds no credential. The fields that
// derive from the site's name, and the run it belongs to, are closed: --apply recomputes them
// from the record and refuses a plan that changed one. Account, zone, address, and ownerEmail
// are the open fields the owner or the agent may edit before --apply.
type Plan struct {
	SchemaVersion int `json:"schemaVersion"`
	// RunID names the setup record the plan belongs to.
	RunID      string        `json:"runId"`
	SiteName   string        `json:"siteName"`
	Repository string        `json:"repository"`
	Worker     string        `json:"worker"`
	Database   string        `json:"database"`
	Bucket     string        `json:"bucket"`
	App        string        `json:"app"`
	Folder     string        `json:"folder"`
	Theme      string        `json:"theme"`
	Posture    setup.Posture `json:"posture"`
	// Account is the Cloudflare account id; Accounts lists the options when the sign-in has several.
	Account  string   `json:"account"`
	Accounts []Choice `json:"accounts,omitempty"`
	// Zone is the zone's name; Zones lists the active zones when the account has several.
	Zone  string   `json:"zone"`
	Zones []string `json:"zones,omitempty"`
	// Address is the site's address: the zone, or a subdomain of it.
	Address string `json:"address"`
	// Addresses are the hosts the site answers on, derived from address.
	Addresses  []string `json:"addresses"`
	OwnerEmail string   `json:"ownerEmail"`
}

// PlanOf builds the plan a run stopped at the summary has reached, from its record. accounts
// and zones are the options the runner offered; each is listed only when there were several.
func PlanOf(rec record.Record, accounts []providers.Account, zones []providers.Zone) (Plan, error) {
	a := setup.RecordedAnswers(rec)
	names, err := setup.DeriveNames(rec.Name, a.Suffix)
	if err != nil {
		return Plan{}, err
	}
	// A run stopped at an open choice has no zone or address recorded yet.
	var addrs []string
	if a.Zone != "" && a.Host != "" {
		out, err := setup.Plan(a)
		if err != nil {
			return Plan{}, err
		}
		addrs = out.Addresses
	}
	p := Plan{
		SchemaVersion: PlanSchemaVersion,
		RunID:         rec.Setup.RunID,
		SiteName:      rec.Name,
		Repository:    names.Repository,
		Worker:        names.Worker,
		Database:      names.Database,
		Bucket:        names.Bucket,
		App:           names.App,
		Folder:        names.Folder,
		Theme:         a.Theme,
		Posture:       a.Posture,
		Account:       a.AccountID,
		Zone:          rec.Domain,
		Address:       rec.Setup.Address,
		Addresses:     addrs,
		OwnerEmail:    rec.Setup.OwnerEmail,
	}
	// A taken App name is fixed by the owner on GitHub's page, so the record holds the slug.
	if rec.Setup.AppSlug != "" {
		p.App = rec.Setup.AppSlug
	}
	if len(accounts) > 1 {
		for _, a := range accounts {
			p.Accounts = append(p.Accounts, Choice{ID: a.ID, Name: a.Name})
		}
	}
	if len(zones) > 1 {
		for _, z := range zones {
			p.Zones = append(p.Zones, z.Name)
		}
	}
	return p, nil
}

// WritePlan writes p to path, readable by its owner alone. It writes a temporary file in the
// same folder and renames it over path, so the plan is never at another mode or half written.
func WritePlan(path string, p Plan) error {
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".plan-*")
	if err != nil {
		return fmt.Errorf("write the plan: %w", err)
	}
	_, werr := tmp.Write(append(data, '\n'))
	if cerr := tmp.Close(); werr == nil {
		werr = cerr
	}
	if werr == nil {
		werr = os.Rename(tmp.Name(), path)
	}
	if werr != nil {
		_ = os.Remove(tmp.Name())
		return fmt.Errorf("write the plan: %w", werr)
	}
	return nil
}

// ReadPlan reads the plan file at path. A key the plan never has is refused by name.
func ReadPlan(path string) (Plan, error) {
	f, err := os.Open(path)
	if err != nil {
		return Plan{}, fmt.Errorf("read the plan: %w", err)
	}
	defer func() { _ = f.Close() }()
	data, err := io.ReadAll(io.LimitReader(f, maxPlanFile))
	if err != nil {
		return Plan{}, fmt.Errorf("read the plan %s: %w", path, err)
	}
	var p Plan
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&p); err != nil {
		return Plan{}, fmt.Errorf("read the plan %s: %w", path, err)
	}
	return p, nil
}

// Check refuses a plan that changed a closed field, left an open choice open, or set an open
// field to a value setup would refuse, with a usage error naming the field. Every derived name is
// recomputed from rec, never taken from the file. The open fields it does not refuse are what
// --apply takes: the address and the email.
func Check(p Plan, rec record.Record) error {
	if p.SchemaVersion != PlanSchemaVersion {
		return usage("cairn: the plan's schemaVersion is %d, and this cairn reads %d", p.SchemaVersion, PlanSchemaVersion)
	}
	want, err := PlanOf(rec, nil, nil)
	if err != nil {
		return err
	}
	for _, c := range []struct {
		field     string
		got, want string
	}{
		{"runId", p.RunID, want.RunID}, {"siteName", p.SiteName, want.SiteName},
		{"repository", p.Repository, want.Repository}, {"worker", p.Worker, want.Worker},
		{"database", p.Database, want.Database}, {"bucket", p.Bucket, want.Bucket},
		{"app", p.App, want.App}, {"folder", p.Folder, want.Folder},
		{"theme", p.Theme, want.Theme}, {"posture", string(p.Posture), string(want.Posture)},
	} {
		if c.got != c.want {
			return usage("cairn: the plan's %s was changed. Only account, zone, address, and ownerEmail may be edited; run --plan again for a new plan", c.field)
		}
	}
	if err := openChoice("account", p.Account, want.Account, choiceIDs(p.Accounts)); err != nil {
		return err
	}
	if err := openChoice("zone", p.Zone, want.Zone, p.Zones); err != nil {
		return err
	}
	if !setup.ValidEmail(p.OwnerEmail) {
		return usage("cairn: the plan's ownerEmail must be one email address, such as owner@example.com")
	}
	if _, err := setup.Plan(setup.Answers{
		SiteName: want.SiteName, OwnerEmail: p.OwnerEmail, Posture: want.Posture, Zone: p.Zone, Host: p.address(),
	}); err != nil {
		return usage("cairn: the plan's address %q must be the zone %s or a subdomain of it", p.address(), p.Zone)
	}
	return nil
}

func choiceIDs(cs []Choice) []string {
	ids := make([]string, len(cs))
	for i, c := range cs {
		ids[i] = c.ID
	}
	return ids
}

// openChoice checks one open choice: it must be filled in, be one of the listed options when
// the plan lists several, and match the record when the record settled it, since a run cannot
// move to another account or zone after its approvals. A record that has not settled it takes
// any listed option.
func openChoice(field, got, recorded string, options []string) error {
	switch {
	case got == "" && len(options) == 0:
		return usage("cairn: the plan's %s is left open; name the Cloudflare %s to use", field, field)
	case got == "":
		return usage("cairn: the plan's %s is left open; choose one of its %ss", field, field)
	case len(options) > 0 && !slices.Contains(options, got):
		return usage("cairn: the plan's %s %q is not one of its listed options", field, got)
	case recorded != "" && got != recorded:
		return usage("cairn: the plan's %s %q is not the one this setup began with, %q; run --plan again to change it", field, got, recorded)
	}
	return nil
}

// address is the plan's address, or the zone when the plan left it for the zone to give.
func (p Plan) address() string {
	if p.Address == "" {
		return p.Zone
	}
	return p.Address
}

// Edit returns the plan's open fields as the summary's two editable rows.
func (p Plan) Edit() setup.SummaryEdit {
	return setup.SummaryEdit{OwnerEmail: p.OwnerEmail, Host: p.address()}
}
