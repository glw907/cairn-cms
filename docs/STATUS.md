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
the five aksailingclub-org 0.95 adoption defects. `main` now carries the toolkit-seams pass
unpublished under `## Unreleased` (release-size minor; the chip-grammar breaking changes ride
the audit-remediation `Consumers must:` window).

## Immediate next action

**Geoff updates the four consumer sites onto `0.96.0`.** Each site repo has its sheet committed
locally (unpushed) at `docs/2026-08-22-cairn-0.96-update-instructions.md`: ecxc-ski, aksailingclub-org,
and xcathletes-org are a bump plus the peer floors; 907-life is eleven releases behind and its
sheet says to run it as a numbered site pass over the migration-notes entries. After the sites,
the editors rewrite in `cairn-pub` (`pass-d-docs-tracks`, now un-pinnable against the registry).

## Parallel tracks

- **The engine-consultation protocol is live (pass closed 2026-08-26; post-mortem in the
  plan file).** The `engine-consult` skill and `engine-triage` agent exist; both pass
  skills carry the hooks (cold-start tested, negative control included); briefs file at
  `docs/internal/consultations/`; rulings live in `docs/internal/engine-rulings.md` (10
  seeds + 535 audit entries). Both audits ran trustworthy: surface 535 items 384/57/94
  keep/reshape/retire, internals+chassis 175 findings (10 rewrite-tier). Remediation is
  the ROADMAP Now entry ("The any-site audit remediation"), one `Consumers must:` window,
  before beta. The protocol's first live consultation (likely the next ASC or 907-life
  pass) appends a short post-mortem to the ledger; the skill carries the self-retiring
  reminder.
- **ASC harvest absorption, behavior half: SHIPPED.** The toolkit-seams pass merged to
  `main` 2026-08-27 (`e8cc85c8`), holds unpublished under `## Unreleased` (breaking chip
  changes ride the audit-remediation `Consumers must:` window). Post-mortem in the plan
  file. Open decision for Geoff, from the pass's security review: the CSRF-403 diagnosis
  (confirm-load `SameSite=Strict` token re-mint) proposes two guard remedies, `SameSite=Lax`
  on the CSRF cookie and a `detail` discriminator on csrf rejection logs; both pend a ruling
  (friction log carries the full case).
- **ASC harvest absorption, detection half: EXECUTING.** `2026-08-26-harvest-detection-pass.md`
  (six tasks serial, ceiling 1.1M), approved 2026-08-27, running on the `harvest-detection`
  worktree off the toolkit-seams merge via `pass-execute.js`.
- **The audit remediation is designed and twice-reviewed.** The initiative frame (six slices:
  hardening, narrowing, retires, conventions, internals, chassis; one cut after chassis) is
  `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md`; slice plans are
  authored just-in-time and executed in fresh sessions. Four ratification changes pend Geoff's
  answers (ordering, seam-session cancellation, publish carve-out, login-CSRF nonce).
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
