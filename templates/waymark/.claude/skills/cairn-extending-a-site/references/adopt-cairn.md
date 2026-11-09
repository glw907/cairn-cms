# Add cairn to an existing SvelteKit app

A scaffolded site already has all of this. On a hand-built app, wire
the engine in this order, then content, then (only if asked) the admin and production.

Contents:

- [Engine wiring](#engine-wiring)
- [Site config, adapter, content](#site-config-adapter-content)
- [Render entries](#render-entries)
- [Dev backend admin](#dev-backend-admin)
- [Production](#production)
- [Agent tooling](#agent-tooling)
- [Report what is left](#report-what-is-left)

## Engine wiring

1. Dependencies: `@glw907/cairn-cms` (dependency), `@cloudflare/workers-types` `^5` (dev
   dependency, a required peer). `ERESOLVE` means the app still pins `@sveltejs/kit` `^2`.
2. `src/app.d.ts`: `import '@glw907/cairn-cms/ambient';` above `declare global`. It types
   `App.Locals` and declares `__CAIRN_DEV_BUILD__`.
3. Imports: SvelteKit 3 throws on `$lib`. Use the `package.json` `imports` map
   (`"#lib/*": "./src/lib/*"`), and import site modules as `#lib/<file>.js`. Add the map if absent.
4. A custom route that needs a binding reads it from `cloudflare:workers` (adapter 8 declares no
   `App.Platform`), typed by `wrangler types --include-runtime=false`. The scaffold wraps the command
as `npm run cf-typegen` (`wrangler types --env-file=.dev.vars.example --include-runtime=false`) and
commits `worker-configuration.d.ts`; rerun it after adding or renaming a binding in
`wrangler.jsonc` or a variable in `.dev.vars.example`.
5. A test that imports code reaching the engine's server modules needs
   `test.server.deps.inline: ['@glw907/cairn-cms']` in `vitest.config.ts`, so
   `vi.mock('cloudflare:workers')` applies to the engine's import. Without it Node's loader
   rejects the `cloudflare:` scheme. The scaffold sets it.

## Site config, adapter, content

1. `src/site/site.config.yaml` with a non-empty `siteName` (unknown top-level keys are rejected).
   The nav editor, Settings, and the tag vocabulary read and write that fixed path.
2. `src/lib/cairn.config.ts` exports `cairn = defineAdapter({ content, backend, email, rendering, editor })`
   and `siteConfig = parseSiteConfig(siteYaml)` (imported with `?raw`). Declare a field for every
   frontmatter key the content keeps (`references/content-model.md`). `backend` takes
   `createGithubApp({ owner, repo, branch, appId, installationId })`; until production these are
   placeholders (`appId: '0'`). `email: { from }` likewise. `rendering.render` is
   `createRenderer({ blocks }).render`, which forwards `resolveLink`, `resolveMedia`, and `resolveFragment`.
3. `src/lib/content.ts`: one literal eager `?raw` glob in the absolute form `/src/content/**/*.md`
   into `createSiteResolver(cairn, files)`; export `site` and an `origin` constant. A relative
   glob's `../content/...` keys are refused.
4. `vite.config.ts`: `cairnManifest({ configModule: '/src/lib/cairn.config.ts' })`
   after `sveltekit()`.
5. `npx cairn-manifest`, then commit `src/content/.cairn/index.json` and `site-facts.json`. Every
   build fails on a stale manifest.

## Render entries

`src/routes/[...path]/+page.server.ts` with `prerender = true`, `entries`, and `load` from
`createPublicRoutes({ site, render: cairn.rendering.render, origin, siteName, description,
resolveMedia: null })`; `+page.svelte` renders `{@html data.html}`. Shape and head: `references/public-routes.md`. A posts
concept with default routing serves each entry at `/posts/<slug>`.

Done when `npm run check` and `npm run build` pass. A build failure table is in
`references/public-routes.md`.

## Dev backend admin

1. `src/lib/cairn.server.ts`: `runtime = composeRuntime({ adapter: cairn, siteConfig })` and
   `admin = createCairnAdmin({ runtime })`.
2. Mount the catch-all and layout (`references/admin-access.md`).
3. `npm install -D @glw907/cairn-cms-dev @types/node`. The `cairnManifest` plugin
   already adds both packages to `ssr.noExternal`, so `vite.config.ts` needs no line for them.
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
   The snippet's `process.env` read sees the flag under `vite dev` only. The scaffold's
   `devBackendOptIn()` in `src/chassis/dev-gate.ts` also reads the Worker env through
   `cloudflare:workers` (set by `wrangler dev --var CAIRN_DEV_BACKEND:1`), inside a `try` because that
   env throws while a build prerenders. `src/app.d.ts` declares `CAIRN_DEV_BACKEND?: string` on
   `Cloudflare.Env` by hand, because `wrangler types` never generates it.
5. `CAIRN_DEV_BACKEND=1 npm run dev` opens `/admin` signed in as owner. `devBackendHandle` takes
   `content`: `'repository'` (the default) overlays each branch in memory on the working tree and
   writes nothing to disk, and throws under workerd; `'fixtures'` serves the package's seeded
   sample repo and runs anywhere; `'empty'` holds only `site.config.yaml` with a `siteName`, so
   every concept lists nothing, and runs under workerd. While the dev backend holds content in memory
   (all three modes do) the admin shows **Edits are held in memory.**; they are discarded when the dev
   server stops.

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
   database), `0003_preview`. Then seed the first owner row, since no sign-in creates one:

   ```sh
   npx wrangler d1 execute <auth-db> --remote --command "INSERT INTO editor (email, display_name, role, created_at) VALUES (lower(trim('you@example.com')), 'Your Name', 'owner', unixepoch() * 1000)"
   ```

   Double any `'` in the email or name, and use `--local` in place of `--remote` for `wrangler dev`.
3. Email: `npx wrangler email sending enable <domain>`; `send_email: [{ name: "EMAIL" }]`; a custom
   domain route; `vars.PUBLIC_ORIGIN` (the https origin, also the content module's `origin`);
   `observability.enabled: true`; `email.from` on the domain.
4. `cairn doctor` (passes `config.bindings`), commit, push, `npm run build`, `npx wrangler deploy`.
5. Sign in with the seeded owner email, publish an edit, confirm the
   commit on `main`, pull, rebuild, redeploy.

| Symptom | Fix |
|---|---|
| **Wrangler bindings are missing** | Declare `AUTH_DB` and `EMAIL`, redeploy |
| `config.public-origin-invalid` | Set `PUBLIC_ORIGIN` to the https origin |
| No sign-in email, with an `auth.link.send_failed` record | Onboard the domain for Email Sending |
| No sign-in email, with no `auth.link.send_failed` record | Run `SELECT email FROM editor`: if the address is missing, seed the owner; if it is there, delivery can lag on a new sending domain, so wait and retry |
| Store error naming `0004_login_nonce.sql` | Copy and apply it `--remote` |
| Publish fails, `github.app-unreachable` | Check App permission, installation, and the key secret |

Sign-in email: the site name and sender come from the runtime; a custom `auth.send`
(`SendMagicLink`) replaces the sender, and must never put the body or link in a thrown message.
The message's Reply-To is `email.replyTo` (one address); leave it out and the message carries none.

## Agent tooling

A one-time setup on the developer's machine, beyond what the engine needs to run.

**The Stop hook.** Add this to `.claude/settings.json` to run the audit whenever an agent session
stops working on the site, so a drifted admin screen surfaces before the commit:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{let a=false;try{a=JSON.parse(d).stop_hook_active===true}catch{}if(a)process.exit(0);const r=require('child_process').spawnSync('npm',['run','check:cairn','--if-present'],{encoding:'utf8'});if(r.status===0)process.exit(0);process.stderr.write((r.stdout||'')+(r.stderr||'')+(r.error||''));process.exit(2)})\""
          }
        ]
      }
    ]
  }
}
```

It runs on `Stop`, not `PostToolUse`: the audit earns a full run once a session settles on a
result, not after every tool call. A failing audit exits 2 with its output on stderr, and Claude
Code hands that to the agent as the reason to keep working. Exit 1 would be a non-blocking error
the agent never sees. The `stop_hook_active` guard ends the loop on the continuation turn, so a
finding the agent cannot fix does not block forever. The command reads its payload with `node`,
which means it needs no `jq`.

**daisyUI tooling.** Install the published daisyUI skill
(`npx skills add saadeghi/daisyui --agent claude-code`) for the component reference. A free
documentation MCP server is available at `https://gitmcp.io/saadeghi/daisyui`. Blueprint is the
paid option, a rules enforcer and quality inspector for daisyUI markup:
https://daisyui.com/blueprint/.

## Report what is left

When stopping before production, list each placeholder still in the code and each piece unwired:
the `createGithubApp` values and the App itself, `GITHUB_APP_PRIVATE_KEY_B64`, `email.from`,
the seeded owner row, the `origin` constant and `PUBLIC_ORIGIN`, the admin mount and hooks, `AUTH_DB`
and its migrations, the `EMAIL` binding and domain.
