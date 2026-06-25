import { dev } from '$app/environment';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit';

// The dev backend activates only behind a build-foldable gate (a dev build, or the e2e's build
// that sets VITE_CAIRN_E2E=1) AND with CAIRN_DEV_BACKEND=1. Both `dev` and `import.meta.env`
// fold at build time, so a default `npm run build` leaves the term false, eliminates this branch
// and its dynamic import, and keeps the dev package out of the deployable bundle (the build/ grep
// gates this). The package is a devDependency, absent under `npm ci --omit=dev`, so even a forced
// import throws in production. The engine guard carries a fail-closed tripwire if the flag is ever
// set in a deployed runtime.
let handle: Handle;
if ((dev || import.meta.env.VITE_CAIRN_E2E === '1') && process.env.CAIRN_DEV_BACKEND === '1') {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle();
} else {
  handle = createAuthGuard();
}

export { handle };
