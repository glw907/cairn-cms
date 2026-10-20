# Plan: media Phase 3c, the admin Media Library

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet), test-first against the suite. The main loop reviews each diff and clears the full
> gate before the next dispatch, and upshifts a dispatch (`model: opus`) for the high-blast tasks the
> plan flags. Honor the cairn conventions and the `cairn-pass` ritual. Steps are tracked with
> checkboxes (`- [ ]`).

**Goal:** Give cairn a first-class admin Media Library screen, a peer of Posts and Pages, that browses
every committed media asset, shows where each is used (across `main` and open edit branches), edits its
name and default alt, and deletes it safely. Admin-only; the public site renders no gallery.

**Architecture:** A new `media` admin view registers through the single-mount admin dispatch. A
`mediaLibraryLoad` unions `media.json` from `main` with every open `cairn/*` branch (so a not-yet-published
asset shows) and computes a hash-keyed where-used index from a new content-manifest media-references field
(for `main`) plus a parse of each open branch's edited entry markdown. The screen is a visual grid with a
list-density toggle and a non-modal detail slide-over; safe-delete is a fresh-gated, commit-first action.
The on-disk content stays canonical; the manifest field is additive (no build break). The correctness core
(the manifest field, the extractor, the usage index) lands first and alone, then the screen builds on it.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, the cairn admin dispatch/composer
(`admin-dispatch`/`cairn-admin`), the content manifest (`content/manifest.ts`), the media manifest and
store (`media/manifest.ts`, `media/store.ts`), the GitHub-App commit/branch primitives (`github/repo.ts`,
`github/branches.ts`), the 2b media projection (`media/library-entry.ts`, `media/reference.ts`,
`media/naming.ts`), DaisyUI v5, Vitest (unit + real-browser component), Playwright (the showcase E2E).

Source spec: `docs/superpowers/specs/2026-06-17-cairn-media-3c-library-design.md` (the adversarially
reviewed design, with the locked decisions each task must meet). The polished visual contract is
`docs/internal/design/2026-06-17-media-library-mockup.html`. The research ground is
`docs/internal/design/2026-06-17-media-library-design-reference.md`. Umbrella: the gallery spec
`docs/superpowers/specs/2026-06-15-cairn-media-gallery-design.md`. Builds on the media stack on `main`
(`0.57.0`, the in-progress bundled media window).

---

## Execution

Standard loop: one `cairn-implementer` per task, test-first, on this `feat/media-3c` worktree off `main`,
the main loop reviewing each diff and clearing the full gate (`npm run check` 0/0, `npm test` exit 0, and
the reference, signature, package, docs, readiness, prose, and version gates) between dispatches. Effort:
high.

Tasks 1, 2, 4, 5, and 6 are high-blast-radius: review closely and upshift to `model: opus` when the logic
warrants. Task 1 (the content-manifest field + extractor) and Task 2 (the cross-branch usage index) are the
correctness core that the spec sequences FIRST and alone, because they touch the committed manifest shape
that two production sites carry and they are the headline feature; they must land green under unit tests
before any UI depends on them. Task 4 (the union loader + the admin-view registration) is the single-mount
seam with several touch points. Task 5 (the safe-delete + update actions) is delete correctness, the
fresh-read gate, and the commit-first ordering. Task 6 (the screen) is the large grid/list UI.

Tasks 9 (the frontend-design polish) and 10 (the pass-end, whose adversarial review-gate workflow needs
Geoff's "use a workflow" opt-in) run in the main loop. The mockup and the design reference are done.

Build-dependency order: Task 1 (the manifest field + extractor) before Task 2 (the index reads it for
`main`). Task 3 (the shared projection + `removeMediaEntry`) is small and independent; do it early. Task 4
(the union loader + view) depends on Task 2 (the usage overlay) and Task 3 (the projection). Task 5 (the
actions) depends on Task 3 (`removeMediaEntry`) and is consumed by Task 7. Task 6 (the screen) and Task 7
(the detail + delete dialog) depend on Task 4 (the loader/view) and Task 5 (the actions). Task 8 (the E2E)
drives the whole stack.

A note on the version: 3c completes Phase 3. The version stays `0.57.0` (the in-progress bundled media
window); do not bump mid-pass. After 3c lands and Phase 3 is complete, the single bundled `0.57.0` release
plus the per-site cutover become available at pass-end (Geoff's call). The content-manifest field is
additive (no build break); a site regenerates its manifest for accurate `main` where-used, a recommended
changelog step, not a required consumer action.

---

## Task 1 (high-blast, main loop reviews closely): the content-manifest media-references field and the extractor

Spec: "Where-used" (locked decision 4), "The pieces" §3, Open risk 3. The correctness core; lands first.

**Files:**
- Create: `src/lib/content/media-refs.ts` (the pure extractor: an entry's frontmatter hero `image.src` plus its body image nodes, returned as a deduped list of content hashes)
- Modify: `src/lib/content/manifest.ts` (`ManifestEntry` gains an additive optional `mediaRefs?: string[]`; `manifestEntryFromFile` populates it; the lenient read leaves it absent on an old manifest; `verifyManifest`/`serializeManifest` carry it)
- Test: `src/tests/unit/content-manifest.test.ts` (or the nearest manifest suite), `src/tests/unit/content-media-refs.test.ts`

Build the `main`-side media-usage source. A frontmatter hero lives outside the markdown body, so the
extractor reads BOTH sites or it misses every hero (the spec's load-bearing landmine).

- The extractor in `media-refs.ts`: given an entry's parsed frontmatter and body (reuse `parseMarkdown`),
  return the deduped content hashes the entry references. Walk the body to mdast and visit `image` nodes,
  running `parseMediaToken(node.url)` (from `media/reference.ts`); this also catches a 3a `:::figure`, whose
  inner node is a real image. Separately walk the frontmatter for an `image`-typed field's `.src` (the hero
  is `image: { src: media:slug.hash, ... }`) and parse it. Key every match by the parsed `ref.hash` (the
  immutable truth), never the slug. Dedupe by hash within the entry. A non-media image and a malformed
  token are skipped, never thrown.
- The manifest field: add `mediaRefs?: string[]` to `ManifestEntry` as an additive optional field.
  `manifestEntryFromFile` calls the extractor and sets `mediaRefs` (omit when empty, to keep an
  image-free entry's row unchanged). Keep `parseManifest` lenient: a committed manifest without `mediaRefs`
  still parses (the field defaults to absent/empty), so no build breaks; do NOT bump the manifest `version`
  for an additive optional field unless `verifyManifest`'s derived-vs-committed comparison forces it (if it
  does, make the comparison treat an absent `mediaRefs` as empty so an un-regenerated site does not red).
- Regenerate the showcase content manifest so it carries `mediaRefs` (the hello post's hero), so the suite
  and the E2E exercise a populated index. Run the repo's manifest regenerate (`npm run cairn:manifest` or
  the documented bin) and commit the regenerated `index.json`.

**Tests:**
- The extractor returns the hero hash from a frontmatter `image.src`, the body-image hashes from
  `![](media:...)`, and the figure's inner image hash; dedupes an asset referenced twice; skips a non-media
  image and a malformed token without throwing; keys by hash (a bare `media:<hash>` and a
  `media:<slug>.<hash>` for the same bytes collapse to one).
- `manifestEntryFromFile` records `mediaRefs` for an entry with a hero and/or body images, and omits it for
  an image-free entry.
- A committed manifest WITHOUT `mediaRefs` parses (lenient), and `verifyManifest` does not red on an absent
  `mediaRefs` (treated as empty).

**Gate:** the targeted tests green, the full gate (check 0/0, test exit 0, reference/signature/package/docs),
and the showcase manifest regenerated and committed.

---

## Task 2 (high-blast, main loop reviews closely): the cross-branch usage index

Spec: "Where-used" (locked decision 4), "The pieces" §3, Open risks 1 and 2. The headline feature.

**Files:**
- Create: `src/lib/media/usage.ts` (the usage-index builder: a `Map<hash, UsageEntry[]>` over `main` plus
  open branches; `UsageEntry` carries the concept, the id, the title/permalink for the link, and the branch
  origin: published vs the `cairn/*` branch name)
- Test: `src/tests/unit/media-usage.test.ts` (or an integration test if the GitHub reads run in workerd)

Union `main` with every open `cairn/*` branch, keyed by hash, counting DISTINCT entries.

- The `main` side reads the content manifest (Task 1's `mediaRefs` per entry); no per-file crawl. Build the
  reverse map: for each manifest entry, for each hash in `mediaRefs`, push a published `UsageEntry`.
- The branch side: `listBranches(repo, PENDING_PREFIX, token)` (`github/branches.ts`) enumerates open
  `cairn/<concept>/<id>` branches. For each, reconstruct the edited entry's path from the branch name (the
  concept's `dir` + the id's filename, the way the existing branch tooling derives it), `readRaw` that one
  file (`github/repo.ts`), run the Task 1 extractor on it, and push a branch `UsageEntry` (carrying the
  branch name) for each hash. Do NOT read a manifest from a branch (the content manifest is never committed
  to a branch) and do NOT tree-list a branch (the entry path is derivable).
- Count distinct entries: an asset used twice in one entry is one `UsageEntry`. A site's published use and
  an open-branch edit of the same entry are distinct origins (published vs branch), so they may both appear;
  group them in the consumer by origin.
- The verdict the screen renders is "found in N entries" / "no references found", never a bare "unused";
  carry the raw-HTML caveat in a doc comment (a ref hidden in raw HTML is undetectable).

**Tests:**
- `main`-only usage: an asset in a published entry's `mediaRefs` yields one published `UsageEntry`; an
  unreferenced asset yields none.
- A branch-only reference (an asset referenced in an open `cairn/*` branch's entry but not on `main`) is
  unioned in with the branch origin.
- An asset referenced twice in one entry counts once.
- A frontmatter-hero reference is found (proves the Task 1 extractor's frontmatter arm flows through).
- Keying by hash: a renamed-slug reference still resolves to the same asset.

**Gate:** full gate green (run in the layer where the GitHub-App reads are testable; mirror the existing
branch-tooling tests).

---

## Task 3: the shared projection helper, `createdAt`, and `removeMediaEntry`

Spec: locked decision 8, "Engine and contract changes." Small, independent plumbing; do it early.

**Files:**
- Modify: `src/lib/media/library-entry.ts` (add `createdAt: string` to `MediaLibraryEntry`; add a pure
  `mediaLibraryEntry(entry: MediaEntry): MediaLibraryEntry` projection helper)
- Modify: `src/lib/sveltekit/content-routes.ts` (`editLoad`'s projection loop calls the shared helper and so
  sets `createdAt`)
- Modify: `src/lib/media/manifest.ts` (add `removeMediaEntry(manifest, hash): MediaManifest`, the mirror of
  `upsertMediaEntry`)
- Test: `src/tests/unit/media-library-entry.test.ts`, `src/tests/unit/media-manifest.test.ts`

- The shared helper projects a `MediaEntry` to a `MediaLibraryEntry`, now including `createdAt` (already on
  `MediaEntry`). `editLoad` uses it so the popover and the Library never diverge on the shared type.
- `removeMediaEntry` returns a new manifest without the given hash's row (pure, no mutation), mirroring
  `upsertMediaEntry`.

**Tests:**
- `mediaLibraryEntry` projects every field including `createdAt`.
- `editLoad` still returns a valid `mediaLibrary` (now carrying `createdAt`).
- `removeMediaEntry` drops the row and leaves the rest unchanged; removing an absent hash is a no-op.

**Gate:** full gate green.

---

## Task 4 (high-blast, main loop reviews closely): the union loader and the `media` admin view

Spec: locked decisions 1 and 8, "The pieces" §6, Open risk 5.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`mediaLibraryLoad`: union `media.json` from `main` and
  every open `cairn/*` branch by hash, project via Task 3's helper, attach the Task 2 usage overlay)
- Modify: `src/lib/sveltekit/admin-dispatch.ts` (`AdminView` gains `{ view: 'media' }`; the single-segment
  branch of the path parser returns `{ view: 'media' }` for `media`; `media` is its own view, NOT added to
  the reserved-no-view segment set)
- Modify: `src/lib/sveltekit/cairn-admin.ts` (the `AdminData` union gains a `media` variant; the `load`
  switch gains a `case 'media'` running `layoutLoad` concurrently with `mediaLibraryLoad`, mirroring the
  editors arm; register the management actions placeholder; add `media` to `authedViews` and `anyView` so
  the topbar publish-all and logout work from the screen)
- Test: `src/tests/unit/content-routes-media.test.ts`, `src/tests/unit/admin-dispatch.test.ts`,
  `src/tests/integration` if the loader's GitHub reads run in workerd

- `mediaLibraryLoad` reads `media.json` from `main` and from each open `cairn/*` branch (the 2b case: an
  upload commits to the entry's branch and is promoted to `main` only at publish, so a not-yet-published
  asset lives only on a branch). Union the rows by hash (a branch row for a hash absent on `main` is added;
  a hash on both prefers `main`'s row, since identical bytes share the row). Project via Task 3's helper.
  Attach the Task 2 usage overlay (a per-hash `{ count, entries }`), kept SEPARATE from `MediaLibraryEntry`
  so the popover stays decoupled. Return `{ assets: MediaLibraryEntry[], usage: Record<hash, ...> }`.
- The view registration hits every touch point (or the view is silently unreachable/untyped): the
  `AdminView` union, the single-segment parser branch, the `AdminData` variant, the `load` case, the
  actions record, and the `authedViews`/`anyView` membership.

**Tests:**
- `mediaLibraryLoad` returns rows from `main`; a branch-only asset appears in the union; the usage overlay
  is attached and keyed by hash.
- `parseAdminPath('/admin/media')` (or the engine's equivalent) yields `{ view: 'media' }`; `media` is not
  treated as a reserved no-view segment.
- The composer `load` for the media view returns the layout plus the media data.

**Gate:** full gate green (the loader's GitHub reads tested in the layer the existing loaders use).

---

## Task 5 (high-blast, main loop reviews closely): the safe-delete and rename/default-alt actions

Spec: locked decisions 5 and 6, "The pieces" §4 and §5, Open risk 4.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (a `mediaDeleteAction` and a `mediaUpdateAction`, wired into
  the `cairn-admin` actions record for the media view)
- Test: `src/tests/unit/content-routes-media.test.ts` (extend), `src/tests/integration` for the commit path

- `mediaDeleteAction`: recheck usage server-side against a FRESH index read (Task 2) at delete time, never a
  client-passed count (mirror `deleteEntry`'s authoritative inbound recheck). When the asset is in use,
  refuse with the breaking entries (grouped published-then-branch) and emit the existing
  `media.delete_blocked` event. When confirmed (orphan, or the type-to-confirm slug matched), commit the
  manifest delete FIRST (`removeMediaEntry` then `commitFiles` of the serialized `media.json` to `main`,
  which supports a delete through a null tree entry), THEN `store.delete(r2Key)` the R2 object, and emit the
  existing `media.deleted` event. The order matters: a failure after the commit leaves a benign orphan
  (bytes, no row), never a broken delivery (row, no bytes).
- `mediaUpdateAction`: edit the `media.json` row (the `displayName`, the `slug`, the default `alt`) and
  commit the merged manifest. No reference rewrite (the resolver and route key on the hash, so a rename
  never breaks a reference). The default `alt` is the asset default, not a propagating edit.
- Do NOT wire `reconcileMedia` as a destructive sweeper; it stays read-only in 3c.

**Tests:**
- Delete refuses an in-use asset against a fresh recheck and emits `media.delete_blocked`; a stale
  client-passed "no references" does not bypass the gate.
- Delete of an orphan commits the manifest delete then the R2 delete (assert the order and both calls), and
  emits `media.deleted`.
- `mediaUpdateAction` edits the row (displayName/slug/default alt) and commits; an existing `media:`
  reference still resolves after a slug rename.

**Gate:** full gate green (the commit path tested where the existing commit-action tests run).

---

## Task 6 (high-blast UI, main loop reviews closely): the Library screen

Spec: locked decisions 2 and 9, "The pieces" §1, Accessibility, the polished mockup.

**Files:**
- Create: `src/lib/components/CairnMediaLibrary.svelte` (the screen: grid + list-density + triage + search +
  pagination + empty state), and a small row/tile sub-component if it keeps the file focused
- Modify: the admin route/layout wiring that renders the `media` view (mirror how the Posts/Pages list view
  renders), and the admin nav entry under Content (`AdminLayout` or the nav source)
- Test: `src/tests/component/CairnMediaLibrary.test.ts`

Build per the consolidated mockup (`2026-06-17-media-library-mockup.html`):

- Props: the `assets: MediaLibraryEntry[]` and the `usage` overlay from `mediaLibraryLoad`. The grid is the
  default: a roving-tabindex `role="listbox"` of tiles, each an `option` with `object-fit: contain` on a
  quiet mat, the name in a footer, the alt-status glyph carrying an accessible name (Described
  `--color-positive-ink`, Needs alt `--cairn-warning-ink`, Decorative muted, glyph plus label never hue
  alone), and a compact usage marker. Space/enter opens the detail (Task 7).
- The density toggle flips to a real `<table>`: thumbnail, name + metadata (dimensions, size, type, date),
  the alt-status chip, the usage pill ("used in N" / "no references found"), a sortable Added column (real
  `<th>` `<button>`s with `aria-sort`), and an always-visible per-row delete (a real `<button>`).
- The header is the office recipe (the Media eyebrow, the "Media library" heading, a live count, the Upload
  primary). The toolbar row: search (over name/alt/caption across the FULL set), the triage segmented
  control as a pick-one `role="radiogroup"` with `aria-checked` (All / Needs alt / Unused, live counts),
  and the grid/list density toggle. The type facet (Images / Documents) stays hidden until more than one
  type exists.
- Pagination is client-side over the full list (a growing visible window) with an announced "Showing N of
  M"; never infinite scroll.
- An asset whose R2 object is missing (its thumbnail 404s) still lists, with a broken-image affordance, so
  the dead row can be cleared.
- The empty state owns the content area (the office recipe, the Upload CTA, a dropzone line); triage and
  search hide until there is content.
- Reuse the 2b row vocabulary and `publicPath(entry.slug, entry.hash, entry.ext, 'slug')` for thumbnails.

**Tests (real browser):**
- The grid renders tiles from a fixture (name, alt-status glyph, usage marker); the roving listbox moves
  focus and opens on enter.
- The density toggle shows the table with the sortable header and the usage pill; sorting by Added works.
- The triage radiogroup filters to Needs alt and to Unused with correct counts; search filters across
  name/alt/caption.
- Client-side pagination grows the visible window and announces the count.
- The empty state shows the dropzone; a missing-bytes row lists with the broken-image affordance.

**Gate:** full gate green, the editor-boundary test green (no `@codemirror` leak), the prose gate (the
screen copy) green.

---

## Task 7 (UI, main loop reviews closely): the detail slide-over and the safe-delete dialog

Spec: locked decisions 3, 5, and 6, "The pieces" §2, Accessibility, the polished mockup.

**Files:**
- Modify/Create: the detail surface in `CairnMediaLibrary.svelte` or a `MediaDetail.svelte` sub-component,
  and a safe-delete alertdialog
- Test: `src/tests/component/CairnMediaLibrary.test.ts` (extend) or `MediaDetail.test.ts`

- The detail is a NON-MODAL slide-over (the established details-slide-over recipe: no scrim, focus moves in
  and out, Escape closes, focus returns to the originating tile/row). Top to bottom: the large preview, the
  name and the `media:` reference, the alt editor (a describe/decorative radiogroup replicating the 2b
  `MediaCaptureCard` alt model plus the alt field, alt as debt, never gated, LABELED as the asset default
  for new placements), the where-used list grouped under "Published on the site" and "In an unpublished
  edit" (each entry a link to its editor; an edit-branch entry names its branch), the metadata grid, and
  the actions (Delete and Rename; no Replace in this slice).
- Rename + default-alt submit through `mediaUpdateAction` (Task 5). Delete opens the two-faced
  `role="alertdialog"` (no light dismiss): the in-use face names the breaking entries grouped
  published-then-branch and requires typing the slug; the orphan face is a calm confirm with the
  git-recoverable note. Confirm submits `mediaDeleteAction` (Task 5), which re-gates server-side.
- Below the narrow breakpoint the slide-over becomes a bottom sheet.

**Tests (real browser):**
- The slide-over opens non-modal (the list stays in the a11y tree), Escape closes it, focus returns to the
  origin.
- The where-used list groups published vs branch and links each entry.
- The alt editor sets the default alt and submits via update; rename submits via update.
- The delete dialog shows the in-use face (entries listed, type-to-confirm) and the orphan face (calm
  confirm); confirming submits the delete.

**Gate:** full gate green.

---

## Task 8: the showcase vertical slice and the E2E

Spec: Verification.

**Files:**
- Modify: `examples/showcase` admin wiring so `/admin/media` renders the Library (the showcase already
  composes the admin; register nothing the engine registers)
- Create or modify: seed media for the showcase (the regenerated `media.json` plus content) so the library
  has a realistic set including an orphan (no references), a needs-alt asset, and a branch-only asset if the
  fake backend can stage one
- Create: `examples/showcase/e2e/media-library.spec.ts`
- Modify: only the showcase admin route if needed

Behind `SHOWCASE_FAKE_BACKEND=1` (reuse the 2b/3a/3b fake R2 and fake-github harness). Drive the screen:
browse the Library, toggle the list density, filter by Needs alt and Unused, open a detail, read the
grouped where-used (a published reference, and an edit-branch reference if stageable), edit the default alt
and the name (assert the `media.json` commit), safe-delete an orphan (assert the manifest row removed and
the R2 object deleted, in that order, in the recorder), and hit the in-use refusal (assert the delete is
blocked and the breaking entries listed). Keep the 2b/3a/3b E2E specs green. The suite reaches 17 specs.

**Tests:** the E2E green in a real browser; the standing engine gate green.

**Gate:** the showcase E2E suite green (one worker), `npm run check` 0/0, `npm test` exit 0.

---

## Task 9 (main loop): the frontend-design polish pass

Spec: Verification (the polish note).

With the Library rendering in the showcase admin in both themes, run the `frontend-design` polish over the
real rendered screen against the polished mockup (`2026-06-17-media-library-mockup.html`) and the
office/desk gold standard: the grid, the list density, the detail slide-over, the triage filter, the
safe-delete dialog, the empty state, in both themes. Fold refinements into `CairnMediaLibrary.svelte` and
confirm the alt-status inks and the usage treatments hold contrast in both themes.

**Gate:** full gate green after any fold-in.

---

## Task 10 (main loop): pass-end ritual

Simplify (code-simplifier over the pass's changed code), the review gate (the relevant reviewers in
parallel: `svelte-reviewer`, `daisyui-a11y-reviewer`, `cloudflare-workers-reviewer` for the commit/branch
reads and the delete path, plus an Opus correctness pass over the usage index and the safe-delete gate;
the `web-auth-security-reviewer` is not needed, since no auth changes; suggest the adversarial review-gate
workflow for Geoff's opt-in), the live admin smoke if proportionate (the screen reads and a delete commits;
the E2E plus both-theme captures may cover it, the 2b/3a/3b judgment), the docs arm (a guide for managing
the library, the admin-design-system recipe for the Library screen, the reference for the new admin route +
actions + the usage index, the explanation arm for where-used-from-git + the safe-delete model + the
asset-default-alt vs per-placement-alt distinction, the changelog entry including the recommended
content-manifest regeneration, the `log-events` table confirmed to cover the wired events, the upgrade-guide
entry, the three doc gates), the version stays `0.57.0` (3c completes Phase 3; do not bump), and the
tracking (the post-mortem in this plan, STATUS on `main`, the gallery + 3c memories). With Phase 3 complete,
the single bundled `0.57.0` release (`gh release create`) plus the per-site cutover become available,
Geoff's call.

---

## Carry-forward (the fast-follow and beyond)

- Replace-in-place, the fast-follow once the usage index and safe-delete are proven: upload-new plus a
  `main`-only repoint with a branch-delta report, reusing the rename machinery.
- Propagating an alt fix to every existing use, the same cross-branch rewrite as replace, deferred with it.
- Bulk select and a usage-aware bulk delete, once single-asset delete is proven.
- A destructive orphan-collection sweep (wiring `reconcileMedia` to bulk-delete stray objects); it stays
  read-only in 3c.
- Tags and organization, added only if a real site asks; the triage filter plus search suffices now.
- The broadened needs-alt scanner (filename-as-alt, generic words, duplicates) beyond the empty-alt signal.
- Documents as a fully surfaced type beyond the facet seam (the delivery route is image-only today).

---

## Post-mortem (2026-06-17, LANDED on `feat/media-3c`, unreleased)

All ten tasks landed test-first, one `cairn-implementer` per task, the main loop reviewing each diff and
clearing the full gate between dispatches. The high-blast tasks (1, 2, 4, 5, 6) and the integration
seed (8) ran on `model: opus`; the rest on Sonnet. The pass added ~3,300 lines across 36 files.

**What was built.** The correctness core landed first and alone: a pure `extractMediaRefs`
(`content/media-refs.ts`) reading the frontmatter hero plus body images keyed by content hash, an
additive optional `mediaRefs` field on `ManifestEntry` with a lenient `verifyManifest` so an
un-regenerated site still builds, and the cross-branch `buildUsageIndex` (`media/usage.ts`) unioning
`main` (from the manifest) with every open `cairn/*` branch (parsed markdown). Then the screen built on
it: the shared `mediaLibraryEntry` projection with `createdAt`, `removeMediaEntry`, the union
`mediaLibraryLoad` plus the `media` admin view across the single-mount dispatch, the safe-delete and
rename/default-alt actions, the `CairnMediaLibrary` screen (grid + list + triage + search + pagination
+ empty state), the non-modal detail slide-over and the two-faced safe-delete alertdialog, and the
showcase seed + E2E.

**Verified (evidence, run first-hand at the tip).** `npm run check` 994 files 0/0; `npm test` 190 files
/ 2037 tests exit 0 (the first run hit the documented `@vitest/browser` rpc-closed teardown flake; a
clean re-run confirmed 2037/2037 exit 0); the showcase Playwright E2E 23 passed in a real browser (the
new `media-library.spec.ts` adds 7 cases: browse, list density, triage filters, the grouped where-used
slide-over, a rename/default-alt commit, the orphan safe-delete, and the in-use refusal; the
2b/3a/3b/golden specs stay green); the reference, signature, package, docs, prose, version, and
editor-boundary gates green.

**Review gate.** code-simplifier (three light refinements), then a four-reviewer fan-out: `svelte`,
`daisyui-a11y`, `cloudflare-workers`, and an Opus correctness pass over the usage index and the delete
gate. The fold-in fixed real issues: a `flushSync` inside the dialog re-open effect (would throw under a
newer-but-peer-permitted Svelte) moved to `tick`; the delete gate now fails closed (a strict
`buildUsageIndex` rethrows a branch-read failure rather than treating a still-referenced asset as an
orphan); the branch arm reads in parallel and reuses one branch list rather than enumerating twice; the
triage gained the ARIA roving-tabindex keyboard pattern; the update and 404 failures now re-open the
slide-over so their error renders; native dialog Escape runs the teardown; the R2 key derives before the
commit; an empty stored slug can no longer satisfy the typed confirm. The polish pass found the
load-bearing token gap (the `--cairn-error-*` danger family the mockup defines was absent from
`cairn-admin.css`) and added it to both theme roots, contrast-checked.

**The downgraded Critical.** The Opus reviewer flagged the delete gate trusting the content manifest's
`mediaRefs` for published usage as a Critical (an un-regenerated manifest reads in-use published assets
as orphans). Triaged down: `saveToBranch` and `publishAction` both rebuild the entry via
`manifestEntryFromFile`, so every save/publish keeps `mediaRefs` fresh on `main`; media is entirely
unreleased, so no installed base carries a pre-3c media-referencing manifest; and the gate matches the
engine's existing manifest-trust model (the entry-delete gate trusts manifest links the same way).
Documented in the `mediaDeleteAction` docstring and the changelog's recommended regenerate, not
re-architected to crawl (which would break the content-manifest design principle).

**Decisions locked.** The Library is a peer of Posts/Pages at `/admin/media` through the single-mount
seam (six touch points). Where-used keys by hash across `main` plus open branches and reads the
frontmatter hero (the landmine), counting distinct entries. Safe-delete commits-then-deletes on a fresh
fail-closed gate; rename/default-alt is display-layer only (no reference rewrite). Replace, bulk, tags,
and propagating-alt stay deferred (the carry-forwards above).

**Deferred.** The live admin smoke is deferred to the first site cutover, matching 2b/3a/3b: the screen
reads and the delete/rename commits are covered by the showcase E2E and the unit/component suites, and
the both-theme rendering is covered by the mockup plus the token contrast check. The single bundled
`0.57.0` release and the per-site cutover become available at pass-end, Geoff's call. The merge and push
are held for Geoff.
