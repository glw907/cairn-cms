# Cloudflare readiness

`cairn-doctor` checks a site's local config, its Cloudflare account, and its GitHub App
credentials before you trust the result with a real editor. Run it from the project root, the
directory holding `wrangler.jsonc`, `svelte.config.js`, `site.config.yaml`, and
`package-lock.json`:

```bash
npx cairn-doctor --from editor@your-site.com --repo you/your-site
```

A failing check never stops the run, so one pass prints every check the environment can answer.
The sections below follow the checks in setup order: what each verifies, what a failure means,
and how to fix it. For the flags, the exit codes, and how each input resolves from a flag, an
environment variable, or the repo itself, see the
[`cairn-doctor` reference](../reference/doctor.md).

## Deploy the Worker with its bindings

The wrangler config needs a `send_email` binding named `EMAIL` and a `d1_databases` binding named
`AUTH_DB`. Without them the magic-link send and the session store have nothing to call, and no
editor can sign in:

```jsonc
{
  "send_email": [{ "name": "EMAIL" }],
  "d1_databases": [
    { "binding": "AUTH_DB", "database_name": "my-site-auth", "database_id": "<uuid>" }
  ]
}
```

If the adapter declares a media bucket, the same config needs a matching `r2_buckets` binding;
this check only runs when media is actually configured, so a site with no media assets never
fails on a bucket it doesn't need. If the site config turns on tidy (`tidy.enabled: true`),
`ANTHROPIC_API_KEY` needs to be visible in the wrangler vars or `.dev.vars`. A wrangler secret is
invisible to the command-line tool, so this last check is a presence heuristic, not a definitive read. On a
pass, confirm the visible value is the real key and not a placeholder. On a fail, set the secret
with `wrangler secret put ANTHROPIC_API_KEY`.

## Turn on observability

`observability.enabled` needs to be `true` in the wrangler config. Without it, the structured log
records the engine writes for every sign-in, save, and publish go nowhere, and a production
failure leaves nothing to read afterward. Set it, redeploy, and see
[log events](../reference/log-events.md) for what the records look like once they arrive.

## Wire cairn's CSRF guard

Two files need to agree: `svelte.config.js` sets `csrf: { checkOrigin: false }`, and
`src/hooks.server.ts` wires cairn's guard as the handle.

```js
export default {
  kit: { csrf: { checkOrigin: false } },
};
```

```ts
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
export const handle = createAuthGuard();
```

With `checkOrigin` left on, SvelteKit's own Origin check runs alongside cairn's guard on every
admin request, and the two are redundant and can conflict. Disabling that check without wiring
the guard is worse: the admin then has no CSRF protection at all. With both in place, cairn's
guard alone runs the Origin check and the double-submit token check. The
[admin mount reference](../reference/admin-routes.md) shows the route files that assume it.

## Validate the site config

`site.config.yaml` (or its `src/lib/` or `src/` counterpart) needs to parse and pass its
URL-policy validation, or the build and the admin can't resolve the content concepts at all. The
parse or validation error names the exact field or rule that failed, so fix that field and rerun
the doctor. The per-concept URL policy itself lives on the adapter's `defineConcept` calls, which
are TypeScript the doctor cannot evaluate from the command line, so this check only proves the
YAML side.

## Set the public origin

`PUBLIC_ORIGIN` needs to parse as a URL and use https, with http allowed only on `localhost` or
`127.0.0.1`. Magic-link confirmation links and absolute feed URLs derive from this value alone. It
comes from config, never from a request header, so a forged Host header can't redirect a sign-in
link. Set it in the wrangler config's `vars` for the deployed origin, and add a `.dev.vars`
override for local http.

## Wire the admin mount

This check reads the four conventional `/admin` route files, looking for a `shellLoad` call and a
`CairnAdminShell` render across them. It never fails: an unconventionally wired site skips with a
one-line fix instead of going red, since the read is a best-effort heuristic, not proof the mount
is broken. If it skips and your `/admin` route works, ignore it. When the route doesn't render the
shared chrome, the skip message names the two calls to wire. The
[admin mount reference](../reference/admin-routes.md) has the working files to copy.

## Meet the dependency floors

The engine declares peer ranges on `svelte` (`^5.56.3`) and `@sveltejs/kit` (`^2.12`), read at
doctor-run time from the installed package's own `package.json` so the floors live in one place.
This check compares those ranges against what `package-lock.json` actually resolved, which can sit
below the range in `package.json` when another dependency pins an older version transitively. A
site without `package-lock.json`, a pnpm or yarn lockfile, skips rather than failing; the check
reads npm's lockfile format only. Below the floor, raise the devDependency range and reinstall so
the lockfile re-resolves: `npm install --save-dev svelte@^5.56.3`.

## Onboard the sending domain

The from-address domain needs an enabled Cloudflare Email Sending subdomain on its zone. Without
it, `env.EMAIL.send` throws `E_SENDER_NOT_VERIFIED` on the very first magic-link send, and no
editor ever receives a link. Onboard it once with `wrangler email sending enable <domain>`, then
redeploy; the domain has to match the address your site actually sends from. A send that fails for
a different reason (a bad binding, a delivery error) surfaces the same way at runtime as the
`auth.link.send_failed` log event, whose `code` and `error` fields name the real cause.

## Force HTTPS at the edge

Always Use HTTPS needs to be on for the zone. cairn's guard intercepts any admin request reaching
the site over plain http and serves a branded 400 help page pointing at the https URL (log event
`guard.rejected`, `reason: https`), so an admin over http never reaches a working sign-in. Turn it
on under SSL/TLS, Edge Certificates.

## Turn on HSTS

HSTS needs to be enabled with a max-age of at least 30 days. cairn tags this condition `warning`
severity in the report, but like every failed check it still exits 1, so it fails a CI doctor
gate. Treat it as required for production: without it, browsers don't pin https for the domain,
so a stray http link can still reach the guard rejection above on a later visit. Turn it on under
the same SSL/TLS, Edge Certificates panel, with a max-age of six months or more.

## Provision the auth store

The `AUTH_DB` D1 database needs to answer, carry the `editor`, `magic_token`, and `session`
tables, and hold at least one owner row. Missing any of the three means no magic-link token can be
minted and nobody signs in. Create the database, apply the schema with
`wrangler d1 migrations apply your-site-auth --remote`, and seed the owner row; the
[configure auth and D1 guide](./configure-auth-and-d1.md) walks the full sequence.

## Install the GitHub App

`GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY_B64` need to resolve to
an App whose key parses and signs, whose installation mints a token, and whose installation can
read the target repository. This is the same chain a save or a publish walks in production, so a
green check here confirms the credentials run it live. The [set up the GitHub App
guide](./set-up-the-github-app.md) covers creating the App and its key.

## Probe the deployed admin

`--probe` runs one live GET and one live POST against a deployed site's `/admin/login`, checking
for the CSRF cookie, the hidden CSRF field, and a working request action. It tests the deployed
site from the outside, unlike every check above, which reads local config. It only runs when you
pass the flag, since it's a real network request against production. The probe submits a random
address at the reserved `example.invalid` domain, and cairn's non-leak design answers a non-editor
exactly as it answers a real one, so the probe sends no mail and changes nothing on the site; run
it after a deploy or whenever an editor reports trouble signing in. The [`cairn-doctor` reference](../reference/doctor.md#the-opt-in-live-probe) has the
two assertions it makes and what a failure of each one means.

## Runtime conditions

Two failure modes never show up in a doctor run. They're rejections cairn's admin guard raises on
a live request, so the first sign of either is a real editor hitting them, or the
`guard.rejected` log event.

### Admin CSRF token rejected

An admin form POST arrived without a valid `__Host-cairn_csrf` double-submit token, usually a
stale tab or a browser blocking cookies for the site. Open the sign-in page fresh, allow cookies,
and request a new link.

### Non-admin origin rejected

A non-admin form POST arrived with an Origin header that didn't match the site. Cairn restores
SvelteKit's own Origin check for every route outside `/admin` once `checkOrigin` is disabled
globally, so this rejection means a form posted from somewhere other than the site itself, or a
proxy in front of it stripped or rewrote the header.

Both correlate with `guard.rejected` in the logs, where the `reason` field names which of the two
fired; see [log events](../reference/log-events.md) and
[troubleshooting](./troubleshooting.md) for the rest of the day-two symptoms.
