// cairn-cms: composition aggregation. One place folds the adapter into the runtime the engine
// serves from.
import type { CairnAdapter, CairnRuntime } from './types.js';
import { normalizeConcepts } from './concepts.js';
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
 */
export interface ComposeInput {
  adapter: CairnAdapter;
  siteConfig: SiteConfig;
}

/**
 * Fold an adapter into the composed runtime. This is the one place the grouped adapter maps onto
 * the flat runtime, and the one place the internal manifest and dictionary paths default by
 * convention. Each concept declares its own routing and URL policy, so the runtime and delivery
 * permalinks cannot diverge. The media slot (seam 4) passes through untouched.
 */
export function composeRuntime({ adapter, siteConfig }: ComposeInput): CairnRuntime {
  if (!siteConfig) throw new Error('composeRuntime needs a site config for the site name and editor settings');
  return {
    siteName: siteConfig.siteName,
    concepts: normalizeConcepts(adapter.content),
    backend: adapter.backend,
    sender: adapter.email,
    supportContact: adapter.editor?.supportContact,
    render: adapter.rendering.render,
    manifestPath: CONTENT_MANIFEST_PATH,
    registry: adapter.rendering.components,
    icons: adapter.rendering.icons,
    navMenu: adapter.editor?.nav,
    adminNav: adapter.editor?.adminNav,
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
  };
}
