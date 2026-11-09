package setup

import (
	"context"
	"slices"
	"time"

	"github.com/glw907/cairn-cms/tool/v2/internal/providers"
)

// workerKeySecret is the Worker secret the engine reads the GitHub App's key from.
const workerKeySecret = "GITHUB_APP_PRIVATE_KEY_B64"

// firstDeploy is watch step 6. It reads the Actions run for the pushed commit with the
// installation token until the run completes, waits for the Worker the run deploys, and then
// gives that Worker the App's key. The site's dependencies install in the folder meanwhile.
//
// A run that finds the commit's deploy already failed, without having pushed it itself, is a
// rerun after a stop at this step, so it pushes an empty commit once to deploy again: setup
// holds no permission that reruns a workflow.
func (r *run) firstDeploy(ctx context.Context) error {
	r.startInstall()
	g := r.rec.GitHub.Repo
	deadline := r.cfg.Now().Add(DeployLimit)
	retried := r.pushedHere
	for {
		tok, err := r.installationToken(ctx)
		if err != nil {
			return err
		}
		run, found, err := r.cfg.GitHub(tok).WorkflowRunForCommit(ctx, g.Owner, g.Repo, r.rec.Setup.Commit)
		if err != nil {
			return r.fail(ctx, err, "GitHub")
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

// waitUntil sleeps one poll, or stops the step once deadline has passed.
func (r *run) waitUntil(ctx context.Context, deadline time.Time) error {
	if !r.cfg.Now().Before(deadline) {
		return r.failure(ReasonDeployTimeout, "The first deploy didn't finish within 30 minutes.",
			"Check the Actions tab of your repository on GitHub, and then run cairn new again. Setup resumes at the first deploy.", nil)
	}
	if err := r.sleep(ctx, pollEvery); err != nil {
		return r.fail(ctx, err, "")
	}
	return nil
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

// redeploy pushes an empty commit on top of the recorded one and records it, which starts a new
// deploy run.
func (r *run) redeploy(ctx context.Context) error {
	if err := r.ownFolder(ctx); err != nil {
		return err
	}
	id := r.commitIdentity("Deploy the site again")
	env := append(gitEnv(r.cfg.Env),
		"GIT_AUTHOR_NAME="+id.AuthorName, "GIT_AUTHOR_EMAIL="+id.AuthorEmail,
		"GIT_COMMITTER_NAME="+id.AuthorName, "GIT_COMMITTER_EMAIL="+id.AuthorEmail)
	dir := r.rec.Setup.Folder
	if _, err := runChild(ctx, dir, env, "git", "commit", "--quiet", "--allow-empty", "--no-verify", "--no-gpg-sign", "-m", id.Message); err != nil {
		return r.localFailure(ctx, ReasonPush, "Setup couldn't commit in "+dir+" to deploy again.", "Run cairn new again.", err)
	}
	sha, err := runChild(ctx, dir, gitEnv(r.cfg.Env), "git", "rev-parse", "HEAD")
	if err != nil {
		return r.localFailure(ctx, ReasonPush, "Setup couldn't read the new commit in "+dir+".", "Run cairn new again.", err)
	}
	r.rec.Setup.Commit = sha
	if err := r.save(); err != nil {
		return err
	}
	return r.pushCommit(ctx)
}

// deployFailure is the stop for a failed first deploy. It points at the run's page and names no
// cause, since setup reads only the run's conclusion; the subscriptions read that could name a
// missing Workers Paid plan answers 403 to setup's grant.
func (r *run) deployFailure(runURL string) error {
	return r.failure(ReasonDeployFailed, "The first deploy failed in GitHub Actions.",
		"Open the run at "+runURL+" to see what failed. Then run cairn new again, and setup resumes at the first deploy.", nil)
}

// startInstall runs `npm install` in the site folder in the background, so the owner's agent can
// start work as soon as setup ends. Its output is captured and its failure is a next step on
// the done screen, never a stop.
func (r *run) startInstall() {
	if r.installStop != nil {
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	r.installStop = cancel
	dir, env := r.rec.Setup.Folder, scrubbedEnv(r.cfg.Env)
	r.install.Go(func() {
		_, r.installErr = runChild(ctx, dir, env, "npm", "install")
	})
}

// waitInstall waits for the background install to end.
func (r *run) waitInstall() { r.install.Wait() }

// stopInstall ends a background install a stopped run leaves behind.
func (r *run) stopInstall() {
	if r.installStop != nil {
		r.installStop()
		r.install.Wait()
	}
}
