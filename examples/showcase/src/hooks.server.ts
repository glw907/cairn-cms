import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { devBackendEnabled } from '$chassis/dev-gate';

// No handleError hook: adminAction's own authorization refusals (see the SvelteKit reference's
// "Refusal channels") throw SvelteKit's own redirect()/error() now, which SvelteKit already
// renders correctly with no site mapping, so this hook has nothing left to do. SvelteKit's
// default handleError (a console.error of every server error) stays in place instead.

// The dev backend activates only behind devBackendEnabled, a build-foldable gate (see
// $chassis/dev-gate.ts): a default `npm run build` folds this branch away, and its dynamic import,
// keeping the dev package out of the deployable bundle (the build/ grep gates this). The package
// is a devDependency, absent under `npm ci --omit=dev`, so even a forced import throws in
// production. The engine guard carries a fail-closed tripwire if the flag is ever set in a
// deployed runtime.
let handle: Handle;
if (devBackendEnabled) {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle();
} else {
  handle = createAuthGuard();
}

export { handle };
