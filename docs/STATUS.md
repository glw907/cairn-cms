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

Engine pass B executes next:
[`superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`](superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md),
ceiling 14.0M, its gate section already rewritten to the targeted gate and CI reads. It carries the
relink re-arm list (the 2a pages and fact ids pass A falsified, in the plan's Ledger and the Task 12
carry files) and a `Consumers must:` line for `replyTo` inheritance. The release holds until the docs
are complete.

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

### Next action (engine pass B, execute)

> **Goal.** Land engine pass B, the engine work that runs before draft docs stage 2b.
>
> **Scope.** The plan's tasks and close, as written. Out: anything the plan does not name.
>
> **Settled (do not re-brainstorm):** everything in the plan, including its rewritten gate section:
> the targeted per-task gate, `ci: { pr }` through the sequential runner, CI green at boundaries and
> the close, and Tasks 1 and 2 dispatched as one `auth-data` runner task.
>
> **Approach.** Plan `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` (class
> `engine-logic` with per-task overrides), token ceiling 14.0M. Read `pass-core` and
> `~/.claude/docs/pass-gate-economy.md` first; both changed in the gate economy pass. Unattended run:
> arm the guards at launch. Invoke `cairn-pass` to start. Launch directory:
> `/var/home/glw907/Projects/cairn-cms`. Model: `claude --model claude-opus-5-5 --effort medium`.
