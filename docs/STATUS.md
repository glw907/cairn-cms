# cairn-cms status

Present tense only; the past lives in [`docs/HISTORY.md`](HISTORY.md), orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Unreleased on `main`: SvelteKit 3 (with an untagged tool
major), the harvest's page removal, draft docs stage 2a (11 extend pages and the interim index), the
October dependency sweep, and the doctor cleanup. CI is green. cairn.pub pins `0.94.0-rc.1`, its
ceiling `0.98.0` until the one release below
([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md), with the extend redirect rows).

**The sequence (Geoff, 2026-10-07).** Docs stages 2b to 5, then one release, then each site
migrates (cairn.pub included, none before). Engine passes land on `main` and never release; each
sits in its slot on the path in `ROADMAP.md`'s boundary-test entry, which every stage close re-tests.

## Immediate next action

Stage 2a is closed and merged (PR #107; post-mortem in
[`superpowers/plans/2026-10-07-2a-close-finish.md`](superpowers/plans/2026-10-07-2a-close-finish.md)). The
release holds until the docs are complete, per `ROADMAP.md`'s boundary-test entry.

The engine pass before stage 2b is next, warranted by the boundary test; its scope is the spec
[`superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md`](superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md), rulings at
[`superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`](superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md).
The spec and both plans are reviewed, folded, and verified: pass A
[`superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md`](superpowers/plans/2026-10-08-engine-pass-pre-2b-a.md)
(11.1M), then pass B (`...-pre-2b-b.md`). The three forks are ruled (forks 1 and 2 take the
recommendations, and pass B's ceiling is 14.0M), and Geoff approved the spec on 2026-10-08. Pass A
is paused inside Task 0 on worktree `.claude/worktrees/engine-pre-2b-a` (branch `engine-pre-2b-a`);
the Task 0 entry in the plan's Ledger, on that branch, carries the state and the next step.

## Open decisions and watches
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`), which
  widens to all four tracks at stage 4's merge.
- Dotfiles: simplify `cairn-docs-outline`'s lock; fix `gateMatches`' stale doc comment. A move of a
  per-version record updates `cairn-pass`, `CLAUDE.md`, and `docs/internal/facts/README.md`.
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries). `CAIRN_GATE_READ_TOKEN` expires 2026-10-19.

### Resume prompt (engine pass before stage 2b)

> **Goal.** Read the engine-pass spec, settle Geoff's rulings, and execute the plan for the engine
> pass before draft docs stage 2b.
>
> **Scope.** In: the engine-pass spec and its plan, pass A (access, auth, and the commit path) then
> pass B (scaffold, dev, and schema). Out: stage 2b's pages, any release or tag, any site migration.
>
> **Settled:** the spec's rulings file; `ROADMAP.md`'s 2026-10-07 boundary-test rulings (one release
> after stage 5; engine passes never release; no site migrates first); Geoff's 2026-10-08 fork
> rulings: fork 1 in-memory dev saves with a persistent notice, fork 2 anonymous `/healthz?live=1`
> yes, fork 3 pass B ceiling 14.0M.
>
> **Still open:** nothing; Geoff approved the spec on 2026-10-08 ("Spec is good.").
>
> **Approach.** Fresh `claude --model claude-opus-5-5` session at medium effort from
> `~/Projects/cairn-cms`; invoke `cairn-pass`, read the spec, rulings, and pass A's plan, then resume
> pass A from the plan's Ledger on the `engine-pre-2b-a` branch (Task 0: baseline, draft PR, guards, then S1). Keep `tool/internal/{spine/conditions,doctor/site-config-path}.json` and
> `.cairn/site-facts.json`.
