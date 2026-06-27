// cairn-cms: composition aggregation (seam 2). One place folds the adapter and any
// extensions into the runtime the engine serves from. A future `CairnExtension` folds in
// the same way and contributes the same kinds of things: nav entries, route logic,
// concepts, components, field types, and save hooks. Shaped now so the extension contract
// is additive later.
import type { AdminPanel, CairnAdapter, CairnExtension, CairnRuntime, ConceptConfig, FieldTypeDef } from './types.js';
import { resolveConcepts } from './concepts.js';
import { normalizeAssets } from '../media/config.js';
import { dictionaryFileForDialect, type SiteConfig } from '../nav/site-config.js';

// The internal artifact paths the adapter does not carry. They share the `.cairn/` content root the
// manifests use, so `composeRuntime` defaults them by convention rather than reading them off config.
// The personal dictionary sits beside the manifests, so the spec's `content/.cairn/dictionary.txt`
// resolves the same configurable way the manifest paths do.
const CONTENT_MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_MANIFEST_PATH = 'src/content/.cairn/media.json';
const DICTIONARY_PATH = 'src/content/.cairn/dictionary.txt';

/**
 * The input to {@link composeRuntime}. `siteConfig` is required: it is the canonical home for the
 *  site name, the spellcheck dialect, and the tidy block, so they can never be silently dropped.
 *  `extensions` fold in after the adapter's concepts.
 */
export interface ComposeInput {
  adapter: CairnAdapter;
  siteConfig: SiteConfig;
  extensions?: CairnExtension[];
}

/**
 * Fold an adapter and any extensions into the composed runtime (seam 2). This is the one place the
 * grouped adapter maps onto the flat runtime, and the one place the internal manifest and dictionary
 * paths default by convention. Each concept declares its own routing and URL policy, so the runtime
 * and delivery permalinks cannot diverge. Extension concepts merge after the adapter's. The media slot
 * (seam 4) passes through untouched.
 */
export function composeRuntime({ adapter, siteConfig, extensions = [] }: ComposeInput): CairnRuntime {
  if (!siteConfig) throw new Error('composeRuntime needs a site config for the site name and editor settings');
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
    siteName: siteConfig.siteName,
    concepts: resolveConcepts(content),
    backend: adapter.backend,
    sender: adapter.email,
    supportContact: adapter.editor?.supportContact,
    render: adapter.rendering.render,
    manifestPath: CONTENT_MANIFEST_PATH,
    registry: adapter.rendering.components,
    icons: adapter.rendering.icons,
    navMenu: adapter.editor?.nav,
    preview: adapter.editor?.preview,
    assets: adapter.media,
    resolvedAssets: normalizeAssets(adapter.media),
    mediaManifestPath: MEDIA_MANIFEST_PATH,
    dictionaryPath: DICTIONARY_PATH,
    // The spellcheck dictionary is resolved once here from the site config's dialect (default US),
    // so the runtime and the editor never re-derive it. The site config is the one home for the
    // dialect; the editor resolves this filename to a real asset URL on the main thread.
    spellcheckDictionary: dictionaryFileForDialect(siteConfig.spellcheck?.dialect),
    // The tidy block passes through from the site config; the tidy action reads enabled/model at call
    // time and builds its prompt from conventions. Absent means tidy is off.
    tidy: siteConfig.tidy,
    adminPanels,
    fieldTypes,
  };
}
