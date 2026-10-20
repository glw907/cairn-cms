# Docs reset pass 1b: the validation redesign

**Date:** 2026-09-24. **Parent spec:** [`2026-09-23-docs-reset-design.md`](2026-09-23-docs-reset-design.md).
This spec replaces the parent's pass 1 items 8 ("Validation, the exit gate") and 9 ("Failure
rule"), and it changes pass 2a item 5 as "Finding for pass 2a" states. The parent's "Amendments
from pass 1b" section records both. Where the two disagree on validation, this spec wins.

**Owner rulings (Geoff, 2026-09-24).** The instrument is validated for fitness for pass 2a's two
uses, not for exhaustive detection. Plants go on a path map taken from frozen runs. Findings
exclude rule candidates. Gated runs are Opus 5.5 only. A `fable` read validates the judges on a
sample of findings and catch calls, with no human labelling (O2). The outcome is per class, with
no fix round after the freeze (O4). If every class fails, pass 1b stops and reports to Geoff
before pass 2a starts (O5). If spend reaches the ceiling during a gated batch, the batch finishes
and the ledger reports the overrun (O6). Pass 1b runs the core gate only (O7): no transfer set
(O3 is withdrawn), no Sonnet arm, no historical mining (the planter synthesizes every plant), and
one tuning round. The ceiling is the lower of 15M and the post-cut high estimate rounded up to the
next whole million, flag at 80 percent (O8): 15M, flag at 12M (see Budget).
Geoff delegated the methodology to the conductor. The conductor's rulings (C1 to C15 at the first
spec fold, V1 to V4 at the second, P1 to P11 at the plan fold) and the disposition of every review
finding are in [`2026-09-24-pass-1b-spec-fold.md`](../research/2026-09-24-pass-1b-spec-fold.md) and
[`2026-09-24-pass-1b-plan-fold.md`](../research/2026-09-24-pass-1b-plan-fold.md).

## What failed and why

Pass 1's validation (`docs/internal/record/2026-09-23-docs-reset-validation.md`) failed every
class. The record traces the failures to the validation's design:

- The record traces the misses it examined to runs that never reached the planted section. The
  planter placed defects anywhere on a page; a reader does one job.
- 35 of 48 false positives came only from `ruleCandidates[]`, a field meant for the profile fold,
  and 8 were harness artifacts (no `.git`, a dropped `scripts/docs-readers/`, internal-docs link
  targets the export drops, a denied `npx`). The two groups overlap.
- "Every plant caught in 2 of 3 runs" is fragile: with independent runs, an instrument with 90
  percent per-run recall passes it on 17 plants about 60 percent of the time.
- Two failures are the instrument's own. All three extender control runs read
  `restrict-admin-access.md`, wrote their rule into the scaffold's actual file, and never reported
  the page's wrong path (F3); one planted run did report it. The control runs diverged from the
  page silently. And a report carries one quote per page, so no run records which instructions it
  acted on.
- Sonnet 5 verified 8 of 13 runs; Opus 5.5 verified 26 of 26. The five unverified Sonnet runs
  failed on a quote not in the file, a quote eight lines off, pages read with no verified quote,
  and one degenerate report.

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

The six development jobs and their classes: the evaluator is docs-only; the operator is
docs-and-binary; the designer and the extender are docs-and-site; the scripter and the core
developer are repository.

- **Development set:** pass 1's validation batch (its 17 plants, P01 to P17, its control runs,
  and its scores), the baseline record's failures (F1 to F6, R1 to R4), and all 19 of pass A's
  defects (D01 to D19). The conductor has read all of it, so all tuning happens here and nowhere
  else.
- **The held-out report, inside the development set.** Pass A's split put 9 defects in a
  held-out half (D01 D03 D06 D08 D09 D10 D12 D16 D18) and 10 in tuning (D02 D04 D05 D07 D11 D13
  D14 D15 D17 D19). Pass 1 ran and scored the held-out half, and its record names each subject and
  every near miss, so it is not blind. It is reported only, as a comparison against pass 1's 1 of
  9, and labeled contaminated.
- **Test set:** 42 fresh plants, seven per job, on the six development jobs, placed by an
  isolated planter on the frozen instrument's path maps after the freeze. Precision on these jobs
  is measured on control runs of pages the conductor has adjudicated before, so it is in-sample,
  and the record says so.
- **No transfer set** (O7). Pass 1b measures no transfer to unseen pages or audiences, and its
  precision is in-sample only; the record says so.

## Sequence

0. **Rescore.** Pass 1's saved reports are rescored offline under this spec's scoring rules. This
   is tuning round 0's reference. Before the rescore, one agent that may read the development set
   drafts the catch judge's, the adjudicator's, and the agreement read's prompts and rubrics, and
   writes a catch criterion and a near miss for each of pass 1's 17 plants and each of the nine
   held-out defects.
1. **Author the planting prompts.** A fresh `claude-opus-5-5` agent that has not read the
   development set writes the planter's and the plant check's prompts and the plant-type
   definitions, from this spec alone.
2. **Tune** on the development set, one run round (see Tuning).
3. **Freeze** (see Freeze). Nothing that affects a score changes after it.
4. **Map.** On the unmodified pages at the pinned commit, each development job runs three times
   on `claude-opus-5-5`. These runs build the path maps and are the control runs for precision.
   The scripter also runs three Opus times on pass A's pre-fix contract pages for the held-out
   report.
5. **Plant.** The planter synthesizes seven plants per job on its path map (see Planting). A
   script and one blind read validate every plant; an invalid plant is replaced before any planted
   run. The thresholds are then recomputed at the achieved plant counts (see Path map).
6. **Planted runs:** three Opus runs per development job.
7. **Score,** by script where mechanical, by the catch judge on planted runs, and by the
   adjudicator on control runs, then the agreement read.

## Tuning

Tuning is one round (O7). It adopts four changes that fix instrument defects pass 1 found; they
fix the instrument rather than raise a score, and no other change is tried:

- **`steps[]`:** each instruction the reader executed or statement it relied on for a decision,
  with the decision named, as a `page:line` quote the runner verifies like any other quote. It is
  what the path map is built from.
- **`diverged[]`:** each place the reader did something other than what a page said, including a
  workaround that succeeded, with the page quote, what the reader did instead, and why. F3 is the
  case this catches.
- **`blockedBy`:** a structured field on `stalls[]`, `assumed[]`, and `diverged[]` entries naming
  the denied command or the absent path that blocked the reader, or null. The harness filter
  reads it.
- **The git export** (see The export).

**The round.** Round 1 runs the four adopted changes against round 0's reference: every
development job once planted (pass 1's plants, at `planted/<job>/`) and once on control pages, on
`claude-opus-5-5`, 12 runs. Its instruction set is what the freeze takes. Development recall counts only the development plants inside the job's development path
map. Pass 1 had no `steps[]`, so the map is a proxy built from pass 1's control-run quotes: a
section (as Path map defines it) is on a job's proxy map when any verified Opus control run of
that job in pass 1 has a verified quote inside it, in any report field. Any quote suffices,
because pass 1 carried about one quote per page and two-of-three cannot apply to two sparse runs.
The record states the map as a proxy and gives each job's on-map plant count before round 1;
off-map development plants are reported only. Development precision is the
false-finding count per verified Opus control run. The catch judge and the adjudicator rule both,
using prompts drafted before round 0; they are not tuning levers. A defect found in either during
tuning is fixed, logged with the misruling it fixes, and rounds 0 and 1 are rescored.

**Bans.** No tuning change, prompt, rubric, or job text may name a page, a defect, a job fact, or
any development-set item, held-out defects included. The absent lists and the allowlists are not
tuning levers. The `diff-reviewer` checks every tuning change against these rules.

## Freeze

One commit, tagged `docs-reset-1b-freeze`, carries a manifest of sha256 hashes over every
score-affecting input:

- every file under `scripts/docs-readers/` except `post-freeze/` (below): the runner, the
  preparation and export code, the reader prompt and report schema, the class files, the batch and
  job files (with each job's absent list), the judge classes and the packet builder, the scoring,
  path-map, operating-characteristic, validity, chain, and transcript-audit scripts, and the
  development-item subject list;
- the prompts and rubrics of the catch judge, the adjudicator, the agreement read, the planter,
  and the plant check; the plant-type definitions; and the catch criteria for the
  development plants and the held-out defects;
- the container image digest, the Claude Code CLI version, and the model ids, each checked
  against the id the run's init event reports;
- the pinned page commit for every job (never `HEAD`) and the held-out pre-fix pins
  (`cli-cairn-json-output.md` and `cli-cairn-exit-codes.md` at `29a03eff`, `cli-cairn-doctor.md`
  at `3453668f`);
- every seed.

The runner refuses a gated batch when any frozen input differs from the manifest. It stamps the
tag, the manifest hash, and the chain head (below) into every report of a gated batch, and never
into an ungated one. The scorer rejects a gated report that is unstamped or whose stamp does not
match the manifest at the tag. The close's `diff-reviewer` confirms no frozen path changed after
the tag.

**The post-freeze chain.** Every artifact created after the tag that a later step reads (path
maps, recomputed thresholds, the planted batch file, each planted tree's
digest, the plant record, each batch's results index, and each judge batch's rulings) is committed
under `scripts/docs-readers/post-freeze/` or `docs/internal/record/`, with its hash, into an
append-only chained manifest. An entry never changes; a replaced artifact gets a new entry, and the
record lists it. The scorer verifies the chain and refuses any input whose hash differs from its
latest entry or whose entry postdates a report that read it.

**Burns.** Any instrument change after the freeze, including a fix for a crash or a broken export,
burns the plants: a new planter plants, and every mapping and planted run reruns. A burn is
allowed only before any planted run is scored; after that, a defect is recorded for pass 2a and
never fixed in pass 1b. A burn is about 3M, so a burn with spend past the 12M flag stops for an
owner ruling.

**Reruns are the runner's alone.** An unverified, crashed, or timed-out run, or one with no
report, gets exactly one automatic rerun. Every attempt stays in the results, the scorer reads the
final attempt, and the record lists each rerun and its cause. A batch-level stop (a rate limit, an
authentication failure, a budget stop) is not an attempt: the runner records it on every job it
left unstarted and resumes only those jobs. A gated planted run still failing after its rerun
catches nothing. A gated control run still failing counts every item in its catch fields as a
false finding. The judges run through the runner (see Scoring) under the same rule, and no judge
is re-run after its rulings are visible except under it.

## The export

- Git is installed in the reader image.
- Every repository-class tree, the scripter's contract bundle included, gets one synthetic commit
  made after any planted overlay, separately in each prepared tree, under a pinned neutral author
  and committer identity, message, and date. Preparation asserts exactly one commit and a clean
  `git status`. The preparation code's `.git` exclusion becomes this check.
- File mtimes are normalized to one fixed timestamp, before the commit, and the per-run copy
  keeps them.
- `docs/HISTORY.md`, `docs/STATUS.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md`, the
  reader harness's own unit tests (`src/tests/unit/docs-readers-*`), and every development fixture
  join the repository export's excluded paths for gated batches and for the planter's export,
  since each tells a reader that plants exist or names a development item.
- Every job's pages come from one pinned commit, exported from git, never from the working tree.
- Preparation builds control-only trees for the mapping runs. Development plants stay at
  `planted/<job>/`; test plants go to a new root, never that path.
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
  and the record says so. With none, the job has no map and no plants, and the record says so.
- **Ceiling.** The map's on-path share of the job's page lines is reported per job. A map above
  60 percent is too loose; that job's plants then go only on sections quoted by all three runs,
  and, where that still exceeds the ceiling, only on lines within 40 lines, either side, of a line
  inside a `steps[]` span that at least two runs quoted, within those sections.
- **Thin map.** When a map cannot hold seven plants under Planting's spacing rules, it widens to
  sections quoted by at least one run, recorded per job, adding sections in descending order of
  verified `steps[]` quotes, ties broken by page order. If it still cannot, the job gets fewer
  plants.
- **The ceiling wins.** The thin-map widening never takes a map past the 60 percent ceiling; it
  stops where the next section would cross it, and a map the ceiling narrowed is never widened
  again. A job short of plants under the ceiling takes fewer plants. A loose map lets the
  instrument call a plant on-path when no run would reach it, which is pass 1's failure mode, and
  the 42-plant design tolerates a shortfall (below).
- **Recomputed thresholds.** After planting and the validity check, and before any planted run,
  the operating-characteristic script recomputes every sensitivity threshold at the achieved
  counts, whether or not any job fell short. It applies the rules the full design meets across the
  same range of the intraclass correlation (ICC) of a plant's catches across its runs, 0.25 to
  0.95, and its output enters the chain:
  - The pooled threshold is the smallest one at which a true recall of 0.6 passes with
    probability at most 0.1 and 0.8 passes with probability at least 0.8, at every ICC in the
    range. The recall-0.8 pass probability is recorded beside it. From 35 to 42 plants a threshold
    exists at every count (26 at 35, 27 at 36, 31 at 42). Below 35 it exists only at 32 and 33.
  - Each class floor is the largest count that a class at true recall 0.8 reaches with
    probability at least 0.9 at every ICC in the range, computed at the class's achieved plant
    count (4 of 7 and 9 of 14 at full count; 4 of 6, 3 of 5, 9 of 13, and 8 of 12 on the way
    down). A class left with one plant has no floor that meets the rule.
  - Where no pooled threshold meets its rule, sensitivity has no gate and no class validates:
    every class is advisory, and the record gives the achieved count. Where one class floor has no
    threshold, that floor is reported, and the class validates on the pooled bar, agreement, and
    its precision.
- Each map is committed, with its hash, into the chain before planting starts.

## Planting

The planter is one `claude-opus-5-5` agent at `high`. It synthesizes every plant (O7). It works
from the repository export at the pinned commit, which drops the records and has no history, plus
the path maps, and never sees a job text, a reader prompt, a report, the development set's
plants, or the plant-type mix pass 1 used. It gets the line spans of every mapping-run finding,
unadjudicated, as lines to avoid.

- **Seven plants per job.** At least four are semantic: a false claim about behavior, a
  contradiction, or a wrong precondition or ordering. The rest are token types: a removed step,
  an undefined term, a wrong flag or name, or a stale path. A stale-path plant never targets a
  path on the job's absent list. A job short of seven loses token plants first.
- **Synthesized only.** No plant reintroduces a historical defect, so the test set carries fault
  seeding's known bias toward easy defects (see Evidence); the record states it beside the
  sensitivity result.
- **Blindness is audited.** Every blind agent (the planting-prompt author, the planter, the plant
  check) works from copies of its granted inputs, and a script audits its transcript for any read
  of a forbidden path. A hit before any planted run invalidates that agent's output, which is
  redone. A hit found after planted runs start is recorded, and the affected plants are reported,
  not gated.
- **Spacing.** At most two plants per section, none within ten lines of another, spread across
  sections; a multi-page job carries at most four plants per page. Seven plants therefore need at
  least four on-path sections.
- **Record.** Per plant: page and line, type, a one-line subject, original and planted text, the
  proof against the code, a **catch criterion**, and one **near-miss example** that does
  not count. The test record lives under `docs/internal/record/`, is excluded from every reader
  export, and enters the chain before any planted run. The criteria for the development plants and
  the held-out defects are written before round 0 (Sequence, step 0) and frozen.
- **Validity check.** A script confirms that each plant sits inside the job's plantable region
  (the on-path sections, or the narrowed region where the ceiling narrowed the map), that the
  spacing rules hold, that no stale-path plant targets an absent-list path, that no plant sits on
  a mapping-run finding span, and that the plant differs from the control page at its line. One
  blind read, which sees the plant record, the code, and the development-set item list and
  nothing else, verifies each proof against the code and confirms the plant shares no subject
  with any development-set item, a judgment no script can make. A failing plant is replaced before
  any planted run. No plant is dropped after the planted runs start.

## Scoring

- **Catch and finding fields** are `stalls[]`, `assumed[]`, and `diverged[]`. `checks[]` is empty
  today (the runner hard-codes it); it counts only if tuning populates it. `ruleCandidates[]`
  counts as neither, which costs recall (pass 1 caught several plants only there). Counting
  candidates as catches but not as false positives would inflate both measures in the
  instrument's favor, so it is rejected.
- **The judges run headless through the reader runner,** as judge classes with frozen prompts. A
  script builds each judge's packet, and the judge's container mounts only that packet. The packet
  carries opaque item ids and never the model, the run id, the reader prompt, or any
  `ruleCandidates[]` entry. Rulings come back as structured JSON whose ids join to runs and plants
  through a key file no judge sees, and gated rulings are stamped like reader reports.
- **The catch judge** is one `claude-opus-5-5` read at `high` per planted run. It sees the plant
  record's entries (subject, criterion, near miss), the planted page, the job text, and the run's
  catch fields. It rules each plant caught or missed. A catch meets the plant's criterion and also
  qualifies as a finding: it claims the page is wrong, contradictory, or silent on something the
  job needed there. An item that merely names or uses the subject is a miss.
- **The adjudicator** is one `claude-opus-5-5` read at `high` per control run. It sees the page,
  the full published docs tree at the pinned commit, the code, and the job text. Under a frozen
  rubric it first classifies each catch-field item as a finding, an interpretation choice the job
  left open, or not a claim, then groups the run's findings by subject (same page and same claimed
  fact), then rules each subject real, false, or harness. A `diverged[]` item is a finding when
  its stated reason is that the page was wrong or silent.
- **Real defect,** unchanged from pass 1's record: the page states something false or
  self-contradictory against the code, or omits a fact the job needs that no published page
  supplies. A false finding is one answered elsewhere in the published docs, wrong, or asking
  for a fact that does not exist.
- **Harness items** are excluded from both counts. The filter excludes an item mechanically when
  its `blockedBy` matches the job's absent list or the run's denials, under one rule. A path
  matches when, normalized to repository-relative form, it equals an absent-list path or lies
  under an absent-list directory. A command matches when its first word and first argument equal
  those of a command in the run's denial record (the denied Bash call's command, parsed from the
  record's excerpt, which may be truncated). The adjudicator rules "harness" for any the filter
  missed. Every excluded item is listed in the record. The exclusion never applies to catch
  scoring.
- **Pools.** Gated precision reads every planned Opus mapping run of the development jobs (three
  per job), a run unverified after its rerun counting as the rerun rule states; never the tuning
  rounds' control runs, which are development precision. Planted pages are not real pages, so
  planted runs score catches only.
- **Held-out.** A held-out defect is found when the catch judge rules it caught in at least two of
  its three scripter runs, against its frozen criterion. It enters no class verdict.

## Bars

The gate reads Opus runs on the development jobs only. The thresholds come from the operating
characteristic below, not from the literature.

| Bar | Pass condition | Scope |
| --- | --- | --- |
| Sensitivity | A plant counts as caught when at least two of its three runs catch it; at least 31 of the 42 plants caught (or the recomputed threshold) | Instrument-wide |
| Sensitivity floor | At least 4 of 7 plants for a one-job class (docs-only, docs-and-binary); at least 9 of 14 for a two-job class (docs-and-site, repository), or the recomputed floor | Per class |
| Precision | False findings summed over the class's planned Opus mapping runs at most one per run (3 for a one-job class, 6 for a two-job class) | Per class |
| Judge agreement | On the O2 sample, pooled Cohen's kappa at least 0.6, or pooled raw agreement at least 85 percent where either stratum fails the five-item test below | Instrument-wide |

Stability is reported, not gated (see "Stability" below).

**The operating characteristic.** Plants are scored with their three runs clustered: each plant
has its own per-run catch probability, drawn from a beta distribution whose mean is the
instrument's true on-path recall and whose ICC is estimated from pass 1. The fit uses this spec's
counting rule, so a catch made only in `ruleCandidates[]` counts as a miss. Recounted that way
from the pass 1 record's Bar 1 table, pass 1's two Opus runs per plant caught 4 plants in both, 2
in one, and 11 in neither. The beta-binomial maximum-likelihood fit gives a mean of 0.29 and an
ICC of 0.72, with a profile 95 percent interval of 0.25 to 0.95. (The fit that counted rule
candidates, 9, 2, and 6, gave 0.59 and 0.76, interval 0.35 to 0.95.) The mean describes
whole-page plants and does not carry over; the ICC range does. Pass 1's ICC also carries the
shared off-path misses the path map removes, so the on-path ICC may sit lower, which is why the
design must hold across the whole interval. Plants are treated as independent given the
instrument. Pass 1's data cannot estimate a within-run effect across a job's plants, so the ICC
range is the stated sensitivity check. Probabilities are exact beta-binomial sums.

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

**Precision** is set from pass 1's data. Counted over stalls and `assumed[]` only, pass 1's 16
verified control runs (12 Opus, 4 Sonnet) carried 13 false positives, about 0.8 per run, with
harness artifacts the new export removes still in the count. The bar holds each class to about
that rate. It cannot pass vacuously: a silent reader passes it and fails sensitivity.

**Judge agreement (O2).** One `fable` read re-rules 30 items: 15 findings from the development
jobs' Opus mapping runs (labels real, false, harness) and 15 catch calls from the development
jobs' Opus planted runs (caught, missed). Both pools are fixed here, before any ruling exists.
Each stratum is balanced by the primary ruling where the pool allows. Items are ordered by
`sha256("docs-reset-1b-agreement" + item id)` and taken from the top. Agreement is computed before
any Fable ruling replaces a primary one. The gate pools the two strata; each stratum's kappa or
raw agreement is reported. The pooled kappa averages the strata's observed and chance agreement,
weighted by size, and then applies Cohen's formula. It never computes chance agreement over the
union of the two label sets, which would inflate kappa, since no item can be mislabeled across
strata. Kappa applies when, in each stratum, each rater's labels include at least five items
outside the largest category (the five-item test). Otherwise the gate is pooled raw agreement at
85 percent, and the record gives the reason. Fable's ruling stands on every disagreement, and the
bars are computed after those replacements. An agreement failure fails every class, since every
judged count rests on the two judges.

**The simulation's code path.** `scripts/docs-readers/oc-curve.ts`, seed 20260924, reproduces the
pass 1 refit, the sensitivity table, the floors, the stability figures, and the recomputed
thresholds at any achieved plant count. The plan commits it before the freeze; it is specified
here, not built. The trial figures in "Finding for pass 2a" rest on the spec folds' scratch
scripts, which the plan commits under `docs/superpowers/research/` before the build.

**Reported, gating nothing:**

- per-class plant recall with exact intervals, per-run recall, and recall by type (semantic or
  token), by position along the path, and after a prior stall;
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
  pass 1's 1 of 9.

## Failure rule

The outcome is per class (O4). A class is validated when the instrument-wide sensitivity and
agreement bars pass and its own sensitivity floor and precision bar pass, with the no-threshold
cases as "Recomputed thresholds" states. Stability is reported and validates or fails no class. A
validated class's readers go to pass 2a as validated. A failing class's readers run in pass 2a as
advisory only, and the record states the cause per class. There is no fix round after the freeze;
a change tuned after seeing test scores is post-hoc by construction. If every class fails, pass 1b
stops and reports to Geoff before pass 2a starts (O5).

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
  per-run recall 0.4 to 0.99, independent runs or ICC 0.76, the pre-refit value; the refit gives
  0.72) keeps a truly one-third-better chain about 52 percent of the time and a no-difference
  chain 5 to 14 percent. "At least a third fewer" is read as the full chain's count at most two
  thirds of the minimal chain's; a strict "fewer than two thirds" gives 4 to 12 percent. The 52
  percent follows by construction, since the simulated effect sits exactly on the decision
  threshold; a full chain that truly halves the defects (mean 3) is kept 78 to 86 percent of the
  time. Per-run recall barely moves any of these figures. Pass 2a must resize the trial (more
  pages, more jobs per page, or a paired per-defect design) or restate its decision rule before
  it runs.
- **The trial measures a chain with the reader it redrafted against.** Defects in the reader's
  blind spots are invisible to both. Pass 2a's measuring runs use jobs disjoint from the jobs the
  chain's reader stage ran on each page, or add an independent measure.
- **The trial's reader runs are Opus only** (O7). Pass 1b measures no Sonnet arm, so no Sonnet
  share is validated.
- **The labeled defect set** for the grader comparison is pass 1b's test plants only. Pass 1's
  plants and pass A's defects are development items the reader was tuned on.

## Budget

Ceiling 15M, flag at 12M (O8: the lower of 15M and the post-cut high estimate, 19.8M, rounded up to
20M; the flag at 80 percent). Counted tokens are input, output, and cache creation; cache reads are
reported separately. A session ledger script applies that rule across the conductor's session,
every subagent transcript, and the runner's ledger, so the flag is checkable. Pass 1 recorded about
9M; under this rule it counted about 18.7M (2.32M conductor, 13.64M subagents, about 2.7M readers),
and the estimate below is built on those measured figures.

| Item | Basis | Low | Mid | High |
| --- | --- | --- | --- | --- |
| Implementer chains | six at 0.6M to 1.3M (pass 1 measured 0.57M to 2.99M), one half-size | 3.9M | 5.9M | 8.5M |
| Code simplifier | seven passes | 0.3M | 0.45M | 0.6M |
| Conductor main loop | pass 1 measured 2.32M over a longer sequence | 1.2M | 1.7M | 2.2M |
| Pre-flights | three | 0.3M | 0.4M | 0.45M |
| Out-of-chain `diff-reviewer` reads | about five | 0.3M | 0.5M | 0.75M |
| Authoring agents | development-item extractor, rubric author, planting-prompt author, planter, plant check, record author, close fold | 1.5M | 2.05M | 2.6M |
| Reader runs | 12 tuning, 21 mapping and held-out, 18 planted, at 45k | 2.1M | 2.3M | 2.7M |
| Judges, headless | 39 catch-judge runs at 12k, 36 adjudications at 20k, one agreement read | 1.0M | 1.35M | 2.0M |
| **Total** | | **10.6M** | **14.7M** | **19.8M** |

The 45k per reader run is pass 1's measured cost per final run, reruns included. The judge figures
assume a minimal system prompt and a packet-only mount; pass 1 has no measured equivalent.

**No cuts remain** (O7 took them in advance). At the flag, the conductor finishes the running task,
writes the ledger with its projection to the close, and asks Geoff one combined question. At the
mid estimate spend is about 9.6M at the freeze and the flag trips during the planted runs; the
pass closes near 14.7M, under the ceiling with little margin. At the low estimate the flag never
trips. At the high estimate the flag trips during round 0 or round 1 and spend reaches the ceiling
during mapping or planting. If spend reaches the ceiling during a gated batch, the batch finishes
and the ledger reports the overrun (O6); outside a gated batch, the conductor stops at the next
task boundary and asks Geoff.

## Evidence

- Fault seeding and its bias toward easy seeded defects: Mills (1972); Petersson, Thelin,
  Runeson, and Wohlin, "Capture-recapture in software inspections after 10 years research",
  *Journal of Systems and Software* 72(2) (2004).
- Historical-fix defects as a stronger proxy than seeded ones, the reason a later pass may restore
  mining: Just, Jalali, and Ernst, "Defects4J", ISSTA 2014.
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
