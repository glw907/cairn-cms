# Foundations B: Narrowing and Closure (remediation initiative, slice 2b)

> **For agentic workers:** three tasks, SERIAL. Dispatch the `cairn-implementer` /
> `diff-reviewer` chain per task with the Agent tool; the full gate inside the chain. Task 1
> is the pass's `model: opus` candidate (a public-signature change the initiative builds on).

**Token ceiling (WHOLE pass, chains plus ritual): 1.8M.** **Checkpoint interval:** every
task. **Worktree:** `foundations-b` off `main` at `15f98335`, the foundations-a merge, which
has landed; that commit's `docs/internal/api-surface.md` is this pass's derivation input.
**The task bodies below were FINALIZED against that merged tree on 2026-08-29; the
finalization section at the end of this file carries every correction, its evidence, and the
mismatches the conductor ruled on. The adversarial `engine-triage` review over this finalized
plan has RUN; its seven verdicts are folded into the task bodies and the finalization section
below (this commit). No further pre-flight is owed before dispatch.**
**Shared files:** `docs/internal/engine-rulings.md` (Tasks 1, 2), `CHANGELOG.md` (every
task), `docs/reference/sveltekit.md` (Tasks 1, 3).
**Inherited from foundations A, folded into the tasks that own them:**
`docs/internal/record/2026-08-29-foundations-a-move-set.md`, its "Inheritance notes for
foundations B" subsection (four items; note 1 routed to the internals pass rather than
executed in Task 1 per the engine-triage review, notes 2 and 3 in Task 2, note 4 out of scope
under Pass-end notes).
**Initiative frame:** `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`
(slice 2b; its standing-constraints block applies).
**Evidence base, read from source, never memory:** `coherence-v2.md` (C3 at `:189-231`, the
prescription quoted at `:230-231`; C10 at `:492-`, its route-factories tally at `:496`),
`rank-route-factories.md` (ranks 1-30 at `:58-275`, all thirty verdicts retire; rank 74 at
`:635-644`), `verify-route-factories.md` IN FULL (it overturns verdicts in both directions:
rank 47 `InboundLink` retire-to-keep, rank 62 `PublishActionLink` keep-to-retire, rank 38
`UploadResult` reshape-to-retire, ranks 66/69/72/78 reshape-to-keep, rank 99 `SlotDef`
reshape-to-keep, rank 101 `EmailAttachment` reshape-to-keep, ranks 82/83/84 reshape-to-retire;
a re-derivation that skips it re-proposes settled flips), the ledger (the 14 shapes foundations
A repaired now carry their own `- **Shape:**` line, not a truncated `(shape: …)` parenthetical),
`docs/internal/api-surface.md`.

**Goal:** the deliberate `ContentRoutes` narrowing (C3's sanctioned exception, done the way
C3 actually prescribes), then the single R4 closure re-derivation over the settled surface,
emitting the retires pass's input with its ratification gate.

---

## Task 1: Narrow the factory's PUBLIC return; the composer keeps the wide INTERNAL one

**Files:** `src/lib/sveltekit/content-routes.ts` (the factory at `:103-147`, the
`ContentRoutes` alias at `:150`), `src/lib/sveltekit/cairn-admin.ts` (the composer, which
reaches the routes through its local `content` binding at `:101` and `:142-340`), the five
janitorial-action test files (all under `src/tests/unit/`:
`content-routes-media-bulk.test.ts`, `content-routes-media-replace.test.ts`,
`content-routes-media-orphan.test.ts`, `content-routes-media-alt.test.ts`,
`cairn-admin-actions.test.ts`) plus any of the 38 `createContentRoutes`-referencing test
files the repoint touches, a new compile-only hand-mount fixture,
`docs/reference/sveltekit.md` (the `createContentRoutes` return block at `:884-919`
regenerates), `docs/internal/api-surface.md`, `docs/internal/engine-rulings.md`
(`audit-sveltekit-contentroutes` at `:1639`, whose `- **Shape:**` line foundations A
repaired), `CHANGELOG.md`.

**The structural decision, ruled after two reviews (the cosmetic alternative fails
silently):** `check:surface` renders the full declared return of every public callable, so a
public factory with a wide return keeps every janitorial type publicly named and the closure
retires NOTHING. Therefore: an UNEXPORTED `createContentRoutesInternal` returns the wide
object (the composer `cairn-admin.ts` drives ALL 35 members and repoints to it); the public
`createContentRoutes` is a thin wrapper whose DECLARED return is the narrow `ContentRoutes`
interface, exactly as C3 prescribes ("declare the narrow type deliberately and have the
factory's signature return it, rather than hand-mirroring a wide one",
`coherence-v2.md:230-231`). The pinned key-order comment (`content-routes.ts:97-102`) stays
true of the public shape. Count honesty, re-measured on the merged tree: the return has 35
members (`content-routes.ts:111-145`) and the composer drives every one of them (35 distinct
`content.<member>` references in `cairn-admin.ts`, zero undriven). The audit documents the
count only as "30-key" (`rank-route-factories.md:640`, `verify-route-factories.md:119`); 35 is
what the code has, and no source anywhere states 36.

**The narrowing is a NECESSARY step toward the media-janitorial retires, not the sufficient
one.** The ledger's `- **Shape:**` line for `audit-sveltekit-contentroutes`
(`engine-rulings.md:1639`, "that reshape is the single change that lets the media-janitorial
types retire") is falsified as a sufficiency claim on the merged tree: `createCairnAdmin`'s
rendered return (`api-surface.md:498`, `:519`) still names every ranks 1-13/17-22/38
janitorial type after this task's public/internal split, since the composer keeps driving the
wide internal shape (see the acceptance bullet below). Task 2's list (c) is where that
consequence gets recorded, not this task.

- [ ] Membership rule, positive and enumerable (the "driven set" cannot discriminate; the
      composer drives all 35): a member is OUT iff it is reachable only from the engine's
      own Media Library screen AND its result/failure types sit in the ranks 1-30 retire
      closure. The OUT set, enumerated by name so the diff review can check it against the
      rule: the janitorial trio (`mediaBulkDeleteAction`/`mediaOrphanScanAction`/
      `mediaOrphanPurgeAction`, whose results are `MediaBulkDeleteResult`/
      `MediaOrphanScanResult`/`MediaOrphanPurgeResult`, ranks 13/7/8) and the four
      media-mutation actions (`mediaReplaceAction`/`mediaAltPropagateAction`/
      `mediaDeleteAction`/`mediaUpdateAction`, whose failure types are ranks 14-30 retires:
      `MediaAltPropagateFailure` 17, `MediaBulkFailure` 18, `MediaUpdateFailure` 19,
      `MediaReplaceFailure` 20, `MediaDeleteRefusal` 21, every one of them a retire the
      verifier let stand), PLUS `mediaAltPreviewAction` (`MediaAltPreviewPlan`, rank 10),
      `mediaReplacePreviewAction` (`MediaReplacePreviewPlan`, rank 12), and
      `mediaLibraryUploadAction` (`MediaUploadFailure` rank 22 / `UploadResult` rank 38,
      reshape-to-retire per `verify-route-factories.md:126`), which satisfy the rule's literal
      reading. That is ten OUT members total. Everything the hand-mount path legitimately
      wires is IN, and `ContentFormFailure` stays in the public unions it already inhabits.
      `ContentFormFailure` is an OPEN RESHAPE, not a keep (`audit-sveltekit-contentformfailure`
      at ledger `:1329`, rank 31, "reshape stands" at `verify-route-factories.md:48-51`); its
      reshape belongs to the conventions pass, and this task neither executes nor closes it.
      Note the alignment, which is a reason to keep the name public here and not a licence to
      reshape it: that ledger entry's repaired `Shape:` already prescribes keeping the eleven
      arms module-internal, which is what this task's internalization begins. State the
      capability removal plainly: after the narrowing, a site hand-mounting the public
      `CairnMediaLibrary` component (`docs/reference/components.md:199`, actions documented at
      `docs/reference/admin-routes.md:145-163`, per-route mounting at `:272-280`) has no
      public seam to wire its media actions and now requires `createCairnAdmin`. The task
      report enumerates every excluded member with its rank citation; the diff review checks
      the enumeration against the rule.
- [ ] The executable proof, both directions: a compile-only hand-mount fixture (in the
      pattern of `src/tests/unit/env-genericity.test.ts`, including the no-suite Vitest
      workaround block its own header comment explains at `:26-30`) wires every narrow-set
      member the way the reference teaches, loads and actions alike (actions assignability
      into kit's `Actions` slot is checkable); dropping an IN member reds it. It imports
      internal paths, so it proves the SOURCE type; `check:surface`'s diff proves the
      PUBLISHED narrowing and carries the too-wide direction (the excluded members must be
      absent from the rendered signature, which today expands in full under `## /sveltekit`
      in `docs/internal/api-surface.md`).
- [ ] `check:reference:signatures` in the acceptance by name (the reference return block
      must regenerate or CI reds).
- [ ] CHANGELOG `Consumers must:` line stating the capability removal plainly, not a
      type-rename note: a site hand-mounting the public `CairnMediaLibrary` component
      (`docs/reference/components.md:199`, actions documented at
      `docs/reference/admin-routes.md:145-163`, per-route mounting at `:272-280`) loses its
      public seam for wiring media actions and now needs `createCairnAdmin`; appended under
      the existing `## Unreleased` section (`release-size: minor` today).
- [ ] Acceptance: full gate green including the fixture; the api-surface diff shows the
      narrow public return; this task closes `audit-sveltekit-contentroutes`
      (`engine-rulings.md:1639`) ONLY, and consumes NO retire, because
      `docs/internal/api-surface.md:498` (`CairnAdminRoutes`) and `:519` (`createCairnAdmin`)
      still render every ranks 1-13/17-22/38 janitorial type after the narrowing (verified by
      enumeration: for each such name the only api-surface lines naming it besides 513/520 are
      498 and 519).

## Task 2: The single R4 closure re-derivation; the retires pass's input

**Files:** a new record document `docs/internal/record/<date>-r4-rederivation.md` (the
initiative design, §3, refers to it by the placeholder name `2026-08-27-r4-rederivation.md`;
the file this task writes carries the pass's own date and is what the retires pass reads),
`docs/internal/engine-rulings.md` (progress annotations; the only close either Task 1 or
foundations A's Task 2 contributes is Task 1's single `audit-sveltekit-contentroutes` close —
see FINALIZATION NOTE 2 — which this task VERIFIES against the `check:surface` diff).

- [ ] Derivation input is `docs/internal/api-surface.md` as of Task 1; as merged it carries
      411 exported names across 18 subpaths, `/sveltekit` publishing 193 of them. The
      original audit derivation was MANUAL and no closure-derivation tooling exists under
      `scripts/` (proceed by hand or write a scratch script and say which), but two machine
      inputs the audit did not have now exist and are the starting point, not a substitute
      for the derivation: `check-surface.mjs` renders every subpath's full declared shapes
      into the snapshot, and `scripts/checks/check-surface-reexports.json` records 120
      duplicate publications with each one's home and the signature that requires it.
- [ ] Re-test the `C2_READDED` keeps (`src/tests/unit/root-barrel-prune.test.ts:89-112`,
      22 names, verified) and the three closure leaks (`NavIcon`, `EngineScreenId`,
      `SlotKind`; `2026-08-26-any-site-audit.md:93-97`, verified), READING the verifier
      corpus first (its overturns are settled; do not re-propose them).
- [ ] Reconciliation, premise corrected and re-measured against the merged ledger: the
      ledger's bucket totals reproduce the record's (535/384/57/94 exact; nine of eleven
      buckets exact); the entire discrepancy is ONE item in each of two buckets in opposite
      directions (route-factories, `audit-sveltekit-*`: ledger 72 keep / 6 reshape / 52
      retire against the record's 71/6/53; admin-shell-toolkit, `audit-admin-*`: ledger 35/5/19
      against the record's 36/5/18). A two-item hunt, not a 94-slug enumeration; the 48 in
      `coherence-v2.md:496` is the pre-verification tally, superseded by the 33 verification
      overturns.
- [ ] The three lists: (a) retires already consumed, VERIFIED against the `check:surface`
      diff — this list is EMPTY on both halves: foundations A's Task 2 closed no retire (its
      move rule relocated keeps only), and this pass's Task 1 consumes no retire either (its
      narrowing closes `audit-sveltekit-contentroutes` alone; `createCairnAdmin`'s rendered
      return still names every ranks 1-13/17-22/38 janitorial type after the split), so
      nothing has executed yet on either half; (b) retires still requiring manual execution
      (the retires pass's work list), including the re-evaluation of foundations A's recorded
      R4 re-exports against the narrowed closure; (c) verdict changes, split into an IN-94
      half (verdict flips that participate in the partition arithmetic below) and an
      OUT-OF-94 half (proposals recorded and ratified separately, not part of the partition),
      each argued in one sentence with evidence, diffed against foundations A's recorded move
      set so churn on moved names is visible.
- [ ] What lists (b) and (c) are measured against, named explicitly (both halves of one
      artifact, and they must agree): the reader's copy is
      `docs/internal/record/2026-08-29-foundations-a-move-set.md`, whose "Moved names (18)"
      table, "Unmoved by verdict" section, and 120-row "The recorded R4 re-export set" table
      list (c) diffs against; the machine twin the gate actually reads is
      `scripts/checks/check-surface-reexports.json`, and list (b) re-derives its entries.
      Measured on the merged tree: 64 of the 120 re-exports sit on `/sveltekit`; of those 64,
      exactly 1 names `createContentRoutes` (`CairnRuntime`, which survives on its other two
      signatures regardless) and 0 name `createCairnAdmin` or `CairnAdminRoutes`, so the
      narrowing strikes at most zero re-export records. **The record's own prose says
      "Sixty-two"; the record's table and the JSON both say 64. Use 64** (see the finalization
      section).
- [ ] Each ranks 1-13/17-22/38 retire must be tested against `createCairnAdmin`'s rendered
      return (`api-surface.md:498`, `:519`), with the blocked ones routed to list (c) and the
      blocking signature named per item (roughly 21 of the 94 retires are expected to be
      composer-blocked; the retires pass needs the per-item blocker or it will attempt
      deletions that break the R4 closure).
- [ ] Two inherited cautions on list (b) (move-set record, inheritance notes 2 and 3). First,
      a green `check:surface` proves record MEMBERSHIP, never justification: the gate checks
      that a duplicate has a recorded entry with a valid `home`, so appending an entry
      launders any duplicate green and the `Why it survives` column is unenforced prose. The
      re-derivation removes a duplicate the narrowed closure no longer requires; it does not
      record it. Second, the count list (b) is measured against did NOT move: the surface
      still carries 122 names published from two or more subpaths, exactly as before
      foundations A (only publications-per-name fell: 5-way 5 to 0, 4-way 44 to 34, 3-way 10
      to 12, 2-way 63 to 76). The audit's literal R-1 ask (`coherence-v2.md:134-135`, fail on
      any two-barrel name) shipped as fail-unless-recorded, so a green gate does not satisfy
      that ask and must not be read as satisfying it.
- [ ] THE RATIFICATION GATE: list (c) goes to Geoff at the pass-end checkpoint BEFORE the
      retires pass plan is authored; the charter adjudicates, the ledger records.
- [ ] Acceptance: `check:docs` green; list (a) (empty), list (b), the IN-94 half of list (c),
      and the named exclusion (`DEFAULT_ROLES`, `audit-adapter-default-roles` at ledger
      `:276`, a keep that becomes a retire only inside the conventions pass's coupled
      `defineAccess` pair) partition the 94 exactly; the OUT-OF-94 half of list (c) sits
      outside that arithmetic; list (a) matches the surface diff (an empty list matches
      trivially, since nothing has executed).

## Task 3: Drift for the internalized names

**Files:** every `docs/` page and `src/` comment naming an internalized member (scope:
`docs/`, `src/`, `examples/`, `templates/`), `docs/extend/migration-notes.md`.

- [ ] Primary sweep targets, ahead of the generic per-member grep: three prose surfaces that,
      after Task 1's narrowing, document members the public factory no longer returns, and no
      gate sees it. `docs/reference/sveltekit.md:920-1000` (the `createContentRoutes` member
      prose: `mediaDeleteAction`/`MediaDeleteRefusal` at `:946-951`,
      `mediaUpdateAction`/`MediaUpdateFailure` at `:951-954`, the
      replace/altPropagate/janitorial members through `:975`).
      `docs/reference/admin-routes.md:145-163` and `:272-280` (the "mount a single admin view
      inside its own shell" clause stops being true of the media view).
      `docs/reference/components.md:199-235` (`CairnMediaLibrary`'s worked example implies a
      mountable route).
- [ ] `grep -rn` per internalized name across the four trees; repoint or rewrite every hit;
      the gate-coverage residual stated honestly as in foundations A (whose Task 3 named it
      precisely: `check:snippets` covers fenced ts/svelte in the four published arms and
      `check:reference:signatures` covers callable signature blocks, while prose,
      `docs/internal`, `src/lib` comments, `examples/`, and `templates/` rely on the sweep).
      Foundations A's sweep found zero residual hits for its 18 moved names and one class of
      pre-existing drift the reference gate structurally cannot see (14 stale
      `delivery-data.md` rows); expect the same asymmetry here and report it the same way.
      Note the sweep surface is wider than A's: `createContentRoutes` alone is named in at
      least 104 files across `src/`, `docs/`, `examples/`, `templates/`, and `scripts/` (a
      floor, not an acceptance number: it measures 104 today, and that count includes this
      plan document itself).
- [ ] `migration-notes.md` gains the narrowing entry, in the per-version record's form, under
      the same `## Unreleased` section that already carries foundations A's canonical-home
      entry (`docs/extend/migration-notes.md:16-25`).
- [ ] Acceptance: full gate green; the sweep's zero-hit proof recorded per name class.

---

## Pass-end notes

`diff-reviewer` per task plus a pass-end `engine-triage` dispatch verifying Task 2's lists
against the ledger and the repaired shapes (an error multiplies into the retires pass). The
retires pass plan is authored AFTER Geoff rules on list (c), never from the audit's original
94-item list.

**Explicitly out of scope, routed rather than inherited by omission (move-set record,
inheritance note 4):** R-0's second direction, *"an export the engine could use and does not
is a shape defect until argued otherwise"*, is ratified in the ledger
(`read-from-the-source-rule` at `:38`) but not discharged: no instance work, no gate, no
owning slice. Its four instances (`checkRateLimit`, `formatTimestamp`, `normalizeAssets`,
`feedView`; `coherence-v2.md:602-`, C13) are individually ledgered. This pass does not pick
them up. The owning slice is **the internals pass (initiative design §5)**, which already
carries the coherence-thirteen; the `check:dogfood` tripwire C13 proposes belongs with it.
Naming it here discharges B's obligation to route the note, not the note itself.

**Also routed to the internals pass, not executed here (move-set record, inheritance note
1):** the `staleNames` per-subpath rescope in `reference-coverage.mjs`, ruled out of Task 1 at
the engine-triage pre-dispatch review. FINALIZATION NOTE 1 below carries the re-based grounds:
the union scoping is deliberate and documented in the file itself, a naive per-subpath rescope
reds pages this pass never touches, and foundations B removes no export from any barrel, so
the check cannot fire on this pass's own changes either way. The internals pass is where the
exemption mechanism (or the ruling to overturn the documented rationale) belongs, alongside
the coherence-thirteen it already carries.

---

## Pre-flight verification (2026-08-29)

Verified against `main` at `49914d9d`, before the csrf-hardening merge. **Superseded by the
finalization section below, which re-measures every item against the merged tree and
discharges the "Re-verify after the csrf-hardening merge" list. Read this section as the
record of what was known at authoring time, never as a current measurement.**

**Corrections**

- Task 1, "Count honesty" sentence claims "the audit's own documents state the ContentRoutes
  return count as 30, 35, and 36 in different places." Only "30-key" is documented
  (`rank-route-factories.md:640` and `verify-route-factories.md:119`, both "the full 30-key
  action vocabulary" / "The 30-key return verified"); a repo-wide grep found no place stating
  "35" or "36" as a `ContentRoutes` member count (only unrelated rank numbers 35/36 for
  `MediaLibraryEntry`/`UsageEntry`, and unrelated file-count histograms). The measured 35
  itself is correct; the "36" provenance could not be located.

**Re-verify after the csrf-hardening merge**

- Task 1 Files list parenthetical (`docs/internal/engine-rulings.md` carries an
  `audit-sveltekit-contentroutes` entry describing a shape "repaired by foundations A"):
  `docs/internal/engine-rulings.md` is in the csrf-hardening pass's edited-file list; the
  entry currently exists at line 1510 ("`## audit-sveltekit-contentroutes: ContentRoutes
  (reshape, 2026-08-26, any-site audit)`") but must be re-read post-merge.
- Task 1, membership-rule bullet (the janitorial trio and the four media-mutation actions,
  `mediaReplaceAction`/`mediaAltPropagateAction`/`mediaDeleteAction`/`mediaUpdateAction`, have
  failure/result types in ranks 14-30: `MediaBulkFailure` rank 18; `MediaReplaceFailure` rank
  20; `MediaAltPropagateFailure` rank 17; `MediaDeleteRefusal` rank 21; `MediaUpdateFailure`
  rank 19): these action names and their failure-type associations are declared in
  `src/lib/sveltekit/content-routes-media.ts`, a csrf-hardening-pass-touched file; the rank
  citations verify against `rank-route-factories.md` today (ranks 14-30 headings confirmed)
  but the underlying action/type shapes must be re-checked after the csrf merge.
- Task 1, membership-rule bullet (`ContentFormFailure`, a keep, stays in the public unions it
  already inhabits, composed from `SaveFailure`/`DeleteRefusal`/`RenameFailure`/
  `CreateFailure`/`PreviewMintFailure` (core), `MediaDeleteRefusal`/`MediaUpdateFailure`/
  `MediaReplaceFailure`/`MediaAltPropagateFailure`/`MediaBulkFailure` (media), `TidyFailure`
  (tidy)): verified today at `content-routes.ts:93-95`, but its constituent types are
  declared in `content-routes-core.ts`, `content-routes-media.ts`, and
  `content-routes-tidy.ts`, all three csrf-hardening-pass-touched files.
- Task 2, reconciliation bullet (the ledger's bucket totals reproduce the record's
  535/384/57/94 exact, nine of eleven buckets exact, with the entire discrepancy being one
  item each in route-factories (72/52 ledger vs 71/53 record) and admin-shell-toolkit (35/19
  ledger vs 36/18 record)): `docs/internal/engine-rulings.md` (the "ledger") is a
  csrf-hardening-pass-touched file, so its current bucket totals must be re-verified
  post-merge. The record-side numbers verify today: `2026-08-26-any-site-audit.md:19,39`
  states "535 items in 11 subsystems" and "384 keep, 57 reshape, 94 retire... after 33
  verification overturns"; its table (line 45-46) shows route-factories 71 keep/53 retire and
  admin-shell-toolkit 36 keep/18 retire, matching the record-side halves of the plan's claim.
- Task 2 acceptance bullet (the three lists in Task 2 plus the named exclusion,
  `DEFAULT_ROLES`, partition the 94 retires exactly): `docs/internal/engine-rulings.md` is a
  csrf-hardening-pass-touched file; `DEFAULT_ROLES` currently carries a "keep" verdict there
  (line 151, "`audit-adapter-default-roles: DEFAULT_ROLES (keep, 2026-08-26, any-site
  audit)`") consistent with the initiative-design doc's description of it as excluded, but
  the ledger entry must be re-read post-merge.
- Header, Shared files line (`docs/internal/engine-rulings.md` and `CHANGELOG.md` are files
  this pass's tasks touch): both files are in the csrf-hardening pass's edited-file list;
  their current content, which this pass's tasks build on top of, must be re-read after that
  merge before editing.

---

## Finalization against the merged foundations A surface (2026-08-29)

Measured against `main` at `15f98335`, the foundations-a merge. Every claim in the task
bodies above was checked against the files themselves; the corrections are folded into the
bodies, and this section is the audit trail. Scope is unchanged: three tasks, no task added,
none removed, no acceptance criterion widened.

**Corrections folded into the bodies**

- Task 1, "Count honesty" (was: "the audit's own documents say 30, 35, and 36 in different
  places"). Corrected: only "30-key" is documented (`rank-route-factories.md:640`,
  `verify-route-factories.md:119`); no source states 36. The measured 35 re-verified on the
  merged tree: `content-routes.ts:111-145` returns 35 members, and `cairn-admin.ts` drives
  every one (35 distinct `content.<member>` references, zero undriven), so the body's
  "the composer drives ALL 35" is now a measured claim rather than an assumed one.
- Task 1, membership rule (was: "`ContentFormFailure` (a keep)"). Corrected: it is an OPEN
  RESHAPE. `audit-sveltekit-contentformfailure` at `docs/internal/engine-rulings.md:1329`
  reads "(reshape, 2026-08-26, any-site audit)", rank 31, and the verifier let the reshape
  stand (`verify-route-factories.md:48-51`). The body's operative claim survives the
  correction, since a reshape is not a retire and the name stays public here, but the reshape
  belongs to the conventions pass and this task neither executes nor closes it.
- Task 1, Files (was: bare test-file stems, and the ledger entry cited without an anchor).
  Corrected to full paths under `src/tests/unit/` (all five verified present) and to the
  post-merge anchor `docs/internal/engine-rulings.md:1639`. The "38
  `createContentRoutes`-referencing test files" count re-measured on the merged tree: exactly
  38. The reference return block is `docs/reference/sveltekit.md:884-919`.
- Task 1, executable proof (was: `env-genericity.test.ts` cited without a path or anchor).
  Corrected to `src/tests/unit/env-genericity.test.ts`, whose no-suite Vitest workaround
  comment sits at `:26-30`.
- Task 2, Files (was: `<date>-r4-rederivation.md` with no cross-reference). Added: the
  initiative design §3 refers to this document by the placeholder name
  `2026-08-27-r4-rederivation.md`; the file this task writes carries the pass's own date, and
  the retires pass reads the file, not the placeholder.
- Task 2, derivation input (was: "no closure tooling exists under `scripts/`"). Still true of
  closure DERIVATION tooling, verified across `scripts/checks/`. Added what the merged tree
  now supplies that the audit did not have: `check-surface.mjs`'s rendered per-subpath shapes
  and the 120-entry `scripts/checks/check-surface-reexports.json` with each entry's home and
  requiring signature. The merged `api-surface.md` carries 411 exported names across 18
  subpaths, `/sveltekit` publishing 193.
- Task 2, reconciliation (was: bucket figures unverified post-merge). Re-measured against the
  merged ledger and confirmed exactly: 535 entries totaling 384 keep / 57 reshape / 94 retire;
  nine of eleven buckets reproduce the record's table; `audit-sveltekit-*` is 72/6/52 against
  the record's 71/6/53 and `audit-admin-*` is 35/5/19 against the record's 36/5/18, one item
  each in opposite directions, exactly as the body claims.
- Task 2, list-(b)/(c) measurement base (was: "diffed against foundations A's recorded move
  set", no file named). Added the explicit pair: the reader's copy
  `docs/internal/record/2026-08-29-foundations-a-move-set.md` (its "Moved names (18)" table,
  "Unmoved by verdict" section, and 120-row re-export table) and the machine twin
  `scripts/checks/check-surface-reexports.json` the gate actually reads.
- Task 2, the `/sveltekit` re-export count. **The move-set record's prose says "Sixty-two of
  the 120 recorded re-exports sit on `/sveltekit`". The record's own table and the JSON both
  carry 64.** The plan now says 64. The record's prose is wrong by two and should be repaired
  when Task 2 next writes to that file; nothing in this plan depends on 62.
- Task 3, drift sweep (was: "the gate-coverage residual stated honestly as in foundations A",
  the referent unstated). Added foundations A's own statement of that residual and its
  measured outcome (zero residual hits across 18 moved names, plus 14 stale `delivery-data.md`
  rows the reference gate structurally cannot see), and the merged-tree measurement that this
  sweep is wider: `createContentRoutes` alone is named in at least 104 files across the four
  trees plus `scripts/` (a floor, not an acceptance number: it includes this plan document
  itself).
- Task 3, `migration-notes.md` (was: "gains the narrowing entry"). Anchored to the same
  `## Unreleased` section that already carries foundations A's canonical-home entry,
  `docs/extend/migration-notes.md:16-25`.
- Header, evidence base (was: five verifier overturns listed). Completed against
  `verify-route-factories.md` read in full: rank 101 `EmailAttachment` reshape-to-keep and
  ranks 82/83/84 (the nav resolver/validator) reshape-to-retire were missing from the list.
  Anchors added for C3 (`:189-231`, the prescription at `:230-231`), C10 (`:492-`, its tally
  at `:496`), and the ranks 1-30 span (`:58-275`, all thirty verdicts retire).
- Header, worktree line: `main` at `15f98335` named, and the foundations-a merge stated as
  landed rather than pending. The "task bodies are FINALIZED before dispatch" sentence now
  records that the finalization happened and points at this section.

**The csrf-window re-verification, discharged (each item from the pre-flight list above)**

- `audit-sveltekit-contentroutes` post-merge: PRESENT, at `:1639` (was `:1510` at
  `49914d9d`). Foundations A repaired it: the shape now sits on its own
  `- **Shape:**` line, a complete sentence naming the internal-shape consumer, with no
  truncated `(shape: …)` parenthetical. Task 1's premise holds.
- The media action names and their failure-type associations post-merge: HOLD.
  `src/lib/sveltekit/content-routes-media.ts` still declares `MediaDeleteRefusal` (`:85`),
  `MediaUpdateFailure` (`:102`), `MediaReplaceFailure` (`:114`), `MediaAltPropagateFailure`
  (`:127`), and `MediaBulkFailure` (`:141`), and its factory still returns the media load plus
  its eleven actions (`:1398-1411`). The rank citations verify: 17, 18, 19, 20, 21 respectively, each a retire
  the verifier let stand ("Ranks 14-30 — all retires stand").
- `ContentFormFailure` composition post-merge: HOLDS at `content-routes.ts:93-95`, still the
  eleven-way `Partial<>` over the five core, five media, and one tidy arms. Its VERDICT does
  not hold as the plan stated it: reshape, not keep (corrected above).
- Task 2 reconciliation against the post-merge ledger: HOLDS exactly (figures above).
- `DEFAULT_ROLES` post-merge: HOLDS as a keep, `audit-adapter-default-roles` now at `:276`
  (was `:151` at `49914d9d`), consistent with the initiative design's naming it the retires
  pass's one named exclusion (§3).
- Shared files post-merge: `docs/internal/engine-rulings.md` re-read (4157 lines, the two
  foundations A ratifications at `:38` and `:55`); `CHANGELOG.md` re-read, its `## Unreleased`
  section open and carrying `<!-- release-size: minor -->`. Tasks append there.

**FINALIZATION NOTES (the conductor rules; the `engine-triage` review sees these first)**

1. **RULED (engine-triage pre-dispatch review): the `staleNames` per-subpath rescope is
   removed from Task 1; the gate redesign is routed to the internals pass (Pass-end notes
   above).** Inheritance note 1 assigned the fix to "before narrowing `/sveltekit`", and an
   earlier draft of this plan folded it into Task 1 as that task's first bullet. The grounds
   are re-based here on evidence the review measured on the merged tree, which changes the
   verdict from "the conductor should rule" to "ruled". The union scoping IS deliberate,
   documented twice in the file itself (`scripts/checks/reference-coverage.mjs:188-191` and
   `:319-326`: "the check is package-wide, not page-scoped, because a page legitimately names
   a real export that lives on a different subpath"), but the counterexample the earlier draft
   worried about, `docs/reference/core.md:698-710`'s `cardShell`/`headRow`/`iconSpan` beside
   the root export `glyph`, never enters the candidate pool under a naive per-subpath rescope
   (verified by simulation). What a naive rescope actually reds is four pages this pass never
   touches, each one shared by two subpaths in `CONFIG` (`reference-coverage.mjs:293-296`):
   `/reproductions` and `/reproductions/manifest` both map to `reproductions.md`; `/delivery`
   and `/delivery/head` both map to `delivery.md`. Twenty names sit across those four entries,
   of which `check-surface-reexports.json` records only three. Decisively, foundations B
   removes no export from any barrel, so `staleNames` could never fire on this pass's own
   changes either way; the stale-row exposure a rescope would actually catch belongs to the
   retires pass, which is when names get removed. Sizing was also wrong to carry regardless: a
   gate-behavior change does not belong inside the pass's largest task, already the `model:
   opus` candidate.
2. **RULED: list (a) is empty on both halves.** The bullet originally described list (a) as
   "retires already consumed by foundations A Task 2 and this pass's Task 1". A's Task 2
   executed the canonical-home rule for KEEPS only; its own move rule holds that "RETIRES die
   in place (the retires pass deletes them where they stand)", the move-set record's "Unmoved
   by verdict" section names the five retires among the 122 multi-subpath names as explicitly
   not moved, and the merged ledger carries no retire entry closed by foundations A. This
   pass's Task 1 also consumes no retire, per the engine-triage review's grounding for its
   acceptance bullet: `createCairnAdmin`'s rendered return (`api-surface.md:498`, `:519`)
   still names every ranks 1-13/17-22/38 janitorial type after the narrowing, so Task 1 closes
   only `audit-sveltekit-contentroutes` itself. So list (a) as executed has zero contributors,
   not one: the wording dates from before the foundations pass was split, when one Task 2 was
   expected to consume retires, and the initiative design (§3) still carries the pre-split
   phrasing too (unchanged by this pass, out of scope). The review ruled: keep list (a) in the
   task body as an explicit empty list rather than strike it, since a later pass's
   `check:surface` diff may populate it. Nothing else in the plan depends on the answer: the
   partition acceptance still holds, since an empty contributor contributes nothing to the 94.

---

## Post-mortem (2026-08-30, pass executed and closed)

**What was built.** All three tasks landed on worktree `foundations-b`, nine commits
`e743f624..962daace`. Task 1 (`e743f624`, upshifted to Opus per the header): the public
`createContentRoutes` now declares a 25-member `Pick`-derived `ContentRoutes` return while the
unexported-from-any-barrel `createContentRoutesInternal` keeps the wide 35-member shape the
composer drives in full; a compile-only hand-mount fixture proves the IN set both directions;
`audit-sveltekit-contentroutes` closed, and only it, since `createCairnAdmin`'s rendered
return still names every janitorial type (no retire consumed). Task 2 (`a93161de`,
`db0ce77b`, one fix cycle at `00d1f1cb`): the R4 re-derivation record at
`docs/internal/record/2026-08-30-r4-rederivation.md`, partition 0 + 63 + 31 = 94 exact, with
`DEFAULT_ROLES` the named OUT-OF-94 exclusion. Task 3 (`372fc9d8`, one fix cycle at
`c9636b39`): the drift sweep for the ten internalized names across the three primary reference
surfaces plus the generic four-tree grep, zero unresolved hits, `migration-notes.md` entry
added.

**What was verified, with evidence.** Every task ran the implementer/diff-reviewer chain; the
Task 1 and Task 3 reviewers re-ran gates and re-grepped independently, and the Task 2 reviewer
re-derived the 31 composer-blocked names to set-identity before accepting. The pass-end
battery ran all eleven gates by name (check, test 438/5898 exit 0, comments, transcripts,
symbols, reference, reference:signatures, package, docs, surface, snippets), all green. The
pass-end `engine-triage` dispatch verified the record exhaustively (all 554 ledger headings
parsed; every list-(b) anchor matched) and the `svelte-reviewer` returned
accept-with-follow-ups; its fixable findings landed at `962daace` (the fixture's false
`listDelete` key, the overstated header, the type-only-boundary doc comment, the
`CairnMediaLibrary` component note, three stale wordings). The branch is pushed for the CI
e2e run, the real from-scratch consumer-build proof. The live admin smoke was skipped with
cause: the narrowing is type-level only, the wrapper returns the same runtime object, and the
composer is behaviorally unchanged.

**The material finding (F-1), carried into the record at `6bba4bdb`.** The engine-triage
verifier found that 19 of list (b)'s 63 rows are named inside keep-verdicted exports'
rendered shapes (mostly `EditData`/`AdminData`-family contracts on the `load` half), so
executing list (b) as written manufactures 19 closure leaks of the `NavIcon` class the record
itself flags as unowned; the record's stated whole-line method also yields 48, not Tier 1's
scoped 31. The record now reconciles the method statements, carries the 19-row keep-parent
table, corrects the severity claim (closure leak, not build break, per the two existing
in-surface instances), and presents the A/B resolution neutrally at the ratification gate.
No verdict reopened; the partition arithmetic is undisturbed.

**Decisions locked in.** The `check:surface` rendering fact (a declared named return collapses
to its alias name; the expansion proof lives on the alias's own snapshot entry). The
`Pick`-derived narrow type as the C3-conformant form. "Unexported" operatively means off every
barrel and package subpath (the module-level export is required by the composer and must
stay). The simplifier's ruling that the per-file `SiteEnv` fixture triple is the repo idiom
(the svelte-reviewer's S4 extraction was declined on those grounds).

**Budget, recorded honestly.** The plan's ceiling was 1.8M for chains plus ritual; the pass
spent roughly 2.3M in subagent tokens alone (~2.4M with the main loop). The overrun came from
two fix cycles (Tasks 2 and 3), the F-1 amendment (~0.34M, the single largest dispatch), and
a reviewer fan-out that re-verified more exhaustively than the ceiling had priced. The
conductor failed to flag the trajectory at the Task 3 checkpoint, when spend was already
~1.5M; that is the process defect to carry, not the re-verification depth, which caught a
real finding (F-1) and a real fixture defect (W1). Human interaction points this pass: zero
so far; the pass-end combined question is the first.

**Carried follow-ups (routed, not floating).** (1) No compile in the repo exercises the
hand-mount path against generated `./$types`; a hand-mounted `+page.server.ts` in the
showcase is the close (routed to STATUS carry-forwards). (2) Six sibling `content-routes-*`
module headers still say the context is "built once by `createContentRoutes`"; imprecise
since the rename, `content-routes-context.ts:272` the one that matters (routed to the
internals pass alongside its other comment work). (3) A legacy `moduleResolution: "node"`
consumer can deep-import `createContentRoutesInternal` from dist (informational; the exports
map guards module-resolution-aware consumers). (4) The retires pass plan waits on Geoff's
list-(c) and F-1 rulings, per the ratification gate.
