# Docs reset pass 1b: the validation redesign

**Date:** 2026-09-24. **Parent spec:** [`2026-09-23-docs-reset-design.md`](2026-09-23-docs-reset-design.md).
This spec replaces the parent's pass 1 items 8 ("Validation, the exit gate") and 9 ("Failure
rule"), and it changes pass 2a item 5 as "Finding for pass 2a" states. The parent's "Amendments
from pass 1b" section records both. Where the two disagree on validation, this spec wins.

**Owner rulings (Geoff, 2026-09-24).** The instrument is validated for fitness for pass 2a's two
uses, not for exhaustive detection. Plants go on a path map taken from frozen runs. Findings
exclude rule candidates. Gated runs are Opus 5.5 only. The ceiling is 10M, flag at 8M (O1). A
`fable` read validates the adjudicator on a sample of findings and catch calls, with no human
labelling (O2). One fresh transfer job per class is reported, never gated (O3). The outcome is
per class, with no fix round after the freeze (O4). Geoff delegated the methodology to the
conductor; the conductor's rulings (C1 to C15) and the disposition of every review finding are in
[`2026-09-24-pass-1b-spec-fold.md`](../research/2026-09-24-pass-1b-spec-fold.md).

## What failed and why

Pass 1's validation (`docs/internal/record/2026-09-23-docs-reset-validation.md`) failed every
class. The record traces the failures to the validation's design:

- The record traces the misses it examined to runs that never reached the planted section. The
  planter placed defects anywhere on a page; a reader does one job.
- 35 of 48 false positives came only from `ruleCandidates[]`, a field meant for the profile fold,
  and 8 were harness artifacts (no `.git`, a dropped `scripts/docs-readers/`, a denied `npx`).
  The two groups overlap.
- "Every plant caught in 2 of 3 runs" is fragile: an instrument with 90 percent per-run recall
  passes it on 17 plants about 60 percent of the time.
- Two failures are the instrument's own. All three extender runs followed
  `restrict-admin-access.md`, silently wrote the rule where the site actually had its file, and
  never reported the page's wrong path (F3). And a report carries one quote per page, so no run
  records which instructions it acted on.
- Sonnet 5 verified 8 of 13 runs, on report-format failures; Opus 5.5 verified 26 of 26.

## What the instrument is for

Pass 2a uses readers twice: as the v2 page chain's reader stage, whose findings drive the
redraft, and as the trial's measure of reader-confirmed defects remaining. Fitness for those uses
means three properties, each gated. **On-path sensitivity:** a reader doing a job reports the
defects that job runs into. **Precision:** few findings are false, since every finding costs an
adjudication and a redraft. **Stability:** repeat runs agree, since the chain may run one reader
per job. Coverage of a whole page is the job set's concern (pass 2a gives each page three or four
jobs), not a single reader's.

## Data split

- **Development set:** pass 1's validation batch (its 17 plants, control runs, and scores), the
  baseline record's failures (F1 to F6, R1 to R4), and all 19 of pass A's defects. The conductor
  has read all of it, so all tuning happens here and nowhere else.
- **Held-out, contaminated:** pass A's split put 9 defects in the held-out half (D01 D03 D06 D08
  D09 D10 D12 D16 D18) and 10 in tuning (D02 D04 D05 D07 D11 D13 D14 D15 D17 D19). Pass 1 ran and
  scored the held-out half, and its record names each subject and every near miss, so it is not
  blind. It is reported only, as a comparison against pass 1's 1 of 9, and labeled contaminated.
- **Test set:** 36 fresh plants on the six development jobs, placed by an isolated planter on the
  frozen instrument's path maps after the freeze. Precision on these jobs is measured on control
  runs of pages the conductor has adjudicated before, so it is in-sample, and the record says so.
- **Transfer set:** one fresh job per class (four jobs) on pages no development job read, mapped
  and planted the same way. It measures transfer to unseen pages and audiences, including
  out-of-sample precision, and is reported only (O3).

## Sequence

0. **Rescore.** Pass 1's saved reports are rescored offline under this spec's scoring rules. This
   is tuning round 0's reference.
1. **Tune** on the development set, at most two run rounds (see Tuning).
2. **Write the transfer jobs.** A fresh `claude-opus-5-5` agent that has not read the development
   set's plants or records writes the four transfer job texts, each with an arrival state and a
   done signal, on pages no pass 1 or tuning run read. The texts enter the freeze.
3. **Freeze** (see Freeze). Nothing that affects a score changes after it.
4. **Map.** On the unmodified pages at the pinned commit, each of the six development jobs and
   the four transfer jobs runs three times on `claude-opus-5-5`. These runs build the path maps
   and are the control runs for precision. The scripter also runs three Opus times on pass A's
   pre-fix contract pages for the held-out report.
5. **Plant.** The planter places six plants per job on its path map (see Planting). A script and
   one blind read validate every plant; an invalid plant is replaced before any planted run.
6. **Planted runs:** three Opus runs per job, development and transfer, plus one
   `claude-sonnet-5` run per development job for the reported Sonnet arm.
7. **Score,** by script where mechanical, by the catch judge on planted runs, and by the
   adjudicator on control runs, then the agreement read.

## Tuning

Tuning may change the reader's instructions, the report schema, and the harness. Three changes
fix instrument defects pass 1 found and are adopted without the keep rule, since they fix the
instrument rather than raise a score:

- **`steps[]`:** each instruction the reader executed or statement it relied on for a decision,
  with the decision named, as a `page:line` quote the runner verifies like any other quote. It is
  what the path map is built from.
- **`diverged[]`:** each place the reader did something other than what a page said, including a
  workaround that succeeded, with the page quote, what the reader did instead, and why. F3 is the
  case this catches.
- **The git export** (see The export).

The report schema also gains a structured `blockedBy` field on `stalls[]`, `assumed[]`, and
`diverged[]` entries: the denied command or the absent path that blocked the reader, or null.

**Rounds.** Round 1 runs the three adopted changes and sets the new reference. Round 2, if run,
tests one bundle of further changes against round 1. Each round runs every development job once
planted (pass 1's plants, at `planted/<job>/`) and once on control pages, on `claude-opus-5-5`: 12
runs. Development recall counts only the development plants inside the job's development path
map. Pass 1's control-run quotes are the best available proxy for that map, since pass 1 had no
`steps[]`; the record states it as a proxy, and off-map development plants are reported only.
Development precision is the false-finding count per control run. The catch judge and the
adjudicator rule both, using prompts drafted before round 0; they are not tuning levers, and a
defect found in either during tuning is fixed and every round rescored.

**Keep rule.** A round 2 bundle is kept only if it raises on-map development catches by at least
two over round 1 and does not raise false findings per control run by more than 0.5. A result
inside that band is noise, and the simpler instruction set wins.

**Bans.** No tuning change may name a page, a defect, a job fact, or any development-set item,
held-out defects included. The absent lists and the allowlists are not tuning levers. The
`diff-reviewer` checks every tuning change against these rules.

## Freeze

One commit, tagged `docs-reset-1b-freeze`, carries a manifest of sha256 hashes over every
score-affecting input:

- the reader prompt and report schema, the class files, the batch and job files (with each job's
  absent list), and the transfer job texts;
- the planter prompt and plant-type definitions, the catch judge's and the adjudicator's prompts
  and rubrics, and the scoring, path-map, and operating-characteristic scripts;
- the container image digest, the Claude Code CLI version, and the model ids as the API resolves
  them;
- the pinned page commit for every job, the scripter's current pages included (never `HEAD`), and
  the held-out pre-fix pins (`cli-cairn-json-output.md` and `cli-cairn-exit-codes.md` at
  `29a03eff`, `cli-cairn-doctor.md` at `3453668f`);
- every seed.

The runner refuses a gated batch when any frozen input differs from the manifest and stamps the
tag and manifest hash into every report. The scorer rejects an unstamped report. The close's
`diff-reviewer` confirms no frozen path changed after the tag. Any instrument change after the
freeze, including a fix for a crash or a broken export, burns the plants: a new planter plants,
and every mapping and planted run reruns.

**Reruns are the runner's alone.** An unverified, crashed, or timed-out run, or one with no
report, gets exactly one automatic rerun. Every attempt stays in the results, the scorer reads the
final attempt, and the record lists each rerun and its cause. A gated planted run still failing
after its rerun catches nothing. A gated control run still failing counts every finding it made
as false.

## The export

- Git is installed in the reader image.
- Every repository-class tree, the scripter's contract bundle included, gets one synthetic commit
  made after any planted overlay, separately in each prepared tree, under a pinned neutral author
  and committer identity. Preparation asserts exactly one commit and a clean `git status`. The
  preparation code's `.git` exclusion becomes this check.
- File mtimes are normalized to one fixed timestamp.
- `docs/HISTORY.md`, `docs/STATUS.md`, and `ROADMAP.md` join the repository export's excluded
  paths for gated batches, since each tells a reader that plants exist.
- Preparation builds control-only trees for the mapping runs. Development plants stay at
  `planted/<job>/`; test and transfer plants go to a new root, never that path.
- Each job's **absent list** (the paths absent by design from its prepared tree) is derived from
  its builder's exclusions and recorded in the batch or job file, not the class file.

## Path map

- **Sections** are the spans under H2 and H3 headings. A quote belongs to its innermost heading,
  so an H2's own section ends at its first H3. The lines between the H1 and the first H2 form
  their own lead section. Headings inside fenced blocks are skipped. Sections are identified by
  heading text, and the planter may not edit a heading.
- A `steps[]` quote is assigned by its verified line span. A span that crosses a heading counts
  for neither section.
- A section is **on-path** for a job when at least two of its three verified Opus mapping runs
  have a `steps[]` quote inside it. With two verified runs, both must; with one, it alone decides,
  and the record says so.
- **Ceiling.** The map's on-path share of the job's page lines is reported per job. A map above
  60 percent is too loose; that job's plants then go only on sections quoted by all three runs,
  and, where that still exceeds the ceiling, within 40 lines of a line two runs quoted.
- **Thin map.** When a map cannot hold six plants under Planting's spacing rules, it widens to
  sections quoted by at least one run, recorded per job. If it still cannot, the job gets fewer
  plants, and the sensitivity threshold is recomputed at the achieved plant count from the
  operating-characteristic script before any planted run, holding the pass probability at a true
  recall of 0.6 to at most 0.1.
- Each map is committed, with its hash, before planting starts.

## Planting

The planter is one `claude-opus-5-5` agent at `high`. It works from the repository export, which
drops the records, plus the path maps, and never sees a job text, a reader prompt, a report, the
development set's plants, or the plant-type mix a tuner saw. It gets the line spans of every
mapping-run finding, unadjudicated, as lines to avoid.

- **Six plants per job.** At least three are semantic: a false claim about behavior, a
  contradiction, or a wrong precondition or ordering. The rest are token types: a removed step,
  an undefined term, a wrong flag or name, or a stale path. A stale-path plant never targets a
  path on the job's absent list.
- **Source.** The preferred plant reintroduces a real historical defect: the pre-fix text of a
  docs-fix commit, where that text lands in an on-path section and still applies to the current
  page. The planter synthesizes a plant otherwise. The record marks each plant's source.
- **Spacing.** At most two plants per section, none within ten lines of another, spread across
  sections; a multi-page job carries at most four plants per page.
- **Record.** Per plant: page and line, type, source, original and planted text, the proof
  against the code, a **catch criterion**, and one **near-miss example** that does not count. The
  test record lives under `docs/internal/record/`, is excluded from every reader export, and is
  committed with its hash in the planted batch's manifest before any planted run. Criteria for
  the held-out defects and the development plants are written the same way before their runs.
- **Validity check.** A script confirms each plant sits inside an on-path section, differs from
  the control page at its line, and shares no subject with a development plant. One blind read
  verifies each proof against the code. A failing plant is replaced before any planted run. No
  plant is dropped after the planted runs start.

## Scoring

- **Catch and finding fields** are `stalls[]`, `assumed[]`, and `diverged[]`. `checks[]` is empty
  today (the runner hard-codes it); it counts only if tuning populates it. `ruleCandidates[]`
  counts as neither, which costs recall (pass 1 caught several plants only there). Counting
  candidates as catches but not as false positives would inflate both measures in the
  instrument's favor, so it is rejected.
- **The catch judge** is one `claude-opus-5-5` read at `high` per planted run. It sees the plant
  record's entries (subject, criterion, near miss), the planted page, the job text, and the run's
  catch fields, never the model, the run id, or the reader prompt. It rules each plant caught or
  missed. A catch meets the plant's criterion and also qualifies as a finding: it claims the page
  is wrong, contradictory, or silent on something the job needed there. An item that merely names
  or uses the subject is a miss.
- **The adjudicator** is one `claude-opus-5-5` read at `high` per control run. It sees the page,
  the full published docs tree at the pinned commit, the code, and the job text, never the reader
  prompt, the model, or the run id. Under a frozen rubric it first classifies each catch-field
  item as a finding, an interpretation choice the job left open, or not a claim, then groups the
  run's findings by subject (same page and same claimed fact), then rules each subject real,
  false, or harness. A `diverged[]` item is a finding when its stated reason is that the page was
  wrong or silent.
- **Real defect,** unchanged from pass 1's record: the page states something false or
  self-contradictory against the code, or omits a fact the job needs that no published page
  supplies. A false finding is one answered elsewhere in the published docs, wrong, or asking
  for a fact that does not exist.
- **Harness items** are excluded from both counts. The filter excludes an item mechanically when
  its `blockedBy` names a path on the job's absent list or a command the run's denials record.
  The adjudicator rules "harness" for any the filter missed. Every excluded item is listed in the
  record. The exclusion never applies to catch scoring.
- **Pools.** Precision reads the verified Opus control runs on current pages. Planted pages are
  not real pages, so planted runs score catches only.

## Bars

The gate reads verified Opus runs on the development jobs only. The thresholds come from the
operating characteristic below, not from the literature.

| Bar | Pass condition | Scope |
| --- | --- | --- |
| Sensitivity | A plant counts as caught when at least two of its three runs catch it; at least 27 of the 36 plants caught | Instrument-wide |
| Sensitivity floor | At least 4 of 6 plants for a one-job class (docs-only, docs-and-binary); at least 8 of 12 for a two-job class (docs-and-site, repository) | Per class |
| Stability | Fleiss' kappa over the 36-plant by three-run catch matrix at least 0.35 | Instrument-wide |
| Precision | False findings summed over the class's verified Opus control runs at most one per run (3 for a one-job class, 6 for a two-job class) | Per class |
| Adjudicator agreement | On the O2 sample, Cohen's kappa at least 0.6, or raw agreement at least 85 percent where kappa cannot be computed (see below) | Instrument-wide |

**The operating characteristic.** Plants are scored with their three runs clustered: each plant
has its own per-run catch probability, drawn from a beta distribution whose mean is the
instrument's true on-path recall and whose intraclass correlation is estimated from pass 1. Pass
1's two Opus runs per plant caught 9 plants in both, 2 in one, and 6 in neither; the
beta-binomial maximum-likelihood fit gives a mean of 0.59 and an intraclass correlation of 0.76
(profile 95 percent interval 0.35 to 0.95). Plants are treated as independent given the
instrument. Pass 1's data cannot estimate a within-run effect across a job's plants, so the
curve's ICC range is the stated sensitivity check. Probabilities are exact beta-binomial sums.

| True recall | Pass probability, 27 of 36 (ICC 0.76) | ICC 0.35 | ICC 0.95 |
| --- | --- | --- | --- |
| 0.6 | 0.05 | 0.06 | 0.04 |
| 0.7 | 0.34 | 0.46 | 0.33 |
| 0.8 | 0.84 | 0.93 | 0.83 |
| 0.9 | 1.00 | 1.00 | 1.00 |

The rule the thresholds meet: an instrument with true on-path recall 0.8 passes with probability
at least 0.8, and one at 0.6 passes with probability at most 0.1. At 24 plants only one threshold
(18) met it at ICC 0.76, at 0.82, and none did at ICC 0.5, so the count is 36, six per job.

**Per-class floors are tripwires.** A class's own plants cannot separate 0.8 from 0.6. The floors
are set so a class at true recall 0.8 fails its floor with probability about 0.1 (4 of 6) and 0.07
(8 of 12), while a class at 0.6 still passes them about 55 and 44 percent of the time. The
discriminating evidence is the pooled bar, and one reader instruction set serves every class, so
an instrument-wide failure fails every class. At true recall 0.8, a given class clears both
sensitivity bars with probability about 0.8, and all four together about 0.68.

**Stability** is set from the same model at true recall 0.8: an instrument at pass 1's estimated
correlation (0.76) passes with probability 1.00, one at 0.5 with 0.82, one at 0.2 (runs agree
little beyond chance) with 0.10, and one at 0 with 0.00. Per-class kappa is reported.

**Precision** is set from pass 1's data. Counted over stalls and `assumed[]` only, pass 1's verified
control runs carried 13 false positives over 16 runs, about 0.8 per run, with harness artifacts
the new export removes still in the count. The bar holds each class to about that rate. It cannot
pass vacuously: a silent reader passes it and fails sensitivity.

**Adjudicator agreement (O2).** One `fable` read re-rules 30 items: 15 control-run findings and
15 catch calls, from verified Opus gated runs, each stratum balanced by the primary ruling where
the pool allows. Items are ordered by `sha256("docs-reset-1b-agreement" + item id)` and taken from
the top. Agreement is computed before any Fable ruling replaces a primary one. Cohen's kappa
applies when each rater's labels include at least five items outside the largest category; else
raw agreement at 85 percent applies, and the record gives the reason. Fable's ruling stands on
every disagreement. An agreement failure fails every class, since every judged count rests on the
two judges.

**The simulation's code path.** `scripts/docs-readers/oc-curve.ts`, seed 20260924, reproduces
both tables and the pass 1 fit, and recomputes a threshold at any achieved plant count. The plan
commits it before the freeze; it is specified here, not built.

**Reported, gating nothing:**

- per-class plant recall with exact intervals, per-run recall, and recall by plant source
  (historical or synthesized), by type (semantic or token), by position along the path, and after
  a prior stall;
- each plant's line distance to the nearest mapping-run step, and each job's on-path share;
- per-class kappa, precision as a share beside the false-finding count, catch-field items per
  run that are not findings, and `ruleCandidates[]` precision;
- fix confirmation: a control-run finding at a plant's site, a false alarm on corrected text;
- recall on the known on-path real defects, labeled development-contaminated, beside the real
  defects the adjudicator confirms in the mapping runs and how many the planted runs found again
  on unplanted sections;
- the held-out scripter runs' recall on all nine held-out defects, labeled contaminated, against
  pass 1's 1 of 9;
- the transfer set's sensitivity, stability, false findings per run, and precision, scored under
  the same rules;
- the Sonnet arm: verified share and per-run recall on the 36 test plants.

## Failure rule

The outcome is per class (O4). A class is validated when the instrument-wide sensitivity,
stability, and agreement bars pass and its own sensitivity floor and precision bar pass. A
validated class's readers go to pass 2a as validated. A failing class's readers run in pass 2a as
advisory only, and the record states the cause per class. There is no fix round after the freeze;
a change tuned after seeing test scores is post-hoc by construction.

## What the parent's validation becomes

- **The standing regression floor.** The frozen test batch, its plants, and its scoring become the
  regression floor that parent item 8 called for. A later change to the reader instructions reruns
  it and reports against pass 1b's scores.
- **The baseline failures** move from a gate to a report. They are development items the
  instrument was tuned against, so a gate on them would measure the tuning.

## Finding for pass 2a

- **The trial is underpowered.** A simulation of the parent's trial (three pages, defects per final
  draft Poisson with mean 6 for the minimal chain and 4 for a truly one-third-better full chain,
  two final drafts per chain per page, three reader runs unioned per draft, the one-third rule,
  per-run recall 0.4 to 0.99, independent runs or ICC 0.76) keeps a truly one-third-better chain
  about 50 percent of the time and a no-difference chain 4 to 12 percent. Per-run recall barely
  moves either figure. Pass 2a must resize the trial (more pages, more jobs per page, or a paired
  per-defect design) or restate its decision rule before it runs.
- **The trial measures a chain with the reader it redrafted against.** Defects in the reader's
  blind spots are invisible to both. Pass 2a's measuring runs use jobs disjoint from the jobs the
  chain's reader stage ran on each page, or add an independent measure.
- **The Sonnet share** in the trial's reader runs is kept only if Sonnet verifies at least 5 of
  its 6 planted runs and its per-run recall on the 36 test plants is within 10 points of Opus's.
  Otherwise the trial's reader runs are Opus only.
- **The labeled defect set** for the grader comparison is pass 1b's test plants only. Pass 1's
  plants and pass A's defects are development items the reader was tuned on.

## Budget

Ceiling 10M, flag at 8M (O1). Counted tokens are input, output, and cache creation; cache reads
are reported separately, as in pass 1.

| Item | Basis | Estimate |
| --- | --- | --- |
| Tuning rounds 1 and 2 | 24 runs at 45k | 1.08M |
| Mapping, development and transfer | 30 runs at 45k | 1.35M |
| Held-out scripter runs | 3 runs at 45k | 0.14M |
| Planted runs, Opus and Sonnet | 24 development plus 12 transfer at 45k | 1.62M |
| Catch judge | 51 planted runs at about 12k | 0.61M |
| Adjudicator | 42 control runs at about 20k | 0.84M |
| Agreement read (`fable`) | one read over 30 items | 0.15M |
| Planter, plant check, fix-commit mining, transfer job author | | 0.95M |
| Implementer tasks | three (report schema; export and preparation; scoring, path map, freeze enforcement) at 0.8M to 1.3M | 2.4M to 3.9M |
| Total | | 9.1M to 10.6M, mid about 9.9M |

The 45k per planned run is pass 1's measured cost per final run, reruns included. The judge
figures are estimates; pass 1 has no measured equivalent. The implementer figures are pass 1's
subagent totals, which include cache reads, so they overstate under the counting rule. The mid
estimate trips the 8M flag during the planted runs. If the flag trips before the freeze, tuning
round 2 is dropped first (about 0.7M with its judging); the Sonnet arm is dropped second (about
0.35M), and the trial's reader runs are then Opus only.

## Evidence

- Fault seeding and its bias toward easy seeded defects: Mills (1972); Petersson, Thelin,
  Runeson, and Wohlin, "Capture-recapture in software inspections after 10 years research",
  *Journal of Systems and Software* 72(2) (2004).
- Historical-fix defects as a stronger proxy than seeded ones: Just, Jalali, and Ernst,
  "Defects4J", ISSTA 2014.
- Context for the recall targets, not their basis: an 80 percent mutation score is a
  practitioner and tool convention (PIT, Stryker), not a finding of Petrović, Ivanković, Kurtz,
  Ammann, and Just, "An Industrial Application of Mutation Testing", ICSTW 2018 (Mutation
  workshop). Formal inspections average about 60 percent defect removal in the
  inspection-effectiveness literature (Fagan; Capers Jones).
- Clustered binary data and the design effect: Kish, *Survey Sampling* (1965). Acceptance
  sampling's producer's and consumer's risks: ISO 2859-1.
- Agreement: Cohen (1960); Fleiss, "Measuring nominal scale agreement among many raters",
  *Psychological Bulletin* (1971); Landis and Koch (1977) for the 0.6 boundary; Feinstein and
  Cicchetti, "High agreement but low kappa" (1990). LLM-as-judge validation: "A Survey on
  LLM-as-a-Judge", arXiv 2411.15594; practitioner guidance of 85 to 90 percent agreement (Arize,
  2025).
- Preregistration: Nosek, Ebersole, DeHaven, and Mellor, "The preregistration revolution", *PNAS*
  (2018).
