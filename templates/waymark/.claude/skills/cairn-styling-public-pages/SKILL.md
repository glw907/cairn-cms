---
name: cairn-styling-public-pages
description: Restyle or extend the public side of a cairn site, the pages a visitor reads. Load before editing theme.css, prose.css, composition.css, a directive's rules, or a public component, and before choosing a color, face, or corner for the site. Gives the retheme recipe, the job-to-token table, the stylesheet contract, how to audit a theme, and one catalogue page per public piece cairn ships. Defers to the official daisyUI skill for component classes.
---

# cairn public

This skill teaches an agent to restyle the public side of a cairn site: the reading surface, the
chrome, and every piece cairn writes into public markup. It stops at the public side. Anything
under `/admin` belongs to `cairn-building-admin-screens`, and a seam a developer builds on belongs to
`cairn-extending-a-site`. For a daisyUI component class (`btn`, `badge`, `card`), use the official daisyUI
skill rather than this one.

## Route by job

| Job | Open |
|---|---|
| Retheme to a brand: accent, page color, faces, corners, status colors | `references/retheme-by-tokens.md` |
| What the engine sheet defaults, layers and nesting, site-owned keys, a hand-built site's wiring, the emitted-class registry, replacing `prose.css` | `references/public-stylesheet-contract.md` |
| Check a theme: `cairn-audit` public rules, scope, import chain, fixing a finding | `references/checking-a-theme.md` |
| Start a theme from scratch: a complete daisyUI block, the keys a theme must set | `references/theme-starter.md` |
| Which files a theme directory holds | `references/theme-directory.md` |
| Add a public component | `references/public-component.md` |
| Restyle one piece (the catalogue below) | the page named for it |

The core rule: change the token for the job, never a literal beside it. A retheme edits the two
daisyUI blocks of `src/theme/theme.css` and no other file. Setting `--color-primary` and
`--color-base-100` in both blocks, then moving `--color-base-200` and `--color-base-300` with the
page color, recolors the links, focus ring, code keywords, cards, and bands with no override.

## The catalogue

One short page per public piece, named `<kind>-<name>.md`: the rendered markup, the classes and
tokens it reads, and the seams that override it. Open the page for the piece in hand before
restyling it.

Kinds: `directive-*`, `island-*`, `component-*`, `composition-*`, `prose-*`. `references/README.md`
lists every page.

## Checking the work

Run `npx cairn-audit --rule public-literals --rule theme-conformance --rule theme-contrast` from the
site's root before you finish. `references/checking-a-theme.md` covers the rules, the scope, and how
to resolve each finding.
