# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries the
toolkit-seams pass AND the harvest-detection pass (merged 2026-08-29, `445e350f`) unpublished
under `## Unreleased`; the breaking chip-grammar changes ride the audit-remediation
`Consumers must:` window. CI on `main` is fully green (the stale visual baselines and norms
manifest inherited from the toolkit-seams merge were regenerated at close).

## Immediate next action

**Execute the CSRF hardening pass** (`docs/superpowers/plans/2026-08-27-csrf-hardening-pass.md`,
approved 2026-08-28): remediation slice 1, four serial tasks through the
`cairn-implementer`/`diff-reviewer` chain, on a `csrf-hardening` worktree off the current `main`
tip (the harvest-detection merge has landed, so branching is unblocked). Token ceiling 1.8M for
the whole pass; every dispatch states the plan's security invariants; pass-end review must
include `web-auth-security-reviewer` plus the live admin smoke with the stale-cookie
`mismatch`-record check.

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site repo has
its sheet committed locally (unpushed) at `docs/2026-08-22-cairn-0.96-update-instructions.md`;
907-life is eleven releases behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slice order: csrf-hardening (next, above), then
  `2026-08-28-foundations-a-pass.md`, then `2026-08-28-foundations-b-pass.md` (task bodies
  finalized against A's merged surface before dispatch; run A and B as one paired fresh
  session). The retires-pass plan waits on foundations B's list (c) ruling. ONE release cut
  after the chassis slice, no exceptions. The `list-role` descendant-selector re-grounding
  (nine-list inventory in the friction log, 2026-08-29) and the `panel-width` closed-select
  painted-width follow-up route to this initiative's internals slice.
- **Go `cairn` tool, Pass A.** Ready to execute; plan at
  `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`. Independent of the engine
  window.
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since
  `0.95.0`; the editors rewrite queues behind Geoff's site updates.
- **Engine-consultation protocol live** (details in HISTORY, 2026-08-26). The first live
  consultation appends a short post-mortem to the ledger; the skill carries the self-retiring
  reminder.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (it is Current until
  October 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green; `tsgo.yml` runs that check
  weekly, not per push.

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `packages/create-cairn-site/src/github/install.test.mjs` ("the concurrent installation poll
  logs a periodic waiting line"): flaked once in a 30x local loop (2026-08-29) during the
  grace-window deflake. Trigger: its next CI failure gets the same mock-timer deflake the
  server grace-window tests received (that pair is FIXED and off watch).
- `ROADMAP.md`'s Now tier carries the `FieldInput` `ownership_invalid_mutation` fix (a plain
  prop bound with `bind:this` against `EditPage`'s `$state`).
- Three ASC staging harvest docs (events-admin, events-redesign, assets-register) are folded
  into cairn and slated for deletion in the ASC repo. Trigger: the ASC `email-announce` branch
  settles.

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
