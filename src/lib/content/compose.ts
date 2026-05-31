// cairn-cms: composition aggregation (seam 2). One place folds the adapter and any
// extensions into the runtime the engine serves from. A future `CairnExtension` folds in
// the same way and contributes the same kinds of things: nav entries, route logic,
// concepts, components, field types, and save hooks. Shaped now so the extension contract
// is additive later.
import type { AdminPanel, CairnAdapter, CairnExtension, CairnRuntime, ConceptConfig, ConceptUrlPolicy, FieldTypeDef } from './types.js';
import { normalizeConcepts } from './concepts.js';

/**
 * Fold an adapter and any extensions into the composed runtime (seam 2). Extension concepts
 * merge after the adapter's. The asset slot (seam 4) passes through untouched.
 */
export function composeRuntime(
  adapter: CairnAdapter,
  extensions: CairnExtension[] = [],
  urlPolicy: Record<string, ConceptUrlPolicy | undefined> = {},
): CairnRuntime {
  const content: Record<string, ConceptConfig | undefined> = { ...adapter.content };
  const adminPanels: AdminPanel[] = [];
  const fieldTypes: FieldTypeDef[] = [];
  for (const extension of extensions) {
    // An extension adds concepts; a key that collides with the adapter is last-write-wins.
    // Reserved seam, unused today, so the collision policy is deliberately left simple.
    if (extension.content) Object.assign(content, extension.content);
    if (extension.adminPanels) adminPanels.push(...extension.adminPanels);
    if (extension.fieldTypes) fieldTypes.push(...extension.fieldTypes);
  }
  return {
    siteName: adapter.siteName,
    concepts: normalizeConcepts(content, urlPolicy),
    backend: adapter.backend,
    sender: adapter.sender,
    render: adapter.render,
    registry: adapter.registry,
    navMenu: adapter.navMenu,
    assets: adapter.assets,
    adminPanels,
    fieldTypes,
  };
}
