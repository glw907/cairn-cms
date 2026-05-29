// Edit shim: loads one entry for editing and handles the save action.
// The [type] param maps to the concept id; [id] is the entry slug.
// The engine reads params.concept and params.id - see content-routes.ts conceptOf() and editLoad().
// However, this route uses [type] not [concept], so we must map type -> concept in params.
//
// Wait - the engine reads params.concept. This route uses [type] as the concept param.
// We need to adapt: wrap the load/action to alias params.type -> params.concept.
import { cairn } from '$lib/cairn.config.js';
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes, type ContentEvent } from '@glw907/cairn-cms/sveltekit';

const routes = createContentRoutes(composeRuntime(cairn), {
  mintToken: async () => 'dev-token',
});

// The engine's editLoad/saveAction read params.concept, but this route dir is [type].
// Alias type -> concept so the engine resolves the right concept.
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
