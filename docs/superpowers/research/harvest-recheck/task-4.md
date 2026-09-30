# Harvest recheck: task 4 (audit the front door)

One line per item, per rule 4 of `docs/superpowers/research/2026-09-29-harvest-theme-lineage-brief.md`. Resolution column is filled by task 6b.

- `f:9xthnq` (retraced bullet, `front-door.md`): its claim names `CairnAdminShell`, whose source moves from `src/lib/components/` to `src/lib/admin/`, and its Source cites showcase lines that may shift when the lineage edits the showcase's `@glw907/cairn-cms/components` imports; re-check `examples/showcase/src/routes/admin/+layout.svelte:3-5` and `examples/showcase/src/routes/admin/signups/+page.svelte:1-4` against the merged tree. Resolution: repointed: the claim's `CairnAdminShell` now lives in `src/lib/admin/`, but the Source cites showcase and guard lines only; `examples/showcase/src/routes/admin/+layout.svelte:3-5`, `.../signups/+page.svelte:1-4`, and `guard.ts:24` re-read against the merged tree and each still holds after the showcase's `./admin` import change. No edit.
