# Plan: media foundation (Phase 1 of the media gallery series)

Source spec: `docs/superpowers/specs/2026-06-15-cairn-media-gallery-design.md`. Design reference (the
research and the direction verdict): `docs/internal/design/2026-06-15-media-management-design-reference.md`.
Design target (the rev.2 mockup): `docs/internal/design/2026-06-15-media-gallery-mockup.html`.

This is the foundation phase: the engine substrate for the `media:` reference, content-addressed
storage, the manifest, the Cloudflare Images transform URL, and the render-time resolution, with no
admin UI. It de-risks the architecture before the insert experience (Phase 2) builds on it. The whole
new subsystem lives under a new `src/lib/media/` directory, with the one render hook in `src/lib/render/`.

Execution: one `cairn-implementer` per task, test-first, on a feature worktree off `main` (the
project's one-worktree-per-pass rule for later engine work, so `main` stays releasable). The main loop
reviews each diff and confirms the full gate (`npm run check` 0/0, `npm test` exit 0, the doc and
readiness gates) between dispatches. Tasks 8 and 9 run in the main loop. The phase is internal
substrate with no author-facing surface, so it stays unreleased until the insert phase makes the
feature usable, and it carries no consumer action: `AssetConfig` grows from a reserved, unused seam,
so no site's build changes.

## Task 1: the `media:` reference codec

Create `src/lib/media/reference.ts`, mirroring `src/lib/content/links.ts` (the `cairn:` codec). It
parses and writes the logical handle that content commits to git. The canonical form is
`media:<slug>.<hash>` where the hash is the 16-hex content-hash prefix and the slug is the cosmetic
display name; the bare `media:<hash>` form is also valid (no slug). Export `parseMediaToken(href)`
returning `{ slug: string | null, hash: string }` or `null` for any non-`media:` href or a malformed
token, and `mediaToken(ref)` writing the canonical string (the inverse, so a round trip is stable).
The hash is validated as 16 lowercase hex characters; a slug, when present, matches the slug grammar
from Task 2.

Test `src/lib/media/reference.test.ts`: a round trip of `media:blue-running-shoes.a1b2c3d4e5f6a7b8`;
the bare `media:a1b2c3d4e5f6a7b8` form (slug `null`); a non-`media:` href returns `null`; a malformed
token (wrong hash length, non-hex, empty) returns `null`; a slug carrying hyphens survives, and a slug
carrying a dot is rejected (the dot is the slug-hash separator). No UI.

## Task 2: content hash, slugify, and the key and URL naming

Create `src/lib/media/naming.ts`. Export `hashBytes(bytes: Uint8Array): Promise<string>` returning the
full lowercase hex sha256 via Web Crypto (`crypto.subtle.digest`), and `shortHash(full: string):
string` returning the first 16 hex characters. Export `slugifyFilename(name: string): string` applying
the strict transform: drop the extension, lowercase, NFC-normalize, transliterate accents to ASCII,
replace any run of non-`[a-z0-9]` with a single hyphen, trim leading and trailing hyphens, cap the
length (80 characters), and fall back to `file` when the result is empty. Export `r2Key(shortHash:
string, ext: string): string` returning `media/<aa>/<shortHash>.<ext>` where `<aa>` is the first two
hex characters. Export `publicPath(slug: string | null, shortHash: string, ext: string, urlForm:
'slug' | 'opaque'): string` returning `/media/<slug>.<shortHash>.<ext>` for the slug form (or
`/media/<shortHash>.<ext>` when the slug is null) and `/media/<aa>/<shortHash>.<ext>` for the opaque
form.

Test `src/lib/media/naming.test.ts`: `hashBytes` is deterministic and matches a known sha256 vector
for a fixed input, and `shortHash` is its 16-char prefix; `slugifyFilename` handles spaces to hyphens,
uppercase to lowercase, accented characters transliterated (`Frédéric` to `frederic`), a Windows
reserved name screened (`con` does not survive as a bare reserved name), an over-long name capped, a
name of only punctuation falling back to `file`, and the extension dropped; `r2Key` fans out on the
first two hex characters; `publicPath` produces both the slug and opaque forms and the slug-null case.
No UI.

## Task 3: the media manifest

Create `src/lib/media/manifest.ts`. Define `MediaEntry` (`hash` the 16-hex key, `sha256` the full
digest, `slug`, `displayName`, `originalFilename`, `alt`, `ext`, `bytes`, `width`, `height`,
`createdAt`) and `MediaManifest` (a record keyed by the 16-hex hash). Export `parseMediaManifest(json:
unknown): MediaManifest` (tolerant of an empty or missing object), `findByHash(manifest, hash):
MediaEntry | undefined` (the dedup lookup), `upsertMediaEntry(manifest, entry): MediaManifest`
(returning a new manifest, replacing any entry with the same hash), and `serializeMediaManifest(manifest):
string` writing deterministic JSON with the hash keys sorted, so a commit diff is stable and a
re-serialization is idempotent.

Test `src/lib/media/manifest.test.ts`: parse a valid manifest and an empty or absent one; `findByHash`
hits and misses; `upsertMediaEntry` adds a new entry and replaces a same-hash entry without mutating
the input; `serializeMediaManifest` sorts keys and is idempotent (serialize, parse, serialize yields
the identical string). No UI.

## Task 4: the Cloudflare Images transform-URL builder

Create `src/lib/media/transform-url.ts`. Define `VariantSpec` (`width?`, `height?`, `quality?`, `fit?:
'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'`, `gravity?: 'auto' | 'face' | string`, `format?:
'auto' | 'webp' | 'avif' | string`). Export `variantUrl(publicPath: string, spec: VariantSpec):
string` returning `/cdn-cgi/image/<options>/<publicPath>`, where the options are the comma-joined
`key=value` pairs in a stable order, with the defaults `format=auto` and `gravity=auto` applied when
the spec omits them. Export `presetUrl(publicPath: string, presetName: string, variants:
Record<string, VariantSpec>): string` resolving a named preset from the resolved config and throwing a
clear `cairn:`-prefixed error when the preset is unknown.

Test `src/lib/media/transform-url.test.ts`: a spec with a width produces
`/cdn-cgi/image/width=800,format=auto,gravity=auto/...` (defaults present, stable order); an explicit
`gravity=face` and `quality=82` and `fit=cover` are carried; the `publicPath` passes through
unaltered; `presetUrl` resolves a known preset and throws on an unknown one. No UI.

## Task 5: grow `AssetConfig` and normalize it

Modify the `AssetConfig` interface in `src/lib/content/types.ts`, superseding the reserved
`{ roots, publicBase }` shape. The new fields: `bucketBinding: string` (the R2 binding name),
`publicBase: string` (the delivery base path, default `/media`), `urlForm?: 'slug' | 'opaque'`
(default `slug`), `maxUploadBytes?: number` (a sane default, for example 25 MB), `allowedTypes?:
string[]` (default the common web image types), and `variants?: Record<string, VariantSpec>`. Create
`src/lib/media/config.ts` with `normalizeAssets(assets: AssetConfig | undefined): ResolvedAssetConfig`
applying the defaults and merging the caller's `variants` over the built-in presets `thumb`, `inline`,
`hero`, and `card` (each a sensible `VariantSpec`). Validation throws a `cairn:`-prefixed error for an
unknown `urlForm`, a variant with an invalid `fit` or `gravity`, or a declared `assets` block missing
`bucketBinding`.

Test `src/lib/media/config.test.ts`: the defaults apply when fields are omitted; `urlForm` defaults to
`slug`; a caller variant merges over and can override a built-in preset; the validation errors fire for
each bad case; an absent `assets` block normalizes to a clearly-disabled result (media off). This is
adapter-facing but additive: no site declares `assets` yet, so nothing breaks. Update the `AssetConfig`
reference page in Task 9. No UI.

## Task 6: resolve `media:` in the render path

Create `src/lib/render/resolve-media.ts`, mirroring `src/lib/render/resolve-links.ts`. Given a `media:`
href, the parsed manifest, and the resolved `AssetConfig`, it returns the delivery URL: the
`publicPath` for the asset, or a `variantUrl`/`presetUrl` when the image node carries a variant hint or
the call site requests a default inline preset. Wire it into the render pipeline beside the `cairn:`
link resolution stage so the editor preview and every public page resolve a `media:` image `src`. An
unknown hash leaves a flagged, safe placeholder rather than crashing, mirroring the `cairn:` backstop
(the build still catches a dangling token).

Test `src/lib/render/resolve-media.test.ts`: a markdown image whose `src` is
`media:blue-running-shoes.a1b2c3d4e5f6a7b8` resolves, through the adapter `render`, to an `<img>` whose
`src` is the expected `publicPath` (and the variant form when a preset is requested); the bare-hash
form resolves; an unknown hash yields the safe fallback, not a throw; a non-`media:` `src` is
untouched. This is the integration proof that the substrate renders end to end. No UI.

## Task 7: the `media.*` log events

Extend the log vocabulary in `src/lib/log/` with the media event family: `media.uploaded` (fields:
`editor`, `hash`, `bytes`, `ext`), `media.upload_failed` (`editor`, `reason`, optional `code`),
`media.deleted` (`editor`, `hash`), and `media.delete_blocked` (`editor`, `hash`, `foundIn` the count
of referencing entries). Follow the existing envelope (`level`, `event`, `timestamp`) and the typed
field pattern the other events use. No token or session id is ever logged, consistent with the rest of
the vocabulary.

Test: the emit shape for each new event, following the existing log test pattern, asserting the
envelope and the event-specific fields. Add the four rows to `docs/reference/log-events.md` (trigger
and fields per row) in this task, since the event names are the public-observable contract. No UI.

## Task 8 (main loop): the R2 store wrapper and the live wiring spike

Create `src/lib/media/store.ts`: a thin, engine-internal wrapper over the R2 binding, typed against
`R2Bucket` from `@cloudflare/workers-types`, exposing `put(key, bytes, httpMetadata)`, `head(key)`,
`get(key)`, and `delete(key)`. Unit-test it against an in-memory R2 double (a small fake implementing
the handful of methods used) so put, head, and delete round-trip without a network.

Then the spike, run in the main loop with the Cloudflare MCP or `wrangler`: provision a throwaway R2
bucket, prove a `put` followed by a Cloudflare Images transform fetch end to end against a real object,
and decide the delivery-route shape (a Worker route that resolves the hash and streams from R2, an R2
custom domain, or Cloudflare Images serving directly). Record the decision and the cost note back into
the spec's "Open questions for the foundation spike" section. No site wiring and no `wrangler.jsonc`
change to a consumer in this phase.

## Task 9 (main loop): the docs dimension

Add the reference page for the grown `AssetConfig` and the `media:` scheme under `docs/reference/`, and
an explanation page under `docs/explanation/` for the storage model (why R2 plus a logical reference
rather than images in git, carrying the research from the design reference). Confirm the `media.*` rows
from Task 7 are in `docs/reference/log-events.md`. Run `npm run check:reference` and `check:package`
green. No CHANGELOG release entry yet: the foundation is unreleased until the insert phase makes the
feature author-usable. The `cairn-doctor` readiness checks for the R2 and Cloudflare Images bindings
land with the phase that first needs a site to wire them, noted as a carry-forward.

## Carry-forward (the rest of the series, each its own just-in-time plan)

- Phase 2, the insert experience: the at-caret popover, the combobox picker, the capture card with the
  name and alt model, the upload admin action, the optimistic upload loop, dedup, and inline placement.
- Phase 3, placements: the hero frontmatter image field and the gallery component, with the alt model
  across all three placements.
- Phase 4, management and the differentiator: the Media screen, organize, search, pagination, bulk, the
  branch-spanning usage index, replace-in-place, and safe-delete.
- Phase 5, referenced media and tokens: the embed directive (oEmbed resolve and bookmark fallback) and
  the chooser routing to the icon picker.
- The `cairn-doctor` checks for the R2 and Cloudflare Images bindings, landing with the first site
  wiring.
- Documents as a surfaced stored type (a fast follow on the same substrate), and the manual
  focal-point control (deferred; Cloudflare Images smart crop is the default until then).
- The `frontend-design` polish pass on each phase that lands admin UI, against the editor-shell gold
  standard, in both themes.

## Post-mortem (2026-06-15)

Phase 1 landed on `feat/media-foundation` (a worktree off `main` at `df7ed21`), nine tasks plus the
review fold-in, commits `a58847a..cb8c890`. The whole new subsystem lives under `src/lib/media/` with
the one render hook in `src/lib/render/resolve-media.ts`. It is unreleased substrate (the version stays
`0.56.2`, no CHANGELOG entry) and carries no consumer action: `AssetConfig` grew from a reserved,
unused seam.

**Built.** The `media:<slug>.<hash>` reference codec (`reference.ts`, mirroring the `cairn:` codec);
content-hash and slug naming (`naming.ts`: `hashBytes` sha256 over the bytes, the strict
`slugifyFilename` ingest transform, `r2Key`, `publicPath`); the git-committed media manifest
(`manifest.ts`); the Cloudflare Images transform-URL builder (`transform-url.ts`); the grown
`AssetConfig` plus `normalizeAssets` with the `enabled` discriminant and the built-in
`thumb/inline/card/hero` presets (`config.ts` + `content/types.ts`); the render-time resolution of
`media:` image nodes (`resolve-media.ts` wired into `pipeline.ts`); the R2 store wrapper (`store.ts`);
and the four `media.*` log events.

**Verified, with evidence.** Gate green at the tip `cb8c890`, run first-hand: `npm run check` 940 files
0/0, `npm test` 170 files / 1666 tests exit 0, the reference, signature, package, docs (60 files),
readiness, and version gates all green. The svelte reviewer verified the render-safety design through
the live sanitize floor (a `javascript:`/`data:` resolver result is stripped, an attribute-break
payload is URL-encoded, and the broken-media marker plus a resolved `/media` or `/cdn-cgi/image` src
survive). The adversarial reviewer fuzzed `slugifyFilename` 200k times with zero slug-grammar
violations.

**The spike (task 8).** Run live against the `glw907` account. R2 storage proven: a content-addressed
put under `media/<aa>/<hash>.<ext>` and a get round-tripped byte-identical against a throwaway bucket,
provisioned and removed through the Cloudflare MCP. Delivery decided: a Worker route that resolves the
hash and streams from R2, the only shape that decouples the cosmetic public path from the
content-addressed key; variants run as `/cdn-cgi/image` URL transforms over it. Cost: within the
Cloudflare Images Free tier (5,000 unique transforms per month) for both small sites. The full
transform proof rides the first site wiring, since per-zone Transformations are not yet enabled
(`907.life` returns 404 on a `/cdn-cgi/image` path today). All recorded in the spec's "Foundation
spike: findings" section.

**Review gate.** Three reviewers (cloudflare-workers, svelte/render, an adversarial correctness pass),
no Critical or Important. Five fold-ins in `cb8c890`: the load-bearing one was `publicBase` being
resolved but ignored (`publicPath` hardcoded `/media`), now threaded through `publicPath` and the
resolver; plus the `variantUrl` leading-slash guard, the `parseMediaManifest` array rejection, the
preset-order comment, and the past-cap failure-mode note in the spec.

**Decisions locked.** The media module stays engine-internal (nothing added to `src/lib/index.ts`);
`AssetConfig` references `VariantSpec` via an inline `import type`, so the public surface adds no new
export name and the package and reference gates stay green. The delivery route is a Worker route. The
public URL carries the slug by default, with the hash as the lookup truth.

**Carry-forwards.**
- The plan specified co-located test paths (`src/lib/media/*.test.ts`); the repo's vitest config only
  runs `src/tests/{unit,integration,component}/`, so every test landed in `src/tests/unit/`. Future
  phase plans should name `src/tests/unit/` paths.
- Deferred review findings: transform option-emission minimization (negligible for fixed presets); the
  preset-typo render policy (degrade-to-marker versus hard-fail, decided when the insert UI wires
  presets); gravity-coordinate and width/height/quality range validation (with the focal-point pass);
  the `r2Key`/`publicPath` hash-shape preconditions (with the upload path).
- `cairn-doctor` gains R2-binding and per-zone-Transformations readiness checks at the first site
  wiring.
- The `media:` scheme is author-facing syntax but not a public export, so it has no natural home in the
  export-keyed reference; it landed in the `assets` adapter-member prose. A future content-authoring
  syntax section could cover `cairn:` and `media:` together.
