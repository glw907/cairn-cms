# Media Pass C Implementation Plan: bulk delete and orphan collection

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet), test-first against the suite. The main loop reviews each diff and clears the full
> gate before the next dispatch. Tasks 1 and 2 are pure and independent. Tasks 4 and 5 carry the
> destructive server logic and get the closest review (consider `model: opus`). Honor the cairn
> conventions and the `cairn-pass` ritual. Steps are tracked with checkboxes (`- [ ]`).

**Goal:** Let an admin bulk-delete unreferenced assets (usage-gated, skip-and-report) and collect
orphaned R2 bytes (an irreversible purge), both behind preview-and-confirm, on cairn's shipped
fail-closed safety primitives.

**Architecture:** One shared strict cross-branch usage index per batch gates every bulk delete (the
display index is selection-only); a pure partition splits the selection into deletable /
skipped-still-referenced / skipped-uncommitted; the deletable rows commit in one `commitFiles` call,
then their R2 objects delete (commit-row-then-delete-R2). Orphan collection reuses the read-only
`reconcileMedia` on demand: `orphanedObjects` feed the irreversible byte purge (re-derived fresh, no
git row), `missingObjects` feed a read-only broken-references readout. The Library grid/table gains
WAI-ARIA multi-select; new actions register through the `cairn-admin` composer.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, the cairn admin dispatch (`createContentRoutes`,
`createCairnAdmin`), `buildUsageIndex` strict (`media/usage.ts`), `reconcileMedia`/`runReconcile`
(`media/reconcile.ts`), the media manifest (`media/manifest.ts`), `commitFiles` (`github/repo.ts`),
the R2 `MediaStore` seam, DaisyUI v5, Vitest (unit + workerd integration + real-browser component),
Playwright (showcase E2E).

**Spec:** `docs/superpowers/specs/2026-06-18-cairn-media-pass-c-design.md`.
**Design target (approved rev.2 mockup):** `docs/internal/design/2026-06-18-media-pass-c-rev2-mockup.html`.

**Version:** a minor, `0.59.0` (a new admin surface: bulk delete + orphan collection). Additive, so no
consumer action; the changelog entry carries the `<!-- release-size: minor -->` marker and states no
action is required.

---

## Execution

Standard loop: one `cairn-implementer` per task, test-first, on a fresh worktree off `main`, the main
loop reviewing each diff and clearing the full gate (`npm run check` 0/0, `npm test` exit 0, plus the
reference, signature, package, docs, readiness, prose, and version gates) between dispatches. Tasks 1
through 6 are engine and unit/integration; Tasks 7 through 9 are component (real browser); Task 10 is
the showcase E2E; Task 11 is docs plus the version bump; the pass-end ritual closes it. Review Tasks 4
and 5 most closely: they are destructive and carry the fail-closed gate, the commit-row-then-delete-R2
ordering, and the irreversible purge.

The tasks are mostly independent, so this pass is a good `Workflow` candidate on Geoff's opt-in.

---

## Task 1: the bulk-delete partition (pure)

The pure core of the safety floor: given a strict usage index, the selected hashes, and the media
manifest, partition the selection into what is safe to delete and what is skipped, and why.

**Files:**
- Create: `src/lib/media/bulk-delete-plan.ts`
- Test: `src/tests/unit/media-bulk-delete-plan.test.ts`

**Behavior.** Export:

```ts
export interface BulkDeleteSkip { hash: string; reason: 'still-referenced' | 'uncommitted'; usage: UsageEntry[]; }
export interface BulkDeletePlan { deletable: string[]; skipped: BulkDeleteSkip[]; }

// Partition `selected` hashes against a STRICT usage index and the media manifest. A hash with one or
// more usage rows is skipped 'still-referenced' (carry the rows for the where-used). A hash with NO
// usage row AND no manifest row is skipped 'uncommitted' (nothing committed to delete). A hash with no
// usage row AND a committed manifest row is `deletable`. Pure; the gate is membership in the passed
// strict index, never a display count.
export function planBulkDelete(selected: string[], index: UsageIndex, manifest: MediaManifest): BulkDeletePlan;
```

`UsageIndex`/`UsageEntry` are from `media/usage.ts`; `MediaManifest` from `media/manifest.ts`. Preserve
the input order of `selected` in both output arrays.

**Tests (write first):**
- A hash with no usage row and a manifest row is deletable.
- A hash with usage rows is skipped 'still-referenced' with its rows attached.
- A hash with no usage row and no manifest row is skipped 'uncommitted'.
- A mixed selection partitions correctly and preserves order.
- An empty selection yields empty buckets.

**Gate:** full gate green. Internal module, no reference page.

---

## Task 2: the orphan-scan projection (pure)

Project `reconcileMedia`'s two directions plus the usage index into the scan surface's shape: the
purgeable byte-rows and the read-only broken-references rows.

**Files:**
- Create: `src/lib/media/orphan-scan.ts`
- Test: `src/tests/unit/media-orphan-scan.test.ts`

**Behavior.** Export:

```ts
export interface OrphanByteRow { key: string; hash: string; }                 // orphanedObjects: R2 key, no manifest row
export interface BrokenRefRow { hash: string; slug: string; usage: UsageEntry[]; } // missingObjects: row whose bytes are gone
export interface OrphanScan { orphanedBytes: OrphanByteRow[]; brokenRefs: BrokenRefRow[]; }

// Build the scan surface model from a ReconcileResult, the media manifest, and the usage index.
// `orphanedBytes` come from reconcile.orphanedObjects (parse the R2 key to its 16-hex hash via the
// shared media-key grammar). `brokenRefs` come from reconcile.missingObjects: the manifest row's slug
// plus its where-used rows from the index (so the readout can show which entries point at the gone
// bytes). Pure.
export function buildOrphanScan(reconcile: ReconcileResult, manifest: MediaManifest, index: UsageIndex): OrphanScan;
```

Reuse the `MEDIA_KEY_RE` grammar from `reconcile.ts` (export it if not already) to derive the hash from
an orphaned key; do not invent a second regex.

**Tests (write first):**
- An orphaned R2 key projects to a byte-row with its parsed hash.
- A `missingObjects` hash projects to a broken-ref row with the manifest slug and its usage rows.
- A `missingObjects` hash with no usage rows still projects (empty usage).
- An empty reconcile result yields empty arrays.

**Gate:** full gate green. Internal module, no reference page.

---

## Task 3: flash flags, fail payloads, and types

Wire the new flash flags, the bulk/purge fail payload, and the returned-summary types so Tasks 4 and 5
have their surfaces. Small and enabling.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (the `MediaLibraryData['flash']` union; a
  `MediaBulkFailure` interface for the fail-closed/binding refusals; the `ContentFormFailure` union;
  the returned-summary types `MediaBulkDeleteResult` and `MediaOrphanPurgeResult`; `mediaLibraryLoad`
  reads the new flags)
- Modify: `src/lib/sveltekit/index.ts` (re-export `MediaBulkFailure`)
- Modify: `docs/reference/sveltekit.md` (the `MediaBulkFailure` row + the union update; keep
  `check:reference`/`check:reference:signatures` green)
- Test: `src/tests/unit/content-routes-media.test.ts` (extend)

**Behavior.**
- Extend the flash union to add `'bulkDeleted' | 'orphansPurged'` (the component also reads the
  returned summary; the flash covers a redirect fallback). Update `mediaLibraryLoad` to map
  `?bulkDeleted=1`/`?orphansPurged=1`.
- `MediaBulkFailure { error: string }` (the fail-closed 503 and the media-off/binding 503 for both the
  bulk delete and the purge; the per-item outcomes ride the returned summary, not a fail). Add it to
  `ContentFormFailure` and re-export it.
- `MediaBulkDeleteResult { deleted: string[]; skipped: BulkDeleteSkip[]; failed: { hash: string; error: string }[] }`
  and `MediaOrphanPurgeResult { purged: string[]; skippedClaimed: string[]; failed: { key: string; error: string }[] }`
  (exported from `content-routes.ts` for the bundled component; NOT added to the subpath index, like the
  Pass B preview types, so they carry no reference page). Import `BulkDeleteSkip` from
  `../media/bulk-delete-plan.js`.

**Tests:** `mediaLibraryLoad` returns the new flash flags; a type assertion that `ContentFormFailure`
includes `MediaBulkFailure`.

**Gate:** full gate green including the reference/signature/package gates (the new `MediaBulkFailure`
needs its `sveltekit.md` row).

---

## Task 4 (review closely): the bulk-delete action

The destructive bulk action: one strict index, the pure partition, one atomic commit of the deletable
rows, then their R2 deletes, returning the itemized summary. Skip-and-report; fail-closed.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`mediaBulkDelete`; register on the returned record)
- Test: `src/tests/unit/content-routes-media-bulk.test.ts` (GithubDouble harness)

**Behavior.** Mirror `mediaDeleteAction` for the primitives, extended to many items:
- `requireSession`, `mintToken`, read the fresh media manifest and the fresh content manifest.
- Read the selected hashes from the form (`form.getAll('hash')` or a JSON `hashes` field; validate each
  against `MEDIA_HASH_RE`; ignore malformed).
- Media-on guard and resolve the R2 binding BEFORE any write (a missing binding returns
  `fail(503, { error } satisfies MediaBulkFailure)`, like delete).
- Build ONE `buildUsageIndex(runtime.backend, token, runtime.concepts, contentManifest, { strict: true })`
  in a try/catch. A strict failure returns `fail(503, { error: 'Could not verify where these assets are
  used. Try again.' })` and commits nothing (the fail-closed gate, the whole batch).
- `planBulkDelete(selected, index, manifest)` to partition. If `deletable` is empty, return the summary
  (nothing committed) so an all-skipped batch is a no-op success.
- `commitFiles` ONE call removing every deletable row (`serializeMediaManifest(removeMediaEntry`-folded
  over all deletable hashes)), message e.g. `Delete ${deletable.length} media assets`. Then delete each
  deletable hash's R2 object (derive `r2Key(hash, row.ext)` before the loop; commit-row-then-delete-R2;
  an absent object is a no-op). A per-object delete error is caught and reported in `failed`, never
  aborting the batch.
- Emit `media.bulk_deleted` ({ editor, deleted: count, skipped: count }). Return
  `MediaBulkDeleteResult` (deleted hashes, the skipped rows from the plan, any failed). A commit
  conflict surfaces the existing reload-and-retry via `commitFailure`.

**Tests (GithubDouble):**
- A selection of two no-reference assets commits one multi-file removal and deletes both R2 objects;
  the result lists both deleted.
- An in-use asset in the selection is skipped 'still-referenced' (with its usage) and NOT committed;
  the clean ones still delete.
- A strict usage failure returns `fail(503)` and commits nothing (assert no ref-PATCH landed).
- An uncommitted hash is skipped 'uncommitted'.
- One commit lands for the whole batch (count the ref-PATCH-to-main calls).

**Gate:** full gate green.

---

## Task 5 (review closely): the orphan scan and the purge

The on-demand orphan scan (read-only reconcile + usage) and the irreversible byte purge (re-derived
fresh, R2-only, typed-confirm).

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (`mediaOrphanScan`, `mediaPurgeOrphans`; register both;
  export `OrphanScan` consumption types as needed)
- Test: `src/tests/unit/content-routes-media-orphan.test.ts` (GithubDouble + a fake R2 list)

**Behavior.**
- `mediaOrphanScan` (an on-demand load or fetch action; it is heavier than the loaded index, an R2 list
  plus a reconcile pass, so it runs only when requested): `requireSession`, `mintToken`, resolve the R2
  binding (media-off / missing binding refuses), read the fresh media manifest, `runReconcile(store,
  manifest)`, build one strict `buildUsageIndex` for the broken-refs where-used (a strict failure is the
  detection-time fail-closed surface: return `fail(503, { error } satisfies MediaBulkFailure)`, no
  scan), then `buildOrphanScan(reconcile, manifest, index)`. Return the `OrphanScan` plus the broken-ref
  slugs.
- `mediaPurgeOrphans` (the irreversible action): `requireSession`, `mintToken`, resolve the R2 binding.
  Read the selected R2 keys from the form. Require the typed confirm (the shipped idiom: a value tied to
  the set; gate is the same never-bypassable check as delete). RE-DERIVE fresh: read the fresh media
  manifest, and for each selected key parse its hash via `MEDIA_KEY_RE` and keep it ONLY if that hash is
  still absent from the manifest (a key whose hash now has a row was claimed since the scan and is
  skipped, reported in `skippedClaimed`). `store.delete(key)` each still-orphaned key (no commit, there
  is no manifest row; a delete error is caught and reported in `failed`). Emit `media.orphans_purged`
  ({ editor, purged: count }). Return `MediaOrphanPurgeResult`.

**Tests (GithubDouble + fake R2 list):**
- The scan returns `orphanedBytes` for an R2 key with no manifest row and `brokenRefs` for a manifest
  row whose bytes are not in the R2 listing, with the broken-ref where-used.
- The scan fails closed (`fail(503)`) on a strict usage failure.
- The purge deletes only still-orphaned keys; a key whose hash now has a manifest row is skipped
  'claimed' and its R2 object survives.
- The purge refuses without the typed confirm (deletes nothing).

**Gate:** full gate green.

---

## Task 6: the composer wiring

Register the new actions on the `createCairnAdmin` actions record (the route seam Pass B documented in
the friction log), with routing tests.

**Files:**
- Modify: `src/lib/sveltekit/cairn-admin.ts` (register `mediaBulkDelete`, `mediaOrphanScan`,
  `mediaPurge` via `viewAction(['media'], ...)`)
- Test: `src/tests/unit/cairn-admin-actions.test.ts` (extend)

**Behavior.** Add to the `actions` record, mirroring `mediaDelete`/`mediaUpdate`:
`mediaBulkDelete: viewAction(['media'], (event) => content.mediaBulkDelete(contentEvent(event, {})))`,
`mediaOrphanScan: viewAction(['media'], (event) => content.mediaOrphanScan(contentEvent(event, {})))`,
`mediaPurge: viewAction(['media'], (event) => content.mediaPurgeOrphans(contentEvent(event, {})))`. The
component posts to these exact names (`?/mediaBulkDelete`, `?/mediaOrphanScan`, `?/mediaPurge`).

**Tests:** each new action 404s outside the media view; each reaches its content action on the media
view (e.g. `mediaBulkDelete` with no hashes returns an empty-summary success or the media-off/binding
refusal per the runtime; `mediaPurge` without the typed confirm refuses).

**Gate:** full gate green.

---

## Task 7 (review closely): the component, multi-select and the rename

The grid/table multi-select model, the sticky action bar, the selection Set, and the
"Unused" -> "No references found" rename.

**Files:**
- Modify: `src/lib/components/CairnMediaLibrary.svelte`
- Test: `src/tests/component/CairnMediaLibrary.test.ts` (extend)

**Behavior (follow `docs/internal/design/2026-06-18-media-pass-c-rev2-mockup.html`).**
- Extend the grid AND the table to `aria-multiselectable`: a `$state` Set of selected hashes; focus and
  selection decoupled (arrow/roving focus does not select); Space toggles the focused item; Shift+Arrow
  extends a contiguous range; Ctrl/Cmd+A selects all in view; Esc clears; a real native
  `<input type="checkbox">` per tile/row. Keep the existing single-activation slide-over (a plain
  click/Enter still opens the detail; selection is the checkbox/Space).
- A sticky (`position: sticky`) "N selected" action bar that appears on first selection, shows the live
  count via an `sr-only role="status"` region, names the scope ("the N in this view" vs "all matching
  the current filter"), and offers Clear (and the Delete bulk action wired in Task 8).
- Rename the triage facet and the tile chip from "Unused" to "No references found" / "No refs", and add
  the raw-HTML blind-spot caveat to the facet description/tooltip.

**Tests:**
- The grid exposes `aria-multiselectable`; Space toggles selection on the focused tile without opening
  the slide-over; the selection count updates the `role="status"` region.
- Ctrl/Cmd+A selects all in view; Esc clears; the sticky bar shows the count and a Clear.
- The triage facet renders "No references found" (never "Unused").

**Gate:** full gate green.

---

## Task 8 (review closely): the component, the bulk-delete dialog

The bulk-delete alertdialog: the skip-and-report dry-run, the reversible register, announced progress,
and the itemized summary.

**Files:**
- Modify: `src/lib/components/CairnMediaLibrary.svelte`
- Test: `src/tests/component/CairnMediaLibrary.test.ts` (extend)

**Behavior (follow the rev.2 mockup).**
- The action bar's Delete opens a native `<dialog>` `role="alertdialog"`. It posts `?/mediaBulkDelete`
  with the selected hashes and renders the returned `MediaBulkDeleteResult` as the flow: the dry-run
  body splits "Will be deleted" (slug + where-used) from a warning-register "Will be skipped, still in
  use" list pointing to the single-item typed path; the apply button names the outcome ("Delete 2, skip
  1"); the reversible register (danger-OUTLINE control, a plain confirm with no typed gate, the
  git-revert reassurance). Announced determinate progress; the itemized summary
  (succeeded / skipped-with-reason / failed-with-reason) in an `sr-only role="status"`/visible pair,
  with `role="alert"` reserved for a post-action failure. After the summary, invalidate the load so the
  list refreshes.
- The per-item re-check is shown at progress/summary time, never a review-time tick implying the gate
  passed.

**Tests:**
- The Delete bar action opens the dialog `role="alertdialog"`; it lists the will-delete and will-skip
  groups; the apply names the outcome; closing restores focus to the bar.
- The dialog uses a plain confirm (no typed-slug input) for the reversible delete.
- The itemized summary renders deleted / skipped-with-reason after the (stubbed) action result.

**Gate:** full gate green.

---

## Task 9 (review closely): the component, the orphan scan surface

The on-demand orphan scan: the entry point, the loading and detection-time fail-closed states, the two
sections, the irreversible purge typed-confirm, and the read-only broken-references readout.

**Files:**
- Modify: `src/lib/components/CairnMediaLibrary.svelte`
- Test: `src/tests/component/CairnMediaLibrary.test.ts` (extend)

**Behavior (follow the rev.2 mockup).**
- A quiet bordered "Find orphaned files" control beside Upload posts `?/mediaOrphanScan`. While in
  flight, a loading state; on a fail-closed result, the detection-time blocked surface (no dry-run, name
  the unreadable branch, no collect action even disabled, "Check again").
- On success, a modal/slide-over with two sections: "Orphaned files" (byte-rows: the R2 key, byte size,
  no display name, the checkerboard record-not-picture thumbnail; a section-level select-all with an
  indeterminate header checkbox; a selection Set of R2 keys) and a read-only "Broken references" section
  (the manifest slug + where-used + "re-upload or remove the reference", no checkbox, no action).
- The Purge: the irreversible register (solid `--color-error` fill, the verb "Purge", the "this cannot
  be undone, there is no git history for raw bytes" callout, the one typed confirm tied to the set). It
  posts `?/mediaPurge` and renders the returned `MediaOrphanPurgeResult` summary. The reversible delete
  and this purge are never reachable from one shared control.

**Tests:**
- "Find orphaned files" opens the scan; the fail-closed result shows no purge control and names the
  branch.
- The orphaned-files section renders byte-rows with the indeterminate select-all; the purge button is
  the solid-danger "Purge" gated by the typed confirm.
- The broken-references section is read-only (no checkbox, no purge/delete control).

**Gate:** full gate green.

---

## Task 10: the showcase E2E

Prove both round-trips in a real browser against the showcase.

**Files:**
- Modify: the showcase seed (`examples/showcase/src/lib/fake-github.ts` / `fake-r2.ts`) so the fixture
  has unreferenced assets (no manifest-ref) AND an orphaned R2 byte (an R2 object with no manifest row)
  AND a missing-bytes manifest row (a row whose R2 object is absent), without breaking the existing
  media specs' name-based assertions.
- Create: `examples/showcase/e2e/media-pass-c.spec.ts`

**Behavior.**
- Bulk-delete round-trip: open the Library, multi-select two assets (one no-reference, one in-use), bulk
  delete, see the skip-and-report (the in-use is skipped), apply, and assert the no-reference asset's
  row is gone from `media.json` and the in-use one remains.
- Orphan round-trip: "Find orphaned files", see the orphaned byte and the broken-reference readout,
  Purge the orphaned byte with the typed confirm, and assert the R2 object is gone while the
  broken-reference row is untouched (read-only).

**Tests:** the two specs pass in the real browser; the existing media E2E specs stay green. Rebuild
`dist` (`npm run package`) before the showcase E2E (the showcase serves `dist`).

**Gate:** full gate green, showcase E2E green.

---

## Task 11: docs, the version bump, and the pass-end ritual

**Files:**
- Modify: `docs/guides/manage-the-media-library.md` (the bulk-delete and orphan-collection flows),
  `docs/reference/sveltekit.md` (the new actions and `MediaBulkFailure`), `docs/explanation/media-storage.md`
  (the three populations, the reconcile directions, why the byte purge is the one irreversible media
  action), `docs/reference/log-events.md` (`media.bulk_deleted`, `media.orphans_purged`), `CHANGELOG.md`
  and `docs/guides/upgrade-cairn.md` (a `0.59.0` entry with the `<!-- release-size: minor -->` marker,
  no consumer action), `package.json` (version `0.59.0`).

Then the pass-end ritual: simplify (code-simplifier over the changed code), the review gate (suggest the
adversarial review-gate Workflow on Geoff's opt-in; otherwise a parallel fan-out of `svelte-reviewer`,
`daisyui-a11y-reviewer`, a focused correctness reviewer on the bulk/purge/fail-closed logic, the
`cloudflare-workers` reviewer for the R2 list/delete touch, and `web-auth-security` if any guard code
changes), the docs gates (`check:reference`, `check:package`, `check:docs`), and the tracking (the
post-mortem in this plan, STATUS on `main`, the gallery memory).

A live admin smoke is owed this pass (the first media action that deletes R2 bytes in bulk and the first
that purges bytes outside the per-entry path). It rides the first site cutover (no real Worker/GitHub in
the showcase), matching the Pass B/3c precedent; record that disposition, and run the read-only reconcile
against a real bucket at cutover to size the orphan state.

**Gate:** full gate green; the three doc gates green; the live-smoke disposition recorded.

---

## Self-review (plan vs spec)

- Spec coverage: bulk delete (Tasks 1, 3, 4, 7, 8), orphan collection (Tasks 2, 3, 5, 9), the
  composer wiring (Task 6), the three populations (Tasks 2, 5, 9: orphaned bytes purge, unreferenced
  bulk delete, broken-refs readout), the safety floor / shared strict index (Tasks 1, 4), the
  reversible/irreversible split (Tasks 8, 9), the rename (Task 7), testing (every task plus Task 10),
  docs and version (Task 11). Covered.
- Type consistency: `planBulkDelete`/`BulkDeleteSkip` (Task 1) are consumed by `mediaBulkDelete` (Task
  4) and the dialog (Task 8) and the `MediaBulkDeleteResult` type (Task 3); `buildOrphanScan`/`OrphanScan`
  (Task 2) by `mediaOrphanScan` (Task 5) and the scan surface (Task 9); `MediaBulkFailure` (Task 3) by
  Tasks 4, 5; the flash union (Task 3) is read in `mediaLibraryLoad` and rendered in Tasks 7-9; the
  action names (`mediaBulkDelete`/`mediaOrphanScan`/`mediaPurge`) match between the composer (Task 6)
  and the component posts (Tasks 8, 9).
- Scope: a single coherent destructive-cluster plan; no decomposition needed. needs-alt and dedupe are
  Pass D.

## Carry-forwards (beyond Pass C)

- Pass D: needs-alt at scale (the filtered bulk-alt grid), dedupe/merge (the merge mechanism on
  `planMediaRewrite` plus exact-dup collapse), AI auto-alt (draft-only), a deep-link from the
  broken-references readout to the offending entries.
- The workerd subrequest budget for the batch strict index plus per-item membership at ~25+ open
  branches: verify empirically during the build; chunk if needed.
- The `runtime.publicMediaResolver` ergonomic (carried from Pass A, needs its own brainstorm).

## Post-mortem (2026-06-19)

LANDED on `feat/media-pass-c` off `main` (worktree `.claude/worktrees/media-pass-c`), 11 plan tasks
plus one safety hardening (Task 10a), each test-first, the code-simplifier pass, a four-reviewer gate,
and the docs arm. Ships as `0.59.0` (minor, additive, no consumer action). Merge, release, and push are
HELD for Geoff's call.

**Built.** The pure cores (`bulk-delete-plan.ts` partition, `orphan-scan.ts` projection); the flash
flags, `MediaBulkFailure`, and the `MediaBulkDeleteResult`/`MediaOrphanPurgeResult` summary types; the
three destructive actions on `createContentRoutes` (`mediaBulkDelete`, `mediaOrphanScan`,
`mediaPurgeOrphans`) with their composer registrations (`mediaBulkDelete`/`mediaOrphanScan`/`mediaPurge`);
the component (multi-select grid+table, the sticky action bar, the bulk-delete alertdialog, the on-demand
orphan scan surface with the irreversible purge) and the "Unused" -> "No references found" rename; the
showcase E2E (two round-trips); and the docs.

**Verified first-hand from the worktree tip.** `npm run check` 1011 files 0/0; `npm test` 198 files /
2208 tests exit 0; the showcase Playwright E2E 27 passed (the two new round-trips plus 25 existing);
`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`, `check:readiness`,
`check:version` (minor) all exit 0; `prose-guard` clean (blocking tier) on every changed doc.

**Decisions locked.** (1) The purge typed-confirm is the COUNT of selected files ("Type N to purge"),
per the approved rev.2 mockup, superseding the spec's earlier "not a reflexive count" wording. (2) The
orphaned-bytes definition was SHARPENED to "no manifest row AND referenced nowhere across main and every
open branch" (Task 10a): `buildOrphanScan` intersects reconcile's verdict with the strict usage index,
and the purge re-checks that index at action time, so a branch-only upload's live bytes can never be
purged. (3) The list-density table uses the native selectable-checkbox-table pattern, NOT `role="grid"`
(the a11y reviewers showed the grid role obliged a keyboard model the table did not implement).

**Review gate caught real issues.** The adversarial correctness reviewer found a CRITICAL: the purge
re-derived freshness against the manifest only, leaving a scan-to-purge TOCTOU window where a new branch
reference (with client-posted keys) could irreversibly purge a live draft's bytes; fixed by building one
fail-closed strict usage index at purge action time, symmetric with the scan and bulk delete. The E2E
caught a real Task 9 bug: the orphan scan posted a body-less form action (SvelteKit 415s before the
action runs; the component-test fetch stub could not catch it); fixed with an empty `FormData` body plus
a regression test. The a11y reviewers fixed the table grid-role over-reach, missing `aria-modal` on three
dialogs, and a fake orphan listbox; svelte review added in-flight dialog-close guards.

**Carried into the cutover and beyond.**
- LIVE ADMIN SMOKE is owed (the first bulk R2 delete and the first byte purge). It rides the first site
  cutover, matching the Pass B/3c precedent: the showcase runs `vite preview` with fakes, so a real
  commit and a real R2 purge need a real site repo. At cutover, run the READ-ONLY `Find orphaned files`
  scan against the real bucket first (after a `cairn-manifest` regenerate) to size the orphan state
  before any purge; the scan is read-only and the purge is human-gated, so there is a checkpoint before
  any irreversible delete.
- The narrow scan-to-purge race for a NEWLY referenced byte is closed at the purge gate now; the only
  residual window is identical to the documented delete-races-an-edit window every safe delete carries.
- The workerd subrequest budget for the per-batch strict index at ~25+ open branches stays inferred;
  size it at cutover. The purge now also builds one strict index, still one per batch, not per key.
- Pass D: needs-alt at scale, dedupe/merge, AI auto-alt, a deep-link from the broken-references readout.
- The `runtime.publicMediaResolver` ergonomic still needs its own brainstorm.
