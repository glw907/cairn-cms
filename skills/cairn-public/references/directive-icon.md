# The icon directive

A single glyph from the site icon set, for a short standalone line. It renders at its own block position, never inside a sentence. An unknown name fails the build.

Authoring:

```md
:::icon{name="flag"}
:::
```

Rendered markup:

```html
<span class="cairn-icon"><svg class="cairn-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="..." /></svg></span>
```

Reads:

- `cairn-icon` and `cairn-glyph` from the emitted-class registry. The glyph fills with `currentColor`, so the surrounding text color paints it.
- The `.prose > .cairn-icon` rule sizes the glyph to `1.75em` and rounds its stroke, so a glyph directly in the prose column reads at a deliberate size.

Override seams:

- Color it with a text utility or by setting `color` on a wrapper.
- The glyph data is the site's `icons.ts`, so a new mark is a new key there and never a CSS change.
