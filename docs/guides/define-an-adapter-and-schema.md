# Define an adapter and schema

The adapter is the one object that tells cairn what your site's concepts are, how their slugs encode, and what fields each concept carries. This guide walks you through writing it.

## Prerequisites

- The package installed (`@glw907/cairn-cms`).
- A sense of your site's content concepts. cairn models content as a fixed set of named concepts (Posts and Pages ship), not an open-ended `collections[]` array. See [the content model](../explanation/content-model.md#fixed-concepts-not-generic-collections) for why.

This guide assumes you already have a running cairn site and want to shape its content. If you are building one for the first time, start from the tutorial, then come back here.

## Steps

1. **Create `src/lib/cairn.config.ts`.** This file holds your adapter, the one seam the engine consumes. It declares the concept set, each concept's schema, the slug codec, and the `render` method. The showcase keeps its copy at `examples/showcase/src/lib/cairn.config.ts`, and the snippets below come from that file, so you can open it and follow along.

2. **Declare the concept set with `defineAdapter`.** Each key under `content` is one concept. The showcase declares two, `posts` and `pages`, each with a content directory and a label:

   ```ts
   import { defineAdapter, defineConcept, fieldset, fields } from '@glw907/cairn-cms';

   export const cairn = defineAdapter({
     content: {
       posts: defineConcept({
         dir: 'src/content/posts',
         label: 'Posts',
         summaryFields: ['description'],
         routing: 'feed',
         fields: fieldset({
           title: fields.text({ label: 'Title', required: true }),
           date: fields.date({ label: 'Date' }),
           description: fields.textarea({ label: 'Description' }),
           image: fields.image({ label: 'Hero image', seo: true }),
           author: fields.text({ label: 'Author' }),
         }),
       }),
       pages: defineConcept({
         dir: 'src/content/pages',
         label: 'Pages',
         routing: 'page',
         fields: fieldset({
           title: fields.text({ label: 'Title', required: true }),
           robots: fields.text({ label: 'Robots' }),
         }),
       }),
     },
     backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
     email: { from: 'cms@showcase.test' },
     rendering: {
       render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
       components: registry,
       icons,
     },
     editor: {
       nav: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
     },
   });
   ```

   For the exact signature and every field `defineAdapter` accepts, see [the core reference](../reference/core.md#defineadapter).

3. **Declare each concept's fields with `fieldset` and the `fields.*` constructors.** The record you pass to `fieldset` is the single source of truth for that concept. Each key is the frontmatter key, and its value is a `fields.*` descriptor. One declaration drives the editor form an author fills in, the validator that checks a save, and the inferred frontmatter type the rest of the engine reads, so there is no second place to keep in sync. The flip side is that every frontmatter key your site reads must be declared in the schema. The showcase `posts` schema declares `description` for exactly that reason, since the SEO head reads it on the validate-once read.

   The constructors cover the scalar field types (`text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`, `image`). A `select` takes a closed `options` list. A `multiselect` with an `options` list renders as checkboxes, and a `multiselect` with `creatable: true` renders as an open tag input. Every constructor accepts an optional `help` sentence the editor shows under the field. For the full list, the `required` flag, and the cross-field `options.refine` check, see [the core reference](../reference/core.md#fields).

4. **Set each concept's routing and URL policy.** A concept declares its own `routing` (the `'feed'`, `'page'`, or `'embedded'` shorthand, or an explicit rule), `permalink`, and `datePrefix` through `defineConcept`. A dated entry's URL is derived from its filename stem, and `datePrefix` sets how much of a leading date the slug strips. `defineConcept` validates the policy at declaration, so a bad permalink throws at module load. For the id-to-slug split and the policy that resolves a permalink, see [URL identity](../explanation/content-model.md#url-identity).

5. **Implement the `render` method.** Your adapter's `render` turns a concept's markdown into HTML. The showcase builds its renderer once from its component registry and forwards every call:

   ```ts
   import { createRenderer, defineRegistry } from '@glw907/cairn-cms';

   const registry = defineRegistry({ components: [callout, alert] });
   const { renderMarkdown } = createRenderer(registry);

   // ...inside the adapter's rendering group:
   rendering: { render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }), components: registry, icons },
   ```

   For the pipeline `createRenderer` assembles and how to register components, see [Configure rendering](./configure-rendering.md).

6. **Name your stylesheets for the preview frame.** The admin keeps your site's CSS out of its own document on purpose (chrome isolation is what lets the admin render correctly on any host), so the editor's Preview tab renders inside a sandboxed iframe instead. The optional `preview` member tells that frame which stylesheets to link, and a Vite `?url` import resolves the compiled, hashed asset URL at build time:

   ```ts
   import siteCss from './site.css?url';

   // ...inside the adapter's editor group:
   editor: { preview: { stylesheets: [siteCss], containerClass: 'site-main' } },
   ```

   `containerClass` reproduces your content wrapper (the element your pages render entries into), so the preview takes the same measure and padding as the live page. `bodyClass` does the same for any classes your site puts on `<body>`, such as a theme root. When your concepts wrap content differently (posts inside a post module, pages inside a static-page wrapper), the optional `byConcept` map overrides either class per concept id, and an entry's preview picks the override for its own concept:

   ```ts
   editor: {
     preview: {
       stylesheets: [siteCss],
       containerClass: 'static-page',
       byConcept: { posts: { bodyClass: 'post-body', containerClass: 'post-module' } },
     },
   },
   ```

   The frame's document pins a white body background as a deliberately overridable default, so if your site's ground is not white, state the body background in your own stylesheet. One rule comes with the idiom: reference the sheet only through `?url`, and have the site layout link the resolved URL from a `<svelte:head>` rather than importing the file statically. A static import folds the sheet into a CSS chunk whose name differs between the client and server builds, and the preview frame's link then 404s. The showcase's `site.css` header comment and [the core reference](../reference/core.md#preview-adapter-editor-member) carry the full explanation.

   With the knob wired, editors get a design-accurate proof, and the Preview tab's width menu lets them check the page at tablet and phone widths too. Without it the preview still renders, unstyled, behind a one-line hint naming this option.

## Verify

Compile first. When `cairn.config.ts` type-checks, the adapter and each schema agree (the showcase copy compiles, which is the working proof). Then sign in to `/admin` and open a post for editing. You should see one input per declared field (a text input for `title`, a date input for `date`, a textarea for `description`, and so on), because the form is generated from the same `fieldset` declaration you just wrote. If you want a known-good starting point, copy the showcase config and replace its concepts and fields with your own.

## See also

- [Core reference](../reference/core.md#defineadapter) for `defineAdapter`, [`fieldset`](../reference/core.md#fieldset), the [`fields`](../reference/core.md#fields) constructors, and [`defineRegistry`](../reference/core.md#defineregistry), the exact signatures behind this guide.
- [The content model](../explanation/content-model.md#fixed-concepts-not-generic-collections) for the fixed-concept design and the rejected `collections[]` alternative.
- [Configure rendering](./configure-rendering.md) for the `render` method's pipeline.
- [Wire the delivery surface](./wire-the-delivery-surface.md) for consuming the typed read model the adapter produces.
