# Recover a setup that stopped

The setup command saves its progress after every step, so a step that fails, a browser page you close, or a run you interrupt never costs you the steps before it. This page is for the moment a run stopped and you need to know where it stands and what to type next. Each row in the tables below lists one stopping point, what it means, and whether to wait, act, or ask someone. The page covers setup only. It doesn't cover a site that is already live.

This page covers a setup that stopped. Two other pages cover problems at other moments:

- If a `cairn doctor` check named a problem, read [Check that your site works](./is-it-working.md).
- If the site is live and doing something wrong, and no check names it, read [Troubleshoot a live site](./troubleshooting.md).

## Resume a run

The command writes its progress to a record on the computer you ran it from, in `~/.config/cairn/sites`. The record never lives inside your site's folder, so a push can't publish it. To continue after any stop, run the same command again with the folder you created:

```
npx create-cairn-site --dir <your-site-directory>
```

The command reads what it already finished and continues from there. Finished steps don't repeat: an existing App isn't created again, a pushed repository isn't pushed again, and a connected domain isn't connected again. Every table below ends in this command, sometimes with an extra flag.

A local address such as `http://127.0.0.1:36927` can appear during a long step, with a note to leave the run going. The address works only on your own computer and only during that step, and the page it serves shows no secret. You can open it, ignore it, or close it. The run continues either way, and the page disappears when the step finishes.

## Get your site onto GitHub

The following table lists where a run can stop on its way to GitHub, what each stop means, and what to do.

| Where you stopped | What it means | What to do |
| --- | --- | --- |
| A browser step was never finished | The App's name was taken, or you closed the page. If the App was created but never installed, its saved credentials are safe. | **Act:** run the command again. Add `--app-name <a-new-name>` if GitHub said the name was taken. |
| The App may exist but its key was never collected | GitHub allows one hour to collect the new App's credentials, and that hour passed. | **Act:** delete the App on [GitHub's apps page](https://github.com/settings/apps) if it exists, then run the command again, with a new `--app-name` if needed. |
| GitHub's authorization code expired | The browser step took too long and nothing was collected. | **Act:** run the command again and finish the browser step promptly. |
| A repository with that name exists | GitHub refused to create it. | **Act:** run the command again with `--repo-name <a-different-name>`. |
| Waiting on an organization owner | You're creating the App under an organization, and GitHub needs an owner's approval to install it. GitHub has already emailed the owners. | **Ask an organization owner:** once they approve, run the command again. |
| The organization enforces single sign-on | GitHub blocked the request until the App is authorized for the organization. | **Ask an organization owner:** have them authorize the App under the organization's settings. Then run the command again. |
| The App is installed, but the push was interrupted | Nothing is lost or duplicated. | **Act:** run the command again. The push resumes. |
| The App's installation doesn't cover your repository | The install page's repository choice left it out. The repository exists, and the next run reuses it. | **Act:** on [GitHub's installations page](https://github.com/settings/installations), open the App, set the repository access to **All repositories** (or, under **Only select repositories**, add your repository), then run the command again. |
| No browser window reached you | The command opened the browser, but the window never appeared, or it opened somewhere you aren't working. | **Act:** copy the link the command printed into the browser you work in, and use that link rather than GitHub's own "New GitHub App" form, because an App made there never reports back. |

## Get your site onto Cloudflare

The following table lists where a run can stop on its way to Cloudflare, what each stop means, and what to do.

| Where you stopped | What it means | What to do |
| --- | --- | --- |
| You declined the deploy prompt | Nothing is wrong. The site stays on GitHub only. | **Act when you're ready:** run the command again. It asks again. |
| Cloudflare's sign-in wasn't completed | Wrangler has no account to deploy to. Nothing changed. | **Act:** run the command again and finish the browser sign-in. |
| Wrangler can't run | The site's dependencies aren't installed. | **Act:** run `npm install` in the site's folder, then run the command again. |
| Installing, building, or deploying failed partway | The command printed what npm, the build, or wrangler reported. | **Act:** fix what it printed, then run the command again. A second deploy finds the resources the first one made and creates no more. |
| Your account has no `workers.dev` subdomain | Cloudflare needs you to register one before a Worker can deploy. It's free. | **Act:** accept the suggested subdomain in Cloudflare's dashboard, then run the command again. |
| More than one Cloudflare account on the login | An unattended run can't ask which to use. | **Act:** run the command again without `--yes`, so it can ask. |
| The deploy finished but the database or the key step didn't | The Worker, the database, and the bucket all exist. The migrations, the App-key upload, or the first sign-in record didn't complete. | **Act:** run the command again. Each of those steps is safe to retry. |

Once this part finishes, the site is live and you're signed in. [Create your site](./create-your-site.md) shows what that looks like.

## Connect your domain

The following table lists where the domain steps can stop, what each stop means, and what to do.

| Where you stopped | What it means | What to do |
| --- | --- | --- |
| You declined to connect a domain | Nothing is wrong. The site keeps working at its `workers.dev` address. | **Act when you're ready:** run the command again. It asks again. |
| The API token was refused | The pasted token is invalid, or it lacks a permission. | **Act:** run the command again. It opens the token page for a fresh token. |
| Waiting for the nameserver switch | Your registrar still points the domain at its old nameservers, or the change is still spreading. This can take a few minutes to 48 hours. | **Wait:** run the command again in a few minutes. Nothing needs fixing. |
| The domain points at a different Cloudflare account | An agency or a previous developer probably owns that account. | **Ask whoever controls that account:** they have to release the domain. [Own your domain](./own-your-domain.md#carry-over-existing-dns-records) covers the case. |
| The domain is delegated but not answering | The certificate or the domain's own record hasn't finished spreading. | **Wait:** run the command again in a few minutes. The `workers.dev` address works the whole time. |

## Turn on sign-in email

The following table lists where the sign-in email steps can stop, what each stop means, and what to do.

| Where you stopped | What it means | What to do |
| --- | --- | --- |
| You declined sign-in email | Nothing is wrong. You keep signing in as the owner. | **Wait:** nothing needs fixing. A later run from a terminal asks again. For an unattended run, pass `--email` and `--yes`. |
| The account isn't on Workers Paid | The command stopped when it tried to onboard sending. | **Act:** turn on the plan in Cloudflare's dashboard, then run the command again. |
| The sending records are still spreading | A test send before the records settle fails. This is normal. | **Wait:** run the command again in a few minutes. It doesn't repeat the onboarding. |
| The test send failed for another reason | Cloudflare refused the send, or the daily limit was reached. | **Act, or wait:** the command prints the cause. Fix it or wait for the limit to reset, then run the command again. |

## Connect to Workers Builds

The following table lists where the Workers Builds steps can stop, what each stop means, and what to do.

| Where you stopped | What it means | What to do |
| --- | --- | --- |
| You declined Workers Builds | Nothing is wrong. Deploys still go through the setup command. | **Act when you're ready:** run the command again with `--connect`. |
| Cloudflare's Workers and Pages GitHub App isn't authorized yet | Cloudflare needs a one-time authorization before it can watch any repository. | **Act:** authorize it from Cloudflare's dashboard, then run the command again with `--connect`. |
| Your repository isn't on Cloudflare's list | That app watches only repositories you add. | **Act:** add the repository on [GitHub's installations page](https://github.com/settings/installations), then run the command again with `--connect`. |
| The config commit or the first build hasn't finished | The commit needs a sign-in click, or the build is still running. | **Act, or wait:** run the command again with `--connect`. It resumes where it stopped. |
| A build failed | This needs a fix, not another run. | **Act:** the command prints the end of the build log and a link to the full log. Fix what it names, then run it again with `--connect`. |

## Sign in again

When the sign-in link the command opened has expired, or you return to a live site on a new day, get a fresh link:

```
npx create-cairn-site --dir <your-site-directory> --sign-in
```

The command writes a fresh sign-in link into your site's database and opens it, with no email involved. It works whether or not you've connected a domain. The link works for ten minutes, and the session it starts lasts 30 days. To sign in as a different address, add `--owner-email <you@example.com>` to the same command.

## Start over

The flag `--start-over` sets the saved progress aside and starts a fresh site in the same folder. It refuses once the site has resources it can't safely abandon: a live Cloudflare zone with your records copied into it, a Worker attached to your domain, or a Workers Builds connection. When it refuses, it names what to remove first, so it never silently discards a working setup.
