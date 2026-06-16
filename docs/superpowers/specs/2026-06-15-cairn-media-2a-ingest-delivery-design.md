# cairn media gallery, Phase 2a: ingest and delivery infrastructure

Date: 2026-06-15. Status: design hardened and approved (Geoff, 2026-06-15), ready to build. This is the
engine infrastructure under the Phase 2b insert UI. It builds on the Phase 1 foundation
(`src/lib/media/`) and implements the stored-files path of the gallery spec
(`2026-06-15-cairn-media-gallery-design.md`), which stays the umbrella design.

An adversarial find-and-verify pass hardened the design before it became this spec: five lenses
(security, concurrency, Cloudflare runtime, integration wiring, client ingest), 51 findings, 14
blockers. The decisions below carry those corrections; the most material was rejecting a
commit-the-manifest-to-main-on-every-upload draft in favor of the branch-scoped pipeline.

## Summary

Phase 2a is the ingest and delivery infrastructure the insert experience stands on, with no
author-facing UI of its own (that is Phase 2b). It delivers a locked-down `/media` delivery route that
streams content-addressed bytes from R2, an upload admin action with a strict untrusted-input
contract, a client-side ingest helper that normalizes before upload, the cross-cutting render-resolver
wiring that makes a `media:` reference render in the preview and the public build, a node-safe public
`/media` export subpath, and a reconcile read that makes orphaned R2 bytes observable.

## Context: the two-pass cut

The media gallery ships in phases. Phase 1 (the foundation: the `media:` codec, naming and hashing, the
manifest, the Cloudflare Images transform-URL builder, the grown `AssetConfig`, the R2 store wrapper,
the render resolver, the `media.*` events) landed and merged to main as unreleased substrate. Phase 2
(the insert experience) is cut into **2a (this infrastructure)** and **2b (the insert UI)**, two
distinct verification surfaces. 2a is integration-tested against miniflare R2 and isolates the
high-blast-radius changes (the delivery route, the cross-cutting render signature, the upload action).
2b is the differentiating UI (the at-caret popover, the combobox picker, the capture card, the
optimistic upload loop) and carries the frontend-design polish and a second adversarial review gate.

## The two product decisions (settled with Geoff)

### Media privacy: public-by-hash, gating kept addable

The delivery route serves bytes by content hash with no auth, so an uploaded asset's bytes become
fetchable by their hash URL the moment a manifest row reaches a pushed branch. This is correct for the
two public content sites. Private or gated drafts are a common requirement for other sites, and cairn's
logical-reference design keeps the door open without building anything now: content commits
`media:<hash>`, never the delivery URL, so a future `visibility` field on the manifest entry plus a
signed-URL or session-checked route variant adds gating as a delivery-layer change, with the reference
grammar and every committed post untouched. Phase 2a ships public-by-hash, documents the contract for
editors (uploading an image makes its bytes fetchable by their hash URL), and records private/gated
media as a documented future extension.

### Transform abuse: document the hardening, do not build it in 2a

Anyone can request `/cdn-cgi/image/<arbitrary options>/media/<hash>`, and each distinct option string
is a billable Cloudflare Images transform and a CDN cache entry. cairn's resolver only ever emits
preset URLs, so the abuse is an attacker hand-crafting option strings, bounded by the 5,000/month free
cap (both sites sit far under) with a degraded-image, not a charge, failure past it. The competitive
best-practice (imgix, ImageKit, and Cloudinary use signed URLs or named transformations; Next.js Image
allow-lists the option space) is the named-transformation pattern, which cairn's presets already fit.
Phase 2a documents two hardening paths for when a site scales, and builds neither: the strong form
routes variants through cairn's delivery Worker so the public URL carries the preset name and the Worker
applies the bounded transform (abuse-impossible by construction, at one Worker hit per image); the
lighter form is a Cloudflare Transform Rule that 404s any non-preset option string (pure edge,
operator-configured).

## The five pieces (hardened)

### 1. The delivery route

An engine-provided SvelteKit `RequestHandler` factory, exported from the `/sveltekit` barrel (it reads
`platform.env`, so it pulls `@sveltejs/kit` into its graph and cannot live on the node-safe `/media`
subpath). A site mounts it at `/media/[...path]`. The route:

- Decodes each path segment individually and rejects a slash or `..`. Extracts the hash as the
  segment's second-to-last dot-delimited field, validates it against `HASH_RE` (16 lowercase hex), and
  validates the extension against a closed allow-list, **before any R2 call**. The slug is
  attacker-controlled and ignored for lookup; `parseMediaToken` does not run here.
- Derives the R2 key from the validated hash and ext only, recomputing the `<aa>` fan-out from the hash
  and never trusting the URL's `<aa>`.
- Reads from R2 through the raw `R2Bucket` (via `requireBucket`), not the narrow `MediaStore` seam,
  because delivery needs conditional and ranged reads. It forwards the request's `If-None-Match` and
  `Range` into `bucket.get(key, { onlyIf, range })`, returns 304 when R2 signals no body, returns 206
  with `Content-Range` for a range, and 200 otherwise.
- Sets the response `Content-Type` from the server-validated stored type (via `writeHttpMetadata`),
  plus `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Content-Security-Policy:
  default-src 'none'; sandbox`, and a one-year immutable cache, on **every** response. The route sits
  outside `/admin`, so the admin security headers never run on it; these are its own load-bearing XSS
  controls.
- Short-circuits the Cloudflare Images origin subrequest (`Via: image-resizing`) to a clean full-body
  200 to prevent a self-loop.
- A missing binding is a drained 503 with a log; media-off is a 404.

### 2. The upload admin action

A JSON/fetch endpoint (not a form-redirect), added to `createContentRoutes` so it inherits
`mintToken`, the backend, and the token cache, and wired through `createCairnAdmin` via
`viewAction(['edit'], ...)`. The gate order, each step before the body is read where possible:

1. Media-on, else a 503 JSON.
2. `Content-Length` against `resolved.maxUploadBytes`: a 413 **before the body is read** (and a
   multipart POST with no `Content-Length` is rejected).
3. CSRF read from an `X-Cairn-CSRF` request header validated against the cookie, so the multipart file
   body is never cloned and double-buffered to read the token (the existing form-field CSRF path stays
   unchanged for the other actions).
4. A JSON-aware session gate returning `401 {error:'session-expired'}` instead of the 303 redirect a
   `fetch` caller silently follows.

The server then owns every committed field and trusts no client value: it sniffs the real type with an
owned, Worker-clean detector and checks it against `allowedTypes`, hard-rejects `image/svg+xml`,
`image/svg`, `text/html`, `application/xml`, and any payload whose first non-whitespace byte is `<`
through an engine-level deny-list a site cannot override; re-hashes the bytes (the server hash is the
truth); re-derives the ext from the sniffed type; re-runs `slugifyFilename` server-side; caps and strips
control characters from `displayName`/`alt`/`originalFilename` (basename only); and clamps the
client-supplied pixel dimensions (advisory, since a Worker cannot cheaply re-derive them). It stores to
R2 **put-first** (idempotent, with `cacheControl` and `contentType` in the http metadata), dedups via
`findByHash` returning a "reused existing" result (flagging a metadata mismatch) without a second put,
and **commits nothing to git**. It returns JSON `{ reference, record }` and emits `media.uploaded` or
`media.upload_failed` with a reason. A failed step is never compensated with a delete (that could
destroy a concurrent dedup-reuse).

### 3. The client-side ingest helper

A browser-only helper behind the editor seam. It detects HEIC by `ftyp` magic bytes (never the
extension or the browser MIME) and routes three ways: web-native types pass through untouched, with
dimensions read via `createImageBitmap({ imageOrientation: 'from-image' })`; PNG and GIF pass through
(GIF dimensions from the logical-screen-descriptor header, never a canvas, so animation survives); HEIC
transcodes through a lazy-loaded WASM decoder (preferring extraction of the container's embedded primary
JPEG) to WebP with orientation applied. Any forced re-encode targets WebP, and before `drawImage` the
helper downscales to a conservative canvas budget (area under about 16.7M, short side at most 4096)
rather than clip. It normalizes a `DataTransfer` (image files only, the first of several, ignoring
`uri-list`/`html`) and guards the drop target with `preventDefault` on dragover and drop. Failures map
to typed card states (decode-unsupported, transcode-failed, too-large after transcode, network), and the
fetch sets the `X-Cairn-CSRF` header with `redirect: 'manual'`. The server re-validates everything, so
the client is untrusted; this helper exists for UX (no dead interval, a correct preview), not security.

### 4. The preview-resolver wiring

The `render` callback gains a **trailing optional** `resolveMedia?: MediaResolve`, so the change is
additive and a consumer's existing render call is unbroken. `editLoad` adds the media-manifest read to
its existing `Promise.all`, gated on `resolvedAssets.enabled`, reading `mediaManifestPath` from the
backend on the default branch, projected to the minimal resolver input (keyed by hash:
`{ slug, ext, contentType }`) on `EditData` parallel to `linkTargets`, and degrading to an empty
projection on any failure so the edit page never throws. EditPage builds the resolver and passes it as
`resolveMedia`. The site's `adapter.render` closes over a media resolver for the public build too. A
`media:` reference with no resolver throws on the public build (a loud deploy failure) while the preview
path keeps the undefined-to-broken-marker fallback; a `media.resolve_missing` warning, a `Consumers
must:` changelog line, and a documented rule (do not author `media:` tokens until the site render
threads `resolveMedia`) cover the migration.

### 5. Public exports and the runtime

The pure media surface ships from a new node-safe `@glw907/cairn-cms/media` subpath that the prerender
corpus and `adapter.render` import: `makeMediaResolver`, `normalizeAssets`, the manifest functions,
`publicPath`, `presetUrl`/`variantUrl`, `r2Key`, the hash and slug helpers, and the types. The
kit-coupled delivery-route factory and `requireBucket` ship from `/sveltekit`. No
`@cloudflare/workers-types` name (`R2Bucket`, `R2HTTPMetadata`) may leak into the public `.d.ts`; the
route and `requireBucket` are typed against a narrow internal seam or `workers-types` becomes an optional
peer. This mirrors the established `/delivery` versus `/delivery/data` split. `composeRuntime` resolves
`normalizeAssets(adapter.assets)` once into `runtime.resolvedAssets` and adds `mediaManifestPath`
(default `src/content/.cairn/media.json`). `AssetConfig` and `ResolvedAssetConfig` gain
`transformations?: boolean` (default false), and `makeMediaResolver` returns the bare full-size
`publicPath` when transformations are off, so a fresh zone with Image Transformations disabled serves
full-size-but-correct thumbnails rather than broken `/cdn-cgi/image` URLs.

## Locked decisions (from the adversarial synthesis)

1. **The manifest commits branch-scoped, not main-per-upload.** The upload stores bytes to R2 and
   returns the record; the record rides the editor's optimistic client state and commits with the entry
   on the per-entry branch at Save, promoted to main at Publish, folded into the existing `commitFiles`
   change set (a union keyed by content hash, last-writer-wins, read from the default branch as the
   base). A whole-file overwrite of a shared mutable `media.json` through `commitFiles` would
   last-writer-wins and silently drop a concurrent row, so it must never ship; if a global-on-main copy
   is ever required, the merge moves inside the `commitFiles` retry loop.
2. **Storage is put-first and idempotent; orphans are an expected, bounded, reconcilable state.** A put
   whose entry is never saved leaves R2 bytes with no row. A reconcile read ships in 2a (decision 10).
   No failure path compensates with a delete.
3. **The upload endpoint is a JSON/fetch endpoint with the gate order and the server-owns-everything
   contract in piece 2.** SVG and HTML are denied at the engine level regardless of `allowedTypes`.
4. **The delivery route sets the security headers in piece 1 on every response and validates the hash
   and ext before any R2 call.** These headers, not the render sanitizer, are the XSS control for the
   served bytes.
5. **The public surface splits node-safe `/media` from kit-coupled `/sveltekit`, with no
   workers-types in the public `.d.ts`.**
6. **Delivery reads bypass the narrow `MediaStore` seam** (which cannot express 304/206) and use the
   raw bucket; the seam is still widened for the dedup/probe path.
7. **The render signature change is additive and optional**, with a loud public-build throw on a missing
   resolver and the documented migration in piece 4.
8. **Transforms degrade gracefully** via `transformations: false` by default (piece 5).
9. **The doctor does not regress no-media sites.** The R2 binding is not added to the hard
   `config.bindings` check; any media binding check is a separate conditional that runs only when the
   adapter declares assets and reads the configured `bucketBinding` name, with `readWranglerConfig`
   extended to enumerate `r2_buckets`.
10. **The reconcile read ships in 2a** (list R2 keys under `media/` versus `media.json` hashes, report
    both orphan directions, emit `media.orphan_reconcile`), since 2a introduces the orphan vector;
    destructive collection is deferred to Phase 4.

## New `MediaEntry` and naming hardening

`MediaEntry` gains a `contentType` field (so the delivery route never guesses the type from the
extension), and `width`/`height` become `number | null` (the client is the only dimension source and a
Worker cannot re-derive them). `slugifyFilename` gains a not-a-hash rule: if its output matches
`HASH_RE`, append `-img` (mirroring the reserved-name `-file` fallback), so a slug can never collide
with the bare-hash reference form. `r2Key` asserts its inputs (hash 16-hex, ext short alphanumeric).

## Open risks carried into the build

1. **The WASM HEIC decoder choice and weight.** The three-tier ingest needs a concrete browser
   HEIC-to-WebP path. A short client spike at the ingest task picks the library (libheif-js, heic-to, or
   a hand-rolled embedded-JPEG extractor), confirms the lazy-load size and decode reliability across
   Chrome, Firefox, and Edge on Windows and Linux, and confirms orientation handling. This is the one
   piece whose feasibility the design assumes but has not proven on real bytes.
2. **Transform abuse over a public same-zone origin** (the second product decision): documented as a
   hardening knob, decided not load-bearing for 2a.
3. **The media privacy contract** (the first product decision): public-by-hash, gating kept addable,
   documented for editors.
4. **The live transform proof rides the first site wiring.** The spike proved R2 storage live but could
   not prove `/cdn-cgi/image` end to end (the token cannot flip the per-zone Transformations setting; a
   site cutover enables it and proves a real transform before the preview's preset path is trusted).
   The `transformations: false` default keeps thumbnails correct until then.
5. **Batch/gallery upload contention constrains Phase 2b.** Holding the manifest commit to Save avoids
   per-upload main contention, but 2b must not offer multi-select drag-drop until a batch-coalesced
   ingest (many R2 puts, then one save commit) is designed. Flagged for the 2b plan.

## Verification

Integration tests against miniflare (the workers project, with `MEDIA_BUCKET` in `wrangler.test.jsonc`)
for the upload action and the delivery route, exercising the security gates, the dedup path, the 304/206
branches, and the path-traversal rejections. Unit tests for the pure parts: the content sniffer (byte
fixtures), the naming hardening, the client-ingest pure helpers (HEIC magic detection, orientation,
the DataTransfer normalizer, the canvas budget). A showcase test (adapter-node with a fake R2 bucket)
proves the vertical slice: an upload returns a reference, the record overlays into the preview resolver,
and saving the entry commits the body plus `media.json`. The standing gate holds: `npm run check` 0/0,
`npm test` exit 0, the reference, signature, package, docs, readiness, and version gates green. A new
public subpath adds a reference page (`docs/reference/media.md`) and the package gates.

## Documentation dimension

The `media.md` reference page (one declare block per callable on the `/media` subpath), the grown
`AssetConfig` and render-signature reference updates, the new `media.*` events in
`docs/reference/log-events.md` (`media.uploaded`, `media.upload_failed`, `media.delivery_failed`,
`media.orphan_reconcile`, `media.resolve_missing`), an editor-facing line on the privacy contract, and a
`Consumers must:` changelog line for the additive render-signature change and the per-site R2 wiring. The
upgrade guide gains the per-version entry.

## Deferred and out of scope

Phase 2b (the insert UI). The destructive reconcile (safe-delete collection) and the full
branch-spanning usage index (Phase 4). Private/gated media (a documented future extension, not built).
The transform-abuse edge hardening (documented, not built). Server-side HEIC transcode (the client
normalizes; the server rejects HEIC outright since it only ever stores web bytes). A live transform
proof (rides the first site wiring).
