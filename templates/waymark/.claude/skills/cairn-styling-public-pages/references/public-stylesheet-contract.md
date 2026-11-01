# The public stylesheet contract

Contents: the three parts, floor not ceiling, wiring a hand-built site, layers and nesting,
site-owned keys, the sheet's rules, replacing prose.css, the emitted-class registry, the seam promise.

`@glw907/cairn-cms/cairn-public.css` (file: `node_modules/@glw907/cairn-cms/dist/public/cairn-public.css`)
holds the engine's role defaults and its header comment lists every key with its default. Read that
file for a key's value; this page holds what the file cannot show.

## The three parts

1. **daisyUI's theme variables.** `color-scheme`, the twenty color roles, the three radii, the two
   sizes, `--border`, `--depth`, `--noise`. The engine defaults none of them. The key list is read
   from `daisyui/theme/object`.
2. **The sheet.** Roles in `@layer theme`, two `@theme` colors (`--color-muted`,
   `--color-card-border`), a few `@layer components` rules, and one `@source` line over the engine's
   public components so their utilities compile in the site's sheet.
3. **The emitted classes**, listed below.

## Floor, not ceiling

The contract names what a theme provides so cairn's parts render. It never limits what a theme
adds, replaces, or skips: define tokens of your own, replace or drop `prose.css` and
`composition.css`, restyle through the cascade. The audit checks that a value comes from a token,
never which token. The sheet never redefines a Tailwind stock key such as `--leading-tight`, so a
built-in public component sizes type and space in `em` or `inherit`, or from `--size-field`, never
from a scale key.

## Wiring a hand-built site

A hand-built site has no Waymark and no chassis; it supplies the daisyUI blocks itself, since the
sheet declares none and activates no daisyUI plugin.

1. Import in this order in `src/app.css`: `@import "tailwindcss";`, then
   `@import "@glw907/cairn-cms/cairn-public.css";`, then `@plugin "daisyui";`, then the site's
   `@plugin "daisyui/theme"` blocks, then any sheet that styles rendered markdown. A later `@theme`
   in the site wins over the sheet's two colors.
2. Do not import `app.css` statically in the root `+layout.svelte`. That layout also wraps `/admin`,
   and a static import folds the sheet into a layout CSS chunk whose name differs between the
   client and server builds, so the editor preview's link 404s. Move the public route into a
   `(site)` group directory whose `+layout.svelte` imports `../../app.css?url` and links it in
   `<svelte:head>`.
3. In the adapter, import the same `?url` and name it: `editor: { preview: { stylesheets: [appCss] } }`.
   The preview frame loads only the sheets that list names. Optional `containerClass` wraps the
   previewed entry in one element carrying that class.

Symptoms: unstyled preview under a hint that the adapter names no sheets means `editor.preview` is
unset. A 404 on the sheet request on the deployed site means a static import also exists; remove it
and keep the `?url` import in both the layout and the adapter.

## Layers and nesting

Tailwind declares `theme` as its lowest layer, so a role written anywhere else overrides the sheet:
an unlayered `:root` rule, or a daisyUI theme block. `[data-theme]` in the sheet's selector makes a
role recompute inside a region carrying its own `data-theme`, and a derived ink there mixes that
region's fill with that region's body ink.

The two `@theme` colors do not recompute. Tailwind resolves them at `:root` and a nested region
inherits the result, so a theme that nests a region sets `--color-muted` and `--color-card-border` in
the nested block. Import order breaks ties between the sheet and a theme: the sheet comes first.

## Site-owned keys

Nothing defaults these; a chassis-based theme defines them or the `var()` resolves to nothing and
`theme-conformance` names it: the five `--cairn-cta-*` keys (`-bg`, `-content`, `-border`, `-btn-bg`,
`-btn-content`) in each daisyUI block, and `--cairn-caption-tracking` in `:root`. The rule is wider
than the list: define every custom property the chassis and its routes read that neither the engine
nor `tokens.css` defaults. A key read behind a `var()` fallback is an
optional override, not a hole. A theme's own additions take the `--site-*` prefix.

## The sheet's rules

- `pre.shiki` and the six `.cairn-tok-*` classes bind to the `--cairn-code-*` roles.
- `.table-scroll` carries only `display: block; overflow-x: auto`. The chassis `prose.css` adds the
  design and drops the structural pair.
- `.cairn-focus-ring:focus-visible` applies the outline and offset roles, never the radius. A
  `outline-*` utility, or a daisyUI component class that sets an outline, wins over it because both
  sit in a later layer.

## Replacing `prose.css`

A replacement must style every emitted class below that the registry assigns to a theme, or leave
it unstyled on purpose. Read the registry first. It also loses the chassis design of
`.table-scroll`, since the sheet keeps only the structural pair.

## Emitted classes

The registry. "Sheet" means `cairn-public.css`; "theme" means the reading-surface CSS.

| Class | Who writes it | Who styles it |
|---|---|---|
| `cairn-head` | the site's chassis code (the icon-plus-heading row of a card or alert) | theme |
| `cairn-icon`, `cairn-icon-secondary` | icon-rendering code wraps a built glyph; the modifier lands on a secondary role | theme |
| `cairn-glyph` | the inline SVG glyph | theme |
| `cairn-grid` | marks the first `<ul>` in a component's stamped children | theme |
| `pre.shiki` | the build-time highlighter, for a fenced block | sheet, from `--cairn-code-bg`, `--cairn-code-ink`, `--cairn-code-border` |
| `cairn-tok-keyword`, `cairn-tok-string`, `cairn-tok-comment`, `cairn-tok-function`, `cairn-tok-number`, `cairn-tok-punct` | the highlighter, on spans in `pre.shiki`, with no inline style | sheet, from the `--cairn-code-*` roles |
| `cairn-place-center`, `cairn-place-wide`, `cairn-place-full` | a `figure` directive's placement; absent when none is named | theme only; a placement is a layout decision, so style each you honor |
| `table-scroll` | the wrapper around every rendered table | sheet (the structural pair); theme adds design |

A site's component code stamps more classes on top (`cairn-alert-body`, `cairn-head-title`); those
are chassis-owned, documented in `src/chassis/README.md`.

**Namespace.** `cairn-*` is shared. The admin sheet owns about sixty (`cairn-type-*`, `cairn-chip-*`).
Before adding a `cairn-*` name on the public side, check it against the admin's list so the two
vocabularies never collide. `cairn-icon-label` is an admin label class, not an emitted name.

## The seam promise

The sheet and the registry are public surface. Renaming or removing a key or an emitted class is a
disclosed contract change; adding a key with a default is not; changing a default's value is
disclosed with a changelog line, and a site that needs the old value sets the key itself.
