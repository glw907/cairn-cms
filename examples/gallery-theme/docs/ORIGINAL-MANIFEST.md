# hugo-theme-gallery: the original manifest

This is the ground-truth inventory of the upstream theme this port must match line by line. It
describes **only the original**; it does not grade the port. A verifier grades each checklist line
against `examples/gallery-theme` as one of:

- **MATCHED**: the port reproduces the behavior (glance-indistinguishable for visible design).
- **IMPROVED**: the port diverges under a sanctioned family standard (behavioral or structural,
  never the visible design language at normal viewing), and the divergence is documented in the
  port's README.
- **DEFERRED-WITH-SANCTION**: the behavior is deliberately out of the port's scope, with the
  sanction recorded (for example the public-content-only scope in the port README).

Sources, gathered 2026-07-06:

- Upstream repo `nicokaiser/hugo-theme-gallery`, default branch, theme version 4.9.3
  (`theme.toml`: MIT, Hugo `min_version 0.123.0`). File paths below are repo paths.
- Live demo <https://nicokaiser.github.io/hugo-theme-gallery/> via headless Chromium (desktop UA)
  and direct HTTP probes. Where repo source and live behavior both speak, they agree except where
  the "Open ambiguities" section at the end says otherwise.

Demo content facts used below (live counts): Cats 6 photos, Dogs 4, Nature 9, Fashion & Beauty 4,
Featured Album 2 (private + featured), Private (private only, unlinked); Animals is the one
interior node ("10 photos in 2 albums").

## 1. Pages and templates

- [ ] **T1** Home page (`layouts/_default/home.html`): title hero, category pill nav, featured
  hero card(s), then a card grid of the section's direct child albums (direct children only, not
  recursive), excluding `private: true` pages.
- [ ] **T2** Interior album / list page (`layouts/_default/list.html`, demo: Animals): title
  block, then the same child-album card grid. No category nav and no featured section (both are
  home-only).
- [ ] **T3** Leaf album / single page (`layouts/_default/single.html`, demo: Cats, Dogs, Nature,
  Fashion & Beauty, Featured Album): title block, justified photo grid, related-albums section
  (up to 3), then the page's markdown body in a prose section when present (demo: Dogs carries a
  body below its photos).
- [ ] **T4** Prose page (`layouts/_default/prose.html`, opted in via `layout: prose` front
  matter; demo: About, Imprint): title block plus markdown body only. No grid, no related albums.
- [ ] **T5** Category term page (demo: `/categories/animals/` etc.): an ordinary listing of the
  albums tagged with that term, rendered as album cards with photo counts (live:
  Cats "6 photos", Dogs "4 photos" under Animals). A term page can carry its own title and
  description via a content file (`exampleSite/content/categories/animals/_index.md`).
- [ ] **T6** No categories index: the `/categories/` all-terms page is disabled
  (`disableKinds = ["taxonomy"]` in the example config); only individual term pages exist.
- [ ] **T7** 404 page (`layouts/404.html`): `<hgroup>` with `<h1>404</h1>` and the i18n string
  "Page not found", inside the full normal chrome (header, menu, footer). Live 404s confirm.
- [ ] **T8** Every page renders through one shell (`baseof.html`): header block, page-type main
  block, cached footer block; `<html>` carries a `light` or `dark` class (see section 8).
- [ ] **T9** Title block (`partials/title.html`), on every page type that has a title: `<hgroup>`
  with `<h1>` = page title and, when the page has a front-matter `description`, a markdownified
  `<p>` sub-heading under it. Pages without a title render no hgroup.

## 2. Header, menu, footer chrome

- [ ] **H1** Header on a page with a parent: a square back-arrow button (`a.btn.btn-square`,
  inline SVG) linking to the **immediate parent** (`.Parent.RelPermalink`), with the parent's
  title as the link `title`. Live: Animals links home ("Hugo Gallery"), Cats and Dogs link to
  `/animals/` ("Animals"). Note: this is one-level-up at the template level, not a hardcoded
  home link; the demo's two-level depth is what makes depth-1 pages appear to "go home".
- [ ] **H2** Header on the home page: a plain button carrying the site title, linking home.
- [ ] **H3** Hamburger menu button, rendered only when a `main` menu is configured: toggles
  `aria-expanded` (false initially, true after click) and the `hidden` class on
  `<menu id="menu">`. Two inline SVG icon states (hamburger/close) swapped purely by CSS off the
  `aria-expanded` attribute.
- [ ] **H4** Menu behavior is minimal by design: plain show/hide, no animation, no outside-click
  close, no Escape close.
- [ ] **H5** Menu contents: one entry per configured `main` menu item, each `<a>` carrying
  `aria-current` (via menu-current detection), wrapped in schema.org `SiteNavigationElement`
  microdata. Demo order: Home, Animals, Fashion & Beauty, Nature, About.
- [ ] **H6** Footer: social-icon row, then copyright text, then `footer` menu links. Demo footer
  links: Imprint (site content, weight 1) and "GitHub" pointing at the theme repo, a footer
  credit the theme itself ships by default (weight 3, from the theme's own config).
- [ ] **H7** Social icons: one icon link per configured service. Demo populates facebook,
  instagram, github, youtube, email (`mailto:`, no new tab). The theme supports 14 keys:
  website, mastodon (`rel="me"`), pixelfed (`rel="me"`), facebook, instagram, github, twitter,
  youtube, linkedin, email, mixcloud, flickr, 500px, whatsapp (auto-prefixed `https://wa.me/`).
  External links get `target="_blank" rel="noopener"`; the accessible name is a `title`
  attribute (no `aria-label`, no visible text).
- [ ] **H8** Footer is rendered once and cached (`partialCached`), identical across pages.

## 3. Justified photo grid (numeric parameters)

- [ ] **G1** Algorithm: Flickr/SmugMug justified row packing. Upstream vendors its own modified
  TypeScript port (`assets/js/justified-layout.ts`, "Original work Copyright 2019 SmugMug /
  Modified work Copyright 2025 Nico Kaiser"), not the npm package; the published
  `justified-layout` package is a faithful behavioral stand-in for the same heuristic.
- [ ] **G2** `targetRowHeight` = **288 px**, constant at every viewport width (no responsive
  scaling of the target). Site-configurable via `params.gallery.targetRowHeight`; the demo runs
  the default. Live-measured: full rows at a 2560 px viewport are exactly 288 px tall.
- [ ] **G3** `boxSpacing` = **8 px** gutter, horizontal and vertical. Site-configurable via
  `params.gallery.boxSpacing`; demo default. Live-measured 8 px between adjacent boxes.
- [ ] **G4** `targetRowHeightTolerance` = **0.25** (rows may pack between roughly 0.75x and
  1.25x target before forcing); on overflow/underflow a row's height is clamped to
  [0.5x, 2x] of target. Site-configurable via `params.gallery.targetRowHeightTolerance`.
- [ ] **G5** Aspect ratios come from each thumbnail `<img>`'s `width`/`height` attributes, so the
  layout computes before any image loads.
- [ ] **G6** The grid container starts `visibility: hidden; height: 1px; overflow: hidden` in the
  markup and is revealed by JS after layout (no un-laid-out image stack ever paints).
- [ ] **G7** Items are absolutely positioned (`position: absolute`, pixel `width`/`height`/
  `top`/`left`, `overflow: hidden`) in a `position: relative` container whose height is set to
  the computed layout height.
- [ ] **G8** Relayout on window `resize` and `orientationchange` (window-level listeners), and
  the layout runs **twice on load** to compensate for scrollbar-induced container-width shift.
- [ ] **G9** Rows widen with the viewport rather than capping at a column count; narrow viewports
  produce 1-2 photos per row, wide viewports many (live: 375 px viewport rows of ~2, 2560 px
  rows of 8+ at exactly 288 px).
- [ ] **G10** Each grid item is `cursor: zoom-in`.

## 4. Lightbox (PhotoSwipe v5)

Configured options (from `assets/js/lightbox.js`; everything not listed is PhotoSwipe v5.4 stock
default, and PhotoSwipe's published defaults are the ground truth for those lines):

- [ ] **L1** `showHideAnimationType: "zoom"`: opening zooms out of the clicked thumbnail;
  closing zooms back into it.
- [ ] **L2** `bgOpacity: 1`: fully opaque backdrop; the page never shows through.
- [ ] **L3** `imageClickAction: "close"`: a mouse click on the photo itself closes the lightbox
  (see Open ambiguities, item 3).
- [ ] **L4** UI title strings come from i18n: Close, Zoom, Previous, Next, and the error message
  "The photo cannot be loaded".

Chrome, top bar right cluster in DOM order, each with `title` (and PhotoSwipe's own
`aria-label`s on the buttons):

- [ ] **L5** Download control: an `<a>` (not a button), custom inline SVG down-arrow icon,
  registered at UI `order: 8` so it sits before zoom and close; `title="Download"`, a bare
  `download` attribute, `target="_blank" rel="noopener"`. Its `href` re-syncs on every slide
  change to the current slide's gallery-item `href` (the full original image when
  `publishResources` is on, the demo state; the 1600 px derivative otherwise).
- [ ] **L6** The download control exists only when resource publishing is enabled
  (`enableDownload` defaults to the page's `build.publishResources`, default true). A site that
  turns `publishResources` off loses the button and the original-file links together.
- [ ] **L7** Zoom button (`pswp__button--zoom`, `aria-label`/`title` "Zoom"): toggles between fit
  and PhotoSwipe's stock secondary zoom level (2.5), shown on mouse-capable devices.
- [ ] **L8** Close button (`pswp__button--close`, "Close").
- [ ] **L9** Prev/next arrow buttons (`pswp__button--arrow--prev`/`--next`, "Previous"/"Next"),
  marked `pswp__hide-on-close`.
- [ ] **L10** Counter: separate top-left chrome element, format `"1 / 6"` (current, space, slash,
  space, total), updating per slide.
- [ ] **L11** Caption: the official `photoswipe-dynamic-caption-plugin` with explicit options
  `mobileLayoutBreakpoint: 700`, `type: "auto"`, `mobileCaptionOverlapRatio: 1`. Desktop wide
  slides get an aside (right-of-image) caption panel (`pswp__dynamic-caption--aside`); below
  700 px the caption lays out mobile-style. Caption text is the photo's resolved title (see I6);
  a photo without a title shows no caption.

Keyboard, gestures, zoom (stock defaults unless noted):

- [ ] **L12** ArrowLeft / ArrowRight navigate slides (confirmed live); slides loop past the ends
  (stock `loop: true`).
- [ ] **L13** Escape closes (confirmed live).
- [ ] **L14** Tab moves focus through the five controls in order download, zoom, close, prev,
  next; PhotoSwipe's stock focus trap applies (see Open ambiguities, item 4).
- [ ] **L15** On close, focus returns to the originating gallery-item link (confirmed live;
  stock `returnFocus: true`).
- [ ] **L16** Clicking the backdrop closes (confirmed live; stock `bgClickAction: "close"`).
- [ ] **L17** Touch gestures at stock defaults: swipe to navigate, pinch to zoom, pinch-to-close,
  vertical drag to close, double-tap to zoom, single tap toggles the chrome
  (`tapAction: "toggle-controls"`).
- [ ] **L18** Mouse-wheel zoom is off (stock `wheelToZoom: false`); when zoomed, drag pans.
- [ ] **L19** Zoom levels at stock defaults: initial fit, secondary 2.5, max 4.
- [ ] **L20** Adjacent slides preload at stock `preload: [1, 2]`.
- [ ] **L21** The lightbox root is `role="dialog"` with `tabindex="-1"` (PhotoSwipe stock
  markup); the slide announces the caption text as its accessible group name.
- [ ] **L22** Hash deep-linking, theme-authored: on slide change the URL hash is
  `history.replaceState`d to the slide's `data-pswp-target` (the urlized image file name, for
  example `#alexander-london-mjad10xed7w-unsplash.jpg`); closing clears the hash back to the
  bare path; loading an album URL **with** a hash finds the matching photo and opens the
  lightbox directly on it (`loadAndOpen`), so a photo permalink lands inside the open lightbox.
- [ ] **L23** The lightbox image is the 1600x1600-fit derivative (`data-pswp-src`), with its
  dimensions pre-declared via `data-pswp-width`/`data-pswp-height`.

## 5. Album features

- [ ] **A1** Nesting: albums nest through the content tree; an interior node (Animals) lists its
  child albums as cards, a leaf holds photos. Demo depth is two levels (Animals > Cats/Dogs).
  URLs mirror the tree (`/animals/cats/`).
- [ ] **A2** Album cover resolution, used everywhere a cover is needed (card thumbnail, featured
  hero, og:image, RSS item image): first image resource flagged `cover: true`, else a file name
  matching `*feature*`, else the album's first image.
- [ ] **A3** A `cover: true` image can simultaneously be `hidden: true`: it then serves as the
  album's cover while being excluded from the visible photo grid (demo: Cats' cover).
- [ ] **A4** Private albums (`private: true`): excluded from the home grid, list pages, related
  albums, RSS, and the sitemap; their `<meta name="robots">` flips to "noindex, nofollow"; but
  the page itself stays publicly reachable at its URL (live: `/private/` returns 200 with
  noindex). There is no server-side gate; privacy is exclusion-from-listings only.
- [ ] **A5** Featured albums (`featured.html`): every page site-wide with `featured: true`,
  newest date first, each rendered as a full-width hero card on the home page. The featured
  filter does **not** exclude private pages, so a private album with `featured: true` does
  appear on home (demo: "Featured Album", private + featured, live on the home page). A
  deliberate-looking asymmetry in the upstream privacy model; record, do not smooth over.
- [ ] **A6** Featured hero card rendering: the cover as a CSS `background-image` (not an `<img>`:
  eager-loading, no alt text), placeholder `background-color` from the image's dominant color,
  a dark legibility gradient `linear-gradient(to top, rgba(0,0,0,.8) 10%, transparent 50%)`,
  title and photo count in always-near-white text, aspect ratio 1/1 below 640 px and 16/9 from
  640 px.
- [ ] **A7** Per-album sort: `sort_by` (default `Name`; `Exif.Date` documented as an alternative)
  and `sort_order` (default `asc`) front-matter params (demo: Nature sorts `Name` descending).
- [ ] **A8** Per-album description: the front-matter `description` renders as the markdownified
  sub-heading under the album title (see T9) and feeds the meta description and og:description.
- [ ] **A9** Album card: link wrapping a dominant-color `<figure>` placeholder, a lazy-loaded
  thumbnail `<img>` (lazysizes `data-src` pattern) with `alt` = the album title, an `<h2>`
  title, and a count line.
- [ ] **A10** Count line grammar (i18n plurals): a leaf shows "1 photo"/"N photos"; an interior
  node shows the recursive photo count over non-private descendants plus "in N album(s)"
  (demo: Animals reads "10 photos in 2 albums").
- [ ] **A11** An album or section with zero non-hidden images renders no card at all, anywhere
  (no zero-photo placeholder); a list page needs at least one image (its cover) to appear.
- [ ] **A12** Related albums: leaf album pages only; Hugo's related-content over shared taxonomy
  terms, private-filtered, capped at 3, under an h2 "Related albums" heading, rendered as
  album cards.
- [ ] **A13** Categories are a real taxonomy: an album can carry multiple terms (demo: Cats and
  Dogs in animals + nature; Fashion & Beauty in beauty + fashion). Home pill nav lists the
  terms (demo: Animals, Beauty, Fashion, Nature) as bordered, rounded-full pill links with
  nowrap/ellipsis truncation.
- [ ] **A14** Child-album ordering on home and list pages: Hugo's default page sort (date and
  weight; demo home order Animals, Fashion & Beauty, Nature by weight 1/2/3).
- [ ] **A15** Menu placement is per-page front matter (`menus: "main"` etc.), not automatic:
  the demo's main menu carries Home, the three top-level albums, and About; Imprint sits in
  the footer menu instead.

## 6. Image treatments

- [ ] **I1** Grid thumbnail: 600x600-fit derivative (auto-oriented), lazy-loaded via lazysizes
  (`img.lazyload` with `data-src`, no `src` until load), fade-in on load (opacity 0 to 1,
  300 ms transition), `visibility: hidden` until the swap to avoid a broken-image flash.
- [ ] **I2** Placeholder: each item's `<figure>` carries the thumbnail's dominant color as
  `background-color` plus the exact `aspect-ratio`, so the grid is fully shaped and tinted
  before any pixel arrives.
- [ ] **I3** Lightbox derivative: 1600x1600 fit. Original full-resolution file published and
  linked (item `href`, download button) while `publishResources` is on; with it off, the
  1600 px derivative replaces the original everywhere and download disappears (see L6).
- [ ] **I4** Hugo imaging config (example site): quality 75, CatmullRom resample, EXIF date kept,
  GPS coordinates stripped (`disableLatLong = true`), and only `ImageDescription|Orientation`
  EXIF fields retained.
- [ ] **I5** Per-photo metadata via image resources: `title`, `date`, `cover`, `hidden` params;
  loose image files in the album bundle are included automatically without a front-matter
  entry.
- [ ] **I6** Photo title resolution: EXIF `ImageDescription` first, overridden by an explicit
  front-matter resource `title:`; the title feeds the item's `title` attribute, the thumbnail
  `alt`, and the lightbox caption. Photo date resolution: EXIF date, overridden by a
  front-matter resource `date:` (feeds `Exif.Date`-style sorting).
- [ ] **I7** Schema.org microdata per grid item: `ImageObject` (with `contentUrl`) plus a nested
  `Person` `itemprop="creator"` whose name is the single site-wide `params.author.name`; there
  is no per-photo photographer field (the demo's per-photo credits live in caption text
  instead).
- [ ] **I8** RSS item image: the album cover at 900x600 fill, as both `<media:content>` and an
  `<img>` embedded in the item description.

## 7. Dark scheme

- [ ] **D1** The `<html>` element carries class `dark` or `light` from the page's front-matter
  `theme` param, defaulting to the site `params.defaultTheme`; the demo default is `dark`.
- [ ] **D2** An explicit class always beats the OS preference: with the class present,
  `prefers-color-scheme` is ignored (live: emulating OS light mode leaves the demo dark).
  `color-scheme: light dark` is declared at root; the media query applies only when no class
  is set.
- [ ] **D3** Per-page override: a single page can flip scheme (demo: Fashion & Beauty is the one
  `theme: "light"` page and renders white-on-near-black inverted, background
  `rgb(255,255,255)`; Nature sets `theme: "dark"` explicitly, a no-op against the default).
- [ ] **D4** No toggle: the upstream ships no user-facing scheme switch anywhere in its UI.
- [ ] **D5** Exact palette, no hue accent anywhere: dark surface-1 `#0a0a0a`, surface-2
  `#404040`, text-1 `#fafafa`, text-2 `#a3a3a3`, border `#606060`; light surface-1 `#fff`,
  surface-2 `#e5e5e5`, text-1 `#0a0a0a`, text-2 `#737373`, border `#bbb`. Live computed body
  colors confirm `rgb(10,10,10)` / `rgb(250,250,250)` on dark pages.

## 8. Layout and type (chrome-level CSS)

- [ ] **C1** Album-card grid columns: 1 below 640 px, 2 from 640 px, 3 from 1024 px; gaps
  2rem row / 1.5rem column (row-gap 3rem from 640 px).
- [ ] **C2** Hero/hgroup typography uses `clamp()` fluid type scaling.
- [ ] **C3** Prose pages use the theme's `.prose` typography styles.
- [ ] **C4** Category pills: 1 px `var(--border)` outline, fully rounded, nowrap with ellipsis.

## 9. Head, SEO, feeds, sitemap, 404, robots

- [ ] **S1** `<title>` = "{Page title} - {Site title}" (site title alone where a page has none;
  live home: "Hugo Gallery - Gallery").
- [ ] **S2** `rel="canonical"` on every page (the 404 canonicalizes to `/404.html`).
- [ ] **S3** Favicons: SVG icon + PNG icon + 180x180 apple-touch-icon.
- [ ] **S4** Meta description from the page `description` (markdownified, plainified), falling
  back to the site description; meta keywords only when `keywords` front matter is set.
- [ ] **S5** `<meta name="robots">` = "index, follow" normally, "noindex, nofollow" on private
  pages (the entire per-page SEO-privacy mechanism).
- [ ] **S6** RSS feed autodiscovery `<link rel="alternate" type="application/rss+xml">` in head.
- [ ] **S7** Open Graph on every page: `og:url`, `og:site_name`, `og:title`, `og:description`,
  `og:locale`; home/sections get `og:type "website"`, content pages get `og:type "article"`
  plus `article:section` and `article:published_time`/`article:modified_time` (ISO 8601);
  `og:image` = the cover at 1600x1600 fit. No Twitter-card tags.
- [ ] **S8** RSS: home-only output (`[outputs]` home = HTML+RSS; pages and sections HTML-only),
  RSS 2.0 with `media` and `atom` namespaces, `atom:link rel="self"`, channel
  `managingEditor`/`webMaster` from `params.author`, `copyright` from site copyright, limit
  100, items exclude `private: true` and `rss_ignore: true` pages (demo: About and Imprint
  both set `rss_ignore`), item image per I8.
- [ ] **S9** Sitemap: theme-overridden to exclude private pages; includes home, albums, prose
  pages, and category term pages, with `lastmod` where dated (live sitemap confirms 12 URLs,
  no `/private/`, no `/featured-album/`).
- [ ] **S10** 404: served for unknown paths with the full chrome (see T7).
- [ ] **S11** `enableRobotsTXT = true` in the example config; the live demo nonetheless 404s
  `/robots.txt` (see Open ambiguities, item 2).
- [ ] **S12** Head extension point `head-custom.html` (empty in the theme) for consumer-site
  markup; parallel empty `custom.js` / `custom.css` extension points ride the bundles.

## 10. UI strings (i18n)

- [ ] **N1** The theme is translated into 11 locales (da, de, en, es, fr, it, ja, nb, pt, uk,
  zh). English strings, all of which appear in chrome the port reproduces: "Menu", "Home",
  "Page not found", "Go to homepage", "Close", "Zoom", "Previous", "Next", "The photo cannot
  be loaded", "Download", "Related albums", photo-count plurals ("1 photo" / "{n} photos"),
  album-count plurals ("{photoCount} in {n} album(s)"). ("Home" and "Go to homepage" are
  defined but were not found wired in any template; do not require them anywhere.)

## 11. Accessibility affordances

- [ ] **X1** Landmarks: `<header>`, `<main>`, `<footer>` on every page; the category pill nav is
  a `<nav>`; the menu is a `<menu>` element.
- [ ] **X2** Exactly one `<h1>` per page (the page title); album cards and the featured card use
  `<h2>`.
- [ ] **X3** Menu toggle carries `aria-expanded`; menu links carry `aria-current`; the toggle's
  SVGs are `aria-hidden`.
- [ ] **X4** Grid thumbnails carry `alt` = the photo title (empty when untitled); album-card
  thumbnails carry `alt` = the album title. The featured hero, as a CSS background, has no
  alt (an upstream accessibility gap; its accessible text is the card's h2/count).
- [ ] **X5** Lightbox a11y per PhotoSwipe stock: `role="dialog"`, labelled controls
  ("Download"/"Zoom"/"Close"/"Previous"/"Next"), caption as the slide's accessible name,
  Escape close, focus return to trigger (L13-L15, L21).
- [ ] **X6** Social icon links' accessible names are `title` attributes only (an upstream
  pattern, weaker than `aria-label`; note if the port improves it).
- [ ] **X7** No skip-link anywhere in the upstream.

## Open ambiguities (verifier notes, not gradable lines)

1. **Dynamic-caption option values**: the live minified bundle shows the plugin's internal
   factory defaults (`mobileLayoutBreakpoint: 600`, `mobileCaptionOverlapRatio: .3`); the repo
   call site explicitly passes 700 / 1 / `type: "auto"`. The call-site values are authoritative
   (the bundle string is the plugin's own default-options object, merged over at runtime).
2. **robots.txt**: config enables it; the live demo 404s it (both project and org paths).
   Probably a GitHub Pages project-site artifact. Do not require a served robots.txt to grade
   S11; grade on whether the port made a deliberate, documented choice.
3. **L3 (`imageClickAction: "close"`)**: the configured source value is authoritative; a scripted
   live click on the image did not close the lightbox, most likely an instrumentation artifact
   (click landing outside the rendered image box, or a preloaded adjacent `.pswp__img` being
   targeted). Re-verify manually if grading L3 strictly.
4. **L14 focus trap**: PhotoSwipe v5 documents a focus trap by default, but the live probe saw
   focus reach `<body>` after the fifth control (synthetic Tab may bypass PhotoSwipe's trap
   handler). Grade the port against PhotoSwipe's documented behavior, not the probe.
5. **Grid numerics (G2-G4)**: the literal option names do not survive minification in the live
   bundle; the values are triangulated from repo source defaults plus exact live measurements
   (288 px rows, 8 px gaps at 2560 px). Treat 288 / 8 / 0.25 as confirmed.
