# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries THREE
passes unpublished under `## Unreleased`: toolkit-seams, harvest-detection (merged 2026-08-29),
and csrf-hardening (remediation slice 1, merged 2026-08-30); the breaking chip-grammar changes
ride the audit-remediation `Consumers must:` window, and the window holds until the chassis
slice per the initiative design. CI on `main` is fully green.

## Immediate next action

**Execute foundations A and B as ONE paired fresh session.** Resume prompt, verbatim:

In ~/Projects/cairn-cms, execute the foundations A pass (docs/superpowers/plans/2026-08-28-foundations-a-pass.md) and then foundations B in the same session, per the Session handoff note in the A plan.

The A plan's header carries the full handoff: both plans are pre-flight verified against
`49914d9d` (corrections and csrf-window re-verify lists appended to each plan; re-verify those
items against the now-merged csrf-hardening tree before dispatching); B's task bodies get
finalized against A's merged surface, then one `engine-triage` adversarial review over the
finalized B plan before any B dispatch.

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site repo has
its sheet committed locally (unpushed) at `docs/2026-08-22-cairn-0.96-update-instructions.md`;
907-life is eleven releases behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slice 1 (csrf-hardening) SHIPPED. Next: foundations A
  then B (above), then retires (its plan waits on B's list (c) ruling), conventions, internals,
  chassis; ONE release cut after chassis. Routed to the conventions pass's auth family: the
  session-cookie derivation ledger entry, `check-probe.ts:49`'s independent derivation, the
  cookie-jar posture split, the login-CSRF `_pending`-nonce binding, and making the CSRF
  helpers' patterns uniform. Routed to internals: the `list-role` descendant-selector
  re-grounding and the `panel-width` closed-select painted-width follow-up.
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
