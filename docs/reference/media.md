# Media (`@glw907/cairn-cms/media`)

This subpath holds the node-safe media surface: the config normalizer, the committed manifest
functions, the content-addressed naming helpers, the Cloudflare Images transform-URL builders, the
`media:` reference codec, and the render-time resolver. All of it is pure projection. Nothing here
pulls `@sveltejs/kit` or `@cloudflare/workers-types` into the module graph, so a plain-Node tool, a
Vite build step, or a site's render path can import it. The R2-touching pieces (the object store and
the delivery bucket seam), the `requireBucket` helper, and the `createMediaRoute` delivery factory
live on [`/sveltekit`](./sveltekit.md) instead, off this surface, so the public type for `/media`
names no kit or workers-types type.

```ts
import { makeMediaResolver, normalizeAssets } from '@glw907/cairn-cms/media';
```

A site reaches into this subpath to back its public render path with a media resolver: it reads the
committed `media.json`, normalizes its adapter `assets` block, and threads the resolver through
`render`, so a `media:` reference in published content rewrites to its delivery URL. The TypeScript
types in `src/lib/media` and `src/lib/render/resolve-media.ts` are the source of truth, and the
export-coverage gate checks every name here against them.

```ts
import { normalizeAssets, makeMediaResolver } from '@glw907/cairn-cms/media';
import mediaManifest from '../content/.cairn/media.json';

const resolveMedia = makeMediaResolver(mediaManifest, normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' }));
```

---

## Config

### `normalizeAssets`

```ts
declare function normalizeAssets(assets: AssetConfig | undefined): ResolvedAssetConfig;
```

Validate a site's `AssetConfig` and resolve it into the engine-internal `ResolvedAssetConfig` the
upload, storage, delivery, and render paths read. An absent block leaves media off and returns
`{ enabled: false }` rather than throwing. A declared block must name its R2 bucket binding and carry
a known `urlForm` and valid variant fit and gravity values; each failure throws a `cairn:`-prefixed
error. The named variants merge over the built-in presets.

---

## The committed manifest

The media manifest is a small git-committed record, one row per stored asset, keyed by the 16-hex
content-hash prefix. It carries the human layer the bytes cannot (display name, alt text, original
filename) and is the dedup lookup an ingest checks before storing.

### `parseMediaManifest`

```ts
declare function parseMediaManifest(json: unknown): MediaManifest;
```

Parse a committed manifest. Tolerant: an empty, missing, null, or non-object input yields an empty
manifest, so a first ingest into a site with no manifest file reads a clean `{}`.

### `readCommittedManifest`

```ts
declare function readCommittedManifest(globResult: Record<string, unknown>): MediaManifest;
```

Read the committed manifest from an `import.meta.glob` eager result, degrading a missing file to an
empty manifest. A static import of an absent `media.json` fails the Vite build before any runtime
degrade can run, so a fresh site can't build. A glob with no match returns `{}` instead of throwing.
The consumer passes `import.meta.glob('<path-to-media.json>', { eager: true, import: 'default' })`,
and this helper extracts the single matched value and parses it.

### `parseMediaEntries`

```ts
declare function parseMediaEntries(value: unknown): MediaEntry[];
```

Parse the posted `media` field, the editor's optimistic records, into a validated list of
`MediaEntry` rows. The field arrives as a JSON string, an already-parsed array, or junk; a failing
element is dropped so a partly malformed post still lands its good rows. This is the trust boundary
for the client's optimistic records.

### `findByHash`

```ts
declare function findByHash(manifest: MediaManifest, hash: string): MediaEntry | undefined;
```

The dedup lookup: the entry stored under the content-hash prefix, or `undefined` when no bytes with
that hash are stored yet.

### `upsertMediaEntry`

```ts
declare function upsertMediaEntry(manifest: MediaManifest, entry: MediaEntry): MediaManifest;
```

Set the entry under its own hash, replacing any same-hash row, and return a new manifest. The input
is left untouched, so a caller's prior manifest reference stays valid.

### `removeMediaEntry`

```ts
declare function removeMediaEntry(manifest: MediaManifest, hash: string): MediaManifest;
```

Drop the entry under the given hash and return a new manifest. Removing an absent hash is a no-op
that still returns an equivalent new manifest, and the input is left untouched.

### `serializeMediaManifest`

```ts
declare function serializeMediaManifest(manifest: MediaManifest): string;
```

Serialize canonically: the top-level hash keys sorted ascending, two-space pretty, and a trailing
newline, so the committed file diffs cleanly and a re-serialization is byte-identical.

---

## Content-addressed naming

Media is content-addressed: the sha256 of the bytes names the object, so identical bytes always land
at the same key no matter the original filename.

### `hashBytes`

```ts
declare function hashBytes(bytes: Uint8Array<ArrayBufferLike>): Promise<string>;
```

The full lowercase hex sha256 of the bytes, via Web Crypto, hand-formatted to 64 hex characters.

### `shortHash`

```ts
declare function shortHash(full: string): string;
```

The first 16 characters of a full hex digest, the content-hash prefix a media reference commits to.

### `slugifyFilename`

```ts
declare function slugifyFilename(name: string): string;
```

The strict ingest transform from a raw filename to a slug that satisfies the `media:` slug grammar,
or the literal `file`. It drops the extension, lowercases, transliterates accents, collapses
non-alphanumeric runs to a single hyphen, caps at 80 characters, screens Windows reserved names, and
appends `-img` to a slug that would otherwise collide with the bare-hash reference form.

### `r2Key`

```ts
declare function r2Key(shortHash: string, ext: string): string;
```

The content-addressed R2 object key `media/<aa>/<shortHash>.<ext>`, fanned out on the first two hex
characters of the short hash. It throws on a non-hex hash or a non-alphanumeric extension, so an
unvalidated path never reaches R2.

### `publicPath`

```ts
declare function publicPath(
  slug: string | null,
  shortHash: string,
  ext: string,
  urlForm: "slug" | "opaque",
  publicBase?: string,
): string;
```

The public delivery URL path under the delivery base (`publicBase`, default `/media`). The `slug`
form is human-readable; the `opaque` form mirrors the R2 fan-out and ignores the slug.

---

## Cloudflare Images transform URLs

A variant URL prefixes a delivery path with `/cdn-cgi/image/<options>/`, the on-demand resize and
format directives Cloudflare reads at the edge.

### `variantUrl`

```ts
declare function variantUrl(publicPath: string, spec: VariantSpec): string;
```

Build the on-demand transform URL for a delivery path from a `VariantSpec`. The options are
comma-joined in a stable order, so the same spec always builds the same URL and a CDN cache keys on
it cleanly.

### `presetUrl`

```ts
declare function presetUrl(publicPath: string, presetName: string, variants: Record<string, VariantSpec>): string;
```

Build a variant URL from a named preset. It looks `presetName` up in `variants` and throws a
`cairn:`-prefixed error naming the unknown preset when the name is absent, so a typo fails loudly
rather than silently rendering an unsized image.

---

## The `media:` reference codec

A media reference is the logical handle content commits to git, keyed to a content-hash prefix so the
same bytes resolve no matter where they are stored or what they are named. The canonical form is
`media:<slug>.<hash>`, with the bare `media:<hash>` form also valid.

### `parseMediaToken`

```ts
declare function parseMediaToken(href: string): MediaRef | null;
```

Parse a `media:<slug>.<hash>` href (or the bare `media:<hash>` form), or `null` for any other href or
a malformed token.

### `mediaToken`

```ts
declare function mediaToken(ref: MediaRef): string;
```

Write the canonical `media:` token for a ref, the inverse of `parseMediaToken`, so a parse then write
round trip is stable.

---

## The render resolver

### `makeMediaResolver`

```ts
declare function makeMediaResolver(
  manifest: MediaManifest,
  resolved: ResolvedAssetConfig,
  opts?: { preset?: string },
): MediaResolve;
```

Build the per-call media resolver, closing over the committed manifest and the resolved config. The
resolver looks a ref's content hash up in the manifest and builds the canonical delivery path from
the manifest entry's slug and ext, not the token's, so a rename never breaks the reference. With a
preset and zone transformations on it returns the variant URL; otherwise it returns the bare
full-size path. It returns `undefined` when media is off or no entry carries the hash, the
preview-miss backstop. A site threads the resolver through `render` via the `resolveMedia` option.

### `manifestMediaResolver`

```ts
declare function manifestMediaResolver(
  targets: Record<string, { slug: string; ext: string; contentType: string }>,
): MediaResolve;
```

Build a media resolver from the lean `mediaTargets` projection the edit load hands the admin
preview, keyed by the 16-hex content hash. A hash present in the projection builds the slug delivery
path (`/media/<slug>.<hash>.<ext>`); a miss returns `undefined`, so the render step marks the image
broken rather than throwing. It is the media analog of the content `manifestLinkResolver`: pure over
the projection, with no manifest and no config, so the edit page reaches it with the data it has.
The engine wires this for its own preview pane; a site does not call it directly.

---

## Types

| Name | Signature | Meaning |
| --- | --- | --- |
| `ResolvedAssetConfig` | `type ResolvedAssetConfig = { enabled: false } \| { enabled: true; bucketBinding; publicBase; urlForm; maxUploadBytes; allowedTypes; variants; transformations }` | The resolved media config the engine serves from. An absent `assets` block yields the `{ enabled: false }` variant; otherwise every field is filled from the `AssetConfig` or its default. |
| `MediaEntry` | `interface MediaEntry { hash; sha256; slug; displayName; originalFilename; alt; ext; contentType; bytes; width; height; createdAt }` | One stored asset's row: its content hash, its human layer, and its byte and pixel facts. `width` and `height` are `null` when no dimensions are known. |
| `MediaManifest` | `type MediaManifest = Record<string, MediaEntry>` | The whole stored-asset record, keyed by the 16-hex content-hash prefix. |
| `VariantSpec` | `interface VariantSpec { width?; height?; quality?; fit?; gravity?; format? }` | A single image variant: the resize and format directives Cloudflare Images applies to the original bytes. |
| `MediaRef` | `interface MediaRef { slug: string \| null; hash: string }` | A resolved reference to a media asset by its content-hash prefix, with an optional display slug. |
| `MediaResolve` | `type MediaResolve = (ref: MediaRef) => string \| undefined` | The per-call resolver `render` reads under `resolveMedia`. `undefined` is a preview miss; a resolver that throws is the build backstop. |
