import { defineAccess } from '@glw907/cairn-cms';

/**
 * This site's whole access declaration: which roles reach which admin screen or route. The same
 * object goes to both hook branches, `createAuthGuard` in production and `devBackendHandle` under
 * the dev backend, because the dev handle replaces the guard rather than running beside it. One
 * declaration read by both keeps a route's authorization identical in local development and in
 * production, so a screen that refuses a role in one refuses it in the other.
 *
 * The custom Signups screen is owner-only. Its load gate and its form actions both resolve against
 * this rule, and an owner-only list is written out as `['owner']` because `defineAccess` refuses an
 * empty one. The first argument is the site's role vocabulary; `undefined` takes the built-in
 * owner/editor roles, which is what a site declaring none of its own gets.
 */
export const access = defineAccess(undefined, {
  '/admin/signups': ['owner'],
});
