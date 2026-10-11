# Engine pass B, lean re-plan

Rollout step 5 of the lean pass cutover: engine pass B before draft docs stage 2b, re-planned as a
lean task list and the first pass scored on the new process. Process: `cairn-pass`, which loads
`pass-core`. Design approved by Geoff on 2026-10-10.

## Sources

- **The task bodies.** `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` (the old plan)
  carries each task's Files, Outcome, and Acceptance, including the test-first lines and mutation
  proofs. Each task below names its old task and lists only the amendments. Where an amendment and
  the old text disagree, the amendment wins. Everything else in that task's Files, Outcome, and
  Acceptance binds as written.
- **Decisions and rulings.** The old plan's "Decisions this plan takes" 1 to 12 and its "Rulings for
  Geoff" (fork 1 and the copy) bind verbatim. Its "Review focus" list is the close review's brief.
- **The record.** The old plan's Ledger holds Task 0's pre-flight at `21ec86a9`, with pass A's
  hand-off list verbatim. Old Task 11 reads that list for the `relink.json` re-arm entries.
- **The design.** `docs/superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md` ("Pass B" and
  each item's section) and its rulings file beside it.
- **The process spec.** `~/.dotfiles/docs/superpowers/specs/2026-10-10-lean-pass-process-design.md`,
  "Rollout" step 5 and "Success test".

## Retired from the old plan

None of these sections bind: Pass class, Token ceiling, Checkpoint interval, Segments, Disjoint
Files seams, Split rule, Execution mode, CI behind the runner, Models, Pre-flight, Gates, Unattended
run, Ledger, and Post-mortem. The same goes for every per-task Pass class line, Gate line, and
"S<n> boundary" line, and for the old Close. `pass-core` and `cairn-pass` replace them. The fork 3
token ceiling is gone; the clock stop and the PR score replace it. No `code-simplifier` pass runs,
`docs/HISTORY.md` is frozen and takes no entry, and the plan takes no post-mortem.

Two old Global constraints change. No conductor commits STATUS or the friction log on `main`
mid-pass; both change on the pass branch. Friction found mid-task goes to the branch's
`docs/internal/docs-friction-log.md`, or to "Found, not done" in the PR body. The rest of the old
"Global constraints" bind, including the scratch root `$HOME/.cache/engine-pre-2b-b/`.

## Ruled for this pass

- **Merge (Geoff, 2026-10-10: "Design approved, and you can merge.").** The session merges its own
  PR, after the close gates in task PB-C pass. A stop under "Stops" still stops, and an open stop
  blocks the merge.
- **Risk class: `auth-data`.** The pass takes its highest task's class. PB-T1, PB-T5, and PB-T8 are
  `auth-data` by their old classes, and PB-T10 is `auth-data` by `cairn-pass`'s path map
  (`src/lib/github/**` and `**/hooks.server.ts`). PB-T4 is `runner`, and the rest are `ordinary`. No `live-account` flag: no task
  provisions a real Cloudflare, GitHub, or npm resource, and the smoke runs under local
  `wrangler dev`.
- **Decision 12's resume window** goes into PB-T1's `CHANGELOG.md` entry and the PR body, since
  HISTORY is frozen.

## Conventions every task follows

- **Task fields.** Each task gives its outcome, files, risk class, acceptance check, test, and clock
  estimate in minutes. A task is done only when its acceptance passes.
- **Commits.** One commit per task, its subject starting with the task id (`PB-T3: Add the admin
  error page and three scaffold fixes`). Use imperative mood, commit specific files only, and never
  `git add -A`.
- **Resume.** A relaunch with the same prompt finds the done tasks with `git log --oneline` (task ids
  in subjects) and starts at the first task whose acceptance fails.
- **Gates.** Each task runs the fast lane: `node scripts/checks/gate-tier.mjs --fast --range
  <base>..HEAD` prints the legs, and each leg runs through `cairn-run-gate` per `cairn-pass`. A task
  acceptance that quotes its own command (a fresh bake, a `wrangler deploy --dry-run` replay, a
  `node -e` one-liner) runs it beside the fast lane. An old "the computed gate green" line now means
  the fast lane green. No task waits for CI before the next. A red stops the line, and the fix goes
  forward or the commit reverts.
- **`auth-data` tasks.** The test-first lines bind. `diff-reviewer` (task scope, Agent tool, `model:
  "opus"`) reads the commit against the task's Outcome and Acceptance, quoted verbatim, while CI runs.
  A `fix` or `escalate` stops the line like a red. `RUN_GATE_IF_BUSY=defer` is never set on these
  tasks.
- **Pairs.** A pair is two Agent-tool subagents with `isolation: "worktree"`, dispatched after the
  session commits. Each subagent's prompt quotes its task's Files, Outcome, and Acceptance verbatim
  from the old plan, with this plan's amendments, plus the old plan's Global constraints. Each runs
  `npm ci && npm ci --prefix examples/showcase`, edits only its own Files, commits, and never pushes.
  The session merges both, runs the fast lane on the merge, and pushes. A merge conflict stops the
  line.
- **Clock.** At each task start the session writes `pass-task-clock` in `git rev-parse
  --absolute-git-dir` (`task=`, `start=`, `estimate=`) and removes it at the task's end, per
  `pass-core`. A pair gets one file after it returns, carrying the longer estimate and `start=` set to
  the dispatch time.
- **Stops.** A stop rewrites `docs/STATUS.md` on the branch: the task in flight, what failed, and
  the one question. It then runs `notify-send -u normal "engine pass B: <task> stopped"` and waits.
  These stop the line: a fired clock stop; a red the session cannot fix in two attempts; an
  `auth-data` `fix` that still stands after one fix round; an `escalate`; a task needing public
  surface the old plan does not name (old Global constraints, "No new public surface"); and a finding
  that would change the approved design.
- **Pushes.** Push the session's own branch to `glw907/cairn-cms` after every task. Never push
  `main`. The only merge is PB-C's.
- **PR body.** What landed (task id, commit); each `auth-data` verdict; the whole-branch review
  verdict with a disposition per finding; every retried test from `ci-green`'s output; "Found, not
  done"; Decision 12's window; and the score (see PB-C).

## Order

PB-T0, then PB-T1, then PB-T3. PB-T4 and PB-T6 run as a pair, followed by PB-T5. PB-T7 and PB-T8 run
as a pair, followed by PB-T9, PB-T10, PB-T11, and PB-C.

The pair seams were probed at `origin/main` `dea73f7d`. PB-T4 writes `packages/cairn-cms-dev`, the
root `package.json`, `publish.yml`, and the dev-package check. PB-T6 writes `src/lib/guidance/**`
and `docs/reference/guidance.md`, so the two share no path. PB-T7 writes `publish-actions.ts`
(`normalizePublishActions`, `:38`), `concepts.ts` (`normalizeConcepts`, `:135`),
`admin-dispatch.ts` (`RESERVED_SEGMENTS`, `:33`), `fieldset.ts` (`itemLabel`, `:21`, `:28`),
`docs/reference/core.md`, and `docs/internal/api-surface.md`. PB-T8 writes
`sanitize-schema.ts`, `src/lib/vite/internal.ts` (`checkSiteFacts`, `:577`), the manifest build,
and `docs/reference/render.md`. Its D6 warning lives in `src/lib/content/manifest.ts` or the
`internal.ts` virtual-module path, never in a PB-T7 file. If D6's natural home is one of PB-T7's
files, PB-T8's subagent stops and reports, and the session runs the two tasks serially. Every task
that runs `npm run emit:template` (PB-T1, PB-T3, PB-T5, PB-T9, PB-T10) stays serial, since each
rewrites `templates/waymark/**`.

## Tasks

### PB-T0. Re-entry

- **Outcome.** The session is on its own worktree branch from `main` after step 2's merge, with
  `engine-pre-2b-b` merged in: `git merge --no-ff engine-pre-2b-b`, a local branch shared with the
  main checkout. That merge brings this plan, the Task 0 Ledger, and WIP `dbdc4556`. A conflict in
  `docs/STATUS.md` takes `main`'s side, and any other conflict stops the line. The plan's line claims
  are re-checked at the merged head: every path, line number, symbol, and script that PB-T1 to PB-T11
  and the old Task 0 item 7 name. Where one moved, this plan gains a dated amendment line under its
  task. Step 2 sharded `.github/workflows/e2e.yml`, so the `wrangler deploy --dry-run` marker steps
  that old Tasks 4 and 5 replay are re-located there. `npm ci && npm ci --prefix
  examples/showcase` has run, and `realpath` shows `examples/showcase/node_modules/@glw907/cairn-cms`
  and `.../cairn-cms-dev` resolving into the worktree. CI's three preparation steps from the old Task
  0 item 3 (the root `npm run package`, the `create-cairn-site` template bake, and `npx svelte-kit
  sync` in the showcase) have run.
- **Files.** This plan (amendments only).
- **Risk.** `ordinary`.
- **Acceptance.** `git merge-base --is-ancestor dbdc4556 HEAD` exits 0; `git merge-base
  --is-ancestor origin/main HEAD` exits 0; both `realpath` lines print paths under the worktree; the
  commit carries the merge and any amendment, and the first push opens a draft PR against `main`.
  Then `gh pr close 111 --comment "Superseded by #<new>, the lean re-plan of pass B."` runs.
- **Test.** None; the re-check is the check.
- **Clock.** 20.

### PB-T1. The signups demo leaves the scaffold, and provisioning drops `APP_DB` (old Tasks 1 and 2)

- **Outcome.** Old Tasks 1 and 2, landing as one commit. Neither is shippable alone:
  `nameWranglerResources` throws when the `-app` database target is missing (old plan, "Disjoint
  Files seams"). Start from WIP `dbdc4556`, which holds both tasks' implementer edits, unreviewed and
  ungated. Read the WIP against both tasks' Acceptance and finish what it lacks. For the test-first
  lines, show each new test failing with the WIP's source change reverted, quote that, then restore.
  The deploy test's mutation proof (re-adding `'APP_DB'` to `MIGRATION_DATABASES`) is quoted. The
  old plan's "conductor files the stale transcripts at the S1 checkpoint" becomes: this task files
  them in the branch's friction log. Add Decision 12's resume window to the `CHANGELOG.md`
  `## Unreleased` entry for this change, as one sentence.
- **Files.** Old Task 1's and old Task 2's Files, `docs/internal/docs-friction-log.md`, and
  `CHANGELOG.md` (one entry).
- **Risk.** `auth-data` (old Task 2's D1 provisioning beside `AUTH_DB`).
- **Acceptance.** Old Task 1's and old Task 2's Acceptance; `diff-reviewer` returns `accept` on the
  commit.
- **Test.** Old Task 2's three test-first unit tests and old Task 1's `emit-template-tree.test.ts`
  assertion.
- **Clock.** 50.

### PB-T3. The admin error page, the manifest message, the types script, and the feed (old Task 3)

- **Outcome.** Old Task 3 (A5, B2, B3, D2) with Decision 4's fixture route and the ruled copy. The A5
  capture (the 403 page under the light and dark admin themes) is saved under
  `$HOME/.cache/engine-pre-2b-b/captures/` and named in the PR body for PB-C's `visual-verifier`
  read.
- **Files.** Old Task 3's Files.
- **Risk.** `ordinary`. B2 and D2 are test-first, as the old task says.
- **Acceptance.** Old Task 3's Acceptance.
- **Test.** The A5 e2e spec, the B2 and D2 unit tests, and the B3 `emit-template-tree.test.ts`
  assertion.
- **Clock.** 45.

### PB-T4. The dev package ships `dist/` (old Task 4; pair with PB-T6)

- **Outcome.** Old Task 4 under Decision 2, including the `publish-dev` job's build. The
  `wrangler deploy --dry-run` replays use the steps PB-T0 located in the sharded `e2e.yml` and in
  `scaffold.yml`.
- **Files.** Old Task 4's Files.
- **Risk.** `runner` (`.github/workflows/publish.yml`, `scripts/checks/check-dev-package.mjs`).
- **Acceptance.** Old Task 4's Acceptance.
- **Test.** The table-driven `check-dev-package` test.
- **Clock.** 40.

### PB-T6. `cairn-guidance check` reads a fresh scaffold as fresh (old Task 6; pair with PB-T4)

- **Outcome.** Old Task 6 (B6).
- **Files.** Old Task 6's Files.
- **Risk.** `ordinary`.
- **Acceptance.** Old Task 6's Acceptance.
- **Test.** Its four unit cases.
- **Clock.** 25.

### PB-T5. The engine supplies the dev-build define (old Task 5)

- **Outcome.** Old Task 5 (B7), built on PB-T4's `dist/` dev package.
- **Files.** Old Task 5's Files.
- **Risk.** `auth-data`: the define decides whether a handle that mints owner sessions compiles into
  a deployed Worker.
- **Acceptance.** Old Task 5's Acceptance, including both marker replays; `diff-reviewer` returns
  `accept`.
- **Test.** The four test-first hook cases, the plugin-order `resolveConfig` test, and the quoted
  mutation proof.
- **Clock.** 40.

### PB-T7. Composition refuses duplicate labels and reserved ids, and `itemLabel` goes (old Task 7; pair with PB-T8)

- **Outcome.** Old Task 7 (A13, A14, D4).
- **Files.** Old Task 7's Files, with `normalizePublishActions` at
  `src/lib/sveltekit/publish-actions.ts:38` (probed at `dea73f7d`).
- **Risk.** `ordinary`.
- **Acceptance.** Old Task 7's Acceptance. The "showcase and template adapters still compose" line
  is met by a composition smoke over both adapters, quoted, not by the old F.
- **Test.** The A13 throw, the table-driven reserved-set test with its shared-set proof, and the
  `@ts-expect-error` line.
- **Clock.** 30.

### PB-T8. The sanitize floor and two build warnings (old Task 8; pair with PB-T7)

- **Outcome.** Old Task 8 (C5, C13, D6), with D6's warning outside PB-T7's files (see "Order").
- **Files.** Old Task 8's Files.
- **Risk.** `auth-data` (C5's security floor).
- **Acceptance.** Old Task 8's Acceptance with both mutation proofs quoted; `diff-reviewer` returns
  `accept` on the merged pair's PB-T8 commit.
- **Test.** The C5 cases (test-first), the C13 and D6 cases.
- **Clock.** 40.

### PB-T9. The site-config path is declared once, and `cairn-audit --fail-on advisory` (old Task 9)

- **Outcome.** Old Task 9 (D5, D8a) under Decision 6.
- **Files.** Old Task 9's Files.
- **Risk.** `ordinary`.
- **Acceptance.** Old Task 9's Acceptance.
- **Test.** The D5 unit and integration cases, the twin-pin test, and the D8a exit-code cases.
- **Clock.** 40.

### PB-T10. The dev backend over the site's real content (old Task 10)

- **Outcome.** Old Task 10 (ruling 5) under Decisions 1 and 3 and fork 1's ruling, with the ruled
  notice copy verbatim: "Edits are held in memory. They're discarded when the dev server stops." The
  task owns every ruling-5 record the old task lists. The fresh-emission capture of the notice is
  saved beside PB-T3's and named in the PR body.
- **Files.** Old Task 10's Files.
- **Risk.** `auth-data`: it edits `src/lib/github/backend.ts` and `examples/showcase/src/hooks.server.ts`,
  both on `cairn-pass`'s path map. Test-first binds, and the old task's mutation proof is quoted.
- **Acceptance.** Old Task 10's Acceptance; `diff-reviewer` returns `accept`.
- **Test.** The overlay cases against the temp tree, the tree snapshot, the workerd guard, the
  notice component tests, and the `emit-template-tree.test.ts` assertion.
- **Clock.** 70.

### PB-T11. Docs and records for pass B (old Task 11)

- **Outcome.** Old Task 11 under Decisions 1, 7, and 8, drafted to the developer brief in
  `docs/internal/docs-register.md`, with Vale's error tier as the floor. Pass A's hand-off list comes
  from the old plan's Ledger (Task 0's entry). The friction triage covers the entries this branch
  filed, PB-T1's stale-transcript entry excepted.
- **Files.** Old Task 11's Files.
- **Risk.** `ordinary`.
- **Acceptance.** Old Task 11's Acceptance, its `cairn-run-gate 'npm run check:surface && npm run
  check:rulings-format'` line included.
- **Test.** The docs checks the fast lane selects, and the quoted `relink.json` one-liner.
- **Clock.** 45.

### PB-C. Close

- **Outcome.** In order, per `pass-core` "Close" and `cairn-pass`:
  1. CI green on the head through `ci-green <sha> --pr <n> --wait`, re-issued on 75. The run's base
     must be `origin/main`'s current head; if `main` moved, merge it in, push, and read again. A
     local full gate runs only on exit 3, per `cairn-pass`.
  2. The consumer proof from the old Close step 3, all three bullets, with evidence quoted.
  3. One whole-branch review: `diff-reviewer` at whole-branch scope (Agent tool, `model: "opus"`),
     loading the checklists `cairn-pass`'s globs match (`svelte-reviewer`,
     `cloudflare-workers-reviewer`, `web-auth-security-reviewer`, and `daisyui-a11y-reviewer`). Its
     brief is the old plan's "Review focus" list and the old Close step 4's per-reviewer targets.
     In parallel, a fresh-context `visual-verifier` grades the PB-T3 and PB-T10 captures against
     `docs/internal/admin-design-system.md`, and the session reads both captures itself.
  4. One batched fix chain. Each finding is quoted verbatim (location, finding, and fix) as its
     acceptance. Then the fast lane and CI run again. A second review runs only on a blocker.
  5. The live auth smoke from the old Close step 6, all of it, per
     `docs/internal/admin-smoke-test.md`.
  6. The `cairn-pass` close checklist: docs touched by close-time fixes, `check:surface -- --update`
     if a typed export moved, the friction log triaged complete-or-move, the re-arm list checked
     against the final diff (old Close step 8), and `CHANGELOG.md` finalized under
     `## Unreleased`. No version bump, tag, or publish.
  7. Ledgers. `docs/STATUS.md` is present tense and 60 lines or fewer: the engine pass before stage
     2b is closed unreleased, and stage 2b is next, starting from the re-arm list.
     `ROADMAP.md`'s "Engine pass before stage 2b" entry is removed.
  8. The PR body per Conventions, with the score. The score has the spec's price table rows (Gates
     on the critical path, Work and review, CI waits on the path, Fix rounds and reds, Close, and
     Total), with gate and lock time from `cairn-run-gate --records <toplevel> <branch>`. The clock
     runs from PB-T0's first commit to PR-ready, and the PR body states it against the 9-hour
     success test. It lists the attended events (the design, each fired clock stop) and any escape.
  9. `gh pr ready`; if the head moved since item 1, read CI green on it as item 1 does; then `gh pr merge <n> --merge`
     (Geoff's ruling above). Remove the task-clock file, run `notify-send -u normal "engine pass B:
     merged"`, and end. Remove the worktree only after the merge shows on `origin/main`.
- **Files.** The fix chain's files, `docs/STATUS.md`, `ROADMAP.md`, `CHANGELOG.md`, and the friction
  log.
- **Risk.** `auth-data`.
- **Acceptance.** `ci-green <head> --pr <n> --wait` exits 0 on a run based on `origin/main`'s head;
  the review's verdict is `accept`, or each finding is dispositioned in the PR body; the smoke's
  evidence is quoted in the PR body; `wc -l < docs/STATUS.md` prints 60 or less; `gh pr view <n>
  --json state` shows `MERGED`; `test ! -e "$(git rev-parse --absolute-git-dir)/pass-task-clock"`.
- **Test.** CI and the smoke.
- **Clock.** 120.

## Clock total

The tasks sum to 565 minutes, of which PB-C takes 120. PB-T6 runs beside PB-T4 and PB-T7 beside
PB-T8, so the critical path is 510 minutes (8.5 hours). That sits inside the spec's priced range for
pass B (5.2 to 8.8 hours) and under its 9-hour success test. The clock stop fires at twice a task's
estimate.

## Launch

Run from the cairn-cms main checkout once step 2's PR has merged:

```bash
claude agents --json | jq -e 'any(.[]; .name == "engine-pass-b")' >/dev/null || {
cd ~/Projects/cairn-cms && git fetch origin &&
[ "$(git branch --show-current)" = main ] &&
git merge --ff-only origin/main &&
[ "$(git rev-list --count HEAD..origin/main)" = 0 ] &&
git check-ignore -q .claude/worktrees/x &&
claude --bg --model sonnet --effort medium --name engine-pass-b \
  "$(cat .claude/worktrees/engine-pre-2b-b/docs/superpowers/plans/2026-10-10-engine-pass-b-lean-prompt.txt)"; }
```

The first line skips the launch when a session named `engine-pass-b` already exists. Each later
line runs only if the line before it succeeded.
