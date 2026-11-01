# PreviewBanner

The default notice for a shared draft preview. It renders one of two states and holds no state of its own. Import it from `@glw907/cairn-cms/public`. A site may skip it and render its own banner from the same `preview` data.

Rendered markup:

```html
<aside class="cairn-preview-banner" data-state="draft" aria-label="Preview status">
  <p>Draft preview · expires <time datetime="2026-10-01T12:00:00Z">2026-10-01 12:00 UTC</time></p>
</aside>
```

Reads:

- Two states. The `draft` state paints `--color-base-200` under a `--color-warning` border. The `published` state, shown when the preview has ended, paints `--color-base-100` under a `--color-info` border.
- The links read `--cairn-warning-ink` and `--cairn-info-ink`, underlined so color is never the only cue.
- The five override properties `--cairn-preview-bg`, `--cairn-preview-fg`, `--cairn-preview-border`, `--cairn-preview-link`, and `--cairn-preview-radius`. Each is read behind a fallback and never declared, so a value set on `:root` or a region wins.

Override seams:

- A color property set once applies to both states, since each replaces the default for the whole banner.
- The rules live in the component's scoped `<style>` block. `cairn-public.css` holds none of them, because the palette is a design default.
