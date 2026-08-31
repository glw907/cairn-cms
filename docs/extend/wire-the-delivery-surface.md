# Wire the delivery surface

**Contract:** build the public routes a site is expected to carry: the entry catch-all, its
raw-markdown twin, the feed, the sitemap, and `robots.txt`.

**Precondition:** an adapter with at least one concept declared, from [Define an adapter and
schema](./define-an-adapter-and-schema.md).

[Build a site by hand](./build-a-site-by-hand.md) already wires the entry catch-all as its third
milestone. This page covers that route again briefly for context, then the four surfaces most
sites add on top: the markdown twin, the feed, the sitemap, and `robots.txt`.

## The content index

Every delivery route reads through one typed index, built once from your raw markdown globs:

```ts
// src/lib/content.ts
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from './cairn.config.js';

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const indexes = createSiteIndexes(cairn, siteConfig, { posts: postsRaw });
export const site = indexes.site;
export const posts = indexes.posts;
export const ORIGIN = 'https://your-domain.example';
```

Vite needs the literal glob pattern at the call site, so this can't be looped over your concept
list programmatically; one glob per concept, by name.

Every route below, the entry catch-all, the markdown twin, the feed, and the sitemap, reads `ORIGIN`
from this one place rather than each resolving its own. Keep it a literal, not an environment
variable read at build or request time: a visual-regression suite that renders a page and compares
it against a committed baseline needs the same origin on every run, in CI and on your own machine
alike, and a value that can change per environment breaks that determinism. If you deploy the same
site to more than one environment (a preview and a production domain, say), give each its own
committed config rather than branching `ORIGIN` on an environment variable.

## The entry catch-all

```ts
// src/routes/(site)/[...path]/+page.server.ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content.js';
import { cairn, siteConfig } from '$lib/cairn.config.js';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: siteConfig.description,
});

export const entries: EntryGenerator = () => routes.entries();
export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

`entryLoad` resolves one entry by request path, throwing a 404 on a miss; `entries` enumerates
every routable entry for the prerenderer. [`/delivery`](../reference/delivery.md#createpublicroutes)
documents `EntryData`'s full shape and the `CairnHead` component that renders its SEO head.

## The markdown twin, and the `.md` route shape

`markdownEntries`/`markdownLoad`, the same factory's other pair, build a raw-markdown twin of
every routable, non-`noindex` entry: a second URL, `.md`-suffixed, that serves the entry's stored
body unrendered.

```ts
// src/params/md.ts
import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => param.endsWith('.md');
```

```ts
// src/routes/(site)/[...path=md]/+server.ts
import { createPublicRoutes, markdownResponse } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content.js';
import { cairn, siteConfig } from '$lib/cairn.config.js';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: siteConfig.description,
});

export const entries = () => routes.markdownEntries();

export const GET = async ({ url }: { url: URL }) => {
  const { body } = await routes.markdownLoad({ url });
  return markdownResponse({ body });
};
```

The two catch-alls coexist with no collision: `[...path=md]` is a rest route with a **param
matcher**, `=md`, that claims only segments ending in `.md`, and SvelteKit resolves the more
specific matched route ahead of the plain `[...path]` catch-all for any request that satisfies
it. Everything else falls through to the plain catch-all untouched. This is a general SvelteKit
pattern (a suffix-matched rest route paired with an unconstrained one), not a cairn-specific
mechanism, and SvelteKit's own routing documentation does not spell out this particular
combination.

### What content type actually ships

`markdownResponse` sets `Content-Type: text/markdown; charset=utf-8` deliberately. Whether that
survives to the browser depends on which server you're looking at, and the three don't agree.

Measured directly: a prerendered `.md` route (the shape above, with `prerender = true`) bakes to
a static file at build time, and `@sveltejs/adapter-cloudflare` does not capture its Response
headers into the build's `_headers` file. That much is confirmed straight from the adapter's own
source (version 7.2.9, the range this page's snippets are tested against): it copies a root
`_headers` file if your project has one and otherwise emits only a fixed immutable-assets block
for hashed build output, with no path from a route's own Response headers into that file at all.
Serving that build with `wrangler dev` still returns `Content-Type: text/markdown; charset=utf-8`,
but not because the header survived: setting the route's own header to a deliberately different
value and rebuilding produced the identical `wrangler dev` response, `text/markdown;
charset=utf-8`, unchanged. Since the header can't have reached `_headers`, Cloudflare's
static-asset layer has to be re-deriving the content type from the `.md` file extension on every
request instead, discarding whatever the original Response set, and it happens to land on the same
value cairn's own code chooses. `vite preview` disagrees with both: the identical build, served
locally through Vite's own preview server rather than Cloudflare's asset layer, reports
`text/markdown` with **no** `charset` parameter at all.

So for a `.md`-suffixed prerendered route specifically, the deliberate charset ships correctly on
Cloudflare's asset layer today, by coincidence of its own MIME table rather than by design, and
`vite preview` is not a reliable stand-in for what a deployed site actually serves. This was
measured locally under `wrangler dev`, which Cloudflare documents as mirroring the edge's static
asset handling; it has not been verified against a live deployed zone, and no other extension's
behavior was checked. Don't assume the same coincidence holds for a route serving a different
extension with a deliberately chosen content type; verify it the same way, with `wrangler dev`
and a rebuild that changes the header, before relying on it.

## Feed, sitemap, and robots.txt

Each has a pure builder plus a responder that wraps it in a `Response`:

```ts
// src/routes/feed.xml/+server.ts
import { rssResponse, createLinkResolver, type FeedItem } from '@glw907/cairn-cms/delivery';
import { site, posts, ORIGIN } from '$lib/content.js';
import { cairn, siteConfig } from '$lib/cairn.config.js';

export const prerender = true;

export const GET = async () => {
  const toPermalink = createLinkResolver(site);
  const resolve = (ref: Parameters<typeof toPermalink>[0]) => ORIGIN + toPermalink(ref);
  const items: FeedItem[] = await Promise.all(
    posts.all().map(async (p) => ({
      title: p.title,
      url: ORIGIN + p.permalink,
      date: p.date,
      summary: p.excerpt,
      contentHtml: await cairn.rendering.render({ body: posts.byId(p.id)!.body, resolve }),
      tags: p.tags,
    })),
  );
  return rssResponse(
    { title: siteConfig.siteName, description: siteConfig.description, siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.xml' },
    items,
  );
};
```

```ts
// src/routes/sitemap.xml/+server.ts
import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content.js';

export const prerender = true;

export const GET = () => {
  const urls: SitemapUrl[] = site.all().map((s) => ({
    loc: ORIGIN + s.permalink,
    ...(s.date ? { lastmod: s.date } : {}),
  }));
  return sitemapResponse(urls);
};
```

```ts
// src/routes/robots.txt/+server.ts
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN } from '$lib/content.js';

export const prerender = true;

export const GET = () =>
  robotsResponse({ sitemapUrl: ORIGIN + '/sitemap.xml', disallow: ['/admin'] });
```

Always `disallow: ['/admin']`: nothing about the admin route itself blocks a crawler, so a site
that skips this line lets a crawler index its own sign-in page. `robotsResponse` also takes a
`posture` option for declaring your stance on AI training crawlers; [Choose an AI
posture](./choose-an-ai-posture.md) covers that decision on its own.

[`/delivery/data`](../reference/delivery-data.md) documents every builder's full signature,
including `buildJsonFeed`/`jsonFeedResponse` for a JSON Feed alongside RSS.

**You know it worked when:** `npm run build` prerenders every route with no throw, and
`/sitemap.xml`, `/feed.xml`, and `/robots.txt` all resolve locally with `npm run preview`.
