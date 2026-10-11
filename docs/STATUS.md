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

Draft docs stage 2b is next: the 14 remaining extend pages, drafted from corrected facts. The re-arm
list is pass B's, in `docs/internal/record/harvest/relink.json`: every `"stage": "2b"` entry that
carries a `facts` array, ten extend pages with the fact ids that changed. Engine pass B closed
unreleased (PR #113; plan `superpowers/plans/2026-10-10-engine-pass-b-lean.md`): the signups demo
and `APP_DB` left the scaffold, the dev package ships built `dist/`, the engine supplies the dev-build
define, and the dev backend serves the site's own content. The release holds until the docs are
complete.

In flight: the alignment pass, session `cairn-alignment` (id `bcabc73b`), on branch
`worktree-alignment-pass`.

## Open decisions and watches
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`),
  which widens at stage 4's merge.
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries). `CAIRN_GATE_READ_TOKEN` expires 2026-10-19.
