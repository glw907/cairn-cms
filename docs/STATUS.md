# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Unreleased on `main`: SvelteKit 3 (with an untagged tool
major), the harvest's page removal, draft docs stage 2a, the October dependency sweep, the doctor
cleanup, engine pass A (PR #108), the gate economy pass (PR #110), the lean pass process (PR #112),
and engine pass B (PR #113). cairn.pub pins
`0.94.0-rc.1`, its ceiling `0.98.0` until the one release below
([handoff](internal/record/2026-09-22-cairn-pub-docs-handoff.md)).

**The sequence (Geoff, 2026-10-07).** Docs stages 2b to 5, then one release, then each site
migrates (cairn.pub included, none before). Engine passes land on `main` and never release; each
sits in its slot on `ROADMAP.md`'s boundary-test path.

## Immediate next action

The docs finalization series runs under `conductor-cairn-cms`, started by a timer at 00:01 on
2026-10-31: the 2b close, a small engine pass, the editors arm, the admin arm, and the front door.
The plan is [docs/plans/2026-10-30-docs-finalization.md](plans/2026-10-30-docs-finalization.md), and
the live state is `~/.local/state/cairn-docs-final/ledger.md`. To start it by hand:

`claude --bg --model claude-opus-5-5 --effort medium --name conductor-cairn-cms "$(cat docs/plans/2026-10-30-docs-finalization-conductor-prompt.txt)"`

The release holds until the docs are complete.

## Open decisions and watches
- Docs stage 2b is closed by series pass 1 (PR #157). Its boundary test checked the 94 engine friction
  entries and found an engine pass warranted before the editors arm: pass 2 takes seven of them
  (`docs/plans/2026-10-30-docs-finalization.md`, "Pass 2 scope"), and the rest ride the final engine
  batch (`docs/internal/record/2026-10-31-engine-friction-2b-close.md`).
- The docs improvement loop is merged (PRs #149, #153, #154); the human gate design is approved and
  unbuilt, outside the series. The series' pass 2 takes the sidebar figure's fixture.
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`),
  which widens at stage 4's merge.
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries).
