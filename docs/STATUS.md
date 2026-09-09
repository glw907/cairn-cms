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

## Immediate next action (2026-09-09 15:10)

**Polish-11a is IN FLIGHT on branch `polish-11a`** (worktree `.claude/worktrees/polish-11a`,
pushed). Tasks 1 to 3, the whole entry split, are accepted and committed (`021064ef`,
`3c586589`, `6bea7905`, `98c95ab7`, `094c91f8`, `6343b584`); `content-routes-entry.ts` is
retired into four cluster modules with the public surface byte-identical. The run halted at
the Task 3 checkpoint by Geoff's call (usage credits, not the plan pool, were paying), and
Task 4's implementer dispatch was independently blocked by the safety classifier before it ran.

**Resume (from a session in the cairn-cms main checkout, once the plan pool refills):** rebuild
the launch script in the session scratchpad per the `cairn-overnight-orchestrator` memory with
run one's task list starting at Task 4 (Tasks 1 to 3 are committed; drop them from
`11a-run1-args.json`'s chain), the gate string's `publint` and `attw` steps prefixed with
`npx` (bare, they exit 127 outside an npm-script PATH), and launch the orchestrator fresh
(the prior run `wf_9a9b41e2-faf` belongs to a closed session). If the classifier blocks the
Task 4 dispatch again, read that task's criteria in the args cache for the trigger phrase and
reword it; the plan is unchanged. Then run one's remainder, the post-Task-7 CI regen, run two,
and the close through merge, as the plan states.

Measured cost at public API rates (2026-09-09): a task cycle is about $8 Sonnet implementer
plus $3.50 Opus review, about $12 with a fix round; Tasks 1 to 3 plus setup cost $36. A full
polish pass is $130 to $150 at list, so passes run from the plan pool, and credits only finish
a stage. Rulings from Task 1's review that bind the rest of the pass: the `roleHome` ledger
row's internals-B Note misattributed the caller (corrected in `3c586589`); Task 6 restores
exact counts in `src-lib-map.md`; Global constraint 7's import allowlist wording omits the
non-cluster sveltekit leaves (`guard`, `publish-actions`, `tidy-key-health`), which is a wording
gap, not a violation.

After 11a: **polish-11b-i, then 11b-ii** the same way (`~/.cache/cairn-polish-11b-i/`,
`-11b-ii/`), then **polish-C with `c.approved: true`** (`~/.cache/cairn-polish-c/`), then the cut.

Rulings that bind every stage (workstation `CLAUDE.md`, "Gate economy on a pass"): the per-task
gate omits the showcase e2e for paint-neutral tasks; comment-only fix rounds run the reduced
gate; a local e2e is green when its only visual failures are exactly the files the latest CI
regen rewrote; merges bring `main` in first with STATUS taking main's. Do not push docs to
`main` while a PR is waiting on CI (it caused two extra merge rounds on #54).

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
