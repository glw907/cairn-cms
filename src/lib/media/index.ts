// cairn-cms: the node-safe `/media` public barrel. It re-exports only the pure media surface a site
// reaches outside the SvelteKit runtime: the config normalizer, the manifest functions, the naming
// and transform-URL helpers, the reference codec, and the render resolver. Nothing here pulls
// `@sveltejs/kit` or `@cloudflare/workers-types` into the module graph, so a plain-Node tool or a
// build step can import it. The R2-touching pieces (`store.ts`, `delivery-bucket.ts`) and the
// delivery-route factory and `requireBucket` stay on `/sveltekit`, off this surface, so the public
// `.d.ts` for `/media` names no kit or workers-types type.
export { normalizeAssets, type ResolvedAssetConfig } from './config.js';
export {
  parseMediaManifest,
  findByHash,
  upsertMediaEntry,
  serializeMediaManifest,
  parseMediaEntries,
  type MediaEntry,
  type MediaManifest,
} from './manifest.js';
export { hashBytes, shortHash, slugifyFilename, r2Key, publicPath } from './naming.js';
export { presetUrl, variantUrl, type VariantSpec } from './transform-url.js';
export { parseMediaToken, mediaToken, type MediaRef } from './reference.js';
export { makeMediaResolver, manifestMediaResolver, type MediaResolve } from '../render/resolve-media.js';
