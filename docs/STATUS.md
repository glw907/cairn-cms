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

**Next: merge docs reset pass 1b (PR #89) on Geoff's word, then brainstorm pass 2a.** Pass 1b
closed on its tuning record (O11, Geoff 2026-09-25): no freeze and no gated runs, so every reader
class goes to pass 2a as advisory. Records: `docs/internal/record/2026-09-24-docs-reset-1b-{tuning,validation}.md`.
Post-mortem, ledger (20.07M counted), and a draft program budget (lean pass 2a about 8.5M) are at the
foot of `docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`. Pass 2a's design must first answer
the catch-field finding: readers file routed-around defects only as rule candidates. Its inputs are
in `ROADMAP.md`'s docs reset entry. Program ruling O12 (Geoff, 2026-09-25): pass 2a has a ceiling of 6M with the flag at 5M. It opens
with a go/no-go reader pilot on round 1's planted trees (about 0.6M) that tests a reader change for
routed-around defects: readers join the chain as its reader stage only if on-map recall per plant-run
rises to a clear majority, and stay advisory otherwise. Then come the profiles and the exemplar
review, with no formal trial and no freeze. Pass 2b (the outline) gets 8M. Drafting plans at 0.7M
per page plus 1.5M per pass. The program cap is about 45M counted. After the first drafting pass,
compare the measured cost per page with 0.7M and cut the chain or the page count, never the cap. The CLI hold is released in
dotfiles `75f3d96`. Still owed: the `~/.dotfiles` push and `claude-tooling-sync verify`. The lane
worktrees `docs-reset-1b-{export,runner,pathmap}` can be removed.

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

After PR #89 merges, in a fresh session started with `claude --model claude-opus-5-5` at effort
`high`, in `/var/home/glw907/Projects/cairn-cms`, brainstorm docs reset pass 2a. Read the parent
spec (`docs/superpowers/specs/2026-09-23-docs-reset-design.md`, including "Amendments from pass
1b"), the pass 1b validation record and post-mortem, and `ROADMAP.md`'s docs reset entry. Start from
program ruling O12 above; settle the pilot's reader change and its pass mark with Geoff before planning.
