# Theme your public site

Re-skin the theme your site ships with, or port your own theme onto the chassis beneath it, and
confirm the result against the public-scope audit rules.

This page assumes a site scaffolded by `create-cairn-site`, which ships Waymark, cairn's public
reading template, on top of the chassis, a set of design-neutral modules and style sheets that
every scaffolded site shares. A site built by hand from `sv create` starts with neither and brings
its own theme. [Theme a hand-built site](#theme-a-hand-built-site) covers the styling stack such a site
adds. [Scaffolded site files](scaffolded-site-files.md) maps every file the setup command writes.

## The chassis boundary

A re-skin or a port edits files on the theme's side of a boundary the scaffold draws.
`src/chassis/` holds the code every scaffolded site shares regardless of design, one concern per
file, from content indexing in `content.ts` to the token system in `tokens.css`. Everything outside
`src/chassis/`, including the adapter config, the chrome components, the color and type values,
and the page compositions, belongs to Waymark.

The setup command copies the chassis and Waymark into the site's tree, and the npm package ships
neither, so an engine upgrade leaves their files unchanged. Those files still read their roles from
the engine's `cairn-public.css`, which
[Token tiers and cascade order](#token-tiers-and-cascade-order) covers.

By convention, a theme file imports from the chassis only through the `$chassis` alias in
TypeScript and Svelte or a relative `@import` in CSS. No gate enforces the convention in a
scaffolded site, since the `check:chassis-boundary` gate runs only in the cairn repository.

A chassis file is safe to delete only when everything that depends on it changes in the same
edit. `feed.ts` has two dependents, the two feed routes, so it deletes along with them and nothing
else changes. `content.ts` supplies six delivery routes, so removing it means replacing all six
routes' imports in the same change.

- Before you delete a chassis file, read its row in the dependents table in
  `src/chassis/README.md`.

## Token tiers and cascade order

Waymark's `theme.css` names three token tiers by how far a re-skin reaches:

- Tier 1 is the two [daisyUI](https://daisyui.com/docs/install/) theme blocks.
- Tier 2 is the on-surface inks, the elevation pair (`--color-card-border` and `--cairn-shadow`),
  the call-to-action (CTA) pair (`--cairn-cta-*`), and the code-highlight binding.
- Tier 3 is the design-scale keys that override the chassis defaults.

`tokens.css` declares the design-scale keys, such as the `--font-*`, `--spacing-*`, and
`--text-step-*` families, each with a generic default. The roles, such as `--color-muted`, the
status inks, the shadow, and the focus ring, come from the engine's `cairn-public.css`, which
`tokens.css` imports right after Tailwind.

The scaffold's `theme.css` and `site.css` carry the theme's tokens and page styling, layered over
the engine's roles and the chassis's generic design-scale defaults. Two orders decide which
declaration of a key wins:

- A design-scale key resolves by source order, so the theme's redeclaration in a later `@theme`
  block overrides the default `tokens.css` declares.
- A role resolves by layer, so a daisyUI block or an unlayered `:root` value overrides the
  engine's declaration in `@layer theme`, the lowest layer Tailwind declares.

The engine declares its roles on `:root, [data-theme]`, so the `[data-theme]` selector recomputes
a role inside a nested theme region. An unlayered rule in a site style sheet also beats every
Tailwind utility, which [Chassis conventions](#chassis-conventions) covers.

Every heading reads two keys, `--font-weight-heading` for its weight and `--cairn-heading-case`
for its case, which defaults to `none`. Chrome markup applies them with the `font-heading` and
`heading-case` utilities, and a scoped `<style>` rule reads the two variables directly.
`prose.css` headings and the hero title read the same keys, so a theme that sets
`--cairn-heading-case: uppercase` uppercases every heading.

## Re-skin Waymark

The re-skin recipe edits about fourteen values across the light and dark daisyUI blocks in
`src/theme/theme.css`. The following excerpt shows five of the recipe's keys in the scaffold's
light block:

```css
/* src/theme/theme.css, the light block; the dark block carries the same keys */
@plugin "daisyui/theme" {
  name: "cairn";
  default: true;
  prefersdark: false;
  color-scheme: light;

  --color-base-100: oklch(98.4% 0 0);
  --color-base-200: oklch(96.4% 0 0);
  --color-base-300: oklch(90.8% 0 0);
  --color-base-content: oklch(25% 0 0);
  --color-primary: oklch(45% 0.1 248);
  /* the block's other keys stay as the scaffold wrote them */
}
```

To re-skin Waymark, follow these steps:

1. In both daisyUI blocks, rotate the hue of `--color-primary` while holding its lightness and
   chroma.
2. In the same two blocks, edit the `base-100/200/300` ladder and `base-content`.
3. Optionally, in the `@theme` block of the same file, swap the two `--font-*` tokens.
4. Optionally, in the same `@theme` block, retune one type ratio or space-scale step.
5. Run the checks in [Verify the theme](#verify-the-theme).

### Rebrand the status colors

Waymark hand-tunes all four status inks in both daisyUI blocks, so a Waymark status rebrand sets a
fill and an ink for each status in each scheme. Where a theme leaves an ink unset, the engine
derives it by mixing its fill 50 percent with `--color-base-content`, so that theme's rebrand needs
one fill per status in each scheme.

To rebrand the status colors, follow these steps:

1. In both daisyUI blocks, set the fill for each status.
2. In the same two blocks, retune each status ink, such as `--cairn-success-ink`, to match its new
   fill, or delete its override.

An overridden ink left unchanged no longer matches its fill in directive text and code
highlighting.

## Page shell behavior

A port that replaces Waymark's chrome reproduces two behaviors of its page shell, the theme
toggle's resolution and the skip link's focus handling.

The theme toggle's `resolveTheme` returns the live `data-theme` when it names one of the config's
two themes. Otherwise it resolves from the root's computed `color-scheme`, so a dark-first theme
resolves dark on a light OS with no edit to the page shell. The two theme names, the cookie name,
and the toggle's config live in `theme-names.ts`.

The chrome's skip link is an `sr-only` anchor to `#main` that becomes visible on focus with
`focus:not-sr-only focus:absolute`. `<main id="main" tabindex="-1">` makes the target focusable, so
activating the link moves keyboard focus and not only the scroll position. That focus is
programmatic, so `main:focus` draws no ring.

## Port your own theme onto the chassis

A port replaces Waymark's style sheets, chrome components, and page compositions with the new
theme's, and it keeps the files in `src/chassis/`.

To port a theme onto the chassis, follow these steps:

1. In the theme's style sheet, import `tokens.css` first.
2. In a later `@theme` block in the same sheet, redeclare the design-scale keys with the theme's
   values.
3. In the same style sheet, replace the two daisyUI theme blocks with the new theme's role colors.

   The chassis's `tokens.css` activates the daisyUI plugin with only four of its components, the
   button, badge, alert, and card. New chrome that renders another daisyUI
   component drops that component's key from the `exclude` list in `tokens.css`.

4. In an unlayered `:root` rule in the theme's style sheet, declare the five `--cairn-cta-*` keys
   and `--cairn-caption-tracking`.

   Neither the engine sheet nor `tokens.css` defaults these six keys. Waymark repeats the dark CTA
   values in a media-guarded `:root:not([data-theme])` block and a
   `:root[data-theme="cairn-dark"]` block, which it keeps identical by hand.

5. In the page compositions, build each layout from the `composition.css` primitives,
   `.cairn-card`, `.cairn-band`, `.cairn-section`, `.cairn-hero`, and `.cairn-sidebar-layout`.

   Each primitive exposes `--cairn-<primitive>-*` custom properties, such as
   `--cairn-card-padding`, for a per-instance override on top of the shared tokens.

6. In the theme's `@theme` block, set `--font-weight-heading` to the new theme's heading weight.
7. In the theme's unlayered `:root` rule, set `--cairn-heading-case` to the new theme's heading
   case.
8. If you rename the daisyUI themes, edit `theme-names.ts`, the no-flash script in `src/app.html`,
   and the two `@plugin "daisyui/theme"` names in `theme.css` together.

   The no-flash script hard-codes the theme cookie, `cairn-site-theme`, and both theme names.
   `theme-names.test.ts` fails when the three places drift.

9. In the new chrome, reproduce the theme toggle's resolution and the skip link's focus handling
   that [Page shell behavior](#page-shell-behavior) describes.
10. Run the checks in [Verify the theme](#verify-the-theme).

## Style the editor preview

The admin's preview frame loads none of the site's CSS, so a site names its compiled style sheets
in the `preview` member of the adapter's `editor` group. With no `preview` set, the frame renders
unstyled markup behind a hint that says so.

To style the preview, follow these steps:

1. In `src/theme/cairn.config.ts`, import each compiled style sheet the public pages load through
   a Vite `?url` import.

   A plain side-effect import such as `import './theme.css'` folds the sheet into a layout CSS
   chunk whose basename differs between the client and server builds. The preview frame then links
   a URL that returns a 404 error in the browser.

2. In the adapter's `editor` group, set the `preview` member's `stylesheets` to those URLs.
3. Optionally, in the same `preview` member, set `containerClass` to the classes that wrap an
   entry on the public site.

The following list describes the four members of `PreviewConfig`, the type of the `preview`
member:

- `stylesheets`, the one required member, holds the absolute or root-relative URLs linked inside
  the preview document.
- `bodyClass` sets a class list on the preview document's body.
- `containerClass` sets a class list on one wrapper element around the rendered content, and
  without it the content renders bare.
- `byConcept` maps a concept id to an optional `bodyClass` and an optional `containerClass` for
  that concept's entries.

An absent override key keeps the top-level value, and the style sheets are always the shared
top-level list. The [`preview` entry](../reference/core.md#preview-adapter-editor-member) in the
core reference carries the full type.

The scaffold sets `stylesheets` to `[themeCss, siteCss]`, imported through `?url`, and
`containerClass` to `'site-main prose'`. On the public site those two classes sit on separate
elements, the `(site)` layout's `<main>` and the `<article>` in `ArticleView.svelte`. The preview
frame renders one wrapper element, so both classes go on it. The following snippet shows that
value on its own:

```ts
import type { PreviewConfig } from '@glw907/cairn-cms';
import themeCss from './theme.css?url';
import siteCss from './site.css?url';

// In src/theme/cairn.config.ts this object sits in the adapter's editor group.
export const preview: PreviewConfig = {
  stylesheets: [themeCss, siteCss],
  containerClass: 'site-main prose',
};
```

The frame paints its body with `var(--color-base-100,#fff)`, so the preview background follows
the site's `base-100` once the site's style sheet loads, and falls back to white without one. The
frame's `<html>` carries no `data-theme`, so only the OS color scheme reaches it. The preview
document's root element carries `data-cairn-preview`, so a site's style sheet can select on it to
suppress entrance animations such as `[data-rise]` inside the frame. The frame also ignores every
link click inside it.

## Style rendered markdown

Rendered markdown takes its typography from `prose.css`, which binds every element to the daisyUI
roles and the cairn tokens, so a re-skin restyles entry bodies with no edit to that file.
`prose.css` places three decorative styles, the cairn-glyph rule, the diamond bullet, and the
margin-hanging pull quote, behind the `.prose[data-flourish]` selector, so they are off by
default.

- To turn the decorative styles on, add a `data-flourish` attribute to the theme's `.prose` root.

## Theme a hand-built site

A site built without the setup command adds the styling stack that the scaffold would have
supplied. The engine ships its public defaults as one CSS asset,
`@glw907/cairn-cms/cairn-public.css`, which
[the public style sheet reference](../reference/public-css.md) documents key by key. The sheet
declares no daisyUI theme variable and activates no daisyUI plugin, yet its roles read daisyUI
roles such as `--color-base-content` and `--color-primary`.

To theme a hand-built site, follow these steps:

1. In the site directory, install daisyUI alongside Tailwind by following
   [daisyUI's installation guide](https://daisyui.com/docs/install/).
2. In the site's global style sheet, import `@glw907/cairn-cms/cairn-public.css` once, after
   `@import "tailwindcss"` and before the style sheet that styles rendered markdown.

   That order lets a later declaration in the site's `@theme` block win over the sheet's two
   `@theme` colors, `--color-muted` and `--color-card-border`.

3. In the same style sheet, add a `@plugin "daisyui/theme"` block with the site's role colors.

   The following style sheet is illustrative, and the theme block elides most of daisyUI's keys:

   ```css
   @import "tailwindcss";
   @import "@glw907/cairn-cms/cairn-public.css";
   @plugin "daisyui";

   @plugin "daisyui/theme" {
     name: "site";
     default: true;
     color-scheme: light;
     --color-base-100: oklch(98% 0 0);
     --color-base-content: oklch(25% 0 0);
     --color-primary: oklch(45% 0.1 248);
     /* every other daisyUI theme key */
   }
   ```

4. Run the checks in [Verify the theme](#verify-the-theme).

The engine's ink derivation in [Rebrand the status colors](#rebrand-the-status-colors) holds for a
hand-built theme, since it lives in `cairn-public.css`.

## Iterate locally

The scaffold's `/styleguide` route renders every directive in the registry, plus the
type scale and component recipes, against the current `theme.css`, so a theme change shows on one
page. A directive that declares a `preview` renders as a sample, and one without a `preview` is
listed by name. Vite hot module replacement applies a changed style sheet or component to the
running page without a manual reload.

`cairn-media-seed --from <url>` seeds Wrangler's local R2 state from a deployed site's media
library, so it has nothing to seed before a site's first deploy. The command downloads each row
of the site's media manifest from `<url>/media/` and ignores `assets.publicBase`, so it cannot seed
a site that mounts its media route elsewhere. The command is idempotent, since a re-run writes each key again from the
deployed library.

To see seeded media locally, follow these steps:

1. In the site directory, run `cairn-media-seed` against the deployed site's URL:

   ```bash
   npx cairn-media-seed --from https://your-site.com
   ```

2. In the site directory, start the dev server with the dev backend off, through `npx vite dev`
   without `CAIRN_DEV_BACKEND` or through `wrangler dev`.

   The scaffold's `npm run dev` sets `CAIRN_DEV_BACKEND=1`, whose handle serves `/media` from an
   in-memory fake bucket, so seeded objects do not appear under it.

The [`cairn-media-seed` reference](../reference/cli-cairn-media-seed.md) lists the command's flags
and exit codes.

## Chassis conventions

The following conventions govern a theme built on the chassis:

- A class carries its owner's prefix, such as `cairn-*` for the engine and the chassis or
  `site-*` for the theme's chrome.
- A width uses `max-w-measure`, `max-w-measure-wide`, or an arbitrary value, never a shadowed
  size such as `max-w-2xl`.
- A centered container uses `margin-inline: auto`, never the `margin: 0 auto` shorthand.
- A layout dimension uses rem units, never a fixed px value.
- A date renders through `formatDate` in the chassis's `date.ts`, the one date vocabulary for the
  archive and article surfaces.

A theme colors the `cairn-*` classes through tokens and never restyles their structure. The
`sg-*` classes belong to the styleguide route alone. An unprefixed class such as `.callout` is a
directive class from `markdown-components.ts`.

Five chassis spacing keys, such as `--spacing-2xl`, share suffixes with Tailwind's `--container-*`
keys, and Tailwind resolves `max-w-<key>` to the spacing variable. `max-w-2xl` therefore compiles
to `max-width: var(--spacing-2xl)`, about 4rem.

An unlayered rule in a site style sheet beats a Tailwind utility, which lives in
`@layer utilities`. A container class with the `margin: 0 auto` shorthand therefore cancels
`mt-*` and `mb-*` on the same element.

Waymark's `site.css` sets a fluid root font size that grows from 16px to 18px between about
1440px and 2200px. Rem-based layout scales with the root size on ultrawide screens.

Every archive and article date renders through `formatDate`, which is hard-coded to the `en-GB`
locale and Coordinated Universal Time (UTC), so a new format or locale is an edit to `date.ts`
alone.

## Verify the theme

The three public-scope audit rules ship in `cairn-audit`, which the scaffold's `check:cairn` script
runs at advisory tier on your site. The `theme-contrast` rule reads the site's import chain, so it
needs `daisyui` installed in the site.

To verify the theme, follow these steps:

1. In the site directory, run the three public rules:

   ```bash
   npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
   ```

2. In the report, confirm that none of the three rules raises a finding.

   `theme-contrast` measures text-bearing pairs against the
   [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/TR/WCAG22/) AA level of
   4.5:1, in sRGB and display-p3, in each scheme the theme defines. It measures the focus-ring
   color against 3:1, and it reports a value it cannot place as unmeasured instead of passing it.
   For what the rule does not measure, see
   [What theme-contrast doesn't cover](../reference/cairn-audit.md#what-theme-contrast-doesnt-cover).

   `theme-conformance` resolves each `var()` with no fallback against the declarations in the
   public scope and its import chain.

The cairn repository runs the same three rules over its example site in the
`check:public-tokens` gate, which a scaffolded site's `package.json` does not carry.

## Resolve an audit finding

The three public-scope rules read the files that the
[public scope section](../reference/cairn-audit.md#the-public-scope) of the audit reference lists.

To resolve a public-rule finding, follow these steps:

1. If the `public-literals` rule raises a finding, read that rule's row in the
   [static rules table](../reference/cairn-audit.md#the-static-rules).
2. If the contrast rule flags directive text or code highlighting after a fill change, retune any
   ink the daisyUI block overrides alongside its fill.
3. If the conformance rule reports one of the five `--cairn-cta-*` keys or
   `--cairn-caption-tracking` as unresolved, declare it in the theme.
4. If the finding persists, work through [Debug your site](debug-your-site.md).

## Next steps

The following pages continue from a themed site:

- [Configure rendering](configure-rendering.md) builds the components a theme styles.
- [Build the public routes](build-the-public-routes.md) wires the delivery routes the chassis
  feeds.
- [Configure media](configure-media.md) sets up the media storage that seeded images come from.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) configures `cairn-audit` for the
  whole site.
