# Docs reset pass 2a: the reader fields, the pilot, and the audience record

> **For agentic workers:** twelve tasks (0 to 11) in four segments. Tasks 1, 3, 4, and 6 are
> implementer chains: `cairn-implementer` (`sonnet`, `high`) implements test-first,
> `code-simplifier` refines, the task's gate runs inside the chain through `cairn-run-gate`, and
> `diff-reviewer` (`claude-opus-5-5`, `high`) reads the diff against the task's acceptance
> criteria. Tasks 0, 2, 5, and 7 to 11 are conductor-run: the conductor dispatches the named agents
> and the reader runner, and reads their structured reports, never diffs, pages, transcripts, or
> logs. **Execution mode:** per-task Agent chains; no workflow (see "Execution mode" below).
>
> **Plan author:** `claude-opus-5-5` at `high`. The close counts this plan's planning misses.

**Date:** 2026-09-25.

**Goal:** give reader reports scored `wrong[]` and `missing[]` fields, run the pre-registered
go/no-go pilot that sets which reader classes gate the page chain, then write, review, and put to
Geoff the audience record and the exemplar corpus review.

**Spec:** [`2026-09-25-docs-reset-pass-2a-design.md`](../specs/2026-09-25-docs-reset-pass-2a-design.md),
read in full by every executor before its task. The spec is the contract: its fields, pass mark,
per-class rule, and order are fixed. Where this plan and the spec disagree, the spec wins; stop
and report. The rulings behind it: the spec's "Rulings" section and the fold record
`docs/superpowers/research/2026-09-25-docs-reset-2a-spec-fold.md`.

**Approved:** pending Geoff's read.

**Token ceiling:** 15M, flag 12M (B4). **Counting rule:** input, output, and cache-creation tokens
count; cache reads are reported apart. At Task 0 the conductor records the pass's start instant
`T0` in the Ledger. Spend is, per session that works this pass,
`npx tsx scripts/docs-readers/session-ledger.ts --session <session id> --since <T0>`, summed across
sessions with the runner ledger counted once (pass 1b's method: subtract each extra session's
runner figure). The conductor runs it at every checkpoint and every task boundary from Task 5 on.

**Budget:** about 11.8M on either branch (range 11.0M to 15.2M), the spec's "Budget" table; each
task carries its row below. Fix rounds are budgeted as the norm: every build task in passes 1 and
1b drew at least one `fix`. At 1b's mean per build task the pass crosses the 12M flag. **At the
flag** the conductor finishes the running task, writes the Ledger with a projection to the close,
and asks Geoff one combined question. A runner batch that is running when spend reaches the
ceiling finishes; no batch runs half.

**Checkpoints:** every segment boundary (at most four tasks apart), any split, the flag, and before
any question to Geoff. At each, the conductor writes the Ledger at the foot of this plan (task
states, decisions, counted spend, next task) and commits one STATUS line to `main` pointing at it.

**Segments.**

| Segment | Tasks | Boundary |
| --- | --- | --- |
| 1 | 0 pre-flight, 1 report fields (1a), 2 smoke run | Gate-green commit carrying the smoke fixture. |
| 2 | 3 judge side (1b), 4 scorer (1c), 5 pilot | **Mandatory:** the pilot record committed, lane `docs-reset-2a-audiences` merged, the merged gate green. A fresh session may start here. |
| 3 | 7 audience record (4b), 8 audience review, 9 exemplar review, 10 owner stop 1 brief | Owner stop 1 (attended). |
| 4 | 11 close | PR opened. |

**Independent task:** Task 6 (4a, the audience format) shares no file with Tasks 1 to 5. It runs in
its own lane beside segments 1 and 2, starting after Task 0, and merges at segment 2's boundary.

**Execution mode:** per-task Agent chains, fewer than six tasks per segment, the lane run as its own
Agent chain in its own worktree. Neither `pass-execute` workflow can run these tasks: both run
`scripts/checks/gate-tier.mjs`, which classifies `scripts/**` and `src/tests/**` into the scripts
tier and substitutes its browser `npm test`, and both prefix only `CAIRN_GATE_LANE=light`, never
the memory override this repository's `svelte-check` needs under the light lane (pass 1b planning
miss 2 and its R1 gate note). Do not run the `writing-plans` "which execution method" question.

**Branches:** cairn-cms `docs-reset-2a` in `.claude/worktrees/docs-reset-2a`, off `main` at the
commit carrying this plan. Lane `docs-reset-2a-audiences` in `.claude/worktrees/docs-reset-2a-audiences`,
off `docs-reset-2a`, carrying Task 6 only, merged by the conductor at segment 2's boundary. The
worktree e2e gotcha does not apply: no task runs the showcase e2e or touches `src/lib`. Dotfiles
edits (the CLI hold, `cairn-docs-drafter.md`) commit in `~/.dotfiles` on its `main`, specific files
only. **One-executor check** before every task: `pgrep -f` on the worktree path, `git status` for
changes this pass did not author (in the worktree, and in `~/.dotfiles` before a dotfiles commit),
and STATUS on `main` for a live session on this branch. A live executor stops the task.

**Models:** conductor `claude-opus-5-5` at `medium`. Implementers `cairn-implementer` on `sonnet` at
`high`; no task names an `opus` upshift, since every build task here is specified by the spec and
its fixtures. Per-task `diff-reviewer` on `claude-opus-5-5` at `high`. The audience record's
author, the pilot record's author, every fold, and every review lens on `claude-opus-5-5` at
`high`. Mechanical agents (batch files, copies, packet specs, hash checks) on `sonnet` at `medium`.
A hedged verdict on a correctness point is re-run on `claude-opus-5-5` at `xhigh`, then goes to one
`fable` dispatch; this never applies to a judge ruling.

**Gates:** every gate here launches no browser. The reader chain gate (Tasks 1, 3, 4) is pass 1b's:

```
cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a && CAIRN_GATE_LANE=light CAIRN_GATE_MEMORY_MAX=6G CAIRN_GATE_MEMORY_HIGH=5G cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments && npm run check'
```

The light lane's 3G cap runs `svelte-check` out of memory, so the memory override is required. On
exit 75, re-issue the same command until it prints `gate exit:`; never poll a log. Every gate call
starts with an explicit `cd <worktree> &&`. Task 6's and the merged gates are named in their tasks.

## Global constraints

- The spec's pass mark, per-class rule, pilot sample, and order are fixed. No task moves a bar, a
  denominator, a counting rule, or the sequence. A task that finds the spec unbuildable stops and
  reports.
- **Bans:** no prompt line, judge prompt, or rubric this pass writes names a development item
  (`scripts/docs-readers/fixtures/dev-items.json`). `ban-grep.ts` is the floor on every such text;
  the `diff-reviewer`, given the development-item list, is the check.
- **Judges** run only through the runner as judge classes over packets that `judge-packets.ts`
  builds. None is dispatched as an Agent. A judge defect found in the pilot is fixed, logged in the
  Ledger with the misruling it fixes, and every pilot judge batch of that kind re-runs.
- The conductor has read the development set, so it never writes a prompt line, a rubric, or a job
  text; it dispatches the agent that does.
- No published doc arm (`docs/admin`, `docs/editors`, `docs/extend`, `docs/reference`,
  `docs/README.md`, `docs/why-cairn.md`) changes. **Facts container:** this pass changes no public
  behavior. Everything it writes sits under `scripts/`, `src/tests/`, `docs/internal/`, and
  `docs/superpowers/`, none of it in `package.json` `files`, so no bullet goes under
  `docs/internal/facts/`. A task that finds otherwise files the bullet and says so.
- Every new script carries TSDoc per the comment gate and a unit test under `src/tests/unit/`.
  New fixtures go under `scripts/docs-readers/fixtures/` (or the task's named fixture directory),
  never under `src/`.
- **Execution rules from pass 1b's post-mortem** (spec, "Execution rules"): a fix round goes to the
  warm agent by `SendMessage` only while its prompt cache is warm (it returned within the last few
  minutes); after any gap, a fresh agent gets the finding list and the diff range. Runner batches
  run as background commands under `awake --`, and a fresh agent reads the result; `report.json`
  is copied before any `--resume`. A second `fix` is the conductor's call; a third stops the pass
  for Geoff.

## Review focus

Five failure modes no spec acceptance line tests, each with its test placed in the owning task:

1. **The pilot's scoring command throws.** `score.ts dev` calls `loadPlants`
   (`score.ts:202-209`), which throws for a plant whose job has no indexed report, and
   `fixtures/dev-plants.json` carries the evaluator's P01 and P02, whose job sits out. Test: Task
   4's rehearsal runs the exact pilot scoring command over fixture reports; Task 5 scores with the
   filtered plants file that Task 2 writes.
2. **Rounds 0 and 1 drift under the scorer change.** Test: Task 4 rescores round 1's committed
   inputs and matches `tuning/round1/score.json`'s `byJob`, `onMapRecall`, and
   `onMapPlantRunRecall` field for field.
3. **A new-field quote escapes the verifier's page-read rule, or `reverify.ts` skips new fields.**
   The §2 verifier check depends on `reverify.ts`. Test: Task 1's acceptance cases for an unread
   page and for `reverify.ts` on a transcript fixture.
4. **The operator class stalls on a dead scratch site and scores as reader misses.** The
   `docs-and-binary` class runs read-only `cairn` checks against the scratch site. Test: Task 5's
   precondition `GET /healthz` on the scratch Worker, before the operator batch.
5. **The rendered profile drifts between the synthetic fixture and the authored profiles.** Test:
   Task 7 renders every authored profile through `render-profile.ts` and checks the first against
   the fixture's section order.

## Pre-flight findings (2026-09-25, plan author)

Verified against `main` at `3bc3647f` and the workstation today.

- **Report schema:** `REPORT_SCHEMA` is `scripts/docs-readers/lib/runner.ts:94-125`,
  `REPORT_REQUEST` `:128-137` (the wish slot is `:136`). The job report copies report fields at
  `runner.ts:194` and `:283`; both need the new fields. `readerReport`
  (`lib/transcript.ts:705-720`) requires every list, `loadSavedBatchReport` is `:786`, and
  `toBlockedEntries` is `:739`. `verifyReport` is `lib/verify.ts:192-250`; `diverged[]`'s handling
  (`:167`, `:242-246`) is the pattern for the new fields, including the unread-page check.
- **Comment carries confirmed:** `runner.ts:731-734` (the once-read prompt comment) and
  `lib/class-schema.ts:68-69` (inside `loadJudgePrompt`'s doc) read as the spec says.
- **Judge side:** the field union is `judge-packets.ts:401-417`, the raw fields `:435-449`,
  `buildCatchFields` `:453-489`, the run's allow-listed fields `:159-162`, and the item spreads
  `:700` and `:783`. The builder does not filter by verification, so unverified runs get packets.
  `itemCount` is `lib/score-assemble.ts:418`.
- **Scorer:** `DEVELOPMENT_BATCH_NAMES` lives in `lib/score-integrity.ts:16`, not `score.ts`.
  Development precision keeps only verified Opus control runs (`score.ts:400`), and
  `docs-readers-score.test.ts:187` asserts it; that measure stays, and 1c's pooled block is
  additive. `loadPlants` throws on the evaluator's plants (Review focus 1).
- **Pilot inputs:** round 1's batch (`batches/round1.json`) uses job ids `<job>-planted-1` and
  `<job>-control-1` with the classes the spec names; its prepared trees exist under
  `~/.cache/docs-readers/prepared/round1/`. Each round 1 catch key records the planted page's
  sha256 under `inputs`, keyed by its absolute path in that cache. Judge jobs take the id of the
  reader job whose packet they rule (`score.ts` header).
- **CLI:** the host runs 2.1.282; `init-baseline.json` pins 2.1.280 to 2.1.282.
  `DISABLE_AUTOUPDATER` is absent from both settings files (dotfiles `75f3d96` released it), so
  Task 0 restores it.
- **Tooling:** `claude-tooling-sync verify` exits 0 today. Task 0 re-runs it and records the
  result as the owed check cleared. `~/.dotfiles` is 13 commits ahead of `origin` (the push STATUS
  lists as owed) and carries changes this pass did not author (`skills/spec-plan-review/SKILL.md`
  modified, `skills/synced/` untracked); this pass commits only its own dotfiles files.
- **Task 6 surroundings:** `scripts/docs-audiences/` is outside the comment gate's globs
  (`eslint.config.js:34-41`) and `check-comments.sh`'s eslint path list, and the chain gate's path
  filter does not match a `docs-audiences` test. `gray-matter` and `yaml` are direct
  dependencies; `ajv` is not, so the schema check takes no new dependency.
- **Exemplar manifest:** 68 capture directories under six `<dir>`s. Entries name their slug two
  ways, `Local path: \`<slug>/\`` (13 entries) and a bare `` `<slug>/` `` after the URL, always
  with a trailing slash, and method sources (`mozilla-kb-writing-guide/`) sit beside exemplars.
- **Docs gates:** `docs/internal/` is outside the tarball and outside Vale's styles
  (`.vale.ini`), and `check:docs` walks it for dead links.
- **Ledgers:** STATUS is 62 lines, over the 60 cap. STATUS and ROADMAP already carry B4's 15M and
  12M. ROADMAP's pass 2a bullet still carries the designer theme-guide input and the scratch
  site's "Teardown for pass 2a's close" pointer.
- **Tools:** `cairn-run-gate` has no `--help` (it runs the argument as a gate); its header is the
  spec: per-call `CAIRN_GATE_MEMORY_*` values override the lane's caps.

### Task 0: Pre-flight (conductor-run; 0.2M)

**Outcome.**
1. The one-executor check, then the worktree `docs-reset-2a` and lane `docs-reset-2a-audiences`
   created, `npm ci` run in each, and `T0` recorded.
2. One `sonnet` agent at `medium` lists every checkable claim in Tasks 1 to 7 (paths, line numbers,
   function names, current behaviors) and checks each against the worktree, returning the ones
   that fail and every open choice a task leaves its implementer. The conductor amends the plan and
   pins each open choice in the dispatch.
3. The owed errata: the scratch-site record's heading "Teardown for pass 2a's close" and its first
   line name the close of the last drafting pass that runs `docs-and-binary` readers (CR7);
   `DISABLE_AUTOUPDATER=1` restored in `~/.dotfiles/claude/.claude/settings.json` and committed
   (as `4265aea` did); `claude-tooling-sync verify` run and its exit recorded.
4. One `claude-opus-5-5` agent at `high` writes the two human-read task sheets (§5): one editor
   task on a current page, and one evaluator task, each with its done signal and a stall-log form.

**Files.** `docs/internal/record/2026-09-23-scratch-site.md`,
`docs/superpowers/research/2026-09-25-docs-reset-2a-human-reads.md`, the Ledger;
`~/.dotfiles/claude/.claude/settings.json`.

**Acceptance.** The pre-flight report is attached to the Ledger, each failed claim amended or
recorded as moot. `claude --version` prints 2.1.282 and a new shell shows `DISABLE_AUTOUPDATER=1`.
`claude-tooling-sync verify` exits 0. `npm run check:docs` passes after the record edit. Reviewer:
none (docs and settings only); the conductor reads the agents' reports.

### Task 1: Report fields (1a; 2 deliverables; 1.3M)

**Outcome.** The spec's §1 "Shapes" and 1a:
1. `wrong[]` `{ quote, pageSays, actual, evidence }` and `missing[]` `{ quote, needed, evidence }`
   through `REPORT_SCHEMA` (required for a new run), `REPORT_REQUEST` (both fields explained in
   neutral terms, filed even when the reader worked around the gap, and `ruleCandidates` narrowed to
   wishes the job did not need), `readerReport`, the job-report copies at `runner.ts:194` and
   `:283`, `loadSavedBatchReport` (both optional on read, defaulting to `[]`), `lib/types.ts`, and
   `verifyReport` (every new-field quote verified by the existing rule, including the unread-page
   check).
2. The three comment-only carries the spec lists.

**Interfaces.** Produces the report shape every later stage reads:
`ReaderReport.wrong: WrongEntry[]`, `ReaderReport.missing: MissingEntry[]`, with `quote` in the
existing `QUOTE_SCHEMA` shape and no `blockedBy`; `VerifiedReport` gains verified `wrong` and
`missing` quote lists beside `diverged`.

**Files.** `scripts/docs-readers/lib/runner.ts`, `lib/transcript.ts`, `lib/verify.ts`,
`lib/types.ts`, `lib/class-schema.ts` (comment), the development catch test (note), their tests.

**Acceptance.** The spec's 1a lines, plus:
- A `missing[]` entry whose quote cites a page the transcript never shows read fails verification,
  as a `diverged[]` quote does.
- `reverify.ts` over a transcript fixture carrying a `wrong[]` quote two lines off reports the run
  unverified, naming that quote.
- A new-run report missing `wrong` fails schema validation; `pass1-trimmed.json` still loads.

**Gate:** the reader chain gate. **Reviewer:** `diff-reviewer`, given the development-item list for
the prompt lines.

### Task 2: The smoke run (conductor-run; 0.15M)

**Outcome.** One unscored control run on the new prompt, whose report becomes the pinned fixture
for every cross-stage shape (spec §2, "Preconditions").
1. A `sonnet` agent at `medium` writes `batches/pilot-2a-smoke.json` (batch name `pilot-2a-smoke`,
   one job `scripter-control-1` copied from `batches/round1.json`, the round 1 control tree; the
   scripter filed the most items in round 1, so it gives the best chance of real new-field
   entries) and `scripts/docs-readers/tuning/pilot-2a/plants.json`: `fixtures/dev-plants.json`
   without the evaluator's plants, with the source's sha256 in the Ledger (Review focus 1).
2. The conductor confirms the CLI hold and version, then runs the batch as a background command:
   `awake -- npx tsx scripts/docs-readers/run.ts scripts/docs-readers/batches/pilot-2a-smoke.json --out ~/.cache/docs-readers/results/pilot-2a-smoke`.
3. A fresh `sonnet` agent at `medium` reads the result, confirms init and verification, and writes
   `scripts/docs-readers/fixtures/saved-reports/smoke-2a.json` (a trimmed copy). If the run filed
   no `wrong[]` or `missing[]` entry, it adds one of each in the real entry shape, and the
   fixture's consuming test and the Ledger say so.

**Interfaces.** Produces `fixtures/saved-reports/smoke-2a.json` (consumed by Tasks 3 and 4) and
`tuning/pilot-2a/plants.json` (consumed by Tasks 4 and 5).

**Acceptance.** The run verifies with its init matching the pinned 2.1.282 baseline, or it is
rerun as infrastructure. The fixture parses through `loadSavedBatchReport` and verifies. The
segment 1 boundary commit's reader chain gate is green.

### Task 3: Judge side (1b; 2 deliverables; 1.3M)

**Outcome.** The spec's 1b deliverables: both fields through the three packet builders, the field
union, the raw-field allow-list, and `itemCount`; and the field rule in `catch-judge.md`,
`adjudicator.md`, and `agreement.md`.

**Interfaces.** Consumes `smoke-2a.json`. Produces packet items with
`field: 'stalls' | 'assumed' | 'diverged' | 'checks' | 'wrong' | 'missing'`, keys whose items
carry that field name, and `itemCount` summing all six lists.

**Files.** `scripts/docs-readers/judge-packets.ts`, `lib/score-assemble.ts`, `lib/types.ts` (only
if the item field type lives there), `prompts/catch-judge.md`, `prompts/adjudicator.md`,
`prompts/agreement.md`, their tests.

**Acceptance.** The spec's 1b lines, plus:
- An adjudicator packet built from `smoke-2a.json` carries its `wrong[]` and `missing[]` items
  under their field names and no `ruleCandidates[]` entry.
- `ban-grep.ts` passes all three edited prompts.
- Live check, run once after the gate is green: one adjudicator run on the smoke packet through
  `run.ts`, every item ruled. Its key and rulings are committed as
  `scripts/docs-readers/fixtures/pilot-2a-judge/` for Task 4.

**Gate:** the reader chain gate. **Reviewer:** `diff-reviewer`, given the development-item list.

### Task 4: Scorer (1c; 2 deliverables; 1.0M)

**Outcome.** The spec's 1c deliverables.

**Interfaces.** Consumes `smoke-2a.json`, the Task 3 judge fixture, and `tuning/pilot-2a/plants.json`.
Development mode accepts the batch names `pilot-2a-operator`, `pilot-2a-designer`,
`pilot-2a-extender`, `pilot-2a-core-developer`, and `pilot-2a-scripter`, and takes
`--control-ids operator-control-1,designer-control-1,extender-control-1,core-developer-control-1,scripter-control-1`.
Output adds `plantTallies: [{ plantId, job, runsCaught }]` and
`pooledPrecision: { controlRunIds, falseFindings, newFieldFalseFindings, otherFalseFindings, perRun }`.
Task 5 reads these names.

**Files.** `scripts/docs-readers/score.ts`, `lib/score-integrity.ts`, `lib/score-precision.ts`,
their tests, fixtures.

**Acceptance.** The spec's 1c lines, plus:
- `pilot-2a-smoke` refuses in development mode.
- Rescoring round 1's committed inputs (`tuning/round1/reader-report.json`, its keys and rulings,
  `fixtures/dev-plants.json`, `tuning/round0/maps/`) matches `tuning/round1/score.json` in
  `byJob`, `onMapRecall`, and `onMapPlantRunRecall` field for field.
- Rehearsal: the exact Task 5 scoring command, run over five fixture reports named
  `pilot-2a-<job>` built from `smoke-2a.json`'s shape and the Task 3 judge fixture, with
  `tuning/pilot-2a/plants.json`, completes with `ok: true`.
- A catch fixture built from a copy of a round 1 catch key and its rulings, with one item moved
  into `wrong[]`, counts in its plant's `runsCaught`.

**Gate:** the reader chain gate. **Reviewer:** `diff-reviewer`.

### Task 5: The pilot (conductor-run; 1.05M)

**Outcome.** The spec's §2, run in this order.
1. **Preconditions.** A `sonnet` agent at `medium` writes the five batch files
   `batches/pilot-2a-<job>.json`, each copying its round 1 planted job twice (`<job>-planted-1`,
   `<job>-planted-2`) and its control job once (`<job>-control-1`), all `claude-opus-5-5`, and
   checks each planted page's sha256 against its round 1 catch key's `inputs`. The conductor
   confirms `claude --version` is pinned and the hold holds, and that the scratch Worker's
   `GET /healthz` returns `ok: true`.
2. **Readers.** Five background batches under `awake --`, one at a time, each to
   `~/.cache/docs-readers/results/pilot-2a-<job>`. A crash costs one job's batch.
3. **Judges.** A fresh `sonnet` agent copies each `report.json` to
   `scripts/docs-readers/tuning/pilot-2a/<job>/reader-report.json`, builds a catch packet for every
   planted run and an adjudicator packet for every control run, verified or not, with keys under
   `tuning/pilot-2a/catch-keys/` and `adjudicator-keys/`, and writes `batches/pilot-2a-catch.json`
   (10 jobs) and `batches/pilot-2a-adjudicator.json` (5 jobs). The conductor runs both in the
   background. A fresh agent copies both reports into `tuning/pilot-2a/`.
4. **CLI release.** After the last judge batch, `DISABLE_AUTOUPDATER` comes out of the dotfiles
   settings, committed.
5. **Scoring.** A fresh `sonnet` agent runs one `score.ts dev` over the five reader reports, both
   judge reports as `--catch-rulings` and `--adjudicator-rulings`, every key as `--catch-key` and
   `--adjudicator-key`, `--plants scripts/docs-readers/tuning/pilot-2a/plants.json`,
   `--map <job>=scripts/docs-readers/tuning/round0/maps/<job>.json` for the five jobs, and Task 4's
   `--control-ids`, writing `tuning/pilot-2a/score.json`. It checks the spec's validity
   preconditions and returns the figures, never a verdict.
6. **Record.** A `claude-opus-5-5` author at `high` writes
   `docs/internal/record/2026-09-25-docs-reset-2a-pilot.md` with every item the spec's "Record"
   lists, the spec's "Labels" on every figure, the verdict under the pre-registered mark, and the
   gating-class list.

**Interfaces.** Consumes Task 4's output names. Produces the gating-class list in the record,
which the first drafting pass's chain build reads (§3).

**Acceptance.**
- Every precondition holds or its rerun is recorded; a failed precondition reruns the missing
  reader or judge job, never yields a verdict. An init-only failure is re-pinned and rerun.
- The verifier-check branch in §2 ("Runs and verification") is applied when its trigger holds:
  a verifier defect goes to a fresh `cairn-implementer` chain on the reader chain gate, then
  `reverify.ts`, and the record names which report it scored.
- `git diff --name-only` for this task shows no path under `tuning/round0/` or `tuning/round1/`.
- A `diff-reviewer` read checks every figure in the record against `tuning/pilot-2a/score.json`.
- **The fork:** on a pooled go, the pass continues. On a no-go, the conductor sends Geoff the
  spec's short report (attended) and continues with every class advisory unless he redirects.
- Segment 2 boundary: lane `docs-reset-2a-audiences` merged, then the merged gate green:
  `cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a && CAIRN_GATE_LANE=light CAIRN_GATE_MEMORY_MAX=6G CAIRN_GATE_MEMORY_HIGH=5G cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers src/tests/unit/docs-audiences && npm run check:comments && npm run check'`.
  The Ledger, STATUS with a resume prompt for a fresh session, and the human-read sheets sent to
  Geoff with the pilot's result in one message.

### Task 6: The audience format (4a; lane; 2 deliverables; 1.0M)

**Outcome.** The spec's 4a deliverables, on a synthetic fixture profile under
`scripts/docs-audiences/fixtures/`, never in `docs/internal/audiences/`.
1. `docs/internal/audiences/profile.schema.json` and `src/tests/unit/docs-audiences-schema.test.ts`,
   which checks the synthetic fixture and every `docs/internal/audiences/*.md` except `README.md`
   (none exist yet) against the schema, with no new dependency.
2. `scripts/docs-audiences/render-profile.ts <profile>` and its fixture test, with
   `scripts/docs-audiences/` added to the comment gate (`eslint.config.js` `COMMENT_GLOBS` and
   `check-comments.sh`).

**Interfaces.** Pins the frontmatter keys Task 7 writes: `id` (the file's basename), `persona`
(one sentence), `vocabulary` (`use` and `avoid` lists), `ceiling` (the knowledge and tool
ceiling, stated positively), `arrivalStates` (list), `success` (the success criterion),
`exemplars` (list of `<dir>/<slug>` ids), `provisional` (boolean), and `provisionalReason`
(required exactly when `provisional` is true). An exemplar id resolves when the manifest
`docs/internal/record/docs-exemplars.md` holds a backticked `` `<slug>/` `` inside the section whose
`Root:` line names `<dir>`; the test takes the manifest path, so the fixture uses a fixture
manifest. The rendered `profile` string is plain text: a first line naming the profile id and
persona, then one labeled block per key in the schema's key order, lists as hyphen bullets,
exemplar ids as ids only (the chain carries exemplar pages separately).

**Files.** The schema, the two scripts' tests, `scripts/docs-audiences/render-profile.ts`, its
fixtures, `eslint.config.js`, `scripts/checks/check-comments.sh`.

**Acceptance.** The spec's 4a line, plus: a fixture with `provisional: true` and no
`provisionalReason` fails; `npm run check:comments` lints `scripts/docs-audiences/`.

**Gate:** `cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a-audiences && CAIRN_GATE_LANE=light CAIRN_GATE_MEMORY_MAX=6G CAIRN_GATE_MEMORY_HIGH=5G cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-audiences && npm run check:comments && npm run check'`.
**Reviewer:** `diff-reviewer`.

### Task 7: The audience record (4b; conductor-run; 1.5M)

**Outcome.** The spec's 4b.
1. A `sonnet` agent at `medium` pre-extracts the inputs into a scratch directory: the parent spec's
   rulings and its pass 2a amendment, `docs/internal/what-cairn-is-and-is-not.md`, the shipped
   guidance layer (`claude/`, `skills/`), the site round's evidence (the extender source-read log
   and per-page reports the parent's "Sequencing" names), the earlier
   `docs/internal/record/2026-08-14-audience-profiles.md`, and the exemplar manifest.
2. A `claude-opus-5-5` author at `high` writes six profiles and `README.md` under
   `docs/internal/audiences/` to Task 6's keys, and updates
   `~/.dotfiles/claude/.claude/agents/cairn-docs-drafter.md` to name the format and how the
   rendered profile reaches its prompt (the chain's `profile` argument, one invocation per
   profile).
3. The schema test gains an assertion that exactly the six profile ids exist.

**Files.** `docs/internal/audiences/*.md`, `src/tests/unit/docs-audiences-schema.test.ts` (the
count assertion), the drafter agent file in dotfiles.

**Acceptance.** The spec's 4b line, plus: every profile renders through `render-profile.ts`, and
the first authored profile's output keeps the fixture's section order (Review focus 5); every
exemplar id's capture directory exists under `~/.local/share/cairn/exemplars/` (a local check,
listed in the report); `npm run check:docs` passes. **Gate:** Task 6's gate string run in the
`docs-reset-2a` worktree. **Reviewer:** `diff-reviewer` against the spec's §4 and the charter.

### Task 8: The audience review (conductor-run; 2.0M)

**Outcome.** The spec's §5.
1. Four cold `claude-opus-5-5` lenses at `high`, run in parallel, each writing
   `docs/superpowers/research/2026-09-25-docs-reset-2a-audience-review-<lens>.md` (`users`,
   `boundaries`, `agents`, `open`), each finding with quoted evidence, a testability ruling per
   profile, and a proposed fix.
2. The human reads' stall logs, as they arrive, recorded in
   `docs/superpowers/research/2026-09-25-docs-reset-2a-human-reads.md`.
3. One fold by `claude-opus-5-5` at `high`: the profiles revised and
   `docs/superpowers/research/2026-09-25-docs-reset-2a-audience-fold.md` written.

**Acceptance.** The spec's §5 line. Each human read is recorded or listed open (an open read does
not hold the fold). The schema test passes after the fold. **Gate:** Task 7's. **Reviewer:** one
`diff-reviewer` read of the fold against the four reviews.

### Task 9: The exemplar review (conductor-run; 0.7M)

**Outcome.** The spec's §6 review and fold. One cold `claude-opus-5-5` lens at `high` over the 68
captures writes `docs/superpowers/research/2026-09-25-docs-reset-2a-exemplar-review.md`; one fold
marks the manifest. Each capture's entry gains one line, `Verdict: kept` or
`Verdict: rejected (<reason>)`; nothing is deleted from the store.

**Acceptance.** The spec's §6 line for this pass; a count check shows 68 capture directories and
68 verdict lines, one per slug; the schema test passes. The gap fills are pass 2b's. **Gate:** Task
7's. **Reviewer:** `diff-reviewer`.

### Task 10: Owner stop 1 (conductor-run; 0.2M; attended)

**Outcome.** A `claude-opus-5-5` author at `high` writes the one-page brief the spec's §7 names, at
`docs/superpowers/research/2026-09-25-docs-reset-2a-owner-stop-1.md`, and the conductor puts it to
Geoff with the Ledger current. Geoff's rulings go in the Ledger. An edit he asks for to the record
or the manifest goes to one `claude-opus-5-5` fold dispatch before the close; a larger change is
filed to pass 2b.

**Acceptance.** The brief fits one page and names every unresolved lens finding and each human
read's outcome or open state.

### Task 11: Close (conductor-run; one fold agent; 0.6M)

**Outcome.** One fold agent (`claude-opus-5-5`, `high`) commits its draft, then folds; one
independent `diff-reviewer` read over the fold's diff.
- The post-mortem at the foot of this plan: built and verified, decisions, planning misses and
  execution sittings, and both budgets scored (tokens against the 15M ceiling from
  `session-ledger.ts`; attended time as those two counts).
- `docs/HISTORY.md`: the pass 2a entry, plus STATUS's history-shaped lines moved there.
- `docs/STATUS.md`: present tense, 60 lines or fewer, naming pass 2b with its resume prompt.
- `ROADMAP.md`: pass 2a marked done and out of the live tier; the chain build (§3, with CR9, its
  precondition, and the pilot's gating-class list), the designer theme-guide input, the parent's
  three trial pages, and pass 1b's rule that measuring jobs stay disjoint from the chain's
  reader-stage jobs, all under the first drafting pass's entry; the exemplar gap fills under pass 2b; the scratch-site line
  pointing at the renamed teardown section (CR7).
- The conductor runs the scratch site's dry-run listing (the record's teardown section, step 1) as
  a health check, deleting nothing, and records the result; updates the `docs-reset-initiative`
  memory; opens the PR.

**Acceptance.** Gates: `npm run check:docs && npm run check:arm-indexes`, and the reader chain
gate if any code changed after the last green commit. The PR merges only on Geoff's word.

## Unattended execution

After approval, the pass runs unattended except at the attended points: the no-go report (Task 5,
only on a no-go), the two human reads (Geoff arranges the club-site editor), owner stop 1 (Task
10), and the dry-run listing at the close as a health check. Every other decision is the
conductor's.

**At each session start:** read this plan and the spec; run the one-executor check; confirm
`systemd-inhibit --list` shows `claude-awake`; hold the lid switch
(`systemd-inhibit --what=handle-lid-switch --who=docs-reset-2a sleep 28800` in the background);
arm a self-paced wake-up as the fallback on every wait.

**Stop and ask Geoff** (write the Ledger and STATUS first, one combined question): the 12M flag; a
third `fix` on any task; a task that finds the spec unbuildable; a correctness point still hedged
after an `xhigh` read and one `fable` dispatch; a host CLI version outside the pinned set after the
hold.

**Never:** merge the PR; push to `main` anything but STATUS lines; move a bar, a denominator, or a
counting rule.

**Battery.** On battery at 11 percent: stop the agents, WIP-commit on the branch, write STATUS
with the exact resume prompt.

## Cost lines

| Task | Row (spec "Budget") | Estimate |
| --- | --- | --- |
| 0 | Conductor and close | 0.2M |
| 1 | 1a | 1.3M |
| 2 | The pilot (smoke run) | 0.15M |
| 3 | 1b | 1.3M |
| 4 | 1c | 1.0M |
| 5 | The pilot (runs, judges, reads, record) | 1.05M |
| 6 | The audience format (4a) | 1.0M |
| 7 | The audience record (4b) | 1.5M |
| 8 | The audience review and fold | 2.0M |
| 9 | The exemplar review and fold | 0.7M |
| 10 | Owner stop 1 brief | 0.2M |
| 11 | Conductor and close (the close) | 0.6M |
| conductor | Conductor and close (dispatch and reads across segments) | 0.8M |
| **Total** | | **11.8M** |

## Ledger

| Task | State | Commit | Spend | Notes |
| --- | --- | --- | --- | --- |
| spec | approved | `598902f3`..`e66bbb21` | brainstorm session | Four lenses, fold, verification, second fold, prose fold. Owner rulings O12, B1 to B4; conductor rulings CR1 to CR10. |
| plan | drafted | uncommitted | plan session | Awaiting review and Geoff's approval. |

## Post-mortem
