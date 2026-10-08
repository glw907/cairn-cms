# cairn-cms status

Present tense only; the past lives in [`docs/HISTORY.md`](HISTORY.md), orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Unreleased on `main`: SvelteKit 3 (with an untagged tool
major), the harvest's page removal, draft docs stage 2a (11 extend pages and the interim index), the
October dependency sweep, and the doctor cleanup. CI is green. cairn.pub pins `0.94.0-rc.1`, its
ceiling `0.98.0` until the one release below
([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md), with the extend redirect rows).

**The sequence (Geoff, 2026-10-07).** After Geoff reads the five task 8 pages: the engine pass before stage
2b, then stage 2b, admin (stage 3), editors (stage 4), and the front door (stage 5). Engine passes land on
`main` and never release. One release follows stage 5 with SvelteKit 3, every engine fix, and the complete
docs; then each site migrates to it as a site pass that follows the docs, cairn.pub included, and none
before. The conductor's forecast, accepted by Geoff (2026-10-07), not a schedule: a pass before 2b, likely
one before stage 4 (editor screenshots), probably none before 3 or 5, a batch before the final release.

## Immediate next action

Geoff reads the five task 8 pages (`scaffolded-site-files`, `restrict-admin-access`,
`add-a-second-sign-in-group`, `rotate-the-github-app-key`, `debug-your-site`) and the conductor
rulings on the review page: REVIEW-PAGE-URL. His fixes land as a follow-up commit. Then a fresh
session brainstorms the engine pass before stage 2b (resume prompt below).

## Open decisions and watches
- Every docs-stage close runs the boundary test over the engine friction and tells Geoff whether an
  engine pass is warranted, and its scope (`cairn-pass` close, Documentation step).
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`), which
  widens to all four tracks at stage 4's merge.
- Dotfiles: `cairn-docs-outline`'s lock was built past need; `gateMatches`' doc comment still says a
  placeholder "matches any non-empty text". The per-version records' paths are hardcoded in
  `cairn-pass`, `CLAUDE.md`, and `docs/internal/facts/README.md`; a move updates all three.
- Node 26 is the beta floor only if Active LTS by then; TypeScript 7 waits on `tsgo.yml`;
  `radius-scale` and the retired-patch arms promote at the next version commit. The `0.98.0` prep ran
  no `check:dev-package`; `CAIRN_GATE_READ_TOKEN` expires 2026-10-19; `npm pkg fix` is owed for the
  four `./` `bin` entries.

### Next action (engine pass before stage 2b)

> **Goal.** Brainstorm and plan the engine pass that runs before draft docs stage 2b.
>
> **Scope.** In: the `ROADMAP.md` Now entries "Engine pass before stage 2b" and "Docs tooling before
> stage 2b", sized by the boundary test, plus any fix Geoff's page read raises. Out: stage 2b's pages,
> any release or tag, any site migration.
>
> **Settled (do not re-brainstorm):** the Geoff rulings of 2026-10-07 in `ROADMAP.md`'s boundary-test
> entry (one release after stage 5; engine passes never release; no site migrates first; the test).
>
> **Still open, brainstorm these:** which *decide* items the pass takes, the lead seam's shape (one
> map both readers use, or a wiring condition), and whether the docs tooling rides this pass or its own.
>
> **Approach.** Fresh brainstorm session; read the two ROADMAP entries, `docs/internal/engine-rulings.md`,
> and the charter (`docs/internal/what-cairn-is-and-is-not.md`) first, then write the plan. Invoke
> `cairn-pass` to start. Launch directory: `~/Projects/cairn-cms`. Model: `claude --model claude-opus-5-5`.
> Live contracts to keep: `tool/internal/{spine/conditions,doctor/site-config-path}.json`, `.cairn/site-facts.json`.
