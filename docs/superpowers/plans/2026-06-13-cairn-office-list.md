# The office list rises to the gold standard: triage + self-describing rows (0.55.0)

> **For agentic workers:** execute task-by-task with `cairn-implementer` (the repo default); the
> main loop reviews each diff and verifies the full gate between dispatches. Tasks 1, 2, and 9 run
> in the main loop (design and critique, not implementation). Task 1 builds the office-list mockup,
> Task 2 critiques it against the competition's list views and refines it, and the implementation
> (Tasks 3 onward) follows straight on. Steps use checkbox syntax.

**Goal:** make the post/pages list (`ConceptList`) extend the editor/desk gold standard, per the
approved spec (`docs/superpowers/specs/2026-06-13-cairn-office-list-design.md`): a triage filter
layer driven by publish state (with counts), self-describing rows with a summary line, and the one
data-layer change that feeds them.

**Architecture:** presentation plus one small content-index addition. The triage and the filter run
client-side over the already-loaded entries; the rows gain a summary line fed by a `summary` string
added to `ManifestEntry` and `EntrySummary`, derived by the existing `deriveExcerpt` helper. No
load or action contract change beyond the new `summary` field; `CairnAdmin`'s view switching is
untouched. Minor bump `0.55.0`.

**Tech stack:** Svelte 5 runes, DaisyUI v5 + scoped Tailwind, the build-time content manifest, the
unit + component (real browser) + showcase E2E projects.

## Plan-time reconciliations (settle the spec's open points)

The spec left two mechanics to plan time. Both resolve against the real codebase, found in recon:

1. **The summary source reuses `deriveExcerpt`, not "first textarea field, then permalink."** The
   codebase already has `deriveExcerpt(body, { description })` at `src/lib/delivery/excerpt.ts:24`:
   it returns the trimmed frontmatter `description` when present, else a word-boundary, markdown-
   stripped body excerpt (200 chars, ellipsis). The public delivery's `ContentSummary.excerpt`
   already uses it (`src/lib/delivery/content-index.ts:106`). Reusing it for the admin row makes the
   list summary identical to the public excerpt and gives a real-text fallback (a body excerpt)
   instead of the spec's weaker permalink fallback. This supersedes the spec's "first textarea
   field" convention; the result is more useful and reuses tested code. `deriveExcerpt` (and its
   `toPlainText` dep) move from `delivery/` down to `content/` so the manifest builder (in
   `content/`) can call it without a layering inversion (`delivery` already depends on `content`).

2. **Storing `summary` in the manifest requires a one-time regenerate on upgrade.**
   `verifyManifest` (`content/manifest.ts:174-187`) compares the whole serialized string, so once
   `serializeManifest` emits `summary`, an existing committed manifest (without it) fails the build
   until regenerated. The published list row reads the manifest (no frontmatter at read time), so
   the summary must live in the manifest, not be derived at load. Therefore `0.55.0` carries one
   `Consumers must: regenerate the content manifest (npm run cairn:manifest or npx cairn-manifest,
   then commit)` line. Both consumer sites have the `cairnManifest` plugin wired, so the build
   fails closed until they regenerate, which is the intended fail-on-drift posture. Use the
   optional-spread pattern in `serializeManifest` so an entry with an empty summary stays
   byte-identical and does not churn.

**Facts the implementer should not re-derive** (verified 2026-06-13 against the working tree):

- `deriveExcerpt(body, { description }): string` at `src/lib/delivery/excerpt.ts:24` (with
  `toPlainText` beside it). Returns description-or-body-excerpt. Task 3 moves it to `content/`.
- `ManifestEntry` at `content/manifest.ts:12-20` (id, concept, title, date?, permalink, draft,
  links). Built by `manifestEntryFromFile(descriptor, file)` at `:41-53`, which already has
  `descriptor`, `frontmatter`, and `body` in scope. Serialized by `serializeManifest` at `:66-77`
  (fixed key order, optional-spread for `date`). Validated by `parseManifest` at `:83-120`
  (the `ok` check at `:97-105`; the `date` optional arm at `:104` is the pattern for `summary`).
- `EntrySummary` at `content-routes.ts:52-59` (id, title, date, draft, status). Built in `listLoad`
  (`:295-343`) two ways: the PUBLISHED inline object at `:328-334` (`status: 'published'`, reads the
  manifest row `e`), and the PENDING path through `summarize` at `:246-262` (reads branch
  frontmatter; destructures `{ frontmatter }` only, so add `body`). `summarize` is reached via
  `pendingRow` (`:267-272`) and `crawlEntries` (`:276-287`).
- The schema: `FrontmatterField` union at `content/types.ts:82-88` (text, textarea, date, boolean,
  tags, freetags). `ConceptDescriptor.fields` at `types.ts:250`. Not needed if the summary uses
  `deriveExcerpt` (which keys on `description` by name plus body), which is the chosen path.
- `ConceptList.svelte` is the list component; its current shape (search, sortable Title/Date table,
  status badge, delete, client-side pagination, create dialog, empty/no-match states) is the
  starting point. The status per row is `EntrySummary.status` (`new`/`edited`/`published`) plus the
  `draft` boolean.
- Tests: unit in `src/tests/unit/` (`manifest.test.ts` for the builder/serialize/verify;
  `delivery-manifest.test.ts` for `buildSiteManifest`; `delivery-content-index.test.ts` has a
  `summary fields` describe and exercises `deriveExcerpt`). Component in `src/tests/component/`
  (`ConceptList` has no dedicated file yet; create `ConceptList.test.ts`, real browser). The
  showcase E2E is `examples/showcase/e2e/golden-path.spec.ts`.
- The showcase commits its manifest at `examples/showcase/src/content/.cairn/index.json`; it must be
  regenerated in Task 8 once the build emits `summary`.

Every implementation task ends on the full gate: targeted test green, `npm run check` 0/0,
`npm test` exit 0. Commit per task, specific files, repo conventions.

---

### Task 1: the office-list gold-standard mockup (main loop, frontend-design)

A UI critique needs a concrete UI to judge, so the mockup comes first and the adversarial review
(Task 2) runs against it. This task is design, not code.

**Files:**
- Modify: `docs/internal/design/2026-06-12-editor-shell-gold-standard.html` (add office-list screens)

- [ ] Run the `frontend-design:frontend-design` loop to produce the office-list mockup, extending
  the existing gold-standard HTML so the office and desk live in one file under one stylesheet
  (the served `cairn-admin.css` plus the fonts, the file's existing setup). It must use the
  established vocabulary only (the spec's "design authority" section): the segmented-control and
  check-and-tint grammar for the triage, the card hairline-plus-shadow and the Bricolage/Plex/iA
  type scale for the rows, the eyebrow and brand-tile recipes for the states. No new aesthetic.
- [ ] Cover these screens, both themes (`cairn-admin`, `cairn-admin-dark`): the office list at a
  realistic fill (8 to 12 rows) with the triage filters and a self-describing row; the **few-entry
  state** (one to three rows, the sparseness that triggered this, treated as a designed state); the
  empty state; and the active-filter state (a filter selected, the count shown). Decide the central
  visual question in the mockup: the rich row as a sortable table with a title sub-line, or a taller
  row-list.
- [ ] Serve and eyeball the mockup (the file's documented port-4180 recipe), and refine to the
  desk's grade. No commit yet; the mockup commits at the end of Task 2 after the review fold-in.

### Task 2: the adversarial UI review, then refine (main loop)

Run against the actual mockup from Task 1. This is a critique of the **visual design**, not the
feature set: how the competition presents a content list, judged against the mockup we built.

- [ ] Dispatch an independent review (a general-purpose agent, or a Workflow find-and-verify sweep
  if Geoff opts in) that argues the competition's UI case against the Task 1 mockup. Give it the
  rendered mockup (screenshots of both themes, all four screens) and the spec
  (`docs/superpowers/specs/2026-06-13-cairn-office-list-design.md`), and a mandate to study how the
  record-school and blog CMSs present their content lists: Ghost, Sveltia, WordPress, and added for
  this review Contentful and Sanity. The question is about UI, not features: what do these tools'
  list views do better on visual hierarchy, density, scannability, the row treatment, the status
  signalling, and the triage chrome that the mockup misses? Demand concrete, cited findings (a named
  UI pattern with the tool that does it), not affirmation.
- [ ] Triage the findings in the main loop. Fold the accepted ones back into the mockup (refine it
  to the desk's grade) and amend the spec where a finding changes a decision. Record the rejected
  ones with a one-line reason, so the design is defended, not just inherited.
- [ ] Commit the refined mockup (and the spec amendment if the review produced one):
  `Mock the office list at the gold standard`. Then proceed straight to Task 3.

### Task 3: move `deriveExcerpt` into the content layer

**Files:**
- Create: `src/lib/content/excerpt.ts` (moved from `delivery/`)
- Modify: `src/lib/delivery/excerpt.ts` (re-export from content, or delete and repoint imports)
- Modify: `src/lib/delivery/content-index.ts` (import from `content/excerpt.js`)
- Test: `src/tests/unit/` (the existing excerpt coverage moves or points to the new path)

- [ ] Confirm the current home and callers: `grep -rn "deriveExcerpt\|toPlainText" src/lib`. The
  only consumer is `delivery/content-index.ts:106`.
- [ ] Move `deriveExcerpt` and `toPlainText` verbatim into `src/lib/content/excerpt.ts` (same
  signatures, same behavior). Repoint `delivery/content-index.ts` to import from
  `../content/excerpt.js`. Delete `delivery/excerpt.ts` (or leave a one-line re-export if any test
  imports it by that path; prefer deleting and repointing the test).
- [ ] Run the existing excerpt/content-index tests; expect green with no behavior change (a pure
  move). Full gate.
- [ ] **Commit:** `Move deriveExcerpt down to the content layer`

### Task 4: the manifest carries a summary

**Files:**
- Modify: `src/lib/content/manifest.ts` (interface, builder, serialize, parse)
- Test: `src/tests/unit/manifest.test.ts`, `src/tests/unit/delivery-manifest.test.ts`

- [ ] **Write the failing tests.** In `manifest.test.ts`, extend the `manifestEntryFromFile`
  describe and add a verify case:

```ts
test('manifestEntryFromFile derives a summary from the description, else the body', () => {
  const withDesc = manifestEntryFromFile(postsDescriptor, {
    path: 'src/content/posts/a.md',
    raw: '---\ntitle: A\ndescription: A short blurb.\n---\nBody text here.',
  });
  expect(withDesc.summary).toBe('A short blurb.');

  const noDesc = manifestEntryFromFile(postsDescriptor, {
    path: 'src/content/posts/b.md',
    raw: '---\ntitle: B\n---\nThe body becomes the excerpt when there is no description.',
  });
  expect(noDesc.summary).toBe('The body becomes the excerpt when there is no description.');
});

test('serializeManifest omits an empty summary (no churn) and round-trips a present one', () => {
  const present = parseManifest(serializeManifest({ version: 1, entries: [
    { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], summary: 'Blurb.' },
  ] }));
  expect(present.entries[0].summary).toBe('Blurb.');

  const emptyRaw = serializeManifest({ version: 1, entries: [
    { id: 'b', concept: 'posts', title: 'B', permalink: '/b', draft: false, links: [], summary: '' },
  ] });
  expect(emptyRaw).not.toContain('summary');
});

test('verifyManifest fails a committed manifest that lacks a now-built summary', () => {
  const built = { version: 1, entries: [
    { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [], summary: 'Blurb.' },
  ] };
  const staleCommitted = serializeManifest({ version: 1, entries: [
    { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
  ] });
  expect(() => verifyManifest(built, staleCommitted)).toThrow(/stale/);
});

test('parseManifest still accepts an older entry with no summary key', () => {
  const old = parseManifest(JSON.stringify({ version: 1, entries: [
    { id: 'a', concept: 'posts', title: 'A', permalink: '/a', draft: false, links: [] },
  ] }));
  expect(old.entries[0].summary).toBeUndefined();
});
```

- [ ] **Run; expect failures** (no `summary` field).
- [ ] **Implement** in `manifest.ts`:
  - Add `summary?: string;` to `ManifestEntry` (optional, so an old committed manifest still
    parses).
  - In `manifestEntryFromFile`, import `deriveExcerpt` from `./excerpt.js` and add
    `summary: deriveExcerpt(body, { description: asString(frontmatter.description) })` to the
    returned object.
  - In `serializeManifest`, emit summary with the optional-spread:
    `...(e.summary ? { summary: e.summary } : {})`, placed in the fixed key order after `permalink`
    (match the existing `date` spread pattern).
  - In `parseManifest`'s `ok` check, add the optional arm:
    `(e.summary === undefined || typeof e.summary === 'string')`.
- [ ] In `delivery-manifest.test.ts`, add one end-to-end assertion that `buildSiteManifest` over a
  real `defineAdapter`/`defineFields` fixture produces entries carrying `summary`.
- [ ] **Run; expect green.** Full gate.
- [ ] **Commit:** `Index a per-entry summary in the content manifest`

### Task 5: the list rows carry the summary

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`EntrySummary`, the published row, `summarize`)
- Test: `src/tests/integration/` (the list-load path runs against a fetch double; place a test that
  exercises both the published and pending rows) or `src/tests/unit/` if a closer factory test fits

- [ ] **Write the failing test.** Drive `listLoad` (or the factory it comes from) against the
  established double so both row paths produce a `summary`:

```ts
// A published entry reads its summary from the manifest row.
test('listLoad fills summary on a published row from the manifest', async () => {
  // manifest double includes an entry with summary: 'Indexed blurb.'
  const data = await runListLoad(/* posts */);
  const row = data.entries.find((e) => e.status === 'published');
  expect(row?.summary).toBe('Indexed blurb.');
});

// A pending (edited/new) entry derives its summary from the branch frontmatter/body.
test('listLoad derives summary on a pending row from the branch content', async () => {
  // GitHub double returns a cairn/ branch file with a description or body
  const data = await runListLoad(/* posts, with a pending ref */);
  const row = data.entries.find((e) => e.status !== 'published');
  expect(row?.summary).toBe(/* the description or body excerpt */);
});
```

Match the suite's existing list-load test harness (the fetch/GitHub double); write the small
`runListLoad` helper if none exists, following `content-routes`'s factory shape.

- [ ] **Run; expect failures** (no `summary` on `EntrySummary`).
- [ ] **Implement** in `content-routes.ts`:
  - Add `summary: string | null;` to `EntrySummary` (`:52-59`).
  - Published inline object (`:328-334`): add `summary: e.summary ?? null`.
  - `summarize` (`:246-262`): destructure `{ frontmatter, body }` from `parseMarkdown(raw)` and
    return `summary: deriveExcerpt(body, { description: asString(frontmatter.description) })`; on the
    null-raw and catch fallbacks, return `summary: null`. Import `deriveExcerpt` from
    `../content/excerpt.js`.
- [ ] **Run; expect green.** Full gate.
- [ ] **Commit:** `Carry the summary onto each list row`

### Task 6: the triage filter and counts

**Files:**
- Modify: `src/lib/components/ConceptList.svelte`
- Test: `src/tests/component/ConceptList.test.ts` (create)

- [ ] **Write the failing tests** (component project, real browser). The filter logic is the
  contract; the chrome follows the mockup in Task 7.

```ts
// counts are exact, from the loaded set. Hidden is ORTHOGONAL to the partition: a
// published-but-hidden entry counts in BOTH Published and Hidden (it is on main, just
// hidden from the public site), matching the spec and the approved mockup.
test('the triage shows exact counts per state', async () => {
  // render ConceptList with entries: 2 published, 1 edited, 1 new, 1 draft(published)
  // expect All = 5, Pending edits = 2 (new + edited), Published = 3 (the 3 published-status
  // entries, including the hidden one), Hidden = 1
});

// selecting a filter narrows the rows
test('Pending edits filters to new and edited rows', async () => {
  // click the Pending edits filter; only the new + edited rows remain
});

// the Hidden toggle composes with the active partition (it does not replace it)
test('Hidden composes with the partition (Published + Hidden = published and hidden)', async () => {
  // select Published, then toggle Hidden on; only the published-and-hidden rows remain,
  // and the Published partition stays selected
});

// search composes with the active filter
test('search narrows within the active filter', async () => {
  // select Published, type a query; only published rows matching the query remain
});

// the default filter is All
test('All is the default and shows every row', async () => { /* ... */ });
```

- [ ] **Run; expect failures.**
- [ ] **Implement** the filter state and derived sets in `ConceptList.svelte`. The triage has two
  INDEPENDENT axes (the spec/mockup model): a pick-one publish-state partition and an orthogonal
  Hidden toggle that composes with it. Do not model Hidden as a fourth partition value.
  - A `partition` state: `'all' | 'pending' | 'published'`, default `'all'`, plus a separate
    `hiddenOnly` boolean, default `false`.
  - Counts derived from `data.entries`, each independent: `all = entries.length`,
    `pending = count(status !== 'published')`, `published = count(status === 'published')`,
    `hidden = count(draft === true)`. A published-but-hidden entry counts in BOTH `published` and
    `hidden`.
  - The `filtered` derived (currently query-only) gains both predicates, composed with the query:
    the partition (`all` = pass; `pending` = `status !== 'published'`; `published` =
    `status === 'published'`) AND (`!hiddenOnly || draft === true`). Feed the existing sort/paging
    downstream.
  - Reset `page = 1` when the partition changes or `hiddenOnly` toggles.
  - Render the controls plainly for now (Task 7 dresses them to the mockup): the three partition
    buttons (each its label + count, `aria-pressed`) and the separate Hidden toggle (its label +
    count, `aria-pressed`), so the tests can target them.
- [ ] **Run; expect green.** Full gate.
- [ ] **Commit:** `Add the triage filter to the concept list`

### Task 7: the self-describing row and the gold-standard dressing

**Files:**
- Modify: `src/lib/components/ConceptList.svelte`
- Modify: `src/lib/components/cairn-admin.css` (only if the mockup needs a scoped rule)
- Test: `src/tests/component/ConceptList.test.ts`

- [ ] **Write the failing tests:**

```ts
// the row renders its summary line
test('a row shows the summary under the title', async () => {
  // entry with summary 'A short blurb.' renders that text in the row
});

// a row with no summary does not render an empty line
test('a row without a summary renders no summary line', async () => {
  // entry with summary null: no empty summary element
});

// the triage control carries the non-color cue (WCAG 1.4.1)
test('the active filter is marked by more than color', async () => {
  // the active filter button has aria-pressed true (and the check/selected affordance), not color alone
});

// a hidden entry is shown by row treatment, not a competing status badge
test('a hidden entry carries the Hidden tag, not a Hidden badge in the status cell', async () => {
  // entry with draft true: the row carries the eye-off "Hidden" tag by the title; the status cell
  // holds only its publish-state badge (no second pill)
});

// the trailing create row opens the create dialog
test('the trailing New row opens the create dialog', async () => {
  // clicking the foot "New {label}" row shows the same create dialog as the header button
});
```

- [ ] **Run; expect failures.**
- [ ] **Implement** against the approved mockup (Task 2). The mockup fixed the row form as an enriched
  sortable **table**: the title with a muted summary sub-line beneath it, then Date, the status badge,
  and the delete action. The specifics, carried by the Task 2 adversarial-review fold-in:
  - Add the summary line under the title, rendered only when `entry.summary` is non-empty (a title-only
    entry shows no summary line). Truncate at the column edge (single-line `text-overflow: ellipsis`),
    not at a fixed character cap.
  - Keep the sortable Title/Date headers with `aria-sort`; the always-visible delete action stays.
    Tighten the Date and Status columns so the title and summary carry the width.
  - **The Edited badge tints primary** (`bg-primary/10 text-primary`, the check-and-tint grammar), not
    amber `warning`: it is the action signal that mirrors "Publish site (N)". New stays `badge-info`,
    Published stays `badge-ghost`.
  - **Hidden is a row treatment, not a badge.** A `draft` entry de-emphasizes its row (~0.62 opacity on
    the title and summary) and carries a small eye-off "Hidden" tag beside the title; the status cell
    then shows only the publish-state badge.
  - **A trailing "New {label}" ghost row** sits at the foot of the list card and opens the create dialog
    (the same action as the header button), so a short list always shows its next step.
  - Dress the triage controls to the segmented-control / check-and-tint grammar with `aria-pressed`, the
    count, and the non-color selected cue; reuse the scoped button reset (no bare-button UA chrome).
  - Refresh the empty state to own the content area (drop the card, center the mark/copy/CTA), and add a
    "Clear search" action to the no-match state.
- [ ] **Run; expect green.** Full gate. Eyeball on the showcase (`npm run package` first; the
  showcase manifest is regenerated in Task 8, so summaries appear after that).
- [ ] **Commit:** `Dress the concept list to the office gold standard`

### Task 8: regenerate the showcase manifest and update the E2E

**Files:**
- Modify: `examples/showcase/src/content/.cairn/index.json` (regenerated)
- Modify: `examples/showcase/e2e/golden-path.spec.ts`

- [ ] Regenerate the showcase manifest so it carries summaries and passes the build verification:
  from `examples/showcase`, run the manifest bin (`npm run cairn:manifest` if scripted, else
  `npx cairn-manifest`), and confirm `git diff` shows the new `summary` keys.
- [ ] Add one E2E assertion to the golden path: on the posts list, the triage filters are present
  with counts, selecting **Pending edits** narrows to the entries with unpublished edits, and a row
  shows its summary line. Keep the rest of the golden path unchanged in substance.
- [ ] Run `npm run package`, then `npm run test:e2e` in `examples/showcase`; expect green.
- [ ] **Commit:** `Regenerate the showcase manifest and cover the triage in the E2E`

### Task 9: the post-build frontend-design critique (main loop)

- [ ] With the office implemented on the showcase (`npm run package`, build, preview), run the
  frontend-design capture loop: screenshot the real office list, the few-entry state, the empty
  state, and an active filter, in both themes. Critique against the approved mockup (the measured-
  critique method). Fold any divergence back into `ConceptList.svelte` (and re-run the gate) before
  the review gate.
- [ ] Keep the final captures for the review gate.

### Task 10: the docs arm

**Files:**
- Modify: `docs/internal/admin-design-system.md` (the office-list recipe)
- Modify: `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`
- Check: `docs/reference/` for any list/manifest reference page; `README.md`

- [ ] Add the office-list recipe to the design system (component recipes): the triage control (the
  segmented/check-and-tint grammar, the counts), the self-describing row (the summary line and its
  `deriveExcerpt` source), and the few-entry state. Note the office now fully extends the gold
  standard.
- [ ] **Changelog `0.55.0`** with the `Consumers must: regenerate the content manifest` line (the
  manifest gained a `summary` field; the `cairnManifest` build fails closed until the site
  regenerates and commits). The matching upgrade-guide entry appends at the bottom of
  `docs/guides/upgrade-cairn.md` with the same line.
- [ ] Run the doc gates: `npm run check:reference`, `check:package`, `check:docs`, `check:prose`,
  `check:readiness`, all exit 0.
- [ ] **Commit:** `Document the office list and the manifest summary`

---

## Pass end (the cairn-pass ritual, in order)

1. **Simplifier** over the pass's changed code (`code-simplifier:code-simplifier`, `model: opus`).
2. **Full gate at the tip,** run first-hand: `npm run check` 0/0, `npm test` exit 0, the five
   doc/readiness gates, showcase E2E.
3. **Review gate:** fan out `svelte-reviewer` and `daisyui-a11y-reviewer` in parallel (both
   `model: opus`); the a11y reviewer checks the triage control's non-color cue and the row
   semantics. No auth/worker/signing change, so the other two sit out. Fold findings in.
4. **Live admin smoke:** judge proportionality. No server/auth/action change (only the additive
   `summary` field and client-side filtering); the showcase E2E plus the both-theme captures cover
   the surface. Record the judgment with evidence (the precedent from prior presentation passes).
5. **Version bump `0.55.0`** plus the release-notes-ready changelog window (carrying the
   `Consumers must:` regenerate line).
6. **Post-mortem** appended here; **STATUS.md** updated on `main`. The queue after this: the
   gates-and-tooling pass, the gallery brainstorm, P4. The two sites pick up `^0.55.0` with the
   one manifest-regenerate action.

## Out of scope (the spec's list, binding unless the adversarial review overturns it)

Bulk actions, inline quick-edit, saved views, a grid/card view, author and comment columns,
analytics in the row, and grouping by field (deferred). Task 2's adversarial UI review is the check
on whether any of these is load-bearing for the list's UI; absent an accepted finding, they stay out.

---

## Post-mortem (2026-06-13)

**Landed on `main` as `0.55.0`, unpublished.** The office list now extends the editor/desk gold
standard: a publish-state triage filter and self-describing rows, fed by one additive data-layer
change. Commits `c0bd097..cba576e` (mockup and plan reorder at `c0bd097`, the bump and tracking in
this commit's window).

**What was built, in order.** The pass ran mockup-first, then the review, then the implementation,
per Geoff's reorder (the adversarial review is a UI critique, so it judged a concrete UI; the
approval stop was dropped). Task 1 extended the gold-standard mockup with eight office screens (a
realistic fill, an active filter, the few-entry Pages state, empty, no-match, both themes, and a
triage-states strip). Task 2 ran an Opus adversarial UI review against the rendered mockup (Ghost,
WordPress, Sveltia, Contentful, Sanity); the accepted findings folded into the mockup and the spec
(the Edited primary tint, the Hidden row treatment, the trailing create row, the empty-owns-canvas
state, column-edge truncation), the rejected ones recorded with their defense. Tasks 3-5 moved
`deriveExcerpt` into `content/` and threaded an additive `summary` through the manifest and both list
rows. Tasks 6-7 built the triage (an orthogonal two-axis model) and dressed the list to the mockup.
Task 8 regenerated the showcase manifest and covered the triage in the E2E. Task 9's post-build
critique captured the real showcase office (both themes) and confirmed fidelity. Task 10 documented
it.

**Verified (evidence).** Gate green at the tip (`cba576e`), run first-hand: `npm run check` 916
files 0/0; `npm test` 157 files / 1500 tests exit 0; the five doc/readiness gates exit 0; the
showcase E2E 9 passed in a real browser (including the new triage assertions). The post-build
captures showed the real component matching the mockup grade in both themes, including the
serendipitous true empty state (the showcase Pages concept has no entries) and the filter-aware
no-match copy. The live `wrangler dev` smoke was judged not proportionate (no server/auth/action/SSR
change; additive `summary` plus client-side filtering), the precedent from the 0.52-0.54 presentation
passes.

**Decisions locked.** (1) Hidden is **orthogonal** to the publish partition: a published-but-hidden
entry counts in both Published and Hidden, and the Hidden toggle composes with whichever partition is
active (a two-axis model: a `partition` enum plus a `hiddenOnly` boolean, not a four-value enum). The
plan's original Task 6 test number encoded a mutually-exclusive reading and was corrected. (2) The
row form is an **enriched sortable table** with a title sub-line (not a row-list), preserving
`aria-sort` and self-describing each row. (3) The Edited badge tints **primary** (the action signal
that mirrors "Publish site (N)"), not amber. (4) Hidden is a **row treatment** (dimmed title plus an
eye-off tag), not a competing badge, so the status cell holds one publish-state badge.

**Review gate.** `svelte-reviewer` and `daisyui-a11y-reviewer` (both Opus). The a11y review found one
Critical (the draft-row summary stacked opacity on muted text, 2.09:1 in light, WCAG 1.4.3) and an
Important (the zero-count opacity dim, 1.61:1 light); both fixed in `cba576e` by dimming only the
high-contrast title and dropping the zero-count dim. The svelte review found two Minor `'' `-vs-`null`
contract drifts in the `summary` shape, also folded in (`|| null` in the pending row, `|| undefined`
in the manifest builder). The Edited primary-tint badge passes by the repo's locked
`text-primary on primary/10` basis.

**Carry-forwards.** (1) The create affordances read `New {label}` (plural: "New Posts"), where the
mockup idealized the singular; needs an optional `singular` on the concept descriptor (logged in the
friction log, a ROADMAP candidate). The mockup stays aspirational on that one string until it lands.
(2) The plan asserted `ConceptList.test.ts` did not exist ("create it"); it already existed, so Task 6
extended it. A planning-accuracy note, not a defect.

**Consumer action.** One: regenerate the content manifest (`npm run cairn:manifest` or
`npx cairn-manifest`, then commit). The `cairnManifest` build fails closed until the regenerated
manifest with the new `summary` keys is committed. Both sites have the plugin wired, so the build
fails loudly rather than drifting.
