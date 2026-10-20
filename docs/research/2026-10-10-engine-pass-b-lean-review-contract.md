# Engine pass B lean re-plan: contract and criteria review

Lens: contract and criteria. Target: `docs/superpowers/plans/2026-10-10-engine-pass-b-lean.md`
(called "lean" below) and its launch prompt, at `18cd15db`, binding sections of
`docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` (called "old" below). Probed against
`origin/main` `dea73f7d`, `origin/worktree-lean-cutover` (PR #112, `scripts/checks/gate-tier.mjs`,
`docs/internal/pass-gate-tiers.md`), `pass-core`, `cairn-pass`, the agent definitions
(`cairn-implementer`, `diff-reviewer`), the `claude-clock-stop` hook, and the `EnterWorktree` tool
contract. Read-only; nothing was run beyond `git show`, `git log`, `grep`, and `gh pr view`.

Counts: 1 blocker, 13 major, 20 minor. Three findings are over-ceremony: 14 (major), 32, and 33.
No owner fork: every resolution below is a method call.

## Key fact the plan is missing

The fast lane is narrower than the old "computed gate" in ways that matter for this plan's
acceptance lines. In `decideFastGate` (`gate-tier.mjs` on PR #112, roughly `:644-713`) and in
`pass-gate-tiers.md` "The fast lane" (`:113-138`):

- The unit leg is `npx vitest related --run --passWithNoTests --project unit <paths>`, and only
  paths matching `/^(?:src|scripts)\//` are inputs. A changed `packages/cairn-cms-dev/src/*.ts`
  is never an input, though its tests sit in the `unit` project (`vitest.config.ts`, the `unit`
  include list).
- It never runs `npm test -w packages/create-cairn-site` (`CREATE_CAIRN_SITE` appears only in the
  targeted gate, `:599`), the `integration` project, the whole node projects, or any e2e spec
  ("It runs no whole node project and no e2e").

So "An old 'the computed gate green' line now means the fast lane green" (lean `:62-63`) silently
drops the local run of PB-T1's three test-first tests, PB-T10's overlay and guard tests, PB-T9's
integration cases, and PB-T3's A5 e2e spec. CI still carries them, so nothing is lost at merge, but
several acceptance lines cannot be met or evidenced as written. Findings 3 and 4 fold this.

## Findings, ranked by consequence

### 1. Blocker: PB-C's acceptance lets the session merge with a blocking finding open

- **Location:** lean `:270-271`, `:292-295`; also `:39-41`.
- **Defect:** The acceptance reads "the review's verdict is `accept`, or each finding is
  dispositioned in the PR body". A blocking security finding written off as "won't fix" in the PR
  body passes this, and the merge in item 9 then follows unattended. `pass-core` "Close" requires
  more: "An overruled verdict is stated with its reason in the PR body, and a correctness-critical
  overrule re-runs the review at `xhigh`." The plan carries no `xhigh` re-run and no stop. On an
  `auth-data` pass that merges itself, this is the one gate between an open blocker and `main`.
  The acceptance also omits half of PB-C's own outcome: the consumer proof's evidence (item 2), the
  `visual-verifier` verdict (item 3), ROADMAP's entry removal, the `CHANGELOG.md` finalization, and
  the score.
- **Fold:** Replace the clause with: "the whole-branch review returns `accept`, or every BLOCKING
  finding is fixed in the fix chain; a NON-BLOCKING finding may be dispositioned in the PR body. An
  overrule of a BLOCKING finding re-runs the review at `xhigh` (`pass-core`), and a BLOCKING finding
  that still stands after that, or any overrule on an `auth-data` path, is a stop under 'Stops' and
  blocks the merge. `visual-verifier` returns no STRUCTURAL verdict, or each is fixed." Add
  acceptance items for the consumer proof's three quoted exit lines, `git diff origin/main --
  ROADMAP.md` showing the entry removed, and the PR body carrying the six score rows.

### 2. Major: no home for per-task evidence ("the report")

- **Location:** lean `:87-89` (PR body), `:65-68` (`auth-data` review); old `:614`, `:651-652`,
  `:661-662`, `:774`, `:778`, `:826-827`, `:835`, `:957-959`, `:1102-1103`, `:1108`, `:1220`,
  `:1227` (every "the report quotes" or "quoted").
- **Defect:** Nearly every old Acceptance block ends in "the report quotes ...". The report was the
  runner's chain report, which is retired. The lean plan never says where a mutation proof, a
  red-before-green run, a bake's exit lines, or a `gate exit:` line is written. The `diff-reviewer`
  that reads PB-T1, PB-T5, PB-T8, and PB-T10 sees only the commit and the criteria, so it cannot
  confirm a quoted mutation proof that lives only in the session's transcript. Its definition says
  "Do not take a claimed ... test coverage at face value", so it will either `escalate` or accept
  without the evidence.
- **Fold:** Add to Conventions: "'The report' in an old Acceptance block means the task's commit
  message body. Each quoted proof (red run, mutation and revert, exit line, bake output) goes there,
  trimmed to the lines that show the result. The `diff-reviewer` dispatch quotes the same evidence
  block. The PR body's 'What landed' links each commit."

### 3. Major: off-lane tests have no command, so test-first proofs and greens go unevidenced

- **Location:** lean `:59-64`, `:148-151` (PB-T1), `:227` (PB-T9), `:239-241` (PB-T10).
- **Defect:** See "Key fact". PB-T1's test field names "Old Task 2's three test-first unit tests",
  which live in `packages/create-cairn-site/src/cloudflare/*.test.mjs` and run only under `npm test
  -w packages/create-cairn-site`. PB-T10's overlay cases, tree snapshot, and workerd guard live under
  `packages/cairn-cms-dev/src/` and are never a fast-lane input. PB-T9's integration cases run only
  in the `integration` project. Two of these tasks are `auth-data`, where the test-first lines bind.
  The fast lane goes green with none of these tests run, and the executor has to invent the command.
- **Fold:** Give each task an explicit beside-the-lane command, run through `cairn-run-gate`:
  PB-T1 `CAIRN_GATE_LANE=light cairn-run-gate 'npm test -w packages/create-cairn-site'` (`cairn-pass`
  rates it light); PB-T10 `cairn-run-gate 'npx vitest run --project unit packages/cairn-cms-dev/src'`;
  PB-T9 `cairn-run-gate 'npm run test:integration'`. State the general rule once in Conventions: a
  task whose Test field names a test the fast lane does not select runs that test file beside the
  lane, red first where test-first binds.

### 4. Major: PB-T3's A5 e2e spec and capture have no mechanism

- **Location:** lean `:156-159`, `:163`; old `:702-709`.
- **Defect:** Old Acceptance asks for a showcase e2e that "Fails today", plus "a capture of the 403
  page under each admin theme ... from the e2e run". The fast lane runs no e2e, so no e2e run
  exists to capture from. A committed spec that writes screenshots to `$HOME/.cache/...` would also
  write them on CI. The executor must choose a port, a lane, and a capture method on its own.
- **Fold:** Amend PB-T3: "Run the new spec once, red before the page exists and green after:
  `cairn-run-gate 'export E2E_PORT=4392 && ! ss -Htln \"sport = :4392\" | grep -q . && npm --prefix
  examples/showcase run test:e2e -- <spec> --retries=0'` (heavy lane). The captures come from a
  scratch Playwright script under `$HOME/.cache/engine-pre-2b-b/captures/`, not from the committed
  spec, at the fixture route under `data-theme` light and dark." Apply the same rule to PB-T10's
  notice capture (old `:1107-1108`), which already names `npm run dev` on an environment-variable
  port.

### 5. Major: the gate range's `<base>` is undefined

- **Location:** lean `:59-60`; the pair rule `:69-74`.
- **Defect:** "`--range <base>..HEAD`" never says what `<base>` is. With `origin/main` as the base,
  the range grows every task. By PB-T5 it holds `.github/workflows/publish.yml`, the root
  `package.json`, and the dev package's `tsconfig`, which are rerun triggers, so every later task
  runs the whole component project. With the task's parent as the base, each task gates its own
  diff. A pair merge commit makes this worse: `HEAD~1..HEAD` on a merge commit diffs the first
  parent only. `cairn-implementer` has the same gap.
- **Fold:** "`<base>` is the commit the task started from: `HEAD~1` for a one-commit task, and for a
  pair merge the commit the session dispatched the pair from. Each pair subagent uses its own
  worktree's starting commit."

### 6. Major: pair subagents can collide on shared records the agent definition tells them to write

- **Location:** lean `:69-74`, `:96-107`; `cairn-implementer.md` "The facts container".
- **Defect:** The seam probe covers each task's Files, but the `cairn-implementer` definition tells
  every implementer to "file its bullet in `docs/internal/facts/<arm>.md` in the same task", and
  `cairn-pass`'s close checklist puts behavior changes in `CHANGELOG.md`. PB-T7 (removes
  `FieldBehavior.itemLabel`, two composition throws) and PB-T8 (the sanitize floor) both change
  public behavior, so both may edit `docs/internal/facts/extend.md` or `CHANGELOG.md`. Either may
  also run `check:surface -- --update`, which rewrites `docs/internal/api-surface.md`, a file the
  plan gives to PB-T7 alone. The plan's "edits only its own Files" (`:72`) conflicts with the agent
  definition, and the definition is in the subagent's system prompt. Overlapping hunks are a merge
  conflict, and "A merge conflict stops the line".
- **Fold:** Add to the pair prompt: "Do not edit `docs/internal/facts/**`, `CHANGELOG.md`,
  `docs/extend/migration-notes.md`, or `docs/internal/docs-friction-log.md`. Put the facts bullet,
  the changelog line, and any friction in your final report. The session files them after the
  merge, in its merge commit. Only PB-T7 runs `check:surface -- --update`; if PB-T8's change moves
  the surface, stop and report." Name `subagent_type: "cairn-implementer"`. Its frontmatter pins
  Sonnet at medium, which satisfies the "names a model and an effort" rule.

### 7. Major: Decisions and ruled copy do not reach the reviewer or the pair prompt

- **Location:** lean `:65-67`, `:70-71`; old `:108-115` (the retired mapping that carried them).
- **Defect:** The old runner sent the reviewer "the task's Outcome block, then its Acceptance block,
  then the full text of every Decision the task cites". The lean plan quotes only Outcome and
  Acceptance. That leaves out PB-T1's Decisions 5, 9, 10, and 12, PB-T4's Decision 2, PB-T9's
  Decision 6, and PB-T10's Decisions 1 and 3 with fork 1. Without Decision 5, a reviewer reads the
  narrowed grep as an unmet spec post-condition. Without Decision 10, the unedited transcripts look
  like a miss. Without Decision 3, the reviewer cannot judge the notice's gating. Each of these is
  an `escalate`, which is a stop.
- **Fold:** "Every `diff-reviewer` and pair dispatch quotes the task's Outcome, Acceptance, this
  plan's amendments, and the full text of each Decision and ruling the old task cites, all
  verbatim."

### 8. Major: PB-T1 does not say what happens to the WIP's edits outside both tasks' Files

- **Location:** lean `:136-146`; WIP `dbdc4556`.
- **Defect:** `git show --stat dbdc4556` touches files in neither old Task 1's nor old Task 2's
  Files: `docs/internal/facts/admin.md`, `docs/internal/facts/extend.md` (Task 11's per old
  `:1134`), `packages/create-cairn-site/bin.mjs`, `packages/create-cairn-site/src/money.mjs`,
  `src/tests/unit/audit/own-tree-and-guidance.test.ts`, and
  `templates/waymark/worker-configuration.d.ts`. "Read the WIP against both tasks' Acceptance and
  finish what it lacks" says nothing about keeping or reverting these, and the `diff-reviewer` bar
  makes "the diff reaches beyond what was asked" an `escalate`.
- **Fold:** List them in PB-T1's Files as WIP carry: keep each one Old Task 2's grep or Old Task 1's
  emission needs, and name it in the commit body. Revert any other, or keep it and disclose it. The
  facts edits stay, and PB-T11's triage counts them.

### 9. Major: binding Acceptance sentences that name retired machinery

The "binds by reference" scheme leaves these sentences inside binding Files or Acceptance blocks
with no lean amendment. Each needs one dated amendment line under its lean task.

| Old line | Sentence | What the executor cannot tell | Proposed amendment |
| --- | --- | --- | --- |
| `:616` (T1) | "The showcase e2e, which still covers Signups, stays green as part of F." | F is retired. Is a local e2e owed? | "Met by CI's e2e on the pushed head; no local run." |
| `:663` (T2) | "CI `create-site` on the segment push green." | No segments exist, and no task waits for CI. Does PB-T1 wait? | "CI `create-site` green on PB-T1's pushed commit, read by the background watch; PB-T3 does not wait for it." |
| `:657-659` (T2) | "the conductor files them ... at the S1 checkpoint" | Already amended at lean `:142-144`. | None. |
| `:777-778` (T4) | "the showcase e2e build resolves `dist/`" | Which build? No e2e runs locally. | "`npm --prefix examples/showcase run build` after `npm run package`; quote the resolved file from the build's module graph or `realpath`." |
| `:779-780` (T4) | "Replay both locally, and confirm on CI at the boundary." | No boundary. | "... and on CI's `e2e` and `scaffold` runs for PB-T4's pushed commit." |
| `:835` (T5) and the `e2e.yml` steps | The replays write to `/tmp/dev-fold-*` (`e2e.yml:81-82,129-131`). | Old Global constraints ban `/tmp`. | "Replay with `--outdir` under `$HOME/.cache/engine-pre-2b-b/`." |
| `:889`, `:929` (T7, T8 Files) | "(the S3 pre-flight names it)", "(the S3 pre-flight names the file)" | No S3 pre-flight. Lean names T7's module (`:202-203`), but not T8's manifest-build file. | PB-T0 names D6's file and records it under PB-T8 (see finding 12). |
| `:890-891` (T7 Files) | "and wherever the fixed screen ids live" | Not a path. PB-T0 cannot check it, and the pair seam depends on it. | PB-T0 names the file. |
| `:911-912` (T7) | "(F's e2e, or E plus a composition smoke ...)" | Lean drops F but not E, and leaves "composition smoke" undefined (finding 10). | Covered by finding 10. |
| `:1106` (T10) | "The showcase e2e suite stays green on `'fixtures'`, admin-visual baselines unchanged." | Local or CI? Admin-visual baselines are CI-canonical. | "Met by CI's `e2e` on PB-T10's pushed commit." |
| `:1185` (T11) | "read from this plan's Ledger (Task 0)" | Lean `:25-26` retires "Ledger" while `:16-17` binds its Task 0 entry. | Lean `:25-26`: "Ledger (as a checkpoint log; its Task 0 entry stays as a read-only record)". |
| `:1201-1202` (T11) | "leaves at the close (step 9), since Task 11 can run before Task 10" | Old Close numbering. | "PB-C item 7 removes it." |
| `:1230` (T11) | "The computed gate green; `check:close` green." | Is the whole `npm run check:close` owed locally, at about one build plus every static check, or only the fast lane's label subset? | Recommend: "`check:close` green on CI's `test` job for PB-T11's pushed commit; locally only the fast lane." |
| `:250` (Global constraints, "Friction") | "`pass-execute` asks for it and returns it in `outOfScope` tagged `cairn: true`." | The runner is gone, and this bullet binds the pair prompt. | "Every dispatch reports friction in its final report; the session files it in the branch's friction log." |
| `:393-394` (Rulings, Copy) | "the conductor pastes each into its task's `notes`" | Lean PB-T10 quotes its string, but PB-T3 says only "the ruled copy" (`:156`). | Quote A5's three 403 strings and three 404 strings verbatim in PB-T3. |

### 10. Major: PB-T7's "composition smoke over both adapters" is undefined and can pass vacuously

- **Location:** lean `:205-206`.
- **Defect:** "a composition smoke over both adapters, quoted" names no command. A smoke that only
  imports `cairn.config.ts` would pass without composing. Composition runs inside the Vite plugin's
  verify path during a build.
- **Fold:** "After `npm run package`: `npm --prefix examples/showcase run build` exits 0, and a fresh
  emission under `$HOME/.cache/engine-pre-2b-b/` runs `npm run build` and exits 0; quote both exit
  lines." If either adapter needs an edit (a concept id now reserved), PB-T7 stops and reports: that
  edit would break the pair seam and the serial `emit:template` rule (`:105-107`).

### 11. Major: the score has no per-task timing data, and the clock file is deleted

- **Location:** lean `:75-78`, `:281-285`.
- **Defect:** This is "the first pass scored on the new process" (`:3-4`), yet each `pass-task-clock`
  file is removed at its task's end. Nothing records a task's start, end, or estimate, so the
  "Work and review" and "Fix rounds and reds" rows cannot be derived. `cairn-run-gate --records
  <toplevel> <branch>` reads only the session's branch. The pair subagents' gate runs record under
  their own worktree branches and drop out of "Gates on the critical path". The clock's start
  ("PB-T0's first commit") is also not tied to a command.
- **Fold:** "Before removing the clock file, append `task=<id> start=<epoch> end=<epoch>
  estimate=<min> fixes=<n>` as a `Pass-Clock:` trailer on the task's commit (or to the PR body
  draft). PB-C derives the rows from `git log --format=%B` plus `cairn-run-gate --records` over the
  session's branch and both pairs' branches. The clock start is `git log -1 --format=%ct` of PB-T0's
  commit."

### 12. Major: PB-T0's re-check has no artifact, so it can pass vacuously

- **Location:** lean `:116-118`, `:127-130`.
- **Defect:** A dated amendment is written only "Where one moved". If nothing moved, nothing shows
  that the re-check ran, and the acceptance tests only ancestry, `realpath`, and the PR. The pair
  seams (`:96-107`) and D6's home rest on these line claims. The old plan made the S3 pre-flight
  decide D6's file; the lean plan defers it to PB-T8's subagent mid-pair (`:104-106`). Finding out
  there costs a full pair round before the serial fallback.
- **Fold:** PB-T0 acceptance: "the plan gains one dated line per task, `Re-checked at <sha>: holds`
  or the moved fact, plus a line naming D6's home file and T7's fixed-screen-id file. If D6's home
  is a PB-T7 file, the Order runs PB-T7 and PB-T8 serially from the start."

### 13. Major: the resume convention breaks on a relaunch

- **Location:** lean `:57-58`; prompt `:2-4`.
- **Defect:** The prompt's first act is `EnterWorktree` with `name: engine-pass-b`, and the tool
  "creates a new git worktree ... on a new branch" (the `EnterWorktree` contract). After a crash,
  a worktree and branch of that name already exist. The create either fails, or starts a fresh
  branch from `main` whose `git log` holds no task ids. "Finds the done tasks with `git log
  --oneline`" then finds none. The tool's documented resume form is `path`.
- **Fold:** Prompt: "If `.claude/worktrees/engine-pass-b` exists (`git worktree list`), call
  EnterWorktree with `path` set to it instead of `name`, and skip PB-T0's merge if `git merge-base
  --is-ancestor dbdc4556 HEAD` already exits 0." A related risk, not probed: the process spec says a
  `--bg` session isolates itself unless "already inside a linked git worktree" (spec Execution item
  1), while `EnterWorktree` refuses to create a worktree from inside a worktree session. Add: "If
  `git rev-parse --git-dir` differs from `--git-common-dir`, you are already in a worktree; skip
  EnterWorktree."

### 14. Major (over-ceremony): the close runs up to three CI cycles on its critical path

- **Location:** lean `:260-262`, `:270-271`, `:286`.
- **Defect:** Item 1 waits on CI, item 4 re-runs "the fast lane and CI", and items 6 to 8 commit
  STATUS, ROADMAP, and CHANGELOG, which moves the head again, so item 9 waits a third time. With the
  e2e job at 7m39s to 11m27s unsharded (`e2e.yml:28-32` on PR #112) plus queueing, that is roughly
  20 to 30 minutes of avoidable wait. The estimate leaves about 30 minutes of headroom under the
  9-hour test (finding 21). `pass-core` puts review beside CI, not after it.
- **Fold:** Reorder PB-C: (1) push the head and start the CI watch in the background; (2) run the
  consumer proof, the whole-branch review, and `visual-verifier` while CI runs; (3) one fix chain;
  (4) the smoke; (5) the close checklist, ledgers, and PR body in one commit; (6) one CI read on
  that final head, based on current `origin/main`; then ready and merge. That is one blocking CI
  read instead of three.

### 15. Minor: the launch does not check that step 2 merged

- **Location:** lean `:308-318`.
- **Defect:** The text says "once step 2's PR has merged", but the script does not check it. Without
  PR #112, `gate-tier.mjs --fast` is an unknown flag, which exits 2 with nothing on stdout (the
  script's header). Every task's gate then fails, and the line stops at PB-T1.
- **Fold:** Add `&& grep -q -- "'--fast'" scripts/checks/gate-tier.mjs` (or `gh pr view 112 --json
  state -q .state | grep -qx MERGED`) before `claude --bg`.

### 16. Minor: PB-C item 2's consumer proof deletes the showcase lockfile

- **Location:** lean `:263`; old `:1266-1268`.
- **Defect:** `rm -rf examples/showcase/{node_modules,package-lock.json}` followed by a "fresh
  install" re-resolves every range. The build then proves a different tree from CI's, and the
  worktree is left dirty: a regenerated lockfile the close commit might pick up, and a changed gate
  fingerprint.
- **Fold:** "`rm -rf examples/showcase/node_modules && npm ci --prefix examples/showcase`; the
  lockfile is never deleted."

### 17. Minor: PB-C item 9 does not re-check that `main` has not moved

- **Location:** lean `:286`, `:292`.
- **Defect:** Item 9 re-reads CI only "if the head moved". If `main` moved between item 1 and the
  merge, the green run's base is stale, which item 1 forbids. The acceptance's "on a run based on
  `origin/main`'s head" names no command.
- **Fold:** "Before `gh pr merge`: `git fetch origin && git merge-base --is-ancestor origin/main
  HEAD`; if it fails, merge `main` in, push, and read CI again."

### 18. Minor: ROADMAP entry named wrong

- **Location:** lean `:280`.
- **Defect:** On `dea73f7d` the Now entry is "**Engine pass B before stage 2b**" (`ROADMAP.md:311`),
  not "Engine pass before stage 2b". The numbered path item at `:289-291` ("Pass B runs next (the
  Now entry below)") would go stale.
- **Fold:** Name it exactly, and update `:289-291` to past tense.

### 19. Minor: "Fails today" status on ordinary tasks

- **Location:** lean `:65`, `:161`.
- **Defect:** The old Acceptance blocks carry "Fails today" clauses on ordinary tasks (PB-T6,
  PB-T7, PB-T9, A5). The lean plan binds test-first only on `auth-data` (and B2 and D2). It does
  not say whether these clauses must be shown, which leaves the executor to either skip them or
  spend time on them.
- **Fold:** "On an ordinary task, a 'Fails today' clause names why the test is not vacuous; showing
  the red run is optional. A test written after the code must still fail if the change is
  reverted, and the close review checks that."

### 20. Minor: check states not covered

- **Location:** old `:775-776` (check-dev-package), `:955-956` (C5), `:962-964` (D6), `:1004-1006`
  (D8a).
- **Defect and fold, one per check:**
  - `check-dev-package` (runner class): add a row for a `files` entry outside `dist/` and one for a
    missing `exports`.
  - C5 (`auth-data`): add a callback that returns nothing at all, or a non-array `tagNames` such as
    `null`. Each must throw naming `sanitizeSchema`, so the floor cannot fail open through a shape
    nobody tested.
  - D6: add a concept with two undeclared keys, which yields one warning naming both.
  - D8a: add `--fail-on` with no value, which is a usage error.

### 21. Minor: the clock total leaves almost no room for fix rounds

- **Location:** lean `:301-304`.
- **Defect:** The 510-minute critical path covers task work only. The spec prices "Fix rounds and
  reds" at 40 to 90 minutes on top, which leaves 30 minutes under the 9-hour test. The plan's 390
  non-close minutes also exceed the spec's lean pricing for gates, work, and CI combined (185 to 285
  minutes). The paragraph reads as more headroom than exists.
- **Fold:** State it plainly: "510 minutes plus the spec's 40 to 90 for fix rounds is 9.2 to 10
  hours; the success test holds only at near-zero fix rounds or with finding 14's reorder." No scope
  change.

### 22. Minor: PB-T0's 20-minute estimate is tight

- **Location:** lean `:132`.
- **Defect:** PB-T0 covers two `npm ci` runs, `npm run package`, the bake, `svelte-kit sync`, the
  merge, the re-check of every claim across 11 tasks, the PR, and closing #111. A clock stop at 40
  minutes is a likely attended event that predicts nothing.
- **Fold:** Set the estimate to 35, or drop the bake (finding 33).

### 23. Minor: `Backend.ephemeral` has an unnamed setter channel

- **Location:** old `:322-324`, `:1100-1103`.
- **Defect:** Decision 3 names the dev `'repository'` backend as the only setter and says
  `createGithubApp` never sets it. A site's own `BackendProvider` can also set it, since the member
  is public. The impact is only a stray notice, but the acceptance claims a production request
  "never carries it", which holds only for the engine's provider.
- **Fold:** Word the acceptance as "the engine's `github-app` provider never sets it", and add one
  line to the doc comment: a custom provider sets it only for a non-persistent store.

### 24. Minor: STATUS does not record the session at start

- **Location:** lean `:79-80`.
- **Defect:** `pass-core` "Execute" says "STATUS records the session's name and id". The plan writes
  STATUS only on a stop.
- **Fold:** PB-T0 writes the session name, id, and branch into STATUS in its commit.

### 25. Minor: the `visual-verifier` has no reference and no verdict path

- **Location:** lean `:268-269`.
- **Defect:** The A5 page and the notice are new, so no reference image exists. The plan does not
  say a STRUCTURAL verdict enters item 4's fix chain (old Close step 5 did).
- **Fold:** "The reference is `admin-design-system.md`'s `alert` and error recipes plus a capture of
  an existing admin page under the same theme. A STRUCTURAL verdict enters item 4."

### 26. Minor: the smoke's executor is unnamed

- **Location:** lean `:272-273`; old `:1305` ("the smoke agent").
- **Fold:** "The session runs the smoke itself" (or names the subagent type and model).

### 27. Minor: PB-T1's red-first runs name no command

- **Location:** lean `:139-141`.
- **Fold:** "Red run: `node --test packages/create-cairn-site/src/cloudflare/<file>.test.mjs` with
  the source hunk reverted by `git stash push -- <source file>`, then `git stash pop`." This folds
  into finding 3.

### 28. Minor: PB-T5's marker replays depend on PB-T0's re-location

- **Location:** lean `:169-171`, `:193-194`.
- **Defect:** The plan says PB-T0 "re-located" the steps but asks PB-T0 for no output naming them.
- **Fold:** PB-T0 records the `e2e.yml` and `scaffold.yml` line ranges of both replay steps in its
  amendment.

### 29. Minor: the pair clock-file start time is underspecified

- **Location:** lean `:77-78`.
- **Fold:** "Record the dispatch epoch before dispatching (`date +%s`), and write the clock file with
  that `start=` once the pair returns."

### 30. Minor: the PR body needs one PR-ready timestamp

- **Location:** lean `:284`, `:286`.
- **Defect:** The score states the clock "to PR-ready", but `gh pr ready` runs after the body is
  written.
- **Fold:** "Compute the clock at item 8, run `gh pr ready` immediately after, and edit the body
  only if the gap exceeds 5 minutes."

### 31. Minor: escalate and missing-CI stops are only partly listed

- **Location:** lean `:81-84`.
- **Defect:** A `ci-green` exit 2 (missing), and an exit 3 whose local fallback goes red, are not
  named as stops. The old battery stand-down (old `:443`) is dropped without saying so.
- **Fold:** Add "a `ci-green` exit 2 that a re-push does not clear, and a red local full gate on
  exit 3" to Stops, and either keep the battery stand-down or retire it explicitly.

### 32. Minor (over-ceremony): pairs run the fast lane three times on one heavy lock

- **Location:** lean `:69-74`; `gate-tier.mjs` `FAST_LINE_1_LANE = ''` (heavy).
- **Defect:** Each pair subagent runs the full fast lane (its definition demands it). The session
  then runs it again on the merge. Line 1 is heavy-lane, so the two subagents' runs serialize on
  the lock: two pairs cost about four extra heavy runs and give back much of the pair's
  parallelism.
- **Fold:** The pair prompt overrides the definition: "Run `npm run check` and your task's own test
  files only; the session runs the fast lane once on the merge."

### 33. Minor (over-ceremony): PB-T0 runs CI preparation steps for a gate the pass no longer runs

- **Location:** lean `:122-124`.
- **Defect:** The template bake and `npm run package` existed so the local F could run (old
  `:493-499`). The fast lane's close runner builds `dist` itself (`pass-gate-tiers.md:117-118`).
  The bake feeds only the `create-cairn-site` suite, which is off the lane and needs the bake only
  when finding 3's PB-T1 command runs.
- **Fold:** Keep `npx svelte-kit sync` (the unit project's `check-public-skill.test.ts` needs it).
  Move the bake to PB-T1, just before its `create-cairn-site` run, and drop the root
  `npm run package` from PB-T0.

### 34. Minor: the risk class holds, with one note

- **Location:** lean `:42-46`.
- **Finding:** The declared classes match `cairn-pass`'s path map: PB-T1 by
  `packages/create-cairn-site/src/cloudflare/**` and `**/admin/signups/**` (the template's deleted
  route), PB-T10 by `src/lib/github/**` and `**/hooks.server.ts`, and PB-T4 by `scripts/checks/**`
  and `.github/workflows/**`. One unflagged change: PB-T7's shared reserved set now drives
  `admin-dispatch.ts`'s routing. If the refactor drops a member, a concept could shadow an engine
  view. The class stays `ordinary` by the map, but the close review's brief should name it.
- **Fold:** Add "the dispatcher's reserved set is a superset of the old `RESERVED_SEGMENTS`" to the
  close review's brief.

## What holds

- Every task carries outcome, files, risk class, acceptance, test, and a clock estimate. The sum
  (565) and the critical path (510) check out.
- The merge ruling, the PR #111 close, the push target, and the prohibition on pushing `main` are
  stated consistently in the plan and the prompt.
- The `auth-data` task reads, `RUN_GATE_IF_BUSY` never on `auth-data`, the clock-file location
  (matches `claude-clock-stop`'s `rev-parse --absolute-git-dir`), and `worktree.baseRef: "head"`
  (set at `~/.claude/settings.json:156`) all match `pass-core`.
- The Decision 12 move to `CHANGELOG.md` and the PR body, and the stale-transcript filing, are clean
  amendments.
- No CI workflow sets `concurrency` with cancel-in-progress, so pushing after every task cannot
  cancel an earlier commit's run into a false red.
