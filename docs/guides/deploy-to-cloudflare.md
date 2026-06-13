# Deploy to Cloudflare

Goal: deploy the site Worker to Cloudflare so editor publishes commit to GitHub and the push redeploys, which is how held edits become live content.

## Prerequisites

- The GitHub App created and its credentials in hand. If you have not done that, start from [Set up the GitHub App](./set-up-the-github-app.md).
- The auth store provisioned. See [Configure auth and D1](./configure-auth-and-d1.md) for the `AUTH_DB` D1 database and the magic-link wiring.
- The delivery surface wired so the public site renders. See [Wire the delivery surface](./wire-the-delivery-surface.md).
- A Cloudflare account on the Workers Paid plan, which Email Sending requires; the sending domain itself is onboarded in a step below. The paid plan's subrequest limit also matters: an admin list page makes one GitHub read per entry, which outgrows the free plan's cap around 45 entries.
- The zone set to force HTTPS, which the magic-link login depends on ([Force HTTPS on the zone](#force-https) below covers why and how).

## Steps

1. **Choose the SvelteKit Cloudflare adapter.** Install `@sveltejs/adapter-cloudflare` and set it in `svelte.config.js` so the build emits a Worker. This is the only adapter the engine targets.

2. **Add the bindings the Worker needs.** Declare them in `wrangler.toml`. The auth store binds as `AUTH_DB` (the D1 database from the auth guide), and the magic-link sender binds as `EMAIL`:

   ```toml
   [[d1_databases]]
   binding = "AUTH_DB"
   database_name = "your-site-auth"
   database_id = "<your-d1-id>"

   [[send_email]]
   name = "EMAIL"
   ```

   The `EMAIL` binding serves both Cloudflare email products through the one declaration. The engine calls it as `env.EMAIL.send({ to, from, subject, html, text })`, which is the Email Sending shape that reaches arbitrary recipients.

   Type those bindings for the build with an `app.d.ts` that imports the engine's ambient `App.Locals` augmentation and points `platform.env` at the `AuthEnv` shape plus the GitHub App secrets. Copy this block verbatim:

   ```ts
   // src/app.d.ts
   import '@glw907/cairn-cms/ambient';
   import type { AuthEnv } from '@glw907/cairn-cms/sveltekit';

   declare global {
     namespace App {
       interface Platform {
         env: AuthEnv & {
           GITHUB_APP_ID: string;
           GITHUB_APP_INSTALLATION_ID: string;
           GITHUB_APP_PRIVATE_KEY_B64: string;
         };
       }
     }
   }

   export {};
   ```

   Import `AuthEnv` from `/sveltekit`, not the package root. The auth and content helpers a site mounts are typed on that subpath, and `skipLibCheck` does not warn when the import is wrong, so a mistyped binding degrades to an error type in silence (the gap two site retrofits hit).

3. **Onboard your sending domain.** The `EMAIL` binding can only send from a domain the zone has onboarded as a sender, and the magic-link email rides on that send, so an un-onboarded domain locks every editor out. Onboard the domain of your adapter's `branding.from` address:

   ```bash
   npx wrangler email sending enable your-domain.com
   ```

   The command enables the zone's sending subdomain and writes the DNS records delivery depends on: an SPF `TXT` record, a DKIM selector record, and a return-path record. Email Sending requires the Workers Paid plan, so upgrade first if the command refuses.

   Skip this step and every send throws `E_SENDER_NOT_VERIFIED`. Its message reads "destination address is not a verified address", which misleads twice over. The unverified party is your sender, and Email Routing throws the same string for an unverified forwarding destination, which is a different product. Run `npx cairn-doctor` before launch to catch the gap ahead of the first sign-in; [the doctor reference](../reference/doctor.md) and [the readiness checklist](./cloudflare-readiness.md) cover the full pre-launch gate.

4. **Set the GitHub App secrets.** Push the App id, the installation id, and the base64 private key as Worker secrets (never as plaintext in `wrangler.toml`):

   ```bash
   npx wrangler secret put GITHUB_APP_ID
   npx wrangler secret put GITHUB_APP_INSTALLATION_ID
   npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
   ```

   The Worker decodes `GITHUB_APP_PRIVATE_KEY_B64` with `atob()` before it signs, so store the PEM as a single-line base64 string.

5. **Mount the admin and `/healthz`.** The whole `/admin` surface mounts as one catch-all route pair, and `/healthz` lives at the site root (so the auth guard does not gate the deploy check). Copy the two files and the composer from [the canonical admin mount](../reference/admin-routes.md) rather than guessing the layout, and compose the runtime once in `$lib/cairn.server.ts`.

6. **Deploy the Worker.** With `CLOUDFLARE_API_TOKEN` in the environment, run:

   ```bash
   npx wrangler deploy
   ```

   Wrangler picks up the token automatically.

7. **Confirm the push redeploys.** Connect the GitHub repository to the Worker's build so a push to `main` rebuilds and redeploys. From here an editor's saves hold on a pending branch, Publish commits the held content to `main` through the GitHub App, the push fires the build, and the new content goes live.

8. <a id="disable-checkorigin"></a>**Hand cairn the admin CSRF authority.** Set `csrf: { checkOrigin: false }` in `kit` in `svelte.config.js`. cairn now owns CSRF for the admin through its guard, which validates a uniform double-submit token on every admin form POST. Why disable the framework check? The JS-free magic-link sign-in posts from a browser that may omit the `Origin` header, and SvelteKit's global check would reject that post, so it has to come off for the admin to work. You lose nothing on the rest of the site, because cairn restores the strict `Origin` check for your non-admin form POSTs inside the same guard.

   ```js
   // svelte.config.js
   const config = {
     kit: {
       adapter: adapter(),
       csrf: { checkOrigin: false }
     }
   };
   ```

   SvelteKit 2.61 deprecates `csrf.checkOrigin` in favour of `csrf.trustedOrigins` and prints a build
   warning, but `checkOrigin: false` is still the correct and required setting. `trustedOrigins` cannot
   replace it. SvelteKit's check forbids a form POST that carries no `Origin` header regardless of the
   trusted list (the exact JS-free magic-link case cairn fixes), and the check runs before the `handle`
   hook where cairn's guard lives, so the global switch is the only way to hand cairn the authority.
   cairn tracks the eventual removal; the reasoning and the planned fallback are in
   [the 2026-06-09 DX feedback note](../internal/feedback/2026-06-09-907-0.36-retrofit.md).

9. <a id="force-https"></a>**Force HTTPS on the zone.** This is a requirement, not a polish step. Turn on "Always Use HTTPS" so the edge redirects every plain-http request to https before it reaches the Worker, and confirm HSTS is set on https responses.

   Here is what the setting protects. The magic-link login submits a JS-free `<form method="POST">` from the login and confirm pages, and cairn's CSRF cookie carries the `__Host-` prefix on https (which binds it to the exact origin), as does the session cookie. If your zone serves `/admin` over both http and https, the http scheme stays reachable: a first visit with no cached HSTS lands on http, the auth guard builds its login redirect from the incoming request, and the http scheme sticks. Forcing HTTPS at the edge locks the scheme to https before the form ever posts, which is what keeps the `__Host-` cookies origin-bound.

   Until you force HTTPS, the guard catches the case for you. An `/admin` request that reaches a deployed host over http gets a styled "this admin needs HTTPS" page with a one-click link to the https version and these same instructions, rather than a failed sign-in. Local `wrangler dev` over http is exempt. The page is a fallback, not a substitute, so turn the zone setting on.

## Verify

After the deploy:

- The deployed Worker serves the public site at its domain.
- `/admin` redirects an unauthenticated visitor to `/admin/login` and a magic-link sign-in lands an authenticated session.
- A plain-http request to the site redirects to https at the edge, so the magic-link form always posts over https.
- An editor's Publish commits the held content to `main` and the push-triggered build redeploys with it. Saves hold on a pending branch and deploy nothing.
- `/healthz` returns `ok:true`, which confirms the GitHub App signing self-test passes with the live key.
- `npx cairn-doctor` reports every check green, covering this list and the zone settings in one pass. A repo that wires the [`cairnManifest`](../reference/vite.md) Vite plugin lets the doctor read the from-address and the repository off your adapter, so the bare command works; without the plugin, pass `--from <address> --repo <owner/name>` so those inputs are not skipped.

## See also

- [The SvelteKit reference](../reference/sveltekit.md) for `createCairnAdmin` and the `healthLoad` signature behind `/healthz`.
- [The architecture](../explanation/architecture.md#the-commit-and-publish-flow) for the save-and-publish flow.
- [The canonical admin mount](../reference/admin-routes.md) for the exact files to copy.
- [The `cairn-doctor` CLI](../reference/doctor.md) and [the readiness checklist](./cloudflare-readiness.md) for the pre-launch gate over this whole setup.
