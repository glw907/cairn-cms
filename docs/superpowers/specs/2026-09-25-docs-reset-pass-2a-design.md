# Docs reset pass 2a: design

**Date:** 2026-09-25. **Status:** approved design, for spec review. **Parent:**
[`2026-09-23-docs-reset-design.md`](2026-09-23-docs-reset-design.md), whose "Amendments from pass
2a's brainstorm" section points here. **Owner rulings:** O12 (Geoff, 2026-09-25) and the three
brainstorm rulings below. **Inputs:** the pass 1b validation record
(`docs/internal/record/2026-09-24-docs-reset-1b-validation.md`), its tuning record
(`docs/internal/record/2026-09-24-docs-reset-1b-tuning.md`), the pass 1b post-mortem (foot of
`docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md`), and `ROADMAP.md`'s docs reset entry.

Pass 2a writes the audience record, reviews it and the exemplar corpus, and decides whether reader
agents join the page chain as a gating stage. That last decision comes from a go/no-go pilot that
opens the pass and tests one reader change. The formal chain-depth trial, the freeze, and all page
drafting are out; the chain's depth follows reader evidence page by page in the drafting passes.

## Rulings

- **O12 (Geoff, 2026-09-25).** Pass 2a opens with a go/no-go reader pilot on round 1's planted
  trees. Readers join the chain as its reader stage only if on-map recall per plant-run rises to a
  clear majority, and stay advisory otherwise. Then the profiles and the exemplar review, with no
  formal trial and no freeze. Pass 2b gets 8M; drafting passes are budgeted at 0.7M per page plus
  1.5M per pass; the program cap is about 45M counted. After the first drafting pass, the measured
  cost per page is compared with 0.7M, and the chain or the page count is cut, never the cap.
- **B1: the reader change is a typed `wrong[]` field (Geoff, 2026-09-25).**
- **B2: the pass mark below, set by the conductor on published practice (Geoff, 2026-09-25,
  deferring the method call; see the `methodology-calls-are-claudes` memory).**
- **B3: ceiling 7M, flag 5.6M (Geoff, 2026-09-25).** O12's 6M did not cover the pilot's code
  change or the chain wiring. No review lens is cut to fit.

## The finding this pass answers

In pass 1b's tuning rounds, on-map recall per plant-run was 2 of 16 and 1 of 8. The catch-ruling
audit found no judge or criterion defect. Of 21 misses, 11 were true misses and 10 were defects
the reader noticed, routed around, and filed only in `ruleCandidates[]`, which the judge never
sees. Round 1's readers stated the defects outright there: the designer reader wrote that the
docs give `/style-guide` while the route directory is `styleguide` (P06), the extender reader
named the disagreeing `section.ts` paths (P09), and the operator reader named the missing
`AUTH_DB` binding (P05).

The cause is the report request (`scripts/docs-readers/lib/runner.ts`, `REPORT_REQUEST`). It
offers a slot for what the docs "should have told you" and none for a statement that is false.
Reporters file in the categories a form offers, so the errors went into the wish slot, unquoted
and unscored.

## 1. The reader change

- The report schema and `REPORT_REQUEST` gain `wrong[]`: each statement on a page the reader found
  to be false, as `{ quote, pageSays, actual, evidence }`, filed even when the reader worked
  around it easily. `quote` has the existing quote shape and is verified by the existing rule; a
  report whose `wrong[]` quote fails verification fails like any other.
- `ruleCandidates[]` narrows to content the reader found missing, not wrong. Its prompt line says
  so.
- The catch judge's packet (`judge-packets.ts`) includes `wrong[]` beside `stalls`, `assumed`,
  and `diverged`, and the catch-judge prompt names it. False-finding counting covers `wrong[]`
  the same way it covers the other scored fields.
- The same build task takes pass 1b's three comment-only carries: the comment at
  `lib/runner.ts:731-734` that implies an unenforced prompt-hash match, the garbled comment at
  `lib/class-schema.ts:68-69`, and a note on the development catch test's one-plant fixture.
- The first-turn prompt changes, so the init baseline (`init-baseline.json`) is re-pinned for the
  host CLI version the pilot runs on, and that version is held until the pilot's runs finish.

**Acceptance.** A fixture report with a `wrong[]` entry round-trips through verification and
reaches the catch judge's packet; a fixture whose `wrong[]` quote does not match its page fails
verification; the scorer counts a `wrong[]`-only catch; the `scripts/docs-readers` tests
pass under the light gate lane.

## 2. The pilot

**Sample.** Five jobs: operator, designer, extender, core developer, and scripter. The evaluator
sits out, since none of its development plants fell on its proxy map; its readers stay advisory
whatever the result. Each job runs twice on its round 1 planted tree and once on its control
tree, all Opus 5.5, fifteen runs. The five jobs carry 8 on-map plants (operator 2, designer 2,
extender 2, core developer 1, scripter 1), so the planted runs give 16 plant-runs.

**The free floor, first.** Rounds 0 and 1 are re-judged with `ruleCandidates[]` visible to the
catch judge, as a one-off development rescore. It measures what readers noticed but misfiled
(expected near 13 of 24 from the audit) and costs judges only. It does not change the pass mark.

**Pass mark, pre-registered.** Fixed here, before any pilot run. All three must hold for a go:

1. **Recall:** at least 12 of 16 on-map plant-runs caught (0.75). This is the smallest count
   whose 95% Wilson interval clears one half (0.51 to 0.90); 11 of 16 gives 0.44 to 0.86.
2. **Breadth:** at least 6 of the 8 plants caught at least once, and at least 4 of the 5 jobs
   catch at least one plant. The 16 plant-runs are 8 plants run twice, so runs on one plant are
   correlated and the effective sample lies between 8 and 16; breadth keeps one easy plant (P16)
   from carrying the result.
3. **Precision:** pooled false findings at most 1.5 per verified control run. A field that asks
   what was false invites over-filing; round 1 pooled about 1.2.

An unverified planted run counts as a miss (pass 1b ruling R9). Catches are counted in the
scorer's development mode (`onMapPlantRunRecall`), on the tuning proxy maps.

**Labels.** Every pilot figure is development-contaminated (these plants tuned the instrument)
and on the proxy map. The record says both, and says the pilot is a go/no-go test, not a
validated instrument.

**Record.** `docs/internal/record/2026-09-25-docs-reset-2a-pilot.md`: the floor rescore, the
three conditions with their figures and sources in `score.json`, per-job tables, and the verdict.

**The fork.** On a go, the pass continues unattended to item 3. On a no-go, the conductor stops
and sends Geoff one short report (the figures and what the misses were), then continues with
item 3's no-go branch unless Geoff redirects.

## 3. The chain

`docs-page-chain-v2.js` (in `~/.claude/workflows/`) today types `stalls` and `assumed` as strings
and never reads `diverged[]`. This task fixes the field types either way.

- **On a go:** the chain gains its reader stage. The reader runner runs between the draft stage
  and the redraft stage; the redraft receives `wrong[]`, `diverged[]`, `stalls`, and `assumed`,
  and the applied-findings check rules on each. Its first real use is the first drafting pass.
- **On a no-go:** reader reports reach the drafter as advisory input with no gate on them, and
  the chain relies on its scripted checks, the register editor, and the fact read.

**Acceptance.** A dry run of the chain against a fixture reader report passes every typed field
to the redraft prompt; `claude-tooling-sync verify` is green for the dotfiles commit.

## 4. The audience record

Six profiles: evaluator, editor, site operator, site designer, admin extender, and core developer
(parent ruling 3). One file per profile at `docs/internal/audiences/<profile>.md`, a new directory
outside the tarball.

- **Frontmatter** holds what the drafter needs, and the chain renders it into the drafter's
  dispatch prompt: a one-sentence persona, the vocabulary contract, the knowledge and tool ceiling
  stated positively, arrival states, the success criterion, and exemplar ids from the manifest.
- **The body** is the narrative record: who the reader is and the organization around them, what
  they arrive knowing, the agent half's arrival and precision needs (all but the evaluator and
  editor), and the people or evidence the profile rests on. The site designer is marked
  provisional until evidence supports it.
- **A shared file**, `docs/internal/audiences/README.md`, holds the format definition, the hat
  map (a lone developer-operator; a volunteer operator with a hired designer; an agency across
  several roles; a large organization with a platform team as operator, an in-house design team,
  and a security reviewer as evaluator), and the audiences considered and rejected with reasons.
- `cairn-docs-drafter.md` names the format and where the chain puts the frontmatter in its
  prompt.

Opus 5.5 at `high` authors the record (the 2026-09-23 model ruling, which replaced the parent
spec's Fable authoring). It reads pre-extracted inputs: the parent rulings, the charter
(`docs/internal/what-cairn-is-and-is-not.md`), the shipped agent guidance layer, the site round's
evidence, and the exemplar manifest.

**Acceptance.** Six profile files and the README exist; every frontmatter block parses against
the format definition; each profile names its evidence or is marked provisional.

## 5. The audience review

Four cold Opus 5.5 lenses, each quoting what it read: target users across organization size,
checked against comparable CMSs' public evidence; boundaries between profiles; agent halves,
from the shipped guidance layer; and an open lens that also compares how peer docs divide
audiences. Each asks whether each profile is testable as written, and each finding carries
evidence and a proposed fix.

**Human reads.** One editor on a club site attempts one editor task on a current page, and Geoff
or an outside reader attempts one evaluator task. Both stall logs join the review. Geoff arranges
the editor. If a human read cannot happen before the fold, the fold proceeds and owner stop 1
records it as open.

One fold, by Opus 5.5 at `high`, with a revision record.

## 6. The exemplar review

One cold Opus 5.5 lens over the 68 captures at `~/.local/share/cairn/exemplars/` asks whether each
serves its profile or only looks polished. Gaps are filled per profile under the parent's
selection rules, captured locally, and entered in `docs/internal/record/docs-exemplars.md`.
Extension by page shape stays in pass 2b, once the outline fixes shapes.

## 7. Owner stop 1

A one-page decision brief opens the audience record and the corpus together: the profiles, the
review's unresolved findings, the human-read outcomes, and the corpus changes.

## 8. Close

- The scratch site's teardown (`docs/internal/record/2026-09-23-scratch-site.md`, "Teardown for
  pass 2a's close"): a dry-run listing, then deletion on Geoff's confirmation.
- STATUS, HISTORY, and ROADMAP; the post-mortem with both budgets scored; the pass 2b resume
  prompt.

## Execution rules from pass 1b's post-mortem

- Build tasks carry at most two deliverables.
- A fix round goes to the warm agent only inside its cache window; after a gap, a fresh agent
  gets the finding list and the diff range.
- Runner batches run as background commands; a fresh agent reads the result.
- Every cross-stage input shape (the report with `wrong[]`, the judge packet, the chain's reader
  input, the profile frontmatter) is pinned in the plan with a fixture built from real output.
- Fix rounds are budgeted as the norm.

## Out of scope

Drafting any page, including the parent's three trial pages, which move to the first drafting
pass. The freeze and its readiness items, which stay filed in
`docs/superpowers/research/2026-09-24-pass-1b-carries.md`. Sonnet readers. The labeled defect set
and the profile-grader comparison, which fall with the trial.

## Budget

Ceiling 7M, flag 5.6M, counted by `session-ledger.ts` (input, output, and cache creation).

| Item | Estimate |
| --- | --- |
| The reader change (build task, review, simplifier) | 0.8M |
| Pilot runs, the floor rescore, and judges | 0.6M |
| The chain (full on a go, types only on a no-go) | 0.8M |
| The audience record | 1.2M |
| The audience review and fold | 1.4M |
| The exemplar review | 0.7M |
| Conductor and close | 0.8M |
| **Total** | **about 6.3M on a go, 5.5M on a no-go** |

Attended time: plan approval, the no-go report if it happens, the two human reads, owner stop 1,
and the teardown confirmation.
