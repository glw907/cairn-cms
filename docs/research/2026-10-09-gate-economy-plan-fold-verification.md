# Gate economy plan fold: fresh-context verification

Target: `docs/superpowers/plans/2026-10-09-gate-economy.md` at `89b60e27` (996 lines), against the
fold record `2026-10-09-gate-economy-plan-fold.md`, the three plan reviews, the spec, and the
pre-fold plan at `211b1a37`. Per Anthropic's reviewer guidance, findings are limited to gaps that
affect correctness or a stated requirement. Everything else is marked optional.

Probes run for this read (read-only, on `main` and `~/.dotfiles` main):

- `075bc174:vitest.config.ts:27-32`: the argv sniff (`related` or `--changed`) gates
  `COMPONENT_RERUN_TRIGGERS`. Vitest's default `forceRerunTriggers` is
  `["**/package.json/**", "**/{vitest,vite}.config.*/**"]` (`defaults.9aQKnqFk.js:59`).
- `node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js:11739-11751` is `TestCase.diagnostic()`, a
  Reporter API method. The JSON reporter's `assertionResults` (`index.UpGiHP7g.js:3567-3583`) carry
  `ancestorTitles`, `fullName`, `status`, `title`, `duration`, `failureMessages`, `location`,
  `meta`, and `tags`. They carry no `retryCount` and no `flaky`.
- Playwright's JSON reporter (`playwright/lib/reporters/json.js:186`, `:194`, `:200`, read from
  1.58.2 on this workstation) writes the test `status: test.outcome()` (`flaky` on a retry pass)
  and the per-result `retry`. The plan's Playwright claim holds.
- `e2e.yml:22-23` and `publish.yml:27-28` are `uses: ./.github/workflows/norms.yml` calls with no
  `timeout-minutes`, and `norms.yml:28` sets 20. The `uses:` exemption holds.
- `pass-execute.js:298-345`: `PASS_CLASSES` has no `ciWait` today, and `validateArgs` (`:405`)
  rejects no unknown task field, so a per-task `ciWait` field is buildable. `resolveGate` (`:815`)
  already runs the classifier through a probe agent on every unpinned task, and it skips the
  classifier on a pinned task.
- `getRelevantTestSpecifications` exists in Vitest 4.1.11, and `onTestCaseResult(testCase)` is a
  public reporter hook (`reporters.d.DtoKVV2s.d.ts:1087`).

## Counts

0 blockers, 1 major, 2 minors.

## Q1. Did each blocker and major close?

No review raised a blocker. Every major closed at a plan location, with one correction:

| ID | Closed at (plan line) | Status |
|---|---|---|
| C-M1 e2e defaults | 626-631 | Closed |
| C-M2 retry reporter | 522-539, 547-552, 732-733 | Closed in form; the Vitest source is wrong (major 1 below) |
| C-M3 zero runs | 172-177, 721-722, 730-731 | Closed |
| C-M4 retried tests, misses | 809-811, 834-836, 955-957 | Closed |
| C-M5 miss-rate floor | 440-443, 871-874 | Closed |
| X-M1 trigger switch | 306-311, 597-599, 633-639 | Closed |
| X-M2 `uses:` timeout | 427-430, 541-543, 553-555 | Closed |
| X-M3 lint block | 482-487, 496-497 | Closed |
| X-M4 `--grep-invert` | 301-305, 607, 631, 900-902 | Closed |
| X-M5 clock | 44-67 | Rows closed; the reorder is superseded by Decision 10 (minor 2) |
| R-M1 self-certifying Task 3 | 643-651 | Closed |
| R-M2 component array, exit code | 492-495 | Closed |
| R-M3 CI backstop pins | 544, 556-559 | Closed |
| R-M4 vacuous green | 172-177, 721-722, 730-731 | Closed; the refused part is the spec fold's refused YAML glob evaluation |
| R-M5 reviewer finding now | 107-114 | Closed |
| R-M6 merge order | 363-369, 372-374 | Closed |
| R-M7 denominator | 440-443, 871-874 | Closed |
| R-M8 record non-interference | 226-228, 676-678, 693-695 | Closed |

### Major 1. Vitest's JSON reporter writes no `retryCount` or `flaky`

- **Location:** plan:532-534 (Task 4a Outcome), plan:235-237 (interface 3), fold record:136-140
  (new mechanism 3). The contract review's fact line carried the same miscitation.
- **Defect:** the cited lines are `TestCase.diagnostic()`, which a custom reporter can call. The
  built-in JSON reporter's per-test object has no retry field. An implementer who adds
  `--reporter=json` and reads `retryCount` finds it absent on every test, so the script yields
  `none` for every component run, or `unknown` if the field check is strict. The component project
  retries twice in both places (`vitest.config.ts:194`, spec line 50-51). It is the one project
  whose retries Ruling 2's annotation most needs to log. A recorded fixture hand-written to the
  plan's claimed shape would pass the unit test while CI's real report never matches it.
- **Fold:** Task 4a's Outcome replaces the Vitest half with a small custom reporter on Vitest's
  public Reporter API. `onTestCaseResult(testCase)` reads `testCase.diagnostic()` for
  `retryCount` and `flaky` (`cli-api.CnMVyzaz.js:11749-11751`) and writes its own JSON file. It
  runs as `--reporter=default --reporter=<that file>` on the node and component test steps. The
  file joins Task 2's ESLint block. The Vitest fixture is recorded from that reporter's real output
  on a test forced to pass on retry, never hand-written. Interface 3 and fold record mechanism 3
  are amended to name the reporter. The Playwright half is unchanged. The no-weakening pin at
  plan:544 ("changes only by an added reporter") still holds.

## Q2. Contradictions and build order

The order builds. Neither track has a dependency cycle:

- cairn-cms runs Task 2, then 4a, then 3, then 7, then 6b.
- dotfiles runs Task 1, then 4b, then 5, then 6a.
- Task 6b joins both tracks after 7 and 6a.

Task 4b's live call has a stated exit-3 fallback (plan:737-739) if Task 4a's `ci-green.json` is
not yet pushed. The merge order is consistent in three places: cairn-cms first (plan:363-369), the
rollback reverses it (plan:372-374), and the between-merges window is closed by "no cairn-cms pass
session starts" (plan:368). Pinned `--pin full` output is byte-identical (plan:642), so the old
rules keep their gate across the window.

### Minor 1. Task 4a's dependency note contradicts Decision 10

- **Location:** plan:519-520 ("before Task 3 so its CI cycle overlaps Task 3").
- **Defect:** Task 4a touches protected paths, so under Gates plan:169-171 and Decision 10
  plan:295-297 Task 3 cannot start until 4a's CI is green. No overlap exists. The clock table
  (plan:54) already counts the wait, so only the sentence is wrong. An unattended conductor who
  reads it may start Task 3 early.
- **Fold:** strike the clause, or adopt Q5 cut 1, which makes the sentence true.

### Minor 2. The fold record says Task 7 starts at Task 3's accept; the plan says CI green

- **Location:** fold record:59 (root 5) and the claim in its Clock paragraph; plan:56, plan:83,
  plan:844.
- **Defect:** the plan is internally consistent: Task 7 waits for Task 3's CI, as Decision 10
  requires. The record claims the X-M5 and R-p1 reorder was folded when Decision 10 superseded it,
  so the record misstates the plan.
- **Fold:** amend root 5's disposition to "superseded by Decision 10: Task 3's CI wait gates
  Task 7".

## Q3. New mechanisms checked against source

| Mechanism | Verdict |
|---|---|
| `CAIRN_RELATED_RUN=1` replacing the argv sniff (Decision 12) | Sound. The sniff is at `075bc174:vitest.config.ts:27-29`. The config is evaluated in the process that calls `createVitest`, so an environment variable set before the call (classifier) or in the worker (canary) reaches it. The mechanics probe's row 4 shows config-level triggers select 90 of 90. On the emitted leg, which runs a file list, the variable is inert but harmless. |
| In-process Node API selection | Sound. `createVitest` and `getRelevantTestSpecifications` exist in 4.1.11. The mechanics probe ran it and found it writes nothing to stdout. |
| Vitest JSON reporter `retryCount`/`flaky` | **Wrong** (major 1). The fields come from `TestCase.diagnostic()`, not the JSON reporter. |
| Playwright JSON `retry` and `flaky` | Sound (`json.js:186`, `:200`). |
| Job-timeout `uses:` exemption | Sound. Both `norms` calls lack the key, `norms.yml`'s job sets it, and GitHub's calling-job key list omits it. |
| Per-task `ciWait` in `pass-execute.js` | Buildable as stated: no flag exists today, and task objects accept new fields. It is new code for Task 5, not an existing flag. The fold calls it "the spec's own `auth-data` `ciWait`", but the spec states the wait (spec:124-125, :214-215) and never names a flag. |

## Q4. Plan flag or classifier-emitted `ciWait`

**Recommendation: the classifier emits it, in a separate mode, with the plan flag kept as an
override and `diff-reviewer` kept as the backstop.**

Reasoning:

- The runner already runs the classifier independently on every unpinned task (`resolveGate`,
  `pass-execute.js:815`), after the implementer's commits and before the accept. The signal would
  reach the runner at the right moment.
- A plan flag depends on the plan author reading Files correctly. It misses an implementer who
  drifts into a protected path outside Files. Only a model-judged reviewer catches that today. The
  workstation rule ("a rule lives where it executes", strongest form first: tool, then runner,
  then agent) favors the tool.
- The protected list is cairn-cms knowledge. Decision 4's principle keeps that knowledge out of
  the dotfiles runner, so the classifier is its natural home.

Shape:

- `gate-tier.mjs --range <base>..HEAD --protected` prints `ciWait` when any path in the range
  matches the protected list, and prints nothing otherwise. It exits 0 in both cases.
- The list is read at `<base>` (`git show <base>:<table>`), so a range that deletes its own entry
  still flags.
- The default stdout, the gate string, stays untouched. This mode does not revive the first
  application's removed rule that printed F.
- The runner waits when `t.ciWait`, the class's `ciWait`, or the probe's `ciWait` holds. The probe
  runs `--protected` on pinned tasks too, since `resolveGate` skips the classifier for them today.

Cost:

- Task 3 adds one mode and three cases: a match, no match, and an entry removed in range. That is
  about 0.04M tokens and about 10 minutes on the critical path.
- Task 5 adds one probe field and two harness cases: probe-flagged blocks N+1, and a pinned task
  is still probed. That is about 0.03M tokens on the dotfiles track, which runs about 3 hours
  under the cairn-cms track, so it costs no clock.
- Together that is about 0.07M of the 0.21M reserve.
- This pass gains nothing from it, because it is hand-dispatched with fixed gates. The gain lands
  in pass B and later.

If the conductor holds the reserve instead, the plan-flag design is sound for this pass. File the
classifier form in ROADMAP as the named follow-up, not as prose.

## Q5. Proportionality: what drives the 6 hours

The critical path is the cairn-cms track:

| Driver | Clock |
|---|---|
| Task 2 | 70 min |
| Task 4a | 40 min |
| Task 3 | 75 min |
| Task 7 | 55 min |
| Task 6b | 15 min |
| Close | 55 min |
| Contingency | 45 min |
| **Total** | **about 5.9 h** |

Decision 10's three post-accept CI residues (about 15 minutes each, plan:49) plus Task 7's wait
for Task 3's CI account for the hour above the 4.9-hour tally (plan:62-63). No other folded
material costs material clock. The added acceptance cases are implementer minutes inside rows that
were already tight. The pre-flights run on Haiku in parallel with setup, and the plan length is
read by the conductor alone.

**Cut 1 (recommended): apply the strict wait only where the next task builds on the change.**

- The spec's reason for the `auth-data` wait is "the full suite before anything builds on it"
  (spec:124-125). The default pipeline rule already gives that guarantee whenever the next task
  does not build on the change: N's CI must be green before N+2 (spec:216).
- Task 4a does not build on Task 2: its Files are disjoint and its gate is a fixed string.
- Task 3 does not build on Task 4a.
- Task 3 builds on Task 2. Under the default rule, Task 2's CI must be green before Task 3, which
  is N+2 in the order 2, 4a, 3. Task 4a's CI must be green before Task 7.
- Only Task 3 keeps the strict wait, because Task 7's replay runs on its classifier.
- Decision 10 stands for future passes, where a successor's targeted gate is computed by the
  machinery the change touched. In this pass every gate is a fixed string.
- **Saving:** about 30 minutes (two residues). **Risk:** a red on Task 2's CI arrives while Task 4a
  is in flight. Task 4a finishes its chain, then the line stops (spec:217-220), so the rework is
  bounded to Task 4a's 40 minutes and only occurs on a red.

**Cut 2 (optional): run Task 4a in a second cairn-cms worktree beside Task 2.**

- This is the mechanics review's optional M5 item. The two tasks have disjoint Files, and Task 4a
  takes the light lane while Task 2 takes the heavy one.
- Task 4a's commit is cherry-picked onto `gate-economy` before Task 3. Its CI proof rides Task 3's
  head.
- **Saving:** about 25 minutes off the critical path. **Cost:** one more worktree and `npm ci`
  (Haiku, about 0.03M) and one trivial cherry-pick.

**Cut 3 (optional, lower value): the refused R-p3 option (c).** Run Task 7's two non-blocking timed
ranges beside the close's reviewers instead of on the path. Task 6b's quote of their durations
then moves to the close's fix chain. **Saving:** about 20 minutes. **Cost:** one more close step.
It is the largest remaining non-blocking item on the path.

Cuts 1 and 2 bring the estimate to about 5.1 hours. Adding cut 3 brings it to about 4.8 hours.
Every cut keeps every gate, test, and CI read.
