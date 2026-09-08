# Proposal review: revision 5 graded through its own chain

The register editor's grade of revision 5 (Opus, fresh context, 2026-09-08), with the closure table for revision 4's seventeen findings. Folded into revision 6.

---

## Measurement table (hand-derived; I cannot execute the script, so the corpus column is counted by hand against `measure-prose.mjs` as written, and the document columns are spot-checked)

| Measure | Receipt: all | Receipt: prose | Receipt: corpus | My check of the corpus cell | Verdict on the cell |
|---|---|---|---|---|---|
| Sentences | 237 | 152 | 6 | 6 sentences in the excerpt | correct |
| Average length | 16.1 | 17.1 | 18.7 | 27+13+7+12+20+33 = 112 words / 6 = 18.67 | correct |
| Longest | 38 | 38 | 33 | final sentence, 33 words | correct; 38 is the document's real max (two specimens tie: the "54 percent … 58 percent" sentence at lines 53-56 and the four-patterns sentence at lines 377-380) |
| Hinged pairs | 35% | 38% | 0% | 0 of 6; `, or SQL Server` and `, and control` both carry an earlier comma and are excluded by `isHinged`'s last clause | correct; the target and the "fail" status are now honest |
| Under 8 words | 19% | 13% | 17% | 1 of 6 ("They emphasize scalability, concurrency, centralization, and control.", 7 words) | correct |
| Paragraphs > 8 sentences or 150 words | 0 | | | longest block I find is 7 sentences / ~128 words | plausible |
| Paragraphs < 3 sentences, lead-ins exempt | 2 | | | count plausible, **identification false** (finding 1) | fail |
| Paragraph lengths | 1 to 7, across 37 | | | I segment 38 blocks under the script's block rule | off by one, and "varied" is still an unstated criterion |

The corpus column is accurate in every cell. The failure is in the short-paragraph row's prose.

---

## Ranked findings

**1. The receipt names two short paragraphs that cannot be the two the script counted.**
> `| Paragraphs under 3 sentences, list lead-ins exempt | 2 | | | 0 | fail; the two are the paragraphs that carry the paragraph table lead-in and the decisions legend |`

Rule: the receipt's honesty requirement, and the receipt's own preamble ("A paragraph that ends with a colon introduces a list and is exempt from the paragraph floor"). The paragraph-table lead-in is lines 95-97 and ends `…so each names its source:` — a colon, so it is exempt by the rule stated three lines above the table and cannot be one of the two. The decisions legend is lines 396-400 and runs five sentences. Neither can be counted. The two blocks that do trip `shortParagraphs` are line 30, "Two rules stand above the four parts, and they answer the two faults no gate caught." (one sentence, terminal period, no exemption), and the flush-left orphan at line 249, "…, so the receipt below can cite it.", which the script reads as its own one-sentence paragraph because the line is not indented under its bullet. This is a false cell inside the artifact the entire standard rests on, on the row that closes revision 4's first finding.
Rewrite: `| Paragraphs under 3 sentences, list lead-ins exempt | 2 | | | 0 | fail; the one-sentence paragraph introducing the two standing rules, and an unindented continuation line in the corpus list that the script reads as its own paragraph |` — and fix both: fold line 30 into the paragraph above it, and indent line 249 two spaces so it rejoins its bullet.

**2. Decision 11 names a different page from the demonstration the document proposes.**
> "`docs/extend/add-a-custom-admin-screen.md`, the worst-measuring extend page at 76 percent hinged pairs on the fixed instrument, would be rewritten against a task-guide corpus entry." (lines 361-363)
> "| 11 | Approve the `render-safety.md` demonstration before any docs pass is planned | small |" (line 416)

Rule: decidability from the text and the size column, and the cross-section contradiction check. The page swap that closes revision 4's finding 2 was made in the Exclusions section and not in the table. The owner approving item 11 approves a demonstration the body no longer proposes. Both files exist, so neither name self-corrects.
Rewrite: "| 11 | Approve the `add-a-custom-admin-screen.md` demonstration before any docs pass is planned | small |"

**3. The instrument disclosure describes revision 4's change as this revision's, and its ten-point figure no longer matches the receipt.**
> "That last clause is what excludes serial lists, and it was added in this revision after the revision 3 grade found the count inflated by them." (lines 379-381)
> "The instrument change moved this document's own prose figure by ten points between revisions." (lines 382-383)

Rule: factual accuracy of a self-describing claim; the same term for the same thing. The revision 4 grade records the script change as already landed in revision 4 ("Script changed (`isHinged`, lines 55–59)"), and the ten points is the revision 3 receipt's 46 percent falling to revision 4's 36. This revision reports 38. Both sentences are carried verbatim from revision 4, so "this revision" now points at the wrong revision and "ten points" describes a move between two figures neither of which appears in this document.
Rewrite: "That last clause is what excludes serial lists. Revision 4 added it after the revision 3 grade found the count inflated by them, and it moved this document's own prose figure from 46 percent to 36."

**4. The instrument is described as five forms in one section and four patterns in another.**
> "The measurement now counts all five hinge forms, so a rewrite cannot pass by moving the hinge." (lines 45-46)
> "The measurement script … defines a hinged pair by four patterns." (lines 375-377)

Rule: adopted Part III, the same term for the same thing every time. The five at line 43 (comma-and-coordinator, colon, semicolon, dash, relative chain) and the four at line 378 (comma-plus-subordinator-or-relative, colon-or-semicolon, spaced dash, comma-plus-and/or) are two carvings of the same three regexes, and the reader checking the receipt against the script meets both counts with no reconciliation. The script has four constants; the failure section should not carry a fifth.
Rewrite for line 45: "The measurement now counts every hinge form the script defines, so a rewrite cannot pass by moving the hinge."

**5. Decision 2 contradicts the table it points at and decision 3.**
> "| 2 | Hold the paragraph numbers as gated rules and the sentence numbers as reported measurements | small |" (line 405)
> "| Longest sentence | under 40 words … | gated per track once the existing violations are cleared |" and "| Sentence ceiling, admin and editors tracks | 25 words | … | gated |" (lines 102-103)

Rule: decidability, and the cross-section contradiction check. Two of the three sentence measures in the prose-rules table are proposed as gates, and decision 3 exists to gate one of them. An owner approving decision 2 as written declines decision 3 by implication. The item means the average alone and does not say so.
Rewrite: "| 2 | Hold the paragraph numbers and the 40-word ceiling as gated rules, and the average sentence length as a reported measurement that never gates | small |"

**6. Decision 9 is the largest attended-time item in the table and is the only row with no size.**
> "| 9 | Adopt the reader test for the roughly forty task guides and the front door | your reading, one page at a time |" (line 414)

Rule: decidability from the size column, and the document's own arithmetic. The Exclusions section applies the cost review's conversion to the docs pass ("31 to 73 attended sittings") and uses it to keep that item off the table. The same conversion applies here: roughly forty pages read one at a time is roughly forty sittings, which the cost review calls "the one the workstation rules call scarce." The row prices it as a reading habit.
Rewrite: "| 9 | Adopt the reader test for the roughly forty task guides and the front door | small in tokens; about forty attended sittings, one per page, which is the largest attended cost in this table |"

**7. "Corpus" and "band" are both used about 180 lines before they are defined, and the Limits section says they are not.**
> "Re-measuring the other pages waits on the corpus, because their text is not in the repository." (lines 58-59) and "the 19-to-44 band from five pages" (line 57), against "The docs must be compared against pages people wrote, and this document calls that set the corpus. A band, throughout, is the range a track's corpus entries set for a measurement." (lines 238-240)
> "the terms it met before their definitions are now defined at first use" (lines 390-392)

Rule: adopted Part III, define a term where it is used; and the accuracy of the closure claim. Revision 4's finding 13 was closed on "exemplar pages" only; the underlying define-at-first-use defect moved rather than cleared, and a third informal name survives at line 184 ("The pages people write").
Rewrite: put the two definitions in the second paragraph of "The failure it answers", where both terms first appear, and cut them from line 238.

**8. The advisory threshold in step 4 is looser than the source the document leans on for its intervals.**
> "The bands stay advisory until a track has a thousand sentences from ten documents behind them." (lines 292-293)

Rule: a citation-shaped claim leaning on a source the page gives elsewhere. The cost review the document cites for its intervals sets "k ≥ 20 documents before the band's endpoints stop moving on a specimen swap. So: 20+ human specimens, ≥300 sentences, per register." The document halves the document count without naming the disagreement, in a section whose whole job is to disclose instrument weakness.
Rewrite: "The bands stay advisory until a track has twenty documents and three hundred sentences behind them, which is the cost review's threshold for a band whose endpoints stop moving on a specimen swap."

**9. Two consecutive sentences share one inverted three-item frame.**
> "Which pages exist, what sections each kind of page carries, and how a section is built are the structure rules. When a diagram or screenshot earns its place, how it is made, and how it is graded are the figure rules." (lines 23-26)

Family: list cadence, and a new balanced-parallel pair introduced by the fix for revision 4's finding 4. The four-part "The X rules say" skeleton is broken, and a two-part fronted-triad skeleton replaced it in the same paragraph. Both sentences are a three-item fronted list resolving on "are the X rules". The SQLite specimen never runs one shape twice in a row.
Rewrite: "Which pages exist, what sections each kind of page carries, and how a section is built are the structure rules. The figure rules cover when a diagram or screenshot earns its place. They also say how it is made and how it is graded."

**10. Three rules ride one 33-word sentence, which is the fold revision 4 condemned in the track sentence.**
> "A heading that tells the reader to do something must start with a bare verb, while one that explains must be a noun phrase, and siblings at one level must share a form." (lines 170-172)

Rule: adopted Part III, one idea per sentence. Revision 4's finding 4 killed a triad here; the answer was to fold the triad into one sentence with two hinges, which trades the tell for a violation of the adopted rule. Three separate gated assertions live in one clause chain.
Rewrite: "A heading either tells the reader to do something or explains. The first kind starts with a bare verb and the second is a noun phrase. Siblings at one level share one form."

**11. The Mermaid count does not reconcile with the ruling it cites or with the sentence two paragraphs later.**
> "eleven Mermaid figures ship under that ruling" (line 197)
> "which is the case for the two ownership figures" (line 214) and "The ownership map moves to the architecture page." (line 234)

Rule: a countable claim against a cited source. The 2026-08-15 ruling keeps twelve (eight extend, three admin, one editors) and names one ownership map, in the admin track. Eleven works only if exactly one keep is the hand-authored exception; the figure-rules paragraph says two ownership figures are, which yields ten. For the claims checker.
Rewrite: state the arithmetic. "The ruling kept twelve figures. The two ownership figures are the hand-authored exception below, so ten ship as Mermaid."

**12. The hinged-pair target appears for the first time in the receipt.**
> "| … | at or under the corpus entry plus 15 points | fail; 38 against 0 … |" (line 431)

Rule: decidability, and the receipt's job of grading against stated rules. The fifteen-point tolerance is the right shape and closes revision 4's finding 3, but no rule in "The prose rules" or step 4 states it, so the reader cannot check where fifteen came from or whether the document chose it after seeing its own number. Step 4 in fact says nothing gates and the bands stay advisory.
Rewrite: add the tolerance to step 4 as the reported comparison ("the report states the page's hinged-pair share against its corpus entry's, and a share more than fifteen points above the entry is called out"), and let the receipt cite it.

**13. Capper residue on three section-opening or section-closing lines.**
> "Docs get the chain code has." (line 278)
> "The pages people write set the bar high." (line 184)
> "The closing checklist is SQLite's device, and it is what makes the reader decide." (lines 155-156)

Family: crafted pivots and cappers; the third is a cleft that also overclaims what a checklist does. The first is a clipped four-word aphorism opening a section in a document whose baseline sentence runs seventeen words.
Rewrite: "The review chain gives a page the same steps a code change gets." / "The corpus entries set the bar high." / "The closing checklist is SQLite's device, and it gives the reader something to answer."

**14. Two sizes disagree with the cost review the document cites for sizes.**
> "| 10 | Approve the Claude setup changes as listed | small, except the scanner change, which is medium |" (line 415)
> "| 4 | Adopt the three structure levels, the eight page types, three templates now and five later, and the two new scripts | medium |" (line 407)

Rule: decidability, and consistency with a cited source. The cost review sizes the scanner change "**~285 lines, 2 new files, no new dependency. Small.**", and the document itself repeats the 285 lines at line 339 while pricing it medium. Item 4 is the one row revision 4's finding 8 named that was not split: three templates, eight page types, three structure levels, and two scripts under one "a script or a tuned package" tier.
Rewrite: price the scanner small and cite the cost review; split item 4 into the levels and page types (small) and the two scripts plus three templates (medium).

**15. Two rules answer three named gate failures, and the mapping is never made.**
> "Two rules stand above the four parts, and they answer the two faults no gate caught." (line 30)
> "The gates missed the draft's faults in three places." (line 48)

Rule: non-sequitur and missing middle step. Rule 1 answers the second place (nothing checked the facts). Rule 2, one section per read, answers none of the three: the third place is that nobody but the author read the page, and the review chain answers that, not rule 2. The reader counts two against three and finds no bridge.
Rewrite: "Two rules stand above the four parts. The first answers the facts nobody checked; the second answers how the draft was written, in one autonomous run." (Then let the review chain own the third.)

**16. Minor, bundled.** "a comma followed by a subordinator or a relative word" (line 378) describes a list that includes "so", "yet", and "as", two of which are coordinators; "or a coordinator" belongs in the phrase. Line 33 runs 150 characters in the source where the file otherwise wraps near 95, and line 249 is flush left under its bullet (finding 1). "Diátaxis, DITA, Information Mapping, Every Page Is Page One" (lines 126-127) remain four named entities with no link, mitigated only by the research link that follows; the structure research is the right anchor but the sentence does not say the four are covered there.

---

## Closure table for the seventeen revision-4 findings

| # | Revision-4 finding | Status | Evidence in revision 5 |
|---|---|---|---|
| 1 | Paragraph floor violated; receipt reports zero | partly closed | Script now counts `shortParagraphs` with the `leadIn` exemption; row added: "Paragraphs under 3 sentences, list lead-ins exempt \| 2 \| … \| fail". The count is plausible but the two are misnamed, and both violations remain in the text: fresh finding 1 |
| 2 | 48/44/67 measured on a different instrument, undisclosed | closed | "the extend track … builds 54 percent … and the reference track builds 58 percent"; "The earlier figures of 48 and 44 percent, and the 19-to-44 band from five pages, were taken on a narrower instrument and are not comparable"; the 17-point splitter finding is in Limits. The disclosure's own tense is now stale: fresh finding 3 |
| 3 | Hinged-pair row unfalsifiable ("reported" as target) | closed | "at or under the corpus entry plus 15 points \| fail; 38 against 0. The instrument is unsettled, so this fails as a reading, not as a gate". Tolerance unsourced in the body: fresh finding 12 |
| 4 | Anaphoric skeletons, three instances | partly closed | Four-part "The X rules say" broken ("They adopt the Federal Plain Language Guidelines…" / "Which pages exist … are the structure rules"). Three-part "The docs set decides" broken into "At the top, the docs set decides which pages exist. Below it, each page decides its own sections and their order, and each section decides how one block of text is built." Heading triad folded into one 33-word sentence. Two new tells: fresh findings 9, 10 |
| 5 | H2 siblings do not share the article | closed | "## The exclusions", "## The limits", "## The receipt"; all seven H2s now take an article, and the H3 and H4 sets are consistent |
| 6 | Track sentence a four-clause splice | closed | "Editors write in the admin and never see a terminal, while site admins run a site without writing code. Developers extend cairn, and the reference is where those last two look things up." — the prescribed rewrite verbatim |
| 7 | 38-word template rule, four ideas | closed | "Each page type would get a fixed section order, held in a template under `docs/internal/templates/`. Decision 4 creates that directory. A new `check:anatomy` script would read the template, so template and gate cannot drift apart." — verbatim |
| 8 | Three decisions exceed the size legend's unit; "large" unused | partly closed | 5 split into 5/5a, 8 split into 8/8a; legend now reads "No item is large; the one large item, the docs pass, is excluded above." Item 4 unsplit and item 10's scanner mis-tiered: fresh finding 14 |
| 9 | Decision 3's clearing unsized | closed | "small for the rule; medium for clearing the 135 admin and 61 editors sentences that exceed it, which must come first under the severity contract" |
| 10 | Mozilla entry approved sight-unseen | closed | "A second editors entry is owed; the Mozilla support articles block automated reads, so it must be chosen by hand and approved separately." — verbatim |
| 11 | "has a mechanical half / two lanes" nominalized subjects | closed | "A script grades part of a figure and a reviewer grades the rest."; "Figures are produced in two lanes, and one rule routes between them." |
| 12 | Klare unsourced | closed | The name appears nowhere in revision 5; the Redish and 2024-trial citations carry the exclusion alone |
| 13 | Three names for one thing; used before defined | partly closed | "exemplar pages" gone ("Ten of the fourteen pages the structure research surveyed"). "Corpus" and "band" are still used at lines 57-58, ~180 lines before their definitions, and line 184 keeps "The pages people write": fresh finding 7 |
| 14 | Sentences row has no target and no status | closed | "\| Sentences \| 237 \| 152 \| 6 \| \| count only \|" |
| 15 | Average-length status contradicts its numbers | closed | "pass on both; the all-sentences figure runs lower because it counts list items, which the standard wants short" — verbatim |
| 16 | Evidence-base link escapes the repo; brief not linked at rule 1 | closed | "(the workstation's evidence base at `~/.claude/skills/writing-voice/evals/research/2026-09-01-ai-tell-evidence-base.md`)" is now a plain path in code, not a link; rule 1 carries "(today's is [front-door-author-brief.md](front-door-author-brief.md))", and the file exists. `docs-register.md`, `TwoHeadedHeading.yml`, `measure-prose.mjs` all resolve at their stated depths |
| 17 | Passive voice where the actor matters | closed | "The standard sets structure at three levels, and each level would get its own gate."; "Decision 4 defers the other five orders until their templates are drafted, and approves the three now." |

Eleven closed, four partly closed, none flatly not closed. The specific items the task asked me to verify all check out except one: the two short paragraphs the receipt reports are **not** the ones it names.

## Verdict

Not ready for the owner's read: the receipt's short-paragraph row names two paragraphs that its own colon exemption and sentence count rule out while the two real violations sit unnamed at lines 30 and 249, decision 11 still approves `render-safety.md` after the body moved the demonstration to `add-a-custom-admin-screen.md`, and the instrument disclosure describes revision 4's change as this revision's with a ten-point figure that matches neither column of the table beneath it. The single change that would move it most is to re-run the script and rewrite the receipt from the output rather than from revision 4's receipt, since every remaining severe finding is a cell or a disclosure carried forward instead of re-derived.

Files: `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/corpus-sample-sqlite.md`, `/var/home/glw907/Projects/cairn-cms/scripts/checks/measure-prose.mjs`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/proposal-review-rev4.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/proposal-review-cost.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-08-15-docs-visual-layer-rulings.md`.

One caveat on method: I had no shell in this run, so the document's own columns (237/152, 35/38 percent, the paragraph count) are unverified except by hand segmentation; the corpus column and the longest-sentence cell I did verify by hand, and finding 1 rests on the receipt's stated exemption rule and a five-sentence paragraph, not on my count.
