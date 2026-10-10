# Gate economy plan review: fold record

Target: `docs/superpowers/plans/2026-10-09-gate-economy.md` at `51157b99`. Reviews:
`2026-10-09-gate-economy-plan-review-{contract,mechanics,risk}.md` in this directory. One
disposition per finding; convergent findings fold once at the root and list every ID. ID
prefixes: C contract, X mechanics, R risk. The risk lens's premise correction (the spec fold
refused protected paths) is accurate and is now superseded by conductor decision 1.

Facts re-verified before folding, on `main` at `51157b99` and dotfiles at `2cbb4ec`:

- `075bc174`'s `vitest.config.ts:27` enables the trigger list only on a `related` or `--changed`
  argv.
- `e2e.yml` and `publish.yml` call `norms.yml` through `uses:` with no `timeout-minutes`.
- `test.yml:57` runs bare `npm test`, and `e2e.yml:142` passes `--reporter=dot,html`.
- Vitest exposes `retryCount` and `flaky` through `TestCase.diagnostic()`, a Reporter API method
  (`cli-api.CnMVyzaz.js:11739-11751`), not through its built-in JSON reporter, whose per-test
  object has no retry field (`index.UpGiHP7g.js:3567-3583`). Corrected in the second fold; this
  line first read "Vitest writes `retryCount` and `flaky`", the C-M2 miscitation.
- `lint` and `check:comments` cover no `scripts/` path.
- `gate-tier.mjs` `parseArgs` has no default case, so it ignores an unknown `--class`.
- `playwright.config.ts:51` sets `reuseExistingServer: !process.env.CI`.
- Pass A guarded port 4392 (`2026-10-08-engine-pass-pre-2b-a.md:193`).
- `cairn-run-gate` deletes run state right after the status appears (`:255`, `:282`), and its
  `jq` and `flock` live under Homebrew.
- `cairn-pass` keeps STATUS on `main` (`SKILL.md:136`) and stages checkpoints with `git add -p`
  (`:41`).
- Neither timed range touches a protected path.
- The research brief cites arXiv 2511.21654 and Anthropic's harness line.

## Conductor decisions applied

1. **Protected paths wait for CI green** (reverses spec fold row 37 in part). The first
   application ran F on each protected-path task. The conductor then corrected it to the reading
   consistent with Geoff's settled "CI replaces the local full gate": the task runs its targeted
   gate, then waits for CI green on its own commit before the next task starts (the `auth-data`
   wait), and F runs only on `ci-green` exit 3. In the runner, this is a per-task `ciWait: true`
   that the plan sets on any task whose Files name a protected path, and `diff-reviewer` blocks a
   protected-path touch on a task without it. Plan: Gates "Protected paths", Decision 10, the Gate
   lines of Tasks 2, 3 (a fixed string, never its own classifier's output), and 4a, Task 5's
   flag and case, Task 6a errata 1, 2, and 7, the Segments note, and close step 1. The rule follows existing convention:
   the draft's trigger list, Vitest's default `forceRerunTriggers`, and the build-config widening
   in Bazel and TAP. Measured defect: arXiv 2511.21654 observed Claude Code editing tests, and
   Anthropic's harness guidance says "It is unacceptable to remove or edit tests". The
   removed-lines metric stays refused. At the close, a simplifier change to a protected path
   takes the close's CI read as its wait.
2. **Merge order cairn-cms first, dotfiles in the same sitting.** Verification agrees: the old
   `parseArgs` silently drops `--class`, and the old runner never passes it. Plan: owner-gated
   step 2. The owner-gated steps stay owner-gated.
3. **Zero runs is never green, and a missing `ci-green.json` is unavailable.** Plan: Gates "CI
   green", interface 4, Task 4b's Outcome and its fixtures.
4. **Clock re-costed honestly** from X-M5's measured tally plus decision 1 as corrected, from
   4.25 h to about 6 h (see Measures).

## Roots folded once

| # | Root | IDs | Disposition |
|---|---|---|---|
| 1 | Self-certifying gates | R-M1, C-m3, X-m4, R-M2 | Folded. Task 3's gate is the fixed string R-M1 proposed, never its own classifier's output, plus the protected-path CI wait (decision 1). Its self-range line is now evidence only (leg 1, a static leg naming `check:comments`, leg 3, the whole component project by empty selection), which drops the "trigger list is a trigger" reason. Task 2 gains array-equals-`main` and failing-component-exits-non-zero cases. |
| 2 | `ci-green` reads green with no evidence | C-M3, R-M4, C-m9 (expected-set part), X-m1 | Folded: Gates "CI green", Task 4b, Task 5. Zero runs is pending, then missing. An absent or malformed `ci-green.json` exits 3. An exit outside the five codes is treated as 3. The live call may quote exit 3. **Refused in part:** R-M4's "a `judgedWhenPresent` workflow becomes expected by its `paths` filter" is the YAML glob evaluation the spec fold refused (row 1), and the zero-runs rule already closes the vacuous tool-only green. |
| 3 | E2e map defaults | C-M1, X-M4, X-m6 | Folded: Task 3 has one table-driven case per default, the create-cairn-site leg, `E2E_PORT`, and the port guard. Decision 11 keeps `--grep-invert` for `site-visual` (owed spec erratum). F and leg 6 carry pass A's no-listener guard. |
| 4 | Retry reporter source | C-M2, R-M3 | Folded: Task 4a adds a report per test run and quotes both sources' fields (second fold: the Vitest half is a custom reporter reading `TestCase.diagnostic()`, since the built-in JSON reporter carries no retry field). An absent report yields `unknown (<reason>)`, never `none`. Weakening pins cover no `continue-on-error`, a pipe only under `shell: bash`, and the retries step under `if: always()`. Interface 3 and the Task 4b retry-print fixtures follow. |
| 5 | Clock estimate | X-M5, R-p1, R-p2, C-P1 | Folded. The reorder (Task 7 at Task 3's accept) is superseded by Decision 10: Task 3's CI wait gates Task 7. The close reviewers run beside the ledgers. The CI waits get their own rows. Task 0 is scored on its own line. The table is re-costed. |
| 6 | Miss-rate denominator set by the agent judged | C-M5, R-M7 | Folded. Task 0 adds a separate `haiku` floor list (PR #108 non-success runs plus HISTORY items), which is pasted into Task 7 and its reviewer. Task 7's acceptance requires that included plus excluded rows account for every item on the list. |
| 7 | Known classes not pinned | C-m2, R-m6 | Folded: interface 5 and Task 3 acceptance. All six names are accepted, and only `auth-data` changes the output. |
| 8 | Trigger canary cannot see the list; its cost | X-M1, C-m6, X-m7 | Folded. Decision 12 makes `CAIRN_RELATED_RUN=1` the explicit switch. The canary uses one instance, a named path per glob, and reports its seconds. The anchor mutation's red is quoted from the dot-dir worktree. |
| 9 | New `scripts/` files lint with zero rules | X-M3, C-m5 | Folded. Task 2 adds an ESLint block (the installed plugin's `flat/recommended-typescript-flavor-error` plus the em-dash rule) scoped to this pass's named files, and a seeded em-dash acceptance case. |
| 10 | Run-record writes can break gates | X-m2, R-M8, C-m9 (records part) | Folded: interface 1 and Task 1. The detached run writes `exit` before the status file. The caller writes `vanished` and `receipt`. Writes are best effort. New cases cover an unwritable directory, `jq` off `PATH`, and an absent records file (zero sums). |
| 11 | STATUS writers and the close's last commits | X-m5, R-m5 | Folded: Global constraints and the Close. STATUS lives only on `main`, in local commits staged with `git apply --cached` and pushed at owner step 1. The close commits its ledgers before the one CI read, so that read covers the final head. |

## Single findings

| ID | Disposition |
|---|---|
| C-M4 | Folded: Task 6a erratum 2 (`cairn-pass` Closing step 6 lists retried tests and counts misses) plus a `grep` post-condition; close step 3. |
| C-m1 | Folded: "Every other check" in Task 3 leg 2. |
| C-m4 | Folded: the no-check list holds only unread paths, and a unit test pins its members. |
| C-m7 | Folded: erratum 1 names the `docs` row's gate. |
| C-m8 | Folded: an absent `retries` notice is a Task 4a fix round (Running unattended). |
| C-m10 | Folded: Task 5 adds a case where missing (exit 2) halts like red. |
| C-m11 | Folded: Task 7 is "measurement, no test mandate"; 6b's `diff-reviewer` is a stated departure. |
| C-P2 | Refused: the pre-flights run on Haiku beside `npm ci`, and pass-core owns staleness at HEAD. Trimming saves almost nothing. |
| C-P3 | Refused: the reviewer's own verdict is keep; nothing to change. |
| C-P4 | Refused: the reviewer recommends no cut; growth is accounted below. |
| C-N1 | Refused: the existing "Task 7 selection miss" rule already routes an engine-bucket addition through one Task 3 fix round. |
| X-M2 | Folded: Task 4a's timeout test exempts `uses:` calls and checks the called jobs; the Task 0 pre-flight wording is corrected. |
| X-m3 | Folded: interface 4 names the REST runs endpoint and the clone working directory. |
| R-M5 | Folded: every dispatch carries the Global constraints and cited Interfaces, and every `diff-reviewer` prompt carries the test-weakening finding now, extended to this pass's surfaces. |
| R-M6 | Folded (conductor decision 2). |
| R-m1 | Folded: the rollback lever goes in the owner message and HISTORY. |
| R-m2 | Folded: the meter is the Ledger's running sum of Agent usage, and at 3.2M the conductor stops at whichever track's boundary comes first. |
| R-m3 | Folded: the `/loop` tick runs TaskStop and confirms no growth before a relaunch, passes on the keep-or-revert note, and reads the battery. |
| R-m4 | Folded: on Tasks 2, 3, 4a, and 4b, a `testOnly` second `fix` always runs one more round. |
| R-m7 | Folded: Decision 7 covers the S1 boundary, with tellgrader run locally. |
| R-p3 | Refused, not a genuine fork. The spec settles both timed ranges and the projection, Task 6b quotes their durations, and when they run is a sequencing call. Starting Task 7 at Task 3's accept recovers most of the 20 to 30 minutes. Reversed in the second fold: Decision 10 removed that recovery, and the conductor took option (c) as Q5 cut 3. |

## Counts

51 finding IDs (contract 21 including four proportionality items and one note, mechanics 12, risk
18). Folded 46, refused 5 (C-P2, C-P3, C-P4, C-N1, R-p3), plus one part refused inside root 2
(R-M4's paths evaluation). Owner forks: none. The plan's "Rulings for Geoff" stays "None".

## Spec errata owed (spec not edited)

1. "Rules where they execute" and the task outline: the protected-path rule (Decision 10). A task
   touching the bucket and e2e-map table, the component trigger list, `gate-tier.mjs`,
   `ci-green.json`, or `.github/workflows/**` runs its targeted gate, then waits for CI green on
   its own commit before the next task, the `auth-data` wait carried by a per-task `ciWait` flag;
   the local full gate runs only when CI is unavailable. Tasks 2, 3, and 4 take that wait. The
   removed-lines metric stays refused. This reverses fold row 37 in part.
2. `ci-green` "Green": at least one run on the SHA; zero runs is pending, then missing. The
   expected-set file `.github/ci-green.json` (plan Decision 4) is unnamed in the spec. An absent or
   malformed file exits 3.
3. Erratum 11: the `--grep-invert` variant stays live in the emitted e2e leg for
   `site-visual.spec.ts` (Decision 11), not "mooted except in the fallback".
4. "CI as the full gate": the timeout test exempts reusable-workflow calls (`uses:`), where GitHub
   forbids the key, and checks the called jobs.
5. Retry annotation: a third state, `unknown (<reason>)`, for an absent or malformed report;
   JSON reporters are added to the test steps.
6. "What the draft branch contributes": the argv-sniffing trigger switch becomes
   `CAIRN_RELATED_RUN=1` (Decision 12).
7. Owed errata items 1 and 2: the `docs` row's gate; `cairn-pass` Closing step 6 lists retried
   tests and counts selection misses.
8. Clock estimate: about 6 hours, not 4.25.

## Measures

**New-mechanism findings folded (6), each with its source and measured defect:**

1. **Protected paths wait for CI green** (a per-task `ciWait` flag).
   - Source: Vitest's default `forceRerunTriggers`, the draft's trigger list, and the build-config
     widening in Bazel and TAP; the runner flag is the spec's own `auth-data` `ciWait`, applied to
     one task.
   - Defect: arXiv 2511.21654 observed Claude Code editing tests to pass, and Anthropic's harness
     guidance forbids it.
2. **`CAIRN_RELATED_RUN` switch.**
   - Source: the draft's own trigger switch, made explicit as an environment variable.
   - Defect: the mechanics probe selected 37 of 90 component files without `related` in argv
     against 90 of 90 with it.
3. **Reporters for the retry annotation.**
   - Source: a custom Vitest reporter on the public Reporter API, `onTestCaseResult(testCase)`
     (`reporters.d.DtoKVV2s.d.ts:1087`) reading `testCase.diagnostic()` for `retryCount` and
     `flaky` (`cli-api.CnMVyzaz.js:11739-11751`), and Playwright's JSON reporter. (Corrected in the
     second fold: this first named Vitest's JSON reporter, which carries neither field.)
   - Defect: today's `npm test` default reporter and `dot,html` record no retry, so Ruling 2's
     annotation cannot be built from them.
4. **The port 4392 no-listener guard.**
   - Source: pass A's plan, line 193.
   - Defect: `reuseExistingServer: !process.env.CI` silently reuses another tree's server.
5. **`--grep-invert` in the emitted leg.**
   - Source: pass A's F (`2026-10-08-engine-pass-pre-2b-a.md:1445`) and `durable-gotchas.md`.
   - Defect: 20 known local visual reds, which the reachability test forces into the map.
6. **ESLint block for the new scripts.**
   - Source: the installed jsdoc plugin's shipped `flat/recommended-typescript-flavor-error`.
   - Defect: with no block, the files lint with zero rules and exit 0; with the TypeScript
     ruleset, they produce 126 findings.

The other folds are tests, acceptance cases, or ordering, and add no new machinery: the
workflow no-weakening pins, the best-effort record write, the Ledger meter, the TaskStop before a
relaunch, and the miss-rate floor read.

**New-mechanism findings refused (2):** `judgedWhenPresent` promotion by `paths` evaluation (the
spec fold's refused YAML glob evaluation; the zero-runs rule covers the defect), and the
removed-lines metric (kept refused under decision 1).

**Plan line count:** 819 before, 996 after (+177, 22 percent, inside the 25 percent bound). The
growth is the protected-path decision, three acceptance blocks the lenses found vacuous (the e2e
defaults, the `ci-green` no-evidence states, and the retry reporter), and the re-costed clock.

**Ceiling:** 4.0M, unchanged (settled). The budget basis moves from 3.67M to 3.79M, a 0.12M
fold row for the added cases and three protected-path CI-wait probes, and the reserve falls from
0.33M to 0.21M.

**Clock:** 4.25 h becomes about 6 h. Without decision 1, the measured tally with the reorder
is about 4.9 hours; the reorder itself is superseded by Decision 10, under which Task 3's CI wait
gates Task 7 (corrected in the second fold). Its three CI waits (Tasks 2, 4a, and 3) start at the implementer's push and
overlap the review, leaving about 15 minutes each after the accept; the larger contingency covers
a fix round that takes a fourth. The conductor's correction replaced the first application's
three local F runs (about 7 hours) with these waits. It also removed the first application's
classifier rule that printed F for a protected path; the classifier now treats those paths like
any other, and the plan and the runner flag carry the rule. A CI-unavailable exit adds F (about
45 minutes) on that SHA.

## Second fold

Target: the plan at `b742fbb8` (996 lines), against the fresh-context verification
`2026-10-09-gate-economy-plan-fold-verification.md`. Scope was the conductor's five items; every
other item in the verification takes no action. Each item was checked against the installed
source before it was folded.

Source verified for item 1, Vitest 4.1.11 in this checkout's `node_modules/vitest`:

- `dist/chunks/cli-api.CnMVyzaz.js:11739-11751` is `TestCase.diagnostic()`. It returns
  `retryCount: result.retryCount ?? 0` and
  `flaky: !!result.retryCount && result.state === "pass" && result.retryCount > 0`.
- `dist/chunks/reporters.d.DtoKVV2s.d.ts:1087` declares `onTestCaseResult?: (testCase: TestCase)
  => Awaitable<void>`, "Called after the test and its hooks are finished running."
- `dist/chunks/index.UpGiHP7g.js:3567-3583`, the JSON reporter's per-test object, carries no
  retry field.
- `dist/chunks/cli-api.CnMVyzaz.js:11424-11433` and `:11445` load a reporter name outside the
  built-in map as a module and take its default export, so `--reporter=<path>` works from the CLI.
- `package.json:87` chains `npm test` as `test:node-projects && test:component` with no argument
  forwarding; `scripts/test/contained.mjs:41` forwards its own argv to the component run.
- `pass-execute.js:815` (`resolveGate`) returns before the probe on a pinned task, which confirms
  that Q4's probe must be extended to cover pinned tasks.

| # | Item | Disposition |
|---|---|---|
| 1 | Major: Vitest's JSON reporter carries no `retryCount` or `flaky` | Folded. Task 4a's Vitest half is now `scripts/ci/vitest-retry-reporter.mjs`, a custom reporter whose `onTestCaseResult` reads `testCase.diagnostic()`. It runs as `--reporter=default --reporter=./scripts/ci/vitest-retry-reporter.mjs`, which splits `npm test` into its two chained scripts; a new pin asserts that the split runs the same projects. The Vitest fixture is recorded from the reporter's real output on a throwaway test that passes on retry. The Playwright half is unchanged. This record's fact line, root 4, and mechanism 3 now cite the source correctly. |
| 2a | Minor 1: Task 4a's "overlaps Task 3" contradicts Decision 10 | Folded. The clause is gone, and the dependency note now describes cut 2's worktree. |
| 2b | Minor 2: root 5 says Task 7 starts at Task 3's accept | Folded. Root 5, the Clock paragraph, and R-p3 now say that Decision 10 superseded the reorder. |
| 3 | Q4: classifier-emitted `ciWait` | Folded. Interface 5 adds `gate-tier.mjs --range <base>..HEAD --protected`. It reads the protected list at `<base>` and fails closed when no table exists at `<base>`. It prints `ciWait` or nothing and leaves the gate string's stdout untouched. Task 3 holds the list in its table and adds four cases. Task 5's probe runs the mode on every task, pinned tasks included, and treats a non-zero exit as `ciWait`. The runner ORs the probe with the task flag and the class flag, and four harness cases cover it. Decision 10 and erratum 1 now name the classifier as the source, with the plan flag as an override and `diff-reviewer` as the backstop. |
| 4.1 | Q5 cut 1: strict wait on Task 3 only | Folded. In this pass, Gates "Protected paths" and Decision 10 apply the strict wait only where the next task builds on the change. Tasks 2 and 4a take "green before N+2", which Task 3's strict wait on a head carrying both satisfies. From pass B, the runner waits on every flagged task. |
| 4.2 | Q5 cut 2: Task 4a in a second worktree | Folded. The plan adds `.claude/worktrees/gate-economy-ci` on branch `gate-economy-ci`, created in Task 0 off `gate-economy` after the `075bc174` pick, with `npm ci` only. It holds one executor. Once Tasks 2 and 4a are accepted, the conductor cherry-picks `<4a base>..gate-economy-ci` onto `gate-economy` and pushes, so the branch is never pushed itself. A conflict means a task touched a path outside its Files. The topology section notes the shared locks: Task 2's heavy gate holds `machine.lock`, and Task 4a shares `machine-light.lock` with D. To keep the Files disjoint, Task 4a no longer edits the lint block; Task 3 joins Task 4a's two scripts to it and adds a seeded em-dash case. Owner step 3 removes three worktrees. |
| 4.3 | Q5 cut 3: Task 7's timed ranges beside the close reviewers | Folded. Task 7 keeps the blocking parts: the dry runs and the miss-rate table. The two timed ranges (part 2) and the projection, which is computed from them (part 4), run at close step 2 after the simplifier, beside the reviewers. The ledger commit appends both to the replay record and quotes the durations in pass B's plan. An over-10-minute range's bucket revisit joins the close's fix chain under Task 3's gate, and step 4's CI read serves as its wait. |
| 5 | Re-cost clock and budget | Folded. See below. |

**Clock:** about 4.8 hours, down from about 6. On the critical path, Task 2 drops to 55 minutes
(no residue). Task 4a runs beside it, off the path. Task 3 rises to 85 minutes, adding the
cherry-pick and `--protected`. Task 7 falls to 35 minutes, Task 6b stays at 15, the close at 55,
and contingency at 45, for 290 minutes in all. This matches the verification's 4.8 hours for cuts
1 to 3 plus Q4's 10 minutes. The dotfiles track rises to about 2.9 hours because Task 5 takes
about 5 more minutes. That brings Task 6a's accept level with Task 7's, so either may set Task 6b's
start.

**Budget:** Task 3 rises from 0.40M to 0.44M and Task 5 from 0.35M to 0.38M for Q4. Task 0 rises
from 0.15M to 0.18M for the third worktree's `npm ci`. The custom reporter replaces the JSON
reporter work at the same size. The basis moves from 3.79M to 3.89M, and the reserve falls from
0.21M to 0.11M. The 4.0M ceiling and the 3.2M stop are unchanged.

**Segments:** S1 runs Task 2 beside Task 4a in two worktrees, then Task 3. A Close row names the
timed ranges beside the reviewers.

**Plan line count:** 996 before, 1,099 after (+103, 10 percent).

**Spec errata owed, amended:** erratum 1 now reads that the classifier's `--protected` mode emits
the wait, and that in a hand-dispatched pass with fixed gates the strict wait applies only where a
successor builds on the touched machinery. Erratum 5 now names a custom Vitest reporter in place
of a JSON reporter for Vitest. Erratum 8 now reads about 4.8 hours.
