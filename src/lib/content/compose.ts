// cairn-cms: composition aggregation (seam 2). One place folds the adapter and any
// extensions into the runtime the engine serves from. A future `CairnExtension` folds in
// the same way and contributes the same kinds of things: nav entries, route logic,
// concepts, components, field types, and save hooks. Shaped now so the extension contract
// is additive later.
import type { CairnAdapter, CairnExtension, CairnRuntime, ConceptConfig } from './types.js';
import { normalizeConcepts } from './concepts.js';

/**
 * Fold an adapter and any extensions into the composed runtime (seam 2). Extension concepts
 * merge after the adapter's. The asset slot (seam 4) passes through untouched.
 */
export function composeRuntime(
  adapter: CairnAdapter,
  extensions: CairnExtension[] = [],
): CairnRuntime {
  const content: Record<string, ConceptConfig | undefined> = { ...adapter.content };
  for (const extension of extensions) {
    if (extension.content) Object.assign(content, extension.content);
  }
  return {
    siteName: adapter.siteName,
    concepts: normalizeConcepts(content),
    backend: adapter.backend,
    sender: adapter.sender,
    renderPreview: adapter.renderPreview,
    registry: adapter.registry,
    navMenu: adapter.navMenu,
    assets: adapter.assets,
  };
}
