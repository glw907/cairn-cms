# The cairn-site-shell class

A sticky-footer flex column for a theme whose footer pins to the viewport bottom on a short page. Pair it with `cairn-site-main`.

Rendered markup:

```html
<div class="cairn-site-shell"><header>Header</header><main class="cairn-site-main">Content</main><footer>Footer</footer></div>
```

Reads:

- A flex column with a minimum height of the viewport. It reads no token.

Override seams:

- A theme that wants no sticky footer skips the class.
