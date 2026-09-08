# A documentation standard for cairn

Revision 2, 2026-09-08. Proposal for Geoff's review. Revision 1 was reviewed through seven
lenses and rewritten from their findings; the reviews and research are the
`proposal-review-*.md` and `proposal-research-*.md` files beside this one. The document
follows the standard it proposes, and its receipt is the last section.

## What this proposes

This document proposes a standard for cairn's published documentation. By a standard I
mean the written rules a page is drafted against and checked against before it ships,
the way the code has its conventions and its gates. The docs are already split into four
reader groups, which the repository calls tracks: editors who write in the admin and never
see a terminal, site admins who run a site without writing code, developers who extend
cairn, and the reference, which both of the last two look things up in. The standard covers
all four, plus the front door, which is the set of pages an evaluator lands on first.

The standard has four parts. The prose part says how sentences and paragraphs are written.
It adopts the Federal Plain Language Guidelines, a published United States government style
standard, with its paragraph numbers held as rules and cairn's own sentence numbers held as
measurements. The structure part says which pages exist, what sections each kind of page
carries and in what order, and how a section is built. The figures part says when a diagram
or screenshot earns its place, how it is made, and how it is graded. The review part gives
a page the same chain a code change gets: a check against its template, the linters,
measurements against a small set of pages people wrote, a fresh reviewer who cites those
pages, a reader who tries the page, and a receipt that records the review so a gate can
verify it happened.

Two rules sit above the four parts. Any claim about you or about cairn's stance comes from a
brief you wrote or approved, and a script checks that every such claim points at a line in
that brief. And a page for an outside reader is drafted one section per read, never end to
end in an autonomous run.

## Why it exists

You rejected the front-door draft as a "useless disaster." It had passed every gate. Its
opener told a story about editors emailing you changes that never happened. It said starting
a cairn site needs a developer, which the admin track's own promise contradicts. Its
sentences were built as comma-hinged pairs at twice the rate of any human page we measured,
and when I split them the page turned staccato. When I recast it against technical
specimens, the same rhythm moved from the comma to the colon.

The gates missed all of it for one reason. A gate here is a check that fails the build. The
two prose gates, Vale and the tell scanner, check words and punctuation, and the draft was written to pass them. Nothing checked the facts against you or the prose against a human page, and nobody but
the author read it before you did.

The cadence problem is not confined to one page. The extend track, the developers' track, builds 48 percent of its
sentences as hinged pairs (two clauses joined on a comma) and the reference track 44 percent, against 19 to 44 percent in
the human specimens and under 30 in the best of them. The reference track's average sentence
runs 22 words with one sentence at 151, where PostgreSQL, MDN, and the Rust reference run 12
to 18 with almost nothing over 40.

## How it works

### Prose

The Federal Plain Language Guidelines are the prose standard. I cite the March 2011 revision
as a PDF vendored into the repository, because plainlanguage.gov now redirects to digital.gov
and the live guides were re-cut. The guidelines carry about forty numbered rules in five
parts. This standard adopts these:

- Part I, audience. Write for one reader at a time and address separate audiences
  separately. cairn's four tracks are this rule already. The register, the repository's
  own style document at `docs/internal/docs-register.md`, keeps its list of which words
  each track's reader is expected to know.
- Part II, organization. Put the most important information first and the general case
  before the exception. The structure part below is how this rule is held.
- Part III, words. Use verbs, not nouns made from verbs. Use the active voice unless the
  actor does not matter. Use "must" for a requirement. Omit needless words. Use the same
  term for the same thing every time. Define a term where it is used, when the reader is
  not expected to know it. The track vocabulary contracts decide which terms a reader is
  expected to know.
- Part III, sentences. Express one idea in each sentence, and keep the subject, verb, and
  object close together. In the front door and the extend track, a qualification may ride
  inside the sentence that makes the claim.
- Part III, paragraphs. Open with a topic sentence. Cover one topic. Keep a paragraph to
  three to eight sentences and no more than 150 words, never past 250. Vary paragraph length.
- Part V, test. Test the page with a reader before it ships. The review part says how.

The guidelines give no sentence-length number. The numbers below are cairn's own, and their
source is named, because the first revision of this document attributed them to the
guidelines and a reviewer caught it.

| Measure | Target | Source | Status |
|---|---|---|---|
| Average sentence length | 15 to 20 words | OPM plain-language guidance | measured, not gated |
| Longest sentence | under 40, except at most 2 percent of a page up to 65 | Cutts, and the ceiling the SQLite and Tailwind specimens meet | gated per track, after the existing violations are cleared |
| Instruction sentence, admin and editors | 25 words | ASD-STE100's descriptive ceiling, one number per track | gated, as the existing Microsoft rule raised from suggestion |
| Paragraph length | 3 to 8 sentences, 150 words, hard 250 | the guidelines, Part III | gated |

Three things make the numbers safe to hold. Every rule file ships with a fixture that must
fire, because a rule written as a Vale section override silently disables itself on the CI
version. The sentence ceiling comes with the two rules ASD-STE100 pairs it with, use a list
for complex text and never drop a part of a sentence to make it shorter, so the ceiling
cannot produce fragments. And a measurement counts every hinge family, comma, colon,
semicolon, dash, and a relative-clause chain, so a rewrite cannot pass by moving the hinge.

The Google and Microsoft guides keep the mechanics for their tracks. Their Vale packages are
vendored and pinned. What changes is the level. The Microsoft sentence-length rule has been
running on the editors track at "suggestion" all along, which is why nobody saw it, and it
moves to "error" at 25 words once the track is clean.

### Structure

Structure is set at three levels. The docs set decides which pages exist. The page decides
its sections and their order. The section decides how one block of text is built. The
research behind this layer compared Diátaxis, DITA, Information Mapping, Every Page Is Page
One, and the reference conventions of PostgreSQL, MDN, and Rust. Each contributes one layer,
and none is adopted whole.

#### The docs set

Every published page has one track and one page type. The four tracks stay
as they are. A page type is a named shape: task guide, tutorial milestone, concept page,
reference entry, condition entry, symptom row, index page, and front door. One page does one
job, is written to be read alone, and stays on one level, linking down to a concept rather
than explaining it. An index lists at most nine siblings before it groups them.

#### The page

Each page type has a fixed section order, held in a template under
`docs/internal/templates/` and checked by a new `check:anatomy` script that reads the
template, so the two cannot drift. A task guide runs title, contract, before you begin,
steps, check it worked, and if it fails. A concept page runs definition, why it exists, how
it works, what it is not, limits, and where to go next. A reference entry runs signature,
summary, parameters, returns, defaults, failure modes, stability tier, example, and see also,
which is the PostgreSQL and MDN order. A task guide stays under 800 words and a concept page
under 1,500. No page names its type or its track.

#### The section

A section covers one idea and states it in its first sentence. A list runs
to nine items before it is grouped. A heading that tells the reader to do something starts
with a bare verb, a heading that explains uses a noun phrase, and sibling headings share one
form. A new `check:headings` script holds the grammar, beside the two-headed-heading rule
that landed today.

#### The front door

`why-cairn.md` takes the shape the three strongest "why" pages share. Its
sections, in order: your account of where cairn came from; what cairn does; where it fits;
what it is not, as its own section; why this stack; the trade-offs; a short checklist the
reader answers; and where to go next. The checklist is SQLite's closing device and the one
instrument on that page that turns an argument into the reader's decision.

### Figures

A figure, meaning a diagram or a screenshot, appears only where the fact being taught is a relation among three or more parts,
or a branch between paths, that prose would have to state as a series. Ten of the fourteen
exemplar pages carry no explanatory figure. Every "why" page carries none. The reference
pages of PostgreSQL, MDN, and Rust carry none. Across 24 Astro docs pages there are two: a
box diagram built in CSS on the islands page and one screenshot in the tutorial's first
hands-on step. Across 21 Svelte and SvelteKit pages there are none. Their tutorial uses a live
editor in place of any screenshot, which an editors track for readers with no code cannot
borrow, and that is the one place cairn's docs will carry screenshots the upstream never
needed. A set of items is a table and a linear
sequence is a numbered list. Code the reader will type is a code block.

The register ruled most of this on 2026-08-15, and eleven Mermaid figures ship under that
ruling. This standard adds the two tests that were missing, one in each direction.

- A figure that should not be there. Remove it. If the text still makes the point
  without a new sentence, the figure was decoration. Then write its text alternative before
  anything else. If the alternative is one sentence, the prose should have been that
  sentence. If it is a table, the figure was a table.
- A figure that is missing. Read each paragraph and ask whether it is the text
  alternative of a diagram nobody drew. Containment words, direction words, and branches
  inside one paragraph are the signal. On a task page, an instruction that says where a
  control is without showing it is a missing screenshot.

Production has two lanes and one routing rule. A Mermaid fence in the page is the default,
because it renders on GitHub, on the artifact host, and through cairn.pub's theme, and it
diffs. Hand-authored SVG is the exception, taken only when the lesson is arrangement rather
than edges, which is the case for the two ownership figures. Both lanes draw from one palette and one
typeface, with one stroke weight for ordinary edges. SVG is never edited in place. It is emitted
from `docs/internal/site-figures.svg` by the existing script. No third tool.

Grading has a mechanical half and a judged half. `check:figures` grows from a staleness check
to seven assertions: staleness, a 12-pixel legibility floor measured from the rendered
figure, no overflow past the figure's own box, contrast in both schemes, every color a theme
token, the node budget, and SVG hygiene. `check:visuals` closes the hole where an image with
no alt attribute at all passes unseen. A fresh-context reviewer, never the drawer, grades
the figure by the register's existing method and records a receipt beside the page. On the
front door, the concept figure does not earn its place by these tests and comes off. The
ownership map goes to the architecture page.

### The corpus

The docs are compared against pages people wrote, which this document calls the corpus.
`docs/internal/corpus/` holds one short
excerpt per entry, at most 400 words. A manifest records each entry's source, license, fetch
date, page type and track, measured numbers, and the date you approved it. Two entries per page type is the ceiling. An entry you reject is deleted and
its id retired. The proposed entries:

- Front door: SQLite's Appropriate Uses page and Kubernetes' Overview.
- Concept page: PostgreSQL's Concurrency Control and Astro's Why Astro.
- Reference entry: PostgreSQL's CREATE INDEX and MDN's scrollIntoView.
- Task guide: Cloudflare's Workers get-started guide and a GitHub Docs how-to.
- Tutorial milestone: one unit of the Astro blog tutorial.
- Troubleshooting: a Cloudflare troubleshooting page.
- Editors track: a GOV.UK guidance page and a Mozilla support article.
- Figures: the Raft paper's Figure 2 and Kubernetes' architecture figure.

A review cites a corpus id beside its verdict. A verdict with no id does not count.

### Review and test

Docs get the chain code has. It runs in this order, and each step has a named owner.

1. The draft is written where it will live. A page for a published path is drafted at
   that path on a branch, so Vale and the hook run the right styles from the first save. No
   more drafts under `docs/internal/record`.
2. The template check runs: `check:anatomy` and `check:headings`, with `check:docs`,
   `check:visuals`, and `check:figures`.
3. The linters run under a severity contract. Error fails CI. Warning shows in the
   review. Suggestion is local only. A rule moves to error only after every existing
   violation is cleared, which is GitLab's rule and the reason the 40-word ceiling cannot
   ship as an error today.
4. The measurements are reported, never gated. The tell scanner reports the sentence
   numbers, the hinge share across every hinge family, and the short-sentence share, beside
   the corpus entry's numbers. The bands stay advisory until a register has a thousand
   sentences from ten documents behind it.
5. Provenance is checked by a script. Every sentence on the front door that states a
   fact about you or cairn's stance carries a footnote id, and `check:provenance` fails on an
   id that does not resolve to a line in the brief.
6. A fresh reviewer grades against the corpus. A different context from the drafter, and
   a different model family where one is available, since a judge from the same family
   shares the drafter's blind spots. The report carries the page type, the corpus id, the
   measurement table, and the verdict.
7. A reader runs the page. For a task guide, someone who is not the author does the
   task from the page. For a concept page or the front door, they paraphrase it back. This
   is Part V of the guidelines and the step every mature docs team keeps.
8. The read leaves a receipt. A file beside the page carries the page's content hash,
   the measurement table, the corpus id, the reviewer's verdict, and the reader's result.
   `check:prose-read` fails when a published page's hash has no matching receipt. The read
   is a gate because a promise to read is not one.

### The Claude setup

The setup changes in seven places, and the list is short on purpose. Anthropic's guidance is
that an instruction file Claude ignores half of is worse than a short one.

- Both `CLAUDE.md` files, the instruction files Claude reads at the start of every session,
  gain four lines. The prose standard and where it lives. Author
  facts come from a brief and a script checks them. Audience prose is drafted one section
  per read. The conductor reads audience prose in full before you do.
- The writing-voice output style gains three tells: the two-headed heading, the abstract
  noun standing in for the concrete thing, and the page describing itself. Nothing else is
  added, because a longer list of prohibitions narrows what a model avoids without changing
  what it produces.
- The register files under `~/.claude/docs/voice/` each name the corpus entries for their
  register and the advisory bands.
- The tell scanner, the workstation's own checker for the habits of machine-written prose,
  gains the hinge-family share and the short-sentence share, in report
  mode, with the bands in a small file per register.
- The Vale hook grades a draft by its path, which step 1 of the review makes sufficient.
- The agents change their dispatch shape. The register editor and the voice reviewer
  require a corpus id and report the measurement table. The diff reviewer runs the scanner
  on docs tasks. A new `figure-verifier` grades figures by the register's method.
- Two skills. `cairn-figure` holds the production path for figures, and the
  writing-voice skill gains an "author-facing prose" section holding the brief-first,
  one-section-per-read protocol.

The memory paragraph revision 1 proposed is dropped. The register is the durable record, and
a memory that cannot fire is the weakest carrier the workstation rules name.

## What it is not

It is not a readability gate. Four decades of studies show that writing to a sentence-length
number does not move comprehension and often removes the connectives that make an
explanation cohere. The numbers here locate a problem for a person to judge.

It is not a new taxonomy. The four tracks stay, the docs never cite Diátaxis or any page
type, and the register's existing rulings on vocabulary, figures, and the front door stand
except where this document names a change.

It is not a docs pass. Revision 1 proposed rewriting the extend track to the bands. This
revision proposes one demonstration. The worst-measuring extend page is rewritten against a
task-guide corpus entry and you read it beside the original, before any pass is planned.

It is not a second diagram language, a screenshot regime, or a pixel-diff suite for figures.
Each was considered and rejected in the figure research for a stated reason.

## Limits

The corpus does not exist yet. Until you approve its entries, the bands are numbers from
five pages and the reviewer's specimen is whatever it fetched. Assembling the corpus is the
first task.

The measurement script counts serial lists and relative clauses as hinges unless told not
to. The receipt names the definition it used, and the definition is fixed in the script
before any number becomes a rule.

The reader test costs a person's time. For the four tracks that is your time or a
volunteer's, and it is spent on task guides and the front door, never on reference entries.

The Vale mechanics were tested on the pinned CI version and the workstation version, and
they disagree. A rule that passes on one and not the other is caught only by the must-fire
fixture, which is why the fixture is not optional.

## Where to go next

1. Adopt the prose part: the guidelines as the standard, the paragraph numbers as rules, the
   sentence numbers as measurements, the Microsoft rule raised on the two instructional
   tracks.
2. Adopt the structure part: the three layers, the templates, and the two new checks.
3. Adopt the figures part: the two tests, the routing rule, the seven assertions, and the
   front-door figure decision.
4. Approve the corpus entries, or name the ones to swap.
5. Adopt the review chain and its severity contract.
6. Approve the Claude setup changes as listed.
7. Approve one demonstration page before any docs pass.

## Receipt

Measured with `scripts/checks/measure-prose.mjs` over everything above this section, list
items included and excluded, with every hinge family counted. Vale ran with the Google
package forced on, since this path is style-exempt, and all three levels are reported.

| Measure | All sentences | Prose only | Target |
|---|---|---|---|
| Sentences | 214 | 125 | |
| Average length | 14.5 words | 16.5 words | 15 to 20 |
| Longest sentence | 56 words | 56 words | under 40 |
| Hinged pairs, all families | 35 percent | 38 percent | reported |
| Sentences under 8 words | 24 percent | 18 percent | reported |
| Paragraphs over 8 sentences or 150 words | 1 | | 0 |
| Vale, Google package forced | 0 errors, 16 warnings and 110 suggestions | | errors 0 |
| Tell scanner | 0 tells per 1,000 words; counts {'tricolon': 7} | | reported |

Corpus entries cited while drafting: SQLite, Appropriate Uses (structure and the closing
checklist); Kubernetes, Overview (the "what it is not" section). Provenance: the account of
the front-door failure is the record `front-door-net-failure.md`; the measurements of the
tracks are in `proposal-review-readers.md`; the citation corrections are in
`proposal-review-self.md` and `proposal-review-peers.md`.
