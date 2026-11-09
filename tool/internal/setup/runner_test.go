package setup

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
	"github.com/glw907/cairn-cms/tool/v2/internal/store"
)

// The production clients satisfy the seams the runner defines.
var (
	_ CloudflareAuth = (*providers.CloudflareOAuth)(nil)
	_ CloudflareAPI  = (*providers.Cloudflare)(nil)
	_ GitHubAPI      = (*providers.GitHub)(nil)
	_ GitHubWeb      = (*providers.GitHubWeb)(nil)
	_ Vault          = secrets.SetupStore{}
	_ Saver          = (*store.Store)(nil)
)

func TestRunReachesTheSummaryAfterTheFourApprovals(t *testing.T) {
	w := newWorld(t)
	res, err := w.run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	wantWaits := []WaitState{WaitCloudflare, WaitCreateApp, WaitInstallAll, WaitInstallRepo}
	if got := w.waits(); !slices.Equal(got, wantWaits) {
		t.Errorf("waiting states = %v, want %v", got, wantWaits)
	}
	for _, e := range w.events {
		if e.SchemaVersion != EventSchemaVersion || e.Kind == "" || e.Timestamp.IsZero() {
			t.Errorf("event %+v lacks schemaVersion, kind, or timestamp", e)
		}
		if e.Kind == Waiting && e.Sentence != WaitSentence(e.Waiting, "Example Site", "example-site") {
			t.Errorf("waiting %s sentence = %q", e.Waiting, e.Sentence)
		}
	}
	if last := w.events[len(w.events)-1]; last.Kind != SummaryKind || last.Summary == nil {
		t.Fatalf("last event = %+v, want the summary", last)
	}

	s := res.Summary
	if s.Repository != "example-site" || s.Database != "example-site-auth" || s.Bucket != "example-site-media" ||
		s.Zone != "carin-test-5.org" || s.OwnerEmail != w.cf.email || s.Theme != "waymark" ||
		s.ThemeDescription != "An intentionally neutral look that's easy to edit." || s.SuffixReason != "" {
		t.Errorf("summary = %+v", s)
	}
	if want := []string{"carin-test-5.org", "www.carin-test-5.org"}; !slices.Equal(s.Addresses, want) {
		t.Errorf("addresses = %v, want %v", s.Addresses, want)
	}
	if res.Outline.Names.Repository != "example-site" || res.Outline.OwnerEmail != w.cf.email {
		t.Errorf("outline = %+v", res.Outline)
	}
	if got := w.tab.shown[len(w.tab.shown)-1]; got.Kind != PageDone {
		t.Errorf("last page = %+v, want done.html", got)
	}
	if !w.tab.closed {
		t.Error("the tab was left bound")
	}
	if len(w.view.opened) != 1 || w.view.opened[0] != tabURL {
		t.Errorf("opened %v, want the tab URL once", w.view.opened)
	}

	ours := w.gh.ours()
	if len(ours) != 1 || ours[0].ID != repoInstallID {
		t.Errorf("our installations = %+v, want only the repository-scoped one", ours)
	}
	if !slices.ContainsFunc(w.gh.installs, func(in install) bool { return in.AppID == foreignAppID }) {
		t.Error("another App's installation was deleted")
	}

	rec := res.Record
	if rec.Step != string(spine.StepInstalled) || rec.Setup.RunID != "run7" || rec.Setup.IDs.AppID != w.gh.app.ID ||
		rec.Setup.AppSlug != w.gh.app.Slug || rec.Setup.ClientID != w.gh.app.ClientID ||
		rec.GitHub.InstallationID != repoInstallID || rec.GitHub.Repo.ID != w.gh.repo.ID ||
		rec.Cloudflare.AccountID != w.cf.accounts[0].ID || rec.Setup.Folder != filepath.Join(w.cfg.Dir, "example-site") ||
		rec.Setup.EngineVersion != "1.0.0" || rec.Setup.Intents.Repo != "example-site" || rec.Setup.Intents.App != "cairn-example-site" {
		t.Errorf("record = %+v", rec)
	}
	if res.SiteID != w.saver.id {
		t.Errorf("site id = %q, want %q", res.SiteID, w.saver.id)
	}
	for _, kind := range []secrets.EntryKind{secrets.EntryCloudflareAccess, secrets.EntryCloudflareRefresh, secrets.EntryAppKey, secrets.EntryAppClientSecret} {
		if _, err := w.vault.Value(kind); err != nil {
			t.Errorf("keyring holds no %s", kind)
		}
	}

	assertRegisteredAndUnseen(t, w)
}

// assertRegisteredAndUnseen checks that every credential the fakes issued reached the scrub and
// that no event, record, or failure carries one, nor a code, nonce, or the tab's key.
func assertRegisteredAndUnseen(t *testing.T, w *world) {
	t.Helper()
	tok := w.cfAuth.tokens[0]
	issued := []string{tok.AccessToken, tok.RefreshToken, w.gh.app.ClientSecret.Reveal(), w.gh.app.WebhookSecret.Reveal(), w.gh.app.PEM.Reveal()}
	for _, c := range w.web.issued {
		issued = append(issued, c.Reveal())
	}
	var registered []string
	for _, c := range w.registered {
		registered = append(registered, c.Reveal())
	}
	for _, v := range issued {
		if !slices.Contains(registered, v) {
			t.Errorf("a credential of %d bytes never reached the scrub", len(v))
		}
	}
	if !slices.ContainsFunc(w.registered, isJWT) {
		t.Error("no App JWT reached the scrub")
	}

	var needles []string
	for _, v := range append(issued, registered...) {
		for line := range strings.SplitSeq(v, "\n") {
			if len(line) >= 8 && !strings.HasPrefix(line, "-----") {
				needles = append(needles, line)
			}
		}
	}
	needles = append(needles, w.codes...)
	needles = append(needles, w.cfAuth.verifiers...)
	for _, n := range w.tab.armed {
		needles = append(needles, n)
	}
	needles = append(needles, "one-time-tab-key")

	var hay []string
	for _, e := range w.events {
		b, _ := json.Marshal(e)
		hay = append(hay, string(b))
	}
	for _, r := range w.saver.saves {
		b, err := r.Marshal()
		if err != nil {
			t.Fatalf("marshal record: %v", err)
		}
		hay = append(hay, string(b))
	}
	for _, h := range hay {
		for _, n := range needles {
			if strings.Contains(h, n) {
				t.Errorf("a secret value appears in %.80s...", h)
			}
		}
	}
}

func TestOpeningChecksStopBeforeAnyWrite(t *testing.T) {
	cases := []struct {
		name  string
		setup func(w *world)
		want  Reason
	}{
		{"ssh session", func(w *world) { w.cfg.Env = map[string]string{"SSH_TTY": "/dev/pts/1", "DISPLAY": ":0"} }, ReasonRemote},
		{"no display on linux", func(w *world) { w.cfg.Env = map[string]string{} }, ReasonRemote},
		{"git missing", func(w *world) { w.gitErr = exec.ErrNotFound }, ReasonGitMissing},
		{"node missing", func(w *world) { w.nodeErr = exec.ErrNotFound }, ReasonNodeMissing},
		{"node below 24", func(w *world) { w.node = "v22.11.0" }, ReasonNodeOld},
		{"port bound", func(w *world) { w.listenErr = &loopback.PortInUseError{Err: errors.New("bind")} }, ReasonPortInUse},
		{"keyring locked", func(w *world) { w.vault.probeErr = secrets.ErrKeyringUnavailable }, ReasonKeyring},
		{"template fetch fails", func(w *world) { w.fetchErr = errors.New("registry unreachable") }, ReasonTemplate},
		{"folder not empty", func(w *world) {
			dir := filepath.Join(w.cfg.Dir, "example-site")
			if err := os.MkdirAll(dir, 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(dir, "notes.txt"), []byte("x"), 0o644); err != nil {
				t.Fatal(err)
			}
		}, ReasonFolderNotEmpty},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			tc.setup(w)
			_, err := w.run(context.Background())
			f := failureOf(t, err)
			if f.Reason != tc.want {
				t.Fatalf("reason = %s, want %s", f.Reason, tc.want)
			}
			if f.Happened == "" || f.Did != nothingCreated || f.Do == "" {
				t.Errorf("failure parts = %+v", f)
			}
			if w.gh.writes != 0 || w.vault.puts != 0 || len(w.saver.saves) != 0 || len(w.view.opened) != 0 {
				t.Errorf("writes: github %d, keyring %d, record %d, browser opened %d; want none",
					w.gh.writes, w.vault.puts, len(w.saver.saves), len(w.view.opened))
			}
			last := w.events[len(w.events)-1]
			if last.Kind != StepFailed || last.Failure == nil || last.Failure.Reason != tc.want {
				t.Errorf("last event = %+v, want step_failed with %s", last, tc.want)
			}
		})
	}
}

func TestEmptyFolderPassesTheOpening(t *testing.T) {
	w := newWorld(t)
	if err := os.MkdirAll(filepath.Join(w.cfg.Dir, "example-site"), 0o755); err != nil {
		t.Fatal(err)
	}
	if _, err := w.run(context.Background()); err != nil {
		t.Fatalf("Run: %v", err)
	}
}

func TestCloudflareChecksStopBeforeAnyProviderWrite(t *testing.T) {
	cases := []struct {
		name  string
		setup func(w *world)
		want  Reason
	}{
		{"no account", func(w *world) { w.cf.accounts = nil }, ReasonNoAccount},
		{"no zones", func(w *world) { w.cf.active, w.cf.all = nil, nil }, ReasonNoZones},
		{"pending zone", func(w *world) {
			w.cf.active = nil
			w.cf.all = cfResult[[]providers.Zone](t, "zones.pending.200.json")
		}, ReasonZonePending},
		{"apex has records", func(w *world) {
			w.cf.dns["carin-test-5.org"] = cfResult[[]providers.DNSRecord](t, "zone_dns_records.named.200.json")
		}, ReasonAddressRecords},
		{"www has records", func(w *world) {
			w.cf.dns["www.carin-test-5.org"] = []providers.DNSRecord{{Name: "www.carin-test-5.org", Type: "CNAME"}}
		}, ReasonAddressRecords},
		{"custom domain on the address", func(w *world) {
			w.cf.domains["carin-test-5.org"] = []providers.WorkerDomain{{Hostname: "carin-test-5.org", Service: "other"}}
		}, ReasonAddressInUse},
		{"route on the address", func(w *world) {
			w.cf.routes = []providers.WorkerRoute{{ID: "r1", Pattern: "www.carin-test-5.org/*", Script: "other"}}
		}, ReasonAddressInUse},
		{"every suffix taken", func(w *world) {
			w.cf.workers["example-site"] = true
			for _, s := range []string{"2", "3", "4", "5", "6", "7", "8", "9"} {
				w.cf.r2["example-site-"+s+"-media"] = true
			}
		}, ReasonNamesTaken},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			tc.setup(w)
			_, err := w.run(context.Background())
			f := failureOf(t, err)
			if f.Reason != tc.want {
				t.Fatalf("reason = %s, want %s", f.Reason, tc.want)
			}
			if f.Happened == "" || f.Do == "" {
				t.Errorf("failure parts = %+v", f)
			}
			if w.gh.writes != 0 || slices.ContainsFunc(w.log, func(s string) bool { return strings.HasPrefix(s, "gh:") }) {
				t.Errorf("GitHub was called before the Cloudflare checks passed: %v", w.log)
			}
		})
	}
}

// TestTheChecksNeverReadSubscriptions holds the live finding that the subscriptions route answers
// the setup grant with a 403: the checks do not ask for the plan at all.
func TestTheChecksNeverReadSubscriptions(t *testing.T) {
	w := newWorld(t)
	if _, err := w.run(context.Background()); err != nil {
		t.Fatalf("Run: %v", err)
	}
	if slices.Contains(w.log, "cf:subscriptions") {
		t.Errorf("log %v reads the subscriptions route", w.log)
	}
}

func TestATakenCloudflareNameTakesTheNextSuffix(t *testing.T) {
	w := newWorld(t)
	w.cf.d1["example-site-auth"] = true
	res, err := w.run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if res.Summary.Repository != "example-site-2" || res.Summary.SuffixReason == "" {
		t.Errorf("summary = %+v, want the -2 names with a reason", res.Summary)
	}
	if !slices.Contains(w.log, "gh:create:example-site-2") {
		t.Errorf("log %v lacks the create of example-site-2", w.log)
	}
}

func TestQuestionsAppearOnlyForSeveralChoices(t *testing.T) {
	t.Run("one of each asks nothing", func(t *testing.T) {
		w := newWorld(t)
		if _, err := w.run(context.Background()); err != nil {
			t.Fatalf("Run: %v", err)
		}
		if w.view.themeAsks+w.view.accountAsks+w.view.zones != 0 {
			t.Errorf("asks: theme %d, account %d, zone %d; want none", w.view.themeAsks, w.view.accountAsks, w.view.zones)
		}
	})
	t.Run("several of each asks each once", func(t *testing.T) {
		w := newWorld(t)
		w.template.Themes = append(w.template.Themes, scaffold.Theme{ID: "survey", Name: "Survey", Description: "A field-journal look."})
		w.cf.accounts = append(w.cf.accounts, providers.Account{ID: "0000000000000000000000000000ex02", Name: "Second"})
		w.cf.active = cfResult[[]providers.Zone](t, "zones.list.200.json")
		w.view.theme, w.view.account, w.view.zone = "survey", "0000000000000000000000000000ex02", w.cf.active[1].ID
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		if w.view.themeAsks != 1 || w.view.accountAsks != 1 || w.view.zones != 1 {
			t.Errorf("asks: theme %d, account %d, zone %d; want one each", w.view.themeAsks, w.view.accountAsks, w.view.zones)
		}
		if res.Summary.Theme != "survey" || res.Summary.Zone != w.cf.active[1].Name || !res.Summary.ZoneChosen {
			t.Errorf("summary = %+v", res.Summary)
		}
		if !slices.Contains(w.cf.bound, "0000000000000000000000000000ex02") || res.Record.Cloudflare.AccountID != "0000000000000000000000000000ex02" {
			t.Errorf("clients bound to %v, record account %q", w.cf.bound, res.Record.Cloudflare.AccountID)
		}
	})
}

func TestAGrantWithoutTheMintScopeAsksAgain(t *testing.T) {
	w := newWorld(t)
	missing := fixture[providers.OAuthToken](t, "cloudflare", "oauth_token.missing-scope.200.json")
	full := w.cfAuth.tokens[0]
	w.cfAuth.tokens = []providers.OAuthToken{missing, full}
	w.tab.script[loopback.CloudflareCallback] = append(w.tab.script[loopback.CloudflareCallback], w.cloudflareApproves)

	if _, err := w.run(context.Background()); err != nil {
		t.Fatalf("Run: %v", err)
	}
	i := slices.IndexFunc(w.tab.shown, func(p Page) bool { return p.Kind == PageScopeError })
	if i < 0 {
		t.Fatalf("pages %+v never showed error.html", w.tab.shown)
	}
	retry, err := url.Parse(w.tab.shown[i].URL)
	if err != nil || retry.Host != "dash.cloudflare.com" {
		t.Fatalf("Try again links %q, want a Cloudflare authorize URL", w.tab.shown[i].URL)
	}
	if len(w.cfAuth.verifiers) != 2 || w.cfAuth.verifiers[0] == w.cfAuth.verifiers[1] {
		t.Fatalf("verifiers = %d, want two distinct exchanges", len(w.cfAuth.verifiers))
	}
	if got := retry.Query().Get("code_challenge"); got != providers.PKCEChallenge(w.cfAuth.verifiers[1]) {
		t.Error("Try again's challenge does not match the second exchange's verifier")
	}
	if retry.Query().Get("state") == "" {
		t.Error("Try again carries no state")
	}
}

func TestAFailedAllRepositoriesDeleteStopsInFourParts(t *testing.T) {
	w := newWorld(t)
	w.gh.deleteErr = errors.New("github 500")
	_, err := w.run(context.Background())
	f := failureOf(t, err)
	if f.Reason != ReasonInstallDelete {
		t.Fatalf("reason = %s, want %s", f.Reason, ReasonInstallDelete)
	}
	if f.Happened == "" || f.Left == "" || f.Do == "" ||
		!strings.Contains(f.Did, w.gh.app.Slug) || !strings.Contains(f.Did, "example-site") {
		t.Errorf("failure = %+v, want four parts naming the App and the repository", f)
	}
}

func TestAKillLeavesNoOverGrant(t *testing.T) {
	cases := []struct {
		name  string
		setup func(w *world, cancel context.CancelFunc)
		want  Reason
	}{
		{"between the all-repositories callback and its delete", func(w *world, cancel context.CancelFunc) {
			w.gh.onCreate = cancel
		}, ReasonStopped},
		{"inside the repository approval's loop", func(w *world, cancel context.CancelFunc) {
			w.tab.script[loopback.GitHubCallback] = w.tab.script[loopback.GitHubCallback][:1]
			w.tab.push(loopback.GitHubCallback, func(string) (loopback.Callback, error) {
				w.gh.installs = append(w.gh.installs, install{ID: 5550020, AppID: w.gh.app.ID, Selection: "selected", Repos: []int64{w.gh.repo.ID, 4}})
				return loopback.Callback{Code: w.code("approve"), InstallationID: "5550020", SetupAction: "install"}, nil
			})
			w.tab.push(loopback.GitHubCallback, func(string) (loopback.Callback, error) {
				w.gh.installs = append(w.gh.installs, install{ID: 5550021, AppID: w.gh.app.ID, Selection: "all"})
				cancel()
				return loopback.Callback{}, context.Canceled
			})
		}, ReasonStopped},
		{"at the 30-minute stop", func(w *world, cancel context.CancelFunc) {
			w.tab.script[loopback.GitHubCallback] = w.tab.script[loopback.GitHubCallback][:1]
			w.tab.push(loopback.GitHubCallback, func(string) (loopback.Callback, error) {
				w.gh.installs = append(w.gh.installs, install{ID: 5550030, AppID: w.gh.app.ID, Selection: "all"})
				return loopback.Callback{}, loopback.ErrChainTimeout
			})
		}, ReasonChainTimeout},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			tc.setup(w, cancel)
			_, err := w.run(ctx)
			f := failureOf(t, err)
			if f.Reason != tc.want {
				t.Fatalf("reason = %s, want %s", f.Reason, tc.want)
			}
			if ours := w.gh.ours(); len(ours) != 0 {
				t.Errorf("installations left = %+v, want none", ours)
			}
			if !slices.ContainsFunc(w.gh.installs, func(in install) bool { return in.AppID == foreignAppID }) {
				t.Error("another App's installation was deleted")
			}
		})
	}
}

func TestAResumeSweepsAnOverGrantFirst(t *testing.T) {
	cases := []struct {
		name     string
		step     string
		installs []install
		wantLeft []int64
	}{
		{"an all-repositories install is deleted", string(spine.StepRepoCreated),
			[]install{{ID: allInstallID, Selection: "all"}}, nil},
		{"an unconfirmed install is deleted", string(spine.StepRepoCreated),
			[]install{{ID: repoInstallID, Selection: "selected", Repos: []int64{998877}}}, nil},
		{"the confirmed install is kept", string(spine.StepInstalled),
			[]install{{ID: repoInstallID, Selection: "selected", Repos: []int64{998877}}, {ID: allInstallID, Selection: "all"}}, []int64{repoInstallID}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			for _, in := range tc.installs {
				in.AppID = w.gh.app.ID
				w.gh.installs = append(w.gh.installs, in)
			}
			w.vault.entries[w.vault.Entry(secrets.EntryAppKey)] = w.gh.app.PEM.Reveal()
			rec := record.Record{Step: tc.step}
			rec.Setup.RunID = "run7"
			rec.Setup.IDs.AppID = w.gh.app.ID
			rec.GitHub.InstallationID = repoInstallID
			rec.GitHub.Repo.ID = 998877

			if err := sweepOnResume(context.Background(), w.cfg, rec); err != nil {
				t.Fatalf("sweepOnResume: %v", err)
			}
			if len(w.log) == 0 || w.log[0] != "gh:list" {
				t.Errorf("first GitHub act = %v, want the installation list", w.log)
			}
			var left []int64
			for _, in := range w.gh.ours() {
				left = append(left, in.ID)
			}
			if !slices.Equal(left, tc.wantLeft) {
				t.Errorf("installations left = %v, want %v", left, tc.wantLeft)
			}
			if len(w.gh.installs)-len(left) != 1 {
				t.Error("another App's installation was touched")
			}
			if !slices.ContainsFunc(w.registered, isJWT) {
				t.Error("the sweep's JWT never reached the scrub")
			}
		})
	}
}

func TestAPrivateNameClashRerunsTheCloudflareNameChecks(t *testing.T) {
	cases := []struct {
		name     string
		cfTaken  string
		wantRepo string
	}{
		{"the next suffix is free", "", "example-site-2"},
		{"the next suffix is taken on Cloudflare", "example-site-2", "example-site-3"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			w.gh.taken["example-site"] = true
			if tc.cfTaken != "" {
				w.cf.workers[tc.cfTaken] = true
			}
			res, err := w.run(context.Background())
			if err != nil {
				t.Fatalf("Run: %v", err)
			}
			clash := slices.Index(w.log, "gh:create:example-site")
			recheck := slices.Index(w.log, "cf:worker:example-site-2")
			if clash < 0 || recheck < clash {
				t.Errorf("log %v: the Cloudflare checks for -2 did not run after the clash", w.log)
			}
			if res.Summary.Repository != tc.wantRepo || res.Summary.Database != tc.wantRepo+"-auth" ||
				res.Record.GitHub.Repo.Repo != tc.wantRepo || res.Summary.SuffixReason == "" {
				t.Errorf("summary = %+v, record repo %q", res.Summary, res.Record.GitHub.Repo.Repo)
			}
		})
	}
}

func TestATakenAppNameUsesTheSlugGitHubReturns(t *testing.T) {
	w := newWorld(t)
	w.gh.app.Slug = "cairn-example-site-by-owner"
	res, err := w.run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	i := slices.IndexFunc(w.tab.shown, func(p Page) bool { return p.Kind == PageManifest })
	var m providers.Manifest
	if i < 0 || json.Unmarshal([]byte(w.tab.shown[i].Manifest), &m) != nil || m.Name != "cairn-example-site" {
		t.Fatalf("manifest page = %+v, want the planned App name", w.tab.shown)
	}
	if !slices.ContainsFunc(w.tab.shown, func(p Page) bool {
		return p.Kind == PageRedirect && p.URL == providers.InstallURL("cairn-example-site-by-owner")
	}) {
		t.Error("the install page was not built from the slug GitHub returned")
	}
	if res.Record.Setup.AppSlug != "cairn-example-site-by-owner" || res.Summary.App != "cairn-example-site-by-owner" {
		t.Errorf("record slug %q, summary App %q", res.Record.Setup.AppSlug, res.Summary.App)
	}
}

func TestAFailedAppKeyWriteNamesTheAppToDelete(t *testing.T) {
	w := newWorld(t)
	w.vault.putErr[secrets.EntryAppKey] = secrets.ErrKeyringUnavailable
	_, err := w.run(context.Background())
	f := failureOf(t, err)
	if f.Reason != ReasonKeyringWrite || !strings.Contains(f.Did, "https://github.com/settings/apps/"+w.gh.app.Slug) {
		t.Errorf("failure = %+v, want a keyring failure linking the App's settings", f)
	}
	last, _ := w.saver.last()
	if last.Setup.IDs.AppID != w.gh.app.ID || last.Step == string(spine.StepAppCreated) {
		t.Errorf("record step %q, App id %d: want the id kept and the step not advanced", last.Step, last.Setup.IDs.AppID)
	}
}

func TestAnInstallCodeThatFailsResendsTheTab(t *testing.T) {
	w := newWorld(t)
	w.web.errs = []error{providers.ErrBadVerificationCode}
	cbs := w.tab.script[loopback.GitHubCallback]
	w.tab.script[loopback.GitHubCallback] = append([]func(string) (loopback.Callback, error){w.installsAll}, cbs...)
	if _, err := w.run(context.Background()); err != nil {
		t.Fatalf("Run: %v", err)
	}
	installPages := 0
	for _, p := range w.tab.shown {
		if p.Kind == PageRedirect && p.URL == providers.InstallURL(w.gh.app.Slug) {
			installPages++
		}
	}
	if installPages != 2 {
		t.Errorf("install page shown %d times, want 2", installPages)
	}
}

func TestAnOverGrantedRepositoryApprovalIsDeletedAndAskedAgain(t *testing.T) {
	w := newWorld(t)
	first := w.tab.script[loopback.GitHubCallback][:1]
	w.tab.script[loopback.GitHubCallback] = append(first, func(string) (loopback.Callback, error) {
		w.gh.installs = append(w.gh.installs, install{ID: 5550040, AppID: w.gh.app.ID, Selection: "all"})
		return loopback.Callback{Code: w.code("approve"), InstallationID: "5550040", SetupAction: "install"}, nil
	}, w.installsRepo)
	res, err := w.run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if !slices.Contains(w.log, "gh:delete:5550040") || res.Record.GitHub.InstallationID != repoInstallID {
		t.Errorf("log %v, record installation %d", w.log, res.Record.GitHub.InstallationID)
	}
}

func TestNodeMajor(t *testing.T) {
	cases := []struct {
		in   string
		want int
		ok   bool
	}{
		{"v24.1.0\n", 24, true},
		{"v22.11.0", 22, true},
		{"24.0.0", 24, true},
		{"", 0, false},
		{"node", 0, false},
	}
	for _, tc := range cases {
		got, err := nodeMajor(tc.in)
		if (err == nil) != tc.ok || got != tc.want {
			t.Errorf("nodeMajor(%q) = %d, %v", tc.in, got, err)
		}
	}
}
