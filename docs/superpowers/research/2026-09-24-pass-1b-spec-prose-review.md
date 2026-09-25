# Pass 1b spec: prose review

Reviewer: `prose-voice-reviewer` (`claude-opus-5-5`), read-only, over the spec at `da97461b` and the
parent's "Amendments from pass 1b". Saved by the conductor from the agent's report. Specs are not
register-graded; the review checked fidelity first. `tellgrader --register docs`: 0 findings.

**Verified correct:** every figure against the fold record, the second fold's scratch
(`/tmp/claude-1000/fold2/`, re-run), and the pass 1 record; the held-out pins against
`scripts/docs-readers/prepare-baseline.ts:40-61`; the budget arithmetic; the Evidence list.

## Blockers

- **B1.** A bar "reported, not gated" (Path map, recomputed thresholds, spec 207-209) has no outcome
  under the Failure rule (394-396): if no pooled threshold exists, do classes fail or validate
  without sensitivity evidence, and does "gates no class" switch off the class floors too?
  Proposed: no pooled threshold means no class validates (all advisory, record gives the achieved
  count); a class floor with no threshold is reported and that class validates on the pooled bar,
  agreement, and precision; the Failure rule cross-references this.
- **B2.** Whether an unverified control run counts toward precision: the rerun rule (152-156) says
  a still-failing gated control run counts every finding false; the Bars intro, table, and Pools
  (280-293) admit verified runs only. Proposed: the precision pool is the three Opus mapping runs
  per job, a run unverified after its rerun counting every finding false.
- **B3.** Every class failing is unresolved and overrides the parent's "pass 2a starts only after
  pass 1b passes" (parent 39-42) without saying so. Proposed: if every class fails, pass 1b stops
  and reports to Geoff before pass 2a (or the reverse); the parent amendment says it supersedes
  parent 41-42. Owner choice.

## Warnings

- **W1.** The burn rule (148-150) allows a post-scoring burn, which is a fix round (398-399), and
  has no budget stop (about 5M). Proposed: a burn only before any planted run is scored; a burn
  past the 8M flag stops for an owner ruling.
- **W2.** "Report-format failures" (34) misquotes the pass 1 record (validation 307-316): a quote
  not in the file, a quote eight lines off, three runs with no verified quote, one degenerate report.
- **W3.** The extender claim (30-32) overstates the record (validation 146-150): the three control
  runs missed F3, planted-2 reported it, and the runs diverged silently rather than followed.
- **W4.** Held-out criteria (241-242) have no author and are not in the freeze list; the planter
  cannot see development items. Proposed: the round-0 rubric author writes them; the freeze list
  names the development and held-out criteria.
- **W5.** The catch judge reads a "subject" field the plant record (237-238) does not carry.
  Proposed: add a one-line subject to the record.
- **W6.** The validity script (243-244) does not check the narrowed-map region (185-187).
- **W7.** Transfer pages are defined two ways (60-61, 72-74), and "read" is undefined. Proposed:
  pages outside every development job's page set and carrying no verified quote from any pass 1 or
  tuning run.
- **W8.** `blockedBy` has no tuning status (91-106). Proposed: a fourth change adopted without the
  keep rule, in round 1.
- **W9.** The agreement bar's fallback trigger differs between the table (294) and the body
  (362-364). Proposed: the table cites the five-item test.
- **W10.** The data split reads as overlapping (49-55). Proposed: label the held-out report as
  inside the development set.
- **W11.** The job-to-class map is never stated; "the scripter", P01 to P17, and ICC appear before
  they are defined. Proposed: a first line in Data split naming the six jobs and classes; define
  ICC at first use.

## Suggestions

- S1 cut 3's figure omits planting's share; the post-cut range assumes both cuts fire in full.
- S2 the precision basis mixes models: 16 runs are 12 Opus and 4 Sonnet.
- S3 the harness list omits missing internal-docs link targets.
- S4 the 60 percent illustration assumes independent runs.
- S5 the trial simulation's ICC 0.76 is the pre-refit value; say so.
- S6 the held-out "found" rule is unstated; proposed two of three runs.
- S7 rename "Adjudicator agreement" to "Judge agreement", since it covers catch calls.
- S8 the ceiling fallback's 40-line window scope and the widening order are unstated.
- S9 the plant check cannot be blind to the development set; name what it sees.
- S10 several figures rest on uncommitted scratch; `oc-curve.ts` must reproduce each, or the fold
  record carries them.
- S11 the parent amendment's "over fresh plants" wrongly attaches to precision and agreement.
- S12 line 233 is unwrapped.

**Verdict:** the figures hold; one more fold is needed, since B1 to B3 leave pass outcomes open and
W2 and W3 misquote the pass 1 record.
