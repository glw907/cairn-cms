# cairn media gallery: functional and design spec

Date: 2026-06-15. Status: approved direction (Geoff, 2026-06-15). A phased plan series follows, each
plan written just-in-time after the prior one lands, per the project convention.

## Summary

A media subsystem that lets a non-technical author add, place, and manage images from `/admin`,
designed so every kind of media a post can carry meets one coherent insert experience. The build
mission is the gallery, which is stored files (images first, documents close behind). Referenced
external media (video and embeds) and design-system tokens (icons) reach the author through the same
insert entry point but route to machinery cairn mostly already has, so they are designed here and
built thin.

This spec rests on a research pass and a mockup-and-judge pass, both recorded:

- Research, unified strategy, and the direction verdict:
  [`docs/internal/design/2026-06-15-media-management-design-reference.md`](../../internal/design/2026-06-15-media-management-design-reference.md).
- The design target (the rev.2 synthesized mockup):
  [`docs/internal/design/2026-06-15-media-gallery-mockup.html`](../../internal/design/2026-06-15-media-gallery-mockup.html).
- The three divergent direction mockups (insert-first, library-first, command-surface) sit beside it
  as history.
- The design language: [`docs/internal/admin-design-system.md`](../../internal/admin-design-system.md).

## The model (locked)

Media has three lifecycles, and the author meets one insert entry point that routes by intent:

- **Stored files** ("a file I keep"): images, documents, and the occasional small decorative MP4.
  cairn stores the bytes and the author manages them. This is the build target.
- **Referenced external media** ("a thing I point at"): real video and social or map or code embeds.
  cairn stores nothing; the content holds a URL or a provider plus an id, rendered by a directive.
- **Design-system tokens** ("a token I pick"): icons and brand marks, chosen from the site's curated
  set, never uploaded.

Placement is a separate axis. One stored image can be an inline body image, a hero field, or a
gallery tile. One asset, three affordances.

## Locked decisions

1. **Bytes in R2, not git.** A logical `media:` reference is committed to git and resolves to a real
   URL at delivery, the same shape as cairn's existing `cairn:` internal-link scheme. The transform
   host and grammar never land in committed content.
2. **Identity is a content hash; the display name is a slug.** Both are kept: the hash gives dedup and
   an immutable cache, the slug gives a readable URL and a browsable library. A small git-committed
   media manifest carries the human layer (display name, original filename, alt, dimensions).
3. **Transforms run through Cloudflare Images on demand**, with named variant presets behind the
   adapter and a smart-crop default (`gravity=auto` saliency, `gravity=face`). One stored original,
   variants per request, no upload-time fan-out.
4. **Usage tracking spans edit branches.** The reverse index unions committed `main` with every open
   `cairn/<concept>/<id>` edit branch, and greps every reference site: inline `![](media:...)`, the
   frontmatter hero field, and gallery-component references. It reports "found in N entries" or "no
   references found," never "unused," and carries the raw-HTML caveat. Safe-delete blocks on the
   union.
5. **Alt text is set once on the asset, inherited at each placement, overridable per instance, with an
   explicit decorative (empty-alt) choice.** It is captured at the moment of insert, in the same step
   as the file, and is hard to skip.
6. **The insert surface is the hybrid the panel chose**: an at-caret popover that keeps the manuscript
   visible, opened by a visible labeled Insert button plus slash, paste, and drag; a combobox-and-
   listbox picker; a one-step capture card; an optimistic placeholder with determinate progress and a
   retry on failure; a dedup sequence shown in the right order; and a full-height sheet fallback below
   the narrow breakpoint.
7. **Focal point and crop are deferred** from the first surface. Cloudflare Images smart crop gives a
   sensible default with no editor control; the manual focal-point control is a fast follow.
8. **Embeds are a directive** (oEmbed resolve with a bookmark-card fallback), reachable from the
   insert chooser, not rows in the stored-files library. **Icons** route to the existing
   `IconPicker` from the same chooser.
9. **The build carries a `frontend-design` polish pass** once the admin components render in the
   showcase, in both themes, against the editor-shell gold standard, before the gate.
10. **The public URL carries the slug by default** (`/media/<slug>.<hash>.<ext>`), with an opaque form
    (`/media/<aa>/<hash>.<ext>`) as a one-line adapter policy knob. The R2 key and the git reference
    are identical either way.

## Architecture

### Storage and identity

Bytes live in a per-site R2 bucket, bound to the Worker (working name `MEDIA_BUCKET`). The R2 key is
content-addressed with a short fan-out prefix: `media/<aa>/<sha256-16hex>.<ext>`, where `<aa>` is the
first two hex characters of the hash. Identical bytes produce the same key, so a re-upload of the same
image dedupes to one object. The full digest is kept in the manifest, so widening the truncated prefix
later is a non-breaking migration.

Ingest normalizes before hashing: an iPhone HEIC is transcoded to a web format, and the hash is taken
over the normalized bytes so a re-upload of the same source dedupes. A strict slugify runs on the
original filename for the display slug: lowercase, NFC-normalized, transliterated, `[a-z0-9-]`, dots
and spaces stripped, length capped, Windows reserved names screened. That single transform neutralizes
the web-platform hazards (space-encoding bugs, case-sensitivity 404s, unicode mismatch, reserved
names) and keeps a personal filename out of a public repo.

### The `media:` reference and resolution

Content references an asset by a logical handle committed to git, `media:<slug>.<hash>` (the slug is
cosmetic; the hash is the truth), or the bare `media:<hash>`. A resolver rewrites the handle to a
delivery URL at render time, the same pattern as `resolve-links.ts` for `cairn:` links. The resolver
is backend-agnostic: a site that ever changes its storage or delivery keeps its content unchanged.

Delivery serves the public URL `/media/<slug>.<hash>.<ext>` through a Worker route (or an R2 custom
domain), resolving by the hash component and ignoring the slug for lookup. The bytes are immutable, so
the response carries a one-year immutable cache. Responsive variants come from Cloudflare Images
applied over the same path, for example
`/cdn-cgi/image/width=800,format=auto,quality=82,gravity=auto/media/<slug>.<hash>.<ext>`.

### The media manifest

A git-committed media manifest (working path `src/content/.cairn/media.json`, beside the content
manifest) holds one record per asset, keyed by the content hash: the display name, the original
filename, the current slug, the default alt, the extension, the byte size, the dimensions, the full
`sha256`, and a creation timestamp. The manifest makes the library browsable, preserves the original
name for a document download, and is the dedup lookup. Writes route through the existing per-entry
branch and publish pipeline, which already serializes commits, rather than racing on a shared mutable
file.

### Upload pipeline

An admin action receives the file, normalizes and hashes it, checks the manifest for an existing hash
(dedup), uploads to R2 under the content-addressed key when the hash is new, and upserts the manifest
record, committed together with the entry the same way a save commits. A failed upload surfaces a
clear error and a retry, never a silent drop, and a failed publish leaves no orphaned R2 object
(reconcile on the next pass). The pipeline emits structured log events.

### Usage index and safe-delete

The reverse index answers "where is this asset used." It unions committed `main` with every open
`cairn/<concept>/<id>` edit branch, so an image placed only on an unpublished edit is seen, and it
greps inline `![](media:...)`, the frontmatter hero field, and gallery-component references. The
verdict reads "found in N entries" or "no references found." A delete of an in-use asset is blocked or
hard-confirmed (type the asset name), listing the entries that would break; an asset with no
references gets a light confirm, phrased "no references found" and noting that git history makes the
delete recoverable. Replace-in-place keeps the reference and warns how many entries update.

### Logging

The media path gets its own event family in the log vocabulary: `media.uploaded`,
`media.upload_failed` (with a reason), `media.deleted`, and a delete-blocked or orphan-reconcile
event. The reference table in `docs/reference/log-events.md` is updated in the same pass that adds each
event, per the project's logging doctrine.

## Developer contract changes

- **`AssetConfig` grows from its reserved seam** (`src/lib/content/types.ts`) into the real media
  config: the R2 binding name, the public base and the URL-form policy (slug-carrying or opaque), the
  allowed types, the maximum upload size, and the named variant presets (for example `thumb`,
  `inline`, `hero`, `card`). The current reserved `{ roots, publicBase }` shape is superseded.
- **The adapter `render` path resolves `media:` references**, alongside the existing `cairn:` link
  resolution, so the preview and every public page render the right delivery URL.
- **The frontmatter schema gains an image field type** for the hero, and the registry gains a gallery
  component, so hero and gallery placements are first-class.
- **New admin actions** for media, covering upload, replace, delete, and the list-and-usage read.
- A per-site setup step adds the R2 bucket and the Cloudflare Images binding. `cairn-doctor` gains a
  check for both, so a missing binding is a named condition rather than a silent failure, and the
  changelog carries the `Consumers must:` line when the feature ships to a site.

## UX

The authored experience is the rev.2 mockup; this section names the load-bearing pieces. Panels cited
are in the mockup.

- **One insert entry point.** A visible labeled Insert button, plus slash, paste, and drag, all open
  the same at-caret popover, which routes by intent to the stored picker, the embed paste-and-resolve,
  or the icon picker. The author never names a bucket.
- **The stored picker.** A combobox over a listbox: focus stays in the search input, a live
  `aria-activedescendant` moves through real `option` rows (never `list`/`listitem` on interactive
  cards), search runs across filename, alt, and caption. The upload affordance (a drop zone and a
  choose-file button) holds persistent primary placement. Each row carries a thumbnail, the name, a
  "found in N" or "no references found" pill, and a "needs alt" flag.
- **The capture card.** One step takes the file, a slug-proposed editable name (never `image.png`, with
  a "Suggested" tag), and alt as a required-or-decorative radiogroup. Insert is disabled until alt is
  resolved and the disabled button names the reason. The optimistic placeholder lands at the caret with
  determinate progress; a failure shows inline with a retry; the dedup sequence runs in the right
  order (the placeholder appears, the hash resolves, then it commits or collapses to "reused
  existing").
- **The three placements.** Inline `![alt](media:...)`; a hero field in the frontmatter side panel
  with its own alt and a preview; a gallery component with ordered tiles where caption and alt are
  separate fields per tile.
- **The management screen.** A first-class Media screen, a peer of Posts and Pages: the grid (roving
  listbox), an organize rail (folders and tags as metadata, never physical moves), search, pagination,
  bulk select with real focusable checkboxes, and an asset detail panel showing usage by placement
  kind, replace-in-place, and the type-to-confirm safe-delete alertdialog.
- **One library component, two mounts.** The popover for insertion and the screen for management share
  the same row design and affordances, so behavior never drifts.
- **Embeds and icons.** Reachable from the chooser. An embed is a directive with an oEmbed resolve and
  a bookmark-card fallback; an icon opens the existing curated picker. Neither appears in the
  stored-files grid.

## Image states to design and test

Upload in progress; upload failure (oversize, wrong type, network, binding missing), each with a
retry; drag-and-drop with a guarded drop target; paste from the clipboard becoming a named asset;
large library with search and pagination; empty-library first run; alt capture (required or
decorative); naming at insert; replace-in-place; delete with a usage check; dedup on upload; a HEIC
converting state; and the messiest real content (long filenames, missing alt, missing dimensions, many
items, one item). Focal point is out of the first surface.

## Accessibility

The combobox is a real combobox over a listbox with a live active-descendant and focus held in the
input. Alt capture is a `role="radiogroup"` of real radios. The results grid is a roving listbox, the
icon pane is its own grid container (not a grid nested in the stored listbox), and two separate live
regions keep the result count from clobbering the active-row narration. Safe-delete is an
`alertdialog`. State carries a glyph or a label, never hue alone, and muted text never stacks opacity.

## Scope and phasing

The subsystem is large, so it ships as a plan series sized by verification surface. The phase cut:

1. **Foundation (this plan).** The engine substrate with no admin UI: the grown `AssetConfig`, the
   `media:` reference codec, content-hash naming and the slugify-on-ingest transform, the media
   manifest schema with read and write, an R2 client wrapper, the Cloudflare Images URL builder with
   named variants, the delivery resolution of `media:` to a URL, the dedup-by-hash logic, and the
   `media.*` log events. Verified by unit and integration tests with R2 and Cloudflare Images mocked,
   plus the delivery resolution proven in the render path. Two narrow spikes land inside this phase:
   the delivery route shape (a Worker route versus an R2 custom domain) and the Cloudflare Images
   wiring against a real bucket.
2. **The insert experience.** The at-caret popover, the combobox picker, the capture card with the
   name and alt model, the upload admin action, the optimistic upload loop, dedup, and the inline
   placement. The first author-visible slice.
3. **Placements.** The hero frontmatter field and the gallery component, and the alt model carried
   across all three placements.
4. **Management and the differentiator.** The Media screen, organize, search, pagination, bulk, the
   branch-spanning usage index, replace-in-place, and safe-delete. The biggest engine lift and the
   feature that beats the field.
5. **Referenced media and tokens.** The embed directive (oEmbed resolve and bookmark fallback) and the
   chooser routing to the icon picker.

Each phase is test-first, executed by `cairn-implementer` with the full gate between dispatches,
closes with the reviewer fan-out and the docs dimension, and the phases that land admin UI carry the
`frontend-design` polish pass against the gold standard. Documents ride the same stored-files substrate
as a fast follow once images land; the foundation stores any binary, and images are the first surfaced
type. Self-hosted video and the manual focal-point control stay out of the series for now.

## Test plan

The standing gate is unchanged: `npm run check` 0/0, `npm test` exit 0, the reference, signature,
package, prose, and readiness gates green, and the showcase E2E in a real browser for the phases that
add a flow. Phase 1 adds unit tests for the reference codec, the naming and slugify transform, the
Cloudflare Images URL builder, the resolver, the manifest read and write, and the dedup logic, plus an
integration test that the render path resolves a `media:` reference to the expected delivery URL. R2
and Cloudflare Images are mocked in unit tests; the spikes prove the live wiring once.

## Documentation dimension

A reference page for the grown `AssetConfig` and the `media:` scheme; a guide for adding and placing an
image; an explanation page for the storage model (why R2 and a logical reference, not images in git);
the `media.*` rows in `docs/reference/log-events.md`; and the `cairn-doctor` readiness entries for the
R2 and Cloudflare Images bindings. A public-API change is not done until its reference page matches,
and the two automated gates (`check:reference`, `check:package`) back it.

## Deferred and out of scope

The manual focal-point and crop control (Cloudflare Images smart crop covers the default). A
self-hosted video pipeline (video is referenced, not stored). Documents are in the model but surface
after images. A cross-cutting "everything referenced in my content" audit view, if ever wanted, is a
separate read-only surface, not the media library.

## Foundation spike: findings (resolved 2026-06-15)

The two narrow spikes the methodology flagged ran in the foundation phase (plan task 8) against the
live `glw907` Cloudflare account. They settle the open questions.

### Delivery route: a Worker route that streams from R2

The delivery route is a Worker route that resolves the content hash and streams the object from R2,
chosen over an R2 custom domain and over Cloudflare Images serving the bytes directly. The URL shape
decides it. cairn's public path carries the cosmetic slug (`/media/<slug>.<hash>.<ext>`) while the R2
object key is the content-addressed fan-out (`media/<aa>/<hash>.<ext>`), and the two are deliberately
different so a rename never moves the bytes. Only a Worker route bridges them: it reads the hash out of
the public path, maps it to the R2 key, and streams. An R2 custom domain would serve the raw key,
forcing the slug into the key and losing the rename-stable property. Cloudflare Images serving directly
means storing the bytes inside the Images product behind an `imagedelivery.net` URL, which contradicts
the locked bytes-in-R2 decision and reintroduces the lock-in the logical reference exists to defeat.
The Worker route also owns the response, so it sets the one-year immutable cache and answers a
conditional GET. Responsive variants then run as Cloudflare Images URL transforms over that same route,
the `/cdn-cgi/image/<options>/media/<slug>.<hash>.<ext>` form the transform-url builder already emits.
`publicPath` and `r2Key` already encode this split, so the foundation carries the decision with no
change.

### Cost: within the Cloudflare Images free tier for both sites

Transforming images stored outside Images (the R2 case) is on the Images Free plan, which includes
5,000 unique transformations per month at no charge. A unique transformation is one
source-plus-options combination, cached long-term once served; past 5,000 a new transform returns
`9422` and the cache keeps serving, with no overage charge on Free. Past the cap a brand-new variant returns a
`9422` error; the `onerror=redirect` option can soften that to serving the original full-size image.
Either way the cap's failure mode is a degraded image, not a charge, so the delivery-route phase should
account for it. Both production sites are small and the four named presets bound the option-sets, so the
monthly unique-transform count sits far below the ceiling. R2 adds little (zero egress, storage at a fraction of a cent per gigabyte-month, a few class-A
writes per upload), and delivery rides the site's existing Worker. The running cost is effectively zero
for both sites, which confirms the research call to lean on Cloudflare Images rather than hand-roll a
transform.

### Live proof and what rides the site wiring

The storage half is proven live. A content-addressed put under `media/<aa>/<hash>.<ext>` and a get
round-tripped byte-identical against a throwaway bucket, and a missing key returned not-found (the
store wrapper's null path). The bucket was provisioned and removed through the Cloudflare MCP, leaving
no residue. The transform half is not proven live this phase, by design: URL transforms need the
per-zone `Transformations` setting, which is site wiring the foundation does not do. A read-only probe
found `907.life` returns 404 on a `/cdn-cgi/image/` path today, so transformations are not yet enabled
there, and the R2/Workers-scoped token cannot read or flip a zone setting. The end-to-end transform
proof rides the first site wiring, when a zone has transformations on and the `/media/*` route is
mounted. `cairn-doctor` gains a readiness check for the R2 binding and the per-zone transformations
setting at that point, a plan carry-forward.

### Manifest home and shape (settled in the plan)

The media manifest is a separate `src/content/.cairn/media.json` beside the content manifest, keyed by
the 16-hex content-hash prefix, not an extension of the content manifest. The foundation plan settled
this and `src/lib/media/manifest.ts` implements it.
