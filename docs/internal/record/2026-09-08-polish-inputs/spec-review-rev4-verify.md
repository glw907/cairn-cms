# Polish spec revision 4, verification read

Fresh-context verification of `docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 4
as it stands uncommitted on disk, plus the two amendment clauses added to
`docs/superpowers/specs/2026-09-08-docs-standard-design.md` and
`docs/superpowers/plans/2026-09-08-docs-toolset-pass.md` (Opus, read-only, 2026-09-08). Four things
were checked: fold fidelity against
`spec-review-rev3-fold.md` (all twenty grounding findings, all seventeen charter findings, and
eleven of the thirteen risk findings sampled), revision 4's internal consistency, the two amendment
clauses' accuracy against the sentences they quote, and the register floor. Fold fidelity is clean:
every finding the fold marks taken carries the correction the review asked for, in substance and not
in paraphrase, and nineteen spot-checks of `file:line` anchors, gate names, ruling slugs, and counts
resolved against the working tree. Seven failures follow, all of them in the seams between the four
documents rather than in the folded corrections themselves, and five of the seven are in the two
amended documents rather than in the spec.

## Failures

**1. Polish-C task 10 writes `docs/STATUS.md`, which the spec forbids a task to do three times
elsewhere.** Spec `:461`: "ROADMAP's audit-remediation entry closes; **the four consumer sites'
upgrade named in STATUS as the next action**; the free number verified with `npm view`". The rule it
breaks is stated at `:520` ("The conductor edits `docs/STATUS.md`, never a task"), and 11a's and
11b's records tasks each carry the guard sentence in their own text (`:232`, `:317`). Polish-C's task
10 is the one records-shaped task with no such sentence. This is the exact defect grounding finding 6
and charter finding 9 raised against revision 3's Task 16; the fold struck STATUS from both records
tasks and did not reach polish-C. Fix: reword to "the conductor names the four consumer sites'
upgrade in STATUS at merge", and append the same guard sentence 11a's and 11b's records tasks carry.

**2. The toolset plan still calls P1 a hard stop on the figures substrate, in the paragraph the
amendment did not reach.** `2026-09-08-docs-toolset-pass.md:504-505`, P1's Notes: "this is the one
task that can stop the whole pass, and **it stops on one thing only, the figures substrate**." The
amendment removed the stop in three other places (the global constraint at `:190-194`, pre-task 1 at
`:346-352`, and P1's Step 1 at `:435-437`, which now reads "The plan has no hard stop"). A 2a plan
author who reads the task's own Notes, the last word inside the task, stops the pass on a
precondition decision 13 abolished. Fix: rewrite the sentence to "no precondition stops this task;
it records every one of them", since the amendment already leaves P1 with nothing to stop on.

**3. Chain D's acceptance criteria and the pass-end gate list still depend on a committed figures
substrate.** `:1682-1684`: "the page's current `check:figures` run is whatever **the committed
figures substrate already asserts**"; `:2031` lists `check:figures` among "the repository's own"
gates the pass runs at its close. Under decision 13 there is no committed substrate and
`check:figures` is not a script on `main`, so the first sentence names a baseline that does not
exist and the second names a gate command that exits non-zero. Chain D is also the chain the same
amendment reorders, so a plan author is reading these lines. Fix: strike the `check:figures` clause
from `:1682-1684`, and mark `check:figures` in `:2031` as landing with the extend stage rather than
as an existing repository gate.

**4. The docs standard spec presupposes `check:figures` already exists on `main` in seven places, not
the four the fold reported.** `:500` ("`check:figures` must **grow from a staleness check** to seven
mechanical assertions"), `:543` (CI runs it in the per-page loop), `:632` (the gate column of the
quality table), `:710` (unit 5a, "**Grow** `check:figures` to the seven assertions"), `:1024` (unit
3b's contents), `:1035` (unit 3b acceptance), and `:1156` ("The full `npm test` gate passes, which
includes ... `check:figures`"). The amendment at `:1106-1128` withdraws the precondition and says the
initiative "produces its own figures in its own stages", but never says the initiative writes the
script, so unit 5a still reads as an edit to an existing gate and `:1156` asserts a gate membership
that is false today. The two load-bearing ones are `:710` and `:1156`. Fix: one clause in the
amendment stating that `check:figures` and `scripts/figures/` are authored by unit 5a rather than
grown, and that no acceptance criterion may name `check:figures` before that unit lands.

**5. Polish-C ships no `docs/HISTORY.md` entry.** Task 10's deliverables (`:456-464`) are the
CHANGELOG entry, the migration notes, `api-surface.md`, the grep sweep, `check:snippets`, ROADMAP,
STATUS, the `npm view` check, and `cairn-release`. HISTORY is absent, while Sequencing's "Ledger
ownership" (`:517-519`) gives each pass `docs/HISTORY.md` for its own window and both 11a's task 10
and 11b's task 12 write one. Polish-C is the pass that closes the initiative and cuts the release, so
its window is the one a later reader most needs in HISTORY. Fix: add the HISTORY entry to task 10's
list.

**6. The one-e2e-slot rule and the pass 2a allowance contradict each other inside one section.**
`:534-535`: "Each pass therefore runs as a single chain ... and **no two passes gate concurrently**."
`:539`: "**Pass 2a may branch when the machine frees** and is gated by neither 11a nor 11b." Pass 2a
runs gates (its own gate list is `2026-09-08-docs-toolset-pass.md:2028-2033`) and runs seven chains
in parallel worktrees through `pass-execute-chains`, so both sentences cannot hold. The underlying
constraint is narrower than the sentence states: the collision is port 4173, which only the showcase
e2e binds, and 2a's chains never run it. Fix: scope the rule to the e2e ("no two passes run the
showcase e2e concurrently"), which is what the evidence in the same paragraph actually supports.

**7. D6 is listed twice with no qualification covering it.** It appears in "Findings not taken"
(`:483-484`, "prose in a file the transcript re-record does not touch; banked for the rewrite") and
inside the banked range at `:364` ("`docs-sweep.md`'s findings 1 through 30"). The banked paragraph
names four qualifications "so no number has two fates" and D6 is not among them, so a plan author
running the empty-carry-list check finds an unqualified duplicate. The two fates agree, which is why
this ranks last. D21 is listed twice as well and is covered, since the fold ruled that placement
deliberately. Fix: add "and D6, whose docs half is the only half" to the qualification sentence, or
drop the "Findings not taken" bullet, which the banked paragraph already covers.

## Routing table check

Population: 81 sweep ids, D1 through D30, F1 through F21, A1 through A30.

- **Routed exactly once: 78.**
- **Missing: 0.** Every A number resolves to a task or to "Findings not taken"; every F number
  resolves to a task, "Findings not taken", or the banked paragraph; every D number resolves to a
  task, "Findings not taken", or the blanket "findings 1 through 30" banked range.
- **Listed more than once: 3, none with conflicting fates.** **D6** (`:483` "Findings not taken" plus
  the `:364` banked range, unqualified: failure 7). **D21** (`:367` qualification plus `:485`
  "Findings not taken"; the fold ruled this placement deliberately so the carry list keeps a
  disposition for the number). **F1** (11a task 3 for `DeleteRefusal` and 11a task 4 for
  `MediaDeleteRefusal` and `BulkDeleteSkip`); one finding split across the two files two tasks own,
  which is a split rather than a double route.

Routing by slot, verified line by line:

- **A ids:** A1, A2, A14, A24, A25 to 11b task 1; A4 to task 2; A3, A6, A16 to task 3; A29 to task 4;
  A5, A7, A19, A26, A27 to task 5; A8, A15 to task 6; A17, A18, A20 to task 7; A21, A22, A28, A30 to
  task 8; A9 through A13 to task 10; A23 to "Findings not taken". Thirty, no gaps.
- **F ids:** F1 to 11a tasks 3 and 4; F2, F4, F5, F6 to 11a task 8; F3, F20, F21 to polish-C task 4;
  F14, F17 to task 3; F18, F19 to task 5; F11, F13 to task 6; F15 to task 8; F7 through F10 banked;
  F12 and F16 in "Findings not taken". Twenty-one, no gaps.
- **D ids:** D5, D10, D27 to 11a task 6; D11, D12 to 11a task 5 with their docs halves banked; D1
  banked with its ruling half in decision 10; D16 moot; D21 to stage five; D6 to "Findings not
  taken"; the remaining twenty-two inside the banked 1 through 30 range. Thirty, no gaps.

Also checked and found consistent: the numbering (11a, 11b, 12) matches in the title, the status
line, decision 9, all three section headings, the dispositions table, and Sequencing, with no
surviving "polish-A" as a live pass name; the ceilings and intervals match between each pass's own
paragraph and the Sequencing roll-up (4.5M at three tasks, 5.5M at four, 7M at four, 17M total); the
Reconciliation semantic column is present at `:507-516`; the dispositions table carries exactly
eighteen rows, matching the Inputs line; 11a lists ten tasks, 11b twelve, polish-C ten, and the
consumer table ten lines; and no reference to a substrate commit or to committing Geoff's front-door
files survives anywhere in the spec (`:73` and `:543` are negations).

Fifteen anchor spot-checks resolved correctly: `admin-design-system.md:1215-1216` (floating-card
recipe), `:451` and `:476-480` (`OfficeList` prose), the eight `AdminLayout` references at `:128`,
`:135`, `:532`, `:543`, `:565`, `:1001`, `:1005`, `:1184`; `reproductions-manifest.test.ts:41`;
`admin-toolkit.md:669` (the `OfficeList` fence); `CairnMediaLibrary.svelte:29`; `ambient.ts:48` and
`guard.ts:348`; `composition.css:20`; `format.ts:87-93`; `content-routes-entry.ts` at 1,630 lines
with `:222`, `:279`, `:287`, `:357`, `:416`, `:922`, `:1013`, `:1266`, `:1481` all as described;
the eight sibling `Reload and` strings across five files plus the two inside
`content-routes-entry.ts`; `when-something-goes-wrong.md:34`, `:39`, `:105`, `:119`;
`render.md:13`; the four `create-cairn-site` strings; `playwright.config.ts`'s port 4173;
`2026-08-27-audit-remediation-initiative-design.md:122-124`, `:137-139`, and `:140-143`; and all
sixteen ruling slugs the spec names, each present in `engine-rulings.md`. CI runs thirty-one `npm run
check*` steps, matching the gate paragraph's count.

## Held

- **Both amendment clauses quote their originals verbatim.** The docs standard clause quotes
  `:1100-1101` ("Polish-B folds here except its code half. Tasks 2, 8, and 9 and the
  `check:reference` change in task 5 stay in polish-B, which merges before the harvest branches") and
  `:1096` ("Polish-D's substrate commit and its figure and form tasks stay where they are") exactly.
  The toolset clause quotes "The owner commits the figures substrate", "This is the pass's one hard
  stop", and "The owner commits it before P1" exactly, and each matches the text the diff removes.
  Every minimal line edit the clauses describe exists in the diff: the `365` figure replaced by 267
  and 464, the sequencing paragraph rewritten, the global constraint rewritten, pre-task 1 rewritten,
  P1 step 1 rewritten, the preflight-map lines rewritten, the `package.json` reconciliation row
  rewritten, chain D's intro and the merge-order line both carrying the wait on polish-C.
- **The fold record cites the wrong line for decision 10's proving source; the spec is right.** The
  fold and the charter review both say `docs/HISTORY.md:516-518`; the 2026-08-19 Workers Paid ruling
  is at `:594-596`, which is what the spec cites.
- **One anchor has drifted by one line.** 11b task 9 cites
  `examples/showcase/src/hooks.server.ts:33` for the bare `createAuthGuard()` call, which sits at
  `:32` today. The claim itself is true, `defineAccess` appears nowhere under `examples/showcase/src`,
  and the spec's own anchor-reconciliation-at-dispatch rule covers the drift.
- **The docs standard amendment cites `:871-875` for a sentence the same diff already removed.** The
  withdrawal is correct in effect; the line reference now points at the replacement text rather than
  at the withdrawn sentence.
- **The toolset plan's R1 Notes still name polish-B as the amendment's deadline** (`:1806`, "before
  polish-B's plan is authored"). The paragraph is a narrative about revision 1's ordering, so it
  misleads rather than instructs, and the amendment above it supersedes the deadline.
- **Polish-C states no per-task deliverable count**, while 11a and 11b both carry the sentence
  charter finding 10 asked for. Charter 10 was written against revision 3's Task 16, so this is
  outside the fold's scope, but polish-C's task 10 is now the largest single task in the three passes.
- **Decision 5 gives two engine `file:line` proofs**, `ambient.ts:48` and `guard.ts:348`, where the
  fold record claims four. Both resolve, and 11b task 9 carries the two showcase proofs, so the
  substance the charter review asked for is present.
- **The register floor is clean on all four files.** a `grep -c` for the em dash is 0 on the polish spec, the docs
  standard spec, the toolset plan, and the fold record. No "not X but Y" frame appears in the polish
  spec or in either diff's added lines, and no added line opens with a participle or a connector.
