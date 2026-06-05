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
