# Tag management and an editor-owned vocabulary — design

**Status:** approved design (2026-06-29), adversarially reviewed (one workflow, 10 findings folded), queued for
implementation. It supersedes the public-tag-pages direction of the held, unpublished taxonomy work (see
"Relationship to the held taxonomy work"). The build approach for the admin UI (prototype, adversarial review,
`frontend-design` polish) is recorded here and carried into the plan.

**Goal:** Make a site's tag vocabulary an editor-owned, enforced, global list managed through the admin, so a
non-technical editor can curate tags without a developer or a redeploy. Remove the public per-tag HTML pages
entirely. Keep tags as clean structured data that a size-gated, site-level archive filter consumes.

## Premise check (charter first)

The governing justification is **editor self-sufficiency**, a standing charter commitment: cairn makes
non-technical editors productive without touching GitHub. Tag management is a gap in that promise today. An
editor can write a post but cannot add or fix a topic without a developer editing the concept schema and
redeploying. Closing that gap is the editor/admin frame, which is cairn's core job, so an editor-facing
tag-admin passes the premise check.

The enforced vocabulary is also the **authoring-time prevention** the research recommends, and cairn does not
have it today. The current taxonomy field is an open creatable multiselect whose editor control is a bare
comma-separated text input with no suggestions or reuse of existing values (`FieldInput.svelte`). So the
closed, vocabulary-sourced picker is not a redundant enforcement toggle; it is the first authoring-time
drift-prevention cairn ships. Bulk rename/merge curation stays out of scope because prevention now exists, so
after-the-fact repair is rare at this scale, not because cairn already prevented drift.

What does **not** justify the admin, and this spec is honest about it: two adversarially-verified deep-research
runs (committed under `docs/internal/research/2026-06-29-tags-*.md`, SEO excluded per the owner) found the
AI-consumption value of tags weak at cairn's small, topically diverse scale, and human tag-filtering
size-gated, documented only on large catalogs. So the admin is built for **autonomy, not for AI or browsing
payoff**, and the evidence shapes everything around it: the public HTML tag pages are removed, the filter is a
size-gated template piece, and the one validated AI affordance (serving markdown to agents) is a separate
follow-on.

It stays lean. The vocabulary is config, a key in the existing committed site config, not a runtime store;
tags stay values, not entities; no new actor. It fits two charter lines added during the brainstorm: cairn is
tuned for a small editorial team by default, and a cairn site feeds AIs easily through passive, evidenced
machine-readable affordances.

## Glossary (fixed; used in code, docs, and the admin)

- **vocabulary** — the site's single global list of allowed tags, an editor-owned committed config artifact.
- **tag** — one vocabulary entry, `{ value, label }`.
- **value** — the stable slug-form token stored in post frontmatter and used as the filter key and the
  delete-usage key. Derived from the label once at creation, then immutable.
- **label** — the human-readable display name, freely editable by the editor.
- **orphan tag** — a value present on an entry but absent from the vocabulary. The design forbids silently
  losing one (see Components 3 and the migration).
- "category", per-tag "description", and hierarchy are not cairn concepts here. Description is deferred (Out of
  scope) but the entry shape stays open to it.

## Decisions settled (from the brainstorm)

- **Editor-owned, enforced, global vocabulary.** Editors manage it in the admin; a post can only carry tags
  from it; one global list across concepts. Per-concept scoping is deferred, and the design leaves room for it.
- **Two fields per tag, `value` (frozen slug) + `label` (editable display).** The split lets an editor relabel
  without rewriting any post.
- **No descriptions or richer fields now.** Rarely filled at small scale (round-1 research), no display
  surface once the pages are gone, unproven for AI (round-2 research). The entry stays an object so a field can
  be added later with no migration.
- **Public tag pages removed, totally.** No tag index, no per-tag archive, no machine tag endpoint.
- **Filtering lives with the site, size-gated.** A template archive filter over tags-as-data, off by default,
  client-side. cairn ships no public filter component.
- **SEO is not a criterion** (owner's call; AI-mediated discovery is the bet).

## Components

### 1. The vocabulary config artifact

A new key in the existing committed site config (`SiteConfig`, the `site.config.yaml` that already holds
`siteName`, `menus`, `spellcheck`, and `tidy`), holding the global tag list as an ordered array of
`{ value, label }`. It is read at build and at admin-render time, and edited at runtime by the admin through
the same parse-and-commit path the nav and tidy settings already use (`setMenu`/`setTidy`-style mutators over
the one config file). The parser validates each entry: a non-empty `value` matching the slug charset, a
non-empty `label`, and no duplicate `value`. An absent key reads as an empty vocabulary.

### 2. The editor tag-admin screen

An admin route rendered inside the shared `CairnAdminShell` (the custom-admin-screen seam shipped by the
extensibility pass), reached from an `adminNav` entry. It lists the vocabulary and offers add, rename, delete,
and the initial seed (below), each committing through the pipeline:

- **Add.** The editor types a label; the system derives a slug `value` and freezes it, rejecting a value that
  collides with an existing one.
- **Rename.** The editor edits the `label` only. The `value` is immutable, so no post changes.
- **Delete.** Allowed only when the value is unused. **Usage source (corrected from the review):** the
  committed content manifest does *not* index tags today, so this design adds a `tags?: string[]` projection to
  `ManifestEntry` (additive and optional, the same absent-reads-as-none pattern as `mediaRefs` and
  `references`, with a matching `verifyManifest` normalization), extracted from the entry's marked taxonomy
  field. A pure `tagUsage(manifest, value)` helper (mirroring `inboundReferences`) returns the entries
  carrying a value. "In use" follows the media where-used model: it unions the published corpus on `main` with
  every open `cairn/*` edit branch, so a tag used only in an unpublished draft branch still blocks deletion and
  cannot be deleted out from under an editor mid-edit. The screen surfaces the usage count and the blocking
  entries.

The screen follows the UI/UX directive below.

### 3. The enforced, vocabulary-sourced field, and its resolution seam

The multiselect tag field gains a mode that draws its options from the global vocabulary instead of a literal
`options` list in the concept schema, and enforces it (the closed, non-creatable shape).

**The resolution seam (corrected from the review).** The vocabulary is an async-loaded committed file, but the
fieldset validator is pure and synchronous and reads `field.options` off the static descriptor. So enforcement
cannot be a property of the static fieldset. It is an **async pre-resolution step** that injects the
vocabulary's values as the field's `options` before the descriptor reaches the validator or the renderer, at
three points:

- **Save (enforcement).** The save action loads the vocabulary and resolves the field's options before calling
  `validate`, so the existing closed-multiselect check (reject a value not in `options`) runs against the live
  vocabulary. The validator stays pure; the options are passed in.
- **Edit render (the picker).** The edit load resolves the vocabulary and injects the options before the
  descriptor reaches `FieldInput`, so `isClosedMultiselect` is true and the field renders the checkbox picker
  and decodes via `form.getAll`, matching the enforcement. Without this it would render as the open comma input
  and decode would drift from the render.
- **Build.** The build resolves the vocabulary into the field options the same way, so the published read is
  consistent with the save-time enforcement.

**Orphan behavior (new, from the review).** An enforced field must never silently drop a value already on an
entry that is not in the vocabulary. On edit it renders any such orphan value as a visible, checked, removable
chip flagged "not in your tag list" (the non-blocking-notice pattern the admin already uses for needs-alt), and
the decode preserves unknown values rather than discarding them. The editor makes a deliberate keep-or-drop
choice; an ordinary save never mutates a post's tag set behind the editor's back. This is the safety net under
the migration seed.

### 4. Removal of the public tag surface (reshape of held work)

Revert the tag-routing layer the held taxonomy work added: the `resolveRoute` tag kinds (`tagIndex` and
`tagArchive`), the prefix-aware collision throw, the slug-to-value index, `taxonomyBase`, `tagSlug` and
`parseTagPath` as URL machinery, the tag-path prerender enumeration, the promoted route types, and the showcase
tag pages. Keep tags-as-data (the marker to `ContentSummary.tags`, the validated read, `byTag` and `allTags`),
the `url-policy` `permalink` consolidation, and the feed-category emission. `createPublicRoutes` either reverts
to the prior `entryLoad` shape or keeps `resolveRoute` as an entry-only resolver, whichever is the smaller diff
that keeps the entry path byte-identical; the plan picks one against the code. The removed public exports drift
the `check:surface` snapshot, which is regenerated as the disclosure. Because the work is held and unpublished,
this is a clean pre-publish reshape with no consumer churn.

### 5. The size-gated template filter

The showcase and scaffold archive view gains an optional client-side tag filter over `ContentSummary.tags`,
off by default, documented as a size-gated affordance a site turns on as its archive grows. It reads the
vocabulary for clean filter options and narrows the already-rendered list in the browser. No engine code; this
is template and site work, and it proves the tags-as-data plus vocabulary surface end to end.

## UI/UX directive (for the admin screen)

The tag-admin must blend logically and seamlessly into cairn's admin, leveraging the established DaisyUI and
Tailwind patterns and widgets and the Warm Stone design system in `docs/internal/admin-design-system.md`, the
same as the rest of the interface. The build approach is mockup-first: produce several UI/UX prototypes, run an
adversarial review across them to surface the strongest, then use the `frontend-design` skill for final polish,
holding cairn's gold-standard design bar. The plan carries this as the admin-screen task's method.

## Relationship to the held taxonomy work

The taxonomy work (Plan 1 data layer, Plan 2 read path) is merged to `main` and held unpublished. This design
reshapes it before it ever publishes, so there is no breaking change to a consumer. The net published surface
becomes: tags as data, the editor vocabulary, and the enforced field, with no public tag pages. The held
`CHANGELOG` "Unreleased" window is rewritten accordingly: the "branch the catch-all by `data.kind`" breaking
change drops out with the tag routes, and the remaining consumer action is marking the taxonomy field plus
adopting the vocabulary model. The version stays the first free minor after `0.77.0` publishes.

## Breaking change and migration (the mandatory seed)

The hazard the review surfaced: a closed multiselect rejects an entry whose tag is not in `options`, and a
rejected entry is dropped from the content index entirely, so it vanishes from the built site. A realistic
adoption state has posts already carrying tags (legacy drift, and the held work let any value through).
Enabling enforcement against an incomplete vocabulary would therefore silently delist those posts at build.
The migration must prevent this, so it is a required step, not an afterthought:

- **Seed from the in-use tag set.** Before a concept's taxonomy field is switched to vocabulary-sourced, the
  initial vocabulary is derived from that concept's existing in-use tags (the engine already exposes
  `allTags()`, which yields `{ tag, count }` per used value), so adoption starts with zero orphans.
- **Gate enforcement on a superset.** The enforced field must not be enabled for a concept until the vocabulary
  is a superset of that concept's in-use tags. The tag-admin's enable/seed flow surfaces the orphan set (tags
  in use but not yet in the vocabulary) as a blocking checklist.
- **Consumer action** (rewritten `CHANGELOG` window and upgrade guide): mark the taxonomy field as
  vocabulary-sourced and seed the vocabulary (the admin can do this after deploy). A site that wired the held
  tag pages removes that wiring; since nothing tag-page related shipped to npm, this affects only the in-repo
  showcase.

## Out of scope

- Per-tag descriptions and richer tag fields. Deferred; the entry object stays additive so one lands later
  without migration if a real consumer (a future AI-affordance pass, a tag landing page) appears.
- A cross-post rename/merge engine for in-use tags. Constrained instead: `value` immutable, delete only when
  unused. Round-1 research put bulk curation tooling at large-taxonomy scale, which cairn does not target.
- Per-concept vocabularies. Global only for now; the design leaves room to add concept scoping later.
- `markdown-for-agents` and the broader AI-affordances direction. The round-2 research's validated AI win, but
  orthogonal to tags; it gets its own premise-checked follow-on under the "feeds AIs easily" charter line.
- Any public tag page, tag index, or machine-readable tag endpoint.

## Evidence base

Two adversarially-verified deep-research runs (2026-06-29, SEO excluded per the owner), committed for audit:

- `docs/internal/research/2026-06-29-tags-in-cmses-editor-and-seo.md`: tag drift is real; the recommended
  defense is authoring-time prevention; bulk curation tooling is large-scale; SEO findings (later excluded).
- `docs/internal/research/2026-06-29-tags-for-ai-and-human-browsing.md`: AI value of tags weak at small/diverse
  scale; the validated AI win is markdown-for-agents (deferred); llms.txt dead; schema unproven for our
  crawlers; human filtering size-gated.

Net: build the admin for editor autonomy and authoring-time prevention; remove the public tag pages; keep tags
as data; make the filter a size-gated template piece; defer the AI affordances to their own pass.

## Testing

- **Vocabulary config.** Parse and validate: a well-formed key loads; a duplicate `value`, an empty `label`,
  or a non-slug `value` is rejected; an absent key reads as empty.
- **Manifest tag usage.** `ManifestEntry` carries `tags?`, absent reads as none, `verifyManifest` normalizes
  it; `tagUsage(manifest, value)` returns the carrying entries; the in-use union covers an open `cairn/*`
  branch (a tag used only in a draft branch reads as in use).
- **Enforced field resolution.** With options resolved from the vocabulary, `validate` rejects a value not in
  the vocabulary and accepts listed values; the edit load renders the field as a closed picker (not the open
  comma input) and decodes via `getAll`.
- **Orphan behavior.** Saving a post that carries an orphan tag does not silently drop it; the orphan renders
  as a visible, flagged, removable chip and survives a save that does not touch it.
- **Tag-admin actions.** Add derives and freezes the slug and rejects a colliding value; rename changes only
  the label and leaves every post untouched; delete succeeds for an unused tag and is blocked for an in-use one
  (including a tag used only in an open edit branch), with the usage count surfaced.
- **Migration seed.** Enabling enforcement on a corpus with a not-yet-listed tag is caught by the seed gate
  (the orphan checklist), not a silent build-delist.
- **Removal.** No tag route resolves; an entry permalink still resolves byte-identically; tags-as-data and feed
  categories still work.
- **Template filter.** Over a seeded multi-tag archive, the filter narrows to the selected tag's entries and
  draws its options from the vocabulary.
- **Admin smoke and e2e.** Live admin smoke for the tag-admin screen (mint a session, add/rename/delete a tag,
  observe the committed config and the orphan flow); a showcase e2e for the filtered archive.

## Plan split (along verification surfaces)

- **Plan 1 — Reshape: remove the public tag surface, keep tags-as-data.** The contained reversal of the
  tag-routing layer, the `check:surface` regenerate, the `CHANGELOG` window rewrite, and the showcase
  un-wiring. Testable in isolation: tag routes gone, entry path and tags-as-data intact.
- **Plan 2 — The data engine: vocabulary config, manifest tag usage, and the enforced field resolution.** The
  vocabulary key, parser and validation; the `ManifestEntry.tags` projection plus `tagUsage` helper with the
  cross-branch union; and the field options-resolution seam (save, render, build) with enforcement and orphan
  preservation. Unit and integration testable without UI.
- **Plan 3 — The tag-admin screen, the seed/orphan flow, and the size-gated template filter.** The UI layer,
  built mockup-first (several prototypes, adversarial review, `frontend-design` polish); the enable/seed flow
  with the orphan checklist; the size-gated showcase filter; the admin smoke and the e2e. Consumes Plan 2's
  engine surface.

Each plan is written just-in-time after the prior lands. The release covering the whole initiative is the
first free minor after `0.77.0` publishes.
