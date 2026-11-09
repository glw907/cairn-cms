# Retheme by tokens

Contents: the brand recipe, job to token, what the chassis owns, where a value goes, what is
derived, status colors, faces and scale, escapes from a literal, renaming a theme.

A theme change is a token change. The prose, the chrome, the components, and the code highlighter
all read the role tokens, so a retheme edits the theme's `tokens/tokens.json` and rebuilds, and
nothing else. A theme's values live in `themes/<id>/`, and the showcase's `src/theme/` is a copy
generated from `themes/waymark/`, so edit the source and never the copy. Rebuild with
`node scripts/theme/build-tokens.mjs themes/waymark`, which rewrites `tokens/tokens.css`, `modes/`,
and `options/`. Never edit those built files, because the next build overwrites the edit. Then run
`npm run theme:lay-in` to refresh the showcase's copy. The build script ships in the engine
repository and not in a scaffolded site. A hand-built site, with no `tokens.json`, edits wherever
its two `@plugin "daisyui/theme"` blocks live. Never edit `prose.css`, `site.css`, a component, or a
chassis file to recolor, and never write a color literal beside a token.

## The brand recipe

Do every step in both color modes, `color.light` and `color.dark` in `tokens.json`, which the
build writes into the two daisyUI blocks. A value set in one mode never reaches the other scheme.

1. **Accent.** Set `--color-primary` to the brand color for that scheme. Light takes a deep value
   (about 45% lightness) and dark a lifted one (about 74%), since primary is the link color and
   the focus ring and must clear 4.5:1 on `--color-base-100`. To keep the existing contrast, change
   only the hue, the third oklch value, and hold lightness and chroma.
2. **Page.** Set `--color-base-100` to the page background for that scheme.
3. **Move the neighbors with the page.** Set `--color-base-200` and `--color-base-300` to the same
   hue and chroma as the new `--color-base-100`, at the lightness offsets the block already has.
   They are the card, band, code-block, and rule steps. Left neutral beside a tinted page they
   read as a mismatch, grey cards on a warm ground. The shipped light ladder steps down 2 and 7.6
   lightness points from the page, and the dark ladder puts `-200` 4 below and `-300` 8 above it.
4. **Leave `--color-primary-content` alone.** It keeps its lightness and chroma. Its hue may follow
   the new accent, which at that chroma changes neither the look nor the contrast. Retune its
   lightness only when `theme-contrast` reports the pair below 4.5.
5. **Leave the rest** unless the brand names it: `--color-base-content`, the status fills,
   secondary, accent, neutral. Bring them on-brand the same way as primary when it does.
6. Run the audit (`references/checking-a-theme.md`) and fix what it names.

Done correctly the links, buttons, focus ring, code keywords, cards, and bands all recolor with
no per-selector override. If a color did not move, a literal or a stale `tokens.css` copy is
holding it (see "What is derived").

## Job to token

| Job | Token | Set it in `tokens.json`, lands in |
|---|---|---|
| Brand accent, links, focus ring | `--color-primary`, `--color-primary-content` | `color.light` and `color.dark`, the daisyUI blocks |
| Page paper and body ink | `--color-base-100`, `--color-base-200`, `--color-base-content` | `color.light` and `color.dark`, the daisyUI blocks |
| Rules and borders | `--color-base-300` | `color.light` and `color.dark`, the daisyUI blocks |
| Secondary text | `--color-muted` | `color.light` and `color.dark`, the daisyUI blocks |
| Card hairline | `--color-card-border` | `base` for the light value, in `@theme`; `color.dark` for the dark value, unlayered |
| Status fills | `--color-info`, `--color-success`, `--color-warning`, `--color-error` | `color.light` and `color.dark`, the daisyUI blocks |
| Small text on a status surface | `--cairn-info-ink`, `--cairn-success-ink`, `--cairn-warning-ink`, `--cairn-error-ink` | `color.light` and `color.dark`, the daisyUI blocks, only to hand-tune |
| Faces | `--font-display`, `--font-body`, `--font-mono` | `base`, in `@theme` |
| Heading weight | `--font-weight-heading` | `base`, in `@theme` |
| Heading case | `--cairn-heading-case` | `base`, in `:root` |
| Eyebrows | `eyebrow-case tracking-eyebrow`, reading `--cairn-eyebrow-case` and `--tracking-eyebrow` | `--cairn-eyebrow-case` in `base`, in `:root`; `--tracking-eyebrow` in `base`, in `@theme` |
| Type, space, rhythm, measure | `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`, `--container-measure` | `base`, in `@theme` |
| Corners | `--radius-selector`, `--radius-field`, `--radius-box` | `color.light` and `color.dark`, the daisyUI blocks |
| Floating-card elevation | `--cairn-shadow` | `color.light` and `color.dark`; the comma in the value writes it unlayered |
| CTA panel | `--cairn-cta-bg`, `--cairn-cta-content`, `--cairn-cta-border`, `--cairn-cta-btn-bg`, `--cairn-cta-btn-content` | `color.light` and `color.dark`, marked unlayered, so the light value lands in `:root` and the dark value in the two dark selectors |
| Header nav tracking | `--cairn-caption-tracking` | `base`, in `:root` |
| Code block | `--cairn-code-bg`, `--cairn-code-ink`, `--cairn-code-keyword` | `color.light` and `color.dark`, the daisyUI blocks, only to override the derived value |
| Code block scroll cue | `--cairn-scroll-cue` | `base`, in `:root`; `none` turns the cue off |
| Focus ring | `--cairn-focus-ring-outline`, `--cairn-focus-ring-offset` | `color.light` and `color.dark`, the daisyUI blocks, only to override the derived value |
| First-visit scheme | the built `modes/light.css` or `modes/dark.css` | the sheet pins the no-cookie scheme; a site copies one into `src/site/theme-options.css`, and a visitor's cookie still wins |

Three rows carry a rule.

- **Rules.** `--color-base-300` is the color of a rule or border. Never the ground under text; no
  contrast is designed for that pair.
- **Headings.** `--font-weight-heading` and `--cairn-heading-case` move every heading at once. An
  eyebrow keeps its tracking and takes its case from `--cairn-eyebrow-case`, `uppercase` by default.
- **Default scheme.** The build marks the light block `default: true`, so the first-visit scheme is
  light, and the toggle follows the scheme the root renders in. A dark-first theme links
  `modes/dark.css` as the table says.

## What the chassis owns

Two groups of names belong to the chassis. A theme maps its values onto them and does not define a
second scale under the same names.

- **The reading scale.** `--text-step--1` through `--text-step-5` are the type sizes the chassis
  stylesheets read, and the contract also requires `--text-step--2`. The chassis defaults them
  inside `@theme`, and a theme redeclares each with its number. A design system whose scale
  reuses `--text-step-*` for other sizes, such as interface steps 1 to 13, silently resizes every
  heading when its `@theme` block loads. Keep that scale under another prefix, and set each
  chassis step to the value you want.
- **The `--cairn-*` roles.** The engine's `cairn-public.css` and the chassis declare a default for
  each role, in `@layer theme`, on `:root, [data-theme]`: the code ramp, the status inks, the focus
  ring, `--flow-space`, `--cairn-heading-case`, `--cairn-eyebrow-case`, and `--cairn-scroll-cue`.
  A theme sets a role to change it and never renames one. The CTA keys and
  `--cairn-caption-tracking` have no default, and a theme that uses them defines them. A property
  that is the theme's alone takes `--site-*`.

The chassis defaults sit in the lowest layer, so a theme writes a role where its value wins and
never repeats the default's selector. A role in the theme's `:root`, or in a daisyUI block, is
enough: the page shell sets `data-theme` on `<html>`, so a daisyUI block matches the root.

## Where a value goes

`scripts/theme/build-tokens.mjs` places each token by its group and its name.

- **A `base` token whose name starts with `font-`, `text-`, `spacing-`, `leading-`, `tracking-`,
  `container-`, `color-`, `radius-`, `shadow-`, `ease-`, `animate-`, `breakpoint-`, `blur-`, or
  `aspect-`** goes in `@theme`, so Tailwind generates its utility.
- **Any other `base` token**, such as `--cairn-caption-tracking`, goes in `:root`.
- **A `color.light` or `color.dark` token** goes in that scheme's daisyUI block, the
  `@plugin "daisyui/theme"` block named in `cairn-theme.json`. daisyUI emits the blocks into
  `@layer base`.
- **A mode token whose value has a comma**, such as `--cairn-shadow`, or one marked
  `"$extensions": { "pub.cairn": { "unlayered": true } }`, goes unlayered, because a value with a
  comma does not survive daisyUI's option parser and a layered value cannot beat an unlayered one.
  Its light value goes in `:root`. Its dark value goes under the two selectors daisyUI gives its
  dark block: `@media (prefers-color-scheme: dark)` on `:root:not([data-theme])`, which applies
  with no visitor choice on a dark system, and `:root[data-theme="<dark name>"]`, which applies
  after a toggle.

A per-scheme value therefore goes in both mode groups when both schemes need it, since a value set
in one never reaches the other.

## What is derived

The engine sheet derives these, so setting the source retunes them with no extra edit.

- Each status ink is its status fill mixed 50 percent toward the body ink, in both schemes.
- `--color-muted` is an opaque 80 percent mix of the body ink over `--color-base-100`.
- The code ramp reads `--color-base-200`, `--color-base-300`, `--color-base-content`,
  `--color-primary`, and the status inks.
- The focus ring is `--color-primary`.

Waymark hand-tunes `--color-muted` and all four inks in each mode. Moving a page color or a
status fill therefore leaves those overrides at their old values: retune each beside its source,
or delete the override so the derived value follows. A moved page color can push a hand-tuned
ink below 4.5, which `theme-contrast` reports.

An unlayered `:root` role beats the sheet's layered default. A stale copy of the old chassis
`tokens.css` cancels ink derivation with no visible error, and `theme-conformance` reports it.

## Status colors

Set the four fills in each block, then retune each overridden `--cairn-<status>-ink` to its fill or
delete it. An ink left unchanged stops matching its fill in directive text and code highlighting.
When `theme-contrast` flags an ink, hand-tune `--cairn-<status>-ink` in the named block and in the
other scheme's block: keep the fill's hue, lower the lightness on a light scheme or raise it on a
dark one, and re-run until every named pair reads 4.5 or more. Lowering the fill's share in the
derived mix, `color-mix(in oklab, var(--color-warning) 35%, var(--color-base-content))`, has the
same effect.

## Faces and scale

Self-host each face: put its woff2 files in the theme's `fonts/`, write the `@font-face` rules in
`fonts/fonts.css`, which `theme.css` imports directly under the chassis import, and set
`--font-display` and `--font-body` in `base` to the family name the rules declare. A token naming a
face with no `@font-face` rule falls through to `system-ui` with no error. On the chassis `max-w-2xl` compiles to about 4rem; use `max-w-measure`,
`max-w-measure-wide`, or an arbitrary value.

For a full-control theme, write both blocks with every key daisyUI's theme object carries
(`references/theme-starter.md`): nothing merges, so a missing key is a runtime hole. To start
faster, name a block after a built-in daisyUI theme (`name: "nord"`) and set only what differs.

## Escapes from a literal

`public-literals` flags a color literal or an absolute font size outside a token definition.

- **A one-line `@theme` token.** Define the value once under a theme root and read it through its
  utility or `var()`. A definition under a theme root is never a finding.
- **A reasoned suppression.** Put `cairn-audit-disable-next-line public-literals -- <reason>` in a
  comment beside the line. A missing reason, or a directive that silences nothing, is itself a
  finding.

## Renaming a theme

The two daisyUI names live once, in `colorModes` in `cairn-theme.json`. The tokens build reads them
for the `name:` of each daisyUI block and for the dark selector, and `npm run theme:lay-in`
generates `src/theme/theme-names.ts`, which feeds the toggle, and rewrites the cookie regex in
`src/app.html` between its two marker comments. Rename a mode in the manifest, rebuild the tokens,
and lay the theme in again. A stale regex fails silently: a returning visitor's saved choice never
applies and the page falls back to the system scheme.
