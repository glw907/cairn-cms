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

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
