# Check that your site works

The `cairn doctor` command checks a cairn site's configuration and prints one line for each check. When a line says FAIL, it also prints a link to the section of this page that explains the check. Each section covers one check, so a reader arrives from one result and needs only that section. `cairn doctor` reads the files in the site's folder, makes one request for the site's `robots.txt`, needs no credential, and changes nothing.

The following list routes you to the right page for each situation.

- If a `cairn doctor` check named a problem, the sections below cover it.
- If a setup step failed, stopped, or was interrupted before the site went live, read [Recover a setup that stopped](./setup-recovery.md).
- If the site is live and doing something wrong, and no check names it, read [Troubleshoot a live site](./troubleshooting.md).

## Run the check

1. Install the `cairn` CLI from the [release page](https://github.com/glw907/cairn-cms/releases). If you already have Go installed, `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` also works.
2. Open a terminal in the site's folder.
3. Run the check:

   ```
   cairn doctor
   ```

The following report comes from a run against a site that the setup command, `create-cairn-site`, had just deployed. Every line passed except one skip, which the sections after the report explain.

<!-- transcript: packages/create-cairn-site/test/fixtures/transcripts/04-doctor-report.txt -->
```
+ cairn doctor .
PASS  Wrangler bindings are declared: EMAIL and AUTH_DB are declared
PASS  Media bucket binding is declared: media bucket MEDIA_BUCKET is declared
PASS  Workers Logs has a sink: observability.enabled is true
[...]
SKIP  Guard is missing the declared role vocabulary: no custom roles declared; the guard fallback owner/editor already matches the vocabulary
PASS  The stated AI posture is the served one: no AI posture is stated (aiPosture is unset). https://cairn-docs-capture-2.glw907.workers.dev/robots.txt carries no AI-crawler directives, consistent with stating nothing.

10 passed, 0 failed, 1 skipped, 0 info, 0 unchecked
```

Each line starts with one of five words:

- `PASS`: the check ran and the site is fine.
- `FAIL`: the check ran and found a problem. A blocker stops someone from signing in or the site from working. A warning is a real problem that blocks nobody today.
- `SKIP`: the check doesn't apply, usually because there was nothing local to read.
- `UNCHECKED`: the check applied but couldn't read the input it needed.
- `INFO`: the check couldn't see enough to answer, or it carries an advisory.

A skip is neither a pass nor a failure. The one in the preceding report belongs to a check that applies only to a site that declares custom roles. This site declares none, so the check had nothing to examine. The title reads like a problem even though the line reports that the check wasn't needed.

When a check fails, the report adds a block that names the problem and gives the link:

<!-- transcript: packages/create-cairn-site/test/fixtures/transcripts/04b-doctor-report-failing.txt -->
```
FAIL  Workers Logs has no sink: observability.enabled is not true
[...]
Workers Logs has no sink failed.
  Why: observability.enabled is not true in the wrangler config, so the structured log records go nowhere and a runtime failure leaves nothing to read.
  Fix: Set observability.enabled to true in wrangler.jsonc, then re-deploy.
  Docs: https://cairn.pub/docs/admin/is-it-working#turn-on-observability

9 passed, 1 failed, 1 skipped, 0 info, 0 unchecked
```

The report prints a title for each check and never a condition id. This page files each check under its condition id, a name such as `config.bindings-missing`, because the id is how the rest of cairn's diagnostics refer to the same problem. A check's title changes with its result, so a passing line and a failing line word the same check differently. Each section heading names the remedy. The following table maps each title to its section.

A site that the setup command built is already wired for the bindings, logging, origin, and admin-mount checks, so those fail only after someone changes the site's code. The dependency check can still fail later as packages drift, with nothing customized.

`cairn doctor` never runs the checks that need a deployed site or a credential. `cairn health` runs two of them, after you register the site with `cairn adopt`. No command runs the others yet. Each section says which case it is.

## Find a check by its title

The following table maps each report title to its section and to the command that runs the check.

| Report title | Section | Checked by |
| --- | --- | --- |
| Always Use HTTPS | [Force HTTPS at the edge](#force-https-at-the-edge) | `cairn health` |
| Email sending domain | [Onboard the sending domain](#onboard-the-sending-domain) | `cairn health` |
| Wrangler bindings | [Deploy the Worker with its bindings](#deploy-the-worker-with-its-bindings) | `cairn doctor` |
| Media bucket binding | [Declare the media bucket binding](#declare-the-media-bucket-binding) | `cairn doctor` |
| Workers Logs | [Turn on observability](#turn-on-observability) | `cairn doctor` |
| Trusted origins | [Keep SvelteKit's origin check on](#keep-sveltekits-origin-check-on) | `cairn doctor` |
| Site-wide Referrer-Policy | [Scope a site-wide no-referrer policy](#scope-a-site-wide-no-referrer-policy) | `cairn doctor` |
| PUBLIC_ORIGIN | [Set the public origin](#set-the-public-origin) | `cairn doctor` |
| Site config | [Validate the site config](#validate-the-site-config) | `cairn doctor` |
| Framework dependencies | [Meet the dependency floors](#meet-the-dependency-floors) | `cairn doctor` |
| AI posture | [Make the stated AI posture effective](#make-the-stated-ai-posture-effective) | `cairn doctor` |
| Guard role vocabulary | [Provision the auth store](#provision-the-auth-store) | `cairn doctor` |
| Sign-in database | [Provision the auth store](#provision-the-auth-store) | No command |
| Custom /admin mount | [Wire the admin mount](#wire-the-admin-mount) | `cairn doctor` |
| GitHub App | [Install the GitHub App](#install-the-github-app) | No command |

Three conditions never appear in a report, because your site answers with the refusal itself, at the moment it happens: [Admin CSRF token rejected](#admin-csrf-token-rejected), [Sign-in gate refused the request](#sign-in-gate-refused-the-request), and [You're not on this site's editor roster](#youre-not-on-this-sites-editor-roster). Four older checks no longer exist, and a short note for each keeps its link working: [Non-admin origin rejected](#non-admin-origin-rejected), [Wire cairn's CSRF guard](#wire-cairns-csrf-guard), [Configure the Tidy API key](#configure-the-tidy-api-key), and [Probe the deployed admin](#probe-the-deployed-admin).

## Force HTTPS at the edge

**`edge.https-not-forced`, a blocker.** `cairn health` confirms that your Cloudflare zone sends every visit to HTTPS. The admin's sign-in page posts a plain form, and cairn refuses to serve the admin over plain HTTP, so an admin reached over `http://` fails with a 403 and nobody can sign in.

**Act:** turn on Always Use HTTPS for the zone and keep HSTS on. Cloudflare's [Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/) page shows where the setting lives.

## Admin CSRF token rejected

**`auth.csrf-token-invalid`, a blocker.** `cairn doctor` never reports this one. Your site's guard refuses a request on the spot and logs it as `guard.refused` with the reason `csrf`. An admin form arrived without a valid CSRF token, which is a one-time value the browser must send back with each form. A stale browser tab or a browser that blocks cookies for the site is almost always the cause.

**Act:** open the sign-in page fresh, allow cookies for the site, and request a new sign-in link.

## Non-admin origin rejected

An earlier version of cairn refused a form outside the admin when its `Origin` header didn't match the site. That condition is retired. SvelteKit's own origin check now refuses such a form before cairn sees it, so cairn logs no event for it and no condition names it. If a form on your site is refused with a 403 and the cause isn't a stale tab, see [Scope a site-wide no-referrer policy](#scope-a-site-wide-no-referrer-policy), which covers the usual cause, and [Troubleshooting](./troubleshooting.md).

## Sign-in gate refused the request

**`auth.identity-unresolved`, a blocker.** This appears only on a site whose developer replaced magic-link sign-in with the site's own identity gate, such as Cloudflare Access. The gate refused the request or failed while cairn tried to learn who was asking, so cairn couldn't start a session. The guard logs `guard.refused` with the reason `identity`.

**Act:** sign in through the gate again. If it keeps happening, ask whoever runs the site to check the gate's configuration and the log record's `detail` field.

## You're not on this site's editor roster

**`auth.identity-unknown`, a warning.** This appears only on a site with an identity gate. The gate confirmed who you are, but your email address isn't on cairn's roster of people who may sign in. The site logs `auth.identity.unknown`.

**Ask an owner:** have an owner add your confirmed address on the **Editors** screen. [Invite editors](./invite-editors.md) shows how.

## Onboard the sending domain

**`email.sender-not-onboarded`, a blocker.** `cairn health` confirms that the domain in your site's sign-in address has an enabled Cloudflare sending subdomain. Without one, the site can't send a sign-in email, and nobody besides the owner can sign in. [Own your domain](./own-your-domain.md#turn-on-sign-in-email) normally handles this step, and `cairn health` confirms that it held.

**Act:** run `npx wrangler email sending enable <domain>`, then `npx wrangler deploy`. The domain must match the site's configured sign-in sender. Both commands reuse the Cloudflare sign-in that `create-cairn-site` set up on this computer.

**`email.send-failed`, a blocker.** The sending domain is onboarded, but a real send still failed. The cause is a delivery error, a misconfigured `EMAIL` binding, or a failure in a custom sender. No command checks this one. The site logs `auth.link.send_failed`.

**Act, or ask a developer:** find the matching `auth.link.send_failed` record in your logs and read its `code` and `error` fields. [Troubleshooting](./troubleshooting.md#read-your-sites-logs) explains how to read the logs. A problem with your sender address is yours to fix. A problem with the `EMAIL` binding needs a developer.

## Deploy the Worker with its bindings

**`config.bindings-missing`, a blocker.** The wrangler config, which is Cloudflare's configuration file for the site, declares no `send_email` binding named `EMAIL`, no `d1_databases` binding named `AUTH_DB`, or neither. Sign-in mail then has nothing to send through and sessions have nowhere to live.

**Ask a developer:** declare both bindings in `wrangler.jsonc`, then redeploy. [Wire the delivery surface](../extend/build-the-public-routes.md) and the [Cloudflare reference](../reference/cloudflare.md) show the shape.

## Declare the media bucket binding

**`config.media-bucket-missing`, a warning.** The site is set up to store uploaded images, but `wrangler.jsonc` declares no matching `r2_buckets` binding, so uploads have nowhere to go. A site without an image library never sees this check.

**Ask a developer:** declare an `r2_buckets` binding whose name matches the site's media bucket setting, then redeploy. The [Cloudflare reference](../reference/cloudflare.md) shows the shape.

## Turn on observability

**`config.observability-off`, a warning.** `observability.enabled` isn't `true` in the wrangler config, so the site's structured logs go nowhere you can read. Nothing is broken today. A future failure would leave nothing to look at.

**Ask a developer:** set `observability.enabled` to `true` in `wrangler.jsonc`, then redeploy.

## Keep SvelteKit's origin check on

**`config.csrf-trusted-origins-wildcard`, a warning.** SvelteKit, the framework the site is built on, checks that each form post comes from the site's own address. A `"*"` entry in the Vite config's `csrf.trustedOrigins` turns that check off on every route, and a `"null"` entry admits posts from sandboxed pages that any attacker can produce.

**Ask a developer:** remove the `"*"` and `"null"` entries from `csrf.trustedOrigins`, and list only the exact origins that must post to the site. Each listed origin also widens the check on `/admin`.

## Scope a site-wide no-referrer policy

**`config.no-referrer-blanket`, a warning.** This check reads `src/hooks.server.ts` and `static/_headers` for a `Referrer-Policy: no-referrer` header that the site serves on every route. A browser that sends that policy strips the `Origin` header from a same-origin form post, so the post arrives as `Origin: null`. SvelteKit's origin check refuses it, and the site's own forms fail with a 403.

A PASS covers only those two files. It says nothing about a policy set in a module the files import, in a layout, or in a Cloudflare response-header rule outside the repository. A SKIP means the check found neither file, and it doesn't mean the site is safe.

**Ask a developer:** serve `strict-origin-when-cross-origin` or `same-origin` as the site's default `Referrer-Policy`. Restrict `no-referrer` to routes protected by a double-submit token, as cairn's own `/admin` responses are. [Security model](../extend/security-model.md#the-auth-guard) explains why.

## Set the public origin

**`config.public-origin-invalid`, a blocker.** `PUBLIC_ORIGIN` is unset, doesn't parse as a URL, or uses plain `http` on a host that isn't local. Sign-in links and feed URLs build from it, so the site can't mint a usable sign-in link without it.

**Ask a developer:** set `PUBLIC_ORIGIN` to the site's `https://` address in the wrangler config's `vars`, then redeploy. A `.dev.vars` file carries the local `http://` value for development.

## Validate the site config

**`config.site-config-invalid`, a blocker.** `site.config.yaml` doesn't parse, or it lacks a `siteName`, so the site can't resolve its content at all. The check looks for the file at four conventional paths and reports UNCHECKED when it finds none.

**Ask a developer:** the error names the failing field. Correct `site.config.yaml` to match.

## Meet the dependency floors

**`config.dependency-floors-unmet`, a blocker.** The lockfile resolves `svelte` or `@sveltejs/kit` below the range that cairn requires. Sites compile cairn's shipped `.svelte` sources directly, so an older compiler can miscompile them without any error at build time.

**Ask a developer:** raise the affected package in `package.json` to the required range and reinstall, for example with `npm install --save-dev svelte@^5.56.10`.

## Make the stated AI posture effective

**`ai.posture-not-effective`, a warning.** The site states a position on AI crawlers, but the `robots.txt` it serves carries nothing consistent with that position, so crawlers read a different position than the one the site states.

**Act, or ask a developer:** if the served file doesn't match, something ahead of the site is probably rewriting it, usually a managed `robots.txt` on your Cloudflare zone. Check the zone's settings on Cloudflare's [managed `robots.txt`](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) page. If the served file matches what the site declares and the position is still wrong, a developer has to fix it. [Choose an AI posture](../extend/choose-an-ai-posture.md) describes how a site declares one.

## Provision the auth store

Six conditions concern the database that records who may sign in. No command checks the first five. The sixth, `auth.role-wiring-missing`, is the one `cairn doctor` reports.

**`auth.store-unreachable`, a blocker.** The `AUTH_DB` database is missing, lacks the sign-in tables, or holds no owner row, so nobody can sign in. A site that the setup command built does not hit this condition, and a real failure almost always means a site wired by hand.

**Ask a developer:** create the sign-in tables, seed the owner row, and confirm that the `AUTH_DB` binding names the right database. [Add cairn to a SvelteKit app](../extend/add-cairn-to-a-sveltekit-app.md) shows the steps.

**`auth.store-unmigrated`, a blocker.** The database lacks the `0004_login_nonce.sql` migration, which adds the column that binds each sign-in link to the browser that asked for it. Every sign-in attempt fails until the migration runs.

**Ask a developer:** copy `migrations/0004_login_nonce.sql` from the package into the site's migrations folder and run `npx wrangler d1 migrations apply <db> --remote`.

**`auth.store-roles-unmigrated`, a warning.** The database lacks the `0001_roles.sql` migration, so adding an editor with a role beyond `owner` and `editor` fails. Sign-in and publishing still work.

**Ask a developer:** copy `migrations/0001_roles.sql` into the site's migrations folder and apply it the same way.

**`auth.unknown-role`, a warning.** An editor's row carries a role the site doesn't declare, usually after a pruned configuration or a hand-edited row. That person can sign in, but the guard refuses everything else.

**Act:** set the person to a role your site declares, on the **Editors** screen. [Invite editors](./invite-editors.md) shows how.

**`auth.role-wiring-missing`, a warning.** The site declares custom roles, but its guard was never given them and falls back to `owner` and `editor`. Anyone with another role signs in and is refused everywhere. A SKIP on this check, as in the report above, means the site declares no custom roles.

**Ask a developer:** [Restrict admin access](../extend/restrict-admin-access.md) describes the wiring.

**`auth.email-not-normalized`, a warning.** An editor's address is stored with capital letters or stray spaces, usually after a manual database edit, and the rest of the sign-in system assumes trimmed lowercase.

**Act:** correct the stored row. Adding or editing editors through [Invite editors](./invite-editors.md) always writes the address correctly.

## Install the GitHub App

**`github.app-unreachable`, a blocker.** No command checks this one. The App's key fails to parse, the App fails to authenticate, its short-lived token fails to mint, or the repository refuses a read. Saves and publishes can't commit while this fails.

To check, publish an edit and confirm that the newest commit on `main` names your site's App, the App's name followed by `[bot]`, as its committer. An empty error log proves nothing unless `observability.enabled` is on.

**Act, or ask a developer:** confirm that the App is installed on your repository at [GitHub's installations page](https://github.com/settings/installations). If it is, the fault is in the App's id, installation id, or private key, which live in the Worker's secret store. Cloudflare secrets are write-only, so nobody can read the key back, and a developer has to replace it. [Rotate the GitHub App key](../extend/rotate-the-github-app-key.md) describes how.

## Wire the admin mount

**`admin.mount-incomplete`, a warning.** This is a best-effort text check that the site's `/admin` route renders cairn's admin shell. A site wired in an unusual way can trip it without being broken, so treat a result as a prompt to look, not a verdict. On a failure the report prints INFO and never FAIL.

**Ask a developer:** compare the site's `/admin` mount with [The canonical admin mount](../reference/admin-routes.md).

## Wire cairn's CSRF guard

An earlier doctor checked that the site had handed form protection from the framework to cairn's guard. That check is retired. SvelteKit's origin check now covers every route, so [Keep SvelteKit's origin check on](#keep-sveltekits-origin-check-on) replaces it. Old reports and the links in them still point here.

## Configure the Tidy API key

An earlier doctor checked for the API key that the optional Tidy feature needs. That check is retired, and no command checks the key now. To test it, run one Tidy suggestion in the admin and see whether it works. A developer sets the key with `wrangler secret put ANTHROPIC_API_KEY`, as [Turn on Tidy](../extend/turn-on-tidy.md) describes.

## Probe the deployed admin

An earlier version of `cairn doctor` probed the site's `workers.dev` address to see whether the admin answered without a gate. That check is retired, and it matters only to a site whose main address sits behind an access gate such as Cloudflare Access. A default site, which signs in by email link, has no such gate to bypass.

**Ask a developer:** on a gated site, open the site's `workers.dev` address and its preview address with `/admin` added, in a private browser window. If either one loads the admin without asking you to sign in, it is reachable with nothing in front of it. Put the address behind the same access gate as your main address, or set `workers_dev: false` and `preview_urls: false` in `wrangler.jsonc`.
