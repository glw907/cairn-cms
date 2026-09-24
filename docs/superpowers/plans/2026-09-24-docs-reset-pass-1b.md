# Docs reset pass 1b: the validation redesign

> **For agentic workers:** fourteen tasks (0 to 13) in four segments. Tasks 1 to 4 are
> implementer chains: `cairn-implementer` (`sonnet`, `high`) implements test-first, the task's gate
> runs inside the chain through `cairn-run-gate`, and `diff-reviewer` (`claude-opus-5-5`, `high`)
> reads the diff against the task's acceptance criteria. Tasks 0 and 5 to 13 are conductor-run:
> the conductor dispatches the named agents and the reader runner, and reads their reports, never
> diffs, pages, transcripts, or logs. **Execution mode:** per-task Agent chains (four chain tasks,
> below the workflow threshold; pass 1's segments ran this way after the auto-mode classifier
> refused an edited `pass-execute.js`). Tasks 1 and 2 run in parallel lanes; Tasks 3 and 4 run in
> parallel lanes after both merge.
>
> **Plan author:** `claude-opus-5-5` at `high` (Geoff, 2026-09-24). The close counts this plan's
> planning misses.

**Date:** 2026-09-24.

**Goal:** run the pre-registered validation of the reader instrument that
[`2026-09-24-docs-reset-pass-1b-validation-design.md`](../specs/2026-09-24-docs-reset-pass-1b-validation-design.md)
specifies, and record a per-class verdict pass 2a can rely on. The spec is the contract: its bars,
scoring rules, sequence, freeze, and cuts are fixed. Where this plan and the spec disagree, the spec
wins; stop and report.

**Spec:** the pass 1b spec above, read in full by every executor before its task. The parent spec's
"Amendments from pass 1b" section and the fold record
(`docs/superpowers/research/2026-09-24-pass-1b-spec-fold.md`) carry the rulings behind it.

**Token ceiling:** 10M, flag at 8M (owner ruling O1), unless the plan gate rules otherwise.
**Counting rule:** input, output, and cache-creation tokens count; cache reads are reported
separately. The runner's ledger totals reader runs by the same rule. The spec's "Cuts" fire at the
flag, pre- or post-freeze, in its order, and the ledger records each.

**Checkpoints and STATUS:** at each segment boundary (after Task 4, Task 8, Task 12, and at the
close), at any split, at the flag, and before any owner question, the conductor writes the ledger
at the foot of this plan (task states, decisions, spend including the runner's ledger, next task)
and commits one STATUS line to `main` pointing at it.

**Segments:** 0 to 4 (pre-flight and the build), 5 to 8 (round 0, tuning, transfer jobs, the
freeze), 9 to 12 (mapping, planting, planted runs, scoring), 13 (close). Every boundary sits on a
commit whose gate is green. The freeze (Task 8) is the one irreversible boundary: after its tag,
any instrument change burns the plants (spec, "Freeze").

**Branches:** cairn-cms `docs-reset-1b` in `.claude/worktrees/docs-reset-1b`. Lanes for Tasks 1 to
4 are worktrees off `docs-reset-1b` (`docs-reset-1b-schema`, `-export`, `-scoring`, `-freeze`),
merged back in the conductor before the next pair. **One-executor check** before every task:
`pgrep -f` on the worktree path, `git status` for changes this pass did not author, and STATUS on
`main` for a live session on this branch. A live executor stops the task.

**Models:** implementers `sonnet` at `high`; `diff-reviewer`, the catch judge, the adjudicator, the
rubric author, the tuner, the transfer job author, the miner, the planter, the plant check, and
the record author on `claude-opus-5-5` at `high`; readers on `claude-opus-5-5` at its default
`medium`, and `claude-sonnet-5` for the Sonnet arm only; the agreement read on `fable` (O2). An
`opus` implementer upshift is named per task. A hedged verdict on a correctness-critical point is
re-run on `claude-opus-5-5` at `xhigh`, then goes to one `fable` dispatch.

**Gate economy:** every gate here launches no browser, so it takes the light lane:
`CAIRN_GATE_LANE=light cairn-run-gate '<cmd>'`. Implementers get the unit tests and gate green
first, then run any live check once, rerunning only on failure (pass 1 amendment 2). Reader
concurrency is 4, backing off on `rateLimit` (pass 1 amendment 6).

## Global constraints

- The spec's bars and rules are fixed. No task may change a threshold, a pool, a counting rule, or
  the sequence. A task that finds the spec unbuildable stops and reports.
- **Bans** (spec, "Tuning"): no tuning change, prompt, rubric, or job text may name a page, a
  defect, a job fact, or any development-set item (D01 to D19, P01 to P17, F1 to F6, R1 to R4).
- **Blindness:** the transfer job author, the miner, the planter, and the plant check never see the
  development records (`docs/internal/record/2026-09-23-docs-reset-{validation,planted-defects,
  baseline}.md`, pass A's plan and ground truth), a reader prompt, or a report. The catch judge and
  the adjudicator never see the reader prompt, the model, or the run id. Each dispatch prompt
  states its agent's blindness and lists only the inputs the spec grants.
- The conductor has read the development set, so it never writes a prompt, rubric, criterion, job
  text, or plant; it dispatches the agents that do, with the spec's input list.
- No published docs page changes in this pass. Records go under `docs/internal/record/`; the new
  test plant record is excluded from every reader export.
- Every new script under `scripts/docs-readers/` carries TSDoc per the repository's comment gate and
  a unit test under `src/tests/unit/docs-readers-*.test.ts`.

## Review focus

The plan review checks: that each task's acceptance criteria name the fixture and the failure
that proves them (no vacuous pass: an empty map, zero findings, an unstamped report); that the
build tasks deliver every mechanism the spec's sequence needs before the step that needs it; that
blindness holds at every dispatch; and that the freeze manifest covers every score-affecting input
the spec lists.

## Pre-flight findings (2026-09-24, plan author)

- The report schema is `REPORT_SCHEMA` in `scripts/docs-readers/lib/runner.ts:44-61`; `checks: []`
  is hard-coded at `runner.ts:126`. Quote verification is `scripts/docs-readers/lib/verify.ts:68-93`
  (one-line tolerance, five-line wrap).
- The reader image (`scripts/docs-readers/Containerfile`) builds on `node:24-slim` with no git
  (mechanics review, probe of `localhost/docs-reader:16da07be5618`).
- `scripts/docs-readers/lib/prepare-class.ts` rejects any `.git` (`:414`, `:486`, `:573`, per the
  mechanics review); `prepare-validation.ts:51` pins the scripter's current contract pages to
  `HEAD`, and `:84` throws when no planted directory exists; `prepare-baseline.ts` `CONTRACT_PAGES`
  pins the pre-fix commits.
- `validateClass` (`lib/class-schema.ts`) rejects unknown fields, so absent lists go in batch or
  job files.
- Unit tests live at `src/tests/unit/docs-readers-*.test.ts`; the filter
  `npx vitest run --project unit src/tests/unit/docs-readers` selects them.
- Pass 1's saved reports: `~/.cache/docs-readers/results/validation-20260924/report.json` and
  `validation-rerun-20260924/report.json`.

Task 0 re-checks every line above against HEAD before Task 1 dispatches.

### Task 0: Pre-flight

**Conductor-run.** One `sonnet` agent at `medium` lists every checkable factual claim in Tasks 1 to
4 (paths, line numbers, function names, current behaviors) and checks each against HEAD, returning
the ones that fail, plus every open choice a task leaves its implementer. The conductor amends the
plan and pins each open choice in the dispatch. The same pre-flight runs again before Tasks 5 and
9, over their segments.

**Acceptance.** The pre-flight report is attached to the ledger; each failed claim is amended or
recorded as moot.

### Task 1: The report schema (lane `docs-reset-1b-schema`)

**Outcome.** The reader report carries `steps[]` (a `page:line` quote, the decision it supported),
`diverged[]` (the page quote, what the reader did instead, and why), and a `blockedBy` field on
each `stalls[]`, `assumed[]`, and `diverged[]` entry (a denied command, an absent path, or null),
per the spec's "Tuning". The reader prompt explains each field in neutral terms that name no page,
defect, or job. The runner verifies every `steps[]` and `diverged[]` quote exactly as it verifies
existing quotes. `ruleCandidates[]` stays. Pass 1's saved reports still parse (the new fields
absent), so round 0 can rescore them.

**Files.** `scripts/docs-readers/lib/runner.ts`, `lib/types.ts`, `lib/verify.ts`, their tests.

**Acceptance.**
- A fixture report with a `steps[]` quote one line off verifies; one six lines off fails the run,
  as an existing quote would.
- A fixture report missing `steps[]` fails schema validation for a new run and parses for a saved
  pass 1 report loaded through the rescore path.
- A `diverged[]` entry without its page quote fails validation.
- The prompt text contains no page path, defect subject, or job wording (a unit test greps the
  prompt against the development-set subject list in a test fixture).
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`.

### Task 2: The export (lane `docs-reset-1b-export`, parallel with Task 1)

**Outcome.** Every rule in the spec's "The export": git in the reader image; one synthetic commit
per prepared tree, made after any planted overlay, under a pinned neutral identity; a
one-commit-and-clean check replacing the `.git` rejection; normalized mtimes; `docs/HISTORY.md`,
`docs/STATUS.md`, and `ROADMAP.md` excluded from gated repository exports and the planter's export;
control-only trees buildable before any plant exists; test and transfer plants at a new root
(`$XDG_CACHE_HOME/docs-readers/planted-1b/<job>/`); each job's absent list derived from its
builder's exclusions and written into the batch or job file; every page commit pinned, the
scripter's current pages included.

**Files.** `scripts/docs-readers/Containerfile`, `lib/prepare-class.ts`, `prepare-validation.ts`,
`lib/batch.ts`, their tests. **Upshift:** `model: opus`, since the commit-after-overlay ordering
is the one leak the mechanics review found and the plan does not specify its code.

**Acceptance.**
- A planted tree prepared by the new code, inspected with `git log` and `git diff` inside the
  image, shows one commit, a clean status, and no trace of the control text at any planted line.
- The commit author and committer are the pinned identity; no host email appears in the tree.
- A control-only tree builds when no planted directory exists.
- `docs/HISTORY.md`, `docs/STATUS.md`, `ROADMAP.md`, and every `docs/internal/record/` file are
  absent from a repository export.
- A batch built for the scripter pins a commit, never `HEAD` (test fails on a `HEAD` pin).
- The image rebuilds, and its digest is recorded in the task report for the freeze.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`,
  then one live preparation of a planted and a control tree, run once.

**Conductor step after Tasks 1 and 2:** merge both lanes into `docs-reset-1b`, rerun the gate on
the merge, and start Tasks 3 and 4.

### Task 3: Scoring (lane `docs-reset-1b-scoring`)

**Outcome.** The mechanical half of the spec's "Scoring" and "Path map", as scripts under
`scripts/docs-readers/`:
- `path-map.ts`: sections (H2 and H3, innermost heading, the lead section, fences skipped),
  quote assignment by verified span (a span crossing a heading counts for neither), the on-path
  rule with its two-run and one-run cases, the 60 percent ceiling and its narrowing, the thin-map
  widening that stops at the ceiling, and each map's on-path share; output committed as JSON with
  its hash.
- `harness-filter.ts`: the `blockedBy` match rule, path and command halves exactly as the spec
  states, against the job's absent list and the run's denial record; every excluded item listed;
  never applied to catch scoring.
- `score.ts`: reads final attempts only, rejects an unstamped report (the stamp is Task 4's
  `freeze` field, `{ tag, manifestHash }`), applies the rerun outcomes (a gated planted run still
  failing catches nothing; a gated control run still failing counts every finding false), and
  computes every bar and every reported measure from the judges' rulings files and the plant
  record, including the agreement sample's `sha256` ordering and the pooled kappa as the spec
  defines it.

**Files.** The three scripts, their tests, fixtures.

**Acceptance.**
- Path map: a fixture page with nested H3, a lead section, a fenced `## ` line, and a quote
  crossing a heading yields the expected sections; three fixture runs with 2-of-3, 1-of-3, and
  ceiling-crossing layouts yield the spec's map in each case; an empty `steps[]` set yields an
  empty map and a thin-map record, never a crash.
- Harness filter: each half matches its fixture and rejects a near miss (a path sharing a prefix
  but not a directory; a command with the same first word and a different first argument).
- Scorer: a fixture set reproduces a hand-computed pass and a hand-computed fail on each bar; zero
  findings on a class yields a precision pass and is reported as zero, never a divide by zero; an
  unstamped report is rejected with its path named; a stratum with fewer than five off-mode items
  falls back to raw agreement and says so.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`.

### Task 4: The freeze and the operating characteristic (lane `docs-reset-1b-freeze`, parallel with Task 3)

**Outcome.** `freeze.ts` writes the spec's manifest (sha256 over every input the spec's "Freeze"
lists, including the image digest, the CLI version, resolved model ids, page commits, and seeds)
and verifies a tree against it. The runner refuses a batch marked gated when verification fails,
naming each drifted input, and stamps `freeze: { tag, manifestHash }` into every report of a gated
batch. `oc-curve.ts` (seed 20260924) reproduces the spec's figures: the pass 1 refit (mean 0.29,
ICC 0.72, profile interval 0.25 to 0.95), the 31-of-42 table, the class floors, the stability
figures, and the recomputed thresholds at any achieved plant count.

**Files.** `scripts/docs-readers/freeze.ts`, `oc-curve.ts`, `lib/runner.ts` (refusal and stamp
only), their tests. `lib/runner.ts` also changed in Task 1, which has merged before this task
starts.

**Acceptance.**
- Changing one byte of any manifest input makes a gated batch refuse to start and name that input;
  an ungated batch still runs.
- Every report of a gated fixture batch carries the stamp.
- `oc-curve.ts` output matches the spec's tables to two decimals, and its recomputed thresholds
  match the spec's list (26 at 35 plants, 27 at 36, 31 at 42; none at 34; class floors 4 of 7,
  9 of 14, 4 of 6, 3 of 5, 9 of 13, 8 of 12).
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments'`.

**Conductor step after Tasks 3 and 4:** merge both lanes, rerun the gate, write checkpoint 1.

### Task 5: Judges and round 0

**Conductor-run.** One `claude-opus-5-5` rubric author at `high` drafts the catch judge's prompt
and rubric, the adjudicator's prompt and rubric (item classification, subject grouping, the real,
false, and harness rulings, the spec's "Real defect" definition verbatim), and a catch criterion and
near miss for each of pass 1's 17 plants from the development plant record (spec, Sequence step 0).
The judges then rescore pass 1's saved reports (round 0) through Task 3's scorer.

**Acceptance.**
- The prompts name no development-set item except the round-0 criteria file, which is a
  development input and never enters a reader or test-set prompt.
- Round 0's record, `docs/internal/record/2026-09-24-docs-reset-1b-tuning.md`, gives each
  development job's proxy map, on-map plant count, on-map catches, and false findings per control
  run, under the new rules.
- A `diff-reviewer` read of the prompts and the round-0 record against the spec's "Scoring" and
  "Tuning" returns accept.

### Task 6: Tuning

**Conductor-run.** Round 1 runs the three adopted changes (Tasks 1 and 2) on the development batch:
each development job once planted (pass 1's plants) and once on control, `claude-opus-5-5`, 12 runs,
scored by the judges. Round 2 runs only when round 1 leaves at least two on-map plants missed: one
`claude-opus-5-5` tuner at `high`, which may read the development set, proposes one bundle of
reader-instruction changes under the bans; a `diff-reviewer` checks the bundle against the bans
before it runs; the keep rule decides. The tuning record gains each round's scores and the kept or
dropped bundle.

**Acceptance.**
- Every round's reports verify; the record states each round's on-map catches and false findings
  per control run beside round 0's.
- The kept instruction set is committed; the ban check's verdict is in the ledger.
- The cuts: if the flag trips here, round 2 is skipped and the ledger says so.

### Task 7: Transfer jobs

**Conductor-run.** One fresh `claude-opus-5-5` agent at `high`, blind per the global constraints,
writes four transfer job texts, one per class, each with an arrival state and a done signal, on
pages no pass 1 run or tuning run read (the conductor supplies the list of read pages, derived by
script from the reports, and the classes' contents; never a job text or a finding). The texts go
into batch files for mapping and planted runs.

**Acceptance.**
- Each job's pages are disjoint from the read-pages list (script check).
- A `diff-reviewer` read confirms the texts name no development-set item and each is a real task
  for its class's reader.

### Task 8: The freeze

**Conductor-run.** Build the test and transfer mapping batches (control-only trees, pinned
commits, absent lists), run `freeze.ts` over every input, commit the manifest, and tag
`docs-reset-1b-freeze`. A `diff-reviewer` reads the manifest against the spec's "Freeze" list.

**Acceptance.**
- The manifest covers every item in the spec's list; the reviewer names none missing.
- A dry `freeze.ts --verify` passes on the tagged tree.
- Checkpoint 2: ledger, STATUS line, and a spend check against the flag.

### Task 9: Mapping

**Conductor-run.** The runner runs the gated mapping batch: each development and transfer job
three times on `claude-opus-5-5` on control pages (30 runs), plus the scripter's three held-out
runs on the pre-fix pins. `path-map.ts` builds each job's map; maps and hashes are committed.
`oc-curve.ts` recomputes the thresholds if any map cannot hold seven plants, before planting.

**Acceptance.**
- Every gated report carries the stamp; reruns follow the spec's rule and are listed.
- Each job's map, on-path share, and any ceiling or thin-map action is recorded.
- Any recomputed threshold is committed before Task 10 starts.

### Task 10: Mine and plant

**Conductor-run.** The miner (blind; full git history plus the committed maps) lists candidate
reverts; the exclusion script (in the freeze) filters them; the planter (blind; the repository
export plus maps, the filtered list, and the mapping-run finding spans to avoid) places seven plants
per development job and per transfer job under the spec's type, spacing, and record rules, writing
the test plant record `docs/internal/record/2026-09-24-docs-reset-1b-planted-defects.md` with each
plant's catch criterion and near miss, and criteria for the nine held-out defects. The validity
script checks placement and difference; one blind `claude-opus-5-5` plant check verifies each proof
against the code and the no-shared-subject rule. Failing plants are replaced by the planter. The
record's hash enters the planted batch's manifest.

**Acceptance.**
- Every plant sits inside an on-path section, differs from control at its line, and passes the
  plant check; the record lists replacements.
- At least four of each job's seven plants are semantic; the record marks each plant's source.
- The planted trees are prepared by Task 2's code, and one is spot-checked inside the image with
  `git diff` showing nothing.

### Task 11: Planted runs

**Conductor-run.** The runner runs the gated planted batch: three `claude-opus-5-5` runs per
development and transfer job, plus one `claude-sonnet-5` run per development job. The cuts apply
if the flag trips.

**Acceptance.** Every gated report is stamped; reruns are listed; the batch's `stopReason` is
`complete`, or the ledger records each cut.

### Task 12: Scoring and the record

**Conductor-run.** The catch judge rules each planted run; the adjudicator rules each mapping run;
the scorer draws the agreement sample; one `fable` read re-rules it (O2). The scorer computes every
bar and reported measure. One `claude-opus-5-5` record author at `high` writes
`docs/internal/record/2026-09-24-docs-reset-1b-validation.md`: the per-class verdict under the
spec's failure rule, every bar with its numbers, every reported measure, each cut, each rerun, and
the in-sample and contamination labels the spec requires. A `diff-reviewer` reads the record
against the scorer's output; a disputed verdict goes to `xhigh`, then one `fable` read.

**Acceptance.**
- Every number in the record traces to the scorer's output file, which is committed.
- The record names each class validated or advisory, with the cause.
- Checkpoint 3.

### Task 13: Close

**Conductor-run, one fold agent** (`claude-opus-5-5`, `high`), one independent `diff-reviewer`
read. The post-mortem at the foot of this plan (built, verified, decisions, planning misses and
attended-time counts); the `docs/HISTORY.md` entry; `ROADMAP.md`'s docs reset entry (pass 1b done,
pass 2a next with its inputs: the per-class verdicts, the Sonnet decision, the labeled set, the
trial redesign the spec hands it); STATUS naming pass 2a; the `docs-reset-initiative` memory. The
regression batch (the frozen test batch) replays through the runner. Gates: `npm run check:docs`,
`npm run check:arm-indexes`, and the unit gate. The PR merges only on Geoff's word.

## Ledger

| Task | State | Commit | Spend | Notes |
| --- | --- | --- | --- | --- |
| spec | done | `30083f27`..`da97461b` | brainstorm session | Spec drafted, five lens reviews, fold, verification, second fold. Owner rulings O1 to O4 (Geoff, 2026-09-24). |
