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

Execute draft docs pass 0+1 (setup and reference), plan
[`2026-09-26-draft-docs-pass-0-1.md`](superpowers/plans/2026-09-26-draft-docs-pass-0-1.md),
approved by Geoff 2026-09-26, implementing the approved spec
[`2026-09-26-draft-docs-approach-design.md`](superpowers/specs/2026-09-26-draft-docs-approach-design.md)
(rulings R1 to R10). Pass ceiling about 9.6M, flag at 7.7M; the initiative's working ceiling is
30M, and the stage 2a pilot checkpoint brings Geoff one ceiling-and-scope question. The spec
authorizes stages 0, 1, and the 2a pilot only. Still owed: the `~/.dotfiles` push.

Open items for Geoff: the four stale owner facts (`what-cairn-is-and-is-not.md:49` rule count,
`f:ab9kzr`, `f:75hawi`, `docs/why-cairn.md:41` against line 84) settle in the plan's task 9
sitting; the earlier Cloudflare token mints to revoke; the global `CLAUDE.md` over its 6k budget.

The reader harness is removed. Still Geoff's: revoke `CAIRN_SCRATCH_CF_TOKEN` (Cloudflare
dashboard) and `CAIRN_DOCS_READER_OAUTH_TOKEN` (claude.ai settings), then drop both from the age
store and `~/.dotfiles/secrets/registry.md`; the scratch site `cairn-scratch-b` (Worker, D1,
GitHub repo) awaits his delete confirmation.

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
- npm 11 warns it removes the four `bin` entries with a leading `./`; they still ship (`0.97.0`
  verified). Run `npm pkg fix` in the next window, before a newer npm makes the removal real.

## Resume prompt

In a fresh session started with `claude --model claude-opus-5-5` at effort `medium`, in
`/var/home/glw907/Projects/cairn-cms`, execute draft docs pass 0+1 as a thin conductor: read
`docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md` and its spec, run the plan's
pre-flight (warm `~/.dotfiles` paths, `/cost` coverage), then dispatch segment A.
