# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional
spec. Everything past tense lives in [`docs/HISTORY.md`](HISTORY.md); this file carries only
the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, and the admin motion pass
unpublished under `## Unreleased`; the window holds for one cut after the docs-to-facts pass and
extend-1/extend-2 (below). CI on `main` is green.

## Immediate next action (2026-09-15)

**The admin motion pass is MERGED** (PR #64, merge commit `296096eacdcaba15528303d5466c9b4857db475d`);
full detail in [`docs/HISTORY.md`](HISTORY.md) ("Admin motion language pass, nine tasks (chain A)
plus one (chain B), 2026-09-15").

**Next, in order (Geoff, 2026-09-15):**

1. **Adversarial review of the facts container: DONE 2026-09-15.** Three fresh-context `claude-opus-5`
   reads (structure, evolution, charter) at `docs/internal/record/2026-09-15-facts-container-review/`.
   All three overturn item 2 as written: seven gates and the shipped `docsAnchor` values read the arms,
   the container carries no fenced code, 116 facts source only to an arm page, and a naive `check:facts`
   rejects about 260 bullets today. Item 2 is re-planned from these findings (decision pending, Geoff).
2. **The docs-to-facts pass, IN FLIGHT on worktree `docs-to-facts`** (plan
   `docs/superpowers/plans/2026-09-15-docs-to-facts-pass.md`; the plan's overturned section carries
   four mid-pass rulings: freeze-against-rewrites with discovered-deficiency fixes, agent-facing not
   register-graded; the cross-repo path via "Engine docs fixes" batched on `site-docs/<site>-<pass>`;
   migration-notes and upgrade-cairn outside the freeze). Ledger: task 4 (dotfiles, commit `fc1a877`
   unpushed) ACCEPTED; task 5 (gate-tier, `7babaea4`) ACCEPTED; task 3 (governance, `5801bd0d`)
   under review, with an out-of-scope CLAUDE.md compression to verify; task 1 (container) in its
   fix round after a `fix` verdict (21 wrong retags, one erased drift, README freeze text); task 2
   (`check:facts`) implementing. Spend about 1.5M subagent tokens at the 1.5M ceiling; the close
   (simplifier, full gate, friction triage, HISTORY, PR) remains. Conductor slip to record at close:
   commit `bb2e2dc3` swept task 1's in-progress edits under a plan-amendment message.
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

- **Audit remediation (ROADMAP Now).** Slices 1-7, chassis-A/B1/B2, polish-11a/11b-i/11b-ii/C, and
  the admin motion pass all MERGED; the docs-to-facts pass and extend-1/extend-2 next (above),
  then ONE release cut. ROADMAP's audit-remediation entry is the canonical routing record; the
  chassis quality bar equals the engine's (Geoff, 2026-09-01).
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
