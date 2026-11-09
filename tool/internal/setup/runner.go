package setup

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
)

// CloudflareAuth is the Cloudflare OAuth client the first approval exchanges its code through.
type CloudflareAuth interface {
	Exchange(ctx context.Context, code, verifier string) (*providers.OAuthToken, error)
}

// CloudflareAPI is the part of the Cloudflare API the opening and the account checks read. None
// of it writes.
type CloudflareAPI interface {
	Accounts(ctx context.Context) ([]providers.Account, error)
	UserEmail(ctx context.Context) (string, error)
	ActiveZones(ctx context.Context) ([]providers.Zone, error)
	ListZones(ctx context.Context) ([]providers.Zone, error)
	Subscriptions(ctx context.Context) ([]providers.Subscription, bool, error)
	WorkerExists(ctx context.Context, name string) (bool, error)
	D1DatabaseNamed(ctx context.Context, name string) (*providers.D1Database, error)
	R2BucketNamed(ctx context.Context, name string) (*providers.R2Bucket, error)
	DNSRecordsNamed(ctx context.Context, zoneID, name string) ([]providers.DNSRecord, error)
	WorkerDomainsFor(ctx context.Context, hostname string) ([]providers.WorkerDomain, error)
	WorkerRoutes(ctx context.Context, zoneID string) ([]providers.WorkerRoute, error)
}

// GitHubAPI is the part of the GitHub API the approval chain calls on api.github.com. Which
// credential a call needs (none, the App JWT, or the user token) is the client's, chosen when
// Config.GitHub builds it.
type GitHubAPI interface {
	ConvertManifest(ctx context.Context, code string) (providers.AppRecord, error)
	CreateRepo(ctx context.Context, name string) (providers.Repository, error)
	AppInstallations(ctx context.Context) ([]providers.Installation, error)
	DeleteInstallation(ctx context.Context, id int64) error
	ReadBackInstallation(ctx context.Context, appID, repoID int64) (providers.ReadBack, error)
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
	Value(kind secrets.EntryKind) (string, error)
}

// Saver writes the site record. *store.Store satisfies it: SaveNew draws the site id on the
// run's first save and Save replaces the record after.
type Saver interface {
	SaveNew(slug string, r record.Record) (string, error)
	Save(id string, r record.Record) error
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
	// name.
	GOOS string
	Env  map[string]string

	// Git reports whether git runs, and NodeVersion returns `node --version`'s output.
	Git         func(ctx context.Context) error
	NodeVersion func(ctx context.Context) (string, error)
	// FetchTemplate resolves and verifies the engine's template at the run's dist-tag.
	FetchTemplate func(ctx context.Context) (Template, error)
	// Listen binds the loopback tab; ListenLoopback in production.
	Listen func(cfg loopback.Config) (Tab, error)

	Vault Vault
	Store Saver

	CloudflareOAuth CloudflareAuth
	// Cloudflare builds an API client bound to accountID, empty before the account is known.
	Cloudflare func(accountID string, token providers.Credential) CloudflareAPI
	// GitHub builds an api.github.com client for cred: the zero Credential, the App JWT, or the
	// user token.
	GitHub    func(cred providers.Credential) GitHubAPI
	GitHubWeb GitHubWeb

	View View
	// Register hands each credential to the output scrub the moment it arrives.
	Register func(c providers.Credential)
	// Emit receives every event, on the runner's goroutine.
	Emit func(e Event)
	// Now reads the clock. After is the chain clock's timer, as time.After; nil means
	// time.After.
	Now   func() time.Time
	After func(d time.Duration) <-chan time.Time
}

// Result is what a run that reached the summary hands back for the owner's one Enter.
type Result struct {
	// SiteID is the record's id in the store.
	SiteID string
	// Record is the record as last saved.
	Record record.Record
	// Outline is the plan for the confirmed answers.
	Outline Outline
	// Summary is what the summary event carried.
	Summary Summary
}

// The runner's fixed limits.
const (
	// ProbeDeadline is how long the keyring probe waits on each call, long enough for an unlock
	// prompt.
	ProbeDeadline = 2 * time.Minute
	// MinNodeMajor is the oldest Node major the site's toolchain supports.
	MinNodeMajor = 24
	// chainSlack pads each browser wait past the chain's limit. The loopback's own clock stops the
	// chain at the limit once the tab opens; this deadline covers a tab that never opens.
	chainSlack = 2 * time.Minute
	// sweepTimeout bounds the over-grant sweep that runs after the run's own context has ended.
	sweepTimeout = 30 * time.Second
)

// run is one run's state. It lives on one goroutine.
type run struct {
	cfg    Config
	step   string
	tab    Tab
	siteID string
	rec    record.Record

	names        Names
	suffix       int
	suffixReason string
	tmpl         Template
	theme        scaffold.Theme

	access     providers.Credential
	account    providers.Account
	email      string
	cf         CloudflareAPI
	zone       providers.Zone
	zoneChosen bool
	addresses  []string

	app       providers.AppRecord
	user      providers.Credential
	repo      providers.Repository
	confirmed int64
}

// Run runs the opening, the four approvals, and the summary, and returns at the summary for the
// owner's one Enter. A stop returns a *Failure and emits it as step_failed. Run holds the
// loopback port from the opening's bind until it returns.
func Run(ctx context.Context, cfg Config) (Result, error) {
	if _, err := deriveNames(cfg.Answers.SiteName, 0); err != nil {
		return Result{}, err
	}
	if cfg.Answers.Posture != Decline && cfg.Answers.Posture != Invite {
		return Result{}, errPosture
	}
	r := &run{cfg: cfg}
	defer func() {
		if r.tab != nil {
			_ = r.tab.Close()
		}
	}()
	res, err := r.steps(ctx)
	if err != nil {
		f := r.fail(ctx, err, "")
		r.emit(Event{Kind: StepFailed, Step: f.Step, Failure: f})
		return Result{}, f
	}
	return res, nil
}

func (r *run) steps(ctx context.Context) (Result, error) {
	if err := r.opening(ctx); err != nil {
		return Result{}, err
	}
	if err := r.approveCloudflare(ctx); err != nil {
		return Result{}, err
	}
	if err := r.cloudflareChecks(ctx); err != nil {
		return Result{}, err
	}
	if err := r.githubChain(ctx); err != nil {
		return Result{}, err
	}
	return r.summary()
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

// save writes the record, drawing the site id on the first save.
func (r *run) save() error {
	r.rec.Setup.Folder = filepath.Join(r.cfg.Dir, r.names.Repository)
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
		f.Left = "What setup created stays in place, and the next run resumes from it."
	}
	return f
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

// did is the "already did" part: what exists outside this computer because of the run.
func (r *run) did() string {
	var parts []string
	if r.app.ID != 0 {
		parts = append(parts, "Setup created the GitHub App "+r.app.Slug+".")
	}
	if r.repo.ID != 0 {
		parts = append(parts, "Setup created the private repository "+r.repo.FullName+".")
	}
	if len(parts) == 0 {
		return nothingCreated
	}
	return strings.Join(parts, " ")
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
