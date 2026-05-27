# Creating a Cairn site

> **Status: living draft (started 2026-05-26 during the admin-UI brainstorm).** Sections are
> marked **[Shipped]** (works today) or **[Planned: Pass X]** (designed, not built; see
> `docs/PLAN.md` and `docs/superpowers/specs/2026-05-26-admin-ui-design.md`). Each pass's
> close-out fills in its section. Don't treat Planned sections as available.

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
| unified pipeline **factory** `createRenderer` (parse/gfm/directive/rehype/raw/slug/stringify) | composes it: `createRenderer(registry, { rise })` |
| remark **directive-stamp** plugin, parameterized by component names + role→default-icon (was the hardcoded `PRIMITIVES` + `ALERT_DEFAULT_ICON`) | the **registry entries** (which components exist) |
| **literal-restore** of accidental `:name` prose, fully generic | (n/a) |
| rehype **dispatcher** + shared helpers (`splitHead`, `cardShell`, `markFirstList`, `iconSpan`, rise stagger, child recursion) | the per-component **builder fns + class names** (`buildCard`…, `ec-card`/`ec-grid`/…), the rise-stagger motion formula |
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

## 1. The adapter contract: `src/lib/cairn.config.ts`  **[Shipped]**

Implement `CairnAdapter` (from `@glw907/cairn-cms`):
- `siteName`, `sender` (from address), `backend` `{ owner, repo, branch, appId, installationId }`.
- `collections[]`: each `{ name, label, folder, fields[], validate() }`. `fields[]` is a
  discriminated union (`text | date | textarea | boolean | tags | freetags`). The admin form +
  `frontmatterFromForm` are data-driven from `fields`.
- `renderPreview(md)`: your directive-safe render (ecnordic: the `render.ts` plugin set;
  907.life: plain remark + remark-html). cairn-core never assumes directives.
- Filename-based ids (no slug codec needed; day-bearing and dayless filenames both flow through).

## 2. Cloudflare bindings & secrets  **[Shipped]**

`wrangler.toml`: the **AUTH_DB** (D1) better-auth store + the **EMAIL** `[[send_email]]` binding
(`remote = true`). Secrets (`wrangler secret put`): `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`,
`GITHUB_APP_PRIVATE_KEY_B64`, `AUTH_SECRET` (per-site, worker-only). `app.d.ts` declares them +
`App.Locals.auth`/`user`. `hooks.server.ts` creates the per-request auth + adds the `/admin/**` guard.

## 3. Admin route shims  **[Shipped]**

`src/routes/admin/**` are thin shims that import server logic from `@glw907/cairn-cms/sveltekit`
and components from `@glw907/cairn-cms/components`, passing your adapter. They are byte-identical
across sites except `cairn.config.ts`. (See an existing site for the exact set.)

## 4. Admin theme  **[Planned: Pass I]**

Neutral, self-contained "Warm Stone" DaisyUI theme applied by the package on the admin root (CSS
custom-property + font override). Author does nothing; do **not** style `/admin`. (This is the only
"theme" cairn has: the visual styling of the admin chrome, not a site-design concept.)

## 5. Collections in the admin  **[Partly shipped; nav + per-collection views Planned: Pass J]**

- *Shipped:* collections are listed and editable; the edit form is data-driven from `fields`.
- *Planned (Pass J):* each collection a first-class sidebar entry + per-collection entries list
  (`/admin/[collection]`). *Planned (Pass K, R4):* page-vs-story differentiated edit experience.

## 6. Components & the component registry  **[Engine shipped (extraction); palette UI Planned: Pass K, R10 + R10a]**

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

## 7. Icons & assets in the editor  **[Planned: R9]**

- **Icon set:** your `icons.ts` (closed vocabulary of SVG path data). The editor offers a picker over
  it for `icon=` attributes.
- **Images/videos:** browsable from your asset root(s) (e.g. `static/**`) via the GitHub
  contents API. Git is the archive; the adapter declares the asset roots + public URL base.

## 8. Editor management & roles  **[Shipped]**

Two-tier `owner`/`editor` in the D1 user table; owners get the manage-editors surface. Per-site (no
cross-site SSO). Seed the first `owner` in the site's `AUTH_DB`.

## 9. Collection CRUD (creating collections from the UI)  **[Planned: Pass, R8]**

Whether collection *definitions* can be created at runtime, and where they're stored (committed
config file vs D1), is an open decision with its own design round. Unlike components, a collection
definition is **data** (no render code), so runtime creation is feasible.

---

### Platform note
cairn is **Cloudflare-first** (`docs/PLAN.md` "Platform usage"): use any Cloudflare primitive
that fits (D1, KV, R2, Queues, DO, Cron, Images, Email). The one fixed point: **content stays
markdown committed to git.**
