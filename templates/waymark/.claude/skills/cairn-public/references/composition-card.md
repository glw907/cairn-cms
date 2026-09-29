# The cairn-card class

A bordered, padded surface for a theme's own chrome or composed pages. The callout and alert directives hand-roll the same shape in `prose.css`, because their markup is fixed.

Rendered markup:

```html
<div class="cairn-card">Content</div>
```

Reads:

- The ground `--color-base-100`, the hairline `--color-card-border`, the corner `--radius-box`, and padding `--spacing-m`.

Override seams:

- Per-instance properties: `--cairn-card-padding`, `--cairn-card-radius`, `--cairn-card-bg`, and `--cairn-card-border`.
