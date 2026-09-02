# Media (`@glw907/cairn-cms/media`)

This subpath holds the node-safe media surface a site actually reaches into: the config normalizer,
reading the committed manifest, the `media:` reference codec, and the render-time resolver. All of
it is pure projection. Nothing here pulls `@sveltejs/kit` or `@cloudflare/workers-types` into the
module graph, so a plain-Node tool, a Vite build step, or a site's render path can import it. This
subpath carries node-safe pure projection over the media surface. The R2-touching pieces (the
object store and the delivery bucket seam), the `requireBucket` helper, and the `createMediaRoute`
delivery factory live on [`/sveltekit`](./sveltekit.md) instead, off this surface, so the public
type for `/media` names no kit or workers-types type. The manifest CRUD, the content-hash naming
helpers, and the Cloudflare Images transform-URL builders back the engine's own upload and preview
pipeline; every real caller reaches them by relative import, so they stay unexported internals
rather than public surface.

```ts
import { createMediaResolver, normalizeAssets } from '@glw907/cairn-cms/media';
```

A site reaches into this subpath to back its public render path with a media resolver: it reads the
committed `media.json`, normalizes the adapter's [`media` member](./core.md#media-adapter-member), and threads the resolver through
`render`, so a `media:` reference in published content rewrites to its delivery URL. The TypeScript
types in `src/lib/media` and `src/lib/render/resolve-media.ts` are the source of truth, and the
export-coverage gate checks every name here against them.

```ts
import { normalizeAssets, createMediaResolver } from '@glw907/cairn-cms/media';
import mediaManifest from '../content/.cairn/media.json';

// Hoist the media block once and pass the same object to normalizeAssets here and to the
// adapter's media: member in cairn.config.ts, so the binding name lives in exactly one place.
const media = { bucketBinding: 'MEDIA_BUCKET' };

const resolveMedia = createMediaResolver(mediaManifest, normalizeAssets(media));
```

---

## Config

### `normalizeAssets`

Stability tier: Extension API.

```ts
declare function normalizeAssets(assets: AssetConfig | undefined): ResolvedAssetConfig;
```

Validate a site's `AssetConfig` and resolve it into the engine-internal `ResolvedAssetConfig` the
upload, storage, delivery, and render paths read. An absent block leaves media off and returns
`{ enabled: false }` rather than throwing. A declared block must name its R2 bucket binding and
carry a known `urlForm`; each failure throws a `cairn:`-prefixed error. A site can't declare its
own named transform presets; the built-in `thumb`, `inline`, `card`, and `hero` presets are the
whole vocabulary. A site needing a size beyond the four built-ins builds a URL directly against
Cloudflare's `/cdn-cgi/image/<options>/<path>` transform-URL format;
cairn's own URL builder (`variantUrl`/`presetUrl`) is engine-internal, not public surface.

The engine normalizes the adapter's `media` block once at compose time and exposes the result as
`CairnRuntime.resolvedAssets`, which backs the engine's own upload, delivery, and admin paths. A
site building its own public render resolver should pass `normalizeAssets` the same object it
hands the adapter's `media:` member, not a re-typed literal, so the two normalizations agree.

---

## The committed manifest

The media manifest is a small git-committed record, one row per stored asset, keyed by the 16-hex
content-hash prefix. It carries the human layer the bytes cannot (display name, alt text, original
filename) and is the dedup lookup an ingest checks before storing.

### `readCommittedManifest`

Stability tier: Extension API.

```ts
declare function readCommittedManifest(globResult: Record<string, unknown>): MediaManifest;
```

Read the committed manifest from an `import.meta.glob` eager result, degrading a missing file to an
empty manifest. A static import of an absent `media.json` fails the Vite build before any runtime
degrade can run, so a fresh site can't build. A glob with no match returns `{}` instead of throwing.
The consumer passes `import.meta.glob('<path-to-media.json>', { eager: true, import: 'default' })`,
and this helper extracts the single matched value and parses it.

---

## The `media:` reference codec

A media reference is the logical handle content commits to git, keyed to a content-hash prefix so the
same bytes resolve no matter where they are stored or what they are named. The canonical form is
`media:<slug>.<hash>`, with the bare `media:<hash>` form also valid.

### `parseMediaToken`

Stability tier: Extension API.

```ts
declare function parseMediaToken(href: string): MediaRef | null;
```

Parse a `media:<slug>.<hash>` href (or the bare `media:<hash>` form), or `null` for any other href or
a malformed token.

### `formatMediaToken`

Stability tier: Extension API.

```ts
declare function formatMediaToken(ref: MediaRef): string;
```

Write the canonical `media:` token for a ref, the inverse of `parseMediaToken`, so a parse then write
round trip is stable.

---

## The render resolver

### `createMediaResolver`

Stability tier: Extension API.

```ts
declare function createMediaResolver(
  manifest: MediaManifest,
  resolved: ResolvedAssetConfig,
): MediaResolve;
```

Build the per-call media resolver, closing over the committed manifest and the resolved config. The
resolver looks a ref's content hash up in the manifest and builds the canonical delivery path from
the manifest entry's slug and ext, not the token's, so a rename never breaks the reference. It
returns the bare full-size path; the transformed variant srcset is the imageDetail side channel's
job, keyed off the asset's known width and the site's `assets.transformations` setting. It returns
`undefined` when media is off or no entry carries the hash. The `undefined` return is the
preview-miss backstop. A site threads the resolver through `render` via the `resolveMedia` option.

The resolved image also carries whatever layout and responsive-delivery detail the manifest and
config can honestly derive, with no new option to wire: a manifest entry's recorded `width`/`height`
land as intrinsic `width`/`height` attributes on the rendered `<img>` (reserving its aspect ratio and
avoiding a layout shift on load), and with the site's `assets.transformations` on and the width known,
the image also gets a `srcset` built from a small fixed width ladder through the variant-URL
mechanism, plus a `sizes` hint derived from the image's enclosing `:::figure` placement
role (`center`, `wide`, `full`; a bare image or an unplaced figure falls back to `100vw`). An asset
whose dimensions are unknown (the upload's client did not report them) or whose width is too small to
offer more than one honest srcset candidate gets none of that. The engine never substitutes a
guessed value. A raw external image (not a `media:` reference) is untouched either way; reserving
its layout is a template-level concern, since the engine has no dimensions to derive it from.

---

## Types

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `AssetConfig` | Extension API | `interface AssetConfig { bucketBinding; publicBase?; urlForm?; maxUploadBytes?; allowedTypes?; transformations? }` | A site's media configuration: the R2 bucket binding, the delivery base and URL form, and the upload limits. `normalizeAssets` resolves it into `ResolvedAssetConfig`. |
| `ResolvedAssetConfig` | Extension API | `type ResolvedAssetConfig = { enabled: false } \| { enabled: true; bucketBinding; publicBase; urlForm; maxUploadBytes; allowedTypes; transformations }` | The resolved media config the engine serves from. An absent `assets` block yields the `{ enabled: false }` variant; otherwise every field is filled from the `AssetConfig` or its default. |
| `MediaEntry` | Extension API | `interface MediaEntry { hash; sha256; slug; displayName; originalFilename; alt; ext; contentType; bytes; width; height; createdAt }` | One stored asset's row: its content hash, its human layer, and its byte and pixel facts. `width` and `height` are `null` when no dimensions are known. |
| `MediaManifest` | Extension API | `type MediaManifest = Record<string, MediaEntry>` | The whole stored-asset record, keyed by the 16-hex content-hash prefix. |
| `MediaRef` | Extension API | `interface MediaRef { slug: string \| null; hash: string }` | A resolved reference to a media asset by its content-hash prefix, with an optional display slug. |
| `MediaResolve` | Extension API | `type MediaResolve = (ref: MediaRef) => string \| undefined` | The per-call resolver `render` reads under `resolveMedia`. `undefined` is a preview miss; a resolver that throws is the build backstop. |
