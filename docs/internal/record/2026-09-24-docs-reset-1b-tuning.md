# Docs reset pass 1b: tuning record

Task 9 (round 0) and Task 10 (round 1) of the pass 1b validation plan
(`docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`). Every number below traces to a
scorer output file, cited by its JSON path.

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

### Judge runs

- Catch judge batch `round0-catch` (`scripts/docs-readers/batches/round0-catch.json`, ungated,
  concurrency 4): 12 jobs, all verified on the first attempt, no reruns, `stopReason: complete`.
  Counted tokens: 96,409 (cache read 115,305 apart).
- Adjudicator batch `round0-adjudicator` (`scripts/docs-readers/batches/round0-adjudicator.json`,
  ungated, concurrency 4): 12 jobs. Ten verified on the first attempt. Two
  (`designer-control-1`, `designer-control-2`) failed verification on both attempts (the runner's
  one automatic rerun did not resolve it) — see "Judge-defect candidate" below.
  `stopReason: complete`. Counted tokens: 301,993 (cache read 1,235,436 apart).
- Total round 0 judge spend: 398,402 counted tokens, 1,350,741 cache read.

### Proxy maps and development measures

Each job's proxy map (`path-map.ts build --proxy`, one run over pass 1's verified Opus control
runs, seed n/a) is committed at
[`scripts/docs-readers/tuning/round0/maps/`](../../../scripts/docs-readers/tuning/round0/maps/),
one file per job. Every map used both verified Opus control runs pass 1 produced per job
(`verifiedRuns: 2` in every map file); a section is on a job's proxy map when any of those
verified runs carries a verified quote inside it, in any report field. **The map is a proxy
built from pass 1's control-run quotes, not the pinned `steps[]` instrument's own path map;
off-map development plants are reported only, never counted against recall.**

All figures below are from `scripts/docs-readers/tuning/round0/score.json`, `byJob.<job>`:

| Job (`byJob.<job>`) | On-map plants (of total) | On-map catches | Verified control runs | Total false findings | False findings / verified control run |
| --- | --- | --- | --- | --- | --- |
| evaluator | 0 of 2 (`onMapPlantCount`/17 total dev plants for this job) | 0 (`onMapCaught`) | 2 (`verifiedControlRunCount`) | 0 (`totalFalseFindings`) | 0 (`falseFindingsPerVerifiedControlRun`) |
| operator | 2 of 3 | 0 | 2 | 1 | 0.5 |
| designer | 2 of 3 | 0 | 2 | 0† | 0† |
| extender | 2 of 3 | 0 | 2 | 0 | 0 |
| core-developer | 1 of 3 | 0 | 2 | 0 | 0 |
| scripter | 1 of 3 | 1 | 2 | 1 | 0.5 |

† Both of designer's adjudicator runs are unverified (see below); `score.ts dev` therefore
excludes them from the precision count entirely rather than falling back to "every item counts
as a false finding" (that fallback applies to an unverified *reader* run, not to an unverified
*adjudicator* ruling of a verified reader run). Designer's true false-finding rate for round 0 is
**unmeasured**, not zero; the eleven catch-field items across its two control runs were never
ruled.

The on-map recall by class, also from `score.json` (`onMapRecall`): docs-only 0/0 (no scored
plants on evaluator's map), docs-and-binary 0/2, docs-and-site 0/4, repository 1/2. These are
round-0, proxy-map, pre-tuning figures and carry no bar or verdict (development mode never
emits one).

### Judge-defect candidate (not fixed; for the conductor's ruling)

**`designer-control-1` and `designer-control-2`: the adjudicator returned zero adjudications
against packets of 6 and 5 real items, on both the original attempt and the runner's automatic
rerun.** The adjudicator's own prompt (`scripts/docs-readers/prompts/adjudicator.md`, "Output")
requires "exactly one adjudication for every catch-field item in the packet, and no other
entries." Both designer control runs' catch-field items are `assumed[]` entries about a visual
theming task (which hue/chroma value to pick, whether to keep a token's own lightness) — exactly
the kind of item the prompt's own "Step 1" tells the judge to classify `interpretation` (a choice
the job text left open) rather than skip. The transcript
(`round0-adjudicator-out/transcripts/designer-control-1-attempt1.jsonl`) shows the model reading
the packet, thinking briefly, then calling `StructuredOutput` with `{"adjudications": []}` — a
deliberate empty return, not a crash, timeout, or malformed-JSON failure. The identical result on
the independent rerun attempt (a fresh session, per the runner's rerun rule) suggests this is a
systematic response to an "all interpretation, no findings" packet, not a one-off. Effect: the
runner correctly reports both runs `verified.ok: false` ("item item-N: no ruling", every item);
the scorer correctly excludes them (`score.json` notes: "the judge run is unverified"; "no
adjudicator key and rulings joined for it") rather than silently scoring them. No plant record,
prompt, rubric, or job text was changed to work around this — per the plan, a suspected judge
defect is listed here for the conductor's ruling, never fixed inside this task.

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

(Task 10; not yet run.)
