# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries SEVEN
passes unpublished under `## Unreleased`: toolkit-seams, harvest-detection, csrf-hardening
(remediation slice 1), foundations A (slice 2a), foundations B (slice 2b), retires (slice 3),
and conventions (slice 4a, merged 2026-09-01 at `bc960fec`, PR #43, all CI green); the window
holds until the chassis slice per the initiative design. CI on `main` is fully green.

## Immediate next action

**The conformance pass (4b) is EXECUTING in workflow mode** on worktree
`.claude/worktrees/conformance` (branch `conformance` off `main` at `6621245f`). Plan:
`docs/superpowers/plans/2026-09-01-conformance-pass.md` — twice-reviewed on the mandated
model (round 1: engine-triage + web-auth-security-reviewer + an Opus cleanliness-and-beauty
lens Geoff added mid-review, now a standing pass dimension; round 2: engine-triage
verification; all findings folded, dispositions in the plan's review-folds section). Geoff
authorized the full arc: execute, pass-end ritual, merge to `main`, push. 14 tasks,
sequential; Tasks 5 and 11 ran upshifted to Opus implementers (security-critical).
Ceiling 6M, checkpoint every four tasks. Checkpoint (evening, post-crash): a power loss
killed the workflow mid-Task 11; a fresh session salvaged the warm tree, and Tasks 1-12
are now through the chain via per-task Agent dispatches (Task 11 at `9ba75564` clean;
Task 12 at `bc061a97`+`a0c36062` after one conductor-ruled fix round: the chroma term
landed for the hue class, the ratified 1.5 floor untouched, the floor-recalibration half
re-filed in ROADMAP with a measured-evidence requirement and a failing-test tripwire on
the residual). Next: Task 13 (rendered.* renames), Task 14 (variants sweep), then the
ritual. Pass-scoped punch list for the ritual's fix round: Task 11's salt-fault and
third-no-row-site tests; Task 11's `Consumers must:` line gains the three omitted
record-shape changes (`words` to `wordCount`, the dropped `resolver_absent` `enabled`,
`cleanup_failed` `reason` to `error`); two stale "still allowlisted" annotation lines in
the rulings ledger (`engine-rulings.md:4592,:4601`); sweep `.task9-evidence/`. The internals
pass plan is DRAFTED at
`docs/superpowers/plans/2026-09-01-internals-pass.md` (rulings RATIFIED at the 2026-09-01
sitting; round-1 three-lens review ran pre-merge at Geoff's direction against worktree
state `189bf2d7` and is FOLDED at `3dde82a7`: 13 tasks, ceiling 6.5M, one ratified-letter
amendment on the CAIRN_DEV_BACKEND refusal awaiting Geoff's confirmation at plan approval;
round 2 verification in flight; anchors reconcile once more after 4b merges). Resume prompt for a fresh
session: "In ~/Projects/cairn-cms, resume the conformance pass (4b) mid-execution: invoke
cairn-pass, read docs/STATUS.md and the plan, verify worktree `conformance` state, then
continue the pass-execute workflow chain from the last completed task."

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site's sheet is
committed at `docs/2026-08-22-cairn-0.96-update-instructions.md`; a 2026-08-29 survey confirmed
no consumer repo is ahead of origin, so the sheets are pushed. 907-life is eleven releases
behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3, 4a MERGED. Next: 4b (immediate
  next action, above), then internals, internals-B (monoliths and coherence; filed by the
  internals plan's Task 11), chassis, then a NEW final **polish** slice (Geoff, 2026-09-01:
  a full-surface cleanliness-and-beauty sweep, reading the exports as a family, the docs
  cover to cover, and the rendered admin against the design system, because per-pass beauty
  reviews read only their own diff); ONE release cut after polish, not after chassis. The `FieldInput`
  `ownership_invalid_mutation` fix routes to internals-B's `EditPage` split (one touch).
  Routed to internals: the F-1 leak-class `check:surface` rider (its brief is the move
  record, `docs/internal/record/2026-08-30-retires-move-record.md`, which states the
  predicate's limits and the expansion-class questions), the `staleNames` per-subpath
  rescope, R-0's second direction, the six stale `content-routes-*` header wordings
  (`content-routes-context.ts:272` foremost), the `list-role` descendant-selector
  re-grounding, the `panel-width` closed-select painted-width follow-up, the
  reference-page convention for naming the indexed-access form beside shapes printing
  un-importable members (18 sites), and the factory per-call `CAIRN_DEV_BACKEND` refusal
  design question. Routed to chassis: the render trio re-homing
  (`cardShell`/`headRow`/`iconSpan`), and the carried showcase hand-mounted
  `+page.server.ts` against generated `./$types`. Standing chassis mandate (Geoff,
  2026-09-01): the chassis is the most developer-visible part of cairn and the code
  developers interact with most, so it SETS the code bar; its quality bar equals the
  engine's. The chassis pass gets the full cleanliness-and-beauty treatment the engine
  slices got, every line treated as copy-paste-taught exemplar code, and its plan gets
  the same three-lens adversarial review. Two planning consequences (Geoff, 2026-09-01):
  the ROADMAP's 14-finding chassis improvement round predates this mandate, so the
  chassis plan opens with a fresh showcase review at the exemplar bar and treats the old
  finding list as input, never the ceiling; and the chassis-before-polish ordering is
  load-bearing, since polish's cover-to-cover docs read must see the chassis that
  teaches the surface, so a chassis slip resequences polish rather than skipping past
  it.
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
- `ROADMAP.md`'s Now tier carries the `FieldInput` `ownership_invalid_mutation` fix (a plain
  prop bound with `bind:this` against `EditPage`'s `$state`).
- Post-deploy CSRF: a consumer `guard.rejected` record with `detail: 'mismatch'`,
  `witness: 'field'` can be the known double-mint residual (friction-log WATCH entry), not a
  new mechanism; the discriminator now names any genuinely new one.
- Three ASC staging harvest docs (events-admin, events-redesign, assets-register) are folded
  into cairn and slated for deletion in the ASC repo. Trigger: the ASC `email-announce` branch
  settles.

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
