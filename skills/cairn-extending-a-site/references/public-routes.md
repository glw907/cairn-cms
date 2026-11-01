# Build the public routes

Public pages are site route files around engine builders. Everything prerenders from the deployed
commit except `/preview/[token]` (`references/draft-preview.md`). A scaffold keeps the shared modules
in `src/chassis/` (`content.ts`, `public-routes.ts`, `feed.ts`) and the routes under
`src/routes/(site)/`.

Contents:

- [Shared inputs](#shared-inputs)
- [Entry pages and the head](#entry-pages-and-the-head)
- [Feeds, sitemap, robots](#feeds-sitemap-robots)
- [Archive, tag pages, other heads](#archive-tag-pages-other-heads)
- [Editable menu](#editable-menu)
- [Build failures](#build-failures)

## Shared inputs

- One `createSiteIndexes(cairn, siteConfig, globs)` call in the content module
  (`references/content-model.md` has the glob shape). It returns one index per concept plus `site`.
  `all()` and `byTag()` omit drafts unless `{ includeDrafts: true }`; `allTags()` and `adjacent()`
  always do; `byId` returns drafts, so check `draft` there.
- One origin string, no trailing slash, set to the deployed origin before a production build (the
  scaffold ships `'https://showcase.test'`). The build writes it into canonicals, `og:url`, feeds,
  and the sitemap. Set `PUBLIC_ORIGIN` in `wrangler.jsonc` to the same value.
- One exported `PublicRoutesConfig` (`site`, `render`, `origin`, `siteName`, `description`, plus
  `defaultImage`, `feeds`, `resolveMedia`, `assetsEnabled`) shared by every route.

## Entry pages and the head

```ts
// src/routes/(site)/[...path]/+page.server.ts
import type { EntryGenerator, PageServerLoad } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { publicRoutesConfig } from '#chassis/public-routes.js';

export const prerender = true;
const routes = createPublicRoutes(publicRoutesConfig);
export const entries: EntryGenerator = () => routes.entries();
export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

The page renders `CairnHead` (`@glw907/cairn-cms/delivery/head`) with `seo={data.seo}`, then
`{@html data.html}`. `titleTemplate` applies only when `title` is undefined.

To show reference fields, return `references` from the same load:
`resolveReferences(site, descriptor, data.entry.frontmatter)` with the descriptor from
`buildSiteDescriptors(cairn, siteConfig)` matched on `data.concept`. A scaffold's `withReferences`
in `src/chassis/entry-data.ts` already does this on the entry and preview routes. Missing and draft
targets are dropped, so guard absent keys.

The head reads `description` always, and `image`, `robots`, `author` only when the fieldset declares
them. The hero and social image come from the key `image` alone: declare
`image: fields.image({ label: 'Hero image', seo: true })` (one `seo` image per concept). Set
`defaultImage` only to a file that exists; the scaffold leaves it unset. Setting
`resolveMedia` turns hero resolution on.

Markdown twin: an `md` matcher in `src/params.ts`, a `[...path=md]/+server.ts` with
`routes.markdownEntries()` and `markdownResponse({ body })` from `routes.markdownLoad({ url })`, and
`markdownUrl` on `CairnHead`. `noindex` entries get no twin.

## Feeds, sitemap, robots

- Feeds: map `posts.all()` to `FeedItem`s (render bodies with an origin-prefixing link resolver from
  `createLinkResolver(site)`), return `rssResponse(channel, items)` or `jsonFeedResponse`, and set
  `feeds` in the config so entry heads link them.
- Sitemap: `sitemapResponse(urls)`; `buildSitemapView(site, buildSiteDescriptors(cairn, siteConfig), origin, extraRoutes)`
  takes `lastmod` from `updated` then `date`, skips `noindex` entries, and adds non-entry pages.
- Robots: `robotsResponse({ sitemapUrl, disallow: ['/admin'], posture })`. Pass the adapter's
  `aiPosture` as `posture` (`references/tidy-and-ai-posture.md`).
- `noindex` entries stay out of the sitemap but still appear in feeds; filter feed items with
  `readSeoFields`.

## Archive, tag pages, other heads

- Archive: `all()` is already sorted (dated newest first). A paginated route whose `entries` can be
  empty needs a `handleUnseenRoutes` exemption by route id in `vite.config.ts`, or the build fails.
- Tag page: `entries` from `posts.allTags()`, list with `posts.byTag(tag)`; requires the concept's
  `taxonomy: true` field. Add each tag path to the sitemap.
- Home, archive, tag, and hand-built pages get no head unless the route returns
  `buildSeoMeta({ title, description, canonicalUrl, siteName })` and renders `CairnHead`. The scaffold's
  home (`(site)/+page.server.ts` and `+page.svelte`) is the worked example.

## Editable menu

Declare `editor.nav: { menuName, label, maxDepth }` on the adapter (without it `/admin/nav` 404s),
add the menu under `menus.<menuName>` in the site config, and read it in a server load with
`readMenu(siteConfig, name, maxDepth)`. Nodes are `{ label, url?, children? }`; a URL starts with
`/`, `#`, `http://`, `https://`, `mailto:`, or `tel:`. A broken node throws `NavValidationError`.

## Build failures

| Message | Fix |
|---|---|
| `expected input to be a string or buffer` | Glob needs `query: '?raw'`, `import: 'default'`, `eager: true` |
| `cairn: <n> invalid frontmatter field(s):` then `<dir>/<id>: <field>: <message>` | Fix the field or mark the entry `draft: true` |
| `cairn: permalink "<p>" resolves to both "<a>" and "<b>"` | Change one slug or permalink |
| `cairn: link target "cairn:<concept>/<id>" not found` | Fix or remove the body link |
| Unseen prerenderable route | Exempt it in `handleUnseenRoutes` |
| `NavValidationError` | Fix the menu node |

Serve the build with `npm run preview` or `wrangler dev` (`vite preview` cannot serve adapter 8
output) and check that sitemap `loc`s, feed URLs, and canonicals carry the deployed origin.
