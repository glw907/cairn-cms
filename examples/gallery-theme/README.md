# Gallery, a cairn theme

A port of [hugo-theme-gallery](https://github.com/nicokaiser/hugo-theme-gallery), Nico Kaiser's
Hugo photo-gallery theme, expressed as a cairn theme on the chassis
(`examples/showcase/src/chassis`, copied verbatim here at port time; see
`src/chassis/README.md`). This is port 3 of the theme-ports-1-3 pass
(`docs/superpowers/plans/2026-07-05-theme-ports-1-3.md`), and its own capability test: the
justified photo grid plus lightbox (the media stress), and whether an album tree expresses
through cairn's fixed Posts/Pages content model, answered with evidence rather than assumed.

## Credits and attribution

hugo-theme-gallery's design and structure are by Nico Kaiser (nicokaiser), released under the MIT
license. The full license text is reproduced in [`LICENSE-GALLERY`](./LICENSE-GALLERY),
re-verified against the upstream repository at port time (2026-07-06):

> Copyright (c) 2023-2025 Nico Kaiser

None of the upstream's own Hugo/Go template source is copied verbatim; every chrome component,
route, and stylesheet here is a fresh Svelte/CSS implementation of its visible design (the layout,
the type, the near-black no-accent color system, the justified grid), built against cairn's own
seams. Inspecting the upstream's own compiled `main.js` bundle shows its row-packing heuristic and
its default tunables (a 288px target row height held constant across every viewport, an 8px
spacing, a 0.25 height tolerance) are an exact match for
[`justified-layout`](https://github.com/flickr/justified-layout) (ISC, zero dependencies), the
small library Flickr publishes for this exact problem; `src/theme/justified-layout.ts` wraps that
package directly rather than reimplementing its heuristic by hand. The lightbox is
[PhotoSwipe](https://photoswipe.com) v5 (MIT); its caption panel and download button use
PhotoSwipe's own official
[dynamic-caption plugin](https://github.com/dimsemenov/photoswipe-dynamic-caption-plugin) (MIT, by
the PhotoSwipe author, confirmed against the upstream's own compiled bundle to be running at its
default options) and PhotoSwipe's own documented download-button recipe, not a port of the
upstream's own wiring.

The demo photos are from [Unsplash](https://unsplash.com), free to use under the Unsplash
License; `credit: Photo via Unsplash` on every photo in `src/content/pages/*.md` matches the
upstream's own demo content, which also names no individual photographer (its own
`itemprop=creator` reads the placeholder "Your Name" on every photo).

Upstream: <https://github.com/nicokaiser/hugo-theme-gallery>.

## What this port demonstrates

Every distinct page template the upstream's own live demo
(nicokaiser.github.io/hugo-theme-gallery) ships is expressed here: the home page (a hero, a
category pill nav, a large featured-album hero card, a grid of top-level albums), a
gallery-listing page for an interior album node (Animals, whose own children are Cats and Dogs),
a leaf album's justified photo grid (Cats, Dogs, Nature, Fashion & Beauty, Featured Album), a
category cross-index page, and two plain prose pages (About, Imprint). Every album page also
carries a one-step-back link (to its parent, or home for a top-level album): the upstream's own
header arrow always returns to home regardless of depth, which loses context on a deeper tree
than its own two levels, so this port's own addition restores it.

**Media-stress capability verdict:** the justified grid and the lightbox both express cleanly with
no engine change. `src/theme/justified-layout.ts` packs a list of aspect ratios into rows that
fill the container at a shared height close to a target (widening automatically as the viewport
grows, rather than capping at a fixed column count); `JustifiedGrid.svelte` measures its own
container with a `ResizeObserver` and lazy-loads PhotoSwipe only in the browser. Every photo's
aspect ratio comes from plain `width`/`height` frontmatter leaves rather than the `image` field's
own stored shape, because `ImageValue` (this engine's leaf image type) carries only
`src`/`alt`/`caption`, no intrinsic dimensions; a justified grid needs the ratio before any image
has loaded, so this port carries it beside the image field instead. That is a real, if minor,
friction point: a photographer authoring a photo row in the admin form would set four separate
fields (`photo`, `width`, `height`, `color`) to describe one picture, where a native photo-gallery
tool would infer three of those from the file itself.

**Album-vs-Pages content-model verdict:** cairn's two fixed concepts are Posts (a dated feed) and
Pages (one flat namespace, one shared fieldset per concept). This theme has no blog, so it
declares a single `pages` concept and models the *entire* album tree through it: `parent` (a
self-reference) gives an interior node its children, `categories` (a taxonomy multiselect) feeds
the cross-index, and `photos` (an array of objects) carries a leaf's picture list. Both mechanisms
work, and the categories cross-index in particular maps onto exactly the same taxonomy machinery
the Foxi port's post tags already proved (zero new engine surface). But the fit costs something
real: *every* page, whether it is About, Imprint, an interior node, or a leaf album, shares the
same fieldset, since a concept has one shape. Nothing in the schema marks which kind of page an
entry is; the theme infers a page's template purely from which optional fields are populated
(`photos.length > 0` is a leaf, another page's `parent` pointing here makes it an interior node,
neither makes it plain prose; see `$theme/albums.ts`). A real editor opening the admin form for
the About page would see an unused `parent` picker, an unused `categories` field, and an unused
`photos` array sitting beside the one field it actually needs (`title`), and the reverse is true
opening a photo album's form and seeing no explicit "this is a gallery" toggle at all. Hugo's own
directory-based routing (`/animals/cats/`, an arbitrary-depth URL matching the content tree)
has no equivalent in cairn's flat, single-segment permalink model (`routing: 'page'`,
`permalink: '/:slug'`) either; this port did not build nested URLs to work around that (every
album here is a flat top-level route, `/cats`, `/animals`, `/nature`), since forcing one theme's
routing need onto the engine is exactly what the pre-beta harvest discipline holds back for a
second port's evidence, but the gap is real and worth naming for the deferred gallery-enabler
question. In short: cairn's fixed concepts can express a photo-album site's data, but a
purpose-built "album" content type, with its own schema and its own nested routing, would be a
visibly better editing experience for exactly this genre. Whether that is worth the engine surface
it would cost is the open question this evidence feeds, not a verdict this port settles alone.

## Licensed family divergences

Two behaviors here diverge deliberately from the upstream demo. Neither is this port's own
one-off choice: both are sanctioned by a cairn-family-wide standard that every port and rebuild
carries, not only this one.

- **The light/dark toggle** (the sun/moon button in the header): the upstream hardcodes one dark
  theme with no way to switch it. This port wires the family's usual `$chassis/theme-toggle.js`
  mechanism instead of reproducing that limitation, matching the family's own dark-mode standard.
  A first-time visitor with no theme cookie set still sees the upstream's own dark theme by
  default, so the design at normal viewing is unchanged; the toggle only adds a control the
  upstream never offered.
- **The "‹ parent" back-link**: the upstream's own header arrow always returns to home, regardless
  of how deep the current page sits in the album tree. Its own live demo never nests past two
  levels (Animals > Cats), so that loses no context there; this port's back-link instead walks one
  level up (see "What this port demonstrates" above), a navigation-behavior fix rather than a
  visual one.

Both are the kind of divergence the family's port fidelity bar licenses: behavioral, not a change
to the visible design language at normal viewing (see the root `CLAUDE.md`'s polish and fidelity
standards).

## Scope: what this port omits

This is a public-content-only port: it proves the theme seam and the media capability test, not
the full site auth/commit pipeline the showcase already proves. It ships no `/admin` mount, no
D1, no R2, no email binding, and no blog concept at all (`src/chassis/README.md` documents the
four chassis files this omits: `cairn.server.ts`, `dev-gate.ts`, `feed.ts`, `render.ts`). A
production site built from this port adds admin/auth back the way `examples/showcase` does.

## Running it

```sh
npm install
npm run cairn:manifest   # generates src/content/.cairn/index.json
npm run dev              # or: npm run build && npm run preview
```
