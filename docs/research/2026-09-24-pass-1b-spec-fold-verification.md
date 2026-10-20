# Pass 1b spec fold: verification read

**Target:** `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md` at
`d875b4b5`, diffed against `30083f27`. **Inputs:** the fold record, the five lens reviews, and the
parent's "Amendments from pass 1b" section. **Reader:** one fresh `claude-opus-5-5` read with no
part in the fold. Rulings O1 to O4 and C1 to C15 are taken as settled; this read checks only
whether the fold applied them faithfully and whether the result can run.

**Counts:** 0 blockers, 4 majors, 9 minors. The operating-characteristic figures reproduce. Two
derived numbers do not fully hold: the stability floor's calibration and the thin-map
recomputation rule. Spec line numbers are at `d875b4b5`.

## 1. Did each blocker and major close?

Yes. Every blocker and major in the five reviews closes at the location the fold record cites:

- **Blockers.** CT-B1, IN-B1, and ME-m6 close at spec:213-218, with the criterion and near miss
  at spec:196-200. CT-B2 closes at spec:247 and 281-284. MT-B1 closes at spec:187-193. MT-B2 closes
  at spec:216-218. ME-B1 closes at spec:146-150.
- **Majors.** Each closes as cited. ME-M5 and IN-M3 close only in part; majors 2 and 3 below give
  the remaining gap in each.

The parent erratum (parent:44-63) matches the spec's gates, the Sonnet threshold, the labeled set,
and the trial finding.

## 2. Recomputed numbers (question 3)

The runs used `uv run --with numpy --with scipy`, with scratch files in `/tmp/claude-1000/oc/`.

| Claim (spec line) | Spec | Recomputed | Verdict |
| --- | --- | --- | --- |
| Beta-binomial MLE, 9/2/6 (254-255) | mean 0.59, ICC 0.76, profile CI 0.35-0.95 | 0.588, 0.757, CI 0.34-0.96 | Reproduces |
| 27 of 36, recall 0.6 / 0.7 / 0.8 / 0.9 at ICC 0.76 (261-264) | 0.05 / 0.34 / 0.84 / 1.00 | 0.047 / 0.338 / 0.845 / 0.998 | Reproduces |
| Same at ICC 0.35 | 0.06 / 0.46 / 0.93 / 1.00 | 0.065 / 0.459 / 0.927 / 1.000 | Reproduces |
| Same at ICC 0.95 | 0.04 / 0.33 / 0.83 / 1.00 | 0.045 / 0.326 / 0.833 / 0.998 | Reproduces |
| 24 plants: only 18 meets the rule at ICC 0.76; none at 0.5 (267-268) | 0.82 / 0.10 | 0.822 / 0.099; none at 0.5 | Reproduces |
| Floors at 0.8 fail 4/6, 8/12 (271-272) | 0.10, 0.07 | 0.095, 0.068 | Reproduces |
| Floors at 0.6 pass (273) | 55%, 44% | 54.8%, 44.3% | Reproduces |
| Class clears both sensitivity bars at 0.8; all four (274-275) | about 0.8; 0.68 | 0.79 (one-job), 0.82 (two-job); 0.679 | Reproduces |
| Fleiss kappa at least 0.35, recall 0.8, ICC 0.76 / 0.5 / 0.2 / 0 (277-279) | 1.00 / 0.82 / 0.10 / 0.00 | 0.994 / 0.819 / 0.096 / 0.001 (5,000 draws, seed 20260924) | Reproduces |
| Trial, three pages (335-340) | kept about 50%; no-difference 4-12% | 48-53%; no-difference 3.8-11.5% under a strict "fewer than two thirds", 4.5-13.9% under "at least a third fewer" (the parent's words) | Reproduces under the strict reading; see minor 9 |
| 90% recall on 17 plants, 2 of 3 (27-28) | about 60% | 0.618 | Reproduces |
| 13 FPs over 16 verified control runs (282-283) | 0.8 per run | 3+0+4+6 = 13; 2+3+5+6 = 16 runs (record:156-161, 272-274) | Reproduces |

Two checks go beyond the stated figures and feed major 1 and major 2:

- **Refit under the spec's own counting rule.** Pass 1's 9/2/6 counts include catches made only in
  `ruleCandidates[]` (record:60-76, "rc N"). The spec now counts those as neither (spec:210).
  Recounted on stalls and `assumed[]` only, pass 1 gives 4 plants caught by both runs, 2 by one,
  and 11 by neither. The fit is then mean 0.30, ICC 0.72, profile CI 0.25 to 0.95. The sensitivity
  table stays robust: at ICC 0.25, recall 0.6 passes 0.08 and recall 0.8 passes 0.95. The
  stability bar does not stay robust (major 1).
- **The 36-plant threshold against the thin-map rule.** At ICC 0.76, the smallest threshold with
  recall 0.6 passing at most 0.1 is **26**, not 27. The threshold 27 is the one that meets the rule
  at all three ICC values (at ICC 0.35, 26 lets recall 0.6 pass above 0.1). The recomputation rule
  at spec:175-177 does not say this (major 2).

## 3. Findings, ranked by consequence

### Major 1. The stability floor sits inside the plausible ICC range, so it can fail a good instrument, and a failure fails every class

- **Location:** spec:246, 250-257, 277-279, 319-323.
- **Defect.** The spec presents ICC 0.35 to 0.95 as the plausible range and checks the sensitivity
  curve across it. It places the stability floor at 0.35, the bottom of that range. At recall 0.8,
  an instrument with ICC 0.35 clears the floor about 45 percent of the time. Refit under the spec's
  own counting rule, the ICC range extends down to 0.25 (section 2), where the pass rate is about 19
  percent. The ICC was also fitted on whole-page plants. Pass 1's record attributes the six
  both-missed plants to off-path runs. That shared-miss mechanism inflates ICC, and the redesign
  removes it by planting on the path, so the on-path ICC is plausibly lower than 0.76. Stability is
  instrument-wide, and under O4 a failure fails every class with no fix round (spec:319-323). The
  claim that recall 0.8 passes with probability at least 0.8 (spec:266) holds for sensitivity
  alone, not for the gate.
- **Fix.** Keep C4's gated floor and restate its calibration. Take one of two routes:
  - Set the floor so that a recall-0.8 instrument at the lowest plausible ICC still passes with a
    stated probability. At ICC 0.35, simulated pass rates for recall 0.8 are 0.83 with a floor of
    0.2 and 0.73 with 0.25. At ICC 0.1, the floor of 0.2 passes 0.16.
  - Keep 0.35 and state in the Bars section that a recall-0.8 instrument with ICC between 0.25 and
    0.35 fails stability most of the time.

  Either way, give the joint pass probability of sensitivity and stability at recall 0.8 across
  the ICC range. Also note that the fit counts `ruleCandidates[]` catches.

### Major 2. The thin-map threshold recomputation is underspecified and disagrees with how 27 was chosen

- **Location:** spec:173-177; related spec:244-246, 267-268.
- **Defect.** The rule reads: recompute "holding the pass probability at a true recall of 0.6 to
  at most 0.1". It names no ICC. It drops the other half of the rule, "0.8 passes at least 0.8".
  It does not require robustness across the ICC range. Applied literally at 36 plants and ICC 0.76,
  it yields 26, not the spec's 27. It also leaves three things unstated for fewer plants:
  - whether the per-class floors (4 of 6, 8 of 12) scale down;
  - whether the stability matrix and floor change;
  - whether the floors' "about 0.1" tripwire property must hold at the new count.

  The fallback is likely to fire. ME-M5 found operator runs gave 3 to 4 quotes per run, and six
  plants need at least three on-path sections under the spacing rules.
- **Fix.** State the rule that produced 27: the smallest threshold at which recall 0.6 passes at
  most 0.1 at each of ICC 0.35, 0.76, and 0.95. Report the recall-0.8 pass probability beside it.
  State whether the floors and the stability matrix rescale with the achieved count. For example,
  a class floor could stay two thirds of that class's plants, rounded up, and kappa could be
  computed on the achieved matrix with the floor unchanged.

### Major 3. Fix-commit mining reopens the planter's isolation and can replant development defects

- **Location:** spec:182-185, 191-193, 201-203; budget spec:365.
- **Defect.** The preferred plant source is "the pre-fix text of a docs-fix commit". The planter,
  though, works from the repository export, which has one synthetic commit and no history
  (spec:147-150), so it cannot mine commits. The budget lists "fix-commit mining" as its own item,
  and the spec never says who mines or with what isolation. Git history carries the records,
  STATUS, and HISTORY that C12 keeps from the planter. The most recent docs-fix commits on the
  scripter's pages are pass A's fixes of D01 to D19. Reverting one replants a development-set
  defect. The tuner has seen all 19, including the held-out 9, which the bans at spec:112-113
  cover. The validity check excludes only subjects shared with "a development plant" (spec:203),
  and that phrase can be read to mean pass 1's P01 to P17 alone.
- **Fix.** Name the miner: a separate agent or a script. Have it hand the planter only candidate
  pre-fix hunks (page, line span, pre-fix text, and fix commit), never the log messages or the
  records. Exclude every commit that fixed a development-set item: F1 to F6, R1 to R4, P01 to P17,
  and D01 to D19. Widen the validity check from "a development plant" to "any development-set
  item".

### Major 4. The pre-registered budget cuts are keyed to an event the spec's own estimate says will not happen, and one cost is missing

- **Location:** spec:351-374.
- **Arithmetic.** It is correct:
  - The seven run-count lines check: 24 x 45k = 1.08M; 30 x 45k = 1.35M; 3 x 45k = 0.135M;
    36 x 45k = 1.62M; 51 x 12k = 0.612M; 42 x 20k = 0.84M.
  - The run counts check: 51 = 36 test and transfer planted + 12 tuning planted + 3 held-out.
    42 = 12 tuning control + 30 mapping.
  - Excluding the implementer line, the lines sum to 6.74M. With 2.4M to 3.9M of implementer
    work, the total is 9.14M to 10.64M, mid 9.89M.
  - The cut sizes check: round 2 is 0.54M + 0.072M + 0.12M = 0.73M, and the Sonnet arm is 0.27M +
    0.072M = 0.34M.
  - The ceiling and flag match O1.
- **Defect.** The cuts apply "if the flag trips before the freeze" (spec:372). Pre-freeze spend at
  the mid estimate is about 4.5M to 5M: implementer tasks 3.15M, tuning with its judging about
  1.46M, and the transfer author. So the flag cannot trip before the freeze. The spec itself says it
  trips "during the planted runs" (spec:371-372), where no action is pre-registered. The Sonnet arm
  is still droppable then, since it gates nothing. The high estimate of 10.6M exceeds the ceiling.
  The itemization also omits round 0 (spec:63-64). Rescoring pass 1's saved reports under this
  spec's rules needs the catch judge and the adjudicator on pass 1's runs: about 0.4M on the
  verified Opus runs, about 0.6M on all 36. That puts the mid estimate at or above 10M.
- **Fix.**
  - Add a round-0 line of 0.4M to 0.6M.
  - Key the cuts to the projected total at a checkpoint before round 2, where spent plus remaining
    itemized exceeds 8M: drop round 2 first.
  - Add a post-freeze rule: if the flag trips during the planted runs, drop the Sonnet arm's
    remaining runs; otherwise continue to the ceiling and ask.

### Minor findings

1. **spec:100-103. The development proxy map has no construction rule.** It is built from "pass 1's
   control-run quotes", but the spec does not say which runs count (Opus only, verified only) or
   what threshold applies (2 of 3, or any quote). Pass 1 carried roughly one quote per page, so
   most development plants may fall off the map, and the keep rule's "+2 on-map catches" may be
   unreachable. **Fix:** state the runs and the threshold, and report the on-map plant count per
   job before round 1.
2. **spec:199-200 against spec:63-64. The criteria timing does not fit round 0.** Development-plant
   criteria are written "before their runs", but round 0 rescores runs that already happened.
   **Fix:** "before round 0".
3. **spec:234-235 and 247. The precision pool is ambiguous.** "Verified Opus control runs on current
   pages" also matches the tuning rounds' control runs. The fixed counts (3 and 6) imply the
   mapping runs only. **Fix:** say "the development jobs' mapping runs".
4. **spec:289-291. The agreement kappa does not say whether it pools.** Catch calls are binary and
   findings take three labels. The spec does not say whether kappa pools the 30 items over one
   label set or is computed per stratum, nor which one the five-item rule applies to. **Fix:**
   state one of the two.
5. **spec:230-231. The `blockedBy` match to denials is unstated.** The denial record is a tool name
   plus a JSON excerpt (`transcript.ts:486-497`). The spec does not say how a `blockedBy` string
   matches a denial. **Fix:** name the rule, for example the leading command word and first
   argument, as ME-M2 proposed.
6. **spec:201-203. The validity script cannot judge subjects.** "Shares no subject with a
   development plant" needs judgment, so a script cannot check it. **Fix:** move that clause to the
   blind read.
7. **spec:170-177. The ceiling and thin-map fallbacks have no order.** The ceiling narrows the map,
   and the thin-map rule widens it to single-run sections, which can break the ceiling again.
   **Fix:** state which rule wins.
8. **spec:152-153 against spec:182-183. The planter's export may leak plants.** HISTORY, STATUS, and
   ROADMAP are excluded only "for gated batches", and the planter's export is not a batch, yet
   these files "tell a reader that plants exist". **Fix:** exclude them from the planter's export
   too.
9. **spec:335-340. The trial's no-difference figure depends on the tie rule.** The "4 to 12
   percent" holds under a strict "fewer than two thirds". Under the parent's "at least a third
   fewer", read as at most two thirds, it reaches about 14 percent at recall 0.4 and ICC 0.76.
   Separately, "about 50 percent" follows by construction, because the simulated effect equals the
   decision threshold. **Fix:** state the tie reading. Say that the 50 percent follows from the
   effect sitting on the threshold, and give the keep rate at a larger effect.

Two wording nits need no finding. spec:268 reads "at 0.82", which parses as an ICC; it means the
pass probability. spec:296 reads "both tables", but only one table is computed; the stability
figures are presumably the second.

## 4. Sequence check (question 2)

The order runs as written. The inputs each step needs exist before it:

- The judge and adjudicator prompts come before round 0.
- The transfer texts come before the freeze.
- The pins and seeds are in the freeze.
- The maps are committed before planting.
- The mapping-run finding spans are given unadjudicated.
- The plant record and its hash come before the planted runs.
- The criteria come before the runs they score.

There are three exceptions:

- the round-0 criteria timing (minor 2);
- fix-commit mining, which has no owner in the sequence (major 3);
- the thin-map threshold, which the OC script must compute before the planted runs under a rule
  the spec leaves open (major 2).

No number contradicts itself across sections. Sensitivity 27/36, floors 4/6 and 8/12, precision
3/6, the Sonnet 5-of-6, and the 45k per run all agree between the Bars, the Finding, the Budget,
and the parent erratum.

## 5. Open readings for the plan author (question 5)

Seven items can be read two ways:

- the thin-map recomputation (major 2);
- who mines fix commits, and what "development plant" covers (major 3);
- when the budget cuts fire (major 4);
- the proxy map's construction (minor 1);
- the precision pool (minor 3);
- how agreement kappa pools (minor 4);
- the `blockedBy` match rule and the order of the ceiling and thin-map rules (minors 5 and 7).

Everything else is plannable as written.
