# cairn-cms alignment pass

Every lesson a cairn agent needs reaches it through a file it reads, no file a cairn session loads
teaches retired process, and the repo carries only live worktrees. Process: `cairn-pass`, which
loads `pass-core`. Design approved by Geoff on 2026-10-11:
`docs/superpowers/specs/2026-10-11-alignment-design.md` ("item N" below is its numbered change N).
Evidence: `~/Projects/cairn-cms/docs/superpowers/research/2026-10-11-cairn-cms-alignment-audit.md`, with
Geoff's rulings at its end. No separate spec: the design is a page (`spec-plan-review`, "Depth
scales with risk"). Plan review: the mechanics lens and the fold,
`docs/superpowers/research/2026-10-11-alignment-review-mechanics.md` and
`docs/superpowers/research/2026-10-11-alignment-fold.md`.

## Ruled for this pass

- **Risk class: `runner`.** AL-T4 edits a workstation agent and skill; every other task is
  `ordinary`. No `live-account` flag: no task provisions a Cloudflare, GitHub, or npm resource.
- **Merges.** The executor opens the cairn-cms PR and the dotfiles PR and merges neither. Geoff reads
  and merges both, the dotfiles PR first (see AL-C item 3).
- **Friction-log triage at the close.** `cairn-pass`'s close checklist triages the whole log. This
  pass triages only the entries the design names and the ones AL-T2 files. A whole-log triage is
  work beyond the design, which the planning prompt sends to "Later"; it is listed in the PR body's
  `Found, not done`.
- **Line numbers** below were probed at `13c91280f` (the design commit, whose tree is `main`
  `b4cc3381a` plus two plan-directory files) and match the audit. Each task re-reads its lines
  before editing; a moved line is edited where it now sits, and a vanished one is named in the
  commit body.
- **A seventh memory store**, which the audit missed:
  `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/.claude/agent-memory/cairn-implementer/`
  (six lessons and a `MEMORY.md`, 2026-09-24). It is backed up, folded, and removed with the others.
  The audit's "13" class-B files undercounts its own per-worktree figures, which sum to 14.

## Conventions every task follows

- **Task fields.** Outcome, files, risk class, acceptance, test, and clock in minutes. A task is done
  only when its acceptance passes.
- **Commits.** One commit per task, subject starting with the task id (`AL-T2: Align STATUS,
  ROADMAP, and the friction log`). Imperative mood, specific files, never `git add -A`. The body
  carries the task's evidence and ends with `Pass-Clock: task=<id> start=<epoch> end=<epoch>
  estimate=<min> fixes=<n>`, read from the clock file before it is removed.
- **Command forms.** The executor is a worktree-isolated background session. Probed 2026-10-11 from
  a cairn-cms worktree:
  - Refused: `git -C <a sibling cairn-cms worktree> ...`, and `cd <sibling> && git ...` ("redirects
    git to the shared checkout"). Also refused as "too complex to verify": `for` loops, heredocs,
    and commands that reach a path through a shell variable.
  - Allowed from the session's own worktree: `git worktree list`, `git worktree remove <literal
    path>`, `git branch`, `git cherry main <branch>`, and `git log <branch>`, since branches are
    shared refs. Allowed: `git -C /var/home/glw907/.dotfiles ...` and `git -C <the dotfiles
    worktree> ...`, because the guard covers only the launch repo. Plain `cp`, `tar`, `rm`, `ls`,
    and `find` on literal paths.

  So: one plain command per call, literal absolute paths, and intermediate output written to a
  scratch file rather than piped into a substitution. If the harness refuses an act outside the
  worktree that this plan needs, and the act is not a deletion, put the exact command in the PR
  body's `Found, not done` as a "now" item and go on. A refused backup is a stop.
- **Roots.** Backups go to `/var/home/glw907/.local/share/cairn/backups/2026-10-11-alignment/`
  (written `BK` below; always spelled out in commands and in the pair prompt). Scratch, including
  the PR body draft `pr-body.md` and the CI logs, goes to `/var/home/glw907/.cache/cairn-alignment/`.
- **Gates.** Each cairn-cms task whose range carries a changed path runs the fast lane: `node
  scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` prints the legs, each run through
  `cairn-run-gate` per `cairn-pass`. An `--allow-empty` commit (AL-T5's) runs none; the classifier
  exits 1 on an empty range. `<base>` is `HEAD` at the task's start, written as a fourth clock-file
  line `base=<sha>`. The pair's base is the commit it was dispatched from.
- **Clock.** At each task start the session writes `pass-task-clock` in `git rev-parse
  --absolute-git-dir` (`task=`, `start=`, `estimate=`, `base=`) and removes it at the task's end,
  per `pass-core`. AL-T3 has no commit of its own, so the session writes its `Pass-Clock:` line to
  `/var/home/glw907/.cache/cairn-alignment/al-t3-clock.txt` before removing the file, and AL-T5's
  commit carries it. The session records `date +%s` at the pair's dispatch; if the pair returns more
  than 120 minutes later (twice its 60-minute estimate), that is the pair's clock stop.
- **Pairs.** AL-T1 and AL-T2 go to two Agent-tool subagents, `subagent_type: "cairn-implementer"`
  (Sonnet at `medium`), with `isolation: "worktree"`, dispatched in one message after AL-T0's commit.
  In a background session the Agent tool returns at once and notifies on completion (observed in
  the planning session, 2026-10-11), so the session runs AL-T3 and then AL-T4 while the pair works.
  If a dispatch blocks instead, run AL-T3 and AL-T4 after it returns. Each prompt quotes its task
  block from this plan verbatim, states that `BK` is
  `/var/home/glw907/.local/share/cairn/backups/2026-10-11-alignment/`, quotes the two Anthropic scope
  samples from the launch prompt, and adds these overrides of the agent definition: "Skip the setup
  command; this task edits markdown only. Do not run the fast lane; run your task's acceptance
  checks. Do not read or write agent memory. Edit only your Files. Put your evidence in your commit
  body, commit once, and never push. Run one plain command per Bash call." When both return, the
  session merges each branch with its own subject (`git merge --no-ff -m "AL-T1: Merge the pair
  branch" <branch>`, then the same for AL-T2), runs the fast lane with the dispatch commit as base,
  pushes, then removes both pair worktrees with `git worktree remove` and deletes their branches
  with `git branch -d`. A merge conflict is a stop.
- **Pushes and CI.** Push `worktree-alignment-pass` to `glw907/cairn-cms` after every cairn-cms
  commit, then start `ci-green <sha> --pr <n> --wait > /var/home/glw907/.cache/cairn-alignment/ci-<sha>.log 2>&1`
  as a background Bash task, re-issued on 75, never piped. A pipe reports the pipe's exit code (the
  lesson at `docs-friction-log.md:76`). Exit 0 is green, 1 red, 2 missing (one re-push may clear
  it), and 3 unavailable (re-read at the next push). No task waits for CI before the next; a red
  stops the line. Never push `main`.
- **Stops.** These stop the line:
  - A fired clock stop, a red the session cannot fix in two attempts, or a merge conflict.
  - A finding that would change the approved design.
  - A refused backup, or a deletion whose check disagrees with this plan: a plain `git worktree
    remove` refused on a worktree this plan expects clean, a `git cherry` set that differs from the
    one AL-T5 names, or a backup count that differs from AL-T0's.
  - Battery at 11 percent off mains.

  A stop writes `$(git rev-parse --absolute-git-dir)/pass-stop` (task, what failed, the one
  question), puts the same three facts in the branch's `docs/STATUS.md`, commits and pushes that as
  `Record a stop in STATUS (<task>)`, runs `notify-send -u normal "cairn alignment stopped at
  <task>: PR #<n>; resume: claude attach cairn-alignment"`, and ends the turn. Every wake-up tick
  first runs `test -e "$(git rev-parse --absolute-git-dir)/pass-stop"` and ends the turn if the file
  exists. Only a turn answering Geoff's go-on removes it.
- **Resume.** A relaunch runs the launch prompt again. It finds the PR with `gh pr list --head
  worktree-alignment-pass --state all` (never a second PR) and merges any `worktree-agent-*` branch
  whose commits carry AL-T1 or AL-T2 before re-dispatching that task. A task is done when a commit
  subject starts with its id (skip subjects that start with `Record a stop`). AL-T3 is done when
  `ls` of the auto-memory directory prints eight files. Start at the first task not done. AL-T0's
  backup step never runs twice: if `BK` exists, it re-checks the counts only and never copies over
  it.
- **PR body.** Fixed `##` sections in this order: `What landed` (task id, commit), `Dotfiles PR`,
  `Lesson fold` (AL-T1's disposition counts), `Deletions` (the backup paths and each removal),
  `Review`, `End-to-end check`, `Retried tests`, `Found, not done` (each with now, defer, or drop
  and a one-line reason), and `Score`. Publish with `gh pr edit <n> --body-file`.

## Order

AL-T0. Then AL-T1 and AL-T2 run as a pair; while they run, the session runs AL-T3 and then AL-T4,
which touch nothing in the cairn-cms repo. When the pair returns, the session merges it, then runs
AL-T5 and AL-C.

The pair seam: AL-T1 writes `docs/internal/durable-gotchas.md` and deletes
`examples/showcase/.claude/agent-memory/**`. AL-T2 writes `docs/STATUS.md`, `ROADMAP.md`,
`docs/internal/docs-friction-log.md`, `CLAUDE.md`, `docs/HISTORY.md`, `docs/internal/README.md`, and
`docs/internal/feedback/README.md`, and deletes `docs/internal/dx-backlog-ecnordic-migration.md`.
No path is shared and neither task generates output.

## Tasks

### AL-T0. Re-entry and backups

- **Outcome.**
  - The session is in worktree `alignment-pass` on branch `worktree-alignment-pass`, made from local
    `main`, with `origin/worktree-alignment` merged in by `git merge --no-edit
    origin/worktree-alignment`. That brings this plan, its launch prompt, the design, and the plan
    review. The adapter's setup ran: `npm ci && npm ci --prefix examples/showcase`. One line in the
    branch's `docs/STATUS.md` names the session (`cairn-alignment`, its id from `claude agents
    --json`) and the branch.
  - Before any deletion, `BK` holds these copies, each made with `cp -a` or `tar`, one call each:
    - `agent-memory-main/`, from
      `/var/home/glw907/Projects/cairn-cms/.claude/agent-memory/cairn-implementer/`: 53 files, 52
      lessons and `MEMORY.md`.
    - `agent-memory-worktrees-root/`, from
      `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/.claude/agent-memory/cairn-implementer/`:
      7 files, six lessons and `MEMORY.md`.
    - `class-b/<worktree>/`: the 14 class-B lesson files, each from
      `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/<worktree>/.claude/agent-memory/cairn-implementer/`.
      They are `cairn-tool-a` (`go-tool-gate-gotchas.md`); `chassis-b`
      (`multi-worktree-test-contention.md`, `standalone-capture-tool-server-recipe.md`,
      `full-bleed-band-inside-sticky-footer-shell.md`,
      `inline-style-margin-zero-beats-layered-primitive-gap.md`,
      `tailwind-v4-layer-order-beats-layered-component-rule.md`); `doctor-records`
      (`worktree-full-gate-setup.md`); `draft-docs-2a` (`vitest-esm-import-gotcha.md`,
      `worktree-showcase-sync.md`, `svelte-check-heap.md`); `draft-docs-a` (`go-tool-gotchas.md`);
      `draft-docs-harvest` (`harvest-audit-tooling.md`, `delete-and-relink-gotchas.md`); and
      `identity-seam` (`check_symbols_allowlist_false_positives.md`).
    - `auto-memory/`, from
      `/var/home/glw907/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/`: nine files.
    - `strays/`:
      - The `--cwd` file from `.claude/worktrees/`.
      - `docs-reset-dryrun.tgz`, from `tar --exclude=node_modules -czf <BK>/strays/docs-reset-dryrun.tgz
        -C /var/home/glw907/Projects/cairn-cms/.claude/worktrees docs-reset-dryrun`, about 115 MB.
        This is the only copy of its uncommitted changes.
      - `gate-tier-tool-package-lock.json`, from that worktree's `package-lock.json`.
      - The two untracked capture specs:
        `polish-11b-i/examples/showcase/e2e/capture-11b-i-verify-after.spec.ts` and
        `polish-11b-ii/examples/showcase/e2e/capture-signups-verify.spec.ts`.
    - `worktrees.txt`, from `git worktree list --porcelain > <BK>/worktrees.txt` (path, HEAD, branch,
      and lock for every worktree, so a deleted branch can be restored from its tip SHA).
    - `scratch.txt`, from `ls -la` of `.claude/worktrees/cairn-scratch/` (six tarballs).

  Commit as `AL-T0: Merge the alignment plan and record the backups`, push, and open the draft PR
  against `main` in `glw907/cairn-cms`.
- **Files.** `docs/STATUS.md` (one line). Outside the repo: `BK`.
- **Risk.** `ordinary`.
- **Acceptance.** `git merge-base --is-ancestor origin/worktree-alignment HEAD` exits 0; `realpath
  examples/showcase/node_modules/@glw907/cairn-cms` prints a path under the worktree. `find <BK>
  -name '*.md' -path '*agent-memory-main*'` lists 53, the worktrees-root copy 7, `class-b` 14, and
  `auto-memory` 9. `test -s <BK>/strays/docs-reset-dryrun.tgz` holds, and `tar -tzf` of it lists
  the worktree's files. The commit body quotes those counts and `BK`'s path. The draft PR exists.
- **Test.** The counts.
- **Clock.** 25.

### AL-T1. Fold the implementer lessons into `durable-gotchas.md` (items 1 and 7; pair with AL-T2)

- **Outcome.** Every lesson in `BK/agent-memory-main/`, `BK/agent-memory-worktrees-root/`,
  `BK/class-b/`, and the six lesson files under
  `examples/showcase/.claude/agent-memory/cairn-implementer/` gets one disposition. The commit body
  records them as a table: file, disposition, and the `durable-gotchas.md` heading the lesson
  landed under or the reason it was dropped.
  - **Fold** a lesson that is still true at `HEAD` (grep for each file, script, flag, or symbol it
    names) and would cost the next implementer time. Write it as a `##` entry in the shape of the
    existing ones: what goes wrong, why, and what to do, in a few short paragraphs. Merge lessons
    that share a cause into one entry. A lesson that repeats an existing entry folds into that entry,
    for example `fresh-worktree-needs-npm-ci.md` into "A fresh worktree needs CI's setup", or
    `svelte-check-oom-heap.md` into "`npm run check` runs out of memory".
  - **Drop** a lesson that teaches retired process (`pass-end-ritual-rebase.md`,
    `pass-end-main-drift-heading-anchor.md`, conductor, ledger, or HISTORY ritual), records task
    state or one pass's history, or names code that no longer exists.
  - The `npm test` pipe lesson (`gate-package-race.md:19-26`, `gate-pipestatus-sh-not-bash.md`)
    folds as one entry. It says never to pipe a gate or `npm test` through `tail`, and that the
    workstation's `claude-tail-guard` PreToolUse hook blocks the piped form.

  `durable-gotchas.md:95` ("full record in `docs/HISTORY.md` (the doctor-retirement pre-task
  entry)") is repointed to `docs/superpowers/plans/2026-09-21-doctor-pretask.md` if that plan holds
  the record (grep it for `Cannot connect`). Otherwise it names `docs/HISTORY.md` as the frozen
  record. The intro's "The first five entries are indexed from `CLAUDE.md`" stays true. Then `git rm
  -r examples/showcase/.claude/agent-memory`. The main checkout's store and the worktrees-root store
  are deleted in AL-T5, after this fold merges.
- **Files.** `docs/internal/durable-gotchas.md`; `examples/showcase/.claude/agent-memory/**`
  (deleted).
- **Risk.** `ordinary`.
- **Acceptance.** The disposition table has 78 rows (52 + 6 + 14 + 6), and every file has a
  disposition. `grep -n 'claude-tail-guard' docs/internal/durable-gotchas.md` shows the pipe entry.
  `git ls-files examples/showcase/.claude | wc -l` prints 0. Each folded entry's named paths exist at
  `HEAD`.
- **Test.** The acceptance greps; the session's fast lane after the pair merge.
- **Clock.** 60.

### AL-T2. Align STATUS, ROADMAP, the friction log, and the side docs (items 3 to 7; pair with AL-T1)

- **Outcome.**
  - **STATUS** (items 4 and 7). `:3` becomes "Present tense only; history lives in git and PR
    bodies, orientation in `CLAUDE.md`." Remove the gate-economy narration (`:19-22`, "**The
    per-task gate is now targeted.**"), the merged-worktree cleanup line (`:34-35`; PR #113 merged as
    `b4cc3381a`), and the dotfiles items (`:42-43`, from "Dotfiles:" through "the facts README.").
    The per-version-record rule moves to `cairn-pass` in AL-T4. Keep AL-T0's session line.
  - **ROADMAP** (item 3). In `:10-13`, the shipped-history sentence names git, PR bodies, and
    `docs/STATUS.md`, not post-mortems. In `:444-446`, replace the clause "**Current step:**
    finishing stage 2a's close (`.../2026-10-07-2a-close-finish.md`)" so it agrees with STATUS: stage
    2b is next. Nothing else in ROADMAP changes.
  - **Friction log** (item 5).
    - `:33-34`: shipped detail lives in git, PR bodies, and `docs/STATUS.md`, not post-mortems.
    - `:78` (the HISTORY "failing step" field): reword it to ask for the field in the PR body's score
      or the CI record, since HISTORY is frozen. Delete the entry if no live home fits.
    - Delete `:76` (the `ci-green` pipe lesson, now enforced by `claude-tail-guard`) and `:79`
      (`cairn-run-gate` per-leg timing, a dotfiles tool request).
    - Delete `### Triage record` and `## Clearings` (`:81-320`, which takes `:268` with it). The
      file then ends after the Repo tooling group.
  - **Side docs** (item 6).
    - Add one sentence to `CLAUDE.md` pointing at `docs/internal/public-design-system.md` for public
      theme work, beside "Admin interface design". Add one under "Authoring" pointing at
      `docs/internal/code-idioms.md` for code idioms.
    - Move each live item of `docs/internal/dx-backlog-ecnordic-migration.md` into the friction
      log's Open findings, verified against the code first, as a ``- **`perspective`.**`` bullet
      naming the finder and date (the `cairn-pass` close checklist). An item already shipped or
      overtaken is dropped and counted in the commit body.
    - Delete the file. Drop its index entry at `docs/internal/README.md:57`, and point
      `docs/internal/feedback/README.md:16` at `docs-friction-log.md`. `docs/superpowers/**`,
      `docs/internal/history/**`, and `docs/HISTORY.md` are frozen records and keep their mentions.
  - **HISTORY** (item 7). In `docs/HISTORY.md:5-6`, replace the dead "(`~/.claude/CLAUDE.md`,
    "Project ledgers")" citation with `pass-core` "Ledgers". No other HISTORY edit.
- **Files.** `docs/STATUS.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md`, `CLAUDE.md`,
  `docs/HISTORY.md`, `docs/internal/README.md`, `docs/internal/feedback/README.md`, and
  `docs/internal/dx-backlog-ecnordic-migration.md` (deleted).
- **Risk.** `ordinary`.
- **Acceptance.** Each of these prints nothing: `grep -n -i 'post-mortem' docs/STATUS.md
  docs/internal/docs-friction-log.md CLAUDE.md`, `sed -n 1,14p ROADMAP.md` checked for
  `post-mortem`, and `grep -n 'HISTORY' docs/STATUS.md`. `grep -c '^## Clearings\|^### Triage
  record' docs/internal/docs-friction-log.md` prints 0. `grep -n 'public-design-system\|code-idioms'
  CLAUDE.md` shows both pointers. `grep -rn dx-backlog-ecnordic docs CLAUDE.md README.md
  --exclude-dir=superpowers --exclude-dir=history` hits only `docs/HISTORY.md`. `test ! -e
  docs/internal/dx-backlog-ecnordic-migration.md` holds, and `wc -l < docs/STATUS.md` prints 60 or
  less. The commit body counts the backlog items moved and dropped.
- **Test.** The acceptance greps; the session's fast lane after the pair merge.
- **Clock.** 40.

### AL-T3. Cut the project auto-memory (item 2; session, during the pair)

- **Outcome.** In `/var/home/glw907/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/`,
  after AL-T0's backup:
  - Delete `plan-for-long-unattended-runs.md` and its `MEMORY.md` line.
  - Cut `pairs-by-default.md`, `docs-rebuild-not-edit.md`, and `docs-intros-need-framing-step.md` to
    the ruling's why, 10 body lines or fewer each, keeping the frontmatter. In each, a "How to apply"
    line points at the file that executes the rule: `pass-core` "Pairs", or `docs-page-chain.js` and
    `cairn-docs-drafter.md`.
  - Fix the dangling links: `front-load-into-infrastructure.md:21`'s `[[style-guide-sync]]` becomes
    prose naming `docs/internal/docs-register.md`, and `lean-test-suite.md:15`'s
    `[[plan-for-long-unattended-runs]]` is dropped. Every `[[link]]` left names a memory that
    exists.
  - Update the `MEMORY.md` hooks for the cut files.
- **Files.** The auto-memory directory only (outside git; the backup is `BK/auto-memory/`).
- **Risk.** `ordinary`.
- **Acceptance.** `ls` prints eight files. Each cut file's body after the frontmatter is 10 lines or
  fewer. `grep -o '\[\[[^]]*\]\]'` over the directory's `*.md` names only existing slugs, and AL-C
  item 3's retired-phrase grep finds nothing there. The evidence and the `Pass-Clock:` line land in
  AL-T5's commit body.
- **Test.** The acceptance checks.
- **Clock.** 15.

### AL-T4. The dotfiles PR (items 1, 4, and 8; session, during the pair)

- **Outcome.** Run `git -C /var/home/glw907/.dotfiles fetch origin`, then `git -C
  /var/home/glw907/.dotfiles worktree add -b cairn-alignment
  /var/home/glw907/.dotfiles/.claude/worktrees/cairn-alignment origin/main`. In that worktree:
  - `claude/.claude/agents/cairn-implementer.md`: delete `memory: project` (`:7`). Retitle
    "Escalation and memory" (`:81-86`) as "Escalation", and replace its memory-directory sentences
    with: before starting, read the entries in `docs/internal/durable-gotchas.md` for the area the
    task touches, and put any new gotcha in the final report for the session to file there.
  - `claude/.claude/skills/cairn-pass/SKILL.md`: delete "The `--fast` flag lands in rollout step 2."
    (`:24`). Add the rule STATUS drops (STATUS:42-43) to the per-version-record bullet (`:72-74`):
    moving a per-version record updates `cairn-pass`, `CLAUDE.md`, and the facts README.

  Run `bash /var/home/glw907/.dotfiles/.claude/worktrees/cairn-alignment/scripts/check.sh`, which
  `cd`s to its own root. Commit both files as one commit and push `cairn-alignment` to
  `glw907/workstation`, the dotfiles repository (`~/.dotfiles`'s `origin`; `glw907/dotfiles`
  redirects to it). Open a PR against `main` whose body names the cairn-cms PR, and never merge it.
  If `gh pr list -R glw907/workstation --state open` shows a PR touching either file, name it in both
  PR bodies.
- **Files.** The two dotfiles files above, in the dotfiles worktree only.
- **Risk.** `runner`.
- **Acceptance.** `check.sh` exits 0, quoted in the dotfiles commit body. In the dotfiles worktree,
  `grep -n 'memory: project\|agent-memory' claude/.claude/agents/cairn-implementer.md` prints
  nothing, and `grep -n 'durable-gotchas'` on the same file shows the pointer. `grep -n 'lands in
  rollout' claude/.claude/skills/cairn-pass/SKILL.md` prints nothing. The PR exists and is open.
- **Test.** `check.sh`.
- **Clock.** 20.

### AL-T5. Remove the dead worktrees and stores (items 1 and 9)

- **Outcome.** After the pair merge, and with AL-T0's backup counts re-checked, do these in order,
  one plain command per call from the session's own worktree.
  1. **Classes A and B** (33 worktrees, named in the audit's table): `git worktree remove <literal
     path>` for each, with no `--force`. Ignored files such as `node_modules` do not block it; an
     untracked or modified file does, and that refusal is a stop. Then one `git branch -d` naming
     all 33 branches (per `worktrees.txt`; `doctor-retirement` is on `doctor-retire-1-plan` and
     `pre-cut` on `pre-cut-close`).
  2. **Class D**: `git cherry main gate-related` prints no `+` line, and `git cherry main
     theme-b-plan` prints exactly `+ 0703511`, `+ 68d46b1`, `+ 9284699`, `+ 1b3878d`, and `+
     eccd144`, whose content the audit found on `main`. Then `git worktree remove` each and `git
     branch -D` both.
  3. **Class C**:
     - `gate-tier-tool`: `git worktree remove --force` (its lockfile is in `BK/strays/`; the design
       discards it), then `git branch -d chore/gate-tier-tool-rule`.
     - `polish-11b-i` and `polish-11b-ii`: Read each capture spec from `BK/strays/` and compare it
       against the committed specs under `examples/showcase/e2e/` (test titles and the routes it
       captures). If a committed spec covers it, run `git worktree remove --force` and `git branch
       -d`. If not, keep the worktree and name it in `Found, not done`.
  4. **Class E**, by Geoff's ruling:
     - `git cherry main engine-pre-2b-a-fix2` prints exactly one `+` line, `40fcf6b1d`.
       `draft-docs-plans` prints exactly `+ 1dd3a08`, `+ c6f8ee7`, and `+ 0b81fe1`.
       `docs-reset-dryrun` prints exactly `+ b38a278`.
     - `git worktree remove` `engine-pre-2b-a-fix2` and `draft-docs-plans`. Remove
       `docs-reset-dryrun` with `--force`, only after `test -s` passes on
       `BK/strays/docs-reset-dryrun.tgz`.
     - `git branch -D` all three.
     - `experiment-screen` stays.
  5. **The planning worktrees.** Remove `alignment-design`; its branch stays until this PR merges.
     If `git worktree list` marks `alignment` locked, leave it and name its remove command in `Found,
     not done`. Otherwise remove it and keep its branch.
  6. **Strays and stores.** Run each of these, then `git worktree prune`:
     - `rm -r /var/home/glw907/Projects/cairn-cms/.claude/worktrees/cairn-scratch`
     - `rm -- '/var/home/glw907/Projects/cairn-cms/.claude/worktrees/--cwd'`
     - `rm -r /var/home/glw907/Projects/cairn-cms/.claude/agent-memory/cairn-implementer`
     - `rm -r /var/home/glw907/Projects/cairn-cms/.claude/worktrees/.claude`

     AL-T1 folded both stores, and AL-T0 backed them up.

  Remote branches are left alone. `BK/worktrees.txt` holds every tip SHA, so a deleted branch can
  be restored with `git branch <name> <sha>` until `git gc` prunes it.
- **Files.** None in the repo. The commit `AL-T5: Record the worktree cleanup` (`--allow-empty`, no
  fast lane) carries the evidence for AL-T3 and AL-T5, including AL-T3's saved `Pass-Clock:` line.
- **Risk.** `ordinary`.
- **Acceptance.** `git worktree list` shows the main checkout, `experiment-screen`,
  `alignment-pass`, and only the worktrees step 3 or step 5 kept, each named in `Found, not done`.
  `test ! -e` holds for `cairn-scratch`, `--cwd`, the main checkout's
  `.claude/agent-memory/cairn-implementer`, and `.claude/worktrees/.claude`. The commit body quotes
  the before and after `git worktree list | wc -l` and every `git cherry` output.
- **Test.** The acceptance checks.
- **Clock.** 25.

### AL-C. Close

- **Outcome.** In order, per `pass-core` "Close" and `cairn-pass`:
  1. **Beside CI: one whole-branch review.** `diff-reviewer` at whole-branch scope (`model: "opus"`,
     effort `medium`). No `cairn-pass` checklist glob matches this diff, so it loads none. Its brief
     is this plan and the design, and it also reads the dotfiles PR's diff (`gh pr diff <m> -R
     glw907/workstation`) against AL-T4. No `visual-verifier` runs (no rendered UI), and no admin
     smoke (no `auth-data` path).
  2. **One batched fix chain** for blocking findings and reds. Each is quoted verbatim (location,
     finding, and fix) as its acceptance; then the fast lane and a push. A fix to the dotfiles PR is
     committed and pushed on `cairn-alignment`, with `check.sh` rerun.
  3. **The design's end-to-end check.**
     1. Dispatch one Agent-tool subagent, `subagent_type: "cairn-implementer"`, `isolation:
        "worktree"`, with the prompt "Skip the setup command and edit nothing. Read
        `docs/internal/durable-gotchas.md` and quote the entry that says whether to pipe `npm test`
        through `tail`." Its quote goes in `End-to-end check`. Until Geoff merges and pulls the
        dotfiles PR, the live agent definition still carries `memory: project`, so this proves only
        that the lesson is reachable. The section says so, and gives the post-merge check: a
        `cairn-implementer` dispatch that names no file reports where it looks for gotchas. The PR
        body asks Geoff to merge the dotfiles PR first.
     2. Write the phrase list with `grep -v '^#'
        /var/home/glw907/.dotfiles/claude/.claude/tooling/retired-phrases.txt >
        /var/home/glw907/.cache/cairn-alignment/phrases.txt`; delete its empty lines with `sed -i
        '/^$/d'` on the same file. Write the ROADMAP header with `sed -n 1,14p ROADMAP.md >
        /var/home/glw907/.cache/cairn-alignment/roadmap-head.md`.
     3. Run `grep -n -i -F -f /var/home/glw907/.cache/cairn-alignment/phrases.txt` and `grep -n -i
        'post-mortem'`, each over `CLAUDE.md docs/STATUS.md docs/internal/docs-friction-log.md
        /var/home/glw907/.cache/cairn-alignment/roadmap-head.md` and
        `/var/home/glw907/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/*.md`. Both
        print nothing. Each `HISTORY` hit in those files calls it frozen.
     4. If the subagent's worktree is still present, remove it with `git worktree remove` and delete
        its branch. Then `git worktree list` matches AL-T5's acceptance.
  4. **The `cairn-pass` close checklist.** No public behavior changed, so there is no facts bullet,
     `CHANGELOG.md` line, reference page, or surface update. The friction log is triaged per "Ruled
     for this pass", and nothing is released.
  5. **Ledgers.** In `docs/STATUS.md`, remove AL-T0's session line, keep stage 2b as the next action,
     and add one line saying the alignment PR and the dotfiles PR wait for Geoff's read, dotfiles
     first. Present tense, 60 lines or fewer. Commit as `AL-C: Close the pass records`, push, and
     start the watch.
  6. **The PR.** The body follows Conventions.
     - `Found, not done` carries at least these, each with a proposed disposition:
       - The `cairn-docs-outline` lock and the `gateMatches` doc comment, from STATUS:42-43. Both are
         dotfiles work; propose defer to the dotfiles backlog.
       - `cairn-run-gate` per-leg timing, from friction `:79`. Propose defer, same home.
       - ROADMAP's live HISTORY citations, listed with `grep -n 'HISTORY' ROADMAP.md`. Propose defer
         to the ROADMAP restructure pass.
       - The whole-log friction triage. Propose defer to the same pass.
       - Any worktree AL-T5 kept and any command the harness refused.
     - `Score` carries the spec's rows: Gates on the critical path, Work and review, CI waits on the
       path, Fix rounds and reds, Close, and Total. Gate time comes from `cairn-run-gate --records
       <toplevel> worktree-alignment-pass`, task rows from the `Pass-Clock:` trailers, and the clock
       from AL-T0's commit time to `gh pr ready`.
     - When `ci-green` on the final head exits 0:
       1. Run `gh pr ready <n>`.
       2. Open both PRs: `gh pr view <n> -R glw907/cairn-cms --web` and `gh pr view <m> -R
          glw907/workstation --web`.
       3. Run `notify-send -u normal "cairn alignment: PR #<n> and dotfiles PR #<m> ready to
          read"`.
       4. Call ExitWorktree with `action: "keep"`, and end.

       Never merge either PR.
- **Files.** The fix chain's files and `docs/STATUS.md`.
- **Risk.** `runner` (the pass's class).
- **Acceptance.** `ci-green` exits 0 on the final head. The review's blocking findings are fixed, or
  overruled with a reason in `Review`. The end-to-end results are quoted. `gh pr view <n> --json
  isDraft -q .isDraft` prints `false`, both PRs are open and unmerged, and `test ! -e "$(git
  rev-parse --absolute-git-dir)/pass-task-clock"` holds.
- **Test.** The end-to-end check.
- **Clock.** 30.

## Budget

Task minutes: 25 + 60 + 40 + 15 + 20 + 25 + 30 = 215, against the design's 150 and the 300 stop
line. With the pair, the clock path is about 25 + 60 + 25 + 30 = 140 minutes, plus CI waits at the
close.

## Later

Not built in this pass:

- The ROADMAP tier restructure and the whole-log friction triage, which Geoff ruled is its own pass
  after docs stage 2b. ROADMAP's live HISTORY citations go with it.
- The dotfiles items STATUS drops (`cairn-docs-outline`'s lock, `gateMatches`' doc comment) and the
  `cairn-run-gate` per-leg timing request.
- The remote branches of the removed worktrees.
