# Plan: media Phase 2a, ingest and delivery infrastructure

Source spec: `docs/superpowers/specs/2026-06-15-cairn-media-2a-ingest-delivery-design.md` (the hardened
design, with the contracts each task must meet). Umbrella: the gallery spec
`docs/superpowers/specs/2026-06-15-cairn-media-gallery-design.md`. Builds on the Phase 1 foundation
under `src/lib/media/`.

This is the infrastructure under the Phase 2b insert UI: the `/media` delivery route, the upload admin
action, the client-side ingest helper, the cross-cutting render-resolver wiring, the public `/media`
export subpath, and the reconcile read. The design survived an adversarial find-and-verify pass (51
findings, 14 blockers); the spec carries the corrections, and each task below references the spec
section that holds its contract.

## Execution

One `cairn-implementer` per task, test-first, on a feature worktree off `main` (one worktree per pass).
The main loop reviews each diff and confirms the full gate (`npm run check` 0/0, `npm test` exit 0, the
reference, signature, package, docs, readiness, and version gates) between dispatches. Effort: high.
The high-blast-radius tasks (Task 3 the render-signature change, Task 4 the delivery route, Task 5 the
upload action, Task 10 the exports and showcase wiring) get a careful main-loop diff review and may be
upshifted; Task 8 carries a short client library spike (the WASM HEIC decoder) that runs in the main
loop. It is unreleased engine substrate plus one per-site consumer action (wire the R2 bucket and the
`/media` route), so it ships behind the `transformations: false` default and a `Consumers must:` line;
the bundled release happens when Phase 2b makes media author-usable.

The tasks are ordered for build dependencies. Tasks 1, 2, and 8 are largely independent; Task 3 must
precede 4, 5, and 7; Task 5 depends on 1, 2, 3, 4; Task 10 depends on all.

## Task 1: widen the store seam, harden naming, grow MediaEntry

Spec: "New MediaEntry and naming hardening" plus decision 6. In `src/lib/media/store.ts`, widen
`MediaStore.get` to `get(key, opts?: { range?; onlyIf? }): Promise<R2ObjectBody | R2Object | null>` and
pass the options through to `bucket.get` in `r2Store`; keep `put`/`head`/`delete` unchanged. In
`src/lib/media/naming.ts`, add input asserts to `r2Key` (hash matches `/^[0-9a-f]{16}$/`, ext matches
`/^[a-z0-9]{1,5}$/`) and the not-a-hash rule to `slugifyFilename` (after producing the slug, if
`HASH_RE.test(slug)` append `-img`). In `src/lib/media/manifest.ts`, add `contentType` to `MediaEntry`,
make `width`/`height` `number | null`, and update the serialize and any schema helper accordingly.

Tests (`src/tests/unit/`): a fake bucket that honors `onlyIf` (a body-less `R2Object` on an etag match)
and `range`, asserting the 304-shape and 206-shape pass through the seam; `slugifyFilename` of a 16-hex
stem yields a non-hex slug ending `-img`; `r2Key` throws on a non-hex hash and a non-alnum ext; a
`MediaEntry` with `contentType` round-trips and a null dimension serializes.

## Task 2: a Worker-clean content-type sniffer and the engine deny-list

Spec: piece 2 and decision 3. Create `src/lib/media/sniff.ts` exporting `sniffMediaType(bytes:
Uint8Array): string | null` that reads the first ~32 bytes (JPEG `FFD8FF`, PNG `89504E47`, GIF `GIF8`,
WebP `RIFF....WEBP`, the AVIF/HEIC `ftyp`-box brand parse) and a deny predicate that rejects
`image/svg+xml`, `image/svg`, `text/html`, `application/xml`, and any input whose first non-whitespace
byte is `<`, independent of `allowedTypes`. Pure and Worker-clean (no Node `Buffer` or stream). The
module doc states the sniff is necessary but not sufficient and the delivery headers are the real XSS
control.

Tests: byte fixtures for each magic returning the right type; a polyglot with JPEG-magic head and an
HTML tail still sniffs `image/jpeg` (documenting the limit); an SVG and a leading-`<` payload rejected
by the deny predicate even when `allowedTypes` includes svg; a 2-byte truncated input returns null.

## Task 3: resolve assets at compose, grow the runtime and the render signature

Spec: piece 5 and decisions 7 and 8. In `src/lib/content/compose.ts`, call
`normalizeAssets(adapter.assets)` once into `runtime.resolvedAssets` and add `mediaManifestPath:
adapter.mediaManifestPath ?? 'src/content/.cairn/media.json'`. In `src/lib/content/types.ts`, add
`resolvedAssets: ResolvedAssetConfig` and `mediaManifestPath: string` to `CairnRuntime`,
`mediaManifestPath?: string` to `CairnAdapter`, `transformations?: boolean` (default false) to
`AssetConfig` and `ResolvedAssetConfig`, and the trailing `resolveMedia?: MediaResolve` opt to the
`render` signature on both `CairnAdapter.render` and `CairnRuntime.render`. Update `makeMediaResolver`
in `src/lib/render/resolve-media.ts` to return the bare `publicPath` when `resolved.transformations` is
false (ignore the preset). Update the affected reference pages in this task so the signature gate stays
green (this is the documented signature change).

Tests: `composeRuntime` sets `resolvedAssets` to `{ enabled: false }` for no assets and a filled config
otherwise; `mediaManifestPath` defaults and respects an override; with `transformations: false` a preset
call returns the bare `publicPath`, with it true the `/cdn-cgi/image` URL; the additive `resolveMedia`
opt is accepted by a spread-forwarding render. Confirm `check:reference:signatures` green.

## Task 4: requireBucket and the delivery-route factory

Spec: piece 1 and decisions 4, 5, 6, 9. Add `requireBucket(env, bindingName: string): R2Bucket` to
`src/lib/env.ts` (reads `env[bindingName]` dynamically, throws `CairnError('config.bindings-missing',
...)` naming the binding). Add the delivery-route factory under `src/lib/sveltekit/`, exported from the
`/sveltekit` barrel, producing a SvelteKit `RequestHandler`. It parses defensively, validates the hash
and ext before any R2 call, derives the key from validated values, guards the `Via: image-resizing`
self-loop, calls `bucket.get` with `onlyIf`/`range`, builds the 304/206/200 response with the security
headers and the immutable cache, returns a drained 503 on a missing binding, and a 404 for media-off or
a bad path. Type every signature so no `@cloudflare/workers-types` name lands in the public `.d.ts`.

Tests (integration, miniflare, `MEDIA_BUCKET` in `wrangler.test.jsonc`): a put then GET returns 200 with
the right content type, `nosniff`, the immutable cache, the CSP, and `Content-Disposition`; an
`If-None-Match` match returns 304 with no body; a Range returns 206 with `Content-Range`; a `Via:
image-resizing` request returns a full 200; a path-traversal slug, an over-long hash, a non-hex hash,
and a bad ext each 404 with no R2 read; a missing binding returns 503 not a thrown 500; media-off
returns 404. Confirm `publint`/`attw` name no R2 type in the public surface.

## Task 5: the upload action with the untrusted-input contract

Spec: piece 2 and decisions 1, 2, 3. Add `uploadAction(event)` to `createContentRoutes` (so it inherits
`mintToken`, the backend, the token cache) and wire it through `createCairnAdmin` via
`viewAction(['edit'], ...)`. Implement the gate order (media-on, `Content-Length` vs `maxUploadBytes`
413-before-read, CSRF from the `X-Cairn-CSRF` header, the JSON-aware 401) and the server re-derivation
(sniff and check `allowedTypes` plus the deny-list, re-hash, re-derive the ext, re-run `slugifyFilename`,
cap and sanitize the human fields, clamp the dimensions). Store put-first with the http metadata, dedup
via `findByHash` returning "reused existing" (flag a metadata mismatch) without a second put, **commit
nothing**, return JSON `{ reference, record }`, and emit `media.uploaded`/`media.upload_failed`. Add a
media-action CSRF-from-header helper and a JSON-session helper to the auth surface, leaving the existing
form-field and redirect paths unchanged.

Tests (integration, miniflare R2 plus a fetch-double token): a valid PNG stores under the
content-addressed key, returns the `media:` reference, and commits nothing to git; a second identical
upload returns "reused existing" without a second put; an oversize `Content-Length` 413s before the body
is read; a missing or invalid `X-Cairn-CSRF` 403s; an absent session returns 401 JSON not a 303; an SVG
and a leading-`<` payload are rejected even with `allowedTypes` including svg; a client-declared `webp`
on JPEG bytes stores as `jpg`; a 200-char alt is capped; a client slug of `../../evil` is replaced by
the `slugifyFilename` output; an oversize or over-pixel bounce emits `media.upload_failed` with the
right reason.

## Task 6: the save-time media-manifest merge on the branch and into Publish

Spec: decision 1. In `src/lib/sveltekit/content-routes.ts`, thread the editor's optimistic media records
(posted alongside the body) into `saveToBranch` and `publishAction`: parse and validate each
`MediaEntry`, read the base `media.json` from the backend on the default branch (never the pending
branch), `upsertMediaEntry` each onto it (a union keyed by content hash, last-writer-wins), and include
the serialized `media.json` in the **same** `commitFiles` change set as the body (the branch at save,
main at publish). A no-op when `resolvedAssets.enabled` is false; idempotent so a re-save converges.

Tests (integration): saving an entry whose body references two uploaded records commits the body and a
`media.json` with both rows in one commit on the pending branch; publishing promotes both rows to main's
`media.json` in the publish commit; two entries each adding a different record, saved in sequence, both
land their rows; a save with media disabled commits no `media.json`; a re-save of the same entry
produces a byte-identical `media.json`.

## Task 7: editLoad ships the projected resolver input

Spec: piece 4. In `editLoad` (`src/lib/sveltekit/content-routes.ts`), add the media-manifest read to the
existing `Promise.all`, gated on `resolvedAssets.enabled`, reading `mediaManifestPath` from the backend
on the default branch, projected to the minimal resolver input (`Record<hash, { slug, ext, contentType
}>`) on `EditData` parallel to `linkTargets`, degrading to an empty projection on any failure. A
no-media site issues no read.

Tests (unit/component): `editLoad` with media enabled includes the projection read concurrently inside
the `Promise.all` batch; a 500 from the media read degrades to an empty projection, not a thrown edit
error; with media disabled no media read is issued; the projection carries only `slug`/`ext`/`contentType`,
not the full `MediaEntry`.

## Task 8 (main loop carries the spike): the client-side ingest helper

Spec: piece 3 and open risk 1. Add the browser ingest helper (client-only, behind the editor seam):
`ftyp` HEIC detection by magic bytes, the three-tier route (web-native passthrough with dimensions via
`createImageBitmap({ imageOrientation: 'from-image' })`; PNG/GIF passthrough with GIF dimensions from
the header; HEIC via a lazy-loaded WASM decoder preferring the embedded JPEG, transcoded to WebP with
orientation), the conservative canvas budget (downscale, never clip), the slug-versus-proposed-name
split (generic stems leave the name empty-required with no Suggested tag), the `DataTransfer` normalizer
and the guarded drop target, the failure taxonomy (decode-unsupported, transcode-failed, too-large,
network), and the upload fetch with the `X-Cairn-CSRF` header and `redirect: 'manual'`. **Run a short
library spike first** (libheif-js vs heic-to vs a hand-rolled embedded-JPEG extractor): confirm the
lazy-load weight and the decode reliability on real iPhone HEIC across Chrome, Firefox, and Edge before
committing the library, and record the choice in the plan post-mortem.

Tests (unit, the pure parts): HEIC magic detection on a fixture with a wrong or empty MIME; an
orientation-6 JPEG yields non-transposed dimensions; a generic-stem filename yields an empty proposed
name while a real name keeps it; the `DataTransfer` normalizer keeps only image files and ignores a
`uri-list` item; the canvas-budget function downscales an over-budget source instead of clipping; the
failure mapper returns the right card state per error kind.

## Task 9: the reconcile read and the conditional doctor check

Spec: decisions 9 and 10. Add a reconcile read (list R2 keys under `media/` versus the `media.json`
hashes, report both orphan directions, emit `media.orphan_reconcile`) as a CLI command and/or a
`cairn-doctor` check that runs only when the adapter declares assets, reading the configured
`bucketBinding` name; extend `readWranglerConfig` to enumerate `r2_buckets`, without touching the hard
`config.bindings` check. Add the `media.*` events (`media.uploaded`, `media.upload_failed`,
`media.delivery_failed`, `media.orphan_reconcile`, `media.resolve_missing`) to the log vocabulary and
the `docs/reference/log-events.md` table.

Tests (unit): the reconcile read over a fake bucket plus a fixture `media.json` reports the right
orphans and missing-object rows; `readWranglerConfig` parses an `r2_buckets` entry; the doctor media
check skips when no assets are declared and only fails or passes when they are; the existing
`config.bindings` check is unchanged; the `media.*` records carry the editor email and never bytes or a
token.

## Task 10 (main loop reviews carefully): public exports, the gates, and the showcase vertical slice

Spec: piece 5. Add the node-safe `./media` subpath to the `package.json` exports (types, svelte,
default) exporting `makeMediaResolver`, `normalizeAssets`, the manifest functions, `publicPath`,
`presetUrl`/`variantUrl`, `r2Key`, the hash and slug helpers, and the types; keep `requireBucket` and the
delivery-route factory on `./sveltekit`. Add the `./media` entry to `CONFIG` in
`scripts/reference-coverage.mjs`, author `docs/reference/media.md` (a declare block per callable), and
link it from `docs/reference/README.md`. Add `r2_buckets MEDIA_BUCKET` to `wrangler.test.jsonc`. In the
showcase: define `App.Platform` in `app.d.ts`, inject a fake R2 bucket on `event.platform.env` in
`hooks.server.ts` beside `AUTH_DB`, mount the `/media` route, wire the adapter render media resolver over
the committed `media.json`, and wire the upload action. Update the `AssetConfig` and render reference
pages and the changelog `Consumers must:` line.

Tests: the gate suite green with the new subpath (`check:reference`, `check:reference:signatures`,
`check:package`), and the public `.d.ts` names no R2 type. A showcase E2E or component test
(adapter-node, fake bucket): an upload returns a reference and the record overlays into the preview
resolver so the inserted `media:` reference renders a thumbnail; saving the entry commits the body plus
`media.json`. The delivery route's workerd behavior is proven by the integration suite (Task 4), not the
showcase. Full standing gate green.

## Carry-forward (into Phase 2b and beyond)

- Phase 2b, the insert UI: the at-caret popover, the combobox picker, the capture card, the optimistic
  upload loop and dedup sequencing, inline placement, drag and paste, and the mobile sheet, with the
  frontend-design polish and a second adversarial review-gate workflow. The 2b plan must not offer
  multi-select drag-drop until a batch-coalesced ingest is designed (open risk 5).
- The transform-abuse edge hardening (the named-transformation Worker or a Transform Rule) when a site
  scales (open risk 2).
- Private/gated media as a documented future extension (the `visibility` field plus a signed-URL or
  session-checked route variant), built when a site needs it.
- The live `/cdn-cgi/image` transform proof on the first site cutover (open risk 4), and the per-zone
  Transformations enable.
- The destructive reconcile (safe-delete collection) and the full branch-spanning usage index (Phase 4).
