# Retheme by tokens

Contents: the brand recipe, job to token, where a value goes, what is derived, status colors,
the two paths, escapes from a literal, renaming a theme.

A theme change is a token change. The prose, the chrome, the components, and the code highlighter
all read the role tokens, so a retheme edits `src/theme/theme.css` (a hand-built site: wherever its
two `@plugin "daisyui/theme"` blocks live) and nothing else. Never edit `prose.css`, `site.css`,
a component, or a chassis file to recolor, and never write a color literal beside a token.

## The brand recipe

Do every step in both daisyUI blocks, light and dark. A value set in one block never reaches the
other scheme.

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

| Job | Token | Set it in |
|---|---|---|
| Brand accent, links, focus ring | `--color-primary`, `--color-primary-content` | each daisyUI block |
| Page paper and body ink | `--color-base-100`, `--color-base-200`, `--color-base-content` | each daisyUI block |
| Rules and borders | `--color-base-300` | each daisyUI block |
| Secondary text | `--color-muted` | each daisyUI block |
| Card hairline | `--color-card-border` | `@theme`, and the block of a nested region |
| Status fills | `--color-info`, `--color-success`, `--color-warning`, `--color-error` | each daisyUI block |
| Small text on a status surface | `--cairn-info-ink`, `--cairn-success-ink`, `--cairn-warning-ink`, `--cairn-error-ink` | the block, only to hand-tune |
| Faces | `--font-display`, `--font-body`, `--font-mono` | `@theme` |
| Heading weight | `--font-weight-heading` | `@theme` |
| Heading case | `--cairn-heading-case` | each daisyUI block |
| Eyebrows | `uppercase tracking-eyebrow`, reading `--tracking-eyebrow` | `@theme` |
| Type, space, rhythm, measure | `--text-step-*`, `--spacing-*`, `--leading-*`, `--tracking-*`, `--container-measure` | `@theme` |
| Corners | `--radius-selector`, `--radius-field`, `--radius-box` | each daisyUI block |
| Floating-card elevation | `--cairn-shadow` | the scheme's `:root` block |
| CTA panel | `--cairn-cta-bg`, `--cairn-cta-content`, `--cairn-cta-border`, `--cairn-cta-btn-bg`, `--cairn-cta-btn-content` | each daisyUI block (site-owned) |
| Header nav tracking | `--cairn-caption-tracking` | the `:root` block (site-owned) |
| Code block | `--cairn-code-bg`, `--cairn-code-ink`, `--cairn-code-keyword` | the block |
| Focus ring | `--cairn-focus-ring-outline`, `--cairn-focus-ring-offset` | the block |
| First-visit scheme | `default: true` on one daisyUI block | that block |

Three rows carry a rule.

- **Rules.** `--color-base-300` is the color of a rule or border. Never the ground under text; no
  contrast is designed for that pair.
- **Headings.** `--font-weight-heading` and `--cairn-heading-case` move every heading at once. An
  eyebrow keeps its `uppercase` and tracking.
- **Default scheme.** The block marked `default: true` is the first-visit scheme, and the toggle
  follows the scheme the root renders in. A dark-first theme marks its dark block.

## Where a value goes

A per-scheme value goes in that scheme's daisyUI block. A hand-tuned value (an ink override, the
CTA set) goes in both blocks. A value with a comma, such as `--cairn-shadow`, does not survive
daisyUI's option parser, so it goes in that scheme's `:root` block. The CTA set may instead sit in
`:root` blocks as Waymark does, which needs the dark values in both dark blocks: the
`@media (prefers-color-scheme: dark)` block guarded by `:root:not([data-theme])`, and the explicit
`:root[data-theme="<dark name>"]` block. Prefer the daisyUI blocks for a new theme.

## What is derived

The engine sheet derives these, so setting the source retunes them with no extra edit.

- Each status ink is its status fill mixed 50 percent toward the body ink, in both schemes.
- `--color-muted` is an opaque 80 percent mix of the body ink over `--color-base-100`.
- The code ramp reads `--color-base-200`, `--color-base-300`, `--color-base-content`,
  `--color-primary`, and the status inks.
- The focus ring is `--color-primary`.

Waymark hand-tunes `--color-muted` and all four inks in each block. Moving a page color or a
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

Install a Fontsource variable package per face, import its `index.css` directly under the chassis
import in `theme.css`, and set `--font-display` and `--font-body` in `@theme` to
`"<Name> Variable"`. A token naming a face with no installed and imported package falls through to
`system-ui` with no error. On the chassis `max-w-2xl` compiles to about 4rem; use `max-w-measure`,
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

The names live in three places: `src/theme/theme-names.ts` (feeds the toggle), the inline script in
`src/app.html`, and the `name:` of each daisyUI block. `src/app.html` is outside the theme
directory, so a rename confined to `src/theme/` leaves it stale. Its one regex,
`/(?:^|; )cairn-site-theme=(cairn-dark|cairn)(?:;|$)/`, takes the cookie name before the `=` from
`cookieName` in `theme-names.ts`, and the two names in the group from `light` and `dark`. A stale
regex fails silently: a returning visitor's saved choice never applies and the page falls back to
the system scheme. Also change the `:root[data-theme="cairn-dark"]` selector in `theme.css`;
`theme-names.test.ts` fails on drift in the other three and does not read that selector.
