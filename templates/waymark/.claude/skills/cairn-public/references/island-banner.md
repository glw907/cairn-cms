# The banner island

The live half of the banner directive. The render pipeline emits a boundary carrying the directive name and its props, with the static fallback inside. The islands runtime mounts `Banner.svelte` over the fallback and re-checks the expiry itself.

Rendered markup:

```html
<div data-cairn-island="banner" data-cairn-props='{"message":"...","expires":"2999-01-01"}'>
  <div class="banner" role="status"><p class="banner-message">...</p></div>
</div>
```

Reads:

- The live component renders the same `banner` and `banner-message` classes as the fallback, so the swap on mount does not shift the layout.
- The tokens are the banner directive's: `--cairn-info-ink`, `--color-info`, `--color-base-100`, `--site-banner-border-width`, and `--site-banner-radius`.

Override seams:

- Keep the fallback and the live markup on one set of classes. A rule written for one and not the other shows as a jump at hydration.
- The props are author input and reach a text binding only, never raw HTML.
