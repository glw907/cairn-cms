# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries EIGHT
passes unpublished under `## Unreleased`: toolkit-seams, harvest-detection, csrf-hardening
(slice 1), foundations A (2a), foundations B (2b), retires (3), conventions (4a, PR #43), and
conformance (4b, merged 2026-09-02 at `12330d71`, PR #46, all CI green); the window holds
until the polish slice per the amended initiative design. CI on `main` is fully green.

## Immediate next action

**The internals pass awaits Geoff's plan approval.** The plan at
`docs/superpowers/plans/2026-09-01-internals-pass.md` is twice-reviewed (three-lens round 1
folded, round-2 engine-triage verification passed, fixes applied): 13 tasks, ceiling 6.5M,
checkpoints at 4/8/12, workflow mode. **One confirmation item rides the approval: the
ratified CAIRN_DEV_BACKEND refusal's letter is amended** from "refuse when set" to "refuse
when set AND non-local" (the flag's `='1'` value is the dev transport's own enable
contract, so the ruled sense would break the showcase exemplar; both round-1 security and
round-2 triage verified the amendment executes the ruling's intent). After approval, the
one remaining pre-dispatch step is reconciling the plan's line anchors against merged
`main`, then execution starts on a fresh worktree `.claude/worktrees/internals` off `main`
(from-scratch showcase `npm ci` before trusting any e2e). Resume prompt for a fresh
session: "In ~/Projects/cairn-cms, invoke cairn-pass and start the internals pass:
read docs/STATUS.md and the plan, reconcile the plan's anchors against merged main,
confirm the approval state, then execute per the plan's workflow mode."

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site's sheet is
committed at `docs/2026-08-22-cairn-0.96-update-instructions.md`; a 2026-08-29 survey confirmed
no consumer repo is ahead of origin, so the sheets are pushed. 907-life is eleven releases
behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3, 4a, 4b MERGED. Next: internals
  (immediate next action, above), then internals-B (four monoliths and coherence; filed by
  the internals plan's Task 11; also carries `FieldInput`'s `ownership_invalid_mutation`
  fix inside the `EditPage` split, the confirm destroy-then-create `batch()` question, and
  the OfficeList/AdminTable scroll-container ownership), chassis, then the final **polish**
  slice (Geoff, 2026-09-01: a full-surface cleanliness-and-beauty sweep, reading the
  exports as a family, the docs cover to cover, and the rendered admin against the design
  system, because per-pass beauty reviews read only their own diff; also carries the
  OfficeList outright-retire question, ruling-first, and the items its hands-forward list
  in the internals plan names); ONE release cut after polish. The internals plan's task
  list is the canonical routing record now; this bullet stops restating it.
  Routed to chassis: the render trio re-homing
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
