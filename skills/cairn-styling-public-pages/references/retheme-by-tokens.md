# Retheme by tokens

Contents: the paths to a change, the brand recipe, job to token, what the chassis owns, where a
value goes, what is derived, status colors, faces, escapes from a literal, renaming a theme, see also.

The prose, the chrome, the components, and the code highlighter all read the role tokens, so a
retheme changes token values and edits no stylesheet, component, or chassis file. To recolor, change
the token and leave `prose.css`, `site.css`, and the components alone. Do not write a color literal
outside a token definition, unless a reasoned suppression allows it ("Escapes from a literal").

Which path you take depends on where the theme lives.

- In a scaffolded site, edit `src/theme/tokens/tokens.css` directly. It is a plain file that holds
  the two daisyUI blocks, the `@theme` scale, and the root tokens. The tokens build that regenerates
  it from `tokens/tokens.json` ships in the cairn-cms repository, not in a scaffolded site, so a
  site that edits the CSS leaves `tokens.json` as the theme's original source.
- In the cairn-cms repository, a theme's values live in `themes/<id>/tokens/tokens.json`. The
  showcase's `src/theme/` is generated from `themes/waymark/`, so edit the source, as
  [What a theme directory holds](theme-directory.md) explains.
- A hand-built site with no `tokens.json` edits wherever its two `@plugin "daisyui/theme"` blocks
  live.

To retheme in the repository:

1. Edit `themes/waymark/tokens/tokens.json`.
2. Run `node scripts/theme/build-tokens.mjs themes/waymark`. It rewrites `tokens/tokens.css` and
   `modes/`, and it writes `options/` only when the theme has options, which Waymark does not.
3. Run `npm run theme:lay-in` to refresh the showcase's copy.

## The brand recipe

Do every step in both color modes. In the repository that is `color.light` and `color.dark` in
`tokens.json`, which the build writes into the two daisyUI blocks. A scaffolded site edits the two
blocks. A value set in one mode does not reach the other scheme.

1. Set `--color-primary` to the brand color for that scheme.
2. Set `--color-base-100` to the page background for that scheme.
3. Set `--color-base-200` and `--color-base-300` to the hue and chroma of the new `--color-base-100`, at the lightness offsets the block already has.
4. Run the three audit rules, [`public-literals`](checking-a-theme.md), [`theme-conformance`](checking-a-theme.md), and [`theme-contrast`](checking-a-theme.md), and fix what they name.

Primary is the link color and the focus ring, so it must reach 4.5:1 on `--color-base-100`. The
lightness targets are about 45% for light and about 74% for dark. To keep the existing contrast,
change only the hue, the third oklch value, and hold lightness and chroma.

`--color-base-200` and `--color-base-300` are the card, band, code-block, and rule steps. Left
neutral beside a tinted page, they read as a mismatch, such as gray cards on a warm page. The
shipped light scheme steps down 2 and 7.6 lightness points from the page. The dark scheme puts
`-200` 4 below the page and `-300` 8 above it.

Leave `--color-primary-content` as it is. It keeps its lightness and chroma, and its hue may follow
the new accent, which at that chroma changes neither the look nor the contrast. Retune its lightness
only when `theme-contrast` reports the pair below 4.5. Leave the other roles unless the brand names
them: `--color-base-content`, the status fills, secondary, accent, and neutral. When it does, change
them the way you changed primary.

The links, buttons, focus ring, code keywords, cards, and bands then recolor with no per-selector
override. If a color did not move, a literal or a stale `tokens.css` copy is holding it, as
[What is derived](#what-is-derived) explains.

## Job to token

The table names `tokens.json` groups. A scaffolded site sets the same token in the block or root the
last column names.

| Job | Token | Set in `tokens.json` | Lands in |
|---|---|---|---|
| Brand accent, links, focus ring | `--color-primary`, `--color-primary-content` | `color.light` and `color.dark` | The daisyUI blocks |
| Page paper and body ink | `--color-base-100`, `--color-base-200`, `--color-base-content` | `color.light` and `color.dark` | The daisyUI blocks |
| Rules and borders | `--color-base-300` | `color.light` and `color.dark` | The daisyUI blocks |
| Secondary text | `--color-muted` | `color.light` and `color.dark` | The daisyUI blocks |
| Card hairline | `--color-card-border` | `base` for the light value, `color.dark` for the dark value | `@theme` for the light value, unlayered for the dark value |
| Status fills | `--color-info`, `--color-success`, `--color-warning`, `--color-error` | `color.light` and `color.dark` | The daisyUI blocks |
| Small text on a status surface, set only to hand-tune | `--cairn-info-ink`, `--cairn-success-ink`, `--cairn-warning-ink`, `--cairn-error-ink` | `color.light` and `color.dark` | The daisyUI blocks |
| Faces | `--font-display`, `--font-body`, `--font-mono` | `base` | `@theme` |
| Heading weight | `--font-weight-heading` | `base` | `@theme` |
| Heading case | `--cairn-heading-case` | `base` | `:root` |
| Eyebrows, through the `eyebrow-case` and `tracking-eyebrow` utility classes | `--cairn-eyebrow-case`, `--tracking-eyebrow` | `base` | `:root` for the case, `@theme` for the tracking |
| Type, space, rhythm, measure | `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`, `--container-measure` | `base` | `@theme` |
| Corners | `--radius-selector`, `--radius-field`, `--radius-box` | `color.light` and `color.dark` | The daisyUI blocks |
| Floating-card elevation | `--cairn-shadow` | `color.light` and `color.dark` | Unlayered, because the value has a comma |
| CTA panel | `--cairn-cta-bg`, `--cairn-cta-content`, `--cairn-cta-border`, `--cairn-cta-btn-bg`, `--cairn-cta-btn-content` | `color.light` and `color.dark`, marked unlayered | Unlayered: the light value in `:root`, the dark value in the two dark selectors |
| Header nav tracking | `--cairn-caption-tracking` | `base` | `:root` |
| Code block, set only to override the derived value | `--cairn-code-bg`, `--cairn-code-ink`, `--cairn-code-keyword` | `color.light` and `color.dark` | The daisyUI blocks |
| Code block scroll cue, where `none` turns the cue off | `--cairn-scroll-cue` | `base` | `:root` |
| Focus ring, set only to override the derived value | `--cairn-focus-ring-outline`, `--cairn-focus-ring-offset` | `color.light` and `color.dark` | The daisyUI blocks |

Two token groups need a note.

- `--color-base-300` is the color of a divider line or a border. It is not a background for text, and no contrast is designed for that pair.
- `--font-weight-heading` and `--cairn-heading-case` move every heading at once. An eyebrow keeps its tracking and takes its case from `--cairn-eyebrow-case`, `uppercase` by default.

The first-visit scheme is not a token. It comes from the block marks. The build marks the light block `default: true` and
the dark block `prefersdark: true`, so a first visit follows the system scheme and falls back to
light. The toggle follows the scheme the root renders in. The built `modes/light.css` and
`modes/dark.css` pin the no-cookie scheme. A site that wants dark first copies `modes/dark.css` into
`src/site/theme-options.css`, and a visitor's cookie still wins.

## What the chassis owns

Two groups of names belong to the chassis. A theme maps its values onto them and does not define a
second scale under the same names.

The reading scale is `--text-step--1` through `--text-step-5`, the type sizes the chassis
stylesheets read, and the contract also requires `--text-step--2`. The chassis defaults them inside
`@theme`, and a theme redeclares each with its number. A design system whose scale reuses
`--text-step-*` for other sizes, such as interface steps 1 to 13, silently resizes every heading
when its `@theme` block loads. Keep that scale under another prefix, and set each chassis step to
the value you want.

The chassis roles are the defaults the engine's `cairn-public.css` and the chassis declare in
`@layer theme`, on `:root, [data-theme]`. They are the code ramp, the status inks, `--cairn-shadow`,
the focus ring, `--flow-space`, `--cairn-heading-case`, `--cairn-eyebrow-case`, and
`--cairn-scroll-cue`. `--flow-space` is not a `--cairn-*` name. A theme sets a role to change it and
does not rename one. The CTA keys and `--cairn-caption-tracking` have no default, and a theme that
uses them defines them. A property that belongs to the theme alone takes `--site-*`.

The chassis defaults sit in the lowest layer, so a theme writes a role where its value wins and does
not repeat the default's selector. A role in the theme's `:root`, or in a daisyUI block, is enough.
daisyUI applies the default block to `:root` and the dark block under the system's dark preference,
and a saved choice sets `data-theme` on `<html>`.

The `max-w-*` utilities read `--spacing-*` before `--container-*`. The names `-3xs`, `-2xs`, `-xs`,
`-xl`, and `-2xl` therefore compile to spacing steps, and `max-w-2xl` is about 4rem here, not
Tailwind's 42rem. Use `max-w-measure`, `max-w-measure-wide`, or an arbitrary value.

## Where a value goes

`scripts/theme/build-tokens.mjs` places each token by its group and its name.

| Token | Lands in |
|---|---|
| A `base` token whose name starts with `font-`, `text-`, `spacing-`, `leading-`, `tracking-`, `container-`, `color-`, `radius-`, `shadow-`, `ease-`, `animate-`, `breakpoint-`, `blur-`, or `aspect-` | `@theme`, so Tailwind generates its utility |
| Any other `base` token, such as `--cairn-caption-tracking` | `:root` |
| A `color.light` or `color.dark` token | That scheme's `@plugin "daisyui/theme"` block, the one named in `cairn-theme.json`. daisyUI emits the blocks into `@layer base`. |
| A mode token whose value has a comma, or one marked `"$extensions": { "pub.cairn": { "unlayered": true } }` | Unlayered |

A value with a comma, such as `--cairn-shadow`, does not survive daisyUI's option parser, so the
build writes it unlayered. The marking is for a value that must beat a rule in a later layer, which a
value inside a daisyUI block cannot, because daisyUI emits the block into `@layer base`.

An unlayered token's light value goes in `:root`. Its dark value goes under the two selectors
daisyUI gives its dark block. `@media (prefers-color-scheme: dark)` on `:root:not([data-theme])`
applies with no visitor choice on a dark system, and `:root[data-theme="<dark name>"]` applies after
a toggle.

## What is derived

The engine sheet derives these. A theme that leaves them unset gets the derived values, and a change
to the source retunes them with no extra edit.

- Each status ink is its status fill mixed 50 percent toward the body ink, in both schemes.
- `--color-muted` is an opaque 80 percent mix of the body ink over `--color-base-100`.
- The code ramp reads `--color-base-200`, `--color-base-300`, `--color-base-content`, `--color-primary`, `--color-muted`, and the status inks.
- The focus ring is `--color-primary`.

Waymark hand-tunes `--color-muted` and all four inks in each mode. Moving a page color or a status
fill therefore leaves those hand-tuned values where they were. Retune each beside its source, or
delete it so the derived value follows. A moved page color can push a hand-tuned ink below 4.5,
which `theme-contrast` reports.

An unlayered `:root` role beats the sheet's layered default. A stale copy of the old chassis
`tokens.css` declares those roles unlayered, so it blocks the derivation with no visible error, and
`theme-conformance` reports it.

## Status colors

Set the four fills in each block. Then retune each overridden `--cairn-<status>-ink` to its fill, or
delete it. An ink left unchanged stops matching its fill in directive text and code highlighting.

When `theme-contrast` flags an ink:

1. Open the block the finding names and hand-tune `--cairn-<status>-ink` there.
2. Keep the fill's hue. Lower the lightness on a light scheme or raise it on a dark one.
3. Make the same change in the other scheme's block, since a value set in one scheme does not reach the other.
4. Re-run the audit until every named pair reads 4.5 or more.

You can also write an override that lowers the fill's share in the derived mix, such as
`color-mix(in oklab, var(--color-warning) 35%, var(--color-base-content))`, which has the same effect.

## Faces

To self-host a face:

1. Put its woff2 files in the theme's `fonts/`.
2. Write the `@font-face` rules in `fonts/fonts.css`, which `theme.css` imports directly under the chassis import.
3. Set `--font-display` and `--font-body` in `base` to the family name the rules declare.

A token that names a face with no `@font-face` rule falls through to `system-ui` with no error.

A site that writes its daisyUI blocks by hand can write both blocks with every key daisyUI's theme
object carries ([Theme starter](theme-starter.md)), since nothing merges and a missing key is a
runtime hole. To start faster, name a block after a built-in daisyUI theme, as in `name: "nord"`, and
set only what differs. In the repository the block names come only from `colorModes`, so set
`colorModes.light` to `nord` in the manifest.

## Escapes from a literal

`public-literals` flags a color literal or an absolute font size outside a token definition.

- For a one-line `@theme` token, define the value once under a theme root and read it through its utility or `var()`. A definition under a theme root is not a finding.
- For a reasoned suppression, put `cairn-audit-disable-next-line public-literals -- <reason>` in a comment on the line above the literal. A missing reason, or a directive that silences nothing, is itself a finding.

## Renaming a theme

The two daisyUI names live once, in `colorModes` in `cairn-theme.json`. The tokens build reads them
for the `name:` of each daisyUI block and for the dark selector. `npm run theme:lay-in` generates
`src/theme/theme-names.ts`, which feeds the toggle, and rewrites the cookie regex in `src/app.html`
between its two marker comments. In the cairn-cms repository:

1. Rename the mode in `colorModes`.
2. Rebuild the tokens.
3. Lay the theme in again.

A scaffolded site has no lay-in, so it edits by hand every place the old name appears: the block
names and the dark selectors in `tokens.css` and any `options/` sheets, the names in
`src/theme/cairn-theme.json`, `src/theme/theme-names.ts`, and the regex in `src/app.html`. Search
the site for the old name to find them all.

Check the regex after a rename. A stale one fails silently: a returning visitor's saved choice does
not apply, and the page shows the system scheme.

## See also

- [What a theme directory holds](theme-directory.md) covers the contract's paths, the build, and the lay-in.
- [Theme starter](theme-starter.md) holds a complete daisyUI block.
- [Checking a theme](checking-a-theme.md) covers the audit rules and how to resolve each finding.
