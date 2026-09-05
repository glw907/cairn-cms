# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional spec
(`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`). Everything past tense,
including every prior pass's detail, lives in [`docs/HISTORY.md`](HISTORY.md); this file carries
only the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries ELEVEN
passes unpublished under `## Unreleased`: toolkit-seams, harvest-detection, csrf-hardening
(slice 1), foundations A (2a), foundations B (2b), retires (3), conventions (4a, PR #43),
conformance (4b, PR #46), internals (5, PR #47), internals-B (6, PR #48), and internals-C (7, merged 2026-09-05 at
`3e4ba6eb`, PR #49, CI green); the window holds until the polish slice per the amended
initiative design. CI on `main` is fully green.

## Immediate next action

**Execute chassis-A** (audit-remediation slice 8, structural). Internals-C is MERGED (PR #49,
`3e4ba6eb`, CI green); its ledger entry is in HISTORY and its post-mortem is appended to
`docs/superpowers/plans/2026-09-03-internals-c-pass.md`. Spec
`docs/superpowers/specs/2026-09-04-chassis-passes-design.md`; plan
`docs/superpowers/plans/2026-09-04-chassis-a-pass.md` (12 sequential tasks, ceiling 7.5M,
checkpoints 4/8/12, one chain, `~/.claude/workflows/pass-execute-chains.js`). Anchors were
reconciled against the internals-C head on 2026-09-05 (`efe97fbd`, one Task 7 edit), so the
plan dispatches as written. **APPROVED (Geoff, 2026-09-04, "add this work to the existing
workflow"; "the plan to stand as written") with full git authorization: push the branch, open
the PR, merge on green CI.** The seven conductor calls the plan records need no re-confirmation.

Before dispatch: create `.claude/worktrees/chassis-a` off `main`; from-scratch showcase `npm ci`
in the worktree before trusting any e2e (the symlink gotcha in CLAUDE.md); arm the workflow
runaway guard AND the sleep inhibitor plus battery watchdog whenever the run is unattended,
regardless of what the power source reports (`~/.claude/docs/unattended-work-guards.md`; born
2026-09-05: GNOME's battery rule suspended the machine for 8 h 13 m while the charger was
connected, because the kernel reported the AC line offline). Two concurrent full gates is the
machine's ceiling. Never let two writers share one worktree. On any blocker, stop, WIP-commit,
write STATUS with the resume state.

Resume prompt: "In ~/Projects/cairn-cms, invoke cairn-pass and execute the approved chassis-A
plan (docs/superpowers/plans/2026-09-04-chassis-a-pass.md) as one chain: create the worktree,
arm the guards, run the pass and its full ritual, push, PR, merge on green CI. The approval and
the git authorization are recorded in this STATUS entry. Then author chassis-B's plan from the
spec's Chassis-B section."

After chassis-A: chassis-B (plan authored after A lands), then polish, then ONE release cut.

**Geoff's parallel action: update the four consumer sites onto `0.96.0`.** Each site's sheet is
committed at `docs/2026-08-22-cairn-0.96-update-instructions.md`; a 2026-08-29 survey confirmed
no consumer repo is ahead of origin, so the sheets are pushed. 907-life is eleven releases
behind and its sheet says to run it as a numbered site pass.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3, 4a, 4b, 5 (internals), and 6
  (internals-B), and 7 (internals-C) MERGED. Next: chassis-A (immediate next action above),
  chassis-B, then the final **polish** slice (Geoff, 2026-09-01: a full-surface
  cleanliness-and-beauty sweep, reading the exports as a family, the docs cover to cover,
  and the rendered admin against the design system; it also carries the OfficeList
  outright-retire question ruling-first, the `aria-disabled`-versus-native-`disabled`
  busy-idiom ruling, and the items ROADMAP's polish sub-bullet lists); ONE release cut
  after polish. `content-routes-media.ts` at 1,447 lines is the one file left from the
  audit's monolith list; ROADMAP's audit-remediation entry is the canonical routing
  record. Standing chassis mandate (Geoff, 2026-09-01): the chassis is the most
  developer-visible part of cairn and SETS the code bar, so its quality bar equals the
  engine's; the chassis plan opens with a fresh showcase review at the exemplar bar and
  treats the ROADMAP's older 14-finding list as input, never the ceiling; chassis precedes
  polish because polish's cover-to-cover docs read must see the chassis that teaches the
  surface.
- **The cairn case (front-door argument).** `docs/internal/record/2026-09-04-the-cairn-case.md`
  is FROZEN at revision 12 (`dcb11bd3`, 2026-09-05; six graded rounds to B+, two fresh-context
  verification reads, 354 notes). Inputs, reviews, and the three-round measured build are banked
  in `docs/internal/record/2026-09-04-cairn-case/` (`experiment-screen` never merges). Waiting
  for Geoff's read, all UNCOMMITTED: the first-person front-door proposal
  `25-front-door-proposal.md` (a why-cairn.md replacement at 1,619 words, register grade B+, cut
  list in its Section C.5, plus the README and cairn.pub forms); the two figures under
  `docs/extend/assets/` with source `docs/internal/site-figures.svg`, emitter `scripts/figures/`,
  and a `check:figures` line in `package.json` and `test.yml`, re-derived from the frozen case
  (review page: artifact bfe5eef9). Post-freeze notes that would reopen the case are in
  `26-post-freeze-notes.md`. Landing path: a docs task in polish (or a small docs-only pass) once
  Geoff rules on the page, its length, and the figures.
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
- Post-deploy CSRF: a consumer `guard.rejected` record with `detail: 'mismatch'`,
  `witness: 'field'` can be the known double-mint residual (friction-log WATCH entry), not a
  new mechanism; the discriminator now names any genuinely new one.
- Three ASC staging harvest docs (events-admin, events-redesign, assets-register) are folded
  into cairn and slated for deletion in the ASC repo. Trigger: the ASC `email-announce` branch
  settles.

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
