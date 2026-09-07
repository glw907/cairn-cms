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

**Resume chassis-A** (audit-remediation slice 8, structural) from Task 3. The pass is
EXECUTING on branch `chassis-a` in `.claude/worktrees/chassis-a` (showcase from-scratch
installed and repointed 2026-09-05). Tasks 1 and 2 are accepted and committed (`e2aceffe`
the mechanical Prettier reformat, `8fecf730` the scaffold format check). The first run
(workflow `wf_6fd88891-0a4`, one chain, 2026-09-05) halted at Task 2 on an ESCALATE that was
about Task 1, not Task 2: the reformat reflowed the one-line `backend: githubApp({...})`
literal in `examples/showcase/src/theme/cairn.config.ts` into six lines, and
`packages/create-cairn-site/src/github/finalize.mjs:20-21` pins that exact one-line string
(`TEMPLATE_GITHUB_APP_LITERAL`), so every real scaffold run now fails at finalize and the
CLI's rot gate (`npm --prefix packages/create-cairn-site test`, 805/806) is red. Neither the
plan's per-task gate nor the dispatched gate ran that suite, which is why it survived two
task gates.

**Conductor ruling (2026-09-07):** land the remedy as a follow-on fix commit on the branch
(a `// prettier-ignore` line above the `backend:` entry, the call collapsed back to the exact
string finalize.mjs pins, `format`, `emit:template`, then `check:template` green and the CLI
suite 806/806), never a rewrite of `e2aceffe`. Add `npm --prefix packages/create-cairn-site
test` to the per-task gate for every remaining task, and record the omission in the Task 12
harvest. Then run Tasks 3 to 12 as a FRESH `pass-execute-chains` workflow (a resume of the
old run ID only works in the session that launched it); the args file shape is in the
plan's Execution section and the task criteria in the plan itself.

Approval and git authorization stand as recorded (Geoff, 2026-09-04: push, PR, merge on green
CI). Before dispatch, re-arm the FULL guard set (`~/.claude/docs/unattended-work-guards.md`):
both sleep inhibitors, the battery watchdog, and the runaway guard on the new workflow's
transcript dir; the 2026-09-05 set died with its session. Two concurrent full gates is the
machine's ceiling. Never let two writers share one worktree. On any blocker, stop,
WIP-commit, write STATUS with the resume state.

Resume prompt: "In ~/Projects/cairn-cms, invoke cairn-pass and resume the chassis-A pass
(docs/superpowers/plans/2026-09-04-chassis-a-pass.md) per STATUS: apply the Task 1
prettier-ignore fix commit in .claude/worktrees/chassis-a, then run Tasks 3 to 12 as a fresh
pass-execute-chains workflow with the CLI test suite added to the gate, then the full
pass-end ritual, push, PR, merge on green CI. Then author and execute chassis-B."

**After chassis-A: chassis-B, plan authorship AND execution granted (Geoff, 2026-09-05).**
Author its plan from the spec's Chassis-B section with the three-lens adversarial plan review
in place of Geoff's read; two taste calls are settled: the thirteen new posts are REAL short
posts (150 to 300 words, the existing trail-notes voice, through the site content method),
and the merge gate STAYS (run to a green PR with the before/after captures and the
visual-verifier verdict banked; Geoff merges after his five-viewport read). Then polish (not
granted), then ONE release cut. The Go `cairn` tool Pass A is deferred "until later" (Geoff,
2026-09-05).

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
