# The cairn-hero class

An introductory block: a large display heading over a recessed lead. The title and the lead have their own pages.

Rendered markup:

```html
<header class="cairn-hero"><h1 class="cairn-hero-title">A title</h1><p class="cairn-hero-lead">A lead sentence.</p></header>
```

Reads:

- A flex column with the gap `--spacing-s`.

Override seams:

- Per-instance property: `--cairn-hero-gap`.
