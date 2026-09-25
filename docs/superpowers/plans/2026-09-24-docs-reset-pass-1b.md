# Docs reset pass 1b: the validation redesign

> **For agentic workers:** seventeen tasks (0 to 16) in five segments. Tasks 1 to 7 are implementer
> chains: `cairn-implementer` (`sonnet`, `high`) implements test-first, `code-simplifier` refines,
> the task's gate runs inside the chain through `cairn-run-gate`, and `diff-reviewer`
> (`claude-opus-5-5`, `high`) reads the diff against the task's acceptance criteria. Tasks 0 and 8
> to 16 are conductor-run: the conductor dispatches the named agents and the reader runner, and
> reads their reports, never diffs, pages, transcripts, or logs. **Execution mode:** segment 2
> (Tasks 2 to 6, three lanes) runs through the `pass-execute-chains` workflow, invoked by name;
> Tasks 1 and 7 run as per-task Agent chains. If the auto-mode classifier refuses the workflow, as
> it refused an edited `pass-execute.js` in pass 1, the lanes run as per-task Agent chains.
>
> **Plan author:** `claude-opus-5-5` at `high` (Geoff, 2026-09-24). The close counts this plan's
> planning misses.

**Date:** 2026-09-24.

**Goal:** run the pre-registered validation of the reader instrument that
[`2026-09-24-docs-reset-pass-1b-validation-design.md`](../specs/2026-09-24-docs-reset-pass-1b-validation-design.md)
specifies, and record a per-class verdict pass 2a can rely on. The spec is the contract: its bars,
scoring rules, sequence, and freeze are fixed. Where this plan and the spec disagree, the spec
wins; stop and report.

**Spec:** the pass 1b spec above, read in full by every executor before its task. The parent spec's
"Amendments from pass 1b" section and the fold records
(`docs/superpowers/research/2026-09-24-pass-1b-spec-fold.md`,
`docs/superpowers/research/2026-09-24-pass-1b-plan-fold.md`) carry the rulings behind it.

**Approved:** Geoff, 2026-09-24, with the freeze-readiness review added to Task 11.

**Scope: core gate only** (O7, Geoff, 2026-09-24). No transfer set, no Sonnet arm, no historical
mining (the planter synthesizes every plant), one tuning round. Everything that gates stays.

**Token ceiling:** 15M, flag at 12M (O8: the lower of 15M and the post-cut high estimate rounded
up to the next whole million, 20M; flag at 80 percent). **Counting rule:** input, output, and
cache-creation tokens count; cache reads are reported separately. Task 6's session ledger script
applies the rule across the conductor's session transcript, every subagent transcript, and the
runner's ledger; the conductor runs it at every checkpoint and every task boundary from Task 9 on.
Pass 1 recorded "about 9M"; under this rule it counted about 18.7M (the mechanics review's
measurement), and the estimate below uses measured figures.

**Budget estimate** (the spec's "Budget" table): 10.6M low, 14.7M mid, 19.8M high. No cuts remain.
At the mid estimate spend is about 9.6M at the freeze, the flag trips during the planted runs, and
the pass closes near 14.7M, under the ceiling with little margin. At the low estimate the flag
never trips. At the high estimate the flag trips during round 0 or round 1, and spend reaches the
ceiling during mapping or planting. **At the flag** the conductor finishes the running task,
writes the ledger with its projection to the close, and asks Geoff one combined question. **O6:**
if spend reaches the ceiling during a gated batch, the batch finishes and the ledger reports the
overrun; no gated batch runs half. Outside a gated batch the conductor stops at the next task
boundary and asks Geoff.

**Checkpoints and STATUS:** at each segment boundary, at any split, at the flag, and before any
owner question, the conductor writes the ledger at the foot of this plan (task states, decisions,
the session ledger's counted spend, next task) and commits one STATUS line to `main` pointing at
it.

**Segments:** 1: Tasks 0 and 1 (pre-flight, report schema). 2: Tasks 2 to 6 in three lanes, with
Task 8 alongside (the build and the pre-freeze authoring). 3: Tasks 7, 9, 10, and 11 (scorer,
round 0, round 1, the freeze). 4: Tasks 12 to 14 (mapping, planting, planted runs). 5: Tasks 15
and 16 (scoring and record, close). Every boundary sits on a commit whose gate is green. The freeze
(Task 11) is the one irreversible step, and segment 3 ends on it: after its tag, any instrument
change burns the plants (spec, "Freeze", "Burns").

**Branches:** cairn-cms `docs-reset-1b` in `.claude/worktrees/docs-reset-1b`. Lanes are worktrees
off `docs-reset-1b` (`docs-reset-1b-export`, `-runner`, `-pathmap`), each carrying its lane's tasks
in order, merged back by the conductor at the segment boundary. **One-executor check** before every
task: `pgrep -f` on the worktree path, `git status` for changes this pass did not author, and
STATUS on `main` for a live session on this branch. A live executor stops the task.

**Models:** implementers `sonnet` at `high`; `diff-reviewer`, the rubric author, the
planting-prompt author, the planter, the plant check, the record author, and the close fold agent
on `claude-opus-5-5` at `high`; readers on `claude-opus-5-5` at its default `medium`; the catch
judge and the adjudicator as headless runner classes on `claude-opus-5-5` at `high`, and the
agreement read as a runner class on `fable` (O2). An `opus` implementer upshift is named per task.
A hedged verdict on a correctness-critical point is re-run on `claude-opus-5-5` at `xhigh`, then
goes to one `fable` dispatch; this never applies to a judge ruling (Task 15).

**Gate economy:** every gate here launches no browser, so it takes the light lane. Each chain's
gate is `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments && npm run check'`
(the type check catches a report-shape change that vitest alone passes). Implementers get the
unit tests and gate green first, then run any live check once, rerunning only on failure (pass 1
amendment 2). Reader and judge concurrency is 4, backing off on `rateLimit` (pass 1 amendment 6).

## Global constraints

- The spec's bars and rules are fixed. No task may change a threshold, a pool, a counting rule, or
  the sequence. A task that finds the spec unbuildable stops and reports.
- **Bans** (spec, "Tuning"): no tuning change, prompt, rubric, or job text may name a page, a
  defect, a job fact, or any development-set item (D01 to D19, P01 to P17, F1 to F6, R1 to R4).
  Task 1's ban grep is the mechanical floor over every such text; the `diff-reviewer`, given the
  full development-item list, is the check.
- **Blindness.** The planting-prompt author and the planter never see a development record
  (`docs/internal/record/2026-09-23-docs-reset-{validation,planted-defects,baseline}.md`, pass A's
  plan and ground truth), a job text, a reader prompt, or a report. The plant check sees the plant
  record, the code export, and `dev-items.json` (id, subject, page) only. Each blind agent works in a
  scratch directory holding copies of its granted inputs, and after it returns, Task 6's transcript
  audit runs over its transcript; a hit invalidates its output (spec, "Blindness is audited").
  After the freeze, a blind agent's dispatch is the fixed wrapper "Read `<frozen path>` (sha256
  `<hash>`) and follow it. Your inputs are under `<dir>`." and nothing else.
- **Judges** run only through the runner as judge classes over packets that Task 6's builder
  makes. No judge is dispatched as an Agent, and no judge is re-run after its rulings are visible
  except under the runner's rerun rule.
- The conductor has read the development set, so it never writes a prompt, rubric, criterion, job
  text, or plant; it dispatches the agents that do, with the spec's input list.
- No published docs page changes in this pass. Records go under `docs/internal/record/`;
  post-freeze artifacts go under `scripts/docs-readers/post-freeze/` or `docs/internal/record/`,
  and each enters the chain (spec, "The post-freeze chain").
- Every new script under `scripts/docs-readers/` carries TSDoc per the repository's comment gate and
  a unit test under `src/tests/unit/docs-readers-*.test.ts`. New fixtures go under
  `scripts/docs-readers/fixtures/`, never under `src/`.
- **Page pin:** every job's pages and the planter's export come from `3a7485dd` (`main` at the
  pass's start, before any pass 1b file), except the held-out pre-fix pins. Task 0 confirms it.

## Review focus

The plan review checks: that each task's acceptance criteria name the fixture and the failure
that proves them (no vacuous pass: an empty map, zero findings, an unstamped report); that the
build tasks deliver every mechanism the spec's sequence needs before the step that needs it; that
blindness holds at every dispatch; and that the freeze manifest and the chain cover every
score-affecting input.

## Pre-flight findings (2026-09-24, plan author and the plan reviews)

- The report schema is `REPORT_SCHEMA` in `scripts/docs-readers/lib/runner.ts:44-61`; `checks: []`
  is hard-coded at `runner.ts:126`. `readerReport` (`lib/transcript.ts:638-650`) whitelists report
  fields. Quote verification is `lib/verify.ts:68-93`: a quote verifies at its line, inside a
  five-line wrap, or one line off; two lines off fails.
- Denial excerpts (`lib/transcript.ts:474-477`) are truncated to 400 characters with `...`, so a
  long command is not valid JSON. The only resolved model id is `modelUsage` on the result event
  (`lib/types.ts:84`); the init event's `model` is not captured.
- No automatic rerun exists; pass 1 reran by hand from `batches/validation-rerun.json`. A
  batch-level stop marks unstarted jobs `notStarted` (`runner.ts:239-241`).
- The reader image (`scripts/docs-readers/Containerfile`) builds on `node:24-slim` with no git.
- `lib/prepare-class.ts:414` excludes `docs/internal/record`, `docs/superpowers`, and
  `scripts/docs-readers` and rejects any `.git` (`:486`, `:573`), but not
  `src/tests/unit/docs-readers-*` (17 files). `prepare-validation.ts:51` pins the scripter's
  current pages to `HEAD`, and `:84` throws with no planted directory. `prepare-baseline.ts:143`
  pins the core developer to `HEAD`; `CONTRACT_PAGES` (`:45-62`) pins the pre-fix commits. Docs
  sets copy from the working tree.
- `validateClass` (`lib/class-schema.ts:90`) rejects unknown fields, so absent lists go in batch or
  job files; `BATCH_FIELDS` (`lib/batch.ts:10`) rejects an unknown `gated` key. Run setup lives in
  `run.ts` `setUpRun` (`:219-245`).
- The per-run copy (`lib/podman.ts`, `cpSync` in `run`) does not preserve timestamps.
- `~/.claude/workflows/docs-page-chain-v2.js:389-390` types `stalls` and `assumed` as strings and
  never reads `diverged[]`.
- Pass 1's saved reports: `~/.cache/docs-readers/results/validation-20260924/report.json` and
  `validation-rerun-20260924/report.json`; its prepared trees sit in
  `~/.cache/docs-readers/prepared/validation/`.

### Task 0: Pre-flight

**Conductor-run.** One `sonnet` agent at `medium` lists every checkable factual claim in Tasks 1 to
7 (paths, line numbers, function names, current behaviors) and checks each against HEAD, returning
the ones that fail, plus every open choice a task leaves its implementer. The conductor amends the
plan and pins each open choice in the dispatch. The same pre-flight runs again before Tasks 9 and
12, over their segments. In the same task:
- One `sonnet` agent at `medium`, which may read the development records, extracts
  `scripts/docs-readers/fixtures/dev-items.json`: each of the 46 development items (D01 to D19, P01 to P17, F1 to F6, R1 to R4)' id, one-line
  subject, and page.
- The spec folds' scratch simulations are committed at plan approval under
  `docs/superpowers/research/2026-09-24-pass-1b-sims/` (tmpfs would lose them); Task 0 confirms
  they rerun.
- The pre-flight pins the chain file's path (shared by Tasks 3 and 5) and the agreement sample
  file's format (Task 6 builds from it, Task 7 writes it) into both dispatches.
- A script confirms every development page is byte-identical between pass 1's validation commit
  and the `3a7485dd` pin.

**Acceptance.** The pre-flight report is attached to the ledger; each failed claim is amended or
recorded as moot. `dev-items.json` has 46 entries, each with a subject and a page. The
page-identity check passes, or the ledger records each differing page and the pin is ruled on
before Task 1.

### Task 1: The report schema and shared types (4 deliverables)

**Outcome.**
1. **Shared types and batch parsing.** `lib/types.ts` carries every type the later tasks share:
   the report entry shapes, `Job.absent`, `Job.commit`, `Batch.gated`, the report stamp
   `freeze: { tag, manifestHash, chainHead }`, `JobReport.attempts[]` with each attempt's cause,
   and the judge rulings shapes (a catch ruling per plant, an adjudication per item: class, subject
   group, ruling). `lib/batch.ts` accepts the new fields and still rejects unknown ones. No other
   task edits `lib/types.ts` or `lib/batch.ts`; a task that needs a change reports it.
2. **Report schema and parsing.** The reader report carries `steps[]` (a `page:line` quote and the
   decision it supported), `diverged[]` (the page quote, what the reader did instead, and why), and
   `blockedBy` on each `stalls[]`, `assumed[]`, and `diverged[]` entry (a denied command, an absent
   path, or null), per the spec's "Tuning". `readerReport` parses them, and the init event's model
   id is captured on the job report. One shared loader reads pass 1's saved reports, turning each
   string entry into `{ text, blockedBy: null }`. `ruleCandidates[]` stays.
3. **Quote verification** covers every `steps[]` and `diverged[]` quote exactly as it covers
   existing quotes.
4. **The prompt and the ban grep.** The reader prompt explains each new field in neutral terms. A
   ban-grep module flags any text naming a subject, page, or id from `dev-items.json`; a unit test
   runs it on the prompt, and a CLI runs it on any file.

**Files.** `scripts/docs-readers/lib/types.ts`, `lib/batch.ts`, `lib/runner.ts` (schema and prompt
only), `lib/transcript.ts`, `lib/verify.ts`, a ban-grep module, their tests.

**Acceptance.**
- A fixture `steps[]` quote one line off verifies; one two lines off fails the run, as an existing
  quote would.
- A fixture report missing `steps[]` fails schema validation for a new run and parses through the
  shared loader for a saved pass 1 report.
- A `diverged[]` entry without its page quote fails validation. A `blockedBy` of null validates, a
  string round-trips, and a new-run entry missing the field fails.
- A batch file with `gated: true` and a job with `absent` and `commit` parse; a batch with an
  unknown key is rejected.
- The ban grep flags a fixture sentence carrying a `dev-items.json` subject and passes the
  shipped prompt.
- Gate: the chain gate in the header.

### Task 2: Export and preparation (lane `docs-reset-1b-export`; 3 deliverables)

**Outcome.** Every rule in the spec's "The export":
1. **The commit.** Git is in the reader image. Each prepared tree is built in this order: overlay,
   normalize every file's mtime to the fixed timestamp, then one synthetic commit under a pinned
   neutral author, committer, message, and date. A one-commit-and-clean check replaces the `.git`
   rejection.
2. **Exclusions and absent lists.** `docs/HISTORY.md`, `docs/STATUS.md`, `ROADMAP.md`,
   `docs/internal/docs-friction-log.md`, `src/tests/unit/docs-readers-*`, and every file under
   `scripts/docs-readers/fixtures/` join the gated repository export's and the planter's export's
   exclusions. The planter's export is its own entry point. Each job's absent list is derived from
   its builder's exclusions and written into its batch or job file.
3. **Pins and trees.** Every job's pages come from `git archive` at a named commit (the header's
   page pin), the scripter's current pages and the core developer's tree included; neither `HEAD`
   nor the working tree is ever a source. Each of the six development jobs builds a control-only
   tree when no planted directory exists. Development plants stay at `planted/<job>/`; test plants
   go to `$XDG_CACHE_HOME/docs-readers/planted-1b/<job>/`.

**Files.** `scripts/docs-readers/Containerfile`, `lib/prepare-class.ts`, `prepare-validation.ts`,
`prepare-baseline.ts`, their tests. **Upshift:** `model: opus`, since the commit-after-overlay
ordering is the one leak the mechanics review found.

**Acceptance.**
- A planted tree, inspected with `git log` and `git diff` inside the image, shows one commit, a
  clean status, and no trace of the control text at any planted line. A fixture tree with two
  commits, and one with a dirty status, is rejected.
- A control tree and a planted tree of one job carry identical commit metadata; the message names
  neither "planted" nor "control"; no host email appears in either tree.
- Every file in a prepared tree carries the fixed mtime.
- A fixture builder with exclusions X and Y writes exactly X and Y into the job file's absent
  list, and neither path is in its tree. A repository export and the planter's export contain none
  of the excluded paths above, no `docs/internal/record/` file, and no `docs-readers` test file;
  the planter's export has no `.git`.
- For each of the six development jobs, a test fails on a `HEAD` pin or a working-tree source, and
  a control-only tree builds with no planted directory.
- The image rebuilds, and its digest is in the task report for the freeze.
- Gate: the chain gate, then one live preparation of a planted and a control tree into a scratch
  root, never `prepared/validation/` (pass 1's trees stay intact for round 0), run once.

### Task 3: The runner (lane `docs-reset-1b-runner`; 4 deliverables)

**Outcome.**
1. **The freeze tool.** `freeze.ts` writes the spec's manifest: sha256 over every file under
   `scripts/docs-readers/` except `post-freeze/`, plus the image digest, the CLI version, the model
   ids, every job's page commit, and every seed. `--verify` checks a tree against it and names each
   drifted input.
2. **Gated batches.** Before any container starts, `run.ts` refuses a batch marked gated when
   verification fails. The runner stamps `freeze: { tag, manifestHash, chainHead }` into every
   report of a gated batch and leaves the field unset on an ungated one; the chain head is the
   sha256 of the chain file (Task 5), which Task 11 creates with a genesis entry at the freeze, so
   every gated report carries a head. After a run, the init event's model id is
   compared with the manifest, and a mismatched run is unverified.
3. **The automatic rerun.** An unverified, crashed, timed-out, or report-less run gets exactly one
   rerun in the same batch. Every attempt is kept with its cause, and the final attempt is marked.
4. **Batch-level stops.** A rate-limit, authentication, or budget stop is recorded on every job it
   left unstarted and is not an attempt; resuming the batch runs only those jobs. The per-run copy
   preserves the prepared tree's timestamps.

**Files.** `scripts/docs-readers/freeze.ts`, `run.ts`, `lib/runner.ts`, `lib/podman.ts`, their
tests.

**Acceptance.**
- Changing one byte of any manifest input makes a gated batch refuse to start and name that input;
  an ungated batch still runs, and its reports carry no `freeze` field.
- Every report of a gated fixture batch carries the stamp, with the chain file's hash as
  `chainHead`.
- A fixture executor that fails verification once shows two attempts, the second final; one that
  fails twice shows two attempts and a final failure; one that passes shows one attempt. A
  timed-out and a report-less fixture each get one rerun.
- A fixture rate-limit stop records the stop on each unstarted job, and a resume runs only those
  jobs without consuming an attempt.
- A fixture init event with a model id other than the manifest's marks the run unverified.
- A file's mtime inside a fixture container equals the prepared tree's.
- Gate: the chain gate.

### Task 4: Path map, harness filter, and the operating characteristic (lane `docs-reset-1b-pathmap`; 4 deliverables)

**Outcome.**
1. **`path-map.ts`:** sections (H2 and H3, innermost heading, the lead section, fences skipped),
   quote assignment by verified span (a span crossing a heading counts for neither), the on-path
   rule with its three-, two-, one-, and zero-verified-run cases, the 60 percent ceiling and its
   narrowing (output as line ranges), the thin-map widening in the spec's order stopping at the
   ceiling, each map's on-path share, and a capacity function (the spacing rules, less the
   mapping-run finding spans).
2. **The proxy map:** a mode that builds the spec's tuning proxy from any verified quote in any
   field of a verified Opus control run, one run sufficing.
3. **`harness-filter.ts`:** the `blockedBy` match rule, path and command halves as the spec states,
   against the job's absent list and the run's denial record, with a tolerant parse of truncated
   excerpts; every excluded item listed; never applied to catch scoring.
4. **`oc-curve.ts`** (seed 20260924): the pass 1 refit, the 31-of-42 table, the class floors, the
   stability figures, and the thresholds at any achieved per-job and per-class count, written as a
   thresholds file the scorer reads.

**Files.** The three scripts, their tests, fixtures.

**Acceptance.**
- A fixture page with nested H3, a lead section, a fenced `## ` line, and a quote crossing a
  heading yields the expected sections.
- Fixture runs yield the spec's map for 2-of-3, 1-of-3, two verified runs, one verified run
  (recorded as such), and a ceiling-crossing layout (line ranges within 40 lines of a two-run line,
  inside all-three sections). Zero verified runs, or an empty `steps[]` set, yields no map and a
  recorded no-plants result, never a crash.
- A thin fixture map widens in quote-count order and stops before the section that would cross
  60 percent; the capacity function returns six for a map that holds only six under spacing.
- Proxy mode: one verified quote in `assumed[]` puts its section on the map; an unverified quote
  and a Sonnet run's quote do not.
- Harness filter: each half matches its fixture and rejects a near miss (a path sharing a prefix
  but not a directory; a command with the same first word and a different first argument). A
  truncated excerpt still yields its first word and argument, or sends the item to the adjudicator
  with the reason recorded. A missing `blockedBy` is treated as null. A job with no absent list
  stops scoring with the job named.
- `oc-curve.ts` matches the spec's exact figures to two decimals and its simulated stability
  figures within 0.02 at the fixed seed; its thresholds match the spec's list (24 at 32, 25 at 33,
  none at 34, 26 at 35, 27 at 36, 31 at 42; floors 4 of 7, 9 of 14, 4 of 6, 3 of 5, 9 of 13,
  8 of 12; no floor at one plant).
- Gate: the chain gate.

### Task 5: The validity script and the chain (lane `docs-reset-1b-pathmap`, after Task 4; 2 deliverables)

**Outcome.**
1. **`plant-validity.ts`:** the spec's validity check: each plant inside the plantable region (the
   on-path sections, or the narrowed line ranges), the spacing rules, no stale-path plant on an
   absent-list path, no plant on a mapping-run finding span, and a difference from the control page
   at its line.
2. **`lib/chain.ts` and its CLI:** the spec's post-freeze chain: append an entry (path, sha256,
   commit, prior entry hash), verify every entry against its file and the linkage, and return a
   path's latest entry. Entries never change.

**Files.** The two modules, their tests, fixtures.

**Acceptance.**
- Validity: one violating fixture per rule is rejected (outside the region, including outside a
  narrowed range inside an on-path section; three plants in a section; two within ten lines; five
  on one page; a stale path on the absent list; a plant on a finding span; no difference from
  control), and a valid fixture set passes.
- Chain: an entry whose file changes after append fails verification with the path named; a
  broken link fails; a second entry for a path is returned as latest and the first stays.
- Gate: the chain gate.

### Task 6: Judges and ledgers (lane `docs-reset-1b-runner`, after Task 3; 4 deliverables)

**Outcome.**
1. **Judge classes.** The catch judge, the adjudicator (both `claude-opus-5-5`), and the agreement
   read (`fable`) run through the runner as classes whose container mounts only a packet
   directory. Each reads its frozen prompt, returns rulings through `--json-schema` in Task 1's
   rulings shape, and is unverified unless every packet item is ruled exactly once; the rerun rule
   and the gated stamp apply as for readers.
2. **`judge-packets.ts`:** builds catch, adjudicator, and agreement packets. A catch packet holds
   the plant entries (subject, criterion, near miss), the planted page, the job text, and the run's
   catch fields; an adjudicator packet holds the job text, the catch fields, and the published docs
   tree and code at the pinned commit. Items carry opaque ids; a key file outside the packet maps
   them to runs, fields, and plants and records the sha256 of every input read. No packet carries a
   model id, a run id, a batch name, the reader prompt, `modelUsage`, or any `ruleCandidates[]`
   entry; `checks[]` appears only when non-empty. Agreement packets are built from the scorer's
   sample file.
3. **`session-ledger.ts`:** sums counted tokens (input, output, cache creation; cache reads
   separate) over a session transcript, its subagent transcripts, and the runner's ledger,
   deduplicated by message id.
4. **`audit-transcripts.ts`:** scans a subagent transcript for tool calls touching a forbidden root
   (the pass worktree and the main checkout, `~/.cache/docs-readers/`, other session transcripts)
   or any path outside the agent's granted directory, and reports each hit.

**Files.** `scripts/docs-readers/classes/judge-*.json`, `lib/class-schema.ts`, `lib/runner.ts`
(judge mode), `lib/podman.ts` (packet mount), the three scripts, their tests. `lib/runner.ts` and
`lib/podman.ts` were changed in Task 3, which has merged into this lane before this task starts.

**Acceptance.**
- A fixture run whose only mention of a plant is in `ruleCandidates[]` yields a catch packet
  without it; a packet contains no model id, run id, batch name, or `modelUsage` key; `checks[]` is
  present only when non-empty.
- A held-out catch packet (a pre-fix contract page, a held-out criterion, a fixture run) builds
  and passes the same checks as a planted-run packet.
- A fixture judge output missing one item's ruling is unverified and rerun once.
- The ledger script's total over a fixture session with a repeated message id counts it once and
  reports cache reads apart.
- The audit flags a fixture transcript that reads `docs/internal/record/` and passes one confined
  to its granted directory.
- Gate: the chain gate, then one live judge run on a fixture packet, run once.

### Task 7: The scorer (after Tasks 2 to 6 merge; 4 deliverables)

**Outcome.** `score.ts`, in the spec's terms:
1. **Modes and integrity.** Development mode is the only way to score an unstamped report; it reads
   only development batches (pass 1's saved reports and round 1), labels its output, and can never
   emit a bar or class verdict. Gated mode requires a gated batch, a stamp matching the manifest at
   the tag, and a verified chain (every input it reads matches its latest entry, and no entry
   postdates a report that read it). Both modes read final attempts and apply the rerun outcomes.
2. **Bars and verdicts.** The pools as the spec states them; thresholds read from the thresholds
   file; the no-threshold branches; precision over every planned Opus mapping run, an unverified
   one counting every catch-field item false; the per-class verdict; an all-classes-failed flag
   (O5).
3. **Agreement.** The sample draw (the spec's pools, `sha256` ordering, stratum balance where the
   pool allows), written as a sample file before any Fable ruling exists; pooled kappa as the spec
   defines it; the five-item test and its fallback; then Fable's replacements, after which the bars
   are computed.
4. **Development and reported measures.** On-map catches and false findings per verified Opus
   control run for rounds 0 and 1; the held-out found rule; every reported measure in the spec's
   list.

**Files.** `scripts/docs-readers/score.ts`, any `lib/score-*.ts` modules, their tests, fixtures.

**Acceptance.**
- A pass 1 saved report scores in development mode; development mode on a test-set batch refuses,
  naming the batch; an unstamped gated report is rejected in both modes, and a report with a stale
  `manifestHash` is rejected with its path named; a fixture plant record changed after its chain
  entry makes the scorer refuse and name it.
- A fixture set reproduces a hand-computed pass and fail on each bar. An agreement failure marks
  all four classes advisory; one class's precision failure marks only that class advisory. A false
  finding placed in a tuning control run changes no class's precision. Zero findings on a class is
  a precision pass reported as zero, never a divide by zero. An unverified mapping run with three
  items counts three false findings.
- At 40 plants the scorer applies the fixture thresholds file's value; at 34 plants every class is
  advisory and the achieved count is given; a class with one plant has its floor reported and
  validates on the rest.
- A stratum with fewer than five off-mode items falls back to raw agreement and says so; a pool too
  small to balance is drawn unbalanced and says so; agreement is computed before replacement and
  the bars after.
- A held-out defect caught in two of three runs is found; in one of three it is not.
- Gate: the chain gate.

### Task 8: Pre-freeze authoring (conductor-run; runs alongside segment 2, after Task 1)

**Conductor-run.** Two authors, neither the conductor, write every prompt the freeze lists, under
`scripts/docs-readers/prompts/`:
- **The rubric author** (`claude-opus-5-5`, `high`, may read the development set, including pass
  A's ground truth): the catch judge's, the adjudicator's, and the agreement read's prompts and
  rubrics (item classification, subject grouping, the real, false, and harness rulings, the
  spec's "Real defect" definition verbatim), fitted to Task 1's rulings shape; a catch criterion,
  a one-line subject, and a near miss for each of pass 1's 17 plants and each of the nine held-out
  defects; and `dev-plants.json` (page, line, id per pass 1 plant) for the proxy scoring.
- **The planting-prompt author** (`claude-opus-5-5`, `high`, blind): the planter's and the plant
  check's prompts and the plant-type definitions, from the spec alone.

**Acceptance.**
- The ban grep passes every judge and planting prompt; the criteria files are development inputs,
  read only by judges, and never enter a reader or planter input.
- The planting-prompt author's transcript audit is clean, run once Task 6's audit script has
  merged (lane B), before the freeze.
- A `diff-reviewer` read of both sets against the spec's "Scoring" and "Planting" and the bans,
  given the full development-item list, returns accept.

### Task 9: Round 0

**Conductor-run.** The judges, as ungated runner batches, rule pass 1's saved Opus reports (catch
judge on its planted runs, adjudicator on its control runs), and the scorer, in development mode,
rescores them under the proxy map. Pass 1's jobs carry no absent lists, so Task 2's derivation
is run over pass 1's prepared trees first and the derived lists are named in the round-0 record.

**Acceptance.**
- Round 0's record, `docs/internal/record/2026-09-24-docs-reset-1b-tuning.md`, gives each
  development job's proxy map, on-map plant count, on-map catches, and false findings per verified
  Opus control run, every number from the scorer's output file.
- Any judge-prompt defect found is fixed, logged with the misruling it fixes, reviewed by a
  `diff-reviewer` for the bans, and round 0 is rescored.

### Task 10: Round 1

**Conductor-run.** Round 1 runs the four adopted changes (Tasks 1 and 2) on the development batch:
each development job once planted (pass 1's plants) and once on control, `claude-opus-5-5`, 12 runs,
judged and scored in development mode. No further change is tried (O7).

**Acceptance.**
- Every run verifies or carries the runner's rerun; the tuning record states round 1's on-map
  catches and false findings per control run beside round 0's, from the scorer's output.
- A judge change made here is applied to rounds 0 and 1 alike and logged.

### Task 11: The freeze

**Conductor-run.** Build the development mapping batch (control-only trees at the page pin, absent
lists) and the held-out batch, run `freeze.ts` over every input, commit the manifest, and tag
`docs-reset-1b-freeze`. Every gated batch sets `budgetTokens` above its expected spend, so the
ledger and the flag, not the runner, govern spend. A `diff-reviewer` reads the manifest against the
spec's "Freeze" list.

**Freeze-readiness review (Geoff, 2026-09-24),** before the tag: one adversarial
`claude-opus-5-5` reviewer at `high`, which had no part in the build, reads the built code and
the authored prompts against the spec. It tries to break the gate, not to list polish:
whether each blind agent's inputs actually exclude the development records; whether the
runner's refusal, the stamp, the chain, and the scorer's gated mode reject drifted, unstamped,
or out-of-chain input (it runs each check against a crafted bad fixture); whether any prompt,
rubric, or packet leaks a development item or a reader's model or run id; and whether the
export leaks a plant through git, mtimes, or an excluded path. A blocker is fixed and re-read
before the tag. Findings go to `docs/superpowers/research/2026-09-24-pass-1b-freeze-readiness.md`.

**Acceptance.**
- The manifest lists by path every input in the spec's list, including each prompt, rubric,
  criteria file, and script from Tasks 1 to 8; the reviewer names none missing.
- The freeze-readiness review returns no open blocker, and its file is committed before the tag.
- A dry `freeze.ts --verify` passes on the tagged tree.
- The chain file exists with a genesis entry (the manifest hash) committed with the tag, and a
  fixture report stamped against it passes the scorer's gated-mode integrity check.
- The three held-out catch packets (pre-fix page plus held-out criterion) are built dry from a
  fixture run and pass the packet checks, before the tag.
- Checkpoint: ledger with the session ledger's figure, STATUS line, and the flag check.

### Task 12: Mapping

**Conductor-run.** The runner runs the gated mapping batch: each development job three times on
`claude-opus-5-5` on control pages, plus the scripter's three held-out runs on the pre-fix pins.
The held-out runs carry their own job id (`scripter-heldout`), which `path-map.ts`, the precision
pool, and the adjudicator skip. `path-map.ts` builds each job's map, and the maps, the batch's results index, and the finding spans
to avoid enter the chain.

**Acceptance.**
- Every gated report carries the stamp; every rerun and stop is the runner's and is listed.
- Each job's map, on-path share, capacity, and any ceiling or thin-map action is recorded.

### Task 13: Plant

**Conductor-run.**
1. The planter (blind wrapper; the planter's export, the maps, the spans to avoid) synthesizes the
   plants and writes the test plant record
   `docs/internal/record/2026-09-24-docs-reset-1b-planted-defects.md`.
2. `plant-validity.ts` runs; the plant check (blind wrapper) verifies each proof and the
   no-shared-subject rule; both agents' audits run; failing plants are replaced by the planter.
3. Task 2's preparation builds each planted tree. The planted batch file, each tree's digest, and
   the plant record enter the chain.
4. `oc-curve.ts` recomputes every threshold at the achieved counts; the thresholds file enters the
   chain before Task 14.

**Acceptance.**
- Every plant passes the validity script and the plant check; the record lists replacements and
  each plant's subject.
- Each job carries seven plants, or the count its map record allows; at least four of seven are
  semantic, and a job short of seven loses token plants first.
- Every blind agent's audit is clean or its output was redone.
- One planted tree, inspected inside the image, shows one commit and a clean `git diff`.
- The thresholds file and every artifact above verify against the chain.

### Task 14: Planted runs

**Conductor-run.** The runner runs the gated planted batch: three `claude-opus-5-5` runs per
development job. O6 governs the ceiling.

**Acceptance.** Every gated report is stamped; reruns and stops are listed; the batch's
`stopReason` is `complete`; its results index enters the chain.

### Task 15: Scoring and the record

**Conductor-run.** The judges run as gated runner batches: the catch judge on every planted and
held-out run, the adjudicator on every mapping run. Their rulings enter the chain. The scorer, in
gated mode, writes the agreement sample file, which enters the chain; the agreement read rules it;
the scorer computes every bar and reported measure. One `claude-opus-5-5` record author at `high`
writes `docs/internal/record/2026-09-24-docs-reset-1b-validation.md`: the per-class verdict under
the spec's failure rule, every bar with its numbers, every reported measure, each rerun and stop,
and the in-sample, synthesized-only, and contamination labels the spec requires. A `diff-reviewer`
checks the record against the scorer's output only. No ruling or verdict is re-litigated: a
suspected judge defect is recorded as a finding for pass 2a.

**Acceptance.**
- Every number in the record traces to the scorer's committed output file.
- The record names each class validated or advisory, with the cause.
- If every class failed, the pass stops here and reports to Geoff before pass 2a (O5).
- Checkpoint.

### Task 16: Close

**Conductor-run, one fold agent** (`claude-opus-5-5`, `high`), one independent `diff-reviewer`
read. The post-mortem at the foot of this plan (built, verified, decisions, planning misses and
attended-time counts, the session ledger's final figure); the `docs/HISTORY.md` entry, which also
corrects pass 1's recorded spend to about 18.7M counted; `ROADMAP.md`'s docs reset entry (pass 1b
done, pass 2a next with its inputs: the per-class verdicts, Opus-only trial readers, the labeled
set, the trial redesign the spec hands it, and the v2 chain's string-typed `stalls` and `assumed`
that ignore `diverged[]`); STATUS naming pass 2a; the `docs-reset-initiative` memory. The conductor
then brings Geoff a program budget for the rest of the reset (parent amendment): a lean default of
pass 2a without the formal chain-depth trial, a minimal page chain that grows only on reader
evidence, and a measured per-page target, drawn from this pass's ledger. Geoff sets the program
ceiling.

**Acceptance.**
- The regression batch passes a dry check: its batch files parse and every prepared tree exists.
  No reader runs.
- `git diff --name-only docs-reset-1b-freeze..HEAD` intersected with the manifest's paths is empty,
  and `freeze.ts --verify` passes at HEAD; the `diff-reviewer` confirms both.
- The program budget, with its per-page figures from this pass's ledger, is in the ledger and put
  to Geoff.
- Gates: `npm run check:docs`, `npm run check:arm-indexes`, and the chain gate.
- The PR merges only on Geoff's word.

## Ledger

| Task | State | Commit | Spend | Notes |
| --- | --- | --- | --- | --- |
| spec | done | `30083f27`..`da97461b` | brainstorm session | Spec drafted, five lens reviews, fold, verification, second fold. Owner rulings O1 to O4 (Geoff, 2026-09-24). |
| plan | approved | `dc37e38b`, fold at `64ccc784` and after | plan session | Three plan reviews and a spec prose review folded (`2026-09-24-pass-1b-plan-fold.md`). O1 revised; O5 and O6; conductor rulings P1 to P11; then O7 (core gate only) and O8 (ceiling 15M, flag 12M). |
| plan gate | approved | this commit | planning session: subagents about 2.5M by the Agent tool's figures (cache reads included, so an overstatement under the counting rule); the conductor's figure is in its `/cost` | Geoff approved 2026-09-24 and asked for further adversarial review; the conductor judged more plan review past diminishing returns (findings fell from 70 to 2 majors across rounds) and added one freeze-readiness review to Task 11 instead. Planning questions to Geoff: 12 (not scored). Next: Task 0 in a fresh `claude-opus-5-5` session at `medium`. |
| 0 | done | this commit | three `sonnet` agents, about 0.38M by the Agent tool's figures (cache reads included) | Pre-flight record `docs/superpowers/research/2026-09-24-pass-1b-preflight.md`: two failed claims amended (`setUpRun` lines; 46 development items, not 50, a planning miss), cross-task pins for Tasks 1 to 7. Sims rerun clean and match the spec. 41 development pages identical between `b2756399` and `3a7485dd`; the pin stands. |
| 1 | done | `5832cc83`, `ff211a21`, `7b0451ca` | about 0.89M by the Agent tool's figures (implementer 0.67M over two rounds, simplifier 0.08M, reviewer 0.14M plus re-read) | `diff-reviewer` fix (4 blocking: `Attempt` kept no per-attempt result, no agreement rulings shape, step and diverged quotes skipped the unread-page check, ban grep missed hard-wrapped subjects), then accept. The fix round lost its API connection once and resumed on its warm edits. Carry to the close: `reverify.ts` now yields no structured report on pass 1 transcripts (round 0 rescores from saved reports, so harmless); the ban grep over-flags some ordinary four-word runs and `contributing`, which is safe for a floor. |
| seg 1 | closed | `7b0451ca` | counted spend needs Task 6's ledger script; the Agent figures above include cache reads | Segment 2 runs as per-task Agent chains in three lanes, not `pass-execute-chains`: the workflow always runs `scripts/checks/gate-tier.mjs`, which replaces the plan's light gate with the scripts tier's full `npm test` (browser), and that dies under the light lane. Task 8 starts alongside. |
| 8 | accepted, audit pending | `320ca668`, `d8d9a715`, `2a637e20`, `0d22793c` | rubric author 0.41M, blind author 0.10M, blind editor 0.08M, reviewer 0.15M plus re-read (Agent figures) | `diff-reviewer` fix: two development-set echoes the ban grep missed (a plant-type example paraphrasing P01; the adjudicator's "does not exist" example restating pass 1 evaluator false positives). Fixed by the rubric author and by a fresh blind editor that moved every planting example to an invented image-library domain; then accept. The blind agents' transcript audits run once Task 6's audit script merges. Carry to Task 6: the reviewer's packet requirements (`~/.cache/docs-readers/pass-1b-audit/task6-packet-requirements.md`). Carry to Task 13: name the published docs roots in the blind input directory. |
| 2 | accepted (lane) | `33b008bd`, `a9d0585a`, `bd5da873`, `77e2d7c1` on `docs-reset-1b-export` | implementer (opus) 0.63M over two rounds, simplifier 0.12M, reviewer 0.17M plus re-read (Agent figures) | `diff-reviewer` fix (3 blocking, each invisible at fixture scale: git auto-maintenance repacked `.git` after the mtime normalize; the index's inode data singled out the overlaid page; inclusion-built trees recorded `[]` absent lists). Fixed, then accept: 0 off-time paths over 74,365, all index inodes 0, absent lists derived from tracked-but-omitted paths. Conductor rulings: the reviewer's absent-list reading stands; `repository.json` gains read-only git (a prefix allowlist cannot block git's write flags, which adds no capability beyond Edit plus `npm test`). Image `55df4363f36e…` (`localhost/docs-reader:33dc7311993d`). |
| 3 | accepted (lane) | `9e66e714`, `b8c1c39b`, `6aa0eca7` on `docs-reset-1b-runner` | implementer 0.91M over two rounds, simplifier 0.09M, reviewer 0.30M over two reads (Agent figures) | `diff-reviewer` fix (7 blocking: untracked files escaped `--verify`; a gated job without `prepared` or `commit` was accepted; a job cut by a batch-level stop ended final and unresumable; renamed transcripts broke `reverify` and `live-checks`; no `--verify` alias; string seeds became NaN; a missing model silently disabled the model check). Conductor rulings: the reviewer's stop ruling (a stop-cut run is no attempt; `JobReport.pendingCause` added to `types.ts`, the one authorized edit outside Task 1); the chain head is taken at gate time. Then accept. The export lane merged into the runner lane cleanly; merged baseline gate 343 tests green. |
| 4 | accepted (lane) | `b94ec89c`, `b9acbb09`, `04a9ef44`, `7e514247` on `docs-reset-1b-pathmap` | implementer 1.42M over three rounds, simplifier 0.10M, reviewer 0.49M over three reads (Agent figures) | `diff-reviewer` fix (6 blocking: no lead section; H4 content orphaned; capacity capped per range, not per section; CLI misread batch reports; two tests that could not fail), then a second fix (a batch report without `--run`, or a mistyped `--run`, silently built a wrong map), then accept. The oc-curve figures held under the reviewer's own 0.0001-step ICC sweep. Conductor pins: the lead section is `level: 1` with the H1 text; narrowing uses every verified run at stage 1 and `min(2, verifiedRuns)` at stage 2; widening stops at capacity 7 or the 60 percent crossing. |
| 5 | accepted (lane) | `8fc55d66`, `29e1df58`, `f907775b` on `docs-reset-1b-pathmap` | implementer 0.54M over two rounds, simplifier 0.09M, reviewer 0.12M plus re-read (Agent figures) | `diff-reviewer` fix (3 blocking: the stale-path rule read `original`/`planted` as bare paths, so it never fired on a real prose plant, and its fixture was vacuous; the heading rule caught only H2 and H3). Conductor pin: a plant's `page` is prepared-tree-relative, the scripter's carrying its bundle folder. Taken with the fix: a record-vs-page equality check on every plant. Then accept. |
| checkpoint | budget question to Geoff | this commit | counted about 8.7M (session ledger over the conductor session and 23 subagent transcripts; the runner ledger's 3.19M is pass 1's, its only pass 1b entry a 11k live judge run) | Task 6 in its fix round (11 blocking: no `run.ts` judge mode, the ledger ignored `--since` on runner entries, audit bypasses, `docs/internal` counted as published, two packet leaks, string entries lost their text, keys did not trace items to runs). The blind audits stand: the reviewer read both transcripts call by call. Projection to the close: about 19.5M (segment 2 remainder 1.2M, Task 7 2M, rounds 0 and 1 1.9M, freeze 0.6M, mapping 1M, planting to close 4M), near the plan's high estimate. The driver is reviewer fix rounds, each on a real defect (every build task drew a `fix`; 36 blocking findings across Tasks 1 to 6). The flag (12M) has not tripped; the question goes to Geoff now because the projection crosses the 15M ceiling during mapping. |
| ruling | O9 (Geoff, 2026-09-25) | this commit | | Geoff raised the ceiling to 21M, flag at 17M, and the full sequence runs to the per-class verdict. O6 applies to the new ceiling unchanged. |
