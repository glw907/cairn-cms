# Docs reset pass 1b: tuning record

Task 9 (round 0) and Task 10 (round 1) of the pass 1b validation plan
(`docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`). Every number below traces to a
scorer output file, cited by its JSON path.

**Round 0 ran twice.** The first run (superseded, not in this record) judged pass 1's saved
reports without ever sending a judge its own instructions: a batch job's `arrival`/`job` fields
carried a placeholder ("n/a: judge class, packet-driven"), and nothing loaded
`prompts/{catch-judge,adjudicator}.md` onto the judge's stdin. `JUDGE_SYSTEM_PROMPT` tells a judge
to follow the instructions on stdin, so an uninstructed judge had none, and the adjudicator
returned zero rulings against both `designer-control-1` and `designer-control-2`. Commit
`f618743a` fixed the runner: `composeJudgePrompt` now always sends a runner-composed arrival line
naming the packet's own `index.json` plus the judge kind's frozen prompt, read fresh from
`scripts/docs-readers/prompts/` on every call, and `checkJudgeJobField` refuses a whole batch,
before any container starts, unless a job's `job` field is the `JUDGE_FIELD_UNUSED` marker or
byte-identical to its kind's frozen prompt file. **Every ruling the first round-0 run produced is
void and was discarded**; this record's "Round 0" section below is entirely from the second,
fixed-runner run. See "Judge fixes" below for the misruling this fixed.

## Round 0

Round 0 rules pass 1's saved Opus reports under the pinned instrument: the catch judge on the
twelve verified Opus **planted** runs, the adjudicator on the twelve verified Opus **control**
runs (two per development job), then rescores both under the spec's development-mode counting
rules and the tuning proxy path map. Inputs: pass 1's saved reports
`~/.cache/docs-readers/results/validation-20260924/report.json` and
`~/.cache/docs-readers/results/validation-rerun-20260924/report.json`; for a job id present in
both, the rerun copy is the one scored (`score.json` `notes`, "superseded copy... dropped in
favor of..."), which resolved `operator-planted-2` and `operator-control-1` to their rerun
copies.

### Derived absent lists

Pass 1's jobs carried no `absent` field. Each development job's absent list was derived
read-only against pass 1's prepared control trees
(`~/.cache/docs-readers/prepared/validation/<job>-control`) at commit `b2756399` (pass 1's
validation page pin; `docs/superpowers/research/2026-09-24-pass-1b-preflight.md` confirms every
development page is byte-identical between `b2756399` and the `3a7485dd` pin), using each job's
real builder from `lib/prepare-class.ts` (`omittedPaths`/`trackedPaths` for the docs-only,
docs-and-binary, and docs-and-site classes, plus `DOCS_AND_SITE_EXCLUDED_PATHS`;
`absentPaths`/`trackedPaths` against `REPOSITORY_EXCLUDED_PATHS` for the repository class;
per-subfolder `omittedPaths` with the scripter's bundle prefixes `json-output/`, `doctor/`,
`exit-codes/` kept, per the carries). Saved at
[`scripts/docs-readers/tuning/round0/absent-lists.json`](../../../scripts/docs-readers/tuning/round0/absent-lists.json).
Counts per job:

| Job | Absent-list entries |
| --- | --- |
| evaluator | 81 |
| operator | 136 |
| designer | 106 |
| extender | 101 |
| core-developer | 23 |
| scripter | 217 |

### Harness-excluded items

The harness filter (`harness-filter.ts`) ran over every one of the twelve adjudicator packets'
catch-field items (57 items total; per-job counts below), against each job's derived absent list
and the run's own denial record. **It excluded nothing.** Pass 1's saved reports predate the
`blockedBy` field (Task 1), so every item's `blockedBy` normalizes to `null`
(`lib/transcript.ts`'s shared loader), and the filter only ever excludes an item whose
`blockedBy` claim matches an absent path or a denied command; a `null` claim always falls
through to `remaining`. Full per-job log at `~/.cache/docs-readers/packets/round0/harness-filter-log.json`
(a cache path, not committed; reproduced here):

| Job control run | Remaining (sent to the adjudicator) | Excluded | Adjudicator notes |
| --- | --- | --- | --- |
| evaluator-control-1 | 5 | 0 | 0 |
| evaluator-control-2 | 6 | 0 | 0 |
| operator-control-1 | 5 | 0 | 0 |
| operator-control-2 | 4 | 0 | 0 |
| designer-control-1 | 6 | 0 | 0 |
| designer-control-2 | 5 | 0 | 0 |
| extender-control-1 | 5 | 0 | 0 |
| extender-control-2 | 5 | 0 | 0 |
| core-developer-control-1 | 8 | 0 | 0 |
| core-developer-control-2 | 9 | 0 | 0 |
| scripter-control-1 | 9 | 0 | 0 |
| scripter-control-2 | 9 | 0 | 0 |

### Judge runs (fixed-runner run)

- Catch judge batch `round0-catch` (`scripts/docs-readers/batches/round0-catch.json`, ungated,
  concurrency 4, judge kind sent its frozen prompt per `f618743a`): 12 jobs, all verified on the
  first attempt, no reruns, `stopReason: complete`. Counted tokens: 32,545 (cache read 190,387
  apart).
- Adjudicator batch `round0-adjudicator` (`scripts/docs-readers/batches/round0-adjudicator.json`,
  ungated, concurrency 4, same fix): 12 jobs, all verified on the first attempt, no reruns
  (`designer-control-1` and `designer-control-2` both verified this time, rulings 6 and 5), `stopReason: complete`.
  Counted tokens: 205,891 (cache read 1,141,819 apart).
- Total round 0 judge spend (fixed-runner run): 238,436 counted tokens, 1,332,206 cache read.

### Proxy maps and development measures

Each job's proxy map (`path-map.ts build --proxy`, one run over pass 1's verified Opus control
runs, seed n/a) is committed at
[`scripts/docs-readers/tuning/round0/maps/`](../../../scripts/docs-readers/tuning/round0/maps/),
one file per job. Every map used both verified Opus control runs pass 1 produced per job
(`verifiedRuns: 2` in every map file); a section is on a job's proxy map when any of those
verified runs carries a verified quote inside it, in any report field. **The map is a proxy
built from pass 1's control-run quotes, not the pinned `steps[]` instrument's own path map;
off-map development plants are reported only, never counted against recall.**

All figures below are from `scripts/docs-readers/tuning/round0/score.json`, `byJob.<job>`
(fixed-runner run). `onMapCaught` is the gated sensitivity bar's own two-of-three rule
(`caughtCount >= 2`); `onMapPlantRunRecall` (added by `407dbb2a`, R8) is the un-gated recall
summed over every counted plant-run, the figure round 1's one-run-per-job jobs need:

| Job (`byJob.<job>`) | On-map plants (of total) | On-map catches (`onMapCaught`) | On-map plant-run recall (`onMapPlantRunRecall`) | Verified control runs | Total false findings | False findings / verified control run |
| --- | --- | --- | --- | --- | --- | --- |
| evaluator | 0 of 2 (17 total dev plants for this job) | 0 | 0/0 (null) | 2 | 3 | 1.5 |
| operator | 2 of 3 | 0 | 0/4 | 2 | 3 | 1.5 |
| designer | 2 of 3 | 0 | 0/4 | 2 | 1 | 0.5 |
| extender | 2 of 3 | 0 | 0/4 | 2 | 0 | 0 |
| core-developer | 1 of 3 | 0 | 0/2 | 2 | 0 | 0 |
| scripter | 1 of 3 | 1 | 2/2 (rate 1) | 2 | 3 | 1.5 |

Pooled (sum of `caught`/`total` across all six jobs): 2/16 on-map plant-runs caught in round 0.
With the judge correctly instructed, every job's two verified Opus control runs now score (no
job is excluded for an unverified adjudicator this round); designer's true false-finding rate,
unmeasured in the first (void) run, is 0.5 per verified control run.

The on-map recall by class, also from `score.json` (`onMapRecall`): docs-only 0/0 (no scored
plants on evaluator's map), docs-and-binary 0/2, docs-and-site 0/4, repository 1/2. These are
round-0, proxy-map, pre-tuning figures and carry no bar or verdict (development mode never
emits one).

### Judge fixes

**The misruling this record's round 0 discarded:** every ruling in the first round-0 run was made
by a judge given no instructions at all (see the note at the top of this record), so every one of
them is void, not merely `designer-control-1` and `designer-control-2`'s. The symptom that
surfaced it: those two runs' adjudicator returned zero adjudications against packets of 6 and 5
real items, on both the original attempt and the runner's automatic rerun, violating the
adjudicator's own prompt (`prompts/adjudicator.md`, "Output": "exactly one adjudication for every
catch-field item in the packet, and no other entries"). Every other job's judge run that round
also completed and "verified" (by the runner's coverage check, since a judge under no
instructions can still emit a well-formed but arbitrary ruling for each item it happens to
address), so the empty-array failure on designer's two runs was the only visible symptom of a
defect that silently affected all twenty-four round-0 judge runs.

- **Cause:** a batch job's `arrival`/`job` fields carried a placeholder string ("n/a: judge
  class, packet-driven") instead of the judge kind's frozen prompt; `JUDGE_SYSTEM_PROMPT` tells a
  judge to follow the instructions on stdin, and the runner never composed or sent any.
- **Fix:** commit `f618743a`. `composeJudgePrompt` now takes the batch's judge kind, not a job,
  and always sends a runner-composed arrival line naming the packet's `index.json` plus the
  kind's frozen prompt file, read fresh on every call; `checkJudgeJobField` refuses the whole
  batch before any container starts unless a job's `job` field is the `JUDGE_FIELD_UNUSED` marker
  or byte-identical to the frozen prompt, so a placeholder can never reach a judge again.
- **Effect on this record:** the entire first round-0 run (both batches, 24 jobs) was discarded
  and rerun from the same packets; every number in this record's "Round 0" section above is from
  the rerun.

**The harness-exclusion verification defect (round 1).** `run.ts`'s `expectedItemsFromKey` read
an adjudicator packet key's full, unfiltered `items` map to decide what a run's rulings must
cover, rather than that map minus `key.excluded`; a judge's container never sees a harness-filtered
item (`buildAdjudicatorPacket` already leaves it out of `packet/items.json`), so a run could never
verify once it had even one excluded item. It affected five of round 1's six adjudicator
rulings (`evaluator-control-1`, `operator-control-1`, `designer-control-1`,
`core-developer-control-1`, `scripter-control-1`); only `extender-control-1`, with zero harness
exclusions, was unaffected. Fixed by `6d5d2e18`: `expectedItemsFromKey` now subtracts
`key.excluded` from `key.items`. All six round-1 adjudicator jobs verified once re-run on the
fixed runner (see "Round 1" below); the judge's own rulings, read against every item it was shown
before the fix, were already sound.

**The development catch-count defect (round 1).** `runDev` passed `tallyPlantCatches`'s result
straight through as the only development-mode catch figure, and that tally's `caught` field is
gated sensitivity's own two-of-three rule (`caughtCount >= 2`). Round 1 carries exactly one
planted run per job, so a plant caught on that single run could never register as caught in
development mode, even when it genuinely was: a read-only audit of every round-1 catch ruling
(see "Catch-ruling audit" below) found the scripter map's on-path plant P16 caught in round 1, yet
`onMapCaught` reported 0 because a single catch never reaches the two-of-three threshold. Fixed by
`407dbb2a` (conductor ruling R8): `score-catch.ts` adds `recallByPlantRun`, a recall figure summed
over every tally's own counted runs, never gated by the two-of-three rule; `runDev` now reports it
as `onMapPlantRunRecall` per job and pooled, beside the unchanged, still-gated `onMapCaught`.
Gated mode is unchanged.

### Non-findings (expected, not defects)

Every other `score.json` note is an expected exclusion, not a judge or scorer defect:

- Every Sonnet job id duplicated across the two saved reports (`evaluator-control-3`,
  `designer-planted-3`, `designer-control-3`, `extender-planted-3`, `scripter-planted-3`,
  `scripter-heldout-3`) is dropped with "no copy is an Opus run, so every copy is dropped" — round
  0 judges Opus runs only, per the plan's pinned choice 2.
- Every Sonnet or held-out job with "no catch-judge key and rulings joined for it" /
  "no adjudicator key and rulings joined for it" (`evaluator-planted-3`, `operator-planted-3`,
  `core-developer-planted-3`, `scripter-heldout-1`, `scripter-heldout-2`, `operator-control-3`,
  `extender-control-3`, `core-developer-control-3`, `scripter-control-3`) is a job round 0 never
  built a packet for, since round 0's scope is the twelve verified Opus planted and control runs
  only; held-out packets and their catch judging are a later task's concern, not round 0's.

## Round 1

Round 1 runs the four adopted instrument changes (`steps[]`, `diverged[]`, `blockedBy`, the git
export) on the development batch: each development job once planted (pass 1's plants) and once
on control, on `claude-opus-5-5`, 12 runs, ungated. Reader batch `batches/round1.json`; saved
report `scripts/docs-readers/tuning/round1/reader-report.json` (results dir
`~/.cache/docs-readers/results/round1-20260925t180330-4a4885`). All 12 reader runs verified on
the runner's first attempt; every job carries its own `absent` list already (`batches/round1.json`
job entries), matching round 0's derived counts at the same page pin. Round 1 is judged with the
catch judge on the six planted runs and the adjudicator on the six control runs, scored under the
**same round-0 proxy maps** (`tuning/round0/maps/`), since the proxy is built from pass 1's
control-run quotes and this instrument's own path-map mode is a later task's concern, not round
1's.

### Judge runs

Round 1's adjudicator ran twice, for the same reason round 0 did. The first run (superseded)
predates `6d5d2e18` (the harness-exclusion verification fix; see "Judge fixes" above): only
`extender-control-1` (0 harness exclusions) verified; the other five all failed verification on
both the original attempt and the runner's one automatic rerun, each missing a ruling for exactly
its harness-excluded item id(s) — the judge was never shown those items, so it could never rule on
them. The numbers below are from the second, fixed-runner run.

- Catch judge batch `round1-catch` (`scripts/docs-readers/batches/round1-catch.json`, ungated,
  concurrency 4): 6 jobs, all verified on the first attempt, no reruns, `stopReason: complete`.
  Counted tokens: 21,529 (cache read 94,380 apart). Not re-run for the fix (the defect was
  adjudicator-only; the catch batch needed no changes).
- Adjudicator batch `round1-adjudicator` (`scripts/docs-readers/batches/round1-adjudicator.json`,
  ungated, concurrency 4, fixed runner): 6 jobs, **all verified on the first attempt, no
  reruns**, `stopReason: complete`. Counted tokens: 69,561 (cache read 610,909 apart).
- Total round 1 judge spend (fixed-runner adjudicator run): 91,090 counted tokens, 705,289 cache
  read.

### Harness-excluded items

Round 1 reports carry structured `blockedBy` (the tuning change under test), so the harness
filter now genuinely excludes items, unlike round 0's pass-1 reports. Per-job log at
`scripts/docs-readers/tuning/round1/harness-filter-log.json`:

| Job control run | Remaining (sent to the adjudicator) | Excluded | Excluded reason(s) |
| --- | --- | --- | --- |
| evaluator-control-1 | 2 | 1 | absent path `docs/admin/own-your-domain.md` |
| operator-control-1 | 2 | 1 | denied command `ls -la` |
| designer-control-1 | 4 | 2 | denied command `npm run` (x2) |
| extender-control-1 | 5 | 0 | — |
| core-developer-control-1 | 7 | 3 | denied command `npm run`, `npx vitest`, `npm run` |
| scripter-control-1 | 12 | 1 | denied command `python3 /reader/job/check_cairn_json.py` |

### Per-run `steps[]` and `diverged[]` counts

From `scripts/docs-readers/tuning/round1/reader-report.json`:

| Run | `steps[]` | `diverged[]` | `stalls[]` | `assumed[]` |
| --- | --- | --- | --- | --- |
| evaluator-planted-1 | 8 | 2 | 3 | 4 |
| evaluator-control-1 | 7 | 0 | 0 | 3 |
| operator-planted-1 | 5 | 1 | 1 | 2 |
| operator-control-1 | 5 | 1 | 1 | 1 |
| designer-planted-1 | 5 | 2 | 1 | 3 |
| designer-control-1 | 5 | 1 | 1 | 4 |
| extender-planted-1 | 6 | 1 | 0 | 3 |
| extender-control-1 | 6 | 1 | 0 | 4 |
| core-developer-planted-1 | 4 | 2 | 2 | 4 |
| core-developer-control-1 | 4 | 2 | 3 | 5 |
| scripter-planted-1 | 25 | 6 | 2 | 6 |
| scripter-control-1 | 19 | 5 | 1 | 7 |

### Round 0 vs round 1, per job

All figures from the two `score.json` files' `byJob.<job>`
(`tuning/round0/score.json`, `tuning/round1/score.json`), after both fixes:

| Job | R0 on-map catches | R1 on-map catches | R0 plant-run recall | R1 plant-run recall | R0 false / control run | R1 false / control run |
| --- | --- | --- | --- | --- | --- | --- |
| evaluator | 0 | 0 | 0/0 (null) | 0/0 (null) | 1.5 | 0 |
| operator | 0 | 0 | 0/4 | 0/2 | 1.5 | 0 |
| designer | 0 | 0 | 0/4 | 0/2 | 0.5 | 0 |
| extender | 0 | 0 | 0/4 | 0/2 | 0 | 0 |
| core-developer | 0 | 0 | 0/2 | 0/1 | 0 | 0 |
| scripter | 1 | 0 | 2/2 (rate 1) | 1/1 (rate 1) | 1.5 | 7 |

Pooled round 1 plant-run recall: 1/8 on-map plant-runs caught (scripter's P16; see the audit
below). Every job's control run verified in both rounds this time (`score.json` `notes` is empty
for round 1), so every false-finding figure above is a real measurement, not a drop. Round 1's
scripter false-finding rate (7 per its one verified control run) is markedly higher than round
0's (1.5 per run, averaged over two runs); this is in-scope reader-behavior variance across the
tuning change, not a judge or scorer defect, and O7 permits no further tuning change to
investigate it inside this pass.

### Catch-ruling audit (round 0 and round 1)

A read-only audit read every catch ruling both rounds' catch judge made against the 24 on-map
development plant-runs (round 0's twelve plus round 1's twelve, `onMapPlantCount` summed with
each job's own count of verified/counted planted runs). It found **no judge or criterion
defect.** 21 of the 24 were missed, 3 were caught (all 3 correct catches, matching real plants
against their own criteria). Of the 21 misses, 11 were true misses (the reader's report never
addressed the plant's subject at all), and 10 were noticed only in `ruleCandidates[]` — four
plants, each across two or three runs, where the reader routed around the planted defect and
filed a "the page should say X" candidate rather than a `stalls[]`/`assumed[]`/`diverged[]` claim
the catch judge could rule on. The spec counts `ruleCandidates[]` as neither a catch nor a
finding (see "Scoring" in the pass 1b spec), so these 10 correctly score as misses under the
pinned instrument, even though the reader in some sense noticed the defect. The audit confirmed
the reader reached every on-map plant's section in every run it read (the map itself is sound;
the gap is between what a reader notices and what it routes into a scored field). **This finding
goes to pass 2a**, not to a tuning change here: O7 allows one tuning round only, already spent,
and `ruleCandidates[]`'s scoring treatment is a spec-level question, not a fixable defect in this
pass's instrument or judges.
