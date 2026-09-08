# A documentation standard for cairn: design

**Status:** revision 1, 2026-09-08. Derived from the approved proposal at
[`docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`](../../internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md).
The proposal carries the evidence and the reasoning behind every rule here, and its reviews and
research sit beside it in the same directory. This spec restates the approved decisions as
requirements, orders them into units a pass plan can take, and states what each unit must satisfy
before it is done. Plans follow through `writing-plans`, one per unit.

**Page brief.** Type: design spec, internal. Reader: the implementer who writes the pass plans from
this document, and the owner checking it against the proposal. This page needs the four parts of
the standard stated as requirements, with the eleven page types and their section orders. It also
needs the adopted decisions with their sizes, an implementation order in pass-sized units, the
acceptance criteria for each unit, the risks, and the items the owner still owes. Exemplars: the Go design document for monotonic time
([`corpus-sample-go-design.md`](../../internal/record/2026-09-08-polish-inputs/corpus-sample-go-design.md))
and KEP-2400
([`corpus-sample-kep-node-swap.md`](../../internal/record/2026-09-08-polish-inputs/corpus-sample-kep-node-swap.md)).
The section order below is the Go document's spine, which runs abstract, background, proposal,
rationale, compatibility, implementation. Deviations, each with its reason:

- A design spec is not one of the eleven page types the standard names, so no template governs it
  and the exemplar rule applies instead.
- Goals and non-goals, risks, and open items come from the KEP spine, because the Go document has
  no section for any of the three and the owner's brief requires all three.
- Rationale is absent. The proposal holds the reasoning for every rule, and repeating it here would
  produce a second copy that drifts.
- The decisions table and the acceptance criteria are this repository's own spec convention, held
  by every spec under `docs/superpowers/specs/`.

## Abstract

cairn's published documentation has no written standard for how a page is built. The code has its
conventions and its gates, and the prose has a style floor that reads one line at a time. The front
door passed every gate and the owner rejected it as a useless disaster. This spec adopts a
documentation standard in four parts. The prose rules govern sentences and paragraphs. The
structure rules govern which pages exist, what sections each page type carries, and how a section
is built. The figure rules govern when a diagram or a screenshot earns its place. The review chain
gives a page the sequence of checks a code change gets, and ends in a receipt a gate can verify.

Two rules stand above the four parts:

1. Any claim about the owner or about cairn's stance must come from a brief the owner wrote or
   approved. A script must check that every such claim resolves to a line in that brief.
2. A page for an outside reader must be drafted one section per read. No such page may be drafted
   end to end in an autonomous run.

## Background

The failure that produced this standard is recorded in
[`front-door-net-failure.md`](../../internal/record/2026-09-08-polish-inputs/front-door-net-failure.md).
The rejected front-door draft opened with a story about editors emailing the owner changes, and
that never happened. It said that starting a cairn site needs a developer, which the admin track's
own promise contradicts. Its sentences were built as hinged pairs at twice the rate of any human
page measured during the proposal. A hinged pair is two clauses joined by a comma and a
coordinator, by a colon, by a semicolon, by a spaced dash, or by a chain of relative clauses.

The gates missed the faults in three places. Vale and the tell scanner both read words and
punctuation, and the draft was written to pass them. Nothing checked the draft's facts against the
owner. Nobody but the author read the page before the owner did. The two rules above answer the
first two places. The review chain in this spec answers the third.

The rhythm problem reaches past that one page. On the instrument the proposal's receipt uses, the
extend track builds 54 percent of its sentences as hinged pairs and the reference track builds 58
percent. The SQLite scope excerpt vendored as the first corpus sample builds none. Sample sizes are
small enough that the intervals overlap, so the proposal treats the gap as a direction rather than
a finding. The sentence-length gap is firmer. The reference track averages 22 words with one
sentence at 151 words, where PostgreSQL, MDN, and the Rust reference average 12 to 18 words with
almost nothing over 40.

## Goals and non-goals

The goal is prose an expert reader accepts as well written and true, produced mostly by Claude,
with the front-door failure unable to recur. The standard reaches that goal by making a page's
shape, its facts, and its reviewer all checkable before the page ships. Every rule below closes one
of the three holes the rejected front-door draft fell through.

Four things are not goals:

- A readability gate. Controlled studies since the 1960s found that rewriting to a sentence-length
  number does not improve comprehension. Every number in this spec locates a passage for a person
  to judge.
- A new taxonomy. The four tracks stay as they are, and no published page cites Diátaxis.
- A rewrite of the corpus tooling into a scoring system. The bands stay advisory until a track has
  twenty documents and three hundred sentences behind it.
- The docs pass itself, sized by the proposal's cost review at six to nine million tokens. The
  implementation order below places it last and sizes it as its own initiative.

## Proposal

The standard is adopted in four parts, held by a review chain, and switched on by the decisions
the "Decisions adopted" section lists. Each part below states requirements a page must meet. The
requirements are normative. A page that does not meet one must record the deviation in its page
brief with a reason, in the form the register's "when a Vale finding is wrong" rule sets.

The work divides into five units. The fact harvest comes first, because a rebuild's drafter must
never open the page it replaces, and the ledger is what stands in its place. The corpus comes
second, because a page type with no approved exemplar has no draft and a review that cites no
corpus entry does not count. The templates and the scripts come third, because they hold the
structure rules the docs work is graded against. The demonstration page comes fourth, as the
evidence the owner reads before any docs pass is planned. The docs rebuild comes last.

## Design details

### The prose rules

The Federal Plain Language Guidelines, March 2011 revision, are the prose standard. The repository
must vendor the PDF, because plainlanguage.gov now redirects to digital.gov and the live guides
were re-cut. The guidelines carry about forty numbered rules in five parts, and the standard adopts
these:

- Part I, audience. A page must be written for one reader at a time. Separate audiences must be
  addressed separately, which cairn's four tracks already do.
- Part II, organization. A page must put its most important information first, and the general case
  before the exception.
- Part III, words. A page must use verbs rather than nouns made from verbs. It must use the active
  voice unless the actor does not matter. It must use "must" for a requirement, and the same term
  for the same thing every time. A term the reader is not expected to know must be defined where it
  is used, and the track vocabulary lists in the register decide which terms those are.
- Part III, sentences. A sentence must express one idea and keep its subject, verb, and object close
  together. On the front door and in the extend track, a qualification may ride inside the sentence
  that makes the claim.
- Part III, paragraphs. A paragraph must open with a topic sentence and cover one topic. It must run
  three to eight sentences and no more than 150 words, with 250 words as the hard limit. Paragraph
  length must vary across a page, by at least three sentences between the shortest and the longest.
- Part V, test. A page must be tested with a reader before it ships, in the form the reader test
  below sets.

The guidelines give no sentence-length number. The numbers below are cairn's own, and each names its
source:

| Measure | Target | Source | Status |
|---|---|---|---|
| Average sentence length | 15 to 20 words | OPM plain-language guidance | measured and reported, never gated |
| Longest sentence | under 40 words, no exception | Cutts, Oxford Guide to Plain English | gated per track once that track's existing violations are cleared |
| Sentence ceiling, admin and editors tracks | 25 words | ASD-STE100 | gated, through a Cairn rule that sets its own level |
| Paragraph length | 3 to 8 sentences and 150 words, hard limit 250 | the guidelines, Part III | gated |

ASD-STE100 sets 20 words for a sentence that gives an instruction and 25 for one that describes. The
admin and editors tracks take the 25, because most of their sentences describe a screen or a state.
One number per track is what a linter can hold. The Microsoft sentence-length rule has run on the
editors track at suggestion level all along, so its findings were advisory. The vendored Google and
Microsoft packages must stay unedited and pinned in CI, so a Cairn rule sets the level and the
number for the two tracks.

Three safeguards keep the numbers from doing harm:

- Every rule file must ship with a fixture that fires. A rule written as a Vale section override can
  silently disable itself on the pinned CI version, and the proposal's cost review reproduced this
  on both versions.
- The sentence ceiling must travel with the two rules ASD-STE100 pairs it with. Complex text must go
  into a list, and no part of a sentence may be dropped to make it shorter.
- The average must never become a gate. Writing to it produces amputated sentences, which revision 2
  of the proposal demonstrated on itself.

### The structure rules

Structure is where the front door failed first. Its sections existed because a chain of derivations
produced them, and no gate looked at the order. The standard sets structure at three levels, and
each level gets its own gate. The docs set decides which pages exist. The page decides its own
sections and their order. The section decides how one block of text is built.

#### The docs set

Every published page must have one track and one page type. The four tracks stay as they are. A page
must look like what it is, so that a reader who knows the genre recognizes the page on sight. Each
page type must name a published exemplar of its genre, and the corpus must carry an excerpt of it. A
page whose type has no approved exemplar must not be written. The page brief must name the exemplar
the page was drafted against.

A page type is a named shape. The standard names eleven, ten published and one internal. Each is
listed with the reader's job it serves and its exemplars, because a page whose job nobody can state
in one line is two pages. This list is the registry a page brief cites.

| Page type | The reader's job | Exemplars |
|---|---|---|
| Task guide | The reader has a goal and wants the steps | Cloudflare's Workers get-started guide; a GitHub Docs how-to |
| Tutorial milestone | The reader is learning and needs the next unit in a sequence | a unit of Astro's blog tutorial |
| Concept page | The reader must understand something before acting | PostgreSQL's concurrency chapter; Astro's "Why Astro" principles |
| Architecture overview | The reader must see how the parts fit and who owns each | SQLite's architecture page; Kubernetes' cluster architecture page |
| Reference entry | The reader knows the name and wants the contract | PostgreSQL's CREATE INDEX; MDN's scrollIntoView |
| Reference table | The reader wants one row of many | Wrangler's configuration reference; a Stripe object page |
| Condition entry | The reader has a failure and wants the cause and the fix | Cloudflare's Workers error tables |
| Symptom row | The reader matches a symptom and wants the row that names it | Cloudflare's Workers error tables |
| Index page | The reader must find the right page and leave | a Kubernetes section index |
| Front door | An evaluator is deciding whether cairn fits | SQLite's scope page; Kubernetes' overview. The editors track's welcome page is a front door for its own reader, with a GOV.UK guidance page and a Mozilla support article as its exemplars |
| Proposal (internal) | The owner is deciding | the Rust RFC template; the Kubernetes enhancement proposal template |

Four rules hold at this level:

- A page must do one job, stated in its first sentence.
- A page must read on its own, without the page before it. Readers arrive from search, from the
  admin's help link, and from npm.
- A page must stay on one level. It must link down to a concept rather than explain it in place.
- An index must group its children once it lists more than nine siblings, which is Horn's chunking
  bound.

#### The page

Each page type gets a fixed section order, held in a template under `docs/internal/templates/`. A
new `check:anatomy` script must read each template and fail a page whose required headings are
missing or out of order, so a template and its gate cannot drift apart. The orders are:

**Task guide**, under 800 words:

1. Title.
2. A one-line contract stating what the reader will have at the end.
3. Before you begin, each precondition linked to the page that produces it.
4. Steps, numbered, one action each, at most nine.
5. Check it worked, the observable signal.
6. If it fails, each failure path pointing at the track's recovery page.

**Tutorial milestone**:

1. Title.
2. What you will build.
3. Where you are, the state the previous milestone produced.
4. Steps.
5. Before you go on, a checklist.
6. What's next.

**Concept page**, under 1,500 words:

1. Definition, with the first sentence defining the thing.
2. Why it exists.
3. How it works.
4. What it is not.
5. Limits.
6. Where to go next.

**Architecture overview**:

1. What the system is, in one paragraph.
2. The parts, in the order data moves through them.
3. One figure if the parts are an arrangement, and none if they are a sequence.
4. One section per part, stating its job and its boundary.
5. What sits outside the system, and who owns it.

**Reference entry**:

1. Export name.
2. Signature block.
3. A summary of one to three sentences.
4. Parameters.
5. Returns.
6. Defaults.
7. Failure modes.
8. Stability tier.
9. Example.
10. See also.

**Reference table**. The prose rules apply to the lead sentence and the notes only:

1. A lead sentence saying what the table lists and how it is ordered.
2. The table, one row per item, the same columns in every row.
3. Notes, if any, keyed to rows.

**Condition entry and symptom row**. Both keep the field lists they carry today, treated as an order
rather than as a set. The template records that order so `check:anatomy` can hold it. Neither type
gains a field in this spec, since the recovery pages already carry the fields their readers use.

**Index page**:

1. Title.
2. Who this track is for, and who it is not for, with the route out for the wrong reader.
3. The pages, in reading order.
4. Where to start.

**Front door**:

1. The owner's account of where cairn came from.
2. What cairn does.
3. Where it fits.
4. What it is not, as its own section.
5. Why this stack.
6. The trade-offs.
7. A short checklist the reader answers.
8. Where to go next.

**Proposal**:

1. Summary.
2. Motivation.
3. Goals and non-goals.
4. Proposal.
5. Design details.
6. Drawbacks.
7. Alternatives considered.
8. Prior art.
9. Unresolved questions.
10. Decisions, each with a cost.
11. A receipt, when the document grades itself.

No page may name its own type or track, which extends the standing rule that no page cites
Diátaxis. A page must state its type by following it. The template is the only place a type is
written down.

#### The section

A section must cover one idea and state it in its first sentence, and so must each paragraph in it.
A list must be grouped once it passes nine items. A paragraph must run three to eight sentences,
which is Google's rule kept. A heading must either tell the reader to do something or explain
something. The first kind starts with a bare verb, and the second is a noun phrase. Siblings at one
level must share one form. A question heading is allowed only in the editors track, where the
question is the reader's own. A section that carries an instruction must end where the reader can
act, or must name the page that tells them how.

A new `check:headings` script must hold the heading rules. Those are sentence case, one level-one
heading, no skipped levels, no leading -ing form, verb-first for task sections and noun phrases for
the rest, siblings in one form, and question headings only under `docs/editors/`. The
`Cairn.TwoHeadedHeading` Vale rule holds one shape of one fault and nothing more. Vale sees one line
at a time, and parallelism needs the whole page, which is why the script must exist.

#### The page brief and the outline review

Every page must start with a brief of four lines, written before the outline and kept beside the
page. The brief answers four questions:

- What does a page of this type include in general, and which exemplar shows it?
- Which track and reader does it serve?
- What must this page carry that its type does not say?
- Does it deviate from the standard, and how?

A brief that cannot name an exemplar must stop the draft until one is found. A deviation is allowed
only when the brief records it with its reason. A page with no brief has no outline to check
against.

The outline must be reviewed against the brief before any sentence is reviewed. A reviewer, and
`check:anatomy` behind the reviewer, reads the page type, the title, the headings, and the section
order first. A page whose shape is wrong goes back before its prose is graded, because prose work on
a page with the wrong shape is wasted.

### The figure rules

A figure is a diagram or a screenshot, and pages rarely need one. A figure may appear only where
prose would have to state a relation among three or more parts as a series, or where the fact is a
branch between paths. A set of items must be a table. A linear sequence must be a numbered list.
Code the reader will type must be a code block. Ten of the fourteen pages surveyed for the proposal
carry no explanatory figure, every "why" page carries none, and the Svelte docs carry none at all.
The register's 2026-08-15 visual-layer rulings stand unchanged, and this spec adds two tests to
them:

- The test for a figure that should not be there. Remove the figure. If the text still makes the
  point without a new sentence, the figure was decoration. Write the text alternative before
  anything else. An alternative that fits in one sentence means the prose should have been that
  sentence. An alternative that comes out as a table means the figure was a table.
- The test for a figure that is missing. Read each paragraph and ask whether it is the text
  alternative of a diagram nobody drew. Containment words, direction words, and branches inside one
  paragraph are the signal. On a task page, an instruction that says where a control is without
  showing it is a missing screenshot.

Three further requirements follow. Mermaid in the page stays the default and hand-authored SVG stays
the exception, with no third tool. `check:figures` must grow from a staleness check to seven
mechanical assertions. `check:visuals` must close the hole where an image with no alt attribute
passes unseen. On the front door, the concept figure comes off, and the site's ownership map moves
to the architecture overview, where the page type expects it.

### The corpus

The corpus is the set of human-written excerpts the docs are measured against. It must meet these
constraints:

- `docs/internal/corpus/` holds one excerpt per entry, at most 400 words.
- A manifest records each entry's source, license, fetch date, page type and track, measured
  numbers, and the date the owner approved it.
- Two entries per page type is the ceiling, and one is the floor. A page type with no entry has no
  draft.
- An entry for a table-shaped page is marked structure-only. A review of such a page compares column
  order, row completeness, and the lead sentence rather than cadence.
- An entry the owner rejects is deleted and its id retired.
- A review must cite a corpus entry beside its verdict. A verdict that cites none does not count.

The proposal names the candidate entries per page type, with the excerpt each would carry. Approving
them, or naming the ones to swap, is decision 7 and remains the owner's action. Three entries exist
today as samples, all unapproved: the SQLite scope excerpt, the Go design document excerpt, and the
KEP-2400 excerpt, all in
[`docs/internal/record/2026-09-08-polish-inputs/`](../../internal/record/2026-09-08-polish-inputs/).
A second editors entry is owed and must be chosen by hand, because the Mozilla support articles
block automated reads.

### The review chain

The review chain gives a page the steps a code change gets. The outline comes first, because prose
work on a page with the wrong shape is wasted. A page for a published path must be drafted at that
path on a branch, never under `docs/internal/record`. The steps run in this order:

1. Claude writes the page brief, four lines.
2. Claude drafts the page where it will live, so Vale and the save hook run the right styles from the
   first save.
3. CI runs the outline scripts, `check:anatomy` and `check:headings`, then `check:docs`,
   `check:visuals`, and `check:figures`. A reviewer reads the outline at the same point, before any
   sentence, and returns a page whose type, title, or section order is wrong.
4. CI runs the linters under the severity contract below.
5. The tell scanner reports the sentence numbers, the hinged-pair share, and the short-sentence share
   beside the corpus entry's numbers. A hinged-pair share more than fifteen points above the entry's
   is called out in the report. Nothing gates on any of it.
6. `check:provenance` runs. Every sentence on the front door that states a fact about the owner or
   about cairn's stance must carry a footnote id. The script fails on an id that does not resolve to
   a line in the author brief. On a rebuilt page the same check generalizes: every claim must carry
   an id that resolves to a fact ledger entry, in the shape unit 1 produces.
7. A fresh reviewer grades the page against its corpus entry. The reviewer must be a different
   context from the drafter, and a different model family where one is available. Its report carries
   the page type, the corpus entry, the measurement table, and the verdict.
8. The owner or a volunteer runs the reader test.
9. `check:prose-read` verifies the receipt. A file beside the page carries the page's content hash,
   the measurement table, the corpus entry, the reviewer's verdict, and the reader's result. The gate
   fails when a published page's hash has no matching receipt.

The severity contract governs step 4. An error fails the build. A warning shows in the review. A
suggestion stays local. A rule may move to error only after every existing violation is cleared,
which is GitLab's rule and the reason the 40-word ceiling cannot ship as an error today.

The chain caps revision at two rounds, which is the workstation's own per-task chain rule applied to
prose (`~/.claude/CLAUDE.md`, "Conducting a pass"). A reviewer verdict of fix sends the page back
once. A second fix verdict on the same page is the owner's decision, and the page must not enter a
third automatic round. The cap applies to step 3 and to step 7 separately, because an outline
returned at step 3 has not yet been graded as prose.

#### The quality checklist

Every page walks one checklist before its receipt is written. The reviewer records each item as met,
not met, or not applicable. Beneath each question sits what answers it, a gate or a person:

| Question | What answers it |
|---|---|
| Who is the intended reader, and does the page address that reader alone? | The page brief names the track and reader; a person checks the vocabulary against the track's list |
| What is the page for, and does its first sentence say so? | A person |
| Which standard governs this page, and does the page follow it? | The brief names the page type; `check:anatomy` holds the section order and `check:headings` the heading grammar |
| Is the page organized logically for that reader, with the general case before the exception and each section on one idea? | A person, at the outline review, before any prose is read |
| Does the page deviate from its standard anywhere, and is each deviation recorded with its reason? | The brief; a person |
| Is every claim true and traceable? | `check:provenance` on the front door; facts about the code checked against the code; `check:docs` for links and anchors |
| Is every term the reader is not expected to know defined where it first appears? | A person, against the track's vocabulary list |
| Are requirements stated as requirements and facts as facts? | A person |
| Is the prose within its limits? | Vale holds the sentence ceiling and the paragraph bounds; the tell scanner reports the measurements beside the corpus entry's |
| Does every figure earn its place, and does every missing figure show up? | A person, with the two figure tests; `check:visuals` and `check:figures` |
| Did someone other than the author read it against a named exemplar, and did a reader use it? | Both recorded in the receipt |
| Does the receipt exist and match the page? | `check:prose-read` |

### The reader test

For a task guide, someone who is not the author must do the task from the page. For a concept page
or the front door, the reader reads it once and paraphrases it back. Every mismatch between the
paraphrase and the page is a place the page was unclear. This is Part V of the guidelines, and
DigitalOcean's editors run each tutorial before it ships. The test applies to the task guides in the
admin and extend tracks and to the front door, which today number about forty pages. It never
applies to reference entries. The test costs the owner's time or a volunteer's, and the sittings
remain an owner action under decision 9.

### The Claude setup

Seven pieces of the Claude setup change. The list is short on purpose, because an instruction file
Claude ignores half of is worse than a short one. Anthropic's own guidance makes that point, and the
proposal dropped a memory paragraph on the strength of it. The register stays the durable record for
anything the seven pieces do not carry.

- Both `CLAUDE.md` files gain four lines. Both already sit at the length that Anthropic's guidance
  warns about, so the four lines must replace four others rather than add to them.
- The writing-voice output style gains three tells: the two-headed heading, the abstract noun
  standing in for the concrete thing, and the page describing itself. Nothing else is added, because
  a longer list of prohibitions narrows what a model avoids without changing what it produces.
- The voice files under `~/.claude/docs/voice/`, one per audience, each name the corpus entries for
  their audience and the advisory bands.
- The tell scanner gains the hinged-pair share and the short-sentence share, in report mode, with
  the bands in a small file per audience. The cost review sizes this at about 285 lines of Go with
  no new dependency.
- The Vale hook grades a draft by its path, which step 2 of the review chain makes sufficient.
- The review agents change their dispatch shape. The register editor and the voice reviewer must be
  given a corpus entry and must report the measurement table. The diff reviewer runs the scanner on
  docs tasks. A new `figure-verifier` agent grades figures by the register's method.
- Two skills change. `cairn-figure` holds the production path for figures, and the writing-voice
  skill gains an author-facing prose section holding the brief-first, one-section-per-read protocol.

Five scripts carry the standard, three of them new:

| Script | What it does | State |
|---|---|---|
| `check:cadence` | Runs the prose measurements and reports them beside the page's corpus entry. Never gates | new |
| `check:anatomy` | Reads each template and fails a page whose required headings are missing or out of order | new |
| `check:headings` | Holds sentence case, one level-one heading, no skipped levels, no leading -ing form, verb-first for task sections, sibling parallelism, and question headings only under `docs/editors/` | new |
| `check:provenance` | Fails a front-door claim about the owner or about cairn's stance whose footnote id does not resolve to a line in the author brief, and fails a rebuilt page's claim whose id does not resolve to a fact ledger entry | new |
| `check:prose-read` | Fails a published page whose content hash has no matching receipt | new |

## Decisions adopted

Every decision below is approved. Small means a file or two, under a quarter million tokens. Medium
means a script or a tuned package, under two million tokens. No decision is large.

| # | Decision | Size | Unit |
|---|---|---|---|
| 1 | Adopt the Federal Plain Language Guidelines, 2011 revision, as the prose standard, and vendor the PDF | small | 3 |
| 2 | Hold the paragraph numbers and the 40-word ceiling as gated rules, and the average sentence length as a reported measurement that never gates | small | 3 |
| 3 | Add a Cairn rule that fails a sentence over 25 words on the admin and editors tracks | small for the rule; medium for clearing the 135 admin and 61 editors sentences that exceed it, which must come first under the severity contract | 3, then 5 |
| 4 | Adopt the three structure levels, the page types with their section orders, and the outline-first review | small | 3 |
| 4a | Write the templates and the two new structure scripts | medium | 3 |
| 5 | Adopt the two figure tests and the two-lane routing rule, and commit the figure source and script | small | 3 |
| 5a | Grow `check:figures` to the seven assertions and close the `check:visuals` hole | medium | 3 |
| 6 | Take the concept figure off the front door and move the ownership map to the architecture overview | small | 5 |
| 7 | Approve the corpus entries, or name the ones to swap | small | 2, owner action |
| 8 | Adopt the review chain and its severity contract | small | 3 |
| 8a | Write `check:provenance` and `check:prose-read` | medium each | 3 |
| 9 | Adopt the reader test for the roughly forty task guides and the front door | small in tokens; about forty attended sittings, one per page | 5, owner action |
| 10 | Approve the Claude setup changes as listed | small; the scanner change is about 285 lines | 3 |
| 11 | Approve the `add-a-custom-admin-screen.md` demonstration before any docs pass is planned | small | 4 |

## Compatibility

The standard lands on a documentation set that does not meet it. Three compatibility rules keep the
gates from failing the build on day one:

- A new rule ships at warning level. It moves to error only after every existing violation in the
  tracks it covers is cleared. The 40-word ceiling and the 25-word track ceiling both start at
  warning for this reason.
- The vendored Google and Microsoft packages stay unedited and pinned. Every cairn rule lives under
  `.vale/styles/Cairn/` and sets its own level.
- Vale's rule mechanics differ between the pinned CI version and the workstation version. Every rule
  file must ship with a fixture that fires, and CI's pinned version governs any disagreement.

`check:anatomy`, `check:headings`, `check:provenance`, and `check:prose-read` each gate only the
paths their unit has already brought into compliance. A gate that would fail an untouched track must
scope itself to the tracks that unit rebuilt. Each scope must then widen as later units land, and
unit 5 removes the last exclusion. A plan that adds a scope exclusion must name the unit that
removes it again.

## Implementation

Five units, in order. Each is one pass plan. A unit must not start before the unit above it merges,
because each depends on what the one above produces.

### Unit 1: the fact harvest

Harvest every claim the published pages make into a fact ledger, one track at a time. The tracks are
admin, editors, extend, reference, and the front door. The harvest runs once per track and runs
before any page brief is written, so no drafter is ever exposed to the old prose or the old
organization.

Each track's ledger is one file at `docs/internal/record/<date>-docs-rebuild/<track>-facts.md`. It
carries one entry per claim, and each entry carries an id, the claim, the old file and line it came
from, and the source that proves it. A proving source is a code path, a config key, a wrangler or
Cloudflare record, a recorded transcript fixture, or an owner brief such as
[`front-door-author-brief.md`](../../internal/record/2026-09-08-polish-inputs/front-door-author-brief.md).
A claim with no proving source is listed under a heading named "Unverified" and must not enter any
brief. A gated block is a ledger entry that points at the fixture its gate checks, which covers the
typechecked snippets, the reference signatures, and the recorded admin transcripts.

One rule governs every later drafting dispatch. The drafting agent reads the ledger and the page
type's exemplar, and must never open the old page. A brief's "this page needs" list is built from
ledger entries by id, and `check:provenance` resolves each id against the ledger.

Acceptance criteria:

- Every published page's claims are accounted for in its track's ledger, each as verified with its
  proving source or listed under the "Unverified" heading.
- Every ledger entry carries an id, the claim, the old file and line, and either a proving source or
  the "Unverified" heading.
- Every gated block in the published set has a ledger entry naming the fixture its gate checks.
- No drafting dispatch in a later unit reads an old published page, and each unit's plan states that
  constraint in the dispatch it writes.
- The ledger ids are stable and citable, so a page brief can name an entry without repeating it.

### Unit 2: the corpus

Assemble `docs/internal/corpus/` and its manifest. Fetch one or two excerpts per page type from the
sources the proposal names, each at most 400 words, each with its source, license, and fetch date.
Mark the table-shaped entries structure-only. Measure every entry with
`scripts/checks/measure-prose.mjs` and record the numbers in the manifest. Choose the second editors
entry by hand, since automated reads are blocked. Present the assembled set to the owner for
approval.

Acceptance criteria:

- `docs/internal/corpus/` holds at least one entry per page type in the registry above, and at most
  two.
- The manifest carries source, license, fetch date, page type, track, measured numbers, and an
  approval column for every entry.
- Every entry is at most 400 words and carries a `## Source` section in the shape of
  [`corpus-sample-sqlite.md`](../../internal/record/2026-09-08-polish-inputs/corpus-sample-sqlite.md).
- Every table-shaped entry is marked structure-only.
- The three existing samples are migrated into the corpus directory or superseded, and the record
  directory keeps no second copy.
- The approval column is empty at merge. The owner fills it, and no later unit drafts a page against
  an unapproved entry.

### Unit 3: the rules and the gates

Write everything that holds the standard. This unit produces the templates, the five scripts, the
Vale rules, and the Claude setup changes. It changes no published page.

Acceptance criteria:

- The 2011 guidelines PDF is vendored and referenced from the register.
- `docs/internal/templates/` holds one template per page type in the registry, each carrying that
  type's section order from this spec.
- `check:anatomy` reads the templates rather than a second copy of the orders, and fails a page whose
  required headings are missing or out of order.
- `check:headings` holds all eight heading rules named above.
- `check:cadence` reports the measurements beside a named corpus entry and exits 0 regardless of the
  numbers.
- `check:provenance` fails an unresolved footnote id and passes a resolved one.
- `check:prose-read` fails a published page whose content hash has no matching receipt.
- `check:figures` runs the seven mechanical assertions, and `check:visuals` fails an image with no
  alt attribute.
- Every new or changed Vale rule ships a fixture that fires, and the fixture is verified on the
  pinned CI version.
- Every new gate is wired into `package.json` and into CI, scoped per the compatibility section.
- The register records the standard and points at this spec.
- The Claude setup changes land as listed, with both `CLAUDE.md` files net-neutral in line count.

### Unit 4: the demonstration page

Rebuild `docs/extend/add-a-custom-admin-screen.md` through the full review chain, against its
task-guide corpus entry. The page measures 76 percent hinged pairs, which is the worst figure in the
extend track. The rebuild follows unit 5's shape on a single page, so that shape is proved before it
is planned across the whole published set. This page is the evidence the owner reads beside the
original.

Acceptance criteria:

- The page has a brief, an outline reviewed before its prose, and a receipt.
- Every gate from unit 3 passes on the page.
- The fresh reviewer's report names the corpus entry and carries the measurement table.
- The owner has read the rebuilt page beside the original and has approved unit 5 to proceed.

### Unit 5: the docs rebuild

Rebuild the published pages against the standard. This unit is a rebuild, and never an edit. For
each page, Claude writes the brief and the outline from the track's fact ledger, then drafts fresh
against the page type's exemplar. The drafter never opens the page it replaces. The brief's "this
page needs" list cites ledger entries by id, and `check:provenance` resolves every claim on the
drafted page to one of those ids. The existing block gates prove that each carried snippet,
signature, and transcript still holds.

The reasoning is measured. The proposal converged in eight revisions from an edited draft, and the
from-scratch draft reached the same gate state in three loops. Editing keeps every structural choice
the old pages made, and those choices were made with no page type, no brief, and no outline review,
which is the failure this standard exists to stop.

Reference entries under `docs/reference/` are the named exception, and they are edited in place. The
signature gate already fixes their shape, so the structural risk the rebuild answers does not reach
them. The prose around each signature is small enough that an edit reaches the same result for less
work. Each reference page's brief records the exception and its reason.

The unit runs one track at a time. The outline of every page in a track is read against its type
before a single paragraph of that track is drafted. The unit carries the front-door changes from
decision 6 and the sentence-ceiling clearing from decision 3. It must be planned with its own token
ceiling, since it is by a wide margin the largest of the five units.

Acceptance criteria:

- Every published page has a track, a page type, a brief, and a receipt.
- Every published page outside `docs/reference/` was drafted fresh against its exemplar, by an agent
  that did not open the page it replaces, and its brief's "this page needs" list cites the ledger
  entries by id.
- Every page under `docs/reference/` was edited in place, and the exception is recorded in each
  brief.
- `check:snippets`, `check:reference:signatures`, `check:transcripts`, and `check:docs` pass, proving
  every carried block still holds.
- `check:anatomy`, `check:headings`, `check:provenance`, and `check:prose-read` pass across the whole
  published set, with no path-scoped exclusions left from the compatibility section.
- The 40-word ceiling and the 25-word track ceiling are at error level, with zero violations.
- The concept figure is off the front door and the ownership map is on the architecture overview.
- The reader test has run on the task guides in the admin and extend tracks and on the front door,
  with each result in that page's receipt.

## Risks

- **Fact loss and prose infection in the rebuild.** A fresh draft can drop a fact the old page
  carried, and a drafter that reads the old page inherits its organization and its rhythm. Unit 1
  controls both. The fact ledger accounts for every claim before any brief is written, so nothing
  reaches a draft only by having been read, and the drafter never opens the page it replaces. The
  outline review checks the brief's cited ledger ids against the outline before drafting starts. The
  existing block gates catch a dropped snippet, signature, or transcript, and `check:provenance`
  catches a claim that resolves to no ledger entry. A claim the harvest missed entirely is caught by
  nothing, which is why the harvest's first acceptance criterion is completeness per page.
- **The measurement instrument is unsettled.** It moved twice during the proposal, and each move
  changed the numbers by more than the width of the human band. No cadence number may become a gate
  until the definition in `measure-prose.mjs` is fixed and a track has twenty documents and three
  hundred sentences behind its band.
- **A Vale rule that enforces nothing.** A rule written as a section override can silently disable
  itself on the pinned CI version. The must-fire fixture is the only control, which is why unit 3
  makes it a requirement for every rule.
- **The attended cost.** The reader test is about forty sittings and is the largest attended cost in
  the table. A unit 5 plan that does not schedule those sittings will stall at its last acceptance
  criterion.
- **Unit 5 is large.** The proposal's cost review sizes the full docs pass at six to nine million
  tokens and 31 to 73 attended sittings. It must be planned as its own initiative with its own
  ceiling, one track at a time, and never folded into another pass.
- **Templates and gates drifting apart.** Two copies of a section order will diverge. The control is
  that `check:anatomy` reads the templates as its only source, which unit 3's acceptance criteria
  require.

## Open items

Three items are owed by the owner, and no unit that depends on one may start before it arrives:

- **The corpus approvals (decision 7).** The candidate entries are named in the proposal and none is
  approved. Unit 2 assembles them and unit 4 cannot draft against an unapproved entry.
- **The second editors corpus entry.** The Mozilla support articles block automated reads, so the
  entry must be chosen by hand and approved separately.
- **The reader-test sittings (decision 9).** About forty sittings, one per page, across the admin and
  extend task guides and the front door. They are scheduled inside unit 5 and remain unrun.

Two items are unresolved in the proposal and stay unresolved here. The hinged-pair definition in
`measure-prose.mjs` is fixed for now and no number built on it is a rule yet. The proposal's revision
8 has not been reader-tested, and the register grade of its revision 5 raised sixteen findings whose
answers are unverified.

## Receipt

Measured with `scripts/checks/measure-prose.mjs` over everything above this section, with list items
included and then excluded. The corpus columns measure the two exemplar excerpts the same way, each
with `--until "## Source"`. Vale ran with the Google package forced on, over a copy of this file at
a path `.vale.ini` globs onto Google, since the specs directory is style-exempt; the local binary is
3.20.0 and CI pins 3.15.1, so CI governs any disagreement. Every cell below comes from script
output.

| Measure | All sentences | Prose only | Go exemplar | KEP exemplar | Target | Status |
|---|---|---|---|---|---|---|
| Sentences | 429 | 217 | 17 | 22 | | count only |
| Average length | 13.9 words | 14.6 words | 22.1 words | 16.4 words | 15 to 20 | miss, 0.4 words below the floor on prose. The page is heavily listed and states most requirements in one short sentence each |
| Longest sentence | 35 words | 34 words | 39 words | 44 words | under 40 | pass |
| Hinged pairs | 28 percent | 35 percent | 41 percent | 18 percent | at or under the exemplar plus 15 points | pass against the Go exemplar; 35 against the KEP's 18 is 17 points over, which step 5 of the chain reports and nothing gates on |
| Sentences under 8 words | 22 percent | 19 percent | 12 percent | 27 percent | reported | reported |
| Paragraphs | 68 | 68 | 8 | 6 | | count only |
| Paragraphs over 8 sentences or 150 words | 0 | 0 | 0 | 0 | 0 | pass |
| Paragraphs under 3 sentences, list lead-ins exempt | 0 | 0 | 6 | 3 | 0 | pass |
| Vale, Google package forced | 0 errors, 35 warnings, 166 suggestions | | | | errors 0 | pass. The warnings are contractions, Oxford commas, and word-list items from the Google package, which this internal spec does not adopt for itself |
| Tell scanner findings | 0 | | | | 0 | pass |
| Three-item lists the scanner counted | 5 | | | | each a real list | counted, not flagged; the scanner returned no finding |
