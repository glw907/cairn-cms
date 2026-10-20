# Engine pass B lean plan: data integrity and failure-risk review

Lens: data integrity and failure risk (crash, concurrency, partial write, resume, merge). Target:
`docs/plans/2026-10-10-engine-pass-b-lean.md` (cited as `lean`) and its prompt
(`prompt`) at `18cd15db`, with `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` (cited as
`old`). Read-only: no tracked file edited, nothing committed, no gate run.

## State probed (2026-10-10)

- `engine-pre-2b-b` is `ahead 2` of `origin/engine-pre-2b-b`. The remote, and PR #111's head, sit at
  `1ce14d3b`. Both the WIP `dbdc4556` and the plan commit `18cd15db` exist only in this one local
  worktree.
- `main` has no branch protection (`gh api .../branches/main/protection` returns 404) and no
  rulesets. Auto-merge is off and `allow_update_branch` is false. So `gh pr merge --merge` merges
  whatever the head is, whatever CI says, onto whatever `main` is at that moment. Every merge
  precondition is enforced only by the session.
- `ci-green` checks the head SHA's runs. It does not check whether the run's base is still
  `origin/main`'s head (the header at `~/.local/bin/ci-green:5-8` uses the merge base only to pick
  the expected set). With `--wait` it reruns an infrastructure red once.
- `claude agents --json` lists active sessions only, not completed ones. `jq -e` exits 4 on empty
  input and 5 on garbage. Both are non-zero, so the launch's `|| { ... }` goes ahead and launches.
- `EnterWorktree` with `name` creates a **new** worktree. Re-entering an existing one takes `path`.
  `ExitWorktree remove` refuses when the branch holds commits that are not on the original branch,
  unless `discard_changes: true` is passed.
- The WIP touches paths outside old Tasks 1 and 2's Files:
  `packages/create-cairn-site/src/money.mjs` (user-facing copy), and
  `src/tests/unit/audit/own-tree-and-guidance.test.ts`, which relaxes the fence normalizer so that
  fences already opening with `<script>` skip the prefix.
- Other sessions change `docs/STATUS.md` on `main` often: eight commits in the recent log.
- `publish.yml` triggers only on `release` and `workflow_dispatch`, so the PB-C merge cannot publish.
- `channel-db.ts` uses `DatabaseSync(':memory:')`. Apart from the overlay itself, the dev package
  writes no SQLite file.

## Findings, ranked by consequence

### B1 (blocker). A stop is not durable, and nothing mechanical blocks the merge on an open stop

- **Location.** `lean:79-84` (Stops), `lean:39-41` (an open stop blocks the merge), `lean:286-295`
  (item 9 and the acceptance), `prompt:8-9` (arm the API-drop wake-up).
- **Defect.** A stop rewrites STATUS, notifies, and "waits", which in a `--bg` session means it
  ends its turn. The prompt also arms the `/loop` fallback wake-up. Per
  `unattended-work-guards.md`, each tick "resumes at the first task whose acceptance fails". A
  deliberate stop looks exactly like a halted run. The next tick resumes:
  - After a review `escalate` or a standing `fix`, the resume re-runs the task's acceptance,
    including "`diff-reviewer` returns `accept`". That re-rolls the reviewer until it accepts.
  - After a red the session could not fix in two attempts, it tries a third time.

  The clock stop re-fires through its hook only while the clock file stays. No other stop leaves a
  machine-readable mark. "An open stop blocks the merge" has no check anywhere, and the PB-C
  acceptance has no line for it. An unattended executor can therefore get past its own auth-data
  stop and merge.
- **Fold.**
  - A stop writes `$(git rev-parse --absolute-git-dir)/pass-stop`, holding the task, the reason,
    and the one question. It also commits and pushes the STATUS rewrite.
  - Every wake-up tick and every resume checks for that file first. While it is present, the tick
    only re-notifies and ends the turn.
  - Only Geoff's reply clears the file. The resume prompt Geoff sends names the clearing.
  - PB-C item 9 runs `test ! -e "$(git rev-parse --absolute-git-dir)/pass-stop"` immediately before
    `gh pr merge`, and the PB-C acceptance gains the same line.
  - State in Stops that a resumed auth-data task never re-dispatches `diff-reviewer` on an unchanged
    commit to overturn a standing verdict.

### B2 (blocker). The WIP lands in PB-T0's merge commit, so PB-T1's auth-data read and fast lane miss most of Tasks 1 and 2

- **Location.** `lean:113-116`, `lean:136-149`, `lean:59-61`, `lean:65-67`. The spec's rollout step
  5 requires "Its WIP ... is re-gated through the fast lane; Task 2 gets the `auth-data` read".
- **Defect.** PB-T0's `git merge --no-ff engine-pre-2b-b` commits `dbdc4556`'s 34 files, the
  provisioning code in `packages/create-cairn-site/src/cloudflare/**` among them, into the PB-T0
  merge. PB-T1's commit then carries only the finishing delta. Two checks see only that delta:
  - "`diff-reviewer` ... reads the commit". The reviewer never sees the bulk of the WIP's auth-data
    code, or its out-of-Files test relaxation.
  - The fast lane's `--range <base>..HEAD`. `<base>` is defined nowhere in the plan. If it is
    PB-T0's commit, the classifier sizes the gate from the delta and under-selects the legs.

  PB-T0 is classed `ordinary` and is reviewed by no one. The close review is a backstop, but the
  plan's own PB-T1 acceptance can pass without the WIP ever having been read or gated.
- **Fold.**
  - Define `<base>` once in Conventions: the previous task's commit. For PB-T1 only, it is
    `PB-T0^1`, the `main` tip that PB-T0 merged onto, so the range carries the WIP and the delta.
  - PB-T1's `diff-reviewer` reads `git diff PB-T0^1..<PB-T1 sha> -- <old Task 1 and 2 Files>`,
    plus every other path the WIP touched, quoted with the criteria.
  - PB-T1's Outcome lists each WIP path outside old Tasks 1 and 2's Files (see m2) and either
    justifies it or reverts it.

### M1 (major). The merge preconditions are prose, and GitHub enforces none of them

- **Location.** `lean:260-262`, `lean:286-288`, `lean:292-295`.
- **Defect.** With no branch protection, the session's checks are the only gate, and they have
  these gaps:
  - **No head pin.** `gh pr merge <n> --merge` takes no `--match-head-commit`. A push after the
    CI read (a second session on the branch, or the session's own late commit) merges unread.
  - **Base check not mechanical.** "The run's base must be `origin/main`'s current head" is never
    given as a command, and `ci-green` does not check it.
  - **The fresh base check comes too early.** Item 9 re-reads CI only "if the head moved". If
    `main` moves between item 1 and item 9 while the head stays put, GitHub merges a combination
    nobody tested. A pull_request run tests the merge ref from the moment of the push.
  - **Open blockers allowed.** The acceptance's "or each finding is dispositioned in the PR body"
    lets a blocking auth-data finding be dispositioned as "Found, not done" and merged.
  - **Missing checks.** Nothing checks for a clean tree, `mergeable`, `isDraft=false`, or B1's
    stop marker.
  - **After the fact.** The PB-C acceptance checks `state == MERGED` after the merge, which proves
    nothing about the preconditions.
- **Fold.** Make item 9 one fixed sequence that stops on the first failure:
  1. `git status --porcelain` prints nothing.
  2. `test ! -e .../pass-stop`.
  3. `git fetch origin && git merge-base --is-ancestor origin/main HEAD`.
  4. `git rev-parse HEAD` equals `gh pr view <n> --json headRefOid -q .headRefOid`.
  5. `ci-green "$sha" --pr <n> --wait` exits 0.
  6. `gh pr view <n> --json mergeable,isDraft` shows `MERGEABLE` and `false`.
  7. `gh pr merge <n> --merge --match-head-commit "$sha"`.

  Replace "or each finding is dispositioned" with "no blocking finding stands. Each non-blocking
  finding is dispositioned, and a blocker's fix carries a second review whose verdict is
  `accept`".

### M2 (major). `main` moving during the close is unbounded, conflicts are unhandled, and the close can clobber other sessions' STATUS

- **Location.** `lean:260-262` (merge it in, push, read again), `lean:278-280` (STATUS rewrite),
  `lean:286`, `lean:115-116` (a conflict rule only at PB-T0).
- **Defect.**
  - **No bound.** In an 8.5-hour run, other cairn sessions land on `main`, and each landing forces
    a merge-in and a full CI cycle.
  - **Conflicts.** PB-C names no conflict rule. PB-T0's "STATUS takes `main`'s side, anything else
    stops" does not carry over.
  - **Stale proofs.** A merge-in that touches auth-data paths makes the whole-branch review and the
    live smoke stale. Item 9 then re-reads only CI.
  - **STATUS overwrite.** Item 7 rewrites `docs/STATUS.md` wholesale on the branch, and the merge
    carries it to `main`. Lines another initiative added to `main`'s STATUS during the pass are lost
    silently. A conflict-free merge-in does not protect them, because the rewrite happens after the
    merge.
- **Fold.**
  - Put one conflict rule in Conventions for every merge of `main`: a hand merge of STATUS that
    keeps both sides' lines, and any other conflict stops the line.
  - Item 7 edits the merged STATUS and changes only pass B's lines. It never rewrites from a
    template.
  - Bound the item 1 and item 9 loop at two merge-ins, then stop.
  - If `git diff --name-only <old base>..origin/main` hits a `cairn-pass` auth-data glob, re-run the
    live smoke and the review over that range only, or stop (see the owner fork below).
- **OWNER FORK. Merging when `main` moved into auth-data paths during the close.** Options:
  - (a) Stop and ask.
  - (b) Re-run the whole-branch review and the smoke on the merged head, then merge.
  - (c) Merge on CI green alone.

  Recommendation: (a) for a conflict, (b) for a clean merge-in that touches an auth-data glob, and
  (c) otherwise.

### M3 (major). The resume path breaks on the first relaunch, and PB-C has no item-level resume

- **Location.** `lean:57-58`, `prompt:2-4`, `lean:257-297`.
- **Defect.**
  - **Name collision.** "A relaunch with the same prompt" calls `EnterWorktree` with
    `name: engine-pass-b`, but `.claude/worktrees/engine-pass-b` already exists. `name` only
    creates, and `path` enters an existing worktree. The likely outcomes are an error, or a fresh
    worktree from `main` that redoes PB-T0, opens a second draft PR, and strands the first branch's
    commits.
  - **Warm edits.** The crashed self's uncommitted edits are not addressed. The workstation rule
    reads warm edits as stop-and-investigate, and the guards doc says keep-or-revert.
  - **Stale clock.** A leftover `pass-task-clock` from before the crash fires a clock stop at once.
    `pass-core` says a resume rewrites `start=`, but the plan's Resume line omits it.
  - **Orphaned pairs.** A crash while a pair runs leaves `worktree-agent-*` branches with
    PB-T4, PB-T6, PB-T7, or PB-T8 commits. `git log` on the session branch cannot see them, so the
    resume re-dispatches duplicates.
  - **PB-C crash.** PB-C is one 120-minute task with nine items. A crash between `gh pr ready` and
    `gh pr merge` restarts at "the first task whose acceptance fails", which is PB-C item 1: the
    review, the smoke, and the fix chain run again. Nothing tells the resume to read
    `gh pr view --json state,mergeCommit` before it issues anything.
- **Fold.** Write the Resume line out as steps:
  1. If `.claude/worktrees/engine-pass-b` is in `git worktree list`, call `EnterWorktree` with
     `path`. Otherwise call it with `name`.
  2. `gh pr list --head <branch>` finds the PR. Never open a second one.
  3. If `git status --porcelain` is non-empty, `git stash push -u -m resume-<task>`, never discard,
     then judge the stash against the in-flight task's acceptance.
  4. Rewrite the clock file's `start=`.
  5. `git branch --list 'worktree-agent-*'`, filtered by task-id subjects. Merge those branches
     before re-dispatching anything.
  6. In PB-C, mark each completed item with a PR comment (`PB-C.<n> done`) or a commit subject.
     The resume starts at the first unmarked item and reads PR state before any merge call.

  Name the prompt file as the relaunch prompt, with this branch logic in it.

### M4 (major). The plan and the WIP have one copy, and the launch reads an uncommitted working copy

- **Location.** `lean:113-116`, `lean:306-322`, `prompt:5-8`.
- **Defect.**
  - **One copy.** `dbdc4556` and `18cd15db` exist only in `.claude/worktrees/engine-pre-2b-b`.
    Nothing pushes them before launch, so a stray `git worktree remove --force`, a branch delete,
    or a disk fault loses the WIP and the plan.
  - **Working copy, not the tip.** The prompt reads the plan from that worktree's working copy,
    while PB-T0 merges the branch tip. This review's fold, and two sibling reviews, are about to
    edit that file. If any fold is uncommitted at launch, the session executes a plan its own branch
    does not carry. After PB-T0 it re-reads the committed copy, which differs.
  - **No executor or warm-edit check.** The launch keys only on a session name. It runs no
    `pgrep` for `engine-pre-2b-b`, no `git status` of that worktree, and pins no SHA. The old
    Task 0 item 1 made these checks, and the lean plan dropped them.
- **Fold.**
  - Before launch, `git -C .claude/worktrees/engine-pre-2b-b push origin engine-pre-2b-b`. This
    updates PR #111, which is closed later anyway, and puts every commit on GitHub.
  - Add three lines to the launch chain:
    - `[ -z "$(git -C .claude/worktrees/engine-pre-2b-b status --porcelain)" ]`.
    - `! pgrep -af '[e]ngine-pre-2b-b'`.
    - `[ "$(git rev-parse engine-pre-2b-b)" = "$(git rev-parse origin/engine-pre-2b-b)" ]`.
  - PB-T0 merges `origin/engine-pre-2b-b`, named by the SHA the prompt records, not the local name.
  - The prompt reads the plan with `git show <sha>:docs/plans/...`, or from its own
    worktree after PB-T0.

### M5 (major). Fail-proofs and mutation proofs revert by a method that can wipe uncommitted task edits

- **Location.** `lean:139-141` (revert the WIP's source change, quote, restore), `lean:65-66`, and
  every "mutation proof ... quoted, reverted" (old Tasks 2, 5, 8, and 10).
- **Defect.** The obvious mechanics, `git checkout <rev> -- <file>` to revert and
  `git checkout -- <file>` to restore, silently overwrite uncommitted edits in the same file. In
  PB-T1 the session is finishing the WIP in exactly those source files. The likely result is a
  partial write: the finishing edits vanish, and the test still passes against the WIP.
- **Fold.** One Conventions line:
  - Run a fail-proof or a mutation proof only on a clean tree, after the task's commit. Mutate,
    quote the red, then `git checkout HEAD -- <file>`, and confirm `git diff --quiet`.
  - Alternatively, run the proof in a scratch worktree under `$HOME/.cache/engine-pre-2b-b/`.
  - For PB-T1, run the reverted-source proof in a scratch worktree at `PB-T0^1` with only the new
    tests applied.

### M6 (major). The PB-T10 tree snapshot can pass vacuously

- **Location.** `lean:230-242`, and the acceptance at `old:1080-1083`. Paths resolve against
  `process.cwd()` (`old:1065`).
- **Defect.** "Identical before and after" proves nothing in either of two cases:
  - **Wrong cwd.** If the handle resolves against a `process.cwd()` that is not the temp tree, a
    write lands in the repo or the runner's cwd while the temp-tree snapshot stays identical.
  - **Silent failure.** If a step in the sequence (save, delete, rename, branch, publish, Settings,
    nav, media) fails or no-ops, nothing was written, so of course the tree is unchanged.

  The snapshot also covers only the temp tree. A write to `os.tmpdir()`, `.svelte-kit`, or the cwd
  escapes it.
- **Fold.** Acceptance additions:
  - The test asserts `process.cwd() === <temp root>`, or the handle's resolved root equals it,
    during the sequence.
  - Each step asserts its effect through a read-after-write before the final snapshot: the save
    shows, the delete tombstones, the rename moves, and the publish updates the overlay manifest.
  - The snapshot fixture names its state: at least two entries, the manifest, `site.config.yaml`,
    and `media.json`.
  - A static check: `git grep -nE 'writeFile|appendFile|mkdir|rm\(|rmSync|rename|unlink|copyFile|createWriteStream|truncate' -- packages/cairn-cms-dev/src ':!*.test.ts'`
    prints nothing beyond named, pre-existing hits.

### M7 (major). The baseline CI read and the inherited-red set are gone, and PB-T0's push carries ungated WIP

- **Location.** `lean:127-130`. Old Task 0 items 5 and 6 (`old:524-532`) and the old stop "a red
  baseline gate" (`old:434`) are retired at `lean:25-27` without replacement.
- **Defect.**
  - **PB-T0's first CI run.** The first push opens the draft PR, and its CI runs on `main` plus the
    ungated WIP. "A red stops the line" (`lean:63-64`). A WIP red at PB-T0, which is likely, either
    stops a task whose own work is only a merge, or gets waved through with no rule.
  - **No baseline.** No read on `main`'s head records which reds `main` already carries after step
    2. A pre-existing red then stops PB-T1 and gets blamed on it.
- **Fold.**
  - PB-T0 reads `ci-green` on `origin/main`'s head and records the result as the inherited set.
  - PB-T0's own CI read is informational, quoted into PB-T1's criteria, and does not stop the line.
    PB-T1's push is the first binding read.
  - A red the baseline carries does not stop the line, and the PR body lists it.

### M8 (major). The launch neither checks that PR #112 merged nor fails closed

- **Location.** `lean:308-319`.
- **Defect.**
  - **No #112 check.** "Once step 2's PR has merged" is prose. Launched early, the session builds on
    a `main` that lacks the `--fast` flag and the `e2e.yml` shard. PB-T0's re-check then amends the
    plan against the wrong `main`, and the PB-T4 and PB-T5 replays use the wrong steps.
  - **Fails open.** `claude agents --json | jq -e ...` goes ahead and launches when `claude agents`
    errors (jq exits 4 or 5), so it can start a second `engine-pass-b` beside a live one.
- **Fold.**
  - Add `[ "$(gh pr view 112 --json state -q .state)" = MERGED ] &&` to the chain.
  - Capture `out=$(claude agents --json) && jq -e 'type == "array"' <<<"$out" >/dev/null`, then
    test the name, so a failed listing aborts the launch.
  - Add `[ -z "$(git status --porcelain)" ]` for the main checkout, the workstation's warm-edit
    signal.

### M9 (major). Both members of a pair can write the friction log, so the pair merge conflicts and stops

- **Location.** `lean:32-34` (friction goes to the branch's log), `lean:69-74`, and the `lean:96-107`
  seam list.
- **Defect.** Conventions tell every task to file friction in `docs/internal/docs-friction-log.md`.
  Two pair subagents that both find friction both append to that file, and the merge conflicts. "A
  merge conflict stops the line" turns a predictable collision into an attended stop. The seam
  probe covers code paths only.
- **Fold.** Pair subagents return friction in their report and never edit the friction log. The
  session files both reports after the merge. Add the friction log, `CHANGELOG.md`, and
  `docs/internal/api-surface.md` to the seam check: only one pair member may touch each, and only
  PB-T7 writes `api-surface.md`.

### m1 (minor). The battery stand-down was dropped

- **Location.** The old stop "the battery stand-down at 11 percent" (`old:443`) has no successor in
  `lean:79-84` or in the prompt's guard list (`prompt:8-9`).
- **Defect.** The lease holder releases its inhibitor at 10 percent, so the machine suspends with
  the in-flight task uncommitted. That loses wall-clock time, not data, since every task pushes.
- **Fold.** Add "at 11 percent battery on no mains, WIP-commit, write STATUS, and stop" to Stops,
  and name it among the prompt's guards.

### m2 (minor). The WIP holds edits outside old Tasks 1 and 2's Files

- **Location.** `lean:136-146`.
- **Defect.** `money.mjs` changes user-facing copy that is checked under `check:transcripts` and
  the fixtures, and `own-tree-and-guidance.test.ts` loosens a test normalizer. PB-T1 says to "read
  the WIP against both tasks' Acceptance" but not to check its Files scope.
- **Fold.** PB-T1's Outcome adds: `git diff --name-only 1ce14d3b dbdc4556` compared against old
  Tasks 1 and 2's Files. Each extra path is justified in the commit body, or reverted. The test
  relaxation is quoted to the reviewer.

### m3 (minor). Decision 12's window needs a remedy and a home where it executes

- **Location.** `lean:47-48`, `lean:143-144`.
- **Defect.** The CHANGELOG `## Unreleased` entry and the PR body are the right places for
  consumers to find it. One sentence that names only the window still leaves an affected site with
  a Signups route reading a missing table and no fix. HISTORY's "wrong to rediscover" role has moved
  to executing homes (spec, rollout step 2), and the plan names none: a later pass that edits
  `MIGRATION_DATABASES` would not see it.
- **Fold.** The sentence names the remedy: run
  `npx wrangler d1 migrations apply APP_DB --remote` from the site, whose `migrations-app/` it
  still holds. Add a one-line comment at `MIGRATION_DATABASES` stating the accepted window, with no
  plan or task numbers. Alternatively, add a ROADMAP watch to retire after the next release.

### m4 (minor). PB-T5 flag channels: `envDir` divergence and malformed values

- **Location.** `lean:187-197`, and the old Task 5 outcome at `old:808-813`.
- **Defect.**
  - **The `envDir` channel.** The hook reads `.env*` from `process.cwd()`, while Vite reads them
    from `config.envDir` (default `root`). For a site that sets `envDir` or a non-cwd `root`, the
    engine's flag channel differs from the site's own env channel. One direction is fail-open: a
    stray `.env.production` in cwd sets the flag for a site that believed its env lived elsewhere.
    The define the site already set, which wins in either order, is also a channel, and it should be
    named in `vite.md`.
  - **Malformed values.** No row covers `VITE_CAIRN_E2E=true`, `=0`, or an empty value under
    `build`.
- **Fold.**
  - Either read from `config.envDir ?? config.root ?? process.cwd()`, a method call to state in an
    amendment, or keep cwd and document the divergence.
  - Add the rows `VITE_CAIRN_E2E=true`, `0`, and empty, each giving `false`.
  - Each case clears the variable with `vi.stubEnv`, so the `.env.production` case cannot pass on a
    leaked process environment.

### m5 (minor). PB-T10's `content` option has no malformed-value or leftover-`seedContent` behavior

- **Location.** `old:1052-1054`.
- **Defect.**
  - **Typo.** A JS consumer's `content: 'fixture'` falls to whichever branch the implementation
    makes the default.
  - **Leftover `seedContent`.** A site still passing `seedContent: true` silently gets
    `'repository'` mode: real content, no seed. Neither case writes to disk, so the integrity risk
    is low. The cost is confusing developer experience.
- **Fold.** A value other than the two literals throws at construction, naming the allowed values.
  The `Consumers must:` clause already covers `seedContent`. Optionally, warn once when the key is
  present.

### m6 (minor). Per-task CI exits 2 and 3 have no rule

- **Location.** `lean:62-64`, `lean:260-262`.
- **Defect.** Only PB-C names exit 3. For a task's CI watch, the plan gives no rule for "missing"
  (exit 2) or "unavailable" (exit 3).
- **Fold.** One line: exit 2 counts as a red. Exit 3 is re-read at the next push and does not stop
  the line. At PB-C, exit 3 means the local full gate per `cairn-pass`.

### m7 (minor). The stop record is hard to find and may be lost

- **Location.** `lean:79-81`.
- **Defect.**
  - **Hard to find.** STATUS is rewritten "on the branch", inside the session worktree, while
    Geoff reads `main`'s STATUS.
  - **Not committed.** The rewrite is never committed or pushed, so a crash after the stop loses it.
  - **No session id.** `pass-core` "Execute" says STATUS records the session's name and id, and the
    plan omits it.
- **Fold.** A stop commits and pushes the STATUS rewrite. The notify text names the worktree path
  and the PR number. PB-T0's first commit records the session name and id in STATUS.

### m8 (minor). Worktree removal at item 9 tempts `discard_changes`, and nothing cleans up `engine-pre-2b-b`

- **Location.** `lean:288`.
- **Defect.**
  - **The refusal.** `ExitWorktree remove` refuses when the branch has commits that are not on the
    original branch. The local `main` stays behind `origin/main` after a GitHub-side merge, so the
    refusal is guaranteed. The session will reach for `discard_changes: true`, a habit that destroys
    data on any earlier misstep.
  - **Cleanup.** Nothing assigns who removes the old `engine-pre-2b-b` worktree and branch.
- **Fold.** Item 9 uses `ExitWorktree keep` and leaves removal to the planning session. That
  session confirms `git merge-base --is-ancestor <head> origin/main` first, then removes both the
  pass worktree and `engine-pre-2b-b`. Add the cleanup to the STATUS next action.

### m9 (minor). A hung pair has no bound

- **Location.** `lean:75-78`. By design, `pass-core` gives pair worktrees no clock file.
- **Defect.** A stalled subagent holds the session indefinitely. The wake-up tick sees no dead run,
  and the clock hook is silent.
- **Fold.** The session watches the pair with a `Monitor` or a background `sleep` at twice the
  longer estimate. When it expires, the session checks the agent transcripts' mtimes and stops on a
  stall (`claude-wf-guard`'s idle rule).

### m10 (minor). PB-T0's merge-commit subject must carry the task id

- **Location.** `lean:54-58`, `lean:113`.
- **Defect.** `git merge --no-ff` defaults to "Merge branch 'engine-pre-2b-b'", which the
  `git log` resume scan cannot match to PB-T0.
- **Fold.** `git merge --no-ff -m "PB-T0: Merge engine pass B's plan, ledger, and WIP" <sha>`.

### m11 (minor, over-ceremony). The base-currency merge runs twice in the close

- **Location.** `lean:260-262`, `lean:286`.
- **Defect.** Item 1 merges a moved `main` and reads CI before the review. Item 4's fix chain then
  re-runs CI, and item 9 has to re-check the base anyway, so item 1's merge-in buys nothing that
  item 9 does not. Each merge-in is a full CI cycle on the critical path.
- **Fold.** Item 1 reads CI on the head with no base condition. The single base-currency check,
  with the merge-in and the M2 bound, sits in M1's item 9 sequence, after the last code change.

## Checks against the lens list

- **Risk-class fit.** It matches the `cairn-pass` path map. PB-T1 is auth-data through
  `packages/create-cairn-site/src/cloudflare/**`, `**/admin/signups/**`, and the showcase
  `wrangler.*`. PB-T10 is auth-data through `src/lib/github/**` and `**/hooks.server.ts`. PB-T5 is
  raised above the map, correctly. PB-T0 is labeled `ordinary`, but its merge commit carries
  auth-data paths: see B2.
- **Privileged-field channels.** PB-T5's process environment and `.env*` files are named, with the
  `envDir` gap in m4. The site define is named as winning. `Backend.ephemeral` affects only the
  display, and only the dev `'repository'` backend sets it. The owner-session mint is gated at
  compile time by PB-T5 and, in `'repository'` mode, by the workerd guard. Fixtures mode under
  workerd still mints, by design, for e2e.
- **Vacuous proofs.** The PB-T5 marker replay has a positive control (a flagged build carries a
  marker), which is good. The PB-T10 snapshot has the gap in M6.
- **Clock estimates.** Every task has one. 565 minutes in total and 510 on the critical path check
  out. The pair-merge plus fast-lane time is not budgeted, a small figure.

## Counts

Blocker 2 (B1, B2). Major 9 (M1 to M9). Minor 11 (m1 to m11, one of them over-ceremony). One owner
fork, under M2.
