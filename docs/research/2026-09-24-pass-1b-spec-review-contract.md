# Pass 1b spec review: contract and criteria lens

Target: `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md` at `30083f27`
(cited below as `spec:N`). Context read: the parent spec's items 8 and 9, the pass 1 validation
record, the planted-defects record, the pass 1 plan's "11 pre-flight", "11 prep", and "11" ledger
rows, and `scripts/docs-readers/lib/{types,verify}.ts`.

The lens: is every bar testable as written, does it name what it is computed over and what fails
it, can it pass vacuously, is any scoring term defined twice or left to judgment where a script
was promised, and what does the scorer still get to decide after seeing results.

Counts: 2 blockers, 7 majors, 6 minors. One OWNER FORK (m6).

## Blockers

### B1. The catch judgment has no named judge, rubric, or blinding (`spec:100`, `spec:71`, `spec:112-114`, `spec:60-62`)

Recall, the gating quantity of two of the four bars, rests entirely on "a catch names the plant's
specific subject, as pass 1's ruling 5 defines it." Ruling 5 says the subject "appears in a stall,
`assumed[]`, a check, or the report text, confirmed against the plant record by the scoring read."
The spec assigns the adjudicator only to control-run findings (`spec:113`), and nothing names who
scores planted runs. The freeze (`spec:60-62`) fixes the adjudicator prompt but no catch-judge
prompt. In pass 1 this call was judgment-heavy and made by the conductor after seeing the runs:
P03 counted as a catch although both runs only called `--dir .` a form to drop and neither said it
fails; P05 and P14 near misses were ruled out on reasoning about what the item "concerns". A
subject-named-versus-subject-flagged call made by a scorer who has seen the scores is exactly the
post-hoc latitude the freeze exists to remove, and no agreement check covers it (the agreement bar
samples control findings only, `spec:125`).

Fold: add to Scoring and to the freeze list a catch judge: one `claude-opus-5-5` read at `high`
that sees the plant record entry, the planted page, and the run's `stalls[]`, `assumed[]`,
`checks[]`, and `diverged[]`, never the job text or other runs. Fix the rubric now: a catch
requires the item to (a) point at the plant's subject (the planted term, flag, path, or the
removed step's effect) and (b) treat it as a problem, a failure, or a divergence; merely repeating
or using the planted text is a miss (the P06 designer-3 case). Extend the agreement bar's sample to
include catch rulings (for example 30 control findings plus 30 plant-run pairs, each at 85
percent), or state why recall needs no agreement check.

### B2. Precision per class can pass on zero or one finding (`spec:124`, `spec:127-128`)

"At least two thirds of adjudicated control-run findings real" is 0/0 when a class's control runs
yield no findings, and 1/1 passes at 100 percent. Tuning pushes in exactly this direction: pass 1
failed on false positives, the first in-scope change drops `ruleCandidates[]` (35 of 48 false
positives), and a keep rule that forbids dropping precision rewards quieter readers. docs-only and
docs-and-binary each have one job, three Opus control runs; after pass 1's stall-and-assumed
recount they carried 3 and 0 false positives. A near-silent class is plausible, and the spec does
not say whether 0/0 passes. The agreement bar has the same hole: "30 findings drawn at random (all,
if fewer)" passes on zero or a handful.

Fold: pre-register a minimum. For example: a class with fewer than 5 adjudicated control findings
does not pass the precision bar on its ratio; it is reported as "insufficient findings" and treated
as a failure for gating, or (weaker) passes only if its known on-path real defects were reported
in at least 2 of 3 control runs. State that the agreement bar fails outright below some floor
(say 15 findings) rather than computing a percentage over a few.

## Majors

### M1. The Clopper-Pearson clause can never bind (`spec:122`)

With 72 pairs, any pooled recall at or above 80 percent (58 of 72) has a two-sided 95 percent
Clopper-Pearson lower bound of 0.695 (one-sided 0.713), well above 60 percent. The second clause is
vacuous whenever the first passes. It also treats the 72 pairs as independent Bernoulli trials,
while they are three runs of each plant, clustered in six jobs; the true interval is wider. The
spec also does not say one-sided or two-sided.

Fold: either delete the interval clause and keep the 80 percent point bar alone, or replace it with
a bound that can bite and respects clustering: a cluster bootstrap over plants (resample the 24
plants, keep each plant's three runs together, 10,000 resamples, recorded seed), lower 5th
percentile at least 60 percent. State the sidedness.

### M2. Nothing assigns who decides what is a finding, or merges findings into subjects (`spec:101-102`, `spec:71`)

A finding is an item that "claims a page is wrong, contradictory, or silent", "counted once per run
per subject." Both steps are judgment, and neither is assigned. `stalls[]` and `assumed[]` are free
strings (`lib/types.ts:147-148`); pass 1 excluded task-interpretation choices (a hue, a route name)
from findings, and this spec drops that exclusion silently. `diverged[]` is new and is defined to
include "a workaround that succeeded"; a divergence is not in itself a claim that a page is wrong,
yet `spec:96` counts every `diverged[]` item as a finding field. Deduplication by subject sets the
precision denominator, and a scorer who merges or splits after seeing rulings moves the ratio.

Fold: give both steps to the adjudicator, frozen in its prompt: it first classifies each item as
finding, interpretation choice, or not-a-claim (only findings enter precision), then groups a run's
findings by subject before ruling. State whether a `diverged[]` item with no claim about the page
is a finding (recommend: yes, as a silence finding, since F3 is the target case, but say so). Give
the grouping a fixed rule: same page and same claimed fact is one subject.

### M3. The adjudicator cannot apply the real-defect definition from what it is shown (`spec:105-108`, `spec:112-113`)

"Real defect" turns on whether "no published page supplies" the fact, and a false positive is one
"answered elsewhere in the published docs." The adjudicator "sees the page, the finding, and the
code" only. Most of pass 1's false positives were ruled by citing another published page
(`troubleshooting.md:82-88`, `cli-cairn-exit-codes.md:79-80`, `docs/reference/sveltekit.md`). An
adjudicator without the docs set will rule those findings real and inflate precision.

Fold: the adjudicator gets read access to the full published docs tree at the control commit
(the four arms, `why-cairn.md`, `CONTRIBUTING.md`, the reference arm) and is told to search it
before ruling a silence finding real.

### M4. The tuning keep rule is unscoreable as written and conflicts with the in-scope changes (`spec:86-89`, `spec:59`, `spec:75-84`)

"Kept only if it raises development recall without dropping development precision" leaves open:

- What development recall is computed over. The 17 pass 1 plants were placed without path maps,
  and the test-set script computes on-path recall, which needs maps the development set lacks.
  Either tuning rounds run mapping runs too (unbudgeted), or the script runs a different metric.
- Who adjudicates development precision each round (the conductor has seen the pass 1 rulings,
  so it is not blind).
- What the 24 development runs per round are (which jobs, planted or control, which model).
- "Raises" is strict: on about 24 runs, a one-catch change is noise, and a tie rejects.
  `steps[]` and the `git init` export are not recall changes; under the rule they could be
  rejected, yet `spec:76` calls them in scope from the start.

Fold: state that the three named changes are adopted unconditionally (they are instrument
requirements, not tuned choices), and the keep rule applies only to other changes. Define
development recall as recall on the pass 1 plants that the development mapping runs place
on-path, or drop the recall half and keep changes on development precision plus no loss of any
pass 1 catch. Name the development adjudicator (the same frozen adjudicator prompt, run blind).
Fix the round's run list now.

### M5. Test-set precision is measured on development data (`spec:49-55`, `spec:63-65`, `spec:114`)

The data split fresh-izes plants only. Precision is judged on control runs of the same six jobs on
the same unmodified pages that pass 1 already ran, that the conductor adjudicated finding by
finding (48 false positives, with page citations), and that tuning targets. The tuning ban on
naming a page or job fact limits leakage but does not make the measure out-of-sample. The spec
says "Nothing in the test set is seen before the freeze" (`spec:55`), which holds for plants and
not for the precision data.

Fold: either (a) add one fresh job per class on pages not in pass 1 (about 12 more Opus runs) as
the precision test set, or (b) state plainly that precision is in-sample, name it as a known bias
in the record, and keep the bar. This is a methodology call Geoff delegated, so the conductor may
rule it; (b) is cheaper and honest, (a) is the one that matches the split's own claim.

### M6. Held-out defects are in both sets (`spec:49-55`)

The development set is "pass 1's validation batch (its 17 plants, control runs, and scores)". That
batch includes the three scripter held-out runs and their scores, and the validation record
publishes each held-out defect's subject and the near misses on D01, D08, D12, and D16. The test
set then lists "the held-out half of pass A's defects" as unseen. The result is reported only
(`spec:66-67`, `spec:134`), which limits the damage, but the split's claim is false as written.

Fold: move the held-out half to "seen, reported only" and say why it still carries information
(it measures the new instrument, not the old one), or drop it from the split.

### M7. Plant validity and on-path placement have no pre-run check, leaving room to drop a missed plant later (`spec:139-146`, `spec:68`)

Every plant must "sit inside an on-path section" and carry a proof, but nothing checks either
before the planted runs. If a missed plant later proves invalid (wrong proof, off-path after all,
collides with a real defect), the scorer must decide after seeing results whether to drop it and
shrink the denominator below 72.

Fold: add a step between Plant and Planted runs: a script confirms each plant's line lies inside a
mapped on-path span and the planted file differs from control at that line (pass 1's byte check);
one blind read verifies each proof against the code. An invalid plant is replaced before any run.
Pre-register that no plant is dropped after the planted runs start; a plant later found invalid
counts as planted and is reported, never removed.

## Minors

### m1. The path map is undefined at its edges (`spec:109-111`)

- Nested headings: a quote inside a `###` also sits inside its parent `##`, so under "the span
  under one `##` or `###` heading" the whole `##` becomes on-path. Say "the smallest enclosing
  `##` or `###` span."
- Text before the first `##` (a page's lead, `why-cairn.md:1-14`) has no section. Say it is its own
  section.
- An empty map: if two mapping runs are unverified, or the runs spread thin, a job can have zero
  on-path sections or too few to hold four plants away from known real defects. Pre-register the
  fallback (for example, lower the threshold to one of three for that job and record it, or place
  fewer plants and report the reduced denominator).

### m2. Stability is named as a fitness property but no bar measures it (`spec:34-37`, `spec:130-135`)

"Fitness for those uses means three properties", stability among them, yet only sensitivity and
precision gate; per-run overlap is reported. Either add a measure ("each on-path plant caught by
at least one Opus run" or a pooled pairwise-agreement figure) or reword `spec:34` to say stability
is reported, with the three-run reason from `spec:133`.

### m3. Harness-report exclusion is called mechanical with no matching rule (`spec:103-104`)

Findings are free text. "Whose subject is a path the class file lists" needs an algorithm:
substring match of the listed path, or of a denied command (from the report's `denials[]`), in
the item text. Substring matching will also exclude a real finding that mentions such a path in
passing. State the rule and that excluded items are listed in the record so the adjudicator can
see them.

### m4. Which control runs count for precision is ambiguous (`spec:63-67`, `spec:113-114`, `spec:118`)

"The adjudicator rules every finding from the control runs", and "the gate reads verified Opus
runs only." State that precision's denominator is the three verified Opus mapping runs per job on
current pages; that the Sonnet mapping run and the scripter's three pre-fix runs are excluded (the
pre-fix pages carry known real defects and would inflate precision); and whether Sonnet findings
are adjudicated at all (reported Sonnet precision needs it).

### m5. Unverified runs flatter precision; the random draw has no seed (`spec:92-95`, `spec:125-128`)

An unverified run "contributes no findings", which removes its false positives from precision while
counting as a miss for recall. Opus verified 26 of 26 in pass 1, so the risk is small, but add an
Opus verified-share floor (for example, 90 percent of gated runs) or count an unverified control
run's findings as unadjudicated false positives. Fix the agreement sample's seed now (as pass 1 did
with `sha256`), and say the `fable` ruling replaces the primary ruling in the precision count for
those items only.

### m6. OWNER FORK: the failure rule is all-or-nothing across classes (`spec:148-153`)

"If a bar fails, pass 1b stops." Per-class bars mean one class can fail while three pass, and the
two listed outcomes (advisory readers everywhere, or redesign) skip the partial case. Also
`spec:160` leaves the Sonnet-share decision to be made after seeing results with no rule.

Options: (a) keep all-or-nothing as written; (b) add a third outcome: passing classes gate in pass
2a, failing classes run advisory; (c) as (b), but only if the instrument-wide bar passes.
Recommendation: (c), since pass 2a's pages span classes and a single weak class should not
discard three validated ones, while an instrument-wide failure should still stop. For Sonnet,
pre-register a rule now (for example, keep a Sonnet share only if its verified share is at least
90 percent and its pooled recall is within 10 points of Opus).
