# prose-guard Cleanup (Pass 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to work through this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** With `prose-guard` built and wired (Pass 1), clean the AI-writing tells out of the existing prose across the workspace — release surface first (unblocks cairn-cms ≥0.5.0), then the full workspace — then clear the writing-cleanup gate in PLAN.md.

**Architecture:** This is a guided cleanup, not new code. Each task sweeps an area with `prose-guard`, fixes every reported tell by hand, re-sweeps to confirm clean, and commits in that area's repo. The global PreToolUse hook (wired in Pass 1) guards every fix-edit, so re-introducing a tell is blocked at write time — the safety net.

**Tech Stack:** `prose-guard` (`~/.local/bin/prose-guard`), git, the go-conventions skill (for any Go comments).

**Prerequisite:** Pass 1 complete (`2026-05-26-prose-guard-infrastructure.md`) — tool built, stowed, hooks wired global + cairn workspace, ecnordic's guard retired, Claude-infra prose cleaned. **Run this in a fresh session** (the hook takes effect at session start).

**Spec:** `cairn-cms/docs/superpowers/specs/2026-05-26-prose-guard-design.md`

---

## Remediation rules (apply in every task)

The guard reports; you edit with judgment. For each reported tell:

- **em-dash appendage** → replace the dash with a period, comma, or colon, or fold the fragment into the sentence.
- **em-dash spray** → keep at most one interruption (a pair) per line; rewrite the rest as separate sentences.
- **banned opener** → delete the connector and start with the subject.
- **banned phrase / word** → reword in a plain voice. In `docs` tier, judgment words (`robust`, `comprehensive`, …) are already allowed; only `general`-tier (marketing content) gets the full word-list.
- **code comments** → after removing the tell, the comment must still follow its **stack's conventions**: invoke the **go-conventions** skill for `.go` files (identifier-led doc comments, the human-voice catalogue); match the surrounding file's idiom for `.ts`/`.svelte`. The guard removes tells; the stack convention governs form. Satisfy both.

Never weaken meaning to dodge the guard. If a flagged line is a true false positive (rare — e.g. a proper noun), leave it and note it; do not contort the prose.

---

## Task 1: Phase 1 — release surface (cairn-cms)

Unblocks the held ≥0.5.0 release: cairn-cms docs, the extracted `render/*` comments, and the Pass ROBUST code comments.

**Files:** `cairn-cms/docs/**/*.md`, `cairn-cms/**/*.ts` (notably `render/*`, the commit/robustness modules).

- [ ] **Step 1: Sweep cairn-cms docs**

Run:
```bash
cd ~/Projects/cairn/cairn-cms && prose-guard docs/**/*.md docs/*.md *.md 2>/dev/null; echo "exit=$?"
```
Expected: a grouped report (exit 1) or clean (exit 0). Note: exclude `docs/superpowers/specs` and `docs/superpowers/plans` if they contain intentional tell-fixtures (the prose-guard spec/plans quote banned tokens as examples — those live in fenced blocks and won't be flagged, but review any hit).

- [ ] **Step 2: Fix the doc hits**

Apply the remediation rules to every reported line in the cairn-cms `.md` files (PLAN.md, ARCHITECTURE.md, ARCHITECTURE-CRITIQUE.md, FORWARD-COMPAT.md, creating-a-cairn-site.md, README, etc.). Re-run Step 1 until `exit=0`.

- [ ] **Step 3: Sweep cairn-cms code comments**

Run:
```bash
cd ~/Projects/cairn/cairn-cms && prose-guard $(git ls-files '*.ts' '*.js' '*.svelte'); echo "exit=$?"
```
Expected: report or clean. These are the `comments` tier (Pygments extracts only comment text).

- [ ] **Step 4: Fix the comment hits (stack idiom preserved)**

Fix each flagged comment per the remediation rules, keeping TS/Svelte comment idiom. Re-run Step 3 until `exit=0`.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/cairn/cairn-cms
git add -p docs *.ts render 2>/dev/null
git commit -m "Clean AI-writing tells from cairn-cms docs and comments"
```
(Stage the specific files you edited; avoid `git add -A`.)

---

## Task 2: Phase 2 — ecnordic-ski

**Files:** `ecnordic-ski/{docs,README,*.md}` (`docs` tier), `ecnordic-ski/src/content/**/*.md` (`general` tier — the marketing voice the retired hook used to guard), `ecnordic-ski` code comments (`.ts`/`.svelte`).

- [ ] **Step 1: Sweep docs + content + comments**

Run:
```bash
cd ~/Projects/cairn/ecnordic-ski
prose-guard $(git ls-files '*.md' '*.ts' '*.svelte' '*.js'); echo "exit=$?"
```
Expected: report. Content under `src/content/**` is scanned at the strict `general` tier; other `.md` at `docs`; code comments at `comments`.

- [ ] **Step 2: Fix the hits**

Apply the remediation rules. The `src/content/**` marketing files get the full treatment (the old `content-guide.md` standard). Re-run Step 1 until `exit=0`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/cairn/ecnordic-ski
git add -p src/content docs *.md src 2>/dev/null
git commit -m "Clean AI-writing tells from docs, content, and comments"
```

---

## Task 3: Phase 2 — 907-life

**Files:** `907-life/{docs,README,*.md}`, `907-life/src/content/**/*.md`, `907-life` code comments.

- [ ] **Step 1: Sweep**

Run:
```bash
cd ~/Projects/cairn/907-life
prose-guard $(git ls-files '*.md' '*.ts' '*.svelte' '*.js'); echo "exit=$?"
```

- [ ] **Step 2: Fix the hits**

Apply the remediation rules (same tiering as ecnordic). Re-run until `exit=0`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/cairn/907-life
git add -p src/content docs *.md src 2>/dev/null
git commit -m "Clean AI-writing tells from docs, content, and comments"
```

---

## Task 4: Confirm the whole workspace is clean

- [ ] **Step 1: Full `--all` sweep per repo**

Run:
```bash
for d in cairn-cms ecnordic-ski 907-life; do
  echo "== $d =="; (cd ~/Projects/cairn/$d && prose-guard --all >/tmp/pg-$d.txt 2>&1; echo "exit=$?"); 
done
cat /tmp/pg-*.txt
```
Expected: each `exit=0` (clean). Investigate any remaining hit: fix it, or confirm it's a documented false positive (e.g. the prose-guard spec/plan fixtures, which are inside fenced blocks and should not be flagged).

- [ ] **Step 2: Re-run the tool's own test suite (sanity)**

Run: `cd ~/.dotfiles && python3 -m pytest tests/test_prose_guard.py -q`
Expected: PASS — confirms no accidental tool change during cleanup.

---

## Task 5: Clear the gate and unblock the release

**Files:** `cairn-cms/docs/PLAN.md`, memory.

- [ ] **Step 1: Update PLAN.md**

In `cairn-cms/docs/PLAN.md`: append a progress-log entry recording Pass 2 done (release surface + full workspace cleaned, both phases). Update the "Release sequencing" note — the writing-cleanup gate is **cleared**; the held ≥0.5.0 bundle (render-engine extraction + Pass ROBUST + AUTH decommission) may now publish.

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/cairn/cairn-cms && git add docs/PLAN.md
git commit -m "PLAN: writing-cleanup gate cleared; ≥0.5.0 release unblocked"
```

- [ ] **Step 3: Update memory**

Update `~/.claude/projects/-home-glw907-Projects-cairn/memory/cairn-ai-tell-guard-pass.md` to "done" — `prose-guard` built/wired (Pass 1) and the workspace cleaned (Pass 2). Note the next action is the held ≥0.5.0 release.

- [ ] **Step 4: Hand off**

Report completion: the writing-cleanup initiative is finished and the ≥0.5.0 release is unblocked. Do not push or publish unless asked (per workstation git conventions).

---

## Self-review

- **Spec coverage:** Phase 1 release surface (Task 1) ✓; Phase 2 full workspace — ecnordic (Task 2) + 907 (Task 3) ✓; Claude-infrastructure cleanup was done in Pass 1 (not repeated here) ✓; general/docs/comments tiering exercised by path (Tasks 1–3) ✓; stack comment conventions honored in remediation rules ✓; gate-clear + release unblock (Task 5) ✓.
- **Placeholders:** none — remediation rules are explicit and every step has a concrete command.
- **Consistency:** tier names and `prose-guard` invocations match Pass 1 and the spec; per-repo commits follow the workstation "specific files, not `git add -A`" rule.
