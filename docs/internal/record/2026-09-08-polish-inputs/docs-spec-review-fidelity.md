# Fidelity review: docs-standard design spec against the approved proposal

Lens: FIDELITY only. Read-only review of
[`docs/superpowers/specs/2026-09-08-docs-standard-design.md`](../../../superpowers/specs/2026-09-08-docs-standard-design.md)
(revision 1) against
[`docs-standard-proposal.md`](docs-standard-proposal.md) (revision 9, HEAD) and the owner's two
post-approval directions. Reviewer: fresh context, 2026-09-08.

**Verdict: faithful with fixes.** Every normative rule in the proposal's four parts reaches the
spec with its meaning and its numbers intact, every one of the fourteen decision rows is restated
as adopted with its size, both owner actions are recorded as owed, and both owner directions are
carried into the implementation order, the acceptance criteria, and the risks. Six findings, one of
them a genuine unauthorized addition (`check:cadence`), the rest numeric or coverage slips.

## Traceability table

Line numbers are spec lines unless the cell says otherwise.

### Part 1: the prose rules

| Proposal requirement | Proposal line | Spec | Verdict |
|---|---|---|---|
| Federal Plain Language Guidelines, March 2011 revision, as the prose standard | 108 | 106 | carried |
| Vendor the PDF (plainlanguage.gov redirects; live guides re-cut) | 109-112 | 106-108, AC 589 | carried |
| Part I, audience: one reader at a time, audiences addressed separately | 114-115 | 111-112 | carried |
| Part II, organization: most important first, general before exception | 116-117 | 113-114 | carried |
| Part III, words: verbs not nominalizations, active voice, "must", one term per thing, define unknown terms per track vocabulary | 118-122 | 115-118 | carried |
| Part III, sentences: one idea, subject/verb/object close; qualification may ride inside on front door and extend | 123-125 | 119-121 | carried |
| Part III, paragraphs: topic sentence, one topic, 3-8 sentences, ≤150 words, hard limit 250, spread ≥3 sentences | 126-129 | 122-124 | carried, numbers identical |
| Part V, test: reader test before ship | 130-131 | 125-126 | carried |
| Average sentence length 15-20 words, OPM, never gated | 139 | 133 | carried |
| Longest sentence under 40 words, Cutts, gated per track once violations cleared | 140 | 134 | carried ("that track's" added, same meaning) |
| Sentence ceiling 25 words, admin + editors, ASD-STE100, via a Cairn rule setting its own level; vendored packages unedited | 141 | 135, 141-143, 512-513 | carried, split across prose table and Compatibility |
| Paragraph length gated | 142 | 136 | carried |
| ASD-STE100 20/25 reasoning; one number per track; Microsoft rule ran at suggestion | 144-149 | 138-141 | carried |
| Google/Microsoft packages keep mechanics, stay vendored and pinned in CI | 150-151 | 141-143, 512-513 | carried |
| Safeguard: every rule file ships a fixture that fires | 153-156 | 147-149, AC 601-602, risk 677-679 | carried, strengthened |
| Safeguard: ceiling travels with its two ASD-STE100 partners; complex text to a list; nothing dropped to shorten | 156-157 | 150-151 | carried |
| Safeguard: the average is never a gate | 157-158 | 152-153 | carried |

### Part 2: the structure rules

| Proposal requirement | Proposal line | Spec | Verdict |
|---|---|---|---|
| Three structure levels, each with its own gate | 164-166 | 158-160 | carried |
| Every published page has one track and one page type; four tracks stay | 175-176 | 164-165 | carried |
| A page must look like what it is; reader recognizes the genre on sight | 176-179 | 165-166 | carried |
| Exemplar-first: each type names a published exemplar, corpus carries an excerpt, no exemplar means no draft, the brief names the exemplar | 179-181 | 166-168 | carried ("approved exemplar", tightened consistently with the corpus rules) |
| Eleven page types, ten published and one internal | 182-183 | 170-171, table 174-186 | CHANGED, correctly. Proposal states eleven but lists ten bullets, folding "Condition entry and symptom row" into one. Spec splits them into two rows, reaching eleven. See judgment call 2. |
| Each type carries reader's job + exemplars; the list is the registry a brief cites | 183-211 | 174-186 | carried; every reader's job and every exemplar pair matches, including the editors welcome-page-as-front-door note (proposal 205-206, spec 185) |
| Page rule: one job, stated in the first sentence | 213 | 189 | carried |
| Page rule: reads on its own (search, admin help link, npm) | 214-216 | 190-192 | carried |
| Page rule: stays on one level, links down to a concept | 216-217 | 193-194 | carried |
| Page rule: index groups past nine siblings (Horn's chunking bound) | 217-218 | 195-196 | carried |
| Section orders held in templates under `docs/internal/templates/` | 221-223 | 199 | carried |
| `check:anatomy` reads each template, fails missing or out-of-order required headings | 223-225 | 200-201, AC 592-593 | carried, and AC forbids a second copy |
| Task guide order, under 800 words, six sections | 228-235 | 203-210 | carried verbatim, including "at most nine" steps |
| Tutorial milestone order, six sections | 236-242 | 212-219 | carried |
| Concept page order, under 1,500 words, six sections | 243-249 | 221-228 | carried |
| Architecture overview order, five sections | 250-256 | 230-236 | carried. Spec drops the modeling attribution (SQLite / Kubernetes / PostgreSQL-where-no-figure); non-normative. |
| Reference entry order, ten fields | 257-267 | 238-249 | carried, order identical |
| Reference table order, three parts; prose rules apply to lead sentence and notes only | 268-272 | 251-255 | carried |
| Condition entry and symptom row: current field lists as an order | 273-274 | 257-259 | carried, with a template requirement added (see finding 6, benign) |
| Index page order, four sections | 275-279 | 261-266 | carried |
| Front door order, eight sections | 280-289 | 268-277 | carried. Spec drops "which is SQLite's device" on the checklist; non-normative. |
| Proposal order, eleven sections | 290-301 | 279-291 | carried |
| No page names its own type or track; template is the only place a type is written | 303-305 | 293-295 | carried |
| Section: one idea, first sentence states it, same for each paragraph | 309-310 | 299 | carried |
| Section: list grouped past nine, paragraph 3-8 sentences (Google's rule kept) | 310-311 | 300-301 | carried |
| Heading: verb-first for instruction, noun phrase for explanation, siblings share one form | 311-314 | 301-303 | carried |
| Question headings only in the editors track | 314-315 | 303-304 | carried |
| A section carrying an instruction ends where the reader can act, or names the page | 315-316 | 304-305 | carried |
| `check:headings` holds seven named rules | 318-321 | 307-310, table 478, AC 594 | CHANGED. Rules carried intact, but AC 594 says "all eight heading rules"; the spec's own list enumerates seven. Finding 3. |
| `TwoHeadedHeading.yml` holds one shape of one fault; Vale sees one line, parallelism needs the page | 321-324 | 310-311 | carried. Spec drops the file link. |
| Four-line page brief, written before the outline, kept beside the page, answering the four questions | 328-332 | 315-321 | carried, all four questions verbatim |
| A brief that cannot name an exemplar stops the draft | 333 | 323-324 | carried |
| Deviation allowed only when recorded with its reason (register's "when a Vale finding is wrong" model) | 333-335 | 92-93, 324 | carried; the register model is stated in Proposal, not repeated in the brief section |
| No brief means no outline to check against | 335-336 | 325-326 | carried |
| Outline reviewed against the brief before any sentence; reviewer and `check:anatomy` read type, title, headings, order first; wrong shape goes back | 337-341 | 327-330 | carried |
| The docs pass starts the same way, one track at a time, outlines before paragraphs | 341-342 | 641-643 (unit 5) | carried into the implementation order |

### Part 3: the figure rules

| Proposal requirement | Proposal line | Spec | Verdict |
|---|---|---|---|
| A figure may appear only for a relation among three or more parts as a series, or a branch between paths | 347-349 | 334-336 | carried |
| Set to a table, linear sequence to a numbered list, typed code to a code block | 349-350 | 336-337 | carried |
| Survey evidence: 10 of 14 pages no explanatory figure, every "why" page none, Svelte docs none | 350-354 | 337-339 | carried, numbers identical. Spec drops the four research links. |
| The 2026-08-15 visual-layer rulings stand | 354-356 | 340 | carried |
| Test one: a figure that should not be there (remove it, text alternative first, one sentence means prose, a table means a table) | 359-364 | 342-345 | carried |
| Test two: a figure that is missing (paragraph as an undrawn diagram; containment, direction, branch words; missing screenshot on a task page) | 365-368 | 346-349 | carried |
| Mermaid default, hand-authored SVG the exception, no third tool | 370-371 | 351-352 | carried |
| `check:figures` grows to seven mechanical assertions | 371-372 | 352-353, AC 599-600 | carried |
| `check:visuals` closes the no-alt-attribute hole | 372-373 | 353-354, AC 599-600 | carried |
| Front door: concept figure off, ownership map to the architecture overview | 373-374 | 354-355, decision 6 → unit 5, AC 659 | carried |
| Decision 5's "commit the figure source and script" | 624 | decision table 494 only | MISSING from the requirements text. Finding 5. |

### Part 4: the corpus

| Proposal requirement | Proposal line | Spec | Verdict |
|---|---|---|---|
| `docs/internal/corpus/`, one excerpt per entry, at most 400 words | 380 | 362, AC 574 | carried |
| Manifest records source, license, fetch date, page type and track, measured numbers, approval date | 381-382 | 363-364, AC 571-572 | carried |
| Ceiling two entries per page type, floor one; no entry means no draft | 383-384 | 365-366, AC 569-570 | carried |
| Table-shaped entry marked structure-only; such a review compares column order, row completeness, lead sentence | 385-387 | 367-368, AC 576 | carried |
| A rejected entry is deleted and its id retired | 388 | 369 | carried |
| A review must cite a corpus entry; a verdict citing none does not count | 389-390 | 370 | carried |
| Per-page-type candidate entries, with the excerpt each carries | 392-423 | 372-374 by reference | CHANGED, by reference. Judgment call 3; acceptable, see below. |
| A second editors entry is owed (Mozilla blocks automated reads) | 410-412 | 377-378, open item 696-697 | carried and recorded as owed |
| The SQLite sample exists so the receipt can cite it | 389-390 | 374-376 | carried, extended to three samples (Go, KEP added by the spec's own brief) |

### Part 5: the review chain, severity contract, round cap, checklist, reader test

| Proposal requirement | Proposal line | Spec | Verdict |
|---|---|---|---|
| Outline first; a published page is drafted at its published path on a branch, never under `docs/internal/record` | 428-433 | 382-384 | carried |
| Step 1: Claude writes the four-line brief | 435-436 | 386 | carried |
| Step 2: draft where it will live, so Vale and the save hook run the right styles | 437-438 | 387-388 | carried |
| Step 3: CI runs `check:anatomy` and `check:headings` first, then `check:docs`, `check:visuals`, `check:figures`; reviewer reads the outline at the same point | 439-442 | 389-391 | carried |
| Step 4: linters under the severity contract; error fails, warning shows, suggestion stays local; error only after violations cleared (GitLab's rule) | 443-447 | 392, 408-410 | carried; spec moves the contract to its own paragraph and drops the GitLab link |
| Step 5: tell scanner reports numbers beside the corpus entry's; >15 points called out; nothing gates; bands advisory until 20 docs / 300 sentences | 448-453 | 393-395, non-goal 83-84 | carried, numbers identical |
| Step 6: `check:provenance` on the front door; footnote id must resolve to a brief line | 454-456 | 396-399 | CHANGED, enlarged. Spec generalizes it to every rebuilt page's claims against the fact ledger. Authorized by owner direction 2 but unsized. Finding 2. |
| Step 7: fresh reviewer, different context and different model family, report carries type, entry, measurement table, verdict | 457-462 | 400-402 | carried; spec drops the evidence-base citation |
| Step 8: owner or volunteer runs the reader test | 463 | 403 | carried |
| Step 9: `check:prose-read` verifies the receipt (hash, measurement table, entry, verdict, reader result); fails an unmatched hash | 464-467 | 404-406, AC 598 | carried |
| Two-round cap: round one is steps 3-7, one redraft, a second fix verdict goes to the owner | 469-473 | 412-416 | carried, and extended (cap applies to steps 3 and 7 separately). Judgment call 1. |
| Quality checklist, twelve items, each with its gate or person, recorded met / not met / n/a | 476-506 | 418-436 | carried, all twelve rows present with the same answering gate or person |
| Reader test: task guide done from the page; concept page and front door read once and paraphrased | 510-513 | 440-442 | carried |
| Part V of the guidelines; DigitalOcean runs each tutorial | 513-515 | 442-443 | carried; spec drops the Center for Plain Language citation |
| Applies to admin and extend task guides plus the front door, about forty; never reference entries; costs owner or volunteer time | 515-517 | 443-446 | carried |

### Part 6: the Claude setup and the named scripts

| Proposal requirement | Proposal line | Spec | Verdict |
|---|---|---|---|
| Seven pieces change; the list is short on purpose (Anthropic guidance); the memory paragraph is dropped | 521-525 | 450-453 | carried |
| Both `CLAUDE.md` files gain four lines, replacing four others | 526-528 | 455-457, AC 605 | carried, with a net-neutral AC |
| Output style gains three tells: two-headed heading, abstract noun, page describing itself | 529-532 | 458-460 | carried, with the reasoning |
| Voice files name their audience's corpus entries and advisory bands | 533-534 | 461-462 | carried |
| Tell scanner gains hinged-pair and short-sentence share, report mode, bands per audience, ~285 lines of Go | 535-538 | 463-465 | carried, number identical |
| Vale hook grades a draft by its path | 539-540 | 465 | carried |
| Review agents: register editor and voice reviewer given a corpus entry and reporting the table; diff reviewer runs the scanner on docs tasks; new `figure-verifier` | 541-544 | 466-468 | carried |
| Two skills: `cairn-figure`, and writing-voice gains the author-facing brief-first, one-section-per-read section | 545-547 | 469-470 | carried |
| `check:anatomy` (new) | 223 | 477, AC 592-593 | carried |
| `check:headings` (new) | 318 | 478, AC 594 | carried |
| `check:provenance` (new) | 454 | 479, AC 596 | carried |
| `check:prose-read` (new) | 465 | 480, AC 597 | carried |
| `check:cadence` | nowhere | 476, AC 595 | ADDED. Not in the proposal, not in `package.json`. Finding 1. |
| Rule 2 above the parts: one section per read, never end to end | 46-47 | 44-45, Claude setup 469-470 | carried as a rule; no unit 4 or unit 5 acceptance criterion enforces it. Finding 4. |

### Decisions

Every row is restated as adopted, with its size, plus a unit column the spec adds (authorized: the
spec's stated job is to order the decisions into units).

| # | Proposal size | Spec size | Verdict |
|---|---|---|---|
| 1 | small | small | identical |
| 2 | small | small | identical |
| 3 | small for the rule; medium for clearing 135 admin and 61 editors sentences, which must come first | identical wording and numbers | carried |
| 4 | small; "the ten page types with their section orders" | small; "the page types with their section orders" | CHANGED: numeral dropped. Consistent with the eleven-type reconciliation but unflagged. Finding 3. |
| 4a | medium; "the ten templates and the two new scripts" | medium; "the templates and the two new structure scripts" | CHANGED: numeral dropped, "structure" added to disambiguate from 8a's two. Same as above. |
| 5 | small | small | identical |
| 5a | medium | medium | identical |
| 6 | small | small | identical |
| 7 | small | small, "2, owner action" | carried, owner action marked |
| 8 | small | small | identical |
| 8a | medium each | medium each | identical (but see finding 2 on the enlarged scope) |
| 9 | small in tokens; ~forty attended sittings, one per page, the largest attended cost in this table | small in tokens; about forty attended sittings, one per page; "5, owner action" | carried; "largest attended cost" moves to Risks (680-682) |
| 10 | small; scanner change 285 lines and small | small; the scanner change is about 285 lines | carried |
| 11 | small | small | carried |

### Owner actions and owner directions

| Item | Spec | Verdict |
|---|---|---|
| Decision 7, corpus approval, owed not done | 373-374, 497, 571-572, AC 579-580, open item 694-695 | recorded as owed, correctly, and blocking |
| Decision 9, reader-test sittings, owed not done | 446, 500, AC 660-661, risk 680-682, open item 698-699 | recorded as owed and unrun |
| Direction 1: rebuild not edit, brief and outline first, fresh draft against the exemplar, gates prove carried blocks | unit 5 622-644; AC 648-658; risk 665-672 | carried into order, criteria, and risks |
| Direction 1: reference entries the one exception, edited in place | 636-639, AC 654-655 | carried, with the reason and a per-brief record |
| Direction 2: fact harvest once per track, before any brief | unit 1 528-546, AC 548-557 | carried, and placed first in the order |
| Direction 2: ledger entry carries claim, old-file origin, proving source | 536-542, AC 552-554 | carried |
| Direction 2: unproven claims under "Unverified", barred from briefs | 541-542, AC 550-551 | carried |
| Direction 2: drafters never open the old page | 544-546, AC 555-556, 649-651, risk 665-672 | carried in three places |

## Findings, ranked

**1. `check:cadence` is an unauthorized new script (scope creep, medium).** The spec's script table
(line 476) and unit 3 acceptance criterion (595) require a fifth new script, `check:cadence`, that
"runs the prose measurements and reports them beside the page's corpus entry." The proposal names
`check:anatomy`, `check:headings`, `check:provenance`, `check:prose-read`, `check:docs`,
`check:visuals`, and `check:figures`, and nothing else. It assigns exactly this job to the tell
scanner at chain step 5 (448-453) and to the scanner change under decision 10 (535-538), which the
cost review sized at 285 lines. `check:cadence` is neither in the proposal nor in `package.json`
today, and no decision funds it. It also duplicates the scanner's step-5 role, which is the
duplication the spec's own drift risk (686-688) warns against.
*Fix:* delete the `check:cadence` row and acceptance criterion, or restate it as the CI wrapper that
invokes the decision-10 scanner, naming decision 10 as its authority. Then correct "Five scripts
carry the standard, three of them new" (472).

**2. `check:provenance` is enlarged past decision 8a without resizing (medium).** The proposal
scopes it to the front door: "every sentence there" resolving to the author brief (454-456,
decision 8a medium). The spec adds "On a rebuilt page the same check generalizes: every claim must
carry an id that resolves to a fact ledger entry" (398-399), repeats it in the script table (479),
in unit 1's rule (546), in unit 5's method (628-629), and in the risk (671-672). The generalization
follows honestly from owner direction 2, so it is authorized in substance. What is not authorized is
leaving decision 8a at "medium each" while the check grows from one page to the whole published set,
and while every published claim now needs a footnote id.
*Fix:* keep the generalization, add one sentence under decision 8a or in Compatibility saying that
direction 2 widened `check:provenance` beyond the proposal's front-door scope, and re-size it or
state that unit 5, not unit 3, carries the widened cost.

**3. Two counting slips the spec inherits and one it creates (low).** (a) AC 594 requires
`check:headings` to hold "all eight heading rules named above", while the spec's own list (307-310)
and script table (478) enumerate seven. (b) Decisions 4 and 4a silently drop the proposal's "ten"
before "page types" and "templates" while the registry now names eleven. The reconciliation is
right (see judgment call 2), but a reader checking spec against proposal sees an unexplained change.
*Fix:* number the heading rules explicitly and make the AC cite the count it lists; add one line to
the page brief's deviation list recording that the registry splits the proposal's combined
"Condition entry and symptom row" bullet into two types, reaching the eleven the proposal already
claims.

**4. Rule 2 above the four parts has no acceptance criterion (low).** "A page for an outside reader
must be drafted one section per read" is stated in the Abstract (44-45) and reaches the writing-voice
skill through the Claude setup (469-470), which unit 3's AC covers only as "the Claude setup changes
land as listed." Neither unit 4 nor unit 5 has a criterion that any page was drafted that way, so the
rule the proposal elevated above the four parts is the one rule nothing in the implementation
verifies. The same gap applies to the reader test on the demonstration page: chain step 8 applies to
unit 4, but unit 4's acceptance criteria (616-620) do not require it.
*Fix:* add to unit 5's criteria that each drafting dispatch is one section per read, and to unit 4's
that the demonstration page ran the full chain including step 8.

**5. Decision 5's "commit the figure source and script" is in the table only (low).** The figure
requirements (332-355) carry the two tests, the two-lane routing rule, the seven assertions, and the
`check:visuals` hole, but never the commit-the-source-and-script clause the decision row funds
(494). A plan written from the design details alone would miss it.
*Fix:* add the clause to the figure requirements.

**6. Small additions, all benign, listed for completeness (informational).** The spec adds: a fourth
non-goal (83-84, restating the proposal's advisory-bands threshold); a Compatibility section (504-521)
whose path-scoping rule ("a gate that would fail an untouched track must scope itself", "a plan that
adds a scope exclusion must name the unit that removes it") is a new mechanism, though it follows
directly from the proposal's severity contract; a template requirement for the condition/symptom
types (258-259); a unit 2 criterion migrating the three existing samples out of the record directory
(577-578); and two new corpus samples (Go design doc, KEP-2400) used as the spec's own exemplars.
None conflicts with the proposal, and each serves a direction or a stated spec job. No fix needed;
the path-scoping rule is worth an explicit pointer back to the severity contract as its authority.

**Nothing material is dropped.** The proposal's Drawbacks are all re-expressed as Risks (reader-test
cost 680-682, unsettled instrument 673-676, Vale fixture 677-679, nothing-exists-yet as the five
units). Every measured number that appears in both documents matches: 15-20, 40, 25, 3-8, 150, 250,
nine, 800, 1,500, 54, 58, 22, 151, 12-18, 135, 61, 76, forty, twenty, three hundred, fifteen points,
seven assertions, four lines, 400 words, two entries, 285 lines, six to nine million tokens, 31 to 73
sittings.

## Rulings on the spec author's three reported judgment calls

**1. The two-round cap, sourced from workstation rules. Verified and upheld.** The proposal does
carry it, at revision 9, lines 469-473: "The chain runs at most two rounds on one draft. Round one is
steps 3 through 7... A second fix verdict stops the loop and sends the page to you with the findings
attached, the way a second fix verdict on a code task goes to the conductor." The spec (412-416)
restates it faithfully and cites `~/.claude/CLAUDE.md` as the source, which the proposal alludes to
rather than names. The spec's one extension, that the cap applies to step 3 and step 7 separately, is
a reading the proposal does not make. It is defensible, since the proposal's round one spans steps 3
through 7 as a unit and an outline return is not a prose grade, but it is the spec deciding something
the proposal left open. Acceptable as written because the spec states its reason on the line.

**2. The page-type count reconciled to eleven. Upheld; the spec is right and the proposal was
wrong.** The proposal asserts eleven types (182-183) and then lists ten bullets, because "Condition
entry and symptom row" (273) is one bullet covering two named types. The spec's split into two table
rows produces ten published plus one internal, which is exactly the composition the proposal claims.
The reconciliation removes an internal contradiction rather than creating one. The only defect is
that the spec makes the change silently, including in decisions 4 and 4a, where the proposal's "ten
templates" becomes "the templates". Fold finding 3(b).

**3. Prior art, Alternatives, and per-entry corpus sources left in the proposal by reference.
Upheld for Prior art and Alternatives; upheld with a caveat for the corpus sources.** Prior art and
Alternatives are reasoning, and the spec's page brief already states the governing principle:
"Rationale is absent. The proposal holds the reasoning for every rule, and repeating it here would
produce a second copy that drifts." That principle is correct and this repository's own convention.
The caveat is the corpus: unit 2's acceptance criteria require entries "from the sources the
proposal names" (563), so an implementer cannot execute unit 2 without the proposal open beside it.
That is acceptable given the spec's header makes the proposal a required companion, but the brief's
deviation list should name Prior art and Alternatives among the omissions, not only Rationale, so the
omission reads as a decision rather than an oversight.

## Verdict

**Faithful with fixes.** Land findings 1 and 2 before the first plan is written from this spec, since
one funds an unauthorized script into unit 3's acceptance criteria and the other silently widens a
medium decision to the whole published set. Findings 3 through 5 are cheap edits that can ride the
same revision. The spec's fidelity to the two owner directions is its strongest section: the fact
harvest is unit 1 with five acceptance criteria, the never-open-the-old-page constraint appears in
the unit rule, the unit 5 criteria, and the risk register, and the reference-entry exception is
carried with its reason and a per-brief record.
