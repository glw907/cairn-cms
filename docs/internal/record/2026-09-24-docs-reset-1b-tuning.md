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
(fixed-runner run):

| Job (`byJob.<job>`) | On-map plants (of total) | On-map catches | Verified control runs | Total false findings | False findings / verified control run |
| --- | --- | --- | --- | --- | --- |
| evaluator | 0 of 2 (`onMapPlantCount`/17 total dev plants for this job) | 0 (`onMapCaught`) | 2 (`verifiedControlRunCount`) | 3 (`totalFalseFindings`) | 1.5 (`falseFindingsPerVerifiedControlRun`) |
| operator | 2 of 3 | 0 | 2 | 3 | 1.5 |
| designer | 2 of 3 | 0 | 2 | 1 | 0.5 |
| extender | 2 of 3 | 0 | 2 | 0 | 0 |
| core-developer | 1 of 3 | 0 | 2 | 0 | 0 |
| scripter | 1 of 3 | 1 | 2 | 3 | 1.5 |

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

- Catch judge batch `round1-catch` (`scripts/docs-readers/batches/round1-catch.json`, ungated,
  concurrency 4): 6 jobs, all verified on the first attempt, no reruns, `stopReason: complete`.
  Counted tokens: 21,529 (cache read 94,380 apart).
- Adjudicator batch `round1-adjudicator` (`scripts/docs-readers/batches/round1-adjudicator.json`,
  ungated, concurrency 4): 6 jobs. Only `extender-control-1` verified on the first attempt; the
  other five (`evaluator-control-1`, `operator-control-1`, `designer-control-1`,
  `core-developer-control-1`, `scripter-control-1`) failed verification on both the original
  attempt and the runner's one automatic rerun. `stopReason: complete`. Counted tokens: 142,656
  (cache read 1,292,947 apart). **See "Judge-defect watch" below: this is a newly discovered,
  distinct tool defect, not the `f618743a` prompt defect (already fixed) recurring.**
- Total round 1 judge spend: 164,185 counted tokens, 1,387,327 cache read.

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
(`tuning/round0/score.json`, `tuning/round1/score.json`):

| Job | Round 0 on-map catches | Round 1 on-map catches | Round 0 false / verified control run | Round 1 false / verified control run |
| --- | --- | --- | --- | --- |
| evaluator | 0 | 0 | 1.5 | 0† |
| operator | 0 | 0 | 1.5 | 0† |
| designer | 0 | 0 | 0.5 | 0† |
| extender | 0 | 0 | 0 | 0 (measured) |
| core-developer | 0 | 0 | 0 | 0† |
| scripter | 1 | 0 | 1.5 | 0† |

† **Not a real zero.** For every job but extender, round 1's adjudicator run is unverified (the
defect below), and `score.ts dev` excludes an unverified adjudicator job from the precision count
entirely, the same behavior round 0 showed for designer before its fix. Round 1's true
false-finding rate is **unmeasured** for evaluator, operator, designer, core-developer, and
scripter; only extender's 0 is a real measurement. On-map catches are genuine zeros: the catch
judge batch fully verified for all six jobs, and none of round 1's caught plants (evaluator 2/2
caught, core-developer 1/3, scripter 3/3, per `round1-catch-report.json`'s `rulings`) happen to
fall on the (round-0-derived) proxy map's on-path sections this round; only round 0's scripter
plant was on-map and caught.

### Judge-defect watch (not fixed; for the conductor's ruling)

**A new, distinct defect from `f618743a`: `expectedItemsFromKey` (`run.ts`) reads an adjudicator
packet key's full, unfiltered `items` map, not the packet's own filtered `items.json`, so a
verification run always expects a ruling for every harness-excluded item even though the judge's
container never receives it.** `buildAdjudicatorPacket` (`judge-packets.ts`) correctly builds
`packet/items.json` from only the non-excluded items (`items = all.filter((item) =>
!excludedIdSet.has(item.id))`), but its `key.items` field is set to the full, pre-filter
`itemKey` from `buildCatchFields(run.runFields)` before the exclusion filter runs. `run.ts`'s
`expectedItemsFromKey` then derives what a run's rulings "must cover exactly once" from
`Object.keys(key.items)` — the full set, excluded items included — while `expected` (used by
`buildAdjudicatorPacket`'s own return value, not by the runner's live verification) correctly
uses the filtered `items`. Evidence: every one of round 1's five unverified adjudicator runs is
missing a ruling for exactly its harness-excluded item id(s), and no others:

| Job | Excluded item id(s) (harness filter) | Missing ruling(s) (`verified.problems`) |
| --- | --- | --- |
| evaluator-control-1 | item-3 | item-3 |
| operator-control-1 | item-1 | item-1 |
| designer-control-1 | item-1, item-4 | item-1, item-4 |
| core-developer-control-1 | item-1, item-2, item-10 | item-1, item-2, item-10 |
| scripter-control-1 | item-1 | item-1 |

`extender-control-1` (0 harness exclusions) is the only round-1 adjudicator run that verified.
The judge's own rulings are sound for every item it was actually shown (real `finding`/`real`,
`finding`/`false`, `interpretation`, and `notAClaim` classifications appear, with cited evidence,
across all six runs); this is a runner/packet-builder wiring defect, not a judge behavior defect,
and it is deterministic (both the original attempt and the automatic rerun failed identically).
Effect: `score.ts dev` drops every affected job from the precision count (see the † note above),
so round 1's false-finding measurements are unmeasured for five of six jobs, not the "0" a
first read of `score.json` might suggest. No packet, key, prompt, or runner code was changed to
work around this — per the plan, it is listed here for the conductor's ruling, never fixed inside
this task.
