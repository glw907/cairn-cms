# The cairn-hero-title class

The heading inside a hero. It sets its own margin, so it needs no reset.

Rendered markup:

```html
<h1 class="cairn-hero-title">A title</h1>
```

Reads:

- The display face `--font-display`, the size `--text-step-5`, the leading `--leading-tight`, and the tracking `--tracking-tight`.
- The weight `--font-weight-heading` and the case `--cairn-heading-case`, the two heading levers, so one value moves it with every other heading.

Override seams:

- Restyle it in the theme's own sheet, or read the two heading levers in a rule of your own.
