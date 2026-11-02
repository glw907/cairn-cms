// cairn-cms: the `?error=` codes the magic-link flow redirects with, alone in a leaf module that
// imports nothing. A site compares `data.error` against these values, and a component reaching
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
 * The `?error=` code a confirm redirects with when the submitted token fails to confirm and this
 * browser carries no pending-login cookie, whatever the failure's cause (an empty token field is the exception and always redirects with `expired`): a token bound to another
 * browser's nonce, an expired, unknown, or already-used token all redirect with it when the cookie
 * is absent. A browser that carries a cookie gets `expired` on any failed confirm. The two codes
 * stay distinct on the wire, and the pages word them identically: one instruction fixes both.
 *
 * Exported so a component compares against this value rather than a duplicated string literal.
 * The wire format is the literal below, so a site rendering its login page may compare
 * `data.error` against it too.
 * @beta
 */
export const NO_PENDING_REQUEST_ERROR = 'no-pending-request';
