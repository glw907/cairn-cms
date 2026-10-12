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

Stage 2b part 2 begins with its page plans, written in drafter's plan format v1
(`superpowers/plans/2026-10-12-draft-docs-2b-part2-plans.md`). There are 11: the ten extend pages
pass B re-armed, and "Using Claude Code with cairn" for the new `claude-code` arm. `conductor-cairn-cms`
runs the pass. It launched from the main checkout with `claude --bg --model claude-opus-5-5 --effort
medium --name conductor-cairn-cms "$(cat docs/superpowers/plans/2026-10-12-draft-docs-2b-part2-plans-conductor-prompt.txt)"`,
and it starts the executor `draft-docs-2b-part2-plans`. The pass battle-tests the format with
drafter-conductor: findings go into drafter Pass 0 before it merges, and the conductor runs
`drafter check-plan` on all 11 plans afterward. Drafting the pages through drafter follows. Then
comes the rest of part 2: the relinks and `LEGACY_PATH_MAP` repoints, the reference-arm corrections,
the final arm index, the outline deletion, the boundary test, and 2b's close. Part 1's carried items
are the ROADMAP entry "Stage 2b part 2". The re-arm list is `docs/internal/record/harvest/relink.json`.
The release holds until the docs are complete.

The pre-2b tooling PRs are merged: cairn-cms #116 and workstation #25. If `tellgrader` predates
#25, rebuild it with `make -C ~/.dotfiles/claude/.claude/skills/writing-voice/evals/tellgrader install`.
The residue is the "Docs tooling before stage 2b: the residue" entry in `ROADMAP.md`.

## Open decisions and watches
- Stage 2b part 1, for Geoff: the framing A/B
  (`superpowers/research/2026-10-11-draft-docs-2b-part1-ab/README.md`); the engine fixture for the
  sidebar figure (the story `nav/worked-navlayout` relabels media to its own default); the outline
  crossLinks from `share-a-draft-preview` and `act-on-newly-published-entries` to
  `build-the-public-routes`.
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`),
  which widens at stage 4's merge.
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries). `CAIRN_GATE_READ_TOKEN` expires 2026-10-19.
