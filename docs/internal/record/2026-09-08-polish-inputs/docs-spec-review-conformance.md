# Spec review: self-conformance and the generic checklist

Adversarial review of `docs/superpowers/specs/2026-09-08-docs-standard-design.md`, revision 1,
against the standard the spec itself specifies. One lens: does the page obey its own rules, and
does it survive the generic quality checklist the proposal defines. Read-only. 2026-09-08.

Inputs read in full: the spec; the two named exemplars
(`corpus-sample-go-design.md`, `corpus-sample-kep-node-swap.md`); the proposal's "The structure
rules", "The prose rules", and quality checklist.

**Verdict: not ready for the owner's read.** Findings 1, 2, 3, and 6 are substantive. Two of them
(1 and 2) change what the owner is approving, and one (3) is a plain internal contradiction in a
sentence a plan will be written from.

## Independent re-measurement

Reproduced with the repository's own instrument:

```
node scripts/checks/measure-prose.mjs docs/superpowers/specs/2026-09-08-docs-standard-design.md --until '## Receipt' --json
```

| Measure | Receipt claims | Re-measured | Match |
|---|---|---|---|
| Sentences, all / prose | 429 / 217 | 429 / 217 | yes |
| Average length, all / prose | 13.9 / 14.6 | 13.9 / 14.6 | yes |
| Longest, all / prose | 35 / 34 | 35 / 34 | yes |
| Hinged pairs, all / prose | 28% / 35% | 28% / 35% | yes |
| Under 8 words, all / prose | 22% / 19% | 22% / 19% | yes |
| Paragraphs | 68 / 68 | 68 / 68 | yes |
| Long paragraphs | 0 | 0 | yes |
| Short paragraphs | 0 | 0 | yes |
| Go exemplar (`--until "## Source"`) | 17 sent, 22.1, 39, 41%, 12%, 8 para | identical | yes |
| KEP exemplar (`--until "## Source"`) | 22 sent, 16.4, 44, 18%, 27%, 6 para | identical (all-sentences mode) | yes |
| Vale, Google forced | 0 errors, 35 warnings, 166 suggestions | 0 / 35 / 166 above `## Receipt`; 0 / 36 / 172 whole file | yes, with a caveat (finding 16) |
| Tell scanner | 0 findings, 5 three-item lists | `tellgrader`: 0 findings, 5 tricolons | yes |

Every numeric cell in the receipt reproduces. The defects below are not arithmetic slips in the
receipt; they are in what the numbers are compared against and in what the prose around them says.

## Ranked findings

### 1. Unit 1 and the generalized `check:provenance` are new scope, not restated decisions

Lines 6-8, 88-100, 398-399, 486-502, 528-557.

The header states the spec "restates the approved decisions as requirements." The proposal's
eleven decisions contain no fact harvest, no fact ledger, and no per-page provenance. The proposal
scopes `check:provenance` to the front door alone (proposal lines 454-456, decision 8a). The spec
adds unit 1, the largest new mechanism in the document, and generalizes the gate: "On a rebuilt
page the same check generalizes: every claim must carry an id that resolves to a fact ledger
entry" (line 398-399). Unit 1 appears in no row of the decisions table, so the table's Unit column
covers units 2, 3, 4, and 5 and silently omits unit 1.

This is the spec breaking its own rule 1 (line 42-43): a claim about cairn's stance must come from
a brief the owner wrote or approved. The owner approved a front-door provenance gate; the spec
hands the implementer a whole-corpus one.

Fix: add a decision row 12, "Adopt the fact harvest and the fact ledger, and generalize
`check:provenance` to every rebuilt page", sized medium, unit 1, and mark it **not yet approved**
in the Open items section. Or cut unit 1 back to the front door and file the harvest as a separate
proposal.

### 2. The docs rebuild is declared a non-goal, then specified as unit 5

Lines 85-86 against 622-661.

Non-goal four reads: "The docs pass itself, sized by the proposal's cost review at six to nine
million tokens. The implementation order below places it last and sizes it as its own initiative."
The proposal is unambiguous that the pass is out of scope ("it is not a docs pass ... so one
demonstration page stands in for it"). The spec then gives unit 5 a full specification with eight
acceptance criteria, a rebuild-not-edit rule, a reference-track exception, and two carried
decisions. A unit with acceptance criteria is in scope by any reading a plan author will take.

Fix: either drop unit 5 to a one-paragraph forward pointer ("unit 5, the docs rebuild, is scoped
by its own proposal after unit 4's evidence"), or delete the non-goal and say plainly that the
rebuild is in scope and separately ceilinged. Leaving both is a contradiction the pass plan will
resolve by accident.

### 3. "Five scripts carry the standard, three of them new" contradicts its own table

Lines 472-480.

The table's State column reads `new` for all five rows. The proposal's decisions create four new
scripts (4a: `check:anatomy`, `check:headings`; 8a: `check:provenance`, `check:prose-read`), and
`check:cadence` is described in the same table as new. So "three" is wrong under every reading,
and unit 3's acceptance criteria (lines 592-598) require all five to be written or verified.

Fix: "Five scripts carry the standard, all of them new." If `check:cadence` is meant as a rename
of the existing `measure-prose.mjs` wrapper, say so in its State cell and write "four of them new".

### 4. The two named exemplars fail two of the rules the spec gates on, and the receipt prints it without comment

Lines 134, 136, 716-724.

- The spec gates a 40-word ceiling "no exception" (line 134). The KEP exemplar's longest sentence
  is 44 words.
- The spec gates a paragraph floor of three sentences (line 136, line 300). The Go exemplar has 6
  short paragraphs of 8; the KEP has 3 of 6. The receipt's own row prints `6` and `3` against a
  target column of `0` and a status of `pass`.

A page whose named genre exemplars break the rules it adopts has either the wrong rules or the
wrong exemplars, and the reader cannot tell which. This is the sharpest self-conformance defect in
the document, because the exemplars are the spec's evidence that the rules describe good writing.

Fix: add a line under the receipt: "Both exemplars sit outside two of the adopted numbers. The
40-word ceiling and the 3-sentence paragraph floor are cairn's, not the genre's, and unit 3 must
ship them with fixtures that record this." Or restate the paragraph floor as advisory for internal
documents and the ceiling as gated per track only.

### 5. "Hinged pairs at twice the rate of any human page" is falsified by this spec's own evidence

Lines 53-55 and 62-65 against 720.

The claim was written when SQLite's 0 percent was the only human measurement, where "twice" is
undefined. The spec now vendors two more human pages and measures them: the Go design document at
41 percent and the KEP at 18. The extend track's 54 percent is 1.3 times the Go exemplar, not
twice. The front-door draft's own figure is never given anywhere in the spec, so the multiplier
cannot be checked at all.

Fix: replace with the measured statement. "The rejected draft's hinged-pair share was N percent,
against 41 percent for the Go design document and 18 for KEP-2400." If N was never recorded, say
"higher than any human page then measured" and drop the multiplier.

### 6. The two-round cap is stated, then doubled

Lines 412-416.

"The chain caps revision at two rounds" and then "The cap applies to step 3 and to step 7
separately." Two caps applied separately permit four rounds on one draft. The proposal's cap is a
single one: round one is steps 3 through 7, a fix at step 7 buys one redraft, and a second fix
goes to the owner (proposal lines 469-473). The spec changes an approved decision and records no
deviation.

Fix: "The chain caps revision at two rounds of steps 3 through 7. An outline returned at step 3
does not consume a round, since the page has not been graded as prose." That keeps the intent and
the arithmetic.

### 7. The receipt's hinged-pair comparison mixes measurement modes

Lines 712-713, 720.

The spec compares its **prose-only** 35 percent against the exemplars' **all-sentences** figures
(41 and 18). Measured the same way, the KEP exemplar's prose-only share is 20 percent, which makes
the gap 15 points, exactly at the threshold, not the 17 the status cell reports. The receipt's
preamble says the exemplars were measured "the same way", which is true of the `--until` flag and
untrue of the column.

Fix: report both exemplar columns in prose-only mode (Go 41, KEP 20) and restate the status as
"15 points over the KEP, at the threshold, reported by step 5 and gated by nothing."

Second gap in the same row: the spec's rule (line 394) says "the corpus entry's" numbers, singular.
This page names two exemplars and gets a pass against one and an over against the other. The
standard does not say which governs. Add a sentence to the corpus section: "A page that names two
entries is compared against the closer of the two, and the report names both."

### 8. "All eight heading rules" against seven enumerated

Line 594, against 309-312 and 478.

The section text lists: sentence case, one level-one heading, no skipped levels, no leading -ing
form, verb-first for task sections and noun phrases for the rest, siblings in one form, question
headings only under `docs/editors/`. Seven items. The script table (line 478) lists the same rules
but drops "noun phrases for the rest", also seven. Only by splitting the verb-first item does
"eight" hold, and neither enumeration splits it.

Fix: number the rules explicitly in the section and make the acceptance criterion read "holds the
seven heading rules numbered above", or split the fifth rule into two in both places.

### 9. Undeclared section-order deviation: "Design details" is not on the Go spine

Lines 18-28, 102.

The brief names the Go spine, "abstract, background, proposal, rationale, compatibility,
implementation", and records four deviations. "Design details" is a KEP heading and is not one of
them; the brief's KEP bullet names only goals and non-goals, risks, and open items. Two further
placements are unrecorded: Risks sits after Implementation, where the KEP puts it under Proposal,
and Decisions adopted sits before Compatibility with no stated reason for that position.

Fix: extend the second brief bullet to "Design details, goals and non-goals, risks, and open items
come from the KEP spine", and add a sentence stating where the two repo-convention sections sit and
why.

### 10. A gated "must" with no instrument and no receipt row

Lines 123-124, 136, 715-727.

"Paragraph length must vary across a page, by at least three sentences between the shortest and
the longest" is normative, and the paragraph row of the numbers table is marked `gated`. The
receipt carries no spread row, although the proposal's receipt carried one ("1 to 8, across 44
paragraphs"). `measure-prose.mjs` emits no spread field, so nothing in the repository can compute
it today.

Fix: add the spread row to the receipt and add an acceptance criterion to unit 3, "`check:cadence`
reports the paragraph-length spread." Otherwise demote the variation rule to advisory and say so.

### 11. Terms used before definition, which the spec's own checklist asks about

Line 432 asks "Is every term the reader is not expected to know defined where it first appears?"

- **band**: used at line 83 ("The bands stay advisory") and again at 461 and 463. Never defined
  anywhere in the spec. The proposal defined it ("a band is the range a track's corpus entries set
  for a measurement").
- **receipt**: used at line 38 in the Abstract and at 62. The nearest thing to a definition is step
  9 at lines 404-406, which lists its contents without naming it.
- **fact ledger**: used at line 399, defined at line 530, 131 lines later.
- **corpus**: used at line 96 ("a review that cites no corpus entry does not count"), defined at
  line 359.

Fix: define **band** at line 83 in one clause; move a one-sentence definition of **receipt** into
the Abstract beside its first use ("a receipt, the file recording a page's measurements, reviewer,
and reader result"); at line 96 and 399 write "the corpus (defined below)" and "the fact ledger
unit 1 produces".

### 12. Lists over nine items, ungrouped, against the spec's own rule

Line 300 requires "A list must be grouped once it passes nine items."

- The Proposal section order, lines 280-291, is a numbered list of eleven items.
- The Reference entry order, lines 238-249, is ten.

Neither is grouped and neither deviation is recorded in the brief.

Fix: group the Proposal order under "the argument" (1-5) and "the decision" (6-11), and the
Reference entry under "identity" (1-3), "contract" (4-8), and "use" (9-10). Or add a sentence to
line 300 exempting a template's section order, since a section order is a shape, not a list a
reader scans.

### 13. "The Claude setup" section carries two ideas

Lines 448-480, against the rule at line 299 ("A section must cover one idea").

The section opens on the seven Claude setup pieces, then, with no transition, presents the
five-script table. Those five scripts are repository gates wired into `package.json` and CI (line
603). They are not part of the Claude setup, and the sentence that introduces them ("Five scripts
carry the standard") is the summary of the whole document's tooling.

Fix: promote the script table to its own `### The gates` subsection under Design details, placed
after the review chain, where the checklist's "what answers it" column already refers to it.

### 14. "Three further requirements follow", then four

Lines 351-356. The paragraph carries the Mermaid default, `check:figures` growing to seven
assertions, `check:visuals` closing the alt-attribute hole, and the front-door figure removal. The
fourth is decision 6 and has its own row in the decisions table.

Fix: "Four further requirements follow."

### 15. The page names its own type, and its brief is neither four lines nor beside the page

Lines 1, 10-28, against 293-295 and 315-316.

Line 293 states "No page may name its own type or track." The title reads "A documentation
standard for cairn: design" and the brief opens "Type: design spec, internal." Line 315 requires a
brief "of four lines, written before the outline and **kept beside the page**"; this brief is
roughly twenty lines and lives inside the page.

The rule is defensible and the practice is defensible; both cannot be silent. This is exactly the
case the brief's fourth question exists for.

Fix: add a fifth deviation bullet. "This spec names its own type and carries its brief inline,
because an internal spec has no separate brief file and no reader who could be misled. The rule at
line 293 binds published pages." Then reword line 315 to "a brief of four answers" so the
four-line count is not a rule the first page written under it breaks.

### 16. The Vale receipt cell mischaracterizes its own findings

Lines 712-713, 725.

Reproduced with Vale 3.20.0, Google forced, over a copy at a Google-globbed path:

- Above `## Receipt`: 0 errors, 35 warnings, 166 suggestions. Exactly the receipt's numbers, so the
  count silently stops at the Receipt while the note says only "over a copy of this file". Whole
  file is 36 warnings and 172 suggestions.
- The warnings are `Google.WordListCase` 22, `Google.OxfordComma` 7, `Google.Will` 6,
  `Google.Headings` 1. The status cell names "contractions, Oxford commas, and word-list items."
  Contractions are suggestion-level, not warnings. `Google.Will` (six) and the one `Google.Headings`
  finding, on "The Claude setup" at line 448, go unnamed.

Fix: "Vale ran over a copy of everything above this section. The 35 warnings are word-list case
(22), Oxford commas (7), `Google.Will` (6), and one heading-case false positive on the word
Claude." The `Google.Will` findings at lines 206, 215, 337, 387, 681, and 686 are worth a pass on
their own, since they sit in template section orders a reader will copy.

### 17. Repetition the brief's own reasoning forbids

The brief drops Rationale because "repeating it here would produce a second copy that drifts"
(lines 25-26). The spec then repeats itself verbatim:

- "prose work on a page with the wrong shape is wasted" at line 330 and again at 383.
- "the drafter never opens the page it replaces" at 626 and 668, with a third variant at 96.

Fix: keep the sentence at its normative home (line 330, the outline review) and make the later
occurrences cite it: "for the reason the outline review gives".

### 18. Cadence and heading monotony

Measured across the 217 prose sentences:

- 91 sentences open with "The" and 44 with "A". Together that is 62 percent of the prose opening on
  a bare article. Sentence *length* varies well (19 percent under 8 words, max 34), so the monotone
  is at the head of the sentence, where no gate looks.
- 12 of 68 paragraphs close on a trailing "because / which / since / so" clause carrying the punch:
  lines 194, 258, 311, 330, 378, 410, 416, 456, 527, 634, 644, 672. Against roughly forty true prose
  paragraphs, that is close to a third landing on the same rhythm.
- Every level-3 heading under Design details opens with "The": The prose rules, The structure rules,
  The figure rules, The corpus, The review chain, The reader test, The Claude setup. The four
  level-4 headings do the same.
- "rather than" carries seven sentences (65, 115, 193, 258, 368, 456, 592) and `, which` eighteen.

None of this is a rule violation, and the tell scanner returns zero. It is what a reviewer reads as
sameness. Fix by varying twenty or so sentence heads (lead with the actor, the condition, or the
object) and by breaking six of the twelve closing clauses into their own short sentence, which also
lifts the average toward the 15-word floor the receipt currently misses by 0.4.

### 19. Smaller items

- **Decision 7 is both approved and unapproved.** Line 483 says "Every decision below is approved",
  decision 7 is "Approve the corpus entries", and Open items (694-696) says "none is approved".
  Reword decision 7 as "Assemble the candidate corpus entries for approval" and leave the approval
  itself in Open items.
- **Open items omits decision 11.** Unit 4's last acceptance criterion is the owner's read and
  approval to proceed. That is a fourth owner-owed item and belongs in the list at line 692.
- **The "first two places" mapping does not hold** (lines 57-60). Hole 1 is that the gates read only
  words. Neither of the two rules answers it; the structure rules and the outline review do.
  Rewrite: "Rule 1 answers the second place and rule 2 the third. The structure rules and the
  outline review answer the first."
- **Citation-shaped claims with no anchor.** Horn's chunking bound (194), GitLab's rule (410),
  "controlled studies since the 1960s" (79-80), DigitalOcean's editors (443), Anthropic's guidance
  (451-452), OPM (133), Cutts (134), "the proposal's cost review" (150, 463, 684). The header
  delegates evidence to the proposal, which is a fair convention, but the spec's own checklist asks
  "Is every claim true and traceable?" and unit 1 will require every claim to carry a resolvable id.
  The leanest fix is one line under the header: "A claim here without a link resolves to the section
  of the proposal with the same heading."
- **Unit headings carry a colon** ("Unit 1: the fact harvest"), the shape
  `Cairn.TwoHeadedHeading` targets. The rule does not fire on it and the receipt is clean, so this
  is a note, not a finding: if `check:headings` grows a colon rule, six headings and the title need
  a recorded deviation.

## The generic checklist

| Question | Answer | Evidence |
|---|---|---|
| Who is the intended reader, and does the page address that reader alone? | Yes, with one wobble | The brief names two readers, the implementer writing the pass plans and the owner checking against the proposal (lines 10-11). Every section serves the implementer. The Decisions adopted table and the Open items section serve the owner. Two readers is what the proposal's own type entry allows for an internal proposal, and the wobble is small: the Background section argues to the owner in a document whose other 600 lines instruct the implementer. |
| What is the page for, and does its first sentence say so? | Partly | The first sentence of the body (line 32) states the problem, not the page's job. The job is stated in the header block at lines 6-8, above the Abstract. The Go exemplar's Abstract opens on the proposal itself. Fix: open the Abstract with "This spec states cairn's documentation standard as requirements a pass plan can take", then the problem. |
| Is the page organized logically, and does its section order follow its named exemplar, with each deviation recorded and justified? | No | Order is Abstract, Background, Goals and non-goals, Proposal, Design details, Decisions adopted, Compatibility, Implementation, Risks, Open items, Receipt. The Go spine it names is Abstract, Background, Proposal, Rationale, Compatibility, Implementation. Four deviations are recorded and each is justified. "Design details" is a fifth and is unrecorded (finding 9), as are the placements of Risks and of Decisions adopted. |
| Does the page follow the proper standard? | Mostly | Average 14.6, 0.4 below the 15-word floor, disclosed in the receipt but not recorded in the brief as a deviation. Longest sentence 34, under 40. Zero paragraphs outside the 3-to-8 and 150-word bounds. Requirements use "must" throughout, 85 occurrences. No em dashes. No "not X but Y" frame. No connector openers. Five three-item lists, each a real list of three. Terms: four used before definition and one never defined (finding 11). Paragraph variation is a "must" with no measurement (finding 10). Lists over nine items, ungrouped, twice (finding 12). One section carries two ideas (finding 13). |
| Are deviations justified? | Partly | Four recorded and justified in the brief. Six real deviations go unrecorded: the "Design details" section, the page naming its own type, the brief's length and location, the average-length miss, the ungrouped orders, and the round-cap change. |
| Does the page look like its genre on sight? | It looks like a requirements spec, not a design document | Compared with the Go exemplar, which argues a design choice against its alternative for its whole length, and with the KEP, which specifies against a template. This page has the Go spine's headings and the KEP's mechanics, and it deliberately removes Rationale, the one section that carries the Go document's genre. What remains is normative statement plus units plus acceptance criteria. That is a good repository spec and a weak design document. Either retitle it "A documentation standard for cairn: requirements", or restore a short Rationale carrying only the reasoning that this document adds beyond the proposal, most of which is currently orphaned in unit 5's paragraph at lines 631-634. |
| Cross-section contradictions | Four found | Findings 2, 3, 6, and 19's decision-7 item. |
| Arithmetic | Two found | "three of them new" against five (finding 3); "all eight heading rules" against seven (finding 8). "Three further requirements" against four (finding 14). The receipt's own arithmetic is correct: 35 minus 18 is 17, and 15 minus 14.6 is 0.4. |

## What would make it ready

In order: resolve findings 1 and 2 (they change what is being approved), fix 3, 6, and 8 (one line
each), add the missing deviation records for 9 and 15, and restate the receipt's exemplar
comparison per 4 and 7 so the owner sees that the named exemplars sit outside two adopted numbers.
Findings 11 through 19 are a single editing pass and need not gate the owner's read if the first
group lands.
