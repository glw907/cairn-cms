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
func (r *run) approveCloudflare(ctx context.Context) error {
	r.start(StepApproveCloudflare)
	page := PageRedirect
	for opened := false; ; opened = true {
		verifier, challenge, err := providers.NewPKCE()
		if err != nil {
			return err
		}
		r.registerValue(verifier)
		state, err := r.tab.Arm(loopback.CloudflareCallback)
		if err != nil {
			return r.fail(ctx, err, "")
		}
		if err := r.tab.Show(Page{Kind: page, URL: providers.AuthorizeURL(state, challenge)}); err != nil {
			return err
		}
		if !opened {
			if err := r.cfg.View.OpenBrowser(ctx, r.tab.URL()); err != nil {
				return r.fail(ctx, err, "")
			}
		}
		r.waiting(WaitCloudflare)
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
		r.registerValue(tok.AccessToken, tok.RefreshToken)
		if err := r.keepPair(tok); err != nil {
			return err
		}
		if tok.MissingScope(providers.MintScope) == "" {
			r.access = providers.NewCredential(tok.AccessToken)
			r.done()
			return nil
		}
		page = PageScopeError
	}
}

// keepPair names the pair's two entries in the record, then stores the pair, so a write that
// lands late is still one the record can reach.
func (r *run) keepPair(tok *providers.OAuthToken) error {
	r.nameEntries(secrets.EntryCloudflareRefresh, secrets.EntryCloudflareAccess)
	if err := r.save(); err != nil {
		return err
	}
	if err := r.cfg.Vault.PutPair(secrets.OAuthPair{Access: tok.AccessToken, Refresh: tok.RefreshToken}); err != nil {
		return r.failure(ReasonKeyringWrite, "Setup couldn't store the Cloudflare approval in the keyring.",
			"Unlock the keyring, and then run cairn new again.", err)
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

// githubChain runs approvals 2 to 4. Whatever ends it early, an error, a cancelled context, or
// the 30-minute stop, the sweep then deletes every installation the read-back has not
// confirmed, on a context of its own since the run's may be done.
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
	if err := r.createApp(ctx); err != nil {
		return err
	}
	if err := r.installAll(ctx); err != nil {
		return err
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
// callback whose code does not exchange sends the tab back to the install page, since a callback
// without state can come from another page.
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

// exchange trades an install callback's code for the user token. A code that does not exchange
// reports ok false and no error, so the caller resends the tab.
func (r *run) exchange(ctx context.Context, cb loopback.Callback) (tok providers.Credential, ok bool, err error) {
	tok, err = r.cfg.GitHubWeb.ExchangeCode(ctx, r.app.ClientID, r.app.ClientSecret, cb.Code, "")
	if err != nil {
		if ctx.Err() != nil {
			return providers.Credential{}, false, r.fail(ctx, err, "")
		}
		return providers.Credential{}, false, nil
	}
	r.register(tok)
	return tok, true, nil
}

// createRepo creates the private repository. A name GitHub refuses as taken, which a private
// repository can be without showing to any read, moves all four names to the next suffix and
// reruns the Cloudflare name checks for it.
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
		r.rec.GitHub.Repo = record.GitHubRepo{ID: repo.ID, Owner: repo.Owner.Login, Repo: repo.Name}
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

// sweepOnResume is a resumed run's first GitHub act for a record that holds an App id: it reads
// the App key back from the keyring and sweeps every installation but the one the record
// confirmed at step installed.
func sweepOnResume(ctx context.Context, cfg Config, rec record.Record) error {
	pem, err := cfg.Vault.Value(secrets.EntryAppKey)
	if err != nil {
		return err
	}
	r := &run{cfg: cfg, rec: rec}
	r.app = providers.AppRecord{ID: rec.Setup.IDs.AppID, Slug: rec.Setup.AppSlug, PEM: providers.NewCredential(pem)}
	r.register(r.app.PEM)
	var keep int64
	if rec.Step == string(spine.StepInstalled) {
		keep = rec.GitHub.InstallationID
	}
	return r.sweep(ctx, keep)
}

// summary draws up the plan for the answers and emits it for the owner's review.
func (r *run) summary() (Result, error) {
	r.step = StepSummary
	out, err := Plan(Answers{
		SiteName:   r.cfg.Answers.SiteName,
		OwnerEmail: r.email,
		Posture:    r.cfg.Answers.Posture,
		Zone:       r.zone.Name,
		Host:       r.zone.Name,
		Theme:      r.theme.ID,
		AccountID:  r.account.ID,
		Suffix:     r.suffix,
	})
	if err != nil {
		return Result{}, err
	}
	s := Summary{
		SiteName:         r.cfg.Answers.SiteName,
		Repository:       out.Names.Repository,
		Worker:           out.Names.Worker,
		Database:         out.Names.Database,
		Bucket:           out.Names.Bucket,
		App:              r.app.Slug,
		Folder:           out.Names.Folder,
		Zone:             r.zone.Name,
		Addresses:        out.Addresses,
		OwnerEmail:       r.email,
		Posture:          r.cfg.Answers.Posture,
		Theme:            r.theme.ID,
		ThemeDescription: r.theme.Description,
		SuffixReason:     r.suffixReason,
		ZoneChosen:       r.zoneChosen,
	}
	r.emit(Event{Kind: SummaryKind, Step: StepSummary, Summary: &s})
	return Result{SiteID: r.siteID, Record: r.rec, Outline: out, Summary: s}, nil
}
