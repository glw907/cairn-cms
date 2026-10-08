# Task 4b audit: does the workstation infra carry the docs-code sync system

**Date:** 2026-09-30. **Scope:** plan `2026-09-30-draft-docs-stage-2a.md`, Task 4b. **Against:** this
branch (`e2abb11e`) and `~/.dotfiles` at `865b7dc`. **Auditor:** read-only, Opus 5.5. Agent-facing.

**Symlinks.** `~/.claude/{agents,skills,workflows,docs}` are directory symlinks into
`~/.dotfiles/claude/.claude/`, and `~/.claude/CLAUDE.md` links to `~/.dotfiles/claude/.claude/CLAUDE.md`.
Every workstation fix lands in `~/.dotfiles/claude/.claude/...` (abbreviated `D/` below) and commits there.
Repo paths are relative to the worktree root.

## Inventory

| Artifact | Real path | Verdict |
| --- | --- | --- |
| `cairn-implementer` | `D/agents/cairn-implementer.md` | GAP 1 |
| `diff-reviewer` | `D/agents/diff-reviewer.md` | GAP 2 |
| `cairn-docs-drafter` | `D/agents/cairn-docs-drafter.md` | GAP 5 |
| `cairn-register-editor` | `D/agents/cairn-register-editor.md` | ok (prose only; no fact, map, or friction write) |
| `engine-triage` | `D/agents/engine-triage.md` | ok (read-only rulings; an accepted seam ships through an engine pass, GAP 1) |
| `site-implementer` | `D/agents/site-implementer.md` | ok, beside GAP 4 (its `check:docs-gate -- --page` runs `check:options` unscoped, `scripts/checks/docs-gate.mjs:56-57`) |
| `cairn-pass` | `D/skills/cairn-pass/SKILL.md` | GAP 3 |
| `pass-core` | `D/skills/pass-core/SKILL.md` | ok (repo-agnostic; `engine-logic` = "the repo's full gate", `:87`) |
| `site-pass` | `D/skills/site-pass/SKILL.md` | ok, beside GAP 4 |
| `engine-consult` | `D/skills/engine-consult/SKILL.md` | ok (reads facts and open friction pre-plan, `:33-37`) |
| `cairn-release` | `D/skills/cairn-release/SKILL.md` | ok (step 3 carries Mechanism 2: S8 trigger, window, `v0.98.0` seed, finders, filing, 1M cap, staleness report, yield, retire rule, `:68-107`) |
| `register-check` | `D/skills/register-check/SKILL.md` | ok (prose gates) |
| `cairn-figure` | `D/skills/cairn-figure/SKILL.md` | ok (figures) |
| `pass-execute.js`, `pass-execute-chains.js` | `D/workflows/` | ok (dispatch `cairn-implementer`; the gate-tier classifier's `engine` and `scripts` tiers carry `check:docs-gate`, so `check:options` runs and its message reaches the implementer) |
| `docs-page-chain.js` | `D/workflows/docs-page-chain.js` | ok (map rows `:93-107`, retag order, friction `:109-115`, `:519-526`, title and voice `:117-120`, `:728-736`, `spent` `:122-124`, `:956-957`) |
| global `CLAUDE.md` | `D/CLAUDE.md` | ok (cairn-specific rules do not belong there) |
| cairn-cms `CLAUDE.md` | `CLAUDE.md` | GAP 6 |
| `pass-gate-economy.md`, `claude-tooling.md`, `authoring-charter.md`, `model-economy.md` | `D/docs/` | ok (none restates the docs gate or the sync rules; `claude-tooling.md:56` and `model-economy.md:20` name the chain correctly) |
| `docs/internal/docs-maintenance.md` | repo | GAP 7 |
| `docs/internal/pass-gate-tiers.md` | repo | ok (`:40-43` lists `check:options` in the docs gate) |
| `docs/internal/facts/README.md` | repo | GAP 4 (`:138-139`) |
| `CONTRIBUTING.md` | repo | ok for 4b; task 10 adds the "how the docs stay true" section (checklist C12) |
| `docs/internal/docs-register.md` | repo | GAP 5 (`:388`) |
| `scripts/checks/check-options.mjs` | repo | GAP 4 (`:370-375`); every other failure names its way out (`:351-389`) |

## Gaps

**GAP 1.** `D/agents/cairn-implementer.md:110-123` ("The facts container"). Step: an engine task's own
gate. The section names `check:facts` only. The gate a dispatch names can omit the docs gate (the
Agent-tool path under six tasks takes the plan's gate string; the `CLAUDE.md` fallback is `check` plus
`npm test`), so an added, renamed, or removed public option surfaces only at `check:close`. Strongest
form: agent definition. Outcome: a task that adds, renames, or removes a member of a public
option-bearing type runs `npm run check:options` beside `check:facts` in the same task, and knows that
`exclude` is only for a path a developer never sets and that a new option is never parked `pending`.
The gate's messages carry the rest; do not restate the map rule.

**GAP 2.** `D/agents/diff-reviewer.md:28-38` (after step 6). Step: the per-task review. The gate's
unmapped-path message names the diff-reviewer as the judge of an `exclude` reason
(`scripts/checks/check-options.mjs:353-354`), and the reviewer's definition gives no criterion.
Strongest form: agent definition, a step conditioned on the diff touching `docs/internal/option-map.json`.
Outcome: the reviewer blocks an `exclude` row whose reason fits a developer-set option (it dodges the
fact), a new fact-id row whose fact does not name the member in backticks with a `Source:` citing the
declaring type's file, and a `pendingCount` rise not paired with a retag of a mapped fact.

**GAP 3.** `D/skills/cairn-pass/SKILL.md:110-112` (close step 5, friction triage). Step: a docs stage
close. The bullet triages the log but omits the S7 close shape (sync spec, "Docs as a design review").
Strongest form: skill. Outcome: when the pass ran the page chain, the fold agent (never the conductor)
reconciles every stage record's `frictionFiled` entry against the log before triage; a promotion to an
engine change reads `docs/internal/engine-rulings.md` and runs the charter's premise test first; the
HISTORY entry counts the entries and their outcomes. Task 10 applies this shape to 2a.

**GAP 4.** `scripts/checks/check-options.mjs:370-375` and `docs/internal/facts/README.md:138-139`. Step:
any retag of a mapped fact after its arm merges (site-docs edits, `site-implementer.md:101-103`; the
release sweep's post-merge filing). The retag message's only way out is `pending <slug>`, which fails
once the arm's outline is deleted at its merge; the README's post-merge rule files a changed claim's fact
`[candidate]`, which retags a mapped fact. No legal green state exists after extend's 2b merge. Strongest
form: tool (the failure message), README aligned. Outcome: before extend's outline is deleted, the gate
names a way out that exists with no committed outline for the page, and the README's post-merge rule
produces that state. Needs a conductor decision on the way out; if deferred, a `// WATCH:` at `:370`
triggered by the 2b merge.

**GAP 5.** `D/agents/cairn-docs-drafter.md:16-17` and `docs/internal/docs-register.md:388`. Step: drafting.
Both say imitate each exemplar's "anatomy and rhythm"; the runner (`docs-page-chain.js:728-736`) and
register `:220` take voice only from the brief and its primary exemplar. The drafter gets conflicting
instructions. Strongest form: agent definition (task 3 left it untouched by scope, not by ruling).
Outcome: the definition and the editor-brief line agree with the voice ruling, or defer to the dispatch.

**GAP 6.** `CLAUDE.md:101-103`, `:126-127` ("Documentation is a pass dimension"). Step: plan authoring and
the conductor's orientation. It names `check:reference`, `check:package`, `check:facts`, never
`check:options` or the map. Strongest form: `CLAUDE.md` is the only home an orientation reader meets.
Outcome: one clause naming `check:options` and its map as the option counterpart of `check:reference`,
no rule text.

**GAP 7.** `docs/internal/docs-maintenance.md:7-26`, `:30-36`, `:38-47`. Stale: the machine table claims
"every `check:*` script that touches docs" and lacks `check:facts`, `check:provenance`,
`check:transcripts`, `check:visuals`, `check:tool-conditions`, `check:target-stack`, `check:editor-quotes`;
the pass layer omits fact and map filing; the drift layer names the monthly routine
(`trig_015UPQostYVisXuExTHTH2vu`) and not the release sweep. Side doc, so the fix is to stop
contradicting. Outcome: the table points at `docs-gate.mjs` or `pass-gate-tiers.md` as the list (or
completes it), and the drift layer names the release sweep and the routine's verified current state
(check with the `schedule` skill before writing).

## Refused

- `cairn-pass` step 5 option map: `check:close` runs `check:options` (`package.json:84`) and each failure names its way out.
- `pass-execute*.js`: they dispatch `cairn-implementer` and the classifier's engine tier carries the docs gate; GAP 1 covers the path they skip.
- `site-pass`, `site-implementer`, `engine-consult`: a site never changes an option; the facts rules already reach them; the one hole is GAP 4, a tool fix.
- `cairn-release`: step 3 carries every Mechanism 2 item and the seed.
- `docs-page-chain.js`: carries rows, retag order, friction, title, voice, and `spent`.
- facts README map-rule prose: the gate message carries it; only GAP 4's rule changes.
- global `CLAUDE.md`, `~/.claude/docs/*`, `register-check`, `cairn-figure`, `cairn-register-editor`, `engine-triage`, `pass-core`: none executes a sync step, and none contradicts one.

## Checklist (task 10 re-runs)

- C1 `grep -n "check:options" ~/.dotfiles/claude/.claude/agents/cairn-implementer.md`: a hit in "The facts container".
- C2 `grep -n "option-map" ~/.dotfiles/claude/.claude/agents/diff-reviewer.md`: a conditional step naming the exclude, fact-row, and pendingCount criteria.
- C3 `grep -n "frictionFiled\|engine-rulings" ~/.dotfiles/claude/.claude/skills/cairn-pass/SKILL.md`: both in step 5.
- C4 Read `scripts/checks/check-options.mjs` retag message and facts README "How this container grows": a way out that holds with no committed outline, or a `// WATCH:` naming the 2b merge.
- C5 `grep -n "rhythm" ~/.dotfiles/claude/.claude/agents/cairn-docs-drafter.md docs/internal/docs-register.md`: no exemplar line that assigns voice or rhythm to a page exemplar.
- C6 `grep -n "check:options" CLAUDE.md`: one hit in "Documentation is a pass dimension".
- C7 `grep -n "check:facts\|release sweep" docs/internal/docs-maintenance.md`: both present, or the table points at the gate's list.
- C8 `grep -n "check:options" scripts/checks/docs-gate.mjs package.json`: in the docs gate and `check:close`.
- C9 `grep -n "check:options" docs/internal/pass-gate-tiers.md`: in the docs-gate component list.
- C10 `grep -n "check:options" ~/.dotfiles/claude/.claude/skills/cairn-release/SKILL.md`: step 3 still present.
- C11 `grep -n "frictionLine\|OPTION_MAP\|spent" ~/.dotfiles/claude/.claude/workflows/docs-page-chain.js`: all present.
- C12 `grep -n "check:options\|check:facts" CONTRIBUTING.md`: the task 10 section names both.
- C13 `grep -rn "No new check is built" docs --include=*.md | grep -v superpowers`: no hit.
- C14 `claude-tooling-sync verify` and `bash ~/.dotfiles/scripts/check.sh`: green.
