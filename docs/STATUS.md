# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.96.0`** on npm `latest`. `main` carries every pass through the Go tool's B2 (PR
#71), the doctor-retirement pre-task, retire-1, draft docs pass A, and retire-2a, unpublished
under `## Unreleased`; the window holds for one cut and includes the tool's 1.0 (`tool/v1.0.0`,
`tool/v1.0.1`, commit `9b479e8d`). Held majors: `devalue` 6, TypeScript 7, Vitest 5. CI is green.

**The doctor retirement is code-complete**: the Go half ships as `tool/v1.1.0`, and the engine
half is on `main` as retire-2a's merge `688aba41` (`src/lib/doctor` and the `cairn-doctor` bin are
gone; the media-seed bin stands alone under `src/lib/media-seed/`). **The records pass, retire-2b,
is on `main`** as merge `2fa772ba` (PR #84): the `## Unreleased` removal entry and its
`Consumers must:` line, the ledger entries, the facts bullets, and the ROADMAP sweep. Plan and
post-mortem: `docs/superpowers/plans/2026-09-21-doctor-retire-2b-records.md`.

cairn.pub's own docs debt is [this handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md),
un-pinnable against the registry since `0.95.0` on `pass-d-docs-tracks`. Live contracts from the
pre-task: `tool/internal/{spine/conditions,doctor/site-config-path}.json` under
`check:tool-conditions`, and `.cairn/site-facts.json`, written by `cairn-manifest`, verified in the
plugin's `buildStart`.

## Immediate next action

**The 0.97.0 cut is unblocked** (retire-2b's close, 2026-09-23): tag `tool/v1.1.0` (tag object
`6dcfdf22`), retire-2a's merge `688aba41`, and retire-2b's merge `2fa772ba`. All five steps Geoff
ordered on 2026-09-21 are done: the tool's 1.0, retire-1, draft docs pass A, `tool/v1.1.0`, and
the engine removal with its record. Cut `0.97.0` next, through `cairn-release`.

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
- Both lockfiles still map the retired `cairn-doctor` bin; the next `dependency-upgrade` sweep
  clears it (ROADMAP, Next).

## Resume prompt

In a fresh session started with `claude --model claude-opus-5-5` (effort `medium`), confirm the
unblock line above names `tool/v1.1.0`, `688aba41`, and retire-2b's merge SHA, then cut `0.97.0`
through `cairn-release`. `ROADMAP.md` sequences what follows.
