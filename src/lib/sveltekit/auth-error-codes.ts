// cairn-cms: the `?error=` codes the magic-link flow redirects with, alone in a leaf module that
// imports nothing. `LoginPage` and `ConfirmPage` branch on these values, and a component reaching
// for one must not drag `auth-routes.ts`'s server graph (`@sveltejs/kit`, the D1 store, the email
// sender) toward a client bundle to get it. The package's `sideEffects` list covers `.svelte`,
// `.css`, and each subpath's `browser.js`, so a plain `.ts` module is side-effect-free and a
// bundler can drop an unused one either way; this module makes that independent of the bundler's
// tree-shaking rather than reliant on it.
//
// `auth-routes.ts` re-exports what it needs, so `/sveltekit` stays the one publishing subpath and
// every existing import keeps resolving (the canonical-home rule is about the subpath, not the
// declaring file).

/**
 * The `?error=` code a confirm redirects with when this browser carries no pending-login cookie
 * and the token row it submitted is bound to some other browser's nonce, deliberately distinct
 * from `expired`. The two need different instructions: "request a new one" is the exact advice
 * that reproduces the failure for someone clicking on a second device.
 *
 * Exported so `LoginPage` and `ConfirmPage` branch on this value rather than on a duplicated
 * string literal. The wire format is the literal below, so a site rendering its own login page
 * may compare `data.error` against it too.
 */
export const NO_PENDING_REQUEST_ERROR = 'no-pending-request';
