# Gate economy spec review: contract and criteria lens

Target: `docs/superpowers/specs/2026-10-09-gate-economy-design.md` at `f2fa2a25`. Lens: is every
promise testable, does each acceptance criterion name its fixture and the reason it would fail, can
any criterion pass vacuously, and can a diff-reviewer check each task's outcome. Settled decisions
are taken as given; findings below are defects in how they are specified. Every claim was checked
against the code, the draft branch `gate-related` at `075bc174`, the workflows, the runners, or the
cited vendor docs.

Counts: 3 blockers, 7 majors, 6 minors. Over-ceremony is ranked separately at the end.

## Blockers

### B1. Task 5 (pipelining in the runners) has no acceptance criterion, and its state machine is underspecified

Location: spec lines 20-22, 93-99, 136-145; `~/.claude/workflows/pass-execute.js:65`.

The defect: the riskiest behavior change in the pass has no line under Acceptance. The design also
leaves out the states a test would need:

- **Push timing contradicts itself.** Settled (line 20-21) says CI "overlaps the diff review and the
  next task". Design (line 95) says the runner pushes "after each accepted task", which is after
  the review. Under line 95, CI cannot overlap the review. This changes the projection.
- **Pending has no behavior.** `ci-green` "fails on any red, pending, or missing run" (line 87), and
  "a red halts dispatch" (line 96). The spec does not say whether pending also halts, waits, or
  polls. The workflow runtime has no exec access (`pass-execute.js:65`), so every wait goes through
  a probe agent, and a Bash call caps at ten minutes. CI's test job alone is 663 s (spec line 42),
  so a wait outlasts one call. The spec does not reuse `cairn-run-gate`'s exit-75 re-issue protocol
  or name another.
- **Missing races the push.** GitHub creates runs some seconds after a push, so `ci-green` called at
  once reports "missing". Without a grace window, "missing" and "not yet created" are the same
  answer.
- **Red with task N+1 in flight.** When N's CI goes red, N+1 is already dispatched. The spec does
  not say whether N+1 finishes, whether the fix commit goes on top of N+1, or who dispatches the fix
  (the runner as a fix round, or the conductor).
- **Unreachable has no definition.** "Run the local full gate only when CI is unreachable" (line 98)
  needs a test that tells unreachable (API error, `gh` auth failure) apart from pending forever (a
  queued runner).

Proposed fold: give `ci-green` distinct exit codes (green 0, red, pending or not-yet-created inside
a grace window, missing after the grace window, unreachable, PR conflicted; see M4) and a `--wait`
mode on the exit-75 re-issue protocol. Pick one push point, after the implementer's gated commit,
so CI overlaps the review as Settled says. State the red rule: N+1 finishes its chain, the runner
stops, and it returns a `ciRed` record that names the SHA, the task, and the failing workflows. Add
an Acceptance line whose fixture is the existing stubbed-agent harness
`~/.dotfiles/tests/pass-execute-runners.test.mjs`. It needs one case per state: green dispatches
N+2, red halts with the record, pending waits and then resolves, an `auth-data` task blocks the next
dispatch until green, and unreachable at a boundary falls back to the local full gate. Each case
fails if the runner dispatches in the wrong state.

### B2. Pipelining reaches branches that get no CI, and a repo where a push deploys

Location: spec lines 89, 95; `pass-execute-chains.js:1-8, 352`; `.github/workflows/test.yml:3-8`;
`pass-core/SKILL.md:137-141`.

The defect has three parts:

- **Chain branches get no CI.** `pass-execute-chains` runs each chain on its own worktree branch.
  CI fires on push only for `main` and `rebuild`, and otherwise only through a PR. The spec gets
  runs "from the pass's draft PR" (line 89), but a chain branch has no PR. `ci-green` on a chain
  commit therefore reports missing forever, and stop-the-line halts every chain.
- **Some runs push `main`, which deploys a site.** Both runners are shared with the site repos. The
  chains runner runs a chain on `main` when `args.mainCheckout` matches (`:352`). On a site repo a
  push to `main` auto-deploys (cairn-cms `CLAUDE.md`, opening paragraph), so a push per task means
  one production deploy per task.
- **A merge conflict looks like a missing run.** GitHub runs no `pull_request` workflow at all
  while the PR has a merge conflict
  ([events doc](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)).
  `main` takes STATUS and plan commits from other sessions during a pass, so the pass PR can
  conflict mid-pass. `ci-green` would then report "missing" with no hint of the cause.

Proposed fold: make pipelining opt-in through a runner argument (for example, `ci: { pr: <number> }`),
so an absent argument keeps today's behavior and the runner never pushes the default branch. For
chains, run `ci-green` only where a PR exists: on the pass branch after the chains merge, at the
boundary. Have `ci-green` read the PR's `mergeable` state and report "conflicted" as its own exit
code. Add one runner-harness case for each of these three paths.

### B3. "`auth-data` never takes a reduced gate" is undefined against the new per-task gate, and pass A is mostly `auth-data`

Location: spec lines 72-73, 22, 97; `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md:28-29`;
`pass-execute.js:84-86`.

The defect: pass A, the replay case, ran 8 of its 12 tasks as `auth-data` (plan lines 28-29). The
spec never says what an `auth-data` per-task gate runs. The term "reduced gate" already means
something else in the runners: the fix-round gate (`pass-execute.js:84-86`, "except under
`auth-data`, where only a comment-only round reduces"). The spec's source, review finding 3, used
"reduced" to mean narrowed node projects. The new per-task gate always runs the full node projects,
so under that reading `auth-data` simply takes the targeted gate. If "reduced" means the static
input map plus `vitest related`, then two-thirds of the replay keeps a gate of the old size. The
10-minute criterion and the half-clock projection then measure only the third of pass A that is not
`auth-data`.

Proposed fold: name the `auth-data` per-task gate explicitly, and stop using the word "reduced" in
this sense.

OWNER FORK (only if Geoff meant the wider reading):
- (a) `auth-data` takes the same targeted per-task gate, with the CI-green wait before the next task
  as its full-suite backstop. Recommended: the wait already gives the full run on every `auth-data`
  commit before anything builds on it, so assurance matches today's at a fraction of the clock.
- (b) `auth-data` keeps the full static list and the full component project locally, and also
  waits for CI. This doubles the full run on 8 of pass A's 12 tasks and puts the half-clock target
  out of reach for a pass of pass A's shape.

## Majors

### M1. The miss-rate criterion can pass vacuously, and its evidence is ephemeral

Location: spec lines 128-130, 139-140.

The defect: "miss rate zero" is computed against "the failures pass A's logged full gates
recorded". Four problems make zero easy to reach without proving anything:

- **The logs are ephemeral.** They sit in `/tmp/cairn-gate-1000/`, and `/tmp` here is tmpfs
  (checked: `findmnt`), so a reboot before Task 7 erases the denominator.
- **Failures cannot be tied to tasks.** One log per gate string spans the whole night, with no tree
  hash (inputs, lines 182-185). A failure in a boundary log cannot be traced to the task range that
  caused it without bisecting.
- **The logs mix in deliberate reds.** About 14 of the "1 failed (1)" lines across the logs are
  single-file TDD red runs, not gate misses. A naive scan either inflates the count or, filtered
  crudely, empties it.
- **The dry run cannot see component selection.** A classifier dry run yields a gate string, not
  the component files `vitest related` would pick, so a recorded component-test failure cannot be
  checked against the "selection" without asking Vitest. `vitest list --changed <base> --filesOnly
  --project component` exists in 4.1.11; the spec should name it or an equivalent.

Proposed fold: as a pre-bake step, copy pass A's gate logs to a durable location. Make the
denominator an enumerated table committed with Task 7's record. Each row gives the event, its source
(the logged full-gate failure, the two S2 static-check reds, or pass A's CI non-greens from `gh run
list`: `check:template`, showcase `format:check`, and `check:self-use`, with the hang excluded), the
task range that introduced it, the failing test or check, and whether the new selection includes
it. Restate the criterion: every row is selected, and the table has at least as many rows as the
known events. A zero-row table fails the criterion instead of passing it.

### M2. The two timed ranges are unnamed, and the per-task gate is undefined for the `admin-visual` and `full` tiers

Location: spec lines 58-73, 129-130, 138; draft `gate-tier.mjs:145, 301-315` (`RELATED_TIERS =
['scripts', 'engine']`).

The defect has two parts:

- **The ranges are unnamed.** "Two representative ranges" lets Task 7 pick ranges that pass. An
  engine `.ts` change reaches every check that reads `dist` (most of the 17 build-bearing checks),
  plus the 4-minute node projects. The draft measured about 11 minutes static, 4 minutes node, and
  under a minute component on an engine range (inputs, lines 136-138). So the 10-minute bar is
  plausible only on a narrow range.
- **Two tiers have no defined gate.** The draft narrows only `scripts` and `engine`. A
  `src/lib/admin/**` diff keeps the whole `SCRIPTS_GATE` plus the admin-visual spec. Any
  unclassified path (`package.json`, `vitest.config.ts`, a workflow, `src/lib/render/`) keeps the
  45-minute `FULL_GATE` (`gate-tier.mjs:23-25, 122, 212`). The spec's per-task gate section is
  silent on both tiers, and a pass of pass A's shape touches admin.

Proposed fold: state the per-task gate for each tier. Recommended: `admin-visual` takes the
targeted gate plus the admin-visual floor, and `full` takes the targeted gate plus the mapped e2e
specs, since CI is now the full run. Name the two ranges in the spec now: one `auth-data` engine
`.ts` range and one admin range from pass A. Say whether lock wait counts, and what happens when a
range misses 10 minutes (the static input map is revisited, and the pass does not close on a miss).

### M3. The clock projection cannot come "from the run records", has no threshold, and leaves out CI wait

Location: spec lines 52-56, 143-144.

The defect has three parts:

- **There are no records to project from.** Run records start at Task 1, and pass A ran before
  them, so a projection "from the run records" has no pass A input. What exists is the two timed
  ranges plus the classifier dry runs.
- **"Near half" sets no pass mark.** It is not a threshold, and a projection's free parameters can
  be tuned to meet it.
- **The moved cost goes unscored.** Under the new rules, CI wait becomes the gate time on the
  critical path: every `auth-data` task waits for its own green, and so do the boundaries and the
  close. `cairn-run-gate` records never see that wait, so the close's clock score (line 55) would
  under-count exactly the cost the design moves.

Proposed fold: have `ci-green` append a record of the same shape for each wait (start, end,
outcome, SHA). State the projection's formula and inputs in the spec: per-task gate times the task
count, plus CI waits for the `auth-data` tasks, plus boundaries and the close at CI wall, plus the
unchanged review, fix, and close rows from the inputs file. Set a numeric bar, such as 9 hours or
less. Record that the real measurement is pass B's scored clock.

### M4. `ci-green`'s expected set is misstated, and the four test cases miss the ways it goes wrong

Location: spec lines 86-89, 141-142; `.github/workflows/norms.yml:17-19`, `publish.yml:13-16`,
`tsgo.yml:32-35`.

The defect:

- "The rest filter out `tool/**`" is wrong for three of the ten workflows. `norms.yml` runs only on
  `workflow_call` and `workflow_dispatch`, inside `e2e.yml`, so it never appears as its own run.
  `publish.yml` runs on release, and `tsgo.yml` on a schedule. A set built from that sentence
  expects three runs that never come, so every commit reports missing.
- On `pull_request`, path filters evaluate a three-dot diff over the whole PR, not the commit's own
  diff ([workflow syntax, "Git diff comparisons"](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)).
  A set computed from a task's diff mispredicts in both directions. For example, `tool.yml` keeps
  running on every push once any earlier commit in the PR touched `tool/**`.
- The four cases (green, red, pending, missing) do not cover several outcomes. A red in a workflow
  outside the expected set, which must still fail. A rerun, where the latest attempt counts. A
  `cancelled`, `skipped`, or `neutral` conclusion. A path-filtered workflow, which has no run and
  must count as not expected rather than missing. And the merge-conflict case from B2.
- No fixture is named. Building a "missing" case against live GitHub is awkward.

Proposed fold: derive the expected set by parsing each workflow's `on.pull_request` (or `on.push`
for `main`), evaluating `paths` and `paths-ignore` against `git diff <merge-base>...<sha>`. Fail on
any non-success conclusion of any run on the SHA, expected or not; use the expected set only for
"missing". Test against recorded `gh api .../actions/runs?head_sha=` JSON fixtures: the four
listed cases, plus a tool-only PR, a rerun superseding a red, a cancelled run, and a conflicted PR.
Add one live smoke against a known-green PR commit. Name where `ci-green` lives. Dotfiles
`~/.local/bin` is recommended, since both runners and the site repos call it; that also puts
Task 4 across two repos, which the task list should say.

### M5. "CI and local gates both build the package once" is false as specified

Location: spec lines 75-79; `.github/workflows/test.yml:43-46, 64-99`; draft `close-prebuilt.mjs:9`.

The defect has three parts:

- **CI never runs `check:close`.** `test.yml` runs each check as its own step, and each of those
  scripts starts with `npm run package`. The workflow's own comment at lines 43-45 says each one
  rebuilds. Making the runner into `check:close` changes nothing on CI, and the draft's header
  claim, "CI keeps running it", is wrong.
- **CI now sits on the critical path.** Every `auth-data` task waits for CI green, so CI wall time
  matters to the pass clock. Under the old rules it did not.
- **The runner reads its list from the script it replaces.** The draft reads its component list by
  splitting `check:close`'s `&&` chain. Once `check:close` becomes the runner, that list needs a
  new source, and the spec does not name one.

Proposed fold: pick one, and write it into Task 2's criteria:

- (a) Rewire `test.yml` to run the build-once runner, and update the pin that matches `CI_CHECKS`
  to `test.yml`'s steps (`src/tests/unit/gate-tier.test.ts:309-417`).
- (b) Leave CI per-step, and strike the CI half of the claim.

Name the list's new home (an exported array in the runner, recommended). The criterion "Task 2
verifies whether either still triggers its own" (line 79) needs an observable: the runner's log
shows exactly one `svelte-package` invocation, counted.

### M6. The task dependency statement contradicts the task contents

Location: spec lines 27-29, 122-133.

The defect has three parts:

- **Task 1 is neither dotfiles-only nor independent.** It names `close-prebuilt`, a cairn-cms file
  that exists only on the draft branch (`scripts/checks/close-prebuilt.mjs` is absent on `main`)
  and that Task 2 lands. Line 28 calls Task 1 "dotfiles only", and line 133 calls it independent.
- **Task 3 depends on Task 2.** It rewrites `gate-tier.mjs`, which Task 2 lands from the draft, and
  line 29 says Task 3 runs under Task 2's gate. Line 133 still calls Tasks 1, 3, and 4 independent.
- **Task 6 is not dotfiles-only either.** It edits pass B's plan, a cairn-cms file.

A plan built from line 133 would start Tasks 1 and 3 beside Task 2 on overlapping files.

Proposed fold: move per-check timing into Task 2, so Task 1 is truly dotfiles-only and runs
records only. Restate the graph as Task 2 before Task 3, Task 4 before Task 5, Tasks 2, 3, and 5
before Task 7, and Tasks 1 and 4 independent of Task 2. Correct the "dotfiles only" list.

### M7. Run records cannot be attributed to a pass, and Task 1 has no criterion

Location: spec lines 52-56, 122; `~/.local/bin/cairn-run-gate:1-60`.

The defect: one state file shared by every session and worktree on the machine holds "gate string,
tree hash, start, end, lock wait, exit". The close cannot select its own pass's runs from it,
because the record carries no toplevel, branch, or HEAD, and parallel sessions share the machine by
design (pass-core's "Share the heavy gate lock" rule). The record also has no outcome for a
vanished run (the "vanished 3 times" path) or for a receipt hit that skipped a gate. Neither
outcome has an exit code to record.

Proposed fold: add toplevel, working directory, branch, HEAD, lane, and
`outcome ∈ {exit, vanished, receipt}` to the record. Add an Acceptance line whose fixture is
`~/.dotfiles/tests/cairn-run-gate.test.sh`: exactly one line per run across an exit-75 reattach,
one `vanished` line, and lock wait above zero when a second run queues. Each fails on a duplicate
or a missing line.

## Minors

- **m1. The coverage probe's trigger is unfalsifiable.** Location: lines 24-26, 131, 145. "Thin" is
  undefined, so the audit-reopen trigger can never fire deterministically. `@vitest/coverage-v8` is
  not installed (`node_modules/@vitest/` lacks it). In-process v8 cannot see the `unit-dist-spawn`
  or dist-reading tests (49 files read `dist/`), so modules covered only through `dist` read as
  thin: a false positive. Fold: name the globs (`src/lib/auth*/**`, `src/lib/github/**`), a line
  threshold, the projects (unit and integration), and a note on dist-covered modules. Install with
  `--no-save` at Vitest's exact version (4.1.11), so no dependency bump enters the pass.
- **m2. Nothing pins the coverage direction that now matters.** Location: lines 17-19. The existing
  pin checks that the local full gate covers `test.yml`. Once CI is the boundary gate, the needed
  direction is that CI covers every `check:close` component. That holds today (checked: every
  component appears in a workflow or in `docs-gate.mjs`), but nothing pins it. Fold: one assertion
  in `gate-tier.test.ts`.
- **m3. The CI-hardening items have no criteria.** Location: lines 83-85. Fold: one test that every
  job in every workflow sets `timeout-minutes`, which fails on a job without one. A step-level
  timeout on `playwright install` also gives a clearer red than the job's.
- **m4. The e2e map has no stated fail-safe.** Location: lines 68-69. The static map fails safe on a
  missing entry; the e2e diff-to-spec map does not say what an unmapped `src/lib` or showcase path
  selects. CI backstops it one task later, so this is minor. Fold: an unmapped path selects the
  whole e2e suite, or the admin-visual floor at minimum.
- **m5. Nothing pins the CI-wait rule between table and runner.** Location: lines 103-104. The
  runner test already pins `PASS_CLASSES` to pass-core's table (names, model, and lane, at
  `pass-execute-runners.test.mjs:290-310`). Fold: extend the pin to the `auth-data` CI-wait flag,
  so Task 5's runner and Task 6's table cannot drift.
- **m6. The acceptance lines lack a fail consequence.** Location: lines 136-145. Only the miss-rate
  line says what happens on failure. Fold: one clause each (fix and rerun, or record and carry to
  pass B).

## Over-ceremony, ranked by clock and token cost

1. **The pass's own Tasks 2 and 4 classify as the 45-minute `full` tier.** `package.json`,
   `vitest.config.ts`, and `.github/workflows/*` are unclassified paths, which default to full
   (`gate-tier.mjs:23-25, 212`). Under the rules in force that costs about 45 to 90 minutes of a
   3.5-hour estimate. Fold: pin Task 4's gate to its own unit tests (the workflow parser, `ci-green`
   fixtures, and the gate-tier pin), and let the draft PR's CI prove the workflow edits. That run is
   the real test of a CI change anyway. Task 2 runs its targeted legs plus the prebuilt close once.
2. **Install caching is already present or not recommended.** Location: lines 90-91.
   `actions/setup-node` with `cache: npm` is already on every workflow (for example `test.yml:20`,
   `e2e.yml:36`, `scaffold.yml:18`, `create-site.yml:28`). Playwright's CI guide says "Caching
   browser binaries is not recommended", because the restore time is comparable to the download and
   the Linux OS dependencies are not cacheable ([playwright.dev/docs/ci](https://playwright.dev/docs/ci)).
   Fold: drop the item.
3. **`ci-green` cannot print retries from job summaries.** Location: lines 84-85, 87-88. GitHub's
   REST API exposes no job-summary endpoint
   ([community discussion #27649](https://github.com/community/community/discussions/27649)). Fold:
   emit retry counts as a `::warning::` annotation, which the check-runs API returns, or keep them in
   the summary for a human and drop "printing the retries" from `ci-green`.
4. **The implementer rule cannot be tested.** Location: lines 106-107. "The lowest layer that can
   see the behavior" is guidance. Fold: land it as one line with no acceptance criterion.
