# The faq directive

One question and its answer on a native `details` disclosure, so it works without JavaScript. The question is an attribute and the answer is a markdown slot.

Authoring:

```md
:::faq{question="Does this work without JavaScript?"}
Yes. The disclosure is native.
:::
```

Rendered markup:

```html
<details class="faq">
  <summary class="faq-question">
    <span class="faq-marker"><span class="cairn-icon"><svg class="cairn-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="..." /></svg></span></span>
  </summary>
  <div class="faq-answer"><p>Yes. The disclosure is native.</p></div>
</details>
```

Reads:

- The question text sits in a span, `faq-question-text`, which is a hook with no default rule.
- A `--color-card-border` rule under each item. A lone `faq` gains a full border and the corner `--radius-box`.
- The question turns `--color-primary` on hover. The marker reads `--color-muted` and turns over when the item is open.

Override seams:

- The marker glyph comes from the site icon set, so a different chevron is a different key in `icons.ts`.
- Adjacent items form a list with rules between them, so consecutive `faq` directives need no wrapper.
