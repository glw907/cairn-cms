# Build your first cairn site

This tutorial walks a newcomer through building a first cairn site from an empty directory to a working site running on your own machine. You will build a small blog called `Field Notes`, and along the way you will touch the full current feature set: the adapter and schema, the render pipeline, a custom component, internal links, the delivery surface, the nav menu, and the admin editor.

The tutorial teaches once, in build order. For a single task you already know how to do on an existing site, the [guides](../guides/README.md) are shorter. For exact signatures, the [reference](../reference/README.md) is the source of truth. This page links both at each step rather than restating them, so follow it top to bottom the first time.

## Milestone 0: What you will build, and prerequisites

By the end you will have `Field Notes` running locally: a blog with two posts and one page, a custom callout component authored in markdown, an internal link from one post to another that survives a rename, RSS and JSON feeds, a sitemap, and a working admin editor where you log in, edit a post, and save. The content stays small on purpose. Each milestone adds one real shipped feature, so the breadth comes from the build rather than from the writing.

You need a few things before you start:

- Node and npm installed.
- A terminal.
- Basic SvelteKit familiarity, enough to recognize routes and server load functions.

cairn is a markdown-in-git CMS for SvelteKit on Cloudflare. Content lives as markdown files in your repository, the admin commits edits through a GitHub App, and the public site renders the files. Two background reads explain the shape before you build it. [Architecture](../explanation/architecture.md) covers the engine and site line and the commit-and-publish flow. [The content model](../explanation/content-model.md) covers the fixed concepts and the URL identity model you will use here.

One note on the starting point. The `create-cairn-site` scaffolder is forthcoming. Until it lands, this tutorial wires the project by hand, and a few later milestones give you copy-paste boilerplate that the scaffolder will eventually generate for you.

## Milestone 1: Create the project

Start from a fresh SvelteKit app. Create it with the SvelteKit CLI and pick the minimal skeleton with TypeScript:

```bash
npx sv create field-notes
cd field-notes
npm install
```

Install cairn from npm:

```bash
npm install @glw907/cairn-cms
```

cairn is design-agnostic, and the showcase styles its admin and its public pages with Tailwind and DaisyUI, so add them next. DaisyUI is a host peer dependency, which means your site supplies it rather than the engine:

```bash
npm install -D tailwindcss @tailwindcss/vite
npm install -D daisyui
```

Wire Tailwind into Vite and load DaisyUI as a plugin. Your `vite.config.ts` adds the Tailwind plugin alongside SvelteKit:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

Then create `src/app.css` to load Tailwind and register DaisyUI:

```css
@import 'tailwindcss';
@plugin 'daisyui';
```

Import that stylesheet once from your root layout, `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

The project now builds and serves an empty SvelteKit site with Tailwind and DaisyUI ready. The next milestones turn it into `Field Notes`.

## Milestone 2: Define the adapter and schema

The adapter is the one seam the engine consumes. It declares your content concepts, each concept's fields, how markdown renders, and the GitHub backend that commits edits. You write it once, at `src/lib/cairn.config.ts`.

`Field Notes` has two concepts, the same two cairn ships first. `posts` are dated and `pages` are not. Each concept declares its fields with `defineFields`. Create `src/lib/cairn.config.ts`:

```ts
import { defineAdapter, defineFields } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  siteName: 'Field Notes',
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date', required: true },
        { type: 'textarea', name: 'description', label: 'Description' },
      ]),
    },
    pages: {
      dir: 'src/content/pages',
      label: 'Pages',
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'textarea', name: 'description', label: 'Description' },
      ]),
    },
  },
  backend: { owner: 'you', repo: 'field-notes', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@field-notes.test' },
});
```

The `render` method, the component registry, and the icon set are still missing from this adapter. You add them in milestones 4 and 5, after the content exists. The TypeScript compiler will flag the missing `render` until then, which is expected at this stage.

The `summaryFields: ['description']` line tells the home list and the SEO head which field to read for a post's summary. The `description` field feeds both.

One declaration carries a lot of weight here. The array you pass to `defineFields` is the single source of truth for three things: the editor form an author fills in, the validator that checks a save, and the inferred frontmatter type the rest of the engine reads. There is no second place to keep in sync, and the rule that follows is that every frontmatter key your site reads must be declared in the schema. For the field types and the exact signatures, see [`defineAdapter` and `defineFields`](../reference/core.md#defineadapter) in the core reference. For the task on its own, the [adapter and schema guide](../guides/define-an-adapter-and-schema.md) covers it.

Notice what the adapter does not carry. The slug codec and the per-concept date granularity, `datePrefix`, do not live on the adapter. They live in the site's YAML url policy, which you set in milestone 6, so the site owner controls the permalink shape without touching code. For the id-to-slug split behind that, see [URL identity](../explanation/content-model.md#url-identity).

## Milestone 3: Add content

Content is markdown files on disk. A file's frontmatter is the fields you just declared, and the body is the markdown the site renders. Add three files, two posts and one page.

A dated post's filename stem is its permanent id, and the leading date sorts the files in the directory. Create the first post at `src/content/posts/2026-05-01-first-trail.md`:

```markdown
---
title: First trail on the ridge
date: 2026-05-01
description: A short walk up the ridge to open the season.
---
The snow was gone by the first week of May, so the ridge trail finally opened.
It is a short climb with a long view, a good first walk of the year.
```

Create the second post at `src/content/posts/2026-05-15-packing-list.md`:

```markdown
---
title: A weekend packing list
date: 2026-05-15
description: What goes in the pack for an overnight on the ridge.
---
A weekend on the ridge needs less than you think.
Water, a stove, a warm layer, and a map cover most of it.
```

This post stays plain for now. In milestone 4 you add a link back to the first-trail post, and in milestone 5 you add the callout component to it.

Create the one page at `src/content/pages/about.md`:

```markdown
---
title: About Field Notes
description: A small blog about walks on the ridge.
---
Field Notes is a small blog about walks on the ridge above town.
```

The three files match the two schemas: every frontmatter key here is a declared field. For why content is a fixed set of concepts rather than open-ended collections, see [the content model](../explanation/content-model.md#fixed-concepts-not-generic-collections).

## Milestone 4: Configure rendering

The site has content, but the adapter still has no way to turn a markdown body into the HTML a page delivers. That is the `render` method you left out in milestone 2. cairn builds the render pipeline for you with `createRenderer`, and the adapter's `render` delegates to it.

Build the renderer near the top of `src/lib/cairn.config.ts`, then point `render` at it:

```ts
import { createRenderer, defineAdapter, defineFields } from '@glw907/cairn-cms';

const { renderMarkdown } = createRenderer();

export const cairn = defineAdapter({
  siteName: 'Field Notes',
  content: {
    // ... the posts and pages concepts from milestone 2
  },
  backend: { owner: 'you', repo: 'field-notes', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@field-notes.test' },
  render: (md, opts) => renderMarkdown(md, opts),
});
```

That one addition resolves the compiler error from milestone 2. The adapter now has every required field, so the project type-checks.

`createRenderer` takes an optional component registry. Call it with no argument and it defaults to the empty registry, which is exactly right for a plain-prose blog: the full markdown-to-HTML pipeline still runs, there are just no custom components to dispatch. `Field Notes` adds a registry in the next milestone, and you will pass it here. For the signature and the options it accepts, see [`createRenderer`](../reference/core.md#createrenderer) in the core reference.

The pipeline cleans author HTML before it reaches a visitor. A markdown body can carry raw HTML, so a `<script>` tag or a `javascript:` link in author content would otherwise run in the browser. cairn runs the body through a `rehype-sanitize` floor that strips those, and the floor is on by default. It is extend-only: a site can widen the allowlist for benign tags it needs, but it cannot weaken the dangerous strip. For what the floor keeps, strips, and rewrites, see [the render sanitize floor](../render-sanitize-floor.md).

`render` resolves to an HTML string. A page delivers it with Svelte's `{@html}`:

```svelte
<article>{@html renderedBody}</article>
```

The floor has already cleaned that HTML, so the `{@html}` is safe for author-supplied content. You wire the route that loads `renderedBody` in milestone 6, when you build the delivery surface. For the task on its own, the [configure rendering guide](../guides/configure-rendering.md) covers it.

## Milestone 5: Add a custom component

A component is a named block an author inserts in markdown that the registry turns into custom markup. `Field Notes` ships one, a `callout`, a highlighted note with an icon. An author writes it in a post body, and the renderer dispatches it to the markup you define.

A component is one object that declares its `attributes`, its `slots`, and a `build(ctx)` function. `build` returns the hast for the block, reading attribute values off `ctx.attributes` and slot content off `ctx.slot(name)`. The `callout` has a `tone` attribute that switches its style, an `icon` attribute the editor's icon picker fills, a required inline `title`, and a markdown `body`. Add it to `src/lib/cairn.config.ts`, above the renderer:

```ts
import { createRenderer, defineRegistry, defineAdapter, defineFields } from '@glw907/cairn-cms';
import type { ComponentDef, IconSet } from '@glw907/cairn-cms';
import { h } from 'hastscript';

const icons: IconSet = {
  snowflake: 'M128 24v208M44 76l168 104M212 76L44 180',
};

const callout: ComponentDef = {
  name: 'callout',
  label: 'Callout',
  description: 'A highlighted note with an optional icon.',
  use: 'Draw the reader to one important idea.',
  build: (ctx) =>
    h('aside', { className: ['callout', `callout-${String(ctx.attributes.tone ?? 'note')}`] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
    ]),
  attributes: [
    { key: 'tone', label: 'Tone', type: 'select', required: true, options: ['note', 'warning'] },
    { key: 'icon', label: 'Icon', type: 'icon' },
  ],
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
};
```

Each key in the `icons` map is a name, and each value is the SVG path data for one glyph. The `icon` attribute is typed `'icon'`, so the admin editor renders a picker that lists those names, and an author chooses one without typing path data. One glyph is enough here to see the picker work. The showcase callout also carries a repeatable `points` slot, which the tutorial drops to stay focused; see `examples/showcase/src/lib/cairn.config.ts` for that repeatable-slot shape.

Build the registry from the component, then pass it to `createRenderer` and register it on the adapter so both the render path and the editor palette can see it:

```ts
const registry = defineRegistry({ components: [callout] });
const { renderMarkdown } = createRenderer(registry);

export const cairn = defineAdapter({
  siteName: 'Field Notes',
  content: {
    // ... the posts and pages concepts from milestone 2
  },
  backend: { owner: 'you', repo: 'field-notes', branch: 'main', appId: '1', installationId: '2' },
  sender: { from: 'cms@field-notes.test' },
  render: (md, opts) => renderMarkdown(md, opts),
  registry,
  icons,
});
```

For the registry signature, see [`defineRegistry`](../reference/core.md#defineregistry) in the core reference.

Now author the callout in the packing-list post. An author writes a component through cairn's directive grammar, a colon-fenced block that names the component, sets its attributes, and fills its slots. The admin editor builds this markup for you through the component dialog, but it is plain markdown, so you can write it by hand too. Open `src/content/posts/2026-05-15-packing-list.md` and add the callout to the body:

```markdown
---
title: A weekend packing list
date: 2026-05-15
description: What goes in the pack for an overnight on the ridge.
---
A weekend on the ridge needs less than you think.
Water, a stove, a warm layer, and a map cover most of it.

::::callout[Don't forget water]{tone="warning" icon="snowflake"}
A liter per person is the floor, more if the day is warm.
::::
```

The `[Don't forget water]` part fills the inline `title` slot, the `{tone="warning" icon="snowflake"}` part sets the two attributes, and the text inside the fence fills the markdown `body` slot. When the renderer meets this directive it calls the `callout`'s `build(ctx)`, so `ctx.slot('title')` returns the title content and `ctx.attributes.tone` returns `'warning'`. The post renders the `<aside>` markup, not the literal directive text. For the full directive grammar and how the editor inserts a component, see [Component grammar and insertion](../reference/core.md#component-grammar-and-insertion) in the core reference.
