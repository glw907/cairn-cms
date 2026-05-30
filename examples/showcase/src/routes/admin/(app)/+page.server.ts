// Admin index shim: redirects to the first concept's list (spec 7.6).
import { cairn } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime(cairn), {
  mintToken: async () => 'dev-token',
});

export const load = routes.indexRedirect;
