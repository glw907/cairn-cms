# Documentation Initiative Phase 6 Design: process and infra

**Status:** approved 2026-06-04, ready to plan.

**Goal.** Make "documentation is a pass dimension" a standing, enforceable rule in the places a future
pass actually reads, so the catch-up the docs initiative completed across Phases 1 through 5 stays true.
This phase changes no in-repo docs arm. It edits the process surfaces that govern every later pass.

**Parent.** This is the sixth and last phase of the documentation initiative
(`docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`), the "Process and infra" phase. The
initiative absorbed the rule statement in its "Docs as a pass dimension" section; this phase implements it.

## Why now

Phases 1 through 5 brought the docs current with the engine. That currency decays the moment a pass ships
an API change without touching its reference page. The rule has to live where a pass reads it, in the
`cairn-pass` ritual and in `CLAUDE.md`, so it survives both a skill bypass and a cold session.

## What this phase delivers

Four edits across two repositories. The `cairn-cms` repo holds `CLAUDE.md`. The dotfiles repo
(`~/.dotfiles/claude/.claude/skills/`, stowed to `~/.claude/skills/`) holds the two skill files.

### 1. `cairn-pass` pass-end ritual: a Documentation step

A new step in the pass-end consolidation ritual, beside the existing simplify, check, test, and review
gate. It states:

- Update the relevant `docs/` arm for whatever the pass changed: the reference page for a public-API
  change, and the guides, explanation, or tutorial as the change touches them. Update `CHANGELOG.md` and
  `docs/upgrading.md` for any breaking change, which folds in beside the existing "Consumers must:"
  changelog convention.
- A public-API change is not done until its reference page matches. The enforcement runs
  `npm run check:reference` (the export-coverage gate that enumerates each subpath's real exports from the
  built `.d.ts` and fails on an undocumented name) and `npm run check:package`. This turns the spec's
  manual "reference must match" into the automated gate the repo already ships.
- Append any design friction the writing surfaced to `docs/internal/docs-friction-log.md`, with its
  perspective (developer or editor) and a short note. Triage candidates into ROADMAP (Now or Next) and the
  STATUS carry-forwards. There is no separate backlog file.
- A docs-only pass still does the arm update and the friction step. It skips the engine check and test, as
  the ritual already allows.

### 2. `cairn-cms/CLAUDE.md`: a "Documentation is a pass dimension" section

A short durable section stating the rule and pointing at the `docs/` Diátaxis structure (reference,
guides, explanation, tutorial), the friction log, and STATUS. It names the automated gates
(`check:reference`, `check:package`). CLAUDE.md loads every session, so the rule survives a skill bypass.

### 3. `site-pass`: one docs-currency line

The `site-pass` pass-end already updates architecture and STATUS. Add a single line to keep the site's own
docs current for what the pass changed. No rebuild, per the initiative's out-of-scope.

### 4. Memory: verify, light touch

The `docs-is-a-pass-dimension` feedback memory already exists and states the rule plus the
two-production-site caution stance. Confirm it matches the final wording and adjust only if this phase
sharpens anything. No new memory is expected.

## Spec reconciliation

The initiative spec's "Findings ... triaged into the ROADMAP and the backlog" line is corrected to ROADMAP
and STATUS, so the spec and the codified rule agree that this repo keeps no separate backlog file.

## Execution and gate

Executed inline, no context clear and no subagents. The phase spans two repos and edits process documents
rather than test-first code, so the `cairn-implementer` agent (scoped to cairn-cms) does not fit. The
`CLAUDE.md` and spec and STATUS edits commit in cairn-cms; the two skill edits commit in the dotfiles repo.

The gate is the docs gate, scaled to process files:

- `prose-guard` shows no blocking tell on every authored file (`CLAUDE.md`, the spec, the two skill files).
- The relative links in the new `CLAUDE.md` section resolve.
- The edited `cairn-pass` ritual reads coherently end to end on a read-back, with the new step numbered and
  placed correctly.

No engine `npm run check` or `npm test` (no engine code changes), no review subagent, and no `/admin`
smoke apply.

## Out of scope

A hosted docs site, a CONTRIBUTING set, generated API docs, and any heavier `site-pass` change beyond the
one docs-currency line, all consistent with the initiative's out-of-scope. Introducing a `BACKLOG.md` is
out of scope; the codified triage home is ROADMAP and STATUS.

## Acceptance

The `cairn-pass` ritual carries the Documentation step, `CLAUDE.md` carries the pass-dimension section,
`site-pass` carries the docs-currency line, the memory matches, the initiative spec's backlog wording is
reconciled, and every authored file clears the docs gate. With this phase landed, the documentation
initiative is complete, and P4 (the scaffolder) is the next engine work.
