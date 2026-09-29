# cairn-cms status

Present tense only; past tense lives in [`docs/HISTORY.md`](HISTORY.md), durable orientation in
`CLAUDE.md`. `cairn-pass` rewrites this at each pass-end.

## Current state

Published: **`0.97.0`** on npm `latest` (`eefd51b4`, GitHub release `v0.97.0`), with
`@glw907/cairn-cms-dev` `0.97.0` beside it; the Go tool ships as `tool/v1.1.0`. `main`'s `##
Unreleased` holds theme identity pass A and draft docs pass 0+1. Held majors: `devalue` 6,
TypeScript 7, Vitest 5, `@types/node` 26. CI is green. cairn.pub's docs debt:
[handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md); it pins `0.94.0-rc.1`, un-pinnable
since `0.95.0`. Live contracts: `tool/internal/{spine/conditions,doctor/site-config-path}.json`
(`check:tool-conditions`) and `.cairn/site-facts.json` (`cairn-manifest`, checked in `buildStart`).

## Immediate next action

Resume each initiative from its plan's ledger foot. Theme identity pass A is merged (PR #92).

- **Theme identity pass B**: finished, unmerged (PR #95, draft, head `b938725b`, holding `main`
  at `1056432d`). It is pass C's base and merges with C; record in its post-mortem and HISTORY.
- **Theme identity pass C** (next; plan `docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md`
  on `theme-c-plan`) branches from `theme-identity-b` and cuts `0.98.0` over A, B, and C. Its
  "Branch topology" predates A's solo merge (`main` holds A; B holds `main`). It carries the
  tripwire's `0.98.0` question (F2), the dotfiles and cairn-pub repoints, and ROADMAP Now's
  `viewport-overflow` timing fix.

## Open decisions and watches

- Stage 1's two pages deferred to pass B (the `./admin` rename, the new `./public` page) take the
  same fact-read batch once B merges. `checkOrigin` to `csrf.trustedOrigins` is a small
  `auth-data` pass after `0.98.0`, run when Geoff can make the magic-link click.
- Node 26 is the beta floor only if Active LTS by then; TypeScript 7 waits on a green
  `svelte-check --tsgo` (`tsgo.yml`, weekly); extend-1's two advisory audit rules go to error at
  `0.98.0`. Monthly routines (Cloudflare, guidance schema) email only on a mismatch.
- `CAIRN_GH_READ_TOKEN` expires 2026-10-19 (`cairn-tripwire` warns daily). A consumer
  `guard.rejected` (`detail: 'mismatch'`, `witness: 'field'`) can be the double-mint residual.
  npm 11 flags the four leading-`./` `bin` entries (shipping in `0.97.0`); `npm pkg fix` is owed.

## Resume prompt

Theme identity pass C, fresh session (`claude-opus-5-5`, `medium`): invoke `cairn-pass`, read
pass C's plan on `theme-c-plan` and pass B's post-mortem, then run pass C's task 0 from
`theme-identity-b`'s head under the topology note above.

### Next action (draft docs: harvest, then delete)

> **Goal.** Turn every claim on the old narrative and front-door pages into a fact or a recorded
> cut, then delete those pages on `main`. **Scope.** `docs/{admin,editors,extend}/`,
> `docs/why-cairn.md`, `docs/README.md`; `docs/reference/` stays. **Settled (do not
> re-brainstorm):** the approach spec's 2026-09-29 amendment and its rulings: that scope; delete
> right after the harvest; cairn.pub takes no docs past `0.97.0`'s until rebuilt arms ship, and a
> release between ships reference only, saying so in its changelog. Drafting uses the register's
> briefs and exemplars (the AI posture page; the Microsoft Learn capture). No input guard. Theme
> pass C, now executing, cuts `0.98.0` first. **Still open, brainstorm these:** how each page's
> harvest is proven complete; the outline format and review surface (R10);
> `docs/extend/migration-notes.md` and `upgrade-cairn.md`; the arm order. Baselines: 711 verified
> facts plus 10 Tidy facts, sections for 77 of 80 old pages, about 600 intensifier "own" uses.
> **Approach.** After `style-guide-sync` merges, Geoff and a fresh `claude-opus-5-5` session
> (`high`, `~/Projects/cairn-cms`) brainstorm; then plan, `spec-plan-review`, `cairn-pass`.
