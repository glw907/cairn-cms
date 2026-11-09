package setup

import (
	"context"
	"net/http"
	"slices"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/childenv"
	"github.com/glw907/cairn-cms/tool/v2/internal/setup/scaffold"
	"github.com/glw907/cairn-cms/tool/v2/internal/spine"
)

// workerKeySecret is the Worker secret the engine reads the GitHub App's key from.
const workerKeySecret = "GITHUB_APP_PRIVATE_KEY_B64"

// firstDeploy is watch step 6. It reads the Actions run for the pushed commit with the
// installation token until the run completes, waits for the Worker the run deploys, and then
// gives that Worker the App's key. The site's dependencies install in the folder meanwhile.
//
// A run that finds the commit's deploy already failed, without having pushed it itself, is a
// rerun after a stop at this step, so it pushes an empty commit once to deploy again: setup
// holds no permission that reruns a workflow. A rerun that finds no run for the recorded commit
// checks once that the remote holds it, since a stop between recording that empty commit and
// pushing it leaves a commit GitHub never received.
func (r *run) firstDeploy(ctx context.Context) error {
	r.startInstall()
	g := r.rec.GitHub.Repo
	deadline := r.cfg.Now().Add(DeployLimit)
	retried, checked := r.pushedHere, r.pushedHere
	for {
		tok, err := r.installationToken(ctx)
		if err != nil {
			return err
		}
		run, found, err := r.cfg.GitHub(tok).WorkflowRunForCommit(ctx, g.Owner, g.Repo, r.rec.Setup.Commit)
		if err != nil {
			return r.fail(ctx, err, "GitHub")
		}
		if !found && !checked {
			checked = true
			pushed, err := r.pushIfBehind(ctx)
			if err != nil {
				return err
			}
			if pushed {
				retried = true
				continue
			}
		}
		if found && run.Status == "completed" && run.Conclusion == "success" {
			break
		}
		if found && run.Status == "completed" && !retried {
			retried = true
			if err := r.redeploy(ctx); err != nil {
				return err
			}
			continue
		}
		if found && run.Status == "completed" {
			return r.deployFailure(run.URL)
		}
		if err := r.waitUntil(ctx, deadline); err != nil {
			return err
		}
	}
	if err := r.awaitWorker(ctx, deadline); err != nil {
		return err
	}
	text := base64Text(r.app.PEM)
	r.registerValue(text)
	if err := r.cf.PutWorkerSecret(ctx, r.names.Worker, workerKeySecret, text); err != nil {
		return r.fail(ctx, err, "Cloudflare")
	}
	return nil
}

// waitUntil pauses one poll, or stops the step once deadline has passed.
func (r *run) waitUntil(ctx context.Context, deadline time.Time) error {
	if !r.cfg.Now().Before(deadline) {
		return r.failure(ReasonDeployTimeout, "The first deploy didn't finish within 30 minutes.",
			"Check the Actions tab of your repository on GitHub, and then run cairn new again. Setup resumes at the first deploy.", nil)
	}
	return r.pause(ctx, pollEvery)
}

// awaitWorker waits for the deploy's Worker to appear and records its tag. A recorded tag that
// differs from the Worker's is another Worker under the site's name.
func (r *run) awaitWorker(ctx context.Context, deadline time.Time) error {
	for {
		workers, err := r.cf.ListWorkers(ctx)
		if err != nil {
			return r.fail(ctx, err, "Cloudflare")
		}
		i := slices.IndexFunc(workers, func(w providers.Worker) bool { return w.Name == r.names.Worker })
		if i >= 0 {
			tag := workers[i].Tag
			if t := r.rec.Setup.IDs.WorkerTag; t != "" && t != tag {
				return r.notOurs("Worker", r.names.Worker)
			}
			r.rec.Setup.IDs.WorkerTag, r.rec.Cloudflare.WorkerName = tag, r.names.Worker
			return r.save()
		}
		if err := r.waitUntil(ctx, deadline); err != nil {
			return err
		}
	}
}

// redeployMessage is the message of the empty commit that deploys the site again.
const redeployMessage = "Deploy the site again"

// redeploy pushes an empty commit on top of the recorded one and records it, which starts a new
// deploy run.
func (r *run) redeploy(ctx context.Context) error {
	sha, err := r.redeployCommit(ctx)
	if err != nil {
		return err
	}
	r.rec.Setup.Commit = sha
	if err := r.save(); err != nil {
		return err
	}
	return r.pushCommit(ctx)
}

// pendingCommit reports the folder's HEAD when it is a commit setup made on top of the recorded
// one and stopped before recording, the rule scaffold.Finalize applies to the config commit: its
// parent is the recorded commit, its message is message, and its diff touches file alone, or
// nothing when file is empty.
func (r *run) pendingCommit(ctx context.Context, message, file string) (string, bool) {
	dir, env := r.rec.Setup.Folder, r.gitEnv()
	head, err := runChild(ctx, dir, env, "git", "rev-parse", "HEAD")
	if err != nil || head == r.rec.Setup.Commit {
		return "", false
	}
	parent, perr := runChild(ctx, dir, env, "git", "rev-parse", "HEAD^")
	msg, merr := runChild(ctx, dir, env, "git", "log", "-1", "--format=%B")
	changed, derr := runChild(ctx, dir, env, "git", "diff", "--name-only", "HEAD^", "HEAD")
	ok := perr == nil && merr == nil && derr == nil && parent == r.rec.Setup.Commit && msg == message && changed == file
	return head, ok
}

// redeployCommit returns the empty commit that deploys the site again. A pending redeploy commit
// is used rather than a second one.
func (r *run) redeployCommit(ctx context.Context) (string, error) {
	dir, env := r.rec.Setup.Folder, r.gitEnv()
	if head, ok := r.pendingCommit(ctx, redeployMessage, ""); ok {
		return head, nil
	}
	if err := r.ownFolder(ctx); err != nil {
		return "", err
	}
	id := r.commitIdentity(redeployMessage)
	cenv := append(r.gitEnv(),
		"GIT_AUTHOR_NAME="+id.AuthorName, "GIT_AUTHOR_EMAIL="+id.AuthorEmail,
		"GIT_COMMITTER_NAME="+id.AuthorName, "GIT_COMMITTER_EMAIL="+id.AuthorEmail)
	if _, err := runChild(ctx, dir, cenv, "git", "commit", "--quiet", "--allow-empty", "--no-verify", "--no-gpg-sign", "-m", id.Message); err != nil {
		return "", r.localFailure(ctx, ReasonPush, "Setup couldn't commit in "+dir+" to deploy again.", "Run cairn new again.", err)
	}
	sha, err := runChild(ctx, dir, env, "git", "rev-parse", "HEAD")
	if err != nil {
		return "", r.localFailure(ctx, ReasonPush, "Setup couldn't read the new commit in "+dir+".", "Run cairn new again.", err)
	}
	return sha, nil
}

// followInstallation keeps a site past the commit step on the recorded installation. A resume
// whose approval 4 replaced the installation leaves the recorded commit naming the deleted one,
// and a site deployed from it can't commit content to GitHub. So setup commits the new id on
// top of the recorded commit and records it, pushes it when the site was pushed, and, when the
// first deploy has run, waits for the new commit's deploy as the first deploy does. A recorded
// settings or redeploy commit past the first deploy is waited for again on every resume, since
// a stop can land between its push and its run.
func (r *run) followInstallation(ctx context.Context) error {
	if !reached(r.rec.Step, spine.StepCommitted) {
		return nil
	}
	current, err := scaffold.NamesApp(ctx, r.cfg.Env, r.rec.Setup.Folder, r.rec.Setup.Commit, r.site())
	if err != nil {
		return r.unreadFolder(ctx, err)
	}
	if !current {
		r.start(StepCommit)
		sha, err := r.installationCommit(ctx)
		if err != nil {
			return err
		}
		r.rec.Setup.Commit = sha
		if err := r.save(); err != nil {
			return err
		}
		r.done()
		if reached(r.rec.Step, spine.StepPushed) {
			r.start(StepPush)
			if _, err := r.pushIfBehind(ctx); err != nil {
				return err
			}
			r.done()
		}
	}
	if !reached(r.rec.Step, spine.StepDeployed) {
		return nil
	}
	if current {
		msg, err := runChild(ctx, r.rec.Setup.Folder, r.gitEnv(), "git", "log", "-1", "--format=%B", r.rec.Setup.Commit)
		if err != nil {
			return r.unreadFolder(ctx, err)
		}
		if msg != scaffold.InstallationMessage && msg != redeployMessage {
			return nil
		}
	}
	r.start(StepFirstDeploy)
	if err := r.firstDeploy(ctx); err != nil {
		return err
	}
	r.done()
	return nil
}

// unreadFolder is the stop for a site folder whose recorded commit setup can't read.
func (r *run) unreadFolder(ctx context.Context, err error) *Failure {
	return r.localFailure(ctx, ReasonFolderNotOurs, "Setup couldn't read the commit it recorded in "+r.rec.Setup.Folder+".",
		"Check that the folder is still there and unchanged, and then run cairn new again.", err)
}

// installationCommit returns the commit that writes the recorded installation into the site's
// settings on top of the recorded commit. A pending one is used when it names the recorded
// installation; one that names an installation a later reinstall replaced was never pushed, so
// it is written again.
func (r *run) installationCommit(ctx context.Context) (string, error) {
	dir, site := r.rec.Setup.Folder, r.site()
	head, pending := r.pendingCommit(ctx, scaffold.InstallationMessage, scaffold.SettingsFile())
	if pending {
		if ok, err := scaffold.NamesApp(ctx, r.cfg.Env, dir, head, site); err == nil && ok {
			return head, nil
		}
	} else if err := r.ownFolder(ctx); err != nil {
		return "", err
	}
	sha, err := scaffold.UpdateInstallation(ctx, scaffold.FinalizeConfig{
		Dir:    dir,
		Base:   r.rec.Setup.Commit,
		Site:   site,
		Commit: r.commitIdentity(scaffold.InstallationMessage),
		Env:    r.cfg.Env,
	})
	if err != nil {
		return "", r.localFailure(ctx, ReasonFolderNotOurs, "Setup couldn't write the site's new GitHub App installation in "+dir+".",
			"Undo your changes in that folder, and then run cairn new again.", err)
	}
	return sha, nil
}

// pushIfBehind pushes the recorded commit when the remote branch is behind it and reports
// whether it pushed. A remote that holds a commit the record does not lead from is not setup's.
func (r *run) pushIfBehind(ctx context.Context) (bool, error) {
	g := r.rec.GitHub.Repo
	tok, err := r.installationToken(ctx)
	if err != nil {
		return false, err
	}
	head, err := r.cfg.GitHub(tok).HeadSHA(ctx, g.Owner, g.Repo, g.DefaultBranch)
	switch status := httpStatus(err); {
	case err == nil && head == r.rec.Setup.Commit:
		return false, nil
	case err == nil:
		if _, err := runChild(ctx, r.rec.Setup.Folder, r.gitEnv(), "git", "merge-base", "--is-ancestor", head, r.rec.Setup.Commit); err != nil {
			return false, r.localFailure(ctx, ReasonRemoteDiffers, "The repository "+g.Owner+"/"+g.Repo+" already holds commits setup didn't make.",
				"Remove those commits, or delete the repository, and then run cairn new again.", err)
		}
	case status != http.StatusConflict && status != http.StatusNotFound:
		return false, r.fail(ctx, err, "GitHub")
	}
	if err := r.ownFolder(ctx); err != nil {
		return false, err
	}
	return true, r.pushCommit(ctx)
}

// deployFailure is the stop for a failed first deploy. It points at the run's page and names no
// cause, since setup reads only the run's conclusion; the subscriptions read that could name a
// missing Workers Paid plan answers 403 to setup's grant.
func (r *run) deployFailure(runURL string) error {
	return r.failure(ReasonDeployFailed, "The first deploy failed in GitHub Actions.",
		"Open the run at "+runURL+" to see what failed. Then run cairn new again, and setup resumes at the first deploy.", nil)
}

// startInstall runs `npm install --ignore-scripts` in the site folder in the background, so the
// owner's agent can start work as soon as setup ends. Its output is captured and its failure is
// a next step on the done screen, never a stop. A folder the record says is installed is not
// installed again.
//
// Lifecycle scripts are skipped on purpose: the install runs while the keyring still holds the
// Cloudflare grant and the App's key, and a dependency's install script runs as the owner. A
// dependency that needs its script gets it from the owner's `npm rebuild`, which Done's
// ScriptsSkipped tells the done screen to say.
func (r *run) startInstall() {
	if r.installStop != nil || r.rec.Setup.DepsInstalled {
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	end := make(chan struct{})
	r.installStop, r.installEnd = cancel, end
	dir, env := r.rec.Setup.Folder, childenv.Scrub(r.cfg.Env)
	r.install.Go(func() {
		defer close(end)
		_, r.installErr = runChild(ctx, dir, env, "npm", "install", "--ignore-scripts")
	})
}

// noteInstall records a background install that has already ended cleanly, so the next save
// carries it. It never waits.
func (r *run) noteInstall() {
	if r.installEnd == nil {
		return
	}
	select {
	case <-r.installEnd:
		if r.installErr == nil {
			r.rec.Setup.DepsInstalled = true
		}
	default:
	}
}

// waitInstall waits for the background install to end and records how it ended. Every install
// setup runs skips the lifecycle scripts, so one that ran here or in an earlier run sets
// ScriptsSkipped.
func (r *run) waitInstall() {
	r.install.Wait()
	r.noteInstall()
	r.out.InstallFailed = r.installErr != nil
	r.out.ScriptsSkipped = r.installStop != nil || r.rec.Setup.DepsInstalled
}

// stopInstall ends a background install a stopped run leaves behind.
func (r *run) stopInstall() {
	if r.installStop != nil {
		r.installStop()
		r.install.Wait()
	}
}
