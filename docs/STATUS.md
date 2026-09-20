# cairn-cms status

Where the work is now, what is next, and the open decisions; `cairn-pass` rewrites it at each
pass-end. Durable orientation is `CLAUDE.md`; everything past tense is [`docs/HISTORY.md`](HISTORY.md).

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, the admin motion pass, and
docs-to-facts, and extend-1 (PR #66, merged 2026-09-20) unpublished under `## Unreleased`. The
window holds for one cut, after extend-2. CI on `main` is green.

## Immediate next action

**extend-2 is IN FLIGHT (launched 2026-09-20)**, one `pass-execute-chains` workflow over two
worktrees: chain A (`.claude/worktrees/extend-2`, tasks 1a, 1b, 2, 3a, 3b, 3c, 4) and chain B
(`.claude/worktrees/extend-2-skills`, tasks 5, 6, 7). **Checkpoint (2026-09-20 12:10):** chain B
is DONE, 5 (one comment-only fix round), 6, and 7 ACCEPTED. Chain A halted at 1a on a second `fix`
whose one blocking finding was a false MANIFEST sentence in `docs/reference/guidance.md`, marked
comment-only; the conductor ruled accept-after-fix, a direct `cairn-implementer` dispatch is
landing it, and chain A then relaunches from 1b (1b, 2, 3a, 3b, 3c, 4) as a second workflow run.
First run `wf_0d3513c9-bdb` spent 1.87M subagent tokens over four tasks, so the forecast lands
near the 5.4M ceiling and the 80 percent flag (4.3M) will trip mid chain A. Rulings taken: the
gate per task is `gate-tier.mjs`'s computed string plus the checks the task's criteria name; a
`package.json` touch computes the `full` tier, whose local e2e is green when its only failures
are the 20 CI-canonical baseline files from `4de378ec`; the unknown-exclusion case prints the
`@source not` line from a constant, with no sixth packaged snippet. **Owed at the ritual, one
chain-B fold task:** `skills/cairn-consult/references/the-standard.md` carries a dated spec
citation inside shipped markdown (the byte-identical copy criterion conflicts with the
no-process-citations constraint; strip the HTML comment and relax the diff to the body);
`cairn-consult` names workstation-only `engine-consult` and `engine-triage`; `cairn-extend` cites
`docs/internal/` paths that do not ship in the tarball, and `preflight.md` names siblings that
exist only after chain A merges; `daisyui-first.md` misses the `polish-busy-idiom` slug and
rounds 1.14:1 to "under 1.5:1". A cold session checks both worktrees for a live executor before
touching either.

The pass: plan `docs/superpowers/plans/2026-09-14-extend-2-pass.md`, in a
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
#60, `main` merged in at `60541de3`), a separate session. Ledger (2026-09-20 03:12): **1 to 10
ACCEPTED** (4 to 8 and 10 each after one fix round; 9 clean); PR #60 green on all three `make check`
legs at `25548463`. Task 10's attended half was Geoff's 2026-09-19 mint of both read tokens
(`CAIRN_CF_READ_TOKEN`, `CAIRN_CF_ACCOUNT_ID`, `CAIRN_GH_READ_TOKEN`; dotfiles registry and estate
inventory carry them). **Task 11 close IN PROGRESS (2026-09-20 03:34):** `code-simplifier` landed (`85c2acac`, CI green);
all seven `go-architecture-reader` reports are in (six sound with nits, `cmd/cairn` workmanlike, no
credential leak found anywhere). The adjudicated fold's first run (`wf_d3f65134-680`) died at about 04:00 on a network drop
(`EAI_AGAIN`) and the session sat unwoken until Geoff's 09:16 message, about five hours lost. Its
record task had already committed and pushed `7beb2014` (renames to
`record.GitHub`/`GitHubRepo`/`Cloudflare`, key-set drift guard; CI green on all three legs) but
never reported, so a direct `diff-reviewer` dispatch is reading that commit. The remaining two fold
tasks relaunched 2026-09-20 09:17 as `wf_8a02451b-4bf` (`tool-a-fold2.js`): store, spine, version
(a Windows junction hole in `Load`, exported mutable slices to functions); then secrets and
cmd/cairn (`secrets.Env` disagreed with the live env provider on an empty variable; dropped
`Resolve` errors) plus a module-wide sweep of process citations out of Go comments. Then the
ritual; PR #60 goes ready for review; the MERGE waits for Geoff.
**Left the pass, to be filed as a Pass B opening task:** the `providers` deduplication, `record`'s
table-driven rewrite and file split, and the `cmd/cairn` logic moves (verdict algebra onto
`spine.State`, `discoverSites` into `store`, the typed exit error), the last three into Tasks 19
and 21's notes. **Open decision for Geoff:** Pass B goes 14 to 15 tasks, and the plan already names
it the pass to watch. Spend about 5.0M of 8M in subagent tokens (the conductor's own turns uncounted).
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
