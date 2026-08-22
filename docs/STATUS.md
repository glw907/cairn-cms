# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.95.0`**, on npm for both `@glw907/cairn-cms` and
`@glw907/cairn-cms-dev`. `main` carries an unpublished window on top: the newest-toolchain pass
(merged `d2972d11`), which raises the floors to Node `>=24`, `@sveltejs/kit ^2.70`,
`svelte ^5.56.10`, and `@cloudflare/workers-types ^5` as a hard peer, and adds the admin upgrade
map and its `check:target-stack` gate. Every floor bump carries a `Consumers must:` line in
`CHANGELOG.md`'s `## Unreleased` section.

## Immediate next action

Cut the release carrying this window: invoke the `cairn-release` skill, verifying the next
version number is free first (`npm view @glw907/cairn-cms versions --json`; `0.96.0` is the
candidate, since the window adds a new peer floor, a new admin page, and new CI gates). Then
write per-site update instructions for the four consumer sites: `ecxc-ski`, `aksailingclub-org`,
and `xcathletes-org` already run `^0.95.0` on Node 24 CI, so each only needs the new peer floors
and the Node 24 confirmation; `907-life` is still on `^0.84.4` and crosses every
`Consumers must:` line from `0.85` forward, so its instructions are the full migration walk.

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
