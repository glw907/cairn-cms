// src/lib/extend/index.ts
// THE developer-extensibility public contract. Everything a customization depends on is re-exported
// here and ONLY here; cairn refactors every internal behind this barrel. This surface is versioned and
// locks at 1.0 (see the extensibility spec). Phase 1 ships identity; phase 2 adds the admin shell.
export { loadPrincipal, requireScope, requireAnyScope } from '../sveltekit/scope-guards.js';
export { hasScope } from '../auth/scopes.js';
export { sendMagicLink, confirmMagicLink } from '../sveltekit/auth-routes.js';
// signIn is server-only (an account-takeover primitive): re-export from the .server. module, never
// from auth-routes.js, so a client import remains a SvelteKit build error. See Task 8 Step 6.
export { signIn } from '../sveltekit/auth-routes.server.js';
export { forgetPrincipal } from '../auth/store.js';
export type { Principal, AuthTier } from '../auth/types.js';
export type { Authorize } from '../auth/authorize.js';
