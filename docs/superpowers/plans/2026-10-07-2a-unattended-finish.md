# Stage 2a's unattended finish, with two side lanes

**Goal:** One unattended run finishes draft docs stage 2a on the SvelteKit 3 `main`: the pilot's six pages
corrected for Kit 3, task 8's five pages drafted through the chain, task 9's consistency read and relink, and the
close merged to `main`. Two side lanes, a dependency sweep and an engineering cleanup, land beside it. No release.

**Governing plan:** `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` (on `draft-docs-2a`; on `main` after
R7's merge). Its global constraints, map rule, "After each run" record, scoped reviews, task 9, and task 10 hold
unless this plan says otherwise. Where the two disagree, this plan governs. Inputs:
`docs/superpowers/research/2026-10-03-draft-docs-2a-targeted-close-record.md` (the targeted-close method) and
`docs/superpowers/research/2026-10-06-draft-docs-2a-kit3-merge-map.md`, corrected by this plan's pre-flight
(2026-10-07; the corrections are written into R2 and R4 below).

**Pass class:** mixed, per task. **Checkpoint interval:** after R4, R5, R6, and the lanes (four checkpoints).
R2 to R4 are one segment, green at R4's commit. **Executing session:**
`claude --model claude-opus-5-5` at `medium` from `~/Projects/cairn-cms`, thin: it reads reports, records, and
verdicts, never a page, a diff, or a gate log. Every task but R5 runs per task through the Agent tool chain; R5 runs
`docs-page-chain`. None uses `pass-execute`.

## Owner rulings (Geoff, 2026-10-07)

- **Ceilings.** 2a has a 25M hard ceiling and stops at 20M. The two lanes share one 5M ceiling and stop at 4M. The
  whole run is capped at 30M. At 2a's stop, the conductor finishes the 2a task in flight, writes STATUS, and stops
  2a. At the lane stop, each lane task in flight finishes, and no new task starts in either lane; both lanes then
  halt.
- **Side lanes.** The dependency sweep and the engineering lane both ride. Both start at R5's post-run commit or at
  a 2a stop, whichever comes first, so neither delays the docs pages.
- **Escalation.** A task 8 page that ends the chain still escalated at the round cap is closed unattended by the
  pilot's targeted-close method (Geoff, 2026-10-03). A page still blocked after its one targeted round stops 2a.
- **End gate.** On a green close the conductor pushes, opens the PR, and merges, for 2a and for each lane. Geoff reads
  the five new pages afterward on a review page; his fixes land as a follow-up commit. No tag, release, or publish.

## The unattended contract

**The conductor rules alone on:** a runner or gate-matcher artifact (re-verify, then accept); a flake covered by
the rerun rule in `docs/internal/durable-gotchas.md`; an ENOSPC or quota failure inside a gate (an environment
artifact: clear scratch, rerun); a `fix` verdict's single re-dispatch; a second `fix` on any non-chain task,
settled by one upshifted round (`model: opus`); a register or fact-read finding resolved by applying the
reviewer's own proposed rewrite; a merge hunk covered by the standing merge rules below; and a reader re-test
finding caused only by the unreleased engine missing from npm (the registry serves 0.98.0, Kit 2). That finding is
disposed "unexercised: unreleased engine" in the page's record and on the review page, never redrafted.

**Stops are per track.** 2a and each lane are tracks. A track stops on: its ceiling's 80 percent mark; a task still
`fix` after its upshifted round; a page still blocked after its targeted round or its one R4 redraft; a merge hunk
the standing rules do not cover; an architectural question no spec settled; or any step
that would need an irreversible act other than the authorized merges. A stopping track first WIP-commits its
completed files on its own branch (specific paths, never `-A`), then writes STATUS with that commit and any
`resumeFromRunId`. Other tracks run on; the session waits when none is left. A halted lane's branch stays open,
named in STATUS. A red `main` after any merge stops every track.

**`main` and merges.** `origin/main` is the source of truth. Each checkpoint runs `git fetch`, `git merge --ff-only
origin/main`, commits STATUS, and pushes; a push that is not a fast-forward stops the run. Each lane branches from
`origin/main` after a fetch. Every PR merge (each lane, then 2a) follows one procedure: all workflows on the PR are
green (`gh pr checks --watch`, run only after the PR's checks have registered; `main` has no branch protection,
so the conductor's check is the gate); after `git fetch`, `git merge-base --is-ancestor origin/main
origin/<branch>` passes, or `origin/main` is merged into the branch, pushed, and its checks re-registered and
watched (`baseRefOid` is not the test: PR #103's named `5c47a6e3` while `main` stood at `481b811d` at its merge).
After the merge, `main`'s push CI is watched to green before the next merge or R7's own.

**Standing merge rules** (every merge in this run, after R2's file rules): STATUS takes `main`'s. HISTORY,
`CHANGELOG.md` and `tool/CHANGELOG.md` `## Unreleased`, ROADMAP, and the friction log keep both sides' entries, and a
deletion on one side wins over an untouched copy on the other. Fact bullets with distinct ids keep both; a drifted
`Source:` is retargeted under the facts README; a bullet edited on both sides takes `main`'s `Source:` line and the
branch's text, and the task's scoped fact read and `check:facts` judge it. `package.json` takes each version from
the side that bumped it and the union of both sides' scripts; `package-lock.json` takes `main`'s, followed by
`npm ci`. Any other hunk stops the track.

**Guards at launch** (`~/.claude/docs/unattended-work-guards.md`): the fallback `/loop` wake-up, the lid-switch hold
with a duration at least the run's length, the battery stand-down, and `claude-wf-guard` on every workflow run (tier
`writer` for the page chain, `implementer` otherwise). Before each heavy gate expected to run past 15 minutes, check
`ListAgents` and send any live session sharing the lock a one-line heads-up (`~/.claude/docs/pass-gate-economy.md`).
The session launches with `TMPDIR` under `$HOME/.cache`, so workflow agents inherit it, and every dispatch puts
scratch there, never `/tmp`. The conductor reads `quota -s`'s `/tmp` row at each checkpoint and clears its scratch
above 4.5G. The quota is per user and shared with other sessions: if usage is still above 4.5G after that, the
conductor starts no new heavy gate, and the track stops. Gates run only in worktrees after `npm ci` (root and
showcase).

**Counting:** 2a's position is `/cost` plus the 1.0M planning share, minus the lanes' spend, which is the sum of
their own agents' usage blocks. The backstop is the conductor's `/cost` read at each task boundary and before each
targeted close, plus `claude-wf-guard` on every workflow run. R5 launches near 4.2M, so its 12.5M estimate leaves
about 8M of headroom to the 25M hard ceiling.

## Budget

| Share | Estimate |
| --- | --- |
| Planning session, with plan review | 1.0M |
| R1 matcher fix | 0.4M |
| R2 merge and R3 infra drift | 1.2M |
| R4 pilot Kit 3 corrections (three full, four by substitution) | 1.2M |
| R5 task 8: five pages at about 1.8M, plus a targeted close at about 0.7M a page (every pilot page escalated) | 12.5M |
| R6 task 9 | 1.5M |
| R7 close | 2.0M |
| Conductor | 1.5M |
| **2a total** | **21.3M** |
| L1 dependency sweep | 1.5M |
| L2 engineering lane | 2.5M |

The 21.3M projection fits the 25M ceiling. With the conductor's share spread across tasks, 2a sits near 19.2M when
R7 starts, so R7 runs as the task in flight past the 20M stop and closes. If task 8 overruns by more than about
0.8M, the stop falls inside R6: R6 finishes, 2a stops before R7, and the next session resumes from STATUS. An
overrun past about 2.3M puts the stop inside R5, which finishes with its targeted closes and post-run commit before
2a stops. The lanes' 4.0M estimate meets their 4M stop only as their last task ends. The whole run projects to
25.3M against the 30M cap. Nothing is cut to fit.

## Tasks

### R1: the gate matcher accepts a superset command

**Pass class:** `engine-logic` (dotfiles). **Runs:** beside R2 (`~/.dotfiles` is a disjoint repo), after `pgrep -f
pass-execute` and `ListAgents` show no live run using the runner. **Files:**
`~/.dotfiles/claude/.claude/workflows/pass-execute.js` (`GATE MATCHER` block, L395-421), the identical block in
`pass-execute-chains.js` (L316-342), and `~/.dotfiles/tests/pass-execute-runners.test.mjs`.

**Outcomes:** a reported command matches a gate when it equals the gate after normalization, or when it differs
only by (a) leading assignments inside the `cairn-run-gate` quotes, or (b) extra `&&` steps after the gate's own
steps, or extra leading steps that are each an assignment (`VAR=value` or `export VAR=value`). Every accepted
assignment names an allowlisted variable (`CAIRN_GATE_LANE`, `CI`, `E2E_PORT`). Any other extra leading step
(`cd`, `pushd`, any command) mismatches, as does a non-allowlisted assignment, a different command, or one that
drops a gate step. These rules apply to the steps inside the `cairn-run-gate` quotes, or to an unwrapped command.
Everything before `cairn-run-gate` stays discarded as today (the runner tells implementers to `cd` first, so
`cd <repo> && cairn-run-gate '...'` must keep matching); a test pins that prefix discard, `cd` included.
Both runner copies keep the block byte-identical (the existing parity test).

**Acceptance:** test-first cases cover each accepted form and each rejection named above. The dotfiles suite and
`scripts/check.sh` are green. One `diff-reviewer` read. Nothing in this run consumes R1; STATUS records it for future
unattended runs, and the persisted-runner `cmp` runs at its first launch.

### R2: merge `main` into `draft-docs-2a`

**Pass class:** `docs`. **Worktree:** `.claude/worktrees/draft-docs-2a`. One merge commit, never a rebase.

**Resolution rules** (pre-flight, 2026-10-07: 5 files and 14 hunks):
- `docs/internal/facts/extend.md` (9 hunks) and `facts/admin.md` (1): take `main`'s bullet. Re-apply 2a's own edit
  only where it still holds against Kit 3 code at the merged HEAD. Keep every id that exists on only one side (2a's
  `v85shm`, `16cx9j`, `s9s8mw`, `ojr3qm`, `pwmybh`; `main`'s `5w9s38`, `peks2u`, `yw90zn`, `ju2l4b`, `f3zp4n`,
  `1stlyv`). A kept 2a id whose `Source:` no longer resolves is fixed under the facts README, never dropped.
  `f:67pwmj` takes `main`'s doctor id.
- `facts/reference.md` `f:xg1per`: take `main`.
- `package.json`: combine both sides (2a's `check:options` in `check:close`, and `main`'s `tsc -p
  src/tests/types/tsconfig.json` in `check`).
- `docs/internal/docs-register.md`: `main`'s `### The introduction` section governs the introduction rule. Keep 2a's
  expanded Tutorial bullet and add `main`'s "introduction is the one exception" sentence to the guide bullet. Keep 2a's
  closing-section rule, pointing at the introduction section instead of restating it. Keep both citation paragraphs.
- The two anchors to `supported-toolchain.md#the-checkorigin-deprecation` (`add-cairn-to-a-sveltekit-app.md:477`,
  `security-model.md:167`) become `#the-checkorigin-removal`, a pure link substitution.

**Acceptance:** after `npm ci`, `npm run check` is green and the merge is clean (no conflict markers, the rules
met). `check:facts`, `check:provenance`, and the whole-tree `check:docs-gate` run and are recorded verbatim in the R2
report; their failures must be confined to 2a-added facts (expected: `f:6vy0ka`, `f:j0ut9n`, `f:2zl3qz`, `f:34rsss`)
and to the seven R4 pages and their briefs. Any failure outside that set stops 2a. One `diff-reviewer` read of the
resolution against these rules.

### R3: Kit 3 drift in 2a's infrastructure

**Pass class:** `docs`. **Depends on:** R2.

**Outcomes:**
- `docs/internal/outlines/extend.json` has zero cites of `examples/showcase/svelte.config.js`, and no cite of
  `checkOrigin` or `no-referrer` as current behavior (L274, L1060, L1365, L1946, L2055, L3433 at `9ca04531`). Each
  cite moves to its Kit 3 successor fact.
- `docs/internal/record/harvest/relink.json:899` (the stage-2a entry in the deleted `svelte.config.js`) is retargeted
  to the Kit 3 file that now holds its `WATCH`, or, with no successor, recorded `done` with the reason; R6 treats it
  as closed.
- The merge already retired `config.csrf-disable` in `scripts/checks/tool-check-ids.mjs`; R3 confirms zero hits
  for `'config.csrf-disable'` as a check id there and in `check-tool-heuristics.mjs` (the ruling id stays).
- The 2a-added facts that state Kit 2 behavior (`f:g48ytv`, `f:jzm5ef`, `f:skeche`, `f:ghzx9c`, `f:j0ut9n`,
  `f:ppqu4v`, `f:ph6kjg`, and R2's list) are rewritten in place to Kit 3 truth. A fact a brief still cites is never
  retired; an uncited one may be retired under the facts README. Option-map rows follow the map rule's FV-10 order.
- The add-cairn plan and brief rows citing those ids are updated in step. The friction entries at 2a's
  `docs-friction-log.md` L623-630 are triaged complete-or-move (the SvelteKit 3 engine major has shipped).

**Acceptance:** `check:facts` is green. `check:provenance` and the docs gate fail only on the seven R4 pages and
their briefs, and that list is R4's input. The named greps are clean. One `diff-reviewer` read.

### R4: the pilot pages on Kit 3

**Pass class:** `docs`. **Depends on:** R3. The first task whose acceptance needs the whole-tree gate green.

**Claim lists** are the union of the hand lists below, every `check:provenance` and `docs-links` failure on the page
at R3's HEAD, and a grep at R3's HEAD for `\$lib|\$chassis|\$theme|svelte\.config|checkOrigin|no-referrer|
platform\.env|App\.Platform|invalidateAll|csrf-origin-mismatch|waitUntil|SvelteKit 2|\^2\.70`.

**Method.** The three pages with behavior changes (`add-cairn-to-a-sveltekit-app`, `security-model`,
`add-a-custom-admin-screen`) take the parent spec's "Edits after the chain": one Opus `cairn-docs-drafter` per page
with only its claim list, up to three in flight, then scoped `cairn-register-editor` and fact reads over the
changed sentences, with any `fix` applied. The four substitution-only pages take one Sonnet implementer and no
scoped reads (the governing plan exempts pure term or link substitutions). A failed read or re-test gets one scoped
redraft and one re-test; a page still blocked after that stops 2a. A failure caused by an engine defect files
friction, and the page documents the code as it is. Drafters and readers never commit: one implementer commits
afterward, one commit per page (page plus brief, explicit paths), in series.

**Re-tests.** `add-cairn-to-a-sveltekit-app` runs milestones 1-3 in a scratch Kit 3 app under `$HOME/.cache`, the
engine installed from the merged HEAD by `npm run link:consumer` (the page keeps the registry command), through the
last local step (`wrangler deploy --dry-run`, dev sign-in, content build). It never runs `wrangler login`, `wrangler
deploy`, or a push, and the stage record lists what stayed unexercised; R5's re-tests take the same scope.
`add-a-custom-admin-screen`'s example compiles in a showcase scratch copy.

**Hand lists** (line numbers at `9ca04531`):
- `add-cairn-to-a-sveltekit-app`: L54 aside; the SvelteKit 2 pin at L60-64 and L83-87, replaced by Kit 3 and adapter 8;
  the tsconfig form at L90-109, replaced by `$app/tsconfig`; `csrf: { checkOrigin: false }` at L512 and L709, with
  the block deleted (never `trustedOrigins: ['*']`); L477's origin-check prose; L229's `App.Platform` sentence (now
  wrangler's `Env`); `$lib` imports at L417, L432, L445, L759, and L760, replaced by `#lib`.
- `security-model`: L154 and L476 (`checkOrigin`); L160, L184-186, L217, and L478 (admin `no-referrer`, which Kit 3
  replaced with `strict-origin` through a header and a meta); L163's `auth.csrf-origin-mismatch` page, which no
  source on `main` defines; L166's deprecation sentence; L187-188's doctor id, checked against `main`; L231 (csp's
  home); L245 (Worker env only).
- `add-a-custom-admin-screen`: L149, L157, L164, L165, L212, L223-224, and L234 (`App.Platform['env']` and
  `ctx.waitUntil`, replaced by wrangler's `Env` type and `cloudflare:workers`); L357's `invalidateAll()`, now
  `refreshAll()`.
- Substitution only: `theme-your-public-site` L282 `$chassis` to `#chassis`;
  `replace-magic-links-with-cloudflare-access` L290 `$lib/` to `#lib/`; `choose-an-ai-posture` L61-62's `$chassis`
  and `$theme` imports, with its brief; `architecture` L61, checked and left alone if framework-neutral.

**Acceptance:** per page, the scoped reads accept and the re-tests pass where they apply. The whole-tree docs gate,
`check:facts`, and `check:provenance` are green. A stage record under `docs/superpowers/research/` lists each page's
changes, verdicts, and unexercised steps. One `diff-reviewer` file-set read. **Checkpoint 1.**

### R5: task 8, the rest of 2a

As the governing plan's task 8, with these settings. Use the `docs-page-chain` workflow by name.
`outline: "docs/internal/outlines/extend.json"`, `inFlight: 3`, `bothReviewers: true`, with the defect `extraChecks`
from the governing plan's table, the gate `npm run check:docs-gate -- --page {page} --brief {brief}`, and `gateLane:
"light"`. No owner fold notes are pending. Before launch, `cmp` the persisted script against the committed file.
`rowsReceived` is computed at the commit before R5 launches, not the pre-pilot commit.

The pages (none exists yet) are `scaffolded-site-files` (concept, 49 fact ids), `restrict-admin-access` (18, 3 map
rows pending), `add-a-second-sign-in-group` (27, 19 pending), `rotate-the-github-app-key` (13), `debug-your-site` (26).

**Escalated pages** take the targeted close (owner ruling above), following the record's method. One Opus drafter
fixes only that page's final-round blocking findings. Scoped register and fact reads cover the changed sentences. The
final reader read comes last, and its fix gets one scoped redraft and one re-test.

**After the run:** the targeted closes land first, then the governing plan's post-run record and commit, with the
targeted-close rulings listed for Geoff. **Checkpoint 2.**

### R6: task 9, consistency read and relink

As the governing plan's task 9. `<base>` is R5's post-run commit. **Checkpoint 3.**

### L1: dependency sweep (lane)

**Pass class:** per the `dependency-upgrade` skill, which governs. **Worktree:** a new `deps-2026-10` off
`origin/main`. The implementer has no Skill or schedule tool: its dispatch hands the skill by path
(`~/.dotfiles/claude/.claude/skills/dependency-upgrade/SKILL.md`) and returns each held major's tripwire
condition, and the conductor creates the tripwires.

Take every minor and patch across the root, `examples/showcase`, `packages/*`, and the Go module, including wrangler
4.148, Vite 8.3.3, and Svelte 5.57.2. `templates/waymark` is bumped at its source and re-emitted with `npm run
emit:template`, never hand-edited. Hold every major, listed or not, and file each: `devalue` 6, TypeScript 7, Vitest
5 (with `@vitest/browser*`), `@types/node` 26, and the Go modules whose version scheme jumped (`x/exp/golden`,
`xo/terminfo`, `check.v1`). Each keeps its unblock condition and tripwire. A visual-baseline move halts the lane. The
skill's survey record, refactor table, gates, and CHANGELOG entry are required; a take-now refactor stays small and
tested, and anything larger is filed.

**Acceptance:** the skill's report shape, the PR open with all workflows green (e2e runs on the PR, not on a branch
push), and one `diff-reviewer` read. Merged by the merge procedure.

### L2: engineering lane

**Worktrees:** beside L1, its two tasks run serially on separate branches, L2b first (the flakes cost CI time every
pass). L2b branches from `origin/main` and merges its own PR by the merge procedure before L2a starts. L2a then
branches from `origin/main` after a fetch, so a halted L2a never holds L2b back.

- **L2b, the e2e timing flakes.** Pass class `engine-logic` gate, test-only. The zen-toggle test
  (`examples/showcase/e2e/admin-visual.spec.ts:490`) samples until the animation settles, or checks an intermediate
  value, never a longer window, and keeps proving the animation runs through intermediate `margin-left` values.
  `e2e/preview.spec.ts:371`'s delete click waits on a real readiness signal. The tidy entry
  (`docs-friction-log.md:86-91`) is deleted with both causes named: `tidy.spec.ts` fixed by `fbac121f`, and
  `preview.spec.ts:371` fixed here. **Acceptance:** each touched test passes `--repeat-each=10 -g <that test>`
  locally (never the whole spec: the CI-baseline gotcha), CI e2e is green on the PR, and one `diff-reviewer` read.
- **L2a, the doctor package cleanup.** Pass class `tool`. The source is the friction entry at `main`'s
  `docs/internal/docs-friction-log.md:58-67`. Its items (a) through (g) are in scope: unexport the symbols that have no
  outside caller (`Results` changes its one call site at `tool/cmd/cairn/doctor.go:72`); reconcile `isLocal` and
  `isLocalOrigin` so both treat `::1` as local, like `127.0.0.1` (it is the loopback address, RFC 4291 §2.5.3), with a
  test that pins it; collapse the triplicate lookup; and handle the `failResult` rebuild, the three first-existing-file
  loops, the test-only fields, and the stale TypeScript cites. Item (h) stays: `spine.Conditions()` is a deliberate 2.0
  seam (`spine/condition.go:74`). The entry is closed with that reason. The `::1` change gets a `tool/CHANGELOG.md`
  `## Unreleased` line and retags any fact that states the old behavior.
  **Acceptance:** `make -C tool check` green (light lane), plus `check:facts` and `check:provenance` green in the
  lane worktree (78 facts cite doctor lines, and CI ignores `tool/**`), any moved `Source:` retargeted in the same
  commit. One `diff-reviewer` read; one `go-architecture-reader` over `tool/internal/doctor` at the lane's close,
  whose findings in changed code get one fix round and the rest are filed.

Each lane merges by the merge procedure. **Checkpoint 4** comes when each lane is merged or halted.

### R7: close

As the governing plan's task 10, with these changes. It starts when each lane is merged or halted, then fetches and
merges `origin/main` under the standing rules; `git merge-base --is-ancestor` shows every merged lane in HEAD before
the close gate. One scoped fact read then covers each 2a-branch fact whose `Source:` names a file the lanes changed
(`git diff --name-only <R2 merge>...origin/main`), and the sentences citing it. The release stays held. R7's fold
agent writes the review page file: the five task 8 pages, each marked "targeted close" or "chain accept" with its
rulings and plan. The conductor publishes it as a private artifact; if publishing raises a permission prompt, it
becomes an owner-attended step and STATUS records the file path. STATUS links it; its next action is Geoff's read, then the release with Kit 3 and the rebuilt
extend docs, then cairn.pub's migration as a site pass. HISTORY scores both budgets per track and names any halted
lane's open branch.

## Ledger

| Task | Commit | Verdict | Tokens |
| --- | --- | --- | --- |
| Planning (this plan, pre-flights, review) | | | |
| R5 rotate-the-github-app-key: scoped-read fixes (L18, L21, L69 sentences; f:vg42j3 amended) | 9f0b8add | targeted close | |
| R5 reader re-test: one blocker resolved by the reader's own rewrite (L141); conductor ruling, pilot precedent, no further round | 9f0b8add | | |
| R5 debug-your-site: round-2 advisory rewrites (check order and check 4, access_map_not_attached fix scoped to devBackendHandle, Record contents referent, site-facts paragraph, L20-21 split, L36, L203, L293 re-wrap, f:twqb0s cite) | 9f0b8add | | |
