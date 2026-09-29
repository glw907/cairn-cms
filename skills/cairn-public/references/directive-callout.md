# The callout directive

A highlighted note with a title, a body, and an optional list of points. The site registers it, so its markup is the site's own `build()` output. The rules live in `prose.css`, scoped under `.prose`.

Authoring:

```md
::::callout[A worked example]{tone="note"}
The body, as markdown.

:::points
- First takeaway
:::
::::
```

Rendered markup:

```html
<aside class="callout callout-note">
  <p class="callout-title">A worked example</p>
  <div class="callout-body"><p>The body, as markdown.</p></div>
  <ul class="callout-points"><li>First takeaway</li></ul>
</aside>
```

Reads:

- Tone classes `callout-note`, `callout-tip`, and `callout-warning`. The tone picks the rule color and the tint.
- Fills and inks: `--color-info` with `--cairn-info-ink`, `--color-success` with `--cairn-success-ink`, `--color-warning` with `--cairn-warning-ink`.
- The ground `--color-base-100`, the hairline `--color-card-border`, the corner `--radius-box`, and the spacing steps `--spacing-s`, `--spacing-m`, and `--spacing-3xs`.

Override seams:

- Retune a tone by changing its status fill. The ink follows unless the block sets it.
- The tint percentages are `prose.css` rules, so a theme that wants another tint edits that file or replaces it.
- The empty `callout-points` list keeps no margin, so a callout with no points needs no override.
