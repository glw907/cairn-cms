// Edit shim: loads one entry for editing and handles the save action. The editor is nested at
// /admin/[concept]/[id], the canonical path ConceptList links to and the save/new/error redirects
// target, so params.concept and params.id arrive natively and no aliasing is needed.
import { cairn } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime(cairn), {
  mintToken: async () => 'dev-token',
});

export const load = routes.editLoad;
export const actions = { save: routes.saveAction };
