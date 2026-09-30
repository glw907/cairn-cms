# Draft docs harvest, then delete

**Goal:** Prove every claim on the 49 old narrative and front-door pages is a fact or a recorded
cut, then delete those pages with every inbound reference and gate repaired.

**Spec:** `docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` (the claim ledger, the
audit, the verifier, the deletion, timing, acceptance) and its parent,
`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`, "Amendment: harvest, then
delete". Executors read the harvest spec in full. Where this plan and the spec disagree, stop and
report. Review record: `docs/superpowers/research/2026-09-29-draft-docs-harvest-fold.md`.

**Approach:** Build the ledger format and its verifier first, test-first, now. Hold everything
else until the theme lineage (passes B and C) merges to `main`, then merge `main` in. Audit admin
alone to measure the rate, then run the other four batches as three parallel chains while the
gate narrowing runs beside them. Merge, run the verifier over all 49 pages, and only then delete.
Plans specify outcomes and acceptance, never implementation code.

**Pass class:** mixed. Task 1 is `engine-logic`. Tasks 2 to 6 are `docs`, with the gate the plan
names instead of the docs tier, since their diff is ledgers and facts bullets, not published
prose. Task 8 is `engine-logic` for `scripts/` and `src/tests/` and `tool` for `tool/`, gated by
the union. Task 9 is `engine-logic`. `code-simplifier` runs once at the close (task 10) over the
pass's changed JavaScript, TypeScript, and Go.

**Execution mode:**
- Before task 1, the conductor runs `npm ci` in this worktree (root and `examples/showcase`), so
  later gates prove this worktree's engine, never the main checkout's.
- Task 1: one Agent-tool chain (`cairn-implementer` on `sonnet`, then `diff-reviewer` on
  `claude-opus-5-5`), in this worktree. It runs now.
- **Hold.** Task 2 starts only after the theme lineage has merged to `main`. A dispatched Sonnet
  agent merges `main` into this branch first (conflicts per task 7's rule); the conductor never
  resolves a conflict.
- Task 2: one Agent-tool chain, the same shape, in this worktree. It is the rate checkpoint.
- Tasks 3 to 6: `pass-execute-chains` by name, three chains in three worktrees branched from task
  2's commit, with `classifier: false`, `gateLane: "light"`, each task's `gate` as below, and the
  required `args.gate`, `args.implementer`, and `args.planPath`; each task's `criteria` carries
  task 2's Acceptance. Chain X is `draft-docs-harvest-x` (task 3, then task 4). Chain Y is
  `draft-docs-harvest-y` (task 5). Chain Z is `draft-docs-harvest-z` (task 6). The chains' gates
  need no `node_modules`, so the chain worktrees get no install. The chains are independent: each
  edits only its own pages' facts sections and ledgers (task 6 also owns the sections named in
  its outcomes).
- Task 8: independent of tasks 3 to 6 (it edits `scripts/`, `src/tests/`, `tool/`, and
  `.github/`, never facts or ledgers). It runs in this worktree while the chains run, as one
  Agent-tool chain with the implementer upshifted to `model: opus`, because gate narrowing is
  correctness-critical and the plan names outcomes, not the shape of each narrowing.
- Task 7: starts when the chains and task 8 are done. A dispatched Sonnet agent runs the merges.
- Task 9: one Agent-tool chain, Sonnet implementer.
- Task 10: the close, authored by one fold agent with one independent `diff-reviewer` read.

**Token ceiling:** 12M, flag at 9.6M (R1, Geoff, 2026-09-29).
Derivation (re-derived by the review fold from the enlarged task list):

| Share | Estimate |
| --- | --- |
| Task 1, the verifier (about 15 fixture cases) | 0.5M |
| Tasks 2 to 6, the audit: 7770 page lines at 0.38 to 0.57k per line (pass 0+1's 60 to 90k per page over a 159-line mean), plus 15% for line spans, step 5, and the wider review sample | 3.4 to 5.1M |
| Task 7, merges and the full verifier | 0.3M |
| Task 8, gate narrowing (Opus implementer) | 1.0M |
| Task 9, delete and relink (about 125 files) | 1.3M |
| Task 10, the close with its reviewers | 1.0M |
| Conductor | 0.3M |
| **Total** | **about 7.8 to 9.5M** |

**Counting rule:** what `/cost` reports for the conductor session, plus each Agent dispatch's
usage block as the conductor reads it from the completion result (a subagent cannot report its
own tokens), plus the `pass-execute-chains` run's `spent`. Tasks 3 to 6 take one ledger row, from
`spent`.

**Checkpoints:** after task 1 (`main`'s STATUS names this branch, the plan path, and the trigger,
B and C merged; then the hold); after task 2 (the rate checkpoint: re-project tasks 3 to 6 per
page line from task 2's measured tokens, since extend averages about 188 lines a page against
admin's 139, and if the projection breaks the ceiling, write STATUS and ask Geoff one question
before launching the chains); after task 7; after task 9. Segments: S1 is task 1; S2 is task 2;
S3 is tasks 3 to 6 and task 8, in parallel on disjoint files (the disjoint-Files-seam override of
the three-to-four-task segment); S4 is tasks 7, 9, and 10. Every boundary is a gate-green commit.

## Owner rulings (Geoff, 2026-09-29)

- **R1, yes:** the ceiling is 12M, flag at 9.6M. The review enlarged the pass to a re-derived
  7.8 to 9.5M; task 2's checkpoint still re-projects from measured cost.
- **R2, yes (drop):** task 9 removes the old `docs/README.md` from `docs-register.md`'s
  front-door exemplar list and records the gap in `relink.json` for stage 5. Capturing it would
  put the page's old text before the stage 5 drafter who rebuilds it.
- **Ordering confirmed:** task 1 runs now; tasks 2 onward wait for theme passes B and C to merge
  to `main` (spec, "Timing"; H5's correction). Superseded in part by R3.
- **R3 (Geoff, 2026-09-29, later the same day): audit now, away from theming.** "You should be
  able to work on unrelated docs. This is just the theming system, so you can stay away from
  that." PR #97 (pass C, carrying B) cannot merge before Geoff's attended sitting, so the audit
  runs now on every page the theme lineage leaves alone. The pass C conductor supplied what the
  lineage changes, recorded in
  `docs/superpowers/research/2026-09-29-harvest-theme-lineage-brief.md`. Every audit dispatch
  (tasks 2 to 6 and 6b) reads that brief in full and obeys its four rules: six deferred pages,
  frozen fact ids, renames to verify against, and a per-task recheck file.

  The sequence under R3:
  1. Now: task 2 (admin, 9 pages), its rate checkpoint, then tasks 3 to 6 as the three chains,
     with tasks 5 and 6 each auditing 12 pages (their deferred pages removed, listed per task).
  2. Now: task 7a merges chains X, Y, and Z and runs the verifier over every audited page
     (`--arm admin`, `--arm editors`, `--arm front-door`, and `--pages` with the 24 audited extend
     pages). Then the pass holds; the conductor writes `main`'s STATUS.
  3. After #97 merges to `main`: merge `main` in, then task 6b, then task 7's remainder (the full
     verifier, no flag), then tasks 8, 9, and 10. Task 8 waits too, since pass C edits
     `scripts/checks/` heavily (`gate-tier.mjs`, `reference-coverage.mjs`, and a dozen more).
- **R4 (Geoff, 2026-09-29, evening): the merge is pre-authorized.** Task 10's "merge on Geoff's
  go" is given in advance for the unattended overnight run: merge the harvest PR once the full
  close gate and every close review are green. A red gate, an escalated review finding, a
  non-empty pre-merge check, or any other stop condition in this plan still halts the merge for
  Geoff.
- **R5 (Geoff, 2026-09-29, evening): the ceiling rises to 14M, no 80% stop.** Supersedes R1's
  ceiling and flag for the overnight run: the run continues without a checkpoint question up to
  14M and stops hard there.

## Global constraints

- The deletion list is exactly 49 pages: every `.md` under `docs/admin/` (9), `docs/editors/` (8),
  and `docs/extend/` (33) minus the kept set, `docs/extend/migration-notes.md`,
  `docs/extend/upgrade-cairn.md`, and `docs/extend/choose-an-ai-posture.md` (30), plus
  `docs/why-cairn.md` and `docs/README.md`. It and the kept set live in
  `docs/internal/record/harvest/deletion-list.json`, the one source the verifier and the gates
  read.
- The kept set is never audited or deleted. Task 9 edits it for link repair only, and a changed
  sentence on `choose-an-ai-posture.md` changes its brief's matching sentence in the same commit.
- No task edits a deletion-list page before task 9. A false claim is recorded as a `[rejected]`
  fact, never fixed on the page (this overrides the implementer definition's fix-the-page rule).
- Facts follow `docs/internal/facts/README.md` exactly: a minted id from
  `node scripts/checks/check-facts.mjs --mint`, one tag at the end, a `Source:` that resolves, and
  no em dash anywhere in the container.
- An auditor edits only its own pages' facts sections (task 6 also owns the sections its outcomes
  name), never `## Harvest record`, `## Provenance`, or another chain's section. Per-batch counts
  live in the verifier output and the pass record.
- A ledger paraphrases a claim in at most 25 words and never copies a sentence from the page.
- `npm run check:facts` and `npm run check:provenance` are green after every task.
- `templates/waymark/` is emitted from `examples/showcase` (`npm run emit:template`), never
  hand-edited.
- A released Go binary's docs URLs (`https://cairn.pub/docs/...`), the anchor strings in `tool/`
  constants, `tool/internal/spine/conditions.json`, and `scripts/checks/shipped-anchors.json` are
  shipped contracts: this pass never changes them.
- Commit specific files, never `git add -A`. Commit messages carry the attribution trailer.
- No task edits this branch's `docs/STATUS.md` except task 10; the conductor's checkpoint
  writes go to `main`'s.
- The conductor never reads a diff or resolves a conflict; a merge that conflicts goes to a
  dispatched agent under task 7's rule.

## Review focus

1. **A page edited on `main` after its audit.** The verifier's `blob` check fails such a page by
   name up to task 7; task 10's pre-merge check covers the window after it.
2. **A ledger that skips a claim.** The span-coverage rule fails it by line range; the reviewer's
   sample then checks what each span was disposed as.
3. **A fact that is near the claim but not it, and a true claim cut or rejected.** Each audit's
   `diff-reviewer` takes the sample in task 2's Acceptance.
4. **A reference grep misses, or a contract gets "repaired".** Task 9's residue printout
   classifies every remaining hit against the spec's allowed-residue classes.
5. **A gate that passes because its subject vanished.** Each narrowing keys on the arm state from
   `deletion-list.json`, never on a directory or index existing.
6. **The tarball.** After the deletion the packed docs are exactly `docs/reference/**` plus the
   kept set.

## Tasks

### Task 1: the claim ledger format and its verifier

**Pass class:** `engine-logic`. **Gate:** `npm run check` and the verifier's unit test file,
through `cairn-run-gate`, light lane (the test runs in Node only; name the vitest project that
holds it).

**Files:** create `scripts/oneshot/verify-harvest.mjs`, its unit test under `src/tests/unit/`,
`docs/internal/record/harvest/deletion-list.json` (deleted and kept lists),
`docs/internal/record/harvest/README.md` (the ledger schema, the span rule, the cut-reason list,
and the audit's five steps, copied from the spec, for the auditors), and fixture ledgers under
the test's fixtures. Modify `scripts/checks/gate-tier.mjs` only if the new directory needs a tier.

**Outcomes:**
- The verifier implements every rule in the spec's "The verifier" section, reading both lists
  from `deletion-list.json`.
- `--arm` and `--pages` scope a run; a scoped run still fails on a missing ledger in its scope,
  checks `Source:` only in the scoped pages' facts sections, and fails a `--pages` path off the
  list by name. With no flag it checks all 49 and the whole container.
- Output names each failure with the ledger path and claim index (an uncovered span by line
  range), reports every failure in the run, and prints per-arm counts on success.
- The unit test uses fixtures only and never reads the real tree, so it survives the deletion.

**Acceptance:** test-first; each rule has a failing fixture case and a passing one: a stale
`blob`; an unresolved id; a `[candidate]` target; an unknown cut reason; an undisposed claim; a
ledger for a page off the list; an uncovered paragraph; an empty `claims`; a missing ledger in a
scoped run; a `--pages` typo; an absent record directory; malformed JSON; a `page` field that
disagrees with its location; two ledgers for one page; a list that disagrees with the tree; a
fact whose `Source:` names a deletion-list page; a scoped run that passes while an out-of-scope
section cites one. The check and the test are green.

### Task 2: audit admin (rate checkpoint)

**Starts after the hold.** **Pass class:** `docs`. **Gate:** `npm run check:facts && npm run
check:provenance && node scripts/oneshot/verify-harvest.mjs --arm admin`, light lane.

**Pages (9):** every `.md` under `docs/admin/`, `README.md` included.

**Outcomes:** per the spec's "The audit" section (all five steps), for these pages: a ledger per
page with full span coverage, missing facts filed, every `[candidate]` and `[docs-drift]` bullet
in these pages' sections of `docs/internal/facts/admin.md` resolved, and every bullet there that
cites a deletion-list page re-sourced. `admin/README.md` gains its facts section. Every heading
slug on `is-it-working.md` that any anchor source names is recorded as a fact naming the slug and
what pins it; the anchor sources are every anchor string under `tool/` (including
`tool/internal/health/fixes.go`, `tool/internal/render/layout.go`, and
`tool/internal/doctor/check_referrer.go`), `tool/internal/spine/conditions.json`,
`src/lib/diagnostics/conditions.ts`, `scripts/checks/shipped-anchors.json`, and any gate.

**Acceptance:** the gate is green; the report gives the claim count, facts reused, facts filed,
cuts by reason, and bullets re-sourced. The `diff-reviewer` traces five `fact` mappings against
claim and bullet, five `new-fact` bullets to source, five judgment cuts, every `[rejected]`
retag, and every id three or more claims fan into. Tasks 3 to 6 carry this same acceptance. The
conductor reads the dispatch's tokens from the Agent usage blocks (implementer plus reviewer) and
computes tokens per page line.

### Task 3: audit editors (chain X)

**Pass class:** `docs`. **Gate:** `npm run check:facts && npm run check:provenance && node
scripts/oneshot/verify-harvest.mjs --arm editors`, light lane.

**Pages (8):** every `.md` under `docs/editors/`, `README.md` included. It gains a facts section.

**Outcomes and acceptance:** as task 2, against `docs/internal/facts/editors.md`. The quoted UI
strings `check:editor-quotes` pins on `when-something-goes-wrong.md` are recorded as facts
sourced to the component or message file that renders them.

### Task 4: audit the front door (chain X, after task 3)

**Pass class:** `docs`. **Gate:** `npm run check:facts && npm run check:provenance && node
scripts/oneshot/verify-harvest.mjs --arm front-door`, light lane.

**Pages (2):** `docs/why-cairn.md` and `docs/README.md`.

**Outcomes and acceptance:** as task 2, against `docs/internal/facts/front-door.md`. A stance claim
maps to an owner-tier fact with its verbatim key phrase, or is cut as
`stance-without-owner-basis`. The facts file's `README.md` and `CLAUDE.md` sections and its
owner-brief section are not audited: those files are not being deleted.

### Task 5: audit extend, first half (chain Y)

**Pass class:** `docs`. **Gate:** `npm run check:facts && npm run check:provenance && node
scripts/oneshot/verify-harvest.mjs --pages <the 15 paths>`, light lane.

**Pages (15, about 2830 lines):** `add-a-custom-admin-screen`, `add-an-island`,
`add-a-second-audience`, `add-cairn-to-a-sveltekit-app`, `animate-a-custom-screen`,
`announce-on-publish`, `architecture`, `auth-channel-security-model`, `build-a-site-by-hand`,
`configure-rendering`, `content-model`, `data-tiers`, `debug-your-site`,
`declare-your-own-concept`, `define-an-adapter-and-schema` (each `docs/extend/<name>.md`).
`animate-a-custom-screen` gains its facts section.

**Outcomes and acceptance:** as task 2, against these pages' sections of
`docs/internal/facts/extend.md` only.

**R3 amendment:** `animate-a-custom-screen`, `architecture`, and `build-a-site-by-hand` move to
task 6b, leaving 12 pages. The gate's `--pages` names those 12.

### Task 6: audit extend, second half (chain Z)

**Pass class:** `docs`. **Gate:** as task 5, with its own 15 paths.

**Pages (15, about 2740 lines):** `design-your-site`, `enable-tidy`,
`link-content-with-references`, `migrate-existing-content`, `organize-your-admin-nav`, `README`,
`render-safety`, `restrict-admin-access`, `reuse-content-across-entries`,
`rotate-the-github-app-key`, `security-model`, `share-a-draft-preview`,
`sign-in-through-your-organization`, `what-the-scaffold-wrote`, `wire-the-delivery-surface`
(each `docs/extend/<name>.md`).

**Outcomes and acceptance:** as task 5, for these sections. Task 6 also owns, for audit steps 4
and 5: any bullet in `extend.md` outside every page section, and, for step 5 only, the kept
pages' sections (`f:65atya` in the `choose-an-ai-posture.md` section is the known case; a
brief-cited bullet keeps a citable tag).

**R3 amendment:** `design-your-site`, `share-a-draft-preview`, and `what-the-scaffold-wrote` move
to task 6b, leaving 12 pages. The gate's `--pages` names those 12. Frozen ids from the theme
lineage brief stay out of the steps 4 and 5 ownership above.

### Task 6b: audit the deferred pages and the rechecks (after #97 merges)

**Starts after `main`, holding #97, is merged into this branch.** **Pass class:** `docs`.
**Gate:** `npm run check:facts && npm run check:provenance && node
scripts/oneshot/verify-harvest.mjs --arm extend`, light lane.

**Pages (6):** `animate-a-custom-screen`, `architecture`, `build-a-site-by-hand`,
`design-your-site`, `share-a-draft-preview`, and `what-the-scaffold-wrote` (each
`docs/extend/<name>.md`), audited as their original task would have, against the merged code.

**Outcomes:** the six pages audited per task 2's outcomes. Every line of every
`docs/superpowers/research/harvest-recheck/task-*.md` is resolved against the merged code (a
`Source:` repointed, a fact retraced and corrected or `[rejected]`, a frozen bullet's needed change
made now that it is unfrozen), and each line records its resolution. `animate-a-custom-screen`
gains its facts section.

**Acceptance:** as task 2, plus every recheck line resolved; the `diff-reviewer` samples five
recheck resolutions against the merged code.

### Task 7: merge and verify the whole harvest

**Starts when tasks 3 to 6 and task 8 are done.** A dispatched Sonnet agent merges chains X, Y,
and Z into `draft-docs-harvest` in that order, then merges `main` in, so the verifier sees current
pages. **Conflict rule:** in a facts file, bullets with distinct ids from both sides are all kept;
where both sides changed the same id, the agent keeps one bullet, retraces it to source, and
reports it (`check:facts`'s duplicate-id check proves no id doubled). Any other conflict stops the
task and reports. It then runs `npm run check:facts`, `npm run check:provenance`, and
`node scripts/oneshot/verify-harvest.mjs` with no flag.

A stale-`blob` failure dispatches one Sonnet auditor for only the named pages' changed spans (it
diffs the page against the audited blob), and that re-audit's diff gets one `diff-reviewer`
read. Record the verifier's per-arm counts, the commit it passed on, and the `main` SHA merged in
this plan's ledger.

**Acceptance:** the full verifier, `check:facts`, and `check:provenance` are green on the merged
head; the counts and both SHAs are recorded.

### Task 8: narrow the gates (while the pages still exist)

**Pass class:** `engine-logic` plus `tool`. **Gate:** `npm run test:node-projects && npm run
check:close` and `make -C tool check`, each through `cairn-run-gate`, light lane (`check:close`
launches no browser; CI runs the component suite, and this task changes no component).

**Outcomes:**
- One shared arm-state function reads `deletion-list.json` and reports each arm as absent,
  kept-only, or rebuilt, per the spec; no gate keys on a directory or index existing.
- Every gate on the spec's narrowing list is narrowed per the spec. `check:readiness` and
  `fixes_test.go` take the spec's shipped-anchors rule (list mode only while the admin arm holds
  no page). `docs-links` takes the spec's dated-records and `LEGACY_PATH_MAP` rules. The
  `check:symbols` allowlist takes the `migration-notes.md` code-span path mention.
- `.github/workflows/tool.yml`'s two path filters add `scripts/checks/shipped-anchors.json`.
- Every narrowed gate is still green on today's tree, where every arm is in the rebuilt state.
- Each narrowing and allowlist entry is recorded in `relink.json`, per the spec's entry shape.

**Acceptance:** test-first. The shared function is pinned in all three states. Each gate has a
test in its narrowed state; `check:arm-indexes`, `check:package-files`, and `check:readiness` with
`fixes_test.go` are pinned in all three, including the extend fixtures (kept set only passes; kept
set plus one new page and no index fails; the same with the index passes) and the spec's
anchor-list fixture states. The gate is green.

### Task 9: delete the pages and repair every reference

**Pass class:** `engine-logic`. **Gate:** `npm run test:node-projects && npm run check:close`,
`npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site
test`, `npm run test:emit`, and `make -C tool check`, each through `cairn-run-gate`, light lane.

**Discovery (the implementer runs it first and works from its output, never from this list):**
`git grep -nIE 'docs/(admin|editors|extend)/|why-cairn|docs/README' -- ':!docs/superpowers'`,
plus a link-shaped grep per deleted page (`<basename>.md`, and the path-qualified forms
`(admin|editors|extend)/README` and `../README.md` inside the arms), since anchors and relative
links omit the directory. At review time the first grep hit about 204 files, 88 of them live
repo-path references outside `docs/`, and the second added 37 more (13 reference pages among
them).

**Outcomes:**
- The 49 pages are deleted. Nothing else under `docs/` is deleted.
- Every repo-relative reference outside the allowed residue is repaired per the spec's "Delete and
  relink" section, the kept pages and the `AI_POSTURE_COMMENT_BLOCK` lockstep edit (showcase
  config, `emit:template`, `substitute.mjs`, its two tests) included.
- `CLAUDE.md`'s docs section, `docs/internal/facts/README.md`'s "How this container grows", and
  `docs/internal/docs-register.md`'s freeze line drop the per-arm freeze for the deleted arms and
  state that the arms are empty until their stages rebuild them.
- Every repaired link is appended to task 8's `relink.json`, per the spec's entry shape.
- Per R2, the old `docs/README.md` leaves `docs-register.md`'s front-door exemplar list, with a
  `relink.json` entry keyed to stage 5.
- `CHANGELOG.md` `## Unreleased` gains the spec's entry, `Consumers must:` line included.

**Acceptance:** the implementer prints the residue of both greps with each line classified
against the spec's allowed-residue classes, and the task's `diff-reviewer` reads that printout;
no line is unclassified. `npm pack --dry-run` lists exactly `docs/reference/**` plus the kept set
under `docs/`. The gate is green.

### Task 10: close

Run `cairn-pass`'s close:
- **Pre-merge check:** `git diff <task 7 main SHA>..origin/main` over the 49 paths is empty. A
  non-empty result, or a modify/delete conflict on a deletion-list page at any merge, stops the
  merge and dispatches task 7's targeted re-audit (from `git show`) with its `diff-reviewer` read.
- `code-simplifier:code-simplifier` over the pass's changed `.mjs`, `.ts`, and `.go`; one
  `go-architecture-reader` per touched Go package; the full gate. The `docs` register chain is
  waived and the waiver recorded: the pass drafts no published prose, and its link repairs are
  agent-facing fixes.
- The pin ceiling (the last release cut before this merge) written into
  `docs/internal/record/2026-09-22-cairn-pub-docs-handoff.md`, and committed as one line in
  `~/Projects/cairn-pub/docs/STATUS.md`: the pin must not pass `<ceiling>` until the narrative
  arms are rebuilt, since later releases ship the reference arm only; see that handoff record.
- STATUS rewritten with the stage 2a plan as the next action (a fresh brainstorm session writes
  it, drawing the extend outline from jobs, the facts, and `relink.json`), the fold record's owed
  errata as an open decision for Geoff, and a watch that the kept per-version records' paths are
  hardcoded in `cairn-pass`, `CLAUDE.md`, and the facts README.
- The HISTORY entry with the verifier's counts and commit, what the gates caught, what a later
  pass would be wrong to rediscover, and whether any refused review finding turned out real;
  ROADMAP updated; this plan's post-mortem with both budgets scored.
- Push, open the PR, and merge on Geoff's go.

## Ledger

| Task | Status | Tokens | Notes |
| --- | --- | --- | --- |
| 1 | done (`c56e68b8`, fix `94057384`) | 260k (impl 168k, review 92k) | one fix round: basename `Source:` citations; carried to tasks 4 and 7: bare `why-cairn.md` shadowed by the fixture, full path behind `../../` unmatched |
| 2 | done (`f8b4f116`, `f0011a96`, fix `a330c633`) | 657k (impl 519k, review 138k) | one fix round: `[rejected]` bullets stated the correction instead of the false claim, one near-miss mapping. 450 claims, 125 reused, 208 filed, 9 rejected. Rate 0.53k per page line; remaining R3 lines (5,077) project to about 2.7M, well inside 12M. Chains launched as run `wf_01d09570-176` from `a330c633` |
| 3 to 6 | done (X `608e3f9d`, `a6c2cd11`, fix `5d453cee`; Y `70577ef3`, `2cc8f829`, sweep `2b76b78a`, fix `66352e3f`; Z `a2df28fe`, fix `bcb32a58`, `7aed4148`) | about 2.6M (run `wf_01d09570-176` 975k, then direct dispatches) | 24 extend pages under R3. Tasks 3 and 6 escalated on a frozen bullet whose Source cited a deletion-list page; the conductor ruled a Source-only edit (brief, rule 2 exception). Task 6's review found checkable security claims cut as stance; its sweep re-disposed 46 of 65 judgment cuts, and the same sweep on task 5 re-disposed 73 of 86 (brief, "Cut discipline"). Task 6 took a second fix round (conductor's call: small, fully specified) |
| 7a | done (merges `c426b000`, `2f33786d`, `29ea416b`; sweep `87796c7e`, fix `62a773b3`) | about 0.6M | Clean merges, no conflicts. A sweep over the admin, editors, and front-door cuts re-disposed 38 of 72. Verifier green on all 43 audited pages: admin 450 claims, editors 337, front door 96, extend 1167. Then held for #97 |
| 6b | held for #97 | | R3: six deferred pages plus the recheck files |
| 7 | held for #97 | | the remainder: merge `main`, full verifier |
| 8 | pending | | |
| 9 | pending | | |
| 10 | pending | | |
