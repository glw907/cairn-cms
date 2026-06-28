// cairn-cms: the adapter-authoring helper. A plain `const adapter: CairnAdapter = {...}` annotation
// widens each concept's schema type away and breaks typed reads. defineAdapter captures the adapter
// through a `const` type parameter, so each concept's concrete ConceptSchema<F> survives for the
// full-auto typed reads in createSiteIndexes, while still checking the adapter against the contract.
import type { CairnAdapter } from './types.js';

// Fail closed on an inconsistent island registry: a hydrate component with no live component, or a
// registered island with no hydrate component. Either is a wiring mistake the site author should see at
// build time, not a silent forever-fallback. Read-only over the rendering group; imports no runtime.
function assertIslandsConsistent(rendering: CairnAdapter['rendering']): void {
  const islands = rendering.islands ?? {};
  const hydrated = new Set(
    (rendering.components?.defs ?? []).filter((d) => d.hydrate).map((d) => d.name),
  );
  for (const name of hydrated) {
    if (!(name in islands)) {
      throw new Error(`cairn: component '${name}' declares hydrate but rendering.islands has no entry for it.`);
    }
  }
  for (const name of Object.keys(islands)) {
    if (!hydrated.has(name)) {
      throw new Error(`cairn: rendering.islands has '${name}' but no component declares hydrate for it.`);
    }
  }
}

/** Declare a site's adapter while preserving each concept's concrete schema type for typed reads. */
export function defineAdapter<const A extends CairnAdapter>(adapter: A): A {
  assertIslandsConsistent(adapter.rendering);
  return adapter;
}
