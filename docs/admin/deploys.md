# Deploys

A site that `cairn new` sets up deploys itself each time a commit reaches the repository's default branch. A GitHub Actions workflow in the repository runs the deploy, using a key that setup stores as a repository secret. This page explains how that deploy works, where to read its result, and what limit a busy site can reach. It also shows a developer or technical owner how to move the site to Workers Builds, Cloudflare's build service, by hand.

The page is for the person who owns the site's repository. Reading the page needs no code, and the move to Workers Builds needs access to the Cloudflare dashboard and the repository's settings on GitHub. For a run that stopped before the site went live, read [Recover a setup that stopped](./setup-recovery.md).

## How the site deploys

The workflow is a file named `deploy.yml` in your repository's `.github/workflows` folder. It runs on every push to the default branch and nowhere else. Each run does the following in one job:

1. Installs the site's dependencies.
2. Runs the site's checks.
3. Builds the site.
4. Applies the database migrations to the site's D1 database.
5. Deploys the Worker, the part of your site that runs on Cloudflare.

A push that arrives while a deploy is running cancels that deploy, and the newer push deploys instead. Only the last two steps use the deploy key, so the install, the checks, and the build never hold it.

The deploy key is a Cloudflare API token that setup mints for the site. It carries Workers Scripts, D1, and Workers R2 Storage write access on your account, and it doesn't expire. Setup seals it to the repository's public key and stores it as the repository secret `CLOUDFLARE_API_TOKEN`. Nobody can read the value back, including you.

A publish from the admin commits to the repository, and a commit on the default branch starts a deploy. The live site changes when the run finishes, not when you select Publish.

## Read a deploy's result

The admin shows no deploy status, and the GitHub App your site commits through has no access to Actions. To see whether the most recent deploy worked:

1. On GitHub, open your site's repository.
2. Select **Actions**.
3. Select the most recent run of the `deploy` workflow.

A green check means the Worker deployed. A red cross means it didn't, and the run's log shows which step failed.

## Handle a failed first deploy

The first deploy runs while setup is still working. If it fails, setup stops with the message "The first deploy failed in GitHub Actions" and prints the address of the run. To recover:

1. Open the run to see the cause, and fix it.
2. Run `cairn new` again.

Setup resumes at the first deploy. When the earlier run ended in a failure, setup pushes one empty commit to start a new run.

Setup waits up to 30 minutes for the first deploy. When the run hasn't finished by then, setup stops and points you to the repository's Actions page.

Every cairn site needs the Workers Paid plan, which costs $5 a month. A site on an account without it can't deploy. When setup can read that your Cloudflare account lacks the plan, the stop says so and asks you to subscribe and run `cairn new` again. When it can't read the plan, the stop names no cause, and the run's log is where the Cloudflare error appears.

## Know the free deploy allowance

GitHub's free plan includes a monthly amount of Actions compute for private repositories, and a deploy draws from it. GitHub states the amount as $12 of compute, which covers about 2,000 minutes on a standard Linux runner. A deploy that takes about three minutes, an estimate, gives roughly 650 deploys a month. Standard runners in a public repository don't draw from the allowance. GitHub's [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) page has the current amounts for each plan.

When a private repository uses up the allowance, GitHub blocks further runs if the account has no payment method on file. With a payment method, GitHub bills the extra usage. A blocked deploy resumes when the month's allowance resets.

A site that publishes often can reach this limit. The remedy is to move the deploy to Workers Builds, whose Workers Paid plan includes 6,000 build minutes a month and bills each extra minute at $0.005. [Cloudflare's limits and pricing page](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/) has the current numbers. Every cairn site already pays for Workers Paid.

## Move the deploy to Workers Builds

Workers Builds is Cloudflare's service for building and deploying a Worker from a Git repository. After you connect it, Cloudflare runs the build and the deploy on each push to the branch you choose. This move is optional, and a site works without it. Do it by hand in the dashboard, since setup doesn't do it for you.

### Before you begin

You need the following:

- Owner access to the site's Cloudflare account, and administrator access to the repository on GitHub.
- A moment when no deploy is running, so the two services don't deploy together.
- A developer's help if you want the database migrations to keep running on each deploy. The Actions workflow applies them before it deploys, and the Workers Builds deploy command doesn't unless you change it.

### Create a deploy token

Workers Builds deploys with an API token. Its **Create new token** option makes a token with Account Settings read, Workers Scripts edit, Workers KV Storage edit, and Workers R2 Storage edit permissions, with no D1 permission. A site that applies migrations needs D1, so make your own token instead. Cloudflare's [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token) page says Workers Builds supports only user tokens for now.

1. In the Cloudflare dashboard, open **My Profile**, and then **API Tokens**.
2. Create a custom token with the Workers Scripts, D1, and Workers R2 Storage account permissions, each at the edit level. Under **Account Resources**, limit the token to the one account that holds the site.

Every build can read this token, so anyone who can push to the branch can read it. Keep it narrow.

### Connect the repository

1. In the Cloudflare dashboard, go to **Workers & Pages**.
2. Select your site's Worker. Its name is in the site's `wrangler.jsonc`.
3. Select **Settings**, and then **Builds**.
4. Select **Connect**, and follow the prompts to authorize Cloudflare's GitHub App and choose your site's repository.
5. Set **Git branch** to the repository's default branch. Cloudflare fills in `main`, and your repository's default may differ.
6. Set **Build command** to `npm run build`.
7. Leave **Deploy command** at `npx wrangler deploy`, or see the following note about migrations.
8. Under **API token**, select the token you made.
9. Save, and then push a commit to the default branch to start a build.

The Worker's name in the dashboard must match `name` in the repository's `wrangler.jsonc`, or the build fails. Setup deployed the Worker under that name, so they already match unless you edited one of them.

To keep applying the database migrations, a developer can add a script to the site's `package.json` that runs `npx wrangler d1 migrations apply AUTH_DB --remote` and then `npx wrangler deploy`, and set the deploy command to run that script with `npm run`. Cloudflare's [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#deploy-command) page documents an `npm run` script as a deploy command.

### Switch off the Actions workflow

Two services deploying the same commit would race, so switch the workflow off once a Workers Builds deploy has succeeded.

Turn off the `deploy` workflow, as [GitHub's workflow documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows) describes. Alternatively, delete the `deploy.yml` file from `.github/workflows` and commit the deletion. After a successful Workers Builds deploy, you can also delete the repository secret `CLOUDFLARE_API_TOKEN` in the repository's settings, and revoke the deploy key in Cloudflare's **API Tokens** page, where setup named it `cairn-deploy-` followed by the run's id.

### Verify the move

1. Push a small commit to the default branch.
2. In the Cloudflare dashboard, open the Worker's **Deployments**, and confirm a new deployment from that commit.
3. On GitHub, confirm the push started no run of the `deploy` workflow.
4. Publish a change from the admin, and confirm the live site shows it.

## If something fails

A Workers Builds failure appears in its build log in the Cloudflare dashboard, under the Worker's **Builds**. A build that fails on the database step usually means the token lacks the D1 permission. [Troubleshoot a live site](./troubleshooting.md) covers a site that deployed and misbehaves.

## See also

- [Set up a site with an agent](./set-up-with-an-agent.md) runs setup from flags and a plan file.
- [Own your domain](./own-your-domain.md) puts the site on a domain you own.
- [Credentials](./credentials.md) says which secrets setup stores and when it deletes them.
