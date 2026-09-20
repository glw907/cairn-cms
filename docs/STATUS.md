# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional
spec. Everything past tense lives in [`docs/HISTORY.md`](HISTORY.md); this file carries only
the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, the admin motion pass, and the
docs-to-facts pass unpublished under `## Unreleased`; the window holds for one cut after
extend-1/extend-2 (below). CI on `main` is green.

## Immediate next action (2026-09-15)

**The docs-to-facts pass is MERGED** (PR #65); detail in [`docs/HISTORY.md`](HISTORY.md)
("Docs-to-facts pass, five tasks, 2026-09-15"). ROADMAP's audit-remediation entry is the canonical
routing record for this track; every slice through docs-to-facts is MERGED.

**extend-1 is IN FLIGHT, HELD on an unstable link (2026-09-19 14:55 AKDT)** on
`docs/superpowers/plans/2026-09-14-extend-1-pass.md`, workflow mode through
`pass-execute-chains.js`. Worktrees: chain A `.claude/worktrees/extend-1` (branch `extend-1`), chain B
`.claude/worktrees/extend-1-site` (branch `extend-1-site`), both off `22bc19b5`, both clean. Ceiling
6.7M; about 3.2M spent, of which about 0.9M went to three network drops, one usage-limit kill, and one
relayed-question misfire. Per-task gates come from `scripts/checks/gate-tier.mjs`, serialized on
`cairn-run-gate`'s machine lock.

Task ledger: **1, 2, 7, 8a ACCEPTED** (task 2 closed by the conductor on a doc-only second fix,
`5fd6a5fc`; task 7 at `8211bb8e`; 8a on `extend-1-site`). **8b** implementing (chain B run
`wf_749581cb-fc0`). **3, 4, 5, 6** running as chain A run `wf_ac8919a3-133` from `extend-1-runA3.js`,
whose task 6 notes carry the execution record items. Rulings taken so far are in this file's
history and the plan.

Resume, from a session inside `cairn-cms` on a stable connection: the built scripts live in the
launching session's scratchpad (`extend-1-runA3.js`, run `wf_ac8919a3-133`, tasks 3 to 6;
`extend-1-runB2.js`, run `wf_749581cb-fc0`, task 8b), so from that session issue
`Workflow({scriptPath, resumeFromRunId})` for each; from a new session, rebuild both from
`~/.cache/cairn-overnight-2026-09-14/extend-1-args.json` with the rulings above folded into the
task 2 and task 7 notes, and start each chain at its first unreviewed task. Arm the guards per
`~/.claude/docs/unattended-work-guards.md`. Then the pass-end ritual in the plan.

**Then extend-2** (`-extend-2-pass.md`, a worktree off `main`, the same chain). Their docs
deliverables now file container bullets in `docs/internal/facts/extend.md` instead of editing
the frozen `docs/extend/` pages; reference pages still update per task. extend-1's "Available
since" reads `0.97.0`, advisory rules promote at `0.98.0` (`launch.json`).

After both: **ONE cut** (the dependency sweep immediately before it; the site upgrade brief's
tools section added to the pre-cut pass). No release before this. Then **the site round:**
aksailingclub-org, ecxc-ski, and 907-life upgraded as model cairn sites, each pass filing
container bullets via `site-docs/<site>-<pass>`; then one improvement release, the public docs
rebuilt from the container, then beta.

Held for the week of 2026-09-21: Go tool pass A at `cairn-tool-a` Task 3 (draft PR #60).

## Parallel tracks

- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** Frozen record only,
  `docs/internal/record/2026-09-04-cairn-case/`; nothing from it lands.
- **Go `cairn` tool, 1.0.** Re-cut 2026-09-14 for any operator on Linux, macOS, and Windows
  (plan `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`, APPROVED 2026-09-14).
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since `0.95.0`.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `install.test.mjs`'s concurrent-poll test flaked once in a 30x local loop (2026-08-29); its
  next CI failure gets the same mock-timer deflake as the grace-window tests.
- A consumer `guard.rejected` record with `detail: 'mismatch'`, `witness: 'field'` can be the
  known double-mint residual, not a new mechanism; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, slated for deletion in the ASC repo once
  the ASC `email-announce` branch settles.
