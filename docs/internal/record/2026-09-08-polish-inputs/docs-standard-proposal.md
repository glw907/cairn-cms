# A documentation standard for cairn

Revision 5, 2026-09-08, for Geoff's review. Revision 1 went through seven review lenses.
Revisions 2 to 4 went through the review chain this document proposes, and each revision
folds the findings. The reviews and research are the `proposal-review-*.md` and
`proposal-research-*.md` files in this directory.

## A documentation standard

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
how a section is built are the structure rules. When a diagram or screenshot earns its
place, how it is made, and how it is graded are the figure rules. Last, the review chain
gives a page the sequence of checks a code change gets, ending in a receipt that records the
review so a gate can verify it happened.

Two rules stand above the four parts, and they answer the two faults no gate caught.

1. Any claim about you or about cairn's stance must come from a brief you wrote or approved
   (today's is [front-door-author-brief.md](front-door-author-brief.md)), and a script must check that every such claim points at a line in that brief.
2. A page for an outside reader must be drafted one section per read, never end to end in an
   autonomous run.

## The failure it answers

You rejected the front-door draft as a "useless disaster." It had passed every gate. Its
opener told a story about editors emailing you changes that never happened. It said starting
a cairn site needs a developer, which the admin track's own promise contradicts. Its
sentences were built as hinged pairs at twice the rate of any human page I measured. A
hinged pair here is two clauses joined by a comma and a coordinator, a colon, a semicolon, a
dash, or a chain of relative clauses. When I split them the page turned staccato, and when I recast
it against technical pages the same rhythm moved from the comma to the colon. The
measurement now counts all five hinge forms, so a rewrite cannot pass by moving the hinge.

The gates missed the draft's faults in three places. Vale, the prose linter, and the tell
scanner, the workstation's own checker for the habits of machine-written prose, both read
words and punctuation, and the draft was written to pass them. Nothing checked the facts
against you. Nobody but the author read the page before you did.

The rhythm problem is not confined to one page. On the instrument this document's receipt
uses, which counts every hinge form and excludes serial lists, the extend track, the
developers' track, builds 54 percent of its sentences as hinged pairs, and the reference
track builds 58 percent. The one human page vendored so far, SQLite's scope excerpt, builds
none. The earlier figures of 48 and 44 percent, and the 19-to-44 band from five pages, were
taken on a narrower instrument and are not comparable. Re-measuring the other pages waits
on the corpus, because their text is not in the repository.

The samples are small enough that intervals overlap, so treat the gap as a direction rather
than a finding ([the cost review](proposal-review-cost.md) carries the intervals). The
sentence-length gap is firmer. The reference track averages 22 words with one sentence at
151, where PostgreSQL, MDN, and the Rust reference average 12 to 18 with almost nothing over
40 ([the reader-fit review](proposal-review-readers.md)).

## The parts

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
  length must vary across a page.
- Part V, test. A page must be tested with a reader before it ships. The reader test below
  says how.

The guidelines give no sentence-length number. The numbers below are cairn's own, and the
first revision of this document wrongly attributed them to the guidelines, so each names its
source:

| Measure | Target | Source | Proposed status |
|---|---|---|---|
| Average sentence length | 15 to 20 words | [OPM plain-language guidance](https://www.opm.gov/information-management/plain-language/) | measured and reported, never gated |
| Longest sentence | under 40 words, no exception | Cutts, Oxford Guide to Plain English | gated per track once the existing violations are cleared |
| Sentence ceiling, admin and editors tracks | 25 words | ASD-STE100, the aerospace industry's controlled-language specification | gated, through a Cairn rule that overrides the vendored Microsoft rule's level |
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

The standard sets structure at three levels, and each level would get its own gate. At the
top, the docs set decides which pages exist. Below it, each page decides its own sections
and their order, and each section decides how one block of text is built. The research behind this compared Diátaxis, DITA,
Information Mapping, Every Page Is Page One, and the reference conventions of PostgreSQL,
MDN, and Rust ([the structure research](proposal-research-structure.md)). Each system
contributes one level, and none is adopted whole.

#### The docs set

Every published page must have one track and one page type. The four tracks stay as they
are. A page type is a named shape, and there are eight: task guide, tutorial milestone,
concept page, reference entry, condition entry, symptom row, index page, and front door. A
page must do one job, must read on its own without the page before it, and must stay on one
level, linking down to a concept rather than explaining it in place. An index must list at
most nine siblings before it groups them.

#### The page

Each page type would get a fixed section order, held in a template under
`docs/internal/templates/`. Decision 4 creates that directory. A new `check:anatomy` script
would read the template, so template and gate cannot drift apart.

Three orders are settled now. A task guide runs title, contract, before you begin, steps,
check it worked, and if it fails. A concept page runs definition, why it exists, how it
works, what it is not, limits, and where to go next. A reference entry runs signature,
summary, parameters, returns, defaults, failure modes, stability tier, example, and see also,
which is the order PostgreSQL and MDN use. Decision 4 defers the other five orders until their templates are
drafted, and approves the three now. A task guide must
stay under 800 words and a concept page under 1,500. No page may name its own type or track.

The front door is a page type of its own, and `why-cairn.md` takes the shape that SQLite's
scope page, Kubernetes' overview, and Astro's "Why Astro" share. The closing checklist is
SQLite's device, and it is what makes the reader decide. The sections, in order:

- your account of where cairn came from
- what cairn does
- where it fits
- what it is not, as its own section
- why this stack
- the trade-offs
- a short checklist the reader answers
- where to go next

#### The section

A section must cover one idea and state it in its first sentence. A list must be grouped
once it passes nine items. A heading that tells the reader to do something must start with a
bare verb, while one that explains must be a noun phrase, and siblings at one level must
share a form. A new `check:headings` script would hold all three rules. The two-headed-heading Vale
rule that landed today,
[`TwoHeadedHeading.yml`](../../../../.vale/styles/Cairn/TwoHeadedHeading.yml), holds one
shape of one fault and nothing more.

### The figure rules

A figure is a diagram or a screenshot. It may appear only where prose would have to state a
relation among three or more parts as a series, or where the fact is a branch between paths.
A set of items must be a table, a linear sequence must be a numbered list, and code the
reader will type must be a code block.

The pages people write set the bar high. Ten of the fourteen pages the structure research
surveyed carry no
explanatory figure, every "why" page carries none, and the reference pages of PostgreSQL,
MDN, and Rust carry none ([the figure survey](proposal-research-figures.md)). Across 24 Astro
docs pages there are two, a box diagram built in CSS on the islands page and one screenshot
in the tutorial's first hands-on step ([the Astro survey](proposal-research-figures-astro.md)).

Across 21 Svelte and SvelteKit pages there are none ([the SvelteKit
survey](proposal-research-figures-sveltekit.md)). Their tutorial uses a live editor in place
of any screenshot. An editors track for readers with no code cannot borrow that, and it is
the one place cairn's docs will carry screenshots the upstream never needed.

The register ruled most of this on 2026-08-15
([the visual-layer rulings](../2026-08-15-docs-visual-layer-rulings.md)), and eleven Mermaid
figures ship under that ruling. Two tests were missing, one in each direction, and the
standard adds them:

- A figure that should not be there. Remove it, and if the text still makes the point
  without a new sentence, the figure was decoration. Then write its text alternative before
  anything else. An alternative that fits in one sentence means the prose should have been
  that sentence, and one that comes out as a table means the figure was a table.
- A figure that is missing. Read each paragraph and ask whether it is the text alternative
  of a diagram nobody drew. Containment words, direction words, and branches inside one
  paragraph are the signal. On a task page, an instruction that says where a control is
  without showing it is a missing screenshot.

Figures are produced in two lanes, and one rule routes between them. A Mermaid fence in the page is the default,
because it renders on GitHub, on the artifact host, and through cairn.pub's theme, and it
diffs. Hand-authored SVG is the exception, taken only when the lesson is arrangement rather
than edges, which is the case for the two ownership figures. Both lanes must draw from one
palette and one typeface. SVG must never be edited in place. It would be emitted from
`docs/internal/site-figures.svg` by `scripts/figures/build-site-figures.mjs`, and neither the
source, the script, nor the emitted assets are committed yet; decision 5 commits them.
Mermaid and hand-authored SVG are the only two lanes.

A script grades part of a figure and a reviewer grades the rest. `check:figures` must grow
from a staleness check to seven assertions:

- the emitted file matches its source
- the smallest text in the rendered figure is at least 12 pixels
- nothing overflows the figure's own box
- text and strokes clear the contrast floor in both color schemes
- every color is a theme token
- the node count stays at or under 15, which fixes the register's "about 15" at a number
- the SVG carries no script, no foreign object, and no external reference

`check:visuals` must close the hole where an image with no alt attribute at all passes
unseen. A fresh-context reviewer, never the drawer, grades the figure by the register's
existing method and records a receipt beside the page. On the front door, the concept figure
does not earn its place under these tests and comes off. The ownership map moves to the
architecture page.

### The corpus

The docs must be compared against pages people wrote, and this document calls that set the
corpus. A band, throughout, is the range a track's corpus entries set for a measurement. The
corpus has these constraints.

- `docs/internal/corpus/` holds one excerpt per entry, at most 400 words.
- A manifest records each entry's source, license, fetch date, page type and track,
  measured numbers, and the date you approved it.
- Two entries per page type is the ceiling.
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
- Figures: the [Raft paper](https://raft.github.io/raft.pdf), Figure 2 and its caption; and
  [Kubernetes, Cluster Architecture](https://kubernetes.io/docs/concepts/architecture/), its
  figure with alt text, caption, and lead-in.

### The review chain

Docs get the chain code has. The steps run in this order, and each names who or what runs
it. A page for a published path is drafted at that path on a branch, never under
`docs/internal/record`; this proposal is not a published page, which is why it lives here.

1. I draft the page where it will live, so Vale and the save hook run the right styles from
   the first save.
2. CI runs the template scripts, `check:anatomy` and `check:headings`, with `check:docs`,
   `check:visuals`, and `check:figures`.
3. CI runs the linters under a severity contract. An error fails the build, a warning shows
   in the review, and a suggestion stays local. A rule may move to error only after every
   existing violation is cleared, which is
   [GitLab's rule](https://docs.gitlab.com/development/documentation/testing/) and the
   reason the 40-word ceiling cannot ship as an error today.
4. The tell scanner reports the sentence numbers, the hinged-pair share, and the
   short-sentence share beside the corpus entry's numbers. Nothing gates on them. The bands
   stay advisory until a track has a thousand sentences from ten documents behind them.
5. `check:provenance` runs on the front door. Every sentence there that states a fact about
   you or about cairn's stance must carry a footnote id, and the script fails on an id that
   does not resolve to a line in the brief.
6. A fresh reviewer grades the page against its corpus entry. The reviewer is a different
   context from the drafter, and a different model family where one is available, because a
   judge from the same family shares the drafter's blind spots
   (the workstation's evidence base at
   `~/.claude/skills/writing-voice/evals/research/2026-09-01-ai-tell-evidence-base.md`).
   Its report carries the page type, the corpus entry, the measurement table, and the
   verdict.
7. You or a volunteer runs the reader test, described next.
8. `check:prose-read` verifies the receipt. A file beside the page carries the page's content
   hash, the measurement table, the corpus entry, the reviewer's verdict, and the reader's
   result, and the gate fails when a published page's hash has no matching receipt.

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
  of Go with no new dependency.
- The Vale hook grades a draft by its path, which step 1 of the review chain makes
  sufficient.
- The review agents change their dispatch shape. The register editor and the voice reviewer
  must be given a corpus entry and must report the measurement table. The diff reviewer runs
  the scanner on docs tasks. A new `figure-verifier` agent grades figures by the register's
  method.
- Two skills. `cairn-figure` holds the production path for figures, and the writing-voice
  skill gains an "author-facing prose" section holding the brief-first, one-section-per-read
  protocol.

## The exclusions

This standard is not a readability gate. Controlled studies since the 1960s have found that
rewriting to a sentence-length number does not improve comprehension
([Redish 2000](https://dl.acm.org/doi/10.1145/344599.344637),
[a 2024 randomized trial](https://link.springer.com/article/10.1007/s11606-024-09200-z)).
The four tracks stay, and no page names its type or cites Diátaxis. The register's existing
rulings on vocabulary, figures, and the front door stand except where this document names a
change.

Revision 1 proposed rewriting the extend track to the bands. This revision proposes one
demonstration instead. `docs/extend/add-a-custom-admin-screen.md`, the worst-measuring extend page at 76 percent
hinged pairs on the fixed instrument, would be rewritten against a task-guide corpus entry.
You would read it beside the original before any pass is planned. The cost review sizes the full pass at six
to nine million tokens and 31 to 73 attended sittings, which is why it is not a decision
below. A second diagram language, a screenshot regime for the developer tracks, and a
pixel-diff suite for figures were each considered and rejected in the figure research for a
stated reason ([figure tooling](proposal-research-figure-tooling.md)).

## The limits

The corpus does not exist yet. Until you approve its entries, the bands are numbers from
five pages and a reviewer's comparison is whatever it fetched. Assembling the corpus is the
first task after approval.

The measurement script, [`measure-prose.mjs`](../../../../scripts/checks/measure-prose.mjs),
defines a hinged pair by four patterns. They are a comma followed by a subordinator or a
relative word, a colon or semicolon followed by text, a spaced dash, and a comma followed by
"and" or "or" when no earlier comma sits in the sentence. That last clause is what excludes
serial lists, and it was added in this revision after the revision 3 grade found the count
inflated by them. The receipt names this definition, and the definition is fixed in the
script before any number becomes a rule. The instrument change moved this document's own
prose figure by ten points between revisions. The cost review found that changing the
sentence splitter moves a track figure by 17 points, wider than the human band. No number
here is a rule yet.

Vale's rule mechanics were tested on the pinned CI version and on the workstation version,
and they disagree. A rule that passes on one and not the other is caught only by the
must-fire fixture, which is why the fixture is not optional. This revision has not been
reader-tested. Revision 4 was, and its paraphrase matched the document; the terms it met
before their definitions are now defined at first use. The register grade of revision 4
raised seventeen findings, and this revision answers each, but the answers are unverified
until the next grade.

## The decisions

Each item can be approved or declined on its own. Small is a file or two, under a quarter
million tokens. Medium is a script or a tuned package, under two million. No item is large;
the one large item, the docs pass, is excluded above. The decisions
come last because a decision list read before its reasoning is a list of unsupported claims,
and Part II's most-important-first rule yields to that on a proposal.

| # | Decision | Size |
|---|---|---|
| 1 | Adopt the Federal Plain Language Guidelines, 2011 revision, as the prose standard, and vendor the PDF | small |
| 2 | Hold the paragraph numbers as gated rules and the sentence numbers as reported measurements | small |
| 3 | Add a Cairn rule that fails a sentence over 25 words on the admin and editors tracks | small for the rule; medium for clearing the 135 admin and 61 editors sentences that exceed it, which must come first under the severity contract |
| 4 | Adopt the three structure levels, the eight page types, three templates now and five later, and the two new scripts | medium |
| 5 | Adopt the two figure tests and the two-lane routing rule, and commit the figure source and script | small |
| 5a | Grow `check:figures` to the seven assertions and close the `check:visuals` hole | medium |
| 6 | Take the concept figure off the front door and move the ownership map to the architecture page | small |
| 7 | Approve the corpus entries above, or name the ones to swap | small |
| 8 | Adopt the review chain and its severity contract | small |
| 8a | Write `check:provenance` and `check:prose-read` | medium each |
| 9 | Adopt the reader test for the roughly forty task guides and the front door | your reading, one page at a time |
| 10 | Approve the Claude setup changes as listed | small, except the scanner change, which is medium |
| 11 | Approve the `render-safety.md` demonstration before any docs pass is planned | small |

## The receipt

Measured with `scripts/checks/measure-prose.mjs` over everything above this section, with
list items included and then excluded, and every hinge form counted, serial lists excluded.
The corpus column measures the SQLite sample the same way. A paragraph that ends with a colon
introduces a list and is exempt from the paragraph floor. Vale ran with the Google package
forced on, since this path is style-exempt, and all three levels are reported.

| Measure | All sentences | Prose only | Corpus entry | Target | Status |
|---|---|---|---|---|---|
| Sentences | 237 | 152 | 6 | | count only |
| Average length | 16.1 words | 17.1 words | 18.7 words | 15 to 20 | pass on both; the all-sentences figure runs lower because it counts list items, which the standard wants short |
| Longest sentence | 38 words | 38 words | 33 words | under 40 | pass |
| Hinged pairs | 35 percent | 38 percent | 0 percent | at or under the corpus entry plus 15 points | fail; 38 against 0. The instrument is unsettled, so this fails as a reading, not as a gate, and the person judging is you |
| Sentences under 8 words | 19 percent | 13 percent | 17 percent | reported | reported |
| Paragraphs over 8 sentences or 150 words | 0 | | | 0 | pass |
| Paragraphs under 3 sentences, list lead-ins exempt | 2 | | | 0 | fail; the two are the paragraphs that carry the paragraph table lead-in and the decisions legend |
| Paragraph lengths, shortest to longest, in sentences | 1 to 7, across 37 paragraphs | | | varied | pass |
| Vale, Google package forced | 0 errors, 25 warnings and 128 suggestions | | | errors 0 | pass on the gate; the warnings are contractions and word-list items from the Google package, which this document does not adopt for itself |
| Tell scanner findings | 0 | | | 0 | pass |
| Three-item lists the scanner counted | 5 | | | each a real list | each checked by hand and each a list of things that number three |

Provenance: the account of the front-door failure is
[front-door-net-failure.md](front-door-net-failure.md); the track measurements are in
[proposal-review-readers.md](proposal-review-readers.md) and, on the fixed instrument, in
this document's own "The failure it answers"; the citation corrections are in
[proposal-review-self.md](proposal-review-self.md) and
[proposal-review-peers.md](proposal-review-peers.md); the revision 3 grade is
[proposal-review-rev3.md](proposal-review-rev3.md) and the revision 4 grade is
[proposal-review-rev4.md](proposal-review-rev4.md).
