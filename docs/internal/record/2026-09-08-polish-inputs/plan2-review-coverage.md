# Plan two adversarial review: spec coverage and scope

Lens: SPEC COVERAGE and scope only. Read-only review of
`docs/superpowers/plans/2026-09-08-docs-toolset-pass.md` (revision 1) against
`docs/superpowers/specs/2026-09-08-docs-standard-design.md` (revision 3). Unit 3c is plan one and
unit 5 is plan three; both are out of scope for this review except where the plan must consume or
hand off to them. The seven owner decisions are accepted as recommended.

**Verdict: covers the spec, with fixes.** Every unit-level acceptance criterion in units 1, 2, 3a,
3b, and 4 has a task, and all nine hand-off artifacts are produced and verified by R2. Six
requirements in the spec's normative body have no owning task, one plan addition is unfunded
accretion, and four bookkeeping inconsistencies would send a chain the wrong way at dispatch.

## Traceability

### Unit 1, the fact harvest

| Spec requirement | Task | Notes |
|---|---|---|
| AC1: every published page has a ledger entry for every extractable fact token, checked by script | H2, H3, H5-H11 | The script is `check:fact-coverage`, a plan addition. Earned. |
| AC2: every entry carries id, normalized claim, old file and line, tier plus proving source | H1 (schema), H3, H5-H11 | Covered |
| AC3: every gated block carries the fence verbatim and its fixture path | H1, H3, H5, H6, H7, H9 | Covered. H11's criteria name no block entry, but the front door carries none. |
| AC4: every page has an anchor map and the **five** keep classes | H1, H3, H5-H11 | **CHANGED to six.** The spec says "five further entry classes" and then lists six bullets. The plan resolves the arithmetic error upward to six. Correct call, undisclosed as a spec correction. |
| AC5: every published page has a page type assigned, **recorded in the ledger** | H4 | **CHANGED.** The plan records types in a separate `page-types.md`, not in the ledger. Defensible (the ledger is per track, the assignment is one table) and the harvest chain still produces it, but the plan does not name the change. |
| AC6: `check:ledger` re-resolves every `read` entry's `file:line` | G2-6 | Covered. Chain move to G2 is disclosed with its consequence. |
| AC7: commits a drafting-dispatch prompt fragment | H13 | Covered |
| Body: claim granularity, four verdict tiers, published page never a proving source | H1 | Covered |
| Body: ids monotonic, never reused, retired entries as tombstones | H1, G2-6 | Covered. Note the plan introduces `tier: retired` as a fifth tier value while eight other places assert "the four verdict tiers". G2-6 accommodates it; the copy does not. |
| Body: the quarantine and the coverage diff | H13, D1, D2 | Covered |
| Body: the roadmap row absorbed, the overrule recorded | R1 | Covered |

### Unit 2, the corpus

| Spec requirement | Task | Notes |
|---|---|---|
| One to two entries per registry page type | C2, C3 | Covered |
| Manifest carries source, license, fetch date, type, track, measured numbers, approval | C1, C4 | Covered |
| Every committed entry at most 400 words with a `## Source` section in the SQLite shape | C1, C2, C3 | Covered |
| Table-shaped entries structure-only; redistribution-blocked entries reference-only | C2, C3 | Covered |
| Three existing samples migrated; the record directory keeps no second copy | C1 | Covered |
| `check:anatomy` refuses a brief whose corpus entry is unapproved | G1-4 | Covered |
| Owner approves or names swaps (decision 7) | C5 | Covered |
| Body: **a page whose brief names two entries is compared against the closer of the two, and the report names both** | **MISSING** | `corpus_entry` is a single manifest id in G1-1, and D2's reviewer criterion names one entry. No task funds the two-entry case the spec explicitly allows and the manifest's two-per-type ceiling produces. |

### Unit 3a, the structure gates

| Spec requirement | Task | Notes |
|---|---|---|
| Brief schema, parser, one worked brief | G1-1 | Covered |
| Templates directory, one per type, section order from the spec, required/optional markers | G1-2, G1-3 | Covered |
| Reference-entry template derived from the shape `check:reference` already fixes | G1-2 | Covered |
| `check:anatomy` reads templates as its only source; brief failure first, then heading order | G1-4 | Covered |
| `check:headings` holds the seven rules, 5 and 6 against the lexicon at warning, a fixture per rule | G1-5, G1-6 | Covered |
| Markdownlint stock rules; `check:headings` reimplements none | G1-6, G1-7 | Covered |
| Both gates scoped to published paths, wired into `package.json` and CI | G1-4, G1-6, G1-7 | Covered |
| Front-door split to twelve; `check:anatomy` reaches the root `README.md` | G1-3, G1-4 | Covered |
| Body: **no page may name its own type or track** | **MISSING** | A page-level normative rule with no gate, no template note, and no task. |
| Body: **a list must be grouped once it passes nine items** (template orders exempt) | **MISSING** | Only the index-page instance lands, in G1-3. The general section-level rule has no home. |

### Unit 3b, the receipt and provenance gates

| Spec requirement | Task | Notes |
|---|---|---|
| The 2011 guidelines PDF vendored and referenced from the register | G2-1 | Covered |
| `check:provenance` fails an unclassified sentence, an unresolved id, an uncited extractable fact | G2-3, G2-4 | Covered |
| A fixture reproduces the front-door failure case | G2-4 | Covered |
| `check:prose-read` fails a page whose receipt is missing or **stale** | G2-5 | **CHANGED.** Decision 3 removes the hash, so "stale" narrows to a missing row or a dead page path. The narrowing is a decision consequence, and G2-5's header records it, but the plan never states that the spec's "stale" clause is thereby satisfied only in part. |
| `check:figures` seven assertions; `check:visuals` alt hole | G2-7 | Covered, blocked-on-owner |
| Every new or changed Vale rule ships a must-fire fixture, run every CI run on the pinned binary | G2-2 | Covered |
| External link-rot routine scheduled, reports rather than fails | G2-8 | Covered |
| Every new gate wired and scoped per Compatibility | G2-8 | Covered |
| The register records the standard and points at the spec | G2-1, R2 | Covered |
| Body: severity contract, ten review-chain steps, two-round revision cap | G2-1, D2 | Covered |
| Body: **paragraph length must vary across a page, by at least three sentences between shortest and longest** | **MISSING** | G2-2 ships 3-8 sentences, 150 words, 250 hard limit. The variance rule is a distinct normative prose requirement with no rule, no fixture, and no task. |
| Body: **the quality checklist**, twelve rows, walked before every receipt | **MISSING** | The spec makes it normative ("Every page walks one checklist before its receipt is written") and names the gate or person answering each row. No task commits it anywhere. It is tooling, not a page, so it belongs in this plan; plan three's reviewers cannot cite what does not exist. |
| Body: track vocabulary lists in the register decide which terms need defining | Not verified | The checklist and the words rule both lean on them. If the register already carries them, no task is owed; the plan should state that it verified so. |

### Unit 4, the demonstration page

| Spec requirement | Task | Notes |
|---|---|---|
| Brief, outline reviewed before prose, coverage diff, receipt | D1, D2, D3 | Covered |
| Every gate from 3a and 3b passes on the page | D2 | Covered |
| Fresh reviewer, different context and model family, names the corpus entry, carries the measurement table | D2 | Covered |
| Reader test run, one sitting, result in the receipt | D3 | Covered |
| Drafted one section per read, recorded in the dispatch | D1 | Covered |
| Comparison artifact with measured token and sitting cost; the owner's read is the closing gate, not a task criterion | D3 | Covered, and correctly held out of D3's criteria |
| Harvest that one page as the harvest chain's first harvest task | H3 | Covered |

### The nine hand-off artifacts

| # | Artifact | Task | Notes |
|---|---|---|---|
| 1 | Five ledgers at the dated-free paths | H3, H5-H11; verified R2 | Covered |
| 2 | Page-type assignment for all published pages | H4 | Covered. The plan derives the count rather than asserting the spec's 75, which is the better reading. |
| 3 | Corpus and manifest, approval filled, every type covered | C5 | Covered |
| 4 | Templates, each heading marked | G1-2, G1-3 | Covered |
| 5 | Brief schema, parser, worked brief | G1-1 | Covered |
| 6 | The five scripts plus markdownlint, wired, **each with its path scope and the named unit that removes the exclusion** | G1-7, G2-8 | **CHANGED to six, and partially short.** `check:ledger` and `check:fact-coverage` are wired but neither appears in `docs-standard-scope.json`'s writer list, so two of the six carry no path scope. R2's criterion 6 asserts all six have one. Fix: either scope them or state in R2 why a ledger validator and a coverage checker need none. |
| 7 | Vale rules with must-fire fixtures on 3.15.1 | G2-2 | Covered |
| 8 | Drafting-dispatch fragment | H13 | Covered |
| 9 | Demonstration measured cost | D3 | Covered |

### Decisions as they touch this plan

| # | Decision | Task | Notes |
|---|---|---|---|
| 1 | Federal Plain Language Guidelines adopted, PDF vendored | G2-1 | Covered |
| 2 | Paragraph numbers and the 40-word ceiling gated, average never gated | G2-2 | **CHANGED by owner decision 1:** both length rules ship at warning with no promotion path. Disclosed in Ruled inputs and Global constraints. |
| 4 | Three structure levels, page types with section orders, outline-first review | G1-2, G1-3, G1-4, D1 | Covered |
| 4a | Templates and the two structure scripts | G1-2, G1-3, G1-4, G1-6 | Covered |
| 5 | Two figure tests, two-lane routing rule, figure source and script committed | G2-7 (owner commits the substrate) | Covered, blocked-on-owner |
| 5a | `check:figures` seven assertions, `check:visuals` hole | G2-7 | Covered |
| 7 | Corpus approval | C5 | Covered |
| 8 | Review chain and severity contract | G2-1 | Covered |
| 8a | `check:provenance` and `check:prose-read` | G2-3, G2-4, G2-5 | Covered |
| 10 | Claude setup changes | P1 (consumed, not built) | Correctly out of scope; P1 verifies three of the seven pieces. The other four (output style, voice files, review agents, global `CLAUDE.md`) are unverified by P1 and unclaimed here. That is defensible only if plan one's own record covers them; P1's criteria should say so. |
| 11 | Demonstration approval before plan three is planned | D3, pass-end ritual | Covered |
| 12 | Rebuild rather than edit, reference entries excepted | D1; H9 notes; hand-forward | Covered as it touches this plan |
| 13 | Harvest before any brief, drafters quarantined | Chain H, H13 | Covered |
| 14 | **Ship as two pass plans** | **CHANGED to three, and the spec is left stale** | The owner's later direction split plan one into a dotfiles pass. The plan discloses this in its own header. But no task amends the spec: revision 3's decision row 14, its Implementation section ("Two pass plans run in order"), its 1a/1b concurrent-document structure, and its "What plan one hands plan two" heading all still describe two plans, and R1 amends only the *polish* spec. Plan three's author reads this spec first. Fix: add the amendment to R1 or R2. |

Also changed and undisclosed: the spec's Implementation section shapes plan one as **two concurrently
launched plan documents, 1a (units 2, 3a, 3b, 3c, and the unit 4 join) and 1b (unit 1)**. The plan is
one document with six chains. That is the better shape given `pass-execute-chains`, but the plan
should say it supersedes the 1a/1b split rather than leaving two structures on the record.

## What the plan adds that the spec does not fund

| Addition | Judgment |
|---|---|
| `check:fact-coverage`, the sixth script (H2) | **Earned.** Unit 1's first acceptance criterion demands a machine check that every extractable fact token has an entry, and no spec script does that: `check:ledger` validates the ledger's internals and `check:provenance` reads a brief that does not exist during the harvest. G2-4 imports its token classes rather than duplicating them, which is the leanest form. R2 records the addition. |
| Extend harvest split H7/H8, reference harvest split H9/H10 | **Earned.** Mechanical splits driven by the one-page-per-read protocol and the 4.0M chain budget. No scope enters through them; both halves share one file and one id sequence, and the sequencing note is correct. |
| Task P1, the preflight | **Earned.** The spec names two hard sequencing constraints (polish-C, the figures substrate) and the plan adds a third (plan one). One 0.1M task that four chains would otherwise each discover is the cheap form. |
| Chain R (R1, R2) | **Earned.** R2 is this repository's standing close ritual plus the hand-off manifest the spec's closing criteria imply. R1's roadmap absorption is required by decision 5's "recording the overrule with its reason". |
| `check:vale-fixtures` as a named script (G2-2) | **Earned.** The spec funds must-fire fixtures running on every CI run; a script is the leanest way to hold "a rule that reports nothing on its own fixture fails". |
| `docs-standard-scope.json` (G1-4) | **Earned.** The Compatibility section requires per-path scoping with a named remover per exclusion; a committed scope file with a self-check is the leanest form. |
| Verb lexicon plus `heading-grammar.md` (G1-5) | **Earned.** The spec names the committed lexicon and the allowlist escape. The companion doc is one page stating how to add a word, which the lexicon needs to be maintainable. |
| H12, the unverified list and the batched owner sitting | **Earned.** The spec forbids an `unverified` entry entering a brief but funds no mechanism to resolve one. Unit 1's sizing allows two to four sittings. |
| **`--plan-lint` mode on `check-fact-coverage.mjs`, its fixture, and its unit test (H13)** | **Accretion by adjacency.** The spec funds the drafting-dispatch *fragment*, artifact 8, and nothing more. H13 bolts a new gate mode, a new fixture, a package script, and a full-gate run onto a documentation task because a linter over plan-three plan documents sits next to the quarantine rule. It also enforces a rule against a document plan three has not written yet, so nothing in this plan exercises it against a real input. Cut it, or move it to plan three where its input exists. |

## Sizing and scope discipline

**Deliverable counts past four.** The plan states a count per task, which is the right practice; three
are over the bar and three more are understated.

- **G1-2 (6) and G1-3 (6).** Six templates each. Homogeneous and mechanical, so the count is
  tolerable, but G1-3 additionally carries the front-door type split, a design call the spec left as
  an open item. Six template writes plus one unresolved design decision in one dispatch is the shape
  that produces a template written against a type id nobody ratified. Consider splitting the front-door
  split out, or dispatching G1-3 with the split's answer already fixed by the conductor.
- **R2 (6).** Six deliverables across seven files. It is the standing close ritual, so the count is
  structural rather than accreted, but it is the task most likely to run long.
- **G2-7 (states 3).** Understated. Seven new assertions with fourteen fixtures, the `check:visuals`
  alt hole with its fixture, a register figure section, a `package.json` change, and a re-verification
  of three spec decisions against merged `main`. That is five or six deliverables, and it is the one
  blocked-on-owner task in G2.
- **G2-8 (states 3).** Understated. Wiring two `package.json` composites and a CI block, finalizing
  the scope file, creating a scheduled cloud routine with its recorded definition, and adding the
  non-blocking tell-scanner step.
- **G2-2 (states 4).** At the edge. Three Vale rules, a fixture per Cairn rule including the five that
  already exist, a runner, a unit test, `.vale.ini`, `package.json`, and CI.

**Scope past a task's spec unit.** No task reaches outside units 1, 2, 3a, 3b, and 4. Two smaller
boundary problems:

- **H2 sits in chain H but is a gate script.** The plan states the owner's chain assignment as "every
  gate script in G2" when it justifies moving `check:ledger`, then places `check:fact-coverage` in H.
  The reason is real (H cannot self-validate without it), but the plan should name the exception the
  way it named the `check:ledger` one.
- **Chain H's gate slot claim is wrong.** The architecture says "H and C consume no gate slot, since
  neither runs a build", and the concurrency budget of two full gates rests on it. H2's gate is
  `npm run check && npm test` and so is H13's. With G1 and G2 holding both slots, two H tasks can
  contend. Fix the concurrency note or move H2 and H13's gate to the scoped form the other H tasks use.

**Two bookkeeping inconsistencies that would misdirect a dispatch:**

- **The ceiling is stated twice and differently.** The header says 8.8M; the pass-end ritual says
  "tokens against the 9.0M ceiling". Fix one.
- **The script count is stated as six but the gate set grows by eight.** `package.json` gains
  `check:fact-coverage`, `check:anatomy`, `check:headings`, `check:provenance`, `check:prose-read`,
  `check:ledger`, `check:vale-fixtures`, and `lint:markdown`. R2 records "six new scripts". Either
  count the fixture runner and markdownlint, or say plainly that the six are the standard's checks and
  the other two are their harness.

## Required fixes before dispatch

1. Add a task (or extend R2) that amends the spec's decision row 14, its Implementation section, and
   its 1a/1b structure to the three-plan reality, and its "What plan one hands plan two" heading.
2. Fund the quality checklist. It is normative, it is tooling rather than a page, and plan three's
   reviewers and receipts both cite it.
3. Fund the paragraph-variance rule in G2-2, or record in the spec amendment that it is deliberately
   dropped with a reason.
4. Fund the two-entry corpus comparison rule, or narrow `corpus_entry` to one entry in G1-1 and record
   the narrowing.
5. Give `check:ledger` and `check:fact-coverage` a path scope, or amend R2's criterion 6.
6. Cut H13's `--plan-lint` mode from this plan.
7. Find homes for the no-self-naming rule and the nine-item list rule, or record both as plan three's
   reviewer checks.
8. Reconcile the ceiling (8.8M vs 9.0M), the script count (six vs eight), the keep-class count against
   the spec's own "five", the tier count against `retired`, and chain H's gate-slot claim.
