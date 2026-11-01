# The micro-cta directive

A compact pointer for further reading at the end of a section. It has no variant, and the note line is optional.

Authoring:

```md
:::micro-cta{label="Read the guide" url="https://example.com" note="a short gloss"}
:::
```

Rendered markup:

```html
<p class="micro-cta">
  <a class="micro-cta-link" href="https://example.com">
    <span class="micro-cta-label">Read the guide</span>
    <span class="micro-cta-note">a short gloss</span><span class="cairn-icon"><svg class="cairn-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="..." /></svg></span>
  </a>
</p>
```

Reads:

- A `--color-card-border` hairline chip with the corner `--radius-field`. The arrow glyph paints `--color-primary`.
- The label reads `--font-body` at `--text-step--1`. The note reads `--color-muted`.

Override seams:

- Hover mixes `--color-primary` into the border. A reduced-motion preference removes the transition.
