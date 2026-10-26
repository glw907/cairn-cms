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

Stage 2b part 2 is drafting pages from approved blueprints through drafter. Every extend page now
has its drafted page; batch 5 (PR #141) merged the last five. Its record is
`~/Projects/initiatives/docs-system/research/2026-10-25-extend-pages-batch-5/RESUME.md`. Each
drafting worktree needs Geoff's `~/.config/drafter/cairn-cms.local.toml` copied in as
`drafter.local.toml` (ignored by git), and drafter runs launch under `setsid -f`. Several published
extend pages still disagree with their blueprints; BACKLOG #71 lists them for a redraft. The one blueprint with no page is `blueprints/docs/claude-code/using-claude-code-with-cairn`; its
draft registers the `claude-code` arm in the gates and adds that arm's track entry to
`docs-register.md`. The page plans under `internal/briefs/` (`.plan.md` and `.plan.yaml`), which the blueprints
replaced, still need retiring. Then comes the rest of part 2: the relinks and `LEGACY_PATH_MAP` repoints, the
reference-arm corrections, the final arm index, the outline deletion, the boundary test, and 2b's
close, which still owns the friction-log triage. Part 1's carried items are the ROADMAP entry
"Stage 2b part 2". The re-arm list is `docs/internal/record/harvest/relink.json`. The release holds
until the docs are complete.

The pre-2b tooling PRs are merged: cairn-cms #116 and workstation #25. If `tellgrader` predates
#25, rebuild it with `make -C ~/.dotfiles/claude/.claude/skills/writing-voice/evals/tellgrader install`.
The residue is the "Docs tooling before stage 2b: the residue" entry in `ROADMAP.md`.

## Open decisions and watches
- Stage 2b part 1, for Geoff: the framing A/B
  (`research/2026-10-11-draft-docs-2b-part1-ab/README.md`); the engine fixture for the
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
