# A documentation standard for cairn's published docs

## The standard

The proposed standard is one written rule set for every published page in the cairn
documentation, governing a page at three levels. The prose layer sets the shape of a sentence and
of a paragraph. The structure layer sets which sections a page carries and the order they appear
in. The figure layer sets when a drawing earns its place instead of prose. A track is one
directory of published pages written for one reader, such as
[`docs/editors/`](../../../editors/) for a non-technical author. The standard would cover the
four tracks, the reference, and the front door.

Three instruments would carry the standard. A gate is a check that runs in CI and fails the build
on a violation. The standard would add two gates to the several this repo already runs. The
register is [`docs/internal/docs-register.md`](../../docs-register.md), the existing agent-facing
document governing voice and audience, which the standard would extend rather than replace. The
corpus is a small set of human-written published pages saved in the repository for comparison.
Every review grades a cairn page against one named entry in it.

## The failure behind it

You read the proposed front door on 2026-09-08 and called its prose "pretty ugly... weird AI
cadence and marketing-speak" in a single line of feedback. One heading drew the phrase
"profoundly tortured verbal rhythm" from the same read. That draft had already cleared every
gate this repo runs, plus a register review that graded it B+. The
measurement in [the net-failure record](./front-door-net-failure.md) shows how that happened,
in two halves.

The first half is a routing mistake that kept Vale from running on the draft at all. The draft
lived under `docs/internal/record/`, a path whose style list in
[`.vale.ini`](../../../../.vale.ini) is empty. Graded afterward at a published path, Vale reported
fourteen `WordListCase` warnings and one `Google.Quotes` error. Not one finding touched cadence.

The second half is a real gap in what the checks can see. The tell scanner is `tellgrader`, the
lexical slop checker the `writing-voice` skill runs, and it scored the draft clean at zero tells
per thousand words. Its checks are lexical patterns plus one variance statistic, so a draft
avoiding every listed phrase passes while carrying the rhythm you heard. The record names six
tells the net misses, including balanced two-beat sentences as a paragraph's default rhythm and
abstract nouns standing in for the concrete thing. One of the six was narrow enough for a Vale
rule and is now gated as `Cairn.TwoHeadedHeading`.

The measured docs confirm that the problem outlives that one draft. Sentence-length averages
across the tracks run 16.1 in editors, 20.1 in admin, 23.5 in extend, and 21.8 in reference, from
the measurement in [the readers review](./proposal-review-readers.md). The extend track puts 11
percent of its sentences over 40 words. The reference track's longest single sentence runs to
151 words. The front door itself averages 22.5 words per sentence, higher than every human
specimen those numbers were compared against.

## The working parts

### The prose rules

The rules below would be cairn's own, evidenced against measured specimens rather than borrowed
from an authority. The correction matters because the numbers commonly attributed to the
[Federal Plain Language Guidelines](https://wid.org/wp-content/uploads/2022/03/FederalPLGuidelines.pdf)
are not in them. Its short-sentence section says only to express one idea in each sentence. The
15-to-20 average belongs to [OPM](https://www.opm.gov/information-management/plain-language/)
rather than to the guidelines. The 40-word cap traces back to Cutts's *Oxford Guide to Plain
English*. The former canonical site plainlanguage.gov now redirects to
[digital.gov](https://digital.gov/guides/plain-language), so its stability cannot be claimed
either.

The proposed rules:

- Each sentence carries one claim, with its qualification riding along inside the same sentence.
  The front door and the extend track take that form. The editors and admin tracks take the
  literal split instead, matching W3C COGA's rule that each instruction stands separately.
- Every page holds its average sentence length between 15 and 20 words. Every specimen the
  register already names sits inside that band, including SQLite's *Appropriate Uses* page at
  18.4 words and the Raft introduction at 20.2.
- A per-page allowance replaces the hard ceiling the first round proposed. No page puts more than
  2 percent of its sentences over 40 words. None passes 65 words anywhere in the published
  docs. SQLite runs to 61 words on its most load-bearing sentence and Tailwind to 51, so a flat
  40-word ceiling would fail the very pages cairn grades itself against.
- Every paragraph runs three to eight sentences and stays under 150 words. Each paragraph carries
  one topic and states that topic in its first sentence.
- The editors, admin, and extend tracks address the reader as you, and the reference keeps its
  dry contract prose in the third person.
- No vocabulary rule is added beyond the four track contracts already in the register. Those
  contracts decide which words each reader gets with more precision than an everyday-words rule
  could reach.

Two numbers would be measured and reported without gating anything. A hinged pair is a sentence
built as two clauses joined by a comma coordinator, a semicolon, a colon, or a dash, and its
share of a page locates the cadence you rejected. A band is a numeric range a measure is expected
to fall inside. The bands proposed in the first round rest on 107 sentences from five documents,
with Wilson intervals up to 54 points wide. The single paragraph you have ratified as good
measures 100 percent two-beat at 27 words a sentence, so a band gate would fail your own prose.
The evidence for holding these numbers advisory is in
[the efficacy review](./proposal-review-efficacy.md) and
[the cost review](./proposal-review-cost.md).

One existing rule needs a level rather than a replacement. `Microsoft.SentenceLength` is already
vendored at `max: 30` and `level: suggestion`. It runs on `docs/editors/**` today and fires eleven
times on one editors page. Raising it to error at `max: 25` for editors and admin is a one-line
change against a rule the repo already pins.

Every new numeric rule would ship with a committed fixture that must fire. Testing on the
CI-pinned Vale 3.15.1 showed a per-section numeric override being silently ignored. The same
syntax on 3.20.0 disables the rule outright and reports a clean run. Per-track ceilings therefore
need one rule file per threshold, and a rule with no must-fire fixture cannot be trusted to be
running at all.

### The structure rules

Structure would be set at three levels, following the system in
[the structure research](./proposal-research-structure.md). The docs set decides which pages
exist, the page decides which sections it carries and in what order, and the section decides how
one block of text is built. Each level carries its own rules and its own gate.

At the set level, every published page has exactly one track and exactly one page type. A page
type is a named shape rather than a generic category. cairn would use eight of them, including
task guide, concept page, reference entry, and front-door page. A page whose job changes halfway
down is really two pages and gets split. A page is written to be read alone because readers
arrive from search, from the admin Help link, and from npm.

At the page level, each page type has a fixed section order carried by a template. A task guide
runs contract, preconditions, steps, a check that it worked, and the failure paths. A concept
page runs definition, why it exists, how it works, what it is not, limits, and where to go next.
A reference entry keeps the order PostgreSQL, MDN, and the Rust standard library all share, which
puts the signature first and the failure conditions before the example. A task guide with no
failure section would fail the gate.

At the section level, one bound does most of the work. Nine is the ceiling for steps in a task
guide, items in any list, and siblings on an index page, taken from Horn's chunking principle.
Heading grammar follows what the section does. A section telling the reader to act opens with a
bare infinitive, while an explaining section opens with a noun phrase instead. Sibling headings
at one level share one grammatical form. A page states its type by following it and never by
naming it, which extends the standing ruling against citing Diátaxis in published prose.

The front door would gain the one section it currently lacks. SQLite, Kubernetes, and Astro all
put the negative case in its own named section, and SQLite then closes with a checklist the
reader runs themselves. [`docs/why-cairn.md`](../../../why-cairn.md) carries an argument today
with no decision procedure at the end of it.

### The figure rules

The exemplars set a high bar by carrying almost no figures. Ten of the fourteen pages surveyed in
[the figures research](./proposal-research-figures.md) carry no explanatory figure at all. The
[Astro survey](./proposal-research-figures-astro.md) found two visuals across 24 pages, one of
which is CSS markup rather than an image. The
[Svelte and SvelteKit survey](./proposal-research-figures-sveltekit.md) found none at all across
21 pages, with an ASCII directory tree as the only non-prose visual. Google's own threshold
governs the decision, so an image appears only where it explains something otherwise difficult to
express in words.

The proposed rules:

- Each page type carries a ceiling rather than a quota. A concept page takes at most one figure.
  A reference entry and an index page take none at all. Zero figures is the default at every
  page type.
- Every rejected figure gets a named replacement form. A table carries a set of items with shared
  fields, an ordered list carries a sequence with one actor, and a code block carries what the
  reader will type. Raft's Figure 2 shows a fourth form, a boxed specification that draws
  nothing.
- Any figure the prose points at follows the three-part discipline. A referral in the text names
  the figure number, the figure follows the prose stating its point, and a numbered caption sits
  below it.
- Alt text is a textual equivalent of the figure, capped at 150 characters. Kubernetes'
  control-plane alt names the relation its diagram draws and is the exemplar to copy. A bare
  label is not.
- A complex figure carries its long description inside the page itself. W3C's complex-image
  guidance puts the alternative where a reader can reach it, so a sidecar file nobody opens does
  not satisfy it.
- Mermaid stays the default, with hand-authored SVG as an earned exception. A figure escalates
  only when its lesson lives in arrangement rather than in edges. That is true of the two
  ownership figures and unlikely to be true of a third.

Three defects in the current setup would be fixed in the same change.
[`check:visuals`](../../../../scripts/checks/check-visuals.mjs) matches an `<img>` carrying an
`alt` attribute, so an image with no `alt` at all passes the gate silently. The two SVG authoring
sidecars sit inside a published arm, fail `check:arm-indexes` today, and would ship in the npm
tarball as public pages. The SVG palette is a hand-copied approximation of the Waymark theme's
tokens, tied to its source by a comment alone.

### The corpus

The corpus would live at `docs/internal/corpus/`, one text file per entry beside a
`manifest.json`. Each entry carries its source URL, its license, its fetch date, the page type it
calibrates, the measured numbers for the excerpt, and the date you approved it. Excerpts stay
short at 400 words or less. Two entries per page type is the ceiling on the whole corpus. Nothing in the
directory ships in the npm tarball.

Vendoring the text rather than fetching it buys two things. The five specimen pages extract to
roughly 12,000 tokens per review against about 1,600 for committed excerpts, a twelvefold
reduction on every graded page. Reproducibility is the stronger argument of the two. The same
SQLite page measured 13 sentences in one round and 32 in the next under the same stated method. A
band drawn from re-fetched HTML is not a fixed reference at all.

The proposed opening entries come from the pages already named in the research. SQLite's
*Appropriate Uses* calibrates the front door, and Kubernetes' *Overview* supplies the
what-it-is-not section that cairn's own front door lacks. PostgreSQL's *Concurrency Control* and
*Why Astro* calibrate the concept page. PostgreSQL's `CREATE INDEX` and MDN's `scrollIntoView`
calibrate the reference entry. A GOV.UK guidance page calibrates the editors track, whose reader
has no technical vocabulary and no expert to ask.

### The review chain

A review would grade a page against a named corpus entry and report the measured table beside its
verdict. A verdict citing no corpus id would be returned as incomplete. This is the one mechanism
with a demonstrated hit. The register editor dispatched with five fetched specimens located the
defect exactly and produced the paragraph-level diagnosis your complaint had not.

Two constraints on the chain follow from the evidence. A reviewer from the drafter's own model
family shares its blind spots, with self-preference measured at 0.78 against a 0.5 baseline. The
grading dispatch therefore runs cross-family wherever that is available. Author facts on the
front door come from a written brief, and a claim with no source in that brief is a blocking
finding. The enforceable form of that rule is a footnote id resolving to a line in the brief,
which a script can check without judgment.

### The reader test

ISO 24495-1's test asks whether a reader can find, understand, and use what a page says, a
usability test rather than a statistic. The
[Center for Plain Language](https://centerforplainlanguage.org/most-readability-formulas-outdated/)
states plainly that reader-focused testing is the gold standard and formula scores are not. The
proposed test is a cheap version of the practice at DigitalOcean, whose paid editors run the
tutorial they are editing. One person who is not the author does the thing the page describes,
and the rewrite ordering follows what that person hit rather than distance from a number.

The human read needs a form a gate can verify. A read produces a receipt beside the page,
carrying the page's content hash, the measured table, and the corpus entry it was graded against.
A `check:prose-read` gate would fail when a published page's hash has no matching receipt. That
converts a promise into the failing test this repo's own watch-item rule calls the gold standard.

### The Claude setup

No rule would be added to either `CLAUDE.md`. Both files sit at or over the workstation's own
6,000-token budget hook already, and the project file exits non-zero on that hook today.
Anthropic's [memory guidance](https://code.claude.com/docs/en/memory) targets under 200 lines per
file, and both cairn files run roughly 1.8 times that length. Adding a fourth restatement of a
rule the global file already carries is the intervention least likely to work.

The standard would live where it is loaded on demand. The prose and structure rules go in the
`writing-voice` skill and its register files. The cairn-specific half goes in the register that
every docs pass already reads, with the specimens vendored beside it as text. A draft of a
published page is written at its destination path on a branch, which makes Vale grade it
correctly from the first save and deletes the routing bug with no tooling at all.

## The exclusions

The standard is neither a readability score nor a formula grade that gates anything. A four-arm
randomized trial with 2,235 participants rewrote health materials to four grade levels, varying
only sentence length and word complexity. Mean knowledge scores came back at 9.0, 9.1, 8.9, and
9.1 out of 14 ([JGIM 2024](https://link.springer.com/article/10.1007/s11606-024-09200-z)).
Klare's own image for writing to a formula is lighting a match under a thermometer to warm a
room.

The standard is not a cadence band that fails a build. GitLab's readability rule is deliberately
a measuring instrument for a quarterly audit rather than a merge block. Red Hat's complexity
numbers are advisory too. Both organizations stopped exactly where a gate would begin. Gating a
statistic moves the defect rather than removing it, and this repo has watched that happen twice
in one day.

The standard is not a second prose authority layered over Google and Microsoft. The Vale floor
stays exactly as it is. The register keeps governing what Vale cannot see. Adopting a whole
plain-language standard for a track that Microsoft's guide already covers would buy drift rather
than clarity.

The standard is not a reorganization of the docs into Diátaxis directories. The four tracks are
an audience split. The vocabulary contracts are what protect each reader against the wrong
words. Diátaxis stays a private classifier, unnamed in any published page.

## The limits

The gates cannot catch a monotone. Every measure the standard would report is gameable by the
agent being measured. The predictable next artifact is a page of uniform mid-length subordinated
sentences with no lexical tells in it. Only a read catches that. Describing the mechanical checks
as a net that holds the standard would repeat the claim that just failed.

The cadence measures have no prior art as a gate anywhere in the surveyed field. Their novelty is
a cost rather than a feature, since nobody outside cairn has debugged them. No published result
shows a readability gate improving documentation at a real organization.

The full rewrite is expensive in both budgets. Extend alone runs 31 pages at roughly 2.5 to 3.7
million tokens, and all four tracks run 6 to 9 million, above the ceiling chassis-A carried. One
human read per page converts a 31-page slice into 31 attended sittings, against chassis-A's zero.
The mechanical fixes are cheap and autonomous, so the split in decision 13 keeps the expensive
half capped.

## The decisions

Each row below stands alone. Approving one commits you to no other row. The sizes come from the
measured cost table:

| # | Decision | Size | What it changes |
|---|---|---|---|
| 1 | Numbers report, never gate. Cadence measures ship as advisory locators printed with their intervals | Small | Strikes the band gate from the design |
| 2 | Adopt the per-page ceiling allowance (2 percent over 40 words, none over 65) at error level, one rule file per threshold, each with a must-fire fixture | Small | Three Vale rule files, a `.vale.ini` edit, and a `check:cadence` line in CI |
| 3 | Raise `Microsoft.SentenceLength` to error at `max: 25` for the editors and admin tracks | Small | One line in `.vale.ini` |
| 4 | Decline proselint and write-good | Small | Nothing vendored. 21 usable findings per 144,000 words is not worth 220 KB |
| 5 | Put zero new rules in either `CLAUDE.md`, carrying the standard in the `writing-voice` skill and the register | Small | Keeps both files under the budget hook |
| 6 | Draft every published page at its destination path on a branch | Small | Deletes the routing bug with no tooling |
| 7 | Vendor the corpus at `docs/internal/corpus/` with a manifest and your approval date per entry | Small | Reproducible grades, twelvefold cheaper reviews |
| 8 | Make front-door author facts carry footnote ids resolving to the brief | Small | One script, no judgment involved |
| 9 | Adopt the three-layer structure standard, the templates, and the page-type registry | Medium | Eight template files and one registry |
| 10 | Add `check:anatomy` and `check:headings` | Medium | Two new gate scripts |
| 11 | Adopt the figure rules, finish `check:figures`, and close the `check:visuals` alt hole | Medium | Also moves the two SVG sidecars out of the published arm |
| 12 | Add the read receipt and `check:prose-read` | Medium | Makes the human read verifiable |
| 13 | Run the docs pass in two slices, mechanical first and autonomous, then a read slice capped at 12 pages | Large | Names the attended-sitting count in the plan header |

## The receipt

Measured with
[`scripts/checks/measure-prose.mjs`](../../../../scripts/checks/measure-prose.mjs) over this page
up to this section, beside the same script over the
[corpus entry](./corpus-sample-sqlite.md). Vale ran under the published styles on a copy of this
page at `docs/`, and `tellgrader` ran on the page itself.

| Measure | All sentences | Prose only | Corpus entry | Target | Status |
|---|---|---|---|---|---|
| Sentences | 185 | 154 | 6 | reported | reported |
| Average length | 15.6 | 15.8 | 18.7 | 15 to 20 | pass |
| Longest sentence | 35 | 35 | 33 | under 40 | pass |
| Hinged-pair share | 12% | 13% | 0% | at or under 15% | pass |
| Short-sentence share | 6% | 6% | 17% | reported | reported |
| Long paragraphs | 0 | 0 | 0 | 0 | pass |
| Short paragraphs | 0 | 0 | 0 | 0 | pass |
| Vale errors | 0 | n/a | n/a | 0 | pass |
| Tell findings | 0 | n/a | n/a | 0 | pass |

Vale also reported 11 warnings and 49 suggestions on this page, none of them errors. The warnings are the
product term "admin" and one heading carrying a proper noun. `tellgrader` counted five tricolons
and raised no finding.
