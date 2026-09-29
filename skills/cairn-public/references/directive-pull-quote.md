# The pull-quote directive

One striking sentence set large, with an optional attribution. The text carries the manual `pullquote` hook, so the component and a hand-written pull quote render alike. It also carries `pull-quote-text`, a hook with no default rule, which the snippet omits.

Authoring:

```md
:::pull-quote[Write the post you wish someone had handed you.]{attribution="A reader"}
:::
```

Rendered markup:

```html
<figure class="pull-quote">
  <p class="pullquote">Write the post you wish someone had handed you.</p>
  <figcaption class="pull-quote-attribution">A reader</figcaption>
</figure>
```

Reads:

- The display face `--font-display`, the size `--text-step-3`, the leading `--leading-tight`, and the tracking `--tracking-tight`.
- An opening quote mark in `--color-primary`. The attribution reads `--color-muted` and prefixes an em dash by a `::before` rule.

Override seams:

- The hanging layout past the reading measure belongs to the opt-in `data-flourish` attribute on the `.prose` root, so it is off by default.
- Body weight is 500 in `prose.css`. The heading levers do not reach it, since a pull quote is not a heading.
