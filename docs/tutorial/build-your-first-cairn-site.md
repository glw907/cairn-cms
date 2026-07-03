<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

# Build your first cairn site

This tutorial takes you from an empty directory to a working cairn site running on your own machine. You will build a small blog called `Field Notes`, and along the way you will touch everything cairn currently ships, including the adapter and schema, the render pipeline, a custom component, internal links, the delivery surface, the nav menu, and the admin editor. The repository carries a complete consumer site at [`examples/showcase`](../../examples/showcase); keep it open alongside this page, because every file you write here has a finished counterpart there.

The tutorial teaches each piece once, in build order, so follow it top to bottom the first time. When you already know how to do a single task on an existing site, the [guides](../guides/README.md) get you there faster, and for exact signatures the [reference](../reference/README.md) is the source of truth. This page links both at each step rather than restating them.

## Milestone 0: What you will build, and prerequisites

By the end you will have `Field Notes` running locally. It is a blog with two posts and one page, a custom callout component authored in markdown, an internal link from one post to another that survives a rename, RSS and JSON feeds, a sitemap, and a working admin editor where you log in, edit a post, save, and publish. The content stays small on purpose. Each milestone adds one real shipped feature, so the breadth comes from the build rather than from the writing.

You need a few things before you start:

- Node and npm installed.
- A terminal.
- Basic SvelteKit familiarity, enough to recognize routes and server load functions.

cairn is a markdown-in-git CMS for SvelteKit on Cloudflare. Your content lives as markdown files in your repository, the admin commits edits through a GitHub App, and the public site renders the files. Two background reads explain the shape before you build it. [Architecture](../explanation/architecture.md) covers the engine and site line and the commit-and-publish flow. [The content model](../explanation/content-model.md) covers the fixed concepts and the URL identity model you will use here.

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

cairn is design-agnostic, and the admin styles itself, so your site's CSS choices are entirely your own. The showcase makes that point deliberately: its public pages use plain handwritten CSS and load neither Tailwind nor DaisyUI, and the admin still renders fully styled. `Field Notes` will style its public pages with Tailwind and DaisyUI, the stack cairn's own sites use, so add them next:

```bash
npm install -D tailwindcss @tailwindcss/vite
npm install -D daisyui
```

Later you will wire a dev backend and a server hook that reads `process.env`, a Node global. A site that installs cairn from the registry does not get the Node types transitively, so add them yourself:

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

Notice how bare the root layout stays. That matters later, because the root layout wraps `/admin` too, so a
real site keeps its nav, footer, and `app.css` out of the root and in a `(site)` route group instead.
Milestone 8 covers the rule, and [the canonical admin mount](../reference/admin-routes.md) has the full
pattern.

Two small project setup steps remain. The admin signs an editor in by setting `event.locals.editor`, so declare that field's type once in `src/app.d.ts`. The package ships the declaration; one import applies it:

```ts
import '@glw907/cairn-cms/ambient';
```

You will add public feeds, a sitemap, and a robots file later, and nothing on the site links to them, so the prerender crawler never reaches them on its own. Tell SvelteKit to treat an uncrawled prerenderable route as a warning rather than a hard build error. Open `svelte.config.js` and add a `prerender` policy to the `kit` block:

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

If you started the dev server at this point, you would get an empty SvelteKit site with Tailwind and DaisyUI ready and nothing on it. The next milestones turn it into `Field Notes`.

## Milestone 2: Define the adapter and schema

The adapter is the one seam the engine consumes. It declares your content concepts, each concept's fields, how markdown renders, and the GitHub backend that commits edits. You write it once, at `src/lib/cairn.config.ts`.

`Field Notes` has two concepts, the same two cairn ships first. `posts` are dated and `pages` are not. Each concept declares its fields with `fieldset` and the `fields.*` constructors. Create `src/lib/cairn.config.ts`:

<!-- snippet-check-skip: the adapter's rendering group is intentionally still missing here; milestone 4 adds it, and the prose above tells the reader to expect the compiler to flag exactly this -->
```ts
import { defineAdapter, defineConcept, fieldset, fields, githubApp } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      routing: 'feed',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date', required: true }),
        description: fields.textarea({ label: 'Description' }),
      }),
    }),
    pages: defineConcept({
      dir: 'src/content/pages',
      label: 'Pages',
      routing: 'page',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        description: fields.textarea({ label: 'Description' }),
      }),
    }),
  },
  backend: githubApp({ owner: 'you', repo: 'field-notes', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@field-notes.test' },
});
```

One piece is still missing from this adapter: the `rendering` group with its `render` method, the component registry, and the icon set. You add it in milestones 4 and 5, after the content exists. Until then the TypeScript compiler flags the missing `rendering`, so if you run a check now and see that error, you are on track.

The `summaryFields: ['description']` line tells the home list and the SEO head which field to read for a post's summary. The `description` field feeds both.

One declaration carries a lot of weight here. The record you pass to `fieldset` drives the editor form an author fills in, the validator that checks a save, and the inferred frontmatter type the rest of the engine reads, all from this one source. Each key is the frontmatter key, and its value is a `fields.*` descriptor. There is no second place to keep in sync. The rule that follows is that every frontmatter key your site reads must be declared in the schema. For the field types and the exact signatures, see [`defineAdapter`](../reference/core.md#defineadapter) and [`fieldset`](../reference/core.md#fieldset) in the core reference. For the task on its own, the [adapter and schema guide](../guides/define-an-adapter-and-schema.md) covers it.

Notice what milestone 2 leaves for later. Each concept declares its own URL policy through `defineConcept`: its `routing`, its `permalink`, and its date granularity `datePrefix`. You add the `permalink` and `datePrefix` in milestone 6, when you wire the delivery surface. For the id-to-slug split behind that, see [URL identity](../explanation/content-model.md#url-identity).

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

Every frontmatter key in these three files is a field you declared in milestone 2, so the files and the schemas agree. For why content is a fixed set of concepts rather than open-ended collections, see [the content model](../explanation/content-model.md#fixed-concepts-not-generic-collections).

## Milestone 4: Configure rendering

Your site has content now, and still no way to turn a markdown body into the HTML a page delivers. That is the `render` method you left out in milestone 2. cairn builds the render pipeline for you with `createRenderer`, and the adapter's `render` delegates to it.

Build the renderer near the top of `src/lib/cairn.config.ts`, then point `render` at it:

```ts
import { createRenderer, defineAdapter, fieldset, fields, githubApp } from '@glw907/cairn-cms';

const { renderMarkdown } = createRenderer();

export const cairn = defineAdapter({
  content: {
    // ... the posts and pages concepts from milestone 2
  },
  backend: githubApp({ owner: 'you', repo: 'field-notes', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@field-notes.test' },
  rendering: { render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }) },
});
```

That one addition clears the compiler error from milestone 2. The adapter now has every required field, so the project type-checks.

`createRenderer` takes an optional component registry. Call it with no argument and you get the empty registry, which is exactly right for a plain-prose blog (the full markdown-to-HTML pipeline still runs, there are just no custom components to dispatch). `Field Notes` adds a registry in the next milestone, and you will pass it here. For the signature and the options it accepts, see [`createRenderer`](../reference/core.md#createrenderer) in the core reference.

The pipeline cleans author HTML before it reaches a visitor. A markdown body can carry raw HTML, so a `<script>` tag or a `javascript:` link in author content would otherwise run in the browser. cairn runs the body through a `rehype-sanitize` floor that strips those, and the floor is on by default. The floor is also extend-only, so a site can widen the allowlist for benign tags it needs and cannot weaken the dangerous strip. For what the floor keeps, strips, and rewrites, see [the render sanitize floor](../explanation/render-safety.md).

`render` resolves to an HTML string. A page delivers it with Svelte's `{@html}`:

```svelte
<article>{@html renderedBody}</article>
```

The floor has already cleaned that HTML, so the `{@html}` is safe for author-supplied content. You wire the route that loads `renderedBody` in milestone 6, when you build the delivery surface. For the task on its own, the [configure rendering guide](../guides/configure-rendering.md) covers it.

## Milestone 5: Add a custom component

A component is a named block an author inserts in markdown that the registry turns into custom markup. `Field Notes` ships one, a `callout`, a highlighted note with an icon. An author writes it in a post body, and the renderer dispatches it to the markup you define.

A component is one `defineComponent` call that declares its `attributes`, its `slots`, and a `build(ctx)` function. The `attributes` are a `fields.*` record, the same field vocabulary a concept schema uses, and `defineComponent` validates the component when the module loads. `build` returns the hast for the block, reading attribute values off `ctx.attributes` and slot content off `ctx.slot(name)`. The `callout` has a `tone` attribute that switches its style, an `icon` attribute the editor's icon picker fills, a required inline `title`, and a markdown `body`. Add it to `src/lib/cairn.config.ts`, before the renderer:

```ts
import { createRenderer, defineRegistry, defineComponent, defineAdapter, fieldset, fields, githubApp } from '@glw907/cairn-cms';
import type { IconSet } from '@glw907/cairn-cms';
import { h } from 'hastscript';

const icons: IconSet = {
  snowflake: 'M128 24v208M44 76l168 104M212 76L44 180',
};

const callout = defineComponent({
  name: 'callout',
  label: 'Callout',
  description: 'A highlighted note with an optional icon.',
  use: 'Draw the reader to one important idea.',
  build: (ctx) =>
    h('aside', { className: ['callout', `callout-${String(ctx.attributes.tone ?? 'note')}`] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
    ]),
  attributes: {
    tone: fields.select({ label: 'Tone', required: true, options: ['note', 'warning'] }),
    icon: fields.icon({ label: 'Icon' }),
  },
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
});
```

Each key in the `icons` map is a name, and each value is the SVG path data for one glyph. The `icon` attribute uses `fields.icon()`, so the admin editor renders a picker that lists those names, and an author chooses one without ever typing path data. One glyph is enough here to see the picker work. The showcase callout also carries a repeatable `points` slot, which the tutorial drops to stay focused; see `examples/showcase/src/lib/cairn.config.ts` for that repeatable-slot shape.

Build the registry from the component, then pass it to `createRenderer` and register it on the adapter so both the render path and the editor palette can see it:

<!-- snippet-check-skip: continues the milestone-2 adapter; callout is the component declared just above, and the posts/pages fields aren't restated -->
```ts
const registry = defineRegistry({ components: [callout] });
const { renderMarkdown } = createRenderer(registry);

export const cairn = defineAdapter({
  content: {
    // ... the posts and pages concepts from milestone 2
  },
  backend: githubApp({ owner: 'you', repo: 'field-notes', branch: 'main', appId: '1', installationId: '2' }),
  email: { from: 'cms@field-notes.test' },
  rendering: {
    render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
    components: registry,
    icons,
  },
});
```

For the registry signature, see [`defineRegistry`](../reference/core.md#defineregistry) in the core reference.

Now author the callout in the packing-list post. An author writes a component through cairn's directive grammar, a colon-fenced block that names the component, sets its attributes, and fills its slots. The admin editor builds this markup for you through the component dialog, and it is plain markdown, so you can also write it by hand. Open `src/content/posts/2026-05-15-packing-list.md` and add the callout to the body:

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

The `[Don't forget water]` part fills the inline `title` slot, the `{tone="warning" icon="snowflake"}` part sets the two attributes, and the text inside the fence fills the markdown `body` slot. When the renderer meets this directive it calls the `callout`'s `build(ctx)`, so `ctx.slot('title')` returns the title content and `ctx.attributes.tone` returns `'warning'`. The post renders the `<aside>` markup, never the literal directive text. The directive grammar and how the editor inserts a component are engine-internal, part of what `defineComponent` (documented in the [core reference](../reference/core.md)) builds a validator from.

## Milestone 6: Wire the delivery surface

The content exists and renders, and no public page serves it yet. The delivery surface is the read model that turns your markdown into a home list, post and page permalinks, feeds, a sitemap, and a robots file. It lives on a separate package entry, `@glw907/cairn-cms/delivery`, so the public site imports it without pulling the admin in.

Start with each concept's URL policy, because the rest of the surface reads it. A concept declares its `routing`, `permalink`, and date granularity in `defineConcept`, beside the fields they describe. Open `src/lib/cairn.config.ts` and add `permalink` and `datePrefix` to the concepts you declared in milestone 2:

<!-- snippet-check-skip: continues the milestone-2 concepts, adding the URL policy; the field lists aren't restated -->
```ts
posts: defineConcept({
  dir: 'src/content/posts',
  label: 'Posts',
  summaryFields: ['description'],
  routing: 'feed',
  permalink: '/:year/:month/:day/:slug',
  datePrefix: 'day',
  fields: fieldset({ /* the post fields from milestone 2 */ }),
}),
pages: defineConcept({
  dir: 'src/content/pages',
  label: 'Pages',
  routing: 'page',
  permalink: '/:slug',
  fields: fieldset({ /* the page fields from milestone 2 */ }),
}),
```

The `posts` concept sets `datePrefix: day`, so a post's id keeps its full `2026-05-15-packing-list` stem while its slug strips the leading date to `packing-list`, and the `permalink` pattern dates the public path. The packing-list post serves at `/2026/05/15/packing-list`. A page carries no date, so the `about` page serves at `/about`. The two permalink shapes differ, which is the point of the per-concept policy. `defineConcept` validates each policy at declaration, so a bad permalink throws at module load.

The site still carries a YAML config for its name and, later, its nav menus. Create `src/lib/site.config.yaml`:

```yaml
siteName: Field Notes
```

The adapter reads that YAML and exports the parsed config. Open `src/lib/cairn.config.ts`, import the YAML as raw text, and parse it with `parseSiteConfig`:

```ts
import { createRenderer, defineRegistry, defineAdapter, fieldset, fields, parseSiteConfig } from '@glw907/cairn-cms';
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

Its template renders one card per post. Each summary carries a `concept` field, a `permalink`, the `title`, and the `description` you declared in `summaryFields`, so a list card needs no detail read. Create `src/routes/+page.svelte`:

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

Each card's `data-concept` stamp carries the concept id, so a template can style a post card and a page card differently from one list.

A single catch-all route serves every post and page permalink, so when a visitor requests `/about` or `/2026/05/15/packing-list`, this one route answers. `createPublicRoutes` resolves a path against the `site` index with `byPermalink` under the hood, renders the entry's body with the adapter's `render`, and builds the SEO head. It returns an `entries` generator for prerendering and an `entryLoad` for the page load. Create `src/routes/[...path]/+page.server.ts`:

```ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn, siteConfig } from '$lib/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
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

Next come the feeds, the sitemap, and the robots file. Each is a prerendered `+server.ts` that reads the indexes and returns a `Response` from a delivery responder. The RSS feed builds one item per post, renders the full body for a full-content feed, and resolves any internal `cairn:` link to an absolute URL with `buildLinkResolver`. Create `src/routes/feed.xml/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { rssResponse, buildLinkResolver, type FeedItem } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn, siteConfig } from '$lib/cairn.config';

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
      contentHtml: await cairn.rendering.render(posts!.byId(p.id)!.body, { resolve }),
      tags: p.tags,
    })),
  );
  return rssResponse(
    { title: siteConfig.siteName, description: SITE_DESCRIPTION, siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.xml' },
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

One piece is left, the manifest. The manifest is a build-verified projection of your content files, and it is what keeps an internal `cairn:` link rot-proof. The `cairnManifest()` Vite plugin owns the verify. On every build it evaluates the content corpus, checks the committed manifest against it, and fails the build red on a stale manifest. That verify runs outside the prerender lifecycle, so it fails the build regardless of any `handleHttpError` policy. Add the plugin to `vite.config.ts`, after `sveltekit()`:

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
```

Your site reads the menu at build time with `parseSiteConfig` and `extractMenu`, the same parse you already wired for the site config. A template pulls the `primary` menu out of the parsed config and renders one link per node. For the signatures, see [`parseSiteConfig` and `extractMenu`](../reference/core.md#parsesiteconfig) in the core reference.

The admin nav editor needs to know which menu in the YAML it edits, so tell the adapter. Open `src/lib/cairn.config.ts` and add a `nav` entry to the adapter's `editor` group, naming the config file, the menu, and how deep the tree may nest:

<!-- snippet-check-skip: shows only the adapter's editor.nav addition -->
```ts
  editor: {
    nav: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
  },
```

You do not hand-edit this YAML for every change. The admin carries a nav tree editor that reads this menu, lets an author reorder and rename its links, and commits the result back to the same file. You wire and exercise that nav editor in milestone 8. For why a page lives at a stable permalink that a menu link can point to, see [URL identity](../explanation/content-model.md#url-identity) in the content model.

## Milestone 8: Run the admin locally with the dev backend

The public site is complete. Now you bring up the admin, the editor where an author logs in, edits a post, inserts a component, adds an internal link, saves, and publishes. The admin needs two things a real deployment supplies, an authenticated editor and a GitHub App that commits the save, and you have neither on your machine yet. The backend guides set up the real ones, and milestone 10 points you at them. To run the loop locally first, you install `@glw907/cairn-cms-dev`, a dev backend that stands in for both.

A loud warning before you wire it. The dev backend is for local development only. It mints an owner session with no email check, and it supplies an in-memory GitHub double that records commits in memory instead of pushing them to a real repository. Never set the `CAIRN_DEV_BACKEND` flag in a deployed environment. The dev package ships behind a three-layer fence: the build-foldable `dev` flag, the `devDependency` boundary, and an engine tripwire that fails closed if the flag reaches production. The flag itself is the live wire. The deploy guide replaces the dev backend with the real GitHub App and D1 auth and drops the flag entirely.

### Install the dev backend

Install `@glw907/cairn-cms-dev` as a devDependency:

```bash
npm install -D @glw907/cairn-cms-dev
```

The package exports `devBackendHandle()`, a SvelteKit handle that wires the whole local backend in one call. It sets `event.locals.backend` to an in-memory `Backend`, and the engine resolves that ahead of the real `githubApp` provider you declared in the adapter, so the admin's reads, saves, and publishes run against memory rather than a real repository. The same handle mints the owner session and supplies the binding doubles, so the admin treats you as signed in with no email loop. This replaces the global-`fetch` patch the old dev backend installed.

The in-memory `Backend` is branch-aware. It covers the editor reads, the atomic-commit sequence behind a save, and the pending-branch publish lifecycle. A save lands on the entry's `cairn/<concept>/<id>` branch, Publish copies the held content to `main`, and Discard deletes the branch, the same lifecycle a real deployment runs. The double seeds its repo from your content on disk, so the admin lists the posts and pages you wrote in milestones 3 through 7, the link picker can resolve them, and the nav editor reads the menu you set.

Wire the handle from `src/hooks.server.ts`, behind the build-foldable `dev` flag and the `CAIRN_DEV_BACKEND` opt-in. Import it dynamically so a production build drops it. With the flag unset, the hook is the engine's `createAuthGuard`, which resolves a real session and gates the admin. Create `src/hooks.server.ts`:

```ts
import { dev } from '$app/environment';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit';

let handle: Handle;
if (dev && process.env.CAIRN_DEV_BACKEND === '1') {
  const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
  handle = devBackendHandle();
} else {
  handle = createAuthGuard();
}
export { handle };
```

The `dev` guard and the dynamic `import()` fold away in a production build, so the deployed bundle holds no dev-backend code at all. In dev with the flag set, `devBackendHandle()` signs you in and injects the in-memory backend. In production the flag is unset, so the hook is the engine's `createAuthGuard`, which gates every `/admin/**` path. For the guard, see [the SvelteKit reference](../reference/sveltekit.md#createauthguard).

### Mount the admin

The whole admin mounts as a catch-all route pair, a shared shell layout pair, and a composer, five files in all. The composer builds the runtime once and hands it to `createCairnAdmin`, the facade that serves every admin view through one `load` and one `actions` record. Create `src/lib/cairn.server.ts`:

```ts
// Composes the runtime once and builds the single-mount admin. The in-memory dev backend rides
// event.locals.backend (wired in the previous section), so the admin needs no GitHub App key here.
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime);
```

The shared shell layout pair wraps the whole `/admin` subtree in cairn's chrome (the sidebar, the top bar, the command palette, the theme), so every `/admin/**` route renders inside one shell. Create `src/routes/admin/+layout.server.ts`:

```ts
// The shared admin shell's load: the chrome (nav, user, theme, streamed pending count) for every
// /admin/** route.
import { admin } from '$lib/cairn.server.js';

export const load = admin.shellLoad;
```

Create `src/routes/admin/+layout.svelte`:

```svelte
<script lang="ts">
  import { CairnAdminShell } from '@glw907/cairn-cms/components';
  import type { AdminShellData } from '@glw907/cairn-cms/sveltekit';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: { shell: AdminShellData }; children: Snippet } = $props();
</script>

<CairnAdminShell data={data.shell}>{@render children()}</CairnAdminShell>
```

The catch-all route server re-exports the facade's load and actions. Create `src/routes/admin/[...path]/+page.server.ts`:

```ts
// The single-mount admin route: one catch-all serves every /admin view through the engine's
// load and actions. The admin is session-gated and must never prerender.
import { admin } from '$lib/cairn.server.js';

export const prerender = false;

export const load = admin.load;
export const actions = admin.actions;
```

Its page renders bare inside the shell above, mounting the engine's `CairnAdmin`, which reads the discriminated view data the load returned and renders the right screen for whatever admin URL was requested. The adapter's render, registry, and icons pass through, so the preview, the component palette, and the icon picker all work. Create `src/routes/admin/[...path]/+page.svelte`:

```svelte
<script lang="ts">
  import { CairnAdmin } from '@glw907/cairn-cms/components';
  import type { AdminData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '$lib/cairn.config.js';
  import type { ActionData } from './$types';

  let { data, form }: { data: AdminData; form: ActionData } = $props();
</script>

<CairnAdmin {data} {form} render={cairn.rendering.render} registry={cairn.rendering.components} icons={cairn.rendering.icons} />
```

That is the entire admin surface. The one route serves the concept lists at `/admin/posts` and `/admin/pages`, the editor at `/admin/<concept>/<id>`, the nav editor at `/admin/nav`, the sign-in screens, and the owner's editor management at `/admin/editors`, and it answers every form action those views post. You restate no route table and no action names, so when a release adds an action, the version bump alone delivers it. [The canonical admin mount](../reference/admin-routes.md) documents the URL set and the action vocabulary, and [the SvelteKit reference](../reference/sveltekit.md#createcairnadmin) has the `createCairnAdmin` signature.

### Keep host chrome out of /admin

The host root layout wraps every route, `/admin` included. If it renders a nav, a footer, or a
width-constraining container, that chrome wraps the admin and the admin shell cannot fill the viewport.
The admin self-styles and does not need the host's CSS, so keep the root layout bare and put the public
chrome plus `app.css` in a URL-transparent `(site)` group. The group folder does not change any public
URL, and the admin, which sits outside the group, renders on its own. A dev-only guard in the admin logs
a `console.error` when it detects host chrome wrapping it. See
[the canonical admin mount](../reference/admin-routes.md) for the full pattern and the reasoning.

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

For the load and actions the catch-all re-exports, see [the SvelteKit reference](../reference/sveltekit.md). For `CairnAdmin` and the view components it switches between, see [the components reference](../reference/components.md).

### Walk the author loop

Start the dev server with the flag set:

```bash
CAIRN_DEV_BACKEND=1 npm run dev
```

Open `/admin` in the browser. The dev backend signs you in as `You`, so you land on the posts list with no login step, and both posts carry a Published badge, since the in-memory backend's `main` holds them and no pending branch exists yet. Click the packing-list post to open the editor. The page shows the document title at the top, the markdown body with its formatting toolbar, the remaining frontmatter fields from your schema grouped in the sidebar, and a Preview tab on the toolbar that renders the page the way the site will.

Now author the callout through the component dialog instead of typing the directive by hand. Press Insert block in the toolbar, choose `Callout`, and fill its guided form. The form has a `Tone` select and an `Icon` field. The icon field renders a picker that lists your icon set, so choose `snowflake` from it, the one glyph you registered in milestone 5. Fill the title and the body, then insert. The dialog serializes the directive and drops it at the cursor, the same markup you wrote by hand earlier.

Next add the internal link the packing-list post has been missing since milestone 3. Press Link to page in the toolbar, search for the first-trail post by its title, and choose it. The picker inserts a `cairn:posts/2026-05-01-first-trail` link at the cursor, the rot-proof token that survives a later rename of the target. Now save the post. The save commits to the entry's pending branch, `cairn/posts/2026-05-15-packing-list`, in the in-memory backend, and the header's save-state indicator flips to Saved. Nothing reaches `main` yet; back on the posts list, the row's badge reads Edited to say the live version and the held edits differ.

Publishing is the deliberate second step. Return to the post and press Publish in the header. The engine copies the held markdown to `main`, updates the entry's manifest row in the same commit, and deletes the pending branch, so the badge returns to Published. On a deployed site that `main` commit is what triggers the rebuild and ships the change. The topbar also carries a "Publish site" button when entries are pending, which ships every held entry in one commit.

Two more views are worth a visit. Open `/admin/nav` to see the `primary` menu you set in milestone 7 rendered as a reorderable tree, read from the site config the in-memory backend holds. The editors view at `/admin/editors` manages the sign-in allowlist, and it works in dev with no extra wiring: `devBackendHandle()` supplies a fake D1 auth store alongside the GitHub double, so the allowlist view runs against it out of the box. On the deployed site the view reads the real `AUTH_DB` binding instead.

You now have the full author loop running on your machine: log in, edit, insert a component, add an internal link, save, and publish. The commits are fake. To make them real, you set up the production backend. [Set up the GitHub App](../guides/set-up-the-github-app.md) creates the App that commits to your repository. [Configure auth and D1](../guides/configure-auth-and-d1.md) sets up the magic-link login store. [Deploy to Cloudflare](../guides/deploy-to-cloudflare.md) swaps the dev backend for the real GitHub App and D1 auth and drops the `CAIRN_DEV_BACKEND` flag.

## Milestone 9: Confirm the internal link and regenerate the manifest

You added the `cairn:` link inside the running admin, which committed through the fake GitHub. The fake commits live in memory, so the file on disk does not carry the link yet. To finish the tutorial against the public site, add the same link to the packing-list file on disk. Open `src/content/posts/2026-05-15-packing-list.md` and write the link in markdown:

```markdown
For more on the trail itself, see the [first trail on the ridge](cairn:posts/2026-05-01-first-trail).
```

That `cairn:posts/2026-05-01-first-trail` href is the internal link token. The first part is the concept, the second is the target post's permanent id. The link names the file rather than the URL, so it survives a later change to the permalink shape or a rename of the target.

A `cairn:` link resolves through the manifest, the build-verified projection of your content that you wired in milestone 6. The admin keeps the manifest in step for you, updating the entry's row in the same commit that publishes it. You edited the file on disk this time, so regenerate the manifest by hand:

```bash
npm run cairn:manifest
```

Reload the dev server and open the packing-list post at `/2026/05/15/packing-list`. The `cairn:` link now renders as a real anchor pointing at the first-trail post's permalink, `/2026/05/01/first-trail`. The renderer read the manifest, looked up the target id, and rewrote the token into the live URL.

That lookup is what keeps an internal link rot-proof. The link stores a permanent id, the manifest maps every id to its current permalink, and the build verify fails red if the manifest drifts from the files. A target post can move to a different date or a different slug, and every link to it still resolves, because the id never changes. The token grammar behind the link is engine-internal, part of the render pipeline `createRenderer` composes. For the content graph the manifest projects, see [the content graph](../explanation/content-model.md#the-content-graph) in the content model.

## Milestone 10: Where to go next

`Field Notes` runs on your machine. To put it on the web with real logins and real commits, work through the four backend and deploy guides. [Set up the GitHub App](../guides/set-up-the-github-app.md) creates the App that commits to your repository. [Configure auth and D1](../guides/configure-auth-and-d1.md) sets up the magic-link login store. [Wire the delivery surface](../guides/wire-the-delivery-surface.md) revisits the public read model against the showcase. [Deploy to Cloudflare](../guides/deploy-to-cloudflare.md) ships the site.

The deploy guides replace the dev backend with the real GitHub App and D1 auth and drop the `CAIRN_DEV_BACKEND` flag, so the bypass and the in-memory backend never reach production.

For the reasoning behind the design, read [the explanation arm](../explanation/README.md). For the full API surface, the [reference](../reference/README.md) is the source of truth.
