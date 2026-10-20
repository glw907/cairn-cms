# Pass 1b plan review: contract and criteria

**Target:** `docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md` at `dc37e38b`, against the
fixed spec `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md`.
**Lens:** does every spec rule land in a task with a checkable, non-vacuous criterion, and do the
four planning-miss items hold. **Reviewer:** `claude-opus-5-5`, one read, 2026-09-24.

**Counts:** 3 blockers, 10 majors, 14 minors, 1 owner fork.

Code facts checked against HEAD for this review (quoted, not recalled):

- `lib/verify.ts:80-88`: a quote verifies at its cited line, inside a `SPAN_LINES` wrap ending at
  the cited line, or at the cited line plus or minus one. Two lines off already fails.
- `lib/transcript.ts:474-477`: a denial's `input` is `JSON.stringify(tool_input)` truncated to 400
  characters with `...` appended. A long command yields text that is not valid JSON.
- `lib/types.ts:84`: the result event carries `modelUsage?: Record<string, ModelUsage>`, keyed by
  model id. That is the only place a resolved model id appears.
- No automatic rerun exists in the runner: `grep rerun|attempt` over `lib/*.ts` and `run.ts` finds
  only the token-mint retry at `run.ts:159`. Pass 1's reruns were a separate batch
  (`validation-rerun-20260924`).
- `lib/prepare-class.ts:414` already excludes `docs/internal/record`, `docs/superpowers`, and
  `scripts/docs-readers` from repository exports.

## Blockers

**B1. The scorer rejects every report round 0 and tuning must score.** Plan:183-184, 235, 248-250.
Task 3's scorer "rejects an unstamped report"; Task 5 rescores pass 1's saved reports "through
Task 3's scorer" and Task 6 scores rounds 1 and 2 with it. None of those reports is stamped (they
precede the freeze), so round 0 cannot run. The scorer is a frozen input, so the fix must land in
Task 3, not be improvised at Task 5. An improvised skip flag is also a privileged channel: any
switch that skips the stamp check can score a gated batch unstamped.
*Fold:* Task 3 gives the scorer an explicit development mode that is the only way to score an
unstamped report, that reads only development batches (pass 1's saved reports and batches whose
job ids are the tuning set), and that cannot emit a bar verdict or a class verdict. Acceptance: a
fixture gated report without a stamp is rejected in both modes; a pass 1 saved report scores in
development mode; development mode on a test-set batch refuses, naming the batch.

**B2. Four frozen inputs have no author and no build task.** Spec:136-138, 226-233; plan:275-284,
298-308. The freeze hashes "the planter and miner prompts, the miner's exclusion script, and the
plant-type definitions." No task before Task 8 writes any of them. The conductor may not write a
prompt (plan:72-73), and Task 10 dispatches the miner and planter only after the freeze. The
exclusion script is real code: it drops cited commits and every hunk overlapping a development
item's recorded location "with line spans carried to a common commit," which needs a location
table for D01 to D19, P01 to P17, F1 to F6, and R1 to R4 plus git span-carrying logic. Task 8's
reviewer would find them missing and the pass would stall at the irreversible boundary.
*Fold:* add the exclusion script (and its location table, built by the conductor or a
non-blind agent from the development records) to Task 3 with fixtures: a hunk overlapping a
recorded span after a later commit shifted it by N lines is dropped; a cited commit is dropped;
an adjacent non-overlapping hunk survives. Add a pre-freeze step to Task 5 or Task 7 in which a
`claude-opus-5-5` author (blind per the planter's rules, since the planter reads its prompt)
drafts the planter prompt, the miner prompt, and the plant-type definitions, reviewed by
`diff-reviewer` for the bans. Task 8's acceptance then lists each by path.

**B3. The "one automatic rerun" rule has no build task.** Spec:152-156; plan:183-185, 294, 323.
The spec makes reruns "the runner's alone": exactly one automatic rerun for an unverified,
crashed, timed-out, or report-less run, every attempt kept, the scorer reading the final attempt,
the record listing each rerun and cause. The runner has no rerun logic today (see code facts).
Task 3 reads "final attempts only" from a structure nothing produces, and Tasks 9 and 11 accept
"reruns follow the spec's rule" with nothing that implements it. Because the runner is frozen,
discovering this at Task 9 forces a re-freeze.
*Fold:* add the rerun to Task 4 (it already edits `lib/runner.ts`). Acceptance: a fixture job
whose first attempt fails verification is rerun once and both attempts are in the results with a
cause; a second failure is not rerun again; a job that passes first time has one attempt; a
timed-out and a no-report fixture each get one rerun.

## Majors

**M1. Round 0 and tuning need a proxy map that no task builds.** Spec:109-115; plan:174-178,
240-242. The proxy map is a different rule from Task 3's `path-map.ts`: any verified quote in any
report field, from any verified Opus control run of pass 1, one run suffices, with no `steps[]`.
Task 5 must report each job's proxy map and on-map plant count, but only the `steps[]`,
two-of-three rule is specified.
*Fold:* Task 3 adds a `--proxy` mode. Acceptance: a fixture pass 1 report with one verified quote
in `assumed[]` puts its section on the map; an unverified quote does not; a Sonnet run's quote
does not.

**M2. The held-out criteria are written by the wrong agent at the wrong time.** Spec:240-242;
plan:289-290, 303-305. The spec requires criteria for the nine held-out defects "before their
runs." The held-out scripter runs are in Task 9; the plan has the planter write the criteria in
Task 10, after them. Worse, writing a criterion for D01 to D18 needs pass A's ground truth, which
the planter must never see (plan:67-71). Either the order breaks or the planter's blindness does,
and a planter that has read pass A's defects contaminates the test plants.
*Fold:* move the held-out criteria to Task 5's rubric author (already non-blind, already writing
development criteria), committed before Task 8 so they enter the freeze.

**M3. The plant check cannot run the check it is assigned.** Spec:244-246; plan:67-71, 306-307.
The spec's blind read "confirms the plant shares no subject with any development-set item." The
plan's global blindness list forbids the plant check from seeing the development records, so it
has nothing to compare against and the check passes vacuously. The spec never makes the plant
check blind to development items; it makes it blind to the plant's authoring.
*Fold:* remove the plant check from the development-records clause of the blindness list; give it
a subjects-only list of the 50 development items (no locations, criteria, or reports). Acceptance:
a fixture plant restating a listed subject is rejected.

**M4. The stamp and the plant-record hash are checked for presence, never validity.** Spec:146-148,
238-240; plan:183, 209-210, 219-221, 307-308. Planning-miss item 3. Channels that can set the
`freeze` field: the runner on a gated batch, a fixture, a pre-freeze dry run stamped with an older
manifest, and a moved tag. Task 3 only rejects an *unstamped* report, so a stale stamp scores.
Nothing says an ungated batch leaves the field unset. The planted batch is built after the freeze,
so its batch file and the test plant record are outside the freeze manifest; the plan names no
code that verifies "the record's hash enters the planted batch's manifest," and no check that the
scorer and catch judge read the record whose hash that manifest holds.
*Fold:* Task 3: the scorer rejects a stamp whose `manifestHash` differs from the committed
manifest at the tag (fixture: one stale-hash report rejected, path named). Task 4: an ungated
fixture batch's reports carry no `freeze` field; a planted batch declares a second manifest (the
freeze hash plus the planted batch file and the plant record's sha256), which the runner verifies
before a planted run (fixture: one byte changed in the record refuses the batch). Task 12: the
judge-packet builder (M6) hashes the record it reads and refuses on mismatch.

**M5. Nothing verifies that the judges' and agents' prompts are the frozen ones.** Spec:147-148;
plan:326-329, 341-349. The runner's manifest check covers reader runs only. The catch judge, the
adjudicator, the miner, the planter, and the plant check are Agent dispatches by the conductor,
whose prompts the runner never sees. The spec's backstop, "the close's `diff-reviewer` confirms no
frozen path changed after the tag," is absent from Task 13.
*Fold:* Task 13 acceptance: `freeze.ts --verify` on the close commit passes, and the close's
`diff-reviewer` runs `git diff docs-reset-1b-freeze.. -- <every manifest path>` and reports it
empty. Tasks 10 and 12: each dispatch loads its prompt from the frozen path after
`freeze.ts --verify` passes.

**M6. The judges' input packets have no builder, so their blindness and the counting rule rest on
the conductor.** Spec:251-261; plan:69-71, 326-329. The catch judge must see catch fields only
(`stalls[]`, `assumed[]`, `diverged[]`, and `checks[]` only if populated), never
`ruleCandidates[]`, the model, the run id, or the reader prompt. The conductor "never reads
reports," so it cannot hand-assemble 93 packets, and no scorer fixture proves a
`ruleCandidates[]`-only item is neither a catch nor a finding, which is pass 1's headline failure
(35 of 48 false positives).
*Fold:* add `judge-packet.ts` to Task 3 (and the freeze). Acceptance: a fixture run whose only
mention of a plant is in `ruleCandidates[]` yields a packet without it; the packet contains no
model id, run id, or `modelUsage` key; `checks[]` is included only when non-empty.

**M7. The scorer's sensitivity thresholds and their recompute trigger are wrong.** Spec:196-209;
plan:183-187, 291-296. Task 3 never says the scorer reads thresholds from `oc-curve.ts`'s committed
output, so a hard-coded 31 of 42 would stand at 40 plants. And Task 9 recomputes only when a map
"cannot hold seven plants," but the final plant count is known only after Task 10's validity and
replacement loop; a job that ends short there gets no recompute. The "reported, not gated" branch
(no threshold at 34 plants) has no fixture.
*Fold:* move the recompute to the end of Task 10 on the final count, committed before Task 11.
Task 3 acceptance: at 40 plants the scorer applies the recomputed threshold from a fixture file;
at 34 plants sensitivity is reported and gates no class; a class with one plant reports its floor.

**M8. The validity script checks two of the placement rules.** Spec:185-188, 219-222, 234-236;
plan:306, 311-313. The script checks "on-path and differs." Unchecked: at most two plants per
section, none within ten lines of another, at most four per page, plants inside a narrowed map's
all-three or 40-line zone, stale-path plants off the absent list, and plants off the mapping-run
finding spans. Each is mechanical, so leaving it to the planter's honesty is the vacuous-pass
case.
*Fold:* extend the validity script; Task 10 acceptance names one violating fixture per rule.

**M9. Three reported measures that feed pass 2a have no scoring path.** Spec:386-390, 425-427;
plan:326-339, 346-347. The held-out scripter runs are neither planted runs (catch judge) nor
mapping runs (adjudicator), so Task 12 scores them with nothing. The Sonnet decision ("at least 5
of 6 verified and per-run recall within 10 points of Opus") is handed to pass 2a in Task 13 but
computed nowhere. The transfer set's measures have the same gap.
*Fold:* Task 12 dispatches the catch judge on the three held-out runs against the M2 criteria.
Task 3 acceptance adds a fixture for the Sonnet rule (4 of 6 verified fails; 5 of 6 at 11 points
below fails; 5 of 6 at 9 points passes) and for transfer scoring staying out of every class
verdict.

**M10. The harness filter meets malformed denial input the plan does not name.** Spec:273-279;
plan:179-181, 195-197. Planning-miss items 1 and 2. The spec parses the command "from the record's
JSON excerpt," but `excerpt()` truncates at 400 characters, so a long command is invalid JSON.
Other states without a named report: `blockedBy` absent or a non-string, an empty denial record,
and a job with no absent list.
*Fold:* Task 3 acceptance: a truncated excerpt still yields its first word and first argument (or,
if not recoverable, the item goes to the adjudicator and the record says why), never a crash; a
job with no absent list stops scoring with the job named; a missing `blockedBy` is treated as
null.

**M11. Three export rules have no acceptance criterion.** Spec:161-172; plan:142-165. Normalized
mtimes, the absent list derivation, and the planter's export have no fixture. The absent list feeds
both the harness filter and the stale-path plant rule, and the planter's export carries the
planter's blindness.
*Fold:* Task 2 acceptance: every file in a prepared tree has the fixed mtime; a fixture builder
with exclusions X and Y writes exactly X and Y to the job file, and a path it excludes is absent
from the tree; the planter's export has no `.git`, no `docs/internal/record/`, and none of the
three status files. Add a failure fixture for the one-commit check: a tree with two commits or a
dirty status is rejected.

**M12. The per-class verdict and the pools have no fixture.** Spec:280-282, 394-399; plan:198-201.
"A pass and a fail on each bar" does not prove the verdict composition: a pooled sensitivity or
agreement failure fails every class, a class floor or precision failure fails only that class, and
stability decides nothing. Nor does it prove the pools: gated precision reads verified Opus mapping
runs of development jobs only, never tuning controls, Sonnet runs, or transfer runs.
*Fold:* Task 3 acceptance: an agreement failure marks all four classes advisory; one class's
precision failure marks only that class advisory; a false finding placed in a transfer run, a
Sonnet run, and a tuning control run changes no class's precision.

**M13. Task 13 replays the regression batch with no budget or criterion.** Plan:347-348. A replay
of the frozen test batch is 18 or more planted runs plus judging, about 1M, absent from the
spec's budget and landing after the flag the spec expects to trip before planting. The spec makes
the batch the floor that a *later* change reruns.
*Fold:* replace the replay with a dry check: the batch loads, `freeze.ts --verify` passes, and the
runner's pre-flight accepts it without launching a reader.

## Minors

- **m1.** Plan:131-132. "Six lines off fails" is a weak fixture, since the verifier already fails
  at two lines off; a tolerance bug of up to five passes it. Use two lines off.
- **m2.** Plan:120-138. No criterion for `blockedBy`: a null value validates, a missing field on a
  new run fails, and a string value round-trips.
- **m3.** Plan:257-260. The keep rule's numbers are not in the acceptance: kept only with at least
  two more on-map catches and no more than 0.5 more false findings per control run.
- **m4.** Spec:118-119; plan:246-260. Missing: a judge defect found during tuning is fixed and
  every round rescored. Also missing: absent lists and allowlists are not tuning levers
  (spec:126-127), for the ban check to enforce.
- **m5.** Plan:266-271. The read-pages list "derived by script from the reports" undercounts,
  since a report carries about one quote per page. Derive it from the transcripts' Read and Bash
  file paths as well.
- **m6.** Plan:270-273. There is no check that each transfer text carries an arrival state and a
  done signal, and no check that its batch file carries an absent list.
- **m7.** Plan:222-224. "Matches to two decimals" is exact-safe for the beta-binomial sums but not
  for the 5,000-draw stability simulation: a different RNG moves the second decimal. State a
  tolerance (for example 0.02) for simulated figures, and require the seed so the output repeats.
- **m8.** Plan:206-208. "Resolved model ids" names no source. The only source is the result
  event's `modelUsage` keys, which exist only after a run, so the pre-run check cannot verify
  them. State that the runner compares them post-run and marks a mismatched run unverified.
- **m9.** Plan:192-195. The path-map fixtures cover 2-of-3 and 1-of-3 but not the two-verified-run
  and one-verified-run cases, and not zero verified runs (name its report: no map, job reported,
  no plants).
- **m10.** Plan:311-313. "Seven plants" is rigid; the thin-map and ceiling rules allow fewer. The
  acceptance should read "seven, or the count the map record allows."
- **m11.** Spec:454-462; plan:298-308. The spec expects the flag to trip during mapping, mining,
  or planting, before any planted run. Task 10 has no flag check before planting the transfer
  jobs, so cut 3's planting half can be spent before it fires.
- **m12.** Spec:357-365; plan:328-329. Missing: a fixture for stratum balance "where the pool
  allows," and a criterion that the bars are recomputed after Fable's rulings replace the primary
  ones, with agreement computed before.
- **m13.** Plan:136-137. The prompt grep test needs its fixture's source named: a subject list
  extracted by the conductor, not by the implementer rereading the development records.
- **m14.** Spec:447; plan:3-11. The spec budgets three implementer tasks and the plan has four,
  more once B2, B3, M1, and M6 fold in. Restate the implementer line in the ledger's opening
  estimate.

## Owner fork

**OF1. The high-end budget exceeds the ceiling.** Spec:464-468; plan:28. The spec says "the owner
rules on it at the plan gate." The plan defers with "unless the plan gate rules otherwise" and
does not put the question. The folds above add build scope (B2, B3, M1, M6) and remove about 1M
(M13). *Recommendation:* keep the 10M ceiling and 8M flag, and have the plan's header state the
revised high end after the folds, so the owner rules on a current figure.

## Coverage table

| Spec rule | Task | Criterion |
| --- | --- | --- |
| Sequence 0, rescore and development criteria | 5 | Partial (B1, M1) |
| Sequence 2, transfer jobs | 7 | Partial (m5, m6) |
| Tuning: `steps[]`, `diverged[]`, `blockedBy` | 1 | Partial (m1, m2) |
| Tuning: rounds, proxy map, keep rule, bans | 5, 6 | Partial (M1, m3, m4) |
| Freeze: manifest | 4, 8 | Missing inputs (B2) |
| Freeze: refusal and stamp | 4 | Presence only (M4) |
| Freeze: close check | none | Missing (M5) |
| Freeze: reruns | none | Missing (B3) |
| The export | 2 | Partial (M11) |
| Path map: sections, on-path, ceiling, thin map | 3 | Partial (m9) |
| Path map: recomputed thresholds | 4, 9 | Wrong trigger (M7) |
| Planting: types, source, record | 10 | Present |
| Planting: miner exclusion | none | Missing (B2) |
| Planting: spacing and validity | 10 | Partial (M8, M3) |
| Planting: held-out criteria | 10 | Wrong order and agent (M2) |
| Scoring: fields and judges | 3, 12 | Partial (M6) |
| Scoring: harness filter | 3 | Partial (M10) |
| Scoring: pools | 3 | Missing (M12) |
| Bars and agreement | 3 | Partial (M7, m12) |
| Failure rule | 12 | No fixture (M12) |
| Reported measures | 3, 12 | Partial (M9) |
| Budget cuts | 6, 11 | Partial (m11) |
