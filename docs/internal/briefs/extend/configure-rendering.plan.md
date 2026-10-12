# Page plan: Configure rendering

Page: `docs/extend/configure-rendering.md`. Page type: task guide. Status: new page, no prior version
on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1). The drafter
drafts from this plan: it is the source of the page's order, each section's claim, and each fact's
placement. The structural edit seat reads it before any prose exists. The plan is Google's outline
written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Revised once on the structural edit's findings (verdict: fix). It fixes the three blocking findings:
"See also" gains the outline's `configure-media` cross-link, "Component authoring grammar" opens on
its own task tie, and "Diagnose a failed check" item 2 drops the unsupported
`rendering.components` cause. It also takes both pace notes: the introduction no longer states the
build-time versus per-request split, and "Built-in render steps" keeps its three pairs minimal.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug `configure-rendering`:
job, covers, out-of-scope list, exemplars); "The page anatomies" and "The introduction" in
`docs/internal/docs-register.md`; every fact bullet named below in `docs/internal/facts/extend.md`;
the two exemplars (`designers/astro-styling`, "Scoped Styles" and "Markdown Styling";
`extenders/payload-custom-components`, "Default Props"); the reference entries each link names
(`docs/reference/core.md` `defineRegistry`, `defineComponent`, the field table under "Fields",
`createRenderer`, `SiteRender`; `docs/reference/render.md` "Types", "The sanitize floor", "Emitted
classes"); the sibling pages `docs/extend/add-cairn-to-a-sveltekit-app.md` ("Write the site config
and a minimal adapter"), `docs/extend/security-model.md` ("Render safety"),
`docs/extend/theme-your-public-site.md` ("Style rendered markdown"),
`docs/extend/reuse-content-across-entries.md` ("Forward resolveFragment from your render"),
`docs/extend/add-an-island.md`, `docs/extend/configure-media.md`, and
`docs/extend/debug-your-site.md`; and the code the facts cite (`src/lib/render/pipeline.ts`,
`src/lib/render/registry.ts`, `src/lib/render/component-grammar.ts`, `src/lib/render/highlight.ts`,
`src/lib/render/table-scroll.ts`, `src/lib/render/remark-figure.ts`,
`src/lib/render/sanitize-schema.ts:17-18,84-90`, `src/lib/content/types.ts:212-258`,
`src/lib/content/compose.ts:57`, `src/lib/admin/EditPage.svelte:1451-1486`,
`src/lib/admin/ComponentInsertDialog.svelte:18-28,246-254`,
`templates/waymark/src/chassis/render.ts:40-50`, `templates/waymark/src/theme/cairn.config.ts:31-37,163-176`,
and `templates/waymark/src/theme/markdown-components.ts`).

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A site has one render function, and everything else on the page plugs into the one `createRenderer`
call that builds it. The page's spine follows that call outward: first the function itself and its
two callers, then what the pipeline does before the site adds anything, then the options and the
plugin that adjust the pipeline, then the site's own components from declaration to registration,
which closes the loop back into `createRenderer`'s first argument. The authoring grammar, the
verification, and the failure path close the page, so the reader checks the whole render once, after
every piece is in place.

The page serves two readers with one spine. The developer who finished the add-cairn tutorial has a
render function over an empty registry in `src/lib/cairn.config.ts` and no plugins, so they run every
step. The developer on a scaffolded site already has the render function, one `createRenderer` call
carrying the smartypants plugin, and nine declared components in `src/theme/markdown-components.ts`
(`f:dat0dd`, `f:qnf469`, `f:u4cfvv`), so they come to add a component, change an option, or learn a
built-in step. The introduction names both, and "Before you begin" tells the scaffolded reader which
sections to skip.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model** (`f:3l7f56`, `f:qvj951`, `f:my6ci3`, `f:uqytbb`): one
   function renders every entry, in the browser for the preview and in the entry loader for the
   public pages, and a component is a directive the site's own code turns into markup. Without the
   model, "build a render function, set options, declare a component, register it" reads as four
   unrelated chores.
2. **Before you begin** names the adapter file per site and `hastscript`, and routes the scaffolded
   reader past the steps they already have.
3. **Build the render function** (cover 1, cover 2's first half, cover 5) comes first because every
   later section changes this one call. Cover 5, how the preview reruns render, closes it as a short
   explanation, since it describes the two callers the reader has just wired, not a step of its own.
4. **Built-in render steps** (cover 8) moves up from the outline's eighth place to follow the render
   function directly. The reader learns what the pipeline already does before deciding what to add,
   which keeps them from building a component for a figure or a table wrap, and two of the next
   section's options (`tableScroll`, `anchorRel`) change these steps, so they need to be known
   first. Its first sentence ties it to the task (adding a component or a plugin), per the anatomy's
   lead-in rule. It takes the Astro exemplar's "Markdown styling" move: this is output the developer
   does not write, and styling it is linked out.
5. **Set the renderer options** (cover 2's second half) follows the built-in steps it adjusts.
6. **Add a remark plugin** (cover 9) moves up from last place to follow the options table directly,
   because it is the `remarkPlugins` option in practice. A reader who came only for typography stops
   here.
7. **Declare a component** (cover 3's first half) starts the component arc: required members, the
   container-only grammar rule that decides how an author can write it, and the typed attributes.
8. **Declare the slots** (cover 3's slot half and cover 6's slot kinds and `itemLabel`) splits the
   slots out of the declaration because they carry five members and three behaviors a reader must
   not have to dig out of source, the Payload exemplar's take.
9. **Write the build function** (cover 3's build context, cover 4, cover 6's full build context)
   follows the slots, because `build` reads exactly the attributes and slots the two sections before
   it declared. The full context is one table here, never split across sections as the outline's
   covers split it.
10. **Shape the picker entry** (cover 6's picker and configure-step members) follows `build`: these
    members change only the editor's picker, never the render, so they are optional polish on a
    component that already renders.
11. **Register the component** (the registry half of cover 7, plus `f:uqytbb`) closes the arc back
    into `createRenderer`, the call "Build the render function" made. The reserved-name throw lands
    here, where `defineRegistry` raises it.
12. **Component authoring grammar** (cover 7) follows registration because its "this input, this
    output" pair, the Astro exemplar's take, needs a registered component with a `build` to produce
    the output. Its own first sentence names the reader's task, checking the component in the
    editor, before it states the grammar, per the anatomy's lead-in rule; the hand-off before it does
    not stand in for that lead-in.
13. **Verify the render** is the anatomy's item 4, and **Diagnose a failed check** its item 5.
14. **See also** closes the page, per the anatomy (item 6).

### Departures from the outline's covers order, with the reason for each

- Cover 8 (built-in steps) moves to second among the body sections (item 4), and cover 9 (remark
  plugins in practice) moves to follow the options (item 6). Both reasons are above.
- Cover 5 (the preview's debounce) folds into "Build the render function" as its closing explanation
  rather than taking a heading (item 3).
- Covers 3 and 6 interleave as declaration, slots, build, and picker (items 7 to 10), so each member
  is stated once where the reader uses it. The build context is one table in "Write the build
  function"; the slot kinds and `itemLabel` sit in "Declare the slots".
- Cover 7 splits: the reserved `figure` and `include` names land in "Register the component", where
  the throw bites, and the grammar keeps the rest (items 11 and 12).
- Cover 2 lists "highlighting" among the `RendererConfig` options, but `RendererConfig` has no
  highlighting option: the highlighter runs on every render (`f:dwc2bu`,
  `src/lib/render/pipeline.ts:124-129`). The page says so once in "Set the renderer options" and
  describes the highlighter in "Built-in render steps".

### Exemplar takes, and where each lands

- **Astro, Styling.** The "this CSS compiles to this" pair lands as input-and-output pairs: the
  directive markdown and the HTML its `build` produces in "Component authoring grammar", and a
  fenced block, a table, and a figure with their output in "Built-in render steps". "Markdown
  styling", styling content the developer does not write, lands as one linked sentence in "Built-in
  render steps" pointing at `docs/extend/theme-your-public-site.md#style-rendered-markdown`. Left
  behind: the breadth across preprocessors.
- **Payload, Custom Components.** Every component defined the same way through one registry lands as
  the component arc (items 7 to 11) ending in one `defineRegistry` call. "Default Props", the props
  every component receives listed in a table, lands as the build-context table in "Write the build
  function" and the slot-member table in "Declare the slots", so the reader never reads
  `src/lib/render/registry.ts`. Left behind: the import map, React Server Components, and the
  performance section.

### Heading policy

Task headings start with a bare infinitive. "Before you begin" and "See also" are the anatomy's fixed
headings. "Built-in render steps" and "Component authoring grammar" are the two explanation sections
and take noun phrases. Every inbound link to the page (`docs/extend/theme-your-public-site.md:38,506`,
`docs/extend/architecture.md:70`, `docs/extend/content-model.md:26,206`,
`docs/extend/security-model.md:49,520`, `docs/extend/reuse-content-across-entries.md:47,361`,
`docs/extend/add-an-island.md:26,37,40,284`, `docs/extend/define-an-adapter-and-schema.md:40,74,543`)
links the page itself with no anchor, so every heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons the
final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** A cairn site turns an entry's
   markdown into HTML with one function, the adapter's `rendering.render`, and the edit page's live
   preview and every public page call that same function, so there is no second render path to keep
   in step (`f:3l7f56`). The site builds it with `createRenderer` (`f:qvj951`). Where SvelteKit and
   Cloudflare fit: the preview runs it in the browser as the author types, and the public routes run
   it on the server in the entry loader (`f:my6ci3`). State the build-time versus per-request split
   only in the closing explanation of "Build the render function", where the reader has just wired
   the two callers (structural edit, pace note). A component is a container directive in the markdown that a `build` function the
   site writes turns into markup, and one registry feeds both the render pipeline and the editor's
   component picker (`f:fqdknx`, `f:htxey1`, `f:uqytbb`).
2. **Who and why, with the contract.** Two readers. A developer on the add-cairn tutorial's site has a
   render function over an empty registry in `src/lib/cairn.config.ts` (`f:q07rd5`). A developer on
   a scaffolded site, whose adapter is `src/theme/cairn.config.ts`, already has the render function,
   the smartypants plugin, and nine declared components (`f:q07rd5`, `f:dat0dd`, `f:qnf469`), and
   comes to add a component, change an option, or learn what a built-in step emits. The contract
   sentence, inside the framing: build the render function, set its options, add a remark plugin,
   declare and register a component of your own, and check that the preview and the published page
   render it the same way.
3. **Prior knowledge.** TypeScript, the unified plugin model (a remark plugin works on the markdown
   tree, a rehype plugin on the HTML tree), and building a hast element with `hastscript`'s `h()`.
   No cairn knowledge beyond the adapter file.
4. **What the page does not cover, with the page that does (wrong-place routing).** What the sanitize
   floor and the sink guard protect, and what turning the floor off costs:
   `docs/extend/security-model.md#render-safety`. Hydrating a component in the browser:
   `docs/extend/add-an-island.md`. Styling the rendered output:
   `docs/extend/theme-your-public-site.md#style-rendered-markdown`. Fragments and `::include`:
   `docs/extend/reuse-content-across-entries.md`. The media resolver and missing assets:
   `docs/extend/configure-media.md`. This sentence may name the page, since scope has no
   subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording may
move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the ids it
draws on ("cited again" marks a fact whose primary home is another section); the content and steps;
and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in passed the
provenance extractor with no row).

### Before you begin

**First sentence:** Rendering is set in the adapter file of the site you are changing, and a
component builds its markup with `hastscript`.

**Facts:** `f:q07rd5` (scoped: the two adapter paths only; its tutorial-hooks clause is not used),
`f:qnf469` (scoped: `src/theme/markdown-components.ts` holds nine `defineComponent` declarations),
`f:2dsv35` (scoped: sites build markup with hastscript's `h()`). Cited again: `f:dat0dd`,
`f:u4cfvv`.

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- The adapter file: `src/lib/cairn.config.ts` on the add-cairn tutorial's site, `src/theme/cairn.config.ts`
  on a scaffolded site (`f:q07rd5`). Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter` for the
  tutorial's adapter.
- The `hastscript` package, installed with `npm install hastscript` (`f:2dsv35`). Link hastscript's
  own README (vendor; the drafter confirms the URL resolves, for example
  https://github.com/syntax-tree/hastscript). Claim nothing about whether the scaffold already
  depends on it: no fact states the template's `package.json`.

Then one or two sentences for the scaffolded reader: a scaffolded site already renders through one
`createRenderer` call with the smartypants plugin and a registry built from the nine components in
`src/theme/markdown-components.ts` (`f:dat0dd`, `f:qnf469`, `f:u4cfvv`), so it can skip "Build the
render function" and "Add a remark plugin" and add its component to that module's list. Name the
sections by heading.

**Hand-off:** none; the next section opens on its own first sentence.

### Build the render function

**First sentence:** The adapter's `rendering.render` turns an entry's markdown into HTML, and the
edit page's preview and every public page call that same function.

**Facts:** `f:3l7f56`, `f:qvj951`, `f:ps54gh`, `f:dmn2uu` (scoped: the two functions and
`renderDocument`'s headings), `f:my6ci3`.

Content:

- The `SiteRender` type as a code block: it takes `{ body, concept?, frontmatter?, resolve?,
  resolveMedia?, resolveFragment? }` and resolves to an HTML string only, with no headings
  (`f:ps54gh`).
- A numbered list of two steps, one action each, the location first, lead-in "To build the render
  function, follow these steps:" (no-claim):
  1. In the adapter file, call `createRenderer` once with the site's registry and keep the
     `renderMarkdown` it returns (`f:dmn2uu`, `f:qvj951`). One clause: the tutorial's site already
     calls it over `defineRegistry({ components: [] })`, which "Register the component" replaces.
  2. In the adapter's `rendering` group, set `render` to pass `body` and the three resolvers to
     `renderMarkdown` (`f:ps54gh`). The code block is the tutorial site's `src/lib/cairn.config.ts`
     excerpt (its lines 307 and 332-335 on `docs/extend/add-cairn-to-a-sveltekit-app.md`), other
     adapter members elided with a comment.
- One sentence on why every resolver is forwarded: the preview and the build each pass their own
  resolvers, so a `render` that drops one breaks that kind of reference in one of its callers. Link
  `docs/reference/core.md#siterender` for which resolver each caller passes (opened and confirmed: it
  says the build passes a site-resolver-backed resolver and the preview a manifest-backed one). The
  `resolveFragment` and `resolveMedia` wiring belong to `docs/extend/reuse-content-across-entries.md#forward-resolvefragment-from-your-render`
  and `docs/extend/configure-media.md`; name both in one clause, no more. One clause: the scaffold's
  `render` falls back to its public media resolver when none is passed (`f:u4cfvv`), which
  `configure-media` covers.
- One or two sentences on headings: `renderMarkdown` fits `SiteRender`, and a route that needs the
  headings, for a table of contents, calls `renderDocument` directly, which returns the HTML plus the
  headings in document order as `{ id, text, depth }` (`f:ps54gh`, `f:dmn2uu`). Link
  `docs/reference/core.md#createrenderer` (opened and confirmed: it shows `renderDocument`'s return
  and a headings example).
- The section's closing explanation, two sentences (cover 5): the edit page reruns `render` from an
  effect debounced on the live body and discards a result when a newer render has started, and the
  public routes call the same `render` in the entry loader, at build when the route is prerendered
  and per request otherwise (`f:my6ci3`). So `render` runs many times while an author types, and an
  out-of-order result never reaches the preview. Give no debounce figure: the fact states none.

**Hand-off (no-claim):** "With the render function in place, look at what the pipeline already does
before you add to it."

### Built-in render steps

**First sentence:** Before you add a component or a plugin, note that a renderer over an empty
registry already renders plain markdown, GFM tables, `cairn:` links, and `media:` references, and
highlights code, wraps tables, and places figures on its own.

This is the page's first explanation section. Its first sentence ties it to the task (adding a
component or a plugin), per the anatomy's lead-in rule. Explanation sentences are exempt from the
26-word cap.

**Facts:** `f:dmn2uu` (scoped: an empty registry still renders), `f:dwc2bu` (scoped: build-time,
class-only `cairn-tok-*`, unconditional, no client highlighter; its sanitize-floor and sink-guard
placement clause is not used), `f:dni13r`, `f:db26u3`, `f:dw4rbb`, `f:e11npv`. Cited again:
`f:wvcw71` (`tableScroll` turns the wrap off), `f:cgwyp6` (`figure` is reserved).

Content, as three short subparts in prose, each a "this input, this output" pair (the Astro take).
The drafter produces every output block by running the input through `createRenderer` in the
worktree, never by hand, and trims the output only with an ellipsis comment. Keep each pair to the
smallest input that shows the step (one or two code lines, a one-row table, a one-line figure) and
trim each output to the element the prose names, so the section stays a short lead-in before the
options, not a full listing: the full class list stays on `docs/reference/render.md#emitted-classes`,
which the closing sentence links (structural edit, pace note; the anatomy puts a full output
listing on the reference entry):

- **Code.** The highlighter runs at build time on every render and emits class-only output, the
  `cairn-tok-*` classes on spans inside a `pre.shiki` block, with no inline style and no highlighter
  shipped to the browser (`f:dwc2bu`). It preloads js, ts, jsx, tsx, svelte, html, css, json, bash,
  markdown, python, yaml, and sql with their aliases; a fence in any other language, or with none,
  renders as plain `pre.shiki` text with no token classes and never throws (`f:dni13r`). A fenced
  `mermaid` block passes through untouched, keeping `<code class="language-mermaid">` for a
  client-side diagram renderer (`f:db26u3`). Pair: a short `ts` fence and its output.
- **Tables.** Each rendered table is wrapped in `div.table-scroll` with `role="region"`,
  `tabindex="0"`, and an `aria-label` of `Table: ` plus the first header row's cell text,
  comma-joined, or `Table` when there is no header row, and the table stays a real table inside
  (`f:dw4rbb`). Pair: a two-column markdown table and its output. One clause: `tableScroll: false`
  turns the wrap off, as "Set the renderer options" says (`f:wvcw71`).
- **Figures.** The engine's own `:::figure` directive keeps a placement class only when its `class`
  is exactly `center`, `wide`, or `full`, emitted as `cairn-place-<role>`; it ignores any other class
  without an error, and a figure with no `media:` image still renders as a `<figure>` around its
  other children without throwing (`f:e11npv`). Pair: a `:::figure{class="wide"}` directive and its
  `<figure class="cairn-place-wide">` output; the drafter picks an input whose output needs no media
  resolver (a figure with no `media:` image), since the resolver is `configure-media`'s.
- One closing sentence, the Astro "Markdown styling" move: the engine writes these classes and the
  site's theme styles them. Link `docs/reference/render.md#emitted-classes` (opened and confirmed: it
  lists `pre.shiki`, the six `cairn-tok-*` classes, `cairn-place-*`, and `table-scroll`, and who
  styles each) and `docs/extend/theme-your-public-site.md#style-rendered-markdown`.

**Hand-off (no-claim):** "To change or turn off a built-in step, set the renderer options."

### Set the renderer options

**First sentence:** `createRenderer`'s second argument, a `RendererConfig`, extends the sanitize
allowlist, sets the table wrap and the anchor `rel`, and adds a site's own plugins.

**Facts:** `f:wvcw71`, `f:xothz1` (scoped: the plugin-position half only), `f:7fw82j`. Cited again:
`f:dwc2bu` (highlighting has no option).

Content:

- One step, a single bulleted item, location first: in the adapter file, pass the options object as
  the second argument of the one `createRenderer` call.
- A table of the five options, introduced by a sentence stating its purpose, columns Option, Default,
  What it does. Each cell stays short; a rule that bites follows the table as a sentence:
  - `sanitizeSchema`: a callback that receives cairn's default schema and returns the schema to use,
    to admit benign HTML the site's content needs (`f:wvcw71`). No default cell claim beyond
    "cairn's default schema". The rule: link `docs/reference/render.md#the-sanitize-floor` for what
    the callback can't lower (opened and confirmed: it says cairn removes `script` from the returned
    `tagNames`, merges the default `strip` list back in, and throws when no `tagNames` array comes
    back), and `docs/extend/security-model.md#render-safety` for what the floor protects. State
    neither on this page (out of scope; friction filed on security-model's limits paragraph).
  - `tableScroll`: the table wrap from "Built-in render steps", on unless set to `false`, for a site
    that wraps its own tables (`f:wvcw71`, `f:dw4rbb`). The default `true` is the reference's: link
    `docs/reference/core.md#createrenderer` (opened and confirmed: it says "`RendererConfig.tableScroll`
    (default `true`)").
  - `anchorRel`: the `rel` value forced on every `target="_blank"` anchor, default
    `'noopener noreferrer'`, and `false` leaves the step out (`f:7fw82j`). The rule, one sentence: the
    step runs after highlighting and ahead of the sink guard, the table-scroll wrap, and the site's
    own `rehypePlugins`, so it covers anchors a component builds but not an anchor a site's
    `rehypePlugins` add (`f:7fw82j`). Never quote or paraphrase the option's doc comment ("applied
    last"); the page states the real position (friction filed by the page inputs).
  - `remarkPlugins`: run after cairn's own remark steps (include resolution, the directive stamp,
    `cairn:` links, figures, and `media:` resolution) and before the remark-to-rehype conversion
    (`f:xothz1`, `f:wvcw71`).
  - `rehypePlugins`: run last of all, after the table-scroll wrap (`f:xothz1`, `f:wvcw71`).
- One sentence after the table: highlighting takes no option, since the highlighter runs on every
  render (`f:dwc2bu`).
- One sentence pointing at the full stage order without restating it: the pipeline's fixed order of
  stages, and where the sanitize floor sits in it, is on `docs/extend/security-model.md#render-safety`.
  Do not cite `f:xothz1`'s sanitize-floor clause here.
- `unsafeDisableSanitize` stays off the table: its cost is security-model's, and the introduction's
  wrong-place sentence routes the reader there.

**Hand-off (no-claim):** "Next, add a remark plugin of your own."

### Add a remark plugin

**First sentence:** A scaffolded site smartens quotes, dashes, and ellipses by passing
`remark-smartypants` to its one `createRenderer` call through `remarkPlugins`.

**Facts:** `f:dat0dd`. Cited again: `f:xothz1` (where a remark plugin runs).

Content:

- One sentence after the first: straight quotes, `--` and `---`, and `...` in body prose are
  smartened the same way in the public render and the preview, while inline code, code blocks, and
  link URLs stay untouched (`f:dat0dd`). One clause on why: the plugin is a remark plugin, so it runs
  over the markdown tree before the conversion to HTML (`f:xothz1`).
- The scaffold's wiring as the worked example, one code block with two excerpts named by first-line
  comments: `src/chassis/render.ts` exporting `proseTypography` as
  `[[remarkSmartypants, { dashes: 'oldschool' }]]`, and `src/theme/cairn.config.ts` calling
  `createRenderer(registry, { remarkPlugins: proseTypography })` (`f:dat0dd`). One sentence for the
  scaffolded reader: another remark plugin goes in the same list.
- A numbered list of two steps for the tutorial's site, lead-in "To add the plugin to the tutorial's
  site, follow these steps:" (no-claim):
  1. In a terminal at the project root, run `npm install remark-smartypants`.
  2. In `src/lib/cairn.config.ts`, pass `{ remarkPlugins: [[remarkSmartypants, { dashes: 'oldschool' }]] }`
     as `createRenderer`'s second argument, importing `remarkSmartypants` from `remark-smartypants`.
- Link the plugin's own README for its other options (vendor; the drafter confirms the URL, for
  example https://github.com/silvenon/remark-smartypants). Copy no option list.

**Hand-off (no-claim):** "With the pipeline set, declare a component of your own."

### Declare a component

**First sentence:** `defineComponent` declares one container directive from a required `name`,
`label`, `description`, and `build`, with `attributes`, `slots`, and `hydrate` optional.

**Facts:** `f:htxey1`, `f:fqdknx`, `f:cxhx8w`, `f:zh8wdb`.

Content:

- The running example, one code block in a new module the tutorial's reader creates,
  `src/lib/markdown-components.ts`, mirroring the scaffold's `src/theme/markdown-components.ts`
  (`f:qnf469`): a `takeaways` component with `label`, `description`, a `tone` attribute
  (`fields.select` over `note` and `tip`), and the `build` the section "Write the build function"
  writes, shown here as a stub comment. The slots arrive in the next section's version of the block.
  Pick no name the scaffold declares (`callout`, `alert`, `icon`, `video`, `pull-quote`, `cta`,
  `micro-cta`, `faq`, `banner`), so a scaffolded reader can add it beside their nine.
- One sentence on the grammar rule that decides how an author can write it: the vocabulary is
  container-only, `:::name[Title]{attrs}` to a closing `:::`; a leaf `::name{attrs}` or text
  `:name{attrs}` form is restored to its literal source text, since the pipeline reads it as a stray
  colon in prose such as a time or a ratio, and `::include` is the one leaf form the pipeline reads
  (`f:fqdknx`). Link `docs/extend/reuse-content-across-entries.md` for `::include`.
- Typed attributes, as a bulleted list or two sentences: `attributes` accepts exactly ten `fields.*`
  types, `text`, `textarea`, `number`, `select`, `url`, `email`, `date`, `datetime`, `boolean`, and
  `icon`, because each serializes to one directive-attribute string; `multiselect`, `object`,
  `array`, `reference`, and `image` throw at declaration with the message that begins
  `a directive attribute must be a single-value scalar` (`f:cxhx8w`, `f:htxey1`).
- One or two sentences on validation: the attributes are checked by the same fieldset machinery a
  concept's fields use, since `defineComponent` builds an `attributeSchema` with
  `defineFieldset(attributes, { behavior })` and `validateComponent` runs it (`f:zh8wdb`). So a
  cross-field rule goes in the component's `behavior` table, keyed by attribute name, and
  `attributeSchema` is the constructor's to set, never the site's. Link
  `docs/reference/core.md#definecomponent` (opened and confirmed: it lists the ten types, the
  `behavior` table, and the shared validator) and the field table under `docs/reference/core.md#fields`
  for what each type renders and validates; an `icon` attribute's picker needs the adapter's icon
  set, which that table states (opened and confirmed: "glyph picker when the adapter supplies an
  icon set").
- One clause on `hydrate`: it opts the directive into a client island, which
  `docs/extend/add-an-island.md` covers (`f:htxey1`). No more.

**Hand-off (no-claim):** "Next, declare the regions an author fills."

### Declare the slots

**First sentence:** A slot named `title` is the directive's bracketed label, a slot named `body` is
its default content, and any other name is a named region.

**Facts:** `f:0aatf6`, `f:cefzv5` (scoped: the three kinds; its build-context clauses are placed in
"Write the build function"), `f:t4px7i`, `f:bnqj5z`, `f:w7c3i6`. Cited again: `f:htxey1` (`name` and
`label`).

Content:

- One sentence after the first: `title` and `body` are handled specially by the grammar the editor's
  insert dialog writes and reads (`f:0aatf6`), which "Component authoring grammar" shows.
- A table of the slot members, introduced by a sentence stating its purpose, the Payload take, columns
  Member, What it does:
  - `name` and `label` (`f:htxey1`).
  - `kind`: `'inline'`, `'markdown'`, or `'repeatable'` (`f:cefzv5`). State only the three values; no
    fact describes what `inline` and `markdown` change.
  - `required`: the insert form marks the slot with an asterisk, keeps **Insert** disabled until it is
    filled (a repeatable slot needs one non-empty item), and shows `<label> is required.` once the slot
    is touched, and the insert validator repeats the check (`f:w7c3i6`).
  - `itemFields`, for a repeatable slot: names each item's fields, but the insert form reads only the
    first declared field's key, so each item is one string under that key, `text` when `itemFields`
    is absent (`f:t4px7i`).
  - `itemLabel(item, index)`, for a repeatable slot: names each row in the insert form from that
    one-key record and the zero-based index; when it returns nothing or blank text, the row reads as
    the slot label plus the row number (`f:bnqj5z`, `f:t4px7i`).
- The rule that bites, one sentence after the table: the render pipeline never reads `required`, so
  a hand-typed directive without the slot still renders (`f:w7c3i6`).
- The running example's `slots` array: `title` (`inline`, `required: true`), `body` (`markdown`),
  and `points` (`repeatable`, with an `itemLabel` that returns the item's `text`).
- Leave `SlotDef.help` off the page entirely: no engine surface reads it (cut; friction filed by the
  page inputs).

**Hand-off (no-claim):** "Next, write the function that builds the component's markup."

### Write the build function

**First sentence:** `build` receives the directive's attributes and rendered slots and returns one
hast `Element`, synchronously, once for each occurrence in the markdown.

**Facts:** `f:s6n9zw`, `f:2dsv35`, `f:cefzv5` (the context members and the entrance ordinal),
`f:34wt4f`.

Content:

- A table of the context members, introduced by a sentence stating its purpose, the Payload "Default
  Props" take, columns Member, What it returns: `attributes` (the declared values, keyed by
  attribute); `slot(name)` (a slot's rendered children, an empty array when absent); `items(name)`
  (one child list per repeatable item); `attr(key)` (a declared attribute's string value, `undefined`
  for a boolean or absent one); `node` (the stamped component element) (`f:2dsv35`, `f:cefzv5`).
- One sentence: the engine ships no hast-building helper beyond the context, so a site builds its
  markup with hastscript's `h()` (`f:2dsv35`). Link `docs/reference/render.md#types` for
  `ComponentContext` (opened and confirmed: it states the type and `attr(key)`'s `undefined`).
- The running example's `build`, one code block: an `aside` with the classes `takeaways` and
  `takeaways-<tone>`, holding `ctx.slot('title')`, `ctx.slot('body')`, and a list over
  `ctx.items('points')`.
- One or two sentences on the synchronous rule: `build` runs inline in the pipeline's tree transform
  and can't `await`, so data a component needs is fetched outside the render pipeline and passed in
  through `attributes` (`f:s6n9zw`). Link `docs/reference/core.md#definecomponent` (opened and
  confirmed: it states the synchronous rule and the pre-fetch).
- One sentence: the engine stamps the entrance ordinal on `build`'s top-level result, so `build`
  carries no motion of its own (`f:cefzv5`). Name no attribute for the ordinal; the fact names none.
- The class-name rule, one or two sentences where it bites: name a component's inner classes apart
  from any DaisyUI component class, such as `card-body` or `card-title`, because DaisyUI's plugin
  generates CSS for a matching class name anywhere in scanned source, so a reused name is restyled
  when the site turns that DaisyUI component on elsewhere (`f:34wt4f`). The example's
  `takeaways-*` classes follow it. Never point at the scaffold's `alert` component as an instance:
  it reuses DaisyUI's `.alert` (friction filed).

**Hand-off (no-claim):** "Next, shape how the component appears in the editor's picker."

### Shape the picker entry

**First sentence:** The optional `icon`, `group`, `hidden`, `insertTemplate`, `use`, and `preview`
members shape the component's row in the editor's picker.

**Facts:** `f:c7ruij`.

Content:

- One step, a single bulleted item, location first: in the component's declaration, add the members
  the picker row needs.
- A table, introduced by a sentence stating its purpose, columns Member, What it does: `icon` (a
  glyph key from the site's icon set), `group` (the row's heading in the picker), `hidden` (left out
  of the top-level picker), `insertTemplate` (the markdown inserted at the cursor), `use` (one line
  of guidance), and `preview` (a sample whose presence opts the configure step into the two-pane live
  preview, with optional `attributes` and `slots`) (`f:c7ruij`).
- One sentence on `defaultIconByRole`: a non-empty map overrides the engine's role-to-glyph defaults,
  and `defineRegistry` throws when the component declares no `type: 'icon'` attribute
  (`f:c7ruij`).
- The running example gains `group`, `use`, and a `preview` sample.
- Describe `insertTemplate` only in the fact's words. Never say it seeds the guided form or that every
  component uses it (friction filed: the dialog reads it only for a component with no attributes and
  no slots).

**Hand-off (no-claim):** "With the component declared, register it."

### Register the component

**First sentence:** `defineRegistry({ components })` builds the one registry that the render pipeline
and the editor's component picker both read.

**Facts:** `f:uqytbb`, `f:cgwyp6`, `f:rrvh33`, `f:u4cfvv` (scoped: the scaffold passes the registry to
`createRenderer` and sets `components: registry` beside `render`). Cited again: `f:c7ruij` (the
`defaultIconByRole` throw), `f:qnf469` (the scaffold's component module), `f:qvj951`.

Content:

- A numbered list of four steps, one action each, the location first, lead-in "To register the
  component, follow these steps:" (no-claim):
  1. In the adapter file, build the registry from the component list:
     `const registry = defineRegistry({ components: [takeaways] })` (`f:uqytbb`). On a scaffolded
     site, add the component to the `components` list in `src/theme/markdown-components.ts` instead,
     which the adapter's registry already reads (`f:qnf469`, `f:u4cfvv`).
  2. In the same file, pass `registry` as `createRenderer`'s first argument, in place of the
     tutorial's empty registry (`f:uqytbb`, `f:qvj951`).
  3. In the adapter's `rendering` group, set `components: registry`, as the scaffold does
     (`f:u4cfvv`).
  4. In `src/routes/admin/[...path]/+page.svelte`, pass `registry={cairn.rendering.components}` to
     `CairnAdmin`; the scaffold's admin page already passes it (`f:rrvh33`).
- Two sentences after the first sentence: the pipeline receives the registry through
  `createRenderer` (`f:uqytbb`), and the picker only through `CairnAdmin`'s `registry` prop
  (`f:rrvh33`), two separate hand-offs, so no sentence implies one registration reaches both.
- One sentence after the steps, claim-scoped: the scaffold hands the same registry to both
  `createRenderer` and `rendering.components` (`f:u4cfvv`). State no consequence of skipping step 3:
  no fact states that the picker reads `rendering.components` (friction filed).
- The throws `defineRegistry` raises, one or two sentences: a component named `figure` or `include`,
  the directive names the engine's own render steps handle, throws with a message telling the
  developer to remove the component if the built-in covers the use or to rename it (`f:cgwyp6`); and
  a non-empty `defaultIconByRole` on a component with no `type: 'icon'` attribute throws
  (`f:c7ruij`).
- Link `docs/reference/core.md#defineregistry` (opened and confirmed: it says the render pipeline
  and the editor palette both read the registry).

**Hand-off (no-claim):** "Before you verify, read the markdown an author writes for the component."

### Component authoring grammar

**First sentence:** To check the component in the editor, know the markdown it writes: a four-colon
outer fence holding one nested `:::slotName` container for each named slot.

This is the page's second explanation section. Its own first sentence ties it to the task: it names
the check the reader is about to run ("To check the component in the editor") before it states the
grammar claim (`f:co54dg`), the same lead-in move "Built-in render steps" makes with "Before you add
a component or a plugin". The hand-off before it does not count as the lead-in. Explanation
sentences are exempt from the 26-word cap.

**Facts:** `f:co54dg`, `f:0aatf6` (scoped: the insert dialog writes and reads the grammar). Cited
again: `f:fqdknx` (container-only), `f:cgwyp6` (the reserved names).

Content:

- The Astro pair: the `takeaways` directive as an author writes it (a four-colon fence, the title as
  the bracketed label, `{tone="tip"}`, a body paragraph, and a nested `:::points` container whose
  items are bullet lines), then the HTML the registered `build` produces from it. The drafter
  produces the output by running the input through the page's own registry and `createRenderer` in
  the worktree, never by hand.
- Three sentences, the rules the pair shows: a repeatable slot's items are bullet lines inside its
  container, and a directive's bracketed label is dropped when the component declares no `title` slot
  (`f:co54dg`); `title` is the bracketed label and `body` the unmarked content (`f:0aatf6`).
- One sentence on what an author can't write: a leaf or text form of the name renders as literal
  text (`f:fqdknx`), and `:::figure` and `::include` belong to the engine (`f:cgwyp6`), so the
  reserved names never reach a site component.

**Hand-off (no-claim):** "With the grammar in hand, check the component end to end."

### Verify the render

**First sentence:** The component renders the same markup in the edit page's preview and on the
published page.

**Facts:** `f:3l7f56`, `f:my6ci3` (scoped: the preview reruns on the live body), `f:co54dg`. Cited
again: `f:c7ruij` (the picker row's group and label), `f:dat0dd` (smartened quotes).

A numbered list, one check to a step, the location first, lead-in "To verify the render, follow these
steps:" (no-claim):

1. In a terminal, start the site's dev server.
2. In the admin, open an entry and insert the component from the picker, where it appears under its
   `group` (`f:c7ruij`). No editor walkthrough beyond this: the editor documentation, which has no
   page yet, is named in words with no link.
3. In the editor, check that the inserted markdown has the four-colon fence and the nested slot
   container (`f:co54dg`).
4. In the editor's preview, check that the pane shows the component's markup after a short pause
   and updates as you type (`f:my6ci3`). With the plugin from "Add a remark plugin" in place, a
   straight quote typed in body prose shows curly (`f:dat0dd`).
5. Publish the entry, and after the deploy, open the public page and inspect the component's element:
   its classes match the preview's (`f:3l7f56`).

**Hand-off (no-claim):** "When a check fails, work through the following causes in order:"

### Diagnose a failed check

**First sentence:** Each failed check points at one declaration: an attribute type, a reserved name,
the picker members, the directive's form, or a fence's language.

**Facts:** `f:cxhx8w`, `f:cgwyp6`, `f:c7ruij`, `f:rrvh33`, `f:fqdknx`, `f:dni13r`.

A numbered list of ordered checks (anatomy item 5), in the order of the "Verify the render" steps that
reach them. Each item names what the reader sees, then the cause, then the fix or the link:

1. The dev server stops at startup with an error naming the component (Verify step 1). An attribute
   of a type outside the ten throws `a directive attribute must be a single-value scalar ...`
   (`f:cxhx8w`); a component named `figure` or `include` throws with the remove-or-rename message
   (`f:cgwyp6`); a `defaultIconByRole` with no `type: 'icon'` attribute throws (`f:c7ruij`). Name
   "Declare a component" and "Register the component" by heading.
2. The component is missing from the picker (Verify step 3). First cause: the admin catch-all page
   passes `CairnAdmin` no `registry` prop, so the editor shows no insert trigger (`f:rrvh33`, which
   now states what the picker reads); name "Register the component" by heading. Second cause:
   `hidden` is set, which leaves it out of the top-level picker (`f:c7ruij`); name "Shape the
   picker entry" by heading.
3. The directive shows as literal text in the preview (Verify step 4): it was written as a leaf
   `::name` or text `:name` form, which always restores to its source (`f:fqdknx`).
4. A code block in the preview or on the page shows no token colors (Verify steps 4 and 5): its fence
   names a language outside the preloaded set, which renders as plain `pre.shiki` text
   (`f:dni13r`). Name "Built-in render steps" by heading.

Then one sentence for anything else: the structured logs are where a running site's failures appear,
linking `docs/extend/debug-your-site.md#read-the-structured-logs`. That page has no render row (friction
filed), so the four causes stay here and the link claims nothing about rendering.

**Hand-off:** none; "See also" follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves out,
with the recovery link (`docs/extend/debug-your-site.md`) not repeated. One introducing sentence,
"The following pages cover the pieces this page links to:" (no-claim), then a bulleted list, each
item's link text naming its destination:

- `docs/reference/core.md#createrenderer`, the renderer and its options.
- `docs/reference/core.md#definecomponent` and `docs/reference/core.md#defineregistry`, the component
  and registry entries.
- `docs/reference/render.md`, `ComponentContext` and the emitted classes.
- `docs/extend/security-model.md#render-safety`, what the sanitize floor and the sink guard protect.
- `docs/extend/add-an-island.md`, hydrating a component in the browser.
- `docs/extend/theme-your-public-site.md#style-rendered-markdown`, styling the rendered output.
- `docs/extend/reuse-content-across-entries.md`, fragments and `::include`.
- `docs/extend/configure-media.md`, the media resolver `render` forwards and what a missing asset
  renders (opened and confirmed: its "Resolve media on public pages" and "Fail the build on a
  missing asset" sections state both). This is the outline's fourth `crossLinks` entry, which the
  first version of this list left out (structural edit, blocking finding 1). Link the page itself,
  no anchor, since the bullet names two of its sections.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The 31 fact ids this plan was
handed are all carried, four of them marked scoped. `f:21by9u`, from the outline's list, stays cut, as the
page inputs disposed it. The plan adds two container facts, each scoped and named where it lands.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:3l7f56 | carried | Build the render function (one `rendering.render`, both callers); cited again in Introduction and Verify the render |
| f:dmn2uu | carried (scoped) | Build the render function (`renderMarkdown`, `renderDocument`, headings); scoped in Built-in render steps (an empty registry still renders) |
| f:s6n9zw | carried | Write the build function (synchronous, once per occurrence, no `await`, pre-fetch through attributes) |
| f:cxhx8w | carried | Declare a component (the ten types, the five that throw, the message); cited again in Diagnose a failed check |
| f:34wt4f | carried | Write the build function (class names apart from DaisyUI's) |
| f:wvcw71 | carried | Set the renderer options (the option set); cited again in Built-in render steps |
| f:fqdknx | carried | Declare a component (container-only, leaf and text restored, `::include`); cited again in Introduction, Component authoring grammar, and Diagnose a failed check |
| f:ps54gh | carried | Build the render function (`SiteRender` signature, string only, `renderDocument` for headings) |
| f:my6ci3 | carried | Build the render function (closing explanation: debounce, stale discard, loader at build or per request); cited again in Introduction and Verify the render |
| f:htxey1 | carried | Declare a component (required and optional members, throws at declaration); cited again in Introduction and Declare the slots |
| f:0aatf6 | carried | Declare the slots (`title`, `body`, named regions); scoped in Component authoring grammar |
| f:zh8wdb | carried | Declare a component (`attributeSchema` from `defineFieldset`, `behavior`, `validateComponent`) |
| f:2dsv35 | carried | Write the build function (context members, no helper, `h()`); scoped in Before you begin |
| f:qvj951 | carried | Build the render function (`render` built with `createRenderer`, both callers); cited again in Introduction and Register the component |
| f:xothz1 | carried (scoped) | Set the renderer options (`remarkPlugins` and `rehypePlugins` positions); cited again in Add a remark plugin. The sanitize-floor and anchor-rel placement clauses are not used: the floor is security-model's, and `f:7fw82j` carries the anchor step |
| f:dwc2bu | carried (scoped) | Built-in render steps (build-time, class-only, unconditional, no client highlighter); cited again in Set the renderer options. The sanitize-floor placement clause is not used |
| f:bnqj5z | carried | Declare the slots (`itemLabel`, blank fallback) |
| f:c7ruij | carried | Shape the picker entry (the six members, `defaultIconByRole` and its throw); cited again in Register the component, Verify the render, and Diagnose a failed check |
| f:cefzv5 | carried | Declare the slots (the three kinds); Write the build function (the context members, the entrance ordinal) |
| f:cgwyp6 | carried | Register the component (`figure` and `include` throw, remove-or-rename message); cited again in Built-in render steps, Component authoring grammar, and Diagnose a failed check |
| f:co54dg | carried | Component authoring grammar (four-colon fence, nested slot containers, bullets, label dropped); cited again in Verify the render |
| f:dat0dd | carried | Add a remark plugin (the scaffold's `proseTypography` wiring and its effect); cited again in Introduction, Before you begin, and Verify the render |
| f:db26u3 | carried | Built-in render steps (mermaid passthrough) |
| f:dni13r | carried | Built-in render steps (the preloaded languages, plain fallback, never throws); cited again in Diagnose a failed check |
| f:dw4rbb | carried | Built-in render steps (the wrapper and its accessible name); cited again in Set the renderer options |
| f:e11npv | carried | Built-in render steps (placement classes, other classes ignored, figure without an image) |
| f:q07rd5 | carried (scoped) | Before you begin (the two adapter paths); cited again in Introduction. Its tutorial-hooks and `cairnManifest` clauses are not used |
| f:7fw82j | carried | Set the renderer options (`anchorRel`, default, `false`, its real position) |
| f:w7c3i6 | carried | Declare the slots (`required` in the form and validator, never in the render) |
| f:t4px7i | carried | Declare the slots (`itemFields` reads the first key only; the record `itemLabel` receives) |
| f:uqytbb | carried | Register the component (`defineRegistry`, one registry for pipeline and picker, the empty default); cited again in Introduction |
| f:21by9u | cut | What a site's own `build()` can bypass, and where the render-safety guarantees stop, is `docs/extend/security-model.md#limits-of-render-safety`'s, which states it ("A registered `build()` can bypass every render-safety protection"); out of scope here |
| f:qnf469 | carried (added, scoped) | Before you begin (`src/theme/markdown-components.ts`, nine declarations); cited again in Introduction, Declare a component, and Register the component. The rest of the `src/theme/` listing is not used |
| f:u4cfvv | carried (added, scoped) | Register the component (the scaffold passes the registry to `createRenderer` and sets `components: registry`); cited again in Before you begin and Build the render function (the media-resolver fallback). Not cited in Diagnose a failed check: the revision dropped the `rendering.components` cause there, since no fact supports it. The concepts, backend, and email clauses are not used |
| f:rrvh33 | carried (added, closing round) | Register the component (the picker reads only `CairnAdmin`'s `registry` prop; step 4 passes it, the scaffold's admin page already does); cited again in Diagnose a failed check (the first picker cause) |
The page-inputs claim inventory carried forty rows, disposed as it recorded them: the absent prior
page (no claims), `f:21by9u` (cut, above), `SlotDef.help` (cut, no engine surface reads it), and the
"filed" rows for `f:7fw82j`, `f:w7c3i6`, `f:t4px7i`, and `f:uqytbb` (with their option rows), each
carried in the section the table names. The inputs' working section names ("One render function",
"createRenderer", "RendererConfig", "Typed attributes", "Slots", "Slots and build context", "Build
context", "build", "Picker and configure step", "Authoring grammar", "How the preview runs render",
"remarkPlugins in practice") map onto this plan's headings as the table gives.

## Friction filed

The page-inputs step filed two entries on 2026-10-12 (`SlotDef.help` and `itemFields` not honored as
typed, and `anchorRel`'s "applied last" wording), and this plan does not refile them. This plan filed
five entries in `docs/internal/docs-friction-log.md` on 2026-10-12, none blocking the page:

1. Engine: the registry goes to two seams, `createRenderer`'s argument and `rendering.components`,
   that nothing ties together, and no fact states that the picker reads `rendering.components`.
   Until a fact states it, "Diagnose a failed check" holds back the picker-mismatch cause.
2. Engine: `insertTemplate` is read only for a component with no attributes and no slots, which
   neither its doc comment nor `f:c7ruij` states.
3. Engine: the scaffold's `alert` component reuses DaisyUI's `.alert` class names against the rule
   `f:34wt4f` gives.
4. Docs content: `docs/extend/debug-your-site.md` has no render or component row.
5. Docs content: `docs/extend/security-model.md`'s "Limits of render safety" says a `sanitizeSchema`
   callback can admit `<script>`, which the code prevents.

## Drafting constraints

- **Which site.** Every code block names its file in a first-line comment, and every adapter
  reference says which site it means: `src/lib/cairn.config.ts` for the tutorial's site,
  `src/theme/cairn.config.ts` for a scaffolded one (`f:q07rd5`). The step code is the tutorial
  site's; the scaffold's wiring appears as the worked example in "Add a remark plugin" and as the
  alternative in "Register the component" step 1.
- **The brief's `local` array** takes the names the page has the reader create: the `takeaways`
  component and its `Takeaways` label, the `tone` attribute and its `note` and `tip` options, the
  `points` slot, the `takeaways` and `takeaways-*` classes, the module `src/lib/markdown-components.ts`
  and its `components` export, the `registry` constant, and the `remarkSmartypants` import binding.
- **Generated output only.** Every HTML output block (the `takeaways` pair, the code, table, and
  figure pairs) comes from running the input through `createRenderer` in the worktree. Trim with an
  ellipsis comment, never retype.
- Never give a debounce figure for the preview; `f:my6ci3` states none.
- Never say the preview or the public page sanitizes differently, or describe what the sanitize floor
  or the sink guard strips; link `security-model` and `docs/reference/render.md#the-sanitize-floor`.
- Never say a `sanitizeSchema` callback can admit `<script>` (friction 5).
- Never quote `anchorRel`'s "applied last" doc comment; state the step's real position (`f:7fw82j`).
- Never say `RendererConfig` has a highlighting option, or that a site can turn highlighting off.
- Never describe `SlotDef.help`, and never say `itemFields` gives an item more than one field.
- Never say `required` stops a directive from rendering; only the insert form and its validator read
  it.
- Never say `insertTemplate` seeds the guided form (friction 2), and never state what happens to a
  registry left off `rendering.components` (friction 1), whether as a sentence or as a symptom paired
  with a cause in "Diagnose a failed check".
- Never offer the scaffold's `alert` component as an example of the DaisyUI class-name rule
  (friction 3).
- Never name the entrance ordinal's attribute; `f:cefzv5` names none.
- Hydration, styling, fragments, and the media resolver stay one linked clause each, never a step.
- `createRenderer`, `renderMarkdown`, `renderDocument`, `SiteRender`, `RendererConfig`, every option,
  `defineComponent`, `defineRegistry`, `defineFieldset`, `validateComponent`, `attributeSchema`,
  `behavior`, every `ComponentDef` and `SlotDef` member, every context member, every class, and every
  file in code spans; UI labels such as **Insert** in bold.
- Vendor specifics get a link, never a copy: hastscript's API, remark-smartypants's options, and
  DaisyUI's component list.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of one
  step is a single bulleted item. A reference names its target by heading, never by position.
