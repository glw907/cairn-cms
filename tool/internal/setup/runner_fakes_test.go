package setup

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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
)

// The fakes below decode their data from the recorded corpus and keep one shared call log, so a
// test can assert order across providers. Every fallible call has an error field.

func fixture[T any](t *testing.T, provider, name string) T {
	t.Helper()
	_, body, err := providers.Corpus(provider, name)
	if err != nil {
		t.Fatalf("read fixture %s/%s: %v", provider, name, err)
	}
	var v T
	if err := json.Unmarshal(body, &v); err != nil {
		t.Fatalf("decode fixture %s/%s: %v", provider, name, err)
	}
	return v
}

func cfResult[T any](t *testing.T, name string) T {
	t.Helper()
	return fixture[struct {
		Result T `json:"result"`
	}](t, "cloudflare", name).Result
}

// fakeTab scripts each callback route's waits. A scripted step receives the nonce the route was
// armed with.
type fakeTab struct {
	armed  map[loopback.Route]string
	arms   int
	shown  []Page
	script map[loopback.Route][]func(nonce string) (loopback.Callback, error)
	closed bool
	log    *[]string
}

const tabURL = "http://127.0.0.1:49152/?k=one-time-tab-key"

func (f *fakeTab) URL() string { return tabURL }

func (f *fakeTab) Arm(r loopback.Route) (string, error) {
	f.arms++
	n := fmt.Sprintf("nonce%02dabcdef0123456789", f.arms)
	f.armed[r] = n
	return n, nil
}

func (f *fakeTab) Wait(ctx context.Context, r loopback.Route) (loopback.Callback, error) {
	if err := ctx.Err(); err != nil {
		return loopback.Callback{}, err
	}
	q := f.script[r]
	if len(q) == 0 {
		return loopback.Callback{}, errors.New("test: no callback scripted for " + string(r))
	}
	f.script[r] = q[1:]
	*f.log = append(*f.log, "wait:"+string(r))
	return q[0](f.armed[r])
}

func (f *fakeTab) Show(p Page) error {
	f.shown = append(f.shown, p)
	return nil
}

func (f *fakeTab) Close() error {
	f.closed = true
	return nil
}

func (f *fakeTab) push(r loopback.Route, step func(nonce string) (loopback.Callback, error)) {
	f.script[r] = append(f.script[r], step)
}

type fakeCFAuth struct {
	tokens    []providers.OAuthToken
	err       error
	verifiers []string
}

func (f *fakeCFAuth) Exchange(_ context.Context, code, verifier string) (*providers.OAuthToken, error) {
	f.verifiers = append(f.verifiers, verifier)
	if f.err != nil {
		return nil, f.err
	}
	tok := f.tokens[0]
	if len(f.tokens) > 1 {
		f.tokens = f.tokens[1:]
	}
	return &tok, nil
}

type fakeCF struct {
	accounts []providers.Account
	email    string
	active   []providers.Zone
	all      []providers.Zone
	subs     []providers.Subscription
	subsOK   bool
	workers  map[string]bool
	d1       map[string]bool
	r2       map[string]bool
	dns      map[string][]providers.DNSRecord
	domains  map[string][]providers.WorkerDomain
	routes   []providers.WorkerRoute
	err      error
	bound    []string
	log      *[]string
}

type cfClient struct {
	f       *fakeCF
	account string
	t       *testing.T
}

func (c cfClient) note(call string) error {
	*c.f.log = append(*c.f.log, "cf:"+call)
	return c.f.err
}

func (c cfClient) needAccount() {
	if c.account == "" {
		c.t.Error("an account-scoped Cloudflare call ran on a client bound to no account")
	}
}

func (c cfClient) Accounts(context.Context) ([]providers.Account, error) {
	return c.f.accounts, c.note("accounts")
}

func (c cfClient) UserEmail(context.Context) (string, error) {
	return c.f.email, c.note("user")
}

func (c cfClient) ActiveZones(context.Context) ([]providers.Zone, error) {
	c.needAccount()
	return c.f.active, c.note("active-zones")
}

func (c cfClient) ListZones(context.Context) ([]providers.Zone, error) {
	return c.f.all, c.note("zones")
}

func (c cfClient) Subscriptions(context.Context) ([]providers.Subscription, bool, error) {
	c.needAccount()
	return c.f.subs, c.f.subsOK, c.note("subscriptions")
}

func (c cfClient) WorkerExists(_ context.Context, name string) (bool, error) {
	c.needAccount()
	return c.f.workers[name], c.note("worker:" + name)
}

func (c cfClient) D1DatabaseNamed(_ context.Context, name string) (*providers.D1Database, error) {
	c.needAccount()
	err := c.note("d1:" + name)
	if c.f.d1[name] {
		return &providers.D1Database{UUID: "uuid-" + name, Name: name}, err
	}
	return nil, err
}

func (c cfClient) R2BucketNamed(_ context.Context, name string) (*providers.R2Bucket, error) {
	c.needAccount()
	err := c.note("r2:" + name)
	if c.f.r2[name] {
		return &providers.R2Bucket{Name: name}, err
	}
	return nil, err
}

func (c cfClient) DNSRecordsNamed(_ context.Context, _, name string) ([]providers.DNSRecord, error) {
	return c.f.dns[name], c.note("dns:" + name)
}

func (c cfClient) WorkerDomainsFor(_ context.Context, hostname string) ([]providers.WorkerDomain, error) {
	c.needAccount()
	return c.f.domains[hostname], c.note("domains:" + hostname)
}

func (c cfClient) WorkerRoutes(_ context.Context, zoneID string) ([]providers.WorkerRoute, error) {
	return c.f.routes, c.note("routes:" + zoneID)
}

type install struct {
	ID        int64
	AppID     int64
	Selection string
	Repos     []int64
}

type fakeGH struct {
	t          *testing.T
	app        providers.AppRecord
	repo       providers.Repository
	convertErr error
	deleteErr  error
	taken      map[string]bool
	installs   []install
	writes     int
	onCreate   func()
	log        *[]string
}

type ghClient struct {
	f    *fakeGH
	cred providers.Credential
}

func isJWT(c providers.Credential) bool {
	v := c.Reveal()
	return strings.HasPrefix(v, "eyJ") && strings.Count(v, ".") == 2
}

func (c ghClient) note(call string) { *c.f.log = append(*c.f.log, "gh:"+call) }

func (c ghClient) ConvertManifest(_ context.Context, code string) (providers.AppRecord, error) {
	c.note("convert")
	c.f.writes++
	if c.f.convertErr != nil {
		return providers.AppRecord{}, c.f.convertErr
	}
	return c.f.app, nil
}

func (c ghClient) CreateRepo(ctx context.Context, name string) (providers.Repository, error) {
	c.note("create:" + name)
	if isJWT(c.cred) || c.cred.Reveal() == "" {
		c.f.t.Error("CreateRepo ran without the user token")
	}
	c.f.writes++
	if c.f.onCreate != nil {
		c.f.onCreate()
		if err := ctx.Err(); err != nil {
			return providers.Repository{}, err
		}
	}
	if c.f.taken[name] {
		return providers.Repository{}, fmt.Errorf("test 422: %w", providers.ErrRepoNameTaken)
	}
	r := c.f.repo
	r.Name = name
	r.FullName = r.Owner.Login + "/" + name
	return r, nil
}

func (c ghClient) AppInstallations(context.Context) ([]providers.Installation, error) {
	c.note("list")
	if !isJWT(c.cred) {
		c.f.t.Error("AppInstallations ran without the App JWT")
	}
	var out []providers.Installation
	for _, in := range c.f.installs {
		out = append(out, providers.Installation{ID: in.ID, AppID: in.AppID, RepositorySelection: in.Selection})
	}
	return out, nil
}

func (c ghClient) DeleteInstallation(_ context.Context, id int64) error {
	c.note("delete:" + strconv.FormatInt(id, 10))
	if !isJWT(c.cred) {
		c.f.t.Error("DeleteInstallation ran without the App JWT")
	}
	c.f.writes++
	if c.f.deleteErr != nil {
		return c.f.deleteErr
	}
	c.f.installs = slices.DeleteFunc(c.f.installs, func(in install) bool { return in.ID == id })
	return nil
}

func (c ghClient) ReadBackInstallation(_ context.Context, appID, repoID int64) (providers.ReadBack, error) {
	c.note("readback")
	if isJWT(c.cred) || c.cred.Reveal() == "" {
		c.f.t.Error("ReadBackInstallation ran without the user token")
	}
	for _, in := range c.f.installs {
		if in.AppID != appID {
			continue
		}
		rb := providers.ReadBack{InstallationID: in.ID, Selection: in.Selection}
		if in.Selection != "selected" {
			rb.Status = providers.ReadBackOverGrant
			return rb, nil
		}
		rb.RepoIDs = in.Repos
		if len(in.Repos) != 1 || in.Repos[0] != repoID {
			rb.Status = providers.ReadBackOverGrant
		}
		return rb, nil
	}
	return providers.ReadBack{}, providers.ErrInstallationNotFound
}

// ours reports the installations of the App under test that are still present.
func (f *fakeGH) ours() []install {
	var out []install
	for _, in := range f.installs {
		if in.AppID == f.app.ID {
			out = append(out, in)
		}
	}
	return out
}

type fakeWeb struct {
	errs   []error
	issued []providers.Credential
	n      int
}

func (f *fakeWeb) ExchangeCode(context.Context, string, providers.Credential, string, string) (providers.Credential, error) {
	if len(f.errs) > 0 {
		err := f.errs[0]
		f.errs = f.errs[1:]
		if err != nil {
			return providers.Credential{}, err
		}
	}
	f.n++
	// Built at run time: a token-shaped literal does not belong in source.
	tok := providers.NewCredential("gh" + "u_" + strings.Repeat(strconv.Itoa(f.n), 36))
	f.issued = append(f.issued, tok)
	return tok, nil
}

type fakeVault struct {
	t        *testing.T
	runID    string
	entries  map[string]string
	probeErr error
	putErr   map[secrets.EntryKind]error
	puts     int
	saver    *fakeSaver
}

func (v *fakeVault) Probe(time.Duration) error { return v.probeErr }

func (v *fakeVault) Entry(kind secrets.EntryKind) string {
	return secrets.SetupEntryPrefix + v.runID + "/" + string(kind)
}

func (v *fakeVault) Put(kind secrets.EntryKind, value string) error {
	v.puts++
	name := v.Entry(kind)
	last, ok := v.saver.last()
	if !ok || !slices.Contains(last.Setup.KeyringEntries, name) {
		v.t.Errorf("keyring entry %s written before the record named it", name)
	}
	if err := v.putErr[kind]; err != nil {
		return err
	}
	v.entries[name] = value
	return nil
}

func (v *fakeVault) PutPair(p secrets.OAuthPair) error {
	if err := v.Put(secrets.EntryCloudflareRefresh, p.Refresh); err != nil {
		return err
	}
	return v.Put(secrets.EntryCloudflareAccess, p.Access)
}

func (v *fakeVault) Value(kind secrets.EntryKind) (string, error) {
	val, ok := v.entries[v.Entry(kind)]
	if !ok {
		return "", secrets.ErrNotFound
	}
	return val, nil
}

type fakeSaver struct {
	saves []record.Record
	id    string
	err   error
}

func (s *fakeSaver) SaveNew(slug string, r record.Record) (string, error) {
	if s.err != nil {
		return "", s.err
	}
	s.id = slug + "-a1b2c3"
	s.saves = append(s.saves, r)
	return s.id, nil
}

func (s *fakeSaver) Save(id string, r record.Record) error {
	if s.err != nil {
		return s.err
	}
	if id != s.id {
		return fmt.Errorf("test: save to %s, want %s", id, s.id)
	}
	s.saves = append(s.saves, r)
	return nil
}

func (s *fakeSaver) last() (record.Record, bool) {
	if len(s.saves) == 0 {
		return record.Record{}, false
	}
	return s.saves[len(s.saves)-1], true
}

type fakeView struct {
	theme, account, zone          string
	themeAsks, accountAsks, zones int
	opened                        []string
}

func (v *fakeView) ChooseTheme(_ context.Context, themes []scaffold.Theme) (string, error) {
	v.themeAsks++
	return v.theme, nil
}

func (v *fakeView) ChooseAccount(_ context.Context, accounts []providers.Account) (string, error) {
	v.accountAsks++
	return v.account, nil
}

func (v *fakeView) ChooseZone(_ context.Context, zones []providers.Zone) (string, error) {
	v.zones++
	return v.zone, nil
}

func (v *fakeView) OpenBrowser(_ context.Context, url string) error {
	v.opened = append(v.opened, url)
	return nil
}

// world is one run's fakes, set up for the happy path: one account, one active zone, Workers
// Paid present, no names taken, and an owner who approves each request once.
type world struct {
	t          *testing.T
	log        []string
	tab        *fakeTab
	cfAuth     *fakeCFAuth
	cf         *fakeCF
	gh         *fakeGH
	web        *fakeWeb
	vault      *fakeVault
	saver      *fakeSaver
	view       *fakeView
	registered []providers.Credential
	events     []Event
	codes      []string
	listenErr  error
	gitErr     error
	node       string
	nodeErr    error
	template   Template
	fetchErr   error
	cfg        Config
}

const foreignAppID = 15368

func newWorld(t *testing.T) *world {
	t.Helper()
	w := &world{t: t, node: "v24.1.0"}
	w.tab = &fakeTab{armed: map[loopback.Route]string{}, script: map[loopback.Route][]func(string) (loopback.Callback, error){}, log: &w.log}
	tok := fixture[providers.OAuthToken](t, "cloudflare", "oauth_token.success.200.json")
	w.cfAuth = &fakeCFAuth{tokens: []providers.OAuthToken{tok}}
	zones := cfResult[[]providers.Zone](t, "zones.list.200.json")
	user := cfResult[struct {
		Email string `json:"email"`
	}](t, "user.get.200.json")
	w.cf = &fakeCF{
		accounts: cfResult[[]providers.Account](t, "accounts.list.200.json"),
		email:    user.Email,
		active:   zones[:1],
		all:      zones[:1],
		subs:     cfResult[[]providers.Subscription](t, "account_subscriptions.list.200.json"),
		subsOK:   true,
		workers:  map[string]bool{},
		d1:       map[string]bool{},
		r2:       map[string]bool{},
		dns:      map[string][]providers.DNSRecord{},
		domains:  map[string][]providers.WorkerDomain{},
		routes:   cfResult[[]providers.WorkerRoute](t, "zone_workers_routes.list.200.json"),
		log:      &w.log,
	}
	conv := fixture[struct {
		ID           int64  `json:"id"`
		Slug         string `json:"slug"`
		ClientID     string `json:"client_id"`
		ClientSecret string `json:"client_secret"`
		Webhook      string `json:"webhook_secret"`
		PEM          string `json:"pem"`
		Owner        struct {
			Login string `json:"login"`
		} `json:"owner"`
	}](t, "github", "app_manifest_conversion.success.201.json")
	w.gh = &fakeGH{
		t: t,
		app: providers.AppRecord{
			ID: conv.ID, Slug: conv.Slug, ClientID: conv.ClientID,
			ClientSecret:  providers.NewCredential(conv.ClientSecret),
			WebhookSecret: providers.NewCredential(conv.Webhook),
			PEM:           providers.NewCredential(conv.PEM),
			OwnerLogin:    conv.Owner.Login,
		},
		repo:     fixture[providers.Repository](t, "github", "repo_create.success.201.json"),
		taken:    map[string]bool{},
		installs: []install{{ID: 5550001, AppID: foreignAppID, Selection: "all"}},
		log:      &w.log,
	}
	w.web = &fakeWeb{}
	w.saver = &fakeSaver{}
	w.vault = &fakeVault{t: t, runID: "run7", entries: map[string]string{}, putErr: map[secrets.EntryKind]error{}, saver: w.saver}
	w.view = &fakeView{}
	w.template = Template{Version: "1.0.0", Integrity: "sha512-abc", Themes: []scaffold.Theme{{ID: "waymark", Name: "Waymark", Description: "An intentionally neutral look that's easy to edit."}}}

	w.tab.push(loopback.CloudflareCallback, w.cloudflareApproves)
	w.tab.push(loopback.GitHubManifest, w.manifestApproves)
	w.tab.push(loopback.GitHubCallback, w.installsAll)
	w.tab.push(loopback.GitHubCallback, w.installsRepo)

	w.cfg = Config{
		Answers: Answers{SiteName: "Example Site", Posture: Decline},
		RunID:   "run7",
		Dir:     t.TempDir(),
		GOOS:    "linux",
		Env:     map[string]string{"DISPLAY": ":0"},
		Git:     func(context.Context) error { return w.gitErr },
		NodeVersion: func(context.Context) (string, error) {
			return w.node, w.nodeErr
		},
		FetchTemplate: func(context.Context) (Template, error) { return w.template, w.fetchErr },
		Listen: func(loopback.Config) (Tab, error) {
			if w.listenErr != nil {
				return nil, w.listenErr
			}
			return w.tab, nil
		},
		Vault:           w.vault,
		Store:           w.saver,
		CloudflareOAuth: w.cfAuth,
		Cloudflare: func(accountID string, token providers.Credential) CloudflareAPI {
			w.cf.bound = append(w.cf.bound, accountID)
			return cfClient{f: w.cf, account: accountID, t: t}
		},
		GitHub:    func(cred providers.Credential) GitHubAPI { return ghClient{f: w.gh, cred: cred} },
		GitHubWeb: w.web,
		View:      w.view,
		Register:  func(c providers.Credential) { w.registered = append(w.registered, c) },
		Emit:      func(e Event) { w.events = append(w.events, e) },
		Now:       func() time.Time { return time.Date(2026, 11, 8, 12, 0, 0, 0, time.UTC) },
	}
	return w
}

func (w *world) code(prefix string) string {
	c := prefix + "code" + strconv.Itoa(len(w.codes)) + "xyz123"
	w.codes = append(w.codes, c)
	return c
}

func (w *world) cloudflareApproves(nonce string) (loopback.Callback, error) {
	return loopback.Callback{Code: w.code("cf"), State: nonce}, nil
}

func (w *world) manifestApproves(nonce string) (loopback.Callback, error) {
	return loopback.Callback{Code: w.code("manifest"), State: nonce}, nil
}

const allInstallID = 5550010

// installsAll is the owner approving the all-repositories install.
func (w *world) installsAll(string) (loopback.Callback, error) {
	w.gh.installs = append(w.gh.installs, install{ID: allInstallID, AppID: w.gh.app.ID, Selection: "all"})
	return loopback.Callback{Code: w.code("install"), InstallationID: strconv.Itoa(allInstallID), SetupAction: "install"}, nil
}

const repoInstallID = 5550002

// installsRepo is the owner approving the install preselected to the new repository.
func (w *world) installsRepo(string) (loopback.Callback, error) {
	w.gh.installs = append(w.gh.installs, install{ID: repoInstallID, AppID: w.gh.app.ID, Selection: "selected", Repos: []int64{w.gh.repo.ID}})
	return loopback.Callback{Code: w.code("approve"), InstallationID: strconv.Itoa(repoInstallID), SetupAction: "install"}, nil
}

func (w *world) run(ctx context.Context) (Result, error) {
	return Run(ctx, w.cfg)
}

func (w *world) waits() []WaitState {
	var out []WaitState
	for _, e := range w.events {
		if e.Kind == Waiting {
			out = append(out, e.Waiting)
		}
	}
	return out
}

func failureOf(t *testing.T, err error) *Failure {
	t.Helper()
	var f *Failure
	if !errors.As(err, &f) {
		t.Fatalf("Run error = %v, want a *Failure", err)
	}
	return f
}
