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

Activate the backend from your `hooks.server.ts`, behind the build-foldable `dev` flag and an
explicit opt-in. Import it dynamically so a production build drops it:

```ts
import { dev } from '$app/environment';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit';

let handle: Handle;
if (dev && process.env.CAIRN_DEV_BACKEND === '1') {
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

1. The build-foldable `dev` gate. `dev` from `$app/environment` is `false` in a production build, so
   the `if (dev && ...)` branch and its dynamic `import()` fold away under dead-code elimination, and
   the deployed bundle holds no dev-backend code. Gate every import from this package the same way:
   the package re-exports its whole surface from one module, so a single static `import` pulls the
   bypass into the build. Verify a release by grepping the built output for a bypass string such as
   `installFakeGitHub`.
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
