# Foundations B: Narrowing and Closure (remediation initiative, slice 2b)

> **For agentic workers:** three tasks, SERIAL. Dispatch the `cairn-implementer` /
> `diff-reviewer` chain per task with the Agent tool; the full gate inside the chain. Task 1
> is the pass's `model: opus` candidate (a public-signature change the initiative builds on).

**Token ceiling (WHOLE pass, chains plus ritual): 1.8M.** **Checkpoint interval:** every
task. **Worktree:** `foundations-b` off `main` at `15f98335`, the foundations-a merge, which
has landed; that commit's `docs/internal/api-surface.md` is this pass's derivation input.
**The task bodies below were FINALIZED against that merged tree on 2026-08-29; the
finalization section at the end of this file carries every correction, its evidence, and the
mismatches the conductor rules on. One adversarial `engine-triage` review over this finalized
plan runs BEFORE any dispatch.**
**Shared files:** `docs/internal/engine-rulings.md` (Tasks 1, 2), `CHANGELOG.md` (every
task), `docs/reference/sveltekit.md` (Tasks 1, 3).
**Inherited from foundations A, folded into the tasks that own them:**
`docs/internal/record/2026-08-29-foundations-a-move-set.md`, its "Inheritance notes for
foundations B" subsection (four items; note 1 in Task 1, notes 2 and 3 in Task 2, note 4 out
of scope under Pass-end notes).
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
repaired), `scripts/checks/reference-coverage.mjs` (the inherited `staleNames` scoping, first
bullet below), `CHANGELOG.md`.

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

- [ ] FIRST, before the return changes (inherited from foundations A, move-set record,
      inheritance note 1): scope `reference-coverage.mjs`'s `staleNames` per subpath.
      Today it is union-over-all-subpaths (`staleNames` at `:197-201`, fed `globalKnownNames`
      at `:328`, called at `:360`), so a reference page listing a name its own subpath does
      not export passes as long as any subpath exports it. That is exactly how 14 dead rows
      survived in `delivery-data.md` until foundations A's Task 3 removed them by hand. It
      lands here rather than after, because narrowing shrinks `docs/reference/sveltekit.md`
      (2005 lines today) and the per-subpath check is far cheaper against the smaller page.
      **See FINALIZATION NOTE 1: the union scoping is a deliberate, documented choice with a
      live counterexample in `reference-coverage.mjs:188-191`, so this bullet needs the
      conductor's ruling before dispatch.**
- [ ] Membership rule, positive and enumerable (the "driven set" cannot discriminate; the
      composer drives all 35): a member is OUT iff it is reachable only from the engine's
      own Media Library screen AND its result/failure types sit in the ranks 1-30 retire
      closure (this covers the janitorial trio AND the four media-mutation actions,
      `mediaReplaceAction`/`mediaAltPropagateAction`/`mediaDeleteAction`/`mediaUpdateAction`,
      whose failure types are ranks 14-30 retires: `MediaAltPropagateFailure` 17,
      `MediaBulkFailure` 18, `MediaUpdateFailure` 19, `MediaReplaceFailure` 20,
      `MediaDeleteRefusal` 21, every one of them a retire the verifier let stand); everything
      the hand-mount path legitimately wires is IN, and `ContentFormFailure` stays in the
      public unions it already inhabits. `ContentFormFailure` is an OPEN RESHAPE, not a keep
      (`audit-sveltekit-contentformfailure` at ledger `:1329`, rank 31, "reshape stands" at
      `verify-route-factories.md:48-51`); its reshape belongs to the conventions pass, and
      this task neither executes nor closes it. Note the alignment, which is a reason to keep
      the name public here and not a licence to reshape it: that ledger entry's repaired
      `Shape:` already prescribes keeping the eleven arms module-internal, which is what this
      task's internalization begins. The task report enumerates every excluded member with
      its rank citation; the diff review checks the enumeration against the rule.
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
- [ ] CHANGELOG `Consumers must:` for anyone naming the wide type or an internalized member,
      appended under the existing `## Unreleased` section (`release-size: minor` today).
- [ ] Acceptance: full gate green including the fixture; the api-surface diff shows the
      narrow public return; `audit-sveltekit-contentroutes` (`:1639`) closed against the
      `- **Shape:**` line foundations A repaired; entries whose retirement this task already
      consumed close here as consequences (the standing constraint puts the close in the
      executing task; Task 2 verifies). Every consumed entry is one of the 30 retire verdicts
      in `rank-route-factories.md` ranks 1-30, each with its own `audit-sveltekit-*` ledger
      entry.

## Task 2: The single R4 closure re-derivation; the retires pass's input

**Files:** a new record document `docs/internal/record/<date>-r4-rederivation.md` (the
initiative design, §3, refers to it by the placeholder name `2026-08-27-r4-rederivation.md`;
the file this task writes carries the pass's own date and is what the retires pass reads),
`docs/internal/engine-rulings.md` (progress annotations; closes belong to Tasks 1 and
foundations A's Task 2, which this task VERIFIES against the `check:surface` diff — but see
FINALIZATION NOTE 2, since A's Task 2 closed no retire entry).

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
- [ ] The three lists: (a) retires already consumed by foundations A Task 2 and this pass's
      Task 1, VERIFIED against the `check:surface` diff (their closes happened in the
      executing tasks; this task audits them) — **see FINALIZATION NOTE 2: foundations A's
      Task 2 consumed no retires at all, so list (a) as written has one contributor, not
      two**; (b) retires still requiring manual execution
      (the retires pass's work list), including the re-evaluation of foundations A's recorded
      R4 re-exports against the narrowed closure; (c) PROPOSED verdict changes, each argued in
      one sentence with evidence, diffed against foundations A's recorded move set so churn on
      moved names is visible.
- [ ] What lists (b) and (c) are measured against, named explicitly (both halves of one
      artifact, and they must agree): the reader's copy is
      `docs/internal/record/2026-08-29-foundations-a-move-set.md`, whose "Moved names (18)"
      table, "Unmoved by verdict" section, and 120-row "The recorded R4 re-export set" table
      list (c) diffs against; the machine twin the gate actually reads is
      `scripts/checks/check-surface-reexports.json`, and list (b) re-derives its entries.
      Measured on the merged tree: 64 of the 120 re-exports sit on `/sveltekit`, and the
      narrowing is expected to strike many of them. **The record's own prose says "Sixty-two";
      the record's table and the JSON both say 64. Use 64** (see the finalization section).
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
- [ ] Acceptance: `check:docs` green; the three lists plus the named exclusion
      (`DEFAULT_ROLES`, `audit-adapter-default-roles` at ledger `:276`, a keep that becomes a
      retire only inside the conventions pass's coupled `defineAccess` pair) partition the 94
      exactly; list (a) matches the surface diff.

## Task 3: Drift for the internalized names

**Files:** every `docs/` page and `src/` comment naming an internalized member (scope:
`docs/`, `src/`, `examples/`, `templates/`), `docs/extend/migration-notes.md`.

- [ ] `grep -rn` per internalized name across the four trees; repoint or rewrite every hit;
      the gate-coverage residual stated honestly as in foundations A (whose Task 3 named it
      precisely: `check:snippets` covers fenced ts/svelte in the four published arms and
      `check:reference:signatures` covers callable signature blocks, while prose,
      `docs/internal`, `src/lib` comments, `examples/`, and `templates/` rely on the sweep).
      Foundations A's sweep found zero residual hits for its 18 moved names and one class of
      pre-existing drift the reference gate structurally cannot see (14 stale
      `delivery-data.md` rows); expect the same asymmetry here and report it the same way.
      Note the sweep surface is wider than A's: `createContentRoutes` alone is named in 103
      files across `src/`, `docs/`, `examples/`, `templates/`, and `scripts/`.
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
  sweep is wider: `createContentRoutes` alone is named in 103 files across the four trees plus
  `scripts/`.
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

1. **The `staleNames` per-subpath rescope has no task that owns it, and the code argues
   against it.** Inheritance note 1 assigns the fix to "before narrowing `/sveltekit`", which
   in this plan means inside Task 1, so it is folded there as that task's first bullet. Two
   problems the conductor should rule on. First, sizing: it adds a fourth deliverable to the
   pass's largest task, the one already marked the `model: opus` candidate, and it is a
   gate-behavior change rather than part of the narrowing. Second, and heavier, the union
   scoping is DELIBERATE and documented twice in the file itself
   (`scripts/checks/reference-coverage.mjs:188-191` and `:319-326`): "the check is
   package-wide, not page-scoped, because a page legitimately names a real export that lives
   on a different subpath", with a live counterexample in `docs/reference/core.md:698-710`,
   where the `/render` helpers `cardShell`, `headRow`, and `iconSpan` are shown beside the
   root export `glyph`. A per-subpath rescope must therefore either overturn that documented
   rationale or ship an exemption mechanism, and neither is specified anywhere in this plan.
   The three options: keep it in Task 1 with the exemption designed inside the task; route it
   to the retires pass, which is when the narrowed pages actually shrink; or rule the note
   discharged by foundations A's manual removal of the 14 rows.
2. **List (a)'s premise is half stale: foundations A's Task 2 consumed no retires.** The
   bullet describes list (a) as "retires already consumed by foundations A Task 2 and this
   pass's Task 1". A's Task 2 executed the canonical-home rule for KEEPS only; its own move
   rule holds that "RETIRES die in place (the retires pass deletes them where they stand)",
   the move-set record's "Unmoved by verdict" section names the five retires among the 122
   multi-subpath names as explicitly not moved, and the merged ledger carries no retire entry
   closed by foundations A. The wording dates from before the foundations pass was split,
   when one Task 2 was expected to consume retires; the initiative design (§3) still carries
   the pre-split phrasing too. So list (a) as executed has one contributor, this pass's Task
   1, and the `check:surface` diff it audits is Task 1's diff alone. The conductor rules
   whether to strike the foundations A clause outright or keep list (a) two-sourced with an
   empty A half recorded as such. Nothing else in the plan depends on the answer: the
   partition acceptance still holds either way, since an empty contributor contributes
   nothing to the 94.
