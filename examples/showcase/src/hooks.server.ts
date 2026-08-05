import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { devBackendOptIn } from '$chassis/dev-gate';

// No handleError hook: adminAction's own authorization refusals (see the SvelteKit reference's
// "Refusal channels") throw SvelteKit's own redirect()/error() now, which SvelteKit already
// renders correctly with no site mapping, so this hook has nothing left to do. SvelteKit's
// default handleError (a console.error of every server error) stays in place instead.

// The dev backend activates only behind __CAIRN_DEV_BUILD__, the Vite define this branch reads
// directly (see $chassis/dev-gate.ts): a default `npm run build` substitutes `false` here, so
// Rollup drops this branch and its dynamic import, keeping the dev package out of the deployable
// Worker (the e2e workflow greps `wrangler deploy --dry-run` output to prove it). The package is a
// devDependency, absent under `npm ci --omit=dev`, so even a forced import throws in production.
// The engine guard carries a fail-closed tripwire if the flag is ever set in a deployed runtime.
let handle: Handle;
if (__CAIRN_DEV_BUILD__ && devBackendOptIn()) {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle();
  // cairn-template:exclude-start
  // The showcase members fixture's own dev wiring, dynamically imported for the same reason as
  // devBackendHandle above: excluded from every scaffolded site, so this line and its import must
  // never become a static one. membersDevHandle runs SECOND, and the order is load-bearing:
  // devBackendHandle replaces event.platform outright on /admin and /media, so a MEMBER_DB merged
  // ahead of it would be thrown away on those paths. Running after, the merge layers onto whatever
  // platform is in hand, and neither handle clobbers the other.
  const { membersDevHandle } = await import('./members/dev-wiring.js');
  handle = sequence(handle, membersDevHandle);
  // cairn-template:exclude-end
} else {
  handle = createAuthGuard();
}

export { handle };
