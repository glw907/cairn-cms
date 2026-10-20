# Alignment plan fold

The fold of `2026-10-11-alignment-review-mechanics.md` into
`docs/plans/2026-10-11-alignment.md`. The planning session (Opus 5.5) ran the fold
itself, since it held the probes the review checked. No verification read runs: the pass is
`runner`, neither `auth-data` nor `live-account` (`spec-plan-review`, "Depth scales with risk").
The task ids were renumbered: old AL-T1 folded into AL-T0, so old T2 to T6 are now T1 to T5.

Each finding was verified before the fold acted on it. Re-probes by the planning session:
- `git -C <sibling worktree> status` is refused ("redirects git to the shared checkout via -C").
- The worktrees-root store lists seven files.
- `git -C ~/.dotfiles remote -v` prints `glw907/workstation`.
- `lean-test-suite.md:15` links `[[plan-for-long-unattended-runs]]`.
- Each of the five `git cherry main <branch>` sets matches the review.

| # | Severity | Disposition | Where the revision carries it |
| --- | --- | --- | --- |
| 1 | blocker | Folded | Command forms (the refused and allowed lists); AL-T0's `tar` and `cp` backups; AL-T5 step 1's plain `git worktree remove` as the clean check, with `--force` only after a named backup; the capture specs named literally. The false probe claim is gone. |
| 2 | major | Folded | Ruled for this pass (the seventh store); AL-T0's `agent-memory-worktrees-root/`; AL-T1's 78 rows; AL-T5 step 6. |
| 3 | major | Folded | AL-T5 steps 2 and 4 name each branch's expected `git cherry` `+` set; a different set is a stop. |
| 4 | major | Folded | Gates: an empty range runs no fast lane. Old AL-T1's empty commit is gone (finding 17b). |
| 5 | major | Folded | Pairs: the Agent tool returns at once in a background session (observed: this session's own dispatch returned "Async agent launched"), with a blocking fallback that runs AL-T3 and AL-T4 after the pair. The schema has no `run_in_background` parameter to name. |
| 6 | major | Folded | AL-T4, AL-C, and the launch prompt name `glw907/workstation`. |
| 7 | major | Folded | Resume judges done by commit subject, AL-T3 by the `ls` count, and AL-T0's backup never re-copies over an existing `BK`. |
| 8 | major | Folded | AL-T1 acceptance greps `claude-tail-guard`. |
| 9 | major | Folded | Pairs: each prompt states `BK`'s literal path. |
| 10 | major | Folded | AL-T2 names `docs/**` as frozen, and its grep excludes `superpowers` and `history`. |
| 11 | minor | Folded | AL-C item 3.1 says the check proves reachability only, gives the post-merge check, and asks Geoff to merge the dotfiles PR first. The pair's override already says "Do not read or write agent memory". |
| 12 | minor | Folded | AL-T3 names `lean-test-suite.md:15`. |
| 13 | minor | Folded | AL-C items 3.2 and 3.3 write the phrase list to a file, then run `grep -i -F -f` over `*.md`. |
| 14 | minor | Folded | AL-T5 step 4 removes each worktree before `git branch -D`. |
| 15 | minor | Folded | AL-C item 3.4 removes the subagent worktree if present, then lists. |
| 16 | minor, optional | Folded in part | One merge subject per pair branch (resume reads subjects). The ROADMAP citations are read by grep. AL-T3's clock line goes to scratch. The inbound links are spelled out. All four are one-line edits that remove a wrong reading. |
| 17 | minor, optional | Folded | (a) `worktrees.txt` is one `git worktree list --porcelain`, and the per-row status pass is gone. (b) AL-T1 folded into AL-T0. (c) The pair's `sleep` is replaced by a dispatch timestamp checked when the pair returns, per `pass-core` ("after a pair returns once it has checked the pair's overrun"). |
| 18 | minor, optional | Not a fork; folded | The design and the planning prompt settle it: work beyond the design goes to "Later". The deferral is in "Ruled for this pass", "Later", and AL-C's `Found, not done`. The reasoning no longer leans on the ROADMAP ruling's wording. |
| 19 | info | No change | `git worktree remove` deletes ignored files. The only ignored data that differs is three older `tool/docs/credentials.md` copies, and the main checkout holds the newer one. |

No finding changes the approved design. Task minutes stay at 215, under the 300 stop line.
