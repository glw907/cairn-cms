# Docs reset pass 1b: validation record

The verdict record for docs reset pass 1b
(`docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`, spec
`docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md`).

**No gated verdict exists.** Geoff closed the pass on its tuning record (O11, 2026-09-25) before
the freeze. The freeze, the mapping runs, the planting, the planted runs, and the gated scoring
(Tasks 11 to 15) did not run, and no `docs-reset-1b-freeze` tag was made. Under the spec's
"Failure rule", a class that is not validated runs its readers in pass 2a as advisory only. So
every class goes to pass 2a as advisory. This record gives the cause for each class and the
evidence behind the stop.

## Labels

Every figure below carries three labels the spec requires:

- **Development-contaminated.** Every run, plant, and control page is in the development set (pass
  1's plants P01 to P17 and its control pages). The instrument was tuned on these items. No
  figure here measures the frozen instrument on unseen plants.
- **Proxy map.** On-map counts use the tuning proxy map, built from pass 1's verified Opus
  control-run quotes in any field (`scripts/docs-readers/tuning/round0/maps/`). No map was built
  from `steps[]` on frozen mapping runs.
- **In-sample.** False findings are counted on control runs of pages the conductor had already
  adjudicated in pass 1.

No held-out scripter runs took place, since they belonged to the mapping batch. Pass 1's 1 of 9
held-out defects is still the only held-out figure, and it is also contaminated.

## Why the pass stopped

At the checkpoint before the freeze, counted spend stood at 19.92M against the 25M ceiling. The
projection to the close was about 26M. The gated sensitivity bar needs 31 of 42 plants, each
caught in at least two of three runs, which implies true on-path per-run recall near 0.8.
Development-mode on-map recall per plant-run was 2 of 16 in round 0 and 1 of 8 in round 1
(sources below). With recall that far below the bar, every class failing (O5) was the likely
outcome of the gated test. Geoff ruled to close on the tuning record and carry the finding to
pass 2a's design.

## Tuning evidence

Sources: `scripts/docs-readers/tuning/round0/score.json` and
`scripts/docs-readers/tuning/round1/score.json`, both in development mode, both rescored on the
fixed runner at `d7ef74dd`. Round 0 is pass 1's saved Opus reports, two planted and two control
runs per job. Round 1 is one planted and one control run per job with the four adopted changes
(`steps[]`, `diverged[]`, `blockedBy`, and the git export).

On-map development plants per job (`byJob.<job>.onMapPlantCount`): evaluator 0, operator 2,
designer 2, extender 2, core developer 1, scripter 1. That is 8 of pass 1's 17 plants.

| Job | Class | R0 plant-run recall | R1 plant-run recall | R0 false / control run | R1 false / control run |
| --- | --- | --- | --- | --- | --- |
| evaluator | docs-only | 0/0 | 0/0 | 1.5 | 0 |
| operator | docs-and-binary | 0/4 | 0/2 | 1.5 | 0 |
| designer | docs-and-site | 0/4 | 0/2 | 0.5 | 0 |
| extender | docs-and-site | 0/4 | 0/2 | 0 | 0 |
| core developer | repository | 0/2 | 0/1 | 0 | 0 |
| scripter | repository | 2/2 | 1/1 | 1.5 | 7 |

Recall is `byJob.<job>.onMapPlantRunRecall` (`caught`/`total`). False findings per control run
are `byJob.<job>.falseFindingsPerVerifiedControlRun`, over 2 verified control runs per job in
round 0 and 1 in round 1 (`verifiedControlRunCount`).

Pooled (`onMapPlantRunRecall`): round 0 2 of 16 (rate 0.125, interval 0.016 to 0.383); round 1
1 of 8 (rate 0.125, interval 0.003 to 0.527). Under the gated two-of-three rule
(`onMapRecall`, per plant), round 0 caught 1 of 8 plants (repository 1 of 2) and round 1 caught
none. Round 1 cannot reach that rule, since it has one planted run per job.

Every control run verified in both rounds. Round 1's `notes` list is empty. Round 0's 17 notes
are expected exclusions (Sonnet duplicates and jobs outside round 0's scope), listed in the
tuning record.

## The catch-ruling audit

A read-only Opus audit read every catch ruling on the 24 on-map plant-runs (round 0's 16 and
round 1's 8). It found no judge defect and no criterion defect.

- **3 catches, all correct.** Each is P16, on the scripter's doctor page, caught in both round 0
  runs and in the round 1 run.
- **21 misses.** 11 are true misses: the report never addressed the plant's subject. 10 were
  noticed only in `ruleCandidates[]`, across four plants (P05, P06, P09, P11), each over two or
  three runs. In each case the reader routed around the defect and filed a "the page should say
  X" candidate. Where a round 1 reader used `diverged[]` on one of these plants, the stated reason
  was convenience, not that the page was wrong.
- **Coverage.** Every run reached the section holding each on-map plant. P07 and P14 were read
  past and missed in every run.
- **One close call.** In round 0's first operator run, the reader saw that P03's command and its
  example disagree but never said the flag was wrong. Read literally, the criterion makes that a
  miss, and the judge ruled it so.

The spec counts `ruleCandidates[]` as neither a catch nor a finding, so the 10 score as misses
under the pinned instrument. The gap is between what a reader notices and what it files in a
scored field. This is the main finding for pass 2a.

## Defects found and fixed in tuning

Three runner and scorer defects surfaced in tuning. Each was fixed, reviewed by a `diff-reviewer`,
and both rounds were rescored.

1. **Judges never received their frozen prompt** (`f618743a`). A judge batch's job text was a
   placeholder, and nothing loaded `prompts/*.md` onto the judge's stdin. Every first-run round 0
   ruling was void. The fix sends each judge kind its frozen prompt and an arrival line naming
   `index.json`, and refuses placeholder job text before any container starts.
2. **The expected rulings included harness-excluded items** (`6d5d2e18`). The runner built an
   adjudicator's expected set from the key's full item map, including items the packet never
   shows. Five of round 1's six adjudicator runs could not verify. The fix subtracts the key's
   excluded items.
3. **Development mode applied the gated two-of-three rule** (`407dbb2a`, conductor ruling R8).
   Round 1's one planted run per job could never count a catch. The fix adds
   `onMapPlantRunRecall`, a per-plant-run count, and leaves gated mode unchanged.

## Cause per class

| Class | Status for pass 2a | Cause |
| --- | --- | --- |
| docs-only (evaluator) | Advisory | No gated test ran (O11). Sensitivity is unmeasured: no development plant fell on the evaluator's proxy map. Development false findings fell from 1.5 to 0 per control run. |
| docs-and-binary (operator) | Advisory | No gated test ran (O11). On-map recall 0 of 6 plant-runs across both rounds, with misses including the routed-around pattern. False findings fell from 1.5 to 0. |
| docs-and-site (designer, extender) | Advisory | No gated test ran (O11). On-map recall 0 of 12 plant-runs across both rounds. False findings: designer 0.5 to 0, extender 0 and 0. |
| repository (core developer, scripter) | Advisory | No gated test ran (O11). On-map recall 3 of 6 plant-runs, all on one scripter plant (P16); the core developer caught 0 of 3. The scripter's false findings rose from 1.5 to 7 on its one round 1 control run. |

## What stands for pass 2a

These exist, are tested, and merge with the pass. None of it is frozen, since no freeze ran.

- **The built instrument:** the report schema with `steps[]`, `diverged[]`, and `blockedBy`; the
  git export with its exclusions and derived absent lists; the runner's freeze tool, gated-batch
  refusal, stamp, and automatic rerun; the judge classes and packet builders; the transcript
  audit.
- **The scorer** (`score.ts` and `lib/score-*.ts`), in development and gated modes.
- **The path map** (`path-map.ts`), with its proxy mode, and the harness filter.
- **`oc-curve.ts`,** which recomputes thresholds at any achieved plant count.
- **The chain** (`lib/chain.ts`), for post-freeze artifacts.
- **The session ledger** (`session-ledger.ts`), which applies the counting rule.

No test plants exist, because the planter never ran. The labeled defect set the spec assigns to
pass 1b's test plants is therefore empty, and pass 2a must supply its own. The spec's standing
regression floor (the frozen test batch) does not exist either.
