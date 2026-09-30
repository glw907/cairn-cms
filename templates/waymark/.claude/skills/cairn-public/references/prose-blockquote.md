# Blockquotes

A quotation with a `--color-primary` rule on its left and an italic voice. A `cite` reads as a small muted line.

Rendered markup:

```html
<div class="prose">
  <blockquote><p>A sentence worth quoting.</p><cite>A source</cite></blockquote>
</div>
```

Reads:

- The rule and the padding read `--color-primary` and `--spacing-m`. The paragraph reads `--text-step-1` and `--leading-snug`.
- The `cite` reads `--text-step--1` and `--color-muted`.

Override seams:

- A blockquote is not a pull quote. The pull-quote directive has its own page and its own hook.
