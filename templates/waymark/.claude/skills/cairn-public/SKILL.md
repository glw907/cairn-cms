---
name: cairn-public
description: Restyle or extend the public side of a cairn site, the pages a visitor reads. Load before editing theme.css, prose.css, composition.css, a directive's rules, or a public component, and before choosing a color, face, or corner for the site. Gives the job-to-token table, where a value goes, and one catalogue page per public piece cairn ships. Defers to the official daisyUI skill for component classes.
---

# cairn public

This skill teaches an agent to restyle the public side of a cairn site: the reading surface, the
chrome, and every piece cairn writes into public markup. It stops at the public side. Anything
under `/admin` belongs to `cairn-admin-screens`, and a seam a developer builds on belongs to
`cairn-extend`. For a daisyUI component class (`btn`, `badge`, `card`), use the official daisyUI
skill rather than this one.

## The contract

A theme meets three parts, and nothing else is required of it.

1. **daisyUI's theme variables.** Colors, corner radii, sizes, `--border`, `--depth`, and `--noise`,
   in one `@plugin "daisyui/theme"` block per scheme.
2. **`@glw907/cairn-cms/cairn-public.css`.** The engine's role defaults, two `@theme` colors, and the
   rules that carry no design choice. A site imports it once, after Tailwind and before its own
   reading-surface sheet.
3. **The emitted classes.** The class names cairn writes into public markup. The registry names each
   one and says whether the sheet or the theme styles it.

The contract is a floor. A theme may add tokens, replace `prose.css`, or restyle anything through the
cascade. Two reference pages hold the whole contract. From the site's root, read
`node_modules/@glw907/cairn-cms/docs/reference/public-css.md` for every key and default, and
`node_modules/@glw907/cairn-cms/docs/reference/render.md` for the emitted-class registry.

## Theming

### Job to token

Change the token for the job, never a literal beside it.

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
| CTA panel | `--cairn-cta-bg`, `--cairn-cta-content`, `--cairn-cta-border`, `--cairn-cta-btn-bg`, `--cairn-cta-btn-content` | each daisyUI block, site-owned |
| Header nav tracking | `--cairn-caption-tracking` | the `:root` block, site-owned |
| Code block | `--cairn-code-bg`, `--cairn-code-ink`, `--cairn-code-keyword` | the block |
| Focus ring | `--cairn-focus-ring-outline`, `--cairn-focus-ring-offset` | the block |
| First-visit scheme | `default: true` on one daisyUI block | that block |

A row marked site-owned has no engine or chassis default, so a chassis-based theme defines it. The
rule is wider: define every custom property the chassis and its routes read that neither the engine
nor the chassis `tokens.css` defaults. Today that is the five `--cairn-cta-*` keys and
`--cairn-caption-tracking`, and `public-css.md` holds the list. A key read behind a `var()` fallback
is an optional override.

Three rows carry a rule.

- **Rules.** `--color-base-300` is the color of a rule or a border. Never use it as the ground under
  text, since no contrast is designed for that pair.
- **Headings.** `--font-weight-heading` and `--cairn-heading-case` are the two levers, and one value
  moves every heading. An eyebrow keeps its own `uppercase` and tracking, so a heading lever never
  reaches it.
- **Default scheme.** The block marked `default: true` sets the scheme a first-time visitor sees, and
  the light and dark toggle follows the scheme the root actually renders in. A dark-first theme marks
  its dark block.

### Where a value goes

A per-scheme value goes in that scheme's daisyUI block, so it follows the scheme the page carries. A
hand-tuned value, an ink override or the CTA set, goes in both blocks, since a value set in one block
never reaches the other scheme. A
value that carries a comma, such as `--cairn-shadow`, does not survive daisyUI's option parser, so it
goes in that scheme's `:root` block. An unlayered `:root` role beats the sheet's layered default, and a
stale copy of the old chassis `tokens.css` therefore cancels ink derivation without an error.
`theme-conformance` raises a finding for that copy.

### Two paths

- **Fast.** Extend a built-in daisyUI theme by naming a block after it (`name: "nord"`) and setting only
  what differs. daisyUI completes the block by merging, and the audit accepts it. Or start from
  daisyUI's theme generator and paste its output as the two `@plugin "daisyui/theme"` blocks.
- **Full control.** Write both blocks with every key daisyUI's theme object carries, then set the
  `@theme` scale and the roles above. Nothing merges, so a missing key is a runtime hole.

### Escapes from a literal

`public-literals` flags a color literal or an absolute font size outside a token definition. Two
escapes are sanctioned.

- **A one-line `@theme` token.** Define the value once under a theme root, then read it through its
  utility or `var()`. A definition under a theme root is never a finding.
- **A reasoned suppression.** Put a comment beside the line: `cairn-audit-disable-next-line
  public-literals -- <reason>`. A missing reason, or a directive that silences nothing, is itself a
  finding.

### Renaming a theme

The theme names live in three places. `src/theme/theme-names.ts` feeds the toggle, the inline script
in `src/app.html` reads the cookie and both names, and each `@plugin "daisyui/theme"` block carries a
`name:`. `theme-names.test.ts` fails when one of them drifts.

### What a theme directory holds

On the chassis, `src/theme/` is the theme and `src/chassis/` is the plumbing under it. The theme
directory holds:

- **`theme.css`.** The two daisyUI blocks, the `@theme` scale, and an `@import` of
  `../chassis/tokens.css`. CSS reaches the chassis by relative import, since aliases don't resolve in CSS.
- **Chrome components.** `SiteHeader.svelte` and `SiteFooter.svelte`, which read `page.data` (the site
  name and the resolved nav) and never import site config.
- **`theme-names.ts`.** The toggle's config.
- **Its adapter files.** `cairn.config.ts`, `markdown-components.ts`, and `icons.ts`.

A `.ts` or `.svelte` file in the theme imports a chassis helper, such as the theme toggle, through the
`$chassis` alias.

### Replacing `prose.css`

A replacement `prose.css` must style every emitted class the registry assigns to a theme, or leave it
unstyled on purpose. Read the registry first. It also loses the chassis design of `.table-scroll`,
since the sheet keeps only the structural pair.

## The catalogue

`references/README.md` indexes one short page per public piece, named by the rule
`<kind>-<name>.md`. Each page gives the rendered markup, the classes and tokens the markup reads, and
the seams that override it. Open the page for the piece in hand before restyling it.

| Kind | Pages |
|---|---|
| `directive-*` | Every directive the site registers, plus the built-in `figure` and `include` |
| `island-*` | Every directive that hydrates |
| `component-*` | `CairnHead` and `PreviewBanner` |
| `composition-*` | Every `cairn-*` class the chassis `composition.css` defines |
| `prose-*` | Headings and lead, links, lists, blockquote, code, and tables and figures |

## A public component

Two paths exist, and both read contract tokens instead of literals.

- **A site's own component.** A `defineComponent` declaration builds the markup, and the rules go in
  `prose.css` or in the component's scoped `<style>` block.
- **A built-in component.** This path belongs to the engine. The markup lives in `src/lib/public/`,
  styled by Tailwind utilities that compile through the sheet's `@source` line, or by a scoped
  `<style>` block that reads contract tokens. A rule enters `cairn-public.css` only when it styles an
  engine-emitted class and carries no design choice. A built-in component carries no literal and no
  daisyUI component class.

To prove a built-in component under two themes, add a throwaway route under
`examples/showcase/src/routes/(site)/` that imports it, run `npm run package`, then run
`node scripts/lab/theme-fixture.mjs --arm template --probe <route> <selector>`. It reports the
element's computed color and radius under Waymark and under the fixture theme. Delete the route.

Map each job to its token: surface `base-200` or `base-100`, hairline `card-border`, corner
`rounded-box` (which reads `--radius-box`), ink `base-content`, border width `--border`. Tailwind
utilities over those tokens are the preferred styling. A scoped `<style>` block that reads contract
tokens is the alternative. Em-based spacing such as `p-[1em]` is sanctioned, and `public-literals`
does not flag it.

## Checking the work

Run the public-scope audit before you finish a theme:

```bash
npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
```

It needs no built admin stylesheet. The three rules report at advisory tier on a consumer site, and
a finding never changes the exit code. Plain `npx cairn-audit` runs them beside the admin rules.

`public.scope` in `cairn-audit.config.json` decides what is read: `src/theme`, `src/chassis`,
`src/routes`, `src/lib/public`, and `src/lib/components` by default, minus `src/routes/admin`. To
confirm a file is covered, put a color literal in it, run the audit, and look for a
`public-literals` finding that names the file. Remove the literal.

When `theme-contrast` reports a derived status ink below AA, its message names the block, the pair,
and the ratios. Hand-tune `--cairn-<status>-ink` in that block and in the other scheme's block, and
re-run. Keep the fill's hue, lower the lightness on a light scheme, raise it on a dark one, and
repeat until every named pair reads 4.5 or more. `public-css.md` works an example.

Read `node_modules/@glw907/cairn-cms/docs/reference/cairn-audit.md` for what each rule covers and
what it leaves to the rendered page.
