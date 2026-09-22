# Is it working?

A check failed; here is exactly what it means and what fixes it.

- A `cairn doctor` check named a problem by name: this page covers it, below.
- A setup step failed, parked, or got interrupted before your site went live:
  [Setup recovery](./setup-recovery.md).
- The site is live and doing something wrong, with no doctor check naming it:
  [Troubleshooting](./troubleshooting.md).

## Running the check

From your site's directory, run:

```
cairn doctor
```

Install it first with `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest`, or download
it from the [release page](https://github.com/glw907/cairn-cms/releases), if you haven't already.

It reads your local config and prints one line per check. The full command reference is
[`cairn doctor`](../reference/cli-cairn-doctor.md).

This report is a real run of `cairn doctor`, against this repo's own worked example site, taken
right after building it. `cairn doctor` reads no credential: it checks your local configuration
and makes at most one network request, a `GET` of your site's own `/robots.txt`. Nothing here
needed a `CLOUDFLARE_API_TOKEN` or any other secret.

<!-- transcript: packages/create-cairn-site/test/fixtures/transcripts/04-doctor-report.txt -->
```
+ cairn doctor .
PASS  Wrangler bindings are missing: EMAIL and AUTH_DB are declared
PASS  Media bucket binding is missing: media bucket MEDIA_BUCKET is declared
PASS  Workers Logs has no sink: observability.enabled is true
PASS  Framework CSRF check is not handed off: checkOrigin: false found (svelte.config.js or vite.config.ts) and the hooks file wires the cairn guard (heuristic text read)
PASS  Site config does not validate: parsed (per-concept URL policy lives on the adapter concepts, not checkable from the CLI)
PASS  PUBLIC_ORIGIN is missing or invalid: PUBLIC_ORIGIN is http://localhost:4173 (wrangler vars)
PASS  Site-wide Referrer-Policy: no-referrer: no site-wide Referrer-Policy: no-referrer found (read src/hooks.server.ts; static/_headers not found, heuristic text read)
PASS  Custom /admin mount looks incomplete: the /admin mount wires shellLoad and renders CairnAdminShell (heuristic text read)
UNCHECKED  A framework dependency sits below the engine floor: doctor: refusing to read outside the directory: node_modules/@glw907/cairn-cms/package.json
SKIP  Guard is missing the declared role vocabulary: no custom roles declared; the guard fallback owner/editor already matches the vocabulary
UNCHECKED  The stated AI posture is not the served one: could not reach the resolved origin's /robots.txt

8 passed, 0 failed, 1 skipped, 0 info, 2 unchecked
```

`INFO` marks a heuristic that couldn't see enough to answer, or an advisory finding. It's never a
deploy blocker. `UNCHECKED` marks a check that genuinely needed an input and found none of the
candidates it looks for, or, as with the preceding dependency-floor line, refused to read one it
found for a reason worth knowing about. A `SKIP` differs from both: the check doesn't apply at all.

The preceding `UNCHECKED` dependency-floor line comes from how this repo's own example site
installs the engine, through a symlink that leads outside the site directory. `cairn doctor`
refuses to follow a symlink that leaves the directory it started from, by design. A site
installed the ordinary way, with a real copy of `@glw907/cairn-cms` under its own `node_modules`,
reads `PASS` or `FAIL` there instead, never this line.

`cairn doctor` reads only your working directory, so it never runs the sending-domain, HTTPS,
GitHub App, or auth-store checks at all: each needs a deployed, adopted site or a credential a
directory-only preflight can't see. [Force HTTPS at the edge](#force-https-at-the-edge) and
[Onboard the sending domain](#onboard-the-sending-domain) below name `cairn health` as the command
that reaches each, once you've adopted your site with the `cairn` CLI. [Install the GitHub
App](#install-the-github-app) and [Provision the auth store](#provision-the-auth-store) name the
manual proof to use instead, since no command checks either yet.

Each check in the report above carries a **title**, like `Wrangler bindings`. The report itself
never prints a condition id. This page files the same checks by **condition id** instead,
something like `config.bindings-missing`, the name cairn's own diagnostics and the reference
page use for the same problem. The jump list below maps each report title to the section and
condition id that cover it. A **blocker** stops someone from signing in or your site from working
correctly; a **warning** is real but doesn't block anyone today.

A **skip** is neither. The report above carries exactly one, `Guard role wiring`: it means the
check didn't run because there was nothing local to read, here because this site declares no
custom roles, so the guard's built-in owner/editor fallback already matches its vocabulary. A skip
isn't a pass either way; it's the check telling you it had nothing to check.

**Confirming the GitHub App yourself isn't possible.** `create-cairn-site` deliberately moves the
App's private key off your machine and into your Worker's secret store during setup, and keeps no
copy anywhere you can get back to; not even the tool that put it there can read it back out, since
Cloudflare secrets are write-only. If a publish keeps failing, that's a developer's job: send them
[Rotate the GitHub App key](../extend/rotate-the-github-app-key.md), which mints a fresh key and
proves it with a real publish.

A site `create-cairn-site` built for you ships already wired for the binding, observability,
origin, and admin-mount conditions below, so those only show up if your site's code has changed
since. Two are worth knowing about before you read a skip or a fail as something you broke: the
dependency-floor check can still fail later as packages drift, with nothing you customized, and
the site-config check looks for `site.config.yaml` in a couple of conventional spots that don't
include where the scaffold actually put it, so it reports a skip on an unmodified site rather than
a clean pass.

Match what your doctor printed to the section that explains it:

- `Always Use HTTPS`—[Force HTTPS at the edge](#force-https-at-the-edge),
  `edge.https-not-forced` (checked by `cairn health`, not `cairn doctor`, once your site is adopted)
- `Email sending domain`—[Onboard the sending domain](#onboard-the-sending-domain),
  `email.sender-not-onboarded` (checked by `cairn health`, not `cairn doctor`, once your site is
  adopted), `email.send-failed` (no doctor or health check; diagnosed from the
  `auth.link.send_failed` log record)
- `Wrangler bindings`—[Deploy the Worker with its bindings](#deploy-the-worker-with-its-bindings),
  `config.bindings-missing`
- `Media bucket binding`—[Declare the media bucket binding](#declare-the-media-bucket-binding),
  `config.media-bucket-missing`
- `Tidy API key`—[Configure the Tidy API key](#configure-the-tidy-api-key),
  `config.tidy-key-missing` (no command checks this until a later 1.x release of the `cairn` CLI; run one tidy instead)
- `Workers Logs sink`—[Turn on observability](#turn-on-observability),
  `config.observability-off`
- `Framework CSRF handoff`—[Wire cairn's CSRF guard](#wire-cairns-csrf-guard),
  `config.csrf-disable-missing`
- `Blanket no-referrer`—[Scope a site-wide no-referrer policy](#scope-a-site-wide-no-referrer-policy),
  `config.no-referrer-blanket`
- `Public origin`—[Set the public origin](#set-the-public-origin),
  `config.public-origin-invalid`
- `Site config`—[Validate the site config](#validate-the-site-config),
  `config.site-config-invalid`
- `Dependency floors`—[Meet the dependency floors](#meet-the-dependency-floors),
  `config.dependency-floors-unmet`
- `AI posture, effective`—[Make the stated AI posture effective](#make-the-stated-ai-posture-effective),
  `ai.posture-not-effective`
- `Auth store (D1)`, `Editor role vocabulary`,
  `Editor email normalization`—[Provision the auth store](#provision-the-auth-store),
  `auth.store-unreachable`, `auth.unknown-role`,
  `auth.email-not-normalized` (no command checks these until a later 1.x release of the `cairn` CLI)
- `Guard role wiring`—[Provision the auth store](#provision-the-auth-store),
  `auth.role-wiring-missing`
- `GitHub App`—[Install the GitHub App](#install-the-github-app), `github.app-unreachable`
  (no command checks this; publish an edit and confirm a `cairn-cms[bot]` commit lands on `main`)
- `Custom /admin mount`—[Wire the admin mount](#wire-the-admin-mount),
  `admin.mount-incomplete`
- `Live admin login probe`—[Probe the deployed admin](#probe-the-deployed-admin),
  `admin.login-probe-failed` (no command checks this; the manual workers.dev check below is the
  substitute)

Two more sections below cover a real blocker, but `cairn doctor` never reports either one; your
site answers with the refusal itself, the moment it happens:

- [Admin CSRF token rejected](#admin-csrf-token-rejected)—`auth.csrf-token-invalid`
- [Non-admin origin rejected](#non-admin-origin-rejected)—`auth.csrf-origin-mismatch`

## Force HTTPS at the edge

**`edge.https-not-forced`, a blocker.** `cairn doctor` never runs this check; `cairn health`
confirms your Cloudflare zone forces every visit onto HTTPS, once you've adopted your site with
the `cairn` CLI. The admin's sign-in page posts a plain form with no JavaScript, and cairn's CSRF
guard rejects a form submitted over plain HTTP, so an admin reached over `http://` hits an opaque
403 with no way to sign in.

**Act:** turn on Always Use HTTPS for your zone, and keep HSTS on alongside it. Cloudflare's own
[Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
page names where the setting lives.

## Admin CSRF token rejected

**`auth.csrf-token-invalid`, a blocker.** `cairn doctor` never reports this one: it's your site's
own guard refusing a request outright, on the spot, logged as `guard.refused` with
`reason: csrf`. An admin form submission carried no valid CSRF token, or one that didn't match.
This is almost always a stale browser tab or a browser blocking cookies for the site, not a
configuration problem.

**Act:** open the sign-in page fresh, allow cookies for your site, and request a new sign-in
link.

## Non-admin origin rejected

**`auth.csrf-origin-mismatch`, a blocker.** `cairn doctor` never reports this one either: it's
your site's own guard refusing the request, logged as `guard.refused` with `reason: origin`. A
form submission outside the admin carried an `Origin` header that didn't match your site, so
cairn's own origin check refused it.

**Act:** confirm the form is being posted from your site itself, not embedded or proxied from
somewhere else; if you run a reverse proxy in front of your site, check whether it strips or
rewrites the `Origin` header.

## Sign-in gate refused the request

**`auth.identity-unresolved`, a blocker.** Only shown on a site whose developer configured
`identity` on the auth guard, replacing magic-link sign-in with the site's own identity gate
(Cloudflare Access, for example). The gate either refused the request outright or threw while
cairn tried to resolve who was asking, so cairn never learned an identity and could not start a
session. Logged as `guard.refused` with `reason: identity`.

**Act:** sign in through the gate again. If it keeps happening, ask whoever runs the site to
check the gate's own configuration and the `guard.refused` log record's `detail` field.

## You're not on this site's editor roster

**`auth.identity-unknown`, a warning.** Only shown on a site configured with `identity`. The
site's identity gate confirmed who you are, but that email isn't in cairn's editor roster, so you
still can't sign in to the admin. Logged as `auth.identity.unknown`.

**Act, or ask an owner:** add the confirmed email to the roster through Manage editors.

## Onboard the sending domain

**`email.sender-not-onboarded`, a blocker.** `cairn doctor` never runs this check; `cairn health`
confirms your site's from-address domain has an enabled Cloudflare sending subdomain, once you've
adopted your site with the `cairn` CLI. Without it, your site has no way to send a sign-in email
at all, and nobody besides you can sign in. If you set this domain up through
[Own your domain](./own-your-domain.md#turn-on-sign-in-email), that page already carries this;
`cairn health` is what confirms it stuck.

**Act:** onboard the sending domain with `npx wrangler email sending enable <domain>`, then
redeploy with `npx wrangler deploy`. The domain has to match your site's configured sign-in
sender. Both commands use the same Cloudflare sign-in `create-cairn-site` set up on this machine
when it first deployed your site, so there's no separate `wrangler login` to do first.

**`email.send-failed`, also a blocker.** The sending domain is onboarded, but a real send still
failed, for a reason other than the missing onboarding above: a delivery error, a binding
misconfiguration, or a custom sender failure. Logged as `auth.link.send_failed`.

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

## Declare the media bucket binding

**`config.media-bucket-missing`, a warning.** Your site's adapter declares a media bucket for
uploaded images, but `wrangler.jsonc` (or `wrangler.toml`) declares no matching `r2_buckets`
binding, so uploaded media has nowhere to write to. This check only runs on a site that configures
a media bucket at all; a site with no image library never sees it.

**Ask a developer:** declare an `r2_buckets` binding in `wrangler.jsonc` (or `wrangler.toml`)
whose name matches the adapter's `bucketBinding`, then redeploy; see
[Cloudflare](../reference/cloudflare.md) for the shape.

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

## Scope a site-wide no-referrer policy

**`config.no-referrer-blanket`, a warning.** This check reads `src/hooks.server.ts` (or `.js`)
and `static/_headers`, looking for a `Referrer-Policy: no-referrer` header your site serves for
every route. A browser sending that policy strips the `Origin` header from a plain, same-origin
form submission, so it arrives at your site as `Origin: null`. cairn's own guard restores the
framework's strict origin check outside `/admin`, and that check rejects a request carrying no
`Origin` at all. A site-wide `no-referrer` policy triggers that rejection on a non-admin form
that never left your site. cairn's own `/admin` responses already send `no-referrer`, but only
on the admin routes that need it; the trap is shipping the same policy as the whole site's
default.

**A PASS here checks only the two files this check can read.** Its detail line names which of
`src/hooks.server.ts` (or `.js`) and `static/_headers` it actually read, and which it could not
find; it says nothing about a policy set in a module those files only import, in a
`+layout.server.ts`'s own `setHeaders`, or in a Cloudflare response-header rule configured outside
your repository.

**A skip here means the check found neither file to read**, not that your site is safe; it names
both `src/hooks.server.ts` and `static/_headers` in its detail line, along with the same remedy
below.

**Ask a developer:** serve `strict-origin-when-cross-origin` (or `same-origin`) as the site's
default `Referrer-Policy`. `no-referrer` is safe only on a route whose CSRF protection is a
double-submit token, the way cairn's own `/admin` responses are; scope it to those routes only,
either a per-path block in `static/_headers` or a route-guarded header write in
`src/hooks.server.ts`. Any route guarded instead by the origin compare, every `createAuthChannel`
action and any other non-admin form, needs `same-origin` in its place: `same-origin` still strips
`Referer` on a cross-origin request while keeping the real `Origin` on a same-origin one. See
[Security model](../extend/security-model.md#response-hardening) for why cairn's own admin
responses scope it that way.

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
`npm install --save-dev svelte@^5.56.10`.

## Configure the Tidy API key

**`config.tidy-key-missing`, a warning.** No command checks this until a later 1.x release of the `cairn` CLI;
run one tidy suggestion in the admin instead and see whether it works. Your site config has
`tidy.enabled: true`, but no `ANTHROPIC_API_KEY` is set anywhere reachable, or the key set is no
longer valid. Tidy's suggestions are unavailable until this is fixed; nothing else on your site is
affected, since Tidy is opt-in.

**Ask a developer:** set `ANTHROPIC_API_KEY` with `wrangler secret put ANTHROPIC_API_KEY` for a
deployed site, or in `.dev.vars` for local development, and confirm the key is current.

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

Five related conditions, all about the database that tracks who can sign in. No command checks
`auth.store-unreachable`, `auth.store-unmigrated`, `auth.unknown-role`, or
`auth.email-not-normalized` until a later 1.x release of the `cairn` CLI; `auth.role-wiring-missing` is the
exception, still covered by `cairn doctor` today.

**`auth.store-unreachable`, a blocker.** Your `AUTH_DB` database is missing, doesn't carry the
sign-in tables, or holds no owner row at all, so no sign-in link can be minted for anyone. A site
`create-cairn-site` built for you usually doesn't reach this at all: it skips instead, since
wrangler resolves that database by binding name rather than by an id this check can read. Seeing
an actual fail here almost always means a hand-wired site.

**Ask a developer:** apply the auth schema with
`wrangler d1 migrations apply <db> --remote` (`0000_auth.sql` creates the tables and
`0004_login_nonce.sql` adds the column sign-in links bind to), seed the owner row, and
confirm the `AUTH_DB` binding in `wrangler.jsonc` points at the right database. See
[Add cairn to a SvelteKit app](../extend/add-cairn-to-a-sveltekit-app.md).

**`auth.store-unmigrated`, a blocker.** Your `AUTH_DB` is missing
`migrations/0004_login_nonce.sql`, which adds the column every sign-in link binds itself to, so
each attempt to sign in fails outright. No command catches this before you deploy; after a deploy
the site answers with the condition itself the first time somebody tries to sign in.

**Ask a developer:** copy `migrations/0004_login_nonce.sql` out of the package into the site's own
`migrations` directory and run `wrangler d1 migrations apply <db> --remote`.

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

**`github.app-unreachable`, a blocker.** No command checks this: publish an edit and confirm a
commit authored by `cairn-cms[bot]` lands on `main`, since an empty error log proves nothing
unless `observability.enabled` is on in your `wrangler.jsonc`. The GitHub App's key fails to
parse, the App fails to authenticate, its installation token fails to mint, or your repository
refuses a read. Saves and publishes can't commit while this is failing.

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

**`admin.login-probe-failed`, a blocker.** No command checks this: the live login probe was
retired along with the rest of the npm-era doctor's `--probe` flag, and no tool checks the
workers.dev exposure gap it used to cover until a later 1.x release of the `cairn` CLI. Do the manual check
instead: an unauthenticated `GET` of `<worker-name>.<subdomain>.workers.dev/admin`, and the same
against your preview alias. A 200 there means your deployed admin is reachable with no gate in
front of it, whatever your primary hostname's own access setup looks like.

**Act:** if the workers.dev address answers 200, put it behind the same access gate as your
primary hostname, or set `workers_dev: false` (and `preview_urls: false`, since the two settings
are independent) in `wrangler.jsonc`.
