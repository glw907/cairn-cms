# Media Pass C: bulk delete and orphan collection

Status: design approved 2026-06-18 (Geoff signed off on the rev.2 mockup). The next step is the
implementation plan.

## Summary

Pass C gives the admin Media Library the destructive-at-scale jobs 3c deferred: **multi-select bulk
delete** and **orphan collection**. Both extend cairn's shipped safety primitives (the strict
cross-branch usage gate, the fail-closed safe-delete, the read-only `reconcileMedia`) to many items and
to destruction, rather than inventing new safety machinery. The competitor study
(`docs/internal/design/2026-06-18-media-pass-c-research-reference.md`) found that no peer ships a safe,
reference-aware, fail-closed bulk or orphan tool: the category's defining failure is deleting media
that is actually in use. cairn already avoids that class of bug because usage is an exact cross-branch
grep and every delete is a revertible git commit. Pass C makes that advantage usable at scale.

Scope is the **destructive cluster** only. needs-alt at scale and dedupe/merge are deferred to Pass D.

## Decisions (settled with Geoff)

1. **Scope = the destructive cluster.** Multi-select bulk delete plus orphan collection. needs-alt at
   scale and dedupe/merge are Pass D.
2. **Three distinct populations, each bound to its real server source.** The mockups' and the first
   research draft's two-direction framing was a taxonomy error. The real populations are:
   - **Unreferenced assets** = the usage overlay at zero (`usageCount === 0`), the renamed
     "No references found" triage facet. Committed manifest rows the cross-branch usage index finds in
     no entry. REVERSIBLE (a git delete). Handled by bulk delete in the Library.
   - **Orphaned bytes** = `reconcile.orphanedObjects` (an R2 object with no manifest row). Not assets,
     no tile. IRREVERSIBLE byte purge (no git row, no history for raw bytes). Handled by a separate
     on-demand scan surface.
   - **Broken references** = `reconcile.missingObjects` (a manifest row whose bytes are gone). A
     read-only DATA-INTEGRITY readout, not a deletion target.
3. **Bulk delete is the single safe-delete gate applied per item, skip-and-report.** An item that
   passes the strict no-reference gate is deleted; an in-use item is skipped and reported, never
   bulk-force-deleted. Forced deletion of an in-use asset stays the deliberate single-item typed-slug
   path. No `--force`, no confirmation-free bulk path.
4. **The safety floor: one shared strict cross-branch index per batch, not N independent reads.** The
   displayed selection rides the non-strict load index and is selection-only. At execution the action
   builds one fresh strict `buildUsageIndex`, fails closed if it cannot complete, and gates each item
   on membership in that fresh index. This is both the correctness gate and the workerd-budget fix (N
   per-item strict reads would blow the 6-connection throttle at 25+ open branches).
5. **The reversible and irreversible actions are structurally separate.** The reversible bulk delete
   (asset rows: git, plain confirm naming the count, danger-outline control, the git-revert
   reassurance) and the irreversible byte purge (orphan scan: solid danger fill, the verb "Purge", a
   typed confirm, the "no git history for raw bytes" callout) are never reachable from one shared
   button or one modal.
6. **Commit granularity = one commit per batch** for the manifest-row removals, with the R2 deletes
   following per the shipped commit-row-then-delete-R2 ordering. The byte purge has no manifest row, so
   it is a direct R2 delete excluded from any commit and ordered after.
7. **The typed confirm is reserved for the one irreversible action (the purge)** and follows the
   shipped safe-delete idiom (type a value tied to the actual set), not a reflexive count or phrase.
8. **Broken references are a read-only readout in Pass C.** The where-used count plus "re-upload or
   remove the reference" advice is enough to act; a deep-link to the offending entries is a Pass D
   follow-on.
9. **Rename the shipped "Unused" facet to "No references found"** with the raw-HTML blind-spot caveat at
   the point of action, aligning the UI with `usage.ts`'s own doctrine.

## The UI (rev.2, approved)

The approved target is `docs/internal/design/2026-06-18-media-pass-c-rev2-mockup.html` (the three
source directions and the two adversarial critiques produced it). It extends the shipped Library in
place; no new route or tab (which would reopen the single-mount seam).

**The Library, made multi-selectable.** The grid and the list-density table gain `aria-multiselectable`
per the WAI-ARIA APG: focus and selection decoupled (arrows move focus without selecting), Space
toggles, Shift+Arrow extends a range, Ctrl/Cmd+A selects all, Esc clears, roving tabindex, a real
native checkbox per tile and row. Selection is a Set of content hashes. A sticky "N selected" action
bar (`position: sticky`) appears on first selection, shows the live count, names the scope ("the N in
this view" versus "all matching the current filter"), and offers Clear and the bulk actions. The
triage radiogroup stays asset-filters-only: All / Needs alt / No references found.

**Bulk delete.** A `role="alertdialog"` whose body is the dry-run: a "Will be deleted" list (slug plus
where-used) and a separate warning-register "Will be skipped, still in use" list pointing to the
single-item typed-slug path. The action button names the real outcome ("Delete 2, skip 1"). The
reversible register: a danger-outline control, a plain confirm (no typed gate), and the git-revert
reassurance. The per-item strict re-check is shown at progress and summary time, never as a review-time
tick implying the gate already passed. Announced determinate progress; a 207-style itemized summary
(succeeded / skipped because a reference turned up on the recheck, with where-used / failed-with-reason).

**Orphan collection (on demand).** A quiet "Find orphaned files" control beside Upload runs the R2-list
plus reconcile scan, with its own loading state and a detection-time fail-closed surface (no dry-run,
name the unreadable branch, no collect action even disabled). The result is a modal/slide-over with two
sections: **Orphaned files** (byte-rows: the R2 key, byte size, no display name, a checkerboard
record-not-picture thumbnail; section-level select-all with an indeterminate header; the irreversible
Purge), and a read-only **Broken references** section (manifest rows whose bytes are gone, the
data-integrity readout). The purge is the irreversible register: solid danger fill, the verb "Purge",
the "this cannot be undone, there is no git history for raw bytes" callout, and the cluster's one typed
confirm.

**Accessibility contract** (load-bearing): the multi-select model above; separate non-overlapping live
regions for selection-count, progress, and summary; `role="status"` on open, `role="alert"` reserved
for a post-action failure; native dialogs; only shipped Warm Stone tokens; the irreversible purge uses
the solid `--color-error` fill, never warning-ink as a fill.

## Architecture

Nothing here changes a public render or delivery signature; the new surface is admin-side. The pass is
the existing safety primitives extended to multi-item and to destruction.

### The bulk-delete plan (pure, server)

A pure partition over a strict usage index: given the parsed strict `buildUsageIndex`, the selected
hashes, and the parsed media manifest, return three buckets: **deletable** (no usage row, and a
committed manifest row exists), **skipped-still-referenced** (a usage row exists; carry the where-used),
and **skipped-uncommitted** (no manifest row, so nothing to delete here). This is unit-tested in
isolation and is the heart of the safety floor: the gate is membership in the fresh strict index, not
the display count.

### The bulk-delete action (admin)

`mediaBulkDelete` on `createContentRoutes`, mirroring `mediaDeleteAction`: mint a token, read the fresh
media and content manifests, build one `buildUsageIndex(..., { strict: true })` (a strict failure
returns `fail(503)` and commits nothing, the fail-closed gate), partition with the pure planner,
`commitFiles` the deletable rows' removal in ONE call, then delete their R2 objects
(commit-row-then-delete-R2). Emit `media.bulk_deleted`. Redirect with a flash and an itemized summary
of deleted / skipped (with reasons) / failed. The R2 binding is resolved before any write; a missing
binding refuses before the commit, as in single delete.

### The orphan scan and the purge (admin)

The scan reuses `runReconcile(bucket, manifest)` (already `orphanedObjects` plus `missingObjects`),
exposed through an on-demand load or fetch action so it runs only when requested (it is an R2 list plus
a reconcile pass, heavier than the loaded index). A read failure surfaces the detection-time fail-closed
state. The result carries the orphaned byte-rows (R2 key, size) and the broken-reference rows (the
manifest row plus where-used for the readout).

`mediaPurgeOrphans` is the irreversible action: it re-reads the fresh media manifest and re-derives the
orphan set (each selected R2 key whose 16-hex hash is still absent from the manifest), so a key claimed
since the scan is skipped, then deletes those R2 objects directly. No commit (there is no manifest row).
A typed confirm gates it. Emit `media.orphans_purged`. The broken-references readout has no action.

### The component

`CairnMediaLibrary.svelte` gains the multi-select model (the grid and table become
`aria-multiselectable`, a selection Set of hashes, the sticky action bar), the bulk-delete alertdialog
(the skip-and-report dry-run, progress, the itemized summary), the on-demand orphan scan surface (the
entry point, the loading and fail-closed states, the two sections, the purge typed-confirm with its own
selection Set of R2 keys, the read-only broken-references readout), and the "No references found"
rename. The composer (`cairn-admin.ts`) registers the new actions on the media view via
`viewAction(['media'], ...)` (the registration seam Pass B documented), with routing tests.

### Data flow

```
Bulk delete:  select hashes (display index, selection-only)
              apply: build ONE strict buildUsageIndex (fail closed) -> partition
                     -> commitFiles([removed rows...]) -> delete R2 objects -> ?bulkDeleted=N
Orphan scan:  on-demand -> runReconcile(bucket, manifest) -> { orphanedObjects, missingObjects }
              (detection fail-closed if the read cannot complete)
Purge:        select R2 keys -> re-derive fresh (hash still absent from manifest) -> R2 delete -> ?purged=N
Broken refs:  missingObjects -> read-only readout (no action)
```

## Safety and correctness

- **Fail closed.** The bulk gate builds one strict index; a strict failure refuses the whole batch
  (commits nothing). The orphan scan fails closed at detection.
- **The display index is selection-only.** Every destructive item is gated on the fresh strict index
  (bulk delete) or the fresh manifest re-derive (purge), never the loaded display count.
- **One shared strict read per batch**, not N, so the workerd connection budget holds; an empirical
  check at ~25 open branches rides the build (a carry-forward risk).
- **Skip-and-report.** Bulk delete never force-deletes an in-use asset; in-use items are skipped with
  their where-used. Forced in-use deletion stays the single-item typed-slug path.
- **Atomic and ordered.** One commit per batch for the manifest removals, then the R2 deletes
  (commit-row-then-delete-R2), so a mid-sweep failure leaves recoverable git state. The purge is a
  direct R2 delete with no commit, ordered last, with irreversible framing.
- **Reversibility.** Every git-tracked removal is one revertible commit (git-as-trash); the byte purge
  is the one exception and is framed as irreversible with a typed confirm.
- **Honest verdicts.** The renamed "No references found" facet and every destructive confirm carry the
  raw-HTML blind-spot caveat at the point of action.

## Testing

- **Unit:** the bulk-delete partition over fixtures (deletable / skipped-still-referenced /
  skipped-uncommitted); the purge re-derive (a claimed key is skipped); the orphan-scan projection.
- **Integration (GithubDouble):** `mediaBulkDelete` commits one multi-file removal and deletes the R2
  objects, skips in-use items, fails closed on a strict usage failure (commits nothing), and reports
  the itemized summary; `mediaPurgeOrphans` deletes only still-orphaned keys and refuses without the
  typed confirm; the composer routing (404 outside the media view, reaches each action).
- **Component (real browser):** the multi-select model (focus/selection decoupled, the keyboard set,
  the sticky bar, the scope), the bulk-delete dry-run (skip-and-report, progress, summary), the orphan
  scan surface (loading, fail-closed, the two sections, the purge typed-confirm, the read-only broken
  readout), the "No references found" rename.
- **Showcase E2E:** a bulk-delete round-trip (select no-reference assets, delete, the committed rows
  are gone and an in-use one is skipped) and an orphan round-trip (scan, purge an orphaned byte, the
  R2 object is gone; a broken-reference row shows read-only).

## Scope and carry-forwards

In scope: multi-select, usage-gated bulk delete (skip-and-report), orphan-byte collection (the
irreversible purge), the broken-references readout, the "No references found" rename, the shared-strict-
index safety floor.

Deferred (Pass D or later): needs-alt at scale (the filtered bulk-alt grid), dedupe/merge (the merge
mechanism on `planMediaRewrite` plus exact-dup collapse), AI auto-alt, a deep-link from the broken-
references readout to the offending entries, the optional built-HTML delivery-URL scan as a higher-
assurance gate.

Open risks carried into the build:
- The workerd subrequest budget for one batch strict index plus the per-item membership checks is
  inferred; an empirical check at ~25 open branches before locking the concurrency strategy.
- Whether the two production sites currently hold orphaned bytes or unreferenced assets, and at what
  scale, is unmeasured; running the read-only reconcile against the real buckets after a manifest
  regenerate would size the need (rides the per-site cutover).
- The orphaned-byte "last changed" provenance comes from R2 object metadata and can mislead for a
  content-hashed key written once; the row degrades gracefully (drop the line) if unavailable.

## Documentation impact

- `docs/guides/manage-the-media-library.md`: the bulk-delete and the orphan-collection flows.
- `docs/reference/sveltekit.md`: the new actions on `createContentRoutes` and their fail payloads.
- `docs/explanation/media-storage.md`: the three populations, the reconcile directions, and why the
  byte purge is the one irreversible media action.
- `docs/reference/log-events.md`: `media.bulk_deleted`, `media.orphans_purged`.
- `CHANGELOG.md` and `docs/guides/upgrade-cairn.md`: a `0.59.0` entry with the `release-size: minor`
  marker. Additive admin surface, no consumer action.
