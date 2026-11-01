# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Unreleased on `main`: SvelteKit 3 (with an untagged tool
major), the harvest's page removal, draft docs stage 2a, the October dependency sweep, the doctor
cleanup, engine pass A (PR #108), the gate economy pass (PR #110), the lean pass process (PR #112),
and engine pass B (PR #113). cairn.pub pins
`0.94.0-rc.1`, its ceiling `0.98.0` until the one release below
(`BACKLOG.md` #168 holds what cairn.pub is owed).

**The sequence (Geoff, 2026-10-31).** The agent-first pattern lands first, then the media and
publish pass and the scaffold pass, then the held docs series (editors and admin arms), then the
final engine batch, then one release, then each site migrates once. `BACKLOG.md` names each
item's pass. Design:
`~/Projects/initiatives/shared-standards/specs/2026-10-31-agent-first-pattern-design.md`. Engine
passes land on `main` and never release.

## Immediate next action

The scaffold setup pass (PR #173) is at close, awaiting conductor merge. Session
`cairn-cms-scaffold-setup`, id `0f7503ff`, under `conductor-cairn-cms`. The next action is the
conductor's merge of #173, then the release act: publish `create-cairn-site` by hand first
(`BACKLOG.md` #195), then the media and publish pass, the final engine batch (`BACKLOG.md` lists each
item's pass), the one release, and each site's migration. Prerelease `0.98.1-rc.2` is on npm `next`;
`latest` is `0.98.0`.

## Open decisions and watches
- The engine backlog triage of 2026-10-31 landed: `BACKLOG.md` lists open items by pass, each with
  a `Placement` line, and `## Won't do` holds Geoff's rulings. The final engine batch has three
  slices: content rules, admin and tidy, and small API. A pass's design makes its own fold.
- Docs stage 2b is closed by series pass 1 (PR #157) and series pass 2 (PR #158). The engine friction
  the boundary test found rides the final engine batch as `BACKLOG.md` items; the 94 entries'
  verdicts are at the `pre-agent-first` tag. The capture runbook is at the `pre-agent-first` tag.
- The docs improvement loop is merged (PRs #149, #153, #154); the human gate design is approved and
  unbuilt, outside the series. The series' pass 2 takes the sidebar figure's fixture.
- Routines: sveltejs/kit#17368 merged on 2026-10-14, so its routine (`trig_01KPzLTU7rzLMQUp2y6bjZtm`)
  is due for deletion at claude.ai/code/routines (an agent cannot); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`).
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries).
