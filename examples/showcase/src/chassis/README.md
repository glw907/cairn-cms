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
| `composition.css` | The composition primitives: card, band, section, hero, sidebar-layout. |

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

## Adding a new primitive or seam

Read this file's boundary rule first: genre-free plumbing and configurable structure belong here;
a specific look, a specific chrome, or a specific content model belongs to the theme. A new
primitive follows the pattern above: chassis machinery plus generic defaults, every value a theme
can override, documented in this file the same way.
