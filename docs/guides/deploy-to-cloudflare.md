# Deploy to Cloudflare

Goal: deploy the site Worker to Cloudflare so editor saves commit to GitHub and the push redeploys, which is how a save becomes a published change.

## Prerequisites

- The GitHub App created and its credentials in hand. If you have not done that, start from [Set up the GitHub App](./set-up-the-github-app.md).
- The auth store provisioned. See [Configure auth and D1](./configure-auth-and-d1.md) for the `AUTH_DB` D1 database and the magic-link wiring.
- The delivery surface wired so the public site renders. See [Wire the delivery surface](./wire-the-delivery-surface.md).
- A Cloudflare account on the Workers Paid plan with Email Sending onboarded, which the magic-link email requires.
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

   The `EMAIL` binding is one binding for both Cloudflare email products. The engine calls it as `env.EMAIL.send({ to, from, subject, html, text })`, which is the Email Sending shape that reaches arbitrary recipients.

3. **Set the GitHub App secrets.** Push the App id, the installation id, and the base64 private key as Worker secrets, not as plaintext in `wrangler.toml`:

   ```bash
   npx wrangler secret put GITHUB_APP_ID
   npx wrangler secret put GITHUB_APP_INSTALLATION_ID
   npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64
   ```

   The Worker decodes `GITHUB_APP_PRIVATE_KEY_B64` with `atob()` before it signs, so store the PEM as a single-line base64 string.

4. **Mount the canonical admin routes and `/healthz`.** The `/admin/*` tree uses the `(app)` group so the login page sits outside the session-requiring layout load, and `/healthz` lives at the site root so the auth guard does not gate the deploy check. Copy the tree from [the canonical admin route structure](../admin-route-structure.md) rather than guessing the layout, and compose the runtime once in `$lib/cairn.server.ts`.

5. **Deploy the Worker.** With `CLOUDFLARE_API_TOKEN` in the environment, run:

   ```bash
   npx wrangler deploy
   ```

   Wrangler picks up the token automatically.

6. **Confirm the push redeploys.** Connect the GitHub repository to the Worker's build so a push to `main` rebuilds and redeploys. An editor save commits through the GitHub App, the push fires the build, and the new content goes live. Commit is publish.

7. <a id="force-https"></a>**Force HTTPS on the zone.** This is a requirement, not a polish step. Turn on "Always Use HTTPS" so the edge redirects every plain-http request to https before it reaches the Worker, and confirm HSTS is set on https responses.

   The magic-link login submits a JS-free `<form method="POST">` from the login and confirm pages. SvelteKit's CSRF guard rejects any form POST whose `Origin` header does not exactly match the request's scheme and host, so a request that reaches the Worker over http (or with a cross-scheme `Origin`) fails with `Cross-site POST form submissions are forbidden` (a 403). A zone that serves `/admin` over both http and https makes that mismatch reachable: a first visit with no cached HSTS stays on http, and the auth guard builds its login redirect from the incoming request, so the http scheme sticks. Forcing HTTPS at the edge locks the scheme to https before the form ever posts, which is what keeps the `Origin` stable.

   The same `Origin` dependency is the reason the [admin smoke test](../admin-smoke-test.md) sends an explicit `Origin` header when it exercises a form action. Keep that note and this requirement together.

## Verify

After the deploy:

- The deployed Worker serves the public site at its domain.
- `/admin` redirects an unauthenticated visitor to `/admin/login` and a magic-link sign-in lands an authenticated session.
- A plain-http request to the site redirects to https at the edge, so the magic-link form always posts over https.
- An editor save commits to `main` and the push-triggered build redeploys with the new content.
- `/healthz` returns `ok:true`, which confirms the GitHub App signing self-test passes with the live key.

## See also

- [The SvelteKit reference](../reference/sveltekit.md) for the route factories and the `healthLoad` signature behind `/healthz`.
- [The architecture](../explanation/architecture.md#the-commit-and-publish-flow) for the commit-is-publish flow.
- [The canonical admin route structure](../admin-route-structure.md) for the exact route tree to copy.
