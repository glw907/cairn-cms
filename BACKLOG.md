# BACKLOG

> Project issue tracker. Managed by `/log-issue`.

## Medium

- [ ] **#1** Correct the key-rotation roll-back bullet `f:sszb7b` on `main` `#bug` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The bullet says re-pushing the old key restores signing with it immediately. `src/lib/github/signing.ts#createInstallationTokenCache` caches the installation token per isolate for 55 minutes, so the restore holds only for tokens minted from then on. The drafter format test (glw907/drafter#49) corrected it on a throwaway branch: patch at `~/.claude/jobs/drafter-skill-rules/ft/base-prime.format-patch`. Even corrected, the consistency read still paired it against `f:vg42j3`, so reread the wording against the cache. The roll-back section's `opens` line repeats "immediately" and needs the same fix.

## Low

- [ ] **#3** Read the unreachable fact pair `f:72yc97` and `f:olofdb` `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The drafter format test (glw907/drafter#49) could not reach this pair and never read it. A run's "Unplaced:" warning reasoned about it.
- [ ] **#2** Confirm three fact pairs are scope differences, not conflicts `#improvement` `#cairn-cms` `#initiative:docs-system` *(2026-10-18)*
  The drafter format test (glw907/drafter#49) found no defect in `f:ejuoh6` against `f:vg42j3` (the live check skips the publishing path's cache), `f:86h9o6` against `f:vg42j3` (deploy time against cache lifetime), or `f:ejuoh6` against `f:1pb077` (the 60-second per-isolate verdict is a separate cache from the 55-minute token cache). A sentence in each scoping its cache would stop the read pairing them.
