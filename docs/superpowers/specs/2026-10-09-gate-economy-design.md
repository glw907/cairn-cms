# Gate economy pass: design

Status: approved in conversation 2026-10-09, revised by the spec review fold
(`docs/superpowers/research/2026-10-09-gate-economy-spec-fold.md`); awaiting Geoff's two rulings
below. Inputs: `docs/superpowers/research/2026-10-09-gate-economy-pass-inputs.md` (pass A's clock,
the adversarial review, the draft build's results) and the draft branch `gate-related` at
`075bc174`.

## Goal

Cut the clock a pass spends on gates. Pass A took about 17 executing hours (the inputs file's netted
figure), most of it running the same 30 to 50 minute gate on every task, fix round, and boundary.
The target is about half that clock on a pass of pass A's shape, with no loss of assurance,
checked by replaying pass A's task ranges and proven by pass B's scored clock.

## Settled decisions (Geoff's, 2026-10-09; not re-argued)

- **Targeted, not brute force.** "Avoid the brute-force approach, unless it's best-practice." A
  small pass, run before pass B.
- **CI replaces the local full gate at segment boundaries and the close.** The boundary and the
  close read all-green CI on the commit. The local full gate is the fallback when CI is
  unavailable. Class settle steps (reviewers, the auth smoke) are unchanged.
- **Pipelining with stop-the-line.** A task's local gate is targeted. CI's full run on the pushed
  commit overlaps the diff review and the next task. A red stops the line: no new dispatch until a
  fix commit is green. An `auth-data` task waits for CI green before the next task starts.
- **No suite audit.** Geoff: "If there's nothing to suggest any issues with test coverage or
  performance, then the audit isn't necessary." Measured on 2026-10-09: CI runs `npm test` in 208 s
  and e2e in 291 s, the component project is browser-bound (3 of 90 files render nothing), and
  nothing points at a coverage problem.
- **Token ceiling 4.0M.** Geoff: 7 hours of clock was excessive for this pass.

## Rulings for Geoff

1. **Drop the coverage probe from Task 7?** Recommended: yes. The draft spec ran one V8 coverage run
   as the audit's reopen trigger. V8 cannot measure the `integration` project, which runs in workerd
   and holds most auth modules (Cloudflare: "Native code coverage via V8 is not supported"), and no
   coverage provider is installed. The mutation proof covers the branches each `auth-data` task
   changed (pass-core's class table: "test-first, a mutation proof"), not untouched modules; "yes"
   leaves no coverage signal on untouched auth code, which the settled "nothing points at a coverage
   problem" accepts. Yes builds nothing; the audit's reopen signal becomes the selection-miss count
   below and any reviewer blocker on a branch no test covered. No builds a one-off
   `@vitest/coverage-istanbul@4.1.11` run (installed `--no-save`, nothing in `package.json`) over
   the unit and integration projects, scored on `src/lib/auth*/**` and `src/lib/github/**` at a line
   threshold the plan names, with dist-only coverage recorded as a known blind spot. About 20
   minutes on Task 7.
2. **Does a test that passes only on a CI retry count as green?** Recommended: yes, logged.
   Playwright retries twice on CI and never locally (`playwright.config.ts:30`); the component
   project retries twice in both places. The per-task gate runs its selected e2e specs locally at
   zero retries, and an `auth-data` task always runs the auth specs, so an intermittent defect in
   the changed area still meets a no-retry run. Yes builds a retry annotation per CI job that
   `ci-green` prints and the run record tallies; the close lists every retried test. No (a retried
   test in a diff-selected spec or on an `auth-data` commit is red) adds per-test parsing to
   `ci-green` and the e2e map lookup, and will stop the line on the known spellcheck flake.

## Measured baseline

From the inputs file and the 2026-10-09 CI step timings (medians over 17 to 20 green runs):

| Item | Clock |
|---|---|
| Pass A per-task gate, local | 30 to 50 min |
| Pass A boundary full gate, local | about 45 min |
| `check:close`, local, 17 builds | 1,044 s |
| `check:close`, local, one build (draft) | 679 s |
| CI test job | 663 s: `check*` steps about 305 s, create-cairn-site suite 41 s, `npm test` 208 s |
| CI e2e job | 413 s, of which the suite 291 s |
| `npm ci` plus `playwright install`, per CI job | about 60 s |
| `npm run package` on CI | about 11 s |

Seven checks hold most of CI's check time: `check:docs-gate` (65 s, it builds the package again),
`surface` 44, `audit-pack` 29, `package` 27, `self-use` 24, `consumers` 23, `check` 18. Every other
`check:*` step takes 12 s or less.

## Design

### Run records

`cairn-run-gate` appends one JSON line per run to `~/.local/state/cairn-run-gate/runs.jsonl`: gate
string, tree hash, toplevel, branch, HEAD, lane, start, end, lock wait, exit code, and an outcome of
`exit`, `vanished`, or `receipt`. The detached run writes its own line when its status is known, so
an abandoned caller still leaves a record; the line is built with `jq -nc` and appended with one
`printf` under `flock`. `ci-green` appends a line of the same shape for each wait (SHA, task id,
start, end, queue time, outcome). The close's clock score filters by toplevel and branch and sums
gate time plus CI wait directly, skipping and counting any malformed line.

### Per-task gate

The per-task gate answers one question: does this change work and break nothing near it. Every npm
per-task gate runs, in order:

1. `npm run package`, unconditionally, because the node projects read `dist`.
2. The static checks the diff's buckets select (below).
3. The full node projects (unit, integration, unit-dist-spawn), about 4 minutes locally, because
   they hold most of the 111 test files whose inputs sit outside the import graph.
4. The component project narrowed by `vitest related`. The whole project runs on a trigger, on a
   deleted or renamed path under `src/`, or when the selection (below) is empty.
5. create-cairn-site's suite when its inputs change (`packages/create-cairn-site/**`,
   `examples/showcase/**`, `scripts/build/emit-template*`, root `package.json`).
6. The e2e specs the coarse e2e map selects, at zero retries.

This one gate replaces the per-task tier strings: an admin diff adds the admin-visual floor through
the e2e map, and an unclassified path runs every static check, never the 45-minute full tier.

**Check buckets.** `gate-tier.mjs` reads one committed table of a few path buckets, not a per-check
map: docs, scripts, showcase, engine (`src/lib/**` and the build inputs), and export surface
(`src/lib/**/index.ts`, `package.json` `exports`, and their allowlists). Each bucket names the checks
it selects. Every other check whose script starts with `npm run package` inherits the engine
bucket mechanically. The dist-surface checks (`surface`, `self-use`, `audit-pack`, `consumers`,
`public-skill`, `package`) select on the export-surface bucket only; CI runs them on the same push.
The docs bucket selects tellgrader, which skips itself on CI and is therefore local-only. A changed
path that matches no bucket and is not on an explicit no-check list runs every static check. Bucket
patterns for dot paths (`.vale/**`, `.vale.ini`, `.tellgrader.json`, `.github/**`) are literal
prefixes, because `node:path` `matchesGlob` never matches a dot segment with `**`; a unit test
asserts each bucket pattern matches a named real path.

**E2e map.** A directory-prefix table plus the admin-visual floor for `src/lib/admin/**`. An
unmapped `src/lib/**` path selects `golden-path`, `access-map`, and `csrf-origin`. A test asserts
every spec file is reachable from some entry.

**`auth-data`.** An `auth-data` task takes the same per-task gate plus the three auth e2e specs,
then waits for its commit's CI green before the next dispatch. Reason: the CI wait gives every
`auth-data` commit the full suite before anything builds on it, which is more than pass A's
boundary-only full gate gave, and a local full run beside it would double the run on 8 of pass A's
12 tasks. Fix rounds keep the runner's existing reductions (comment-only under `auth-data`;
comment-only or test-only otherwise). "Reduced gate" keeps that one meaning.

**Trigger canary.** A committed test asserts that each component rerun trigger, given as the changed
path, makes the selection pick every component file. The selection is Vitest's Node API, since
`vitest list` has no `--related` flag: `createVitest('test', { related: [paths], project:
'component' })`, then `getRelevantTestSpecifications()`
(`vitest/dist/chunks/cli-api.CnMVyzaz.js:13487` in 4.1.11, filtering through `filterTestsBySource`
at `:11551`), which selects without running. Probed on `main`: `package.json` selects 90 of 90 files
in 4 s, `CairnAdminShell.svelte` 9 in 14 s, `README.md` none. This is the ROADMAP's 2026-10-08
precondition (a) for per-task Vitest selection.

### One build per local gate

The draft's build-once runner becomes `check:close` itself, and the component list moves into the
runner as an exported array (it can no longer be parsed from `check:close`'s `&&` chain). The runner
prints per-check seconds. `check:package` packs with `npm pack --ignore-scripts --pack-destination
<tmp>` and points `attw` at the tarball, the precedent at `check-audit-pack.mjs:179`, because `attw
--pack .` runs `prepare`, which rebuilds. `docs-gate.mjs` takes a `--prebuilt` flag. CI keeps its
per-step checks: rewiring it saves about 2 minutes a cycle but its list differs from `check:close`'s
(`test:emit`, the create-cairn-site suite, showcase `test:unit`, `check:tool-heuristics`) and it
would lose per-step timing. A test asserts that every `check:close` component runs on CI (a
`test.yml` or `design.yml` step, or inside `docs-gate.mjs`).

### CI as the full gate

- Every job sets `timeout-minutes` (test 25, e2e 20, the rest 15). Each `npm ci` and `playwright
  install` step sets a 10-minute step timeout. `norms` takes its timeouts inside `norms.yml`, since
  a job that calls a reusable workflow cannot set `timeout-minutes`. One unit test parses every
  workflow and fails on a job without a timeout. Measured: five runs since 2026-09-30 hung about six
  hours, three on `npm ci` and one on `playwright install`.
- Each test job emits a `::notice title=retries::` annotation listing retried tests, readable through
  the check-runs annotations API (no API reads a job summary).
- Install caching is already in place (`actions/setup-node` `cache: npm` on every workflow), and
  Playwright advises against caching browsers. Nothing changes.

### `ci-green`

`ci-green <sha> --pr <n> [--wait]` lives in dotfiles `~/.local/bin`, since both runners and the
conductor call it. It reads workflow-run conclusions on the SHA, never raw check runs.

- **Red:** any run on the SHA, expected or not, whose conclusion is not `success`. A job skipped by
  its own `if:` inside a successful run is not red. A red caused by a timeout or by a failed setup or
  install step is an infrastructure red: `--wait` reruns it once with `gh run rerun --failed` and
  keeps waiting; a second red is red. On red, `ci-green` prints each failing job, step, and test
  name, the capped `gh run view --log-failed` tail, and the latest conclusion of the same workflow
  on `main`, so a red that `main` also carries routes its fix to `main`.
- **Expected set:** the five workflows with `pull_request` and only `paths-ignore: ['tool/**']`
  (test, e2e, design, scaffold, create-site) when the SHA's file list has any path outside
  `tool/**`. The list is `git diff --name-only $(git merge-base origin/main <sha>)...<sha>` after a
  fetch: the three-dot basis GitHub filters on, exact to the SHA, with no size cap. `gh pr diff
  --name-only` fails above 300 files or 20,000 lines; the git form matched the files API exactly on
  PRs #102, #103, and #107 (239, 395, 450 files). `tool` and `tool-conditions`
  filter in and are judged only when present. `norms` runs as jobs inside `e2e`; `tsgo` and
  `publish` never run on a PR. A unit test parses the workflows' `on:` blocks and fails when a
  workflow's trigger shape leaves this classification.
- **Pending:** an expected run not yet created, queued, or in progress. `--wait` blocks up to 540 s
  and exits 75 while pending, the `cairn-run-gate` re-issue convention.
- **Missing:** an expected run never created 5 minutes after the push. It reports the PR's
  `mergeable` state (a conflicting PR gets no `pull_request` runs) or an approval hold, and stops
  the line; the conductor merges `main` in under pass-core's merge rule.
- **Unavailable:** an API or auth failure, or no terminal result 60 minutes after the push (with
  job timeouts at 25 minutes or less, the rest is queue; measured queue 1,232 s on 2026-10-09).
  Unavailable triggers the local full gate fallback, which follows the durable gotcha's rule: green
  when the only visual failures are exactly the latest baseline regen's files.
- **Green:** every run on the SHA succeeded and the expected set is present. It prints retried
  tests and `run_attempt` above 1.

Exit codes: 0 green, 1 red, 2 missing, 3 unavailable, 75 pending.

### Pipelining in the sequential runner

Pipelining is opt-in: `pass-execute` takes `ci: { pr: <n> }`, and an absent argument keeps today's
behavior, so site repos and any default-branch run never push per task. It applies to sequential
mode only. `parallel: true` and `pass-execute-chains` keep the per-task targeted gate and read
`ci-green` at each boundary after the chains merge into the pass branch and push. Every `auth-data`
task still waits for CI green, so a plan runs `auth-data` tasks in sequential mode, never in chains,
whose branches have no PR for `ci-green` to read. Chains pipelining is out of scope.

The state machine, one task deep:

1. Task N's implementer commits after its targeted gate; the runner pushes after every implementer
   commit, fix rounds included, so CI overlaps the review and N's accepted SHA has its own runs.
2. After N is accepted, the runner dispatches N+1, except under `auth-data`, where it first runs
   `ci-green --wait` on N's SHA through a probe agent that only re-issues on 75.
3. Before dispatching N+2, the runner runs `ci-green --wait` on N's accepted SHA.
4. On red or missing, N+1 finishes its chain, and the runner stops and returns a `ciRed` record:
   SHA, task, failing workflows and steps, and the `main` comparison. On unavailable (exit 3) it
   stops the same way with a `ciUnavailable` record, and the conductor runs the local full gate
   fallback on that SHA.
5. The conductor dispatches one CI-fix chain for task N, which counts as N's one `fix`
   re-dispatch: the implementer gets the `ciRed` record and fetches the log itself, works on HEAD,
   gates with the targeted gate, pushes, and runs `ci-green --wait`. `diff-reviewer` checks it
   against N's criteria plus "the red step is green". N+1's review stands unless the fix touches
   N+1's files. Failures present at N+1 but not N go into the same fix prompt. A second red stops
   the pass and writes STATUS, per pass-core's unattended rule. Reverting N stays the conductor's
   option.
6. The conductor relaunches the runner from N+2.

A boundary and the close run `ci-green --wait` on their commit (the conductor uses
`run_in_background`, so the exit wakes the session). The close's green must be on a run whose base
is `origin/main`'s current head; if `main` moved, merge it in and read `ci-green` again. This
restates pass-core's existing "no merge or rebase of the default branch in between" clause.

**Selection misses.** A CI red on a commit whose targeted gate was green is a selection miss, read
from the run records and the `ciRed` record. The close counts them; two in one pass reopen the
bucket table.

### Rules where they execute

pass-core is shared with site-pass, so it states the CI rule conditionally: where the repo skill
names a CI-green command, the boundary and the close read it; otherwise the local full gate runs.
`cairn-pass` holds `ci-green`, the draft PR mechanics, and the fallback. `site-pass` is unchanged.
The runner prompt for `diff-reviewer` names a blocking finding: an existing test deleted, skipped,
`.only`'d, or loosened, or a bucket or e2e map entry narrowed, that the task's criteria do not name.
CI's full run is the holdout the implementer cannot narrow. `cairn-implementer` gains one line:
write each test at the lowest layer that can see the behavior, and extend an existing test before
adding a file.

### Owed errata (Task 6 covers each; this spec edits none)

1. `~/.claude/skills/pass-core/SKILL.md`, scoped per the conditional rule: the class table's
   boundary and before-merge cells; the per-task gate paragraph; the runner's fix-round reduction
   text; "CI shadows the pass" (push point and pipelining); Execution discipline's boundary receipt
   skip; Closing step 2; step 6 (gate time and lock wait).
2. `~/.claude/skills/cairn-pass/SKILL.md`: Gate notes (paint's full suite at boundaries); Closing
   step 2 (`npm test` then `check:close`, now `ci-green` including e2e).
3. `~/.claude/skills/site-pass/SKILL.md`: confirm unchanged.
4. `~/.claude/docs/pass-gate-economy.md`: "Full gate" meaning; the reduced fix-round rules (one
   statement, including the `auth-data` comment-only reduction); the boundary receipt; rule 2's
   boundary skip; the `check:close` description; the measured baseline.
5. `~/.claude/docs/model-economy.md` "The pass-end score": gate time and lock wait come from run
   records; CI wait on the critical path is named separately.
6. `~/.claude/agents/cairn-implementer.md`: the fallback gate, the reduced-gate naming, the
   lowest-layer line.
7. The `diff-reviewer` prompt in `pass-execute.js` (or the agent definition): the test-weakening
   finding.
8. `pass-execute-chains.js` header comment: no per-task pipelining.
9. `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`: the Segments table, Execution mode,
   line 115 (`auth-data` fix rounds), the amended paragraph at 117 to 126, the local boundary at 128
   to 132, the Gates section, Task 0's baseline, each boundary line, the close budget row, and every
   `gateTier: full` pin reviewed against the new gate.
10. `docs/internal/pass-gate-tiers.md`: the tier table and each tier's static-check string.
11. `ROADMAP.md`, the gate economy entry and the 2026-10-08 follow-ups: run records done; the
    `--grep-invert` variant mooted except in the fallback; precondition (a) met by the canary;
    follow-up (b) won't-do while the full node projects run per task; the worktree-setup,
    light-lane OOM, and re-issue items stay filed; chains pipelining and the CI build-once rewire
    filed; the 12-hour figure corrected to 17.
12. `docs/STATUS.md` resume prompt: the audit scope superseded.
13. Global `~/.claude/CLAUDE.md` "Conducting a pass": no change, since `ci-green` is part of the
    chain's gate and follows the exit-75 rule; Task 6 records that.

## What the draft branch contributes

Kept: the build-once close runner, the shared trigger list anchored at the absolute repo root (bare
double-star globs never cross the `.claude/` dot directory, so Vitest's own default trigger matches
nothing in a worktree), and `gate-tier.mjs --related` with its tests.

Changed: an empty `related` selection runs the whole component project, detected with the Node API
selection before the run (`vitest related` exits 0 on an empty selection by default). The helper
trigger narrows to `src/tests/_*.ts` and `src/tests/component/**/_*.ts`. The new `scripts/` files
join `lint` and `check:comments`. `close-prebuilt.mjs`'s header claim that CI runs it is corrected.

## Tasks (outline for the plan)

1. Run records in `cairn-run-gate` (dotfiles only), with its test cases: one line per run across
   an exit-75 reattach, one `vanished` line, lock wait above zero when a second run queues.
2. Land the draft with its amendments; `check:close` becomes the build-once runner with per-check
   seconds; `check:package` and `docs-gate` stop rebuilding (the runner log shows one
   `svelte-package` invocation); the CI-covers-close test. Gate: the draft's own targeted legs plus
   the prebuilt close once.
3. Check buckets, the e2e map, the unconditional build leg, the empty-selection and delete
   handling, and the trigger canary in `gate-tier.mjs`.
4. CI hardening (cairn-cms workflows plus the workflow test) and `ci-green` (dotfiles) with
   recorded-JSON fixtures. Gate: its unit tests; the draft PR's CI proves the workflow edits.
5. Pipelining in sequential `pass-execute` (dotfiles), with stubbed-agent harness cases.
6. Rules: the errata list above, the `diff-reviewer` finding, the PASS_CLASSES pin extended to the
   `auth-data` CI-wait flag.
7. Replay and acceptance.

Dependencies: 2 before 3; 4 before 5; 2 and 3 before 7; 6 after 5 (it extends 5's pin). Tasks 1 and
4 are independent of 2. Tasks 1, 4's `ci-green`, and 5 run dotfiles tests only; Task 6 is docs plus
one cairn-cms plan edit, no npm gate.

**Clock estimate: about 4.5 hours.** Two tracks run alongside, one executor per worktree:
cairn-cms (2, 3, Task 4's workflow edits, 7) and dotfiles (1, Task 4's `ci-green`, 5, 6). The
cairn-cms track is the longer, so it sets the critical path before the close:

| Step | Estimate |
|---|---|
| Task 2: implement, targeted gate plus prebuilt close, review | about 45 min |
| Task 3: implement, new targeted gate, review | about 55 min |
| Task 4's workflow edits and timeout test, plus one CI cycle (663 s job, 1,232 s measured queue) | about 50 min |
| Task 7: classifier and selection dry runs, two timed ranges, record | about 45 min |
| Close: simplifier, reviewers, `ci-green` | about 45 min |
| One fix round, contingency | about 30 min |
| Dotfiles track: 1 (30), 4's `ci-green` (40), 5 (55), 6 (45, 13 errata over about 10 files) | about 2.8 h, under the cairn-cms track |

The draft estimate was 3.5 hours; the mechanics review tallied 5 to 5.5 hours for the full scope.
Dropping chains pipelining, install caching, and live-push `ci-green` tests, coarsening the check
map, and pinning Tasks 2 and 4 to their own gates bring it to about 4.5. The first fold's 4 hours
ran Task 4 whole on a side path with no CI wait on the critical path and gave Task 6 30 minutes.
Ruling 1's "no" adds about 20 minutes.

## Acceptance

Each line names what happens on a miss.

- **Run records:** Task 1's cases pass in `~/.dotfiles/tests/cairn-run-gate.test.sh`. On a miss,
  fix and rerun.
- **`ci-green`:** pure-function tests over saved `gh api .../actions/runs?head_sha=` JSON cover
  green (`8483ca5b`), red (`92325c02`), cancelled after a hang (run 37893646318), tool workflows
  absent (`3ef9a8d9`), a file list over 300 files (PR #107), a red in an unexpected workflow, a
  rerun superseding a red, pending, missing with a conflicted PR, and unavailable; plus one live
  call on the pass's own draft PR. On a miss, fix and rerun.
- **Runner:** `~/.dotfiles/tests/pass-execute-runners.test.mjs` has one case each: green dispatches
  N+2; red halts with the `ciRed` record; unavailable halts with the `ciUnavailable` record; pending
  waits then resolves; an `auth-data` task blocks the next dispatch until green; no `ci` argument
  never pushes; `parallel: true` never pushes. Each fails
  if the runner dispatches or pushes in the wrong state.
- **Timed ranges:** the plan names two pass A ranges before any timing: the largest `auth-data`
  engine `src/lib` range and an admin range. Each targeted gate runs in 10 minutes or less, lock wait
  excluded. On a miss, revisit the bucket table once; if still over, record the number and carry it
  to pass B. The pass does not block on this bar.
- **Miss rate:** Task 7 commits a table of pass A's known reds, each with its source, the
  last-green..first-red range that introduced it, the failing test or check, and whether the new
  selection includes it. Sources: the CI runs API on PR #108, HISTORY's "What the gates caught", and
  the archived gate logs at `~/.local/state/cairn-gate-archive/2026-10-09-pass-a` (the archive holds
  only the latest log per gate string, so GitHub is the SHA-attributed record). Required rows: S2's
  `check:self-use`, showcase `format:check`, and `check:template` reds. TDD red runs and external
  reds (govulncheck, the hang) are listed as excluded with a reason. Component selection is read
  from the Node API selection, not the gate string. Every included row is selected; a table with
  fewer rows than the known events fails. On a miss, add a bucket entry or trigger and rerun the
  replay. The pass does not close on a miss.
- **Projection:** a model, labeled as one: gate counts by kind from pass A, times the newly measured
  durations, plus CI waits for the `auth-data` tasks at measured CI wall plus queue, plus pass A's
  unchanged review, fix, and close rows. Pass mark: 9 hours or less. On a miss, record it; pass B's
  scored clock is the real measure.

## Out of scope

Deleting or moving tests, pass B's tasks, pipelining in `pass-execute-chains` and parallel mode,
rewiring CI to build once, install caching, parallel worktree lanes beyond what the runners already
do, any change to the class settle steps, and the ROADMAP tooling items item 11 leaves filed.
