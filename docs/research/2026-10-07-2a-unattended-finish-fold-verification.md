# Fold verification: 2a's unattended finish plan (2026-10-07)

Target: `docs/superpowers/plans/2026-10-07-2a-unattended-finish.md` at `03e0324a` (original `e2fc3815`). Fold record:
`2026-10-07-2a-unattended-finish-plan-fold.md`. Reviews: `-review-contract.md` (C), `-review-mechanics.md` (K),
`-review-risk.md` (R). Governing plan read on `draft-docs-2a` at `9ca04531`. Line numbers are the revised plan's
unless a path says otherwise. A fresh-context read; this reader took no part in the reviews or the fold.

**Counts:** 0 blocker, 6 major, 7 minor.

## 1. Did each blocker and major close at its cited location?

Yes, every one has a sentence at the location the fold names. Four close with a residual defect that the fold
introduced or left open; those are findings M1, M3, M4, and M6 below.

| Finding | Where it closed | Status |
| --- | --- | --- |
| K-B1, C-M2 (R2-R4 green boundary) | L15, L130-133, L155-156, L160 | Closed |
| C-M1, R-M5 (L2a moves cited doctor lines) | L259-261, L270-271 | Closed |
| C-M3, K-M4 (per-track stops, halted lane) | L40-46, L264, L268 | Closed |
| C-M4, R-M1, R-M2, R-M4, K-M3 (merges) | L48-59, L268-270 | Closed in intent; the mechanism is defective (M1); one hunk class is uncovered (M6) |
| C-M5 (relink entry in a deleted file) | L144-146 | Closed |
| C-M6 (R4 failure path) | L171-173, L41-42 | Closed |
| C-M7 (L2b repeat scope) | L249-250 | Closed |
| C-M8 (R1 superset rule) | L99-105 | Closed as written; it now collides with the real block (M3) |
| K-M1 (claim lists) | L162-164, L184-192, L149 | Closed |
| K-M2, R-M7 (add-cairn re-test reach) | L175-178 | Closed for R4. R5's "same scope" has no path to the workflow's agents (M4) |
| K-M5 (lane ceiling) | Rulings 1, L241-242 | Turned into a fork, but the fork's evidence is wrong (M5) |
| R-M3 (stop WIP-commits) | L43-45 | Closed |
| R-M6 (R4 commit owner) | L172-173 | Closed |
| R-M8 (`/tmp` quota) | L35-36, L65-66 | Closed for conductor dispatches; workflow agents are not reached (M4) |

Spot checks that hold: the `GATE MATCHER` block sits at `pass-execute.js` L395-421 and `pass-execute-chains.js`
L316-342. Both copies are the same inode as `~/.claude/workflows/*` (a stow fold), and the parity test is at
`pass-execute-runners.test.mjs:216`. `relink.json:899` names the deleted `examples/showcase/svelte.config.js`.
`doctor.go:72` and `spine/condition.go:74` are as cited. `isLocalOrigin` (`check_csrf.go:232`) already accepts `::1`,
and the inline `isLocal` (`check_origin.go:44`) does not. `main`'s friction entries at L58 and L86 are the `go` and
tidy entries. HISTORY L82-83 records the matcher defect. Every workflow triggers on `pull_request` with
`paths-ignore: ['tool/**']`.

## 2. Contradictions and unbuildable order

The R2-R4 boundary builds. R2 gates on `npm run check`, which is `svelte-check` plus `main`'s `tsc`, so it can go
green on a merged tree. R3 gates on `check:facts` green and confines the other failures. R4 is the first task that
needs the whole tree green. Lane start and halt (L25-26, L40-46), R7's start (L268), and the per-track stops are
consistent with each other. One exception is the shared lane ceiling (m2). The merge procedure has a defective check
(M1). R7's merge leaves one hunk class uncovered (M6). The L2 branch shape contradicts the ruling's evidence (M5).

## 3. Mechanisms stated from memory

- **PR merge procedure:** the `baseRefOid` test is unproven, and this repo's history contradicts it (M1).
- **Turn-level token target:** its unit and its setter differ from what the plan assumes (M2).
- **`quota -s`:** proven. It runs, and it reports the `/tmp` tmpfs at 6275M with `usrquota` on the mount. The fold
  cites the close record's remedy as its source, but that record (branch, L60-62) clears scratch and never names
  `quota -s`. The threshold reads a shared per-user quota (m5).
- **R1's matcher:** checked against the real block (M3).
- **R7's `git diff A..B`:** a tree diff, not a range (m1).

## 4. Can Geoff rule the fork? Other unplanned mid-run questions

Ruling 1 is answerable once M5 is fixed. As written, its *No* branch promises an outcome the branch shape cannot
deliver. Two other places would put a question to an unattended conductor. The shared lane ceiling has no rule for
which track stops (m2). R5's reader re-tests meet a registry engine that lags `main` (M4). m4, m6, and m7 are smaller
gaps of the same kind.

## 5. Outcome-only?

Yes. The plan holds commands and patterns as constraints (the grep pattern, `git merge --ff-only`, `gh pr checks`).
It holds no implementation code. R1 specifies matcher behavior, not code.

## Findings

### Major

**M1. The merge procedure's `baseRefOid` test does not prove the branch is up to date** (L50-53). The plan treats
"`baseRefOid` equals the current `origin/main`" as the up-to-date check. The fold cites GitHub's "Require branches to
be up to date" setting, which is a policy, not a statement of what `baseRefOid` holds. This repo's history shows
`baseRefOid` does not track the base tip. PR #103 carries `baseRefOid` `5c47a6e3`, but its merge commit `04116a3b` has
first parent `481b811d`, ten commits later on `main`. A stale value forces needless re-merges, and a re-merge that
reports "Already up to date" pushes nothing and can loop. A value that does track the tip would pass without proving
that the branch contains it. `gh pr checks --watch` also exits early when no checks have registered yet after a push.
**Fix:** after `git fetch`, require `git merge-base --is-ancestor origin/main origin/<branch>`. If that fails, merge
`origin/main` into the branch, push, and wait until the PR's checks register before `gh pr checks --watch`.

**M2. The turn-level token target cannot do what L68-69 assumes** (L68-69). The `workflow-authoring` reference
defines `budget` as "the turn's token target from the user's '+500k'-style directive". It says `spent()` counts
"output tokens spent this turn across the main loop and all workflows". `docs-page-chain.js:282-284` repeats this:
"never a count against a pass ceiling". The plan's ceilings are `/cost` totals, so a target "equal to its headroom to
20M" in output tokens would never trip. The conductor also cannot author a user directive on its own turn. **Fix:**
delete the sentence and state the backstop that exists. At R5's launch the projected position is about 4M, plus R5's
12.5M, so about 16.5M, under the 20M hard ceiling. The runaway guard (`claude-wf-guard writer`) covers a runaway.
Alternatively, Geoff's launch prompt carries a `+N` directive converted to output tokens at a measured
output-to-total ratio.

**M3. R1's rejection rule collides with the real block's prefix discard** (L99-105). `gateCore` unwraps with an
unanchored `/cairn-run-gate\s+'([^']+)'/`, so everything before `cairn-run-gate` is dropped today. That includes
`cd /x && cairn-run-gate '...'` and a non-allowlisted `FOO=1 cairn-run-gate '...'`. The runner tells every implementer
"cd to it first" (`pass-execute.js:365`, `:459`, `:546`). The plan says an extra leading `cd` "mismatches" and calls
the outside-quotes prefix "a regression pin". It never says whether the rejections apply outside the quotes. A
test-first implementer who writes the `cd` rejection as an outside-quotes case gets a red test. The fix for that red
test anchors the prefix and rejects the `cd <repo> &&` form the runner instructs, which brings back the false
escalations R1 exists to remove. **Fix:** state that the outside-quotes prefix stays discarded as today, pinned by a
test. State that the allowlist and the `cd`/`pushd` rejections apply to steps inside the quotes, or to an unwrapped
command.

**M4. R5's re-test scope and scratch rule never reach the workflow's agents** (L65, L178, L203-207). "R5's re-tests
take the same scope" and "every dispatch puts scratch and `TMPDIR` under `$HOME/.cache`" bind conductor dispatches
only. `docs-page-chain`'s reader prompt (`docs-page-chain.js:1705-1709`) says to run steps "in a scratch directory
outside the worktree" and to read account, secret, or deploy steps without running them. That covers login and
deploy, but not the install or the scratch location. The runner has no argument that carries either rule. On a Kit 3
`main` with the release held, a reader that follows a page's `npm create cairn-site` or `npm install @glw907/cairn-cms`
gets 0.98.0 (Kit 2, peer `^2.70`). The page then fails its re-test on registry lag, not on a page defect. That is a
false `fix` and escalation on up to five pages, inside the largest task. **Fix:** add a conductor-only ruling. A
reader finding traceable only to the unreleased engine on the registry is disposed in the targeted close as
"unexercised: unreleased engine". It is recorded on the review page, never redrafted. Launch the session with
`TMPDIR` under `$HOME/.cache` so workflow agents inherit it, or accept the `quota -s` check as the only guard there.

**M5. Ruling 1's *No* branch assumes L2b can land without L2a, but L2 is one branch** (L241-242, L264, L279-283). L2
runs both tasks serially in one `eng-cleanup` worktree and merges once. A halted lane's branch stays open (L45). So
if L2a halts at the 3.2M stop, L2b's flake fixes stay unmerged too. The ruling says the opposite: "L1 and L2b likely
land". Geoff would rule on a false outcome. **Fix:** L2b opens and merges its own PR by the merge procedure before L2a
starts, with L2a branching from `origin/main` after it. Alternatively, restate the *No* outcome as "L2b and L2a land
together or not at all".

**M6. R7's merge rules miss a fact bullet edited on both sides** (L57-59, L268-270). The standing rules cover
distinct ids and a drifted `Source:`. They do not cover one id edited on both sides. L2a retargets the `Source:` of
doctor-citing facts on `main` (78 bullets, 10 in `extend.md`). R5's `debug-your-site` is about doctor and has 26 fact
ids, and the chain's post-run commit lands fact-container edits. A same-bullet conflict is therefore plausible, and it
stops 2a at its last task. **Fix:** a bullet changed on both sides takes `main`'s `Source:` line and 2a's text. R7's
existing scoped fact read and `check:facts` then judge the bullet, so no new read is needed.

### Minor

**m1. R7's file list uses a tree diff** (L270-271). `git diff --name-only <R2 merge>..origin/main` is "synonymous to"
`git diff A B` (`git-diff(1)`). It lists every file 2a changed as well, which widens the scoped fact read. **Fix:**
use three dots, `<R2 merge>...origin/main`, which `git-diff(1)` defines as the diff from the merge base.

**m2. One lane ceiling covers two tracks** (L22-24, L40). "Stops that track" has no referent when the shared 4M
ceiling hits 80 percent. **Fix:** "the lane ceiling's stop halts both lanes at their in-flight task boundaries".

**m3. The `package.json` rule drops `main`-side script edits** (L58). "2a's scripts" loses any script a lane adds,
and "main's" is ambiguous when `origin/main` merges into a lane branch. **Fix:** versions from the side that bumped
them, scripts as a union, and anything else stops the track.

**m4. The targeted close and the post-run commit have no stated order** (L212-217, L221, L25). The governing plan
makes the post-run commit a gate-green boundary. An escalated page is not green until its targeted close lands. R6's
`<base>` and the lane start both key on that commit. **Fix:** "targeted closes run before the post-run record and
commit".

**m5. The `quota -s` threshold reads a shared quota** (L65-66). `quota -s` reports two tmpfs rows. The quota is per
user, and another session already holds 1.7G under `/tmp/claude-1000` (dubplate). Clearing the conductor's own
scratch may not bring usage under 4.5G, and the next step is unruled. **Fix:** name the `/tmp` row. If usage is still
above 4.5G after the conductor clears its own scratch, stop starting new heavy gates and write STATUS, which makes it
a track stop.

**m6. L1's skill steps outrun the implementer's tools** (L225-234). `cairn-implementer` has no Skill tool, and the
skill's step 6 asks for a scheduled tripwire per held major through the `schedule` skill. **Fix:** the dispatch hands
the skill by path (`~/.dotfiles/claude/.claude/skills/dependency-upgrade/SKILL.md`). Tripwires are filed as ROADMAP
lines with their conditions, and the routines are created at the next attended session.

**m7. The review-page publish can stall unattended** (L272). Publishing an artifact means loading `artifact-design`,
and it may raise a permission prompt. **Fix:** the fold agent writes the page file. The conductor publishes it, and
if publishing prompts, STATUS records the file path for Geoff's session.
