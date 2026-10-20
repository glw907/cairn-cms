# Gate economy plan review: domain risk lens

Target: `docs/superpowers/plans/2026-10-09-gate-economy.md` at `211b1a37`. Spec:
`docs/superpowers/specs/2026-10-09-gate-economy-design.md`. Lens: assurance loss and process
failure during and after a pass that rewrites the gates guarding every later pass, partly using
itself. Per Anthropic's reviewer guidance, only gaps affecting correctness or the stated
requirements are raised as blocker or major; the rest are optional.

Counts: 0 blockers, 8 majors, 10 minors (7 risk, 3 proportionality, 1 of those an owner fork).

A premise correction first. The brief says the spec made the selection maps and tests protected
paths. It did not: the spec fold refused protected paths (fold record row 37, "Refused in part:
protected paths forcing the full gate and a removed-lines metric"). What the spec folded is the
`diff-reviewer` test-weakening finding plus CI as the holdout. The plan is judged against that,
and M5 below asks only for the folded finding to reach this pass's own reviews, not for the
refused machinery.

Verified against: `scripts/checks/gate-tier.mjs` on `main` (`parseArgs` at :223-241),
`075bc174` (the draft's trigger list and `close-prebuilt` test), `package.json:79-87`,
`.github/workflows/{test,tool,tool-conditions}.yml`, `~/.dotfiles` at `2cbb4ec`
(`pass-execute.js:430-480`, `:800-850`), `~/.claude/agents/diff-reviewer.md`,
`~/.claude/skills/pass-core/SKILL.md:96-145`, `:210-222`, `~/.claude/skills/cairn-pass/SKILL.md:36-43`,
`:136`, `~/.claude/docs/unattended-work-guards.md`, and the spec fold record.

## Majors

### M1. Task 3 certifies itself: its gate is the classifier it builds

- **Plan:** 506-513.
- **Defect:** Task 3's gate is "the string `gate-tier.mjs --range <base>..HEAD` prints at the
  task's head." A classifier whose static leg selects too little prints a gate that omits those
  checks, and the task passes its own gate. The acceptance at 506-507 asserts legs 1, 3, and the
  whole component project, but never leg 2. Task 3's range is a `scripts/` file, its table, a
  unit test, and a docs file, so the scripts bucket should select `check:comments` and the docs
  bucket tellgrader. Nothing asserts either. The fallback string (511-513) runs only when the
  classifier prints nothing, never when it prints too little.
- **Evidence:** the parenthetical at 507 is also wrong. Task 3's Files (457-459) include neither
  the trigger list nor `vitest.config.ts`, and `gate-tier.mjs` is not in `075bc174`'s
  `COMPONENT_RERUN_TRIGGERS`. The whole component project would run through the empty-selection
  rule, not a trigger. An implementer told "the trigger list is a trigger" may add
  `scripts/checks/**` to the trigger list to satisfy the line. That edit widens the list, and it
  also changes the list's meaning.
- **Fold:** make the fixed string at 511-513 Task 3's gate unconditionally. Its marginal cost over
  the computed gate is `lint`, `check:comments`, and `check`, about a minute. Keep the computed
  gate as an acceptance line: "the classifier's output for this task's range contains leg 1, a
  static leg naming `check:comments`, leg 3, and the whole component project (empty selection),
  quoted." Strike "(the trigger list is a trigger)". The same rule applies to a Task 7-triggered
  fix round on Task 3 (268-269, 714).

### M2. Task 2's runner can drop a component or swallow a failure, and it becomes F and every static leg

- **Plan:** 384-411.
- **Defect:** `check:close` moves from the `package.json` `&&` chain (40 components) into an
  exported array. The CI-coverage test (397-399) runs one way only: array to CI. Nothing asserts
  the array still holds every component `main`'s chain runs. The draft's own anchor, "runs one step
  per check:close component, in check:close order" (`075bc174:src/tests/unit/close-prebuilt.test.ts:74`),
  reads the `package.json` chain that Task 2 deletes. Nothing tests the exit code either: one
  failing component must leave the runner non-zero while the rest still run. The draft states it
  in a comment (`close-prebuilt.mjs:12-13`), but no test proves it. Task 2's gate ends in
  `npm run check:close` (409-410), the runner under test. F, the close fallback, runs it too, and
  so does Task 3's static leg through the subset. A swallowed exit would pass all three.
- **Fold:** add two acceptance lines. First: "the exported array equals the component list of
  `main`'s `check:close` (quote both counts; a set difference prints nothing)." Second: "a fake
  failing component makes the runner exit non-zero after running every other component (mutation:
  force exit 0; quote the red, then revert)."

### M3. Task 4a edits the CI backstop with no pin that a test failure still fails the job

- **Plan:** 419-449.
- **Defect:** CI is this pass's full gate at S1, S3, and the close (Decision 7), and Task 4a edits
  that backstop in S1. To read retries, the implementer must change each test step's reporter,
  either through the `npm test` command or a new reporter output (`test.yml:57` runs bare
  `npm test`). Three edits would turn CI green on a red:
  - A pipe through `tee` or a parser. A `run:` step with no `shell:` runs `bash -e {0}`, with no
    `pipefail`.
  - `continue-on-error` on a test step.
  - A retries step that ends the job's failure handling.
  
  A PR's `pull_request` runs use the PR's own workflow files, so every later CI read in this
  pass, the close's included, would inherit the defect. The acceptance pins only the timeouts and
  the trigger shapes.
- **Fold:** extend the `workflow-yaml.test.ts` acceptance. No step in `test.yml`, `e2e.yml`, or
  `design.yml` sets `continue-on-error`. A test step's `run:` contains no `|` unless the step sets
  `shell: bash`. The retries step runs under `if: always()` and follows its test step. Mutation:
  add `continue-on-error: true` to the `npm test` step, quote the red, then revert. Add one line to
  the reviewer criteria: "the test steps' commands change only by an added reporter."

### M4. `ci-green` can read green with no CI evidence

- **Plan:** 148-150, 195-200, 563-586.
- **Defect:** green is defined as "every run on the SHA succeeded and the expected set is
  present." That condition holds vacuously in two cases.
  - **A diff entirely under `tool/**`.** The expected set is empty, and `tool` and
    `tool-conditions` are "judged only when present." Read before the runs are created, zero runs
    and an empty set satisfy green. `tool.yml` filters on `tool/**`, so for a tool-only diff its
    run is certain, not optional.
  - **A missing or unreadable `.github/ci-green.json` at the SHA.** This covers any SHA before
    this pass merges, and every SHA in the dotfiles-first window (M6). The plan never says what
    `ci-green` does, and an implementer who treats a missing file as an empty set produces the
    same vacuous green.
- **Fold:** add three Task 4b acceptance cases. A tool-only file list with zero runs is pending
  (75), and later missing, never 0. A `judgedWhenPresent` workflow becomes expected when the file
  list matches its `paths` filter (the `tool/` prefix suffices for `tool`). A missing or malformed
  `ci-green.json` at the SHA exits 3 (unavailable, so F runs). Add one line to the Gates section:
  any `ci-green` exit outside {0, 1, 2, 3, 75}, such as 127 for command not found, is treated as 3.

### M5. This pass's own reviews lack the test-weakening finding and the fail-closed rule

- **Plan:** 93-99, 161-169, 657-660.
- **Defect:** both agents receive only the task's Outcome, Acceptance, cited Decisions, and Files.
  "Neither agent reads this plan" (98). The Global constraints are never pasted, the "Fail closed"
  rule at 167-169 included. The spec's test-weakening finding lands only in Task 6a, in the
  `pass-execute.js` prompt, which this hand-dispatched pass never runs and which goes live only at
  the dotfiles merge. `~/.claude/agents/diff-reviewer.md` carries no such check today. So the pass
  that authors the bucket table, the e2e map, the trigger list, the close component array, the
  expected set, and the CI workflows is reviewed with no instruction to block on narrowing them.
  "An implementer's unspecified decision inside the task's constraints" (265) is ruled on alone,
  and bucket membership is exactly such a decision.
- **Fold:** paste the Global constraints and the cited Interfaces into every dispatch. Paste the
  spec's finding text into every `diff-reviewer` prompt now, with the list extended to this
  pass's own surfaces: "an existing test deleted, skipped, `.only`'d, or loosened; a bucket, e2e
  map entry, trigger, `check:close` component, `ci-green.json` entry, or workflow test step
  narrowed or weakened, that the task's criteria do not name." This adds no machinery. It is the
  folded rule, applied one pass early to the pass that most needs it.

### M6. Dotfiles-first merge order opens a window where live rules point at missing machinery

- **Plan:** 289-295, 205-207.
- **Defect:** the plan merges dotfiles first, which means the live pass-core, cairn-pass, both
  runners, and `cairn-run-gate` all change through stow before cairn-cms `main` has
  `ci-green.json` or `--class`. In that window:
  - The new runner passes `--class auth-data` to `main`'s `gate-tier.mjs`. Its `parseArgs`
    switch (`gate-tier.mjs:229-239`) has no default case, so it silently ignores the flag and
    prints a gate with no auth specs. The failure is open: no error, no fallback.
  - The new rules route boundaries through `ci-green`, which hits M4's missing file.
  
  The reverse order is safe. With cairn-cms first, the old runner never passes `--class` or `ci`.
  The old pass-core still runs the local full gate at boundaries. `--pin full` stays
  byte-identical (505), so the old rules keep their full gate. The plan's stated reason, "so pass
  B's session starts with the rules," holds in either order, because the resume prompt (797)
  already waits for both merges. Every other cairn-cms session on this machine is exposed for the
  whole window.
- **Fold:** reverse step 2's order: cairn-cms first, then dotfiles and `stow -R bin` in the same
  owner sitting. Add one line to the owner message: start no cairn-cms pass session between the
  two merges. M4's exit-3-on-missing-config fold closes the residual window.

### M7. The replay's miss-rate denominator is set by the agent being judged

- **Plan:** 692-697, 705-707, 744-750.
- **Defect:** "A table with fewer rows than the known events fails," but the known-events count
  comes from the same Task 7 implementer who assembles the table. The replay is the only
  independent proof that the selection loses no assurance; CI cannot test selection. A Sonnet
  implementer who misses a red run on PR #108 shrinks both the numerator and the denominator. The
  required rows (only three) bound this from below, not above.
- **Fold:** the S3 pre-flight (744-750) already reads "PR #108's run list." Have it emit the
  denominator: every failed run's SHA, workflow, and failing job on PR #108, plus the count of
  HISTORY "What the gates caught" items. Paste that list into Task 7's dispatch as the row set the
  table must account for, with each row either included or excluded with a reason.

### M8. Run records ride every gate on the machine with no non-interference test

- **Plan:** 530-549.
- **Defect:** after the dotfiles merge, every pass on this workstation (sites included) runs
  through the new `cairn-run-gate`, and the record is written by the detached run "when its status
  is known." The record write has several ways to fail, any of which can stop the run before it
  writes its status:
  - `jq` lives under Homebrew (`/home/linuxbrew/.linuxbrew/bin/jq`), which may be missing from
    the detached run's `PATH`.
  - The records directory may be unwritable.
  - The `flock` may time out.

  The caller then sees "vanished," re-issues, and after three vanishes gets `gate exit: 1`. A
  record failure turns every gate on the machine red. No acceptance case covers it.
- **Fold:** add one acceptance case. With an unwritable records directory, or with `jq` absent
  from `PATH`, the gate's printed exit and its receipt are unchanged and a one-line warning goes
  to stderr. Say in the Outcome that the record write follows the status write and can never
  change it.

## Minors

### m1. No rollback lever is named for a gate that proves wrong after merge

- **Plan:** 76-78, 289-295.
- **Defect:** pass B is the first real user. If its selection misses, the plan gives no
  procedure. The lever already exists: `--pin full` stays byte-identical, a plan can pin
  `gateTier: full` per task, and the CI read stays as the boundary backstop.
- **Fold:** one line in the close's HISTORY entry and in the owner message. The first rollback is
  a `gateTier: full` pin in the next plan, with no code change. A full rollback reverts both
  merges in M6's order reversed: dotfiles, then cairn-cms.

### m2. No meter the conductor can read unattended for the 3.2M stop

- **Plan:** 36-38.
- **Defect:** `/cost` is a user-typed built-in, not a skill the model can invoke. The only meter
  available to the conductor is the per-dispatch usage the Agent tool returns, plus its own
  context. With two tracks, "the next segment boundary" is also ambiguous.
- **Fold:** name the meter: the conductor keeps a running sum of subagent usage in the Ledger. At
  3.2M, each track finishes its task in flight, and the conductor asks at whichever boundary comes
  first.

### m3. The `/loop` relaunch can put two executors in one worktree

- **Plan:** 299-307, 287.
- **Defect:** "Relaunches a dead chain from its last verified commit" judges deadness from
  transcript idle. Two failures follow:
  - An implementer blocked on a long `cairn-run-gate` re-issue looks idle. A relaunch without
    TaskStop races it and inherits its warm uncommitted edits, the global "one executor per
    worktree" stop signal.
  - A battery stand-down at 11% is a stop, but nothing arms a watcher for it.
- **Fold:** the tick runs TaskStop on the old agent first and confirms its transcript has stopped
  growing. It then gives the relaunched implementer the guards doc's keep-or-revert note for any
  uncommitted diff, and reads battery capacity each tick.

### m4. Accepting a second `testOnly` fix alone is wrong where tests are the deliverable

- **Plan:** 258-259.
- **Defect:** on Tasks 2, 3, 4a, and 4b, the tests are the proof that a selection or
  classification fails closed. A `testOnly` finding there, such as "this case does not prove the
  dot-prefix rule," is a behavior finding for this pass. Accepting it with notes batched to the
  boundary ships the gate unproven.
- **Fold:** for those four tasks, a second `fix` with `testOnly` findings runs one more round.
  `commentOnly` keeps the accept-alone rule.

### m5. STATUS is written in two places, and `git add -p` cannot run unattended

- **Plan:** 176-177, 782-794.
- **Defect:** the plan has two writers for one file:
  - Checkpoints commit STATUS on `main`.
  - The close rewrites STATUS on the `gate-economy` branch, while cairn-pass:136 says STATUS is
    updated on `main` as part of the merge.
  
  If any checkpoint reaches `origin/main`, the close's base rule (765-767) forces a merge of
  `main`, and that merge conflicts on `docs/STATUS.md`. A conflict trips "merge only if clean,
  otherwise stop" (284-285). Separately, `git add -p` is interactive, which this environment does
  not support.
- **Fold:** the close's STATUS lands on `main` at the owner merge, per cairn-pass:136. The branch
  carries HISTORY, ROADMAP, and the plan only. Checkpoints stage their own hunks with
  `git diff <file> > patch`, a filtered `git apply --cached`, and never push `main` mid-pass.

### m6. `--class` must accept every class name

- **Plan:** 205-207, 503.
- **Defect:** "An unknown class exits non-zero." If the classifier knows only `auth-data`, every
  `engine-logic`, `paint`, `sweep`, `docs`, or `tool` task silently falls back to its plan gate
  (`pass-execute.js` `resolveGate`, empty stdout leads to fallback). Pass B is mostly
  `engine-logic`. The names live in dotfiles `PASS_CLASSES`, the classifier in cairn-cms, so the
  two lists can drift.
- **Fold:** add one acceptance line. Each of the six `PASS_CLASSES` names is accepted, and only
  `auth-data` adds specs.

### m7. The S1 boundary departs from the live pass-core rule without a Decision

- **Plan:** 69, 100-102, 233-237.
- **Defect:** line 101 says the pass "runs under the pass-core rules live at its start," and live
  pass-core runs "the full gate at each segment boundary" (`SKILL.md:96-97`, `:105`). The S1
  boundary proof is CI green, and Decision 7 covers only the close. CI is a superset of the local
  full gate apart from tellgrader, so this costs no assurance, but an unattended conductor meets
  a contradiction it has to resolve.
- **Fold:** extend Decision 7 to "the S1 boundary and the close," and add the tellgrader rule to
  the boundary.

## Proportionality (optional; ranked by clock on the critical path)

### p1. The S1 boundary's CI wait is unestimated and blocks Task 7

- **Plan:** 49-52, 73-74, 515-517.
- **Defect:** Task 7 "starts when S1's boundary is green," which includes a CI cycle on Task 3's
  head: 663 s of job time plus up to 1,232 s of measured queue. That wait is not in the 4.25 h
  table. Task 4a's cycle is counted, but it overlaps Task 3 and does not cover Task 3's push.
  Task 7 needs Task 3 accepted, not CI green. A CI red stops the pass either way.
- **Fold:** Task 7 starts at Task 3's accept, and the S1 CI read runs in the background. A red
  halts Task 7's follow-ons, which is the pipelining this pass builds. The expected saving is
  about 20 to 30 minutes.

### p2. The close's review fan-out runs after the CI read instead of beside it

- **Plan:** 765-774.
- **Defect:** step 3's two whole-branch reviewers are read-only and can run during step 2's CI
  wait. Run serially, a clean review adds its full duration to the clock.
- **Fold:** dispatch step 3 at step 2's push. A blocking finding still takes one fix chain and
  one CI re-read.

### p3. OWNER FORK: Task 7's timed ranges and projection are non-blocking

- **Plan:** 688-709.
- **Defect:** the projection and the two timed ranges are non-blocking by the spec's own text: a
  miss is recorded and the pass carries on. They cost about 25 to 30 minutes of heavy-lane clock
  on the critical path. The miss-rate table is the blocking assurance.
- **Options:**
  - (a) Keep as planned (spec-settled).
  - (b) Time one range, the admin range, and drop the projection to a one-line computed figure.
  - (c) Run the timed ranges after the close's CI push, in parallel with the review.
- **Recommendation:** (c). It keeps the spec's evidence and takes it off the critical path. Task
  6b's quote of the durations then moves to the close's fix chain.

Not raised: the length of Task 0's S1 pre-flight list (337-355). It re-verifies facts the fold
checked the same day, but it runs on Haiku in parallel with `npm ci`, so it costs almost nothing.
