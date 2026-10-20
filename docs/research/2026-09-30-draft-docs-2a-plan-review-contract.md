# Stage 2a plan review: contract and criteria (PC)

**Target:** `docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` at `f3a013d7`. **Lens:**
every task's acceptance is testable and non-vacuous, names its fixture, and maps back to the
spec's Acceptance; the pilot checkpoint's measurements compute from what the runner returns;
segment boundaries sit on green commits; owner gates block exactly the right tasks.

**Sources checked:** the plan; the sync spec (`2026-09-30-docs-code-sync-design.md`, Acceptance at
lines 268 to 286); the parent's pilot checkpoint and "Edits after the chain"
(`2026-09-26-draft-docs-approach-design.md:391-398`, `:442-455`); the runner at
`~/.dotfiles/claude/.claude/workflows/docs-page-chain.js` (record shape `:737-765`, return
`:788`); `~/.claude/workflows/pass-execute.js:722`; the Workflow runtime's documented `budget`
hook; `pass-core`'s class table; the stage 1 plan's batch-commit convention
(`2026-09-26-draft-docs-pass-0-1.md:460-463`).

**Counts:** 0 blockers, 5 major, 8 minor. No owner forks.

## Spec Acceptance to task map

| Spec Acceptance item | Task criterion | Verdict |
| --- | --- | --- |
| Walker, map, gate; the six failing fixtures; passes on the committed map; counts recorded | Task 2 acceptance | Mapped. Fixture form unnamed (PC-9); no fixture pins "runs wide" (PC-8). |
| Page inputs receives its rows and rewrites each pending row it disposes | Task 3 (receipt), task 6 (no pending row naming a pilot slug) | Mapped. Task 3's receipt proof can pass with the whole map passed (PC-4). |
| `cairn-release` carries the sweep items | Task 4 | Mapped. |
| Owed errata land, stage flow names the sweep | Task 4 | Mapped. |
| `frictionFiled` carried and copied; per-page report; zero read as prompt failure; HISTORY counts | Tasks 3, 7, 10 | Mapped. The close cannot reach the records (PC-3). |
| Pilot depends on the mechanism tasks | Task 6 depends on 2, 3, 5; task 4 precedes it by segment | Mapped. |
| R10 page marks both added pages keep-or-cut | Outline header only (`:18-21`) | No criterion or ledger row (PC-11). |
| Plan review records one guard verdict per mechanism | This review's record set | Mapped (verdicts below). |

## Findings

### PC-1 (major): the pilot's cost measurements have no source the runner returns

**Location:** plan `:131-133` (counting rule), `:385` (task 6 acceptance), `:397-399` (task 7,
FV-11); runner `docs-page-chain.js:788`.

**Defect:** the counting rule takes "each workflow run's `spent`" and defines the per-page cost as
"task 6's `spent` divided by six." `docs-page-chain.js` returns `{ pages, accepted, escalated }`
and no `spent`, unlike `pass-execute.js:722`, which returns `spent: budget.spent()`. Adding that
line would not fix it: the runtime documents `budget.spent()` as "output tokens spent this turn
across the main loop and all workflows," a shared pool in a different unit from the 0.75M and
0.65M per-page shares the checkpoint compares against. Task 7's FV-11 line also asks for "the
page-inputs cost beside the page's total" per page. With three pages in flight, no delta of a
shared counter isolates one page or one agent, and no record field carries per-agent usage. As
written, the checkpoint's headline number (per-page cost) and FV-11's disposal cost cannot be
computed from anything the run hands back.

**Fold:** name the measurement source in the counting rule and prove it in task 3. The run
already labels every agent (`inputs:<slug>`, `draft:<slug>`, `redraft:<slug>`,
`register:`/`facts:`/`figure:<slug>:r<n>`). After each run, one Haiku agent sums total tokens per
label from the run's transcript directory. The runtime names `journal.jsonl` and the
`agent-<id>.jsonl` files as the record. It returns a per-page total and a per-page page-inputs
figure. The conductor reads only that table. Task 3's acceptance adds: the chosen source is shown
to yield a per-label total on the dry run, or on one stub-free single-agent run. If that costs
more than it is worth, drop the per-page page-inputs split. FV-11 then reports rows received and
disposed per page beside the page-inputs phase total. Either way, the counting rule stops citing
a `spent` the runner never returns.

### PC-2 (major): no one commits the chain's output, so the S2 and S3 boundaries have no green commit

**Location:** plan `:135-138` (segments), `:371-385` (task 6), `:413-421` (task 8);
runner `:610` ("Commit nothing"); drafter definition ("Do not commit").

**Defect:** every chain agent is told not to commit. Tasks 6 and 8 leave pages, briefs, facts,
map rows, the constant, friction entries, and index links in the working tree. No task names who
runs the whole-tree gate and commits them, or which files. Task 7's first bullet then edits
`LEGACY_PATH_MAP` and `relink.json` over the uncommitted pilot. The plan asserts "Every boundary
is a gate-green commit," but it gives that commit no owner. Stage 1's precedent is explicit: after
each batch, one `cairn-implementer` applies, runs `check:docs-gate`, commits, and `diff-reviewer`
reads the commit.

**Fold:** tasks 6 and 8 each end with one `cairn-implementer` dispatch. It runs the whole-tree
`check:docs-gate` and `check:facts` and commits the run's named files: the pages, briefs, fact
containers, map, friction log, and index. A `diff-reviewer` read follows that is limited to
file-set scope, not prose, since the register chain already reviewed the prose. Acceptance: that
commit's SHA is in the ledger before task 7 starts.

### PC-3 (major): the page records die with the conductor's context, but the close needs them

**Location:** plan `:455-460` (task 10 friction reconciliation), `:464-468` (HISTORY
measurements), `:110` (task 10 is one fold agent).

**Defect:** the close's fold agent must "reconcile every `frictionFiled` entry in the page
records against the log." It also writes the cross-regression rate, rows received and disposed,
and per-page cost into HISTORY. Subagents start with zero context, and neither task 6 nor task 8
persists the records anywhere. The record `crossRegression`, `rounds[].reads`, and the FV-11 row
counts exist only in the Workflow tool result the conductor saw. A compaction or the S3 session
split loses them, and the close cannot reconcile or count.

**Fold:** fold this into PC-2's commit. The run's per-page records are committed as a stage
record under `docs/superpowers/research/`, one section per page: status, round-1 and round-2
verdicts, cross-regression flag, rows received and disposed, `frictionFiled`, and PC-1's
per-page cost. Stage 1 already committed a stage record this way. Tasks 7 and 10 read that file.
This persists output the chain already produces and adds no new mechanism.

### PC-4 (major): task 3's receipt proof passes a runner that hands every page the whole map

**Location:** plan `:296-299`.

**Defect:** "a dry run on one pilot page ... shows its rows in the page-inputs prompt and in the
record" passes if the runner injects every row. The map is 1,379 paths or more by the spec's
crude count. That failure multiplies every page-inputs call's cost and makes FV-11's "rows
received" meaningless. The FV-10 outcome (`:282-284`, retagging agents rewrite the row and raise
the constant) also has no acceptance at all.

**Fold:** name the fixture map. It holds one `pending` row naming the dry-run page, one fact-id
row whose id is in that page's `factIds`, and one `pending` row naming a different slug. The proof
asserts that the first two appear in the prompt and the record and the third does not. Add that
the page-inputs and fact-read prompts both carry the FV-10 rewrite-and-raise rule, which is a
string check on the rendered prompt.

### PC-5 (major): the edit rule's scoped reviews have no dispatch in tasks 7 and 9

**Location:** plan `:166-168` (global constraint), `:107-109` (execution mode, tasks 7 and 9),
`:407-408` (task 7 fold), `:434-442` (task 9).

**Defect:** the global constraint, from the parent's `:391-398`, requires both reviews, scoped
to the changed sentences, on every post-chain edit other than a pure term or link substitution.
Task 7's owner fold and task 9's consistency batch are exactly those edits. The execution mode
dispatches only the consistency agent, an implementer, and `diff-reviewer`, and no register
editor or fact read. Neither task's acceptance checks that the reviews ran. So the rule is in the
plan, but no dispatch executes it.

**Fold:** tasks 7 and 9 each name one `cairn-register-editor` and one fact-read dispatch, scoped to
the changed sentences, for any non-substitution change. Acceptance: their verdicts sit in the
stage record (PC-3), and any `fix` is applied before the task's commit.

### PC-6 (minor): task 6's acceptance is met by six escalations

**Location:** plan `:384-385`.

**Defect:** "all six records returned" is true when every page escalated, because the runner
returns an escalated record (`:741-765`). The option-gate clause catches an escalation before
disposal, but not one after it, such as a second `fix` or a red gate at round 2. The per-page
cost is also undefined for a re-dispatched page.

**Fold:** each page is `accepted`, or it escalated and was resolved by a re-dispatch or a
recorded conductor ruling before task 7. A re-dispatch's cost counts in that page's total.

### PC-7 (minor): the qualifying-page rule is ambiguous on figure pages

**Location:** plan `:395-396`; runner `deriveCrossRegression` (`:725-736`) counts every read,
the figure verifier included.

**Defect:** a page qualifies when "exactly one reviewer returned `fix` in round 1." Three pilot
pages carry a third read, the figure verifier, and `bothReviewers: true` re-runs it. The plan
does not say whether it counts as a reviewer, so a figure-only `fix` can make a page qualify or
set the flag. The lean-versus-both decision is about the register editor and the fact read.

**Fold:** state that qualifying and the flag both count only the register editor and the fact
read. The conductor derives qualifying from `rounds[0].reads` filtered to those two. No runner
change is needed.

### PC-8 (minor): nothing fails a walk that runs wide

**Location:** plan `:186-188`, `:258-264`.

**Defect:** review focus 2 says "the recorded counts pin both" failure directions, but a
recorded count fails nothing. Only the stops-early direction has a failing fixture.

**Fold:** add one negative assertion to task 2's unit test. A `*Data` type member and an engine
component prop, both reachable in the fixture, are absent from the generated set. It costs one
assertion and adds no machinery.

### PC-9 (minor): task 2's fixture form and gate are underspecified

**Location:** plan `:224-225`, `:258-264`.

**Defect:** the walker reads `dist` declarations, but the acceptance does not say whether the
planted `CairnAdapter.editor` member goes into a synthetic `.d.ts` fixture or a rebuilt `dist`.
A test against the real `dist` passes or fails with whatever the last `npm run package` left. The
gate also omits `npm test`, although `pass-core` gives `engine-logic` "the repo's full gate" and
cairn's implementer gate is the targeted test, `npm run check`, and `npm test`. Task 2 edits
`docs-gate.test.ts`, and the new check joins a gate that every page and CI run.

**Fold:** the fixtures are synthetic declaration files in a temp directory, with the nested type
spelled out, and the gate adds `npm test`. Task 5's gate adds `npm test` for the same reason.
Task 3's gate adds the dotfiles `scripts/check.sh`, which runs the runner's dry-run tests.

### PC-10 (minor): where the pending-count constant lives decides whether "same edit" is possible

**Location:** plan `:158-161`, `:252-254`.

**Defect:** "lowers the pending-count constant in the same edit" holds only if the constant sits
in the map file. If it sits in the gate script, a disposal is two edits to two files, with three
page-inputs agents in flight. For a retag, the row flips to pending before the constant rises, so
a concurrent page gate sees `pending > constant` and goes red.

**Fold:** task 2 puts the constant in the map file. The rule reads "the same commit's diff, the
row before the constant for a disposal and the constant before the row for a retag," so the only
transient is always the passing direction.

### PC-11 (minor): the R10 approval and the outline fold have no ledger row

**Location:** plan `:16-21`, `:61-62`, ledger `:475-482`.

**Defect:** the Sequencing ruling correctly blocks tasks 2 onward on Geoff's R10 approval.
Before task 2 assigns slugs, the fold commit must also land, moving a cut page's `factIds` and
`covers`. Neither the approval nor the fold commit has a place to be recorded. The parent's flow
step 1 requires "the plan cites the resulting commit."

**Fold:** add a ledger row, "R10 approval and outline fold (keep or cut: `configure-media`,
`gate-your-site-with-cairn-audit`)," with its commit. Task 2's entry condition cites it.

### PC-12 (minor): task 7's fold contradicts the plan's own thin-conductor rule

**Location:** plan `:179` against `:407-408`.

**Defect:** the global constraint says the conductor "never reads a page, a diff, or a gate
log." Task 7 has the conductor diff Geoff's saved version against the repo and apply it. The
parent (`:343-345`) assigns the fold to the conductor, but the workstation rule and this plan's
own constraint both forbid it.

**Fold:** one Sonnet agent reads back the saved version, diffs it, applies it with briefs, and
reports. The conductor rules on generalizing notes from that report, and PC-5's scoped reviews
follow.

### PC-13 (minor): smaller criterion gaps

- **Task 5 (`:355-357`).** "The test still fails if its source page vanishes" has no proof. Add
  the assertion to the test itself: the source file exists, or the case is marked synthetic.
- **Task 7 (`:399-400`).** "Fixed in the runner before task 8" is a dotfiles `engine-logic`
  change with no gate or review named. Name the task 3 gate and a `diff-reviewer` read.
- **Task 7 (`:402-406`).** The re-derived plan's pass line is unstated. The parent's
  checkpoint says 24M, and the plan's ruling is a 25M ceiling with a 20M flag. State that the
  chosen chain's re-derived total must sit under the 20M flag, which is the 80 percent rule.
- **Task 9 (`:440-442`).** The acceptance requires the record committed, but not that each
  finding was applied or refused with a reason. Add it.
- **S1 boundary (`:98-102`).** The merge of `main` into the branch is a boundary commit with no
  gate named. Run the task 5 gate on the merge commit before task 5 dispatches.

## Lean guard verdicts (from this lens)

| Mechanism | Prior art | Failure found | Rides | Verdict |
| --- | --- | --- | --- | --- |
| Option coverage | typescript-eslint `docs.test.mts`, Terraform generate-then-diff, Betterer (spec `:89-91`, `:120-123`) | `editor.publishActions`, `editor.preview`, `editor.nav`, fieldset `refine`, `summaryFields`, `ComponentDef`, `media` (spec `:91-93`) | page inputs, `docs-gate.mjs` (spec `:93-94`) | Passes. The FV-10 raise path is an owed fold item, not new machinery. |
| Release sweep | Kubernetes docs deadline, Rust docs-before-stabilization, doc-gardening agent, READU (spec `:139-141`) | `SCF-1` to `SCF-25`, `CLN-1` to `CLN-15` (spec `:141-142`) | `cairn-release` (spec `:143`) | Passes. |
| Friction route | Rust RFC guide-level explanation (spec `:175-177`) | DAD-1, DAD-2, EXB-4, EXB-5 (spec `:172-175`) | the drafter's `frictionFiled` route (spec `:178-180`) | Passes. |

None of this lens's folds adds a mechanism. Each one names a source (PC-1), an owner (PC-2, PC-5,
PC-12), a persisted artifact the chain already produces (PC-3), or a fixture (PC-4, PC-8, PC-9).

## Owner gates

- **R10 approval** blocks tasks 2 onward (`:61-62`). That is correct. Task 4 and the S1 friction
  step do not depend on the outline, but holding them costs nothing, so no change. The gate lacks
  a ledger row (PC-11).
- **Pilot sitting** blocks task 8 dispatch (`:410-411`). That is correct, and it blocks nothing
  earlier. Task 7's relink bullet runs before the question. The merge pre-authorization rides the
  same question, which is correct.
