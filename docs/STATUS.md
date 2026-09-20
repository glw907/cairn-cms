# cairn-cms status

Where the work is now, what is next, and the open decisions; `cairn-pass` rewrites it at each
pass-end. Durable orientation is `CLAUDE.md`; everything past tense is [`docs/HISTORY.md`](HISTORY.md).

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, the admin motion pass, and
docs-to-facts unpublished under `## Unreleased`, joined by extend-1 (PR #66) once it merges. The
window holds for one cut, after extend-2. CI on `main` is green.

## Immediate next action

**Execute the extend-2 pass**, plan `docs/superpowers/plans/2026-09-14-extend-2-pass.md`, in a
worktree off `main`, workflow mode through `pass-execute-chains.js`. Its 2026-09-19 amendment adds
one task, an engine-owned Tailwind sources file, so a site's own `admin.css` never names the
engine's `dist` path to hold the utilities-layer superset extend-1's seam needs. Its docs
deliverables file container bullets in `docs/internal/facts/extend.md` rather than editing the frozen
`docs/extend/` pages; reference pages still update per task. The pending cut is `0.97.0`, which
extend-1's "Available since" lines name; its two advisory audit rules promote to error at `0.98.0`.

Then, in order: **one cut**, with the dependency sweep before it and the site upgrade brief's tools
section in the pre-cut pass (no release before this); **the docs-infra currency pass**
(`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`, APPROVED 2026-09-19),
after the cut and before the site round; **the site round**, aksailingclub-org, ecxc-ski, and 907-life
upgraded as model cairn sites, each filing container bullets via `site-docs/<site>-<pass>`, then one
improvement release; then **the docs rebuild** from the facts container, then beta.

## Parallel tracks

- **Go `cairn` tool, 1.0, pass A is in flight** on `cairn-tool-a` (draft PR #60) in its own session,
  which maintains that pass's task ledger here on `main`; plan `-cairn-tool-1-0-pass.md`. Its gate is
  `make -C tool check`, and `gate-tier.mjs` needs a `tool/**` rule at that pass's close.
- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** Frozen record only,
  `docs/internal/record/2026-09-04-cairn-case/`; nothing from it lands.
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since `0.95.0`.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green (`tsgo.yml` checks weekly).

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `install.test.mjs`'s concurrent-poll test flaked once in a 30x local loop (2026-08-29); its
  next CI failure gets the same mock-timer deflake as the grace-window tests.
- A consumer `guard.rejected` record with `detail: 'mismatch'`, `witness: 'field'` can be the
  known double-mint residual, not a new mechanism; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, slated for deletion in the ASC repo once
  the ASC `email-announce` branch settles.
- `cairn-audit --rendered` over the engine's admin screens reports a different count on identical
  runs (133 then 116, all `border-contrast`/`viewport-overflow`); stabilize before it gates.

## Resume prompt

Execute the extend-2 plan (`docs/superpowers/plans/2026-09-14-extend-2-pass.md`).
