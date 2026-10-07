# Stage 2a's unattended finish, with two side lanes

**Goal:** One unattended run finishes draft docs stage 2a on the SvelteKit 3 `main`: the pilot's six pages
corrected for Kit 3, task 8's five pages drafted through the chain, task 9's consistency read and relink, and the
close merged to `main`. Two side lanes, a dependency sweep and an engineering cleanup, land beside it. The
release is not part of this run.

**Governing plan:** `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` (on `draft-docs-2a`; on `main` after
R2's merge). Its global constraints, map rule, "After each run" record, scoped reviews, task 9, and task 10 hold
unless this plan says otherwise. Where the two disagree, this plan governs. Inputs:
`docs/superpowers/research/2026-10-03-draft-docs-2a-targeted-close-record.md` (the targeted-close method) and
`docs/superpowers/research/2026-10-06-draft-docs-2a-kit3-merge-map.md`, corrected by this plan's pre-flight
(2026-10-07; the corrections are written into R2 and R4 below).

**Pass class:** mixed, per task. **Checkpoint interval:** after R4, R5, R6, and the lanes (four checkpoints).
**Executing session:** `claude --model claude-opus-5-5` at `medium`, launched from `~/Projects/cairn-cms`. It stays
thin: it reads reports, records, and verdicts, never a page, a diff, or a gate log.

## Owner rulings (Geoff, 2026-10-07)

- **Ceilings.** 2a has a 20M hard ceiling and stops at 16M. The two lanes have a separate 4M ceiling and stop at
  3.2M. The whole run is capped at 24M. At 80 percent of a ceiling, the conductor finishes the task in flight, writes
  STATUS, and stops that track. A lane at its stop halts alone, and 2a carries on.
- **Side lanes.** The dependency sweep and the engineering lane both ride. Both start after R5's post-run commit,
  so neither delays the docs pages.
- **Escalation.** A task 8 page that ends the chain still escalated at the round cap is closed unattended by the
  pilot's targeted-close method (Geoff, 2026-10-03). A page still blocked after its one targeted round stops the run.
- **End gate.** On a green close the conductor pushes, opens the PR, and merges, for 2a and for each lane. Geoff reads
  the five new pages afterward on a review page, and his fixes land as a follow-up commit. No tag, no release, and no
  publish happen in this run.

## The unattended contract

**The conductor rules alone on:** a runner or gate-matcher artifact (re-verify, then accept); a flake covered by
the rerun rule in `docs/internal/durable-gotchas.md`; a `fix` verdict's single re-dispatch; a second `fix` on a code
task, settled by one upshifted round (`model: opus`); a register or fact-read finding resolved by applying the
reviewer's own proposed rewrite; and a merge hunk covered by R2's resolution rules.

**The run stops (STATUS written, then the session waits) on:** a ceiling's 80 percent mark; a code task still `fix`
after its upshifted round; a page still blocked after its targeted round; a merge hunk R2's rules do not cover; an
architectural question no spec settled; or any step that would need an irreversible act other than the authorized
merges.

**Guards at launch** (`~/.claude/docs/unattended-work-guards.md`): the fallback `/loop` wake-up, the lid-switch hold,
and `claude-wf-guard` on every workflow run (tier `writer` for the page chain, `implementer` otherwise). Before each
heavy gate expected to run past 15 minutes, check `ListAgents` and send any live session sharing the lock a one-line
heads-up (`~/.claude/docs/pass-gate-economy.md`).

**Counting:** the conductor's `/cost` at each boundary is the only running total. A lane's spend is the `/cost`
delta across its dispatches. When lane and 2a dispatches overlap, the conductor attributes each agent's usage
block to its track, as an estimate.

## Budget

| Share | Estimate |
| --- | --- |
| Planning session, with plan review | 1.0M |
| R1 matcher fix | 0.4M |
| R2 merge and R3 infra drift | 1.2M |
| R4 pilot Kit 3 corrections (six pages plus `choose-an-ai-posture`) | 1.8M |
| R5 task 8: five pages at about 1.8M, after the narrowed round 2 (the pilot measured 2.4M before it) | 9.0M |
| R6 task 9 | 1.5M |
| R7 close | 2.0M |
| Conductor | 1.5M |
| **2a total** | **18.4M** |
| L1 dependency sweep | 1.5M |
| L2 engineering lane | 2.5M |

The projection crosses the 16M stop during R6 or R7 if task 8 runs at the pilot's rate. In that case the run stops
cleanly at a task boundary, and the next session resumes from STATUS. Nothing is cut to fit.

## Tasks

### R1: the gate matcher accepts a superset command

**Pass class:** `engine-logic` (dotfiles). **Files:** `~/.dotfiles/claude/.claude/workflows/pass-execute.js`
(`GATE MATCHER` block, about L395-455), the identical block in `pass-execute-chains.js`, and
`~/.dotfiles/tests/pass-execute-runners.test.mjs`.

**Outcomes:** a reported gate command matches a task's gate string when it equals the gate after normalization,
when it differs only by leading `VAR=value` assignments (inside or outside the `cairn-run-gate` quotes), or when the
gate's command is a contiguous run of the reported command's `&&`-separated steps. A different command, or one that
drops any of the gate's steps, still mismatches. Both runner copies keep the block byte-identical.

**Acceptance:** test-first cases cover the three accepted forms and two rejections (a narrower command, a different
command). The dotfiles test suite and `scripts/check.sh` are green. One `diff-reviewer` read. The persisted runner
`cmp`s equal to the committed file.

### R2: merge `main` into `draft-docs-2a`

**Pass class:** `docs` with `engine-logic`'s gate. **Worktree:** `.claude/worktrees/draft-docs-2a`. One merge commit,
never a rebase.

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

**Acceptance:** after `npm ci` in the worktree (root and `examples/showcase`; the worktree-e2e gotcha), `npm run
check`, `npm run check:facts`, and the whole-tree `npm run check:docs-gate` are green. Facts that go red only because
of Kit 3 drift on 2a-added bullets are listed for R3 instead of being fixed here. One `diff-reviewer` read of the
resolution against these rules.

### R3: Kit 3 drift in 2a's infrastructure

**Pass class:** `docs`, with `engine-logic`'s gate for script edits. **Depends on:** R2.

**Outcomes:**
- `docs/internal/outlines/extend.json` no longer cites `examples/showcase/svelte.config.js`, `checkOrigin`, or
  `no-referrer` as current behavior (L274, L1060, L1365, L1946, L2055, L3433 at `9ca04531`). Each cite moves to its
  Kit 3 successor fact.
- No script under `scripts/checks/` names a retired doctor id as live (`config.csrf-disable` becomes
  `config.csrf-trusted-origins` as `main` has it).
- The 2a-added facts that state Kit 2 behavior (`f:g48ytv`, `f:jzm5ef`, `f:skeche`, `f:ghzx9c`, `f:j0ut9n`,
  `f:ppqu4v`, and any R2 listed) are rewritten to Kit 3 truth or retired under the facts README. Option-map rows
  follow the map rule's FV-10 order.
- The add-cairn plan and brief rows citing those ids are updated in step. The friction entries at 2a's
  `docs-friction-log.md` L623-630 are triaged complete-or-move (the SvelteKit 3 engine major has shipped).

**Acceptance:** `check:facts`, `check:docs-gate` (whole tree), and `check:provenance` are green. `grep` shows none
of the stale cites. One `diff-reviewer` read.

### R4: the pilot pages on Kit 3

**Pass class:** `docs`. **Depends on:** R3. The six pages are independent, so up to three run in flight.

**Method:** the parent spec's "Edits after the chain", one Opus `cairn-docs-drafter` per page with only that page's
claim list. Each page's brief changes in the same commit. Scoped `cairn-register-editor` and fact reads cover the
changed sentences, and any `fix` is applied before the commit. The final reader re-test runs on `add-cairn-to-a-sveltekit-app` (milestones 1-3 end to end in a scratch Kit 3 app under
`$HOME/.cache`) and on `add-a-custom-admin-screen` (the example compiles in a showcase scratch copy).

**Claim lists** (line numbers at `9ca04531`):
- `add-cairn-to-a-sveltekit-app`: L54 aside; the SvelteKit 2 pin at L60-64 and L83-87, replaced by Kit 3 and adapter 8;
  the tsconfig form at L90-109, replaced by `$app/tsconfig`; `csrf: { checkOrigin: false }` at L512 and L709, with
  the block deleted (never `trustedOrigins: ['*']`); L477's origin-check prose; `$lib` imports at L417, L432, L445,
  L759, and L760, replaced by `#lib`.
- `security-model`: L154 and L476 (`checkOrigin`); L160, L184-186, L217, and L478 (admin `no-referrer`, which Kit 3
  replaced with `strict-origin` through a header and a meta); L166's deprecation sentence; L167's anchor, which
  becomes `#the-checkorigin-removal`; L187-188's doctor id, checked against `main`; L231 (csp's home); L245 (Worker env
  only).
- `add-a-custom-admin-screen`: L149, L157, L164, L165, and L212 (`App.Platform['env']` and `ctx.waitUntil`, replaced
  by wrangler's `Env` type and `cloudflare:workers`).
- `theme-your-public-site`: L282 `$chassis` becomes `#chassis`.
- `replace-magic-links-with-cloudflare-access`: L290 `$lib/` becomes `#lib/`.
- `architecture`: L61 is checked and left alone if it is framework-neutral.
- `choose-an-ai-posture` (a kept page): L61-62's `$chassis` and `$theme` imports, changed together with its brief.

**Acceptance:** per page, the scoped reads accept and the re-tests pass where they apply. The whole-tree docs gate is
green. A stage record under `docs/superpowers/research/` lists each page's changes and verdicts. One `diff-reviewer`
file-set read. **Checkpoint 1** (STATUS on `main`).

### R5: task 8, the rest of 2a

As the governing plan's task 8, with these settings. Use the `docs-page-chain` workflow by name.
`outline: "docs/internal/outlines/extend.json"`, `inFlight: 3`, `bothReviewers: true`, with the defect `extraChecks`
from the governing plan's table, the gate `npm run check:docs-gate -- --page {page} --brief {brief}`, and `gateLane:
"light"`. No owner fold notes are pending. Before launch, `cmp` the persisted script against the committed file.

The pages are `scaffolded-site-files` (concept, 49 fact ids), `restrict-admin-access` (18, with 3 map rows pending),
`add-a-second-sign-in-group` (27, with 19 pending), `rotate-the-github-app-key` (13), and `debug-your-site` (26). None
exists yet.

**Escalated pages** take the targeted close (owner ruling above), following the record's method. One Opus drafter
fixes only that page's final-round blocking findings. Scoped register and fact reads cover the changed sentences. The
final reader read comes last, and its fix gets one scoped redraft and one re-test.

**After the run:** the governing plan's post-run record and commit, with the targeted-close rulings listed for
Geoff. **Checkpoint 2.**

### R6: task 9, consistency read and relink

As the governing plan's task 9. `<base>` is R5's post-run commit. **Checkpoint 3.**

### L1: dependency sweep (lane)

**Pass class:** per the `dependency-upgrade` skill, which governs. **Worktree:** a new `deps-2026-10` off `main`.
**Starts:** after R5's post-run commit.

Take every minor and patch across the root, `examples/showcase`, `packages/*`, and `templates/waymark`, including
wrangler 4.148, Vite 8.3.3, and Svelte 5.57.2, plus the Go module's minor and patch updates. Hold every major: `devalue` 6,
TypeScript 7, Vitest 5 (with `@vitest/browser*`), `@types/node` 26, and the Go modules whose version scheme jumped
(`x/exp/golden`, `xo/terminfo`, `check.v1`). Each held major keeps its unblock condition and its tripwire. The skill's
survey record, refactor-decision table, gates (including CI e2e on the pushed branch), and CHANGELOG entry are all
required. A take-now refactor stays small and tested. Anything larger is filed.

**Acceptance:** the skill's report shape, CI green on all workflows, and one `diff-reviewer` read. Merged to `main` on
green.

### L2: engineering lane

**Worktree:** a new `eng-cleanup` off `main`. **Starts:** after R5's post-run commit, beside L1. Its two tasks touch
disjoint files and run serially in the worktree.

- **L2a, the doctor package cleanup.** Pass class `tool`. The source is the friction entry at `main`'s
  `docs/internal/docs-friction-log.md:58-67`. Its items (a) through (g) are in scope: unexport the symbols that have no
  outside caller (`Results` changes its one call site at `tool/cmd/cairn/doctor.go:72`); reconcile `isLocal` and
  `isLocalOrigin` on `::1`, with a test that pins the chosen behavior; collapse the triplicate lookup; and handle the
  `failResult` rebuild, the three first-existing-file loops, the test-only fields, and the stale TypeScript cites.
  Item (h) stays: `spine.Conditions()` is a deliberate 2.0 seam (`spine/condition.go:74`). The entry is closed with
  that reason. A behavior change gets a `tool/CHANGELOG.md` `## Unreleased` line.
  **Acceptance:** `make -C tool check` green (light lane) and one `go-architecture-reader` over `tool/internal/doctor`
  at the lane's close.
- **L2b, the e2e timing flakes.** Pass class `engine-logic` gate, test-only. The zen-toggle test
  (`examples/showcase/e2e/admin-visual.spec.ts:490`) asserts the animation's start and end values, or samples until
  the animation settles, never a longer window. `e2e/preview.spec.ts`'s delete click waits on a real readiness
  signal. The tidy entry (`docs-friction-log.md:86-91`) is verified as fixed by `fbac121f`, then deleted with that
  reason. **Acceptance:** each touched spec passes `--repeat-each=10` locally and CI e2e is green. One
  `diff-reviewer` read.

The lane merges to `main` on green. **Checkpoint 4** comes when both lanes are done.

### R7: close

As the governing plan's task 10, with three changes. It merges `main` in after both lanes have merged, so the
close gate covers them. The release stays held. STATUS's next action becomes Geoff's read of the five task 8 pages
(publish the review page with each page's plan linked), then the release with Kit 3 and the rebuilt extend docs, then
cairn.pub's migration as a site pass. The HISTORY entry scores both budgets for each track.

## Ledger

| Task | Commit | Verdict | Tokens |
| --- | --- | --- | --- |
| Planning (this plan, pre-flights, review) | | | |
