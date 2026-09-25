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

**Next: continue docs reset pass 1b unattended from Task 7 (segments 3 to 5).** Plan
`docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md` on branch `docs-reset-1b` (worktree
`.claude/worktrees/docs-reset-1b`, head `4239b2a5`, pushed). Tasks 0 to 6 and 8 are accepted and
merged (gate green at 570 tests). The plan's "Unattended execution" section governs the rest: start
guards, per-task Agent chains (never the `pass-execute` workflows), stop-and-ask conditions, the CLI
hold at 2.1.282 with its init-baseline pin before Task 9, and checkpoints. Carry notes:
`docs/superpowers/research/2026-09-24-pass-1b-carries.md`. Spend 12.50M counted at the handoff;
ceiling 25M, flag 21M (O10). The lane worktrees `docs-reset-1b-{export,runner,pathmap}` are merged and
can be removed. The scratch site stands through pass 2a. Still owed from pass 1: the `~/.dotfiles`
push and `claude-tooling-sync verify`.

Open items for Geoff: the owner brief says "all 28 registered rules"
(`what-cairn-is-and-is-not.md:49`), and the audit has 36 rule modules; stale facts `f:ab9kzr`
(published version `0.96.0`) and `f:75hawi` (free tier), and `docs/why-cairn.md:41` against its
line 84; the earlier Cloudflare token mints to revoke; the global `CLAUDE.md` over its 6k budget.

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
`/var/home/glw907/Projects/cairn-cms`, continue docs reset pass 1b unattended from Task 7 on branch
`docs-reset-1b` (worktree `.claude/worktrees/docs-reset-1b`). Read the plan
(`docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`) and the spec in full, then the carry
notes, and follow the plan's "Unattended execution" section for guards, mode, spend, checkpoints,
and the conditions that stop the run for Geoff.
