# Delivery data (`@glw907/cairn-cms/delivery/data`)

The server-safe data half of `/delivery`; everything here imports no Svelte. This subpath holds
the index builders, the feed, sitemap, and robots builders and responders, the SEO head builder,
and the small pure helpers. All of it is node-safe pure projection: nothing pulls `@sveltejs/kit`
into the module graph, so a plain-Node tool such as the manifest bin or the Vite plugin can import
the builders. A SvelteKit site usually imports these symbols through the
[`/delivery`](./delivery.md) barrel, which re-exports this whole surface. Import from
`/delivery/data` directly for a builder used outside the SvelteKit runtime. A
SvelteKit-route-facing loader belongs on `/delivery` instead, even one built from these same
projections, and a rendering component on [`/delivery/head`](./delivery.md#cairnhead), so this
subpath stays importable from plain Node with no kit or Svelte dependency resolved.

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

### `sitemapView`

Stability tier: Extension API.

```ts
function sitemapView(
  site: SiteResolver,
  descriptors: ConceptDescriptor[],
  origin: string,
  extraRoutes?: string[],
): SitemapUrl[];
```

Project a site's routable concepts into sitemap URLs. It iterates the concepts whose
`routing.routable` flag is set and maps each entry to a `SitemapUrl`. The `loc` is the
origin-anchored permalink. The `lastmod` is the entry's `updated` date when present, else its `date`.
An embedded, non-routable concept never appears. Pass `origin` because each `loc` is absolute.

`extraRoutes` carries the site's own bespoke, non-concept pages, such as an about page or a tag
index, as root-relative paths like `['/about', '/tags']`. Each becomes an origin-anchored
`SitemapUrl` with no `lastmod`, ahead of every concept URL, in the order given. Omit it and only
the concept URLs appear.

### `buildRobots`

Stability tier: Extension API.

```ts
function buildRobots(opts: { sitemapUrl: string; disallow?: string[]; posture?: AiPosture }): string;
```

Build a robots.txt body that points at the sitemap and disallows the given paths. `posture` is
optional and, left unset, changes nothing: the output is byte-identical to a site that states no
posture, which is every site on the engine today. `'decline'` adds `Content-Signal: ai-train=no`
and one `User-agent`/`Disallow: /` group per training-crawler token in its internal table.
`'invite'` adds `Content-Signal: search=yes, ai-train=yes` and no `Disallow`, since no robots
directive invites a crawler.

Declining is a request that named crawlers say they honor, not enforcement. robots.txt has no
mechanism to block a fetch. OpenAI's `ChatGPT-User` and Perplexity's `Perplexity-User` are exempt
from robots.txt by their own operators' first-party design, so a fully declining site can still
receive a live fetch when someone asks an assistant about it. See the [`AiPosture`](#types) row
below for the full honesty constraint, carried on `CairnAdapter.aiPosture`.

`Content-Signal` syntax follows Cloudflare's published policy
(https://blog.cloudflare.com/content-signals-policy/): directive `Content-Signal`, keys
`search`/`ai-input`/`ai-train`, values `yes`/`no`. An absent key states no preference. That is why
a declining site emits `ai-train=no` alone. cairn has no standing to assert a search preference on
a site's behalf.

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
      contentHtml: await cairn.rendering.render({ body: posts!.byId(p.id)!.body, resolve }),
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
function robotsResponse(opts: { sitemapUrl: string; disallow?: string[]; posture?: AiPosture }): Response;
```

Wrap a robots.txt body in a `Response`. `posture` passes through to [`buildRobots`](#buildrobots)
unchanged. The content type is `text/plain; charset=utf-8` regardless of posture. The showcase
route points at the sitemap and disallows `/admin`.

```ts
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN } from '$lib/content';

export const GET = () =>
  robotsResponse({ sitemapUrl: ORIGIN + '/sitemap.xml', disallow: ['/admin'] });
```

### `markdownResponse`

Stability tier: Extension API.

```ts
function markdownResponse(opts: { body: string }): Response;
```

Wrap an entry's stored markdown body in a `Response` with `text/markdown; charset=utf-8`. `body` is
the raw markdown, unrendered: cairn stores markdown natively, so serving the twin is a direct read
rather than a reconstruction from rendered html. Pairs with `createPublicRoutes`'s
`markdownEntries`/`markdownLoad` ([`/delivery`](./delivery.md#createpublicroutes)), which enumerate
and load the twin for every routable, non-`noindex` entry; `markdownLoad` is also what applies the
`noindex` refusal, so a lookup that bypasses it (a hand-rolled `site.byPermalink` call, say) would
serve a body the enumerator never listed.

```ts
import { createPublicRoutes, markdownResponse } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn, siteConfig } from '$lib/cairn.config';

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: SITE_DESCRIPTION,
});

export const GET = async ({ url }: { url: URL }) => {
  const { body } = await routes.markdownLoad({ url });
  return markdownResponse({ body });
};
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

```ts
import { buildSeoMeta, type ContentEntry } from '@glw907/cairn-cms/delivery/data';
import { ORIGIN } from '$lib/content';
import { siteConfig } from '$lib/cairn.config';

declare const entry: ContentEntry;

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

```ts
import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
import { cairn, siteConfig } from '$lib/cairn.config';
import { postsRaw, pagesRaw } from './content-globs.js';

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

### `buildFragmentResolver`

Stability tier: Extension API.

```ts
function buildFragmentResolver(site: SiteResolver): FragmentResolve;
```

Build a fragment-body resolver backed by the site resolver, for the build. A miss (an unknown
fragment id, or a site with no `fragments` concept declared) throws, so a dangling `::include`
fails the prerender the same way a dangling `cairn:` link does. `createPublicRoutes` wires this
into every entry render as `resolveFragment`.

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

```ts
import { resolveReferences, type ResolvedReference, type ContentEntry } from '@glw907/cairn-cms/delivery';
import type { ConceptDescriptor } from '@glw907/cairn-cms';
import { site } from '$lib/content';

declare const postsDescriptor: ConceptDescriptor;
declare const entry: ContentEntry;

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

### `parseManifest`

Stability tier: Extension API.

```ts
function parseManifest(raw: string): Manifest;
```

Parse a committed manifest file's raw text. Throws on malformed JSON, a wrong version, or a
malformed entry, so a caller sees a well-formed graph or a clear error rather than a broken shape
fed silently into the diff. Use it to validate a manifest your own code fetches, such as the
`before`/`after` pair [`newlyPublishedEntries`](#newlypublishedentries) takes, instead of casting
the fetched JSON yourself.

```ts
import { parseManifest, type Manifest } from '@glw907/cairn-cms/delivery/data';

declare function fetchManifestFile(): Promise<string>;

async function readDeployedManifest(): Promise<Manifest> {
  return parseManifest(await fetchManifestFile());
}
```

### `newlyPublishedEntries`

Stability tier: Extension API.

```ts
function newlyPublishedEntries(before: Manifest | null, after: Manifest): ManifestEntry[];
```

Diff two manifests down to the entries a deploy just carried across the first-publish transition:
`after` entries that carry a `publishedAt` stamp, whose same concept-and-id counterpart in `before`
was absent or itself unstamped. An entry that carried its stamp forward from `before`, an entry that
was already non-draft but never stamped, and a draft never match, since none of them changes the
stamp between the two manifests. An entry deleted from `after` never returns. The helper is pure
and node-safe. It performs no I/O and reads no clock, so a caller supplies both manifests and gets a
deterministic result back. The engine sends nothing over the network and runs no scheduler. A
consumer diffs and then acts on the result, the seam an announce-on-publish integration builds on.

Pass `before: null` to mean no prior manifest exists. Every stamped entry in `after` then comes back,
a full fan-out. A consumer wiring announce-on-publish has to persist the prior deployed manifest
itself, since the engine keeps no state across deploys, and should pass `null` only when a fan-out
over every already-published entry is actually wanted, such as a first backfill run.

Renaming a published entry changes its `concept`/`id` key, cairn's identity model. This helper reads
the renamed entry as newly published: the old key's stamped row no longer appears in `after`, and the
new key's stamped row has no stamped counterpart in `before`. A consumer that renames published
entries should expect the rename to read as a new publish here.

```ts
import { newlyPublishedEntries, type Manifest } from '@glw907/cairn-cms/delivery/data';

declare const priorManifest: Manifest | null;
declare const deployedManifest: Manifest;

for (const entry of newlyPublishedEntries(priorManifest, deployedManifest)) {
  // Fan out from the consumer's own endpoint; the engine sends nothing.
}
```

---

## Types

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `ContentSummary` | Extension API | `interface ContentSummary { concept; id; slug; permalink; title; date?; updated?; tags: string[]; excerpt; wordCount; draft; fields }` | The cheap plain-data view of one entry, for lists, feeds, and the sitemap. |
| `ContentEntry` | Extension API | `interface ContentEntry<F = Record<string, unknown>> extends ContentSummary { frontmatter: F; body: string }` | The detail view: a summary plus the typed frontmatter and the body to render. |
| `ContentProblem` | Extension API | `interface ContentProblem { id: string; draft: boolean; errors: Record<string, string> }` | One entry's validation failure, recorded at build for the site aggregator's gate. |
| `ContentIndex` | Extension API | `interface ContentIndex<F = Record<string, unknown>> { all; byId; byTag; allTags; adjacent; problems }` | The per-concept query surface `createSiteIndexes` builds one of per concept. |
| `SiteResolver` | Extension API | `interface SiteResolver { byPermalink; adjacent; entries; concept; all; routable }` | The cross-concept query surface a catch-all route and the sitemap read. `byPermalink` resolves one entry by request path; `routable` reports whether a concept id is publicly reachable. |
| `SiteGlobs` | Extension API | `type SiteGlobs<A extends CairnAdapter> = { [K in keyof A['content']]?: Record<string, string> }` | A per-concept raw glob record keyed by concept id, from `import.meta.glob`. |
| `SiteIndexes` | Extension API | `type SiteIndexes<A> = { [K in keyof A['content']]: ContentIndex<...> } & { readonly site: SiteResolver }` | The typed per-concept indexes plus the cross-concept `site` resolver, the return of `createSiteIndexes`. |
| `FeedChannel` | Extension API | `interface FeedChannel { title; description; siteUrl; feedUrl; language?; author? }` | Feed channel metadata, with absolute URLs. |
| `FeedItem` | Extension API | `interface FeedItem { title; url; date?; updated?; summary; contentHtml?; tags? }` | One feed entry; `contentHtml` carries the rendered body for a full-content feed. |
| `SitemapUrl` | Extension API | `interface SitemapUrl { loc: string; lastmod?: string }` | One sitemap URL; `lastmod` is a YYYY-MM-DD date. |
| `AiPosture` | Extension API | `type AiPosture = 'invite' \| 'decline'` | A site's stated stance toward AI training crawlers, set on `CairnAdapter.aiPosture` and read by [`buildRobots`](#buildrobots)/[`robotsResponse`](#robotsresponse). Declining is a request named crawlers say they honor, not enforcement. |
| `SeoInput` | Extension API | `interface SeoInput { title; description; canonicalUrl; siteName; type?; published?; modified?; feeds?; image?; imageAlt?; robots?; author? }` | The inputs for the head builder, all URLs absolute. `imageAlt` becomes `twitter:image:alt` when `image` is set. |
| `SeoMeta` | Extension API | `interface SeoMeta { title; meta; links; jsonLd }` | The plain-data head: a title, meta tags, link tags, and one JSON-LD object. |
| `SeoFields` | Extension API | `interface SeoFields { description?; image?; robots?; author? }` | The optional SEO head fields a concept can carry in frontmatter. |
| `ResolvedReference` | Extension API | `interface ResolvedReference { id; concept; title; permalink; summary? }` | A reference edge resolved to its target's identity, for a public route to render a linked target. |
| `ManifestEntry` | Extension API | `interface ManifestEntry { id; concept; title; date?; permalink; summary?; draft; links; mediaRefs?; references?; tags?; includes?; publishedAt? }` | One corpus entry as the manifest holds it, the element type of `Manifest.entries` and `newlyPublishedEntries`'s return. `publishedAt`, ISO 8601 in UTC, is set once at the publish commit that first lands the entry non-draft and never overwritten or cleared afterward. |
| `Manifest` | Extension API | `interface Manifest { version: 1; entries: ManifestEntry[] }` | The whole corpus as one committed file, with a version guard. `parseManifest` and `newlyPublishedEntries`'s `before`/`after` parameters carry this type. |

The remaining rows are the export-rule closure `buildSiteManifest` and `createSiteIndexes`'s
`CairnAdapter` generic bound names (CHANGELOG `0.94.0`): the content-model member types
`CairnAdapter`'s own structure names, down to its own nested shapes, re-exported here so a site
importing only from this subpath can still name the value it holds. Each links to its canonical
home, [Core](./core.md), where the full prose lives. `CairnAdapter`'s `roles`, `access`, and
`backend` members name auth- and github-shaped types this subpath's charter forbids importing (see
the deliberate exception below), so their nested types (`AccessMap`, `RolesDeclaration`,
`RoleDeclaration`, `Capability`, `Backend`, `BackendProvider`, `RepoFile`, `CommitAuthor`,
`FileChange`, `CairnEnv`, `EmailSender`, `MagicLinkMessage`, `EmailAttachment`,
`EmailRecipient`) aren't part of this closure and aren't importable from `/delivery/data`.

**Import an adapter-only member from its own home.** Eighteen names this subpath once re-exported
now import from the barrel that declares them, because nothing this subpath publishes names them.

- From [the root barrel](./core.md): `AssetConfig`, `SenderConfig`, `NavMenuConfig`,
  `PreviewConfig`, `SiteRender`, `ComponentRegistry`, `ComponentDef`, `ComponentContext`,
  `SlotDef`, `IconSet`, `MediaResolve`.
- From [`/sveltekit`](./sveltekit.md): `NavLayout`, `NavLayoutEntry`, `NavLayoutEngineRef`,
  `NavLayoutSection`.
- From [`/islands`](./islands.md): `IslandRegistry`.
- From [`/media`](./media.md): `MediaRef`, `VariantSpec`.

`MediaRef`, `MediaResolve`, and `SiteRender` are also importable from
[`/delivery`](./delivery.md), whose `PublicRoutesConfig` names all three.

**`CairnAdapter` itself is the one deliberate exception.** This subpath's own charter forbids
importing from `github`, `auth`, or `email` (enforced by a source-boundary test, so the delivery
layer never pulls the backend or the magic-link auth surface into a public bundle), and
`CairnAdapter`'s own body reaches all three through `roles`, `access`, and `backend`. `A`'s bound
stays [`CairnAdapter`](./core.md#stable-api), imported from the root barrel a site already has in
scope to declare its adapter; `createSiteIndexes(adapter, config, globs)` infers `A` from the
`adapter` argument in every real call site, so no site writes the bound out by name.

| `FragmentResolve` | Extension API | `type FragmentResolve = (id: string) => string \| undefined` | Resolve a fragment id to its raw markdown body, for the `::include` directive. |
| `LinkResolve` | Extension API | `type LinkResolve = (ref: CairnRef) => string \| undefined` | Resolve a `CairnRef` to its live permalink. |
| `ConceptConfig` | Extension API | `interface ConceptConfig<S>` | Per-site configuration for one content concept. See [`ConceptConfig`](./core.md#stable-api). |
| `ConceptDescriptor` | Extension API | `interface ConceptDescriptor` | The engine-internal, uniform view of one concept after normalization. See [`ConceptDescriptor`](./core.md#stable-api). |
| `NamedField` | Extension API | `type NamedField = FieldDescriptor & { name: string }` | A field descriptor with its frontmatter key re-attached as `name`. See [`NamedField`](./core.md#stable-api). |
| `RoutingRule` | Extension API | `interface RoutingRule { routable: boolean; dated: boolean; inFeeds: boolean }` | Concept-fixed routing for a normalized concept. See [`RoutingRule`](./core.md#types). |
| `ValidationResult` | Extension API | `type ValidationResult` | A validator's verdict: normalized data, or field-keyed `errors` plus the additive located `issues`. |
| `ValidationIssue` | Extension API | `interface ValidationIssue` | One validation failure located by a `path` and its message. |
| `FieldDescriptor` | Extension API | `type FieldDescriptor` | The plain-data descriptor union the form, validator, and inference all read. See [Field types](./core.md#field-types). |
| `TextField` | Extension API | `interface TextField` | A single-line text input. One of `FieldDescriptor`'s fifteen arms; see [Field types](./core.md#field-types). |
| `TextareaField` | Extension API | `interface TextareaField` | A multi-line text input. |
| `NumberField` | Extension API | `interface NumberField` | A numeric input. |
| `SelectField` | Extension API | `interface SelectField` | A single-choice input over a closed option list. |
| `MultiselectField` | Extension API | `interface MultiselectField` | A multiple-choice input. |
| `UrlField` | Extension API | `interface UrlField` | A URL input whose format the validator enforces. |
| `EmailField` | Extension API | `interface EmailField` | An email-address input whose format the validator enforces. |
| `DateField` | Extension API | `interface DateField` | A calendar-date input. |
| `DatetimeField` | Extension API | `interface DatetimeField` | A date-and-time input. |
| `BooleanField` | Extension API | `interface BooleanField` | A checkbox; absent means false. |
| `IconField` | Extension API | `interface IconField` | A glyph chosen from the adapter's icon set. |
| `ImageField` | Extension API | `interface ImageField` | A hero image whose stored value is the nested `ImageValue` object. |
| `ObjectField` | Extension API | `interface ObjectField` | A group of leaf fields, stored as a nested object. |
| `ReferenceField` | Extension API | `interface ReferenceField` | A single edge to one entry of a named concept, stored as that target's permanent id. |
| `ArrayField` | Extension API | `interface ArrayField` | A repeatable field whose stored value is a list of its item's values. |
| `Fieldset` | Extension API | `interface Fieldset<R>` | The schema a `fieldset` call returns, carrying the descriptors, the behavior table, the validator, and the Standard Schema property. |
| `InferFieldset` | Extension API | `type InferFieldset<S>` | Extracts the normalized frontmatter type from a `Fieldset`. |
| `BehaviorTable` | Extension API | `type BehaviorTable = Record<string, FieldBehavior>` | The behavior table co-bundled with a fieldset, keyed by field name. |
| `FieldBehavior` | Extension API | `interface FieldBehavior` | Function-valued behavior a field descriptor cannot carry as plain data. |
| `DatePrefix` | Extension API | `type DatePrefix = 'year' \| 'month' \| 'day'` | Filename date-prefix granularity for a dated concept. |
| `CairnRef` | Extension API | `interface CairnRef { concept: string; id: string }` | A resolved reference to a content entry by its concept and permanent id. |
| `ReferenceEdge` | Extension API | `interface ReferenceEdge { field: string; concept: string; id: string }` | One typed frontmatter edge from a content entry to a target entry. See [`ReferenceEdge`](./core.md#types). |
| `SiteConfig` | Extension API | `interface SiteConfig` | The shape of the YAML site-config file. |
| `VocabularyEntry` | Extension API | `interface VocabularyEntry { value: string; label: string }` | One editor-owned tag: a frozen slug `value` and an editable display `label`. |
| `TidyConfig` | Extension API | `interface TidyConfig { enabled?; model?; conventions? }` | The tidy block on the site config. See [`TidyConfig`](./core.md#types). |
| `TidyConventions` | Extension API | `interface TidyConventions` | The corrected convention set the tidy prompt builder consumes. |
| `PublishActionsConfig` | Extension API | `type PublishActionsConfig = PublishActionEntry[]` | A site's raw `publishActions` config. |
| `PublishActionEntry` | Extension API | `interface PublishActionEntry { label: string; href: string; concepts?: string[] }` | One developer-declared publish-success next-step link. |
