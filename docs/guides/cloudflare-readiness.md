# Cloudflare readiness

Goal: take a default 2026 Cloudflare account to one that runs a cairn site, where editors sign in by email and publishes commit to GitHub. Work the sections in order. `cairn doctor` is the automated pass over this same list: each condition id below names a doctor check, and the doctor's report prints the same remediation the section spells out.

The first two sections are setup steps the doctor cannot probe. Every later section maps to one condition in cairn's registry, the id the doctor and the runtime error surfaces both print.

## Put your domain on Cloudflare

This is a setup step; the doctor does not probe it.

Register a new domain with [Cloudflare Registrar](https://developers.cloudflare.com/registrar/get-started/register-domain/), or move an existing one by [adding the site](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/) and pointing its nameservers at Cloudflare. The zone must be active on your account before any edge setting below can take effect, and the magic-link sender domain in the email section is normally this same zone.

## Upgrade to Workers Paid

This is a setup step; the doctor does not probe it.

Email Sending requires the [Workers Paid plan](https://developers.cloudflare.com/workers/platform/pricing/), and without it the magic-link sign-in cannot send at all. The paid plan's higher subrequest limit also matters on its own: an admin list page makes one GitHub read per entry, which outgrows the free cap around 45 entries.

## Meet the dependency floors

Condition: `config.dependency-floors-unmet`.

Consumer sites compile the engine's shipped `.svelte` sources with their own `svelte` and `@sveltejs/kit`, so the engine declares both as peer dependencies with real floors. The floors carry correctness weight. svelte `5.56.1` miscompiles parenthesized boolean groupings, the kind of bug a below-floor compiler ships silently, which is why the `svelte` peer floors at `^5.56.3`. A lockfile can pin below the floor even while `package.json` looks fine, and the lockfile is what the doctor reads: it compares the resolved versions in `package-lock.json` against the peer ranges the installed engine declares, so the floors live in one place and rise with the package. A pnpm or yarn site has no `package-lock.json`, and the check skips with a line saying so.

The fix is to raise the ranges in the site's `package.json` and reinstall so the lockfile re-resolves:

```bash
npm install --save-dev svelte@^5.56.3 @sveltejs/kit@^2.12
```

## Deploy the Worker with its bindings

Condition: `config.bindings-missing`.

Build the site with `@sveltejs/adapter-cloudflare` and deploy it as a Worker; [Deploy to Cloudflare](./deploy-to-cloudflare.md) walks the whole sequence. The fact this condition checks is the wrangler config: it must declare the magic-link sender as a `send_email` binding named `EMAIL` and the auth store as a D1 binding named `AUTH_DB`.

```toml
[[d1_databases]]
binding = "AUTH_DB"
database_name = "your-site-auth"
database_id = "<your-d1-id>"

[[send_email]]
name = "EMAIL"
```

`wrangler.jsonc` declares the same bindings in JSON form. Re-deploy after a binding change; a binding exists only in the deployed Worker.

## Turn on observability

Condition: `config.observability-off`.

cairn emits a structured JSON record for every operationally meaningful event, and [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) is where you read them. Without the sink the records go nowhere, and a runtime failure leaves nothing to diagnose from. Turn it on in the wrangler config:

```jsonc
"observability": { "enabled": true }
```

[Read cairn's logs](./read-cairn-logs.md) covers querying the events once the sink is on.

## Set the public origin

Condition: `config.public-origin-invalid`.

`PUBLIC_ORIGIN` is the site's canonical origin. The magic-link confirmation links and the absolute feed URLs derive from it, and it comes from config alone, never from a request header, so a forged `Host` header cannot redirect a link. Set it in the wrangler config vars and re-deploy:

```toml
[vars]
PUBLIC_ORIGIN = "https://your-domain.com"
```

The value must parse as a URL and use https; `http` passes only on `localhost` or `127.0.0.1`, the local-dev override that belongs in `.dev.vars`. A missing or invalid value stops sign-in at the first step, since no usable link can be minted. The doctor reads the wrangler vars and falls back to a `PUBLIC_ORIGIN` environment variable when the config carries none.

## Force HTTPS at the edge

Condition: `edge.https-not-forced`.

Turn on [Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/) for the zone, under SSL/TLS, Edge Certificates. The magic-link sign-in posts a JS-free form, and cairn's session and CSRF cookies carry the `__Host-` prefix, which binds them to the https origin. An `/admin` visit that sticks on plain http gets a styled refusal page instead of a working sign-in. The deploy guide explains the failure shape under [Force HTTPS on the zone](./deploy-to-cloudflare.md#force-https).

## Turn on HSTS

Condition: `edge.hsts-off`.

In the same Edge Certificates section, enable [HSTS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/) with a max-age of at least six months. Always Use HTTPS redirects each plain-http request as it arrives; HSTS makes the browser stop sending them, so a later http link to the admin never leaves the machine. The production cairn zones run a two-year max-age.

## Onboard the sending domain

Conditions: `email.sender-not-onboarded`, plus `email.send-failed` as its runtime sibling.

The magic-link email sends through Cloudflare [Email Sending](https://developers.cloudflare.com/email-service/), and the gate is the per-zone sending subdomain: the domain of your adapter's `branding.from` address must be onboarded as a sender. Run:

```bash
npx wrangler email sending enable your-domain.com
```

and re-deploy. An un-onboarded sender throws `E_SENDER_NOT_VERIFIED` on every send, so no editor can sign in.

`email.send-failed` covers the same surface after setup: an onboarded domain can still fail a send at runtime, through a binding misconfiguration, a delivery error, or a custom sender failure, and that surfaces as an `auth.link.send_failed` log record. The fix starts from the record's `code` and `error` fields rather than from a setting on this page. The doctor probes the onboarding by default, and `cairn doctor --send-test <address>` proves a real delivery end to end.

## Provision the auth store

Condition: `auth.store-unreachable`.

[Configure auth and D1](./configure-auth-and-d1.md) is the full walkthrough. Create the [D1 database](https://developers.cloudflare.com/d1/get-started/), apply the auth schema, and seed at least one owner row, then check that the database id in the `AUTH_DB` binding matches. The doctor probes all three layers: the database answers, the `editor`, `magic_token`, and `session` tables exist, and an owner row is present. A store with no owner row accepts nobody, which is the classic mistyped-owner-address lockout.

## Install the GitHub App

Condition: `github.app-unreachable`.

[Set up the GitHub App](./set-up-the-github-app.md) covers registering the App and installing it on the site repository. Push the three credentials as Worker secrets:

```bash
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_APP_INSTALLATION_ID
npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
```

The doctor walks the same chain the Worker does: the key parses, the App authenticates, an installation token mints, and the repository answers a read. A failure names which link broke.

## Hand cairn the CSRF authority

Condition: `config.csrf-disable-missing`.

Set `csrf: { checkOrigin: false }` in `svelte.config.js`. cairn's guard owns the admin CSRF checks through a uniform double-submit token, and it restores the strict `Origin` check for your non-admin form POSTs, so the framework's global check has to come off for the JS-free sign-in to work. The handoff is a pair: the disable alone leaves the site with no CSRF protection, so `src/hooks.server.ts` must also wire `createAuthGuard`, and the doctor checks both halves. The deploy guide carries the full reasoning under [Hand cairn the admin CSRF authority](./deploy-to-cloudflare.md#disable-checkorigin).

## Validate the site config

Condition: `config.site-config-invalid`.

`site.config.yaml` must parse and pass the URL-policy validation; the build and the admin both resolve the content concepts from it. The validation error names the failing field or rule, so the fix is usually one line. The doctor runs the same parser and validator the engine runs at build time.

## Runtime conditions

Two registry conditions are request-time rejections rather than setup steps, so the doctor has no probe for them. Both surface as `guard.rejected` log records.

### Admin CSRF token rejected

Condition: `auth.csrf-token-invalid`. An admin form POST arrived without a valid `__Host-cairn_csrf` double-submit token, usually from a stale tab or blocked cookies. The editor opens the sign-in page fresh, allows cookies for the site, and requests a new link.

### Non-admin Origin rejected

Condition: `auth.csrf-origin-mismatch`. A non-admin unsafe form POST carried an `Origin` that did not match the site, so cairn's restored framework Origin check rejected it. Post the form from the same origin, or check for a proxy that strips or rewrites the header.

## Run the doctor

From the site directory, with the credentials in the environment:

```bash
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
GITHUB_APP_ID=... GITHUB_APP_INSTALLATION_ID=... GITHUB_APP_PRIVATE_KEY_B64=... \
npx cairn-doctor --from editor@your-domain.com --repo you/your-site
```

The doctor runs every check above, prints one line per check with PASS, FAIL, or SKIP, and follows each failure with the condition's why and remediation. A missing credential makes the affected checks skip with a line naming the flag or variable; a skip never fails the run. `--from` can also come from `CAIRN_FROM` and `--repo` from `GITHUB_REPO`, `--send-test <address>` adds the opt-in live email send, and `--probe` adds the live admin probe below. The exit code is 0 when nothing failed and 1 otherwise, so the command slots into a deploy script as a gate.

## Probe the deployed admin

Condition: `admin.login-probe-failed`.

Every check above reads config and credentials; this one asks the running site. `cairn doctor --probe` (bare, using the `PUBLIC_ORIGIN` input, or with an explicit URL) fetches the deployed `/admin/login` page, asserts the sign-in envelope (a 200, the CSRF cookie and hidden field, the `?/request` form), and POSTs the request action with a random non-editor address. The engine answers a non-editor exactly like a successful send while sending no email and minting no token, so the probe is side-effect free; a `throttled` answer also passes, since a re-run inside a real cooldown window still proves the path. It is an opt-in network POST against production, so it never runs without the flag.

A probe failure has many possible causes, from a missed deploy to a broken send path, and the detail line names the assertion that failed. Work back through the sections above; the rest of the doctor's report usually points at the culprit. The [doctor reference](../reference/doctor.md#the-opt-in-live-probe) details each assertion.

## See also

- [Deploy to Cloudflare](./deploy-to-cloudflare.md) for the Worker, the bindings, and the publish-and-deploy loop.
- [Configure auth and D1](./configure-auth-and-d1.md) for the auth schema and the owner seed.
- [Set up the GitHub App](./set-up-the-github-app.md) for the App registration and install.
- [Read cairn's logs](./read-cairn-logs.md) for querying the runtime events these conditions correlate with.
