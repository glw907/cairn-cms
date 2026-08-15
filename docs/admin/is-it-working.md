# Is it working?

A check failed; here is exactly what it means and what fixes it.

- A `cairn-doctor` check named a problem by name: this page covers it, below.
- A setup step failed, parked, or got interrupted before your site went live:
  [Setup recovery](./setup-recovery.md).
- The site is live and doing something wrong, with no doctor check naming it:
  [Troubleshooting](./troubleshooting.md).

## Running the check

From your site's directory, run:

```
npx cairn-doctor
```

It reads your local config, your Cloudflare account, and your GitHub App, and reports one line
per check: a pass, a fail, or a skip when a check has nothing to look at yet (an unconnected
domain, say). The full command reference is [`cairn-doctor`](../reference/doctor.md).

Every failing check names a **condition id**, something like `email.sender-not-onboarded`. Find
that exact id below; each one is a heading on this page, grouped where several ids share one
underlying fix. A **blocker** stops someone from signing in or your site from working correctly;
a **warning** is real but doesn't block anyone today.

A **skip** is neither: it means the check didn't run at all, most often because it needs a
credential that isn't in the shell you ran it from. Those checks need a value your terminal
doesn't have: your GitHub App's private key, which setup moved into your deployed Worker and
nowhere else, or a Cloudflare API token, which the tool held only in its own local progress file
while setup was running and deleted once each stage finished. A skip there isn't a pass; it's the
check telling you it had nothing to check.

**Making the Cloudflare and D1 checks run.** You can supply that credential yourself, since it's
just a token you create on Cloudflare's own site: open Cloudflare's
[create API token](https://dash.cloudflare.com/profile/api-tokens) page, the same kind of page
`create-cairn-site` opened for you during
[Own your domain](./own-your-domain.md#connect-your-domain), and give the new token read access to
Zone, Email Sending, and D1. Then, from your site's directory:

```
CLOUDFLARE_API_TOKEN=<the token you just created> npx cairn-doctor
```

If `wrangler.jsonc` doesn't already carry an `account_id` (it doesn't on a fresh
`create-cairn-site` site), also set `CLOUDFLARE_ACCOUNT_ID`, which Cloudflare's
[Workers & Pages overview](https://dash.cloudflare.com/?to=/:account/workers-and-pages) page
shows in its sidebar. Delete the token from that same create-API-token page once you're done with
it; nothing deletes it for you the way setup does.

**The GitHub App check is different: you can't make it run yourself.** `create-cairn-site`
deliberately moves the App's private key off your machine and into your Worker's secret store
during setup, and keeps no copy anywhere you can get back to; not even the tool that put it there
can read it back out, since Cloudflare secrets are write-only. If you need this check to actually
run, that's a developer's job: send them
[Rotate the GitHub App key](../extend/rotate-the-github-app-key.md), which mints a fresh key
either of you can then run the check with.

A site `create-cairn-site` built for you ships already wired for the binding, observability,
origin, and admin-mount conditions below, so those only show up if your site's code has changed
since. Two are worth knowing about before you read a skip or a fail as something you broke: the
dependency-floor check can still fail later as packages drift, with nothing you customized, and
the site-config check looks for `site.config.yaml` in a couple of conventional spots that don't
include where the scaffold actually put it, so it reports a skip on an unmodified site rather than
a clean pass.

Jump to what your doctor named:

- [Force HTTPS at the edge](#force-https-at-the-edge) — `edge.https-not-forced`
- [Onboard the sending domain](#onboard-the-sending-domain) — `email.sender-not-onboarded`,
  `email.send-failed`
- [Deploy the Worker with its bindings](#deploy-the-worker-with-its-bindings) —
  `config.bindings-missing`
- [Turn on observability](#turn-on-observability) — `config.observability-off`
- [Wire cairn's CSRF guard](#wire-cairns-csrf-guard) — `config.csrf-disable-missing`
- [Set the public origin](#set-the-public-origin) — `config.public-origin-invalid`
- [Validate the site config](#validate-the-site-config) — `config.site-config-invalid`
- [Meet the dependency floors](#meet-the-dependency-floors) — `config.dependency-floors-unmet`
- [Turn on HSTS](#turn-on-hsts) — `edge.hsts-off`
- [Make the stated AI posture effective](#make-the-stated-ai-posture-effective) —
  `ai.posture-not-effective`
- [Provision the auth store](#provision-the-auth-store) — `auth.store-unreachable`,
  `auth.unknown-role`, `auth.role-wiring-missing`, `auth.email-not-normalized`
- [Install the GitHub App](#install-the-github-app) — `github.app-unreachable`
- [Wire the admin mount](#wire-the-admin-mount) — `admin.mount-incomplete`
- [Probe the deployed admin](#probe-the-deployed-admin) — `admin.login-probe-failed`
- [Refresh the admin-screens skill](#refresh-the-admin-screens-skill) — `skill.admin-screens-stale`

Two more sections below cover a real blocker, but `cairn-doctor` never reports either one; your
site answers with the refusal itself, the moment it happens:

- [Admin CSRF token rejected](#admin-csrf-token-rejected) — `auth.csrf-token-invalid`
- [Non-admin origin rejected](#non-admin-origin-rejected) — `auth.csrf-origin-mismatch`

## Force HTTPS at the edge

**`edge.https-not-forced`, a blocker.** The check confirms your Cloudflare zone forces every
visit onto HTTPS. The admin's sign-in page posts a plain form with no JavaScript, and cairn's CSRF
guard rejects a form submitted over plain HTTP, so an admin reached over `http://` hits an opaque
403 with no way to sign in.

**Act:** turn on Always Use HTTPS for your zone, and keep HSTS on alongside it. Cloudflare's own
[Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
page names where the setting lives.

## Admin CSRF token rejected

**`auth.csrf-token-invalid`, a blocker.** `cairn-doctor` never reports this one: it's your site's
own guard refusing a request outright, on the spot, logged as `guard.rejected` with
`reason: csrf`. An admin form submission carried no valid CSRF token, or one that didn't match.
This is almost always a stale browser tab or a browser blocking cookies for the site, not a
configuration problem.

**Act:** open the sign-in page fresh, allow cookies for your site, and request a new sign-in
link.

## Non-admin origin rejected

**`auth.csrf-origin-mismatch`, a blocker.** `cairn-doctor` never reports this one either: it's
your site's own guard refusing the request, logged as `guard.rejected` with `reason: origin`. A
form submission outside the admin carried an `Origin` header that didn't match your site, so
cairn's own origin check refused it.

**Act:** confirm the form is being posted from your site itself, not embedded or proxied from
somewhere else; if you run a reverse proxy in front of your site, check whether it strips or
rewrites the `Origin` header.

## Onboard the sending domain

**`email.sender-not-onboarded`, a blocker.** Your site's from-address domain has no enabled
Cloudflare sending subdomain, so it has no way to send a sign-in email at all, and nobody besides
you can sign in. If you set this domain up through
[Own your domain](./own-your-domain.md#turn-on-sign-in-email), that page already carries this;
this check is what confirms it stuck.

**Act:** onboard the sending domain with `npx wrangler email sending enable <domain>`, then
redeploy with `npx wrangler deploy`. The domain has to match your site's configured sign-in
sender. Both commands use the same Cloudflare sign-in `create-cairn-site` set up on this machine
when it first deployed your site, so there's no separate `wrangler login` to do first.

**`email.send-failed`, also a blocker.** The sending domain is onboarded, but a real send attempt
failed for some other reason: a delivery error, a misconfigured binding, or a problem with the
sender address itself. This check only runs when you pass `--send-test <address>`; a bare
`npx cairn-doctor` never tries a real send, and won't even print a skip line for it. Running it is
the fastest way to prove sending actually works without waiting on a real editor to try.

**Act, or ask a developer:** find the matching `auth.link.send_failed` record in your logs (see
[Troubleshooting](./troubleshooting.md#reading-your-sites-logs)) and read its `code` and `error`
fields. If they point at your sender address, you can fix that yourself; if they point at the
`EMAIL` binding itself, that's a developer's config change.

## Deploy the Worker with its bindings

**`config.bindings-missing`, a blocker.** Your wrangler config is missing the `send_email`
binding named `EMAIL`, the D1 binding named `AUTH_DB`, or both. Without them, sign-in mail has
nothing to send through and sessions have nowhere to be stored, so nobody can sign in.

**Ask a developer:** declare a `send_email` binding named `EMAIL` and a `d1_databases` binding
named `AUTH_DB` in your `wrangler.jsonc` (or `wrangler.toml`), then redeploy; see
[Wire the delivery surface](../extend/wire-the-delivery-surface.md) and
[Cloudflare](../reference/cloudflare.md) for the shape.

This same condition id also covers two other checks: a storage bucket your site expects for
images but `wrangler.jsonc` doesn't declare (only on a site with an image library), and a key for
the tidy-up feature. The check's own detail line names which of the three actually failed, so read
that rather than assuming it's always the `EMAIL`/`AUTH_DB` pair.

## Turn on observability

**`config.observability-off`, a warning.** `observability.enabled` isn't `true` in your wrangler
config, so cairn's structured logs never reach anywhere you can read them. Nothing is broken
today, but a future failure leaves nothing to look at.

**Ask a developer:** set `observability.enabled` to `true` in `wrangler.jsonc`, then redeploy.

## Wire cairn's CSRF guard

**`config.csrf-disable-missing`, a warning.** This check reads `svelte.config.js`, looking for
`csrf: { checkOrigin: false }` and for cairn's own guard wired into `src/hooks.server.ts`, since
both together are what hands the CSRF check from the framework's default to cairn's own.

**One case where a skip is not a pass.** If your site was built by hand rather than by
`create-cairn-site`, it may carry no `svelte.config.js` at all, and this check reports a skip
because there was no file to read. A site `create-cairn-site` made always has that file, so on
your site this check really does run. If yours skips here anyway, that's worth asking a developer
about; send them
[Build a site by hand](../extend/build-a-site-by-hand.md#wire-the-dev-backend-and-the-csrf-handoff).

**Ask a developer:** this one needs a code change in two files your site's developer owns. Send
them
[Build a site by hand](../extend/build-a-site-by-hand.md#wire-the-dev-backend-and-the-csrf-handoff),
which names both edit points.

## Set the public origin

**`config.public-origin-invalid`, a blocker.** `PUBLIC_ORIGIN` is unset, doesn't parse as a URL,
or uses plain `http` on a non-local host. Sign-in links and feed URLs are built from it, so
sign-in can't mint a usable link without it.

**Ask a developer:** set `PUBLIC_ORIGIN` to your site's canonical `https://` address in your
wrangler config's vars, then redeploy. `.dev.vars` carries the local `http://` override for
development; `http` only passes on `localhost` or `127.0.0.1`.

## Validate the site config

**`config.site-config-invalid`, a blocker.** `site.config.yaml` fails to parse, or fails
validation, so your site's content concepts can't be resolved at all.

**Ask a developer:** the parse or validation error names the exact field or rule that failed;
correct `site.config.yaml` accordingly.

## Meet the dependency floors

**`config.dependency-floors-unmet`, a blocker.** Your lockfile resolves `svelte` or
`@sveltejs/kit` below the range cairn declares as its floor. Sites compile the shipped `.svelte`
sources directly, so an older compiler can miscompile silently at build time rather than failing
loudly.

**Ask a developer:** raise the affected package in your site's `package.json` to the floor cairn
declares, then reinstall so your lockfile re-resolves; for example,
`npm install --save-dev svelte@^5.56.3`.

## Turn on HSTS

**`edge.hsts-off`, a warning.** Your zone isn't sending a meaningful `Strict-Transport-Security`
header, so nothing pins HTTPS for your site once someone has visited it over plain HTTP once. Your
admin is covered either way, since cairn's own admin responses carry their own HSTS header; this
is about every other page on your site.

**Act:** turn on HSTS for your zone, with a max-age of six months or more.

## Make the stated AI posture effective

**`ai.posture-not-effective`, a warning.** Your site declares a stance on AI crawlers, but the
`robots.txt` it's actually serving doesn't carry anything consistent with that stance, so
crawlers read a different posture than the one your site states.

**Act, or ask a developer:** if the served file doesn't match what your site declares, something
ahead of your origin is most likely rewriting it, usually a Cloudflare zone-level managed
`robots.txt`; check your zone's `robots.txt` and AI Crawl Control settings on Cloudflare's own
[managed `robots.txt`](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
page. If the served file already matches what's declared and the posture is still wrong, that's a
developer's fix; see [Choose an AI posture](../extend/choose-an-ai-posture.md) for how your site
declares it.

## Provision the auth store

Four related conditions, all about the database that tracks who can sign in.

**`auth.store-unreachable`, a blocker.** Your `AUTH_DB` database is missing, doesn't carry the
sign-in tables, or holds no owner row at all, so no sign-in link can be minted for anyone. A site
`create-cairn-site` built for you usually doesn't reach this at all: it skips instead, since
wrangler resolves that database by binding name rather than by an id this check can read. Seeing
an actual fail here almost always means a hand-wired site.

**Ask a developer:** apply the auth schema with
`wrangler d1 execute <db> --remote --file ./migrations/0000_auth.sql`, seed the owner row, and
confirm the `AUTH_DB` binding in `wrangler.jsonc` points at the right database. See
[Add cairn to a SvelteKit app](../extend/add-cairn-to-a-sveltekit-app.md).

**`auth.unknown-role`, a warning.** An editor's row carries a role name your site doesn't
declare, usually from a pruned configuration or a hand-edited database row. That person can still
sign in, but the guard refuses everything else, since an undeclared role resolves to no access at
all.

**Act:** either restore the role name to your site's declared vocabulary, or set that person to
a role your site actually declares, through [Invite your editors](./invite-editors.md).

**`auth.role-wiring-missing`, a warning.** Your site declares custom roles, but its guard was
never told about them, so it falls back to the built-in owner and editor pair. Anyone whose role
sits outside that pair can sign in but is refused everywhere.

**Ask a developer:** see [Restrict admin access](../extend/restrict-admin-access.md).

**`auth.email-not-normalized`, a warning.** An editor's email is stored with capital letters or
stray spaces, breaking the assumption every other part of the auth store makes about that address
being trimmed and lowercase. This usually comes from a manual database edit.

**Act:** correct the stored row so the address is trimmed and lowercase; adding or editing
editors through [Invite your editors](./invite-editors.md) always writes it that way already.

## Install the GitHub App

**`github.app-unreachable`, a blocker.** The GitHub App's key fails to parse, the App fails to
authenticate, its installation token fails to mint, or your repository refuses a read. Saves and
publishes can't commit while this is failing.

**Act, or ask a developer:** confirm the App is actually installed on your repository at
[github.com/settings/installations](https://github.com/settings/installations); if that looks
right, the problem is more likely the App's id, installation id, or private key, which live in
your Worker's secret store; a developer with a terminal and `wrangler` can regenerate them
(Cloudflare secrets are write-only, so nobody, not even the tool that set them, can read them
back out). See
[Rotate the GitHub App key](../extend/rotate-the-github-app-key.md).

## Wire the admin mount

**`admin.mount-incomplete`, a warning.** This is a best-effort text check for whether your site's
`/admin` route is fully wired: the shared layout that renders cairn's admin shell, and the
catch-all route that renders the admin itself. An unconventionally wired site can trip this
without actually being broken, so treat it as a prompt to check, not a certainty.

**Ask a developer:** confirm your `/admin` mount matches what cairn expects; see
[The canonical admin mount](../reference/admin-routes.md).

## Probe the deployed admin

**`admin.login-probe-failed`, a blocker.** This check makes a real request to your deployed
admin and confirms it answers with a working sign-in page: the login form itself, its CSRF
cookie, and the hidden field the form needs to submit. A failure here means a real editor hits the
same failure trying to sign in.

**Act:** read the detail line this check prints; it names exactly which part of the sign-in
envelope was missing or wrong. Run the full `cairn-doctor` check against the same site and work
through whichever of the checks above it also flags, since this probe usually fails alongside a
more specific one.

This check only runs when you pass `--probe`; a bare `npx cairn-doctor` never makes this request
on its own.

## Refresh the admin-screens skill

**`skill.admin-screens-stale`, a warning.** A helper file cairn installs for coding assistants
working on your site is missing or out of date. Nothing about your site itself is broken.

**Act:** run `npx cairn-doctor --fix`.
