# The cairn-band class

A full-bleed horizontal strip with its own ground, for a home-page panel that breaks out of the reading column. Put a max-width container inside it.

Rendered markup:

```html
<section class="cairn-band"><div class="site-main">Content</div></section>
```

Reads:

- The ground `--color-base-200` and the block padding `--spacing-xl`.
- A band that directly precedes the footer cancels the footer's top margin, since the band's own edge is the seam.

Override seams:

- Per-instance properties: `--cairn-band-padding-block` and `--cairn-band-bg`.
