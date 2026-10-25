# Theme your public site

The engine's part in a site's public styling is one sheet of defaults, `@glw907/cairn-cms/cairn-public.css`. Its roles sit in `@layer theme`, the lowest layer Tailwind declares. A value the site writes for one of those roles, unlayered in `:root` or in a daisyUI theme block, overrides the engine's default.

The setup command, `create-cairn-site`, scaffolds a site with Waymark as its theme. Waymark sits on the chassis. The chassis is a set of genre-free modules and style sheets that every scaffolded site carries. Both are files in the site's tree, and the engine's npm package carries neither. The site's `src/chassis/README.md` documents the chassis: a table of all but one of its files, its class prefixes, its override seams and their traps, and a dependents table for most of its files. In the admin, a theme reaches the editor's preview frame. That frame loads the style sheets the adapter's `editor.preview` member names, and no other site CSS.

Developers come to theming from four starting points, each with its entry section:

- A site built by hand in [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) has neither Waymark nor the chassis, and it starts at [Theme a hand-built site](#theme-a-hand-built-site).
- A scaffolded site that wants a brand's colors and type, with Waymark's layouts kept, starts at [Re-skin Waymark](#re-skin-waymark).
- A scaffolded site that moves a design already in hand onto the chassis, in Waymark's place, starts at [Port your theme onto the chassis](#port-your-theme-onto-the-chassis).
- A site with a finding from a public-scope `cairn-audit` rule starts at [Resolve an audit finding](#resolve-an-audit-finding).

A hand-built site adds the styling stack, then iterates locally, styles rendered markdown, and verifies. A scaffolded site starts the local loop and follows one recipe, the re-skin or the port. Both paths end at the same checks, the public-scope `cairn-audit` rules and the editor preview.

The steps assume working knowledge of Tailwind CSS v4 theme variables and cascade layers, daisyUI theme blocks, and Svelte components, and they don't explain those tools. The following pages and files cover the work next to theming:

- [Scaffolded site files](scaffolded-site-files.md) maps the files the setup command writes.
- The site's `src/chassis/README.md` holds the chassis tour, which this page names by path and doesn't repeat.
- [The public style sheet reference](../reference/public-css.md) lists each role the engine's sheet declares, with its default.
- The [`preview` entry](../reference/core.md#preview-adapter-editor-member) of the core reference gives the full `editor.preview` type and the `?url` rule.
- [Write a markdown component](write-a-markdown-component.md) builds the components a theme styles.
- [Build the public routes](build-the-public-routes.md) wires the delivery routes the chassis feeds.
- [Configure media](configure-media.md) covers the media library that seeded images come from.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) configures `cairn-audit` for the whole site.
- [Add a custom admin screen](add-a-custom-admin-screen.md#style-the-screen) covers the look of a custom admin screen.

## Before you begin

The steps assume the following:

- A site that the setup command scaffolded, or a SvelteKit site built by hand in [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- For seeded media in local development, a deployed site with a media library, which [Configure media](configure-media.md) sets up.

## Theme a hand-built site

A site built by hand adds Tailwind, daisyUI, and the engine's public style sheet. It links the sheet from a layout that wraps only the public routes, and names the same URL in the editor preview. See [the public style sheet reference](../reference/public-css.md) for each role the sheet declares.

The sheet's roles read daisyUI variables, such as `--color-base-content` and `--color-primary`. The sheet declares none of them and activates no daisyUI plugin. A hand-built site therefore installs daisyUI and supplies a theme block.

To add the styling stack, follow these steps:

1. In the site directory, install Tailwind CSS and daisyUI by following each vendor's guide.

   Leave out the Tailwind guide's static `import "../app.css"` in `src/routes/+layout.svelte`. That root layout also wraps `/admin`, and a static import breaks the preview frame's link to the sheet. Instead, a `(site)` group layout links the sheet through a `?url` import, as the steps to link the sheet show. See [Tailwind's SvelteKit guide](https://tailwindcss.com/docs/installation/framework-guides/sveltekit) and [daisyUI's installation guide](https://daisyui.com/docs/install/).

2. In `src/app.css`, import `tailwindcss` and then `@glw907/cairn-cms/cairn-public.css`, and then load daisyUI with `@plugin "daisyui"`.

   Import the engine sheet after Tailwind and before any sheet that styles rendered markdown. A later declaration in the site's `@theme` block then overrides the two colors the engine sheet declares in `@theme`, `--color-muted` and `--color-card-border`.

3. In the same file, add a `@plugin "daisyui/theme"` block with the site's role colors.

   The following `app.css` is illustrative, and its theme block elides most of daisyUI's keys:

   ```css
   /* app.css (illustrative) */
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
     /* the theme's other daisyUI keys */
   }
   ```

The scaffold links its sheets through `?url` imports from a layout that wraps the public routes and not `/admin`. A hand-built site follows the same shape. A static import of the sheet in a layout folds it into a layout CSS chunk. That chunk's basename differs between the client and server builds, so the URL the preview frame links returns a 404 error.

To link the sheet and point the preview at it, follow these steps:

1. In `src/routes`, move the public `[...path]` route, not `admin/[...path]`, into a `(site)` group directory.

   A group directory leaves its routes' URLs unchanged. For route groups, see [SvelteKit's advanced routing](https://svelte.dev/docs/kit/advanced-routing).

2. In `src/routes/(site)`, create a `+layout.svelte` that imports `../../app.css?url` and links it in `<svelte:head>`.
3. In `src/lib/cairn.config.ts`, import `../app.css?url` and name it in the `stylesheets` list of the adapter's `editor.preview` member.
4. Optional: In the same member, set `containerClass` to the class that wraps an entry on the public pages.

   With no `containerClass`, the preview renders the entry with no wrapper element.

The following `(site)` group layout is illustrative:

<!-- snippet-check-skip: an illustrative layout for a hand-built site -->
```svelte
<!-- src/routes/(site)/+layout.svelte (illustrative) -->
<script lang="ts">
  import appCss from '../../app.css?url';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="stylesheet" href={appCss} />
</svelte:head>

{@render children()}
```

The following excerpt shows a hand-built adapter with its `editor` member:

<!-- snippet-check-skip: an excerpt of a hand-built adapter module -->
```ts
// src/lib/cairn.config.ts (excerpt)
import appCss from '../app.css?url';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  editor: {
    preview: { stylesheets: [appCss] },
  },
});
```

See [the `preview` entry](../reference/core.md#preview-adapter-editor-member) for `bodyClass`, `byConcept`, and the full type.

Unless the theme block overrides a status ink, setting a status fill recolors its ink too. See [Rebrand the status colors](#rebrand-the-status-colors).

A hand-built site continues with [Iterate locally](#iterate-locally), [Style rendered markdown](#style-rendered-markdown), and [Verify the theme](#verify-the-theme). [Re-skin Waymark](#re-skin-waymark) and [Port your theme onto the chassis](#port-your-theme-onto-the-chassis) assume Waymark and the chassis.

## Iterate locally

Theme work runs in a local loop of seeded media, the dev server, and, on a scaffolded site, Waymark's style guide. Vite's hot module replacement applies a saved style sheet or component change to the running page without a reload.

To start the loop, follow these steps:

1. If the site is deployed with a media library, then in the site directory, run `cairn-media-seed --from` with the deployed site's URL:

   ```bash
   npx cairn-media-seed --from https://example.com
   ```

   The command downloads each object the committed media manifest lists and writes it into Wrangler's local R2 state. A re-run overwrites each key in place. See [the `cairn-media-seed` reference](../reference/cli-cairn-media-seed.md) for its flags, its download path, and its exit codes.

2. In the site directory, start the dev server in one of the following ways:

   - With seeded media, run `npx vite dev` with `CAIRN_DEV_BACKEND` unset.
   - With seeded media, run `npm run build` and then `wrangler dev`. Wrangler serves the last build, with no hot module replacement.
   - Without seeded media, run the scaffold's `npm run dev`. That script sets `CAIRN_DEV_BACKEND=1`, and the dev backend then serves `/media` from an in-memory fake bucket, where seeded objects don't appear.

3. On a scaffolded site, open `/styleguide` in the browser.

   The route renders the type scale, the component recipes, and a sample of each registered directive that declares a `preview`, against the current `theme.css`. A directive without one is listed by name.

## Re-skin Waymark

A re-skin keeps Waymark's layouts and changes its colors and type through the numbered recipe in the header comment of `src/theme/theme.css`. The following steps walk that recipe, in the light block and the dark block alike. The prose elements read the same role tokens as the chrome, so the article re-skins with no edit to `prose.css`.

To re-skin Waymark, follow these steps:

1. In both daisyUI blocks of `src/theme/theme.css`, rotate the hue of `--color-primary`, its third oklch value, and hold its lightness and chroma.

   Leave `--color-primary-content`, the text color on `--color-primary`, unchanged in both blocks.

2. In the same blocks, set the page background, `--color-base-100`, with its `-200` and `-300` steps, and the text color, `--color-base-content`.
3. Optional: In the same blocks, bring the secondary, accent, and neutral colors on-brand the same way as `--color-primary`.
4. Optional: In the site directory, install the Fontsource variable package for each new face.

   For the install, see [Fontsource's install guide](https://fontsource.org/docs/getting-started/install).

5. Optional: In `src/theme/theme.css`, import each new package's `index.css` directly after the chassis import.
6. Optional: In the `@theme` block of the same file, set `--font-display` and `--font-body` to the new faces.

   Each token names the family that Fontsource registers, `"<Name> Variable"`. A token that names a face with no installed and imported package falls through to `system-ui`, with no error.

7. Optional: In the same `@theme` block, tune the design scale, such as the `--text-step-*` type steps or the `--spacing-*` steps.
8. Optional: In both daisyUI blocks, change the three radius keys, `--radius-selector`, `--radius-field`, and `--radius-box`.
9. Optional: In `src/theme/components/ArticleView.svelte`, add a `data-flourish` attribute to the `<article class="prose">` element.

   The prose flourishes are off by default, and the attribute turns them on for the public pages. For the three flourishes, see [Style rendered markdown](#style-rendered-markdown). The flourishes don't show in the editor preview. When `containerClass` is set, the preview wraps the entry in one element that carries `containerClass` and no other attribute.

10. Optional: To bring the status colors on-brand, follow [Rebrand the status colors](#rebrand-the-status-colors).
11. Run the checks in [Verify the theme](#verify-the-theme).

    The scaffold's adapter already names `theme.css` and `site.css` in `editor.preview`. A re-skin leaves that member as it is.

### Rebrand the status colors

The engine derives each on-surface ink, `--cairn-<status>-ink`, from its fill. Unless a theme overrides an ink, retuning the fill retunes the ink. Waymark overrides each status ink, such as `--cairn-success-ink`, in both daisyUI blocks. A full status rebrand therefore sets one fill per status in each scheme, and on Waymark it also retunes each status ink beside its fill.

To rebrand the status colors, follow these steps:

1. In each daisyUI theme block, set the four status fills, `--color-info`, `--color-success`, `--color-warning`, and `--color-error`.
2. In each block that overrides a status ink, retune each `--cairn-<status>-ink` to its new fill, or delete the override so the ink follows the fill.

   An overridden ink left unchanged no longer matches its fill in directive text and code highlighting. For the formula, and for the fix when a derived ink fails on the theme's fills, see [Ink derivation](../reference/public-css.md#ink-derivation).

## Port your theme onto the chassis

A port replaces Waymark's style sheets, chrome components, and page compositions, and keeps `src/chassis/`. A theme's TypeScript and Svelte files reach the chassis through the `#chassis` subpath import, which the site's `package.json` maps to `./src/chassis/*`. A theme's style sheet uses a relative `@import` instead.

To port a theme onto the chassis, follow these steps:

1. In `src/chassis/README.md`, read the "What lives here" and "Every override seam" sections.
2. In the theme's style sheet, import the chassis `tokens.css` first, through a relative `@import`.

   `tokens.css` brings in Tailwind, the engine's `cairn-public.css`, and each design-scale key with a generic default.

3. In a later `@theme` block of the same sheet, redeclare the design-scale keys with the theme's values.
4. In the same sheet, declare the theme's light and dark `@plugin "daisyui/theme"` blocks with its role colors.

   The chassis declares no named daisyUI theme.

5. If the new chrome renders a daisyUI component beyond the button, badge, alert, and card, remove its key from the `exclude` list in `src/chassis/tokens.css`.

   The `exclude` list lives in the chassis because every theme on the chassis shares one component set.

6. If a theme file reads the `--cairn-cta-*` keys or `--cairn-caption-tracking`, declare each in the theme.

   Waymark's style guide panel and header read them. Neither the engine sheet nor `tokens.css` defaults these keys.

7. In the theme's style sheet, set the two heading keys: `--font-weight-heading` in `@theme`, and `--cairn-heading-case` in the unlayered `:root` rule.

   Both keys apply to the chrome's titles and to the `prose.css` headings.

8. In the page compositions, build each layout from the `composition.css` primitives.

   The primitives are `.cairn-card`, `.cairn-band`, `.cairn-section`, `.cairn-hero`, and `.cairn-sidebar-layout`. The same file declares the page frame, `.cairn-site-shell` and `.cairn-site-main`. Each primitive exposes `--cairn-*` custom properties for a per-instance override, such as `--cairn-card-padding`, or `--cairn-sidebar-width` on `.cairn-sidebar-layout`.

   Some chassis spacing keys shadow Tailwind's `max-w-*` sizes, so `max-w-2xl` compiles to about 4rem. For a width, use `max-w-measure`, `max-w-measure-wide`, or an arbitrary value. An unlayered `margin: 0 auto` overrides a Tailwind `mt-*` or `mb-*` utility on the same element. Center a container with `margin-inline: auto` instead.

9. In the new chrome, include a skip link, an `sr-only` anchor to `#main`, and its target, `<main id="main" tabindex="-1">`.

   The anchor becomes visible on focus with `focus:not-sr-only focus:absolute`. The target can take focus, so activating the link moves keyboard focus as well as the scroll position.

10. In the new chrome, build the theme toggle on the chassis's `theme-toggle.ts` functions, passing each the config in `src/theme/theme-names.ts`.

    The module exports functions, not a component. Waymark's `SiteHeader.svelte` builds its button on `resolveTheme` and `toggleThemeWithTransition`. With no `data-theme` set, `resolveTheme` reads the root's computed `color-scheme`. A dark-first theme then resolves dark with no edit to the page shell.

    If you rename the daisyUI themes, change `theme-names.ts`, the no-flash script in `src/app.html`, and the block names and the `:root[data-theme="cairn-dark"]` selector in `theme.css` together. `theme-names.test.ts` fails when the names, the script, or the block names drift, and it doesn't read the selector.

11. If the port adds or renames a compiled style sheet, then in `src/theme/cairn.config.ts`, name its `?url` import in the `stylesheets` list of `editor.preview`.

    See [the `preview` entry](../reference/core.md#preview-adapter-editor-member) for `containerClass` and the `?url` rule.

12. Before you delete a chassis file, read its row, if it has one, in the dependents table under "Subtracting an element" in `src/chassis/README.md`.

    For example, `feed.ts` goes with its two feed routes. Six delivery routes import `content.ts`, and so do the chassis's `feed.ts`, `public-routes.ts`, and `entry-data.ts`. Removing `content.ts` therefore means replacing those imports in the same change.

13. Read [Style rendered markdown](#style-rendered-markdown), then run the checks in [Verify the theme](#verify-the-theme).

## Style rendered markdown

Each part of a rendered entry takes its styles from one source, as follows:

- On a scaffolded site, `ArticleView.svelte` wraps each entry in `<article class="prose">`, and `prose.css` styles the elements inside it from the role tokens.
- A directive's markup carries an unprefixed class, such as `.callout`, from the theme's `markdown-components.ts`. The theme styles that class and may rename it.
- The engine's `cairn-public.css` styles `pre.shiki` and the `.cairn-tok-*` classes in `@layer components`, from the `--cairn-code-*` roles. On any site, a theme recolors code by setting those roles.

On a scaffolded site, `prose.css` keeps the cairn-glyph rule, the diamond bullet, and the margin-hanging pull quote behind `.prose[data-flourish]`, so the three flourishes are off by default.

To turn the flourishes on, follow this step:

- On a scaffolded site, add a `data-flourish` attribute to the theme's `.prose` root.

## Verify the theme

The theme passes when the public-scope rules raise no finding and the editor preview renders an entry in the theme's styles. The three public-scope rules, `public-literals`, `theme-conformance`, and `theme-contrast`, ship in `cairn-audit`. The three rules are advisory. A finding doesn't change the exit code unless the run passes `--fail-on advisory`. `theme-contrast` reads the site's import chain and needs `daisyui` installed in the site.

To verify the theme, run these checks in order:

1. In the site directory, run the public-scope rules by name.

   A run of public rules alone needs no built admin style sheet. The following command runs the three rules:

   ```bash
   npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
   ```

2. In the report, confirm that the public rules raise no finding.

   In a clean `theme-contrast` result, each pair the rule measures meets Web Content Accessibility Guidelines (WCAG) AA at 4.5:1, and the focus ring meets 3:1. Both hold in sRGB and display-p3, in each scheme the theme defines. A value the rule can't resolve or place is reported as unmeasured and doesn't count as a pass. For the contrast floor, see [the WCAG contrast minimum criterion](https://www.w3.org/TR/WCAG22/#contrast-minimum). For the values the rule reports as unmeasured, see [What theme-contrast doesn't cover](../reference/cairn-audit.md#what-theme-contrast-doesnt-cover).

3. In the site directory, start the dev server with `CAIRN_DEV_BACKEND=1` set.

   On a scaffolded site, `npm run dev` sets it. The dev backend opens `/admin` signed in as an owner, with no sign-in email.

4. In the admin, open an entry in the editor.
5. In the preview, confirm that the entry renders in the theme's styles, with the `--color-base-100` background of the scheme that matches the operating system's setting.

If a check fails, see [Resolve an audit finding](#resolve-an-audit-finding).

## Resolve an audit finding

The following table matches a failed check from [Verify the theme](#verify-the-theme) to its cause and its fix.

| Symptom | Cause | Fix |
|---|---|---|
| After a fill change, `theme-contrast` flags a status ink on its callout tint. | The theme overrides that status's ink. The callout tint mixes from the new fill, and the unchanged ink no longer clears 4.5:1 on it. | Retune the ink beside its fill, or delete the override so the derived ink follows. |
| `theme-conformance` reports that a `--cairn-cta-*` key or `--cairn-caption-tracking` resolves to nothing. | A theme file reads the key, and nothing in the import chain defines it. Neither the engine sheet nor `tokens.css` defaults these keys. | Declare the key in the theme. |
| The editor preview shows unstyled markup under a hint that the adapter's preview option names no style sheets. | The adapter sets no `editor.preview`. | Name the site's sheet in the `stylesheets` list of `editor.preview`, as [Theme a hand-built site](#theme-a-hand-built-site) shows. |
| On the deployed site, the editor preview is unstyled, and its style sheet request returns a 404 error. | A layout also imports the sheet statically, so the URL the frame links names a file the client build doesn't serve. | Remove the static import, and keep the `?url` import in the layout and in the adapter. |

See [The static rules](../reference/cairn-audit.md#the-static-rules) for what each public rule reads and where a literal is legal.

## See also

The following pages cover the work around a theme:

- [Scaffolded site files](scaffolded-site-files.md) maps the files the setup command writes.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) configures `cairn-audit` for the whole site.
- [Write a markdown component](write-a-markdown-component.md) builds the components a theme styles.
- [Configure media](configure-media.md) covers the media library that seeded images come from.
- [The public style sheet reference](../reference/public-css.md) lists each role the engine's sheet declares, with its default.
- [The `cairn-audit` reference](../reference/cairn-audit.md) documents the public rules and the public scope.
