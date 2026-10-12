# Draft docs stage 2b, part 2: the page plans (plan format v1)

**Goal.** Write 11 page plans in drafter's plan format v1, ready for drafter to draft from once its
Pass 0 merges. Ten plans cover the extend pages engine pass B re-armed. The eleventh covers "Using
Claude Code with cairn", the first page of the new `claude-code` arm. No page prose is written.

**Design.** Approved by Geoff in chat on 2026-10-12, with unattended execution approved. There is no
separate spec, since the design fits on a page. It is restated here in the "Rulings" section.

**Pass class.** `ordinary`, since every path is under `docs/`. The pass merges its own PR once the
whole-branch review accepts and the "Found, not done" list is empty. Otherwise the PR goes to Geoff's
desk.

## Rulings (Geoff, 2026-10-12)

- Scope is the 11 plans. Out of scope: drafting any page, registering the `claude-code` arm in the
  gates (`ARM_NAMES` and the rest; that lands with the page's drafting), the relink and
  `LEGACY_PATH_MAP` repoints, reference-arm corrections, the final arm index, outline deletion, the
  outline crossLinks item, the consistency read, the boundary test, 2b's close, and every edit to
  `docs-page-chain.js` or `scripts/docs-review/embed.mjs`.
- Each plan is rebuilt fresh from its inputs, never converted from the old `.plan.md` (the
  rebuild-not-edit rule). The old `.plan.md` stays on disk, because the chain and the docs review
  page still read it. The drafting run retires it.
- Plans follow `~/.local/share/drafter/plan-format-v1.md` exactly. Read it whole before any task.
  Every prose field is a `|` block or a quoted string. Every fact id is quoted. A `link` target and
  a disposition `reference` resolve from the directory of `page.path`, never from the plan file's
  directory, so write each target the way the page's own link would be written (drafter-conductor,
  2026-10-12).
- After Pass 0 merges, the chain's YAML mode reads a page's committed `.plan.md` as its prior plan,
  then deletes it once the `.plan.yaml` is written. Expect the old files to disappear as the chain
  runs over their pages.
- Format feedback goes to the `drafter-conductor` session (Geoff: "any direct experience you have
  with the format will be helpful"; "This is live collaborative development, so provide liberal
  input. In balance, more input is better than less."). Send freely: friction, a workaround you
  used, a field that would have helped, or a rule that's merely unclear. drafter-conductor filters.
  The planning session's first batch of 11 predicted findings was folded into the sheet before
  launch (Geoff approved, 2026-10-12). The sheet now has section `level`, a `failure` with no
  `from` plus `cause`, the `code` and `figure` kinds, `use` on `fact`, and `facts` on `sentence`.
  It states that items run in prose order, that `preconditions` holds the tokens while "Before you
  begin" describes them (a reader action there is a `step`), and that exemplars and crossLinks stay
  out of the plan. Two findings were rejected and are settled: no unused-`produces` warning, and no
  `rework` block, so carry the re-arm change set as a `constraints` entry. Don't resend these.
  Report how the new fields work on real pages. Send each finding with `SendMessage` when it is hit: an
  ambiguity in the sheet, a field a real page needed and the format lacks, or a rule that fought a
  real page. Each message names the page, quotes the plan excerpt the problem hit, and says what
  was needed. Also log it in the pass record. Findings that hold up go into drafter Pass 0 itself
  (Geoff via drafter-conductor, 2026-10-12). Until the conductor confirms a change, a missing field
  becomes a `constraints` entry in the plan.
- The sheet may change mid-run. When drafter-conductor reports a change to
  `plan-format-v1.md`, re-read the sheet, update `check-plan-lite`, and bring every plan already
  written into line before the next task. T13 re-checks all 11 plans against the sheet as it stands
  then.
- Standing answers: an estimate overrun up to 1,000 task-minutes proceeds without stopping. A plan
  that needs a fact the container lacks or cannot place (wrong tag) gets a `friction` entry and
  proceeds. It never invents the fact.
- `drafter check-plan` is not installed. T0's scratchpad script stands in until Pass 0 merges. The
  planning session runs the real validator after the merge.

## Inputs every page task reads

Pre-extract these for each author dispatch. Agents start with zero context.

- The format sheet: `~/.local/share/drafter/plan-format-v1.md`.
- The page's outline entry: `docs/internal/outlines/extend.json`, `pages[]` by `slug` (`job`,
  `pageType`, `covers`, `notCovered` or the out-of-scope list, `exemplars`, `factIds`, `figure` and
  `figureNote`, `absorbs`), plus the top-level `crossLinks` entries whose `from` is the slug. For the
  Claude Code page, `docs/internal/outlines/claude-code.json` from T1.
- The page's re-arm entry: `docs/internal/record/harvest/relink.json`, the `"stage": "2b"` entry for
  the page's file (`context`, `done`, `facts`). Its fact ids join the outline's.
- `docs/internal/docs-register.md`: "## The page anatomies" for the page type, "## Drafting brief:
  developer docs" whole (Structure, Voice, The introduction, Exemplars, Tells), "## Names", and
  "### The extend track". Find each section by its heading, never by line number.
- Each fact bullet, found by searching for its id in `docs/internal/facts/`. Only a fact tagged
  `[verified]`, `[external]`, or `[vendor]` may be placed.
- The outline's exemplars, each at `~/.local/share/cairn/exemplars/<source>/page.md`, read for
  anatomy only.
- Context only, never copied: the current page under `docs/extend/`, the old
  `docs/internal/briefs/extend/<slug>.plan.md`, and `<slug>.framing.md` where it exists.
- The planning method, quoted in the chain's `planPrompt` (`~/.dotfiles/claude/.claude/workflows/
  docs-page-chain.js`, find `function planPrompt`). The plan is Google's outline written down. The
  plan argues the section order (`orderReason`). It never follows `covers` as an inventory.
- The plan-read criteria are the chain's `structurePrompt` in plan mode (find
  `function structurePrompt`).

Every planning dispatch carries pass-core's two prompting samples verbatim.

## Tasks

Each page task writes one file and nothing else. Page agents never edit `docs/internal/facts/`. Each
reports any fact correction it needs (the id, what is wrong, and the evidence with `path:line`), and
T13 applies them all serially. That keeps every pair's files disjoint.

### T0. Setup and the stand-in check (ordinary, 20 min)

Run `EnterWorktree` on branch `draft-docs-2b-part2-plans`, then the cairn-pass setup command. Write
`$SCRATCH/check-plan-lite.mjs`, using the `yaml` package if `node_modules` has it. The script checks
the sheet's rules:
- the file parses as one YAML document, with no duplicate keys
- the known top-level and per-kind fields only, and the required ones present
- unique item ids
- each `from` names a step, and each `handledBy` names an item
- no fact both placed and disposed
- each `canFail: true` step is the `from` of some `failure` item
- `requires` reader state
- each placed or disposed fact matches exactly one bullet in `docs/internal/facts/` (skipping
  `## Harvest record`, `## Provenance`, and `README.md`), and each placed fact carries an allowed
  tag
- relative link targets exist, resolved from `page.path`'s directory
- no plain-scalar prose field (check the raw text for `key: value` lines on prose keys that aren't
  `|` or quoted)

Anchor checks are skipped. Throwaway code, never committed.
**Acceptance:** the script passes on the sheet's own example with its fact check stubbed, and fails
on three seeded faults (a duplicate id, an unquoted ` # `, a bad `handledBy`).

### T1. The Claude Code outline (ordinary, 40 min)

Write `docs/internal/outlines/claude-code.json` in `extend.json`'s top-level schema (`arm`, `track`,
`pages`; leave out keys that would be empty, unless a check needs them). It has one page:
- slug `using-claude-code-with-cairn`
- path `docs/claude-code/using-claude-code-with-cairn.md`
- title "Using Claude Code with cairn"

Write `job`, `pageType` (one of the register's anatomies), `covers`, the out-of-scope list, and
`exemplars`, picked from `~/.local/share/cairn/exemplars/` with a `take` line each. For sources, use
the ROADMAP entry "The Claude Code arm: a small docs stage right after 2b" and its facts:
`f:0ygumq`, `f:pmmtrm`, `f:7ozknm`, `f:o7bkm0`, `f:6ro1n9`, `f:dy5cfj`, `f:4ax489`, `f:jd54ph`,
`f:4h9fz4`, `f:5ohm23`, `f:4nccq6`. Search the container for any further `[verified]` fact on the
review agent or the guidance tree, and add it to `factIds`. The page documents Claude Code only
(`f:pmmtrm`).
**Acceptance:** valid JSON. Every fact id resolves to one bullet. The covers list includes the guidance
tree, the four skills and when each loads, the review agent, the `Stop` hook snippet, and
`cairn-guidance install` and `check` with their exit codes and the CI step.

### T2 to T12. One plan per page (ordinary, 60 min each)

Each task is one author dispatch (Opus 5.5, `high`) that writes the plan. One plan-read dispatch
follows (Opus 5.5, `medium`, `structurePrompt` plan-mode criteria) and returns blocking and
non-blocking findings. One fold by the author follows on the blocking findings. Then
`check-plan-lite` runs until clean. The author returns its fact corrections and format findings.

| Task | Page | Plan file | Pair |
|---|---|---|---|
| T2 | architecture | `briefs/extend/architecture.plan.yaml` | A |
| T3 | scaffolded-site-files | `briefs/extend/scaffolded-site-files.plan.yaml` | A |
| T4 | add-cairn-to-a-sveltekit-app | `briefs/extend/add-cairn-to-a-sveltekit-app.plan.yaml` | B |
| T5 | add-a-custom-admin-screen | `briefs/extend/add-a-custom-admin-screen.plan.yaml` | B |
| T6 | security-model | `briefs/extend/security-model.plan.yaml` | C |
| T7 | restrict-admin-access | `briefs/extend/restrict-admin-access.plan.yaml` | C |
| T8 | replace-magic-links-with-cloudflare-access | `briefs/extend/replace-magic-links-with-cloudflare-access.plan.yaml` | D |
| T9 | add-a-second-sign-in-group | `briefs/extend/add-a-second-sign-in-group.plan.yaml` | D |
| T10 | debug-your-site | `briefs/extend/debug-your-site.plan.yaml` | E |
| T11 | rotate-the-github-app-key | `briefs/extend/rotate-the-github-app-key.plan.yaml` | E |
| T12 | using-claude-code-with-cairn (after T1) | `briefs/claude-code/using-claude-code-with-cairn.plan.yaml` | F, alone |

Paths are under `docs/internal/`. Run a pair's two tasks as two Agent-tool subagents with
`isolation: "worktree"` after the session commits, per pass-core "Pairs". Each pair subagent makes
the author, read, and fold dispatches itself, commits, and never pushes.

Page-specific constraints for authors:
- Every page: the re-arm entry's `done` text names what changed, so the plan must carry it. The
  general docs assume no coding assistant (`docs-register.md`, the "never assume Claude" rule), so
  no extend plan sends a reader to Claude Code.
- scaffolded-site-files: the guidance-tree section it once had moves to the Claude Code page. Plan
  one `link` item to it at most, with no facts.
- add-cairn-to-a-sveltekit-app: the part 1 carried item is the tutorial's `#lib/...` import with no
  `package.json` subpath import, plus the unmentioned root `+layout.svelte`. Fold both into the plan
  if the facts support them. Otherwise file a `friction` entry.
- Steps (`step` items with `requires`/`produces`/`canFail` and `failure` items) apply to task guides
  and the tutorial. Concept and symptom-row pages use them only where the page walks a sequence.

**Acceptance (each):** `check-plan-lite` clean. The plan read has no open blocking finding. Every
outline and re-arm fact id is placed or disposed, with a `reason` on each disposition.

### T13. Fact corrections (ordinary, 30 min)

Apply every correction T2 to T12 reported, plus the part 1 drift items if any plan places them
(`f:hsk70g` quoted line, `f:x84fah` range, `f:smbsa6` and `f:zyjzeg` line numbers). Fix a Source
pointer only against the code. Re-run `check-plan-lite` over all 11 plans.
**Acceptance:** the fast lane passes, including `check:facts`, and all 11 plans are clean.

### T14. Format record and hand-off notes (ordinary, 20 min)

Write `docs/superpowers/research/2026-10-12-2b-part2-plans-record.md`. For each plan, list its file,
section count, placed and disposed fact counts, and the plan read's verdict. Consolidate every
format finding and say which were sent to `drafter-conductor`. Send any unsent ones now.
**Acceptance:** the record exists, and every finding in it shows as sent.

### T15. Close (ordinary, 40 min)

Push to `glw907/cairn-cms` and open a draft PR. Run `ci-green` in the background. Run the
whole-branch `diff-reviewer`, then one batched fix chain if needed. Update `docs/STATUS.md` in the
present tense:
- the plans exist
- they await `drafter check-plan` after Pass 0 merges, run by the planning session or whoever drafts
- the drafting run retires the `.plan.md` files and registers the `claude-code` arm

Add a ROADMAP entry under Stage 2b part 2 for teaching `embed.mjs` `planPathFor` to read
`.plan.yaml`. Write the PR body with what landed, the score, and "Found, not done" with a
disposition on each item. If that list is empty and CI is green, merge with `gh pr merge <n> --merge`
and pull the main checkout per pass-core. Otherwise hand the PR to the desk with `review-desk pr
glw907/cairn-cms "<title>" <n>`, wait, and merge only on Geoff's approve with
`--match-head-commit`.
**Acceptance:** PR merged or on the desk, and STATUS current.

**Total:** 20 + 40 + 11 × 60 + 30 + 20 + 40 = 810 task-minutes, against a design estimate of about
700 and a standing ceiling of 1,000.
