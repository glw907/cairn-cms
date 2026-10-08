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
[`superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md`](superpowers/specs/2026-10-07-engine-pass-pre-2b-design.md)
(Geoff's ruling 1: an item earns its place only by improving the product), with the rulings at
[`superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md`](superpowers/specs/2026-10-07-engine-pass-pre-2b-rulings.md).
The overnight pipeline is in flight: spec review, fold, verification, plan, plan review. Execution
waits for Geoff's spec read and his answers to the spec's "Rulings for Geoff". The spec splits the
work into pass A (access, auth, and the commit path) and pass B (scaffold, dev, and schema).

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
> after stage 5; engine passes never release; no site migrates first).
>
> **Still open:** Geoff's answers to the spec's "Rulings for Geoff", and his spec read, which gate
> execution; the overnight pipeline's plan and plan review, if unfinished.
>
> **Approach.** Fresh `claude --model claude-opus-5-5` session at medium effort from
> `~/Projects/cairn-cms`; invoke `cairn-pass`, read the spec, rulings, and plan, then execute pass A
> after Geoff's answers. Keep `tool/internal/{spine/conditions,doctor/site-config-path}.json` and
> `.cairn/site-facts.json`.
