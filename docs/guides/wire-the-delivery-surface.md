# Wire the delivery surface

The adapter, schema, and renderer describe your content. A public cairn site adds three routes on
top: a catch-all that serves one entry per request, the feed and sitemap routes a crawler reads,
and an archive filter that narrows a long list by tag. Every snippet below is code from
[`examples/showcase`](../../examples/showcase).

## Build the site's indexes

`createSiteIndexes` turns your adapter's raw markdown into the typed query surfaces the rest of
delivery reads: one `ContentIndex` per concept, plus a cross-concept `site` resolver.

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
```

`import.meta.glob` needs a literal pattern at its call site, so the engine can't glob on your
behalf. You write one glob per concept and pass the raw records in, keyed by concept id. The
showcase keeps this in one module, `src/chassis/content.ts`, so every route imports the same
`site` and per-concept indexes instead of rebuilding them.

Each `ContentIndex` gives you `all()`, `byId(id)`, `byTag(tag)`, `allTags()`, and `adjacent(id)`
for prev/next links. The cross-concept `site` resolver adds `byPermalink(path)`, the one lookup
the catch-all route below needs, and `all()` for a site-wide listing like the sitemap. A malformed
entry fails the whole build by default. Pass `{ validate: false }` as `createSiteIndexes`'s fourth
argument only if you want a bad entry to drop out of the index instead of failing the build.

## Serve one entry through the catch-all route

`createPublicRoutes` builds the loader a single `[...path]` route mounts. It resolves whatever
path the request carries against the site resolver, renders the entry through your adapter's
`render`, and folds in the SEO head and, when media is on, the hero image.

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
  defaultImage: ORIGIN + '/og/default.png',
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
});

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = async ({ url }) => {
  return routes.entryLoad({ url });
};
```

`entries()` enumerates every permalink across every concept, so SvelteKit can prerender the whole
site from this one route. `entryLoad` resolves the current request's path to one entry and throws
a 404 on a miss. The template reads `data.entry`, `data.html`, and `data.seo` and renders them; it
never touches the resolver directly.

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

`CairnHead` renders the SEO head, title, meta tags, and one JSON-LD script, into
`<svelte:head>` from the plain-data `seo` object `entryLoad` returned. It carries no CSS, so
mounting it never pulls in an admin style. Pass `title={false}` if your template wants to own the
`<title>` tag itself.

If a schema field points at another concept, resolve it the same way the showcase's post pages
resolve `author`: the cross-concept `site` resolver, not the per-concept index, is what can reach
a different concept's entries.

```ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes, resolveReferences, siteDescriptors, type ResolvedReference } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn, siteConfig } from '$lib/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: SITE_DESCRIPTION,
});

// The concept descriptors, by id, so the load can hand resolveReferences the right field schema
// for the entry it resolved.
const descriptorById = new Map(siteDescriptors(cairn, siteConfig).map((d) => [d.id, d]));

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = async ({ url }) => {
  const data = await routes.entryLoad({ url });
  const descriptor = descriptorById.get(data.concept);
  const references: Record<string, ResolvedReference | ResolvedReference[]> = descriptor
    ? resolveReferences(site, descriptor, data.entry.frontmatter)
    : {};
  return { ...data, references };
};
```

`resolveReferences` drops an id with no live target instead of throwing. The build's
`verifyReferences` gate fails a genuinely dangling edge, so an id still unresolved at request time
points at a target that is mid-flight or a draft.

## Read tags as data

Cairn ships no public tag pages. A taxonomy field's values are read-model data: your template
filters over them, and no engine route maps a tag to a URL.
The field that marks a concept's tags, `multiselect` with `taxonomy: true`, is already covered in
[Define an adapter and schema](./define-an-adapter-and-schema.md#add-more-fields-to-the-schema).
Its validated values surface on every `ContentSummary` as `tags: string[]`.

The showcase home reads that data directly, filtering the archive to a selected tag once it grows
past a size worth narrowing:

```ts
import type { ContentSummary } from '@glw907/cairn-cms/delivery';

declare const entries: ContentSummary[];
declare const selected: string;

const filtered = selected ? entries.filter((p) => p.tags.includes(selected)) : entries;
```

The filter's option labels come from the site's curated vocabulary rather than the raw tag values,
so an editor's `topics` label reads the same in the filter and in the picker:

```ts
import { extractVocabulary } from '@glw907/cairn-cms';
import { posts } from '$lib/content';
import { siteConfig } from '$lib/cairn.config';

export const load = () => ({ posts: posts.all(), vocabulary: extractVocabulary(siteConfig) });
```

`extractVocabulary` reads the `{value, label}` list a site curates in `site.config.yaml`. Pair
each option's `value` against an entry's `tags` to filter, and its `label` to display. A site with
no vocabulary configured still gets tags on every summary, an open, uncurated list, since the tag
field itself never depends on a vocabulary existing.

`ContentIndex` also exposes `byTag(tag)` and `allTags()` directly, for a dedicated archive-by-tag
view if your site wants one instead of an inline filter. Both read the same validated `tags` this
section already covers.

## Publish feeds, a sitemap, and robots.txt

Each of these has a pure builder that returns a string and a responder that wraps it in a
`Response` with the right media type. A `+server.ts` route calls the responder.

A feed needs one item per entry. The showcase builds its items once in a shared helper, so the RSS
and JSON routes can never drift from each other:

```ts
import { buildLinkResolver, type FeedItem } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export async function buildFeedItems(): Promise<FeedItem[]> {
  const posts = site.concept('posts');
  const toPermalink = buildLinkResolver(site);
  const resolve = (ref: Parameters<typeof toPermalink>[0]) => ORIGIN + toPermalink(ref);
  return Promise.all(
    (posts?.all() ?? []).map(async (p) => ({
      title: p.title,
      url: ORIGIN + p.permalink,
      date: p.date,
      summary: p.excerpt,
      contentHtml: await cairn.rendering.render({ body: posts!.byId(p.id)!.body, resolve }),
      tags: p.tags,
    })),
  );
}
```

`feedItem.tags` rides straight from the same `ContentSummary.tags` the previous section covers, so
it becomes the RSS `<category>` and the JSON Feed `tags` with no extra mapping. Each format route
then wraps those items in its own responder:

```ts
import type { RequestHandler } from './$types';
import { rssResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { siteConfig } from '$lib/cairn.config';
import { buildFeedItems } from '$lib/feed';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const items = await buildFeedItems();
  return rssResponse(
    { title: siteConfig.siteName, description: SITE_DESCRIPTION, siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.xml' },
    items,
  );
};
```

`feed.json` mirrors this exactly and calls `jsonFeedResponse` instead. Both responders take the
same channel and item shapes, so the shared `buildFeedItems` helper feeds both.

The sitemap and robots routes read straight off the `site` resolver, with no intermediate helper:

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

```ts
import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN } from '$lib/content';

export const prerender = true;

export const GET: RequestHandler = () => {
  return robotsResponse({ sitemapUrl: ORIGIN + '/sitemap.xml', disallow: ['/admin'] });
};
```

The showcase's feed and sitemap both map every entry by hand, because a full-content feed needs
its own render pass and the sitemap wants every entry regardless of concept. A site with several
feed-eligible concepts and no need for full content can skip the hand-written map: `feedView` and
`sitemapView` project a site's `routing.inFeeds` and `routing.routable` concepts into feed items
and sitemap URLs directly, summary-only, no render pass included. The [delivery data
reference](../reference/delivery-data.md#feeds-sitemap-and-robots) documents both.

A site also carries bespoke pages no concept describes, an about page, a tag index, and the like.
`sitemapView`'s fourth argument lists those as root-relative paths, so the whole sitemap comes from
one call instead of a hand-built array:

```ts
import { sitemapView, sitemapResponse, siteDescriptors } from '@glw907/cairn-cms/delivery';
import { site, cairn, ORIGIN } from '$lib/content';
import { siteConfig } from '$lib/cairn.config';

const EXTRA_ROUTES = ['/', '/about', '/archives', '/tags'];

export const GET = () => {
  const urls = sitemapView(site, siteDescriptors(cairn, siteConfig), ORIGIN, EXTRA_ROUTES);
  return sitemapResponse(urls);
};
```

A page directory that grows under the site's own route group and never joins `EXTRA_ROUTES` ships
a silent sitemap gap. `unlistedRoutes` catches it: hand it the route ids under that directory and
the same `EXTRA_ROUTES` list, and assert the result is empty in the site's own test suite.
The [delivery data reference](../reference/delivery-data.md#unlistedroutes) has the full example.

## Related reference

[`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes),
[`createPublicRoutes`](../reference/delivery.md#createpublicroutes), and
[`CairnHead`](../reference/delivery.md#cairnhead) cover the full call shapes this guide builds
from. [`resolveReferences`](../reference/delivery-data.md#resolvereferences) documents the
reference-resolution helper on its own. [Configure rendering](./configure-rendering.md) covers the
`render` function this guide's routes call. The [media reference](../reference/media.md) covers
`makeMediaResolver` and the `resolveMedia` render option that resolves a `media:` reference to its
delivery URL.
