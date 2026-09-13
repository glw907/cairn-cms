import { defineAccess } from '@glw907/cairn-cms';

/**
 * This site's whole access declaration: which roles reach which admin screen or route. The same
 * object goes to both hook branches, `createAuthGuard` in production and the dev backend's own
 * handle under the opt-in dev build, because that handle replaces the guard rather than running
 * beside it. One declaration read by both keeps a route's authorization identical in local
 * development and in production, so a screen that refuses a role in one refuses it in the other.
 *
 * This module is live in the DEFAULT build, so its comments ride into the deployable Worker's
 * sourcemap. Describe the dev branch here, never name its package or its exported handle: the
 * dev-fold tripwire greps the deploy artifact for those literal names, and a mention alone fails
 * it. The fence itself lives in hooks.server.ts.
 *
 * The custom Signups screen is owner-only. Its load gate and its form actions both resolve against
 * this rule, and an owner-only list is written out as `['owner']` because `defineAccess` refuses an
 * empty one. The first argument is the site's role vocabulary; `undefined` takes the built-in
 * owner/editor roles, which is what a site declaring none of its own gets.
 */
export const access = defineAccess(undefined, {
  '/admin/signups': ['owner'],
});
