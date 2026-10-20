# Fragments: reusable content design (2026-07-15)

Ratified in the 2026-07-15 Fable brainstorm (Geoff's calls recorded inline), then amended the
same day with the grounding workflow's findings (six seam readers over the real code; the
load-bearing facts are cited inline). Execution model: this spec plus its plan hand off to an
Opus-conducted session, which executes per `cairn-pass` on a worktree off `main`. The plan is
the handoff artifact.

## Premise check (the charter gate)

Fragments is managing markdown content, cairn's core job. It adds no actor, no auth, no domain
logic, and no open-ended collection mechanism. The 2026-05-28 content-concepts design already
locked the shape ("non-routable reusable markdown, pulled into other content via an include
directive, with no frontmatter beyond a name") and the functional spec reserved the seams for
it. This pass builds what was reserved, nothing more.

## The driver

The ASC site maintains `docs/fragment-candidates.md`: nine concrete reuse cases with canonical
wordings already converged (mooring cost, club address, storage fees, club-boat ground rules,
the life-jacket rule, camping facts, the "Contact us" page-cta closer, the class registration
path, the Discord channel vocabulary). Eight of nine are block-shaped directive clusters with
fixed content. ASC's standing policy (Geoff, 2026-07-15) duplicates freely until cairn ships
fragments, then consolidates. ASC is the first consumer and its candidates file is the
acceptance reality-check for this design.

## Ratified calls (Geoff, 2026-07-15)

1. **Live reference.** Entries include a fragment by name; every entry renders the current
   published version. Editing the fragment once updates every page on next publish/deploy.
   Not copy-at-insert.
2. **Fragments only.** No parameterized component presets. One mechanism covers all three
   seed shapes, because presentation in cairn travels as directive markup inside markdown:
   a plain-text fragment inherits local styles; a fragment whose body is a `:::facts` block
   brings its own presentation; a fragment whose body is a card or CTA cluster is a full
   component with baked content.
3. **Block-level only in v1.** No inline (mid-sentence) includes. The deferred trigger files
   into ROADMAP Considering: build inline when a site converges a real inline case (ASC's
   Discord vocabulary is the watch case).
4. **Placement: fragments live near Posts and Pages.** In the flat zero-config nav, adjacency
   is declaration order, so the documented convention declares the `fragments` key right
   after `pages` in the site's `content` record (grounded: the default nav has no group
   wrapper; `resolveDefaultLayout` walks concepts in declaration order,
   `admin-nav.ts:549-570`). A site with a declared `navLayout` adds `{ screen: 'fragments' }`
   to its own Content section; until it does, the node lands in the resolved layout's
   trailing `fallback` group (visible, never hidden; `admin-nav.ts:530-536`). The showcase
   does both. ASC's own `navLayout` edit is a filed follow-up in ASC's session, not this
   pass's work.

## Grounded facts the design builds on (2026-07-15 grounding workflow)

- `'embedded'` routing exists (`ROUTING_SHORTHANDS`, `concepts.ts:16-19`) but is enforced
  only in `feedView`/`sitemapView`. The public delivery path (`createSiteIndexes`,
  `site-resolver.ts`, `content-index.ts`, `public-routes.ts`) never reads
  `routing.routable`, and `createSiteIndexes` requires a glob for every declared concept.
  Without new engine work, fragment entries would be publicly served and prerendered at
  their computed permalink. **This pass adds the routable gate** (section 1).
- `remarkDirectiveStamp` treats the whole directive vocabulary as container-only and
  unconditionally rewrites every leaf/text directive back to literal prose
  (`remark-directives.ts:109-120`). The include plugin must run before it and consume every
  `leafDirective` named `include`.
- `ManifestEntry` carries no body text, so the admin preview's fragment resolver cannot be a
  manifest projection like `manifestLinkResolver`; the edit load needs a real body read
  (section 5).
- Public rendering is prerender build-time (`entryLoad` over `createSiteIndexes` globs), and
  `buildLinkResolver` throws on a miss as the build backstop. The fragment build resolver
  does the same (section 3).
- The edit screen renders the Address fieldset ("/slug" plus Change URL) unconditionally
  (`EditPage.svelte:2189-2199`), which would fabricate a public URL for a non-routable
  concept (section 5).
- Rename already re-upserts and rewrites inbound linkers' bodies; fragment rename extends
  that to include directives (section 4).

## Design

### 1. The concept, and the routable gate

A site opts in by declaring a concept under the key `fragments` in `content:`, per the
functional spec's promise ("one key and one descriptor, with no reshape of the contract or
the normalizer"):

- **Routing:** the reserved `'embedded'` shorthand: `routable: false, dated: false,
  inFeeds: false`.
- **Fields:** minimal, per the locked concepts design: a required `title` text field for the
  admin list. The body is the fragment's markdown. The fieldset is site-declared like any
  concept's; the docs show the canonical minimal form.
- **IDs:** plain slugs, no date prefix (the non-dated create path already does this:
  `content-routes-core.ts:553-587`).
- **Label:** defaults from the id ("Fragments"); relabelable via the existing
  `ConceptConfig.label`.
- **Construction validation:** declaring the `fragments` key with routing other than
  `'embedded'` throws at normalization, in the `concepts.ts` idiom
  (`cairn: concept "fragments" ...`).
- **The routable gate (new engine work):** the public delivery layer excludes non-routable
  concepts from public reach while keeping their bodies available in-process. Concretely:
  `site.byPermalink()` never matches an embedded concept's entry, `site.entries()` never
  enumerates one (so nothing prerenders or serves at `/fragments/<slug>`), and per-concept
  access (`site.concept('fragments')`) still works, which is exactly what the build-time
  include resolver reads. Sites keep passing the fragments glob to `createSiteIndexes`
  unchanged.
- **Not a link target:** a fragment is included, never linked. The edit load's link targets
  exclude non-routable concepts (so the link picker cannot offer a fragment, whose gated
  permalink would 404), and the build-time link resolver treats a `cairn:` link to a
  non-routable entry as dangling (the same build-failing backstop as a link to a missing
  page).

### 2. The include directive

`::include{fragment="<id>"}`, a leaf directive: no body, no title, no slots, one required
`fragment` attribute carrying the fragment's id.

- **Engine built-in.** `include` joins `figure` in the registry's reserved-name
  construction throw (`registry.ts:160-166`), same message idiom; a site never declares it.
- **Grammar note:** the current stamp step rewrites all leaf directives to literal prose by
  design. The include plugin consumes `leafDirective` nodes named `include` before the stamp
  step runs; every other leaf/text directive keeps today's restore-to-prose behavior.
- **Editor insertion.** The edit screen gains an "Include a fragment" affordance backed by a
  picker over the site's fragments (the `EntryPicker` reuse, the `LinkPicker` wrapper
  pattern), stamping the directive at the cursor through the existing insert seam. Present only when the site declares a `fragments` concept
  (truthful visibility). Copy passes `check:prose` and the admin voice.

### 3. Resolution

A new remark plugin, first in the plugin array (immediately after `remark-directive`, before
`remarkDirectiveStamp`), following the vfile-data resolver-injection pattern of
`remarkResolveCairnLinks`/`remarkResolveMedia` but splicing nodes rather than rewriting a URL:

- **The resolver seam:** `renderMarkdown` options and the `SiteRender` call signature gain an
  optional `resolveFragment` (a `FragmentResolve = (id: string) => string | undefined`
  returning the fragment's raw markdown body). This is a public-type change; the reference,
  signature, and surface gates run. The plugin parses the returned body (remark-parse +
  remark-gfm + remark-directive, so directive markup in the body survives as real nodes; the
  `media-rewrite.ts` parse is the in-repo precedent) and splices its block nodes in place of
  the directive node.
- **Ordering is load-bearing and tested.** Spliced content flows through the identical
  downstream chain (stamp, link/media resolution, remark-rehype, rehype-raw, the sanitize
  floor, dispatch), so a fragment body containing `:::facts` blocks, `cairn:` links, or
  `media:` tokens participates fully and inherits the same XSS floor. A unit test pins the
  ordering invariant.
- **No nesting in v1.** The engine save path rejects a fragments-concept body containing an
  include directive, with an honest editor-voiced bounce through the existing
  validation-error redirect (the chokepoint is engine-owned, not the site's fieldset). As
  defense in depth the plugin resolves one pass only: an include arriving inside spliced
  content is not resolved (it falls through to the stamp step's literal-prose restore).
- **Missing fragment:** the broken-link treatment, made consistent. The build resolver
  throws on a miss (the `buildLinkResolver` backstop: a dangling include fails the build,
  so a prerendered site never ships one). A non-throwing resolver miss replaces the
  directive with a marked, calm notice node naming the missing id (the `markNodeBroken`
  family) and emits a structured warn event (new `CairnLogEvent` union member, documented
  in `docs/reference/log-events.md`). The admin preview uses the same notice path.
- **Published corpus only.** The edit load already reads the manifest from the default
  branch only; fragment bodies read the same way. A fragment's pending edits show only in
  its own preview until published, and publishing is the moment every consuming page
  updates.

### 4. Manifest and guards

- Manifest entries gain an **additive optional** `includes?: string[]` (fragment ids
  extracted from the body), following the `mediaRefs`/`references`/`tags` additive pattern
  exactly: conditional spread in `manifestEntryFromFile`, validated-if-present in
  `parseManifest`, the `verifyManifest` normalization stanza so un-regenerated consumer
  manifests still build clean. Not the always-present `links` shape.
- **Delete guard:** a sibling `inboundIncludes()` beside `inboundLinks()` (the
  `inboundReferences` precedent), and a third gate block in the shared delete core with
  copy naming inclusion rather than linking. Degrade-to-allow on an absent manifest, like
  the links gate, because the build backstop catches dangling includes.
- **Rename:** renaming a fragment rewrites inbound include directives in consuming bodies,
  mirroring the existing inbound-link rewrite in the rename flow.
- **Usage visibility:** the fragment's edit screen surfaces where it is used, fed by
  `inboundIncludes` through the same load path that already computes `inboundLinks`
  unconditionally.

### 5. Admin surface

The concept-agnostic admin routes give fragments a list, editor, preview, per-entry
`cairn/fragments/<id>` branch, and the deliberate publish flow with no new route machinery
(grounded: none of the CRUD actions branch on routing). Three real gaps this pass closes:

- **Preview plumbing:** `editLoad` reads the published fragment bodies (ids and titles from
  the committed manifest, bodies batch-read from the default branch) into a new `EditData`
  field; the edit page builds the preview's `resolveFragment` from it, alongside the
  existing manifest-backed link and media resolvers. Populated only when the site declares
  a fragments concept; empty-degrade on read failure, the `mediaTargets` opt-in shape.
- **Address treatment:** for a non-routable concept the edit screen's Address fieldset stops
  fabricating a public URL: it becomes a name treatment (the bare slug, a rename affordance,
  no permalink language). Every routable concept keeps today's block.
- **Nav:** nothing new in the engine (the flat default and `navLayout` both already handle a
  new concept); the placement convention is documentation plus the showcase exemplar, per
  ratified call 4.

### 6. Showcase exemplar

The showcase declares a `fragments` concept (keyed after `pages`), adds
`{ screen: 'fragments' }` to its declared Content nav section, ships at least one fragment
under `src/content/fragments/`, includes it from one post and one page, and regenerates its
committed manifest. It serves as the worked exemplar in docs, the public e2e assertion (the
`design-review-fixes` pattern: the fragment's rendered content asserted on the public page),
the editor-flow e2e (insert through the picker, preview shows the fragment), and the surface
for any visual baselines the picker adds.

### 7. Documentation

- `docs/reference/authoring-syntax.md` gains the `::include` section (it already owns the
  authoring tokens `cairn:` and `media:`); `docs/reference/core.md` gains the fragments-key
  validation prose beside its existing `'embedded'` shorthand documentation, plus
  types-table rows and signature blocks for whatever the pass exports (`FragmentResolve`,
  the widened `SiteRender`).
- Guide: "Reuse content across entries" (declare the concept, author a fragment, include it,
  edit-once-updates-everywhere, the delete guard, the declared-`navLayout` placement note).
- `docs/reference/log-events.md` gains the missing-fragment event row.
- CHANGELOG: **create** a `## Unreleased` heading (none exists today) above `## 0.86.2`,
  entry under `### Added` with the explicit consumer-impact tag. New subsystem and public
  surface, so the window sizes as a minor when a release is eventually cut (verify the
  number free at that time). Zero `Consumers must:` lines expected: additive and opt-in.
  The upgrade guide gets its per-version entry when the release is cut, stating no action.
- ROADMAP: mark the reusable-content Next entry shipped; file the inline-include deferred
  trigger into Considering with the ASC Discord-vocabulary case as the named trigger.

### 8. Testing

- Unit: the include plugin (splice; the ordering invariant ahead of the stamp step; a
  fragment body carrying a container directive, a `cairn:` link, and a `media:` token
  resolving fully downstream; missing-id undefined path; throwing resolver propagates;
  one-pass no-nested-resolution), the `include` reserved-name throw, `extractIncludes`,
  `inboundIncludes`, the fragments-key construction throw, the routable gate
  (`byPermalink` miss, `entries()` exclusion, `concept()` access intact).
- Integration: the fragments save/publish flow (branch, manifest upsert with `includes`,
  publish), the nested-include save bounce, the delete guard block and its copy, the rename
  rewrite of inbound includes, edit-load fragment bodies from the default branch only.
- Component: the picker (the `LinkPicker.test.ts` harness idioms) and its truthful
  visibility.
- e2e: the showcase exemplar's public render and editor flow (section 6).
- Gates: the full standing lattice (`check` 0/0, `npm test` exit 0, `check:comments`,
  `check:prose`, `check:reference`, `check:reference:signatures`, `check:package`,
  `check:docs`, `check:snippets`, `check:surface` with the regenerated snapshot committed).

## Out of scope (deliberate)

- Parameterized component presets (no production case; the charter holds surface until a
  driver appears).
- Inline includes (deferred with a ROADMAP Considering trigger; ASC Discord vocabulary is
  the watch case).
- Fragment-in-fragment nesting (validation-rejected in v1; one-pass resolution as backstop).
- Cross-concept include targets (the directive resolves only against the `fragments` key).
- Any ASC content migration or ASC `navLayout` edit (ASC's own site session, driven by its
  candidates file, after this ships and ASC bumps).
