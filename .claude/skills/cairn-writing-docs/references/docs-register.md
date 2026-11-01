# The docs register

## Contents

- [The base guides](#the-base-guides)
- [Drafting brief: editor docs](#drafting-brief-editor-docs)
- [Names](#names)
- [Visuals (every page that carries one)](#visuals-every-page-that-carries-one)
- [The page anatomies](#the-page-anatomies)
- [The tracks](#the-tracks)
- [The front door (`docs/why-cairn.md` and the root `README.md`)](#the-front-door-docswhy-cairnmd-and-the-root-readmemd)
- [When a Vale finding is wrong](#when-a-vale-finding-is-wrong)
- [Deviations from the base guides](#deviations-from-the-base-guides)
- [Sources](#sources)
- [For reviewers grading against this standard](#for-reviewers-grading-against-this-standard)


This document is the agent-facing standard for cairn's published documentation, its front door,
and the other public surfaces the table in "The base guides" names. Geoff ratified it on
2026-07-18 (spec: `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-07-18-docs-register-standard-design.md`), and the
specimen history lives in the front-page-voice memory. Pass D (2026-08-14) organized
it around the audience tracks the rebuild ships
([`2026-08-14-pass-d-target-manifest.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-14-pass-d-target-manifest.md) names the
target page set; a page count belongs there, since a number in this document rots). The
style-guide sync (2026-09-28, spec: `https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/specs/2026-09-28-style-guide-sync-design.md`)
set every surface on a published base guide, wrote one drafting brief per guide as a short
supplement to it, and recorded every departure from a guide in one section.

A drafter reads its guide's drafting brief together with the Names, Visuals, and page-anatomy
sections and the section for its page's track, and it reads nothing else from this document. A
reviewer reads the same sections along with "Deviations from the base guides," which lets it tell
a recorded departure from a defect. The document is itself written in the cairn docs voice, since
the style of a prompt steers the style of what an agent writes from it
([Anthropic's prompting guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).

Survey (`glw907/survey`, `skills/survey/writing/`) holds the house writing register,
including the base-standard rule, the tells that hold for every audience, and the registers for
surfaces this document does not govern. This document is cairn's overlay on that register. Where the two differ
on a cairn surface, this document governs.

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
departs from a guide rule only through a recorded deviation, which only Geoff can add.

The following table maps each surface to its base guide and to the drafting brief a writer
follows there.

| Surface | Reader | Base guide | Drafting brief |
|---|---|---|---|
| `docs/admin/` | Sets up and runs the default site, starting from the setup command | Google | None; the guide and its rows in "Deviations from the base guides" |
| The front door: `docs/why-cairn.md` and the root `README.md` | Every audience, led by the developer | Google | None; the guide and its rows in "Deviations from the base guides" |
| `CHANGELOG.md` | A developer reading what an upgrade changes | Google | None; the guide and its rows in "Deviations from the base guides" |
| cairn.pub's own prose | A visitor to the rendered docs site | Google | None; the guide and its rows in "Deviations from the base guides" |
| `docs/editors/` | Writes on a cairn site through `/admin` and never opens a terminal | Microsoft | Editor docs |
| The admin interface's copy | An editor at work in `/admin` | Microsoft, UI text | None; `.claude/skills/cairn-following-admin-design/references/admin-design-system.md` states the voice |
| `CONTRIBUTING.md` and `docs/internal/` | A contributor working on cairn itself | None; unpublished and unlinted | None |

A surface whose base guide is Google takes that guide's voice, as the rows in the Google table of
"Deviations from the base guides" modify it. Editor docs take Microsoft's voice, tightened only by the editor brief's rules.
Admin UI copy takes Microsoft's UI-text voice, tightened to professional and restrained copy with
nothing cute and nothing chatty (Geoff, 2026-09-28), and a departure there is recorded in the
Microsoft table of "Deviations from the base guides" like any other. The register governs
public-facing writing only, and internal specs, plans, and agent-facing documents take whatever
voice works best for Claude Code (Geoff, 2026-09-28). A Vale finding that is wrong about a specific line is a separate case with
a separate procedure, "When a Vale finding is wrong," which corrects a misfiring regex and leaves the
guide untouched.

## Drafting brief: editor docs

This brief governs `docs/editors/`, the pages an editor reaches through the admin's Help link. It
supplements the
[Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/), which is
the structure source for every such page and whose voice governs these pages unmodified. The rules
in this brief tighten that voice without departing from it.

### Structure

Structure every page to the Microsoft Writing Style Guide. The following checklist names the
guide rules a draft breaks most often, one rule to a line, each linked to the guide page that
states it.

- A sequence of actions is a numbered list
  ([lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)).
- Each step holds one instruction, and short steps in the same place in the UI may combine
  ([step-by-step instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions)).
- A single step may take a bullet in place of a number
  ([step-by-step instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions)).
- A step names where the action happens before it names the action, and a sentence states its
  condition before its instruction
  ([step-by-step instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions)).
- Items that share a purpose and need no order form a bulleted list
  ([lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)).
- A heading, a complete sentence, or a fragment ending in a colon introduces every list
  ([lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)).
- Every item in a list shares one structure
  ([lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)).
- Every list item opens on a capital letter unless it has a reason not to, such as a command that
  is always lowercase ([lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)).
- Steps and list items stay short enough that the reader sees two or three at a glance
  ([lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)).
- Headings take sentence-style capitalization
  ([headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)).
- Headings at one level share one sentence structure
  ([headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)).
- A heading ends without a period, and it may be the reader's question
  ([headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)).
- A heading carries no link
  ([headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)).
- Text follows every heading before the next heading begins
  ([headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)).
- A button, a field, or a menu item is named in bold, as the screen shows it
  ([formatting text in instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/formatting-text-in-instructions)).
- A complete sentence ending in a period introduces every table
  ([tables](https://learn.microsoft.com/en-us/style-guide/scannable-content/tables)).
- Link text names its destination with the page title or a description, never a generic phrase
  ([URLs and web addresses](https://learn.microsoft.com/en-us/style-guide/urls-web-addresses)).
- A reference names its target, never its position on the screen or the page
  ([accessibility](https://learn.microsoft.com/en-us/style-guide/accessibility/writing-all-abilities)).
- A note carries helpful information the task can do without, and it never carries a step or a
  prerequisite
  ([headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)).

The register adds the following structure rules, each stricter than the guide or set where the
guide is silent.

- **Ordered checks.** Checks an editor runs in order, such as confirming that a change reached
  the site, form a numbered list as well.
- **A vendor's specifics get a link, never a copy** (Geoff, 2026-08-05). A vendor's screens,
  plans, and prices change without notice, so a page that copies them goes stale on a schedule
  cairn does not control.
- **No published page cites Diátaxis**, its terminology, or its arm names (standing ruling, Geoff,
  2026-08-14). A reader does not need the taxonomy a page was planned under.
- **A page's outline is written before its prose and rides in the pull request** (Geoff,
  2026-10-01; reworded 2026-10-25 under the docs-as-code rulings, which retired the committed plan
  file, its fact ids, and the brief kept beside the page). The premise test comes first: the
  product has the thing the page documents, and no other page owns it. The outline is written
  down, which Google's guidance on large documents calls "the narrative for your document"
  ([Organizing large documents](https://developers.google.com/tech-writing/two/large-docs)). It
  holds the page's job; the introduction's three parts (what the document covers, what prior
  knowledge the reader needs, and what it does not cover); the sections in the order the outline
  argues for, each with its heading, the one sentence a reader takes from it, and its hand-off; and
  the ending the page's anatomy requires. The draft follows the outline's order. Section hand-offs
  belong to the outline: a hand-off it places is not a tell, and a read of the page grades its
  wording, never whether it is there or where it sits.

### Voice

The docs explain a system to someone trying to use it, and they have no stake in whether the
reader adopts it, so nothing anywhere in them is a pitch. The writing earns the reader's trust by
being clear and careful. Prose that avoids marketing by turning flat and perfunctory fails the
reader as surely as a pitch does.

- **Microsoft's voice** is warm, relaxed, crisp, and clear. Its
  [top 10 tips](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice) ask for
  plain words over jargon, the most important point first, just enough information to decide, and
  contractions.
- **Plain second person and the imperative in steps.** Active voice and the indicative mood carry
  most sentences, and procedures take the imperative
  ([writing tips](https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips)).
- **The editor's vocabulary.** A page speaks the words an editor already uses in the admin, and it
  defines on first use any word the editor has not met there.

### Exemplars

A drafter reads each exemplar whole and takes its anatomy and detail per step, never its wording.
Voice comes only from this brief and its primary exemplar, when the list below names one (Geoff,
2026-09-30).

- [`exemplar-microsoft-procedure-blobs-portal.md`](./exemplar-microsoft-procedure-blobs-portal.md),
  a Microsoft Learn procedure page, is the exemplar for the anatomy of a UI-only procedure.
- An in-repo editor exemplar joins this list when the editors stage redrafts its first page
  (Geoff, 2026-09-28).

### Tells

A tell is a habit of generated prose that a reader notices before the content. Each killed
specimen in the following list passed the mechanical gates, since the gates catch slop and miss
flat taste.

- **No marketing claims and no benefit-forward framing.** Every factual claim is literally true.
  Killed: "The whole organization works in one place, content and custom functions sharing one
  admin and one sign-in." It is marketing register, and it is false, since teams are distributed.
- **No idioms or metaphors.** Microsoft's
  [writing tips](https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips)
  rule out idioms and colloquial or culture-bound phrasing. A
  metaphor does the most damage where it defines what something is. Killed: "writing room" as the
  docs opener's definition of cairn.
- **No prose about the docs' writing.** The docs never admire themselves. Killed: "Eight words
  the docs use precisely" as the vocabulary intro.
- **No setup-colon triad**, the inline cadence of a clause, a colon, and three parallel items. A
  sequence of actions becomes a numbered list, parallel options become a bulleted list, and only
  items that are neither fold into plain sentences.
- **No em-dash rhythm.** The sentence-final elaborative tail is the tell whatever punctuation
  carries it, so the remedy restructures it into a second sentence instead of swapping the glyph
  for a comma or a colon.
- **No trailing-hinge runs** (Geoff, 2026-10-07, on a paragraph of sentences each ending in
  ", since ...", ", which [link] explains", or ", so ...": "really awkward AI cadence"). Avoid a
  run of sentences that each end in a comma-hinged tail: a comma followed by since, which, so, so
  that, because, as, where, while, whereas, although, or though (", as well as" does not count).
  Read each paragraph whole for rhythm. Fix a hinge by folding the reason into the main clause, dropping it,
  giving a link its own clause or sentence, or adding a short sentence. Three in a row fails
  `check:docs-gate` through `tellgrader` (skipped where the binary is absent, as in CI).
- **No two-headed headings.** A heading of the shape "X, and Y" hangs a second head off a comma,
  <!-- vale Google.Quotes = NO -->
  <!-- The quoted strings are literal specimens, so punctuation stays outside the quotes. -->
  and a heading names one thing. Killed: "The shape, and cairn as one build of it".
  <!-- vale Google.Quotes = YES -->
- **No balanced-halves constructions.** Two clauses set against each other for their symmetry
  and not for their claim: "The price is X; the payoff is Y," "for X, A; for Y, B," an echo pair
  such as "small enough to..., and small enough that...," and a two-beat closer. Each half either
  carries a separate claim or goes. This is the residue Geoff catches most often, so a review
  hunts it first.
- **No list cadence in prose.** Semicolon-chained inventories, section skeletons that repeat one
  three-sentence shape, and reflexive triads are the setup-colon triad's relatives. Parallel items
  take a list, as the guide prescribes.
- **No crafted pivots or cappers.** A short turn such as "Markdown flips the trade.", a paragraph
  that ends on its strongest line every time, and an aphoristic equation such as "The stack is the
  product" are tells. A paragraph ends where its content does.
- **No virtue claims.** "A real answer," "the honest truth," "a fair question," "to be clear,"
  "genuinely," and "very real" assert the quality that the following sentences must demonstrate.
- **No consumer-help softeners.** Microsoft's
  [word list](https://learn.microsoft.com/en-us/style-guide/a-z-word-list-term-collections/s/simply)
  says not to use "simply" to mean that something is easy to do, and the register extends that to
  "just" and "obviously." The same holds for folksy softeners ("a little goes a long way," "gets
  tangled") and anonymous circumlocutions. A micro-instructed action is Microsoft's how-to voice
  and is not a finding.
- **No intensifier "own."** "Its own," "cairn's own," and "the author's own" add emphasis and no
  information. Keep "own" only where it marks a real contrast of ownership that the sentence needs,
  such as each crawler token taking its own `User-agent` group; otherwise cut it, or say
  "separate" where separateness is the point (Geoff, 2026-09-29).
- **No invented material.** A manufactured concrete scenario (an editor on hotel Wi-Fi), a
  metaphor no sentence established, and biography or deliberation the author never reported all
  read as evidence and are not.
- **No restatement or filler.** A trailing evaluative tail, a sentence that ties up the paragraph
  it ends, a phrase recycled across pages, and a re-explanation of what the reader was just told
  add length and no information.

## Names

Every part of the system has one sanctioned name, ruled by Geoff after an adversarial review
and a precedent survey (2026-09-21). This section is the record; the `Cairn.Names` Vale rule (`.vale/styles/Cairn/`) enforces
what a regex can reach, at error level, and a writer still checks this table for what a regex
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
| The editing surface, on the editor track | the editor names the product and the person; the admin appears only where a screen string or a developer cross-reference needs it | Geoff, 2026-10-31. In the developer tracks "the admin" is the surface, and in `docs/editors/` "the editor" names the product and the person who uses it, so the editor track's vocabulary and this table agree. |
| The `:::` content unit | block, in every track; the figure and an unregistered `:::` container are blocks too | Geoff, 2026-10-31. Retires "component" and "layout block" for this unit; "component" in the Svelte sense stays. "Fragment" keeps the include, and "code block" keeps the Markdown sense. The API names (`defineComponent`, `ComponentDef`, `rendering.components`) stay until the final engine batch renames them. Developer pages quote them and gloss the unit as a block until then. |
| Who a stuck editor contacts | your site owner; "developer" only where code is involved | Geoff, 2026-10-31. A screen string that says "site developer" is quoted exactly. |
| The docs | the docs for the content; cairn.pub for the rendered site; the shipped docs for the copy in the tarball | |
| The consumer's site | your site, or a cairn site | |
| Also named | the GitHub App, shortened to the App after its first mention on a page; the Worker | The capital A marks the short form as the GitHub App, never an app in general (Geoff, 2026-10-25). |
| The starter a new site begins from | the Waymark template for the files the setup command copies, and the `templates/waymark/` copy; the Waymark theme for its look | Pick the word by sense: "Waymark is the only template the setup command ships", "Waymark, cairn's reference reading theme". Geoff ruled the split on 2026-10-25. |
| The people an auth channel signs in beside the editors | a second sign-in group | Never "second audience" or "second population"; the page "Add a second sign-in group" fixes the name. |
| Retired as names | the library (the word stays for the media library and the content library); the Go tool; the binary, except for the install artifact itself; a bare "the tool"; "second audience"; "second population" | |
<!-- vale Google.Quotes = YES -->

**Admin or public, built-in or custom.** cairn has two surfaces, the admin and the public site. A
component is built-in (cairn ships it) or custom (a site writes it). The noun is "component" on
both surfaces, the editor's and the stack's word, and the surface adjective tells them apart:
"built-in public component", "custom admin component". "Site" means the developer's whole
project, and "custom admin screen" stays the name for a whole admin route.

| | Built-in (cairn ships it) | Custom (a site writes it) |
|---|---|---|
| **Admin component** | Lives in `src/lib/admin/`, exported at `@glw907/cairn-cms/admin`, beside `cairn-admin.css`. Rulebook: `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`. Audit scope: the admin static scope. Guidance: the admin design system and `cairn-implementer`. | Lives under the site's `src/routes/admin` or `src/lib/admin/`, built on `@glw907/cairn-cms/admin-toolkit`. Rulebook: the ratified norms, DaisyUI-first. Audit scope: the admin static scope. Guidance: `cairn-building-admin-screens`, `cairn-extending-a-site`'s `daisyui-first.md`, and `cairn-extension-reviewer`. |
| **Public component** | Lives in `src/lib/public/`, exported at `@glw907/cairn-cms/public`, styled by `cairn-public.css`. Rulebook: the public theme contract, with no literal and no daisyUI component class. Audit scope: the public scope, rooted at the engine's `src/lib/public/` by the showcase config. Guidance: `cairn-styling-public-pages`'s built-in recipe and the `cairn-implementer` line. | Lives under the site's `src/chassis`, `src/theme`, `src/routes`, or `src/lib/components`, as a `defineComponent` plus rules in `prose.css` or a component `<style>`. Rulebook: the public theme contract. Audit scope: the public scope's default roots. Guidance: `cairn-styling-public-pages`'s custom recipe. |

**The barrel rule.** `@glw907/cairn-cms/admin` exports only admin components.
`@glw907/cairn-cms/public` exports every built-in public component that renders styled markup;
`CairnHead` stays at `./delivery/head`, since it renders no markup of its own, only document-head
tags. `@glw907/cairn-cms/admin-toolkit` keeps its name.

**The precedent this expresses by font instead of case.** Git's contributor guide draws the
same line by sense, not by regex: "Use 'git' (all lowercase) when talking about commands ...
and 'Git' when talking about the version control system" (`Documentation/CodingGuidelines`).
cairn's brand is lowercase even as a proper noun, so it cannot split the same way by
capitalization; it splits by font instead, a bare code span for the identifier prefix and
plain lowercase prose for the system.

<!-- vale Google.Quotes = NO -->
<!-- "Powered by Cairn" here is the bare-quoted form the paragraph names, and moving its
     period inside would misquote it. -->
**Enforcement and scope.** `Cairn.Names` (error) catches "the Go tool" and a stray capital
"Cairn" in prose. "The tool," "the package," "the binary," and "the CLI" take a writer's second
look rather than a rule, since each is still the right word in the sense the table above carves
out. The rule's escape for the quoted-UI exception is code font: a quoted screen string goes in a
code span (`` `Powered by Cairn` ``), which Vale skips, and that is the sanctioned form, never
a bare-quoted "Powered by Cairn". The rule's `\bCairn\b` also matches the prose word "Cairn"
inside a slash path like "Cairn/x"; that is fine, because every real path in published prose
already sits in a code span, so the rule never sees it as prose to begin with.
The narrative arms (`docs/admin/`, `docs/editors/`) were rebuilt stage by stage, and each stage wrote to this table from its first page. A new page, or a page already open for an unrelated edit, writes to this table now. `tool/docs/` still sits outside `.vale.ini`'s scope; the credentials and tripwire pages it once held now live in `docs/admin/`, where the Names rule reaches them.

A further rule carries the admin-or-public split's own retired compounds, kept out of
`Cairn.Names` since that rule is case-sensitive by necessity (matching the capital wordmark) and
its message is about the Go tool and the capital "Cairn", not about a component surface.
`Cairn.ComponentNames` (error) catches "engine public component", "public engine component",
"chassis component", and "site component", since each names no page on a narrative arm; a page
says "custom public component" instead. "Engine component" and "custom component" take a
writer's second look, since each can be right in a sense a writer must check. The rule is
`ignorecase: true`, so a sentence-initial capital still raises the same finding.
<!-- vale Google.Quotes = YES -->

## Visuals (every page that carries one)

The visual layer's governing decisions live in the 2026-08-15 sitting record
([`2026-08-15-docs-visual-layer-rulings.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-15-docs-visual-layer-rulings.md));
the per-track vocabulary and per-page contracts live in
[`2026-08-15-docs-outlines-with-visuals.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-15-docs-outlines-with-visuals.md).
This section carries the rules a writer needs at the page, so the records stay records.

- **A visual earns its place or is absent.** Google's threshold governs: an image appears only
  where it explains something otherwise difficult to express in words, and it replaces prose
  rather than joining it. Never an image of text, code, or terminal output; a transcript is a
  fenced block traced to a recorded run, and invented output never ships. A vendor's UI is
  never pictured, since a vendor's specifics get a link and never a copy, in an image as in
  prose.
- **Alt text is mandatory.** Every image carries `alt`; a decorative image gets `alt=""`, never
  an omitted attribute. At most 150 characters. Start by naming the kind (diagram, screenshot,
  <!-- vale Google.Quotes = NO -->
  <!-- The quoted strings are literal specimens, so punctuation stays outside the quotes. -->
  reproduction), never "Image of", and describe what the reader learns in context, not what the
  <!-- vale Google.Quotes = YES -->
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
  scrolls inside its `overflow-x: auto` figure at narrow widths rather than shrinking, and
  carries the two-part text alternative. The bar still binds live reproductions and every
  non-docs family artifact.
- **Diagrams render in cairn's theme.** Mermaid is the authoring form; the stock `neutral`
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

Every page type opens with an introduction and ends with a closing section for its type (Geoff,
2026-10-01). The introduction is reasoned per page. Each type adds what its template asks of the
opening, as the following anatomies state.

- **Task guide** (most admin pages). Its sections run in the following order:

  1. An introduction that states the task, when and why the reader would do it, and who the page
     is for, and that names the page to read instead where a reader could be in the wrong place.
     The one-line contract naming what the reader accomplishes sits inside the framing, and the
     contract alone does not meet the introduction requirement ([Good Docs how-to
     template](https://gitlab.com/tgdp/templates/-/blob/main/how-to/template_how-to.md) and its
     guide, templates v1.6.0).
  2. Preconditions, each stated with a link to whatever produces it.
  3. The steps, as a numbered list with one action to a step and the location named before the
     action. A procedure of one step is a single bulleted item.
     <!-- vale Google.Quotes = NO -->
     <!-- The quoted strings are literal specimens, so punctuation stays outside the quotes. -->
  4. A verification section, headed with a bare infinitive such as "Verify the served file",
     <!-- vale Google.Quotes = YES -->
     that names the observable result. Checks the reader runs in order form a numbered list.
     One exception stands (Geoff, 2026-10-31): `admin/own-your-domain.md` keeps "You know it
     worked when" on its three sections, because `github-slug-contract.test.ts` pins their
     slugs, so the slug contract outranks the heading rule there. Each body is a full sentence.
  5. Failure paths that point at the track's recovery surface (`admin/setup-recovery.md` or
     `admin/troubleshooting.md`) rather than restating recovery
     prose inline. Ordered diagnostic checks form a numbered list here too.
  6. A see-also section that links related how-to guides, concept pages, and the limitations the
     page leaves out. The recovery link in item 5 is not repeated here.

  Explanation stays subordinate to the steps. A guide carries only the explanation a reader
  needs to choose or verify, and each such section opens with a sentence tying it to the task,
  so the page never turns from instruction to exposition without a lead-in. Anything more (a
  full output listing, the behavior's limits, its rationale) belongs on a separate page, linked
  from the step that needs it. The introduction is the one exception: it may say why the thing
  the guide covers exists.
- **Condition entry** (`admin/is-it-working.md`): a condition id matching the doctor's
  registry, what the check reads, what a failure means in plain terms, the remedy, and the
  anchor slug the id resolves to, which must survive a page edit since `check:readiness`
  gates it against the built condition registry.
- **Symptom row** (`admin/troubleshooting.md`): what the reader sees, the log event that
  correlates, what it means, and the fix, with a row that needs code changed saying so and
  sending the reader to their developer instead of a false promise of a purely operational fix.
  A page of symptom rows ends with a see-also section.

## The tracks

Every published page belongs to exactly one track, every track serves exactly one profile
(the full track profiles: [`2026-08-14-audience-profiles.md`](https://github.com/glw907/cairn-cms/blob/pre-agent-first/docs/internal/record/2026-08-14-audience-profiles.md)),
and a page review grades the page against its profile. A developer reads no docs track: each
export's doc comment carries its contract, and the packaged skills under `skills/` teach each job.
The five elements below are what a
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

## The front door (`docs/why-cairn.md` and the root `README.md`)

A register case of its own, alongside the tracks. These two pages are where every
audience lands, and they carry the whole cairn story.

- **Five routes, not four, in the first screenful.** The evaluator route comes first
  ("deciding whether cairn fits" → `docs/why-cairn.md`), then editor, admin, extender,
  contributor, in that order. One copyable `create-cairn-site` command sits above the routes.
  No Diátaxis citation appears anywhere, and the root README's positioning sections sit
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
  small organization. Examples state what could be built; they never pitch.
<!-- leak-ok-begin: C1,C2 -- the rule quotes the leaked vocabulary and the owner's words to forbid them -->
- **Examples are generic and likely to apply to many organizations.** Use a `staff` role, a
  members area, signups, an events screen. No example carries a consumer site's domain: its
  organization type, its people, or its vocabulary, such as clubs, instructors, classes, or
  dues. An implementer reading the page has zero context on any consumer site, so a domain
  example reads as a cast from nowhere. A page opens on the job the reader came to do, never on
  an invented scenario or cast. The same holds in an outline and in any input that
  feeds a writer, since a domain example there is copied into the page. The rule is the
  owner's (Geoff, 2026-10-07): "Talking about classes and club members here seems VERY strange.
  Where the heck does that come from?"; "If this relates to the ASC's site, an implementer will
  have ZERO context."; "Staff is fine. Examples should be generic and likely to apply to many
  organizations."
<!-- leak-ok-end -->
- **Stack reasoning is welcome.** Explaining why cairn uses SvelteKit, DaisyUI, and
  Cloudflare is in-register here, in short form; the full argument, including the honest
  trade-offs, stays in `docs/why-cairn.md`.
- **The author's frame, not a reconstructed one.** Any "why cairn" prose traces to Geoff's
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
  specialist vendors) are stated in the same factual voice as cairn's, and cairn's
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
- **A document identifier, fixed by suppression.** A page that cites "NIST
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

## Deviations from the base guides

A rule in this register either tightens its base guide or departs from it, and the difference
decides whether the rule needs Geoff's ruling (Geoff, 2026-09-28). A tightening forbids only a
form the guide permits or is silent on, and it needs no record. A rule that forbids a form the
guide prescribes or recommends is an override, and so is a rule that permits a form the guide
forbids; either one exists only as a row in its guide's table in this section. A register rule
that fails this test and has no row is a blocking finding against the register.

Only Geoff adds a row. A row names the base rule it overrides, what cairn does instead, the
evidence, and the date of his ruling. Evidence is what a writer brings to Geoff when proposing a
row, and it never licenses a departure on its own authority, whether in this document or in a
page's contract. The procedure in "When a Vale finding is wrong" is a different case, since it
corrects a regex that misreads a line and leaves the guide's rule untouched.

The measured tone shows an override: it forbids the conversational register Google's tone page
recommends, so it carries a row.

### Google

Each row in the following table records one departure from a Google rule. A dormant row governs
no page today, and its "What cairn does instead" cell says so.

| Base rule | What cairn does instead | Evidence | Ruling |
|---|---|---|---|
| [Voice and tone](https://developers.google.com/style/tone): "Use a voice that's casual, natural, and approachable, not pedantic or pushy." and "But, aim for a conversational tone rather than a formal one." | Pages read as a measured, precise technical report. Google's friendly and respectful manner stays, with no slang and no jokes. | Geoff's 2026-09-08 voice ruling; the 2026-09-28 draft docs proof, whose tone succeeded while its defects were structural | Geoff, 2026-09-28 (rulings 3 and 10) |
| [Accessibility](https://developers.google.com/style/accessibility): "Use shorter sentences. Try to use fewer than 26 words per sentence." | An explanatory sentence may run past 26 words when splitting it would separate a claim from its qualification. The 26-word cap counts each sentence on its own and applies only to a step, a list item, or a sentence in a task section; an introduction or explanation sentence is exempt. A sentence over the cap in a step, list item, or task section is a blocking guide finding. | The same ruling and proof; the guidance is an accessibility rule, so it holds wherever the reader acts | Geoff, 2026-09-28 (rulings 3 and 10); per-sentence scope, Geoff, 2026-10-11 (pre-2b tooling scope) |
| [Pronouns](https://developers.google.com/style/pronouns): "Avoid first-person pronouns (I, we, us, our, and ours) except in the following contexts:" | The author uses a restrained first person where a sentence states the author's evidence, and `.vale.ini` turns off `Google.FirstPerson` on every Google surface. Google's list admits a document whose author comments in the first person, and the row records the rule's removal from the gate. | The authorial first person is the register for design decisions | Geoff, 2026-07-02 |
| [Periods and other end punctuation](https://developers.google.com/style/exclamation-points): "In general, avoid exclamation points." | The root README may carry Geoff's voiced headings, such as `Love your editors!`, and `.vale.ini` holds `Google.Exclamation` at warning for `README.md`. The README carries no such heading today. | Geoff's sanction of his voiced headings | Geoff, 2026-07-02 |

### Microsoft

No departure from a Microsoft rule is recorded. This table also governs admin UI copy, whose
voice `.claude/skills/cairn-following-admin-design/references/admin-design-system.md` states, so a departure in either surface lands here
as a row of the same shape as the Google table's.

| Base rule | What cairn does instead | Evidence | Ruling |
|---|---|---|---|

### The rulings behind the briefs

Geoff ruled on 2026-09-08 that cairn's public-facing writing is technical and academic, and the
draft docs proof of 2026-09-28 confirmed the tone while exposing structural defects the base
guide would have caught. The style-guide sync kept the tone and restored the structure. The
voice is defined positively, as one whole, so that a drafter reproduces it from the brief alone
and never assembles it from Google's defaults minus a list of prohibitions (Geoff, 2026-09-28,
ruling 11). The voice departs from Google in three places, the tone, the sentence length, and the
first person, and the first three rows of the Google table record them.

The outline rule in the editor brief adds a step the base guides are silent on and forbids no form
either guide prescribes, so it is a tightening and needs no row. It adopts Google's outline
guidance as published (Geoff, 2026-10-01). The 2026-10-25 docs-as-code rulings superseded the
ruling's committed plan file, its fact ids, and the brief kept beside the page, and kept the
outline and the order it sets. The outline now rides in the pull request.

The editor brief departs from nothing in Microsoft (ruling 4). Its tightenings are the no-pitch
keystone, the tells that pass this section's test against Microsoft, and the Names rules. It
carries no academic framing.

## Sources

The deviation rows cite the following pages of the Google developer documentation style guide,
read on 2026-09-28.

- [Highlights](https://developers.google.com/style/highlights)
- [Procedures](https://developers.google.com/style/procedures)
- [Lists](https://developers.google.com/style/lists)
- [Accessibility](https://developers.google.com/style/accessibility)
- [Headings and titles](https://developers.google.com/style/headings)
- [Tables](https://developers.google.com/style/tables)
- [Link text](https://developers.google.com/style/link-text)
- [Notes, cautions, warnings, and other notices](https://developers.google.com/style/notices)
- [Voice and tone](https://developers.google.com/style/tone)
- [Pronouns](https://developers.google.com/style/pronouns)
- [Periods and other end punctuation](https://developers.google.com/style/exclamation-points)

The editor brief cites the following pages of the Microsoft Writing Style Guide, read on the same
date.

- [Welcome](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [Lists](https://learn.microsoft.com/en-us/style-guide/scannable-content/lists)
- [Writing step-by-step instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/writing-step-by-step-instructions)
- [Headings](https://learn.microsoft.com/en-us/style-guide/scannable-content/headings)
- [Formatting text in instructions](https://learn.microsoft.com/en-us/style-guide/procedures-instructions/formatting-text-in-instructions)
- [Tables](https://learn.microsoft.com/en-us/style-guide/scannable-content/tables)
- [URLs and web addresses](https://learn.microsoft.com/en-us/style-guide/urls-web-addresses)
- [Writing for all abilities](https://learn.microsoft.com/en-us/style-guide/accessibility/writing-all-abilities)
- [Top 10 tips for Microsoft style and voice](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice)
- [Writing tips](https://learn.microsoft.com/en-us/style-guide/global-communications/writing-tips)

The outline rule in the editor brief cites one page of Google's Technical Writing Two course, read on
2026-10-03.

- [Organizing large documents](https://developers.google.com/tech-writing/two/large-docs)

The exemplar captures carry their source URLs and licenses in
[`exemplar-sources.md`](./exemplar-sources.md).

## For reviewers grading against this standard

- Grade structure against the page's base guide first, and treat a guide violation as blocking.
  Then grade against the track's drafting brief, reading "Deviations from the base guides" to
  tell a recorded departure from a defect.
- Grade the page against its track's profile next: which reader, which vocabulary contract,
  which arrival state, which success criterion, and whether the counterpart question would fail
  it. A page graded against the wrong profile can look fine while failing its real reader.
- Cite the rule a finding violates and quote the offending text; propose a rewrite in the voice
  of the page's brief.
- Over-firing is a defect equal to missing. Prose that is plain, true, and in-register is
  done; do not churn it, and do not rewrite for rewriting's sake. A finding whose rewrite
  merely paraphrases is not a finding.
- The keystone cuts both ways: flag marketing register, and also flag prose so flat or
  perfunctory that it fails the quality-of-thought bar.
- A dispatch that scopes a review quotes this sentence verbatim: The 26-word cap counts each
  sentence on its own and applies only to a step, a list item, or a sentence in a task section; an
  introduction or explanation sentence is exempt. A broader wording drew three false blocking
  findings on a scoped read (2026-10-07).
