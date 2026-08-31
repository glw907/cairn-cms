# Delivery (`@glw907/cairn-cms/delivery`)

This subpath is the public read model for a SvelteKit site. It carries the catch-all route loader,
the public route-data types, and the feed, sitemap, and robots responders. Import it from a
`+server.ts` or a `+page.server.ts` in the reader-facing site. The matching head
component, [`CairnHead`](#cairnhead), lives one level down at `/delivery/head`. This subpath
carries the SvelteKit-route-facing readers; a pure projection with no kit dependency lives on
[`/delivery/data`](./delivery-data.md) alone, and the `.svelte` head component stays split onto
`/delivery/head`, so neither pulls Svelte into a plain-Node build.

```ts
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
```

The TypeScript types in `src/lib` are the source of truth, and the export-coverage gate checks every
name here against them.

---

## The re-exported `/delivery/data` surface

`/delivery` re-exports the entire [`/delivery/data`](./delivery-data.md) surface: the index builders,
the feed, sitemap, and robots builders and responders, the SEO head builder, and the small pure
helpers. Those symbols are documented on [the delivery-data reference](./delivery-data.md) and are not
repeated here. This page covers only the names `/delivery` adds on top of that surface: the
`createPublicRoutes` loader factory and its route-data types.

A SvelteKit site usually imports the shared symbols through this barrel. The `feed.xml`, `feed.json`,
`sitemap.xml`, and `robots.txt` showcase servers all reach `rssResponse`, `sitemapResponse`, and
`robotsResponse` through `@glw907/cairn-cms/delivery`.

---

## `createPublicRoutes`

Stability tier: Scaffold API.

```ts
function createPublicRoutes(deps: PublicRoutesConfig): {
  entryLoad: (event: { url: URL }) => Promise<EntryData>;
  entries: () => { path: string }[];
  markdownEntries: () => { path: string }[];
  markdownLoad: (event: { url: URL }) => Promise<{ body: string }>;
};
```

Build the public route loader for a site's unified index. Pass the
[`PublicRoutesConfig`](#publicroutesconfig): the built site resolver, the render function, the origin, and
the SEO defaults. The returned object carries `entryLoad`, the one loader the catch-all route calls,
and `entries`, the prerender enumerator. `entryLoad` resolves one entry by request path and folds in
the rendered html, the SEO head, and the hero; it throws `error(404)` on a miss.

`markdownEntries` and `markdownLoad` build the raw-markdown twin: one `.md`-suffixed path per entry
whose frontmatter `robots` field doesn't carry `noindex`, and a loader that resolves the same
`.md`-suffixed request path back to the entry's stored body, unrendered. `markdownLoad` throws
`error(404)` on a miss, the same as `entryLoad`, and on a `noindex` entry, so the loader and the
enumerator agree whether or not the site's route is prerendered. Both read only through the injected `SiteResolver`,
so a request for a path the resolver doesn't carry gets `error(404)`, and nothing outside the
resolver's own committed content can reach a response. Pair `markdownEntries`/`markdownLoad` with
[`markdownResponse`](./delivery-data.md#markdownresponse) in a prerendered `+server.ts`, never a
runtime one, so the served set is always what a build against `main` produced.

`entryLoad` composes each entry's data through `composeEntryData`, exported separately below for a
caller that needs the same composition over a different lookup: [`previewLoad`](./sveltekit.md#previewload)
(`/sveltekit`) is the one other caller today, rendering a shared draft through this identical
composition so a preview and its eventual public page can't structurally drift.

The showcase wires `entryLoad` and `entries` into its `[...path]` catch-all server. The
`+page.server.ts` calls `entryLoad` and the `+page.svelte` renders the entry directly.

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
  // entryLoad resolves one entry by request path and throws error(404) on a miss. The returned
  // payload carries the rendered html, the SEO head, and the hero.
  return routes.entryLoad({ url });
};
```

---

## Route-data types

The shapes the public loaders return and consume. A template reads the loaded data; a server passes
the deps.

Three of them belong to another barrel and re-export here because `PublicRoutesConfig` names all
three. Their prose lives at the canonical home. This page carries only the import.

| Name | Stability | Canonical home |
|---|---|---|
| `SiteRender` | Extension API | [the root barrel](./core.md) |
| `MediaResolve` | Extension API | [the root barrel](./core.md) |
| `MediaRef` | Extension API | [`/media`](./media.md#types) |

### `PublicRoutesConfig`

Stability tier: Extension API.

```ts
interface PublicRoutesConfig {
  site: SiteResolver;
  render: SiteRender;
  origin: string;
  siteName: string;
  description: string;
  feeds?: { rss?: string; json?: string };
  defaultImage?: string;
  resolveMedia?: MediaResolve;
}
```

The injected dependencies for the public loaders. `render` turns an entry's markdown into html,
`origin` and `feeds` build the absolute URLs in the head, and `description` and `defaultImage` are the
site-wide fallbacks for an entry that declares none. `resolveMedia` resolves a frontmatter `media:`
hero reference to its delivery path; the site builds it from its committed `media.json` exactly as it
builds the body resolver, and when it is absent no `heroImage` projection is derived.

### `EntryData`

Stability tier: Extension API.

```ts
interface EntryData {
  concept: string;
  entry: ContentEntry;
  html: string;
  canonicalUrl: string;
  seo: SeoMeta;
  newer?: ContentSummary;
  older?: ContentSummary;
  heroImage?: { url: string; absoluteUrl?: string; alt: string; caption?: string };
}
```

One entry's data: the detail entry, its rendered html, its canonical URL, the SEO head, and the
adjacent entries for prev and next links. `entryLoad` returns this shape. `heroImage` is a derived
projection of the frontmatter `image` field, resolved through `resolveMedia`: `url` is the
root-relative path for an `<img>` and `absoluteUrl` the origin-anchored form for the og:image. The
canonical token is left untouched, so `entry.frontmatter.image.src` stays the `media:` token, and
`heroImage` is undefined when no hero is set, media is off, or the reference does not resolve.

### `composeEntryData`

Stability tier: Unstable API.

```ts
declare function composeEntryData(config: PublicRoutesConfig, entry: ContentEntry<Record<string, unknown>>, overrides?: EntryDataOverrides): Promise<EntryData>;
```

The per-entry composition `entryLoad` runs for every request: the rendered html, the SEO head, the
adjacent-entry pair, and the hero projection, folded into one `EntryData`. `entryLoad` is
lookup-then-compose over this function with no `overrides`, so its output is unchanged from before
this function existed; `overrides` exists for a caller that resolves an entry through a different
lookup and needs the identical composition, so a second render path can't drift from the public
one by hand-copying it. [`previewLoad`](./sveltekit.md#previewload) is that caller today,
substituting the marking link and fragment resolvers built from the pending branch's manifest and a
request-time media resolver in place of the build's throwing pair and the site's committed
`media.json`.

### `EntryDataOverrides`

Stability tier: Unstable API.

```ts
interface EntryDataOverrides {
  resolveLink?: LinkResolve;
  resolveFragment?: FragmentResolve;
  resolveMedia?: MediaResolve;
}
```

Substitutes for `composeEntryData`'s three resolvers, each defaulting to the build's own (throwing)
pair drawn from `config.site`, or `config.resolveMedia` for the hero, when left unset.
`resolveLink` substitutes `buildLinkResolver(config.site)`, `resolveFragment` substitutes
`buildFragmentResolver(config.site)`, and `resolveMedia` substitutes `config.resolveMedia`,
consumed by both the hero derivation and the body render.

---

## `CairnHead`

`/delivery/head` carries exactly the one Svelte component. A plain-data SEO helper, `SeoMeta`
included, belongs on [`/delivery/data`](./delivery-data.md) instead, even one this component
itself consumes, so a plain-Node tool never resolves a component just to reach the data it
renders.

Stability tier: Extension API.

```ts
import { CairnHead } from '@glw907/cairn-cms/delivery/head';
```

```svelte
<CairnHead
  seo={SeoMeta}
  title={string | false}
  titleTemplate={(title: string) => string}
  markdownUrl={string}
/>
```

Render a page's SEO head from a [`SeoMeta`](./delivery-data.md) object into `<svelte:head>`: a title,
meta tags, link tags, and one escaped JSON-LD script. The title renders from `seo.title` by default;
`title={false}` lets the site own the `<title>`, and a string overrides it. `titleTemplate` carries the
site's own title-suffix convention (for example `(t) => `${t} · example.org`\`) and applies to `seo.title`
only when `title` is left undefined, so an explicit `title` or `title={false}` still wins. `markdownUrl`,
when passed, adds a `rel="alternate" type="text/markdown"` link pointing at the entry's raw-markdown
twin ([`markdownResponse`](./delivery-data.md#markdownresponse)); a site that has not wired the twin
route, or an entry with no twin (a `noindex` entry, which `markdownEntries` excludes), passes nothing
and the link is omitted. The component carries no CSS, so it pulls in no admin styles. The showcase
mounts it from the `seo` field the catch-all loader returns.

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

`CairnHead` imports from `@glw907/cairn-cms/delivery/head`, the component-free split that keeps the
data surface node-safe. A `.svelte` component would pull Svelte into the module graph, so the
plain-data builders live on [`/delivery/data`](./delivery-data.md) and the one component lives on its
own `/delivery/head` entry. A plain-Node tool can import the builders without ever resolving a
component.
