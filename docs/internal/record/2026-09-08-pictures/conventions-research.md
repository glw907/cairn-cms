# Placing multiple photographs in long-form narrative posts: platform survey

Research date: 2026-09-07. Web search + fetch based; several claims are marked
"from memory" where a fetch was blocked (403) or search results didn't confirm
a precise detail, those are flagged inline rather than stated as fact.

## Medium

- Image widths: default is **inset, centered** (column width). **Outset** images
  scale "up to just a bit beyond the column width." **Screen-width** (full-bleed)
  images are the only type that grows further as the browser window resizes.
  Source: [Medium Post Formatting Guide, Cody Towstik](https://medium.com/@codytowstik/medium-post-formatting-guide-77e9f8307d32);
  corroborated by [Medium Image Guideline, Jeffrey Wang](https://jeffreywang1183.medium.com/medium-image-guideline-b0e2c4947d90)
  (this second source blocked a full fetch, 403; width-tier framing taken from
  search snippet only, treat as secondary confirmation).
- **Image grids**: selecting multiple images at once in the image tool makes
  Medium auto-lay them into a grid. Search-snippet summary caps a single grid
  at **3 images in a row** (2 side-by-side, or 3 across); with 2 images each
  becomes ~500px wide. Source:
  [Introducing image grids, The Medium Blog](https://blog.medium.com/introducing-image-grids-c592e5bc16d8)
  (redirects to medium.com/blog/..., fetch blocked 403 both ways, this is the
  feature-announcement post, date not confirmed by direct fetch; treat the "2
  or 3, not 4" cap as search-snippet-sourced, moderate confidence, not
  page-verified).
- **Captions**: click an image, type, caption appears directly beneath it,
  no italics support. Source:
  [Medium Post Formatting Guide](https://medium.com/@codytowstik/medium-post-formatting-guide-77e9f8307d32).
  Grid captions specifically: search summary states Medium's grid does **not**
  show individual captions per image (this line actually came from the *Ghost*
  gallery-card search result, not Medium, flagging so it isn't misattributed;
  Medium's per-image caption behavior inside a grid was not independently
  confirmed by a fetched page).
- **Text wrap/float**: no evidence found of a true CSS-float text-wrap option
  in Medium's own editor. The "outset" and "screen-width" tiers are block-level
  breakouts, not text-wrapped floats. (Absence of a floated-image option is
  inferred from the consistent three-tier vocabulary across sources, not from
  an explicit "Medium has no float" statement, flag as inference.)
- **Lightbox**: clicking an image shows it enlarged ("bigger"), per the search
  summary of Medium's grid feature, functions as a simple click-to-enlarge,
  not confirmed whether it's a full lightbox overlay with navigation.

## Ghost (editor cards)

- **Image card** widths: **regular** (column width), **wide** (wider than
  column), **full** (edge-to-edge/full viewport width), "though this can vary
  depending on the theme." Source:
  [Ghost editor cards, ghost.org/help/cards](https://ghost.org/help/cards/)
  (fetched directly).
- **Gallery card**: fetched page confirms "image galleries of up to 9 images
  at a time, all... responsively optimized." A separate search result
  (not independently fetched) adds more structural detail: dragging one image
  onto another starts a gallery; **rows of up to 3**; the gallery **does not
  show individual captions** (only a caption for the group, or none). HTML
  uses `kg-gallery-card` / `kg-width-wide` classes. Sources:
  [ghost.org/help/cards](https://ghost.org/help/cards/) (9-image cap,
  fetched directly); rows-of-3 and no-per-image-captions claims are from the
  search snippet only (secondary source: developer docs page referenced in
  search results, not independently fetched, moderate confidence).
- **Before/after card**: **not found** in Ghost's own documentation. The
  fetched help page and search results turn up no native before/after
  comparison card as of Ghost 6 (30+ card types exist, image, gallery, video,
  markdown, HTML, embed, etc., but no before/after type is documented).
  Recommend treating "Ghost has a before/after card" as **false** unless a
  theme/plugin adds one; several third-party posts exist about theme-level
  workarounds (e.g. a "carousel" alternative), not a built-in card.
  Sources: [ghost.org/help/cards](https://ghost.org/help/cards/) (fetched);
  [Ghost editor cards, Subtle theme docs](https://subtle.justgoodthemes.com/editor-cards/);
  [Ghost carousel add-on, Spectral Web Services](https://www.spectralwebservices.com/blog/ghost-carousel/).

## Substack

- Native **image galleries** shipped as a "long-requested feature": upload
  multiple images side-by-side from within the editor via the photo dropdown
  → "add gallery," producing "a pretty grid layout." Source: Substack's own
  announcement, [@Substack on X](https://x.com/Substack/status/1591267527803686912),
  and [Substack product-news recap, Nov 2022](https://on.substack.com/p/product-news-nov22)
 , this dates the gallery feature's launch to **November 2022**.
- Single images: standard insert with editable **caption and alt text**, and
  adjustable width; per Substack's own help center,
  [How can I edit images on a Substack post](https://support.substack.com/hc/en-us/articles/4414829453204-How-can-I-edit-images-on-a-Substack-post).
  Editing features (caption, alt text, watermark, width) are web-editor-only,
  not available on the mobile app editor.
- No evidence of a text-wrap/float option in Substack's editor; galleries are
  block-level grids, matching the Medium/Ghost pattern.

## Squarespace

- **Image block** (single image): default layout is **inline**, with optional
  caption below or overlaid on the image. Source:
  [Squarespace Help, Image blocks](https://support.squarespace.com/hc/en-us/articles/205814528-Image-blocks)
  (via search snippet; page not independently fetched, high confidence given
  it's Squarespace's own help center).
- **Gallery block** (multiple images): separate block type from the single
  Image block; default Gallery layout is a **uniform grid** with same-size,
  same-aspect images arranged evenly; other layouts (slideshow, stacked,
  masonry) are switchable after creation via the Design tab. Source:
  [Squarespace Help, Gallery blocks](https://support.squarespace.com/hc/en-us/articles/206543407-Gallery-blocks).
- No native float/text-wrap for inline images in the standard block editor;
  Squarespace's model is the same "separate block type for a multi-image row"
  pattern as Ghost and Substack, not an in-flow grid-while-typing like Medium.

## Webflow (blog CMS rich text)

- Images inside a **Rich Text** element default to roughly **half-width**;
  width is adjustable via presets or a manual pixel/percent value (the
  "wrench" icon). Source: search snippets citing
  [Webflow forum, rich text image width](https://discourse.webflow.com/t/help-with-width-of-images-in-rich-text/290891)
  and [Webflow Rich Text element overview](https://help.webflow.com/hc/en-us/articles/33961256808467-Rich-text-element-overview)
  (not independently fetched).
- **Captions**: an optional caption inserted below an image is auto-wrapped in
  semantic `<figure>`/`<figcaption>` markup. Source:
  [How to add a caption to a figure/image in a Rich Text field, Webflow Help (mirror)](https://help.webflow.com.cach3.com/article/how-to-add-a-caption-to-a-figure-image-in-a-rich-text-field).
- No native multi-image "row" or gallery construct inside the Rich Text
  editor itself; a demo site exists
  ([Webflow Rich Text Element Image Row](https://rte-image-rows.webflow.io/))
  showing this is a custom-built pattern developers assemble with combo
  classes, not a first-class editor feature, Webflow is CMS/designer-driven,
  so a "row of images" in a blog post is typically hand-built layout, not an
  editor primitive the way Medium/Ghost/Substack ship one.

## Editorial sites (The Verge, NYT, The Atlantic)

Fetches to primary Verge/NYT longform pieces were not attempted directly
(search only); confidence here is lower than the platform sections above.

- General pattern from search results: longform news/feature sites lean on
  **full-bleed, block-level figures**, not CSS-float text wraps, especially
  for hero and section-break images. One CSS snippet surfaced from an NPR
  bundle explicitly sets `float: none` on full-bleed story elements, which is
  consistent with (but not proof of) the same convention at NYT/Verge-style
  outlets. Source: search-result mention of NPR's `newsStory` CSS bundle
  (not independently fetched, treat as illustrative, not a Verge/NYT-specific
  citation).
- The NYT's "Snowfall" (2012) is repeatedly cited as the template that
  popularized full-bleed, parallax, block-level imagery for longform digital
  storytelling, discouraging inline float-wrapped images in favor of
  section-break visuals. Source:
  [7 examples of engaging feature stories, Shorthand](https://shorthand.com/the-craft/engaging-feature-stories/index.html);
  [Parallax scrolling brings NY Times article to life, Creative Bloq](https://www.creativebloq.com/web-design/parallax-scrollling-gives-life-gorgeous-illustrations-10134797).
- **No direct evidence was gathered** (via fetch) of The Verge's or The
  Atlantic's specific current CSS for image placement in longform pieces;
  this survey did not confirm float-vs-block treatment on those two sites
  specifically. Flag this as an open gap, a targeted fetch of a live Verge
  or Atlantic feature article's rendered DOM would be needed to state their
  current behavior with confidence, rather than the general editorial-design
  pattern described above.
- General expectation, from memory/pattern rather than a fetched source: at
  narrow (mobile) widths, virtually all of these treatments collapse to a
  single block-width image regardless of desktop layout, float and
  side-by-side grid layouts un-float and re-stack vertically below a
  breakpoint. This is standard responsive practice, not a site-specific
  finding, and it is well supported by the accessibility/CSS-float sources
  below but not verified against The Verge/NYT/Atlantic's actual mobile CSS
  in this pass.

## Accessibility guidance on floats vs. block figures

- Screen readers read **HTML source order**, not visual/CSS position; a
  `float: right` image placed early in the DOM to appear visually later
  creates a mismatch between visual order and reading order for
  assistive-technology users. Guidance: keep the image's source-order
  position matching where it should be encountered in the narrative, and wrap
  it in a semantic `<figure>` (with `<figcaption>` for the caption) so
  structure survives regardless of CSS. Sources:
  [Accessibility at Penn State, CSS: Ensuring Text Order Is Logical](https://accessibility.psu.edu/css/readorderhtml/);
  [Logical Reading Order, DAISY Accessible Publishing Knowledge Base](https://kb.daisy.org/publishing/docs/html/order.html);
  general WCAG 1.3.1/1.3.2 framing (content structure programmatically
  determinable; meaningful sequence) via
  [Orange digital accessibility guidelines, WCAG 1.3.2 test](https://a11y-guidelines.orange.com/en/articles/test-wcag-132/).
- NN/G-specific guidance on floated images was **not found**; search turned
  up NN/G material on accessible visuals generally (contrast, not relying on
  color alone, alt text) but nothing float-specific. Sources checked:
  [NN/G, Visual Treatments that Improve Accessibility (video)](https://www.nngroup.com/videos/visual-treatments-accessibility/);
  [NN/G, Alt Text: Avoid Redundancy (video)](https://www.nngroup.com/videos/alt-text-to-improve-usability/).
  Treat "NN/G has published float-specific guidance" as **not confirmed** by
  this survey.
- General technical framing: CSS `float` is not deprecated but is now
  considered appropriate *only* for its original purpose (wrapping text
  around an image), not for page layout, which Flexbox/Grid now own. Source:
  [Is CSS float deprecated?, CSS-Tricks](https://css-tricks.com/is-css-float-deprecated/).
- No dedicated reader-behavior research (e.g., eye-tracking or engagement
  studies specifically on image grids inside narrative text) was located in
  this pass. This is a genuine gap, not a "checked and found nothing", the
  searches run here were about editorial/accessibility conventions, not
  empirical reading-behavior studies, and a dedicated search (e.g., NN/G eye
  tracking, or academic HCI databases) would be needed to answer that part of
  the brief with evidence rather than by omission.

## Synthesis

**(1) The modern consensus placement set.** Across Medium, Ghost, Substack,
and Squarespace, the pattern converges on the same three-tier width model , 
roughly **inset/regular** (column width), **wide/outset** (breaks the column
by some margin), and **full/screen-width** (edge-to-edge), applied to a
single image. True CSS-float text-wrap (text running down the side of an
image) is **not offered as an editor primitive on any of the four**
platforms surveyed; where float survives at all, it is in hand-coded
implementations (Webflow custom builds, older WordPress themes, CSS-Tricks'
own "creative" long-form techniques) or in editorial features specifically
choosing full-bleed block treatment (NYT "Snowfall"-style). The practical
takeaway: floats are a still-valid CSS tool for the rare case, but the
authoring-platform default across the mainstream field is block-level,
non-wrapped figures at one of a few fixed widths.

**(2) How a row of 2–3 images is composed.** Every platform that supports a
multi-image row does it as a **discrete block/card type** (Ghost's Gallery
card, Substack's Gallery, Squarespace's Gallery block, Medium's auto-grid on
multi-select), not as inline floats accumulating side by side. Row images
render at roughly equal heights in a uniform grid (Squarespace explicitly
states "same size and dimensions arranged uniformly"; Ghost's gallery
produces rows up to 3 per search-result detail). Exact gutter sizing was not
independently confirmed for any platform in this pass, no source specified
a pixel gutter value; treat any specific gutter number as unverified. All of
these grids collapse to a single column (stacked, full width) below some
mobile/tablet breakpoint; this is standard responsive practice for grid
layouts generally, though not confirmed per-platform via fetched CSS in this
survey.

**(3) The caption convention.** The consistent pattern is **per-image
captions on single-image placements** (Medium, Substack, Webflow's
`<figcaption>` all support this), but **degraded or group-level captions on
multi-image grids**: Ghost's gallery card is reported to not show individual
per-image captions; Medium's grid caption behavior specifically was not
confirmed by a fetched source in this pass. The safest generalization,
moderate confidence: single images get rich per-image captions; grids/galleries
tend to drop to either no caption, one caption for the group, or a
simplified per-image caption depending on platform, this is not a fully
uniform convention and should be verified against each platform's live
editor before being treated as fixed.

**(4) Whether a lightbox is standard.** Partial evidence only. Medium's grid
supports click-to-enlarge. WordPress has shipped a native "Expand on click"
lightbox since 6.4. Webflow has a first-class Lightbox element usable
anywhere, including embedded in rich text via a link block. No confirmation
was found either way for Ghost's or Substack's gallery cards specifically
having lightbox-on-click behavior, this should be treated as an open
question, not assumed present or absent.

**(5) The author affordance for making a row.** Two distinct authoring
models emerged:
  - **Auto-detect on multi-select/drag** (Medium: select several files in the
    image picker and it auto-lays a grid; Ghost: drag one image onto another
    in the editor to start a gallery card).
  - **Explicit block/menu insertion** (Substack: photo dropdown → "Add
    gallery"; Squarespace: insert a distinct Gallery block, separate from the
    Image block; Webflow: no built-in row primitive at all, a developer
    hand-builds it with combo classes inside Rich Text, which is the outlier
    among the five).
  No platform surveyed uses a text-editor shortcode (e.g., `[gallery ids=...]`)
  as its primary modern authoring path; that pattern is more associated with
  classic WordPress and was not independently verified in this pass since
  WordPress's own gallery block wasn't part of the assigned survey scope.
