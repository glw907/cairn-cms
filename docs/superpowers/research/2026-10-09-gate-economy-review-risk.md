# Gate economy spec review: failure risk lens

Target: `docs/superpowers/specs/2026-10-09-gate-economy-design.md` at `f2fa2a25`. Lens: assurance loss
and process failure. Settled decisions are not re-argued; findings on them address how they are
specified. Every claim below was checked against the code, the live CI history, or the cited
documentation on 2026-10-09 (UTC 2026-10-10).

Counts: 1 blocker, 8 major, 6 minor, and 2 over-ceremony items (both minor). One OWNER FORK, inside M2.

## Verified sound (no finding)

- Every `check:close` component runs on CI: each is a `test.yml`, `design.yml`, or `docs-gate.mjs`
  step (scripted comparison over `package.json:85`). Moving the close to CI drops no static check.
- CI is the canonical renderer for visual baselines (`docs/internal/durable-gotchas.md:41-49`), and
  CI's fresh `npm ci --prefix examples/showcase` avoids the worktree-e2e gotcha, so CI at the
  boundary is stronger than the local full gate on those two axes.
- `close-prebuilt.mjs` (draft) builds once and no component it runs writes into `dist/`
  (`check-audit-pack.mjs:179` packs with `--ignore-scripts`; the others write only to tmpdirs).
- For `auth-data`, per-commit CI green plus the unchanged settle steps is at least today's assurance
  (boundary-only full gate), subject to M2 and M5.

## Blocker

### B1. `pass-execute-chains` has no PR to push to, so per-task `ci-green` can never pass

- **Location:** spec `:95-98` ("`pass-execute` and `pass-execute-chains` push after each accepted
  task and check `ci-green`"); spec `:88-89` ("The runs come from the pass's draft PR").
- **Defect:** the chains runner runs each chain on its own branch in its own worktree
  (`pass-execute-chains.js:2-3,362,616`). CI fires on `push` only for `main` and `rebuild`
  (`test.yml:4-8` and every sibling), and the pass's one draft PR tracks the pass branch, not the chain
  branches. A chain commit therefore gets no CI run, and `ci-green` reports every expected workflow as
  missing on the first chain task. Read literally, Task 5 halts every chains run. The `mainCheckout`
  chain mode (`pass-execute-chains.js:7,352,361`) has the opposite problem: a push there lands
  unreviewed-by-CI commits on `main` itself, which `cairn-pass` keeps releasable.
- **Evidence:** neither runner pushes today (`grep -n push` finds no push step in either file);
  `pass-core/SKILL.md:137-142` opens one draft PR per pass.
- **Fold:** specify chains behavior explicitly. Recommended: the runner opens one draft PR per chain
  branch at the chain's first push (closed at the chain merge), and `ci-green` takes the PR number.
  A `mainCheckout` chain does not push per task; it reads `ci-green` on its final commit after the
  push the plan already makes. Add one acceptance line: `ci-green` passes on a chain-branch commit.
  Method call; no owner fork, though it adds CI load (see m5).

## Major

### M1. A red the expected set did not predict is ignored, and the expected set is computed on the wrong diff

- **Location:** spec `:86-89`.
- **Defect:** for `pull_request`, GitHub evaluates `paths` and `paths-ignore` against the PR's
  three-dot diff from the merge base, not the pushed commit's diff. Once any commit in the pass touches
  `tool/**`, `tool.yml` (3-OS matrix, `tool.yml:64`) runs on every later push, and once the PR touches
  `src/lib/diagnostics/conditions.ts`, so does `tool-conditions.yml`. If `ci-green` derives the
  expected set from the commit's own diff, it will not expect those runs, and a red in an unexpected
  run passes silently. Three smaller semantics also need pinning: `norms` runs as jobs inside the
  `e2e` run (`e2e.yml:22-23`), never as its own run; the same SHA can carry a `push` run too (after a
  fast-forward to `main`); and the spec says "red" without enumerating conclusions.
- **Evidence:** GitHub workflow syntax, "Git diff comparisons" (three-dot for pull requests);
  `tool.yml:12-44` and `tool-conditions.yml:8-27` use positive path lists, not only `tool/**`, so
  the spec's "`tool.yml` and `tool-conditions.yml` filter in" (`:87-88`) undersells them.
- **Fold:** `ci-green` fails on any non-success run on the SHA for the PR's `pull_request` event,
  expected or not; the expected set (computed from `git diff --name-only $(git merge-base origin/main
  HEAD)...HEAD` against each workflow's filters, read from the YAML, not hard-coded) governs only the
  "missing" verdict. Green means conclusion `success` (a job skipped by its own `if:` is fine);
  `failure`, `cancelled`, `timed_out`, `startup_failure`, `action_required`, `neutral`, and `stale`
  are red. Add the "red in an unexpected workflow" case to the Task 4 acceptance list (`:141-142`).

### M2. CI retries Playwright twice; the local full gate it replaces retries zero times

- **Location:** spec `:17-19` (CI replaces the local full gate), `:84-85` (retry counts made visible).
- **Defect:** `examples/showcase/playwright.config.ts:30` sets `retries: process.env.CI ? 2 : 0`.
  Today's local boundary and close gate runs e2e with no retry, so an intermittent defect a task
  introduces (a race in the sign-in or publish flow) fails it with probability p. On CI it must fail
  three attempts running, roughly p cubed, and passes as "flaky". The spec makes the retry visible but
  names no consequence, so the boundary loses detection power it has today. The component project
  retries twice in both places (`vitest.config.ts:194`), so that half is unchanged.
- **Evidence:** Google's flaky-test guidance treats a retry pass as a signal to track, not a pass to
  forget (testing.googleblog.com, 2016-05, "Flaky Tests at Google and How We Mitigate Them").
- **Fold:** `ci-green` parses the Playwright and Vitest retry results and prints each retried test.
  A retried test in a spec the pass's diff selects (the e2e map), or any retried test on an
  `auth-data` commit, is red. Other retried tests are green and logged to the pass's records for the
  close. **OWNER FORK (risk acceptance):** (a) the above, recommended; (b) any retry anywhere is red,
  which buys the most assurance and will stop the line on the known spellcheck flake
  (`playwright.config.ts:27-29`); (c) visibility only, as the spec now reads, which accepts the loss.

### M3. "CI is down" is undefined, the wait has no mechanism, and a hung run blocks the line for six hours

- **Location:** spec `:18` ("the fallback when CI is down"), `:83`, `:95-99`.
- **Defect:** three gaps compound in an unattended run.
  1. No deadline turns "pending" into "unavailable". Queues are real: the `e2e` run created
     2026-10-09T21:08:23Z started at 21:28:55Z (1,232 s queued), and the glw907 account's other repos
     share the same concurrent-job pool.
  2. A hang is live right now: `design` run 37988147542 on `main` (`32855c12`) has sat in
     `in_progress` since 20:36:49Z, stuck at `npm ci` (not `playwright install`, so the hang class is
     wider than the one the spec names). With no `timeout-minutes` the default is 360 minutes, and
     `ci-green` on that commit would read "pending" for six hours.
  3. The workflow runtime has no exec access (`pass-execute.js:65-66`), so the pending wait runs in a
     probe agent whose shell call caps at ten minutes, and a conductor at a boundary cannot sleep.
     The spec names no wait protocol, so an agent will either poll a log (banned) or end its turn with
     nothing to wake it.
- **Fold:** give `ci-green` a `--wait` mode on the `cairn-run-gate` contract: block up to 540 s, exit
  75 while pending, print a terminal line otherwise, so the existing "re-issue on 75" rule covers the
  runners, and the conductor runs it with `run_in_background` so its exit wakes the session. Set a
  deadline (recommended: 45 minutes after the push for a run still queued, or any job past its
  timeout); at the deadline `ci-green` reports `unavailable`, and the boundary, the close, and an
  `auth-data` task's wait (`:22`, `:97`, which today has no fallback) run the local full gate. Set
  `timeout-minutes` per job at about 2.5x its p95 (test 25, e2e 20, the rest 15) plus a 10-minute
  step timeout on each `npm ci` and `playwright install`, and put the `norms` timeout inside
  `norms.yml`, because a job that calls a reusable workflow cannot take `timeout-minutes` (GitHub,
  "Reusing workflow configurations", supported keywords). A run killed by a timeout in an install
  step is an infrastructure red: rerun it once (M4) before dispatching a fix.

### M4. Stop-the-line recovery is one sentence; attribution, failure delivery, flake rerun, and the loop bound are missing

- **Location:** spec `:20-21`, `:95-97`.
- **Defect:** under depth-one pipelining, a red on task N's commit arrives after task N+1 has
  committed on top of it. The spec does not say: which chain fixes it (task N's record is already
  `accepted`); how the failing output reaches the fix implementer without the conductor reading a log
  (the thin-conductor rule); whether a red is first rerun to rule out an infrastructure or flaky
  failure; how many CI-red fix rounds run before the run stops (pass-core's unattended rule stops on "a
  real defect after its one fix round", `pass-core/SKILL.md:71-75`, but CI reds are not wired into
  it); and how a red on N+1 that N's red masks gets attributed.
- **Evidence:** Fowler, "Continuous Integration" ("Fix Broken Builds Immediately"), and the
  deployment pipeline both assume a red is pinned to a change. Google TAP pins postsubmit reds by
  culprit finding over the batch (Memon et al., "Taming Google-Scale Continuous Testing", 2017). Here
  per-commit CI gives the pin for free, but only if the runner records which commit's run went red
  first.
- **Fold:** specify the recovery as a short state machine in the runner. (1) On red, `ci-green`
  prints each failing job, step, and test name plus the `gh run view --log-failed` tail. (2) If every
  failure is in an install or setup step, or the failing tests pass on one `gh run rerun --failed`,
  record it as a flake and continue. (3) Otherwise dispatch one fix round attributed to task N, with
  the failing output in the prompt and the class's gate, diff-reviewed against N's criteria. Failures
  present at N+1 but not at N are attributed to N+1 and go into the same fix prompt. (4) The fix
  commit's `ci-green` must pass; a second red stops the run and writes STATUS, per the unattended
  rule. Pin that rule in `pass-core` (Task 6).

### M5. CI tests a merge ref whose base moves; a merge conflict silently stops CI

- **Location:** spec `:17-18`, `:88-89`, `:98-99`.
- **Defect:** a `pull_request` run checks out `refs/pull/N/merge`, the head merged into `main` as of
  the push (GitHub, "Events that trigger workflows", `GITHUB_SHA` is the merge commit). Three
  failures follow. First, a red can come from `main`, not the task, and the runner will dispatch a fix
  to the wrong owner. Second, the close's green can be stale: if `main` moves after the last push, the
  tree that actually merges was never tested, and the first test of it is the post-merge `push` run on
  `main`. Third, and likeliest: "Workflows will not run on `pull_request` activity if the pull request
  has a merge conflict" (same page). `cairn-pass` commits friction-log and STATUS checkpoints on
  `main` during a pass (`cairn-pass/SKILL.md:36-43`), so a conflict mid-pass is a normal event; CI
  then produces no runs, `ci-green` reports "missing", and nothing in the spec routes "missing because
  conflicted" to a merge instead of the "CI is down" fallback.
- **Evidence:** `main` is unprotected (`gh api .../branches/main/protection` returns 404), so no
  required-check or up-to-date rule backstops the merge; GitHub's own mitigation is "require branches
  to be up to date before merging" or a merge queue.
- **Fold:** `ci-green` prints the run's base SHA (the workflow run's `pull_requests[].base.sha`) and,
  when the PR's `mergeable` state is `CONFLICTING`, reports `conflict`, not `missing`. On `conflict`
  the runner stops and the conductor merges `main` in under pass-core's merge rule (STATUS takes
  main's, HISTORY keeps both). The close requires `ci-green` on a commit whose run base equals
  `origin/main`'s current head, merging `main` in first when it moved. This is pass-core's existing
  close rule (`SKILL.md:216-219`, "no merge or rebase of the default branch in between") restated for
  CI. On a red, `ci-green` also reports whether `main`'s own latest run of that workflow is red, so a
  base red is not attributed to a task.

### M6. The static-check map fails safe for a missing check entry but not for an unmatched path, and Node globs skip dot paths

- **Location:** spec `:62`, `:71-73`.
- **Defect:** the spec covers one direction: a check with no declaration always runs. The other
  direction is open: a changed path that matches no check's declared globs selects no static check.
  Today's classifier defaults an unrecognized path to `full` (`gate-tier.mjs:20-25,132`); the new map
  must keep an equivalent default. Separately, the draft matches with `node:path` `matchesGlob`
  (draft `gate-tier.mjs:68,327`), and on Node v24.20.0 `**` and `*` never match a dot segment:
  `matchesGlob('.vale/styles/a.yml','**/*.yml')`, `('docs/.vale/a.yml','docs/**')`, and
  `('.github/workflows/test.yml','**')` all return `false` (probed). The prose and Vale checks read
  `.vale/**`, `.vale.ini`, and `.tellgrader.json`, so a glob-written declaration skips them on exactly
  the edit that breaks them. This is the S2 failure class (two static checks the per-task gate
  skipped, about an hour) returning as a stop-the-line one task late.
- **Evidence:** inputs file `:19-21`, `:174`; probe output above.
- **Fold:** (1) a changed path matched by no declaration and not on an explicit "no check reads this"
  list runs every static check; (2) declarations for dot paths use literal prefixes, and a unit test
  asserts each declared glob matches a sample real path; (3) derive "reads `dist`" mechanically: any
  check whose script starts `npm run package &&`, plus `check:docs-gate`, inherits the build-input set
  (`src/lib/**`, `scripts/build/**`, `package.json`, `svelte.config.*`) instead of a hand declaration,
  which is the largest and most error-prone part of the map. Extend the replay (`:139-140`) to static
  checks, not only tests.

### M7. Run records cannot separate two passes, are written by whoever happens to observe, and have no safe append

- **Location:** spec `:54-56`.
- **Defect:** the record carries gate string, tree hash, start, end, lock wait, and exit, but no
  toplevel, working directory, branch, or HEAD. Two passes share the machine and the lock, so the
  close's "sums these directly" mixes their gates. In `cairn-run-gate` a run's result is printed (and
  its state cleared) only when a caller re-attaches (`cairn-run-gate:225-286`); a run whose caller
  died or gave up is never collected, so a record written at that point undercounts exactly the
  abandoned runs that cost clock, and "end" becomes the observation time. Appends from two processes
  need one `write()` per line, and a gate string with quotes needs real JSON escaping, or a partial or
  malformed line breaks the sum. The spec also leaves the file's location open; the existing logs live
  on tmpfs (see M8).
- **Fold:** write the record inside the detached subshell right after the status is known
  (`cairn-run-gate:191`), with `end` from that moment; add `top`, `cwd`, `branch`, `head`, `lane`,
  and `receipt` (true when a receipt stood in); emit the line with `jq -nc` into a variable and append
  it with one `printf` under `flock` on the records file; store it under `~/.local/state/cairn-run-gate/`.
  The close filters by `top`/`branch` and skips (and counts) malformed lines.

### M8. The replay's ground truth sits on tmpfs and keeps only the last run per gate string

- **Location:** spec `:128-134`, `:139-140` ("compare it with the failures pass A's logged full gates
  recorded"; "Pass A's logged gates are not rerun").
- **Defect:** `cairn-run-gate` truncates its log at each new run of a gate string
  (`cairn-run-gate:146`, `: >"$log"`) under `/tmp/cairn-gate-1000/`, and `/tmp` is tmpfs on this
  machine (`findmnt`: `tmpfs`; up since 2026-10-04). A reboot (any Bluefin update) erases every pass A
  log, and earlier runs of the same string are already gone; receipts keep one copy per string and
  prune after 14 days (`:221`). The miss-rate acceptance (`:139-140`) can then pass on missing
  evidence.
- **Fold:** before anything else in the pass, copy `/tmp/cairn-gate-1000/` (336 directories now) and
  the receipts directory to persistent storage. Name the ground-truth set explicitly: those logs, the
  four non-green CI runs on pass A's branch (inputs `:63-65`), and the S2 static-check reds from
  pass A's HISTORY entry. The replay records which failures it could and could not reconstruct.

## Minor

### m1. `auth-data` "never takes a reduced gate" has two readings, and the acceptance projection does not model the `auth-data` CI wait

- **Location:** spec `:22`, `:72-73`, `:143-144`.
- **Defect:** "reduced gate" is the runners' term for a fix-round gate (`pass-execute.js:86-90`),
  which `auth-data` already never takes except for comment-only rounds. The inputs (`:55-57`) meant
  "full node projects, never a narrowed selection." If an implementer reads it as "the full tier," it
  restores the 45-minute local gate. Pass A was 8 of 12 tasks `auth-data` (pass A plan `:28,504,
  656,722,884,939,979,1020,1112`), most with `gateTier: full` pins. Each serializes on CI (about 11
  minutes plus queue), so the half-of-17-hours projection must model that wait and the pins or it
  will overstate the saving.
- **Fold:** define the `auth-data` per-task gate as "the targeted gate with the whole component
  project (no `related` narrowing) and the auth e2e specs, then CI green." State that a plan's
  `gateTier: full` pin is reviewed against the new gate in pass B's plan (Task 6). Have the projection
  count CI wait per `auth-data` task from measured run times plus queue.

### m2. "Push after each accepted task" contradicts "CI overlaps the diff review"

- **Location:** spec `:20-21` versus `:95`.
- **Defect:** if the push waits for acceptance, CI cannot overlap the review it follows.
- **Fold:** push after the implementer's commit (before review); a fix round's commit pushes again.
  `ci-green` is read on the accepted commit.

### m3. The CI-down fallback local full gate inherits the visual-baseline trap without its rule

- **Location:** spec `:18`, `:98-99`.
- **Defect:** a local `CI=1 test:e2e` fails on the files the latest baseline regen rewrote
  (`durable-gotchas.md:43-49`). An unattended fallback either stalls on those or waves through any
  visual red.
- **Fold:** the fallback step quotes the gotcha's rule (green when the only visual failures are
  exactly the latest regen's files) in the runner and pass-core text, not only the gotchas doc.

### m4. The e2e diff-to-spec map has no stated default for an unmapped path

- **Location:** spec `:68-69`.
- **Defect:** silent for a `src/lib` path no map entry names. CI covers it, so this costs clock, not
  assurance, except under the fallback.
- **Fold:** state the default: an unmapped `src/lib/**` path selects the auth and golden-path specs
  (`golden-path.spec.ts`, `access-map.spec.ts`, `csrf-origin.spec.ts`) locally.

### m5. Per-task pushes multiply CI load on a shared concurrency pool

- **Location:** spec `:95-96`.
- **Defect:** each push starts six to eight workflows (three more jobs when `tool.yml` is in), and
  the glw907 account's other site repos share the same pool. Chains (B1) multiply it. The 1,232 s
  queue above happened at today's load. This degrades M3's deadline and the clock projection, not
  assurance.
- **Fold:** measure queue time in the run records (`ci-green` prints created-to-started), feed it to
  the projection, and keep `cancel-in-progress` off for PR runs (cancellation would destroy the
  per-commit attribution M4 depends on).

### m6. The local Vitest component retry hides a pass-on-retry the same way CI's does

- **Location:** spec `:84-85`.
- **Defect:** `retry: 2` is unconditional (`vitest.config.ts:194`), so the local targeted gate also
  passes on retry, invisibly.
- **Fold:** the gate's own output (or the run record) carries the retried test names, under the same
  M2 rule.

## Over-ceremony (ranked by cost)

### O1. The install-caching item is already done for npm and against published advice for browsers (minor)

- **Location:** spec `:90-91`, Task 4.
- **Evidence:** every npm workflow already sets `actions/setup-node` `cache: npm` (grep across
  `.github/workflows/`). Playwright's CI guide says caching browser binaries "is not recommended":
  restore time is comparable to download, and OS dependencies cannot be cached.
- **Fold:** drop the caching bullet; spend the Task 4 effort on step timeouts (M3), which address the
  observed hangs.

### O2. A hand-maintained e2e map buys little where CI runs full e2e on every push (minor, optional)

- **Location:** spec `:68-69`, Task 3.
- **Evidence:** 43 spec files under `examples/showcase/e2e/`, a hand map that rots as specs are added; CI
  runs them all per push with the attribution M4 gives.
- **Fold:** keep the map coarse: a directory-prefix table plus the admin-visual floor and the m4
  default, with a test that every spec file is reachable from some entry. Skip per-file precision.

## Sources

- GitHub, workflow syntax, path filters and "Git diff comparisons":
  https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub, `pull_request` event, merge ref and merge-conflict behavior:
  https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub, keywords allowed on a reusable-workflow caller:
  https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
- Playwright, CI guide, browser caching: https://playwright.dev/docs/ci
- Google Testing Blog, flaky tests:
  https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- Memon et al., "Taming Google-Scale Continuous Testing":
  https://research.google/pubs/taming-google-scale-continuous-testing/
- Fowler, "Continuous Integration": https://martinfowler.com/articles/continuousIntegration.html
- Fowler, "Deployment Pipeline": https://martinfowler.com/bliki/DeploymentPipeline.html
