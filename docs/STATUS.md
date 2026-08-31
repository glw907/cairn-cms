# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries SIX
passes unpublished under `## Unreleased`: toolkit-seams, harvest-detection, csrf-hardening
(remediation slice 1), foundations A (slice 2a), foundations B (slice 2b), and retires
(slice 3, merged 2026-08-30 at `d2c434ea`, PR #42, all CI green); the window holds until the
chassis slice per the initiative design. CI on `main` is fully green.

## Immediate next action

**The conventions pass (slice 4a) is EXECUTING** on worktree `.claude/worktrees/conventions`
(branch `conventions`, workflow mode, sequential), from the committed plan
`docs/superpowers/plans/2026-08-30-conventions-pass.md`. Checkpoint after Task 4
(2026-08-31): Tasks 1 (`5728b882`), 2 (`52fd9cba`+`e36089f9`, one fix round), and 4
(`0bb03e51`+`523fa8ef`, one fix round) ACCEPTED; Task 3 (`51f02f3f`+`c8c6f5ac`) landed but
escalated on two residual doc defects (CHANGELOG's `createMediaResolver` subpath claim;
stale preset prose in `core.md`/`data-tiers.md`), which the conductor routed to a cleanup
task at the head of chunk 2 (Tasks 5-8). Spend: ~2.6M after four of eleven tasks;
the ceiling is RAISED to 7M (Geoff, 2026-08-31, on the chunk-1 numbers: the overrun is
review rigor, not waste), so the pass runs to completion without a budget stop. Tasks 7
and 8 upshifted to Opus implementers (security-critical interactions). Decisions taken: the overnight
suspend stall was recovered by verify-not-redo (Task 1's pre-stall commit accepted as-is);
Task 4's `Outcome`-suffixed result-union type names accepted (they are results, not
failure shapes, so the `Failure`-suffix ruling is not implicated). Resume prompt for a
fresh session:

In ~/Projects/cairn-cms, resume the conventions pass (slice 4a) mid-execution: invoke cairn-pass, read docs/STATUS.md and the plan, verify worktree `conventions` state against the checkpoint above, then continue with chunk 2 (Task 3's two doc fixes, then Tasks 5-8) through the implementer chain in workflow mode.

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site's sheet is
committed at `docs/2026-08-22-cairn-0.96-update-instructions.md`; a 2026-08-29 survey confirmed
no consumer repo is ahead of origin, so the sheets are pushed. 907-life is eleven releases
behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3 MERGED. Next: conventions 4a
  (immediate next action, above), then 4b, internals, chassis; ONE release cut after
  chassis. The 4a plan's ratified-rulings header is the carrier of the sitting's rulings
  until Task 1 lands them in the ledger.
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
  `+page.server.ts` against generated `./$types`.
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
