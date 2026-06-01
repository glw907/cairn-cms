# cairn delivery-surface DX design

## Context

ecnordic is the first site to consume cairn's public delivery, wired by hand in its Pass 1b
(2026-06-01). That exercise surfaced a developer-experience problem in the engine, and the problem
is not that the engine ships too little.

The engine already ships the delivery path ecnordic rebuilt. `createSiteIndex`
(`src/lib/delivery/site-index.ts`) returns a `SiteIndex` with `byPermalink(path)`, the exact
resolver ecnordic reimplemented as a hand-built `Map` in its `src/lib/content.ts`.
`createPublicRoutes` (`src/lib/sveltekit/public-routes.ts`) returns a catch-all loader set
(`entryLoad`, `archiveLoad`, `tagIndexLoad`, `tagLoad`, `entries`) with a prerender enumerator,
the catch-all route ecnordic hand-wrote. Both have existed since 0.7.0. ecnordic's Pass 1b design
asserted "the shipped 0.10 does not have those" and rebuilt equivalents. The feature shipped; the
developer could not find it.

Three things made it dodgeable, and they are the real targets of this pass:

1. **Undiscoverable.** No public-delivery example exists in the showcase, and the integration guide
   (`docs/creating-a-cairn-site.md`) predates the entire delivery layer. A developer learns the
   surface by reading `dist/*.d.ts`.
2. **Barrel-coupled.** `public-routes.ts` itself imports only `@sveltejs/kit` plus types, but it
   lives in the `/sveltekit` barrel beside `createAuthRoutes`/`createContentRoutes`, which import
   github, auth, D1, and email. Importing the public loader drags the whole server backend into a
   public bundle, so a developer avoiding `/sveltekit` for bundle weight has a real reason.
3. **Partially complete.** `createPublicRoutes` does not build the SEO head, and there are no feed,
   sitemap, or robots endpoint helpers, so a site still hand-wires those. Frontmatter validation
   never runs on the delivery read path (`createContentIndex` parses but does not call
   `concept.validate`; the only `validate` call site is the admin save path,
   `src/lib/sveltekit/content-routes.ts:244`), so hand-committed bad frontmatter no longer fails the
   build.

## Goal

Turn the existing delivery layer into the complete, canonical, dependency-light path a site wires in
a few lines, and prove it in the showcase so it is discoverable. After this pass a developer reaches
for one documented entry point, follows a working example, and gets a validated, SEO-complete,
feed-and-sitemap-equipped public site without re-deriving any of it.

## Scope

**In.** All engine work plus an executable example and a refreshed guide, landed and published from
`cairn-cms`. The showcase app gains real public content and becomes the proving consumer and a
regression surface, so the blessed path ships exercised end to end.

**Out.** ecnordic and 907 refactoring their delivery onto the blessed path are separate follow-on
site-passes against the published version. ecnordic's hand-rolled Pass 1b stays in production until
its adopt-the-path pass. The visual body of the catch-all page (the post and page markup, a site's
own style cascade) stays site-owned, because each site's design differs. The engine ships the head
and the data, not the layout. No god-facade that wires everything from one call; the pieces stay
composable.

This re-sequences the roadmap. ecnordic's hand-wiring was the prototype. This pass turns the
prototype into the blessed path, then the sites and the `create-cairn-site` scaffolder (Plan 10)
consume it instead of each re-deriving it.

## Architecture

### Packaging: a `/delivery` entry, decoupled from the backend

Add a fourth package entry, `@glw907/cairn-cms/delivery`, that exports the public delivery toolkit
and imports none of the backend: `createContentIndex`, `fromGlob`, `createSiteIndex`,
`createPublicRoutes`, `buildRssFeed`, `buildJsonFeed`, `buildSitemap`, `buildRobots`, `buildSeoMeta`,
`paginate`, the excerpt helpers, the new endpoint helpers, the new validation, `siteDescriptors`,
and the `<CairnHead>` component. `/sveltekit` keeps re-exporting `createPublicRoutes` for
back-compat, but `/delivery` becomes the documented import. Root `.` is unchanged this pass.

The package's `exports` map gets the `./delivery` key (mirroring the existing `.`, `./sveltekit`,
`./components`). The module graph under `/delivery` reaches only `@sveltejs/kit` (for `error` in the
route loaders) and the `src/lib/delivery/` modules plus the small content helpers they already use
(`normalizeConcepts`, `urlPolicyFrom`, `parseMarkdown`, `permalink`). It must not reach
`src/lib/github/`, `src/lib/auth/`, or `src/lib/email.ts`. A test asserts this boundary.

One accepted tradeoff: `/delivery` includes route loaders that import `@sveltejs/kit`, so it is not
usable by a non-SvelteKit consumer. cairn targets SvelteKit, and the pure data builders remain on
root `.` for anyone who wants them kit-free.

### Validation safe-by-default in the blessed path

`createSiteIndex` (and `createPublicRoutes`, which builds on it) validate every entry through the
concept's own `validate` at build, and on any failure throw one aggregated error that names each
offending file and the fields that failed. `createContentIndex` stays permissive, because it is the
low-level primitive and is read in contexts where throwing would be wrong.

This restores the build gate the old hand-rolled `posts.ts` had, scoped to the build and prerender
path. A site whose content was committed outside the admin (hand-edited, bulk-imported) now fails
the build with a precise message instead of shipping malformed pages. The concept's `validate`
travels with its descriptor through `normalizeConcepts`, so the blessed path can validate without
new caller inputs. The plan decides where that hooks in: whether `createSiteIndex` takes the
descriptors directly, or the `ConceptIndex` it already receives carries `validate`.

### SEO in the loader

`createPublicRoutes`' `entryLoad` gains a `seo: SeoMeta`, built from the resolved entry plus site
inputs. `PublicRoutesDeps` grows the inputs `buildSeoMeta` needs that are not already present: the
site name, the site description, and the feed URLs (the origin and per-entry permalink are already
in scope). The catch-all route stops hand-calling `buildSeoMeta`; it reads `data.seo` and renders it
through `<CairnHead>`.

### Endpoint helpers

Add thin response helpers in `src/lib/delivery/` that turn the existing builders into a ready
`Response` with the correct `Content-Type`:

- `rssResponse(channel, items)` over `buildRssFeed`
- `jsonFeedResponse(channel, items)` over `buildJsonFeed`
- `sitemapResponse(urls)` over `buildSitemap`
- `robotsResponse(opts)` over `buildRobots`

A site's `feed.xml/+server.ts` becomes one line over the content index instead of the roughly
twenty-five ecnordic wrote. The helpers own the content type and charset, the one detail every site
otherwise copies and occasionally gets wrong.

### `<CairnHead>` component and `jsonLdScript`

Ship a `<CairnHead {seo} />` Svelte component from `/delivery` that renders the title, the `meta` and
`link` tags, and the JSON-LD block. It escapes `<`, `>`, and `&` in the serialized JSON-LD before
inlining, so no site re-trips the script-element breakout (the footgun the ecnordic plan itself
shipped before review caught it). A standalone `jsonLdScript(obj): string` helper ships alongside for
non-Svelte use and as the unit the component calls.

The component renders only non-visual head content, so it carries no theme or CSS dependency and does
not pull in the admin styles. A site keeps full control of `<title>` format by passing the title it
wants; the component does not impose a site-name suffix.

### `siteDescriptors` one-liner

Add `siteDescriptors(adapter, siteConfig)` wrapping
`normalizeConcepts(adapter.content, urlPolicyFrom(siteConfig))`. The two-call incantation that lived
as tribal knowledge in a plan comment becomes one obvious call, and the YAML URL policy stays the
single source of truth for every derived URL.

## Data flow

A request for a post or page falls through to the site's `[...path]` route. Its `+page.server.ts`
calls the `entryLoad` from `createPublicRoutes`, which resolves the path through the `SiteIndex`
`byPermalink`, renders the body through the site renderer, builds the SEO head, and returns
`{ entry, html, canonicalUrl, newer, older, seo }`. The `+page.svelte` renders `<CairnHead {seo} />`
in `<svelte:head>` and the body in its own site-owned markup. The build prerenders every URL because
the route's `entries()` delegates to `SiteIndex.entries()`. The feed, sitemap, and robots
`+server.ts` endpoints each call one response helper over the same content index. The whole site
reads one `SiteIndex`, built once from `siteDescriptors` and the globbed markdown.

## Testing and verification

- Unit: the validation aggregation against good and bad fixtures (a missing required field fails with
  the file and field named); each endpoint helper (correct content type, a document that parses);
  `siteDescriptors` (the descriptors match a direct `normalizeConcepts` call); `<CairnHead>` and
  `jsonLdScript` escaping (a title containing `</script>` stays contained, and the escaped output
  parses back to the same object).
- Boundary: a test asserts the `/delivery` module graph reaches no github, auth, or email module.
- End to end: the showcase gains real public content (a few posts and pages) and wires `[...path]`
  via `createPublicRoutes` and `<CairnHead>`, plus the three endpoint routes. The showcase build
  prerendering the catch-all, the feeds, the sitemap, and robots is the end-to-end gate. The showcase
  currently proves only the admin surface; this makes it prove delivery too and gives developers a
  copy-from reference.

## Docs

Refresh `docs/creating-a-cairn-site.md` rather than add a standalone delivery doc:

- Add a "Public delivery" section covering the `/delivery` entry, `siteDescriptors` plus
  `createSiteIndex`, the `[...path]` catch-all via `createPublicRoutes`, `<CairnHead>`, and the
  feed/sitemap/robots endpoint helpers, wired end to end against the showcase.
- Refresh the stale parts: drop the old `[Shipped]`/`[Planned: Pass I/J/K]`/`[R9]` status tags,
  correct the adapter-contract and route-shim sections to the current API, and add the dated-slug URL
  model the guide never covered.
- Scope guard: bring the guide current for what a developer needs to wire a site. The component
  reference file and the eventual llms-full doc cover exhaustive per-subsystem reference; the showcase
  stays the executable companion to the prose.

## Decisions locked

- The engine owns the complete, canonical delivery path. Developer ergonomics wins over minimal API
  surface here, against the usual keep-core-lean default, by explicit choice.
- A dedicated `/delivery` entry is the canonical import, decoupled from the auth and github backend.
- Validation is safe-by-default in `createSiteIndex`/`createPublicRoutes` and permissive in
  `createContentIndex`.
- The engine ships the head (`<CairnHead>`) and the data, not the visual body of content pages.
- Composable pieces, no single `createDelivery` god-facade.

## Out of scope and follow-ons

- ecnordic "Pass 1c: adopt the blessed delivery path" deletes its hand-rolled `content.ts` resolver
  and feed routes in favor of `/delivery`.
- 907-life wires the blessed path directly in its migration, with `datePrefix: day`.
- The `create-cairn-site` scaffolder (Plan 10) templates the blessed path.
- A full llms-full developer reference, beyond the refreshed integration guide.

These are recorded as the immediate next steps in `docs/STATUS.md` once this pass publishes.
