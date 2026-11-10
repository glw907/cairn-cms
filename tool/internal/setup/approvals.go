package setup

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/record"
	"github.com/glw907/cairn-cms/tool/v2/internal/secrets"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/loopback"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// installationsURL is where an owner removes an App installation by hand.
const installationsURL = "https://github.com/settings/installations"

// overGrantLeft is the "what is left" part of a stop that may leave an installation of the App
// slug reaching all the owner's repositories.
func overGrantLeft(slug string) string {
	return "An installation of " + slug + " may still reach all your repositories. Remove it at " + installationsURL + "."
}

// approveCloudflare runs approval 1: the consent page, which names the permission Cloudflare
// leaves unselected before it sends the tab on, PKCE consent on Cloudflare, the code exchange,
// the pair kept in the keyring before either token is used, and the granted-scope check. A grant without the
// scope that mints the deploy key shows error.html, whose Try again asks for consent afresh.
// state is WaitCloudflare, or WaitCloudflareReconsent for a resume whose stored grant is spent.
func (r *run) approveCloudflare(ctx context.Context, state WaitState) error {
	r.start(StepApproveCloudflare)
	page := PageConsent
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
				"Run cairn new again. On the Cloudflare page, select API Tokens: Write, and then select Allow.", nil)
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
			r.emit(Event{Kind: StepDone, Step: r.step, Credential: CredentialApproval})
			return nil
		}
		page = PageScopeError
	}
}

// useToken stands in for approval 1 on a token run: the supplied token is the run's Cloudflare
// credential, so no tab opens and nothing reaches the keyring.
func (r *run) useToken() {
	r.start(StepApproveCloudflare)
	r.emit(Event{Kind: StepDone, Step: r.step, Credential: CredentialToken})
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
		if _, serr := r.sweep(sctx, r.confirmed); serr != nil {
			f := r.fail(ctx, err, "")
			f.Left = overGrantLeft(r.app.Slug)
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
	if app.OwnerLogin == "" {
		f := r.failure(ReasonNotOurs, "GitHub didn't say which account owns the GitHub App "+app.Slug+", so setup can't check that later approvals come from that account.",
			"Delete the App, and then run cairn new again. Setup creates a new App.", nil)
		f.Did = "Setup created the GitHub App " + app.Slug + ". Delete it at https://github.com/settings/apps/" + app.Slug + "."
		f.Left = "The App stays on GitHub until you delete it."
		return f
	}
	r.rec.Setup.IDs.AppID = app.ID
	r.rec.Setup.AppSlug = app.Slug
	r.rec.Setup.ClientID = app.ClientID
	r.rec.Setup.AppOwner = app.OwnerLogin
	r.rec.Setup.OwnerID = app.OwnerID
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
	if _, err := r.sweep(ctx, 0); err != nil {
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
	if _, err := r.sweep(ctx, 0); err != nil {
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

// installCallback shows url and waits for the install redirect. The installation id the redirect
// carries is never recorded: any page that reaches the route can choose it, so only the id the
// read-back confirms goes in the record, and the sweep deletes whatever a stop leaves unconfirmed.
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
	return cb, nil
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
// login, which setup learns only with the user token this approval issues. An earlier run may
// have created the repository and stopped before recording it. So when the refused name is the
// record's intent and no repository is recorded, setup reads it before taking a suffix.
//
// Before any create, the user token's account must be the App's owner: a token from another
// account would create the repository there, or read that account's taken names as clashes and
// walk the suffixes.
func (r *run) createRepo(ctx context.Context) error {
	gh := r.cfg.GitHub(r.user)
	login, id, err := gh.User(ctx)
	if err != nil {
		return r.fail(ctx, err, "GitHub")
	}
	if !r.isOwner(login, id) {
		return r.wrongAccount(login)
	}
	unknown := r.rec.Setup.Intents.Repo == r.names.Repository && r.rec.GitHub.Repo.ID == 0
	for {
		r.rec.Setup.Intents.Repo = r.names.Repository
		if err := r.save(); err != nil {
			return err
		}
		repo, err := gh.CreateRepo(ctx, r.names.Repository)
		if errors.Is(err, providers.ErrRepoNameTaken) && unknown {
			unknown = false
			repo, err = r.adoptRepo(ctx, gh)
		}
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
		if !r.isOwner(repo.Owner.Login, repo.Owner.ID) {
			return r.repoElsewhere(repo)
		}
		r.repo = repo
		r.rec.GitHub.Repo = record.GitHubRepo{ID: repo.ID, Owner: repo.Owner.Login, Repo: repo.Name, DefaultBranch: repo.DefaultBranch}
		// A zero id is GitHub naming no id, which must not erase the one the App's conversion gave.
		if repo.Owner.ID != 0 {
			r.rec.Setup.OwnerID = repo.Owner.ID
		}
		r.rec.Step = string(spine.StepRepoCreated)
		return r.save()
	}
}

// adoptRepo reads the repository of the recorded intent's name and returns it when the App's
// owner holds it, it is private, and it has no commits, which is what a create that landed
// before a stop leaves. A repository the read cannot see falls back to the taken-name suffix;
// any other is not setup's, and a suffix would leave the earlier run's repository behind, so the
// run stops.
func (r *run) adoptRepo(ctx context.Context, gh GitHubAPI) (providers.Repository, error) {
	owner, name := r.app.OwnerLogin, r.names.Repository
	repo, err := gh.RepoNamed(ctx, owner, name)
	switch {
	case err != nil:
		return providers.Repository{}, err
	case repo == nil:
		return providers.Repository{}, providers.ErrRepoNameTaken
	case !r.isOwner(repo.Owner.Login, repo.Owner.ID), !repo.Private:
		return providers.Repository{}, r.repoNotOurs(owner, name)
	}
	// GitHub answers a commit read of a repository with no commits with 409 "Git Repository is
	// empty."
	_, err = gh.HeadSHA(ctx, owner, name, repo.DefaultBranch)
	switch status := httpStatus(err); {
	case status == http.StatusConflict:
		return *repo, nil
	case err == nil, status == http.StatusNotFound:
		return providers.Repository{}, r.repoNotOurs(owner, name)
	}
	return providers.Repository{}, err
}

// repoNotOurs is the stop for a repository of setup's name that setup can't show it created.
func (r *run) repoNotOurs(owner, name string) *Failure {
	return r.failure(ReasonNotOurs, "A repository named "+owner+"/"+name+" already exists on your GitHub account, and setup can't confirm it's the one it created.",
		"If you don't need it, delete it under Settings on the repository's GitHub page, and then run cairn new again.", nil)
}

// repoElsewhere is the stop for a repository GitHub created under an account other than the
// App's owner. No installation of the App can reach it, so the run records nothing of it.
func (r *run) repoElsewhere(repo providers.Repository) *Failure {
	f := r.failure(ReasonNotOurs, "GitHub created the repository under the account "+repo.Owner.Login+
		", not "+r.app.OwnerLogin+", the account that owns the GitHub App "+r.app.Slug+".",
		"Sign in to GitHub as "+r.app.OwnerLogin+", delete "+repo.Owner.Login+"/"+repo.Name+
			" under Settings on its GitHub page if you don't need it, and then run cairn new again.", nil)
	f.Did += " Setup created the private repository " + repo.Owner.Login + "/" + repo.Name + "."
	f.Left = "The repository " + repo.Owner.Login + "/" + repo.Name + " stays on GitHub until you delete it."
	return f
}

// wrongAccount is the stop for a user token that belongs to login, an account other than the
// App's owner, found before setup creates anything with it.
func (r *run) wrongAccount(login string) *Failure {
	return r.failure(ReasonNotOurs, "You approved the GitHub install as "+login+", not "+r.app.OwnerLogin+
		", the account that owns the GitHub App "+r.app.Slug+".",
		"Sign in to GitHub as "+r.app.OwnerLogin+", and then run cairn new again.", nil)
}

// isOwner reports whether the account with login and id is the App's owner. Ids compare when
// both are known, since a login can be renamed and then taken by another account. Otherwise the
// logins compare without regard to case, as GitHub's do.
func (r *run) isOwner(login string, id int64) bool {
	if id != 0 && r.app.OwnerID != 0 {
		return id == r.app.OwnerID
	}
	return strings.EqualFold(login, r.app.OwnerLogin)
}

// installRepo runs approval 4: an install preselected to the new repository, confirmed by the
// read-back. Anything but exactly that repository is deleted and the tab is sent back, until the
// owner approves the right grant or the chain's clock runs out. A resume past the approvals
// whose installation the sweep removed runs it again, and the record keeps the step it reached.
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
		if !reached(r.rec.Step, spine.StepInstalled) {
			r.rec.Step = string(spine.StepInstalled)
		}
		if err := r.save(); err != nil {
			return err
		}
		break
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
// deleted rather than trusted. Another App's installation is never touched. keptGone reports
// that keep itself was deleted, which the owner widening it to all repositories causes.
func (r *run) sweep(ctx context.Context, keep int64) (keptGone bool, err error) {
	gh, err := r.appClient()
	if err != nil {
		return false, err
	}
	list, err := gh.AppInstallations(ctx)
	if err != nil {
		return false, err
	}
	var errs []error
	for _, in := range list {
		if in.AppID != r.app.ID || (in.ID == keep && in.RepositorySelection == "selected") {
			continue
		}
		if err := gh.DeleteInstallation(ctx, in.ID); err != nil {
			errs = append(errs, err)
			continue
		}
		keptGone = keptGone || in.ID == keep
	}
	return keptGone, errors.Join(errs...)
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
	keptGone, err := r.sweep(ctx, keep)
	if err != nil {
		return err
	}
	switch {
	case keep == 0:
		return nil
	case keptGone:
		return errOverGrant
	}
	return r.checkKept(ctx, keep)
}

// dropApp is the stop for a recorded App setup can't act as. It deletes the App's key and client
// secret from the keyring, then drops the App from the record, so the next run creates a new one,
// and says how to delete this one. A delete the keyring refuses stops with the record as it was,
// so the next run tries the delete again.
func (r *run) dropApp(reason Reason, happened string, err error) error {
	slug := r.rec.Setup.AppSlug
	if derr := r.cfg.Vault.DeleteEntries(r.appEntries()); derr != nil {
		f := r.failure(ReasonKeyring, "Setup couldn't delete the keys of the GitHub App "+slug+" from the keyring.",
			"Unlock the keyring, and then run cairn new again.", derr)
		f.Left = "The keyring still holds the key and client secret of the GitHub App " + slug + "."
		return f
	}
	r.app = providers.AppRecord{}
	r.rec.Setup.IDs.AppID, r.rec.Setup.AppSlug, r.rec.Setup.ClientID, r.rec.Setup.AppOwner, r.rec.Setup.Intents.App = 0, "", "", "", ""
	r.rec.Setup.OwnerID = 0
	r.rec.Step = string(spine.StepSetupStarted)
	if err := r.save(); err != nil {
		return err
	}
	return r.failure(reason, happened,
		"Delete the App at https://github.com/settings/apps/"+slug+", and then run cairn new again. Setup creates a new App.", err)
}

// appEntries returns the keyring entries the record names for the App's key and client secret.
// An entry the record does not name was never written, since a name is recorded before its write.
func (r *run) appEntries() []string {
	var out []string
	for _, k := range []secrets.EntryKind{secrets.EntryAppKey, secrets.EntryAppClientSecret} {
		if name := r.cfg.Vault.Entry(k); slices.Contains(r.rec.Setup.KeyringEntries, name) {
			out = append(out, name)
		}
	}
	return out
}

// errOverGrant reports that the recorded installation is gone: it reached more than the
// recorded repository and setup deleted it, or it no longer exists.
var errOverGrant = errors.New("setup: the App's installation reaches more than the site's repository")

// checkKept lists what the kept installation reaches through its own token, the one view of
// its repositories the App has, and deletes it unless the list is exactly the recorded
// repository. An installation GitHub no longer has is gone the same way.
func (r *run) checkKept(ctx context.Context, id int64) error {
	gh, err := r.appClient()
	if err != nil {
		return err
	}
	tok, _, err := gh.InstallationToken(ctx, id)
	if httpStatus(err) == http.StatusNotFound {
		return errOverGrant
	}
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
	// A failed delete is not errOverGrant: the installation still reaches more than the site's
	// repository, which the stop must say.
	if err := gh.DeleteInstallation(ctx, id); err != nil {
		return err
	}
	return errOverGrant
}

// resumeGitHub sweeps a resumed run's installations, then reads the App's client secret back,
// so the approvals and the watch act as the App the record names. A record whose App key never
// reached the keyring drops the App, since setup cannot act as it, and stops with the way to
// delete it. When the sweep removes the recorded installation, the record drops its id and
// approval 4 runs again at the step the record holds. A stop before the sweep finished says
// that an installation may still reach all the owner's repositories.
func (r *run) resumeGitHub(ctx context.Context) error {
	err := r.resumeSweep(ctx)
	swept := err == nil || errors.Is(err, errOverGrant)
	if errors.Is(err, errOverGrant) {
		r.rec.GitHub.InstallationID = 0
		err = r.save()
	}
	var secret string
	if err == nil {
		secret, err = r.cfg.Vault.Value(secrets.EntryAppClientSecret)
		if errors.Is(err, secrets.ErrNotFound) {
			err = errAppKeyLost
		}
	}
	slug := r.rec.Setup.AppSlug
	switch {
	case errors.Is(err, errAppKeyLost):
		return r.dropApp(ReasonKeyringWrite, "The keyring doesn't hold the key of the GitHub App "+slug+", so setup can't use that App.", err)
	case errors.Is(err, secrets.ErrKeyringUnavailable):
		f := r.failure(ReasonKeyring, "Setup couldn't read the GitHub App's keys from the keyring.",
			"Unlock the keyring, and then run cairn new again.", err)
		if !swept {
			f.Left = overGrantLeft(r.rec.Setup.AppSlug)
		}
		return f
	case err != nil:
		f := r.fail(ctx, err, "GitHub")
		if !swept {
			f.Left = overGrantLeft(r.rec.Setup.AppSlug)
		}
		return f
	}
	r.app.ClientSecret = providers.NewCredential(secret)
	r.app.OwnerLogin, r.app.OwnerID = r.rec.Setup.AppOwner, r.rec.Setup.OwnerID
	if r.app.OwnerLogin == "" {
		r.app.OwnerLogin = r.rec.GitHub.Repo.Owner
	}
	r.register(r.app.ClientSecret)
	if r.app.OwnerLogin == "" {
		return r.dropApp(ReasonNotOurs, "Setup's record doesn't name the account that owns the GitHub App "+slug+
			", so setup can't check that later approvals come from that account.", nil)
	}
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
