# Fragments (Reusable Content) Implementation Plan

> **For agentic workers:** Execute per the `cairn-pass` skill in an OPUS-conducted session:
> one `cairn-implementer` dispatch per task, test-first, full gate per task; the conductor
> reviews each diff and verifies the gate before the next dispatch. Checkboxes track
> completion. The contract is the ratified spec,
> `docs/superpowers/specs/2026-07-15-fragments-design.md`; read it in full before Task 1.

**Goal:** Ship Fragments end to end: a site-declared `fragments` concept (non-routable
reusable markdown), an engine built-in `::include{fragment="<id>"}` leaf directive resolved
live from the published corpus, the manifest/guard integration, the editor picker, the
showcase exemplar, and the docs window.

**Architecture:** A new remark-stage include plugin runs first in the pipeline (before the
directive stamp, which today rewrites every leaf directive to literal prose) and splices the
fragment body's parsed block nodes in place, so spliced content flows through the identical
stamp/link/media/sanitize/dispatch chain. Resolvers follow the existing vfile-data injection
pattern: a throwing build resolver over `SiteResolver` (the build backstop) and a
targets-backed preview resolver from a new body-carrying `EditData` field. The public
delivery layer gains the missing `routing.routable` gate so embedded concepts stay
unreachable while their bodies stay readable in-process.

**Tech Stack:** unified/remark (remark-directive, mdast), Svelte 5 runes, SvelteKit 2,
Vitest (unit + integration + browser component projects), Playwright e2e in
`examples/showcase`.

## Global Constraints

- Work on a fresh `fragments` worktree off `main`. Before the first dispatch, verify no live
  executor holds the repo (the one-executor rule): `pgrep -f` on the repo path, `git status`
  for warm changes, worktree list. Grounding flagged two stale-looking worktrees
  (`wayfinder-retheme-lab`, `wayfinder-fixtures`) with modified copies of `manifest.ts` and
  `content-routes*.ts`; they are NOT part of this pass — do not touch or rebase onto them.
- Gate per task: the task's targeted tests green, `npm run check` 0 errors 0 warnings,
  `npm test` exit 0. A task is not done red.
- No task edits `CHANGELOG.md`, `ROADMAP.md`, or `docs/STATUS.md`; the docs task (Task 9)
  writes the changelog/roadmap once and the close ritual (Task 10) writes STATUS. No version
  bump, no publish; the pass holds unpublished under a `## Unreleased` heading Task 9
  creates (none exists today; the changelog currently opens at `## 0.86.2`).
- The `fragments` concept key, the directive name `include`, and the log event name are
  fixed vocabulary (see Interfaces in Tasks 1–2); do not improvise variants.
- Comments follow TSDoc plus the em-dash ban (`npm run check:comments`). Editor-facing copy
  follows the admin voice (professional, restrained; `npm run check:prose` covers
  `src/lib/components/*.svelte`) — the conductor reviews every new string at the diff.
- Before touching any admin component, read `docs/internal/admin-design-system.md`
  (dialog recipes at the "Dialog"/"Dialog sizing"/"Component insert picker" sections govern
  the picker).
- Public-surface changes run `npm run check:reference`, `npm run check:reference:signatures`,
  `npm run check:package`, and `npm run check:surface -- --update` with the regenerated
  `docs/internal/api-surface.md` committed in the same task that changes the surface.
- Unit tests for the render pipeline follow `src/tests/unit/resolve-links.test.ts` idioms;
  integration tests follow `src/tests/integration/content-routes-reference-save.test.ts`
  (the in-memory `GithubDouble` + hand-built event pattern); component tests follow
  `src/tests/component/LinkPicker.test.ts` (vitest-browser-svelte `render`, an `open()`
  helper, `expect.poll` for async close).

---

### Task 1: The routable gate and the fragments-key construction validation

**Files:**
- Modify: `src/lib/content/concepts.ts` (normalizeConcepts, ~127–185)
- Modify: `src/lib/delivery/site-resolver.ts` (createSiteResolver, ~60–91)
- Modify: `src/lib/delivery/public-routes.ts` (only if `entries`/`entryLoad` need their own
  guard beyond the resolver change)
- Test: `src/tests/unit/content-concepts.test.ts`, `src/tests/unit/site-resolver.test.ts`
  (or the existing delivery test file that covers `createSiteResolver`; create
  `site-resolver` coverage if none exists)

**Interfaces:**
- Produces: `FRAGMENTS_CONCEPT_ID = 'fragments'` exported (engine-internal) from
  `src/lib/content/concepts.ts`; later tasks (3, 6, 7) consume it.
- Produces: the guarantee later tasks rely on — `site.byPermalink()` never matches an entry
  of a concept with `routing.routable === false`, `site.entries()` never enumerates one,
  and `site.concept(id)` still returns the embedded concept's `ContentIndex`.

Background (grounded): `'embedded'` is enforced only in `feedView`/`sitemapView` today; the
public path (`site-resolver.ts`, `content-index.ts`, `public-routes.ts`) never reads
`routing.routable`, and `createSiteIndexes` requires a glob for every declared concept, so
without this gate fragment entries become real public pages.

- [ ] Failing tests first: (a) a site with an embedded concept whose glob contains a real
  entry — `site.byPermalink('/<computed permalink>')` returns undefined/miss and
  `site.entries()` excludes the entry, while `site.concept('fragments').byId(id)` still
  returns it with its body; (b) `normalizeConcepts` throws when the `fragments` key is
  declared with `routing: 'feed'`, `routing: 'page'`, or routing omitted — message in the
  `concepts.ts` idiom (`cairn: concept "fragments" …`), stating that the fragments key
  requires `routing: 'embedded'` and why (the include directive resolves against it).
- [ ] Implement the gate at the resolver layer (`createSiteResolver`'s union of
  permalink-lookup and entries-enumeration), not by dropping the concept's index — the
  build-time include resolver (Task 3) reads bodies through `site.concept()`.
- [ ] Implement the construction throw in `normalizeConcepts`, keyed on
  `FRAGMENTS_CONCEPT_ID`.
- [ ] Confirm `sitemapView`/`feedView` behavior for embedded concepts is already covered by
  the existing tests (`delivery-views.test.ts`); extend only if a gap shows.

**Acceptance:** new tests green; full gate; no behavior change for routable concepts (the
existing delivery tests stay green untouched).

### Task 2: The include remark plugin, the resolver seam, and the reserved name

**Files:**
- Create: `src/lib/render/resolve-include.ts` (the plugin, the resolver type, the vfile key,
  the miss treatment)
- Modify: `src/lib/render/pipeline.ts` (plugin order ~72–96; `renderMarkdown` opts ~127–135)
- Modify: `src/lib/render/registry.ts` (reserved-name throw, ~160–166)
- Modify: `src/lib/content/types.ts` (the `SiteRender` call signature, ~191–197)
- Modify: `src/lib/log/events.ts` (the event union)
- Test: `src/tests/unit/resolve-include.test.ts` (new), `src/tests/unit/render-registry.test.ts`
  (or wherever the figure reservation is tested today)

**Interfaces:**
- Produces: `FragmentResolve = (id: string) => string | undefined` (returns the fragment's
  raw markdown body), exported from `src/lib/render/resolve-include.ts` and re-exported
  wherever `LinkResolve`/`MediaResolve` surface publicly.
- Produces: `renderMarkdown(content, { resolve?, resolveMedia?, resolveFragment? })` — the
  new optional key, stashed on vfile data under an exported `FRAGMENT_RESOLVE` key (the
  `CAIRN_RESOLVE` pattern).
- Produces: `SiteRender` gains optional `resolveFragment?: FragmentResolve`.
- Produces: the log event literal `include.missing` (warn; field `fragment: string`).
- Produces: the miss-notice contract Task 6's preview relies on: a replaced block node
  carrying class `cairn-include-missing` and calm text naming the id (copy fixed here:
  `Missing fragment: <id>`).

Background (grounded): `remarkDirectiveStamp` unconditionally rewrites every leaf/text
directive to literal prose (`remark-directives.ts:109–120`); the include plugin must run
before it (first in the `remarkPlugins` array, immediately after `remarkDirective`) and
consume every `leafDirective` named `include`. Splicing means parsing the fragment body to
mdast with remark-parse + remark-gfm + **remark-directive** (without the directive extension
a body's `:::facts` parses as literal text and test (b) below fails;
`src/lib/content/media-rewrite.ts:88` is the in-repo parse precedent) and replacing the
directive node in its parent's children; `remarkFigure`'s splice
(`remark-figure.ts:112–121`) is the in-repo splice precedent.

- [ ] Failing tests first, driving through `renderMarkdown` like `resolve-links.test.ts`:
  (a) a body with `::include{fragment="x"}` and a resolver returning a markdown body renders
  the fragment's content in place; (b) the ordering invariant: a fragment body containing a
  registered container directive, a `cairn:` link, and a `media:` token renders with all
  three resolved/dispatched (proving splice-before-stamp and the shared downstream chain);
  (c) resolver returns undefined → the notice node (class + copy above) renders and
  `include.missing` is emitted once; (d) a throwing resolver propagates (the build
  backstop); (e) no resolver supplied → the directive falls through to today's
  literal-prose restore (inert, no crash); (f) one-pass only: a fragment body that itself
  contains `::include{...}` renders that inner directive as literal prose, never resolved;
  (g) a missing/empty `fragment` attribute → the notice path, not a crash; (h) other leaf
  directives (`::something`) keep today's restore-to-prose behavior byte-identically.
- [ ] Implement the plugin and wire it first in the plugin array; add the `resolveFragment`
  option and vfile key to `renderMarkdown`.
- [ ] Registry: `include` joins `figure` in the construction throw, same message idiom
  (`cairn: component "include" uses "include", a reserved directive name handled by the
  engine render step: …`); test beside the figure reservation test.
- [ ] Widen `SiteRender` and add the `include.missing` literal to the event union.
- [ ] Sanitize check: an assertion that fragment-sourced raw HTML is sanitized identically
  to native content (a fragment body with a `<script>` renders stripped under the default
  schema).
- [ ] Reference-page mechanics this task OWNS (not deferred to Task 9): update the fenced
  `declare function createRenderer` signature block in `docs/reference/core.md` (~465–472)
  so `renderMarkdown`'s opts carry `resolveFragment?: FragmentResolve`, add the
  `SiteRender` member where its signature/prose lives, and add `FragmentResolve`'s
  types-table row to `docs/reference/core.md` (core.md is its only correct home: the
  `/render` subpath carries no resolver types; `LinkResolve` lives on core.md via the root
  barrel). Task 9 writes the narrative prose; this task keeps the signature gates green.
- [ ] Run the public-surface gates (`check:reference`, `check:reference:signatures`,
  `check:surface -- --update` with the snapshot committed) — this task changes exported
  types.

**Acceptance:** all new unit tests green; the figure-reservation and existing render tests
untouched green; full gate including the surface gates.

### Task 3: The build-time fragment resolver and public wiring

**Files:**
- Modify: `src/lib/delivery/site-resolver.ts` (beside `buildLinkResolver`, ~165–170)
- Modify: `src/lib/delivery/data.ts` (the public re-export beside `buildLinkResolver`,
  line ~5 — this is how delivery helpers become public; core.md is NOT the owning page)
- Modify: `src/lib/delivery/public-routes.ts` (`entryLoad`'s render call, ~151–153)
- Modify: `docs/reference/delivery-data.md` (the minimal types-table/signature row for
  `buildFragmentResolver`; per `scripts/reference-coverage.mjs` CONFIG the `/delivery/data`
  subpath's page is `delivery-data.md` — Task 9 writes the prose)
- Test: `src/tests/unit/site-resolver.test.ts`, plus the existing public-routes test file

**Interfaces:**
- Consumes: `FragmentResolve` and the `SiteRender.resolveFragment` seam (Task 2);
  `site.concept()` access and `FRAGMENTS_CONCEPT_ID` (Task 1).
- Produces: `buildFragmentResolver(site: SiteResolver): FragmentResolve`, exported beside
  `buildLinkResolver`: returns the fragment's raw body via
  `site.concept(FRAGMENTS_CONCEPT_ID)`, and THROWS on a miss (unknown id, or no fragments
  concept declared) in `buildLinkResolver`'s message idiom — a dangling include fails the
  build.

- [ ] Failing tests first: (a) `buildFragmentResolver` returns the body for a published
  fragment; (b) throws with an id-naming message on an unknown id; (c) throws when the site
  declares no fragments concept; (d) `entryLoad` passes `resolveFragment` through to the
  site's `render` call (assert via a recording `render` double, the existing public-routes
  test idiom); (e) the not-a-link-target backstop (spec §1): `buildLinkResolver` treats a
  `cairn:` ref to a non-routable concept's entry as a miss (throws, the dangling-link
  backstop) — a fragment is included, never linked, and its gated permalink would 404.
- [ ] Implement; keep `entryLoad`'s existing `resolve`/`deriveHeroImage` behavior
  byte-identical otherwise; re-export `buildFragmentResolver` from `delivery/data.ts`.
- [ ] Surface gates (`check:reference`, `check:reference:signatures`,
  `check:surface -- --update` with the snapshot committed): the minimal
  `delivery-data.md` row keeps them green; prose in Task 9.

**Acceptance:** new tests green; full gate; the showcase still builds (its render wrapper
ignores the new key until Task 8 forwards it — confirm no type error from the widened
`SiteRender`).

### Task 4: Manifest `includes`, `inboundIncludes`, and the delete guard

**Files:**
- Create: `src/lib/content/includes.ts` (`extractIncludes`)
- Modify: `src/lib/content/manifest.ts` (ManifestEntry, manifestEntryFromFile ~67–95,
  serializeManifest ~114–128, parseManifest ~162–200, verifyManifest normalization
  ~287–307, `inboundIncludes` beside `inboundLinks` ~374–413)
- Modify: `src/lib/sveltekit/content-routes-core.ts` (deleteEntry gate block, ~1167–1258)
- Modify: `src/lib/components/DeleteDialog.svelte` and the delete-refusal copy in
  `src/lib/components/EditPage.svelte` (~1616 region) — the refusal must name inclusion
  ("included by"), not linking
- Test: `src/tests/unit/manifest.test.ts` (or the existing manifest test file),
  `src/tests/unit/includes.test.ts` (new),
  `src/tests/integration/content-routes-fragments-delete.test.ts` (new)

**Interfaces:**
- Consumes: `FRAGMENTS_CONCEPT_ID` (Task 1).
- Produces: `ManifestEntry.includes?: string[]` — additive-optional (the
  `mediaRefs`/`references`/`tags` pattern: conditional spread, validated-if-present,
  `verifyManifest` normalization stanza), NOT the always-present `links` shape.
- Produces: `extractIncludes(body: string): string[]` — parses with remark-parse +
  remark-gfm + remark-directive (the directive micromark extension is required or leaf
  directives never parse; `extractCairnLinks` alone is not a sufficient template), visits
  `leafDirective` nodes named `include`, collects the `fragment` attribute, dedupes in
  first-occurrence order.
- Produces: `inboundIncludes(manifest, id): InboundLink[]` — a sibling of `inboundLinks`
  (the `inboundReferences` precedent), filtering on `entry.includes`.
- Produces: `DeleteDialog` gains a prop `inboundKind: 'link' | 'include'` (default
  `'link'`, so every existing call site is unchanged) that selects the copy family:
  `'include'` renders inclusion language ("included by", "remove the include first"),
  `'link'` keeps today's strings byte-identically. The delete-refusal flash copy in
  `EditPage.svelte` branches the same way. `InboundLink[]` itself carries no flag; the kind
  is the deleted entry's concept (`FRAGMENTS_CONCEPT_ID` → `'include'`). Task 6 threads it.

- [ ] Failing unit tests first: `extractIncludes` (basic, dedupe, ignores container/text
  directives and code fences, missing attribute yields nothing); `manifestEntryFromFile`
  carries `includes` only when nonempty; `parseManifest` accepts absent, validates present,
  rejects malformed with the existing message idiom; `verifyManifest` tolerates a committed
  manifest that predates the field (the three-line normalization stanza);
  `inboundIncludes` filtering.
- [ ] Failing integration test: deleting a fragment included by a published entry is
  refused (409) with inclusion-naming copy; deleting an un-included fragment proceeds. The
  gate degrades-to-allow on an absent manifest (the links-gate precedent — the build
  backstop covers the dangling case).
- [ ] Failing integration test, the write-path round trip (spec §8's first integration
  bullet): drive the REAL `saveAction` with a Posts-concept body containing
  `::include{fragment="<id>"}`, assert the pending branch's manifest upsert carries
  `includes: ['<id>']`, then drive `publishAction` and assert the row lands on main. Build
  the delete-guard fixture above through this same real save path, not a hand-written
  manifest, so extraction-to-guard is exercised end to end.
- [ ] Implement, including the dialog/refusal copy (conductor reviews the strings;
  `check:prose` must pass).

**Acceptance:** new tests green; existing manifest round-trip tests untouched green; full
gate.

### Task 5: Rename rewrites inbound include directives

**Files:**
- Modify: `src/lib/sveltekit/content-routes-core.ts` (renameAction's inbound-rewrite pass,
  ~1360–1420)
- Test: `src/tests/integration/content-routes-fragments-rename.test.ts` (new)

**Interfaces:**
- Consumes: `ManifestEntry.includes` and `inboundIncludes` (Task 4).

Background (grounded): rename already re-upserts every inbound linker's row and rewrites
`cairn:` tokens in their bodies; this task extends the same pass to
`::include{fragment="<old>"}` occurrences.

- [ ] Failing integration test first: renaming a fragment rewrites the include directive in
  a consuming entry's body on main, re-upserts that entry's manifest row (its `includes`
  now carries the new id), and the fragment's own row moves — all in the rename's existing
  commit shape. A rename colliding with an existing id keeps today's 409.
- [ ] Implement inside the existing inbound-rewrite pass; do not add a second commit.

**Acceptance:** the new test green; the existing rename tests untouched green; full gate.

### Task 6: Edit-load fragment bodies, the preview resolver, the nested-include bounce, and the Address treatment

**Files:**
- Modify: `src/lib/sveltekit/content-routes-core.ts` (editLoad ~596–737, saveAction
  validation ~848–851 region, EditData ~126–201)
- Modify: `src/lib/components/EditPage.svelte` (preview resolver construction ~1225–1322;
  Address fieldset ~2189–2199)
- Test: `src/tests/integration/content-routes-fragments-edit.test.ts` (new),
  `src/tests/component/EditPage.test.ts` (extend)

**Interfaces:**
- Consumes: `FragmentResolve`/`resolveFragment` and the miss-notice contract (Task 2);
  `extractIncludes` (Task 4); `FRAGMENTS_CONCEPT_ID` (Task 1).
- Produces: `EditData.fragmentTargets: FragmentTarget[] | null` where
  `FragmentTarget = { id: string; title: string; body: string }` — `null` when the site
  declares no fragments concept (the truthful-visibility signal Task 7 gates on), `[]` when
  declared but none published. Bodies come from the default branch only: ids and titles
  from the committed manifest's fragments-concept rows, bodies read as a SECOND concurrent
  batch (a `Promise.all` of `backend.readFile` per fragment path) placed after
  `parseManifest` (~653) — the per-id paths are derivable only once the manifest is parsed,
  so they cannot join the existing first batch (~616–626). Read failures degrade the
  affected target out rather than failing the load (the `mediaTargets` shape).
- Produces: `EditData.routable: boolean` (from `concept.routing.routable`) for the Address
  treatment.
- Produces: `EditData.linkTargets` now excludes non-routable concepts' entries (spec §1,
  not-a-link-target: the link picker must not offer a fragment whose gated permalink 404s;
  filter the manifest projection by the concept-descriptor routing at ~653–666). The
  fragment picker does NOT read `linkTargets` (Task 7 reads `fragmentTargets`).
- Consumes/threads: `DeleteDialog.inboundKind` (Task 4) — a fragments-concept edit screen
  passes `'include'` and feeds `inboundIncludes` through `EditData.inboundLinks`; every
  other concept passes nothing and keeps today's behavior byte-identically.

- [ ] Failing integration tests first: (a) `editLoad` populates `fragmentTargets` from main
  only (a pending fragment branch's edits do not appear in another entry's targets);
  (a2) `linkTargets` excludes the fragments-concept rows while routable concepts' rows
  stay; (b) `fragmentTargets` is `null` without a declared fragments concept; (c) saving a
  fragments-concept entry whose body contains `::include{...}` bounces through the
  validation redirect with the fixed copy `A fragment can't include another fragment.`
  (engine chokepoint after `concept.validate`, keyed on the concept being
  `FRAGMENTS_CONCEPT_ID`; detection via `extractIncludes(body).length`); a Posts/Pages body
  with includes saves normally.
- [ ] Failing component tests: the preview resolves an included fragment from
  `fragmentTargets` (the fragment's rendered content appears in the preview), and a
  dangling include shows the Task 2 notice; the Address fieldset for a `routable: false`
  concept shows the name treatment (bare slug, no leading `/`, rename affordance kept, no
  permalink language) while a routable concept keeps today's block byte-identically.
- [ ] Implement: the editLoad plumbing, the EditPage preview `resolveFragment` built from
  `fragmentTargets` (beside the existing `manifestLinkResolver`/`manifestMediaResolver`
  construction), the save bounce, the Address gating.
- [ ] Usage visibility (spec §4): for a fragments-concept entry, `editLoad` computes
  `inboundIncludes` and feeds it through the same inbound surface `inboundLinks` already
  rides (`EditData.inboundLinks` → the preemptive DeleteDialog list), so the fragment's
  edit screen shows where it is used without a new panel. Integration-test that a consumed
  fragment's edit load carries its consumers.
- [ ] Regenerate any EditPage screenshot baselines the Address change invalidates; list
  them in the report.

**Acceptance:** new tests green; full gate; conductor render-reads any regenerated
baselines.

### Task 7: The fragment picker and insertion affordance

**Files:**
- Create: `src/lib/components/FragmentPicker.svelte`
- Modify: `src/lib/components/EditPage.svelte` (toolbar wiring beside the LinkPicker,
  ~1837 region and ~2290)
- Test: `src/tests/component/FragmentPicker.test.ts` (new),
  `src/tests/component/EditPage.test.ts` (extend)

**Interfaces:**
- Consumes: `EditData.fragmentTargets` (Task 6; `null` hides the affordance). Decision
  fixed here: the picker lists from `fragmentTargets` (id + title; already scoped to
  fragments), NOT from `linkTargets` (which Task 6 filters fragments OUT of). Because
  `EntryPicker.targets` is typed `LinkTarget[]` and keys rows by `${concept}/${id}`,
  `FragmentPicker` projects each target as
  `{ concept: FRAGMENTS_CONCEPT_ID, id, title, permalink: '', draft: false }` before
  passing it down; if `EntryPicker` renders the empty permalink awkwardly, suppress that
  row detail rather than inventing a fake path.
- Produces: inserts the exact text `::include{fragment="<id>"}` at the cursor through the
  existing insert seam (`insertAtCursor` guarantees block separation with its `\n\n`
  prefixing).

- [ ] Failing component tests first (the `LinkPicker.test.ts` idioms): the picker lists
  fragment titles, filters by search, emits the exact directive text for the chosen id,
  closes on choose; the trigger is absent when `fragmentTargets` is `null` and present
  (with an honest empty state naming the next step: publish a fragment first) when `[]`.
- [ ] Implement as an `EntryPicker` reuse (the `LinkPicker` wrapper shape) with a dedicated
  trigger label "Include a fragment"; dialog chrome per the design-system Dialog recipes.
  All copy passes `check:prose`.
- [ ] Wire into `EditPage` beside the link picker; the affordance must not appear on a
  fragment's own edit screen (a fragment cannot include a fragment — hide, matching the
  save bounce, keyed on the concept being the fragments key).
- [ ] Regenerate any invalidated baselines; list them.

**Acceptance:** new component tests green; full gate; conductor render-reads the picker.

### Task 8: The showcase exemplar and e2e

**Files:**
- Modify: `examples/showcase/src/theme/cairn.config.ts` (content block ~346–404: add the
  `fragments` concept keyed immediately after `pages`; navLayout ~435–450: add
  `{ screen: 'fragments' }` to the Content group; render wrapper ~415–416: forward
  `resolveFragment`)
- Modify: `examples/showcase/src/chassis/content.ts` (the fragments `import.meta.glob` +
  `createSiteIndexes` wiring)
- Create: `examples/showcase/src/content/fragments/<one-or-more>.md`
- Modify: one post (candidate: `2026-03-10-callout.md`) and `pages/about.md` to include the
  fragment; regenerate `examples/showcase/src/content/.cairn/index.json` via the manifest
  CLI
- Create/Modify: `examples/showcase/e2e/fragments.spec.ts` (new; public assertion per the
  `design-review-fixes.spec.ts` pattern) and an editor-flow addition (either in
  `fragments.spec.ts` or `golden-path.spec.ts`: insert through the picker, preview shows
  the fragment content)
- Test: the showcase build + e2e suite

**Interfaces:**
- Consumes: everything (Tasks 1–7). The render wrapper forwards `resolveFragment` the way
  it forwards `resolve`/`resolveMedia` — this forwarding is the site-contract step the
  guide (Task 9) documents.

- [ ] Declare the concept (dir `src/content/fragments`, `routing: 'embedded'`, minimal
  fieldset: required `title` text), the nav entry, the glob, the content, the includes, the
  manifest regen.
- [ ] The public e2e: the included fragment's distinctive content renders on the post's
  public page and the about page; the fragment's own computed permalink serves a 404 (the
  Task 1 gate, proven end to end).
- [ ] The editor e2e: through the admin, open the consuming post, insert a second include
  via the picker, assert the preview renders the fragment's content.
- [ ] From-scratch consumer build proof (the standing rule): the showcase builds clean from
  a fresh install (`rm -rf examples/showcase/{node_modules,package-lock.json}` + install +
  build) or the branch goes to CI for the e2e run; state which was run in the report.
- [ ] Regenerate admin/site visual baselines only if a rendered surface changed; list them.

**Acceptance:** showcase build green; the new e2e specs green (locally CI-mode or on CI);
full gate.

### Task 9: The docs window

**Files:**
- Modify: `docs/reference/authoring-syntax.md` (the `::include` section: grammar, the
  fragment attribute, block-only, the miss treatment, the reserved name)
- Modify: `docs/reference/core.md` (fragments-key validation prose beside the `'embedded'`
  shorthand at ~106–110; full prose for `FragmentResolve`, the widened `SiteRender`, and
  `ManifestEntry.includes` — Tasks 2–3 already landed the minimal rows and the
  `createRenderer` signature block; this task writes the narrative)
- Modify: `docs/reference/delivery-data.md` (`buildFragmentResolver` prose — its owning
  page per `scripts/reference-coverage.mjs` CONFIG, beside `buildLinkResolver`)
- Modify: `docs/reference/log-events.md` (the `include.missing` row)
- Create: `docs/guides/reuse-content-across-entries.md` (declare the concept keyed after
  `pages`, author a fragment, include it, edit-once-updates-everywhere, the render-wrapper
  `resolveFragment` forwarding step, the delete guard, the declared-`navLayout` placement
  note: add `{ screen: 'fragments' }` or the node lands in the fallback foot group)
- Modify: `docs/guides/README.md` / `docs/reference/README.md` indexes as their convention
  requires
- Modify: `CHANGELOG.md` (CREATE `## Unreleased` above `## 0.86.2`; `### Added` entry in
  the 0.86.2-entry format with the explicit "Additive; no consumer action beyond opting
  in." tag; zero `Consumers must:` lines)
- Modify: `ROADMAP.md` (remove the shipped reusable-content Next entry ~170–186; file the
  inline-include trigger into `## Considering` ~507 in the conditional-trigger style,
  naming ASC's Discord vocabulary as the promote trigger)
- Modify: `docs/internal/docs-friction-log.md` (any friction the writing surfaces)

**Interfaces:**
- Consumes: the final exported names and signatures from Tasks 1–7 (write against the
  code, not this plan, if they drifted).

- [ ] Write the window; Vale (Google package) governs the published arms.
- [ ] Run all four doc gates by name (`check:reference`, `check:reference:signatures`,
  `check:docs`, `check:package`) plus `check:snippets` and `check:surface`; all green.
- [ ] Grep the docs tree and `README.md` for stale references to includes/fragments as
  "reserved/not built" (the functional spec's reserved-seams language stays, it is
  history; forward-looking pages must not say fragments is unbuilt).

**Acceptance:** every doc gate green; the guide's steps executable against the showcase
exemplar as written.

### Task 10: The close ritual

Per the `cairn-pass` skill, in order, with evidence: code-simplifier over the pass's
changed code; `npm run check` 0/0 and `npm test` exit 0 and `check:comments`; the
from-scratch consumer build or CI e2e (whichever Task 8 did not already do, run the other
if cheap — CI e2e is the canonical gate before calling the pass releasable); the reviewer
fan-out (`svelte-reviewer`, `daisyui-a11y-reviewer` for the picker and Address change,
`cloudflare-workers-reviewer` for the editLoad backend reads; `web-auth-security-reviewer`
only if any auth-adjacent file was touched — none is planned); the live admin smoke (the
pass touches `/admin`: follow `docs/internal/admin-smoke-test.md`, exercise the fragment
list/edit/include/preview path); fold findings; post-mortem appended to this plan file;
`docs/STATUS.md` updated on `main` at merge (the next action after this pass: the ASC bump
+ `navLayout` addition + content consolidation in ASC's own session, and the held design-arc
queue); merge to `main`. NO version bump, NO publish — the window holds under
`## Unreleased` (the ASC consolidation is the likely consumer-needs-it trigger; that
decision belongs to the release moment, via `cairn-release`).

## Deliberately not in this pass

- Inline includes (ROADMAP Considering, ASC Discord vocabulary is the trigger).
- Component presets (no production case).
- ASC's own `navLayout` edit and content consolidation (ASC session, after a release).
- Any `libraryFields` work (it does not exist in code; the ROADMAP mention was a forward
  reference).
