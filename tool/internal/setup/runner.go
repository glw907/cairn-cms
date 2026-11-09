package setup

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// CloudflareAuth is the Cloudflare OAuth client: the first approval exchanges its code through
// it, the watch refreshes the grant through it, and the end revokes the grant.
type CloudflareAuth interface {
	Exchange(ctx context.Context, code, verifier string) (*providers.OAuthToken, error)
	Refresh(ctx context.Context, refreshToken string) (*providers.OAuthToken, error)
	Revoke(ctx context.Context, token string) error
}

// CloudflareAPI is the part of the Cloudflare API setup calls: the opening's reads, and the
// watch's creates and settings.
type CloudflareAPI interface {
	Accounts(ctx context.Context) ([]providers.Account, error)
	UserEmail(ctx context.Context) (string, error)
	ActiveZones(ctx context.Context) ([]providers.Zone, error)
	ListZones(ctx context.Context) ([]providers.Zone, error)
	Subscriptions(ctx context.Context) ([]providers.Subscription, bool, error)
	WorkerExists(ctx context.Context, name string) (bool, error)
	ListWorkers(ctx context.Context) ([]providers.Worker, error)
	D1DatabaseNamed(ctx context.Context, name string) (*providers.D1Database, error)
	R2BucketNamed(ctx context.Context, name string) (*providers.R2Bucket, error)
	DNSRecordsNamed(ctx context.Context, zoneID, name string) ([]providers.DNSRecord, error)
	WorkerDomainsFor(ctx context.Context, hostname string) ([]providers.WorkerDomain, error)
	WorkerRoutes(ctx context.Context, zoneID string) ([]providers.WorkerRoute, error)

	CreateD1(ctx context.Context, name string) (*providers.D1Database, error)
	CreateR2Bucket(ctx context.Context, name string) (*providers.R2Bucket, error)
	EnsureEmailSendingSubdomain(ctx context.Context, zoneID, name string) (providers.SendingSubdomain, bool, error)
	D1Query(ctx context.Context, databaseUUID string, stmts []providers.D1Statement) ([]providers.D1Result, error)
	MintDeployKey(ctx context.Context, runID string) (*providers.DeployKey, error)
	DeleteUserToken(ctx context.Context, id string) error
	DeleteUserTokensNamed(ctx context.Context, name string) (int, error)
	PutWorkerSecret(ctx context.Context, script, name, text string) error
	AttachCustomDomain(ctx context.Context, hostname, zoneID, service string) (*providers.WorkerDomain, error)
	SendEmail(ctx context.Context, m providers.EmailMessage) (*providers.EmailSendResult, error)
}

// GitHubAPI is the part of the GitHub API setup calls on api.github.com. Which credential a
// call needs (none, the App JWT, the user token, or the installation token) is the client's,
// chosen when Config.GitHub builds it.
type GitHubAPI interface {
	ConvertManifest(ctx context.Context, code string) (providers.AppRecord, error)
	CreateRepo(ctx context.Context, name string) (providers.Repository, error)
	AppInstallations(ctx context.Context) ([]providers.Installation, error)
	DeleteInstallation(ctx context.Context, id int64) error
	ReadBackInstallation(ctx context.Context, appID, repoID int64) (providers.ReadBack, error)
	InstallationToken(ctx context.Context, id int64) (providers.Credential, time.Time, error)
	InstallationRepositories(ctx context.Context) ([]int64, error)
	HeadSHA(ctx context.Context, owner, repo, ref string) (string, error)
	SetActionsSecret(ctx context.Context, owner, repo, name, value string) error
	WorkflowRunForCommit(ctx context.Context, owner, repo, sha string) (providers.WorkflowRun, bool, error)
}

// GitHubWeb is the github.com client the install callbacks exchange their codes through.
type GitHubWeb interface {
	ExchangeCode(ctx context.Context, clientID string, clientSecret providers.Credential, code, redirectURI string) (providers.Credential, error)
}

// Vault is the run's keyring store. secrets.SetupStore satisfies it.
type Vault interface {
	Probe(deadline time.Duration) error
	Entry(kind secrets.EntryKind) string
	Put(kind secrets.EntryKind, value string) error
	PutPair(p secrets.OAuthPair) error
	Pair() (secrets.OAuthPair, error)
	Value(kind secrets.EntryKind) (string, error)
	DeleteEntries(names []string) error
}

// Saver writes the site record. *store.Store satisfies it: SaveNew draws the site id on the
// run's first save and Save replaces the record after.
type Saver interface {
	SaveNew(slug string, r record.Record) (string, error)
	Save(id string, r record.Record) error
}

// SummaryEdit is the summary's two editable rows as the owner left them.
type SummaryEdit struct {
	OwnerEmail string
	// Host is the site's address: the zone itself, or a subdomain of it.
	Host string
}

// View answers the questions only the owner can, at the moment the run needs them. The
// terminal view asks; the agent lane answers from its flags. The runner calls ChooseTheme only
// for a catalog of several themes, ChooseAccount only for several accounts, and ChooseZone only
// for several active zones.
type View interface {
	ChooseTheme(ctx context.Context, themes []scaffold.Theme) (string, error)
	ChooseAccount(ctx context.Context, accounts []providers.Account) (string, error)
	ChooseZone(ctx context.Context, zones []providers.Zone) (string, error)
	// OpenBrowser waits for the owner's go-ahead and opens url, showing it as the fallback link
	// when no browser opens. url can carry the tab's one-time key, so it never goes in an event.
	OpenBrowser(ctx context.Context, url string) error
	// ConfirmSummary shows s and returns when the owner presses Enter, with the two editable rows
	// as the owner left them. problem is empty on the first call; after an edit setup refuses,
	// the runner calls again with the sentence that says why. A view that cannot ask again
	// returns an error.
	ConfirmSummary(ctx context.Context, s Summary, problem string) (SummaryEdit, error)
}

// Template is what the opening's template fetch resolved.
type Template struct {
	Version   string
	Integrity string
	// Themes is the catalog, in catalog order; it is never empty.
	Themes []scaffold.Theme
	// Tree is the verified template the scaffold step writes from. It is nil in tests that never
	// reach the scaffold.
	Tree *scaffold.Template
}

// FetchFrom returns a Config.FetchTemplate that fetches the engine's template at tag through f.
func FetchFrom(f *scaffold.Fetcher, tag string) func(ctx context.Context) (Template, error) {
	return func(ctx context.Context) (Template, error) {
		t, err := f.Fetch(ctx, tag)
		if err != nil {
			return Template{}, err
		}
		themes, err := t.Catalog()
		if err != nil {
			return Template{}, err
		}
		return Template{Version: t.Version, Integrity: t.Integrity, Themes: themes, Tree: t}, nil
	}
}

// Resume names the unfinished record a run continues.
type Resume struct {
	SiteID string
	Record record.Record
}

// Config is everything a run needs. Every client, clock, and effect is injected, so the runner
// prints nothing, prompts for nothing, and constructs no client of its own.
type Config struct {
	// Answers are the owner's answers to the terminal questions: the site name and the posture.
	Answers Answers
	// RunID names the run; its keyring entries live under setup/<RunID>/.
	RunID string
	// Dir is the absolute directory setup runs in; the site folder is made inside it.
	Dir string
	// GOOS and Env feed the remote-session check: a runtime.GOOS value and the environment by
	// name. Env is also the environment git and npm start from, minus every token variable.
	GOOS string
	Env  map[string]string
	// Resume, when set, continues that record: the run keeps its id, names, and approvals, and
	// starts at the first step not done. Answers and RunID must be the record's.
	Resume *Resume
	// Apply reports a run no browser shows the tab of, the agent lane's --apply: the sign-in
	// skips the redirect and the email goes at once.
	Apply bool

	// Git reports whether git runs, and NodeVersion returns `node --version`'s output.
	Git         func(ctx context.Context) error
	NodeVersion func(ctx context.Context) (string, error)
	// FetchTemplate resolves and verifies the engine's template: the run's dist-tag on a new run,
	// the recorded version on a resume.
	FetchTemplate func(ctx context.Context) (Template, error)
	// WriteSite and FinalizeSite are the scaffold's two passes; scaffold.Write and
	// scaffold.Finalize in production.
	WriteSite    func(ctx context.Context, cfg scaffold.Config) (scaffold.Result, error)
	FinalizeSite func(ctx context.Context, cfg scaffold.FinalizeConfig) (string, error)
	// SiteGet sends one GET to the live site without following a redirect, on a client pinned to
	// the site's address, and returns the status and the Location header.
	SiteGet func(ctx context.Context, rawURL string) (status int, location string, err error)
	// Listen binds the loopback tab; ListenLoopback in production.
	Listen func(cfg loopback.Config) (Tab, error)

	Vault Vault
	Store Saver

	CloudflareOAuth CloudflareAuth
	// Cloudflare builds an API client bound to accountID, empty before the account is known.
	Cloudflare func(accountID string, token providers.Credential) CloudflareAPI
	// GitHub builds an api.github.com client for cred: the zero Credential, the App JWT, the user
	// token, or the installation token.
	GitHub    func(cred providers.Credential) GitHubAPI
	GitHubWeb GitHubWeb

	View View
	// Register hands each credential to the output scrub the moment it arrives.
	Register func(c providers.Credential)
	// Emit receives every event, on the runner's goroutine.
	Emit func(e Event)
	// Now reads the clock. After is the clock's timer, as time.After, for the chain's limit and
	// every poll; nil means time.After.
	Now   func() time.Time
	After func(d time.Duration) <-chan time.Time
}

// Result is what a finished run hands back.
type Result struct {
	// SiteID is the record's id in the store.
	SiteID string
	// Record is the record as last saved.
	Record record.Record
	// Outline is the plan for the confirmed answers.
	Outline Outline
	// Summary is what the summary event carried; zero on a resume past the summary.
	Summary Summary
	// Done is what the done screen reports.
	Done Done
}

// Done is what the done screen reports about a finished site.
type Done struct {
	// URL is the live site's address.
	URL string
	// SignedIn reports that a D1 read showed the tab's sign-in link used. Only then does the
	// done screen say the owner is signed in.
	SignedIn bool
	// Emailed reports that setup sent the sign-in email.
	Emailed bool
	// NoSignIn reports that the site's editor table holds other editors and not the owner's
	// address, so setup issued no sign-in link.
	NoSignIn bool
	// InstallFailed reports that `npm install` failed in the site folder, a next step for the
	// done screen.
	InstallFailed bool
	// RevokeFailed reports that Cloudflare refused to revoke setup's grant. The keyring entries
	// are deleted either way.
	RevokeFailed bool
	// KeysLeft reports that a keyring entry could not be deleted.
	KeysLeft bool
}

// The runner's fixed limits.
const (
	// ProbeDeadline is how long the keyring probe waits on each call, long enough for an unlock
	// prompt.
	ProbeDeadline = 2 * time.Minute
	// MinNodeMajor is the oldest Node major the site's toolchain supports.
	MinNodeMajor = 24
	// HTTPSLimit is how long the domain step waits for the site to answer over HTTPS.
	HTTPSLimit = 15 * time.Minute
	// DeployLimit is how long the first deploy may take, run and Worker together.
	DeployLimit = 30 * time.Minute
	// chainSlack pads each browser wait past the chain's limit. The loopback's own clock stops the
	// chain at the limit once the tab opens; this deadline covers a tab that never opens.
	chainSlack = 2 * time.Minute
	// sweepTimeout bounds the over-grant sweep that runs after the run's own context has ended.
	sweepTimeout = 30 * time.Second
	// grantRefresh is the age at which the watch refreshes the Cloudflare grant, inside the
	// access token's hour.
	grantRefresh = 45 * time.Minute
	// pollEvery spaces every provider poll.
	pollEvery = 10 * time.Second
	// instSlack is how long before its expiry an installation token is replaced.
	instSlack = 10 * time.Minute
)

// run is one run's state. It lives on one goroutine, but for the background install.
type run struct {
	cfg     Config
	step    string
	tab     Tab
	siteID  string
	rec     record.Record
	resumed bool
	opened  bool

	names        Names
	suffix       int
	suffixReason string
	tmpl         Template
	theme        scaffold.Theme

	// pair is the grant as the keyring holds it, kept for the refresh and the revoke; access is
	// its access token as the clients take it.
	pair       secrets.OAuthPair
	access     providers.Credential
	grantAt    time.Time
	account    providers.Account
	email      string
	cf         CloudflareAPI
	zone       providers.Zone
	zoneChosen bool
	host       string
	addresses  []string

	app       providers.AppRecord
	user      providers.Credential
	repo      providers.Repository
	confirmed int64
	inst      providers.Credential
	instUntil time.Time
	// pushedHere reports that this process pushed the commit the first deploy reads.
	pushedHere bool

	install     sync.WaitGroup
	installErr  error
	installStop context.CancelFunc
	out         Done
}

// Run runs a setup from the opening to the done screen: the opening, the four approvals, the
// summary and its one Enter, the eight watch steps, and the end, where the Cloudflare grant is
// revoked and the run's keyring entries are deleted. With Config.Resume it starts at the first
// step the record has not reached. A stop returns a *Failure, emits it as step_failed, and keeps
// the keyring entries for the next run. Run holds the loopback port from the opening's bind
// until it returns.
func Run(ctx context.Context, cfg Config) (Result, error) {
	if _, err := deriveNames(cfg.Answers.SiteName, 0); err != nil {
		return Result{}, err
	}
	if cfg.Answers.Posture != Decline && cfg.Answers.Posture != Invite {
		return Result{}, errPosture
	}
	r := &run{cfg: cfg}
	if cfg.Resume != nil {
		r.resumed, r.siteID, r.rec = true, cfg.Resume.SiteID, cfg.Resume.Record
	}
	defer func() {
		r.stopInstall()
		if r.tab != nil {
			_ = r.tab.Close()
		}
	}()
	res, err := r.steps(ctx)
	if err != nil {
		f := r.fail(ctx, err, "")
		r.keepKeys()
		r.emit(Event{Kind: StepFailed, Step: f.Step, Failure: f})
		return Result{}, f
	}
	return res, nil
}

func (r *run) steps(ctx context.Context) (Result, error) {
	if r.resumed {
		r.emit(Event{Kind: Resumed, Step: r.rec.Step})
	}
	if err := r.opening(ctx); err != nil {
		return Result{}, err
	}
	if err := r.approvals(ctx); err != nil {
		return Result{}, err
	}
	var s Summary
	if !reached(r.rec.Step, spine.StepScaffolded) {
		var err error
		if s, err = r.summary(ctx); err != nil {
			return Result{}, err
		}
	} else {
		r.host = r.rec.Setup.Address
		r.addresses, _ = addresses(r.zone.Name, r.host)
	}
	out, err := r.outline()
	if err != nil {
		return Result{}, err
	}
	if err := r.watch(ctx); err != nil {
		return Result{}, err
	}
	r.finish(ctx)
	return Result{SiteID: r.siteID, Record: r.rec, Outline: out, Summary: s, Done: r.out}, nil
}

// approvals runs the four approvals and the account checks, skipping each one the record shows
// done. A resumed run whose record holds an App sweeps its installations before any other
// GitHub call.
func (r *run) approvals(ctx context.Context) error {
	if err := r.cloudflare(ctx); err != nil {
		return err
	}
	if r.resumed && r.rec.Setup.IDs.AppID != 0 {
		if err := r.resumeGitHub(ctx); err != nil {
			return err
		}
	}
	if reached(r.rec.Step, spine.StepInstalled) {
		return nil
	}
	return r.githubChain(ctx)
}

func (r *run) emit(e Event) {
	e.SchemaVersion = EventSchemaVersion
	e.Timestamp = r.cfg.Now()
	r.cfg.Emit(e)
}

func (r *run) start(step string) {
	r.step = step
	r.emit(Event{Kind: StepStarted, Step: step})
}

func (r *run) done() {
	r.emit(Event{Kind: StepDone, Step: r.step})
}

func (r *run) waiting(s WaitState) {
	r.emit(Event{Kind: Waiting, Step: r.step, Waiting: s, Sentence: WaitSentence(s, r.cfg.Answers.SiteName, r.names.Repository)})
}

// ensureOpen opens the tab in the browser the first time a run needs the owner there. A resumed
// run whose approvals are all done never opens it.
func (r *run) ensureOpen(ctx context.Context) error {
	if r.opened {
		return nil
	}
	if err := r.cfg.View.OpenBrowser(ctx, r.tab.URL()); err != nil {
		return r.fail(ctx, err, "")
	}
	r.opened = true
	return nil
}

// register hands each credential to the output scrub before anything else sees it.
func (r *run) register(cs ...providers.Credential) {
	for _, c := range cs {
		r.cfg.Register(c)
	}
}

func (r *run) registerValue(vs ...string) {
	for _, v := range vs {
		r.cfg.Register(providers.NewCredential(v))
	}
}

// save writes the record, drawing the site id on the first save. Until the scaffold has written
// the folder, the folder follows the names, which a taken name can still move.
func (r *run) save() error {
	if !reached(r.rec.Step, spine.StepScaffolded) {
		base := r.cfg.Dir
		if r.resumed && r.rec.Setup.Folder != "" {
			base = filepath.Dir(r.rec.Setup.Folder)
		}
		r.rec.Setup.Folder = filepath.Join(base, r.names.Repository)
	}
	var err error
	if r.siteID == "" {
		r.siteID, err = r.cfg.Store.SaveNew(r.names.Base, r.rec)
	} else {
		err = r.cfg.Store.Save(r.siteID, r.rec)
	}
	if err != nil {
		return r.failure(ReasonRecord, "Setup couldn't save its record of this run.",
			"Check that your home folder is writable, and then run cairn new again.", err)
	}
	return nil
}

// keepKeys marks the record as holding keyring entries a stopped run left for the next one.
func (r *run) keepKeys() {
	if r.siteID == "" || len(r.rec.Setup.KeyringEntries) == 0 {
		return
	}
	r.rec.Setup.KeysKept = true
	_ = r.cfg.Store.Save(r.siteID, r.rec)
}

// finish ends a run that reached the sign-in: it revokes the Cloudflare grant and deletes every
// keyring entry the record names, then records that none is kept. A refused revoke is reported
// on the done screen, never a stop, and the entries go either way. The GitHub tokens live only
// in memory and end with the process.
func (r *run) finish(ctx context.Context) {
	r.waitInstall()
	r.out.InstallFailed = r.installErr != nil
	r.out.URL = "https://" + r.host
	// RFC 7009 2.1: revoking a refresh token "SHOULD also invalidate all access tokens based on the
	// same authorization grant", and the access token lapses within the hour regardless.
	if err := r.cfg.CloudflareOAuth.Revoke(ctx, r.pair.Refresh); err != nil {
		r.out.RevokeFailed = true
	}
	if err := r.cfg.Vault.DeleteEntries(r.rec.Setup.KeyringEntries); err != nil {
		r.out.KeysLeft = true
	} else {
		r.rec.Setup.KeyringEntries = nil
	}
	r.rec.Setup.KeysKept = r.out.KeysLeft
	_ = r.cfg.Store.Save(r.siteID, r.rec)
}

// sleep waits d on the run's clock, or until ctx ends.
func (r *run) sleep(ctx context.Context, d time.Duration) error {
	after := r.cfg.After
	if after == nil {
		after = time.After
	}
	select {
	case <-after(d):
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// await waits for one callback with a deadline, so a tab that never opens still ends the wait.
func (r *run) await(ctx context.Context, route loopback.Route) (loopback.Callback, error) {
	wctx, cancel := context.WithTimeout(ctx, loopback.ChainLimit+chainSlack)
	defer cancel()
	cb, err := r.tab.Wait(wctx, route)
	if errors.Is(err, context.DeadlineExceeded) && ctx.Err() == nil {
		err = loopback.ErrChainTimeout
	}
	return cb, err
}

// failure builds a stop at the current step, with what setup already did.
func (r *run) failure(reason Reason, happened, do string, err error) *Failure {
	f := &Failure{Step: r.step, Reason: reason, Happened: happened, Did: r.did(), Do: do, Err: err}
	if f.Did != nothingCreated {
		f.Left = "Everything setup created stays, and the next run resumes from it."
	}
	return f
}

// localFailure is the stop for a step on this computer, such as git or the scaffold, unless the
// run was stopped, which ends a child process the same way.
func (r *run) localFailure(ctx context.Context, reason Reason, happened, do string, err error) *Failure {
	if ctx.Err() != nil {
		return r.fail(ctx, err, "")
	}
	return r.failure(reason, happened, do, err)
}

// fail turns err into a Failure: an existing Failure passes through, the chain's limit and a
// cancelled run get their own reasons, and anything else is a failed request to who, or an
// unexpected stop when who is empty.
func (r *run) fail(ctx context.Context, err error, who string) *Failure {
	if f, ok := errors.AsType[*Failure](err); ok {
		return f
	}
	switch {
	case errors.Is(err, loopback.ErrChainTimeout):
		return r.failure(ReasonChainTimeout, "The approvals passed the 30-minute limit.",
			"Run cairn new again to resume.", err)
	case ctx.Err() != nil:
		return r.failure(ReasonStopped, "Setup stopped.", "To resume, run cairn new again.", err)
	case who == "":
		return r.failure(ReasonProvider, "Setup stopped on an unexpected error.", "Run cairn new again.", err)
	}
	return r.failure(ReasonProvider, "A request to "+who+" failed.",
		"Check your internet connection, and then run cairn new again.", err)
}

// did is the "already did" part: what exists outside this computer because of the run, and the
// site folder.
func (r *run) did() string {
	var parts []string
	s, g := r.rec.Setup, r.rec.GitHub.Repo
	if s.IDs.AppID != 0 {
		parts = append(parts, "Setup created the GitHub App "+s.AppSlug+".")
	}
	if g.ID != 0 {
		parts = append(parts, "Setup created the private repository "+g.Owner+"/"+g.Repo+".")
	}
	if s.Commit != "" {
		parts = append(parts, "Setup wrote the site in "+s.Folder+".")
	}
	if s.IDs.D1 != "" {
		parts = append(parts, "Setup created the database "+r.names.Database+".")
	}
	if s.IDs.R2Bucket != "" {
		parts = append(parts, "Setup created the storage bucket "+r.names.Bucket+".")
	}
	if reached(r.rec.Step, spine.StepPushed) {
		parts = append(parts, "Setup pushed the site to GitHub.")
	}
	if s.IDs.DeployKeyID != "" {
		parts = append(parts, "Setup made a deploy key for GitHub Actions.")
	}
	if len(parts) == 0 {
		return nothingCreated
	}
	return strings.Join(parts, " ")
}

// httpStatus is the HTTP status a provider error carried, or 0.
func httpStatus(err error) int {
	if pe, ok := errors.AsType[providers.ProviderError](err); ok {
		return pe.HTTPStatus()
	}
	return 0
}

// nodeMajor reads the major version out of `node --version` output such as "v24.1.0".
func nodeMajor(s string) (int, error) {
	v := strings.TrimPrefix(strings.TrimSpace(s), "v")
	major, _, _ := strings.Cut(v, ".")
	n, err := strconv.Atoi(major)
	if err != nil {
		return 0, fmt.Errorf("read the Node version from %q", s)
	}
	return n, nil
}
