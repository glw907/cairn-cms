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

## Immediate next action (2026-09-12 11:20)

**Polish-11a is MERGED** (PRs #55 and #56, CI green; the pass entry and post-mortem are in
[`HISTORY.md`](HISTORY.md)). Twelve of its thirteen tasks shipped; Task 9 (the doctor transcripts
re-recorded) is deferred because the capture scratch site under
`~/Projects/cairn-scratch/2026-08-16-capture/` no longer builds against the current engine's
render-authoring API, so the bare-versus-credentialed doctor contrast cannot be captured. Redo it
after rebuilding or repairing that site on the current engine.

**Polish-11b-i is the stage in flight**, driven by the overnight orchestrator from the session
that ran 11a (run `wf_2d52758e-603`, scratchpad copy of `~/.cache/cairn-overnight-2026-09-12/`);
11b-ii follows in the same launch. Polish-C with `c.approved: true` and the release cut are the
next launch (`~/.cache/cairn-polish-c/`). If this session is gone, resume per that cache dir's
`LAUNCH.md` with the merge-step and gate-runner fixes recorded there.

Carry-forwards from 11a's reviews, none gated: `docs/admin/own-your-domain.md` still carries
the free-until framing and quotes the old Workers Paid prompt (the CLI copy changed in Task 8);
the scaffold transcript fixture `01-create-cairn-site.txt` carries the old hand-over sentence;
HISTORY's identity-seam heading lacks the "audit remediation" prefix its siblings carry.

Rulings that bind every stage (workstation `CLAUDE.md`, "Gate economy on a pass"): the per-task
gate omits the showcase e2e for paint-neutral tasks; comment-only fix rounds run the reduced
gate; a local e2e is green when its only visual failures are exactly the files the latest CI
regen rewrote; merges bring `main` in first with STATUS taking main's. Gates run only through
`cairn-run-gate`, which now paces its own wait (an implementer re-calls it, never polls a log).
A merge step pushes main after its STATUS commit so the next stage's pull fast-forwards.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1, 2a, 2b, 3, 4a, 4b, 5 (internals), 6
  (internals-B), 7 (internals-C), chassis-A, and chassis-B1 MERGED. Next: chassis-B2
  (immediate next action above), then the final **polish** slice (Geoff, 2026-09-01: a full-surface
  cleanliness-and-beauty sweep, reading the exports as a family, the docs cover to cover,
  and the rendered admin against the design system; it also carries the OfficeList
  outright-retire question ruling-first, the `aria-disabled`-versus-native-`disabled`
  busy-idiom ruling, and the items ROADMAP's polish sub-bullet lists); ONE release cut
  after polish. Polish-11a Tasks 4 to 6 retired `content-routes-media.ts`, the last file
  on the audit's monolith list, into four cluster modules; ROADMAP's audit-remediation
  entry is the canonical routing record. Standing chassis mandate (Geoff, 2026-09-01): the chassis is the most
  developer-visible part of cairn and SETS the code bar, so its quality bar equals the
  engine's; the chassis plan opens with a fresh showcase review at the exemplar bar and
  treats the ROADMAP's older 14-finding list as input, never the ceiling; chassis precedes
  polish because polish's cover-to-cover docs read must see the chassis that teaches the
  surface.
- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** The frozen case record
  and its inputs stay under `docs/internal/record/2026-09-04-cairn-case/` as history; the
  uncommitted front-door proposal, the two figures, their emitter, and the `check:figures`
  wiring were deleted after a harvest into the `site-figures-harvest` memory. Every doc will be
  rewritten; nothing from the initiative lands.
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
