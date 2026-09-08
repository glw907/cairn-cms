# A documentation standard for cairn

Revision 8, 2026-09-08, for Geoff's review. Revision 1 went through seven review lenses.
Revisions 2 to 6 went through the review chain this document proposes, and each revision
folds the findings. The reviews and research are the `proposal-review-*.md` and
`proposal-research-*.md` files in this directory. Revision 8 follows your read of revision 7. The
structure rules are now the largest part, since the front door failed at the outline before
it failed at the sentence. The figure rules shrink to what a page needs, and the document
takes the proposal shape it names for itself.

**Page brief.** Type: proposal, internal, in the Rust RFC and Kubernetes enhancement shape.
Reader: the project owner, deciding. This page needs: eleven decisions each with a size, the
evidence behind each, and a receipt that grades the page by its own rules. Deviation: the
heading "Summary" is one the tell scanner flags as a scaffold heading, and the proposal
template requires it, so it stays and the scanner's one finding is that heading.

## Summary

A documentation standard is the set of written rules a page must be drafted against and
checked against before it ships, the way the code has its conventions and its gates. A gate
is a check that fails the build. The standard proposed here covers cairn's published
documentation and the front door, the pages an evaluator lands on first.

The published documentation is already split into four reader groups the repository calls
tracks. Editors write in the admin and never see a terminal, while site admins run a site
without writing code. Developers extend cairn, and the reference is where those last two look
things up. Each track already has its own list of the words its reader is expected to know, kept in
the register, which is the repository's own style document at
[`docs-register.md`](../../docs-register.md).

The standard has four parts. The prose rules say how sentences and paragraphs must be
written. They adopt the Federal Plain Language Guidelines, a published United States
government style standard. Which pages exist, what sections each kind of page carries, and
how a section is built are the structure rules. The figure rules cover when a diagram or
screenshot earns its place. They also say how it is made and how it is graded. Last, the
review chain
gives a page the sequence of checks a code change gets, ending in a receipt that records the
review so a gate can verify it happened.

Two rules stand above the four parts. The first answers the facts nobody checked, and the
second answers how the draft was written, in one autonomous run:

1. Any claim about you or about cairn's stance must come from a brief you wrote or approved
   (today's is [front-door-author-brief.md](front-door-author-brief.md)), and a script must
   check that every such claim points at a line in that brief.
2. A page for an outside reader must be drafted one section per read, never end to end in an
   autonomous run.

## Motivation

You rejected the front-door draft as a "useless disaster." It had passed every gate. Its
opener told a story about editors emailing you changes that never happened. It said starting
a cairn site needs a developer, which the admin track's own promise contradicts. Its
sentences were built as hinged pairs at twice the rate of any human page I measured. A
hinged pair here is two clauses joined by a comma and a coordinator, a colon, a semicolon, a
dash, or a chain of relative clauses. When I split them the page turned staccato, and when I recast
it against technical pages the same rhythm moved from the comma to the colon. The
measurement now counts every hinge form the script defines, so a rewrite cannot pass by
moving the hinge.

The gates missed the draft's faults in three places. Vale, the prose linter, and the tell
scanner, the workstation's own checker for the habits of machine-written prose, both read
words and punctuation, and the draft was written to pass them. Nothing checked the facts
against you. Nobody but the author read the page before you did. The two rules above answer
the first two places, and the review chain below answers the third.

The rhythm problem is not confined to one page. On the instrument this document's receipt
uses, which counts every hinge form and excludes serial lists, the extend track, the
developers' track, builds 54 percent of its sentences as hinged pairs, and the reference
track builds 58 percent. The one human page vendored so far, SQLite's scope excerpt, builds
none. The corpus, defined fully below, is the set of human-written excerpts the docs are
measured against, and a band is the range a track's corpus entries set for a measurement.
The earlier figures of 48 and 44 percent, and the 19-to-44 band from five pages, were taken
on a narrower instrument and are not comparable. Re-measuring the other pages waits on the
corpus, because their text is not in the repository.

The samples are small enough that intervals overlap, so treat the gap as a direction rather
than a finding ([the cost review](proposal-review-cost.md) carries the intervals). The
sentence-length gap is firmer. The reference track averages 22 words with one sentence at
151, where PostgreSQL, MDN, and the Rust reference average 12 to 18 with almost nothing over
40 ([the reader-fit review](proposal-review-readers.md)).

## Goals and non-goals

The goal is prose an expert reader accepts as well-written and true, produced mostly by
Claude, with the front-door failure unable to recur. Three things are not goals. This
standard is not a readability gate. Controlled studies since the 1960s have found that
rewriting to a sentence-length number does not improve comprehension
([Redish 2000](https://dl.acm.org/doi/10.1145/344599.344637),
[a 2024 randomized trial](https://link.springer.com/article/10.1007/s11606-024-09200-z)),
so every number here locates a passage for a person to judge. It is not a new taxonomy; the
four tracks stay, and no page cites Diátaxis. And it is not a docs pass; the cost review
sizes the full pass at six to nine million tokens and 31 to 73 attended sittings, so one
demonstration page stands in for it below.

## Proposal

The standard is adopted in four parts, held by a review chain, and switched on by the eleven
decisions at the end. What each part requires of a page is set out under design details.
What you decide on is the set of rules, the gates that hold them, the corpus the docs are
measured against, the review chain, and the changes to the Claude setup that make Claude
draft under the same rules. Each decision carries a size and can be approved alone.

## Design details

### The prose rules

The Federal Plain Language Guidelines are the prose standard, in their March 2011 revision.
That revision is not yet in the repository, and its only reachable copy is a mirror
([the 2011 PDF](https://wid.org/wp-content/uploads/2022/03/FederalPLGuidelines.pdf)),
because plainlanguage.gov now redirects to digital.gov and the live guides were re-cut.
Vendoring the PDF is part of the first decision below. The guidelines carry about forty
numbered rules in five parts, and the standard adopts these:

- Part I, audience. A page must be written for one reader at a time, and separate audiences
  must be addressed separately. cairn's four tracks are this rule already.
- Part II, organization. A page must put its most important information first and the
  general case before the exception. The structure rules hold this.
- Part III, words. A page must use verbs rather than nouns made from verbs, the active voice
  unless the actor does not matter, "must" for a requirement, and the same term for the same
  thing every time. A term the reader is not expected to know must be defined where it is
  used, and the track vocabulary lists decide which terms those are.
- Part III, sentences. A sentence must express one idea and keep its subject, verb, and
  object close together. On the front door and in the extend track a qualification may ride
  inside the sentence that makes the claim.
- Part III, paragraphs. A paragraph must open with a topic sentence, cover one topic, and run
  three to eight sentences and no more than 150 words, with 250 as the hard limit. Paragraph
  length must vary across a page, by at least three sentences between the shortest and the
  longest.
- Part V, test. A page must be tested with a reader before it ships. The reader test below
  says how.

The guidelines give no sentence-length number. The numbers below are cairn's own, and the
first revision of this document wrongly attributed them to the guidelines, so each names its
source:

| Measure | Target | Source | Proposed status |
|---|---|---|---|
| Average sentence length | 15 to 20 words | [OPM plain-language guidance](https://www.opm.gov/information-management/plain-language/) | measured and reported, never gated |
| Longest sentence | under 40 words, no exception | Cutts, Oxford Guide to Plain English | gated per track once the existing violations are cleared |
| Sentence ceiling, admin and editors tracks | 25 words | ASD-STE100, the aerospace industry's controlled-language specification | gated, through a Cairn rule that sets its own level; the vendored packages stay unedited |
| Paragraph length | 3 to 8 sentences and 150 words, hard limit 250 | the guidelines, Part III | gated |

ASD-STE100 sets 20 words for a sentence that gives an instruction and 25 for one that
describes. The admin and editors tracks take the 25, because most of their sentences
describe a screen or a state rather than give a step, and one number per track is what a
linter can hold. The Microsoft sentence-length rule has been running on the editors track at
"suggestion" all along, so its findings were advisory and nobody acted on them. The vendored
file is not edited, since the packages are pinned; a Cairn rule sets the level and the number
for the two tracks. The Google and Microsoft guides keep the mechanics for their tracks,
and their Vale packages stay vendored and pinned in CI.

Three safeguards keep the numbers from doing harm. Every rule file must ship with a fixture
that fires, because a rule written as a Vale section override silently disables itself on
the CI version, and the cost review tested this on both versions. The sentence ceiling
travels with the two rules ASD-STE100 pairs it with. Complex text must go into a list, and
no part of a sentence may be dropped to make it shorter. The average is never a gate,
because writing to it produces amputated sentences, as revision 2 of this document showed.

### The structure rules

Structure is where the front door failed first. Its sections existed because a chain of
derivations produced them, not because a reader needed them in that order, and no gate
looked. The standard sets structure at three levels, and each level would get its own gate.
At the top, the docs set decides which pages exist. Below it, each page decides its own
sections and their order, and each section decides how one block of text is built. The
research behind this compared Diátaxis, DITA, Information Mapping, Every Page Is Page One,
and the reference conventions of PostgreSQL, MDN, and Rust;
[the structure research](proposal-research-structure.md) describes and links each. Each
system contributes one level, and none is adopted whole.

#### The docs set

Every published page must have one track and one page type. The four tracks stay as they
are. A page type is a named shape, and the standard names eleven, ten published and one internal. Each is listed here with the
reader's job it serves, because a page whose job you cannot state in one line is two pages.

- Task guide: the reader has a goal and wants the steps. Most admin and extend pages.
- Tutorial milestone: the reader is learning and needs the next unit in a sequence. The
  extend track's deep path.
- Concept page: the reader must understand something before acting. Extend track.
- Architecture overview: the reader must see how the parts fit and who owns each. One page
  per track that needs it; today, `docs/extend/architecture.md`.
- Reference entry: the reader knows the name and wants the contract. `docs/reference/`.
- Reference table: the reader wants one row of many, such as a config key, a CLI flag, a log
  event, or a condition. `docs/reference/log-events.md` is one.
- Condition entry and symptom row: the reader has a failure and wants the cause and the fix.
  The admin track's recovery pages.
- Index page: the reader must find the right page and leave.
- Front door: an evaluator is deciding whether cairn fits.
- Proposal, an internal type: the owner is deciding. This document is one. Its order comes
  from the [Rust RFC template](https://github.com/rust-lang/rfcs/blob/master/0000-template.md)
  and the [Kubernetes enhancement proposal template](https://github.com/kubernetes/enhancements/blob/master/keps/NNNN-kep-template/README.md),
  which agree on summary, motivation, goals and non-goals, the proposal, design details,
  drawbacks, alternatives, prior art, and unresolved questions.

Four rules hold at this level. A page must do one job, stated in its first sentence. A page
must read on its own, without the page before it, because readers arrive from search, from
the admin's help link, and from npm. A page must stay on one level, linking down to a
concept rather than explaining it in place. An index must list at most nine siblings before
it groups them, which is Horn's chunking bound and the same nine that bounds steps and
lists below.

#### The page

Each page type would get a fixed section order, held in a template under
`docs/internal/templates/`, a directory decision 4a creates. A new `check:anatomy` script
would read each template and fail a page whose required headings are missing or out of
order, so template and gate cannot drift apart. The orders below are the decision; decision
4 approves them and decision 4a writes the templates and the script.

- Task guide, under 800 words, its last two sections from the DITA task order and
  Carroll's rule that a task teaches error recovery:
  - title
  - a one-line contract stating what the reader will have at the end
  - before you begin, each precondition linked to the page that produces it
  - steps, numbered, one action each, at most nine
  - check it worked, the observable signal
  - if it fails, each failure path pointing at the track's recovery page
- Tutorial milestone:
  - title
  - what you will build
  - where you are, the state the previous milestone produced
  - steps
  - before you go on, a checklist
  - what's next
- Concept page, under 1,500 words:
  - definition, with the first sentence defining the thing
  - why it exists
  - how it works
  - what it is not
  - limits
  - where to go next
- Architecture overview, modeled on SQLite's architecture page and Kubernetes' cluster
  architecture page, and on PostgreSQL's internals overview where no figure is needed:
  - what the system is, in one paragraph
  - the parts, in the order data moves through them
  - one figure if the parts are an arrangement, none if they are a sequence
  - one section per part, stating its job and its boundary
  - what sits outside the system, and who owns it
- Reference entry, in the order PostgreSQL and MDN use:
  - export name
  - signature block
  - a summary of one to three sentences
  - parameters
  - returns
  - defaults
  - failure modes
  - stability tier
  - example
  - see also
- Reference table, modeled on Wrangler's configuration reference and Stripe's object
  references, with the prose rules applying to the lead sentence and the notes only:
  - a lead sentence saying what the table lists and how it is ordered
  - the table, one row per item, the same columns in every row
  - notes, if any, keyed to rows
- Condition entry and symptom row: their current field lists, as an order rather than a
  set.
- Index page:
  - title
  - who this track is for, and who it is not for, with the route out for the wrong reader
  - the pages, in reading order
  - where to start
- Front door, the shape SQLite's scope page, Kubernetes' overview, and Astro's "Why Astro"
  share:
  - your account of where cairn came from
  - what cairn does
  - where it fits
  - what it is not, as its own section
  - why this stack
  - the trade-offs
  - a short checklist the reader answers, which is SQLite's device
  - where to go next
- Proposal:
  - summary
  - motivation
  - goals and non-goals
  - proposal, at the level a reader decides on
  - design details
  - drawbacks
  - alternatives considered
  - prior art
  - unresolved questions
  - decisions, each with a cost
  - a receipt, when the document grades itself

No page may name its own type or track, which extends the standing rule that no page cites
Diátaxis. A page must state its type by following it. The template is the only place a type
is written down.

#### The section

A section must cover one idea and state it in its first sentence, and so must each paragraph
in it. A list must be grouped once it passes nine items, and a paragraph must run three to
eight sentences, which is Google's rule kept. A heading either tells the reader to do
something or explains. The first kind starts with a bare verb and the second is a noun
phrase. Siblings at one level share one form, and a section that mixes the two forms is doing
two jobs. A question heading is allowed only in the editors track, where the question is the
reader's own. A section that carries an instruction must end where the reader can act, or
name the page that tells them how.

A new `check:headings` script would hold the heading rules. Those are sentence case, one
level-one heading, no skipped levels, no leading -ing form, verb-first for task sections and
noun-phrase for the rest, siblings in one form, and question headings only under
`docs/editors/`. The two-headed-heading Vale rule that landed today,
[`TwoHeadedHeading.yml`](../../../../.vale/styles/Cairn/TwoHeadedHeading.yml), holds one
shape of one fault and nothing more. Vale sees one line at a time, and parallelism needs the
whole page, which is why the script exists.

#### The page brief and the outline review

Every page starts with a brief of four lines, written before the outline and kept beside
the page. The brief answers four questions. What does a page of this type include in general? Which
track and reader does it serve? What must this page carry that its type does not say? Does
it deviate from the standard, and how? A deviation is allowed only when the
brief records it with its reason, and the register's "when a Vale finding is wrong" rule
is the model for that record. A page with no brief has no outline to check against.

The outline is reviewed against the brief before any sentence is. A reviewer, and later `check:anatomy`, reads
the page type, the title, the headings, and the section order first. A page whose shape is
wrong goes back before its prose is graded, because prose work on a page with the wrong shape
is wasted. This is the order the front door needed and did not get. The docs pass, when it
comes, starts the same way, one track at a time, with the outline of every page read against
its type before a single paragraph is rewritten.

### The figure rules

A figure is a diagram or a screenshot, and pages rarely need one. It may appear only where
prose would have to state a relation among three or more parts as a series, or where the
fact is a branch between paths. A set of items must be a table, a linear sequence must be a
numbered list, and code the reader will type must be a code block. The evidence is in
[the figure survey](proposal-research-figures.md), the [Astro](proposal-research-figures-astro.md)
and [SvelteKit](proposal-research-figures-sveltekit.md) surveys, and
[the tooling research](proposal-research-figure-tooling.md): ten of fourteen surveyed pages
carry no explanatory figure, every "why" page carries none, and the Svelte docs carry none
at all. The register ruled most of the figure mechanics on 2026-08-15
([the visual-layer rulings](../2026-08-15-docs-visual-layer-rulings.md)), and those rulings
stand.

Two tests were missing, one in each direction, and the standard adds them:

- A figure that should not be there. Remove it, and if the text still makes the point
  without a new sentence, the figure was decoration. Then write its text alternative before
  anything else. An alternative that fits in one sentence means the prose should have been
  that sentence, and one that comes out as a table means the figure was a table.
- A figure that is missing. Read each paragraph and ask whether it is the text alternative
  of a diagram nobody drew. Containment words, direction words, and branches inside one
  paragraph are the signal. On a task page, an instruction that says where a control is
  without showing it is a missing screenshot.

Three decisions follow from the research and are listed below without their reasoning here.
Mermaid in the page stays the default and hand-authored SVG the exception, with no third
tool. `check:figures` would grow from a staleness check to seven mechanical assertions, and
`check:visuals` would close the hole where an image with no alt attribute passes unseen. On
the front door, the concept figure comes off, and the site's ownership map moves to the
architecture overview, where the page type expects it.

### The corpus

The docs must be compared against pages people wrote, the corpus, under these constraints:

- `docs/internal/corpus/` holds one excerpt per entry, at most 400 words.
- A manifest records each entry's source, license, fetch date, page type and track,
  measured numbers, and the date you approved it.
- Two entries per page type is the ceiling.
- An entry for a table-shaped page is marked structure-only. A review of such a page compares
  column order, row completeness, and the lead sentence rather than cadence.
- An entry you reject is deleted and its id retired.
- A review must cite a corpus entry beside its verdict, and a verdict that cites none does
  not count. The first entry exists as a sample,
  [corpus-sample-sqlite.md](corpus-sample-sqlite.md), so the receipt below can cite it.

The proposed entries, with the excerpt each would carry:

- Front door: [SQLite, Appropriate Uses](https://www.sqlite.org/whentouse.html), the
  checklist section; and [Kubernetes, Overview](https://kubernetes.io/docs/concepts/overview/),
  the "What Kubernetes is not" section.
- Concept page: [PostgreSQL, Concurrency Control](https://www.postgresql.org/docs/current/mvcc-intro.html),
  its opening; and [Astro, Why Astro](https://docs.astro.build/en/concepts/why-astro/), the
  design principles.
- Reference entry: [PostgreSQL, CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html),
  synopsis through parameters; and [MDN, scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView),
  syntax through return value.
- Task guide: [Cloudflare Workers, Get started](https://developers.cloudflare.com/workers/get-started/guide/),
  the first three steps; and [GitHub Docs, Creating a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request),
  one step with its screenshot.
- Tutorial milestone: [Astro, Build your first blog, unit 2](https://docs.astro.build/en/tutorial/2-pages/1/),
  the objectives and first steps.
- Troubleshooting: [Cloudflare Workers, Errors](https://developers.cloudflare.com/workers/observability/errors/),
  one error table.
- Editors track: [GOV.UK, a guidance page](https://www.gov.uk/guidance/classifying-vehicles),
  its opening. A second editors entry is owed; the Mozilla support articles block automated
  reads, so it must be chosen by hand and approved separately.
- Architecture overview: [SQLite, Architecture of SQLite](https://www.sqlite.org/arch.html),
  public domain, its component sections; and
  [PostgreSQL, Overview of PostgreSQL Internals](https://www.postgresql.org/docs/current/overview.html),
  the query path with no figure.
- Reference table: [Cloudflare, Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/),
  CC BY 4.0, one key table; and a [Stripe API object](https://docs.stripe.com/api/customers/object)
  page, one field table, marked structure-only in the manifest since sentence measures do not
  apply to a table.
- Figures: the [Raft paper](https://raft.github.io/raft.pdf), Figure 2 and its caption; and
  [Kubernetes, Cluster Architecture](https://kubernetes.io/docs/concepts/architecture/), its
  figure with alt text, caption, and lead-in.

### The review chain

The review chain gives a page the same steps a code change gets, and the quality checklist
below is what the chain verifies. The outline comes first.
The page type, the title, the headings, and the section order are checked before any prose
is, because prose work on a page with the wrong shape is wasted. A page whose outline fails
goes back before step 4 runs. The steps run in this order, and each names who or what runs
it. A page for a published path is drafted at that path on a branch, never under
`docs/internal/record`; this proposal is not a published page, which is why it lives here.

1. I write the page brief, four lines: what this page type includes, who reads it, what
   this page needs beyond its type, and any deviation with its reason.
3. I draft the page where it will live, so Vale and the save hook run the right styles from
   the first save.
3. CI runs the outline scripts first, `check:anatomy` and `check:headings`, then
   `check:docs`, `check:visuals`, and `check:figures`. A reviewer reads the outline at the
   same point, before any sentence, and returns a page whose type, title, or section order
   is wrong.
4. CI runs the linters under a severity contract. An error fails the build, a warning shows
   in the review, and a suggestion stays local. A rule may move to error only after every
   existing violation is cleared, which is
   [GitLab's rule](https://docs.gitlab.com/development/documentation/testing/) and the
   reason the 40-word ceiling cannot ship as an error today.
5. The tell scanner reports the sentence numbers, the hinged-pair share, and the
   short-sentence share beside the corpus entry's numbers. A hinged-pair share more than
   fifteen points above the entry's is called out in the report. Nothing gates on any of
   it. The bands stay advisory until a track has twenty documents and three hundred
   sentences behind them, which is the cost review's threshold for a band whose endpoints
   stop moving when one specimen is swapped.
6. `check:provenance` runs on the front door. Every sentence there that states a fact about
   you or about cairn's stance must carry a footnote id, and the script fails on an id that
   does not resolve to a line in the brief.
7. A fresh reviewer grades the page against its corpus entry. The reviewer is a different
   context from the drafter, and a different model family where one is available, because a
   judge from the same family shares the drafter's blind spots
   (the workstation's evidence base at
   `~/.claude/skills/writing-voice/evals/research/2026-09-01-ai-tell-evidence-base.md`).
   Its report carries the page type, the corpus entry, the measurement table, and the
   verdict.
8. You or a volunteer runs the reader test, described next.
9. `check:prose-read` verifies the receipt. A file beside the page carries the page's content
   hash, the measurement table, the corpus entry, the reviewer's verdict, and the reader's
   result, and the gate fails when a published page's hash has no matching receipt.

#### The quality checklist

Every page walks one checklist before its receipt is written. The checklist is generic: its
questions apply to any artifact, a docs page, a proposal, or a plan, and they are the
questions a reviewer asks first. Beneath each question sits what answers it in this
repository, a gate or a person, so nothing rests on memory. The reviewer records each item
as met, not met, or not applicable.

- Who is the intended reader, and does the page address that reader alone? The page brief
  names the track and reader; a person checks the vocabulary against the track's list.
- What is the page for, and does its first sentence say so? A person.
- Which standard governs this page, and does the page follow it? The brief names the page
  type; `check:anatomy` holds the section order and `check:headings` the heading grammar.
- Is the page organized logically for that reader, with the general case before the
  exception and each section on one idea? A person, at the outline review, before any prose
  is read.
- Does the page deviate from its standard anywhere, and is each deviation recorded with its
  reason? The brief; a person.
- Is every claim true and traceable? Facts about the author or the product point at the
  brief (`check:provenance` on the front door); facts about the code are checked against the
  code; every link and anchor resolves (`check:docs`).
- Is every term the reader is not expected to know defined where it first appears? A person,
  against the track's vocabulary list.
- Are requirements stated as requirements and facts as facts? A person.
- Is the prose within its limits? Vale holds the sentence ceiling and the paragraph bounds;
  the tell scanner reports the measurements beside the corpus entry's.
- Does every figure earn its place, and does every missing figure show up? A person, with
  the two figure tests; `check:visuals` and `check:figures` hold alt text, captions, and the
  mechanical assertions.
- Did someone other than the author read it against a named exemplar, and did a reader use
  it? Both recorded in the receipt.
- Does the receipt exist and match the page? `check:prose-read`.

### The reader test

For a task guide, someone who is not the author does the task from the page. For a concept
page or the front door, they read it once and paraphrase it back, and every mismatch between
the paraphrase and the page is a place the page was unclear. This is Part V of the
guidelines. DigitalOcean's editors run each tutorial before it ships, and the Center for
Plain Language holds that reader testing, not a formula, is the standard
([the peer comparison](proposal-review-peers.md)). The test costs a person's time, yours or a
volunteer's. The pages it applies to are the task guides in the admin and extend tracks and
the front door, which today number about forty, and never the reference entries.

### The Claude setup

Seven pieces of the setup change, and the list is short on purpose. Anthropic's own
guidance is that an instruction file Claude ignores half of is worse than a short one
([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). The memory
paragraph revision 1 proposed is dropped, because the register is the durable record. The
seven:

- Both `CLAUDE.md` files, the instruction files Claude reads at the start of every session,
  gain four lines. Both files already sit at the length that guidance warns about, so the
  four lines replace four others rather than add to them.
- The writing-voice output style gains three tells: the two-headed heading, the abstract noun
  standing in for the concrete thing, and the page describing itself. Nothing else is added,
  because a longer list of prohibitions narrows what a model avoids without changing what it
  produces.
- The voice files under `~/.claude/docs/voice/`, one per audience, each name the corpus
  entries for their audience and the advisory bands.
- The tell scanner gains the hinged-pair share and the short-sentence share, in report mode,
  with the bands in a small file per audience. The cost review sizes this at about 285 lines
  of Go with no new dependency, and calls it small.
- The Vale hook grades a draft by its path, which step 2 of the review chain makes
  sufficient.
- The review agents change their dispatch shape. The register editor and the voice reviewer
  must be given a corpus entry and must report the measurement table. The diff reviewer runs
  the scanner on docs tasks. A new `figure-verifier` agent grades figures by the register's
  method.
- Two skills. `cairn-figure` holds the production path for figures, and the writing-voice
  skill gains an "author-facing prose" section holding the brief-first, one-section-per-read
  protocol.
## Drawbacks

The reader test costs your time, about forty sittings across the task guides and the front
door, and it is the largest attended cost in the decisions. The gates rest on a Vale
mechanic that differs between the pinned CI version and the workstation version, so every
rule needs a fixture that fires or it can pass while enforcing nothing. The measurement
instrument moved twice while this document was being written, and each move changed the
numbers by more than the width of the human band, so no number is a rule yet. And the
templates, the corpus, and three scripts do not exist; four of the decisions create them,
and the standard holds nothing until they do.

## Alternatives considered

Revision 1 proposed rewriting the extend track to the cadence bands. This revision proposes
one demonstration instead: `docs/extend/add-a-custom-admin-screen.md`, the worst-measuring
extend page at 76 percent hinged pairs on the fixed instrument, rewritten against a
task-guide corpus entry and read by you beside the original before any pass is planned. A
second diagram language, a screenshot regime for the developer tracks, and a pixel-diff suite
for figures were each considered and rejected in the figure research for a stated reason
([figure tooling](proposal-research-figure-tooling.md)). Gating the cadence numbers was
considered and rejected on the evidence in the goals above and in
[the efficacy review](proposal-review-efficacy.md).

## Prior art

Google and Microsoft publish the two style guides the docs already follow, and both have
Vale packages; neither package holds a rule above the word, which is why the front door
passed them. GitLab holds sentence length and reading level as advisory measurements for a
quarterly audit and publishes the severity contract this proposal copies. Red Hat holds an
average-length and a reading-grade rule at advisory level. DigitalOcean's editors run every
tutorial before it ships, and Kubernetes assigns a reviewer who is not the author; both are
the reader test in practice. Kubernetes also publishes the most complete diagram guide in
the set. No team in the survey gates on a cadence number, and the two that measure it treat
it as an instrument
([the peer comparison](proposal-review-peers.md)).

## Unresolved questions

The corpus does not exist yet. Until you approve its entries, the bands are numbers from
five pages and a reviewer's comparison is whatever it fetched. Assembling the corpus is the
first task after approval.

The measurement script, [`measure-prose.mjs`](../../../../scripts/checks/measure-prose.mjs),
defines a hinged pair by four patterns. They are a comma followed by a coordinator,
subordinator, or relative word, a colon or semicolon followed by text, a spaced dash, and a comma followed by
"and" or "or" when no earlier comma sits in the sentence. That last clause is what excludes
serial lists. Revision 4 added it after the revision 3 grade found the count inflated by
them, and it moved this document's own prose figure from 46 percent to 36. The receipt names
this definition, and the definition is fixed in the script before any number becomes a
rule. The cost review found that changing the
sentence splitter moves a track figure by 17 points, wider than the human band. No number
here is a rule yet.

Vale's rule mechanics were tested on the pinned CI version and on the workstation version,
and they disagree. A rule that passes on one and not the other is caught only by the
must-fire fixture, which is why the fixture is not optional. This revision has not been
reader-tested. Revision 4 was, and its paraphrase matched the document; the terms it met
before their definitions are now defined at first use. The register grade of revision 5
raised sixteen findings, and this revision answers each, but the answers are unverified
until the next grade.

## Decisions

Each item can be approved or declined on its own. Small is a file or two, under a quarter
million tokens. Medium is a script or a tuned package, under two million. No item is large;
the one large item, the docs pass, is excluded above. The decisions
come last because a decision list read before its reasoning is a list of unsupported claims,
and Part II's most-important-first rule yields to that on a proposal.

| # | Decision | Size |
|---|---|---|
| 1 | Adopt the Federal Plain Language Guidelines, 2011 revision, as the prose standard, and vendor the PDF | small |
| 2 | Hold the paragraph numbers and the 40-word ceiling as gated rules, and the average sentence length as a reported measurement that never gates | small |
| 3 | Add a Cairn rule that fails a sentence over 25 words on the admin and editors tracks | small for the rule; medium for clearing the 135 admin and 61 editors sentences that exceed it, which must come first under the severity contract |
| 4 | Adopt the three structure levels, the ten page types with their section orders, and the outline-first review | small |
| 4a | Write the ten templates and the two new scripts | medium |
| 5 | Adopt the two figure tests and the two-lane routing rule, and commit the figure source and script | small |
| 5a | Grow `check:figures` to the seven assertions and close the `check:visuals` hole | medium |
| 6 | Take the concept figure off the front door and move the ownership map to the architecture overview | small |
| 7 | Approve the corpus entries above, or name the ones to swap | small |
| 8 | Adopt the review chain and its severity contract | small |
| 8a | Write `check:provenance` and `check:prose-read` | medium each |
| 9 | Adopt the reader test for the roughly forty task guides and the front door | small in tokens; about forty attended sittings, one per page, the largest attended cost in this table |
| 10 | Approve the Claude setup changes as listed | small; the cost review sizes the scanner change at 285 lines and small |
| 11 | Approve the `add-a-custom-admin-screen.md` demonstration before any docs pass is planned | small |

## Receipt

Measured with `scripts/checks/measure-prose.mjs` over everything above this section, with
list items included and then excluded, and every hinge form counted, serial lists excluded.
The corpus column measures the SQLite sample the same way. A paragraph that ends with a colon
introduces a list and is exempt from the paragraph floor, and the script names any short
paragraph it counts. Vale ran with the Google package forced on, since this path is
style-exempt, and all three levels are reported. Every cell below is written from the
script's output by one generator, never by hand. This proposal is not a published page, so
the content hash and the reader's result that a step-9 receipt carries do not apply here.

| Measure | All sentences | Prose only | Corpus entry | Target | Status |
|---|---|---|---|---|---|
| Sentences | 344 | 185 | 6 |  | count only |
| Average length | 16.1 words | 18.3 words | 18.7 words | 15 to 20 | pass on both; the all-sentences figure runs lower because it counts list items, which the standard wants short |
| Longest sentence | 39 words | 39 words | 33 words | under 40 | pass |
| Hinged pairs | 42 percent | 45 percent | 0 percent | at or under the corpus entry plus 15 points, per step 5 | fail; 45 against 0. The instrument is unsettled, so this fails as a reading, not as a gate, and the person judging is you |
| Sentences under 8 words | 19 percent | 10 percent | 17 percent | reported | reported |
| Paragraphs over 8 sentences or 150 words | 0 |  |  | 0 | pass |
| Paragraphs under 3 sentences, list lead-ins exempt | 0 |  |  | 0 | pass |
| Paragraph lengths, shortest to longest, in sentences | 1 to 8, across 41 paragraphs |  |  | a spread of at least 3, per the paragraph rule | pass |
| Vale, Google package forced | 0 errors, 40 warnings and 184 suggestions |  |  | errors 0 | pass on the gate; the warnings are contractions and word-list items from the Google package, which this document does not adopt for itself |
| Tell scanner findings | 1 |  |  | 0 | one finding, the "Summary" heading, recorded as a deviation in the page brief |
| Three-item lists the scanner counted | 4 |  |  | each a real list | each checked by hand and each a list of things that number three |

Provenance: the account of the front-door failure is
[front-door-net-failure.md](front-door-net-failure.md); the track measurements are in
[proposal-review-readers.md](proposal-review-readers.md) and, on the fixed instrument, in
this document's own Motivation; the citation corrections are in
[proposal-review-self.md](proposal-review-self.md) and
[proposal-review-peers.md](proposal-review-peers.md); the grades of revisions 3 to 6 are
[proposal-review-rev3.md](proposal-review-rev3.md),
[proposal-review-rev4.md](proposal-review-rev4.md),
[proposal-review-rev5.md](proposal-review-rev5.md), and
[proposal-review-rev6.md](proposal-review-rev6.md). Revision 8 restructured the document
into the proposal shape after your read of revision 7 and has not been graded since.
