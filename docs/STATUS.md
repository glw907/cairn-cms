# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.96.0`** on npm `latest`. `main` carries every pass through the Go tool's B2 (PR
#71), the doctor-retirement pre-task, retire-1, and draft docs pass A, unpublished under
`## Unreleased`; the window holds for one cut and includes the tool's 1.0 (`tool/v1.0.0`,
`tool/v1.0.1`, commit `9b479e8d`). Held majors: `devalue` 6, TypeScript 7, Vitest 5. CI is green.

**The doctor retirement is half done**, the Go half merged untagged from `doctor-go`; retire-2a
removes the engine's doctor. **Draft docs pass A is merged**, the tool's contract pages and
schemas now shipping inside the npm tarball; cairn.pub's own debt is
[this handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md), un-pinnable against the
registry since `0.95.0` on `pass-d-docs-tracks`. Live contracts from the pre-task:
`tool/internal/{spine/conditions,doctor/site-config-path}.json` under `check:tool-conditions`,
and `.cairn/site-facts.json`, written by `cairn-manifest`, verified in the plugin's `buildStart`.

## Immediate next action

**`tool/v1.1.0` is tagged and released** (tag object `6dcfdf22` on merge commit `59b920f1`, PR #82;
release run `35754462389` green on all three legs, six archives plus `SHA256SUMS`, attestation
verified, `make -C tool install-check VERSION=v1.1.0` green in both containers). The URL fork
ruled on 2026-09-22 by the conductor under Geoff's delegation: 1.1.0 prints the cairn.pub URLs
exactly as 1.0.1 does; the 404s are cairn.pub's debt, recorded in
[the pass A handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md), and no tool patch
follows. **retire-2a is at its close** on `doctor-engine` off `main` at `59b920f1`: Tasks 1 to 6 accepted, branch gate-green and clean at `3b7f50c6` (Task 5 accepted on an `escalate` that was a plan defect, the removal grep hitting a rulings-ledger id; Task 6 accepted after one fix round of six false statements the Opus 5.5 reviewer caught). Spend is about 2.66M against the 2.6M ceiling, over by the close; Geoff decides at this boundary. Task 7 remains: the fold agent runs `retire-2a-close.md` in `~/.claude/projects/-var-home-glw907-Projects-cairn-cms/retire-2a-scratchpad-2026-09-22/` (its conductor decisions section carries the Task 5 ruling and 2b's friction items), then one `diff-reviewer` read, the merge from `main`, the full heavy re-gate, the PR, and the one STATUS line. Runner lesson for the close's HISTORY entry: `gate-tier.mjs` computes a reduced gate from the diff and overrode the task's explicit full gate string on both Task 6 rounds, so the reviewer ran the omitted docs checks itself; the runner should honor an explicit gate.

**The `0.97.0` cut HOLDS on five steps, in order (Geoff, 2026-09-21):** the tool's 1.0 (DONE, with
the pre-task behind it); retire-1 (DONE); draft docs pass A (DONE); one `tool/v1.1.0` tagged from a
commit carrying retire-1 and pass A (DONE); the engine removal, retire-2a then retire-2b. Each close
writes only its own line, and **ONLY retire-2b's close, the last, releases `0.97.0`**; a cut
session finding no such line does not cut. Retire-2a owns two carry-forwards: `site-facts.md:36`
links the deleted `doctor.md`, and `doctor.md:79-86`/`facts/reference.md` share `config.bindings-missing`.

## Open decisions and watches

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026);
  TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).
- extend-1's two advisory audit rules go to error tier at `0.98.0`; `cairn-audit --rendered`
  counts differently on identical runs (133 then 116), stabilize before trusting either.
- Monthly routines: a Cloudflare capability review (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) and a Claude
  Code guidance-schema check (`trig_01UyjoYo9hbGqm7qTeb7HGVH`), emailing only on a mismatch.
  `CAIRN_GH_READ_TOKEN` expires 2026-10-19; the daily `cairn-tripwire` catches it early.
- A consumer `guard.rejected` with `detail: 'mismatch'`, `witness: 'field'` can be the known
  double-mint residual; the discriminator names any genuinely new one. Three ASC staging harvest
  docs are folded into cairn, deletable once `email-announce` settles; the heavy gate runs the
  component project serially (`--no-file-parallelism`).

## Resume prompt

In a fresh session (after `brew upgrade --cask claude-code@latest` and the `opus-5-5-adoption` chore),
resume retire-2a at Segment C on the `doctor-engine` worktree, then retire-2b (its executing session
starts on `claude-opus-5-5`, the first pass under the phase-split conducting rule),
each on its own branch and worktree. Cut `0.97.0` last;
`ROADMAP.md` sequences what follows.
