// cairn-cms: the adapter-authoring helper. A plain `const adapter: CairnAdapter = {...}` annotation
// widens each concept's schema type away and breaks typed reads. defineAdapter captures the adapter
// through a `const` type parameter, so each concept's concrete ConceptSchema<F> survives for the
// full-auto typed reads in createSiteIndexes, while still checking the adapter against the contract.
import type { CairnAdapter } from './types.js';

/** Declare a site's adapter while preserving each concept's concrete schema type for typed reads. */
export function defineAdapter<const A extends CairnAdapter>(adapter: A): A {
  return adapter;
}
