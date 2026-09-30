# Tables and figures

The engine wraps every table in a labeled, keyboard-reachable scroll region, `table-scroll`. Figures carry a placement class when the author names one.

Rendered markup:

```html
<div class="prose">
  <div class="table-scroll" role="region" tabindex="0" aria-label="Table">
    <table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table>
  </div>
  <figure class="cairn-place-wide"><img src="/media/a.jpg" alt=""><figcaption>Caption</figcaption></figure>
</div>
```

Reads:

- The sheet styles `table-scroll` with `display: block` and `overflow-x: auto`, the pair that makes a wide table scroll. `prose.css` adds the edge shading and the focus outline.
- Table text reads `--text-step--1`. Rules read `--color-base-300` under the header and `--color-card-border` between rows. Even rows tint `--color-base-200`.
- Placement classes `cairn-place-center`, `cairn-place-wide`, and `cairn-place-full` are the theme's to style. The figure directive page describes them.

Override seams:

- A theme that replaces `prose.css` keeps the structural pair from the sheet and adds its own shading.
- The wrapper is focusable on purpose. Keep a visible focus rule on `table-scroll`.
