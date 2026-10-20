# Pass 1b plan review: mechanics and feasibility

**Target:** `docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md` at `dc37e38b`. **Lens:** mechanics
and feasibility only. **Reviewer:** `claude-opus-5-5`, 2026-09-24. Every claim below was checked
against source or a read-only probe (probes under `/tmp/claude-1000/probe/`). Findings are ranked
by consequence. A finding marked OWNER FORK needs Geoff's call, and each one carries a
recommendation.

**Counts:** 4 blockers, 7 majors, 12 minors.

## What holds

- **Pre-flight lines.** All six check out at HEAD. `REPORT_SCHEMA` is `lib/runner.ts:44-61`.
  `checks: []` is `runner.ts:126`. `verifyQuoteAgainst` is `lib/verify.ts:68-93`, with the one-line
  tolerance at `:85-89` and `SPAN_LINES = 5` at `:12`. The `.git` exclusion is
  `lib/prepare-class.ts:414`, and it is enforced at `:486` and `:573`. The `HEAD` pin is
  `prepare-validation.ts:51`, and the throw is `:84`. `CONTRACT_PAGES` is at
  `prepare-baseline.ts:45-62`. `validateClass` rejects unknown fields at `lib/class-schema.ts:90`.
  Both saved reports exist: 39 jobs in the first and 8 in the rerun.
- **Gate.** The filter selects the 17 `docs-readers-*` unit files, because the `unit` project
  includes `src/tests/unit/**/*.test.ts` (`vitest.config.ts:38-44`). `check:comments` already
  lints `scripts/docs-readers` (`scripts/checks/check-comments.sh:10`).
- **Round 0 can load pass 1's reports.** Each job carries `quotes[]` with verification (`ok`,
  `startLine`, `endLine`), `stalls`, `assumed`, `denials`, and `pagesRead`. The prepared trees pass 1
  ran on still sit in `~/.cache/docs-readers/prepared/validation/` (4.1G). The docs-set jobs'
  control pages are byte-identical to the current tree (probe: `cmp` over every page).
- **Task 4's numbers are reproducible.** A beta-binomial probe reproduces the spec exactly. The fit
  gives 0.295 and 0.715. The 31-of-42 table matches to two decimals. The smallest thresholds are 24
  at 32, 25 at 33, none at 34, 26 at 35, 27 at 36, and 31 at 42. The floors are 4/7, 9/14, 4/6,
  3/5, 9/13, and 8/12. Task 4's acceptance can be met.
- **Task 4 editing `lib/runner.ts` after Task 1 merges is safe.** Task 3 does not touch
  `runner.ts`, so the 3/4 lanes do not contend there. The contention is `lib/types.ts` (minor m2).

## Blockers

### B1. The 10M ceiling cannot hold the plan. Judges as Agent dispatches cost several times the budget. OWNER FORK.

- **Where:** plan header, `:28`; spec "Budget", `:436-468`; plan Tasks 5, 6, 12.
- **Defect.** The spec budgets the catch judge at about 12k and the adjudicator at about 20k per
  run. An Agent dispatch cannot run that cheaply. Its first turn caches the system prompt, both
  `CLAUDE.md` files, and the tool and skill listings. This session's first turn wrote 38,634
  cache-creation tokens. The smallest `diff-reviewer` dispatch in pass 1 counted 44k over 7 turns.
  The plan also calls for roughly 100 to 117 judge dispatches:
  - round 0: 24 or more;
  - rounds 1 and 2: 24;
  - test catch calls: 18 to 36;
  - adjudicator reads: 30;
  - held-out reads: 3.

  At 50k to 70k each, that is 5M to 8M, against the spec's roughly 2M.

  Several costs are not in the spec's table at all:
  - the conductor's main loop;
  - three pre-flights;
  - six `diff-reviewer` reads outside the chains;
  - the rubric author, the tuner, and the record author;
  - the close fold agent;
  - four code-simplifier passes.

**Pass 1, measured under this counting rule.** These figures come from the session transcripts
`7f4d724e…jsonl` and its `subagents/`, deduplicated by message id, counting input, output, and
cache creation:

| Item | Counted |
| --- | --- |
| Conductor main loop | 2.32M |
| Subagents | 13.64M |
| Reader ledger | about 2.7M |
| **Total** | **about 18.7M** |

The recorded figure was "about 9M". The build chains counted 0.57M (Task 1), 1.54M (Task 2),
0.89M (Task 3), about 2.99M (Task 4 prep, with its fix and review), and 0.57M (Task 11 prep). The
spec says pass 1's subagent figures "overstate under the counting rule". That holds for Tasks 1 and
3. It does not hold for Task 2 (804k recorded, 1.34M counted) or Task 4 prep.

**Estimate for this plan, counted:**

| Item | Estimate |
| --- | --- |
| Four build chains at 0.9M to 1.3M each | 3.6M to 5.2M |
| Code-simplifier passes | 0.3M |
| Conductor | 1.5M to 2.5M |
| Pre-flights | 0.3M to 0.45M |
| Out-of-chain reviews | 0.6M to 1.2M |
| Authoring agents (spec's 1.05M plus about 1.25M the spec omits) | about 2.3M |
| Reader runs (spec) | 4.19M |
| Judges as Agent dispatches | 5M to 8M |
| **Total before cuts** | **about 18M to 24M** |

With the judges run headless (fold below), the judges drop to about 1.2M to 2.3M. The total before
cuts is then about 14M to 18M. The three cuts save at most about 1.75M, so the total after cuts is
about 12M to 16.5M. The spec's four-task split adds one chain, about 0.6M to 1.5M, over its three.

**The flag cannot be observed as written.** The Agent tool's reported figure is not the counted
total. The plan gives no way to apply the counting rule to subagents, yet every cut keys off the 8M
flag.

**Proposed fold:**
1. **Run both judges and the agreement read headless, through the runner, as judge classes.**
   - Each judge gets a Read-only class over a prepared packet directory. It gets the published
     tree and code at the pinned commit for the adjudicator.
   - The rulings come back through `--json-schema`, so they are structured.
   - Each judge's tokens land in the runner's ledger.
   - The system prompt is minimal, with no `CLAUDE.md`.
   - Blindness then holds by construction: the packet simply lacks the model, the run id, and the
     reader prompt.

   This also answers M1. Build it in Task 3 (packets and rulings schema) and Task 4 (a runner
   `--judge` mode or judge class files).
2. **Add a ledger script** that sums `usage` from the session's own `.jsonl` and its `subagents/`
   files by the counting rule. The conductor checks the flag with it at every checkpoint.
3. **OWNER FORK, the ceiling.**
   - (a) Raise it to 15M with the flag at 12M, keep the spec's cut order, and correct pass 1's
     recorded spend to about 18.7M in HISTORY.
   - (b) Keep 10M and pre-register cuts 1 to 3 now: no round 2, no Sonnet arm, no transfer
     planting. This still lands near 11M to 13M, over the ceiling.
   - (c) Keep 10M and cut the transfer set entirely, including its mapping.

   **Recommendation: (a) together with fold 1.** Option (b) cannot fit, and (c) gives up the only
   out-of-sample precision.

### B2. `score.ts` rejects unstamped reports, but Tasks 5 and 6 score unstamped reports through it

- **Where:** plan Task 3 `:182-183`, against Task 5 `:235` and Task 6 `:249-250`; spec `:147`.
- **Defect.** The stamp exists only for gated batches (Task 4). Pass 1's saved reports carry no
  stamp, and neither do the tuning rounds, which run before the freeze. As specified, round 0 and
  tuning cannot run through "Task 3's scorer". An implementer who honors Task 3's acceptance ("an
  unstamped report is rejected") builds a scorer that Task 5 cannot use.
- **Proposed fold.** Give `score.ts` two modes.
  - **`--mode development`** accepts unstamped reports. It computes only the development measures:
    the proxy map (M2), on-map catches, and false findings per control run.
  - **`--mode gated`** rejects an unstamped report, naming its path, and computes the bars.
  - Acceptance: one fixture per mode.

### B3. Four score-affecting inputs the freeze must hash are produced by no task

- **Where:** spec "Freeze" `:136-138` and "Planting" `:226-246`; plan Task 8 `:277-279` and Task 10
  `:300-307`.
- **Defect.** Four inputs have no owner:
  - the miner, planter, and plant-check prompts;
  - the plant-type definitions;
  - the miner's exclusion script;
  - the validity script.

  None of Tasks 1 to 4 builds the two scripts. No dispatch before Task 8 authors the prompts. The
  conductor may not write a prompt (`:72-73`), and the Task 5 rubric author has read the development
  set, so it cannot author the planter's prompt either. The exclusion script is not small. It must
  carry each development item's line span to a common commit before comparing, which is diff-based
  line mapping, and it needs the development items' locations in machine-readable form. As planned,
  Task 8 freezes without these inputs, and Task 10 then writes frozen-class inputs after the freeze.
  By the spec's own rule, that burns the plants.
- **Proposed fold.**
  - Add `exclude-candidates.ts` and `plant-validity.ts` to Task 3, with fixtures that include a span
    moved by an intervening commit. That makes Task 3 six scripts, so consider splitting it (see
    Budget).
  - Have the Task 7 blind author, or a second blind dispatch in Task 7, write the planter, miner,
    and plant-check prompts. The plant-type definitions are copied from the spec's own list
    (`:219-222`).
  - Add all of them to Task 8's acceptance.

### B4. No task builds the spec's automatic rerun

- **Where:** spec `:152-156` ("Reruns are the runner's alone … exactly one automatic rerun. Every
  attempt stays in the results"); `lib/runner.ts:234-278`.
- **Defect.** `runBatch` runs each job once. Pass 1 reran by hand from a separate
  `batches/validation-rerun.json`, with the conductor choosing the jobs, which is exactly what the
  spec forbids. Tasks 9 and 11 require that "reruns follow the spec's rule". If this surfaces at
  Task 9, the runner changes after the freeze, which burns the plants.
- **Proposed fold.** Put this in Task 4, which already edits `runner.ts`.
  - An unverified, aborted-by-timeout, crashed, or no-report job gets one immediate rerun.
  - Both attempts land in the report under an `attempts[]` or `attempt` field.
  - The scorer reads the final attempt.

  Acceptance: a fixture executor that fails once shows two attempts. One that fails twice shows two
  attempts and a final failure. A batch-stopping failure (`auth`, `rateLimit`, `budget`) is never
  retried.

## Majors

### M1. Judge inputs and rulings have no plumbing

- **Where:** plan Task 3 `:184-187`, Task 5, and Task 12; spec `:256-268`.
- **Defect.** `score.ts` reads "the judges' rulings files". Nothing defines their shape, their item
  ids, or how a blinded ruling joins back to its run. Nothing builds the blinded packets either: the
  run's catch fields without the model or run id, plus the plant entries, the planted page, and the
  job text. The conductor cannot hand-build about 100 packets, both because it stays thin and
  because hand assembly is where blindness leaks.
- **Proposed fold.** Add `judge-packets.ts` to Task 3.
  - It gives each item a stable id (`<runId>/<jobId>/<field>/<index>`).
  - The packet carries only an opaque packet id. A key file, never shown to a judge, maps it back.
  - A JSON schema defines catch rulings (caught or missed per plant) and adjudications (item class,
    subject group, real, false, or harness).
  - It draws the agreement sample by the spec's `sha256` ordering.

  With B1's fold, the schema is the judge class's `--json-schema`.

### M2. Round 0's proxy map is not in any task

- **Where:** spec `:109-115`; plan Task 3's `path-map.ts` `:174-178`; Tasks 5 and 6.
- **Defect.** `path-map.ts` builds the `steps[]` two-of-three map. Tuning's development recall uses
  a different map. A section is on it when any verified quote, from any report field, of any
  verified Opus control run of that job in pass 1 lands inside it. Rounds 0, 1, and 2 all use this
  map. Round 0 also needs pass 1's 17 plant locations in machine-readable form, and today they exist
  only in the markdown plant record.
- **Proposed fold.** Give `path-map.ts` a `--proxy` mode. Its fixtures: a single quote from one
  run puts a section on the map, and a quote from a Sonnet run does not. Sections are computed on
  pass 1's saved control trees. The Task 5 rubric author also emits `dev-plants.json` (page, line,
  and id per plant) beside the criteria.

### M3. The blind planter cannot write the held-out criteria

- **Where:** plan Task 10 `:305-306`, against the blindness rule `:67-71`; spec `:240-242`.
- **Defect.** The nine held-out defects are pass A's ground truth (`0e7f4eb9`), a development record
  the planter must never see.
- **Proposed fold.** The Task 5 rubric author writes the held-out criteria and near misses beside
  pass 1's 17. It has read the development set and is not blind. The criteria are committed and
  enter the freeze.

### M4. The repository export ships the reader harness's tests, a known harness artifact that also leaks plants

- **Where:** `lib/prepare-class.ts:414`. `REPOSITORY_EXCLUDED_PATHS` drops `scripts/docs-readers`
  but not `src/tests/unit/docs-readers-*.test.ts`, which are 17 tracked files.
- **Defect.**
  - Three of those tests name planted defects: podman, prepare-class, and prepare-validation.
  - Task 1 adds a development-set subject fixture there, and Tasks 3 and 4 add scoring fixtures.
  - Pass 1's core-developer runs ran these very suites. The denials include
    `npx vitest run --project unit src/tests/unit/docs-readers-rot.test.ts`, whose description
    reads "Run one failing docs-readers suite", and a run that asks "why a docs-readers suite has 0
    tests". The suites fail because their sources are excluded, which is the spec's named "dropped
    `scripts/docs-readers/`" artifact.

  The spec drops `HISTORY.md`, `STATUS.md`, and `ROADMAP.md` because "each tells a reader that
  plants exist". These tests do the same.
- **Proposed fold.** This is a conductor ruling under the delegated methodology, recorded in the
  ledger: add `src/tests/unit/docs-readers-*` to the gated and planter exports' exclusions. The path
  enters each job's absent list automatically. Task 2's acceptance grows by one line: no
  `docs-readers` test file in a repository export.

### M5. Page commits are pinned only for the scripter

- **Where:** `prepare-baseline.ts:143` (`commit: 'HEAD'` for the core-developer);
  `lib/prepare-class.ts:41-45`. `copyDocsSet` copies from the working tree, which covers the
  docs-only, docs-and-binary, and docs-and-site jobs. The plan's Task 2 Files and acceptance are at
  `:151` and `:162`.
- **Defect.** Spec `:141` requires "the pinned page commit for every job … never `HEAD`". Task 2's
  Files omit `prepare-baseline.ts`, and its one test covers only the scripter. Four of six jobs
  would enter the freeze unpinned. A working-tree copy also cannot be reproduced from the manifest.
- **Proposed fold.**
  - Add `prepare-baseline.ts` to Task 2's Files.
  - Export every docs set through `git archive` at a named commit.
  - Acceptance: a test fails on a `HEAD` pin or a working-tree source for any of the six jobs.

### M6. Nothing can prepare the transfer jobs' trees

- **Where:** `prepare-validation.ts:208-214`. `STEPS` hard-codes the six pass 1 jobs. Plan Task 8
  `:277`.
- **Defect.** The four transfer jobs need control trees in all four classes: a scaffolded site for
  docs-and-site, the scratch site for docs-and-binary, and an export for repository. Their docs
  sets exist only after Task 7. Task 8 is conductor-run with no implementer chain, so writing
  preparation code there breaks the thin-conductor rule and sits on the freeze's critical path.
- **Proposed fold.**
  - Task 2 builds a preparer driven by a job spec: class, docs set, commit, and plant root. It
    replaces the hard-coded steps, and one entry point serves the development, test, and transfer
    trees.
  - Acceptance: a fixture job of each class prepares from a spec file alone.

### M7. Task 7's read-pages list cannot come from the reports alone, and the admin pool is thin

- **Where:** `lib/transcript.ts:388-409`. `derivePagesRead` counts only pages in the job's
  `docsSet`. Plan Task 7 `:265-271`.
- **Defect.** Core-developer runs see the whole repository, but their `docsSet` holds 4 pages. A page
  they open outside it never appears in `pagesRead`. Pass 1's transcripts show `README.md` and
  `CLAUDE.md` opened this way.

  Probe results:
  - The development docs sets cover 41 of the 84 published pages.
  - The pages outside them are admin 2 of 9 (`create-your-site.md`, `what-to-run-and-when.md`),
    editors 7 of 8, extend 18 of 33, and reference 22 of 30.

  A docs-and-binary transfer job therefore has two admin pages to work with. Pass 1 also derived
  each docs set as a page plus every page it links, and that closure will pull read pages back in.
  The plan does not say whether "the job's pages" means its primary pages or its whole docs set.
- **Proposed fold.**
  - Specify the script: the union of every development and tuning docs set, plus pages derived from
    the saved transcripts with the docs set widened to all published pages.
  - Define disjointness over the job's whole docs set. A linked page that was read is left out, and
    it enters the absent list.
  - Put the script in Task 3, or make it a one-file addition to Task 2.

## Minors

1. **m1. Task 1 Files omit `lib/transcript.ts`.** `readerReport` (`:638-650`) whitelists the
   report's fields and returns undefined when a list is missing. Carrying `steps[]` and
   `diverged[]`, and parsing entries as objects, happens there.
2. **m2. `lib/types.ts` contention.** Task 2 needs `Job.absent` (`types.ts:23-32`, parsed in
   `batch.ts:11`) while Task 1 edits `ReaderReport` and `JobReport`. Tasks 3 and 4 meet on the
   `freeze` field. Pin ownership at dispatch:
   - Task 1 owns the report types, and Task 2 adds only `Job` fields.
   - Task 4 owns `JobReport.freeze` and `Batch.gated`.
   - Task 3 reads report JSON through its own narrow parser.
3. **m3. Task 4's gated notion needs more files.** Task 4 must add the notion of a gated batch:
   `BATCH_FIELDS` (`batch.ts:10`) rejects an unknown `gated` key. Verification needs the repository
   root, the image digest, and the CLI version, and those live in `run.ts` `setUpRun` (`:20-48`),
   not in `runBatch`. Add `lib/batch.ts`, `lib/types.ts`, and `run.ts` to Task 4's Files, and put
   the refusal in `runBatchFile` before any container starts.
4. **m4. The light gate does not type-check.** `tsconfig.json` includes `src/tests/**/*.ts`, which
   imports the scripts. Changing `stalls` from `string[]` to objects passes vitest and fails only at
   the close's heavy gate. Add `npm run check` to each chain's gate. It launches no browser, so it
   stays in the light lane.
5. **m5. Downstream break.** `~/.claude/workflows/docs-page-chain-v2.js:389-390` types `stalls` and
   `assumed` as string arrays, and it never reads `diverged[]`. File this as a pass 2a carry-forward
   at Task 13, or have the runner keep a string projection.
6. **m6. Denial excerpts are truncated.** `excerpt` (`transcript.ts:474-477`) cuts at 400
   characters and appends `...`, which breaks `JSON.parse` for long commands. The harness filter
   needs a tolerant parse, plus a truncated-excerpt fixture.
7. **m7. Protect pass 1's trees.** Task 2's live preparation writes into
   `prepared/validation/` (`prepare-validation.ts:28`), which holds pass 1's trees for round 0. Send
   the live check to a scratch root, or snapshot first. Pin the scripter's commit to the one pass 1
   validation ran on, so pass 1's whole-file overlays still differ only at their plants.
8. **m8. Pin the order of timestamps and commit.** Pin the order as overlay, then normalize every
   file, then build the index and commit. The index records ctime, and `utimes` itself updates
   ctime. The per-run copies at `lib/podman.ts:375`, `:386`, and `:436` reset mtimes anyway, so test
   the timestamps inside the container, not in the prepared tree.
9. **m9. Task 13's "replays" is ambiguous.** Define it as pass 1's Bar 5 meant it: both batch files
   parse, every prepared directory exists, and `freeze.ts --verify` passes. It is not a live rerun,
   which would cost 1.6M or more unbudgeted.
10. **m10. Round 0 inputs.** The absent lists for pass 1 jobs come from Task 2's derivation over
    pass 1's builders, including `.git`. Say whether development precision counts Opus control runs
    only; pass 1 ran two Opus and one Sonnet per job.
11. **m11. `path-map.ts` acceptance gaps.** Its acceptance should name two things:
    - A capacity function: at most two plants per section, at least 10 lines apart, at most four
      per page. The thin-map decision depends on it.
    - A 40-line narrowing that outputs line ranges, not sections.
12. **m12. Resolved model ids.** `StreamEvent` (`types.ts:74-94`) does not capture the init event's
    `model`, so `freeze.ts` has no source for "model ids as the API resolves them". Pin a probe.
    Likewise pin the "rescore path" Task 1's acceptance cites: a shared loader in `lib/` that turns
    old string entries into `{ text, blockedBy: null }`.

## Sequence buildability

With the folds, every mechanism exists before the step that needs it. Without them, the gaps land
here:

| Step | Needs | Built today |
| --- | --- | --- |
| Task 5 | Development-mode scorer (B2), proxy map (M2), judge packets and rulings (M1) | none |
| Task 7 | Read-pages script (M7) | none |
| Task 8 | Transfer preparer (M6); the prompts and scripts to freeze (B3) | none |
| Task 9 | Automatic rerun (B4) | none; building it after the freeze burns the plants |
| Task 10 | Held-out criteria (M3) | assigned to an agent that cannot see its inputs |

## Budget note on the four-task split

The added scope suggests reshaping the build segment rather than packing it into Tasks 3 and 4.
The additions are the rerun, packets, proxy map, exclusion and validity scripts, the generic
preparer, and the read-pages script. Task 3 would carry six scripts. Keep Task 4 on the runner:
freeze, stamp, gated refusal, rerun, and judge mode. Split Task 3 into 3a (path map, proxy map,
validity) and 3b (score, harness filter, packets, exclusion). That makes five chains. The split
buys smaller diffs for `diff-reviewer`, at about one more chain's cost (0.6M to 1.5M), which the
B1 ceiling fork has to absorb.
