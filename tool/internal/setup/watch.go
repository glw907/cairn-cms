package setup

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// watch runs the eight watch steps after the summary's Enter, skipping each one the record has
// reached. Each step stores its intents and ids as it goes, and the record step that marks it
// done is written once the whole step has passed.
func (r *run) watch(ctx context.Context) error {
	steps := []struct {
		id   string
		done spine.Step
		run  func(context.Context) error
	}{
		{StepScaffold, spine.StepScaffolded, r.scaffold},
		{StepProvision, spine.StepResourcesCreated, r.provision},
		{StepCommit, spine.StepCommitted, r.commit},
		{StepDeployKey, spine.StepDeployKeyStored, r.deployKey},
		{StepPush, spine.StepPushed, r.push},
		{StepFirstDeploy, spine.StepDeployed, r.firstDeploy},
		{StepDomains, spine.StepDomainLive, r.domains},
		{StepSignIn, spine.StepLive, r.signIn},
	}
	for _, st := range steps {
		if reached(r.rec.Step, st.done) {
			continue
		}
		r.start(st.id)
		if err := r.freshGrant(ctx); err != nil {
			return err
		}
		if err := st.run(ctx); err != nil {
			return err
		}
		r.rec.Step = string(st.done)
		if err := r.save(); err != nil {
			return err
		}
		r.done()
	}
	return nil
}

// site is every value the scaffold writes, from the record and the derived names.
func (r *run) site() scaffold.Site {
	host := r.host
	g := r.rec.GitHub
	return scaffold.Site{
		Name:           r.cfg.Answers.SiteName,
		Repository:     r.names.Repository,
		Worker:         r.names.Worker,
		Database:       r.names.Database,
		Bucket:         r.names.Bucket,
		DatabaseID:     r.rec.Setup.IDs.D1,
		AccountID:      r.account.ID,
		Address:        host,
		EmailFrom:      senderFor(host),
		Posture:        string(r.cfg.Answers.Posture),
		Owner:          g.Repo.Owner,
		Repo:           g.Repo.Repo,
		DefaultBranch:  g.Repo.DefaultBranch,
		AppID:          strconv.FormatInt(r.rec.Setup.IDs.AppID, 10),
		InstallationID: strconv.FormatInt(g.InstallationID, 10),
	}
}

// senderFor is the address the site's sign-in mail comes from, on the host the site serves.
func senderFor(host string) string { return "no-reply@" + host }

// commitIdentity attributes setup's commits to the owner's GitHub account through the noreply
// address GitHub gives every account, so no email address of the owner's goes into the history.
func (r *run) commitIdentity(message string) scaffold.Commit {
	login := r.rec.GitHub.Repo.Owner
	return scaffold.Commit{
		AuthorName:  login,
		AuthorEmail: strconv.FormatInt(r.rec.Setup.OwnerID, 10) + "+" + login + "@users.noreply.github.com",
		Message:     message,
	}
}

// scaffold is watch step 1: the template written into the site folder and committed there.
func (r *run) scaffold(ctx context.Context) error {
	res, err := r.cfg.WriteSite(ctx, scaffold.Config{
		Template: r.tmpl.Tree,
		Theme:    r.theme.ID,
		Site:     r.site(),
		Commit:   r.commitIdentity("Create the site from the " + r.theme.Name + " template"),
		Dir:      r.rec.Setup.Folder,
	})
	if err != nil {
		return r.localFailure(ctx, ReasonScaffold, "Setup couldn't write the site into "+r.rec.Setup.Folder+".",
			"Check that the folder is writable, and then run cairn new again.", err)
	}
	r.rec.Setup.Folder, r.rec.Setup.Commit = res.Dir, res.CommitSHA
	return nil
}

// provision is watch step 2: the database, the storage bucket, and the email sending domain.
func (r *run) provision(ctx context.Context) error {
	if err := r.provisionD1(ctx); err != nil {
		return err
	}
	if err := r.provisionR2(ctx); err != nil {
		return err
	}
	if _, _, err := r.cf.EnsureEmailSendingSubdomain(ctx, r.zone.ID, r.host); err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	return nil
}

// provisionD1 creates the database under the ownership rule: the intent is stored before the
// create and the uuid when it returns. A recorded uuid must be the one Cloudflare reports. An
// intent with no uuid is a create whose outcome is unknown, so the database of that name is
// adopted only when it holds no table.
func (r *run) provisionD1(ctx context.Context) error {
	name, s := r.names.Database, &r.rec.Setup
	if s.IDs.D1 != "" || s.Intents.D1 == name {
		db, err := r.cf.D1DatabaseNamed(ctx, name)
		if err != nil {
			return r.fail(ctx, err, "Cloudflare")
		}
		switch {
		case s.IDs.D1 != "" && (db == nil || db.UUID != s.IDs.D1):
			return r.notOurs("database", name)
		case s.IDs.D1 != "":
			return nil
		case db != nil:
			empty, err := r.d1Empty(ctx, db.UUID)
			if err != nil {
				return r.fail(ctx, err, "Cloudflare")
			}
			if !empty {
				return r.notOurs("database", name)
			}
			s.IDs.D1 = db.UUID
			return r.save()
		}
	}
	s.Intents.D1 = name
	if err := r.save(); err != nil {
		return err
	}
	db, err := r.cf.CreateD1(ctx, name)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	s.IDs.D1 = db.UUID
	return r.save()
}

// sqlTables lists a database's own tables, leaving out SQLite's and D1's.
const sqlTables = "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"

func (r *run) d1Empty(ctx context.Context, uuid string) (bool, error) {
	res, err := r.cf.D1Query(ctx, uuid, []providers.D1Statement{{SQL: sqlTables}})
	if err != nil {
		return false, err
	}
	return len(res) == 1 && len(res[0].Results) == 0, nil
}

// provisionR2 creates the bucket under the ownership rule. A bucket's name is its id. An intent
// with no recorded id and a bucket of that name is refused, since Cloudflare's API offers no
// read of a bucket's objects and setup adopts only what it can see is empty.
func (r *run) provisionR2(ctx context.Context) error {
	name, s := r.names.Bucket, &r.rec.Setup
	if s.IDs.R2Bucket != "" || s.Intents.R2Bucket == name {
		b, err := r.cf.R2BucketNamed(ctx, name)
		if err != nil {
			return r.fail(ctx, err, "Cloudflare")
		}
		switch {
		case s.IDs.R2Bucket != "" && b == nil:
			return r.notOurs("storage bucket", name)
		case s.IDs.R2Bucket != "":
			return nil
		case b != nil:
			return r.notOurs("storage bucket", name)
		}
	}
	s.Intents.R2Bucket = name
	if err := r.save(); err != nil {
		return err
	}
	b, err := r.cf.CreateR2Bucket(ctx, name)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	s.IDs.R2Bucket = b.Name
	if b.Name == "" {
		s.IDs.R2Bucket = name
	}
	return r.save()
}

// notOurs is the stop for a resource of setup's name that setup can't show it created.
func (r *run) notOurs(kind, name string) *Failure {
	return r.failure(ReasonNotOurs, "A "+kind+" named "+name+" already exists on your Cloudflare account, and setup can't confirm it's the one it created.",
		"If you don't need it, delete the "+kind+" in Cloudflare, and then run cairn new again.", nil)
}

// commit is watch step 3: the Worker, database, and GitHub App settings written over the first
// commit and committed.
func (r *run) commit(ctx context.Context) error {
	sha, err := r.cfg.FinalizeSite(ctx, scaffold.FinalizeConfig{
		Dir:    r.rec.Setup.Folder,
		Base:   r.rec.Setup.Commit,
		Site:   r.site(),
		Commit: r.commitIdentity(scaffold.ConfigMessage),
	})
	if err != nil {
		return r.localFailure(ctx, ReasonFolderNotOurs, "Setup couldn't write the site's settings in "+r.rec.Setup.Folder+". The folder changed after setup wrote it.",
			"Undo your changes in that folder, and then run cairn new again.", err)
	}
	r.rec.Setup.Commit = sha
	return nil
}

// installationToken returns a token for the site's installation, minting a new one when the
// last is within ten minutes of its hour.
func (r *run) installationToken(ctx context.Context) (providers.Credential, error) {
	if !r.instUntil.IsZero() && r.cfg.Now().Before(r.instUntil) {
		return r.inst, nil
	}
	gh, err := r.appClient()
	if err != nil {
		return providers.Credential{}, err
	}
	tok, until, err := gh.InstallationToken(ctx, r.rec.GitHub.InstallationID)
	if err != nil {
		return providers.Credential{}, r.fail(ctx, err, "GitHub")
	}
	r.register(tok)
	r.inst, r.instUntil = tok, until.Add(-instSlack)
	return tok, nil
}

// push is watch step 5. A remote branch already at the recorded commit means an earlier run
// pushed and stopped before recording it, so nothing is sent again. Otherwise the folder must
// still be at the recorded commit and no Worker may hold the site's name, since the push starts
// the first deploy.
func (r *run) push(ctx context.Context) error {
	g := r.rec.GitHub.Repo
	tok, err := r.installationToken(ctx)
	if err != nil {
		return err
	}
	head, err := r.cfg.GitHub(tok).HeadSHA(ctx, g.Owner, g.Repo, g.DefaultBranch)
	switch status := httpStatus(err); {
	case err == nil && head == r.rec.Setup.Commit:
		return nil
	case err == nil:
		return r.failure(ReasonRemoteDiffers, "The repository "+g.Owner+"/"+g.Repo+" already holds commits setup didn't make.",
			"Remove those commits, or delete the repository, and then run cairn new again.", nil)
	case status != http.StatusConflict && status != http.StatusNotFound:
		return r.fail(ctx, err, "GitHub")
	}
	if err := r.ownFolder(ctx); err != nil {
		return err
	}
	exists, err := r.cf.WorkerExists(ctx, r.names.Worker)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	if exists {
		return r.failure(ReasonWorkerExists, "A Worker named "+r.names.Worker+" appeared on your Cloudflare account while setup ran.",
			"Delete that Worker or rename it in Cloudflare, and then run cairn new again.", nil)
	}
	return r.pushCommit(ctx)
}

// pushCommit pushes the folder's HEAD to the default branch as the installation.
func (r *run) pushCommit(ctx context.Context) error {
	tok, err := r.installationToken(ctx)
	if err != nil {
		return err
	}
	env, header := pushEnv(r.cfg.Env, tok)
	r.registerValue(header)
	ref := "HEAD:refs/heads/" + r.rec.GitHub.Repo.DefaultBranch
	if _, err := runChild(ctx, r.rec.Setup.Folder, env, "git", "push", "--quiet", "origin", ref); err != nil {
		return r.localFailure(ctx, ReasonPush, "Setup couldn't push the site to GitHub.",
			"Check your internet connection, and then run cairn new again.", err)
	}
	r.pushedHere = true
	return nil
}

// ownFolder confirms the folder's HEAD is the commit the record holds, the one test of whether
// the folder is still setup's.
func (r *run) ownFolder(ctx context.Context) error {
	head, err := runChild(ctx, r.rec.Setup.Folder, gitEnv(r.cfg.Env), "git", "rev-parse", "HEAD")
	if err == nil && head == r.rec.Setup.Commit {
		return nil
	}
	return r.localFailure(ctx, ReasonFolderNotOurs, "The folder "+r.rec.Setup.Folder+" changed after setup committed the site there.",
		"Undo the new commits in that folder, and then run cairn new again.", err)
}

// deployKey is watch step 4. It comes before the push because GitHub hands a workflow job the
// repository's secrets when the job starts, so the deploy the push starts must find the key
// already stored. A run that stopped inside this step may have minted a key it never stored, so
// every earlier key of the run is deleted, by its recorded id and by its run-named name, before
// a new one is minted.
func (r *run) deployKey(ctx context.Context) error {
	s := &r.rec.Setup
	name := providers.DeployKeyName(r.cfg.RunID)
	if s.IDs.DeployKeyID != "" || s.Intents.DeployKey != "" {
		if id := s.IDs.DeployKeyID; id != "" {
			if err := r.cf.DeleteUserToken(ctx, id); err != nil && httpStatus(err) != http.StatusNotFound {
				return r.fail(ctx, err, "Cloudflare")
			}
		}
		if _, err := r.cf.DeleteUserTokensNamed(ctx, name); err != nil {
			return r.fail(ctx, err, "Cloudflare")
		}
		s.IDs.DeployKeyID = ""
	}
	s.Intents.DeployKey = name
	if err := r.save(); err != nil {
		return err
	}
	key, err := r.cf.MintDeployKey(ctx, r.cfg.RunID)
	if err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	r.register(key.Value)
	s.IDs.DeployKeyID = key.ID
	if err := r.save(); err != nil {
		return err
	}
	tok, err := r.installationToken(ctx)
	if err != nil {
		return err
	}
	g := r.rec.GitHub.Repo
	if err := r.cfg.GitHub(tok).SetActionsSecret(ctx, g.Owner, g.Repo, providers.DeploySecretName, secretText(key.Value)); err != nil {
		return r.fail(ctx, err, "GitHub")
	}
	return nil
}

// domains is watch step 7: the address rechecked, each host attached to the Worker as a custom
// domain, and the wait until the site answers over HTTPS.
func (r *run) domains(ctx context.Context) error {
	worker := r.names.Worker
	if err := r.checkAddress(ctx, worker); err != nil {
		return err
	}
	for _, host := range r.addresses {
		if _, err := r.cf.AttachCustomDomain(ctx, host, r.zone.ID, worker); err != nil {
			return r.fail(ctx, err, "Cloudflare")
		}
	}
	deadline := r.cfg.Now().Add(HTTPSLimit)
	for !r.siteAnswers(ctx) {
		if !r.cfg.Now().Before(deadline) {
			return r.failure(ReasonHTTPSTimeout, "The site didn't answer over HTTPS at "+r.host+" within 15 minutes.",
				"Run cairn new again later. Setup resumes at connecting the domain.", nil)
		}
		if err := r.pause(ctx, pollEvery); err != nil {
			return err
		}
	}
	return nil
}

// siteAnswers reports whether every host serves its home page and the admin sends a signed-out
// visitor to its sign-in page, the sign that the certificate and the Worker are both live.
func (r *run) siteAnswers(ctx context.Context) bool {
	for _, host := range r.addresses {
		if status, _, err := r.cfg.SiteGet(ctx, "https://"+host+"/"); err != nil || status != http.StatusOK {
			return false
		}
	}
	status, loc, err := r.cfg.SiteGet(ctx, "https://"+r.host+"/admin")
	return err == nil && status == http.StatusSeeOther &&
		(loc == "/admin/login" || loc == "https://"+r.host+"/admin/login" || strings.HasPrefix(loc, "/admin/login?"))
}
