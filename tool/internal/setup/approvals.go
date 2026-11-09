package setup

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"strconv"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// installationsURL is where an owner removes an App installation by hand.
const installationsURL = "https://github.com/settings/installations"

// approveCloudflare runs approval 1: PKCE consent in the tab, the code exchange, the pair kept in
// the keyring before either token is used, and the granted-scope check. A grant without the
// scope that mints the deploy key shows error.html, whose Try again asks for consent afresh.
// state is WaitCloudflare, or WaitCloudflareReconsent for a resume whose stored grant is spent.
func (r *run) approveCloudflare(ctx context.Context, state WaitState) error {
	r.start(StepApproveCloudflare)
	page := PageRedirect
	for {
		verifier, challenge, err := providers.NewPKCE()
		if err != nil {
			return err
		}
		r.registerValue(verifier)
		nonce, err := r.tab.Arm(loopback.CloudflareCallback)
		if err != nil {
			return r.fail(ctx, err, "")
		}
		if err := r.tab.Show(Page{Kind: page, URL: providers.AuthorizeURL(nonce, challenge)}); err != nil {
			return err
		}
		if err := r.ensureOpen(ctx); err != nil {
			return err
		}
		r.waiting(state)
		cb, err := r.await(ctx, loopback.CloudflareCallback)
		if err != nil {
			return r.fail(ctx, err, "")
		}
		if cb.Error != "" {
			return r.failure(ReasonDeclined, "The Cloudflare approval was declined.",
				"Run cairn new again, and select Allow on the Cloudflare page.", nil)
		}
		r.registerValue(cb.Code)
		tok, err := r.cfg.CloudflareOAuth.Exchange(ctx, cb.Code, verifier)
		if err != nil {
			return r.fail(ctx, err, "Cloudflare")
		}
		if err := r.keepPair(tok); err != nil {
			return err
		}
		if tok.MissingScope(providers.MintScope) == "" {
			r.done()
			return nil
		}
		page = PageScopeError
	}
}

// keepPair registers a new pair with the scrub, names its two entries in the record, and stores
// it before either token is used, so a write that lands late is still one the record can reach.
func (r *run) keepPair(tok *providers.OAuthToken) error {
	r.registerValue(tok.AccessToken, tok.RefreshToken)
	r.nameEntries(secrets.EntryCloudflareRefresh, secrets.EntryCloudflareAccess)
	if err := r.save(); err != nil {
		return err
	}
	pair := secrets.OAuthPair{Access: tok.AccessToken, Refresh: tok.RefreshToken}
	if err := r.cfg.Vault.PutPair(pair); err != nil {
		return r.failure(ReasonKeyringWrite, "Setup couldn't store the Cloudflare approval in the keyring.",
			"Unlock the keyring, and then run cairn new again.", err)
	}
	r.pair, r.access, r.grantAt = pair, providers.NewCredential(tok.AccessToken), r.cfg.Now()
	if r.account.ID != "" {
		r.cf = r.cfg.Cloudflare(r.account.ID, r.access)
	}
	return nil
}

func (r *run) nameEntries(kinds ...secrets.EntryKind) {
	for _, k := range kinds {
		name := r.cfg.Vault.Entry(k)
		if !slices.Contains(r.rec.Setup.KeyringEntries, name) {
			r.rec.Setup.KeyringEntries = append(r.rec.Setup.KeyringEntries, name)
		}
	}
}

// githubChain runs whichever of approvals 2 to 4 the record has not reached. Whatever ends it
// early, an error, a cancelled context, or the 30-minute stop, the sweep then deletes every
// installation the read-back has not confirmed, on a context of its own since the run's may be
// done.
func (r *run) githubChain(ctx context.Context) (err error) {
	defer func() {
		if err == nil || r.app.ID == 0 {
			return
		}
		sctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), sweepTimeout)
		defer cancel()
		if serr := r.sweep(sctx, r.confirmed); serr != nil {
			f := r.fail(ctx, err, "")
			f.Left = "An installation of " + r.app.Slug + " may still reach all your repositories. Remove it at " + installationsURL + "."
			err = f
		}
	}()
	if !reached(r.rec.Step, spine.StepAppCreated) {
		if err := r.createApp(ctx); err != nil {
			return err
		}
	}
	if !reached(r.rec.Step, spine.StepRepoCreated) {
		if err := r.installAll(ctx); err != nil {
			return err
		}
	}
	return r.installRepo(ctx)
}

// createApp runs approval 2: the manifest posts from the tab, and the conversion's key and
// client secret reach the keyring before the record's step advances. The slug comes from the
// conversion: when the planned name is taken, the owner edits it on GitHub's page.
func (r *run) createApp(ctx context.Context) error {
	r.start(StepApproveCreateApp)
	r.rec.Setup.Intents.App = r.names.App
	if err := r.save(); err != nil {
		return err
	}
	if _, err := r.tab.Arm(loopback.GitHubManifest); err != nil {
		return r.fail(ctx, err, "")
	}
	m := providers.NewManifest(r.names.Base, loopback.Port)
	m.Name = r.names.App
	manifest, err := json.Marshal(m)
	if err != nil {
		return err
	}
	if err := r.tab.Show(Page{Kind: PageManifest, Manifest: string(manifest)}); err != nil {
		return err
	}
	if err := r.ensureOpen(ctx); err != nil {
		return err
	}
	r.waiting(WaitCreateApp)
	cb, err := r.await(ctx, loopback.GitHubManifest)
	if err != nil {
		return r.fail(ctx, err, "")
	}
	r.registerValue(cb.Code)
	app, err := r.cfg.GitHub(providers.Credential{}).ConvertManifest(ctx, cb.Code)
	if err != nil {
		return r.fail(ctx, err, "GitHub")
	}
	r.register(app.PEM, app.ClientSecret, app.WebhookSecret)
	r.app = app
	r.rec.Setup.IDs.AppID = app.ID
	r.rec.Setup.AppSlug = app.Slug
	r.rec.Setup.ClientID = app.ClientID
	r.nameEntries(secrets.EntryAppKey, secrets.EntryAppClientSecret)
	if err := r.save(); err != nil {
		return err
	}
	if err := keepCredential(r.cfg.Vault, secrets.EntryAppKey, app.PEM); err != nil {
		return r.appKeyFailure(err)
	}
	if err := keepCredential(r.cfg.Vault, secrets.EntryAppClientSecret, app.ClientSecret); err != nil {
		return r.appKeyFailure(err)
	}
	r.rec.Step = string(spine.StepAppCreated)
	if err := r.save(); err != nil {
		return err
	}
	r.done()
	return nil
}

// appKeyFailure is the stop for an App whose key the keyring would not take: without the key the
// App is unusable, and GitHub offers no API to delete it.
func (r *run) appKeyFailure(err error) *Failure {
	f := r.failure(ReasonKeyringWrite, "Setup couldn't store the GitHub App's key in the keyring.",
		"Unlock the keyring, delete the App, and then run cairn new again.", err)
	f.Did = "Setup created the GitHub App " + r.app.Slug + ". Delete it at https://github.com/settings/apps/" + r.app.Slug + "."
	return f
}

// installAll runs approval 3: the owner installs the App on all repositories, the user token
// creates the private repository, and the sweep deletes the all-repositories installation. A
// callback whose code GitHub calls wrong or expired sends the tab back to the install page,
// since a callback without state can come from another page.
func (r *run) installAll(ctx context.Context) error {
	r.start(StepApproveInstall)
	if err := r.sweep(ctx, 0); err != nil {
		return r.installDeleteFailure(ctx, err)
	}
	for {
		cb, err := r.installCallback(ctx, providers.InstallURL(r.app.Slug), WaitInstallAll)
		if err != nil {
			return err
		}
		tok, ok, err := r.exchange(ctx, cb)
		if err != nil {
			return err
		}
		if ok {
			r.user = tok
			break
		}
	}
	if err := r.createRepo(ctx); err != nil {
		return err
	}
	if err := r.sweep(ctx, 0); err != nil {
		return r.installDeleteFailure(ctx, err)
	}
	r.done()
	return nil
}

func (r *run) installDeleteFailure(ctx context.Context, err error) *Failure {
	if ctx.Err() != nil {
		return r.fail(ctx, err, "")
	}
	f := r.failure(ReasonInstallDelete, "Setup couldn't remove the GitHub App's access to all your repositories.",
		"Remove the installation at "+installationsURL+", and then run cairn new again.", err)
	f.Left = "An installation of " + r.app.Slug + " may still reach all your repositories."
	return f
}

// installCallback shows url, waits for the install redirect, and stores its installation id
// before any other call.
func (r *run) installCallback(ctx context.Context, url string, state WaitState) (loopback.Callback, error) {
	if _, err := r.tab.Arm(loopback.GitHubCallback); err != nil {
		return loopback.Callback{}, r.fail(ctx, err, "")
	}
	if err := r.tab.Show(Page{Kind: PageRedirect, URL: url}); err != nil {
		return loopback.Callback{}, err
	}
	if err := r.ensureOpen(ctx); err != nil {
		return loopback.Callback{}, err
	}
	r.waiting(state)
	cb, err := r.await(ctx, loopback.GitHubCallback)
	if err != nil {
		return loopback.Callback{}, r.fail(ctx, err, "")
	}
	r.registerValue(cb.Code)
	id, err := strconv.ParseInt(cb.InstallationID, 10, 64)
	if err != nil {
		return loopback.Callback{}, err
	}
	r.rec.GitHub.InstallationID = id
	return cb, r.save()
}

// exchange trades an install callback's code for the user token. Only a code GitHub calls wrong
// or expired, which is what a callback another page consumed first looks like, reports ok false
// so the caller resends the tab; any other failure stops the run.
func (r *run) exchange(ctx context.Context, cb loopback.Callback) (tok providers.Credential, ok bool, err error) {
	tok, err = r.cfg.GitHubWeb.ExchangeCode(ctx, r.app.ClientID, r.app.ClientSecret, cb.Code, "")
	if errors.Is(err, providers.ErrBadVerificationCode) && ctx.Err() == nil {
		return providers.Credential{}, false, nil
	}
	if err != nil {
		return providers.Credential{}, false, r.fail(ctx, err, "GitHub")
	}
	r.register(tok)
	return tok, true, nil
}

// createRepo creates the private repository. A name GitHub refuses as taken, which a private
// repository can be without showing to any read, moves all four names to the next suffix and
// reruns the Cloudflare name checks for it. That refusal is the only clash check for the
// repository: spec 3's unauthenticated public-name read before approval 3 needs the owner's
// login, which setup learns only with the user token this approval issues.
func (r *run) createRepo(ctx context.Context) error {
	gh := r.cfg.GitHub(r.user)
	for {
		r.rec.Setup.Intents.Repo = r.names.Repository
		if err := r.save(); err != nil {
			return err
		}
		repo, err := gh.CreateRepo(ctx, r.names.Repository)
		if errors.Is(err, providers.ErrRepoNameTaken) {
			if r.suffixReason == "" {
				r.suffixReason = "A repository named " + r.names.Repository + " already exists on your GitHub account."
			}
			if err := r.freeNames(ctx, nextSuffix(r.suffix)); err != nil {
				return err
			}
			continue
		}
		if err != nil {
			return r.fail(ctx, err, "GitHub")
		}
		r.repo = repo
		r.rec.GitHub.Repo = record.GitHubRepo{ID: repo.ID, Owner: repo.Owner.Login, Repo: repo.Name, DefaultBranch: repo.DefaultBranch}
		r.rec.Setup.OwnerID = repo.Owner.ID
		r.rec.Step = string(spine.StepRepoCreated)
		return r.save()
	}
}

// installRepo runs approval 4: an install preselected to the new repository, confirmed by the
// read-back. Anything but exactly that repository is deleted and the tab is sent back, until the
// owner approves the right grant or the chain's clock runs out.
func (r *run) installRepo(ctx context.Context) error {
	r.start(StepApproveRepo)
	url := providers.PreselectURL(r.app.Slug, r.repo.Owner.ID, r.repo.ID)
	for {
		cb, err := r.installCallback(ctx, url, WaitInstallRepo)
		if err != nil {
			return err
		}
		tok, ok, err := r.exchange(ctx, cb)
		if err != nil {
			return err
		}
		if !ok {
			continue
		}
		rb, err := r.cfg.GitHub(tok).ReadBackInstallation(ctx, r.app.ID, r.repo.ID)
		// Asking again is safe: a private App has at most one installation per owner, so the
		// owner's next approval replaces whatever this one left, and the deferred sweep deletes
		// anything unconfirmed when the chain exits.
		if errors.Is(err, providers.ErrInstallationNotFound) {
			continue
		}
		if err != nil {
			return r.fail(ctx, err, "GitHub")
		}
		if rb.Status != providers.ReadBackOK {
			if err := r.deleteInstallation(ctx, rb.InstallationID); err != nil {
				return r.installDeleteFailure(ctx, err)
			}
			continue
		}
		r.confirmed = rb.InstallationID
		r.rec.GitHub.InstallationID = rb.InstallationID
		r.rec.Step = string(spine.StepInstalled)
		if err := r.save(); err != nil {
			return err
		}
		break
	}
	if err := r.tab.Show(Page{Kind: PageDone}); err != nil {
		return err
	}
	r.done()
	return nil
}

// appClient returns an api.github.com client acting as the App, through a fresh JWT.
func (r *run) appClient() (GitHubAPI, error) {
	jwt, err := providers.AppJWT(r.app.ID, r.app.PEM, r.cfg.Now())
	if err != nil {
		return nil, err
	}
	r.register(jwt)
	return r.cfg.GitHub(jwt), nil
}

func (r *run) deleteInstallation(ctx context.Context, id int64) error {
	gh, err := r.appClient()
	if err != nil {
		return err
	}
	return gh.DeleteInstallation(ctx, id)
}

// sweep deletes every installation of the run's App except keep, the one the read-back
// confirmed, and keeps that one only while it is still scoped to selected repositories. The App
// JWT cannot list an installation's repositories, so an installation the read-back never saw is
// deleted rather than trusted. Another App's installation is never touched.
func (r *run) sweep(ctx context.Context, keep int64) error {
	gh, err := r.appClient()
	if err != nil {
		return err
	}
	list, err := gh.AppInstallations(ctx)
	if err != nil {
		return err
	}
	var errs []error
	for _, in := range list {
		if in.AppID != r.app.ID || (in.ID == keep && in.RepositorySelection == "selected") {
			continue
		}
		if err := gh.DeleteInstallation(ctx, in.ID); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// errAppKeyLost reports a record that holds an App whose key never reached the keyring.
var errAppKeyLost = errors.New("setup: the GitHub App's key is not in the keyring")

// sweepOnResume is a resumed run's first GitHub act for a record that holds an App id: it reads
// the App key back from the keyring and sweeps every installation but the one the record
// confirmed, which it keeps at every step from installed on and only while that installation
// reaches exactly the recorded repository.
func sweepOnResume(ctx context.Context, cfg Config, rec record.Record) error {
	r := &run{cfg: cfg, rec: rec}
	return r.resumeSweep(ctx)
}

func (r *run) resumeSweep(ctx context.Context) error {
	pem, err := r.cfg.Vault.Value(secrets.EntryAppKey)
	if errors.Is(err, secrets.ErrNotFound) {
		return errAppKeyLost
	}
	if err != nil {
		return err
	}
	r.app.ID, r.app.Slug, r.app.ClientID = r.rec.Setup.IDs.AppID, r.rec.Setup.AppSlug, r.rec.Setup.ClientID
	r.app.PEM = providers.NewCredential(pem)
	r.register(r.app.PEM)
	var keep int64
	if reached(r.rec.Step, spine.StepInstalled) {
		keep = r.rec.GitHub.InstallationID
	}
	if err := r.sweep(ctx, keep); err != nil {
		return err
	}
	if keep == 0 {
		return nil
	}
	return r.checkKept(ctx, keep)
}

// errOverGrant reports a kept installation that reaches more than the recorded repository.
var errOverGrant = errors.New("setup: the App's installation reaches more than the site's repository")

// checkKept lists what the kept installation reaches through its own token, the one view of
// its repositories the App has, and deletes it unless the list is exactly the recorded
// repository.
func (r *run) checkKept(ctx context.Context, id int64) error {
	gh, err := r.appClient()
	if err != nil {
		return err
	}
	tok, _, err := gh.InstallationToken(ctx, id)
	if err != nil {
		return err
	}
	r.register(tok)
	repos, err := r.cfg.GitHub(tok).InstallationRepositories(ctx)
	if err != nil {
		return err
	}
	if len(repos) == 1 && repos[0] == r.rec.GitHub.Repo.ID {
		return nil
	}
	if err := gh.DeleteInstallation(ctx, id); err != nil {
		return errors.Join(errOverGrant, err)
	}
	return errOverGrant
}

// resumeGitHub sweeps a resumed run's installations, then reads the App's client secret back,
// so the approvals and the watch act as the App the record names. A record whose App key never
// reached the keyring drops the App, since setup cannot act as it, and stops with the way to
// delete it.
func (r *run) resumeGitHub(ctx context.Context) error {
	err := r.resumeSweep(ctx)
	var secret string
	if err == nil {
		secret, err = r.cfg.Vault.Value(secrets.EntryAppClientSecret)
		if errors.Is(err, secrets.ErrNotFound) {
			err = errAppKeyLost
		}
	}
	switch {
	case errors.Is(err, errAppKeyLost):
		slug := r.rec.Setup.AppSlug
		r.app = providers.AppRecord{}
		r.rec.Setup.IDs.AppID, r.rec.Setup.AppSlug, r.rec.Setup.ClientID, r.rec.Setup.Intents.App = 0, "", "", ""
		r.rec.Step = string(spine.StepSetupStarted)
		if err := r.save(); err != nil {
			return err
		}
		f := r.failure(ReasonKeyringWrite, "The keyring doesn't hold the key of the GitHub App "+slug+", so setup can't use that App.",
			"Delete the App at https://github.com/settings/apps/"+slug+", and then run cairn new again. Setup creates a new App.", err)
		return f
	case errors.Is(err, errOverGrant):
		r.rec.GitHub.InstallationID = 0
		r.rec.Step = string(spine.StepRepoCreated)
		_ = r.save()
		return r.failure(ReasonInstallDelete, "The GitHub App's installation reached more than the "+r.rec.GitHub.Repo.Repo+" repository, so setup removed it.",
			"Run cairn new again, and approve access to "+r.rec.GitHub.Repo.Repo+" only.", err)
	case errors.Is(err, secrets.ErrKeyringUnavailable):
		return r.failure(ReasonKeyring, "Setup couldn't read the GitHub App's keys from the keyring.",
			"Unlock the keyring, and then run cairn new again.", err)
	case err != nil:
		return r.fail(ctx, err, "GitHub")
	}
	r.app.ClientSecret = providers.NewCredential(secret)
	r.app.OwnerLogin = r.rec.GitHub.Repo.Owner
	r.register(r.app.ClientSecret)
	if g := r.rec.GitHub.Repo; g.ID != 0 {
		r.repo = providers.Repository{ID: g.ID, Name: g.Repo, FullName: g.Owner + "/" + g.Repo, DefaultBranch: g.DefaultBranch}
		r.repo.Owner.Login, r.repo.Owner.ID = g.Owner, r.rec.Setup.OwnerID
	}
	if reached(r.rec.Step, spine.StepInstalled) {
		r.confirmed = r.rec.GitHub.InstallationID
	}
	// Both keys in the keyring finish approval 2, even when the run stopped before the record's
	// step said so; creating the App again would leave this one behind.
	if !reached(r.rec.Step, spine.StepAppCreated) {
		r.rec.Step = string(spine.StepAppCreated)
		return r.save()
	}
	return nil
}
