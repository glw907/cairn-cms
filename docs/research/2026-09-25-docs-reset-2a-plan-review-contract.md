# Docs reset pass 2a plan review: contract and criteria lens

**Target:** `docs/superpowers/plans/2026-09-25-docs-reset-pass-2a.md` at `9f112c92`, against the
approved spec `docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md`. **Lens:** whether
each acceptance criterion can fail, whether each fixture state is named, whether cross-task
interfaces match, and whether every pre-registered pilot condition maps to a built computation
and a Task 5 check. Every claim below was checked against the source at `9f112c92`.

**Counts:** 0 blocker, 5 major, 13 minor. No owner fork: every finding is a method or contract
call the conductor can fold under B2.

## Condition map (spec §2 to plan)

| Spec condition | Computation | Built by | Checked in Task 5 | State |
| --- | --- | --- | --- | --- |
| Recall, 12 of 16 | `onMapPlantRunRecall` (exists, `score.ts:384`) | existing | step 5 figures, step 6 verdict | OK |
| Breadth, 6 of 8 plants | `plantTallies[].runsCaught` | Task 4 | step 6 | M4: on-map filter and type unpinned |
| Breadth, 4 of 5 jobs | `plantTallies` grouped by job | Task 4 | step 6 | M4 |
| Precision, new-field at most 2 | `pooledPrecision.newFieldFalseFindings` | Task 4 | step 6 | M3: the input it needs is not built |
| Precision, total at most 8 | `pooledPrecision.falseFindings` | Task 4 | step 6 | OK once M3 lands |
| Per-class recall and every-job rule | `byJob[<job>].onMapPlantRunRecall` sums | existing | step 6 | OK |
| Validity: total 16, counts 2,2,2,1,1, five controls, no missing-judge note | `onMapPlantRunRecall.total`, `byJob.onMapPlantCount`, `pooledPrecision.controlRunIds`, `notes` | existing plus Task 4 | step 5 | M1: the notes will fire on a path mismatch |
| Record: Wilson beside Clopper-Pearson | none (scorer emits Clopper-Pearson only) | nobody | step 6 | m2 |
| Record: the field that carried each catch | none (catch rulings are per plant) | nobody | step 6 | m3 |
| Verifier-check trigger ("unverified only because of a new-field quote") | classify `verified.problems` strings by source | nobody | Acceptance, second bullet | m4 |

## Major

**M1. Key traces are absolute paths, so the round 1 rescore cannot match and the pilot join is
unpinned.** Plan `:306-309`, `:329-341`. `keyTraceMatches` (`lib/score-assemble.ts:231-233`)
requires `resolve(key.report.path) === readerJob.reportPath`. Every committed round 1 key traces to
`/var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-1b/scripts/docs-readers/tuning/round1/reader-report.json`
(checked in `catch-keys/operator-planted-1-key.json` and `adjudicator-keys/scripter-control-1-key.json`).
Rescoring from the `docs-reset-2a` worktree with `--report tuning/round1/reader-report.json` fails
every trace. Every join becomes a note, `buildCatchRunRecords` (`:316-319`) pushes each planted run
with empty catches, and scripter drops from 1 caught to 0 and from 7 false findings to 0. The
field-for-field acceptance then fails for a reason unrelated to the scorer change. The cheap
"fix" an implementer reaches for is to loosen the trace guard. The same trap waits in Task 5. Step
3 copies `report.json` into `tuning/pilot-2a/` and builds packets, but does not say the packets are
built from the copied path, and step 5 scores with `--report` at some path. If the two differ, the
validity precondition ("no note names a missing judge job") fails on every job, and the fork's rule
reruns judges that were fine. **Fold:** (a) Task 4: the rescore runs over copies of the round 1
keys whose `report.path` is rewritten to the test's own report path in a temp directory, or passes
`--report` at the 1b worktree path, which exists today. The test must say which, and must assert
`notes` is empty. It must never change `keyTraceMatches`. (b) Task 5 step 3: build every packet
from `<worktree>/scripts/docs-readers/tuning/pilot-2a/<job>/reader-report.json` as an absolute
path, and have step 5 pass that same absolute path to `--report`. (c) Task 11: note in HISTORY that
committed keys trace to a worktree path, so a later rescore on `main` must rewrite traces.

**M2. The exemplar-id resolver keys on a `Root:` line that three of six manifest sections lack.**
Plan `:381-384`. `docs/internal/record/docs-exemplars.md` opens Editors (`:22`), Operators (`:100`),
and Core (`:290`) with `Root:`. Designers (`:163`) says "Captures live under", Extenders (`:220`)
says "Base path:", and Evaluators (`:359`) says "Local root:". A resolver built to the plan's rule
passes Task 6 on its synthetic manifest. It then fails every designer, extender, and evaluator
exemplar id in Task 7, or the author edits the manifest to fit. The pre-flight (`:177-179`) checked
the slug forms but not the root lines. **Fold:** resolve `<dir>` from the section's `## <Heading>`
through a fixed map (Editors to `editors`, Operators to `operators`, Designers to `designers`,
Extenders to `extenders`, Core to `core`, Evaluators to `evaluators`), or from the
`exemplars/<dir>/` path in the section's opening paragraph. The fixture manifest must carry all
three opening-line variants. Add an acceptance case where the real manifest resolves one id per
directory.

**M3. The pooled precision split needs per-item field data that no task builds.** Plan
`:298-303`. `pooledPrecision.newFieldFalseFindings` needs two inputs. A verified run needs each
false subject group's item fields, but `PrecisionItem` (`lib/score-types.ts`) carries no field.
`joinAdjudications` could copy it from `AdjudicatorPacketKey.items[itemId].field`, but does not.
An unverified run needs its new-field item count, but `PrecisionRunRecord` carries only one
`itemCount` (`lib/score-assemble.ts:418`), and `findingCountsForRun` (`lib/score-precision.ts:28`)
counts that total. The spec's 1c line needs the split: "its new-field items to the new-field
count". Task 4's Files omit `lib/score-types.ts` and `lib/score-assemble.ts`. Task 3 touches
`score-assemble.ts` only for `itemCount`. Neither task's Interfaces names the new record fields.
**Fold:** Task 4's Interfaces and Files add `PrecisionItem.field` (set in `joinAdjudications` from
the key) and `PrecisionRunRecord.newFieldItemCount` (set in `buildPrecisionRunRecords` from the
outcome's `wrong` and `missing` lengths), with both files listed. Alternatively, Task 3 produces
`newFieldItemCount` beside `itemCount` and names it in its Produces line.

**M4. `plantTallies` is underspecified on the two points the breadth bar turns on.** Plan
`:298-299`. First, the plan does not say whether the tallies are on-map only. The pilot plants file
holds 15 plants, and 7 of them are off-map (P04, P08, P10, P12, P13, P15, P17). A tally over all 15
gives the breadth bar a wrong denominator ("6 of the 8 plants"). Second, `runsCaught` already
exists on `PlantCatchTally` as `boolean[]` (`lib/score-catch.ts:62`). An implementer who spreads the
existing tally emits an array, and "caught at least once" read as a truthy check passes on
`[false, false]`. **Fold:** pin `plantTallies` as computed from `onMapTallies`, exactly the 8
pilot entries, with `runsCaught: number`, the per-plant count (`caughtCount`). Add a Task 4 case:
a fixture with one off-map plant caught shows no `plantTallies` entry for it.

**M5. The Task 4 rehearsal can pass vacuously and has no source for its catch side.** Plan
`:310-312`, `:284-286`. `runDev` returns `ok: true` whenever it gets past loading. Every join
problem becomes a `notes` entry (`score.ts:328-330`, `:387`). So "completes with `ok: true`" holds
even with no catch or adjudicator join at all. The only failure it can catch is the `loadPlants`
throw. Task 3's fixture is one adjudicator run on the smoke packet, so the rehearsal's ten planted
runs have no catch keys or rulings to join, and the plan does not say who builds them. "The exact
Task 5 scoring command" is also never written as a string: Task 5 step 5 describes it in prose.
**Fold:** write the scoring command once, literally, in Task 4's Interfaces, and have Task 5 step 5
cite it. The rehearsal asserts the spec's validity preconditions, not only `ok`:
`onMapPlantRunRecall.total === 16`, `onMapPlantCount` 2, 2, 2, 1, 1,
`pooledPrecision.controlRunIds.length === 5`, and `notes` empty. It builds synthetic catch keys and
rulings for the ten planted runs, whose traces match the fixture reports' paths, `runId`, and
`attempt`, plus adjudicator keys copied from the Task 3 fixture with rewritten traces (see M1).

## Minor

**m1. The plan's plants file contradicts the spec, and the plan's own precedence rule says stop.**
Plan `:20-21` and `:339` against spec `:196`, which names `--plants
scripts/docs-readers/fixtures/dev-plants.json`. The deviation is correct: `loadPlants`
(`score.ts:202-209`) throws on P01 and P02. But an executor reading the spec in full meets "the spec
wins; stop and report". **Fold:** add one "Spec errata" line under the plan header that names this
deviation and its reason, so it reads as sanctioned.

**m2. No task computes the Wilson interval for the observed count.** Plan `:343-346`. The scorer
emits only Clopper-Pearson (`lib/score-catch.ts:247`). The spec's Record prints both. **Fold:** the
step 5 agent computes Wilson for the observed pooled count with the standard formula at z = 1.96,
states the formula, and checks it reproduces the spec's 0.505 to 0.898 at 12 of 16 before
reporting.

**m3. "The field that carried each catch" has no computation, and Task 4's matching test cannot
fail on scorer logic.** Plan `:313-314`, `:343-346`. Catch rulings are per plant
(`CatchRuling { itemId: <plant id>, ruling, reason }`, `lib/types.ts:316-320`). Only the reason's
free text names the catching item (`prompts/catch-judge.md:110`). So a plant's `runsCaught` never
depends on which field the item came from. The "one item moved into `wrong[]`" test proves only
that a key with a `wrong` location loads. **Fold:** the step 5 agent extracts the item id from each
`caught` reason, maps it through the catch key's `items`, and reports any reason with no parseable
id as unmapped. Restate the Task 4 case as a loader test.

**m4. The verifier-check trigger needs new-field problems to be told apart.** Plan `:219-222`,
`:354-356`. The branch fires when runs are "unverified only because of a new-field quote". That
means classifying `verified.problems` strings, which today read `diverged quote ...`
(`lib/verify.ts:239-244`). **Fold:** pin the prefixes `wrong quote` and `missing quote` in Task 1's
Interfaces, with one assertion each.

**m5. "Fails schema validation" has no in-repo validator.** Plan `:238`. `REPORT_SCHEMA` goes to the
CLI (`runner.ts:437`, `run.ts:770`). In the repo, a report is rejected when `readerReport`
(`lib/transcript.ts:705-720`) returns `undefined`. **Fold:** state the case as `readerReport`
returning `undefined` for structured output missing `wrong`, and for a `wrong` entry missing
`pageSays` (the malformed state), plus `REPORT_SCHEMA.required` containing both fields. Say whether
`readerReport` requires the fields. If it does, `reverify.ts` over any pre-2a transcript reports
"no structured report". Accept that on record, or make `readerReport` default them.

**m6. Two Task 1 verifier cases leave the fixture state that decides them unnamed.** Plan
`:234-237`. `verifyQuoteAgainst` accepts a quote whose text spans forward up to five lines to the
cited line (`lib/verify.ts:88-91`). A multi-line quote cited two lines after its start verifies.
`citesUnreadPage` excuses a quote on a page outside `docsSet`, or on a line a Grep displayed
(`:143-145`). **Fold:** the "two lines off" fixture is a single-line quote cited two lines before
its real line. The unread-page fixture's page is in `docsSet`, and the transcript has no Grep hit on
it.

**m7. The `--control-ids` states are not named.** Plan `:297`. Named states: an id absent from the
reports is refused. Unnamed states: the flag absent (does the round 1 rescore emit
`pooledPrecision`, or omit it?), empty, a duplicate id, a listed id whose role parses as `planted`,
and a `control`-role job present but unlisted. Role parsing and the list are two channels that set
control membership. **Fold:** the flag absent means `pooledPrecision` is omitted. An empty value,
a duplicate, or a non-control role is refused, naming the id. An unlisted control run is refused
in the pilot's batch names. Add one test per state.

**m8. The CLI hold is released before the scoring reruns.** Plan `:335-336`. Step 4 releases
`DISABLE_AUTOUPDATER` before step 5, whose failed precondition "reruns the missing reader or judge
job". A rerun after release can meet a new CLI version, which is an init mismatch and a stop
trigger (`:494-495`). The spec holds the CLI "through the last pilot judge batch", and a rerun is
one. **Fold:** move the release to after step 5's validity preconditions hold.

**m9. The pilot's harness filter and the adjudicator key's `excluded` channel are unnamed.** Plan
`:331-333`. Round 1 ran `harness-filter.ts` (`tuning/round1/harness-filter-log.json`), and that
round's 7 false findings are the base of the at-most-8 bar. `buildAdjudicatorPacket` takes
`excludedKeys` from the filter or from a caller stand-in. **Fold:** step 3 runs `harness-filter.ts`
over each control run, commits its log under `tuning/pilot-2a/`, and passes its exclusions.

**m10. The Task 6 schema test's contract is loose on four states.** Plan `:370-392`. First, with no
schema library, a hand validator can ignore `profile.schema.json`. The test should derive
`required`, `properties`, and `additionalProperties: false` from the file. Second, the spec's
extra-key failure (spec `:338`) has no acceptance case. Third, a file with no frontmatter or broken
YAML names no report. Fourth, the resolver accepts the method source `mozilla-kb-writing-guide/`
(manifest `:22`), and after Task 9 it would still accept an entry marked `Verdict: rejected`.
**Fold:** add cases for an extra key, missing frontmatter, a method-source id, and a rejected id
(refused once Task 9 lands, or accepted on record).

**m11. What "verifies" means for the trimmed smoke fixture is unclear.** Plan `:255-257`,
`:262-263`. Re-verifying needs the transcript and the prepared tree in `~/.cache`, outside the
repository. Synthetic entries added to the fixture carry no verification. **Fold:** state that
"verifies" means the saved job's recorded `verified.ok` is true, and that any synthetic entry is
marked, for example with a `note` field or in the Ledger, and is excluded from that claim.

**m12. The six profile ids are not pinned.** Plan `:410`. The count assertion needs exact
basenames, and the chain runs one invocation per id. **Fold:** name them, for example `evaluator`,
`editor`, `site-operator`, `site-designer`, `admin-extender`, `core-developer`, in Task 6's
Interfaces.

**m13. The shapes of `pooledPrecision.perRun` and the Task 3 live-check batch are unstated.** Plan
`:299`, `:284-286`. **Fold:** `perRun: [{ runId, verified, falseFindings, newFieldFalseFindings }]`.
The Task 3 live check names its batch file and the mechanical agent that writes it.

## Not findings

- Recall, per-class sums, `onMapPlantCount`, and the Clopper-Pearson interval exist today and
  match the spec's source rules. The development catch tally already counts an unverified planted
  run as a miss (`lib/score-catch.ts:81`), as R9 requires.
- `loadPlants` throws on the evaluator's plants as Review focus 1 says, and the filtered file fixes
  it.
- The five on-map counts 2, 2, 2, 1, 1 agree with `tuning/round1/score.json`.
- The 68 captures (11, 8, 15, 11, 12, 11) agree with the Task 9 count check.
- The vitest `unit` project includes `src/tests/unit/**/*.test.ts`, so the `docs-audiences` filter
  reaches the new test.
