# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries TEN
passes unpublished under `## Unreleased`: toolkit-seams, harvest-detection, csrf-hardening
(slice 1), foundations A (2a), foundations B (2b), retires (3), conventions (4a, PR #43),
conformance (4b, PR #46), internals (5, PR #47), and internals-B (6, merged 2026-09-04 at
`0ac9b40a`, PR #48, CI green); the window holds until the polish slice per the amended
initiative design. CI on `main` is fully green.

## Immediate next action

**INTERNALS-C: ALL 13 TASKS ACCEPTED (2026-09-05), pass-end ritual in progress** on
`internals-c` (28 commits over `main`): Task 7 closed at `35282ce0`, Task 10 at `217c39b5`.
Ritual state: code-simplifier landed (`6462b2fc`, 29 commits); the full named gate list
with the from-scratch showcase install and e2e, and the Svelte, security, and Workers reviewers
are running (2026-09-05); then the docs dimension (CHANGELOG, migration notes, ROADMAP, HISTORY, the plan's
post-mortem, STATUS), push, PR, merge on green CI (authorized). Merge note: `routed-inputs.md`
under the chassis-inputs record was copied whole onto the branch and will conflict as both-added;
take the branch version (main's content plus section 10) (3b after an escalation the conductor ruled: the
process-reference rule widened to a curated shape list, consumer names purged by hand with
no rule enumerating them; final commit `5248fed8`) (3a after two fix rounds, the second decided by the
conductor: five exact comment rewrites, `0ad68a0d`; rulings recorded in the 3b dispatch: bare
functional-spec citations and `R4` ledger vocabulary stay) (chain R complete at `634fdf16`, run `wf_b02e967c-515`, 0.56M; both sweeps
annotate survivors as `// idioms-allow: as-never  <reason>` with two spaces, so 6c's rule
matches the prefix, not the separator) (Task 8 after an escalation decided by the conductor, complete the
`cairn.config.ts` location migration on the scaffold's `$theme/cairn.config.js` spelling,
plus two fix rounds; Task 5's gate re-proven green on an idle machine). Chains Q and T are
MERGED into `internals-c` (`78af949d`, `724296c2`). Chain R is MERGED into `internals-c` (`02a2fda7`).
Then chassis-A per the queued entry below; pass-end ritual; push, PR, merge on green
CI (authorized). Spend: 1.57M for phase 1 plus about 0.6M of fix and review dispatches, of
the 6.5M ceiling. Lesson: three concurrent full gates on this 15 GB / 8-core machine cause
load-induced timeouts; two is the ceiling. If a cold session finds this line: inspect the
branches and both run journals before re-dispatching; accepted commits merge, unfinished
tasks re-run. Never let two writers share one worktree.

**Execute internals-C** (audit-remediation slice 7, coherence). The plan is
`docs/superpowers/plans/2026-09-03-internals-c-pass.md`: 13 tasks, ceiling 6.5M, checkpoints
4/8/12, workflow mode with explicit per-task dependencies, worktree
`.claude/worktrees/internals-c` off `main` (post-B), from-scratch showcase `npm ci` before
trusting any e2e. Its anchors were reconciled against the post-B tree on 2026-09-04
(`754d5057`; one reconciliation note under Task 7), so it dispatches as written. **The plan is
APPROVED (Geoff, 2026-09-03 evening, with internals-B, via the approval-gate question) with
full git authorization: push the branch, open the PR, and merge on green CI.** Arm the
workflow runaway guard before dispatching (`~/.claude/docs/unattended-work-guards.md`); add
the sleep inhibitors and battery watchdog only when running unattended on battery. On any
blocker, stop, WIP-commit, write STATUS with the resume state. After C: chassis, then polish,
ONE release cut after polish. Resume prompt: "In ~/Projects/cairn-cms, invoke cairn-pass and
execute the approved internals-C plan
(docs/superpowers/plans/2026-09-03-internals-c-pass.md) per its workflow mode: arm the
runaway guard, run the pass and its full ritual, push, PR, merge on green CI. The approval
and the git authorization are recorded in this STATUS entry."

One execution rule from internals-B's close, binding on every pass: **never let parallel
writers share one worktree.** Two of three parallel pass-end fixers ran `git stash` in the
shared `internals-b` worktree and transiently clobbered each other. Give each parallel
writer its own worktree (the chain worktrees did this correctly), or serialize.

**QUEUED AFTER INTERNALS-C (Geoff, 2026-09-04): chassis-A, added to this run.** Spec
`docs/superpowers/specs/2026-09-04-chassis-passes-design.md` (brainstormed and ratified
2026-09-04, revised after a three-lens review banked at
`docs/internal/record/2026-09-04-chassis-inputs/`); plan
`docs/superpowers/plans/2026-09-04-chassis-a-pass.md` (12 sequential tasks, ceiling 7.5M,
checkpoints 4/8/12, worktree `.claude/worktrees/chassis-a` off post-C `main`; its own
three-lens review is folded before dispatch). Geoff's "add this work to the existing
workflow" is the approval and carries the same authorization: push, PR, merge on green CI;
after both review rounds folded, Geoff ruled the plan STANDS AS WRITTEN (2026-09-04), so the
seven conductor calls it records (trio shape, `/render` type-only, header prefix dropped,
`createSectionAction` unadopted, tests shipping to the scaffold, the Prettier values, the
archive proof in B) need no re-confirmation at dispatch.
Sequence: internals-C ritual and merge; reconcile chassis-A's anchors and its Task 10
conditional against merged main; execute chassis-A the same way. Chassis-B's plan is
authored after A lands (spec section "Chassis-B").

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site's sheet is
committed at `docs/2026-08-22-cairn-0.96-update-instructions.md`; a 2026-08-29 survey confirmed
no consumer repo is ahead of origin, so the sheets are pushed. 907-life is eleven releases
behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3, 4a, 4b, 5 (internals), and 6
  (internals-B) MERGED. Next: internals-C (coherence; immediate next action above), then
  chassis, then the final **polish** slice (Geoff, 2026-09-01: a full-surface
  cleanliness-and-beauty sweep, reading the exports as a family, the docs cover to cover,
  and the rendered admin against the design system; it also carries the OfficeList
  outright-retire question ruling-first, the `aria-disabled`-versus-native-`disabled`
  busy-idiom ruling, and the items ROADMAP's polish sub-bullet lists); ONE release cut
  after polish. `content-routes-media.ts` at 1,447 lines is the one file left from the
  audit's monolith list; ROADMAP's audit-remediation entry is the canonical routing
  record. Standing chassis mandate (Geoff, 2026-09-01): the chassis is the most
  developer-visible part of cairn and SETS the code bar, so its quality bar equals the
  engine's; the chassis plan opens with a fresh showcase review at the exemplar bar and
  treats the ROADMAP's older 14-finding list as input, never the ceiling; chassis precedes
  polish because polish's cover-to-cover docs read must see the chassis that teaches the
  surface.
- **The cairn case (front-door argument).** `docs/internal/record/2026-09-04-the-cairn-case.md`
  is the source the front-door figure and `why-cairn.md` derive from; inputs and reviews banked
  beside it in `docs/internal/record/2026-09-04-cairn-case/`. Rounds 1 (RETHINK), 2 (C+), 3 (B-), 4 (B), and
  5 (B+, SOUND), and 6 (B+) are folded; the exit criterion (B+) is met. FROZEN at revision 12
  (`dcb11bd3`, 2026-09-05) after two fresh-context verification reads; 354 notes, apparatus
  clean. The measured build is complete at three rounds (`experiment-screen`, never merging;
  record at `16-measured-build/experiment-measurement.md`, `b0423fac`). In flight: the
  first-person front-door derivation, written to `25-front-door-proposal.md` UNCOMMITTED for
  Geoff's read, and a read-only check of the concept figure's labels against the frozen case. Overnight
  decisions (Geoff, 2026-09-05, defaults accepted): the concept figure is built as an
  uncommitted prototype in the one-system-with-its-boundary form on the existing review page;
  the front-door prose is drafted in first person in the why-cairn.md voice as an uncommitted
  proposal (a new why-cairn.md and the front-door lines), never touching the published pages.
  Both wait for Geoff's morning read. The
  two figures (the concept figure and the banded ownership map) are built with cosmetic fixes
  applied and uncommitted under `docs/extend/assets/` with source `docs/internal/site-figures.svg`,
  emitter `scripts/figures/`, and an uncommitted `check:figures` gate; the review page is
  republished (artifact bfe5eef9). The concept figure's labels re-derive from the frozen case.
- **Go `cairn` tool, Pass A.** Ready to execute; plan at
  `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`. Independent of the engine
  window.
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since
  `0.95.0`; the editors rewrite queues behind Geoff's site updates.
- **Engine-consultation protocol live** (details in HISTORY, 2026-08-26). The first live
  consultation appends a short post-mortem to the ledger.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (it is Current until
  October 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green; `tsgo.yml` runs that check
  weekly, not per push.

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `packages/create-cairn-site/src/github/install.test.mjs` ("the concurrent installation poll
  logs a periodic waiting line"): flaked once in a 30x local loop (2026-08-29). Trigger: its
  next CI failure gets the same mock-timer deflake the server grace-window tests received.
- Post-deploy CSRF: a consumer `guard.rejected` record with `detail: 'mismatch'`,
  `witness: 'field'` can be the known double-mint residual (friction-log WATCH entry), not a
  new mechanism; the discriminator now names any genuinely new one.
- Three ASC staging harvest docs (events-admin, events-redesign, assets-register) are folded
  into cairn and slated for deletion in the ASC repo. Trigger: the ASC `email-announce` branch
  settles.

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
