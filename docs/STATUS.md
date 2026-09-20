# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional
spec. Everything past tense lives in [`docs/HISTORY.md`](HISTORY.md); this file carries only
the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, the admin motion pass, and the
docs-to-facts pass unpublished under `## Unreleased`; the window holds for one cut after
extend-1/extend-2 (below). CI on `main` is green.

## Immediate next action (2026-09-15)

**The docs-to-facts pass is MERGED** (PR #65); detail in [`docs/HISTORY.md`](HISTORY.md)
("Docs-to-facts pass, five tasks, 2026-09-15"). ROADMAP's audit-remediation entry is the canonical
routing record for this track; every slice through docs-to-facts is MERGED.

**extend-1 is IN FLIGHT, HELD on an unstable link (2026-09-19 14:55 AKDT)** on
`docs/superpowers/plans/2026-09-14-extend-1-pass.md`, workflow mode through
`pass-execute-chains.js`. Worktrees: chain A `.claude/worktrees/extend-1` (branch `extend-1`), chain B
`.claude/worktrees/extend-1-site` (branch `extend-1-site`), both off `22bc19b5`, both clean. Ceiling
6.7M; **checkpoint 2026-09-19 19:20: about 5.6M spent (84 percent)**, of which about 1.0M went to
three network drops, one usage-limit kill, one relayed-question misfire, and one redundant
re-dispatch; task 3 ran three review rounds. Tasks 4, 5, 6 and the ritual are priced at about 3.0M.
Geoff's checkpoint answer (2026-09-19 19:25, one execution sitting): **ceiling raised to 9.0M**, the
pass runs to a merged PR; the engine-owned Tailwind sources file (so a site's admin.css never names
the engine's `dist` path) is one small extend-2 task; the docs-infra currency pass
(`~/.dotfiles/docs/superpowers/plans/2026-09-19-docs-infra-currency-pass.md`) is APPROVED as
written and queues after the one cut, before the site round. Per-task gates come from `scripts/checks/gate-tier.mjs`, serialized on
`cairn-run-gate`'s machine lock.

Task ledger (2026-09-19 night): **all nine tasks ACCEPTED**; `extend-1-site` merged into
`extend-1` (`a231f298`); **PR #66 open** against `main`. Ritual in progress, in order: the
code-simplifier over the pass's code (running), then the post-merge seam proof (the branch-point
fixture on port 4273, the full gate with `check:cairn`, the rendered audit, the ten signups
captures), the reviewer fan-out (a11y read of `Tooltip` blocking; svelte; auth on the redaction),
the CI regen read against the union of `INTENDED MOVES:`, the visual verifier on signups and one
tooltip surface, then HISTORY, STATUS, the record, and the merge on green CI. Fold items: 8b's
`check:cairn` step in `create-site.yml` runs before the build rather than after; its two facts
bullets could name task 7's `cairn-audit.config.json` and the two transcript fixtures; the
`stylesheet-seam` ledger row is already written (task 6), so the ritual writes no second one.

Resume, from a session inside `cairn-cms` on a stable connection: the built scripts live in the
launching session's scratchpad (`extend-1-runA5.js`, task 6), so from that session issue
`Workflow({scriptPath, resumeFromRunId})` for each; from a new session, rebuild both from
`~/.cache/cairn-overnight-2026-09-14/extend-1-args.json` with the rulings above folded into the
task 2 and task 7 notes, and start each chain at its first unreviewed task. Arm the guards per
`~/.claude/docs/unattended-work-guards.md`. Then the pass-end ritual in the plan.

**Then extend-2** (`-extend-2-pass.md`, a worktree off `main`, the same chain). Their docs
deliverables now file container bullets in `docs/internal/facts/extend.md` instead of editing
the frozen `docs/extend/` pages; reference pages still update per task. extend-1's "Available
since" reads `0.97.0`, advisory rules promote at `0.98.0` (`launch.json`).

After both: **ONE cut** (the dependency sweep immediately before it; the site upgrade brief's
tools section added to the pre-cut pass). No release before this. Then **the site round:**
aksailingclub-org, ecxc-ski, and 907-life upgraded as model cairn sites, each pass filing
container bullets via `site-docs/<site>-<pass>`; then one improvement release, the public docs
rebuilt from the container, then beta.

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

## Parallel tracks

- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** Frozen record only,
  `docs/internal/record/2026-09-04-cairn-case/`; nothing from it lands.
- **Go `cairn` tool, 1.0.** Re-cut 2026-09-14 for any operator on Linux, macOS, and Windows
  (plan `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`, APPROVED 2026-09-14).
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
