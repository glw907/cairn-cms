import { AdminActionError, createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { devBackendEnabled } from '$chassis/dev-gate';

// adminAction's own guards (see the SvelteKit reference's "Refusal channels") throw
// AdminActionError rather than one of SvelteKit's own recognized shapes, so an unhandled
// instance would otherwise surface as a generic 500 with no useful message. This does not
// change the transport status SvelteKit reports (still 500 for this channel); it shapes the
// message a site's own error page renders instead of the framework's generic "Internal Error".
// Any other error returns nothing, which leaves SvelteKit's own default error shape in place.
export const handleError: HandleServerError = ({ error }) => {
  if (error instanceof AdminActionError) {
    return { message: error.message };
  }
};

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
