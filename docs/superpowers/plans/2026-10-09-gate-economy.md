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

**Pass class:** `engine-logic` for every cairn-cms script and test task (Tasks 2, 3, 4a, 7).
Dotfiles tasks declare their own class and gate: Tasks 1, 4b, and 5 are `engine-logic` (bash or
JavaScript behavior, test-first); Task 6a is `engine-logic` for its one runner pin and its prompt
text, with docs items reviewed by the same reviewer; Task 6b is `docs`. No task is `auth-data`:
nothing here touches auth, sessions, D1, signing, or the commit path. The close runs the union,
which adds no class settle step.

**Token ceiling:** 4.0M for the whole pass, both tracks plus the close (settled by Geoff,
2026-10-09). Basis:

| Item | Budget |
| --- | --- |
| Task 0: worktrees, baselines, draft PR, S1 and S2 pre-flights | 0.15M |
| Dotfiles chains: Task 1 (0.25M), Task 4b (0.30M), Task 5 (0.35M), Task 6a (0.30M) | 1.20M |
| cairn-cms chains: Task 2 (0.30M), Task 4a (0.20M), Task 3 (0.40M), Task 7 (0.30M), Task 6b (0.12M) | 1.32M |
| S3 pre-flight | 0.05M |
| One fix round per segment in reserve (three segments) | 0.40M |
| Close: two simplifier runs, two whole-branch `diff-reviewer` reads, the CI wait, one fix chain, ledgers | 0.55M |
| **Total** | **3.67M** |

The remaining 0.33M is unallocated reserve. **At 80 percent (3.2M)** the conductor finishes the
task in flight, writes STATUS, and asks one combined question at the next segment boundary. It
starts no new segment past 3.2M without an answer.

**Clock estimate:** about 4.25 hours from the first implementer dispatch to merge-ready, the
spec's figure. Two tracks run side by side, one executor per worktree; the cairn-cms track sets the
critical path.

| Step | Estimate |
|---|---|
| Task 2: implement, targeted gate plus the build-once close once, review | about 45 min |
| Task 3: implement, the new targeted gate, review | about 55 min |
| Task 4a: retry annotation and the timeout test, plus one CI cycle (663 s job, 1,232 s measured queue) | about 35 min |
| Task 7: classifier and selection dry runs, two timed ranges, record | about 45 min |
| Close: simplifier, reviewers, `ci-green` | about 45 min |
| One fix round, contingency | about 30 min |
| Dotfiles track: 1 (30), 4b (40), 5 (55), 6a (40) | about 2.75 h, under the cairn-cms track |

Two departures from the spec's table, both small: Task 6b (pass B's plan and ROADMAP errata, about
10 min, no npm gate) moves onto the cairn-cms track after Task 7, because those files live in this
repo's worktree; and Task 0 (about 25 min of worktree setup and baselines) precedes the first
dispatch, so it is recorded separately and not counted in total clock, per `model-economy.md`'s
"from the first execution dispatch".

**Checkpoint interval:** every segment boundary (three tasks per segment). The conductor writes
STATUS and a Ledger row set here at the end of Task 0, at each boundary, at any split, before any
question to Geoff, and before any stop.

**Segments** (each ends on a green commit):

| Segment | Track | Tasks | Boundary proof |
|---|---|---|---|
| S0, setup | both | 0 | Ledger entry; both baselines green; draft PR open |
| S1, close and check buckets | cairn-cms | 2, 4a, 3 | Task 3's targeted gate green on the head; pushed; CI green on the head (expected set, below) |
| S2, records, `ci-green`, pipelining | dotfiles | 1, 4b, 5 | `bash scripts/check.sh` green on the dotfiles branch head |
| S3, rules and replay | both | 6a (dotfiles), 7 then 6b (cairn-cms) | dotfiles `check.sh` green; cairn-cms head's CI read yields to the close's (no merge of `main` in between) |

S1 and S2 run at the same time. S3's Task 6a starts when Task 5 is accepted; its Task 7 starts
when S1's boundary is green; Task 6b starts when both Task 7 and Task 6a are accepted.

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
  full text of every Decision it cites; files are its **Files** block. Neither agent reads this plan.
- Every cairn-cms dispatch also asks for cairn friction in one line (pass-core's harvest rule).
- After each accepted cairn-cms task the conductor pushes the branch (CI shadows the pass). This
  pass runs under the pass-core rules live at its start, because Task 5's pipelining and Task 6a's
  rules reach the live tooling only at the dotfiles merge (owner step).

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
- **One executor per worktree.** Each track has one implementer at a time. The conductor dispatches
  both tracks' chains in the background and never runs two chains in one worktree.
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
- **Local full gate (F), fallback only:** the `full` tier as `node -e
  "import('./scripts/checks/gate-tier.mjs').then(m => console.log(m.TIER_GATES.full))"` prints it,
  prefixed `export E2E_PORT=4392 &&`, with its last step replaced by `npm --prefix
  examples/showcase run test:e2e -- --grep-invert "site home|archive page 2"` (the 20 visual tests
  this workstation's Chromium renders off CI's baselines; `durable-gotchas.md`). It runs only
  where `ci-green` (or the S1 probe below) reports unavailable.
- **CI green:** every workflow run on the SHA concluded `success`, and the expected set is present:
  `test`, `e2e`, `design`, `scaffold`, and `create-site` whenever the diff has a path outside
  `tool/**`; `tool` and `tool-conditions` judged only when present. Before Task 4b is accepted, a
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
  the friction log on cairn-cms `main`, staged hunk by hunk per `cairn-pass`.
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
   gate lines; Task 4b writes CI lines; Task 1's summary reads both.
2. **The expected-set file.** cairn-cms commits `.github/ci-green.json` naming, by workflow file
   path, the `expected` workflows, the `judgedWhenPresent` workflows, the `neverOnPullRequest`
   workflows, and the `ignorePrefixes` (`tool/`). `ci-green` reads it from the repository at the
   SHA (`git show <sha>:.github/ci-green.json`), so the dotfiles script holds no cairn-cms
   knowledge and the workflow-shape pin lives in cairn-cms's unit suite, which CI runs (owed minor
   m9).
3. **The retry annotation.** Each test job emits one `::notice title=retries::` line listing the
   retried tests by name, or `none`, readable through the check-runs annotations API.
4. **`ci-green`'s command line.** `ci-green <sha> --pr <n> [--wait] [--pushed-at <iso>] [--task
   <id>]`; exit 0 green, 1 red, 2 missing, 3 unavailable, 75 pending.
5. **The classifier's class flag.** `gate-tier.mjs` accepts `--class <passClass>`. Under
   `auth-data` it adds the three auth e2e specs (`golden-path`, `access-map`, `csrf-origin`). Both
   runners pass it whenever a task has a class (Task 5).

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
7. **The close reads CI, through the worktree `ci-green`.** Geoff settled that CI replaces the
   local full gate at the close (spec, "Settled decisions"); that ruling governs this pass, though
   its pass-core text lands only at the dotfiles merge. By the close, Task 4b's `ci-green` is
   accepted and tested, so the close runs the worktree copy by absolute path. On exit 3 the close
   runs F. This is also `ci-green`'s second live call.
8. **Timed replays run at this branch's head.** Pass A's code is on `main`, so Task 7 computes each
   selection from the historical range (`--range` takes any range) and times that gate string in
   the `gate-economy` worktree. The selection is historical; the run is on current code, the only
   tree where the new legs exist.
9. **The two timed ranges, named before any timing.** The largest `auth-data` engine `src/lib`
   range is pass A's Task 3, `5549fda8..f655f877` (9 `src/lib` files, none under `src/lib/admin`;
   Task 6's range has more lines over 3 files, and the inputs file already timed Task 3's component
   leg). The admin range is pass A's Task 11, `bd614101^..d716ec89` (8 `src/lib` files, 2 under
   `src/lib/admin`, the largest `src/lib` churn in pass A).

## Rulings for Geoff

None. Both of the spec's rulings are taken (spec, "Rulings for Geoff"). Every decision above is a
method call. The two merges are owner steps, listed under "Running unattended", not forks.

## Running unattended

**The conductor rules alone on:**

- a `diff-reviewer` accept, and one re-dispatch on a `fix`;
- a second `fix` whose findings are all `commentOnly`, `testOnly`, or `coverageOnly`: accept with
  the notes batched to the boundary, or run one more round;
- a `cairn-run-gate` exit 75 (re-issue), and a flake the durable-gotchas rerun rule covers;
- a CI red that `main` also carries (file it, route it to `main`), and one rerun of an
  infrastructure red (a timeout or a failed setup or install step) with `gh run rerun`;
- a pre-flight finding that a line, count, or path moved (amend this plan in the worktree, commit,
  dispatch);
- an implementer's unspecified decision inside the task's constraints (recorded in the Ledger);
- a Task 7 timed range over 10 minutes after one bucket revisit (recorded, carried to pass B; the
  pass does not block on it);
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

1. The merge of `gate-economy` into cairn-cms `main` (the PR leaves draft once the close is green).
2. The merge of the dotfiles `gate-economy` branch into dotfiles `main`, then `stow -R bin` so
   `ci-green` reaches `~/.local/bin`, then `claude-tooling-sync verify`. Order: dotfiles first, so
   pass B's session starts with the rules and tools its plan now names.
3. Removal of both worktrees after the merges.

**Guards armed at launch:**

- the `/loop` fallback wake-up, dynamic pacing, with a 1200 to 1800 second tick that checks each
  background chain's agent transcripts for idle or runaway size and relaunches a dead chain from
  its last verified commit;
- the lid-switch hold, `systemd-inhibit --what=handle-lid-switch --who=gate-economy sleep <seconds>`;
- a check that `systemd-inhibit --list` shows the `claude-awake` lease holder;
- after any harness restart, the full set re-armed.

No `pass-execute` run means no `claude-wf-guard`; the `/loop` tick reads the transcripts in its
place, using the same idle and size thresholds the guards doc gives for the `implementer` tier.

---

### Task 0: Setup and pre-flight (conductor, no gate of its own)

**Outcome:** both worktrees exist and are sound, both baselines are green, the draft PR is open,
and S1's and S2's claims are checked at HEAD.

1. **No live executor.** `pgrep -af` on both worktree paths and on `gate-economy` finds nothing
   (never a pattern in the command's own text). No `gate-economy` branch or worktree exists in
   either repo. `git status --porcelain` is clean in the cairn-cms `main` checkout and in
   `~/.dotfiles`. The `gate-related` worktree has no live executor (it is a draft input only).
2. **Consultations.** `docs/internal/consultations/` holds no unanswered brief.
3. **cairn-cms worktree.** Create it, `npm ci`, then a from-scratch showcase install (`rm -rf
   examples/showcase/node_modules`, `npm ci --prefix examples/showcase`), and confirm with
   `realpath` that `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` resolve into the worktree. Run
   CI's three preparation steps a fresh worktree lacks: `npm run package`; the `create-cairn-site`
   template bake exactly as `.github/workflows/test.yml` runs it; `npx svelte-kit sync` in
   `examples/showcase`.
4. **Cherry-pick.** `git cherry-pick 075bc174` onto `gate-economy`. If it conflicts, abort and hand
   the cherry-pick to Task 2's implementer as its first step. Push, open the draft PR, and record
   its number.
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
     `timeout-minutes`; `src/tests/unit/workflow-yaml.test.ts` exists and parses with `yaml`;
     `playwright.config.ts:30` retries 2 on CI only; the component project's retry setting in
     `vitest.config.ts`; the test steps in `test.yml`, `e2e.yml`, and `design.yml` and their
     reporters; the trigger shapes of all ten workflows (five `pull_request` with only
     `paths-ignore: ['tool/**']`, `tool` and `tool-conditions` filtering in, `norms`
     `workflow_call` only, `tsgo` schedule only, `publish` release only); the runner's classifier
     command at `pass-execute.js:449` and `:823`; Vitest 4.1.11's `createVitest` and
     `getRelevantTestSpecifications` at the paths the spec cites; the e2e spec count (43 at plan
     time) and that `golden-path`, `access-map`, and `csrf-origin` exist; the `src/tests/**/_*.ts`
     helper files and which sit outside `src/tests/` and `src/tests/component/`.
   - S2: `cairn-run-gate`'s lock files (`machine.lock`, `machine-light.lock` under
     `$TMPDIR/cairn-gate-<uid>`), its detached run and vanish path, its receipt directory variable,
     and where the reattaching caller learns the exit; `tests/cairn-run-gate.test.sh`'s fixture
     isolation; `PASS_CLASSES` at `pass-execute.js:298` and the pin at
     `pass-execute-runners.test.mjs:290`; the runner's statement that the workflow runtime has no
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

**Outcome:**
- `npm run check:close` is the build-once runner. It holds the component list as an exported array,
  builds `dist` once, runs every component, reports every failure, and prints each check's seconds.
- Inside the runner nothing rebuilds: `check:package` packs with `npm pack --ignore-scripts
  --pack-destination <tmp>` and points `attw` at the tarball; `docs-gate.mjs --prebuilt` skips its
  build. Each check still builds when run alone.
- The runner accepts a check subset (owed minor m6), so Task 3's static leg runs through it.
- The draft's amendments: the helper trigger narrows to `src/tests/_*.ts` and
  `src/tests/component/**/_*.ts`; `close-prebuilt.mjs`'s header no longer claims CI runs it.

**Acceptance:**
- The runner's log from one `check:close` run shows exactly one `svelte-package` invocation. Fails
  today: `check:close` builds 17 times.
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

### Task 4a: Retry annotations, the timeout test, and the expected-set file

**Pass class:** `engine-logic`. **Track:** cairn-cms. **Depends on:** Task 0. **Independent of:**
Tasks 2 and 3 (disjoint Files; runs after Task 2 only to keep one executor in the worktree, and
before Task 3 so its CI cycle overlaps Task 3). **Spec:** "CI as the full gate"; Ruling 2.

**Files:** `.github/workflows/test.yml`, `e2e.yml`, `design.yml` (a retries step after each test
step); a new script under `scripts/ci/` that turns a test reporter's output into the annotation,
and its unit test with recorded reporter fixtures; `.github/ci-green.json` (interface 2);
`src/tests/unit/workflow-yaml.test.ts` (the timeout and trigger-shape assertions).

**Outcome:**
- Each test job (the component and node run in `test.yml`, the Playwright runs in `e2e.yml` and
  `design.yml`) emits one `::notice title=retries::` line listing retried tests, or `none`, on
  success and failure alike. The existing reporters and their outputs stay.
- `.github/ci-green.json` classifies every workflow file, per interface 2.
- The workflow suite fails on any job without `timeout-minutes`, and on any workflow whose trigger
  shape leaves its class in `ci-green.json`.

**Acceptance:**
- The retry script's unit test: a recorded Playwright report and a recorded Vitest report, each
  with one test that passed on retry, yield that test's name in the notice; a report with no retry
  yields `none`. Fails if the script reads the wrong field (mutation: read the final status only;
  quote the red, then revert).
- `workflow-yaml.test.ts` fails on a job without `timeout-minutes` (mutation: delete one; quote the
  red, then revert).
- The trigger-shape pin: each `expected` workflow has `pull_request` with exactly `paths-ignore:
  ['tool/**']`; each `judgedWhenPresent` workflow has `pull_request` with a `paths` filter; each
  `neverOnPullRequest` workflow has no `pull_request`; every workflow file appears in exactly one
  list. Fails on a new workflow or a changed trigger (mutation: drop `e2e.yml` from the file; quote
  the red, then revert).
- After the push, the draft PR's CI run shows the `retries` notice on each test job, read through
  `gh api repos/{owner}/{repo}/check-runs/<id>/annotations`; the conductor's S1 boundary quotes it.

**Gate:** `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit
src/tests/unit/workflow-yaml.test.ts <the retry script test path> && npm run lint && npm run
check:comments'`. The draft PR's CI proves the workflow edits themselves.

### Task 3: Check buckets, the e2e map, and the trigger canary

**Pass class:** `engine-logic`. **Track:** cairn-cms. **Depends on:** Task 2 (the runner's subset
option and the trigger list). **Spec:** "Per-task gate", "Check buckets", "E2e map",
"`auth-data`", "Trigger canary". **Decisions 1, 2, 3; interface 5.**

**Files:** `scripts/checks/gate-tier.mjs` and a committed bucket and e2e-map table beside it (the
implementer picks module or JSON); `src/tests/unit/gate-tier.test.ts`; a trigger canary test in
the node projects; `docs/internal/pass-gate-tiers.md` (erratum 10).

**Outcome:** `node scripts/checks/gate-tier.mjs --range <base>..HEAD` prints one targeted gate
whose legs run in the spec's order:
1. `npm run package`, unconditionally.
2. The static checks the diff's buckets select, through the build-once runner's subset. Buckets:
   docs, scripts, showcase, engine (`src/lib/**` and the build inputs), export surface
   (`src/lib/**/index.ts`, `package.json` `exports`, their allowlists). Every check whose script
   starts with `npm run package` inherits the engine bucket mechanically; the six dist-surface
   checks select on the export-surface bucket only. The docs bucket selects tellgrader (local only).
   An unmatched path not on an explicit no-check list selects every static check. Dot-path patterns
   (`.vale/**`, `.vale.ini`, `.tellgrader.json`, `.github/**`) are literal prefixes.
3. The full node projects.
4. The component project narrowed to the Node API selection (`createVitest('test', { related,
   project: 'component' })`, then `getRelevantTestSpecifications()`); the whole project on a
   trigger, a deleted or renamed path under `src/`, or an empty selection; skipped for a docs-only
   diff (Decision 2).
5. create-cairn-site's suite when its inputs change (`packages/create-cairn-site/**`,
   `examples/showcase/**`, `scripts/build/emit-template*`, root `package.json`).
6. The e2e specs the map selects, at zero retries, with `E2E_PORT` set (Decision 3): a
   directory-prefix table, the admin-visual floor for `src/lib/admin/**`, and `golden-path`,
   `access-map`, `csrf-origin` for an unmapped `src/lib/**` path. `--class auth-data` adds those
   three. `--paint yes` adds the admin-visual spec.

`tool/**` keeps its split to `make -C tool check`. `--pin <tier>` prints every old tier string
unchanged. `pass-gate-tiers.md` describes the targeted gate, the buckets, and the map, and keeps
the pinned tier table.

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
- The trigger canary: for each entry in the trigger list, given as the changed path, the Node API
  selects every component file. Fails if a trigger is unanchored in a worktree under `.claude/`
  (mutation: drop the absolute-root anchor; quote the red, then revert).
- `--class auth-data` adds exactly the three auth specs; an unknown class exits non-zero with empty
  stdout.
- `--pin full` output is byte-identical to `main`'s `TIER_GATES.full`.
- The classifier's own range for this task prints a gate that contains legs 1, 3, and the whole
  component project (the trigger list is a trigger), and that gate is this task's gate.

**Gate:** the string `node scripts/checks/gate-tier.mjs --range <base>..HEAD` prints at the task's
head, run through `cairn-run-gate '<that string>'` on the heavy lane. If the classifier prints
nothing, run `cairn-run-gate 'npm run package && npm run test:node-projects && npm run
test:component -- --no-file-parallelism && npm run lint && npm run check:comments && npm run
check'` and report the classifier failure as blocking.

**S1 boundary:** Task 3's gate green on the head; pushed; CI green on the head (the probe, or
`ci-green` if Task 4b is accepted), the retries notices quoted; STATUS written; S3's Task 7 may
start.

---

## S2: records, `ci-green`, pipelining (dotfiles)

### Task 1: Run records in `cairn-run-gate`

**Pass class:** `engine-logic`. **Track:** dotfiles. **Depends on:** Task 0. **Independent of:**
every cairn-cms task and Task 4b. **Spec:** "Run records". **Interface 1.**

**Files:** `bin/.local/bin/cairn-run-gate`, `tests/cairn-run-gate.test.sh`.

**Outcome:**
- Every run appends one gate line (interface 1) when its status is known, written by the detached
  run itself, so an abandoned caller still leaves a record. The line is built with `jq -nc` and
  appended with one `printf` under `flock`. A reattaching caller (exit 75, then re-issue) writes no
  second line.
- A vanished run writes one line with `outcome: "vanished"`.
- `lockWaitSeconds` measures the time the run queued on the machine lock.
- A summary mode (`cairn-run-gate --records <toplevel> <branch>`, or a flag name the implementer
  picks and the header documents) sums gate time, lock wait, and CI wait for one toplevel and
  branch, skipping and counting any malformed line.

**Acceptance (each a case in `tests/cairn-run-gate.test.sh`, records in a fixture directory):**
- A gate re-issued across an exit-75 reattach leaves exactly one line. Fails if the caller writes
  (two lines) or only the caller writes (none when abandoned).
- A vanished run leaves one `vanished` line.
- A second run queued behind a held lock records `lockWaitSeconds` above zero. Fails if wait is
  measured after the lock is taken.
- The summary over a file holding gate lines, CI lines, another branch's lines, and one malformed
  line sums only the matching lines and reports one malformed line.
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
conclusion for that workflow. On green it prints retried tests (from the `retries` annotations) and
any `run_attempt` above 1. Each wait appends one CI line (interface 1).

**Acceptance (pure-function tests over recorded JSON):**
- One case each: green (`8483ca5b`); red (`92325c02`); cancelled after a hang (run 37893646318);
  tool workflows absent (`3ef9a8d9`); a file list over 300 files (PR #107); a red in an unexpected
  workflow; a rerun superseding a red; pending; missing with a conflicted PR; unavailable (an API
  failure, and no terminal result at 60 minutes). Each fails if the classifier returns another
  exit code.
- An infra red on `run_attempt` 1 plans one rerun; on `run_attempt` 2 it is red.
- A job skipped by its own `if:` inside a successful run is not red.
- A CI line is appended to a fixture records directory with the interface 1 fields.
- One live call against the cairn-cms draft PR's head, run from the cairn-cms `main` checkout
  (fetch and diff only), quoted in the report.

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
  the `main` comparison); on unavailable it returns a `ciUnavailable` record. Each probe passes
  `--pushed-at` from the push record and `--task`.
- Without `ci`, and under `parallel: true`, the runner never pushes and never calls `ci-green`.
- `PASS_CLASSES.auth-data` gains `ciWait: true` in both runners, identical text.
- Both runners pass `--class <name>` to the classifier when a task has a class.
- The header comment documents `ci`, the state machine, and the records.

**Acceptance (stubbed-agent harness cases):** green dispatches N+2; red halts with the `ciRed`
record after N+1 finishes; unavailable halts with the `ciUnavailable` record; pending (75, then 0)
waits then resolves; an `auth-data` task blocks N+1's dispatch until green; no `ci` argument never
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
   before-merge cells; the per-task gate paragraph; the fix-round reduction text; "CI shadows the
   pass" (push point and pipelining); the boundary receipt skip in Execution discipline; Closing
   step 2; step 6 (gate time and lock wait from run records).
2. `cairn-pass`: Gate notes (the targeted gate; paint's full suite at boundaries now CI); Closing
   step 2 becomes `ci-green` on the close commit, e2e included, with the local F fallback; the
   draft PR mechanics.
3. `site-pass`: confirmed unchanged, recorded in the report.
4. `pass-gate-economy.md`: "Full gate" meaning; one statement of the reduced fix-round rules
   (including `auth-data`'s comment-only reduction); the boundary receipt; rule 2's boundary skip;
   the `check:close` description (builds once); the measured baseline.
5. `model-economy.md` "The pass-end score": gate time and lock wait from run records; CI wait on
   the critical path named separately.
6. `cairn-implementer.md`: the fallback gate, the reduced-gate naming, and one line: write each test
   at the lowest layer that can see the behavior, and extend an existing test before adding a file.
7. The `diff-reviewer` prompt in `pass-execute.js` names a blocking finding: an existing test
   deleted, skipped, `.only`'d, or loosened, or a bucket or e2e map entry narrowed, that the task's
   criteria do not name. The same text in the chains runner if it renders its own review prompt.
8. `pass-execute-chains.js` header: no per-task pipelining; chains read `ci-green` at boundaries;
   `auth-data` tasks run sequentially.
13. The report records that the global `CLAUDE.md` "Conducting a pass" needs no change.

**Acceptance:**
- The pin test asserts pass-core's class table row for `auth-data` names the CI wait exactly when
  `PASS_CLASSES.auth-data.ciWait` is true. Fails if either side drops it (mutation: delete the flag;
  quote the red, then revert).
- A runner test asserts the review prompt carries the test-weakening finding. Fails without it.
- `grep` post-conditions quoted in the report: no live rule text still says the local full gate
  runs at every boundary unconditionally; "Full gate" has one meaning across the four docs.
- The diff touches no file outside the Files list.

**Gate:** D.

### Task 7: Replay and acceptance (cairn-cms)

**Pass class:** `engine-logic` (measurement; a miss routes a fix through Task 3's chain). **Track:**
cairn-cms. **Depends on:** Tasks 2 and 3 (S1 boundary green). **Spec:** "Acceptance": timed
ranges, miss rate, projection. **Decisions 8, 9.**

**Files:** `docs/superpowers/research/2026-10-09-gate-economy-replay.md` (new).

**Outcome:** one committed record holding four parts.
1. **Classifier and selection dry runs** over every pass A task range: the printed gate, the
   buckets, the e2e specs, and the component selection read from the Node API (never from the gate
   string).
2. **Two timed ranges** (Decision 9): pass A Task 3, `5549fda8..f655f877`, and pass A Task 11,
   `bd614101^..d716ec89`. Each gate string computed from the historical range, then run through
   `cairn-run-gate` at the `gate-economy` head (Decision 8), with run time and lock wait recorded
   separately.
3. **The miss-rate table.** One row per known pass A red: its source, the last-green..first-red
   range, the failing test or check, and whether the new selection includes it. Sources: the CI runs
   API on PR #108, `docs/HISTORY.md`'s "What the gates caught", and
   `~/.local/state/cairn-gate-archive/2026-10-09-pass-a`. Required rows: S2's `check:self-use`,
   showcase `format:check`, and `check:template` reds. TDD red runs and external reds (govulncheck,
   the hang) listed as excluded with a reason.
4. **The projection,** labeled as a model: pass A's gate counts by kind times the newly measured
   durations, plus a CI wait per `auth-data` task at measured CI wall plus queue, plus pass A's
   unchanged review, fix, and close rows.

**Acceptance:**
- Each timed range's gate runs in 10 minutes or less, lock wait excluded. On a miss, revisit the
  bucket table once; if still over, record the number for pass B. The pass does not block on this.
- Every included miss-rate row is selected. A table with fewer rows than the known events fails.
  On a miss, one Task 3 fix round adds the bucket entry or trigger, and the replay reruns; the pass
  does not close on a standing miss.
- The projection's total is 9 hours or less. On a miss, record it; pass B's scored clock is the real
  measure.
- Each row cites its source (a run id, a HISTORY line, or an archive path), so the reviewer can
  check it.

**Gate:** none of its own; its timed runs are its evidence, and its one file is an internal record
no check reads. A Task 3 fix round it triggers takes Task 3's gate.

### Task 6b: Pass B's plan and ROADMAP (cairn-cms)

**Pass class:** `docs`. **Track:** cairn-cms. **Depends on:** Tasks 5, 6a, and 7 (it quotes the
landed rules and Task 7's measured durations). **Spec:** "Owed errata" items 9 and 11.

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
  the `--grep-invert` variant mooted except in the fallback; precondition (a) met by the canary;
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
gate economy entry (line 311 at plan time) and follow-ups (line 1055); the archive directory's
existence and count; PR #108's run list; whether any check reads `ROADMAP.md` or
`docs/superpowers/plans/`.

---

## Close

Run `pass-core`'s ritual with the `cairn-pass` specifics, in order. Steps 1 to 7 run unattended;
step 8 is the batched owner message.

1. **Simplify, once per branch.** `code-simplifier:code-simplifier` over the cairn-cms branch's
   changed JavaScript and TypeScript (`scripts/**`, `src/tests/unit/**`, `vitest.config.ts`), and
   once over the dotfiles branch's (`ci-green`, both runners, the runner test). Bash
   (`cairn-run-gate`) never takes it. If it changes code: in cairn-cms, the targeted gate for the
   simplifier's range (`gate-tier.mjs --range <pre-simplify>..HEAD`); in dotfiles, D. On a red,
   revert the simplifier commit and re-gate before anything else.
2. **Full gate.** cairn-cms: CI green on the close commit, read with the dotfiles worktree's
   `ci-green --wait` (Decision 7), whose base is `origin/main`'s current head; if `main` moved,
   merge it in (pass-core's merge rule) and read again. On exit 3, run F locally (fallback, the
   visual-drift rule applies). Plus, locally, tellgrader if any docs-bucket path changed (it skips
   itself on CI). The S3 boundary's CI read yields to this one. Dotfiles: D on the branch head
   (skipped if its receipt matches).
3. **Review fan-out by class.** No domain seat applies: no Svelte, Worker, auth, or admin markup
   changed. In their place, one `diff-reviewer` (Opus, `high`) per branch over the whole branch
   diff, focused on fail-open paths: a selection, bucket, map, or classification that can skip a
   test or read a red as green. Blocking findings go through one fix chain.
4. **Class settle steps:** none (no `auth-data`, `paint`, or `tool` task).
5. **Docs.** No public behavior changes, so no `CHANGELOG.md` entry, no facts bullet, and no
   migration-notes line; the step confirms with `git diff --stat main -- src/lib packages
   templates examples/showcase/src` printing nothing. `docs/internal/pass-gate-tiers.md` landed in
   Task 3; re-read it against any close-time fix. Triage `docs/internal/docs-friction-log.md`
   complete-or-move, and file the pass's cairn friction.
6. **Ledgers.**
   - `docs/STATUS.md` rewritten present tense (60 lines or fewer): the gate economy pass closed,
     pass B next. Its resume prompt (erratum 12) supersedes the audit scope and names pass B's plan,
     ceiling, and the new gate.
   - `docs/HISTORY.md` takes the pass entry: what landed, what the gates caught, what a later pass
     would be wrong to rediscover (the dot-segment glob trap, the empty-selection rule, `attw
     --pack .` running `prepare`), and whether any refused fold finding turned real.
   - `ROADMAP.md`: the gate economy entry leaves its live tier (Task 6b dispositioned the rest).
   - The post-mortem in this plan, with the pass-end score: tokens against 4.0M via `/cost`;
     attended time (planning misses, execution sittings); clock against 4.25 h as total, gate time,
     lock wait, CI wait, and rework clock with each red's cause, plus the selection-miss count (two
     reopen the bucket table). Gate time comes from the `cairn-run-gate` logs and NOTE lines, since
     run records reach the live tool only at the dotfiles merge.
7. **Pre-bake and handoff.** Plan, STATUS, HISTORY, and ROADMAP committed on `gate-economy`; both
   trees clean. Pass B's plan carries its updated gate section (Task 6b). The resume prompt: "Execute
   engine pass B (`docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`)", launch directory
   `~/Projects/cairn-cms`, `claude --model claude-opus-5-5`, after both merges.
8. **Owner message** (one): the two merges and the stow step under "Running unattended", with the
   evidence (CI green, D green, the replay record, the score).

## Ledger

| Task | Status | Verdict | Commit | Clock |
|---|---|---|---|---|
| 0 | | | | |
| 2 | | | | |
| 4a | | | | |
| 3 | | | | |
| 1 | | | | |
| 4b | | | | |
| 5 | | | | |
| 6a | | | | |
| 7 | | | | |
| 6b | | | | |
| Close | | | | |

## Post-mortem

(Written at the close.)
