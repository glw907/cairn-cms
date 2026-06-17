# Media Library design reference (Phase 3c)

Date: 2026-06-17. The research-and-verdict ground for the cairn admin Media Library screen, built from a
strengths-and-deficiencies study of competitor media libraries grounded in real user feedback (GitHub
issues, support forums, reviews). It is stage 1 of the mockup-first design pass: it sets what to steal,
what to avoid, and the cairn-specific principles the mockups must honor, before any UI is drawn.

## What 3c is

The admin **Media Library**: a first-class admin screen, a peer of Posts and Pages, whose only job is to
manage the site's media. Browse every committed asset, see where each is used, edit its alt and name,
replace it, and delete it safely. It is admin-only. The public site renders no gallery. The content
placements the site does consume already shipped: the inline figure (3a) and the hero (3b). A
forward-facing gallery is out of scope by decision: those vary too much for a standard component, a
developer builds their own, and cairn core stays lean.

Geoff's framing: "The gallery should just be default UI. Its only purpose is to manage media items for
the site. The site doesn't consume the gallery, it's only for the admin interface." He prefers the term
**library** over gallery. This is UI-forward work: design the best screen consistent with cairn's
principles first, then shape the backend to support it.

## The field: who is best, and why

No competitor is strong on every axis. Each splits into a pipeline layer (transforms, dedup, storage,
focal point), where several excel, and a library layer (organize, search, where-used, insert, a11y),
where almost everyone is mid-tier.

- **Best overall CMS library: Storyblok's Asset Manager.** It is the only CMS that ships the full set of
  library jobs as native, non-gated features in one surface: nested folders and tags, structured and
  translatable metadata, focal-point URL transforms, a native where-used References tab, asset-deletion
  warnings that prevent orphaning, and AI alt-text suggested at upload. Its weaknesses are
  hygiene-at-scale (no auto-cleanup) and team governance, not missing core features.
- **Strongest feature list: Sanity's new Media Library** (AI semantic search, usage tracking with orphan
  detection, versioned replace-in-place). It would win outright but it is Enterprise-gated; the real
  experience for most users is the bare default browser or a crash-prone community plugin.
- **Best git-backed CMS library: Sveltia CMS.** A separate full-screen Asset Library (not just a picker),
  instant GraphQL search, cached thumbnails, rich metadata including a which-entries-use-this list, and a
  real WAI-ARIA accessibility commitment. Its lessons: do not tie features to the git path, do not make
  object storage a late add-on, and skip in-app cropping (a perpetual roadmap sink).
- **Best DAM, if weight and price were no object: Cloudinary.** The transform and AI-search gold standard
  everyone integrates. It is a heavy, costly DAM, and its dominant complaint (opaque pricing, sluggish UI
  at scale) is exactly what a lean tool must avoid.

Best at each sub-job, since they differ: search, Cloudinary (AI visual/semantic); where-used, Contentful
and Storyblok (surfaced in the sidebar and the delete dialog); organization, Storyblok (folders plus tags
plus validated metadata); focal point, Sanity (hotspot/crop, the most-loved editor feature in the study);
insertion, GitHub/Notion/HackMD (paste or drag, optimistic placeholder, the reference written for you);
alt-text a11y, Drupal (required by default with a decorative escape hatch, plus the Editoria11y scanner).

## What cairn should steal

These converge across the strong products and fit a git-backed, admin-only, not-WYSIWYG tool.

- **A separate, full-screen library that is the management surface**, distinct from the at-caret insert
  popover cairn already has (2b). One picker UI, two mounts (the popover for insertion, the screen for
  management), so behavior never drifts. WordPress's deepest self-inflicted wound is two media UIs that
  diverge in capability; avoid it by construction.
- **Where-used, as a headline feature.** The single most-requested, most-missing capability in the whole
  field: WordPress concedes it unsolvable, Decap's plea has 115 reactions, Sanity gates it behind
  Enterprise, Strapi and Payload lack it. cairn knows usage exactly by grepping committed
  `media:<slug>.<hash>` references across `main` and every open `cairn/*` edit branch. Surface it in two
  places the leaders do: a usage list on the asset, and a warning in the delete and replace confirmations
  ("used in 3 entries").
- **Safe-delete gated on usage.** Both incumbents make users fear the delete button (a WordPress review:
  "half our website broke down"; Ghost has no cleanup at all). cairn can refuse or hard-confirm a delete
  of an in-use asset, listing the entries that would break, and offer a light confirm for an orphaned one,
  noting git history makes it recoverable.
- **Replace-in-place that keeps the reference and the metadata** (Storyblok, Strapi). WordPress needs a
  600k-install plugin for this. The logical `media:` reference is the seam: swap the bytes, keep the
  reference. Design around Storyblok's caveat that a resized replacement can drift.
- **Search across name, alt, and caption, never filename-only.** Filename-only search is a complaint in
  WordPress, Decap, Strapi, and Tina. Index the logical slug, the alt, and the caption from the first
  version.
- **Free dedup, surfaced.** Content-hash naming makes identical bytes one stored object by construction
  (Sanity is praised for exactly this). Tell the author "this image is already in your library" rather
  than silently re-pointing.
- **The alt scanner broadened.** cairn's needs-alt scanner (2b) already leads the field. Steal Editoria11y's
  wider net: also flag filename-as-alt, generic alt ("image", "photo"), and duplicates, not just empty.
- **An accessible picker grid**, distilled from WordPress's hard-won fixes: a visible focus ring per tile,
  a real accessible name per tile (not a bare thumbnail), space/enter activation, focus preserved across
  filtering, selection announced, and the asset detail in a focus-trapped panel or dialog with
  focus-return on close.

## What cairn should avoid

- **Infinite scroll.** The clearest accessibility lesson in the study: WordPress removed it after roughly
  eight years and a revolt, because keyboard users cannot reach appended content and position in a grid is
  not announced. Use explicit pagination or a managed load-more with focus handling and announced counts.
- **A flat, all-at-once, unvirtualized grid** (Decap "slows to a crawl" at thousands). Paginate or
  virtualize from the start.
- **Folders as the primary organization model.** Folders break at scale even for Strapi and Sanity and add
  hierarchy-management burden. For an admin-only library with modest counts, tags plus good metadata
  search beat a hierarchy (Contentful chose flat-with-views deliberately). Lean toward searchable metadata.
- **Heavy DAM machinery that justifies a dedicated DAM's price and weight**: AI auto-tagging and semantic
  search, a full on-the-fly transform-URL service as core, moderation and asset RBAC and rights/expiry
  management, a multi-source upload widget (Dropbox/Drive/camera), an in-browser multi-effect image
  editor, and video hosting/transcoding. None fit a lean, git-backed, admin-only markdown tool.
- **Treating alt text and a11y as deferred.** Tina marked dropped-alt Wontfix twice; Pages declined native
  alt; WordPress's two-place non-propagating alt is a documented embarrassment. First-class from day one.

## cairn's structural advantages

The git substrate is an advantage on exactly the jobs the market is weakest at. Where-used is cheap (a
cross-branch grep), and it is Enterprise-gated or absent everywhere else. Dedup is free (content-hash
naming). Safe-delete is trustworthy (usage is exact, and git history makes a delete recoverable). The
alt-as-debt model and the needs-alt scanner already lead the field. The admin-only, not-WYSIWYG, lean-core
constraints mean the screen should be light, with the headline payoffs being where-is-this-used and
is-this-safe-to-delete riding on bookkeeping the substrate already supplies.

## Principles the mockups must honor

- Consistent with the admin design system (Warm Stone, the office/desk gold standard, the eyebrow/card
  recipes, the command palette, the safe-delete alertdialog) in `docs/internal/admin-design-system.md`.
- A peer screen of Posts and Pages, reached from the admin nav, reusing the 2b picker's row design.
- Lean: a light surface, not a cluttered DAM. The headline is where-used and safe-delete.
- Where-used is visible per asset and gates delete and replace.
- Search spans name, alt, and caption. Organization, if any, is tags and metadata, not a folder tree.
- Pagination or a managed load-more, never infinite scroll. The grid is a keyboard- and SR-accessible
  listbox with announced selection.
- Alt is first-class: the detail panel edits it, and the broadened needs-alt signal surfaces it.
- Replace-in-place and rename keep the reference; delete is safe-by-usage.

## Open questions the mockups explore

The screen layout and interaction, which the divergent mockups will diverge on and the critique will
settle: grid versus list as the default; where the asset detail lives (a side panel, a slide-over, a
route); whether and how organization (tags) appears without becoming a folder tree; the search and filter
placement; whether bulk actions are in scope for the first slice; and how the screen relates to the 2b
insert popover (shared row, shared detail). The backend the chosen UI implies (a list-all read, the
cross-branch usage index, and delete/replace/rename actions) is reviewed for feasibility after the UI is
settled, then built to support it.
