# The public stylesheet (`@glw907/cairn-cms/cairn-public.css`)

`cairn-public.css` holds the engine's defaults for the public site: the role keys a theme colors, the rules that style the classes the engine emits, and one source line that compiles the built-in public components. The contract is a floor, never a ceiling. It names what a theme provides so that cairn's own parts render, and it never limits what a theme adds, replaces, or skips. A theme may define tokens of its own, may replace or drop the chassis `prose.css` and `composition.css`, and may restyle anything through the ordinary cascade. The audit's [public scope](./cairn-audit.md#the-public-scope) checks that a value comes from a token and never which token, so it polices literals and leaves vocabulary alone.

Stability tier: Extension API.

The subpath is a CSS asset with no type declarations, so this page is its complete reference. A site imports the sheet once, after Tailwind and before its own reading-surface sheet.

```css
@import "tailwindcss";
@import "@glw907/cairn-cms/cairn-public.css";
@import "./prose.css";
```

## The contract

The contract has three parts, and nothing else belongs to it.

1. **daisyUI's theme variables.** These are `color-scheme`, the twenty color roles, `--radius-selector`, `--radius-field`, `--radius-box`, `--size-selector`, `--size-field`, `--border`, `--depth`, and `--noise`. The audit reads the key list from `daisyui/theme/object`, so it tracks daisyUI upgrades. The engine defaults none of these keys. daisyUI does, when a theme block extends a built-in theme by name.
2. **The sheet.** The roles, two colors, and rules described on this page.
3. **The emitted classes.** The engine writes a fixed set of class names into public markup. The [emitted-class registry](./render.md#emitted-classes) lists each one and says whether the sheet styles it or a theme must. A theme that replaces the chassis `prose.css` reads that list to learn what its own sheet has to cover.

Keys follow daisyUI's names for daisyUI's keys. A cairn key sits in `@theme` under a Tailwind namespace when a utility should read it, as `text-muted` reads `--color-muted`. Every other cairn key is a `--cairn-*` role. `--flow-space` is the one unprefixed role, because every site's prose reads it. The sheet defines no alias for any key.

A key enters the sheet only when an engine or chassis file reads it and the key carries no site-owned design choice. The design scale (the faces, `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`, and the two measures) stays in the chassis `tokens.css`, together with the two heading levers `--font-weight-heading` and `--cairn-heading-case`. The sheet never redefines a Tailwind stock key such as `--leading-tight` or `--font-mono`. A built-in public component therefore can't rely on a scale key. It sizes type and space in `em` or `inherit`, or from daisyUI's `--size-field` and `--size-selector`.

## Roles

The sheet declares each role in `@layer theme` on `:root, [data-theme]`. Each row gives the key, the default the sheet ships, and what reads it.

| Key | Default | Read by |
|---|---|---|
| `--flow-space` | `1.35em` | The reading surface's vertical rhythm. |
| `--cairn-code-bg` | `var(--color-base-200)` | The `pre.shiki` background. |
| `--cairn-code-border` | `var(--color-base-300)` | The `pre.shiki` border. |
| `--cairn-code-ink` | `var(--color-base-content)` | The `pre.shiki` text, and every token with no class. |
| `--cairn-code-comment` | `var(--color-muted)` | `.cairn-tok-comment`. |
| `--cairn-code-keyword` | `var(--color-primary)` | `.cairn-tok-keyword`. |
| `--cairn-code-string` | `var(--cairn-success-ink)` | `.cairn-tok-string`. |
| `--cairn-code-function` | `var(--cairn-info-ink)` | `.cairn-tok-function`. |
| `--cairn-code-number` | `var(--cairn-warning-ink)` | `.cairn-tok-number`. |
| `--cairn-code-punct` | `var(--color-muted)` | `.cairn-tok-punct`. |
| `--cairn-success-ink` | `color-mix(in oklab, var(--color-success) 50%, var(--color-base-content))` | Small text on a success surface, and the code ramp. |
| `--cairn-warning-ink` | `color-mix(in oklab, var(--color-warning) 50%, var(--color-base-content))` | Small text on a warning surface, `PreviewBanner`'s draft link, and the code ramp. |
| `--cairn-error-ink` | `color-mix(in oklab, var(--color-error) 50%, var(--color-base-content))` | Small text on an error surface. |
| `--cairn-info-ink` | `color-mix(in oklab, var(--color-info) 50%, var(--color-base-content))` | Small text on an info surface, `PreviewBanner`'s ended link, and the code ramp. |
| `--cairn-shadow` | `0 1px 2px color-mix(in oklab, black 6%, transparent), 0 6px 20px -8px color-mix(in oklab, black 12%, transparent)` | The elevation of a floating card. |
| `--cairn-focus-ring-outline` | `2px solid var(--color-primary)` | `.cairn-focus-ring` and the chassis focus rules. |
| `--cairn-focus-ring-offset` | `2px` | `.cairn-focus-ring` and the chassis focus rules. |
| `--cairn-focus-ring-radius` | `2px` | Markup that wants a rounded corner on a focused element. |

## Theme colors

The sheet declares two colors in `@theme`, so the utilities `text-muted` and `border-card-border` exist.

| Key | Default | Read by |
|---|---|---|
| `--color-muted` | `color-mix(in oklab, var(--color-base-content) 80%, var(--color-base-100))` | Secondary text, and the code comment and punctuation roles. |
| `--color-card-border` | `color-mix(in oklab, var(--color-base-content) 9%, transparent)` | The hairline border of a card. |

## Site-owned tokens

The engine defaults every role above. A theme built on the chassis also defines six keys that nothing defaults, because each carries a design choice.

| Key | Set in | Read by |
|---|---|---|
| `--cairn-cta-bg` | Each daisyUI block | The ground of the styleguide's call-to-action panel. |
| `--cairn-cta-content` | Each daisyUI block | The text on that panel. |
| `--cairn-cta-border` | Each daisyUI block | The panel's border color. |
| `--cairn-cta-btn-bg` | Each daisyUI block | The ground of the button on the panel. |
| `--cairn-cta-btn-content` | Each daisyUI block | The text of that button. |
| `--cairn-caption-tracking` | `:root` | The letter-spacing of the header navigation links. |

A chassis-based theme defines every custom property that the chassis and its routes read and that neither the engine nor the chassis `tokens.css` defaults. The six above are the complete list for the chassis as shipped. `tokens.css` already gives the design scale (the faces, `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`, the two measures, and the two heading levers) a generic default, so a theme redeclares those only to change them. A theme that omits one of the six leaves the `var()` unresolved: `theme-conformance` names it, and the panel or the navigation links render without it. A key the chassis reads behind a fallback, such as `--tag-filter-radius`, is an optional override and never a hole.

A theme's own additions take the `--site-*` prefix.

## Rules

The sheet ships rules in `@layer components` only where the styling carries no design choice.

| Selector | What it does |
|---|---|
| `pre.shiki` | Binds the highlighter's block to `--cairn-code-bg`, `--cairn-code-ink`, and `--cairn-code-border`. |
| `.cairn-tok-keyword`, `.cairn-tok-string`, `.cairn-tok-comment`, `.cairn-tok-function`, `.cairn-tok-number`, `.cairn-tok-punct` | Bind each token class to its `--cairn-code-*` role. |
| `.table-scroll` | Sets `display: block` and `overflow-x: auto`, the structural pair that lets a wide table scroll. |
| `.cairn-focus-ring:focus-visible` | Applies the outline and offset roles. It never sets the radius, so a call site's own `border-radius` is untouched. |

The sheet also carries one `@source` line over the engine's public component directory, `dist/public/`. A built-in public component's Tailwind utilities therefore compile in the site's own sheet, and the `@theme` keys it reads are emitted.

The chassis `prose.css` keeps the design of `.table-scroll` (flow space, scroll-edge shading, focus) and drops only the structural pair. A utility that sets `outline-*` on a `.cairn-focus-ring` element wins over the class, because utilities sit in a later layer.

## Layers and nesting

Tailwind declares `theme` as its lowest layer, so a value written anywhere else overrides a role. A value in an unlayered `:root` rule wins, and so does a value in a daisyUI theme block. The `[data-theme]` selector makes a role recompute inside a region that carries its own `data-theme`. A derived ink inside a nested region mixes that region's fill with that region's body ink.

The two `@theme` colors do not recompute there. Tailwind resolves them at `:root`, and a nested region inherits the result. A theme that nests a region sets `--color-muted` and `--color-card-border` in the nested block.

The import order decides ties between the sheet and a theme. The sheet comes before the theme's own blocks, so a later `@theme` declaration in the theme wins over the sheet's two colors.

## Placement of a per-scheme value

A theme writes each per-scheme value in that scheme's daisyUI block, so the value follows the scheme the page carries. Two limits apply.

- A value that carries a comma, such as `--cairn-shadow`, does not survive daisyUI's option parser. Write it in that scheme's `:root` block instead.
- The two `@theme` colors resolve at `:root`. A theme that nests a region sets them in the nested block, as [Layers and nesting](#layers-and-nesting) describes.

A hand-tuned per-scheme value, such as an ink override or the CTA set, goes in both daisyUI blocks. A value set in one block never reaches the other scheme, so the scheme without it falls back to the engine's derived default, or to nothing for a site-owned key.

The per-scheme CTA set can sit in either of two places. The simpler choice for a new theme is each daisyUI block. The other is a `:root` block with its dark counterpart, the form Waymark uses. Its light CTA values are unlayered, and a layered dark value in a daisyUI block would lose to them, so the dark values live in unlayered rules too. Write them in both dark `:root` blocks: the `@media (prefers-color-scheme: dark)` block, guarded by `:root:not([data-theme])` so an explicit choice wins, and the explicit `:root[data-theme="<dark name>"]` block. The first applies when the visitor has made no choice and the system is dark, and the second applies after a toggle, so a value in only one leaves the other case on the light values. Both placements are valid.

An unlayered `:root` role in a site's own sheet beats the sheet's layered default. A copy of the earlier chassis `tokens.css` therefore cancels ink derivation without any visible error, which is why the audit's `theme-conformance` rule raises a finding when a chassis file redeclares a default this sheet sets.

## Ink derivation

Each status ink defaults to the status fill mixed toward the body ink. Mixing darkens the fill on a light scheme and lightens it on a dark one, so the ink keeps the fill's hue and reads as small text. The four inks share one formula and one percentage, 50, in both schemes.

`--color-muted` defaults to an opaque mix of the body ink over `base-100`, at 80 percent. An opaque mix has a contrast ratio that belongs to the theme. The earlier default was a translucent mix, which composites over whatever lies beneath it.

The percentages come from a measurement in Chromium's computed colors across daisyUI's 35 stock themes, Waymark, and the fixture theme, on `base-100`, `base-200`, and each status's callout tint. The [derivation record](https://github.com/glw907/cairn-cms/blob/main/docs/superpowers/research/2026-09-29-theme-pass-c-ink-derivation.md) lists every theme's result at the chosen percentage and at its neighbors. Some stock themes fail AA with a derived ink, and the record names them. A theme that needs a tuned ink sets its own in its daisyUI block, and in both blocks when both schemes need it.

Run the public-scope audit before you call a theme finished, since a derived ink can fail AA on a theme's own fills:

```bash
npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
```

A `theme-contrast` finding names the block, the pair, and its ratios, for example `--cairn-warning-ink on --color-base-100 is 3.90 in sRGB and 3.88 in display-p3`. Set `--cairn-<status>-ink` in that block to a color of the fill's hue with a different lightness: lower it on a light scheme, raise it on a dark one. Waymark's inks are `oklch(52% 0.11 76)` on light and `oklch(82% 0.12 76)` on dark for warning. Lowering the fill's share in the derived mix, `color-mix(in oklab, var(--color-warning) 35%, var(--color-base-content))`, moves the ink toward the body ink the same way. The ink sits on `base-100`, `base-200`, and the status's callout tint, so re-run the audit until every pair the finding named reads 4.5 or more in both color spaces. Repeat the fix in the other block if its scheme reports the same pair.

### Changed defaults

A site that copied the earlier `tokens.css` carries different values. Compare them before you replace the copy with the import.

| Key | Earlier default | Current default |
|---|---|---|
| `--cairn-success-ink`, `--cairn-warning-ink`, `--cairn-error-ink`, `--cairn-info-ink` | The status fill itself. | A 50 percent mix toward `--color-base-content`. |
| `--color-muted` | A 60 percent mix of `--color-base-content` with `transparent`. | An 80 percent mix of `--color-base-content` with `--color-base-100`. |
| `--cairn-shadow` | Two `--color-base-content` mixes at 6 and 12 percent. | The same geometry, mixing `black`, so the shadow stays a shadow on a dark scheme. |

A site that needs a value to stay fixed sets the key itself.

## The seam promise

`cairn-public.css` and the emitted-class registry are public surface. Renaming or removing a key or an emitted class is a disclosed contract change. Adding a key with a default is not breaking. Changing a default's value is a disclosed change with a changelog line, and a site that needs the old value sets the key itself.

## Contrast coverage

The audit's `theme-contrast` rule measures these defaults against WCAG AA in both sRGB and display-p3, for every scheme a theme defines. It reads values, so it stays a check on the theme and never replaces the rendered audit. Its resolver evaluates `var()` chains and one `color-mix()` form, reports anything else as unmeasured, and measures the root element only, so a nested region is outside it. [What theme-contrast doesn't cover](./cairn-audit.md#what-theme-contrast-doesnt-cover) states each limit.

## See also

- [Emitted classes](./render.md#emitted-classes) lists every class the engine writes into public markup.
- [The public components](./public.md) documents `PreviewBanner`, the built-in component that reads these tokens.
- [The `cairn-audit` CLI](./cairn-audit.md) documents the three public-scope rules.
