// cairn-cms: composition aggregation. One place folds the adapter into the runtime the engine
// serves from.
import type { CairnAdapter, CairnRuntime } from './types.js';
import { normalizeConcepts } from './concepts.js';
import { normalizeMedia } from '../media/config.js';
import { DEFAULT_DICTIONARY_FILE, readVocabulary, type SiteConfig } from '../nav/site-config.js';
import { validateAccessRoles } from '../auth/access.js';

// The internal artifact paths the adapter does not carry. They share the `.cairn/` content root the
// manifests use, so `composeRuntime` defaults them by convention rather than reading them off config.
// The personal dictionary sits beside the manifests, so the spec's `content/.cairn/dictionary.txt`
// resolves the same configurable way the manifest paths do.
const CONTENT_MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_MANIFEST_PATH = 'src/content/.cairn/media.json';
const DICTIONARY_PATH = 'src/content/.cairn/dictionary.txt';

// The site-config path a scaffolded site uses. The scaffold bakes this path and the Go doctor embeds
// it, from scripts/build/site-config-path.json; the engine cannot read that file
// at runtime, so this is a committed twin that a unit test pins to it.
export const DEFAULT_SITE_CONFIG_PATH = 'src/theme/site.config.yaml';

// The in-admin help's fallback hand-off when a site sets no support contact of its own: cairn's
// hosted editor help. An explicit `editor.supportContact` still wins.
const DEFAULT_SUPPORT_CONTACT = 'https://cairn.pub/help';

/**
 * The input to {@link composeRuntime}. `siteConfig` is required: it is the canonical home for the
 *  site name and the tidy block, so they can never be silently dropped.
 * @public
 */
export interface ComposeInput {
  adapter: CairnAdapter;
  siteConfig: SiteConfig;
}

/**
 * Fold an adapter into the composed runtime. This is the one place the grouped adapter maps onto
 * the flat runtime, and the one place the internal manifest and dictionary paths default by
 * convention. Each concept declares its routing and URL policy, so the runtime and delivery
 * permalinks cannot diverge. The media slot (seam 4) passes through untouched. Throws when an
 * access rule names a role the adapter's vocabulary does not declare.
 * @scaffold
 */
export function composeRuntime({ adapter, siteConfig }: ComposeInput): CairnRuntime {
  if (!siteConfig) throw new Error('cairn: composeRuntime needs a site config for the site name and editor settings');
  // Every reader of the access map (the guard, the dev handle, the admin routes, the nav) takes
  // this runtime, so checking the map's roles here covers them all at module evaluation.
  if (adapter.access) validateAccessRoles(adapter.access, adapter.roles);
  return {
    siteName: siteConfig.siteName,
    concepts: normalizeConcepts(adapter.content),
    roles: adapter.roles,
    access: adapter.access,
    backend: adapter.backend,
    email: adapter.email,
    supportContact: adapter.editor?.supportContact ?? DEFAULT_SUPPORT_CONTACT,
    manifestPath: CONTENT_MANIFEST_PATH,
    navMenu: adapter.editor?.nav,
    siteConfigPath: DEFAULT_SITE_CONFIG_PATH,
    navLayout: adapter.editor?.navLayout,
    publishActions: adapter.editor?.publishActions,
    preview: adapter.editor?.preview,
    media: normalizeMedia(adapter.media),
    mediaManifestPath: MEDIA_MANIFEST_PATH,
    dictionaryPath: DICTIONARY_PATH,
    // The editor resolves this filename to a real asset URL on the main thread.
    spellcheckDictionary: DEFAULT_DICTIONARY_FILE,
    // The tidy block passes through from the site config; the tidy action reads enabled/model at call
    // time and builds its prompt from conventions. Absent means tidy is off.
    tidy: siteConfig.tidy,
    // The tag vocabulary is validated and threaded once here from the site config, so the taxonomy
    // enforcement seam reads it from the deployed runtime snapshot. A malformed vocabulary throws and
    // fails the build; an absent key resolves to an empty list (enforcement stays opt-in).
    vocabulary: readVocabulary(siteConfig),
  };
}
