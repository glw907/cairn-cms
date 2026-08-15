# What the scaffold wrote

**Contract:** map every file `create-cairn-site` puts in your repository to the page that
explains it, so you can find your way around a tree you didn't write by hand.

The scaffold is Waymark, cairn's own reference theme, baked from the same source tree the engine
tests itself against (`examples/showcase` in the cairn-cms repository) and pruned of everything
that tree carries only for the engine's own development: its Playwright suite, its design-review
tooling, and a members-login fixture that demonstrates a second auth channel rather than
belonging to every site. What's left is a real, complete site: one theme, one content model, and
every route a published site needs.

This tree is not the same shape [Build a site by hand](./build-a-site-by-hand.md) walks through.
That page starts from a bare `sv create` scaffold and adds cairn file by file; this page
describes the tool's own output, which starts from Waymark and already carries a
`svelte.config.js` (Waymark predates the current `sv create`'s inline-config shape and hasn't
migrated). Both are valid; they're just different starting points.

## Root

| File | What it is |
| --- | --- |
| `svelte.config.js` | The kit config: the Cloudflare adapter, `csrf: { checkOrigin: false }`, and the `$chassis`/`$theme` path aliases. |
| `vite.config.ts` | The build config: the `cairnManifest` plugin (regenerates the committed content manifest on build) and the `__CAIRN_DEV_BUILD__` define the dev backend gates on. |
| `wrangler.jsonc` | The Worker's bindings: `AUTH_DB` (D1), `EMAIL` (Email Sending), `MEDIA_BUCKET` (R2), and `PUBLIC_ORIGIN`. `create-cairn-site` fills the ids in; see [Before you start](../admin/before-you-start.md) for what each binding costs. |
| `migrations/` | The auth store's schema. See [Add cairn to a SvelteKit app](./add-cairn-to-a-sveltekit-app.md#provision-the-auth-database) for what each numbered file does. |
| `package.json` | Standard SvelteKit dependencies plus `@glw907/cairn-cms`. `npm run dev` starts a local admin backed by an in-memory double; `npm run build` produces the deployable Worker. |

## Content (`src/content/`)

One directory per concept, plus a hidden `.cairn/` directory the build writes and a person never
edits by hand: `src/content/.cairn/index.json` (the committed content manifest
[`serializeManifest`/`verifyManifest`](../reference/core.md#manifest-serialize-and-verify)
maintain) and `src/content/.cairn/media.json` (the media asset registry, when the media library
is turned on). The scaffold seeds `posts/`, `pages/`, and `fragments/` with sample entries, so
you have something to look at, edit, and delete before you write your own.

## The theme (`src/theme/`)

| File | What it is |
| --- | --- |
| `cairn.config.ts` | The adapter: concepts, fields, the render pipeline, registered components, the backend, and the icon set. See [Define an adapter and schema](./define-an-adapter-and-schema.md) and [Configure rendering](./configure-rendering.md). |
| `site-config.ts` | Parses `site.config.yaml` with [`parseSiteConfig`](../reference/core.md#parsesiteconfig). |
| `site.config.yaml` | Site name, description, nav menus, and the tag vocabulary. See [Manage your tag vocabulary](../editors/manage-your-tag-vocabulary.md) for the editor side of that file. |
| `theme.css`, `site.css` | The theme's own design tokens and page-level styling, layered over the chassis's generic defaults. See [Design your site](./design-your-site.md). |
| `components/` | The theme's registered markdown components (`ArticleView`, `Carousel`, and the rest) and the public-facing chrome (`SiteHeader`, `SiteFooter`). |
| `islands/` | The one hydrated component the scaffold ships (`Banner.svelte`) as a worked example. See [Add an island](./add-an-island.md). |

## Admin routes (`src/routes/admin/`)

`+layout.server.ts` and `+layout.svelte` mount the shared admin shell; `[...path]/+page.server.ts`
and `[...path]/+page.svelte` are the single catch-all that serves every built-in admin view. Both
pairs are the canonical mount, reproduced exactly in [The canonical admin
mount](../reference/admin-routes.md); you won't usually touch them. `signups/` is a worked
example of a custom screen living alongside the catch-all, the pattern [Add a custom admin
screen](./add-a-custom-admin-screen.md) walks through building from nothing.

## Public routes (`src/routes/`)

| Path | What it is |
| --- | --- |
| `(site)/[...path]/+page.server.ts`, `+page.svelte` | The catch-all that renders every entry, via [`createPublicRoutes`](../reference/delivery.md#createpublicroutes). |
| `(site)/[...path=md]/+server.ts` | The raw-markdown twin of the same catch-all, matched by the `md` param matcher in `src/params/md.ts`. See [Wire the delivery surface](./wire-the-delivery-surface.md#the-markdown-twin-and-the-md-route-shape). |
| `(site)/archive/[page]/` | A paginated post archive, built on the chassis's `archive.ts` slicing helper. |
| `(site)/preview/[token]/` | The [share-a-draft-preview](./share-a-draft-preview.md) landing page. |
| `(site)/styleguide/` | A living reference of the theme's own components and typography; useful while you're editing the theme, safe to delete otherwise. |
| `feed.xml/`, `feed.json/` | RSS and JSON Feed, via [`rssResponse`/`jsonFeedResponse`](../reference/delivery-data.md#rssresponse). |
| `sitemap.xml/` | Via [`sitemapResponse`](../reference/delivery-data.md#sitemapresponse). |
| `robots.txt/` | Via [`robotsResponse`](../reference/delivery-data.md#robotsresponse); see [Choose an AI posture](./choose-an-ai-posture.md) for the `posture` option it reads. |
| `media/[...path]/` | Streams content-addressed bytes from the R2 media bucket. |
| `healthz/` | A bare liveness check, unauthenticated, for an uptime monitor. |
| `+error.svelte` | The themed 404/error page. |

## The chassis (`src/chassis/`)

Genre-free plumbing the theme mounts onto: the content-index glob, the feed and delivery config
literals, the runtime composition point (`cairn.server.ts`), the dev-backend gate, the render
wiring, the archive-slicing helper, the date formatter, the theme toggle, and the base design
tokens and prose CSS every theme starts from. You'll read it more than you'll edit it; [Design
your site](./design-your-site.md) covers the seams it exposes for a theme to override, and
`src/chassis/README.md` in your own repository is the file-by-file reference for this directory
specifically, since it documents itself.
