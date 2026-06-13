# Wire the delivery surface

This guide takes your content public through the typed read model, the permalink route, the feeds, and the build-time manifest wiring.

## Prerequisites

- An adapter and a parsed site config. If you have not built them yet, start from [Define an adapter and schema](./define-an-adapter-and-schema.md), which sets up `cairn.config.ts` and exports `cairn` and `siteConfig`.
- The package installed (`@glw907/cairn-cms`).

This guide assumes a running cairn site whose content you want to deliver. The worked example traces the real showcase wiring across `examples/showcase`, so you can open each named file alongside the steps.

## Steps

1. **Build the content layer with `createSiteIndexes`.** One module globs the markdown for every concept and hands the raw records to the adapter-driven builder. You supply one `import.meta.glob` per concept (Vite needs the literal glob string at the call site). In return the builder gives you a typed index per concept plus a cross-concept `site` resolver, and it runs the build gate that fails a malformed entry red.

   ```ts
   // examples/showcase/src/lib/content.ts
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
   export const pages = indexes.pages;

   export const ORIGIN = 'https://showcase.test';
   export const SITE_DESCRIPTION = 'The cairn showcase site.';
   ```

   For the signature and the `SiteGlobs` shape it expects, see [`createPublicRoutes` and the index builders](../reference/delivery.md).

2. **Add the catch-all `[...path]` route.** One route resolves any public path against the site resolver and ships the entry with a full head. `createPublicRoutes` returns an `entries` generator for prerendering and an `entryLoad` for the page load, both keyed off the `site` resolver and the adapter's `render`. Your matching `+page.svelte` renders the resolved HTML and the SEO head.

   ```ts
   // examples/showcase/src/routes/(site)/[...path]/+page.server.ts
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

   The page reads `data.html` and `data.seo` and renders the head through `CairnHead`:

   ```svelte
   <!-- examples/showcase/src/routes/(site)/[...path]/+page.svelte -->
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

3. **Add the feeds and the sitemap from the response helpers.** Each output is a prerendered `+server.ts` that reads the indexes and returns a `Response` from a delivery responder. Feed routes build their items from the posts index and resolve internal `cairn:` links with `buildLinkResolver`, while the sitemap route maps every site entry to a `SitemapUrl`.

   ```ts
   // examples/showcase/src/routes/feed.xml/+server.ts
   import { rssResponse, buildLinkResolver, type FeedItem } from '@glw907/cairn-cms/delivery';
   import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
   import { cairn } from '$lib/cairn.config';

   export const prerender = true;

   export const GET = async () => {
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

   The JSON feed at `feed.json/+server.ts` mirrors this route and calls `jsonFeedResponse` instead. The sitemap reads the cross-concept `site` resolver directly:

   ```ts
   // examples/showcase/src/routes/sitemap.xml/+server.ts
   import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
   import { site, ORIGIN } from '$lib/content';

   export const prerender = true;

   export const GET = () => {
     const urls: SitemapUrl[] = [
       { loc: ORIGIN + '/' },
       ...site.all().map((s) => ({ loc: ORIGIN + s.permalink, ...(s.date ? { lastmod: s.date } : {}) })),
     ];
     return sitemapResponse(urls);
   };
   ```

   Each of these routes sets `export const prerender = true`, so SvelteKit builds them as prerender entries even though no page links to them; you do not need to list them in `config.kit.prerender.entries`. Leave `config.kit.prerender.handleHttpError` at its strict default rather than setting `'warn'`: a dangling `cairn:` link or a route that errors during prerender then fails the build loudly, which is what you want, instead of shipping a broken link.

4. **Wire the manifest with the `cairnManifest()` Vite plugin.** A manifest is a build-verified projection of the content files, and the plugin owns its verify. Add the plugin to your `vite.config.ts` with the config module, the per-concept content globs, and the manifest path. The verify runs outside the prerender lifecycle, so a stale manifest fails the build red regardless of any `handleHttpError` policy.

   ```ts
   // examples/showcase/vite.config.ts
   import { sveltekit } from '@sveltejs/kit/vite';
   import { defineConfig } from 'vite';
   import { cairnManifest } from '@glw907/cairn-cms/vite';

   export default defineConfig({
     plugins: [
       sveltekit(),
       cairnManifest({
         configModule: '/src/lib/cairn.config.ts',
         content: { posts: '/src/content/posts/*.md', pages: '/src/content/pages/*.md' },
         manifestPath: '/src/content/.cairn/index.json',
       }),
     ],
     ssr: { noExternal: ['@glw907/cairn-cms'] },
   });
   ```

   When you change content outside the admin commit pipeline, regenerate the manifest with the `cairn-manifest` bin. The showcase wires it as a script:

   ```jsonc
   // examples/showcase/package.json
   "scripts": {
     "cairn:manifest": "cairn-manifest"
   }
   ```

   For the plugin options and the bin, see [`cairnManifest`](../reference/vite.md#cairnmanifest).

5. **Import a delivery data helper from the node-safe barrel when you leave SvelteKit.** A SvelteKit route imports through `@glw907/cairn-cms/delivery`, which pulls `@sveltejs/kit` into its module graph, so a plain-Node tool (a custom manifest script, say) cannot import that barrel. Point that import at `@glw907/cairn-cms/delivery/data` instead, the node-safe surface that re-exports the same builders without the SvelteKit dependency.

   ```ts
   import { buildSiteManifest } from '@glw907/cairn-cms/delivery/data';
   ```

## Verify

Run `npm run build` in `examples/showcase`. The production build exits 0, the prerendered home lists the post summaries through `routes/(site)/+page.server.ts` and `routes/(site)/+page.svelte`, and a post permalink resolves through `routes/(site)/[...path]/+page.server.ts`. The `(site)` group folder is URL-transparent; it exists to keep the public chrome off `/admin`, and it changes no public path. When you compare against your own site, the working reference routes are `examples/showcase/src/routes/(site)/[...path]/` for the permalink page, `routes/feed.xml/+server.ts` and `routes/feed.json/+server.ts` for the feeds, and `routes/sitemap.xml/+server.ts` for the sitemap. A stale `src/content/.cairn/index.json` fails that build, which proves the manifest verify is wired.

## See also

- [Delivery reference](../reference/delivery.md) for the `createPublicRoutes` loaders and the response helpers.
- [Delivery data reference](../reference/delivery-data.md) for the node-safe `/delivery/data` barrel and every builder it exports.
- [Vite reference](../reference/vite.md#cairnmanifest) for `cairnManifest` and the `cairn-manifest` bin.
- [The content model](../explanation/content-model.md#the-content-graph) for the files-are-truth, manifest-is-projection model behind the build-time verify.
