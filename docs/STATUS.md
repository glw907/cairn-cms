# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.97.0`** (npm `latest`, `eefd51b4`, release `v0.97.0`; `@glw907/cairn-cms-dev`
`0.97.0` beside it); the Go tool is `tool/v1.1.0`. `main`'s `## Unreleased` holds theme identity
pass A (merged, PR #92) and draft docs pass 0+1. Held majors: `devalue` 6, TypeScript 7,
Vitest 5, `@types/node` 26. CI is green. cairn.pub pins `0.94.0-rc.1`, un-pinnable since `0.95.0`;
its docs debt: [handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md). Live contracts:
`tool/internal/{spine/conditions,doctor/site-config-path}.json` (`check:tool-conditions`) and
`.cairn/site-facts.json` (`cairn-manifest`, verified in the plugin's `buildStart`).

## Immediate next action

- **Theme identity pass C** (with B): executed through segment E on `theme-identity-c` (worktree
  `.claude/worktrees/theme-identity-c`, draft PR #97, which supersedes B's PR #95 at the merge).
  Tasks 0 to 14 are accepted, S1 and S2 are done, and the ledger sits at the foot of the plan
  (`docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md`). **Next: S3, Geoff's owner sitting**,
  then task 15 (close, merge B and C, cut `0.98.0`). The draft docs harvest waits on this merge.

## Open decisions and watches

- Draft docs stage 1's two pages deferred to pass B (the `./admin` rename, the new `./public` page)
  take the same fact-read batch once B merges. `checkOrigin` to `csrf.trustedOrigins` is a small
  `auth-data` pass after `0.98.0`, run when Geoff can make the magic-link click.
- Node 26 is the beta floor only if Active LTS by then; TypeScript 7 waits on a green
  `svelte-check --tsgo` (`tsgo.yml`, weekly). extend-1's two advisory audit rules go to error at
  `0.98.0`. `cairn-audit --rendered`'s unstable counts are `viewport-overflow` measuring before the
  shell's layout settles (ROADMAP Now, before the cut).
- Monthly routines (Cloudflare, guidance schema) email only on a mismatch. `CAIRN_GH_READ_TOKEN`
  expires 2026-10-19 (`cairn-tripwire` warns daily). A consumer `guard.rejected`
  (`detail: 'mismatch'`, `witness: 'field'`) can be the double-mint residual. npm 11 flags the
  four leading-`./` `bin` entries (shipping in `0.97.0`); `npm pkg fix` is owed before a newer npm
  drops them.

## Resume prompt

### Next action (theme identity pass C, segment F)

> **Goal.** Run S3, Geoff's owner sitting (product and taste forks only), then task 15: close,
> merge B and C to `main`, cut `0.98.0`. **Settled:** the plan, its ledger, and the conductor
> rulings recorded there. **Open for Geoff at S3:** take eslint-plugin-jsdoc 65 (held at task 0;
> the conductor recommends taking it). **State:** CI green on branch head `84aed6c1`; spend
> about 9.5M of 29M. **Approach.** Fresh `claude-opus-5-5` session at `medium` in the worktree:
> invoke `cairn-pass`, read the plan's S3, task 15, and ledger, build the sitting page per
> decision 24, hold the sitting, then run task 15. The CHANGELOG must not copy the spec's
> "promote at the first minor cut" promise (no decision makes it).
> Task 15 also takes two friction-log chores filed on `main` (`ab50aae1`): the scaffold CI's
> `node-version: 22` below `engines.node >=24`, and the stale comment at the showcase's
> `admin/signups/+page.svelte:154-156`.

### Next action (draft docs harvest, held for #97 after the R3 audit)

> **Goal.** Prove every claim on the 49 old narrative and front-door pages is a fact or a recorded
> cut, then delete them with every reference and gate repaired. **Settled (do not re-brainstorm):**
> spec `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` and plan
> `docs/superpowers/plans/2026-09-29-draft-docs-harvest.md`, both on branch `draft-docs-harvest`
> (worktree `.claude/worktrees/draft-docs-harvest`, head `c6286cad`, unpushed), with Geoff's
> rulings R1 (12M ceiling), R2, and R3 (audit away from the theme lineage; rules in
> `docs/superpowers/research/2026-09-29-harvest-theme-lineage-brief.md`, which also carries the
> cut discipline and the frozen-bullet Source exception). **State:** tasks 1 to 7a done and
> reviewed; 43 pages audited (2,050 claims), verifier green on every one. Spend about 4.2M of 12M.
> **Trigger:** PR #97 (pass C, carrying B) merges to `main`. **Approach.** Fresh `claude-opus-5-5`
> session at `medium`: invoke `cairn-pass`, read the plan's R3 and ledger and the brief, have a
> Sonnet agent merge `main` into `draft-docs-harvest` (facts conflicts on the two Source-only
> frozen edits, f:rbm80t and f:0gltjq, keep both sides), then task 6b (six deferred extend pages
> plus every `docs/superpowers/research/harvest-recheck/*.md` line, including frozen f:pgv0o5,
> which is false), task 7's remainder (full verifier, no flag), then tasks 8 to 10. The chain
> worktrees `draft-docs-harvest-{x,y,z}` are merged and can be removed.
>
> **Found outside the harvest's scope:** three findings are filed in
> `docs/internal/docs-friction-log.md` (the scaffold CI's Node 22 pin, a stale showcase comment,
> the media purge's default access) for the close's triage.
