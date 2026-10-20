# cairn-cms alignment (design)

**Status:** approved by Geoff, 2026-10-11, with the class-C recommendation, for unattended planning. The pass runs
before docs stage 2b. Evidence: the alignment audit at `~/Projects/cairn-cms/docs/superpowers/research/2026-10-11-cairn-cms-alignment-audit.md`,
read at `b4cc338`, which is still `main`.

## Outcome

Every lesson a cairn agent needs reaches it through a file it reads, and no file a cairn session
loads teaches retired process. The repo carries only live worktrees.

## Changes

1. **Implementer lessons.** Fold the live lessons from the main checkout's
   `.claude/agent-memory/cairn-implementer/` (52 files) and the 13 that exist only in class-B
   worktrees into `docs/internal/durable-gotchas.md`. Delete the retired ones, including
   `pass-end-ritual-rebase.md` and `pass-end-main-drift-heading-anchor.md`, and the seven committed
   under `examples/showcase/.claude/agent-memory/`. In dotfiles, drop `memory: project` from
   `~/.claude/agents/cairn-implementer.md` and point it at `durable-gotchas.md`.
2. **Project auto-memory.** Delete `plan-for-long-unattended-runs.md`. Cut `pairs-by-default.md`,
   `docs-rebuild-not-edit.md`, and `docs-intros-need-framing-step.md` to the ruling's why, 10 lines
   or fewer, and fix their broken links and `front-load-into-infrastructure.md:21`. Back up the
   directory first.
3. **ROADMAP**, per Geoff's ruling, only the header (ROADMAP:11-13 names post-mortems as history)
   and the stale entry at ROADMAP:444-445 that contradicts STATUS. The tier restructure is its own
   pass after docs stage 2b.
4. **STATUS.** Remove the HISTORY pointer (:3), the gate-economy narration (:19-22), the dotfiles
   items (:42-43, with the rule moving to `cairn-pass`), and the merged-worktree cleanup line
   (:34-35).
5. **Friction log.** Fix the post-mortem lines (:34, :268) and the HISTORY-field request (:78).
   Remove the two workstation lessons (:76, :79), which dotfiles PR #8's `claude-tail-guard` now
   enforces. Remove the "Triage record" and "Clearings" sections (:81-320), which are pass history.
6. **Side docs.** Point `CLAUDE.md` at `public-design-system.md` and `code-idioms.md`. Move the
   live items of `dx-backlog-ecnordic-migration.md` into the friction log and delete it. The two
   harvest docs stay.
7. **HISTORY citations.** Repoint STATUS:3 and `durable-gotchas.md:95`, and fix `HISTORY.md:5-6`'s
   dead global-CLAUDE.md citation. HISTORY stays frozen otherwise.
8. **`cairn-pass:24`** (dotfiles): the `--fast` flag landed in PR #112.
9. **Worktrees** (Geoff's ruling). Copy the class-B lessons out (item 1), then remove the 35 merged
   worktrees in classes A, B, and D, and drop `draft-docs-plans`, `docs-reset-dryrun`, and fix2's
   stray commit. Keep `experiment-screen`. Class C is not in the ruling: discard
   `gate-tier-tool`'s modified `package-lock.json`, and keep the two untracked capture specs only if
   no committed spec covers them, else remove those worktrees too. Delete `cairn-scratch/` and the
   stray `--cwd` file. Every removal shows its dry-run list before it runs.

## Out of scope

The ROADMAP tier restructure, any engine or docs code, and the docs page chain.

## End-to-end check

A fresh pair agent dispatched into a new cairn-cms worktree reads `durable-gotchas.md` and finds the
`npm test` pipe lesson. A grep over CLAUDE.md, STATUS, the friction log, ROADMAP's header, and the
new auto-memory finds no retired term (post-mortem as history, HISTORY as live, the deleted
runners). `git worktree list` shows `main`, `experiment-screen`, and any live pass.

## Risk and estimate

Class `runner`: the agent definition and `cairn-pass` edits are workstation skills and agents. The
cairn-cms edits are `ordinary`. About 2.5 hours of clock: the lesson fold about 60 minutes, the
other docs about 40, worktrees about 20, close about 30.

## Contestable

Class C: Geoff accepted the recommendation above with the design (2026-10-11).
