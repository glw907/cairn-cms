# The cairn-site-main class

The growing item of the site shell. It sets an explicit width, because a flex item that holds a wide descendant otherwise stretches the whole column.

Rendered markup:

```html
<main class="cairn-site-main">Content</main>
```

Reads:

- A growing flex item with `width: 100%` and `min-width: 0`. It reads no token.

Override seams:

- Keep the explicit width if you restyle it. `min-width: 0` alone does not fix the overflow.
