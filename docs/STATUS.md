# cairn-cms status

Present tense only; everything past tense is [`docs/HISTORY.md`](HISTORY.md), durable orientation
is `CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.96.0`**, on npm `latest` for `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`,
provenance attested. `main` carries eleven engine passes plus chassis-A/B1/B2,
polish-11a/11b-i/11b-ii/C, the admin motion pass, docs-to-facts, extend-1, extend-2, the pre-cut
pass (PR #69), and the Go tool's Pass B2 (PR #71), unpublished under `## Unreleased`; the window
holds for one cut. Held majors: `devalue` 6, TypeScript 7, Vitest 5. Two `npm audit` findings (a
`cookie` transitive under `@sveltejs/kit`, a `@cloudflare/vitest-pool-workers` transitive) need
`--force` or a downgrade and are held. CI on `main` is green.

## Immediate next action

**The `0.97.0` cut HOLDS on five steps, in order (Geoff, 2026-09-21):** the Go tool's 1.0 (B2,
DONE); the doctor retirement's Go half (retire-1), merged WITHOUT a tool tag; draft docs pass A
(`docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md`), which moves the tool's contract pages
and schemas under `docs/reference/`; one `tool/v1.1.0`, tagged and released from a commit carrying
both; the retirement's engine half (retire-2), which removes the `cairn-doctor` bin only once that
release exists. Each close writes only its own line, and **ONLY retire-2's close, the last to
land, writes the line releasing `0.97.0` from this hold**. A cut session finding no such line does
not cut, and every mechanical gate in Task 6 must pass whatever any line says. The `tool/v1.1.0`
tag session's runbook, scope, and Geoff's-go gate live in
`docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`.

**The Go tool's 1.0 is merged, tagged, and released: `tool/v1.0.0` (commit `3110e875`) and
`tool/v1.0.1` (commit `9b479e8d`, the full release page), merged to `main` as MERGE SHA RECORDED
HERE AFTER THE MERGE. The cut still waits on the doctor-retirement track and draft-docs pass A.**

**The cut includes the tool's 1.0**, per Task 6 of
`docs/superpowers/plans/2026-09-21-pre-cut-pass.md` and `ROADMAP.md`'s "The window after the cut"
entry.

What follows the cut is sequenced in `ROADMAP.md`'s "The window after the cut" entry: the docs
chore, the docs-infra currency pass, the draft docs, the site round, the improvement release,
the docs rebuild, then beta.

## Parallel tracks

- **Go `cairn` tool: 1.0 is shipped.** What follows is governed by
  `docs/superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md`: use through the site round,
  1.1 headed by the agent-permission check, the HUD a 1.x minor under `cairn hud`, 2.0 reserved
  for a break and aimed at provisioning. The next tool session is the retirement's. Owner rulings:
  `docs/internal/record/2026-09-21-go-tool-b2-owner-rulings.md`. The owner's `cairn-tripwire`
  timer runs daily here; its `CAIRN_GH_READ_TOKEN` expires 2026-10-19.
- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** Frozen record only,
  `docs/internal/record/2026-09-04-cairn-case/`.
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since `0.95.0`.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).
- extend-1's two advisory audit rules (`log-event-grammar`, `log-secret-field`) go to error tier
  at `0.98.0`.

## Active watches

- Monthly routines: a Cloudflare capability review (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) over
  `ROADMAP.md`'s "Platform watch: Cloudflare"; a Claude Code guidance-schema check
  (`trig_01UyjoYo9hbGqm7qTeb7HGVH`) emailing only on a mismatch, whose fix moves the bake's line,
  `cairn-guidance check`'s line, the agent frontmatter, and `docs/reference/guidance.md` together
  with a `Consumers must:` line.
- `install.test.mjs`'s concurrent-poll test flaked once in a 30x loop (2026-08-29); its next CI
  failure gets the grace-window tests' mock-timer deflake.
- A consumer `guard.rejected` with `detail: 'mismatch'`, `witness: 'field'` can be the known
  double-mint residual; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, for deletion in the ASC repo once its
  `email-announce` branch settles.
- `cairn-audit --rendered` counts differently on identical runs (133 then 116); stabilize before
  it gates. The heavy gate runs the component project serialized here
  (`vitest-browser-parallel-pages-stall` memory).

## Resume prompt

**Doctor retirement:** In a fresh session, conduct it from
`docs/superpowers/specs/2026-09-21-doctor-retirement-design.md` and the `doctor-retirement-pass`
memory. Geoff approved the spec and four plans on 2026-09-21, under `docs/superpowers/plans/`:
the pretask, `doctor-retire-1-go` (with its pass A inventory under `docs/internal/record/`),
`doctor-retire-2-engine`, and `doctor-retire-2b-records`, whose close writes the cut's unblocked
line. The pre-task is on worktree `.claude/worktrees/doctor-pretask`: Tasks 1 to 3 are accepted, at
a Task 3 checkpoint; Task 4 and its close remain, and no pre-task PR exists yet. Finish it, open
and merge its PR after B2 lands, then run the passes in the order the hold paragraph above sets.

**One cut:** Cut `0.97.0` (Task 6 of `docs/superpowers/plans/2026-09-21-pre-cut-pass.md`) once the
tool's 1.0 is released AND `cairn-doctor` is retired on `main`; verify both first.
