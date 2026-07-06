# AstroPaper, a cairn theme

A port of [AstroPaper](https://github.com/satnaing/astro-paper), Sat Naing's minimal,
responsive, and accessible Astro blog theme, expressed as a cairn theme on the chassis
(`examples/showcase/src/chassis`, copied verbatim here at port time; see
`src/chassis/README.md`). This is port 1 of the theme-ports-1-3 pass
(`docs/superpowers/plans/2026-07-05-theme-ports-1-3.md`), and its own capability test: whether
AstroPaper's design expresses through cairn's chrome, composition, and token seams with **zero
new content components** and **zero chassis edits**.

## Credits and attribution

AstroPaper's design, structure, and copy are by Sat Naing (satnaing), released under the MIT
license. The full license text is reproduced in [`LICENSE-ASTROPAPER`](./LICENSE-ASTROPAPER),
re-verified against the upstream repository at port time (2026-07-05):

> Copyright (c) 2023 Sat Naing

None of AstroPaper's own Astro/TypeScript source is copied verbatim; every chrome component,
route, and stylesheet here is a fresh Svelte/CSS implementation of AstroPaper's visible design
(the layout, the type, the color roles, the interaction), built against cairn's own seams. Each
theme file that translates a specific AstroPaper source file names it in its own doc comment
(for example `SiteHeader.svelte` names `src/components/Header.astro`), so the attribution
travels with the code it credits, not only this README.

Upstream: <https://github.com/satnaing/astro-paper>.

## What this port demonstrates

Every template AstroPaper's own live demo (astro-paper.pages.dev) ships is expressed here as a
cairn composition, with **zero registered content components**: home (featured/recent), the
paginated posts index, a single post, the year/month archives, the tags index and a single
tag's posts, search (a client-side filter substituting for the original's Pagefind index), the
about page, and a 404. The chrome (`SiteHeader`/`SiteFooter`/`Datetime`/`PostList`), the
light/dark toggle (AstroPaper's own accent-hue swap, blue to orange), and every token value
(`theme.css`) are this port's own, reading only the chassis's documented seams.

**Capability verdict:** AstroPaper's content (tutorials, release notes, an about page) renders
entirely from stock markdown, no `defineComponent` was needed anywhere, and no chassis file was
edited; the theme's own layer (chrome, compositions, tokens) fully expresses the design. See the
pass's dispatch report for the full per-template verdict.

## Scope: what this port omits

This is a public-content-only port: it proves the theme seam, not the full site auth/commit
pipeline the showcase already proves. It ships no `/admin` mount, no D1, no R2, no email
binding (`src/chassis/README.md` documents the two chassis files this omits,
`cairn.server.ts` and `dev-gate.ts`). A production site built from this port adds those back the
way `examples/showcase` does.

## Running it

```sh
npm install
npm run cairn:manifest   # generates src/content/.cairn/index.json
npm run dev              # or: npm run build && npm run preview
```
