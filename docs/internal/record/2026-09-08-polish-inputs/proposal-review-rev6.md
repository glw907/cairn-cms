# Proposal review: revision 6, the last grade before the owner's read

The register editor's grade of revision 6 (Opus, fresh context, 2026-09-08): fifteen of sixteen revision-5 findings closed, ten residuals listed. Folded into revision 7, which goes to the owner.

---

## Method note

No shell in this run, so I could not execute `measure-prose.mjs`. The corpus column I verified by hand against the script as written; the document's own columns I checked by hand segmentation of every block above `## The receipt`, plus arithmetic on the candidate longest sentences. The figure counts I verified by grepping the repo. Everything below that rests on an unrun script is labelled.

## Corpus column, re-verified by hand

`/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/corpus-sample-sqlite.md`, six sentences at 27, 13, 7, 12, 20, 33 words: sentences 6, mean 18.67 → 18.7, max 33, short-share 1/6 → 17 percent, hinged 0 percent (`, or SQL Server` and `, and control` both carry an earlier comma and fall out under `isHinged`'s last clause; no `[;:]`, no spaced dash, no comma-plus-subordinator). All five corpus cells in the receipt are correct.

Document columns I could check: max 38 words is right — two sentences tie it, "On the instrument this document's receipt uses…builds 58 percent" (38) and "They are a comma followed by a coordinator…sits in the sentence" (38), and nothing above it. My hand segmentation finds 37 non-list paragraphs above the receipt, matching the receipt's "across 37 paragraphs", and no paragraph over 8 sentences (max 7) and no un-exempt paragraph under 3 sentences.

## Revision-5 closure check: 15 of 16 closed, 1 carried

| # | rev5 finding | Status | New text |
|---|---|---|---|
| 1 | Short-paragraph row misnames its two | closed | Row now reads `Paragraphs under 3 sentences, list lead-ins exempt \| 0 \| … \| pass`. Both violations are fixed in the text: the standing-rules paragraph now ends "…how the draft was written, in one autonomous run:" (colon → `leadIn` exempt), and the corpus bullet's continuation lines are indented two spaces, so `isCont` rejoins them. Consistent with my segmentation; unverified by execution. |
| 2 | Decision 11 names `render-safety.md` | closed | "\| 11 \| Approve the `add-a-custom-admin-screen.md` demonstration before any docs pass is planned \| small \|" |
| 3 | Instrument disclosure's tense and ten points | closed | "Revision 4 added it after the revision 3 grade found the count inflated by them, and it moved this document's own prose figure from 46 percent to 36." |
| 4 | Five forms versus four patterns | closed | "The measurement now counts every hinge form the script defines, so a rewrite cannot pass by moving the hinge." |
| 5 | Decision 2 contradicts its table | closed | "Hold the paragraph numbers and the 40-word ceiling as gated rules, and the average sentence length as a reported measurement that never gates" |
| 6 | Decision 9 unsized | closed | "small in tokens; about forty attended sittings, one per page, the largest attended cost in this table" |
| 7 | "Corpus" and "band" used before defined | closed | "The corpus, defined fully below, is the set of human-written excerpts the docs are measured against, and a band is the range a track's corpus entries set for a measurement." — placed before both first uses; the third name ("The pages people write") is gone, replaced by "The corpus entries set the bar high." |
| 8 | Advisory threshold looser than its source | closed | "until a track has twenty documents and three hundred sentences behind them, which is the cost review's threshold…" |
| 9 | Two consecutive fronted triads | closed | "The figure rules cover when a diagram or screenshot earns its place. They also say how it is made and how it is graded." |
| 10 | Heading triad folded into 33 words | closed | "A heading either tells the reader to do something or explains. The first kind starts with a bare verb and the second is a noun phrase. Siblings at one level share one form." |
| 11 | Mermaid count does not reconcile | closed on the facts, by a different route than proposed | "It kept twelve figures, and eleven of them ship today as Mermaid fences in the published tracks." I counted the repo: eight ```mermaid fences in `docs/extend/` and three in `docs/admin/`, eleven, and the ruling's twelfth keep is the editors track's save-publish loop, which has not shipped. The sentence is true. The document does not say where the twelfth went (residual 4). |
| 12 | 15-point tolerance appears first in the receipt | closed | Step 4: "A hinged-pair share more than fifteen points above the entry's is called out in the report. Nothing gates on any of it." |
| 13 | Three cappers | closed | "The review chain gives a page the same steps a code change gets." / "The corpus entries set the bar high." / "…and it gives the reader something to answer." |
| 14 | Two sizes disagree with the cost review | closed, with a new cross-reference defect | "\| 10 \| Approve the Claude setup changes as listed \| small; the cost review sizes the scanner change at 285 lines and small \|" and item 4 split into 4 and 4a. The split broke two body pointers (residual 2). |
| 15 | Two rules against three gate failures | closed on the sentence, open on the bridge | "Two rules stand above the four parts. The first answers the facts nobody checked, and the second answers how the draft was written, in one autonomous run:" The third place still gets no answer named (residual 8). |
| 16 | Minor bundle | two of three closed, one regressed | "a comma followed by a coordinator, subordinator, or relative word" ✓. "…[the structure research](proposal-research-structure.md) describes and links each" ✓. Source-line wrapping regressed (residual 9). |
| — | rev5's table note: "'varied' is still an unstated criterion" | **not closed** | Receipt still grades against "a spread of at least 3" (residual 3). |

All sibling links resolve: every `proposal-*`, `front-door-*`, and `corpus-sample-sqlite.md` target exists in the directory, and `../../docs-register.md`, `../2026-08-15-docs-visual-layer-rulings.md`, `../../../../.vale/styles/Cairn/TwoHeadedHeading.yml`, and `../../../../scripts/checks/measure-prose.mjs` all resolve at their stated depths.

## Residuals for a first-time owner read, ranked

**1. FAULT. The hinged-pair row's status quotes a number neither of its own columns carries.**
> `| Hinged pairs | 35 percent | 35 percent | 0 percent | … | fail; 36 against 0. …|`

The receipt's preamble says "Every cell below is written by the script's output, never by hand." The 36 is revision 4's prose figure, carried into a row whose columns now read 35. This is the same class of defect as rev5's finding 1, on the row the owner is most likely to check, in the artifact the standard rests on.
Fix: "fail; 35 against 0" — or re-run and correct all three cells together, since the all-sentences and prose-only figures being identical at 35 is the one pairing worth re-deriving.

**2. FAULT. Two body sentences point at decision 4 for work the table moved to 4a.**
> "Each page type would get a fixed section order, held in a template under `docs/internal/templates/`. Decision 4 creates that directory."
> "Decision 4 defers the other five orders until their templates are drafted, and approves the three now."

Item 4 is now "Adopt the three structure levels and the eight page types" (small); item 4a is "Write three templates now and five later, and the two new scripts" (medium). An owner approving 4 and declining 4a approves a directory nothing creates.
Fix: "Decision 4a creates that directory." and "Decision 4 approves the three orders now; decision 4a defers the other five until their templates are drafted."

**3. FAULT. The receipt grades a paragraph-variation row against a rule the document never states.**
> `| Paragraph lengths, shortest to longest, in sentences | 1 to 7, across 37 paragraphs | | | a spread of at least 3 | pass |`

The prose rules say only "Paragraph length must vary across a page." "A spread of at least 3" appears nowhere but this cell. This is exactly the defect rev5's finding 12 closed for the hinged-pair tolerance, left open on the neighbouring row.
Fix: put the number in the prose rules ("Paragraph length must vary across a page, by at least three sentences between the shortest and the longest"), or change the target cell to "reported".

**4. FAULT. Three front-door figures are named and none is introduced, and one name collides with the ruling the document cites.**
> "Hand-authored SVG is the exception, taken only when the lesson is arrangement rather than edges, which is the case for the two ownership figures."
> "On the front door, the concept figure does not earn its place under these tests and comes off. The ownership map moves to the architecture page."

The document never says what the concept figure is, what the second ownership figure is, or that "the ownership map" is one of the two. Worse, the 2026-08-15 ruling this section cites keeps a different figure called "the ownership map (five assets plus the tool as connector)" in the admin track, shipping as Mermaid. Decision 6 is on the approve list and cannot be decided from the document.
Fix: name them once at first mention — "the front door carries two hand-authored figures, the concept figure and the site's ownership map, and the arrangement lesson is why both are SVG rather than Mermaid" — and disambiguate the admin track's ownership map where the ruling is cited.

**5. Taste. The two-lane paragraph opens and closes on the same claim.**
> "Figures are produced in two lanes, and one rule routes between them." … "Mermaid and hand-authored SVG are the only two lanes."

Restatement of the topic sentence six sentences later.
Fix: cut the last sentence; the paragraph already named both lanes.

**6. Fault-lite, decidability. "All three rules" has five candidates.**
> "A new `check:headings` script would hold all three rules."

The paragraph states five rules: one idea per section, group a list past nine items, verb heading, noun-phrase heading, siblings share a form. Only the last three are heading rules, and a script named `check:headings` cannot hold the first.
Fix: "A new `check:headings` script would hold the three heading rules."

**7. Fault-lite. The prose-rules table's gating mechanism disagrees with the body it summarizes.**
> `| Sentence ceiling, admin and editors tracks | 25 words | … | gated, through a Cairn rule that overrides the vendored Microsoft rule's level |`

The body says "The vendored file is not edited, since the packages are pinned; a Cairn rule sets the level and the number for the two tracks," and the safeguards paragraph says a Vale section override "silently disables itself on the CI version." The admin track grades under Google (`.vale.ini` routes only `docs/editors/**` to Microsoft), so there is no Microsoft rule to override there.
Fix: "gated, through a Cairn rule that sets its own level; the vendored packages stay unedited."

**8. Fault-lite. The third gate failure is stated and never answered.**
> "Nothing checked the facts against you. Nobody but the author read the page before you did."

Rule 1 answers the second. Rule 2 answers the drafting method. The third is answered by the review chain, and the document never says so, so the reader counting two rules against three failures still finds a gap.
Fix: append to that paragraph: "The review chain below answers the third."

**9. Taste, mechanics. In-place edits left the source wrapping ragged.**
> Line 180: "first kind starts with a bare verb and the second is a noun phrase. Siblings at one level share one form. A new `check:headings` script would hold all three rules. The two-headed-heading Vale"

That line runs near 185 characters where the file otherwise wraps near 95; lines 132, 157, 205, 217, 374, and 411 are similarly long. It costs nothing to the reader on a rendered page and everything to a revision diff.
Fix: rewrap the seven edited paragraphs to the file's 95-column norm.

**10. Taste. The receipt does not carry the shape the document's own step 8 requires.**
> "A file beside the page carries the page's content hash, the measurement table, the corpus entry, the reviewer's verdict, and the reader's result."

The receipt carries the table and the corpus entry, and neither the hash nor the reader's result; Limits already says this revision was not reader-tested. Related, the preamble's "the script names any short paragraph it counts" is true only under `--json`, and the row it supports now reports zero, so nothing is named.
Fix: one line under the receipt — "This proposal is not a published page, so the hash and reader-result fields of a step-8 receipt do not apply."

## Verdict

Not ready, because of one named fault: the hinged-pair row's status says "36 against 0" while both of its own columns say 35 percent, inside a receipt that claims every cell is script output — with three further faults behind it (the decision 4 / 4a pointers, the unsourced "spread of at least 3" target, and the three unintroduced front-door figures that make decision 6 undecidable). Fixing the first is a one-token correction, and the remaining nine residuals are listed above.

Files: `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/corpus-sample-sqlite.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/proposal-review-rev5.md`, `/var/home/glw907/Projects/cairn-cms/scripts/checks/measure-prose.mjs`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-08-15-docs-visual-layer-rulings.md`, `/var/home/glw907/Projects/cairn-cms/docs/internal/record/2026-09-08-polish-inputs/proposal-research-figures.md`, `/var/home/glw907/Projects/cairn-cms/.vale.ini`.
