# Delivery (`@glw907/cairn-cms/delivery`)

This subpath is the public read model for a SvelteKit site. It carries the catch-all route loader,
the public route-data types, and the feed, sitemap, and robots responders. Import it from a
`+server.ts` or a `+page.server.ts` when you build the reader-facing site. The matching head
component, [`CairnHead`](#cairnhead), lives one level down at `/delivery/head`.

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
function createPublicRoutes(deps: PublicRoutesDeps): {
  resolveRoute: (event: { url: URL }) => Promise<ResolvedRouteData | undefined>;
  entries: () => { path: string }[];
};
```

Build the public route resolver for a site's unified index. Pass the
[`PublicRoutesDeps`](#publicroutesdeps): the built site resolver, the render function, the origin, and
the SEO defaults. The returned object carries `resolveRoute`, the one resolver the catch-all route
calls, and `entries`, the prerender enumerator. `resolveRoute` discriminates a request path into an
entry, a tag index, or a tag archive, and the entry kind carries the rendered html, the SEO head, and
the hero. A resolution miss returns `undefined`; the route layer throws the 404.

The showcase wires `resolveRoute` and `entries` into its `[...path]` catch-all server. The
`+page.server.ts` calls `resolveRoute`, throws `error(404)` on `undefined`, and the `+page.svelte`
branches on `data.kind`.

```ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
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
  const data = await routes.resolveRoute({ url });
  if (!data) throw error(404, 'Not found');
  // Branch by kind: data.kind is 'entry', 'tagIndex', or 'tagArchive'. The entry kind carries the
  // rendered html, seo, and hero; the tag kinds carry the tag list and the tagged entries.
  return data;
};
```

---

## Route-data types

The shapes the public loaders return and consume. A template reads the loaded data; a server passes
the deps.

### `PublicRoutesDeps`

Stability tier: Extension API.

```ts
interface PublicRoutesDeps {
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

### `ListData`

Stability tier: Extension API.

```ts
interface ListData {
  entries: ContentSummary[];
}
```

The archive and tag list data: the summaries a list template renders.

### `TagData`

Stability tier: Extension API.

```ts
interface TagData extends ListData {
  tag: string;
}
```

A single tag's data plus the tag it filtered on.

### `TagIndexData`

Stability tier: Extension API.

```ts
interface TagIndexData {
  tags: { tag: string; count: number }[];
}
```

The tag-index data: every tag with its entry count.

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
adjacent entries for prev and next links. `resolveRoute`'s entry kind carries this shape under
`{ kind: 'entry', ... }`. `heroImage` is a derived projection of the frontmatter `image` field,
resolved through `resolveMedia`: `url` is the root-relative path for an `<img>` and `absoluteUrl` the
origin-anchored form for the og:image. The canonical token is left untouched, so
`entry.frontmatter.image.src` stays the `media:` token, and `heroImage` is undefined when no hero is
set, media is off, or the reference does not resolve.

### `ResolvedRouteData`

Stability tier: Extension API.

```ts
type ResolvedRouteData =
  | ({ kind: 'entry' } & EntryData)
  | ({ kind: 'tagIndex'; concept: string } & TagIndexData)
  | ({ kind: 'tagArchive'; concept: string } & TagData);
```

The discriminated payload `resolveRoute` returns. The catch-all renders it by `kind`. The entry kind
carries the rendered html, the SEO head, and the hero. The tag-index kind carries every tag with its
count. The tag-archive kind carries one tag's entries. It is the delivery-layer mirror of the engine's
[`ResolvedRoute`](./delivery-data.md#types): the engine resolves a path to data, and this layer
folds in the render. A resolution miss is `undefined`, which the route layer turns into a 404.

---

## `CairnHead`

Stability tier: Extension API.

```ts
import { CairnHead } from '@glw907/cairn-cms/delivery/head';
```

```svelte
<CairnHead seo={SeoMeta} title={string | false} />
```

Render a page's SEO head from a [`SeoMeta`](./delivery-data.md) object into `<svelte:head>`: a title,
meta tags, link tags, and one escaped JSON-LD script. The title renders from `seo.title` by default;
`title={false}` lets the site own the `<title>`, and a string overrides it. The component carries no
CSS, so it pulls in no admin styles. The showcase mounts it from the `seo` field the catch-all loader
returns.

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
