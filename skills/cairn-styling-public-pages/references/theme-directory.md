# What a theme directory holds

Contents: the two directories, the contract's paths, the manifest, the directive seam, the contract
data file, the tokens build, the lay-in.

A site's files and its theme's files sit in separate directories. `src/site/` holds the site:
`cairn.config.ts`, `site-config.ts`, `site.config.yaml`, `theme-options.css`, and `overrides.css`,
reached by `#site`, with `vite.config.ts` reading `src/site/cairn.config.ts` by path. `src/theme/`
holds the theme, reached by `#theme`. A theme is developed in `themes/<id>/`, and a site's
`src/theme/` is that directory laid in. The showcase's `src/theme/` is generated from
`themes/waymark/` and is not tracked, so never edit the generated copy: the next lay-in replaces it.
Edit `themes/waymark/` and run `npm run theme:lay-in`.

## The contract's paths

Paths are relative to the theme directory. The contract requires these:

| Path | Holds |
|---|---|
| `cairn-theme.json` | The manifest. |
| `tokens/tokens.json` | The values, as DTCG tokens. |
| `tokens/resolver.json` | The resolver that names the token groups, the color modes, and the options. |
| `tokens/tokens.css` | The built sheet: the two daisyUI blocks, the `@theme` scale, and the unlayered rules. |
| `theme.css` | The theme's entry sheet. It imports `../chassis/tokens.css`, then `fonts/fonts.css`, then `tokens/tokens.css`, and holds the rules written by hand. |
| `modes/light.css`, `modes/dark.css` | The built sheets that pin the no-cookie color mode. |
| `site.css` | The theme's chrome rules. The layouts, the error page, and the editor preview link it with `theme.css`. |
| `components/SiteHeader.svelte`, `SiteFooter.svelte`, `ArticleView.svelte`, `EntryRow.svelte` | The four components the routes import. `SiteHeader` and `SiteFooter` read `page.data` (site name, resolved nav) and never import site config. |
| `directives/renderers.ts` | The directive seam, below. |
| `icons.ts` | The icon set the adapter and the directives use. |
| `fonts/fonts.css` | The `@font-face` rules for the theme's faces. |

The contract also allows these, and a theme needs one only when its files use it:

- `options/*/*.css`, the built sheets for each option value.
- `components/**` and `directives/**`, which cover the island registry (`directives/islands/registry.ts`, a map from directive name to component that the root layout imports apart from the adapter) and a component's helpers.
- `fonts/*.woff2`, the font files `fonts.css` names.
- `screenshots/**`, which the lay-in leaves out of a site's copy.
- `**/*.test.ts`, the theme's tests, which lay in with it.

`theme-names.ts` is generated, never written by hand. A `.ts` or `.svelte` file in the theme imports
a chassis helper, such as the theme toggle, through the `#chassis` subpath import. CSS reaches the
chassis by relative import, since aliases do not resolve in CSS.

## The manifest

`cairn-theme.json` names the theme and the contract it targets. It carries `id` (the directory
name), `name`, a `description` of at most 60 characters, `version`, `license`, `author`, `contract`
(`1`), `colorModes`, and `options`. It may also list `fonts`, each with its license, source, and
files, and `screenshots`. `colorModes` gives the daisyUI theme name of the light and dark blocks, and
the names have no other source: the build, the toggle, and the cookie regex all read them. `options`
holds zero to four choices an owner makes, each with a `key`, a `label`, two to eight `values`, and
a `default`. An option key is a contract, so renaming or removing one breaks the theme.
`schema/cairn-theme-1.schema.json` is the manifest's schema, and the tokens build validates the
manifest against it.

## The directive seam

The chassis owns the directive vocabulary: the nine standard directives in
`src/chassis/directives/`, their class names in `classes.json`, and `composeBlocks`, which the
adapter calls as `composeBlocks(icons, renderers)`. A theme's `directives/renderers.ts` exports a
`renderers` map from a directive name to a `build` function, and each entry replaces how that
directive renders. A theme cannot add, drop, or rename a directive, so the fields, slots, and preview
an editor sees never depend on the theme. A key outside the vocabulary throws at build time.
Waymark's map is empty, so every directive renders with the chassis markup.

## The contract data file

`schema/cairn-theme-contract-1.json` is the contract as data. Its `paths` block holds the required,
allowed, and generated lists above. Its `tokens` block holds `required`, the custom property names a
theme's built sheets declare in each color mode and each option value, and `chassisOnly`, the
names the chassis or daisyUI supply, each with its reason. A chassis default never counts as a
theme's definition. The required names include `--cairn-eyebrow-case` and `--cairn-scroll-cue`.

## The tokens build

`node scripts/theme/build-tokens.mjs <themeDir>` validates the manifest, and validates
`tokens/tokens.json` and `tokens/resolver.json` against the DTCG 2025.10 schema vendored in
`schema/dtcg/2025.10/`. It then writes `tokens/tokens.css`, `options/<key>/<value>.css`, and
`modes/light.css` and `modes/dark.css`. With `--check` it writes nothing and exits 1 when a built
file is stale. The built files begin with a comment that says not to edit them. Where each token
lands is in `references/retheme-by-tokens.md`.

## The lay-in

`node scripts/theme/lay-in.mjs <themeDir> <siteDir>` replaces `<siteDir>/src/theme/` with the
theme directory minus `screenshots/`. It then writes `src/theme/theme-names.ts` from the manifest's
`colorModes`, and the cookie regex in `src/app.html` between its two marker comments. It refuses
when the theme directory has no `cairn-theme.json`, when the site directory has no `package.json`,
and when the two directories overlap. In the engine repository, `npm run theme:lay-in` lays
`themes/waymark/` into `examples/showcase`.

`references/theme-starter.md` holds a complete daisyUI block to start a theme from.
