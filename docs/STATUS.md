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

One conductor session (2026-09-27, `claude-opus-5-5`) is running four streams unattended toward an
overnight run. If it dies, resume each from its plan's ledger foot:

- **Theme identity pass A**, worktree `.claude/worktrees/theme-identity-a`, draft PR #92, class
  `paint`. Segments A and B done; segment C (tasks 9 to 11) in flight. PR #92 conflicts with
  `main` in `package.json` (both sides add a script line), so no CI has run since segment A: the
  segment C boundary merges `main` in, keeping both lines, before it pushes. Owner glance page:
  https://claude.ai/artifact/84VPNnuk9uwNwHnTtvTobx. Geoff's rulings (2026-09-27): pass A runs past
  S3 on async review, through S1, task 15, S4, and its close, with the merge held for his
  before-and-after.
- **Theme identity passes B and C**, spec approved. Pass C's plan is reviewed and cleared to run
  (`theme-c-plan` branch, `a6722a6e` plus the 29M ceiling ruling `8000a3f3`). Pass B's plan is
  written and reviewed after pass A's segment D lands, then run without Geoff's read (standing
  rule, `plans-proceed-on-adversarial-review` memory). **Ruling (Geoff, 2026-09-27):** pass B
  branches from pass A's closed but unmerged head, not from `main` after A merges; pass C
  branches from B. S3 corrections land on A and merge forward into B and C; A, B, and C merge
  with the one `0.98.0` cut.
- **Go tool architecture chores**, worktree `.claude/worktrees/go-chores-plan`, plan
  `docs/superpowers/plans/2026-09-27-go-tool-architecture-chores.md` (approved), class `tool`,
  light gate only. S1 and S2 done, S3 in flight; about 4M of 8.5M.
- **Draft docs pass 0+1**, resumed for segment B only (Geoff lifted the hold for its tooling
  tasks): tasks 6 and 8 accepted, task 7 in flight, plan amended to pass classes (`14d3f7ac`).
  Task 9 is Geoff's sitting; task 10 waits on pass B's rename.

The chores batch merged as PR #93 (`283a63d1`).

## Open decisions and watches

- Rulings (Geoff, 2026-09-27): the Go pass merges on a green close. Draft docs task 10 splits:
  it runs overnight on every reference page except the admin subpath page pass B renames and the
  `./public` page it creates, which run after pass B lands. The `checkOrigin` to
  `csrf.trustedOrigins` migration becomes its own small `auth-data` pass after the `0.98.0` cut:
  planned and reviewed unattended, run when Geoff can make the magic-link click.

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

Passes B and C plans, once pass A's plan ledger records segment D accepted: in a fresh session
started with `claude --model claude-opus-5-5` at effort `high`, in
`/var/home/glw907/Projects/cairn-cms`, confirm Geoff has approved the pass B and C spec, then
author both plans from it (each with its `Pass class:`, token ceiling, and checkpoint interval per
`pass-core`), run `spec-plan-review` on both, and bring them to Geoff in one sitting. Read the
spec's "Open for the plan" and the fold record's moved detail first; never touch pass A's
worktree.

Draft docs, after passes B and C merge: in a fresh session started with
`claude --model claude-opus-5-5` at effort `medium`, in `/var/home/glw907/Projects/cairn-cms`,
resume draft docs pass 0+1 as a thin conductor at segment B: merge `main` into `draft-docs-0`,
read the plan's ledger on that branch, then dispatch tasks 6 and 8 through `pass-execute`.
