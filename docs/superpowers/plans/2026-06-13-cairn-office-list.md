# The office list rises to the gold standard: triage + self-describing rows (0.55.0)

> **For agentic workers:** execute task-by-task with `cairn-implementer` (the repo default); the
> main loop reviews each diff and verifies the full gate between dispatches. Tasks 1, 2, and 9 run
> in the main loop (design and critique, not implementation). Task 2 ends on a HUMAN APPROVAL GATE:
> do not start the implementation tasks until Geoff approves the mockup. Steps use checkbox syntax.

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

### Task 1: the adversarial design review (main loop, informs the mockup)

Run before the mockup so its findings shape the design. This is a critique, not code.

- [ ] Dispatch an independent review (a general-purpose agent, or a Workflow find-and-verify sweep
  if Geoff opts in) that argues the competition's case against the spec's Direction B. Give it the
  spec (`docs/superpowers/specs/2026-06-13-cairn-office-list-design.md`), the precedent findings
  (Ghost, Sveltia, WordPress in the brainstorm), and a mandate to add Contentful and Sanity (the
  record-school CMSs). The question: what do these tools do better on content browsing that B
  misses, and is anything on the spec's out-of-scope list actually load-bearing for a non-technical
  author? Demand concrete, cited findings, not affirmation.
- [ ] Triage the findings in the main loop. Fold the accepted ones into the spec (amend it) and
  carry them into the mockup brief. Record the rejected ones with a one-line reason, so the
  out-of-scope list is defended, not just inherited.
- [ ] No commit yet (the spec amendment, if any, commits with Task 2's mockup).

### Task 2: the office-list gold-standard mockup, then the approval gate (main loop, frontend-design)

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
- [ ] Serve and eyeball the mockup (the file's documented port-4180 recipe), fold the Task 1
  findings in, and refine to the desk's grade.
- [ ] Commit the mockup (and the spec amendment if Task 1 produced one):
  `Mock the office list at the gold standard`.
- [ ] **STOP. Present the mockup to Geoff for approval, the desk precedent. Do not start Task 3
  until he approves.** Record his approval (and any change requests, folded in) before proceeding.

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
// counts are exact, from the loaded set
test('the triage shows exact counts per state', async () => {
  // render ConceptList with entries: 2 published, 1 edited, 1 new, 1 draft(published)
  // expect All = 5, Pending edits = 2 (new + edited), Published = 2, Hidden = 1
});

// selecting a filter narrows the rows
test('Pending edits filters to new and edited rows', async () => {
  // click the Pending edits filter; only the new + edited rows remain
});

// search composes with the active filter
test('search narrows within the active filter', async () => {
  // select Published, type a query; only published rows matching the query remain
});

// the default filter is All
test('All is the default and shows every row', async () => { /* ... */ });
```

- [ ] **Run; expect failures.**
- [ ] **Implement** the filter state and derived sets in `ConceptList.svelte`:
  - A `filter` state: `'all' | 'pending' | 'published' | 'hidden'`, default `'all'`.
  - Counts derived from `data.entries`: `pending = new + edited`, `published = published`,
    `hidden = draft === true`, `all = entries.length`.
  - The `filtered` derived (which currently filters by `query` only) gains the state predicate:
    pending = `status !== 'published'`; published = `status === 'published'`; hidden = `draft`;
    all = pass. Compose with the existing query filter and the existing sort/paging downstream.
  - Reset `page = 1` when the filter changes.
  - Render the filter controls as placeholder buttons for now (Task 7 dresses them to the mockup);
    each shows its label and count and toggles `filter`.
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
```

- [ ] **Run; expect failures.**
- [ ] **Implement** against the approved mockup (Task 2):
  - Add the summary line to each row (the muted secondary line under the title), rendered only when
    `entry.summary` is non-empty.
  - Dress the triage controls to the mockup's segmented-control / check-and-tint grammar (the
    footer's vocabulary): `aria-pressed` on each, the count, the non-color selected cue. Reuse the
    admin's scoped button reset (no bare-button UA chrome).
  - Apply the mockup's row form (table-with-sub-line or row-list, whichever the mockup fixed),
    keeping the sortable Title/Date affordance if the table shape survives (preserve `aria-sort`),
    and keeping the always-visible delete action.
  - Refresh the empty and few-entry states to the mockup.
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
analytics in the row, and grouping by field (deferred). Task 1 is the check on whether any of these
earned a place; absent an accepted finding, they stay out.
