# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.97.0`** on npm `latest` (release commit `eefd51b4`, GitHub release `v0.97.0`),
with `@glw907/cairn-cms-dev` `0.97.0` beside it. It carries everything through the Go tool's B2,
the doctor retirement (retire-1, retire-2a `688aba41`, retire-2b `2fa772ba`), draft docs pass A,
and the pre-cut dependency top-up (PR #86, `2e497a1a`). The Go `cairn` tool ships separately as
`tool/v1.1.0`. `main` has no `## Unreleased` window yet. Held majors: `devalue` 6, TypeScript 7,
Vitest 5, `@types/node` 26. CI is green.

cairn.pub's own docs debt is [this handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md),
un-pinnable against the registry since `0.95.0` on `pass-d-docs-tracks`. Live contracts from the
pre-task: `tool/internal/{spine/conditions,doctor/site-config-path}.json` under
`check:tool-conditions`, and `.cairn/site-facts.json`, written by `cairn-manifest`, verified in the
plugin's `buildStart`.

## Immediate next action

**Docs reset pass 1, the writing system.** The docs are reset from scratch (only verified facts
survive), and pass 1 builds and validates the writing system first: confined podman reader
agents, stable fact ids with sentence-level provenance, the drafter agent, a v2 page chain,
docs-as-tests, and validation with controls and a held-out defect set. Spec
`docs/superpowers/specs/2026-09-23-docs-reset-design.md`; plan
`docs/superpowers/plans/2026-09-23-docs-reset-pass-1.md` (13 tasks, ceiling 12M, flag 9.6M).
Inputs are ready: the readers' plan token (`CAIRN_DOCS_READER_OAUTH_TOKEN`, age store, verified
with `apiKeySource: none`) and the exemplar corpus (68 captures at
`~/.local/share/cairn/exemplars/`, manifest `docs/internal/record/docs-exemplars.md`). Task 0's
remaining owner items, the Cloudflare token scoped to the scratch Worker and the GitHub App
installation confirmation, come after the conductor creates the scratch site. Pass 2a (audience
record, exemplar review, calibration trial) follows pass 1's close.

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
- `npm publish` (npm 11) warns that it removes the four `bin` entries because their paths carry
  a leading `./`; the entries still ship (verified in the `0.96.0` and `0.97.0` tarballs and
  registry metadata). Drop the `./` prefix (`npm pkg fix`) in the next window before a newer npm
  turns the warning into a real removal.

## Resume prompt

In a fresh session started with `claude --model claude-opus-5-5` (effort `medium`), execute docs
reset pass 1 (`docs/superpowers/plans/2026-09-23-docs-reset-pass-1.md`) through the `cairn-pass`
skill, on a `docs-reset-system` worktree off `main`. Start with Task 0: write the STATUS line,
create the private scratch site, then ask Geoff for the Cloudflare token and the GitHub App
confirmation in one question.
