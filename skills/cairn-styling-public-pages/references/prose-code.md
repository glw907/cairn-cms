# Code

A fenced block renders as `pre.shiki` with class-only tokens, and inline code renders as a bordered chip. The engine writes no inline style, so the theme owns every color.

Rendered markup:

```html
<pre class="shiki"><code><span class="cairn-tok-keyword">const</span> answer <span class="cairn-tok-punct">=</span> <span class="cairn-tok-number">42</span><span class="cairn-tok-punct">;</span></code></pre>
```

Reads:

- The block binds `--cairn-code-bg`, `--cairn-code-ink`, and `--cairn-code-border`. The six token classes `cairn-tok-keyword`, `cairn-tok-string`, `cairn-tok-comment`, `cairn-tok-function`, `cairn-tok-number`, and `cairn-tok-punct` bind `--cairn-code-keyword`, `--cairn-code-string`, `--cairn-code-comment`, `--cairn-code-function`, `--cairn-code-number`, and `--cairn-code-punct`.
- The string, function, and number roles default to the status inks, so retuning an ink retunes the code palette with it.
- Inline code reads `--font-mono`, `--color-base-200`, and `--color-base-300`.

Override seams:

- An uncolored token inherits the block's ink. Set `--cairn-code-ink` to change the base color.
- The string, function, and number roles read the status inks. A theme that hand-tunes an ink retunes it with its fill, or the code colors drift from the palette.
