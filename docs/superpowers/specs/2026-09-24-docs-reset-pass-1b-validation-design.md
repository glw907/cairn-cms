# Docs reset pass 1b: the validation redesign

**Date:** 2026-09-24. **Parent spec:** [`2026-09-23-docs-reset-design.md`](2026-09-23-docs-reset-design.md).
This spec replaces the parent's pass 1 items 8 ("Validation, the exit gate") and 9 ("Failure
rule"). Where the two disagree on validation, this spec wins.

**Owner rulings (Geoff, 2026-09-24).** The instrument is validated for fitness for pass 2a's two
uses, not for exhaustive detection. Plants go on a path map taken from frozen runs. Findings
exclude rule candidates. Gated runs are Opus 5.5 only. Geoff delegated the methodology calls to
evidence and the conductor ("I'm counting on you to provide a well-traveled and effective
path"), so each bar below names its source.

## What failed and why

Pass 1's validation (`docs/internal/record/2026-09-23-docs-reset-validation.md`) failed every
class. The record traces the failures to the validation's design:

- Every missed plant sat off the path its job took. The planter placed defects anywhere on a page;
  a reader does one job.
- 35 of 48 false positives came only from `ruleCandidates[]`, a field meant for the profile fold,
  and 8 were harness artifacts (no `.git`, a dropped `scripts/docs-readers/`, a denied `npx`).
- "Every plant caught in 2 of 3 runs" is fragile: an instrument with 90 percent per-run recall
  passes it on 17 plants about 60 percent of the time.
- Two failures are the instrument's own. All three extender runs followed
  `restrict-admin-access.md`, silently wrote the rule where the site actually had its file, and
  never reported the page's wrong path (F3). And a report carries one quote per page, so no run
  records which instructions it acted on.
- Sonnet 5 verified 8 of 13 runs, on report-format failures; Opus 5.5 verified 26 of 26.

## What the instrument is for

Pass 2a uses readers twice: as the v2 page chain's reader stage, whose findings drive the
redraft, and as the trial's measure of reader-confirmed defects remaining. Fitness for those uses
means three properties. **On-path sensitivity:** a reader doing a job reports the defects that
job runs into. **Precision:** most findings are real, since every finding costs an adjudication
and a redraft. **Stability:** repeat runs agree. Coverage of a whole page is the job set's
concern (pass 2a gives each page three or four jobs), not a single reader's.

A simulation (four trial pages, about six true defects each, three runs unioned per draft, the
trial's one-third rule) found the trial's decision nearly insensitive to per-run recall from 0.4
to 1.0: it keeps a truly one-third-better chain about 52 percent of the time and a no-difference
chain about 10 percent, even with a perfect instrument. Two consequences. Sensitivity matters for
the chain stage (one reader per job may run there) and against differential detectability
between chains, not for the trial's statistics. And the trial is underpowered; see "Finding for
pass 2a".

## Data split

**Development set:** pass 1's validation batch (its 17 plants, control runs, and scores), the
baseline record's failures, and the tuning half of pass A's defects. The conductor has read all of
it, so all tuning happens here and nowhere else.

**Test set:** fresh plants by a blind planter, placed on the frozen instrument's path maps, and
the held-out half of pass A's defects on the scripter's path. Nothing in the test set is seen
before the freeze.

## Sequence

1. **Tune** on the development set, at most two rounds.
2. **Freeze.** One commit fixes the reader instructions, the report schema, the harness, the
   scoring script, the adjudicator prompt, and this spec's bars. Nothing that affects a score
   changes after it.
3. **Map.** On the unmodified pages, each of the six pass 1 jobs runs three times on
   `claude-opus-5-5` and once on `claude-sonnet-5`. These runs build the path maps and are the
   control runs for precision. The scripter also runs three Opus times on pass A's pre-fix
   contract pages; those runs score the held-out defects against their own path map, reported
   only.
4. **Plant.** One blind `claude-opus-5-5` planter places four plants per job on its path map.
5. **Planted runs,** the same three Opus runs and one Sonnet run per job. The scripter's planted
   runs use the current contract pages.
6. **Score,** by script where mechanical and by the blind adjudicator where judged.

## Tuning scope

Tuning may change the reader's instructions, the report schema, and the harness. Three changes
follow from pass 1's evidence and are in scope from the start:

- **`steps[]`:** each instruction or statement the reader acted on, as a `page:line` quote the
  runner verifies like any other quote. It is what the path map is built from.
- **`diverged[]`:** each place the reader did something other than what a page said, including a
  workaround that succeeded. F3 is the case this catches.
- **The repository export** becomes a `git init` checkout with one commit. Paths still absent by
  design are listed in the class file, and a finding whose subject is one of them is a harness
  report (see Scoring).

Tuning may not name a page, a defect, a job-specific fact, or any development-set item. The
`diff-reviewer` checks every tuning change against that rule. A tuning round is scored on the
development set with the test-set scoring script, and a change is kept only if it raises
development recall without dropping development precision.

## Scoring

- **Verified run.** A run counts only when its final attempt passes the runner's verification.
  An unverified run is rerun once. A gated run still unverified after that counts as catching
  nothing and contributes no findings.
- **Catch and finding use the same fields:** `stalls[]`, `assumed[]`, `checks[]`, and
  `diverged[]`. `ruleCandidates[]` counts as neither, which costs recall (pass 1 caught several
  plants only there). Counting candidates as catches but not as false positives would inflate
  both measures in the instrument's favor, so it is rejected.
- **A catch** names the plant's specific subject, as pass 1's ruling 5 defines it.
- **A finding** claims a page is wrong, contradictory, or silent on something the job needed.
  Counted once per run per subject.
- **A harness report** is a finding whose subject is a path the class file lists as absent by
  design, or a command the allowlist denies. It is excluded mechanically before adjudication.
- **Real defect,** unchanged from pass 1's record: the page states something false or
  self-contradictory against the code, or omits a fact the job needs that no published page
  supplies. A false positive is a finding answered elsewhere in the published docs, wrong, asking
  for a fact that does not exist, or a harness artifact the rule missed.
- **Path map.** For each job, a page section (the span under one `##` or `###` heading) is
  on-path when at least two of the three Opus mapping runs have a verified `steps[]` quote inside
  it. Built by script from the mapping reports.
- **The adjudicator** is one `claude-opus-5-5` read at `high` that sees the page, the finding, and
  the code, and never a reader prompt or job text. It rules every finding from the control runs.
  Precision is judged on control runs only, since planted pages are not real pages.

## Bars

The gate reads verified Opus runs only.

| Bar | Pass condition | Source |
| --- | --- | --- |
| Sensitivity, instrument-wide | Pooled recall over every plant-run pair (24 plants, 3 runs, 72 pairs) at least 80 percent, and the 95 percent Clopper-Pearson lower bound at least 60 percent | 80 percent is the common mutation-testing adequacy bar; about 60 percent is the best case for formal inspections (capture-recapture literature) |
| Sensitivity, per class | Each class's pooled recall at least 60 percent | The inspection best case, as a floor no class may fall under |
| Precision, per class | At least two thirds of adjudicated control-run findings real | Judgment, sized to adjudication cost. The inspection literature does not measure false positives, so no published norm exists |
| Adjudicator agreement | A second independent `claude-opus-5-5` read at `xhigh` re-rules 30 findings drawn at random (all, if fewer); agreement at least 85 percent | The LLM-as-judge validation norm of 85 to 90 percent agreement before automated use |

Disagreements in the agreement sample go to one `fable` read, whose ruling stands. Agreement
below 85 percent fails the precision bar, since precision rests on the adjudicator.

**Reported, gating nothing:** per-class confidence intervals; recall on the known on-path real
defects beside plant recall (planted defects are easier to find than real ones, so a large gap is
the seeding bias, named as such); the scripter's recall on on-path held-out defects; per-run
recall and finding overlap (three runs are too few for a per-run floor: usability studies need
five to twelve evaluators for about 80 percent coverage); Sonnet's run per job, verified share
and recall; off-path detection; and `ruleCandidates[]` precision.

## Planting

The planter is one `claude-opus-5-5` agent at `high`. It gets the pages, each job's path map as
section spans only, the plant types, and read access to the code for proofs. It never sees a job
text, a reader prompt, a report, or the development set's plants. Each job gets four plants,
one each of a removed step, an undefined term, a wrong flag or name, and a stale path, where the
class can reveal that type; a type the class cannot reveal is replaced by a second of another type,
recorded. Every plant sits inside an on-path section, avoids the lines of known real defects, and
carries its proof, in the pass 1 record's format. The record lives under `docs/internal/record/`
and is excluded from every reader export.

## Failure rule

There is no fix round after the freeze; a change tuned after seeing test scores is post-hoc by
construction. If a bar fails, pass 1b stops, records the result and its cause, and Geoff chooses:
pass 2a proceeds with readers as an advisory chain stage and a trial measure other than
reader-confirmed defects, or a further redesign.

## Finding for pass 2a

The trial as specified is underpowered: with four pages, a perfect instrument keeps a truly
one-third-better chain about half the time. Pass 2a must resize the trial (more pages, more jobs
per page, or a paired per-defect design) or restate its decision rule before it runs. Sonnet's
reported results from pass 1b decide whether the trial's reader runs keep a Sonnet share.

## Budget

Pass 1's validation counted about 37k tokens per reader run. Pass 1b runs about 100: two tuning
rounds of about 24 development runs each, 27 mapping runs, and 24 planted runs. That is about
3.7M, before the implementer tasks, the planter, and scoring. Ceiling 6M, flag at 4.8M.

## Evidence

- Fault seeding and its bias toward easy seeded defects: Mills (1972); Petersson, Thelin,
  Runeson, and Wohlin, "Capture-recapture in software inspections after 10 years research",
  *Journal of Systems and Software* (2004).
- Mutation adequacy in practice: Petrović and Ivanković, "An Industrial Application of Mutation
  Testing", ICST 2018.
- Evaluators needed for coverage: Nielsen and Landauer (1993); Virzi (1992); Faulkner (2003);
  Hwang and Salvendy, "Number of people required for usability evaluation", *CACM* (2010).
- Judge validation: "A Survey on LLM-as-a-Judge", arXiv 2411.15594; practitioner agreement norms
  of 85 to 90 percent (Arize, 2025).
- Interval sizing: Clopper-Pearson exact binomial intervals.
- The simulation: scratch script, reproduced in the plan's Task 0 record.
