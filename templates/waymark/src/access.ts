import { defineAccess } from '@glw907/cairn-cms';

/**
 * This site's whole access declaration: which roles reach which admin screen or route. The same
 * object goes to both hook branches, `createAuthGuard` in production and the dev backend's own
 * handle under the opt-in dev build, because that handle replaces the guard rather than running
 * beside it. The map is attached under either branch, so `hasAccessRule`, `createSectionAction`'s
 * `access_map_not_attached` 500, and the nav's `hrefReachable` behave the same in dev and in
 * production. The dev backend mints an owner session, so a role-based refusal cannot be exercised
 * locally; only the attached-versus-absent map behaves identically.
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
