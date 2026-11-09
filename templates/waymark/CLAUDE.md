@.claude/cairn/CLAUDE.md

# Your site

Add your project-specific guidance here; `cairn-guidance install` only ever refreshes the imported fragment above, never this file.

## Where things live

Imports use the aliases in `package.json`: `#site/*`, `#theme/*`, `#chassis/*`, and `#lib/*`, not `$lib`.

- `src/site`: the site's files (`site.config.yaml`, `cairn.config.ts`, `theme-options.css`, `overrides.css`). Edit these.
- `src/theme`: the theme's components and look (`theme.css`), laid in from the theme you chose.
- `src/chassis`: the public reading layer (tokens, prose styles, content readers, feeds). Change it last.
- `src/routes`: the public pages and the mounted `/admin`.
- `src/content`: your markdown, one folder per content type.

## Commands

- `npm run check`: type-check the site.
- `npm run build`: build the deployable Worker.
- `npm run check:cairn`: check the site against cairn's conventions.
- `npx cairn-manifest`: rebuild the content manifest after adding, removing, or renaming a content file.
