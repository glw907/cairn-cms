# create-cairn-site

Scaffold a branded [cairn](https://github.com/glw907/cairn-cms) site from the Waymark starter
theme and run it locally.

## Usage

```
npm create cairn-site
```

The command asks for the site's name, description, brand color, and target directory, then writes
a ready-to-run SvelteKit site. Node.js 22 or later is required, tracking the `@glw907/cairn-cms`
engine's own floor.

**macOS and Linux only.** Windows is not supported, including Git Bash and PowerShell. The
Cloudflare chapter shells out to `npm` and `wrangler` in a way Windows rejects, so a run there
fails partway through with an unclear error rather than refusing up front. Windows Subsystem for
Linux works, since it is Linux. Windows support is planned for the tool that replaces this one,
not for this one.

Answer any prompt ahead of time with a flag, and the command skips it:

| Flag | Effect |
| --- | --- |
| `--name` | The site's name, written into `site.config.yaml`. |
| `--description` | A short, one-line description of the site. Omit for none. |
| `--brand-color` | A hex color, an `oklch(...)` string, or a bare hue. Rotates the theme's brand accent. |
| `--dir` | Where to create the site. Defaults to a slug of the name. |
| `--yes` | Accept the defaults for anything not given by a flag. |
| `--dry-run` | Print every action and perform none. |

## The GitHub chapter

Right after the site is scaffolded, the command walks you through publishing it to GitHub. This
step is interactive by default. `--yes` alone skips it; add `--github` to opt in without a prompt.

### What gets created, and why

The chapter creates a GitHub App that this site's admin owns, using GitHub's manifest flow: a
one-time form that hands the tool a brand-new App's credentials, with no admin console step and
no credential to type in first. That App is its own OAuth client. There is no shared or standing
OAuth client that every scaffolded site reuses.

The App asks for two permissions on your personal account. It needs write access to the
repository's contents, to commit and push the site, and it needs Administration. That second one
is stated here as plainly as the tool states it before you approve:

> The App will be able to write this site's content and manage the repository's settings,
> including deleting it. GitHub does not allow an App's permissions to be reduced later, so this
> stays for as long as the App exists. This is what lets the tool create and publish to the
> repository for you.

Creating the App under an organization adds one more permission: read access to the
organization's members. GitHub requires that to confirm you are a member before the tool creates
the repository there.

### Two trips to your browser

The chapter opens your browser twice.

1. GitHub's "Create GitHub App" page. You click one button, and GitHub creates the App and hands
   its credentials back to the tool.
2. GitHub's install page for that App, which doubles as its authorize page. You choose where to
   install it, your personal account or the organization, and approve.

The tool waits on each trip and prints what it is waiting for. Nothing else needs typing in the
browser.

### Flags

| Flag | Effect |
| --- | --- |
| `--github` | Opt into the GitHub chapter without an interactive prompt. Pair with `--yes` for a fully unattended run. |
| `--app-name` | The GitHub App's name. Defaults to `cairn-<site-slug>`. |
| `--org` | Create the App and repository under this organization instead of your personal account. |
| `--repo-name` | The repository's name. Defaults to the site's slug. |
| `--start-over` | Set aside a previous run's saved progress and start the GitHub chapter fresh. |

### Resuming

Every hop, the App's credentials, the installation, the repository, is saved to the site's local
state record as soon as it completes. Running the command again with the same `--dir` finds that
record and resumes from the next unfinished hop. It never re-asks for the site's name, and it
never creates a second App.

An explicit `--org`, `--repo-name`, or `--app-name` on the resumed run overrides the saved answer
for whatever hop has not run yet.

`--start-over` is the escape hatch. It sets the saved record aside and starts the chapter over, as
if the command were run for the first time.

### Waiting on organization approval

An organization can require an owner's approval before installing a new App. When that happens,
the tool prints that GitHub has already notified the owners, saves its progress, and exits
cleanly. Nothing is lost. Running the command again, once an owner approves, picks up exactly
where it left off.

## The Cloudflare chapter

Once the site is on GitHub, the command offers to put it on the internet. Like the GitHub
chapter, this step is interactive by default. `--yes` alone skips it; add `--deploy` to opt in
without a prompt.

### What gets created, and what it costs

The chapter deploys your site to Cloudflare's free `workers.dev` hosting, on your own Cloudflare
account. It creates one Worker named after your site, two databases (`<site>-auth` for sign-ins
and `<site>-app` for the site's own data), and one storage bucket for media. Cloudflare's free
plan covers all of it. Nothing in this step costs money, and the tool never asks for a payment
method.

Deploying again later updates the same Worker rather than making a second one.

### One browser trip, then one click

If wrangler is not already signed in to Cloudflare, it opens your browser to Cloudflare's own
sign-in and waits. The tool holds no Cloudflare credential of its own; it works entirely through
wrangler's session.

At the end, the tool opens your new site's sign-in page with a link already in it. You click
**Sign in** once and you are in your own admin. No email is sent, and none needs to arrive. The
link is good for ten minutes; if it expires, `--sign-in` issues a fresh one.

### Your App's private key moves off your machine

The GitHub chapter saves the App's private key locally so it can push your site. As soon as the
Worker exists, this chapter uploads that key to the Worker as a secret and **deletes the local
copy**. After this step the key lives in exactly one place, your Worker, and the tool cannot read
it back. If it is ever lost, regenerate it at the App's settings page on github.com and run the
command again.

The key is only deleted locally after Cloudflare confirms the upload, so an upload that fails
leaves your copy where it was.

### Flags

| Flag | Effect |
| --- | --- |
| `--deploy` | Opt into the Cloudflare chapter without an interactive prompt. Pair with `--yes` for a fully unattended run. |
| `--owner-email` | The address you will sign in with. Required with `--yes`, since there is no way to ask for it. |
| `--sign-in` | Issue a fresh sign-in link for a site that is already live, and open it. |

### Resuming

Each hop is saved as it completes, the same as the GitHub chapter. A run interrupted after the
deploy picks up at the key move rather than deploying again, and one interrupted before it
re-runs the deploy, which is safe: Cloudflare binds the databases and bucket by name, so a second
deploy finds what the first one made instead of creating more.

## The domain chapter

Once your site is live, the command offers to connect it to a domain you own. This step is
interactive by default: it asks whether you want to connect one, and if so, which. `--domain
<name>` answers both at once, supplying the domain and skipping the prompts. Pair it with
`--yes` for a fully unattended run. `--yes` alone, with no `--domain`, skips this chapter and
prints a hint instead of guessing at a domain for you.

### What it does, and what it costs

The chapter creates a Cloudflare zone for your domain, or adopts one your account already holds.
It offers to copy the domain's current DNS records into that zone, then waits for you to point
your registrar's nameservers at Cloudflare. Once delegation takes effect, it connects the domain
to your site and switches your site's own address over to it. Cloudflare's free plan covers every
step, and the tool never asks for a payment method.

### The API token

The chapter opens your browser once, to Cloudflare's create-token page with the permissions it
needs already selected. Paste the token back at the prompt and the tool takes it from there. The
token lives only in the site's local state record, at mode `0600`, and is never written into the
project directory or passed on the command line.

An unattended run supplies the token through the `CAIRN_CF_API_TOKEN` environment variable
instead of the prompt. A token-shaped value on the command line is refused, with a message naming
that variable.

The token stays on disk through the domain going live, because the email chapter that follows
reuses it. It is deleted only once the chapter reaches its terminal state, which arrives with
that later chapter.

### The honest-DNS caveat

DNS has no command that lists every record a domain has. The records the copy step shows you
come from a fixed list of probes: the common addresses, mail records, and a handful of known
authentication and verification names. That list can miss records the probe never thought to ask
about, and on a domain that answers wildcard subdomains it can also show records you never
created. Check it against what you know before confirming it.

### Already at Cloudflare

If your domain's nameservers already point at Cloudflare, for example a domain registered
through Cloudflare Registrar, the zone arrives active. There is nothing to copy, and the chapter
says so and moves on.

### Waiting is normal

Three points in this chapter wait on something outside the tool: the nameserver switch taking
effect at your registrar, the new records propagating across the DNS, and the certificate for
your domain finishing issuance. Each is a normal outcome, not a failure. The command exits `0`,
prints what it is waiting for, and gives you the exact command to run again. Running it picks up
exactly where it stopped.

Your site keeps answering at its `workers.dev` address the whole time, including after the switch
to your own domain completes.

### Flags

| Flag | Effect |
| --- | --- |
| `--domain` | The domain to connect, and your opt-in to this chapter. Pair with `--yes` for a fully unattended run. |

## The email chapter

With your domain live, the command offers to turn on sign-in email. This is the step that lets
anyone other than you sign in, because everyone else gets in by clicking a link sent to their
address. Your own sign-in never needs it.

It asks once, and either answer is fine. `--email` opts in without the prompt. `--yes` alone, with
no `--email`, declines rather than putting you on a subscription unattended, and says which flag
turns it on.

### What it costs

Sending email needs Cloudflare's Workers Paid plan, at $5 US per month as of 2026-08-11. It is a
subscription rather than a charge per message, and it is billed once per account rather than once
per site, so a second site on the same account adds nothing. Your site's traffic has nothing to do
with it. The command states the price again at the moment it asks.

### Declining costs you nothing today

If you say no, the run stops there and exits `0`. Your site keeps serving on your domain, and you
keep editing and publishing as its owner. What you cannot do is invite anyone else, since there is
no way to send them a link.

Your own way back in is `npx create-cairn-site --dir <dir> --sign-in`, which writes a fresh sign-in
link straight into your site's database without touching email. Each one lasts 30 days, so nothing
expires out from under you while you decide. Running the command again re-offers the plan.

### What it does

The chapter onboards your domain for sending, sends one real message to your own address to prove
the path works, then writes `no-reply@<your-domain>` into your site's config and redeploys once so
the running site uses it. The test send comes before the redeploy on purpose: there is no point
deploying a site whose sending path is broken.

Onboarding adds records under `cf-bounce.<your-domain>` and leaves the mail you already receive
alone.

### Waiting is normal here too

New DNS records take a few minutes to settle, and a test send before they do will fail. That is a
normal outcome, not a failure: the command exits `0`, says it is waiting on DNS, and gives you the
command to run again. A later run picks up where it stopped and does not redo the onboarding.

### One thing to know for later

Onboarding writes a DMARC record for your domain set to `p=reject`, which asks receivers to reject
mail from your domain that does not pass authentication. If you later add another service that
sends as your domain, a newsletter tool for instance, add it to that record or its mail is
rejected. Turning Email Sending off again does not remove the record.

### Flags

| Flag | Effect |
| --- | --- |
| `--email` | Turn on sign-in email without an interactive prompt. Pair with `--yes` for a fully unattended run. |

## The Builds chapter

Once your site is live, the command offers to connect its repository to Cloudflare Workers
Builds, so every commit to your default branch deploys itself, no laptop involved. This step is
interactive by default: it asks whether you want to connect. Unlike the domain and email
chapters, `--yes` alone consents to this one rather than skipping it, since there is nothing
about connecting a repository that costs money or commits you to anything ongoing, so an
unattended run connects the repository and creates the trigger with no extra flag. It stops one
hop short of the end: the config commit needs the sign-in click described below, and `--yes`
never opens a browser, so an unattended run parks there and prints the command to finish
interactively. Running the command again later, from a site that already finished this run,
`--connect` opts in (or resumes a parked run) any time after your site is live on Cloudflare.

### What gets created, and what it costs

The chapter connects your repository to Workers Builds, creates a trigger bound to your existing
Worker, and, if your repository's committed `wrangler.jsonc` and `src/theme/cairn.config.ts` have
drifted from what your machine last deployed, commits the current versions back. It then watches
the first Builds deploy through to success. Cloudflare's free tier covers it: 3,000 build minutes
a month and one build running at a time, as of 2026-08-12
(https://developers.cloudflare.com/workers/platform/pricing/).

### No second dashboard trip for a token

Unlike a typical Workers Builds setup, this chapter does not send you to the dashboard to create a
separate build token. It asks you to paste a fresh Cloudflare API token, the same paste flow the
domain chapter already used, and registers that same token as your Workers Builds build token.
Two things still need a browser, and each is either one-time or skips cleanly on a re-run:

1. **Authorizing Cloudflare's "Workers and Pages" GitHub App** on your account, if you have not
   already done this for an earlier site. If it is not authorized yet, or if it is authorized but
   this repository is not among the ones it can see, the chapter prints the exact settings page to
   visit and the command to re-run once you have.
2. **One sign-in click**, to commit your `wrangler.jsonc` and `src/theme/cairn.config.ts` back to
   the repository. The commit this writes is attributed to you, so it needs a fresh sign-in the
   same way any other commit-writing step in this tool does. Nothing is committed unless the
   repository's copies actually differ; the sign-in is what lets the command read a private
   repository to find out.

   A later run skips this click when neither file has changed on your machine since the last time
   the command reconciled them. It decides that from a hash of the two files it recorded then, not
   by reading the repository, which needs the very credential the click grants. The narrowing that
   accepts, plainly: if you edit either file **in the repository** and change nothing locally, the
   command does not notice. Change either file on your machine, and the next run reconciles both.

### The coupling to your pasted token

Cloudflare's build token wraps the Cloudflare API token you pasted for this chapter, registered
under the name **cairn create-cairn-site build token**. Revoking or rolling that token later, at
the Cloudflare dashboard, breaks your automatic deploys, silently: your next commit still builds,
and the build fails with no warning beforehand. This is not a hypothetical risk. It is the exact
state a production cairn site was found in while this chapter was being built. If you rotate your
Cloudflare API tokens on a schedule, either exclude this one or update the build token to match
whenever you do.

### Migrations still run through this CLI

An automatic Builds deploy handles your site's code. It does not run database migrations:
`wrangler d1 migrations apply` has no Workers Builds equivalent. An engine update that ships a new
migration still needs you to run this CLI's own update path on your machine, so it is not
something you can set aside once Builds is connected.

### Waiting is normal

Two points in this chapter wait on something outside the tool: Cloudflare's App authorization
(above) and the first build itself, which can still be running when this run stops watching it.
Each exits `0`, prints what it is waiting for, and gives the exact command to run again. A failed
or unrunnable build is different: the run exits `1` with the build log's last few lines and a link
to the full log.

### Flags

| Flag | Effect |
| --- | --- |
| `--connect` | Re-enter this chapter on a later run, from a site that has already finished an earlier run, either to resume a park or to check for and commit a config drift on an already-connected site. |

### Resuming

Each hop is saved as it completes, the same as every earlier chapter. A park resumes with a plain
re-run; the connection and trigger are adopted rather than re-created if they already exist. Once
your site is live on Workers Builds, running `--connect` again re-checks your deploy config and
commits anything that has drifted on your machine since, such as a `PUBLIC_ORIGIN` your own machine
last deployed but never pushed. With `--yes`, a run that finds local drift stops and asks you to
re-run interactively: committing the change needs the sign-in click above, and `--yes` never opens
a browser.

## Watching a wait

Two waits in this tool can run longer than you want to sit and watch: DNS propagation in the domain
chapter, and the first build in the Builds chapter. On an interactive run, each one now holds in
place and prints a `127.0.0.1` URL. Open it and you get a page showing what the run is waiting on
and what it has read so far. When the wait clears, the run carries on in your terminal by itself.

### What the page shows

For DNS, the answer from your domain's own nameservers sits beside the answer your machine's
resolver gives. That distinguishes the two situations a single "still propagating" message used to
blur together: a record that was never written, and a record that is live everywhere except in your
own resolver's cache. The second one clears on its own, and the page tells you so. Certificate
issuance cannot be polled with the token this tool holds, so the page reports the HTTPS check it can
actually make rather than inventing a status.

For a build, the page shows its state as it moves from queued to running to an outcome, and the
commit it matched. The page refreshes on its own. When the wait clears it serves one last page
saying the run is continuing in your terminal, then stops.

### It only exists while a run is waiting

The console is not a daemon and nothing survives the run. No port is held between runs, and the URL
stops answering the moment the wait ends. Re-running the command is how you get it back.

Each run mounts the console under a fresh random path and refuses any request that did not arrive
addressed to your own machine. No token or secret appears on any page.

### A run that is not interactive never holds

With `--yes`, with output redirected, or under CI, both waits park exactly as they always have: exit
`0`, print what the run is waiting for, and give you the command to run again. The console is for a
person watching a terminal, so a scripted run behaves as though it did not exist.

### Interrupting a wait

Ctrl-C during a wait is safe. The run stops watching, saves what it learned, prints the same message
it would have printed on parking by itself, and exits `0`. Run the command again when you are ready.

### If the console cannot start

A port collision, or a sandbox that forbids listening, costs you the page and not the run. The wait
proceeds as it would have, and the run says once that the console is unavailable.

## Running the site

```
cd <your-site>
npm install
npm run dev
```

Then open `http://localhost:5173/admin`. That admin runs against a local stand-in backend, which
signs you in without an email loop and never touches GitHub or sends real email. The scaffold's
own `dev` script turns the stand-in on, so no environment variable is needed.

## Status

The local scaffold, the GitHub chapter, the Cloudflare chapter, the domain chapter, the email
chapter, and the Builds chapter all exist today, so the command takes a site from nothing to live
on a domain you own, sending its own sign-in email, deploying itself on every commit, with you
signed in to its admin throughout.

Scaffolding writes nothing outside the site directory except one record of the site under
`~/.config/cairn/sites/`, mode `0600`. No secret is ever written into the project. The App's
private key lives in that record only until the Worker exists, and then only in the Worker; the
record itself is not secret-free even after that move, since it still carries the App's client
secret and webhook secret, which this tool never relocates anywhere else. Each Cloudflare API
token, the domain chapter's and, later, the Builds chapter's own fresh paste, lives in that same
record for as long as its chapter still needs it, and this tool's copy is deleted once that
chapter reaches a state with nothing left to do with it.

One consequence of the Builds chapter deserves stating on its own, because deleting this tool's
copy is not the same as the token being gone. Registering your pasted token as the build token
means Cloudflare keeps its secret and supplies it to every build your repository runs, where
`wrangler` reads it from the environment. The token the create-token page asks for is scoped
across all your accounts and zones, and it can edit DNS, zones, SSL, Workers, D1, R2, and Email
Sending, so anyone who can land a commit on your default branch, or any build-time dependency you
install, can read a credential with that reach. That is the price of not sending you to the
dashboard for a second token, and it is worth knowing before you accept it. If that trade is
wrong for your site, mint the build token yourself at the Cloudflare dashboard, scope it to
deploys alone, and point the trigger at it.
