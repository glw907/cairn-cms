# Plan review, contract and criteria lens: 2a's unattended finish (2026-10-07)

Target: `docs/superpowers/plans/2026-10-07-2a-unattended-finish.md` at `e2fc3815`. Governing plan read on the
`draft-docs-2a` worktree at `9ca04531` (Execution mode, Global constraints, tasks 6, 8, 9, 10). Scope: gaps that affect
correctness or the stated requirements only. Every finding below was checked against the tree, not inferred.

Counts: 0 blocker, 8 major, 10 minor, 3 proportionality notes, 1 owner fork.

## Major

**M1. L2a can turn `main`'s `check:facts` red without any gate seeing it** (plan L202-210).
78 fact bullets cite `tool/internal/doctor` by line range (`facts/admin.md` 40, `reference.md` 28, `extend.md` 10;
`report.go:70` alone 20 times). `check:facts` checks a window around each cited range and resolves symbol anchors.
L2a unexports symbols, collapses the triplicate lookup, and rewrites the `failResult` rebuild and three loops, so the
cited lines move. L2a's acceptance is `make -C tool check` only. `test.yml` and `e2e.yml` both set
`paths-ignore: ['tool/**']`, so the lane's PR CI does not run `check:facts` either. The lane can merge green while
`main` goes red. R7 then inherits the red, and the 2a-only facts that cite doctor lines go red too.
**Fold:** add `npm run check:facts` and `npm run check:provenance` to L2a's acceptance, run in the lane worktree.
Any moved `Source:` is retargeted under the facts README's fix rule in the same commit. R7's merge rules (M4) cover
the 2a-only doctor cites.

**M2. R2's acceptance contradicts itself, and R3's "retire" option contradicts R3's gate** (L107-110, L122-128).
R2 requires `check:facts` and whole-tree `check:docs-gate` green, and also says facts red from Kit 3 drift are listed
for R3 and not fixed. Both cannot hold. The drift is near-certain: `f:j0ut9n` cites `package.json:2` and Waymark
lines that move, and `f:g48ytv` records a Kit 2 run. R3 has the same shape. Retiring a cited fact means tagging it
`[rejected]` or `[docs-drift]`, and `check-provenance.mjs:35-37` makes those uncitable. The pilot briefs still cite
`f:g48ytv`, `f:jzm5ef`, `f:skeche`, and `f:ghzx9c` until R4 rewrites them, so `check:provenance` goes red at R3. A red
gate is neither a conductor-only ruling nor a listed stop, so the conductor meets a question mid-run.
**Fold:** make R2 to R4 one segment with one green boundary at R4's commit, as pass-core allows. R2 gates on `npm
run check` and a clean merge (no conflict markers, the resolution rules met). R3 gates on `check:facts` with
`check:provenance` deferred to R4. Alternatively, R3 rewrites cited ids in place and never retires one a brief
still cites. R4 carries the whole-tree docs gate.

**M3. Stops are written per run, but the ceilings are per track; and R7 has no path if a lane halts** (L23, L39-42,
L199, L218, L222). The ceiling ruling says a lane halts alone and 2a carries on. The contract says "the run stops"
on "a code task still `fix` after its upshifted round", and L1, L2a, and L2b are code tasks, so an L2b flake that
survives its upshift halts 2a. The reverse case is unstated: does a 2a stop at 16M halt the lanes? R7 merges `main`
only "after both lanes have merged", and checkpoint 4 comes "when both lanes are done". A halted lane leaves R7
waiting with no rule.
**Fold:** write every stop per track: a lane stop halts that lane, a 2a stop halts 2a, and other tracks continue to
their own end. R7's precondition becomes "each lane merged or halted with STATUS written". A halted lane's branch
stays unmerged and is named in STATUS and the HISTORY entry. Whether lanes start at all after a 2a stop is F1.

**M4. R7's merge of `main` has no resolution rules and no defined `main`** (L222-223; governing task 10).
Three conflict sources are known in advance:
- the friction log: L2a closes the `go` entry (`main` L58-67), L2b deletes the tidy entry (L86-91), and R3, R5,
  and R6 edit the same file on 2a;
- `CHANGELOG.md` `## Unreleased`: L1's entry against any 2a edit;
- fact drift from L1 and L2 on 2a-only bullets (M1).

Under the contract, any hunk that R2's rules do not cover is a stop. R2's rules do not reach R7, so a predictable
conflict ends the run at its last task. Separately, the lane PRs merge on GitHub, while the checkpoint STATUS
commits land on the local `main`. "Merge `main`" can then mean a local `main` that lacks both lanes. In that case the
close gate goes green without covering them, which violates R7's own stated requirement.
**Fold:** R7 starts with `git fetch` and merges `origin/main`, after the local STATUS commits are pulled and pushed.
Its rules: take both sides in the friction log and CHANGELOG (union), and retarget drifted `Source:` lines under the
facts README. Acceptance adds "`git merge-base --is-ancestor <each lane's merge commit> HEAD`".

**M5. R3 misses a stage-2a relink entry whose file Kit 3 deleted, so R6's acceptance cannot be met** (L116-119,
L180). `docs/internal/record/harvest/relink.json:899` is `{"file": "examples/showcase/svelte.config.js", ...,
"stage": "2a"}`, and that file is gone on `main`. Task 9's acceptance requires every `relink.json` entry tagged `2a`
to show its restoring commit. No commit can restore a pointer into a deleted file. R3 covers only the outline's
copy of the entry (`extend.json` L1365, `relinkIndex` 122).
**Fold:** R3 also retargets that `relink.json` entry to the Kit 3 file that now holds the comment's `WATCH`. If no
successor holds it, R3 records the entry `done` with the reason, and R6 treats it as closed.

**M6. R4 has no failure path** (L133-158). R4 has no round cap, and none of the following is a conductor ruling or
a listed stop:
- a scoped read that returns `fix` again after its rewrite is applied;
- an add-cairn reader re-test that fails, for example milestones 1-3 not running on Kit 3;
- the custom-screen example not compiling.

The listed stop names only "a page still blocked after its targeted round", which is R5's mechanism. The pilot's
re-tests found real defects on two of six pages, so this branch is likely to fire.
**Fold:** R4 pages take R5's rule. One scoped redraft and one re-test follow a failed read or re-test. A page still
blocked after that stops 2a. A failure caused by an engine defect files friction, and the page documents the code
as it is (global constraints).

**M7. L2b's acceptance fails on a known environment artifact** (L211-215).
"Each touched spec passes `--repeat-each=10` locally" runs all of `admin-visual.spec.ts`, which holds 34
`toHaveScreenshot` assertions. `docs/internal/durable-gotchas.md` L41-49 records that this workstation fails
CI-canonical baselines. The criterion then fails for a reason unrelated to the fix. The result is a mid-run
judgment call and about 340 screenshot runs of wasted clock.
**Fold:** `--repeat-each=10 --grep` scoped to the zen-toggle test (`admin-visual.spec.ts:490`) and the preview
delete test (`preview.spec.ts:371`). CI e2e on the PR stays the full-suite proof.

**M8. R1's superset rule admits commands that defeat the gate** (L80-86). A contiguous `&&` run lets
`cd /some/other/tree && npm run check` match `npm run check`, so the gate runs against a different tree. Accepting any
leading `VAR=value` admits an assignment that changes what the gate runs. The two listed rejection cases do not
cover either one, so R1's own requirement ("a different command ... still mismatches") is not tested. This is
off the 2a critical path (m6), so the fix is cheap.
**Fold:** add rejection cases for a leading step that changes directory (`cd`, `pushd`) and for an assignment
outside an allowlist (`CAIRN_GATE_LANE`, `CI`). Accept only allowlisted assignments. Small location note: the block
sits at `pass-execute.js` L395-421 and `pass-execute-chains.js` L316-342, not L395-455.

## Minor

- **m1, R3's grep has no defined patterns** (L128). `checkOrigin` and `no-referrer` legitimately appear in Kit 3 facts
  ("the checkOrigin removal"). `csrf-disable` legitimately appears as a ruling id
  (`scripts/checks/check-rulings-format.mjs:72`, `audit-cli-config-csrf-disable-check`). Name the greps: zero hits for
  `examples/showcase/svelte.config.js` in `extend.json`, and zero hits for `'config.csrf-disable'` as a heuristic or
  check id in `check-tool-heuristics.mjs` and `tool-check-ids.mjs`. The diff-reviewer judges the "as current behavior"
  part.
- **m2, R5 inherits a pilot-era baseline** (L162, via task 6's acceptance). `rowsReceived` is computed "at the
  pre-pilot commit". For R5, use the commit before R5 launches, since R3's FV-10 retags change the map.
- **m3, R4 commits from parallel agents in one worktree** (L133-136). Three agents committing at once collide on
  `index.lock`, or one commit picks up a sibling's staged files and breaks the per-page file-set read. The drafters
  should not commit. One post-R4 implementer commits page plus brief per page, serially, as the governing plan's
  "After each run" does.
- **m4, L1's CI and majors** (L187-194). `e2e.yml` runs on push only for `main` and `rebuild`, so "CI e2e on the
  pushed branch" needs the PR open first. The hold list is closed, and a new major outside it hits the skill's
  "always ask" rule. Make the rule "hold every major, listed or not, and file each". A visual diff after the Svelte
  or Vite bumps needs a ruling: halt the lane, or run one `update_snapshots` regen. Halting the lane is the safe
  default.
- **m5, L2a's review chain** (L209-210). L2a has no `diff-reviewer`, and nothing says what happens to
  `go-architecture-reader` findings. State it: findings in changed code get one fix round, and the rest is filed.
- **m6, the execution mode for non-chain tasks is unstated.** The plan has 10 tasks, and the global rule sends six or
  more through `pass-execute`. Say which tasks go to the Agent tool and which go to `pass-execute`. If none use
  `pass-execute`, R1 serves future passes only, and its "gate-matcher artifact" ruling (L34) has no consumer here.
- **m7, the planning offset is unclear** (L49, L57). The executing session's `/cost` excludes the planning session's
  1.0M, while the 2a total includes it. State whether the 16M stop is session `/cost` alone or `/cost + 1.0M`.
- **m8, two gates are named for R2 and R3** (L91, L114 against L107, L128). "`engine-logic`'s gate" is the full gate
  (`npm test` included), and the acceptance lists a narrower set. Name one gate.
- **m9, a second `fix` on a docs task has no rule** (L35-36). The upshift rule covers only code tasks, so a second
  `fix` on R2, R3, or R6 is unruled. Extend the rule to every non-chain task.
- **m10, the review-page publish has no owner** (L223-224). Say whether R7 publishes it, as a private artifact
  linked in STATUS, or Geoff's next session does. As written, it reads as both.

## Proportionality (ranked by token cost, then clock)

- **P1, R4 over-ceremony.** Three of R4's seven pages carry only an alias substitution: `theme-your-public-site`,
  `replace-magic-links-with-cloudflare-access`, and `choose-an-ai-posture`. `architecture` is a check that may make
  no edit. Each still gets an Opus drafter plus scoped register and fact reads. The governing plan exempts pure term
  or link substitutions from scoped reviews. One Sonnet implementer can apply the four, with brief edits in the same
  commit and one diff-reviewer read. Saves roughly 0.5-0.8M of R4's 1.8M. Keep the full method for
  `add-cairn-to-a-sveltekit-app`, `security-model`, and `add-a-custom-admin-screen`.
- **P2, L2b's repeat scope** is the same item as M7, on clock time.
- **P3, R1 sits serially ahead of R2** while nothing in R2-R7 consumes it (m6). It can run beside R2 or move into L2.
  This saves clock only.

Everything else is proportionate. R5's `bothReviewers: true` rests on the pilot's measured cross-regression rate,
and the add-cairn reader re-test is the only proof that the Kit 3 rewrite works.

## Owner fork

**F1. Do the lanes start if 2a stops before R5's post-run commit?** The ruling starts the lanes after R5's post-run
commit "so neither delays the docs pages". A stop at an R5 page that stays blocked, or an R2 to R4 stop, leaves the
lanes unstarted, though they share no files with 2a.
- (a) As written: the lanes wait for R5's commit, and a 2a stop means no lanes.
- (b) The lanes start at R5's post-run commit or at any 2a stop, whichever comes first.

**Recommendation: (b).** The lanes cannot delay pages once 2a has stopped, and the unattended window is then spent
on work the owner already approved.
