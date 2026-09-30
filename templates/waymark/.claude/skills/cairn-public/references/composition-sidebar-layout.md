# The cairn-sidebar-layout class

A main column plus a narrower aside. It stacks below a fixed 48rem breakpoint, so a phone never gets a squeezed pair. A media condition cannot read a custom property, so the breakpoint is not a token.

Rendered markup:

```html
<div class="cairn-sidebar-layout"><main>Main</main><aside>Aside</aside></div>
```

Reads:

- A two-column grid above the breakpoint, with the gap `--spacing-l`.

Override seams:

- Per-instance properties: `--cairn-sidebar-width` and `--cairn-sidebar-gap`.
