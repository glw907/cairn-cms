# Pass 1b plan fold

**Date:** 2026-09-24. **Fold agent:** `claude-opus-5-5`, over the plan at `dc37e38b` and the spec
at `da97461b`. A first fold landed as checkpoint `64ccc784`. Owner rulings O7 and O8 then cut the
pass to the core gate, and a second fold, uncommitted, rewrote the plan and this record to match
and re-checked the spec and the parent's "Amendments from pass 1b" section against them.
**Targets:** `docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`,
`docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md`, and the parent's
amendment section in `docs/superpowers/specs/2026-09-23-docs-reset-design.md`.

**Reviews folded.** ID prefixes: `SP` the spec prose review
(`2026-09-24-pass-1b-spec-prose-review.md`), `CT` the plan contract review, `MX` the plan mechanics
review, `RK` the plan risk review (`2026-09-24-pass-1b-plan-review-{contract,mechanics,risk}.md`).
97 IDs. Every finding was checked against the code, the pass 1 record, or the reviews' probes
before it was folded; none was taken on the reviewer's word.

**Counts.** 81 folded; 11 lapsed (O7), because they served only a cut item; 1 partly refused
(RK-B1: its render script is refused, and the rest is folded); 4 ruled (SP-B3 by O5, CT-OF1 by O1
and O8, RK-m7 by O6, RK-M6 by P7). Merged groups list every ID once. Where a folded finding lost
part of its scope to O7, the row says which part lapsed.

## Rulings applied

- **Owner (Geoff, 2026-09-24, final).**
  - O1 revised: ceiling 15M, flag 12M.
  - O5: if every class fails, pass 1b stops and reports to Geoff before pass 2a. The parent
    amendment supersedes "pass 2a starts only after pass 1b passes" for the partial case only and
    restores it for the all-fail case.
  - O6: a gated batch that reaches the ceiling finishes, and the ledger reports the overrun.
  - O7, core gate only: no transfer set (O3 withdrawn), no Sonnet arm (the pass 2a trial's
    readers are Opus only), no historical mining (the planter synthesizes every plant; the miner,
    the exclusion script, the filtered mirror, and the location table go), and one tuning round
    (no round 2, no tuner, no keep rule). Round 0 stays. Recall by source is no longer reported.
  - O8: the ceiling is the lower of 15M and the post-cut high estimate rounded up (19.8M, so 20M),
    which gives 15M; the flag is at 80 percent, 12M. The spec's cut list is removed. At pass 1b's
    close the conductor brings Geoff a program budget for the rest of the reset.
- **Conductor (methodology, delegated).**
  - P1: headless judges through the runner.
  - P2: the session ledger script, and pass 1's undercount.
  - P3: the build scope and the lanes.
  - P4: pre-freeze authoring by named agents.
  - P5: the post-freeze hash chain.
  - P6: the transcript audit. Its filtered-mirror clause lapsed with the miner under O7.
  - P7: no re-ruling after scoring.
  - P8: thresholds recomputed at the achieved plant count, after planting.
  - P9: a dry regression check.
  - P10: the spec prose dispositions.
  - P11: the budget rewrite, redone under O8.

## Verification notes

- The code facts in `CT` and `MX` hold at HEAD:
  - `verify.ts` fails a quote two lines off.
  - `excerpt()` truncates denials at 400 characters.
  - The runner has no rerun logic.
  - `prepare-baseline.ts` pins the core developer to `HEAD`.
  - `REPOSITORY_EXCLUDED_PATHS` omits the 17 `docs-readers-*` tests.
  - The per-run `cpSync` does not preserve timestamps.
- The spec findings hold against the pass 1 record (`2026-09-23-docs-reset-validation.md`):
  - `SP-W2` against the reader reliability list, and `SP-W3` against the F3 paragraph.
  - `SP-S3` against the record's row on the internal-docs link targets the export drops.
  - `SP-S2` against the run split: runs 1 and 2 were Opus and run 3 Sonnet, giving 16 verified
    control runs.
- `3a7485dd` is the pass's merge base with `main` and carries no pass 1b file, so it serves as the
  one page pin (`RK-M7`).
- **Budget under O8.** The mid estimate is 14.7M, the low 10.6M, and the high 19.8M. The drivers:
  - six full build chains and one half-size;
  - 51 reader runs;
  - 39 catch-judge runs and 36 adjudications.

  At the mid estimate the flag trips during the planted runs, and the pass closes under the
  ceiling. The first fold's mid of 18.7M before cuts drops by about 4M, from the transfer set, the
  Sonnet arm, mining, round 2, and one smaller chain.

## Dispositions

### Spec prose review

| ID | Disposition | Where |
| --- | --- | --- |
| SP-B1 | Folded as proposed (P10). With no pooled threshold, every class is advisory, with the achieved count. A class floor with no threshold is reported, and that class validates on the rest. | Spec, Path map "Recomputed thresholds"; Failure rule; plan Task 7 |
| SP-B2 | Folded as proposed (P10). Precision pools every planned Opus mapping run. A run still unverified after its rerun counts every catch-field item false. | Spec, Freeze "Reruns", Scoring "Pools", Bars table; plan Task 7 |
| SP-B3 | Ruled (O5) | Spec header and Failure rule; parent amendment; plan Task 15 |
| SP-W1 | Folded, with the stop at the 12M flag (P10). A burn is allowed only before any planted run is scored, and a burn past the flag stops for an owner ruling. The burn's cost is restated as about 3M under O7. | Spec, Freeze "Burns" |
| SP-W2 | Folded: the Sonnet failures are quoted from the record | Spec, What failed |
| SP-W3 | Folded: the control runs diverged silently, and one planted run reported F3 | Spec, What failed |
| SP-W4 | Merged with CT-M2, MX-M3, RK-B3 (below) | |
| SP-W5 | Folded: the plant record carries a one-line subject | Spec, Planting "Record"; plan Task 8 |
| SP-W6 | Merged with CT-M8 (below) | |
| SP-W7 | Lapsed (O7): it defined transfer pages | |
| SP-W8 | Folded: `blockedBy` is a fourth adopted change | Spec, Tuning |
| SP-W9 | Folded: the Bars table cites the five-item test | Spec, Bars table and "Judge agreement" |
| SP-W10 | Folded: the held-out report is labeled as inside the development set | Spec, Data split |
| SP-W11 | Folded: the job-to-class map opens Data split, and P01 to P17 and ICC are defined at first use | Spec, Data split; Path map |
| SP-S1 | Lapsed (O7, O8): it corrected the cut list, which is removed | |
| SP-S2 | Folded: 16 verified control runs, 12 Opus and 4 Sonnet | Spec, Bars "Precision" |
| SP-S3 | Folded: the internal-docs link targets join the harness list | Spec, What failed |
| SP-S4 | Folded: "with independent runs" | Spec, What failed |
| SP-S5 | Folded: ICC 0.76 is marked as the pre-refit value | Spec, Finding for pass 2a |
| SP-S6 | Folded: a held-out defect is found in two of its three runs | Spec, Scoring "Held-out"; plan Task 7 |
| SP-S7 | Folded: "Judge agreement" throughout | Spec; parent amendment |
| SP-S8 | Folded. The 40-line window runs either side of a two-run line, inside all-three sections. The widening adds sections by quote count, with ties broken by page order. | Spec, Path map |
| SP-S9 | Merged with CT-M3 (below) | |
| SP-S10 | Folded: `oc-curve.ts` reproduces the Bars figures, and Task 0 commits the fold's scratch scripts | Spec, Bars "The simulation's code path"; plan Task 0 |
| SP-S11 | Folded: sensitivity is over fresh plants, precision over control runs, plus judge agreement | Parent amendment |
| SP-S12 | Lapsed (O7): the unwrapped line was in the miner bullet, which is removed | |

### Merged groups (plan reviews)

| IDs | Defect | Disposition | Where |
| --- | --- | --- | --- |
| CT-B1, MX-B2, RK-m5 | The scorer rejects the unstamped reports that round 0 and tuning need | Folded: a development mode that is the only way to score unstamped reports, reads development batches only, and never emits a verdict | Plan Task 7 (1), Tasks 9 and 10 |
| CT-B2, MX-B3, RK-B1 | Frozen prompts and scripts have no author or builder | Folded (P3, P4). The planting-prompt author and the rubric author work in Task 8, the validity script is in Task 5, and every item is named in Task 11's acceptance. The miner prompt and the exclusion script lapsed (O7). RK-B1's wrapper is folded as fixed text, and its render script is refused (below). | Plan Tasks 5, 8, 11; spec Sequence 0 and 1, Freeze |
| CT-B3, MX-B4, RK-B2 | No automatic rerun | Folded (P3): one rerun, with every attempt kept. Batch stops are recorded per job and resume without consuming an attempt. Gated batches set `budgetTokens` above expected spend. | Plan Tasks 3 and 11; spec Freeze "Reruns" |
| CT-M1, MX-M2 | No proxy map | Folded: a proxy mode in `path-map.ts`, and the rubric author writes `dev-plants.json` | Plan Tasks 4 (2) and 8 |
| CT-M2, MX-M3, RK-B3, SP-W4 | The blind planter writes the held-out criteria, after their runs | Folded (P4): the rubric author writes them before round 0, and they are frozen | Spec Sequence 0, Planting "Record", Freeze; plan Task 8 |
| CT-M3, SP-S9 | The plant check cannot check for a shared subject while blind | Folded (P4): it sees the plant record, the code, and the development items' subjects only | Spec, Planting "Validity check"; plan Global constraints |
| CT-M4, RK-M1 | Stamps are checked for presence only; post-freeze inputs are unhashed | Folded (P5). The post-freeze chain is built, and the stamp carries its head. The scorer verifies the stamp against the manifest and every input against the chain. Ungated reports carry no stamp. | Spec, Freeze; plan Tasks 3, 5, 7, 12 to 15 |
| CT-M5, RK-M5 (close check) | Nothing proves agents used the frozen prompts; the close check is missing | Folded. The judges run through the runner (P1). Blind agents take a fixed wrapper naming the frozen file and its hash, and the audit confirms their reads. Task 16 restores the frozen-path check (P5). | Plan Global constraints, Tasks 6, 16 |
| CT-M6, MX-M1, RK-M2 | Judge packets and rulings have no plumbing; the judges run outside the runner | Folded (P1): judge classes and `judge-packets.ts`, opaque ids with a key file, rulings through `--json-schema`, and agreement pools fixed before any ruling | Spec, Scoring and Bars "Judge agreement"; plan Task 6 |
| CT-M7, RK-M4, MX-m11 | Hard-coded thresholds, a recompute on the wrong trigger, no capacity function | Folded (P8). Thresholds are recomputed after planting at every achieved count and enter the chain before the planted runs. The scorer reads that file. `path-map.ts` gains a capacity function. | Spec, Path map; plan Tasks 4, 7, 13 |
| CT-M8, SP-W6 | The validity script checks two rules | Folded, with one fixture per rule: the region (narrowed ranges included), spacing, absent-list stale paths, finding spans, and a difference from control | Spec, Planting "Validity check"; plan Task 5 |
| CT-M9 | The held-out, Sonnet, and transfer measures have no scoring path | Folded for the held-out runs: the catch judge rules them, and the scorer applies the found rule. The Sonnet and transfer halves lapsed (O7). | Plan Tasks 7 (4), 15 |
| CT-M10, MX-m6 | Malformed denial input | Folded: a tolerant parse, the adjudicator fallback, a missing `blockedBy` read as null, and a job with no absent list stops scoring | Plan Task 4 |
| CT-M11, RK-m2, MX-m8 | Export rules without criteria; commit neutrality; ordering | Folded. Fixtures cover mtimes, absent-list derivation, the planter's export, and the two-commit and dirty-status failures. Control and planted trees carry identical metadata and a neutral message. The order is overlay, normalize, then commit. | Plan Task 2 |
| CT-M12 | Verdict composition and pools are unproved | Folded: fixtures for an agreement failure, one class's precision failure, and a false finding in a tuning control run. The transfer and Sonnet pool fixtures lapsed (O7). | Plan Task 7 |
| CT-M13, MX-m9, RK-M5 (replay) | The close replays the test batch, unbudgeted | Folded (P9): a dry check | Plan Task 16 |
| CT-OF1, MX-B1, RK-m7, CT-m14 | Budget above the ceiling; the flag is unobservable; overrun at the ceiling | CT-OF1 and RK-m7 ruled (O1, O8, O6). MX-B1 and CT-m14 folded (P2, P11): the session ledger script, and the budget rewritten from measured figures with the flag's trip point per estimate. | Spec, Budget; plan header |
| MX-M4, RK-M7 | The export ships the harness's tests, the friction log, and development fixtures; there is no single page pin | Folded (P3). These are excluded from the gated and planter exports, fixtures move under `scripts/docs-readers/fixtures/`, and every export uses one page pin, `3a7485dd`. | Spec, The export; plan Global constraints, Task 2 |
| MX-M5 | Only the scripter is pinned | Folded: every job comes from `git archive` at the pin, the core developer included | Plan Task 2 (3) |
| MX-M6 | Transfer trees cannot be prepared | Lapsed (O7). Only the control-only mode for the six jobs remains, folded into Task 2 (3). | Plan Task 2 (3) |
| MX-M7, CT-m5, RK-m6, SP-W7 | The read-pages list is undercounted; transfer pages are undefined | Lapsed (O7): no transfer set, no read-pages script | |
| RK-M3 | Blindness rests on instructions; the miner's history holds every record | Folded (P6) for the agents that remain: granted-input copies, and the transcript audit with the spec's consequence before and after the planted runs. The filtered-mirror half lapsed (O7). The Agent tool's `CLAUDE.md` and memory index still reach every blind agent. They name no development item, so that residue is accepted. | Spec, Planting; plan Global constraints, Tasks 6 (4), 13 |
| RK-M6 | Re-ruling after scoring | Ruled (P7): removed. The `diff-reviewer` checks the record against the scorer only. | Plan Task 15, Models line |

### Single findings (plan reviews)

| ID | Disposition | Where |
| --- | --- | --- |
| CT-m1 | Folded: two lines off | Plan Task 1 |
| CT-m2 | Folded: a null, a string, and a missing `blockedBy` | Plan Task 1 |
| CT-m3 | Lapsed (O7): the keep rule is gone | |
| RK-m3 | Lapsed (O7): the keep rule and the round 2 trigger are gone | |
| CT-m4 | Folded. A judge fix during tuning applies to rounds 0 and 1, and absent lists and allowlists are not levers. | Spec, Tuning; plan Tasks 9, 10 |
| RK-m4 | Folded: each judge change is logged with the misruling it fixes and reviewed for the bans | Plan Task 9 |
| CT-m6 | Lapsed (O7): it checked the transfer texts | |
| CT-m7 | Folded: exact figures to two decimals, simulated ones within 0.02 at the seed | Plan Task 4 |
| CT-m8, MX-m12 | Folded. Task 1 captures the init event's model id and adds the shared legacy loader, and Task 3 checks the model id after each run. | Spec, Freeze; plan Tasks 1, 3 |
| CT-m9 | Folded: two, one, and zero verified runs | Spec, Path map; plan Task 4 |
| CT-m10 | Folded: seven plants or the count the map allows, and a job short of seven loses token plants first | Spec, Planting; plan Task 13 |
| CT-m11 | Lapsed (O7): it put a flag check before the transfer planting | |
| CT-m12 | Folded: a stratum-balance fixture, with agreement computed before Fable's replacements and the bars after | Spec, Bars; plan Task 7 (3) |
| CT-m13 | Folded: Task 0 extracts `dev-items.json` (id, subject, page), which feeds the ban grep | Plan Tasks 0, 1 |
| MX-m1 | Folded: `lib/transcript.ts` joins Task 1 | Plan Task 1 |
| MX-m2 | Folded (P3). Task 1 owns `lib/types.ts` and `lib/batch.ts`, and `runner.ts` and `podman.ts` stay in one lane. | Plan Task 1, lanes |
| MX-m3 | Folded: `run.ts` refuses before any container starts, and `batch.ts` changes in Task 1 | Plan Tasks 1, 3 |
| MX-m4 | Folded: `npm run check` joins every chain gate | Plan header |
| MX-m5 | Folded as a carry-forward to pass 2a | Plan Task 16 |
| MX-m7 | Folded. The live check writes to a scratch root, and Task 0 checks page identity at the pin. | Plan Tasks 0, 2 |
| MX-m10 | Folded. Task 2 supplies the absent lists, and development precision counts per verified Opus control run. | Spec, Tuning; plan Task 9 |
| RK-m1 | Folded: the ban grep runs over every frozen prompt and rubric. Its round 2 bundle and transfer-text halves lapsed (O7). | Plan Global constraints, Task 8 |

### Refused

| ID | Reason |
| --- | --- |
| RK-B1 (render script only) | A script to render each blind dispatch costs a build deliverable for a one-sentence fixed wrapper, and the transcript audit already proves which file the agent read. The rest of RK-B1 is folded above. |

## Build shape (P3, under O7)

Seven implementer tasks:

- Task 1, the report schema and shared types (4 deliverables). It runs serially and owns
  `lib/types.ts` and `lib/batch.ts`.
- Task 2, export and preparation (3 deliverables, lane A, `opus` upshift).
- Task 3, the runner (4 deliverables, lane B).
- Task 4, the path map, harness filter, and operating characteristic (4 deliverables, lane C).
- Task 5, the validity script and the chain (2 deliverables, lane C, after Task 4).
- Task 6, judges and ledgers (4 deliverables, lane B, after Task 3, since it edits `runner.ts` and
  `podman.ts`).
- Task 7, the scorer (4 deliverables, after all lanes merge).

O7 removed four things from the first fold's build: the generic transfer preparer, the exclusion
script, the read-pages script, and the scorer's Sonnet, transfer, and keep-rule paths. The runner
hashes the chain file for its stamp rather than importing Task 5's module, so lanes B and C stay
independent.
