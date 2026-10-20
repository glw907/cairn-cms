## Bars

The gate reads verified Opus runs on the development jobs only. The thresholds come from the
operating characteristic below, not from the literature.

| Bar | Pass condition | Scope |
| --- | --- | --- |
| Sensitivity | A plant counts as caught when at least two of its three runs catch it; at least 31 of the 42 plants caught | Instrument-wide |
| Sensitivity floor | At least 4 of 7 plants for a one-job class (docs-only, docs-and-binary); at least 9 of 14 for a two-job class (docs-and-site, repository) | Per class |
| Precision | False findings summed over the class's verified Opus mapping runs at most one per run (3 for a one-job class, 6 for a two-job class) | Per class |
| Adjudicator agreement | On the O2 sample, pooled Cohen's kappa at least 0.6, or pooled raw agreement at least 85 percent where kappa cannot be computed (see below) | Instrument-wide |

Stability is reported, not gated (see "Stability" below).

**The operating characteristic.** Plants are scored with their three runs clustered: each plant
has its own per-run catch probability, drawn from a beta distribution whose mean is the
instrument's true on-path recall and whose intraclass correlation (ICC) is estimated from pass 1.
The fit uses this spec's counting rule, so a catch made only in `ruleCandidates[]` counts as a
miss. Recounted that way from the pass 1 record's Bar 1 table, pass 1's two Opus runs per plant
caught 4 plants in both, 2 in one, and 11 in neither. The beta-binomial maximum-likelihood fit
gives a mean of 0.29 and an ICC of 0.72, with a profile 95 percent interval of 0.25 to 0.95. (The
fit that counted rule candidates, 9, 2, and 6, gave 0.59 and 0.76, interval 0.35 to 0.95.) The
mean describes whole-page plants and does not carry over; the ICC range does. Pass 1's ICC also
carries the shared off-path misses the path map removes, so the on-path ICC may sit lower, which
is why the design must hold across the whole interval. Plants are treated as independent given
the instrument. Pass 1's data cannot estimate a within-run effect across a job's plants, so the
ICC range is the stated sensitivity check. Probabilities are exact beta-binomial sums.

| True recall | Pass probability, 31 of 42, ICC 0.25 | ICC 0.5 | ICC 0.72 | ICC 0.95 |
| --- | --- | --- | --- | --- |
| 0.6 | 0.08 | 0.06 | 0.05 | 0.05 |
| 0.7 | 0.58 | 0.44 | 0.38 | 0.36 |
| 0.8 | 0.98 | 0.93 | 0.90 | 0.88 |
| 0.9 | 1.00 | 1.00 | 1.00 | 1.00 |

The rule the thresholds meet: at every ICC from 0.25 to 0.95, an instrument with true on-path
recall 0.8 passes with probability at least 0.8, and one at 0.6 passes with probability at most
0.1. The recall-0.6 pass probability peaks at the low end of the range and the recall-0.8 one
bottoms at the high end, so the endpoints bind. At 36 plants, 27 of 36 also meets the rule
(0.08 at recall 0.6 and ICC 0.25; 0.83 at recall 0.8 and ICC 0.95), but no threshold meets it at
34 plants or at 31 and below, so a job losing two plants would leave sensitivity ungated. At 42
plants a threshold exists at every achieved count from 35 up (Path map, "Recomputed thresholds"),
and every class clearing both sensitivity bars together rises from 0.67 to at least 0.8. So the
count is 42, seven per job, threshold 31.

**Per-class floors are tripwires.** A class's own plants cannot separate 0.8 from 0.6. Each floor
is the largest count a class at true recall 0.8 reaches with probability at least 0.9 at every ICC
in the range: 4 of 7 fails such a class at most 3 percent of the time and 9 of 14 at most 4
percent, while a class at 0.6 still passes them 71 to 75 and 49 to 55 percent of the time. The
discriminating evidence is the pooled bar, and one reader instruction set serves every class, so
an instrument-wide failure fails every class. At true recall 0.8, a given class clears both
sensitivity bars with probability 0.86 to 0.97 across the ICC range, and all four together 0.81
to 0.93. At 0.6, all four together pass at most 0.06.

**Stability** is reported, not gated. Fleiss' kappa over the 42-plant by three-run catch matrix
is computed and reported instrument-wide and per class, beside the pass rates a floor of 0.35
would have had. Simulated at true recall 0.8 (5,000 draws, seed 20260924), kappa clears 0.35 with
probability 1.00 at ICC 0.95, 0.99 at 0.72, 0.85 at 0.5, 0.47 at 0.35, 0.19 at 0.25, and 0.09 at
0.2. No floor serves as a gate: a floor low enough that a recall-0.8 instrument at ICC 0.25 passes
with probability 0.8 (kappa about 0.13) also passes one at ICC 0.2 with probability 0.66 and one at
0.1 with 0.32. Runs that agree barely beyond chance would pass. On-path sensitivity already
requires two of three runs per plant, so an unstable instrument pays for it in the pooled bar.

**Precision** is set from pass 1's data. Counted over stalls and `assumed[]` only, pass 1's verified
control runs carried 13 false positives over 16 runs, about 0.8 per run, with harness artifacts
the new export removes still in the count. The bar holds each class to about that rate. It cannot
pass vacuously: a silent reader passes it and fails sensitivity.

**Adjudicator agreement (O2).** One `fable` read re-rules 30 items: 15 control-run findings
(labels real, false, harness) and 15 catch calls (caught, missed), from verified Opus gated runs,
each stratum balanced by the primary ruling where the pool allows. Items are ordered by
`sha256("docs-reset-1b-agreement" + item id)` and taken from the top. Agreement is computed before
any Fable ruling replaces a primary one. The gate pools the two strata; each stratum's kappa or
raw agreement is reported. The pooled kappa averages the strata's observed and chance agreement,
weighted by size, and then applies Cohen's formula. It never computes chance agreement over the
union of the two label sets, which would inflate kappa, since no item can be mislabeled across
strata. Kappa applies when, in each stratum, each rater's labels include at least five items
outside the largest category. Otherwise the gate is pooled raw agreement at 85 percent, and the
record gives the reason. Fable's ruling stands on every disagreement. An agreement failure fails
every class, since every judged count rests on the two judges.

**The simulation's code path.** `scripts/docs-readers/oc-curve.ts`, seed 20260924, reproduces the
pass 1 refit, the sensitivity table, the floors, the stability figures, and the recomputed
thresholds at any achieved plant count. The plan commits it before the freeze; it is specified
here, not built.

