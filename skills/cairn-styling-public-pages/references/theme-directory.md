# What a theme directory holds

Contents: the two directories, the contract's paths, the manifest, the directive seam, the contract
data file, the tokens build, the lay-in, see also.

A site's files and its theme's files sit in separate directories. `src/site/` holds the site:
`cairn.config.ts`, `site-config.ts`, `site.config.yaml`, `theme-options.css`, and `overrides.css`,
reached by `#site`. `vite.config.ts` reads `src/site/cairn.config.ts` by path. `src/theme/` holds
the theme, reached by `#theme`. A theme is developed in `themes/<id>/`, and a site's `src/theme/`
is that directory laid in. The showcase's `src/theme/` is generated from `themes/waymark/` and is
not tracked, so do not edit the generated copy: the next lay-in replaces it. In the cairn-cms
repository, edit `themes/waymark/` and run `npm run theme:lay-in`. A scaffolded site has no
`themes/` directory, and its `src/theme/` is the working copy.

## The contract's paths

Paths are relative to the theme directory. The contract requires these:

| Path | Holds |
|---|---|
| `cairn-theme.json` | The manifest. |
| `tokens/tokens.json` | The values, as tokens in the Design Tokens Community Group (DTCG) format. |
| `tokens/resolver.json` | The resolver that names the token groups, the color modes, and the options. |
| `tokens/tokens.css` | The built sheet: the two daisyUI blocks, the `@theme` scale, and the unlayered rules. |
| `theme.css` | The theme's entry sheet. It imports `../chassis/tokens.css`, then `fonts/fonts.css`, then `tokens/tokens.css`, and holds the rules written by hand. From a site, `../chassis/tokens.css` is `src/chassis/tokens.css`. From `themes/<id>/` the path points at a `themes/chassis/` that does not exist, so the import resolves only once the theme is laid in. |
| `modes/light.css`, `modes/dark.css` | The built sheets that pin the no-cookie color mode. |
| `site.css` | The theme's chrome rules. The site layout, the error page, and the editor preview link it with `theme.css`. |
| `components/SiteHeader.svelte`, `SiteFooter.svelte`, `ArticleView.svelte`, `EntryRow.svelte` | The four components the routes import. `SiteHeader` and `SiteFooter` read `page.data` (site name, resolved nav) and never import site config. |
| `directives/renderers.ts` | The directive seam, below. |
| `icons.ts` | The icon set the adapter and the directives use. |
| `fonts/fonts.css` | The `@font-face` rules for the theme's faces. |

The contract also allows these, and a theme needs one only when its files use it:

- `options/*/*.css`, the built sheets for each option value.
- `components/**` and `directives/**`, which cover the island registry and a component's helpers. The registry is `directives/islands/registry.ts`, a map from directive name to component. The adapter registers it, and the root layout imports it directly so the client never loads the adapter.
- `fonts/*.woff2`, the font files `fonts.css` names.
- `screenshots/**`, the catalog images the manifest names. The viewer makes them (`npm run theme:view -- --headless --viewport-only`), and the lay-in leaves them out of a site's copy.
- `**/*.test.ts`, the theme's tests, which lay in with it.

`theme-names.ts` is generated, not written by hand. A `.ts` or `.svelte` file in the theme imports a
chassis helper, such as the theme toggle, through the `#chassis` subpath import. CSS reaches the
chassis by relative import, since aliases do not resolve in CSS.

## The manifest

`cairn-theme.json` names the theme and the contract it targets. `schema/cairn-theme-1.schema.json`
is its schema, and the tokens build validates the manifest against it.

| Field | Required | Holds |
|---|---|---|
| `id` | Yes | The directory name. |
| `name` | Yes | The theme's display name. |
| `description` | Yes | A summary of at most 60 characters. |
| `version`, `license`, `author` | Yes | The theme's release and attribution. |
| `contract` | Yes | The contract version, `1`. |
| `colorModes` | Yes | The daisyUI theme name of the `light` block and of the `dark` block. |
| `options` | Yes | Zero to four choices an owner makes. |
| `fonts` | No | Each face, with its license, source, and files. |
| `screenshots` | No | Each image, with its `path` and what it `shows`. The theme check requires each file the manifest names, so a listed image that is missing fails `paths-required`. |
| `derivedFrom` | No | The design system the theme was built from, as a `repository` and a `commit`. |

The names in `colorModes` have no other source: the build, the toggle, and the cookie regex all read
them. Each option has a `key`, a `label`, two to eight `values`, and a `default`. An option key is a
contract. The schema notes that a later update or switch matches options by key, so renaming or
removing one breaks a theme that already uses it.

## The directive seam

The chassis owns the directive vocabulary: the nine standard directives in
`src/chassis/directives/` and their class names in `classes.json`. It also owns `composeBlocks`, a
function the adapter calls as `composeBlocks(icons, renderers)`. A theme's `directives/renderers.ts` exports a
`renderers` map from a directive name to a `build` function, and each entry replaces how that
directive renders. A theme cannot add, drop, or rename a directive, so the fields and slots an editor
fills never depend on the theme. A renderer changes only the markup a directive produces. A key
outside the vocabulary throws at build time.
Waymark's map is empty, so every directive renders with the chassis markup.

## The contract data file

`schema/cairn-theme-contract-1.json` is the contract as data. Its `paths` block holds three lists:
`required`, `allowed`, and `generated`. The generated list holds `theme-names.ts`, which the lay-in
writes into the site's `src/theme/`.

Its `tokens` block holds two lists. `required` names the custom properties a theme's built sheets
declare in each color mode and each option value. They cover the faces, the type steps from
`--text-step--2` to `--text-step-5`, the spacing, leading, and tracking scales, the measures, the
colors, and the roles `--cairn-eyebrow-case`, `--cairn-scroll-cue`, `--cairn-shadow`, and the
`--cairn-cta-*` set. `chassisOnly` names the properties the engine, the chassis, or daisyUI supply,
each with its reason. A chassis or engine default never counts as the theme's definition.

## The tokens build

`node scripts/theme/build-tokens.mjs <themeDir>` validates the manifest. It then validates
`tokens/tokens.json` and `tokens/resolver.json` against the DTCG 2025.10 schema vendored in
`schema/dtcg/2025.10/`. It writes `tokens/tokens.css`, `modes/light.css`, `modes/dark.css`, and, when
the theme has options, `options/<key>/<value>.css`. The command
`node scripts/theme/build-tokens.mjs <themeDir> --check` writes nothing and exits 1 when a
built file is stale. The built files begin with a comment that says not to edit them.

The build ships in the cairn-cms repository, not in a scaffolded site. A scaffolded site edits
`src/theme/tokens/tokens.css` directly, and a site that does leaves `tokens/tokens.json` as the
theme's original source. In the repository, edit `themes/<id>/tokens/tokens.json`, then run the
build and the lay-in. [Retheme by tokens](retheme-by-tokens.md) shows where each token lands.

## The lay-in

`node scripts/theme/lay-in.mjs <themeDir> <siteDir>` replaces `<siteDir>/src/theme/` with the
theme directory minus `screenshots/`. It then writes `src/theme/theme-names.ts` from the manifest's
`colorModes`, and the cookie regex in `src/app.html` between its two marker comments. The refusals
include a theme directory with no `cairn-theme.json`, a site directory with no `package.json`, and a
theme directory that overlaps `<siteDir>/src/theme/`. The lay-in can also throw after it replaces
`src/theme/`, when `src/app.html` has no marker comment or a `colorModes` name is invalid. In the
cairn-cms repository, `npm run theme:lay-in` lays `themes/waymark/` into `examples/showcase`.

## See also

- [Retheme by tokens](retheme-by-tokens.md) covers where each token lands and how to change a brand.
- [Theme starter](theme-starter.md) holds a complete daisyUI block to start a theme from.
- [Checking a theme](checking-a-theme.md) covers the theme check, which tests a theme against this contract, the viewer that renders it, and the audit rules the check runs.
