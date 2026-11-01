# Headings and the lead paragraph

The reading surface's headings and its lead. The `.prose` root scopes every rule, and each heading reads the two heading levers.

Rendered markup:

```html
<div class="prose">
  <h1>Title</h1>
  <p class="lead">One sentence that sets up the page.</p>
  <h2>A section</h2>
  <h3>A part of it</h3>
</div>
```

Reads:

- Every heading reads `--font-display`, `--font-weight-heading`, and `--cairn-heading-case`, so two values move all of them.
- Sizes: `--text-step-5` for the page title, `--text-step-3` for `h2`, `--text-step-2` for `h3`. Leading and tracking come from `--leading-tight`, `--leading-snug`, and `--tracking-tight`.
- The vertical rhythm is `--flow-space`, set per heading from `--spacing-xl`, `--spacing-l`, and `--spacing-m`.
- The lead reads `--text-step-1`, `--leading-snug`, and a mix of `--color-base-content`.

Override seams:

- Heading case is `none` by default. Setting `--cairn-heading-case` to `uppercase` uppercases every heading, and an eyebrow is unaffected.
- Headings inside a callout, alert, or FAQ answer read a body-size rule instead, so a directive title never competes with a section heading.
