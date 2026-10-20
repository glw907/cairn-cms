# Engine pass B, lean re-plan

Rollout step 5 of the lean pass cutover: engine pass B before draft docs stage 2b, re-planned as a
lean task list and the first pass scored on the new process. Process: `cairn-pass`, which loads
`pass-core`. Design approved by Geoff on 2026-10-10. Plan review: three lenses and a fold,
`docs/superpowers/research/2026-10-10-engine-pass-b-lean-review-*.md` and
`docs/superpowers/research/2026-10-10-engine-pass-b-lean-fold.md`.

## Sources

- **The task bodies.** `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` (the old plan)
  carries each task's Files, Outcome, and Acceptance, including the test-first lines and mutation
  proofs. Each task below names its old task and lists only the amendments. Where an amendment and
  the old text disagree, the amendment wins. Everything else in that task's Files, Outcome, and
  Acceptance binds as written, read through "Retired phrases" below.
- **Decisions and rulings.** The old plan's "Decisions this plan takes" 1 to 12 and its "Rulings for
  Geoff" (fork 1 and the copy) bind verbatim. Its "Review focus" list is the close review's brief.
- **The record.** The old plan's Ledger is a read-only record: its Task 0 entry (pre-flight at
  `21ec86a9`, with pass A's hand-off list verbatim) binds, and nothing is appended to it. Old Task 11
  reads that list for the `relink.json` re-arm entries.
- **The design.** `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` ("Pass B" and
  each item's section) and its rulings file beside it.
- **The process spec.**
  `/var/home/glw907/.dotfiles/docs/superpowers/specs/2026-10-10-lean-pass-process-design.md`,
  "Rollout" step 5 and "Success test".

## Retired from the old plan

None of these sections bind: Pass class, Token ceiling, Checkpoint interval, Segments, Disjoint
Files seams, Split rule, Execution mode, CI behind the runner, Models, Pre-flight, Gates, Unattended
run, and Post-mortem. The same goes for every per-task Pass class line, Gate line, and "S<n>
boundary" line, and for the old Close except the steps PB-C names. `pass-core` and `cairn-pass`
replace them. The fork 3 token ceiling is gone; the clock stop and the PR score replace it. No
`code-simplifier` pass runs, `docs/HISTORY.md` is frozen and takes no entry, and the plan takes no
post-mortem.

Two old Global constraints change. No one commits STATUS or the friction log on `main` mid-pass;
both change on the pass branch. Friction found mid-task goes to the branch's
`docs/internal/docs-friction-log.md` (by the session only; see Pairs), or to "Found, not done" in the
PR body. The rest of the old "Global constraints" bind, including the scratch root
`$HOME/.cache/engine-pre-2b-b/`. One named exception to the scratch rule: the `create-cairn-site`
suite reads a bake in `packages/create-cairn-site/template/` (gitignored), as CI's `test` job does.

### Retired phrases inside binding blocks

| Old phrase (where) | Lean meaning |
| --- | --- |
| "The computed gate green" (every task) | The fast lane green, plus the task's Extra commands. |
| "The report quotes", "the report" (every task) | The task commit's message body (see "Evidence"). |
| "Stays green as part of F" (T1); "the showcase e2e suite stays green on `'fixtures'`, admin-visual baselines unchanged" (T10) | CI's `e2e` green on the pushed head carrying the task, read by the background watch. No local run. |
| "CI `create-site` on the segment push green" (T2) | CI `create-site` green on PB-T1's pushed head, read by the watch. PB-T3 does not wait for it. |
| "The showcase e2e build resolves `dist/`" (T4) | `npm --prefix examples/showcase run build` after `npm run package`, with `realpath` of both packages quoted. |
| "Confirm on CI at the boundary" (T4) | CI's `e2e` and `scaffold` green on PB-T4's pushed head. |
| Every `/tmp/dev-fold-<x>` in the replayed `e2e.yml` steps (T4, T5): the `rm -rf`, the `--outdir`, and the `grep` | `$HOME/.cache/engine-pre-2b-b/dev-fold-<x>`, for `default` and `flagged`. |
| "The S3 pre-flight names it" (T7 Files) | `src/lib/sveltekit/publish-actions.ts` (`normalizePublishActions`). |
| "Wherever the fixed screen ids live" (T7 Files) | `src/lib/sveltekit/admin-nav.ts` (`ACCESS_FIXED_SCREENS`, `:280`). |
| "The S3 pre-flight names the file" (T8 Files) | `src/lib/delivery/manifest.ts` (`buildSiteManifest`, `:18`). See PB-T8. |
| "F's e2e, or E plus a composition smoke" (T7) | See PB-T7's Acceptance. |
| "`check:close` green" (T11) | CI's `test` job green on PB-T11's pushed head. Locally, only the fast lane. |
| "This plan's Ledger (Task 0)" (T11) | The old plan's Ledger, Task 0 entry, read-only. |
| "Leaves at the close (step 9)" (T11) | PB-C item 6. |
| "The conductor files them ... at the S1 checkpoint" (T2) | PB-T1 files them in the branch's friction log. |
| "`pass-execute` asks for it and returns it in `outOfScope`" (Global constraints, Friction) | Every dispatch reports friction in its final report; the session files it. |
| "The conductor pastes each into its task's `notes`" (Rulings, Copy) | Each task, dispatch, and review prompt that touches the copy quotes the strings verbatim. |
| "The smoke agent" (Decision 11, old Close step 6) | The session runs the smoke itself. |
| "The close's HISTORY entry records the window" (Decision 12) | PB-T1's `CHANGELOG.md` entry and the PR body. |

## Ruled for this pass

- **Merge (Geoff, 2026-10-10: "Design approved, and you can merge.").** The session merges its own
  PR, only through PB-C item 7's merge sequence. An open stop blocks the merge.
- **Risk class: `auth-data`.** The pass takes its highest task's class. PB-T1, PB-T5, and PB-T8 are
  `auth-data` by their old classes, and PB-T10 is `auth-data` by `cairn-pass`'s path map
  (`src/lib/github/**` and `**/hooks.server.ts`). PB-T4 is `runner`, and the rest are `ordinary`. No
  `live-account` flag: no task provisions a real Cloudflare, GitHub, or npm resource, and the smoke
  runs under local `wrangler dev`.
- **A moved `main` at the close (Geoff, 2026-10-10: "Yes, CI green is enough").** A clean merge-in
  that touches `auth-data` paths needs only CI green on the merged head; a conflicting one stops.
- **Stop notifications (Geoff, 2026-10-10: "Normal urgency").** Every stop uses `notify-send -u
  normal`. Planner's ruling beside it: a stop's wait for Geoff is excluded from the success-test
  clock, as a pause under ruling 13 and the spec's "pauses he orders", and the score reports it.
- **Decision 12's resume window** goes into PB-T1's `CHANGELOG.md` entry and the PR body, since
  HISTORY is frozen.

## Conventions every task follows

- **Task fields.** Each task gives its outcome, files, risk class, acceptance check, test, and clock
  estimate in minutes. A task is done only when its acceptance passes.
- **Commits.** One commit per task, its subject starting with the task id (`PB-T3: Add the admin
  error page and three scaffold fixes`). Use imperative mood, commit specific files only, and never
  `git add -A`. The body ends with the trailer `Pass-Clock: task=<id> start=<epoch> end=<epoch>
  estimate=<min> fixes=<n>`, read from the clock file before the file is removed.
- **Evidence.** Each quoted proof an old Acceptance asks for (a red run, a mutation and its revert,
  an exit line, a bake or build result) goes in the task commit's message body, trimmed to the lines
  that show the result. A capture is a file under `$HOME/.cache/engine-pre-2b-b/captures/`, named in
  the body. `diff-reviewer` reads the body with the diff, and the PR body links each commit.
- **Proofs on a clean tree.** A revert-based fail-proof or a mutation proof runs only after the
  task's commit, on a clean tree: mutate, or revert a source change with `git checkout <rev> --
  <file>`; quote the red; `git checkout HEAD -- <file>`; confirm `git diff --quiet`; then `git commit
  --amend` the message to add the evidence, before the push. Reason: restoring a file with `git
  checkout` overwrites any uncommitted edit in it. A red-first test on an `auth-data` task quotes the
  red run it got before the code existed.
- **"Fails today" on an `ordinary` task** names why the test is not vacuous; showing the red run is
  optional. The test must still fail with the change reverted, and the close review checks that.
- **Base.** `<base>` is `HEAD` at the task's start, written as a fourth line `base=<sha>` in the clock
  file (the clock hook reads only `task=`, `start=`, and `estimate=`). Two exceptions: PB-T1's base is
  PB-T0's first parent (`git rev-parse <PB-T0 sha>^1`), so the range carries the WIP; a pair merge's
  base is the commit the pair was dispatched from.
- **Gates.** Each task runs the fast lane: `node scripts/checks/gate-tier.mjs --fast --range
  <base>..HEAD` prints the legs, and each leg runs through `cairn-run-gate` per `cairn-pass`. The
  fast lane runs no `create-cairn-site` suite, no `integration` project, no `packages/cairn-cms-dev`
  test, and no e2e (`docs/internal/pass-gate-tiers.md`, "The fast lane"), so a task whose tests live
  there names them under Extra commands, run beside the lane. Every task whose range touches
  `packages/create-cairn-site/**`, `examples/showcase/**`, `templates/waymark/**`, or
  `scripts/build/emit-template.mjs` also runs the `create-cairn-site` suite, since two of its tests
  read the bake, which emits from the showcase. A task acceptance that quotes its own
  command (a fresh bake, a `wrangler deploy --dry-run` replay, a `node -e` one-liner) also runs beside
  the lane. No task waits for CI before the next. A red stops the line, and the fix goes forward or
  the commit reverts. Scratch work runs in a subshell or with `-C` or `--prefix`; the session's cwd
  stays at its worktree root, so the clock hook keeps reading the pass worktree's git dir.
- **The extra commands**, quoted from the `package.json` scripts and CI's `test.yml`:
  - The `create-cairn-site` suite, light per `cairn-pass`, with CI's bake step first:
    `CAIRN_GATE_LANE=light cairn-run-gate 'V=$(node -p "require(\"./package.json\").version") && (cd packages/create-cairn-site && node scripts/bake-template.mjs --to template --engine-spec "^$V" --dev-spec "^$V") && npm --prefix packages/create-cairn-site test'`
  - The dev package tests, heavy (the default lane): `cairn-run-gate 'npx vitest run --project unit packages/cairn-cms-dev/src'`
  - The integration project, heavy: `cairn-run-gate 'npm run test:integration'`
  - One e2e spec, heavy (its `pretest:e2e` builds the package; `E2E_PORT` keeps it off 4173). The
    port guard comes first because `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`,
    so a leftover server on 4392 would be reused and a stale build tested:
    `cairn-run-gate '! ss -Htln "sport = :4392" | grep -q . && export E2E_PORT=4392 && npm --prefix examples/showcase run test:e2e -- e2e/<spec>.spec.ts --retries=0'`
- **CI reads.** `ci-green` exit 1 is a red. Exit 2 is a red unless one re-push clears it. Exit 3 is
  re-read at the next push and does not stop a task; inside PB-C's fix chain it means the local full
  gate per `cairn-pass`. At the merge sequence, exit 3 is a stop: the session never merges without
  CI green on the head. PB-T0's run is informational, since it carries the ungated WIP; PB-T1's push is the
  first binding read. A red that PB-T0's baseline already shows on `main` does not stop the line, and
  the PR body lists it.
- **`auth-data` tasks.** The test-first lines bind. `diff-reviewer` (Agent tool, `subagent_type:
  "diff-reviewer"`, `model: "opus"`, effort `medium` per `pass-core`, task scope) reads the commit
  while CI runs. Its prompt quotes verbatim the task's old Outcome and Acceptance, this plan's
  amendments, the full text of each Decision and ruling the old task cites, and the commit body's
  evidence. A `fix` or `escalate` stops the line like a red. `RUN_GATE_IF_BUSY=defer` is never set on
  these tasks.
- **Pairs.** A pair is two Agent-tool subagents, `subagent_type: "cairn-implementer"` (Sonnet at
  `medium`, from its frontmatter), with `isolation: "worktree"`, dispatched after the session
  commits. Each prompt quotes verbatim its task's Files, Outcome, and Acceptance from the old plan,
  this plan's amendments, the Decisions and copy the task cites, and the old Global constraints, plus
  these overrides of the agent definition:
  - "Write no `docs/internal/facts/**` bullet, no `docs/internal/docs-friction-log.md` entry, no
    `CHANGELOG.md` or `docs/extend/migration-notes.md` line, and do not run `npm run check:surface --
    --update`. Put each facts bullet, changelog line, and friction item in your final report."
  - "Do not run the fast lane. Run your task's Test and Extra commands through `cairn-run-gate`; the
    session runs the fast lane once on the merge."
  - "Put your evidence in your commit body, per the plan's Evidence rule. Edit only your Files."

  At dispatch the session records `date +%s` and starts a background Bash `sleep` of twice the pair
  estimate, in seconds. If the sleep exits before both agents return, that is the pair's clock stop
  (pair worktrees hold no clock file, so this sleep stands in for the hook). When both return, the
  session:
  1. Merges each branch: `git merge --no-ff -m "<task>: Merge the pair branch" <branch>`.
  2. Files both reports' records, and runs `npm run check:surface -- --update` and `npm run
     check:facts` if a record or typed export moved.
  3. Runs the fast lane with `<base>` the dispatch commit, and commits the records as `<task>,
     <task>: File the pair's records`, with the pair's `Pass-Clock:` trailer. If no record moved, the
     commit is `--allow-empty`, with the same subject and trailer.
  4. Reads `cairn-run-gate --records <pair worktree> <pair branch>` for each pair worktree into the
     score notes, then `git worktree remove` both and `git branch -d` their branches.
  5. Pushes.

  A merge conflict stops the line.
- **Clock.** At each task start the session writes `pass-task-clock` in `git rev-parse
  --absolute-git-dir` (`task=`, `start=`, `estimate=`, `base=`) and removes it at the task's end, per
  `pass-core`. A pair gets one file when it returns: `start=` the recorded dispatch epoch and
  `estimate=` the pair estimate.
- **Stops.** A stop does these, in order: it writes `$(git rev-parse --absolute-git-dir)/pass-stop`
  (the task, what failed, the one question); rewrites pass B's lines in the branch's
  `docs/STATUS.md` with the same three facts; commits that as `Record a stop in STATUS (<task>)` and
  pushes; runs `notify-send -u normal "engine pass B stopped at <task>: PR #<n>, <worktree path>;
  resume: claude attach engine-pass-b"` (Geoff, 2026-10-10: "Normal urgency"); and ends its turn.
  Every wake-up tick first runs `test -e "$(git rev-parse --absolute-git-dir)/pass-stop"`, and a
  relaunch runs Resume step 2. While the file exists, the turn ends with no other act. The session
  removes the file only in a turn that answers a message from Geoff saying to go on, and that turn's
  first tool call is one Bash call that removes the file and rewrites the clock: `g=$(git rev-parse
  --absolute-git-dir) && rm "$g/pass-stop" && { test ! -f "$g/pass-task-clock" || sed -i
  "s/^start=.*/start=$(date +%s)/" "$g/pass-task-clock"; }` (or `estimate=` to Geoff's figure). A
  clock-stop line that arrives before that call, or in the same turn as it, is stale and is not a
  stop: the hook fires after every tool call and reads the old `start=`. The wait between a stop's
  notification and Geoff's reply is excluded from the success-test clock (planner's ruling: a pause
  under ruling 13 and the spec's exclusion of "pauses he orders"), and the score reports it as its own
  line. A resumed
  `auth-data` task never re-dispatches `diff-reviewer` on an unchanged commit to overturn a standing
  verdict. These stop the line:
  - A fired clock stop.
  - A red the session cannot fix in two attempts, a `ci-green` exit 2 that a re-push does not clear,
    or a red local full gate on a PB-C exit 3.
  - An `auth-data` `fix` that still stands after one fix round, or an `escalate`.
  - A task needing public surface the old plan does not name (old Global constraints, "No new public
    surface"), or a finding that would change the approved design.
  - A pair's sleep exiting before both agents return (above), or a merge conflict, except a STATUS
    conflict under "Merging `main`".
  - At PB-C, a blocking finding the session would overrule (item 3), or a third merge-in of `main`.
  - On battery with no mains supply online, at 11 percent: commit the work in progress, then stop
    (`unattended-work-guards.md`, "Battery floor").
- **Merging `main`.** A merge of `origin/main` into the pass branch resolves a `docs/STATUS.md`
  conflict by hand, keeping both sides' lines. Any other conflict is a stop.
- **Pushes.** Push the session's own branch to `glw907/cairn-cms` after every task, then start
  `ci-green <sha> --pr <n> --wait` as a background Bash task, re-issued on 75. Never push `main`. The
  only merge into `main` is PB-C's.
- **Resume.** A relaunch runs the launch prompt again, which does these in order:
  1. If `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/engine-pass-b` appears in `git worktree
     list`, call EnterWorktree with that `path`. Otherwise call it with `name: engine-pass-b`, which
     creates the worktree on branch `worktree-engine-pass-b`.
  2. One Bash call, the first after EnterWorktree, checks the stop and resets the clock: `g=$(git
     rev-parse --absolute-git-dir); if test -e "$g/pass-stop"; then cat "$g/pass-stop"; elif test
     -f "$g/pass-task-clock"; then sed -i "s/^start=.*/start=$(date +%s)/" "$g/pass-task-clock"; fi`.
     If it prints the stop, end the turn. A clock-stop line that arrives before this call, or in the
     same turn as it, is stale and is not a stop.
  3. `gh pr list --head worktree-engine-pass-b --state all` finds the PR; never open a second one. If
     it shows `MERGED`, run only PB-C item 8.
  4. If `git status --porcelain` prints anything, run `git stash push -u -m resume-<task>`, never a
     discard, then judge the stash against the in-flight task's acceptance: re-apply it, or leave it
     stashed and name it in the PR body.
  5. `git branch --list 'worktree-agent-*'`: merge any branch whose commits carry a pair task id
     before re-dispatching that task.
  6. Find the done tasks with `git log --oneline` (task ids in subjects; skip subjects that start
     with `Record a stop`), and start at the first task whose acceptance fails. If its clock file was
     not reset in step 2, write it fresh. Inside PB-C, start at the first item whose PR body section
     is missing.

  A live session that is waiting resumes with `claude attach engine-pass-b`. A dead one is relaunched
  with the Launch block, which runs its checks again.
- **PR body.** Fixed `##` sections, in this order: `What landed` (task id, commit), `auth-data
  verdicts`, `Consumer proof`, `Review`, `Visual`, `Smoke`, `Retried tests` (every one from
  `ci-green`'s output), `Found, not done`, `Decision 12`, and `Score`. The session keeps the draft at
  `$HOME/.cache/engine-pre-2b-b/pr-body.md` and publishes it with `gh pr edit <n> --body-file` after
  each PB-C item.

## Order

PB-T0, then PB-T1, then PB-T3. PB-T4 and PB-T6 run as a pair, followed by PB-T5. PB-T7 and PB-T8 run
as a pair, followed by PB-T9, PB-T10, PB-T11, and PB-C.

The pair seams were probed at `origin/main` `dea73f7d` and at step 2's branch. PB-T4 writes
`packages/cairn-cms-dev`, the root `package.json`, `publish.yml`, and the dev-package check. PB-T6
writes `src/lib/guidance/**` and `docs/reference/guidance.md`, so the two share no path. PB-T7 writes
`publish-actions.ts` (`normalizePublishActions`, `:38`), `concepts.ts` (`normalizeConcepts`,
`:135`), `admin-dispatch.ts` (`RESERVED_SEGMENTS`, `:33`), `admin-nav.ts` (`ACCESS_FIXED_SCREENS`,
`:280`), `fieldset.ts` (`itemLabel`, `:21`, `:28`), and `docs/reference/core.md`. PB-T8 writes
`sanitize-schema.ts`, `src/lib/vite/internal.ts` (`checkSiteFacts`, `:577`),
`src/lib/delivery/manifest.ts` (`buildSiteManifest`, `:18`), and `docs/reference/render.md`. The
shared records (facts, friction log, `CHANGELOG.md`, `migration-notes.md`, `api-surface.md`) are the
session's alone under the Pairs overrides. Every task that runs `npm run emit:template` (PB-T1,
PB-T3, PB-T5, PB-T9, PB-T10) stays serial, since each rewrites `templates/waymark/**`.

## Tasks

### PB-T0. Re-entry

- **Outcome.** The session is on branch `worktree-engine-pass-b`, made from local `main` after step
  2's merge, with the pushed `engine-pre-2b-b` merged in by `git merge --no-ff --no-commit
  origin/engine-pre-2b-b`. That brings this plan, the old plan's Task 0 Ledger, and WIP `dbdc4556`.
  A conflict follows "Merging `main`". Before the commit:
  - Re-check the line claims in this plan's own text at the merged tree: every path, line number,
    symbol, and script that PB-T1 to PB-T11, "Order", and the Retired phrases table name, and old
    Task 0 item 7. The old task bodies' lines are re-checked by each task as it reads them. Add one
    dated line per task under "Re-check" below: `PB-Tn: holds at <sha>`, or the moved fact. Record
    there the line ranges of both dev-fold replay steps in `e2e.yml` and `scaffold.yml` (on step 2's
    branch the sharded `e2e.yml` holds them at `:83-101` and `:136-150`).
  - Record the baseline in the commit body: `gh run list --commit "$(git rev-parse origin/main)"
    --json workflowName,conclusion`, the inherited set.
  - Run `npx svelte-kit sync` in `examples/showcase`. `npm ci` already ran the root `prepare`, which
    builds `dist`, so no separate `npm run package` runs; the template bake runs inside the
    `create-cairn-site` extra command.
  - Add one line to the branch's `docs/STATUS.md` naming the session (`engine-pass-b`, its id from
    `claude agents --json`) and the branch.

  Commit as `PB-T0: Merge the pass B branch and re-check plan claims`, push, open the draft PR
  against `main`, then run `gh pr close 111 --comment "Superseded by #<new>, the lean re-plan of
  pass B."`.
- **Files.** This plan (Re-check lines only) and `docs/STATUS.md` (one line).
- **Risk.** `ordinary`. The WIP it carries is gated and reviewed in PB-T1.
- **Acceptance.** `git merge-base --is-ancestor dbdc4556 HEAD` and `git merge-base --is-ancestor
  origin/main HEAD` both exit 0; `realpath examples/showcase/node_modules/@glw907/cairn-cms` and
  `realpath examples/showcase/node_modules/@glw907/cairn-cms-dev` print paths under the worktree;
  "Re-check" holds one line per task; the draft PR exists; `gh pr view 111 --json state -q .state`
  prints `CLOSED`.
- **Test.** None; the re-check is the check.
- **Clock.** 30.

### PB-T1. The signups demo leaves the scaffold, and provisioning drops `APP_DB` (old Tasks 1 and 2)

- **Outcome.** Old Tasks 1 and 2, landing as WIP `dbdc4556` plus one `PB-T1:` commit. Neither task
  is shippable alone: `nameWranglerResources` throws when the `-app` database target is missing.
  Read the WIP against both tasks' Acceptance and finish what it lacks. For the test-first lines,
  revert the WIP's source change per "Proofs on a clean tree" (`git checkout <PB-T0>^1 -- <source
  file>`), quote each new test failing, and restore. Quote the deploy test's mutation proof
  (re-adding `'APP_DB'` to `MIGRATION_DATABASES`). File the stale transcripts in the branch's
  friction log. Add Decision 12's window to the `CHANGELOG.md` `## Unreleased` entry as one sentence
  that names the remedy: from the affected site, `npx wrangler d1 migrations apply APP_DB --remote`.
  Add a one-line comment at `MIGRATION_DATABASES` stating the accepted window, with no plan or task
  number.
- **WIP paths outside old Tasks 1 and 2's Files.** Each is kept, with its reason in the commit body:
  - `packages/create-cairn-site/bin.mjs` and `packages/create-cairn-site/src/money.mjs`: the closing
    summary and the cost preamble said "two databases", which is false once one is provisioned.
  - `src/tests/unit/audit/own-tree-and-guidance.test.ts`: `exemplar-list.md` now carries the shipped
    Signups source inline (old Task 1's outcome), a fence that opens with its own `<script>`, which
    the normalizer would double-prefix. Quote this change to the reviewer.
  - `docs/internal/facts/admin.md` and `docs/internal/facts/extend.md`: their sources
    (`wrangler.jsonc`, `bin.mjs`, `money.mjs`) changed under them, and `check:facts` holds them to
    the code. PB-T11's triage counts them.
  - `templates/waymark/worker-configuration.d.ts` is inside old Task 1's Files (`templates/waymark/**`).
- **Files.** Old Task 1's and old Task 2's Files, the WIP paths above, the friction log, and
  `CHANGELOG.md` (one entry).
- **Risk.** `auth-data` (old Task 2's D1 provisioning beside `AUTH_DB`).
- **Acceptance.** Old Task 1's and old Task 2's Acceptance; the fast lane over `<PB-T0>^1..HEAD`
  green; `diff-reviewer` returns `accept` on `git diff <PB-T0>^1..<PB-T1 sha> -- .
  ':!docs/superpowers'`, the whole WIP plus the delta, with both tasks' criteria and Decisions 5, 9,
  10, and 12 quoted.
- **Test.** Old Task 2's three test-first unit tests and old Task 1's `emit-template-tree.test.ts`
  assertion.
- **Extra commands.** The `create-cairn-site` suite.
- **Clock.** 55.

### PB-T3. The admin error page, the manifest message, the types script, and the feed (old Task 3)

- **Outcome.** Old Task 3 (A5, B2, B3, D2) with Decision 4's fixture route and the ruled copy,
  verbatim: the 403 heading "You don't have access to this page.", body "Your role doesn't include
  this page. Ask the site owner if you need access.", link "Back to the dashboard"; the 404 heading
  "This page doesn't exist.", body "Check the address, or go back to the dashboard.", link "Back to
  the dashboard". The A5 spec runs once red before the page exists and once green after. The
  captures (the 403 page under the light and dark admin themes) come from a scratch Playwright script
  under `$HOME/.cache/engine-pre-2b-b/captures/` against the fixture route, not from the committed
  spec, which would also write them on CI. The script's server runs the config's `webServer` command
  with `E2E_PORT=4394`, and the session stops it after the captures.
- **Files.** Old Task 3's Files.
- **Risk.** `ordinary`. B2 and D2 are test-first, as the old task says.
- **Acceptance.** Old Task 3's Acceptance.
- **Test.** The A5 e2e spec, the B2 and D2 unit tests, and the B3 `emit-template-tree.test.ts`
  assertion.
- **Extra commands.** The one-spec e2e, red then green, and the `create-cairn-site` suite.
- **Clock.** 55.

### PB-T4. The dev package ships `dist/` (old Task 4; pair with PB-T6)

- **Outcome.** Old Task 4 under Decision 2, including the `publish-dev` job's build. The `wrangler
  deploy --dry-run` replays use the steps PB-T0 located, with the scratch `--outdir`.
- **Files.** Old Task 4's Files.
- **Risk.** `runner` (`.github/workflows/publish.yml`, `scripts/checks/check-dev-package.mjs`).
- **Acceptance.** Old Task 4's Acceptance, read through the Retired phrases table.
- **Test.** The table-driven `check-dev-package` test.
- **Extra commands.** The dev package tests.
- **Clock.** 40. Pair estimate with PB-T6: 50, the longer task plus 10 for the merge.

### PB-T6. `cairn-guidance check` reads a fresh scaffold as fresh (old Task 6; pair with PB-T4)

- **Outcome.** Old Task 6 (B6).
- **Files.** Old Task 6's Files.
- **Risk.** `ordinary`.
- **Acceptance.** Old Task 6's Acceptance.
- **Test.** Its four unit cases.
- **Clock.** 25, off the critical path.

### PB-T5. The engine supplies the dev-build define (old Task 5)

- **Outcome.** Old Task 5 (B7), built on PB-T4's `dist/` dev package. Three more hook rows: under
  `build`, `VITE_CAIRN_E2E` set to `true`, to `0`, and to the empty string each give `false`. Every
  row sets or clears the variable with `vi.stubEnv`, so no case passes on a leaked environment.
- **Files.** Old Task 5's Files.
- **Risk.** `auth-data`: the define decides whether a handle that mints owner sessions compiles into
  a deployed Worker.
- **Acceptance.** Old Task 5's Acceptance, including both marker replays with the scratch
  `--outdir`; `diff-reviewer` returns `accept`.
- **Test.** The four test-first hook cases and the three rows above, the plugin-order
  `resolveConfig` test, and the quoted mutation proof.
- **Extra commands.** The `create-cairn-site` suite.
- **Clock.** 40.

### PB-T7. Composition refuses duplicate labels and reserved ids, and `itemLabel` goes (old Task 7; pair with PB-T8)

- **Outcome.** Old Task 7 (A13, A14, D4).
- **Files.** Old Task 7's Files, read through the Retired phrases table. The session regenerates
  `docs/internal/api-surface.md` after the merge.
- **Risk.** `ordinary`.
- **Acceptance.** Old Task 7's Acceptance. Its "showcase and template adapters still compose" line
  is met by `npm --prefix examples/showcase run build` exiting 0 after `npm run package`, exit line
  quoted, and for the template adapter by CI's `scaffold` green on the head carrying the task. If
  either adapter needs an edit (a concept id now reserved), the subagent stops and reports, since that
  edit would cross the pair seam and the serial `emit:template` rule.
- **Test.** The A13 throw, the table-driven reserved-set test with its shared-set proof, and the
  `@ts-expect-error` line.
- **Clock.** 30, off the critical path.

### PB-T8. The sanitize floor and two build warnings (old Task 8; pair with PB-T7)

- **Outcome.** Old Task 8 (C5, C13, D6). D6's home is `buildSiteManifest` in
  `src/lib/delivery/manifest.ts`, which holds each concept's descriptor and each entry's parsed
  frontmatter in one loop (probed at step 2's branch). The warning adds no export and no
  `api-surface.md` change; a need for either is a stop. Two more C5 cases: a callback whose result
  carries `tagNames: null`, and a callback that returns nothing, each throw at construction naming
  `sanitizeSchema`.
- **Files.** Old Task 8's Files, with the manifest build at `src/lib/delivery/manifest.ts`.
- **Risk.** `auth-data` (C5's security floor).
- **Acceptance.** Old Task 8's Acceptance with both mutation proofs quoted; `diff-reviewer` returns
  `accept` on the PB-T8 commit as merged.
- **Test.** The C5 cases (test-first) with the two above, and the C13 and D6 cases.
- **Clock.** 40. Pair estimate with PB-T7: 50.

### PB-T9. The site-config path is declared once, and `cairn-audit --fail-on advisory` (old Task 9)

- **Outcome.** Old Task 9 (D5, D8a) under Decision 6.
- **Files.** Old Task 9's Files.
- **Risk.** `ordinary`.
- **Acceptance.** Old Task 9's Acceptance.
- **Test.** The D5 unit and integration cases, the twin-pin test, and the D8a exit-code cases.
- **Extra commands.** The integration project, and the `create-cairn-site` suite under the Gates
  rule.
- **Clock.** 45.

### PB-T10. The dev backend over the site's real content (old Task 10)

- **Outcome.** Old Task 10 (ruling 5) under Decisions 1 and 3 and fork 1's ruling, with the ruled
  notice copy verbatim: "Edits are held in memory. They're discarded when the dev server stops." The
  task owns every ruling-5 record the old task lists. Two amendments to its Acceptance:
  - The tree snapshot runs over a temp root holding at least two entries, the manifest,
    `src/theme/site.config.yaml`, and `src/content/.cairn/media.json`. The test asserts the handle's
    resolved root equals that temp root, and each step of the sequence asserts its effect with a
    read-after-write before the final snapshot, so the snapshot cannot pass on a wrong cwd or a no-op.
  - "A production backend never carries it" reads: the engine's `github-app` provider never sets
    `ephemeral`.

  The fresh-emission capture of the notice is saved beside PB-T3's and named in the commit body.
- **Files.** Old Task 10's Files.
- **Risk.** `auth-data`: it edits `src/lib/github/backend.ts` and
  `examples/showcase/src/hooks.server.ts`, both on `cairn-pass`'s path map. Test-first binds, and the
  old task's mutation proof is quoted.
- **Acceptance.** Old Task 10's Acceptance with the amendments; `diff-reviewer` returns `accept`.
- **Test.** The overlay cases against the temp tree, the tree snapshot, the workerd guard, the
  notice component tests, and the `emit-template-tree.test.ts` assertion.
- **Extra commands.** The dev package tests and the `create-cairn-site` suite.
- **Clock.** 80.

### PB-T11. Docs and records for pass B (old Task 11)

- **Outcome.** Old Task 11 under Decisions 1, 7, and 8, drafted to the developer brief in
  `docs/internal/docs-register.md`, with Vale's error tier as the floor. Pass A's hand-off list comes
  from the old plan's Ledger (Task 0's entry). The friction triage covers the entries this branch
  filed, PB-T1's stale-transcript entry excepted.
- **Files.** Old Task 11's Files.
- **Risk.** `ordinary`.
- **Acceptance.** Old Task 11's Acceptance, its `cairn-run-gate 'npm run check:surface && npm run
  check:rulings-format'` line included, read through the Retired phrases table.
- **Test.** The docs checks the fast lane selects, and the quoted `relink.json` one-liner.
- **Clock.** 45.

### PB-C. Close

- **Outcome.** In order, per `pass-core` "Close" and `cairn-pass`. The review needs no CI result, so
  it runs beside CI, and one CI read on the final head carries the close (`pass-core`: "The repo's
  full-suite home is green on the head").
  1. **Beside CI.** PB-T11's push already started the watch on the head. While it runs:
     - The consumer proof from the old Close step 3, with one change: the showcase rebuild runs `rm
       -rf examples/showcase/node_modules && npm ci --prefix examples/showcase` and never deletes the
       lockfile. Its third bullet is read from the final head's CI.
     - One whole-branch review: `diff-reviewer` at whole-branch scope (`model: "opus"`, effort
       `medium`), loading the checklists `cairn-pass`'s globs match (`svelte-reviewer`,
       `cloudflare-workers-reviewer`, `web-auth-security-reviewer`, `daisyui-a11y-reviewer`). Its
       brief is the old plan's "Review focus" list, the old Close step 4's per-reviewer targets, and
       one more target: the dispatcher's reserved set is a superset of the old `RESERVED_SEGMENTS`.
     - A fresh-context `visual-verifier` grades the PB-T3 and PB-T10 captures. The reference is
       `docs/internal/admin-design-system.md`'s `alert` and error recipes, plus a capture of an
       existing admin page under the same theme. The session reads the captures itself.

     A red on this head joins item 2's chain.
  2. **One batched fix chain.** Each blocking finding, each STRUCTURAL visual verdict, and each red
     is quoted verbatim (location, finding, and fix) as its acceptance. Then the fast lane and a
     push. When a blocker was fixed, a second whole-branch review runs and must return `accept`.
  3. **Overrules.** A blocking finding the session judges wrong is never merged past. On an
     `auth-data` path it is a stop. Elsewhere the review re-runs at `xhigh` (`pass-core`), and a
     finding that still stands is a stop. A non-blocking finding may be dispositioned in `Review`.
  4. **The live auth smoke** from the old Close step 6, all of it, per
     `docs/internal/admin-smoke-test.md`, run by the session.
  5. **The `cairn-pass` close checklist**: docs touched by close-time fixes, `check:surface --
     --update` if a typed export moved, the friction log triaged complete-or-move, the re-arm list
     checked against the final diff (old Close step 8), and `CHANGELOG.md` finalized under `##
     Unreleased`. No version bump, tag, or publish.
  6. **Ledgers.** Edit the merged `docs/STATUS.md`, changing only pass B's lines: present tense, 60
     lines or fewer, the engine pass before stage 2b closed unreleased, stage 2b next from the re-arm
     list, and a cleanup line for the planning session (remove the `engine-pass-b` and
     `engine-pre-2b-b` worktrees after confirming the merge). In `ROADMAP.md`, remove the "**Engine
     pass B before stage 2b**" Now entry and put the "Pass B runs next" path item in past tense.
     Items 5 and 6 land as one commit, `PB-C: Close the pass records`, pushed, with the watch started.
  7. **The PR body and the merge.** The PR body follows Conventions. `Review` ends with the line
     `Blocking findings open: 0`. `Score` carries the spec's rows: Gates on the critical path, Work
     and review, CI waits on the path, Fix rounds and reds, Close, and Total. Gate and lock time come
     from `cairn-run-gate --records <toplevel> worktree-engine-pass-b` plus the pair records read at
     each pair merge. CI time from `--records` is labeled the total; only the waits that blocked a
     task count as on the path. The task rows come from the `Pass-Clock:` trailers (`git log
     --format=%B origin/main..HEAD`). The clock runs from PB-T0's commit time (`git log -1
     --format=%ct <PB-T0>`) to `gh pr ready`, minus each stop's wait for Geoff, stated against the
     9-hour success test. Each stop's wait is its own line, beside the attended events (the design,
     each stop) and any escape. Then run the merge sequence immediately
     before the merge, after the last code change, stopping at the first failure:
     1. `test ! -e "$(git rev-parse --absolute-git-dir)/pass-stop"`.
     2. `[ -z "$(git status --porcelain)" ]`.
     3. `git fetch origin && [ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)"
        ]`. On a failure, merge `origin/main` per "Merging `main`", run the fast lane over the merge,
        push, and start the sequence again; a third merge-in is a stop. A clean merge-in that touches
        `cairn-pass`'s `auth-data` globs needs only CI green on the merged head (Geoff, 2026-10-10:
        "Yes, CI green is enough"); a conflicting merge-in stops.
     4. `sha=$(git rev-parse HEAD)` equals `gh pr view <n> --json headRefOid -q .headRefOid`.
     5. `ci-green "$sha" --pr <n> --wait` exits 0, re-issued on 75. Exit 3 here is a stop: no
        self-merge without CI on the head.
     6. Each `##` section from Conventions appears in `gh pr view <n> --json body -q .body`, and the
        body holds the line `Blocking findings open: 0`.
     7. `gh pr ready <n>` (the clock's end; record `date +%s` into `Score` with one `gh pr edit`),
        then `gh pr view <n> --json isDraft,mergeable -q '[.isDraft,.mergeable]|@tsv'` prints `false`
        and `MERGEABLE`. GitHub computes `mergeable` lazily, so while it prints `UNKNOWN`, re-read up
        to three times, 10 seconds apart.
     8. The base check again, since `main` can move during step 5's wait: `git fetch origin && [
        "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ]`. On a failure, return
        to step 3.
     9. `gh pr merge <n> --merge --match-head-commit "$sha"` (Geoff's ruling above).
  8. **After the merge.** `gh pr view <n> --json state -q .state` prints `MERGED`. Remove the
     task-clock file, run `notify-send -u normal "engine pass B: merged as PR #<n>"`, call
     ExitWorktree with `action: "keep"`, and end. The planning session removes the worktrees.
- **Files.** The fix chain's files, `docs/STATUS.md`, `ROADMAP.md`, `CHANGELOG.md`, and the friction
  log.
- **Risk.** `auth-data`.
- **Acceptance.** Every step of item 7's sequence passed in order; the PR body quotes the consumer
  proof's three results, the smoke's evidence, a `visual-verifier` verdict with no unfixed STRUCTURAL
  item, and the six score rows; `git show origin/main:ROADMAP.md` no longer holds the "Engine pass B
  before stage 2b" entry; `git show origin/main:CHANGELOG.md` carries pass B's `## Unreleased`
  lines; `git show origin/main:docs/STATUS.md | wc -l` prints 60 or less; `test ! -e
  "$(git rev-parse --absolute-git-dir)/pass-task-clock"`.
- **Test.** CI and the smoke.
- **Clock.** 100.

## Re-check

PB-T0 adds one dated line per task here.

2026-10-10, at the merged tree on `main` `aacaa46c` plus `engine-pre-2b-b` `2548c87e`:

- PB-T0: holds. Baseline on `main` `aacaa46c`: `create-site`, `scaffold`, `design`, `e2e`, and `test` all
  `success`, so the inherited red set is empty.
- PB-T1: holds. `.cairn-template.json` already lists `src/routes/admin/signups` and `migrations-app`,
  `wrangler.jsonc` carries the exclude markers around `APP_DB` (`:35-46`), `MIGRATION_DATABASES` is
  `['AUTH_DB']` (`deploy.mjs:175`), and `emit-template-tree.test.ts:125-130` asserts `AUTH_DB` alone,
  all WIP `dbdc4556` content. `form-anatomy.md` makes no Signups claim (Decision 9).
- PB-T3: holds. No `src/routes/admin/+error.svelte` in the showcase or template; the root
  `+error.svelte` exists; the stale-manifest message names `npm run cairn:manifest`
  (`manifest.ts:402`); `feed.ts:20` renders with `cairn.rendering.render`.
- PB-T4: holds. The dev-fold replay steps sit at `e2e.yml:83-101` and `:136-150`, and at
  `scaffold.yml:45-61` and `:62-78`. `check-dev-package.mjs` and `dev-fold-markers.txt` exist.
- PB-T5: holds. `transformPackageJson` is at `emit-template.mjs:90`.
- PB-T6: holds.
- PB-T7: moved. `normalizePublishActions` is at `src/lib/sveltekit/publish-actions.ts:38` and
  `RESERVED_SEGMENTS` at `admin-dispatch.ts:33`, `ACCESS_FIXED_SCREENS` at `admin-nav.ts:280` as
  stated, but `normalizeConcepts` (`:135`) and `itemLabel` (`:21`, `:28`) live under `src/lib/content/`
  (`concepts.ts`, `fieldset.ts`), not `src/lib/sveltekit/`.
- PB-T8: moved. `sanitize-schema.ts` is `src/lib/render/sanitize-schema.ts`. `checkSiteFacts` is at
  `src/lib/vite/internal.ts:577` and `buildSiteManifest` at `src/lib/delivery/manifest.ts:18`, as stated.
- PB-T9: holds.
- PB-T10: holds.
- PB-T11: holds. `docs/internal/record/harvest/relink.json` exists.
- PB-C: holds. `emit:template`, `check:surface`, `check:facts`, `check:rulings-format`,
  `test:integration`, and `check:close` all exist in `package.json`.

## Clock total

The task estimates sum to 605 minutes: PB-T0 30, PB-T1 55, PB-T3 55, the PB-T4 and PB-T6 pair 50
(PB-T6's 25 runs beside PB-T4's 40, plus 10 for the merge), PB-T5 40, the PB-T7 and PB-T8 pair 50,
PB-T9 45, PB-T10 80, PB-T11 45, and PB-C 100. The critical path is 550 minutes (9.2 hours). The
success test's clock starts at PB-T0's commit, after most of PB-T0's work, and ends at `gh pr
ready`, before the merge, so it covers about 525 minutes (8.75 hours). That leaves about 15 minutes
under the 9-hour test before any fix round. At the spec's price for fix rounds and reds, 40 to 90
minutes, the expected clock is 9.4 to 10.3 hours, a miss: the test passes only with zero fix rounds
and no red. The wait between a stop's notification and Geoff's reply is excluded from the clock
(see Stops), and the Score states each stop's wait separately. The clock stop fires at twice a
task's estimate.

## Launch

The planning session runs this once step 2's PR (#112) has merged and the fold is committed and
pushed on `engine-pre-2b-b` (`git -C
/var/home/glw907/Projects/cairn-cms/.claude/worktrees/engine-pre-2b-b push origin engine-pre-2b-b`).
The push is the only off-machine copy of the WIP and the plan; it fires CI on PR #111, which PB-T0
closes. Each line runs only if the one before it succeeded, and any failure refuses the launch:

```bash
(
cd /var/home/glw907/Projects/cairn-cms && git fetch origin &&
out=$(claude agents --json) && jq -e 'type == "array"' <<<"$out" >/dev/null &&
! jq -e 'any(.[]; .name == "engine-pass-b" or ((.cwd // "") | test("/[.]claude/worktrees/(engine-pass-b|engine-pre-2b-b)($|/)")))' <<<"$out" >/dev/null &&
[ "$(gh pr view 112 --json state -q .state)" = MERGED ] &&
[ "$(git branch --show-current)" = main ] &&
git merge --ff-only origin/main &&
[ "$(git rev-list --count origin/main..HEAD)" = 0 ] &&
P=.claude/worktrees/engine-pre-2b-b &&
[ -z "$(git -C "$P" status --porcelain)" ] &&
[ "$(git rev-parse engine-pre-2b-b)" = "$(git rev-parse origin/engine-pre-2b-b)" ] &&
git check-ignore -q .claude/worktrees/x &&
claude --bg --model sonnet --effort medium --name engine-pass-b \
  "$(cat "$P/docs/superpowers/plans/2026-10-10-engine-pass-b-lean-prompt.txt")"
) || echo "launch refused: a check failed" >&2
```

The `claude agents --json` lines fail closed: a failed listing or a non-array refuses the launch, and
so does a live session named `engine-pass-b` or one working in either worktree. The
`origin/main..HEAD` count catches unpushed commits on local `main`, since `worktree.baseRef: "head"`
branches from local `HEAD`. The last two checks before `claude --bg` make the plan the session reads
equal to the pushed branch tip PB-T0 merges.
