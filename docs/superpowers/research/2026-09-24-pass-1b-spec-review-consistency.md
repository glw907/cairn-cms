# Pass 1b spec review: consistency lens

**Target:** `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md` at
`30083f27`. **Lens:** does the draft contradict a ratified document, or change its meaning
without saying so? Checked against the parent spec (amendments, pass 1 items 2, 3, 8, 9, pass 2a
items 4 and 5, budgets), the pass 1 plan (Task 4, Task 11, the ledger's "4 prep", "11 pre-flight",
"11", and "decision" rows, the post-mortem), the validation record, `ROADMAP.md`'s docs reset
entry, `docs/STATUS.md`, and the repo `CLAUDE.md`.

**Counts:** 0 blocker, 4 major, 7 minor. Line numbers are the target spec's unless stated.

## Figures that check out

- 35 of 48 false positives from `ruleCandidates[]` only, 8 harness artifacts (record:270-272).
- Opus 26 of 26 and Sonnet 8 of 13 final attempts verified (record:302-305).
- 17 plants (record:58-78); 24 plants = 6 jobs x 4; 72 plant-run pairs = 24 x 3.
- The "2 of 3" fragility: per-plant pass probability at 0.9 recall is
  0.9^3 + 3(0.9^2)(0.1) = 0.972, and 0.972^17 = 0.617. "About 60 percent" holds.
- 37k tokens per run: 1,750,056 counted tokens (record:317-318) over 47 attempts (39 + 8 reruns)
  is 37.2k. See minor 5 for what that figure leaves out.
- Run counts: mapping 6 x (3 + 1) + 3 scripter pre-fix = 27; planted 6 x 4 = 24; tuning 2 x ~24.
  Total about 99, so "about 100" and 3.7M hold arithmetically.
- "Three or four jobs" per trial page matches parent pass 2a item 4.
- Six jobs: evaluator (`why-cairn.md` and its docs set), operator (`is-it-working.md`), designer
  (`design-your-site.md`), extender (`add-a-custom-admin-screen.md`), core developer
  (`CONTRIBUTING.md`), scripter (the three `cli-cairn-*` contract pages). The spec never lists
  them, but "each of the six pass 1 jobs" resolves unambiguously through plan Task 4.
- Citations: Petersson, Thelin, Runeson, and Wohlin, "Capture-recapture in software inspections
  after 10 years research: theory, evaluation and application", *Journal of Systems and
  Software* 72(2), 2004, is correct as cited. Mills 1972 (IBM report on statistical validation
  by seeding), Nielsen and Landauer 1993 (INTERCHI), Virzi 1992 (*Human Factors*), Faulkner 2003
  (*Behavior Research Methods*), Hwang and Salvendy 2010 (*CACM* 53(5)), and arXiv 2411.15594
  ("A Survey on LLM-as-a-Judge") are plausible as written. The problems are in what two of them
  are cited *for* (major 4).

## Major

### M1. The held-out defects are not unseen, so the test set claim is false (47-55)

"Nothing in the test set is seen before the freeze" (54-55) and "The conductor has read all of
[the development set]" (50-51) put the held-out half of pass A's defects in the test set. But the
validation record the conductor has read lists all nine held-out defects by id and subject, and
records per-run near misses for four of them (record:101-122). The pass 1 plan's split
(ledger "4 prep" row: held out D01 D03 D06 D08 D09 D10 D12 D16 D18; tuning D02 D04 D05 D07 D11 D13
D14 D15 D17 D19) was built to keep them blind, and pass 1 already spent that blindness. The spec
also never states the counts: 10 tuning, 9 held out, of the amendments' 19.

**Fold:** state the split and counts (10 tuning, 9 held out, per `0e7f4eb9` and the ledger row),
and say the held-out half is seen: its subjects and pass 1 scores sit in the development-set
record. Since the scripter's held-out recall is already reported-only (133-134), the cheapest
fix is to reclassify it as a development-set comparison against pass 1's 1 of 9, not a test-set
measure. Tuning (86-87) must then be barred from using held-out subjects explicitly, not only by
the "no development-set item" rule, which as written permits it, since they would now be
development items.

### M2. The simulation assumes four trial pages; the parent specifies three (39-45, 157-159)

Parent pass 2a item 4 fixes "the three trial pages" (`schedule-a-check`, a theme guide, a
building-blocks concept page), and the parent budget's six full-chain and six minimal-chain
drafts is three pages x two drafts. The spec's simulation and its "Finding for pass 2a" both say
four pages. The direction of the conclusion survives (a reviewer re-simulation with Poisson
defects at mean 6, two drafts per chain per page, three runs unioned, the one-third rule gives
about 50 percent keep for a true one-third effect at both three and four pages), but a spec that
directs pass 2a to resize its trial must describe the trial it is resizing. The "about 10
percent" false-keep figure could not be reproduced (the re-simulation gives 2 to 7 percent), so it
rests on unstated assumptions; the record promised in 180 must state them.

**Fold:** rerun with three pages, report both numbers with the defect-count distribution and
drafts-per-chain assumptions stated in the spec, not only in Task 0's record.

### M3. The spec amends pass 2a item 5 without an erratum in the parent (7-9, 155-160)

The spec claims to replace only parent pass 1 items 8 and 9 (4-5), but it also changes pass 2a:

- Parent item 5: "Each final draft gets three reader runs, split between Opus 5.5 and Sonnet 5."
  The owner ruling "Gated runs are Opus 5.5 only" (9) and line 159-160 reopen that split.
- Parent item 5's decision rule is "fixed now"; line 158-159 requires resizing the trial or
  restating the rule.
- Parent item 5's grader comparison runs over "the labeled defect set (the planted set plus pass
  A's 14)". After 1b, "the planted set" is ambiguous (pass 1's 17 or 1b's 24 test plants), and
  both pass 1's plants and the tuning half are now development items the reader was tuned on.
  Comparing the old profile grader against a reader tuned on the same labels biases the
  comparison toward the reader, which is exactly the decision that comparison exists to make.

The parent's "Amendments" section says it wins over the parent body, and it names none of this;
a pass 2a planner who reads the parent first reads the pre-1b text as governing.

**Fold:** widen line 4-5 to name the pass 2a item 5 consequences, and add one amendments bullet
to the parent ("Pass 1b's spec replaces pass 1 items 8 and 9 and reopens pass 2a item 5's reader
model split, decision rule, and labeled set; see ..."). Name which labeled set the grader
comparison uses: recommend the 1b test plants only, since they are the only labels the reader
was not tuned on. OWNER FORK on the Sonnet share: (a) decide now that trial runs are Opus only,
consistent with the gated-runs ruling; (b) leave it to Sonnet's reported 1b results, as drafted.
Recommendation (b), but state the deciding threshold now so it is not fitted after the fact.

### M4. Two bar sources do not support the numbers they carry (122-123)

- "80 percent is the common mutation-testing adequacy bar" is attributed through the evidence
  list to Petrović and Ivanković. That paper (Petrović, Ivanković, Kurtz, Ammann, Just, "An
  Industrial Application of Mutation Testing: Lessons, Challenges, and Research Directions") is
  a Mutation workshop paper at ICSTW 2018, not the ICST main track, and Google's practice it
  reports deliberately surfaces individual mutants in review rather than gating on a mutation
  score. An 80 percent threshold is a tool default (PIT, Stryker's "high" band), not that
  paper's finding.
- "About 60 percent is the best case for formal inspections (capture-recapture literature)" is
  not what the capture-recapture literature measures: Petersson et al. evaluate estimators of
  remaining defects, not inspection effectiveness. The inspection effectiveness figures usually
  quoted (Capers Jones, Fagan) put formal inspections at roughly 60 to 65 percent on average, with
  best cases well above that, so "best case" inverts the claim.

Since the owner delegated these calls "to evidence" (9-11) and the spec promises each bar names
its source, a miscited source is a consistency defect against the spec's own ruling.

**Fold:** re-source both (cite a tool default or say "judgment" for 80 percent; cite the
inspection effectiveness source for 60 percent and call it an average, not a best case), and
correct the venue to ICSTW 2018 (Mutation workshop). The Arize citation is a vendor blog; label
it practitioner guidance.

## Minor

1. **The standing regression floor is dropped silently (whole spec).** Parent item 8 ("The
   planted set becomes a standing regression floor") and plan Task 11 ("a standing regression
   batch in `scripts/docs-readers/batches/`") are replaced without the spec saying what becomes
   of the floor. Fold: state whether 1b's frozen test batch becomes the regression floor, or that
   the floor is retired, and why.
2. **Baseline failures move from gate to report without saying so (130-135).** Parent item 8 and
   Task 11's third acceptance bullet gated on catching the baseline's real failures (F1 to F6,
   R1 to R4). The spec reports "recall on the known on-path real defects" only. That is a legal
   change under 4-5, but it is the change that absorbs pass 1's F3 and F5 misses, so it should be
   named. Fold: one sentence under Bars.
3. **"Every missed plant sat off the path" overstates the record (18-19).** The record hedges
   ("Going by the reports", record:91-94) and gives three examples; P05 and P06 were caught by one
   Opus run, and P12 and P14 have no stated path cause. Fold: "The record traces the misses it
   examined to runs that never reached the planted section."
4. **"35 ... and 8" reads as disjoint (20-21).** The record says the groupings overlap
   (record:272-273). Fold: add "(the groups overlap)".
5. **The 37k figure understates per-planned-run cost (164-166).** 37.2k is per attempt including
   reruns; per final run it is 44.9k (1,750,056 / 39), and pass 1 reran 8 of 39. The budget counts
   planned runs only, and the new `steps[]` and `diverged[]` fields add output. At 45k, 100 runs
   is 4.5M before the planter and scoring, near the 4.8M flag. Also, the parent budgets pass 2a
   reader runs at about 100K each; the two figures should be reconciled or the counting rule
   (counted tokens exclude cache reads, per the ledger "4 pre-flight" row) named. Fold: budget at
   45k per planned run plus a rerun allowance, and say which counting rule the figure uses.
6. **"Pass 1's ruling 5" is ambiguous (100).** The parent spec has its own numbered Rulings, and
   its ruling 5 is organization size. The intended ruling is the plan's Task 11 pre-flight ruling
   5 (ledger "11 pre-flight" row), which also counts "the report text", so "as ... ruling 5
   defines it" must say the field set is narrowed. Fold: cite the ledger row and note the
   narrowing.
7. **The scripter's pre-fix pages are not pinned (65-67).** "Pass A's pre-fix contract pages"
   should name the commits, since the amendments corrected them: json-output at `29a03eff`, doctor
   at `3453668f`, exit codes at the remaining commit per the `0e7f4eb9` ground truth (verify
   which, since parent item 3's list and the amendment disagree on `3bfaac37`). Fold: list the
   three page-to-commit pairs.

## Not findings, noted for the other lenses

- The Clopper-Pearson condition never binds: at 58 of 72 (80.6 percent) the 95 percent lower bound
  is 69.5 percent, so the 60 percent floor adds nothing while the 80 percent point bar holds.
  Plant-run pairs are also clustered by plant, so the exact interval is anti-conservative. A
  statistics lens should rule.
- Per-class bars sit on 12 pairs for docs-only and docs-and-binary; 60 percent there is 8 of 12,
  lower bound 35 percent.
- The scripter's held-out path map is built from the same runs that score it (65-67), which makes
  "on-path" partly defined by detection.
- STATUS, ROADMAP, and the decision row describe 1b's open questions; the spec answers each
  (paths from frozen mapping runs rather than the ledger's candidate of baseline-opened pages,
  rule candidates excluded, fitness framing, Opus-only gating). No contradiction; STATUS and
  ROADMAP need their pass 1b text updated at the pass close, not now.
