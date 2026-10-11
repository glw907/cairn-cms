# @glw907/cairn-cms-dev

The local-development backend for [cairn-cms](https://github.com/glw907/cairn-cms) sites. It stands
in for the GitHub App commit pipeline and the magic-link sign-in loop, so you can run a site's
`/admin` with no cloud accounts. You edit, save, and publish against in-memory doubles, signed in as
an owner.

Install it as a `devDependency`, and never in production. The package installs an authentication
bypass. `devBackendHandle({ runtime })` mints an owner session with no email loop, and it also runs fake GitHub,
R2, D1, and Anthropic doubles. The bypass is an authentication breach if it reaches a deployed site,
so the package ships behind a three-layer fence and must stay out of every production install.

## Use it

Activate the backend from your `hooks.server.ts`, behind a build-time flag and an explicit runtime
opt-in. The `cairnManifest()` plugin in your `vite.config.ts` defines the build-time flag,
`__CAIRN_DEV_BUILD__`, as a literal: `true` under `vite dev` and in a build that sets
`VITE_CAIRN_E2E=1`, and `false` in a default build. Importing `@glw907/cairn-cms/ambient` in your
`src/app.d.ts` declares its type. Name the flag directly in the branch, and import the package
dynamically:

```ts
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit/hooks';
import { runtime } from '#chassis/cairn.server.js';

let handle: Handle;
if (__CAIRN_DEV_BUILD__ && process.env.CAIRN_DEV_BACKEND === '1') {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle({ runtime });
} else {
  handle = createAuthGuard({ runtime });
}
export { handle };
```

Add the package to `ssr.noExternal` in your `vite.config.ts`, beside the engine, so `vite dev` processes it. It ships built JavaScript that imports `cloudflare:workers`, a scheme Node's own loader rejects:

```ts
ssr: { noExternal: ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'] },
```

Then start the dev server with the flag set:

```
CAIRN_DEV_BACKEND=1 npm run dev
```

Open `/admin`. The handle resolves an owner session and layers the binding doubles over
the Worker env with `withEnv`, so the admin runs with no GitHub App and no D1.

## Choose the content

`devBackendHandle` takes a `content` option that picks what the dev admin serves.

| `content` | What the admin serves |
| --- | --- |
| `'repository'` (the default) | Your site's own files. Each branch is an in-memory overlay over the working tree. |
| `'fixtures'` | The package's seeded in-memory repo: sample posts, media, fragments, and a tag vocabulary. |

In `'repository'` mode a read answers the overlay first and the disk second, so the admin lists the
entries in your `src/content`, your manifest, your site config, and your media record. A save,
delete, rename, publish, Settings save, nav save, or media upload writes only the overlay, so
nothing reaches disk and a restart drops every edit. The admin says so in one persistent notice:
"Edits are held in memory. They're discarded when the dev server stops." An edit you make to a file
on disk shows on the next request, unless the dev admin has already written that file, in which case
the admin's copy wins until the dev server restarts.

The limits:

- The mode reads the filesystem, so it throws under `wrangler dev`, whose workerd has none. Pass
  `content: 'fixtures'` for a `wrangler dev` session, which is also what a site's end-to-end suite
  that asserts seeded content wants.
- Uploaded media bytes land in the in-memory R2 double, not your local R2, so a thumbnail for a file
  you uploaded before the restart is gone after it.
- Paths resolve against `process.cwd()`, so start the dev server from the site's root.

## The fence

Three independent layers keep the bypass out of production. The bypass ships only if all three fail.

1. The build-time gate. A default production build substitutes `false` for `__CAIRN_DEV_BUILD__` in
   the text of every branch that names it, so Rollup drops the branch with its dynamic `import()`
   and the deployed bundle holds no dev-backend code. Name the define at each call site. A shared
   `export const` read from a helper module does not work: SvelteKit's SSR build folds the constant
   inside its own chunk but does not propagate the value across the module boundary, so the
   consuming chunk keeps the branch and this package rides into the deployed Worker. Gate every
   import from this package the same way: the package re-exports its whole surface from one module,
   so a single static `import` pulls the bypass into the build. Verify a release by grepping the
   artifact Cloudflare actually receives, which `wrangler deploy --dry-run --outdir=<dir>` writes,
   for a bypass string such as `createDevBackend` or `devBackendHandle`.
2. The `devDependency` boundary. A production install with `npm ci --omit=dev` skips the package, so a
   forced import throws at runtime instead of bypassing.
3. The engine tripwire. If `CAIRN_DEV_BACKEND` reaches a deployed runtime, cairn's auth guard refuses
   the request with a 503 and logs `guard.refused` with `reason: "dev_backend_in_prod"`. A polluted
   environment fails closed. A build that folded the dev backend in mounts `devBackendHandle` in
   place of the guard, so the handle carries the same refusal: with the flag set, a request to a
   non-local host gets the same 503 and the same log record.

## Two risk tiers

The package carries two kinds of fake, held to different bars. The owner-session bypass mints a
session with no email loop; in production it is an authentication breach, and it earns the strictest
fence. The GitHub, R2, D1, and Anthropic doubles only fake persistence; in production they degrade to
saves that do not persist. Never relax the bypass's fence by analogy to the harmless mock.
