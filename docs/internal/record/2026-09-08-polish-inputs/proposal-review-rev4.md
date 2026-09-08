# Proposal review: revision 4 graded through its own chain

The register editor's grade of revision 4 (Opus, fresh context, 2026-09-08), with the closure table for revision 3's twenty-one findings. Folded into revision 5.

---

## Grade: `docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`, revision 4

Graded against the named corpus entry, `corpus-sample-sqlite.md`, using the document's own instrument (`scripts/checks/measure-prose.mjs`, hinge definition at lines 52–59), per its steps 4 and 6.

### Measurement table

I re-derived the corpus column by hand under the current script definition to check the receipt's honesty.

| Measure | Corpus entry, receipt claims | Corpus entry, my count | Agrees |
|---|---|---|---|
| Sentences | 6 | 6 | yes |
| Average length | 18.7 words | 112 words / 6 = 18.67 | yes |
| Longest | 33 words | 33 (final sentence) | yes |
| Hinged pairs | 0 percent | 0 of 6; the two serial-comma candidates (`, or SQL Server`, `, and control`) are correctly excluded by the earlier-comma clause | yes |
| Sentences under 8 words | 17 percent | 1 of 6 ("They emphasize scalability, concurrency, centralization, and control.", 7 words) | yes |

The corpus column is accurate. Revision 3's finding 1 is closed on the arithmetic. The failure has moved into the target and status columns.

---

## Ranked findings

**1. The adopted paragraph floor is violated at least six times and the receipt reports zero violations.**
> "A paragraph must open with a topic sentence, cover one topic, and run three to eight sentences and no more than 150 words" (line 86)
> Receipt: `| Paragraphs over 8 sentences or 150 words | 0 | | | 0 | pass |` and `| Paragraph lengths, shortest to longest, in sentences | 1 to 8, across 43 paragraphs | | | varied | pass |`

Rule: the document's own adopted Part III paragraph rule, and the receipt's honesty requirement. The rule is a two-sided band, three to eight. The script measures only the ceiling (`measure-prose.mjs` line 80: `p.sentences > 8 || p.words > 150`), so the floor is ungated, and the receipt's own variance row prints the violation as evidence of virtue: "1 to 8" means at least one one-sentence paragraph, and the document has several — line 30 ("Two rules stand above the four parts…"), lines 118–119 ("The Google and Microsoft guides keep the mechanics…"), line 165 ("The checklist is SQLite's closing device…"), lines 274–275 ("The first entry exists as a sample…"), lines 348–349 ("The memory paragraph revision 1 proposed is dropped…"), and the two-sentence blocks at 92–94 and 217–218. A "pass" against a target of "varied" is a status graded against a criterion the document never stated, while the criterion it did state fails.
Rewrite: add a row `| Paragraphs under 3 sentences | 7 | | | 0 | fail |`, and either fold the short paragraphs into their neighbours or amend the adopted rule to a ceiling only, saying so in the prose-rules bullet.

**2. The document's three diagnostic numbers were measured on a different instrument from its receipt, and it does not say so.**
> "The extend track, the developers' track, builds 48 percent of its sentences as hinged pairs, and the reference track builds 44 percent." (lines 55–57)
> "`docs/extend/render-safety.md`, the worst-measuring extend page at 67 percent hinged pairs" (lines 365–366)
> "That last clause is what excludes serial lists, and it was added in this revision after the revision 3 grade found the count inflated by them." (lines 385–386)

Rule: "the same term for the same thing every time," and the Limits section's own job. The serial-list exclusion landed in this revision. It moved this document's own prose figure from 46 percent (revision 3's receipt) to 36 percent, a ten-point drop from the instrument alone. The 48, 44, and 67 are pre-change numbers, so the receipt's 36 percent is not comparable to the 48 percent that motivates the whole proposal, and the owner reading the two in one document will compare them. The cited cost review states the objection in stronger terms than the document ever admits: "Splitting on the semicolon or not moves the track number by 17 points, larger than the entire specimen band's width" and "The 2–3x inflation is the metric, not the prose" (`proposal-review-cost.md` lines 33, 49). The document's hedge at lines 57–59 covers sample size only, never instrument sensitivity.
Rewrite, in Limits: "The 48, 44, and 67 percent figures were measured before the serial-list exclusion and are not comparable to this receipt's 36 percent. Re-measuring every track under the fixed definition is the first task after approval. The cost review found that changing the splitter moves a track number by 17 points, which is wider than the human band, so no number here is a rule yet."

**3. The one measure the proposal exists to fix has "reported" in the Target column, so no status can ever be dishonest.**
> `| Hinged pairs | 34 percent | 36 percent | 0 percent | reported | reported; the prose runs 36 percent against the corpus entry's 0, which is the direction the whole proposal warns about, and the person judging is you |`

Rule: the receipt's stated purpose, and the register's grading method. The disclosure sentence is honest. The cell above it is not a target, so the row is unfalsifiable by construction, and the document hands the verdict to the owner on the one axis it claims expertise about. The other eight rows carry real targets and real statuses; this row alone opts out.
Rewrite: set the target to the corpus entry's number with a stated tolerance and let the status be a verdict: `| Hinged pairs | 34 percent | 36 percent | 0 percent | at or under the corpus entry plus 15 points | fail; 36 against 0. The instrument is unsettled (see Limits), so this fails as a reading, not as a gate. |`

**4. The four-part anaphoric skeleton revision 3 flagged is intact, and a third instance was added.**
> "The prose rules say how sentences and paragraphs must be written… The structure rules say which pages exist… The figure rules say when a diagram or screenshot earns its place… The review chain gives a page the same sequence of checks…" (lines 22–28)
> "The docs set decides which pages exist. The page decides its sections and their order. The section decides how one block of text is built." (lines 123–125, verbatim from revision 3)
> "A heading that tells the reader to do something must start with a bare verb. A heading that explains must be a noun phrase. Sibling headings must share one form." (lines 170–172, new)

Family: anaphoric skeletons, reflexive triads. Revision 3's prescribed fix was "break the four-part anaphora by giving one part its own two-sentence treatment." Two of the four got a trailing coordinate clause instead, which leaves the skeleton. The heading triad is a new instance created by splitting the old triad sentence, which traded one tell for another. Against the SQLite specimen, which never runs the same sentence shape twice consecutively.
Rewrite for lines 22–28: "The standard has four parts. The prose rules say how sentences and paragraphs must be written. They adopt the Federal Plain Language Guidelines, a published United States government style standard. Which pages exist, what sections each kind of page carries, and how a section is built are the structure rules. The figure rules cover when a diagram or screenshot earns its place, how it is made, and how it is graded. Last, the review chain gives a page the sequence of checks a code change gets, ending in a receipt a gate can verify."

**5. The document breaks its own sibling-heading rule in its H2 set.**
> "Sibling headings must share one form." (line 172)
> H2 siblings: "A documentation standard", "The failure it answers", "The parts", "Exclusions", "Limits", "The decisions", "Receipt"

Rule: its own section rule, and structural consistency. Four take an article, three do not. Revision 3 logged this as minor residue under finding 8; in revision 4 the document has since promoted the rule to a gated `check:headings` assertion, which raises it from residue to a rule the page would fail.
Rewrite: "The exclusions", "The limits", "The receipt".

**6. The track sentence is a four-clause comma splice.**
> "Editors write in the admin and never see a terminal, site admins run a site without writing code, developers extend cairn, and the reference is where the last two look things up." (lines 15–18)

Rule: adopted Part III, one idea per sentence. Revision 3's prescribed fix was to fold the four-sentence inventory into "one sentence with the differences carried by subordination." The fold happened; the subordination did not, so four independent clauses now sit joined by commas. Thirty-two words, and its hinge is exempted from the count only by the serial-list clause, which is the one place that exemption misleads.
Rewrite: "Editors write in the admin and never see a terminal, while site admins run a site without writing code. Developers extend cairn, and the reference is where those last two look things up."

**7. The longest sentence at 38 words is the load-bearing template rule, which is the same defect revision 3 fixed one section earlier.**
> "Each page type would get a fixed section order, held in a template under `docs/internal/templates/`, a directory decision 4 creates, and checked by a new `check:anatomy` script that reads the template, so template and gate cannot drift apart." (lines 141–143)

Rule: adopted Part III, one idea per sentence, and the 40-word ceiling it comes within two words of. Four ideas: the order is fixed, it lives in a template, decision 4 creates the directory, a script reads it. Revision 3's finding 4 killed the identical shape in the figure rule; it reappeared here. The four-patterns sentence at lines 382–385 is the other 38-word specimen and is the inventory sentence revision 3 flagged under finding 12.
Rewrite: "Each page type would get a fixed section order, held in a template under `docs/internal/templates/`. Decision 4 creates that directory. A new `check:anatomy` script would read the template, so template and gate cannot drift apart."

**8. Three of the eleven decisions exceed the size legend's own unit, so the size column understates them.**
> "Medium is a script or a tuned package, under two million." (line 401)
> Item 4: "three templates now and five later, and the two new scripts | medium"
> Item 5: "the two figure tests, the two-lane routing rule, the seven `check:figures` assertions, and the `check:visuals` fix, and commit the figure source and script | medium"
> Item 8: "including the severity contract, `check:provenance`, and the receipt gate | medium"

Rule: the decidability requirement, and the repo's plan-header token discipline. Item 4 is two scripts plus three templates. Item 5 is seven assertions across two lanes plus a fix plus a commit. Item 8 is two new scripts (`check:provenance`, `check:prose-read`) plus a CI severity policy. Each is priced as "a script." Separately, "Large is a pass, at the cost review's figure for the docs pass" defines a tier no row uses.
Rewrite: split item 5 into the tests and routing (small) and the seven assertions plus `check:visuals` (medium); split item 8 into the severity contract (small) and the two scripts (medium each); drop the unused "large" from the legend or attach it to item 3's clearing.

**9. Decision 3's size cell hides the work the owner is actually approving.**
> "| 3 | Add a Cairn rule that fails a sentence over 25 words on the admin and editors tracks, after clearing the 135 admin and 61 editors sentences that exceed it today | small, plus the clearing |"

Rule: decidability from the text and the size column alone. The counts are correct and their addition closes revision 3's finding 7. But "plus the clearing" is 196 sentences of hand rewriting across two published tracks, unsized in a column whose other cells all carry a tier. The rule itself is a Vale file; the clearing is the decision.
Rewrite: "| small for the rule; medium for clearing 196 sentences, and it must precede the rule per the severity contract |"

**10. Decision 7 asks the owner to approve an entry that does not exist and cannot be named.**
> "and a Mozilla support article, once one can be fetched, since the site blocks automated reads" (lines 268–269)

Rule: decidability. Every other corpus entry is a named URL with a named excerpt. This one asks for standing approval of a future unnamed page in the track with the least technical reader, which is the track the corpus is thinnest on.
Rewrite: "Editors track: [GOV.UK, a guidance page](https://www.gov.uk/guidance/classifying-vehicles), its opening. A second editors entry is owed; the Mozilla support articles block automated reads, so it must be chosen by hand and approved separately."

**11. "Grading has a mechanical half and a judged half."**
> line 217

Family: balanced halves, and a nominalization used as the subject in a document that adopts "use verbs rather than nouns made from verbs" (line 79). Same shape at line 209, "Production has two lanes and one routing rule," which pairs a nominalized subject with a two-beat inventory.
Rewrite: "A script grades part of a figure; a reviewer grades the rest." / "Figures are produced in two lanes, and one rule routes between them."

**12. Klare is cited for a claim with no source, in the paragraph that sources everything else.**
> "Klare, who wrote the formulas, warned that cutting sentences to hit a score removes the connectives that make an explanation cohere." (lines 357–358)

Rule: citation-shaped claims must give their source; the two sentences before it carry links. "Wrote the formulas" is also loose, since the readability formulas are Flesch's, Dale and Chall's, and Gunning's; Klare surveyed and criticized them. For the claims checker.
Rewrite: name the work and year, or drop the sentence, since the Redish and 2024-trial citations already carry the exclusion.

**13. Three names remain for one thing, and one of them is used before the defining name appears.**
> "The pages people write set the bar high. Ten of the fourteen exemplar pages carry no explanatory figure…" (lines 184–186)
> "the docs must be compared against pages people wrote, and this document calls that set the corpus" (lines 236–237)

Rule: adopted Part III, the same term for the same thing every time, and define at first use. "Exemplar pages" appears at line 186; "corpus" is defined at line 236, fifty lines later. Revision 3's finding 7 named this trio; the "register" half was closed, this half was not.
Rewrite: move the corpus definition ahead of the figure rules, and use "corpus entries" at line 186. If the fourteen are not corpus entries, say what they are.

**14. The receipt's first row carries no target and no status.**
> `| Sentences | 228 | 145 | 6 |  |  |`

Rule: "check every cell is rendered and every status is honest against the target." The row is rendered at the right width, so the revision-3 `_STATUS` defect is gone, but the honesty rule is stated over a table one of whose rows opts out. It is a count, not a measure, so it does not belong under a "Status" column.
Rewrite: `| Sentences | 228 | 145 | 6 |  | count only |`

**15. The average-length status contradicts its own numbers.**
> `| Average length | 16.3 words | 17.4 words | 18.7 words | 15 to 20 | pass on prose; the all-sentences figure counts list items, which the standard wants short |`

Rule: honesty against the target. 16.3 is inside 15 to 20, so the all-sentences figure passes too. "Pass on prose" implies the other column did not.
Rewrite: "pass on both; the all-sentences figure runs lower because it counts list items, which the standard wants short."

**16. Links: one path escapes the repository, and one named brief is never linked at the rule that depends on it.**
> "(`[the evidence base](../../../../../../.claude/skills/writing-voice/evals/research/2026-09-01-ai-tell-evidence-base.md)`)" (line 301)
> "Any claim about you or about cairn's stance must come from a brief you wrote or approved" (line 32)

Rule: Google link-text and Wikipedia first-occurrence linking. The six-level relative path resolves outside the repository to `~/.claude/`, so it is broken in every rendered context and in any clone. `front-door-author-brief.md` sits in this directory and is the brief rule 1 means, and it is never linked. Diátaxis, DITA, Information Mapping, and Every Page Is Page One (line 126) are named entities with no link and no gloss, mitigated only by the structure-research link that follows them.
Rewrite: cite the evidence base by its workstation path in plain text rather than as a link; link `front-door-author-brief.md` at rule 1.

**17. Passive voice where the actor is the thing being decided.**
> "Structure is set at three levels, and each level would get its own gate." (line 122)
> "The other five orders are written when their templates are" (lines 148–149)

Rule: adopted Part III, active voice unless the actor does not matter. Here the actor is the standard in the first case and the owner's later approval in the second, and both matter.
Rewrite: "The standard sets structure at three levels, and each level would get its own gate." / "Decision 4 defers the other five orders until their templates are drafted."

---

## Closure table for the twenty-one revision-3 findings

| # | Revision-3 finding | Status | Evidence in revision 4 |
|---|---|---|---|
| 1 | Receipt lacks the corpus entry's numbers | closed | Corpus column present; every cell verified correct by hand against the SQLite excerpt (6 / 18.7 / 33 / 0% / 17%). Verdict cell still declines to fail: fresh finding 3 |
| 2 | "Excludes serial-list commas" false | closed, better than prescribed | Script changed (`isHinged`, lines 55–59) rather than the sentence; Limits lines 381–387 name the four patterns and disclose the change |
| 3 | `_STATUS` artifacts in four rows | closed | All nine rows render at six columns with prose statuses; residue in fresh findings 14, 15 |
| 4 | 38-word figure rule, four ideas | closed | "A figure is a diagram or a screenshot. It may appear only where prose would have to state a relation among three or more parts as a series, or where the fact is a branch between paths." (178–181), the prescribed rewrite verbatim |
| 5 | Heading rule as a triad; Vale overclaim | closed | Three sentences (170–172); "holds one shape of one fault and nothing more" (176); `TwoHeadedHeading.yml` linked. New triad cadence: fresh finding 4 |
| 6 | "Three levels" then four subsections | closed | `#### The docs set`, `#### The page`, `#### The section`; the front door folded into "The page" (152–165) |
| 7 | Four undecidable decisions | closed | Item 3 carries "135 admin and 61 editors" (verified); item 4 "three templates now and five later"; item 9 "about forty"; item 11 names `render-safety.md`. Residue: fresh findings 9, 10 |
| 8 | "Decisions and costs" delivers sizes | partly closed | Retitled "## The decisions"; sizes now carry token bounds in prose (400–402). No per-item token column; three rows exceed the legend's unit: fresh finding 8 |
| 9 | Variance and reader test unmeasured | partly closed | Variance row added (435); reader-test disclosure added verbatim (393–396). The variance row reports the floor violation as a pass: fresh finding 1 |
| 10 | "Register" equivocal; "band" undefined | closed | "The voice files under `~/.claude/docs/voice/`" (333); "A band, throughout, is the range a track's corpus entries set for a measurement." (238). Residue on "exemplar pages": fresh finding 13 |
| 11 | STE descriptive ceiling on instructional tracks | closed | Reason given (103–105); "The vendored file is not edited, since the packages are pinned; a Cairn rule sets the level and the number" (107–109) |
| 12 | "Nobody saw its findings" | closed | "so its findings were advisory and nobody acted on them" (106–107), the prescribed wording |
| 13 | Self-describing opener | closed | Moved into step 1's routing rule (280–281), as prescribed |
| 14 | Present tense for `docs/internal/templates/` | closed | "would get a fixed section order… a directory decision 4 creates" (141–143). Verified: the directory does not exist |
| 15 | Uncommitted figure artifacts stated as existing | closed | "neither the source, the script, nor the emitted assets are committed yet; decision 5 commits them" (214–215). Verified against `git status`: all three untracked |
| 16 | Node count against a soft budget | closed | "at or under 15, which fixes the register's 'about 15' at a number" (226) |
| 17 | Unsourced claims | partly closed | The 65-word claim and its 2-percent exception are gone ("under 40 words, no exception", 99); the three "why" pages are named (153–154); the blind-spots claim is linked (300–301). Klare remains unsourced: fresh finding 12 |
| 18 | Part II conflicts with the layout | closed | "The decisions come last because a decision list read before its reasoning is a list of unsupported claims, and Part II's most-important-first rule yields to that on a proposal." (402–404) |
| 19 | Connector openers and cappers | partly closed | No sentence-initial "And"; the two prescribed replacements are in place (165, 216). Residue: "Grading has a mechanical half and a judged half." and "Production has two lanes and one routing rule.": fresh finding 11 |
| 20 | Anaphoric skeletons | **not closed** | "The X rules say" intact (22–28); "The docs set decides / The page decides / The section decides" verbatim (123–125); the track inventory folded into a comma splice (15–18); a new triad at 170–172. Fresh findings 4, 6 |
| 21 | Unlinked in-repo sources; mirrored authority | closed | 2026-08-15 record linked (196, verified to exist); `TwoHeadedHeading.yml` linked (174, verified); the mirror disclosed as the only reachable copy (69–71). Residue: fresh finding 16 |

Fifteen closed, five partly closed, one not closed.

## Repository checks

Every fact the task named checks out as the document states it. `docs/internal/templates/` does not exist and the document says decision 4 creates it. `scripts/figures/`, `docs/internal/site-figures.svg`, and `docs/extend/assets/` are all untracked and the document names all three. `scripts/checks/measure-prose.mjs` is committed and its hinge definition sits at lines 52–59, matching the four patterns the Limits section describes. `docs/internal/record/2026-08-15-docs-visual-layer-rulings.md` exists and the relative link resolves. The 135 and 61 counts appear in decision 3. Every sibling record the receipt's provenance line cites exists in the directory, and every relative link depth resolves except the six-level `.claude/` path at line 301.

One item for the claims checker, outside the document: `measure-prose.mjs` lines 47–49 still carry the superseded comment "Serial-list commas are excluded by requiring a coordinator or relative word after the comma," directly above the correct comment at lines 50–51 that describes what the code does. The proposal points at this file as the fixed definition, so the stale comment undercuts it.

## Verdict

Not ready for the owner's read: the receipt reports "pass" on a paragraph rule the document violates at least six times because the script measures only the ceiling, the 48, 44, and 67 percent figures that motivate the whole proposal were measured on an instrument this revision changed and no sentence says so, and the anaphoric-skeleton finding is the one of twenty-one that was not closed.
