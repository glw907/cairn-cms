# cairn media gallery, Phase 3c: the admin Media Library

Date: 2026-06-17. Status: designed and approved (Geoff, 2026-06-17). The design ran the full
mockup-first methodology: a strengths-and-deficiencies study of roughly thirteen competitor media
libraries grounded in real user feedback, three divergent UI mockups, an adversarial UI critique that
picked a direction and the grafts, an adversarial backend-feasibility review that validated the backend
and caught three places the UI over-promised, and an adversarial review of this spec that corrected three
backend claims and locked the open decisions below. This is the third slice of Phase 3, after 3a (the
inline figure) and 3b (the hero field), and it is the management half of the umbrella gallery spec
(`2026-06-15-cairn-media-gallery-design.md`).

## Summary

The Media Library is a first-class admin screen, a peer of Posts and Pages, whose only job is to manage
the site's media. An admin browses every committed asset, sees where each one is used, edits its name and
its default alt, and deletes it safely. It is admin-only. The public site renders no gallery. The content
placements the site does consume already shipped: the inline figure (3a) and the hero (3b).

The screen leads with a visual contact-sheet grid for the everyday job of finding an image, with a
list-density toggle for scanning and for documents. The headline payoffs are where-used and safe-delete,
the capability every competitor lacks or paywalls, which cairn gets nearly for free from its git
substrate. A detail slide-over carries the preview, the alt editor, the grouped where-used list, and the
actions.

## What this is not

cairn stays lean and not WYSIWYG. The Library reflects that.

- **Not a content gallery.** A forward-facing gallery component is out of scope by decision. Those vary
  too much for one standard component, a developer builds their own over the public delivery surface, and
  core stays lean. The site consumes inline figures and the hero, never a gallery.
- **Not a DAM.** No AI auto-tagging or semantic search, no transform-URL service as a core feature, no
  asset RBAC or moderation or rights management, no multi-source upload widget, no in-browser image
  editor, no video hosting. These justify a dedicated DAM's price and weight and fight a lean tool.
- **Not WYSIWYG.** The screen edits asset metadata (name, default alt) and files (delete). It never
  manipulates rendered output. A where-used entry is a navigation link to that entry's editor, never an
  inline edit of a placement.
- **Not folders.** Organization is search plus a triage filter. Folders break at scale even for the
  leaders and add hierarchy-management burden; tags are deferred until a real site asks.

## The design exploration and what it settled

The design reference (`docs/internal/design/2026-06-17-media-library-design-reference.md`) holds the
research and the verdict: among CMS libraries Storyblok's Asset Manager is the most complete, Sanity's new
Media Library has the strongest feature set but is Enterprise-gated, Sveltia is the best git-backed CMS
library, and Cloudinary is the best DAM but too heavy. The single loudest signal across the field is that
"where is this asset used" plus a trustworthy safe-delete is universally requested and universally missing
or paywalled. cairn's content-in-git substrate answers it cheaply, which makes it the differentiator to
build around.

Three rendered mockups explored the screen: A, the office list (consistency with Posts and Pages); B, the
contact-sheet grid with a live detail panel (visual-first); C, usage-first and cleanup-forward (the
differentiator as the spine). An adversarial UI critic chose B as the base, because the most common task
is recognizing an image and only a grid of real thumbnails serves it, and grafted A's office-native chrome
and its enriched list-density row plus C's branch-grouped where-used and its two-faced safe-delete. The
critic demoted the cleanup differentiator from C's standing dashboard to a triage filter, a per-asset
detail, and the delete gate, and cut multi-select, bulk actions, tags, and the dashboard from the first
slice. The consolidated result is the polished mockup
(`docs/internal/design/2026-06-17-media-library-mockup.html`). The mockup renders a Replace control and a
document row for completeness; the first slice ships neither (Replace is deferred per decision 7, documents
ride the hidden type-facet seam per decision 9).

An adversarial backend-feasibility review then ran the implied backend through the real code, and an
adversarial spec review verified each load-bearing claim. Together they confirmed the architecture is
buildable on existing primitives, with one architectural risk (the cross-branch usage index) and a set of
corrections now locked in the decisions below rather than left for the build to discover.

## Locked decisions

1. **A first-class admin view at `/admin/media`.** The Library registers through the single-mount admin
   dispatch as a new view, a peer of Posts and Pages under the Content nav group. It is an office route
   (the sidebar and the topbar), never a desk route. `media` is a view in its own right, reached through
   the single-segment branch of the admin path parser, not a reserved no-view segment.

2. **A visual grid by default, a list-density toggle for scanning and documents.** The resting surface is
   a responsive contact-sheet grid at full content width: a roving-tabindex listbox of tiles, each tile an
   image shown with `object-fit: contain` on a quiet mat so no crop hides which image it is, the name in a
   footer, an alt-status glyph carrying an accessible name, and a compact usage marker. The toggle flips to
   an enriched real table (the office-list row): thumbnail, name and metadata, the alt-status chip, the
   usage pill, a sortable Added column, and an always-visible per-row delete. The loader returns the full
   projected list (a git-backed site holds modest counts), so the grid paginates client-side with a
   growing visible window and an announced "Showing N of M" count, never infinite scroll. Search and the
   triage filter run over the full set.

3. **A non-modal detail slide-over.** Activating a tile or row opens the established details-slide-over
   recipe from the right: no scrim, focus moves in and out, Escape closes, focus returns to the origin. It
   is not a permanent panel and not a separate route. It holds the large preview, the name and the `media:`
   reference, the alt editor, the where-used list, the metadata, and the actions.

4. **Where-used, the headline, computed by hash across branches.** The usage index is one in-memory map
   from content hash to the distinct entries that use it, computed once in the loader. It indexes by the
   content hash, the immutable truth, never by the cosmetic slug, so a bare-hash reference and a renamed
   slug both resolve. It reads two reference sites per entry: body image nodes (which also covers the 3a
   figure, since the figure directive wraps a real image node) and the frontmatter hero `image.src`. The
   frontmatter site is load-bearing: a hero lives in frontmatter, not the markdown body, so an extractor
   that visits only body image nodes would read every in-use hero as orphaned and let safe-delete remove an
   in-use image. This is a new mdast `image`-node visitor plus a frontmatter walk, not a reuse of the
   existing `cairn:` link extractor (which visits `link` nodes only).

   The two sides of the union have different sources. `main` rides the content manifest: `manifestEntryFromFile`
   gains a media-references field per entry, recorded the same way it already records inbound links, so the
   common case is a single manifest read with no per-file crawl. The branch delta parses the raw markdown
   of the one edited entry on each open `cairn/<concept>/<id>` branch (the entry path is reconstructable
   from the branch name, so no per-branch tree listing is needed); the content manifest is never committed
   to a branch, so the branch arm reads the entry markdown directly, not a manifest. The verdict counts
   distinct entries: an asset used twice in one entry is one row, labeled with its most specific location.
   The verdict text carries the raw-HTML caveat: a reference hidden inside a raw-HTML block is undetectable,
   so the wording stays "found in N entries" or "no references found", never a bare "unused".

5. **Safe-delete, gated on a fresh usage read.** Deleting an asset removes its `media.json` row and its R2
   object. The action is a two-faced alertdialog with no light dismiss: an in-use asset names the entries
   that would break (grouped published first, then by branch) and requires typing the slug to confirm; an
   orphan gets a calm confirm noting that git history makes the delete recoverable. The gate rechecks usage
   server-side against a fresh index read at delete time, never a client-passed count, the same way the
   entry delete rechecks inbound links. The order is commit the manifest delete first, then delete the R2
   object, because the failure window then leaves bytes with no row (a benign orphan) rather than a row
   pointing at deleted bytes (a broken delivery). The delete emits the existing `media.deleted` event, and
   an in-use refusal emits the existing `media.delete_blocked` event (both are already in the log
   vocabulary; this wires emitters, it does not add events). A destructive orphan-collection sweep (wiring
   `reconcileMedia` to delete stray objects in bulk) is out of scope: `reconcileMedia` stays read-only in
   3c, and the per-asset safe-delete is the only delete path. Bulk orphan collection is deferred, matching
   the reconcile module's own deferral.

6. **Rename is cheap and safe; alt editing sets the default.** The resolver builds the delivery path from
   the manifest entry's slug and the route keys on the hash, so editing an asset's display name (and slug)
   never breaks an existing reference. Rename is a single `media.json` row commit with no reference rewrite.
   Alt editing in the Library sets the asset's default alt, the value prefilled into a new placement, not a
   rewrite of the alt already committed in existing placements. The asset alt and the per-placement alt are
   distinct: the per-placement alt (the inline `![alt]` text, the hero `image.alt`) is what the public site
   renders, and the asset alt is the default for the next insert. The detail panel labels the field as the
   default so it never implies live propagation. Propagating an alt fix to every existing use is the same
   cross-branch rewrite as replace, and it is deferred with replace.

7. **Replace-in-place is deferred to a fast-follow.** Content-hash naming makes new bytes a new hash and a
   new reference, so a literal in-place swap that keeps the reference is infeasible across edit branches
   without an N-branch repoint that conflicts with live drafts. The interim path is re-inserting the new
   image, after which the old asset becomes an orphan the Library safe-deletes. The fast-follow, once the
   usage index and safe-delete are proven, is an upload-new-plus-repoint scoped to `main` with a
   branch-delta report. The first slice ships no Replace control.

8. **The loader unions main with open branches, and the projection is shared.** `mediaLibraryLoad` reads
   `media.json` from `main` and from every open `cairn/*` branch, and unions the rows by hash, so a
   freshly-uploaded asset that lives only on a draft branch (the common 2b case, since an upload commits to
   the entry's branch and is promoted to main only at publish) still appears in the Library. Without the
   union, "browse every committed asset" and the safe-delete story would both silently miss every
   not-yet-published image. The usage index (decision 4) is computed in the same loader so the grid's usage
   pills are correct at first render; the safe-delete gate re-reads fresh regardless. The `MediaEntry` to
   `MediaLibraryEntry` projection is factored into one pure helper that both `editLoad` and
   `mediaLibraryLoad` call, and `MediaLibraryEntry` gains `createdAt` (already on the source `MediaEntry`)
   for the sortable Added column; this is a shared-type change that updates both call sites. The usage count
   and the needs-alt signal ride as a separate per-hash overlay the screen joins, so the insert popover
   stays decoupled and never computes usage. The Library grid and the 2b popover keep different ARIA models
   on purpose (the popover is a combobox, the screen is a roving listbox), sharing the row vocabulary, the
   `publicPath(...'slug')` thumbnail, the needs-alt marker, and the type-facet seam, not one widget.

9. **A lean first slice.** No multi-select, no bulk actions, no tags or folders, no standing triage
   dashboard. The triage filter (All, Needs alt, Unused, with live counts) carries the cleanup affordance
   at the right size. The type facet (Images, Documents) stays hidden until the library holds more than one
   type; the first slice ships images-first (the delivery route's allowed extensions are image-only today,
   so documents are further off than the mockup's seam row implies). An asset whose `media.json` row exists
   but whose R2 object is missing still lists, with a broken-image affordance, and safe-deletes through the
   orphan (calm) face, so the one screen whose job is hygiene can clear the dead row.

## The pieces

### 1. The screen

The grid is the default, full content width, the office header recipe above it (the Media eyebrow, the
"Media library" heading, a live count, the Upload primary action), then one toolbar row holding search,
the triage segmented control, and the grid/list density toggle. The grid is a roving-tabindex listbox: a
visible focus ring per tile, a real accessible name per tile, space or enter to open the detail, and
selection announced. Search spans the name, the alt, and the caption over the full projected set. The
triage control is a pick-one radiogroup (`aria-checked`, never `aria-pressed`). The list density is a real
table whose rows open the detail through a real link or button and whose sortable headers are real buttons
in `<th>` with `aria-sort`. Pagination is client-side over the full list (a growing visible window). The
empty state owns the content area with the office recipe and the Upload call to action, and the triage and
search stay hidden until there is content.

### 2. The detail slide-over

A non-modal slide-over, top to bottom: a large preview, the name and the `media:` reference, the alt
editor (a describe-or-decorative radiogroup that replicates the 2b capture-card alt model plus the alt
field, alt as debt, never gated, labeled as the asset default), the where-used list grouped under
"Published on the site" and "In an unpublished edit" with each entry a link and an edit-branch entry naming
its branch, the metadata grid, and the actions (Delete and Rename in the first slice; Replace lands in the
fast-follow). Below the narrow breakpoint it becomes a bottom sheet, a rare surface rather than the
everyday one.

### 3. The where-used usage index

The index is a single in-memory map from content hash to the list of distinct entries that use it,
computed once in the loader. `main` comes from the content manifest, extended to record media references
per entry (an additive, optional field; see the migration note below). The branch delta parses the one
edited entry's raw markdown on each open `cairn/*` branch (the path derived from the branch name), reading
its hero `image.src` and its body image nodes. Every match is keyed by the parsed hash. The grid renders
its per-asset pills from this one map; the delete gate re-reads a fresh index at delete time.

The content-manifest media-references field is additive and optional: an existing manifest without it
parses and builds (the field defaults to empty), so the engine does not force a hard cutover. A site's
`main` where-used is accurate only after it regenerates and commits its manifest, so regeneration is
recommended at upgrade and the changelog carries that note. The showcase manifest is regenerated in the
same pass so the suite exercises a populated index.

### 4. Safe-delete

The action removes the row and the object as decision 5 describes. A `removeMediaEntry` manifest helper
mirrors the existing upsert, the commit reuses the existing multi-file commit primitive (which already
supports a delete through a null tree entry), and the R2 delete reuses the store wrapper. The existing
`media.deleted` and `media.delete_blocked` events are emitted at the new call sites, and the reference
table is confirmed to cover them.

### 5. Rename and default-alt edit

A single action edits the `media.json` row (the display name, the slug, the default alt) and commits the
merged manifest. No reference rewrite runs (the resolver and route key on the hash). The detail labels the
alt field as the default for new placements.

### 6. The shared projection and the admin view

The `MediaEntry` to `MediaLibraryEntry` projection is a pure helper called by both `editLoad` and the new
`mediaLibraryLoad`; `MediaLibraryEntry` gains `createdAt`. `mediaLibraryLoad` reads `media.json` from
`main` and every open `cairn/*` branch, unions by hash, computes the usage overlay, and returns the
projected list plus the overlay. A new `media` admin view registers across the single-mount dispatch and
composer: the `AdminView` union and the single-segment branch of the path parser in `admin-dispatch.ts`,
and in `cairn-admin.ts` the `AdminData` variant, a `load` case that runs the layout load concurrently with
`mediaLibraryLoad` (mirroring the editors arm), the management actions, and the `authedViews` and `anyView`
membership so the topbar's publish-all and logout work from the screen. `media` is its own view, so it is
not added to the reserved-no-view segment set.

## Engine and contract changes

- A `media` admin view and a `mediaLibraryLoad` (the main-plus-branches union), plus the media management
  actions (delete, rename and default-alt edit), registered through the single-mount admin dispatch and
  composer at the touch points named in §6.
- The content manifest gains an additive, optional media-references field per entry, extracted by a new
  `image`-node-plus-frontmatter visitor, populated by `manifestEntryFromFile` and exercised by the verify
  and regenerate paths. An existing manifest without the field still parses and builds.
- A cross-branch usage index helper, hash-keyed, reading `main` from the manifest and each open branch's
  edited entry markdown (body images plus the frontmatter hero), counting distinct entries.
- A `removeMediaEntry` manifest helper and the delete action (commit first, then R2 delete), gated on a
  fresh server-side usage read, emitting the existing `media.deleted` and `media.delete_blocked` events.
- A rename and default-alt action (a `media.json` row commit, no reference rewrite).
- `MediaLibraryEntry` gains `createdAt`; a shared `MediaEntry` to `MediaLibraryEntry` helper updates both
  `editLoad` and `mediaLibraryLoad`; the usage and needs-alt overlay rides alongside it, keeping the
  shared projection clean for the popover.

The render output is unchanged (the Library is admin-only). The per-site consumer action: the R2 bucket
and the `/media` route are already required by the bundled media release, and the Library adds no new
binding. The content-manifest field is additive, so a site builds without change; to get accurate `main`
where-used, a site regenerates and commits its content manifest (`cairn-manifest`). The changelog carries
that recommended step.

## Accessibility

The grid is a roving listbox with real per-tile names, space or enter activation, a visible focus ring,
focus preserved across filtering, and selection announced. The list is a real table with real link or
button rows and sortable header buttons carrying `aria-sort`. The triage control is a radiogroup with
`aria-checked`. The slide-over is non-modal with focus moving in and out, Escape to close, and focus
return, and no scrim. Safe-delete is an alertdialog with no light dismiss. There is no infinite scroll;
the load-more announces its count. The alt-status inks are the contrast-verified `--color-positive-ink`,
`--cairn-warning-ink`, and `--color-muted`, each a glyph plus a label, never hue alone.

## Verification

The standing gate holds: `npm run check` 0/0, `npm test` exit 0, and the reference, package, docs,
readiness, and prose gates green. Unit tests cover the usage index (body and frontmatter-hero extraction,
hash-keying, the `main`-manifest plus branch-entry union, the distinct-entry count, the raw-HTML miss, an
asset referenced twice in one entry), the loader union (a branch-only not-yet-published asset appears; a
missing-R2-object row still lists), the safe-delete gate (in-use refusal, the orphan confirm, the
commit-first ordering, the fresh-read recheck), `removeMediaEntry`, the rename and default-alt action, and
the shared projection with `createdAt`. Component tests cover the screen (the grid, the list density, the
detail slide-over, the triage radiogroup, the safe-delete alertdialog, the empty state, a missing-bytes
row). A showcase E2E (the seventeenth spec) extends the slice: browse the Library, open a detail, read the
grouped where-used, edit the default alt and the name, safe-delete an orphan, and hit the in-use refusal.
The build carries the `frontend-design` consolidated mockup (done) and a polish pass over the real rendered
screen in both themes.

## Documentation dimension

A guide for managing the media library; the admin-design-system recipe for the Library screen; the
reference for the new admin route, the actions, and the usage index; the explanation arm for where-used
from git, the safe-delete model, and the asset-default-alt versus per-placement-alt distinction; the
changelog (including the recommended content-manifest regeneration) and the upgrade-guide entries; the
`log-events` table confirmed to cover the wired events; and the three doc gates.

## Build sequencing

The usage index and the content-manifest media-references field are the high-blast-radius piece: they
touch the committed manifest shape that two production sites and the showcase carry, and the manifest build
gate. The plan sequences them first and lands them green on their own (the additive manifest field, the new
extractor, the index helper, `removeMediaEntry`, all under unit tests, with the showcase manifest
regenerated), before the screen, the slide-over, and the safe-delete UI build on top. This keeps the
correctness core verifiable before any UI depends on it.

## Deferred

- **Replace-in-place** (the fast-follow: upload-new plus a `main`-only repoint with a branch-delta report).
- **Propagating an alt fix to every existing use** (the same cross-branch rewrite as replace).
- **Bulk select and bulk actions.** Single-asset safe-delete covers the real need at these counts.
- **A destructive orphan-collection sweep** (wiring `reconcileMedia` to bulk-delete stray objects);
  `reconcileMedia` stays read-only in 3c.
- **Tags and organization.** The triage filter plus search is enough; add tags only if a site asks.
- **The broadened needs-alt scanner** (filename-as-alt, generic words, duplicates) beyond the empty-alt
  signal.
- **Documents as a fully surfaced type** beyond the facet seam (the delivery route is image-only today).
- **AI, transform, and governance DAM features**, by principle, never in core.

## Open risks carried into the build

1. **The usage index, latency and correctness.** The frontmatter-hero extraction is the correctness
   landmine, hash-keying and counting distinct entries are the correctness rules, and the
   manifest-for-main plus one-entry-per-branch read is the latency mitigation. The build confirms the index
   is computed once in the loader and the grid never crawls per asset.
2. **The branch union and the not-yet-published asset.** The loader must read `media.json` from open
   branches, not only `main`, or every just-uploaded image is invisible. The build tests a branch-only
   asset and a missing-R2-object row.
3. **The content-manifest migration.** The media-references field is additive and optional so no build
   breaks, but `main` where-used is empty until a site regenerates; the build keeps the reader lenient,
   regenerates the showcase manifest, and the changelog states the recommended regeneration.
4. **The safe-delete ordering and gate.** Commit the manifest first, delete the object second, recheck
   usage server-side against a fresh read at delete time, and emit the existing events.
5. **The admin-view registration.** The single-mount dispatch and composer have several touch points (the
   view union, the single-segment parser branch, the data variant, the load case, the actions, the
   authed-view membership); all must be hit or the view is silently unreachable or untyped.
6. **The alt model clarity.** The detail copy presents the alt as the asset default, never as a propagating
   edit, so an author is not misled into thinking a Library alt change rewrites live pages.
