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

Finish stage 2a's close: [`superpowers/plans/2026-10-07-2a-close-finish.md`](superpowers/plans/2026-10-07-2a-close-finish.md)
(F1 merge the `leak-cleanup` code lane, F2 `check:leaks`, F3 cadence rewrite to a green
`check:tellgrader`, F4 close review, F5 republish the review page and merge PR #107, F6 push
dotfiles). It carries Geoff's 2026-10-07 rulings from his live page read. Then the engine-pass
brainstorm (prompt below), the first slot on the path in `ROADMAP.md`'s boundary-test entry.

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

### Resume prompt (finish the 2a close)

> Execute `docs/superpowers/plans/2026-10-07-2a-close-finish.md` from F1 as its conductor, in a fresh
> `claude --model claude-opus-5-5` session at medium effort from `~/Projects/cairn-cms`; invoke
> `cairn-pass`, read the plan, its rulings, and the leak audit it links, then dispatch F1. Settled:
> every ruling in the plan. No release.

### Next action after the merge (engine pass before stage 2b)

> **Goal.** Brainstorm and plan the engine pass that runs before draft docs stage 2b.
>
> **Scope.** In: the `ROADMAP.md` Now entries "Engine pass before stage 2b" and "Docs tooling before
> stage 2b", sized by the boundary test, plus any fix Geoff's page read raises. Out: stage 2b's pages,
> any release or tag, any site migration.
>
> **Settled (do not re-brainstorm):** the Geoff rulings of 2026-10-07 in `ROADMAP.md`'s boundary-test
> entry (one release after stage 5; engine passes never release; no site migrates first; the test).
>
> **Still open, brainstorm these:** reconciling ROADMAP's "Toward 1.0" series with the one-release
> path; tool-neutral agent guidance and where the coding-agent docs live; which *decide* items the
> pass takes; the lead seam's shape; whether the docs tooling rides this pass or its own.
>
> **Approach.** Fresh brainstorm session; read the two ROADMAP entries, `docs/internal/engine-rulings.md`,
> and the charter (`docs/internal/what-cairn-is-and-is-not.md`) first, then write the plan. Invoke
> `cairn-pass` to start. Launch directory: `~/Projects/cairn-cms`. Model: `claude --model claude-opus-5-5`.
> Live contracts to keep: `tool/internal/{spine/conditions,doctor/site-config-path}.json`, `.cairn/site-facts.json`.
