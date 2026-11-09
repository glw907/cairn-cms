# Conformance set

A hand-written content set of hostile cases for judging a theme. It mirrors a site's `src/content/**` and `static/**`, the same layout as `scripts/build/starter-overlay/`, so a viewer can compose it onto the starter overlay. It adds no dependency, and none of its files exist under `templates/` or `scripts/build/starter-overlay/`.

## What it holds

- Thirty posts, 28 live and two drafts. The live ones make three archive pages at the showcase's page size of 13, with a short last page of two.
- A parent and child page pair (`conformance-parent`, `conformance-child`). The engine has no parent field, so the child carries a `parent:` key that the manifest tool reports as undeclared and ignores; the parent links the child, and the child links the parent.
- Posts with a very long title, an unbroken string, twelve topics, no image, only an image, and a hero image; a Hebrew post, an Arabic post, and a post of accented Latin, Cyrillic, Greek, CJK, and emoji text; a draft that stays hidden, and a draft with no title (the engine requires a title on a published post, so a title-less post can only be a draft).
- One page per markdown layer: `commonmark-blocks`, `commonmark-inlines`, `gfm`, `directives`, and `raw-html`. The raw HTML page shows one tag the sanitizer strips and says so.
- Every directive the showcase registers, each empty, long, and nested inside another block, on the `directives` page, plus two fragments placed with `::include`.
- The assets the content names, under `static/images/`.

## What it needs no file for

The 404 page, the error page, and the feeds are routes, not content, so the set holds no file for them. A viewer reaches the 404 page by requesting an address that does not exist, and the feeds at their routes.

## Keeping it current

`src/content/.cairn/index.json` and `site-facts.json` are generated. After a change to the content, run `npm run package` if `dist/` is stale, then `node scripts/theme/conformance/manifest.mjs`. `node --test scripts/theme/conformance.test.mjs` fails when the committed manifest disagrees with the content.
