# A documentation standard for cairn: design

**Status:** revision 3, 2026-09-08. Derived from the approved proposal at
[`docs/internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md`](../../internal/record/2026-09-08-polish-inputs/docs-standard-proposal.md).
The proposal carries the evidence and the reasoning behind every rule here, and its reviews and
research sit beside it in the same directory. This spec restates two things as requirements: the
eleven decisions the owner adopted with the proposal, and three further directions the owner gave on
2026-09-08 after that approval. Those three directions are:

- (a) A page is rebuilt, never edited, with reference entries the one exception.
- (b) A fact harvest runs per track before any page brief is written, and drafters never open the
  page they replace.
- (c) The work ships as two pass plans, the toolset first and the rewrite second.

Rows 12, 13, and 14 of the decisions table carry them, each marked as an owner direction of
2026-09-08.
Everything else below restates what the proposal already argued. A claim here that carries no link
resolves to the section of the proposal with the same heading.

**Page brief.** Type: design spec, internal. Reader: the implementer who writes the pass plans from
this document, and the owner checking it against the proposal. This page needs the four parts of
the standard stated as requirements, with the nine page types and their
section orders. It also
needs the adopted decisions with their sizes, an implementation order in pass-sized units, the
acceptance criteria for each unit, the risks, the decisions the owner still owes, and the items the
owner still owes. Exemplars: the Go design document for monotonic time
([`corpus-sample-go-design.md`](../../internal/record/2026-09-08-polish-inputs/corpus-sample-go-design.md))
and KEP-2400
([`corpus-sample-kep-node-swap.md`](../../internal/record/2026-09-08-polish-inputs/corpus-sample-kep-node-swap.md)).
The section order below is the Go document's spine, which runs abstract, background, proposal,
rationale, compatibility, implementation. Deviations, each with its reason:

- A design spec is not one of the page types the standard names, so no template governs it and the
  exemplar rule applies instead. Internal planning documents are not graded, which owner decision 2
  settles, so no registry type covers this page.
- Design details, goals and non-goals, risks, and open items come from the KEP spine, because the Go
  document has no section for any of the four and the owner's brief requires all four.
- Rationale is present but short. It carries only the reasoning this document adds beyond the
  proposal; repeating the proposal's own reasoning would produce a second copy that drifts.
- The decisions table, the owner-decisions table, and the acceptance criteria are this repository's
  own spec convention, held by every spec under `docs/superpowers/specs/`. Decisions sits before
  Compatibility because Compatibility is written against the adopted set. Risks sits after
  Implementation because most risks are unit risks.
- The registry folds the proposal's "condition entry and symptom row" bullet into the reference
  entry as two section shapes, and it drops the internal proposal type. Both are owner decision 2,
  resolved on 2026-09-08, and they bring the registry to nine types.
- This page names its own type and carries its brief inline. An internal spec has no separate brief
  file and no reader it could mislead, and the no-self-naming rule binds published pages.
- The page carries one 40-word sentence and, on the all-sentences measure, an average sentence length
  under the 15-word floor. Both are reported in the receipt and neither gates.

## Abstract

cairn's published documentation has no written standard for how a page is built. A **receipt**, the
record of a page's measurements, reviewer, and reader result, does not exist for any page. The code
has its conventions and its gates, and the prose has a style floor that reads one line at a time. The
front door passed every gate and the owner rejected it as a useless disaster.

This spec adopts a documentation standard in four parts. Prose rules govern sentences and paragraphs.
Structure rules govern which pages exist, what sections each page type carries, and how a section is
built. Figure rules govern when a diagram or a screenshot earns its place. The review chain gives a
page the sequence of checks a code change gets, and ends in a receipt a gate can verify.

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
own promise contradicts. Its sentences were built as hinged pairs at a rate no human page then
measured came near. A hinged pair is two clauses joined by a comma and a coordinator, by a colon, by
a semicolon, by a spaced dash, or by a chain of relative clauses.

Three places let the faults through. Vale and the tell scanner both read words and punctuation, and
the draft was written to pass them. Nothing checked the draft's facts against the owner. Nobody but
the author read the page before the owner did. Rule 1 answers the second place and rule 2 the third.
The structure rules and the outline review answer the first.

The rhythm problem reaches past that one page. On the instrument the proposal's receipt uses, the
extend track builds 54 percent of its sentences as hinged pairs and the reference track builds 58
percent. Three human pages measure 41 percent (the Go design document), 20 percent, prose-only
(KEP-2400), and zero (the SQLite scope excerpt). Sample sizes are small enough that the intervals overlap, so the
proposal treats the gap as a direction rather than a finding. The rejected draft's own figure was
never recorded, so no multiplier can be stated. The sentence-length gap is firmer. The reference
track averages 22 words with one sentence at 151 words, where PostgreSQL, MDN, and the Rust
reference average 12 to 18 words with almost nothing over 40.

## Goals and non-goals

Prose an expert reader accepts as well written and true, produced mostly by Claude, with the
front-door failure unable to recur: that is the goal. The standard reaches it by making a page's
shape, its facts, and its reviewer all checkable before the page ships. Every rule below closes one
of the three holes the rejected front-door draft fell through.

Four things are not goals:

- A readability gate. Controlled studies since the 1960s found that rewriting to a sentence-length
  number does not improve comprehension. Every number in this spec locates a passage for a person
  to judge. Owner decision 1 settles whether decision 3's ceiling is the one exception.
- A new taxonomy, and no reorganization of the four tracks. The tracks stay as they are, their
  membership stays as it is, and no published page cites Diátaxis. Rebuilding the pages inside a
  track is in scope; moving a page between tracks is not.
- A rewrite of the corpus tooling into a scoring system. A **band**, the range a track's corpus
  entries set for one measurement, stays advisory until that track has twenty documents and three
  hundred sentences behind it.
- A single pass. The rewrite is its own plan with its own ceiling, and the toolset lands first.

## Proposal

The standard is adopted in four parts, held by a review chain, and switched on by the decisions the
"Decisions adopted" section lists. Each part below states requirements a page must meet. The
requirements are normative. A page that does not meet one must record the deviation in its page
brief with a reason, in the form the register's "when a Vale finding is wrong" rule sets.

The work divides into five units across plan one (the Claude infrastructure), pass 2a (the toolset
and the demonstration page), and five per-track stages that each harvest, rewrite, and tune one
track. A track's harvest must finish before any of its briefs is written, because a
rebuild's drafter never opens the page it replaces and the ledger (the fact ledger, defined under
unit 1) stands in its place. The corpus
must exist before a draft, because a page type with no approved exemplar has no draft and a review
that cites no corpus entry does not count. The templates and the scripts hold the structure rules
the work is graded against. The demonstration page is the evidence the owner reads before the
rewrite is planned.

## Rationale

Three choices in this document go beyond what the proposal argued. Each is answered here rather than
left to a plan author. The proposal holds the reasoning for everything else.

**Why rebuild rather than edit.** Editing keeps every structural choice the old pages made, and
those choices were made with no page type, no brief, and no outline review, which is the failure
this standard exists to stop. The measured support is one data point: the proposal converged in
eight revisions from an edited draft and reached the same gate state in three loops from scratch.
One point is thin, which is why the demonstration page exists to test the method on a real docs page
before the rewrite is planned.

**Why a quarantine plus a coverage diff, rather than a diff alone.** A drafter that reads the old
page inherits its organization and its rhythm, so the quarantine holds. But a claim the harvest
missed is then caught by nothing, and asserting the harvest is complete does not make it so. A
separate agent, never the drafter, compares the drafted page's claims to the ledger after the draft
exists and reports the misses. The quarantine keeps the prose out; the coverage diff keeps the facts
in.

**Why the ids live in a brief file rather than in the page.** Footnote markers on every claim-bearing
sentence would make the published markdown unreadable for the reader the standard exists to serve.
A sibling brief file carries the same information, resolves by convention for every gate, satisfies
the rule that a page must not name its own type, and never ships in the tarball.

**Why the docs are updated in stages, with a tuning checkpoint between each (owner direction,
2026-09-08).** The earlier shape harvested all 76 pages in one pass and then rewrote them. That shape
commits the ledger schema, the templates, the brief schema, and every gate threshold before a single
track has been rewritten against them, so a wrong ledger field or a bad template is discovered after
all five tracks have been built on it. Staging the work inverts that: one small track is harvested,
rewritten, and measured, the tooling is tuned against what that track showed, and the next stage's
plan is authored against the tuned tooling. The cost is five checkpoints and five plan-authoring
sittings instead of one. The return is that every mistake in the standard's own machinery is paid for
once, on the cheapest track that can reveal it, rather than five times. The stages are ordered by how
hard the track is to write well, easiest first, so the tuning happens where the writing risk is
lowest and the front door, the page set whose rejection produced this initiative, meets the system
last.

## Design details

### Prose rules

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

No sentence-length number comes from the guidelines. The numbers below are cairn's own, and each
names its source:

| Measure | Target | Source | Status |
|---|---|---|---|
| Average sentence length | 15 to 20 words | OPM plain-language guidance | measured and reported, never gated |
| Longest sentence | under 40 words | Cutts, Oxford Guide to Plain English | level set by owner decision 1 |
| Sentence ceiling, admin and editors tracks | 25 words | ASD-STE100 | level set by owner decision 1, through a Cairn rule that sets its own level |
| Paragraph length | 3 to 8 sentences and 150 words, hard limit 250 | the guidelines, Part III | gated |

ASD-STE100 sets 20 words for a sentence that gives an instruction and 25 for one that describes. The
admin and editors tracks take the 25, because most of their sentences describe a screen or a state.
One number per track is what a linter can hold. Microsoft's sentence-length rule has run on the
editors track at suggestion level all along, so its findings were advisory. Both vendored packages
must stay unedited and pinned in CI, so a Cairn rule sets the level and the number for the two
tracks.

Three safeguards keep the numbers from doing harm:

- Every rule file must ship with a fixture that fires. A rule written as a Vale section override can
  silently disable itself on the pinned CI version, and the proposal's cost review reproduced this
  on both versions.
- The sentence ceiling must travel with the two rules ASD-STE100 pairs it with. Complex text must go
  into a list, and no part of a sentence may be dropped to make it shorter.
- The average must never become a gate. Writing to it produces amputated sentences, which revision 2
  of the proposal demonstrated on itself.

### Structure rules

Structure is where the front door failed first. Its sections existed because a chain of derivations
produced them, and no gate looked at the order. Three levels each get their own gate. The docs set
decides which pages exist. The page decides its own sections and their order. The section decides
how one block of text is built.

#### Docs-set level

Every published page must have one track and one page type. A page must look like what it is, so
that a reader who knows the genre recognizes the page on sight. Each page type must name a published
exemplar of its genre, and the **corpus**, the set of human-written excerpts defined below, must
carry an excerpt of it. A page whose type has no approved exemplar must not be written. The page
brief must name the exemplar the page was drafted against.

A page type is a named shape. Nine are named, and every one is published. Each is listed with the
reader's job it serves and its exemplars, because a page whose job nobody can state in one line is
two pages. This list is the registry a page brief cites.

| Page type | The reader's job | Exemplars |
|---|---|---|
| Task guide | The reader has a goal and wants the steps | Cloudflare's Workers get-started guide; a GitHub Docs how-to |
| Tutorial milestone | The reader is learning and needs the next unit in a sequence | a unit of Astro's blog tutorial |
| Concept page | The reader must understand something before acting | PostgreSQL's concurrency chapter; Astro's "Why Astro" principles |
| Architecture overview | The reader must see how the parts fit and who owns each | SQLite's architecture page; Kubernetes' cluster architecture page |
| Reference entry | The reader knows the name and wants the contract, or has a failure and wants the cause and the fix | PostgreSQL's CREATE INDEX; MDN's scrollIntoView; Cloudflare's Workers error tables for the condition and symptom section shapes |
| Reference table | The reader wants one row of many | Wrangler's configuration reference; a Stripe object page |
| Index page | The reader must find the right page and leave | a Kubernetes section index |
| Front door, evaluator | An evaluator is deciding whether cairn fits | SQLite's scope page; Kubernetes' overview. The editors track's welcome page is a front door for its own reader, with a GOV.UK guidance page and a Mozilla support article as its exemplars |
| Front door, track index | The reader must reach the right track and leave | a Kubernetes section index; the GOV.UK topic page |

`docs/why-cairn.md` and the root `README.md` are the evaluator type. `docs/README.md` and the four
track READMEs are the track-index type, which the register's five-routes-in-the-first-screenful
requirement governs.

No internal type is in the registry. Internal planning documents are not graded, which owner
decision 2 settles, so a spec, a plan, a post-mortem, and a record carry no page type and no
template, and they stay outside the Vale gates that `.vale.ini` exempts for `docs/internal/**` and
`docs/superpowers/**`. Every structure gate is scoped to published paths only.

Four rules hold at this level:

- A page must do one job, stated in its first sentence.
- A page must read on its own, without the page before it. Readers arrive from search, from the
  admin's help link, and from npm.
- A page must stay on one level. It must link down to a concept rather than explain it in place.
- An index must group its children once it lists more than nine siblings, which is Horn's chunking
  bound.

#### The registry lifecycle

The registry is maintained on outcome. A type earns its place by what the pages of that type
measure, and the registry changes when the measurements say to. Four parts hold it.

**The outcome record.** Each type carries one row in `docs/internal/page-types.md`. The row records
the pages assigned to the type, the outline-review failures and the provenance findings clustered by
type, the reader-test results for its pages, and the measured drafting cost of a page of that type.
The failure and finding counts come from the ledger rows `check:prose-read` verifies and from the
coverage-diff reports, so no count is entered by hand from memory.

Three further signals sit in the same row, each cheap and each drawn from the field's most
predictive measures:

- **The questions a page of this type made someone ask.** Every question the owner, an agent, or a
  reviewer had to ask about a page during a pass is logged as one line in that pass's record when it
  happens, and rolled up per type at the review. Four documentation vendors converged independently
  on unanswered questions as the primary content signal, and this is that signal at the cost of a
  line.
- **Helpful votes per type, read on a fixed cadence.** This one is future work, not a plan-two task.
  It starts when cairn.pub carries a voting widget. The literature's warning is what makes it a
  per-type field rather than a per-page one: a vote must be read against the page's type and never
  pooled across types.
- **Reviewer-miss feedback.** What the fresh reviewer changed on a drafted page, and whether the miss
  traces to the template or to the subject. The coverage-diff and review steps record it, one
  structured line per review. It is the signal that attributes a failure to the type the drafter was
  handed rather than to the subject matter, which is the question this registry actually asks.

**The review triggers.** Four. A review runs at **the close of every stage**, as the first part of
that stage's tuning checkpoint. A review runs at the close of every rewrite plan. A review also runs
on any page brief that cannot name a type. And a review runs on a type whose outline-review failure
count rises against its own prior record by a stated margin for two consecutive reviews.

That last trigger compares a type against itself, never against the other types. A threshold set at
the registry median retires half the registry by construction, and the practitioner literature holds
that a documentation metric is goal-specific per type, so a task guide's failure count and a
reference entry's are not comparable quantities. Two bounds keep the trigger from firing on noise. It
needs an absolute floor of at least three outline-review failures in the review window, and a minimum
sample of at least three pages of that type. Below either bound the trigger cannot fire. It therefore
cannot fire at the first stage's checkpoint, and the earliest it can fire is the third. The anatomy
report therefore reports per-type failure counts and page counts, and never a cross-type ranking.

**The rulings.** Add a type when two or more pages need a whole-page shape no type gives, and only
after an exemplar is found. Merge or retire a type whose page count falls under three, or whose
pages the third trigger has flagged. Revise a template when the findings cluster on one of
its sections. Record each ruling in `docs/internal/page-type-rulings.md`, in the shape
`docs/internal/engine-rulings.md` uses: the ruling, the evidence, and what would reopen it.

**The first review.** It runs at the demonstration page in pass 2a, against that page's measured
template cost. Every review after it is the first part of a stage's tuning checkpoint, and it draws
its per-type numbers from that stage's record rather than counting them a second time.

**What here is precedented and what is not.** The field survey at
[`research-agent-run-docs-lifecycle.md`](../../internal/record/2026-09-08-polish-inputs/research-agent-run-docs-lifecycle.md)
found the registry itself, the human adjudication of every proposed change, and the fixed review
cadence all well attested, at Cloudflare, Kubernetes, GitLab, PostHog, and GitBook. It found no
published precedent for a per-type outcome record or for a trigger that fires when a brief cannot
name a type. Every registry surveyed is a static list with selection guidance, and no program
publishes what evidence retires a type. Nothing in the field will validate those two, which is the
reason each must be cheap enough to run that its cost never has to be defended.

#### Page level

Each page type gets a fixed section order, held in a template under `docs/internal/templates/`. A
new `check:anatomy` script must read each template and fail a page whose required headings are
missing or out of order, so a template and its gate cannot drift apart. The reference-entry template
is derived from the shape `check:reference` and `check:reference:signatures` already fix, never a
second copy of it. The orders are:

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

**Reference entry**. Identity: (1) export name, (2) signature block, (3) a summary of one to three
sentences. Contract: (4) parameters, (5) returns, (6) defaults, (7) failure modes, (8) stability
tier. Use: (9) example, (10) see also.

The type carries two further section shapes, each optional and each used where the entry documents a
failure rather than an export. A **condition** section states the condition, its cause, and its fix,
in that order. A **symptom** section is a table whose rows a reader matches on sight, one row per
symptom, with the same columns in every row. Both keep the field lists the recovery pages carry
today, treated as an order rather than as a set, and neither gains a field in this spec, since the
recovery pages already carry the fields their readers use. The template records both orders so the
anatomy gate can hold them.

**Reference table**. The prose rules apply to the lead sentence and the notes only:

1. A lead sentence saying what the table lists and how it is ordered.
2. The table, one row per item, the same columns in every row.
3. Notes, if any, keyed to rows.

**Index page**:

1. Title.
2. Who this track is for, and who it is not for, with the route out for the wrong reader.
3. The pages, in reading order.
4. Where to start.

**Front door, evaluator**:

1. The owner's account of where cairn came from.
2. What cairn does.
3. Where it fits.
4. What it is not, as its own section.
5. Why this stack.
6. The trade-offs.
7. A short checklist the reader answers.
8. Where to go next.

**Front door, track index**. The index-page order above, with one addition: section 3, the pages in
reading order, must put five routes in the reader's first screenful, which is the register's
requirement for this surface.

No page may name its own type or track, which extends the standing rule that no page cites
Diátaxis. A page must state its type by following it. The template and the brief file are the only
places a type is written down.

#### Section level

A section must cover one idea and state it in its first sentence, and so must each paragraph in it.
A list must be grouped once it passes nine items, and a template's section order is a shape rather
than a list a reader scans, so it is exempt. A paragraph must run three to eight sentences, which is
Google's rule kept. A heading must either tell the reader to do something or explain something. The
first kind starts with a bare verb, and the second is a noun phrase. Siblings at one level must
share one form. A question heading is allowed only in the editors track, where the question is the
reader's own. A section that carries an instruction must end where the reader can act, or must name
the page that tells them how.

Seven heading rules must hold, and a new `check:headings` script must carry them:

1. Sentence case.
2. One level-one heading.
3. No skipped levels.
4. No leading -ing form.
5. Verb-first for task sections, noun phrases for the rest.
6. Siblings in one form.
7. Question headings only under `docs/editors/`.

Rules 1 through 4 and 7 are mechanical. Rules 5 and 6 need a decision about whether a heading's first
word is a verb. They ship against a committed lexicon of the imperative verbs cairn's docs use, with
an allowlist escape. A heading outside the lexicon warns rather than fails, and parallelism is
checked only where every sibling resolves.

Markdownlint carries rules 2 and 3 under its stock `MD025` and `MD001`, so `check:headings` does not
reimplement them. The `Cairn.TwoHeadedHeading` Vale rule holds one shape of one fault and nothing
more. Vale sees one line at a time, and parallelism needs the whole page, which is why the script
must exist.

#### Page brief and outline review

Every page must have a brief, written before the outline, and the brief is a file rather than a
prose note. It lives at `docs/<track>/<page>.brief.yml`, one per published page, outside
`package.json`'s `files` array so it never ships in the tarball. Every gate resolves it by
convention. Its fields:

| Field | What it carries |
|---|---|
| `type` | the page type from the registry |
| `track` | admin, editors, extend, reference, or front-door |
| `exemplar` | the published page the draft was written against |
| `corpus_entry` | the corpus id the review grades against |
| `needs` | the ledger ids this page must carry |
| `keep` | the ledger ids of the keep classes below, which the page must carry verbatim or preserve |
| `deviations` | each departure from the standard, with its reason |
| `sentences` | one line per drafted sentence, each a ledger id or the literal `no-claim` |

Four questions sit behind those fields. What does a page of this type include, and which exemplar
shows it? Which track and reader does it serve? What must this page carry that its type does not say?
How does it deviate? A brief that cannot name an exemplar must stop the draft until one is
found. A deviation is allowed only when the brief records it with its reason. A page with no brief
has no outline to check against.

The outline must be reviewed against the brief before any sentence is reviewed. A reviewer, and
`check:anatomy` behind the reviewer, reads the page type, the title, the headings, and the section
order first. A page whose shape is wrong goes back before its prose is graded, because prose work on
a page with the wrong shape is wasted.

### Figure rules

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

Four further requirements follow. Mermaid in the page stays the default and hand-authored SVG stays
the exception, with no third tool, and every figure's source and its generating script are
committed. `check:figures` must grow from a staleness check to seven mechanical assertions.
`check:visuals` must close the hole where an image with no alt attribute passes unseen. On
`docs/why-cairn.md` the concept figure comes off, and the site's ownership map moves to
`docs/extend/architecture.md`, where the page type expects it.

### Corpus

The corpus is the set of human-written excerpts the docs are measured against. It must meet these
constraints:

- `docs/internal/corpus/` holds one excerpt per entry, at most 400 words.
- A manifest records each entry's source, license, fetch date, page type and track, measured
  numbers, and the date the owner approved it.
- An entry whose license does not permit a 400-word excerpt is recorded as reference-only: URL,
  fetch date, and measured numbers, with no excerpt committed. Where two candidates serve one page
  type, the permissively licensed one wins.
- Two entries per page type is the ceiling, and one is the floor. A page type with no entry has no
  draft.
- An entry for a table-shaped page is marked structure-only. A review of such a page compares column
  order, row completeness, and the lead sentence rather than cadence.
- An entry the owner rejects is deleted and its id retired.
- A review must cite a corpus entry beside its verdict. A verdict that cites none does not count. A
  page whose brief names two entries is compared against the closer of the two, and the report names
  both.

The proposal names the candidate entries per page type, with the excerpt each would carry. Approving
them, or naming the ones to swap, is decision 7 and remains the owner's action. Three entries exist
today as samples, all unapproved: the SQLite scope excerpt, the Go design document excerpt, and the
KEP-2400 excerpt, all in
[`docs/internal/record/2026-09-08-polish-inputs/`](../../internal/record/2026-09-08-polish-inputs/).
A second editors entry is owed and must be chosen by hand, because the Mozilla support articles
block automated reads.

### Review chain

The review chain gives a page the steps a code change gets. Shape comes first, for the reason the
outline review gives. A page for a published path must be drafted at that path on a branch, never
under `docs/internal/record`. The steps run in this order:

1. Claude writes the page brief file.
2. Claude drafts the page where it will live, so Vale and the save hook run the right styles from the
   first save.
3. CI runs the outline scripts, `check:anatomy` and `check:headings`, then `check:docs`,
   `check:visuals`, and `check:figures`. A reviewer reads the outline at the same point, before any
   sentence, and returns a page whose type, title, or section order is wrong.
4. CI runs the linters and markdownlint under the severity contract below.
5. The tell scanner reports the sentence numbers, the hinged-pair share, and the short-sentence share
   beside the corpus entry's numbers. Nothing gates on any of it.
6. `check:provenance` runs, in the deny-by-default shape below.
7. A fresh reviewer grades the page against its corpus entry. The reviewer must be a different
   context from the drafter, and a different model family where one is available. Its report carries
   the page type, the corpus entry, the measurement table, and the verdict.
8. A separate agent, never the drafter, runs the coverage diff: it compares the drafted page's
   claims against the track ledger and reports every ledger entry the page dropped.
9. The owner or a volunteer runs the reader test.
10. `check:prose-read` verifies the receipt against the page.

The severity contract governs step 4. An error fails the build. A warning shows in the review. A
suggestion stays local. A rule may move to error only after every existing violation is cleared,
which is GitLab's rule.

The chain caps revision at two rounds, which is the workstation's own per-task chain rule applied to
prose (`~/.claude/CLAUDE.md`, "Conducting a pass"). One round is steps 3 through 7 run once. A fix
verdict buys one redraft and one second run of those steps. A second fix verdict goes to the owner,
and the page must not enter a third automatic round. There is one cap on the whole chain, not one
per step.

#### Provenance

`check:provenance` is deny-by-default. Its unit of judgment is the sentence, and its record is the
brief's `sentences` list. Every drafted sentence must appear there, carrying either a ledger id or
the literal `no-claim`. A sentence the drafter did not classify fails the build. That is what makes
the check see an absence: a script cannot decide which sentences state facts, but it can refuse a
page whose author declined to decide.

The gate then checks two things. Every id in the brief must resolve to a ledger entry. And every
machine-extractable fact in the page (numerals, version strings, file paths, commands and flags,
export and config names, and the product claims listed in the ledger's `owner` tier) must appear in
at least one cited entry. Everything the extractor cannot reach is left to the fresh reviewer at
step 7, who reads the brief beside the page. Ids never appear in the published markdown.

`check:provenance` was scoped to the front door alone when the proposal first sized it; owner
direction (b) widens it to every rebuilt page, since the harvest it depends on now runs per track
rather than for one page.

The rejected front-door draft would fail this check. Its editors-emailing-the-owner story resolves
to no line in
[`front-door-author-brief.md`](../../internal/record/2026-09-08-polish-inputs/front-door-author-brief.md),
so the sentence carries no id it could cite, and leaving it unclassified fails the build outright.
Marking it `no-claim` would pass the script and fail the reviewer, because a narrative assertion
recorded as claiming nothing is visible in the brief rather than invisible in the prose. The check
converts a silent omission into either a red build or a written falsehood a person reads.

### Gates

Five new scripts carry the standard, alongside the gates the repository already runs:

| Script | What it does | State |
|---|---|---|
| `check:anatomy` | Reads each template and fails a page whose brief is missing or unparseable, or whose required headings are missing or out of order | new |
| `check:headings` | Holds the seven heading rules, with rules 5 and 6 against the verb lexicon | new |
| `check:provenance` | Fails an unclassified sentence, an unresolved ledger id, or a machine-extractable fact no cited entry carries | new |
| `check:prose-read` | Fails a published page whose receipt is missing or stale | new |
| `check:ledger` | Validates the ledger files: unique ids, and every entry carries an origin and a proving source or sits under `unverified` | new |

No `check:cadence` script exists. Cadence is the tell scanner's job under decision 10, and the
scanner is the workstation's instrument rather than cairn's. CI invokes it in report mode over
changed docs paths where it is available, and its absence never fails a build, because nothing it
reports gates.

Markdownlint joins the gate set with its stock rules, which carry heading increment, single H1,
duplicate headings, code-fence language tags, list markers, and table integrity. An external
link-rot check runs on a schedule rather than per pull request, per this repository's watch-item
rule, and reports rather than fails. The must-fire Vale fixtures run on every CI run, not once, so a
future pin bump fails loudly.

#### Quality checklist

Every page walks one checklist before its receipt is written. The reviewer records each item as met,
not met, or not applicable. Beneath each question sits what answers it, a gate or a person:

| Question | What answers it |
|---|---|
| Who is the intended reader, and does the page address that reader alone? | The brief names the track and reader; a person checks the vocabulary against the track's list |
| What is the page for, and does its first sentence say so? | A person |
| Which standard governs this page, and does the page follow it? | The brief names the page type; `check:anatomy` holds the section order and `check:headings` the heading grammar |
| Is the page organized logically for that reader, with the general case before the exception and each section on one idea? | A person, at the outline review, before any prose is read |
| Does the page deviate from its standard anywhere, and is each deviation recorded with its reason? | The brief; a person |
| Is every claim true and traceable? | `check:provenance`; the coverage diff for what the page dropped; `check:docs` for links and anchors |
| Is every term the reader is not expected to know defined where it first appears? | A person, against the track's vocabulary list |
| Are requirements stated as requirements and facts as facts? | A person |
| Is the prose within its limits? | Vale holds the sentence ceiling and the paragraph bounds; the tell scanner reports the measurements beside the corpus entry's |
| Does every figure earn its place, and does every missing figure show up? | A person, with the two figure tests; `check:visuals` and `check:figures` |
| Did someone other than the author read it against a named exemplar, and did a reader use it? | Both recorded in the receipt |
| Does the receipt exist and match the page? | `check:prose-read` |

### Reader test

For a task guide, someone who is not the author must do the task from the page. For a concept page
or the front door, the reader reads it once and paraphrases it back. Every mismatch between the
paraphrase and the page is a place the page was unclear. This is Part V of the guidelines, and
DigitalOcean's editors run each tutorial before it ships. The test never applies to reference
entries. It costs the owner's time or a volunteer's, and how many pages get one is owner decision 4.

### Claude setup

Seven pieces of the Claude setup change. The list is short on purpose, because an instruction file
Claude ignores half of is worse than a short one. Anthropic's own guidance makes that point, and the
proposal dropped a memory paragraph on the strength of it. The register stays the durable record for
anything the seven pieces do not carry.

- Both `CLAUDE.md` files gain four lines. Both already sit at the length that Anthropic's guidance
  warns about, so the four lines must replace four others rather than add to them. Which four leave
  is a taste call and an owner action, taken at the same sitting that approves the corpus.
- The writing-voice output style gains three tells: the two-headed heading, the abstract noun
  standing in for the concrete thing, and the page describing itself. Nothing else is added, because
  a longer list of prohibitions narrows what a model avoids without changing what it produces.
- The voice files under `~/.claude/docs/voice/`, one per audience, each name the corpus entries for
  their audience and the advisory bands.
- The tell scanner gains the hinged-pair share and the short-sentence share, in report mode, with
  the bands in a small file per audience. The cost review sizes this at about 285 lines of Go with
  no new dependency. Every new measure is scoped to the docs register and must not fire on site
  content, which `CLAUDE.md` holds in its own personal voice.
- The Vale hook grades a draft by its path, which step 2 of the review chain makes sufficient.
- The review agents change their dispatch shape. The register editor and the voice reviewer must be
  given a corpus entry and must report the measurement table. The diff reviewer runs the scanner on
  docs tasks. A new `figure-verifier` agent grades figures by the register's method.
- Two skills change. `cairn-figure` holds the production path for figures, and the writing-voice
  skill gains an author-facing prose section holding the brief-first, one-section-per-read protocol.

## Where each piece lives

Applying the charter's premise check divides this standard between two owners. A plan must not treat
the second half as cairn work. The split runs like this:

- **Cairn's, and gradeable by this repository's gate.** The corpus entries and their manifest, the
  page-type registry with its outcome record and its rulings file, the templates, the brief files,
  and the fact ledgers. The five new scripts,
  the Cairn Vale rules with their fixtures, markdownlint, the link-rot routine, and every published
  page.
- **The workstation's, and an owner action rather than a cairn task.** The measurement instrument as
  a shared definition, the tell scanner and every new measure in it, and the review protocol. The
  writing-voice output style, the voice files, the skills, the review agents, and the global
  `CLAUDE.md`.

Every workstation item would serve ecxc-ski, 907-life, aksailingclub-org, cairn-pub, and Topo on
identical terms. The authoring charter at `~/.claude/docs/authoring-charter.md` is already their
umbrella. cairn's pass chain grades a task by `git diff` plus `npm test`, and neither reaches any of
them. Two consequences follow.

Unit 3c below carries the workstation half. It runs in the main loop rather than through the repo
chain, and it is graded by the workstation's own budget hook and poplar's `make check` rather than
by cairn's gate. The new scanner measures ship behind a docs-register profile that is off outside
docs paths, so cairn's bands never reach a site's own content.

## Decisions adopted

Decisions 1 through 11 are approved as the proposal states them. Decisions 12 through 14 record the
owner's directions of 2026-09-08, given after that approval. Small means a file or two, under a
quarter million tokens. Medium means a script or a tuned package, under two million tokens. Large
means more.

| # | Decision | Size | Unit |
|---|---|---|---|
| 1 | Adopt the Federal Plain Language Guidelines, 2011 revision, as the prose standard, and vendor the PDF | small | 3b |
| 2 | Hold the paragraph numbers and the 40-word ceiling as gated rules, and the average sentence length as a reported measurement that never gates; ceiling level pending owner decision 1 | small | 3b |
| 3 | Add a Cairn rule that fails a sentence over 25 words on the admin and editors tracks | small for the rule; the clearing work depends on owner decision 1 | 3b, then 5 |
| 4 | Adopt the three structure levels, the page types with their section orders, and the outline-first review | small | 3a |
| 4a | Write the templates and the two new structure scripts | medium | 3a |
| 5 | Adopt the two figure tests and the two-lane routing rule, and commit the figure source and script | small | 3b |
| 5a | Author `check:figures` with the seven assertions and close the `check:visuals` hole | medium | 3b |
| 6 | Take the concept figure off `docs/why-cairn.md` and move the ownership map to `docs/extend/architecture.md` | small | 5 |
| 7 | Approve the corpus entries, or name the ones to swap | small | 2, owner action |
| 8 | Adopt the review chain and its severity contract | small | 3b |
| 8a | Write `check:provenance` and `check:prose-read` | check:prose-read medium; check:provenance medium for the script, plus the per-page cost carried in unit 5 | 3b |
| 9 | Adopt the reader test for the front door and the task guides | small in tokens; the sitting count is owner decision 4 | 5, owner action |
| 10 | Approve the Claude setup changes as listed | small; the scanner change is about 285 lines | 3c |
| 11 | Approve the `add-a-custom-admin-screen.md` demonstration before the rewrite is planned | small | 4 |
| 12 | Rebuild each page rather than edit it, with reference entries the one exception (owner direction 2026-09-08) | small as a rule; its cost sits in unit 5 | 5 |
| 13 | Harvest each track's facts into a ledger before any brief is written, and keep drafters out of the page they replace (owner direction 2026-09-08) | large, 2.0 to 4.5 million tokens | 1 |
| 14 | Ship the work as **plan one; pass 2a; five per-track stages**: plan one, the Claude infrastructure, in the dotfiles and poplar repositories; pass 2a, the toolset and the demonstration page, in cairn; then five stages, each one pass with its own plan, worktree, pull request, and ceiling, each authored only after the previous stage's tuning checkpoint (owner direction 2026-09-08, amended twice on 2026-09-08, first when unit 3c moved out of cairn and again when the rewrite became five staged passes) | small | Implementation |

## Compatibility

The standard lands on a documentation set that does not meet it. Three compatibility rules keep the
gates from failing the build on day one:

- A new rule ships at warning level. It moves to error only after every existing violation in the
  tracks it covers is cleared.
- Both vendored packages stay unedited and pinned. Every cairn rule lives under
  `.vale/styles/Cairn/` and sets its own level.
- Vale's rule mechanics differ between the pinned CI version and the workstation version. Every rule
  file must ship with a fixture that fires, and CI's pinned version governs any disagreement.

`check:anatomy`, `check:headings`, `check:provenance`, and `check:prose-read` each gate only the
paths their unit has already brought into compliance. A gate that would fail an untouched track must
scope itself to the tracks that unit rebuilt. Each scope must then widen as later units land, and
unit 5 removes the last exclusion. A plan that adds a scope exclusion must name the unit that
removes it again.

Two further rules govern the rewrite's blast radius. Measured on the working tree at 2026-09-08, the
published set carries 432 intra-docs anchor links and 99 references to published doc paths from
`src/`, `README.md`, and `package.json`. Both numbers are what a fresh draft puts at risk.

- **Anchors.** Each track ledger carries a per-page anchor map, old heading to new heading or to
  retired. A page is rebuilt and its inbound links repaired in the same task, so the branch is green
  after each task rather than after each track. `check:docs` and `check:readiness` are the gates
  that prove it.
- **Renames and redirects.** A published page's path is stable unless the owner approves the rename.
  An approved rename leaves a stub page at the old path linking to the new one for one minor
  version. A markdown tarball has no redirect mechanism, and readers arrive from search, from the
  admin's help link, and from npm.
- **cairn.pub.** That site renders the doc arms from its installed engine version, so a rebuild on a
  branch stays invisible to the live docs until a release and a pin bump. A rename or removal breaks
  its navigation at the bump. The pub repo gets a consultation before the first track merges.

## Implementation

**Plan one, then pass 2a, then five per-track stages.** Decision row 14 records the split. It
supersedes the earlier two-plan shape, the 1a/1b concurrent-document structure that shape carried,
and the single plan three the previous revision named.

**Plan one, the Claude infrastructure.** Unit 3c alone, run in the owner's `~/.dotfiles` and
`~/Projects/poplar` repositories rather than in cairn. It moved out because cairn's implementer chain
grades a task by `git diff` plus `npm test` and neither reaches `~/.claude/`, `~/.dotfiles/`, or
`~/Projects/poplar/`, so the work moved rather than shrinking to a brief.

**Pass 2a, the toolset and the demonstration page.** Units 2, 3a, 3b, and 4 in full, plus unit 1's
ledger schema, its harvest tool, its drafting-dispatch fragment, and the harvest of the one page unit
4 rebuilds. One plan document with several chains, which is the shape
`~/.claude/workflows/pass-execute-chains.js` takes. The 1a/1b split is withdrawn. Units 1, 2, and 3
are genuinely independent, share no file, and consume nothing from one another; the only real edge is
unit 4, which joins them. Every artifact two chains would otherwise both create is built in a
preflight chain on `main` before any chain branches, so the contended set reduces to `package.json`,
the CI workflow, and the records the closing chain writes. The pass closes with the baseline record
and the first tuning checkpoint.

**Five stages, the harvest and the rewrite together.** Unit 1's four remaining track harvests and all
of unit 5, as **five passes, one per track**, each with its own plan document, worktree, pull
request, and ceiling. Each stage's plan is authored **only after the previous stage's tuning
checkpoint**, against the tooling that checkpoint amended, so no stage inherits a schema, a template,
or a threshold that the previous stage's evidence has already contradicted. Never one long-lived
rebuild branch, and never one plan spanning two tracks.

The order is by **difficulty of writing the track well**, easiest first, so the tooling is tuned where
the writing risk is lowest:

| Stage | Track | Pages | Why it sits here |
|---|---|---|---|
| 1 | reference | 24 | The shape is fixed by `check:reference` and `check:reference:signatures`, the prose is a sentence or two per entry, and the pages are edited in place, so the stage proves the harvest and the brief on real pages at the lowest writing risk. |
| 2 | extend | 30 | The developer register the drafter is most fluent in, with the facts heavily gated by `check:snippets` and `check:reference:signatures`. |
| 3 | admin | 8 | An operator reader between the developer and the editor, with the transcripts fixture-gated by `check:transcripts`. |
| 4 | editors | 7 | Hardest to write: a non-technical reader, the Microsoft register, and plain-language demands the gates see only partly, so the reader test is the judge. |
| 5 | front door | 7 | Last: the page set whose rejection produced this initiative, under the strictest register ruling, with every claim traced to the owner brief. It meets the system after four stages of tuning. |

The five partition the 76 published pages. Each track's `README.md` sits in stage 5 with the other
index and evaluator pages, because the front-door stage rewrites the whole index layer together.

Each stage runs seven steps in order: harvest the track against the amended ledger schema; the
owner's unverified-claim rulings for that track, one sitting, batched with that stage's other owner
items; rewrite the track's pages from briefs against the ledger, under the quarantine; the coverage
diff per page; the fresh review; the reader test for that stage's pages; then the tuning checkpoint.

### The tuning checkpoint

Defined here once. Every stage's plan references this definition rather than restating it, so there
is one copy to amend. Pass 2a runs it too, as the stage-zero checkpoint.

1. **The registry review**, per the registry lifecycle above. The close of every stage is a review
   trigger.
2. **The questions log, rolled up.** Every question the owner, an agent, or a reviewer had to ask
   about a page during the stage, rolled up per page type into `docs/internal/page-types.md`.
3. **The reviewer-miss feedback, rolled up per template.** What the fresh reviewer changed on each
   drafted page, each miss attributed to the template or to the subject.
4. **The gates' thresholds and the Vale rules, revised where the stage's evidence says so.** A rule
   that fired only on true findings may tighten; a rule whose findings the stage overrode every time
   loosens or comes out. The override count is the evidence.
5. **The ledger schema and the brief schema, amended where the harvest or the drafting showed a
   gap**, each amendment carrying a **migration note** stating what earlier ledgers and briefs now
   lack and whether they are backfilled or left as they are.
6. **The templates, revised** where the reviewer misses or the outline-review failures cluster on one
   section.
7. **A one-page record** at `docs/internal/record/docs-rebuild/stage-<n>-tuning.md`, stating what
   changed, why, and which of the stage's evidence produced it.

### Gauging and iterating

How the initiative measures whether the tuning is working. Every stage plan references this
subsection. It is internal and not prose-graded.

**Baselines** come from the demonstration page in pass 2a, recorded in
`docs/internal/record/docs-rebuild/baseline.md`.

**Per-page measures, the same set at every stage:** loops to first accept, counting implementer and
fresh-reviewer rounds; reviewer misses counted by cause, one of `template`, `subject`, or `register`;
coverage-diff misses against the ledger; questions anyone had to ask about the page during the stage;
the reader-test outcome where one was run; and the tokens and owner sittings the page cost.

**The lever map, one lever per measure:**

| Measure | Lever |
|---|---|
| Template-cause reviewer misses | Move the template. |
| Subject-cause reviewer misses | Move the ledger schema, or the brief's `needs` list. |
| Register-cause reviewer misses | Move the drafting-dispatch fragment, or the corpus entry. |
| Coverage-diff misses | Move the harvest task shape, or the ledger's definition of proven. |
| A rising loop count with no dominant cause | **Stop and read.** This is not a tuning signal. |

**The stage record format.** `stage-<n>-tuning.md` carries the per-page table beside the baseline,
the lever pulled with its reason, and **the prediction**: what the next stage's numbers show if the
pull was right. The following stage's record confirms or refutes it.

**Stop rules.** The tooling counts as **tuned** when a stage's pages accept in one loop at or under
the baseline miss rate; later stages then skip the checkpoint's tooling revisions and keep only the
registry review and the records. A stage is **re-run rather than tuned** when its coverage diff shows
the harvest lost facts, the threshold being any `unverified` claim that reached a published page.

The registry lifecycle's outcome record draws its per-type numbers from these stage records, so the
two are one measurement rather than two.

### Sequencing constraints

Two sit outside this spec. Polish-C, the breaking window, renames and removes
across 267 tracked files outside the write-once archives (measured over `git ls-files` for the
twenty-five identifiers it renames or removes, 464 including those archives) and four sites' route
files, and every rename invalidates ledger entries in
exactly the class the ledger exists to guarantee. **Polish-C must land entirely before the first
stage's harvest branches.** It does not gate pass 2a, whose only harvest is the one demonstration
page and whose purpose there is to break the schema, not to hold a track's facts; that page's entries
are re-derived at the extend stage. By the same rule, **every stage re-derives its track's pages at
its own sha**, so page edits from the identity-seam and chassis passes are harvested as they stand
rather than tracked.

And `check:figures`, its script under `scripts/figures/`, and the figure assets are uncommitted
working-tree state that no pass owns (amended 2026-09-08 evening, above), so this initiative builds
them itself and no chain waits on them. **`check:figures` must land with its seven assertions before
any figure is graded**, which is the extend stage, the first stage with a figure to grade; pass 2a
takes that work instead only if it has landed on `main` by its second invocation for another reason.

### Sizing

| Unit | Tokens | Attended sittings |
|---|---|---|
| 1, harvest | 2.0 to 4.5M | 2 to 4 |
| 2, corpus | 0.3 to 0.6M | 1 to 3 |
| 3a and 3b, rules and gates | 2.5 to 4.5M | 2 to 4 |
| 3c, Claude setup | 0.3 to 0.6M | 1 to 2 |
| 4, demonstration page | 0.3 to 0.5M | 1 to 2 |
| 5, the rewrite | 8 to 12M | 40 to 75 |
| **Total** | **13.4 to 22.7M** | **47 to 90** |

These figures roughly double the six-to-nine-million estimate the proposal's cost review gave, for
two reasons. That estimate sized the rewrite alone and counted nothing ahead of it, and the four
units ahead add five to ten million. And it counted only the reader-test sittings, where the
unverified list, the corpus approvals, the `CLAUDE.md` taste calls, and the demonstration read add
seven to fifteen more. Each unit's owner decisions batch into one scheduled sitting at that unit's
checkpoint.

### Unit 1: the fact harvest

Harvest every claim the published pages make into a fact ledger, one track at a time: reference,
extend, admin, editors, and the front door. Each track's ledger is one file at
`docs/internal/record/docs-rebuild/<track>-facts.md`. That path carries no date, so a stage can
resolve it months later.

**The unit splits across the passes.** Pass 2a builds the ledger schema, `check:fact-coverage`, the
drafting-dispatch fragment, and the ledger for the one page unit 4 rebuilds, which exists to break
the schema before a track is harvested against it. **Each track's harvest is then its own stage's
first work**, against the schema the previous stage's tuning checkpoint amended. No pass harvests a
track it does not also rewrite.

**Claim granularity.** One entry per checkable proposition: a statement that could be false and
whose falseness a reader would act on. Version numbers, counts, paths, export names, defaults,
behaviors, and promises about who does what all qualify. Transitions, motivation, and restatements
do not. A proposition is sentence-level, recorded in a normalized form under fifteen words rather
than as a lifted sentence, so the ledger does not become the old prose delivered one line at a time.

**Proven.** An entry is proven when it points at one of: a code path with its `file:line` and the
commit sha, a config key, a wrangler or Cloudflare record, a recorded test fixture, or a line in an
owner brief. **A published page is never a proving source**, which is the circularity that let the
front door assert a workflow that never happened. Verdict tiers: `gate` (an existing gate or fixture
asserts it, named), `read` (an agent read it, with `file:line` and sha), `owner` (an owner brief
line), and `unverified`. An `unverified` entry must not enter any brief.

**Ids.** An id is `<track>-NNNN`, monotonic and unique within its file. Ids are never reused.
Retired entries stay as tombstones.

**Keep entries.** A drafter who never opens the old page loses more than claims, so five further
entry classes are harvested per page and cited in the brief's `keep` list:

- **Anchors** that the readiness and link gates depend on, and every heading slug with an inbound
  link, as the anchor map the Compatibility section requires.
- **Vale suppressions** with the comment that states why each is right.
- **Recorded deviations** the page carries locally.
- **Ratified specimens**, sentences the owner approved verbatim, such as the why-cairn opener.
- **Deliberate omissions**, most importantly the vendor-link rule, whose signal is what a page did
  not restate.
- **Reader-tested editor glosses**, the editors track's banned-vocabulary substitutions.

A gated block is its own entry kind. Its entry carries the fence verbatim, its language tag, its
marker comment, and the fixture path its gate replays against. A verbatim code fence is the one
exception to the no-old-prose rule, because a fence is not prose.

**The quarantine and the coverage diff.** The drafting agent reads the ledger and the page type's
exemplar, and does not open the page it replaces. The quarantine holds; the coverage diff at chain
step 8 closes the hole it leaves. A separate agent, never the drafter, compares the drafted page's
claims against the ledger after the draft exists and reports every entry the page dropped.

**The roadmap row.** `ROADMAP.md`'s "Toward 1.0" carries the docs claims-verification audit (Geoff,
2026-08-02), an adversarial sweep tracing every factual claim to the code, recorded to run after
`beta.1`. This harvest is that sweep with a ledger format attached, and it absorbs the row. Whether
the after-`beta.1` sequencing still stands is owner decision 5.

Acceptance criteria:

- Every published page has a ledger entry for every extractable fact token it contains (version,
  path, export name, numeral, config key), checked by script rather than asserted.
- Every ledger entry carries an id matching `^<track>-\d{4}$`, the normalized claim, the old file and
  line, and either a verdict tier with its proving source or the `unverified` tier.
- Every gated block in the published set has an entry carrying the fence verbatim and its fixture
  path.
- Every page has an anchor map and the five keep classes harvested.
- Every published page has a page type assigned, recorded in
  `docs/internal/record/docs-rebuild/page-types.md`. Pass 2a enumerates every page there and assigns
  the demonstration page's type; **each stage assigns its own track's types at its harvest**, since
  the harvest is the only work that reads the pages and since a type fixed before the registry has
  been tuned would be re-derived anyway.
- A `check:ledger` script re-resolves every `read` entry's `file:line` and fails when the path is
  gone.
- This unit commits a drafting-dispatch prompt fragment carrying the quarantine and the readable-file
  list, in pass 2a, so every stage's dispatches inherit it.

### Unit 2: the corpus

Assemble `docs/internal/corpus/` and its manifest. Fetch one or two excerpts per page type from the
sources the proposal names, each at most 400 words, each with its source, license, and fetch date.
Mark the table-shaped entries structure-only and the redistribution-blocked ones reference-only.
Measure every entry with `scripts/checks/measure-prose.mjs` and record the numbers in the manifest.
Choose the second editors entry by hand, since automated reads are blocked. Present the assembled set
to the owner for approval.

Acceptance criteria:

- `docs/internal/corpus/` holds at least one entry per page type in the registry, and at most two.
- The manifest carries source, license, fetch date, page type, track, measured numbers, and an
  approval column for every entry.
- Every committed entry is at most 400 words and carries a `## Source` section in the shape of
  [`corpus-sample-sqlite.md`](../../internal/record/2026-09-08-polish-inputs/corpus-sample-sqlite.md).
- Every table-shaped entry is marked structure-only, and every entry whose license blocks
  redistribution is marked reference-only with its numbers and no excerpt.
- The three existing samples are migrated into the corpus directory or superseded, and the record
  directory keeps no second copy.
- `check:anatomy` refuses a brief naming an entry whose manifest approval column is empty.

### Unit 3a: the structure gates

The brief format and its parser, the nine page templates, `check:anatomy`,
`check:headings` with its
verb lexicon, markdownlint, and the CI wiring. Roughly six tasks. This is what unit 4 needs to prove
the shape.

Acceptance criteria:

- `docs/<track>/<page>.brief.yml` has a published schema, a parser, and one worked brief.
- `docs/internal/templates/` holds one template per page type, each carrying that type's section
  order from this spec, with each heading marked required or optional. The reference-entry template
  is derived from the shape `check:reference` already fixes.
- `check:anatomy` reads the templates as its only source, fails a page with a missing or unparseable
  brief first, then fails missing or out-of-order required headings.
- `check:headings` holds the seven rules numbered above, with rules 5 and 6 against the committed
  verb lexicon at warning level, and a fixture per rule.
- Markdownlint runs with its stock rules and `check:headings` reimplements none of them.
- Both gates are scoped to published paths and wired into `package.json` and CI.
- The registry's two front-door types each get their own template, and `check:anatomy` is extended to
  reach the root `README.md`, which sits outside `docs/`. The registry is nine types and nine
  templates, fixed before this unit starts rather than split inside it.
- `docs/internal/page-types.md` carries one row per type with the outcome-record columns, and
  `docs/internal/page-type-rulings.md` exists with its header, so the registry lifecycle has a
  record to write into from the first review onward, and so every stage's checkpoint writes into the
  same two files.

### Unit 3b: the receipt and provenance gates

`check:provenance`, `check:prose-read`, the Vale rules with their must-fire fixtures, the vendored
guidelines PDF, `check:figures`' seven assertions, and the `check:visuals` alt-attribute hole.
Roughly six tasks. It can land while unit 4 runs.

Acceptance criteria:

- The 2011 guidelines PDF is vendored and referenced from the register.
- `check:provenance` fails an unclassified sentence, an unresolved id, and a machine-extractable fact
  no cited entry carries, and passes a fully classified page. A fixture reproduces the front-door
  failure case.
- `check:prose-read` fails a published page whose receipt is missing or stale, in the receipt
  mechanism owner decision 3 settles.
- `check:figures` runs the seven mechanical assertions, and `check:visuals` fails an image with no
  alt attribute.
- Every new or changed Vale rule ships a fixture that fires, and the fixture suite runs on every CI
  run against the pinned binary.
- The external link-rot routine is scheduled and reports rather than fails.
- Every new gate is wired into `package.json` and into CI, scoped per the Compatibility section.
- The register records the standard and points at this spec.

### Unit 3c: the workstation setup

The seven Claude setup pieces, one of which is the tellgrader change, all outside this repository. Run
as a dotfiles pass in the main loop, not through cairn's implementer chain, and not graded by cairn's
gate. Roughly three to four tasks.

Acceptance criteria:

- The output style, the voice files, the review agents, the two skills, and the Vale hook change as
  the Claude setup section lists.
- The scanner's new measures ship behind a docs-register profile and do not fire on site content,
  proved by a fixture.
- Both `CLAUDE.md` files stay within the workstation's budget hook, with the four displaced lines
  chosen by the owner.
- The tellgrader change clears poplar's own `make check`.

### Unit 4: the demonstration page

Rebuild `docs/extend/add-a-custom-admin-screen.md` through the full review chain, against its
task-guide corpus entry. The page measures 76 percent hinged pairs, the worst figure in the extend
track. Harvest that one page as the harvest chain's first task, so the demonstration exercises the
ledger schema before the full harvest commits to it.

Acceptance criteria:

- The page has a brief file, an outline reviewed before its prose, a coverage diff, and a receipt.
- Every gate from units 3a and 3b passes on the page.
- The fresh reviewer's report names the corpus entry and carries the measurement table.
- The reader test has run on the page, one sitting, and its result is in the receipt.
- The page was drafted one section per read, recorded in the dispatch.
- The registry lifecycle's first review has run against that measured template cost, its row is in
  `docs/internal/page-types.md`, and its ruling is in `docs/internal/page-type-rulings.md`.
- The comparison artifact exists: the rebuilt page beside the original, with the measured token and
  sitting cost of one page end to end. The owner's read and approval to proceed is the plan's
  closing gate rather than a task criterion.

### Unit 5: the rewrite

Rebuild the published pages against the standard, as decision 12 directs. For each page, Claude
writes the brief file and the outline from the track's fact ledger, then drafts fresh against the
page type's exemplar, under the quarantine unit 1 sets. The brief's `needs` list cites ledger entries
by id, `check:provenance` resolves every claim on the drafted page, and the coverage diff reports
what the page dropped. The existing block gates prove that each carried snippet, signature, and
transcript still holds.

**The unit runs as the five stages, in the order the Implementation section fixes**, easiest track to
write first: reference, extend, admin, editors, then the front door. `docs/why-cairn.md` is the
**last** page set rather than the first. An earlier revision made it first, on the ground that its
author brief already exists as the source `check:provenance` resolves against. That advantage is
real and it is not the binding constraint: the front door is the hardest thing in the set to write,
it is the page whose rejection produced this initiative, and it carries the strictest register
ruling, so it should meet the standard after four stages have tuned it rather than while the tooling
is still being corrected. Polish-D's front-door task moves into stage five rather than being authored
twice. Polish-D's substrate commit and its figure and form tasks stay where they are, and its
`docs/README.md` route-order item becomes an index-page question this standard governs, answered in
the same stage.

**Polish-B folds here except its code half.** Tasks 2, 8, and 9 and the `check:reference` change in
task 5 stay in polish-B, which merges before the harvest branches. Its D1 through D30 and F7 through
F10 prose findings become authoritative ledger input. The harvest records the true claim with its
proving source and marks the old page's claim superseded. Then the rebuild emits the corrected page
once, instead of editing a page and rebuilding it afterwards.

**Amendment 2026-09-08 (evening), from the polish spec revision 4 fold.** Three sentences above are
superseded by Geoff's rulings of that evening, recorded in
`docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 4. First, "Polish-B folds here
except its code half. Tasks 2, 8, and 9 and the `check:reference` change in task 5 stay in polish-B,
which merges before the harvest branches" no longer holds, because polish-B dissolved and polish-A
split into slices 11a and 11b. Task 8's custom-screen example is polish-C's task 1; task 9's records
work is 11a's and 11b's own records tasks; task 2's doctor-transcript re-record is 11a's task 6,
returned to polish because this unit harvests a gated block's fence verbatim against the fixture its
gate replays and never re-records one. Only the `check:reference` `## Types` assertion (F7) stays
deferred here, and it is a gate change stage one makes while it rebuilds the thirteen reference
pages the ordering edit would otherwise touch twice. The prose findings still bank as ledger input,
with four qualifications the polish spec states: D11, D12, and D1 bank their docs halves only, D21's
sentence is removed at stage five, D16 is moot, and A29 is not banked at all. Second, "Polish-D's
substrate commit and its figure and form tasks stay where they are" no longer holds. There is no
substrate commit. The figure assets, `scripts/figures/`, and `check:figures` stay uncommitted
working-tree files that no pass owns, so "that work must land on `main` before pass 2a's preflight"
at `:871-875` is withdrawn and this initiative produces its own figures in its own stages, with
`check:figures` and its assets arriving as stage work rather than as an inherited precondition.
Wherever this spec elsewhere states that `check:figures` grows from an existing check (`:500`,
`:543`, `:632`, `:710`, `:1024`, `:1035`, `:1156`), the stage that first needs it authors it
instead, and its `npm test` membership claim holds from that stage on, not before.
Third, pass 2a's chain D is ordered after polish-C merges, because chain D rebuilds
`docs/extend/add-a-custom-admin-screen.md` and polish-C's task 1 rewrites the same page to drop
`OfficeList`; a rebuild from a pre-polish-C ledger would re-teach a removed export and turn
`check:snippets` red on `main` after the release is cut.

Reference entries under `docs/reference/` are the named exception, and they are edited in place. They
are also stage one, because a fixed shape under the signature gate and a sentence or two of prose per
entry is the least demanding writing in the set, which is what makes the track the right place to
prove the harvest, the brief, and the coverage diff on real pages. The
signature gate already fixes their shape, so the structural risk the rebuild answers does not reach
them. The prose around each signature is small enough that an edit reaches the same result for less
work. Each reference page's brief records the exception and its reason.

The unit runs one track at a time, one worktree, one pull request, and one plan per track, and each
stage closes with its tuning checkpoint. Every page in a
track has its outline read against its type before a paragraph of that track is drafted. The unit
carries decision 6, split across two stages, since the ownership map lands on
`docs/extend/architecture.md` in stage two and the concept figure comes off `docs/why-cairn.md` in
stage five; and, depending on owner decision 1, decision 3's clearing work, which lands in the
editors and admin stages where those tracks are rewritten.

Acceptance criteria:

- Every published page has a track, a page type, a brief file, and a receipt.
- Every published page outside `docs/reference/` was drafted fresh against its exemplar under the
  quarantine, one section per read, its dispatch id recorded in the receipt, and its brief cites the
  ledger entries by id.
- Every page under `docs/reference/` was edited in place, and the exception is recorded in each
  brief.
- The coverage diff has run on every rebuilt page and every reported miss is resolved or recorded.
- The full `npm test` gate passes, which includes `check:snippets`, `check:reference`,
  `check:reference:signatures`, `check:transcripts` with its per-page block floors,
  `check:editor-quotes`, `check:symbols`, `check:arm-indexes`, `check:visuals`,
  `check:prose`, and `check:docs`, plus `check:figures` from unit 5a on.
- `check:anatomy`, `check:headings`, `check:provenance`, and `check:prose-read` pass across the whole
  published set, with no path-scoped exclusions left from the Compatibility section.
- Every anchor in each track's anchor map either survives or has its inbound links repaired in the
  same task, and every approved rename leaves a stub.
- The concept figure is off `docs/why-cairn.md` and the ownership map is on
  `docs/extend/architecture.md`.
- The reader test has run on the pages owner decision 4 names, with each result in that page's
  receipt. Its nine sittings are allocated one to the demonstration page and eight across the stages,
  weighted to where the reader is furthest from the writer: editors three, front door three, extend
  one, admin one, reference none.
- `ROADMAP.md`'s claims-verification row is marked done and removed at the fifth stage, not before,
  since the row is complete only when every track's claims are verified, and
  `docs/internal/docs-friction-log.md` is triaged for entries this standard resolves.
- Every stage closed with a tuning checkpoint whose record is
  `docs/internal/record/docs-rebuild/stage-<n>-tuning.md`, and each record's prediction was confirmed
  or refuted by the next stage's record.

### What plan one hands pass 2a

Three artifacts, all outside this repository, which pass 2a's preflight verifies by name and
records as present or absent. A missing one degrades a named criterion in 2a rather than
stopping it:

1. The **tellgrader docs-register profile**: the profile flag accepted by the installed binary and
   the `MEASURES.md` definition file readable beside the scanner.
2. The **Vale hook's path-grading change**, so an on-save run grades an editor-track page under
   Microsoft and every other published page under Google.
3. The **two changed skills**: `cairn-figure`'s figure production path and the `writing-voice`
   skill's author-facing prose section.

Plan one's own record also carries the four setup pieces pass 2a does not verify: the output style,
the voice files, the review agents, and the global `CLAUDE.md`.

### What pass 2a hands stage one

Stage one cannot be authored until all nine exist at fixed paths. These are 2a's closing criteria.
**The five ledgers and the page-type assignment for un-harvested tracks are not on this list**: 2a
harvests one page, and each stage harvests its own track.

1. `docs/internal/corpus/` and its manifest, approval column filled, every registry type covered by
   an approved or reference-only entry.
2. `docs/internal/templates/`, the nine page templates, each heading marked required or optional, as
   the checkpoint amended them.
3. The brief schema, its parser, and one worked brief, as the checkpoint amended them.
4. The ledger schema at `docs/internal/record/docs-rebuild/ledger-schema.md`, as the checkpoint
   amended it and with its migration note, plus `check:fact-coverage` and the one harvested page as
   the worked example a stage's harvest copies.
5. The gate estate, wired into `package.json` and CI, each gate with its scope and the named stage
   that removes each relaxation.
6. The Vale rules with their must-fire fixtures, verified on the CI-pinned binary.
7. The drafting-dispatch prompt fragment carrying the quarantine and the readable-file list.
8. The demonstration page's measured cost in tokens and sittings, at
   `docs/internal/record/docs-rebuild/demonstration-cost.md`, which is what sizes stage one.
9. The baseline at `docs/internal/record/docs-rebuild/baseline.md` and the stage-zero tuning record
   at `docs/internal/record/docs-rebuild/stage-0-tuning.md`, carrying the measure set, the lever map,
   the stop rules, and the prediction stage one's record confirms or refutes.

### What each stage hands the next

Three artifacts, plus everything in the list above:

1. Its track's ledger at `docs/internal/record/docs-rebuild/<track>-facts.md`, complete, with its
   anchor maps, keep classes, gated blocks, and the owner's rulings on its unverified entries
   applied.
2. Its tuning record at `docs/internal/record/docs-rebuild/stage-<n>-tuning.md`, with the per-page
   measures beside the baseline, the lever pulled, and the prediction.
3. The amended ledger schema and brief schema, each amendment carrying its migration note.

A stage's plan is authored against those three and against 2a's hand-off, never against 2a's
hand-off alone.

## Risks

- **Fact loss in the rewrite.** A fresh draft can drop a fact the old page carried. The ledger
  accounts for every claim before any brief is written, and the outline review checks the cited ids
  against the outline. The block gates catch a dropped snippet, signature, or transcript.
  `check:provenance` catches a claim resolving to no entry, and the coverage diff catches an entry
  the page dropped. What remains uncovered is a claim the harvest never recorded, which is why unit
  1's first criterion is machine-checked rather than asserted.
- **The measurement instrument is unsettled.** It moved twice during the proposal, and each move
  changed the numbers by more than the width of the human band. No cadence number may become a gate
  until the definition in `measure-prose.mjs` is fixed and a track has twenty documents and three
  hundred sentences behind its band.
- **The hinge count is gameable, and it is published.** Parentheses carry the same qualification and
  count as nothing. Dropping the comma before "and" removes a hinge from the count and not from the
  prose. Splitting a pair into two sentences lowers the hinge share and raises the short-sentence
  share, which produces the staccato the register's front-door voice ruling bans. The count is a
  locator, never a score, and a reviewer must not return a fix verdict whose only support is a
  non-gating measurement.
- **A Vale rule that enforces nothing.** A rule written as a section override can silently disable
  itself on the pinned CI version. The must-fire fixture is the only control, and it runs on every CI
  run.
- **The attended cost.** Forty to seventy-five sittings sit in unit 5 alone, and owner decision 4
  sets the count. A plan that does not schedule them stalls at its last acceptance criterion.
- **The stages are large in total.** Eight to twelve million tokens across five stage plans by the
  earlier estimate. Size each stage from the previous stage's record and the demonstration page's
  measured cost before authoring it, never from this estimate.
- **Templates and gates drifting apart.** Two copies of a section order will diverge. `check:anatomy`
  reads the templates as its only source, which unit 3a's criteria require.
- **The registry may lack a type a page needs.** A glossary, a migration guide, a release-notes page
  or an FAQ has no type here, and the rule forbids writing a page whose type has no exemplar. The
  escape is a brief-recorded deviation naming the nearest type, pending an owner-approved registry
  addition with its exemplar. A brief that cannot name a type is a review trigger under the registry
  lifecycle, so the gap is recorded and ruled on rather than absorbed silently.

## Owner decisions

Seven decisions the reviews raise are the owner's, not the implementer's. Each recommendation below
is the conductor's, and none is taken. No unit blocks on them, but three change what a unit builds.

| # | Decision | Options | Reviewers' evidence | Conductor's recommendation |
|---|---|---|---|---|
| 1 | Sentence-length gate level: decision 3's 25-word ceiling on admin and editors, and the 40-word ceiling | Error after clearing 196 sentences, or warning permanently | Benchmark: GitLab and Red Hat both run sentence length at suggestion, and no surveyed program gates a length number. Conformance: both banked exemplars fail a gated rule, the KEP at 44 words and both at the paragraph floor. Charter: the spec's own non-goals say rewriting to a length number does not improve comprehension, which contradicts buying 196 rewrites | Warning permanently, no promotion path; drop the 196-sentence clearing; keep the paragraph ceiling at error |
| 2 | Page-type count | Keep eleven, or collapse to about six | Benchmark: Kubernetes runs four types over a thousand-plus pages, Microsoft five, Red Hat three; eleven for 75 pages is roughly four times the field ratio. Plannability: eleven templates will not fit one dispatch and drive unit 3's task count | **Resolved 2026-09-08. The registry is nine types.** See the resolution below |
| 3 | Receipt mechanism | Per-page committed receipt verified by content hash, or a pull-request artifact plus one ledger row per page | Benchmark: no surveyed program commits a per-page review artifact; Microsoft's nearest analogue lives in the PR check. Charter: a hash gate makes a typo fix unmergeable by a contributor who cannot run a reader test, and a receipt beside a published page ships in the npm tarball. Plannability: no hash algorithm, normalization, path, or staleness policy is specified | PR artifact plus one row per page in a docs ledger, gate failing only on a missing row; if the file form is kept, hash prose only and define fresh, prose-stale, and structure-stale |
| 4 | Reader-test sittings | Forty, one per task guide and the front door, or nine with a next-rewrite trigger | Benchmark: DigitalOcean's precedent is paid staff editors, and Kubernetes gets volunteers; cairn has one owner. Charter and plannability: the spec predicts its own stall at this criterion, and the sitting total reaches 47 to 90 across the initiative | Nine: the front door, the track index pages, and the six highest-traffic task guides, with the rest triggered by the next substantive rewrite |
| 5 | Harvest sequencing against the roadmap | Honor the ratified after-`beta.1` sequencing, or overrule it and run the harvest with plan one | Charter: `ROADMAP.md` records the claims-verification audit as running after `beta.1` so its inputs exist, and as a blocking gate before `1.0.0`; the spec plans it first without citing the row. Plannability: polish-C's renames invalidate ledger entries wholesale | Absorb the row and run the harvest when plan one runs, recording the overrule with its reason; polish-C lands entirely first |
| 6 | Rendered docs preview per branch | Add one, or defer | Benchmark: Kubernetes reviews on Netlify previews and its checklist names the preview explicitly; Cloudflare builds one per commit; no step in cairn's chain reads a rendered page, which matters most for the figure rules. Against: cairn.pub renders from the installed tarball, so the docs already have a real renderer | Defer; revisit if the figure grading at unit 4 proves it needs one |
| 7 | Home for the new scanner measures | The workstation's tellgrader, or cairn's own scripts | Charter: the tell scanner is shared writing infrastructure every family repo would want on identical terms, and cairn's own bands must not reach site content, which `CLAUDE.md` holds in its personal voice. Plannability: a poplar change is graded by `make check`, which cairn's chain cannot see | tellgrader, behind a docs-register profile that is off outside docs paths |

Decided 2026-09-08: the owner accepted all seven recommendations as written. Plan one is
drafted on that basis, and decision 1 settles decision 2's ceiling clause at warning.

**Decision 2, resolved 2026-09-08.** The registry drops the internal proposal type, because internal
planning documents are not graded, and it folds the condition entry and the symptom row into the
reference entry as section shapes inside that type. Both front-door types stay. The reasoning is the
registry's own test: a registry entry is a whole-page shape with a published exemplar, so the count
is a consequence of that test rather than a lever to pull. The practice evidence points the same
way. Kubernetes runs four types, Microsoft five, Red Hat three, and Diátaxis four, so fewer types
demonstrably suffice, and no outcome evidence favors any particular count. That is why the count is
not fixed here for good: the registry lifecycle above maintains it on outcome, and its first review
runs at the demonstration page in pass 2a.

The ruling was given as ten types. The removals it enumerates resolve to nine, since the condition
entry and the symptom row are two registry rows rather than one. This spec records nine and adds no
type to reach the stated number, which is what "the count is a consequence" requires. The nine are
`task-guide`, `tutorial-milestone`, `concept`, `architecture-overview`, `reference-entry`,
`reference-table`, `index`, `front-door-evaluator`, and `front-door-track-index`.

## Open items

Four items are owed by the owner, and no unit that depends on one may start before it arrives:

- **The corpus approvals (decision 7).** The candidate entries are named in the proposal and none is
  approved. Unit 2 assembles them and unit 4 cannot draft against an unapproved entry. Consider a
  time-boxed default-to-accept window, since an unapproved entry blocks work rather than protecting
  anything.
- **The second editors corpus entry.** The Mozilla support articles block automated reads, so the
  entry must be chosen by hand and approved separately.
- **The demonstration read (decision 11).** The owner's read of the rebuilt page beside the original,
  and the approval that opens plan two.
- **The reader-test sittings (decision 9).** Scheduled inside unit 5 and unrun; owner decision 4 sets
  the count.

Two items are unresolved in the proposal and stay unresolved here. The hinged-pair definition in
`measure-prose.mjs` is fixed for now and no number built on it is a rule yet. The proposal's revision
8 has not been reader-tested, and the register grade of its revision 5 raised sixteen findings whose
answers are unverified.

One more sits with the register rather than with the owner. `docs-register.md` treats
`docs/README.md`, `docs/why-cairn.md`, and the root `README.md` as one front-door surface and
requires five routes in the first screenful, which one template cannot hold alongside an evaluator's
argument. The registry answers that with two front-door types, and unit 3a must state how
`check:anatomy` reaches a root `README.md` that sits outside `docs/`. The register's
2026-09-08 front-door voice ruling outranks the cadence report on that surface.

## Receipt

Measured with `scripts/checks/measure-prose.mjs` over everything above this section, with list items
included and then excluded. The exemplar columns measure the two corpus samples the same way, each
with `--until "## Source"`, and every comparison below is prose-only against prose-only. Vale ran
with the community Google-style package forced on, over a copy of everything above this section at a
path `.vale.ini` globs onto Google, since the specs directory is style-exempt. That package states in
its own README that it is neither maintained nor endorsed by Google, so it is a community port of the
guide rather than Google's own gate. The local binary is 3.20.0 and CI pins 3.15.1, so CI governs any
disagreement. Every cell below comes from script output.

| Measure | All sentences | Prose only | Go exemplar, prose only | KEP exemplar, prose only | Target | Status |
|---|---|---|---|---|---|---|
| Sentences | 612 | 337 | 17 | 10 | | count only |
| Average length | 14.5 words | 15.1 words | 22.1 words | 21.3 words | 15 to 20 | reported, at the floor |
| Longest sentence | 40 words | 40 words | 39 words | 44 words | under 40 | at the ceiling, not under it. The KEP exemplar exceeds it |
| Hinged pairs | 30 percent | 35 percent | 41 percent | 20 percent | reported, never gated | 6 points under the Go exemplar and 15 over the KEP. Step 5 reports it and nothing gates on it |
| Sentences under 8 words | 20 percent | 19 percent | 12 percent | 20 percent | reported | reported |
| Paragraphs | 103 | 103 | 8 | 6 | | count only |
| Paragraphs over 8 sentences or 150 words | 0 | 0 | 0 | 0 | 0 | pass |
| Paragraphs under 3 sentences, list lead-ins exempt | 0 | 0 | 6 | 3 | 0 | pass. Both exemplars fail it |
| Vale, community Google-style package forced | 0 errors, 43 warnings, 269 suggestions | | | | errors 0 | pass. The 43 warnings are `Google.OxfordComma` (17), `Google.WordListCase` (15), `Google.Will` (6), and `Google.Colons` (5), none of which this internal spec adopts for itself |
| Tell scanner findings | 0 | | | | 0 | pass, at 0 tells per thousand words and a cadence coefficient of variation of 1.31 |
| Tricolons the scanner counted | 13 | | | | each a real list | counted, not flagged; the scanner returned no finding |

Two of the numbers this spec adopts fail on its own named exemplars, and the receipt says so rather
than hiding it. KEP-2400's longest sentence is 44 words against the 40-word ceiling, and both
exemplars carry paragraphs under the three-sentence floor, six of eight and three of six. Those two
numbers are cairn's, not the genre's. A rule that the best human page in its genre would fail is
either the wrong rule or a rule that must ship at warning level, which is exactly what owner
decision 1 settles; unit 3b must ship both with fixtures recording the exemplar failures.
