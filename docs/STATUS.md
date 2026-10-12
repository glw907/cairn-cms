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

Draft docs stage 2b part 1 is drafted on branch `draft-docs-2b-part1` (draft PR #117, stacked on
`worktree-pre2b-tooling`, PR #116). The extend arm's 14 new pages each reached a final reader accept
through `docs-page-chain` on the fixed pre-2b tools: `act-on-newly-published-entries`,
`add-an-island`, `arrange-the-admin-sidebar`, `build-the-public-routes`, `configure-media`,
`configure-rendering`, `content-model`, `define-an-adapter-and-schema`,
`link-content-with-references`, `migrate-existing-content`, `reuse-content-across-entries`,
`run-cairn-audit-on-your-site`, `share-a-draft-preview`, `turn-on-tidy`. The whole-tree docs gate
passes. The pass is `runner` class because `scripts/checks/check-symbols-allowlist.mjs` gained
entries for the paths and script constants the pages create.

Next: Geoff reads and merges PR #117, after PR #116 merges and the base retargets to `main`. Then
stage 2b part 2: the ten fact re-arms of drafted pages, the 32 link restorations and
`LEGACY_PATH_MAP` repoints, the reference-arm corrections, the final arm index, the outline
deletion, the boundary test, 2b's close, and the claude-code arm. The part 1 "Found, not done"
items live in the PR body and the stage record
(`superpowers/research/2026-10-11-draft-docs-2b-part1-record.md`). The re-arm list is engine pass
B's, in `docs/internal/record/harvest/relink.json`. The release holds until the docs are complete.

PR #116 (the register, the `check:*` scripts, `link:consumer`, and the fact pointers) and its
workstation PR (the chain's prompts and the showcase tell) wait for the same desk read. cairn-cms
merges first, then workstation, then `make -C ~/.dotfiles/claude/.claude/skills/writing-voice/evals/tellgrader install`
rebuilds `tellgrader`. The residue is the "Docs tooling before stage 2b: the residue" entry in
`ROADMAP.md`.

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
