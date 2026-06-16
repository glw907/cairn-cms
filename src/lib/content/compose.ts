// cairn-cms: composition aggregation (seam 2). One place folds the adapter and any
// extensions into the runtime the engine serves from. A future `CairnExtension` folds in
// the same way and contributes the same kinds of things: nav entries, route logic,
// concepts, components, field types, and save hooks. Shaped now so the extension contract
// is additive later.
import type { AdminPanel, CairnAdapter, CairnExtension, CairnRuntime, ConceptConfig, FieldTypeDef } from './types.js';
import { resolveConcepts } from './concepts.js';
import { normalizeAssets } from '../media/config.js';
import type { SiteConfig } from '../nav/site-config.js';

/** The input to {@link composeRuntime}. `siteConfig` is required so the per-concept URL policy is
 *  always derived from one source and can never be silently dropped. `extensions` fold in after the
 *  adapter's concepts. */
export interface ComposeInput {
  adapter: CairnAdapter;
  siteConfig: SiteConfig;
  extensions?: CairnExtension[];
}

/**
 * Fold an adapter and any extensions into the composed runtime (seam 2). The per-concept URL policy
 * is derived from the site config, the same source the delivery path uses, so the runtime and
 * delivery permalinks cannot diverge. Extension concepts merge after the adapter's. The asset slot
 * (seam 4) passes through untouched.
 */
export function composeRuntime({ adapter, siteConfig, extensions = [] }: ComposeInput): CairnRuntime {
  if (!siteConfig) throw new Error('composeRuntime needs a site config to derive the URL policy');
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
    concepts: resolveConcepts(content, siteConfig),
    backend: adapter.backend,
    sender: adapter.sender,
    render: adapter.render,
    manifestPath: adapter.manifestPath ?? 'src/content/.cairn/index.json',
    registry: adapter.registry,
    icons: adapter.icons,
    navMenu: adapter.navMenu,
    preview: adapter.preview,
    assets: adapter.assets,
    resolvedAssets: normalizeAssets(adapter.assets),
    mediaManifestPath: adapter.mediaManifestPath ?? 'src/content/.cairn/media.json',
    adminPanels,
    fieldTypes,
  };
}
