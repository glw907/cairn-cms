# Docs reset pass 2a spec review: contract and criteria lens

**Target:** `docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md` at `598902f3`.
**Lens:** is every promise testable, does each acceptance line name its fixture and failure, can
any criterion pass vacuously. Every claim below was checked against the source at `598902f3` and
the workflow file in `~/.claude/workflows/`.

**Counts:** 1 blocker, 8 major, 7 minor. No owner forks: B2 gave the method calls to the
conductor, and each finding below has one answer to propose.

## Blocker

### C1. Precision can pass vacuously when over-filing breaks verification

- **Location:** spec:87-88 (condition 3), spec:49-50; `scripts/docs-readers/score.ts:342-344`,
  `score.ts:400`.
- **Defect:** development mode keeps only verified Opus control runs, in both numerator and
  denominator (`run.opus && run.verified`). The spec makes a failed `wrong[]` quote fail the whole
  report. So a reader that over-files `wrong[]` with a misquoted line produces an unverified
  control run, and development mode drops that run from condition 3. This is the failure the
  condition exists to catch. If all five control runs fail, `falseFindingsPerVerifiedControlRun`
  is `null` for every job. The spec gives no rule for `null` or for fewer than five runs.
- **Fold:** pre-register that each control run gets its one rerun. A control run still unverified
  after the rerun stays in the denominator. It counts under the gated rerun rule: every
  catch-field item, `wrong[]` included, is a false finding (`findingCountsForRun`,
  `lib/score-precision.ts:28`, already does this). Condition 3 is then Σ false findings / 5. The
  record computes it from `byJob`, or the scorer gains a `--gated-precision` switch. It needs
  `itemCount` to include `wrong[]` (see C5).

## Major

### C2. The recall denominator is not fixed, and a judge failure counts as a reader miss

- **Location:** spec:81, spec:90-91; `lib/score-catch.ts:80` and `:244`; `score.ts:391-394`;
  `lib/score-assemble.ts:262-265`, `:314-317`.
- **Defect:** `onMapPlantRunRecall.total` counts only the runs that were actually counted. The
  total can fall below 16 in three ways, and each one only adds a `notes` entry while `ok: true`:
  - The `opusOnly` filter drops a run it cannot identify as Opus. Round 0's notes show whole jobs
    dropped this way.
  - The index drops a reader job it cannot resolve, such as a duplicate with no judge key.
  - A job with no `--map` file loses all its plants from the on-map set.

  At 12 caught out of a total of 14, "12 of 16" and "0.75" no longer agree. Separately, an
  unverified or stopped catch-judge job yields `catches: {}`, and each of its plants scores as a
  miss. R9 covers an unverified reader run, never a judge failure, yet that judge failure lands
  in the pilot as a reader miss and biases the result toward a no-go.
- **Fold:** name the scorer inputs in the spec:
  - `--plants scripts/docs-readers/fixtures/dev-plants.json`
  - `--map scripts/docs-readers/tuning/round0/maps/<job>.json` for each of the five jobs (round 1
    has no maps directory)

  Add a validity precondition that must hold before any verdict:
  - pooled `onMapPlantRunRecall.total` is 16
  - per-job `onMapPlantCount` is 2, 2, 2, 1, 1
  - no note names a judge problem

  A failed precondition means rerun the missing reader or judge job, never a verdict. Recall is
  caught / 16, and a reader run that is still absent after its rerun counts as a miss.

### C3. The breadth condition's plant count is not in `score.json`

- **Location:** spec:84, spec:97-98; `score.ts:321-335`.
- **Defect:** "6 of the 8 plants caught at least once" needs each plant's `runsCaught`. The
  development output has no per-plant field: `DevJobResult` carries per-job counts only. Its
  `onMapCaught` uses the two-of-three rule, which needs at least two catches, so it cannot answer
  "at least once". Suppose a two-plant job shows `caught: 2` over 4 runs. That can mean one plant
  caught twice or both plants caught once. The record promises every figure's source in
  `score.json`. The job half of the condition (4 of 5 jobs) is computable, from per-job
  `onMapPlantRunRecall.caught >= 1`.
- **Fold:** development mode also emits each on-map tally, `{ plantId, job, runsCaught }`. This
  is one field, and it rides the item 1 build task (see the deliverable note under M8).

### C4. The stated interval is not the interval the scorer emits

- **Location:** spec:81-82; `lib/score-catch.ts:247` (`clopperPearson`).
- **Defect:** the spec's Wilson figures are right: 12 of 16 gives 0.505 to 0.898 and 11 of 16
  gives 0.444 to 0.858. `score.json` reports Clopper-Pearson, though. At 12 of 16 that interval
  is 0.476 to 0.927, and its lower bound sits below one half. The smallest count whose
  Clopper-Pearson interval clears one half is 13 (0.544). A go at 12 would carry an interval in
  its own `score.json` that contradicts the spec's rationale.
- **Fold:** keep the count, since the bar is 12 of 16 and a pre-registered bar should not move.
  State that the rationale uses the Wilson score interval, which the record computes itself.
  Report the scorer's Clopper-Pearson interval beside it with that note.

### C4b. The precision baseline is misstated, and "pooled" is undefined

- **Location:** spec:87-88; `scripts/docs-readers/tuning/round1/score.json` byJob.
- **Defect:** the "about 1.2" baseline is 7 false findings over 6 control runs, and it includes
  the evaluator, which the pilot excludes. Over the pilot's five jobs, round 1 is 7 over 5, or
  1.4. All seven came from the scripter's single control run. Round 0 over the same five jobs was
  7 over 10, or 0.7. With one control run per job, the bar of 1.5 allows at most 7 false findings.
  That puts the round 1 baseline one finding under the bar, so one run's variance can decide the
  verdict. "Pooled" could also be read as the mean of per-job rates.
- **Fold:** correct the baseline to 1.4 on five jobs and note that one run supplied all seven.
  Define pooled as Σ `totalFalseFindings` / Σ control runs over the five pilot jobs, using C1's
  denominator. The conductor then restates the bar knowingly under B2: either keep 1.5 with the
  thin margin stated, or anchor it to the five-job baseline across both rounds (14 over 15, or
  0.93). Say which one, and why, before any run.

### C5. The item 1 line "the scorer counts a `wrong[]`-only catch" passes with no code change, and precision coverage is untested

- **Location:** spec:53-55 and :62-65; `lib/score-assemble.ts:283-292`, `:418`;
  `judge-packets.ts:161`, `:460-489`; `prompts/adjudicator.md:19-38`.
- **Defect:** the scorer never sees fields. Catches arrive as one ruling per plant, so a fixture
  `caught` ruling makes this line pass with no change at all. The real risks have no test:
  - `buildCatchFields` is shared by the catch-judge and adjudicator builders, so `wrong[]` reaches
    the adjudicator too. The spec names only the catch-judge prompt, and `adjudicator.md` lists
    the fields and gives a finding rule for each.
  - `itemCount` at `score-assemble.ts:418` sums `stalls`, `assumed`, `diverged`, and `checks`
    only, so the C1 rerun rule would undercount.
  - The raw-field allow-list at `judge-packets.ts:161` must add `wrong`.
- **Fold:** replace the line with three tests:
  - A `wrong[]`-only fixture report builds both a catch packet and an adjudicator packet that
    carry the item, with key field `wrong`.
  - An unverified run's `itemCount` includes its `wrong[]` entries.
  - `catch-judge.md` and `adjudicator.md` each gain a field-specific `wrong[]` rule. The finding
    test: a `wrong[]` item is a claim that the page is wrong, and it still has to meet the
    criterion.

### C6. Item 3 misdescribes the chain, and its acceptance cannot tell go from no-go

- **Location:** spec:106-116; `~/.claude/workflows/docs-page-chain-v2.js:88-103`, `:372-396`.
- **Defect:** v2 already runs the reader runner between stage 1 and stage 2. It already turns
  every verified stall and every assumption into a blocking reader defect (`rd-<jobId>-stall-<k>`,
  `rd-<jobId>-assumed-<k>`), and a page escalates unless each one comes back applied. So each
  branch changes behavior:
  - The no-go branch ("advisory input with no gate") removes an existing gate.
  - The go branch adds `wrong[]` and `diverged[]` to the gate.

  The only acceptance line checks that the typed fields reach the redraft prompt, and either
  branch passes it with the gate unchanged. "A dry run" also names no mechanism.
- **Fold:** name `docs-page-chain-v2.fixture.test.mjs` as the dry run, and give each branch its
  own case:
  - **Go:** a `wrong[]` entry and a `diverged[]` entry each yield a blocking reader-defect id, and
    an unapplied one escalates.
  - **No-go:** a verified report with stalls yields no blocking defect, and the page does not
    escalate on it.

  Also correct the prose: the task extends or demotes an existing reader stage, and does not add
  one.

### C7. The re-pinned init baseline has no check, and the "fixture from real output" rule cannot be met before a run

- **Location:** spec:59-60, spec:186-187; `run.ts:483`, `:572`.
- **Defect:** a wrong re-pin fails the init check on every pilot run. Under R9 every planted run
  then counts as a miss, and the pilot reports a no-go caused by the harness, not the readers. The
  execution rule pins "the report with `wrong[]`" with a fixture built from real output, yet no
  real `wrong[]` output exists until a reader has run with the new prompt.
- **Fold:** item 1's last acceptance step becomes one smoke reader run on the pinned CLI, such as
  one control job. Its init must verify, and its report becomes the pinned fixture. If the reader
  files no `wrong[]` entry, the fixture adds one to that real report's shape and says so.

### C8. Item 4's acceptance cannot fail as written, and the frontmatter's route into the chain has no owner

- **Location:** spec:124-125, :131, :143-144; `docs-page-chain-v2.js:128`, `:419-435`;
  `docs/internal/record/docs-exemplars.md`.
- **Defect:** the acceptance lines leave four gaps:
  - "Parses against the format definition": the definition is prose in the README, and no schema
    or check is named, so any well-formed YAML passes.
  - "Names its evidence or is marked provisional": this passes with all six profiles marked
    provisional, though the spec expects only the designer to be.
  - "Exemplar ids from the manifest": the manifest has no ids. It keys each capture by local path
    slug.
  - "The chain renders it into the drafter's dispatch prompt": today the chain takes `args.profile`
    as verbatim text. No item owns the change, whether the conductor extracts the frontmatter or
    the chain reads a path, and no acceptance line tests it.
- **Fold:**
  - The README defines the frontmatter keys in a machine-checkable form. A small test parses all
    six files against it and fails on a missing or extra key.
  - An exemplar id is `<audience>/<slug>`, and it must resolve to both a manifest entry and a
    capture directory.
  - Only the designer is provisional, unless the fold records why another profile is.
  - Assign the rendering to item 3 and pin it with a case in the same fixture test.

  **Deliverable count:** C3, C5, and C7 add to item 1. Under the two-deliverable rule (spec:182),
  item 1 is already over the limit, since it carries the field, the judge wiring, three comment
  carries, and the re-pin. The plan should split item 1 into two build tasks.

## Minor

- **C9. The test lane path.** Spec:64-65 says the `scripts/docs-readers` tests, but those tests
  live at `src/tests/unit/docs-readers-*.test.ts`. Name the command with
  `CAIRN_GATE_LANE=light`.
- **C10. Old reports must still load.** Rounds 0 and 1 reports have no `wrong[]` field, and the
  floor rescore re-judges them. Add an acceptance line: `fixtures/saved-reports/pass1-trimmed.json`
  still verifies and still builds packets, with `wrong` read as `[]`.
- **C11. The floor rescore has no owner.** `judge-packets.ts:11-13` shuts `ruleCandidates[]` out
  of every packet by allow-list, and the catch-judge prompt has no rule for plain-string items.
  The rescore needs a flagged packet mode and a prompt rule, and no item lists either.
  - State whether the rescore runs on the catch-judge prompt from before or after `wrong[]`.
  - Its figure is informational only, so this finding is minor.
- **C12. R9 wording, and `wrong[]` on non-plants.** Spec:90 should read "unverified after its
  rerun" (pass 1b plan:762 cites the rerun rule). Also state that a `wrong[]` entry on a planted
  run that matches no plant counts nowhere, because only control runs are adjudicated. Condition 3
  measures over-filing on control trees only.
- **C13. Catch attribution.** The record should give the field that carried each catch. The judge
  reason names the catching item's id, and the catch key maps that id to its field. Without the
  attribution, the record cannot separate a lift from `wrong[]` from run-to-run variance on the
  same plants.
- **C14. Items 5 and 6 have no acceptance line.** Item 6's line could be:
  - each of the 68 capture directories carries a verdict
  - each gap fill has both a manifest entry and a capture directory
- **C15. The go branch would block on `diverged[]`.** `diverged[]` also collects convenience
  workarounds, per `runner.ts:135` ("including a workaround that worked"). Blocking on every one
  escalates pages that have no defect.
  - Recommendation: `wrong[]` blocks.
  - `diverged[]` blocks only when its `why` claims the page is wrong or silent, which mirrors the
    judge rule. Otherwise it is advisory.

## Verified sound

- **The pilot's plant counts:** operator 2, designer 2, extender 2, core developer 1, and
  scripter 1 make 8 plants and 16 plant-runs (tuning `score.json` byJob `onMapPlantCount`).
- **The pass 1b figures:** round 0 recall was 2 of 16 and round 1 was 1 of 8. The expected floor
  of 13 of 24 is the 3 catches plus the 10 items filed in `ruleCandidates[]` (validation record
  lines 77-95).
- **The Wilson arithmetic** at spec:81-82 is correct.
- **The exemplar captures:** there are 68 capture directories.
- **The chain's typing defect:** v2 types `stalls` and `assumed` as strings, while the report
  schema carries `{ text, blockedBy }` objects.
