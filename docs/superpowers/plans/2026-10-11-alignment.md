# cairn-cms alignment pass

Every lesson a cairn agent needs reaches it through a file it reads, no file a cairn session loads
teaches retired process, and the repo carries only live worktrees. Process: `cairn-pass`, which
loads `pass-core`. Design approved by Geoff on 2026-10-11:
`docs/superpowers/specs/2026-10-11-alignment-design.md` (items 1 to 9 below are its numbered
changes). Evidence: `~/.dotfiles/docs/superpowers/research/2026-10-11-cairn-cms-alignment-audit.md`,
with Geoff's rulings at its end. No separate spec: the design is a page (`spec-plan-review`, "Depth
scales with risk"). Plan review: the mechanics lens and the fold,
`docs/superpowers/research/2026-10-11-alignment-review-mechanics.md` and
`docs/superpowers/research/2026-10-11-alignment-fold.md`.

## Ruled for this pass

- **Risk class: `runner`.** AL-T5 edits a workstation agent and skill; every other task is
  `ordinary`. No `live-account` flag: no task provisions a Cloudflare, GitHub, or npm resource.
- **Merges.** The executor opens the cairn-cms PR and the dotfiles PR and merges neither. Geoff reads
  and merges both.
- **Friction-log triage at the close.** `cairn-pass`'s close checklist triages the whole log. This
  pass triages only the entries it touches or files (AL-T3); the rest wait for the ROADMAP
  restructure pass after docs stage 2b, which owns tier placement. Reason: the design puts the
  ROADMAP tiers out of scope, and a whole-log triage promotes entries into them.
- **Line numbers** below were probed at `13c91280f` (the design commit, whose tree is `main`
  `b4cc3381a` plus two plan-directory files) and match the audit. Each task re-reads its lines
  before editing; a moved line is edited where it now sits, and a vanished one is named in the
  commit body.

## Conventions every task follows

- **Task fields.** Outcome, files, risk class, acceptance, test, and clock in minutes. A task is done
  only when its acceptance passes.
- **Commits.** One commit per task, subject starting with the task id (`AL-T3: Align STATUS,
  ROADMAP, and the friction log`). Imperative mood, specific files, never `git add -A`. The body
  carries the task's evidence and ends with `Pass-Clock: task=<id> start=<epoch> end=<epoch>
  estimate=<min> fixes=<n>`, read from the clock file before it is removed.
- **Command forms.** The executor is a worktree-isolated background session. Its harness refuses a
  `git` command that `cd`s to a computed path or reaches another tree through a shell variable, and
  allows `git -C <literal absolute path> ...` (probed 2026-10-11: `git -C` reads and a
  `worktree remove` both ran). Write every command against another tree with a literal path, one
  command per call. If the harness still refuses an act outside the worktree, put the exact command
  in the PR body's `Found, not done` as a "now" item and go on.
- **Roots.** Backups go to `/var/home/glw907/.local/share/cairn/backups/2026-10-11-alignment/`
  (called `BK` below; spell it out in commands). Scratch, including the PR body draft
  `pr-body.md`, goes to `/var/home/glw907/.cache/cairn-alignment/`.
- **Gates.** Each cairn-cms task runs the fast lane: `node scripts/checks/gate-tier.mjs --fast
  --range <base>..HEAD` prints the legs, each run through `cairn-run-gate` per `cairn-pass`.
  `<base>` is `HEAD` at the task's start, written as a fourth clock-file line `base=<sha>`. A pair's
  base is the commit it was dispatched from.
- **Clock.** At each task start the session writes `pass-task-clock` in `git rev-parse
  --absolute-git-dir` (`task=`, `start=`, `estimate=`, `base=`) and removes it at the task's end,
  per `pass-core`. The pair's clock is a background `sleep` of twice the pair estimate (120 minutes,
  7200 seconds) started at dispatch; if it exits before both agents return, that is the pair's clock
  stop.
- **Pairs.** AL-T2 and AL-T3 go to two Agent-tool subagents, `subagent_type: "cairn-implementer"`
  (Sonnet at `medium`), with `isolation: "worktree"`, dispatched after AL-T1's commit. Each prompt
  quotes its task block from this plan verbatim, the two Anthropic scope samples from the launch
  prompt, and these overrides of the agent definition: "Skip the setup command; this task edits
  markdown only. Do not run the fast lane; run your task's acceptance checks. Do not read or write
  agent memory. Edit only your Files. Put your evidence in your commit body, commit once, and never
  push." The session merges both branches, runs the fast lane, pushes, then `git worktree remove`s
  both pair worktrees and `git branch -d`s their branches. A merge conflict is a stop.
- **Pushes and CI.** Push `worktree-alignment-pass` to `glw907/cairn-cms` after every cairn-cms
  task, then start `ci-green <sha> --pr <n> --wait > /var/home/glw907/.cache/cairn-alignment/ci-<sha>.log 2>&1`
  as a background Bash task, re-issued on 75, never piped (a pipe reports the pipe's exit code, the
  friction-log lesson at `docs-friction-log.md:76`). Exit 0 is green, 1 red, 2 missing (one re-push
  may clear it), 3 unavailable (re-read at the next push). No task waits for CI before the next; a
  red stops the line. Never push `main`.
- **Stops.** A fired clock stop; a red the session cannot fix in two attempts; a merge conflict; a
  finding that would change the approved design; a deletion whose dry-run list shows something the
  plan does not expect (a worktree with uncommitted work it does not name, a branch with commits not
  on `main` it does not name); or battery at 11 percent off mains. A stop writes
  `$(git rev-parse --absolute-git-dir)/pass-stop` (task, what failed, the one question), puts the
  same three facts in the branch's `docs/STATUS.md`, commits and pushes that as `Record a stop in
  STATUS (<task>)`, runs `notify-send -u normal "cairn alignment stopped at <task>: PR #<n>; resume:
  claude attach cairn-alignment"`, and ends the turn. Every wake-up tick first runs `test -e
  "$(git rev-parse --absolute-git-dir)/pass-stop"` and ends the turn if the file exists. Only a turn
  answering Geoff's go-on removes it.
- **Resume.** A relaunch runs the launch prompt again. It finds the PR with `gh pr list --head
  worktree-alignment-pass --state all` (never a second PR), merges any `worktree-agent-*` branch
  whose commits carry AL-T2 or AL-T3 before re-dispatching that task, and starts at the first task
  whose acceptance fails (task ids are in commit subjects).
- **PR body.** Fixed `##` sections in this order: `What landed` (task id, commit), `Dotfiles PR`,
  `Lesson fold` (AL-T2's disposition counts), `Deletions` (each dry-run list's path in `BK`),
  `Review`, `End-to-end check`, `Retried tests`, `Found, not done` (each with now, defer, or drop
  and a one-line reason), and `Score`. Publish with `gh pr edit <n> --body-file`.

## Order

AL-T0, then AL-T1. Then AL-T2 and AL-T3 run as a pair; while they run, the session runs AL-T4 and
then AL-T5, which touch nothing in the cairn-cms repo. When the pair returns, the session merges it,
then runs AL-T6 and AL-C.

The pair seam: AL-T2 writes `docs/internal/durable-gotchas.md` and deletes
`examples/showcase/.claude/agent-memory/**`; AL-T3 writes `docs/STATUS.md`, `ROADMAP.md`,
`docs/internal/docs-friction-log.md`, `CLAUDE.md`, `docs/HISTORY.md`, `docs/internal/README.md`,
`docs/internal/feedback/README.md`, and deletes `docs/internal/dx-backlog-ecnordic-migration.md`.
No path is shared and neither task generates output.

## Tasks

### AL-T0. Re-entry

- **Outcome.** The session is in worktree `alignment-pass` on branch `worktree-alignment-pass`, made
  from local `main`, with `origin/worktree-alignment` merged in by `git merge --no-edit
  origin/worktree-alignment` (this plan, its launch prompt, the design, and the plan review). The
  adapter's setup ran: `npm ci && npm ci --prefix examples/showcase`. One line in the branch's
  `docs/STATUS.md` names the session (`cairn-alignment`, its id from `claude agents --json`) and the
  branch. Commit as `AL-T0: Merge the alignment plan and record the session`, push, and open the
  draft PR against `main` in `glw907/cairn-cms`.
- **Files.** `docs/STATUS.md` (one line).
- **Risk.** `ordinary`.
- **Acceptance.** `git merge-base --is-ancestor origin/worktree-alignment HEAD` exits 0; `realpath
  examples/showcase/node_modules/@glw907/cairn-cms` prints a path under the worktree; the draft PR
  exists.
- **Test.** None.
- **Clock.** 15.

### AL-T1. Back up and list everything the pass deletes outside git

- **Outcome.** Before any deletion, `BK` holds:
  - `agent-memory-main/`: `cp -a` of
    `/var/home/glw907/Projects/cairn-cms/.claude/agent-memory/cairn-implementer/` (53 files: 52
    lessons and `MEMORY.md`).
  - `class-b/<worktree>/`: the 14 class-B lesson files, each copied from
    `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/<worktree>/.claude/agent-memory/cairn-implementer/`:
    `cairn-tool-a` (`go-tool-gate-gotchas.md`); `chassis-b` (`multi-worktree-test-contention.md`,
    `standalone-capture-tool-server-recipe.md`, `full-bleed-band-inside-sticky-footer-shell.md`,
    `inline-style-margin-zero-beats-layered-primitive-gap.md`,
    `tailwind-v4-layer-order-beats-layered-component-rule.md`); `doctor-records`
    (`worktree-full-gate-setup.md`); `draft-docs-2a` (`vitest-esm-import-gotcha.md`,
    `worktree-showcase-sync.md`, `svelte-check-heap.md`); `draft-docs-a` (`go-tool-gotchas.md`);
    `draft-docs-harvest` (`harvest-audit-tooling.md`, `delete-and-relink-gotchas.md`);
    `identity-seam` (`check_symbols_allowlist_false_positives.md`). The audit's "13" undercounts
    its own per-worktree figures, which sum to 14.
  - `auto-memory/`: `cp -a` of `/var/home/glw907/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/`
    (nine files).
  - `strays/`: the `--cwd` file from `.claude/worktrees/`; `docs-reset-dryrun.patch`, from `git -C
    <literal path> diff HEAD` plus each untracked file it lists; and the untracked capture spec from
    each of `polish-11b-i` and `polish-11b-ii`.
  - `worktrees.txt`, the dry-run list: one row per linked worktree from `git worktree list
    --porcelain` with its path, branch, tip SHA, class (A, B, C, D, E, keep, or this pass), the
    action AL-T6 takes, `git -C <path> status --porcelain`, and `git log --oneline main..<branch>`
    for every branch AL-T6 deletes with `-D`. The classes are the audit's table. Rows for
    `experiment-screen`, `alignment-pass`, `alignment`, and `alignment-design` say what AL-T6 does
    with each (see AL-T6). The session prints the file.
  - `scratch.txt`: `ls -la` of `.claude/worktrees/cairn-scratch/` (six tarballs).

  A row that does not match the audit (a class-A worktree that is no longer clean, a new worktree,
  a branch with commits the audit does not name) is a stop.
- **Files.** None in the repo.
- **Risk.** `ordinary`.
- **Acceptance.** `find BK/agent-memory-main -name '*.md' | wc -l` prints 53; `find BK/class-b
  -name '*.md' | wc -l` prints 14; `ls BK/auto-memory | wc -l` prints 9; `worktrees.txt` has one
  row per line of `git worktree list` other than the main checkout; the commit body (an
  `--allow-empty` commit `AL-T1: Record the alignment backups`) quotes those four counts and `BK`'s
  path.
- **Test.** The counts are the test.
- **Clock.** 15.

### AL-T2. Fold the implementer lessons into `durable-gotchas.md` (design items 1 and 7, pair with AL-T3)

- **Outcome.** Every lesson in `BK/agent-memory-main/`, `BK/class-b/`, and the six lesson files
  under `examples/showcase/.claude/agent-memory/cairn-implementer/` gets one disposition, recorded in
  the commit body as a table (file, disposition, the `durable-gotchas.md` heading it landed under or
  the reason it was dropped):
  - **Fold** a lesson that is still true at `HEAD` (grep for each file, script, flag, or symbol it
    names) and would cost the next implementer time. Write it as a `##` entry in the shape of the
    existing ones: what goes wrong, why, and what to do, in a few short paragraphs. Merge lessons
    that share a cause into one entry, and fold a lesson that repeats an existing entry (for
    example `fresh-worktree-needs-npm-ci.md` against "A fresh worktree needs CI's setup", or
    `svelte-check-oom-heap.md` against "`npm run check` runs out of memory") into that entry.
  - **Drop** a lesson that teaches retired process (`pass-end-ritual-rebase.md`,
    `pass-end-main-drift-heading-anchor.md`, conductor, ledger, or HISTORY ritual), records task
    state or one pass's history, or names code that no longer exists.
  - The `npm test` pipe lesson (`gate-package-race.md:19-26`, `gate-pipestatus-sh-not-bash.md`) is
    folded as one entry that says never to pipe a gate or `npm test` through `tail`, and that the
    workstation's `claude-tail-guard` PreToolUse hook blocks the piped form.

  Also: `durable-gotchas.md:95` ("full record in `docs/HISTORY.md` (the doctor-retirement pre-task
  entry)") is repointed to `docs/superpowers/plans/2026-09-21-doctor-pretask.md` if that plan
  holds the record (grep it for `Cannot connect`); otherwise it names `docs/HISTORY.md` as the
  frozen record. The intro's "The first five entries are indexed from `CLAUDE.md`" stays true.
  `git rm -r examples/showcase/.claude/agent-memory`. The main checkout's store is deleted in AL-T6,
  after this fold merges.
- **Files.** `docs/internal/durable-gotchas.md`; `examples/showcase/.claude/agent-memory/**`
  (deleted).
- **Risk.** `ordinary`.
- **Acceptance.** The disposition table has 72 rows (52 + 14 + 6) and no file without a
  disposition; `grep -n 'tail' docs/internal/durable-gotchas.md` shows the pipe entry; `git ls-files
  examples/showcase/.claude | wc -l` prints 0; each folded entry's named paths exist at `HEAD`.
- **Test.** The acceptance greps; the session's fast lane after the pair merge.
- **Clock.** 60.

### AL-T3. Align STATUS, ROADMAP, the friction log, and the side docs (design items 3 to 7, pair with AL-T2)

- **Outcome.**
  - **STATUS** (item 4 and item 7). `:3` becomes "Present tense only; history lives in git and PR
    bodies, orientation in `CLAUDE.md`." Remove the gate-economy narration (`:19-22`, "**The
    per-task gate is now targeted.**"), the merged-worktree cleanup line (`:34-35`; PR #113 merged as
    `b4cc3381a`), and the dotfiles items (`:42-43`, from "Dotfiles:" through "the facts README.").
    The per-version-record rule moves to `cairn-pass` in AL-T5. Keep AL-T0's session line.
  - **ROADMAP** (item 3). `:10-13`: the shipped-history sentence names git, PR bodies, and
    `docs/STATUS.md`, not post-mortems. `:444-446`: replace the "**Current step:** finishing stage
    2a's close (`.../2026-10-07-2a-close-finish.md`)" clause so it agrees with STATUS: stage 2b is
    next. Nothing else in ROADMAP changes.
  - **Friction log** (item 5). `:33-34`: shipped detail lives in git, PR bodies, and
    `docs/STATUS.md`, not post-mortems. `:78` (the HISTORY "failing step" field): reword so the
    field is asked of the PR body's score or the CI record, since HISTORY is frozen, or delete the
    entry if no live home fits. Delete `:76` (the `ci-green` pipe lesson, now enforced by
    `claude-tail-guard`) and `:79` (`cairn-run-gate` per-leg timing, a dotfiles tool request). Delete
    `### Triage record` and `## Clearings` (`:81-320`, which takes `:268` with it). The file then ends
    after the Repo tooling group.
  - **Side docs** (item 6). Add a `CLAUDE.md` pointer to `docs/internal/public-design-system.md`
    beside "Admin interface design" (public theme work) and one to `docs/internal/code-idioms.md`
    under "Authoring" (code idioms), one sentence each. Move each live item of
    `docs/internal/dx-backlog-ecnordic-migration.md` into the friction log's Open findings as a
    ``- **`perspective`.**`` bullet naming the finder and date (`cairn-pass` close checklist),
    verified against the code first; an item already shipped or overtaken is dropped and counted in
    the commit body. Delete the file and repoint its two inbound links
    (`docs/internal/README.md:57`, `docs/internal/feedback/README.md:16`). `grep -rn
    dx-backlog-ecnordic docs CLAUDE.md README.md` then hits only `docs/internal/history/**` and
    `docs/HISTORY.md`, which are frozen.
  - **HISTORY** (item 7). `docs/HISTORY.md:5-6`: replace the dead "(`~/.claude/CLAUDE.md`, "Project
    ledgers")" citation with `pass-core` "Ledgers". No other HISTORY edit.
- **Files.** `docs/STATUS.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md`, `CLAUDE.md`,
  `docs/HISTORY.md`, `docs/internal/README.md`, `docs/internal/feedback/README.md`,
  `docs/internal/dx-backlog-ecnordic-migration.md` (deleted).
- **Risk.** `ordinary`.
- **Acceptance.** `grep -n 'post-mortem' docs/STATUS.md docs/internal/docs-friction-log.md CLAUDE.md`
  and `sed -n 1,14p ROADMAP.md | grep -n post-mortem` print nothing; `grep -n 'HISTORY' docs/STATUS.md`
  prints nothing; `grep -c '^## Clearings\|^### Triage record' docs/internal/docs-friction-log.md`
  prints 0; `grep -n 'public-design-system\|code-idioms' CLAUDE.md` shows both pointers; `test ! -e
  docs/internal/dx-backlog-ecnordic-migration.md`; `wc -l < docs/STATUS.md` prints 60 or less; the
  commit body counts the backlog items moved and dropped.
- **Test.** The acceptance greps; the session's fast lane after the pair merge.
- **Clock.** 40.

### AL-T4. Cut the project auto-memory (design item 2; session, during the pair)

- **Outcome.** In `/var/home/glw907/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/`,
  after AL-T1's backup: delete `plan-for-long-unattended-runs.md` and its `MEMORY.md` line. Cut
  `pairs-by-default.md`, `docs-rebuild-not-edit.md`, and `docs-intros-need-framing-step.md` to the
  ruling's why, 10 body lines or fewer each, keeping the frontmatter. In each, a "How to apply" line
  points at the file that executes the rule (`pass-core` "Pairs"; `docs-page-chain.js` and
  `cairn-docs-drafter.md`), and every `[[link]]` names a memory that exists. Fix
  `front-load-into-infrastructure.md:21`'s `[[style-guide-sync]]` to name the ruling's real home
  (`docs/internal/docs-register.md`) in prose. Update the `MEMORY.md` hooks for the cut files.
- **Files.** The auto-memory directory only (outside git; the backup is `BK/auto-memory/`).
- **Risk.** `ordinary`.
- **Acceptance.** `ls` prints eight files; each cut file's body after the frontmatter is 10 lines or
  fewer; `grep -o '\[\[[^]]*\]\]'` over the directory names only existing slugs; the retired-phrase
  grep in AL-C item 3 finds nothing here. The evidence lands in AL-T6's commit body (this task has no
  repo commit); its `Pass-Clock:` trailer goes there too.
- **Test.** The acceptance checks.
- **Clock.** 15.

### AL-T5. The dotfiles PR (design items 1, 4, and 8; session, during the pair)

- **Outcome.** `git -C /var/home/glw907/.dotfiles fetch origin`, then `git -C
  /var/home/glw907/.dotfiles worktree add -b cairn-alignment
  /var/home/glw907/.dotfiles/.claude/worktrees/cairn-alignment origin/main`. In that worktree:
  - `claude/.claude/agents/cairn-implementer.md`: delete `memory: project` (`:7`). In "Escalation and
    memory" (`:81-86`), retitle the section "Escalation" and replace the memory-directory sentences
    with: read `docs/internal/durable-gotchas.md` for the area the task touches before starting, and
    put any new gotcha in the final report for the session to file there.
  - `claude/.claude/skills/cairn-pass/SKILL.md`: delete "The `--fast` flag lands in rollout step 2."
    (`:24`). Add the rule STATUS drops (STATUS:42-43) to the per-version-record bullet (`:72-74`):
    moving a per-version record updates `cairn-pass`, `CLAUDE.md`, and the facts README.

  Run `bash /var/home/glw907/.dotfiles/.claude/worktrees/cairn-alignment/scripts/check.sh` (it
  `cd`s to its own root). Commit both files as one commit, push `cairn-alignment` to
  `glw907/dotfiles`, and open a PR against `main` whose body names the cairn-cms PR. Never merge it.
  If `gh pr list -R glw907/dotfiles --state open` shows a PR touching either file, name it in both
  PR bodies.
- **Files.** The two dotfiles files above, in the dotfiles worktree only.
- **Risk.** `runner`.
- **Acceptance.** `check.sh` exits 0 (quoted in the dotfiles commit body); `grep -n
  'memory: project\|agent-memory' .../agents/cairn-implementer.md` prints nothing; `grep -n
  'durable-gotchas' .../agents/cairn-implementer.md` shows the pointer; `grep -n 'lands in rollout'
  .../skills/cairn-pass/SKILL.md` prints nothing; the PR exists and is open.
- **Test.** `check.sh`.
- **Clock.** 20.

### AL-T6. Remove the dead worktrees and stores (design items 1 and 9)

- **Outcome.** After the pair merge (`git merge --no-ff -m "AL-T2, AL-T3: Merge the pair branches"`
  for each branch, then the fast lane over the dispatch commit, then a push), and with AL-T1's
  backups confirmed present:
  1. Re-print the dry-run list (`git worktree list`, and `git -C <path> status --porcelain` for each
     row AL-T6 acts on) and compare it to `worktrees.txt`. A difference is a stop.
  2. Classes A, B, and D (35 worktrees): `git worktree remove <path>`, then `git branch -d <branch>`
     for A and B and `git branch -D <branch>` for D (`gate-related`, `theme-b-plan`), whose content
     landed on `main` by other commits.
  3. Class C: `git -C <gate-tier-tool path> checkout -- package-lock.json`, then remove it and
     delete its branch like class A. For `polish-11b-i` and `polish-11b-ii`, compare each untracked
     capture spec against the committed specs under `examples/showcase/e2e/` (test titles and the
     routes it captures). Covered: `git worktree remove --force` (the spec is in `BK/strays/`) and
     `git branch -d`. Not covered: keep the worktree and name it in `Found, not done`.
  4. Class E, by Geoff's ruling: `draft-docs-plans` and `engine-pre-2b-a-fix2` are removed with
     `git branch -D`; `docs-reset-dryrun` with `git worktree remove --force` (its patch is in
     `BK/strays/`) and `git branch -D`. `experiment-screen` stays.
  5. The planning worktrees: remove `alignment-design` (its branch stays until this PR merges). Leave
     `alignment` if `git worktree list` marks it locked and name its remove command in `Found, not
     done`; otherwise remove it, keeping its branch.
  6. `rm -r /var/home/glw907/Projects/cairn-cms/.claude/worktrees/cairn-scratch`, `rm --
     '/var/home/glw907/Projects/cairn-cms/.claude/worktrees/--cwd'`, `rm -r
     /var/home/glw907/Projects/cairn-cms/.claude/agent-memory/cairn-implementer` (folded in AL-T2,
     backed up in AL-T1), then `git worktree prune`.

  Remote branches are left alone. Every tip SHA is in `worktrees.txt`, so a deleted branch can be
  restored with `git branch <name> <sha>` until `git gc` prunes it.
- **Files.** None in the repo. The commit `AL-T6: Record the worktree cleanup` (`--allow-empty`)
  carries the evidence for AL-T4 and AL-T6.
- **Risk.** `ordinary`.
- **Acceptance.** `git worktree list` shows the main checkout, `experiment-screen`,
  `alignment-pass`, and only the worktrees step 3 or step 5 kept, each named in `Found, not done`;
  `test ! -e` holds for `cairn-scratch`, `--cwd`, and the main checkout's
  `.claude/agent-memory/cairn-implementer`; the commit body quotes the before and after `git
  worktree list | wc -l`.
- **Test.** The acceptance checks.
- **Clock.** 20.

### AL-C. Close

- **Outcome.** In order, per `pass-core` "Close" and `cairn-pass`:
  1. **Beside CI.** One whole-branch review: `diff-reviewer` at whole-branch scope (`model: "opus"`,
     effort `medium`). No `cairn-pass` checklist glob matches this diff, so it loads none. Its brief
     is this plan and the design, and it also reads the dotfiles PR's diff (`gh pr diff <m> -R
     glw907/dotfiles`) against AL-T5. No `visual-verifier` (no rendered UI) and no admin smoke (no
     `auth-data` path).
  2. **One batched fix chain** for blocking findings and reds, each quoted verbatim (location,
     finding, and fix) as its acceptance, then the fast lane and a push. A fix to the dotfiles PR is
     committed and pushed on `cairn-alignment`, with `check.sh` rerun.
  3. **The end-to-end check** (the design's). (a) Dispatch one Agent-tool subagent,
     `subagent_type: "cairn-implementer"`, `isolation: "worktree"`, with the prompt "Skip the setup
     command and edit nothing. Read `docs/internal/durable-gotchas.md` and quote the entry that
     says whether to pipe `npm test` through `tail`." Its quote goes in `End-to-end check`. (b) Run
     `grep -n -F -f <(grep -v '^#' /var/home/glw907/.dotfiles/claude/.claude/tooling/retired-phrases.txt | grep .)`
     and `grep -n -i 'post-mortem'` over `CLAUDE.md`, `docs/STATUS.md`,
     `docs/internal/docs-friction-log.md`, `ROADMAP.md` lines 1 to 14 (via `sed -n 1,14p`), and the
     auto-memory directory; both print nothing. Each `HISTORY` hit in those files calls it frozen.
     (c) `git worktree list` matches AL-T6's acceptance. Remove the subagent's worktree and branch
     after it returns.
  4. **The `cairn-pass` close checklist.** No public behavior changed, so no facts bullet,
     `CHANGELOG.md` line, reference page, or surface update. The friction log is triaged per "Ruled
     for this pass". Nothing is released.
  5. **Ledgers.** In `docs/STATUS.md`: remove AL-T0's session line, keep stage 2b as the next action,
     and add one line that the alignment PR and the dotfiles PR wait for Geoff's read. Present tense,
     60 lines or fewer. Commit as `AL-C: Close the pass records`, push, and start the watch.
  6. **The PR.** The body follows Conventions. `Found, not done` carries at least these, each with a
     proposed disposition: the `cairn-docs-outline` lock and the `gateMatches` doc comment
     (STATUS:42-43, both dotfiles; propose defer to the dotfiles backlog); `cairn-run-gate` per-leg
     timing (friction `:79`; propose defer, same home); the ROADMAP HISTORY citations at `:438`,
     `:445`, `:456`, `:477`, and `:1788` (propose defer to the ROADMAP restructure pass); and any
     kept worktree or refused command from AL-T6. `Score` carries the spec's rows (Gates on the
     critical path, Work and review, CI waits on the path, Fix rounds and reds, Close, Total), with
     gate time from `cairn-run-gate --records <toplevel> worktree-alignment-pass`, task rows from the
     `Pass-Clock:` trailers, and the clock from AL-T0's commit time to `gh pr ready`. When
     `ci-green` on the final head exits 0: `gh pr ready <n>`, then `gh pr view <n> -R
     glw907/cairn-cms --web` and `gh pr view <m> -R glw907/dotfiles --web`, `notify-send -u normal
     "cairn alignment: PRs #<n> and dotfiles #<m> ready to read"`, ExitWorktree with `action:
     "keep"`, and end. Never merge either PR.
- **Files.** The fix chain's files and `docs/STATUS.md`.
- **Risk.** `runner` (the pass's class).
- **Acceptance.** `ci-green` exit 0 on the final head; the review's blocking findings are fixed or
  overruled with a reason in `Review`; the three end-to-end results are quoted; `gh pr view <n>
  --json isDraft -q .isDraft` prints `false`; both PRs are open and unmerged; `test ! -e
  "$(git rev-parse --absolute-git-dir)/pass-task-clock"`.
- **Test.** The end-to-end check.
- **Clock.** 30.

## Budget

Task minutes: 15 + 15 + 60 + 40 + 15 + 20 + 20 + 30 = 215, against the design's 150 and the 300
stop line. With the pair, the clock path is about 15 + 15 + 60 + 20 + 30 = 140 minutes plus CI
waits at the close.

## Later

Not built in this pass:

- The ROADMAP tier restructure and whole-log friction triage (Geoff's ruling: its own pass after
  docs stage 2b), including ROADMAP's live HISTORY citations.
- The dotfiles items STATUS drops (`cairn-docs-outline`'s lock, `gateMatches`' doc comment) and the
  `cairn-run-gate` per-leg timing request.
- Remote branches of the removed worktrees.
