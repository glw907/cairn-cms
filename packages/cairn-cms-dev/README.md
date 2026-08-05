# @glw907/cairn-cms-dev

The local-development backend for [cairn-cms](https://github.com/glw907/cairn-cms) sites. It stands
in for the GitHub App commit pipeline and the magic-link sign-in loop, so you can run a site's
`/admin` with no cloud accounts. You edit, save, and publish against in-memory doubles, signed in as
an owner.

Install it as a `devDependency`, and never in production. The package installs an authentication
bypass. `devBackendHandle()` mints an owner session with no email loop, and it also runs fake GitHub,
R2, D1, and Anthropic doubles. The bypass is an authentication breach if it reaches a deployed site,
so the package ships behind a three-layer fence and must stay out of every production install.

## Use it

Activate the backend from your `hooks.server.ts`, behind a build-time flag and an explicit runtime
opt-in. Declare the build-time flag as a Vite `define`, which substitutes it as a literal wherever
you name it:

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  define: { __CAIRN_DEV_BUILD__: JSON.stringify(command === 'serve') },
  plugins: [sveltekit()],
}));
```

Declare its type once, in `src/app.d.ts`:

```ts
declare global {
  const __CAIRN_DEV_BUILD__: boolean;
}
```

Then name it directly in the branch, and import the package dynamically:

```ts
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit';

let handle: Handle;
if (__CAIRN_DEV_BUILD__ && process.env.CAIRN_DEV_BACKEND === '1') {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle();
} else {
  handle = createAuthGuard();
}
export { handle };
```

Then start the dev server with the flag set:

```
CAIRN_DEV_BACKEND=1 npm run dev
```

Open `/admin`. The handle resolves an owner session and supplies the binding doubles on
`platform.env`, so the admin runs with no GitHub App and no D1.

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
   the request with a 503 and logs `guard.rejected` with `reason: "dev_backend_in_prod"`. A polluted
   environment fails closed.

## Two risk tiers

The package carries two kinds of fake, held to different bars. The owner-session bypass mints a
session with no email loop; in production it is an authentication breach, and it earns the strictest
fence. The GitHub, R2, D1, and Anthropic doubles only fake persistence; in production they degrade to
saves that do not persist. Never relax the bypass's fence by analogy to the harmless mock.
