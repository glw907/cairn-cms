# Gate economy pass: design

Status: approved in conversation 2026-10-09, for Geoff's read of the written spec. Inputs:
`docs/superpowers/research/2026-10-09-gate-economy-pass-inputs.md` (pass A's clock, the adversarial
review, the draft build's results) and the draft branch `gate-related` at `075bc174`.

## Goal

Cut the clock a pass spends on gates. Pass A took about 17 executing hours, and most of it went to
running the same 30 to 50 minute gates about 25 times. The target is about half that clock on a pass
of pass A's shape, with no loss of assurance, measured by replaying pass A's task ranges.

## Settled decisions (Geoff's, 2026-10-09; not re-argued)

- **Targeted, not brute force.** "Avoid the brute-force approach, unless it's best-practice." A
  small pass, run before pass B.
- **CI replaces the local full gate at segment boundaries and the close.** The boundary and the
  close read all-green CI on the commit. The local full gate is the fallback when CI is down. Class
  settle steps (reviewers, the auth smoke) are unchanged.
- **Pipelining.** A task's local gate is targeted. CI's full run on the pushed commit overlaps the
  diff review and the next task. A red stops the line: no new dispatch until a fix commit is green.
  An `auth-data` task waits for CI green before the next task starts.
- **No suite audit.** Measured on 2026-10-09: CI runs `npm test` in 208 s and e2e in 291 s, the
  component project is browser-bound (3 of 90 files render nothing), and nothing points at a
  coverage problem. One coverage probe runs in Task 7; a thin module on the auth or commit path is
  the trigger to reopen the audit.
- **Budget.** Token ceiling 4.0M, clock estimate about 3.5 hours on the critical path (Geoff,
  2026-10-09: 7 hours was excessive). Tasks 1, 5, and 6 are dotfiles only and run no npm gate; Tasks
  3 and 4 run in parallel; Task 3 onward runs under the gate Task 2 lands.

## Measured baseline

From the inputs file and the 2026-10-09 CI step timings (17 green runs each of test, e2e, and
scaffold):

| Item | Clock |
|---|---|
| Pass A per-task gate, local | 30 to 50 min |
| Pass A boundary full gate, local | about 45 min |
| `check:close`, local, 17 builds | 1,044 s |
| `check:close`, local, one build (draft) | 679 s |
| CI test job | 663 s, of which checks about 367 s and `npm test` 208 s |
| CI e2e job | 413 s |
| `npm ci` plus `playwright install`, per CI job | about 60 s |

Seven checks hold most of CI's check time: `check:docs-gate` (65 s, it builds the package again),
`surface` 44, `audit-pack` 29, `package` 27, `self-use` 24, `consumers` 23, `check` 18. Every other
check takes 12 s or less.

## Design

### Run records

`cairn-run-gate` appends one JSON line per run to a state file: gate string, tree hash, start, end,
lock wait, and exit code. `check:close` prints per-check seconds. The close's clock score sums these
directly, replacing reconstruction from shared log files.

### Per-task gate

The per-task gate answers one question: does this change work and break nothing near it. It runs:

- the static checks whose declared inputs the diff reaches;
- the full node projects (unit, integration, unit-dist-spawn), about 4 minutes locally, because
  111 test files depend on inputs outside the import graph;
- `vitest related` over the component project, or the whole project on a trigger or an empty
  selection;
- create-cairn-site's suite when its inputs change;
- the e2e specs a committed diff-to-spec map selects, with the admin-visual floor for
  `src/lib/admin/**`.

Each static check declares its input globs in one committed map that `gate-tier.mjs` reads. A check
with no declaration runs on every gate, so a missing entry fails safe. `auth-data` never takes a
reduced gate.

### One build per gate

The draft's build-once runner becomes `check:close` itself, so CI and local gates both build the
package once. `check:docs-gate` and `check:package`'s `attw --pack .` reuse that build where they
can, and Task 2 verifies whether either still triggers its own.

### CI as the full gate

- Every job sets `timeout-minutes`. One run hung about six hours on `npx playwright install`.
- Component-project and Playwright retry counts appear in each job's summary, so a pass on retry is
  visible.
- A `ci-green <sha>` script lists every workflow that should run on the commit and fails on any red,
  pending, or missing run, printing the retries. The expected set follows each workflow's path
  filters (`tool.yml` and `tool-conditions.yml` filter in, the rest filter out `tool/**`). The runs
  come from the pass's draft PR, since CI fires on push only for `main` and `rebuild`.
- CI caches `npm ci` and the Playwright browsers across jobs where a stock action does it
  (`actions/setup-node` cache, the Playwright cache convention).

### Pipelining in the runners

`pass-execute` and `pass-execute-chains` push after each accepted task and check `ci-green` on that
commit before dispatching the task after next, so CI overlaps one task. A red halts dispatch. The
fix round's gate is the targeted gate plus a fresh CI push. An `auth-data` task waits for its own
commit's CI green. Boundaries and the close call `ci-green` on their commit, and run the local full
gate only when CI is unreachable.

### Rules where they execute

- `pass-core`: the class table's per-task gate cells, the per-task gate paragraph, the boundary and
  close steps, and the pipelining rule.
- `~/.claude/docs/pass-gate-economy.md`: the same rules, with the measured baseline.
- `cairn-implementer`: write each test at the lowest layer that can see the behavior, and extend an
  existing test before adding a file.
- Pass B's plan: its gate section adopts the per-task gate and CI boundaries.

## What the draft branch contributes

Kept: the build-once close runner, the shared trigger list anchored at the absolute repo root (bare
double-star globs never cross the `.claude/` dot directory, so Vitest's own default trigger matches
nothing in a worktree), and `gate-tier.mjs --related` with its tests.

Changed: an empty `related` selection runs the whole component project instead of failing. The
helper trigger narrows to `src/tests/_*.ts` and `src/tests/component/**/_*.ts`. The new `scripts/`
files join `lint` and `check:comments`.

## Tasks (outline for the plan)

1. Run records and per-check timing (dotfiles `cairn-run-gate`, `close-prebuilt`).
2. Land the draft with its amendments; `check:close` becomes build-once; check the extra builds.
3. Static-check input map and the e2e diff-to-spec map in `gate-tier.mjs`.
4. CI hardening: timeouts, retry summaries, `ci-green`, install caching.
5. Pipelining and CI boundaries in both runners (dotfiles).
6. Rules: `pass-core`, `pass-gate-economy.md`, `cairn-implementer`, pass B's gate section.
7. Replay and acceptance: for each of pass A's task ranges, compute the new gate's selection (a
   classifier dry run, seconds) and compare it with the failures pass A's logged full gates
   recorded. Time a targeted run on two representative ranges only. One v8 coverage run over
   `src/lib`.

Tasks 1, 3, and 4 are independent. Task 5 needs 4's `ci-green`. Task 7 runs last. Pass A's logged
gates are not rerun.

## Acceptance

- The two timed replay ranges show the per-task gate at 10 minutes or less locally, against 30 to 50.
- Miss rate zero on the replay: no test fails in the full run that the targeted gate skipped. Any
  miss gets a trigger or an input-map entry, and the replay reruns.
- `ci-green` reports correctly on a green commit, a red one, a pending one, and one missing an
  expected workflow.
- A recorded projection of pass A's clock under the new rules, from the run records, near half of
  17 hours.
- The coverage probe's result is recorded, with any thin auth or commit-path module named.

## Out of scope

Deleting or moving tests, pass B's tasks, parallel worktree lanes beyond what the runners already
do, and any change to the class settle steps.
