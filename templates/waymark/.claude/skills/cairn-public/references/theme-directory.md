# What a theme directory holds

On the chassis, `src/theme/` is the theme and `src/chassis/` is the plumbing under it. The routes and the chassis import these files by the `#theme` subpath import, so a theme built from scratch supplies each of them: `theme.css`, `site.css`, `cairn.config.ts`, `site-config.ts`, `islands/registry.ts`, and the four components `SiteHeader.svelte`, `SiteFooter.svelte`, `ArticleView.svelte`, and `EntryRow.svelte`. `vite.config.ts` also reads `src/theme/cairn.config.ts` by path. The other files listed here are Waymark's supporting files, reached by relative imports from those, and a theme needs one only when its own files import it. `theme-starter.md` holds a complete daisyUI theme block to start `theme.css` from.

- **`theme.css`.** The two daisyUI blocks, the `@theme` scale, and an `@import` of `../chassis/tokens.css`. CSS reaches the chassis by relative import, since aliases don't resolve in CSS. The layouts, the error page, and the editor preview link it.
- **`site.css`.** The `.site-main` reading column and the `cairn-place-*` figure geometry. The layouts link it beside `theme.css`.
- **`cairn.config.ts`.** The adapter: concepts, fields, backend, and `rendering`. The chassis reads it.
- **`site-config.ts` and `site.config.yaml`.** The parsed site config: the site name and the `primary` and `footer` menus. The root layout server load and the chassis read them.
- **`markdown-components.ts` and `icons.ts`.** The registered directives, and the glyph set they draw.
- **`islands/`.** `registry.ts` maps a directive name to its Svelte component, `Banner.svelte` is the showcase's one island, and `banner-expiry.ts` is the date check the directive and the island share.
- **`theme-names.ts`.** The toggle's config: both theme names and the cookie.
- **`components/`.** `SiteHeader.svelte` and `SiteFooter.svelte`, the chrome, which read `page.data` (the site name and the resolved nav) and never import site config. `ArticleView.svelte` renders an entry, for the public and preview routes. `EntryRow.svelte` is one row of the home and archive listings. `admin-link.ts` exports `isAdminHref`, which marks `/admin` links `rel="external"`.

A `.ts` or `.svelte` file in the theme imports a chassis helper, such as the theme toggle, through the `#chassis` subpath import.
