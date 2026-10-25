# Build the public routes

A cairn site's public pages are route files in the site's SvelteKit app. The engine ships no separate server: the app builds with `@sveltejs/adapter-cloudflare` into one Worker, and the engine runs inside it. Each public route is a few lines of site code around a builder the engine exports, such as `createPublicRoutes` for the entry pages or `rssResponse` for a feed. The entry pages and their raw-markdown twins, the archive, the feeds, the sitemap, and `robots.txt` prerender from the markdown in the commit being deployed. The Worker then serves the files that build wrote, and no public request reads the GitHub repository. The draft preview route is the exception: it renders at request time and reads the draft from its entry's holding branch.

The routes draw on two shared inputs, one set of typed indexes from `createSiteIndexes` and one origin string. The build writes that origin into each canonical URL, `og:url`, feed, and sitemap row, and the origin has to name the deployed site before a production build. To wire the public side, you build the index, name the origin, compose one `PublicRoutesConfig`, wire the routes that read them, and read the prerendered files after a build.

A site that came from `create-cairn-site` already holds every route this page covers except a tag page, along with the shared modules and the menu. On such a site, this page explains what each file does and where to change it. The most urgent change is the origin. The scaffold ships it as the placeholder `https://showcase.test`. If you build a site by hand, you need each route past the entry pages. The section on the draft preview route is for that reader, because a scaffolded site already carries the route. Each single piece, such as a tag page built on `byTag()` or a menu that editors change at `/admin/nav`, has a separate section.

Two limits of the head the engine builds cause symptoms on a site that otherwise builds. The engine builds a head only for entry pages, and a home or archive page has no description or Open Graph tags until its route builds one. It reads the hero and the social image from the frontmatter key `image` alone, whatever image field a concept marks for SEO. Without an `image`, the social image falls back to the config's `defaultImage`. [Give other pages a head](#give-other-pages-a-head) and [Declare the fields the head reads](#declare-the-fields-the-head-reads) cover those limits, along with a fallback `og:image` that answers 404. [Diagnose a failed build](#diagnose-a-failed-build) maps each message a build prints when it stops on content.

This page assumes you know SvelteKit routing, including rest parameters, param matchers, route groups, server endpoints, and layout loads, along with its prerendering exports and Vite's glob imports. It assumes that your adapter already declares the site's concepts, and it links the vendor's documentation wherever a step depends on a vendor detail. It leaves the following topics to other pages:

- A stance toward AI training crawlers, in [Choose an AI posture](choose-an-ai-posture.md).
- Announcing newly published entries, in [Act on newly published entries](act-on-newly-published-entries.md).
- Resolving `media:` images on public pages, in [Configure media](configure-media.md).
- The pages' look, in [Theme your public site](theme-your-public-site.md).
- What a preview link exposes, in [Security model](security-model.md).
- The preview's mint and revoke signatures, in [Public preview](../reference/sveltekit.md#public-preview).
- The preview's refusal reasons, in [Log events](../reference/log-events.md).

## Before you begin

The routes need an adapter, a parsed site config, and a SvelteKit app that builds for Cloudflare. Before you start, confirm that your site has the following:

- An adapter that declares the site's concepts, and the parsed site config. `createSiteIndexes` takes both, and [Define an adapter and schema](define-an-adapter-and-schema.md) covers the adapter and the site config.
- A SvelteKit app that builds with `@sveltejs/adapter-cloudflare`. [Deploy a bare SvelteKit site](add-cairn-to-a-sveltekit-app.md#deploy-a-bare-sveltekit-site) sets one up.
- Optionally, for hero images, a media resolver. Without one, an entry gets no `heroImage`. The [`createMediaResolver`](../reference/media.md#createmediaresolver) entry covers building one.

With those in place, start from a map of the files.

## Lay out the route files

On a scaffolded site, the public routes sit under `src/routes/`, and the modules they share sit in `src/chassis/`. The following tree shows a selection of the scaffold's public files:

```text
src/
├── params.ts
├── chassis/
│   ├── content.ts
│   ├── feed.ts
│   └── public-routes.ts
└── routes/
    ├── +layout.server.ts
    ├── (site)/
    │   ├── +layout.svelte
    │   ├── +page.server.ts
    │   ├── +page.svelte
    │   ├── [...path]/
    │   ├── [...path=md]/
    │   ├── archive/[page]/
    │   └── preview/[token]/
    ├── feed.json/
    ├── feed.xml/
    ├── media/[...path]/
    ├── robots.txt/
    └── sitemap.xml/
```

In `src/chassis/`, `content.ts` builds the index and the site's identity, `public-routes.ts` holds the shared entry config, and `feed.ts` maps posts to feed items.

A hand-built site may lay these files out differently, for example with its routes directly under `src/routes/` and no `(site)` group. Each later section names the scaffold's path, and on such a site you use the matching file in your tree. [Routes and the server hook](scaffolded-site-files.md#routes-and-the-server-hook) lists every route the scaffold writes.

Start with the content module.

## Build one typed index

`createSiteIndexes` builds one typed index per concept from one literal `import.meta.glob` per concept. Vite needs each glob pattern written literally at the call site, so a loop over the concept list can't generate the globs. Vite's [glob import](https://vite.dev/guide/features#glob-import) documentation covers the options.

To build the index, make one call:

- In your content module, pass `createSiteIndexes` the adapter, the parsed site config, and one glob per concept, keyed by concept id.

A scaffolded site makes the call in `src/chassis/content.ts`, with one glob for each of its three concepts:

<!-- snippet-check-skip: imports the scaffold's #theme alias, which resolves only inside a scaffolded site -->
```ts
// src/chassis/content.ts
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from '#theme/cairn.config.js';

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
const fragmentsRaw = import.meta.glob('/src/content/fragments/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, siteConfig, {
  posts: postsRaw,
  pages: pagesRaw,
  fragments: fragmentsRaw,
});

export const site = indexes.site;
export const posts = indexes.posts;
```

Write each glob with `query: '?raw'`, `import: 'default'`, and `eager: true`. A lazy glob, or one without `import: 'default'`, hands the parser a function or a module object. The build then fails with the message that [Diagnose a failed build](#diagnose-a-failed-build) lists.

The result holds one index per concept, keyed by concept id, plus `site`, the cross-concept resolver. A concept therefore can't be named `site`. The site config argument doesn't change the indexes, and the call still takes the parsed config.

Each index's `all()` already returns its entries in the engine's sort order. [Build the archive](#build-the-archive) relies on that order.

`all()` and `byTag()` leave out an entry marked `draft: true` unless called with `{ includeDrafts: true }`. `allTags()` and `adjacent()` always leave it out. The resolver builds its permalink lookup from `all()`, so a draft never resolves or prerenders. `byId` still returns a draft, and a route that looks an entry up by id has to check its `draft` field.

Next, name the origin every absolute URL starts from.

## Name the origin once

The origin is one string with no trailing slash, and a production build needs it set to the deployed origin. The engine takes `PublicRoutesConfig.origin` as a plain string, and keeping it in one string literal is the scaffold's choice.

The engine joins the origin and a leading-slash path with no normalization. A trailing slash would double the slash in each canonical URL and sitemap `loc`. Because the prerendered routes run at build time, a build writes its configured origin into each canonical URL, `og:url`, feed, and sitemap row.

To set the origin, follow these steps:

1. In your content module, set the origin literal to your deployed origin. On a scaffolded site, replace the placeholder `'https://showcase.test'` in `src/chassis/content.ts`.
2. In `wrangler.jsonc`, set `PUBLIC_ORIGIN` to the same origin. The Worker reads that value at runtime.

The scaffold's content module ends with the literal and the `siteMeta` object composed from it:

<!-- snippet-check-skip: continues the scaffold's content module, whose siteName and siteConfig imports it elides -->
```ts
// src/chassis/content.ts
const ORIGIN = 'https://showcase.test';

const DEFAULT_SITE_DESCRIPTION = 'A cairn site.';

export const siteMeta = {
  title: siteName,
  description: siteConfig.description ?? DEFAULT_SITE_DESCRIPTION,
  origin: ORIGIN,
};
```

The scaffold composes `siteMeta` once from the literal. Its `description` falls back to `'A cairn site.'` when the site config sets none. The shared entry config, the feeds, the sitemap, and the robots route all read that object.

With the index and the origin in place, wire the entry pages.

## Wire the entry pages

`createPublicRoutes` turns one `PublicRoutesConfig` into four functions. `entries` lists each routable entry for the prerenderer, and `entryLoad` loads one entry by its request path. `markdownEntries` and `markdownLoad` serve the markdown twin.

To wire the entry pages, follow these steps:

1. In a separate module, export one `PublicRoutesConfig` with `site`, `render`, `origin`, `siteName`, and `description`. A scaffolded site keeps it in `src/chassis/public-routes.ts`.
2. In `src/routes/(site)/[...path]/+page.server.ts`, export `prerender = true` and the factory's `entries`, and return the result of `entryLoad` from the route's load function.
3. In the same directory's `+page.svelte`, render `CairnHead` from `@glw907/cairn-cms/delivery/head` with `seo={data.seo}`, then the entry's `html`.

This section covers the `resolveMedia` and `assetsEnabled` members of the scaffold's config module after the entry page. [Declare the fields the head reads](#declare-the-fields-the-head-reads) covers its `defaultImage`, and [Serve the feeds](#serve-the-feeds) covers its `feeds`. The module reads as follows:

<!-- snippet-check-skip: imports the scaffold's #theme alias, which resolves only inside a scaffolded site -->
```ts
// src/chassis/public-routes.ts
import type { PublicRoutesConfig } from '@glw907/cairn-cms/delivery';
import { site, siteMeta } from './content.js';
import { cairn, publicMediaResolver, mediaEnabled } from '#theme/cairn.config.js';

export const publicRoutesConfig: PublicRoutesConfig = {
  site,
  render: cairn.rendering.render,
  origin: siteMeta.origin,
  siteName: siteMeta.title,
  description: siteMeta.description,
  defaultImage: siteMeta.origin + '/og/default.png',
  feeds: { rss: siteMeta.origin + '/feed.xml', json: siteMeta.origin + '/feed.json' },
  resolveMedia: publicMediaResolver,
  assetsEnabled: mediaEnabled,
};
```

The catch-all's server module, in its minimal form, calls the factory once and hands two of its functions to SvelteKit:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/(site)/[...path]/+page.server.ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { publicRoutesConfig } from '#chassis/public-routes.js';

export const prerender = true;

const routes = createPublicRoutes(publicRoutesConfig);

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

The scaffold's module also resolves the entry's reference fields in the same load. [Resolve the targets on the entry route](link-content-with-references.md#resolve-the-targets-on-the-entry-route) shows that step. A minimal entry page renders the head, then the body:

<!-- snippet-check-skip: reads the route's generated $types -->
```svelte
<!-- src/routes/(site)/[...path]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';

  let { data }: { data: PageData } = $props();
</script>

<CairnHead seo={data.seo} titleTemplate={(title) => `${title} · Example`} />

<article>
  {@html data.html}
</article>
```

On a scaffolded site, the entry page renders `ArticleView`, and `ArticleView` renders `CairnHead` with the same `seo`.

`entryLoad` answers 404 for a path that no entry claims. Otherwise, the load data carries `entry` with its frontmatter, body, and title, and `html` with the body already run through the site's `render`. It also carries `canonicalUrl` and `seo`, plus `heroImage` when a hero resolves. The canonical URL is the origin plus the entry's permalink, and `og:url` starts from the same origin. The [`EntryData`](../reference/delivery.md#entrydata) entry gives the full shape.

`heroImage` is undefined when no hero is set, media is off, or the `media:` reference doesn't resolve. Where a hero is set, `entry.frontmatter.image.src` keeps the raw token whether or not it resolves. Setting `resolveMedia` alone turns hero resolution on. `assetsEnabled` resolves nothing. When it's on and `resolveMedia` is missing, each `createPublicRoutes` call logs `media.resolver_absent` once.

`CairnHead` applies `titleTemplate` only when `title` is left undefined. An explicit `title`, or `title={false}`, wins over it.

Next, make sure each entry's fields reach that head.

## Declare the fields the head reads

The head reads `description`, `image`, `robots`, and `author` from an entry's frontmatter. It reads `image`, `robots`, and `author` only when the concept's fieldset declares them.

To declare the fields, follow these steps:

1. In the adapter, declare the hero as an image field named `image` with `seo: true`.

   The scaffold declares `image: fields.image({ label: 'Hero image', seo: true })`.

2. If entries set `robots` or `author`, declare each in the same fieldset.
3. In the shared `PublicRoutesConfig`, set `defaultImage` to an image the site serves.

Delivery reads the hero and the social image from the frontmatter key `image`. An `seo` image under another name validates and shows in the editor, but it never reaches the head. A concept marks at most one top-level image `seo: true`. A second one, or one inside an `object` field or an `array` item, throws at `defineFieldset()`.

The scaffold sets `defaultImage` to the origin plus `/og/default.png` and ships no `static/` directory. Its fallback `og:image` answers 404 until you add `static/og/default.png` or change `defaultImage`.

The head falls back in a fixed order when an entry leaves a field empty:

- Description: the frontmatter `description`, else the entry's excerpt, else the config's `description`. The excerpt is the body's plain text, cut at a word boundary near 200 characters.
- Social image: the resolved hero's absolute URL, else a string `image`, else `defaultImage`, each anchored to the origin. `twitter:card` is `summary_large_image` only when an image exists.
- Page type: a dated entry is an `article`, with `article:published_time` and, when `updated` is set, `article:modified_time`. It also carries `article:author` when the entry sets `author`, and the feed links when the config sets `feeds`. An undated entry is a `website`.
- Structured data: one `Article` or `WebSite` JSON-LD object, which never carries the author. To add a richer schema.org type, replace `seo.jsonLd` before `CairnHead` renders it.

With each entry's head complete, give each entry its raw-markdown twin.

## Serve the markdown twin

The markdown twin is a prerendered route beside the catch-all. It serves an entry's stored markdown body, unrendered and without its frontmatter, at the entry's permalink plus `.md`, for each entry not marked `noindex`.

To serve the twin, follow these steps:

1. In `src/params.ts`, define an `md` matcher that accepts a segment ending in `.md`, through SvelteKit's `defineParams`.
2. In the `[...path=md]` route, add a server endpoint that exports `prerender = true`, `entries` from the factory's `markdownEntries`, and a request handler.
3. In that handler, read the body with `routes.markdownLoad({ url })` and return `markdownResponse({ body })`.
4. In the entry page, pass `CairnHead` a `markdownUrl` of the canonical URL plus `.md`.

The scaffold's matcher reads as follows:

<!-- snippet-check-skip: imports SvelteKit's params module, which resolves only inside a SvelteKit app -->
```ts
// src/params.ts
import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
  md: (param) => (param.endsWith('.md') ? param : undefined),
});
```

The twin route builds its functions from the same shared config as the catch-all:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/(site)/[...path=md]/+server.ts
import type { RequestHandler, EntryGenerator } from './$types';
import { createPublicRoutes, markdownResponse } from '@glw907/cairn-cms/delivery';
import { publicRoutesConfig } from '#chassis/public-routes.js';

export const prerender = true;

const routes = createPublicRoutes(publicRoutesConfig);

export const entries: EntryGenerator = () => routes.markdownEntries();

export const GET: RequestHandler = async ({ url }) => {
  const { body } = await routes.markdownLoad({ url });
  return markdownResponse({ body });
};
```

SvelteKit's [route sorting rules](https://svelte.dev/docs/kit/advanced-routing#Sorting) prefer the more specific matched route, so `[...path=md]` takes the `.md` paths and `[...path]` keeps the rest.

An entry whose `robots` field carries `noindex` has no twin. `markdownEntries` skips it, `markdownLoad` answers 404, and the scaffold's entry page passes no `markdownUrl` for it.

> **Note:** `markdownResponse` sets `Content-Type: text/markdown; charset=utf-8`, but `@sveltejs/adapter-cloudflare` doesn't carry a prerendered route's response headers into the build. A local test under `wrangler dev` still served the file with that type, which suggests that Cloudflare derives it from the `.md` extension. No deployed zone has been tested.

Next, mount the route that a preview link opens.

## Mount the draft preview route

An editor shares an unpublished draft through a link to `/preview/<token>`. The route renders the draft with `composeEntryData` from the same shared config, and `entryLoad` runs that function too. A scaffolded site already carries the migration, the route, and the banner page, and the setup command's deploy step applies the migration.

A hand-built site needs an `AUTH_DB` D1 binding and the `PUBLIC_ORIGIN` value from [Name the origin once](#name-the-origin-once). The mint builds each link from `PUBLIC_ORIGIN`.

To mount the route, follow these steps:

1. In the project directory, copy `0003_preview.sql` from the package's `migrations/` into the `migrations_dir` of your `AUTH_DB` binding.
2. In the project directory, apply the migrations with `wrangler d1 migrations apply <database> --remote`, and with `--local` for local development.

   Cloudflare's [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) page covers the other options.

3. In the entry pages' route group, create `preview/[token]/+page.server.ts` exporting `prerender = false` and a load function that returns `loadPreview(runtime, publicRoutesConfig, event)`.
4. In the same directory, create a `+page.svelte` that renders `PreviewBanner` from `@glw907/cairn-cms/public` with `preview={data.preview}`, then your article component.

The scaffold's route module reads as follows. A hand-built site replaces its `#chassis` imports with the matching modules in its tree:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/(site)/preview/[token]/+page.server.ts
import type { PageServerLoad } from './$types';
import { loadPreview } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#chassis/cairn.server.js';
import { publicRoutesConfig } from '#chassis/public-routes.js';
import { withReferences } from '#chassis/entry-data.js';

export const prerender = false;

export const load: PageServerLoad = (event) =>
  loadPreview(runtime, publicRoutesConfig, event).then(withReferences);
```

The scaffold's module also passes the result through `withReferences`, the same reference resolution the entry catch-all applies.

The scaffold's preview page renders the same `ArticleView` as the entry page, with `preview` set:

<!-- snippet-check-skip: imports the scaffold's #theme alias and the route's generated $types -->
```svelte
<!-- src/routes/(site)/preview/[token]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { PreviewBanner } from '@glw907/cairn-cms/public';
  import ArticleView from '#theme/components/ArticleView.svelte';

  let { data }: { data: PageData } = $props();
</script>

<PreviewBanner preview={data.preview} />
<ArticleView {data} preview />
```

With `preview` set, the view leaves out the canonical link, `og:url`, and the twin link.

The route sits in the entry pages' group because the group's layout carries the site's stylesheets and chrome. A route outside the group renders the draft unstyled. A minted link points at `/preview/<token>`, so the route's directory has to be `preview/[token]`.

If the route is prerendered, `loadPreview` throws a build error that names `export const prerender = false`. A prerendered copy would ship a token in a static asset. `loadPreview` strips the canonical link, `og:url`, and `jsonLd.url` from the `seo` it returns.

> **Warning:** A parent layout's load function runs for the preview route too, and `loadPreview` reads no session. Keep privileged values out of any layout the preview shares, or branch on `route.id` in that load function. SvelteKit's [layout data](https://svelte.dev/docs/kit/load#Layout-data) documentation covers how that data reaches child pages.

To check a minted link, follow these steps:

1. In the admin, open an entry.
2. On the entry's edit screen, save an edit.
3. In the entry's **Details** slide-over, in the **Share preview** group, select **Share preview link**.

   The **Preview link** field shows a link on your origin whose path is `/preview/<token>`.

4. In a private browser window, open the link.

   The draft renders in your site's chrome and styles, with the banner above it.

If a mint answers `The preview_tokens table is missing.`, copy and apply `0003_preview.sql` to `AUTH_DB` before you mint again.

[Public preview](../reference/sveltekit.md#public-preview) gives the mint and revoke signatures, and [Log events](../reference/log-events.md) lists the refusal reasons. [Share a draft preview](share-a-draft-preview.md) covers the rest of the feature. It explains how to hide the **Share preview** group, set a link's lifetime, and mint links from a custom admin screen.

Next, publish the posts as feeds.

## Serve the feeds

Each feed route maps a concept's entries to `FeedItem`s and passes them, with a `FeedChannel`, to `rssResponse` or `jsonFeedResponse`.

To serve the feeds, follow these steps:

1. In a shared module, map the posts index's `all()` to `FeedItem`s. A scaffolded site does this in `src/chassis/feed.ts`.
2. In that mapping, render each body with a link resolver that prefixes the origin to the permalink from `createLinkResolver(site)`. A `cairn:` link then becomes an absolute URL.
3. In the `feed.xml` route, add a server endpoint that exports `prerender = true` and returns `rssResponse` with the channel and the items.
4. In the `feed.json` route, do the same with `jsonFeedResponse`.
5. In the shared `PublicRoutesConfig`, set `feeds` to the two feed URLs.

The scaffold's RSS route reads the shared mapping and the site's identity:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/feed.xml/+server.ts
import type { RequestHandler } from './$types';
import { rssResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '#chassis/content.js';
import { buildFeedItems } from '#chassis/feed.js';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const items = await buildFeedItems();
  return rssResponse(
    {
      title: siteMeta.title,
      description: siteMeta.description,
      siteUrl: siteMeta.origin,
      feedUrl: siteMeta.origin + '/feed.xml',
    },
    items,
  );
};
```

Each item carries an origin-anchored `url`, the excerpt as `summary`, and the rendered body as `contentHtml`. A `FeedChannel` is `title`, `description`, `siteUrl`, and `feedUrl`, with optional `language` and `author`. A `FeedItem` needs `title`, `url`, and `summary`, with optional `date`, `updated`, `contentHtml`, and `tags`. [Feeds, sitemap, and robots](../reference/delivery-data.md#feeds-sitemap-and-robots) covers each builder.

The scaffold's mapping also resolves `::include` fragments and makes image URLs absolute. The link resolver throws on a missing target or on one in a concept that isn't routable. A dangling `cairn:` link therefore fails the build.

`feeds` adds `rel="alternate"` links to a dated entry's head and serves nothing. Feed readers fetch the feeds from the two feed routes.

Next, list the site's pages for crawlers in the sitemap.

## Serve the sitemap

The sitemap route passes `sitemapResponse` one `SitemapUrl` per page. Each has a `loc` built from the origin and an optional `lastmod`. The scaffold builds its rows by hand from `site.all()` plus the site root, with `lastmod` taken from `date` alone:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from './$types';
import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
import { site, siteMeta } from '#chassis/content.js';

export const prerender = true;

export const GET: RequestHandler = () => {
  const urls: SitemapUrl[] = [
    { loc: siteMeta.origin + '/' },
    ...site.all().map((s) => ({
      loc: siteMeta.origin + s.permalink,
      ...(s.date ? { lastmod: s.date } : {}),
    })),
  ];
  return sitemapResponse(urls);
};
```

If the sitemap should take `lastmod` from `updated`, or list pages that aren't entries, build the rows with `buildSitemapView`.

To build the rows with `buildSitemapView`, follow these steps:

1. In the `sitemap.xml` route's server endpoint, export `prerender = true`.
2. In the request handler, call `buildSitemapView` with `site`, the descriptors from `buildSiteDescriptors`, the origin, and your other paths as `extraRoutes`.
3. In the same handler, return `sitemapResponse` with the rows.

With the site root and a contact page as `extraRoutes`, the route reads as follows:

<!-- snippet-check-skip: imports the scaffold's #chassis and #theme aliases and the route's generated $types -->
```ts
// src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from './$types';
import { sitemapResponse } from '@glw907/cairn-cms/delivery';
import { buildSiteDescriptors, buildSitemapView } from '@glw907/cairn-cms/delivery/data';
import { site, siteMeta } from '#chassis/content.js';
import { cairn, siteConfig } from '#theme/cairn.config.js';

export const prerender = true;

export const GET: RequestHandler = () =>
  sitemapResponse(
    buildSitemapView(site, buildSiteDescriptors(cairn, siteConfig), siteMeta.origin, ['/', '/contact']),
  );
```

The `extraRoutes` paths come first, with no `lastmod`. Each entry's `lastmod` is its `updated` date, else its `date`. A page that isn't an entry, such as a contact page or a tag index, appears only through `extraRoutes`.

`buildSitemapView`, `buildSiteDescriptors`, `renderJsonLdScript`, and `buildExcerpt` are pure functions on `@glw907/cairn-cms/delivery/data`, and `/delivery` re-exports them. The [`buildSitemapView`](../reference/delivery-data.md#buildsitemapview) entry gives each parameter.

An entry marked `noindex` still gets a row. [Keep noindex entries out of the sitemap and feeds](#keep-noindex-entries-out-of-the-sitemap-and-feeds) shows how to drop it.

Next, point crawlers at the sitemap and keep them out of the admin.

## Serve robots.txt

To serve the file, add one route:

- In the `robots.txt` route's server endpoint, export `prerender = true` and return `robotsResponse` with `sitemapUrl` and `disallow: ['/admin']`.

Without its `posture` line, the scaffold's route reads as follows:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/robots.txt/+server.ts
import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { siteMeta } from '#chassis/content.js';

export const prerender = true;

export const GET: RequestHandler = () =>
  robotsResponse({
    sitemapUrl: siteMeta.origin + '/sitemap.xml',
    disallow: ['/admin'],
  });
```

`robotsResponse` writes `Allow: /` and a `Disallow:` line for each path you pass. Without `/admin` in `disallow`, the file lets a crawler fetch the admin's pages. The admin's sign-in and confirm pages also carry a `noindex, nofollow` robots meta tag.

`robotsResponse` also takes a `posture` option that states a stance toward AI training crawlers. [Pass the posture to the robots route](choose-an-ai-posture.md#pass-the-posture-to-the-robots-route) sets it.

Next, decide whether `noindex` entries belong in the sitemap and feeds.

## Keep noindex entries out of the sitemap and feeds

The index's lists leave drafts out, but an entry whose `robots` field carries `noindex` still appears in the scaffold's sitemap and feeds. Of the public outputs, the head's robots meta tag and the markdown twin read the `robots` field. The sitemap builders and the scaffold's feed mapping ignore it.

To keep `noindex` entries out, follow these steps:

1. In the sitemap route, drop each entry whose `robots` field, read with `readSeoFields`, includes `noindex`.
2. In the feed mapping, drop the same entries.

A helper over the site resolver can make that check for a summary from the sitemap's `site.all()` or from the posts index's `all()`:

<!-- snippet-check-skip: imports the scaffold's #chassis alias -->
```ts
import { readSeoFields, type ContentSummary } from '@glw907/cairn-cms/delivery/data';
import { site } from '#chassis/content.js';

export function isNoindex(summary: ContentSummary): boolean {
  const entry = site.byPermalink(summary.permalink);
  return (readSeoFields(entry?.frontmatter ?? {}).robots ?? '').includes('noindex');
}
```

The `robots` field reaches the frontmatter only when the fieldset declares it, as [Declare the fields the head reads](#declare-the-fields-the-head-reads) shows.

The next sections cover pages that aren't entries, starting with the archive.

## Build the archive

A dated concept's `all()` already returns entries newest first, and the archive route paginates that list without sorting it. In a dated concept, an entry with no date sorts after the dated ones. An undated concept sorts its entries by `title`.

In the scaffold, `ARCHIVE_PAGE_SIZE` in `src/chassis/archive.ts` is 13, and it sets the page size for both the home page and `/archive/[page]`. The home page shows the newest post as its lead, and both routes paginate the posts after it. As a result, `/archive/2` exists only once more than 14 posts are published.

To add the archive, follow these steps:

1. In the `archive/[page]` route's server module, export `prerender = true` and an `entries` generator that lists the real page numbers.
2. In `vite.config.ts`, in the `prerender` option's `handleUnseenRoutes` handler, exempt the archive route by its id.

A corpus that fits on one page gives the archive route no entries, and SvelteKit's crawl check then fails the build. The scaffold exempts `/(site)/archive/[page]` alone, and any other unseen prerenderable route still fails the build. [Crawl rules](scaffolded-site-files.md#crawl-rules) describes the scaffold's handler. SvelteKit's [prerender configuration](https://svelte.dev/docs/kit/configuration#prerender) documents `handleUnseenRoutes`, and its [page options](https://svelte.dev/docs/kit/page-options#entries) document `entries`.

The engine builds no head for the archive.

Next, give pages like the archive a head.

## Give other pages a head

`createPublicRoutes` builds a head only for entry pages. A home, archive, or tag page gets a description, canonical link, or Open Graph tags only when its route builds one. The scaffold's home page sets only a `<title>`.

To give a page a head, follow these steps:

1. In the page's server load function, return the result of `buildSeoMeta` with the page's title, a description, its canonical URL, and the site name.
2. In the page's component, render `CairnHead` with that `seo`.

For a page no entry claims, such as a contact page, the two files read as follows:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/(site)/contact/+page.server.ts
import type { PageServerLoad } from './$types';
import { buildSeoMeta } from '@glw907/cairn-cms/delivery/data';
import { siteMeta } from '#chassis/content.js';

export const prerender = true;

export const load: PageServerLoad = () => ({
  seo: buildSeoMeta({
    title: 'Contact',
    description: 'How to reach us.',
    canonicalUrl: siteMeta.origin + '/contact',
    siteName: siteMeta.title,
  }),
});
```

<!-- snippet-check-skip: reads the route's generated $types -->
```svelte
<!-- src/routes/(site)/contact/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';

  let { data }: { data: PageData } = $props();
</script>

<CairnHead seo={data.seo} />
```

The [`buildSeoMeta`](../reference/delivery-data.md#buildseometa) entry lists every input. A page that writes its JSON-LD script tag itself, without `CairnHead`, serializes it with `renderJsonLdScript`. `buildExcerpt` cuts a description from a markdown body. The `titleTemplate` rule from [Wire the entry pages](#wire-the-entry-pages) applies here too.

A tag page is one such page.

## Add a tag page

A tag page lists one tag's entries with `byTag()` and enumerates its paths with `allTags()`, and both leave drafts out. The concept marks its tag field `taxonomy: true`, and the index reads that field as each entry's tags. [Mark the tag field](define-an-adapter-and-schema.md#mark-the-tag-field) shows the declaration.

To add a tag page, follow these steps:

1. In `src/routes/(site)/tags/[tag]/+page.server.ts`, export `prerender = true` and an `entries` that maps each item of the concept index's `allTags()` to its `tag`.
2. In the same file's load function, return the concept index's `byTag()` for the tag and a head from `buildSeoMeta`.
3. In `src/routes/(site)/tags/[tag]/+page.svelte`, render `CairnHead` and the list of entries.
4. If the sitemap route uses `buildSitemapView`, add each tag page's path to `extraRoutes`.
5. If the sitemap route builds its rows by hand, as the scaffold's does, add one row per tag page. Set each row's `loc` to the origin plus the page's path.
6. If the site may have no tags yet, in `vite.config.ts`, exempt the tag route in `handleUnseenRoutes`, as [Build the archive](#build-the-archive) shows.

The tag page's server module reads as follows:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/(site)/tags/[tag]/+page.server.ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { buildSeoMeta } from '@glw907/cairn-cms/delivery/data';
import { posts, siteMeta } from '#chassis/content.js';

export const prerender = true;

export const entries: EntryGenerator = () => posts.allTags().map(({ tag }) => ({ tag }));

export const load: PageServerLoad = ({ params }) => ({
  tagged: posts.byTag(params.tag),
  seo: buildSeoMeta({
    title: `Tagged ${params.tag}`,
    description: `Posts tagged ${params.tag}.`,
    canonicalUrl: `${siteMeta.origin}/tags/${params.tag}`,
    siteName: siteMeta.title,
  }),
});
```

`allTags()` returns one `{ tag, count }` item per tag that a non-draft entry carries. A tag that only drafts carry gets no page.

Last, let editors change the site's menu.

## Add an editable menu

Declaring `editor.nav` on the adapter turns on the menu editor at `/admin/nav`, and the public layout reads the same menu with `readMenu`.

To add the menu, follow these steps:

1. In the adapter's `editor` group, declare `nav` with `menuName`, `label`, and an optional `maxDepth`, which defaults to 2.
2. If your site config isn't at `src/theme/site.config.yaml`, set `editor.siteConfigPath` to its path.
3. In the site config, under `menus`, add the menu that `menuName` names, as a list of nodes.
4. In a server-only module, read the menu with `readMenu(siteConfig, name, maxDepth)`, passing the `maxDepth` that `editor.nav` declares.
5. In the root `src/routes/+layout.server.ts`, return the menu from its load function.

The scaffold declares `nav: { menuName: 'primary', label: 'Navigation', maxDepth: 2 }`. Its `label` names the nav screen in the admin sidebar. Without `editor.nav`, `/admin/nav` answers 404, and a `navLayout` that references the `nav` screen throws at server start. [Arrange the admin sidebar](arrange-the-admin-sidebar.md) covers the sidebar layout.

The menu editor reads and commits the file that `editor.siteConfigPath` names. The **Settings** screen saves tidy's conventions to the same file. [Let editors change the conventions](turn-on-tidy.md#let-editors-change-the-conventions) covers that screen.

A menu with one link, a group header, and one link under that header reads as follows in the site config:

```yaml
menus:
  primary:
    - label: Home
      url: /
    - label: About
      children:
        - label: Contact
          url: /contact
```

The menu editor and `readMenu` check each menu against the following rules:

- A node is `{ label, url?, children? }`, and a node with no `url` is a group header.
- A label is non-empty and at most 500 characters.
- A URL is at most 2048 characters and starts with `/`, `#`, `http://`, `https://`, `mailto:`, or `tel:`.
- The tree holds at most 200 nodes and nests no deeper than `maxDepth`.
- Any other key is dropped.

`readMenu` returns an empty list for an absent menu and throws a `NavValidationError` on a broken rule.

The scaffold reads its menus once in `src/theme/site-config.ts`. Because the layout load imports that module rather than the full adapter, the load skips the renderer's cost.

The scaffold's `menus.footer` is a flat list outside `/admin/nav`. You edit it in `site.config.yaml` and read it with `readMenu(siteConfig, 'footer', 1)`. The [`readMenu`](../reference/core.md#readmenu) entry gives its signature.

With every route in place, build the site and read what it serves.

## Verify the built routes

A successful build writes each prerendered file with your origin in its absolute URLs.

To check the build, follow these steps:

1. In the project directory, run `npm run build`.

   If the build stops, go to [Diagnose a failed build](#diagnose-a-failed-build).

2. In the project directory, serve the build.

   On a scaffolded site, run `npm run preview`. On another site, serve it with `wrangler dev`. `vite preview` can't serve the output of `@sveltejs/adapter-cloudflare` version 8, a limit that an [open SvelteKit issue](https://github.com/sveltejs/kit/issues/17271) tracks.

3. In a terminal, fetch `/sitemap.xml` from the local server.

   Each `loc` starts with your deployed origin, not the local server's address.

4. In the same terminal, fetch `/feed.xml` and `/feed.json`.

   Each lists the published posts with absolute URLs.

5. In the same terminal, fetch `/robots.txt`.

   It holds a `Disallow:` line for `/admin` and a `Sitemap:` line that names your origin's `/sitemap.xml`.

6. In the same terminal, fetch an entry's twin at its permalink plus `.md`.

   The response is the entry's stored markdown body, unrendered, without its frontmatter.

7. In a browser, open an entry and view its source.

   The canonical link and `og:url` are your origin plus the entry's permalink.

## Diagnose a failed build

The public routes fail the build on content they can't serve, and each failure names its cause in its message.

For build failures outside the public routes, see [Resolve a content build failure](add-cairn-to-a-sveltekit-app.md#resolve-a-content-build-failure). For a failure that no row describes, see [Debug your site](debug-your-site.md).

The following table maps each build message to its cause and its fix.

| Symptom | Cause | Fix |
| --- | --- | --- |
| The build stops with `expected input to be a string or buffer`. | A glob passed to `createSiteIndexes` is lazy, or it lacks `import: 'default'`. The parser then receives a function or a module object instead of the file's text. | Write the glob as [Build one typed index](#build-one-typed-index) shows. |
| The build stops with `cairn: <n> invalid frontmatter field(s):`, then one line per field in the form `<dir>/<id>: <field>: <message>`. | A published entry's frontmatter fails its concept's validation. An invalid draft doesn't fail the build. | Correct the field, or mark the entry `draft: true`. |
| The build stops with `cairn: permalink "<p>" resolves to both "<a>" and "<b>"`. | Two published entries of routable concepts share a permalink. | Change one entry's slug or permalink. |
| The build stops with `cairn: link target "cairn:<concept>/<id>" not found`. | A `cairn:` link in a rendered body points at a missing entry or at a concept that isn't routable. | Correct the link or remove it. |
| SvelteKit stops the build on an unseen prerenderable route. | The route's `entries` returned nothing. An archive route does that when the corpus fits on one page. | Exempt the route by its id in `handleUnseenRoutes`, as [Build the archive](#build-the-archive) shows. |
| The build stops with a `NavValidationError`. | A menu in the site config breaks a node rule. | Correct the node as [Add an editable menu](#add-an-editable-menu) lists. |

With `validate: false` in its fourth argument, `createSiteIndexes` doesn't fail the build on invalid frontmatter. An invalid entry, draft or not, is still left out of the index and listed by the index's `problems()`.

## See also

The following pages cover the reference entries and neighboring guides for these routes:

- [`createPublicRoutes`](../reference/delivery.md#createpublicroutes): the entry factory and its config.
- [Delivery data](../reference/delivery-data.md): the feed, sitemap, robots, and SEO builders.
- [Choose an AI posture](choose-an-ai-posture.md): the robots route's `posture` option.
- [Act on newly published entries](act-on-newly-published-entries.md): announcing entries after a deploy.
- [Turn on tidy](turn-on-tidy.md): the other screen that writes the site config.
- [Configure media](configure-media.md): hero and body images on public pages.
- [Theme your public site](theme-your-public-site.md): the look of the routes this page wires.
- [Scaffolded site files](scaffolded-site-files.md): every file the scaffold writes, the admin's included.
- [Share a draft preview](share-a-draft-preview.md): the preview link's lifecycle and options.
- [Security model](security-model.md): what a preview link exposes.
