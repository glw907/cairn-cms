# Setup recovery

A setup step failed or was interrupted; get back on the path.

- A `cairn-doctor` check named a problem by name: [Is it working?](./is-it-working.md) covers it.
- A setup step failed, parked, or got interrupted before your site went live: this page covers
  it, below.
- The site is live and doing something wrong, with no doctor check naming it:
  [Troubleshooting](./troubleshooting.md).

## How resuming works

Every step of setup saves your progress before moving to the next one, to a file on the machine
you ran the command from, never inside your site's own folder. Whenever a step fails, gets
interrupted, or simply asks you to come back later, run the exact same command again:

```
npx create-cairn-site --dir <your-site-directory>
```

The tool reads what it already finished and continues from there. Nothing runs twice: an App
that already exists isn't recreated, a repository that's already pushed isn't pushed again, a
domain that's already connected isn't reconnected. The tables below cover every point setup can
pause at, in order, with the exact command that gets you past each one.

### A web address like `http://127.0.0.1:...` showed up while setup was running

While `create-cairn-site` is running a step that takes a while, like connecting a domain or
watching a Workers Builds deploy, it may print a local web address and tell you to leave it
running. That page is served only for the length of that one run, only to your own machine;
nothing about it is reachable from anywhere else, and it carries no secret. It exists to show you
live progress on a wait that can take a few minutes, instead of leaving your terminal silent.
It's safe to open, safe to ignore, and safe to close: the run keeps working either way, and the
page itself disappears once that step finishes.

## Getting onto GitHub

| Where you stopped | What happened | Getting back on the path |
| --- | --- | --- |
| Right after scaffolding, before the GitHub App exists | Your site exists locally; nothing has touched GitHub yet | Re-run the preceding command; the tool starts getting your site onto GitHub fresh. |
| The App was created, but you never finished installing it | You (or your browser) didn't complete the install-and-authorize step. The App and its saved credentials are safe. | **Act:** re-run the command; it resumes right at the install step. |
| Waiting on an organization owner | You're creating the App under an organization, and GitHub needs an owner's approval before it installs. GitHub already emailed them. | **Ask someone:** once an owner approves it (under the organization's own Settings), re-run the command and the tool picks up where it left off. |
| The App is installed, but the repository push was interrupted | Nothing is lost or duplicated. | **Act:** re-run the command; the push resumes safely. |
| The App's installation doesn't cover your repository | This can happen if the App's repository access changed after it was created. | **Act:** at [github.com/settings/installations](https://github.com/settings/installations), find the App, choose "Only select repositories," add your repository back, then re-run the command. |

## Getting onto Cloudflare

| Where you stopped | What happened | Getting back on the path |
| --- | --- | --- |
| Your repository is pushed, but Cloudflare deploy hasn't started or didn't finish | You declined the deploy prompt, or a step like install, sign-in, build, or deploy itself failed partway. | **Act:** re-run the command; it tells you exactly what to fix if something failed, or simply continues if you'd only declined. |
| The site deployed, but the sign-in step didn't finish | Your Worker, databases, and storage bucket all exist and work. Only moving the App's key to a Worker secret, or writing your first sign-in link, didn't complete. | **Act:** re-run the command; both are safe to retry, and neither repeats work that already succeeded. |

Once this finishes, your site is live and you're signed in: see
[Create your site](./create-your-site.md) for what that looks like, and
[Getting back in](./create-your-site.md#getting-back-in) if your sign-in link itself has expired.

## Connecting your domain

| Where you stopped | What happened | Getting back on the path |
| --- | --- | --- |
| You declined connecting a domain | Nothing is wrong; your site keeps working at its `workers.dev` address. | **Wait, or act whenever you're ready:** re-run the command with `--dir <your-site-directory>` any time to be asked again. |
| The Cloudflare zone exists, but nothing past it has run | The pasted token stopped working, or you closed the browser mid-step. | **Act:** re-run the command; it re-checks your token and, if needed, opens the create-token page again. |
| Waiting for your domain to switch nameservers | Your domain still points at its old nameservers, or the switch is still propagating across the internet. This is normal and can take anywhere from a few minutes to 48 hours. | **Wait:** re-run the command in a few minutes to check again; nothing needs fixing. |
| Your domain is delegated, but to the wrong Cloudflare account | The domain points at a nameserver pair that belongs to a different Cloudflare account than the one your token is scoped to, an agency's or a previous developer's, most likely. | **Ask someone:** whoever controls that account has to release the domain first; see [the "stop and talk to whoever runs your DNS" note](./own-your-domain.md#if-this-domain-already-has-dns-records). |
| Your domain is delegated, but not answering yet | Nameservers switched, but your domain's own record, or the HTTPS certificate, hasn't finished propagating. | **Wait:** re-run the command in a few minutes; your site keeps answering at `workers.dev` the whole time. |
| The domain half finished, but email sign-in didn't | You declined the Workers Paid prompt, or onboarding is still propagating. A decline is a real, saved answer, not a stuck state. | **Act, or wait:** re-run the command; a decline is re-offered, and a still-propagating onboard just needs a few more minutes. |

Two full facts this table only touches: the domain-and-mail conflation and the "ask whoever runs
your DNS" branch both live in
[Own your domain](./own-your-domain.md#if-this-domain-already-has-dns-records) in full.

## Connecting to Workers Builds

| Where you stopped | What happened | Getting back on the path |
| --- | --- | --- |
| You declined connecting to Workers Builds | Nothing is wrong; deploys still go through this CLI. | **Act whenever you're ready:** re-run the command with `--connect`. |
| Cloudflare's GitHub App isn't authorized on your account yet | This is a one-time authorization Cloudflare needs before it can watch any repository. | **Wait, then act:** authorize it from Cloudflare's dashboard, then re-run the command with `--connect`. |
| Your repository isn't in Cloudflare's watched list yet | The App is authorized, but only watches repositories you've explicitly added. | **Act:** add your repository at [github.com/settings/installations](https://github.com/settings/installations), then re-run with `--connect`. |
| The connection and trigger exist, but the config commit or the first build hasn't finished | The reconcile commit needs a sign-in click, or the build simply hasn't appeared or finished yet. | **Act, or wait:** re-run with `--connect`; it resumes right where it stopped. |
| A build failed | This needs a real fix, not a re-run. | **Act:** the tool prints the build log's tail and a link to the full log in the Cloudflare dashboard; fix what it names, then re-run with `--connect` to trigger a fresh build. |

## Getting back in

If the link the tool opens for you has expired, or you're returning to a site on a new day, run:

```
npx create-cairn-site --dir <your-site-directory> --sign-in
```

This writes a fresh sign-in link straight into your site's database and opens it, with no email
round trip; it works whether or not you've connected a domain or Workers Builds yet. That link
itself works for ten minutes; once you're signed in through it, the session it opens lasts 30
days. If the email address you want to sign in as has changed, add
`--owner-email <you@example.com>` to the same command.

## Starting over

`--start-over` sets your current progress aside and starts a fresh site in the same directory.
It refuses once your site has real, connected resources it can't safely abandon: a live
Cloudflare zone with your DNS records copied into it, a deployed Worker attached to your domain,
or a Workers Builds connection and trigger. When it refuses, it tells you so and names what you'd
need to remove yourself first, rather than silently discarding a working setup.
