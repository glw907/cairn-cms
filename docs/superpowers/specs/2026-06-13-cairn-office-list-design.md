# The office list rises to the gold standard (design)

**Date 2026-06-13. Direction approved by Geoff in the list-view brainstorm (Ghost / WordPress /
Sveltia surveyed for precedent). This spec awaits his read before the plan.**

## Why

The post and page list (the `ConceptList` "office") feels sparse, and the editor-takes-the-shell
pass is the reason it now stands out: the desk reached the declared gold standard while the office
was left at a dressing check, its own design held out of scope. Two gaps make the list thin. Each
row carries only a title, a date, and a status badge, so a row never describes itself the way
Ghost's (thumbnail, author, relative date, view counts) and Sveltia's (thumbnail, a configurable
summary) do. And nothing sits above the table to slice the content: no way to separate drafts from
published from the entries with unpublished edits. With a concept holding a handful of entries,
those two gaps read as whitespace around a few bare rows.

The precedent survey pointed the same way three times over. The affordance every one of Ghost,
WordPress, and Sveltia treats as essential, and the one cairn lacks, is a triage layer: a control
surface that filters the list by state (WordPress's All/Draft/Published tabs with counts, Ghost's
quick filters). The affordance that fills a row is a self-describing summary line. The features all
three carry that fail cairn's lean, opinionated, non-technical-author test are the ones to leave
out: bulk edit, inline quick-edit, saved views, a grid view, author and comment columns, and
analytics.

cairn also holds an edge none of the three fully matches. Its per-entry `cairn/<concept>/<id>`
branch and deliberate Publish give a real per-row state (new, edited, published, hidden) that
Sveltia cannot show at all (its draft/publish workflow is deferred to late 2026) and that
WordPress and Ghost only match. Today that state is a badge and nothing more. It is the natural
organizing principle for the triage layer, and leaning into it is the most cairn-specific move on
the table.

## The design authority: the gold standard, extended

This redesign invents no new aesthetic. The cairn UI gold standard is the editor/desk: the
approved mockup at `docs/internal/design/2026-06-12-editor-shell-gold-standard.html` and the admin
design system (`docs/internal/admin-design-system.md`), now carrying the office/desk context model.
The office inherits that language, finishing the job the shell pass deferred so that the two
contexts read as one visual system.

Concretely, the new elements speak vocabulary that already exists:

- The triage control uses the footer's grammar: the segmented-control and check-and-tint dressing,
  the cluster-rhythm-over-uniform-rows principle, controls dressed as what they are. A count on a
  filter is the quiet treatment of the band's status cluster, not a loud filter bar.
- The rows use the established card (the `--cairn-card-border` hairline plus the `--cairn-shadow`
  soft lift), the Bricolage / IBM Plex Sans / iA Writer Mono type scale, and the eyebrow and
  brand-tile recipes for the empty and few-entry states that started this.
- The Warm Stone palette and both themes (`cairn-admin`, `cairn-admin-dark`) carry over unchanged.

Because the gold standard already fixes the aesthetic, the frontend-design pass is constrained by
design: its job is faithful extension, not a fresh bold direction. The honest way to run it mirrors
how the desk earned its standard. The pass produces an office-list gold-standard mockup in the same
`cairn-admin.css` vocabulary, extending the existing mockup file so the office and desk live side by
side, and Geoff approves it the way he approved the desk before any implementation. The adversarial
design review (below) is the gate that tests the mockup against the competition before it is locked.

## The shape (two additions, one data change)

### 1. The triage layer

A row of filter controls sits above the list, each with a live count, driven entirely by the
publish state already computed per entry. The primary partition is mutually exclusive by ref state:
an All filter shows every entry; a Pending edits filter gathers the entries carrying a `cairn/` ref
(a status of `new`, branch-only and never published, or `edited`, live with unpublished edits); and
a Published filter shows the entries that are live and clean (a status of `published`). Pending
edits is the cairn-specific lens, and its count mirrors the topbar's "Publish site (N)", so the
list and the publish-all action tell the same story.

A fourth control surfaces the `draft` flag, Hidden (entries the frontmatter hides from the live
site). Hidden is orthogonal to the publish partition, since a live entry can be hidden, so the
exact interaction (a peer chip that filters to drafts, or a secondary toggle that composes with the
partition) is a frontend-design detail the mockup settles, not a contract.

Selecting a filter narrows the existing client-side list. The entries are already loaded in
component state (the load is manifest-first plus a pending crawl), so filtering stays instant and
needs no new load. Search composes with the active filter. The counts come from the loaded set, so
they are exact, not estimates.

Filter-only in v1. Grouping (Sveltia's `view_groups`, for example by year on a dated concept) is a
real idea and a natural next step, but it is deferred so the first pass does not overbuild.

### 2. The self-describing row

Each row gains a secondary summary line under the title, in the muted register, so a row describes
itself instead of being a bare title. The status badges and the formatted date stay; the
always-visible delete action stays (cairn already avoids WordPress's hover-only discoverability
trap, and keeps it).

The summary source is a convention, not per-row configuration. It is the value of the concept's
description-style field, defined as the first `textarea`-typed field in the concept's schema (Posts
carry a `description` textarea; this generalizes without naming a magic field). When a concept has
no textarea field (a minimal Pages schema may be title-only), the row falls back to the permalink,
so a row is never blank. This is Sveltia's configurable-`summary` idea taken the opinionated cairn
way: a convention that just works. An adapter override (a `summaryField` name or a template) is
noted as a later option, not built; the convention ships first.

The rich row treatment (whether the rows stay a sortable `<table>` with a sub-line in the title
cell, the WordPress shape, or become a taller row-list, the Ghost and Sveltia shape) is the central
visual decision and belongs to the frontend-design pass and its mockup, not to this spec. The spec
fixes the row's content and the summary source; the mockup fixes its form.

### 3. The one data-layer change

This is the only non-cosmetic cost. The per-row `EntrySummary` carries id, title, date, draft, and
status today, and the build-time manifest (`ManifestEntry`) indexes id, concept, title, date,
permalink, draft, and links, but no summary. The richer row needs a short summary string available
per entry on both list paths.

`ManifestEntry` gains an optional `summary` string, the extracted description-field value truncated
at build time to a small cap (around 160 to 200 characters, so the manifest stays small), and
`EntrySummary` gains the same field. One shared helper extracts the summary from parsed frontmatter
and the concept schema (the first textarea field, truncated). Both the manifest builder and the
pending-entry crawl call it, so a published row and a pending row summarize identically from the
same rule.

The field is optional on `ManifestEntry` by intent, so an older committed manifest that predates
this change still validates and the row simply falls back to the permalink until the manifest is
regenerated. The plan must verify against the real `cairnManifest` build-verification path whether
an added-but-optional field lets the existing committed manifest pass the build, or whether the
build flags it stale. If it passes, the change is fully additive with no consumer action. If the
verification fails on the missing field, the upgrade carries one
`Consumers must: regenerate the content manifest` line (the `cairnManifest` plugin regenerates on
the next build, or `npx cairn-manifest` does it), and that is the only consumer action. The plan
resolves which, and the additive-if-possible path is preferred.

## Out of scope (the lean stays lean)

Each of these is a precedent feature that fails the cairn philosophy test. The adversarial review is
the check on whether any of them actually earned a place; absent that, they stay out.

- Bulk actions (select-many publish/delete/tag). Powerful at scale, YAGNI for a first pass.
- Inline quick-edit. The edit page is where you edit; an inline metadata editor fights that model.
- Saved views. Advanced; most authors never reach for them.
- A grid or card view toggle. cairn content is prose, not an image library.
- Author and comment columns. Single small editor set, no comments.
- Analytics in the row. cairn has none to show.
- Grouping by field. Deferred, not rejected.

## The two process passes (built into the plan)

The plan carries two passes beyond the implementation tasks, both requested by Geoff.

The first is the frontend-design pass, run mockup-first. It produces the office-list gold-standard
mockup in the `cairn-admin.css` vocabulary (extending the existing mockup file), covering the row
treatment, the triage control chrome, and the empty and few-entry states, in both themes. Geoff
approves the mockup before implementation, the desk precedent. After the build, the same loop
captures the real showcase office and critiques it against the mockup.

The second is the adversarial design review, its own gate, before the build is locked. An
independent pass takes the proposed design and argues the competition's case against it: what Ghost,
Sveltia, WordPress, and the record-school CMSs (Contentful, Sanity) do better on content browsing,
and whether cairn has left real value on the table or wrongly kept something out. Its findings fold
into the mockup and the spec before the implementation tasks run. This is a candidate for a Workflow
find-and-verify sweep at execution time, on Geoff's opt-in.

## Adversarial UI review fold-ins (2026-06-13)

The mockup ran the adversarial UI review against a live render (Ghost, WordPress, and Sveltia, plus
Contentful and Sanity for the record-school view). The accepted findings, now in the approved mockup:

- **Edited is the action signal, so it tints primary, not amber.** The pending-edit badge mirrors the
  violet "Publish site (N)" button it feeds, and amber read as an error. New stays info, Published stays
  ghost. Contentful colors its "Changed" state as an accent for the same reason.
- **Hidden moves out of the status cell into a row treatment.** Visibility is orthogonal to publish
  state, so a hidden entry de-emphasizes its whole row and carries a small eye-off "Hidden" tag by the
  title, and the status cell shows only the publish-state badge. One cell never holds two competing pills.
- **The list always shows its next step.** A quiet "New {concept}" ghost row sits at the foot of the
  list card, so a short list never just stops into emptiness. This is the move that makes the few-entry
  office read as intentional (Notion's trailing create row).
- **The empty state owns the canvas.** A concept with no entries drops the card and centers the cairn
  mark, copy, and CTA in the content area, rather than a small box hugging the top of a tall page. The
  no-match state keeps its card and gains a "Clear search" action.
- **The row commits to the table.** Summaries truncate at the column edge (uniform, not ragged), and
  the date and status columns tighten so the title and summary carry the width they earn.

Rejected, with the defense: relative dates (the date column is the entry's canonical frontmatter date,
not a modified time, so relative would misread it); a grid or card view (cairn content has no guaranteed
image field, and Sveltia itself hides grid view without one); more sortable columns and a glyph in every
badge (the triage already partitions, and the text labels plus the Edited tint carry scannability).

## Constraints and cautions

- No load or action contract change. The triage and the filter run client-side over the already
  loaded entries; `listLoad` gains only the `summary` field on each `EntrySummary`. `CairnAdmin`'s
  view switching is untouched. Additive for the component contract.
- Accessibility carries over. The triage filters are real controls with the scoped focus ring; the
  active filter is announced (the count and the selected state are not color-only, matching the
  footer's check-and-tint non-color cue, WCAG 1.4.1). The sortable headers, if the table shape
  survives, keep their `aria-sort`. The empty and no-match states keep their `role="status"`.
- The few-entry state is a first-class design target. The sparseness that triggered this is worst
  at one to three entries, so the mockup and the pass treat the near-empty office as a designed
  state, not an afterthought.
- Both concepts. Posts (dated, with a description) and Pages (undated, possibly title-only) both
  flow through this. The `dated` branch already exists; the summary fallback covers the title-only
  Pages case.
- The design-system doc gains the office-list recipe (the triage control, the self-describing row,
  the summary convention) once the mockup is approved, the same as any gold-standard surface.

## Testing

Component: the triage filters narrow the list by state and show exact counts; search composes with
the active filter; a row renders its summary line from the description field and falls back to the
permalink when the concept has none; the empty, few-entry, and no-match states render. Unit: the
shared summary-extraction helper (first textarea field, truncation, the no-textarea fallback) and
the manifest gaining the optional `summary` field (an old manifest without it still validates). The
frontend-design loop runs the office critique in both themes against the approved mockup.

## Versioning

Additive for consumers (a minor bump, `0.55.0`) in the preferred path where the optional manifest
field lets an existing manifest validate. If the build verification forces a manifest regenerate,
the bump stays `0.55.0` and carries the single `Consumers must: regenerate the content manifest`
line. The plan settles which against the real build path.
