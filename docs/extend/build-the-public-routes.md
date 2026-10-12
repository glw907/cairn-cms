# Build the public routes

A cairn site's public side is a set of routes in the site's SvelteKit app. The entry pages and
their raw-markdown twins, the archive, the RSS and JSON feeds, the sitemap, and `robots.txt` are
each a few lines around a function the engine exports. The app builds with
`@sveltejs/adapter-cloudflare` into the site's one Worker. The routes prerender: at build time
they read the markdown in the commit being deployed and write each page and file, and no public
request reads the GitHub repository. Every route reads the same two inputs: one typed
index of the content, built by `createSiteIndexes`, and one origin literal. Because the
build runs the routes, the origin is written into every canonical URL, feed, and sitemap row, and it
has to name the deployed origin before a production build.

A scaffolded site already has every route this page covers except a tag page. Its developer
arrives to learn what each route does and where to change it, starting with the origin, which the
scaffold ships as a placeholder. A site built through
[Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) has the index and the entry route
from that tutorial's [Render the entry](add-cairn-to-a-sveltekit-app.md#render-the-entry) step, and
it gains the rest here. You build the index and the origin, compose one `PublicRoutesConfig`, and wire
the entry pages and their twins, the feeds, the sitemap, `robots.txt`, the archive, a tag page, and
the public menu behind the admin's `nav` screen, then read the prerendered files after a build.

Two engine limits apply to every site: the engine builds a head only for entry pages, and it takes the
hero and the share image only from a frontmatter field named `image`, whatever image field a
concept marks for SEO.
[Give other pages a head](#give-other-pages-a-head) and
[Declare the fields the head reads](#declare-the-fields-the-head-reads) cover those limits, and
[Diagnose a failed build](#diagnose-a-failed-build) covers a build that stops on content.

This page assumes you know SvelteKit routing, including rest parameters, param matchers, route
groups, server endpoints, and layout loads, along with its prerendering exports and Vite's glob
imports. Beyond the adapter that declares your site's concepts, it assumes no cairn knowledge. It
leaves out the following topics, each with the page that covers it:

- A stance toward AI training crawlers: [Choose an AI posture](choose-an-ai-posture.md).
- The draft preview route: [Share a draft preview](share-a-draft-preview.md).
- Announcing newly published entries, as opposed to the feeds that subscribers pull:
  [Act on newly published entries](act-on-newly-published-entries.md).
- Resolving `media:` images:
  [Resolve media on public pages](configure-media.md#resolve-media-on-public-pages).
- Styling the pages: [Theme your public site](theme-your-public-site.md).
- Arranging the admin's sidebar, which shares the word "nav":
  [Arrange the admin sidebar](arrange-the-admin-sidebar.md).

## Before you begin

The public routes read your adapter and your parsed site config, and they prerender on a SvelteKit
site built with `@sveltejs/adapter-cloudflare`. Before you start, your site needs the following:

- An adapter that declares the site's concepts, at `src/theme/cairn.config.ts` on a scaffolded
  site and at `src/lib/cairn.config.ts` on the add-cairn tutorial's site.
  [Define an adapter and schema](define-an-adapter-and-schema.md) covers it.
- A site config, parsed as the [site config reference](../reference/core.md#parsesiteconfig)
  describes.
- A SvelteKit site on `@sveltejs/adapter-cloudflare`. A scaffolded site has one, and
  [Deploy a bare SvelteKit site](add-cairn-to-a-sveltekit-app.md#deploy-a-bare-sveltekit-site)
  sets one up from scratch.
- Optionally, for hero images, a media resolver, which
  [Resolve media on public pages](configure-media.md#resolve-media-on-public-pages) sets up.

With those in place, start from a map of the files.

## Lay out the route files

Every public route is a file under `src/routes/`, and on a scaffolded site the modules they share
sit in `src/chassis/`. The scaffold's public files are as follows:

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
    │   ├── +page.svelte
    │   ├── [...path]/
    │   ├── [...path=md]/
    │   └── archive/[page]/
    ├── feed.json/
    ├── feed.xml/
    ├── robots.txt/
    └── sitemap.xml/
```

Each file belongs to one section of this page:

- `src/chassis/content.ts` builds the index and holds the origin, as
  [Build one typed index](#build-one-typed-index) and [Name the origin once](#name-the-origin-once)
  show.
- `src/chassis/public-routes.ts` holds the shared `PublicRoutesConfig` that
  [Wire the entry pages](#wire-the-entry-pages) composes.
- `(site)/[...path]` is the entry catch-all, also in [Wire the entry pages](#wire-the-entry-pages).
- `(site)/[...path=md]` and `src/params.ts` serve the twin in
  [Serve the markdown twin](#serve-the-markdown-twin).
- `feed.xml/`, `feed.json/`, and `src/chassis/feed.ts` serve the feeds in
  [Serve the feeds](#serve-the-feeds).
- `sitemap.xml/` serves the sitemap in [Serve the sitemap](#serve-the-sitemap).
- `robots.txt/` serves the crawl rules in [Serve robots.txt](#serve-robotstxt).
- `(site)/archive/[page]/` serves the archive in [Build the archive](#build-the-archive).
- `(site)/+page.svelte` is the home page, which [Give other pages a head](#give-other-pages-a-head)
  covers.
- The root `src/routes/+layout.server.ts` returns the menu in
  [Add an editable menu](#add-an-editable-menu).

The tree leaves out the admin's routes and the scaffold's other public routes. The
`preview/[token]/` route under `(site)/` serves draft previews, which
[Share a draft preview](share-a-draft-preview.md) covers.
[Routes and the server hook](scaffolded-site-files.md#routes-and-the-server-hook) lists every
scaffold route, the admin's included.

On the add-cairn tutorial's site, the same modules and routes sit where that tutorial put them.
[Index the content and commit its manifest](add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest)
writes the content module, and [Render the entry](add-cairn-to-a-sveltekit-app.md#render-the-entry)
writes the entry route. Where a section names a scaffold path, use the matching file in your tree.

Start with the content module.

## Build one typed index

`createSiteIndexes` builds one typed index per concept from one literal `import.meta.glob` per
concept, and every public route reads through it. Vite needs each glob pattern written
literally at the call site, so the globs can't be generated in a loop over the concept list.

To build the index, make one call:

- In the content module (`src/chassis/content.ts` on a scaffolded site), pass `createSiteIndexes`
  the adapter, the site config, and one raw, eager glob per concept.

The scaffold's content module makes the call with one glob for each of its three concepts:

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

The result holds one index per concept, keyed by concept id, plus `site`, the cross-concept
resolver. Because `site` is reserved, no concept can be named `site`. A lazy glob, or one without
`query: '?raw'` and `import: 'default'`, fails the build with the message that
[Diagnose a failed build](#diagnose-a-failed-build) lists. The site config doesn't change the
indexes, and `createSiteIndexes` takes it anyway, so pass the parsed config.

Each index's `all()` already returns entries in the engine's order, which
[Build the archive](#build-the-archive) relies on. `all()` and `byTag()` leave out an entry marked
`draft: true` unless called with `{ includeDrafts: true }`, and `allTags()` and `adjacent()` always
leave it out. Because the resolver builds its permalink lookup from `all()`, a draft never resolves
or prerenders. `byId` still returns a draft. A route that looks an entry up by id checks the entry's
`draft` field itself.

Next, name the origin every absolute URL starts from.

## Name the origin once

Keep the site's origin in one string literal with no trailing slash, and set it to the deployed
origin before a production build. The engine accepts any string as `origin`. A literal is
the recommended form because it keeps the origin the same on every build, locally and in CI. A site
with several environments commits a config for each one rather than branching the literal on an
environment variable.

The engine joins the origin and a leading-slash path without normalizing, so a trailing slash
doubles the slash in every canonical URL and sitemap `loc`. Because the prerendered routes run at
build time, the literal is written into every canonical URL, `og:url`, feed, and sitemap.

To set the origin, follow these steps:

1. In the content module, set the origin literal to your deployed origin, replacing the
   scaffold's placeholder `'https://showcase.test'`.
2. In `wrangler.jsonc`, set `PUBLIC_ORIGIN` to the same origin.

   The build reads the literal, and the Worker reads `PUBLIC_ORIGIN` as its runtime value for the
   same origin. The scaffold ships it as `http://localhost:4173`.

The scaffold composes `siteMeta` once from the literal, with `title`, `description`, and `origin`.
Its feeds, sitemap, and robots route read that object.

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

With the index and the origin defined, wire the entry pages.

## Wire the entry pages

`createPublicRoutes` turns the index and the origin into the entry catch-all's `entries`, which
lists every routable entry for the prerenderer, and `entryLoad`, which loads one.

To wire the entry pages, follow these steps:

1. In a module of its own (`src/chassis/public-routes.ts` on a scaffolded site), export one
   `PublicRoutesConfig` with `site`, `render`, `origin`, `siteName`, and `description`.
2. In `src/routes/(site)/[...path]/+page.server.ts`, export `prerender = true`, the factory's
   `entries`, and a load that returns the result of `entryLoad`.
3. In the same directory's `+page.svelte`, render `CairnHead` with `seo={data.seo}`, then the
   entry's `html`.

The config module needs only those five members. Later sections add `defaultImage` and `feeds`.

<!-- snippet-check-skip: imports the scaffold's #theme alias, which resolves only inside a scaffolded site -->
```ts
// src/chassis/public-routes.ts
import type { PublicRoutesConfig } from '@glw907/cairn-cms/delivery';
import { site, siteMeta } from './content.js';
import { cairn } from '#theme/cairn.config.js';

export const publicRoutesConfig: PublicRoutesConfig = {
  site,
  render: cairn.rendering.render,
  origin: siteMeta.origin,
  siteName: siteMeta.title,
  description: siteMeta.description,
};
```

The catch-all's server module calls the factory once and hands its two functions to SvelteKit:

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

To resolve reference fields in the same load, see
[Resolve the targets on the entry route](link-content-with-references.md#resolve-the-targets-on-the-entry-route).
The page component renders the head, then the entry's body:

<!-- snippet-check-skip: reads the route's generated $types -->
```svelte
<!-- src/routes/(site)/[...path]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';
  import { readSeoFields } from '@glw907/cairn-cms/delivery/data';

  let { data }: { data: PageData } = $props();
</script>

<CairnHead
  seo={data.seo}
  markdownUrl={readSeoFields(data.entry.frontmatter).robots?.includes('noindex')
    ? undefined
    : data.canonicalUrl + '.md'}
  titleTemplate={(title) => `${title} · Example`}
/>

<article>
  {@html data.html}
</article>
```

Your entry page renders from the data that `entryLoad` returns. For a path that no entry claims,
`entryLoad` answers 404. Otherwise the data carries `entry` with its frontmatter, body, and title, and
`html` with the body already run through the site's `render`. It also carries `canonicalUrl` and
`seo`. The canonical URL is the origin plus the entry's permalink, and the same origin anchors
`og:url`. The [`EntryData`](../reference/delivery.md#entrydata) entry gives the full shape.

The hero arrives as `heroImage`, which is undefined when no hero is set, media is off, or the
`media:` reference doesn't resolve. Whether or not the hero resolves, `entry.frontmatter.image.src` stays the raw token.
Setting `resolveMedia` alone turns hero resolution on. `assetsEnabled` only makes the engine log
`media.resolver_absent` once when `resolveMedia` is missing. Both are members of the shared
`PublicRoutesConfig`, where the scaffold sets `assetsEnabled` from its media config's `enabled` flag.
[Resolve media on public pages](configure-media.md#resolve-media-on-public-pages) builds the
resolver.

`CairnHead` applies `titleTemplate` only when `title` is left undefined. An explicit `title`, or
`title={false}`, wins.

Next, make sure each entry's fields reach that head.

## Declare the fields the head reads

The head reads `description`, `image`, `robots`, and `author` from the frontmatter, and it reads
the last three only when the concept's fieldset declares them.

To give the head every field it reads, follow these steps:

1. In the adapter, declare the hero as an image field named `image` with `seo: true`.

   The scaffold declares `image: fields.image({ label: 'Hero image', seo: true })`.
   Delivery reads the hero and the social image only from the frontmatter key `image`, whatever
   image field the concept marks `seo: true`. An `seo` image under another name validates and
   shows in the editor, but it never reaches the head. A concept may mark one top-level image
   `seo: true`. `defineFieldset` throws on a second one, or on one inside an `object` field or an
   `array` item.

2. If entries set `robots` or `author`, declare each in the same fieldset.
3. In the shared `PublicRoutesConfig`, set `defaultImage` to the URL of an image the site serves.

   A scaffolded site already points `defaultImage` at `/og/default.png` under its origin, but the
   scaffold ships no `static/` directory and no such file. Until you add
   `static/og/default.png`, the scaffold's fallback `og:image` answers 404.

The head falls back in a fixed order when an entry leaves a field empty.

- Description: the frontmatter `description`, else the entry's excerpt, else the config's
  `description`. The excerpt is the body's stripped text, cut at a word boundary near 200
  characters.
- Social image: the resolved hero's absolute URL, else a string `image`, else `defaultImage`, each
  anchored to the origin. `twitter:card` is `summary_large_image` only when an image exists, and
  `twitter:image:alt` is the hero's alt when it has one.
- Page type: a dated entry is an `article` with `article:published_time`, `article:author`, the
  feed alternate links, and `article:modified_time` when `updated` is set. An undated entry is a
  `website`.
- JSON-LD: one `Article` or `WebSite` object, which never carries the author.

To add a richer schema.org type, replace `seo.jsonLd` before `CairnHead` renders it.

With the entry pages complete, give each one its raw-markdown twin.

## Serve the markdown twin

The markdown twin serves each entry's stored markdown, unrendered, at the entry's permalink
followed by `.md`, from a prerendered route beside the catch-all.

To serve the twin, follow these steps:

1. In `src/params.ts`, use SvelteKit's `defineParams` to define an `md` matcher that accepts a
   segment ending in `.md`.
2. In the `(site)/[...path=md]` route's `+server.ts`, export `prerender = true` and `entries` from
   the factory's `markdownEntries`.
3. In the same file, add a request handler that returns `markdownResponse({ body })` with the body
   from `markdownLoad`.
4. In the entry page, pass `CairnHead` a `markdownUrl` of the canonical URL plus `.md`.

<!-- snippet-check-skip: imports SvelteKit's params module, which resolves only inside a SvelteKit app -->
```ts
// src/params.ts
import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
  md: (param) => (param.endsWith('.md') ? param : undefined),
});
```

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

SvelteKit prefers the more specific matched route, so `[...path=md]` takes the `.md` paths and
`[...path]` keeps every other one. SvelteKit's
[route sorting rules](https://svelte.dev/docs/kit/advanced-routing#Sorting) set that precedence.

An entry whose `robots` field carries `noindex` has no twin: `markdownEntries` skips it and
`markdownLoad` answers 404. For such an entry, pass no `markdownUrl`, and `CairnHead` leaves the link
out.

> **Note:** `markdownResponse` sets `Content-Type: text/markdown; charset=utf-8`, but `@sveltejs/adapter-cloudflare` doesn't carry a prerendered route's response headers into the build.
> Under `wrangler dev`, the file still arrives as `text/markdown; charset=utf-8`, apparently because Cloudflare derives the type from the `.md` extension.
> That was measured locally, not on a deployed zone.

Next, publish the posts as feeds.

## Serve the feeds

Each feed route maps a concept's entries to `FeedItem`s and passes them, with a `FeedChannel`, to
`rssResponse` or `jsonFeedResponse`.

To serve the feeds, follow these steps:

1. In a shared module (`src/chassis/feed.ts` on a scaffolded site), map the posts index's `all()`
   to `FeedItem`s.

   Give each item an origin-anchored URL, the excerpt as `summary`, and the rendered body as
   `contentHtml`.

2. In that mapping, render each body with the adapter's `rendering.render`, passing `resolve`,
   `resolveMedia`, and `resolveFragment` as the scaffold's mapping below does.
3. In `src/routes/feed.xml/+server.ts`, export `prerender = true` and return `rssResponse` with the
   channel and the items.
4. In `src/routes/feed.json/+server.ts`, do the same with `jsonFeedResponse`.
5. In the shared `PublicRoutesConfig`, set `feeds` to the two feed URLs.

   `feeds` only adds `rel="alternate"` links to a dated entry's head, and it serves no feed.
   Readers fetch the feeds from the two feed routes.

The scaffold's `src/chassis/feed-items.ts` builds the three resolvers from the site and the origin,
then renders each post:

<!-- snippet-check-skip: an excerpt of the scaffold's feedItemsFrom, whose site, origin, render, resolveMedia, and posts it elides -->
```ts
// src/chassis/feed-items.ts
const toPermalink = createLinkResolver(site);
const resolve = (ref: Parameters<typeof toPermalink>[0]) => origin + toPermalink(ref);
const resolveFragment = createFragmentResolver(site);
const resolveAbsoluteMedia: MediaResolve = (ref) => {
  const url = resolveMedia(ref);
  return url === undefined ? undefined : new URL(url, origin).href;
};
return Promise.all(
  posts.all().map(async (p) => ({
    title: p.title,
    url: origin + p.permalink,
    date: p.date,
    summary: p.excerpt,
    contentHtml: await render({
      body: posts.byId(p.id)!.body,
      resolve,
      resolveMedia: resolveAbsoluteMedia,
      resolveFragment,
    }),
    tags: p.tags,
  })),
);
```

`resolve` turns a `cairn:` link into an absolute URL, `resolveMedia` does the same for a `media:`
image, and `resolveFragment` returns the markdown of the fragment an `::include` names. A feed
reader then shows each fragment's text and a working image.

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

A `FeedChannel` is `title`, `description`, `siteUrl`, and `feedUrl`, with optional `language` and
`author`. A `FeedItem` needs `title`, `url`, and `summary`, with optional `date`, `updated`,
`contentHtml`, and `tags`. [Feeds, sitemap, and robots](../reference/delivery-data.md#feeds-sitemap-and-robots)
covers each builder.

A dangling `cairn:` link fails the build: the
link resolver throws when the target is missing or belongs to a non-routable concept.

Next, list every entry page in the sitemap.

## Serve the sitemap

The sitemap route passes `sitemapResponse` one `SitemapUrl` per page, each a `loc` built from the
origin and an optional `lastmod`. The scaffold builds its rows by hand from `site.all()` plus the
site root, with `lastmod` taken from `date` alone.

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

To serve the sitemap, follow these steps:

1. In `src/routes/sitemap.xml/+server.ts`, export `prerender = true`.
2. If the sitemap should take `lastmod` from `updated` or list pages that aren't entries, build the
   rows with `buildSitemapView`.
3. If you use `buildSitemapView`, pass the index `site`, the descriptors from
   `buildSiteDescriptors(cairn, siteConfig)`, the origin, and your other paths as `extraRoutes`.
4. In the route's request handler, return `sitemapResponse` with the rows.

The `buildSitemapView` form, with the site root and one more page, reads as follows:

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
    buildSitemapView(site, buildSiteDescriptors(cairn, siteConfig), siteMeta.origin, ['/', '/about']),
  );
```

The `extraRoutes` paths come first, with no `lastmod`, and each entry's `lastmod` is its `updated` date, else
its `date`. In the `buildSitemapView` form, a page that isn't an entry appears only through
`extraRoutes`. Both builders are pure functions on `@glw907/cairn-cms/delivery/data`, as are
`renderJsonLdScript` and `buildExcerpt`. The [`buildSitemapView`](../reference/delivery-data.md#buildsitemapview)
entry gives each parameter.

An entry marked `noindex` still gets a row, as
[Keep noindex entries out of the sitemap and feeds](#keep-noindex-entries-out-of-the-sitemap-and-feeds)
explains.

Next, point crawlers at the sitemap and keep them out of the admin.

## Serve robots.txt

The robots route returns `robotsResponse` with the sitemap's URL and `disallow: ['/admin']`.

To serve the file, add one route:

- In `src/routes/robots.txt/+server.ts`, export `prerender = true` and return
  `robotsResponse({ sitemapUrl, disallow: ['/admin'] })`.

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

A site that leaves out `/admin` lets a crawler index its sign-in page. `robotsResponse` also takes a
`posture` option that states a stance toward AI training crawlers.
[Pass the posture to the robots route](choose-an-ai-posture.md#pass-the-posture-to-the-robots-route)
sets it.

Next, decide whether noindex entries belong in the sitemap and feeds.

## Keep noindex entries out of the sitemap and feeds

A draft never reaches the sitemap or the feeds, but an entry whose `robots` field carries `noindex` still
appears in the sitemap and both feeds. [Build one typed index](#build-one-typed-index) sets out the
draft rules. Only the head's robots meta tag and the markdown twin read the `robots` field.

To keep `noindex` entries out, filter them in both places:

- In the sitemap route and the feed mapping, skip each entry whose `robots` field, read with
  `readSeoFields`, includes `noindex`.

A helper over the concept index can make that check:

<!-- snippet-check-skip: imports the scaffold's #chassis alias -->
```ts
import { readSeoFields } from '@glw907/cairn-cms/delivery/data';
import { posts } from '#chassis/content.js';

export function isNoindex(id: string): boolean {
  const entry = posts.byId(id);
  return (readSeoFields(entry?.frontmatter ?? {}).robots ?? '').includes('noindex');
}
```

The `robots` field reaches the frontmatter only when the fieldset declares it, as
[Declare the fields the head reads](#declare-the-fields-the-head-reads) shows.

The next sections cover pages that aren't entries, starting with the archive.

## Build the archive

An archive reads a dated concept's `all()`, which already returns entries newest first, so the
route paginates the list without sorting it. An undated entry sorts last, and an undated concept
sorts by `title`.

The scaffold's `src/chassis/archive.ts` sets `ARCHIVE_PAGE_SIZE` to 13 for both the home page and
`/archive/[page]`. Both paginate every post after the newest, which the home page shows as its lead.
As a result, `/archive/2` exists only once more than 14 posts are published.

To build the archive, follow these steps:

1. In `src/routes/(site)/archive/[page]/+page.server.ts`, export `prerender = true` and an
   `entries` generator that lists the real page numbers.
2. In `vite.config.ts`, in the `prerender` option's `handleUnseenRoutes` handler, exempt the
   archive route by its id.

   A corpus that fits on one page gives the route no entries, and SvelteKit's crawl check would
   otherwise fail the build.

The scaffold exempts `/(site)/archive/[page]` and nothing else, and any other unseen prerenderable
route still fails the build. [Crawl rules](scaffolded-site-files.md#crawl-rules) describes the scaffold's
handler, and SvelteKit's [Vite plugin reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite)
documents the option. Like the home page, the archive gets no SEO head from the engine.

Next, give pages like the archive a head.

## Give other pages a head

`createPublicRoutes` builds a head only for entry pages. A home, archive, or tag page gets a
description, canonical link, or Open Graph tags only when your route builds one. The scaffold's home
page sets only a `<title>`.

To give a page a head, follow these steps:

1. In the page's server load, return the result of `buildSeoMeta` with the page's title, a
   description, its canonical URL, and the site name.

   The canonical URL is the origin plus the page's path.

2. In the page's component, render `CairnHead` with that `seo`.

For an about page, the two files read as follows:

<!-- snippet-check-skip: imports the scaffold's #chassis alias and the route's generated $types -->
```ts
// src/routes/(site)/about/+page.server.ts
import type { PageServerLoad } from './$types';
import { buildSeoMeta } from '@glw907/cairn-cms/delivery/data';
import { siteMeta } from '#chassis/content.js';

export const prerender = true;

export const load: PageServerLoad = () => ({
  seo: buildSeoMeta({
    title: 'About',
    description: 'Who we are and how to reach us.',
    canonicalUrl: siteMeta.origin + '/about',
    siteName: siteMeta.title,
  }),
});
```

<!-- snippet-check-skip: reads the route's generated $types -->
```svelte
<!-- src/routes/(site)/about/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery/head';

  let { data }: { data: PageData } = $props();
</script>

<CairnHead seo={data.seo} />
```

The [`buildSeoMeta`](../reference/delivery-data.md#buildseometa) entry lists every input. A page that
writes its own `<script>` in place of `CairnHead` serializes its JSON-LD with `renderJsonLdScript`.
`buildExcerpt` cuts a description from a markdown body. The `titleTemplate` rule from
[Wire the entry pages](#wire-the-entry-pages) applies here too.

A tag page is one such page.

## Add a tag page

A tag page lists one tag's entries with `byTag()` and enumerates its paths with `allTags()`, and
both leave drafts out. This section assumes the concept marks its tag field `taxonomy: true`, as
[Mark the tag field](define-an-adapter-and-schema.md#mark-the-tag-field) shows.

To add a tag page, follow these steps:

1. In `src/routes/(site)/tags/[tag]/+page.server.ts`, export `prerender = true` and an `entries`
   that maps the concept index's `allTags()` to `{ tag }`.
2. In the same file's load, return `byTag(params.tag)` and a head from `buildSeoMeta`.
3. In `src/routes/(site)/tags/[tag]/+page.svelte`, render `CairnHead` and the list of entries.
4. If the sitemap route uses `buildSitemapView`, add each tag page's path to `extraRoutes`.
5. If the sitemap route builds rows by hand like the scaffold's, add a row per tag page with `loc`
   set to the origin plus its path.
6. If the site may have no tags yet, in `vite.config.ts`, exempt the tag route in
   `handleUnseenRoutes` the same way as the archive.

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

Because `allTags()` always leaves drafts out, a tag that only a draft carries gets no page.

Last, let editors change the site's menu.

## Add an editable menu

Declaring `editor.nav` on the adapter turns on the menu editor at `/admin/nav`, and the public
layout reads the same menu with `readMenu`.

To add the menu, follow these steps:

1. In the adapter's `editor` group, declare `nav` with `menuName`, `label`, and an optional
   `maxDepth`, which is 2 when unset.

   The scaffold declares `nav: { menuName: 'primary', label: 'Navigation', maxDepth: 2 }`. The
   `label` names the nav screen in the admin sidebar. Without `editor.nav`, `/admin/nav` answers 404,
   and a `navLayout` that references the `nav` screen throws at server start.
   [Arrange the admin sidebar](arrange-the-admin-sidebar.md) covers the sidebar.

2. If your site config isn't at `src/theme/site.config.yaml`, set `editor.siteConfigPath` to its
   path.

   The menu editor reads and commits that file, and the **Settings** screen saves tidy's conventions
   to the same file. For the default and every reader of the file, see the
   [`siteConfigPath` reference entry](../reference/core.md#siteconfigpath-adapter-editor-member).

3. In the site config, under `menus`, add the menu that `menuName` names as a list of nodes.
4. In a module the layout load imports, read the menu with `readMenu(siteConfig, name, maxDepth)`,
   passing the `maxDepth` that `editor.nav` declares.
5. In the root `src/routes/+layout.server.ts`, return the menu from the `load`.

The scaffold reads its menus once in `src/theme/site-config.ts`. The layout load imports that lean
module, not the full adapter, so it skips the renderer's cost on every request.

A menu with a group header and one link under it reads as follows in the site config:

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

A menu node follows these rules:

- A node is `{ label, url?, children? }`, and a node with no `url` is a group header.
- A label is non-empty and at most 500 characters.
- A URL is at most 2048 characters and starts with `/`, `#`, `http(s)://`, `mailto:`, or `tel:`.
- The tree holds at most 200 nodes and nests no deeper than `maxDepth`.
- Any other key is dropped.

`readMenu` returns an empty list for an absent menu and throws a `NavValidationError` on any
violation. Only the menu that `menuName` names is editable at `/admin/nav`. The scaffold's
`menus.footer` is a flat list that the developer edits in `site.config.yaml`, read with
`readMenu(siteConfig, 'footer', 1)`. The [`readMenu`](../reference/core.md#readmenu) entry gives its
signature.

With every route in place, build the site and read what it serves.

## Verify the built routes

Build the site, serve the build, and check that each prerendered file carries your origin.

To check the build, follow these steps:

1. In the project directory, run `npm run build`.

   If the build stops, see [Diagnose a failed build](#diagnose-a-failed-build).

2. In the project directory of a scaffolded site, run `npm run preview` to serve the build.

   On any other site, serve it with `wrangler dev`, because `vite preview` can't serve
   `@sveltejs/adapter-cloudflare` 8 output.

3. In a terminal, fetch `/sitemap.xml` from the preview address.

   Every `loc` starts with your origin literal, not the preview's address. On an unedited scaffold,
   that origin is `https://showcase.test`.

4. From the preview address, fetch `/feed.xml` and `/feed.json`.

   Each lists the published posts with absolute URLs.

5. From the preview address, fetch `/robots.txt`.

   The file has a `Disallow: /admin` line and a sitemap line that names your origin's
   `/sitemap.xml`.

6. From the preview address, request an entry's twin and read its response headers.

   The `Content-Type` header is `text/markdown; charset=utf-8`.

7. In a browser, view the source of an entry page.

   The canonical link and `og:url` are your origin plus the entry's permalink.

If the build stops, its message names the cause.

## Diagnose a failed build

The public routes fail the build on content they can't serve, and each failure names its cause in
the error. For a concept with no glob or a manifest that has drifted, see
[Resolve a content build failure](add-cairn-to-a-sveltekit-app.md#resolve-a-content-build-failure).
For the logs, see [Debug your site](debug-your-site.md).

The following table maps each build message to its cause and its fix.

| Build message | Cause | Fix |
| --- | --- | --- |
| `expected input to be a string or buffer` | A glob is lazy, or it lacks `query: '?raw'` and `import: 'default'`. | Write the glob as [Build one typed index](#build-one-typed-index) shows. |
| One line per invalid field, each `<dir>/<id>: <field>: <message>` | A published entry's frontmatter fails its concept's validation. | Fix the field, or mark the entry `draft: true`, since an invalid draft never fails the build. |
| `permalink "<p>" resolves to both "<a>" and "<b>"` | Two published entries share a permalink. | Change one entry's slug or permalink. |
| An error thrown by the link resolver | A `cairn:` link in a rendered body points at a missing entry or a non-routable concept. | Fix or remove the link. |
| An unseen-route error that names a prerenderable route | The route's `entries` returned nothing. | Exempt the route as [Build the archive](#build-the-archive) shows. |
| `NavValidationError` | A menu in the site config breaks a node rule. | Fix the node as [Add an editable menu](#add-an-editable-menu) lists. |

Every invalid entry, draft or not, is left out of the index and listed by the index's
`problems()`. To skip the validation, pass `createSiteIndexes` the option `{ validate: false }`.

## See also

The following pages cover the pieces this page links to.

- [Delivery reference](../reference/delivery.md): `createPublicRoutes`, `PublicRoutesConfig`,
  `EntryData`, and `CairnHead`.
- [Delivery data reference](../reference/delivery-data.md): the index, feed, sitemap, robots, and
  SEO builders.
- [Choose an AI posture](choose-an-ai-posture.md): the robots route's `posture` option.
- [Share a draft preview](share-a-draft-preview.md): the draft preview route.
- [Act on newly published entries](act-on-newly-published-entries.md): announcing entries after a
  deploy.
- [Configure media](configure-media.md): hero and body images on public pages.
- [Theme your public site](theme-your-public-site.md): styling the routes this page wires.
- [Scaffolded site files](scaffolded-site-files.md): every scaffold file, the admin's included.
