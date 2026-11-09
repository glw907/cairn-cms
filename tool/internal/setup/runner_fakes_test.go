package setup

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

// The fakes below decode their data from the recorded corpus and keep one shared call log, so a
// test can assert order across providers. Every fallible call has an error field, and every
// call made after the run's context ends fails the way a real client would. The site folder
// and the GitHub remote are real git repositories, so the push, the ownership checks, and the
// remote ref the fakes report are git's own.

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

// clock is a fake clock: every wait returns at once and moves the time forward by its length.
type clock struct {
	mu  sync.Mutex
	now time.Time
}

func (c *clock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *clock) After(d time.Duration) <-chan time.Time {
	c.mu.Lock()
	c.now = c.now.Add(d)
	now := c.now
	c.mu.Unlock()
	ch := make(chan time.Time, 1)
	ch <- now
	return ch
}

// fakeTab scripts each callback route's waits. A scripted step receives the nonce the route was
// armed with.
type fakeTab struct {
	armed  map[loopback.Route]string
	arms   int
	shown  []Page
	script map[loopback.Route][]func(nonce string) (loopback.Callback, error)
	nexts  []string
	onNext func(url string)
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

func (f *fakeTab) SetNext(url string) error {
	f.nexts = append(f.nexts, url)
	if f.onNext != nil {
		f.onNext(url)
	}
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
	clock      *clock
	tokens     []providers.OAuthToken
	err        error
	refreshErr error
	revokeErr  error
	verifiers  []string
	issued     []providers.OAuthToken
	refreshes  []string
	revoked    []string
	// issuedAt is when each access token was issued, so the Cloudflare fake refuses one past its
	// hour the way Cloudflare does.
	issuedAt map[string]time.Time
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
	f.issued = append(f.issued, tok)
	f.issuedAt[tok.AccessToken] = f.clock.Now()
	return &tok, nil
}

func (f *fakeCFAuth) Refresh(ctx context.Context, refreshToken string) (*providers.OAuthToken, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	f.refreshes = append(f.refreshes, refreshToken)
	if f.refreshErr != nil {
		return nil, f.refreshErr
	}
	n := strconv.Itoa(len(f.refreshes))
	tok := providers.OAuthToken{
		AccessToken:  "ACCESS_TOKEN_PLACEHOLDER-refreshed-" + n,
		RefreshToken: "REFRESH_TOKEN_PLACEHOLDER-refreshed-" + n,
		Scope:        providers.CloudflareScopes,
	}
	f.issued = append(f.issued, tok)
	f.issuedAt[tok.AccessToken] = f.clock.Now()
	return &tok, nil
}

func (f *fakeCFAuth) Revoke(_ context.Context, token string) error {
	f.revoked = append(f.revoked, token)
	return f.revokeErr
}

// d1 is one fake database: its tables, the auth rows the sign-in batch writes, and the sessions
// the engine's confirm leaves.
type d1 struct {
	uuid     string
	tables   []string
	editors  map[string]string
	tokens   map[string]tokenRow
	sessions []sessionRow
}

type sessionRow struct {
	email   string
	created int64
}

type tokenRow struct {
	email   string
	expires int64
}

type fakeCF struct {
	clock    *clock
	auth     *fakeCFAuth
	accounts []providers.Account
	email    string
	active   []providers.Zone
	all      []providers.Zone
	workers  map[string]string
	d1       map[string]*d1
	r2       map[string]bool
	dns      map[string][]providers.DNSRecord
	domains  map[string][]providers.WorkerDomain
	routes   []providers.WorkerRoute
	err      error
	bound    []string
	log      *[]string

	creates    map[string]int
	createErr  map[string]error
	onCreate   func(kind string)
	emailSubs  map[string]bool
	userTokens map[string]string
	keysMinted []providers.DeployKey
	secrets    map[string]string
	attached   map[string]string
	sent       []providers.EmailMessage
	sendErr    error
}

type cfClient struct {
	f       *fakeCF
	account string
	token   string
	t       *testing.T
}

// note logs call and fails it the way the client would: on an ended context, on the test's
// error, or with Cloudflare's 401 for an access token past its hour.
func (c cfClient) note(ctx context.Context, call string) error {
	*c.f.log = append(*c.f.log, "cf:"+call)
	if err := ctx.Err(); err != nil {
		return err
	}
	if at, ok := c.f.auth.issuedAt[c.token]; ok && c.f.clock.Now().Sub(at) >= time.Hour {
		return &providers.APIError{Status: 401, Code: 10000, Reason: providers.ReasonUnauthorized}
	}
	return c.f.err
}

func (c cfClient) needAccount() {
	if c.account == "" {
		c.t.Error("an account-scoped Cloudflare call ran on a client bound to no account")
	}
}

func (c cfClient) Accounts(ctx context.Context) ([]providers.Account, error) {
	return c.f.accounts, c.note(ctx, "accounts")
}

func (c cfClient) UserEmail(ctx context.Context) (string, error) {
	return c.f.email, c.note(ctx, "user")
}

func (c cfClient) ActiveZones(ctx context.Context) ([]providers.Zone, error) {
	c.needAccount()
	return c.f.active, c.note(ctx, "active-zones")
}

func (c cfClient) ListZones(ctx context.Context) ([]providers.Zone, error) {
	return c.f.all, c.note(ctx, "zones")
}

func (c cfClient) Subscriptions(ctx context.Context) ([]providers.Subscription, bool, error) {
	c.needAccount()
	return nil, false, c.note(ctx, "subscriptions")
}

func (c cfClient) WorkerExists(ctx context.Context, name string) (bool, error) {
	c.needAccount()
	_, ok := c.f.workers[name]
	return ok, c.note(ctx, "worker:"+name)
}

func (c cfClient) ListWorkers(ctx context.Context) ([]providers.Worker, error) {
	c.needAccount()
	if err := c.note(ctx, "workers"); err != nil {
		return nil, err
	}
	var out []providers.Worker
	for name, tag := range c.f.workers {
		out = append(out, providers.Worker{Name: name, Tag: tag})
	}
	return out, nil
}

func (c cfClient) D1DatabaseNamed(ctx context.Context, name string) (*providers.D1Database, error) {
	c.needAccount()
	err := c.note(ctx, "d1:"+name)
	if db, ok := c.f.d1[name]; ok {
		return &providers.D1Database{UUID: db.uuid, Name: name}, err
	}
	return nil, err
}

func (c cfClient) R2BucketNamed(ctx context.Context, name string) (*providers.R2Bucket, error) {
	c.needAccount()
	err := c.note(ctx, "r2:"+name)
	if c.f.r2[name] {
		return &providers.R2Bucket{Name: name}, err
	}
	return nil, err
}

func (c cfClient) DNSRecordsNamed(ctx context.Context, _, name string) ([]providers.DNSRecord, error) {
	return c.f.dns[name], c.note(ctx, "dns:"+name)
}

func (c cfClient) WorkerDomainsFor(ctx context.Context, hostname string) ([]providers.WorkerDomain, error) {
	c.needAccount()
	return c.f.domains[hostname], c.note(ctx, "domains:"+hostname)
}

func (c cfClient) WorkerRoutes(ctx context.Context, zoneID string) ([]providers.WorkerRoute, error) {
	return c.f.routes, c.note(ctx, "routes:"+zoneID)
}

// create counts one create of kind and fails it when the test asks.
func (c cfClient) create(ctx context.Context, kind, name string) error {
	if err := c.note(ctx, "create-"+kind+":"+name); err != nil {
		return err
	}
	if err := c.f.createErr[kind]; err != nil {
		return err
	}
	c.f.creates[kind]++
	if c.f.onCreate != nil {
		c.f.onCreate(kind)
	}
	return nil
}

func (c cfClient) CreateD1(ctx context.Context, name string) (*providers.D1Database, error) {
	c.needAccount()
	if err := c.create(ctx, "d1", name); err != nil {
		return nil, err
	}
	db := &d1{uuid: "0a1b2c3d-4e5f-4a6b-8c7d-" + fmt.Sprintf("%012d", c.f.creates["d1"]), editors: map[string]string{}, tokens: map[string]tokenRow{}}
	c.f.d1[name] = db
	// A run killed while the create is in flight finds it done on Cloudflare's side.
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return &providers.D1Database{UUID: db.uuid, Name: name}, nil
}

func (c cfClient) CreateR2Bucket(ctx context.Context, name string) (*providers.R2Bucket, error) {
	c.needAccount()
	if err := c.create(ctx, "r2", name); err != nil {
		return nil, err
	}
	c.f.r2[name] = true
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return &providers.R2Bucket{Name: name}, nil
}

func (c cfClient) EnsureEmailSendingSubdomain(ctx context.Context, _, name string) (providers.SendingSubdomain, bool, error) {
	if err := c.note(ctx, "email-subdomains"); err != nil {
		return providers.SendingSubdomain{}, false, err
	}
	if c.f.emailSubs[name] {
		return providers.SendingSubdomain{Name: name, Enabled: true}, false, nil
	}
	if err := c.create(ctx, "email", name); err != nil {
		return providers.SendingSubdomain{}, false, err
	}
	c.f.emailSubs[name] = true
	return providers.SendingSubdomain{Name: name}, true, nil
}

func (c cfClient) dbByUUID(uuid string) *d1 {
	for _, db := range c.f.d1 {
		if db.uuid == uuid {
			return db
		}
	}
	c.t.Errorf("D1 query against unknown database %s", uuid)
	return &d1{editors: map[string]string{}, tokens: map[string]tokenRow{}}
}

func (c cfClient) str(p []any, i int) string {
	v, ok := p[i].(string)
	if !ok {
		c.t.Errorf("D1 parameter %d = %#v, want a string", i, p[i])
	}
	return v
}

func (c cfClient) num(p []any, i int) int64 {
	v, ok := p[i].(int64)
	if !ok {
		c.t.Errorf("D1 parameter %d = %#v, want an int64", i, p[i])
	}
	return v
}

// D1Query runs the statements the runner sends, by their exact SQL.
func (c cfClient) D1Query(ctx context.Context, uuid string, stmts []providers.D1Statement) ([]providers.D1Result, error) {
	c.needAccount()
	if err := c.note(ctx, "d1-query"); err != nil {
		return nil, err
	}
	db := c.dbByUUID(uuid)
	var out []providers.D1Result
	for _, st := range stmts {
		var res providers.D1Result
		res.Success = true
		p := st.Params
		switch st.SQL {
		case sqlTables:
			for _, name := range db.tables {
				res.Results = append(res.Results, json.RawMessage(`{"name":"`+name+`"}`))
			}
		case sqlInsertOwner:
			if len(db.editors) == 0 {
				db.editors[c.str(p, 0)] = "owner"
				res.Meta.Changes = 1
			}
		case sqlSweepTokens:
			for h, row := range db.tokens {
				if row.email == c.str(p, 0) || row.expires <= c.num(p, 1) {
					delete(db.tokens, h)
				}
			}
		case sqlInsertToken:
			if _, ok := db.editors[c.str(p, 4)]; ok {
				db.tokens[c.str(p, 0)] = tokenRow{email: c.str(p, 1), expires: c.num(p, 2)}
				res.Meta.Changes = 1
			}
		case sqlTokenLive:
			if _, ok := db.tokens[c.str(p, 0)]; ok {
				res.Results = append(res.Results, json.RawMessage(`{"token_hash":"x"}`))
			}
		case sqlLatestSession:
			latest := "null"
			for _, s := range db.sessions {
				if s.email == c.str(p, 0) {
					latest = strconv.FormatInt(s.created, 10)
				}
			}
			res.Results = append(res.Results, json.RawMessage(`{"latest":`+latest+`}`))
		case sqlNewSession:
			for _, s := range db.sessions {
				if s.email == c.str(p, 0) && s.created > c.num(p, 1) {
					res.Results = append(res.Results, json.RawMessage(`{"one":1}`))
				}
			}
		default:
			c.t.Errorf("unexpected SQL %q", st.SQL)
		}
		out = append(out, res)
	}
	return out, nil
}

func (c cfClient) MintDeployKey(ctx context.Context, runID string) (*providers.DeployKey, error) {
	if err := c.create(ctx, "deploy-key", runID); err != nil {
		return nil, err
	}
	id := "tok" + strconv.Itoa(len(c.f.keysMinted)+1)
	key := providers.DeployKey{ID: id, Value: providers.NewCredential("deploy-key-value-" + id + "-abcdef0123456789")}
	c.f.keysMinted = append(c.f.keysMinted, key)
	c.f.userTokens[id] = providers.DeployKeyName(runID)
	return &key, nil
}

func (c cfClient) DeleteUserToken(ctx context.Context, id string) error {
	if err := c.note(ctx, "delete-token:"+id); err != nil {
		return err
	}
	delete(c.f.userTokens, id)
	return nil
}

func (c cfClient) DeleteUserTokensNamed(ctx context.Context, name string) (int, error) {
	if err := c.note(ctx, "delete-tokens-named:"+name); err != nil {
		return 0, err
	}
	n := 0
	for id, nm := range c.f.userTokens {
		if nm == name {
			delete(c.f.userTokens, id)
			n++
		}
	}
	return n, nil
}

func (c cfClient) PutWorkerSecret(ctx context.Context, script, name, text string) error {
	c.needAccount()
	if err := c.note(ctx, "worker-secret:"+script+":"+name); err != nil {
		return err
	}
	c.f.secrets[script+"/"+name] = text
	return nil
}

func (c cfClient) AttachCustomDomain(ctx context.Context, hostname, zoneID, service string) (*providers.WorkerDomain, error) {
	c.needAccount()
	if err := c.note(ctx, "attach:"+hostname); err != nil {
		return nil, err
	}
	c.f.attached[hostname] = service
	d := providers.WorkerDomain{Hostname: hostname, Service: service, ZoneID: zoneID}
	c.f.domains[hostname] = []providers.WorkerDomain{d}
	c.f.dns[hostname] = []providers.DNSRecord{{Name: hostname, Type: "AAAA"}}
	return &d, nil
}

func (c cfClient) SendEmail(ctx context.Context, m providers.EmailMessage) (*providers.EmailSendResult, error) {
	c.needAccount()
	if err := c.note(ctx, "send-email"); err != nil {
		return nil, err
	}
	if c.f.sendErr != nil {
		return nil, c.f.sendErr
	}
	c.f.sent = append(c.f.sent, m)
	return &providers.EmailSendResult{Delivered: []string{m.To}}, nil
}

type install struct {
	ID        int64
	AppID     int64
	Selection string
	Repos     []int64
}

type fakeGH struct {
	t *testing.T
	// created names every repository CreateRepo made, which a second create of the name is
	// refused for; ownerOf overrides the owner a read of the name reports.
	created map[string]bool
	ownerOf map[string]string
	// afterCreate runs once the repository exists, before CreateRepo returns.
	afterCreate func()
	// secretOnEmpty reports, for each Actions secret stored, whether the repository then held no
	// commits.
	secretOnEmpty []bool
	app           providers.AppRecord
	repo          providers.Repository
	convertErr    error
	deleteErr     error
	secretErr     error
	taken         map[string]bool
	installs      []install
	writes        int
	creates       map[string]int
	onCreate      func()
	remotes       string
	secrets       map[string]string
	instTokens    []providers.Credential
	runFor        func(sha string) (providers.WorkflowRun, bool)
	// deploy stands in for the deploy run's own effect: the Worker it creates.
	deploy func(repo string)
	log    *[]string
}

type ghClient struct {
	f    *fakeGH
	cred providers.Credential
}

func isJWT(c providers.Credential) bool {
	v := c.Reveal()
	return strings.HasPrefix(v, "eyJ") && strings.Count(v, ".") == 2
}

func isInstallationToken(c providers.Credential) bool {
	return strings.HasPrefix(c.Reveal(), "gh"+"s_")
}

func (c ghClient) note(ctx context.Context, call string) error {
	*c.f.log = append(*c.f.log, "gh:"+call)
	return ctx.Err()
}

func (c ghClient) ConvertManifest(ctx context.Context, code string) (providers.AppRecord, error) {
	if err := c.note(ctx, "convert"); err != nil {
		return providers.AppRecord{}, err
	}
	c.f.writes++
	c.f.creates["app"]++
	if c.f.convertErr != nil {
		return providers.AppRecord{}, c.f.convertErr
	}
	return c.f.app, nil
}

func (c ghClient) CreateRepo(ctx context.Context, name string) (providers.Repository, error) {
	if err := c.note(ctx, "create:"+name); err != nil {
		return providers.Repository{}, err
	}
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
	if c.f.taken[name] || c.f.created[name] {
		return providers.Repository{}, fmt.Errorf("test 422: %w", providers.ErrRepoNameTaken)
	}
	c.f.creates["repo"]++
	c.f.created[name] = true
	r := c.f.repoNamed(name)
	gitRun(c.f.t, "", "init", "--quiet", "--bare", "-b", r.DefaultBranch, filepath.Join(c.f.remotes, r.Owner.Login, name+".git"))
	if c.f.afterCreate != nil {
		c.f.afterCreate()
		if err := ctx.Err(); err != nil {
			return providers.Repository{}, err
		}
	}
	return r, nil
}

func (f *fakeGH) repoNamed(name string) providers.Repository {
	r := f.repo
	r.Name = name
	r.FullName = r.Owner.Login + "/" + name
	return r
}

// RepoNamed reads a repository the run created, as GitHub's GET /repos/{owner}/{repo} does.
func (c ghClient) RepoNamed(ctx context.Context, owner, name string) (*providers.Repository, error) {
	if err := c.note(ctx, "repo:"+owner+"/"+name); err != nil {
		return nil, err
	}
	if isJWT(c.cred) || c.cred.Reveal() == "" {
		c.f.t.Error("RepoNamed ran without the user token")
	}
	if !c.f.created[name] || owner != c.f.repo.Owner.Login {
		return nil, nil
	}
	r := c.f.repoNamed(name)
	if o, ok := c.f.ownerOf[name]; ok {
		r.Owner.Login = o
	}
	return &r, nil
}

func (c ghClient) AppInstallations(ctx context.Context) ([]providers.Installation, error) {
	if err := c.note(ctx, "list"); err != nil {
		return nil, err
	}
	if !isJWT(c.cred) {
		c.f.t.Error("AppInstallations ran without the App JWT")
	}
	var out []providers.Installation
	for _, in := range c.f.installs {
		out = append(out, providers.Installation{ID: in.ID, AppID: in.AppID, RepositorySelection: in.Selection})
	}
	return out, nil
}

func (c ghClient) DeleteInstallation(ctx context.Context, id int64) error {
	*c.f.log = append(*c.f.log, "gh:delete:"+strconv.FormatInt(id, 10))
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

func (c ghClient) ReadBackInstallation(ctx context.Context, appID, repoID int64) (providers.ReadBack, error) {
	if err := c.note(ctx, "readback"); err != nil {
		return providers.ReadBack{}, err
	}
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

func (c ghClient) InstallationToken(ctx context.Context, id int64) (providers.Credential, time.Time, error) {
	if err := c.note(ctx, "installation-token:"+strconv.FormatInt(id, 10)); err != nil {
		return providers.Credential{}, time.Time{}, err
	}
	if !isJWT(c.cred) {
		c.f.t.Error("InstallationToken ran without the App JWT")
	}
	if !slices.ContainsFunc(c.f.installs, func(in install) bool { return in.ID == id }) {
		return providers.Credential{}, time.Time{}, &providers.GitHubError{Status: 404, Reason: providers.ReasonNotFound}
	}
	// Built at run time: a token-shaped literal does not belong in source.
	tok := providers.NewCredential("gh" + "s_" + strconv.FormatInt(id, 10) + strings.Repeat("k", 28) + strconv.Itoa(len(c.f.instTokens)))
	c.f.instTokens = append(c.f.instTokens, tok)
	return tok, time.Date(2026, 11, 8, 13, 0, 0, 0, time.UTC), nil
}

// installationFor reports the installation an installation token was minted for.
func (f *fakeGH) installationFor(tok providers.Credential) int64 {
	v := strings.TrimPrefix(tok.Reveal(), "gh"+"s_")
	id, _ := strconv.ParseInt(v[:strings.Index(v, "k")], 10, 64)
	return id
}

func (c ghClient) InstallationRepositories(ctx context.Context) ([]int64, error) {
	if err := c.note(ctx, "installation-repositories"); err != nil {
		return nil, err
	}
	if !isInstallationToken(c.cred) {
		c.f.t.Error("InstallationRepositories ran without an installation token")
	}
	id := c.f.installationFor(c.cred)
	for _, in := range c.f.installs {
		if in.ID == id {
			return in.Repos, nil
		}
	}
	return nil, &providers.GitHubError{Status: 401, Reason: providers.ReasonUnauthorized}
}

func (c ghClient) HeadSHA(ctx context.Context, owner, repo, ref string) (string, error) {
	if err := c.note(ctx, "head:"+ref); err != nil {
		return "", err
	}
	sha, ok := c.f.remoteHead(owner, repo, ref)
	if !ok {
		return "", &providers.GitHubError{Status: 409, Message: "Git Repository is empty.", Reason: providers.ReasonUnknown}
	}
	return sha, nil
}

// remoteHead reads ref in the remote standing in for owner/repo.
func (f *fakeGH) remoteHead(owner, repo, ref string) (string, bool) {
	cmd := exec.Command("git", "rev-parse", "--verify", "--quiet", "refs/heads/"+ref)
	cmd.Dir = filepath.Join(f.remotes, owner, repo+".git")
	out, err := cmd.Output()
	if err != nil {
		return "", false
	}
	return strings.TrimSpace(string(out)), true
}

func (c ghClient) SetActionsSecret(ctx context.Context, owner, repo, name, value string) error {
	if err := c.note(ctx, "secret:"+name); err != nil {
		return err
	}
	if !isInstallationToken(c.cred) {
		c.f.t.Error("SetActionsSecret ran without the installation token")
	}
	if c.f.secretErr != nil {
		err := c.f.secretErr
		c.f.secretErr = nil
		return err
	}
	_, pushed := c.f.remoteHead(owner, repo, c.f.repo.DefaultBranch)
	c.f.secretOnEmpty = append(c.f.secretOnEmpty, !pushed)
	c.f.secrets[owner+"/"+repo+"/"+name] = value
	return nil
}

func (c ghClient) WorkflowRunForCommit(ctx context.Context, owner, repo, sha string) (providers.WorkflowRun, bool, error) {
	if err := c.note(ctx, "run"); err != nil {
		return providers.WorkflowRun{}, false, err
	}
	if !isInstallationToken(c.cred) {
		c.f.t.Error("WorkflowRunForCommit ran without the installation token")
	}
	run, ok := providers.WorkflowRun{Status: "completed", Conclusion: "success", URL: "https://example.test/actions/runs/9001"}, true
	if c.f.runFor != nil {
		run, ok = c.f.runFor(sha)
	}
	if ok && run.Conclusion == "success" && c.f.deploy != nil {
		c.f.deploy(repo)
	}
	return run, ok, nil
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
	deleted  []string
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

func (v *fakeVault) Pair() (secrets.OAuthPair, error) {
	a, err := v.Value(secrets.EntryCloudflareAccess)
	if err != nil {
		return secrets.OAuthPair{}, err
	}
	r, err := v.Value(secrets.EntryCloudflareRefresh)
	if err != nil {
		return secrets.OAuthPair{}, err
	}
	return secrets.OAuthPair{Access: a, Refresh: r}, nil
}

func (v *fakeVault) Value(kind secrets.EntryKind) (string, error) {
	val, ok := v.entries[v.Entry(kind)]
	if !ok {
		return "", secrets.ErrNotFound
	}
	return val, nil
}

func (v *fakeVault) DeleteEntries(names []string) error {
	for _, n := range names {
		v.deleted = append(v.deleted, n)
		delete(v.entries, n)
	}
	return nil
}

// ofRun reports the entries the vault holds for the run.
func (v *fakeVault) ofRun() []string {
	var out []string
	for name := range v.entries {
		if strings.HasPrefix(name, secrets.SetupEntryPrefix+v.runID+"/") {
			out = append(out, name)
		}
	}
	return out
}

type fakeSaver struct {
	saves []record.Record
	id    string
	err   error
	// onSave sees each record Save is about to write; an error it returns fails the save.
	onSave func(r record.Record) error
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
	if s.onSave != nil {
		if err := s.onSave(r); err != nil {
			return err
		}
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
	// edits answer the summary in turn; once they run out, the summary is confirmed as shown.
	edits    []SummaryEdit
	problems []string
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

func (v *fakeView) ConfirmSummary(ctx context.Context, s Summary, problem string) (SummaryEdit, error) {
	if err := ctx.Err(); err != nil {
		return SummaryEdit{}, err
	}
	v.problems = append(v.problems, problem)
	if len(v.problems) > 10 {
		return SummaryEdit{}, errors.New("test: the summary was asked more than ten times")
	}
	if len(v.edits) > 0 {
		e := v.edits[0]
		v.edits = v.edits[1:]
		return e, nil
	}
	host := s.Zone
	if len(s.Addresses) == 1 {
		host = s.Addresses[0]
	}
	return SummaryEdit{OwnerEmail: s.OwnerEmail, Host: host}, nil
}

// world is one run's fakes, set up for the happy path: one account, one active zone, no names
// taken, an owner who approves each request once, a deploy that succeeds, and a site that
// answers over HTTPS at once.
type world struct {
	t          *testing.T
	log        []string
	clock      *clock
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
	siteLive   bool
	npmEnv     string
	cfg        Config
}

const foreignAppID = 15368

func newWorld(t *testing.T) *world {
	t.Helper()
	w := &world{t: t, node: "v24.1.0", siteLive: true}
	w.clock = &clock{now: time.Date(2026, 11, 8, 12, 0, 0, 0, time.UTC)}
	w.tab = &fakeTab{armed: map[loopback.Route]string{}, script: map[loopback.Route][]func(string) (loopback.Callback, error){}, log: &w.log}
	tok := fixture[providers.OAuthToken](t, "cloudflare", "oauth_token.success.200.json")
	w.cfAuth = &fakeCFAuth{clock: w.clock, tokens: []providers.OAuthToken{tok}, issuedAt: map[string]time.Time{}}
	zones := cfResult[[]providers.Zone](t, "zones.list.200.json")
	user := cfResult[struct {
		Email string `json:"email"`
	}](t, "user.get.200.json")
	w.cf = &fakeCF{
		clock:    w.clock,
		auth:     w.cfAuth,
		accounts: cfResult[[]providers.Account](t, "accounts.list.200.json"),
		// The recorded address is scrubbed, so the world signs in as a valid one.
		email:      strings.Replace(user.Email, "editor-redacted", "owner@example.test", 1),
		active:     zones[:1],
		all:        zones[:1],
		workers:    map[string]string{},
		d1:         map[string]*d1{},
		r2:         map[string]bool{},
		dns:        map[string][]providers.DNSRecord{},
		domains:    map[string][]providers.WorkerDomain{},
		routes:     cfResult[[]providers.WorkerRoute](t, "zone_workers_routes.list.200.json"),
		log:        &w.log,
		creates:    map[string]int{},
		createErr:  map[string]error{},
		emailSubs:  map[string]bool{},
		userTokens: map[string]string{},
		secrets:    map[string]string{},
		attached:   map[string]string{},
	}
	conv := fixture[struct {
		ID       int64  `json:"id"`
		Slug     string `json:"slug"`
		ClientID string `json:"client_id"`
	}](t, "github", "app_manifest_conversion.created.201.json")
	// The recordings scrub the owner's login to a placeholder carrying < and >, which no Windows
	// folder name can hold, and the fake keeps each repository's remote under its owner's folder.
	const owner = "example-owner"
	repo := fixture[providers.Repository](t, "github", "repo_create.ok.201.json")
	repo.Owner.Login = owner
	// The recording scrubs every secret to one placeholder, so the secrets come from the corpus's
	// test-only credentials: a working key and values distinct enough for the scrub assertions.
	creds := fixture[struct {
		ClientSecret string `json:"client_secret"`
		Webhook      string `json:"webhook_secret"`
		PEM          string `json:"pem"`
	}](t, "github", "test-only.app-credentials.json")
	w.gh = &fakeGH{
		t: t,
		app: providers.AppRecord{
			ID: conv.ID, Slug: conv.Slug, ClientID: conv.ClientID,
			ClientSecret:  providers.NewCredential(creds.ClientSecret),
			WebhookSecret: providers.NewCredential(creds.Webhook),
			PEM:           providers.NewCredential(creds.PEM),
			OwnerLogin:    owner,
		},
		repo:     repo,
		taken:    map[string]bool{},
		created:  map[string]bool{},
		ownerOf:  map[string]string{},
		installs: []install{{ID: 5550001, AppID: foreignAppID, Selection: "all"}},
		creates:  map[string]int{},
		remotes:  t.TempDir(),
		secrets:  map[string]string{},
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
	w.tab.onNext = w.ownerUsesLink
	w.gh.deploy = w.deployed

	w.npmEnv = filepath.Join(t.TempDir(), "npm-env.txt")
	bin := stubNPM(t, w.npmEnv)
	t.Setenv("PATH", filepath.Dir(bin)+string(os.PathListSeparator)+os.Getenv("PATH"))

	w.cfg = Config{
		Answers: Answers{SiteName: "Example Site", Posture: Decline},
		RunID:   "run7",
		Dir:     t.TempDir(),
		GOOS:    "linux",
		Env: map[string]string{
			"DISPLAY":              ":0",
			"PATH":                 os.Getenv("PATH"),
			"HOME":                 t.TempDir(),
			"GH_TOKEN":             "inherited-gh-token-value",
			"CLOUDFLARE_API_TOKEN": "inherited-cloudflare-token-value",
			"GIT_CONFIG_COUNT":     "1",
			"GIT_CONFIG_KEY_0":     "url." + w.gh.remotes + "/.insteadOf",
			"GIT_CONFIG_VALUE_0":   "https://github.com/",
		},
		Git: func(context.Context) error { return w.gitErr },
		NodeVersion: func(context.Context) (string, error) {
			return w.node, w.nodeErr
		},
		FetchTemplate: func(context.Context) (Template, error) { return w.template, w.fetchErr },
		WriteSite:     w.writeSite,
		FinalizeSite:  w.finalizeSite,
		SiteGet:       w.siteGet,
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
			return cfClient{f: w.cf, account: accountID, token: token.Reveal(), t: t}
		},
		GitHub:    func(cred providers.Credential) GitHubAPI { return ghClient{f: w.gh, cred: cred} },
		GitHubWeb: w.web,
		View:      w.view,
		Register:  func(c providers.Credential) { w.registered = append(w.registered, c) },
		Emit:      func(e Event) { w.events = append(w.events, e) },
		Now:       w.clock.Now,
		After:     w.clock.After,
	}
	return w
}

// failNPM replaces the world's npm with one that fails.
func failNPM(t *testing.T, w *world) {
	t.Helper()
	writeNPM(t, w.npmEnv, 1)
}

// stubNPM writes an npm that prints to both streams, saves its environment to envFile, and
// succeeds, and returns its path.
func stubNPM(t *testing.T, envFile string) string {
	t.Helper()
	return writeNPM(t, envFile, 0)
}

// writeNPM writes the stub npm into a bin folder beside envFile and returns its path. Windows
// runs no shell script, so there the stub is npm.cmd, which a PATH lookup of npm finds through
// PATHEXT.
func writeNPM(t *testing.T, envFile string, exit int) string {
	t.Helper()
	dir := filepath.Join(filepath.Dir(envFile), "bin")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	code := strconv.Itoa(exit)
	bin := filepath.Join(dir, "npm")
	script := "#!/bin/sh\necho npm-stub-stdout\necho npm-stub-stderr >&2\nenv > '" + envFile + "'\nexit " + code + "\n"
	if runtime.GOOS == "windows" {
		bin += ".cmd"
		script = "@echo off\r\necho npm-stub-stdout\r\necho npm-stub-stderr 1>&2\r\nset > \"" + envFile + "\"\r\nexit /b " + code + "\r\n"
	}
	if err := os.WriteFile(bin, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	return bin
}

// gitRun runs git for a fake, with the owner's config kept out.
func gitRun(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GIT_CONFIG_GLOBAL="+os.DevNull, "GIT_CONFIG_NOSYSTEM=1",
		"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@example.test", "GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@example.test")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
	return strings.TrimSpace(string(out))
}

// writeSite is the scaffold's first pass in miniature: a folder holding one file, committed on
// the default branch with origin set.
func (w *world) writeSite(ctx context.Context, cfg scaffold.Config) (scaffold.Result, error) {
	w.log = append(w.log, "scaffold:write")
	if err := ctx.Err(); err != nil {
		return scaffold.Result{}, err
	}
	if busy(cfg.Dir) {
		return scaffold.Result{}, errors.New("test: folder is not empty")
	}
	if err := os.MkdirAll(cfg.Dir, 0o755); err != nil {
		return scaffold.Result{}, err
	}
	if err := os.WriteFile(filepath.Join(cfg.Dir, "site.txt"), []byte(cfg.Site.Name+"\n"), 0o644); err != nil {
		return scaffold.Result{}, err
	}
	gitRun(w.t, cfg.Dir, "init", "--quiet", "-b", cfg.Site.DefaultBranch)
	gitRun(w.t, cfg.Dir, "remote", "add", "origin", "https://github.com/"+cfg.Site.Owner+"/"+cfg.Site.Repo+".git")
	gitRun(w.t, cfg.Dir, "add", "--all")
	gitRun(w.t, cfg.Dir, "commit", "--quiet", "-m", cfg.Commit.Message)
	return scaffold.Result{Dir: cfg.Dir, CommitSHA: gitRun(w.t, cfg.Dir, "rev-parse", "HEAD"), EngineVersion: w.template.Version}, nil
}

// finalizeSite is the second pass in miniature: the database id written and committed on the
// first commit.
func (w *world) finalizeSite(ctx context.Context, cfg scaffold.FinalizeConfig) (string, error) {
	w.log = append(w.log, "scaffold:finalize")
	if err := ctx.Err(); err != nil {
		return "", err
	}
	if head := gitRun(w.t, cfg.Dir, "rev-parse", "HEAD"); head != cfg.Base {
		return "", errors.New("test: the folder is not at the base")
	}
	if cfg.Site.DatabaseID == "" {
		return "", errors.New("test: no database id")
	}
	if err := os.WriteFile(filepath.Join(cfg.Dir, "wrangler.jsonc"), []byte(cfg.Site.DatabaseID+"\n"), 0o644); err != nil {
		return "", err
	}
	gitRun(w.t, cfg.Dir, "add", "--all")
	gitRun(w.t, cfg.Dir, "commit", "--quiet", "-m", cfg.Commit.Message)
	return gitRun(w.t, cfg.Dir, "rev-parse", "HEAD"), nil
}

// siteGet answers like the deployed site once the domain is attached and w.siteLive is set.
func (w *world) siteGet(ctx context.Context, rawURL string) (int, string, error) {
	w.log = append(w.log, "site:"+rawURL)
	if err := ctx.Err(); err != nil {
		return 0, "", err
	}
	if !w.siteLive || len(w.cf.attached) == 0 {
		return 0, "", errors.New("test: tls handshake failed")
	}
	if strings.HasSuffix(rawURL, "/admin") {
		return 303, "/admin/login", nil
	}
	return 200, "", nil
}

// ownerUsesLink is the owner selecting Sign in on the confirm page the tab moved to: the engine
// consumes the link's row and then writes a session for its email (src/lib/sveltekit/auth-routes.ts).
func (w *world) ownerUsesLink(link string) {
	h := hashToken(link[strings.Index(link, "token=")+len("token="):])
	for _, db := range w.cf.d1 {
		if row, ok := db.tokens[h]; ok {
			delete(db.tokens, h)
			db.sessions = append(db.sessions, sessionRow{email: row.email, created: w.clock.Now().UnixMilli()})
		}
	}
}

// ownerRequestsALink is the owner asking the live sign-in page for a link while the tab's link
// is live: the engine's issueToken deletes every row of the email, the tab's included, and
// writes no session.
func (w *world) ownerRequestsALink(string) {
	email := strings.ToLower(w.cf.email)
	for _, db := range w.cf.d1 {
		for h, row := range db.tokens {
			if row.email == email {
				delete(db.tokens, h)
			}
		}
	}
}

// deployed records the Worker the first deploy creates, as the deploy run would.
func (w *world) deployed(repo string) {
	w.cf.workers[repo] = "tag-0001"
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
	if w.cfg.WriteSite == nil {
		w.cfg.WriteSite = w.writeSite
	}
	return Run(ctx, w.cfg)
}

// resumeFrom sets the world up for the next run to resume the last saved record: a fresh tab
// scripted with only the approvals the record has not reached, fresh events, and the summary
// confirmed as shown.
func (w *world) resumeFrom() {
	rec, ok := w.saver.last()
	if !ok {
		w.t.Fatal("no record to resume")
	}
	w.cfg.Resume = &Resume{SiteID: w.saver.id, Record: rec}
	w.events = nil
	w.view.opened = nil
	w.tab = &fakeTab{armed: map[loopback.Route]string{}, script: map[loopback.Route][]func(string) (loopback.Callback, error){}, log: &w.log, onNext: w.ownerUsesLink}
	switch {
	case !reached(rec.Step, "app-created") && rec.Cloudflare.AccountID == "" && !slices.Contains(rec.Setup.KeyringEntries, w.vault.Entry(secrets.EntryCloudflareRefresh)):
		w.tab.push(loopback.CloudflareCallback, w.cloudflareApproves)
		fallthrough
	case !reached(rec.Step, "app-created"):
		w.tab.push(loopback.GitHubManifest, w.manifestApproves)
		fallthrough
	case !reached(rec.Step, "repo-created"):
		w.tab.push(loopback.GitHubCallback, w.installsAll)
		fallthrough
	case !reached(rec.Step, "installed"):
		w.tab.push(loopback.GitHubCallback, w.installsRepo)
	}
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
