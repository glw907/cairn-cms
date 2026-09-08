# Proposal research, lens 7c: figures in the Astro docs

Survey of 24 pages across docs.astro.build (Sonnet, 2026-09-08). Folded into revision 2.

---

## Astro Docs figure survey (docs.astro.build)

**Method:** fetched 24 pages across concepts, basics, guides, reference, tutorial, and recipes, plus the contributor/style guide. Confirmed the one genuine diagram and the one genuine screenshot against raw HTML (not just the WebFetch markdown summary) with `curl`.

### Universal noise (present on nearly every page, excluded from the counts below)
Every page carries 1–3 sponsor/ad units that are not documentation figures: an "Astro Jobs" banner (`AstroJobs.*.webp`, empty `alt`), a "Coding in Public" banner (`CodingInPublic.*.webp`, empty `alt`), and a "Scrimba / James Q Quick" course promo (`Scrimba.*.webp` alt="Scrimba", plus an unnamed headshot with empty `alt`). None of these carry real alt text describing content; they are decorative ad units and every one of them ships `alt` empty or absent.

### Page-by-page findings

| Page | Explanatory figures (excl. ads/logos) | Kind | Format | Generated/hand-drawn | Alt text | Caption/lead-in | Position |
|---|---|---|---|---|---|---|---|
| [Why Astro?](https://docs.astro.build/en/concepts/why-astro/) | 0 | — | — | — | — | — | — |
| [Islands architecture](https://docs.astro.build/en/concepts/islands/) | 1 | Architecture diagram — **not an image file**: a `<div class="diagram">` of five CSS-styled colored boxes ("Header", "Sidebar", "Static content…", "Image carousel", "Footer") | HTML/CSS, no raster/SVG asset | Hand-built markup, not machine-generated (no mermaid) | **N/A — no `alt` possible, it's not an `<img>`; text is real DOM text, so it is screen-reader visible as prose, not as an image** | Lead-in: "Think of a client island as an interactive widget floating in a sea of otherwise static, lightweight, server-rendered HTML." Caption: "Source: [Islands Architecture: Jason Miller](https://jasonformat.com/islands-architecture/)" | Mid-article, "Island components" section |
| [Project structure](https://docs.astro.build/en/basics/project-structure/) | 0 | — | — | — | — | — | — |
| [Routing](https://docs.astro.build/en/guides/routing/) | 0 | — | — | — | — | — | — |
| [Images](https://docs.astro.build/en/guides/images/) | 0* | *the only non-ad image is a decorative mascot icon (`houston_chef.webp`) on a "Related recipe" card link | icon | raster webp | n/a | alt: "A bird sitting on a nest of eggs." (decorative, not explanatory of the surrounding image API content) | twice, flanking two "Related recipe" callouts |
| [Content collections](https://docs.astro.build/en/guides/content-collections/) | 0 | — | — | — | — | — | — |
| [On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/) | 0** | **adapter logos (Cloudflare Pages, Netlify, Node, Vercel) are brand marks, not explanatory figures | logo icons | SVG | vector, brand-supplied | none stated | inline in adapter list |
| [View transitions](https://docs.astro.build/en/guides/view-transitions/) | 0 | — | — | — | — | — | — |
| [Integrations guide](https://docs.astro.build/en/guides/integrations-guide/) | 0*** | ***framework/adapter/integration logos only (Alpine, Preact, React, SolidJS, Svelte, Vue; Cloudflare Pages, Netlify, Node, Vercel; Markdoc, MDX, Partytown, Sitemap) | logo icons | SVG | vector | none | inline lists |
| [Deploy](https://docs.astro.build/en/guides/deploy/) | 0 | ~30 hosting-service logo icons (AWS, Netlify, Vercel, GitHub Pages, etc.) | logo icons | mixed | vector | none | "Deployment Guides" grid |
| [Testing](https://docs.astro.build/en/guides/testing/) | 0 | — | — | — | — | — | — |
| [Configuration reference](https://docs.astro.build/en/reference/configuration-reference/) | 0 | — | — | — | — | — | — |
| [API reference (render context)](https://docs.astro.build/en/reference/api-reference/) | 0 | — | — | — | — | — | — |
| [Content loader reference](https://docs.astro.build/en/reference/content-loader-reference/) | 0 | — | — | — | — | — | — |
| [Directives reference](https://docs.astro.build/en/reference/directives-reference/) | 0 | — | — | — | — | — | — |
| [Tutorial: Introduction](https://docs.astro.build/en/tutorial/0-introduction/) | 0 | — | — | — | — | — | — |
| [Tutorial 1-setup/2 (first project)](https://docs.astro.build/en/tutorial/1-setup/2/) | **1** | **Genuine screenshot** of the rendered starter site | raster PNG (`/tutorial/minimal.png`) | real screenshot, not generated | **"A blank white page with the word Astro at the top."** | Lead-in: "Here's what the Astro 'Empty Project' starter website should look like in the browser preview:" — no caption | Inside "View a preview of your website" step, directly after dev-server instructions |
| [Tutorial 1-setup/3 (writing your first line)](https://docs.astro.build/en/tutorial/1-setup/3/) | 0 | — | — | — | — | — | — |
| [Tutorial 2-pages/1 (pages)](https://docs.astro.build/en/tutorial/2-pages/1/) | 0 | — | — | — | — | — | — |
| [Tutorial 3-components/1 (Navigation component)](https://docs.astro.build/en/tutorial/3-components/1/) | 0 | — | — | — | — | — | — |
| [Tutorial 6-islands/1](https://docs.astro.build/en/tutorial/6-islands/1/) | 0 | — | — | — | — | — | — |
| [Recipes index](https://docs.astro.build/en/recipes/) | 0 | Recipe cards are text-only, no thumbnails | — | — | — | — | — |
| [Recipe: Build forms](https://docs.astro.build/en/recipes/build-forms/) | 0 | — | — | — | — | — | — |
| [Recipe: Dynamically importing images](https://docs.astro.build/en/recipes/dynamically-importing-images/) | 0 | — | — | — | — | — | — |
| [Recipe: Build a custom image component](https://docs.astro.build/en/recipes/build-custom-img-component/) | 0 | — | — | — | — | — | — |

`/en/recipes/dynamic-relative-images/` returned HTTP 404 — could not fetch (slug doesn't exist; the correct recipe is `dynamically-importing-images`, fetched instead).

### Verbatim alt text, every figure/image found (ads excluded from this list except where noted for contrast)
- Tutorial screenshot: **"A blank white page with the word Astro at the top."**
- Images guide mascot icon (×2): **"A bird sitting on a nest of eggs."**
- Islands diagram: not an `<img>`, has no `alt` attribute at all — its labels are plain DOM text ("Header (interactive island)", "Sidebar (static HTML)", "Static content like text, images, etc.", "Image carousel (interactive island)", "Footer (static HTML)").
- Ad units confirmed by raw HTML: `<img src="/_astro/AstroJobs...webp" alt loading="lazy"...>` and `<img src="/_astro/CodingInPublic...webp" alt loading="lazy"...>` — both ship `alt` as an empty attribute (present but valueless), i.e., correctly marked decorative. The Scrimba logo does carry `alt="Scrimba"`; the adjacent headshot's `alt` is empty.

### Stated house rule on images/diagrams
**None found.** Checked `github.com/withastro/docs` `CONTRIBUTING.md` (no image guidance, points to `contribute.docs.astro.build`), that site's landing page, and its linked "Astro Docs writing style" guide (`/guides/writing-style/`) — none of the three contains any rule, convention, or even a passing mention of images, screenshots, diagrams, alt text, or captions. There is no custom MDX image/figure component in evidence either: the two content images found are plain `<img>` tags, and the "diagram" is bespoke CSS markup, not a reusable `<Figure>`-style component.

### Summary
Across 24 pages spanning concepts, basics, guides, reference, tutorial, and recipes, exactly two pages carry an explanatory visual, and one of those two is not an image at all. The islands-architecture page, the single place in this set where a picture would plausibly do real work, ships a hand-built HTML/CSS box diagram instead of an SVG, mermaid render, or screenshot; it is captioned and sourced but has no image semantics because it's markup, not media. The other, a tutorial step confirming the starter project renders, is a plain PNG browser screenshot with real alt text and a lead-in sentence, the one page in the whole sample that behaves like a documentation figure is conventionally expected to. Every other concept, guide, and reference page reviewed, including the ones most likely to reach for a picture, routing, content collections, on-demand rendering, view transitions, the two image-handling recipes, and every reference page, carries zero explanatory figures: no annotated screenshots, no flow diagrams, no terminal captures, no gifs. The only other visual elements are decorative brand-logo grids (frameworks, adapters, deploy targets) and the four-times-repeated ad banners, none of which explain anything.

For a docs set of similar shape, the finding is that Astro's docs default to prose plus code blocks and reach for a picture only twice in this whole survey: once for a single architectural concept it judged too spatial for words alone, built as bespoke markup rather than a maintained image asset, and once to close the loop on "did your first command work" in the tutorial's very first hands-on step. There is no house rule requiring or discouraging images (checked and confirmed absent in both the CONTRIBUTING.md and the linked writing-style guide), so the near-total absence of figures across routing, rendering modes, content collections, view transitions, and the entire reference and recipes tracks reflects house practice rather than a stated policy, and nothing in the tooling (no figure/image MDX component) makes adding one any easier than reaching for a raw `<img>` or, evidently, plain CSS.
