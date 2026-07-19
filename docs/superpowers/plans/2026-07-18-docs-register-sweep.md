# Docs-Register Sweep Implementation Plan

> **For agentic workers:** execute task-by-task in the main session per the repo's
> plan-execution rules (orchestrate-and-verify; `cairn-implementer` for well-specified
> application work; main-loop prose only where the task says so). Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Every published docs page reads like documentation to the ratified register
standard, the standard itself is banked as a durable artifact, and the pass closes with a
release per Geoff's direction.

**Architecture:** Bank the standard first, fix the two front-door READMEs in the main loop
as calibration exemplars, then run a find-then-verify workflow over the remaining pages
(Sonnet graders, Opus refute-biased verifiers, an Opus recall spot-check), triage survivors
in the main loop, and dispatch mechanical application to `cairn-implementer`.

**Spec:** `docs/superpowers/specs/2026-07-18-docs-register-standard-design.md` (the register
standard, the calibration specimens, the sweep shape, and Geoff's seven brainstorm rulings).

## Global constraints

- Docs-only pass: no engine code changes; skip engine tests; the doc gates are the gate.
- The spec's register standard governs every edit. The five killed specimens never reappear;
  why-cairn's ratified prose is not churned (over-firing on ratified good prose is a defect).
- Product vocabulary stays: concept, adapter, render, seam, island, holding branch, manifest,
  role/capability.
- No em dashes introduced anywhere; no em-dash rhythm (restructure, never swap the glyph).
- Workflow authorization: explicit (Geoff, 2026-07-18, "Use a workflow"). Runaway guard is
  mandatory at workflow launch per the standing rule.
- Scope: the 62 published docs pages plus the root `README.md`. Nothing under `internal/`,
  `superpowers/`, or the repo policy files (ROADMAP, CHANGELOG, SECURITY).
- Work rides a feature worktree off `main` so `main` stays releasable until Geoff's read
  gate passes.

---

### Task 0: Worktree

**Files:** none (setup).

- [ ] Verify no live executor holds the repo (`git status` clean beyond this plan's commits;
  no warm changes not ours).
- [ ] `git worktree add ../cairn-cms-docs-register -b docs-register-sweep` from the main
  checkout; all subsequent edits target the worktree path.

### Task 1: Bank the register standard

**Files:**
- Create: `docs/internal/docs-register.md`
- Modify: `CLAUDE.md` (Authoring section, one pointer sentence)
- Modify: `docs/internal/README.md` (index line, if the index enumerates)

Main-loop authorship (the standard is the pass's taste artifact). Content: the universal
contract (including the no-pitch-but-impressive keystone), the four arm registers, the
front-door register (persona, legibility floor, editor arrival path, content anchor, stack
reasoning, extension-examples rule), and the calibration specimens, all transcribed from the
spec. Audience: agent-facing maintainer doc, same genre as `admin-design-system.md`.

- [ ] Write `docs/internal/docs-register.md` from the spec.
- [ ] Add the CLAUDE.md pointer and the internal index line.
- [ ] `npm run check:docs` passes (no dead links).
- [ ] Commit.

**Acceptance:** a grader agent handed only this doc and a page can grade the page; every
spec ruling appears; no spec-only knowledge is needed.

### Task 2: Fix the front door (calibration exemplar)

**Files:**
- Modify: `docs/README.md`
- Modify: `README.md` (root; audit against the same front-door register, fix what fails)

Main-loop authorship. Known kills in `docs/README.md`: the "whole organization works in one
place... one admin and one sign-in" sentence rewritten true and unpuffed ("admin" may stay);
"The four arms" becomes a plain heading; the "Eight words the docs use precisely" line is
cut (the list survives); the closing triad is restructured. The rewrite writes to the
front-door register: the seasoned-developer persona, the content anchor (dual identity, the
editor-first thesis, the UI toolkit for coherent admin extensions), types-of-functionality
extension examples (never naming ASC), short-form stack reasoning, the editor arrival path
prominent and early.

- [ ] Redraft `docs/README.md` to the front-door register.
- [ ] Audit and fix the root `README.md` against the same register.
- [ ] Run `cairn-register-editor` on both drafts; fold findings.
- [ ] `npm run check:docs` passes.
- [ ] Commit. The fixed `docs/README.md` becomes the third calibration exemplar the sweep
  graders receive.

**Acceptance:** all four known kills are gone; the register-editor findings are folded; an
editor landing on the page finds "Welcome, editors" without hunting.

### Task 3: The sweep workflow

**Files:** none in-repo (workflow outputs land in the session scratchpad; findings are data
for Task 4).

Scope list: the 61 published pages not already fixed in Task 2 (the 62 minus
`docs/README.md`), passed as `args`. Stage 1: one grader per page (Sonnet, `effort: high`),
fed the page text, its arm's register section, and the three calibration poles; structured
findings (quote, location, violated rule, proposed rewrite, severity). Stage 2 (pipeline, no
barrier): each finding gets a refute-biased adversarial verify (Opus) whose default verdict
is refuted. Stage 3: the recall spot-check, one Opus grader over ~8 pages sampled across the
four arms; compare against the Sonnet findings for those pages.

- [ ] Author and launch the workflow with the runaway guard armed (background Bash polling
  the transcript dir per the `workflow-agent-runaway-guard` memory).
- [ ] On completion, evaluate the spot-check: if it surfaced material misses, upshift
  graders to Opus and rerun (resume from the run id; verified findings replay from cache).
- [ ] Save the verified findings to the scratchpad as the Task 4 input.

**Acceptance:** every in-scope page graded; every surviving finding carries quote, rule, and
proposed rewrite; the spot-check verdict is recorded either way.

### Task 4: Triage and apply

**Files:** the in-scope docs pages the surviving findings touch.

- [ ] Main-loop triage: approve, amend, or kill each surviving finding (the taste seat;
  reject anything that churns ratified-good prose or merely paraphrases).
- [ ] Batch approved rewrites per page; dispatch application to `cairn-implementer`
  (mechanical: apply exactly the approved rewrites, no freelancing; `effort: low`).
- [ ] Review each implementer diff against the approved batch before the next dispatch.
- [ ] Commit per coherent batch (by docs arm).

**Acceptance:** every applied edit traces to an approved finding; no unapproved prose drift
in the diffs.

### Task 5: Gates

- [ ] `npm run check:docs` (links and anchors).
- [ ] `npm run check:reference` and `npm run check:reference:signatures` (prose edits must
  not have broken the reference contract).
- [ ] `npm run check:package`.
- [ ] Vale over the changed arms (error tier blocks; advisory rides).

**Acceptance:** all four gates exit 0; no Vale errors on changed files.

### Task 6: Geoff's read gate

- [ ] Present, in one sitting: the full `docs/README.md` and root `README.md` diffs, plus a
  before/after digest of the highest-impact rewrites elsewhere (grouped by arm, quota not
  fixed; pick what a taste read needs).
- [ ] Fold his corrections; re-run Task 5 gates if anything changed.

**Acceptance:** Geoff approves the diffs for merge.

### Task 7: Close and release

- [ ] Merge `docs-register-sweep` to `main`; remove the worktree.
- [ ] `CHANGELOG.md` under `## Unreleased`: docs-register sweep entry (no consumer action;
  say so).
- [ ] Append the post-mortem to this plan file.
- [ ] Update `docs/STATUS.md`: sweep shipped; next = docs-on-site with TOCs (Topo start),
  then the scaffolder.
- [ ] Refresh memory: the docs-register standard is banked (pointer memory linking the
  standard doc and the front-door audience ruling); update `cairn-pub-front-page-voice`'s
  sweep-specimen paragraph to note the sweep landed.
- [ ] Release: invoke the `cairn-release` skill (Geoff directed proceeding to the release,
  2026-07-18). Derive the number at the cut from what the whole Unreleased window holds;
  verify the number is free via `npm view @glw907/cairn-cms versions --json`.

**Acceptance:** main carries the sweep; STATUS and memory point forward; the release is cut
and verified per the skill.
