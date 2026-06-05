# Define an adapter and schema

Goal: define the adapter that tells cairn the site's concepts, how its slugs encode, and what fields each concept carries.

## Prerequisites

- The package installed (`@glw907/cairn-cms`).
- A sense of the site's content concepts. cairn models content as a fixed set of named concepts (Posts and Pages ship), not an open-ended `collections[]` array. See [the content model](../explanation/content-model.md#fixed-concepts-not-generic-collections) for why.

This guide assumes you already have a running cairn site and want to shape its content. If you are building one for the first time, start from the tutorial, then come back here.

## Steps

1. **Create `src/lib/cairn.config.ts`.** This file holds the adapter, the one seam the engine consumes. It declares the concept set, each concept's schema, the slug codec, and the `render` method. The showcase keeps it at `examples/showcase/src/lib/cairn.config.ts`, and the snippets below are drawn from that file.

2. **Declare the concept set with `defineAdapter`.** Each key under `content` is one concept. The showcase declares two, `posts` and `pages`, each with a content directory and a label:

   ```ts
   import { defineAdapter, defineFields } from '@glw907/cairn-cms';

   export const cairn = defineAdapter({
     siteName: 'Cairn Showcase',
     content: {
       posts: {
         dir: 'src/content/posts',
         label: 'Posts',
         summaryFields: ['description'],
         schema: defineFields([
           { type: 'text', name: 'title', label: 'Title', required: true },
           { type: 'date', name: 'date', label: 'Date' },
           { type: 'textarea', name: 'description', label: 'Description' },
           { type: 'text', name: 'image', label: 'Social image' },
           { type: 'text', name: 'author', label: 'Author' },
         ]),
       },
       pages: {
         dir: 'src/content/pages',
         label: 'Pages',
         schema: defineFields([
           { type: 'text', name: 'title', label: 'Title', required: true },
           { type: 'text', name: 'robots', label: 'Robots' },
         ]),
       },
     },
     backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
     sender: { from: 'cms@showcase.test' },
     render: (md, opts) => renderMarkdown(md, opts),
     navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
     registry,
     icons,
   });
   ```

   For the exact signature and every field `defineAdapter` accepts, see [the core reference](../reference/core.md#defineadapter).

3. **Declare each concept's fields with `defineFields`.** The array passed to `defineFields` is the single source of truth for that concept. The one declaration drives the editor form an author fills in, the validator that checks a save, and the inferred frontmatter type the rest of the engine reads. There is no second place to keep in sync. The rule that follows: every frontmatter key a site reads must be declared in the schema. The showcase `posts` schema declares `description` for exactly that reason, since the SEO head reads it on the validate-once read.

   For the field types, the `required` flag, and the cross-field `options.refine` check, see [the core reference](../reference/core.md#definefields).

4. **Set the slug codec and the per-concept date granularity.** A dated entry's URL is derived from its filename stem, and how much of a leading date the slug strips is per-concept. The URL policy lives in the site's YAML config rather than the adapter, so the site owner controls the permalink shape without touching code. The showcase pairs its adapter with `examples/showcase/src/lib/site.config.yaml`, which the adapter reads through `navMenu.configPath`. For the id-to-slug split and the policy that resolves a permalink, see [URL identity](../explanation/content-model.md#url-identity) and [`permalink`](../reference/core.md#permalink).

5. **Implement the `render` method.** The adapter's `render` turns a concept's markdown into HTML. The showcase builds it once from its component registry and forwards every call:

   ```ts
   import { createRenderer, defineRegistry } from '@glw907/cairn-cms';

   const registry = defineRegistry({ components: [callout, alert] });
   const { renderMarkdown } = createRenderer(registry);

   // ...inside defineAdapter:
   render: (md, opts) => renderMarkdown(md, opts),
   ```

   For the pipeline `createRenderer` assembles and how to register components, see [Configure rendering](./configure-rendering.md).

## Verify

The showcase `cairn.config.ts` compiles, which confirms the adapter and each schema type-check together. Sign in to `/admin` and open a post for editing. The editor form renders one input per declared field (a text input for `title`, a date input for `date`, a textarea for `description`, and so on), because the form is generated from the same `defineFields` declaration. Copy the showcase config as a working starting point and replace the concepts and fields with the site's own.

## See also

- [Core reference](../reference/core.md#defineadapter) for `defineAdapter`, [`defineFields`](../reference/core.md#definefields), and [`defineRegistry`](../reference/core.md#defineregistry), the exact signatures behind this guide.
- [The content model](../explanation/content-model.md#fixed-concepts-not-generic-collections) for the fixed-concept design and the rejected `collections[]` alternative.
- [Configure rendering](./configure-rendering.md) for the `render` method's pipeline.
- [Wire the delivery surface](./wire-the-delivery-surface.md) for consuming the typed read model the adapter produces.
