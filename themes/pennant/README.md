# Pennant

Pennant is a cairn theme for a club, a team, or a school group. It builds the whole look from
two colors: color 1 grounds the header and the hero, and color 2 fills the crest and the main
buttons. The links, the page grounds, and the text take a tint of color 1, so the site reads as
the club's colors in both the light and the dark color mode.

## Color sets

The theme's `colors` option holds five color sets. Fireweed is the default.

| Value | Color 1 | Color 2 |
|---|---|---|
| `fireweed` | Fireweed pink | Spruce green |
| `navy` | Navy | Gold |
| `scarlet` | Scarlet | Charcoal |
| `purple` | Purple | Silver |
| `orange` | Orange | Blue |

Each set keeps its two colors in both color modes. In the dark mode, the page grounds darken and
the text lightens, while the header and the crest stay in the club's colors.

## Use your own colors

To use your club's own colors, set four custom properties in `src/site/overrides.css`:

```css
:root,
html:root:not([data-theme]) {
  --color-neutral: oklch(45% 0.09 195);
  --color-neutral-content: oklch(98% 0.005 195);
  --color-secondary: oklch(72% 0.15 35);
  --color-secondary-content: oklch(20% 0.03 35);
}
```

The four properties are two pairs. `--color-neutral` is color 1, and `--color-neutral-content` is
the text that sits on it. `--color-secondary` is color 2, and `--color-secondary-content` is the
text on color 2. The header, the buttons, the links, and the card accents all follow these four
values.

The rule needs both selectors. A plain `:root` rule loses to the theme's color-mode rule for a
visitor with no color-mode cookie, so the second selector, `html:root:not([data-theme])`, covers
that visitor.

The values apply in both color modes, so choose each text color to read clearly on its color in
light and dark. Keep each pair at a contrast ratio of at least 4.5:1. The example above meets
that ratio in both modes.
