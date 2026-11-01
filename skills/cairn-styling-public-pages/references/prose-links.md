# Links

Inline links in the reading surface: `--color-primary` text with a soft underline that firms on hover.

Rendered markup:

```html
<div class="prose">
  <p>A sentence with <a href="/page">a link</a> in it.</p>
</div>
```

Reads:

- The color and the underline read `--color-primary`. The pressed state mixes it toward `--color-base-content`.
- Focus reads `--cairn-focus-ring-outline`, `--cairn-focus-ring-offset`, and `--cairn-focus-ring-radius`, with a `--color-base-100` halo.

Override seams:

- Change `--color-primary` to move links, the focus ring, list markers, and the callout rule together.
- Contrast of `--color-primary` on `--color-base-100` is a `theme-contrast` pair, so a new accent is measured for you.
