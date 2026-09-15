# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional
spec. Everything past tense lives in [`docs/HISTORY.md`](HISTORY.md); this file carries only
the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2 and polish-11a/11b-i/11b-ii/C unpublished under `##
Unreleased`; the window holds for one cut after the admin motion pass (below). CI on `main` is
green.

## Immediate next action (2026-09-15, written by session 4e54c24b before it closes)

The overnight run halted at stage "motion:ci-regen-end" on 2026-09-15. Reason: baseline regen
dispatch and the e2e job succeeded, but the overall workflow run failed because a separate job
(norms / motion-reduced-delay rendered audit) failed, so this is reported as a failed run per
instructions. Resume prompt: Resume the motion pass-end ritual at step "motion:ci-regen-end" in
/var/home/glw907/Projects/cairn-cms/.claude/worktrees/admin-motion, then Relaunch the orchestrator
with stages ["precut","release","parallel","final"]. Trim every accepted task out of that pass's
args file in ~/.cache/cairn-overnight-2026-09-14/, re-run `node build.mjs`, and launch the built
script again.

**The admin motion pass is in its close ritual** as workflow `wf_f43d9c7a-ade` (built script and args in
`~/.cache/cairn-overnight-2026-09-14/`, stages `["motion","final"]`, the Go tool and the pre-cut and release
stages removed by Geoff's decisions below). Every task is accepted on `admin-motion`: 1 to 4, 6a, 6b, 7, 8,
10, 11, plus the four conductor-inserted corrections 6a-fix, 7-fix, 10-fix, 11-fix; chain B merged; the
simplifier ran. Remaining: full gate, six-surface verifier, four reviewers, records, PR, CI, the CI baseline
regen, merge. **If the ritual is not running when you read this** (a session clear kills it), check
`gh pr list --head admin-motion` and the worktree: a merged PR means done; otherwise relaunch from
`LAUNCH.md`'s "State on 2026-09-15" section (steps 2 to 7; every ritual step is idempotent) or finish the
named step by hand. The night's halt ledger and every ruling: `~/.cache/cairn-overnight-2026-09-14/NIGHT-ledger.md`
(fold into HISTORY at the post-mortem; task 11 already recorded the rulings in the plan).

**Then, in order (Geoff, 2026-09-15):**

1. **Adversarial review of the facts container** (`docs/internal/facts/`, landed `b9282369`: 727 facts, 641
   verified, 14 drift, 31 candidates): three fresh-context `claude-opus-5` reviewers with disjoint lenses
   (structure and mechanics; evolution feasibility from container through the site round to public docs,
   and what a facts-only record loses; charter and per-pass cost), graded against the goal of docs kept
   light while cairn is finalized yet collecting what public docs will need. Findings fold into item 2.
2. **The docs-to-facts pass** (plan it; small): remove the admin, editors, extend, and why-cairn arms and
   the docs README from the tree and the tarball; MOVE `docs/reference/` into the container at
   `docs/internal/facts/reference/` and re-point its two gates; ship the container in the tarball in place
   of the arms; the container check (every export has an entry, every bullet a source and one tag, links
   resolve); CLAUDE.md's docs section and the `cairn-pass` docs step become container-first; re-point
   engine-consult (a "facts consulted" line), site-implementer, cairn-implementer; amend extend-1 and
   extend-2's docs deliverables to container entries; the `cairn-fact` dotfiles command (`fact`, `gap`) and
   its skill; the `gate-tier.mjs` classifier (the runner half landed in dotfiles 2026-09-15, unpushed; the
   ROADMAP Now entry has the tier table). The 14 drift bullets are the first corrections to make.
3. **extend-1, then extend-2** (docs as container entries; extend-1's "Available since" reads 0.97.0 and
   its advisory rules promote at 0.98.0, per `launch.json`).
4. **ONE cut** (the dependency sweep immediately before it; the site upgrade brief's tools section added
   to the pre-cut pass). No release before this; every consumer pin bump holds, cairn.pub's included.
5. **The site round:** aksailingclub-org upgraded and finished, ecxc-ski and 907-life upgraded and
   polished, each as a model cairn site on the new best practices; every site pass hunts holes into
   `docs/internal/facts/gaps.md` and files facts with `cairn-fact`; then one improvement release, then the
   public docs extended from the container, then beta.

Held for the week of 2026-09-21: Go tool pass A at its Task 3 boundary on `cairn-tool-a` (draft PR #60).
Morning items still open: the three dependency tripwires, `blueprint-audit`, the motion post-mortem.
Spend on the night: about 5.5M subagent tokens for the motion pass across six launches, plus about 2.5M
for the facts harvest, tightening, and fold.

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1-7, chassis-A/B1/B2, and polish-11a/11b-i/11b-ii/C
  all MERGED; the admin motion pass next (above), then ONE release cut. ROADMAP's
  audit-remediation entry is the canonical routing record; the chassis quality bar equals the
  engine's (Geoff, 2026-09-01).
- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** Frozen record only, under
  `docs/internal/record/2026-09-04-cairn-case/`; nothing from it lands.
- **Go `cairn` tool, 1.0.** Re-cut 2026-09-14 as a product for any operator on Linux, macOS, and
  Windows (plan `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`, APPROVED 2026-09-14).
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since `0.95.0`.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green; `tsgo.yml` checks weekly.

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `install.test.mjs`'s concurrent-poll test flaked once in a 30x local loop (2026-08-29).
  Trigger: its next CI failure gets the same mock-timer deflake as the grace-window tests.
- A consumer `guard.rejected` record with `detail: 'mismatch'`, `witness: 'field'` can be the
  known double-mint residual, not a new mechanism; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, slated for deletion in the ASC repo.
  Trigger: the ASC `email-announce` branch settles.

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
