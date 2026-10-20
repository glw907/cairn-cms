# Draft docs pass 0+1 plan: fold verification

**Target:** `docs/superpowers/plans/2026-09-26-draft-docs-pass-0-1.md` at `c1cf6588`. **Fold record:**
`2026-09-26-draft-docs-pass-0-1-fold.md`. **Reader:** independent of the fold.

**Counts:** 0 high, 2 medium, 5 low. Every high and major finding from the three reviews closed at
its cited location. The fold introduced no contradiction that blocks the build order. Each
spot-checked mechanism matches the tree.

## 1. Did each high or major finding close?

Yes. Each was checked at the plan line the fold cites.

| Finding | Closed at | Verdict |
|---|---|---|
| X-H1 (parallel segment A in one tree) | plan:16-21, :42 | Closed. Sequential, with the reason. |
| R-H1, X-M5 (task 10 shared tree and `dist`) | plan:396-405, :416-417 | Closed. Read-only readers, one apply implementer per batch, and sequential batches. |
| X-H2, C-M2 (gate scoping) | plan:257-262, :271-272, :295 | Closed. |
| C-M1 (redraft branch fixture) | plan:302-305, :313-316, :381-382 | Closed. |
| C-M3 (vacuous sweep greps) | plan:120-136, :156-163 | Closed. The pattern covers `docs-register.md:225-226`. |
| C-M4 (`cairn` line), C-M5 (stale map) | plan:173-198 | Closed. |
| C-M6, X-M1 (lists) | plan:204-221, :235-243 | Closed. `BRIEFS_DIR` is `docs/internal/briefs` (`check-provenance.mjs:77`), so `briefs-rebuilt.json` sits outside the walk. |
| C-M7 (review page contract) | plan:328-351, :102-106 | Closed. |
| X-M2, X-M3, R-M2 (lane, classifier) | plan:64-71, :249-274 | Closed. |
| X-M4, R-M1 (Vale order, CI proof) | plan:265-266, :275-277 | Closed. The CI mechanics are a new gap (M2 below). |
| R-M3 (proof isolation) | plan:363-391 | Closed. |
| R-M4 (budget) | plan:31-39, :395-405 | Closed. The flag placement is a new gap (M1 below). |
| R-M5 (no git ref) | plan:84 | Closed. |

## 2. Contradictions, build order, and gate strings

The segment order builds.
- Task 6 lands `check:docs-gate` and the classifier change before task 8.
- Task 7 runs after segment B's `pass-execute` returns, so no two executors share `draft-docs-0`.
- Task 2 runs alongside segment A in another repo and touches no cairn-cms file.
- Task 9's owner-fact commit comes before its proof branch.

Every gate string can run as written:
- `pass-execute.js:201-203` wraps the bare string in `cairn-run-gate '<string>'` and prefers the
  classifier's stdout.
- Once `DOCS_GATE` becomes `npm run check:docs-gate`, every higher tier inherits it through the
  concatenation at `gate-tier.mjs:49-53`. Dropping `check:snippets`, `check:transcripts`, and
  `check:symbols` from `FULL_GATE` is the dedupe the plan names.
- Task 6's own diff classifies `full` through the classifier version it just committed. The runner
  probe resolves the same version.
- `npm run check:docs-gate -- --page <p> --brief <b>` is safe inside `cairn-run-gate`'s single
  quotes.

## 3. New mechanisms, spot-checked against sources

- **Scoping.** `check:vale` is the fixed list `vale --minAlertLevel=error docs README.md
  examples/showcase/README.md` (`package.json:50`). `check-provenance.mjs:607` passes
  `process.argv.slice(2)` to `checkProvenance`. A single `node` runner can forward `--page` and
  `--brief`. Verified.
- **Marker-extracted derivation test.** `docs-page-chain.js` ends in a top-level `return`
  (line 274), so node cannot import it. A test can read the file as text, slice the function
  between the markers, and evaluate it. Feasible. `~/.dotfiles/scripts/check.sh` runs only
  `pytest tests/` and `tests/vale/run-fixtures.sh`, so a node test runs only through the new
  `run` line that the plan's Files list includes. Verified.
- **`sessionStorage` stash and `not_writer`.** `artifact.d.ts` (0.2.60, lines 24-40) says: "stash
  it in `sessionStorage` before calling `publish` (state kept only in JS variables does not
  survive the reload)". It also says: "Member presence does NOT signal writability ... treat its
  first `not_writer` or `not_granted` rejection as the read-only signal". Lines 201-204 add that
  "After a successful publish this view reloads too". Verified. That line feeds L4 below.
- **Self-publish skeleton ("or the next publish nests it").** This rule is not in any on-disk
  `.d.ts` file. It comes from the skill text. The conductor copies that text live into task 8's
  notes, so the rule corrects itself if it is wrong. No finding.
- **Anchors.** `git show tool/v1.1.0:.../conditions.json` gives 20 unique `docsAnchor` values.
  Verified. `--version` is registered explicitly (`root.go:225`), so it is already in the flat
  list. Verified.

## 4. Machinery verdicts

- Sequential segment A: **keep.** It removes real index and gate-key races at no cost.
- Docs gate runner with `--page` and `--brief`: **keep.** The chain gate cannot work without it.
- Classifier docs tier to `check:docs-gate`, full-tier dedupe, and the test: **keep.** One list,
  small diff.
- Build `dist` once per docs gate run: **keep.** The runner calls the node scripts directly, so
  each check's command now lives in two places. Name that in the runner's header.
- Green CI via the draft PR inside task 6: **shrink.** Move the proof to the segment B boundary
  (M2).
- Derivation function between markers, plus the node test: **keep.** It is one small function and
  one test file, and it guards the one input to the pilot question.
- Brief-coverage list validation and the README cross-match: **keep.** The spec requires both,
  and they are cheap.
- Anchor list with absent, malformed, and empty cases, plus the loader test: **keep.**
- The `cairn` line grammar (prompt, `NAME=value`, continuations, lazy `help`/`completion`):
  **shrink.** Drop the `NAME=value` handling, because no doc line needs it and a miss only
  under-reads. Keep the rest, which the stage 2 and 3 pages will exercise.
- Task 10's read-only readers and per-batch apply: **keep.** Without them, the `dist` race writes
  wrong edits into a shipped page.
- Task 8's stash, read-only, and wider round-trip fixture: **keep.** Losing Geoff's edits is the
  risk here.
- Task 9's proof worktree and no-leak acceptance: **keep**, with the diff range narrowed (L2).
- Memory before-and-after quotes, and write-once stow edits: **keep.** They cost nothing.

## 5. Ceiling and task 7 size

The arithmetic is consistent. Stage 0 is 2.5M plus 0.65M, about 3.2M. Stage 1 is about 4.5M.
Together that is about 7.7M, rounded to 8M. That total raises stages 0 and 1 from 6M by about 2M,
which matches the narrowed arm-page headroom, from 3M to about 1M. One placement defect remains
(M1). A small slip: the fold record's "about five apply batches" is seven at up to six agents per
batch. That adds about 0.2M, inside the rounding.

Task 7 carries seven deliverables and names them (plan:286-287), but never says the task is past
the four-deliverable guideline. It does not warrant a split. The runner and drafter edits must
land together, because the drafter's "Do not run the page gate" line and the runner's gate step
are one change. The two workstation docs and the two READMEs are description sweeps of that same
change, and the derivation test covers it. Splitting would add a chain and a dotfiles commit but
remove no risk. The pass has one task split (1 and 2, by repo), so this does not prompt a pass
split. Fold: add one clause to task 7 saying it is past four and stays whole for that reason.

## Findings

### M1. The 6.4M flag trips on plan, during task 10

- **Where:** plan:31-37 and :404-405.
- **Defect:** The plan puts planned spend at about 7.7M, so the 80 percent flag (6.4M) fires about
  halfway through stage 1 with no overrun. Under the global rule, that forces a STATUS write and
  a combined question to Geoff. This is a second question beside the task 10 projection
  checkpoint. It is a predictable execution sitting, and it contradicts the spec's own budget
  logic, which plans at or below 80 percent "so the global 80 percent stop fires only on an
  overrun" (spec:149-150). The pre-fold plan carried the same pattern (6M planned against a 6M
  ceiling).
- **Proposed fold:** Put the flag at the planned spend: ceiling about 9.6M, flag about 7.7M,
  derivation unchanged. Or state that the task 10 first-batch projection is the pass's one budget
  question, and that the 6.4M flag, reached after that projection is accepted, is already
  answered. The headroom sentence stays as written, because it rests on planned spend.

### M2. Task 6's green-CI acceptance has no mechanism inside the `pass-execute` chain

- **Where:** plan:275-277.
- **Defect:** The plan requires a green `test` run, proven through a draft PR that task 6 opens,
  but it does not say who pushes or who waits. The `test` job (`npm ci`, Playwright, the showcase
  suites) outlasts a shell call. The runner's reviewer rules on the local gate, and
  `pass-execute` has no step for a result that arrives after `accept`. A red CI run after
  acceptance has no fix path in the segment, so it surfaces at task 11, the round trip R-M1 set
  out to prevent.
- **Proposed fold:** Keep the push and the draft PR in task 6, and move the CI proof to the
  segment B boundary. There, the conductor records the `gh pr checks` result in the ledger before
  segment C, and a red run re-dispatches task 6 with the failing step named.

### L1. The proof worktree has no `npm ci`

- **Where:** plan:50-51, :366-369.
- **Defect:** Only `draft-docs-0` gets `npm ci`. The drafter's gate in
  `.claude/worktrees/draft-docs-0-proof` runs `svelte-package` and Vale. Without `node_modules`,
  that gate goes red, and the chain escalates it as "red gate", which spoils the proof's cost and
  branch record.
- **Proposed fold:** In task 9 step 2, run `npm ci` once in the proof worktree before the chain.

### L2. The no-leak diff spans the whole branch, not the proof

- **Where:** plan:388-390, against :199-200.
- **Defect:** `git diff main...draft-docs-0` includes every earlier task. Task 3 (and any fix that
  makes the docs gate green in task 6) may make a sanctioned deficiency fix on a `docs/extend/`
  page. That fix would fail task 9's acceptance even though the proof leaked nothing. Today's
  extend `cairn` lines are two `cairn doctor` lines, which resolve, so the risk is latent.
- **Proposed fold:** Diff from the commit recorded just before step 2
  (`<pre-proof>..draft-docs-0`).

### L3. The header says task 10's gates are conductor-run

- **Where:** plan:70-71, against :402-404.
- **Defect:** "Conductor-run gates (tasks 9 and 10)" contradicts task 10's body, where each
  batch's apply implementer runs the gate. A conductor that reads the header could run gates
  inline and break the thin-conductor rule.
- **Proposed fold:** Change the header to "task 9". Keep the conductor's one `npm run package` in
  task 10.

### L4. A successful save also reloads the page and would restore the stash

- **Where:** plan:338-340, against `artifact.d.ts:201-204`.
- **Defect:** A successful save reloads the view too, so an unconditional restore after reload
  brings back edits that were already saved and shows them as unsaved.
- **Proposed fold:** Restore only the stash entries that differ from the reloaded embedded state.
  Add one stubbed case: a successful publish followed by a reload shows no restored edits.

### L5. Task 7 commits in two repos, but its reviewer gets one range

- **Where:** plan:282-287, :24-27.
- **Defect:** The chain commits in both `~/.dotfiles` and `draft-docs-0`. `diff-reviewer` reads
  one `git diff`, so the plan should give it both ranges, or the README edits go unreviewed.
- **Proposed fold:** The task 7 dispatch passes both base SHAs to `diff-reviewer`.
