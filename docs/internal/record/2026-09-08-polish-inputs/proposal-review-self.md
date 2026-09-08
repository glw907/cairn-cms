# Proposal review, lens 1: does the document hold to its own standard

Adversarial review of `docs-standard-proposal.md` revision 1 (Opus, fresh context, 2026-09-08), graded against the 2011 Federal Plain Language Guidelines text and the live digital.gov guides. Folded into revision 2.

---

I have what I need. Writing up.

---

# Lens 1: SELF-CONFORMANCE — `docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`

## Source of truth used

`plainlanguage.gov/guidelines/` **301-redirects to `digital.gov/guides/plain-language`** as of today; the content was re-cut into four guides with different headings. I recovered the canonical 2011 text (PDF, Rev. 1 May 2011) and extracted it to text, plus the four live digital.gov guides. Both were graded against.

---

## Ranked findings

**1. The two numbers the proposal calls the reason to adopt this standard are not in the standard.**
> "Their rules have numbers, which is what makes them enforceable. The rules we adopt: — Keep the average sentence between 15 and 20 words. Let no sentence pass 40." (lines 36–39)

Rule: FPLG III.b.1 "Write short sentences." I grepped the full 2011 text for `20 words`, `40 words`, `average.*words`, `words per sentence`: **zero hits.** The section reads in full: *"Express only one idea in each sentence. Long, complicated sentences often mean that you aren't sure about what you want to say…"* — no number anywhere. digital.gov's `principles/short-simple` page explicitly carries no numeric guidance either. The only numbers in the entire Federal guidelines are the paragraph ones (150/250 words, three to eight sentences), which the proposal did not adopt.
This is the same failure the document says it corrected: "The invented specimen from the front door is already withdrawn" (line 95). It withdrew an invented specimen and shipped invented numbers attributed to a named external authority in the same document.
Rewrite: "The guidelines set no sentence-length number. I propose 15–20 average and a 40-word ceiling as *our* numbers, sourced from [X], layered on top of the guidelines."

**2. The one numeric rule the guidelines actually contain is the one rule the proposal dropped.**
> "- Keep one topic in each paragraph, and keep paragraphs short." (line 45)

Rule: FPLG III.c.3 — *"Writing experts recommend paragraphs of no more than 150 words in three to eight sentences. Paragraphs should never be longer than 250 words."* The proposal converts the standard's only enforceable number into the unenforceable adjective "short," in a document whose thesis is that numbers are what make rules enforceable. Rewrite: adopt 150/250 and three-to-eight verbatim; they are free, sourced, and gateable.

**3. The Vale row of the measurement table is vacuous.**
> "| Vale, Google package | 0 errors | | |" (line 197)

`.vale.ini` line 52: `[docs/internal/**]` → `BasedOnStyles =`. The file sits under `docs/internal/`, so **zero rules ran**; Vale returns `0 errors, 0 warnings, 0 suggestions`. I re-ran it with the Google package forced on: **19 warnings and 27 suggestions**, including 9 × `Google.Contractions`, 7 × `Google.We`, 6 × `Google.Passive`, 4 × `Google.WordListCase` ("above" → "preceding"), 2 × `Google.ExcessiveClaims` ("best"), 2 × `Google.Anthropomorphism` ("tells"), 2 × `Google.OxfordComma`, and `Google.Headings` on line 54. The metric is doubly gamed: the path is exempt, and "0 **errors**" excludes the two severity levels where every finding lives.
Rewrite: `| Vale, Google package (forced on; path is style-exempt) | 0 errors, 19 warnings, 27 suggestions |`

**4. The tell-scanner row is circular.**
> "| Tell scanner | 0 tells | | |" (line 198)

I ran `tellgrader` on the file: `"findings": []`, but also `"counts": {"tricolon": 2}` and `"sentences": 134`. The document's own argument (line 78) is that the scanner lacks the cadence measures. Reporting a clean score from the instrument you have just declared blind is not evidence. It also silently counted two tricolons — a banned tell — without raising them.
Rewrite: drop the row, or state "0 tells from a scanner that does not yet carry the two measures this proposal adds."

**5. "Adopt the Federal Plain Language Guidelines" asks for far more than the body specifies, and never says so.**
> "1. Adopt the Federal Plain Language Guidelines as the prose standard, with the numbers above." (line 206)

The guidelines carry roughly 40 numbered rules across five parts. The proposal lists 8, two of which are not in the source (finding 1). It never says the adoption is a subset. Geoff is asked to approve a name; what ships is eight bullets, and neither Geoff nor a future reviewer can tell which. Rewrite: "Adopt these eight rules, drawn from the Federal Plain Language Guidelines. Sections I (audience), IV (web), and V (test) are out of scope for now, for these reasons."

**6. The colon-hinged pair is the comma-hinged pair with a different hinge, and neither measure sees it.**
> "Its two sentence ceilings are right for our instructional tracks: 20 words for a sentence that gives an instruction, 25 for a sentence that describes." (line 57)
> "First, the Vale hook grades a draft by its destination: a file under a record directory whose name…" (line 151)
> "Each register file gains three things: the plain-language standard beside its mechanics guide, a specimen set…, and the cadence band those specimens set." (lines 135–138)

**17% of the prose sentences (14 of 81) carry a colon or semicolon**, nearly all in setup-payoff shape — the exact rhythm the comma-hinge measure exists to catch, and a construction the workstation writing rule bans by name ("No setup-colon payoff"). Add them to the strict comma hinges and the real hinge rate is **~37%**, not the reported 20%. This is the answer to "is the measure gamed": yes, structurally. The document passes by moving the hinge one keystroke to the right.
Rewrite: the cadence measure must count comma, colon, semicolon, and dash hinges as one family, or it certifies a rewrite that changed nothing.

**7. The document opens with the tell it bans on line 130.**
> "This document follows the standard it proposes. Its own measurements are at the end, so you can test the standard on the page that describes it." (lines 3–4)
> …banned at line 129–130: "three tells the front door exposed: the two-headed heading, the abstract noun standing in for the concrete thing, and **the disclaimer about the page itself**."

Rewrite: delete both sentences. Put the measurements at the end without announcing them; a reader who reaches them will know what they are for.

**8. The document carries the two-headed heading it says it just gated.**
> "### Instructions: the global and project `CLAUDE.md`" (line 112)
> …vs. "The two-headed heading rule landed today." (line 160)

I read `.vale/styles/Cairn/TwoHeadedHeading.yml`: `raw: ['^[^,\n]+, and ']`. It matches only the *comma-and* form. The colon form is invisible to it, and the file is style-exempt anyway, so the rule could not fire twice over. Rewrite: `### The CLAUDE.md files`, and extend the rule's regex to `^[^:\n]+: `.

**9. "Define a technical term the first time" is adopted on line 44 and broken eleven times.**
Undefined at first use, all of them load-bearing: **register** (66), **specimen** (66), **tell** (78), **band** (79), **track** (20), **gate** (10), **cadence** (78), **slice** (104), **polish-B** (104), **front door** (18), **hook mode / gate mode** (145–146). FPLG III.a.3.iii "Dealing with definitions" and digital.gov `avoid-jargon` → "Define a word where you use it."
The excuse — Geoff knows these words — is the excuse the guidelines exist to refuse, and it is the excuse that produced the failure this document is about: "It used engine vocabulary, like 'seams,' on a page for a reader who has never seen the engine" (line 22). Rewrite: define register, specimen, tell, and band at first use, in one clause each.

**10. Hidden verbs, banned on line 42, present throughout.**
> "the tooling rewarded rule **compliance** and never asked the author" (line 108) → "I checked the draft against the rules and never asked you."
> "Their report carries the **measurement** table beside the verdict." (line 166) → "Their report says what they measured, beside the verdict."
> "**A person holds the reading**" (line 81) → "A person reads it."
> "the **measured read**" (line 173), "**calibration** specimens" (line 94), "Their **dispatch** names the register" (line 165).

Rule: FPLG III.a.1.iii "Avoid hidden verbs" and III.a.2.i "Don't turn verbs into nouns." Both of the nominalizations the brief predicted — *compliance*, *measurement* — are there.

**11. Tools and abstractions occupy the subject position of nearly every sentence that matters.**
> "**Three gates hold** this standard against the drift that every ungated rule suffers." (line 71)
> "**Vale holds** the numbers… **The tell scanner holds** the cadence… **A person holds** the reading" (73–81)
> "**The tooling** rewarded rule compliance and never asked the author." (line 108)
> "so a finding **teaches** the standard as it fires" (line 161)

Linters do not hold, reward, ask, or teach. Google's `Anthropomorphism` rule fired twice; the pattern is far wider than that. This is the tell the document itself names — "the abstract noun standing in for the concrete thing" (line 130) — deployed as the organizing device of its central section. The `Vale/scanner/person` triad is also an anaphoric three, which compounds finding 13.
Rewrite: "Vale fails a sentence over the ceiling. The scanner reports a page outside its band. I read the page before you do."

**12. The third gate is the author grading his own work, which is what the guidelines' Part V forbids.**
> "**A person holds the reading**: before a page reaches you, I read it myself, in full, against the specimens for its register." (lines 81–82)

FPLG Part V is "Test" — paraphrase testing, usability testing, controlled comparative studies, all with *readers*. The proposal adopts none of it and substitutes the writer re-reading the writing. That is precisely how the front-door draft passed. The `visual-fidelity` rule in this repo's own CLAUDE.md states the principle: "the context that built the UI never grades it." Rewrite: the third gate is a fresh context or a reader from the track's audience, not the author.

**13. Four "three X" constructions and two tricolons; the reflexive three-item list is the loudest AI tell here.**
> "Three gates hold this standard" (71) · "three tells the front door exposed" (129) · "Each register file gains three things" (135) · "change in three ways" (165)
> "find what they need, understand it, and use it" (51) · "brief first, one section per read, specimens beside every grade" (178)

`tellgrader` counted 2 tricolons and reported them as zero findings. Nothing in the material requires the number three four times over. Rewrite: state the actual count each time, even when it is two or five.

**14. The load-bearing premise of "Why the current standards were not enough" is false.**
> "Both guides work at the level of words: which term to use, how to capitalize it, when to use the active voice." (lines 15–16)

Google's style guide has a full "Sentence structure" and paragraph chapter; Microsoft's has explicit sentence-length guidance. What works only at the word level is the **Vale packages**, not the guides. The document conflates guide and linter, and the conflation is what motivates the entire proposal. Rewrite: "Both guides say things about sentences and paragraphs. Their Vale packages check almost none of it. The gap is in the tooling, not the standard."

**15. The proposal cites a URL that no longer resolves, in a document that demands pinning.**
> "The Federal Plain Language Guidelines (plainlanguage.gov) become the prose standard. The guidelines are published, free, and **stable since 2011**." (lines 35–36)
> …vs. "Their Vale packages are vendored and pinned in CI." (line 64)

`plainlanguage.gov/guidelines/` returns **301 → digital.gov/guides/plain-language**, where the material has been re-cut into four guides with renamed sections and some 2011 rules absent. "Stable since 2011" is not true today. The proposal demands version pins for Vale and gives its own prose authority a bare hostname. Rewrite: pin the March 2011 Rev. 1 PDF, vendor it into the repo, and cite section numbers.

**16. ISO 24495-1 is paywalled, and the document does not say so while praising the alternative for being free.**
> "The guidelines are published, **free**, and stable" (36) … "ISO 24495-1:2023 sets the test that the rules serve." (line 50)

Geoff is asked to adopt as "the definition of done for any page" a document he cannot read without paying, quoted here in paraphrase only. Rewrite: quote the clause, or drop the ISO citation and state the test in your own words (the 2011 introduction states it for free: *"find what they need, understand what they find; and use what they find to meet their needs"* — which is where line 51 came from anyway, unattributed).

**17. The methodology sentence is a fragment, and the script is never named.**
> "Measured with the same script used on the front door, over everything above this section." (line 187)

No subject, no finite verb, in the one sentence that makes the numbers checkable. "The same script" appears nowhere else in the document or its sibling records; there is no path, no invocation, no definition of "comma-hinged pair." Every number in the table is therefore unreproducible by the reader it is addressed to. I had to reconstruct the method to check it. Rewrite: "I measured this with `scripts/<path>`, over everything above this section. It counts a comma-hinged pair as …"

**18. The numbered ask is out of order.**
> "3. Approve the three gates… / **5.** Approve the Claude infrastructure changes, in the order listed. / **4.** Approve the docs pass…" (lines 208–210)

1, 2, 3, 5, 4 — and item 5 says "in the order listed." A proposal about prose rigor ships an unproofed decision list at the point of the ask. This is the first thing a skimming reviewer sees.

**19. The gates depend on inputs the document says do not exist yet.**
> "Each register gets a band set by its specimens. A page whose measures fall outside its band fails the gate." (line 79)
> …vs. "The register's calibration specimens **become** text you wrote or approved" (line 94, future tense).

No specimen sets exist, so no band exists, so gate two cannot be built or costed. The document presents it as one of three gates already designed. Rewrite: mark gate two as blocked on the specimen sets, and name who assembles them and when.

**20. Person is never settled: "I", "we", and "you" all appear, with "we" unattributed.**
> "no gate **we** run" (23) · "Human technical writing **we** measured" (28) · "the rules **we** adopt" (37) · "**we** do not adopt it" (57) · "**I** read it myself" (81)

`Google.We` fired 7 times. One of the eight adopted rules is "Address the reader as 'you'" (line 46); FPLG II.b is "Address one person, not a group." A two-party document from Claude to Geoff has no "we." Rewrite: "I" throughout for the author, "you" for Geoff.

**21. Unsourced statistics carrying the argument's weight.**
> "Human technical writing we measured for comparison runs 19 to 44 percent, and **the best of it** runs under 30. **A dozen** extend pages sit between 53 and 67 percent." (lines 28–29)

No specimens named, no corpus size, no page list, no link to the record. `Google.ExcessiveClaims` fired on "best." The band in the table ("19 to 44, best under 30") and the under-8 band ("0 to 16") are stated nowhere but the table itself. Rewrite: name the specimens and link the twelve pages, or drop the precision.

**22. Overclaim on ASD-STE100.**
> "ASD-STE100 is **the** aerospace standard for maintenance manuals." (line 56)

It is *a* controlled-language specification for aerospace maintenance documentation, not the industry's single standard, and the heading introduces "Simplified Technical English" while the body switches to an unexpanded acronym (`Google.Acronyms` fired on both `ASD` and `STE`).

**23. Rhetorical flourish in place of evidence, twice, at the two moments the argument is weakest.**
> "The extend track goes first, because its readers are **the developers whose respect the docs need most**." (lines 103–104)
> "If this page reads well to you, the standard works on at least one page. If it reads badly, the standard needs a rule it does not have, **and the place to find that rule is in what you disliked**." (lines 200–202)

The second is unfalsifiable by construction: both outcomes confirm the proposal. It is also a balanced antithetical closer, the highest-frequency closing tell. Rewrite: "Read it. If it is worse than the front door, say where, and I will withdraw the proposal."

**24. Uniform paragraph rhythm, against the guidelines' explicit warning.**
Of the 22 real paragraphs, 18 run 3–5 sentences and 34–81 words. FPLG III.c.3: *"Vary the lengths of your paragraphs to make them more interesting. As with sentence length, if all paragraphs are the same size your writing will be choppy."* The document met a sentence-length variance target and left paragraph rhythm flat, because no proposed measure looks at paragraphs at all.

**25. One-topic-per-paragraph, adopted on line 45, broken in the section named "What stays."**
> Lines 63–67 cover the Vale packages, the four-track docs structure, and the front-door register rulings — three unrelated topics, no topic sentence, in one paragraph.

FPLG III.c.1 "Have a topic sentence" and III.c.4 "Cover only one topic in each paragraph."

---

## Guideline rules the proposal did not adopt

Structure of the 2011 source: **I. Think about your audience · II. Organize · III. Write your document (words / sentences / paragraphs / other aids) · IV. Write for the web · V. Test.** Verdicts:

| Rule (FPLG section) | Verdict |
|---|---|
| I.a–b Identify and write for your audience; address separate audiences separately | **Matters most.** This is "the first rule of plain language" and the proposal adopts none of it — while the four-track docs structure it preserves is exactly an address-separate-audiences-separately design that would benefit from a stated rule. |
| II.a Organize to meet readers' needs; most important information first; general before exceptions | **Matters.** The document's own diagnosis is that the front door "failed above the word level." Organization is the level above the paragraph, and every proposed gate stops at the sentence. |
| II.b Address one person, not a group | **Matters.** Directly violated (finding 20). |
| II.c Use lots of useful headings (question / statement / topic) | **Matters most.** This is the rule that would have caught this document's own headings: "Hooks", "Memory", "Review agents", "The tell scanner" are bare topic labels a reader would not use to navigate. Unadopted, so unenforced, so present. |
| II.d Write short sections | Minor here. |
| III.a.1.ii Use the simplest form of a verb (present tense) | **Matters.** `Google.Will` fired on line 102 ("the way the front door will"). |
| III.a.1.iv Use "must" to indicate requirements | **Matters** for the admin and editors tracks, which are instructional and are exactly where the proposal puts its 20/25 ceilings. |
| III.a.1.v Use contractions when appropriate | **Matters.** 9 `Google.Contractions` findings on this page alone; the mechanics guide already wants them and the plain-language guide agrees. Cheap to adopt. |
| III.a.2.ii Use pronouns to speak directly to readers | Partially adopted (the "you" bullet); the "I"/"we" half is unresolved. |
| III.a.2.iii Minimize abbreviations | Minor, though `ISO`/`ASD`/`STE` all fired. |
| III.a.3.ii Omit unnecessary words; cut excess modifiers; avoid doublets and triplets | **Matters.** Delegated to `proselint`/`write-good` as a proxy without stating the rule. A vendored package is not a standard. |
| III.a.3.iii Dealing with definitions (define where used; don't define words you don't use; place a glossary at the end, alphabetical) | **Matters.** Half-adopted; the document breaks the adopted half eleven times (finding 9). |
| III.a.3.iv Use the same term consistently | **Matters.** The document alternates *gate / rule / measure / band / tell / ceiling* across overlapping meanings, which is why finding 5's subset problem is invisible on a first read. |
| III.a.3.vi Don't use slashes | Trivial. |
| III.b.2 Keep subject, verb, and object close together | Adopted. |
| III.b.3 Avoid double negatives and exceptions to exceptions | Minor. |
| III.b.4 Place the main idea before exceptions and conditions | **Matters.** The paragraph-level version of II.a; would catch the setup-colon-payoff habit that finding 6 exposes. |
| III.b.5 Place words carefully | Minor. |
| III.c.1 Have a topic sentence | **Matters.** Unadopted and violated (finding 25). |
| III.c.2 Use transition words | Minor. |
| III.c.3 Write short paragraphs — **150 / 250 words, three to eight sentences** | **Matters most.** The standard's only real number, dropped (finding 2). |
| III.d.1 Use examples | **Matters.** The guidelines run every rule as a Don't-say/Say table. The proposal gives one four-word example and never shows a before/after on a real cairn page — so no reader can see what the standard buys. |
| III.d.2–3 Use lists; use tables | Unadopted; the document uses both heavily with no rule governing when. |
| III.d.5 Use emphasis to highlight important concepts | Unadopted and abused: the bolded `Vale/scanner/person` triad is emphasis used as rhetoric. |
| III.d.6 Minimize cross-references | Minor. |
| III.d.7 Design your document for easy reading | Reasonable to skip for markdown. |
| IV Write for the web (top tasks, effective links, avoid PDF overload) | Reasonable to skip; the docs are already web pages, so a brief note on why would help. |
| V Test (paraphrase testing, usability testing, controlled comparative studies) | **Matters most.** Replaced by the author re-reading his own draft (finding 12). |

---

## My measurement versus the table

**Method.** Extract the body above `## How to test this proposal`. Join wrapped list-item continuation lines into whole items (the proposal's own extraction appears not to, which is where our sentence counts diverge). Strip headings and table rows. Split on `[.!?]` + whitespace, protecting short quoted abbreviations. Word count = whitespace tokens containing a word character after punctuation strip. "Comma-hinged" measured three ways: any comma; comma minus serial-list commas; hand-classified two-finite-clause hinges.

| Measure | Table (all) | Mine (all) | Table (prose) | Mine (prose) | Verdict |
|---|---|---|---|---|---|
| Sentences | 104 | **106** | 89 | **81** | Split differs; totals agree |
| Average length | 15.0 | **14.8** | 15.1 | **15.0** | **Honest** |
| Longest | 38 | **38** | 35 | **35** | **Honest** |
| Comma-hinged pairs | 21% | **44% any comma; 8% serial; 16–25% strict two-clause** | 20% | **43% / 8% / 16–25%** | Defensible under a strict definition that is never stated |
| Under 8 words | 12% | **13%** | 9% | **10%** | Honest |
| Sentences > 25 words | — | **13 (12%)** | — | **10 (12%)** | Not reported; exceeds the doc's own STE descriptive ceiling |
| Colon/semicolon-hinged | — | **15 (14%)** | — | **14 (17%)** | **Not measured. The evasion route.** |
| Vale, Google package | 0 errors | **0 rules ran; 19 warnings + 27 suggestions when forced on** | | | **Gamed** |
| Tell scanner | 0 tells | **0 findings, 2 uncounted tricolons** | | | **Circular** |

**Is it gamed?** Not on averages or the maximum — those reproduce. Three places it is:

- **The Vale row** is the worst: an exempt path reporting a clean run, at a severity level chosen to exclude every finding.
- **The comma-hinge regex** is not stated anywhere, so 21% is unfalsifiable, and it demonstrably misses the colon hinge (14 sentences, 17% of prose) that performs the identical rhythm. It also misses the `which`-chain the brief flagged — line 37, "Their rules have numbers, which is what makes them enforceable," is a hinge under any honest reading. Serial lists are *not* an overcount problem: only 8% of sentences carry one.
- **The band the document chose for itself is the loosest of the three it proposes.** It reports "under 40" as its ceiling. It proposes 20 and 25 for instructional tracks and never says which band this page is graded under — and 13 of its sentences exceed 25 words.

One number quietly fails: my prose average of 15.0 sits exactly on the band floor, and the all-sentence average of 14.8 sits **below** it. The document defines the gate as two-sided ("A page whose measures fall outside its band fails the gate," line 79) and does not flag that it is at or under the floor.

---

## Reading it as Geoff

It reads AI-written in five places, all quotable:

1. **The opening two sentences** (3–4) are a page talking about itself. That is the exact reflex that produced the front-door draft, appearing in the document that diagnoses it.
2. **The bolded triad** (73–84): "Vale holds the numbers… The tell scanner holds the cadence… A person holds the reading." Three parallel clauses, one personified verb, arranged for symmetry rather than because there are three of anything. No engineer writes a gate list this way.
3. **Four separate "three X"** constructions. Nothing in the material has a natural three.
4. **The closer** (200–202): "If this page reads well to you… If it reads badly…" A balanced antithesis engineered so that no answer can hurt it. It reads as a rhetorical move, and it is one.
5. **The setup-colon payoff, seventeen percent of the prose.** After a page arguing that the comma-hinged pair is the tell, finding the same cadence hinged on colons instead reads as a document that learned the measure rather than the lesson.

And one non-voice tell that will land hardest: the ask is numbered 1, 2, 3, 5, 4.

---

## Verdict

**It does not pass its own standard.** Two of the eight rules it adopts are not in the standard it names, the standard's only numeric rule is the one it dropped, it breaks its adopted define-at-first-use rule eleven times and its own banned-tell list twice on the first page, and its measurement table certifies a Vale run in which zero rules executed.

The averages and the maximum are honestly measured, and the argument that no gate looks above the word level is correct and worth acting on — but the page cannot serve as the demonstration it claims to be, because the one cadence it was built to avoid simply moved from the comma to the colon and no proposed measure follows it there.
