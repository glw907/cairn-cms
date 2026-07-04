# Deploy to Cloudflare

Deploying a cairn site means wiring its admin and provisioning its Worker's Cloudflare
bindings. The admin is five files: a composer in `src/lib`, plus a layout pair and a
catch-all pair under `src/routes/admin`. The Worker reads three bindings — `AUTH_DB` (a D1
database) for the magic-link store, `EMAIL` (Email Sending) for the sign-in links, and, if
your adapter uses media, `MEDIA_BUCKET` (an R2 bucket). This guide assumes you've declared
your adapter (see [Define an adapter and schema](./define-an-adapter-and-schema.md)) and
registered the GitHub App (see [Set up the GitHub App](./set-up-the-github-app.md)).

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

The guard sets `event.locals.editor`, and the bindings it and the mount read (the D1 store,
the email sender, the GitHub App key) need typing on `App.Platform.env`. Intersect the
engine's binding types instead of restating each one by hand:

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

The `d1 create` output prints a `database_id`; copy it into `wrangler.jsonc` below. Email
Sending has no create command: onboard the sending domain from the dashboard instead, under
**Compute > Email Service > Email Sending > Onboard Domain**, which adds the `cf-bounce` MX,
SPF, DKIM, and DMARC records for you. Skip this and every magic-link send fails with
`E_SENDER_NOT_VERIFIED`, the same error Email Routing throws for an unverified destination;
the two are easy to conflate, and Email Sending's arbitrary-recipient send is the one cairn
needs.

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

`AUTH_DB` needs its schema before the guard can read or write a session. Copy
`examples/showcase/migrations/0000_auth.sql` from the cairn repository into your own site's
`migrations/` directory unchanged; it declares the three tables (`editor`, `magic_token`,
`session`) every cairn site's auth store shares, and cairn owns their shape. Apply
it against the database you just created:

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
per condition, if you'd rather read than run a command. If the site passes the doctor but
still won't let an editor in, see [Troubleshooting](./troubleshooting.md).
