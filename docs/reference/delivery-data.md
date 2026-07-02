# Delivery data (`@glw907/cairn-cms/delivery/data`)

This subpath holds the index builders, the feed, sitemap, and robots builders and responders, the
SEO head builder, and the small pure helpers. All of it is node-safe pure projection: nothing pulls
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

Stability tier: Extension API.

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

---

## Feeds, sitemap, and robots

Each output has a pure builder that returns a string and a responder that wraps the string in a
`Response` with the right content type. A SvelteKit `+server.ts` calls the responder; a static tool
calls the builder.

### `buildRssFeed`

Stability tier: Extension API.

```ts
function buildRssFeed(channel: FeedChannel, items: FeedItem[]): string;
```

Build an RSS 2.0 document. `channel` carries the feed metadata with absolute URLs; each `FeedItem`
carries one entry, with `contentHtml` for a full-content feed.

### `buildJsonFeed`

Stability tier: Extension API.

```ts
function buildJsonFeed(channel: FeedChannel, items: FeedItem[]): string;
```

Build a JSON Feed 1.1 document from the same channel and items.

### `buildSitemap`

Stability tier: Extension API.

```ts
function buildSitemap(urls: SitemapUrl[]): string;
```

Build a sitemap XML document from a list of `SitemapUrl` entries, each a `loc` and an optional
`lastmod` date.

### `feedView`

Stability tier: Unstable API.

```ts
function feedView(
  site: SiteResolver,
  descriptors: ConceptDescriptor[],
  origin: string,
): FeedItem[];
```

Project a site's feed-eligible concepts into feed items. It iterates the concepts whose
`routing.inFeeds` flag is set and maps each entry to a `FeedItem` in the concept's own date order.
Each item carries the entry's taxonomy values as `tags`, which become the RSS `<category>` and the
JSON Feed `tags`. Pass `origin` because each `FeedItem.url` is absolute and the engine carries no
ambient origin.

The view is summary-only. It sets `summary` from the entry excerpt and omits `contentHtml`, the
full-content body. A full-content feed needs a per-item render and a link-resolver pass, which the
pure view does not carry. A site that wants full content maps `render` itself, as the `feed.xml`
showcase route does.

### `sitemapView`

Stability tier: Extension API.

```ts
function sitemapView(
  site: SiteResolver,
  descriptors: ConceptDescriptor[],
  origin: string,
): SitemapUrl[];
```

Project a site's routable concepts into sitemap URLs. It iterates the concepts whose
`routing.routable` flag is set and maps each entry to a `SitemapUrl`. The `loc` is the
origin-anchored permalink. The `lastmod` is the entry's `updated` date when present, else its `date`.
An embedded, non-routable concept never appears. Pass `origin` because each `loc` is absolute.

### `buildRobots`

Stability tier: Extension API.

```ts
function buildRobots(opts: { sitemapUrl: string; disallow?: string[] }): string;
```

Build a robots.txt body that points at the sitemap and disallows the given paths.

### `rssResponse`

Stability tier: Extension API.

```ts
function rssResponse(channel: FeedChannel, items: FeedItem[]): Response;
```

Wrap an RSS 2.0 feed in a `Response`. The showcase feed route builds its items from the posts index,
then hands them to the responder.

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

### `jsonFeedResponse`

Stability tier: Extension API.

```ts
function jsonFeedResponse(channel: FeedChannel, items: FeedItem[]): Response;
```

Wrap a JSON Feed 1.1 feed in a `Response`. The showcase `feed.json` route mirrors the RSS route and
calls this responder instead.

### `sitemapResponse`

Stability tier: Extension API.

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

Stability tier: Extension API.

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

Stability tier: Extension API.

```ts
function buildSeoMeta(input: SeoInput): SeoMeta;
```

Build the plain-data head for a page: the title, the meta tags, the link tags, and one JSON-LD
object. All URLs in `SeoInput` are absolute, built from the site origin. The `/delivery`
`createPublicRoutes` loader calls this so a public entry ships a full head.

<!-- snippet-check-skip: entry and siteConfig come from the site's own route module, not shown here -->
```ts
import { buildSeoMeta } from '@glw907/cairn-cms/delivery/data';

const seo = buildSeoMeta({
  title: entry.title,
  description: entry.excerpt,
  canonicalUrl: ORIGIN + entry.permalink,
  siteName: siteConfig.siteName,
  type: 'article',
  published: entry.date,
});
```

### `buildSiteManifest`

Stability tier: Extension API.

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

<!-- snippet-check-skip: cairn, siteConfig, postsRaw, and pagesRaw come from the site's own build script, not shown here -->
```ts
import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';

const manifest = buildSiteManifest(cairn, siteConfig, { posts: postsRaw, pages: pagesRaw });
```

### `buildLinkResolver`

Stability tier: Extension API.

```ts
function buildLinkResolver(site: SiteResolver): LinkResolve;
```

Build a `cairn:` link resolver backed by the site resolver, for the build. A miss throws, so a
dangling `cairn:` token fails the prerender. The feed routes above use it to turn an internal link
into an absolute URL.

### `resolveReferences`

Stability tier: Extension API.

```ts
function resolveReferences(
  site: SiteResolver,
  descriptor: ConceptDescriptor,
  frontmatter: Record<string, unknown>,
): Record<string, ResolvedReference | ResolvedReference[]>;
```

Resolve an entry's `reference` and `array(reference)` frontmatter edges to their target identities,
keyed by the field name, so a public route renders a reference as a link to its target's page. A
`reference` field resolves to one [`ResolvedReference`](#types) and an `array(reference)`
field to a `ResolvedReference[]` in edge order. The resolution lives on the cross-concept resolver
because only that layer reaches another concept's entries: a post's `author` edge targets a `pages`
entry the posts index alone can't read. The resolver drops an id with no live target rather than
throwing. The build's `verifyReferences` gate already fails a true dangling edge, so an unresolved id
at request time is a mid-flight or draft target. A route reads the resolved map alongside the entry
and renders each target as a link.

<!-- snippet-check-skip: postsDescriptor and entry come from the site's own route module, not shown here -->
```ts
import { resolveReferences } from '@glw907/cairn-cms/delivery';
import { site } from '$lib/content';

const refs = resolveReferences(site, postsDescriptor, entry.frontmatter);
const author = refs.author as ResolvedReference | undefined;
```

---

## Pure helpers

Small pure functions the builders and the routes share.

### `deriveExcerpt`

Stability tier: Extension API.

```ts
function deriveExcerpt(body: string, opts?: { description?: string; maxChars?: number }): string;
```

Return a plain-text excerpt: a trimmed frontmatter `description` when present, otherwise the stripped
body cut at a word boundary near `maxChars` (default 200) with an ellipsis.

### `resolveImageUrl`

Stability tier: Extension API.

```ts
function resolveImageUrl(image: string, origin: string): string | undefined;
```

Resolve an author-supplied image path to an absolute URL against the site origin. An absolute or
protocol-relative URL passes through, a root-relative path anchors to the origin, and a malformed
string returns `undefined` rather than throwing at build.

### `readSeoFields`

Stability tier: Extension API.

```ts
function readSeoFields(frontmatter: Record<string, unknown>): SeoFields;
```

Read the known SEO head fields off an entry's normalized frontmatter, keeping a present string
trimmed and omitting an absent, empty, or non-string value. A field must be declared in the concept's
schema to survive the validate-once read.

### `jsonLdScript`

Stability tier: Extension API.

```ts
function jsonLdScript(data: Record<string, unknown>): string;
```

Serialize a JSON-LD object into the inner text of a `<script type="application/ld+json">` tag, with
the characters that would break out of a script element escaped.

### `siteDescriptors`

Stability tier: Extension API.

```ts
function siteDescriptors(adapter: CairnAdapter, siteConfig: SiteConfig): ConceptDescriptor[];
```

Build the per-concept descriptors for a site from its adapter content and its parsed site config.
`createSiteIndexes` derives them internally. A public route calls this directly when it needs a
`ConceptDescriptor` on its own, such as the descriptor `resolveReferences` takes.

---

## Types

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `ContentSummary` | Extension API | `interface ContentSummary { concept; id; slug; permalink; title; date?; updated?; tags: string[]; excerpt; wordCount; draft; fields }` | The cheap plain-data view of one entry, for lists, feeds, and the sitemap. |
| `ContentEntry` | Extension API | `interface ContentEntry<F = Record<string, unknown>> extends ContentSummary { frontmatter: F; body: string }` | The detail view: a summary plus the typed frontmatter and the body to render. |
| `ContentProblem` | Extension API | `interface ContentProblem { id: string; draft: boolean; errors: Record<string, string> }` | One entry's validation failure, recorded at build for the site aggregator's gate. |
| `ContentIndex` | Extension API | `interface ContentIndex<F = Record<string, unknown>> { all; byId; byTag; allTags; adjacent; problems }` | The per-concept query surface `createSiteIndexes` builds one of per concept. |
| `SiteResolver` | Extension API | `interface SiteResolver { byPermalink; adjacent; entries; concept; all }` | The cross-concept query surface a catch-all route and the sitemap read. `byPermalink` resolves one entry by request path. |
| `SiteGlobs` | Extension API | `type SiteGlobs<A extends CairnAdapter> = { [K in keyof A['content']]?: Record<string, string> }` | A per-concept raw glob record keyed by concept id, from `import.meta.glob`. |
| `SiteIndexes` | Extension API | `type SiteIndexes<A> = { [K in keyof A['content']]: ContentIndex<...> } & { readonly site: SiteResolver }` | The typed per-concept indexes plus the cross-concept `site` resolver, the return of `createSiteIndexes`. |
| `FeedChannel` | Extension API | `interface FeedChannel { title; description; siteUrl; feedUrl; language?; author? }` | Feed channel metadata, with absolute URLs. |
| `FeedItem` | Extension API | `interface FeedItem { title; url; date?; updated?; summary; contentHtml?; tags? }` | One feed entry; `contentHtml` carries the rendered body for a full-content feed. |
| `SitemapUrl` | Extension API | `interface SitemapUrl { loc: string; lastmod?: string }` | One sitemap URL; `lastmod` is a YYYY-MM-DD date. |
| `SeoInput` | Extension API | `interface SeoInput { title; description; canonicalUrl; siteName; type?; published?; modified?; feeds?; image?; imageAlt?; robots?; author? }` | The inputs for the head builder, all URLs absolute. `imageAlt` becomes `twitter:image:alt` when `image` is set. |
| `SeoMeta` | Extension API | `interface SeoMeta { title; meta; links; jsonLd }` | The plain-data head: a title, meta tags, link tags, and one JSON-LD object. |
| `SeoFields` | Extension API | `interface SeoFields { description?; image?; robots?; author? }` | The optional SEO head fields a concept can carry in frontmatter. |
| `ResolvedReference` | Extension API | `interface ResolvedReference { id; concept; title; permalink; summary? }` | A reference edge resolved to its target's identity, for a public route to render a linked target. |
