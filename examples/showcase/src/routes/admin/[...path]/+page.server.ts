// The single-mount admin route: one catch-all serves every /admin view through the engine's
// load and actions. The composition (runtime, deps) lives in $lib/cairn.server.
import { admin } from '$lib/cairn.server.js';

// The admin must never be prerendered; a site that defaults to prerender=true would bake a
// build-time snapshot of a session-gated page.
export const prerender = false;

export const load = admin.load;
export const actions = admin.actions;
