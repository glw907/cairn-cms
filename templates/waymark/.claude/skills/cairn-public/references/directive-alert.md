# The alert directive

A bordered note whose icon defaults from its role. The directive declares no `preview`, so the editor palette shows no sample for it, and the styleguide names it in its list of preview-less entries. It still needs the rules below.

Authoring:

```md
:::alert[Title]{role="caution"}
The body, as markdown.
:::
```

Rendered markup:

```html
<section class="alert alert-caution">
  <div class="cairn-alert-body">
    <div class="cairn-head"><span class="cairn-icon"><svg class="cairn-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="..." /></svg></span><h2 class="cairn-head-title">Title</h2></div>
    <div class="alert-body"><p>The body.</p></div>
  </div>
</section>
```

Reads:

- `alert` and `alert-note` or `alert-caution`. `prose.css` overrides daisyUI's `.alert` layout, so the rules below beat it.
- The head row classes `cairn-head`, `cairn-icon`, and `cairn-glyph` from the emitted-class registry, plus `cairn-head-title` and `cairn-alert-body`, which the chassis owns.
- Inks `--cairn-info-ink` and `--cairn-warning-ink` for the rule, the title, and the icon; tints from `--color-info` and `--color-warning` over `--color-base-100`.

Override seams:

- The `caution` role defaults its icon to `leaf`, set by `defaultIconByRole` on the definition.
- A theme that drops daisyUI's `alert` component key from the plugin `exclude` list gets daisyUI's own rules underneath these.
