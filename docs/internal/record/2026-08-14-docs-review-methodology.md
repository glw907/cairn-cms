# The docs review methodology (2026-08-14)

How Claude-written documentation gets reviewed by Claude before production, designed
against the two evidence bases researched at this sitting: how LLM-authored docs fail,
and how LLM-as-judge fails. It governs Pass D's Phase 2 per-track reviews (scaled to one
track) and the Task 13 production gate (the whole corpus, post-cutover, the exact bytes
release one ships). The audience profiles
([`2026-08-14-audience-profiles.md`](./2026-08-14-audience-profiles.md)) are the grading
rubric; the register standard carries the prose contract; this document carries the
lenses, their order, and the reliability rules.

## The two findings the design rests on

**What kills LLM-written docs is what a read-through cannot catch.** The measured
failure ranking: plausible-but-wrong procedures (steps that read correctly and do not
run); hallucinated APIs, flags, and config keys (up to 15% of code-LLM hallucinations,
worst on low-frequency surfaces); training-data staleness (25-38% deprecated-usage rates
measured, even with current context available); fluent incoherence (locally coherent,
globally wrong, optimized by training to earn reviewer trust); silent numeric
corruption; and, least dangerous but most visible, boilerplate and rhythm tells.
Fluency masks the top of that list from any reader, human or model. The corollary the
evidence states outright: **tell-detection and fact-checking are orthogonal**. A page
can be tell-free and wrong; the style gate and the claims gate never substitute for
each other.

**What makes an LLM reviewer trustworthy is what it is forced to produce, not how hard
it is told to look.** The measured judge failures: self-preference (a model prefers
text statistically familiar to it), position bias (verdict flips of 15-32% on order
reversal), verbosity bias, style-over-substance (factual errors discounted far more
than stylistic ones), leniency drift, and over-firing as the default failure mode of
verification pipelines. The measured mitigations, in order of strength: **execution
beats opinion** (the single largest lever; an 80-agent unanimous endorsement of a
nonexistent bug was caught only by running it); evidence-requirement plus rubric
decomposition (a finding without a quoted line and a named criterion is discardable by
construction); fresh-context separation of producer and reviewer (cross-context review
measurably helps; same-session multi-round review adds noise); order randomization on
comparative judgments; and adversarial framing as a candidate generator, never a gate
by itself.

## Why this is affordable: the tightness dividend

The corpus ruling and this methodology are one design (Geoff, 2026-08-14): high-quality,
low-volume docs are easier to fact-check and to maintain. Verification cost scales with
page count, so at roughly 68 pages the claims sample can run dense, every transcript can
live as a fixture, and the symbol sweep covers the whole corpus in one cheap pass; at
competitor scale the same rigor is unaffordable, which is exactly where their measured
staleness came from. The dividend compounds after the pass: every future page change
re-runs stage 0 for free in CI, and the smaller the corpus, the larger the fraction of
it each monthly drift check and each release's doc pass can actually re-verify.

## The gate sequence

Cheap deterministic gates run first, so model review time is never spent on lintable
defects; opinion runs last, and only on what survived execution.

**Stage 0, mechanical (CI, no judgment).** Vale (Google, and Microsoft on
`docs/editors/`); the comment and tell linters; `check:docs` (links and anchors);
`check:snippets` (every fenced code block typechecks against the built package); the
admin transcript gate (every quoted transcript line matches a recorded fixture);
`check:reference` and `:signatures` on the kept arm. **New for this pass, the symbol
sweep:** every code-voice token a new page names (an export, a CLI flag, a config key,
an env var, an event name, a file path) is extracted and resolved against the source
tree, failing on any name the code does not carry. This is the near-total defense
against the hallucinated-symbol class and it is a grep, not a judgment.

**Stage 1, the claims sample (model-assisted, execution-grounded).** Per track, a
sampled decomposition of factual claims: each sampled claim is traced to the current
code, a recorded run, or a gated reference page, and every numeric claim is checked
exact. Claims decompose only to the point of checkability (over-decomposition
measurably adds noise). Staleness rule: a claim verifies against the tree, never
against what the reviewer knows; a reviewer who cannot point at the source line has not
verified. The full-corpus claims audit remains the post-beta.1 ROADMAP gate; this
sample exists to catch a systemic miss now, and any two confirmed misses of one class
escalate the sample to a full sweep of that class.

**Stage 2, the persona walks (completion-measured, not opinion-measured).** One fresh
agent per track, briefed with its audience profile and a goal, under two rules the
synthetic-user evidence demands. First, **knowledge suppression**: the walker may use
only facts the pages state, plus the profile's stated floor; any step that requires a
fact from outside is recorded as a guess, and the guesses are the findings. Second,
**the artifact is the measure**: the walk reports whether the documented steps
completed and where it had to guess or leave the page, never whether the prose "seems
clear." An LLM cannot fail to understand jargon the way a real novice does, so walker
opinions about clarity are inadmissible; completion, guessing, and dead ends are the
admissible evidence. Walk order across pages is randomized where the index does not fix
it. **The genuine novice-comprehension question routes to a human read:** Geoff reads
the editor track (the smallest track, carrying the highest novice-gap risk) before
release one; no LLM pass substitutes.

**Stage 3, the fishtank read (per-claim, not holistic).** One fresh cross-track
reviewer walks every index as a story on the shipping tree: contracts stated and
non-colliding, every named precondition produced by an earlier page in the track's
order, cross-track dependencies present as explicit links, the redirect map resolving
against what actually renders (including the cairn-pub `/help` preview). Findings are
per-edge ("page X assumes state Y; no earlier page produces it; quote"), never
gestalt ("this track feels disorganized"), because holistic judgment is where
style-over-substance bias lives.

**Stage 4, the register pass.** The register-check machinery against the track
registers and profiles, findings quoting the rule and the offending line, proposing a
rewrite in the page's register. Runs last because it is the least load-bearing for
correctness and the most susceptible to churn; the standard's own calibration holds:
over-firing is a defect equal to missing, and a rewrite that merely paraphrases is not
a finding.

## The findings pipeline

- **Every finding, every stage: a quoted line, a named criterion (a profile clause, an
  anatomy element, a register rule, a code line), and a proposed change.** Findings
  without all three are discarded unread.
- **Rank, don't threshold**: each reviewer returns a forced ranking, never a
  pass/fail; the conductor draws the blocking line.
- **Find-then-verify on everything blocking-tier**: an independent fresh-context
  verifier re-derives each blocking finding from the evidence, empirically where the
  claim is executable (run it) and from the quoted sources where it is not.
  Adversarial framing generates candidates; execution and evidence settle them. A
  finding the verifier cannot reproduce is downgraded, not silently kept, and the gate
  tracks its own false-positive rate across rounds (a verification pipeline's default
  failure is over-firing).
- **Panel diversity is angle, not instance count**: the stages are the panel. Running
  three copies of one lens adds correlated votes, not confidence; the reviewer roster
  varies by lens, and reviewers pin Opus against the Sonnet-drafted pages per the
  house subagent-model doctrine. All models here share a family, which the literature
  flags for self-preference; the compensations are exactly stages 0-1 (execution and
  source-tracing owe nothing to familiarity) and the human read.
- Dispositions land in the pass record; **release one does not cut with an unfolded
  blocking finding.**

## Scaling: Phase 2 versus Task 13

A Phase 2 per-track review runs stages 0, 1, and 4 plus a single-track walk (stage 2),
on the track in isolation, before the cutover exists. The Task 13 production gate runs
all five stages on the post-cutover tree, walks all four tracks blind, and adds stage
3, which only means anything once the whole corpus and the redirect map exist. The
mining sweep (Task 9) is not a review stage and stays where the plan puts it: after
bake, before cutover, every find code-verified.

## Standing limits (what this methodology does not claim)

An LLM walk does not predict novice comprehension; the human read is the instrument
for that. An unexecuted judgment is an opinion whatever model holds it. And a clean
pass through every stage is necessary, not sufficient: the post-beta.1 claims audit
and real strangers' issue reports remain the instruments that catch what a
Claude-reviews-Claude gate structurally cannot.
