# Deploy to Cloudflare

A cairn site reaches production one of three ways. Deploying it always means wiring its admin
and provisioning its Worker's Cloudflare bindings, whichever way you take. Mounting the admin
takes five files (a composer in `src/lib`, plus a layout pair and a catch-all pair under
`src/routes/admin`) and one build-config line; wiring the guard that gates it,
`src/hooks.server.ts`, adds a sixth. The Worker reads three bindings — `AUTH_DB` (a D1
database) for the magic-link store, `EMAIL` (Email Sending) for the sign-in links, and, if
your adapter uses media, `MEDIA_BUCKET` (an R2 bucket). This guide assumes you've declared
your adapter (see [Define an adapter and schema](./define-an-adapter-and-schema.md)) and
registered the GitHub App (see [Set up the GitHub App](./set-up-the-github-app.md)).

## Choose a path

How you created the site decides which way applies.

If `create-cairn-site` scaffolded your site, its own Builds chapter can connect it to Cloudflare
Workers Builds for you. It reads the tool's own saved record of your GitHub App and your
Cloudflare account, so it only works on a site `create-cairn-site` itself scaffolded. It selects
the site by its own `--dir` flag, not your current directory:

```sh
npx create-cairn-site --dir <dir> --connect
```

`--connect` works any time from your site's first deploy onward, including mid-way through the
domain or email chapters, or a resumed Builds chapter of its own. It connects your repository to
Workers Builds and binds a trigger to your existing Worker, then checks your repository's
committed `wrangler.jsonc` and `src/theme/cairn.config.ts` against the copies on your machine.
That check reads a hash recorded at the last check rather than the repository itself, so it
catches a change made on your machine but misses one made directly in the repository. When the
two differ, it commits your local copies onto the repository's current head.

The build watch that follows runs for up to about fifteen minutes by default. A build still
running past that point leaves the run exiting `0`, with the exact command to re-run and keep
watching. Once the first deploy succeeds, every push to your default branch builds and deploys
on its own.

This path carries a real cost. Connecting registers the Cloudflare API token you paste as the
Workers Builds build token, and Cloudflare hands that token to every build your repository runs,
so anyone who can land a commit on your default branch can read it. It also needs a browser
sign-in, to commit the reconciled config under your name, and a one-time authorization of
Cloudflare's "Workers and Pages" GitHub App on your account, if you have not already granted it
for an earlier site. See the [Builds
chapter](../../packages/create-cairn-site/README.md#the-builds-chapter) for the full cost
accounting and what each step asks of you.

If you built the site by hand, `create-cairn-site` holds no record of it and cannot connect it
this way. Wire the admin and deploy with `wrangler deploy` yourself, the way the rest of this
guide covers, and connect Workers Builds at the Cloudflare dashboard afterward if you want it.

The third way is a Deploy to Cloudflare button on a template repository. cairn does not publish
one, so this way is not available today. See Cloudflare's own [deploy-button
documentation](https://developers.cloudflare.com/workers/platform/deploy-buttons/) for what such
a button does when a template has one.

Whichever way you take, your site still needs a Workers plan that supports sending to arbitrary
recipients before anyone other than you can sign in. See [Choose a Workers
plan](./configure-auth-and-d1.md#choose-a-workers-plan).

Workers Builds deploys your site's code on every push. It has no equivalent for database
migrations. A schema change from an engine update still needs `wrangler d1 migrations apply` run
by hand on your machine, whichever way deployed the site. The sections below wire the admin by
hand and deploy it with `wrangler deploy`.

## Mount the admin

```
src/lib/cairn.server.ts
src/routes/admin/+layout.server.ts
src/routes/admin/+layout.svelte
src/routes/admin/[...path]/+page.server.ts
src/routes/admin/[...path]/+page.svelte
```

The composer builds the runtime once and wraps it in the single-mount facade:

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime);
```

You copy the four route files verbatim and leave them alone. The layout pair renders the
shared admin shell around every `/admin/**` route. The catch-all pair serves every admin
view through `admin.load` and `admin.actions`. Copy them from
[the canonical admin mount](../reference/admin-routes.md), which is the exact listing this
guide's own showcase runs. Keep `export const prerender = false` on the catch-all's
`+page.server.ts`: the admin is session-gated, and a site that prerenders by default would
otherwise bake a build-time snapshot of it.

One build-config line completes the mount. The package ships its admin components as real
`.svelte` files, which Vite externalizes by default for a registry install, breaking the
admin build. Tell Vite to bundle them:

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```

## Wire the guard

The mount serves every view, but nothing gates access to it yet. Add the auth guard to
`hooks.server.ts`:

```ts
// src/hooks.server.ts
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';

export const handle = createAuthGuard();
```

If your site already has a `handle` hook of its own, sequence the guard last with
SvelteKit's own `sequence(yourHook, createAuthGuard())`, so your hook sees every request and
the guard still owns `/admin` gating.

The guard sets `event.locals.cairnEditor`, and the bindings it and the mount read (the D1 store,
the email sender, the GitHub App key) need typing on `App.Platform.env`. Intersecting the
engine's binding types is a recommended convenience preset, not a requirement: a bare
`wrangler types`-generated `Env` also compiles clean against the preceding route wiring
(`export const actions = admin.actions;`), since every route factory's env parameter is
structurally satisfied by it too. Intersecting `CairnPlatformBindings` still catches a forgotten
binding at compile time rather than at runtime, which is why the guide keeps it:

```ts
// src/app.d.ts
import type { CairnPlatformBindings, CairnMediaBindings } from '@glw907/cairn-cms/sveltekit';
import '@glw907/cairn-cms/ambient';

declare global {
  namespace App {
    interface Platform {
      env: CairnPlatformBindings & CairnMediaBindings & { /* the site's own bindings */ };
    }
  }
}

export {};
```

Drop `CairnMediaBindings` if your adapter turns media off; its one member, `MEDIA_BUCKET`,
only exists when the adapter's `assets` block declares a bucket.

## Disable checkOrigin

cairn's guard owns CSRF for the admin with its own double-submit token, tolerant of the
missing `Origin` header a JS-free form POST sometimes sends. SvelteKit's own global
`checkOrigin` check runs ahead of any handle and would reject that same POST first, so hand
the authority over in `svelte.config.js`:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter(),
    csrf: { checkOrigin: false },
  },
};
```

This disables the check globally, not just for `/admin`. cairn's guard restores a strict
`Origin` check for every non-admin form on your site, so nothing else on your site loses its
CSRF protection.

Leave `ssr.target` out of your `vite.config.js`. An older Cloudflare SvelteKit pattern sets
`ssr.target: 'webworker'`, which makes the server build resolve browser conditions. cairn's
server-only subpaths, `@glw907/cairn-cms/auth-crypto` and `@glw907/cairn-cms/cloudflare`, then
resolve their client stub on the server and your Worker throws at startup. `adapter-cloudflare`
doesn't need the setting.

## Force HTTPS

The guard reads the request scheme to decide the login cookie's shape (`__Host-` prefixed
and Secure on https, bare on local http), and a magic-link confirmation link that arrives
over a plain-http origin can't set that cookie at all. Force the whole zone to https before
your first real login attempt:

1. In the Cloudflare dashboard, go to your zone's **SSL/TLS > Edge Certificates** and turn on
   **Always Use HTTPS**.
2. On the same page, turn on **HTTP Strict Transport Security (HSTS)** with a max age of at
   least 30 days.

`PUBLIC_ORIGIN`, the var you'll set in the next section, is the canonical origin cairn signs
magic links against; it must itself be an https URL once the zone forces one (`localhost` and
`127.0.0.1` are the only http exceptions, for local `wrangler dev`).

## Add the Cloudflare bindings

| Binding | Kind | Declared as |
| --- | --- | --- |
| `AUTH_DB` | D1 database | `d1_databases` |
| `EMAIL` | Email Sending | `send_email` |
| `MEDIA_BUCKET` | R2 bucket | `r2_buckets`, only if your adapter turns media on |

Create the D1 database and, if your adapter uses media, the R2 bucket:

```sh
npx wrangler d1 create your-site-auth
npx wrangler r2 bucket create your-site-media
```

The `d1 create` output prints a `database_id`; copy it into `wrangler.jsonc` below.

Onboard the sending domain with Wrangler:

```sh
npx wrangler email sending enable your-domain.com
```

To automate the same step, call the REST endpoint that command wraps:
`POST /zones/{zone_id}/email/sending/subdomains` with a body of `{"name": "your-domain.com"}`.
Post the zone's apex name. Email Sending treats each domain separately, so a subdomain is
onboarded as its own sending domain rather than inherited from the apex.

Onboarding adds the `cf-bounce` MX, SPF, and DKIM records, plus a DMARC record at the zone apex.
It leaves your domain's own MX and SPF records alone, so mail you already receive keeps working.

The DMARC record is written as `p=reject`, which asks receivers to reject any mail from this
domain that doesn't pass authentication. If you later add another service that sends as this
domain, such as a newsletter tool, add it to that record or its mail is rejected. Turning Email
Sending off again doesn't remove the DMARC record.

Skip onboarding and every magic-link send fails with `E_SENDER_NOT_VERIFIED`, the same error
Email Routing throws for an unverified destination; the two are easy to conflate, and Email
Sending's arbitrary-recipient send is the one cairn needs.

With both provisioned, declare the bindings alongside the observability setting from the
next section:

```jsonc
// wrangler.jsonc
{
  "name": "your-site",
  "compatibility_date": "2026-05-28",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".svelte-kit/cloudflare/_worker.js",
  "assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" },
  "observability": { "enabled": true },
  "send_email": [{ "name": "EMAIL" }],
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "your-site-auth",
      "database_id": "<the id d1 create printed>",
    },
  ],
  "r2_buckets": [{ "binding": "MEDIA_BUCKET", "bucket_name": "your-site-media" }],
  "vars": {
    "PUBLIC_ORIGIN": "https://your-site.example",
  },
}
```

This mirrors `examples/showcase/wrangler.jsonc` in the cairn repository; start from that file
rather than typing the shape from scratch. Mounting the R2 bucket's own delivery route
(`/media/[...path]`) is a separate step, covered in
[Wire the delivery surface](./wire-the-delivery-surface.md).

## Apply the auth schema

`AUTH_DB` needs its schema before the guard can read or write a session. The engine ships the
migration in the package. Copy it into your own site's `migrations/` directory, where `wrangler d1
migrations apply` reads it:

```sh
mkdir -p migrations
cp node_modules/@glw907/cairn-cms/migrations/0000_auth.sql migrations/
```

It declares the three tables (`editor`, `magic_token`, `session`) every cairn site's auth store
shares, and cairn owns their shape. Apply it against the database you just created:

```sh
npx wrangler d1 migrations apply your-site-auth --remote
```

See [Configure auth and D1](./configure-auth-and-d1.md) for seeding the first owner row and
confirming a real sign-in, once the schema exists.

## Turn on observability

The preceding `wrangler.jsonc` already sets `"observability": { "enabled": true }`. That
routes every event cairn logs (`auth.link.send_failed`, `commit.failed`, `guard.rejected`,
and the rest of the vocabulary) into Workers Logs, queryable by event or by editor. Leave it
off and a failed sign-in or a stuck publish leaves nothing to read. See
[Read cairn logs](./read-cairn-logs.md) for how to query them once you're deployed.

## Deploy

The GitHub App's private key must reach the Worker before the mount can sign anything. If
your adapter turns tidy on, the tidy action's model key does too.

```sh
npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
npx wrangler secret put ANTHROPIC_API_KEY   # only if tidy.enabled is true in site.config.yaml
```

Then deploy:

```sh
npx wrangler deploy
```

Run [`cairn-doctor`](../reference/doctor.md) against the deployed site next. It probes every
binding, the GitHub App signing chain, and the checkOrigin and edge settings from earlier in
this guide, and its `--probe` flag drives a real sign-in envelope against `/admin/login`
without spending a real email.
[Cloudflare readiness](./cloudflare-readiness.md) walks the same checks by hand, one section
per condition. If the site passes the doctor but still won't let an editor in, see
[Troubleshooting](./troubleshooting.md).
