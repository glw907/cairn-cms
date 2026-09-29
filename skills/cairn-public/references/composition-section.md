# The cairn-section class

A vertical rhythm block that groups a composed page's pieces with one gap above, below, and between children.

Rendered markup:

```html
<section class="cairn-section"><h2>Latest</h2><p>Content</p></section>
```

Reads:

- The gap `--spacing-l`, applied as block margin and as the top margin between children.

Override seams:

- Per-instance property: `--cairn-section-gap`.
