# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional
spec. Everything past tense lives in [`docs/HISTORY.md`](HISTORY.md); this file carries only
the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2 and polish-11a/11b-i/11b-ii unpublished under
`## Unreleased`; the window holds for one cut after polish-C (below). CI on `main` is green.

## Immediate next action (2026-09-13)

**Polish-11b-ii is MERGED** (PR #58, CI green, merge commit `e833a661`; entry and post-mortem in
[`HISTORY.md`](HISTORY.md)). Next: **polish-C**, launched from this session's scratchpad copy of
`cairn-c-to-release.js` (APPROVED, Geoff 2026-09-12). After C merges: the admin motion pass, the
release cut, then the borrowable-patterns pass in a fresh session. If this session is gone,
resume per `~/.cache/cairn-overnight-2026-09-12/LAUNCH.md`.

Spend on this overnight run so far: **6.02M tokens**.

Standing rulings (`CLAUDE.md`, "Gate economy on a pass"): the per-task gate omits the e2e suite
for paint-neutral tasks; merges bring `main` in first with STATUS taking main's; gates run only
through `cairn-run-gate`.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1-7 and chassis-A/B1/B2 MERGED; polish-11a/11b-i/
  11b-ii MERGED, polish-C next (above), then ONE release cut. ROADMAP's audit-remediation entry
  is the canonical routing record; the chassis quality bar equals the engine's (Geoff, 2026-09-01).
- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** Frozen record only, under
  `docs/internal/record/2026-09-04-cairn-case/`; nothing from it lands.
- **Go `cairn` tool, Pass A.** Ready to execute; plan at
  `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`. Independent of the engine
  window.
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since
  `0.95.0`; the editors rewrite queues behind Geoff's site updates.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green; `tsgo.yml` checks weekly.

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `install.test.mjs`'s concurrent-poll test flaked once in a 30x local loop (2026-08-29).
  Trigger: its next CI failure gets the same mock-timer deflake as the grace-window tests.
- A consumer `guard.rejected` record with `detail: 'mismatch'`, `witness: 'field'` can be the
  known double-mint residual, not a new mechanism; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, slated for deletion in the ASC repo.
  Trigger: the ASC `email-announce` branch settles.

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
