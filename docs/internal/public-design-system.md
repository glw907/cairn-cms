# Cairn public design system: Waymark (agent reference)

Waymark is cairn's public reading theme: a manuscript on warm stone. It is the public counterpart to
the admin's Warm Stone ([`admin-design-system.md`](admin-design-system.md)). Read this before any work
on the public theme: `examples/showcase/src/lib/theme.css` (the tokens and the re-skin recipe),
`prose.css` (the reading surface), the `(site)` chrome components, and the `/styleguide` route. It is
written for an implementing agent, so it leads with the rules that are easy to break and not visible in
the markup, then the tokens, the type, the recipes, the component model, and the re-skin recipe.

The live demo is `/styleguide`. The exhaustive oklch values live in `theme.css`, the single source. The
design criteria and the settled-design appendix (the chosen faces, the values, the layouts, the
carry-forwards) are in the design bar
([`docs/superpowers/specs/2026-06-25-cairn-b2-design-bar.md`](../superpowers/specs/2026-06-25-cairn-b2-design-bar.md)).

## Load-bearing rules (break these and the theme renders wrong)

- **`themes: false`, then two custom themes.** `theme.css` sets `@plugin "daisyui" { themes: false; }` to
  drop DaisyUI's built-in light/dark themes, which otherwise claim `:root` and override the palette (a
  real bug: a pure-white `base-100` instead of warm stone, until `themes: false`). The `cairn` (default)
  and `cairn-dark` (`prefersdark`) themes are then defined via `@plugin "daisyui/theme"`. The DaisyUI
  theme id stays `cairn`/`cairn-dark`; the brand name is Waymark (the admin does the same: id
  `cairn-admin`, name "Warm Stone").
- **The token grammar matches the admin; only the palette differs.** The role names, the `-content`
  pairs, the on-surface `-ink` customs, the radius/size/border tokens, and the inline-doc convention are
  identical to `cairn-admin.css`. This is differentiator #4 (one design language across the admin and the
  public site). Hold the grammar; vary only the palette.
- **The on-surface inks are `--cairn-*-ink`, never `--color-*-ink`.** The status inks (the darker
  on-surface tones for the callout and alert titles and left rules, and the code highlighter's
  string/function/number colors) are `--cairn-{info,success,warning,error}-ink`. `prose.css` referencing
  the wrong prefix (`--color-*-ink`) was a GATE 2 blocker: a bare `var()` with no fallback fell back to
  body ink and `currentColor`, silently flattening the directive surface. The **token-resolution gate**
  (`check:public-tokens` and `test:reskin`) now fails the build on any `prose.css` or code-ramp
  `var(--token)` that no block defines, so this class of bug is a red gate.
- **The status ink seam (recipe step 6).** A status fill is too light to read as small text, so each
  status carries a separate, darker on-surface ink of the same hue. Re-skinning a status hue means
  retuning BOTH the fill (in the `@plugin` block) AND the matching `--cairn-<status>-ink` (light AND
  dark), or the directive text and the code colors desync from the fills.
- **The CTA never reads `--color-neutral` directly.** `--color-neutral` inverts to a LIGHT value in dark
  mode, which turned the CTA into the brightest slab on the page (the GATE-1 bug). The CTA reads the
  `--cairn-cta-*` pair: light is the warm near-black house-ad with a paper button; dark is a recessed
  `base-200` panel with a `base-300` border and a solid `primary` button.
- **The highlighter emits classes, not inline styles.** The engine's build-time Shiki highlighter
  (`src/lib/render/highlight.ts`) emits `.cairn-tok-*` token CLASSES with no inline style, because cairn
  strips every inline style (the sink guard in `src/lib/render/sanitize-schema.ts`). The engine OWNS the
  `.cairn-tok-*` class contract, exactly like the `.cairn-place-*` figure contract; the site styles the
  classes from `--cairn-code-*` in `theme.css`. Recoloring the theme recolors code with no markup change.
- **The reading route ships no client highlighter.** The article route is server-rendered
  (`+page.server.ts`), so Shiki runs at build/prerender and in the Worker SSR, never in the reading
  route's client bundle. Shiki is a lazy chunk in the admin editor preview only (so the preview matches
  the public page), behind a dynamic `import('shiki')`.
- **`theme.css` is the one linked sheet, and it `@import`s `prose.css` and the fonts.** `theme.css` is
  linked by the `(site)` layout AND the editor preview config (`preview.stylesheets`) through a `?url`
  import, so the reader and the author see the same surface (preview parity). It `@import`s the Fontsource
  font CSS and `prose.css`, so one sheet carries the theme, the fonts, and the reading surface.
- **The fonts are self-hosted (Fontsource variable), registered as `"<Name> Variable"`.** The tokens name
  them exactly: `--font-display: 'Fraunces Variable'`, `--font-body: 'Source Sans 3 Variable'`,
  `--font-mono: 'Source Code Pro Variable'`, with system fallbacks. They are the default first paint
  (CLS-safe, no third-party font origin).

## Tokens

The exhaustive oklch values are in `theme.css`; this is the structure.

- **The DaisyUI role tokens** (the two `@plugin "daisyui/theme"` blocks): the `base-100/200/300` plus
  `base-content` warm-stone ladder; `primary` plus `primary-content` (the deep ink-blue accent);
  `secondary`, `accent`, `neutral` plus their `-content`; the `info/success/warning/error` fills plus
  `-content`; and the geometry (`--radius-box/field/selector`, `--size-field/selector`, `--border`,
  `--depth: 0`, `--noise: 0`).
- **The cairn-authored customs** (`:root`, with dark siblings under `@media (prefers-color-scheme:
  dark)`): `--cairn-muted`; the `--cairn-{info,success,warning,error}-ink` set; `--cairn-card-border` and
  `--cairn-shadow` (the theme-adaptive elevation); the `--cairn-cta-*` pair; the type scale
  (`--cairn-step--1`..`-5`, the leadings, the tracking); the measure (`--cairn-measure: 44rem`, about
  66ch, and `--cairn-measure-wide`); the fluid space scale (`--cairn-space-*`, `--flow-space`); and the
  code ramp (`--cairn-code-*`, each reading a role).
- Light values sit on `:root`; the dark siblings sit under the same `prefers-color-scheme` query DaisyUI
  uses for `cairn-dark`, so the roles and the customs switch together. A manual dark toggle (B4) will add
  a `[data-theme]` scope for the customs.

## Type

A committed editorial pairing, distinct from the admin's Bricolage Grotesque and IBM Plex Sans.

- **Fraunces** (display): `h1`/`h2`/`h3`, the masthead, entry titles, pull-quotes, the brand wordmark, and
  stat numbers. Weight ~600 at a display optical size, never the 900 weight that became a cliché.
- **Source Sans 3** (body and UI): body, lead, captions, nav, footer. `strong` at weight 650.
- **Source Code Pro** (mono): inline and fenced code.
- The scale is fluid `clamp()` on a ~1.24 ratio, body 17 to 19.5px, the heading-rhythm rule binding a
  heading to the text it introduces (large space above, tight below).

## The chrome (`SiteHeader.svelte`, `SiteFooter.svelte`)

- A sticky header on a translucent `base-100` (`color-mix … 88%` plus `backdrop-filter`) with a
  `--cairn-card-border` hairline: the cairn brand mark (four stacked stones, in `primary`) plus the
  Fraunces wordmark on the left, the primary nav on the right (`--cairn-muted` to `base-content` on hover,
  `aria-current` to `primary` at weight 600). `html { scroll-padding-top: <header height> }` keeps a
  focused in-page anchor clear of the sticky band.
- The skip link is the first focusable element and targets `<main id="main" tabindex="-1">`. The
  `tabindex` is load-bearing: without it, Firefox and Safari move the position but not keyboard focus.
- The footer is on `base-200`, with the brand, a footer nav, and a fine-print line over a hairline.

## The reading surface (`prose.css`)

Scoped to `.prose`, every element derived from the roles, the measure capped at `--cairn-measure`. The
elements: the `h1` title and `h2`/`h3` on the display face with the binding rhythm; the lead; an
accent-bordered blockquote and a hanging `.pullquote` that outdents past `64rem`; the inline-code chip;
the `pre.shiki` code block (colors from the `.cairn-tok-*` rules in `theme.css`); diamond `ul` and
display-face-number `ol` markers; GFM task lists styling the real disabled checkbox (the engine adds its
`aria-label` through `rehypeTaskListA11y`); bordered, zebra tables; the `hr` as a centered cairn mark; and
figures on the `center`/`wide`/`full` contract. Every `.prose a` and future interactive control gets the
`:focus-visible` ring (2px `primary`, 2px offset) plus a `base-100` halo so the ring reads against the
tinted callout grounds. The directive components (callout note/tip/warning, alert) are styled under
`.prose` so they beat DaisyUI's bundled `.alert`/`.card`, each tone reading its `--cairn-*-ink`.

## The component model (you own it)

- **The directive registry** (`cairn.config.ts`): the callout (note/tip/warning) and the alert.
  Markdown-authored, the render-component pattern. A site extends the registry or adds directives.
- **The own-it components**: the chrome, the page compositions (Home, the article wrapper, the
  styleguide), and the token-styled DaisyUI primitives (button, card, badge, tabs, accordion, CTA, stat).
  Copy-in `.svelte` files the site owns and extends, with no version lock on the look.
- **The ownership seam**: the site owns `prose.css` and the page-composition components; the engine owns
  the prose HTML structure (the rehype pipeline output) and the build-time highlighter. A developer
  restyles the reading surface without forking the engine; changing the emitted HTML shape is an engine
  concern.
- `/styleguide` is the single growing demo surface. B2 ships the system and the core set; B3 and B4 add
  the feature and option components to the same demo.

## The re-skin recipe (the committed N)

One file (`theme.css`) owns the theme. The committed N is the brand-and-base headline (about fourteen
values, light and dark): rotate `--color-primary`'s hue (hold lightness and chroma for contrast-stable
recolor), and edit the `base-100/200/300` ladder and `base-content`. Optionally swap the two `--font`
tokens, retune the one type ratio, or the one space-scale step. A full status rebrand is more, because
each status carries a fill (the `@plugin` block) and an on-surface ink (the `--cairn-*-ink` layer, step
6). The prose reading surface is included at zero extra edits, because it reads the same roles. The CI
gates prove it: `check:public-tokens` (no literals, dual-gamut AA, token resolution) and `test:reskin`
(the hue-rotated theme clears AA, the prose is single-source, every token resolves).

## Accessibility

- The **dual-gamut contrast gate** (`scripts/check-public-tokens.mjs`): every role/`-content` pair, the
  on-surface inks, and `accent`/`accent-content` clear AA in both sRGB and P3 via culori. The
  **token-resolution gate** fails on a dangling `var()`. The **re-skin fixture**
  (`scripts/reskin-fixture.mjs`) proves a hue rotation holds AA and the prose has no second color source.
- A consistent `:focus-visible` language (2px `primary`, 2px offset) across the chrome, the reading
  surface, and the styleguide, with the `base-100` halo on tinted grounds. `scroll-padding-top` for the
  sticky header. The skip link plus `<main tabindex="-1">`.
- All motion is gated behind `prefers-reduced-motion`. The default fonts are the first paint, CLS-safe.

## Pointers

- The theme and the re-skin recipe: `examples/showcase/src/lib/theme.css`. The reading surface:
  `examples/showcase/src/lib/prose.css`. The chrome: `examples/showcase/src/lib/components/`.
- The live demo: `/styleguide`. The criteria and the settled design: the design bar
  ([`2026-06-25-cairn-b2-design-bar.md`](../superpowers/specs/2026-06-25-cairn-b2-design-bar.md)).
- The gates: `scripts/check-public-tokens.mjs`, `scripts/reskin-fixture.mjs`, and the `design.yml`
  workflow. The engine highlighter: `src/lib/render/highlight.ts`.
