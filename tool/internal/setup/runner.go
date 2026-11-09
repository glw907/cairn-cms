package setup

import (
	"context"
	"errors"
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

// Run runs the opening, the four approvals, and the summary. A stop returns a *Failure.
func Run(ctx context.Context, cfg Config) (Result, error) {
	return Result{}, errors.New("not implemented")
}

func nodeMajor(s string) (int, error) { return 0, errors.New("not implemented") }

func sweepOnResume(ctx context.Context, cfg Config, rec record.Record) error {
	return errors.New("not implemented")
}
