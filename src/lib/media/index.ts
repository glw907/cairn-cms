// cairn-cms: the node-safe `/media` public barrel. It re-exports only the proven site surface: the
// config normalizer, reading the committed manifest, the `media:` reference codec, and the render
// resolver. Nothing here pulls `@sveltejs/kit` or `@cloudflare/workers-types` into the module graph,
// so a plain-Node tool or a build step can import it. The manifest CRUD, the hashing and naming
// helpers, the raw transform-URL builders, and the preview-only resolver are the engine's own
// ingest/admin internals; every real caller reaches them by relative import, never through this
// barrel, so they stay in their modules unexported here. The R2-touching pieces (`store.ts`,
// `delivery-bucket.ts`) and the delivery-route factory and `requireBucket` stay on `/sveltekit`, off
// this surface, so the public `.d.ts` for `/media` names no kit or workers-types type.
export { normalizeAssets, type ResolvedAssetConfig } from './config.js';
export { readCommittedManifest, type MediaEntry, type MediaManifest } from './manifest.js';
export type { VariantSpec } from './transform-url.js';
export { parseMediaToken, mediaToken, type MediaRef } from './reference.js';
export { makeMediaResolver, type MediaResolve } from '../render/resolve-media.js';
