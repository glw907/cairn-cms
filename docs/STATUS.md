# cairn-cms status

Present tense only; the past lives in [`docs/HISTORY.md`](HISTORY.md), orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Unreleased on `main`: SvelteKit 3 (with an untagged tool
major), the harvest's page removal, draft docs stage 2a, the October dependency sweep, the doctor
cleanup, engine pass A (PR #108), and the gate economy pass (PR #110). CI is green. cairn.pub pins
`0.94.0-rc.1`, its ceiling `0.98.0` until the one release below
([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md)).

**The sequence (Geoff, 2026-10-07).** Docs stages 2b to 5, then one release, then each site
migrates (cairn.pub included, none before). Engine passes land on `main` and never release; each
sits in its slot on `ROADMAP.md`'s boundary-test path.

**The per-task gate is now targeted.** `scripts/checks/gate-tier.mjs` prints the gate a diff
needs (`docs/internal/pass-gate-tiers.md`); CI green, read with the dotfiles `ci-green`, is the
boundary and close gate, and the local `full` tier runs only when `ci-green` exits 3. The pass's
plan, score, and replay record: [`superpowers/plans/2026-10-09-gate-economy.md`](superpowers/plans/2026-10-09-gate-economy.md).

## Immediate next action

Engine pass B stays **paused** (Geoff, 2026-10-10). The clock-time brainstorm widened into a broader
question: the pass process itself carries too much ceremony for its clock and token cost. Pass B's
state: worktree `.claude/worktrees/engine-pre-2b-b`, draft PR #111, Task 0 recorded in the plan's
Ledger (`1ce14d3b`), and WIP commit `dbdc4556` (Tasks 1 and 2, unreviewed, ungated, not pushed).
The release holds until the docs are complete.

## Open decisions and watches
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`),
  which widens at stage 4's merge.
- Dotfiles: simplify `cairn-docs-outline`'s lock; fix `gateMatches`' stale doc comment. Moving a
  per-version record updates `cairn-pass`, `CLAUDE.md`, and the facts README.
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries). `CAIRN_GATE_READ_TOKEN` expires 2026-10-19.

### Next action (process-ceremony brainstorm)

> **Goal.** Cut the pass process to what earns its cost. Every step (plan length, spec and plan
> review lenses, the per-task chain, the close, the ledgers) keeps its place only if its catch record
> shows it caught a defect a later step would not, at a cost in clock and tokens worth paying.
> Clock time is one symptom: pass A ran 28 hours, pass B's plan is 1,676 lines for 11 tasks, and
> `docs/superpowers/research/` holds 160 review, fold, and verification files.
>
> **Read first.** Evidence: [`2026-10-10-pass-clock-time-evidence.md`](superpowers/research/2026-10-10-pass-clock-time-evidence.md).
> Prior art: [`2026-10-10-pass-clock-time-prior-art.md`](superpowers/research/2026-10-10-pass-clock-time-prior-art.md).
> The Fable critique ([`...-review-fable.md`](superpowers/research/2026-10-10-pass-clock-time-review-fable.md))
> holds the short list of gate fixes worth keeping (whole suites to CI, concurrent gate legs, review
> beside the gate, the four `cairn-run-gate` fixes, probes deleted). The parked spec
> ([`2026-10-10-pass-clock-time-design.md`](superpowers/specs/2026-10-10-pass-clock-time-design.md))
> is evidence of the ratchet, not a design to build.
>
> **Geoff's rulings from 2026-10-10 (carry them):** independent items run in pairs by default;
> load is re-read at every decision; projects coordinate shared resources with each other, any mix
> of projects; the posture is workstation-wide and on by default for new projects; adopt the
> published method for each sub-problem and invent nothing already solved.
>
> **Open:** the scope (execution only, or the whole lifecycle from brainstorm to close); the clock
> target, which waits on the audit's measured floor (Fable's honest figure is 40 to 45 minutes per
> task); and whether the first step is a catch-ledger audit of pass A, gate economy, and stage 2a.
>
> **Approach.** `superpowers:brainstorming` in a fresh session. Start subtractive: propose cuts
> before additions. Model: `claude --model claude-opus-5-5 --effort xhigh`. Launch directory:
> `/var/home/glw907/Projects/cairn-cms`. Resume pass B only after the outcome lands.
