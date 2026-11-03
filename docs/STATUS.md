# cairn-cms status

Present tense only; history lives in git and PR bodies, orientation in `CLAUDE.md`.

## Current state

Published: **`0.98.0`** (npm `latest`, release commit `a84a6853`, with `@glw907/cairn-cms-dev`
`0.98.0`); the Go tool is `tool/v1.1.0`. Prerelease `0.98.1-rc.2` is on npm `next`.
`create-cairn-site` is unpublished (`BACKLOG.md` #195). cairn.pub pins `0.94.0-rc.1`, its ceiling
`0.98.0` until the next release (`BACKLOG.md` #168 holds what cairn.pub is owed). `main` carries the
agent-first pattern, media and publish, and both scaffold passes, all unreleased.

**The sequence (Geoff, 2026-11-01).** One conductor runs the approved run sheet, passes 1a to 8, then
the release, which is the first of several: a site rebuild drives each later one. Every site
rebuilds; none migrates. The sheet is `~/.local/state/cairn-agent-first/design-audit/run-sheet.md`,
with its rulings in `ledger.md` beside it. Engine passes land on `main` and never release.

**The history files are reset.** `CHANGELOG.md` and `MIGRATION-NOTES.md` hold one consolidated
`## Unreleased` and a `## 0.98.0` stub. The detail of `## Unreleased` before the reset sits in no tag;
it is `git show c074feff5d32ad790bbf1272c0c41dfacccc1258:CHANGELOG.md`, and the release sweep reads
that file as its changelog input (`cairn-releasing` step 3). The release cut renames both
`## Unreleased` headings and derives the `release-size` marker at the cut.

## Immediate next action

Pass 8, `cleanup`, is merged at `6dc3fe1e6`. Pass 9, the release, runs per the sheet: the dependency
sweep `cairn-cms-dep-sweep` is the last merge before the cut, and nothing else runs from it on. The
conductor then runs the release sweep and cuts the first candidate to `next`.

The release sitting is where Geoff reads the release packet and rules each major on the sweep's
survey. The lists for it are in #188's body: the ROADMAP bullets kept in doubt, the set-asides (the
`precheck`, the audit-wrapper fold, the eval deny-list half of #191), the reviewers' non-blocking
finds, and T13's measurement tables, with the triage in
`~/.local/state/cairn-agent-first/2026-11-02-backlog-triage.json`. Three bars read unmet by Geoff's
choice (the install and editor sittings, and the docs review of the human pages). Evaluate reads
unmet: the blind grade of #207 found claim 2 missed by two of three answers and claim 7 by one.

## Open decisions and watches

- `BACKLOG.md` lists open items, each with a `Placement` line, and `## Won't do` holds Geoff's
  rulings. The full backlog sweep ran at the close of pass 8 and wrote
  `~/.local/state/cairn-agent-first/2026-11-02-backlog-triage.json` for the sitting (four drop rows,
  fifteen defer rows); it landed nothing.
- Docs: the human gate design is approved and unbuilt, outside this run. The 94 boundary-test
  verdicts and the capture runbook are at the `pre-agent-first` tag.
- Routines: sveltejs/kit#17368 merged on 2026-10-14, so its routine (`trig_01KPzLTU7rzLMQUp2y6bjZtm`)
  is due for deletion at claude.ai/code/routines (an agent cannot); held majors
  (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`).
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries).
