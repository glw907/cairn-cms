# Theme starter

One complete daisyUI theme block. daisyUI does not merge a block that names no built-in theme, so a key left out is a runtime hole. Copy the block into `src/theme/tokens/tokens.css` once per scheme, change `name`, `default`, `prefersdark`, and `color-scheme` for the second scheme, and replace every value.

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

`name` is the string `data-theme` selects and the cookie stores. `default: true` marks the first-visit scheme and `prefersdark: true` the block a dark system selects. `--color-base-300` is the divider and border color, not a background for text. `--depth` and `--noise` are `0` or `1`.

A hand-tuned ink, `--color-muted`, or `--cairn-<status>-ink` goes in this block too, and in the other scheme's block. [Retheme by tokens](retheme-by-tokens.md) ("Where a value goes") covers the keys that cannot go here.

A scaffolded site edits `src/theme/tokens/tokens.css` directly. The tokens build that regenerates that file from `tokens/tokens.json` ships in the cairn-cms repository, not in a scaffolded site, so a site that edits the CSS leaves `tokens.json` as the theme's original source. In the repository, edit `themes/<id>/tokens/tokens.json` and run the build and the lay-in.

## The design scale

The chassis `tokens.css` defaults every design-scale key inside `@theme`, so a key a theme omits still generates its named utility. The contract does not count that default as the theme's definition. A theme's built sheets declare each name in `tokens.required` in each color mode and each option value, and a chassis or engine default never fills that gap.

The required design-scale names are:

- The three faces, `--font-body`, `--font-display`, and `--font-mono`.
- The type steps `--text-step--2` through `--text-step-5`.
- The spacing steps `--spacing-3xs` through `--spacing-2xl`.
- The leadings `--leading-body`, `--leading-snug`, and `--leading-tight`, and the trackings `--tracking-eyebrow` and `--tracking-tight`.
- The two measures, `--container-measure` and `--container-measure-wide`.

Redeclare each in the theme's `@theme` block, after the `tokens.css` import. The required roles also include `--cairn-eyebrow-case`, `--cairn-scroll-cue`, `--cairn-shadow`, `--color-muted`, `--color-card-border`, the four `--cairn-<status>-ink` names, the five `--cairn-cta-*` keys, and `--cairn-caption-tracking`.

`--font-weight-heading` and `--cairn-heading-case` are defaulted and not required. `--cairn-heading-case` is a plain role in a lowest layer rather than a key in `@theme`, since `text-transform` has no Tailwind namespace. The chassis sets it to `none`. A theme overrides it in each daisyUI block, or in its `:root`, and leaves it out to keep headings as authored.

Both daisyUI blocks are the theme's to write, since the chassis declares none. Waymark's `SiteHeader.svelte` reads `text-step--2` for the tracked nav, and the chassis scale starts at `--text-step--1`, so the theme supplies that step.

## See also

- [Retheme by tokens](retheme-by-tokens.md) covers where each token lands.
- [What a theme directory holds](theme-directory.md) covers the contract and the build.
- [Checking a theme](checking-a-theme.md) covers the theme check, the viewer that renders a theme under each option and width, and the audit rules.
