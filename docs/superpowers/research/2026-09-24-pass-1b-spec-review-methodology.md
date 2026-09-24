# Pass 1b spec review: methodology red team

**Target:** `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md` at
`30083f27` (cited as `spec:N`). **Lens:** the premise, not the mechanics: does passing these bars
show the instrument is fit for pass 2a's two uses (the chain's reader stage and the trial's
measure)? **Reviewer:** `claude-opus-5-5` at `xhigh`. Computations in the statistics section were
run with scipy (exact binomial and Clopper-Pearson) and a small Monte Carlo (script in the session
scratchpad, reproducible from the parameters stated).

**Counts:** 2 blockers, 7 majors, 5 minors. Two findings carry OWNER FORKs.

## What is sound

These parts should survive any fold, and the findings below do not argue against them:

- **Pre-registration and the freeze** (`spec:59-62`, `spec:150-153`). A single freeze commit, a
  dev/test split, and no fix round after test scores is the standard defence against post-hoc
  analysis (Nosek, Ebersole, DeHaven, and Mellor, "The preregistration revolution", *PNAS* 2018).
  The failure rule is honest.
- **Symmetric treatment of `ruleCandidates[]`** (`spec:96-99`). Dropping it from both catches and
  findings is the correct response to 35 of 48 false positives coming from that field
  (record:270-275).
- **`diverged[]`** (`spec:80-81`). F3 (record:140-148) is a genuine instrument failure that no other
  field could capture. This is the most valuable tuning change in the spec.
- **Mechanical harness exclusion and the `git init` export** (`spec:82-84`, `spec:103-104`). Removes
  8 known artifacts before judgment.
- **Verified runs only, Opus only in the gate** (`spec:93-95`, `spec:118`). Justified by
  record:302-305 (Opus 26 of 26 verified, Sonnet 8 of 13).
- **The trial simulation and the "Finding for pass 2a"** (`spec:39-45`, `spec:155-160`). Surfacing
  that the trial is underpowered even with a perfect instrument is the most important result in the
  spec, and it is right to hand it forward rather than fold it here.
- **The blind planter and blind adjudicator** (`spec:112-114`, `spec:139-146`).

## Findings, ranked by consequence

### B1. Blocker: the plant types measure what the chain's scripts already catch

**Location:** `spec:141-143` (plant types), `spec:66-67` and `spec:130-135` (real and held-out
defects reported only); parent spec `2026-09-23-docs-reset-design.md:209`, `:228`, `:236-237`,
`:284`.

**Defect.** Two of the four plant types, a wrong flag or name and a stale path, are exactly the
token classes `check:provenance`'s extractor covers ("numerals, versions, paths, commands, flags,
export and config names", parent:209), and docs-as-tests runs every operator shell procedure
literally (parent:236-237). Both trial chains carry scripted checks (parent:284, "drafter,
scripted checks, one reader"). So in the trial, the defects left for the reader to confirm are
disproportionately the semantic ones: a behaviour claim that is false against the code, a
contradiction between two statements, a wrong precondition, a scope overclaim. That is the class
where the instrument did worst: 1 of 9 held-out pass A defects (record:101-113), all semantic
contract errors. The spec gates on the easy class and only reports the hard one.

Two of pass 1's own plants illustrate the split: P10 (a stale export name, `2026-09-23-docs-reset-planted-defects.md:55`)
would fail `check:provenance` or a typecheck without any reader; P11 (a removed step whose
consequence is a 403, `guard.ts:476-483`) needs a reader who understands the behaviour.

**Consequence.** An instrument can pass every sensitivity bar while being validated on a capacity
the chain does not need from it and the trial will not measure. The spec's own caveat
(`spec:131-132`, seeded defects are easier; Petersson et al. 2004) names the bias but gates
nothing on it.

**Fold.** (1) Replace the four-type list with a taxonomy that is at least half semantic: false
behaviour claim against the code, internal contradiction, wrong precondition or ordering, plus
removed step and undefined term. Drop wrong-flag and stale-path plants, or keep at most one per
job and label them "script-catchable" in the report. (2) Do not disclose the test-set type mix to
the tuner (the four types are also the development set's types, parent:239-241, so tuning can
overfit to them). (3) Gate a real-defect floor (see M-alt below for the corpus). Minimum version:
a per-class floor on recall of known on-path real defects, reported with its interval, set low
(for example, one half) since seeded defects run easier.

### B2. Blocker: a catch needs only to name the subject; a finding must claim a defect

**Location:** `spec:100-102`; the tuning acceptance rule `spec:88-89`.

**Defect.** A catch "names the plant's specific subject" (`spec:100`, ruling 5). A finding, which
is what precision counts, must claim the page "is wrong, contradictory, or silent" (`spec:101`).
An item that names a subject neutrally is a catch but not a finding. Pass 1 already scored P03 as a
catch "as an inconsistency, not as a failure" (record:80-82).

**Gaming design.** Add one generic sentence to the reader instructions: "In `assumed[]`, list every
command, flag, path, and term you relied on without confirming it against the code." On a planted
page, every wrong-flag, stale-path, and undefined-term plant appears by name in `assumed[]`: a
catch. On a control page, the same entries claim nothing wrong, so they are not findings and cost
no precision. `diverged[]` has the same hole: "each place the reader did something other than what
a page said, including a workaround that succeeded" (`spec:80-81`) admits benign divergences (a
different variable name, a different command order) that name subjects without claiming a defect.

**Which bar catches it.** None. The sensitivity bars rise; precision is unchanged; agreement is
unaffected. Worse, the tuning rule keeps any change that "raises development recall without
dropping development precision" (`spec:88-89`), so the hill-climb selects this change
automatically. The instruction names no page, defect, or fact, so the `diff-reviewer` check
(`spec:86-87`) passes it.

**Fold.** One sentence: an item counts as a catch only if it would also count as a finding about
the plant's subject (it claims the page is wrong, contradictory, or silent there). Count catch-field
items that are not findings, and report them per run as noise; if the owner wants a guard, cap the
median at a small number. This also serves the chain: a neutral mention gives the redraft nothing to
act on.

### M1. Major: the instrument defines its own path, so narrow reading scores higher (OWNER FORK)

**Location:** `spec:63-64`, `spec:78-79`, `spec:109-111`; `scripts/docs-readers/lib/verify.ts:68-93`.

**Defect.** The path map is built from the frozen instrument's self-reported `steps[]`, and plants
go only inside it. Recall is therefore conditional on the instrument having already chosen to
attend there. That is a legitimate property (noticing given attention), but it is not the property
the chain needs, which is noticing along the path a real reader of the job takes. The verifier
checks only that a quote's text sits at the cited line (`verify.ts:68-93`), never that the reader
acted on it, so `steps[]` is self-report. Its verbosity is a tuning knob that directly sets the
test's difficulty.

**Gaming design.** Tune the reader to report only "the instructions you could not have done the
job without" in `steps[]`. The map shrinks to the few sections every run hammers; the planter's
four plants concentrate there; recall rises. A reader that reads broadly and reports faithfully
produces a larger map that includes sections touched lightly by two of three runs, where plants
are harder to catch. The narrower instrument scores higher. No bar sees map size.

**Fold options (the owner ruled "plants go on a path map taken from frozen runs", `spec:8`):**

- **(A) Recommended: keep the ruling, add a path-fidelity guard.** Before the freeze, one blind
  agent (no reports, no reader prompt) writes each job's required sections from the job text, its
  done signal, and the pages: the task analysis a cognitive walkthrough starts from (Wharton,
  Rieman, Lewis, and Polson, "The cognitive walkthrough method: a practitioner's guide", 1994).
  Report, and gate at a floor, the share of required sections the run-derived map covers. Plants
  still go on the run-derived map, as ruled.
- **(B)** Place plants on the task-analysis map instead. Breaks circularity fully, but overturns the
  ruling and re-imports some off-path misses by design.
- **(C)** Keep as written and record the circularity as a known limit. Cheapest; leaves the gaming
  path open.

A partial behavioural cross-check is available at no run cost: the transcript already carries every
Bash command, file write, and Read (`scripts/docs-readers/lib/transcript.ts:388-408`), so a `steps[]`
quote containing a command can be matched against a command actually run.

### M2. Major: the sensitivity statistics treat 72 correlated pairs as independent

**Location:** `spec:122-123`.

**Defect 1: the unit is wrong.** Each planted run carries all four of its job's plants at once
(`spec:68-70`), so the 72 pairs come from only 18 runs over 6 jobs, and each plant is scored three
times. Pass 1's own data show the within-plant correlation is high: of 17 plants scored by two Opus
runs, 9 were caught by both, 6 by neither, and only 2 split (record:60-76). Under independence at
the observed rate (0.59) about 8 splits are expected; an intraclass correlation near 0.76 fits the
observed 2. The design effect for three runs at that correlation is about 2.5 (Kish, *Survey
Sampling*, 1965), so the effective sample is about 29, close to the 24 plants themselves.

**Defect 2: the lower-bound bar is redundant.** At n = 72, the smallest count clearing 80 percent is
58, whose exact 95 percent Clopper-Pearson interval is [0.695, 0.889]. The 60 percent lower bound is
already cleared at 52 of 72. The second condition never binds, so it adds the look of a statistical
guard with none of the effect. Computed at the plant level instead (19 or 20 of 24), the bound is
0.58 to 0.63 and would bind.

**Defect 3: the operating characteristic is unstated.** Setting the observed threshold equal to
the target makes a true-80-percent instrument a coin flip. Simulated over the four classes (4, 4,
8, 8 plants) with all sensitivity bars applied:

| True recall | Pass rate, independent pairs | Pass rate, plant correlation 0.76 |
| --- | --- | --- |
| 0.70 | 0.03 | 0.10 |
| 0.80 | 0.49 | 0.43 |
| 0.85 | 0.86 | 0.68 |
| 0.90 | 0.99 | 0.88 |

So the bar in practice demands true recall near 0.9, and with the precision and agreement bars
also required and no fix round, a good instrument has a real chance of stopping the pass. The
per-class bar at n = 12 (docs-only and docs-and-binary each have one job) has a 95 percent interval
of [0.35, 0.90] at 8 of 12; it measures almost nothing about the class.

**Fold.** (1) Score at the plant level: a plant is caught when at least two of its three runs catch
it; report per-run recall beside it. (2) State the operating characteristic in the spec, in the
acceptance-sampling form (producer's risk at an acceptable recall, consumer's risk at an
unacceptable one; ISO 2859-1, or Dodge and Romig's tables), and pick the threshold from it. With 24
plants, a threshold of 18 of 24 gives roughly a 10 percent chance of passing a 0.6 instrument and
about 94 percent for a 0.85 one under independence (39 percent for a 0.7 one); the owner decides which risks to hold. (3) Drop
the pooled-pair lower bound or recompute it on plants. (4) Demote the per-class floor to reported,
or state honestly that it is a tripwire for a class that catches almost nothing, not an estimate.

### M3. Major: stability is one of three fitness properties and has no bar

**Location:** `spec:36` (stability named), `spec:133-134` (per-run recall and overlap reported
only).

**Defect.** The spec names stability as a fitness property and then gates nothing on it. The reason
given, "three runs are too few for a per-run floor: usability studies need five to twelve evaluators
for about 80 percent coverage", misapplies the citation. Nielsen and Landauer (1993) and Virzi (1992)
estimate how many evaluators a union needs to cover the problem set, not how many runs are needed
to estimate agreement. Test-retest agreement is estimable from three runs over 24 plants and every
control finding.

Stability is what both uses lean on. The chain may run one reader per job (`spec:43`): a finding that
appears in one run in three is a redraft target one time in three. And the trial's own
recommended repair, "a paired per-defect design" (`spec:158-159`), needs per-defect reliability
directly.

**Fold.** Report and gate a floor on reproducibility: the share of plant catches and of
adjudicated real findings reported by at least two of three runs, or Fleiss' kappa over the control
findings (Fleiss, "Measuring nominal scale agreement among many raters", *Psychological Bulletin*
1971). Set the floor from the trial redesign's needs, or state it as a judgment call.

### M4. Major: adjudicator agreement is self-consistency, measured with raw percent agreement

**Location:** `spec:112-114`, `spec:125`, `spec:127-128`.

**Defect.** (1) Both reads are `claude-opus-5-5`. Two copies of one model share its errors, so
agreement measures consistency, not accuracy. The cited norm (85 to 90 percent) is judge-to-human
agreement, and the LLM-as-judge survey the spec cites (arXiv 2411.15594) treats agreement with human
labels as the validation target. (2) Raw percent agreement is inflated when one category dominates:
pass 1's findings were mostly false positives, so two judges who lean "false positive" agree often
by chance (Cohen 1960; Feinstein and Cicchetti, "High agreement but low kappa", *Journal of Clinical
Epidemiology* 1990). (3) The sample is 30 findings from control runs. Catch rulings, which drive
the sensitivity bars and where pass 1's hardest judgment calls sat (P03, P05, D01, D12 near misses,
record:80-86, 116-122), are never re-ruled. (4) At 26 of 30 the 95 percent interval is [0.69,
0.96]; a true-80-percent adjudicator passes about 25 percent of the time.

**Fold, OWNER FORK on who the second rater is:**

- **(A) Recommended:** the second rater is one `fable` read (a different model), not Opus at
  `xhigh`; report Cohen's kappa beside percent agreement; draw the sample stratified, half control
  findings and half catch rulings (including every near miss).
- **(B)** Geoff labels about 20 items (a human anchor, matching the cited norm; costs attended time).
- **(C)** Keep Opus-on-Opus and relabel the bar "adjudicator consistency".

### M5. Major: precision is prevalence-dependent and estimated on tiny samples

**Location:** `spec:112-114`, `spec:124`.

**Defect.** Precision depends on how many real defects the page carries (Altman and Bland,
"Diagnostic tests 2: predictive values", *BMJ* 1994). Control pages are mature published pages;
chain drafts will carry more defects, trial final drafts fewer. A precision number from control
pages does not transfer to either. And the sample is small: counted over stalls and `assumed[]`
only, pass 1's classes carried 3, 0, 4, and 6 false positives (record:273-275). At six adjudicated
findings, a two-thirds bar passes a true-50-percent instrument 34 percent of the time and a
true-75-percent one 83 percent.

What costs the chain and the trial is false findings per run: each is an adjudication and possibly
a wasted redraft. That rate is independent of page prevalence.

**Fold.** Gate on false findings per verified control run (median, per class), and report
precision beside it. Add planted-run findings whose subject lies outside every plant's section to
the precision pool (they are as real as control-run findings); exclude only findings plausibly
induced by a plant. "Planted pages are not real pages" (`spec:114`) holds for plant sites, not for
the rest of the page.

A related property costs nothing: **fix confirmation.** Each plant's site on the control page is
the corrected text. A control-run finding at a plant site is a false alarm on a fixed defect, the
event the trial's "defects remaining" count must not contain. Report it.

### M6. Major: the test set reuses the development set's jobs and pages

**Location:** `spec:47-55`, `spec:63-66`.

**Defect.** The test set's plants are fresh, but the six jobs and their pages are the ones pass 1's
plants, control runs, and real defects came from. Tuning may not name a page (`spec:86`), yet a
generic rule derived from F3 ("check that every path a guide names exists") transfers best to the
page F3 lives on. Both pass 2a uses run on new draft pages. Generalization to an unseen job and page
is untested.

**Fold.** Add at least one job on a page and audience absent from the development set, frozen before
tuning. The editor audience is in the docs-only class and has never run (parent:186); an editor
task on a `docs/editors/` page is cheap. Gate it under the same plant rules, or report it with its
interval if the budget will not stretch.

### M7. Major (for pass 2a): the trial measures a chain with the instrument that chain optimized against

**Location:** `spec:155-160`; parent:283-293.

**Defect.** The full chain redrafts on reader findings; the trial then counts reader-confirmed
defects remaining. A chain optimized against a measure scores well on that measure in part because
it removed what that measure sees (Goodhart's law; Strathern 1997). Defects in the reader's blind
spots are invisible to both chain and trial, so the trial cannot see what the extra depth failed to
fix. This is not pass 1b's to solve, but it belongs in the "Finding for pass 2a".

**Fold.** Add one sentence to "Finding for pass 2a": the trial's measuring runs use jobs disjoint
from the jobs the chain's reader stage ran on each page, or add an independent measure (the labelled
real-defect set, or the human reads parent:263-265 already plans).

### M-alt. Major: a better-travelled real-defect corpus is already within reach (OWNER FORK)

**Location:** `spec:47-55`, `spec:137-146`.

**Evidence.** Pass A's 14 defects are pages at pre-fix commits with the fix as ground truth
(parent:198-200): the method of Defects4J (Just, Jalali, and Ernst, ISSTA 2014), which built a
fault benchmark from historical fix commits because seeded faults are a weaker proxy. `git log` over
`docs/admin`, `docs/extend`, `docs/editors`, `docs/reference`, and `CONTRIBUTING.md` since
2026-05-01 shows 158 commits whose subjects say fix, correct, stale, or wrong (for example
`a66d3c98`, `29a03eff`, `3453668f`). Many will be prose or style fixes, but a filtered set of 20 to
30 on-path factual fixes is plausible.

**Design.** Re-insert each historical defect into the current page at its original site (a
revert-in-place plant), with the fix commit as its proof. This keeps the path-map rule, gives real
defect types in their real proportions, answers B1 directly, and costs one Sonnet mining pass plus an
Opus proof check.

**Options:** (A) **Recommended:** replace half the synthetic plants with revert-in-place real
defects and gate on both halves. (B) Add them as a reported arm only. (C) Defer to pass 2a's
labelled defect set (parent:291-293). A paired human-reader comparison is the gold standard but costs
Geoff's attended time beyond what pass 2a's two human reads already spend; not recommended for 1b.

### m1. Minor: `checks[]` is a catch field the runner never fills

**Location:** `spec:96`; `scripts/docs-readers/lib/runner.ts:124` (`checks: []`, hard-coded), and the
report schema `runner.ts:44-61` has no such field. Record:28 notes no run filled it. **Fold:** drop it
from the catch fields, or wire it in the tuning scope.

### m2. Minor: "off-path detection" is reported with no off-path plants

**Location:** `spec:135` against `spec:144` ("Every plant sits inside an on-path section"). The test
set has no off-path denominator except real defects that happen to sit off the map. **Fold:** one
off-path plant per job, reported only, or drop the metric.

### m3. Minor: four simultaneous plants interact

**Location:** `spec:68-70`, `spec:141-143`. A stale path that stalls the reader early masks later
plants; a noticed oddity may make the reader more suspicious of the rest. Mutation testing evaluates
one mutant per program version for this reason (Jia and Harman, "An analysis and survey of the
development of mutation testing", *IEEE TSE* 2011). One plant per run costs four times the runs, so
it is not proposed. **Fold:** record each plant's order along the path and report catch rate by
position and after a prior stall.

### m4. Minor: two bar sources need tightening

**Location:** `spec:122-123`, `spec:170-173`. (1) The 80 percent "common mutation-testing adequacy
bar" is attributed to Petrović and Ivanković, ICST 2018. The paper is Petrović, Ivanković, Kurtz,
Ammann, and Just, in the ICST 2018 *Workshops* (ICSTW, pp. 47-53); I could not confirm it sets an 80
percent adequacy bar. (2) The inspection figures describe human inspection over whole artefacts,
not recall conditional on a reader's own path, so they are not commensurate with this denominator,
which should run higher. **Fold:** cite a page for each figure or relabel the thresholds as
judgment, which M2's operating-characteristic framing makes defensible on its own.

### m5. Minor: an Opus planter seeds for an Opus reader

**Location:** `spec:139`. Plants an Opus writes may be the salient kind an Opus reader notices,
another face of the seeding bias. **Fold:** run the planter on `fable` (small context, one call per
job), or rely on M-alt's real defects to expose the gap.

## Verdict

The design repairs pass 1's real failures well: the freeze, the `ruleCandidates[]` symmetry,
`diverged[]`, the harness exclusions, and the underpowered-trial finding are sound and should stand.
As written, though, it validates a narrower property than pass 2a needs: whether the instrument
notices script-catchable defects inside sections it chose to read itself. Two cheap holes let a
worse instrument pass. A neutral-mention catch rule lets `assumed[]` padding raise recall at no
precision cost, and the tuning rule selects for that padding (B2). The plant taxonomy overlaps the
chain's deterministic gates while the semantic defects the trial will count are only reported (B1).
The sensitivity statistics are pooled over correlated pairs, the lower-bound bar never binds, and a
true-80-percent instrument passes about half the time (M2). Stability, one of the three named
properties, gates nothing (M3). Fold B1 and B2 (a sentence each, plus a revised plant taxonomy), state
the operating characteristic and score plants rather than pairs, and give stability a reported floor
before the freeze. The OWNER FORKs on the path-fidelity guard (M1), the second rater (M4), and the
real-defect arm (M-alt) are Geoff's. With those folds the design is sound for the chain stage. Its
fitness as the trial's measure still depends on pass 2a's redesign, which the spec already
acknowledges.
