// Concept list shim: lists entries and handles the new-entry create action.
import { cairn, siteConfig } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime({ adapter: cairn, siteConfig }), {
  mintToken: async () => 'dev-token',
});

export const load = routes.listLoad;
export const actions = { create: routes.createAction };
