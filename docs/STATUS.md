# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, release `v0.98.0`;
`@glw907/cairn-cms-dev` `0.98.0` beside it); the Go tool is `tool/v1.1.0`. `0.98.0` carries theme
identity passes A, B, and C (one public theme contract: `cairn-public.css`, the `./admin` and
`./public` split, three advisory public audit rules, the `cairn-public` skill), draft docs pass
0+1, the `viewport-overflow` timing fix (#100), the `0.98.0` audit promotions, and the
dependency sweeps. Held majors: `devalue` 6, TypeScript 7, Vitest 5, `@types/node` 26. CI is
green. cairn.pub pins `0.94.0-rc.1`, un-pinnable since `0.95.0`; its docs debt:
[handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md). Live contracts:
`tool/internal/{spine/conditions,doctor/site-config-path}.json` (`check:tool-conditions`) and
`.cairn/site-facts.json` (`cairn-manifest`, verified in the plugin's `buildStart`).

## Immediate next action

- **Draft docs harvest** runs in its own session; its resume prompt is below. It merges after
  `0.98.0`, so cairn.pub's pin ceiling for the old narrative arms is `0.98.0`.
- **Theme identity is done** (passes A, B, C; the post-mortem is in
  `docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md`). cairn-pub's pin bump takes the B
  and C migration first, then checks its links to the renamed `docs/reference/admin.md` and the
  new `public-css.md`.

## Open decisions and watches

- **Docs improve-as-we-go standing order** (Geoff, 2026-09-29): a brainstorm once the first-draft
  docs are complete (ROADMAP Planned). Nothing changes before then.
- `checkOrigin` to `csrf.trustedOrigins` is a small `auth-data` pass, run when Geoff can make the
  magic-link click. Node 26 is the beta floor only if Active LTS by then; TypeScript 7 waits on a
  green `svelte-check --tsgo` (`tsgo.yml`, weekly). `radius-scale` and the retired-patch arms
  promote at `0.99.0`.
- `cairn-release` gap: the `0.98.0` prep ran no `check:dev-package`, so the dev package's version
  lagged until CI caught it; the skill's pre-commit gate names it next.
- Monthly routines (Cloudflare, guidance schema) email only on a mismatch. `CAIRN_GH_READ_TOKEN`
  expires 2026-10-19 (`cairn-tripwire` warns daily). npm 11 flags the four leading-`./` `bin`
  entries; `npm pkg fix` is owed before a newer npm drops them.

## Resume prompt

### Next action (draft docs harvest)

> **Goal.** Prove every claim on the 49 old narrative and front-door pages is a fact or a recorded
> cut, then delete them with every reference and gate repaired. **Settled (do not re-brainstorm):**
> spec `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` and plan
> `docs/superpowers/plans/2026-09-29-draft-docs-harvest.md`, both on branch `draft-docs-harvest`
> (worktree `.claude/worktrees/draft-docs-harvest`, head `c6286cad`, unpushed), with Geoff's
> rulings R1 (12M ceiling), R2, and R3 (audit away from the theme lineage; rules in
> `docs/superpowers/research/2026-09-29-harvest-theme-lineage-brief.md`, which also carries the
> cut discipline and the frozen-bullet Source exception). **State:** tasks 1 to 7a done and
> reviewed; 43 pages audited (2,050 claims), verifier green on every one. Spend about 4.2M of 12M.
> **Trigger:** triggered: #97 merged (`4d417ab6`); `0.98.0` published. **Approach.** Fresh `claude-opus-5-5`
> session at `medium`: invoke `cairn-pass`, read the plan's R3 and ledger and the brief, have a
> Sonnet agent merge `main` into `draft-docs-harvest` (facts conflicts on the two Source-only
> frozen edits, f:rbm80t and f:0gltjq, keep both sides), then task 6b (six deferred extend pages
> plus every `docs/superpowers/research/harvest-recheck/*.md` line, including frozen f:pgv0o5,
> which is false), task 7's remainder (full verifier, no flag), then tasks 8 to 10.
>
> **Found outside the harvest's scope:** two chores (the scaffold CI's Node 22 pin, a stale showcase comment) went to pass C's close;
> the owner-restrictable media purge is on `ROADMAP.md`'s Later tier with Geoff's ruling.
