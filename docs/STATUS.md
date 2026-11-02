# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Prerelease `0.98.1-rc.2` is on npm `next`.
`create-cairn-site` is unpublished (`BACKLOG.md` #195). cairn.pub pins `0.94.0-rc.1`, its ceiling
`0.98.0` until the next release (`BACKLOG.md` #168 holds what cairn.pub is owed). `main` carries the
agent-first pattern, media and publish (#172), and both scaffold passes (#171, #173), all
unreleased.

**The sequence (Geoff, 2026-11-01).** One conductor runs the approved run sheet, passes 1a to 8, then
the release, which is the first of several: 907.life's rebuild drives the next, and each later
site rebuild may drive its own. Every site rebuilds; none migrates. The sheet is
`~/.local/state/cairn-agent-first/design-audit/run-sheet.md`, with its rulings in `ledger.md` beside
it. Engine passes land on `main` and never release.

## Immediate next action

Pass 1a (auth removal) and pass 1b (audit trim) are in planning, side by side. The conductor acting
for this run is session `cairn-cms-9b`, and its planners report to it. Passes 2 to 8 follow in order,
each planned just before it runs. The run stops at the release sitting, where Geoff reads the release
packet and rules each of the five held majors. Three bars read unmet by Geoff's choice (the install
and editor sittings, and the docs review of the human pages), and Evaluate is unmet until its re-cut
(`BACKLOG.md` #207).

## Open decisions and watches

- `BACKLOG.md` lists open items by pass, each with a `Placement` line, and `## Won't do` holds Geoff's
  rulings.
- Docs: the human gate design is approved and unbuilt, outside this run. The 94 boundary-test
  verdicts and the capture runbook are at the `pre-agent-first` tag.
- Routines: sveltejs/kit#17368 merged on 2026-10-14, so its routine (`trig_01KPzLTU7rzLMQUp2y6bjZtm`)
  is due for deletion at claude.ai/code/routines (an agent cannot); held majors
  (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`).
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries).
