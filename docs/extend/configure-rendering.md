# Configure rendering

**Contract:** build the one render function the admin's live preview and every public page both
call, and register your first custom markdown component on it.

**Precondition:** an adapter with at least one concept declared, from [Define an adapter and
schema](./define-an-adapter-and-schema.md).

Every adapter declares exactly one `rendering.render` function: [`SiteRender`](../reference/core.md#siterender),
a single seam that turns an entry's markdown body into HTML. The edit page's preview calls it on
every keystroke's debounced update, and the public delivery routes call it at build (or at
request time, for a draft preview). There's no second render path to keep in sync, because there
is no second render path.

## The plain case

`createRenderer` builds the whole pipeline, remark and rehype plugins composed for you, from a
component registry:

```ts
import { createRenderer, defineRegistry } from '@glw907/cairn-cms';

const registry = defineRegistry({ components: [] });
const { renderMarkdown } = createRenderer(registry);
```

Wire its result as the adapter's render function:

<!-- snippet-check-skip: illustrates the rendering member's render and components keys inside the adapter's rendering object; the full object is shown in core.md's worked example -->
```ts
rendering: {
  render: ({ body, resolve, resolveMedia, resolveFragment }) =>
    renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
  components: registry,
},
```

An empty registry still renders plain markdown, GFM tables, `cairn:` links, and `media:`
references correctly; it's the starting point before you register any custom component. If your
site never needs a directive beyond that, this is the whole job.

## Register a component

A component is one directive your markdown vocabulary gains, declared with `defineComponent` and
built from hast:

```ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { cardShell, headRow } from '@glw907/cairn-cms/render';
import { h } from 'hastscript';

const callout = defineComponent({
  name: 'callout',
  label: 'Callout',
  description: 'A highlighted note with an optional tone.',
  build: (ctx) =>
    cardShell(['callout'], [
      headRow(ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
    ]),
  attributes: {
    tone: fields.select({ label: 'Tone', required: true, options: ['note', 'tip', 'warning'] }),
  },
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
});
```

`build` returns a hast `Element` synchronously; it runs inline inside the pipeline's tree
transform, once per occurrence, so it can't `await` anything. If a component needs data it
doesn't already have, fetch it outside the render pipeline (at content build time, or in the
adapter's own resolver) and pass the result through `attributes`.

`attributes` accepts exactly ten `fields.*` descriptors, the ones that serialize to a single
directive-attribute string: `text`, `textarea`, `number`, `select`, `url`, `email`, `date`,
`datetime`, `boolean`, and `icon`. Everything else, including `multiselect`, `object`, `array`,
`reference`, and `image`, throws at declaration; the same fieldset machinery a concept's own
fields use validates attributes too. `slots` name the content regions the
component's directive can carry: `title` and `body` are conventional names the editor's
component-insert dialog treats specially, but any name works.

`cardShell` and `headRow`, imported from [`/render`](../reference/render.md), are hast-building
helpers for the common "bordered box with a heading" shape; `iconSpan`, `strAttr`, and `isElement`
round out the toolkit for a component that reads an icon attribute or needs to inspect the tree
it's building. Reach for them instead of hand-walking hast yourself.

Register it on the same registry your renderer builds from:

<!-- snippet-check-skip: continues the defineComponent import and callout definition from the block above -->
```ts
const registry = defineRegistry({ components: [callout] });
const { renderMarkdown } = createRenderer(registry);
```

Once registered, an author writes `::callout{tone="tip"}` in the markdown editor (or inserts it
through the component picker), and both the preview and the public page render it identically,
since both call the same `renderMarkdown`.

## Hydrate a component on the client

<!-- snippet-check-skip: continues the defineComponent import from above; build and attributes are elided placeholders, shown in full at Add an island -->
```ts
const converter = defineComponent({
  name: 'converter',
  hydrate: true,
  build: (ctx) => /* the no-JS fallback */,
  attributes: { /* ... */ },
});
```

<!-- snippet-check-skip: illustrates the rendering member's islands key inside the adapter's rendering object opened above -->
```ts
rendering: {
  render: /* ... */,
  components: registry,
  islands: { converter: Converter }, // the live Svelte component
},
```

[Add an island](./add-an-island.md) covers this end to end: the client runtime, the boundary
contract, and the hard rule that every prop crossing from server-rendered markup to a live
component is untrusted.

## Headings and a table of contents

`renderDocument`, `createRenderer`'s other return, additionally collects every heading in
document order:

<!-- snippet-check-skip: continues the registry and createRenderer from the "Register a component" section above; body is the entry's markdown string -->
```ts
const { renderDocument } = createRenderer(registry);
const { html, headings } = await renderDocument(body);
// headings: [{ id: 'title', text: 'Title', depth: 1 }, ...]
```

Call it instead of `renderMarkdown` on any route that needs a table of contents or an anchor
list; the adapter's own `rendering.render` can stay on `renderMarkdown` regardless, since a page
that wants headings calls `renderDocument` directly rather than through the adapter seam.

## Extend the pipeline itself

`RendererOptions` (`createRenderer`'s second argument) opens a few seams beyond components:
`sanitizeSchema` extends the sanitize allowlist, `tableScroll` controls the default scrollable
table wrapper, and `remarkPlugins`/`rehypePlugins` add your own [unified](https://unifiedjs.com)
plugins, composed after cairn's own pipeline steps and before stringification. [Render
safety](./render-safety.md#the-pipeline-order) diagrams exactly where cairn's own stages sit,
including the two the `unsafeDisableSanitize` switch turns off together. [Core's
`createRenderer` reference](../reference/core.md#createrenderer) documents each option with a
worked example, including a rehype plugin that lazy-loads every image.

**You know it worked when:** a directive using your component's name renders in both the edit
page's preview and the built public page, with identical output.
