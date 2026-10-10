# Gate economy pass

**Goal:** Cut the clock a pass spends on gates to about half of pass A's, with no loss of
assurance. `cairn-run-gate` writes one run record per run. `check:close` builds the package once.
The per-task gate becomes one targeted gate sized by check buckets, an e2e map, and Vitest's
related selection. CI becomes the full gate at segment boundaries and the close, read by a new
`ci-green` command. The sequential runner pipelines CI behind review with stop-the-line. The rules
land where they execute, and a replay of pass A proves the selection before pass B runs on it.

**Spec:** `docs/superpowers/specs/2026-10-09-gate-economy-design.md` at `e8bdb077`, with Geoff's
two rulings recorded there (the coverage probe is dropped; a retry-pass is green and logged). Fold
record and owed minors: `docs/superpowers/research/2026-10-09-gate-economy-spec-fold.md`. Inputs:
`docs/superpowers/research/2026-10-09-gate-economy-pass-inputs.md`. Where this plan and the spec
disagree, stop and report, except under "Decisions this plan takes".

**Pass class:** `engine-logic` for every cairn-cms script and test task (Tasks 2, 3, 4a); Task 7
is measurement with no test mandate.
Dotfiles tasks declare their own class and gate: Tasks 1, 4b, and 5 are `engine-logic` (bash or
JavaScript behavior, test-first); Task 6a is `engine-logic` for its one runner pin and its prompt
text, with docs items reviewed by the same reviewer; Task 6b is `docs`. No task is `auth-data`:
nothing here touches auth, sessions, D1, signing, or the commit path. The close runs the union,
which adds no class settle step.

**Token ceiling:** 4.0M for the whole pass, both tracks plus the close (settled by Geoff,
2026-10-09). Basis:

| Item | Budget |
| --- | --- |
| Task 0: three worktrees, baselines, draft PR, S1 and S2 pre-flights | 0.18M |
| Dotfiles chains: Task 1 (0.25M), Task 4b (0.30M), Task 5 (0.38M), Task 6a (0.30M) | 1.23M |
| cairn-cms chains: Task 2 (0.30M), Task 4a (0.20M), Task 3 (0.44M), Task 7 (0.30M), Task 6b (0.12M) | 1.36M |
| S3 pre-flight | 0.05M |
| One fix round per segment in reserve (three segments) | 0.40M |
| Close: two simplifier runs, two whole-branch `diff-reviewer` reads, the CI wait, one fix chain, ledgers | 0.55M |
| Plan-review fold: added acceptance cases, the protected-path CI-wait probes | 0.12M |
| **Total** | **3.89M** |

The remaining 0.11M is unallocated reserve. The meter is the conductor's running sum of the usage
each Agent call returns, kept in the Ledger's Clock column notes (`/cost` is a user-typed command
the conductor cannot run). **At 80 percent (3.2M)** each track finishes its task in flight, the
conductor writes STATUS, and asks one combined question at whichever track's boundary comes first.
It starts no new segment past 3.2M without an answer.

**Clock estimate:** about 4.8 hours from the first implementer dispatch to merge-ready, re-costed
from the plan review's measured tally (mechanics M5), Decision 10, and the fold verification's Q5
cuts. Three worktrees run side by side, one executor per worktree; the cairn-cms track sets the
critical path. Measured inputs: Task 2's gate about 21 min, the build-once `check:close` 679 s,
the CI test job 663 s, a CI queue of up to 1,232 s. Task 3's strict CI wait starts at the
implementer's push, so it overlaps the review; about 15 min of it is left after the accept.

| Step | Estimate |
|---|---|
| Task 2: implement, its gate (about 21 min), review; CI runs behind (default rule) | about 55 min |
| Task 4a: second worktree, beside Task 2, light gate, review | about 25 min, off the critical path |
| Task 3: cherry-pick 4a, implement (with `--protected`), fixed gate (about 12 min), review, strict CI wait (the S1 read) | about 85 min |
| Task 7: starts at Task 3's CI green; dry runs, miss-rate table, record | about 35 min |
| Task 6b: pass B's plan and ROADMAP, `git diff --check`, review | about 15 min |
| Close: simplifier, then reviewers and the two timed ranges beside the ledgers, one CI read on the final head | about 55 min |
| One fix round, contingency (plus a CI wait if it lands on Task 3) | about 45 min |
| Dotfiles track: 1 (30), 4b (45), 5 (60), 6a (40) | about 2.9 h; Task 6a's accept lands about with Task 7's, so either may set Task 6b's start |

Only Task 3 keeps the strict post-accept CI wait in this pass (Decision 10, as narrowed); the same
scope without it tallies about 4.6 hours. A CI-unavailable exit adds F (about 45 min) on that SHA.
CI waits are not rework: the score reads them from the CI wait records. The tally is 55 + 85 + 35
+ 15 + 55 + 45 minutes on the critical path. Task 0 (about 25 min of worktree setup,
baselines, and pre-flights) precedes the first dispatch and is scored on its own line, per
`model-economy.md`'s "from the first execution dispatch". Task 6b runs on the cairn-cms track
because its files live in this repo's worktree.

**Checkpoint interval:** every segment boundary (three tasks per segment). The conductor writes
STATUS and a Ledger row set here at the end of Task 0, at each boundary, at any split, before any
question to Geoff, and before any stop.

**Segments** (each ends on a green commit):

| Segment | Track | Tasks | Boundary proof |
|---|---|---|---|
| S0, setup | both | 0 | Ledger entry; both baselines green; draft PR open |
| S1, close and check buckets | cairn-cms | 2 beside 4a (two worktrees), then 3 | Task 3's gate green on the head; pushed; CI green on the head (expected set, below) |
| S2, records, `ci-green`, pipelining | dotfiles | 1, 4b, 5 | `bash scripts/check.sh` green on the dotfiles branch head |
| S3, rules and replay | both | 6a (dotfiles), 7 then 6b (cairn-cms) | dotfiles `check.sh` green; cairn-cms head's CI read yields to the close's (no merge of `main` in between) |
| Close | both | simplify; reviewers and Task 7's two timed ranges beside the ledgers; CI read | per "Close" |

S1 and S2 run at the same time. Inside S1, Task 2 runs in `gate-economy` and Task 4a in
`gate-economy-ci` at the same time; Task 3 starts when both are accepted and Task 4a's commits are
cherry-picked onto `gate-economy`. S3's Task 6a starts when Task 5 is accepted. Task 7 starts when
Task 3's CI wait (Decision 10), which is also the S1 boundary's CI read, is green. Task 6b starts
when both Task 7 and Task 6a are accepted.

**Split rule:** the pass carries no planned cut. If the ceiling forces one, cut at the S3
boundary: Tasks 6a and 6b become a follow-up on the same two branches, and pass B waits for them,
since its gate section is the thing 6b rewrites.

**Consultation:** none applies. This pass changes no consumer-facing surface (no `src/lib`
export, no package behavior, no scaffold output), so `engine-consult` has nothing to brief, and
`docs/internal/consultations/` holds only its README at `e8bdb077` (no unanswered brief for
`cairn-pass` step 2). Task 0 re-checks that directory.

**Execution mode:** hand-dispatched chains with the Agent tool, `pass-execute` not used.
Reasons: every segment holds three tasks, under the six-task line; the two tracks run in two
repositories, and `pass-execute` takes one `repo`; and Task 5 edits `pass-execute.js` itself, so
running the pass through that runner invites the stale-copy hazard `pass-gate-economy.md` records
(2026-10-01). Each chain is: implementer, then `diff-reviewer` against the task's criteria, then one
re-dispatch on `fix`. The conductor pastes the class mandate and bar from `pass-core` into both
prompts and names the base SHA in each dispatch.

- cairn-cms implementer: `cairn-implementer` (Sonnet pin). Dotfiles implementer:
  `general-purpose` on `model: sonnet`, effort `high`, with `cairn-implementer.md`'s "verification
  contract" section pasted into the prompt (gate evidence pasted, BLOCKED when the gate fails).
- `diff-reviewer` on `claude-opus-5-5` at `medium` for every task.
- Each chain's criteria are the task's **Outcome** and **Acceptance** blocks verbatim, plus the
  full text of every Decision and Interface it cites and the Global constraints; files are its
  **Files** block. Neither agent reads this plan.
- Every `diff-reviewer` prompt carries the spec's test-weakening finding now, extended to this
  pass's own surfaces: "Blocking: an existing test deleted, skipped, `.only`'d, or loosened; a
  bucket, no-check entry, e2e map entry, trigger, protected path, `check:close` component,
  `ci-green.json` entry, or workflow test step narrowed or weakened, that the task's criteria do
  not name." Task 6a lands the same rule in the runner; this pass is reviewed under it first.
- Every cairn-cms dispatch also asks for cairn friction in one line (pass-core's harvest rule).
- The conductor pushes each `gate-economy` task's commits (CI shadows the pass); a protected-path
  task pushes at the implementer's commit (Decision 10). Task 4a's commits are never pushed from
  `gate-economy-ci`; they reach the PR through the cherry-pick before Task 3. This pass runs under
  the pass-core rules live at its start, Decision 7's CI boundary read excepted, because Task 5's
  pipelining and Task 6a's rules reach the live tooling only at the dotfiles merge (owner step).

**Models:** implementers `sonnet`; reviewers `claude-opus-5-5` at `medium`; the pre-flights
`haiku`; the close's simplifier is the plugin agent's own Opus pin. Upshift candidate: Task 5 (the
state machine). If its one fix round leaves a behavior defect, the conductor re-dispatches it on
`model: opus` before the stop rule fires, since the spec fully specifies its states.

## Branch and worktree topology

- **cairn-cms:** worktree `.claude/worktrees/gate-economy`, branch `gate-economy`, off `main` at
  the commit that carries this plan. Its first commit cherry-picks the draft commit `075bc174`
  from branch `gate-related` (off `eab480a9`, eight files). Then push and open a draft PR against
  `main`, titled "Gate economy pass", so CI shadows the pass from its first commit. The PR number
  is recorded in the Ledger; Tasks 4b, 5, and the close use it.
- **Dotfiles:** the sources live in `~/.dotfiles` and reach `~/.local/bin` and `~/.claude` by
  stow: `bin/.local/bin/cairn-run-gate`, `claude/.claude/workflows/pass-execute.js` and
  `pass-execute-chains.js`, `claude/.claude/skills/{pass-core,cairn-pass,site-pass}/SKILL.md`,
  `claude/.claude/docs/{pass-gate-economy,model-economy}.md`, and
  `claude/.claude/agents/cairn-implementer.md`. Tests live in `tests/` (`cairn-run-gate.test.sh`,
  `pass-execute-runners.test.mjs`), and the repo gate is `scripts/check.sh`, which already runs
  both. Worktree: `~/.cache/worktrees/dotfiles-gate-economy`, branch `gate-economy`, off dotfiles
  `main` (`2cbb4ec` at plan time). It sits outside `~/.dotfiles` so neither stow nor the
  gitleaks leg of `check.sh` (run from the main checkout) sees it. The live tools stay on the main
  checkout's copies until the owner-gated dotfiles merge, so no edit here changes a gate another
  session is running.
- **Task 4a's worktree:** `.claude/worktrees/gate-economy-ci`, branch `gate-economy-ci`, created in
  Task 0 off `gate-economy` right after the `075bc174` cherry-pick, with `npm ci` only (its gate
  runs two unit test files and launches no browser). It holds Task 4a alone. When Tasks 2 and 4a
  are both accepted, the conductor runs `git cherry-pick <4a base>..gate-economy-ci` in the
  `gate-economy` worktree and pushes. The Files are disjoint, so the pick is clean; a conflict means
  a task touched a path outside its Files, and that task's chain takes a fix round. The branch is
  never pushed, and the worktree is removed with the others at owner step 3.
- **One executor per worktree.** Each worktree has one implementer at a time: Task 2 and Task 4a
  run at once only because each owns its own worktree. The conductor dispatches every chain in the
  background and never runs two chains in one worktree. Gates in all three worktrees queue on
  `cairn-run-gate`'s machine-wide locks: Task 2's heavy gate holds `machine.lock`, which any F
  fallback also waits on, and Task 4a's light gate shares `machine-light.lock` with the dotfiles
  track's D. The queue is recorded as lock wait, never as rework.
- **PR #109** (merged `1841b4db`, 2026-10-09) already landed every job's `timeout-minutes` and the
  bounded install actions. Task 4a keeps only the retry annotation, the job-timeout presence test,
  and the expected-set file that `ci-green` reads; nothing re-lands the timeouts.

## Gates

Every gate runs through `cairn-run-gate '<string>'`; on exit 75, re-issue until it prints
`gate exit:`, and never poll a log. `CAIRN_GATE_LANE=light` only for a gate that launches no
browser. `<base>` is the task's base SHA, filled in by the conductor at dispatch.

- **Dotfiles gate (D):** `CAIRN_GATE_LANE=light cairn-run-gate 'bash scripts/check.sh'`, run from
  the dotfiles worktree. It runs `bash -n`, tellgrader, ruff, pytest, the Vale fixtures, both node
  test files, `cairn-run-gate.test.sh`, the ratchet, `claude-tooling-sync lint`, and gitleaks.
- **Local full gate (F):** the `full` tier as `node -e
  "import('./scripts/checks/gate-tier.mjs').then(m => console.log(m.TIER_GATES.full))"` prints it,
  prefixed `export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . &&` (pass A's
  no-listener guard, `2026-10-08-engine-pass-pre-2b-a.md:193`), with its last step replaced by
  `npm --prefix examples/showcase run test:e2e -- --grep-invert "site home|archive page 2"` (the 20
  visual tests this workstation's Chromium renders off CI's baselines; `durable-gotchas.md`). It
  runs only where `ci-green` (or the S1 probe below) reports unavailable, on that SHA.
- **Protected paths (Decision 10):** the bucket and e2e-map table, `scripts/test/component-rerun-triggers.mjs`,
  `scripts/checks/gate-tier.mjs`, `.github/ci-green.json`, and `.github/workflows/**`. A task whose
  diff touches one runs its targeted gate, never a string its own classifier edit computes. Where
  the next task builds on the change through the machinery it touched, the task then waits for CI
  green on its own commit before the next task starts, the wait an `auth-data` task takes. The
  conductor pushes at the implementer's commit, so CI runs during the review; on exit 3, F runs on
  that SHA. In this pass only Task 3 (and any fix round on it) takes that strict wait, since Task
  7's replay runs on its classifier. Tasks 2 and 4a touch protected paths but no successor builds
  on them through a computed gate, since every gate here is a fixed string, so they take the
  default rule: N's CI green before N+2 starts. Task 3's strict wait on its own head, which carries
  both, is that read for each, so Task 7 starts only on CI green over all three.
- **CI green:** at least one workflow run exists on the SHA, every run concluded `success`, and the
  expected set is present: `test`, `e2e`, `design`, `scaffold`, and `create-site` whenever the diff
  has a path outside `tool/**`; `tool` and `tool-conditions` judged only when present. Zero runs
  is never green: it is pending, then missing at 5 minutes. A SHA without a readable
  `.github/ci-green.json` is unavailable (exit 3). The conductor treats any `ci-green` exit outside
  0, 1, 2, 3, and 75 (127 for a missing command, say) as 3. Before Task 4b is accepted, a
  `haiku` probe reads it with `gh run list --commit <sha> --json name,status,conclusion`. Once 4b
  is accepted, the conductor runs the worktree copy,
  `~/.cache/worktrees/dotfiles-gate-economy/bin/.local/bin/ci-green <sha> --pr <n> --wait`, with
  `run_in_background`, re-issuing on exit 75.
- **Inherited reds:** Task 0 records CI's state on `main`'s head. A red that `main` also carries is
  not this pass's red; it is filed in the friction log and routed to `main`.

A lone unrelated test-file failure, or a component run printing `Cannot connect to the server in
60 seconds`, follows the rerun rule in `docs/internal/durable-gotchas.md` before it counts as red.

## Global constraints

- **No consumer-facing change.** No edit under `src/lib/`, `packages/`, `templates/`, or
  `examples/showcase/src/`. An implementer who finds a task needs one stops and reports it.
- **Every check stays runnable on its own.** A check that stops rebuilding inside the build-once
  runner still builds when a developer runs its npm script alone.
- **Fail closed.** Any path a selection cannot classify runs more, never less: an unmatched path runs
  every static check; a component selection that cannot be computed runs the whole project; a
  classifier failure prints nothing and exits non-zero, so the runner falls back to the plan's gate.
- **New `scripts/` files join `lint` and `check:comments`** (spec, "What the draft branch
  contributes").
- **Comments.** TSDoc in cairn-cms, no em dash in any comment, no plan, pass, or task numbers in a
  shipped comment, no comment claiming what its assertion does not prove.
- **Scratch work** lives under `$HOME/.cache/gate-economy/`, never `/tmp` and never in a repo.
- **No release.** No version bump, tag, or publish in either repo.
- **No edits outside the two worktrees** except the conductor's checkpoint commits of STATUS and
  the friction log on cairn-cms `main`. STATUS lives only on `main` (cairn-pass: "Update
  `docs/STATUS.md` on `main` as part of the merge"); the branch never edits it. The conductor stages
  only its own hunks without `git add -p`, which needs a terminal: `git diff <file>` to a patch,
  trimmed to its hunks, then `git apply --cached`. These commits are never pushed mid-pass, so
  `origin/main` does not move under the close's CI read; owner step 1 pushes them.
- **Commits.** Named paths only, never `git add -A`; imperative mood; the session's attribution
  trailer.
- **The live tools are never edited in place.** No dispatch writes to `~/.local/bin`, `~/.claude`,
  or the `~/.dotfiles` main checkout. Tests exercise the worktree's own copies.

## Interfaces fixed by this plan

These let the two tracks build against each other without waiting.

1. **Run records.** One file, `${CAIRN_GATE_RECORDS_DIR:-$HOME/.local/state/cairn-run-gate}/runs.jsonl`,
   appended under `flock` on `runs.lock` in the same directory, one JSON object per line. A gate
   line carries `kind: "gate"`, `gate`, `tree`, `toplevel`, `branch`, `head`, `lane`, `start`,
   `end` (ISO 8601 UTC), `lockWaitSeconds`, `exit`, and `outcome` (`exit`, `vanished`, or
   `receipt`). A CI wait line carries `kind: "ci"`, `sha`, `pr`, `task` (nullable), `toplevel`,
   `branch`, `start`, `end`, `queueSeconds`, `outcome` (`green`, `red`, `missing`,
   `unavailable`, or `pending`), and `retried` (an array of test names). Task 1 writes and reads
   gate lines; Task 4b writes CI lines; Task 1's summary reads both. The detached run writes the
   `exit` line after its gate command exits and before its status file; the detecting caller writes
   `vanished` and `receipt`. Every record write is best effort: a failure prints one warning and
   never changes the gate's exit, status, or receipt.
2. **The expected-set file.** cairn-cms commits `.github/ci-green.json` naming, by workflow file
   path, the `expected` workflows, the `judgedWhenPresent` workflows, the `neverOnPullRequest`
   workflows, and the `ignorePrefixes` (`tool/`). `ci-green` reads it from the repository at the
   SHA (`git show <sha>:.github/ci-green.json`), so the dotfiles script holds no cairn-cms
   knowledge and the workflow-shape pin lives in cairn-cms's unit suite, which CI runs (owed minor
   m9).
3. **The retry annotation.** Each test job emits one `::notice title=retries::` line listing the
   retried tests by name, `none`, or `unknown (<reason>)` when its report is absent or malformed,
   readable through the check-runs annotations API.
4. **`ci-green`'s command line.** `ci-green <sha> --pr <n> [--wait] [--pushed-at <iso>] [--task
   <id>]`, run from inside a clone of the repository (it uses `git show`, the merge-base, and `gh`'s
   repository inference); exit 0 green, 1 red, 2 missing, 3 unavailable, 75 pending. It reads runs
   from `gh api repos/{owner}/{repo}/actions/runs?head_sha=<sha>`, whose objects carry the workflow
   `path` and `run_attempt` (`gh run list --json` exposes no path).
5. **The classifier's class flag.** `gate-tier.mjs` accepts `--class <passClass>` for each of the six
   `PASS_CLASSES` names. Under `auth-data` it adds the three auth e2e specs (`golden-path`,
   `access-map`, `csrf-origin`); the other five leave the output unchanged. Both runners pass it
   whenever a task has a class (Task 5). A separate mode, `gate-tier.mjs --range <base>..HEAD
   --protected`, prints `ciWait` when any path in the range matches the protected list and prints
   nothing otherwise, exiting 0 in both cases. It reads the list at `<base>` (`git show
   <base>:<table>`), so a range that deletes its own entry still flags; a table absent or unreadable
   at `<base>` prints `ciWait` with the reason on stderr (fail closed). A git failure exits non-zero
   with empty stdout. The default mode's stdout, the gate string, is untouched by this mode, and no
   protected path changes the gate string (Task 3, Task 5).

## Decisions this plan takes

1. **The targeted gate becomes the classifier's default output.** The runners call
   `gate-tier.mjs --range <base>..HEAD [--paint] [--pin]` and take stdout (`pass-execute.js:449`,
   `:823`). For the spec's "this one gate replaces the per-task tier strings" to reach a pass, the
   computed output must be the targeted gate, not a `--related` opt-in. `--pin <tier>` keeps every
   existing tier string (the local fallback F and any plan pin); `--related` retires.
2. **A docs-only diff skips the component leg.** The spec runs the whole component project on an
   empty selection, a guard against `vitest related` passing on nothing for a source change. A diff
   whose every path sits in the docs bucket or on the no-check list has nothing the component
   project can see, so leg 4 is skipped and the classifier's stderr says why. Any other path keeps
   the spec's rule. The node projects (leg 3) still run on a docs-only diff, since unit tests read
   docs.
3. **The e2e leg carries its own port.** The emitted e2e leg sets `E2E_PORT` (default 4392), so a
   computed string no longer needs a pin to carry the export (pass A's amended-gate paragraph).
4. **The expected-set file lives in cairn-cms** (interface 2), resolving owed minor m9: CI never
   has the dotfiles script, so a pin reading `ci-green`'s own export could not run there.
5. **Run records and CI waits share one file and one lock** (interface 1), so the close's clock
   score reads one file.
6. **Task 6 splits by repository.** Task 6a (dotfiles errata 1 to 8 and 13, the `diff-reviewer`
   finding, the pin) runs on the dotfiles track. Task 6b (erratum 9, pass B's plan, and erratum 11,
   ROADMAP) runs on the cairn-cms track. Erratum 10 (`pass-gate-tiers.md`) rides Task 3, which
   changes the table it copies. Erratum 12 (the STATUS resume prompt) rides the close's STATUS
   rewrite, which replaces that prompt anyway.
7. **The S1 boundary and the close read CI, through the worktree `ci-green`.** Geoff settled that
   CI replaces the local full gate at segment boundaries and the close (spec, "Settled
   decisions"); that ruling governs this pass in place of the live pass-core boundary cell, though
   its pass-core text lands only at the dotfiles merge. Tellgrader, which skips itself on CI, runs
   locally at each if a docs-bucket path changed. By the close, Task 4b's `ci-green` is accepted
   and tested, so the close runs the worktree copy by absolute path. On exit 3, F runs. This is
   also `ci-green`'s second live call.
8. **Timed replays run at this branch's head.** Pass A's code is on `main`, so Task 7 computes each
   selection from the historical range (`--range` takes any range) and times that gate string in
   the `gate-economy` worktree. The selection is historical; the run is on current code, the only
   tree where the new legs exist.
9. **The two timed ranges, named before any timing.** The largest `auth-data` engine `src/lib`
   range is pass A's Task 3, `5549fda8..f655f877` (9 `src/lib` files, none under `src/lib/admin`;
   Task 6's range has more lines over 3 files, and the inputs file already timed Task 3's component
   leg). The admin range is pass A's Task 11, `bd614101^..d716ec89` (8 `src/lib` files, 2 under
   `src/lib/admin`, the largest `src/lib` churn in pass A). Neither range touches a protected
   path.
10. **Protected paths wait for the full gate** (conductor's ruling on the plan review, reversing
    the spec fold's row 37 refusal in part; owed spec erratum). A change to the selection
    machinery widens to everything, the convention the draft's trigger list, Vitest's own config
    triggers, and Bazel and TAP's build-config widening already follow. Measured defect: the
    review-practice brief cites an observed instance of Claude Code editing tests to pass (arXiv
    2511.21654), and Anthropic's harness guidance forbids it. Under Geoff's settled "CI replaces the
    local full gate", the full gate is CI green: a task touching a protected path (Gates) runs its
    targeted gate, then waits for CI green on its own commit before the next task, and F runs only
    on `ci-green` exit 3. The classifier emits the requirement: `gate-tier.mjs --protected`
    (interface 5, Task 3) prints `ciWait` for a range touching the protected list, which lives in
    cairn-cms beside the bucket table (Decision 4's principle). The runner's existing gate probe
    runs it on every task, pinned tasks included, and waits when the probe's `ciWait`, the task's
    own `ciWait: true`, or the class's `ciWait` holds (Task 5); the plan flag stays as an override,
    and `diff-reviewer` stays the backstop for a protected-path touch the probe could not see. From
    pass B the runner waits on every flagged task, since a successor's computed gate runs on the
    touched machinery. This pass is hand-dispatched with fixed gate strings, so the conductor
    applies the strict wait only where the next task builds on the change: Task 3 (Gates,
    "Protected paths"). The removed-lines metric stays refused.
11. **The emitted e2e leg keeps the `--grep-invert` variant for `site-visual.spec.ts`.**
    Reachability forces some map entry to select that spec, and its `site home` and `archive page
    2` tests are known local reds (`durable-gotchas.md`). Selecting it appends `--grep-invert "site
    home|archive page 2"`; CI runs them whole. This departs from erratum 11's "mooted except in the
    fallback" (owed spec erratum), and Task 6b writes the variant as live.
12. **The trigger switch is explicit.** The draft enables `COMPONENT_RERUN_TRIGGERS` only when
    `process.argv` holds `related` or `--changed` (`vitest.config.ts:27`). The classifier's
    in-process `createVitest` and the canary inside the unit project have neither, so they select
    37 of 90 files on a trigger path where a `related` argv selects 90 (plan review, mechanics M1
    probe). An environment variable both set, `CAIRN_RELATED_RUN=1`, replaces the argv sniff; the
    emitted component leg carries it, and watch mode stays exempt.

## Rulings for Geoff

None. Both of the spec's rulings are taken (spec, "Rulings for Geoff"). Every decision above is a
method call or the conductor's (Decision 10, the merge order). The two merges are owner steps,
listed under "Running unattended", not forks.

## Running unattended

**The conductor rules alone on:**

- a `diff-reviewer` accept, and one re-dispatch on a `fix`;
- a second `fix` whose findings are all `commentOnly`, `testOnly`, or `coverageOnly`: accept with
  the notes batched to the boundary, or run one more round. On Tasks 2, 3, 4a, and 4b, where the
  tests are the proof a selection fails closed, a `testOnly` second `fix` always runs one more
  round;
- a `retries` notice absent from a test job at the S1 boundary: a Task 4a fix round, run in
  `gate-economy`;
- a `cairn-run-gate` exit 75 (re-issue), and a flake the durable-gotchas rerun rule covers;
- a CI red that `main` also carries (file it, route it to `main`), and one rerun of an
  infrastructure red (a timeout or a failed setup or install step) with `gh run rerun`;
- a pre-flight finding that a line, count, or path moved (amend this plan in the worktree, commit,
  dispatch);
- an implementer's unspecified decision inside the task's constraints (recorded in the Ledger);
- a timed range over 10 minutes at the close after one bucket revisit (recorded, carried to pass
  B; the pass does not block on it);
- a Task 7 selection miss: one re-dispatch of Task 3's chain with the missed row as its finding,
  counted as Task 3's fix round, then the replay reruns;
- the cherry-pick of `075bc174` conflicting: Task 2's implementer resolves it as its first step;
- an out-of-scope finding: verified, then filed to `docs/internal/docs-friction-log.md` at the next
  checkpoint, or dropped with a one-line reason.

**These stop the run** (write STATUS with the resume prompt, then stop):

- a red baseline in Task 0 on either track;
- a behavior defect still standing after its one fix round (after Task 5's Opus re-dispatch, for
  Task 5);
- a third `fix` on any task;
- an `escalate` naming an architectural question the spec did not settle;
- a Task 7 selection miss still standing after the one Task 3 fix round (the pass does not close on
  a miss);
- a CI red outside the inherited set that one fix round does not clear;
- `ci-green` or the S1 probe reporting missing (a conflicted PR): merge `main` in under pass-core's
  rule only if the merge is clean, otherwise stop;
- the 80 percent ceiling (3.2M), after the task in flight;
- the battery stand-down at 11 percent (`~/.claude/docs/unattended-work-guards.md`).

**Owner-gated steps, batched at the end in one message:**

1. The merge of `gate-economy` into cairn-cms `main` (the PR leaves draft once the close is green),
   then a pull into the `main` checkout and a push, which carries the local STATUS and friction-log
   commits.
2. In the same sitting, the merge of the dotfiles `gate-economy` branch into dotfiles `main`, then
   `stow -R bin` so `ci-green` reaches `~/.local/bin`, then `claude-tooling-sync verify`. Order:
   cairn-cms first. Dotfiles first would open a window where the live runner passes `--class` to
   `main`'s `gate-tier.mjs`, whose `parseArgs` silently ignores it (no auth specs, no error), and the
   live rules read a `ci-green.json` `main` lacks. Cairn-cms first is safe: the old runner never
   passes `--class` or `ci`, and the old rules keep the local full gate. No cairn-cms pass session
   starts between the two merges. Pass B waits for both either way.
3. Removal of the three worktrees (`gate-economy`, `gate-economy-ci`, and the dotfiles one) after
   the merges.

The owner message names the rollback lever: a selection that proves wrong in pass B is first met
by a `gateTier: full` pin in the next plan, with no code change; a full rollback reverts the
dotfiles merge, then the cairn-cms merge.

**Guards armed at launch:**

- the `/loop` fallback wake-up, dynamic pacing, with a 1200 to 1800 second tick that checks each
  background chain's agent transcripts for idle or runaway size and reads battery capacity. Before
  relaunching a dead chain from its last verified commit, the tick stops the old agent with
  TaskStop and confirms its transcript has stopped growing (an implementer waiting on a long
  re-issue looks idle), then hands the relaunch the guards doc's keep-or-revert note for any
  uncommitted diff, so one worktree never holds two executors;
- the lid-switch hold, `systemd-inhibit --what=handle-lid-switch --who=gate-economy sleep <seconds>`;
- a check that `systemd-inhibit --list` shows the `claude-awake` lease holder;
- after any harness restart, the full set re-armed.

No `pass-execute` run means no `claude-wf-guard`; the `/loop` tick reads the transcripts in its
place, using the same idle and size thresholds the guards doc gives for the `implementer` tier.

---

### Task 0: Setup and pre-flight (conductor, no gate of its own)

**Outcome:** all three worktrees exist and are sound, both baselines are green, the draft PR is open,
and S1's and S2's claims are checked at HEAD.

1. **No live executor.** `pgrep -af` on the three worktree paths and on `gate-economy` finds nothing
   (never a pattern in the command's own text). No `gate-economy` or `gate-economy-ci` branch or
   worktree exists in either repo. `git status --porcelain` is clean in the cairn-cms `main`
   checkout and in `~/.dotfiles`. The `gate-related` worktree has no live executor (it is a draft input only).
2. **Consultations.** `docs/internal/consultations/` holds no unanswered brief.
3. **cairn-cms worktree.** Create it, `npm ci`, then a from-scratch showcase install (`rm -rf
   examples/showcase/node_modules`, `npm ci --prefix examples/showcase`), and confirm with
   `realpath` that `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` resolve into the worktree. Run
   CI's three preparation steps a fresh worktree lacks: `npm run package`; the `create-cairn-site`
   template bake exactly as `.github/workflows/test.yml` runs it; `npx svelte-kit sync` in
   `examples/showcase`.
4. **Cherry-pick.** `git cherry-pick 075bc174` onto `gate-economy`. If it conflicts, abort and hand
   the cherry-pick to Task 2's implementer as its first step. Push, open the draft PR, and record
   its number. Then create the `gate-economy-ci` worktree off that head and run `npm ci` in it
   (`haiku`, beside step 5).
5. **Dotfiles worktree.** Create it at `~/.cache/worktrees/dotfiles-gate-economy` on branch
   `gate-economy` off dotfiles `main`.
6. **Baselines.** A `haiku` gate agent runs D in the dotfiles worktree, and, in the cairn-cms
   worktree, `cairn-run-gate 'npm run package && npm run test:node-projects'` (this proves the
   worktree setup). Both must print `gate exit: 0`. A red stops the run with one message.
7. **Inherited CI.** Record the CI conclusion of every workflow on `main`'s head (`e8bdb077` or
   later) as the inherited set.
8. **Pre-flight S1 and S2** (one `haiku` agent each, read-only, at each worktree's HEAD), with the
   plan amended and committed in the worktree where a fact moved:
   - S1: the eight files `075bc174` touches; `package.json:85` `check:close`'s `&&` chain and its
     component count (40 at plan time); `check:package` runs `attw --pack .` (`package.json:37`)
     while `prepare` is `npm run package`; `check-audit-pack.mjs:179` packs with `--ignore-scripts`;
     `docs-gate.mjs` builds once and has no `--prebuilt` flag; the six dist-surface checks
     (`surface`, `self-use`, `audit-pack`, `consumers`, `public-skill`, `package`) each start with
     `npm run package`; `lint` and `check:comments` globs (`package.json:79-80`,
     `scripts/checks/check-comments.sh`) exclude `scripts/`; every job in every workflow sets
     `timeout-minutes` except the reusable-workflow calls (`norms` in `e2e.yml` and `publish.yml`,
     where GitHub forbids the key), whose called jobs set it; `src/tests/unit/workflow-yaml.test.ts`
     exists and parses with `yaml`;
     `playwright.config.ts:30` retries 2 on CI only; the component project's retry setting in
     `vitest.config.ts`; the test steps in `test.yml`, `e2e.yml`, and `design.yml` and their
     reporters; the trigger shapes of all ten workflows (five `pull_request` with only
     `paths-ignore: ['tool/**']`, `tool` and `tool-conditions` filtering in, `norms`
     `workflow_call` only, `tsgo` schedule only, `publish` release only; Task 0 found each of these three
     also takes `workflow_dispatch`, which leaves them off `pull_request`); the runner's classifier
     command at `pass-execute.js:449` and `:823`; Vitest 4.1.11's `createVitest` and
     `getRelevantTestSpecifications` at the paths the spec cites; the e2e spec count (43 at plan
     time) and that `golden-path`, `access-map`, and `csrf-origin` exist; the `src/tests/**/_*.ts`
     helper files and which sit outside `src/tests/` and `src/tests/component/`.
   - The miss-rate floor, for Task 7 (a separate `haiku` read, so the row set is not the replay
     author's own count): every non-success run on PR #108 with its SHA, workflow, and failing
     job, and each pass A item under `docs/HISTORY.md`'s "What the gates caught", as one numbered
     list the conductor pastes into Task 7's dispatch and its reviewer's criteria.
   - S2: `cairn-run-gate`'s lock files (`machine.lock`, `machine-light.lock` under
     `$TMPDIR/cairn-gate-<uid>`), its detached run and vanish path, its receipt directory variable,
     and where the reattaching caller learns the exit; `tests/cairn-run-gate.test.sh`'s fixture
     isolation; `PASS_CLASSES` at `pass-execute.js:298` and the pins at
     `pass-execute-runners.test.mjs:206` (runner identity) and `:290` (pass-core's class table); the runner's statement that the workflow runtime has no
     exec access (`pass-execute.js:65`); `gh run rerun` supports `--failed` and `--job`; the
     fixtures the spec names exist on GitHub (SHAs `8483ca5b`, `92325c02`, `3ef9a8d9`, run
     `37893646318`, PR #107's file count over 300).
9. **Guards** armed per "Running unattended"; spend through Task 0 recorded.

**Acceptance:** the Ledger carries items 1 to 9 with evidence, and the plan amendment, if any, is
committed on `gate-economy`.

---

## S1: close and check buckets (cairn-cms)

### Task 2: Land the draft, and `check:close` builds once

**Pass class:** `engine-logic`. **Track:** cairn-cms. **Depends on:** Task 0. **Independent of:**
Tasks 1, 4b, 5. **Spec:** "One build per local gate"; "What the draft branch contributes".

**Files:** `scripts/checks/close-prebuilt.mjs` (becomes the `check:close` runner),
`package.json` (`check:close`, `check:package`, `check:close:prebuilt` removed),
`scripts/checks/docs-gate.mjs`, `scripts/test/component-rerun-triggers.mjs`, `vitest.config.ts`,
`src/tests/unit/close-prebuilt.test.ts`, a new unit test for CI coverage of the close,
`eslint.config.js` and `scripts/checks/check-comments.sh` (the new `scripts/` files join both).
Protected paths: `scripts/test/component-rerun-triggers.mjs`, `scripts/checks/gate-tier.mjs`.

**Outcome:**
- `npm run check:close` is the build-once runner. It holds the component list as an exported array,
  builds `dist` once, runs every component, reports every failure, and prints each check's seconds.
- Inside the runner nothing rebuilds: `check:package` packs with `npm pack --ignore-scripts
  --pack-destination <tmp>` and points `attw` at the tarball; `docs-gate.mjs --prebuilt` skips its
  build. Each check still builds when run alone.
- The runner accepts a check subset (owed minor m6), so Task 3's static leg runs through it.
- The draft's amendments: the helper trigger narrows to `src/tests/_*.ts` and
  `src/tests/component/**/_*.ts`; `close-prebuilt.mjs`'s header no longer claims CI runs it.
- `eslint.config.js` gains one block for the `scripts/` files this pass adds (named, never a
  `scripts/**` glob that would sweep existing files in): the installed jsdoc plugin's
  `flat/recommended-typescript-flavor-error` config plus `house/no-em-dash-in-comments`. The
  TypeScript ruleset the `src/lib` globs use reports 126 findings on the draft's `.mjs` files,
  since they carry JSDoc `{type}` tags, and no block at all lints them with zero rules (plan
  review, mechanics M3). Task 3 adds its own new scripts and Task 4a's two to the same block,
  since Task 4a runs beside this task and leaves these files to it.

**Acceptance:**
- The runner's log from one `check:close` run shows exactly one `svelte-package` invocation. Fails
  today: `check:close` builds 17 times.
- The exported array equals the component list of `main`'s `check:close` chain (quote both
  counts, 40 at plan time; the set difference prints nothing). Fails if a component is dropped.
- A fake failing component leaves the runner non-zero after every other component still runs
  (mutation: force exit 0; quote the red, then revert).
- An em dash seeded in a comment in `scripts/checks/close-prebuilt.mjs` turns `npm run
  check:comments` red (quote the red, then revert). Fails if the new block lints with no rules.
- A unit test asserts every component in the exported array runs on CI: a step in `test.yml` or
  `design.yml`, or a check inside `docs-gate.mjs`. Fails if a component is added to the array and
  to no workflow (a mutation: append a fake component; quote the red, then revert).
- A unit test asserts the subset option runs only the named checks and still builds once, and
  rejects a name not in the array.
- A unit test asserts `check:package`'s standalone script still builds (its script starts with
  `npm run package`) while the runner's invocation does not.
- The narrowed helper trigger: a unit test asserts `src/tests/unit/_some-helper.ts` is not a
  trigger and `src/tests/component/_setup.ts` is. Fails on the draft's `src/tests/**/_*.ts`.
- The quoted per-check seconds from the gate's `check:close` run go in the report (Task 7 and the
  pass-gate-tiers doc use them).

**Gate:** `cairn-run-gate 'npm run package && npm run test:node-projects && npm run test:component
-- --no-file-parallelism && npm run lint && npm run check:close'` (heavy lane). The component
project runs whole because `vitest.config.ts` changes, the named risk the targeted legs miss.
The conductor pushes at the implementer's commit. CI then takes the default rule, green before
N+2 (Gates, "Protected paths"), read by Task 3's strict wait on a head that carries this commit:
CI runs each check as its own step, so the build-once runner is also checked by checks it does not
drive.

### Task 4a: Retry annotations, the timeout test, and the expected-set file

**Pass class:** `engine-logic`. **Track:** cairn-cms, in its own worktree `gate-economy-ci`
(Branch and worktree topology). **Depends on:** Task 0. **Independent of:** Tasks 2 and 3
(disjoint Files; it runs beside Task 2, and Task 3 starts after its commits are cherry-picked onto
`gate-economy`). **Spec:** "CI as the full gate"; Ruling 2.

**Files:** `.github/workflows/test.yml`, `e2e.yml`, `design.yml` (the reporters added to each
test run, and a retries step after each test step); `scripts/ci/vitest-retry-reporter.mjs` (the
custom Vitest reporter below); a new script under `scripts/ci/` that turns a report into the
annotation, and its unit test with recorded reporter fixtures; `.github/ci-green.json` (interface
2); `src/tests/unit/workflow-yaml.test.ts` (the timeout, trigger-shape, and no-weakening
assertions). Not `eslint.config.js`, `package.json`, or `check-comments.sh`: Task 3 joins this
task's two scripts to Task 2's lint block. Protected paths: all of the workflow files and
`ci-green.json`.

**Outcome:**
- Each test run writes a machine-readable report beside its existing console output: today
  `test.yml` runs bare `npm test` with the default reporter and `e2e.yml` passes
  `--reporter=dot,html`, neither of which records a retry.
- **Vitest: a small custom reporter.** Vitest's built-in JSON reporter writes no retry field: its
  per-test object carries `ancestorTitles`, `fullName`, `status`, `title`, `duration`,
  `failureMessages`, `location`, `meta`, and `tags` only
  (`node_modules/vitest/dist/chunks/index.UpGiHP7g.js:3567-3583`, Vitest 4.1.11). The retry
  fields come from the public Reporter API. `scripts/ci/vitest-retry-reporter.mjs` default-exports
  a reporter class whose `onTestCaseResult(testCase)` hook (declared at
  `reporters.d.DtoKVV2s.d.ts:1087`: "Called after the test and its hooks are finished running")
  reads `testCase.diagnostic()`, which returns
  `retryCount: result.retryCount ?? 0` and
  `flaky: !!result.retryCount && result.state === "pass" && result.retryCount > 0`
  (`cli-api.CnMVyzaz.js:11739-11751`), and writes `fullName`, `retryCount`, and `flaky` per test to
  its own JSON file at run end, at a path the step names. Vitest loads a reporter name outside its
  built-in map as a module path and takes its default export (`cli-api.CnMVyzaz.js:11424-11433`,
  `:11445`), so the step passes `--reporter=default --reporter=./scripts/ci/vitest-retry-reporter.mjs`.
  `npm test` chains two Vitest runs and forwards no arguments to either (`package.json:25`; Task 0 pre-flight), so the
  step splits into `npm run test:node-projects -- <reporters>` and `npm run test:component --
  <reporters>` (`scripts/test/contained.mjs:41` forwards its argv), each with its own report path.
- **Playwright:** its JSON reporter's per-result `retry` and test `status: test.outcome()`, which
  reads `flaky` for a test that passed on retry. Task 0 found 1.64.0 installed, which bundles the
  reporter into `playwright/lib/runner/index.js` (`JSONReporter`, `_serializeTestResult` near line
  4366); there is no `lib/reporters/json.js`. Added beside `dot,html`.
- The component project sets `retry: 2` unconditionally (`vitest.config.ts:210`), so a Vitest retry
  can occur locally as well as on CI.
- Each test job (the component and node run in `test.yml`, the Playwright runs in `e2e.yml` and
  `design.yml`) emits one `::notice title=retries::` line listing retried tests, `none`, or
  `unknown (<reason>)`, on success and failure alike, from a step under `if: always()` after its
  test step.
- `.github/ci-green.json` classifies every workflow file, per interface 2.
- The workflow suite fails on any job without `timeout-minutes`, a reusable-workflow call (`uses:`)
  excepted, since GitHub rejects the key there, provided every job in the called workflow sets it.
  It fails on any workflow whose trigger shape leaves its class in `ci-green.json`.
- The test steps' commands change only by an added reporter, plus the split of `npm test` into the
  two scripts it chains; no edit can turn CI green on a red.

**Acceptance:**
- The retry script's unit test: a recorded Playwright report and a recorded Vitest report, each
  with one test that passed on retry, yield that test's name in the notice; a report with no retry
  yields `none`. Both fixtures are recorded from real output, never hand-written: the Vitest one
  from `vitest-retry-reporter.mjs` over a throwaway test that fails its first attempt and passes on
  retry (`retry: 1`), whose report shows `retryCount: 1` and `flaky: true` (quote it). Fails if the
  script reads the wrong field (mutation: read the final status only; quote the red, then revert).
- The two split steps together run exactly the projects `npm test` ran (a `workflow-yaml.test.ts`
  assertion against `package.json`'s `test` chain). Fails if a project drops out.
- An absent, empty, or malformed report yields `retries: unknown (<reason>)`. Fails if absence
  yields `none`.
- `workflow-yaml.test.ts` fails on a job without `timeout-minutes` (mutation: delete one; quote the
  red, then revert), passes on the two `norms` calls, and fails if `norms.yml` drops a job's
  timeout.
- No-weakening pins: no step in `test.yml`, `e2e.yml`, or `design.yml` sets `continue-on-error`; a
  test step whose `run:` holds a `|` sets `shell: bash` (the default `bash -e {0}` has no
  `pipefail`); each retries step runs under `if: always()` after its test step. Mutation: add
  `continue-on-error: true` to the `npm test` step; quote the red, then revert.
- The trigger-shape pin: each `expected` workflow has `pull_request` with exactly `paths-ignore:
  ['tool/**']`; each `judgedWhenPresent` workflow has `pull_request` with a `paths` filter; each
  `neverOnPullRequest` workflow has no `pull_request`; every workflow file appears in exactly one
  list. Fails on a new workflow or a changed trigger (mutation: drop `e2e.yml` from the file; quote
  the red, then revert).
- After the cherry-pick and push, the draft PR's CI run shows the `retries` notice on each test job, read through
  `gh api repos/{owner}/{repo}/check-runs/<id>/annotations`; the conductor's S1 boundary quotes it.

**Gate:** `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit
src/tests/unit/workflow-yaml.test.ts <the retry script test path>'`, run in `gate-economy-ci`.
`lint` and `check:comments` reach this task's scripts only once Task 3 joins them to the lint
block, so Task 3's gate lints them. CI proves the workflow edits on Task 3's head, under the default
rule (Gates, "Protected paths"), since this branch has no PR.

### Task 3: Check buckets, the e2e map, and the trigger canary

**Pass class:** `engine-logic`. **Track:** cairn-cms. **Depends on:** Task 2 (the runner's subset
option and the trigger list), and Task 4a's commits cherry-picked onto `gate-economy` (this task
lints its scripts). **Spec:** "Per-task gate", "Check buckets", "E2e map",
"`auth-data`", "Trigger canary". **Decisions 1, 2, 3, 10, 11, 12; interface 5.**

**Files:** `scripts/checks/gate-tier.mjs` and a committed bucket and e2e-map table beside it (the
implementer picks module or JSON); `src/tests/unit/gate-tier.test.ts`; a trigger canary test in
the node projects; `vitest.config.ts` (Decision 12's switch); `docs/internal/pass-gate-tiers.md`
(erratum 10); Task 2's lint block in `eslint.config.js` (and the `lint` and `check-comments.sh`
paths it added), extended with this task's new scripts and Task 4a's two, named from Task 4a's
report. Protected paths: `gate-tier.mjs` and the table.

**Outcome:** `node scripts/checks/gate-tier.mjs --range <base>..HEAD` prints one targeted gate
whose legs run in the spec's order:
1. `npm run package`, unconditionally.
2. The static checks the diff's buckets select, through the build-once runner's subset. Buckets:
   docs, scripts, showcase, engine (`src/lib/**` and the build inputs), export surface
   (`src/lib/**/index.ts`, `package.json` `exports`, their allowlists). Every other check whose
   script starts with `npm run package` inherits the engine bucket mechanically; the six
   dist-surface checks select on the export-surface bucket only. The docs bucket selects tellgrader
   (local only). An unmatched path not on an explicit no-check list selects every static check;
   the no-check list holds only paths no check or test reads, and a unit test pins its members.
   Dot-path patterns (`.vale/**`, `.vale.ini`, `.tellgrader.json`, `.github/**`) are literal
   prefixes.
3. The full node projects.
4. The component project narrowed to the Node API selection (`createVitest('test', { related,
   project: 'component' })`, then `getRelevantTestSpecifications()`, with `CAIRN_RELATED_RUN=1`
   per Decision 12); the whole project on a trigger, a deleted or renamed path under `src/`, or
   an empty selection; skipped for a docs-only diff (Decision 2).
5. create-cairn-site's suite when its inputs change (`packages/create-cairn-site/**`,
   `examples/showcase/**`, `scripts/build/emit-template*`, root `package.json`).
6. The e2e specs the map selects, at zero retries, with `E2E_PORT` set and F's no-listener guard
   ahead of it (Decision 3): a directory-prefix table, the admin-visual floor for
   `src/lib/admin/**`, and `golden-path`, `access-map`, `csrf-origin` for an unmapped `src/lib/**`
   path. `--class auth-data` adds those three. `--paint yes` adds the admin-visual spec.
   `site-visual.spec.ts` carries Decision 11's `--grep-invert`.

`tool/**` keeps its split to `make -C tool check`. `--pin <tier>` prints every old tier string
unchanged. The table also holds the protected list (Gates, "Protected paths"), and `--protected`
(interface 5) reads it at `<base>` and prints `ciWait` or nothing; it never alters the default
mode's stdout. `pass-gate-tiers.md` describes the targeted gate, the buckets, the map, and the
protected paths, and keeps the pinned tier table.

**Acceptance:**
- Bucket tests: each bucket pattern matches a named real path, the dot-path prefixes included.
  Fails if a dot pattern is written as a `**` glob (it would match nothing).
- An unmatched path (a new root config file) selects every static check. Fails if the default
  falls through to no checks.
- Each dist-surface check is selected by an `src/lib/foo/index.ts` change and not by a
  `src/lib/foo/bar.ts` change.
- Reachability: every `examples/showcase/e2e/*.spec.ts` is reachable from some map entry. Fails on
  a new spec no entry names.
- Delete handling: a range that deletes or renames a file under `src/` runs the whole component
  project. Fails if a deleted path is fed to the selection (it selects nothing).
- Empty selection: `src/lib/cloudflare/turnstile.ts` alone (0 of about 90 component files) runs the
  whole component project; `README.md` alone skips leg 4.
- The e2e defaults, one table-driven case each: `src/lib/cloudflare/turnstile.ts` selects exactly
  the three auth specs (fails on an empty unmapped default); `src/lib/admin/CairnAdminShell.svelte`
  includes the admin-visual spec (fails without the floor); `--paint yes` on `README.md` includes
  it; `examples/showcase/package.json` selects the create-cairn-site leg and `src/lib/foo/bar.ts`
  does not; every emitted e2e leg sets `E2E_PORT` and carries the no-listener guard; a selection
  of `site-visual.spec.ts` carries the `--grep-invert`.
- The no-check list's members are pinned. Fails on an added entry.
- The trigger canary loads the real config with `CAIRN_RELATED_RUN=1` and builds one Vitest
  instance, re-querying it per entry, with one named real path per glob entry; each selects every
  component file (90 of 90 at plan time). Its seconds go in the report. Fails if a trigger is
  unanchored under a dot directory (mutation: drop the absolute-root anchor; the red is quoted
  from the `.claude/worktrees` worktree, since CI's checkout has no dot directory, then revert).
  Fails if the switch is unset (mutation: remove it; the review's probe selected 37 of 90 on an
  admin path).
- Each of the six `PASS_CLASSES` names is accepted, and only `auth-data` changes the output; an
  unknown class exits non-zero with empty stdout.
- `--pin full` output is byte-identical to `main`'s `TIER_GATES.full`.
- `--protected`, three cases over fixture ranges: a range touching a protected path prints exactly
  `ciWait`; a range touching none prints nothing and exits 0; a range that removes a path's entry
  from the protected list and touches that path still prints `ciWait`, because the list is read at
  `<base>`. A fourth: a `<base>` with no table prints `ciWait`. Each fails if the mode reads the list
  at HEAD or prints anything else. The default mode's output for the protected-path range carries
  neither `ciWait` nor F (the first application's removed rule stays removed).
- Task 4a's two scripts lint under the block: an em dash seeded in a comment in
  `scripts/ci/vitest-retry-reporter.mjs` turns `npm run check:comments` red (quote, then revert).
- The classifier's output for this task's own range, quoted, contains leg 1, a static leg naming
  `check:comments`, leg 3, and the whole component project (by empty selection). Evidence only;
  it is not the task's gate.

**Gate:** `cairn-run-gate 'npm run package && npm run test:node-projects && npm run
test:component -- --no-file-parallelism && npm run lint && npm run check:comments && npm run
check'` (heavy lane), fixed so the classifier never sizes the task that builds it; then the
strict protected-path CI wait on the task's commit (Decision 10), the one this pass keeps. Its head
carries Tasks 2 and 4a, so the same read is their default-rule CI. A Task 7-triggered fix round
takes the same gate and wait.

**S1 boundary:** Task 3's gate green on the head; pushed; CI green on the head (the probe, or
`ci-green` if Task 4b is accepted), which is Task 3's own CI wait, the retries notices
quoted; tellgrader if a docs-bucket path changed; STATUS written.

---

## S2: records, `ci-green`, pipelining (dotfiles)

### Task 1: Run records in `cairn-run-gate`

**Pass class:** `engine-logic`. **Track:** dotfiles. **Depends on:** Task 0. **Independent of:**
every cairn-cms task and Task 4b. **Spec:** "Run records". **Interface 1.**

**Files:** `bin/.local/bin/cairn-run-gate`, `tests/cairn-run-gate.test.sh`.

**Outcome:**
- Every run appends one gate line (interface 1). The detached run writes its `exit` line after the
  gate command exits and before it writes the status file, since the caller deletes the run's
  state files once the status appears; an abandoned caller still leaves a record. The line is
  built with `jq -nc` and appended with one `printf` under `flock`. A reattaching caller (exit 75,
  then re-issue) writes no second line.
- The caller that detects a vanished run writes one line with `outcome: "vanished"`; a receipt
  hit writes `outcome: "receipt"`.
- A record write is best effort (interface 1): an unwritable directory, a `jq` absent from the
  detached run's `PATH` (it lives under Homebrew), or a lock timeout prints one warning and
  never changes the exit, the status, or the receipt.
- `lockWaitSeconds` measures the time the run queued on the machine lock.
- A summary mode (`cairn-run-gate --records <toplevel> <branch>`, or a flag name the implementer
  picks and the header documents) sums gate time, lock wait, and CI wait for one toplevel and
  branch, skipping and counting any malformed line. An absent records file prints zero sums and
  exits 0.

**Acceptance (each a case in `tests/cairn-run-gate.test.sh`, records in a fixture directory):**
- A gate re-issued across an exit-75 reattach leaves exactly one line. Fails if the caller writes
  (two lines) or only the caller writes (none when abandoned).
- A vanished run leaves one `vanished` line.
- A second run queued behind a held lock records `lockWaitSeconds` above zero. Fails if wait is
  measured after the lock is taken.
- The summary over a file holding gate lines, CI lines, another branch's lines, and one malformed
  line sums only the matching lines and reports one malformed line.
- With an unwritable records directory, and separately with `jq` off `PATH`, the gate's printed
  exit and its receipt match a run with records on, and one warning appears. Fails if a record
  failure turns the gate red or vanished.
- No case touches `~/.local/state` (the records directory variable points into the fixture root).

**Gate:** D.

### Task 4b: `ci-green`

**Pass class:** `engine-logic`. **Track:** dotfiles. **Depends on:** Task 0; reads interface 2 and
writes interface 1, so it does not wait for Tasks 1 or 4a. **Spec:** "`ci-green`"; owed minors m2,
m3.

**Files:** `bin/.local/bin/ci-green` (a Node ESM program whose decision logic is pure exported
functions; the implementer picks the file split), `tests/ci-green.test.mjs`,
`tests/fixtures/ci-green/` (recorded `gh api` JSON), `scripts/check.sh` (runs the new test).

**Outcome:** `ci-green` reads workflow-run conclusions on the SHA, never raw check runs, and
classifies per the spec: red, expected set, pending, missing, unavailable, green, with exit codes
0, 1, 2, 3, 75. The expected set comes from `.github/ci-green.json` at the SHA and the file list
`git diff --name-only $(git merge-base origin/main <sha>)...<sha>` after a fetch. An infrastructure
red reruns once under `--wait` (`gh run rerun <run> --job <databaseId>` for a cancelled or
timed-out job, `--failed` only on `failure`; "once" means `run_attempt == 1`; the deadline counts
from the rerun's creation). `--wait` blocks up to 540 s and exits 75 while pending. The 5- and
60-minute clocks start from `--pushed-at`, falling back to the SHA's committer date. On red it
prints each failing job, step, and test, the capped `--log-failed` tail, and `main`'s latest
conclusion for that workflow. On green it prints retried tests (from the `retries` annotations),
"retries not reported" for an expected test job with no annotation, and any `run_attempt` above
1. Each wait appends one CI line (interface 1). Zero runs on the SHA is never green, and an absent
or malformed `.github/ci-green.json` at the SHA exits 3 naming the file (Gates, "CI green").

**Acceptance (pure-function tests over recorded JSON):**
- One case each: green (`8483ca5b`); red (`92325c02`); cancelled after a hang (run 37893646318);
  tool workflows absent (`3ef9a8d9`); a file list over 300 files (PR #107); a red in an unexpected
  workflow; a rerun superseding a red; pending; missing with a conflicted PR; unavailable (an API
  failure, and no terminal result at 60 minutes). Each fails if the classifier returns another
  exit code.
- A tool-only file list with zero runs exits 75, and 2 past 5 minutes. Fails if it exits 0.
- An absent `ci-green.json`, and a malformed one, each exit 3. Fails on 0 or 1.
- Retry print: an annotation naming one retried test, one reading `none`, and an expected test job
  with no annotation each print as stated. Fails if the printed list differs.
- An infra red on `run_attempt` 1 plans one rerun; on `run_attempt` 2 it is red.
- A job skipped by its own `if:` inside a successful run is not red.
- A CI line is appended to a fixture records directory with the interface 1 fields.
- One live call against the cairn-cms draft PR's head, run from the cairn-cms `main` checkout
  (fetch and diff only), quoted in the report. If Task 4a has not yet pushed `ci-green.json`, the
  quoted exit 3 naming the file is acceptable evidence.

**Gate:** D.

### Task 5: Pipelining in the sequential runner

**Pass class:** `engine-logic`. **Track:** dotfiles. **Depends on:** Task 4b (the command line and
exit codes). **Upshift candidate** (see Models). **Spec:** "Pipelining in the sequential runner".
**Interface 5.**

**Files:** `claude/.claude/workflows/pass-execute.js`, `claude/.claude/workflows/pass-execute-chains.js`
(the `--class` flag on its classifier command and the shared `PASS_CLASSES` flag only),
`tests/pass-execute-runners.test.mjs`.

**Outcome:**
- `pass-execute` takes `ci: { pr: <n> }`. With it, in sequential mode only, the runner pushes after
  every implementer commit (fix rounds included) through a probe agent, and runs the spec's state
  machine: after N is accepted it dispatches N+1, except under a class whose `ciWait` flag is set
  (`auth-data`), where it first runs `ci-green --wait` on N's SHA through a probe agent that only
  re-issues on 75; before N+2 it runs `ci-green --wait` on N's accepted SHA; on red or missing, N+1
  finishes its chain and the run returns a `ciRed` record (SHA, task, failing workflows and steps,
  the `main` comparison); on unavailable, or any exit outside the five codes, it returns a
  `ciUnavailable` record. Each probe passes `--pushed-at` from the push record and `--task`.
- Without `ci`, and under `parallel: true`, the runner never pushes and never calls `ci-green`.
- `PASS_CLASSES.auth-data` gains `ciWait: true` in both runners, identical text. A task's own
  `ciWait: true` field takes the same wait (Decision 10's protected paths).
- The classifier emits the protected-path wait (Decision 10, interface 5). The existing gate probe
  (`resolveGate`, `pass-execute.js:815`) also runs `node scripts/checks/gate-tier.mjs --range
  <base>..HEAD --protected` and reports a `ciWait` field, on every task, pinned tasks included
  (today a pin skips the probe entirely). When `gate-tier.mjs` is absent the field is false; when it
  exists and the mode exits non-zero, the field is true (fail closed). The probe runs at the head
  being accepted, so a fix round's range is covered. The runner waits when the probe's `ciWait`,
  the task's `ciWait`, or the class's `ciWait` holds. The pinned gate string itself is unchanged.
- Both runners pass `--class <name>` to the classifier when a task has a class.
- The header comment documents `ci`, the state machine, and the records.

**Acceptance (stubbed-agent harness cases):** green dispatches N+2; red halts with the `ciRed`
record after N+1 finishes; missing (exit 2) halts the same way; unavailable halts with the
`ciUnavailable` record; pending (75, then 0)
waits then resolves; an `auth-data` task, and a task with its own `ciWait: true`, each block
N+1's dispatch until green; a task with neither flag whose probe reports `ciWait` blocks N+1 the
same way; a pinned task is still probed for `--protected` and keeps its pinned gate string; a
probe whose `--protected` run exits non-zero counts as `ciWait`; no `ci` argument never
pushes; `parallel: true` never pushes; a fix round's commit is pushed. Each fails if the runner
dispatches or pushes in the wrong state. The existing "PASS_CLASSES is identical across both
runners" check stays green, and the classifier command carries `--class` when a class is set.

**Gate:** D.

**S2 boundary:** D green on the dotfiles head; STATUS written; Task 6a may start.

---

## S3: rules and replay

### Task 6a: The rules, where they execute (dotfiles)

**Pass class:** `engine-logic` (one JS pin and prompt text; the rest is agent-facing docs).
**Track:** dotfiles. **Depends on:** Task 5. **Spec:** "Rules where they execute"; "Owed errata"
items 1 to 8 and 13.

**Files:** `claude/.claude/skills/pass-core/SKILL.md`, `claude/.claude/skills/cairn-pass/SKILL.md`,
`claude/.claude/skills/site-pass/SKILL.md` (read only, unless an edit is forced),
`claude/.claude/docs/pass-gate-economy.md`, `claude/.claude/docs/model-economy.md`,
`claude/.claude/agents/cairn-implementer.md`, `claude/.claude/workflows/pass-execute.js` (the
`diff-reviewer` prompt), `claude/.claude/workflows/pass-execute-chains.js` (header comment),
`tests/pass-execute-runners.test.mjs` (the pin).

**Outcome:** each erratum lands as the spec lists it:
1. `pass-core`, stated conditionally (where the repo skill names a CI-green command, the boundary
   and the close read it; otherwise the local full gate runs): the class table's boundary and
   before-merge cells; the `docs` row's per-task gate (the computed gate, which skips the component
   leg on a docs-only diff, or `--pin docs`); the per-task gate paragraph, with the protected-path
   rule (Decision 10: a task touching the selection machinery runs its targeted gate, then waits
   for CI green on its own commit, flagged by the classifier's `--protected` mode through the
   runner's probe, the plan's `ciWait: true` an override; F only on exit 3); the fix-round reduction text; "CI shadows the pass" (push
   point and pipelining); the boundary receipt skip in Execution discipline; Closing step 2; step 6 (gate
   time and lock wait from run records).
2. `cairn-pass`: Gate notes (the targeted gate; the protected paths; paint's full suite at
   boundaries now CI); Closing step 2 becomes `ci-green` on the close commit, e2e included, with
   the local F fallback; Closing step 6 lists every retried test from `ci-green`'s output and
   counts selection misses (a CI red on a commit whose targeted gate was green), two reopening the
   bucket table; the draft PR mechanics.
3. `site-pass`: confirmed unchanged, recorded in the report.
4. `pass-gate-economy.md`: "Full gate" meaning; one statement of the reduced fix-round rules
   (including `auth-data`'s comment-only reduction); the boundary receipt; rule 2's boundary skip;
   the `check:close` description (builds once); the measured baseline.
5. `model-economy.md` "The pass-end score": gate time and lock wait from run records; CI wait on
   the critical path named separately.
6. `cairn-implementer.md`: the fallback gate, the reduced-gate naming, and one line: write each test
   at the lowest layer that can see the behavior, and extend an existing test before adding a file.
7. The `diff-reviewer` prompt in `pass-execute.js` names a blocking finding: an existing test
   deleted, skipped, `.only`'d, or loosened; a bucket, no-check entry, e2e map entry, trigger,
   protected path, `check:close` component, `ci-green.json` entry, or workflow test step narrowed
   or weakened, that the task's criteria do not name. The same text in the chains runner if it
   renders its own review prompt.
8. `pass-execute-chains.js` header: no per-task pipelining; chains read `ci-green` at boundaries;
   `auth-data` tasks run sequentially.
13. The report records that the global `CLAUDE.md` "Conducting a pass" needs no change.

**Acceptance:**
- The pin test asserts pass-core's class table row for `auth-data` names the CI wait exactly when
  `PASS_CLASSES.auth-data.ciWait` is true. Fails if either side drops it (mutation: delete the flag;
  quote the red, then revert).
- A runner test asserts the review prompt carries the test-weakening finding. Fails without it.
- `grep` post-conditions quoted in the report: no live rule text still says the local full gate
  runs at every boundary unconditionally; "Full gate" has one meaning across the four docs;
  `cairn-pass` names the retried-test listing, the selection-miss count, and the protected paths.
- The diff touches no file outside the Files list.

**Gate:** D.

### Task 7: Replay and acceptance (cairn-cms)

**Pass class:** measurement, no test mandate (it writes one record and no code; a miss routes a fix
through Task 3's chain). **Track:** cairn-cms. **Depends on:** Task 3's CI wait green (the S1
boundary). **Spec:** "Acceptance": timed ranges, miss rate, projection. **Decisions
8, 9.** The two timed ranges and the projection are non-blocking, so they run at the close beside
the reviewers (Close, step 2); this task keeps the blocking parts.

**Files:** `docs/superpowers/research/2026-10-09-gate-economy-replay.md` (new).

**Outcome:** one committed record holding four parts; this task writes parts 1 and 3, and the
close appends parts 2 and 4.
1. **Classifier and selection dry runs** over every pass A task range: the printed gate, the
   buckets, the e2e specs, and the component selection read from the Node API (never from the gate
   string).
2. **Two timed ranges** (Decision 9): pass A Task 3, `5549fda8..f655f877`, and pass A Task 11,
   `bd614101^..d716ec89`. Each gate string computed from the historical range, then run through
   `cairn-run-gate` at the `gate-economy` head (Decision 8), with run time and lock wait recorded
   separately. Run at the close, after the simplifier (Close, step 2).
3. **The miss-rate table.** One row per known pass A red: its source, the last-green..first-red
   range, the failing test or check, and whether the new selection includes it. Sources: the CI runs
   API on PR #108, `docs/HISTORY.md`'s "What the gates caught", and
   `~/.local/state/cairn-gate-archive/2026-10-09-pass-a`. Required rows: S2's `check:self-use`,
   showcase `format:check`, and `check:template` reds. TDD red runs and external reds (govulncheck,
   the hang) listed as excluded with a reason.
4. **The projection,** labeled as a model: pass A's gate counts by kind times the newly measured
   durations, plus a CI wait per `auth-data` task at measured CI wall plus queue, plus pass A's
   unchanged review, fix, and close rows. Written at the close from part 2's durations.

**Acceptance (this task):**
- Every included miss-rate row is selected. The included rows plus the excluded rows, each
  excluded row with its reason, account for every item on Task 0's miss-rate floor list, pasted
  into the dispatch; fails if any item is unaccounted for. On a miss, one Task 3 fix round adds
  the bucket entry or trigger, and the replay reruns; the pass does not close on a standing miss.
- Each row cites its source (a run id, a HISTORY line, or an archive path), so the reviewer can
  check it.

**Acceptance (parts 2 and 4, at the close, non-blocking):**
- Each timed range's gate runs in 10 minutes or less, lock wait excluded. On a miss, the one bucket
  revisit rides the close's fix chain under Task 3's gate, its CI wait taken by step 4's read; if
  still over, record the number for pass B. The pass does not block on this.
- The projection's total is 9 hours or less. On a miss, record it; pass B's scored clock is the real
  measure.

**Gate:** none of its own; its dry runs are its evidence, and its one file is an internal record
no check reads. A Task 3 fix round it triggers takes Task 3's gate.

### Task 6b: Pass B's plan and ROADMAP (cairn-cms)

**Pass class:** `docs`. **Track:** cairn-cms. **Depends on:** Tasks 5, 6a, and 7 (it quotes the
landed rules and Task 7's dry runs and miss-rate table; the timed-range durations land in pass B's
plan at the close, step 3). **Spec:** "Owed errata" items 9 and 11. The
reviewer is `diff-reviewer`, a deliberate departure from the `docs` class's register chain: both
files are internal planning documents, which the register does not govern.

**Files:** `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`, `ROADMAP.md`.

**Outcome:**
- Erratum 9, pass B's plan: the Segments table (boundary proof becomes CI green, local F the
  fallback); Execution mode (`ci: { pr }` and `--class` through the runner); line 115 (`auth-data`
  fix rounds: comment-only reduces; every `auth-data` task waits for CI green); the amended
  paragraph at 117 to 126 (the computed gate carries its own e2e specs and port); the local
  boundary at 128 to 132 (F with `--grep-invert` is now the fallback only); the Gates section;
  Task 0's baseline; each boundary line; the close budget row; every `gateTier: full` pin reviewed
  against the targeted gate, each kept only with a named risk.
- Erratum 11, `ROADMAP.md`: the gate economy entry and the 2026-10-08 follow-ups: run records done;
  the `--grep-invert` variant live in F and in the emitted leg for `site-visual.spec.ts`
  (Decision 11 text, pasted); precondition (a) met by the canary;
  follow-up (b) won't-do while the full node projects run per task; the worktree-setup, light-lane
  OOM, and re-issue items stay filed; chains pipelining and the CI build-once rewire filed; the
  12-hour figure corrected to 17.

**Acceptance:** the reviewer checks each erratum item against the edited text, line by line; every
`gateTier: full` pin in pass B's plan is listed in the report with its keep-or-drop reason; no
pass B task's Outcome or Acceptance changes.

**Gate:** `CAIRN_GATE_LANE=light cairn-run-gate 'git diff --check <base>..HEAD'`, plus any check
the S3 pre-flight finds reads `ROADMAP.md` or `docs/superpowers/plans/`, appended to that string.

**S3 pre-flight** (one `haiku` agent before Task 6a's dispatch): every pass-core, cairn-pass,
pass-gate-economy, model-economy, and cairn-implementer anchor erratum 1 to 6 names, at the
dotfiles head; the `diff-reviewer` prompt's location in each runner; pass B's plan lines 115,
117 to 126, 128 to 132, the Gates section, and every `gateTier: full` pin (`grep`); `ROADMAP.md`'s
gate economy entry (line 311 at plan time) and follow-ups (line 1055); whether any check reads
`ROADMAP.md` or `docs/superpowers/plans/`. (The PR #108 runs and the archive moved to Task 0's
miss-rate floor.)

---

## Close

Run `pass-core`'s ritual with the `cairn-pass` specifics. The order departs from pass-core's
numbering in one way: the ledgers land before the CI read, so one CI read covers the final head
(plan review, mechanics m5). Steps 1 to 6 run unattended; step 7 is the batched owner message.

1. **Simplify, once per branch.** `code-simplifier:code-simplifier` over the cairn-cms branch's
   changed JavaScript and TypeScript (`scripts/**`, `src/tests/unit/**`, `vitest.config.ts`), and
   once over the dotfiles branch's (`ci-green`, both runners, the runner test). Bash
   (`cairn-run-gate`) never takes it. If it changes code: in cairn-cms, the gate the classifier
   prints for the simplifier's range (`gate-tier.mjs --range <pre-simplify>..HEAD`), and a range
   touching a protected path takes step 4's CI read as its CI wait (Decision 10); in dotfiles, D. On a red, revert the simplifier commit and
   re-gate before anything else.
2. **Review fan-out by class, beside the ledgers.** No domain seat applies: no Svelte, Worker,
   auth, or admin markup changed. In their place, one `diff-reviewer` (Opus, `high`) per branch
   over the whole branch diff, focused on fail-open paths: a selection, bucket, map,
   classification, or protected-path rule that can skip a test or read a red as green. Both run
   while step 3 is written. Blocking findings go through one fix chain, which also amends HISTORY.
   Class settle steps: none (no `auth-data`, `paint`, or `tool` task).
   **Task 7's timed ranges run here too** (Q5 cut 3 of the fold verification): after step 1, a
   `haiku` gate agent runs the two timed ranges (Task 7, part 2) through `cairn-run-gate` in the
   `gate-economy` worktree, beside the reviewers; nothing else gates in that worktree meanwhile. An
   over-10-minute range's one bucket revisit joins the fix chain above.
3. **Docs and ledgers,** committed on `gate-economy` in one commit.
   - Docs: no public behavior changes, so no `CHANGELOG.md` entry, no facts bullet, and no
     migration-notes line; `git diff --stat main -- src/lib packages templates
     examples/showcase/src` prints nothing. `docs/internal/pass-gate-tiers.md` landed in Task 3;
     re-read it against any close-time fix. Triage `docs/internal/docs-friction-log.md`
     complete-or-move, and file the pass's cairn friction.
   - `docs/HISTORY.md` takes the pass entry: what landed, what the gates caught, what a later pass
     would be wrong to rediscover (the dot-segment glob trap, the empty-selection rule, the argv
     trigger switch, `attw --pack .` running `prepare`), the rollback lever, and whether any refused
     fold finding turned real.
   - `ROADMAP.md`: the gate economy entry leaves its live tier (Task 6b dispositioned the rest).
   - The replay record takes parts 2 and 4 (the timed ranges and the projection), and pass B's plan
     takes the two durations where Task 6b's edits cite the per-task gate's cost, once step 2's
     timed ranges finish. The close's one `diff-reviewer` read over the ledger commit covers that
     pass B hunk.
   - The post-mortem in this plan, with the pass-end score: tokens against 4.0M from the Ledger's
     running sum; attended time (planning misses, execution sittings); clock against 4.8 h as total,
     gate time, lock wait, CI wait, and rework clock with each red's cause, Task 0 on its own line;
     the selection-miss count (two reopen the bucket table); every retried test from `ci-green`'s
     output. Gate time comes from the `cairn-run-gate` logs and NOTE lines, since run records reach
     the live tool only at the dotfiles merge. Step 4's CI wait goes in the owner message from its
     CI wait record.
4. **Full gate.** cairn-cms: push, then CI green on that final head, read with the dotfiles
   worktree's `ci-green --wait` (Decision 7), whose base is `origin/main`'s current head; if `main`
   moved, merge it in (pass-core's merge rule) and read again. On exit 3, run F locally (fallback,
   the visual-drift rule applies). Plus, locally, tellgrader if any docs-bucket path changed (it
   skips itself on CI). The S3 boundary's CI read yields to this one. Dotfiles: D on the branch
   head (skipped if its receipt matches).
5. **STATUS on `main`.** `docs/STATUS.md` rewritten present tense (60 lines or fewer) as a local
   commit on the `main` checkout, never on the branch (Global constraints): the gate economy pass
   closed, pass B next. Its resume prompt (erratum 12) supersedes the audit scope and names pass
   B's plan, ceiling, and the new gate: "Execute engine pass B
   (`docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`)", launch directory
   `~/Projects/cairn-cms`, `claude --model claude-opus-5-5`, after both merges.
6. **Pre-bake.** Both worktrees clean; pass B's plan carries its updated gate section (Task 6b).
7. **Owner message** (one): the two merges, the push of `main`'s local commits, and the stow step
   under "Running unattended", with the evidence (CI green on the final head, D green, the replay
   record, the score) and the rollback lever.

## Ledger

Times are local (AKDT), 2026-10-10. Commits are cairn-cms unless marked `dotfiles`. Spend is each task's
highest reported subagent total, review reads included where noted.

| Task | Status | Verdict | Commit | Clock |
|---|---|---|---|---|
| 0 | done | n/a | `991d152d` (cherry-pick of the draft's related mode), `148ff15a` (plan amended from the pre-flights); dotfiles `cc118a5` (a stale ratchet entry, red on dotfiles `main`) | about 13 min (07:23 to 07:36); 0.44M of subagent spend (four `haiku` pre-flight and gate reads, two baselines, one run twice) |
| 2 | done | accept, first round | `94c8a4c5` (pushed 08:38) | about 57 min, two heavy gates (the first red on `svelte-check` types); 0.12M |
| 4a | done | fix (an explicit `--reporter` dropped Vitest's `github-actions` reporter), then accept | `gate-economy-ci` `1c37e1ca`, `ebc1e048`; picked onto `gate-economy` as `3de4b17c`, `d2c5164d` after Task 2 | about 7 min plus a 2-min fix; 0.20M plus about 0.07M of reviews. CI went red on `d2c5164d` (see the post-mortem): fixed under Task 3 (`8695229d`) |
| 3 | done | fix (the six dist-surface checks swapped for three, dropping the engine inheritance: a fail-open), then accept | `bd9f79c3`, `8695229d` (the 4a type fix), `b835fe30` | about 31 min with a heavy gate and one exit-75 re-issue; the fix round about 16 min (09:10 to 09:26); strict CI wait about 12 min; 0.27M. S1 closed 09:39 with CI green on `b835fe30` |
| 1 | done | accept, first round | dotfiles `d23f7bd` | about 7 min; 0.10M plus review |
| 4b | done | fix (an empty file list read as green), then accept; reopened once | dotfiles `ea2b5bb`, `8c2c764`; reopen `d10ad29` (short SHA resolved to a full SHA before the `head_sha` query) | about 9 min plus a 2-min fix plus a 2-min reopen; 0.30M |
| 5 | done | fix (no test on the `CI_MAX_WAITS` cap fall-through), then accept | dotfiles `a2755d8`, `35cea09` | about 5.5 min plus a 2-min fix; 0.29M. S2 closed about 08:12 with D exit 0 on `35cea09` |
| 6a | done | accept, then a non-blocking docs round, accept | dotfiles `5a42369`, `eb439c7` | about 4 min plus 2; 0.13M. The dotfiles track was complete here |
| 7 | done | accept, first round | `239a4114` | about 10 min; 0.15M |
| 6b | done | fix (the gate forecasts misstated the classifier, and a ROADMAP item named a defect that does not exist, carried from the brief's copy of Task 7's misattribution), then accept | `4bb7b1cf`, `be9442f2` | about 5 min plus a 6-min fix (09:57 to 10:03); 0.15M. All tasks accepted about 10:25 |
| Close | done | dotfiles review: fix chain accepted (`c42bbcd`); cairn-cms review: fix chain accepted (`4ef0fdbb`) | dotfiles simplifier `e410972`, fix chain `c42bbcd`; cairn-cms simplifier `4a1663f3`, fix `4ef0fdbb`, then this ledger commit | dotfiles simplifier 09:56, dotfiles fix chain 10:17, cairn-cms simplifier 10:17; timed ranges 10:56 to 11:49; fix `4ef0fdbb` at 11:55; this fold after that |

Task 0's evidence (items 1 to 9) and the batched notes per task are in the conductor's running ledger, kept
at `~/.cache/gate-economy/ledger.md` (not committed); its load-bearing contents are carried by this table,
the post-mortem, and `docs/HISTORY.md`.

## Post-mortem (2026-10-10)

Branch `gate-economy` (draft PR #110) and the dotfiles branch `gate-economy`. Geoff authorized the
conductor to perform both merges and the stow once the close is green (about 09:42); they follow this
commit. Closed unreleased: no version bump, no publish, no `CHANGELOG.md` entry, no facts bullet, and `git diff --stat main -- src/lib packages templates
examples/showcase/src` prints nothing.

**What landed.** `cairn-run-gate` writes one run record per run. `check:close` builds the package once.
The gate classifier emits a targeted gate: check buckets, an e2e map, and Vitest's related selection for the
component project (`CAIRN_RELATED_RUN`), failing closed on anything unclassified. CI carries retry
annotations, job timeouts, and the expected-set file; `ci-green` reads it and reruns an infra red once. The
sequential runner pipelines CI behind review with stop-the-line. The rules live in `pass-core`,
`cairn-pass`, the gate economy doc, and the runners, and pass B's plan and the ROADMAP carry the new gate.

### The pass-end score

**Output quality, first.** Every task's acceptance was met. The reviewers earned their clock: five tasks drew
a real fix round (4a, 4b, 5, 3, 6b) and both whole-branch reads returned blocking findings. Five of the
findings were fail-open or silent paths (an empty file list read as green, the dist-surface six dropped from
`auth-data`, a package-prefix guard lost in the simplifier, a dropped `github-actions` reporter, and a runner
template that skipped every CI wait). One
defect class reached CI: the plan-fixed light gate that ran no type check (below).

**Tokens against the 4.0M ceiling.** About 4.1M at the fold's dispatch, plus about 0.2M for this fold's reads
and edits, so about 4.3M, 7 percent over the ceiling (an estimate: the fold's own figure is not reported to
it). Counted per agent as the highest reported total, summed, plus the conductor; `/cost` is a typed command
the conductor cannot run. The 80 percent line (3.2M) was crossed at the Task 6b review (about 3.21M); the
state was written to STATUS and one combined question went to Geoff at about 3.36M, and Geoff chose to finish
the close. The close (about 0.74M from the question to the fold dispatch, which includes Task 6b's fix round and both
whole-branch reads) overran its 0.55M budget line; the
unallocated 0.11M reserve did not cover it.

**Attended time.** Planning misses: 0. Execution sittings: 3 owner pull-ins after approval: the S1 status question (about 09:40), the merge-and-stow authorization (about 09:42, which
let the conductor perform both merges and the stow once the close was green), and the ceiling question at
80 percent, answered "finish the close" (about 10:10). Counted apart, Geoff also asked 2 side questions about
another project (whether it benefits from the same pass, and a brief for it). No fork surfaced that a planning
question would have caught.

**Clock against the 4.8 h estimate.**

| Item | Result |
|---|---|
| Total, first implementer dispatch (07:36) to the fold (12:13) | 4 h 37 min (4.6 h), under 4.8 h; this fold and the final CI read add to it, so about 5 h at merge-ready |
| Task 0 on its own line | about 13 min (07:23 to 07:36), against about 25 min estimated |
| Gate time, sourced | the two timed ranges, 977 s and 1,506 s (41 min); the rest is inside the task clocks (Task 2's two heavy gates, Task 3's one, the dotfiles D gates) and is not summed |
| Lock wait | 662 s behind another project's heavy gate (timed range B); no other wait is in the ledger |
| CI wait | Task 3's strict waits: about 12 min on `b835fe30` (pushed 09:27 local, read green at 09:39), after a first wait on `bd9f79c3` that the fix round superseded. Every other CI read overlapped a review or the next task, so it is not counted as clock |
| Rework, itemized | about 37 min (below) |

Gate time and lock wait are partial because the run records reach the live tool only at the dotfiles
merge, and a gate log's mtime gives an end time, not a run. Pass B reads them from the records.

**Rework clock, each red with its cause:**

| Red | Cause | Class | Clock |
|---|---|---|---|
| Task 2 first heavy gate | `svelte-check` types | defect the gate rightly caught | one extra heavy gate (the plan prices one at about 21 min); inside Task 2's 57 min |
| Task 4a fix round | an explicit `--reporter` dropped the `github-actions` reporter, so retries were invisible | defect the review rightly caught | about 2 min |
| Task 4a CI red on `d2c5164d` | the plan-fixed light gate ran no `npm run check`: four implicit-any errors in `scripts/ci/retries-notice.mjs`, red at 08:41 | process miss (one selection miss) | fixed in `8695229d` at 08:48, about 7 min, carried by Task 3 |
| Task 4b fix round | an empty file list read as green | defect the review rightly caught | about 2 min |
| Task 4b reopen | `ci-green` queried `head_sha` with a short SHA and called five existing runs missing (its first live call) | defect the live call rightly caught | about 2 min |
| Task 5 fix round | no test on the `CI_MAX_WAITS` cap fall-through | defect the review rightly caught | about 2 min |
| Task 3 fix round | the six dist-surface checks swapped for three, dropping their engine inheritance | defect the review rightly caught | about 16 min including the re-gate and push |
| Task 6b fix round | the gate forecasts misstated the classifier; one ROADMAP item named a defect that does not exist | defect the review rightly caught | about 6 min |
| Cairn-cms simplifier gate | `tail` and `grep` cut the `gate exit:` line, so the gate was issued four times and ran fully two or three times | process miss | not itemized; a full run is 16 to 25 min (the timed ranges bound it) |
| Close fix chains | a package-prefix guard lost in the simplifier (`4ef0fdbb`); a `pass-execute` template that omitted `ci` (dotfiles `c42bbcd`) | defects the whole-branch reads rightly caught | not itemized beyond `4ef0fdbb` landing at 11:55 after the timed ranges freed the worktree |

**Selection misses: 1** (a CI red on a commit whose gate was green): `d2c5164d`. Task 4a's plan-fixed light
gate was a fixed string, not the classifier's computed gate, and it ran no type check. It did not reopen the
bucket table, which is for two misses; the cause was a fixed gate, and the classifier's computed gate for a
scripts diff includes `npm run check`.

**Retried tests, every one `ci-green` reported:**

- `b835fe30`, `test` job: `EditorToolbar > Write/Preview tab sizing (design ratchet D3 item 6) > keeps each
  tab its own width across the selected/unselected swap`.
- `b835fe30`, `e2e` job: `edit-save-failure.spec.ts` (two tests: a pending dictionary word commits before the
  save or publish request is sent, and a dictionary commit that never answers holds the save only until its
  deadline), `publish-pending-word.spec.ts` (a publish with a pending dictionary word lands without a
  conflict and commits the word), and `spellcheck.spec.ts` (the worker lints the seeded misspellings, a
  suggestion applies, and an added word clears its underline).
- `b835fe30`, `design` job: none.
- `bd9f79c3`, `test` job: the same `EditorToolbar` test.

The retry notices were present on all three `test` jobs. The conductor ruled `spellcheck.spec.ts` a flake in
the replay (part 3, X14); it also retried on `b835fe30`. The final head's CI read is in the owner message.

**Refused fold findings.** None turned out to be a real defect. The six refused findings (R-m6, P2, P3, P5,
P8, S-F1) and the ten refused mechanisms held: the Task 4a CI red went to the next task (P2's reasoning), no
quarantine list was needed, and the CI build-once rewire is a filed saving, not a defect.

**Not sourced.** Per-run gate times other than the two timed ranges; lock waits other than the 662 s; the
second dotfiles D gate and the fix chains' clock; and the final head's CI read, which belongs to the owner
message. The conductor's ledger note puts the close fix as accepted "about 12:30", later than this fold's
clock; the table uses the commit time, 11:55.
