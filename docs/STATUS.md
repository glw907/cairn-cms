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

Engine pass B is **paused** (Geoff, 2026-10-10) for a brainstorm on pass clock time. Its S1 runner ran
95 minutes without a commit. A Haiku probe in the runner reported `gate-tier.mjs` absent, so every gate
fell back to the full F. A working classifier saves only about 9 minutes on that chain, though. Most of
the clock went to whole-suite selection, two reds caught late, a duplicate gate run, and lock wait.
Evidence and the projection with the probe fixed: [`superpowers/research/2026-10-10-pass-clock-time-evidence.md`](superpowers/research/2026-10-10-pass-clock-time-evidence.md).
Pass B's state: worktree `.claude/worktrees/engine-pre-2b-b`, draft PR #111, Task 0 recorded in the
plan's Ledger (`1ce14d3b`), and WIP commit `dbdc4556` (Tasks 1 and 2 edits, unreviewed, ungated, not
pushed). The release holds until the docs are complete.

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

### Next action (clock-time brainstorm)

> **Goal.** Settle why a cairn pass still takes 10+ hours of wall clock after the gate economy pass,
> and decide the changes that bring engine pass B, and every later pass, to a target Geoff sets.
>
> **Scope.** The pass machinery: `pass-execute.js` (its classifier probe and per-task chain), the
> targeted gate's whole-suite selections, CI waits, lock sharing, implementer and fix-round time, and
> plan sizing. Out: pass B's engine content, which stays as planned.
>
> **Settled (do not re-brainstorm):** pass B's tasks and rulings; the targeted gate and CI green as
> the boundary proof (both stay, the question is why they did not deliver).
>
> **Still open, brainstorm these:** the clock target per pass; the questions at the end of the
> evidence doc.
>
> **Opus 5.5 at `high` already fell short here.** The gate economy pass was brainstormed, planned,
> and conducted on `claude-opus-5-5`, and its design did not deliver: its own replay projected 14.8 to
> 19.0 hours against the 9-hour target, and pass B's first chain then ran 87 minutes uncommitted.
> This session therefore starts at `xhigh`. Any design question it cannot close with evidence (a
> projection at or under Geoff's target) escalates per `~/.claude/docs/model-economy.md`: `max`, then
> one `model: fable` dispatch to design or adversarially critique the proposal. Say which seat
> produced each part of the final design.
>
> **Approach.** Read the evidence doc first, then `superpowers:brainstorming`. Resume pass B only
> after the fixes land, from WIP `dbdc4556` (review it before building on it). Launch directory:
> `/var/home/glw907/Projects/cairn-cms`. Model: `claude --model claude-opus-5-5 --effort xhigh`.
