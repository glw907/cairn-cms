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

**Next: docs reset pass 1b, the validation redesign (Geoff, 2026-09-24).** Pass 1's writing
system is built; its validation failed on the validation's own design
(`docs/internal/record/2026-09-23-docs-reset-validation.md`). Pass 1b brainstorms, pre-registers a
plan, and reruns on the merged system; pass 2a waits for it. Open questions (plant placement, rule
candidates under a new cap, a job-tester bar, the model mix): the pass 1 ledger's "decision" row.
The scratch site stands through pass 2a (teardown: `internal/record/2026-09-23-scratch-site.md`).

After the `docs-reset-system` PR merges: the fact-id rule into the shared agent definitions, the
`~/.dotfiles` push, and `claude-tooling-sync verify` (plan Task 12).

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

In a fresh session started with `claude --model claude-opus-5-5` at effort `high`, in
`/var/home/glw907/Projects/cairn-cms`, start docs reset pass 1b on a new worktree off `main`.
Read `ROADMAP.md`'s docs reset entry, the pass 1 plan's ledger "decision" row and post-mortem
(`docs/superpowers/plans/2026-09-23-docs-reset-pass-1.md`), and the validation record. Brainstorm
the validation redesign with Geoff, then author a pre-registered plan that fixes its bars before
any run.
