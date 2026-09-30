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

The keys fall into four groups.

- **The block header.** `name` is the string `data-theme` selects and the cookie stores. `default: true` marks the scheme a first-time visitor sees, and `prefersdark: true` marks the block a dark system scheme selects. Set `color-scheme` to `light` or `dark`.
- **Surface and ink.** `--color-base-100` is the page paper, `-200` and `-300` step away from it, and `--color-base-content` is the body ink. `--color-base-300` is a rule color and never the ground under text.
- **Roles.** `primary`, `secondary`, `accent`, `neutral`, and the four statuses `info`, `success`, `warning`, and `error` each carry a fill and a `-content` color for text on that fill.
- **Geometry.** `--radius-selector`, `--radius-field`, and `--radius-box` set the three corners. `--size-selector` and `--size-field` scale the small controls. `--border` is the border width, and `--depth` and `--noise` are `0` or `1` and switch daisyUI's shading and grain.

A hand-tuned ink, `--color-muted`, or `--cairn-<status>-ink` goes in this block too, and in the other scheme's block. The "Placement of a per-scheme value" section of `node_modules/@glw907/cairn-cms/docs/reference/public-css.md` covers the keys that cannot go here.

## The design scale

The chassis `tokens.css` defaults every design-scale key inside `@theme`, so a theme may omit any of them and still generate every named utility. The defaulted keys are:

- the three faces `--font-display`, `--font-body`, and `--font-mono`
- `--font-weight-heading` and `--cairn-heading-case`
- `--text-step--1` through `--text-step-5`
- the eight spacing steps `--spacing-3xs`, `-2xs`, `-xs`, `-s`, `-m`, `-l`, `-xl`, and `-2xl`
- `--leading-body`, `--leading-snug`, and `--leading-tight`
- `--tracking-tight` and `--tracking-eyebrow`
- `--container-measure` and `--container-measure-wide`

A theme sets a defaulted key only to change its value. Redeclare it in the theme's own `@theme` block, after the `tokens.css` import.

A theme must set these, since neither the engine nor the chassis defaults them:

- Both daisyUI blocks, since the chassis declares none.
- The five `--cairn-cta-*` keys and `--cairn-caption-tracking`.
- `--text-step--2` when the header reads `text-step--2`, as Waymark's `SiteHeader.svelte` does for the tracked nav. The chassis scale starts at `--text-step--1`.
