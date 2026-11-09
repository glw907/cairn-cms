package store

import (
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

func wizardSteps() []spine.Step {
	return []spine.Step{
		spine.StepScaffolded, spine.StepAppCreated, spine.StepInstalled, spine.StepAwaitingOrgApproval,
		spine.StepRepoCreated, spine.StepPushed, spine.StepDeployed, spine.StepLive, spine.StepZoneCreated,
		spine.StepRecordsCarried, spine.StepDelegated, spine.StepDomainLive, spine.StepPaidPlanDeclined,
		spine.StepEmailOnboarded, spine.StepEmailLive, spine.StepBuildsLive, spine.StepBuildsConnectDeclined,
		spine.StepBuildsConnected, spine.StepConfigReconciled,
	}
}

// fakeCredentials are values a fake run would issue to the keyring. None may reach a record.
var fakeCredentials = []string{
	"fake-app-private-key-PEM-7f3a", "fake-client-secret-9c2d", "fake-deploy-key-token-41be",
	"fake-cf-api-token-a8e0", "fake-webhook-secret-5d17",
}

func setupRecord(step string) record.Record {
	return record.Record{
		Name:          "Fern Studio",
		Step:          step,
		Domain:        "fern.example",
		SchemaVersion: 1,
		GitHub: record.GitHub{
			Repo:           record.GitHubRepo{ID: 77, Owner: "fern", Repo: "fern-site", DefaultBranch: "main"},
			InstallationID: 99,
		},
		Cloudflare: record.Cloudflare{AccountID: "acct1", ZoneID: "zone1", WorkerName: "fern-site"},
		Setup: record.Setup{
			RunID:         "run-1",
			SchemaVersion: record.SetupSchemaVersion,
			Intents: record.SetupIntents{
				D1: "fern-db", R2Bucket: "fern-media", Worker: "fern-site", App: "fern-cms", Repo: "fern-site", DeployKey: "fern-deploy",
			},
			IDs: record.SetupIDs{
				D1: "0b1f-uuid", R2Bucket: "fern-media", WorkerTag: "tag123", AppID: 4242, DeployKeyID: "dk-17",
			},
			AppSlug: "fern-cms", ClientID: "Iv1.abc",
			EngineVersion: "1.2.3", EngineIntegrity: "sha512-xyz",
			Folder: "/home/me/fern", Commit: "deadbeef",
			KeyringEntries: []string{"cairn/fern/app-key", "cairn/fern/client-secret"},
			KeysKept:       true,
			OwnerEmail:     "me@fern.example", Address: "fern.example", AIPosture: "off", ThemeID: "waymark",
			Deploys: record.SetupDeploys,
		},
	}
}

func openTemp(t *testing.T) *Store {
	t.Helper()
	s, err := Open(filepath.Join(t.TempDir(), "sites"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	return s
}

func registryFiles(t *testing.T, s *Store) []string {
	t.Helper()
	des, err := os.ReadDir(s.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		t.Fatalf("ReadDir: %v", err)
	}
	var names []string
	for _, de := range des {
		names = append(names, de.Name())
	}
	return names
}

func TestSetupRecordReloadsEqualAtEveryStep(t *testing.T) {
	steps := append(wizardSteps(), spine.StepSetupStarted, spine.StepResourcesCreated)
	for _, step := range steps {
		t.Run(string(step), func(t *testing.T) {
			s := openTemp(t)
			want := setupRecord(string(step))
			id, err := s.SaveNew("fern", want)
			if err != nil {
				t.Fatalf("SaveNew: %v", err)
			}
			got, err := s.Load(id)
			if err != nil {
				t.Fatalf("Load: %v", err)
			}
			wb, _ := want.Marshal()
			gb, _ := got.Marshal()
			if string(wb) != string(gb) {
				t.Fatalf("reload differs:\nwant %s\ngot  %s", wb, gb)
			}
			if got.Step != string(step) || got.Setup.IDs != want.Setup.IDs || got.Setup.Intents != want.Setup.Intents ||
				!slices.Equal(got.Setup.KeyringEntries, want.Setup.KeyringEntries) || got.Setup.Commit != "deadbeef" ||
				got.Setup.Deploys != "actions" || got.GitHub.Repo.ID != 77 || got.GitHub.InstallationID != 99 || !got.Setup.KeysKept {
				t.Fatalf("typed fields lost on reload: %+v", got.Setup)
			}
		})
	}
}

func TestWizardAndAdoptedRecordsAreNeverResumeCandidates(t *testing.T) {
	s := openTemp(t)
	for _, step := range wizardSteps() {
		r := record.Record{Name: "Wizard " + string(step), Step: string(step), SchemaVersion: 1}
		if _, err := s.SaveNew("wiz", r); err != nil {
			t.Fatalf("SaveNew: %v", err)
		}
	}
	adopted := record.Record{Name: "Adopted", Step: string(spine.StepLive), Adopted: true, SchemaVersion: 1}
	if _, err := s.SaveNew("adopted", adopted); err != nil {
		t.Fatalf("SaveNew: %v", err)
	}
	before := registryFiles(t, s)

	entries, errs := s.List()
	if len(errs) != 0 || len(entries) != 20 {
		t.Fatalf("List = %d entries, errs %v, want 20 and none", len(entries), errs)
	}
	cands, only, serrs := SelectResume(entries)
	if len(cands) != 0 || only != nil || len(serrs) != 0 {
		t.Fatalf("SelectResume = %v, %v, %v; want nothing", cands, only, serrs)
	}
	if after := registryFiles(t, s); !slices.Equal(before, after) {
		t.Fatalf("selection changed the registry: %v -> %v", before, after)
	}
}

func TestSelectResumePicksNoneAmongSeveral(t *testing.T) {
	s := openTemp(t)
	a, _ := s.SaveNew("fern", setupRecord(string(spine.StepAppCreated)))
	b, _ := s.SaveNew("moss", setupRecord(string(spine.StepPushed)))
	done, _ := s.SaveNew("done", setupRecord(string(spine.StepLive)))
	entries, _ := s.List()

	cands, only, errs := SelectResume(entries)
	if len(errs) != 0 || only != nil || len(cands) != 2 {
		t.Fatalf("got %d candidates, only %v, errs %v", len(cands), only, errs)
	}
	ids := []string{cands[0].ID, cands[1].ID}
	if !slices.Contains(ids, a) || !slices.Contains(ids, b) || slices.Contains(ids, done) {
		t.Fatalf("candidates %v, want %s and %s", ids, a, b)
	}

	_, only, _ = SelectResume([]Entry{{ID: a, Record: setupRecord(string(spine.StepAppCreated))}})
	if only == nil || only.ID != a {
		t.Fatalf("a single candidate is not picked: %v", only)
	}
}

func TestNewerSetupSchemaIsRefused(t *testing.T) {
	s := openTemp(t)
	r := setupRecord(string(spine.StepPushed))
	r.Setup.SchemaVersion = record.SetupSchemaVersion + 1
	id, err := s.SaveNew("fern", r)
	if err != nil {
		t.Fatalf("SaveNew: %v", err)
	}
	if _, err := s.LoadResumable(id); !errors.Is(err, record.ErrSetupTooNew) || !strings.Contains(err.Error(), "upgrade") {
		t.Fatalf("LoadResumable err = %v, want ErrSetupTooNew with an upgrade message", err)
	}
	entries, _ := s.List()
	cands, only, errs := SelectResume(entries)
	if len(cands) != 0 || only != nil || len(errs) != 1 || !errors.Is(errs[0], record.ErrSetupTooNew) {
		t.Fatalf("SelectResume = %v, %v, %v", cands, only, errs)
	}
}

func TestLoadResumableRefusesNonSetupAndFinished(t *testing.T) {
	s := openTemp(t)
	wiz, _ := s.SaveNew("wiz", record.Record{Name: "W", Step: "pushed"})
	fin, _ := s.SaveNew("fin", setupRecord(string(spine.StepLive)))
	open, _ := s.SaveNew("open", setupRecord(string(spine.StepPushed)))
	for _, id := range []string{wiz, fin} {
		if _, err := s.LoadResumable(id); !errors.Is(err, ErrNotResumable) {
			t.Errorf("LoadResumable(%s) = %v, want ErrNotResumable", id, err)
		}
	}
	if _, err := s.LoadResumable(open); err != nil {
		t.Errorf("LoadResumable(open): %v", err)
	}
}

func TestSaveNewDrawsAgainOnAnExistingID(t *testing.T) {
	s := openTemp(t)
	existing := setupRecord(string(spine.StepPushed))
	existing.Name = "Existing"
	if err := s.Save("fern-aaaaaa", existing); err != nil {
		t.Fatalf("Save: %v", err)
	}
	draws := []string{"aaaaaa", "bbbbbb"}
	next := func() (string, error) { d := draws[0]; draws = draws[1:]; return d, nil }

	id, err := s.saveNew("fern", setupRecord(string(spine.StepAppCreated)), next)
	if err != nil {
		t.Fatalf("saveNew: %v", err)
	}
	if id != "fern-bbbbbb" {
		t.Fatalf("id = %s, want fern-bbbbbb", id)
	}
	kept, err := s.Load("fern-aaaaaa")
	if err != nil || kept.Name != "Existing" {
		t.Fatalf("existing record was replaced: %v, %v", kept.Name, err)
	}

	if id, err := s.SaveNew("fern", setupRecord("pushed")); err != nil || record.ValidateSiteID(id) != nil {
		t.Fatalf("SaveNew = %q, %v", id, err)
	}
}

func TestSetupRecordHoldsNoCredential(t *testing.T) {
	s := openTemp(t)
	r := setupRecord(string(spine.StepInstalled))
	// The fake run keeps its credentials in a keyring map keyed by the entry names the record holds.
	keyring := map[string]string{}
	for i, name := range r.Setup.KeyringEntries {
		keyring[name] = fakeCredentials[i]
	}
	keyring["cairn/fern/cf-token"] = fakeCredentials[3]
	keyring["cairn/fern/webhook"] = fakeCredentials[4]
	r.Setup.KeyringEntries = append(r.Setup.KeyringEntries, "cairn/fern/cf-token", "cairn/fern/webhook")

	id, err := s.SaveNew("fern", r)
	if err != nil {
		t.Fatalf("SaveNew: %v", err)
	}
	raw, err := os.ReadFile(filepath.Join(s.dir, id+".json"))
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	for name, value := range keyring {
		if strings.Contains(string(raw), value) {
			t.Errorf("record holds the credential behind %s", name)
		}
		if !strings.Contains(string(raw), name) {
			t.Errorf("record lacks the entry name %s", name)
		}
	}
	got, _ := s.Load(id)
	if len(got.Extra)+len(got.Setup.Extra)+len(got.GitHub.Extra)+len(got.GitHub.Repo.Extra)+len(got.Cloudflare.Extra) != 0 {
		t.Errorf("setup wrote an Extra key: %v %v", got.Extra, got.Setup.Extra)
	}
}

// TestSitesAndHealthReadSetupRecords exercises the loads `cairn sites` (List) and
// `cairn health` (Load) make: neither skips nor fails on a setup record.
func TestSitesAndHealthReadSetupRecords(t *testing.T) {
	s := openTemp(t)
	finished, _ := s.SaveNew("done", setupRecord(string(spine.StepLive)))
	var unfinished []string
	for _, step := range []spine.Step{spine.StepSetupStarted, spine.StepResourcesCreated, spine.StepAppCreated, spine.StepDeployed} {
		id, _ := s.SaveNew("part", setupRecord(string(step)))
		unfinished = append(unfinished, id)
	}
	entries, errs := s.List()
	if len(errs) != 0 || len(entries) != 5 {
		t.Fatalf("List = %d entries, errs %v", len(entries), errs)
	}
	listed := false
	for _, e := range entries {
		listed = listed || (e.ID == finished && e.Record.Step == "live" && e.Record.Setup.RunID == "run-1")
	}
	if !listed {
		t.Fatalf("finished setup record is not listed")
	}
	for _, id := range append(unfinished, finished) {
		r, err := s.Load(id)
		if err != nil || r.Domain != "fern.example" || r.Cloudflare.AccountID != "acct1" {
			t.Errorf("Load(%s) = %v, %+v", id, err, r)
		}
	}
}
