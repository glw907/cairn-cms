# cairn media gallery, Phase 3c: the admin Media Library

Date: 2026-06-17. Status: designed and approved (Geoff, 2026-06-17). The design ran the full
mockup-first methodology: a strengths-and-deficiencies study of roughly thirteen competitor media
libraries grounded in real user feedback, three divergent UI mockups, an adversarial UI critique that
picked a direction and the grafts, and an adversarial backend-feasibility review that validated the
backend and caught three places the UI over-promised. This is the third slice of Phase 3, after 3a (the
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
research and the verdict: among CMS libraries Storyblok's Asset Manager is the most complete,
Sanity's new Media Library has the strongest feature set but is Enterprise-gated, Sveltia is the best
git-backed CMS library, and Cloudinary is the best DAM but too heavy. The single loudest signal across
the field is that "where is this asset used" plus a trustworthy safe-delete is universally requested and
universally missing or paywalled. cairn's content-in-git substrate answers it cheaply, which makes it the
differentiator to build around.

Three rendered mockups explored the screen: A, the office list (consistency with Posts and Pages); B, the
contact-sheet grid with a live detail panel (visual-first); C, usage-first and cleanup-forward (the
differentiator as the spine). An adversarial UI critic chose B as the base, because the most common task
is recognizing an image and only a grid of real thumbnails serves it, and grafted A's office-native chrome
and its enriched list-density row plus C's branch-grouped where-used and its two-faced safe-delete. The
critic demoted the cleanup differentiator from C's standing dashboard to a triage filter, a per-asset
detail, and the delete gate, and cut multi-select, bulk actions, tags, and the dashboard from the first
slice. The consolidated result is the polished mockup
(`docs/internal/design/2026-06-17-media-library-mockup.html`).

An adversarial backend-feasibility review then ran the implied backend through the real code. It confirmed
every capability is buildable on existing primitives, with one architectural risk (the cross-branch usage
index) and three places the UI over-promised. Those findings are locked below as required hardening and as
scope adjustments, rather than left for the build to discover.

## Locked decisions

1. **A first-class admin view at `/admin/media`.** The Library registers through the single-mount admin
   dispatch as a new view, a peer of Posts and Pages under the Content nav group. It is an office route
   (the sidebar and the topbar), never a desk route.

2. **A visual grid by default, a list-density toggle for scanning and documents.** The resting surface is
   a responsive contact-sheet grid at full content width: a roving-tabindex listbox of tiles, each tile an
   image shown with `object-fit: contain` on a quiet mat so no crop hides which image it is, the name in a
   footer, an alt-status glyph carrying an accessible name, and a compact usage marker. The toggle flips to
   an enriched real table (the office-list row): thumbnail, name and metadata, the alt-status chip, the
   usage pill, a sortable Added column, and an always-visible per-row delete. Browsing uses a managed
   load-more with an announced count, never infinite scroll.

3. **A non-modal detail slide-over.** Activating a tile or row opens the established details-slide-over
   recipe from the right: no scrim, focus moves in and out, Escape closes, focus returns to the origin. It
   is not a permanent panel and not a separate route. It holds the large preview, the name and the `media:`
   reference, the alt editor, the where-used list, the metadata, and the actions.

4. **Where-used, the headline, computed by hash across branches.** The usage index unions committed `main`
   with every open `cairn/<concept>/<id>` edit branch and reports "found in N entries" or "no references
   found" per asset. It indexes by the content hash, the immutable truth, never by the cosmetic slug, so a
   bare-hash reference and a renamed slug both resolve. `main`'s index rides the content manifest, which is
   extended to record each entry's media references the same way it already records inbound links, so the
   common case is a single manifest read with no per-file crawl. The branch delta is a bounded read of one
   edited entry per open branch, keyed off the branch name. The extractor reads two reference sites: body
   image nodes (which also covers the 3a figure, since it wraps a real image node) and the frontmatter hero
   `image.src`. The frontmatter site is load-bearing: a hero lives in frontmatter, not the markdown body,
   so an extractor that visits only body image nodes would read every in-use hero as orphaned and let
   safe-delete remove an in-use image. The verdict text carries the raw-HTML caveat: a reference hidden
   inside a raw-HTML block is undetectable, so the wording stays "found in N entries" or "no references
   found", never a bare "unused".

5. **Safe-delete, gated on a fresh usage read.** Deleting an asset removes its `media.json` row and its R2
   object. The action is a two-faced alertdialog with no light dismiss: an in-use asset names the entries
   that would break (grouped published first, then by branch) and requires typing the slug to confirm; an
   orphan gets a calm confirm noting that git history makes the delete recoverable. The gate rechecks usage
   server-side against a fresh index read at delete time, never a client-passed count, the same way the
   entry delete rechecks inbound links. The order is commit the manifest delete first, then delete the R2
   object, because the failure window then leaves bytes with no row (a benign orphan the reconcile sweeper
   collects) rather than a row pointing at deleted bytes (a broken delivery). `reconcileMedia`, which
   exists but has no caller today, gets its first caller as the orphan sweeper.

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
   branch-delta report.

8. **One picker, two mounts means a shared vocabulary, not one widget.** The Library grid and the 2b
   insert popover share the `MediaLibraryEntry` data projection, the `publicPath(...'slug')` thumbnail, the
   needs-alt marker, and the type-facet seam, so they read as one family. They keep different ARIA models
   on purpose: the popover is a combobox over a one-line input, the screen is a two-dimensional roving
   listbox. The usage count and the needs-alt signal ride as a separate per-hash overlay the screen joins,
   so the popover stays decoupled and never computes usage. `MediaLibraryEntry` gains `createdAt` (already
   on the source `MediaEntry`) for the sortable Added column.

9. **A lean first slice.** No multi-select, no bulk actions, no tags or folders, no standing triage
   dashboard. The triage filter (All, Needs alt, Unused, with live counts) carries the cleanup affordance
   at the right size. The type facet (Images, Documents) stays hidden until the library holds more than one
   type; shipping images-first is acceptable, with documents riding the seam.

## The pieces

### 1. The screen

The grid is the default, full content width, the office header recipe above it (the Media eyebrow, the
"Media library" heading, a live count, the Upload primary action), then one toolbar row holding search,
the triage segmented control, and the grid/list density toggle. The grid is a roving-tabindex listbox: a
visible focus ring per tile, a real accessible name per tile, space or enter to open the detail, and
selection announced. Search spans the name, the alt, and the caption over the loaded set. The triage
control is a pick-one radiogroup (`aria-checked`, never `aria-pressed`). The list density is a real table
whose rows open the detail through a real link or button and whose sortable headers are real buttons in
`<th>` with `aria-sort`. The empty state owns the content area with the office recipe and the Upload call
to action, and the triage and search stay hidden until there is content.

### 2. The detail slide-over

A non-modal slide-over, top to bottom: a large preview, the name and the `media:` reference, the alt
editor (a describe-or-decorative radiogroup that replicates the 2b capture-card alt model plus the alt
field, alt as debt, never gated), the where-used list grouped under "Published on the site" and "In an
unpublished edit" with each entry a link and an edit-branch entry naming its branch, the metadata grid,
and the actions (Delete now; Replace lands in the fast-follow). Below the narrow breakpoint it becomes a
bottom sheet, a rare surface rather than the everyday one.

### 3. The where-used usage index

The index is a single in-memory map from content hash to the list of entries that use it, computed once
per screen load. `main` comes from the content manifest, extended to record media references per entry
(a versioned manifest migration, with the verify and regenerate paths updated). The branch delta reads one
edited entry per open `cairn/*` branch and unions it in. The reference extractor parses both body image
nodes and the frontmatter hero `image.src`, and keys every match by the parsed hash. The grid renders its
per-asset pills from this one map and never triggers a per-asset crawl; the branch delta may be deferred to
the detail open or a single deferred load if the initial render needs to stay instant.

### 4. Safe-delete

The action removes the row and the object as decision 5 describes. A `removeMediaEntry` manifest helper
mirrors the existing upsert, the commit reuses the existing multi-file commit primitive (which already
supports a delete), and the R2 delete reuses the store wrapper. A `media.deleted` event joins the log
vocabulary, with a delete-blocked or orphan-reconcile event as the vocabulary already names, and the
reference table is updated in the same pass.

### 5. Rename and default-alt edit

A single action edits the `media.json` row (the display name, the slug, the default alt) and commits the
merged manifest. No reference rewrite runs. The detail labels the alt field as the default for new
placements.

### 6. The shared projection and the admin view

The `editLoad` projection that builds `MediaLibraryEntry` is factored into a shared helper and reused by a
new `mediaLibraryLoad` that reads `main`'s `media.json` once and returns the projected list. A new `media`
admin view registers across the admin dispatch (the view union, the reserved segment, the single-segment
branch) and the admin composer (the load branch, the data variant, the actions), following the same
pattern the existing reserved segments use.

## Engine and contract changes

- A `media` admin view and a `mediaLibraryLoad`, plus the media management actions (delete, rename and
  default-alt edit), registered through the single-mount admin dispatch and composer.
- The content manifest gains a media-references field per entry, a versioned migration, with the verify and
  regenerate paths updated.
- A cross-branch usage index helper, hash-keyed, reading body image nodes and the frontmatter hero, with a
  bounded one-file-per-open-branch crawl.
- A `removeMediaEntry` manifest helper and the delete action (commit first, then R2 delete), gated on a
  fresh server-side usage read.
- `MediaLibraryEntry` gains `createdAt`; the usage and needs-alt overlay rides alongside it, keeping the
  shared projection clean for the popover.
- New log events (`media.deleted` and the delete-blocked or orphan event), with the reference table
  updated.
- `reconcileMedia` gains its first caller as the orphan sweeper.

The render output is unchanged (the Library is admin-only). The per-site consumer action is the same as
the bundled media release (the R2 bucket and the `/media` route are already required); the Library needs
no new per-site wiring beyond what media already required.

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
hash-keying, the `main` plus branch union, the raw-HTML miss), the safe-delete gate (in-use refusal, the
orphan confirm, the commit-first ordering, the fresh-read recheck), `removeMediaEntry`, the rename and
default-alt action, and the list-all loader and projection. Component tests cover the screen (the grid, the
list density, the detail slide-over, the triage radiogroup, the safe-delete alertdialog, the empty state).
A showcase E2E extends the slice: browse the Library, open a detail, read the grouped where-used, edit the
default alt and the name, safe-delete an orphan, and hit the in-use refusal. The build carries the
`frontend-design` consolidated mockup (done) and a polish pass over the real rendered screen in both
themes.

## Documentation dimension

A guide for managing the media library; the admin-design-system recipe for the Library screen; the
reference for the new admin route, the actions, and the usage index; the explanation arm for where-used
from git, the safe-delete model, and the asset-default-alt versus per-placement-alt distinction; the
changelog and upgrade-guide entries; the `log-events` table for the new events; and the three doc gates.

## Deferred

- **Replace-in-place** (the fast-follow: upload-new plus a `main`-only repoint with a branch-delta report).
- **Propagating an alt fix to every existing use** (the same cross-branch rewrite as replace).
- **Bulk select and bulk actions.** Single-asset safe-delete covers the real need at these counts.
- **Tags and organization.** The triage filter plus search is enough; add tags only if a site asks.
- **The broadened needs-alt scanner** (filename-as-alt, generic words, duplicates) beyond the empty-alt
  signal.
- **Documents as a fully surfaced type** beyond the facet seam.
- **AI, transform, and governance DAM features**, by principle, never in core.

## Open risks carried into the build

1. **The usage index, latency and correctness.** The frontmatter-hero extraction is the correctness
   landmine, hash-keying and the bounded branch crawl are the latency mitigations, and the raw-HTML caveat
   is the honesty backstop. The build confirms the index is computed once per load and the grid never
   crawls per asset.
2. **The content-manifest migration.** Adding media references is a versioned change; the verify and
   regenerate paths and a migration of an existing manifest must be handled, the way the manifest version
   field anticipates.
3. **The safe-delete ordering and gate.** Commit the manifest first, delete the object second, and recheck
   usage server-side against a fresh read at delete time.
4. **The admin-view registration.** The single-mount dispatch and composer have several touch points (the
   view union, the reserved segment, the load branch, the data variant, the actions); all must be hit or
   the view is silently unreachable or untyped.
5. **The alt model clarity.** The detail copy must present the alt as the asset default, never as a
   propagating edit, so an author is not misled into thinking a Library alt change rewrites live pages.
