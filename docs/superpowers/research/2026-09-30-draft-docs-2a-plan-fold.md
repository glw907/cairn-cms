# Stage 2a plan review: fold record

**Target:** `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` at `debe7014` (484 lines).
**Reviews folded:** `2026-09-30-draft-docs-2a-plan-review-contract.md` (PC-1 to PC-13),
`-mechanics.md` (PM-1 to PM-11), `-risk.md` (PR-1 to PR-15). No owner forks were raised and none
arose in the fold.

**Verified before folding** (against the tree at `debe7014` and the dotfiles runner at HEAD):
`docs-page-chain.js:788` returns `{ pages, accepted, escalated }` with no `spent`, while
`pass-execute.js:722` returns `spent: budget.spent()`; `frictionFiled` sits only on
`DRAFT_SCHEMA` (`:149`), and the friction instruction lives in the runner's `draftPrompt`
(`:610`, which also says "Commit nothing"); `extraChecks` (`:51`) and the required
`args.worktree` (`:225`) exist; `CairnAdapter.rendering` and `.editor` are inline literals
(`src/lib/content/types.ts:249`, `:277`); all seven `restoredBy: "close"` rearms carry batch
`2b` and 23 carry `setup`; `check:close` (`package.json:83`) never calls the docs gate, and
`docs-gate.mjs:3-5` excludes `check:package` by design; `gate-tier.mjs --range` exists;
`main`'s friction log carries the three reference-claim entries at lines 206 and 207; the
`cairn-figure` skill file exists at `~/.claude/skills/cairn-figure/SKILL.md`; the spec's
"Mechanism 2" carries every release-sweep item the plan had restated.

## Dispositions

Convergent findings are folded once at the root.

| Ids | Disposition | What changed |
| --- | --- | --- |
| PC-1, PR-5 | Folded; one part refused | The runner returns `spent`, the `budget.spent()` delta across the run (the `pass-execute.js:722` precedent); task 3's dry run proves the field and records its unit, and the conductor's `/cost` delta across the run is the fallback if that unit is not total tokens. The per-page page-inputs split is dropped: with three pages in flight no source isolates one agent. Task 7 scales task 8's share by outline `factIds` and states the qualifying-page count. **Refused:** PC-1's Haiku agent summing transcript usage by label, new machinery with no published source when the one-line precedent exists. PR-5's `inFlight: 1` option is not taken, since no decision turns on the split. |
| PC-2, PC-3, PR-10 | Folded | After each run the conductor hands the records to one `cairn-implementer`, which runs the whole-tree docs gate, writes a stage record under `docs/superpowers/research/`, and commits the named files; a `diff-reviewer` reads the file set only (stage 1's batch-commit precedent). Tasks 7, 9, and 10 read the stage record. `worktree` joins the chain's arguments. |
| PC-4 | Folded, adapted to PM-6 | With page inputs reading rows live, the dry run asserts the map path, slug, and selection rule in the prompt, the FV-10 retag order in both retagging prompts, and the row counts in the record. The discriminating check moves to task 6: each page's `rowsReceived` matches the count at the pre-pilot commit. |
| PC-5 | Folded | Execution mode names one `cairn-register-editor` and one fact-read dispatch, scoped to the changed sentences, for task 7's owner fold and task 9's batch; verdicts go in the stage record and any `fix` lands before the commit. |
| PC-6 | Folded | Task 6 acceptance: each page accepted, or escalated and resolved by a re-dispatch or a recorded ruling; a re-dispatch's cost counts in the page's total. |
| PC-7 | Folded | Qualifying and the flag count only the register editor and the fact read, never the figure verifier. |
| PC-8, PM-2 | Folded | The walker's header names its roots; task 2 reports the root list and generated count before slugs are assigned, with the conductor seeing the list if the count exceeds 1,379; a negative fixture pins a `*Data` member and a component prop out of the set. |
| PC-9 | Folded | Fixtures are synthetic declaration files. Task 2's gate adds `npm test`. Task 5's gate replaces its two named unit tests with `npm test`, which runs them. Task 3's gate is the dotfiles gate (PM-7). |
| PC-10, PM-5, PR-8 | Folded | The constant is one line in the map file, and the map rule states the edit order that keeps every intermediate state green (disposal: fact, row, constant; retag: constant, row, fact). A stated rule, no tool. |
| PC-11 | Folded | A ledger row for the R10 approval and outline fold; task 2's entry condition cites it. |
| PC-12 | Folded | A Sonnet agent diffs and applies Geoff's saved version and reports; the conductor rules on generalizing notes only. |
| PC-13 | Folded | Task 5's test asserts its source exists unless marked synthetic; a runner change at task 7 takes task 3's gate and a `diff-reviewer` read; task 7's full-scope total must sit under the 20M flag; task 9 applies or refuses each finding with a reason; the S1 merge is covered by task 5's gate. |
| PM-1, PR-1 | Folded | Inline literals are keyed by the path from the nearest named type; arrays, `Record` and index values, optionality, unions, mapped types, and generic constraints are unwrapped; an unresolvable member fails the gate; a failure names the first root in `surfaceSubpaths` order. Fixtures: a member directly on inline `editor`, one behind an array element, one behind a generic constraint, and two inline literals sharing a member name. |
| PM-3 | Folded | A fact id is seeded only on re-runnable evidence (the member named in backticks and a `Source:` in the declaring type's file); everything else seeds `pending`. |
| PM-4 | Folded | A fact read that retags a mapped fact reports the row as a blocking finding, so the page escalates unless the round resolves it; task 6's resolution is a page-inputs re-run. No runner machinery. |
| PM-6 | Folded | The helper route is dropped: page inputs receives the map path, slug, `factIds`, and the selection rule, and reads its rows live; `PAGE_INPUTS_SCHEMA` gains `rowsReceived` and `rowsDisposed`; the helper and drafter definition leave task 3's Files; the fact read's `frictionFiled` gets the one copy step it needs. Task 3 keeps its `model: opus` upshift, since it still edits the runner every page runs through. |
| PM-7 | Folded | Task 3's gate is `bash ~/.dotfiles/scripts/check.sh`, with the dry-run cases in the existing outline test. |
| PM-8 | Folded | Tasks 2 to 5 run serially; the independence marking is cut. |
| PM-9 | Folded | The map rule allows a count-neutral re-point to `pending <slug>` for a page not yet drafted, with the reason in the claim inventory. |
| PM-10 | Folded | The release sweep's first window is seeded at `v0.98.0`; HISTORY records the seed. |
| PM-11, PR-9 | Folded | Duplicate `check:facts` and `check:provenance` runs are dropped from tasks 5 and 9. Task 2 adds a `check:options` script and its `check:close` entry. Task 5's gate adds `check:package`. Task 10 merges `main` before its full gate. |
| PR-2 | Folded | Task 9 restores only rearms keyed to a pilot or 2a page, never a `close` entry; task 5's `2b` retag names the seven `close` entries; task 10's `Consumers must:` line is required if `skills/` changed, and the diff-reviewer checks it. |
| PR-3 | Folded | A three-row defect-to-page table rides the runner's existing `extraChecks` on tasks 6 and 8. |
| PR-4 | Folded | A figure page's drafter prompt names the `cairn-figure` skill file; the dry run shows it. |
| PR-6 | Folded | Task 9's gate is the string `gate-tier.mjs --range` prints for its diff, and it runs `emit:template` when an emitted showcase file changes. |
| PR-7 | Folded | Task 7's relink moves into task 9: one batch, one gate, one review. |
| PR-11 | Folded | Task 9 fixes the three reference sentences, probing `auth-channel.md:38` first; the code comments stay in the log. |
| PR-12 | Folded; replacement refused | The zero-friction-means-prompt-failure rule is dropped (owed erratum below). PR-12's evidence-tied replacement is refused: PR-3's `extraChecks` already put the known defects before the fact read, and the close reconciles every entry. |
| PR-13 | Folded | The three entries are written on the branch. The `main` merge stays, since the branch needs `bd8ab1fe`'s log as its base; it is one clean merge in the same dispatch, with no cross-branch commit. |
| PR-14 | Folded | The outline header says this plan governs a rearm target; task 5 names the `setup` entries and records the interim target and the repointing page. |
| PR-15 | Folded | The allowlist prune reaches only entries whose rearm the outline keys to a pilot or 2a page. |

**Cuts beyond the findings,** to hold the line count: the gap-sweep history, the Approach, the
page-set rationale, and task 1's record are compressed; the lean guard is cited to S2 instead of
quoted; the review focus keeps three items, the rest being enforced by named tasks; task 4 cites
the spec's "Mechanism 2" for the release-sweep items instead of restating them.

## Owed errata

- **Spec** (`2026-09-30-docs-code-sync-design.md`, Acceptance, lines 281 to 284): "and zero across
  all six is read there as a prompt failure" no longer holds (PR-12). The checkpoint reports
  entries per pilot page, and the close triages them. The fold changes the plan only; the spec
  edit is owed.
- **Owed item FV-11** (`2026-09-30-docs-code-sync-fold.md:129`, not the spec): the disposal cost
  is no longer read apart from the page rate. The checkpoint reports rows received and disposed
  beside each page's total (PC-1, PR-5).

## Measures

- **Dispositions:** 39 findings in 29 rows. 39 folded, 0 refused outright, 0 owner forks. Two
  findings had a sub-proposal refused (PC-1's transcript agent, PR-12's replacement rule).
- **New mechanism folded (source and measured defect):**
  - The runner's `spent` return (PC-1, PR-5). Source: `pass-execute.js:722`. Defect: the runner's
    return at `docs-page-chain.js:788` gives the counting rule nothing to read.
  - `rowsReceived` and `rowsDisposed` on the page-inputs schema (PM-6). Source: owed item FV-11.
    Defect: no record field carries the rows.
  - `check:options` in `check:close` (PR-9, PM-11). Source: the repo's existing `check:*` pattern.
    Defect: `package.json:83` never runs the docs gate locally.
  - The post-run commit and stage record (PC-2, PC-3). Source: stage 1's batch commit
    (`2026-09-26-draft-docs-pass-0-1.md:460-463`). Defect: the runner's "Commit nothing" (`:610`)
    leaves every boundary without a commit.
- **New mechanism refused:** PC-1's per-label transcript-summing agent (no published source; the
  one-line precedent covers the need); PR-12's evidence-tied friction count (no source; PR-3 covers
  the risk). PM-6 removed a mechanism (the map rows through the outline helper).
- **Line count:** 484 before, 483 after.

## Second fold

**Input:** `2026-09-30-draft-docs-2a-plan-fold-verification.md` (FV-1 to FV-13: 4 majors, 9
minors), at `3eaa8bf9`, with the conductor's rulings on FV-1, FV-2, FV-3, FV-4, FV-8, and FV-13.

| Id | Disposition | What changed |
| --- | --- | --- |
| FV-1 | Folded | The counting rule rests on the recorded fact (`2026-09-26-draft-docs-pass-0-1.md:504-505`): `/cost` (`/usage`) is the only running total against the 25M ceiling and 20M flag; Agent usage blocks and a run's `/cost` delta are attribution only, never added. Per-page cost is the `/cost` delta across task 6's run divided by six, the `factIds` scaling for task 8 kept. Task 3 keeps `spent`, states its unit from PC-1's runtime-doc quote as a relative measure, and its acceptance shrinks to "present with a stubbed `budget`". Tasks 6 and 7 read the `/cost` delta, not `spent`. |
| FV-2 | Folded | Task 4's Files add the sync spec and the sync fold record; one outcome strikes the spec's "zero across all six is read there as a prompt failure" with a status-line note citing PR-12 and adds the FV-11 amendment line to the sync fold record. The gate names the 2a plan fold's "Owed errata"; the header says two owed items. |
| FV-3 | Conductor's; plan part folded | The R10 URL sits in the header's new entry condition and the ledger row; the entry condition absorbs the "Sequencing" owner ruling. STATUS on `main` is the conductor's. |
| FV-4 | Folded | Task 7's fold agent runs `check:docs-gate` through `cairn-run-gate` (light lane) before committing, and one `diff-reviewer` reads the fold's file set; the acceptance says gate-green, and "Checkpoints and segments" names the commit. |
| FV-5 | Folded | Review focus reworded: a sibling red that still occurs costs a redraft round, noted in the stage record. |
| FV-6 | Folded | Task 9's `<base>` is task 8's post-run commit from the ledger. |
| FV-7 | Folded | Top-level `track: "extend"` dropped from the chain call. |
| FV-8 | Folded | Task 7 compares the full-scope total with the flag; at or over it, the combined question carries it. |
| FV-9 | Folded | Task 2 adds a fixture reached only through `Partial<Named>` or `Record<string, Named>`. |
| FV-10 | Folded | The post-run implementer computes each pilot page's selection count at the pre-pilot commit and writes it beside `rowsReceived`. |
| FV-11 | Folded | Tasks 7 and 9 acceptance check the scoped-review verdicts in the stage record, any `fix` applied before the commit. |
| FV-12 | Folded here | The third citation, the step each mechanism rides: `spent` rides the runner's return (`docs-page-chain.js:788`); `rowsReceived` and `rowsDisposed` ride the page-inputs schema (`PAGE_INPUTS_SCHEMA`); `check:options` rides `check:close` (`package.json:83`); the post-run commit and stage record ride the conductor's post-run dispatch after each chain run. |
| FV-13 | Folded | The gap-sweep section is cut to one sentence in the Approach citing its record (its counts live in the record and the ledger's 3.31M row; task 4 carries the standing-step erratum; the known-defects table keeps `bd8ab1fe`). Review focus keeps item 2 only; task 2's fixtures and the fact read's `factIds` check and task 9's `overlap` class already enforce 1 and 3. |

**Measures:** 13 findings, 12 folded in the plan or this record, 1 (FV-3) the conductor's with its
plan part folded. New mechanism: none. Line count: 483 before, 481 after.
