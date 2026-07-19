# Make Waymark your own

Waymark, the starter template your site ships with, is neutral by default: a humanist sans display
face over a clean, hue-free paper. You re-skin it from one file,
`src/theme/theme.css`, with no engine change and no fork. Rotate the brand accent and retune the
paper:

```css
/* src/theme/theme.css, inside the light @plugin "daisyui/theme" block */
--color-primary: oklch(45% 0.15 30); /* was 248: a warm terracotta instead of ink-blue */
--color-base-100: oklch(98% 0.01 60); /* a warm paper instead of neutral white */
```

Rebuild, and the whole surface follows, because the chrome, the reading surface, the code highlighter, and the directive components read those tokens instead of hard-coding a color (the `check:public-tokens` gate below enforces that).

## The token seam

`theme.css` is the one file a re-skin touches, because it is the one file every surface reads
from. Two `@plugin "daisyui/theme"` blocks (light and dark) hold the DaisyUI role tokens: the
`base-100/200/300` paper ladder, `primary` and its `-content` pair, the status fills. A `@theme`
block below them holds cairn's own design-scale tokens, the faces, the fluid type and space
scales, the measure, so Tailwind generates a named utility (`font-display`, `text-step-3`,
`max-w-measure`) for each one alongside the `var()` reference the chrome and the reading surface
already use. Edit the token in one place and both consumers follow. The file's own header
comment carries the full recipe, numbered by how much of the surface each step touches; start
there for the mechanics of a specific token.

Two CI gates hold the re-skin honest. `check:public-tokens` scans the reading surface and every
component for a literal color or a hard-coded font size and fails on either. It also proves the
role and on-surface-ink pairs clear AA contrast (the Web Content Accessibility Guidelines
standard) in both sRGB and display-P3, so a re-skin can't ship an inaccessible pairing.
`test:reskin` rotates the brand hue in a throwaway fixture and proves the AA floor and the
token-only sourcing still hold after the rotation. A `var()` that no block defines fails the
build before it ever reaches a browser.

## The worked example: the cairn theme

Waymark shipped its original branded identity, the cairn theme, before it went neutral. The cairn
theme is now [`examples/cairn-theme/`](../../examples/cairn-theme/) in this repository: a
complete, working re-skin you can read end to end. `cairn.pub`, cairn's own
site, runs exactly this layer on top of Waymark.

The cairn theme swaps the display face to the serif Fraunces and warms the paper ladder from hue-free to a stone tint. Both are ordinary token overrides. It also turns on the three signature prose gestures, which the next section covers. Every value it sets is the ordinary token seam described in the
preceding section. Read `examples/cairn-theme/cairn.css` for the exact
`--color-base-*` and `--font-display` values it carries, and its own comments explaining each
override: an import-order note for the base ladder, and why the type and face overrides need no
special handling.

To use it: install `@fontsource-variable/fraunces`, copy `cairn.css` into your site, and add
one import line directly after your `theme.css` import.

```css
@import './theme.css';
@import './cairn.css';
```

No markup change, no engine change.

## The flourish hook

Three prose gestures carry the cairn theme's identity beyond the palette and the face: a
cairn-glyph mark in place of the plain `hr`, a small accent diamond in place of the standard `ul`
bullet, and a pull-quote that hangs into the left margin on a wide screen. Waymark writes these
gestures into `prose.css` but never applies them by default; they sit scoped under
`.prose[data-flourish]` rather than deleted, so a site turns all three on at once by adding one
attribute to the `.prose` root, no CSS edit required:

```svelte
<div class="prose" data-flourish>
  {@html body}
</div>
```

`cairn.css` takes a different path to the same effect: it re-declares the three gestures without
the `data-flourish` guard, so copying the file in turns them on with no markup change at all. Add
the attribute if you want the choice visible in your markup. The `cairn.css` override suits a site
that would rather keep the change in one CSS-only drop-in.

## The font swap

A font is a token, `--font-display` or `--font-body` in the `@theme` block, so swapping one is the
same edit as any other token. Two things make a font swap different in practice from a color:

- Install the font package before you reference it. cairn self-hosts every face via Fontsource, so
  a swap is `npm install @fontsource-variable/<name>` plus one `@import` line in `theme.css`,
  before every other rule in the file. `cairn.css`'s own font import shows the pattern.
- A serif and a sans read legible at different sizes. Waymark's own swap to a neutral default
  pulled the display type steps (`--text-step-2` through `-5`, covering `h3` through the masthead)
  back one grade when it moved from Fraunces to a sans face, because a sans face reads large at a
  lower size than a serif does at the same step. Swapping the other way, back to a serif, is the
  reverse adjustment; `cairn.css`'s `--text-step-*` block carries the exact values.

## Related reference

[`examples/cairn-theme/README.md`](../../examples/cairn-theme/README.md) is the short pointer
to the working example. The [public design system reference](../internal/public-design-system.md)
covers the full token inventory and the load-bearing rules an agent editing the theme needs to
know. `scripts/check-public-tokens.mjs` and `scripts/reskin-fixture.mjs` are the two gates a
re-skin must clear.
