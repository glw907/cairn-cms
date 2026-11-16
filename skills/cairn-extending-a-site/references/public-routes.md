# Build the public routes

Public pages are site route files around engine builders. Everything prerenders from the deployed
commit except `/preview/[token]` (`references/draft-preview.md`). A scaffold keeps the shared modules
in `src/chassis/` (`content.ts`, `public-routes.ts`, `feed.ts`) and the routes under
`src/routes/(site)/`.

Contents:

- [Shared inputs](#shared-inputs)
- [Entry pages and the head](#entry-pages-and-the-head)
- [The home page route](#the-home-page-route)
- [Feeds, sitemap, robots](#feeds-sitemap-robots)
- [Archive, tag pages, other heads](#archive-tag-pages-other-heads)
- [Editable menu](#editable-menu)
- [Build failures](#build-failures)

## Shared inputs

- One `createSiteResolver(cairn, files)` call in the content module
  (`references/content-model.md` has the glob shape). It returns `site`, and `site.concept(id)` is
  one concept's index.
  `all()` and `byTag()` omit drafts unless `{ includeDrafts: true }`; `allTags()` and `adjacent()`
  always do; `byId` returns drafts, so check `draft` there.
- One origin string, no trailing slash, set to the deployed origin before a production build. It is
  the `publicOrigin` export in `src/site/cairn.config.ts` (the scaffold ships
  `'https://showcase.test'`), and the build writes it into canonicals, `og:url`, feeds, and the
  sitemap. `PUBLIC_ORIGIN` in `wrangler.jsonc` is the Worker's runtime value for the same host.
  Setup writes both values. On a site not connected to Workers Builds it then rebuilds and redeploys; on a Builds site it commits both files to the repository and Builds rebuilds. A hand change to the domain edits both, then rebuilds.
- One exported `PublicRoutesConfig` (`site`, `render`, `origin`, `siteName`, `description`,
  the required `resolveMedia` with `null` for a site with no media, plus `defaultImage` and
  `feeds`) shared by every route.

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

The page renders `CairnHead` (`@glw907/cairn-cms/public`) with `seo={data.seo}`, then
`{@html data.html}`. `titleTemplate` applies only when `title` is undefined.

For a table of contents, call `renderer.renderDocument(input)` in place of `render`. It returns
`{ html, headings }`, where `headings` is a `DocHeading[]` (`{ id, text, depth }`) in document
order, collected from the final tree after slugging and any site `rehypePlugins`.

`entryLoad` returns `EntryData<typeof site>`, a union over the adapter's concepts, so narrowing on
`data.concept` types `data.entry.frontmatter` from that concept's fields: inside
`if (data.concept === 'posts')`, `data.entry.frontmatter.image` is the posts field's value.

`loadPreview` infers the same type from the config you pass it, so a template shared with the preview
route takes `EntryData<typeof site>` as its prop type. A `PublicRoutesConfig` with no type argument gives
the untyped `EntryData`, where `concept` is a string and the frontmatter a record. Every typed value
assigns to it.

To show reference fields, return `references` from the same load:
`resolveReferences(site, descriptor, data.entry.frontmatter)` with the descriptor from
`buildSiteDescriptors(cairn)` matched on `data.concept`. A scaffold's `withReferences`
in `src/chassis/entry-data.ts` already does this on the entry and preview routes. Missing and draft
targets are dropped, so guard absent keys.

The head reads `description` always, and `image`, `robots`, `author` only when the fieldset declares
them. The hero and social image come from the key `image` alone: declare
`image: fields.image({ label: 'Hero image', seo: true })` (one `seo` image per concept). Set
`defaultImage` only to a file that exists; the scaffold leaves it unset. A
`resolveMedia` other than `null` turns hero resolution on.

Markdown twin: an `md` matcher in `src/params.ts` (`export const params = defineParams({ md: (param)
=> (param.endsWith('.md') ? param : undefined) })`, with `defineParams` from `@sveltejs/kit/params`;
there is no `src/params/` directory), a `[...path=md]/+server.ts` with
`routes.markdownEntries()` and `buildMarkdownResponse({ body })` from `routes.markdownLoad({ url })`, and
`markdownUrl` on `CairnHead`. `noindex` entries get no twin.

## The home page route

The scaffold's `(site)/+page.server.ts` serves `/`. When a published `pages` entry has the id `home`,
it returns that page's data with a `home` member and no archive lead; with no such page it returns
the post list as before. The routes treat the `home` page as one convention, each in its own file:

- `/home` answers a 308 to `/` from the `[...path]` load, so the page has one address. The entries
  generator keeps `/home`, which makes the build write the redirect into `_redirects`.
- `[...path=md]/+server.ts` drops the `home` page from its entries, so no `/home.md` is built.
- The archive starts at page one: `archive/[page]` lists every post, its entries start at `1`, and
  page one drops `noindex`. With no posts it builds no archive page.
- `sitemap.xml/+server.ts` filters `/home` and lists `/archive/1` when posts exist.
- `home.ts` holds `splitAtLastRule`, which splits the rendered body at its last top-level `<hr>`,
  and `buildHomeData`, which returns the `home` prop with the newest three posts, `archiveUrl`
  `/archive/1`, and the `before` and `after` halves. The preview mount builds the same prop for the
  `home` page.

The home page's canonical and `og:url` are `origin + '/'`.

## Feeds, sitemap, robots

- Feeds: map `posts.all()` to `FeedItem`s (render bodies with an origin-prefixing link resolver from
  `createLinkResolver(site)`), return `buildRssResponse(channel, items)` or `buildJsonFeedResponse`, and set
  `feeds` in the config so entry heads link them.
- Calendar feed: a `+server.ts` `GET` returns `buildICalendarResponse({ name, productId, events })`.
  Pass one event per occurrence. A date is a `YYYY-MM-DD` string, and an all-day `end` is the last
  day, inclusive. A timed event takes a UTC `Date`, so turn a wall time and its zone into that
  instant yourself, and write each repeat as its own event. Keep a cancelled occurrence in the feed
  with `status: 'cancelled'` so subscribers' copies update, and open its summary with "Cancelled:",
  since some apps ignore the status. The charset note below applies.
- Sitemap: `buildSitemapResponse(urls)`; `buildSitemapView(site, buildSiteDescriptors(cairn), origin, extraRoutes)`
  takes `lastmod` from `updated` then `date`, skips `noindex` entries, and adds non-entry pages.
- Robots: `buildRobotsResponse({ sitemapUrl, disallow: ['/admin'], posture })`. Pass the adapter's
  `aiPosture` as `posture` (`references/tidy-and-ai-posture.md`).
- `noindex` entries stay out of the sitemap but still appear in feeds; filter feed items with
  `readSeoFields`.
- The helpers' `; charset=utf-8` holds only on a Worker-rendered route. A prerendered route's
  `Content-Type` comes from Cloudflare's asset layer, which derives it from the file extension and
  documents no charset ([static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)).

A calendar feed route:

```ts
import { buildICalendarResponse } from '@glw907/cairn-cms/delivery';

export function GET(): Response {
  return buildICalendarResponse({
    name: 'Site events',
    productId: '-//Example//Events//EN',
    events: [
      { uid: 'field-day-2027-06-05@example.com', summary: 'Field day', start: '2027-06-05' },
      { uid: 'meeting-2027-06-09@example.com', summary: 'Cancelled: Meeting', start: new Date('2027-06-09T01:00:00Z'), status: 'cancelled' },
    ],
  });
}
```

A second concept in the feed: the scaffold's `feedItemsFrom` reads `posts` only, takes no concept option,
and throws when `posts` is absent. To feed another routable concept, such as `guides`, map it by hand into
the same `FeedItem` shape in `chassis/feed.ts` and merge the lists:

<!-- snippet-check-skip: continues the scaffold's feed module, which imports site, siteMeta, render, and resolveMedia -->
```ts
export async function buildFeedItems(): Promise<FeedItem[]> {
  const source = { site, origin: siteMeta.origin, render: cairn.rendering.render, resolveMedia };
  const guides = site.concept('guides');
  const toPermalink = createLinkResolver(site);
  const absoluteMedia: MediaResolve = (ref) => {
    const url = resolveMedia(ref);
    return url === undefined ? undefined : new URL(url, siteMeta.origin).href;
  };
  const guideItems: FeedItem[] = await Promise.all(
    guides.all().map(async (g) => ({
      title: g.title,
      url: siteMeta.origin + g.permalink,
      date: g.date,
      summary: g.excerpt,
      contentHtml: await source.render({
        body: guides.byId(g.id)!.body,
        resolveLink: (ref) => siteMeta.origin + toPermalink(ref),
        resolveMedia: absoluteMedia,
        resolveFragment: createFragmentResolver(site),
      }),
      tags: g.tags,
    })),
  );
  const items = [...(await feedItemsFrom(source)), ...guideItems];
  return items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
```

## Archive, tag pages, other heads

- Archive: `all()` is already sorted (dated newest first). A paginated route whose `entries` can be
  empty needs a `handleUnseenRoutes` exemption by route id in `vite.config.ts`, or the build fails.
- Tag page: `entries` from `posts.allTags()`, list with `posts.byTag(tag)`; requires the concept's
  `taxonomy: true` field. Add each tag path to the sitemap.
- Home, archive, tag, and hand-built pages get no head unless the route returns
  `buildSeoMeta({ title, description, canonicalUrl, siteName })` and renders `CairnHead`. The scaffold's
  home (`(site)/+page.server.ts` and `+page.svelte`) is the worked example.

## Editable menu

Declare `editor.nav` on the adapter as a list, `[{ menuName, label, maxDepth }]`. Each menu is edited
at `/admin/nav/<menuName>`, and without the list every `/admin/nav` address 404s. Add each menu
under `menus.<menuName>` in the site config, and read it in a server load with
`readMenu(siteConfig, name, maxDepth)`. Nodes are `{ label, url?, children? }`; a URL starts with
`/`, `#`, `http://`, `https://`, `mailto:`, or `tel:`. A broken node throws `NavValidationError`.

The scaffold's root `+layout.server.ts` also reads `readMenu(siteConfig, 'actions', 1)`, the menu for
call-to-action links such as a Join button. It returns `actions` in the layout data only when the menu
holds a link, and a theme reads `page.data.actions`. The template ships the menu commented out in
`site.config.yaml`, and like the footer it is edited in that file until you add it to `editor.nav`.
A menu becomes admin-editable once it joins the list.

## Build failures

| Message | Fix |
|---|---|
| `expected input to be a string or buffer` | Glob needs `query: '?raw'`, `import: 'default'`, `eager: true` |
| `cairn: <n> invalid entries:` then `<concept>/<id>: <field>: <message>` | Fix the line's field, filename, or `cairn:` link, or mark the entry `draft: true` |
| `cairn: <n> invalid frontmatter field(s):` then `<dir>/<id>: <field>: <message>` | Fix the field or mark the entry `draft: true` |
| `cairn: permalink "<p>" resolves to both "<a>" and "<b>"` | Change one slug or permalink |
| `cairn: link target "cairn:<concept>/<id>" not found` | Fix or remove the body link |
| Unseen prerenderable route | Exempt it in `handleUnseenRoutes` |
| `NavValidationError` | Fix the menu node |

A route that exports no `prerender` renders on every request, and `cairn-audit` reports it with the
advisory rule `public-route-prerender`. Export `prerender = true`, or `false` to choose per-request
rendering on purpose.

A request that misses a prerendered page's trailing slash answers 307 from Cloudflare's asset layer,
because the default `assets.html_handling` is `auto-trailing-slash`
([HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)).
A Worker-rendered route answers SvelteKit's 308 instead.

Serve the build with `npm run preview` or `wrangler dev` (`vite preview` cannot serve adapter 8
output) and check that sitemap `loc`s, feed URLs, and canonicals carry the deployed origin.
