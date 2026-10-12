# Configure rendering

Every entry on a cairn site becomes HTML through one function that the site supplies: the adapter's
`rendering.render`. The edit page's live preview and every public page call that same
function, so the preview can't drift from the published page. The engine ships no public design:
its DaisyUI and Tailwind styling covers the admin alone, and the HTML an entry turns into is each
site's to decide. The site builds the function with `createRenderer`, whose pipeline renders plain
markdown, tables, `cairn:` links, and `media:` references with no component registered. The
preview calls the function in the editor's browser as the author types, and the public entry
route calls it from a SvelteKit server `load`, so the adapter module and everything its `render`
imports, components and plugins included, load in the admin's client bundle as well as on the
server. A custom public component is a container directive in the markdown that the site's
`build` function turns into markup, and one registry of them is read by both the render pipeline
and the editor's component picker.

Two sites start from different places. On the add-cairn tutorial's site, the adapter at
`src/lib/cairn.config.ts` renders over an empty registry, and its developer works through every
section. On a scaffolded site, the adapter at `src/theme/cairn.config.ts` already has the render
function, the smartypants plugin, and nine components declared in `markdown-components.ts` under
`src/theme/`. Its developer comes to add a component beside those nine,
change an option, or learn what a built-in step emits. By the end, the site has a render function
with its options set, a remark plugin, and a registered custom public component that the preview
and the published page render the same way.

Four narrower needs also bring a developer to this page. A block that has to differ on each use,
which a fragment's fixed text can't do, is a component whose attributes each use sets. An island
starts as a component declared with `hydrate`, and its `build` output stays on the page as the
static fallback. Renderer options, such as a wider sanitize allowlist or a different anchor `rel`,
are set in [Set the renderer options](#set-the-renderer-options). For a symptom such as a
directive printed as literal text or a code block with no token colors, see
[Diagnose a failed check](#diagnose-a-failed-check).

The page assumes you know TypeScript and the unified plugin model, in which a remark plugin works on
the markdown tree and a rehype plugin on the HTML tree. It also assumes you can build a hast
element with hastscript's `h()`. It assumes no cairn knowledge beyond the adapter file.

This page leaves the following topics to the pages that cover them:

- What the sanitize floor and the sink guard protect, and what turning the floor off costs, in
  [Render safety](security-model.md#render-safety).
- Hydrating a component in the browser, in [Add an island](add-an-island.md).
- Styling the rendered output, in
  [Style rendered markdown](theme-your-public-site.md#style-rendered-markdown).
- Fragments and `::include`, in [Reuse content across entries](reuse-content-across-entries.md).
- The media resolver and missing assets, in [Configure media](configure-media.md).

## Before you begin

Rendering is set in the adapter file of the site you are changing, and a component builds its markup
with `hastscript`. Before you start, make sure you have the following:

- The adapter file, `src/lib/cairn.config.ts` on the tutorial's site or `src/theme/cairn.config.ts`
  on a scaffolded site. The tutorial writes its adapter in
  [Write the site config and a minimal adapter](add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter).
- The [hastscript](https://github.com/syntax-tree/hastscript) package, which the following command
  installs:

  ```sh
  npm install hastscript
  ```

A scaffolded site already renders through one `createRenderer` call that carries the smartypants
plugin and a registry of the nine components in `markdown-components.ts`. On
that site, skip [Build the render function](#build-the-render-function) and
[Add a remark plugin](#add-a-remark-plugin), and add your component to that module's list.

## Build the render function

The adapter's `rendering.render` turns an entry's markdown into HTML, and the edit page's preview and
every public page call that same function. Its type is `SiteRender`, which takes one object
and resolves to an HTML string with no headings:

```ts
import type { FragmentResolve, LinkResolve, MediaResolve } from '@glw907/cairn-cms';

type SiteRender = (input: {
  body: string;
  concept?: string;
  frontmatter?: Record<string, unknown>;
  resolve?: LinkResolve;
  resolveMedia?: MediaResolve;
  resolveFragment?: FragmentResolve;
}) => Promise<string>;
```

To build the render function, follow these steps:

1. In the adapter file, call `createRenderer` once with the site's registry, and keep the
   `renderMarkdown` it returns. The tutorial's site already calls it over
   `defineRegistry({ components: [] })`, which [Register the component](#register-the-component)
   replaces.
2. In the adapter's `rendering` group, set `render` to pass `body` and the three resolvers to
   `renderMarkdown`.

   <!-- snippet-check-skip: elides the adapter's required content, backend, and email groups -->
   ```ts
   // src/lib/cairn.config.ts (excerpt)
   import { createRenderer, defineAdapter, defineRegistry } from '@glw907/cairn-cms';

   const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));

   export const cairn = defineAdapter({
     // content, backend, and email stay as the tutorial wrote them
     rendering: {
       render: ({ body, resolve, resolveMedia, resolveFragment }) =>
         renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
     },
   });
   ```

The preview and the public routes each pass their own resolvers, and `render` forwards every one it
receives. The [`SiteRender`](../reference/core.md#siterender) entry lists which
resolver each caller passes. The `resolveFragment` wiring belongs to
[Reuse content across entries](reuse-content-across-entries.md#forward-resolvefragment-from-your-render),
and the `resolveMedia` wiring to [Configure media](configure-media.md). On a scaffolded site,
`render` also falls back to the public media resolver when its caller passes none.

`renderMarkdown` fits `SiteRender` because it returns the HTML alone. A route that needs the
headings for a table of contents calls `renderDocument` instead. It returns the HTML plus the
headings in document order, each as `{ id, text, depth }`. The
[`createRenderer`](../reference/core.md#createrenderer) entry shows that return value with an
example.

The two callers run `render` at different moments. The edit page reruns it from an effect
debounced on the live body, and it discards a result when a newer render has started. The
public routes call the same `render` in the entry loader, at build when the route is prerendered and
per request otherwise.

With the render function in place, look at what the pipeline already does before you add to it.

## Built-in render steps

Before a site adds a component or a plugin, a renderer over an empty registry already highlights
code, wraps each table, and places figures.

The highlighter runs on every render and emits class-only output: `cairn-tok-*` classes on spans
inside a `pre.shiki` block, with no inline style. On a public page it runs where the route
renders, at build or per request, and the page ships no highlighter to the browser. The edit
page's preview runs `render` in the editor's browser, and the highlighter loads there. It
preloads `js`, `ts`, `jsx`, `tsx`, `svelte`, `html`, `css`, `json`, `bash`, `markdown`, `python`,
`yaml`, and `sql`, with their aliases. A fence in any other language, or with none, renders as
plain `pre.shiki` text with no token classes, and it never throws. A fenced `mermaid` block passes
through untouched and keeps `<code class="language-mermaid">` for a client-side diagram renderer.

The following fence is a TypeScript sample:

````md
```ts
const count = 1;
```
````

The highlighter renders it as the following HTML:

```html
<pre class="shiki cairn-roles" tabindex="0"><code><span class="line"><span class="cairn-tok-keyword">const</span><span> count </span><span class="cairn-tok-punct">=</span><span class="cairn-tok-number"> 1</span><span class="cairn-tok-punct">;</span></span>
<span class="line"></span></code></pre>
```

Each rendered table is wrapped in `div.table-scroll` with `role="region"`, `tabindex="0"`, and an
`aria-label` of `Table: ` plus the first header row's cell text, comma-joined. When there is
no header row, the label is `Table`. The table stays a real table inside the
wrapper. Setting `tableScroll` to `false` turns the wrap off, as
[Set the renderer options](#set-the-renderer-options) describes.

The following markdown is a two-column table:

```md
| Name | Role |
| --- | --- |
| Ada | Owner |
```

The pipeline renders it as the following HTML:

```html
<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Name, Role"><table><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody><tr><td>Ada</td><td>Owner</td></tr></tbody></table></div>
```

The engine's `:::figure` directive keeps a placement class only when its `class` is exactly
`center`, `wide`, or `full`, and it emits that class as `cairn-place-<role>`. It ignores any
other class without an error. A figure with no `media:` image still renders as a `<figure>`
around its other children.

The following directive is a `wide` figure with no image:

```md
:::figure{class="wide"}
A caption with no image.
:::
```

The pipeline renders it as the following HTML:

```html
<figure class="cairn-place-wide"><p>A caption with no image.</p></figure>
```

The engine writes these classes, and [Emitted classes](../reference/render.md#emitted-classes)
lists each one with who styles it.
[Style rendered markdown](theme-your-public-site.md#style-rendered-markdown) covers styling them in
the site's theme.

To turn off the table wrap or change the anchor `rel`, set the renderer options.

## Set the renderer options

`createRenderer` takes a `RendererConfig` as its second argument, and its options extend the sanitize
allowlist, set the table wrap and the anchor `rel`, and add a site's plugins.

- In the adapter file, pass the options object as the second argument of the one `createRenderer`
  call.

The following table lists each option, its default, and what it does:

| Option | Default | What it does |
| --- | --- | --- |
| `sanitizeSchema` | cairn's default schema | Receives the default schema and returns the schema to use, to admit benign HTML the content needs |
| `tableScroll` | On | Wraps each table in `div.table-scroll`, and `false` turns the wrap off |
| `anchorRel` | `'noopener noreferrer'` | Sets the `rel` forced on every `target="_blank"` anchor, and `false` leaves the step out |
| `remarkPlugins` | None | Runs after cairn's remark steps and before the remark-to-rehype conversion |
| `rehypePlugins` | None | Runs last of all, after the table-scroll wrap |

The remark steps a site's plugin follows are include resolution, the directive stamp, `cairn:` links,
figures, and `media:` resolution. The anchor step runs after highlighting and ahead of the
sink guard, the table-scroll wrap, and the site's `rehypePlugins`. It covers anchors that a
component builds, but not an anchor that a site's `rehypePlugins` add. No option turns highlighting
off or changes it.

[The sanitize floor](../reference/render.md#the-sanitize-floor) states what a `sanitizeSchema`
callback can't remove. [Render safety](security-model.md#render-safety) sets
out the pipeline's full stage order and what the sanitize floor protects.

Next, add a remark plugin.

## Add a remark plugin

A scaffolded site smartens quotes, dashes, and ellipses by passing `remark-smartypants` to its one
`createRenderer` call through `remarkPlugins`. Straight quotes, `--` and `---`, and `...` in
body prose come out smartened the same way in the public render and the preview. Inline code,
code blocks, and link URLs stay untouched. As a remark plugin, it runs over the markdown tree
before the conversion to HTML.

The scaffold exports the plugin list from one module and passes it to `createRenderer` in the
adapter:

```ts
// src/chassis/render.ts (excerpt)
import remarkSmartypants from 'remark-smartypants';
import type { PluggableList } from 'unified';

export const proseTypography: PluggableList = [[remarkSmartypants, { dashes: 'oldschool' }]];
```

```ts
// src/theme/cairn.config.ts (excerpt)
import { createRenderer, defineRegistry } from '@glw907/cairn-cms';
import { proseTypography } from '#chassis/render.js';
import { components } from './markdown-components.js';

const registry = defineRegistry({ components });
const { renderMarkdown } = createRenderer(registry, { remarkPlugins: proseTypography });
```

On a scaffolded site, another remark plugin goes in the same `proseTypography` list.

To add the plugin to the tutorial's site, follow these steps:

1. In a terminal at the project root, install the plugin:

   ```sh
   npm install remark-smartypants
   ```

2. In `src/lib/cairn.config.ts`, pass the plugin to `createRenderer` through
   `remarkPlugins`:

   ```ts
   // src/lib/cairn.config.ts (excerpt)
   import { createRenderer, defineRegistry } from '@glw907/cairn-cms';
   import remarkSmartypants from 'remark-smartypants';

   const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
     remarkPlugins: [[remarkSmartypants, { dashes: 'oldschool' }]],
   });
   ```

The [remark-smartypants README](https://github.com/silvenon/remark-smartypants) lists the plugin's
other options.

With the pipeline set, declare a custom public component.

## Declare a component

`defineComponent` declares one container directive from a required `name`, `label`, `description`,
and `build`, with `attributes`, `slots`, and `hydrate` optional. The running example
declares a `takeaways` component in `src/lib/markdown-components.ts`, a new module laid out like the
scaffold's `markdown-components.ts`. On a scaffolded site, declare it in the
scaffold's `markdown-components.ts` beside the nine components already there.

To declare the component, follow these steps:

1. In the module, declare `takeaways` with its label, its description, and one attribute.
2. In the same module, export the component list:

   ```ts
   // src/lib/markdown-components.ts
   import { defineComponent, fields } from '@glw907/cairn-cms';
   import { h } from 'hastscript';

   export const takeaways = defineComponent({
     name: 'takeaways',
     label: 'Takeaways',
     description: 'A titled summary that closes with a list of key points.',
     attributes: {
       tone: fields.select({ label: 'Tone', options: ['note', 'tip'] }),
     },
     // A stub until "Write the build function" replaces it.
     build: () => h('aside'),
   });

   export const components = [takeaways];
   ```

The directive vocabulary is container-only. An author opens a component with
`:::name[Title]{attrs}` and closes it with `:::`. A component with named slots takes a four-colon
outer fence around its nested `:::slotName` containers. A leaf `::name{attrs}` or text
`:name{attrs}` form is restored to its literal source text. The pipeline reads either form as
a stray colon in prose, such as a time or a ratio. `::include` is the one leaf form the
pipeline reads, and [Reuse content across entries](reuse-content-across-entries.md) covers
it.

The `attributes` member accepts exactly ten `fields.*` types, because each serializes to a single
directive-attribute string. The ten are `text`, `textarea`, `number`, `select`, `url`,
`email`, `date`, `datetime`, `boolean`, and `icon`. A `multiselect`, `object`, `array`,
`reference`, or `image` attribute throws at declaration, and the message includes
`a directive attribute must be a single-value scalar`.

The attributes are checked by the same fieldset machinery a concept's fields use.
`defineComponent` builds an `attributeSchema` with `defineFieldset(attributes, { behavior })`, and
`validateComponent` runs it. A cross-field rule therefore goes in the component's `behavior`
table, keyed by attribute name. The constructor sets `attributeSchema`, and a site never sets
it. The [`defineComponent`](../reference/core.md#definecomponent) entry lists the ten types
and the `behavior` table. The [Fields](../reference/core.md#fields) table states what
each type renders and validates, including what an `icon` attribute needs from the adapter.
For `hydrate`, which opts the directive into a client island, see
[Add an island](add-an-island.md).

Next, declare the regions an author fills.

## Declare the slots

A slot named `title` is the directive's bracketed label, a slot named `body` is its default content,
and any other name is a named region. The editor's insert dialog writes and reads `title` and
`body` specially, as [Component authoring grammar](#component-authoring-grammar) shows.

The following table lists the members of a slot:

| Member | What it does |
| --- | --- |
| `name` and `label` | Name the slot in the directive and label it in the insert form |
| `kind` | Takes `'inline'`, `'markdown'`, or `'repeatable'` |
| `required` | Marks the slot with an asterisk in the insert form and keeps **Insert** unavailable until it is filled, with one non-empty item for a repeatable slot. Once the slot is touched, the form shows `<label> is required.`, and the insert validator repeats the check. |
| `itemFields` | For a repeatable slot, names each item's fields, but the insert form reads only the first declared field's key. Each item is one string under that key, or under `text` when `itemFields` is absent. |
| `itemLabel` | For a repeatable slot, names each row in the insert form from that one-key record and the zero-based index. When it returns nothing or blank text, the row reads as the slot label plus the row number. |

The render pipeline never reads `required`, so a hand-typed directive without the slot still
renders.

- In the component's declaration, add a `slots` array with a required title, a markdown body, and a
  repeatable list of points:

  ```ts
  // src/lib/markdown-components.ts
  import { defineComponent, fields } from '@glw907/cairn-cms';
  import { h } from 'hastscript';

  export const takeaways = defineComponent({
    name: 'takeaways',
    label: 'Takeaways',
    description: 'A titled summary that closes with a list of key points.',
    attributes: {
      tone: fields.select({ label: 'Tone', options: ['note', 'tip'] }),
    },
    slots: [
      { name: 'title', label: 'Title', kind: 'inline', required: true },
      { name: 'body', label: 'Body', kind: 'markdown' },
      {
        name: 'points',
        label: 'Points',
        kind: 'repeatable',
        itemLabel: (item) => String(item.text ?? ''),
      },
    ],
    // A stub until "Write the build function" replaces it.
    build: () => h('aside'),
  });

  export const components = [takeaways];
  ```

The `points` slot declares no `itemFields`, so each item is one string under `text`, and its
`itemLabel` names each row by that text.

Next, write the function that builds the component's markup.

## Write the build function

`build` receives the directive's attributes and rendered slots and returns one hast `Element`,
synchronously, once for each occurrence in the markdown.

The following table lists what the context passed to `build` carries:

| Member | What it holds |
| --- | --- |
| `attributes` | The declared attribute values, keyed by attribute |
| `slot(name)` | A slot's rendered children, or an empty array when the slot is absent |
| `items(name)` | One list of children for each item of a repeatable slot |
| `attr(key)` | A declared attribute's string value, or `undefined` for a boolean or absent attribute |
| `node` | The stamped component element |

The engine ships no hast-building helper beyond the context, so a site builds its markup with
hastscript's `h()`. The [Types](../reference/render.md#types) section documents
`ComponentContext`.

- In the component's declaration, replace the stub with a `build` that arranges the three slots
  inside an aside element:

  ```ts
  // src/lib/markdown-components.ts
  import { defineComponent, fields } from '@glw907/cairn-cms';
  import { h } from 'hastscript';

  export const takeaways = defineComponent({
    name: 'takeaways',
    label: 'Takeaways',
    description: 'A titled summary that closes with a list of key points.',
    attributes: {
      tone: fields.select({ label: 'Tone', options: ['note', 'tip'] }),
    },
    slots: [
      { name: 'title', label: 'Title', kind: 'inline', required: true },
      { name: 'body', label: 'Body', kind: 'markdown' },
      {
        name: 'points',
        label: 'Points',
        kind: 'repeatable',
        itemLabel: (item) => String(item.text ?? ''),
      },
    ],
    build: (ctx) =>
      h('aside', { className: ['takeaways', `takeaways-${ctx.attr('tone') ?? 'note'}`] }, [
        h('p', { className: ['takeaways-title'] }, ctx.slot('title')),
        h('div', { className: ['takeaways-body'] }, ctx.slot('body')),
        h('ul', { className: ['takeaways-points'] }, ctx.items('points').map((item) => h('li', item))),
      ]),
  });

  export const components = [takeaways];
  ```

`build` runs inline in the pipeline's tree transform and can't `await`. Data a component
needs is fetched outside the render pipeline and reaches `build` through the directive's
attributes. The engine stamps an entrance ordinal on the element `build` returns, and `build`
adds no motion markup.

A component's inner classes need names apart from any DaisyUI component class, such as `card-body`
or `card-title`. DaisyUI's plugin generates CSS for a matching class name anywhere in scanned
source. A reused name is restyled when the site turns that DaisyUI component on
elsewhere. The example's `takeaways-*` classes follow the rule.

Next, shape how the component appears in the editor's picker.

## Shape the picker entry

The optional `icon`, `group`, `hidden`, `insertTemplate`, `use`, and `preview` members shape the
component's row in the editor's picker.

The following table lists what each member does:

| Member | What it does |
| --- | --- |
| `icon` | Names a glyph key from the site's icon set |
| `group` | Sets the heading the row sits under |
| `hidden` | Leaves the component out of the top-level picker |
| `insertTemplate` | Sets the markdown scaffold inserted at the cursor |
| `use` | Gives one line of guidance |
| `preview` | Supplies a sample, with optional `attributes` and `slots`, whose presence opts the configure step into the two-pane live preview |

A non-empty `defaultIconByRole` map overrides the engine's role-to-glyph defaults.

- In the component's declaration, add a `group`, a `use` line, and a `preview` sample:

  ```ts
  // src/lib/markdown-components.ts
  import { defineComponent, fields } from '@glw907/cairn-cms';
  import { h } from 'hastscript';

  export const takeaways = defineComponent({
    name: 'takeaways',
    label: 'Takeaways',
    description: 'A titled summary that closes with a list of key points.',
    group: 'Summaries',
    use: 'Close a long post with its key points.',
    preview: {
      attributes: { tone: 'tip' },
      slots: {
        title: 'Before you deploy',
        body: 'Check these three things first.',
        points: ['Run the tests.', 'Read the changelog.', 'Tag the release.'],
      },
    },
    attributes: {
      tone: fields.select({ label: 'Tone', options: ['note', 'tip'] }),
    },
    slots: [
      { name: 'title', label: 'Title', kind: 'inline', required: true },
      { name: 'body', label: 'Body', kind: 'markdown' },
      {
        name: 'points',
        label: 'Points',
        kind: 'repeatable',
        itemLabel: (item) => String(item.text ?? ''),
      },
    ],
    build: (ctx) =>
      h('aside', { className: ['takeaways', `takeaways-${ctx.attr('tone') ?? 'note'}`] }, [
        h('p', { className: ['takeaways-title'] }, ctx.slot('title')),
        h('div', { className: ['takeaways-body'] }, ctx.slot('body')),
        h('ul', { className: ['takeaways-points'] }, ctx.items('points').map((item) => h('li', item))),
      ]),
  });

  export const components = [takeaways];
  ```

With the component declared, register it.

## Register the component

`defineRegistry({ components })` builds the one registry that the render pipeline and the editor's
component picker both read.

To register the component with the render pipeline, follow these steps:

1. In the adapter file, build the registry from the module's component list with
   `defineRegistry`. On a scaffolded site, add `takeaways` to the `components` list in
   `markdown-components.ts` instead. The scaffold's adapter already builds its
   registry from that list.
2. In the same file, pass `registry` as the first argument of `createRenderer`, in place of the
   empty registry.
3. In the adapter's `rendering` group, set `components: registry`, as the scaffold does.

<!-- snippet-check-skip: elides the adapter's required content, backend, and email groups -->
```ts
// src/lib/cairn.config.ts (excerpt)
import { createRenderer, defineAdapter, defineRegistry } from '@glw907/cairn-cms';
import remarkSmartypants from 'remark-smartypants';
import { components } from './markdown-components.js';

const registry = defineRegistry({ components });
const { renderMarkdown } = createRenderer(registry, {
  remarkPlugins: [[remarkSmartypants, { dashes: 'oldschool' }]],
});

export const cairn = defineAdapter({
  // content, backend, and email stay as the tutorial wrote them
  rendering: {
    render: ({ body, resolve, resolveMedia, resolveFragment }) =>
      renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
    components: registry,
  },
});
```

`defineRegistry` throws for a component named `figure` or `include`, because the engine's render
steps handle those directive names. Its message says to remove the component if the built-in
covers your use, or to rename it. It also throws when a component sets a non-empty
`defaultIconByRole` but declares no `type: 'icon'` attribute. The
[`defineRegistry`](../reference/core.md#defineregistry) entry documents the registry and its
readers.

Before you verify, read the markdown an author writes for the component.

## Component authoring grammar

Checking the component in the editor means reading the markdown the insert dialog writes: a
four-colon outer fence holding one nested `:::slotName` container for each named slot.

An author writes the `takeaways` directive like this:

```md
::::takeaways[Before you deploy]{tone="tip"}
Check these three things first.

:::points
- Run the tests.
- Read the changelog.
- Tag the release.
:::
::::
```

The registered `build` turns it into this HTML:

```html
<aside class="takeaways takeaways-tip" data-rise="0"><p class="takeaways-title">Before you deploy</p><div class="takeaways-body"><p>Check these three things first.</p></div><ul class="takeaways-points"><li>Run the tests.</li><li>Read the changelog.</li><li>Tag the release.</li></ul></aside>
```

A repeatable slot's items are bullet lines inside its container. The `title` slot is the
bracketed label, and the `body` slot is the default content. A directive's bracketed label
is dropped when the component declares no `title` slot.

With the grammar in hand, check the component end to end.

## Verify the render

The component renders the same markup in the edit page's preview and on the published
page.

To verify the render, follow these steps:

1. In a terminal, start the site's dev server.
2. In the admin, open an entry.
3. In the editor, insert the component from the picker, under its `group`.
4. In the editor, check that the inserted markdown has the four-colon fence and the nested slot
   container.
5. In the editor's preview, check that the component's markup appears after a short pause and
   updates as you type. With the plugin from [Add a remark plugin](#add-a-remark-plugin) in
   place, a straight quote typed in body prose shows curly.
6. In the admin, publish the entry.
7. On the entry's public page, after the deploy, check that the component element's classes match
   the preview's.

When a check fails, [Diagnose a failed check](#diagnose-a-failed-check) lists the causes in the
order of these steps.

## Diagnose a failed check

Each failed check traces to a declaration or to the markdown an author wrote, and the causes
follow the order of the verification steps:

1. The dev server stops at startup with an error that names the component. An attribute of a
   type outside the ten throws `a directive attribute must be a single-value scalar ...`. A
   component named `figure` or `include` throws with the remove-or-rename message. A
   `defaultIconByRole` with no `type: 'icon'` attribute throws as well. Correct the
   declaration as [Declare a component](#declare-a-component) and
   [Register the component](#register-the-component) describe.
2. The component is missing from the picker. A component whose declaration sets `hidden` is
   left out of the top-level picker, as [Shape the picker entry](#shape-the-picker-entry) states.
3. The directive shows as literal text in the preview. It was written in the leaf `::name` or
   text `:name` form, which always restores to its source text.
   Rewrite it as a container directive.
4. A code block shows no token colors in the preview or on the page. Its fence names a language
   outside the preloaded set, and such a fence renders as plain `pre.shiki` text. The
   preloaded languages are listed in [Built-in render steps](#built-in-render-steps).

For any other failure, read the running site's output in
[Read the structured logs](debug-your-site.md#read-the-structured-logs).

## See also

The following pages document the renderer's API and the tasks that sit beside this one:

- [`createRenderer`](../reference/core.md#createrenderer): the renderer and its options.
- [`defineComponent`](../reference/core.md#definecomponent) and
  [`defineRegistry`](../reference/core.md#defineregistry): the component and registry
  entries.
- [Render authoring](../reference/render.md): `ComponentContext` and the emitted classes.
- [Render safety](security-model.md#render-safety): what the sanitize floor and the sink guard
  protect.
- [Add an island](add-an-island.md): hydrating a component in the browser.
- [Style rendered markdown](theme-your-public-site.md#style-rendered-markdown): styling the rendered
  output.
- [Reuse content across entries](reuse-content-across-entries.md): fragments and `::include`.
- [Configure media](configure-media.md): the media resolver that `render` forwards, and what a missing
  asset renders.
