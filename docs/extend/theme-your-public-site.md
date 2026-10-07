# Theme your public site

cairn styles its admin in daisyUI and Tailwind and leaves a site's public pages design-agnostic,
since each site brings the `render` function and the styles those pages use. The engine's part in
public styling is a sheet of defaults, `cairn-public.css`, whose roles sit in `@layer theme`, the
lowest layer Tailwind declares, so a value the site writes for any of those roles overrides the
engine's default. In the admin, a theme reaches the editor's preview frame, which
renders an entry through the same `render` function as the public pages but loads only the style
sheets the site's adapter names.

The setup command, `create-cairn-site`, gives a new site a complete starting design in Waymark,
cairn's public reading template, wired into a chassis of design-neutral modules and style sheets
that every scaffolded site shares. Because both arrive as files in the site's tree and the npm
package ships neither, no engine version governs the site's chrome, page compositions, or token values; only the role defaults in `cairn-public.css` come from the package. The site's look is a set of
token values that Waymark declares over roles the engine defaults, so owning the design is a matter
of how far a change reaches.

A developer who wants a scaffolded site in a brand's colors and type, with Waymark's layouts kept,
re-skins it by changing about fourteen color and type values, which suits a site whose content
those layouts already fit. A developer with a design the site already has ports it onto the same
chassis in Waymark's place. A site built by hand from `sv create`, as in
[Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md), starts with neither Waymark nor
the chassis and brings its own theme, so after the preconditions its work begins at
[Theme a hand-built site](#theme-a-hand-built-site). A scaffolded site skips that section and works
through the chassis boundary, the token tiers, the local loop, and one of the two recipes. The
recipe leads into styling rendered markdown and the editor preview, then verifying the theme and
resolving any audit finding. Both recipes end at the same check, the three public-scope rules that
`cairn-audit` ships, which include a check for a color or font size written as a literal and a contrast measurement of the theme's text colors against their backgrounds. A developer who arrives with a finding from
one of those rules starts at [Resolve an audit finding](#resolve-an-audit-finding).

Theming takes working knowledge of Tailwind CSS v4 theme variables and cascade layers, daisyUI
theme blocks, and Svelte components.

The following pages cover the work next to theming:

- [Scaffolded site files](scaffolded-site-files.md) maps every file the setup command writes.
- [Configure rendering](configure-rendering.md) builds the components a theme styles.
- [Build the public routes](build-the-public-routes.md) wires the delivery routes the chassis feeds.
- [Configure media](configure-media.md) sets up the media storage and the media route.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) configures `cairn-audit` for the
  whole site.
- [Style the screen](add-a-custom-admin-screen.md#style-the-screen) in Add a custom admin screen
  covers the look of a custom admin screen.

## Before you begin

The steps assume the following:

- A site that `create-cairn-site` scaffolded, or a SvelteKit site that
  [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) produces.
- For seeded media in local development, a deployed site with a media library, which
  [Configure media](configure-media.md) sets up.

## Theme a hand-built site

A site built without the setup command first adds Tailwind, daisyUI, and the engine's public style
sheet, and then follows only the later sections that apply to a site with no chassis. The engine
ships its public defaults as one CSS asset, `@glw907/cairn-cms/cairn-public.css`, which
[the public style sheet reference](../reference/public-css.md) documents key by key. The sheet
declares no daisyUI theme variable and activates no daisyUI plugin, yet its roles read daisyUI
roles such as `--color-base-content` and `--color-primary`.

To add the styling stack, follow these steps:

1. In the site directory, install Tailwind CSS and daisyUI by following
   [Tailwind's SvelteKit guide](https://tailwindcss.com/docs/installation/framework-guides/sveltekit)
   and [daisyUI's installation guide](https://daisyui.com/docs/install/).
2. In the site's global style sheet, import `@glw907/cairn-cms/cairn-public.css` once, after
   `@import "tailwindcss"` and before the style sheet that styles rendered markdown.

   That order lets a later declaration in the site's `@theme` block win over the sheet's two
   `@theme` colors, `--color-muted` and `--color-card-border`.

3. In the same style sheet, add a `@plugin "daisyui/theme"` block with the site's role colors.

   The following style sheet is illustrative, and its theme block elides most of daisyUI's keys:

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

The following later sections apply to a hand-built site, in the part each item names:

- [Token tiers and cascade order](#token-tiers-and-cascade-order) applies in its role rule, which
  states which declaration of a role wins.
- [Iterate locally](#iterate-locally) applies in its first two steps, which seed media and start
  the dev server with the dev backend off.
- [Rebrand the status colors](#rebrand-the-status-colors) applies in its ink derivation, so each
  status costs one fill per scheme unless the site's theme overrides its ink.
- [Style rendered markdown](#style-rendered-markdown) applies in its code-highlight paragraph,
  since those rules live in the engine sheet.
- [Style the editor preview](#style-the-editor-preview) applies whole, with the site's adapter file
  in place of the scaffold's.
- [Verify the theme](#verify-the-theme) applies whole.
- [Resolve an audit finding](#resolve-an-audit-finding) applies except its third check, since only
  Waymark's styleguide panel and header navigation read the six keys that check names.

The chassis boundary, the rest of both recipes, the chassis conventions, the flourish edit, and the
`/styleguide` step are the scaffold's alone, since each assumes the chassis or Waymark.

## The chassis boundary

A re-skin or a port works on the theme's side of a boundary the scaffold draws, since
`src/chassis/` holds the modules every scaffolded site shares regardless of design, and everything
outside it belongs to Waymark. The chassis holds one concern per file, from content indexing in
`content.ts` and dates in `date.ts` to the theme toggle in `theme-toggle.ts`, the token system in
`tokens.css`, and the reading and composition CSS in `prose.css` and `composition.css`. Waymark's
side holds the adapter config, the chrome components, the color and type values, and the page
compositions. The setup command copies the chassis and Waymark into the site's tree and the npm
package ships neither, so an engine upgrade leaves these files unchanged.

A re-skin edits no chassis file, and a port edits one only where a step or a convention in
[Port your own theme onto the chassis](#port-your-own-theme-onto-the-chassis) names the edit. Both
recipes still read the engine's roles from `cairn-public.css`, and
[Token tiers and cascade order](#token-tiers-and-cascade-order) states which declaration of a role
wins.

## Token tiers and cascade order

Waymark's `theme.css` names three token tiers by how far a re-skin reaches, and two orders decide
which declaration of a key wins, source order for a design-scale key and layer order for a role.
The tiers group the theme's tokens as follows:

- Tier 1 is the two daisyUI theme blocks.
- Tier 2 is the on-surface inks, the elevation pair (`--color-card-border` and `--cairn-shadow`),
  the call-to-action (CTA) pair (`--cairn-cta-*`), and the code-highlight binding.
- Tier 3 is the design-scale keys that override the chassis defaults.

`tokens.css` declares the design-scale keys, among them the `--font-*`, `--text-step-*`, and
`--spacing-*` families a re-skin retunes and `--font-weight-heading`, each with a generic default.
The engine's roles, such as the status inks, the shadow, and the focus ring, come from its
`cairn-public.css`, which `tokens.css` imports right after Tailwind. That sheet also declares two
`@theme` colors, `--color-muted` and `--color-card-border`. The scaffold's `theme.css` and
`site.css` carry the theme's tokens and page styling, layered over those two lower sources.

The two orders work as follows:

- A design-scale key resolves by source order, so the theme's redeclaration in a later `@theme`
  block overrides the default `tokens.css` declares.
- A role resolves by layer, so the same key written unlayered in `:root` or in a daisyUI theme
  block overrides the engine's default.

The engine declares its roles in `@layer theme`, the lowest layer Tailwind declares, on the
selector `:root, [data-theme]`, so a role recomputes inside a nested theme region.

Two keys govern every heading, `--font-weight-heading` for its weight and `--cairn-heading-case`
for its case, which defaults to `none`. Chrome markup applies them with the `font-heading` and
`heading-case` utilities, and a scoped `<style>` rule reads the two variables directly.
`prose.css` headings and the hero title read the same keys, so a theme that sets
`--cairn-heading-case: uppercase` uppercases every heading.

[Roles](../reference/public-css.md#roles) in the public style sheet reference lists every role with
its default, and [Site-owned tokens](../reference/public-css.md#site-owned-tokens) lists the six
keys a theme on the chassis defines that nothing defaults.

## Iterate locally

The local loop is the dev server with `/styleguide` open. That route renders every registered
directive, the type scale, and the component recipes against the current `theme.css`. Vite's hot
module replacement shows each saved change there without a reload.

To start the loop, follow these steps:

1. If the site is deployed with a media library, then in the site directory, seed Wrangler's local
   R2 state from that library with `cairn-media-seed`:

   ```bash
   npx cairn-media-seed --from https://your-site.com
   ```

   The command is idempotent, since a re-run writes each key again from the deployed library.

2. In the site directory, start the dev server. If you seeded media, run `npx vite dev` without
   `CAIRN_DEV_BACKEND`, or run `wrangler dev`. Otherwise, run `npm run dev`.

   The scaffold's `npm run dev` sets `CAIRN_DEV_BACKEND=1`, whose handle serves `/media` from an
   in-memory fake bucket, so seeded objects don't appear under it. Without the dev backend, the
   scaffold's hooks mount the engine's auth guard, which redirects an `/admin` request with no
   session to the sign-in page.

3. In the browser, open `/styleguide`, where a directive that declares a `preview` renders as a
   sample and one without is listed by name.

The [`cairn-media-seed` reference](../reference/cli-cairn-media-seed.md) lists the command's flags,
its download path, and its exit codes.

## Re-skin Waymark

A re-skin keeps Waymark's layouts and edits about fourteen values, light and dark, in
`src/theme/theme.css`, and `prose.css` follows with no extra edit because it reads the same role
tokens. Waymark is the reference theme a re-skin starts from, and the following excerpt shows five
of the recipe's keys in its light block:

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
3. Optionally, to swap the display or body face, follow these steps:

   1. In the site directory, install the new face's Fontsource variable package.
   2. In `src/theme/theme.css`, replace the old face's `@import` under the chassis import with the
      new package's `index.css`.
   3. In the `@theme` block of the same file, set `--font-display` or `--font-body` to the family
      that Fontsource registers, `"<Name> Variable"`.

   A token that names a face with no imported package falls through to the next family in its
   stack, `system-ui`, with no error.

4. Optionally, in the `@theme` block of `src/theme/theme.css`, retune one type ratio or
   space-scale step.
5. Optionally, in `ArticleView.svelte` under `src/theme/components/`, add a `data-flourish`
   attribute to the `<article class="prose">` element.

   The attribute turns on the three prose flourishes that Waymark ships off, which
   [Style rendered markdown](#style-rendered-markdown) names.

6. Optionally, to rebrand the status colors, follow
   [Rebrand the status colors](#rebrand-the-status-colors).
7. Run the checks in [Verify the theme](#verify-the-theme).

   A re-skin skips [Style the editor preview](#style-the-editor-preview), since the scaffold
   already sets the adapter's `preview` member to the theme's style sheets.

### Rebrand the status colors

A full status-color rebrand costs one fill per status in each scheme, because the engine derives
each on-surface ink from its fill at 50 percent, unless a theme overrides the ink. Waymark
overrides all four inks in both daisyUI blocks, so a Waymark rebrand retunes each ink with its fill
or deletes the override.

To rebrand the status colors in Waymark, follow these steps:

1. In both daisyUI blocks, set the fill for each status, `--color-info`, `--color-success`,
   `--color-warning`, and `--color-error`.
2. In the same two blocks, retune each status ink, such as `--cairn-success-ink`, to its new fill,
   or delete its override.

An overridden ink left unchanged no longer matches its fill in directive text and code
highlighting. [Ink derivation](../reference/public-css.md#ink-derivation) in the public style sheet
reference gives the formula, and the fix when a derived ink fails on the theme's fills.

With the status colors rebranded, return to [Re-skin Waymark](#re-skin-waymark) and run the checks
in [Verify the theme](#verify-the-theme).

## Port your own theme onto the chassis

A port replaces Waymark's style sheets, chrome components, and page compositions with the new
theme's, and keeps `src/chassis/`. The port reaches the chassis through its exported seams. It
edits or deletes a chassis file only where a step or a convention names the edit. A design the
site already has takes this recipe in place of the re-skin, whose steps assume Waymark's layouts.

A theme file imports from the chassis only through the `#chassis` subpath import in TypeScript and Svelte,
or through a relative `@import` in CSS. The cairn repository gates that boundary on its example
site with `check:chassis-boundary`, and a scaffolded site inherits it as a convention with no gate.

A chassis file is safe to delete only when everything that depends on it changes in the same
edit. `feed.ts` has two dependents, the two feed routes, so it deletes along with them and nothing
else changes. `content.ts` supplies six delivery routes, so dropping it means replacing all six
routes' imports in the same change.

To check a deletion, follow this step:

- In `src/chassis/README.md`, read the dependents table for the chassis file before you delete it.

To port a theme onto the chassis, follow these steps:

1. In the theme's style sheet, import `tokens.css` first.
2. In a later `@theme` block in the same sheet, redeclare the design-scale keys with the theme's
   values, `--font-weight-heading` among them.
3. In the same sheet, replace the two daisyUI theme blocks with the new theme's role colors.
4. If the new chrome renders a daisyUI component outside the chassis's four, then in `tokens.css`,
   remove that component's key from the `exclude` list.

   The chassis's `tokens.css` activates the daisyUI plugin with only the button, badge, alert, and
   card, a component set every theme on the chassis shares.

5. In the theme's style sheet, declare the five `--cairn-cta-*` keys for each scheme and
   `--cairn-caption-tracking`.

   Neither the engine sheet nor `tokens.css` defaults any of the six.
   [Placement of a per-scheme value](../reference/public-css.md#placement-of-a-per-scheme-value) in
   the public style sheet reference states where a per-scheme value goes.

6. In the theme's unlayered `:root` rule, set `--cairn-heading-case` to the theme's heading case.
7. In the page compositions, build each layout from the `composition.css` primitives,
   `.cairn-card`, `.cairn-band`, `.cairn-section`, `.cairn-hero`, and `.cairn-sidebar-layout`.

   Each primitive exposes `--cairn-<primitive>-*` custom properties, such as
   `--cairn-card-padding`, for a per-instance override. Read
   [Chassis conventions](#chassis-conventions) before you add a class or layout rule.

8. In the new chrome, keep a skip link, an `sr-only` anchor to `#main` made visible on focus with
   `focus:not-sr-only focus:absolute`.

   `<main id="main" tabindex="-1">` makes the target focusable, so activating the link moves
   keyboard focus and not only the scroll position. That focus is programmatic, so `main:focus`
   draws no ring.

9. In the new chrome, mount a theme toggle on the chassis's `theme-toggle.ts`, configured from
   `theme-names.ts`.

   `theme-names.ts` holds the two theme names, the cookie name, and the toggle's config. The
   toggle's `resolveTheme` returns the live `data-theme` when it names one of the two themes.
   Otherwise it reads the root's computed `color-scheme`, so a dark-first theme resolves dark on a
   light OS with no edit to the page shell.

10. If you rename the daisyUI themes, edit `theme-names.ts`, the no-flash script in `src/app.html`,
    and the two `@plugin "daisyui/theme"` names in `theme.css` together.

    The no-flash script hard-codes the theme cookie, `cairn-site-theme`, and both theme names, and
    `theme-names.test.ts` fails when the three places drift.

11. Continue with [Style rendered markdown](#style-rendered-markdown) and
    [Style the editor preview](#style-the-editor-preview), which hold the port's remaining work,
    and then run the checks in [Verify the theme](#verify-the-theme).

### Chassis conventions

Every class and layout rule a port adds follows the conventions in the following table, each beside
its reason:

| Convention | Reason |
|---|---|
| A class carries its owner's prefix, `cairn-*` for the engine and the chassis, `site-*` for the theme's chrome, and `sg-*` for the styleguide route alone. | A theme colors a `cairn-*` class through tokens and never restyles its structure. |
| A width uses `max-w-measure`, `max-w-measure-wide`, or an arbitrary value, never a size such as `max-w-2xl`. | Five chassis spacing keys share suffixes with Tailwind's `--container-*` keys, so `max-w-2xl` compiles to `max-width: var(--spacing-2xl)`, about 4rem. |
| A centered container uses `margin-inline: auto`, never the `margin: 0 auto` shorthand. | An unlayered rule in a site style sheet beats a Tailwind utility in `@layer utilities`, so the shorthand cancels `mt-*` and `mb-*` on the same element. |
| A layout dimension uses rem units, never a fixed px value. | Waymark's `site.css` grows the root font size from 16px to 18px between about 1440px and 2200px, and rem-based layout scales with it. |

Every archive and article date renders through `formatDate` in the chassis's `date.ts`, which is
hard-coded to the `en-GB` locale and Coordinated Universal Time (UTC). A new format or locale is an
edit to that file alone.

## Style rendered markdown

A re-skin restyles every entry body with no edit to `prose.css`, which binds each element to the
daisyUI roles and the cairn tokens. A port that keeps `prose.css` edits only the directive classes
its `markdown-components.ts` owns, and either recipe may turn on the three flourishes that Waymark
ships off.

A directive's markup carries an unprefixed class from the theme's `markdown-components.ts`, such as
`.callout`, which the theme styles and may rename.

Code highlighting is the Tier 2 binding that Waymark's `theme.css` lists beside the on-surface
inks. Its rules for `pre.shiki` and the six `.cairn-tok-*` classes sit in the engine's
`cairn-public.css` in `@layer components` and read their colors from the engine's roles, so a theme
recolors code by setting those roles in its theme blocks.

`prose.css` keeps three decorative styles, the cairn-glyph rule, the diamond bullet, and the
margin-hanging pull quote, behind `.prose[data-flourish]`, so they are off by default.

To turn the three styles on, follow this step:

- On the theme's `.prose` root, which for Waymark is the `<article class="prose">` in
  `ArticleView.svelte`, add a `data-flourish` attribute.

A re-skin returns from here to [Re-skin Waymark](#re-skin-waymark) at its status-rebrand option. A
port continues with [Style the editor preview](#style-the-editor-preview), where the admin's
preview frame shows the same rendered markdown.

## Style the editor preview

A scaffolded site's adapter already points the admin's preview frame at `theme.css` and
`site.css`, so a re-skin changes nothing here. A port that adds or renames a compiled style sheet,
or changes the classes that wrap an entry, updates the adapter's `preview` member. A hand-built
site adds the member. The frame loads none of the site's CSS, so with no `preview` set it renders
unstyled markup behind a hint that says so.

The scaffold sets the following value in `src/theme/cairn.config.ts`, the shape a port keeps or
edits and a hand-built site adds to its adapter:

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

To set the preview in a port or a hand-built site, follow these steps:

1. In `src/theme/cairn.config.ts`, or the hand-built site's adapter file, import each compiled
   style sheet the public pages load through a Vite `?url` import.

   A plain side-effect import such as `import './theme.css'` folds the sheet into a layout CSS
   chunk whose basename differs between the client and server builds. The frame would then link a
   URL that returns a 404 error in the browser.

2. In the adapter's `editor` group, set the `preview` member's `stylesheets` to those URLs.
3. In the same member, set `containerClass` to the classes that wrap an entry on the public site,
   which for the scaffold is `'site-main prose'`.

   The public site puts the two classes on separate elements, the `(site)` layout's `<main>` and
   the `<article>` in `ArticleView.svelte`, while the frame renders one wrapper element.

The [`preview` entry](../reference/core.md#preview-adapter-editor-member) of the core reference
states the other two members, `bodyClass` and `byConcept`, with the full type.

The last two checks in [Verify the theme](#verify-the-theme) read this frame. The frame paints its
body with `var(--color-base-100,#fff)`, so the preview background follows the site's `base-100`
once the style sheet loads and falls back to white without one. Its `<html>` carries no
`data-theme`, so only the OS color scheme reaches it. The document's root carries
`data-cairn-preview`, the hook a site's style sheet selects on to suppress entrance animations such
as `[data-rise]` inside the frame. Every link click in the frame is inert.

## Verify the theme

The theme passes when the three public-scope rules, `public-literals`, `theme-conformance`, and
`theme-contrast`, raise no finding on the site and the editor preview renders an entry in the
theme's styles. The three rules ship in `cairn-audit`, which the scaffold's `check:cairn` script
runs at advisory tier on your site. The cairn repository gates its example site on the same three
rules as `check:public-tokens`, a script that a scaffolded `package.json` doesn't carry. The
`theme-contrast` rule reads the site's real import chain, so it needs `daisyui` installed in the
site.

To verify the theme, follow these steps:

1. In the site directory, run the three public rules:

   ```bash
   npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
   ```

2. In the report, confirm that none of the three rules raises a finding.

   A clean `theme-contrast` result means that each pair the rule measures meets
   [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/TR/WCAG22/) AA at 4.5:1, and
   the focus ring 3:1, in sRGB and display-p3 and in each scheme the theme defines. A value the
   rule cannot place is reported as unmeasured, never passed. The `theme-contrast` row of
   [The static rules](../reference/cairn-audit.md#the-static-rules) names the pairs and the color
   spaces, and
   [What theme-contrast doesn't cover](../reference/cairn-audit.md#what-theme-contrast-doesnt-cover)
   lists the values it reports as unmeasured.

3. If the dev server runs without the dev backend, restart it with `npm run dev`.

   The dev backend mints an owner editor on `/admin`, so the admin opens with no sign-in.

4. In the admin, open an entry in the editor.
5. In the preview, confirm that the entry renders in the theme's styles in your OS color scheme,
   with its background following `base-100`.

## Resolve an audit finding

Each public rule has one check in the following list, and each check names the edit or the
reference row that resolves its finding. The three rules read the files that
[The public scope](../reference/cairn-audit.md#the-public-scope) in the audit reference lists.

To resolve a public-rule finding, work through the following checks in order:

1. If `public-literals` raises a finding, read its row in
   [The static rules](../reference/cairn-audit.md#the-static-rules) for what the rule reads and
   where a literal is legal.
2. If `theme-contrast` flags directive text or code highlighting after a fill change, retune the
   overridden ink to its fill, or delete the override.

   If a derived ink fails on the theme's fills, apply the fix in
   [Ink derivation](../reference/public-css.md#ink-derivation).

3. If `theme-conformance` reports one of the five `--cairn-cta-*` keys or `--cairn-caption-tracking`
   as unresolved, declare it in the theme.

   The rule's row in [The static rules](../reference/cairn-audit.md#the-static-rules) states how it
   resolves a custom property reference.

4. If a finding persists, see [Run cairn-audit on your site](run-cairn-audit-on-your-site.md).

## See also

The following pages cover the work around a theme:

- [Configure rendering](configure-rendering.md) builds the components a theme styles.
- [Build the public routes](build-the-public-routes.md) wires the delivery routes the chassis feeds.
- [Configure media](configure-media.md) sets up the media storage that seeded images come from.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) configures `cairn-audit` for the
  whole site.
- [Scaffolded site files](scaffolded-site-files.md) maps every file the setup command writes.
- [The public style sheet reference](../reference/public-css.md) lists every key the engine's sheet
  declares, with its default.
- [The `cairn-audit` reference](../reference/cairn-audit.md) documents the three public rules and
  the public scope.
