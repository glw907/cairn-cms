# Docs visual practice: the three-tier research (2026-08-15)

Input for the Fable brainstorming sitting that opens the next pass, per the ROADMAP Now entry
and `2026-08-15-docs-outlines-with-visuals.md`. Eight web-research readers ran the three
tiers the record's research brief specifies: the published standards cairn already follows,
known-great exemplars led by Astro, and the competitor corpora re-read through the visual
lens, plus a dedicated read on the diagrams-at-narrow-widths question the 320/390 ruling
needs. Every claim below traces to a cited source in the readers' reports; the load-bearing
citations are carried here so this record stands alone. Findings are reported, not ruled on;
the rulings belong to the sitting.

**A design constraint from Geoff (2026-08-15), stated during the research run and binding on
the sitting:** cairn's diagrams are not purely utilitarian. They carry understated
professional polish commensurate with the rest of the cairn ecosystem. This rules out
default-skinned diagram output shipped as-is (cairn-pub's current mermaid render uses the
stock `neutral` theme) and makes diagram styling a first-class part of the tooling decision:
whatever produces the diagrams must produce them in cairn's own visual voice, consistently,
across the corpus.

One local verification folded in ahead of the readers: **cairn-pub renders mermaid today, on
both `main` and the prepared `pass-d-docs-tracks` branch.**
`src/theme/components/DocsMermaid.svelte` lazy-loads the `mermaid` package client-side (a
page with no fence never fetches the chunk), renders with the neutral theme, falls back to
the escaped code text when a source fails to parse, and injects a visually hidden description
because mermaid's SVG carries no accessible name on its own; the marker comes from
`src/lib/docs/mermaid-marker.ts` in the loader. So the tooling question for the sitting is
not whether diagrams can render but at what legibility, in what visual voice, and under which
small-screen pattern.

## Tier 1: the Google developer documentation style guide (governs three tracks)

Primary source: [Diagrams, figures, and other images](https://developers.google.com/style/images),
with [Write accessible documentation](https://developers.google.com/style/accessibility) and
[UI elements and interaction](https://developers.google.com/style/ui-elements).

**When an image earns its place: the threshold is explicitly high.** "Use images only when
they provide useful visual explanations of information that is otherwise difficult to express
with words." For screenshots, "be discreet. Only capture UIs that are important to the
discussion." Two hard prohibitions: "Don't use images of text, code samples, or terminal
output. Use actual text" (repeated verbatim on the accessibility page), and "Don't present
new information in images. Always provide an equivalent text explanation with the image."
The UI-elements page frames screenshots as the fallback for a specific prose failure mode,
not a default: "If a UI element is hard to find, provide a screenshot," offered as the
alternative to directional language ("above," "right-hand side").

**Screenshots.** Introduce with a complete sentence, except "screenshots that immediately
follow procedural text that describes a UI" need no introduction. Crop to the relevant
information, and the stated rationale is staleness management: cropping "can help
future-proof the screenshot if other parts of the UI change." Be consistent in OS and look
across a doc set. Avoid embedding explanatory text in the graphic ("hurts accessibility and
searchability, and increases localization costs"); numbered callouts are allowed for writing
a figure description, "but don't use callouts for detailed annotations in the image." No PII;
hide unavoidable PII with a 100%-opacity solid overlay, never a blur.

**Diagrams.** "Use SVG files if possible because SVGs stay sharp when you zoom in"; PNG
otherwise; never a transparent background. The guide names no diagram taxonomy, no tools, and
no complexity ceiling. "Don't use image maps. Instead, provide a list of text references
following the image."

**Alt text.** 155 characters or less; longer content moves to a figure description in the
text. "Alt text should consider the context of the image, not just its content." Decorative
or redundant-with-text images get `alt=""`; the attribute itself is never omitted. No "Image
of" phrasing; consistent alt text for repeated images; "Don't use figure captions to replace
alt text."

**Captions and numbering are optional** (clarified 2024-08-15 in the guide's own changelog).
When used: "**Figure NUMBER.** DESCRIPTION.", complete sentences, end punctuation. Never
reference a figure spatially ("the image above"); reference by number, or show the figure
again.

**Sizing.** Don't exceed the column width; "It's fine for an image to take up the full width
of a page"; use the site's standard CSS, never manual placement; `srcset` with an exact-2x
image for density.

**What Google is silent on, stated explicitly by the reader:** no screenshot
currency/versioning policy (no re-capture trigger, staleness marker, or review cadence beyond
the incidental future-proofing of cropping); no diagram taxonomy, tooling, or complexity
limit; **nothing on viewport-width responsiveness or how a diagram degrades on a small
screen** (the `srcset` guidance is pixel-density only); nothing on dark-mode image variants;
no in-screenshot localization guidance beyond the generic embedded-text warning.

## Tier 1: the Microsoft writing style guide (governs the editors track)

Primary sources: the style guide's procedures-and-instructions pages, the alternative-text
page, [Responsive content](https://learn.microsoft.com/en-us/style-guide/responsive-content),
and [Art](https://learn.microsoft.com/en-us/style-guide/global-communications/art). The
reader distinguished **[Style Guide]** claims (the standard Vale enforces the prose half of)
from **[Contributor Guide]** claims (Microsoft Learn's own tooling advice at
learn.microsoft.com/contribute), pulled in because the public style guide has no dedicated
screenshots page; Microsoft's internal screenshots page exists but sits behind "only
available to authorized Microsoft personnel."

**When an image earns its place.** The governing line, from the procedures index: "The best
procedure is the one you don't need." A picture is one of four competing formats for an
instruction (picture, video, one-sentence instruction, numbered procedure), not a default
add-on. The formatting page's repeated posture: "Avoid talking about UI elements. Instead,
describe what the customer needs to do." The alt-text page's worked example argues a
screenshot need not re-encode what the steps already carry. The crispest trigger is
[Contributor Guide]: "Use a screenshot when it can save words" and "when it adds clarity."

**Describing UI in prose is the guide's most developed visual-adjacent area.** Input-neutral
verbs only (Select, Go to, Enter, Move, never click or swipe), with a full per-verb table.
Element names in bold, sentence case, "Don't include the word [element type] unless it adds
needed clarity." Numbered steps, one instruction per step, location before action ("On the
**Design** tab, select **Header Row**"). The directional-language warning bears directly on
teaching a visual editor: "Don't use directional terms as the only clue to location. Left,
right, up, down, above, and below aren't very useful for people who use screen-reading
software."

**Alt text.** Convey the image's purpose, not every detail; 150-character cap; complex images
move the detail to surrounding or linked text; decorative images get `alt=""`, never an
omitted attribute; "Don't start alt text with a general word such as 'Image'... start by
specifying what the image is; for example, a drawing, photograph, diagram, chart, or
screenshot"; never a filename; caption and alt text must not be redundant. [Contributor
Guide] adds a `type="complex"` long-description mechanism for charts and diagrams, "an
accessibility requirement for complex images, such as graphs."

**Small screens: Microsoft, unlike Google, addresses this directly.** "Assume your content
will be viewed at small sizes"; "the width of your customer's screen might be just a couple
of inches. Keep content simple... Choose simple images, and crop extraneous detail."
Infographics get an explicit pattern menu: "Provide a way for readers to open an infographic
in an application where they can enlarge specific areas. Organize infographics in compact
sections that readers can magnify... Or, present individual sections of the infographic
within text, and provide a link to the full infographic." Charts: "Simplify charts and graphs
so that readers can easily read the whole thing on a small screen." Layout: "think about how
it will flow on a 360-pixel screen."

**Localization.** Text baked into a graphic won't auto-translate: "If possible, use captions
or describe the graphic in text, instead"; store art in separate linked files.

**What Microsoft is silent on:** screenshot currency and staleness (nothing anywhere on
re-capture, dating, or auditing images over a product's life); annotation and callout
mechanics; caption format or numbering; any dedicated screenshots page at all in the public
guide.

## Tier 2, the primary exemplar: Astro (repo cloned and read, not sampled)

The reader cloned `withastro/docs` (418 English pages) and its contributor repo, so these are
counts, not impressions.

**The headline: Astro's corpus is nearly image-free, and that is the design.** One real
screenshot in the entire corpus (the tutorial's blank dev-server preview, a 3KB PNG of a page
that says "Astro", chosen because it can barely go stale). One authored diagram in the entire
site: the islands diagram on `concepts/islands.mdx`. **Zero mermaid anywhere** (its only
mention is a config example for excluding mermaid fences from a reader's own syntax
highlighting). The 187 reference pages carry zero images and zero diagrams. The tutorial's
six build units contain no before/after screenshot pair even where one is the obvious choice
(adding a layout, hydrating an island); the reader verifies against their own dev server
instead.

**The one diagram is a bespoke theme-native component, not an image.**
`src/components/IslandsDiagram.astro` is a CSS-grid layout with named slots each locale fills
with translated text, dark-mode aware via theme tokens, `overflow-x: auto` on overflow. It
cannot go stale in the screenshot sense because it renders live from the current theme. This
is the strongest single precedent for the polish constraint: the closest-peer corpus's answer
to "diagram" is a hand-built component in the site's own visual voice, not a default-skinned
generator.

**Terminal presentation is free and automatic.** Shell-language fences get Expressive Code's
terminal chrome with no manual title; `<PackageManagerTabs>` shares tab state page-wide
(switch to pnpm once, every block follows), which is what keeps CLI instruction from needing
near-duplicate blocks per platform. `<FileTree>` is the telling substitution: where another
site would screenshot a file explorer, contributors get a structured text component.

**No images policy exists because none is needed.** The contributor writing-style guide has
no section on images, screenshots, or diagrams; the custom-component reference offers no
image or diagram component at all; the third-party-guide policy directs vendor screenshots to
the vendor's own linked material, never embedded. No CI touches images. Alt text is enforced
at build time by Astro itself (`<Image />` without `alt` is a build error), decorative images
get explicit `alt=""`, and the mascot decoration is applied as CSS mask, invisible to
assistive tech by construction.

**Small screens:** the two `overflow-x: auto` rules on the diagram and the tab strip are the
repo's entire custom responsive handling; everything else inherits Starlight's defaults.
Never click-to-expand, never shrink-to-illegibility.

## Tier 2: the commercial exemplars (Stripe, Twilio, Tailwind)

**Stripe: zero images, and that is the design.** Across quickstart, conceptual, task, and
reference pages, raw HTML shows no content-authored images and no authored diagrams; the
abundant SVGs are nav chrome. The visual devices are the multi-language tabbed code panel,
the "Try it out" step that has the reader produce a real result instead of looking at a
picture of one, and a two-column lifecycle table where a state-machine flowchart would sit
elsewhere. Staleness is solved by avoidance: nothing is a captured image of a past UI state,
and version drift is flagged in prose. The reader's transfer: prefer a table or a real
artifact (a CLI transcript, a frontmatter table) over a drawn diagram wherever the content is
enumerable, and treat show-don't-tell as let-them-run-it, with an expected-output check where
a screenshot would go stale.

**Twilio: diagrams reserved for three-plus actors.** Across six pages, one non-decorative
screenshot (an ngrok terminal result state, a third-party tool with no Twilio-version churn)
and two authored sequence diagrams, confined to one appendix modeling a genuinely three-party
branching call flow; the simpler two-party webhook-signature explanation stays prose even
though it is "architecture," suggesting the threshold is actor count and branching, not
category. Directly confirmed in the CSS: every wide table and code block sits in an
`overflow-x: auto` container, never reflowed; the one screenshot gets `max-width: 100%` plus
click-to-zoom. The rare alt text is precise ("Sequence diagram of blind call transfer process
between caller, Twilio, and app.").

**Tailwind: the live-render precedent for cairn's reproduction seam.** Zero screenshots and
zero authored diagrams anywhere; conceptual and reference pages instead carry live-rendered
HTML/CSS preview boxes, actual styled elements generated against the current engine at
request time, several paired with a "Generated CSS" block proving the output is computed
live. Where content is a system of named values (breakpoint tables), it switches to tables;
where content is procedure (installation), zero visuals. This is the strongest external
validation of cairn's live-reproduction approach: the render-the-real-thing move is exactly
how Tailwind makes result-state visuals staleness-proof, and its selectivity rule (visuals
where the page teaches a look or behavior, none where it teaches a step or a value table) is
a per-page decision principle, not a per-track one.

## Tier 2: the OSS and reference exemplars (MDN, Kubernetes, Rails, Django)

**MDN: spend the visual budget unevenly by design.** Reference pages carry a live executed
example nearly everywhere ("Try it" panels rendering real HTML/CSS/JS) and almost never a
screenshot or diagram; conceptual pages carry authored SVG diagrams, one per major concept
shift, for spatial and layered relationships (the HTTP overview holds five); tutorial pages
carry one architecture diagram at the point where the mental model is needed; UI-shaped
how-tos are screenshot-dense (six on the PWA install page) because the subject is arbitrary
vendor pixel layout prose cannot describe stably. The contributor guide
([Images_media](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Howto/Images_media))
is explicit that staleness is why: prefer text because it is "more scannable,
information-dense, and maintainable than visual content"; "screenshots become outdated as UIs
change"; prefer SVG over PNG because authors can edit it in any IDE, it diffs cleanly in git,
and a PNG "requires recreating from scratch when edited." CI enforces image compression
(`npm run filecheck ... --save-compression` as a GitHub Action), not diagram content. Alt
text describes what the reader learns, not what the image depicts (bad: "Screenshot showing
Bing search results with settings icon"; good: "The settings icon is in the navigation bar
below the search field").

**Kubernetes: the strongest tooling precedent, and a caption mandate.** Concept and tutorial
pages carry roughly one authored SVG per page, always near the top; task and reference pages
carry zero by rule, substituting terminal blocks and tables. The first-class
[Diagram Guide](https://kubernetes.io/docs/contribute/style/diagram-guide/) standardizes
mermaid ("You can think of Mermaid code as just Markdown text included in your PR"), with
three sanctioned methods (inline, Mermaid+SVG export, external tool for what mermaid cannot
express), and mandates captions: "You should always add a caption to each diagram," in
"Figure NUMBER. Caption text." form, with relationship-describing alt text (the live
architecture page's alt: "The control plane (kube-apiserver, etcd, ...) and several nodes.
Each node is running a kubelet and kube-proxy."). Its "most important" tip is keep diagrams
simple. Diagrams-as-reviewable-text is the anti-staleness mechanism: a mermaid diagram goes
through the same PR diff as prose and cannot silently rot like a binary. Its interactive
embedded terminals (Katacoda) were shut down in 2023, a scale-of-maintenance cautionary note.

**Rails: restraint that reflects content shape, and a governance cautionary tale.** Outside
the tutorial, zero non-decorative images across concept, task, and reference guides; tables
and terminal transcripts carry the load (the routing table, `(rdbg)` debugger transcripts),
and the two places the framework is genuinely spatial (MVC, request-to-route flow) are
exactly the two places the tutorial draws a diagram. But the Rails guides guidelines have no
image policy at all, and the consequence is concrete: both diagrams ship with **empty alt
text**. The reader's takeaway: leaning on tables and transcripts is fine, even better, for
terminal-tool and reference tracks, but any image that does land needs written, enforced alt
and caption rules, not author memory.

**Django: the norm and the exception, both load-bearing.** Zero images across topic, how-to,
and reference pages (URL dispatch is a numbered prose list; the field reference has no
tables, let alone figures), with exactly one visually dense page: tutorial part 2, six
screenshots of the admin UI, each a result-state checkpoint ("you should see the admin's
login screen:" then the screenshot). The contributing guide is silent on screenshots, alt,
captions, and figures entirely (a zero-match text search); its staleness machinery is
structural and code-focused (`blacken-docs` auto-formatting every example, the `.. console::`
Unix/Windows tab directive, time-boxed `versionadded` annotations). The reader's mapping onto
cairn is direct: the extend, reference, and admin-CLI material matches Django's zero-image
norm; the non-technical editor track is structurally Django's tutorial02 admin walkthrough
and should follow Django's exception, not its norm.

## Tier 2/3: the editor-documenting products (Ghost, WordPress, Statamic)

The two products the competitor review found genuinely documenting the editor, re-read for
visual practice, plus Statamic as the one-page case.

**Ghost (Help Center): the visual IS the procedure.** Cropped screenshots and short embedded
videos (0:12 to 0:43), never a full uncropped window, no annotation overlays; the crop does
the pointing. The pattern on
[using-the-editor](https://ghost.org/help/using-the-editor/): one lead-in sentence, then the
visual carries the demonstration, with no numbered steps duplicating what it shows. Motion is
reserved for interaction sequences with no stable end state (image annotation, link
autocomplete, history diff-and-restore); single-state UI stays a static crop. The split:
video carries the how, prose carries the why and the defaults. **The one thing not to copy:**
content screenshots and videos ship with empty alt text and no captions; "the pixels speak
for themselves" is Ghost's accessibility gap, not a model.

**WordPress (block-editor articles): the screenshot as a versioned artifact.** Roughly 20
cropped, annotated screenshots across the two core articles, plus short videos for
keyboard-driven sequences (shift-click multi-select, backtick-to-inline-code). Two practices
verified directly. First, the **numbered-callout-plus-keyed-prose pattern**: a screenshot's
UI elements numbered 1 through 11, then a definition list keyed to the numbers, with each
entry carrying what the image cannot show (the Cmd+K shortcut, behavior, alternate paths).
Second, the **changelog obligation**: screenshot filenames embed the WordPress version
captured against (`block-editor-overview-6.7-1024x579.jpg`, `...toolbar-1-6.8-...png`), and
each article's dated changelog names the visual delta ("Updated 2025-05-31 — Updated some
screenshots to 7.0 / Removed outdated video"). A stale visual is a tracked defect, not silent
rot; videos get their own staleness lines. Alt text is strong and consistent, naming the UI
state, with visible captions that extend rather than repeat it.

**Statamic: the cautionary case.** The Content Manager's Guide carries two images, neither of
the editing screen; the Control Panel overview has two full-window unannotated screenshots
with a voice-driven caption ("Behold — the Statamic Control Panel!"). Account setup and
password reset get loving detail while the entry-editing screen, where a content manager
lives, gets no visual at all. The reader's synthesis: a single full-window screenshot
standing in for an editing-UI chapter "is not 'prose-first,' it's a documentation gap wearing
prose-first as a justification." The transfer: a live reproduction substitutes for a
screenshot only if it appears on every page teaching a distinct editing action, with prose
held to the Ghost/WordPress standard of carrying only what the render cannot.

**Mobile, across all three: nobody documents the narrow-screen editor.** No mobile-specific
screenshot variant, no narrow-viewport note, on any sampled page of any of the three. cairn's
planned two-width reproductions would exceed the whole category here.

## Tier 3: the git-CMS competitors, re-read through the visual lens

**Keystatic: prose-only by default, with one page of real screenshot work.** Quick start,
configuration, local-mode, and user-interface carry zero visuals; the user-interface page
describes the config-to-sidebar mapping ("Out-of-the-box Keystatic will separate navigation
into two groups") with no picture of either the default or customized result. The github-mode
page is the exception: three screenshots, one per discrete step of the GitHub App
setup-install-authorize flow, cropped to the component (no browser chrome), each with
specific step-tied alt text. That step-per-decision-point pattern maps directly onto cairn's
identical GitHub App onboarding. The staleness tell: the authorization screenshot bakes in a
raw `127.0.0.1:3001` dev callback and Thinkmill's own demo repo, an internal artifact shipped
as documentation. No version labels, no responsive markup, no tap-to-enlarge.

**Decap: zero content visuals on all three sampled pages.** Getting started, configuration
reference, and the architecture page are 100% prose plus site chrome. The architecture page
describes the Redux state tree ("Auth, Config, Collections, Entries, and EntryDraft
reducers") with no diagram, a textbook data-flow-diagram case left entirely to prose. The
live hosted demo at `demo.decapcms.org` is the right idea, but it is only a text link, never
embedded or shown, so the docs get none of the benefit.

**Sveltia: the product's one visual lives on the marketing banner.** The README's
`cover.webp` hero embeds the only view of the actual editor anywhere in the sampled surface;
the docs' content-editor page describes "a two-pane interface," "resizable panes," and
"scroll synchronization" in prose with zero screenshots, and the architecture page contrasts
deployment models with no diagram. At phone width the dense 1280×640 banner shrinks past
legibility. One transferable move: every README image is a live link (image-as-CTA), and the
"730 issues solved" stat card links straight to its substantiating page.

**TinaCMS: the most visual craft in the category, unevenly applied.** The Astro framework
guide carries a terminal-chrome CLI screenshot, an animated click-to-edit GIF, a full admin
screenshot, and an annotated DevTools crop. Two techniques stand out as the strongest found
anywhere in this tier: **timestamp-scoped YouTube embeds** (`?start=554&end=777`, a
223-second window pointed at exactly the paragraph it supports) and **silent, autoplaying,
looping, fluid-width `.webm` demo videos placed immediately after the exact sentence each
illustrates**, one per claim. The unevenness is the finding: the page titled "What is Visual
Editing in TinaCMS?" gets one static image while its sibling page solves the identical
problem with the looping videos. Static screenshots ship at native 2200 to 2560px width with
no zoom affordance (illegible at phone width without pinch-zoom), and two assets show
provenance drift (a Hugo-guide screenshot and a Next.js-guide DevTools crop reused, unrenamed,
in the Astro guide).

**Payload: one screenshot, executed well.** Getting-started and the long fields reference
carry zero images; the admin overview carries a single light/dark paired screenshot
(`admin.jpg`/`admin-dark.jpg`, real retina captures) served through a purpose-built
`LightDarkImage` component (`srcDark`/`srcLight`) that swaps to match the reader's theme,
identical in crop and UI state across both modes. That theme-pairing is the transferable
pattern. The gaps mirror the category: "Field Descriptions... are displayed with subtle style
differences beneath the field inputs" is a purely visual claim with no pixels to check, and
the Field-Component-versus-Cell-Component distinction is words where one side-by-side image
would resolve it.

**The reader's closing synthesis, quoted in substance:** the category's visual failure mode
is not the stereotyped stale screenshot; only Keystatic showed even a staleness-adjacent
tell, and it was hygiene, not drift. **The real, pervasive failure mode is avoidance**:
reference and conceptual pages describe spatial UI relationships entirely in prose, and the
page that most needs a visual is sometimes the exact page that gets none while a sibling in
the same corpus solves the identical problem well. "The risk to plan against is not
'screenshots will rot,' it's 'screenshots will simply not get made' once prose feels
sufficient to the author," and the demonstrated fix is scoping visuals tightly to the one
claim each carries.

## The 320/390 question: what the discipline actually does with diagrams on small screens

The dedicated reader's findings, the direct input to the sitting's second ruling.

**WCAG names diagrams as exempt from reflow, explicitly.** SC 1.4.10 requires presentation
without two-dimensional scrolling at 320 CSS pixels, "**except for parts of the content which
require two-dimensional layout for usage or meaning**," and the W3C's understanding document
lists the canonical exempted types: "Images required for understanding (**such as maps and
diagrams**), video, games, presentations, data tables (not individual cells)..."
([Understanding SC 1.4.10](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)). A
diagram may keep horizontal scroll or a fixed aspect ratio at narrow widths and pass WCAG AA;
the exemption is scoped to the diagram, not the page around it.

**WCAG's actual answer for a diagram is a text alternative, not small-screen legibility.**
The WAI complex-images tutorial requires a two-part alternative for flowcharts and
architecture diagrams: short alt identifying the image, plus a long description carrying the
essential information in body text or a linked page. Write the Docs converges independently:
"Flowcharts or architecture diagrams won't fit in a sentence of alt text, so you should write
short alt text for the gist, then put the full description in the body text."

**No platform ships small-screen diagram legibility as a default.** Across Starlight,
Docusaurus, MkDocs Material, GitBook, and VitePress, the universal default is shrink-to-fit
(`max-width: 100%`); horizontal-scroll containers are the standard convention for wide
tables; click-to-expand exists only as an opt-in plugin (`mkdocs-glightbox`; Docusaurus has
an open unbuilt feature request); pan-zoom is third-party opt-in everywhere and default
nowhere. Mermaid's `useMaxWidth` (default true) solves overflow, not legibility: shrinking a
wide diagram to 320px shrinks its labels proportionally, the exact complaint in mermaid
issues [#1134](https://github.com/mermaid-js/mermaid/issues/1134) and #756 and GitLab docs
issue #1168, none resolved upstream. MkDocs Material's own docs flag that pie, gantt,
user-journey, and git-graph diagrams "don't work well on mobile."

**No published style guide states a diagram-legible-at-320px rule.** Google prescribes SVG
"so they stay sharp when you zoom in"; Kubernetes' style guide standardizes mermaid for
maintainability (text-based, version-controllable) with no mobile bar; Write the Docs treats
diagrams through the text-alternative lens. The one pattern that addresses legibility at the
source is a complexity budget (community guidance: 15 to 20 nodes), an authoring discipline
no platform enforces.

**Reader behavior data is absent, and that absence is the finding.** General web mobile share
is 53 to 60%, but no source measures what fraction of diagram-studying sessions happen on
phones; the ergonomic claim (tracing boxes and arrows is a desk task) is plausible and
unmeasured in either direction.

**The discipline's converged stack, ranked by shipped prevalence:** shrink-to-fit for
overflow safety, a text alternative for the information, and opt-in expand or pan-zoom for
the reader who does want to study closely on a phone. Never a requirement that the diagram
itself render legibly, unzoomed, at 320 to 390px.

## Cross-cutting synthesis: where the research confirms, pressures, or extends the starting position

Findings against `2026-08-15-docs-outlines-with-visuals.md`, stated for the sitting to
adjudicate.

**Confirmed: the editors track's live-reproduction vocabulary.** Tailwind proves the
render-the-real-thing mechanism at production scale; Ghost and WordPress prove the editor-UI
track needs visuals at density and that prose should carry only what the render cannot
(defaults, remembered settings, behavior); Django's admin tutorial and MDN's UI-shaped
how-tos show the same shape from the OSS side; Statamic and the git-CMS tier show the
avoidance failure mode the per-page contracts exist to prevent. Nobody in the category
documents the narrow-screen editor, so the planned two-width rendering exceeds the field.

**Confirmed: the admin track's transcript vocabulary.** Google's "don't use images of
terminal output; use actual text" makes fenced transcripts the standard-compliant form, not a
compromise; Rails and Django demonstrate transcripts-as-state-capture; Stripe's
let-them-run-it and expected-output checks are the same idea; Astro shows terminal chrome can
be automatic per shell fence.

**Pressured: the extend track's diagram density and its "mermaid-first" default.** The
starting position's premise ("every corpus in the competitor review that serves developers
uses them") did not survive the visual re-read: Astro ships one diagram in 418 pages, Stripe
and Tailwind zero, Twilio two in an appendix, Django zero, Rails two. Kubernetes is the one
diagram-rich exemplar, and it pairs density with a mandate (captions, simple diagrams,
diagrams-as-text). The research supports authored diagrams for genuinely spatial content, and
Twilio contributes a usable threshold (three-plus actors or branching paths, not
"architecture" as a category); it does not support diagrams as a default expectation per
concepts page. The proposed inventory (roughly fourteen diagrams across extend and admin)
sits at the Kubernetes end of the observed range; each per-page contract already argues its
diagram replaces specific spatial prose, which is the right defense, and the sitting can
re-test each against the actor-count threshold.

**Open for the sitting: mermaid versus authored components, now a real fork.** Kubernetes
argues mermaid: diagrams as reviewable text in the same PR as prose, the strongest
anti-staleness mechanism for authored diagrams, already renderable in cairn-pub today. Astro
argues the bespoke theme-native component: dark-mode aware, styled in the site's own voice,
which is what the polish constraint asks for, at the cost of hand-building each. A themed
mermaid (custom `themeVariables` plus CSS on the rendered SVG) is the middle path; whether it
clears the polish bar is a taste call, and the marquee diagrams (the architecture block
diagram, the ownership map) may warrant the Astro treatment while the utilitarian flows stay
themed mermaid. The eight-diagram restoration should not proceed as a mechanical
re-render of the deleted originals in the stock theme.

**The 320/390 ruling has a clear evidentiary direction.** No standard, no platform default,
and no style guide binds diagram legibility at 320px; WCAG exempts diagrams from reflow and
asks for a text alternative instead; Microsoft (the one standard that addresses small screens
directly) prescribes simplification and magnifiable access, not universal legibility. The
family bar remains real for the site artifacts it was written for. If the sitting releases
diagrams from the 320 bar, the replacement discipline the research supports is: a complexity
budget per diagram, `overflow-x: auto` scroll containers for wide ones (cairn-pub's mermaid
CSS already carries `max-width: 100%`), and a WAI-style two-part text alternative, which
`DocsMermaid.svelte`'s hidden-description shim partially implements today.

**Extension the starting position lacks: an alt-and-caption discipline, written and gated.**
Every corpus without written image rules ships defects (Rails' empty alt on both diagrams,
Ghost's empty alt on everything); every corpus with rules or enforcement holds the line
(Kubernetes' caption mandate, Astro's build-error on missing alt, WordPress's consistent
practice). cairn's standards both cap alt length (155/150), require `alt=""` over omission,
forbid caption-alt redundancy, and Google adds "introduce a figure in text, never
spatially." A visuals pass that lands images without a written, ideally machine-checked
alt/caption rule repeats the category's most common defect. Astro's build-time enforcement is
the shape that fits cairn's gate culture.

**Extension worth weighing: a motion vocabulary.** The starting position is entirely static.
Ghost, WordPress, and TinaCMS all reserve motion for interaction sequences with no stable end
state (autocomplete, drag, multi-select, history diff), and TinaCMS's per-claim silent
looping `.webm` is the strongest single technique found in the competitor tier. The editors
track documents exactly such sequences (the Tidy review flow, the figure dialog's
cursor-dependent button). Whether the live-reproduction seam ever grows an animated variant
is a later question, but the sitting should decide deliberately rather than by omission.

**Staleness: the two proven mechanisms are the two cairn already chose.** Render the real
thing (Tailwind, Astro's component diagram, cairn's reproduction seam) and version the
artifact with a changelog obligation (WordPress; cairn's engine-version pinning gives this
nearly free). The standards themselves are silent on staleness, so cairn's mechanisms come
from practice, not compliance, and both survived contact with the evidence.

**One correction to carry:** the WordPress numbered-callout-plus-keyed-prose pattern and
Google's callouts-for-figure-descriptions rule together offer a middle form the contracts do
not currently use: a reproduction with numbered markers and a keyed list, for screens (the
entry screen, the library screen) where the contract currently splits into several separate
reproductions. The sitting may fold some multi-reproduction contracts into one
annotated-reproduction-plus-keyed-list page.
