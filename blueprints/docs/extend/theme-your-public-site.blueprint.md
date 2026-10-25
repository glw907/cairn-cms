---
page: Theme your public site
type: task guide
---

# Theme your public site

:::reader
**Who reads it.** A Svelte-fluent web developer who owns the design of an organization's cairn site. Readers arrive from different starting points, and the introduction names each so a reader learns early which sections are theirs. :fact[rxj43c]

**Why they arrive:**
- They built the site by hand in the add-cairn tutorial and want to style its pages. The site has no Waymark and no chassis. They arrive at [Theme a hand-built site](#theme-a-hand-built-site). :fact[rxj43c]
- They scaffolded a site and want it in a brand's colors and type, with Waymark's layouts kept. :fact[f6k5cs]
- They have a design already and want it on the chassis in Waymark's place. :fact[s4prb0] :fact[lwrqfd]

**What they already know.** Tailwind CSS v4 theme variables and cascade layers, daisyUI theme blocks, and Svelte components. The page doesn't explain them.

**Background.** The engine's part in public styling is one sheet of defaults, `@glw907/cairn-cms/cairn-public.css`. :fact[c4nnu9]
Its roles sit in `@layer theme`, the lowest layer Tailwind declares. A value the site writes for a role, unlayered in `:root` or in a daisyUI theme block, overrides the engine's default. :fact[hva8r5]
A scaffolded site ships Waymark, cairn's public reading template, wired into the chassis. Both arrive as files in the site's tree, and the npm package ships neither. :fact[rxj43c]
The site's `src/chassis/README.md` documents the chassis: its files, the class prefixes, the override seams and their traps, and each file's dependents. :fact[6oqyfi]
In the admin, a theme reaches the editor's preview frame. The frame loads the sheets the adapter's `editor.preview` names, and no other site CSS. :fact[gnn3pv]

**What the page does for them.** The introduction opens on that model: one engine sheet in the lowest layer, and a scaffold whose theme and chassis are the site's files. :fact[hva8r5] :fact[rxj43c]
The contract sentence follows. A hand-built reader adds the styling stack, then iterates locally and verifies. A reader holding an audit finding starts at [Resolve an audit finding](#resolve-an-audit-finding). A scaffolded reader starts the local loop and follows one recipe, the re-skin or the port. Each path ends at the same checks: the public-scope `cairn-audit` rules and the editor preview.

**What it leaves to other pages, each named in the introduction:**
- Scaffolded site files maps the files the setup command writes.
- The site's `src/chassis/README.md` holds the chassis tour, which the page names by path and doesn't repeat.
- The public style sheet reference lists each role the engine's sheet declares, with its default.
- The core reference's `preview` entry gives the full `editor.preview` type and the `?url` rule.
- Write a markdown component builds the components a theme styles.
- Build the public routes wires the delivery routes the chassis feeds.
- Configure media sets up the media storage that seeded images come from.
- Run cairn-audit on your site configures `cairn-audit` for the whole site.
- Style the screen, in Add a custom admin screen, covers the look of a custom admin screen.
:::

:::constraints
- Call the scaffold's theme Waymark and its shared layer the chassis. Call the import seam the `#chassis` subpath import. :fact[lwrqfd]
- Give each chassis trap one line, at the step that meets it, and leave the rest of the chassis tour to `src/chassis/README.md`. :fact[6oqyfi]
- Name no script from the engine repository, such as `check:public-tokens` or `check:chassis-boundary`, as a check the reader runs. A scaffolded `package.json` carries neither. :fact[lwrqfd] :fact[xv2ien]
- Give the re-skin no count of values. Walk the numbered edits of the recipe comment in `src/theme/theme.css` instead. :fact[f6k5cs]
- Give a vendor's install steps, for Tailwind, daisyUI, and Fontsource, as links, never as copied commands.
- Frame each code example as illustrative or as an excerpt of the scaffold.
:::

## Before you begin

*Names what the steps assume and where each starting point comes from.*

- The steps assume the following:
- A site that `create-cairn-site` scaffolded, or a SvelteKit site built by hand in [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md). :fact[rxj43c]
- For seeded media in local development, a deployed site with a media library, which [Configure media](configure-media.md) sets up. :fact[7pv6se]

## Theme a hand-built site

*Walks a reader whose site has no Waymark and no chassis through adding the styling stack, linking it, and pointing the editor preview at it.*

- The engine ships its public defaults as one style sheet, `@glw907/cairn-cms/cairn-public.css`. :fact[c4nnu9]
- See [the public style sheet reference](../reference/public-css.md) for each key it declares.
- The sheet declares no daisyUI theme variable and activates no daisyUI plugin, yet its roles read daisyUI roles such as `--color-base-content` and `--color-primary`. A hand-built site therefore installs daisyUI and supplies a theme block. :fact[f28x0x]
- To add the styling stack, follow these steps:
1. In the site directory, install Tailwind CSS and daisyUI by following each vendor's guide. :fact[f28x0x]
- See [Tailwind's SvelteKit guide](https://tailwindcss.com/docs/installation/framework-guides/sveltekit).
- See [daisyUI's installation guide](https://daisyui.com/docs/install/).
2. In `src/app.css`, import `tailwindcss`, then `@glw907/cairn-cms/cairn-public.css`, then the daisyUI plugin. :fact[f28x0x]
- Import the engine sheet after Tailwind and before any sheet that styles rendered markdown. A later `@theme` block then wins over its colors, `--color-muted` and `--color-card-border`. :fact[f28x0x]
3. In the same file, add a `@plugin "daisyui/theme"` block with the site's role colors. :fact[f28x0x]
- Code: an illustrative `src/app.css`, whose theme block elides most of daisyUI's keys. :fact[f28x0x]

```css
/* src/app.css (illustrative) */
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

- The scaffold links its sheets through `?url` imports from a layout that wraps the public routes and not `/admin`. A hand-built site follows the same shape. :fact[5y8ity]
- A static import of the sheet in a layout folds it into a layout CSS chunk. That chunk's basename differs between the client and server builds, so the URL the preview frame links answers 404. :fact[gtg454]
- To link the sheet and point the preview at it, follow these steps:
1. In `src/routes`, move the `[...path]` route into a `(site)` group directory. A group directory leaves its routes' URLs unchanged. :fact[e8aw4w]
2. In `src/routes/(site)`, create `+layout.svelte`, which imports `../../app.css?url` and links it from `<svelte:head>`. :fact[5y8ity]
3. In `src/lib/cairn.config.ts`, import `../app.css?url` and name it in the adapter's `editor.preview.stylesheets`. :fact[gnn3pv] :fact[spn4hj]
4. Optional: In the same member, set `containerClass` to the class that wraps an entry on the public pages. :fact[blhd7f]
- With no `containerClass`, the preview renders the entry bare, with no wrapper element. :fact[blhd7f]
- Code: an illustrative `(site)` group layout that links the sheet. :fact[5y8ity] :source[/templates/waymark/src/routes/(site)/+layout.svelte]

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

- Code: an excerpt of a hand-built adapter with its `editor` member. :fact[gnn3pv]

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

- See [the `preview` entry](../reference/core.md#preview-adapter-editor-member) for `bodyClass`, `byConcept`, and the full type.
- A status fill set in the theme block recolors its on-surface ink too, since the engine derives each ink from its fill. :fact[ylmc9c]
- A hand-built site continues with [Iterate locally](#iterate-locally), [Style rendered markdown](#style-rendered-markdown), and [Verify the theme](#verify-the-theme). The recipes between them assume Waymark and the chassis. :fact[rxj43c]

## Iterate locally

*Sets up the loop a theme is edited in: real media seeded locally, the dev server, and Waymark's style guide.*

- Vite's hot module replacement applies a saved style sheet or component change to the running page without a reload. :fact[mvkyea]
- To start the loop, follow these steps:
1. If the site is deployed with a media library, then in the site directory, run `npx cairn-media-seed --from https://your-site.com`. :fact[7pv6se]
- The command downloads each object the committed media manifest lists and writes it into Wrangler's local R2 state. A re-run overwrites each key with the same bytes. :fact[7pv6se]
- See [the `cairn-media-seed` reference](../reference/cli-cairn-media-seed.md) for its flags, its download path, and its exit codes.
2. In the site directory, start the dev server. If you seeded media, run `npx vite dev` without `CAIRN_DEV_BACKEND`, or run `wrangler dev`. :fact[j2qzct]
- The scaffold's `npm run dev` sets `CAIRN_DEV_BACKEND=1`. With it set, the dev backend serves `/media` from an in-memory fake bucket, and seeded objects don't appear. :fact[j2qzct]
3. On a scaffolded site, open `/styleguide` in the browser. :fact[bdnzcy]
- The route renders the type scale, the component recipes, and a sample of each registered directive that declares a `preview`, against the current `theme.css`. A directive without one is listed by name. :fact[bdnzcy]

## Re-skin Waymark

*Walks a scaffolded-site reader through the recipe in `src/theme/theme.css`, which keeps Waymark's layouts and changes its colors and type.*

- The header comment of `src/theme/theme.css` holds the re-skin recipe as numbered edits. The steps follow it, in the light block and the dark block alike. :fact[f6k5cs]
- The prose elements read the same role tokens as the chrome, so the article re-skins with no edit to `prose.css`. :fact[kt0epf]
- To re-skin Waymark, follow these steps:
1. In both daisyUI blocks of `src/theme/theme.css`, rotate the hue of `--color-primary`, its third oklch value, and hold its lightness and chroma. :fact[f6k5cs]
- `--color-primary-content`, the text on the accent, keeps its light and dark values. :fact[f6k5cs]
2. In the same blocks, set the paper, `--color-base-100`, and the ink, `--color-base-content`, with the `-200` and `-300` steps. :fact[f6k5cs]
3. Optional: In the same blocks, bring `--color-secondary`, `--color-accent`, and `--color-neutral` on-brand the same way. :fact[f6k5cs]
4. Optional: In the `@theme` block of the same file, set `--font-display` and `--font-body` to the new faces. :fact[f6k5cs] :fact[dh5f33]
- Waymark self-hosts each face from a Fontsource variable package, whose `index.css` it imports under the chassis import. :fact[dh5f33]
- A token that names a face with no installed and imported package falls through to `system-ui`, with no error. :fact[dh5f33]
- See [Fontsource's install guide](https://fontsource.org/docs/getting-started/install).
5. Optional: In the same `@theme` block, tune the design scale, such as the `--text-step-*` type steps or the `--spacing-*` steps. :fact[f6k5cs] :fact[iel6v5]
6. Optional: In both daisyUI blocks, change the corner ladder, `--radius-selector`, `--radius-field`, and `--radius-box`. :fact[f6k5cs]
7. Optional: In `src/theme/components/ArticleView.svelte`, add a `data-flourish` attribute to the `<article class="prose">` element. :fact[ivp8wl] :fact[spn4hj]
- The attribute turns on the prose flourishes Waymark ships off: the cairn-glyph rule, the diamond bullet, and the margin-hanging pull quote. :fact[ivp8wl]
8. Optional: To bring the status colors on-brand, follow [Rebrand the status colors](#rebrand-the-status-colors). :fact[f6k5cs]
9. Run the checks in [Verify the theme](#verify-the-theme).
- The scaffold's adapter already names `theme.css` and `site.css` in `editor.preview`. A re-skin leaves that member as it is. :fact[spn4hj]

### Rebrand the status colors

*Walks the reader through a full status rebrand, and says why Waymark's rebrand retunes each ink with its fill.*

- The engine derives each on-surface ink, `--cairn-<status>-ink`, from its fill, so retuning a fill retunes its ink. A theme that overrides an ink retunes the ink with the fill. :fact[ylmc9c]
- Waymark overrides each status ink, such as `--cairn-success-ink`, in both daisyUI blocks. :fact[u893cs]
- To rebrand the status colors, follow these steps:
1. In both daisyUI blocks, set each status fill: `--color-info`, `--color-success`, `--color-warning`, and `--color-error`. :fact[3v9jzj]
2. In the same blocks, retune each `--cairn-<status>-ink` to its new fill, or delete the override so the ink follows the fill. :fact[u893cs]
- An overridden ink left unchanged no longer matches its fill in directive text and code highlighting. :fact[ylmc9c]
- See [Ink derivation](../reference/public-css.md#ink-derivation) for the formula, and for the fix when a derived ink fails on the theme's fills.

## Port your theme onto the chassis

*Walks a reader with an existing design through replacing Waymark's theme files while keeping the chassis, one step at a time.*

- A port replaces Waymark's style sheets, chrome components, and page compositions, and keeps `src/chassis/`. :fact[s4prb0]
- A theme file reaches the chassis through the `#chassis` subpath import, which the site's `package.json` maps to `./src/chassis/*`. A CSS file uses a relative `@import` instead. :fact[lwrqfd]
- To port a theme onto the chassis, follow these steps:
1. In `src/chassis/README.md`, read "What lives here" and "Every override seam". :fact[6oqyfi]
2. In the theme's style sheet, import `../chassis/tokens.css` first. :fact[iel6v5]
- `tokens.css` brings in Tailwind, the engine's `cairn-public.css`, and each design-scale key with a generic default. :fact[iel6v5]
3. In a later `@theme` block of the same sheet, redeclare the design-scale keys with the theme's values. :fact[iel6v5]
4. In the same sheet, declare the theme's light and dark `@plugin "daisyui/theme"` blocks with its role colors. :fact[iel6v5] :fact[kq6ud3]
5. If the new chrome renders a daisyUI component beyond the button, badge, alert, and card, remove its key from the `exclude` list in `src/chassis/tokens.css`. :fact[h5e8d4]
- The component set lives in the chassis because the themes on the chassis share it. :fact[h5e8d4]
6. If a theme file reads the `--cairn-cta-*` keys or `--cairn-caption-tracking`, as Waymark's style guide panel and header do, declare each in the theme. :fact[18qj2u]
- Neither the engine sheet nor `tokens.css` defaults these keys. :fact[18qj2u]
7. In the theme's style sheet, set the heading levers: `--font-weight-heading` in `@theme`, and `--cairn-heading-case` in the unlayered `:root` rule. :fact[p8hsnz]
- The chrome's titles and the `prose.css` headings read both keys. One value moves the headings together. :fact[p8hsnz]
8. In the page compositions, build each layout from the `composition.css` primitives, `.cairn-card`, `.cairn-band`, `.cairn-section`, `.cairn-hero`, and `.cairn-sidebar-layout`. :fact[ctognq]
- Each primitive exposes `--cairn-<primitive>-*` custom properties, such as `--cairn-card-padding`, for a per-instance override. :fact[ctognq]
- Use `max-w-measure` or an arbitrary width there. Some chassis spacing keys shadow Tailwind's `max-w-*` sizes, so `max-w-2xl` compiles to about 4rem. :fact[gzw7os]
- Center a container with `margin-inline: auto`. An unlayered `margin: 0 auto` beats a Tailwind `mt-*` or `mb-*` utility on the same element. :fact[h1qxlq]
9. In the new chrome, keep a skip link: an `sr-only` anchor to `#main`, made visible on focus with `focus:not-sr-only focus:absolute`. :fact[nz87b3]
- `<main id="main" tabindex="-1">` takes the focus. Activating the link then moves keyboard focus as well as the scroll position. :fact[nz87b3]
10. In the new chrome, mount the theme toggle from the chassis's `theme-toggle.ts`, passing it the config in `src/theme/theme-names.ts`. :fact[i9pgd2]
- With no `data-theme` set, `resolveTheme` reads the root's computed `color-scheme`. A dark-first theme then resolves dark with no edit to the page shell. :fact[i9pgd2]
- If you rename the daisyUI themes, change `theme-names.ts`, the no-flash script in `src/app.html`, and the block names in `theme.css` together. `theme-names.test.ts` fails when they drift. :fact[i3rn6f]
11. If the port adds or renames a compiled style sheet, then in `src/theme/cairn.config.ts`, name its `?url` import in `editor.preview.stylesheets`. :fact[spn4hj] :fact[gtg454]
- See [the `preview` entry](../reference/core.md#preview-adapter-editor-member) for `containerClass` and the `?url` rule.
12. Before you delete a chassis file, read its row in the dependents table under "Subtracting an element" in `src/chassis/README.md`. :fact[6oqyfi] :fact[kj37zz]
- `feed.ts` deletes with its two feed routes, while dropping `content.ts` means replacing six delivery routes' imports in the same change. :fact[kj37zz]
13. Read [Style rendered markdown](#style-rendered-markdown), then run the checks in [Verify the theme](#verify-the-theme).

## Style rendered markdown

*Says where each part of a rendered entry takes its styles, so a reader styling directive output or code blocks edits the right file.*

- On a scaffolded site, `ArticleView.svelte` wraps each entry in `<article class="prose">`, and `prose.css` styles each element inside it from the role tokens. :fact[spn4hj] :fact[kt0epf]
- A directive's markup carries an unprefixed class, such as `.callout`, from the theme's `markdown-components.ts`. The theme styles that class and may rename it. :fact[i80vsl]
- The engine's `cairn-public.css` styles `pre.shiki` and the `.cairn-tok-*` classes in `@layer components`, from the `--cairn-code-*` roles. A theme recolors code by setting those roles, on a hand-built site as on a scaffolded one. :fact[c4nnu9] :fact[hva8r5]
- `prose.css` keeps its flourishes behind `.prose[data-flourish]`, off by default: the cairn-glyph rule, the diamond bullet, and the margin-hanging pull quote. :fact[ivp8wl]
- To turn the flourishes on, add a `data-flourish` attribute to the theme's `.prose` root. :fact[ivp8wl]

## Verify the theme

*Has the reader run the public-scope audit rules, read a clean result, and confirm the editor preview.*

- The three public-scope rules, `public-literals`, `theme-conformance`, and `theme-contrast`, ship in `cairn-audit`. On a site, each is advisory, so a finding never changes the exit code. :fact[o4ctu5] :fact[xv2ien]
- `theme-contrast` reads the site's real import chain and needs `daisyui` installed in the site. :fact[mzmvt8]
- To verify the theme, run these checks in order:
1. In the site directory, run the public-scope rules by name. A run of public rules alone needs no built admin style sheet. :fact[0nfxs2]
- Code: the command that runs the three public-scope rules. :fact[0nfxs2]

```bash
npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast
```

2. In the report, confirm that the public rules raise no finding. :fact[o4ctu5]
- In a clean `theme-contrast` result, each pair the rule measures meets WCAG AA at 4.5:1, and the focus ring meets 3:1. Both hold in sRGB and display-p3, in each scheme the theme defines. :fact[mzmvt8]
- A value the rule can't place is reported as unmeasured, never passed. :fact[mzmvt8]
- See [What theme-contrast doesn't cover](../reference/cairn-audit.md#what-theme-contrast-doesnt-cover).
3. In the site directory, start the dev server with `CAIRN_DEV_BACKEND=1`, which the scaffold's `npm run dev` sets. :fact[j2qzct]
- The dev backend opens `/admin` signed in as an owner, with no sign-in email. :fact[dqjkci]
4. In the admin, open an entry in the editor. :fact[dqjkci]
5. In the preview, confirm that the entry renders in the theme's styles, with its background following `base-100` in your OS color scheme. :fact[faofr4]
- If a check fails, see [Resolve an audit finding](#resolve-an-audit-finding).

## Resolve an audit finding

*Matches a failed check from Verify the theme to its cause and fix, for a reader who may arrive here with a finding in hand.*

- Find the failed check's symptom in the following list.

:::row
**Symptom.** After a fill change, `theme-contrast` flags directive text or code highlighting.
**Cause.** The theme overrides that status's ink, and the override no longer matches the new fill. :fact[ylmc9c] :fact[u893cs]
**Fix.** Retune the ink beside its fill, or delete the override so the derived ink follows. :fact[u893cs]
:::

:::row
**Symptom.** `theme-conformance` reports that a `--cairn-cta-*` key or `--cairn-caption-tracking` resolves to nothing.
**Cause.** A theme file reads the key, and nothing in the import chain defines it. Neither the engine sheet nor `tokens.css` defaults these keys. :fact[q9egxt] :fact[18qj2u]
**Fix.** Declare the key in the theme. :fact[18qj2u]
:::

:::row
**Symptom.** The editor preview shows unstyled markup under a hint that the adapter's preview option names no style sheets.
**Cause.** The adapter sets no `editor.preview`. :fact[gnn3pv]
**Fix.** Name the site's sheet in `editor.preview.stylesheets`, as [Theme a hand-built site](#theme-a-hand-built-site) shows. :fact[gnn3pv]
:::

:::row
**Symptom.** On the deployed site, the editor preview is unstyled, and its style sheet request answers 404.
**Cause.** A layout also imports the sheet statically, so the URL the frame links names a file the client build doesn't serve. :fact[gtg454]
**Fix.** Remove the static import, and keep the `?url` import in the layout and in the adapter. :fact[gtg454] :fact[5y8ity]
:::

- See [The static rules](../reference/cairn-audit.md#the-static-rules) for what each public rule reads and where a literal is legal.

## See also

*Points the reader to the pages and references around a theme.*

- The following pages cover the work around a theme, each named with one sentence on what it covers:
- Scaffolded site files maps the files the setup command writes.
- See [Scaffolded site files](scaffolded-site-files.md).
- Run cairn-audit on your site configures `cairn-audit` for the whole site, CI included.
- See [Run cairn-audit on your site](run-cairn-audit-on-your-site.md).
- Write a markdown component builds the components a theme styles.
- See [Write a markdown component](write-a-markdown-component.md).
- Configure media sets up the media storage that seeded images come from.
- See [Configure media](configure-media.md).
- The public style sheet reference lists each role the engine's sheet declares, with its default.
- See [the public style sheet reference](../reference/public-css.md).
- The `cairn-audit` reference documents the public rules and the public scope.
- See [the `cairn-audit` reference](../reference/cairn-audit.md).
