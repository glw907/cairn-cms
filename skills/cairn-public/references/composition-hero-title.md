# The cairn-hero-title class

The heading inside a hero. It sets its own margin, so it needs no reset.

Rendered markup:

```html
<h1 class="cairn-hero-title">A title</h1>
```

Reads:

- The display face `--font-display`, the size `--text-step-5`, the leading `--leading-tight`, and the tracking `--tracking-tight`.
- The weight is a fixed 600 in `composition.css`, so `--font-weight-heading` and `--cairn-heading-case` do not reach it today.

Override seams:

- Restyle it in the theme's own sheet, or read the two heading levers in a rule of your own.
