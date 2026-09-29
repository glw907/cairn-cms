# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.97.0`** on npm `latest` (release commit `eefd51b4`, GitHub release `v0.97.0`),
with `@glw907/cairn-cms-dev` `0.97.0` beside it. It carries everything through the Go tool's B2,
the doctor retirement, draft docs pass A, and the pre-cut dependency top-up (PR #86, `2e497a1a`).
The Go `cairn` tool ships separately as `tool/v1.1.0`. `main` has no `## Unreleased` window yet.
Held majors: `devalue` 6, TypeScript 7, Vitest 5, `@types/node` 26. CI is green.
cairn.pub's own docs debt: [handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md),
un-pinnable against the registry since `0.95.0`. Live contracts:
`tool/internal/{spine/conditions,doctor/site-config-path}.json` (`check:tool-conditions`) and
`.cairn/site-facts.json` (`cairn-manifest`, verified in the plugin's `buildStart`).

## Immediate next action

Three initiatives are live; resume each from its plan's ledger foot:

- **Theme identity pass A** (branch `theme-identity-a`, PR #92, head `8640528f`): S3 sitting done
  ("all per recommendation"), its corrections landed (`9ef7b8b3`, gate green). Owed, in order: the
  S4 baseline regeneration, a `diff-reviewer` read of the correction run, `code-simplifier` over
  it, CI green, then merge PR #92 (Geoff approved pass A merging on its own, 2026-09-28). Ledger
  foot: `docs/superpowers/plans/2026-09-26-theme-identity-pass-a.md`.
- **Theme identity pass B** (branch `theme-identity-b`): segments A and B done, segment C (the
  shipped guidance and its exemplar, then the sync test) next. Ledger foot:
  `docs/superpowers/plans/2026-09-27-theme-identity-pass-b.md`.
- **Theme identity pass C**: reviewed plan waits on branch `theme-c-plan`
  (`docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md`), runs after pass B, cuts `0.98.0`.
- **Draft docs pass 0+1**: merged (PR #91, `8bbe78f5`); the stage 2a plan is next (below), after
  pass B merges (Geoff, S3 Q21). The style-guide sync must land before stage 2a drafts its
  first page.
- **Style-guide sync** (branch `style-guide-sync`, worktree `.claude/worktrees/style-guide-sync`,
  head `fb1aeba3`; chain W in `~/Projects/.worktrees/dotfiles-style-guide-sync`): paused in
  segment A for a re-scope. **Geoff's ruling (2026-09-28): a proven, battle-tested system, nothing
  invented.** Verdicts and sources: `docs/superpowers/research/2026-09-28-style-guide-sync-leanness.md`
  on the branch.
## Open decisions and watches

- Draft docs stage 1's two pages deferred to theme identity pass B (the admin subpath rename, the
  new `./public` page) need the same fact-read batch once pass B lands. `checkOrigin` to
  `csrf.trustedOrigins` becomes its own small `auth-data` pass after `0.98.0`, run when Geoff can
  make the magic-link click.
- Node 26 becomes the floor at beta only if Active LTS by then; TypeScript 7 stays held until
  `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly). extend-1's two advisory audit rules
  go to error tier at `0.98.0`; `cairn-audit --rendered` counts differently on identical runs (133
  then 116), stabilize before trusting either.
- Monthly routines (a Cloudflare review, a Claude Code guidance-schema check) email only on a
  mismatch; `CAIRN_GH_READ_TOKEN` expires 2026-10-19, the daily `cairn-tripwire` catches it early.
  A consumer `guard.rejected` (`detail: 'mismatch'`, `witness: 'field'`) can be the known
  double-mint residual. npm 11 flags the four leading-`./` `bin` entries for removal (still
  shipping, `0.97.0` verified); `npm pkg fix` is owed before a newer npm drops them.

## Resume prompt

Theme identity, fresh session (`claude-opus-5-5`, `high`): finish pass A per its bullet above,
then merge `main` into `theme-identity-b`, carrying A's `src/lib/components` fixes across B's
rename to `src/lib/admin`; confirm PR #95 is green; resume pass B at segment C. Pass C follows B.
Style-guide sync re-scope, fresh session (`claude-opus-5-5`, `high`): in
`.claude/worktrees/style-guide-sync`, read the leanness record, then revise the spec and plan to
the conventional stack it names, walking back R1's markers and provenance table and W1's
extraction validator and coercion on the branch. Every kept mechanism names its published source, and the target register is preserved in full (the record's "Constraint" section).
No open brainstorm: open with one short sitting on three forks (the editor-track exemplar, keep
or A/B-test the LLM editor pass in J2, the pass ceiling), each with a recommendation; decide the
method calls (trim or revert R1, W1's walk-back, the companion exemplars around the AI posture
page) and show them. Then revise, run `spec-plan-review`, and execute.
Draft docs, after pass B merges: in a fresh session (`claude-opus-5-5`, `high`), confirm the
style-guide sync brainstorm has landed, author the stage 2a plan (with its extend outline) from the
approach spec's stage 2 outline, run `spec-plan-review`, and bring it to Geoff on an R10 page.
