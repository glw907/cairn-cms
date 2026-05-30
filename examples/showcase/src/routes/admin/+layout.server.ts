// Admin layout shim: delegates to the engine's layoutLoad for site identity, user, and nav.
// The deps inject a dummy token mint so no real GitHub App key is needed in dev.
import { cairn } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime(cairn), {
  mintToken: async () => 'dev-token',
});

export const load = routes.layoutLoad;
