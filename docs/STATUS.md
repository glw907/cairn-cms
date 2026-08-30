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
and csrf-hardening (remediation slice 1, merged 2026-08-30). Foundations A (audit-remediation
slice 2a) is complete on its worktree, awaiting merge, and will join this window, which holds
until the chassis slice per the initiative design. CI on `main` is fully green.

## Immediate next action

**Merge `foundations-a` to `main`.** The pass is DONE on worktree
`.claude/worktrees/foundations-a`: close-out gates green, per-task diffs accepted, pass-end
`engine-triage` verdict "holds" on all three artifacts (ledger repair, canonical-home rule,
drift sweep). Post-mortem appended to `docs/superpowers/plans/2026-08-28-foundations-a-pass.md`.

After the merge: finalize foundations B's task bodies
(`docs/superpowers/plans/2026-08-28-foundations-b-pass.md`) against A's merged surface, run one
`engine-triage` adversarial review over the finalized B plan, then execute B in the same
session (Geoff's standing calls, 2026-08-29). Resume prompt if this session dies:

In ~/Projects/cairn-cms, execute the foundations A pass (docs/superpowers/plans/2026-08-28-foundations-a-pass.md) and then foundations B in the same session, per the Session handoff note in the A plan. (Check `git -C .claude/worktrees/foundations-a log --oneline` first; completed tasks are committed there.)

**Carried into foundations B:** the move-set record's "Inheritance notes for foundations B"
subsection (`docs/internal/record/2026-08-29-foundations-a-move-set.md`) covers four items:
`staleNames`'s union-over-all-subpaths scoping, record-membership-is-not-justification, the
122-multi-subpath-count invariance, and R-0's undischarged second direction. The
reference-coverage per-subpath fix is routed to land BEFORE B narrows `/sveltekit`.

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site's sheet is
committed locally (unpushed) at `docs/2026-08-22-cairn-0.96-update-instructions.md`; 907-life is
eleven releases behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slice 1 (csrf-hardening) SHIPPED. Slice 2a (foundations
  A) complete, awaiting merge (above). Next: B, then retires (its plan waits on B's list (c)
  ruling), conventions, internals, chassis; ONE release cut after chassis. Routed to the
  conventions pass's auth family: the session-cookie derivation ledger entry,
  `check-probe.ts:49`'s independent derivation, the cookie-jar posture split, the login-CSRF
  `_pending`-nonce binding, and making the CSRF helpers' patterns uniform. Routed to internals:
  the `list-role` descendant-selector re-grounding and the `panel-width` closed-select
  painted-width follow-up.
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
