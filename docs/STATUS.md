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

One conductor session (2026-09-27, `claude-opus-5-5`) is running theme identity unattended
overnight; draft docs pass 0+1 closed the same session. Resume each from its plan's ledger foot:

- **Theme identity pass A** (worktree `.claude/worktrees/theme-identity-a`, draft PR #92, class
  `paint`): segments A/B done, segment C (tasks 9-11) in flight, merges `main` in at the segment C
  boundary (blocked on a `package.json` conflict until then). Owner glance page:
  https://claude.ai/artifact/84VPNnuk9uwNwHnTtvTobx; runs unattended to its close, merge held for
  Geoff's before-and-after (ruling 2026-09-27).
- **Theme identity passes B and C**: spec approved, pass C's plan reviewed and cleared
  (`theme-c-plan`, `a6722a6e`, ceiling ruling `8000a3f3`); pass B's plan is written once A's
  segment D lands. B branches from A's closed-but-unmerged head, C from B; S3 corrections merge
  forward into B and C; all three merge with one `0.98.0` cut (Geoff, 2026-09-27).
- **Draft docs pass 0+1** closed on `draft-docs-0` (draft PR #91, full gate green); merge waits on
  Geoff's word, then the next action is the stage 2a plan (below). PRs #93, #94, #96 (chores, Go
  tool chores, setup-paid) already merged.

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

Passes B and C: once pass A's segment D lands, in a fresh session (`claude-opus-5-5`, `high`),
confirm Geoff approved the pass B/C spec, author both plans (`Pass class:`, ceiling, checkpoint per
`pass-core`), run `spec-plan-review`, and bring both to Geoff in one sitting. Read the spec's "Open
for the plan" and the fold record's moved detail first; never touch pass A's worktree.
Draft docs, after `draft-docs-0` merges: in a fresh session (`claude-opus-5-5`, `high`), author the
stage 2a plan (with its extend outline) from the approach spec's stage 2 outline, run
`spec-plan-review`, and bring it to Geoff on an R10 page.
