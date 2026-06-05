# Documentation Initiative Phase 6 Implementation Plan: process and infra

> **For agentic workers:** This plan is executed inline this session (the user's call), not subagent-driven, because it spans two repositories and edits process documents rather than test-first code. The `cairn-implementer` agent is cairn-cms-scoped and does not fit. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** make "documentation is a pass dimension" a standing, enforceable rule in the `cairn-pass` ritual, `CLAUDE.md`, and `site-pass`, so the docs currency that Phases 1 through 5 established stays true.

**Architecture:** four edits across two repos. The cairn-cms repo holds `CLAUDE.md`, the initiative spec, and STATUS. The dotfiles repo (`~/.dotfiles/claude/.claude/skills/`, stowed live to `~/.claude/skills/`) holds the `cairn-pass` and `site-pass` skill files. Editing the dotfiles source updates the live symlink, so no `stow -R` is needed for an existing file. Skill edits commit in the dotfiles repo; the rest commit in cairn-cms.

**Tech Stack:** Markdown, `prose-guard` (the writing-voice gate), `git` (two repos).

**Design spec:** `docs/superpowers/specs/2026-06-04-cairn-docs-phase-6-process-design.md`.

---

## Conventions for this plan

**The gate is the docs gate, scaled to process files.** No engine `npm run check` or `npm test` (no engine code changes), no review subagent, no `/admin` smoke. Each task verifies with: `prose-guard <file>` shows no blocking tell, any relative links resolve, and the edited file reads coherently on a read-back.

**prose-guard is tiered.** The blocking hook checks em dashes, banned phrases and openers, and structural patterns. Advisory lines (passive, tricolon, burstiness, anaphora) are sweep-only and non-blocking; the CLI exits 1 on them anyway, so judge the gate by the absence of a *blocking* tell. Draft clean on the first pass.

**Prose.** Writing-voice standard. No em dashes; one idea per sentence; no "not X but Y" frame, no reflexive three-item lists, no setup-colon payoff, no participial or connector openers. Vary sentence length.

**Two repos.** Skill files: `~/.dotfiles/claude/.claude/skills/cairn-pass/SKILL.md` and `.../site-pass/SKILL.md`, committed in `~/.dotfiles`. In-repo files: `CLAUDE.md`, the spec, STATUS, committed in `~/Projects/cairn-cms`.

---

### Task 1: Add the Documentation step to the cairn-pass pass-end ritual

**Files:** Modify `~/.dotfiles/claude/.claude/skills/cairn-pass/SKILL.md` (the "Ending a plan: consolidation ritual" section, currently steps 1 through 8).

The ritual today is: 1 Simplify, 2 Check and test, 3 Review gate, 4 Live admin smoke, 5 Update tracking, 6 Commit, 7 Draft the next plan, 8 Hand off. Insert a new **step 5, Documentation**, after step 4 (Live admin smoke) and before the current step 5 (Update tracking), then renumber the current steps 5 through 8 to 6 through 9.

- [ ] **Step 1: Insert the new step 5 and renumber**

Insert this block immediately before the current `### 5. Update tracking` heading:

```markdown
### 5. Documentation

Documentation is a pass dimension, not a follow-up. Before the pass is done, update the docs for
whatever it changed.

- Update the relevant `docs/` arm: the reference page for any public-API change, and the guides,
  explanation, or tutorial as the change touches them. Update `CHANGELOG.md` and `docs/upgrading.md`
  for any breaking change, which is where the "Consumers must:" convention below applies.
- A public-API change is not done until its reference page matches. Enforce it by running
  `npm run check:reference` (the export-coverage gate fails on an undocumented export) and
  `npm run check:package`. Both must pass.
- Append any design friction the writing surfaced to `docs/internal/docs-friction-log.md`, one entry
  per finding with its perspective (developer or editor) and a short note. Triage candidates into
  `ROADMAP.md` (Now or Next) and the STATUS carry-forwards. This repo keeps no separate backlog file.

A docs-only pass skips the engine check and test (step 2) but still does this step. See the
`docs-is-a-pass-dimension` memory.

```

Then renumber the four following headings: `### 5. Update tracking` becomes `### 6. Update tracking`, `### 6. Commit` becomes `### 7. Commit`, `### 7. Draft the next plan (while context is warm)` becomes `### 8. Draft the next plan (while context is warm)`, and `### 8. Hand off for a fresh-session execution` becomes `### 9. Hand off for a fresh-session execution`.

- [ ] **Step 2: Fix any internal step-number references**

Run from `~/.dotfiles/claude/.claude/skills/cairn-pass/`:

```bash
grep -nE 'step [0-9]|\(step|steps [0-9]' SKILL.md
```

Check each hit. The new step renumbered Update tracking, Commit, Draft, and Hand off; update any cross-reference that names the old number (for example, a "simplify first (step 1), commit" line in the Commit step stays correct, but a reference to "step 5" meaning tracking must become "step 6"). Leave references to step 1 and step 2 unchanged.

- [ ] **Step 3: Verify**

```bash
prose-guard ~/.dotfiles/claude/.claude/skills/cairn-pass/SKILL.md
grep -nE '^### [0-9]' ~/.dotfiles/claude/.claude/skills/cairn-pass/SKILL.md
```

Expected: no blocking tell, and the step headings read 1 through 9 in order with no duplicate or gap. Read the new step 5 and the renumbered steps 6 through 9 back to confirm coherence.

- [ ] **Step 4: Commit in the dotfiles repo**

```bash
git -C ~/.dotfiles add claude/.claude/skills/cairn-pass/SKILL.md
git -C ~/.dotfiles commit -m "cairn-pass: add the Documentation pass-end step

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Add the "Documentation is a pass dimension" section to cairn-cms/CLAUDE.md

**Files:** Modify `~/Projects/cairn-cms/CLAUDE.md`.

This section states the rule durably so it survives a skill bypass, since `CLAUDE.md` loads every session.

- [ ] **Step 1: Read CLAUDE.md to pick the insertion point**

Read `CLAUDE.md`. Insert the new section after the "How to run this project" material and its subsections (including "Tooling for the rebuild"), and before the "Durable gotcha (Cloudflare email)" section, so it sits with the project-process orientation rather than the credential and gotcha matter. If that ordering does not fit the file as it reads, place it as a top-level `##` section adjacent to the run-this-project guidance.

- [ ] **Step 2: Insert the section**

```markdown
## Documentation is a pass dimension

Documentation is a standing dimension of every cairn-cms pass, not a separate project. A pass updates
the relevant `docs/` arm for whatever it changed, and a public-API change is not done until its
reference page matches. The `cairn-pass` pass-end ritual carries this step, and two automated gates
back it: `npm run check:reference` fails on an undocumented export, and `npm run check:package` checks
the entry points.

The public docs follow a Diátaxis structure under `docs/`: [`reference/`](docs/reference/README.md)
(one page per export subpath), [`guides/`](docs/guides/README.md) (task how-tos),
[`explanation/`](docs/explanation/README.md) (the why), and
[`tutorial/`](docs/tutorial/build-your-first-cairn-site.md) (the first-site build).
[`docs/internal/docs-friction-log.md`](docs/internal/docs-friction-log.md) collects the design
friction that writing a doc surfaces, from the developer and editor perspectives, triaged into
[`ROADMAP.md`](ROADMAP.md) and [`docs/STATUS.md`](docs/STATUS.md). This repo keeps no separate backlog
file.

Two production sites depend on the package, so a stale doc costs real users. Treat the docs update as
part of the work, not a chore after it. See the `docs-is-a-pass-dimension` memory.
```

- [ ] **Step 3: Verify**

```bash
prose-guard CLAUDE.md
# link check on the new section's relative targets
for t in docs/reference/README.md docs/guides/README.md docs/explanation/README.md docs/tutorial/build-your-first-cairn-site.md docs/internal/docs-friction-log.md ROADMAP.md docs/STATUS.md; do [ -e "$t" ] || echo "DANGLING: $t"; done
echo "(no DANGLING line means every link resolves)"
```

Expected: no blocking tell, no `DANGLING` line.

- [ ] **Step 4: Commit in cairn-cms**

```bash
git add CLAUDE.md
git commit -m "Document that docs are a pass dimension in CLAUDE.md

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Add the docs-currency line to site-pass

**Files:** Modify `~/.dotfiles/claude/.claude/skills/site-pass/SKILL.md` (the "### 3. Update docs/architecture.md" step in the consolidation ritual).

The `site-pass` pass-end already updates architecture and STATUS. Add one line so a site keeps its own docs current, the light version of the library rule.

- [ ] **Step 1: Read the step and append the line**

Read the `### 3. Update docs/architecture.md` step. Append this line at the end of that step's body:

```markdown
Also keep the site's own docs current for whatever the pass changed (a README note, a config comment,
or an architecture entry). The cairn-cms library carries the full docs-as-a-pass-dimension rule; for a
site this is the light version.
```

- [ ] **Step 2: Verify**

```bash
prose-guard ~/.dotfiles/claude/.claude/skills/site-pass/SKILL.md
```

Expected: no blocking tell. Read the step back to confirm the line fits.

- [ ] **Step 3: Commit in the dotfiles repo**

```bash
git -C ~/.dotfiles add claude/.claude/skills/site-pass/SKILL.md
git -C ~/.dotfiles commit -m "site-pass: keep the site's own docs current at pass-end

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Reconcile the initiative spec and verify the memory

**Files:** Modify `~/Projects/cairn-cms/docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md`. Read `~/.claude/projects/-home-glw907-Projects-cairn-cms/memory/docs-is-a-pass-dimension.md`.

- [ ] **Step 1: Reconcile the backlog wording in the initiative spec**

In the initiative spec, find the line in the friction-log paragraph that reads approximately "Triage feeds the ROADMAP and the backlog" (around the "Docs as a pass dimension" section). Change it so it names ROADMAP and STATUS and states this repo keeps no separate backlog file. Keep the surrounding sentence intact. Make the equivalent edit if the wording differs.

- [ ] **Step 2: Verify the docs-is-a-pass-dimension memory matches**

Read the memory. It already states the rule, the friction-capture-from-two-perspectives practice, and the two-production-site caution stance. Confirm it now reads true against the landed Phase 6 (the rule lives in the cairn-pass ritual and CLAUDE.md). If it says Phase 6 "does this" in the future tense, update that one phrase to past tense; otherwise leave it. No new memory is created.

- [ ] **Step 3: Verify**

```bash
prose-guard docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md
grep -n -i backlog docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md
```

Expected: no blocking tell, and the remaining `backlog` mentions read consistently (the out-of-scope or no-backlog statements, not a triage target that contradicts the codified rule).

- [ ] **Step 4: Commit in cairn-cms**

```bash
git add docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md
git commit -m "Reconcile the docs-initiative spec triage target to ROADMAP and STATUS

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If the memory needed a tense fix, that file is outside the repo and is saved directly, not committed here.)

---

### Task 5: Phase-end and initiative close

**Files:** Modify `~/Projects/cairn-cms/docs/STATUS.md` and append the post-mortem to this plan. Refresh the `cairn-docs-initiative` memory.

- [ ] **Step 1: Run the full Phase 6 gate**

```bash
for f in ~/.dotfiles/claude/.claude/skills/cairn-pass/SKILL.md ~/.dotfiles/claude/.claude/skills/site-pass/SKILL.md CLAUDE.md docs/superpowers/specs/2026-06-04-cairn-docs-initiative-design.md; do
  prose-guard "$f" 2>&1 | grep -iE 'em.dash|banned|structural|marketing' | grep -viE 'anaphora|tricolon|burstiness|passive|soft' && echo "  ^^blocking in $f"
done
echo "(no ^^blocking line means the gate is clean)"
```

Expected: no blocking tell on any authored file.

- [ ] **Step 2: Update STATUS.md**

Set the immediate next action to **P4, the create-cairn-site scaffolder** (the documentation initiative is now complete, all six phases landed). Add a short Phase 6 landed paragraph naming the four edits and the two repos, and state the initiative is complete. Keep the existing P4 queued-capstone section as the now-current next action.

- [ ] **Step 3: Append the post-mortem to this plan**

Record what was built (the four edits across two repos), what was verified (the docs gate, the renumbered ritual reads 1 through 9, the links resolve), the decision locked in (ROADMAP and STATUS as the triage home, no backlog), and that the documentation initiative is complete.

- [ ] **Step 4: Refresh the cairn-docs-initiative memory**

Update the `cairn-docs-initiative` memory description and body to record Phase 6 landed and the initiative complete, with P4 (the scaffolder) as the next engine work. Update the MEMORY.md index hook line if it names a phase.

- [ ] **Step 5: Commit and confirm clean**

```bash
git add docs/STATUS.md docs/superpowers/plans/2026-06-04-cairn-docs-phase-6-process.md
git commit -m "Record docs Phase 6 landed; initiative complete, point STATUS at P4

Co-Authored-By: Claude <noreply@anthropic.com>"
git status --short
git -C ~/.dotfiles status --short
```

Expected: both trees clean of the files this phase touched.

---

## Task ordering

Sequence: **1, 2, 3, 4, 5.** Tasks 1 through 4 are independent edits and could go in any order; this order moves from the central rule (the cairn-pass ritual) outward to CLAUDE.md, site-pass, and the spec reconciliation. Task 5 closes the phase and the initiative after the four edits land.

## Phase-end ritual

After all tasks commit, before declaring the phase done:

- [ ] `prose-guard` clean (no blocking tell) on the two skill files, `CLAUDE.md`, and the initiative spec.
- [ ] The cairn-pass ritual headings read 1 through 9 in order, the new step 5 is Documentation, and no internal step-number reference is stale.
- [ ] The CLAUDE.md section's relative links all resolve.
- [ ] STATUS.md records Phase 6 landed and names P4 as the next action; the documentation initiative is marked complete.
- [ ] The `cairn-docs-initiative` and `docs-is-a-pass-dimension` memories read true against the landed phase.
- [ ] Both git trees (cairn-cms and dotfiles) are clean.

## Self-review notes (already applied)

- The plan covers all four spec deliverables (the cairn-pass step, the CLAUDE.md section, the site-pass line, the memory verify) plus the spec reconciliation, one task each, with Task 5 closing the initiative.
- Execution is inline per the user's call, since the phase spans cairn-cms and the dotfiles repo and edits process docs rather than test-first code; the `cairn-implementer` agent does not fit.
- The triage home is ROADMAP and STATUS with no backlog, consistent across the cairn-pass step, the CLAUDE.md section, and the spec reconciliation, matching the user's decision.
- The cairn-pass step leans on the existing `check:reference` and `check:package` automated gates for the public-API-matches-reference rule, rather than a manual eyeball.
- The gate is the docs gate scaled to process files (prose-guard, link check, read-back); no engine check/test, review subagent, or `/admin` smoke, since no engine code changes.
