# Delivery data (`@glw907/cairn-cms/delivery/data`)

This subpath holds the node-safe pure projections: the index builders, the feed, sitemap, and
robots builders and responders, the SEO head builder, and the small pure helpers. Nothing here pulls
`@sveltejs/kit` into the module graph, so a plain-Node tool such as the manifest bin or the Vite
plugin can import the builders. A SvelteKit site usually imports these symbols through the
[`/delivery`](./delivery.md) barrel, which re-exports this whole surface. Import from
`/delivery/data` directly when you need a builder outside the SvelteKit runtime.

```ts
import { createSiteIndexes, rssResponse } from '@glw907/cairn-cms/delivery/data';
```

The showcase reaches these symbols through `/delivery`, so the snippets below come from the
`/delivery` showcase routes. The same imports point at `/delivery/data` in a plain-Node context. The
TypeScript types in `src/lib/delivery` are the source of truth, and the export-coverage gate checks
every name here against them.

---

## Index builders

These turn a site's raw markdown into the typed query surfaces a route reads.

### `createSiteIndexes`

```ts
function createSiteIndexes<const A extends CairnAdapter>(
  adapter: A,
  config: SiteConfig,
  globs: SiteGlobs<A>,
  opts?: { validate?: boolean },
): SiteIndexes<A>;
```

Build the typed per-concept indexes and the cross-concept `site` resolver from one adapter. Pass the
per-concept raw globs keyed by concept id. Vite needs the literal glob at the call site, so the
engine cannot glob on the site's behalf. The returned object carries one `ContentIndex` per concept
plus a `site` field, so a concept literally named `site` is not supported. `validate: false` opts out
of the build gate. The showcase builds its one content layer this way.

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

### `createSiteIndex`

```ts
function createSiteIndex(
  concepts: ConceptIndex[],
  opts?: { validate?: boolean },
): SiteIndex;
```

Union a list of per-concept indexes into a site-level resolver. It throws on a duplicate permalink
and, unless `validate` is `false`, on any non-draft entry whose frontmatter fails its concept's
validator, so malformed content fails the build instead of shipping. `createSiteIndexes` calls this
under the hood; reach for it when you assemble the `ConceptIndex` list yourself.

```ts
import { createContentIndex, createSiteIndex, fromGlob } from '@glw907/cairn-cms/delivery/data';
import { siteDescriptors } from '@glw907/cairn-cms/delivery/data';

const [postsDesc, pagesDesc] = siteDescriptors(cairn, siteConfig);
const site = createSiteIndex([
  { descriptor: postsDesc, index: createContentIndex(fromGlob(postsRaw), postsDesc) },
  { descriptor: pagesDesc, index: createContentIndex(fromGlob(pagesRaw), pagesDesc) },
]);
```

### `createContentIndex`

```ts
function createContentIndex<F = Record<string, unknown>>(
  files: RawFile[],
  descriptor: ConceptDescriptor,
): ContentIndex<F>;
```

Build one concept's query surface from its raw files and normalized descriptor. The returned
`ContentIndex` answers `all`, `byId`, `byTag`, `allTags`, `adjacent`, and `problems`. Pass `F` to
type the per-entry frontmatter.

---

## Feeds, sitemap, and robots

Each output has a pure builder that returns a string and a responder that wraps the string in a
`Response` with the right content type. A SvelteKit `+server.ts` calls the responder; a static tool
calls the builder.

### `buildRssFeed`

```ts
function buildRssFeed(channel: FeedChannel, items: FeedItem[]): string;
```

Build an RSS 2.0 document. `channel` carries the feed metadata with absolute URLs; each `FeedItem`
carries one entry, with `contentHtml` for a full-content feed.

### `buildJsonFeed`

```ts
function buildJsonFeed(channel: FeedChannel, items: FeedItem[]): string;
```

Build a JSON Feed 1.1 document from the same channel and items.

### `buildSitemap`

```ts
function buildSitemap(urls: SitemapUrl[]): string;
```

Build a sitemap XML document from a list of `SitemapUrl` entries, each a `loc` and an optional
`lastmod` date.

### `buildRobots`

```ts
function buildRobots(opts: { sitemapUrl: string; disallow?: string[] }): string;
```

Build a robots.txt body that points at the sitemap and disallows the given paths.

### `rssResponse`

```ts
function rssResponse(channel: FeedChannel, items: FeedItem[]): Response;
```

Wrap an RSS 2.0 feed in a `Response`. The showcase feed route builds its items from the posts index,
then hands them to the responder.

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

### `jsonFeedResponse`

```ts
function jsonFeedResponse(channel: FeedChannel, items: FeedItem[]): Response;
```

Wrap a JSON Feed 1.1 feed in a `Response`. The showcase `feed.json` route mirrors the RSS route and
calls this responder instead.

### `sitemapResponse`

```ts
function sitemapResponse(urls: SitemapUrl[]): Response;
```

Wrap a sitemap in a `Response`. The showcase sitemap route maps every site entry to a `SitemapUrl`.

```ts
import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content';

export const GET = () => {
  const urls: SitemapUrl[] = [
    { loc: ORIGIN + '/' },
    ...site.all().map((s) => ({ loc: ORIGIN + s.permalink, ...(s.date ? { lastmod: s.date } : {}) })),
  ];
  return sitemapResponse(urls);
};
```

### `robotsResponse`

```ts
function robotsResponse(opts: { sitemapUrl: string; disallow?: string[] }): Response;
```

Wrap a robots.txt body in a `Response`. The showcase route points at the sitemap and disallows
`/admin`.

```ts
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN } from '$lib/content';

export const GET = () =>
  robotsResponse({ sitemapUrl: ORIGIN + '/sitemap.xml', disallow: ['/admin'] });
```

---

## SEO and manifest builders

### `buildSeoMeta`

```ts
function buildSeoMeta(input: SeoInput): SeoMeta;
```

Build the plain-data head for a page: the title, the meta tags, the link tags, and one JSON-LD
object. All URLs in `SeoInput` are absolute, built from the site origin. The `/delivery`
`createPublicRoutes` loader calls this so a public entry ships a full head.

```ts
import { buildSeoMeta } from '@glw907/cairn-cms/delivery/data';

const seo = buildSeoMeta({
  title: entry.title,
  description: entry.excerpt,
  canonicalUrl: ORIGIN + entry.permalink,
  siteName: cairn.siteName,
  type: 'article',
  published: entry.date,
});
```

### `buildSiteManifest`

```ts
function buildSiteManifest<A extends CairnAdapter>(
  adapter: A,
  config: SiteConfig,
  globs: SiteGlobs<A>,
): Manifest;
```

Build the whole-corpus manifest from a site's adapter, config, and per-concept globs. Drafts are
included and flagged, so the admin picker and the link guards see the full graph. The Vite plugin and
the manifest bin call this in a plain-Node context, which is why it lives on this node-safe surface.

```ts
import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';

const manifest = buildSiteManifest(cairn, siteConfig, { posts: postsRaw, pages: pagesRaw });
```

### `buildLinkResolver`

```ts
function buildLinkResolver(site: SiteIndex): LinkResolve;
```

Build a `cairn:` link resolver backed by the site index, for the build. A miss throws, so a dangling
`cairn:` token fails the prerender. The feed routes above use it to turn an internal link into an
absolute URL.

---

## Pure helpers

Small pure functions the builders and the routes share.

### `deriveExcerpt`

```ts
function deriveExcerpt(body: string, opts?: { description?: string; maxChars?: number }): string;
```

Return a plain-text excerpt: a trimmed frontmatter `description` when present, otherwise the stripped
body cut at a word boundary near `maxChars` (default 200) with an ellipsis.

### `wordCount`

```ts
function wordCount(body: string): number;
```

Count the words in the stripped markdown body.

### `paginate`

```ts
function paginate<T>(items: T[], page: number, perPage: number): Page<T>;
```

Slice `items` into the 1-based `page` of size `perPage`, clamping the page into bounds, and return the
page plus its navigation state.

### `permalink`

```ts
function permalink(
  descriptor: ConceptDescriptor,
  entry: { id: string; slug: string; date?: string },
): string;
```

Resolve an entry's canonical path from its concept's permalink pattern. It throws when the pattern
uses a date token and the entry has no valid date. This is the same `permalink` the core surface
exports, re-exported here so the node-safe builders can resolve a path without the SvelteKit module
graph.

### `fromGlob`

```ts
function fromGlob(record: Record<string, string>): RawFile[];
```

Map a Vite eager `?raw` glob record (`{ path: raw }`) to a `RawFile[]` for `createContentIndex`.

### `resolveImageUrl`

```ts
function resolveImageUrl(image: string, origin: string): string | undefined;
```

Resolve an author-supplied image path to an absolute URL against the site origin. An absolute or
protocol-relative URL passes through, a root-relative path anchors to the origin, and a malformed
string returns `undefined` rather than throwing at build.

### `readSeoFields`

```ts
function readSeoFields(frontmatter: Record<string, unknown>): SeoFields;
```

Read the known SEO head fields off an entry's normalized frontmatter, keeping a present string
trimmed and omitting an absent, empty, or non-string value. A field must be declared in the concept's
schema to survive the validate-once read.

### `jsonLdScript`

```ts
function jsonLdScript(data: Record<string, unknown>): string;
```

Serialize a JSON-LD object into the inner text of a `<script type="application/ld+json">` tag, with
the characters that would break out of a script element escaped.

### `siteDescriptors`

```ts
function siteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig): ConceptDescriptor[];
```

Build the per-concept descriptors for a site from its adapter content and its parsed site config. The
descriptors feed `createContentIndex` and `createSiteIndex` when you assemble the indexes by hand.

---

## Types

| Name | Signature | Meaning |
| --- | --- | --- |
| `RawFile` | `interface RawFile { path: string; raw: string }` | A raw content file before parsing: the glob key and the file's full markdown text. |
| `ContentSummary` | `interface ContentSummary { concept; id; slug; permalink; title; date?; updated?; tags: string[]; excerpt; wordCount; draft; fields }` | The cheap plain-data view of one entry, for lists, feeds, and the sitemap. |
| `ContentEntry` | `interface ContentEntry<F = Record<string, unknown>> extends ContentSummary { frontmatter: F; body: string }` | The detail view: a summary plus the typed frontmatter and the body to render. |
| `ContentProblem` | `interface ContentProblem { id: string; draft: boolean; errors: Record<string, string> }` | One entry's validation failure, recorded at build for the site aggregator's gate. |
| `ContentIndex` | `interface ContentIndex<F = Record<string, unknown>> { all; byId; byTag; allTags; adjacent; problems }` | The per-concept query surface that `createContentIndex` returns. |
| `ConceptIndex` | `interface ConceptIndex { descriptor: ConceptDescriptor; index: ContentIndex }` | One concept's descriptor paired with its built index, the input to `createSiteIndex`. |
| `SiteIndex` | `interface SiteIndex { byPermalink; adjacent; entries; concept; all }` | The cross-concept query surface a catch-all route and the sitemap read. |
| `SiteGlobs` | `type SiteGlobs<A extends CairnAdapter> = { [K in keyof A['content']]?: Record<string, string> }` | A per-concept raw glob record keyed by concept id, from `import.meta.glob`. |
| `SiteIndexes` | `type SiteIndexes<A> = { [K in keyof A['content']]: ContentIndex<...> } & { readonly site: SiteIndex }` | The typed per-concept indexes plus the cross-concept `site` resolver, the return of `createSiteIndexes`. |
| `FeedChannel` | `interface FeedChannel { title; description; siteUrl; feedUrl; language?; author? }` | Feed channel metadata, with absolute URLs. |
| `FeedItem` | `interface FeedItem { title; url; date?; updated?; summary; contentHtml?; tags? }` | One feed entry; `contentHtml` carries the rendered body for a full-content feed. |
| `SitemapUrl` | `interface SitemapUrl { loc: string; lastmod?: string }` | One sitemap URL; `lastmod` is a YYYY-MM-DD date. |
| `SeoInput` | `interface SeoInput { title; description; canonicalUrl; siteName; type?; published?; modified?; feeds?; image?; robots?; author? }` | The inputs for the head builder, all URLs absolute. |
| `SeoMeta` | `interface SeoMeta { title; meta; links; jsonLd }` | The plain-data head: a title, meta tags, link tags, and one JSON-LD object. |
| `SeoFields` | `interface SeoFields { description?; image?; robots?; author? }` | The optional SEO head fields a concept can carry in frontmatter. |
| `Page` | `interface Page<T> { items: T[]; page; perPage; total; totalPages; hasPrev; hasNext }` | A page of items plus its navigation state, the return of `paginate`. |
