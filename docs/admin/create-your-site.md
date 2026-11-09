# Create your site

A cairn site runs on accounts you own: a GitHub account holds its content, and a Cloudflare account runs it. The setup command, `npm create cairn-site`, creates the site, connects it to both, deploys it, and signs you in as its owner. It installs the `cairn` CLI and runs its `cairn new` command. You answer two questions in the terminal, approve four requests in one browser tab, press Enter once, and then wait while setup runs. This page walks one run from an empty terminal to a signed-in admin.

The page is for someone who is comfortable pasting a command into a terminal and clicking through a dashboard, and who writes no code. [Before you start](./before-you-start.md) covers what setup creates and what it costs. [Own your domain](./own-your-domain.md) covers a domain and the email that comes with it, and [Recover a setup that stopped](./setup-recovery.md) covers a run that stops partway.

## Prerequisites

Setup checks most of these before it creates anything. Have each one ready, because a missing item stops the run at the opening.

- A computer with Git, Node.js 24 or later, a browser, and port 49152 free. [What you need on your computer](./before-you-start.md#what-you-need-on-your-computer) explains each.
- A personal GitHub account, and a Cloudflare account on the Workers Paid plan, $5 a month. [What you need on Cloudflare](./before-you-start.md#what-you-need-on-cloudflare) explains the plan, and [What it costs](./before-you-start.md#what-it-costs) states the charge.
- A domain that is active on Cloudflare, registered there or added from another registrar. Setup doesn't create one.

## Start setup

Run setup from a terminal on the computer where you use your browser. Setup writes the site into a new folder in the directory where you run it.

1. Open a terminal in the folder that should hold the site's folder.
2. Run the command:

   ```
   npm create cairn-site
   ```

   The command installs the `cairn` CLI and starts setup. With `cairn` already installed, `cairn new` starts the same setup.

3. Read the welcome screen, and press Enter.

The welcome screen says what setup does, that you approve four requests in your browser, and that you need a domain on Cloudflare and the Workers Paid plan. When you run setup over SSH, it says to run it on the computer you browse with and stops without creating anything.

## Answer the questions

Setup asks about your site in the terminal. Each choice has a default you can accept with Enter. You type the site name.

1. Theme, only when the template offers more than one. It controls how your site looks to readers.
2. Site name. It shows at the top of every page, and the line beneath the field previews the repository name that setup derives from it.
3. AI crawlers. You choose whether AI companies can use your content to train their models, with **Block AI training** or **Allow AI training**. This setting doesn't affect search engines.

To see every name setup derives from a site name without creating anything, add `--dry-run`, which also needs `--name`, `--email`, and `--posture`:

```
cairn new --dry-run --name "My Site" --host example.com --email me@example.com --posture decline
```

<!-- transcript: packages/create-cairn-site/test/fixtures/transcripts/05-cairn-new-dry-run.txt -->
```
Site: My Site
Repository: my-site
Worker: my-site
Database: my-site-auth
Bucket: my-site-media
GitHub App: cairn-my-site
Folder: ./my-site
Owner email: me@example.com
AI crawlers: decline
Nothing was created.
```

The repository, Worker, database, and bucket take the site name. When Cloudflare or GitHub already uses a name, setup adds a suffix such as `-2` to all four and says why on the summary.

## Approve four requests in your browser

After the questions, setup shows the screen titled **Approve setup in your browser**. Press Enter, and setup opens one tab on your computer at `http://127.0.0.1:49152`. All four approvals happen in that tab, and each page says what happened and what comes next. If no tab opens, go to that address yourself.

Cloudflare comes first, so setup can check your domain before anything exists on GitHub.

1. **Cloudflare: Allow.** On the Cloudflare page, select **API Tokens: Write**, and then select **Allow**. Cloudflare leaves that permission unselected, and setup needs it to create your site's deploy key. If you skip it, the setup tab explains and offers **Try again**, and nothing has been created.
2. **GitHub: Create.** Select **Create** to add a GitHub App for the site. The admin saves changes to your site through the App. GitHub App names are unique across GitHub. If GitHub says the name is taken, change it on that page. Setup uses the name you choose. If you're signed out of GitHub, sign in first and land back on **Create**.
3. **GitHub: Install & Authorize.** Select **Install & Authorize** to let setup create the repository. This access covers all your repositories, and setup removes it as soon as the repository exists.
4. **GitHub: Approve.** Select **Approve, Install & Authorize**, or **Approve**, to give the App access to the new repository only. Setup reads the installation back. If it covers more than that repository, setup removes it and asks you to approve again.

You have 30 minutes for the four approvals, and the terminal shows a countdown in the last five. When the time runs out, setup stops with nothing outside the finished approvals created, and `cairn new` resumes from there. The App keeps permission to manage the repository's settings for as long as the App exists. That includes deleting the repository, and GitHub doesn't let a permission be reduced later. The App also holds the permissions to write the site's workflow files and the repository's secrets, and to read the status of its deploys.

When your account has several Cloudflare accounts or several active domains, setup asks which to use, one short question after the approvals.

## Review the summary

When the approvals finish, the tab says **Approvals complete** and the terminal shows the screen titled **Review the settings**. It lists the domain, the sign-in email, the four names, the theme, the AI-crawler choice, and the deploys. Each row carries a short reason, such as *based on your site name*. Three rows need a note:

- **Sign-in email.** It comes from your Cloudflare account. Press E to change it. The admin sends your sign-in links there.
- **Address.** It defaults to the bare domain and `www`. Press A to use a subdomain of your domain instead, such as `blog.example.com`, which gets no `www`. Setup refuses an address that already has DNS records or a Worker on it, and never changes a record it didn't create.
- **Deploys.** The row reads *GitHub Actions, each time you publish*, with the free limit. The repository, Worker, database, and bucket names are fixed, because the repository already exists.

Press Enter to start. That's the only confirmation setup asks for. Nothing is created in Cloudflare until you do.

## Watch setup run

Setup shows its steps, and only the current one explains itself. Setup emails a sign-in link to your sign-in email when the site is live.

1. Write the site files. Setup writes the site into a folder on your computer, named for the repository.
2. Set up the database, storage bucket, and email. The database holds sign-ins, the bucket holds uploaded images, and Cloudflare sends sign-in mail from your domain.
3. Commit the site. Setup commits the site's settings on top of the commit that wrote the site files.
4. Store the deploy key in GitHub. GitHub Actions deploys your site to Cloudflare with this key, and only workflows in your repository can read it.
5. Push the site to GitHub. The push starts the first deploy, which reads the key.
6. Run the first deploy. While it runs, setup installs the site's dependencies in the folder, so you can start working on the site at once. GitHub Actions deploys the site, and each publish from the admin later runs the same workflow. The first one takes a few minutes, and setup waits up to 30 minutes for it. [Deploys](./deploys.md) covers the free limit and moving to Workers Builds.
7. Connect your address. Cloudflare issues the site's HTTPS certificate, which can take up to 15 minutes.
8. Sign in to the admin.

If a step fails, setup says what happened, what it already did, what it left in place, and what to do. [Recover a setup that stopped](./setup-recovery.md) covers each stop.

A failed first deploy reads *The first deploy failed* and links the run's page in GitHub Actions. Setup can't read your Cloudflare plan, and a missing Workers Paid plan shows only as a failed first deploy that names no cause. To recover:

1. Check that your Cloudflare account has the Workers Paid plan.
2. Fix the cause, and run `cairn new` again. Setup resumes at the first deploy.

## Sign in

The last step signs you in.

1. Setup writes a sign-in link, and the setup tab opens your site's sign-in confirmation page through it.
2. In that tab, select **Sign in**.

Your site's admin opens, and you're signed in as the owner.

The link works once, for 10 minutes. Setup also emails you a sign-in link from your site, so you can see that the mail arrives. If that link has expired when you read it, request a new one on the site's sign-in page, at `/admin/login` on your address.

## Sign in again

Your session lasts 30 days. When it ends, or when you sign in from another browser:

1. Go to `/admin/login` on your address.
2. Enter your sign-in email.
3. Open the link that arrives.

The link works once, for 10 minutes. A new site sends the mail from your own domain, and mail providers can delay mail from a domain with no sending history, so a first link can arrive late.

## Verify the finished site

The done screen names your live address, says whether you're signed in, and lists three next steps. Check the result in this order:

1. Open the live address. The starter site loads.
2. Open `/admin` on the same address. You're signed in, or the setup tab shows a **Sign in** button.
3. Open the site's folder on your computer. Setup left a working copy there, with `origin` pointing at your repository.
4. Run `cairn doctor` from the folder. The setup command installed the `cairn` CLI; if `cairn` isn't on your path, install it from the [release page](https://github.com/glw907/cairn-cms/releases). [Check that your site works](./is-it-working.md) explains each result.

If the done screen says setup didn't run dependency install scripts, run `npm rebuild` in the folder. Before you add a second writer, read [what a second writer needs](./before-you-start.md#what-a-second-writer-needs).

## If setup stops

Press Ctrl+C at any point to stop. Before anything exists, setup says *Setup stopped. Nothing was created.* Afterward it says *Setup stopped. To resume, run cairn new again.* To resume, run `cairn new` from the same computer. It lists unfinished setups under **Resume setup**, with **Start a new site** last.

To see what unfinished setups this computer holds, run `cairn new status`. With nothing in progress it prints:

<!-- transcript: packages/create-cairn-site/test/fixtures/transcripts/07-cairn-new-status-empty.txt -->
```
No setups found.
```

[Recover a setup that stopped](./setup-recovery.md) covers each stop by what it says.

## See also

- [Before you start](./before-you-start.md) covers the cost and what stays yours.
- [Own your domain](./own-your-domain.md) covers a domain's existing records and the sign-in email.
- [Invite editors](./invite-editors.md) adds the people who write on the site.
- [Deploys](./deploys.md) covers how the site deploys, the free limit, and moving to Workers Builds.
- [Set up with an agent](./set-up-with-an-agent.md) runs the same setup through a coding agent.
- [Troubleshoot a live site](./troubleshooting.md) covers a live site that misbehaves.
