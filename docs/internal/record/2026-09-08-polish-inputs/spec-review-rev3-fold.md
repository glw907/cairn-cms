# Polish spec revision 3, three-lens review fold

The disposition of every finding in the three reviews of
`docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 3, folded into revision 4 on
2026-09-08. Fifty findings: twenty from the grounding lens, thirteen from the risk and sizing lens,
seventeen from the charter and precedent lens.

**Counts: 48 taken, 0 declined, 2 superseded by ruling.**

Geoff's five rulings of 2026-09-08 evening (R1 the split into slices 11a and 11b, R2 the dropped
front-door substrate commit, R3 the doctor-transcript re-record returned to polish, R4 the two
docs-standard amendments, R5 the named folds) override any finding that argues otherwise. A finding
whose subject a ruling removed is recorded as superseded rather than declined.

## Grounding lens (`spec-review-rev3-grounding.md`)

| # | Subject | Disposition | Where it landed |
|---|---|---|---|
| 1 | Ledger annotation undercounts by nine event rows | Taken | Polish-C task 9: the population is stated as types, functions, and event names, the nine event rows are enumerated, and the gated grep derives the count instead of the pinned seventeen |
| 2 | The `Reload` sweep breaks `check:editor-quotes` | Taken | 11a task 5 carries the `docs/editors/when-something-goes-wrong.md` edit at `:34`, `:39`, `:105`, `:119`, named as gate-driven mechanical text and carved out of the defer-to-the-rewrite rule |
| 3 | Chassis-B2 keeps the `requireOwner` shape 11b removes | Taken | Sequencing gains "The Reconciliation block carries a semantic column", naming B2 task 6's kept-deliberately comment and 11b task 10's overrule |
| 4 | The friction log has zero open entries | Taken | Inputs reads "no open entries as of 2026-09-08"; both records tasks verify the log is still empty rather than triaging it whole |
| 5 | Polish owns the shared ledger files only after B2 merges | Taken | Sequencing "Ledger ownership" states the sequential condition; the dispositions table is reconciled against post-B2 `ROADMAP.md` |
| 6 | STATUS written both by a task and never by a task | Taken | STATUS struck from both records tasks; Sequencing names the conductor as its only writer and says what it writes |
| 7 | "Ten sibling `Reload and` strings" is eight plus two | Taken | 11a task 5 enumerates the eight across five files and the two inside `content-routes-entry.ts` |
| 8 | The two specs are out of sync; A29's banking is unilateral | Taken | R4's amendment clause in `2026-09-08-docs-standard-design.md`; A29 removed from the banked set and routed to 11b task 4 |
| 9 | `VocabularyAdmin.svelte`'s "three strings" is about ten | Taken | 11a task 5 enumerates by grep at plan authoring and says the sweep's three anchors miss the count labels D12 names |
| 10 | "365 in-tree files" reproduces from nothing | Taken | Risks states the measured method and both numbers (464 tracked, 267 excluding write-once archives); `docs-standard-design.md:863` corrected in the same act |
| 11 | The four line ranges strand a 423-line prelude | Taken | 11a task 1 states the ranges are cluster bodies and partitions the prelude by named helper with each `file:line` |
| 12 | "Runs the component suite" adds nothing | Taken | Struck from polish-C task 1; the gate paragraph states `npm test` already includes the component suite, and task 7's real dependency is named as the unit test it is |
| 13 | `check:rulings-format` missing from the gate | Taken | The gate paragraph names it explicitly for all three passes, with the reason it sits outside `npm run check` and `npm test` |
| 14 | The showcase has no `access` declaration to share | Taken | 11b task 9 states that it authors the showcase's first declaration, with the two `file:line` proofs |
| 15 | D5, D6, D10, D27 mis-grouped | Taken | 11a task 6 carries D5, D10, and D27; D6 is named as a separate prose fix and appears in "Findings not taken" as banked |
| 16 | "Findings 1 through 30" double-routes four numbers | Taken | The banked paragraph carries four qualifications for D11, D12, D1, D21, and D16 |
| 17 | Tasks 6 and 7 both inside the independent block | Taken | Resolved by the single-chain rule (risk 3) plus Sequencing's "Task order inside a pass", which states 11b task 4 precedes task 5 |
| 18 | "The four outliers" enumerates six | Taken | Consumer line 9 enumerates all six event strings and says six is the number |
| 19 | `MediaDeleteRefusal` has a third naming site | Taken | 11a task 4 names `CairnMediaLibrary.svelte:29` beside the two reference pages |
| 20 | Slice 10 for the identity seam has no basis | Taken | Numbering says the spec proposes the number and the reclassification, and that the numbers are initiative slots rather than merge order |

## Risk and sizing lens (`spec-review-rev3-risk.md`)

| # | Subject | Disposition | Where it landed |
|---|---|---|---|
| 1 | Pass 2a chain D and polish-C task 1 both own one page | Taken | Sequencing "Pass 2a and the docs initiative" orders chain D after polish-C merges; written into the toolset plan's amendment clause, its chain D intro, and its merge-order line |
| 2 | The substrate commit lands two red gates | Superseded by ruling | R2 drops the substrate commit; no pass commits the proposal, the figures, or `check:figures`, so `check:docs` and `check:arm-indexes` never see them |
| 3 | Port 4173 is the binding constraint, not two gates | Taken | Sequencing "One end-to-end slot per machine": one chain per pass, no e2e task in a parallel block, no two passes gating concurrently, and the from-scratch qualifier with the reinstall as a pre-dispatch step |
| 4 | Sixteen tasks at 7M is below the measured band | Taken | R1's split into 11a (ten tasks, 4.5M) and 11b (twelve tasks, 5.5M), each ceiling stated against the 370K to 530K band |
| 5 | Anchor reconciliation is written for polish-A only | Taken | Sequencing makes it every pass's first step and states polish-C's plan is authored after 11a and 11b merge, with the module map as input |
| 6 | Task 1 is three tasks and carries the string sweep | Taken | The entry split is 11a tasks 1, 2, and 3; the product-copy sweep is task 5, after both splits land |
| 7 | The `OfficeList` reproduction story does not exist | Taken | Polish-C task 1 states there is one reproduction, `toolkit/custom-screen`, pinned by `reproductions-manifest.test.ts:41`; task 7 touches no reproduction |
| 8 | Task 7 omits two files carrying `OfficeList` in prose | Taken | Polish-C task 7 names `admin-design-system.md:451` and `:476-480` and deletes the `admin-toolkit.md:669` fence in the same commit as the export |
| 9 | The conductor commits files it did not author | Superseded by ruling | R2 and decision 13: the files stay in Geoff's working tree, unowned; the toolset plan's owner-commits pre-task is withdrawn |
| 10 | The `Consumers must:` exposure is the whole window | Taken | Risks states 1,542 lines and 69 occurrences across fifteen passes; polish-C task 10 reconciles the whole migration-notes `## Unreleased` section and states the sites' order |
| 11 | The records task is the largest deliverable, positioned last | Taken | R1's split gives each pass its own records task; the ledger rows move into the tasks that earn them (charter 4), and the friction log is a verification |
| 12 | The deferral leaves no gate red, and the cost is unnamed | Taken | The transcript half is superseded by R3, which returns the re-record to 11a task 6; the surviving F7 deferral carries a named cost sentence, and the fixture-never-checks-the-tool mechanism is a Risks bullet |
| 13 | The gate omits four doc gates | Taken | Replaced by the CI-derived gate rule (charter 8), which subsumes every omission; `check:figures` is not among them, since R2 leaves it uncommitted |

## Charter and precedent lens (`spec-review-rev3-charter.md`)

| # | Subject | Disposition | Where it landed |
|---|---|---|---|
| 1 | The two deferred code items have no receiving unit | Taken | R3: the doctor re-record is 11a task 6; F7 stays deferred with its reason stated; both docs-standard documents amended per R4 |
| 2 | A29 banks into a ledger that cannot receive it | Taken | 11b task 4 corrects the eight `AdminLayout.svelte` references in the task that already opens the file |
| 3 | `.cairn-card` is a category error | Taken | Decision 8 and polish-C task 1 name `admin-design-system.md:1215-1216`'s floating-card recipe; the dispositions row retires `.cairn-card` as a chassis observation with no action |
| 4 | Ledger rows and CHANGELOG lines concentrated in one task | Taken | Both passes' Shape paragraphs restate the initiative's per-task constraint; the busy-idiom row moves to 11b task 4 and the `formatTimestamp` row to 11b task 11 |
| 5 | Four CLI strings contradict decision 10; D1 has no proving source | Taken | The four strings join 11a task 5 as product copy under decision 10; decision 10 names D1's `owner` tier source at `docs/HISTORY.md:594-596` |
| 6 | The conditional cut weakens a ratified ruling | Taken | "The cut is the default, not a judgment call" quotes `2026-08-27-audit-remediation-initiative-design.md:122-124`; The aim drops the conditional |
| 7 | `DevBackendOptions` escapes the family set | Taken | Consumer line 2 adds `DevBackendOptions` to `DevBackendConfig`; decision 6 states the set covers both published packages |
| 8 | Enumerated gate lists are memory-derived | Taken | The gate paragraph replaces both enumerations with the CI-derived rule and names `check:rulings-format`, with the full-format block as a plan acceptance criterion |
| 9 | The spec contradicts itself on STATUS | Taken | Same fold as grounding 6 |
| 10 | The records task is eight deliverables | Taken | Same fold as risk 11; both plans state a deliverable count per task in the header |
| 11 | Amendments have no quotable source | Taken | The Decisions preamble states that each clause cites this spec by path and date, quotes Geoff's words where they exist, and says so rather than inventing a sitting quotation; polish-C task 5's clause takes task 2's shape |
| 12 | The slice numbers have no writer and merge out of order | Taken | Numbering says the numbers are initiative slots, not merge order; 11a task 10 retro-numbers the chassis-B1 and identity-seam HISTORY headings |
| 13 | The substrate commit strands two STATUS blocks | Taken | The substrate half is superseded by R2; the surviving half lands in Sequencing "Ledger ownership", where the conductor writes the numbering, the three tracks, and the cairn-case closure |
| 14 | Polish ships six ROADMAP sub-bullets and closes none | Taken | Each records task closes the sub-bullets its own pass ships, named in 11a task 10 and 11b task 12; polish-C task 10 keeps the entry's final close |
| 15 | The `formatTimestamp` row should correct the closed row | Taken | 11b task 11 states the correction and the rule form, "every shape that names its own zone" |
| 16 | Decision 5 describes new surface where none exists | Taken | Decision 5 reworded as dev-handle parity with the existing `locals.cairnAccess`, with the four engine `file:line` proofs |
| 17 | The friction-log input line is false | Taken | Same fold as grounding 4 |

## Notes on the two ruling conflicts

- **Charter 5 against R1's task lists.** R1 enumerates what 11a and 11b carry, and CLI copy is in
  neither list. The four `create-cairn-site` strings are folded into 11a's product-copy sweep rather
  than given a task of their own, because they are the same shape as the task's other three string
  sets (shipped product copy a ruling binds, swept in one commit, the CLI suite already in the gate)
  and because decision 10 leaves them as the only remaining drift no other pass or stage reaches.
  The pass gains no task.
- **R2 against D21.** R2 directs the deletion of the "Findings not taken" entries "D16/D21 that
  pointed at" the substrate. D16 pointed at it and is deleted, replaced by a moot ruling in the
  banked paragraph. D21 pointed at the rewrite's stage five, not the substrate, so it stays in
  "Findings not taken" under decision 12; deleting it would leave a sweep number with no
  disposition and break the empty-carry-list check.
