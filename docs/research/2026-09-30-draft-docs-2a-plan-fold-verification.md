# Stage 2a plan fold: verification read

**Target:** `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` at `3eaa8bf9` (483 lines),
against its fold record `2026-09-30-draft-docs-2a-plan-fold.md`, the three reviews (PC, PM, PR),
the sync spec `2026-09-30-docs-code-sync-design.md`, `pass-core`, and the runner
`~/.claude/workflows/docs-page-chain.js` (a symlink into `~/.dotfiles`, byte-identical).
Fresh reader; no part in the reviews or the fold.

**Counts:** 0 blockers, 4 majors, 9 minors.

## 1. Did each major close at the cited location?

| Id | Verdict | Plan line | Note |
| --- | --- | --- | --- |
| PC-1 | partial | :136-142, :287, :294-295 | Field added; the unit cannot be proven where the plan says, and the fallback collides with the counting rule (FV-1). |
| PC-2 | closed | :103-109, :147, :375 | Post-run implementer commit after tasks 6 and 8. Task 7's own fold commit has no gate (FV-4). |
| PC-3 | closed | :104-109, :453 | Stage record committed; tasks 7, 9, 10 read it. |
| PC-4 | closed, adapted | :290-295, :374 | Discriminating check moved to task 6; its baseline count has no named producer (FV-10). |
| PC-5 | closed | :113-116 | Dispatch named; tasks 7 and 9 acceptance do not check the verdicts (FV-11). |
| PM-1 | closed | :221-228, :247-251 | Keying and unwraps stated; three unwraps lack a fixture (FV-9). |
| PM-2 | closed | :219-221, :242-244 | |
| PM-3 | closed | :231-233 | |
| PM-4 | closed | :275-277, :371-372 | |
| PM-5 | closed | :160-166 | Both orders hold every intermediate state green against the gate's rules at :236-241 (checked by hand). |
| PM-6 | closed | :263-273 | |
| PM-7 | closed | :260-261 | |
| PM-8 | closed | :89-92 | |
| PM-9 | closed | :165-166, :271 | |
| PR-1 | closed | :221-228, :247-251 | |
| PR-2 | closed | :347-348, :427-429, :449-450 | Tasks 5 and 9 now agree. |
| PR-3 | closed | :75-84, :99-100, :363-364, :410-411 | |
| PR-4 | closed | :285-286, :292 | |
| PR-5 | partial | :136-142, :381-386, :389-390 | Same root as PC-1 (FV-1); the `factIds` scaling and qualifying count closed. |
| PR-6 | closed | :417-419, :430 | `<base>` unnamed (FV-6). |

## 2 to 6. Findings

### FV-1 (major): the cost unit cannot be proven in task 3, and the fallback double-counts under the counting rule

**Location:** plan :136-142 (counting rule), :287 and :294-295 (task 3).

**Defect.** Three parts, all from memory rather than proof.

- The dry run cannot prove the unit. The harness runs the runner body as
  `new AsyncFunction("args", "agent", "parallel", "log", "phase", runnerBody)`
  (`~/.dotfiles/tests/docs-page-chain-outline.test.mjs:115`); there is no `budget` global. Task 3
  must add a stub, and a stub returns whatever the test says. "Its unit recorded in the task
  report" (:294-295) can only restate the runtime doc, which PC-1 already quoted: `budget.spent()`
  is "output tokens spent this turn across the main loop and all workflows". That is not the
  shares' total tokens, so the fallback is the expected path, not the exception.
- "As `pass-execute.js` returns it" (:138) is not a delta: `pass-execute.js:722` returns the raw
  `budget.spent()`. A delta needs a start reading the plan does not name.
- The fallback contradicts the counting rule. The rule sums `/cost`, each Agent usage block, and
  each run's `spent` (:136-137), which is correct only if `/cost` excludes subagent and workflow
  tokens. The fallback measures a run by the `/cost` delta (:139-140), which works only if `/cost`
  includes them. This repo already recorded which is true: "`/usage` (the command `/cost` now
  reports as) includes subagent and workflow-agent tokens"
  (`docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md:504-505`, citing
  code.claude.com/docs/en/costs.md). So the rule as written double-counts every dispatch, and the
  25M ceiling and 20M flag are measured against an inflated number.

**Fix.** Rewrite the counting rule on the recorded fact: `/cost` (`/usage`) is the total, read at
each boundary; Agent usage blocks and a run's `/cost` delta are attribution only, never added.
Task 6's per-page cost is the `/cost` delta across the run divided by six, with the conductor
idle during the run. Keep `spent` only if wanted as a cross-check, taken as a start-to-end
delta, with task 3's acceptance reduced to "the field is present with a stubbed `budget`".

### FV-2 (major): the fold's owed spec erratum lands on no task, and the plan tells executors to stop on exactly that disagreement

**Location:** plan :12-13 ("Where this plan and a spec disagree, stop and report"), :16, task 4
Files :302-304 and outcomes :311-319, task 7 :389-390; spec
`2026-09-30-docs-code-sync-design.md:282-283`; fold record :64-72.

**Defect.** The spec's Acceptance still says zero `frictionFiled` entries "is read there as a
prompt failure". The plan dropped that rule (PR-12), and the fold records the spec edit as owed,
but task 4's Files name only the parent spec and the prior-art record, not the sync spec. Task 7
will reach the disagreement, and :12-13 tells it to stop. The second owed item, FV-11 in
`2026-09-30-docs-code-sync-fold.md:129`, also has no landing. Header :16 says the fold "carries
one owed spec erratum"; it carries two owed items.

**Fix.** Add `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md` to task 4's Files and
one outcome: strike the zero-as-prompt-failure clause at :282-283 with a status-line note citing
PR-12. Route FV-11's amendment to task 4 as a one-line note on the sync fold record, or to task
10's post-mortem. Task 4's acceptance names the 2a plan fold's "Owed errata" explicitly, since
"the fold record" at :300 and :317 is ambiguous between the two folds.

### FV-3 (major): a cold session cannot reach this plan from STATUS

**Location:** `docs/STATUS.md:17-22`, `:40-60` (branch and `main` identical); plan :18-19, :181,
:481.

**Defect.** Both STATUS copies still say the next action is to draft the 2a plan and to
brainstorm "the arm's page set and order, and the pilot's six pages", which are now settled.
Nothing in the repo names the branch `draft-docs-2a`, the worktree, this plan's path, the entry
condition (Geoff's R10 approval at https://claude.ai/artifact/NCSX7CjAdvCJ5cwQK78kds), task 1
done, or the 25M ceiling and 20M flag. The R10 URL appears in no file (`grep -rn
NCSX7CjAdvCJ5cwQK78kds docs/` returns nothing); the plan's outline header (:18-19) and its
ledger row (:481) say only "the R10 page". `pass-core` "Executing" requires STATUS to point at
the plan before the first dispatch, and its pre-bake test is a cold session reaching the same
next action from STATUS alone. The plan's own rule (:181) routes STATUS writes to `main`'s copy,
so that is where the pointer belongs.

**Fix.** Before handoff, one commit on `main`'s STATUS (conductor's hunks only) replacing the
resume prompt: Goal (stage 2a execution), branch and worktree path, plan path, entry condition
(the R10 URL and "task 2 waits for Geoff's approval of the outline and plan there; record it in
the ledger row at plan :481"), task 1 done, ceiling 25M and flag 20M, next action task 2 after
`npm ci`, and `cairn-pass` to start. Add the R10 URL to plan :18-19 and to the ledger row :481.

### FV-4 (major): task 7's owner-fold commit carries no gate, so the S2 boundary's last commit is unproven

**Location:** plan :144-147, :397-400.

**Defect.** "Every boundary is a gate-green commit" (:146-147) names only the post-run commits
after tasks 6 and 8. Task 7's Sonnet agent applies Geoff's saved pages and briefs, runs the
scoped reviews, and commits (:397-398) with no gate. Page and brief edits can break
`check:provenance`, Vale, links, or the option gate. Task 8's drafters then meet the red in the
whole-tree gate, report `fail`, and the runner spends a redraft round on it (`docs-page-chain.js`
:752, :764-765), which inflates the rate task 7 just measured. A runner change at :399-400 has a
gate; the page edit does not.

**Fix.** Task 7's fold agent runs `npm run check:docs-gate` through `cairn-run-gate` (light
lane) before committing, and one `diff-reviewer` reads the file set, as the post-run commit does.
The acceptance at :402-403 adds "the fold commit gate-green".

### FV-5 (minor): review focus 2 overstates what the runner does with a sibling's red

**Location:** plan :190-192; runner `docs-page-chain.js:456-461`, :752.

**Defect.** "A red on a row naming another in-flight page's slug does not count against this
page." The runner's rule covers a red "that names another in-flight page's file", and even then
the drafter reports `fail`; `chain()` accepts only on `gate === "pass"`, so the page redrafts and
can escalate. A map-gate red names a path and a slug, not a file. The edit order at :160-166 is
the real guard; this sentence claims a second guard that does not exist.

**Fix.** Reword: "The map rule's edit order keeps a sibling's gate green; a red that still
occurs costs a redraft round, and the stage record notes it as a sibling red."

### FV-6 (minor): task 9's gate range has no base

**Location:** plan :417-419.

**Fix.** Name `<base>` as task 8's post-run commit (from the ledger), so the range covers task
9's diff only.

### FV-7 (minor): the chain call names a top-level `track` the runner does not read

**Location:** plan :101; runner header :21-58 (track is per page only; required args at :225 are
`worktree`, `gate`, `pages`).

**Fix.** Drop `track: "extend"` from the top-level list; the per-page `{id, path, track}` at :99
already carries it.

### FV-8 (minor): task 7 tests the full-scope total against the flag, then asks about the ceiling

**Location:** plan :386 ("must sit under the 20M flag"), :393-394 ("the scope that plans within
the ceiling").

**Defect.** At pass A's rate the plan's own projection is 21.73M (:131), above the flag. "Must"
reads as an acceptance criterion that fails, while the question offers the ceiling as the bound.

**Fix.** ":386: the full-scope total, compared with the 20M flag; above it, the combined question
carries the overage and the scope lever."

### FV-9 (minor): three stated unwraps have no fixture

**Location:** plan :223-225 (unwraps `Record` and index values, optionality, unions, mapped
types), acceptance :247-251 (fixtures for inline member, nested named type, array element,
generic constraint).

**Defect.** Mapped types (`Partial`, `Omit`, `Pick`, named in PR-1), index-signature values, and
unions of named types are stated outcomes with no failing fixture, so a walker that drops them
passes.

**Fix.** Add one fixture: a member reached only through `Partial<Named>` or
`Record<string, Named>`. One case covers the mapped and index paths; unions ride the
existing ones if a fixture root is a union.

### FV-10 (minor): task 6's `rowsReceived` baseline has no producer

**Location:** plan :374; task 2's counts at :244-245 are taken at map creation.

**Defect.** "The count at the pre-pilot commit" differs from task 2's creation counts once task 5
retags a mapped fact. The conductor reads no files, and no agent is told to compute it.

**Fix.** The post-run implementer computes each pilot page's selection count at the pre-pilot
commit (`git show <sha>:<map>`) and writes it beside `rowsReceived` in the stage record.

### FV-11 (minor): tasks 7 and 9 acceptance do not check the scoped-review verdicts

**Location:** plan :113-116 (execution mode), :402-403, :437-439.

**Fix.** Add to both acceptances: "the scoped-review verdicts in the stage record, any `fix`
applied before the commit".

### FV-12 (minor): the fold's new mechanisms carry two of S2's three citations

**Location:** fold record :78-87; plan :151-153 (the lean guard needs a source, a failure, and a
step to ride).

**Defect.** Each new mechanism (`spent`, `rowsReceived`/`rowsDisposed`, `check:options`, the
post-run commit) names a source and a defect, but not the step it rides. The spec's Acceptance
asks for one verdict per mechanism with its three citations.

**Fix.** Add the third column to the fold record's list: the runner return, the page-inputs
schema, `check:close`, and the conductor's post-run dispatch.

### FV-13 (minor, over-ceremony): planning history the plan need not carry

**Location:** plan :38-45 ("Code-first gap sweep (planning phase, done)"), review focus 1 and 3
(:189, :193-194).

**Defect.** The gap-sweep section is history, owned by its record and the ledger row at :476.
Review focus 1 and 3 restate criteria task 2's fixtures and the fact read already enforce.

**Fix.** Cut the section to one ledger-adjacent sentence citing the sweep record; keep review
focus 2 only (reworded per FV-5).

## Question-by-question summary

- **Q1:** 18 of 20 majors closed at their cited lines; PC-1 and PR-5 partial on one root (FV-1).
- **Q2:** no task order that cannot build; tasks 2 to 5 serial, task 6's dependencies hold, and
  tasks 5 and 9 agree on the `close` rearms. One contradiction: the counting rule against its own
  fallback (FV-1). One unproven boundary commit: task 7 (FV-4). The plan also disagrees with the
  spec on the zero-friction rule with no task to reconcile it (FV-2).
- **Q3:** from memory: the `spent` unit and the delta (FV-1), the runner's whole-tree discount
  (FV-5). Proven or stated as outcomes with fixtures: the walker's unwrap rules (mostly, FV-9),
  the edit order (checked green by hand against the gate's failure list), the Edit tool's
  exact-match guard on the constant line.
- **Q4:** every spec Acceptance item lands on a task (walker and fixtures: task 2; rows: tasks 3
  and 6; `cairn-release`: task 4; parent errata: task 4; `frictionFiled`: tasks 3, 7, 10;
  dependency and keep-or-cut: task 6 and the ledger row). The zero-as-prompt-failure clause is
  the exception, owed with no task (FV-2); FV-11's fold-record amendment likewise.
- **Q5:** no. STATUS is stale on both branch and `main`, and the R10 URL is in no file (FV-3).
  The plan itself states task 1 done (:198-202, :480) and the ceiling (:49, :119).
- **Q6:** FV-13; the rest of the ceremony is spec- or parent-required.
