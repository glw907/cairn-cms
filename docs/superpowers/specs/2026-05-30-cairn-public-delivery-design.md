# Cairn rebuild: public content delivery (design)

Status: approved design, pre-plan. Authored 2026-05-30.

This design adds a public read-and-deliver layer to the engine. It supplements the
functional spec at `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`,
which holds the locked architecture, and it follows the eight rebuild plans that landed
the admin, auth, commit, render, and nav subsystems. The numbered plan derived from this
design will land under `docs/superpowers/plans/`; its number is settled at planning time
(see Sequencing).

## Why this layer exists

The rebuilt engine owns the whole write side of a cairn site. Auth, the GitHub commit
path, the editor, nav editing, and the render pipeline all live in `@glw907/cairn-cms`,
where a fix propagates to every site on a version bump. The read side does not exist in
the engine at all. Every consumer hand-rolls its own public listing, tags, archive, and
feeds in a site-local `$lib/posts.ts` and `$lib/feed.ts`.

That hand-rolled code has already drifted between the two live sites. The two `posts.ts`
files use different filename schemes and different HTML rendering, and the feed builders
duplicate escaping and envelope logic by hand. This is the fix-prone, drift-prone logic the
engine-fat rule is meant to capture. A draft-filter bug, a feed-escaping bug, or a wrong
sort order can land on one site and not the other, with no single place to fix it.

This layer restores symmetry. The engine gains a public query, syndication, and discovery
surface to match its write surface, so the logic lives in one place and the sites carry
presentation. It is the "data and syndication core" option from the scoping brainstorm,
chosen over a thinner "feeds only" cut and a fatter "full delivery" cut that would have
pulled opinionated presentation into the engine.

## Scope

### In the target

Each item is engine logic plus a thin template seam. The engine half is pure and tested;
the template half is presentation a site owns.

- **Content query API.** A per-concept index over a site's markdown: list newest-first,
  drop drafts, get by id, filter by tag, aggregate tags with counts, and find the adjacent
  entries. Pure logic over raw files.
- **RSS and JSON feeds.** Pure string builders that turn a channel plus a list of items
  into valid `feed.xml` and `feed.json`. The template adds a one-line `+server.ts` shim.
- **Sitemap and robots.** `sitemap.xml` derived from the index and the routable concepts,
  and a `robots.txt` that points at the sitemap.
- **Tag pages, archive, and pagination.** `load` functions for a tag index, a single tag,
  and a chronological archive, plus a pure `paginate` helper. The template renders the
  pages and the pager controls.
- **SEO head.** A pure builder that returns the title, meta description, canonical link,
  feed-autodiscovery links, and basic `WebSite` or `Article` JSON-LD as plain data. The
  template renders it inside `<svelte:head>`.
- **Excerpt and word count.** An engine-derived plain-text excerpt and a word count on
  every summary, so feeds, `og:description`, and list cards read one correct excerpt.
- **A canonical permalink resolver.** One function that turns a concept and an entry into
  its URL, shared by every feature above.

### Deferred or elsewhere

- **Search.** It ships as the first `CairnExtension`, with Pagefind as the reference
  implementation bundled into the default template. It is not engine core, because search
  backends vary and the common case wants a zero-config default behind a swap seam.
- **The site settings panel.** A web front-end for the editorial keys in the YAML config
  is its own sibling spec. It writes config through the existing commit pipeline.
- **`og:image` generation, breadcrumbs, related posts, redirects.** Common enough, each
  with several valid implementations, so they stay template or plugin concerns.
- **Favicon, web manifest, the `lang` attribute, the skip link, the 404 page.** Universal
  but presentation. The scaffolder template ships them.
- **URL-nested subpages and a second curated stream concept.** Deferred behind the seams
  that already exist for them (see the next section).

## The content model this assumes

The base stays at two concepts, Posts and Pages, with the stream-versus-structure split as
the rule for where any content belongs.

- **Posts are a stream.** A site lists them, tags them, and syndicates them in a feed.
  A post's URL pattern is configurable per concept, flat by default and dated by config,
  so a news site and an essay site both use Posts without a second concept.
- **Pages are structure.** A reader reaches them through the site's information
  architecture rather than a chronological list. Pages carry a flat slug and stay out of
  feeds. The nav editor already groups flat pages under a section, so a site gets
  navigational hierarchy without URL nesting.

Two needs stay deferred because the existing seams absorb them additively when a real site
arrives. A hierarchical page tree with URL nesting (`/guides/getting-started`) would add a
path-based page permalink and a catch-all page route. A second post-like stream that wants
its own tags and feed alongside the first is a new concept, contributed through the
extension seam's open `content: Record<string, ConceptConfig>` that `composeRuntime`
already folds and Plan 09 dispatches.

This is why the delivery layer is concept-generic (see that section below): the day a site
adds a third concept, the index, permalink, feeds, sitemap, and archive work for it with no
new code.

## Architecture: the load-bearing decisions

These are the seams the layer is built on. Each is hard to change later, so each is stated
explicitly.

### 1. One source-agnostic content provider

The engine's index logic never calls `import.meta.glob` and never knows where a file came
from. SvelteKit and Vite require the glob's literal path to live in the consuming module,
and that path is site-specific, so the template owns the one glob line and hands the engine
the result.

```ts
// site code (template), in a module imported only by the public routes
import { createContentIndex, fromGlob } from '@glw907/cairn-cms';
const files = fromGlob(
  import.meta.glob('/src/content/posts/*.md', { eager: true, query: '?raw', import: 'default' }),
);
export const posts = createContentIndex(files, postsDescriptor);
```

`fromGlob` maps the Vite record to a normalized `RawFile[]`. `createContentIndex` takes that
array, so a test fixture or a future build-time GitHub source plugs into the identical
shape. The engine parses every file with its own `parseMarkdown`, the same parser the
commit path uses, so public reads and admin writes share one frontmatter semantics. There
is exactly one parser in the system.

### 2. id, date, and URL are three decoupled things

- **id** is the filename stem, resolved through the existing `idFromFilename`. It is stable
  and simple, and it is the slug token in a URL.
- **date** is frontmatter `date`. It is the single source of truth for ordering and for any
  date tokens in a URL. It is never parsed out of the filename.
- **URL** is resolved from a pattern (decision 3). It is never parsed out of the filename.

Re-dating a post becomes a one-field frontmatter edit, with no rename and no broken id. The
date baked into the filename is what coupled these three and let the live sites diverge.

### 3. One canonical permalink resolver, pattern-driven and per-concept

A single function resolves an entry's URL, and feeds, sitemap, canonical links, list links,
and the prerender `entries()` all call it. One resolver means one place to be right.

```ts
/** Resolve an entry's canonical path from its concept's permalink pattern. */
function permalink(descriptor: ConceptDescriptor, entry: { id: string; date?: string }): string;
```

The pattern is a `/`-prefixed string of literal segments and tokens. The tokens are `:slug`
for the id, and `:year`, `:month`, and `:day` for the zero-padded parts of the frontmatter
date. A date token on a concept without a date, or on an entry missing its date, fails
loudly at build rather than emitting a broken path.

The pattern lives on the concept config in `cairn.config.ts`, because URL shape is a site's
information-architecture choice and must agree with the filesystem route directory. The
routing capabilities (`routable`, `dated`, `inFeeds`) stay concept-fixed in
`CONCEPT_ROUTING`. Granularity is per-concept, which is the choice a single site needs to
run a dated stream and a flat one at once. Per-site is too coarse, and per-entry would force
two route trees off one ambiguous concept and erode every per-concept operation.

Pages default to `/:slug` at the root, the conventional home for site structure. Every
other routable concept defaults to `/<conceptId>/:slug`, so Posts resolves `/posts/:slug`
with no hardcoded noun and a future `news` concept resolves `/news/:slug` for free. A
template or site overrides the pattern to pick its own word, like `/blog/:slug` or
`/writing/:slug`, or switches Posts to the dated `/:year/:month/:slug`. The engine makes no
editorial claim about whether the stream is a blog, a newsroom, or a journal, and that word
is a template choice.

### 4. One renderer for preview and public

The site's component registry builds one render function through the existing
`createRenderer`. The editor preview and the public page call the identical function, so
what an author previews is byte-for-byte what publishes. The adapter's current
`renderPreview` is renamed to `render` to reflect that it serves both.

```ts
// CairnAdapter and CairnRuntime
render(md: string, opts?: { stagger?: boolean }): string | Promise<string>;
```

The editor calls `render(md)`. A public page calls `render(md, { stagger: true })` when it
wants the entrance cascade. Rendering happens at build, since the public site is
prerendered.

### 5. Summaries are cheap, detail renders on demand

The index returns plain-data summaries for lists, feeds, and the sitemap, and renders full
HTML only for a single entry's own page.

```ts
/** A raw content file before parsing. */
interface RawFile {
  path: string;   // the glob key, e.g. "/src/content/posts/first.md"
  raw: string;    // the file's full markdown text, frontmatter included
}

/** The cheap, plain-data view of one entry. */
interface ContentSummary {
  id: string;
  permalink: string;
  title: string;
  date?: string;        // ISO calendar date; absent on undated concepts
  updated?: string;     // ISO; sitemap lastmod falls back to date
  tags: string[];
  excerpt: string;      // plain text, derived
  wordCount: number;
  draft: boolean;
}

/** The detail view: a summary plus the body to render. */
interface ContentEntry extends ContentSummary {
  frontmatter: Record<string, unknown>;
  body: string;         // markdown, not yet rendered
}
```

The excerpt prefers frontmatter `description`. When that is absent, the engine derives a
clean plain-text excerpt from the body and cuts it at a word boundary, so a list card or an
`og:description` never leaks markup or truncates mid-syntax. The word count ships as a
datum, and reading-time is the template's to render.

### 6. Builders are pure, loaders are thin, the engine ships no public components

The split inside this layer is logic up, presentation down.

- **Pure builders** in the root entry return strings or plain data and take plain data in:
  `buildRssFeed`, `buildJsonFeed`, `buildSitemap`, `buildRobots`, `buildSeoMeta`,
  `paginate`, `deriveExcerpt`. They have no I/O and no framework imports, so they are
  trivially unit-tested.
- **Thin loaders** in the `/sveltekit` subpath are factories that wire a site's index, its
  `render`, and the origin into those builders: an entry-detail load, an archive load, a
  tag-index load, a single-tag load, and `entries()` helpers for prerender. A route file is
  a one-line shim, the same pattern the admin routes already use.
- **No public Svelte component** enters the engine. The `/components` subpath stays
  admin-only, and the page markup, layout, and card design stay in the template. This is the
  line that keeps the engine design-agnostic.

The whole surface is additive to the existing three subpaths. There is no fourth subpath and
no reshape of the exports map, so `publint` and `@arethetypeswrong/cli` keep passing.

### 7. One date and one origin convention

Frontmatter `date` is a calendar date pinned to UTC, sliced from the ISO string the way
`dateInputValue` already does, so sorting and feed timestamps never shift across a timezone.
RSS formats dates as RFC-822 and JSON Feed as ISO-8601, both in UTC. Sitemap `lastmod` uses
`updated` when present, else `date`. Every absolute URL comes from the engine's existing
`PUBLIC_ORIGIN` through `requireOrigin`, never from a request header. Drafts are excluded by
one default filter, with an `includeDrafts` escape for admin and preview contexts.

## The delivery layer is concept-generic

Every module operates on a `ConceptDescriptor` and its `RoutingRule`, never on a hardcoded
"posts". The index is built from a descriptor, the permalink resolver reads the descriptor's
pattern, feeds and the sitemap consult `routing.inFeeds` and `routing.dated`, and the
archive and tag loaders take whichever index they are given. A synthetic third concept
exercises this in the test suite, so the contract is proven rather than assumed. When a site
adds a `news` concept through the extension seam, delivery works for it with no change here.

## New and changed contract

### `ConceptConfig` gains a permalink pattern

```ts
interface ConceptConfig {
  dir: string;
  label?: string;
  fields: FrontmatterField[];
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
  permalink?: string;   // the pattern, e.g. "/posts/:slug"; normalizeConcepts fills a per-concept default
}
```

`normalizeConcepts` carries the pattern onto the `ConceptDescriptor` and fills the
per-concept default when a site omits it. Pages get `/:slug`, and any other routable
concept gets `/<conceptId>/:slug`. `dir` keeps serving the write path (the commit target
directory), and the public read path globs the same directory in template code.

### The adapter renderer is renamed

`renderPreview` becomes `render` on `CairnAdapter` and `CairnRuntime`. The two live sites
update one field name in `cairn.config.ts` at migration. The signature gains the optional
`stagger` flag so a public page can opt into the entrance cascade.

### The query and builder surface

```ts
interface ContentIndex {
  all(opts?: { includeDrafts?: boolean }): ContentSummary[];      // newest-first for dated concepts
  byId(id: string): ContentEntry | undefined;
  byTag(tag: string, opts?: { includeDrafts?: boolean }): ContentSummary[];
  allTags(): { tag: string; count: number }[];
  adjacent(id: string): { prev?: ContentSummary; next?: ContentSummary };
}

function createContentIndex(files: RawFile[], descriptor: ConceptDescriptor): ContentIndex;
function fromGlob(record: Record<string, string>): RawFile[];

interface FeedChannel {
  title: string;
  description: string;
  siteUrl: string;        // PUBLIC_ORIGIN
  feedUrl: string;        // this feed's absolute URL
  language?: string;
  author?: { name: string; email?: string };
}
interface FeedItem {
  title: string;
  url: string;            // absolute
  date: string;           // ISO
  updated?: string;
  summary: string;        // the excerpt
  contentHtml?: string;   // rendered body, for a full-content feed
  tags?: string[];
}
function buildRssFeed(channel: FeedChannel, items: FeedItem[]): string;   // XML
function buildJsonFeed(channel: FeedChannel, items: FeedItem[]): string;  // JSON

interface SitemapUrl { loc: string; lastmod?: string }
function buildSitemap(urls: SitemapUrl[]): string;                        // XML
function buildRobots(opts: { sitemapUrl: string; disallow?: string[] }): string;

interface SeoInput {
  title: string;
  description: string;
  canonicalUrl: string;   // absolute
  siteName: string;
  type?: 'website' | 'article';
  published?: string;
  modified?: string;
  feeds?: { rss?: string; json?: string };   // absolute URLs for autodiscovery
  image?: string;         // optional; og:image generation is a plugin
}
interface SeoMeta {
  title: string;
  meta: { name?: string; property?: string; content: string }[];
  links: { rel: string; type?: string; href: string; title?: string }[];
  jsonLd: Record<string, unknown>;
}
function buildSeoMeta(input: SeoInput): SeoMeta;

interface Page<T> {
  items: T[];
  page: number;           // 1-based
  perPage: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}
function paginate<T>(items: T[], page: number, perPage: number): Page<T>;

function deriveExcerpt(body: string, opts?: { description?: string; maxChars?: number }): string;
function wordCount(body: string): number;
```

## Proposed engine layout

The implementer refines the exact files; this is the intended shape.

```
src/lib/content/permalink.ts       permalink() and pattern parsing and validation
src/lib/delivery/content-index.ts  RawFile, ContentSummary, ContentEntry, ContentIndex, createContentIndex, fromGlob
src/lib/delivery/excerpt.ts        deriveExcerpt, wordCount
src/lib/delivery/feeds.ts          FeedChannel, FeedItem, buildRssFeed, buildJsonFeed
src/lib/delivery/sitemap.ts        SitemapUrl, buildSitemap
src/lib/delivery/robots.ts         buildRobots
src/lib/delivery/seo.ts            SeoInput, SeoMeta, buildSeoMeta
src/lib/delivery/paginate.ts       Page, paginate
src/lib/sveltekit/public.ts        load factories and entries() helpers
```

The root entry re-exports the builders, the index factory, the permalink resolver, and the
new types. The `/sveltekit` subpath re-exports the public loaders alongside the admin route
factories. The `/components` subpath is untouched.

## Bundle safety and prerender

The public delivery path is prerender-first. A site globs its content and renders pages at
build, and Cloudflare serves the static output from Static Assets. The content and the
render pipeline must stay in the build-and-prerender graph and out of the runtime Worker, so
the bundle and startup guards keep passing. The design supports this by keeping the index in
a site module that only the public routes import, separate from the runtime adapter the
admin loads. A site that chooses to server-render a public route accepts the bundle cost of
doing so. The existing `wrangler deploy --dry-run` guard catches a regression where content
or the renderer leaks into the Worker.

## Test plan

The layer is mostly pure functions, so the suite is unit-heavy and deterministic.

- **Permalink resolver.** Table-driven over each token, literal segments, the dated
  defaults, a date token on an undated concept failing loudly, and an entry missing its date
  failing loudly.
- **Content index.** Newest-first ordering, draft exclusion and the `includeDrafts` escape,
  `byTag`, `allTags` counts, `byId`, `adjacent` including both ends, and the `fromGlob`
  mapping.
- **Excerpt and word count.** The description override, the body-derived excerpt, the
  word-boundary cut, and an empty body.
- **Feeds.** Characterization snapshots for RSS and JSON, XML and JSON escaping, full versus
  summary content, and the RFC-822 and ISO-8601 date formats in UTC.
- **Sitemap and robots.** The URL list to XML, `lastmod` from `updated` else `date`,
  escaping, and the robots sitemap line plus disallow rules.
- **SEO.** The meta, link, and JSON-LD shapes for the website and article types, the feed
  autodiscovery links, the canonical link, and absolute URLs.
- **Pagination.** Slicing, the boundaries, `hasPrev` and `hasNext`, `totalPages`, and an
  out-of-range page.
- **Concept-generic contract.** Build the index, a feed, and the sitemap for a synthetic
  third concept, proving no module hardcodes "posts".
- **Build and bundle.** A fixture site prerenders the public routes through `entries()`, and
  the dry-run bundle guard stays green with the layer wired.

## Acceptance scenarios

These define done. Each maps to a test layer.

1. The index lists a concept's entries newest-first and excludes drafts by default;
   `includeDrafts` reveals them.
2. The permalink resolver produces each concept's pattern, and a date token on an undated
   concept fails at build rather than emitting a broken path.
3. RSS and JSON feeds validate and carry absolute URLs from `PUBLIC_ORIGIN`, with RFC-822
   and ISO-8601 dates in UTC.
4. The sitemap lists every routable entry with `lastmod` from `updated` else `date`, and
   `robots.txt` points at the sitemap.
5. The SEO builder emits the title, meta description, canonical link, feed autodiscovery
   links, and `WebSite` or `Article` JSON-LD.
6. The tag index and a single tag list the right entries, the archive lists newest-first,
   and pagination slices correctly.
7. The editor preview and the public render produce identical HTML for the same markdown.
8. Excerpts prefer frontmatter `description`, else derive clean plain text from the body.
9. The whole layer works for a synthetic third concept, proving it is concept-generic.
10. The runtime Worker stays under the dry-run bundle and startup guards with the layer
    wired, because content and the renderer stay in the prerender graph.

## Migration impact on the two sites

The sites delete their hand-rolled `posts.ts` and `feed.ts` and wire the engine index,
builders, and loaders. Each renames `renderPreview` to `render` in `cairn.config.ts` and
declares a permalink pattern per concept. Both sites currently use a dated URL, so adopting
the new flat default would change every post URL and needs redirects; keeping a dated
pattern preserves the current URLs. That choice, and any redirects, belong to the cutover
plan rather than this design.

## Risks

- **Bundle creep.** Pulling content or the render pipeline into the runtime Worker would
  blow the size guard. The mitigation is the prerender-graph separation above, watched by the
  dry-run guard.
- **The permalink resolver is load-bearing.** One wrong resolver makes every URL in the
  system wrong. The mitigation is a single resolver, table-driven tests, and failing loud on
  an invalid pattern.
- **The renderer rename touches the adapter contract.** It is a mechanical, typed rename on
  both sites, caught by `svelte-check`.
- **Excerpt fidelity.** A light markdown strip is approximate. The mitigation is the
  frontmatter `description` override for anything that matters.
- **URL migration breaks links.** Changing a live site's pattern breaks existing links. The
  mitigation is redirects, handled in the cutover plan.

## Out of scope

- Search, which ships as the first `CairnExtension` with a Pagefind reference.
- The site settings panel, which is a sibling spec.
- `og:image` generation, breadcrumbs, related posts, and redirects management.
- Favicon, web manifest, the `lang` attribute, the skip link, and the 404 page, which the
  template ships.
- URL-nested subpages and a second curated stream concept, both deferred behind existing
  seams.
- Media and uploads (R7), still reserved by the adapter's asset slot.

## Sequencing and rebuild fit

This layer slots before the scaffolder, because the templates the scaffolder copies are
thin only if the public-delivery logic they would otherwise carry already lives in the
engine. It is independent of and complementary to the extension dispatch: the extension seam
contributes concepts and admin panels, and this layer delivers whatever concepts exist. It
removes the largest remaining body of drift-prone hand-rolled site code, so it is a strong
candidate to land before a stable `0.6.0`. The plan number is assigned when the plan is
written.
