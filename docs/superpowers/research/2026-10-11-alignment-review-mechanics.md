# Alignment plan review: mechanics and feasibility

`plan-reviewer` (Opus, effort `medium`) on `docs/superpowers/plans/2026-10-11-alignment.md` at
`09fa98d5a`. Read-only; saved verbatim by the planning session.

## Verdict

Not launch-ready as written. The central `git -C` premise is false under worktree isolation, which
breaks the deletion-safety path. One memory store is missing from the inventory, and several
acceptance checks cannot run or pass vacuously. Every finding has a direct fold and none changes the
design. Two items are owner forks, both minor.

## What holds (probed)

- Every cited line: STATUS :3, :19-22, :34-35, :42-43 (46 lines); ROADMAP :10-13, :444-446, HISTORY
  cites :438/445/456/477/1788; friction log :33-34, :76 ci-green, :78 HISTORY, :79 per-leg, `###
  Triage record` :81, `## Clearings` :266, end :320; durable-gotchas :95; HISTORY :5-6;
  internal/README :57; feedback/README :16; cairn-implementer.md :7 and :81-86; cairn-pass :24 and
  :72-77; front-load :21.
- Counts: main store 53 (52 plus `MEMORY.md`); the 14 class-B files exactly as listed; showcase 6
  lessons plus `MEMORY.md` committed; auto-memory 9.
- Worktree classes: 44 linked = A+B+D 35, C 3, E 4, plus `alignment` (locked; AL-T6 step 5 leaves
  it) and `alignment-design`. Every A, B, and C branch is merged into HEAD, none ahead of upstream, so
  `git branch -d` works.
- Tools exist: `gate-tier.mjs`, `ci-green` (exit 0/1/2/3/75 as stated), `cairn-run-gate --records`,
  `claude-tail-guard` (blocks `npm test` or gate commands piped into tail or head), the
  retired-phrases file.
- `worktree.baseRef: "head"` is set; the docs say "Inside a worktree, `"head"` resolves to that
  worktree's `HEAD`", so the pair branches from AL-T1's commit, and the pair seam is disjoint.
- No open dotfiles PR or branch touches either target file. 215 task minutes is under 300; every
  task has a clock; `runner` fits AL-T5.

## Findings, ranked

1. **BLOCKER, correctness: `git -C <sibling cairn-cms worktree>` is refused** (plan.md:36-41,
   :137-142, :289-294). Probed: `git -C .../worktrees/gate-tier-tool status --porcelain` refused
   ("redirects git to the shared checkout via -C"); a literal `cd <sibling> && git status` refused
   too; `git -C /var/home/glw907/.dotfiles ...` runs (the guard covers the launch repo only). Docs
   (code.claude.com/docs/en/worktrees): "Claude Code blocks a Bash or Monitor command that redirects
   git into the main checkout. The redirect can come through `git -C` ... or a `cd` into the main
   checkout before running git." The siblings sit under the main checkout. The plan's "probed
   2026-10-11" claim (:38) was likely a dotfiles probe. AL-T1's per-row status, AL-T1's
   `docs-reset-dryrun` diff, AL-T6 step 1's re-print, and AL-T6 step 3's `git -C <gate-tier-tool>
   checkout -- package-lock.json` all fail. The plan's fallback ("Found, not done, go on") then lets
   AL-T6 step 4's `git worktree remove --force docs-reset-dryrun` destroy its uncommitted changes
   with no patch in `BK/strays/`, breaking the backup-before-deletion constraint. Fold: use plain
   `git worktree remove <path>` without `--force` as the dirtiness check (man page: "Only clean
   worktrees (no untracked files and no modification in tracked files) can be removed"; a refusal is
   a stop). Back up `docs-reset-dryrun` with `tar --exclude=node_modules -czf
   <BK>/strays/docs-reset-dryrun.tgz -C /var/home/glw907/Projects/cairn-cms/.claude/worktrees
   docs-reset-dryrun` (115 MB) and gate `--force` on `test -s` of it. `cp` gate-tier-tool's
   `package-lock.json` to `BK/strays/`, then `--force` (the design discards it). Name the capture
   specs literally: `polish-11b-i/examples/showcase/e2e/capture-11b-i-verify-after.spec.ts` and
   `polish-11b-ii/examples/showcase/e2e/capture-signups-verify.spec.ts` (found with `git ls-tree -r
   --name-only <branch>` against `find`, which runs from the own worktree). Fix :38.
2. **MAJOR, correctness: a seventh memory store is missing** (plan.md:120-134, :162, :188,
   :305-308). `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/.claude/agent-memory/cairn-implementer/`
   holds 7 files (2026-09-24), with 6 lessons not in the main store:
   `docs-readers-comment-and-typecheck-gotchas.md`, `git-export-tree-gotchas.md`,
   `npm-run-check-coverage-gap-docs-readers.md`, `porting-python-beta-binomial-sims-to-ts.md`,
   `tsdoc-destructured-params.md`, `tsx-scratch-scripts-mts.md`. The audit and plan never name it.
   Fold: back it up in AL-T1, add its 6 lessons to AL-T2 (78 rows), and `rm -r
   .../.claude/worktrees/.claude` in AL-T6 step 6.
3. **MAJOR, correctness: AL-T1's stop rule trips on fix2** (plan.md:142, :148-149). `git log
   --oneline main..engine-pre-2b-a-fix2` lists 11 commits, while the audit names one. `git cherry
   main engine-pre-2b-a-fix2` shows 10 `-` and one `+` (`40fcf6b1d`). `theme-b-plan` shows 5 `+`
   with its content on main. Fold: use `git cherry main <branch>` with the expected `+` set written
   in the plan: fix2 `40fcf6b1d`; gate-related none; theme-b-plan 5 (`0703511`, `68d46b1`,
   `9284699`, `1b3878d`, `eccd144`); draft-docs-plans 3; docs-reset-dryrun 1 (`b38a278c9`).
4. **MAJOR, correctness: the fast lane fails on empty commits** (plan.md:45-48, :155, :312).
   `node scripts/checks/gate-tier.mjs --fast --range HEAD..HEAD` prints "carries no changed paths"
   and exits 1; AL-T1 and AL-T6 are `--allow-empty`. Fold: empty-diff tasks run no fast lane, or
   fold AL-T1 into AL-T0 (finding 17).
5. **MAJOR, correctness: the pair must run in the background** (plan.md:54-61, :89-91, :375). Docs
   (sub-agents): "Foreground subagents block the main conversation until complete"; background
   subagents "run concurrently while you continue working" and "run with a smaller built-in tool
   set". Unstated, AL-T4 and AL-T5 cannot run during the pair, the 7200-second sleep cannot be acted
   on, and the 140-minute path is wrong. Fold: name `run_in_background: true` (and confirm the tool
   set includes Edit, Write, Bash), or run AL-T4 and AL-T5 before the dispatch.
6. **MAJOR, correctness: the dotfiles repo is `glw907/workstation`** (plan.md:272-273, :329,
   :360). `git -C ~/.dotfiles remote -v` gives `github.com/glw907/workstation.git`; `gh repo view
   glw907/dotfiles` resolves to it by redirect. pass-core:89-90: the launch prompt names the push
   target "since auto mode blocks a push to a repository the user did not name". Fold: write
   `glw907/workstation`.
7. **MAJOR, correctness: resume can overwrite the only branch-tip record** (plan.md:78-81). "Start
   at the first task whose acceptance fails": after AL-T6, AL-T1's acceptance fails, so a resume
   re-runs AL-T1 and overwrites `worktrees.txt` (the only tip SHAs); `cp -a` into existing
   directories nests and doubles the counts. AL-T4 has no commit. Fold: resume by task-id commit
   subjects; judge AL-T4 by the auto-memory `ls` count; AL-T1 stops if `BK` exists.
8. **MAJOR, correctness: AL-T2's acceptance passes before any edit** (plan.md:189). `grep -n
   'tail'` already matches :3, :18 ("detail"), and :236 ("tailwindcss"). Fold: `grep -n
   'claude-tail-guard'`.
9. **MAJOR, correctness: the pair prompt never defines `BK`** (plan.md:56, :162). Fold: put the
   literal path in the pair prompt. Reads outside the worktree work; the docs say the first-read
   prompt "doesn't appear in ... background sessions".
10. **MAJOR, correctness: AL-T3's `dx-backlog-ecnordic` grep claim is false** (plan.md:220-222). It
    also hits four 2026-06 specs, `docs/superpowers/plans/2026-06-04-cairn-docs-phase-1-legibility.md`,
    this plan, and the design; a Sonnet executor may edit frozen plans. Fold: exclude
    `docs/superpowers/**` as frozen records.
11. **MINOR, correctness: the end-to-end check cannot test the agent pointer** (plan.md:334-337).
    `~/.claude/agents` resolves into the dotfiles main checkout, unchanged until Geoff merges and
    pulls; the prompt names the file, so (a) passes either way. AL-T6 deletes the main store while
    the live agent still says `memory: project`, so every dispatch until the merge (this pass's pair
    included) is told to write lessons to a gitignored worktree store. Fold: say (a) proves
    reachability only; add a post-merge check (a dispatch naming no file) to the PR body; ask Geoff
    to merge the dotfiles PR first.
12. **MINOR, correctness: AL-T4 orphans a link** (plan.md:240-251). `lean-test-suite.md:15` links
    `[[plan-for-long-unattended-runs]]`. Fold: name it.
13. **MINOR, correctness: AL-C 3b's grep will not run as written** (plan.md:338-341). The guard
    refused a `for` loop and a heredoc as "too complex to verify", so `<( ... | grep .)` is at risk;
    it lacks `-i` though the phrases file says "case-insensitive substring"; a bare directory needs
    `*.md` or `-r`. It prints nothing today, so it is a regression guard; the `post-mortem` grep is
    the one that can fail. Fold: write the phrases to `~/.cache/cairn-alignment/phrases.txt` in one
    call, then `grep -n -i -F -f <file> CLAUDE.md docs/STATUS.md ... <memdir>/*.md`.
14. **MINOR, correctness: AL-T6 step 4 omits a removal** (plan.md:299-301). git refuses to delete a
    branch checked out in a worktree; `draft-docs-plans` and fix2 need `git worktree remove` first.
15. **MINOR, correctness: AL-C 3(c) order** (plan.md:342-343). (c) lists worktrees before the
    subagent worktree goes, and the docs say one "is automatically cleaned up if the subagent makes
    no changes". Fold: remove it if present, then run (c).
16. **MINOR, optional: precision.** Both pair merges share one subject (:286), which confuses
    resume-by-subject. AL-C 6's ROADMAP line numbers (:353-354) drift after AL-T3; cite by grep.
    AL-T4's `Pass-Clock` values must reach scratch before its clock file goes. "Repoint its two
    inbound links" (:219) is ambiguous: drop the README index entry, point the feedback README at the
    friction log.
17. **MINOR, optional: over-ceremony.** (a) AL-T1's per-row `worktrees.txt` is about 90 one-call
    status and log runs (loops refused), repeated in AL-T6 step 1, and the status calls are refused
    anyway; `git worktree list --porcelain > <BK>/worktrees.txt` records path, HEAD, branch, and lock,
    and `git cherry` for the five `-D` branches plus `git worktree remove`'s own clean check covers
    the same risk. (b) AL-T0 and AL-T1 as two tasks (pass-core: "Fold a single-deliverable task into
    a neighbor"); folding saves an empty commit, a push, a CI run, and finding 4. (c) The pair's
    `sleep 7200` is a mechanism pass-core lacks ("Pair worktrees hold no clock file, so the stop
    cannot fire while the session waits on a pair").
18. **MINOR, optional: OWNER FORK, friction-log triage scope** (plan.md:19-22). The plan defers
    `cairn-pass`'s whole-log triage, reading the ROADMAP ruling's "(tiers and triage)" as covering
    the friction log. Options: (a) defer, (b) triage now. Recommendation: (a), and list the deferral
    in `Found, not done`.
19. **INFO: ignored files in removed worktrees.** `git worktree remove` deletes ignored files. 47
    `credentials.md` copies all match the main checkout except three older `tool/docs/credentials.md`
    copies (10,632 bytes, in `cairn-tool-a`, `doctor-retirement`, `pre-cut`); the main checkout holds
    the newer 11,630-byte version. No `.dev.vars`, `.env`, or `*.patch` at risk. Disk 93 percent, 17
    GB free.
