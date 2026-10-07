# Fold record: 2a's unattended finish plan review (2026-10-07)

Target: `docs/superpowers/plans/2026-10-07-2a-unattended-finish.md` (reviewed at `e2fc3815`). Reviews:
`2026-10-07-2a-unattended-finish-review-contract.md` (C), `-mechanics.md` (K), `-risk.md` (R). Governing plan:
`2026-09-30-draft-docs-stage-2a.md` on `draft-docs-2a`. Method: `superpowers:receiving-code-review`; each finding
below was checked against the tree or the review's reproduced evidence before it was folded. Spot checks run by the
fold: `relink.json:897-901` names the deleted `examples/showcase/svelte.config.js` (gone on `main`); `test.yml` and
`e2e.yml` both `paths-ignore: ['tool/**']`; the `GATE MATCHER` block is `pass-execute.js` L395-421 and its unanchored
`cairn-run-gate` regex discards an outside-quotes prefix; the governing plan L117 exempts pure term or link
substitutions from scoped reads; HISTORY L82-83 records the matcher's measured defect (a superset command and an
`E2E_PORT` set outside the string, three false escalations); `unattended-work-guards.md` L28 names the turn-level
token target and L139 the lid-switch hold.

Conductor decisions taken as the plan's own (not forks): `::1` is loopback (RFC 4291 §2.5.3); lanes start at R5's
post-run commit or a 2a stop, whichever first; a halted lane leaves R7 to proceed on `origin/main` as it stands; R1
stays with a narrow superset rule; the add-cairn re-test never logs in, deploys, or pushes and installs via
`link:consumer`; scratch under `$HOME/.cache`; a stop WIP-commits before STATUS.

## Convergent roots

1. **The R2-R4 green boundary.** C-M2, K-B1, C-m8. Folded at the root: R2 to R4 are one segment, green at R4's
   commit (header). R2 gates on `npm run check` and a clean merge, and records `check:facts`, `check:provenance`, and
   the whole-tree docs gate verbatim; failures must be confined to 2a-added facts (K-B1's four named) and the seven R4
   pages and briefs, or 2a stops. R3 gates on `check:facts` green, provenance and docs-gate failures confined to the
   R4 set, and rewrites cited facts in place (never retires a fact a brief cites). R4 is the first whole-tree-green
   task. One gate named per task (the "`engine-logic`'s gate" phrase removed from R2 and R3). K-B1's optional anchor
   retarget folded into R2 as a pure link substitution.
2. **One merge procedure, `origin/main` as truth.** C-M4, K-M3, K-minor 7, R-M1, R-M2, R-M4. Folded into the
   contract's "`main` and merges" and "Standing merge rules" paragraphs: checkpoints fetch, `--ff-only`, commit,
   push (a non-fast-forward stops the run); lanes branch from `origin/main`; each PR merge waits on all workflows,
   requires `baseRefOid` equal to `origin/main`, and watches `main`'s push CI to green; a red `main` stops every
   track; one rule set for every merge (union for ledgers and friction log, deletion wins over an untouched copy,
   `package.json` versions from `main` and scripts from 2a, lock from `main` then `npm ci`, anything else stops). R7
   merges `origin/main` and asserts each merged lane is an ancestor.
3. **Per-track stops and halted lanes.** C-M3, K-M4, R-m1, C-F1, K-minor 6 (second half). Folded as the conductor's
   decision: stops are per track, other tracks run on, lanes start at R5's post-run commit or a 2a stop, R7 starts
   when each lane is merged or halted, a halted lane's branch stays open and is named in STATUS and HISTORY.
4. **L2a moves code that 78 facts cite.** C-M1, R-M5. Folded into L2a's acceptance (`check:facts` and
   `check:provenance` in the lane worktree, moved `Source:` retargeted in the same commit, the `::1` change retags
   any fact stating the old behavior) and into R7 (one scoped fact read over 2a-branch facts citing lane-changed
   files, a scoped read the governing plan already runs).
5. **R4 commits from parallel agents.** C-m3, K-minor 13, R-M6. Folded: drafters and readers never commit; one
   implementer commits per page afterward, in series, with explicit paths.
6. **The add-cairn re-test's reach.** K-M2, R-M7. Folded as the conductor's decision: `link:consumer` install, local
   steps through `wrangler deploy --dry-run`, never login, deploy, or push, unexercised steps recorded; R5's
   re-tests take the same scope.
7. **L2b's repeat scope and assertion form.** C-M7, C-P2, K-minor 10, R proportionality (L2b part). Folded:
   `--repeat-each=10 -g <test>` per touched test; the zen test samples until settled or checks an intermediate value
   (K-minor 10's correction of C-M7: asserting only start and end would drop what the test proves).
8. **R1's execution and narrowing.** C-M8, K-minor 1, 2, 3, 4, C-m6, C-P3, R-m5. Folded: corrected line ranges;
   the outside-quotes prefix is a regression pin; extra leading steps accepted only when each is an allowlisted
   assignment (`CAIRN_GATE_LANE`, `CI`, `E2E_PORT`, the last from HISTORY's measured case); `cd`, `pushd`, any other
   leading command, and a non-allowlisted assignment mismatch, each with a test; extra trailing `&&` steps accepted
   (short-circuit means the gate passed first, in the same directory). R1 runs beside R2 after a `pgrep`/`ListAgents`
   check; the persisted `cmp` moves to its first launch; the header names the execution mode per task.
9. **Budget and counting.** C-m7, K-minor 6 (first half), R-m2, R-m3, R-m4. Folded: 2a's position is `/cost` plus
   the 1.0M planning share minus the lanes' summed usage blocks; R5 re-estimated at 12.5M with the measured targeted
   close (governing ledger: every pilot page escalated, close about 0.7M a page); R5 launches with a turn-level token
   target. The 2a total rises from 18.4M to 21.3M on the estimate; the ceiling does not change, and the plan states the
   stop lands inside R6.

## Single findings

| Id | Disposition |
| --- | --- |
| C-M5 | Folded: R3 retargets `relink.json:899` or records it `done`; R6 treats it closed. |
| C-M6 | Folded: R4 takes one scoped redraft and one re-test, then stops 2a; engine defects file friction. |
| K-M1 | Folded: R4 claim lists are the union of the hand list, R3-HEAD gate failures, and the named grep; the four missed lines and `f:ph6kjg` added. |
| K-M5 | Owner fork: Rulings for Geoff, 1. Its fallback (L2b before L2a) folded as the plan's own order either way. |
| R-M3 | Folded (conductor decision): a stopping track WIP-commits with specific paths before STATUS. |
| R-M8 | Folded: scratch and `TMPDIR` under `$HOME/.cache`; `quota -s` at each checkpoint; ENOSPC is an environment artifact. |
| R-OF1 | Folded as the plan's decision (conductor): both functions treat `::1` as local. |
| C-m1 | Folded: R3's greps named. |
| C-m2 | Folded: R5's `rowsReceived` baseline is the commit before R5 launches. |
| C-m4 | Folded: e2e runs on the open PR; every major held and filed, listed or not; a visual-baseline move halts L1. |
| C-m5 | Folded: L2a gets a `diff-reviewer` read; architecture findings in changed code get one fix round, the rest filed. |
| C-m9 | Folded: the upshift rule covers a second `fix` on any non-chain task. |
| C-m10 | Folded: R7 publishes the review page as a private artifact; STATUS links it. |
| C-P1 | Folded: the four substitution-only R4 pages go to one Sonnet implementer without scoped reads (governing plan L117); R4 estimate 1.8M to 1.2M. What the dropped ceremony would catch: a register defect in a one-token edit, which L117 already judged not worth a read. |
| K-minor 5 | Folded: R3's script bullet is a grep confirmation. |
| K-minor 8 | Folded: gates run only in worktrees after `npm ci`. |
| K-minor 9 | Folded: `templates/waymark` bumped at source and re-emitted. |
| K-minor 11 | Folded: the tidy entry's deletion names both causes. |
| K-minor 12 | Folded: lid-switch hold duration and the battery stand-down named in the guards. |
| R-m6 | Folded: the review page marks each page "targeted close" or "chain accept" with its rulings. |
| K-M2 (deploy option) | Refused: deploying with the API token and deleting the Worker afterward contradicts the conductor's no-deploy decision; the dry run covers the local step. |
| R-m1 ("no new lane after a stop") | Refused: superseded by the conductor's decision that a 2a stop starts the lanes. |
| R proportionality (checkpoints 1-3 on the branch only) | Refused: with the `--ff-only` rule each checkpoint push is one command, and `main`'s STATUS is what a resuming session reads first; the saving does not cover the lost resume point. |

Fold-found, outside the reviews: the plan said the governing plan reaches `main` "after R2's merge"; R2 merges
`main` into the branch, so it reaches `main` at R7. Corrected in the header.

Refusals are few because nearly every finding was verified against the tree and its fix was a sentence of
constraint, not machinery. Three were refused as superseded or as costing more than they save.

No owed errata: every departure from the governing plan is stated in this plan, which governs on conflict.

## Rulings for Geoff (as written into the plan)

1. **Raise the lane ceiling to 5M (stop at 4M, whole-run cap 25M)?** L1's 1.5M plus L2's 2.5M is 4.0M, the current
   hard ceiling, so on its own estimate the lanes hit the 3.2M stop before both finish. **Recommendation: yes.**
   *Yes* builds both lanes to their merges in this run on the estimate, at up to 1M more spend. *No* keeps the 4M
   ceiling: L2b runs first, L1 and L2b likely land, L2a likely halts at the stop with its branch open, and the next
   session resumes it.

## Measures

- **New-mechanism findings folded:** 3.
  - The PR merge procedure (R-M2): source, GitHub's documented "Require branches to be up to date before merging"
    and required status checks, run by hand because `main` has no branch protection; measured defect, `gh api
    .../branches/main/protection` returns 404, so `gh pr merge` enforces nothing.
  - R5's turn-level token target (R-m3): source, `~/.claude/docs/unattended-work-guards.md` L28 (the workstation's
    runaway guard for expensive sweeps); measured defect, the pilot's single workflow ran 6.09M and the last pass
    ran 14.7M of a ceiling raised twice (governing ledger, HISTORY L84).
  - The `quota -s` checkpoint read (R-M8): source, the remedy the targeted-close record applied; measured defect,
    that close hit the per-user `/tmp` quota mid-run (`2026-10-03-draft-docs-2a-targeted-close-record.md:60`).
- **New-mechanism findings refused:** 0. The R1 allowlist narrows R1's own feature rather than adding machinery, and
  the R4 claim-list union and R7's scoped fact read reuse existing gates and reads.
- **Target line count:** 231 before, 289 after (+25.1%).
- **Ceiling change:** none in the plan. 2a's estimate rose from 18.4M to 21.3M against the unchanged 20M ceiling
  (stop now projected inside R6). The lane ceiling is Ruling 1, pending Geoff.

## Second fold (2026-10-07)

A narrow fold of `2026-10-07-2a-unattended-finish-fold-verification.md` (0 blocker, 6 major, 7 minor) and the owner
rulings recorded below. Each finding was checked against the source before folding.

### Owner rulings (Geoff, 2026-10-07)

Recorded in the plan's Owner rulings section; the "Rulings for Geoff" section is deleted. 2a's ceiling is 25M with
the stop at 20M. The lanes share a 5M ceiling with the stop at 4M; at the lane stop each lane task in flight
finishes and no new task starts in either lane. The whole run is capped at 30M. The Budget paragraph now places the
20M stop: inside R7 on the estimate (R7 finishes), inside R6 on a task 8 overrun past about 0.8M, inside R5 past
about 2.3M.

### Majors

- **M1, folded.** Verified: `gh pr view 103` gives `baseRefOid` `5c47a6e3`; merge `04116a3b`'s first parent is
  `481b811d`. The merge procedure now tests `git merge-base --is-ancestor origin/main origin/<branch>` after a fetch
  and runs `gh pr checks --watch` only after checks register.
- **M2, folded.** Verified: `docs-page-chain.js:282-284` calls `spent` output tokens, "never a count against a pass
  ceiling". The turn-level target is deleted; the backstop named is the `/cost` read at each task boundary and
  before each targeted close, plus `claude-wf-guard`.
- **M3, folded.** Verified: `gateCore`'s unanchored `/cairn-run-gate\s+'([^']+)'/` drops the prefix, and
  `pass-execute.js:365`, `:459`, `:546` tell implementers to `cd` first. R1 now applies the allowlist and the `cd`
  rejection only inside the quotes or to an unwrapped command; the outside prefix stays discarded, test-pinned.
- **M4, folded.** Verified: the reader prompt (`docs-page-chain.js` near L1705) names a scratch directory and no
  install rule. Added the conductor ruling "unexercised: unreleased engine" and a session-level `TMPDIR` under
  `$HOME/.cache`.
- **M5, folded.** L2b opens and merges its own PR before L2a starts; L2a branches from `origin/main` after it.
- **M6, folded.** A fact bullet edited on both sides takes `main`'s `Source:` line and the branch's text, judged by
  the task's scoped fact read and `check:facts`. No new read.

### Minors

- **m1, folded.** R7's file list uses `<R2 merge>...origin/main`.
- **m2, folded** with the lane-ceiling ruling (both lanes halt at the shared stop).
- **m3, folded.** `package.json` takes each version from the side that bumped it and the union of scripts.
- **m4, folded.** R5's targeted closes land before the post-run record and commit.
- **m5, folded.** The `/tmp` row is named; if clearing the conductor's own scratch leaves usage above 4.5G, no new
  heavy gate starts and the track stops with STATUS.
- **m6, folded.** The L1 dispatch hands the skill by path; the conductor creates the tripwires from the implementer's
  returned conditions.
- **m7, folded.** The fold agent writes the review page file; the conductor publishes it, or, on a permission prompt,
  it becomes an owner-attended step with the path in STATUS.
- **Owed:** none. Every minor in the verification met the fold bar (an unplanned mid-run stop or a wrong result).

### Measures

- **New mechanism added:** 0. Each change narrows or corrects a rule already in the plan.
- **Target line count:** 289 before, 303 after (+4.8%).
