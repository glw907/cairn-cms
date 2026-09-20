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

- **Go `cairn` tool, 1.0, pass A is in flight** (its own session keeps the ledger below; plan
  `-cairn-tool-1-0-pass.md`; gate `make -C tool check`; `gate-tier.mjs` needs a `tool/**` rule at
  that pass's close).

**Go tool pass A is IN FLIGHT beside extend-1 (Geoff, 2026-09-19 21:00)** on `cairn-tool-a` (draft PR
#60, `main` merged in at `60541de3`), a separate session. Ledger (2026-09-20 02:47): **1 to 9
ACCEPTED** (4 to 8 each after one fix round; 9 clean); **10** committed (`eaa24f42`) and on a ruled
fix round as run `wf_e5459cea-fec` (`tool-a-seg4b.js`): `probe-token` must print key sets from the
real response body through a recording RoundTripper, then re-run the live probe. Its attended half
is DONE: Geoff minted both read tokens 2026-09-19, stored as `CAIRN_CF_READ_TOKEN`,
`CAIRN_CF_ACCOUNT_ID`, `CAIRN_GH_READ_TOKEN`, verified by curl, recorded in the dotfiles registry
and the estate inventory. Then the Task 11 close. Spend about 3.9M of 8M.
Scripts live in that session's scratchpad, built from
`~/.cache/cairn-overnight-2026-09-14/tool-a-args.json` with args embedded in a copy of
`~/.claude/workflows/pass-execute-chains.js` patched with a `noClassifier` flag. Rulings taken:
`make -C tool check` is the gate and `gate-tier.mjs` is skipped, because it has no `tool/` rule and
routes a Go-only diff to the full Node gate (file a `tool/**` rule at the close); `record.Marshal`
appends a non-zero typed key absent at parse time; `store.Dir` resolves env, then the legacy
`~/.config/cairn/sites` when it exists, then `os.UserConfigDir`, since the Node CLI still writes
the legacy path; the Cloudflare read token needs SEVEN groups (Zone Settings: Read added); a
public repository proves nothing about a GitHub token's scope, so `probe-token` marks
visibility; an unconnected worker is an EMPTY Builds trigger list, never error 12000, so the Deploy
check assigns builds-not-connected; a direct `classifyReason` table stands in for corpus bodies the
corpus does not carry (no invented fixtures); the `Step` enum is NINETEEN strings, since the Node
GitHub chapter writes `installed` through a computed local the plan's row 9 missed.

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
