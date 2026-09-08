# Proposal review: revision 3 graded through its own chain

The register editor's grade of revision 3 (Opus, fresh context, 2026-09-08), against the SQLite corpus sample, with the closure table for revision 2's eighteen findings. Folded into revision 4.

---

## Grade: `docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`, revision 3

Graded against the named corpus entry the document itself used, **SQLite, "Appropriate Uses For SQLite"** (excerpt at `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/front-door-prose-comparison-2.md` lines 12–13), with the measurement table beside the verdict, per the document's own step 4 and step 6.

### Measurement table (the one the receipt omits)

I ran the document's own hinge definition (`scripts/checks/measure-prose.mjs` line 50) by hand over the six-sentence SQLite excerpt, since the receipt never measured its corpus entry.

| Measure | Proposal (its own receipt, prose) | SQLite "Appropriate Uses" excerpt, same definition | Verdict |
|---|---|---|---|
| Sentences | 132 | 6 | — |
| Average length | 17.6 | 18.8 | comparable |
| Longest | 38 | 33 | comparable |
| Hinged pairs, all forms | **46 percent** | **17 percent, and that one hit is a serial-list false positive; a hand read gives 0 percent** | **fail** |
| Sentences under 8 words | 11 percent | 0 percent | acceptable |
| Corpus entry cited beside the numbers | absent | — | **fail, rule broken by the receipt** |

The document's whole diagnosis is the hinge rate. It measures 46 percent against a corpus entry that measures near zero on its own instrument, and reports the row as "reported."

---

## Ranked findings

**1. The receipt does not carry the corpus entry's numbers, which the document's own review chain requires.**
> "The tell scanner reports the sentence numbers, the hinged-pair share, and the short-sentence share **beside the corpus entry's numbers**." (step 4)
> "Its report carries the page type, the corpus entry, the **measurement table**, and the verdict." (step 6)
> Receipt: "Corpus entries used while drafting: SQLite, Appropriate Uses, for the structure and the closing checklist"

Rule: the document's own steps 4 and 6; register standard's grading method. Naming an entry is not citing it beside a number. The corpus column is the one column the receipt table lacks, and it is the column that would have failed the page.
Rewrite: add a "corpus entry" column to the receipt table, populated by running `measure-prose.mjs` over the excerpt at `front-door-prose-comparison-2.md` lines 12–13, and let the hinge row read `46 percent vs 0 to 17 percent — fail`.

**2. "It excludes serial-list commas by that definition" is false, and it is checkable in the script the sentence links.**
> "It excludes serial-list commas by that definition." (Limits)

`HINGE` is `/(?:,\s+(?:and|but|so|or|yet|which|...)\b)|.../`. It fires on the final comma of every Oxford-comma serial list. The document's own "the page type, the corpus entry, the measurement table, and the verdict" scores as a hinged pair. So the 45/46 percent is inflated by an unknown amount, in the one number the whole proposal turns on, in a section titled "Limits" that exists to disclose exactly this.
Rewrite: "The pattern still fires on the final comma of a serial list, so the reported share is an upper bound. Excluding serial lists is the first change to the script."

**3. The receipt's status column carries unrendered template artifacts in four of eight rows.**
> `| Paragraphs over 8 sentences or 150 words | 0 | | 0 | 0_STATUS |`
> `| Vale, Google package forced | 0 errors, 21 warnings and 115 suggestions | | errors 0 | 0 errors, 21 warnings and 115 suggestions_STATUS |`
> `| Tell scanner findings | 0 | | 0 | 0_STATUS |`
> `| Three-item lists counted by the scanner | 5 | | each one a real list | 5_STATUS |`

Family: the revision-2 "raw dict in the table" defect, recurring in a new form. The status column, added to close that finding, is the column that broke. It also means no row states pass or fail for the 21 warnings, and "each one a real list" asserts a verdict on five tricolons without naming one.
Rewrite: `| ... | 0 | | 0 | pass |`; for Vale, `| ... | 0 errors, 21 warnings, 115 suggestions | | errors 0 | pass on the gate; 21 warnings unaddressed |`; for the tricolons, list the five and mark each.

**4. The load-bearing figure rule is the document's longest sentence, one word under its own ceiling, and carries four ideas.**
> "A figure, meaning a diagram or a screenshot, may appear only where the fact being taught is a relation among three or more parts, or a branch between paths, that prose would have to state as a series." (38 words)

Rule: the document's adopted Part III, "A sentence must express one idea and keep its subject, verb, and object close together." Subject and verb are split by an appositive; two admissible conditions and a relative qualifier ride behind.
Rewrite: "A figure is a diagram or a screenshot. It may appear only where prose would have to state a relation among three or more parts as a series, or where the fact is a branch between paths."

**5. The heading rule breaks the sentence rule in the sentence that states it.**
> "A heading that tells the reader to do something must start with a bare verb, a heading that explains must be a noun phrase, and sibling headings must share one form."

Rule: adopted Part III, one idea per sentence; also a reflexive triad. Compounding: the enforcement named next, "the two-headed-heading Vale rule that landed today," matches only `^[^,\n]+, and ` (`.vale/styles/Cairn/TwoHeadedHeading.yml`), so it cannot hold the sibling-form clause at all.
Rewrite: three sentences, and drop the claim that the existing Vale rule holds the grammar; it holds one shape of one head.

**6. "Structure is set at three levels" is followed by four subsections.**
> "Structure is set at three levels, and each level has its own gate. The docs set decides which pages exist. The page decides its sections and their order. The section decides how one block of text is built."
> …then `#### The docs set`, `#### The page`, `#### The section`, **`#### The front door`**

Family: the revision-2 "one reason then three" defect, inverted. The front door is either a fourth level or a page type misfiled under structure; the reader cannot tell, and decision 4 asks for "the three structure levels" without it.
Rewrite: move `#### The front door` under the page level as a named page type, or say "three levels, plus the front door's own section order, which is decided page by page."

**7. Four decisions of eleven cannot be decided from the text and the size column.**

- Item 3, "after clearing the existing violations" — the violation count is never given, so the owner approves unbounded clearing work labelled "small."
- Item 4, "the eight page types, the templates" — section orders are given for three of the eight (task guide, concept page, reference entry). Approving "the templates" approves five unwritten shapes.
- Item 9, "your time per page" — no page count, no minutes, no volume. This is the only item drawing on the scarcer of the two budgets and the only one with no number at all.
- Item 11, "the worst-measuring extend page" — unnamed, so the owner approves a demonstration without knowing its subject.

Rewrite: give item 3 the violation count from the Vale run you already have; give item 4 either the five missing section orders or a scoped "three templates now, five later"; give item 9 a page count times an estimated read, from the reader-test section's own scope ("task guides and the front door"); name the page in item 11.

**8. The heading "Decisions and costs" promises costs and delivers t-shirt sizes.**
> "## Decisions and costs" … "| # | Decision | Size |"
> "The sizes come from the cost review's table, where small is a file or two, medium is a script or a tuned package, and large is a pass."

The only token figure in the document ("six to nine million tokens and 31 to 73 attended sittings") is attached to the one item deliberately excluded from the table. In a repo whose plan headers require a token ceiling, three "medium" cells are not a cost. Revision-2's "decisions with no cost" is half closed: sizes appeared, costs did not.
Rewrite: retitle "## The decisions", and add a token column carrying the cost review's per-item numbers.

**9. Two adopted rules are unmeasured, one of them by a measure the receipt could have reported.**
> "Paragraph length must vary across a page." — the receipt reports only "Paragraphs over 8 sentences or 150 words | 0". Variance is adopted and ungraded.
> "Part V, test. A page must be tested with a reader before it ships." — "The cold-reader test ran on revision 2 … its six unclear passages are fixed in this revision." The revision being shipped has not been reader-tested, and the six fixes are ungraded by anyone.

Rewrite: report a paragraph-length distribution row; and state plainly, "Revision 3 has not been reader-tested. The six fixes from revision 2's test are unverified."

**10. "Register" does two jobs; "band" is never defined.**
> "The register, the repository's own style document at `docs-register.md`" … "**The voice register files** under `~/.claude/docs/voice/`, one per audience"
> "the bands stay advisory until a track has a thousand sentences from ten documents behind them" — first use, undefined

Rule: adopted Part III, "the same term for the same thing every time"; and "A term the reader is not expected to know must be defined where it is used." Equivocation on the load-bearing word, plus one undefined term the decisions lean on.
Rewrite: call the `~/.claude/docs/voice/` files "the voice files"; on first use, "a band, meaning the range a corpus entry's measurements set for a track."

**11. ASD-STE100's descriptive ceiling is applied to the two instructional tracks.**
> "| Sentence ceiling, admin and editors tracks | 25 words | ASD-STE100 … whose descriptive ceiling this is |"

STE pairs 20 words with procedural sentences and 25 with descriptive ones. The admin and editors tracks are the instructional tracks; the document takes the looser number and names the mismatch nowhere. It also compounds a mechanics problem the document never raises: the change edits a vendored package file (`.vale/styles/Microsoft/SentenceLength.yml`, currently `level: suggestion, max: 30`), which conflicts with the same document's "Their Vale packages are vendored and pinned in CI."
Rewrite: "25 words, STE's descriptive ceiling, chosen over its 20-word procedural ceiling because [reason]," and route the change through a `Cairn/` override rather than an edit to the vendored file.

**12. "Nobody saw its findings" is contradicted by the config and by the receipt.**
> "The Microsoft sentence-length rule has been running on the editors track at 'suggestion' all along, which is why nobody saw its findings"

`.vale.ini` line 2 is `MinAlertLevel = suggestion`, so suggestions surface. The receipt itself reports 115 suggestions it saw. The severity is accurate; the causal claim is not.
Rewrite: "…at 'suggestion' all along, so its findings were advisory and nobody acted on them."

**13. The proposal describes itself and its own filing in its first paragraph.**
> "This proposal is an internal record, not a published page, so it stays in this directory even though the rule it proposes sends published drafts elsewhere."

This closes the revision-2 record-directory contradiction by committing the tell the same document adds to the tell list ("the page describing itself") and the rule it states ("No page may name its own type or track"). The exemption is real; announcing it is the slip.
Rewrite: delete the sentence. Put the reasoning in the decision-4 or step-1 text, where the routing rule lives.

**14. Present tense describes things that do not exist.**
> "Each page type has a fixed section order, held in a template under `docs/internal/templates/` and checked by a new `check:anatomy` script"

`docs/internal/templates/` does not exist in the repository. "A new script" flags one half; "held in a template under" states the other half as fact. Same family as revision 2's "existing script."
Rewrite: "Each page type would get a fixed section order, held in a template under `docs/internal/templates/`, a directory this decision creates."

**15. Present-tense figure claims: one artifact is disclosed as uncommitted, two are not.**
> "it is emitted from `docs/internal/site-figures.svg` by `scripts/figures/build-site-figures.mjs`, which is written but not yet committed"

`git status`: `scripts/figures/` untracked, `docs/internal/site-figures.svg` untracked, `docs/extend/assets/` untracked. The relative clause covers the script only, while the source SVG is stated as existing. Verified true elsewhere: eleven Mermaid fences do ship in the published arms, and the 2026-08-15 ruling exists (`docs/internal/docs-register.md`, Visuals; record at `docs/internal/record/2026-08-15-docs-visual-layer-rulings.md`).
Rewrite: "…by `scripts/figures/build-site-figures.mjs`. Neither the source nor the script nor the emitted assets are committed yet; decision 5 commits them."

**16. "The node count stays under the register's budget" gates on a number the register does not give.**

The register says "about 15 nodes; split or simplify past it" — a soft budget with a judgment word. A `check:figures` assertion needs a hard integer.
Rewrite: "the node count stays at or under 15, fixing the register's 'about 15' at a gateable number."

**17. Two unsourced claims carry weight, and one is contradicted by the nearest measurement in this repository.**
> "the 65 is the longest sentence on SQLite's scope page"

The repo's own measurement of that page's excerpt (`front-door-prose-comparison-2.md` line 42) gives a max of 35 across 32 sentences. The 65 may come from a part of the page outside the excerpt, but nothing in the record supports it, and it is the number that sets the 2-percent exception. For the claims checker.
> "the three strongest 'why' pages" — unnamed, unranked, unsourced, and the section order they supposedly share is the whole front-door decision.
Rewrite: quote the 65-word sentence in a footnote, or drop the exception to "under 40, no exception"; name the three pages.

**18. Adopted Part II conflicts with the document's own layout, unresolved.**
> "Part II, organization. A page must put its most important information first and the general case before the exception. The structure rules below hold this."

The eleven decisions, the only thing the owner acts on, sit at 90 percent depth. The document's own concept-page order also puts "where to go next" last. Which rule governs is never said.
Rewrite: either move the decisions table to just after "The failure it answers," or state the exception: "This record puts its ask last, because a decision list read before the reasoning is a list of unsupported claims."

**19. Two connector openers and a cluster of cappers.**
> "**And** nobody but the author read the page before you did."
> "**And** the average is never a gate, because…"
> "It is the one instrument on that page that turns the argument into the reader's own decision."
> "**No third tool.**" (verbless fragment)
> "The register is the durable record."
> "The numbers here locate a passage for a person to judge."

Family: connector openers, aphoristic cappers, verbless fragment. Roughly the same density as revision 2's six.
Rewrite: "Nobody but the author read the page before you did." / "The average is never a gate, because…" / "The checklist is SQLite's closing device, and it is what makes the reader decide." / "Mermaid and hand-authored SVG are the only two lanes." / delete the last two cappers; the sections end without them.

**20. Inventory and drum-machine cadence in the opening two paragraphs.**
> "Editors write in the admin and never see a terminal. Site admins run a site without writing code. Developers extend cairn. The reference is where the last two look things up."
> "The prose rules say… The structure rules say… The figure rules say… The review chain gives…"
> "The docs set decides which pages exist. The page decides its sections and their order. The section decides how one block of text is built."

Three consecutive anaphoric skeletons, one per opening section. Against the SQLite specimen, which never runs the same sentence shape twice in a row.
Rewrite: fold the track list into one sentence with the differences carried by subordination; break the four-part anaphora by giving one part its own two-sentence treatment.

**21. Links: two in-repo sources named by date and never linked; one authority cited to a third-party mirror.**
> "The register ruled most of this on 2026-08-15" — no link, though `docs/internal/record/2026-08-15-docs-visual-layer-rulings.md` exists.
> "the two-headed-heading Vale rule that landed today" — no link, though `.vale/styles/Cairn/TwoHeadedHeading.yml` exists.
> "[the 2011 PDF](https://wid.org/wp-content/uploads/2022/03/FederalPLGuidelines.pdf)" — an advocacy organization's mirror standing in for the citation of a document the same paragraph asks to vendor and pin.

Rule: Wikipedia first-occurrence linking; citation-shaped claims (a date, a rule) must give their source. Rewrite: link both repo paths at first mention; state that the PDF's only reachable copy is a mirror, which is the reason to vendor it.

---

## Closure table for the eighteen revision-2 findings

| # | Revision-2 finding | Status | Evidence |
|---|---|---|---|
| 1 | Receipt hid failures | **not closed** | Status column added, then broken (`0_STATUS`); the 46 percent hinge row reads "reported"; 21 warnings unjudged. Findings 1, 3 |
| 2 | "must" once in forty requirements | closed | 36 occurrences of "must"; the rule bullets and structure rules all carry it |
| 3 | False "vendored PDF" claim | closed | "That revision is not yet in the repository. Vendoring it as a PDF is part of the first decision below" |
| 4 | "one reason" then three | **not closed, new instance** | "Structure is set at three levels" followed by four `####` subsections. Finding 6 |
| 5 | Steps with no owner | **partly closed** | "each names who does it" is an overclaim: steps 2, 3, 4, and 7 name a script or a test, not a person or a runner |
| 6 | Decisions with no cost | **partly closed** | Size column added; no token figures; the only token number is attached to the excluded item. Finding 8 |
| 7 | Three names for one thing | **not closed, inverted** | One name for two things: "the register" is `docs-register.md` and "the voice register files". Also "corpus entries" vs "exemplar pages" vs "pages people write". Finding 10 |
| 8 | Mixed heading forms | closed | All headings are noun phrases; no two-headed form. Minor residue: "Exclusions", "Limits", "Receipt" drop the article its H2 siblings carry |
| 9 | Six aphoristic cappers | **not closed** | At least six remain, plus a verbless fragment. Finding 19 |
| 10 | Four "It is not" anaphoric paragraphs | **not closed, new form** | The anaphora moved to "The X rules say…" and "The X decides…". Finding 20 |
| 11 | Self-describing opener | **not closed** | "This proposal is an internal record, not a published page, so it stays in this directory…". Finding 13 |
| 12 | Inventory sentences | **not closed** | "Editors write in the admin… Site admins run… Developers extend… The reference is where…"; "They are a comma followed by a coordinator…, a colon or semicolon…, a spaced dash, and a comma followed by…". Finding 20 |
| 13 | One "we" | closed | Zero occurrences of we/our |
| 14 | Five unsourced claims | **partly closed** | Most now carry links. Remaining: "the 65 is the longest sentence on SQLite's scope page", "the three strongest 'why' pages", "every mature docs team keeps", "a judge from the same family shares the drafter's blind spots", "The formula authors themselves warned". Finding 17 |
| 15 | Record-directory contradiction | closed, at a cost | Resolved by the sentence that reintroduces the self-describing opener. Finding 13 |
| 16 | No links | closed | Sixteen links, mostly descriptive anchors. Residue in finding 21 |
| 17 | "existing script" for an uncommitted script | **partly closed** | The figures script is disclosed; `docs/internal/site-figures.svg`, `docs/extend/assets/`, and `docs/internal/templates/` are stated as existing and do not. Findings 14, 15 |
| 18 | Raw dict in the table | **not closed, recurred** | `0_STATUS`, `5_STATUS`, `0 errors, 21 warnings and 115 suggestions_STATUS`. Finding 3 |

Six closed, four partly closed, eight not closed.

## Verdict

Not ready for the owner's read: the receipt still fails its own rule by grading the page without its corpus entry's numbers, the one number the proposal exists to fix measures 46 percent against a corpus entry at zero to seventeen and is reported rather than failed, the status column added to close that gap ships four unrendered `_STATUS` cells, and four of the eleven decisions cannot be decided from the text and the size column.

Files read: `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/front-door-prose-comparison-2.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/proposal-review-self.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/docs-register.md`, `/var/home/glw907/Projects/cairn-cms/scripts/checks/measure-prose.mjs`, `/var/home/glw907/Projects/cairn-cms/scripts/figures/build-site-figures.mjs`, `/var/home/glw907/Projects/cairn-cms/.vale.ini`, `/var/home/glw907/Projects/cairn-cms/.vale/styles/Microsoft/SentenceLength.yml`, `/var/home/glw907/Projects/cairn-cms/.vale/styles/Cairn/TwoHeadedHeading.yml`.
