# The cairn theme

The opt-in identity layer that turns Waymark, cairn's neutral default public template, back into
its original branded look: a display serif, a warm-tinted paper, and the three signature prose
gestures. `cairn.pub` runs this layer on top of Waymark.

Install `@fontsource-variable/fraunces`, copy `cairn.css` into your site, and add one import line
directly after your `theme.css` import. Keep the two imports as separate, leading statements in
your entry stylesheet; do not append `@import './cairn.css';` inside your own copy of `theme.css`
after its `@plugin`/`@theme` blocks. CSS requires an `@import` rule to precede every other rule in
a stylesheet, so a trailing import there is invalid and only happens to compile because Vite
inlines `@import` regardless of position. See
[`docs/guides/make-waymark-your-own.md`](../../docs/guides/make-waymark-your-own.md) for the
full walkthrough.
