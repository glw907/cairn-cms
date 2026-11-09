# Recover a setup that stopped

Setup saves its progress as it goes, so a step that fails, a browser tab you close, or a run you interrupt never costs you the steps before it. This page is for the moment a `cairn new` run stopped and you need to know what it kept and what to do next. It covers a run that stopped before the site went live, and it expects only that you saw setup stop. Each stop below is classed as one of three next steps: wait, act, or ask someone else.

Two other pages cover problems at other moments:

- If a `cairn doctor` check named a problem, read [Check that your site works](./is-it-working.md).
- If the site is live and doing something wrong, and no check names it, read [Troubleshoot a live site](./troubleshooting.md).

## Resume a run

Setup writes a record of each run to your computer, in the `cairn/sites` folder of your user configuration folder. The record never lives in your site's folder, so a push can't publish it. To continue a stopped run:

1. Open a terminal on the computer where you ran setup.
2. Run `cairn new` again, or run `npm create cairn-site`, which starts it.
3. In the list titled **Resume setup**, choose the site that didn't finish. Each entry shows the site's name and its domain.

The list always ends with **Start a new site**, so a stopped run never blocks another site. Setup continues from the last step it completed. Finished steps don't repeat: an existing GitHub App isn't created again, and a pushed repository isn't pushed again. A resumed run asks for a Cloudflare approval again only when Cloudflare no longer accepts the saved one.

A run that has no terminal, such as an agent's, resumes by name. `cairn new --resume <id>` continues one run, and `cairn new --new` starts another site and ignores the unfinished ones. `cairn new status` lists the ids.

## Check that the run resumed

When a resumed run finishes, `cairn new status` lists it as `finished`:

```
cairn new status
```

A run that stopped again is listed as `unfinished`, with the step where it stopped.

## Read a stop

Every stop is worded in four parts: what happened, why, what setup kept, and what to do. The tables below give each stop in that order, with the class of the next step in bold. A stop before anything exists says `Nothing was created.` After that, setup lists what it made, and everything it lists stays in place for the next run.

A stop ends with one of three exit codes, which matter to a script or an agent and not to you at the terminal:

- Exit code 1 means setup stopped at a step. This covers every failure in the tables, including a refusal found after the run began.
- Exit code 2 means setup was interrupted or timed out: you pressed Ctrl+C, or the 30-minute limit for the browser approvals ran out.
- Exit code 3 means setup refused a flag or a plan file before it ran anything, so it created nothing.

Exit codes 1 and 2 both leave the run saved, and `cairn new --resume` continues either one.

## Fix a stop before setup creates anything

The following table lists the stops that happen on your computer, before the browser approvals. Setup created nothing, so each fix is to change what setup found and run it again. [Before you start](./before-you-start.md#what-you-need-on-your-computer) lists what the computer needs.

| What happened and why | What setup kept | What to do |
| --- | --- | --- |
| Setup can't run over SSH or without a display. It opens its approval pages in a browser on the computer where it runs. | Nothing was created. | **Act:** run `cairn new` in a terminal on the computer where you use your browser. |
| Setup can't find Git, or can't find Node.js, or the computer has a Node.js older than 24. | Nothing was created. | **Act:** install Git, or Node.js 24 or later, then run `cairn new` again. |
| Port 49152 is in use, because another setup may be running. | Nothing was created. | **Wait or act:** let the other setup finish, or stop it, then run `cairn new` again. |
| Setup can't use your computer's keyring, which stores its credentials until the run ends. | Nothing was created. | **Act:** unlock or set up your keyring, then run `cairn new` again. |
| Setup couldn't get the site template from npm. | Nothing was created. | **Act:** check your internet connection, then run `cairn new` again. |
| The folder for your site already exists and isn't empty. | Nothing was created. | **Act:** move or rename that folder, or run `cairn new` from another folder. |

## Fix a stop after the Cloudflare approval

The following table lists the stops that setup finds by checking your Cloudflare account, which happens right after approval 1. Setup created nothing on GitHub or Cloudflare. It does keep the Cloudflare approval in your keyring, so the rerun can reuse it. [Before you start](./before-you-start.md#what-you-need-on-cloudflare) lists what the account needs.

| What happened and why | What setup kept | What to do |
| --- | --- | --- |
| Your Cloudflare sign-in has no account, so setup has nowhere to create the site. | Nothing was created. | **Act:** create a Cloudflare account, then run `cairn new` again. |
| Your Cloudflare account has no domains. Your site sends sign-in links by email, and Cloudflare sends email only from a domain on your account. | Nothing was created. | **Act:** register a domain with Cloudflare, or add a domain you own to Cloudflare, then run `cairn new` again. |
| Your domain is still being added to Cloudflare. | Nothing was created. | **Wait:** when Cloudflare shows the domain as active, run `cairn new` again. |
| The address you chose already has DNS records in Cloudflare, so it points at another site. | Nothing was created. | **Act:** remove the DNS records for that address in Cloudflare, or choose another address. Then run `cairn new` again. |
| A Worker already serves the address you chose. | Nothing was created. | **Act, or ask whoever runs that Worker:** remove the Worker's custom domain or route for that address in Cloudflare, or choose another address. Then run `cairn new` again. |
| Every name from your site's name to the same name followed by `-9` is already in use. | Nothing was created. | **Act:** choose another site name, then run `cairn new` again. |
| Cloudflare didn't approve setup's request, or its approval left out `API Tokens: Write`. Setup needs that permission to create the site's deploy key. | Nothing was created. | **Act:** run `cairn new` again. On the Cloudflare page, select `API Tokens: Write`, and then select **Allow**. |

## Fix a stop during the browser approvals

The following table lists the stops that happen while you approve requests in the browser tab, which setup limits to 30 minutes in all. A stop here keeps the Cloudflare approval and each GitHub step you finished.

| What happened and why | What setup kept | What to do |
| --- | --- | --- |
| The 30-minute limit to approve the requests ran out, or you pressed Ctrl+C. Setup exits with code 2. | The completed approvals. | **Act:** run `cairn new` again to resume. |
| Cloudflare no longer accepts the approval setup saved. | The completed steps. | **Act:** run `cairn new` again. On the Cloudflare page, select `API Tokens: Write`, and then select **Allow**. |
| The Cloudflare approval doesn't include the account the setup began in. | The completed steps. | **Act:** run `cairn new` again, select the same account as before, then select `API Tokens: Write` and **Allow**. |
| GitHub says the App's name is taken. | The Cloudflare approval. | **Act:** change the name on GitHub's page. Setup uses the name you choose. |
| Setup couldn't store a credential in the keyring. | The completed steps, and the GitHub App if setup had created it. | **Act:** unlock your keyring and run `cairn new` again. If setup names a GitHub App to delete, delete it first at the address setup prints. |
| The GitHub App may still have access to all your repositories. Setup couldn't confirm that its access is limited to the new repository. | The App and the repository, and an installation that may reach every repository. | **Act:** remove the App's installation at [GitHub's installations page](https://github.com/settings/installations), then run `cairn new` again. When GitHub asks, select **Approve** to give the App access to the new repository only. |
| A repository with that name already exists on your GitHub account, or you approved the GitHub install as a different account from the one that owns the App. Setup can't confirm that it created the repository. | The completed steps. | **Act:** delete the repository if you don't need it, or sign in to GitHub as the App's owner. Then run `cairn new` again. |

## Fix a stop while setup builds the site

The following table lists the stops that happen after the summary, while setup creates the database, pushes the site, and runs the first deploy. The GitHub App and the repository exist by now, and the stop lists whatever else setup made.

| What happened and why | What setup kept | What to do |
| --- | --- | --- |
| Setup couldn't write the site into its folder, because the folder isn't writable. | The App and the repository. | **Act:** make the folder writable, then run `cairn new` again. |
| The site's folder changed after setup wrote it, so setup can't build on it. | Everything setup created. | **Act:** undo your changes in that folder, then run `cairn new` again. |
| A Worker, database, or storage bucket named for your site already exists, and setup can't confirm that it created it. | Everything setup created. | **Act:** delete that resource in Cloudflare if you don't need it, then run `cairn new` again. If you need it, start a new site with another name. |
| The repository already holds commits that setup didn't make. | Everything setup created. | **Act:** remove those commits or delete the repository, then run `cairn new` again. |
| Setup couldn't push the site to GitHub. | Everything setup created. | **Act:** check your internet connection, then run `cairn new` again. |
| The first deploy failed in GitHub Actions. Setup retries it once before it stops, and it names no cause. A common cause is an account without the Workers Paid plan, which every cairn site needs. | Everything setup created. | **Act, or ask a developer:** open the run at the address setup prints and read why it failed. If the account lacks Workers Paid, subscribe, then run `cairn new` again. Setup resumes at the first deploy. |
| The first deploy didn't finish within 30 minutes. | Everything setup created. | **Wait or act:** open the Actions tab of your repository on GitHub to see whether the deploy is still running, then run `cairn new` again. |
| The site didn't answer over HTTPS within 15 minutes. Cloudflare is still issuing the certificate. | Everything setup created. | **Wait:** run `cairn new` again in a few minutes. Setup resumes at connecting your domain. |
| A request to Cloudflare or GitHub failed, or setup stopped on an unexpected error. | Everything setup created. | **Act:** check your internet connection, then run `cairn new` again. |
| Setup couldn't save its record of the run. | Everything setup created. | **Act:** make sure your home folder is writable, then run `cairn new` again. |

## Sign in again

When the sign-in link setup opened has expired, or you come back to the live site on another day, request a new one:

1. Go to your site's `/admin`.
2. Enter the email address you gave setup.
3. Open the sign-in link in the email, in the same browser.

The link works for 10 minutes. If no email arrives, read [Troubleshoot a live site](./troubleshooting.md#nobody-can-sign-in-or-one-person-cant).

## Start over

To begin a different site, run `cairn new` and choose **Start a new site**, or run `cairn new --new`. Setup never deletes what an abandoned run made. That run keeps its entries in your keyring, its GitHub App, and its repository until you remove them. [Credentials](./credentials.md#remove-what-an-unfinished-run-holds) lists what each unfinished run still holds and how to remove each part.

## See also

- [Create your site](./create-your-site.md) shows the setup from the start.
- [Own your domain](./own-your-domain.md) covers the domain your site uses.
- [Credentials](./credentials.md) covers what setup holds on your computer, and when it deletes each part.
