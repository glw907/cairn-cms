# Configure rendering

Your adapter's `rendering` group carries one member the rest of the engine builds on: `render`,
the function that turns an entry's markdown into HTML. Every public page calls it to build its
body, and the admin's live preview calls the same function on a debounce as you type, so a site
has exactly one place where its markdown becomes HTML.

## Build a renderer from your components

`createRenderer` composes the pipeline: it takes your directive component registry and returns
`renderMarkdown`, an `async (content, opts) => string` function that runs markdown through remark
and rehype, dispatching each registered directive to its `build`.

```ts
import { createRenderer, defineRegistry } from '@glw907/cairn-cms';

const registry = defineRegistry({ components: [] });
const { renderMarkdown } = createRenderer(registry);
```

An empty registry is a valid starting point. GitHub Flavored Markdown, `cairn:` link resolution,
figures, and the sanitize floor all run regardless of whether you've declared any directives yet.
Add your own with `defineComponent`, covered in the [core reference](../reference/core.md#definecomponent)
and the [components reference](../reference/components.md).

## Wire it into the adapter

`rendering.render` is the seam. Its signature is `SiteRender`: an object argument carrying `body`
plus four optional members, returning `Promise<string>`. A renderer that just delegates to
`renderMarkdown` needs only three of them:

```ts
import { createRenderer, defineRegistry, defineAdapter, defineConcept, fields, fieldset, githubApp } from '@glw907/cairn-cms';

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));

export const cairn = defineAdapter({
  content: {
    pages: defineConcept({
      dir: 'src/content/pages',
      label: 'Pages',
      routing: 'page',
      fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
    }),
  },
  backend: githubApp({ owner: 'acme', repo: 'site', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@example.com' },
  rendering: {
    render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
  },
});
```

`resolve` rewrites `cairn:` reference links to live permalinks, and `resolveMedia` resolves
`media:` tokens to delivery paths. Both arrive from the caller already built. The public route
passes a site-resolver-backed pair; the admin preview passes a manifest-backed pair. Your render
function only has to forward them.

## Vary output by concept or frontmatter

`render` also receives `concept` (the entry's concept id) and `frontmatter` (its parsed frontmatter),
so a render function can change its output per concept or per field without a second renderer:

```ts
import { createRenderer, defineRegistry, type SiteRender } from '@glw907/cairn-cms';

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));

const render: SiteRender = async ({ body, concept, frontmatter, resolve, resolveMedia }) => {
  const html = await renderMarkdown(body, { resolve, resolveMedia });
  if (concept === 'posts' && frontmatter?.featured) {
    return `<div class="featured">${html}</div>`;
  }
  return html;
};
```

Both arguments can be absent. The admin's standalone component-insert preview, proving a single
directive before you commit to it in a document, calls the same renderer with neither set, so a
render function that reads `concept` or `frontmatter` should treat both as possibly absent.

## Share render with the editor preview and public pages

You write one `render` function, and you never call it directly from your own routes. Two callers
already do:

- The public route resolver ([`createPublicRoutes`](../reference/delivery.md)) calls
  `render({ body: entry.body, concept: entry.concept, frontmatter: entry.frontmatter, resolve })`
  for every entry it serves.
- The admin's edit page calls the identical function on a debounce as you type, with the same
  `concept` and `frontmatter` the public route uses for that entry, so a renderer that varies by
  concept previews exactly what publishing produces.

Both callers get `render` from the same place, your adapter's `rendering.render`. The admin route
threads it straight through (`render={cairn.rendering.render}` in your catch-all `/admin` page),
and the delivery factory takes it as a constructor argument. Nothing in your own code decides which
caller is asking.

## Extend the sanitize allowlist

`createRenderer`'s second argument, `RendererOptions`, controls the sanitize floor that runs over
every rendered document. `sanitizeSchema` receives cairn's default allowlist and returns the schema
to use, so you extend rather than replace it:

```ts
import { createRenderer, defineRegistry } from '@glw907/cairn-cms';
import type { Schema } from 'hast-util-sanitize';

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
  sanitizeSchema: (defaults: Schema): Schema => ({
    ...defaults,
    tagNames: [...(defaults.tagNames ?? []), 'iframe'],
  }),
});
```

Spread the default schema rather than rebuilding one. The default keeps a `<script>` tag or an
inline event handler in an editor's markdown from becoming a stored XSS payload, and building the
schema from scratch drops that floor by accident. `unsafeDisableSanitize: true` removes the floor
entirely. It exists for a site whose content is fully developer-controlled. Set it in code; it is
never an editor-facing option.

`anchorRel` controls the `rel` value cairn forces onto every `target="_blank"` anchor, default
`'noopener noreferrer'`. Pass a different string to change it, or `false` if your site already
hardens anchors itself.

## Table scrolling

A markdown table renders as a bare `<table>` with no wrapper, and `.prose table { display: block;
overflow-x: auto }` alone would make a narrow viewport scroll a wide table instead of squeezing its
columns, but it also strips the table's row and cell roles from the accessibility tree. `renderMarkdown`
wraps every table in a labeled, keyboard-reachable `role="region"` div by default, so the table itself
stays a real `<table>` and only the wrapper scrolls. Set `tableScroll: false` for a site that supplies
its own wrapping, whether a `rehypePlugins` entry or a different a11y strategy:

```ts
import { createRenderer, defineRegistry } from '@glw907/cairn-cms';

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
  tableScroll: false,
});
```

## Add your own remark or rehype plugins

`RendererOptions` also carries `remarkPlugins` and `rehypePlugins`, so a site can extend the
pipeline instead of post-processing `renderMarkdown`'s output string. A remark plugin runs after
cairn's own markdown-stage steps (directive stamping, `cairn:` link resolution, figures, `media:`
resolution). A rehype plugin runs after cairn's own hast-stage steps (dispatch, the sanitize floor,
heading slugs, highlighting, anchor hardening, the sink guard, the default table-scroll wrap). Both
run over the already-built tree, so a site plugin composes with the engine instead of re-parsing
HTML:

```ts
import { createRenderer, defineRegistry } from '@glw907/cairn-cms';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/** Defer every image's load until it nears the viewport. */
function rehypeLazyImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img') (node.properties ??= {}).loading = 'lazy';
    });
  };
}

const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }), {
  rehypePlugins: [rehypeLazyImages],
});
```

## Related reference

[`createRenderer`](../reference/core.md#createrenderer) and
[`SiteRender`](../reference/core.md#stable-api) document the full call shapes. The
[media reference](../reference/media.md) covers `resolveMedia` and the manifest it resolves
against. The [islands reference](../reference/islands.md) covers hydrating a directive into a live
Svelte component, a separate concern from rendering its static markup.
