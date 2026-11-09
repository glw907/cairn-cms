package setup

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

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
	_ Tab            = loopbackTab{}
	_                = Config{WriteSite: scaffold.Write, FinalizeSite: scaffold.Finalize}
)

func TestAFullRunReachesDone(t *testing.T) {
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
		if e.Kind == Resumed {
			t.Error("a new run emitted resumed")
		}
	}
	var done []string
	for _, e := range w.events {
		if e.Kind == StepDone {
			done = append(done, e.Step)
		}
	}
	wantDone := []string{StepOpeningChecks, StepApproveCloudflare, StepCloudflareChecks, StepApproveCreateApp, StepApproveInstall, StepApproveRepo,
		StepScaffold, StepProvision, StepCommit, StepDeployKey, StepPush, StepFirstDeploy, StepDomains, StepSignIn}
	if !slices.Equal(done, wantDone) {
		t.Errorf("steps done = %v, want %v", done, wantDone)
	}
	// GitHub hands a job its secrets when the job starts, so the push that starts the first
	// deploy must find the deploy key already stored.
	if !slices.Equal(w.gh.secretOnEmpty, []bool{true}) {
		t.Errorf("secret stored on an empty repository: %v, want once, before the push", w.gh.secretOnEmpty)
	}
	if !slices.ContainsFunc(w.events, func(e Event) bool { return e.Kind == SummaryKind && e.Summary != nil }) {
		t.Error("no summary event")
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
	if rec.Step != string(spine.StepLive) || rec.Setup.RunID != "run7" || rec.Setup.IDs.AppID != w.gh.app.ID ||
		rec.GitHub.InstallationID != repoInstallID || rec.GitHub.Repo.ID != w.gh.repo.ID || rec.GitHub.Repo.DefaultBranch != "main" ||
		rec.Cloudflare.AccountID != w.cf.accounts[0].ID || rec.Setup.Folder != filepath.Join(w.cfg.Dir, "example-site") ||
		rec.Setup.IDs.D1 != w.cf.d1["example-site-auth"].uuid || rec.Setup.IDs.R2Bucket != "example-site-media" ||
		rec.Setup.IDs.DeployKeyID != "tok1" || rec.Setup.IDs.WorkerTag != "tag-0001" || rec.Cloudflare.WorkerName != "example-site" {
		t.Errorf("record = %+v", rec)
	}
	if res.SiteID != w.saver.id {
		t.Errorf("site id = %q, want %q", res.SiteID, w.saver.id)
	}
	assertCreatedOnce(t, w)
	if got := remoteHead(t, w); got != rec.Setup.Commit {
		t.Errorf("remote main = %s, want the recorded commit %s", got, rec.Setup.Commit)
	}
	if got := w.gh.secrets["example-owner/example-site/"+providers.DeploySecretName]; got != w.cf.keysMinted[0].Value.Reveal() {
		t.Error("the Actions secret is not the deploy key")
	}
	if got := w.cf.secrets["example-site/"+workerKeySecret]; got == "" {
		t.Error("the Worker never got the App key")
	}
	if w.cf.attached["carin-test-5.org"] != "example-site" || w.cf.attached["www.carin-test-5.org"] != "example-site" {
		t.Errorf("custom domains = %v", w.cf.attached)
	}
	if res.Done.URL != "https://carin-test-5.org" || !res.Done.SignedIn || !res.Done.Emailed || res.Done.NoSignIn ||
		res.Done.InstallFailed || res.Done.RevokeFailed || res.Done.KeysLeft {
		t.Errorf("done = %+v", res.Done)
	}

	if left := w.vault.ofRun(); len(left) != 0 {
		t.Errorf("keyring holds %v after done, want nothing", left)
	}
	if len(w.cfAuth.revoked) != 1 || w.cfAuth.revoked[0] != w.cfAuth.tokens[0].RefreshToken {
		t.Errorf("revoked %d tokens, want the refresh token once", len(w.cfAuth.revoked))
	}
	if last, _ := w.saver.last(); last.Setup.KeysKept || len(last.Setup.KeyringEntries) != 0 {
		t.Errorf("record keeps keys %v, entries %v; want none", last.Setup.KeysKept, last.Setup.KeyringEntries)
	}
	assertRegisteredAndUnseen(t, w)
}

// assertCreatedOnce checks that each create the run makes happened exactly once across every run
// of w.
func assertCreatedOnce(t *testing.T, w *world) {
	t.Helper()
	for kind, n := range map[string]int{"app": w.gh.creates["app"], "repo": w.gh.creates["repo"],
		"d1": w.cf.creates["d1"], "r2": w.cf.creates["r2"], "email": w.cf.creates["email"], "deploy-key": w.cf.creates["deploy-key"]} {
		if n != 1 {
			t.Errorf("%s created %d times, want once", kind, n)
		}
	}
	waits := map[string]int{}
	for _, l := range w.log {
		if strings.HasPrefix(l, "wait:") {
			waits[l]++
		}
	}
	want := map[string]int{"wait:" + string(loopback.CloudflareCallback): 1, "wait:" + string(loopback.GitHubManifest): 1, "wait:" + string(loopback.GitHubCallback): 2}
	for k, n := range want {
		if waits[k] != n {
			t.Errorf("%s ran %d times, want %d", k, waits[k], n)
		}
	}
}

// pushAuth is the base64 credential a push's basic auth header carries for an installation token.
func pushAuth(c providers.Credential) string {
	return base64.StdEncoding.EncodeToString([]byte("x-access-token:" + c.Reveal()))
}

// pushed reports whether the site's remote holds a branch.
func (w *world) pushed() bool {
	_, ok := w.gh.remoteHead("example-owner", "example-site", "main")
	return ok
}

func remoteHead(t *testing.T, w *world) string {
	t.Helper()
	return gitRun(t, filepath.Join(w.gh.remotes, "example-owner", "example-site.git"), "rev-parse", "refs/heads/main")
}

// assertRegisteredAndUnseen checks that every credential the fakes issued reached the scrub and
// that no event, record, failure, or child environment carries one, nor a code, nonce, or the
// tab's key. The tab's /next answer and the email are the sign-in link's two destinations.
func assertRegisteredAndUnseen(t *testing.T, w *world) {
	t.Helper()
	tok := w.cfAuth.tokens[0]
	issued := []string{tok.AccessToken, tok.RefreshToken, w.gh.app.ClientSecret.Reveal(), w.gh.app.WebhookSecret.Reveal(), w.gh.app.PEM.Reveal()}
	for _, o := range w.cfAuth.issued {
		issued = append(issued, o.AccessToken, o.RefreshToken)
	}
	for _, c := range append(append([]providers.Credential{}, w.web.issued...), w.gh.instTokens...) {
		issued = append(issued, c.Reveal())
	}
	for _, k := range w.cf.keysMinted {
		issued = append(issued, k.Value.Reveal())
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
	if w.pushed() && !slices.ContainsFunc(w.gh.instTokens, func(c providers.Credential) bool { return slices.Contains(registered, pushAuth(c)) }) {
		t.Error("the push's base64 credential never reached the scrub on its own")
	}

	var needles []string
	for _, v := range append(issued, registered...) {
		for line := range strings.SplitSeq(v, "\n") {
			if len(line) >= 8 && !strings.HasPrefix(line, "-----") {
				needles = append(needles, line)
			}
		}
	}
	for _, c := range w.gh.instTokens {
		needles = append(needles, pushAuth(c))
	}
	needles = append(needles, w.codes...)
	needles = append(needles, w.cfAuth.verifiers...)
	for _, n := range w.tab.armed {
		needles = append(needles, n)
	}
	needles = append(needles, "one-time-tab-key", "inherited-gh-token-value", "inherited-cloudflare-token-value")

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
	if env, err := os.ReadFile(w.npmEnv); err == nil {
		hay = append(hay, string(env))
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
			w.cf.workers["example-site"] = "tag-other"
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
	w.cf.d1["example-site-auth"] = &d1{uuid: "someone-elses-database"}
	res, err := w.run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if res.Summary.Repository != "example-site-2" || res.Summary.SuffixReason == "" {
		t.Errorf("summary = %+v, want the -2 names with a reason", res.Summary)
	}
	if !slices.Contains(w.log, "gh:create:example-site-2") || !slices.Contains(w.log, "cf:create-d1:example-site-2-auth") {
		t.Errorf("log %v lacks the -2 creates", w.log)
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

// TestTheCloudflareApprovalOpensOnTheConsentPage pins that the tab shows setup's own page, with
// the permission instruction, before it sends the owner to Cloudflare.
func TestTheCloudflareApprovalOpensOnTheConsentPage(t *testing.T) {
	w := newWorld(t)
	if _, err := w.run(context.Background()); err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(w.tab.shown) == 0 || w.tab.shown[0].Kind != PageConsent {
		t.Fatalf("pages %+v, want approval 1 to open on the consent page", w.tab.shown)
	}
	u, err := url.Parse(w.tab.shown[0].URL)
	if err != nil || u.Host != "dash.cloudflare.com" || u.Query().Get("state") == "" {
		t.Errorf("the consent page continues to %q, want a Cloudflare authorize URL with state", w.tab.shown[0].URL)
	}
	if slices.ContainsFunc(w.tab.shown, func(p Page) bool { return p.Kind == PageRedirect && strings.Contains(p.URL, "dash.cloudflare.com") }) {
		t.Error("the tab was sent straight to Cloudflare")
	}
}

// TestTheCloudflareCopyNamesThePermission pins that every Cloudflare approval sentence names
// the permission Cloudflare leaves unselected.
func TestTheCloudflareCopyNamesThePermission(t *testing.T) {
	const ruled = "On the Cloudflare page, select API Tokens: Write, and then select Allow. " +
		"Cloudflare leaves API Tokens: Write unselected, and setup needs it to create your site's deploy key."
	if got := WaitSentence(WaitCloudflare, "Example Site", "example-site"); got != ruled {
		t.Errorf("WaitCloudflare sentence = %q, want %q", got, ruled)
	}
	if got := WaitSentence(WaitCloudflareReconsent, "Example Site", "example-site"); !strings.HasPrefix(got, "On the Cloudflare page, select API Tokens: Write, and then select Allow. ") {
		t.Errorf("WaitCloudflareReconsent sentence = %q, want it to open with the permission instruction", got)
	}

	w := newWorld(t)
	w.tab.script[loopback.CloudflareCallback] = []func(string) (loopback.Callback, error){
		func(nonce string) (loopback.Callback, error) {
			return loopback.Callback{State: nonce, Error: "access_denied"}, nil
		},
	}
	_, err := w.run(context.Background())
	if f := failureOf(t, err); f.Reason != ReasonDeclined || !strings.Contains(f.Do, "select API Tokens: Write, and then select Allow") {
		t.Errorf("decline failure = %+v, want a fix that names API Tokens: Write", f)
	}
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
	assertRegisteredAndUnseen(t, w)
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
			assertRegisteredAndUnseen(t, w)
		})
	}
}

func TestAResumeSweepsAnOverGrantFirst(t *testing.T) {
	cases := []struct {
		name     string
		step     spine.Step
		installs []install
		wantLeft []int64
		wantErr  error
	}{
		{"an all-repositories install is deleted", spine.StepRepoCreated,
			[]install{{ID: allInstallID, Selection: "all"}}, nil, nil},
		{"an unconfirmed install is deleted", spine.StepRepoCreated,
			[]install{{ID: repoInstallID, Selection: "selected", Repos: []int64{998877}}}, nil, nil},
		{"the confirmed install is kept", spine.StepInstalled,
			[]install{{ID: repoInstallID, Selection: "selected", Repos: []int64{998877}}, {ID: allInstallID, Selection: "all"}}, []int64{repoInstallID}, nil},
		{"the confirmed install is kept after the push", spine.StepPushed,
			[]install{{ID: repoInstallID, Selection: "selected", Repos: []int64{998877}}}, []int64{repoInstallID}, nil},
		{"a confirmed install that reaches more is deleted", spine.StepPushed,
			[]install{{ID: repoInstallID, Selection: "selected", Repos: []int64{998877, 4}}}, nil, errOverGrant},
		{"a confirmed install changed to all repositories is deleted", spine.StepPushed,
			[]install{{ID: repoInstallID, Selection: "all", Repos: []int64{998877}}}, nil, errOverGrant},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			for _, in := range tc.installs {
				in.AppID = w.gh.app.ID
				w.gh.installs = append(w.gh.installs, in)
			}
			w.vault.entries[w.vault.Entry(secrets.EntryAppKey)] = w.gh.app.PEM.Reveal()
			rec := record.Record{Step: string(tc.step)}
			rec.Setup.RunID = "run7"
			rec.Setup.IDs.AppID = w.gh.app.ID
			rec.GitHub.InstallationID = repoInstallID
			rec.GitHub.Repo.ID = 998877

			if err := sweepOnResume(context.Background(), w.cfg, rec); !errors.Is(err, tc.wantErr) {
				t.Fatalf("sweepOnResume: %v, want %v", err, tc.wantErr)
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
			if tc.wantLeft != nil && !slices.Contains(w.log, "gh:installation-repositories") {
				t.Error("the kept installation's repositories were never listed")
			}
		})
	}
}

func TestAResumeWithoutTheAppKeyGivesTheDeleteGuidance(t *testing.T) {
	w := newWorld(t)
	w.vault.putErr[secrets.EntryAppKey] = secrets.ErrKeyringUnavailable
	if _, err := w.run(context.Background()); err == nil {
		t.Fatal("the first run did not stop")
	}
	w.vault.putErr = map[secrets.EntryKind]error{}
	_, err := w.resume()
	f := failureOf(t, err)
	if f.Reason != ReasonKeyringWrite || !strings.Contains(f.Do, "https://github.com/settings/apps/"+w.gh.app.Slug) {
		t.Errorf("failure = %+v, want the delete-the-App guidance", f)
	}
	last, _ := w.saver.last()
	if last.Setup.IDs.AppID != 0 || last.Step != string(spine.StepSetupStarted) {
		t.Errorf("record App %d at %q, want the App dropped", last.Setup.IDs.AppID, last.Step)
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
				w.cf.workers[tc.cfTaken] = "tag-other"
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

func TestAnInstallExchangeThatFailsOtherwiseStops(t *testing.T) {
	w := newWorld(t)
	w.web.errs = []error{&providers.GitHubError{Status: 502, Reason: providers.ReasonUnknown}}
	_, err := w.run(context.Background())
	f := failureOf(t, err)
	if f.Reason != ReasonProvider || f.Happened != "A request to GitHub failed." || f.Do == "" {
		t.Errorf("failure = %+v, want the four-part GitHub failure", f)
	}
	if n := slices.Index(w.log, "wait:"+string(loopback.GitHubCallback)); n < 0 || strings.Count(strings.Join(w.log, " "), "wait:"+string(loopback.GitHubCallback)) != 1 {
		t.Errorf("the install page was sent again: %v", w.log)
	}
	assertRegisteredAndUnseen(t, w)
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

// killAfter cancels the run's context once step reports done, the way Ctrl+C lands between two
// steps.
func killAfter(w *world, step string) context.Context {
	ctx, cancel := context.WithCancel(context.Background())
	w.t.Cleanup(cancel)
	w.cfg.Emit = func(e Event) {
		w.events = append(w.events, e)
		if e.Kind == StepDone && e.Step == step {
			cancel()
		}
	}
	return ctx
}

// resume runs the world again from its last record, with events recorded and nothing killed.
func (w *world) resume() (Result, error) {
	w.resumeFrom()
	w.cfg.Emit = func(e Event) { w.events = append(w.events, e) }
	return w.run(context.Background())
}

func TestAKillAfterEachStepResumesWithoutRepeating(t *testing.T) {
	steps := []string{StepApproveCloudflare, StepCloudflareChecks, StepApproveCreateApp, StepApproveInstall, StepApproveRepo,
		StepScaffold, StepProvision, StepCommit, StepDeployKey, StepPush, StepFirstDeploy, StepDomains}
	for _, step := range steps {
		t.Run(step, func(t *testing.T) {
			w := newWorld(t)
			_, err := w.run(killAfter(w, step))
			if f := failureOf(t, err); f.Reason != ReasonStopped {
				t.Fatalf("reason = %s, want %s", f.Reason, ReasonStopped)
			}
			last, _ := w.saver.last()
			if !last.Setup.KeysKept || len(w.vault.ofRun()) == 0 {
				t.Errorf("after Ctrl+C: KeysKept %v, keyring %v; want the entries kept and said so", last.Setup.KeysKept, w.vault.ofRun())
			}
			if len(w.cfAuth.revoked) != 0 {
				t.Error("a stopped run revoked its grant")
			}

			res, err := w.resume()
			if err != nil {
				t.Fatalf("resume: %v", err)
			}
			if w.events[0].Kind != Resumed {
				t.Errorf("first resumed event = %+v, want resumed", w.events[0])
			}
			if res.Record.Step != string(spine.StepLive) || !res.Done.Emailed {
				t.Errorf("resumed run ended at %q, done %+v", res.Record.Step, res.Done)
			}
			assertCreatedOnce(t, w)
			if got := remoteHead(t, w); got != res.Record.Setup.Commit {
				t.Errorf("remote main = %s, want the recorded commit", got)
			}
			if left := w.vault.ofRun(); len(left) != 0 {
				t.Errorf("keyring holds %v after done", left)
			}
			assertRegisteredAndUnseen(t, w)
		})
	}
	t.Run(StepSignIn, func(t *testing.T) {
		w := newWorld(t)
		res, err := w.run(killAfter(w, StepSignIn))
		if err != nil || res.Record.Step != string(spine.StepLive) {
			t.Fatalf("a kill after the last step: %v at %q, want the run finished", err, res.Record.Step)
		}
	})
}

func TestAKillBetweenACreateAndItsRecordWrite(t *testing.T) {
	// killInCreate cancels the run while the create of kind is in flight, so the resource exists
	// and the record never got its id.
	killInCreate := func(w *world, kind string) context.Context {
		ctx, cancel := context.WithCancel(context.Background())
		t.Cleanup(cancel)
		w.cf.onCreate = func(k string) {
			if k == kind {
				cancel()
			}
		}
		return ctx
	}
	t.Run("an empty database is adopted", func(t *testing.T) {
		w := newWorld(t)
		_, err := w.run(killInCreate(w, "d1"))
		if f := failureOf(t, err); f.Reason != ReasonStopped {
			t.Fatalf("reason = %s", f.Reason)
		}
		last, _ := w.saver.last()
		if last.Setup.Intents.D1 != "example-site-auth" || last.Setup.IDs.D1 != "" {
			t.Fatalf("record intent %q, id %q; want the intent and no id", last.Setup.Intents.D1, last.Setup.IDs.D1)
		}
		w.cf.onCreate = nil
		res, err := w.resume()
		if err != nil {
			t.Fatalf("resume: %v", err)
		}
		if res.Record.Setup.IDs.D1 != w.cf.d1["example-site-auth"].uuid {
			t.Errorf("record database %q, want the adopted one", res.Record.Setup.IDs.D1)
		}
		assertCreatedOnce(t, w)
	})
	t.Run("a database that holds tables is refused", func(t *testing.T) {
		w := newWorld(t)
		_, _ = w.run(killInCreate(w, "d1"))
		w.cf.onCreate = nil
		w.cf.d1["example-site-auth"].tables = []string{"posts"}
		_, err := w.resume()
		if f := failureOf(t, err); f.Reason != ReasonNotOurs || !strings.Contains(f.Happened, "example-site-auth") {
			t.Errorf("failure = %+v, want the not-ours stop", f)
		}
	})
	t.Run("a database whose id differs from the record is refused", func(t *testing.T) {
		w := newWorld(t)
		_, _ = w.run(killAfter(w, StepProvision))
		w.cf.d1["example-site-auth"].uuid = "0a1b2c3d-4e5f-4a6b-8c7d-replaced0000"
		rec, _ := w.saver.last()
		rec.Step = string(spine.StepScaffolded)
		w.saver.saves = append(w.saver.saves, rec)
		_, err := w.resume()
		if f := failureOf(t, err); f.Reason != ReasonNotOurs {
			t.Errorf("failure = %+v, want the not-ours stop", f)
		}
		if w.cf.creates["d1"] != 1 {
			t.Errorf("database created %d times, want once", w.cf.creates["d1"])
		}
	})
	t.Run("a bucket with no recorded id is refused", func(t *testing.T) {
		w := newWorld(t)
		_, _ = w.run(killInCreate(w, "r2"))
		w.cf.onCreate = nil
		_, err := w.resume()
		if f := failureOf(t, err); f.Reason != ReasonNotOurs || !strings.Contains(f.Happened, "example-site-media") {
			t.Errorf("failure = %+v, want the not-ours stop", f)
		}
	})
}

func TestAResumeAtTheDeployKeyReplacesTheKey(t *testing.T) {
	w := newWorld(t)
	w.gh.secretErr = &providers.GitHubError{Status: 500, Reason: providers.ReasonUnknown}
	_, err := w.run(context.Background())
	f := failureOf(t, err)
	if f.Reason != ReasonProvider || f.Happened != "A request to GitHub failed." || f.Left == "" || f.Do == "" ||
		!strings.Contains(f.Did, "deploy key") {
		t.Fatalf("failure = %+v, want the four-part GitHub failure", f)
	}
	last, _ := w.saver.last()
	if last.Setup.IDs.DeployKeyID != "tok1" || last.Step != string(spine.StepCommitted) || w.pushed() {
		t.Fatalf("record key %q at %q, pushed %v; want the stop before the push", last.Setup.IDs.DeployKeyID, last.Step, w.pushed())
	}

	res, err := w.resume()
	if err != nil {
		t.Fatalf("resume: %v", err)
	}
	del := slices.Index(w.log, "cf:delete-token:tok1")
	mint := slices.Index(w.log[del+1:], "cf:create-deploy-key:run7")
	if del < 0 || mint < 0 {
		t.Errorf("log %v: want tok1 deleted before the next mint", w.log)
	}
	if _, ok := w.cf.userTokens["tok1"]; ok || len(w.cf.userTokens) != 1 || res.Record.Setup.IDs.DeployKeyID != "tok2" {
		t.Errorf("tokens left %v, record %q; want only tok2", w.cf.userTokens, res.Record.Setup.IDs.DeployKeyID)
	}
	if w.gh.secrets["example-owner/example-site/"+providers.DeploySecretName] != w.cf.keysMinted[1].Value.Reveal() {
		t.Error("the Actions secret is not the second key")
	}
	assertRegisteredAndUnseen(t, w)
}

func TestASpentGrantRerunsApprovalOneAlone(t *testing.T) {
	spend := func(w *world) {
		w.cfAuth.refreshErr = &providers.OAuthError{Status: 400, Code: "invalid_grant"}
	}
	t.Run("the reconsent continues", func(t *testing.T) {
		w := newWorld(t)
		_, _ = w.run(killAfter(w, StepProvision))
		spend(w)
		w.resumeFrom()
		w.tab.push(loopback.CloudflareCallback, w.cloudflareApproves)
		w.cfg.Emit = func(e Event) { w.events = append(w.events, e) }
		if _, err := w.run(context.Background()); err != nil {
			t.Fatalf("resume: %v", err)
		}
		if w.events[0].Kind != Resumed {
			t.Errorf("first event %+v, want resumed", w.events[0])
		}
		if got := w.waits(); !slices.Equal(got, []WaitState{WaitCloudflareReconsent}) {
			t.Errorf("waiting states = %v, want approval 1's reconsent alone", got)
		}
		if len(w.tab.shown) == 0 || w.tab.shown[0].Kind != PageConsent {
			t.Errorf("pages %+v, want the reconsent to open on the consent page", w.tab.shown)
		}
		if w.gh.creates["app"] != 1 || len(w.cfAuth.verifiers) != 2 {
			t.Errorf("apps %d, Cloudflare exchanges %d", w.gh.creates["app"], len(w.cfAuth.verifiers))
		}
	})
	t.Run("a grant without the recorded account is refused", func(t *testing.T) {
		w := newWorld(t)
		_, _ = w.run(killAfter(w, StepProvision))
		spend(w)
		w.cf.accounts = []providers.Account{{ID: "0000000000000000000000000000ex99", Name: "Another"}}
		w.resumeFrom()
		w.tab.push(loopback.CloudflareCallback, w.cloudflareApproves)
		w.cfg.Emit = func(e Event) { w.events = append(w.events, e) }
		_, err := w.run(context.Background())
		if f := failureOf(t, err); f.Reason != ReasonAccountMissing {
			t.Errorf("failure = %+v, want the account-missing stop", f)
		}
		if w.cf.creates["d1"] != 1 || w.cf.creates["deploy-key"] != 0 {
			t.Error("the refused grant reached a create")
		}
	})
}

func TestOneFailurePerProviderStopsResumably(t *testing.T) {
	t.Run("Cloudflare", func(t *testing.T) {
		w := newWorld(t)
		w.cf.createErr["r2"] = errors.New("cloudflare 500")
		_, err := w.run(context.Background())
		f := failureOf(t, err)
		if f.Reason != ReasonProvider || f.Step != StepProvision || f.Happened != "A request to Cloudflare failed." ||
			!strings.Contains(f.Did, "example-site-auth") || f.Left == "" || f.Do == "" {
			t.Fatalf("failure = %+v, want the four-part Cloudflare failure", f)
		}
		if last := w.events[len(w.events)-1]; last.Kind != StepFailed || last.Failure.Reason != ReasonProvider {
			t.Errorf("last event = %+v", last)
		}
		assertRegisteredAndUnseen(t, w)
		delete(w.cf.createErr, "r2")
		if _, err := w.resume(); err != nil {
			t.Fatalf("resume: %v", err)
		}
		assertCreatedOnce(t, w)
	})
	t.Run("npm", func(t *testing.T) {
		w := newWorld(t)
		_, _ = w.run(killAfter(w, StepCommit))
		w.fetchErr = errors.New("registry unreachable")
		before, _ := w.saver.last()
		_, err := w.resume()
		f := failureOf(t, err)
		if f.Reason != ReasonTemplate || f.Happened == "" || f.Do == "" || f.Did == nothingCreated {
			t.Fatalf("failure = %+v, want the four-part template failure", f)
		}
		if after, _ := w.saver.last(); after.Step != before.Step {
			t.Errorf("record step %q, want %q kept", after.Step, before.Step)
		}
		w.fetchErr = nil
		if _, err := w.resume(); err != nil {
			t.Fatalf("resume: %v", err)
		}
		assertCreatedOnce(t, w)
	})
}

func TestTheHTTPSWaitStopsAtFifteenMinutes(t *testing.T) {
	w := newWorld(t)
	w.siteLive = false
	start := w.clock.Now()
	_, err := w.run(context.Background())
	f := failureOf(t, err)
	if f.Reason != ReasonHTTPSTimeout || f.Step != StepDomains {
		t.Fatalf("failure = %+v, want the HTTPS timeout at the domain step", f)
	}
	if waited := w.clock.Now().Sub(start); waited < HTTPSLimit || waited > HTTPSLimit+pollEvery {
		t.Errorf("waited %v on the clock, want the 15-minute limit", waited)
	}
	if last, _ := w.saver.last(); last.Step != string(spine.StepDeployed) {
		t.Errorf("record step %q, want deployed", last.Step)
	}

	w.siteLive = true
	if _, err := w.resume(); err != nil {
		t.Fatalf("resume: %v", err)
	}
	i := slices.IndexFunc(w.events, func(e Event) bool {
		return e.Kind == StepStarted && slices.Contains([]string{StepScaffold, StepProvision, StepCommit, StepPush, StepDeployKey, StepFirstDeploy, StepDomains}, e.Step)
	})
	if i < 0 || w.events[i].Step != StepDomains {
		t.Errorf("the resume's watch began at event %d of %+v, want the domain step", i, w.events)
	}
}

func TestASummaryAddressEditIsRechecked(t *testing.T) {
	t.Run("an address in use is asked again", func(t *testing.T) {
		w := newWorld(t)
		w.cf.dns["blog.carin-test-5.org"] = []providers.DNSRecord{{Name: "blog.carin-test-5.org", Type: "A"}}
		w.view.edits = []SummaryEdit{{OwnerEmail: w.cf.email, Host: "blog.carin-test-5.org"}}
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		if !slices.Equal(w.view.problems, []string{"", problemAddress}) {
			t.Errorf("summary problems = %q, want the address refusal once", w.view.problems)
		}
		if res.Record.Setup.Address != "carin-test-5.org" {
			t.Errorf("record address %q, want the zone kept", res.Record.Setup.Address)
		}
	})
	t.Run("a free subdomain is used", func(t *testing.T) {
		w := newWorld(t)
		w.view.edits = []SummaryEdit{{OwnerEmail: "Owner@Example.test", Host: "Blog.carin-test-5.org"}}
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		if !slices.Contains(w.log, "cf:dns:blog.carin-test-5.org") || !slices.Contains(w.log, "cf:domains:blog.carin-test-5.org") {
			t.Errorf("log %v: the edited address was never checked", w.log)
		}
		if res.Record.Setup.Address != "blog.carin-test-5.org" || res.Record.Setup.OwnerEmail != "Owner@Example.test" ||
			len(w.cf.attached) != 1 || w.cf.attached["blog.carin-test-5.org"] == "" {
			t.Errorf("record %q, %q; attached %v", res.Record.Setup.Address, res.Record.Setup.OwnerEmail, w.cf.attached)
		}
		if len(w.cf.sent) != 1 || w.cf.sent[0].From != "no-reply@blog.carin-test-5.org" {
			t.Errorf("emails = %+v", w.cf.sent)
		}
	})
	t.Run("an empty email is refused", func(t *testing.T) {
		w := newWorld(t)
		w.cf.email = ""
		w.view.edits = []SummaryEdit{{OwnerEmail: "", Host: "carin-test-5.org"}, {OwnerEmail: "owner@example.test", Host: "carin-test-5.org"}}
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		if !slices.Equal(w.view.problems, []string{problemEmail, problemEmail}) || res.Record.Setup.OwnerEmail != "owner@example.test" {
			t.Errorf("summary problems = %q, email %q", w.view.problems, res.Record.Setup.OwnerEmail)
		}
	})
}

func TestTheSignInLink(t *testing.T) {
	t.Run("a link used in the tab is followed by one email", func(t *testing.T) {
		w := newWorld(t)
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		if len(w.tab.nexts) != 1 || !strings.HasPrefix(w.tab.nexts[0], "https://carin-test-5.org/admin/auth/confirm?token=") {
			t.Fatalf("tab nexts = %v, want one confirm link", w.tab.nexts)
		}
		if !res.Done.SignedIn || len(w.cf.sent) != 1 {
			t.Fatalf("done %+v, emails %d", res.Done, len(w.cf.sent))
		}
		m := w.cf.sent[0]
		if m.From != "no-reply@carin-test-5.org" || m.To != w.cf.email || strings.Contains(m.Text, w.tab.nexts[0]) {
			t.Errorf("email = %+v", m)
		}
		rows := w.cf.d1["example-site-auth"].tokens
		if len(rows) != 1 || w.cf.d1["example-site-auth"].editors[strings.ToLower(w.cf.email)] != "owner" {
			t.Errorf("token rows %v, editors %v; want the emailed row and the owner", rows, w.cf.d1["example-site-auth"].editors)
		}
		token := regexp.MustCompile(`token=([A-Za-z0-9_-]{43})`).FindStringSubmatch(m.Text)
		if token == nil {
			t.Fatal("the email carries no sign-in link")
		}
		if _, ok := rows[hashToken(token[1])]; !ok {
			t.Error("the emailed link is not the stored row")
		}
	})
	t.Run("a link that expires is followed by one email", func(t *testing.T) {
		w := newWorld(t)
		w.tab.onNext = nil
		start := w.clock.Now()
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		if res.Done.SignedIn || !res.Done.Emailed || len(w.cf.sent) != 1 || len(w.tab.nexts) != 1 {
			t.Errorf("done %+v, emails %d, nexts %d", res.Done, len(w.cf.sent), len(w.tab.nexts))
		}
		if w.clock.Now().Sub(start) < tokenTTL {
			t.Error("the run sent the email before the tab's link expired")
		}
	})
	t.Run("a link a new request swept is not a sign-in", func(t *testing.T) {
		w := newWorld(t)
		w.tab.onNext = w.ownerRequestsALink
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		if res.Done.SignedIn || !res.Done.Emailed || len(w.cf.sent) != 1 {
			t.Errorf("done %+v, emails %d; want no sign-in claimed and one email", res.Done, len(w.cf.sent))
		}
	})
	t.Run("apply sends one email at once", func(t *testing.T) {
		w := newWorld(t)
		w.cfg.Apply = true
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		if len(w.tab.nexts) != 0 || len(w.cf.sent) != 1 || res.Done.SignedIn {
			t.Errorf("nexts %v, emails %d, done %+v", w.tab.nexts, len(w.cf.sent), res.Done)
		}
	})
	t.Run("an editor table without the owner gets no token", func(t *testing.T) {
		w := newWorld(t)
		w.cf.onCreate = func(kind string) {
			if kind == "email" {
				for _, db := range w.cf.d1 {
					db.editors = map[string]string{"someone@example.test": "owner"}
				}
			}
		}
		w.cfg.Apply = true
		res, err := w.run(context.Background())
		if err != nil {
			t.Fatalf("Run: %v", err)
		}
		db := w.cf.d1["example-site-auth"]
		if !res.Done.NoSignIn || len(db.tokens) != 0 || len(w.cf.sent) != 0 || len(db.editors) != 1 {
			t.Errorf("done %+v, tokens %v, emails %d, editors %v", res.Done, db.tokens, len(w.cf.sent), db.editors)
		}
	})
	t.Run("a failed send is not a stop", func(t *testing.T) {
		w := newWorld(t)
		w.cf.sendErr = errors.New("email 500")
		res, err := w.run(context.Background())
		if err != nil || res.Done.Emailed {
			t.Errorf("Run: %v, done %+v", err, res.Done)
		}
	})
}

func TestAFailedFirstDeployIsPushedAgainOnResume(t *testing.T) {
	w := newWorld(t)
	var failed string
	w.gh.runFor = func(sha string) (providers.WorkflowRun, bool) {
		if failed == "" || sha == failed {
			failed = sha
			return providers.WorkflowRun{Status: "completed", Conclusion: "failure", URL: "https://example.test/actions/runs/1"}, true
		}
		return providers.WorkflowRun{Status: "completed", Conclusion: "success"}, true
	}
	_, err := w.run(context.Background())
	f := failureOf(t, err)
	if f.Reason != ReasonDeployFailed || !strings.Contains(f.Do, "https://example.test/actions/runs/1") {
		t.Fatalf("failure = %+v, want the deploy failure naming the run", f)
	}
	res, err := w.resume()
	if err != nil {
		t.Fatalf("resume: %v", err)
	}
	if res.Record.Setup.Commit == failed || remoteHead(t, w) != res.Record.Setup.Commit {
		t.Errorf("record commit %s, remote %s; want a new commit pushed", res.Record.Setup.Commit, remoteHead(t, w))
	}
}

// failFirstDeploy makes the deploy of the first commit it is asked about fail and a later
// commit's succeed. GitHub has no run for a commit the remote never received, so neither has
// the fake. It returns the failed commit.
func failFirstDeploy(w *world) *string {
	failed := new(string)
	w.gh.runFor = func(sha string) (providers.WorkflowRun, bool) {
		if *failed == "" || sha == *failed {
			*failed = sha
			return providers.WorkflowRun{Status: "completed", Conclusion: "failure", URL: "https://example.test/actions/runs/1"}, true
		}
		if head, _ := w.gh.remoteHead("example-owner", "example-site", "main"); head != sha {
			return providers.WorkflowRun{}, false
		}
		return providers.WorkflowRun{Status: "completed", Conclusion: "success"}, true
	}
	return failed
}

func TestARedeployStoppedMidwayResumes(t *testing.T) {
	cases := []struct {
		name string
		stop func(w *world, failed string, cancel context.CancelFunc)
		want Reason
	}{
		{"between the empty commit and its record", func(w *world, failed string, _ context.CancelFunc) {
			killed := false
			w.saver.onSave = func(r record.Record) error {
				if killed || r.Setup.Commit != failed {
					killed = true
					return errors.New("test: the run was killed")
				}
				return nil
			}
		}, ReasonRecord},
		{"between the record and the push", func(w *world, failed string, cancel context.CancelFunc) {
			w.saver.onSave = func(r record.Record) error {
				if r.Setup.Commit != failed {
					w.saver.onSave = nil
					cancel()
				}
				return nil
			}
		}, ReasonStopped},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			failed := failFirstDeploy(w)
			_, err := w.run(context.Background())
			if f := failureOf(t, err); f.Reason != ReasonDeployFailed {
				t.Fatalf("first run reason = %s, want %s", f.Reason, ReasonDeployFailed)
			}

			w.resumeFrom()
			w.cfg.Emit = func(e Event) { w.events = append(w.events, e) }
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			tc.stop(w, *failed, cancel)
			_, err = w.run(ctx)
			if f := failureOf(t, err); f.Reason != tc.want {
				t.Fatalf("stopped resume reason = %s, want %s", f.Reason, tc.want)
			}

			w.saver.onSave = nil
			res, err := w.resume()
			if err != nil {
				t.Fatalf("resume: %v", err)
			}
			if res.Record.Step != string(spine.StepLive) || remoteHead(t, w) != res.Record.Setup.Commit {
				t.Errorf("record at %q, commit %s, remote %s; want the redeploy pushed and live", res.Record.Step, res.Record.Setup.Commit, remoteHead(t, w))
			}
			if parent := gitRun(t, res.Record.Setup.Folder, "rev-parse", "HEAD^"); parent != *failed {
				t.Errorf("the redeploy's parent is %s, want the failed commit %s: one empty commit, not two", parent, *failed)
			}
		})
	}
}

func TestAResumeReinstallsAnOverGrantedInstallation(t *testing.T) {
	const reinstallID = 5550003
	cases := []struct {
		name   string
		change func(in *install)
	}{
		{"the selection changed to all repositories", func(in *install) { in.Selection = "all" }},
		{"an extra repository was added", func(in *install) { in.Repos = append(in.Repos, 4) }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			if _, err := w.run(killAfter(w, StepPush)); err == nil {
				t.Fatal("the first run was not stopped")
			}
			for i := range w.gh.installs {
				if w.gh.installs[i].ID == repoInstallID {
					tc.change(&w.gh.installs[i])
				}
			}
			w.resumeFrom()
			w.tab.push(loopback.GitHubCallback, func(string) (loopback.Callback, error) {
				w.gh.installs = append(w.gh.installs, install{ID: reinstallID, AppID: w.gh.app.ID, Selection: "selected", Repos: []int64{w.gh.repo.ID}})
				return loopback.Callback{Code: w.code("approve"), InstallationID: strconv.Itoa(reinstallID), SetupAction: "install"}, nil
			})
			w.cfg.Emit = func(e Event) { w.events = append(w.events, e) }
			before := len(w.saver.saves)
			res, err := w.run(context.Background())
			if err != nil {
				t.Fatalf("resume: %v", err)
			}
			ours := w.gh.ours()
			if len(ours) != 1 || ours[0].ID != reinstallID || ours[0].Selection != "selected" || !slices.Equal(ours[0].Repos, []int64{w.gh.repo.ID}) {
				t.Errorf("our installations = %+v, want only the new one on the site's repository", ours)
			}
			if res.Record.Step != string(spine.StepLive) || res.Record.GitHub.InstallationID != reinstallID {
				t.Errorf("record at %q, installation %d", res.Record.Step, res.Record.GitHub.InstallationID)
			}
			for _, r := range w.saver.saves[before:] {
				if !reached(r.Step, spine.StepPushed) {
					t.Fatalf("a save moved the record back to %q", r.Step)
				}
			}
			if w.cf.creates["d1"] != 1 || w.gh.creates["repo"] != 1 || len(w.view.opened) != 1 {
				t.Errorf("databases %d, repositories %d, browser opened %d; want the reinstall alone", w.cf.creates["d1"], w.gh.creates["repo"], len(w.view.opened))
			}
			assertRegisteredAndUnseen(t, w)
		})
	}
}

// TestTheGrantStaysFreshThroughTheFirstDeploy starts the first deploy 44 minutes after the
// grant, under the step-start refresh, and lets the deploy run 20 minutes, past the access
// token's hour.
func TestTheGrantStaysFreshThroughTheFirstDeploy(t *testing.T) {
	w := newWorld(t)
	var started time.Time
	w.cfg.Emit = func(e Event) {
		w.events = append(w.events, e)
		if e.Kind == StepStarted && e.Step == StepFirstDeploy {
			<-w.clock.After(44 * time.Minute)
			started = w.clock.Now()
		}
	}
	w.gh.runFor = func(string) (providers.WorkflowRun, bool) {
		if w.clock.Now().Sub(started) < 20*time.Minute {
			return providers.WorkflowRun{Status: "in_progress"}, true
		}
		return providers.WorkflowRun{Status: "completed", Conclusion: "success"}, true
	}
	res, err := w.run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if w.cf.secrets["example-site/"+workerKeySecret] == "" || res.Record.Step != string(spine.StepLive) {
		t.Errorf("the Worker secret is unset, record at %q", res.Record.Step)
	}
}

func TestAResumePastTheFirstDeployInstallsTheDependencies(t *testing.T) {
	for _, step := range []string{StepFirstDeploy, StepDomains} {
		t.Run(step, func(t *testing.T) {
			w := newWorld(t)
			failNPM(t, w)
			if _, err := w.run(killAfter(w, step)); err == nil {
				t.Fatal("the first run was not stopped")
			}
			if err := os.Remove(w.npmEnv); err != nil && !os.IsNotExist(err) {
				t.Fatal(err)
			}
			res, err := w.resume()
			if err != nil {
				t.Fatalf("resume: %v", err)
			}
			if _, err := os.Stat(w.npmEnv); err != nil || !res.Done.InstallFailed {
				t.Errorf("npm ran on the resume: %v; done %+v; want the install run and its failure reported", err == nil, res.Done)
			}
		})
	}
}

func TestAKillAfterTheRepositoryCreate(t *testing.T) {
	// killInCreate stops the run once GitHub has made the repository and before the record holds
	// its id, which leaves the name as an intent.
	killInCreate := func(w *world) {
		ctx, cancel := context.WithCancel(context.Background())
		t.Cleanup(cancel)
		w.gh.afterCreate = func() {
			w.gh.afterCreate = nil
			cancel()
		}
		_, err := w.run(ctx)
		if f := failureOf(t, err); f.Reason != ReasonStopped {
			t.Fatalf("reason = %s, want %s", f.Reason, ReasonStopped)
		}
		last, _ := w.saver.last()
		if last.Setup.Intents.Repo != "example-site" || last.GitHub.Repo.ID != 0 {
			t.Fatalf("record intent %q, id %d; want the intent and no id", last.Setup.Intents.Repo, last.GitHub.Repo.ID)
		}
	}
	t.Run("an empty repository is adopted", func(t *testing.T) {
		w := newWorld(t)
		killInCreate(w)
		res, err := w.resume()
		if err != nil {
			t.Fatalf("resume: %v", err)
		}
		if res.Record.GitHub.Repo.Repo != "example-site" || res.Record.GitHub.Repo.ID != w.gh.repo.ID || res.Summary.SuffixReason != "" {
			t.Errorf("record repository %+v, suffix reason %q; want the adopted one", res.Record.GitHub.Repo, res.Summary.SuffixReason)
		}
		if !slices.Contains(w.log, "gh:repo:example-owner/example-site") {
			t.Errorf("log %v never read the repository by name", w.log)
		}
		if w.gh.creates["repo"] != 1 || w.gh.creates["app"] != 1 || w.cf.creates["d1"] != 1 {
			t.Errorf("repositories %d, Apps %d, databases %d; want one each", w.gh.creates["repo"], w.gh.creates["app"], w.cf.creates["d1"])
		}
	})
	refused := []struct {
		name  string
		setup func(w *world)
	}{
		{"a repository with commits is refused", func(w *world) {
			dir := t.TempDir()
			gitRun(t, dir, "init", "--quiet", "-b", "main")
			gitRun(t, dir, "commit", "--quiet", "--allow-empty", "-m", "someone else's work")
			gitRun(t, dir, "push", "--quiet", filepath.Join(w.gh.remotes, "example-owner", "example-site.git"), "HEAD:refs/heads/main")
		}},
		{"a repository another account owns is refused", func(w *world) { w.gh.ownerOf["example-site"] = "someone-else" }},
	}
	for _, tc := range refused {
		t.Run(tc.name, func(t *testing.T) {
			w := newWorld(t)
			killInCreate(w)
			tc.setup(w)
			_, err := w.resume()
			f := failureOf(t, err)
			if f.Reason != ReasonNotOurs || !strings.Contains(f.Happened, "example-site") || f.Do == "" {
				t.Errorf("failure = %+v, want the not-ours stop naming the repository", f)
			}
			if w.gh.creates["repo"] != 1 {
				t.Errorf("repositories created %d, want the one, with no suffixed repository left behind", w.gh.creates["repo"])
			}
		})
	}
}

// TestTheTableReadMatchesNoNameByWildcard holds the empty-database read to exact prefixes: in a
// LIKE pattern "_" matches any one character, so 'sqlite_%' or '_cf_%' would also hide a table
// the site made and report a database empty.
func TestTheTableReadMatchesNoNameByWildcard(t *testing.T) {
	if regexp.MustCompile(`(?i)LIKE\s+'[^']*_`).MatchString(sqlTables) {
		t.Errorf("sqlTables = %q, want no LIKE pattern holding a \"_\"", sqlTables)
	}
}

func TestChildOutputNeverReachesTheTerminal(t *testing.T) {
	w := newWorld(t)
	outR, outW, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	errR, errW, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	stdout, stderr := os.Stdout, os.Stderr
	os.Stdout, os.Stderr = outW, errW
	_, runErr := w.run(context.Background())
	os.Stdout, os.Stderr = stdout, stderr
	_ = outW.Close()
	_ = errW.Close()
	printed, _ := io.ReadAll(io.MultiReader(outR, errR))
	if runErr != nil {
		t.Fatalf("Run: %v", runErr)
	}
	if len(printed) != 0 {
		t.Errorf("the run printed %q", printed)
	}
	env, err := os.ReadFile(w.npmEnv)
	if err != nil {
		t.Fatalf("npm never ran: %v", err)
	}
	if strings.Contains(string(env), "GH_TOKEN") || strings.Contains(string(env), "CLOUDFLARE_API_TOKEN") {
		t.Error("npm inherited a token variable")
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
