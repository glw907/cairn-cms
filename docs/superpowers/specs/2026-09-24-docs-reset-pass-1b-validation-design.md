# Docs reset pass 1b: the validation redesign

**Date:** 2026-09-24. **Parent spec:** [`2026-09-23-docs-reset-design.md`](2026-09-23-docs-reset-design.md).
This spec replaces the parent's pass 1 items 8 ("Validation, the exit gate") and 9 ("Failure
rule"), and it changes pass 2a item 5 as "Finding for pass 2a" states. The parent's "Amendments
from pass 1b" section records both. Where the two disagree on validation, this spec wins.

**Owner rulings (Geoff, 2026-09-24).** The instrument is validated for fitness for pass 2a's two
uses, not for exhaustive detection. Plants go on a path map taken from frozen runs. Findings
exclude rule candidates. Gated runs are Opus 5.5 only. The ceiling is 10M, flag at 8M (O1). A
`fable` read validates the adjudicator on a sample of findings and catch calls, with no human
labelling (O2). One fresh transfer job per class is reported, never gated (O3). The outcome is
per class, with no fix round after the freeze (O4). Geoff delegated the methodology to the
conductor; the conductor's rulings (C1 to C15 at the first fold, V1 to V4 at the second) and the
disposition of every review finding are in
[`2026-09-24-pass-1b-spec-fold.md`](../research/2026-09-24-pass-1b-spec-fold.md).

## What failed and why

Pass 1's validation (`docs/internal/record/2026-09-23-docs-reset-validation.md`) failed every
class. The record traces the failures to the validation's design:

- The record traces the misses it examined to runs that never reached the planted section. The
  planter placed defects anywhere on a page; a reader does one job.
- 35 of 48 false positives came only from `ruleCandidates[]`, a field meant for the profile fold,
  and 8 were harness artifacts (no `.git`, a dropped `scripts/docs-readers/`, a denied `npx`).
  The two groups overlap.
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
means three properties. **On-path sensitivity:** a reader doing a job reports the defects that job
runs into. **Precision:** few findings are false, since every finding costs an adjudication and a
redraft. Both are gated. **Stability:** repeat runs agree, since the chain may run one reader per
job. It is reported, not gated, because no floor on this sample separates a good instrument from a
bad one (see "Stability" under Bars). Coverage of a whole page is the job set's concern (pass 2a
gives each page three or four jobs), not a single reader's.

## Data split

- **Development set:** pass 1's validation batch (its 17 plants, control runs, and scores), the
  baseline record's failures (F1 to F6, R1 to R4), and all 19 of pass A's defects. The conductor
  has read all of it, so all tuning happens here and nowhere else.
- **Held-out, contaminated:** pass A's split put 9 defects in the held-out half (D01 D03 D06 D08
  D09 D10 D12 D16 D18) and 10 in tuning (D02 D04 D05 D07 D11 D13 D14 D15 D17 D19). Pass 1 ran and
  scored the held-out half, and its record names each subject and every near miss, so it is not
  blind. It is reported only, as a comparison against pass 1's 1 of 9, and labeled contaminated.
- **Test set:** 42 fresh plants, seven per job, on the six development jobs, placed by an
  isolated planter on the frozen instrument's path maps after the freeze. Precision on these jobs
  is measured on control runs of pages the conductor has adjudicated before, so it is in-sample,
  and the record says so.
- **Transfer set:** one fresh job per class (four jobs) on pages no development job read, mapped
  and planted the same way. It measures transfer to unseen pages and audiences, including
  out-of-sample precision, and is reported only (O3). Its planting and planted runs are a budget
  cut (see Budget); its mapping runs are not.

## Sequence

0. **Rescore.** Pass 1's saved reports are rescored offline under this spec's scoring rules. This
   is tuning round 0's reference. Before the rescore, the agent that drafts the catch judge's
   rubric also writes a catch criterion and a near miss for each of pass 1's 17 plants, from the
   development plant record, which tuning may read.
1. **Tune** on the development set, at most two run rounds (see Tuning).
2. **Write the transfer jobs.** A fresh `claude-opus-5-5` agent that has not read the development
   set's plants or records writes the four transfer job texts, each with an arrival state and a
   done signal, on pages no pass 1 or tuning run read. The texts enter the freeze.
3. **Freeze** (see Freeze). Nothing that affects a score changes after it.
4. **Map.** On the unmodified pages at the pinned commit, each of the six development jobs and
   the four transfer jobs runs three times on `claude-opus-5-5`. These runs build the path maps
   and are the control runs for precision. The scripter also runs three Opus times on pass A's
   pre-fix contract pages for the held-out report.
5. **Mine.** The miner lists candidate historical reverts against the committed path maps (see
   Planting, "Source").
6. **Plant.** The planter places seven plants per job on its path map (see Planting). A script and
   one blind read validate every plant; an invalid plant is replaced before any planted run.
7. **Planted runs:** three Opus runs per job, development and transfer, plus one
   `claude-sonnet-5` run per development job for the reported Sonnet arm.
8. **Score,** by script where mechanical, by the catch judge on planted runs, and by the
   adjudicator on control runs, then the agreement read.

## Tuning

Tuning may change the reader's instructions, the report schema, and the harness. Three changes
fix instrument defects pass 1 found and are adopted without the keep rule, since they fix the
instrument rather than raise a score:

- **`steps[]`:** each instruction the reader executed or statement it relied on for a decision,
  with the decision named, as a `page:line` quote the runner verifies like any other quote. It is
  what the path map is built from.
- **`diverged[]`:** each place the reader did something other than what a page said, including a
  workaround that succeeded, with the page quote, what the reader did instead, and why. F3 is the
  case this catches.
- **The git export** (see The export).

The report schema also gains a structured `blockedBy` field on `stalls[]`, `assumed[]`, and
`diverged[]` entries: the denied command or the absent path that blocked the reader, or null.

**Rounds.** Round 1 runs the three adopted changes and sets the new reference. Round 2, if run,
tests one bundle of further changes against round 1. Each round runs every development job once
planted (pass 1's plants, at `planted/<job>/`) and once on control pages, on `claude-opus-5-5`: 12
runs. Development recall counts only the development plants inside the job's development path
map. Pass 1 had no `steps[]`, so the map is a proxy built from pass 1's control-run quotes: a
section (as Path map defines it) is on a job's proxy map when any verified Opus control run of
that job in pass 1 has a verified quote inside it, in any report field. Any quote suffices,
because pass 1 carried about one quote per page and two-of-three cannot apply to two sparse runs.
The record states the map as a proxy and gives each job's on-map plant count before round 1;
off-map development plants are reported only. If round 1 leaves fewer than two on-map plants
missed, the keep rule cannot fire and round 2 is not run. Development precision is the
false-finding count per control run. The catch judge and the adjudicator rule both, using
prompts drafted before round 0; they are not tuning levers, and a defect found in either during
tuning is fixed and every round rescored.

**Keep rule.** A round 2 bundle is kept only if it raises on-map development catches by at least
two over round 1 and does not raise false findings per control run by more than 0.5. A result
inside that band is noise, and the simpler instruction set wins.

**Bans.** No tuning change may name a page, a defect, a job fact, or any development-set item,
held-out defects included. The absent lists and the allowlists are not tuning levers. The
`diff-reviewer` checks every tuning change against these rules.

## Freeze

One commit, tagged `docs-reset-1b-freeze`, carries a manifest of sha256 hashes over every
score-affecting input:

- the reader prompt and report schema, the class files, the batch and job files (with each job's
  absent list), and the transfer job texts;
- the planter and miner prompts, the miner's exclusion script, and the plant-type definitions,
  the catch judge's and the adjudicator's prompts
  and rubrics, and the scoring, path-map, and operating-characteristic scripts;
- the container image digest, the Claude Code CLI version, and the model ids as the API resolves
  them;
- the pinned page commit for every job, the scripter's current pages included (never `HEAD`), and
  the held-out pre-fix pins (`cli-cairn-json-output.md` and `cli-cairn-exit-codes.md` at
  `29a03eff`, `cli-cairn-doctor.md` at `3453668f`);
- every seed.

The runner refuses a gated batch when any frozen input differs from the manifest and stamps the
tag and manifest hash into every report. The scorer rejects an unstamped report. The close's
`diff-reviewer` confirms no frozen path changed after the tag. Any instrument change after the
freeze, including a fix for a crash or a broken export, burns the plants: a new planter plants,
and every mapping and planted run reruns.

**Reruns are the runner's alone.** An unverified, crashed, or timed-out run, or one with no
report, gets exactly one automatic rerun. Every attempt stays in the results, the scorer reads the
final attempt, and the record lists each rerun and its cause. A gated planted run still failing
after its rerun catches nothing. A gated control run still failing counts every finding it made
as false.

## The export

- Git is installed in the reader image.
- Every repository-class tree, the scripter's contract bundle included, gets one synthetic commit
  made after any planted overlay, separately in each prepared tree, under a pinned neutral author
  and committer identity. Preparation asserts exactly one commit and a clean `git status`. The
  preparation code's `.git` exclusion becomes this check.
- File mtimes are normalized to one fixed timestamp.
- `docs/HISTORY.md`, `docs/STATUS.md`, and `ROADMAP.md` join the repository export's excluded
  paths for gated batches and for the planter's export, since each tells a reader that plants
  exist.
- Preparation builds control-only trees for the mapping runs. Development plants stay at
  `planted/<job>/`; test and transfer plants go to a new root, never that path.
- Each job's **absent list** (the paths absent by design from its prepared tree) is derived from
  its builder's exclusions and recorded in the batch or job file, not the class file.

## Path map

- **Sections** are the spans under H2 and H3 headings. A quote belongs to its innermost heading,
  so an H2's own section ends at its first H3. The lines between the H1 and the first H2 form
  their own lead section. Headings inside fenced blocks are skipped. Sections are identified by
  heading text, and the planter may not edit a heading.
- A `steps[]` quote is assigned by its verified line span. A span that crosses a heading counts
  for neither section.
- A section is **on-path** for a job when at least two of its three verified Opus mapping runs
  have a `steps[]` quote inside it. With two verified runs, both must; with one, it alone decides,
  and the record says so.
- **Ceiling.** The map's on-path share of the job's page lines is reported per job. A map above
  60 percent is too loose; that job's plants then go only on sections quoted by all three runs,
  and, where that still exceeds the ceiling, within 40 lines of a line two runs quoted.
- **Thin map.** When a map cannot hold seven plants under Planting's spacing rules, it widens to
  sections quoted by at least one run, recorded per job. If it still cannot, the job gets fewer
  plants.
- **The ceiling wins.** The thin-map widening never takes a map past the 60 percent ceiling; it
  stops where the next section would cross it, and a map the ceiling narrowed is never widened
  again. A job short of plants under the ceiling takes fewer plants. A loose map lets the
  instrument call a plant on-path when no run would reach it, which is pass 1's failure mode, and
  the 42-plant design tolerates a shortfall (below).
- **Recomputed thresholds.** When any job gets fewer plants, the operating-characteristic script
  recomputes every sensitivity threshold at the achieved counts before any planted run, under the
  rules the full design meets, across the same ICC range (0.25 to 0.95):
  - The pooled threshold is the smallest one at which a true recall of 0.6 passes with
    probability at most 0.1 and 0.8 passes with probability at least 0.8, at every ICC in the
    range. The recall-0.8 pass probability is recorded beside it. From 35 to 42 plants a threshold
    exists at every count (26 at 35, 27 at 36, 31 at 42). Below 35 it exists only at 32 and 33.
  - Each class floor is the largest count that a class at true recall 0.8 reaches with
    probability at least 0.9 at every ICC in the range, computed at the class's achieved plant
    count (4 of 7 and 9 of 14 at full count; 4 of 6, 3 of 5, 9 of 13, and 8 of 12 on the way
    down). A class left with one plant has no floor that meets the rule.
  - Where no threshold meets its rule, that bar is reported, not gated, and the record says so.
    For a class floor, that class's sensitivity floor is reported. For the pooled bar, which every
    class shares, sensitivity then gates no class.
- Each map is committed, with its hash, before planting starts.

## Planting

The planter is one `claude-opus-5-5` agent at `high`. It works from the repository export, which
drops the records and has no history, plus the path maps and the miner's filtered list, and never
sees a job text, a reader prompt, a report, the development set's plants, or the plant-type mix a
tuner saw. It gets the line spans of every mapping-run finding, unadjudicated, as lines to avoid.

- **Seven plants per job.** At least four are semantic: a false claim about behavior, a
  contradiction, or a wrong precondition or ordering. The rest are token types: a removed step,
  an undefined term, a wrong flag or name, or a stale path. A stale-path plant never targets a
  path on the job's absent list.
- **Source.** The preferred plant reintroduces a real historical defect: the pre-fix text of a
  docs-fix commit, where that text lands in an on-path section and still applies to the current
  page. The planter synthesizes a plant otherwise. The record marks each plant's source.
- **The miner.** A separate `claude-opus-5-5` agent at `high` finds the historical candidates,
  after the maps are committed and before planting. It has the full git history and the committed
  path maps, and never a reader prompt, a job text, a report, or a development-set record. It
  lists candidate reverts: commit, hunk, target section on the path map, and whether the pre-fix
  text still applies to the current page. A script then drops every commit cited in pass 1's
  records or in pass A's plan and ground truth (`0e7f4eb9`), and every hunk whose page and line
  span overlaps the recorded location of any development-set item (D01 to D19, P01 to P17, F1 to
  F6, R1 to R4), with line spans carried to a common commit before comparison. The planter chooses from the filtered list and never mines itself.
- **Spacing.** At most two plants per section, none within ten lines of another, spread across
  sections; a multi-page job carries at most four plants per page. Seven plants therefore need at
  least four on-path sections.
- **Record.** Per plant: page and line, type, source, original and planted text, the proof
  against the code, a **catch criterion**, and one **near-miss example** that does not count. The
  test record lives under `docs/internal/record/`, is excluded from every reader export, and is
  committed with its hash in the planted batch's manifest before any planted run. Criteria for
  the held-out defects are written the same way before their runs; criteria for the development
  plants are written before round 0 (Sequence, step 0).
- **Validity check.** A script confirms each plant sits inside an on-path section and differs
  from the control page at its line. One blind read verifies each proof against the code and
  confirms the plant shares no subject with any development-set item (D01 to D19, P01 to P17, F1
  to F6, R1 to R4), a judgment no script can make. A failing plant is replaced before any planted
  run. No plant is dropped after the planted runs start.

## Scoring

- **Catch and finding fields** are `stalls[]`, `assumed[]`, and `diverged[]`. `checks[]` is empty
  today (the runner hard-codes it); it counts only if tuning populates it. `ruleCandidates[]`
  counts as neither, which costs recall (pass 1 caught several plants only there). Counting
  candidates as catches but not as false positives would inflate both measures in the
  instrument's favor, so it is rejected.
- **The catch judge** is one `claude-opus-5-5` read at `high` per planted run. It sees the plant
  record's entries (subject, criterion, near miss), the planted page, the job text, and the run's
  catch fields, never the model, the run id, or the reader prompt. It rules each plant caught or
  missed. A catch meets the plant's criterion and also qualifies as a finding: it claims the page
  is wrong, contradictory, or silent on something the job needed there. An item that merely names
  or uses the subject is a miss.
- **The adjudicator** is one `claude-opus-5-5` read at `high` per control run. It sees the page,
  the full published docs tree at the pinned commit, the code, and the job text, never the reader
  prompt, the model, or the run id. Under a frozen rubric it first classifies each catch-field
  item as a finding, an interpretation choice the job left open, or not a claim, then groups the
  run's findings by subject (same page and same claimed fact), then rules each subject real,
  false, or harness. A `diverged[]` item is a finding when its stated reason is that the page was
  wrong or silent.
- **Real defect,** unchanged from pass 1's record: the page states something false or
  self-contradictory against the code, or omits a fact the job needs that no published page
  supplies. A false finding is one answered elsewhere in the published docs, wrong, or asking
  for a fact that does not exist.
- **Harness items** are excluded from both counts. The filter excludes an item mechanically when
  its `blockedBy` matches the job's absent list or the run's denials, under one rule. A path
  matches when, normalized to repository-relative form, it equals an absent-list path or lies
  under an absent-list directory. A command matches when its first word and first argument equal
  those of a command in the run's denial record (the denied Bash call's command, parsed from the
  record's JSON excerpt). The adjudicator rules "harness" for any the filter missed. Every
  excluded item is listed in the record. The exclusion never applies to catch scoring.
- **Pools.** Gated precision reads the development jobs' verified Opus mapping runs only (three
  per job), never the tuning rounds' control runs, which are development precision. Planted pages
  are not real pages, so planted runs score catches only.

## Bars

The gate reads verified Opus runs on the development jobs only. The thresholds come from the
operating characteristic below, not from the literature.

| Bar | Pass condition | Scope |
| --- | --- | --- |
| Sensitivity | A plant counts as caught when at least two of its three runs catch it; at least 31 of the 42 plants caught | Instrument-wide |
| Sensitivity floor | At least 4 of 7 plants for a one-job class (docs-only, docs-and-binary); at least 9 of 14 for a two-job class (docs-and-site, repository) | Per class |
| Precision | False findings summed over the class's verified Opus mapping runs at most one per run (3 for a one-job class, 6 for a two-job class) | Per class |
| Adjudicator agreement | On the O2 sample, pooled Cohen's kappa at least 0.6, or pooled raw agreement at least 85 percent where kappa cannot be computed (see below) | Instrument-wide |

Stability is reported, not gated (see "Stability" below).

**The operating characteristic.** Plants are scored with their three runs clustered: each plant
has its own per-run catch probability, drawn from a beta distribution whose mean is the
instrument's true on-path recall and whose intraclass correlation (ICC) is estimated from pass 1.
The fit uses this spec's counting rule, so a catch made only in `ruleCandidates[]` counts as a
miss. Recounted that way from the pass 1 record's Bar 1 table, pass 1's two Opus runs per plant
caught 4 plants in both, 2 in one, and 11 in neither. The beta-binomial maximum-likelihood fit
gives a mean of 0.29 and an ICC of 0.72, with a profile 95 percent interval of 0.25 to 0.95. (The
fit that counted rule candidates, 9, 2, and 6, gave 0.59 and 0.76, interval 0.35 to 0.95.) The
mean describes whole-page plants and does not carry over; the ICC range does. Pass 1's ICC also
carries the shared off-path misses the path map removes, so the on-path ICC may sit lower, which
is why the design must hold across the whole interval. Plants are treated as independent given
the instrument. Pass 1's data cannot estimate a within-run effect across a job's plants, so the
ICC range is the stated sensitivity check. Probabilities are exact beta-binomial sums.

| True recall | Pass probability, 31 of 42, ICC 0.25 | ICC 0.5 | ICC 0.72 | ICC 0.95 |
| --- | --- | --- | --- | --- |
| 0.6 | 0.08 | 0.06 | 0.05 | 0.05 |
| 0.7 | 0.58 | 0.44 | 0.38 | 0.36 |
| 0.8 | 0.98 | 0.93 | 0.90 | 0.88 |
| 0.9 | 1.00 | 1.00 | 1.00 | 1.00 |

The rule the thresholds meet: at every ICC from 0.25 to 0.95, an instrument with true on-path
recall 0.8 passes with probability at least 0.8, and one at 0.6 passes with probability at most
0.1. The recall-0.6 pass probability peaks at the low end of the range and the recall-0.8 one
bottoms at the high end, so the endpoints bind. At 36 plants, 27 of 36 also meets the rule
(0.08 at recall 0.6 and ICC 0.25; 0.83 at recall 0.8 and ICC 0.95), but no threshold meets it at
34 plants or at 31 and below, so a job losing two plants would leave sensitivity ungated. At 42
plants a threshold exists at every achieved count from 35 up (Path map, "Recomputed thresholds"),
and the lowest chance, across the range, that a recall-0.8 instrument clears the pooled bar and
all four class floors rises from 0.67 to 0.81. So the count is 42, seven per job, threshold 31.
The seventh plant adds no run; its costs are one more on-path section per job under the spacing
rules and one more plant that an early stall can mask.

**Per-class floors are tripwires.** A class's own plants cannot separate 0.8 from 0.6. Each floor
is the largest count a class at true recall 0.8 reaches with probability at least 0.9 at every ICC
in the range: 4 of 7 fails such a class at most 3 percent of the time and 9 of 14 at most 4
percent, while a class at 0.6 still passes them 71 to 75 and 49 to 55 percent of the time. The
discriminating evidence is the pooled bar, and one reader instruction set serves every class, so
an instrument-wide failure fails every class. At true recall 0.8, a given class clears both
sensitivity bars with probability 0.86 to 0.97 across the ICC range, and all four together 0.81
to 0.93. At 0.6, all four together pass at most 0.06.

**Stability** is reported, not gated. Fleiss' kappa over the 42-plant by three-run catch matrix
is computed and reported instrument-wide and per class, beside the pass rates a floor of 0.35
would have had. Simulated at true recall 0.8 (5,000 draws, seed 20260924), kappa clears 0.35 with
probability 1.00 at ICC 0.95, 0.99 at 0.72, 0.85 at 0.5, 0.47 at 0.35, 0.19 at 0.25, and 0.09 at
0.2. No floor serves as a gate: a floor low enough that a recall-0.8 instrument at ICC 0.25 passes
with probability 0.8 (kappa about 0.13) also passes one at ICC 0.2 with probability 0.66 and one at
0.1 with 0.32. Runs that agree barely beyond chance would pass. On-path sensitivity already
requires two of three runs per plant, so an unstable instrument pays for it in the pooled bar.

**Precision** is set from pass 1's data. Counted over stalls and `assumed[]` only, pass 1's verified
control runs carried 13 false positives over 16 runs, about 0.8 per run, with harness artifacts
the new export removes still in the count. The bar holds each class to about that rate. It cannot
pass vacuously: a silent reader passes it and fails sensitivity.

**Adjudicator agreement (O2).** One `fable` read re-rules 30 items: 15 control-run findings
(labels real, false, harness) and 15 catch calls (caught, missed), from verified Opus gated runs,
each stratum balanced by the primary ruling where the pool allows. Items are ordered by
`sha256("docs-reset-1b-agreement" + item id)` and taken from the top. Agreement is computed before
any Fable ruling replaces a primary one. The gate pools the two strata; each stratum's kappa or
raw agreement is reported. The pooled kappa averages the strata's observed and chance agreement,
weighted by size, and then applies Cohen's formula. It never computes chance agreement over the
union of the two label sets, which would inflate kappa, since no item can be mislabeled across
strata. Kappa applies when, in each stratum, each rater's labels include at least five items
outside the largest category. Otherwise the gate is pooled raw agreement at 85 percent, and the
record gives the reason. Fable's ruling stands on every disagreement. An agreement failure fails
every class, since every judged count rests on the two judges.

**The simulation's code path.** `scripts/docs-readers/oc-curve.ts`, seed 20260924, reproduces the
pass 1 refit, the sensitivity table, the floors, the stability figures, and the recomputed
thresholds at any achieved plant count. The plan commits it before the freeze; it is specified
here, not built.

**Reported, gating nothing:**

- per-class plant recall with exact intervals, per-run recall, and recall by plant source
  (historical or synthesized), by type (semantic or token), by position along the path, and after
  a prior stall;
- each plant's line distance to the nearest mapping-run step, and each job's on-path share;
- stability: Fleiss' kappa instrument-wide and per class, beside the simulated pass rates of a
  0.35 floor;
- precision as a share beside the false-finding count, catch-field items per
  run that are not findings, and `ruleCandidates[]` precision;
- fix confirmation: a control-run finding at a plant's site, a false alarm on corrected text;
- recall on the known on-path real defects, labeled development-contaminated, beside the real
  defects the adjudicator confirms in the mapping runs and how many the planted runs found again
  on unplanted sections;
- the held-out scripter runs' recall on all nine held-out defects, labeled contaminated, against
  pass 1's 1 of 9;
- the transfer set's sensitivity, stability, false findings per run, and precision, scored under
  the same rules;
- the Sonnet arm: verified share and per-run recall on the 42 test plants.

## Failure rule

The outcome is per class (O4). A class is validated when the instrument-wide sensitivity and
agreement bars pass and its own sensitivity floor and precision bar pass. Stability is reported
and validates or fails no class. A
validated class's readers go to pass 2a as validated. A failing class's readers run in pass 2a as
advisory only, and the record states the cause per class. There is no fix round after the freeze;
a change tuned after seeing test scores is post-hoc by construction.

## What the parent's validation becomes

- **The standing regression floor.** The frozen test batch, its plants, and its scoring become the
  regression floor that parent item 8 called for. A later change to the reader instructions reruns
  it and reports against pass 1b's scores.
- **The baseline failures** move from a gate to a report. They are development items the
  instrument was tuned against, so a gate on them would measure the tuning.

## Finding for pass 2a

- **The trial is underpowered.** A simulation of the parent's trial (three pages, defects per final
  draft Poisson with mean 6 for the minimal chain and 4 for a truly one-third-better full chain,
  two final drafts per chain per page, three reader runs unioned per draft, the one-third rule,
  per-run recall 0.4 to 0.99, independent runs or ICC 0.76) keeps a truly one-third-better chain
  about 52 percent of the time and a no-difference chain 5 to 14 percent. "At least a third fewer"
  is read as the full chain's count at most two thirds of the minimal chain's; a strict "fewer
  than two thirds" gives 4 to 12 percent. The 52 percent follows by construction, since the
  simulated effect sits exactly on the decision threshold; a full chain that truly halves the
  defects (mean 3) is kept 78 to 86 percent of the time. Per-run recall barely moves any of these
  figures. Pass 2a must resize the trial (more pages, more jobs per page, or a paired
  per-defect design) or restate its decision rule before it runs.
- **The trial measures a chain with the reader it redrafted against.** Defects in the reader's
  blind spots are invisible to both. Pass 2a's measuring runs use jobs disjoint from the jobs the
  chain's reader stage ran on each page, or add an independent measure.
- **The Sonnet share** in the trial's reader runs is kept only if Sonnet verifies at least 5 of
  its 6 planted runs and its per-run recall on the 42 test plants is within 10 points of Opus's.
  Otherwise the trial's reader runs are Opus only.
- **The labeled defect set** for the grader comparison is pass 1b's test plants only. Pass 1's
  plants and pass A's defects are development items the reader was tuned on.

## Budget

Ceiling 10M, flag at 8M (O1). Counted tokens are input, output, and cache creation; cache reads
are reported separately, as in pass 1.

| Item | Basis | Estimate |
| --- | --- | --- |
| Round 0 rescore | catch judge and adjudicator over pass 1's saved runs | 0.4M to 0.6M |
| Tuning rounds 1 and 2 | 24 runs at 45k | 1.08M |
| Mapping, development and transfer | 30 runs at 45k | 1.35M |
| Held-out scripter runs | 3 runs at 45k | 0.14M |
| Planted runs, Opus and Sonnet | 24 development plus 12 transfer at 45k | 1.62M |
| Catch judge | 51 planted runs at about 12k | 0.61M |
| Adjudicator | 42 control runs at about 20k | 0.84M |
| Agreement read (`fable`) | one read over 30 items | 0.15M |
| Miner, planter, plant check, transfer job author | 42 test plants plus 28 transfer plants | 1.05M |
| Implementer tasks | three (report schema; export and preparation; scoring, path map, freeze enforcement) at 0.8M to 1.3M | 2.4M to 3.9M |
| Total before cuts | | 9.6M to 11.3M, mid about 10.5M |

The 45k per planned run is pass 1's measured cost per final run, reruns included. The judge
figures are estimates; pass 1 has no measured equivalent. The implementer figures are pass 1's
subagent totals, which include cache reads, so they overstate under the counting rule.

**Cuts.** The cuts fire whenever spend reaches the 8M flag, before or after the freeze. When it
trips, every cut still available is taken, in this order, and the record lists each:

1. Tuning round 2, if it has not run (about 0.73M with its judging).
2. The Sonnet planted arm, or its remaining runs (about 0.34M with judging). The trial's reader
   runs are then Opus only.
3. The transfer jobs' planting and planted runs, whatever remains (about 0.68M with judging).
   Under O3 the transfer set gates nothing, so this cut loses no gate; its mapping runs still
   report out-of-sample precision.

At the mid estimate, spend before the freeze is about 5.3M (implementers, round 0, both tuning
rounds, and the transfer job author), so round 2 runs. The flag trips during mapping, mining, or
planting, before any planted run, and cuts 2 and 3 fire. The total after cuts is about 9.5M at the
mid estimate, with a range of 8.6M to 10.3M. The high end exceeds the ceiling; the owner rules on
it at the plan gate.

## Evidence

- Fault seeding and its bias toward easy seeded defects: Mills (1972); Petersson, Thelin,
  Runeson, and Wohlin, "Capture-recapture in software inspections after 10 years research",
  *Journal of Systems and Software* 72(2) (2004).
- Historical-fix defects as a stronger proxy than seeded ones: Just, Jalali, and Ernst,
  "Defects4J", ISSTA 2014.
- Context for the recall targets, not their basis: an 80 percent mutation score is a
  practitioner and tool convention (PIT, Stryker), not a finding of Petrović, Ivanković, Kurtz,
  Ammann, and Just, "An Industrial Application of Mutation Testing", ICSTW 2018 (Mutation
  workshop). Formal inspections average about 60 percent defect removal in the
  inspection-effectiveness literature (Fagan; Capers Jones).
- Clustered binary data and the design effect: Kish, *Survey Sampling* (1965). Acceptance
  sampling's producer's and consumer's risks: ISO 2859-1.
- Agreement: Cohen (1960); Fleiss, "Measuring nominal scale agreement among many raters",
  *Psychological Bulletin* (1971); Landis and Koch (1977) for the 0.6 boundary; Feinstein and
  Cicchetti, "High agreement but low kappa" (1990). LLM-as-judge validation: "A Survey on
  LLM-as-a-Judge", arXiv 2411.15594; practitioner guidance of 85 to 90 percent agreement (Arize,
  2025).
- Preregistration: Nosek, Ebersole, DeHaven, and Mellor, "The preregistration revolution", *PNAS*
  (2018).
