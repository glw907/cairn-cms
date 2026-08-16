# What the scaffold wrote

**Contract:** map the cairn-specific files [`create-cairn-site`](../admin/create-your-site.md)
puts in your repository to the page that explains each one, so you can find your way around a
tree you didn't write by hand.

The scaffold is Waymark, cairn's own reference theme, taken from the same source tree the engine
tests itself against (`examples/showcase` in the cairn-cms repository). Everything that tree
carries only for the engine's own development is pruned out: the Playwright suite, the
design-review tooling, and a members-login fixture demonstrating a second auth channel. What's
left runs on its own, with one theme, one content model, and the public routes listed below.

This tree is not the same shape [Build a site by hand](./build-a-site-by-hand.md) walks through.
That page starts from a bare `sv create` scaffold and adds cairn file by file; this page
describes the tool's own output, which starts from Waymark and already carries a
`svelte.config.js` (Waymark predates the current `sv create`'s inline-config shape and hasn't
migrated).

```
your-site/
├── .gitattributes
├── .gitignore
├── migrations/
│   ├── 0000_auth.sql
│   └── 0003_preview.sql
├── migrations-app/
│   └── 0000_signups.sql
├── package.json
├── README.md
├── scripts/
│   └── dev.mjs
├── src/
│   ├── app.d.ts
│   ├── app.html
│   ├── chassis/
│   │   └── … (genre-free plumbing; see below)
│   ├── content/
│   │   ├── .cairn/
│   │   │   ├── index.json
│   │   │   └── media.json
│   │   ├── fragments/
│   │   │   └── trail-safety-notice.md
│   │   ├── pages/
│   │   │   ├── about.md
│   │   │   └── the-trail-crew.md
│   │   └── posts/
│   │       └── … (14 sample entries)
│   ├── hooks.server.ts
│   ├── params/
│   │   └── md.ts
│   ├── routes/
│   │   ├── admin/
│   │   │   ├── [...path]/
│   │   │   ├── signups/
│   │   │   ├── +layout.server.ts
│   │   │   └── +layout.svelte
│   │   ├── (site)/
│   │   │   ├── [...path]/
│   │   │   ├── [...path=md]/
│   │   │   ├── archive/[page]/
│   │   │   ├── preview/[token]/
│   │   │   ├── styleguide/
│   │   │   ├── +layout.server.ts
│   │   │   ├── +layout.svelte
│   │   │   └── +page.server.ts, +page.svelte
│   │   ├── probe-craft/
│   │   ├── feed.json/
│   │   ├── feed.xml/
│   │   ├── healthz/
│   │   ├── media/[...path]/
│   │   ├── robots.txt/
│   │   ├── sitemap.xml/
│   │   ├── +error.svelte
│   │   ├── +layout.server.ts
│   │   └── +layout.svelte
│   └── theme/
│       ├── cairn.config.ts
│       ├── components/
│       ├── islands/
│       ├── site-config.ts
│       ├── site.config.yaml
│       ├── site.css
│       └── theme.css
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc
```

*A tree from a `create-cairn-site` run. `.gitignore` and `.gitattributes` are really there: a
site scaffolded from the published package carries both.*

## Root

The tree above is complete; the map below is not. It covers the entries that are cairn-specific
or otherwise need explaining, and skips the tooling and plain SvelteKit files a developer already
recognizes (`tsconfig.json`, `README.md`, `scripts/`, `src/app.html`, the `src/chassis/` files
not named below, and the root and route-group `+layout.server.ts`/`+layout.svelte`/home
`+page.server.ts`/`+page.svelte` files SvelteKit's own routing expects). Two files it skips are
not plain: `src/hooks.server.ts` mounts `createAuthGuard()` behind the dev-backend gate, and
`src/app.d.ts` declares the platform bindings and `__CAIRN_DEV_BUILD__`. [Build a site by
hand](./build-a-site-by-hand.md) writes both from nothing.

| File | What it is |
| --- | --- |
| `svelte.config.js` | The kit config: the Cloudflare adapter, `csrf: { checkOrigin: false }`, and the `$chassis`/`$theme` path aliases. |
| `vite.config.ts` | The build config: the `cairnManifest` plugin (regenerates the committed content manifest on build) and the `__CAIRN_DEV_BUILD__` define the dev backend gates on. |
| `wrangler.jsonc` | The Worker's bindings: `AUTH_DB` (D1, the auth store), `APP_DB` (D1, a second database for the `signups/` example screen below), `EMAIL` (Email Sending), `MEDIA_BUCKET` (R2), and `PUBLIC_ORIGIN`. `create-cairn-site` fills the ids in; see [Before you start](../admin/before-you-start.md) for what each binding costs. |
| `migrations/` | The auth store's schema. See [Add cairn to a SvelteKit app](./add-cairn-to-a-sveltekit-app.md#provision-the-auth-database) for what each numbered file does. |
| `migrations-app/` | `APP_DB`'s own schema, applied the same way (`wrangler d1 migrations apply`) but against `APP_DB`, never `migrations/`: each database walks its own directory. |
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
screen](./add-a-custom-admin-screen.md) walks through building from nothing; it reads from
`APP_DB`, so apply that database's own migration before you expect its data to show.

## Public routes (`src/routes/`)

| Path | What it is |
| --- | --- |
| `(site)/[...path]/+page.server.ts`, `+page.svelte` | The catch-all that renders every entry, via [`createPublicRoutes`](../reference/delivery.md#createpublicroutes). |
| `(site)/[...path=md]/+server.ts` | The raw-markdown twin of the same catch-all, matched by the `md` param matcher in `src/params/md.ts`. See [Wire the delivery surface](./wire-the-delivery-surface.md#the-markdown-twin-and-the-md-route-shape). |
| `(site)/archive/[page]/` | A paginated post archive, built on the chassis's `archive.ts` slicing helper. |
| `(site)/preview/[token]/` | The [share-a-draft-preview](./share-a-draft-preview.md) landing page. |
| `(site)/styleguide/` | A living reference of the theme's own components and typography; useful while you're editing the theme, safe to delete otherwise. |
| `probe-craft/` | A leftover fixture from the engine's own admin design work, stock DaisyUI with none of cairn's own styling. It carries no content, and nothing else in the scaffold links to it; safe to delete. |
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
`src/chassis/README.md` in your own repository lists the directory file by file, which is why
this page doesn't.
