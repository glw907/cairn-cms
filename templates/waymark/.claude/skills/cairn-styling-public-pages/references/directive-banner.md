# The banner directive

A time-boxed announcement that removes itself after its expiry date. It is the site's one hydrating directive, so it ships a static fallback and a live island. Its rules live in `site.css`, not `prose.css`.

Authoring:

```md
:::banner{message="The trailhead lot reopens in the spring." expires="2999-01-01"}
:::
```

Rendered markup:

```html
<div class="banner" role="status">
  <p class="banner-message">The trailhead lot reopens in the spring.</p>
</div>
```

Reads:

- A left rule in `--cairn-info-ink` of width `--site-banner-border-width`, the corner `--site-banner-radius`, and a tint of `--color-info` over `--color-base-100`.

Override seams:

- An expired banner renders `<div hidden class="banner-expired">` and clears its props, so the announcement text never reaches the page source.
- Restyle the fallback and the live island together. The island page lists both.
