# Add cairn to an existing SvelteKit app

A scaffolded site already has all of this. On a hand-built app, wire
the engine in this order, then content, then (only if asked) the admin and production.

Contents:

- [Engine wiring](#engine-wiring)
- [Site config, adapter, content](#site-config-adapter-content)
- [Render entries](#render-entries)
- [Dev backend admin](#dev-backend-admin)
- [Production](#production)
- [Report what is left](#report-what-is-left)

## Engine wiring

1. Dependencies: `@glw907/cairn-cms` (dependency), `@cloudflare/workers-types` `^5` (dev
   dependency, a required peer). `ERESOLVE` means the app still pins `@sveltejs/kit` `^2`.
2. `vite.config.ts`: `ssr: { noExternal: ['@glw907/cairn-cms'] }`. The engine ships `.svelte`
   source that the site's Svelte plugin must compile.
3. `src/app.d.ts`: `import '@glw907/cairn-cms/ambient';` above `declare global`. It types
   `App.Locals` and declares `__CAIRN_DEV_BUILD__`.
4. Imports: SvelteKit 3 throws on `$lib`. Use the `package.json` `imports` map
   (`"#lib/*": "./src/lib/*"`), and import site modules as `#lib/<file>.js`. Add the map if absent.
5. A custom route that needs a binding reads it from `cloudflare:workers` (adapter 8 declares no
   `App.Platform`), typed by `wrangler types --include-runtime=false`.

## Site config, adapter, content

1. `src/lib/site.config.yaml` with a non-empty `siteName` (unknown top-level keys are rejected).
   Set the adapter's `editor.siteConfigPath` to this path; it defaults to the scaffold's
   `src/theme/site.config.yaml`.
2. `src/lib/cairn.config.ts` exports `cairn = defineAdapter({ content, backend, email, rendering, editor })`
   and `siteConfig = parseSiteConfig(siteYaml)` (imported with `?raw`). Declare a field for every
   frontmatter key the content keeps (`references/content-model.md`). `backend` takes
   `createGithubApp({ owner, repo, branch, appId, installationId })`; until production these are
   placeholders (`appId: '0'`). `email: { from }` likewise. `rendering.render` is
   `createRenderer({ components }).render`, which forwards `resolveLink`, `resolveMedia`, and `resolveFragment`.
3. `src/lib/content.ts`: one literal eager `?raw` glob per concept into `createSiteIndexes`, with
   validation left on; export `site` and an `origin` constant.
4. `vite.config.ts`: `cairnManifest({ configModule: '/src/lib/cairn.config.ts', content: { posts: '/src/content/posts/*.md' } })`
   after `sveltekit()`.
5. `npx cairn-manifest`, then commit `src/content/.cairn/index.json` and `site-facts.json`. Every
   build fails on a stale manifest.

## Render entries

`src/routes/[...path]/+page.server.ts` with `prerender = true`, `entries`, and `load` from
`createPublicRoutes({ site, render: cairn.rendering.render, origin, siteName, description })`;
`+page.svelte` renders `{@html data.html}`. Shape and head: `references/public-routes.md`. A posts
concept with default routing serves each entry at `/posts/<slug>`.

Done when `npm run check` and `npm run build` pass. A build failure table is in
`references/public-routes.md`.

## Dev backend admin

1. `src/lib/cairn.server.ts`: `runtime = composeRuntime({ adapter: cairn, siteConfig })` and
   `admin = createCairnAdmin({ runtime, auth: { bootstrapOwner: { email, displayName } } })`.
2. Mount the catch-all and layout (`references/admin-access.md`).
3. `npm install -D @glw907/cairn-cms-dev @types/node`; add `@glw907/cairn-cms-dev` to
   `ssr.noExternal` (without it `/admin` answers 500 under `vite dev`).
4. `src/hooks.server.ts`:

   ```ts
   /// <reference types="node" />
   import type { Handle } from '@sveltejs/kit/hooks';
   import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
   import { runtime } from '#lib/cairn.server.js';

   let handle: Handle;
   if (__CAIRN_DEV_BUILD__ && process.env.CAIRN_DEV_BACKEND === '1') {
     const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
     handle = devBackendHandle({ runtime });
   } else {
     handle = createAuthGuard({ runtime });
   }

   export { handle };
   ```

   Name `__CAIRN_DEV_BUILD__` directly at each call site; an imported constant survives Vite's fold
   and ships the dev backend. The `cairnManifest` plugin defines the flag; set no define of your own.
5. `CAIRN_DEV_BACKEND=1 npm run dev` opens `/admin` signed in as owner. Edits live in memory
   (`content: 'repository'`, which throws under workerd; use `'fixtures'` there).

## Production

Production needs the Workers Paid plan. Until bindings exist, `/admin` shows **Wrangler bindings are
missing** (`config.bindings-missing`).

1. GitHub App: one repository permission, **Contents: Read and write**, no webhook, installed on the
   site's repo only. Put App ID and installation ID in `createGithubApp`. The key goes in a secret:
   `base64 < key.pem | tr -d '\n' | npx wrangler secret put GITHUB_APP_PRIVATE_KEY_B64`. Keep the
   `.pem` outside every repository.
2. Auth database: `npx wrangler d1 create <site>-auth`; copy `0000_auth.sql` and
   `0004_login_nonce.sql` from `node_modules/@glw907/cairn-cms/migrations/` into `migrations/`; bind
   as `AUTH_DB` with `migrations_dir: "migrations"`; `npx wrangler d1 migrations apply <db> --remote`
   (and `--local` for `wrangler dev`). Other migrations are opt-in: `0001_roles`, `0002_audit` (own
   database), `0003_preview`.
3. Email: `npx wrangler email sending enable <domain>`; `send_email: [{ name: "EMAIL" }]`; a custom
   domain route; `vars.PUBLIC_ORIGIN` (the https origin, also the content module's `origin`);
   `observability.enabled: true`; `email.from` on the domain.
4. `cairn doctor` (passes `config.bindings`), commit, push, `npm run build`, `npx wrangler deploy`.
5. Sign in with the `bootstrapOwner` email (logs `editor.bootstrapped`), publish an edit, confirm the
   commit on `main`, pull, rebuild, redeploy.

| Symptom | Fix |
|---|---|
| **Wrangler bindings are missing** | Declare `AUTH_DB` and `EMAIL`, redeploy |
| `config.public-origin-invalid` | Set `PUBLIC_ORIGIN` to the https origin |
| No sign-in email | Onboard the domain for Email Sending |
| Store error naming `0004_login_nonce.sql` | Copy and apply it `--remote` |
| Publish fails, `github.app-unreachable` | Check App permission, installation, and the key secret |

Sign-in email: `auth.branding` (`siteName`, `from`, `replyTo`) overrides members; a custom
`auth.send` (`SendMagicLink`) replaces the sender, and must never put the body or link in a thrown
message.

## Report what is left

When stopping before production, list each placeholder still in the code and each piece unwired:
the `createGithubApp` values and the App itself, `GITHUB_APP_PRIVATE_KEY_B64`, `email.from`,
`bootstrapOwner`, the `origin` constant and `PUBLIC_ORIGIN`, the admin mount and hooks, `AUTH_DB`
and its migrations, the `EMAIL` binding and domain.
