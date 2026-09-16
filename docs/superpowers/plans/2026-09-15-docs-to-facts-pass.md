# Docs-to-Facts Pass Implementation Plan (the container tightened and gated, the arms frozen, the gate-tier classifier)

> **For agentic workers:** five tasks, executed as a per-task chain (`cairn-implementer` then
> `diff-reviewer` then the gate), dispatched one task at a time with the Agent tool. Below six
> tasks, so no workflow runner. Tasks 1, 2, and 5 are independent of each other; task 2 depends on
> task 1's normalized container; task 3 depends on task 1's README. Steps use checkbox syntax.

**Date:** 2026-09-15. **Approved:** Geoff, 2026-09-15, on the reshape the three-lens adversarial
review produced (`docs/internal/record/2026-09-15-facts-container-review/`, structure, evolution,
and charter reports; the accounting of what the reshape defers was read and accepted). The
plan-approval gate is closed; execution needs no further read.

**Where it runs:** worktree `.claude/worktrees/docs-to-facts`, branch `docs-to-facts` off `main`
at `c5ec36d8` or later. PR to `main` at close.

**Token ceiling:** 1.5M subagent tokens. **Checkpoint interval:** every task (STATUS written at
each boundary; the pass is short enough that the default four would mean no checkpoint).

**Engine consultation:** no engine asks (this is the engine).

## Goal

The facts container becomes a gated, machine-checkable record that every later pass can file into
cheaply, the three narrative doc arms stop costing a pass register-graded prose during the
finalization window, the reference arm stays maintained as the one arm a consumer resolves, and
the per-task gate tier is chosen from the diff.

## What the review overturned, so no task re-opens it

- **The arms stay in the tree and the tarball.** Seven check scripts read them (`check-snippets`,
  `check-symbols`, `transcript-blocks`, `check-arm-indexes`, `check-editor-quotes`,
  `check-readiness`, `check-package-files`) and `src/lib/diagnostics/conditions.ts` ships about 25
  `docsAnchor` values into `docs/admin/`. Nothing moves, nothing is deleted, no gate or anchor is
  repointed. cairn.pub keeps rendering the arms; Geoff is its only reader for now.
- **`docs/reference/` stays where it is and stays maintained per pass**, because
  `check:reference:signatures` parses its fenced blocks and it is what an agent in `node_modules`
  reads. `facts/reference.md` stays as the gotcha record beside it; it is not a second catalog.
- **The container is not shipped.** Its README's "never shipped" line stands.
- **No `cairn-fact` CLI this pass.** It is deferred until a site pass has filed about twenty facts
  by hand and the shape has stopped moving (charter report, finding 9 and verdict).
- **The arms are frozen against rewrites, open to fixes (Geoff, 2026-09-15, amended mid-pass).**
  A pass that changes a public behavior files the container bullet and updates the reference
  page. No pass rewrites the admin, editors, extend, or why-cairn narrative; the docs rebuild
  after the site round does that from the container. But a deficiency a site pass DISCOVERS (a
  missing step, a missing worked example, a wrong warning, a stale command) is fixed on the page
  the next site will read, in the same pass, gated by that page's existing gates, with the fact
  bullet filed alongside as the sourced record. The friction log holds only what the site pass
  could not fix (a capability gap). A consuming pass's engine-consult step reads the container
  arms it builds on AND the open friction entries before its plan is written, so a hole site one
  could not close is in front of site two's planner. No page-level banner; the rule is recorded
  in CLAUDE.md and the skills, and cairn.pub's readers are not a cost.

## Tasks

### Task 1: Normalize the container to a gate-ready grammar

**Files:** `docs/internal/facts/README.md`, `admin.md`, `editors.md`, `extend.md`,
`reference.md`, `front-door.md`. Plus the 14 arm pages the `[docs-drift]` bullets quote (locate
each by the quoted wording).

**Outcome:** the README describes the grammar the files follow, and the files follow it.

**Acceptance criteria:**

- [ ] Tag vocabulary as the README lists it, one tag per bullet, always at the end of the bullet.
      The qualifier form is the colon form only (`[verified: ...]`); the ~52 space-qualified tags
      (`[verified via ...]`, `[verified against ...]`, `[verified structurally]`) are rewritten to
      it. The three out-of-vocabulary tags (`[note:]`, `[see docs-drift:]`, `[not a docs-drift:]`,
      `editors.md:21,26,85`) and the double-bracket bullet are resolved; the start-of-line tag at
      `reference.md:604` moves to the end.
- [ ] Every `[verified]` bullet whose only source is a doc arm page or "page text" (116 by the
      structure count, 174 by the evolution count; the task counts them itself and reports the
      number) is retagged `[candidate: sourced to the page only, not traced to code]`. A bullet
      whose source names code AND a page keeps `[verified]`.
- [ ] The non-fact sections (`## Cross-page duplicates`, `## Harvest notes`, `## Harvest summary`)
      are either deleted or moved under one `## Harvest record` heading per file, whose bullets the
      gate skips (task 2 allowlists exactly that heading). Deleting is preferred where the content
      only indexes arm pages that still exist.
- [ ] The 14 `[docs-drift]` bullets are resolved: the arm page is corrected to what the code does
      (one-line fixes; this is the sanctioned freeze exception) and the bullet retagged
      `[verified]`. If a page fix would exceed a sentence, the bullet keeps `[docs-drift]` and the
      report names it.
- [ ] The line-pointer drift the structure report lists (`CairnAdminShell.svelte:760`,
      `:1078`, `editor-shortcuts.ts:29`, `:39`, plus the 9 wrong-line quote-anchored pointers in
      the report's section 4) is corrected. No task re-verifies all 506 pointers; the gate does
      that structurally.
- [ ] The hand-maintained index table is removed from the README; the README says the gate
      prints the counts.
- [ ] The README's "How this container grows" section states the freeze and the filing rule as
      the section above records them, and drops the `cairn-fact` promise (says it is deferred,
      and why).
- [ ] `gaps.md` is deleted. Its seeded entries move to `docs/internal/docs-friction-log.md` under
      the live findings, in that log's entry shape, tagged by perspective, with the version and
      pass carried in the note. The friction log's header gains one sentence: a hole in the facts
      container is filed here too. The `[candidate]` bullets `gaps.md` under-counted need no entry;
      the tag is the intake.
- [ ] No em dash in the container. `npm run check:docs` green.

**Gate tier:** docs (`npm run check:docs && npm run check:vale`). Notes: work file by file with
`grep -n '\[' | grep -v -E '\[(verified|docs-drift|external|vendor|candidate|rejected)'` as the
first pass; report the before/after tag counts per file.

### Task 2: The `check:facts` gate

**Files:** `scripts/checks/check-facts.mjs`, `scripts/checks/fixtures/facts/` (a small good and a
small bad container), `src/tests/unit/checks/check-facts.test.ts` (or the pattern the sibling
check scripts' tests use; match it), `package.json` (`check:facts` wired into `check`),
`.github/workflows/test.yml` if `check` is not what CI runs.

**Acceptance criteria:**

- [ ] The script walks `docs/internal/facts/*.md` and, for every bullet outside a
      `## Harvest record` section: requires `Source:`; requires exactly one tag from the vocabulary,
      at the end, in the colon-qualifier form; resolves every `path:line` and `path:line-line`
      pointer to an existing file with the line in range; when the pointer carries a quoted
      anchor (a backticked snippet after the line), re-reads the cited line and fails if the
      snippet is absent. A `Source:` that names a doc page or a symbol without a line is accepted
      (the tag rule covers it).
- [ ] Output: per-file counts by tag on success (replacing the README table); on failure, one
      line per defect with `file:line`, exit 1.
- [ ] Green on the task-1 container. The bad fixture proves each rule fires: missing source, tag
      outside vocabulary, two tags, space qualifier, unresolved path, out-of-range line, absent
      anchor, bullet in a non-allowlisted section.
- [ ] `npm run check` runs it. `docs/internal/facts/README.md` names it in one sentence.

**Gate tier:** scripts (`npm run check && npm test`, no showcase e2e).

### Task 3: Governance is container-first (repo side)

**Files:** `CLAUDE.md` ("Documentation is a pass dimension" section), `ROADMAP.md`,
`docs/superpowers/plans/2026-09-14-extend-1-pass.md`,
`docs/superpowers/plans/2026-09-14-extend-2-pass.md`, `CHANGELOG.md`.

**Acceptance criteria:**

- [ ] CLAUDE.md's docs section states, in this order: the reference arm is maintained per pass
      and gated; the three narrative arms and why-cairn are frozen for the finalization window
      with the discovered-deficiency exception (fixed on the page in the same pass); every public-behavior change files a bullet in the
      container, gated by `check:facts`; the docs rebuild after the site round rebuilds the
      narrative arms from the container (the `docs-rebuild-not-edit` ruling). The four-track
      description and cairn.pub's versioning paragraph stay; the friction-log paragraph adds the
      facts-hole sentence. Total section length does not grow by more than ten lines.
- [ ] The two extend plans' docs deliverables are amended: where a task says "update
      `docs/extend/<page>`" for a narrative page, it now says "file the container bullet(s) in
      `docs/internal/facts/extend.md`; the reference page still updates". Reference-page and
      `docs/reference/README.md` deliverables are untouched. The amendment is a dated note in each
      plan's header plus the edited task lines, not a rewrite.
- [ ] ROADMAP: the gate-tier Now entry (`ROADMAP.md:296`) is removed when task 5 lands (this task
      writes the removal; task 5 is what makes it true, so dispatch this task after task 5 or
      have it note the dependency). A `Planned` line for the `cairn-fact` CLI with its trigger
      ("twenty hand-filed facts"). A `Planned` line for re-sourcing page-only candidates,
      trigger: the docs rebuild.
- [ ] CHANGELOG under `## Unreleased`, a `### Changed` line: the facts container is gated
      (`check:facts`), no consumer action. One line.

**Gate tier:** docs (`npm run check:docs && npm run check:vale`).

### Task 4: Governance is container-first (dotfiles side)

**Files (all under `~/.dotfiles`, stowed to `~/.claude`):** `claude/.claude/skills/cairn-pass/SKILL.md`
(section "5. Documentation"), `claude/.claude/skills/engine-consult/SKILL.md`,
`claude/.claude/agents/cairn-implementer.md`, `claude/.claude/agents/site-implementer.md`.
Commit in the dotfiles repo; `claude-tooling-sync verify` must stay green.

**Acceptance criteria:**

- [ ] `cairn-pass` step 5 opens with the container-first rule (bullet first, reference page
      second, narrative arms frozen) and adds `check:facts` to the named gate list. The CI-only
      gate list stays accurate. Section length does not grow by more than eight lines.
- [ ] `engine-consult`: a consulting pass's plan header carries one more line, `**Facts
      consulted:** <arm files read, or "none">`; the skill's pre-plan read names the container
      arms the pass builds on AND the open entries in cairn-cms `docs/internal/docs-friction-log.md`,
      so a hole the last site could not close reaches this plan; a brief cites the container
      bullet it disputes when one exists.
- [ ] `cairn-implementer` and `site-implementer`: one paragraph each. The cairn one: a
      public-behavior change files its container bullet in the same task and runs `check:facts`.
      The site one: a doc deficiency the task hits (a missing step, example, warning, or a stale
      command) is fixed on the cairn-cms page the next site will read, in the same task, gated by
      that page's gates, with the fact bullet filed alongside; only what the task cannot fix goes
      to cairn-cms `docs/internal/docs-friction-log.md` with the site, pass, date, and engine
      version, never guessed around.
- [ ] `claude-tooling-sync verify` green; dotfiles `scripts/check.sh` green.

**Gate:** the dotfiles gate (`scripts/check.sh`) and `claude-tooling-sync verify`; no cairn gate.

### Task 5: The gate-tier classifier

**Files:** `scripts/checks/gate-tier.mjs`, its unit test, `docs/internal/pass-gate-tiers.md` (the
tier table, one page), `package.json` (no script entry needed; the runner calls it by path).

**Interface (fixed by the dotfiles runner, `~/.claude/workflows/pass-execute.js:30-37,159-171`):**
`node scripts/checks/gate-tier.mjs --range <base>..HEAD [--paint yes|no] [--pin <tier>]`. Prints
the gate string on stdout and nothing else on success; prints the chosen tier and the deciding
paths on stderr; exits non-zero with no stdout when the range is empty or git fails (the runner
then falls back to the plan's gate string).

**Tiers, from `ROADMAP.md:296` (the entry is the spec; copy its table into the doc page):**

| Tier | Trigger (any path in the diff) | Gate string |
| --- | --- | --- |
| `docs` | only `docs/**`, `*.md`, `CHANGELOG.md`, records | `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:facts` |
| `scripts` | only `scripts/**`, `src/tests/**`, test files | `npm run check && npm test` |
| `engine` | `src/lib/**` TypeScript, no component | `npm run check && npm test` |
| `admin-visual` | any `src/lib/components/**` or `cairn-admin.css` | `npm run check && npm test && npm --prefix examples/showcase run test:e2e -- --project admin-visual` (confirm the project name against the showcase's Playwright config) |
| `full` | anything under the render seam, theme or chassis CSS, a public route, a component a public page imports, any snapshot file | the repo's full gate string as `cairn-pass` names it |

`--paint yes` floors the tier at `admin-visual`. `--pin <tier>` overrides the computed tier
upward or downward and is reported as `pin`. The doc page names the exact glob per tier so a
reviewer can reproduce the choice.

**Acceptance criteria:**

- [ ] Unit tests cover one diff per tier, the paint floor, the pin, the empty range, and a mixed
      diff resolving to the highest tier present.
- [ ] Run against the last five merged passes' merge ranges (`git log --merges -5`), the script
      prints a tier for each; the report lists them. The motion pass's chain-A range must
      resolve to `admin-visual` or `full`.
- [ ] The `admin-visual` project name is verified against `examples/showcase/playwright.config.ts`.
- [ ] `npm run check && npm test` green.

**Gate tier:** scripts.

## Close ritual (the fold agent, one dispatch, then one `diff-reviewer` read)

- [ ] `code-simplifier:code-simplifier` over tasks 2 and 5's scripts.
- [ ] Full gate: `npm run check && npm test && npm run check:comments && npm run check:snippets
      && npm run check:transcripts && npm run check:symbols && npm run check:surface` (surface is
      unchanged; it proves that). No showcase e2e: nothing in this pass paints.
- [ ] Friction log whole-log triage (task 1 seeded it; verify each entry against the code).
- [ ] Post-mortem appended to this plan; HISTORY entry; STATUS rewritten present-tense with item
      2 done and item 3 (extend-1) as the immediate next action; the `docs-rebuild-not-edit`
      memory refreshed with the freeze rule.
- [ ] PR to `main`, CI green, merge. Then the pre-bake for the clear.
