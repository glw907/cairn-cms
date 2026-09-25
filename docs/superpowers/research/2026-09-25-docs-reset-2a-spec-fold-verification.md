# Docs reset pass 2a spec fold: verification read

**Target:** `docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md` and the parent's
"Amendments from pass 2a's brainstorm" (`2026-09-23-docs-reset-design.md:76-96`), both at
`1f718a2e`, against the fold record and the four lens reviews. **Reader:** a fresh Opus 5.5
context with no part in the fold. **Source checked:** `score.ts` (`runDev`), `lib/score-catch.ts`,
`lib/score-precision.ts`, `lib/score-assemble.ts`, `lib/score-integrity.ts`, `lib/verify.ts`,
`lib/runner.ts` (`REPORT_REQUEST`), `harness-filter.ts`, `judge-packets.ts`,
`prompts/catch-judge.md`, `prompts/adjudicator.md`, `prompts/criteria/dev-plants.json`,
`tuning/round0/score.json`, `tuning/round1/score.json` and its catch keys, the round 1 prepared
trees in the cache, `~/.claude/workflows/docs-page-chain-v2.js` and its fixture test, and the pass
1b post-mortem.

**Counts:** 0 blockers, 2 majors, 8 minors.

## Did the blockers and majors close?

Every blocker and major in the four reviews closed at its cited location, with one exception each
under M1 and M2 below.

- **con B-1, mec B-1 (omission plants unscored):** closed at spec:30-33 and :74-81. The catch
  prompt already accepts a catch that does not quote the exact line (`catch-judge.md:54`), so a
  `missing[]` item whose quote is "the nearest line" can meet P05, P11, and P14's criteria.
- **ctr C1 (vacuous precision):** closed at spec:34-36, :99-102, :174-176.
  `findingCountsForRun` already counts every item of an unverified run as false
  (`lib/score-precision.ts:27`). Dev mode currently filters `run.verified`
  (`score.ts:400`), which is the filter 1c's pooled block drops.
- **con M-1, ctr C6, mec M-3, rsk M4 (chain misdescribed):** the description of the current chain
  at spec:211-214 matches `docs-page-chain-v2.js:377-396` and `:785-796`. The handoff carries each
  reader job's `class` (`:695`), so `gatingClasses` can be resolved per job id as stated. The
  guard claim at spec:228-234 did not close; see M1.
- **con M-2 (per-class outcome):** closed at spec:187-192.
- **con M-3, rsk M5 (teardown):** closed at spec:47-51, :322-324, and parent :93-96.
- **con M-4, mec m-6 (budget):** routed to owner ruling 1, but the re-estimate's stated basis does
  not reproduce; see M2.
- **con M-5, mec M-4 (free floor):** closed by removal (CR6).
- **mec M-1, rsk M1 (`wrong[]` never reaches the adjudicator):** closed at spec:89-94 and
  :115-118. The key already maps item ids to fields (`judge-packets.ts:446-449`), so the
  new-field split in 1c is computable.
- **mec M-2 (dev batch names):** closed at spec:96-97 against `lib/score-integrity.ts:16`.
- **mec M-5, ctr C8 (profile route):** closed at spec:266-271.
- **ctr C2 to C5, C7, rsk M2, M3:** closed at the cited lines. The Wilson figures (0.505 to
  0.898; 0.444 to 0.858) and `clopperPearson(12, 16)` = 0.476 to 0.927 recompute exactly. Round
  1's five-job false total of 7 (all scripter) and round 0's 7 over 10 runs match the committed
  `score.json` files. P05's criterion does say "incomplete or inconsistent". Each round 1 catch
  key records its planted page's sha256 under `inputs`, and the designer tree's hash in the cache
  still matches it.

## Can the pass mark be computed, and can it pass vacuously?

Every condition can be computed from the scorer after 1c:

- **Recall:** pooled `onMapPlantRunRecall`. An unverified planted run stays in the tally as a
  miss (`tallyPlantCatches`, `lib/score-catch.ts:81`), so R9 is honored without code.
- **Breadth:** 1c's per-plant tallies and the per-job `onMapPlantRunRecall.caught`.
- **Precision:** 1c's pooled block.

The two preconditions at spec:159-162 (total 16, per-job plant counts, five control runs, no
judge note) block the vacuous paths. The pooled and per-class conditions combine unambiguously:
the pooled go is necessary, then each class tests its own recall and per-job catches, and
precision stays pooled. Two sourcing gaps remain, both minor (m2, m3).

## Findings

### Major

**M1. The chain's "false item never makes a wrong page" rests on a mechanism the chain does not
have.** Spec:228-234. The spec says the applied-findings read "reports a false item as not
applied", so a false item "costs one conductor ruling, never a wrong page". The source says
otherwise:

- The redraft is told to apply "every finding below, blocking or advisory"
  (`docs-page-chain-v2.js:480`, `:501`), with no path to decline one.
- The applied read grades only whether the redraft made the change ("applied, did not apply,
  or applied wrongly", `:589-590`). It does not judge whether the finding was true.

So a false `wrong[]` item is applied and marked "applied", in both branches; the advisory label
does not keep it out of the redraft. The actual guard, where one exists, is the candidate trace
and the gate's provenance check. A redraft that changes a fact must file an `[candidate: ...]`
bullet, and the applied read's retag rule turns an untraceable candidate into a blocking
`newIssues` entry. That path is plausible but unproven, and the spec does not cite it. This
paragraph is the stated reason no judge is added to the chain, so it carries weight.

**Fix:** pick one.

- (a) Add a decline path. A reader `wrong[]` or `missing[]` item is applied only when the facts
  container or the source supports it; otherwise it is declined with evidence. The applied read
  reports "declined", which escalates in a gating class and is recorded in an advisory one.
  Add a fixture case where a false `wrong[]` item is declined and the page does not change.
- (b) Restate the guard as the candidate trace plus provenance, and add a fixture case proving
  that a false `wrong[]` item whose redraft files an untraceable candidate escalates.

Either way, strike "reports a false item as not applied".

**M2. The budget's stated range does not reproduce from its stated basis, and that range is the
evidence for the one owner fork.** Spec:351-370, :377-393. The spec says "the range runs from 1b's
cheapest build tasks to its mean". Pass 1b's build tasks are 0.96M to 3.82M, a mean of 2.0M
(post-mortem, "The build tasks cost 14.0M" over seven tasks). The five build items here (1a 1.3,
1b 1.3, 1c 0.8, chain 1.2, 4a 0.8) total 5.4M:

| Case | Build items | Total |
| --- | --- | --- |
| At 1b's cheapest (0.96M each) | 4.8M | about 12.5M, not 11M |
| As estimated | 5.4M | about 13.1M |
| At 1b's mean (2.0M each) | 10.0M | about 17.7M, not 16M |

Two rows also sit below every 1b measurement: 1c at 0.8M, which is scorer logic, the area that
drew 1b's Task 7 three `fix` reads, and 4a at 0.8M for two deliverables. Recommended option (b)
has an 11M estimate against a 12M ceiling. At 1b's mean, its remaining 3.5 build tasks put it
near 14M, over the ceiling. The two-deliverable cap is a real argument for below-mean costs, since
1b's dearest task had four deliverables. The owner still needs the honest spread.

**Fix:** state each option's estimate at the stated per-task figures and at 1b's mean: (a) about
13M and 18M, (b) about 11M and 14M, (c) unchanged. Lift 1c and 4a to at least 1b's floor (about
1M each). Then either set (b)'s ceiling from the mean case, or say plainly that the flag is
expected to trip.

### Minor

- **m1. The smoke run's place in the task order is unstated.** Spec:139-141, :335-337. The
  execution rules pin every cross-stage shape to "the smoke run's report", but §2 places the smoke
  run under the pilot, after 1a to 1c are built. Under pass 1b's lesson 4, 1b's packets and §3's
  fixture must be built from it. **Fix:** order it as 1a, smoke run, 1b, 1c, with the CLI hold
  starting at the smoke run, as spec:135 already says.
- **m2. The per-class recall has no named `score.json` source, and the likely-looking field is
  the wrong measure.** Spec:187-190. `onMapRecall[class]` is `recallOf`, which counts a plant only
  when two runs catch it (`lib/score-catch.ts:227-231`, `caught >= 2`). It is not plant-run
  recall. **Fix:** name the source as the sum of `byJob[*].onMapPlantRunRecall` within each class,
  or have 1c emit per-class plant-run recall.
- **m3. The "fixed list of control runs" has no stated source.** Spec:98-99, :161. If the list
  derives from the reports, a control run absent from them shrinks the pooled block. The
  precondition at :161 catches this only if "listed" means listed against an expected five.
  **Fix:** 1c takes the five expected control ids, as an explicit list beside the batch names,
  and refuses when one is absent.
- **m4. The spec does not say that every run is judged, verified or not.** Spec:145-152, :159-162.
  An unverified planted run with no catch key yields the note "no catch-judge key and rulings
  joined" (`lib/score-assemble.ts:316`), which the precondition reads as a failure needing a
  rerun, against R9's "counts as a miss". The budget's 10 catch judges and 5 adjudications imply
  every run is judged. **Fix:** state it.
- **m5. The verifier-check trigger counts only planted runs.** Spec:149-151. One control run
  failing on a new-field quote counts every item false and can fail condition 3 alone, since 9
  items is over 8. **Fix:** trigger on two or more runs of either role, or on any control run.
- **m6. The render fixture cannot be "built from the first profile file".** Spec:266-271,
  :335-337. 4a runs "before authoring", so no profile exists yet, and the schema test parses zero
  profiles at 4a. **Fix:** 4a writes one seed profile for its fixture, or the render fixture pins
  after 4b's first profile.
- **m7. `gatingClasses` defaults to empty, which changes current behavior.** Spec:216-219. Today
  every verified reader's stall blocks, and the existing fixture case at
  `docs-page-chain-v2.fixture.test.mjs:345-361` asserts escalation on one. **Fix:** the acceptance
  says existing reader-defect cases pass a gating class, and the chain header documents the
  default. Also name the new defect ids (`rd-<jobId>-wrong-<k>`, `-missing-<k>`), since the strike
  list addresses defects by id.
- **m8. Owner-ruling wording.** Spec:377-393.
  - "About 6M more than O12 allotted" should be measured against B3's 7M (13.1 minus 7). O12 as
    recorded at spec:19-24 sets no pass 2a figure.
  - Under (b), the moved 1.6M (chain and render) lands on the first drafting pass above its 1.5M
    overhead line; say so.
  - Under (b), 4b's drafter edit (spec:276-277) would document a render path not yet built.

## Owner fork and hidden forks

The ceiling fork can be ruled once M2's spread is shown. The options are distinct, and the
recommendation's reasoning (placement beside first use, same program cost) is sound. No other
fork belongs to the owner:

- CR1 to CR8 are method calls within B2's delegation.
- CR7 has one answer.
- The no-go default is O12's own text.
- CR4 narrows O12's "only if" without contradicting it.

The one call that brushes the owner's line is "no judge in the chain" (spec:234). It is a method
call, but its justification is M1's defect. If M1's fix takes option (a), the call stands as a
method call. If neither fix proves the guard, whether reader items may change pages unjudged
becomes a question worth one line in the plan-approval brief.

No new contradiction between sections was found. The parent's line 225 still says the site is
torn down at pass 2a's close, but the amendment at :93-96 states that it wins.
