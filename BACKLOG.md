# BACKLOG

> Project issue tracker. Managed by `/log-issue`.

## Medium

- [ ] **#9** Merge `x-fingerprint` and `x-wrong-key` into one failure row with a route to push `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  They are one failure written as two rows. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#10** Give `s-third-generate` a failure row for the key limit `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  The step can meet the key limit and has no failure row for it. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#11** Add the 55-minute token bound to the rollback route `rb-fact` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  The rollback route leaves out the installation-token cache bound. Related to #1. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#12** Point `s-rec-checks` at a step a reader with no key can take `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  It points at the rows of its own section and requires a state a reader with no key lacks. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#13** Give the key-rotation failures `x-third-verify`, `x-check-threw`, and `x-logs-empty` a handler the reader can act on `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  Each names a fact or a verbatim lead-in as its handler, which leaves the reader no next action. The fix points them at a step, a logs step, and a link to the setup section. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#4** Fix the stale line range on fact `f:6hmgmv` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  `docs/internal/facts/extend.md:780` cites `templates/waymark/.../+page.svelte:1-15`, but the file has 13 lines. Neither `check:facts` nor `drafter check` catches it, since both skip route paths. Found by drafter F1's cairn comparison (glw907/drafter#50); land it with F2's cairn change.
- [ ] **#1** Correct the key-rotation roll-back bullet `f:sszb7b` on `main` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The bullet says re-pushing the old key restores signing with it immediately. `src/lib/github/signing.ts#createInstallationTokenCache` caches the installation token per isolate for 55 minutes, so the restore holds only for tokens minted from then on. The drafter format test (glw907/drafter#49) corrected it on a throwaway branch: patch at `~/.claude/jobs/drafter-skill-rules/ft/base-prime.format-patch`. Even corrected, the consistency read still paired it against `f:vg42j3`, so reread the wording against the cache. The roll-back section's `opens` line repeats "immediately" and needs the same fix.

## Low

- [ ] **#5** Decide where the rotate page reads the logs `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  The outline's `covers` line puts the logs under verifying signing, while the blueprint reads them under recovery. A call for whoever owns the outline entry. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#6** Add the rotate blueprint's missing recovery rows and notes `#feature` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  Recovery rows for `health.failed` and a health-scoped `github.unreachable` event, a Windows note for `curl`, and a route for a reader with no PEM file. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#7** Stop the `use` fields of five rotate-blueprint items restating their facts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  `ver-live-result`, `rec-editor-timing`, `del-no-restore`, `third-fact`, and `rec-logs-observability`. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#8** Keep `x-editor` free-standing after a `from` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-19)*
  A `from` on it made the whole read object. Patch: `docs-system/research/2026-10-19-edit-quality-base-fixes.patch` in glw907/initiatives, made on a throwaway branch by the drafter edit-quality test (glw907/drafter#51).
- [ ] **#3** Read the unreachable fact pair `f:72yc97` and `f:olofdb` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The drafter format test (glw907/drafter#49) could not reach this pair and never read it. A run's "Unplaced:" warning reasoned about it.
- [ ] **#2** Confirm three fact pairs are scope differences, not conflicts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The drafter format test (glw907/drafter#49) found no defect in `f:ejuoh6` against `f:vg42j3` (the live check skips the publishing path's cache), `f:86h9o6` against `f:vg42j3` (deploy time against cache lifetime), or `f:ejuoh6` against `f:1pb077` (the 60-second per-isolate verdict is a separate cache from the 55-minute token cache). A sentence in each scoping its cache would stop the read pairing them.
