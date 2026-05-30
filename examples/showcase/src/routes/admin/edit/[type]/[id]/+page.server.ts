// Edit shim: loads one entry for editing and handles the save action.
// The [type] param maps to the concept id; [id] is the entry slug.
// The engine reads params.concept, but this route uses [type], so the shim aliases
// params.type -> params.concept before delegating to editLoad/saveAction.
import { cairn } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes, type ContentEvent } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime(cairn), {
  mintToken: async () => 'dev-token',
});

function withConceptAlias(event: ContentEvent): ContentEvent {
  return {
    ...event,
    params: { ...event.params, concept: event.params.type ?? '' },
  };
}

export async function load(event: ContentEvent) {
  return routes.editLoad(withConceptAlias(event));
}

export const actions = {
  save: (event: ContentEvent) => routes.saveAction(withConceptAlias(event)),
};
