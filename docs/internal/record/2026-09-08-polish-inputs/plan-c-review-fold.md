# Polish-C plan review, the fold

The three-lens adversarial review of `docs/superpowers/plans/2026-09-08-polish-c-pass.md`
(coverage 17 findings, executor 14, sequencing 15, 46 in all) folded into the plan on 2026-09-08.
**Taken whole 44. Taken in part 2, and no finding declined whole.** The two partials are executor
4, whose budget half is taken and whose model half is SUPERSEDED by the workflow script itself
(`pass-execute-chains.js` does read a per-task `model`), and executor 8, whose split of two tasks is
taken while its proposal to split three more and its proposed cut for one of them are DECLINED with
reasons below. Conductor rulings R1 through R14 settled the forks the three lenses left open; where
a ruling and a report differ, the ruling governs and the line says so.

Seven findings overlap across lenses. Each is folded ONCE, at the line that carries the fullest
evidence, and the duplicate lines point at it rather than restating the change: coverage 3 with
executor 2; coverage 5 with executor 6 and sequencing 1; coverage 6 with executor 3 and sequencing
7; coverage 2 with executor 11; coverage 7 with executor 14; executor 10 with sequencing 12;
executor 9 with sequencing 11.

The fold also renumbered the pass from thirteen tasks to fifteen (R10), so every task reference
below uses the NEW numbering. The old-to-new map: 1 to 5 unchanged; old 6 splits into new 6 and 7;
old 7 becomes new 8; old 8 becomes new 9; old 9 splits into new 10 and 11; old 10 becomes new 12;
old 11 becomes new 13; old 12 becomes new 14; old 13 becomes new 15.

## Coverage and grounding lens

1. **Seventeen-row population attributed to a source that does not carry it.** TAKEN (R7). Task 13
   now states the enumeration as this plan's own derivation, cites the spec's rule ("every row
   naming a renamed symbol or event, enumerated at plan time"), names the method, and drops the
   charter-review finding-19 attribution; the plan header's Inputs line drops it too.
2. **"Thirty-seven rows" against an acceptance criterion counting forty-three.** TAKEN (R7). Task 13
   now names forty-six rows in four groups (17 + 9 + 13 + 7), which folds in the two rows Task 12
   annotates and the `convention-failure-suffix` row finding 9 adds, plus Task 12's one new row, and
   rules the population DERIVED by the gated grep with the enumeration as a completeness check
   reconciled in both directions. Folded once with executor 11.
3. **Three tasks named the wrong gate record file.** TAKEN (R2). Constraint 8 now routes each name
   to the record that holds it, measured: `check-self-use-allowlist.json` and
   `check-surface-reexports.json` carry the thirteen names between them and
   `check-surface-leaks.json` carries none, so no task is told to edit it. Every affected task's
   Files block and acceptance follow, and the standing acceptance is stated once as "no old name
   survives in any of the three records, and every record that named a renamed symbol before names
   its new one". Folded once with executor 2.
4. **`admin-design-system.md:451` is `ConceptList`'s empty state, not `OfficeList`.** TAKEN (R8).
   Task 12 now edits the F3-rhythm bullet at about `:477-480` only, and the Reconciliation row and
   the Corrections block both record that `:451`, `:158-159`, and `:896` describe the concept-list
   view and stay.
5. **Task 10 missed four live `OfficeList` sites and carried no Test block.** TAKEN (R9). Task 12's
   Files block now enumerates every in-tree site with its treatment, the three test files included
   (comments and test titles only, never an assertion), and `src/tests/component/OfficeList.test.ts`
   is named as deleted rather than hedged. Folded once with executor 6 and sequencing 1.
6. **The remaining-site taxonomy had no bucket for three real classes.** TAKEN (R3, R5).
   Constraint 7 now carries a complete residual taxonomy as a table, with versioned
   `migration-notes` sections, the friction log's Clearings table, `docs/STATUS.md` (reported, never
   edited), `docs/internal/api-surface.md`, the three write-once archive trees, and the live
   internal docs each named with its owner. Folded once with executor 3 and sequencing 7.
7. **The `Consumers must:` window is 67, not 68.** TAKEN. Re-measured at both heads; the
   Reconciliation block reads 67, and Tasks 14 and 15 report what they measure rather than matching
   a figure. Folded once with executor 14.
8. **`aksailingclub-org`'s `OfficeList` reach is eighteen screens, not sixteen.** TAKEN (R9).
   Corrected in the Corrections block, Task 12's decisions, Task 14's site table, and the
   hands-forward block, with the test file named beside the eighteen.
9. **`RevertFailure` bypasses a closed conventions row.** TAKEN (R7). The names table now names
   `convention-failure-suffix` as the row this rename contradicts, and Task 8 appends a dated
   supersession clause to it, citing the spec by path and date, stating the surviving scope and
   naming `RevertOutcome` as the ruled exception. The row joins Task 8's Files and Task 13's
   conventions group.
10. **"The ruled kebab grammar" is not ruled.** TAKEN. Task 8 now records the uniformity across the
    six existing `*Outcome` types AS the rule inside its own widening clause, and the Corrections
    block names the one casing rule that IS ruled (`events.ts:5-7`, a record's `reason` and `scope`
    fields) as a different surface, untouched.
11. **Five event anchors off by one, marked "Confirmed".** TAKEN (R7). All ten event lines
    re-measured in the Reconciliation block, with the identity-seam pass named as the cause and
    locate-by-string as the instruction; Task 10's Interfaces block carries the corrected lines.
12. **Task 6's `Consumers must:` line named the wrong two consumer-facing sites.** TAKEN. The
    seven-name split routes it: Task 6 names `src/theme/cairn.config.ts` for `createGithubApp` (all
    four sites) and Task 7 names `src/routes/healthz/+server.ts` for `loadHealth` (all four) and the
    preview route for `loadPreview` (two of four, flagged as such).
13. **The `parseManifest` re-homing belongs in the Corrections block.** TAKEN. Moved there, where
    Geoff reads knowing departures, with Task 5's decision now pointing at it.
14. **The header mis-described the spec's own task split.** TAKEN. The header now states that the
    spec's task 5 carries lines 7 and 8 together and that this plan moves line 8 out and folds it
    with the spec's task 8, adding and removing no work.
15. **"Character for character" cannot hold across the import line.** TAKEN. Task 1's decision,
    Step 3, and acceptance all scope the lockstep to the markup below the `<script>` block, which is
    what `check:snippets` proves.
16. **The sheet-inventory fixture holds `gap-0` and `gap-0.5` on adjacent lines.** TAKEN. Task 12's
    Files block and acceptance now name the exact line `gap-0` at `:236` and require `gap-0.5` at
    `:237` to survive.
17. **`xcathletes-org` does not name `DevBackendOptions`.** TAKEN. Recorded in the Corrections block
    and in Task 14's site table: it calls `devBackendHandle()` bare, so the rename reaches it only
    if it starts annotating, and the `Consumers must:` line still names it as published surface.

## Executor and plannability lens

1. **`npm run check:surface -- --update` does not regenerate the surface.** TAKEN (R1). Constraint 5,
   the Corrections block, the Gate section's addition 1, and every surface-changing task's Steps now
   read `npm run package && node scripts/checks/check-surface.mjs --update`, stated once in Global
   constraints and once per task, with the regenerated `docs/internal/api-surface.md` committed in
   the same task. **The report's second half, repairing the `check:surface` script or its banner, is
   DECLINED into this window** and filed instead: the spec's Polish-C shape rules that "a
   non-breaking fix found during C goes to a follow-up line, never into the window", so Task 15
   files it to `ROADMAP.md` with the evidence.
2. **`check-surface-leaks.json` carries none of the symbols.** TAKEN. Folded once with coverage 3.
3. **Sixteen live files outside the taxonomy, one of them `docs/STATUS.md`.** TAKEN. Folded once
   with coverage 6. The STATUS half is settled by R3: STATUS is never a deliverable, never in an
   acceptance grep's scope, reported by the task that finds a hit, and rewritten by the conductor's
   merge agent.
4. **Task 13 asks a zero-context Sonnet for numbers only the conductor holds, and cannot be
   upshifted.** TAKEN IN PART, and the model half SUPERSEDED. The budget half is taken (R13): new
   Task 15 writes the ledger with the evidence it can see and states that the token spend, the spend
   against the ceiling, the planning-miss count, and the execution-sitting count are the conductor's
   close-out records agent's to fill. The model half is superseded by the script itself:
   `pass-execute-chains.js` reads `t.model` on both the first dispatch and every fix round
   (`...(t.model ? { model: t.model } : {})`), and its own header documents it, so no dispatch
   outside the workflow is needed. Task 15's args entry carries `"model": "opus"`.
5. **"One summary per held section" names a structure the changelog does not have.** TAKEN. Task 15
   now names `docs/HISTORY.md`'s entries since the `0.96.0` cut as the authority for the held-pass
   list, one paragraph per entry, plus every `Consumers must:` line gathered from the window's five
   `###` subsections.
6. **The `OfficeList` removal's file list misses seven live sites.** TAKEN. Folded once with
   coverage 5 and sequencing 1; `docs/reference/admin-toolkit.md:191` is named as this task's
   failing gate, since `check:snippets` typechecks that fence against the built package.
7. **The plan never says what the failing assertion is.** TAKEN (R10, constraint 17). Every task now
   carries a "the failing gate first" clause naming what goes red first and what turns it green, and
   the constraint states that the TDD clause is discharged by that gate rather than by an invented
   test. The four shapes the report proposed are used: the compiler and `check:surface` for the
   renames, `check:snippets` for the doc fences, `admin-sheet-inventory.test.ts` for the `gap-0`
   departure, and the verification grep for the two ledger tasks. Task 8 additionally gets a real
   new test (see sequencing 3).
8. **Five tasks past the four-deliverable rule.** TAKEN IN PART (R10). Old Tasks 6 and 9 split,
   giving fifteen tasks. **The proposal to split old Tasks 4, 7, and 10 is DECLINED**, with the
   reason: each states four deliverables and each has a narrower propagation surface than the two
   that split. Old Task 4's six renames are type-import renames the compiler finds in two packages,
   with no scaffolder, template, or CLI reach; old Task 7's four types reach no pinned literal; old
   Task 10 removes one export whose sites are now enumerated exhaustively rather than described.
   **The CUT the report proposed for old Task 6 is also declined, and replaced.** A
   `src/lib`-versus-propagation cut is not available under constraint 3: the gate runs
   `check:template`, `check:snippets`, the CLI suite, and the showcase's own check, each of which
   goes red the moment `src/lib` renames without its propagation. The cut is by name group instead,
   each group propagated whole inside its own task, and the plan header states the reasoning. The
   log split takes the vocabulary boundary the report named, which has the same property.
9. **The ceiling prices thirteen dispatches and the workflow can run twenty-six.** TAKEN (R13). The
   ceiling is 9M with the arithmetic stated: fifteen units at 500K is 7.5M, plus 0.5M for the
   fan-out and the last task's whole-window reads, plus a named 1M reserve for two fix rounds. The
   80 percent line is 7.2M. Folded once with sequencing 11.
10. **Thirteen sequential gates and no unattended guard.** TAKEN. Pre-dispatch precondition 5 arms
    the runaway watcher and, on battery, the inhibitor and the watchdog, with
    `~/.claude/docs/unattended-work-guards.md` read before either. Folded once with sequencing 12.
11. **"Thirty-seven rows" against a list of forty-three.** TAKEN. Folded once with coverage 2.
12. **The release readiness drops two smaller `cairn-release` items.** TAKEN. Task 15 now runs the
    Tailwind gotcha grep in Step 1, carries the `upgrade-cairn.md` supersession sentence in the
    draft, and records the admin-surface re-read of the reproduction stories Tasks 1 and 12 touched.
13. **One `OfficeList` reference sits between two tasks with no owner.** TAKEN.
    `src/tests/component/reproductions-stories.test.ts`'s comment at `:990` and its `it(...)` title
    at `:987` are now Task 1's Step 4, which also discharges constraint 2 (the comment cites a pass
    and a task number); Task 12's acceptance is that the file is not in its diff.
14. **The `Consumers must:` count is 67.** TAKEN. Folded once with coverage 7.

## Sequencing and risk lens

1. **The `OfficeList` acceptance grep is unsatisfiable and six reference sites are outside the Files
   block.** TAKEN (R9). Folded once with coverage 5 and executor 6. The three structural halves are
   settled separately: `docs/reference/admin-toolkit.md:191` is named as the failing gate;
   `docs/STATUS.md` is reported and never edited (R3); and the `migration-notes` live bullet is
   assigned to Task 14 with its treatment stated in Task 12's Files block.
2. **`check:docs` reads `CHANGELOG.md`, so the historical immunity collides with a gate.** TAKEN
   (R4). New constraint 16 rules it: a historical entry's PROSE is immune and its LINK TARGET is
   not, so the task that renames a heading repoints the anchor in the same commit as a mechanical
   link edit. Both measured cases are assigned, `CHANGELOG.md:3011` to Task 6 and `:3148` to Task 5,
   each task's own grep finds any further case, and Task 14 proves none is left.
3. **The pass-wide paint claim is false for the outcome task.** TAKEN (R6). New Task 8 moves onto
   the paint-neutral branch, names the four committed auth baselines as its before set with the
   unmodified suite run as its after, and adds a component test rendering each of the three
   `LoginPage` arms, which its acceptance names. The paint section now names Tasks 1, 8, and 12 and
   explains why 1 and 12 still take the no-rendered-surface branch. Task 8's Files block also
   records that `src/lib/components/*.svelte` falls inside 11a's widened ESLint `.svelte` glob with
   `tsdoc/syntax` at error.
4. **Every "post-11b" anchor cites a task number 11b does not have.** TAKEN (R12). Read against the
   uncommitted 11b draft on disk: the design system is 11b's Task 1, `DevBackendOptions` its Task
   11, and the signups exemplar its Tasks 12, 13, and 14. All four citations corrected, the two
   missing signups tasks added, and the Reconciliation preamble now states that every 11b task
   number here is provisional and is re-read from 11b's committed plan at dispatch.
5. **The barrel-prune warning names the wrong literals.** TAKEN (R11). The Reconciliation block now
   names `KEPT` with its three entries (`RequestResult` `:42`, `NavLoadData` `:54`, `healthLoad`
   `:60`) and records that the `RETIRED_*` pair holds none of this window's names.
   `src/tests/unit/sveltekit-barrel-prune.test.ts` is named in Tasks 4, 7, and 8's Files blocks and
   in each of their acceptance criteria.
6. **`cookieName` collides with a site-local property.** TAKEN (R11). The five sites are named in
   the Corrections block and in Task 6's decisions, and Task 6's acceptance grep excludes them by
   path as a fourth exempt class beside the doctor's `githubApp` twin.
7. **`docs/internal/history/**` is a third write-once archive tree.** TAKEN (R5). Added to
   constraint 7's taxonomy, to the file-reach derivation (which now reports 505 / 281 / 273 / 214
   over three excluded trees), and to Tasks 2 and 3's acceptance greps by name, with the two
   two-argument factory calls it carries classified in the Files block.
8. **`templates/waymark` is generated, not edited.** TAKEN. New constraint 18 states it once, and
   Tasks 2, 3, 6, and 7 carry the one-line "regenerated, never hand-edited" entry in place of a
   template path under Modify.
9. **Twenty-four lowercase anchor fragments name renamed symbols.** TAKEN. Constraint 7 now requires
   the lowercased anchor grep of every renamed name, the count is recorded in the Reconciliation
   block, and `docs/reference/ambient.md` is named in Tasks 6 and 7's Files blocks rather than left
   to a glob that never reaches it.
10. **Task 3's Files block omits the in-tree `createNavRoutes` caller.** TAKEN (R11).
    `src/lib/sveltekit/cairn-admin.ts:116` is now named in Task 3's Files block, with the note that
    Task 2 also touches the file and the one sequential chain handles it. The two reference pages
    the report found carry no call are demoted to "the Step 1 grep decides".
11. **The ceiling has zero slack and the checkpoints sit after the heaviest tasks.** TAKEN (R13).
    Ceiling folded with executor 9; checkpoints re-placed for the fifteen-task shape at 3, 7, 12,
    and 14, so one lands immediately after the arity change, one after the widest rename sweep, one
    after the `OfficeList` removal, and one immediately before the release-readiness task.
12. **No unattended-work guard is armed.** TAKEN. Folded once with executor 10.
13. **"Thirty-two names" double counts.** TAKEN. The set is thirty throughout: the Reconciliation
    block says so explicitly, and Tasks 13 and 14 sweep thirty.
14. **The halt ledger is silent on chain D.** TAKEN. The Rollback block now states that chain D
    unblocks when Tasks 1 AND 12 have both merged, never on Task 1 alone, with the reason, and the
    hands-forward block repeats it.
15. **The taught composition diverges from the repo's own baselined exemplar.** TAKEN, at the
    altitude the report set. Task 1's decisions name the divergence, its acceptance requires the
    report to name it and to show no showcase file in the diff, and the pass-end
    `daisyui-a11y-reviewer` is pointed at it. A convergence stays a follow-up line for the file 11b
    owns, never an addition to this window.
