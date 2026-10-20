# Pass 1b spec fold record

**Target:** `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md`, folded
from `c6f473b1`. **Reviews:** the five lens files `2026-09-24-pass-1b-spec-review-{contract,
integrity,consistency,mechanics,methodology}.md`. **Fold agent:** one `claude-opus-5-5` read.

## Rulings applied

Owner rulings (Geoff, 2026-09-24, final): **O1** budget ceiling 10M, flag 8M, itemized from
measured figures; **O2** a `fable` read re-rules a seeded sample of about 30 findings and catch
calls, no human labelling; **O3** one fresh transfer job per class, reported only; **O4**
per-class outcome, failing classes advisory in pass 2a, no fix round.

Conductor rulings (methodology delegated by Geoff): **C1** blind catch judge, per-plant criterion
and near miss, a catch must also be a finding; **C2** at least half semantic plants, historical
reverts preferred; **C3** plant-level scoring with an operating-characteristic curve; **C4** a
gated stability floor; **C5** false findings per control run, `blockedBy`, harness ruling,
per-job absent list; **C6** adjudicator inputs and frozen grouping; **C7** git in the export;
**C8** hash-manifest freeze; **C9** held-out half reported as contaminated; **C10** round 0
rescore, proxy dev maps, noise-tolerant keep rule, adopted changes; **C11** path-map definition,
ceiling, thin-map fallback; **C12** planter isolation and new plant root; **C13** three-page
simulation and the Goodhart handoff; **C14** citations; **C15** minor consistency items and the
Sonnet threshold.

## What C3 and C4 produced

Computed exactly (beta-binomial sums) from pass 1's two Opus runs per plant: 9 plants caught by
both, 2 by one, 6 by neither. The maximum-likelihood fit is mean 0.59, intraclass correlation
0.76, profile 95 percent interval 0.35 to 0.95.

- **24 plants cannot meet the rule robustly.** With a plant caught at two of three runs, only
  18 of 24 met "0.8 passes at least 0.8, 0.6 passes at most 0.1" at ICC 0.76 (0.82 and 0.10),
  and no threshold met it at ICC 0.5.
- **36 plants, six per job, threshold 27 of 36.** Pass probability at true recall 0.8 is 0.84
  (ICC 0.76), 0.93 (0.35), and 0.83 (0.95); at 0.6 it is 0.05, 0.06, and 0.04; at 0.7 it is 0.34.
- **Per-class floors** (4 of 6, 8 of 12) are tripwires: a class at 0.8 fails them about 10 and 7
  percent of the time, and a class at 0.6 passes them 55 and 44 percent. The spec says so, and
  makes the pooled bar shared across classes.
- **Stability:** Fleiss' kappa at least 0.35 on the 36 by 3 matrix. Monte Carlo (seed 20260924,
  5,000 draws) at true recall 0.8: pass 1.00 at ICC 0.76, 0.82 at 0.5, 0.10 at 0.2, 0.00 at 0.
- **Trial rerun at three pages (C13):** a truly one-third-better chain is kept about 50 percent of
  the time, and a no-difference chain 4 to 12 percent, across per-run recall 0.4 to 0.99.

The scratch computations are in the fold session's scratchpad; the spec names
`scripts/docs-readers/oc-curve.ts` (seed 20260924) as the committed reproduction the plan owes.

## Dispositions

Finding ids carry a lens prefix: CT contract, IN integrity, CO consistency, ME mechanics, MT
methodology. Duplicates across lenses fold once, listing every id.

| Ids | Subject | Disposition |
| --- | --- | --- |
| CT-B1, IN-B1, ME-m6 | No named catch judge, rubric, or blinding | Ruled C1. Scoring, "The catch judge"; Planting, "Record" (criterion and near miss); Freeze list. The agreement extension is ruled O2 |
| MT-B2 | A neutral mention counts as a catch | Ruled C1. Scoring, "The catch judge" (a catch must also qualify as a finding); non-finding catch-field items per run reported |
| MT-B1, MT-M-alt | Plant types overlap scripted checks; real-defect corpus | Ruled C2. Planting, "Six plants per job" and "Source"; recall reported by source and type |
| CT-B2 | Precision passes on zero or one finding | Ruled C5 (false findings per run, which a silent reader passes only by failing sensitivity) and O2 (the agreement sample is fixed at 30). Bars, "Precision" |
| MT-M5 | Precision is prevalence-dependent; use false findings per run | Ruled C5. Bars table and "Precision". Fix confirmation folded as a reported item. The suggestion to add planted-run findings outside plant sections to the precision pool is not taken: it adds a judged "plant-induced" step, and the transfer set now supplies out-of-sample precision |
| CT-M1, IN-m3, ME-m5, MT-M2 | Clopper-Pearson never binds; clustered pairs | Ruled C3. Bars table and "The operating characteristic"; the clause is dropped |
| CT-m2, MT-M3 | Stability has no bar; usability citation misused | Ruled C4. Bars table and "Stability"; the usability citation is removed |
| MT-M4 | Opus-on-Opus agreement, raw percent, findings only | Ruled O2. Bars, "Adjudicator agreement" (Fable second rater, Cohen's kappa with a stated fallback, stratified across findings and catch calls) |
| CT-M3, IN-M6 | Adjudicator lacks the docs tree and the job | Ruled C6. Scoring, "The adjudicator" |
| CT-M2 | Who decides what is a finding and groups subjects | Ruled C6. Scoring, "The adjudicator" (frozen classify-then-group rubric; `diverged[]` rule stated) |
| CT-M6, IN-M2, CO-M1 | Held-out half is seen; its map is circular | Ruled C9. Data split, "Held-out, contaminated" (split and counts stated); reported over all nine defects with no path map, which also removes the circularity |
| CT-M5, IN-M8, MT-M6, ME-m7 | Test set reuses dev pages and jobs; precision in-sample | Ruled O3. Data split, "Transfer set"; Sequence step 2; the in-sample precision is stated under "Test set" |
| CT-M4, ME-M4 | Keep rule unscoreable; no dev path map | Ruled C10. Sequence step 0; Tuning, "Rounds" and "Keep rule" |
| IN-M4 | Tuning rewards wandering and inflates the map | Ruled C10 and C11. Tuning, `steps[]` definition (executed or relied on, decision named); Path map, "Ceiling". The per-page cap on `steps[]` entries is not taken: the ceiling bounds the map directly |
| MT-M1 | The instrument defines its own path (owner fork) | Ruled C11. Path map, "Ceiling" (on-path share reported against 60 percent, with a stated fallback). The task-analysis guard and the command cross-check are not taken under C11 |
| IN-M1 | Freeze declared, not enforced; inputs incomplete; `HEAD` pin | Ruled C8. Freeze section, including the close's `diff-reviewer` check and the burn rule |
| IN-M3 | Planter can read the dev records | Ruled C12. Planting, first paragraph and "Validity check" |
| ME-m1 | No control-only preparation; plant root collision | Ruled C12 (new root). The export, fifth bullet (control-only trees) |
| CT-m3, IN-M5, ME-M2, ME-M3 | Harness exclusion has no rule; deletes real items; class file is wrong home | Ruled C5. Tuning (`blockedBy`); Scoring, "Harness items"; The export, last bullet (per-job list derived from the builder). Excluded items listed; never applied to catches; absent lists not tuning levers; stale-path plants avoid them |
| ME-B1, ME-M1 | No git in the image; `git diff` leaks plants; `.git` exclusion | Ruled C7. The export, first two bullets |
| IN-m5 | Index and mtime leaks; HISTORY and STATUS leak plants | Ruled C7 (commit after overlay, mtimes). Folded: The export, fourth bullet excludes `docs/HISTORY.md`, `docs/STATUS.md`, and `ROADMAP.md` |
| CT-m1, ME-m2, IN-m6 | Section edges: nesting, lead, fences, off-by-one | Ruled C11. Path map, first two bullets |
| ME-M5 | No thin-map fallback | Ruled C11. Path map, "Thin map" (threshold recomputed at the achieved count before planted runs) |
| ME-m3 | Coarse sections make on-path loose | Ruled C11. Path map, "Ceiling" (40-line window fallback); per-plant distance reported |
| IN-m2 | Plants may land on real defects mapping runs find | Ruled C11. Planting, first paragraph (mapping-run finding spans avoided) |
| IN-M7 | Reruns and partial batches are a selection lever | Folded. Freeze, "Reruns are the runner's alone"; Path map, two-run and one-run rule |
| CT-M7 | No pre-run plant validity check | Folded. Planting, "Validity check" (no plant dropped after planted runs start) |
| CT-m4 | Which control runs count for precision | Folded. Scoring, "Pools"; Bars table (verified Opus control runs on current pages) |
| CT-m5 | Unverified runs flatter precision; no seed | Folded. Freeze, reruns paragraph (an unverified control run's findings all count as false); the agreement seed is ruled O2 |
| IN-m4 | Agreement seed, order, pool | Ruled O2. Bars, "Adjudicator agreement" (sha256 order, agreement before Fable replaces, verified Opus gated runs) |
| CT-m6 | Failure rule all-or-nothing; Sonnet decision post hoc | Ruled O4 (Failure rule) and C15 (Sonnet threshold in "Finding for pass 2a") |
| IN-m1 | Seeding-bias check is contaminated | Folded. Reported list: labeled development-contaminated, with the mapping-run real-defect comparison beside it |
| MT-M7 | Trial measures a chain with the reader it optimized against | Ruled C13. Finding for pass 2a, second bullet; parent erratum |
| CO-M2 | Simulation assumed four pages; parent fixes three | Ruled C13. What the instrument is for no longer carries the four-page figure; Finding for pass 2a, first bullet (three pages, assumptions stated) |
| CO-M3 | Pass 2a item 5 amended without a parent erratum | Ruled C15 and folded. Spec header; Finding for pass 2a, third and fourth bullets; parent "Amendments from pass 1b" section |
| CO-M4, MT-m4 | Two bar sources miscited | Ruled C14. Evidence; thresholds now rest on the curve, the literature is context |
| CO-m1 | Standing regression floor dropped silently | Folded. "What the parent's validation becomes", first bullet; parent erratum |
| CO-m2 | Baseline failures moved from gate to report silently | Folded. "What the parent's validation becomes", second bullet; parent erratum |
| CO-m3 | "Every missed plant sat off the path" overstates | Ruled C15. What failed and why, first bullet |
| CO-m4 | The 35 and 8 groups read as disjoint | Ruled C15. What failed and why, second bullet |
| CO-m5, ME-M6 | Budget understated; counting rule unnamed | Ruled O1. Budget section, itemized at 45k per planned run and 0.8M to 1.3M per task |
| CO-m6 | "Pass 1's ruling 5" is ambiguous | Ruled C15. The catch rule is now defined in this spec's Scoring section, so the citation is gone |
| CO-m7 | Scripter pre-fix pages not pinned | Folded. Freeze, fourth bullet (`29a03eff` for json-output and exit codes, `3453668f` for doctor, verified in `prepare-baseline.ts:48-61`) |
| MT-m1, ME-m4 | `checks[]` never filled; `steps[]` self-report; all-or-nothing verify | Ruled C15 (`checks[]` counts only if tuning populates it). The self-report half is ruled C11 (ceiling) and the `steps[]` definition. All-or-nothing verification stays for gated Opus runs |
| MT-m2 | Off-path detection with no off-path plants | Ruled C15. Dropped from the reported list |
| MT-m3 | Four simultaneous plants interact | Folded. Planting, "Spacing"; recall by position and after a prior stall reported |
| MT-m5 | An Opus planter seeds for an Opus reader | Refused: cost exceeds risk. A `fable` planter draws on the capped weekly pool for ten jobs, and C2's historical reverts already expose the salience gap, reported by source |

## Counts

70 findings across the five reviews (contract 15, integrity 15, consistency 11, mechanics 14,
methodology 15), in 47 rows. A row counts by its disposition's first word.

- **Ruled:** 60 findings, by O1 to O4 and C1 to C15.
- **Folded:** 9 findings, on no ruling: IN-M7, CT-M7, CT-m4, CT-m5, IN-m1, CO-m1, CO-m2, CO-m7,
  and MT-m3.
- **Refused:** 1 finding, MT-m5.

**Why so few refusals.** The owner and conductor rulings were made after reading all five reviews
and already adjudicated every contested fork, so most findings arrive with a ruling rather than
an open choice. The fold refused sub-suggestions where a ruling chose a different mechanism: the
planted-run precision pool (MT-M5), the per-page `steps[]` cap (IN-M4), the task-analysis guard
and command cross-check (MT-M1), and the unverified-run verified-share floor (CT-m5), each
recorded in its row. It refused one whole finding (MT-m5) whose fix costs more than the risk
it removes.

## For the owner

- **The budget sits at the ceiling.** The itemized mid estimate is about 9.9M (range 9.1M to
  10.6M) against 10M, so the 8M flag will trip during the planted runs. The spec pre-registers the
  cuts: tuning round 2 first, then the Sonnet arm. The Sonnet control run was already dropped from
  mapping to fit (the Sonnet arm is planted runs only, so Sonnet's false-finding rate is not
  measured).
- **An instrument-wide failure fails every class.** O4 makes the outcome per class, but C3's
  curve shows no class's own plants can separate recall 0.8 from 0.6, so the discriminating bars
  (sensitivity, stability, agreement) are shared. A class passes only when those pass and its own
  floor and precision bar pass. This is the fold's reading of O4 under C3; it is stated in the
  spec's Bars and Failure rule.

## Second fold

**Input:** the verification read `2026-09-24-pass-1b-spec-fold-verification.md` (4 majors, 9
minors, five two-way readings). **Fold agent:** one `claude-opus-5-5` read, scope limited to the
verification's findings. **Conductor rulings:** V1 stability and refit, V2 thin-map rule, V3
mining, V4 budget cuts. Computations ran with `uv run --with numpy --with scipy` (scratch in
`/tmp/claude-1000/fold2/`); the spec names `oc-curve.ts` as the committed reproduction.

### What V1 and V2 produced

- **Refit.** Pass 1's Bar 1 table recounted with `ruleCandidates[]`-only catches as misses: 4
  plants caught by both Opus runs, 2 by one, 11 by neither (P01, P02, P15, P16 both; P03, P17
  one). Fit: mean 0.29, ICC 0.72, profile 95 percent interval 0.25 to 0.95.
- **27 of 36 still meets the rule across 0.25 to 0.95** (recall 0.6 at most 0.076, recall 0.8 at
  least 0.833), and 27 is the only threshold that does. The endpoints bind: the recall-0.6 pass
  rate peaks at ICC 0.25, the recall-0.8 rate bottoms at 0.95.
- **V2 exposed a gap at 36.** Under V2's two-sided rule across the range, a pooled threshold
  exists at 36, 35, 33, and 32 plants, and at no other count from 20 to 34. A job losing two
  plants would leave sensitivity ungated. At seven per job (42 plants, threshold 31) a threshold
  exists at every count from 35 to 54, and the joint chance that a recall-0.8 instrument clears
  the pooled bar and all four floors rises from 0.67 to 0.81 at its low point. The fold took V1's
  plant-count lever: **42 plants, seven per job, threshold 31**, with at least four semantic
  plants per job to keep C2's half. The seventh plant adds no run.
- **Pass rates, 31 of 42:** recall 0.6 passes 0.08 / 0.06 / 0.05 / 0.05 at ICC 0.25 / 0.5 /
  0.72 / 0.95; recall 0.7 passes 0.58 / 0.44 / 0.38 / 0.36; recall 0.8 passes 0.98 / 0.93 / 0.90
  / 0.88.
- **Floors** rescale by one rule: the largest count a class at recall 0.8 reaches with probability
  at least 0.9 at every ICC in the range. That gives 4 of 7 and 9 of 14 at full count (4 of 6 and
  8 of 12 reproduce under it).
- **Stability.** At 42 plants and recall 0.8, a floor of about 0.13 passes ICC 0.25 with
  probability 0.8, and it passes ICC 0.2 at 0.66 and ICC 0.1 at 0.32. No floor separates a good
  instrument from a bad one, so stability is reported (C4's second branch), with the 0.35 floor's
  pass rates beside it.

### Dispositions

| Finding | Disposition |
| --- | --- |
| Major 1, stability floor | Ruled V1. Spec, Bars ("The operating characteristic" states the refit and why; "Stability" reported, with the computation); What the instrument is for; Failure rule; Reported list; parent erratum |
| Major 2, thin-map recomputation | Ruled V2. Path map, "Recomputed thresholds" (two-sided rule over 0.25 to 0.95, smallest pooled threshold, floors rescale by a stated rule, a bar with no threshold is reported). The plant count moves to 42 under V1's lever, since 36 leaves no threshold at 34 |
| Major 3, fix-commit mining | Ruled V3. Sequence step 5 (Mine); Planting, "The miner" (separate Opus agent, scripted exclusion of cited commits and development-item spans); planter works from the filtered list; Freeze list carries the miner prompt and exclusion script |
| Major 4, budget cuts | Ruled V4. Budget: a round 0 line (0.4M to 0.6M); cuts fire at the 8M flag before or after the freeze, in order round 2, Sonnet arm, transfer planting and planted runs; Data split notes the transfer cut |
| Minor 1, proxy map | Folded. Tuning, "Rounds": any verified quote from any verified Opus control run of the job in pass 1; on-map counts reported before round 1; round 2 is skipped when round 1 leaves fewer than two on-map plants missed |
| Minor 2, round 0 criteria timing | Ruled (conductor). Sequence step 0; Planting, "Record" |
| Minor 3, precision pool | Folded. Scoring, "Pools" and the Bars table: the development jobs' mapping runs only |
| Minor 4, agreement kappa pooling | Folded. Bars, "Adjudicator agreement": gate pooled, report per stratum; pooled kappa averages each stratum's observed and chance agreement, because chance agreement over the union of the label sets inflates kappa; the five-item test runs per stratum, and pooled raw agreement at 85 percent applies if either stratum fails it |
| Minor 5, `blockedBy` match | Folded. Scoring, "Harness items": repository-relative path equality or containment under an absent-list directory; a command matches on first word and first argument against the denial record |
| Minor 6, script cannot judge subjects | Folded. Planting, "Validity check": the subject check moves to the blind read and covers every development-set item |
| Minor 7, ceiling and thin-map order | Folded under V2. Path map, "The ceiling wins" |
| Minor 8, planter export leak | Folded. The export, fourth bullet |
| Minor 9, trial tie rule | Folded. Finding for pass 2a: "at most two thirds" reading, 52 percent and 5 to 14 percent; the strict reading's 4 to 12 percent; 52 percent follows from the effect sitting on the threshold; a halving chain is kept 78 to 86 percent |
| Nit, "at 0.82" | Removed; the passage was rewritten |
| Nit, "both tables" | Removed; the code-path paragraph names what it reproduces |

The five two-way readings close with majors 2 to 4 and minors 1, 3, 4, 5, and 7. **Counts:** 13
findings and 2 nits: 5 ruled (V1 to V4 and the round 0 timing), 8 folded, 0 refused.

### For the owner

- **The budget still overruns before cuts.** Mid about 10.5M (9.6M to 11.3M) before cuts. The
  flag trips during mapping, mining, or planting, after round 2 has run, so the Sonnet arm and the
  transfer planted runs are cut. After cuts: mid about 9.5M, range 8.6M to 10.3M. The high end is
  over the 10M ceiling, and the owner rules on it at the plan gate.
- **Cutting the transfer planted runs is likely at the mid estimate.** Out-of-sample sensitivity
  would then go unmeasured; out-of-sample precision survives through the transfer mapping runs.
- **The plant count moved from 36 to 42.** That is V1's lever, applied because V2's rule leaves 36
  one missing plant away from an ungated bar.
