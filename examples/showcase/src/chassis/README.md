# The chassis

The boundary rule: **a theme is everything that isn't chassis.** `src/chassis/` holds the
genre-free layer this showcase's theme (Waymark, living in `src/theme/`, plus the route files
under `src/routes/` that SvelteKit's filesystem routing pins in place) mounts onto: the plumbing
no site skips regardless of what it looks like, and the composition primitives a theme reaches for
instead of hand-rolling its own. Everything outside `src/chassis/` (the concrete adapter config,
the chrome components, the home and article composition, the theme's color and type values) is
the theme's own content. A theme file reaches chassis only through its exported seams: the
`$chassis` alias in `.ts`/`.svelte` files, or a relative `@import` in `.css` (aliases do not
resolve in CSS), always naming one of the files in the table below. `npm run
check:chassis-boundary` (root) enforces this: it fails on any import that resolves into
`src/chassis/` but names a file not in this table, the same way a reach past a package's public
exports would.

The chassis is deliberately generous, not minimal (Geoff, 2026-07-05): the point is a developer's
ease building a theme on top, not the fewest lines here. Every default this layer ships is
designed to be overridden, and each override seam is documented below. A theme that wants the
chassis default as-is changes nothing; a theme that wants its own look overrides the value, never
the mechanism.

## What lives here

| File | What it is |
| --- | --- |
| `content.ts` | The delivery content layer: globs the markdown, builds the site/posts indexes through `createSiteIndexes`. |
| `feed.ts` | Maps the site's posts index into `cairn-cms/delivery`'s `FeedItem` shape, shared by the RSS and JSON Feed routes. |
| `cairn.server.ts` | The one server-side runtime composition point (`composeRuntime`, `createCairnAdmin`); every server route that needs the runtime imports it from here. |
| `dev-gate.ts` | The build-foldable dev-backend feature flag, read by hooks and the runtime composition. |
| `render.ts` | The component-grammar wiring: turns a theme's own icon set into the engine's glyph-rendering helpers. |
| `theme-toggle.ts` | The light/dark toggle mechanism: resolve the active theme, apply a choice, persist it to a cookie. |
| `tokens.css` | The token SYSTEM: Tailwind and the DaisyUI plugin activation, the design-scale keys with generic defaults, and the semantic (code-highlight, ink, elevation, CTA) bindings. |
| `prose.css` | The reading-surface foundation: every prose element bound to tokens, with the signature flourish gestures behind `[data-flourish]`. |
| `composition.css` | The composition primitives: card, band, section, hero, sidebar-layout, site-shell. |

The SvelteKit route files that touch delivery plumbing (`feed.xml`, `feed.json`, `sitemap.xml`,
`robots.txt`, `media/[...path]`, `healthz`, the `/admin` mount) stay in `src/routes/`, since
SvelteKit's routing is filesystem-based; they import chassis logic through the `$chassis` alias
(`svelte.config.js`) instead of duplicating it. The same route files reach the theme's own content
(the adapter config, the site config) through a second alias, `$theme` (`src/theme/`), the mirror
image of `$chassis` for everything that is not genre-free.

## Every override seam

**Adapter and delivery wiring.** `content.ts`, `feed.ts`, and `cairn.server.ts` take a theme's own
`cairn.config.ts` adapter (concepts, fields, registered components, backend) as input; none of
them declares any content model or component of their own. A theme with a different set of
concepts, fields, or components changes only `cairn.config.ts`.

**The token system (`tokens.css`).** Every design-scale key (`--font-*`, `--text-step-*`,
`--spacing-*`, `--leading-*`, `--tracking-*`, `--container-measure*`, `--color-muted`,
`--color-card-border`) is declared inside `@theme` with a generic default. A theme `@import`s
`tokens.css` first, then redeclares the same keys in its own later `@theme` block with its real
numbers; cascade order does the override (`theme.css` is the worked example). The semantic
bindings (`--cairn-code-*`, `--cairn-*-ink`, `--cairn-shadow`, `--cairn-cta-*`) read a DaisyUI role
directly as their generic default (for example `--cairn-success-ink: var(--color-success)`), so
they resolve to something reasonable under any theme's own colors with zero tuning; a theme that
wants a hand-tuned on-surface ink (a fill is usually too light for small text) redeclares these in
its own `:root` and dark-mode blocks. The named DaisyUI themes themselves
(`@plugin "daisyui/theme"`, every role color and geometry value) are never declared here: that is
100% a theme's own choice, light and dark. The `.cairn-tok-*` syntax-highlight class contract and
the `pre.shiki` binding are pure structure and never need a theme's edit at all; only the token
values they read do.

A Tailwind v4 trap this file's own key names sit inside: `--spacing-xs`, `--spacing-xl`, and
`--spacing-2xl` share a suffix with three of Tailwind's built-in `max-w-*` scale keys, and Tailwind
resolves `max-w-<key>` against a theme's `--spacing-<key>` variable when one exists, silently
shadowing its own built-in container width with the spacing value instead (`max-w-2xl` compiles to
`max-width: var(--spacing-2xl)`, 4rem, not Tailwind's 42rem default) with no warning; declaring a
matching `--container-<key>` override does not win the utility back (verified directly against
`@tailwindcss/node`'s compiler, Tailwind 4.3.2). The Foxi port hit this while composing a marketing
page and worked around it by using `max-w-measure`/`max-w-measure-wide` (this file's own reading-
measure tokens) or a plain arbitrary value; a theme built on this chassis should do the same and
never reach for `max-w-xs`, `max-w-xl`, or `max-w-2xl` specifically, since those three key names
are already spoken for.

**Cascade layers: an unlayered site rule always beats a layered Tailwind utility.** Tailwind v4's
own utilities live inside `@layer utilities`, and CSS cascade layers make an unlayered rule win
over any layered one unconditionally, regardless of source order or specificity. A theme's own
`site.css` typically declares plain, unlayered container classes (`.site-main`, `.site-wide`), and
if one of those classes sets `margin: 0 auto` (the shorthand, which also zeroes the block/top-bottom
margins) on the same element as a Tailwind `mt-*`/`mb-*` utility, the shorthand's implicit
`margin-top: 0`/`margin-bottom: 0` silently wins, collapsing the utility's intended gap to zero with
no warning. Both the gallery and the Foxi ports hit this for real (a home-page hero-to-image gap and
a featured-card-to-grid gap both measured 0px of computed margin despite a `mb-l`/`mt-l` class being
present); the fix in both is `margin-inline: auto` instead of the `margin: 0 auto` shorthand, which
centers the container without touching the block axis at all, leaving it free for a composing
utility class to set. A theme writing its own unlayered container or layout class should reach for
the single-axis longhand (`margin-inline`, `padding-inline`, and so on) whenever that class might
combine with a Tailwind spacing utility on the same element, rather than a shorthand that quietly
claims the other axis too.

**The prose foundation (`prose.css`).** Every element reads a token, so a re-skin (a new
`tokens.css` override, or an entirely different theme) carries the reading surface forward with no
edit here. The one signature identity this file carries (the cairn-glyph horizontal rule, the
diamond list bullet, the margin-hanging pull quote) sits behind `.prose[data-flourish]`, off by
default; a theme opts in by adding one `data-flourish` attribute to its `.prose` root, no CSS edit.

**Component-grammar wiring (`render.ts`).** `makeIconRenderer(icons)` wires a theme's own icon set
into the engine's `iconSpan`/`glyph` helpers; a theme's `defineComponent()` build functions call
the returned function and never import `iconSpan`/`glyph` directly. Swapping the icon set (the
`icons: IconSet` object in `cairn.config.ts`) never touches a component's `build()`.

**The theme-toggle mechanism (`theme-toggle.ts`).** `resolveTheme`/`applyTheme`/`toggleTheme` know
nothing about which two DaisyUI theme names or which cookie name a theme uses; every call site
passes its own `ThemeToggleConfig` (`SiteHeader.svelte` is the worked example). A theme with
differently named themes, or a second theme entirely, reuses this module unchanged by supplying
its own config.

**Composition primitives (`composition.css`).** `.cairn-card`, `.cairn-band`, `.cairn-section`,
`.cairn-hero`, `.cairn-sidebar-layout` are the "generous, not minimal" ruling made concrete: a
theme reaches for one of these instead of hand-rolling its own card or two-column layout from
scratch. Nothing in this showcase's current markup uses any of them yet; adopting one is a
theme's choice, never a requirement. Each primitive exposes its own `--cairn-<primitive>-*` custom
properties (for example `--cairn-card-padding`, `--cairn-band-bg`, `--cairn-sidebar-width`) for a
per-instance override, layered on top of the shared design-scale tokens they default from. A media
query condition cannot read a custom property, so `.cairn-sidebar-layout`'s 48rem breakpoint is a
fixed value, not a token seam; its own comment says so.

`.cairn-site-shell`/`.cairn-site-main` is a sticky-footer flex column (header, growing main,
footer), harvested from the AstroPaper port's own hand-rolled shape. It bakes in the fix for a
flex-item cross-axis bug: a flex item's own width is auto, and auto does not resolve against the
flex line the way a plain block's width does, so a wide descendant anywhere inside the growing
item (a table with nowrap cells, any box with its own `overflow-x: auto`) shrinks the item to
that descendant's content width instead of stretching it, and the growth silently bubbles up
through every auto-sized ancestor, breaking the layout at narrow viewports (`min-width: 0` alone
does not fix this; only an explicit `width` does). A theme puts `.cairn-site-shell` on its outer
wrapper and `.cairn-site-main` on `<main>` to get the fix for free, rather than rediscovering the
bug the way the AstroPaper port first did.

## Subtracting an element

The chassis is site-owned code over the versioned engine API (Geoff, 2026-07-05): an ultra-light
theme builder may rebuild, ditch, or modify any of it, or simply remove an element it never uses.
Organization backs this up: one concern per file, and anything load-bearing for more than one
element lives in its own file rather than hiding inside a sibling, so removing one element's file
never breaks another's. Each row below names the file's real dependents (found by grepping the
tree, not assumed) and exactly what a removal touches. A note that lies (a dependent it misses,
a build it silently breaks) fails this file's own promise.

| File | Real dependents | Removal note |
| --- | --- | --- |
| `content.ts` | Every delivery route: `+page.server.ts` (site and `[...path]`), `robots.txt`, `feed.json`, `feed.xml`, `sitemap.xml`. | Not a bare deletion: it is the one content-index builder every delivery route reads. A theme dropping it must replace all six route imports with its own index logic in the same change, never delete it alone. |
| `feed.ts` | `feed.xml/+server.ts`, `feed.json/+server.ts`. | Delete the file and the two feed route files (or replace their bodies with a theme's own mapping); nothing else references it. |
| `cairn.server.ts` | `admin/+layout.server.ts`, `admin/[...path]/+page.server.ts`, `media/[...path]/+server.ts`, `healthz/+server.ts`. | Only removable by dropping the `/admin` mount and `/media` serving entirely, that is, a site with no editor-facing CMS surface at all. Most themes keep it. |
| `dev-gate.ts` | `hooks.server.ts`, the three `test/*` diagnostic probe routes. | Delete the file, the three `test/*` probe routes (dev-only, never shipped), and the one branch in `hooks.server.ts` that reads the flag; the flag defaults closed everywhere else, so nothing else changes behavior. |
| `render.ts` | `cairn.config.ts` (the one `makeIconRenderer` call). | Delete the file and that one import; a theme with no icon set in its component grammar, or one that calls the engine's `iconSpan`/`glyph` helpers directly, needs nothing else. |
| `theme-toggle.ts` | `SiteHeader.svelte` (the one worked example). | Delete the file, `SiteHeader.svelte`'s one import line, its `themeConfig` constant, `theme` state, and `toggleTheme` function, and the toggle button markup plus its `.theme-toggle` style block. A theme with no light/dark switch, or its own switch built from scratch, needs nothing else. |
| `tokens.css` | `theme.css`'s one `@import`; internally imports `prose.css` and `composition.css`. | The foundation the Tailwind and DaisyUI activation depend on; not a bare deletion. A theme drops only the two inner `@import`s it does not want (see the next two rows), never the whole file. |
| `prose.css` | `tokens.css`'s `@import './prose.css'` (its only inclusion point). | Delete the file and that one `@import` line; a theme rendering no markdown prose (a fully component-composed site) needs nothing else. Waymark itself uses this for every body of copy, so removing it is a demonstration of the seam, not a change Waymark would make. |
| `composition.css` | `tokens.css`'s `@import './composition.css'` (its only inclusion point). | Delete the file and that one `@import` line; nothing else references it today, since no theme markup in this showcase currently uses `.cairn-card`/`.cairn-band`/`.cairn-section`/`.cairn-hero`/`.cairn-sidebar-layout`/`.cairn-site-shell`/`.cairn-site-main` (the AstroPaper port's own theme is the first adopter of the site-shell pair, in its own tree). |

Two of these notes are verified verbatim, in a scratch copy of this showcase, as part of the
chassis restructure's own acceptance pass: `composition.css` (the zero-current-dependents case)
and `theme-toggle.ts` (the used-but-optional case). Both removals left the showcase building green
with no other edit. See the pass's post-mortem for the exact commands run.

## Adding a new primitive or seam

Read this file's boundary rule first: genre-free plumbing and configurable structure belong here;
a specific look, a specific chrome, or a specific content model belongs to the theme. A new
primitive follows the pattern above: chassis machinery plus generic defaults, every value a theme
can override, documented in this file the same way.
