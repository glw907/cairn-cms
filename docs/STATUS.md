# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## retire-2b checkpoint (Segment A done, 2026-09-22)

Branch `doctor-records` (worktree `.claude/worktrees/doctor-records`), off `65092fc1`. Tasks 1-3
accepted by `diff-reviewer`: facts at `b0718f80` (one fix round), changelog at `8104cb65` (a third
round on the conductor's call after a second `fix`, the reviewer's own round-one error among the
four), ledger and ROADMAP at `1efef1b8` (one fix round; `Shape:` count 87 to 91). Task 4, the close,
has not started. The 800K flag tripped: subagent spend is 1.1M to 2.1M, depending on whether a
resumed agent's figure is cumulative. The close waits on Geoff's budget call. Carried to the close:
`cli-cairn-doctor.md:3-4` still names 1.0.1 as the current release; `engine-rulings.md:5040` names
`edge.https-forced` where the health id is `https-forced`; optional polish at CHANGELOG.md:569-570
and :589, engine-rulings.md:5042 and :6480; about eighteen ROADMAP proposals still name the retired
`cairn-doctor` as actor (enumerated in the Task 3 review), a scope call for Geoff. Task 3 wrote eight
new entries, and retire-1's `doctor-go-site-config-narrowing` covers the ninth ruled item.

## Current state

Published: **`0.96.0`** on npm `latest`. `main` carries every pass through the Go tool's B2 (PR
#71), the doctor-retirement pre-task, retire-1, and draft docs pass A, unpublished under
`## Unreleased`; the window holds for one cut and includes the tool's 1.0 (`tool/v1.0.0`,
`tool/v1.0.1`, commit `9b479e8d`). Held majors: `devalue` 6, TypeScript 7, Vitest 5. CI is green.

**The doctor retirement is code-complete**: the Go half shipped as `tool/v1.1.0`, the engine half
merged as `688aba41`; retire-2b records it. **Draft docs pass A is merged**, the tool's contract pages and
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
follows. **The engine's doctor is removed on `main`** (retire-2a, PR #83, merge `688aba41`, CI green on that SHA; `src/lib/doctor` and the `cairn-doctor` bin are gone, the media-seed bin stands alone under `src/lib/media-seed/`), and **the records pass, retire-2b, is pending**: plan `docs/superpowers/plans/2026-09-21-doctor-retire-2b-records.md`, on its own branch and worktree off `main`, conducted by a fresh `claude-opus-5-5` session. Its inputs from 2a's post-mortem: five friction items (the install-literal test gap, the tool's PASS-titled-with-failure render, the contributor-register paragraphs on `is-it-working.md`, `guidance/bin.ts`'s realpath-less containment, and both lockfiles' stale `cairn-doctor` bin mapping, cleared by the next `dependency-upgrade` sweep), the changelog entry, the ledger entries, and the STATUS-to-HISTORY migration. Only 2b's close writes the unblock line.

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

In a fresh session started with `claude --model claude-opus-5-5` (the first pass under the phase-split
conducting rule; effort `medium`), execute retire-2b
(`docs/superpowers/plans/2026-09-21-doctor-retire-2b-records.md`) on a `doctor-records` worktree off
`main` at `688aba41` or later, through the `cairn-pass` skill. Its close writes the `0.97.0` unblock
line; cut `0.97.0` last, through `cairn-release`. `ROADMAP.md` sequences what follows.
