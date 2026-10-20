# Docs reset pass 2a spec review: mechanics and feasibility

**Target:** `docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md` at `598902f3`.
**Lens:** does every mechanism behave as stated. Every claim below is verified against source or
a probe run, cited by `file:line`. Probes ran under `/tmp/claude-1000/probe/` against the repo's
own `score-catch.ts`; nothing in the repo was changed.

**Counts:** 1 blocker, 5 major, 6 minor. One blocker item is an OWNER FORK because ruling B1
pins the reader change.

## Answers to the six key checks

1. **Round 1's trees can be re-run as-is, but not scored as-is.** The prepared trees exist at
   `~/.cache/docs-readers/prepared/round1/{job}-{planted,control}` (all twelve), and
   `batches/round1.json` carries each job's arrival, job text, docs set, absent list, and pinned
   commit `3a7485dd`. The runner copies the prepared tree per job (`lib/podman.ts:384-395`), so
   a tree is never consumed by a run. The reader image for CLI 2.1.282
   (`localhost/docs-reader:375dbe1d9d66`) is still present, and the host is on 2.1.282. A re-run
   needs a new batch file (two planted ids per job, `-1` and `-2`, plus `-1` control, evaluator
   dropped). The dev scorer, however, refuses the new batch by name (finding M2). The trees
   live in an untracked cache; if it is purged, they must be rebuilt through the round 1 export
   path before the pilot.
2. **Recall extends with a packet change; precision does not.** Catch rulings are per plant, so a
   `wrong[]`-only catch reaches `onMapPlantRunRecall` untouched once the item is in the catch
   packet (`lib/score-catch.ts:78-95`, `:243-248`). The false-finding count comes from the
   adjudicator, whose packet and prompt the spec never names (finding M1). Verification, the
   report parser, the saved-report loader, and `score-assemble.ts`'s `itemCount` all enumerate
   fields by name and need `wrong[]` added. The proxy maps need no change for the pilot.
3. **The free floor is feasible without reader re-runs, but not "judges only."** Every saved
   planted report carries `ruleCandidates[]` (checked: `validation`, `validation-rerun`, and
   `round1` reports). The catch rule does not require a quote (`prompts/catch-judge.md:53-55`),
   so an unquoted candidate can catch. The packet builder deliberately excludes candidates
   (`judge-packets.ts:10-13`, `:453`), so the rescore needs a code path (finding M4).
4. **The init baseline does not depend on the prompt.** `checkInit` compares only tools, MCP
   servers, the key source, and the skills and plugins pinned per CLI version
   (`lib/transcript.ts:100-126`; `init-baseline.json` is keyed by version). A `REPORT_REQUEST`
   change forces no re-pin (finding m1).
5. **The chain already has a reader stage, and it gates.** Stage 2 turns every verified reader
   job's stalls, assumptions, and a non-done outcome into blocking defects
   (`docs-page-chain-v2.js:93-103`, `:783-796`). The spec's two branches are inverted relative
   to the work (finding M3). The profile is a single batch-level string (`args.profile`,
   `:128`, `:419-435`), and the workflow has no filesystem API (header, `:108-111`), so
   rendering frontmatter needs an owner (finding M5).
6. **Two budget lines are low.** See finding m6.

## Blocker

### B-1. The narrowed `ruleCandidates[]` keeps three of the eight on-map plants unscorable (OWNER FORK)

**Location:** spec `:32-43`, `:51-52`, `:79-82`.

**Defect.** Running `isPlantOnMap` over `fixtures/dev-plants.json` and the round 0 maps gives the
eight on-map plants. Three of them are omissions, not false statements:

- P05 (operator): the remedy "omits the `AUTH_DB` D1 binding."
- P11 (extender): "the page never tells the reader to declare an access-map rule."
- P14 (core developer): "the page omits" the `npm run package` step.

The spec routes false statements to the new scored `wrong[]` and then narrows
`ruleCandidates[]` to "content the reader found missing, not wrong" (`:51-52`). The judge still
never sees candidates. The narrowed wording therefore instructs the reader to file exactly
these three plants in the unscored slot. The saved reports show this is where they already go:
the P05 candidate reads "should also say how to declare AUTH_DB (d1_databases)" (round 1,
`operator-planted-1`), and P11's reads "should say directly that a read-only screen needs only
requireAccess plus an access-map entry" (round 1, `extender-planted-1`). The spec cites P05 as
evidence for `wrong[]` (`:38`), but P05's candidate is a missing-content claim.

Across 1b's 24 on-map plant-runs, no omission plant was ever caught through `stalls[]` or
`assumed[]`; the only catches were P16 (the tuning record, `:276`, `:290-293`). If that holds,
the six omission plant-runs are misses, the ceiling is 10 of 16, and the recall mark (12 of 16)
and likely the breadth mark (6 of 8 plants) are unreachable by construction. A no-go would then
measure the field design, not whether readers can gate.

**Options.**

- (a) Show `ruleCandidates[]` to the catch judge permanently, beside `wrong[]`, with a field rule
  that a candidate naming the specific missing fact counts as a "silent" claim. This is the same
  packet path the free floor needs (M4), so it costs no extra build.
- (b) Keep B1 as written and add a second typed field for missing content (`missing[]`, quoted at
  the place the fact belongs), leaving `ruleCandidates[]` for wishes that did not bear on the job.
- (c) Keep the spec and pre-register the ceiling: report recall over the five false-statement
  plants separately, and lower the recall and breadth marks accordingly.

**Recommendation:** (a). It uses the path the floor rescore builds anyway, keeps B1's field as
ruled, and lets the pilot test the whole misfiling finding rather than half of it. The
precision condition then has to count candidate items too (M1's fold covers that).

## Major

### M-1. The precision condition cannot see `wrong[]`: the adjudicator side is unnamed

**Location:** spec `:53-55`, `:87-88`.

**Defect.** The spec changes only the catch judge's packet and prompt. False findings come from
the adjudicator on control runs. Its packet enumerates fields by name
(`judge-packets.ts:700`: `[...fields.stalls, ...fields.assumed, ...fields.diverged,
...(fields.checks ?? [])]`), its prompt lists only those fields (`prompts/adjudicator.md:22`,
`:38`), and the agreement packet does the same (`judge-packets.ts:783`, `prompts/agreement.md:15`,
`:76`). The item-location union is `'stalls' | 'assumed' | 'diverged' | 'checks'`
(`judge-packets.ts:404`, `:448`). `score-assemble.ts:418` counts an unverified run's items from
the same four fields. Built as specified, a control run's `wrong[]` items never reach the
adjudicator, and condition 3 ("a field that asks what was false invites over-filing") measures
everything except the new field.

**Fold.** Name the full fan-out in §1: the report parser (`lib/transcript.ts:705-721`, which
returns no report when a required field is missing), the saved-report loader
(`lib/transcript.ts:746-781`, which must default `wrong` to `[]` so rounds 0 and 1 still load),
`verify.ts` (a `verifyWrong` beside `verifyDiverged`, `:167`, `:242-246`), the catch, adjudicator,
and agreement packet builders and their field union, the adjudicator and agreement prompts, and
`itemCount`. Add an acceptance item: a fixture control run's `wrong[]` item reaches the
adjudicator packet and a false ruling on it counts in `falseFindingsPerVerifiedControlRun`. The
harness filter tolerates an item with no `blockedBy` (`harness-filter.ts:147-148`), so `wrong[]`
needs no `blockedBy` field.

### M-2. The dev scorer refuses any batch not named `validation`, `validation-rerun`, or `round1`

**Location:** spec `:90-91`; `lib/score-integrity.ts:16`, `:31-34`.

**Defect.** `DEVELOPMENT_BATCH_NAMES` is a fixed allow-list (ruling R5), and `score.ts dev`
exits 1 on any other batch name (`score.ts:360-368`). A pilot batch cannot be scored in
development mode without a code change or by reusing the name `round1`, which would collide with
the tuning record's round 1.

**Fold.** Add the pilot's batch name (for example `pilot-2a`) to the allow-list in the §1 build
task, with a test, and state the name in the plan's pinned shapes.

### M-3. The chain section describes the current chain backwards

**Location:** spec `:106-113`, budget row `:205`.

**Defect.** The spec says the chain "gains its reader stage" on a go and gets "types only" on a
no-go. The chain already runs the reader runner between stage 1 and stage 2, and stage 2 already
makes every verified reader stall, assumption, and non-done outcome a blocking defect that the
redraft must apply (`docs-page-chain-v2.js:88-103`, `:783-796`, `:847-861`). On a go the work is
adding `wrong[]` and `diverged[]` to the defect derivation and fixing the types. On a no-go the
work is demoting today's blocking reader defects to advisory, which is more than types. The
"types only on a no-go" budget note is wrong for that branch.

A second consequence is worth one sentence in the spec: on a go, the chain applies raw reader
items, unjudged. The pilot's precision figure is adjudicated and does not transfer; the
conductor's strike list (`:58-65`) is the only filter.

**Fold.** Restate §3 against the current file: go adds `wrong[]` and `diverged[]` as blocking
reader defects; no-go flips `rd-*` defects to `blocking: false`. Both branches fix the
`READER_RESULTS_SCHEMA` types (`:389-390` declare strings; the runner emits
`{ text, blockedBy }`). Re-estimate the no-go line as equal to the go line.

### M-4. The free floor needs a code path and a prompt rule, and it exceeds the build task's cap

**Location:** spec `:75-77`, `:182`, budget `:204`.

**Defect.** "Costs judges only" is not true. The catch packet builder allow-lists fields and
excludes candidates by design (`judge-packets.ts:10-13`, `:453`). The catch prompt has no
field rule for an unquoted candidate (`prompts/catch-judge.md:21-28`, `:65-84`), and the runner
refuses a batch whose job text is not byte-identical to the prompt file on disk
(`lib/runner.ts:546-549`, `:736-742`). The rescore therefore needs a candidate field in the
packet builder, a prompt rule, rebuilt packets for 18 planted runs (12 round 0, 6 round 1),
and new judge batches. The §1 build task already carries two deliverables (the field and the
comment carries), so this is a third, against the two-deliverable rule.

**Fold.** Make the floor's packet path an explicit deliverable. If B-1 resolves to option (a), it
merges into the `wrong[]` build (one packet change serves both). Otherwise give it its own small
task. Record which catch-judge prompt bytes the floor ran under, since the pilot's prompt will
differ.

### M-5. The profile frontmatter's path into the drafter prompt has no owner

**Location:** spec `:124-126`, `:135-136`, `:186-187`.

**Defect.** §4 says "the chain renders it into the drafter's dispatch prompt," but §3's scope
and acceptance do not include it. The workflow takes one verbatim profile string per invocation
(`docs-page-chain-v2.js:128`, `:419-420`, `:433-435`) and reuses it for every page and for the
register editor (`:552-554`). It cannot read a file itself (`:108-111`). Exemplars arrive as
`{ path, text }` per page (`:466-470`), so frontmatter exemplar ids also need resolving to text.
A drafting pass that batches pages for two audiences cannot pass two profiles today.

**Fold.** Put the rendering in §3: a per-page `profile` override (falling back to `args.profile`),
rendered by the conductor or the plan from the frontmatter, with the id-to-text exemplar
resolution in the same place. Add it to §3's dry-run acceptance, and pin the rendered shape with
a fixture, per the execution rule at `:186-187`.

## Minor

### m-1. The re-pin rationale is wrong; the version hold is right

**Location:** spec `:59-60`. The init baseline is keyed by CLI version and holds skills and
plugins only (`lib/transcript.ts:114-124`, `init-baseline.json`). A prompt change forces no
re-pin. **Fold:** "Hold the host CLI at its current version (2.1.282, already pinned) until the
pilot's runs finish, restoring `DISABLE_AUTOUPDATER` for the window; re-pin only if the version
moves." Pass 1b's close removed that setting, so the hold needs the explicit step.

### m-2. The precision baseline for the five pilot jobs is 1.4, not about 1.2

**Location:** spec `:87-88`. Round 1's `score.json` has 7 false findings, all from scripter's
one control run, over six verified control runs (7/6 ≈ 1.17). Without the evaluator (0), the
pilot's five jobs sit at 7/5 = 1.4 before `wrong[]` adds anything. With five control runs, the
1.5 mark allows 7 false findings in total, so one extra false finding decides condition 3. The
same scripter job swung from 1.5 to 7 between rounds (tuning record `:274`, `:279-282`). **Fold
(a conductor methodology call under B2, not a fork):** state the five-job baseline, and either
run two control runs per job or count only false findings whose subject group contains a
`wrong[]` (or candidate) item against a small absolute cap.

### m-3. `score.json` reports Clopper-Pearson, not Wilson

**Location:** spec `:81-82`, `:97-98`. `recallByPlantRun` emits `clopperPearson`
(`lib/score-catch.ts:214-219`, `:247`). For 12 of 16 that interval is 0.476 to 0.927 (probe), so
the record's cited source will not "clear one half." The Wilson figures in the spec check out
(12/16: 0.505 to 0.898; 11/16: 0.444 to 0.858). **Fold:** say the mark is the count; the record
cites the Wilson interval as computed separately and prints the scorer's exact interval beside
it.

### m-4. Breadth is not in `score.json`

**Location:** spec `:83-86`, `:97-98`. Development output emits per-job and pooled recall only
(`score.ts:394-420`, output at `:413-420`); per-plant `runsCaught` never leaves `runDev`. "At least 6 of the 8 plants
caught at least once" cannot be sourced from `score.json`. **Fold:** have `runDev` emit the
on-map tallies (plant id, job, `runsCaught`), a few lines in the M-2 change.

### m-5. A quoted `wrong[]` adds a verification failure point that costs a whole planted run

**Location:** spec `:48-50`, `:90`. Under R9, an unverified planted run is a miss for every plant
on it, and development precision drops an unverified control run. Round 1 verified 12 of 12, and
the runner reruns once, so the risk is modest. **Fold:** the plan budgets the reruns and the
record reports the unverified count per job.

### m-6. The pilot and build lines are low against 1b's measured unit costs

**Location:** spec `:203-204`. From 1b: 12 reader runs cost 0.42M counted (≈35k each); catch
judges ≈2.7k to 3.6k per job; the adjudicator ≈11.6k to 17k per job; the operator agent
0.28M to 0.36M per round (plan ledger rows 9-10). The pilot is 15 readers (≈0.53M), 10 catch
and 5 adjudicator jobs (≈0.1M), and an 18-job floor rescore (≈0.06M): about 0.7M before the
operator, about 1.0M with it, against 0.6M. The analogous 1b build (Task 1, schema fields and
verification) cost 0.89M by Agent figures with one fix round; this change's fan-out (M-1, M-2,
M-4) is wider, so 1.0M to 1.3M is the realistic range against 0.8M. Together that moves the go
total from 6.3M to about 7.0M, past the 5.6M flag. **Fold:** raise the two lines to 1.0M and
1.2M, or say in the budget that the flag is expected to trip at the pilot's close.

## Checked and sound

- The eight on-map plants and their per-job split match the spec (probe over the round 0 maps).
- The Wilson interval figures are correct.
- The development tally already counts multiple planted runs per job and treats an unverified
  counted run as a miss (`lib/score-catch.ts:78-82`), so two planted runs per job need no scorer
  change beyond M-2.
- The comment carries exist at the cited lines (`lib/runner.ts:731-734`,
  `lib/class-schema.ts:66-71`).
- The expected floor figure (3 catches plus 10 candidate-only misses, 13 of 24) matches the
  tuning record's audit (`:286-293`).
