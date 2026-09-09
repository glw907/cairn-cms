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

## Immediate next action (2026-09-08 23:40)

**The overnight run halted on 2026-09-08 at stage "b2:merge."** Reason: blocked before any git
action, a live executor is actively editing this exact worktree right now. Resume chassis-B2's
pass-end ritual at step "b2:merge" in /var/home/glw907/Projects/cairn-cms/.claude/worktrees/chassis-b2;
the earlier steps are committed on the branch.

**The overnight run to the next release is live** (Geoff's rulings this evening: B2 merges on
the verifier plus CI green; 11a and 11b execute on reviewed plans unread; polish-C waits for
Geoff's read of its verb-first names; the cut fires automatically once C lands). The
orchestrator is the session scratchpad's `overnight-to-release.js` (a copy is worth banking at
`~/.claude/workflows/` at close); it is stage-launchable, each launch carrying only the passes
it runs and stopping with this file pointing at the next launch.

- **Stage one, running:** chassis-B2 Tasks 4 to 8, then B2's close (simplifier, gates, the
  pass-end CI regen, the fresh-context verifier over six surfaces, reviewer fan-out, records,
  PR #54 merge). Run `wf_1d0833ee-610` (the first run, `wf_06c01691-22f`, halted at Task 3's
  escalation). Tasks 1 to 3 are accepted on the branch (head `9e472aa7`). Conductor ruling
  after Task 3: the CI regen `4de378ec` rewrote 20 home and archive2 baselines with
  CI-canonical renders this workstation cannot reproduce, so the local e2e gate passes when
  its only failures are exactly those 20; they are never regenerated locally.
- **Stages two to four, each its own launch after the prior merge:** polish-11a
  (`docs/superpowers/plans/2026-09-08-polish-11a-pass.md`, `f273274e`, args
  `~/.cache/cairn-polish-11a/11a-run{1,2}-args.json`), polish-11b-i and polish-11b-ii
  (Geoff split 11b at 22:40; plans committed `4756dcae`, args under `~/.cache/cairn-polish-11b-i/`
  and `-11b-ii/`), then polish-C (`2026-09-08-polish-c-pass.md`, `4756dcae`, args
  `~/.cache/cairn-polish-c/`) with `c.approved: true` (Geoff approved the names table at 23:45,
  as recommended), after which the cut fires automatically.
- **No human gate remains before the cut.** The 11a, 11b-i, and 11b-ii plans execute unread
  by Geoff's ruling and the C names are approved; every plan's reviews, fold record, and
  verification read are banked at `docs/internal/record/2026-09-08-polish-inputs/plan-*.md`.
  Geoff reads main's rendered surfaces in the morning.
- **If resuming cold:** read this file's ledger lines, `git log main`, and the run's
  `journal.jsonl`; relaunch the orchestrator with `resumeFromRunId` or with the next stage's args.
  Guards: both inhibitors held to 09:00 (`claude-cairn-overnight`), the battery watchdog and the
  runaway guard are session monitors.

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
