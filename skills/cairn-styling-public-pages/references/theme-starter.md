# Theme starter

One complete daisyUI theme block. daisyUI does not merge a block that names no built-in theme, so a key left out is a runtime hole. Copy the block into `theme.css` once per scheme, change `name`, `default`, `prefersdark`, and `color-scheme` for the second scheme, and replace every value.

```css
@plugin "daisyui/theme" {
  name: "mytheme";
  default: true;
  prefersdark: false;
  color-scheme: light;

  --color-base-100: oklch(98% 0 0);
  --color-base-200: oklch(95% 0 0);
  --color-base-300: oklch(90% 0 0);
  --color-base-content: oklch(25% 0 0);
  --color-primary: oklch(45% 0.1 250);
  --color-primary-content: oklch(99% 0.01 250);
  --color-secondary: oklch(50% 0.02 75);
  --color-secondary-content: oklch(99% 0.005 75);
  --color-accent: oklch(52% 0.07 235);
  --color-accent-content: oklch(99% 0.01 235);
  --color-neutral: oklch(27% 0.01 70);
  --color-neutral-content: oklch(97% 0.003 75);
  --color-info: oklch(55% 0.1 235);
  --color-info-content: oklch(99% 0.01 235);
  --color-success: oklch(54% 0.12 150);
  --color-success-content: oklch(99% 0.01 150);
  --color-warning: oklch(80% 0.13 78);
  --color-warning-content: oklch(28% 0.05 78);
  --color-error: oklch(58% 0.19 27);
  --color-error-content: oklch(99% 0.01 27);
  --radius-selector: 0.25rem;
  --radius-field: 0.375rem;
  --radius-box: 0.5rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 0;
  --noise: 0;
}
```

`name` is the string `data-theme` selects and the cookie stores. `default: true` marks the first-visit scheme and `prefersdark: true` the block a dark system selects. `--color-base-300` is a rule color, never the ground under text. `--depth` and `--noise` are `0` or `1`.

A hand-tuned ink, `--color-muted`, or `--cairn-<status>-ink` goes in this block too, and in the other scheme's block. `references/retheme-by-tokens.md` ("Where a value goes") covers the keys that cannot go here.

## The design scale

The chassis `tokens.css` defaults every design-scale key inside `@theme` (faces, `--font-weight-heading`, `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`, the two measures), so a theme may omit any and still generate every named utility.

A theme sets a defaulted key only to change its value. Redeclare it in the theme's `@theme` block, after the `tokens.css` import.

`--cairn-heading-case` is defaulted too, but as a plain role in a lowest layer rather than in `@theme`, since `text-transform` has no Tailwind namespace. The chassis sets it to `none`. A theme overrides it in each daisyUI block, or in its own `:root`, and leaves it out to keep headings as authored.

A theme must set these, since neither the engine nor the chassis defaults them:

- Both daisyUI blocks, since the chassis declares none.
- The five `--cairn-cta-*` keys and `--cairn-caption-tracking`.
- `--text-step--2` when the header reads `text-step--2`, as Waymark's `SiteHeader.svelte` does for the tracked nav. The chassis scale starts at `--text-step--1`.
