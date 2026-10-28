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

Stage 2b part 2 is down to its close, and Geoff picks it up in this repo. Every extend page and the
Claude Code page are published, and the redraft BACKLOG #71 tracked is done. A docs change now lands
in the same pull request as the code, checked by `npm run check:docs-gate`, and goes to Geoff as a
`docs` review; the `cairn-docs` skill carries the procedure. What remains is the 53 stage-2b entries
in `docs/internal/record/harvest/relink.json` (relinks and `LEGACY_PATH_MAP` repoints), the 10 fact
re-arms, the reference-arm corrections, the final arm index, the outline deletion, the consistency
read, the boundary test, and the friction-log triage. The scope, its exclusions, and the one open
decision are in [the launch prompt](plans/2026-10-27-docs-2b-close-prompt.txt); Geoff approves the
scope as a design first. Part 1's carried items are the ROADMAP entry "Stage 2b part 2". The release
holds until the docs are complete.

The pre-2b tooling PRs are merged: cairn-cms #116 and workstation #25. If `tellgrader` predates
#25, rebuild it with `make -C ~/.dotfiles/claude/.claude/skills/writing-voice/evals/tellgrader install`.
The residue is the "Docs tooling before stage 2b: the residue" entry in `ROADMAP.md`.

## Open decisions and watches
- The docs improvement loop is merged (PRs #149, #153, #154). The eval runs on clean fixtures with a
  true control, and the first real cycle's triage waits on Geoff. The human gate design
  (`docs-system/specs/2026-10-27-docs-cycle-human-gate-design.md` in the initiatives repo) is approved
  and unbuilt; the docs-system initiative closes once it lands.
- Stage 2b, for Geoff: whether the engine fixture for the sidebar figure (the story
  `nav/worked-navlayout` relabels media to its own default) blocks 2b's close. Recommended: it does
  not, and the close records it as deferred to the engine pass.
- Routines: sveltejs/kit#17368 (`trig_01KPzLTU7rzLMQUp2y6bjZtm`, delete once the PR closes); held
  majors (`trig_01UCoKqxRXVwAfMdnF913E4v`); remote functions reaching stable
  (`trig_0193pPNoyxsTGeUhF1xx7woa`); the monthly drift sample (`trig_015UPQostYVisXuExTHTH2vu`),
  which widens at stage 4's merge.
- Node 26 floor only if Active LTS; TypeScript 7 waits on `tsgo.yml`; `radius-scale` and the retired
  patch arms promote at the next version commit; the release runs `check:dev-package` and `npm pkg fix`
  (four `./` `bin` entries). `CAIRN_GATE_READ_TOKEN` expires 2026-10-19.
