# Draft docs approach spec: prose and claims review

Reviewer: `prose-voice-reviewer` (Opus 5.5), spec at `61ca8c55`. Not register-graded (spec).
Result: 0 blockers, 7 majors, 7 minors, 3 suggestions. Spec line numbers unless noted.

## Majors

- **M1 (spec:94-108, 124).** Pass A recorded about 900K per page over three rounds
  (`docs/HISTORY.md:406-409`); the spec prices one redraft (0.65M to 0.75M), leaves a second
  redraft unpriced, and picks the lean path though pass A's pattern suggests both reviewers flag.
  At 0.9M per page the plan is about 54M. "Its counting basis was not recorded" (spec:95) is
  wrong: `HISTORY.md:415` says "Ceiling 3.5M subagent tokens". Fold: state the 900K record, the
  one-redraft assumption, and the 54M upper plan.
- **M2 (spec:218-221, 244-247, 356-358).** The cross-regression rate has no denominator; if both
  reviewers flag round 1, no pilot page qualifies and the lean chain is kept on zero
  observations. Fold: count only pages where exactly one reviewer returned `fix` in round 1;
  fewer than three qualifying pages makes the pilot inconclusive, and the question prices both.
- **M3 (spec:361 vs 126-127, 357-358).** "The named scope that fits 30M" contradicts the 24M
  planning rule. Fold: "plans within 24M"; add that approving the spec authorizes stages 0, 1,
  and the 2a pilot, the rest waiting on the pilot question.
- **M4 (spec:188-189, 264).** Five front-door index briefs collide on `briefs/front-door/README.json`
  (`briefs/README.md:18-22`, `check-provenance.mjs:557`). Fold: arm READMEs brief under their
  own arm's track; `why-cairn.md` and `docs/README.md` under `front-door/`.
- **M5 (spec:275-278).** The container held 40 percent of actionable claims (a 60 percent gap),
  and pass A's 61/51/10 is a disposition count on three contract pages, not a measured control.
  Fold: restate both.
- **M6 (spec:13, 120, 126, 137-140, 264).** Stage-to-pass mapping disagrees in three places; 2a/2b
  split, 2b's outline approval, and extend's freeze-lift point are unstated; stage 2 overhead
  covers one close. Fold: stages 0+1 one pass, stage 2 as 2a and 2b, 2b carries no new outline,
  extend's freeze lifts at 2b; stage 2 overhead 2M.
- **M7 (spec:13, 31, 244).** The pilot takes hard pages first against R5's easy-first. Fold: R5
  governs arm order; the pilot takes hard pages on purpose to measure the chain at its costliest.

## Minors

- m1 (spec:128-129): the all-accepted figure is about 33M, not 36M.
- m2 (spec:180-183 vs 327-328): `check:symbols` reads shell-tagged fences only; state that it
  fails a `cairn` line whose first word is not a command, with or without flags.
- m3 (spec:211-212): stage 0 lacks an acceptance line amending `facts/README.md:76` (page-inputs
  agent files facts; the drafter never does).
- m4 (spec:307-308): "filed `[candidate]` by the editor" is ambiguous; "by whoever makes the edit".
- m5 (spec:91-92): "the leanest counter" undefined; "a counter that includes them, recorded".
- m6 (spec:266): say plainly the merge waits for Geoff's read and its fold.
- m7 (spec:236 vs 317): exemplars per page vs per page type; "two per page type, named on each
  page's line".

## Suggestions

- s1: `docs/reference/README.md` is scheduled in stage 1 and stage 5; stage 5 owns it.
- s2: spec:200's "every CI check that reads the doc arms" is slightly broad (`check:package`).
- s3: only why-cairn carries the section-by-section surcharge; price the other indexes the same
  way or state they are one or two sections.

## Checked and correct

Stage arithmetic (43M), 110K per agent, page counts, reset rulings 1-14 mapping, the 2026-09-08
entries, `check-provenance.mjs:458`/`:591`, the owner-fact lines, flag-list test, anchor pins,
exit codes (all 3), the 68 captures, freeze wording locations, the runner's `rounds[].reads`,
and the human-read sheet lines.
