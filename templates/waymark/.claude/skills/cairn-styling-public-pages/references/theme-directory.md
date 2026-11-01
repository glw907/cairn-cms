# What a theme directory holds

On the chassis, `src/theme/` is the theme and `src/chassis/` is the plumbing under it. The routes and
the chassis import these files by the `#theme` subpath import, so a theme built from scratch supplies
each: `theme.css`, `site.css`, `cairn.config.ts`, `site-config.ts`, `islands/registry.ts`, and the
components `SiteHeader.svelte`, `SiteFooter.svelte`, `ArticleView.svelte`, and `EntryRow.svelte`.
`vite.config.ts` also reads `src/theme/cairn.config.ts` by path. Waymark's other files are reached by
relative import from those, and a theme needs one only when its files import it.

- `theme.css` holds the two daisyUI blocks, the `@theme` scale, and an `@import` of
  `../chassis/tokens.css`. CSS reaches the chassis by relative import, since aliases do not resolve in
  CSS. The layouts, the error page, and the editor preview all link it, with `site.css`.
- `SiteHeader.svelte` and `SiteFooter.svelte` read `page.data` (site name, resolved nav) and never
  import site config.
- A `.ts` or `.svelte` file in the theme imports a chassis helper, such as the theme toggle, through
  the `#chassis` subpath import.

`references/theme-starter.md` holds a complete daisyUI block to start `theme.css` from.
