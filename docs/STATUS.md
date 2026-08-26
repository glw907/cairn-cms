# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. It raises the floors
to Node `>=24`, `@sveltejs/kit ^2.70`, `svelte ^5.56.10`, and `@cloudflare/workers-types ^5`,
moves Tidy to `claude-sonnet-5`, ships the admin upgrade map with `check:target-stack`, and fixes
the five aksailingclub-org 0.95 adoption defects. `main` carries nothing unpublished.

## Immediate next action

**Geoff updates the four consumer sites onto `0.96.0`.** Each site repo has its sheet committed
locally (unpushed) at `docs/2026-08-22-cairn-0.96-update-instructions.md`: ecxc-ski, aksailingclub-org,
and xcathletes-org are a bump plus the peer floors; 907-life is eleven releases behind and its
sheet says to run it as a numbered site pass over the migration-notes entries. After the sites,
the editors rewrite in `cairn-pub` (`pass-d-docs-tracks`, now un-pinnable against the registry).

## Parallel tracks

- **Pre-pass engine consultation: EXECUTING (checkpoint after Task 8's surface audit,
  2026-08-26).** Spec: `docs/superpowers/specs/2026-08-26-engine-consultation-design.md`;
  plan: `docs/superpowers/plans/2026-08-26-engine-consultation-pass.md` (now carrying
  Task 8b/8c: Geoff's three mid-pass directives, internals + chassis audit). Done: Tasks
  1-8. Infrastructure: ledger + consultations arm (`a5287c98`), `engine-consult` skill +
  `engine-triage` agent + both pass-skill hooks (dotfiles `3ba3ade`), both CLAUDE.md
  edits (`1ab938c`, `3cf90802`). Surface audit adjudicated and recorded (`45baad14`):
  535 items, 384/57/94 keep/reshape/retire, trustworthy verdict, remediation filed in
  ROADMAP Now. Next: Task 8b internals+chassis workflow (partition banked in scratchpad),
  then Task 9 (re-review the two held plans via `engine-triage`), then Task 10 close.
  **Geoff sequenced this ahead of the harvest-absorption passes below.**
- **ASC harvest absorption: two plans prepped 2026-08-26, held as drafts behind the
  consultation pass.** `docs/superpowers/plans/2026-08-26-toolkit-seams-pass.md` (behavior,
  7 tasks) and `2026-08-26-harvest-detection-pass.md` (detection and docs, 7 tasks), from the
  adversarial triage at `docs/internal/record/2026-08-26-asc-harvest-triage.md`. Survivors are
  tracked in the friction log until the passes ship; re-review both plans against the
  consultation pass's rulings before approval.
- **Go `cairn` tool, Pass A.** Ready to execute; plan at
  `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`. Independent of the engine
  window above.
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Was pinned to a local tarball because it needed
  the `reproductions` subpath; `0.95.0` now carries that subpath on the registry, so the branch
  is un-pinnable and ready to repoint at a released version.
- **The editors rewrite.** Queued behind the site updates above; runs in `~/Projects/cairn-pub`
  on the same branch.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (it is Current until
  October 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green; `tsgo.yml` runs that check
  weekly, not per push.

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `packages/create-cairn-site/src/console/server.test.mjs:173` (the grace-window shutdown test)
  failed once on CI at `0a6df513` and passed on rerun. Trigger: the next unexplained red test
  job on that suite.
- `ROADMAP.md`'s Now tier carries the `FieldInput` `ownership_invalid_mutation` fix (a plain prop
  bound with `bind:this` against `EditPage`'s `$state`).
- Three ASC staging harvest docs (events-admin, events-redesign, assets-register) are folded
  into cairn and slated for deletion in the ASC repo. Trigger: the ASC `email-announce` branch
  settles (it was in flight with warm uncommitted work on 2026-08-26, so nothing was touched).

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
