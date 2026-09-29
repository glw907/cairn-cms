# The docs register

This document is the agent-facing standard for cairn's published documentation, its front door,
and the other public surfaces the table in "The base guides" names. Geoff ratified it on
2026-07-18 (spec: `docs/superpowers/specs/2026-07-18-docs-register-standard-design.md`), and the
specimen history lives in the `cairn-pub-front-page-voice` memory. Pass D (2026-08-14) organized
it around the four audience tracks the rebuild ships
([`2026-08-14-pass-d-target-manifest.md`](./record/2026-08-14-pass-d-target-manifest.md) names the
target page set; a page count belongs there, since a number in this document rots). The
style-guide sync (2026-09-28, spec: `docs/superpowers/specs/2026-09-28-style-guide-sync-design.md`)
set every surface on a published base guide, gathered the rules a writer needs into one drafting
brief per guide, and moved the record of each departure into sections only reviewers read.

A drafter receives its guide's drafting brief together with the Names, Visuals, and page-anatomy
sections and the section for its page's track, and it receives nothing else from this document. A
reviewer receives the same sections along with the tightening test, the two tables of recorded
exceptions, and the provenance, which together let it tell a recorded departure from a defect.
The document is itself written in the cairn docs voice, since the style of a prompt steers the
style of what an agent writes from it
([Anthropic's prompting guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).

## The base guides

Each published surface has one base style guide, chosen by whether its reader works in a
terminal. A reader who types commands, whether running the setup command, running the `cairn`
CLI, or building on the seams, reads under the
[Google developer documentation style guide](https://developers.google.com/style). A reader who
works only in the product's UI reads under the
[Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/) (Geoff,
2026-09-28; the mapping `.vale.ini` already carried stands). The base guide governs structure,
grammar, and mechanics, including every rule Vale cannot check. This register overlays that base.
It adds rules where the guide is silent and may tighten a rule the guide leaves open, and it
departs from a guide rule only through a recorded exception, which only Geoff can add.

The following table maps each surface to its base guide and to the drafting brief a writer
follows there.

| Surface | Reader | Base guide | Drafting brief |
|---|---|---|---|
| `docs/admin/` | Sets up and runs the default site, starting from the setup command | Google | Developer docs |
| `docs/extend/` | Builds an organization's site on cairn's seams | Google | Developer docs |
| `docs/reference/` | Looks up a contract, or scripts against the `cairn` CLI | Google | Developer docs |
| The front door: `docs/README.md`, `docs/why-cairn.md`, and the root `README.md` | Every audience, led by the developer | Google | Developer docs |
| `CHANGELOG.md` | A developer reading what an upgrade changes | Google | Developer docs |
| cairn.pub's own prose | A visitor to the rendered docs site | Google | Developer docs |
| `docs/editors/` | Writes on a cairn site through `/admin` and never opens a terminal | Microsoft | Editor docs |
| The admin interface's own copy | An editor at work in `/admin` | Microsoft, UI text | None; `docs/internal/admin-design-system.md` states the voice |
| `CONTRIBUTING.md` and `docs/internal/` | A contributor working on cairn itself | None; unpublished and unlinted | None |

The cairn docs voice, which the developer brief defines, governs every surface whose base guide
is Google. Editor docs take Microsoft's voice, tightened only by the editor brief's own rules.
Admin UI copy takes Microsoft's UI-text voice, tightened to professional and restrained copy with
nothing cute and nothing chatty (Geoff, 2026-09-28), and a departure there is recorded in the
Microsoft exceptions table like any other. The register governs public-facing writing only, and
internal specs, plans, and agent-facing documents take whatever voice works best for Claude Code
(Geoff, 2026-09-28). A Vale finding that is wrong about a specific line is a separate case with
its own procedure, "When a Vale finding is wrong," which corrects a misfiring regex and leaves the
guide untouched.

## Drafting brief: developer docs

This brief governs every page whose base guide is Google: the admin, extend, and reference
tracks, the front door, the changelog, and cairn.pub's own prose. A page takes its structure from
the Google developer documentation style guide and speaks in the cairn docs voice throughout.

### Structure

Structure every page to the Google developer documentation style guide. The following list holds
the rules a draft breaks most often, each quoted from its page in the guide.

- **Procedures.** A sequence of actions is a numbered list with one action to a step, introduced
  by a complete sentence. Google's [highlights](https://developers.google.com/style/highlights):
  "Use numbered lists for sequences." <!-- q:g-numbered-lists --> Its
  [procedures page](https://developers.google.com/style/procedures): "In general, use one step for
  each action." <!-- q:g-one-action --> A procedure of one step is one sentence in a bulleted
  list: "When a procedure consists of only one step, write the step in one sentence and format it
  as a bulleted list." <!-- q:g-single-step -->
- **Ordered checks.** The checks in a verification or failure section run in order, so they form
  a numbered list as well. A paragraph that chains its checks with first, then, and otherwise is
  a procedure written as prose.
- **Location and conditions first.** A step names where the action happens before it names the
  action, and a sentence states its condition before its instruction. The
  [procedures page](https://developers.google.com/style/procedures): "Write in the order that the
  reader needs to follow. State the location of the action before stating the action."
  <!-- q:g-location-first --> The [highlights](https://developers.google.com/style/highlights):
  "Put conditions before instructions, not after." <!-- q:g-conditions-first -->
- **Lists.** Parallel items that need no order form a bulleted list, introduced by a complete
  sentence, with every item parallel in form and opening on a capital letter. The
  [highlights](https://developers.google.com/style/highlights): "Use bulleted lists for most other
  lists." <!-- q:g-bulleted-lists --> The [lists page](https://developers.google.com/style/lists):
  "Introduce a list with a complete sentence, not a partial one that's completed by the list
  items." <!-- q:g-list-intro --> "Use the same syntax/structure for all list items in a given
  list, if possible." <!-- q:g-list-parallel --> "Start each list item with a capital letter,
  unless case is an important part of the information conveyed by the list—such as in a list of
  glossary terms." <!-- q:g-list-capital -->
- **Length where the reader acts.** A step, a list item, and each sentence in a task section stay
  under 26 words. The
  [accessibility page](https://developers.google.com/style/accessibility): "Use shorter
  sentences. Try to use fewer than 26 words per sentence." <!-- q:g-sentence-length -->
- **Heading form.** Headings take sentence case. A task section's heading starts with a bare
  infinitive, such as "Verify the served file" or "Pass the posture to the robots route," and a
  concept section's heading is a noun phrase with no leading -ing word, such as "Robots file
  output" or "Limits of declining." The
  [headings page](https://developers.google.com/style/headings): "For a task-based heading, start
  with a bare infinitive, also known as a plain form or base form verb." <!-- q:g-heading-task -->
  "For a conceptual or non-task-based heading, use a noun phrase that doesn't start with an -ing
  verb." <!-- q:g-heading-concept --> "When possible, avoid using -ing verb forms as the first word
  in any heading or title." <!-- q:g-heading-ing --> The
  [highlights](https://developers.google.com/style/highlights): "Use sentence case for document
  titles and section headings." <!-- q:g-heading-case -->
- **No question or teaser headings.** A heading names its section's subject, and it is never a
  question, a teaser, or a conversational phrase. Geoff killed three such headings from the
  draft docs proof (2026-09-28):
  - Killed: "What each posture emits"
  - Killed: "What declining doesn't buy"
  - Killed: "You know it worked when"
- **Heading structure.** A heading carries no link, the levels never skip, and text always
  follows a heading before the next one. The
  [headings page](https://developers.google.com/style/headings): "Don't put links in headings. A
  link can easily be confused as a style applied to the heading instead of a link."
  <!-- q:g-heading-links --> "Maintain logical order. Don't skip levels of the heading
  hierarchy." <!-- q:g-heading-levels --> "Don't use empty headings. Make sure headings are
  followed by content." <!-- q:g-heading-content -->
- **Code font.** Commands, code identifiers, file names, and paths sit in code font, and UI labels
  sit in bold. The [highlights](https://developers.google.com/style/highlights): "Put code-related
  text in code font." <!-- q:g-code-font --> "Put UI elements in bold." <!-- q:g-ui-bold -->
- **Tables.** A complete sentence introduces every table, and a table of one column becomes a
  list. The [tables page](https://developers.google.com/style/tables): "Introduce tables with a
  complete sentence that describes the purpose of the table because not all screen readers
  preannounce tables." <!-- q:g-table-intro --> "If you have only one column in your table, turn
  the table into a list." <!-- q:g-table-one-column -->
- **Link text.** Link text names its destination and makes sense read alone. The
  [link-text page](https://developers.google.com/style/link-text): "Write link text that makes
  sense without the surrounding text. Don't use phrases such as this document, this article, or
  click here." <!-- q:g-link-text --> "In general, don't use a URL as link text. Instead, use the
  page title or a description of the page." <!-- q:g-link-url -->
- **Directional references.** A reference names its target, never its position on the page. The
  [procedures page](https://developers.google.com/style/procedures): "Don't use directional
  language to orient the reader, such as above, below, or right-hand side. This type of language
  doesn't work well for accessibility or for localization." <!-- q:g-directional -->
- **Notices.** A notice is rare, and it never carries a prerequisite or a step. The
  [notices page](https://developers.google.com/style/notices): "Don't use notes to tell the reader
  about prerequisites or about steps they should have taken earlier. Information like this should
  precede the step." <!-- q:g-notice-prereq --> "Don't make a full procedural step into a note."
  <!-- q:g-notice-step -->
- **A vendor's specifics get a link, never a copy** (Geoff, 2026-08-05). Dashboard navigation,
  plan-availability tiers, expression-language signatures, field references, console walkthroughs,
  and pricing all sit behind a link to the vendor's own page. Whatever cairn copies, cairn owns
  keeping in sync, and a copy goes stale silently, because vendors rename dashboard sections and
  move features between tiers without notice; a restated detail is therefore wrong on a schedule
  cairn does not control, and a reader trusts it precisely because it looks specific. A page
  writes out in full only cairn's own reasoning, which does not drift: why the engine cannot do a
  thing itself, what an architectural choice costs, and which of two mechanisms is the true source
  and which a reconstruction. A vendor is quoted verbatim only for a short load-bearing
  distinction, with the link. A page keeps at most one illustrative snippet, framed as
  illustrative, with the authoritative reference beside it. When two of a vendor's own pages
  disagree, linking one disposes of the conflict that restating both would force the page to
  reconcile.
- **No published page cites Diátaxis**, its terminology, or its arm names (standing ruling, Geoff,
  2026-08-14). A reader does not need the taxonomy a page was planned under. Names such as task
  guide and reference entry belong to the writers and reviewers who plan a page, and a published
  page follows its form without naming it.

### Voice

The docs explain a system to someone trying to use it, and they have no stake in whether the
reader adopts it, so nothing anywhere in them is a pitch. The reader should still come away
impressed by the quality of the thought and the professionalism of the prose, since the writing
does its persuading by being excellent and never by selling. Prose that avoids marketing by
turning flat and featureless fails the reader as surely as a pitch does, and a reviewer flags it
as readily.

- **The cairn docs voice** reads as a technical report or the introduction to a systems paper. It
  is measured and precise, friendly and respectful in the manner of a careful colleague, and free
  of slang, jokes, and casual asides. <!-- x:measured-tone -->
- **Qualified claims stay whole.** Qualification stays inside the sentence that carries the
  claim. In explanatory prose, a sentence carries one qualified claim whole, and it may run past
  26 words when splitting it would separate the claim from its qualification.
  <!-- x:qualified-claims -->
- **A restrained first person** appears only where a sentence states the author's own evidence.
  <!-- x:first-person -->
- **The comparison set** is technical and academic writing, such as SQLite's "Appropriate uses"
  page, a systems paper's introduction, a standards document's overview section, and a mature
  database's own description of itself. The cadence to match is theirs, with longer sentences
  than a blog carries, fewer of them, and each one carrying one qualified claim.
- **Imperatives** address the reader only in steps, task headings, cross-references ("For more
  information, see"), and notices. Chatty asides and staccato runs of short sentences are out of
  register even when every word is true.
- **Product terms** are the precise vocabulary, never jargon to remove: concept, adapter, render,
  seam, island, holding branch, manifest, and role and capability each name a real system object.
  Other jargon is checked against the page's actual reader, so an extend page says "admin,"
  "route," and "frontmatter" freely.

The following concept paragraph, from `docs/extend/choose-an-ai-posture.md`, is the voice at its
most common. It states one limit together with its consequence and hands the detail to the
reference entry that owns it.

> A `robots.txt` file cannot block a fetch, so `'decline'` reaches only crawlers whose operators
> honor it. The [`buildRobots`](../reference/delivery-data.md#buildrobots) entry records which
> operators promise that, which assistants exempt a user-initiated fetch, and why the table leaves
> out search crawlers and any token without first-party documentation.

Killed: the same paragraph flattened into Google's default conversational register. It detaches
each qualification into a short sentence of its own, turns the pointer into an imperative
addressed to the reader outside any step, and drops the qualifier about first-party documentation
on the way.

> Keep in mind that a `robots.txt` file can't block a fetch. It only asks crawlers to stay away.
> This means `'decline'` only works for crawlers that choose to honor it. To see which operators
> do, check out the `buildRobots` entry. You'll also find out which assistants skip the file for
> fetches that you start. And you'll learn why search crawlers aren't in the table.

Ratified-good, for the front door only and the one specimen in the first person: the why-cairn
opener, from Geoff's own account (re-ratified 2026-09-08; the earlier specimen, an editor emailing
changes for the author to commit, was invented and is withdrawn): "Before cairn, the small
organizations I run sites for lived on WordPress, and later on static site generators with a
git-backed editor in front. WordPress was hard to manage and hard to design in, a mass of plugins
and theme customization that resisted integration with anything else, and casual editors found
its block editor confusing." It is concrete, unhurried, and true, and its first person carries the
author's evidence about why cairn exists, which is why a task, concept, or reference page never
borrows that first person. The post-sweep `docs/README.md` is the third exemplar, in the
front-door register.

### Tells

A tell is a habit of generated prose that a reader notices before the content. Each killed
specimen in the following list passed the mechanical gates, since the gates catch slop and miss
flat taste.

- **No marketing claims and no benefit-forward framing.** Every factual claim is literally true.
  Killed: "The whole organization works in one place, content and custom functions sharing one
  admin and one sign-in." It is marketing register, and it is false, since teams are distributed.
- **No figurative language.** The
  [voice and tone page](https://developers.google.com/style/tone): "Avoid figurative language,
  which includes metaphors and ableist language." <!-- q:g-figurative --> A metaphor does the most
  damage in a definitional or structural position, where it defines what something is or names
  the docs' own anatomy.
  - Killed: "writing room" as the docs opener's definition of cairn. Its earlier ratification did
    not save it, and ratification never defends prose against a live read.
  - Killed: "The four arms" as the heading for the docs' own structure, a metaphor dressing the
    docs' anatomy.
- **No prose about the docs' own writing.** The docs never admire themselves. Killed: "Eight words
  the docs use precisely" as the vocabulary intro.
- **No setup-colon triad**, the inline cadence of a clause, a colon, and three parallel items
  ("When something breaks: X diagnoses..., Y explains..., Z maps..."). A sequence of actions or
  checks becomes a numbered list introduced by a complete sentence, parallel options become a
  bulleted list, and only items that are neither fold into plain sentences. Killed: "When
  something breaks: cairn-doctor diagnoses..., the logs explain..., troubleshooting maps..."
- **No em-dash rhythm.** The sentence-final elaborative tail is the tell whatever punctuation
  carries it, so the remedy restructures it into a second sentence instead of swapping the glyph
  for a comma or a colon.
- **No two-headed headings.** A heading of the shape "X, and Y" hangs a second head off a comma,
  and a heading names one thing, so a section with two subjects splits or takes a name for the
  whole. Killed: "The shape, and cairn as one build of it." The `Cairn.TwoHeadedHeading` Vale rule
  fires on the comma-and shape in any heading (Geoff, 2026-09-08). A serial list in a heading, such
  as "Roles, capability, and the access map," is a different form and passes.

## Drafting brief: editor docs

This brief governs `docs/editors/`, the pages an editor reaches through the admin's Help link.
Microsoft's voice governs them unmodified, and the rules in this brief tighten that voice without
departing from it.

### Structure

Structure every page to the Microsoft Writing Style Guide. The following list holds the rules a
draft breaks most often, each quoted from its page in the guide.

- **Procedures.** A sequence of actions is a numbered list, one instruction to a step. The
  [lists page](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists): "Use a
  numbered list for sequential items (like a procedure) or prioritized items (like a top 10
  list)." <!-- q:m-numbered-list --> The
  [step-by-step page](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions):
  "Use a separate step for each instruction. It's OK to combine short steps that occur in the same
  place in the UI." <!-- q:m-separate-step --> "A single step might not require list formatting.
  If you want to use a format that's consistent with step-by-step instructions in the same
  documentation, use a bullet instead of a number." <!-- q:m-single-step -->
- **Ordered checks.** Checks an editor runs in order, such as confirming that a change reached
  the site, form a numbered list as well.
- **Location and conditions first.** A step names where the action happens before it names the
  action, and a sentence states its condition before its instruction. The
  [step-by-step page](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions):
  "Make sure that customers know where the action should take place before you describe the
  action." <!-- q:m-location-first -->
- **Lists.** Items that share a purpose and need no order form a bulleted list, consistent in
  structure, each item opening on a capital letter. The
  [lists page](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists): "Use a
  bulleted list for things that have something in common but don't need to appear in a particular
  order." <!-- q:m-bulleted-list --> "Introduce the list with a heading, a complete sentence, or a
  fragment that ends with a colon." <!-- q:m-list-intro --> "Make all the items in a list
  consistent in structure." <!-- q:m-list-consistent --> "Begin each item in a list with a capital
  letter unless there's a reason not to (for example, it's a command that's always lowercase)."
  <!-- q:m-list-capital -->
- **Length.** Steps and list items stay short. The
  [lists page](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists): "Each item
  should be fairly short—the reader should be able to see at least two, and preferably three, list
  items at a glance." <!-- q:m-list-short -->
- **Headings.** Headings take sentence-style capitalization and parallel structure at each level,
  a heading may be the reader's own question, and text always follows a heading before the next
  one. A heading carries no link. The
  [headings page](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings): "Use
  sentence-style capitalization for headings." <!-- q:m-heading-case --> "Use parallel sentence
  structure for all headings at the same level." <!-- q:m-heading-parallel --> "Don't end headings
  with a period. A question mark or (rarely) an exclamation point can be used if it's needed for
  meaning." <!-- q:m-heading-question --> "Avoid having two headings in a row without text in
  between—that might indicate a problem with organization or that the headings are redundant."
  <!-- q:m-heading-adjacent -->
- **UI names.** A button, a field, or a menu item is named in bold, as the screen shows it. The
  [formatting page](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/formatting-text-in-instructions):
  "When you must refer to a button, checkbox, or other option, use bold formatting for the name."
  <!-- q:m-ui-bold -->
- **Tables.** A complete sentence introduces every table. The
  [tables page](https://learn.microsoft.com/en-us/style-guide/scannable-content/tables): "If
  there’s text that introduces the table, it should be a complete sentence and end with a period,
  not a colon." <!-- q:m-table-intro -->
- **Link text.** Link text names its destination. The
  [URLs page](https://learn.microsoft.com/en-us/style-guide/urls-web-addresses): "Write brief but
  specific and meaningful link text. Use the title or a description of a page rather than a
  generic phrase like click here." <!-- q:m-link-text -->
- **Directional references.** A reference names its target, never its position on the screen or
  the page. The
  [accessibility page](https://learn.microsoft.com/en-us/style-guide/accessibility/writing-all-abilities):
  "Don’t use directional terms as the only clue to location." <!-- q:m-directional -->
- **Notes.** A note carries helpful information the task can do without, and it never carries a
  step or a prerequisite. The
  [headings page](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings):
  "Consider repeating common phrases, such as Tip, Note, and See also, as run-in headings to call
  attention to helpful information, interesting but nonessential information, or cross-references,
  respectively." <!-- q:m-notes -->
- **A vendor's specifics get a link, never a copy** (Geoff, 2026-08-05). A vendor's screens,
  plans, and prices change without notice, so a page that copies them goes stale on a schedule
  cairn does not control.
- **No published page cites Diátaxis**, its terminology, or its arm names (standing ruling, Geoff,
  2026-08-14). A reader does not need the taxonomy a page was planned under.

### Voice

The docs explain a system to someone trying to use it, and they have no stake in whether the
reader adopts it, so nothing anywhere in them is a pitch. The writing earns the reader's trust by
being clear and careful. Prose that avoids marketing by turning flat and perfunctory fails the
reader as surely as a pitch does.

- **Microsoft's voice** is warm, relaxed, crisp, and clear. The
  [top 10 tips](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice): "Avoid
  jargon and overly complex or technical language. It should sound like a friendly conversation."
  <!-- q:m-friendly --> "Lead with what's most important. Front-load keywords for scanning."
  <!-- q:m-front-load --> "Give customers just enough information to make decisions confidently.
  Prune every excess word." <!-- q:m-be-brief --> "Use contractions like it's, you'll, you're,
  we're, and let's." <!-- q:m-contractions -->
- **Plain second person and the imperative in steps.** The
  [writing tips](https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips):
  "Use active voice and indicative mood most of the time. Use imperative mood in procedures."
  <!-- q:m-imperative -->
- **The editor's vocabulary.** A page speaks the words an editor already uses in the admin, and it
  defines on first use any word the editor has not met there.

### Tells

A tell is a habit of generated prose that a reader notices before the content. Each killed
specimen in the following list passed the mechanical gates, since the gates catch slop and miss
flat taste.

- **No marketing claims and no benefit-forward framing.** Every factual claim is literally true.
  Killed: "The whole organization works in one place, content and custom functions sharing one
  admin and one sign-in." It is marketing register, and it is false, since teams are distributed.
- **No idioms or metaphors.** The
  [writing tips](https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips):
  "Avoid idioms, colloquial expressions, and culture-specific references." <!-- q:m-idioms --> A
  metaphor does the most damage where it defines what something is. Killed: "writing room" as the
  docs opener's definition of cairn.
- **No prose about the docs' own writing.** The docs never admire themselves. Killed: "Eight words
  the docs use precisely" as the vocabulary intro.
- **No setup-colon triad**, the inline cadence of a clause, a colon, and three parallel items. A
  sequence of actions becomes a numbered list, parallel options become a bulleted list, and only
  items that are neither fold into plain sentences.
- **No em-dash rhythm.** The sentence-final elaborative tail is the tell whatever punctuation
  carries it, so the remedy restructures it into a second sentence instead of swapping the glyph
  for a comma or a colon.
- **No two-headed headings.** A heading of the shape "X, and Y" hangs a second head off a comma,
  and a heading names one thing. Killed: "The shape, and cairn as one build of it."

## Names

Every part of the system has one sanctioned name, ruled by Geoff after an adversarial review
and a precedent survey (2026-09-21). This section is the record; the `Cairn.Names` and
`Cairn.NamesRetired` Vale rules (`.vale/styles/Cairn/`) enforce what a regex can reach, at
error and warning level respectively, and a writer still checks this table for what a regex
cannot: which sense of "the package" or "the tool" is meant.

<!-- vale Google.Quotes = NO -->
<!-- The quoted strings in this table are literal names and screen text, and moving
     punctuation inside them would misquote them. -->
| Thing | Name | Rule |
|---|---|---|
| The system | cairn, lowercase, in prose | At a sentence start it stays lowercase, and the sentence is rewritten to avoid that where possible (Google's capitalization guide: "If an official name begins with a lowercase letter, then put it in lowercase even at the start of a sentence. But it's better to revise the sentence to avoid putting a lowercase word at the start, if possible."). "Cairn" capitalized appears only inside a quoted UI string, because the admin's wordmark, "Powered by Cairn", and the `Sign in · Cairn` title are capitalized on screen, and a doc quoting the screen keeps the screen's case. |
| The npm library a site imports from | the engine, in prose | Never the compound "cairn engine". The CLI's copy standard (`tool/docs/design/copy-standard.md`) fixes the same word for operators. |
| The same, as an artifact | `@glw907/cairn-cms` where the reader types or reads it; the package for facts about the tarball, its files, install, and module resolution | "The package is ESM-only" is a package fact; "the engine renders the preview" is an engine fact. |
| The Go CLI | the `cairn` CLI; a command always carries its verb: `cairn health`, `cairn adopt` | No bare "the CLI" (Google's word list: "Don't use CLI generically"; the docs name five CLIs). A bare `` `cairn` `` code span is an identifier prefix (the ambient `cairn` namespace, the `cairn/<concept>/<id>` holding branch), never the command. Google's code-in-text guidance: "use code font for the command and ordinary font for the name of the project or product." |
| The scaffolder | `create-cairn-site` on first mention on a page, then the setup command | A code identifier is not a sentence subject twenty times on a non-developer page. |
| Other npm bins | `cairn-audit`, `cairn-guidance`, `cairn-doctor`, always by name | |
| The editing surface | the admin; `/admin` for the path | |
| The docs | the docs for the content; cairn.pub for the rendered site; the shipped docs for the copy in the tarball | |
| The consumer's site | your site, or a cairn site | |
| Also named | the GitHub App; the Worker | |
| Retired as names | the library (the word stays for the media library and the content library); the Go tool; the binary, except for the install artifact itself; a bare "the tool" | |
<!-- vale Google.Quotes = YES -->

**The precedent this expresses by font instead of case.** Git's own contributor guide draws the
same line by sense, not by regex: "Use 'git' (all lowercase) when talking about commands ...
and 'Git' when talking about the version control system" (`Documentation/CodingGuidelines`).
cairn's brand is lowercase even as a proper noun, so it cannot split the same way by
capitalization; it splits by font instead, a bare code span for the identifier prefix and
plain lowercase prose for the system.

<!-- vale Google.Quotes = NO -->
<!-- "Powered by Cairn" here is the bare-quoted form the paragraph names, and moving its
     period inside would misquote it. -->
**Enforcement and scope.** `Cairn.Names` (error) catches "the Go tool" and a stray capital
"Cairn" in prose. `Cairn.NamesRetired` (warning) flags "the tool," "the package," "the
binary," and "the CLI" for a second look, since each is still the right word in the sense the
table above carves out; a warning is a prompt to check the sense, not an automatic rewrite.
The rule's escape for the quoted-UI exception is code font: a quoted screen string goes in a
code span (`` `Powered by Cairn` ``), which Vale skips, and that is the sanctioned form, never
a bare-quoted "Powered by Cairn". The rule's `\bCairn\b` also matches the prose word "Cairn"
inside a slash path like "Cairn/x"; that is fine, because every real path in published prose
already sits in a code span, so the rule never sees it as prose to begin with.
Existing pages on a narrative arm still frozen (`docs/admin/`, `docs/editors/`,
`docs/extend/`) are swept at that arm's own stage merge, never before; a pass touching a
still-frozen page for an unrelated reason does not take on a naming sweep of the whole page. A new page, or a page
already open for an unrelated edit, writes to this table now. `tool/docs/` sits outside
`.vale.ini`'s scope for the same reason: its pages move under `docs/` in draft docs pass A, and
the Names rule reaches them once they do.
<!-- vale Google.Quotes = YES -->

## Visuals (every page that carries one)

The visual layer's governing decisions live in the 2026-08-15 sitting record
([`2026-08-15-docs-visual-layer-rulings.md`](./record/2026-08-15-docs-visual-layer-rulings.md));
the per-track vocabulary and per-page contracts live in
[`2026-08-15-docs-outlines-with-visuals.md`](./record/2026-08-15-docs-outlines-with-visuals.md).
This section carries the rules a writer needs at the page, so the records stay records.

- **A visual earns its place or is absent.** Google's threshold governs: an image appears only
  where it explains something otherwise difficult to express in words, and it replaces prose
  rather than joining it. Never an image of text, code, or terminal output; a transcript is a
  fenced block traced to a recorded run, and invented output never ships. A vendor's UI is
  never pictured, since a vendor's specifics get a link and never a copy, in an image as in
  prose.
- **Alt text is mandatory.** Every image carries `alt`; a decorative image gets `alt=""`, never
  an omitted attribute. At most 150 characters. Start by naming the kind (diagram, screenshot,
  reproduction), never "Image of," and describe what the reader learns in context, not what the
  pixels depict. The exemplars: MDN's "The settings icon is in the navigation bar below the
  search field", and Kubernetes' control-plane alt naming the relationship the diagram draws.
- **Every authored diagram and live reproduction carries a caption.** Complete sentences,
  carrying the code-verified facts the page's contract assigns to it, never redundant with the
  alt, never referenced spatially ("the image above"). Figure numbering only where the page
  cross-references the figure from elsewhere in its text.
- **A complex diagram gets a two-part text alternative.** Short alt for the kind and gist; the
  essential information stated in body text. The prose a diagram's contract preserves is that
  text. The authored form (fixed 2026-08-15 at the diagram-pages plan review): the accessible
  name and gist live IN the fence as mermaid's native `accTitle:` and `accDescr:` directives,
  and the caption is the first non-blank line after the closing fence, one emphasis paragraph
  (`*...*`) of complete sentences. The renderer must surface the authored directives to
  assistive technology, never override them with a generic label.
- **A `repro` fence departs from that caption form in two ways.** First, the caption lives INSIDE
  the fence body, as the `caption` key, rather than as the emphasis paragraph after the fence: the
  body must be self-describing where the plugin does not run (GitHub, the tarball), and the
  rendered `<figcaption>` wears the same visual treatment as a diagram caption, so a page carrying
  both reads as one system. Second, widths are where reproductions and diagrams part company: the
  320/390 bar that the diagram rule in this section exempts diagrams from still binds every live
  reproduction, which is what a `repro` fence's `width` key exists to satisfy.
- **A decorative image is authored as HTML** (`<img alt="" ...>`) so the empty alt is visibly
  deliberate; markdown image syntax (`![...]`) always carries real alt text.
- **Diagrams follow the three-part discipline, and the 320/390 bar does not apply to them.**
  This departs from the family responsive standard, not from a base guide, and Geoff ruled it on
  2026-08-15 on the evidence that WCAG 1.4.10 exempts diagrams from reflow by name and prescribes
  a text alternative, and that no platform or style guide binds diagram legibility at 320px. In
  its place, each diagram keeps a complexity budget (about 15 nodes; split or simplify past it),
  scrolls inside its own `overflow-x: auto` figure at narrow widths rather than shrinking, and
  carries the two-part text alternative. The bar still binds live reproductions and every
  non-docs family artifact.
- **Diagrams render in cairn's own theme.** Mermaid is the authoring form; the stock `neutral`
  render never ships, and a diagram the themed render cannot carry at the polish bar is
  hand-authored SVG, never a drawing-tool screenshot.

The mechanical half of this section (alt presence and length, explicit decorative marks,
caption presence, the mermaid description marker) is enforced by a `check:` gate that lands
with the first shipped visual, in the missing-alt-is-a-build-failure shape; until that gate
exists, review carries these rules by hand.

## The page anatomies

Each track builds its pages from a small set of reproducible shapes. A page states which
anatomy it follows by following it, not by naming it; the shapes below exist so a writer or
reviewer can check a page against a checklist rather than a feeling.

- **Task guide** (most admin and extend pages). Its sections run in the following order:

  1. A one-line contract naming what the reader accomplishes.
  2. Preconditions, each stated with a link to whatever produces it.
  3. The steps, as a numbered list with one action to a step and the location named before the
     action. A procedure of one step is a single bulleted item.
  4. A verification section, headed with a bare infinitive such as "Verify the served file,"
     that names the observable result. Checks the reader runs in order form a numbered list.
  5. Failure paths that point at the track's recovery surface (`admin/setup-recovery.md`,
     `admin/troubleshooting.md`, or `extend/debug-your-site.md`) rather than restating recovery
     prose inline. Ordered diagnostic checks form a numbered list here too.

  Explanation stays subordinate to the steps. A guide carries only the explanation a reader
  needs to choose or verify, and each such section opens with a sentence tying it to the task,
  so the page never turns from instruction to exposition without a lead-in. Anything more (a
  full output listing, the behavior's limits, its rationale) belongs on the reference entry or
  its own page, linked from the step that needs it.
- **Tutorial milestone** (the extend track's deep path): stated objectives, the state the
  prior milestone produced, steps, a checklist before advancing, and a disclosure block (the
  Astro "Show me the steps" device) for a reader who wants to try first and check the answer
  after.
- **Reference entry** (`docs/reference/`): the existing gated template (signature, parameters,
  defaults, failure modes), now opening with a short narrative lede, a sentence or two of
  what the shape is and why it exists, before the table. The lede is additive to the gates,
  not a replacement for them.
- **Condition entry** (`admin/is-it-working.md`): a condition id matching the doctor's
  registry, what the check reads, what a failure means in plain terms, the remedy, and the
  anchor slug the id resolves to, which must survive a page edit since `check:readiness`
  gates it against the built condition registry.
- **Symptom row** (`admin/troubleshooting.md`, `extend/debug-your-site.md`): what the reader
  sees, the log event that correlates (linking `reference/log-events.md`), what it means, and
  the fix, with a row that needs code changed saying so and pointing at the extend track's
  debugging page instead of a false promise of a purely operational fix.

## The four tracks

Every published page belongs to exactly one track, every track serves exactly one profile,
with the one exception the scripter-or-agent profile below carves out of the reference arm
(the full track profiles: [`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md)),
and a page review grades the page against its profile. The five elements below are what a
reviewer needs without opening the profile document: which reader the track claims, the
vocabulary contract, how the reader arrives, the success criterion, and the question that
kills a page serving the wrong reader.

### The editor track (`docs/editors/`)

**Profile:** a non-technical author who writes on a cairn site through `/admin`. **Base
guide:** Microsoft, since this reader works only in the product's UI. **Register:**
outcome-first task prose in plain second person; the fear behind a task ("did I just break the
site?") answered before the mechanics. No outbound links to any other track: `cairn.pub/help`
renders this track alone, so a reader following a link never leaves the surface they
understand.

**Vocabulary contract.** Free: your site, the editor, draft, save, publish, entry, page,
post, image, tag, sign-in link. Defined on use: markdown (as "the plain-text formatting the
editor previews for you"), fields (the boxes above the text), the media library. Banned:
repo, commit, branch, merge, deploy, build, frontmatter, markdown syntax names (say "a
heading," not "an H2"), any Cloudflare or GitHub noun.

**Arrival state.** Through the admin's Help link, usually mid-task and sometimes
mid-frustration; on whatever device the admin is open on; never through GitHub, npm, or the
repo.

**Success criterion.** The task is done without opening another tab and without asking a
developer, and the reader can say afterward what state their entry is in.

**Counterpart question:** could a person who has never used a terminal complete this page's
task with only the admin open, and does any sentence assume otherwise?

### The admin track (`docs/admin/`)

**Profile:** a technical non-developer who sets up and runs the default site. **Base guide:**
Google. **Register:** outcome-first headers; money, prerequisites, and the free-until boundary
stated before the step that incurs them; the task guide anatomy throughout.

**Vocabulary contract.** Free: command, terminal, account, dashboard, domain, email, sign
in, your repository (glossed once as "where your content lives on GitHub"). Defined on use:
DNS and nameservers, zone, deploy, Workers (as "where your site runs"), D1/R2 only if a step
shows them. Banned: adapter, seam, schema, frontmatter, island, runes, TypeScript, any
engine-internal name. Every command shown is copyable as printed and traces to a recorded
run.

**Arrival state.** Through the root README or word of mouth, deciding to create a site, or
inheriting a running site someone else created; `create-cairn-site` is the setup spine, and
the docs narrate and recover it, never replace it with hand-authoring.

**Success criterion.** The default site is live and healthy with zero code authored, and
every failure the reader can hit ends in a named next step classified wait, act, or ask a
developer.

**Counterpart question:** is any step's success dependent on knowledge the page did not
state, and is any cost or prerequisite revealed after the step that incurs it?

### The extend track (`docs/extend/`)

**Profile:** a Svelte-fluent web developer building an organization's site on cairn's
seams. **Base guide:** Google. **Register:** contract-first task, tutorial, and concept
prose; this reader is fluent in their own stack and resents padding or hand-holding on it.

**Vocabulary contract.** Free: the full developer vocabulary, plus cairn's product terms
(concept, adapter, render, seam, island, holding branch, manifest, role) defined once in the
track and used precisely after. Nothing is banned; imprecision is. A vendor's specifics get
a link, cairn's own reasoning gets prose.

**Arrival state.** Through npm, GitHub, or the root README, often evaluating cairn against
alternatives, or taking over a scaffolded site and wanting to know what the tool wrote and
why. This reader skims first and judges quickly.

**Success criterion.** They extend the site without reading engine source, every documented
snippet typechecks against the built package, and an upgrade is a read of the changelog, not
an archaeology session.

**Counterpart question:** does the page state the contract and its stability tier rather
than narrating implementation, and would a competent SvelteKit developer find any sentence
here that their own stack's docs already own?

### The contributor zone (`CONTRIBUTING.md` and `docs/internal/`)

**Profile:** an experienced library-flavored engineer working on cairn itself. **Base
guide:** none; this zone is unpublished, and Vale does not lint it. **Register:**
engineer-to-engineer, invariants stated flatly, history linked rather than restated.

**Vocabulary contract.** Unrestricted, including internal names (the chassis, the bake, gate
names, the charter), provided the zone's index defines or links each on first use.

**Arrival state.** Through `CONTRIBUTING.md`, holding a patch impulse or an issue, usually
already having read some source. Nothing this reader needs ships in the tarball.

**Success criterion.** A first PR clears the gates without a maintainer explaining an
unwritten rule, and the contributor can answer "is my idea cairn's job?" from the boundary
docs alone.

**Counterpart question:** does the zone separate the living standard from the record, and is
every invariant the contributor could violate either a gate or a written rule the index
surfaces?

## The reference (`docs/reference/`), a shared instrument

Spare contract prose in the third person: signature, parameters, defaults, failure modes, now
with a short narrative lede (the reference-entry anatomy). No arrival state or vocabulary
contract of its own except for the three pages named below; it is the extend track's and the
admin track's shared lookup surface (the index's "also for site admins" grouping names
`doctor`, `log-events`, and `supported-toolchain`), and the one place the engine contributor's
zone points a reader outward to rather than restating. Reference stays rigid and gated: the
four existing gates (`check:reference`, `check:reference:signatures`, `check:snippets`,
`check:readiness`) are the structural answer to reference drift, the category's loudest
documented complaint.

### The scripter-or-agent profile

This overturns the 2026-08-14 ruling, above and in
[`2026-08-14-audience-profiles.md`](./record/2026-08-14-audience-profiles.md), that every track
serves exactly one profile and the reference arm has none (Geoff, 2026-09-21). Three pages
carry this profile and no others do: `docs/reference/cli-cairn-exit-codes.md`,
`docs/reference/cli-cairn-json-output.md`, and `docs/reference/cli-cairn-doctor.md`. No agent
track is added, and `cairn help agents` stays the agent's primary surface; these pages are
what a `--json` help line, that command, or an admin page's link sends a reader to next.

**Profile:** anyone automating against `cairn`, a person writing a script or an agent.

**Vocabulary contract.** Fully technical. Nothing is banned; imprecision is the defect.

**Arrival state.** From `cairn help agents`, a `--json` help line, an admin page's link, or a
failed run with an exit code or a parse error already in hand.

**Success criterion.** They can branch on every exit code and parse every payload without
running the tool.

**Counterpart question:** could a reader write a correct wrapper and parser from this page
alone, and does any behavior require running the tool to learn?

## The front door (`docs/README.md`, `docs/why-cairn.md`, and the root `README.md`)

The fifth register case, alongside the four tracks. These three pages are where every
audience lands, and they carry the whole cairn story.

- **Five routes, not four, in the first screenful.** The evaluator route comes first
  ("deciding whether cairn fits" → `docs/why-cairn.md`), then editor, admin, extender,
  contributor, in that order. One copyable `create-cairn-site` command sits above the routes.
  No Diátaxis citation appears anywhere, and the root README's own positioning sections sit
  below the command and routes, for the same reason a pitch never leads.
- **Primary persona: the seasoned developer serving an organization.** Most readers are
  developers, and jargon-stripped prose would cost the tool their respect. The full story is
  complex and nuanced, and lands completely only with this reader; write to them and do not
  flatten the story.
- **Legibility floor:** an intelligent, technically savvy editor can still get the gist.
  Technical terms appear where they carry information (SvelteKit, git-backed, markdown, npm
  dependency), with context or a short apposition doing the glossing rather than avoidance.
- **The editor's arrival path is a requirement.** An editor who lands here must find
  `docs/editors/welcome.md` without hunting, and must walk away with a general understanding
  of what cairn is even where the specifics pass them by. The "If you write for a site built
  on cairn" routing line stays prominent and early.
- **The content anchor** (Geoff, 2026-07-18, near verbatim): cairn is both a polished,
  editor-first, git-backed, Cloudflare-hosted CMS and a modern SvelteKit toolkit that a
  developer can extend to support their organization. It takes the position that content
  editors are often the very same people who drive an organization forward, and that by
  extending the CMS interface, a developer or development team can build a streamlined and
  productive tool for their organization. Part of that offer is concrete: cairn gives the
  developer a UI toolkit to extend, so admin additions come together quickly and share one
  coherent user experience. That combination of technical architecture, out-of-the-box
  features, and editor-first approach is the substance the page explains.
- **Concrete extension examples belong here.** The extensibility claim lands through
  examples of the kinds of things a developer could build on cairn's seams: member signups,
  reservations, rosters, event and program management, and other member-facing tools for a
  small organization. Name types of functionality, never a specific consumer site. Examples
  state what could be built; they never pitch.
- **Stack reasoning is welcome.** Explaining why cairn uses SvelteKit, DaisyUI, and
  Cloudflare is in-register here, in short form; the full argument, including the honest
  trade-offs, stays in `docs/why-cairn.md`.
- **The author's own frame, not a reconstructed one.** Any "why cairn" prose traces to Geoff's
  account of why cairn exists and who it serves:
  `record/2026-09-08-polish-inputs/front-door-author-brief.md`. Read it before drafting or
  reviewing the front door or any audience-facing rationale. The audience spans small
  organizations through large ones already committed to Cloudflare (the brief's 2026-09-22
  amendment), never only small ones.
- **A comparison never strawmans the alternative (Geoff, 2026-09-04).** When a page or figure
  contrasts cairn with a traditional CMS or a conventional stack, the other side is drawn as a
  competent setup a good team would build: a managed CMS host bundling hosting, database, and
  backups is one box, a member-management product is a mature tool. Its real advantages (mature
  editorial features, a relational content database, independently replaceable tools,
  specialist vendors) are stated in the same factual voice as cairn's, and cairn's own
  trade-offs sit beside them: extending it means custom code (a developer, not a plugin
  marketplace), content is files so relational queries are the developer's job, and one
  platform account is one vendor. A drawback gets its factual counterweight beside it, never a
  grading word; the custom code is scaffolded (`create-cairn-site`, documented seams, the agent
  skills in the package) on widely documented technology that GitHub and Cloudflare publish
  agent tooling for. The lesson is different shapes with different trade-offs, cairn collapsing
  several concerns into one app on one platform, and no vendor is named. This extends the
  no-pitch keystone from prose to comparisons.
- The front door carries the cairn docs voice at its fullest, `docs/why-cairn.md` above all.

## When a Vale finding is wrong

Vale is a floor, not an authority. Its style packages are regexes and heuristics tuned against
generic prose; they do not know a document identifier from a measurement, or a literal rendered
string from a quoted opinion. When an error-tier finding is checked against the actual text and
turns out wrong, it stays wrong no matter how insistently the gate reports it, and the finding
gets a scoped and commented suppression or markup that says what the token actually is. **It
never gets a content change that alters a citation, a literal string, or a quoted message.**
Rewriting the words to satisfy a linter is the same defect as rewriting them to satisfy a
reviewer who misread the sentence: the words were right, and now they are not.

Two worked examples, one resolved by markup and one by suppression, so the choice between them
is demonstrated rather than described:

<!-- vale Google.Units = NO -->
<!-- The second example cites SP 800-63B, a document identifier, not a measurement. -->
- **A literal rendered string, fixed by markup.** `admin-grammar-tokens.md`'s wordmark row
  documented that a keming defect made the wordmark render as "Caim," and the surrounding
  double quotes read to `Google.Quotes` as ordinary prose, which wants the trailing period moved
  inside the closing quote. Moving it would have said the wordmark rendered a trailing period,
  which it did not: the quoted material was not an aside being quoted, it was the literal output
  a reader could see on screen. The fix is not the punctuation move; it is naming the string as
  a literal, with inline code spans (`` `Cairn` `` and `` `Caim` ``) instead of double quotes.
  Vale skips code spans, the rule stops firing because there is no quoted prose left for it to
  read, and the markup now says the true thing: these are rendered characters, not a remark.
- **A document identifier, fixed by suppression.** `auth-channel-security-model.md` cites "NIST
  SP 800-63B," the actual name of a real standards document (the Digital Identity Guidelines
  volume on Authentication and Lifecycle Management), and `Google.Units` read the trailing
  `63B` as a number glued to a unit, wanting a nonbreaking space inserted between them. There is
  no markup fix here: a standards citation is not code, and splitting the identifier to satisfy
  the rule would rename the document to something that does not exist. This takes Vale's inline
  suppression, scoped to the one rule and the smallest span that covers the citation, with a
  comment stating why:

  ```
  <!-- vale Google.Units = NO -->
  <!-- SP 800-63B is a document identifier, not a measurement. -->
  ...the line...
  <!-- vale Google.Units = YES -->
  ```
<!-- vale Google.Units = YES -->

A suppression names one rule (`Google.Units`, never a bare `vale = NO`) and carries a comment
explaining why the finding does not apply; a blanket disable hides every future finding on that
span, real or not, and is never the fix. Confirm a suppression actually takes effect by running
the gate with and without it, the same falsifiability standard every gate in this repo is held
to, rather than trusting the syntax on sight.

## The tightening test

A rule in this register either tightens its base guide or departs from it, and the difference
decides whether the rule needs Geoff's ruling (Geoff, 2026-09-28). A tightening forbids only a
form the guide permits or is silent on, and it needs no record. A rule that forbids a form the
guide prescribes or recommends is an override, and so is a rule that permits a form the guide
forbids; either one exists only as a row in the recorded-exceptions table for its guide. A
register rule that fails this test and has no row is a blocking finding against the register.

Only Geoff adds a row. A row names the base rule it overrides, what cairn does instead, the
evidence, and the date of his ruling. Evidence is what a writer brings to Geoff when proposing a
row, and it never licenses a departure on its own authority, whether in this document or in a
page's contract. The procedure in "When a Vale finding is wrong" is a different case, since it
corrects a regex that misreads a line and leaves the guide's rule untouched.

The developer brief shows both kinds. Restricting imperatives to steps, task headings,
cross-references, and notices forbids what Google permits and prescribes nothing Google asks for,
so it is a tightening. The measured tone forbids the conversational register Google's tone page
recommends, so it is an override and carries a row.

## Recorded exceptions: Google

Each row in the following table records one departure from a Google rule. The first column names
the brief passage the row governs, which carries an HTML comment holding the same `x:` id, and a
dormant row, which governs no passage today, carries the word dormant in that column instead.

| Passage | Base rule | What cairn does instead | Evidence | Ruling |
|---|---|---|---|---|
| x:measured-tone | [Voice and tone](https://developers.google.com/style/tone): "Use a voice that's casual, natural, and approachable, not pedantic or pushy." and "But, aim for a conversational tone rather than a formal one." | Pages read as a measured, precise technical report. Google's friendly and respectful manner stays, with no slang and no jokes. | Geoff's 2026-09-08 voice ruling; the 2026-09-28 draft docs proof, whose tone succeeded while its defects were structural | Geoff, 2026-09-28 (rulings 3 and 10) |
| x:qualified-claims | [Accessibility](https://developers.google.com/style/accessibility): "Use shorter sentences. Try to use fewer than 26 words per sentence." | An explanatory sentence may run past 26 words when splitting it would separate a claim from its qualification. Steps, list items, and task sections stay under 26 words, and a step or list item over that length is a blocking guide finding. | The same ruling and proof; the guidance is an accessibility rule, so it holds wherever the reader acts | Geoff, 2026-09-28 (rulings 3 and 10) |
| x:first-person | [Pronouns](https://developers.google.com/style/pronouns): "Avoid first-person pronouns (I, we, us, our, and ours) except in the following contexts:" | The author uses a restrained first person where a sentence states the author's own evidence, and `.vale.ini` turns off `Google.FirstPerson` on every Google surface. Google's own list admits a document whose author comments in the first person, and the row records the rule's removal from the gate. | The authorial first person is the register for design decisions | Geoff, 2026-07-02 |
| dormant | [Periods and other end punctuation](https://developers.google.com/style/exclamation-points): "In general, avoid exclamation points." | The root README may carry Geoff's voiced headings, such as `Love your editors!`, and `.vale.ini` holds `Google.Exclamation` at warning for `README.md`. The README carries no such heading today. | Geoff's sanction of his own voiced headings | Geoff, 2026-07-02 |

## Recorded exceptions: Microsoft

No departure from a Microsoft rule is recorded. This table also governs admin UI copy, whose
voice `docs/internal/admin-design-system.md` states, so a departure in either surface lands here
as a row of the same shape as the Google table's.

| Passage | Base rule | What cairn does instead | Evidence | Ruling |
|---|---|---|---|---|

## Provenance

This section records where the briefs' rules come from, so a reviewer can tell a recorded
departure from a defect. The drafter never receives it.

### The cairn docs voice

Geoff ruled on 2026-09-08 that cairn's public-facing writing is technical and academic, and the
draft docs proof of 2026-09-28 confirmed the tone while exposing structural defects the base
guide would have caught. The style-guide sync kept the tone and restored the structure. The
voice is defined positively, as one whole, so that a drafter reproduces it from the brief alone
and never assembles it from Google's defaults minus a list of prohibitions (Geoff, 2026-09-28,
ruling 11). The following table names each Google rule the voice departs from and the ruling
behind the departure.

| Google rule | Departure | Ruling |
|---|---|---|
| [Voice and tone](https://developers.google.com/style/tone): a conversational, casual register | A measured technical-report register | Rulings 3 and 10, 2026-09-28 |
| [Accessibility](https://developers.google.com/style/accessibility): fewer than 26 words per sentence | Explanatory sentences may run longer to keep a qualified claim whole | Rulings 3 and 10, 2026-09-28 |
| [Pronouns](https://developers.google.com/style/pronouns): avoid the first person | A restrained authorial first person on the author's own evidence | 2026-07-02 |

The rest of the developer brief tightens Google and needs no row. Restricting imperatives to
steps, task headings, cross-references, and notices is a tightening, and so are the ban on
question and teaser headings and every tell. The figurative-language rule adopts Google's own ban
in place of the register's earlier allowance for an explanatory metaphor (Geoff, 2026-09-28,
ruling 8), and the "writing room" and "The four arms" specimens stay as illustrations of it.

The editor brief departs from nothing in Microsoft (ruling 4). Its tightenings are the no-pitch
keystone, the tells that pass the tightening test against Microsoft, and the Names rules. Three
developer-brief rules fail that test on the editors track and stay out of the editor brief: the
ban on staccato runs of short sentences and the longer cadence it implies, which contradict
Microsoft's "Shorter is always better," and the ban on question headings, which contradicts
Microsoft's allowance for the reader's own question. The editor brief carries no academic
framing.

### Specimens

The developer brief's concept paragraph is `docs/extend/choose-an-ai-posture.md` lines 23 to 26
as merged at `8bbe78f5`, the proof page whose tone Geoff's ruling says worked. The killed
flattened version beside it was written for this register to show that failure. The
structure-plus-voice specimen, a task section's lead-in sentence and a numbered step, joins the
developer brief once the rebuilt trigger page has passed Geoff's read.

### Guide quotes

A brief quotes a guide rule as one double-quoted span followed by an HTML comment holding `q:` and
the quote's id. The row with the same id in the following table carries the source text byte for
byte, without the enclosing quotation marks, compared with every run of whitespace collapsed to a
single space. Each quote was fetched from the live page with `curl` and `pandoc` on the date
shown, from the guide's body text and never from Google's AI-generated Page Summary block. A
change to a quote changes the brief and this table in the same commit.

| Id | Source text | Page | Fetched |
|---|---|---|---|
| q:g-numbered-lists | Use numbered lists for sequences. | https://developers.google.com/style/highlights | 2026-09-28 |
| q:g-one-action | In general, use one step for each action. | https://developers.google.com/style/procedures | 2026-09-28 |
| q:g-single-step | When a procedure consists of only one step, write the step in one sentence and format it as a bulleted list. | https://developers.google.com/style/procedures | 2026-09-28 |
| q:g-location-first | Write in the order that the reader needs to follow. State the location of the action before stating the action. | https://developers.google.com/style/procedures | 2026-09-28 |
| q:g-conditions-first | Put conditions before instructions, not after. | https://developers.google.com/style/highlights | 2026-09-28 |
| q:g-bulleted-lists | Use bulleted lists for most other lists. | https://developers.google.com/style/highlights | 2026-09-28 |
| q:g-list-intro | Introduce a list with a complete sentence, not a partial one that's completed by the list items. | https://developers.google.com/style/lists | 2026-09-28 |
| q:g-list-parallel | Use the same syntax/structure for all list items in a given list, if possible. | https://developers.google.com/style/lists | 2026-09-28 |
| q:g-list-capital | Start each list item with a capital letter, unless case is an important part of the information conveyed by the list—such as in a list of glossary terms. | https://developers.google.com/style/lists | 2026-09-28 |
| q:g-sentence-length | Use shorter sentences. Try to use fewer than 26 words per sentence. | https://developers.google.com/style/accessibility | 2026-09-28 |
| q:g-heading-task | For a task-based heading, start with a bare infinitive, also known as a plain form or base form verb. | https://developers.google.com/style/headings | 2026-09-28 |
| q:g-heading-concept | For a conceptual or non-task-based heading, use a noun phrase that doesn't start with an -ing verb. | https://developers.google.com/style/headings | 2026-09-28 |
| q:g-heading-ing | When possible, avoid using -ing verb forms as the first word in any heading or title. | https://developers.google.com/style/headings | 2026-09-28 |
| q:g-heading-case | Use sentence case for document titles and section headings. | https://developers.google.com/style/highlights | 2026-09-28 |
| q:g-heading-links | Don't put links in headings. A link can easily be confused as a style applied to the heading instead of a link. | https://developers.google.com/style/headings | 2026-09-28 |
| q:g-heading-levels | Maintain logical order. Don't skip levels of the heading hierarchy. | https://developers.google.com/style/headings | 2026-09-28 |
| q:g-heading-content | Don't use empty headings. Make sure headings are followed by content. | https://developers.google.com/style/headings | 2026-09-28 |
| q:g-code-font | Put code-related text in code font. | https://developers.google.com/style/highlights | 2026-09-28 |
| q:g-ui-bold | Put UI elements in bold. | https://developers.google.com/style/highlights | 2026-09-28 |
| q:g-table-intro | Introduce tables with a complete sentence that describes the purpose of the table because not all screen readers preannounce tables. | https://developers.google.com/style/tables | 2026-09-28 |
| q:g-table-one-column | If you have only one column in your table, turn the table into a list. | https://developers.google.com/style/tables | 2026-09-28 |
| q:g-link-text | Write link text that makes sense without the surrounding text. Don't use phrases such as this document, this article, or click here. | https://developers.google.com/style/link-text | 2026-09-28 |
| q:g-link-url | In general, don't use a URL as link text. Instead, use the page title or a description of the page. | https://developers.google.com/style/link-text | 2026-09-28 |
| q:g-directional | Don't use directional language to orient the reader, such as above, below, or right-hand side. This type of language doesn't work well for accessibility or for localization. | https://developers.google.com/style/procedures | 2026-09-28 |
| q:g-notice-prereq | Don't use notes to tell the reader about prerequisites or about steps they should have taken earlier. Information like this should precede the step. | https://developers.google.com/style/notices | 2026-09-28 |
| q:g-notice-step | Don't make a full procedural step into a note. | https://developers.google.com/style/notices | 2026-09-28 |
| q:g-figurative | Avoid figurative language, which includes metaphors and ableist language. | https://developers.google.com/style/tone | 2026-09-28 |
| q:m-numbered-list | Use a numbered list for sequential items (like a procedure) or prioritized items (like a top 10 list). | https://learn.microsoft.com/en-us/style-guide/scannable-content/lists | 2026-09-28 |
| q:m-separate-step | Use a separate step for each instruction. It's OK to combine short steps that occur in the same place in the UI. | https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions | 2026-09-28 |
| q:m-single-step | A single step might not require list formatting. If you want to use a format that's consistent with step-by-step instructions in the same documentation, use a bullet instead of a number. | https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions | 2026-09-28 |
| q:m-location-first | Make sure that customers know where the action should take place before you describe the action. | https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions | 2026-09-28 |
| q:m-bulleted-list | Use a bulleted list for things that have something in common but don't need to appear in a particular order. | https://learn.microsoft.com/en-us/style-guide/scannable-content/lists | 2026-09-28 |
| q:m-list-intro | Introduce the list with a heading, a complete sentence, or a fragment that ends with a colon. | https://learn.microsoft.com/en-us/style-guide/scannable-content/lists | 2026-09-28 |
| q:m-list-consistent | Make all the items in a list consistent in structure. | https://learn.microsoft.com/en-us/style-guide/scannable-content/lists | 2026-09-28 |
| q:m-list-capital | Begin each item in a list with a capital letter unless there's a reason not to (for example, it's a command that's always lowercase). | https://learn.microsoft.com/en-us/style-guide/scannable-content/lists | 2026-09-28 |
| q:m-list-short | Each item should be fairly short—the reader should be able to see at least two, and preferably three, list items at a glance. | https://learn.microsoft.com/en-us/style-guide/scannable-content/lists | 2026-09-28 |
| q:m-heading-case | Use sentence-style capitalization for headings. | https://learn.microsoft.com/en-us/style-guide/scannable-content/headings | 2026-09-28 |
| q:m-heading-parallel | Use parallel sentence structure for all headings at the same level. | https://learn.microsoft.com/en-us/style-guide/scannable-content/headings | 2026-09-28 |
| q:m-heading-question | Don't end headings with a period. A question mark or (rarely) an exclamation point can be used if it's needed for meaning. | https://learn.microsoft.com/en-us/style-guide/scannable-content/headings | 2026-09-28 |
| q:m-heading-adjacent | Avoid having two headings in a row without text in between—that might indicate a problem with organization or that the headings are redundant. | https://learn.microsoft.com/en-us/style-guide/scannable-content/headings | 2026-09-28 |
| q:m-ui-bold | When you must refer to a button, checkbox, or other option, use bold formatting for the name. | https://learn.microsoft.com/en-us/style-guide/procedures-instructions/formatting-text-in-instructions | 2026-09-28 |
| q:m-table-intro | If there’s text that introduces the table, it should be a complete sentence and end with a period, not a colon. | https://learn.microsoft.com/en-us/style-guide/scannable-content/tables | 2026-09-28 |
| q:m-link-text | Write brief but specific and meaningful link text. Use the title or a description of a page rather than a generic phrase like click here. | https://learn.microsoft.com/en-us/style-guide/urls-web-addresses | 2026-09-28 |
| q:m-directional | Don’t use directional terms as the only clue to location. | https://learn.microsoft.com/en-us/style-guide/accessibility/writing-all-abilities | 2026-09-28 |
| q:m-notes | Consider repeating common phrases, such as Tip, Note, and See also, as run-in headings to call attention to helpful information, interesting but nonessential information, or cross-references, respectively. | https://learn.microsoft.com/en-us/style-guide/scannable-content/headings | 2026-09-28 |
| q:m-friendly | Avoid jargon and overly complex or technical language. It should sound like a friendly conversation. | https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice | 2026-09-28 |
| q:m-front-load | Lead with what's most important. Front-load keywords for scanning. | https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice | 2026-09-28 |
| q:m-be-brief | Give customers just enough information to make decisions confidently. Prune every excess word. | https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice | 2026-09-28 |
| q:m-contractions | Use contractions like it's, you'll, you're, we're, and let's. | https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice | 2026-09-28 |
| q:m-imperative | Use active voice and indicative mood most of the time. Use imperative mood in procedures. | https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips | 2026-09-28 |
| q:m-idioms | Avoid idioms, colloquial expressions, and culture-specific references. | https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips | 2026-09-28 |

## For reviewers grading against this standard

- Grade structure against the page's base guide first, and treat a guide violation as blocking.
  Then grade against the track's drafting brief, reading the provenance and the recorded
  exceptions to tell a recorded departure from a defect.
- Grade the page against its own track's profile next: which reader, which vocabulary contract,
  which arrival state, which success criterion, and whether the counterpart question would fail
  it. A page graded against the wrong profile can look fine while failing its real reader.
- Cite the rule a finding violates and quote the offending text; propose a rewrite in the voice
  of the page's brief.
- Over-firing is a defect equal to missing. Prose that is plain, true, and in-register is
  done; do not churn it, and do not rewrite for rewriting's sake. A finding whose rewrite
  merely paraphrases is not a finding.
- The keystone cuts both ways: flag marketing register, and also flag prose so flat or
  perfunctory that it fails the quality-of-thought bar.
