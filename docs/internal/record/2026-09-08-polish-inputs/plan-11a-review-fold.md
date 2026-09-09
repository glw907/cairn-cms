# Polish-11a plan review: the fold record

Disposition for every finding in the three adversarial plan reviews of
`docs/superpowers/plans/2026-09-08-polish-11a-pass.md`, folded 2026-09-08. Lenses:
`plan-11a-review-coverage.md` (22 findings), `plan-11a-review-executor.md` (17),
`plan-11a-review-sequencing.md` (12). Fifty-one findings: 51 taken, 0 declined, and five of the
taken folded once across lenses rather than twice, recorded as superseded on the duplicate.

The conductor's ten rulings (R1 to R10) settled the forks the reviews raised; where a finding lands
under a ruling, the line names it.

## Coverage and grounding lens

| # | Disposition | Where it landed |
|---|---|---|
| 1 | taken (R3) | Task 4's measured media partition table: `originRank` and `branchKey` to `-media-delete.ts` (Task 5), `distinctEntryCount` to `-media-shared.ts`. Every helper's user lines are stated in the table. Folds once with sequencing 1. |
| 2 | taken (R2) | The `logCommitFailed` direct import is Task 4's fourth deliverable, on `content-routes-media-ingest.ts`, with its own acceptance grep; Task 5 carries only the measured-zero report line. |
| 3 | taken (R4) | Task 3's acceptance grep is `grep -rnE "(^\|[^A-Za-z])DeleteRefusal" src` with the four surviving comment sites enumerated. Folds once with executor 2 and sequencing 4. |
| 4 | taken (R5) | Global constraint 11 (the ledger annotation rule with the internals-B amendment format cited at `engine-rulings.md:726` and `:1751`), per-task Step blocks in Tasks 1, 3, 4, 5, 6, and Task 13's verification grep. |
| 5 | taken (R5) | `audit-sveltekit-bulkdeleteskip` is in Task 6's Step 5 annotation list, and Task 6's acceptance grep covers `docs`. |
| 6 | taken | The Reconciliation counts block: seven code references beyond the declaration, plus the ledger row. |
| 7 | taken | Task 7's Decisions: the doc edit is conditional on the string verdict, and `:105` and `:119` are ruled unchanged with the reason. The acceptance names both halves. |
| 8 | taken | Task 7's Decisions: eleven copy lines change, `:11` and `:16` change as noun-sense comments, `:46` is verb sense. The acceptance grep is satisfiable as written. |
| 9 | taken (R8) | Ceiling 6.5M with the fourteen-gate-bearing-unit arithmetic. Folds once with sequencing 9. |
| 10 | taken | Task 13's Decisions: the filing's trigger is the unparsed comment population; the zero-warning measurement is stated. |
| 11 | taken | Global constraint 10 scopes the full five-field block to rows the pass WRITES; every annotation acceptance requires only `check:rulings-format` green and no field the row did not carry. |
| 12 | taken | `MediaBulkFailure` is in `-media-delete.ts`'s declared list (Task 5) and in the partition table; the `MediaLibraryEntry` re-export line's new host is named as `-media-library.ts` in Task 4. Folds once with sequencing 6. |
| 13 | taken | `media-library-helpers.ts` and `MediaBulkDeleteDialog.svelte` are in Task 4's Files block. Folds once with sequencing 5. |
| 14 | taken | Eight `EntryData` members, in the Reconciliation counts block and Task 11. |
| 15 | taken | The Ruled inputs block states which rule wins: the spec's fifteen primitives are the shared population, the two-or-more rule governs only what the spec does not enumerate. The reason is stated, and the nine single-cluster members are named. |
| 16 | taken | Eight `MediaDeleteRefusal` naming sites, in the Reconciliation counts block and Task 5. |
| 17 | taken | Eleven `VocabularyAdmin.svelte` copy lines, in the counts block and Task 7. |
| 18 | taken | `scripts/checks/check-surface-leaks.json:127,:259` in Task 4's Files and Step 6; `docs/internal/admin-smoke-test.md:128` in Task 6's Files and Step 3. |
| 19 | taken | The new "Corrections this plan makes to the spec, knowingly" block, first bullet. |
| 20 | taken | Same block, second bullet, with the `MediaBulkDeleteDialog.svelte:87` evidence for why the type cannot be inlined; Task 6's Decisions repeats it. |
| 21 | taken | `docs/extend/migration-notes.md` is dropped from Task 13 and from the ritual, with the reason in the Ruled inputs block; ritual item 9 states the file is untouched. |
| 22 | taken | The Reconciliation anchor table: the eslint block comment is `:74-78`, and the initiative design's clauses are `:138-140` and `:141-144`. |

## Executor and plannability lens

| # | Disposition | Where it landed |
|---|---|---|
| 1 | taken (R1) | The paint protocol adopted verbatim from B2 into a section of its own, rides in every task's `criteria`, and Task 7 Step 6 carries the local regeneration by file path so its own gate can be green. Folds once with sequencing 2. |
| 2 | taken (R4) | Task 3 gains `sveltekit-barrel-prune.test.ts` and the `RETIRED_CORE_ARMS` rename with the vacuous-gate reasoning; the four surviving comments are enumerated and ruled unchanged, and `content-routes-delete.test.ts` stays out of the diff because it is the task's own move-safety evidence. Folds once with coverage 3 and sequencing 4. |
| 3 | taken (R6) | Task 9's Decisions: the `~/Projects/cairn-scratch/2026-08-16-capture/` harness, its two modes, the `link:consumer` repoint, and the reason a fresh scaffold produces different bytes. |
| 4 | taken (R2) | The old Task 5 splits into Tasks 5 and 6; later tasks renumbered; the header states the three-way split of the spec's task 4. |
| 5 | taken | Task 7's ten-string verdict table rules `nav-routes.ts:155` and `content-routes-settings.ts:156` as changes, with the reason, and the remaining eight as keeps, each with its reason. |
| 6 | taken | Task 7's line categories and the satisfiable acceptance grep. Folds with coverage 8. |
| 7 | taken | The "Pre-dispatch, before run one" block: commit the plan, create the worktree, from-scratch showcase install, amend the spec line. The args `notes` no longer assert the install is already done. |
| 8 | taken | Task 1 Step 5 names the four read-cluster importers to repoint and the five sites deferred to Task 3, and the report criterion is found / changed / deferred. |
| 9 | taken | Task 4 Step 2 rules that the `content-routes-shared.ts:9` note stays true while the media file exists, so Task 4 leaves it alone and Task 6 owns it. The file is not in Task 4's Files block, by design. |
| 10 | taken | `sveltekit-barrel-prune.test.ts:26-28` is in Task 6's Files and Step 3; the plan and the args now carry the same repoint list. |
| 11 | taken (R6) | Task 9's Decisions: `source ~/.local/secrets` explicitly, `CLOUDFLARE_ACCOUNT_ID` from `CLAUDE.md` (`120c269ad6d3dfbe6d63a0bb53758ca0`), both exported uncaptured, never printed. |
| 12 | taken | Task 7's criterion becomes "the report's verdicts match the plan's table"; the other four report-graded criteria stay, since the workflow passes the implementer JSON to the reviewer verbatim. |
| 13 | taken | Task 7 Step 2 drops the OR: the vocabulary assertions are the failing test, and the page edit is gate-driven follow-up in Step 5. |
| 14 | taken | Task 9's acceptance replaces the whole-file-replacement claim with the capture command, the working directory, the per-fixture sha256, and the no-byte-edited statement. |
| 15 | taken | Task 11's Interfaces states that no reference page is touched and why, with a reference page in the diff as a finding. |
| 16 | taken | Global constraint 9 pastes the exact two footer lines; the args `notes` carry them verbatim. |
| 17 | taken | Task 2's Interfaces states the measured expectation (the write range names none of the four shared helpers) and makes the report name what the compiler actually required. |

## Sequencing and risk lens

| # | Disposition | Where it landed |
|---|---|---|
| 1 | superseded by coverage 1 | Same correction, same evidence; folded once into Task 4's partition table and Global constraint 7's no-sibling-imports rule, which this finding's correction asked for as an acceptance. |
| 2 | superseded by executor 1 | Same correction; folded once into the paint protocol section and Task 7 Step 6. |
| 3 | taken (R1) | The Execution block states the two-run cut, the `gh workflow run` command, the pull, the CI diff read, and that run two's first act is re-anchoring (Task 8 Step 1). |
| 4 | superseded by executor 2 | Same file and same literal; folded once into Task 3. |
| 5 | superseded by coverage 13 | Same file; folded once into Task 4's Files block, and removed from Task 5's, which no longer changes it. |
| 6 | superseded by coverage 12 | Same type; folded once into Task 5's declared list and the partition table. |
| 7 | taken (R9) | The semantic column gains rows for `engine-rulings.md` (B2 may insert rows, so tasks locate by slug, never by this plan's line numbers), `docs/STATUS.md` (never a task deliverable), and the initiative design spec (B2's Task 8 rewrites it, so the executor re-verifies both citations). The rows the renames invalidate are covered by Global constraint 11. |
| 8 | taken | `content-routes-context.ts:4` is in Task 3's and Task 6's Files blocks; both tasks add the `-entry\.ts` and `-media\.ts` shorthand greps to their acceptance. |
| 9 | superseded by coverage 9 for the ceiling; its citation half taken | The "internals about 400K" citation is removed and replaced with internals-B's actual record (ceiling 8M over fourteen tasks, spend unrecorded, and why that makes it the weakest input), and the four-for-four overrun history is stated with the 80-percent trigger. |
| 10 | taken (R8) | Checkpoints at 3, 6, 9, 12, with 6 landing immediately after the media monolith's retirement, the riskiest task, and the run cut after Task 7 named as a fifth STATUS write. |
| 11 | taken | Four new hand-forward bullets: the `check:comments` constraint 11b inherits, the module map with its export lists, the two gate literals polish-C must update again, and the `src/lib/components/*` files 11a reopens with `ShareLinkPanel.svelte` and `MarkdownEditor.svelte` called out. The spec's disjointness sentence is corrected in the plan's own "Corrections" block rather than in the spec, because R8 limits the spec edit to one line. |
| 12 | taken, with one half corrected on measurement | The Rollback and halt semantics section is new, with the per-boundary state list. The stale-comment half is corrected: the five media suites' comments read "still exported at its declaring module" and name no path, so an import-path change alone keeps them true; only `sveltekit-barrel-prune.test.ts:26-28` names the path, and it is in Task 6's Files. `admin-smoke-test.md:128` and `check-surface-leaks.json:127,:259` are folded under coverage 18. The arithmetic slip at the old `Plan:28` ("the four move-heavy split tasks (1, 2, 3, 4, 5)") is gone with the header rewrite. |

## Conductor rulings, and where each is visible

- **R1** the paint protocol: the "## The paint protocol" section, Global constraint 13, the
  Execution block's two-run cut, Task 7 Steps 1, 6, and 7.
- **R2** the Task 5 split and the `logCommitFailed` routing: Tasks 5 and 6, Task 4's fourth
  deliverable.
- **R3** the corrected media partition: Task 4's measured partition table, with every helper's user
  lines.
- **R4** Task 3's grep: Task 3's Decisions and acceptance.
- **R5** the ledger annotations: Global constraint 11 and each split task's annotation step, plus
  Task 13 Step 4.
- **R6** the doctor harness: Task 9's Decisions and Steps.
- **R7** the gate: the Gate section's package-once string, the wrapper explanation, and the
  16-to-28-minute estimate with its basis.
- **R8** the ceiling and checkpoints: the header; the spec's Sequencing line amended to 6.5M.
- **R9** the B2 collision: the semantic column's three new rows.
- **R10** the measurement corrections: the Reconciliation counts block and the per-task Decisions.

## What the fold could not make consistent

- **R1 names the product-copy task "Task 6" and R2 renumbers it to Task 7.** R1 was written against
  the pre-split numbering. The intent is unambiguous, so the cut falls immediately after the paint
  task: run one is Tasks 1 to 7, run two is Tasks 8 to 13.
- **The capture tool cannot see the vocabulary screen.**
  `examples/showcase/scripts/capture-surfaces.mjs:59-109` carries `home`, `article`, `styleguide`,
  `archive2`, `error404`, and `signups`. Task 7's capture pair therefore bounds the change by
  proving those six stay at AE 0, and the two vocabulary tiles are evidenced by the visual suite's
  PRODUCED `MOVED BASELINES:` list plus the regenerated `-linux.png` files, which the `READ ME:`
  line names. The plan says so in the paint protocol section and in Task 7.
