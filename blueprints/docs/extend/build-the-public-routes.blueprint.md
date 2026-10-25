---
page: Build the public routes
type: task guide
exemplar: extenders/django-custom-management-commands
---

# Build the public routes

:::reader
**Who reads it.** A Svelte-fluent web developer building an organization's site on cairn's seams, who wires the site's public pages and machine-readable files to the engine. They work in the site's SvelteKit routes and the modules those routes import. :fact[j0ut9n]

**Why they arrive:**
- Their site came from `create-cairn-site`. The tree already holds the index, the origin, the entry, twin, preview, feed, sitemap, robots, and archive routes, and the menu. They want to know what each one does and where to change it, most urgently the origin before the first production build. :fact[qtm9y2] :fact[zb2k9f] :fact[ioh6uj] :fact[ri06xw]
- They are building the site by hand and need the public routes past the entry pages: the head, the markdown twin, the feeds, the sitemap, robots.txt, the archive, and the draft preview route. The preview section serves this reader alone. :fact[pkt8i6] :fact[6c3amx]
- They want one piece, such as a tag page or an editable menu. :fact[m9z6sr] :fact[rnwver]
- They hit a symptom: a home or archive page with no description or Open Graph tags, a share card with no hero, an `og:image` that answers 404, or a build that stops on a content message. :fact[k7nln3] :fact[k5uws5] :fact[nnup2g] :fact[kv3qen] :fact[n07oiu]

**What they already know.** SvelteKit routing (rest parameters, param matchers, route groups, `+server.ts` endpoints, layout loads), the `prerender` and `entries` exports, and Vite's `import.meta.glob`. Their adapter already declares the site's concepts. The page explains none of these and links the vendor docs where a step depends on a vendor detail.

**Background.** The public pages are route files in the site's SvelteKit app, and most routes are a few lines around an engine builder. :fact[j0ut9n] :fact[pkt8i6] :fact[pvk6h5]
The entry, twin, archive, feed, sitemap, and robots routes prerender from the markdown in the deployed commit, and the site serves the files that build writes, with no GitHub read per request. The preview route renders at request time and reads the entry's holding branch. :fact[1mkckz] :fact[8k9xwm] :fact[jdz8hj]
Two inputs are shared across the routes: one set of typed indexes from `createSiteIndexes`, and one origin string. The build writes the origin into each canonical URL, `og:url`, feed, and sitemap row. :fact[yef4lo] :fact[niuzzg] :fact[k16chc]

**What the page does for them.** The introduction opens on that model: the routes are site files built on two shared inputs, the index and the origin, most of them through an engine builder. :fact[pkt8i6] :fact[yef4lo]
It states the task: build the index, name the origin, compose one `PublicRoutesConfig`, wire the routes that read them, and read the prerendered files after a build. :fact[pkt8i6] :fact[8k9xwm]
It tells the scaffolded reader that the tree holds these routes already, except the tag page and the head section's example contact page, and that the origin ships as a placeholder to replace before production. :fact[qtm9y2] :fact[ioh6uj]
It names where the engine's head stops: it covers entry pages, and it reads the hero and the social image from the frontmatter key `image`, with `defaultImage` as the social image's fallback. :fact[k7nln3] :fact[k5uws5] :fact[jguiox]

**What it leaves to other pages:**
- Choosing an AI-training stance for robots.txt belongs to Choose an AI posture.
- Announcing newly published entries belongs to Act on newly published entries.
- Resolving `media:` images on public pages belongs to Configure media.
- The pages' look belongs to Theme your public site.
- What a preview link exposes belongs to Share a draft preview.
- The preview's mint and revoke signatures belong to the sveltekit reference page, and its refusal reasons to the log events reference page.
:::

:::constraints
- Don't say `PublicRoutesConfig.feeds` serves, builds, or turns on a feed. It adds head links. :fact[9xy8j9]
- Don't say the hero or social image reads the field that `seo: true` marks. Delivery reads the frontmatter key `image`. :fact[k5uws5]
- Don't say the engine requires the origin to be a literal. The literal is the scaffold's choice. :fact[niuzzg]
- Don't say the sitemap or the feeds leave out `noindex` entries. :fact[ms7l5u]
- Don't say the twin's Content-Type header is guaranteed in production. State what was measured and where. :fact[gwpffe]
- Don't name a path member on `editor.nav`. The file is the one `editor.siteConfigPath` names. :fact[f9aayq] :fact[shv6wv]
- Don't state the preview server's port.
- Where a route section shows code, show the scaffold's file, and let the hand-built reader find the matching file in their tree.
- Write the preview route's directory as `preview/[token]` and its address as `/preview/<token>`. :fact[76m2vf]
- Give a vendor's specifics a link, never a copy: SvelteKit's route sorting, prerendering, layout data, and Vite plugin options; Vite's `import.meta.glob`; and Wrangler's D1 migration options beyond `--local` and `--remote`.
- Put each engine export, route path, and frontmatter key in code font, and the Share preview group's buttons in bold as UI labels. :fact[sp1mbt]
:::

## Before you begin

*Names what the routes read before the first step, each with the page that sets it up.*

- The routes need an adapter, a parsed site config, and a SvelteKit app that builds for Cloudflare. Before you start, confirm that your site has the following:
- An adapter that declares the site's concepts, and the parsed site config. `createSiteIndexes` takes both. :fact[yef4lo]
- See [Define an adapter and schema](define-an-adapter-and-schema.md), which covers the adapter and the site config.
- A SvelteKit app that builds with `@sveltejs/adapter-cloudflare`. :fact[j0ut9n]
- See [Deploy a bare SvelteKit site](add-cairn-to-a-sveltekit-app.md#deploy-a-bare-sveltekit-site).
- For hero images, a media resolver. Without one, an entry gets no `heroImage`. :fact[83gbov]
- See [`createMediaResolver`](../reference/media.md#createmediaresolver).

## Lay out the route files

*Gives the reader the map every later section points into, before any code.*

- On a scaffolded site, the public routes sit under `src/routes/`, and the modules they share sit in `src/chassis/`. :fact[qtm9y2] :fact[zb2k9f]
- Code: a text tree of a selection of the scaffold's public files: `src/params.ts`; under `src/routes/`, the `(site)` group's `[...path]/`, `[...path=md]/`, `archive/[page]/`, `preview/[token]/`, `+layout.svelte`, `+page.server.ts`, and `+page.svelte`, then `feed.json/`, `feed.xml/`, `media/[...path]/`, `robots.txt/`, `sitemap.xml/`, and the root `+layout.server.ts`; under `src/chassis/`, `content.ts`, `public-routes.ts`, and `feed.ts`. :fact[qtm9y2] :fact[zb2k9f]
- In `src/chassis/`, `content.ts` builds the index and the site's identity, `public-routes.ts` holds the shared entry config, and `feed.ts` maps posts to feed items. :fact[zb2k9f]
- A hand-built site may lay these files out differently, for example with routes directly under `src/routes/` and no `(site)` group. Each later section names the scaffold's path, and you use the matching file in your tree.
- See [Routes and the server hook](scaffolded-site-files.md#routes-and-the-server-hook).

## Build one typed index

*Builds the index the routes read, and says which entries it leaves out.*

- `createSiteIndexes` builds one typed index per concept from one literal `import.meta.glob` per concept. Vite needs each pattern written literally at the call site, so a loop can't generate them. :fact[yef4lo]
- See Vite's [glob import](https://vite.dev/guide/features#glob-import).
- In your content module, pass `createSiteIndexes` the adapter, the parsed site config, and one glob per concept, keyed by concept id. A scaffolded site does this in `src/chassis/content.ts`. :fact[yef4lo] :fact[zb2k9f]
- Code: the scaffold's three globs and the `createSiteIndexes` call. :source[/templates/waymark/src/chassis/content.ts] :fact[n07oiu]
- Write each glob with `query: '?raw'`, `import: 'default'`, and `eager: true`. A lazy glob, or one without `import: 'default'`, hands the parser a function or a module object. The build then fails. See [Diagnose a failed build](#diagnose-a-failed-build). :fact[n07oiu]
- The result holds one index per concept plus `site`, the cross-concept resolver. A concept can't be named `site`. :fact[hv8qs9]
- The site config argument doesn't change the indexes, and the call still takes the parsed config. :fact[n33lwb]
- Each index's `all()` already returns its entries in the engine's sort order. [Build the archive](#build-the-archive) relies on that order. :fact[upec9v]
- `all()` and `byTag()` leave out an entry marked `draft: true` unless called with `{ includeDrafts: true }`. `allTags()` and `adjacent()` always leave it out. :fact[m9z6sr]
- The resolver builds its permalink lookup from `all()`. A draft therefore never resolves or prerenders. :fact[m9z6sr]
- `byId` still returns a draft. A route that looks an entry up by id has to check its `draft` field. :fact[m9z6sr]

## Name the origin once

*Sets the one origin each absolute URL starts from, before a production build writes it into the output.*

- The origin is one string with no trailing slash, and a production build needs it set to the deployed origin. The engine takes `PublicRoutesConfig.origin` as a plain string, and keeping it in one string literal is the scaffold's choice. :fact[niuzzg] :fact[k16chc]
- The engine joins the origin and a leading-slash path with no normalization. A trailing slash doubles the slash in each canonical URL and sitemap `loc`. :fact[mtltw7]
- Because the prerendered routes run at build time, a build writes its configured origin into each canonical URL, `og:url`, feed, and sitemap row. :fact[k16chc]
- To set the origin, follow these steps:
1. In your content module, set the origin literal to your deployed origin. On a scaffolded site, replace the placeholder `'https://showcase.test'` in `src/chassis/content.ts`. :fact[ioh6uj]
2. In `wrangler.jsonc`, set `PUBLIC_ORIGIN` to the same origin. The Worker reads that value at runtime. :fact[ioh6uj]
- Code: the scaffold's origin literal and the `siteMeta` object composed from it. :source[/templates/waymark/src/chassis/content.ts] :fact[ioh6uj]
- The scaffold composes `siteMeta` once from the literal. The scaffold's entry config, feeds, sitemap, and robots route read that object. :fact[niuzzg] :fact[ioh6uj]

## Wire the entry pages

*Composes the shared config from the index and the origin, then mounts the catch-all that renders each entry.*

- `createPublicRoutes` turns one `PublicRoutesConfig` into four functions. `entries` lists each routable entry for the prerenderer, and `entryLoad` loads one entry. `markdownEntries` and `markdownLoad` serve the markdown twin. :fact[pkt8i6]
- To wire the entry pages, follow these steps:
1. In a separate module, export one `PublicRoutesConfig` with `site`, `render`, `origin`, `siteName`, and `description`. A scaffolded site keeps it in `src/chassis/public-routes.ts`. :fact[pkt8i6] :fact[zb2k9f]
2. In `src/routes/(site)/[...path]/+page.server.ts`, export `prerender = true`, `entries` from `routes.entries()`, and a `load` that returns `routes.entryLoad({ url })`. :fact[pkt8i6] :fact[1mkckz]
3. In the same directory's `+page.svelte`, render `CairnHead` from `@glw907/cairn-cms/delivery/head` with `seo={data.seo}`, then the entry's `html`. :fact[fvi8rk]
- Code: the scaffold's config module. This section covers its `resolveMedia` and `assetsEnabled` members after the entry page. [Declare the fields the head reads](#declare-the-fields-the-head-reads) covers its `defaultImage`, and [Serve the feeds](#serve-the-feeds) covers its `feeds`. :source[/templates/waymark/src/chassis/public-routes.ts] :fact[pkt8i6]
- Code: the catch-all's server module in its minimal form, without the scaffold's reference resolution. :fact[pkt8i6]
- See [Resolve the targets on the entry route](link-content-with-references.md#resolve-the-targets-on-the-entry-route).
- Code: a minimal entry page that renders `CairnHead` with `seo` and a `titleTemplate`, then `{@html data.html}` inside an `<article>`. :fact[fvi8rk] :fact[dvg5gn]
- The scaffold's entry page renders `ArticleView`, which renders `CairnHead` with the same `seo`. :fact[i8heft]
- `entryLoad` answers 404 for a path that no entry claims. :fact[pkt8i6]
- The load data carries `concept`, `entry` (the whole entry, including its frontmatter, body, and title), `html` (the body already run through the site's `render`), `canonicalUrl`, `seo`, the `newer` and `older` neighbors, and `heroImage` when a hero resolves. :fact[fvi8rk]
- The canonical URL is the origin plus the permalink, and `og:url` starts from the same origin. :fact[k16chc]
- See [`EntryData`](../reference/delivery.md#entrydata).
- `heroImage` is undefined when no hero is set, media is off, or the `media:` reference doesn't resolve. Where a hero is set, `entry.frontmatter.image.src` keeps the raw token whether or not it resolves. :fact[83gbov]
- `resolveMedia` alone turns hero resolution on. `assetsEnabled` resolves nothing. When it's on and `resolveMedia` is missing, each `createPublicRoutes` call logs `media.resolver_absent` once. :fact[bnt2wh]
- `titleTemplate` applies when `title` is left undefined. An explicit `title`, or `title={false}`, wins over it. :fact[dvg5gn]

## Declare the fields the head reads

*Completes each entry's head by declaring the fields it reads and naming a fallback image.*

- The head reads `description`, `image`, `robots`, and `author` from an entry's frontmatter. It reads `image`, `robots`, and `author` only when the concept's fieldset declares them. :fact[jsh6ae]
- To declare the fields, follow these steps:
1. In the adapter, declare the hero as an image field named `image` with `seo: true`. The scaffold declares `image: fields.image({ label: 'Hero image', seo: true })`. :fact[u41mw4] :fact[k5uws5]
2. If entries set `robots` or `author`, declare each in the same fieldset. :fact[jsh6ae]
3. In the shared `PublicRoutesConfig`, set `defaultImage` to an image the site serves. :fact[jguiox] :fact[nnup2g]
- Delivery reads the hero and the social image from the frontmatter key `image`. An `seo` image under another name validates and shows in the editor, but it never reaches the head. :fact[k5uws5]
- A concept marks at most one top-level image `seo: true`. A second one, or one nested in an object or array, throws at `defineFieldset()`. :fact[u41mw4]
- The scaffold sets `defaultImage` to the origin plus `/og/default.png` and ships no `static/` directory. Its fallback `og:image` answers 404 until you add that file or change `defaultImage`. :fact[nnup2g]
- The head falls back in a fixed order when an entry leaves a field empty:
- Description: the frontmatter `description`, else the entry's excerpt, else the config's `description`. The excerpt is the body's plain text, cut at a word boundary near 200 characters. :fact[j2rndg] :fact[nbn6j0]
- Social image: the resolved hero's absolute URL, else a string `image`, else `defaultImage`, each anchored to the origin. `twitter:card` is `summary_large_image` only when an image exists. :fact[jguiox]
- Page type: a dated entry is an `article`, with `article:published_time` and, when `updated` is set, `article:modified_time`. It also carries `article:author` when the entry sets `author`, and the feed links when the config sets `feeds`. An undated entry is a `website`. :fact[j81xye] :fact[9xy8j9]
- Structured data: one `Article` or `WebSite` JSON-LD object, which never carries the author. To add a richer schema.org type, replace `seo.jsonLd` before `CairnHead` renders it. :fact[kdo96n]

## Serve the markdown twin

*Adds a raw-markdown copy of each entry beside its page, built from the same shared config.*

- The markdown twin is a prerendered route beside the catch-all. It serves an entry's stored markdown body, unrendered and without its frontmatter, at the entry's permalink plus `.md`, for each entry not marked `noindex`. :fact[03lbjg] :fact[3r08v1]
- To serve the twin, follow these steps:
1. In `src/params.ts`, define an `md` matcher that accepts a segment ending in `.md`, through SvelteKit's `defineParams`. :fact[03lbjg] :fact[qtm9y2]
2. In `src/routes/(site)/[...path=md]/+server.ts`, export `prerender = true`, `entries` from `routes.markdownEntries()`, and a `GET` handler. :fact[03lbjg]
3. In that handler, read the body with `routes.markdownLoad({ url })` and return `markdownResponse({ body })`. :fact[03lbjg] :fact[pvk6h5]
4. In the entry page, pass `CairnHead` a `markdownUrl` of the canonical URL plus `.md`. :fact[dvg5gn] :fact[i8heft]
- Code: the scaffold's `md` matcher. :source[/templates/waymark/src/params.ts] :fact[03lbjg]
- Code: the scaffold's twin route. It imports the shared config. :fact[03lbjg]
- With both routes in place, `[...path=md]` takes the `.md` paths and `[...path]` keeps the rest. :fact[03lbjg]
- See [Sorting](https://svelte.dev/docs/kit/advanced-routing#Sorting).
- An entry whose `robots` carries `noindex` has no twin. `markdownEntries` skips it, `markdownLoad` answers 404, and the scaffold's page passes no `markdownUrl` for it. :fact[3r08v1] :fact[i8heft]
- Note: `markdownResponse` sets `text/markdown; charset=utf-8`, but `@sveltejs/adapter-cloudflare` doesn't carry a prerendered route's headers into the build. A local test under `wrangler dev` still served the file with that type, which suggests that Cloudflare derives it from the `.md` extension. No deployed zone has been tested. :fact[gwpffe]

## Mount the draft preview route

*Gives a hand-built site the route that a minted preview link opens, inside the entry pages' layout group.*

- An editor shares an unpublished draft through a link to `/preview/<token>`. The route renders the draft with `composeEntryData` from the same shared config, and `entryLoad` runs that function too. :fact[76m2vf] :fact[umdf7r] :fact[6c3amx]
- A scaffolded site's tree already carries the migration, the route, and the banner page, and the setup command's deploy step applies the migration. :fact[gepykz] :fact[6c3amx] :fact[6hmgmv] :fact[m4y3m4]
- A hand-built site needs an `AUTH_DB` D1 binding and the `PUBLIC_ORIGIN` value from [Name the origin once](#name-the-origin-once). The mint builds each link from `PUBLIC_ORIGIN`. :fact[049lo2] :fact[sp2org]
- To mount the route, follow these steps:
1. In the project directory, copy `0003_preview.sql` from the package's `migrations/` into the `migrations_dir` of your `AUTH_DB` binding. :fact[xxtooz] :fact[049lo2]
2. In the project directory, apply the migrations with `npx wrangler d1 migrations apply <database> --remote`, and with `--local` for local development. :fact[xxtooz]
- See [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
3. In the entry pages' route group, create `preview/[token]/+page.server.ts`. Export `prerender = false` and a `load` that returns `loadPreview(runtime, publicRoutesConfig, event)`. :fact[6c3amx] :fact[gvim4v]
4. In the same directory, create a `+page.svelte` that renders `PreviewBanner` from `@glw907/cairn-cms/public` with `preview={data.preview}`, then your article component. :fact[6hmgmv]
- Code: the scaffold's preview route module. A hand-built site adapts it by replacing the `#chassis` imports with imports from its modules. :fact[6c3amx] :fact[sp4ref]
- Code: the scaffold's preview page. It renders the same `ArticleView` as the entry page. :fact[6hmgmv]
- The route sits in the entry pages' group because the group's layout carries the site's stylesheets and chrome. A route outside the group renders the draft unstyled. :fact[gvim4v]
- A minted link points at `/preview/<token>`, and the route's directory name has to match it. :fact[76m2vf]
- If the route is prerendered, `loadPreview` throws a build error that names `export const prerender = false`. A prerendered copy would ship a token in a static asset. :fact[gvim4v]
- `loadPreview` strips the canonical link, `og:url`, and the JSON-LD `url` from the `seo` it returns. :fact[sp5seo]
- Warning: a parent layout's `load` runs for the preview route too, and the preview reads no session. Keep privileged values out of any layout the preview shares, or branch on `route.id` in that `load`. :fact[cnz554] :fact[afkvsb]
- See [Layout data](https://svelte.dev/docs/kit/load#Layout-data).
- To check a minted link, follow these steps:
1. In the admin, open an entry.
2. On the entry's edit screen, save an edit. :fact[pimnjy]
3. In the entry's **Details** slide-over, in the **Share preview** group, select **Share preview link**. The **Preview link** field shows a link on your origin whose path is `/preview/<token>`. :fact[6gmzt1] :fact[sp1mbt] :fact[76m2vf]
4. In a private browser window, open the link. The draft renders in your site's chrome and styles, with the banner above it. :fact[afkvsb] :fact[gvim4v] :fact[6hmgmv]
- If a mint answers `The preview_tokens table is missing.`, copy and apply `0003_preview.sql` to `AUTH_DB` before you mint again. :fact[rr00qr] :fact[049lo2]
- See [Public preview](../reference/sveltekit.md#public-preview).
- See [Log events](../reference/log-events.md).
- See [Share a draft preview](share-a-draft-preview.md), which covers hiding the **Share preview** group, a link's lifetime, and minting links from a custom admin screen.

## Serve the feeds

*Publishes the posts as RSS and JSON feeds whose links work outside the site.*

- Each feed route maps a concept's entries to `FeedItem`s and passes them, with a `FeedChannel`, to `rssResponse` or `jsonFeedResponse`. :fact[pvk6h5] :fact[70uh8b]
- To serve the feeds, follow these steps:
1. In a shared module, map the posts index's `all()` to `FeedItem`s. A scaffolded site does this in `src/chassis/feed.ts`. :fact[70uh8b] :fact[zb2k9f]
2. In that mapping, render each body with a `resolve` that prefixes the origin to `createLinkResolver(site)`'s permalink. A `cairn:` link then becomes an absolute URL. :fact[70uh8b] :fact[d7v5cg]
3. In `src/routes/feed.xml/+server.ts`, export `prerender = true` and return `rssResponse` with the channel and the items. :fact[8k9xwm] :fact[pvk6h5]
4. In `src/routes/feed.json/+server.ts`, do the same with `jsonFeedResponse`. :fact[70uh8b]
5. In the shared `PublicRoutesConfig`, set `feeds` to the two feed URLs. :fact[9xy8j9]
- Code: the scaffold's RSS route. :source[/templates/waymark/src/routes/feed.xml/+server.ts] :fact[8k9xwm]
- Each item carries an origin-anchored `url`, the excerpt as `summary`, and the rendered body as `contentHtml`. :fact[70uh8b]
- A `FeedChannel` is `title`, `description`, `siteUrl`, and `feedUrl`, with optional `language` and `author`. A `FeedItem` needs `title`, `url`, and `summary`, with optional `date`, `updated`, `contentHtml`, and `tags`. :fact[pvk6h5]
- See [Feeds, sitemap, and robots](../reference/delivery-data.md#feeds-sitemap-and-robots).
- The scaffold's mapping also resolves `::include` fragments and makes image URLs absolute. :fact[2dqwmu]
- The link resolver throws on a missing target or one in a concept that isn't routable. A dangling `cairn:` link fails the build. :fact[d7v5cg]
- `feeds` adds `rel="alternate"` links to a dated entry's head and serves nothing. Feed readers fetch the feeds from the two feed routes. :fact[9xy8j9]

## Serve the sitemap

*Lists the entry pages, and the other pages you name, for crawlers.*

- The sitemap route passes `sitemapResponse` one `SitemapUrl` per page. Each has a `loc`, built from the origin, and an optional `lastmod`. :fact[pvk6h5]
- The scaffold builds its rows by hand from `site.all()` plus the site root, with `lastmod` taken from `date` alone. :fact[mt7qcl]
- Code: the scaffold's sitemap route. :source[/templates/waymark/src/routes/sitemap.xml/+server.ts] :fact[mt7qcl] :fact[8k9xwm]
- If the sitemap should take `lastmod` from `updated`, or list pages that aren't entries, build the rows with `buildSitemapView`. :fact[mc3n4w]
- To build the rows with `buildSitemapView`, follow these steps:
1. In `src/routes/sitemap.xml/+server.ts`, export `prerender = true`. :fact[8k9xwm]
2. In the `GET` handler, call `buildSitemapView` with `site`, `buildSiteDescriptors(cairn, siteConfig)`, the origin, and your non-entry paths as `extraRoutes`. :fact[mc3n4w] :fact[nibegw]
3. In the same handler, return `sitemapResponse` with the rows. :fact[pvk6h5]
- Code: a sitemap route built with `buildSitemapView`, with `extraRoutes` of `'/'` and `'/contact'`, a path no scaffold entry claims (the scaffold's `/about` is a pages entry, so passing it would list it twice). :fact[mc3n4w]
- `extraRoutes` come first, with no `lastmod`. An entry's `lastmod` is its `updated` date, else its `date`. :fact[mc3n4w]
- A page that isn't an entry, such as a contact page or a tag index, appears only through `extraRoutes`. :fact[mc3n4w]
- `buildSitemapView`, `buildSiteDescriptors`, `renderJsonLdScript`, and `buildExcerpt` are pure functions on `@glw907/cairn-cms/delivery/data`, which `/delivery` re-exports. :fact[nibegw]
- See [`buildSitemapView`](../reference/delivery-data.md#buildsitemapview).
- An entry marked `noindex` still gets a row. :fact[ms7l5u]
- See [Keep noindex entries out of the sitemap and feeds](#keep-noindex-entries-out-of-the-sitemap-and-feeds).

## Serve robots.txt

*Points crawlers at the sitemap and keeps them out of the admin.*

- In `src/routes/robots.txt/+server.ts`, export `prerender = true` and return `robotsResponse({ sitemapUrl, disallow: ['/admin'] })`, as the scaffold does. :fact[8k9xwm] :fact[0elmiu]
- Code: the scaffold's robots route without its `posture` line and the cast that reads it. :fact[0elmiu]
- `robotsResponse` writes `Allow: /` and disallows the paths you pass. Without `/admin`, the file lets a crawler fetch the admin's pages. :fact[0elmiu]
- The admin's sign-in and confirm pages also carry a `noindex, nofollow` robots meta tag. :fact[0elmiu]
- `robotsResponse` also takes a `posture` option, a stance toward AI-training crawlers. :fact[xafwcw]
- See [Pass the posture to the robots route](choose-an-ai-posture.md#pass-the-posture-to-the-robots-route).

## Keep noindex entries out of the sitemap and feeds

*Lets the reader drop entries that ask not to be indexed from the files that would still list them.*

- The index's lists leave drafts out, but an entry whose `robots` field carries `noindex` still appears in the scaffold's sitemap and feeds. :fact[m9z6sr] :fact[ms7l5u]
- Of the public outputs, the head's robots meta tag and the markdown twin read the `robots` field. The sitemap builders and the scaffold's feed mapping ignore it. :fact[ms7l5u] :fact[3r08v1]
- To keep `noindex` entries out, follow these steps: :fact[ms7l5u] :fact[jsh6ae]
1. In the sitemap route, drop each entry whose `robots` includes `noindex`, read with `readSeoFields`. :fact[ms7l5u] :fact[jsh6ae]
2. In the feed mapping, drop the same entries. :fact[ms7l5u]
- Code: an `isNoindex` helper that takes a `ContentSummary` from the sitemap's `site.all()` or the posts index's `all()`, reaches the entry through `site.byPermalink(summary.permalink)`, and reads `readSeoFields(entry.frontmatter).robots`. It covers the rows of each routable concept, which a lookup through one concept index's `byId` would miss. :fact[jsh6ae] :fact[mt7qcl]
- The field reaches the frontmatter only when the fieldset declares `robots`, as [Declare the fields the head reads](#declare-the-fields-the-head-reads) shows. :fact[jsh6ae]

## Build the archive

*Paginates a dated concept's entries in the order the index already gives.*

- A dated concept's `all()` already returns entries newest first. The archive route paginates that list without sorting it. :fact[upec9v]
- In a dated concept, an entry with no date sorts after the dated ones. An undated concept sorts its entries by `title`. :fact[upec9v]
- The scaffold's `ARCHIVE_PAGE_SIZE`, 13, sets the page size for the home page and `/archive/[page]`. The home page shows the newest post as its lead, and both paginate the posts after it. :fact[38pjqy]
- To add the archive, follow these steps:
1. In `src/routes/(site)/archive/[page]/+page.server.ts`, export `prerender = true` and an `entries` generator that lists the real page numbers. :fact[38pjqy] :fact[upec9v]
2. In `vite.config.ts`, in the `prerender` option's `handleUnseenRoutes` handler, exempt the archive route by its id. :fact[2zl3qz]
- A corpus that fits on one page gives the archive route no entries. SvelteKit's crawl check then fails the build. :fact[2zl3qz]
- The scaffold exempts `/(site)/archive/[page]` alone. Any other unseen prerenderable route still fails the build. :fact[2zl3qz]
- See [Crawl rules](scaffolded-site-files.md#crawl-rules).
- See SvelteKit's [prerender configuration](https://svelte.dev/docs/kit/configuration#prerender) for `handleUnseenRoutes` and its [page options](https://svelte.dev/docs/kit/page-options#entries) for `entries`. :fact[2zl3qz]
- The engine builds no head for the archive. See [Give other pages a head](#give-other-pages-a-head). :fact[k7nln3]

## Give other pages a head

*Builds the head that the engine leaves out for pages other than entries.*

- `createPublicRoutes` builds a head for entry pages. A home, archive, or tag page gets a description, canonical link, or Open Graph tags only when its route builds one. :fact[k7nln3]
- The scaffold's home page sets only a `<title>`. :fact[k7nln3]
- To give a page a head, follow these steps:
1. In the page's `+page.server.ts` `load`, return the result of `buildSeoMeta` with the page's title, a description, its canonical URL, and the site name. :fact[7ssfr1]
2. In its `+page.svelte`, render `CairnHead` with that `seo`. :fact[7ssfr1] :fact[fvi8rk]
- Code: a server module and a page for a contact page at `src/routes/(site)/contact/`, a path no entry claims (a static `(site)/about` route would collide with the scaffold's `about` pages entry). :fact[7ssfr1]
- See [`buildSeoMeta`](../reference/delivery-data.md#buildseometa).
- A page that writes its JSON-LD `<script>` without `CairnHead` serializes it with `renderJsonLdScript`. `buildExcerpt` cuts a description from a markdown body. :fact[nibegw] :fact[nbn6j0]
- The `titleTemplate` rule from the entry pages applies here too. :fact[dvg5gn]

## Add a tag page

*Lists one tag's entries on a prerendered page, with the head and sitemap rows it needs.*

- A tag page lists one tag's entries with `byTag()` and enumerates its paths with `allTags()`. Both leave drafts out. :fact[m9z6sr]
- The concept marks its tag field `taxonomy: true`, and the index reads that field as each entry's tags. :fact[g9q627]
- See [Mark the tag field](define-an-adapter-and-schema.md#mark-the-tag-field).
- To add a tag page, follow these steps:
1. In `src/routes/(site)/tags/[tag]/+page.server.ts`, export `prerender = true` and an `entries` that maps the concept index's `allTags()` to `{ tag }`. :fact[ybaokb]
2. In the same file's `load`, return `byTag(params.tag)` and a head from `buildSeoMeta`. :fact[m9z6sr] :fact[7ssfr1]
3. In `+page.svelte`, render `CairnHead` and the list of entries. :fact[fvi8rk]
4. If the sitemap route uses `buildSitemapView`, add each tag page's path to `extraRoutes`. :fact[mc3n4w]
5. If the sitemap route builds its rows by hand, as the scaffold's does, add one row per tag page. Its `loc` is the origin plus the page's path. :fact[mt7qcl] :fact[pvk6h5]
6. If the site may have no tags yet, in `vite.config.ts`, exempt the tag route in `handleUnseenRoutes`, as [Build the archive](#build-the-archive) shows. :fact[2zl3qz]
- Code: the tag page's server module, at a local path. :fact[ybaokb] :fact[m9z6sr]
- `allTags()` returns one `{ tag, count }` item per tag that a non-draft entry carries. A tag that only drafts carry gets no page. :fact[ybaokb]

## Add an editable menu

*Lets editors change the site's menu in the admin while the public layout reads it.*

- Declaring `editor.nav` on the adapter turns on the menu editor at `/admin/nav`, and the public layout reads the same menu with `readMenu`. :fact[rnwver]
- To add the menu, follow these steps:
1. In the adapter's `editor` group, declare `nav` with `menuName`, `label`, and an optional `maxDepth`, which defaults to 2. :fact[f9aayq]
2. If your site config isn't at `src/theme/site.config.yaml`, set `editor.siteConfigPath` to its path. :fact[shv6wv]
3. In the site config, under `menus`, add the menu that `menuName` names, as a list of nodes. :fact[t895qz] :fact[rzfdqw]
4. In a server-only module, read the menu with `readMenu(siteConfig, name, maxDepth)`, passing the `maxDepth` that `editor.nav` declares. :fact[rnwver] :fact[ri06xw]
5. In the root `src/routes/+layout.server.ts`, return the menu from the `load`. :fact[ri06xw]
- The scaffold declares `nav: { menuName: 'primary', label: 'Navigation', maxDepth: 2 }`. `label` names the nav screen in the admin sidebar. :fact[f9aayq]
- Without `editor.nav`, `/admin/nav` answers 404, and a `navLayout` that references the `nav` screen throws at server start. :fact[rnwver]
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- The menu editor reads and commits the file that `editor.siteConfigPath` names. The Settings screen saves tidy's conventions to the same file. :fact[shv6wv]
- See [Let editors change the conventions](turn-on-tidy.md#let-editors-change-the-conventions).
- Code: a short `menus.primary` in YAML with a group header and one child, using local example labels and paths. :fact[rzfdqw]
- The menu editor and `readMenu` check each menu against these rules:
- A node is `{ label, url?, children? }`, and a node with no `url` is a group header. :fact[rzfdqw]
- A label is non-empty and at most 500 characters. :fact[rzfdqw]
- A URL is at most 2048 characters and starts with `/`, `#`, `http://`, `https://`, `mailto:`, or `tel:`. :fact[rzfdqw]
- The tree holds at most 200 nodes and nests no deeper than `maxDepth`. :fact[rzfdqw]
- Any other key is dropped. :fact[rzfdqw]
- `readMenu` returns an empty list for an absent menu and throws a `NavValidationError` on a broken rule. :fact[rzfdqw]
- The scaffold reads its menus once in `src/theme/site-config.ts`. Because the layout load imports that module rather than the full adapter, it skips the renderer's cost. :fact[ri06xw]
- The scaffold's `menus.footer` is a flat list outside `/admin/nav`: you edit it in `site.config.yaml` and read it with `readMenu(siteConfig, 'footer', 1)`. :fact[2s8u70] :fact[t895qz]
- See [`readMenu`](../reference/core.md#readmenu).

## Verify the built routes

*Has the reader build the site and read the prerendered files for their origin.*

- To check the build, follow these steps:
1. In the project directory, run `npm run build`. If the build stops, go to [Diagnose a failed build](#diagnose-a-failed-build). :fact[a98mnn]
2. In the project directory, serve the build. A scaffolded site's `npm run preview` runs `wrangler dev`. On another site, run `wrangler dev` directly. `vite preview` can't serve the output of `@sveltejs/adapter-cloudflare` version 8, a limit that an [open SvelteKit issue](https://github.com/sveltejs/kit/issues/17271) tracks. :fact[8k9xwm] :fact[gwpffe]
3. In a terminal, fetch `/sitemap.xml` from the local server. Each `loc` starts with your deployed origin, not the local server's address. :fact[k16chc] :fact[mtltw7]
4. In the same terminal, fetch `/feed.xml` and `/feed.json`. Each lists the published posts with absolute URLs. :fact[70uh8b]
5. In the same terminal, fetch `/robots.txt`. It holds a `Disallow: /admin` line and a `Sitemap:` line naming your origin's `/sitemap.xml`. :fact[0elmiu]
6. Fetch an entry's twin with `curl -s '<local-server>/<permalink>.md'`. The response is the entry's stored markdown body, unrendered, without its frontmatter. :fact[03lbjg]
7. In a browser, open an entry and view its source. The canonical link and `og:url` are your origin plus the permalink. :fact[k16chc]

## Diagnose a failed build

*Maps each message a failed build prints to its cause and fix.*

- The public routes fail the build on content they can't serve. :fact[kv3qen] :fact[ky39tz] :fact[d7v5cg]
- See [Resolve a content build failure](add-cairn-to-a-sveltekit-app.md#resolve-a-content-build-failure).
- The following rows give each message, its cause, and its fix:

:::row
**Symptom.** The build stops with `expected input to be a string or buffer`.
**Cause.** A glob passed to `createSiteIndexes` is lazy, or it lacks `import: 'default'`. The parser then receives a function or a module object instead of the file's text. :fact[n07oiu]
**Fix.** Write the glob as [Build one typed index](#build-one-typed-index) shows.
:::

:::row
**Symptom.** The build stops with `cairn: <n> invalid frontmatter field(s):`, then one line per field in the form `<dir>/<id>: <field>: <message>`.
**Cause.** A published entry's frontmatter fails its concept's validation. An invalid draft doesn't fail the build. :fact[kv3qen]
**Fix.** Correct the field, or mark the entry `draft: true`. :fact[kv3qen]
:::

:::row
**Symptom.** The build stops with `cairn: permalink "<p>" resolves to both "<a>" and "<b>"`.
**Cause.** Two published entries of routable concepts share a permalink. :fact[ky39tz]
**Fix.** Change one entry's slug or permalink.
:::

:::row
**Symptom.** The build stops with `cairn: link target "cairn:<concept>/<id>" not found`.
**Cause.** A `cairn:` link in a rendered body points at a missing entry or at a concept that isn't routable. :fact[d7v5cg]
**Fix.** Correct the link or remove it.
:::

:::row
**Symptom.** SvelteKit stops the build on an unseen prerenderable route.
**Cause.** The route's `entries` returned nothing. An archive route does that when the corpus fits on one page. :fact[2zl3qz]
**Fix.** Exempt the route by its id in `handleUnseenRoutes`, as [Build the archive](#build-the-archive) shows. :fact[2zl3qz]
:::

:::row
**Symptom.** The build stops with a `NavValidationError`.
**Cause.** A menu in the site config breaks a node rule. :fact[rzfdqw]
**Fix.** Correct the node as [Add an editable menu](#add-an-editable-menu) lists.
:::

- With `validate: false` in its fourth argument, `createSiteIndexes` doesn't fail the build on invalid frontmatter. An invalid entry, draft or not, is still left out of the index and listed by the index's `problems()`. :fact[kv3qen]

## See also

*Links the reference entries and neighboring guides a reader goes to next.*

- The following pages cover the reference entries and neighboring guides for these routes:
- See [`createPublicRoutes`](../reference/delivery.md#createpublicroutes).
- See [Delivery data](../reference/delivery-data.md).
- See [Choose an AI posture](choose-an-ai-posture.md).
- See [Act on newly published entries](act-on-newly-published-entries.md).
- See [Turn on tidy](turn-on-tidy.md).
- See [Configure media](configure-media.md).
- See [Theme your public site](theme-your-public-site.md).
- See [Scaffolded site files](scaffolded-site-files.md).
- See [Share a draft preview](share-a-draft-preview.md).
