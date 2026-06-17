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

```ts
function createPublicRoutes(deps: PublicRoutesDeps): {
  entryLoad: (event: { url: URL }) => Promise<EntryData>;
  archiveLoad: (conceptId: string) => ListData;
  tagIndexLoad: (conceptId: string) => TagIndexData;
  tagLoad: (conceptId: string, event: { params: { tag: string } }) => TagData;
  entries: () => { path: string }[];
};
```

Build the public loaders for a site's unified index. Pass the [`PublicRoutesDeps`](#publicroutesdeps):
the built site resolver, the render function, the origin, and the SEO defaults. The returned object
carries one loader per public route plus `entries`, the prerender enumerator for the catch-all route.
The showcase wires `entryLoad` and `entries` into its `[...path]` catch-all server.

```ts
import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.render,
  origin: ORIGIN,
  siteName: cairn.siteName,
  description: SITE_DESCRIPTION,
  defaultImage: ORIGIN + '/og/default.png',
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
});

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

---

## Route-data types

The shapes the public loaders return and consume. A template reads the loaded data; a server passes
the deps.

### `PublicRoutesDeps`

```ts
interface PublicRoutesDeps {
  site: SiteResolver;
  render: (md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }) => string | Promise<string>;
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

```ts
interface ListData {
  entries: ContentSummary[];
}
```

The archive and tag list data: the summaries a list template renders.

### `TagData`

```ts
interface TagData extends ListData {
  tag: string;
}
```

A single tag's data plus the tag it filtered on.

### `TagIndexData`

```ts
interface TagIndexData {
  tags: { tag: string; count: number }[];
}
```

The tag-index data: every tag with its entry count.

### `EntryData`

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
adjacent entries for prev and next links. The catch-all `entryLoad` returns this. `heroImage` is a
derived projection of the frontmatter `image` field, resolved through `resolveMedia`: `url` is the
root-relative path for an `<img>` and `absoluteUrl` the origin-anchored form for the og:image. The
canonical token is left untouched, so `entry.frontmatter.image.src` stays the `media:` token, and
`heroImage` is undefined when no hero is set, media is off, or the reference does not resolve.

---

## `CairnHead`

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
