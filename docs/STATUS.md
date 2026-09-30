# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, release `v0.98.0`;
`@glw907/cairn-cms-dev` `0.98.0` beside it); the Go tool is `tool/v1.1.0`. `0.98.0` carries theme
identity passes A, B, and C, draft docs pass 0+1, the `viewport-overflow` fix (#100), the audit
promotions, and the dependency sweeps. Unreleased: the harvest's page removal. Held majors:
`devalue` 6, TypeScript 7, Vitest 5, `@types/node` 26. CI is green. cairn.pub pins `0.94.0-rc.1`
(un-pinnable since `0.95.0`); its ceiling is `0.98.0` until the narrative arms are rebuilt
([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md)). Live contracts:
`tool/internal/{spine/conditions,doctor/site-config-path}.json` and `.cairn/site-facts.json`.

## Immediate next action

- The draft docs harvest is closed (plan, ledger, and post-mortem in
  `docs/superpowers/plans/2026-09-29-draft-docs-harvest.md`); its PR merges under R4 once the
  close gate and reviews are green. The admin, editors, and front-door arms are then empty, and
  `extend/` holds only the three kept pages. **Next: the stage 2a plan** (resume prompt below).
- Theme identity is done. cairn-pub's pin bump takes the B and C migration first, then checks its
  links to the renamed `docs/reference/admin.md` and the new `public-css.md`.

## Open decisions and watches

- **Geoff's call:** apply the "Owed errata" in
  `docs/superpowers/research/2026-09-29-draft-docs-harvest-fold.md` (six parent-spec fixes, and
  `cairn-pass` and `site-pass` still say to fix a frozen arm page), or rule each.
- Watch: the kept per-version records' paths are hardcoded in `cairn-pass`, `CLAUDE.md`, and
  `docs/internal/facts/README.md`; a pass that moves either record updates all three. Docs
  improve-as-we-go (Geoff, 2026-09-29) opens with a brainstorm once the first drafts are complete.
- `checkOrigin` to `csrf.trustedOrigins` is a small `auth-data` pass, run when Geoff can make the
  magic-link click. Node 26 is the beta floor only if Active LTS by then; TypeScript 7 waits on
  `tsgo.yml`. `radius-scale` and the retired-patch arms promote at `0.99.0`.
- `cairn-release` gap: the `0.98.0` prep ran no `check:dev-package`; the skill's pre-commit gate
  names it next. Monthly routines email only on a mismatch. `CAIRN_GH_READ_TOKEN` expires
  2026-10-19 (`cairn-tripwire` warns daily). `npm pkg fix` is owed for the four `./` `bin` entries.

## Resume prompt

### Next action (draft docs stage 2a plan)

> **Goal.** A reviewed stage 2a plan: the extend arm's JSON outline, its pilot, and the rest of 2a.
>
> **Scope.** Draw `docs/internal/outlines/extend.json` from the readers' jobs,
> `docs/internal/facts/extend.md`, and `relink.json`'s `2a` entries. Drafting is out.
>
> **Settled (do not re-brainstorm):** the parent spec
> (`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`) and the harvest spec's
> "Outline format". Extend re-arms at the first 2a page (`arm-state.mjs`), so the plan budgets an
> interim `docs/extend/README.md`, live targets for the extend `LEGACY_PATH_MAP` entries, the
> `build-a-site-by-hand.md` slug case repoint, and the `docs-page-chain.js` outline read.
>
> **Still open, brainstorm these:** the arm's page set and order, and the pilot's six pages.
>
> **Approach.** Fresh session: `superpowers:brainstorming`, `superpowers:writing-plans`, then
> `spec-plan-review`. Invoke `cairn-pass` to start. Launch directory: `~/Projects/cairn-cms`.
> Model: `claude --model claude-opus-5-5`.
