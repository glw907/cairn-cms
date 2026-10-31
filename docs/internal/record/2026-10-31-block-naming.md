# Naming research: the `:::` content unit

**Pick: "block", one word for editors, docs, and code. `defineComponent` becomes `defineBlock`.** Code audited at `main` eab9c9ffd; editor page at docs-final-3 1b4a1ee35. Sources fetched 2026-10-31.

## Part 1: survey

| System | Authors see | Developers see | Differ? | Evidence |
| --- | --- | --- | --- | --- |
| WordPress | block | block (`registerBlockType`) | No | ["Blocks are the content elements that you add"](https://wordpress.org/documentation/article/wordpress-block-editor/); ["Blocks are an abstract unit"](https://developer.wordpress.org/block-editor/explanations/architecture/key-concepts/); [registration](https://developer.wordpress.org/block-editor/getting-started/fundamentals/registration-of-a-block/) |
| Notion | block | block | No | ["a single building block"](https://www.notion.com/help/what-is-a-block); ["a list of block objects"](https://developers.notion.com/docs/working-with-page-content) |
| Ghost | card | not verified (theme docs fetch failed) | Unknown | ["rich media objects called Cards"](https://ghost.org/help/cards/). Separate [snippets](https://ghost.org/help/snippets/) reuse saved content |
| Sanity | custom block | block type; custom block | No | ["custom content blocks"](https://www.sanity.io/docs/studio/block-content) |
| Storyblok | block | block, but API key and CLI keep `component` | Yes | ["a block is a piece of content"; "the `component` (block) key"](https://www.storyblok.com/docs/concepts/blocks) |
| Contentful | entry (rich text); component (Studio) | embedded entry; custom component | Slight | ["Embed Entry"](https://contentful.com/developers/docs/concepts/rich-text.md); [Experiences](https://www.contentful.com/developers/docs/experiences/) |
| Payload | block | block | No | ["each object is a 'block' with its own schema"](https://payloadcms.com/docs/fields/blocks) |
| Decap | "Add Component" button, then site label | editor component | No | [`registerEditorComponent`](https://decapcms.org/docs/custom-widgets/); [locale source](https://github.com/decaporg/decap-cms/blob/main/packages/decap-cms-locales/src/en/index.js) |
| Keystatic | site label | content component | Partly | ["5 types of content components"](https://keystatic.com/docs/content-components) |
| TinaCMS | "embed" | template; component | Yes | ["The 'embed' option in the editor"](https://tina.io/docs/reference/types/rich-text) |
| MDX | component (authors know JS) | component | No | ["reusable things"](https://mdxjs.com/docs/what-is-mdx/) |
| Markdoc | tag | tag; component | Partly | [tags](https://markdoc.dev/docs/tags) |
| Hugo | shortcode | shortcode | No | ["a template invoked within markup"](https://gohugo.io/content-management/shortcodes/) |
| Docusaurus | admonition | `Admonition` component | Partly | [admonitions](https://docusaurus.io/docs/markdown-features/admonitions) |
| Starlight | aside | aside | No | ["also known as 'admonitions' or 'callouts'"](https://starlight.astro.build/guides/authoring-content/) |
| MyST, Sphinx | directive | directive | No | ["multi-line containers"](https://mystmd.org/guide/syntax-overview); ["a generic block of explicit markup"](https://www.sphinx-doc.org/en/master/usage/restructuredtext/directives.html) |
| Squarespace (added) | block | not checked | n/a | ["Blocks are drag-and-drop features"](https://support.squarespace.com/hc/en-us/articles/206543757) |
| Google Docs (added) | building block | not checked | n/a | [help page](https://support.google.com/docs/answer/10710316) |
| Google style | No block, component, directive, or snippet entry | same | n/a | [Word list](https://developers.google.com/style/word-list); ["avoid or replace jargon with plain language"](https://developers.google.com/style/jargon) |
| Microsoft style | Word entries not reached | same | n/a | ["Use one term consistently to represent one concept"](https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences) |

**Documented problems.** WordPress ["renamed Reusable Blocks to Patterns"](https://wordpress.org/documentation/article/reusable-blocks/) in 6.3. Storyblok's docs must gloss one thing with two words.

**Not verified.** Why or when Storyblok moved to "block" (older pages say component; no announcement found). Keystatic's insert control. Ghost's developer term. Microsoft's entries (guessed URLs returned 404). Wix, Mailchimp, and Confluence searches returned nothing usable. I found no user research on "component" itself: the off-putting claim rests on Geoff's judgment plus precedent. Most quotes passed through a fetch summarizer; raw HTML confirmed Google's jargon, Storyblok's block, Ghost, and Squarespace quotes.

## Part 2: cairn audit

Raw counts, excluding tests. Senses are mixed: most "block" and "section" hits are unrelated, and `tool/` and `packages/` have no concept hits.

| Term | `src/lib` code and strings | `src/lib` comments | Public docs | Shipped guidance |
| --- | --- | --- | --- | --- |
| component | 325 | 430 | 1,662 | 158 |
| block | 232 | 401 | 829 | 163 |
| layout block | 2 | 2 | 0 (6 lines on docs-final-3) | 0 |
| Layout marker | 1 | 0 | 0 | 0 |

A line heuristic over public docs and skills splits "component" into 193 concept, 133 Svelte, 374 unclear. `add-an-island.md` and `core.md:370` use both senses within a sentence or two, and the register's "custom public component" spans both.

**Public breaks:** `defineComponent`; `defineRegistry({ components })`; types `ComponentDef`, `ComponentRegistry`, `ComponentContext` (on `.`, `/sveltekit`; the last on `/render`); `rendering.components`; `onComponentAtCaret` (no stability promise). Five sites hold 61 `defineComponent` calls; Waymark and the showcase hold nine each. **Safe:** directive grammar and stored entries, log events (none named), `SlotDef`, `previewMarkdown`, internal `data-primitive`. Timing favors now: no site migrates before the one release.

**UI strings:** about 15 sites in `ComponentInsertDialog`, `EditPage`, `editor-highlight.ts`, `editor-folding.ts`, `MarkdownHelpDialog`; 40 test assertions.

**Not every `:::` is developer-declared.** Every paired container folds to a pill:
- Registered units, including `hidden`.
- `:::figure`: engine-reserved, written by the Figure control, absent from the registry and picker.
- Slot fences such as `:::agenda` inside `::::event`: parts, not units.
- Unregistered `:::x`: unstamped; the pill shows the raw name.
- Bare openers: the fold control says "section".
- `::include` is a two-colon leaf shown as a chip. It keeps "fragment".

"Component" is false for figure and unregistered containers. "Block" fits all of them.

## Part 3: recommendation

| | block (pick) | card | component (baseline) |
| --- | --- | --- | --- |
| Editor plainness | Strong: everyday word, Squarespace and Notion teach it | Strong | Weak: Geoff's objection, jargon |
| Precedent | Broadest, both audiences | Ghost only | Developer-first tools |
| Svelte collision | Low: only `<style>` and logic blocks (memory, not fetched) | None | Severe |
| Other collisions | Markdown "Code block"; `markdown-reference` group `'blocks'` | 175 daisyUI `card` lines; implies a shape that `banner` and `video` lack | Register names |
| Covers figure | Yes | Poorly | No |
| `defineComponent` becomes | `defineBlock` | `defineCard` | unchanged |

**One word.** Evidence favors it. Editor-first systems that use "block" keep it in their APIs; Storyblok's split is the gloss to avoid, and Microsoft asks for one term. So `defineBlock`, not an editor word beside `defineComponent`. "Directive" stays only for the grammar. "Code block" stays, since it is standard markdown.

**Rejected:** element (`build` returns hast `Element`), section (`createSectionAction`, heading sections), snippet (Svelte `{#snippet}`, Ghost's different meaning), widget (no strong current precedent), directive (syntax, not plain).

**Rename list** (`card` substitutes the same way; baseline changes only the strings marked *).

Public breaks:
- `defineComponent` → `defineBlock`
- `ComponentDef`, `ComponentRegistry`, `ComponentContext` → `BlockDef`, `BlockRegistry`, `BlockContext`
- `defineRegistry({ components })` → `({ blocks })`; name kept
- `rendering.components` → `rendering.blocks`
- `onComponentAtCaret` → `onBlockAtCaret`
- `src/theme/markdown-components.ts` → `markdown-blocks.ts`

UI strings:
- "Insert a component" → "Insert a block"*; "Search components", "Back to components", match counts likewise*
- "Edit the component at the cursor" → "Edit the block at the cursor"*; "Layout marker." → "Block marker."*
- "layout blocks" → "blocks"*; "Fold this section" → "Fold this block"*
- "Place the cursor in a component to edit it" needs rewording: it would misdescribe a caret already inside a figure or unregistered block.

Internal: `component-*.ts` files, `Component*` Svelte files, `ComponentValues`, `not-a-component`, `markdown-reference` group, registry error text.

Docs: `write-a-markdown-component.md` → `write-a-markdown-block.md` (22 links); `core.md`, `add-an-island.md`, register Names (retire "markdown component"; "custom public component" keeps the Svelte sense), Vale rules, skills, `migration-notes.md`, `upgrade-cairn.md`, CHANGELOG `Consumers must:`; story `editor/collapsed-layout-block` → `editor/collapsed-block`.
