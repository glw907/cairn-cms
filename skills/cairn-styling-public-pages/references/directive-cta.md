# The cta directive

One prominent link that points the reader at the next step. `variant` is `primary` or `secondary`.

Authoring:

```md
:::cta{label="Read the guide" url="https://example.com" variant="primary"}
:::
```

Rendered markup:

```html
<p class="cta">
  <a class="cta-link cta-primary" href="https://example.com">Read the guide<span class="cairn-icon"><svg class="cairn-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="..." /></svg></span></a>
</p>
```

Reads:

- `cta-primary` fills with `--color-primary` and writes `--color-primary-content`. `cta-secondary` is transparent with a `--color-card-border` hairline.
- The corner is `--radius-field`, and the minimum height is `2.75rem`, a touch-target floor.
- Hover and pressed states mix `--color-primary` toward `--color-base-content`.

Override seams:

- The fuller marketing panel is a site design. Build it from the `cairn-band` and `cairn-card` primitives instead of restyling this link.
