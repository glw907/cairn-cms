# Creating a Cairn site

> **Status: living draft (started 2026-05-26 during the admin-UI brainstorm).** The adapter, the
> admin, the render engine, and the public delivery surface ship in 0.10. A few sections still flag
> open design rounds inline. See `docs/PLAN.md` and the specs under `docs/superpowers/specs/`.

> **Vocabulary (settled 2026-05-26).** The word **"theme" is retired** for the site-design concept
> because it carried WordPress/Hugo "installable/swappable package" baggage that never matched this model.
> Use: **the engine** (`@glw907/cairn-cms`, the live dependency), **a Cairn site** (a repo that
> consumes the engine (*ecnordic.ski and 907.life are Cairn sites*), and **a site template** (a
> distributable scaffold you create a new site *from*). A site's presentation (component registry,
> icons, CSS) is just *site code* in its SvelteKit-conventional homes; it needs no special noun.
> ("Admin theme" below is unrelated: it's the DaisyUI visual theme of the `/admin` chrome.)

## Model: engine, sites, and site templates

Three layers, two kinds of reuse:

| Layer | What it is | Reuse model |
|---|---|---|
| **cairn-cms (engine)** | `@glw907/cairn-cms`: auth (magic-link on better-auth + D1, see ARCHITECTURE.md §4), GitHub-App commit, admin shell/components, sveltekit server logic, **the render engine** (directive pipeline + registry machinery) | **Live versioned npm dependency.** Sites track it by semver; updates propagate on bump |
| **Site template** | The scaffold you create a new site from: a public SvelteKit/Tailwind/DaisyUI design + default `cairn.config.ts` adapter + a component registry + icon set + sample content | **Scaffold-time copy.** `create-cairn-site` copies it into a new repo; *not* a runtime dependency |
| **Extension** | An optional, composable **feature module** (a `CairnExtension`), neither core machinery nor design. The **canonical way to add functionality separate from core** | **Site-local** (in the site repo) *or* a **shared package** (e.g. `@glw907/cairn-calendar`); **code-defined, composed at build time** (no runtime marketplace) |
| **Cairn site** | A **full SvelteKit/Cloudflare app** that owns its code; composes engine + extensions + its own code | Created by scaffolding from a site template, then **owned and edited in its own repo**, diverging freely and growing its own bespoke features |

> **A Cairn site is NOT just "an instance of a template."** Because the scaffold-copy model gives the
> site its whole repo, **site-idiosyncratic functionality and complex logic are simply normal app code
> that lives in the site and is never extracted** (e.g. ecnordic's contact form + Turnstile + Email
> Workers, the `@schedule-x` calendar, Pagefind search, the events collection; none belong in the
> engine or a generic template). The architecture must therefore treat the engine + a site as **seams,
> not a frame**: the site integrates bespoke logic through extension points without forking the engine.
> See "Extension seams".

### Extension seams: how a site adds bespoke logic without forking the engine

| Bespoke need | Seam | Status |
|---|---|---|
| Public-site features (forms, calendar, search, custom routes/pages) | **Just site code.** No seam needed; it's the site's own SvelteKit app | Shipped (inherent) |
| Custom collections / field types | adapter `collections[]` + `fields` | Shipped |
| Custom components / directives | the site's **component registry** | Planned (extraction) |
| Custom preview / frontmatter validation | adapter `renderPreview` / `collection.validate` | Shipped |
| Anything composable / reusable / a bespoke admin tool | a **`CairnExtension`** (see below), the canonical mechanism | **Planned: design round R13** |

#### The canonical extension contract: `CairnExtension`

The defined, typed, **code-defined and build-time-composed** way to add functionality outside the engine
(not a runtime plugin marketplace; that's the WordPress-bloat the locked decision warns against).
An extension declares its contributions in a known shape:

```ts
defineExtension({
  name,
  navItems?,     // admin sidebar entries (data, runtime)
  adminRoutes?,  // route load fns + components, mounted via shim files (SvelteKit routing)
  collections?,  // adds content collections
  components?,   // adds component-registry entries (directives)
  fields?,       // adds custom field types
  hooks?,        // pre/post save-commit, etc.
  bindings?,     // declares the Cloudflare bindings it needs
})
```

- The site's `cairn.config.ts` composes `extensions: [...]`; **cairn-core aggregates** them (merges nav,
  registry, collections; wires hooks). No extension code lives in the engine.
- Extensions are **site-local** (idiosyncratic, never leaves) *or* a **shared package** (reused across
  sites without bloating the engine), a third reuse axis beside engine + site template.
- **SvelteKit routing constraint:** `/admin/*` route *files* must physically exist in the site, so an
  extension's `adminRoutes` are mounted via thin **shim files** (same pattern as the F2 admin shims),
  ideally generated by a `cairn add` / `create-cairn-site` scaffolder. Nav/collections/components/hooks
  compose with no shims.
- **Lean-core check:** extensions are composed at build time by importing them in config, consistent
  with "components are code"; no dynamic loader, no marketplace.

### Decision: scaffold-copy site templates (model **a**), engine stays the live dependency  *(resolved 2026-05-26)*

A site template is a **scaffold-copy**, not a live dependency: `create-cairn-site` copies it into a new
repo; the site **owns its files** and diverges freely; **template updates do not propagate**. The
**engine (`cairn-cms`) is the live versioned dependency** that *does* propagate. The **component
registry ships inside the template**; a scaffolded site inherits it and can extend it.

**This is a starter/scaffold model, not "Hugo-like" (corrected 2026-05-26, critique H2).** It's
tempting to call this "Hugo for Cloudflare," but the analogy is wrong and sets false expectations:
a Hugo theme is a **live dependency with a runtime path-override cascade** (the site shadows theme
files at render time). SvelteKit/Vite resolve routes and imports at **compile time**, so there is no
overlay to emulate (SvelteKit #8896) and users **cannot** "override template files" the way Hugo
implies. cairn doesn't need an overlay because it **already separates the engine from the design**:
the bug-prone, security-sensitive, worth-propagating logic (auth, commit, admin shell, server logic,
the render engine) lives in `cairn-cms` and updates by semver. The right family is **CRA / Shopify Dawn
/ Astro Starlight** (scaffold-copy starters); the closest *successful* live-engine analogue is **Astro
Starlight** (a live integration + a narrow registered override surface + an upgrade script), which
validates cairn's hybrid: a **live engine** + only **thin copied route shims + design**. Cloudflare
wiring (D1/KV/EMAIL bindings, `wrangler.toml`, secrets, the GitHub-App install, CI) is per-site and
is wired at scaffold time.

**Why (a) over (b) here:** (a) gives maximum design freedom + a clean "your repo, your files"
model, and avoids a build-time override resolver that fights SvelteKit routing/TS resolution.
The cost of (a) is **no fleet-wide propagation** of design fixes (you'd patch each site repo).

**The real design lever: engine-fat / site-thin is a HARD RULE (critique H1).** Keep the engine
**fat** and the scaffolded site **thin** so "things you'd want to fix everywhere" fall on the engine
(propagating) side. **Nothing security-relevant or fix-prone may live in the copied layer.** What a
site owns is design tokens + component-registry *data* + CSS + thin route shims, full stop. This is the
*only* robust answer to "scaffold-copy can't propagate fixes" (Shopify Dawn: ~90% of sites run
outdated themes; CRA was deprecated partly over this). In particular the **directive/component
*rendering engine*** (generic remark/rehype machinery + registry mechanics) lives in `cairn-cms`,
with the site supplying only **registry data + CSS**, so a render bug is an engine bump and the
site's code stays pure design. Scaffolded sites carry an **engine version stamp** (which engine
version they forked from) + a **Renovate** config so drift is visible and the live engine keeps
updating by semver.

#### The engine/site line, settled 2026-05-26 (from reading ecnordic's pipeline; shipped in the extraction)

Drawn between **machinery** (engine) and **data + builders + CSS** (site code):

| cairn-core (engine, generic, propagates) | Cairn site (design code, copied from a template) |
|---|---|
| unified pipeline **factory** `createRenderer` (parse/gfm/directive/rehype/raw/slug/stringify) | composes it: `createRenderer(registry, { stagger: true })` |
| remark **directive-stamp** plugin, parameterized by component names + role→default-icon (was the hardcoded `PRIMITIVES` + `ALERT_DEFAULT_ICON`) | the **registry entries** (which components exist) |
| **literal-restore** of accidental `:name` prose, fully generic | (n/a) |
| rehype **dispatcher** + shared helpers (`splitHead`, `cardShell`, `markFirstList`, `iconSpan`, `data-rise` stagger ordinal, child recursion) | the per-component **builder fns + class names** (`buildCard`…, `ec-card`/`ec-grid`/…), the CSS that maps `data-rise` to an entrance delay |
| `glyph(name, set)` helper; **registry type** consumed by *both* renderer and editor palette | the **icon set** (`icons.ts`), the **CSS**, registry **data** + insert templates |

A render-engine bug → a `cairn-cms` bump (propagates); the site's code stays pure design. **907.life is
trivial** (it keeps its own `remark-html` renderer; its output contract differs from the rehype engine).
This line **is R10a**: the registry is the single declaration the renderer and the palette share.
Implemented in the **Theme-Architecture Extraction** pass (`docs/superpowers/plans/`).

**Cheap mitigations for (a)'s no-propagation weakness (add later):**
- An **engine version stamp** in scaffolded sites (which engine version they forked from) for drift audit.
- A **re-runnable `create-cairn-site`** for *additive* updates (new optional files) without clobbering owned files, a pragmatic middle ground short of full overlay.

## What a Cairn site is

A **Cairn site is a whole SvelteKit/Cloudflare app**: the public **SvelteKit + Tailwind + DaisyUI**
design **plus** the `cairn.config.ts` **adapter** that tells cairn-core how this site's content works.
You scaffold from a site template and edit it in your own repo. There is **no runtime
template/marketplace UI**.

A site author supplies:
1. The **public site** (routes, layout, styles, fonts): ordinary SvelteKit. *(out of cairn's scope; your design.)*
2. A **content adapter** (`src/lib/cairn.config.ts`).
3. The site's **render pipeline** (if it has rich components) + a **component registry**, composed from the engine's `createRenderer`.
4. Cloudflare **bindings + secrets** and the thin **admin route shims**.

**Not authored by the site:** the **admin chrome** is neutral and fully self-contained (one
look on every site; only `siteName` varies). Don't style `/admin`. *(See Pass I.)*

## 1. The adapter contract: `src/lib/cairn.config.ts`

Implement `CairnAdapter` (from `@glw907/cairn-cms`):
- `siteName`, `sender` `{ from, replyTo? }`, `backend` `{ owner, repo, branch, appId, installationId }`.
- `content`: the content concepts this site enables, keyed `posts?` and `pages?`. Each concept is a
  `ConceptConfig`: `{ dir, label?, fields[], validate() }`. `fields[]` is a discriminated union
  (`text | textarea | date | boolean | tags | freetags`). The admin form and `frontmatterFromForm`
  are data-driven from `fields`. A site never has two of the same concept.
- `render(md, opts?)`: the site's one renderer. The editor preview and every public page call it.
  ecnordic uses its directive plugin set; 907.life uses plain remark plus remark-html. The engine
  never assumes directives.
- `registry?` and `icons?`: the directive component registry and the glyph set, shared by the
  renderer and the admin palette and icon picker.
- `navMenu?`: the git-committed YAML menu the nav editor manages.
- Filename-based ids (no slug codec needed; day-bearing and dayless filenames both flow through).

A concept's URL policy lives in the YAML site-config, not the adapter. `normalizeConcepts` resolves
each concept's `permalink` pattern and `datePrefix` from that policy.

### URLs and the dated-slug model

The YAML URL policy drives each concept's permalink. Posts carry a date prefix on the filename, so a
post id is the full stem and its slug is the date-stripped tail. `siteDescriptors(cairn, parseSiteConfig(yaml))`
is the single call that derives the concept descriptors. The public index and the admin both read those
same descriptors, so the URL a page prerenders to and the URL the admin shows never drift.

## 2. Cloudflare bindings & secrets

`wrangler.toml`: the **AUTH_DB** (D1) magic-link store + the **EMAIL** `[[send_email]]` binding
(`remote = true`). Secrets (`wrangler secret put`): `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`,
`GITHUB_APP_PRIVATE_KEY_B64`, `AUTH_SECRET` (per-site, worker-only). `app.d.ts` declares them +
`App.Locals.auth`/`user`. `hooks.server.ts` creates the per-request auth + adds the `/admin/**` guard.

## 3. Admin route shims

`src/routes/admin/**` are thin shims that import server logic from `@glw907/cairn-cms/sveltekit`
and components from `@glw907/cairn-cms/components`, passing your adapter. They are byte-identical
across sites except `cairn.config.ts`. The exact tree, including the load-bearing `(app)` group,
the root `/healthz`, and the nested editor route, is documented in
[`docs/admin-route-structure.md`](admin-route-structure.md).

## 4. Admin theme

Neutral, self-contained "Warm Stone" DaisyUI theme applied by the package on the admin root (CSS
custom-property + font override). Author does nothing; do **not** style `/admin`. (This is the only
"theme" cairn has: the visual styling of the admin chrome, not a site-design concept.)

## 5. Concepts in the admin

- Each concept is a first-class sidebar entry with a per-concept entries list (`/admin/[concept]`).
- The edit form is data-driven from `fields`.

## 6. Components & the component registry

If your site has rich directive components (`:::card`, `:::grid`, …):
- A component is **code**: a registry entry with a `build` fn (directive element → hast) + preview CSS.
- Declare each component **once** in the site's **component registry** (`src/lib/markdown/components.ts`):
  `{ name, label, description, insertTemplate, build, defaultIconByRole? }`. The parser's recognized set,
  the render dispatch, and the admin **insert-component palette** all derive from the registry (no drift).
- The engine owns the machinery (`defineRegistry`, `createRenderer`, the directive-stamp plugin, the
  rehype dispatcher + shared `splitHead`/`cardShell`/`markFirstList`/`iconSpan` helpers, `glyph`); the
  site supplies the registry data + builders + class names + icon set + CSS. cairn-core stays
  directive-agnostic.
- **Creating a component is a developer task** (registry entry + `build` + CSS). There is no
  UI to create components. Adding one to the registry makes it appear in the editor palette.

## 7. Icons & assets in the editor

- **Icon set:** your `icons.ts` (closed vocabulary of SVG path data). The editor offers a picker over
  it for `icon=` attributes.
- **Images/videos:** browsable from your asset root(s) (e.g. `static/**`) via the GitHub
  contents API. Git is the archive; the adapter declares the asset roots + public URL base.

## 8. Editor management & roles

Two-tier `owner`/`editor` in the D1 user table; owners get the manage-editors surface. Per-site (no
cross-site SSO). Seed the first `owner` in the site's `AUTH_DB`.

## 9. Concept CRUD (creating concepts from the UI)  *(open design)*

Whether concept *definitions* can be created at runtime, and where they would be stored (committed
config file vs D1), is an open decision with its own design round. Unlike components, a concept
definition is **data** (no render code), so runtime creation is feasible.

## Public delivery

The engine ships the public read side as data helpers under `@glw907/cairn-cms/delivery`. A site
owns the routes and the markup. Each recipe below is one surface, copied straight from the working
showcase. `examples/showcase` carries all of them as a running site.

### The content layer

One module globs the markdown, derives the descriptors, validates each concept into an index, and
unions them into the site index every public route reads. This import is backend-free, so it pulls in
no GitHub or auth code. `createContentIndex` runs each concept's `validate`, so a bad frontmatter
field fails the build.

`src/lib/content.ts`:

```ts
// The showcase's one delivery content layer: it globs the markdown, derives the descriptors
// with siteDescriptors, builds a validated per-concept index, and unions them into the site
// index every public route reads.
import {
  createContentIndex,
  createSiteIndex,
  fromGlob,
  siteDescriptors,
  type SiteIndex,
} from '@glw907/cairn-cms/delivery';
import { parseSiteConfig } from '@glw907/cairn-cms';
import { cairn } from './cairn.config.js';
import siteYaml from './site.config.yaml?raw';

const descriptors = siteDescriptors(cairn, parseSiteConfig(siteYaml));
const byId = Object.fromEntries(descriptors.map((d) => [d.id, d]));

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

export const site: SiteIndex = createSiteIndex([
  { descriptor: byId.posts, index: createContentIndex(fromGlob(postsRaw), byId.posts) },
  { descriptor: byId.pages, index: createContentIndex(fromGlob(pagesRaw), byId.pages) },
]);

export const ORIGIN = 'https://showcase.test';
export const SITE_DESCRIPTION = 'The cairn showcase site.';
```

### The catch-all route

`createPublicRoutes` turns the site index into prerender entries and a `load` that resolves one URL
to its rendered entry and SEO data. The `+page.svelte` renders the engine's `CairnHead` for the SEO
tags and owns the rest of the body.

`src/routes/[...path]/+page.server.ts`:

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
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
});

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = ({ url }) => routes.entryLoad({ url });
```

`src/routes/[...path]/+page.svelte`:

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { CairnHead } from '@glw907/cairn-cms/delivery';

  let { data }: { data: PageData } = $props();
</script>

<CairnHead seo={data.seo} />

<article>
  <h1>{data.entry.title}</h1>
  {@html data.html}
</article>
```

### The feeds

`rssResponse` builds the RSS document from a feed header and a `FeedItem[]`. A JSON feed counterpart
calls `jsonFeedResponse` with the same item shape.

`src/routes/feed.xml/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { rssResponse, type FeedItem } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const posts = site.concept('posts')?.all() ?? [];
  const items: FeedItem[] = await Promise.all(
    posts.map(async (p) => ({
      title: p.title,
      url: ORIGIN + p.permalink,
      date: p.date ?? '',
      summary: p.excerpt,
      contentHtml: await cairn.render(site.concept('posts')!.byId(p.id)!.body),
      tags: p.tags,
    })),
  );
  return rssResponse(
    { title: cairn.siteName, description: SITE_DESCRIPTION, siteUrl: ORIGIN, feedUrl: ORIGIN + '/feed.xml' },
    items,
  );
};
```

### The sitemap and robots

`sitemapResponse` takes a `SitemapUrl[]` built over `site.all()`. `robotsResponse` writes the robots
file with the sitemap pointer and any disallow rules.

`src/routes/sitemap.xml/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { sitemapResponse, type SitemapUrl } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN } from '$lib/content';

export const prerender = true;

export const GET: RequestHandler = () => {
  const urls: SitemapUrl[] = [
    { loc: ORIGIN + '/' },
    ...site.all().map((s) => (s.date ? { loc: ORIGIN + s.permalink, lastmod: s.date } : { loc: ORIGIN + s.permalink })),
  ];
  return sitemapResponse(urls);
};
```

`src/routes/robots.txt/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { robotsResponse } from '@glw907/cairn-cms/delivery';
import { ORIGIN } from '$lib/content';

export const prerender = true;

export const GET: RequestHandler = () => {
  return robotsResponse({ sitemapUrl: ORIGIN + '/sitemap.xml', disallow: ['/admin'] });
};
```

### The working reference

`examples/showcase` is the complete working reference for every recipe above.

---

### Platform note
cairn is **Cloudflare-first** (`docs/PLAN.md` "Platform usage"): use any Cloudflare primitive
that fits (D1, KV, R2, Queues, DO, Cron, Images, Email). The one fixed point: **content stays
markdown committed to git.**
