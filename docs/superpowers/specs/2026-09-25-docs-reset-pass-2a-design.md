# Docs reset pass 2a: design

**Date:** 2026-09-25. **Status:** approved design, revised by the spec-review fold
(`docs/superpowers/research/2026-09-25-docs-reset-2a-spec-fold.md`); one owner ruling open (the
ceiling, below). **Parent:** [`2026-09-23-docs-reset-design.md`](2026-09-23-docs-reset-design.md),
whose "Amendments from pass 2a's brainstorm" section points here. **Owner rulings:** O12 (Geoff,
2026-09-25) and the three brainstorm rulings below. **Inputs:** the pass 1b validation record
(`docs/internal/record/2026-09-24-docs-reset-1b-validation.md`), its tuning record
(`docs/internal/record/2026-09-24-docs-reset-1b-tuning.md`), the pass 1b post-mortem (foot of
`docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`), and `ROADMAP.md`'s docs reset entry.

Pass 2a changes what readers report, tests the change in a go/no-go pilot, sets per reader class
whether reader findings block in the page chain, writes the audience record, and reviews it and
the exemplar corpus. The formal chain-depth trial, the freeze, and all page drafting are out; the
chain's depth follows reader evidence page by page in the drafting passes.

## Rulings

- **O12 (Geoff, 2026-09-25).** Pass 2a opens with a go/no-go reader pilot on round 1's planted
  trees. Readers join the chain as its reader stage only if on-map recall per plant-run rises to a
  clear majority, and stay advisory otherwise. Then the profiles and the exemplar review, with no
  formal trial and no freeze. Pass 2b gets 8M; drafting passes are budgeted at 0.7M per page plus
  1.5M per pass; the program cap is about 45M counted. After the first drafting pass, the measured
  cost per page is compared with 0.7M, and the chain or the page count is cut, never the cap.
- **B1: the reader change is a typed `wrong[]` field (Geoff, 2026-09-25).**
- **B2: the pass mark and every method call are the conductor's, set on published practice
  (Geoff, 2026-09-25; the `methodology-calls-are-claudes` memory).** CR1 to CR8 are made under it.
- **B3: ceiling 7M, flag 5.6M (Geoff, 2026-09-25).** No review lens is cut to fit. The honest
  estimate is now about 13M; owner ruling 1 below asks Geoff to set the ceiling again.
- **CR1 (conductor): a typed `missing[]` beside `wrong[]`.** Three of the eight on-map plants are
  omissions (P05, P11, P14). With `ruleCandidates[]` unscored, a `wrong[]`-only change caps the
  pilot at 10 of 16 plant-runs, below the recall bar by construction. `missing[]` gives an omission
  a scored, quoted home. `ruleCandidates[]` stays an unscored wish list.
- **CR2 (conductor): the precision bar tests the new fields, with the denominator fixed at 5.**
  The earlier bar could pass vacuously (an unverified control run dropped out) and sat on a
  misquoted baseline (about 1.2, where the five pilot jobs give 1.4). Reasoning under item 2.
- **CR3 (conductor): the recall bar stays 12 of 16 on the Wilson interval**, and the record
  reports the scorer's Clopper-Pearson interval beside it, because a pre-registered count should
  not move with the choice of interval.
- **CR4 (conductor): the outcome is per reader class, as pass 1b's O4 was.** A pooled go is
  necessary; each class then gates only on its own jobs' catches. The docs-only class stays
  advisory, since it has no measurable plants.
- **CR5 (conductor): item 3 describes the chain as it is.** `docs-page-chain-v2.js` already runs
  a reader stage whose stalls and assumptions block. The task makes blocking a per-class setting,
  so the go and no-go branches are one build with a different class list.
- **CR6 (conductor): no free-floor rescore.** It needed a packet mode and a prompt variant for a
  figure the 1b audit already supplies (13 of 24 noticed). The record cites the audit's figure,
  labeled as the audit's reading.
- **CR7 (conductor): the scratch-site teardown moves to the close of the last drafting pass that
  runs operator readers.** Tearing it down at this pass's close would break the
  `docs-and-binary` class, which the chain uses in both branches. The site costs nothing to keep.
  Recorded in the parent amendment against parent pass 1 item 0.
- **CR8 (conductor): a named task owns the profile format and its rendering.** The chain takes
  one profile string per call and cannot read files, so a script renders a profile's frontmatter
  into that string, and a test holds the frontmatter to a schema.

## The finding this pass answers

In pass 1b's tuning rounds, on-map recall per plant-run was 2 of 16 and 1 of 8. The catch-ruling
audit found no judge or criterion defect. Of 21 misses, 11 were true misses and 10 were defects
the reader noticed, routed around, and filed only in `ruleCandidates[]`, which the judge never
sees. Round 1's readers stated some outright there: the designer reader wrote that the docs give
`/style-guide` while the route directory is `styleguide` (P06), and the extender reader named the
disagreeing `section.ts` paths (P09). The operator reader wrote that the remedy "should also say
how to declare AUTH_DB" (P05), which is an omission claim, not a false-statement claim.

The cause is the report request (`scripts/docs-readers/lib/runner.ts`, `REPORT_REQUEST`). It
offers a slot for what the docs "should have told you" and none for a statement that is false or
a step the job needed that the page left out. Reporters file in the categories a form offers, so
both kinds went into the wish slot, unscored.

## 1. The reader change (three build tasks)

**Shapes.** `wrong[]`: each statement on a page the reader found false, as
`{ quote, pageSays, actual, evidence }`. `missing[]`: each fact or step the job needed that the
page did not give, as `{ quote, needed, evidence }`, where `quote` is the nearest line, in the
section the reader relied on, where the content belonged. Both are filed even when the reader
worked around the gap easily. `quote` has the existing quote shape and the existing verification
rule. Neither field carries `blockedBy`: the harness filter tolerates an item without one, and
the adjudicator rules an item caused by an absent-list path as `harness`. `ruleCandidates[]`
narrows to wishes the job did not need, and its prompt line says so.

**1a. Report fields.** Deliverables: (1) both fields through the report schema, `REPORT_REQUEST`,
the transcript parser, the saved-report loader (both fields optional on read, defaulting to `[]`,
so rounds 0 and 1 still load), and `lib/verify.ts`; (2) pass 1b's three comment-only carries: the
comment at `lib/runner.ts:731-734` implying an unenforced prompt-hash match, the garbled comment
at `lib/class-schema.ts:68-69`, and a note on the development catch test's one-plant fixture.

**1b. Judge side.** Deliverables: (1) the catch, adjudicator, and agreement packet builders, the
field union and raw-field allow-list in `judge-packets.ts`, and `itemCount` in
`lib/score-assemble.ts`, all carrying both fields; (2) `catch-judge.md`, `adjudicator.md`, and
`agreement.md` each name both fields with a field rule: a `wrong[]` item claims the page is false,
a `missing[]` item claims the page is silent where the job needed it, and either still has to meet
the plant's criterion (catch) or earn its ruling (adjudicator).

**1c. Scorer.** Deliverables: (1) development mode accepts the five pilot batch names
`pilot-2a-<job>` (explicit names beside R5's three, never a prefix rule); (2) development output
adds per-plant tallies `{ plantId, job, runsCaught }` and a pooled precision block over a fixed
list of control runs: an unverified control run stays in the denominator with every item counted
false (R3, `findingCountsForRun`), and false subject groups split into new-field (any item from
`wrong[]` or `missing[]`) and other. Rounds 0 and 1 verified every control run, so their figures
do not change.

**Gate for all three:** `CAIRN_GATE_LANE=light CAIRN_GATE_MEMORY_MAX=6G CAIRN_GATE_MEMORY_HIGH=5G
cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run
check:comments && npm run check'` (pass 1b's chain gate; the light lane's 3G cap runs
`svelte-check` out of memory).

**Acceptance.**

- 1a: a fixture report with one `wrong[]` and one `missing[]` entry parses and verifies; a
  fixture whose `wrong[]` or `missing[]` quote does not match its page fails verification;
  `fixtures/saved-reports/pass1-trimmed.json` still verifies with both fields read as `[]`;
  `ban-grep.ts` passes on the new prompt lines.
- 1b: a `wrong[]`-only and a `missing[]`-only fixture report each build catch, adjudicator, and
  agreement packets carrying the item under its own field name; an unverified run's `itemCount`
  includes both fields; the packet builder refuses a packet whose key's new-field item counts
  differ from the source report's lengths.
- 1c: a pilot batch name scores and an unlisted name still refuses; a fixture catch through a
  new-field item shows in its plant's `runsCaught`; a fixture unverified control run with three
  items adds three to the pooled false total and its new-field items to the new-field count.

## 2. The pilot

**Sample.** Five jobs: operator, designer, extender, core developer, and scripter. The evaluator
sits out, since none of its development plants fell on its proxy map. Each job runs twice on its
round 1 planted tree and once on its control tree, all Opus 5.5: fifteen runs, in five per-job
batches (`pilot-2a-<job>`) so a crash costs one job. The on-map plants are operator P03 and P05,
designer P06 and P07, extender P09 and P11, core developer P14, and scripter P16: 8 plants, 16
plant-runs. P05, P11, and P14 are omissions; the other five are false statements. P05's criterion
accepts "incomplete or inconsistent", so either field can catch it.

**Preconditions, before the first pilot run.**

- The host CLI is held (`DISABLE_AUTOUPDATER=1`, as dotfiles `4265aea` did) from the smoke run
  through the last pilot judge batch. The init baseline is keyed by CLI version and does not depend
  on the prompt; it is re-pinned with `--probe-init` only if the host version is not already pinned
  (2.1.280 to 2.1.282 are).
- One smoke reader run (a control job, unscored) on the new prompt verifies its init, and its
  report becomes the pinned fixture for every cross-stage shape. If it files no `wrong[]` or
  `missing[]` entry, the fixture adds one to the real report's shape and says so.
- Each planted page's sha256 equals the value its round 1 catch key records under `inputs`; a
  mismatch stops the pilot until the tree is rebuilt through round 1's export path.

**Runs and verification.** Every run gets the runner's one rerun. A planted run unverified after
its rerun counts as a miss (R9). A control run unverified after its rerun stays in the precision
denominator with every item false. An unverified run whose only problem is an init-baseline
mismatch is infrastructure: re-pin and rerun, never counted. If two or more planted runs are
unverified only because of a new-field quote, the verdict waits while the conductor checks the
verifier against those quotes: a verifier defect is fixed and the runs rechecked with
`reverify.ts` (the record names which report it scored); otherwise the misses stand.

**Scoring.** One `score.ts dev` invocation over the five batch reports and their judge batches,
with `--plants scripts/docs-readers/fixtures/dev-plants.json` and
`--map <job>=scripts/docs-readers/tuning/round0/maps/<job>.json` for each job. Every pilot
artifact (reports copied from the cache, keys, rulings, `score.json`) lives under
`scripts/docs-readers/tuning/pilot-2a/`; the pilot never writes under `tuning/round0/` or
`tuning/round1/`, and never scores beside round 1's keys, since the job ids repeat. Before any
verdict, pooled `onMapPlantRunRecall.total` is 16, per-job `onMapPlantCount` is 2, 2, 2, 1, 1,
five control runs are listed, and no note names a missing or unverified judge job. A failed
precondition means rerunning the missing reader or judge job, never a verdict: a judge failure is
not a reader miss.

**Pass mark, pre-registered.** Fixed here, before any pilot run. A pooled go needs all three:

1. **Recall:** at least 12 of 16 on-map plant-runs caught, with the denominator fixed at 16. 12 is
   the smallest count whose 95% Wilson interval clears one half (0.505 to 0.898; 11 of 16 gives
   0.444 to 0.858). `score.json` reports Clopper-Pearson, 0.476 to 0.927 at 12 of 16. The record
   prints both and says why they differ: Clopper-Pearson is exact and guarantees at least 95%
   coverage, so it runs wider; Wilson holds coverage near 95% on average. The bar is the count.
2. **Breadth:** at least 6 of the 8 plants caught at least once (per-plant `runsCaught`), and at
   least 4 of the 5 jobs catch at least one plant. The 16 plant-runs are 8 plants run twice, so
   runs on one plant are correlated; breadth keeps one easy plant (P16) from carrying the result.
3. **Precision**, over the 5 control runs: at most 2 false findings from new-field groups (0.5
   per run), and at most 8 false findings in total (round 1's five-job baseline of 7, which is 1.4
   per run, plus one).

Why this precision bar. The risk the change creates is over-filing into the new fields, whose
items will block pages on a go, so the first half bars them directly and tighter than pass 1b's
per-class bar of one per run. No baseline exists for them. The second half guards against the
prompt change pushing noise into the old fields. Its one finding of slack is there because all 7
of round 1's false findings came from one scripter run (that job moved from 1.5 to 7 between
rounds, and round 0's five-job figure was 0.7), so a bar at the baseline would test that run's
variance. A `wrong[]` or `missing[]` item on a planted run that matches no plant counts nowhere,
since only control runs are adjudicated.

**Per-class outcome.** Classes: operator is `docs-and-binary`; designer and extender are
`docs-and-site`; core developer and scripter are `repository`. On a pooled go, a class gates if its
own plant-run recall is at least three quarters (3 of 4, 6 of 8, 3 of 4) and every job in it
catches at least one plant; otherwise it is advisory. On a pooled no-go every class is advisory.
Precision stays pooled, since one control run per job gives no usable per-class rate. The
`docs-only` class (evaluator and editor jobs) is advisory whatever the result.

**Labels.** Every pilot figure is development-contaminated (these plants tuned the instrument) and
on the proxy map. The pilot is a go/no-go test, not a validated instrument. Pass 1b's regression
floor does not exist, so the five control runs are the change's only regression check.

**Record.** `docs/internal/record/2026-09-25-docs-reset-2a-pilot.md`: the preconditions met; the
three conditions with figures and their `score.json` sources; per-job, per-class, and per-plant
tables; the field that carried each catch (from the catch key); each run's verification outcome,
reruns included; both intervals; the audit's 13 of 24 as the comparison, labeled as the 1b
audit's reading and not a scored measure; the verdict and the list of gating classes item 3 takes.

**The fork.** On a pooled go, the pass continues unattended. On a no-go, the conductor sends
Geoff one short report (the figures, what the misses were, and the evidence gap a no-go chain
carries: no profile grader and no gating reader, against pass A's 14 defects that the other stages
accepted), then continues with every class advisory unless Geoff redirects.

## 3. The chain

`docs-page-chain-v2.js` (`~/.claude/workflows/`) already runs the reader runner between stage 1
and stage 2, and stage 2 makes every verified job's non-done outcome, stall, and assumption a
blocking reader defect (`readerDefects`, about lines 783-796). It types `stalls` and `assumed` as
strings where the runner emits `{ text, blockedBy }`, and never reads `diverged[]`.

One build serves both branches. Deliverables: (1) `READER_RESULTS_SCHEMA` and the loader carry
`stalls`, `assumed`, `diverged`, `wrong`, and `missing` as the runner emits them; (2) a
`gatingClasses` argument (default empty) sets blocking per reader class, read from the handoff's
`readerJobs` class for each job id (a job the handoff does not list is advisory).

- **A gating class:** the outcome, stall, assumption, `wrong[]`, and `missing[]` defects block.
  `diverged[]` is advisory, since it also collects workarounds taken for convenience. A page whose
  gating-class reader jobs all failed verification escalates, so the gate cannot pass empty.
- **An advisory class, or every class on a no-go:** the same defects are advisory. The redraft
  still receives them, the applied-findings read still grades them, and an unapplied one does not
  escalate the page.

What stands between a reader item and a block, since no judge runs in the chain: the runner's
verification (a report whose `wrong[]` or `missing[]` quote does not match a page line fails, so
every blocking item is anchored to a real line), the conductor's strike list between the stages
(for harness items), and the applied-findings read, which reports a false item as not applied.
That escalates the page to the conductor rather than changing it. A false item therefore costs
one conductor ruling, never a wrong page, and the pilot's precision bar bounds how often that
happens. That is why no judge is added to the chain.

**Precondition.** The `claude-tooling-sync verify` pass 1b left owed is cleared before this task,
so its green check is not confounded.

**Acceptance.** `docs-page-chain-v2.fixture.test.mjs` gains two cases on one fixture report built
from the smoke run's shape, carrying one entry in each field. With the job's class in
`gatingClasses`, the `wrong` and `missing` entries yield blocking reader defects, the `diverged`
entry an advisory one, an unapplied `wrong` defect escalates the page, and a page whose only
reader jobs are unverified escalates. With `gatingClasses` empty, every reader defect is advisory,
the redraft prompt still carries each, and the page does not escalate on an unapplied one.
`claude-tooling-sync verify` is green for the dotfiles commit.

## 4. The audience record

Six profiles: evaluator, editor, site operator, site designer, admin extender, and core developer
(parent ruling 3). One file per profile at `docs/internal/audiences/<profile>.md`, a new directory
outside the tarball.

- **Frontmatter** holds what the drafter needs: a one-sentence persona, the vocabulary contract,
  the knowledge and tool ceiling stated positively, arrival states, the success criterion, and
  exemplar ids. An exemplar id is `<audience>/<slug>`, the manifest's own local-path key, so it
  names both the manifest entry and the capture at `~/.local/share/cairn/exemplars/<id>/`.
- **The body** is the narrative record: who the reader is and the organization around them, what
  they arrive knowing, the agent half's arrival and precision needs (all but the evaluator and
  editor), and the people or evidence the profile rests on. The site designer is marked
  provisional until evidence supports it.
- **A shared file**, `docs/internal/audiences/README.md`, holds the format's prose, the hat map (a
  lone developer-operator; a volunteer operator with a hired designer; an agency across several
  roles; a large organization with a platform team as operator, an in-house design team, and a
  security reviewer as evaluator), and the audiences considered and rejected with reasons.

**4a. The format (build task, before authoring).** Deliverables: (1)
`docs/internal/audiences/profile.schema.json` and a unit test that parses every profile's
frontmatter against it, failing on a missing or extra key or an exemplar id with no manifest
entry; (2) `scripts/docs-audiences/render-profile.ts <profile>`, which prints the chain's
`profile` string from the frontmatter, pinned by a fixture test. A drafting pass runs one chain
invocation per profile, since the chain takes one profile string per call.

**4b. Authoring.** Opus 5.5 at `high` authors the record (the parent amendment is the ruling of
record). It reads pre-extracted inputs: the parent rulings, the charter
(`docs/internal/what-cairn-is-and-is-not.md`), the shipped agent guidance layer, the site round's
evidence, and the exemplar manifest. The same task updates `cairn-docs-drafter.md` to name the
format and how the rendered profile reaches its prompt.

**Acceptance.** 4a: the schema test fails on a fixture missing a key and on an unknown exemplar
id, and the render fixture matches. 4b: six profile files and the README exist and pass the schema
test; only the site designer is provisional, unless a profile carries an evidence note saying why
it is too; `claude-tooling-sync verify` is green for the drafter edit.

## 5. The audience review

Four cold Opus 5.5 lenses, each quoting what it read: target users across organization size,
checked against comparable CMSs' public evidence; boundaries between profiles; agent halves, from
the shipped guidance layer; and an open lens that also compares how peer docs divide audiences.
Each asks whether each profile is testable as written, and each finding carries evidence and a
proposed fix.

**Human reads.** One editor on a club site attempts one editor task on a current page, and Geoff
or an outside reader attempts one evaluator task. Both stall logs join the review. Geoff arranges
the editor. If a human read cannot happen before the fold, the fold proceeds and owner stop 1
records it as open.

One fold, by Opus 5.5 at `high`, with a revision record.

**Acceptance.** The revision record gives every lens finding a disposition; each human read is
recorded or listed open; the profiles still pass the schema test.

## 6. The exemplar review

One cold Opus 5.5 lens over the 68 captures at `~/.local/share/cairn/exemplars/` asks whether each
serves its profile or only looks polished. Gaps are filled per profile under the selection rules
in parent pass 2a item 3 (kept by the parent amendment), captured locally, and entered in
`docs/internal/record/docs-exemplars.md`. A rejected capture is marked in the manifest, never
deleted, since the store is outside git and a recapture is not a restore. Extension by page shape
stays in pass 2b, once the outline fixes shapes.

**Acceptance.** Each of the 68 captures carries a verdict in the manifest; each gap fill has a
manifest entry and a capture directory; the fold reruns the schema test so every profile's
exemplar ids still resolve.

## 7. Owner stop 1

A one-page decision brief opens the audience record and the corpus together: the profiles, the
review's unresolved findings, the human-read outcomes, and the corpus changes.

## 8. Close

- The scratch site's dry-run listing (`docs/internal/record/2026-09-23-scratch-site.md`, the
  teardown section, step 1) runs as a health check: the repository, Worker, D1, and token still
  exist and work. No deletion (CR7).
- STATUS, HISTORY, and ROADMAP; the post-mortem with both budgets scored; the pass 2b resume
  prompt.

## Execution rules from pass 1b's post-mortem

- Build tasks carry at most two deliverables.
- A fix round goes to the warm agent only inside its cache window; after a gap, a fresh agent
  gets the finding list and the diff range.
- Runner batches run as background commands with the sleep inhibitor armed; a fresh agent reads
  the result. `report.json` is copied before any `--resume`.
- Every cross-stage input shape (the report with both new fields, the judge packets, the chain's
  reader input, the rendered profile) is pinned in the plan with a fixture built from real output:
  the smoke run's report, or the first profile file.
- Fix rounds are budgeted as the norm.

## Out of scope

Drafting any page, including the parent's three trial pages, which move to the first drafting
pass. Two inputs move with them: the designer theme-guide content input (ROADMAP, Geoff
2026-09-24) and pass 1b's rule that measuring jobs stay disjoint from the chain's reader-stage
jobs. The freeze and its readiness items, which stay filed in
`docs/superpowers/research/2026-09-24-pass-1b-carries.md`. Sonnet readers. The labeled defect set
and the profile-grader comparison, which fall with the trial. The free-floor rescore (CR6).

## Budget

Counted by `session-ledger.ts` (input, output, and cache creation). Unit costs are pass 1b's
measured figures: a build task 1M to 3.8M with its fix rounds (1b's smallest were 0.96M to 1.44M),
a reader run about 35k, a catch judge about 3k, an adjudication about 15k, agent startup 25k to
60k.

| Item | Estimate |
| --- | --- |
| The reader change: 1a 1.3M, 1b 1.3M, 1c 0.8M | 3.4M |
| The pilot: smoke run, 15 runs with reruns, 10 catch judges, 5 adjudications, result reads, record | 1.2M |
| The chain (one build serves both branches) | 1.2M |
| The audience format (4a) | 0.8M |
| The audience record (4b) | 1.5M |
| The audience review and fold | 2.0M |
| The exemplar review, gap fills, and fold | 1.2M |
| Owner stop 1 brief | 0.2M |
| Conductor and close | 1.6M |
| **Total** | **about 13.1M on either branch (range 11M to 16M)** |

The branches cost the same because the chain's per-class setting is one build either way; a no-go
adds only its short report. The range runs from 1b's cheapest build tasks to its mean.

Attended time: plan approval, owner ruling 1, the no-go report if it happens, the two human
reads, and owner stop 1.

## Owner rulings needed

1. **The ceiling.** The design as revised is estimated at about 13.1M against B3's 7M. Whatever
   the ceiling, the scope costs about 6M more than O12 allotted pass 2a; under O12's rule (cut the
   chain or the page count, never the cap) that comes out of drafting, about 8 pages at 0.7M,
   unless the cap moves.
   - **(a) Raise to 15M, flag 12M.** Builds everything above in this pass.
   - **(b) Cut non-lens scope and raise to 12M, flag 9.6M (estimate about 11M).** Moves the chain
     task (1.2M) and 4a's render script (0.4M) to the first drafting pass, which first uses both,
     and the exemplar gap fills (0.5M) to pass 2b's page-shape extension. This pass builds the
     reader change, the pilot, the profile schema, the record, the review, and the exemplar
     review. The moved work costs the program the same, in the passes that use it.
   - **(c) Keep 7M, flag 5.6M.** The flag trips during the chain task (about 6.3M with the
     conductor's share), and the ceiling arrives near the start of the audience record, which then
     needs a follow-on pass with its own budget.

   **Recommendation: (b).** It lands the chain build beside its first use, where a real drafted
   page supplies the fixture and the pilot's gating classes are known, and it keeps every review
   lens. The program cost is the same as (a); only placement differs.
