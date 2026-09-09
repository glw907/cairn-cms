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
`3e4ba6eb`, PR #49, CI green); the window holds until the polish slice per the initiative
design's amended item 6 and publish ruling (one cut after polish; the chassis work is three
passes, A, B1, B2). CI on `main` is fully green.

## Immediate next action (2026-09-08 15:40)

Three tracks are live; each resumes from its own artifact.

- **Identity seam**: MERGED as PR #53 (`ac0d4d52`). Its ledger entry is in `docs/HISTORY.md`;
  reviews are banked in `docs/internal/record/2026-09-07-identity-seam/`.
- **Chassis-B1**: MERGED as PR #51 (`58ed9d1f`); ledger entry in `docs/HISTORY.md`.
- **Chassis-B2** (EXECUTING since 2026-09-08 18:30): worktree `.claude/worktrees/chassis-b2`
  on branch `chassis-b2` off main; plan `docs/superpowers/plans/2026-09-07-chassis-b2-pass.md`
  (8 tasks, one sequential chain, 6M ceiling, checkpoint every four). The chain runs as two
  Workflow runs because the plan suspends it after Task 2 for the conductor's CI regen: run
  one (Tasks 1 and 2) is `wf_9a14fefc-631` from the main checkout, chains script copied to the
  session scratchpad (the tool refuses a `~/.claude/workflows` path), args from
  `~/.cache/cairn-chassis-b2/b2-args.json` filtered to tasks 1 and 2. Between runs: open the PR,
  `gh workflow run e2e.yml --ref chassis-b2 -f update_snapshots=true`, wait, pull, read the
  CI diff. Run two carries Tasks 3 through 8 (the same args filtered to `.[2:8]`). Guards
  armed (inhibitor pair, battery watchdog, transcript runaway guard). Pass-end: the
  fresh-context verifier over six surfaces (B1's five plus archive2), then Geoff's
  five-viewport read. If resuming cold: check `git log chassis-b2` for which tasks committed
  and relaunch the remaining tasks the same way.
- **Polish** (planning, 2026-09-08 evening): the polish spec
  (`docs/superpowers/specs/2026-09-08-polish-passes-design.md`) is being rewritten to
  revision 4 under three rulings: no docs investment before the rewrite (polish-B dissolved,
  polish-D dropped entirely, Geoff's uncommitted front-door files stay unowned until the docs
  initiative replaces them), polish-A split into 11a and 11b along the risk lens's cut, and
  polish-C as slice 12. Three-lens review of revision 3 is banked at
  `docs/internal/record/2026-09-08-polish-inputs/spec-review-rev3-*.md`; the fold record is
  `spec-review-rev3-fold.md`. Next: verify revision 4, author the 11a plan, adversarial-review
  it, then Geoff reads spec and plan together. Chassis-B2 Task 1 escalated on an emitter
  scope creep (manifest regeneration via a showcase-install subprocess, red on CI); ruled: the
  emitter filters the copied manifest with no subprocess; fix dispatched, Task 2 launches as
  its own run after the fix passes review.
- **Documentation standard**: spec approved at revision 4
  (`docs/superpowers/specs/2026-09-08-docs-standard-design.md`; nine page types, the
  registry lifecycle, staged delivery, the gauge-and-iterate protocol). Plan one, the Claude
  infrastructure pass, is executing in `~/.dotfiles` (its STATUS carries the ledger). Pass
  2a (`docs/superpowers/plans/2026-09-08-docs-toolset-pass.md`, 36 tasks, 4.75M) is
  approved and waits on two things: the machine freeing from B1, and Geoff committing or
  moving aside his uncommitted working-tree files named in the plan's pre-task 1. Five
  per-track stages follow 2a in the order reference, extend, admin, editors, front door;
  polish pass C lands before stage one. The polish spec carries the dated amendment.
- **Front door**: `docs/why-cairn.md` keeps Geoff's true opener; the page is stage five of
  the rewrite. Author facts live in
  `docs/internal/record/2026-09-08-polish-inputs/front-door-author-brief.md`.

Guards: sleep inhibitor armed to about 16:30; battery charging.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3, 4a, 4b, 5 (internals), 6
  (internals-B), 7 (internals-C), chassis-A, and chassis-B1 MERGED. Next: chassis-B2
  (immediate next action above), then the final **polish** slice (Geoff, 2026-09-01: a full-surface
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
