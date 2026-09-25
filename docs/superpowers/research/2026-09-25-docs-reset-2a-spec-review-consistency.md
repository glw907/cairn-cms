# Docs reset pass 2a spec review: consistency lens

**Target:** `docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md` at `598902f3`, plus
the parent spec's "Amendments from pass 2a's brainstorm" section
(`docs/superpowers/specs/2026-09-23-docs-reset-design.md:76-89`). **Lens:** consistency with the
ratified documents, and a spot check of every citation. Read-only apart from this file.

**Counts:** 1 blocker, 5 major, 9 minor. Two items are marked OWNER FORK.

## Citations verified as stated

These hold, so no finding follows from them:

- `lib/runner.ts:731-734` is the comment implying a once-hashed prompt match that nothing checks
  per job. `lib/class-schema.ts:68-69` is the garbled sentence ("a caller taken before ... pins the
  bytes a run must match never serves"). Both match ROADMAP's carried notes.
- `REPORT_REQUEST` is at `lib/runner.ts:128-137`. It has no slot for a false statement, and
  `ruleCandidates` reads "anything you think the documentation should have told you".
- 2 of 16 (round 0) and 1 of 8 (round 1) match `tuning/round{0,1}/score.json` and the validation
  record (lines 66-67).
- 21 misses: 11 true, 10 in `ruleCandidates[]` across P05, P06, P09, P11. "13 of 24" is the 3
  catches plus the 10. Validation record lines 78-87.
- The three quoted round 1 candidates (P06 `/style-guide`, P09 `section.ts`, P05 `AUTH_DB`) are
  verbatim in `tuning/round1/reader-report.json`.
- The on-map plant counts are 2/2/2/1/1 for operator, designer, extender, core developer, and
  scripter, with evaluator 0 (validation record line 50). Five jobs times three runs is 15, and 8
  plants times two is 16.
- The Wilson interval for 12 of 16 is 0.5050 to 0.8982, and for 11 of 16 it is 0.444 to 0.858.
- "Round 1 pooled about 1.2" is 7 false findings over 6 verified control runs, which is 1.17. The
  sample caveat is in m4.
- R9 matches the pass 1b post-mortem ("an unverified planted run counts as a miss in the
  development per-run denominator").
- The corpus has 68 captures: 68 capture directories under `~/.local/share/cairn/exemplars/*/`.
- `docs-page-chain-v2.js:389-390` types `stalls` and `assumed` as `STRINGS`.
- The scratch-site teardown section exists at `docs/internal/record/2026-09-23-scratch-site.md:229`.
- `docs/internal/audiences/` is outside the tarball. `package.json` `files` lists only the four
  arms, the README, and `why-cairn.md`, and `check:arm-indexes` walks `docs/internal` without
  recursing.
- O12 (STATUS lines 29-35), B3's 7M and 5.6M figures, 2b's 8M, 0.7M per page plus 1.5M per pass,
  and the 45M cap all agree across the spec, the parent amendment, and STATUS. The one exception
  is the stale 6M in m1.

## Blocker

### B-1. Narrowing `ruleCandidates[]` to "missing" puts three of the eight on-map plants beyond the scored fields, including P05, the spec's own motivating example

**Location:** `2026-09-25-docs-reset-pass-2a-design.md:47-51` and `:36-38`, and `:79-86` (the pass
mark).

**Defect.** The new `wrong[]` field takes "each statement on a page the reader found to be false".
`ruleCandidates[]` narrows to "content the reader found missing, not wrong", and the judges still
never see that field. Three of the eight on-map plants are omissions, not false statements:

- **P05:** the remedy "omits the `AUTH_DB` D1 binding".
- **P11:** "the page never tells the reader to declare an access-map rule".
- **P14:** "the page omits" the `npm run package` step.

The criteria are in `scripts/docs-readers/prompts/criteria/dev-plants.json`. The round 1 operator
candidate that the spec cites for P05 is phrased as an omission: "It should also say how to
declare AUTH_DB". Under the new prompt line, a reader who routes around an omission is told to file
it exactly where it cannot score. Pass 1b's own real-defect definition counts omissions ("omits a
fact the job needs that no published page supplies", pass 1b spec, Scoring), so the scored fields
need a home for a routed-around omission.

**Consequence.** If the omission plants stay unscored, the pilot peaks at 10 of 16 plant-runs and 5
of 8 plants. Both are below the recall bar (12) and the breadth bar (6), so the pilot can return a
no-go by construction, however well the change works on false statements.

**Proposed fold.** This is a field-definition call inside B1, so it falls to the conductor under
the `methodology-calls-are-claudes` memory. It is not an owner fork. Keep B1's typed `wrong[]` and
add one of the following. Option (a) is recommended.

- **(a)** Widen `wrong[]` to "each statement that is false, or incomplete for the job, even when
  you worked around it". Here `quote` is the incomplete statement (P05's remedy line) or the
  nearest line where the step belonged (P11, P14).
- **(b)** Add a typed `missing[]` with the same `{ quote, pageSays, actual, evidence }` shape,
  scored for catches and precision exactly like `wrong[]`. `ruleCandidates[]` then keeps only
  wishes the job did not need.

Either way, restate the catch-judge and prompt acceptance so that a fixture carrying an omission
catch reaches the packet.

## Major

### M-1. The chain section misstates the current chain, and its budget is inverted

**Location:** `:104-116` (item 3) and `:205` (budget row).

**Defect.** Item 3 says that on a go "the chain gains its reader stage". In fact
`docs-page-chain-v2.js` already has one:

- Its header (lines 11-24 and 67-103) runs the reader runner between stage 1 and stage 2.
- Lines 795-796 turn every reader stall and assumption into a `blocking: true` finding.
- The applied-findings check escalates unless every reader defect comes back applied (lines
  93-103).

Today the chain treats readers as a gating stage, just with the wrong field types. So on a go, the
change is mostly types plus `wrong[]` and `diverged[]`. On a no-go, the change is larger: reader
defects have to be demoted from blocking to advisory. The budget row ("full on a go, types only on
a no-go") and the 6.3M and 5.5M totals assume the reverse. The 5.5M no-go total also implies a zero
cost for the chain, since 6.3 minus 0.8 is 5.5, which contradicts "types only".

**Proposed fold.** Restate item 3 from the file as it stands:

- **Both branches:** type `stalls[]`, `assumed[]`, `diverged[]`, and `wrong[]` as the runner emits
  them.
- **Go:** keep the reader defects blocking.
- **No-go:** mark reader defects advisory and drop them from the applied-findings escalation.

Re-cost the row per branch. Also note that "reach the drafter" on a no-go actually means the
stage 2 redraft, since the stage 1 drafter runs before any reader.

### M-2. A pooled go promotes readers to gating without regard to class, against pass 1b's per-class outcome (O4)

**Location:** `:79-89` and `:109-111`.

**Defect.** The pass mark is pooled across five jobs, and the breadth rule lets one job catch
nothing. Item 3's go branch then gives "the chain" a reader stage, without saying which classes
gate. Pass 1b's ratified outcome is per class ("A validated class's readers go to pass 2a as
validated. A failing class's readers run ... as advisory only", pass 1b spec, Failure rule; O4).
The spec also leaves two cases unstated:

- **The docs-only class.** The evaluator sits out and "stays advisory whatever the result", but
  item 3 never says the docs-only class stays advisory in the chain.
- **Editor jobs.** They share the docs-only class, and no pass 1b job was an editor job.

**Proposed fold.** One clearly correct reading follows from O4. On a go, the reader stage gates
only for jobs in classes whose pilot jobs caught at least one plant. Readers in the docs-only
class (evaluator and editor jobs) and in any class with zero catches stay advisory. The chain's
go branch sets a blocking flag for each class. State this in item 2's fork and in item 3.

### M-3. Scratch-site teardown at pass 2a's close breaks the operator reader class that the go branch needs in the drafting passes

**Location:** `:175-176`.

**Defect.** The parent fixed teardown "at pass 2a's close" (parent pass 1 item 0) because pass 2a
then held the trial, the last planned reader runs. O12 moves every page reader run into the
drafting passes, and the first drafting pass takes the operator trial page `schedule-a-check`
(`:192-193`). The docs-and-binary class needs the scratch site and its scoped tokens (parent
ruling 10). Once the site is torn down, the chain has no operator reader on a go and no advisory
operator reader on a no-go.

**Proposed fold.** Move the teardown to the close of the last drafting pass that runs
docs-and-binary readers. Keep this pass's dry-run listing as a health check instead of a deletion,
and record the change in the parent amendment. There is one clearly correct answer here, since the
standing cost is scoped tokens on a free Worker.

### M-4. OWNER FORK: the budget rows sit well below pass 1b's measured unit costs and below the spec's own "fix rounds as the norm" rule

**Location:** `:197-210`, against the pass 1b post-mortem's program budget
(`docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md:882-905`).

**Defect.** The post-mortem's measured figures, set against this spec's rows:

| Item | Pass 1b post-mortem | This spec |
| --- | --- | --- |
| A build task, with fix rounds | "1M to 3.8M" | 0.8M for the reader change; 0.8M for the chain |
| Authoring and folds | "about 3M" | 1.2M record (fold inside the review row) |
| Four review lenses | 1.5M | 1.4M review and fold |
| Exemplar review and per-profile extension | about 1.5M | 0.7M |
| Conductor | 1M | 0.8M conductor and close |

For the same items, the post-mortem's figures sum to about 7M before the pilot and the two build
tasks, against this spec's 4.1M. The spec gives no basis for the reduction, and its own execution
rule says "Fix rounds are budgeted as the norm". Re-estimated from measured units, the pass lands
near 9M to 10M against a 7M ceiling, and B3 forbids cutting a review lens to fit.

**Options.**

- **(a)** Raise the ceiling at plan approval to a figure built from the measured units (about 10M,
  flag 8M).
- **(b)** Keep 7M and cut scope that is not a lens. The candidates are the exemplar gap-filling
  (review only, with extension moved to 2b alongside page-shape extension) and the floor rescore.
- **(c)** Keep 7M and all the scope, and accept a flag trip mid-pass.

**Recommendation:** (a). Put a unit-cost table into the plan so the estimate can be checked at the
close.

### M-5. The floor rescore is a code deliverable that the build task and budget omit, and it runs the measure pass 1b rejected without that label

**Location:** `:75-77`.

**Defect.** "Costs judges only" is not accurate. Two things block a rescore with candidates
visible:

- The packet builder allow-lists catch fields and excludes `ruleCandidates[]` by design
  (`judge-packets.ts:453`; the pass 1b carries, item 2: "Nothing else from the run: no
  `ruleCandidates[]`").
- The catch-judge prompt would need to name the field.

The rescore therefore needs a packet mode and a prompt variant that item 1's build task does not
list. That also breaks the "at most two deliverables" rule, since item 1 already carries `wrong[]`,
the comment carries, and the baseline pin. Pass 1b's spec also rejected counting candidates as
catches without also counting them as false positives: "would inflate both measures in the
instrument's favor" (pass 1b spec, Scoring).

**Proposed fold.** Either drop the floor or make it its own small task, with a packet flag
defaulting off and a pinned prompt variant. Label the floor's figure in the record as "counts
`ruleCandidates[]` as catches only, a measure pass 1b rejected, reported for diagnosis, never
compared with the pass mark". If blocker B-1 is folded as (a) or (b), the floor still tells the
pass how much of the gap a field redesign can close, so it earns a task only if the budget allows
one.

## Minor

### m1. STATUS and ROADMAP still carry O12's 6M figure

`docs/STATUS.md:29` ("a ceiling of 6M with the flag at 5M") and `ROADMAP.md` (the pass 2a bullet,
"runs at a ceiling of 6M") disagree with B3's 7M and 5.6M. **Fold:** correct both when the plan is
committed, and note B3 beside O12.

### m2. The ROADMAP pass 2a input for the designer theme guide is neither carried nor dropped

`ROADMAP.md` lists "One content input for the designer's theme task guide (Geoff, 2026-09-24)", a
section on giving a DaisyUI site its own identity. The spec moves the theme trial page to the first
drafting pass (`:192-193`) but never mentions the input. **Fold:** add one line under Out of scope
saying the input moves with the theme page to the first drafting pass, and re-file it there at the
close.

### m3. The parent amendment replaces the whole pass 2a section, while the new spec still cites that section's exemplar selection rules

Parent `:79-81` says the new spec "replaces the pass 2a section below". The new spec `:164` fills
gaps "under the parent's selection rules", which live only in that replaced section (parent pass
2a item 3). **Fold:** change the amendment to "replaces the pass 2a section below, except item 3's
exemplar selection rules, which pass 2a's spec applies", or copy the rules inline into item 6.

### m4. The precision bar departs from pass 1b's bar without saying so, and its comparison figure uses a different job set

The pass 1b bar is at most one false finding per run, for each class (pass 1b spec, Bars). The
pilot's bar is 1.5, pooled (`:87-88`). The "about 1.2" includes the evaluator's control run. Over
the pilot's five jobs, round 1 pooled 7 over 5, which is 1.4, and round 0 pooled 0.7. The bar
therefore works as "no worse than round 1", and one scripter run at round 1's rate would use it up.
**Fold:** cite 1.4 for the five-job sample, and add one sentence on why the bar is looser than pass
1b's (the field invites over-filing). Also state that pass 1b's R3 applies: an unverified control
run counts every item as false.

### m5. The adjudicator's side of `wrong[]` is unspecified

Item 1 names the catch-judge prompt only (`:53-55`). Precision is ruled by the adjudicator, whose
frozen rubric carries a field-specific rule for `diverged[]` (pass 1b spec, Scoring). `wrong[]`
also has no `blockedBy`, so the mechanical harness filter cannot drop a wrong[] item caused by an
absent-list path. An example would be "the page names `section.ts`, but it is not there" on a
trimmed tree. **Fold:** name the adjudicator prompt and give its `wrong[]` rule. Either add
`blockedBy` to `wrong[]` or state that the adjudicator's "harness" ruling covers those items.

### m6. The rationale for re-pinning the init baseline is wrong, and the real trigger goes unstated

`:59-60` says the init baseline is re-pinned because "the first-turn prompt changes". In fact
`init-baseline.json` pins, per CLI version, only the skills and plugins in the init event. It does
not depend on the prompt: the keys are `2.1.280` to `2.1.282`, and the host is at `2.1.282` today.
The actual risk is auto-update, since dotfiles `75f3d96` released the O10 hold (STATUS line 36).
**Fold:** "Before the pilot, pin the baseline if the host CLI differs from a pinned version, and
disable auto-update until the pilot's runs and judges finish." Also note that saved round 0 and 1
reports lack `wrong[]`. `lib/transcript.ts:717` returns `undefined` when a field is missing, so
`wrong[]` must be optional on read, or the floor rescore cannot load those reports.

### m7. The build acceptance's gate is weaker than the gate pass 1b used

`:62-65` requires only that "the `scripts/docs-readers` tests pass under the light gate lane". Pass
1b's chain gate was `vitest ... docs-readers && npm run check:comments && npm run check` on the
light lane (1b plan line 79), and the carries file adds `CAIRN_GATE_MEMORY_MAX=6G
CAIRN_GATE_MEMORY_HIGH=5G`, because the light lane's 3G cap runs `svelte-check` out of memory.
`check:comments` is the gate that the two comment carries answer to. **Fold:** use pass 1b's
chain gate with the memory override. Add one more acceptance item: `ban-grep.ts` passes on the new
prompt line, since pass 1b's Bans still apply while the pilot reuses the development plants.

### m8. OWNER FORK: the no-go chain has neither a grader nor a gating reader

The parent removed the profile grader because "the reader stage takes its place" (parent pass 1
item 6). It also planned a grader comparison to decide where the grader survives (parent pass 2a
item 5). The new spec drops that comparison (`:194-195`). The no-go branch (`:112-113`) then relies
on scripted checks, the register editor, and the fact read. Pass A found 14 page defects that
those stages, together with the grader, all accepted (parent, "Why now").

**Options.**

- **(a)** The spec as written, with the no-go report stating the pass A evidence.
- **(b)** Restore the v1 profile grader as an advisory read on a no-go.
- **(c)** On a no-go, stop the program for a re-plan before any drafting pass.

**Recommendation:** (a). O12 already rules that readers "stay advisory otherwise", and the grader
has a recorded miss too. Name the evidence gap in the no-go report so the first drafting pass
watches for it.

### m9. Smaller lines

- **Chain-depth evidence.** Pass 1b's "measuring jobs disjoint from the chain's reader-stage jobs"
  finding outlives the trial. On a go, O12's "chain depth follows reader evidence page by page"
  would measure pages with the same reader they were redrafted against. **Fold:** carry the
  disjoint-jobs rule into the first drafting pass's inputs.
- **No regression floor.** Pass 1b's standing regression floor does not exist (validation record,
  lines 139-140), so the `wrong[]` change has no regression check beyond the pilot's control runs.
  Say so under Labels.
- **Tooling verify.** The acceptance for item 4 omits `claude-tooling-sync verify` for the
  `cairn-docs-drafter.md` edit, a user-scoped agent. STATUS also lists a `claude-tooling-sync
  verify` still owed from pass 1b. Clear it before item 3, so item 3's green check is not
  confounded.
- **The model ruling citation.** The ruling recorded on 2026-09-23 (the `opus-5-5-conducts-execution`
  memory) moves brainstorms and plan authorship to Opus 5.5. It does not name artifact authorship,
  and the parent body line it replaces carries the same date. Cite the amendment itself (Geoff,
  2026-09-25) as the ruling of record. The same reasoning leaves pass 2b's Fable lines (parent
  pass 2b items 1, 2, and 4) standing; flag them for pass 2b's spec.
