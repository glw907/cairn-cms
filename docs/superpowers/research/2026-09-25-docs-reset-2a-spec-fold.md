# Docs reset pass 2a spec review: fold record

**Target:** `docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md` (reviewed at
`598902f3`, revised in the working tree). **Parent edit:** the "Amendments from pass 2a's
brainstorm" section of `docs/superpowers/specs/2026-09-23-docs-reset-design.md` only. **Reviews:**
`2026-09-25-docs-reset-2a-spec-review-{contract,mechanics,risk,consistency}.md` in this directory.
IDs below are prefixed by lens: `con` consistency, `ctr` contract, `mec` mechanics, `rsk` risk.

Every finding was checked against the source before folding: the on-map plants by running the
round 0 maps over `fixtures/dev-plants.json` (P03, P05, P06, P07, P09, P11, P14, P16), the chain's
reader stage at `docs-page-chain-v2.js:783-796`, `DEVELOPMENT_BATCH_NAMES`, `itemCount`, the
packet field spreads at `judge-packets.ts:700` and `:783`, `findingCountsForRun`,
`REPORT_REQUEST`, round 1's `byJob` (scripter 7, all others 0), the parent's teardown line, the
manifest's `<audience>/<slug>` keys, and the pass 1b post-mortem's unit costs.

**Counts:** 55 findings. 53 folded: four by removal once CR6 dropped the free floor (two more
in part), and one (con m1) as owed errata. 2 go to owner ruling 1 (the ceiling). None refused
outright; two are folded with one part refused, noted in place.

## Dispositions

| IDs | Finding | Disposition |
| --- | --- | --- |
| con B-1, mec B-1 | Omission plants (P05, P11, P14) have no scored field | Folded, CR1: typed `missing[]` `{ quote, needed, evidence }` beside `wrong[]`, both scored by the catch judge and adjudicator (Rulings; §1 Shapes; §2 Sample names the omissions). P05 misreading corrected in "The finding". Part refused: mec B-1's recommended option (a), showing `ruleCandidates[]` to judges, would undo 1b's allow-list guarantee and score unquoted wishes. |
| con m5, ctr C5, mec M-1, rsk M1 | `wrong[]` never reaches the adjudicator, agreement packet, field union, or `itemCount` | Folded, §1 1b deliverables and acceptance, including rsk M1's packet-count check. `blockedBy` not added: the harness filter tolerates null and the adjudicator rules harness (§1 Shapes). |
| ctr C10 | Old reports must still load | Folded, §1 1a (optional on read) and its acceptance on `pass1-trimmed.json`. |
| ctr C1, ctr C4b, mec m-2, rsk M3, con m4 | Vacuous precision, misquoted baseline, undefined pooling | Folded, CR2 and §2 condition 3 with its reasoning; §1 1c computes it. Denominator fixed at 5; unverified control runs count every item false. Baseline corrected to 1.4. mec m-2's two-control-runs option not taken (cost against a one-finding slack that already absorbs the variance). |
| ctr C4, mec m-3 | Wilson rationale against the scorer's Clopper-Pearson | Folded, CR3 and §2 condition 1: both reported, difference stated. |
| con M-1, ctr C6, mec M-3, rsk M4 | §3 misdescribes the chain; no-go branch leaves findings blocking; acceptance cannot tell branches apart | Folded, CR5 and §3: one build with `gatingClasses`, a fixture case per branch in `docs-page-chain-v2.fixture.test.mjs`, the judge-less filter stated, budget equal per branch. |
| ctr C15 | Convenience divergences should not block | Folded, §3: `diverged[]` is advisory in every class. |
| rsk m7 (chain half) | A gate passes empty when every reader run is unverified | Folded, §3: such a page escalates in a gating class. |
| con M-2 | Pooled go ignores pass 1b's per-class outcome | Folded, CR4 and §2 "Per-class outcome": pooled go necessary, per-class recall at three quarters plus a catch per job, precision pooled, docs-only always advisory. |
| con M-5, mec M-4, ctr C11, rsk m2 | The free floor needs a packet mode, prompt rule, and task | Folded by removal, CR6. The record cites the audit's 13 of 24, labeled as the audit's reading. |
| rsk m1 | Floor and pilot output locations; rescoring in place | Floor half moot (CR6). Pilot half folded, §2 Scoring: everything under `tuning/pilot-2a/`, nothing under `round0/` or `round1/`. |
| rsk m6 | Round 0 reports live only in cache | Pilot half folded, §2 Scoring (reports copied into `tuning/pilot-2a/`, the scored report named). Part refused: committing round 0's reports served only the dropped floor; the 1b records already carry its figures. |
| con M-3, rsk M5 | Teardown at 2a's close breaks the operator reader class | Folded, CR7: §8 runs the dry-run listing as a health check; parent amendment moves the teardown. Not an owner fork: one answer, since tearing down breaks a class the chain uses. |
| mec M-5, ctr C8 | Profile frontmatter has no route into the chain; item 4 acceptance cannot fail; exemplar ids undefined | Folded, CR8 and §4 4a (schema file, failing test, render script, one invocation per profile), exemplar id = `<audience>/<slug>`, 4b acceptance limits provisional profiles. |
| ctr C8 (deliverable note) | Item 1 exceeds two deliverables | Folded, §1 split into 1a, 1b, 1c; §4 split into 4a and 4b; §3 at two. |
| mec M-2 | Dev scorer refuses a pilot batch name | Folded, §1 1c: five explicit `pilot-2a-<job>` names. |
| ctr C3, mec m-4 | Breadth needs per-plant `runsCaught` | Folded, §1 1c. |
| ctr C2 | Recall denominator not fixed; a judge failure scores as a reader miss | Folded, §2 Scoring: named inputs, the validity precondition, total pinned at 16. |
| con m6, mec m-1, rsk m3, ctr C7 | Init baseline keyed to CLI version, not prompt; autoupdater released; no real-output fixture before a run | Folded, §2 Preconditions: the CLI hold, re-pin only if unpinned, one smoke run supplying the fixture; an init-only failure is infrastructure. |
| rsk m4 | A crash loses a whole batch | Folded, §2 Sample (five per-job batches) and the execution rules (inhibitor, copy before `--resume`). |
| rsk m5 | Nothing checks the planted trees; job ids collide with round 1 | Folded, §2 Preconditions (sha256 against round 1 keys) and §2 Scoring (never scored beside round 1). |
| rsk M2, mec m-5 | `wrong[]` quote failures can flip the verdict | Folded, §2 "Runs and verification": the verdict waits for a verifier check when two or more planted runs fail only on new-field quotes; the record reports each run's verification. Resolved to reverify-or-stand rather than a standing "inconclusive" verdict, so the pilot always ends in a verdict. |
| con m7, ctr C9 | Gate weaker than 1b's; wrong test path | Folded, §1 Gate (1b's chain gate with the memory override, the `src/tests/unit/docs-readers` path) and `ban-grep.ts` in 1a acceptance. |
| ctr C12 | R9 wording; a new-field item matching no plant | Folded, §2 "Runs and verification" and the end of condition 3's reasoning. |
| ctr C13 | Per-field catch attribution | Folded, §2 Record (from the catch key). |
| ctr C14 | Items 5 and 6 have no acceptance | Folded, §5 and §6 acceptance lines. |
| rsk m7 (exemplar half) | Exemplar deletions cannot be undone | Folded, §6: a rejected capture is marked in the manifest; the fold reruns the schema test. |
| con m2 | Designer theme-guide input neither carried nor dropped | Folded, Out of scope: moves with the theme page to the first drafting pass. |
| con m3 | The exemplar rules cited live in a replaced section | Folded, parent amendment keeps item 3's selection rules; §6 cites them. |
| con m8 | No-go chain has neither grader nor gating reader (marked owner fork) | Folded as option (a), not a fork: O12 already rules readers advisory on a no-go. §2's no-go report names the evidence gap. |
| con m9 | Four smaller lines | Folded: the disjoint-jobs rule carries to the first drafting pass (Out of scope); no regression floor (§2 Labels); the owed `claude-tooling-sync verify` cleared before §3, and 4b's acceptance adds it; the model citation now rests on the parent amendment, which also flags pass 2b's Fable lines. |
| con m1 | STATUS and ROADMAP carry 6M | Owed errata, below. |
| con M-4, mec m-6 | Budget rows below 1b's measured unit costs | Owner ruling 1. Every row re-estimated in the spec's Budget from 1b's units and the revised design: about 13.1M on either branch. |

## Owed errata (files this fold may not edit)

- `docs/STATUS.md` line 29 and `ROADMAP.md`'s pass 2a bullet: "ceiling of 6M, flag 5M" becomes
  B3's 7M and 5.6M, pending owner ruling 1; STATUS's "about 0.6M" pilot figure becomes 1.2M.
- `ROADMAP.md`'s designer theme-guide input: re-file under the first drafting pass.
- `docs/internal/record/2026-09-23-scratch-site.md`, "Teardown for pass 2a's close": the heading
  and first line move to the close of the last drafting pass that runs `docs-and-binary` readers.
- Dotfiles: restore `DISABLE_AUTOUPDATER=1` before the smoke run and release it after the last
  pilot judge batch.
- The `claude-tooling-sync verify` owed from pass 1b, cleared before §3.

## Second fold

**Input:** `2026-09-25-docs-reset-2a-spec-fold-verification.md` (a cold verification read of the
fold at `1f718a2e`): 0 blockers, 2 majors, 8 minors. Each finding was checked against the source
before folding: `docs-page-chain-v2.js:480`, `:501`, `:586-591`, `:849-864`, and
`APPLIED_SCHEMA`'s status enum (`:291`); the reader-defect ids in `readerDefects` (`:783-796`);
`buildCatchRunRecords` (`lib/score-assemble.ts:306-322`); `byJob[*].onMapPlantRunRecall` and
`onMapRecall` in `score.ts:397-418`; and the pass 1b post-mortem's build-task costs. The M1 and
M2 dispositions are conductor rulings under B2, recorded in the spec as CR9 and CR10. **Counts:**
10 folded, none refused.

| ID | Finding | Disposition |
| --- | --- | --- |
| M1 | The applied read cannot report a false item as not applied; the redraft must apply every finding | Verified: the redraft prompt says "apply every finding below, blocking or advisory" and the applied read grades only whether a change was made. Folded as option (a), CR9: a new build task 3b adds a decline path. The redrafter may decline any reader item with a quoted source `path:line` or fact id; the applied read rules each decline "evidence holds" (resolved) or "evidence fails" (escalates, in every class). The change is coherent with the chain: one new report field, two new applied statuses, and one branch in the existing escalation check. The unsupported sentence is struck; §3's guard paragraph now names the decline ruling as the per-item judge. Fixture cases: a false `wrong` item declined with evidence that holds (accepted, text unchanged) and a decline whose evidence fails (escalates). The chain became two build tasks (3a, 3b) under the two-deliverable rule. |
| M2 | The budget range does not reproduce from its basis, and two rows sit below every 1b task | Verified: 1b's seven build tasks run 0.96M to 3.82M, mean 2.0M. Folded, CR10: 1c and 4a lifted to 1.0M, the chain priced as 3a 1.2M and 3b 1.0M, the range computed per build task at 0.96M and 2.0M with the other rows fixed. Full design about 14.5M (13.5M to 19.7M); option (b) about 11.8M (11.0M to 15.2M). Under (b), 4a stays whole, since at the per-task floor splitting it moves no cost out of the pass and adds a task later. Owner ruling rewritten: measured against B3's 7M, (a) raised to 19M flag 15.2M, (b) to 15M flag 12M so each estimate sits below its flag; (c) recomputed. Recommendation stays (b): the numbers move both options up together and leave the placement argument intact. Parent amendment's "about 13M" updated to 14.5M. |
| m1 | Smoke run's place in the task order unstated | Folded, §1 order line (1a, smoke run, 1b, 1c) and §2's smoke bullet. |
| m2 | Per-class recall has no source; `onMapRecall` is the wrong measure | Verified (`recallOf` needs two catches). Folded, §2 Per-class outcome names `byJob[<job>].onMapPlantRunRecall` summed over the class's jobs. No scorer change. |
| m3 | The control-run list has no source | Folded, 1c takes the five expected control ids explicitly and refuses when one is absent; acceptance added. |
| m4 | Unverified runs' judging unstated | Verified: `buildCatchRunRecords` notes a planted run with no joined key as a problem. Folded, §2: every run is judged, verified or not. |
| m5 | Verifier-check trigger counts only planted runs | Folded, §2: any control run, or two or more runs in all. "The misses stand" now reads "the runs stand as scored", since control runs have no misses. |
| m6 | 4a's render fixture cannot use a profile that does not exist | Folded, §4 4a: both tests run on a synthetic fixture profile; 4b's acceptance renders every authored profile; the execution rule names the synthetic profile. |
| m7 | `gatingClasses` default empty changes current behavior; new defect ids unnamed | Folded, §3 3a: the header documents the default, existing reader-defect fixture cases pass a gating class, and the ids `rd-<jobId>-wrong-<k>`, `-missing-<k>`, `-diverged-<k>` are named. |
| m8 | Owner-ruling wording | Folded in M2's rewrite: measured against B3's 7M; (b) names the 2.2M landing above the first drafting pass's 1.5M per-pass line and the 0.5M on pass 2b; the render-path mismatch in 4b is gone, since (b) keeps 4a whole. |
