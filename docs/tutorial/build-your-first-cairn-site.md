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

The dev backend and the admin hooks you wire later read `process.env` and decode base64 with `Buffer`, both Node globals. A site that installs cairn from the registry does not get the Node types transitively, so add them to the project:

```bash
npm install -D @types/node
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

This keeps the root layout almost bare, which matters later: the root layout wraps `/admin` too, so a
real site keeps its nav, footer, and `app.css` out of the root and in a `(site)` route group instead.
Milestone 8 covers the rule, and [the admin route structure](../reference/admin-routes.md) has the full
pattern.

Two small project setup steps remain. The admin signs an editor in by setting `event.locals.editor`, so declare that field's type once in `src/app.d.ts`:

```ts
import type { Editor } from '@glw907/cairn-cms';

declare global {
  namespace App {
    interface Locals {
      editor: Editor | null;
    }
  }
}

export {};
```

The public feeds, the sitemap, and the robots file are endpoints nothing on the site links to, so the prerender crawler does not reach them on its own. Tell SvelteKit to treat an uncrawled prerenderable route as a warning rather than a hard build error. Open `svelte.config.js` and add a `prerender` policy to the `kit` block:

```js
kit: {
  adapter: adapter(),
  prerender: { handleHttpError: 'warn' }
}
```

The minimal SvelteKit skeleton ships a default `static/robots.txt`. cairn serves its own robots file from a route in milestone 6, and a static file of the same name would shadow that route, so delete the default now:

```bash
rm static/robots.txt
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

This post stays plain for now. In milestone 5 you add the callout component to it, and in milestone 8 you add a link back to the first-trail post through the editor's link picker.

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

The pipeline cleans author HTML before it reaches a visitor. A markdown body can carry raw HTML, so a `<script>` tag or a `javascript:` link in author content would otherwise run in the browser. cairn runs the body through a `rehype-sanitize` floor that strips those, and the floor is on by default. It is extend-only: a site can widen the allowlist for benign tags it needs, but it cannot weaken the dangerous strip. For what the floor keeps, strips, and rewrites, see [the render sanitize floor](../explanation/render-safety.md).

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

## Milestone 6: Wire the delivery surface

The content exists and renders, but no public page serves it yet. The delivery surface is the read model that turns your markdown into a home list, post and page permalinks, feeds, a sitemap, and a robots file. It lives on a separate package entry, `@glw907/cairn-cms/delivery`, so the public site imports it without pulling the admin in.

Start with the site's URL policy, because the rest of the surface reads it. The slug codec and the per-concept date granularity live in a YAML site-config file, not on the adapter, so a site owner shapes permalinks without touching code. Create `src/lib/site.config.yaml`:

```yaml
siteName: Field Notes
content:
  posts:
    permalink: /:year/:month/:day/:slug
    datePrefix: day
  pages:
    permalink: /:slug
```

The `posts` policy sets `datePrefix: day`, so a post's id keeps its full `2026-05-15-packing-list` stem while its slug strips the leading date to `packing-list`, and the `permalink` pattern dates the public path. The packing-list post serves at `/2026/05/15/packing-list`. A page carries no date, so the `about` page serves at `/about`. The two permalink shapes differ, which is the point of the per-concept policy.

The adapter reads that YAML and exports the parsed config. Open `src/lib/cairn.config.ts`, import the YAML as raw text, and parse it with `parseSiteConfig`:

```ts
import { createRenderer, defineRegistry, defineAdapter, defineFields, parseSiteConfig } from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';

// ... the icons, the callout, the registry, the renderer, and the cairn adapter from milestones 4 and 5

export const siteConfig = parseSiteConfig(siteYaml);
```

Now build the content layer. One module globs the markdown for every concept and hands the raw records to `createSiteIndexes`, which returns a typed index per concept plus a cross-concept `site` resolver. Vite needs the literal glob string at the call site, so the site supplies one `import.meta.glob` per concept. Create `src/lib/content.ts`:

```ts
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from './cairn.config.js';

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const pagesRaw = import.meta.glob('/src/content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, siteConfig, { posts: postsRaw, pages: pagesRaw });

export const site = indexes.site;
export const posts = indexes.posts;
export const pages = indexes.pages;

export const ORIGIN = 'https://field-notes.test';
export const SITE_DESCRIPTION = 'A small blog about walks on the ridge.';
```

`createSiteIndexes` runs the build gate as it builds, so an entry whose frontmatter fails its concept's validator fails the build instead of shipping broken. For the signature and the `SiteGlobs` shape it expects, see [the delivery reference](../reference/delivery.md) and [the delivery-data reference](../reference/delivery-data.md).

The home page lists the post summaries. Its server load reads `posts.all()`, which returns the cheap summary view with no per-entry body read. Create `src/routes/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { posts } from '$lib/content';

export const prerender = true;

export const load: PageServerLoad = () => ({ posts: posts.all() });
```

The template renders one card per post. Each summary carries a `concept` field, a `permalink`, the `title`, and the `description` you declared in `summaryFields`, so a list card needs no detail read. Create `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<h1>Field Notes</h1>

<ul class="post-list">
  {#each data.posts as post (post.id)}
    <li data-concept={post.concept}>
      <a href={post.permalink}>{post.title}</a>
      {#if post.fields.description}
        <p class="summary">{post.fields.description}</p>
      {/if}
    </li>
  {/each}
</ul>
```

The `data-concept` stamp on each card carries the concept id, so a template can style a post card and a page card differently from one list.

A single catch-all route serves every post and page permalink. `createPublicRoutes` resolves a path against the `site` index with `byPermalink` under the hood, renders the entry's body with the adapter's `render`, and builds the SEO head. It returns an `entries` generator for prerendering and an `entryLoad` for the page load. Create `src/routes/[...path]/+page.server.ts`:

```ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.render,
  origin: ORIGIN,
  siteName: cairn.siteName,
  description: SITE_DESCRIPTION,
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
});

export const entries: EntryGenerator = () => routes.entries();
export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

The matching page reads `data.html` and `data.seo`, and renders the head through `CairnHead` from the component-free `/delivery/head` entry. Create `src/routes/[...path]/+page.svelte`:

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  let { data }: { data: PageData } = $props();
</script>

<CairnHead seo={data.seo} />

<article>
  <h1>{data.entry.title}</h1>
  {@html data.html}
</article>
```

Add the feeds, the sitemap, and the robots file. Each is a prerendered `+server.ts` that reads the indexes and returns a `Response` from a delivery responder. The RSS feed builds one item per post, renders the full body for a full-content feed, and resolves any internal `cairn:` link to an absolute URL with `buildLinkResolver`. Create `src/routes/feed.xml/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { rssResponse, buildLinkResolver, type FeedItem } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const posts = site.concept('posts');
  const toPermalink = buildLinkResolver(site);
  const resolve = (ref: Parameters<typeof toPermalink>[0]) => ORIGIN + toPermalink(ref);
  const items: FeedItem[] = await Promise.all(
    (posts?.all() ?? []).map(async (p) => ({
      title: p.title,
      url: ORIGIN + p.permalink,
      date: p.date,
      summary: p.excerpt,
      contentHtml: await cairn.render(posts!.byId(p.id)!.body, { resolve }),
      tags: p.tags,
    })),
  );
  return rssResponse(
    { title: cairn.siteName, description: SITE_DESCRIPTION, siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.xml' },
    items,
  );
};
```

The JSON feed at `src/routes/feed.json/+server.ts` mirrors this route and calls `jsonFeedResponse` instead of `rssResponse`, with `ORIGIN + '/feed.json'` as the feed URL. The sitemap reads the cross-concept `site` resolver directly. Create `src/routes/sitemap.xml/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content';

export const prerender = true;

export const GET: RequestHandler = () => {
  const urls: SitemapUrl[] = [
    { loc: ORIGIN + '/' },
    ...site.all().map((s) => ({ loc: ORIGIN + s.permalink, ...(s.date ? { lastmod: s.date } : {}) })),
  ];
  return sitemapResponse(urls);
};
```

The robots file points at the sitemap and disallows the admin. Create `src/routes/robots.txt/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN } from '$lib/content';

export const prerender = true;

export const GET: RequestHandler = () => {
  return robotsResponse({ sitemapUrl: ORIGIN + '/sitemap.xml', disallow: ['/admin'] });
};
```

One piece is left, the manifest. The manifest is a build-verified projection of your content files, and it is what keeps an internal `cairn:` link rot-proof. The `cairnManifest()` Vite plugin owns the verify: on every build it evaluates the content corpus and checks the committed manifest against it, and a stale manifest fails the build red. That verify runs outside the prerender lifecycle, so it fails the build regardless of any `handleHttpError` policy. Add the plugin to `vite.config.ts`, after `sveltekit()`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    cairnManifest({
      configModule: '/src/lib/cairn.config.ts',
      content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
  ssr: { noExternal: ['@glw907/cairn-cms'] },
});
```

When you edit content outside the admin commit pipeline, regenerate the manifest with the `cairn-manifest` bin. Wire it as a script in `package.json`:

```jsonc
"scripts": {
  "cairn:manifest": "cairn-manifest"
}
```

The admin commit pipeline writes the manifest for you on every save, so you run `npm run cairn:manifest` by hand only after you edit a file on disk, which you do in milestone 9. For the plugin options and the bin, see [the vite reference](../reference/vite.md#cairnmanifest).

One note on package entries. A SvelteKit route imports through `@glw907/cairn-cms/delivery`, which pulls `@sveltejs/kit` into its module graph. A plain-Node tool such as a custom manifest script cannot import that barrel. Point such an import at `@glw907/cairn-cms/delivery/data`, the node-safe surface that re-exports the same builders without the SvelteKit dependency:

```ts
import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
```

For the task on its own, the [wire the delivery surface guide](../guides/wire-the-delivery-surface.md) traces this same wiring against the showcase files.

## Milestone 7: Add the nav menu

The site needs a navigation menu, and that menu lives in the same YAML site-config file you just created. A menu is a named list of links read at build time, so the public site renders it without a runtime call. Add a `primary` menu to `src/lib/site.config.yaml` with a link to the home list and a link to the about page:

```yaml
siteName: Field Notes
menus:
  primary:
    - label: Home
      url: /
    - label: About
      url: /about
content:
  posts:
    permalink: /:year/:month/:day/:slug
    datePrefix: day
  pages:
    permalink: /:slug
```

The site reads the menu at build time with `parseSiteConfig` and `extractMenu`, the same parse you already wired for the URL policy. A template pulls the `primary` menu out of the parsed config and renders one link per node. For the signatures, see [`parseSiteConfig` and `extractMenu`](../reference/core.md#parsesiteconfig) in the core reference.

The admin nav editor needs to know which menu in the YAML it edits, so tell the adapter. Open `src/lib/cairn.config.ts` and add a `navMenu` entry to `defineAdapter`, naming the config file, the menu, and how deep the tree may nest:

```ts
  navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
```

You do not hand-edit this YAML for every change. The admin carries a nav tree editor that reads this menu, lets an author reorder and rename its links, and commits the result back to the same file. You wire and exercise that nav editor in milestone 8. For why a page lives at a stable permalink that a menu link can point to, see [URL identity](../explanation/content-model.md#url-identity) in the content model.

## Milestone 8: Run the admin locally with the dev backend

The public site is complete. Now you bring up the admin, the editor where an author logs in, edits a post, inserts a component, adds an internal link, and saves a commit. The admin needs two things a real deployment supplies: an authenticated editor and a GitHub App that commits the save. You do not have either on your machine yet. The backend guides set up the real ones, and milestone 10 points you at them. To run the loop locally first, you install a dev backend, a copy-paste fixture that stands in for both.

A loud warning before you copy anything. The dev backend is for local development only. It installs an authentication bypass that signs you in as a fixed editor with no email check, and it installs a fake GitHub that records commits in memory instead of pushing them to a real repository. Never set the `CAIRN_DEV_BACKEND` flag in a deployed environment. With the flag unset, both fixtures are inert, so they are safe to keep in the repository, but the flag itself is the live wire. The deploy guide replaces this fixture with the real GitHub App and D1 auth and drops the flag entirely.

### Copy the dev backend fixture

The first file is the fake GitHub. It intercepts `fetch` calls to `api.github.com` and answers them from an in-memory file map, so a save reaches a fake repo and the engine never touches the network. A save commits the content file and the manifest in one commit through the Git Data API, so the double answers the ref, commit, tree, and refs endpoints as well as the Contents API reads. It seeds the two posts and the build manifest, so the editor's link picker can resolve a `cairn:` link to an existing post. Create `src/lib/dev-github.ts`:

```ts
// DEV ONLY. A fake GitHub that intercepts api.github.com and answers from memory, so the admin
// can save without a real repository or App key. Installed only when CAIRN_DEV_BACKEND=1.
// Never enable this in production: it fakes every commit and records nothing to a real repo.
//
// A save commits through the Git Data API atomic-commit path, so the double answers the ref,
// commit, tree, and refs endpoints as well as the Contents API reads and the token exchange.

let installed = false;

const seededFiles = new Map<string, string>([
  [
    'src/content/posts/2026-05-01-first-trail.md',
    '---\ntitle: First trail on the ridge\ndate: 2026-05-01\ndescription: A short walk up the ridge to open the season.\n---\nThe snow was gone by the first week of May.\n',
  ],
  [
    'src/content/posts/2026-05-15-packing-list.md',
    '---\ntitle: A weekend packing list\ndate: 2026-05-15\ndescription: What goes in the pack for an overnight on the ridge.\n---\nA weekend on the ridge needs less than you think.\n',
  ],
  // The manifest the build commits. Seeded so the link picker can resolve a cairn: link to an
  // existing post; without it a save guard would treat the target as a broken link.
  [
    'src/content/.cairn/index.json',
    JSON.stringify({
      version: 1,
      entries: [
        { id: '2026-05-01-first-trail', concept: 'posts', title: 'First trail on the ridge', date: '2026-05-01', permalink: '/2026/05/01/first-trail', draft: false, links: [] },
        { id: '2026-05-15-packing-list', concept: 'posts', title: 'A weekend packing list', date: '2026-05-15', permalink: '/2026/05/15/packing-list', draft: false, links: [] },
      ],
    }),
  ],
]);

// A staged tree the engine builds with POST /git/trees, keyed by a fake sha. PATCH /git/refs
// promotes one staged tree's file map into the live seededFiles map, modelling a commit.
const stagedTrees = new Map<string, Map<string, string>>();
let counter = 0;
const nextSha = (prefix: string) => `${prefix}-${++counter}`;

export function installDevGitHub(): void {
  if (installed) return;
  installed = true;
  const real = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    if (!url.includes('api.github.com')) return real(input, init);

    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const accept = headers['Accept'] ?? headers['accept'] ?? '';

    // The installation token exchange the App would normally answer.
    if (url.includes('/access_tokens')) return Response.json({ token: 'dev-token' }, { status: 201 });

    // List every blob so the engine can filter a concept's directory.
    if (url.includes('/git/trees/') && method === 'GET') {
      const tree = [...seededFiles.keys()].map((path) => ({ path, type: 'blob' }));
      return Response.json({ tree, truncated: false });
    }

    // The branch head ref and its commit report a stable base, since the double commits by
    // promoting a staged tree rather than tracking a real commit graph.
    if (url.includes('/git/ref/heads/')) return Response.json({ object: { sha: 'dev-head' } });
    if (url.match(/\/git\/commits\/[^/]+$/) && method === 'GET') {
      return Response.json({ tree: { sha: 'dev-base-tree' } });
    }

    // POST /git/trees: stage the file changes against the current file map under a fresh sha.
    if (url.endsWith('/git/trees') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        tree: Array<{ path: string; content?: string; sha?: null }>;
      };
      const next = new Map(seededFiles);
      for (const entry of body.tree) {
        if (entry.sha === null) next.delete(entry.path);
        else if (typeof entry.content === 'string') next.set(entry.path, entry.content);
      }
      const sha = nextSha('tree');
      stagedTrees.set(sha, next);
      return Response.json({ sha });
    }

    // POST /git/commits: bind the staged tree to a commit sha.
    if (url.endsWith('/git/commits') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { tree: string };
      const sha = nextSha('commit');
      const staged = stagedTrees.get(body.tree);
      if (staged) stagedTrees.set(sha, staged);
      return Response.json({ sha });
    }

    // PATCH /git/refs/heads/<branch>: promote the staged tree, modelling the commit landing.
    if (url.includes('/git/refs/heads/') && method === 'PATCH') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { sha: string };
      const staged = stagedTrees.get(body.sha);
      if (staged) {
        seededFiles.clear();
        for (const [p, c] of staged) seededFiles.set(p, c);
        console.log('[dev-github] committed', body.sha);
      }
      return Response.json({ object: { sha: body.sha } });
    }

    const path = decodeURIComponent(url).match(/\/contents\/([^?]+)/)?.[1] ?? '';

    // A read: raw body for the editor, JSON metadata for the file sha.
    if (path && seededFiles.has(path)) {
      if (accept.includes('raw')) return new Response(seededFiles.get(path), { status: 200 });
      return Response.json({ sha: 'old-sha', name: path.split('/').pop() });
    }

    return new Response('Not Found', { status: 404 });
  }) as typeof fetch;
}
```

The second file is the auth bypass. It installs the fake GitHub once and, on any `/admin` request, sets `event.locals.editor` to a fixed editor so the engine treats you as signed in. With the flag unset it runs the engine's `createAuthGuard`, which resolves a real session and gates the admin. Create `src/hooks.server.ts`:

```ts
// The site's server hook. The dev backend is for local development only and activates only when
// CAIRN_DEV_BACKEND=1. With the flag unset this hook is the engine's auth guard, so the admin
// requires a real session. Never set the flag in production: it bypasses authentication.
import type { Handle } from '@sveltejs/kit';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { installDevGitHub } from '$lib/dev-github.js';

const DEV_BACKEND = process.env.CAIRN_DEV_BACKEND === '1';

if (DEV_BACKEND) {
  installDevGitHub();
}

const guard = createAuthGuard();

export const handle: Handle = async ({ event, resolve }) => {
  if (DEV_BACKEND) {
    if (event.url.pathname.startsWith('/admin')) {
      // The locked dev editor identity. A real session carries the same shape. The engine guard is
      // bypassed in dev, so the per-load session check reads this editor straight from locals.
      event.locals.editor = { email: 'you@example.com', displayName: 'You', role: 'owner' };
    }
    return resolve(event);
  }
  return guard({ event, resolve });
};
```

In dev the hook signs you in and skips the guard, since the guard would resolve a session from a database you have not set up yet and redirect to a login page that does not exist. In production the flag is unset, so the hook is the engine's `createAuthGuard`, which gates every `/admin/**` path. For the guard, see [the SvelteKit reference](../reference/sveltekit.md#createauthguard).

### Wire the admin routes

The admin mounts a small route tree that hands every page to the engine's loads and actions. One composer file builds the runtime and the handler groups once, so each route server is a one-line re-export. Create `src/lib/cairn.server.ts`:

```ts
// Composes the runtime once and builds the admin handler groups. mintToken stubs the GitHub App
// token mint so the admin runs in dev without a real App key; the dev GitHub answers for it.
import { composeRuntime } from '@glw907/cairn-cms';
import { createContentRoutes, createNavRoutes } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const content = createContentRoutes(runtime, { mintToken: async () => 'dev-token' });
export const nav = createNavRoutes(runtime, { mintToken: async () => 'dev-token' });
```

### Keep host chrome out of /admin

The host root layout wraps every route, `/admin` included. If it renders a nav, a footer, or a
width-constraining container, that chrome wraps the admin and the admin shell cannot fill the viewport.
The admin self-styles and does not need the host's CSS, so keep the root layout bare and put the public
chrome plus `app.css` in a URL-transparent `(site)` group. The group folder does not change any public
URL, and the admin, which sits outside the group, renders on its own. A dev-only guard in the admin logs
a `console.error` when it detects host chrome wrapping it. See
[the admin route structure](../reference/admin-routes.md) for the full tree and the reasoning.

The route tree splits in two. The login and auth pages sit directly under `admin/`, and the authed shell sits in an `(app)` group whose layout requires a session. The group folder does not appear in the URL, so its pages still resolve under `/admin/*`, but only the group runs the session-requiring layout load, which is what keeps a sessionless visit from looping. For why the tree has this exact shape, read [the admin route structure](../reference/admin-routes.md).

The bare admin layout marks the subtree dynamic and renders its children through. Create `src/routes/admin/+layout.server.ts`:

```ts
// /admin must never prerender. The authed shell load lives in the (app) group below, so login
// and auth pages do not run it and cannot loop back to /admin/login.
export const prerender = false;
```

Create `src/routes/admin/+layout.svelte`:

```svelte
<script lang="ts">
  let { children } = $props();
</script>

{@render children()}
```

The `(app)` group's layout server runs the authed shell load. Create `src/routes/admin/(app)/+layout.server.ts`:

```ts
// The authed shell load: site identity, the signed-in user, and the nav sidebar.
import { content } from '$lib/cairn.server.js';

export const load = content.layoutLoad;
```

The group's layout renders the engine's `AdminLayout` shell around every authed page. Create `src/routes/admin/(app)/+layout.svelte`:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { AdminLayout } from '@glw907/cairn-cms/components';
  import type { LayoutData } from '@glw907/cairn-cms/sveltekit';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<AdminLayout {data}>
  {@render children()}
</AdminLayout>
```

The group's index redirects to the first concept's list. Create `src/routes/admin/(app)/+page.server.ts`:

```ts
// /admin redirects to the first concept's list.
import { content } from '$lib/cairn.server.js';

export const load = content.indexRedirect;
```

The concept list lists a concept's entries and creates a new one. Create `src/routes/admin/(app)/[concept]/+page.server.ts`:

```ts
// Lists one concept's entries and handles the new-entry create action.
import { content } from '$lib/cairn.server.js';

export const load = content.listLoad;
export const actions = { create: content.createAction };
```

Create `src/routes/admin/(app)/[concept]/+page.svelte`:

```svelte
<script lang="ts">
  import { ConceptList } from '@glw907/cairn-cms/components';
  import type { ListData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: ListData } = $props();
</script>

<ConceptList {data} />
```

The editor loads one entry and handles save, delete, and rename. It nests at `[concept]/[id]`, the path the list links to and every redirect targets, so `params.concept` and `params.id` arrive natively. Create `src/routes/admin/(app)/[concept]/[id]/+page.server.ts`:

```ts
// Loads one entry for editing and handles the save, delete, and rename actions.
import { content } from '$lib/cairn.server.js';

export const load = content.editLoad;
export const actions = { save: content.saveAction, delete: content.deleteAction, rename: content.renameAction };
```

The edit page mounts the engine's `EditPage`, passing the adapter's render, registry, and icons so the preview, the component palette, and the icon picker all work. Create `src/routes/admin/(app)/[concept]/[id]/+page.svelte`:

```svelte
<script lang="ts">
  import { EditPage } from '@glw907/cairn-cms/components';
  import type { EditData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '$lib/cairn.config.js';

  let { data }: { data: EditData } = $props();
</script>

<EditPage data={{ ...data, siteName: cairn.siteName }} render={cairn.render} registry={cairn.registry} icons={cairn.icons} />
```

The nav editor loads the menu tree and saves an edited one. Create `src/routes/admin/(app)/nav/+page.server.ts`:

```ts
// Loads the nav tree and the page options, and saves an edited tree to the site config.
import { nav } from '$lib/cairn.server.js';

export const load = nav.navLoad;
export const actions = { default: nav.navSave };
```

Create `src/routes/admin/(app)/nav/+page.svelte`:

```svelte
<script lang="ts">
  import { NavTree } from '@glw907/cairn-cms/components';
  import type { NavLoadData } from '@glw907/cairn-cms/sveltekit';

  let { data }: { data: NavLoadData } = $props();
</script>

<NavTree {data} />
```

One file is left, the health check. A deploy probe has to reach it without a session, so it lives at the site root rather than under `/admin`. Create `src/routes/healthz/+server.ts`:

```ts
// The deploy health check at the site root, outside /admin so the auth guard does not gate it.
// prerender = false keeps it dynamic on a site that prerenders by default.
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { healthLoad } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '$lib/cairn.server.js';

export const prerender = false;

export const GET: RequestHandler = async (event) => json(await healthLoad(event, runtime));
```

For the loads and actions these route servers re-export, see [the SvelteKit reference](../reference/sveltekit.md). For the components the pages mount, see [the components reference](../reference/components.md).

### Walk the author loop

Start the dev server with the flag set:

```bash
CAIRN_DEV_BACKEND=1 npm run dev
```

Open `/admin` in the browser. The dev auth bypass signs you in as `You`, so you land on the posts list with no login step. Click the packing-list post to open the editor. The editor shows the frontmatter form built from your schema, a markdown body, and a live preview.

Now author the callout through the component dialog instead of typing the directive by hand. Open the component palette, choose `Callout`, and fill its guided form. The form has a `Tone` select and an `Icon` field. The icon field renders a picker that lists your icon set, so choose `snowflake` from it, the one glyph you registered in milestone 5. Fill the title and the body, then insert. The dialog serializes the directive and drops it at the cursor, the same markup you wrote by hand earlier.

Next add the internal link the packing-list post has been missing since milestone 3. Open the link picker, search for the first-trail post by its title, and choose it. The picker inserts a `cairn:posts/2026-05-01-first-trail` link at the cursor, the rot-proof token that survives a later rename of the target. Save the post. The save runs through the engine, the dev GitHub records the commit in memory, and you see a `[dev-github] committed` line in the terminal. The save also exercises the nav editor's sibling route, so open `/admin/nav` to see the `primary` menu you set in milestone 7 rendered as a reorderable tree.

You now have the full author loop running on your machine: log in, edit, insert a component, add an internal link, and save a commit. The commit is fake. To make it real, you set up the production backend. [Set up the GitHub App](../guides/set-up-the-github-app.md) creates the App that commits to your repository. [Configure auth and D1](../guides/configure-auth-and-d1.md) sets up the magic-link login store. [Deploy to Cloudflare](../guides/deploy-to-cloudflare.md) swaps the dev fixture for the real GitHub App and D1 auth and drops the `CAIRN_DEV_BACKEND` flag.

## Milestone 9: Confirm the internal link and regenerate the manifest

You added the `cairn:` link inside the running admin, which committed through the dev GitHub. The fake commit lives in memory, so the file on disk does not carry the link yet. To finish the tutorial against the public site, add the same link to the packing-list file on disk. Open `src/content/posts/2026-05-15-packing-list.md` and write the link in markdown:

```markdown
For more on the trail itself, see the [first trail on the ridge](cairn:posts/2026-05-01-first-trail).
```

That `cairn:posts/2026-05-01-first-trail` href is the internal link token. The first part is the concept, the second is the target post's permanent id. The link names the file, not the URL, so it survives a later change to the permalink shape or a rename of the target.

A `cairn:` link resolves through the manifest, the build-verified projection of your content that you wired in milestone 6. The admin commit pipeline rewrites the manifest on every save, so a link added in the editor is already resolvable. You edited the file on disk this time, so regenerate the manifest by hand:

```bash
npm run cairn:manifest
```

Reload the dev server and open the packing-list post at `/2026/05/15/packing-list`. The `cairn:` link now renders as a real anchor pointing at the first-trail post's permalink, `/2026/05/01/first-trail`. The renderer read the manifest, looked up the target id, and rewrote the token into the live URL.

That lookup is what keeps an internal link rot-proof. The link stores a permanent id, the manifest maps every id to its current permalink, and the build verify fails red if the manifest drifts from the files. A target post can move to a different date or a different slug, and every link to it still resolves, because the id never changes. For the link helpers behind the token, see [`cairn:` link helpers](../reference/core.md#cairn-link-helpers) in the core reference. For the content graph the manifest projects, see [the content graph](../explanation/content-model.md#the-content-graph) in the content model.

## Milestone 10: Where to go next

`Field Notes` runs on your machine. To put it on the web with real logins and real commits, work through the four backend and deploy guides. [Set up the GitHub App](../guides/set-up-the-github-app.md) creates the App that commits to your repository. [Configure auth and D1](../guides/configure-auth-and-d1.md) sets up the magic-link login store. [Wire the delivery surface](../guides/wire-the-delivery-surface.md) revisits the public read model against the showcase. [Deploy to Cloudflare](../guides/deploy-to-cloudflare.md) ships the site.

The deploy guides replace the dev backend with the real GitHub App and D1 auth and drop the `CAIRN_DEV_BACKEND` flag, so the bypass and the fake GitHub never reach production.

For the reasoning behind the design, read [the explanation arm](../explanation/README.md). For the full API surface, the [reference](../reference/README.md) is the source of truth.
