# cairn-cms status

Present tense only; the past lives in [`docs/HISTORY.md`](HISTORY.md), orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Unreleased on `main`: SvelteKit 3 (with an untagged tool
major), the harvest's page removal, draft docs stage 2a, the October dependency sweep, the doctor
cleanup, and engine pass A (PR #108). CI is green. cairn.pub pins `0.94.0-rc.1`, its ceiling `0.98.0`
until the one release below ([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md)).

**The sequence (Geoff, 2026-10-07).** Docs stages 2b to 5, then one release, then each site
migrates (cairn.pub included, none before). Engine passes land on `main` and never release; each
sits in its slot on `ROADMAP.md`'s boundary-test path.

## Immediate next action

Pass A is merged and unreleased
([plan and post-mortem](superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md)). The release holds
until the docs are complete.
The gate economy pass executes next: plan
[`superpowers/plans/2026-10-09-gate-economy.md`](superpowers/plans/2026-10-09-gate-economy.md)
(spec, four-lens spec review, three-lens plan review, two folds, and two verification reads done;
no open rulings). PR #109 (`1841b4db`) already landed CI job timeouts and bounded installs. Engine
pass B waits on it: plan
[`superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`](superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md),
ceiling 14.0M, its gate section updated by the gate economy pass's Task 6.

Pass B carries the relink re-arm list (the 2a pages and fact ids pass A falsified, in the plan's
Ledger and the Task 12 carry files) and a `Consumers must:` line for `replyTo` inheritance.

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

### Next action (gate economy pass, execute)

> **Goal.** Cut a pass's gate clock to about half of pass A's with no loss of assurance: run
> records, a build-once close, a targeted per-task gate, `ci-green`, CI as the boundary and close
> gate, and sequential-runner pipelining with stop-the-line.
>
> **Scope.** The plan's Tasks 0 to 7 across the cairn-cms worktrees (`gate-economy`, plus
> `gate-economy-ci` for Task 4a) and a dotfiles worktree. Out: deleting or moving tests, pass B's
> tasks, chains pipelining.
>
> **Settled (do not re-brainstorm):** everything in the spec and the plan's "Decisions this plan
> takes"; no rulings are open. Protected paths force a CI-green wait on that task's commit. Merge
> order is cairn-cms first, then dotfiles in the same sitting; both merges are owner-gated.
>
> **Approach.** Plan `docs/superpowers/plans/2026-10-09-gate-economy.md`, class `engine-logic`
> (Task 6b `docs`), token ceiling 4.0M (stop and write STATUS at 3.2M), clock estimate about
> 4.8 hours. Hand-dispatched chains per the plan. Unattended run: arm the guards at launch. Invoke
> `cairn-pass` to start. Launch directory: `/var/home/glw907/Projects/cairn-cms`. Model:
> `claude --model claude-opus-5-5 --effort medium`.
