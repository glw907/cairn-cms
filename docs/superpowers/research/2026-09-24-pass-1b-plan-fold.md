# Pass 1b plan fold

**Date:** 2026-09-24. **Fold agent:** `claude-opus-5-5`, one pass, over the plan at `dc37e38b` and the
spec at `da97461b`. **Targets changed:** `docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`
(rewritten), `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md` (rewritten
in place, sections kept), and the parent's "Amendments from pass 1b" section
(`docs/superpowers/specs/2026-09-23-docs-reset-design.md`). Uncommitted.

**Reviews folded.** ID prefixes: `SP` the spec prose review
(`2026-09-24-pass-1b-spec-prose-review.md`), `CT` the plan contract review, `MX` the plan mechanics
review, `RK` the plan risk review (`2026-09-24-pass-1b-plan-review-{contract,mechanics,risk}.md`).
97 IDs. Every finding was checked against the code, the pass 1 record, or the reviews' probes
before it was folded; none was taken on the reviewer's word.

**Counts.** 92 folded; 1 partly refused (RK-B1, whose render script is refused and the rest folded); 4 ruled (SP-B3 by O5, CT-OF1 by O1, RK-m7 by O6, RK-M6 by P7). Merged groups list every ID once.

## Rulings applied

- **Owner (Geoff, 2026-09-24, final).** O1 revised: ceiling 15M, flag 12M, everywhere. O5: every
  class failing stops pass 1b for Geoff before pass 2a; the parent amendment supersedes "pass 2a
  starts only after pass 1b passes" for the partial case only and restores it for the all-fail
  case. O6: a gated batch that reaches the ceiling finishes, and the ledger reports the overrun.
- **Conductor (methodology, delegated).** P1 headless judges through the runner; P2 the session
  ledger script and pass 1's undercount; P3 the build scope and lanes; P4 pre-freeze authoring by
  named agents; P5 the post-freeze hash chain; P6 the filtered mirror and the transcript audit; P7
  no post-scoring re-ruling; P8 thresholds recomputed at the achieved count after planting; P9 a
  dry regression check; P10 the spec prose dispositions and the transfer drop rule; P11 the budget
  rewrite.

## Verification notes

- Code facts in `CT` and `MX` hold at HEAD: `verify.ts` fails two lines off; `excerpt()` truncates
  denials at 400 characters; the runner has no rerun; `prepare-baseline.ts` pins the core developer
  to `HEAD`; `STEPS` hard-codes six jobs; `REPOSITORY_EXCLUDED_PATHS` omits the 17
  `docs-readers-*` tests; the per-run `cpSync` does not preserve timestamps.
- `SP-W2` and `SP-W3` hold against the pass 1 record (`2026-09-23-docs-reset-validation.md`, the
  reader reliability list and the F3 paragraph). `SP-S3` holds (record row "the export drops the
  internal docs the links target"). `SP-S2` holds (runs 1 and 2 Opus, run 3 Sonnet; 16 verified
  controls).
- `git filter-repo` is not installed (checked); Task 0 installs it. A filtered mirror rewrites
  commit ids, which the reviews did not note; the exclusion script now reads the mirror's commit
  map (Task 5).
- `3a7485dd` is the pass's merge base with `main` and carries no pass 1b file, so it serves as the
  one page pin (`RK-M7`).
- The fold's own budget estimate is higher than the mechanics review's 12M to 16.5M after cuts,
  for two reasons: P3 grows the build to seven chains, and the judge count is 63 catch-judge runs
  and 54 adjudications once round 0, both tuning rounds, the held-out runs, and the transfer and
  Sonnet arms are counted.

## Dispositions

### Spec prose review

| ID | Disposition | Where |
| --- | --- | --- |
| SP-B1 | Folded as proposed (P10): no pooled threshold means every class advisory with the achieved count; a class floor with no threshold is reported and that class validates on the rest | Spec, Path map "Recomputed thresholds"; Failure rule; plan Task 7 |
| SP-B2 | Folded as proposed (P10): precision pools every planned Opus mapping run; an unverified run after its rerun counts every catch-field item false | Spec, Freeze "Reruns", Scoring "Pools", Bars table; plan Task 7 |
| SP-B3 | Ruled (O5) | Spec header and Failure rule; parent amendment; plan Task 16 |
| SP-W1 | Folded as proposed, stop at the 12M flag (P10): a burn only before any planted run is scored; past the flag it stops for an owner ruling | Spec, Freeze "Burns" |
| SP-W2 | Folded: the Sonnet failures quoted from the record | Spec, What failed |
| SP-W3 | Folded: the control runs diverged silently; a planted run reported F3 | Spec, What failed |
| SP-W4 | Merged with CT-M2, MX-M3, RK-B3 (below) | |
| SP-W5 | Folded: a one-line subject in the plant record | Spec, Planting "Record"; plan Task 8 |
| SP-W6 | Merged with CT-M8 (below) | |
| SP-W7 | Merged with MX-M7 (below) | |
| SP-W8 | Folded: `blockedBy` is a fourth change adopted in round 1 | Spec, Tuning |
| SP-W9 | Folded: the table cites the five-item test | Spec, Bars table and "Judge agreement" |
| SP-W10 | Folded: the held-out report labeled as inside the development set | Spec, Data split |
| SP-W11 | Folded: the job-to-class map opens Data split; P01 to P17 and ICC defined at first use | Spec, Data split; Path map |
| SP-S1 | Merged into the budget group (below) | |
| SP-S2 | Folded: 16 verified control runs, 12 Opus and 4 Sonnet | Spec, Bars "Precision" |
| SP-S3 | Folded: internal-docs link targets added to the harness list | Spec, What failed |
| SP-S4 | Folded: "with independent runs" | Spec, What failed |
| SP-S5 | Folded: ICC 0.76 marked as the pre-refit value | Spec, Finding for pass 2a |
| SP-S6 | Folded: a held-out defect is found in two of its three runs | Spec, Scoring "Held-out and transfer" |
| SP-S7 | Folded: "Judge agreement" throughout | Spec; parent amendment |
| SP-S8 | Folded: the 40-line window is either side of a two-run line inside all-three sections; widening adds sections by quote count, ties by page order | Spec, Path map |
| SP-S9 | Merged with CT-M3 (below) | |
| SP-S10 | Folded: `oc-curve.ts` reproduces the Bars figures; the fold scratch scripts are committed in Task 0 | Spec, Bars "The simulation's code path"; plan Task 0 |
| SP-S11 | Folded: sensitivity over fresh plants, precision over control runs, and judge agreement | Parent amendment |
| SP-S12 | Folded: the long line is wrapped | Spec, Planting "The miner" |

### Merged groups (plan reviews)

| IDs | Defect | Disposition | Where |
| --- | --- | --- | --- |
| CT-B1, MX-B2, RK-m5 | The scorer rejects the unstamped reports round 0 and tuning need | Folded: a development mode that alone scores unstamped reports, reads development batches only, and never emits a verdict | Plan Task 7 (1), Tasks 9 and 10 |
| CT-B2, MX-B3, RK-B1 | Frozen prompts and scripts have no author or builder | Folded (P3, P4): the planting-prompt author and the rubric author in Task 8; the validity, exclusion, and read-pages scripts in Task 5; every item named in Task 12's acceptance. RK-B1's wrapper is folded as fixed text; its render script is refused (below) | Plan Tasks 5, 8, 12; spec Sequence 0 and 1, Freeze |
| CT-B3, MX-B4, RK-B2 | No automatic rerun | Folded (P3): one rerun, every attempt kept; batch stops recorded per job and resumed without consuming an attempt; gated batches set `budgetTokens` above expected spend | Plan Tasks 3 and 12; spec Freeze "Reruns" |
| CT-M1, MX-M2 | No proxy map | Folded: a proxy mode in `path-map.ts`; the rubric author writes `dev-plants.json` | Plan Tasks 4 (2) and 8 |
| CT-M2, MX-M3, RK-B3, SP-W4 | Held-out criteria by the blind planter, after their runs | Folded (P4): the rubric author writes them before round 0; they are frozen | Spec Sequence 0, Planting "Record", Freeze; plan Task 8 |
| CT-M3, SP-S9 | The plant check cannot check for a shared subject blind | Folded (P4): it sees the plant record, the code, and the development items' subjects only | Spec, Planting "Validity check"; plan Global constraints |
| CT-M4, RK-M1 | Stamps checked for presence only; post-freeze inputs unhashed | Folded (P5): the post-freeze chain; the stamp carries the chain head; the scorer verifies the stamp against the manifest and every input against the chain; ungated reports carry no stamp | Spec, Freeze; plan Tasks 3, 5, 7, 13 to 16 |
| CT-M5, RK-M5 (close check) | Nothing proves agent prompts are the frozen ones; close check missing | Folded: judges run through the runner (P1); blind agents take a fixed wrapper naming the frozen file and its hash, and the audit confirms their reads; Task 17 restores the frozen-path check (P5) | Plan Global constraints, Tasks 6, 17 |
| CT-M6, MX-M1, RK-M2 | Judge packets and rulings have no plumbing; judges outside the runner | Folded (P1): judge classes and `judge-packets.ts`; opaque ids and a key file; rulings through `--json-schema`; the agreement pools fixed before any ruling | Spec, Scoring and Bars "Judge agreement"; plan Task 6 |
| CT-M7, RK-M4, MX-m11 | Thresholds hard-coded; recompute on the wrong trigger; no capacity function | Folded (P8): recompute after planting at every achieved count, into the chain before planted runs; the scorer reads the file; a capacity function in `path-map.ts` | Spec, Path map; plan Tasks 4, 7, 14 |
| CT-M8, SP-W6 | The validity script checks two rules | Folded: region (narrowed ranges included), spacing, absent-list stale paths, finding spans, difference from control, one fixture per rule | Spec, Planting "Validity check"; plan Task 5 |
| CT-M9 | Held-out, Sonnet, and transfer measures unscored | Folded: the catch judge rules the held-out runs; the scorer computes the Sonnet decision and the transfer measures outside every verdict | Plan Tasks 7 (4), 16 |
| CT-M10, MX-m6 | Malformed denial input | Folded: tolerant parse, the adjudicator fallback, `blockedBy` absent as null, a job with no absent list stops | Plan Task 4 |
| CT-M11, RK-m2, MX-m8 | Export rules without criteria; commit neutrality; ordering | Folded: mtimes, absent-list derivation, the planter's export, the two-commit and dirty failures, identical metadata and a neutral message, overlay then normalize then commit | Plan Task 2 |
| CT-M12 | Verdict composition and pools unproved | Folded: fixtures for agreement failure, one class's precision failure, and false findings in excluded pools | Plan Task 7 |
| CT-M13, MX-m9, RK-M5 (replay) | The close replays the test batch unbudgeted | Folded (P9): a dry check | Plan Task 17 |
| CT-OF1, MX-B1, RK-m7, CT-m14, SP-S1 | Budget above the ceiling; flag unobservable; overrun at the ceiling | Ruled (O1, O6) and folded (P2, P11): 15M and 12M; the session ledger script; the budget rewritten from measured figures, with the flag's trip point per estimate and each cut's full figure. The mid estimate still crosses the ceiling before the planted runs, which is put to Geoff at the plan gate | Spec, Budget; plan header |
| MX-M4, RK-M7 | The export ships the harness's tests, the friction log, and development fixtures; no single page pin | Folded (P3): excluded from gated and planter exports; fixtures under `scripts/docs-readers/fixtures/`; one page pin, `3a7485dd` | Spec, The export; plan Global constraints, Task 2 |
| MX-M5 | Only the scripter is pinned | Folded: every job from `git archive` at the pin, the core developer included | Plan Task 2 (3) |
| MX-M6 | Transfer trees cannot be prepared | Folded: a generic preparer driven by a job specification | Spec, The export; plan Task 2 (4) |
| MX-M7, CT-m5, RK-m6, SP-W7 | Read pages undercounted; "read" and transfer pages undefined; the admin pool is thin | Folded (P10): pages read defined from transcripts and docs sets; disjointness over the whole docs set; a read linked page enters the absent list; a class with no eligible page loses its transfer job, never placed on a development page | Spec, Data split; plan Tasks 5 (3), 11 |
| RK-M3 | Blindness rests on instructions; the miner's history holds every record | Folded (P6): the filtered mirror; granted-input copies; the transcript audit, with the spec's before-and-after-planted-runs consequence. The Agent tool's `CLAUDE.md` and memory index reach every blind agent; they name no development item, so that residue is accepted | Spec, Planting; plan Global constraints, Tasks 6 (4), 14 |
| RK-M6 | Post-scoring re-ruling | Ruled (P7): removed; the `diff-reviewer` checks the record against the scorer only | Plan Task 16, Models line |

### Single findings (plan reviews)

| ID | Disposition | Where |
| --- | --- | --- |
| CT-m1 | Folded: two lines off | Plan Task 1 |
| CT-m2 | Folded: null, string, and missing `blockedBy` | Plan Task 1 |
| CT-m3, RK-m3 | Folded: the scorer computes the keep rule and the round 2 trigger, with boundary fixtures | Spec, Tuning; plan Tasks 7, 10 |
| CT-m4, RK-m4 | Folded: a judge fix is logged and applied to every round; absent lists and allowlists are not levers | Spec, Tuning; plan Tasks 9, 10 |
| CT-m6 | Folded: arrival state, done signal, and absent list checked | Plan Task 11 |
| CT-m7 | Folded: exact figures to two decimals, simulated ones within 0.02 at the seed | Plan Task 4 |
| CT-m8, MX-m12 | Folded: the init event's model id is captured (Task 1) and checked post-run (Task 3); the shared legacy loader | Spec, Freeze; plan Tasks 1, 3 |
| CT-m9 | Folded: two, one, and zero verified runs | Spec, Path map; plan Task 4 |
| CT-m10 | Folded: seven or the count the map allows; a short job loses token plants first | Spec, Planting; plan Task 14 |
| CT-m11 | Folded: a flag check before transfer planting | Plan Task 14 (3) |
| CT-m12 | Folded: stratum balance fixture; agreement before and bars after Fable's replacements | Spec, Bars; plan Task 7 (3) |
| CT-m13 | Folded: `dev-items.json` extracted in Task 0 feeds the ban grep | Plan Tasks 0, 1 |
| MX-m1 | Folded: `lib/transcript.ts` in Task 1 | Plan Task 1 |
| MX-m2 | Folded (P3): Task 1 owns `lib/types.ts` and `lib/batch.ts`; lanes are file-disjoint otherwise, and `runner.ts` and `podman.ts` stay in one lane | Plan Task 1, lanes |
| MX-m3 | Folded: `run.ts` refuses before any container; `batch.ts` in Task 1 | Plan Tasks 1, 3 |
| MX-m4 | Folded: `npm run check` in every chain gate | Plan header |
| MX-m5 | Folded as a pass 2a carry-forward | Plan Task 17 |
| MX-m7 | Folded: the live check writes to a scratch root; Task 0 checks page identity at the pin | Plan Tasks 0, 2 |
| MX-m10 | Folded: absent lists from Task 2; development precision per verified Opus control run | Spec, Tuning; plan Task 9 |
| RK-m1 | Folded: the ban grep runs over every frozen text | Plan Global constraints, Tasks 8, 10, 11 |

### Refused

| ID | Reason |
| --- | --- |
| RK-B1 (render script only) | A script to render each blind dispatch costs a build deliverable for a one-sentence fixed wrapper; the transcript audit already proves which file the agent read. The rest of RK-B1 is folded above. |

## Build shape (P3)

Seven implementer tasks, each at four deliverables: 1 the report schema and shared types (serial,
owns `lib/types.ts` and `lib/batch.ts`); 2 export and preparation (lane A, `opus`); 3 the runner
(lane B); 4 path map, harness filter, and the operating characteristic (lane C); 5 planting tools
and the chain (lane C after 4); 6 judges and ledgers (lane B after 3, since it edits `runner.ts`
and `podman.ts`); 7 the scorer (after all merge). P3's group (d) splits into Tasks 4 and 7 to stay
at four deliverables, and the transcript audit (P6) joins the ledger script in Task 6, since both
parse session transcripts. The runner hashes the chain file for its stamp rather than importing
Task 5's module, so lanes B and C stay independent.
