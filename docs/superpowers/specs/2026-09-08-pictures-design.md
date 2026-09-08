# Pictures design (a row in the narrative, and a post gallery with a viewer)

> Status: DRAFT for adversarial review, 2026-09-08, then PARKED for Geoff's read (the
> design changes paint and the remaining calls are taste). Brainstormed 2026-09-07 with
> Geoff; his calls: pictures live in the narrative's flow (a grid is the wrong frame for
> that); a gallery for a post is a separate thing that the story references and that cycles
> through captioned pictures; the row carries ONE shared caption; the design follows modern
> conventions and is easy for the author. Inputs banked under
> `docs/internal/record/2026-09-08-pictures/` (the platform-convention survey and the
> engine and theme mechanics).

## What exists and what is missing

A picture in the narrative is the engine's reserved `figure` directive: the editor's "Wrap
the image at the cursor in a figure" button gives it a caption and a placement from the closed
set (the measure default, `center`, `wide`, `full`), the figure step lifts the one media image
into `<figure>`, and the chassis supplies the geometry. That matches the width model every
mainstream platform converged on (Medium, Ghost, Substack, Squarespace), and none of them
ships text-wrapped floats anymore, so the single-picture vocabulary is complete. What is
missing is the one multi-picture shape those platforms all have: two or three pictures as one
figure in a row.

A gallery for a post exists as the showcase's `gallery` frontmatter field, an `array(image)`
the container editor drives end to end in e2e, and nothing renders it. The image value already
carries an optional `caption`, so the field is the gallery's data shape as it stands.

Two facts from the mechanics research shape everything below. The figure step returns the
first media image and stops, and its no-blank-line branch stamps the trailing paragraph as
the caption without re-checking for text, so two pictures in one figure today make the second
picture the caption. And the placement set is closed and single-valued (`{.wide .row}` drops
the role), so a row cannot be a fifth placement without changing the attribute contract.

## Decisions

1. **A row is a shape, not a placement.** The figure step lifts every media image in the
   directive's body (one to three; a fourth is an author-input error the step reports the way
   an unknown icon name is reported); a figure holding more than one is a row, marked
   `cairn-figure-row` with `data-count`, and it still takes any placement from the closed
   set, so a row can sit at the measure, wide, or full. The attribute contract is unchanged.
2. **One shared caption** (Geoff): the body text after the pictures, as today. Each picture
   keeps its own alt text. The latent caption bug is fixed in the same change, since the row's
   own authoring form (consecutive image lines) is exactly the case it breaks.
3. **The pictures are the figure's direct children.** The `sizes` resolver reads the placement
   off the image's direct parent, so the `<figure>` itself is the grid and no wrapper is
   introduced; the marker class is additive and the resolver's role scan is unaffected.
4. **The engine states a row's `sizes` against its documented default breakpoint** (48rem,
   the chassis's own): `(min-width: 48rem) <role width divided by N>, 100vw`. The engine still
   refuses to know a theme's breakpoints; a theme that stacks elsewhere accepts a conservative
   hint, and the reference page says so.
5. **The row's geometry is a chassis mechanic in `prose.css`**, under `@layer components`,
   copying the composition idiom (mobile-first single column, one `@media (min-width: 48rem)`,
   the gap as an overridable custom property, the comment that a media query cannot read a
   token): equal heights by a fixed aspect ratio with `object-fit: cover` inside rows, the
   single-figure `max-height` rule in `site.css` untouched for singles and inert for rows.
6. **The author affordance is the button they already use.** Consecutive picture lines wrapped
   with "Wrap the image at the cursor in a figure" become a row when the block holds more than
   one media image; the dialog's title reads "Row of N pictures" and offers the shared caption
   and the placement. No new toolbar item.
7. **The gallery renders from the existing field with no schema change**, as a plain Svelte
   component in the article view between the body and the related list (the island machinery
   exists for directive-emitted content and is the wrong tool here), with `id="gallery"` and a
   heading so the story can reference it by link.
8. **The gallery works without scripting, then gets a viewer.** The grid (three across, two at
   the tablet width, one on a phone) links each picture to its largest variant. With scripting,
   selecting a picture opens a native `<dialog>` viewer that cycles the set: previous and next,
   the caption, arrow keys, Escape, close, focus returned to the picture that opened it,
   reduced motion honored. The public design system imports the admin's dialog recipe for
   this, its first public dialog.
9. **Frontmatter images resolve their own URLs.** The hero path returns a bare URL and there
   is no projection for `array(image)`, so the showcase's page load resolves each gallery
   picture through the public media resolver into `{ src, srcset, alt, caption }`, with the
   variant ladder when transformations are on and the bare path when they are off.
10. **One pass, after chassis-B2, engine half first**, under B1's paint protocol (before and
    after captures, the committed intended-moves manifest, contact sheets, the verifier loop,
    Geoff's five-viewport read as the merge gate).

## The row (engine and chassis)

- `remark-figure.ts`: `findMediaImages` replaces `findMediaImage`; the unwrap lifts every
  media image as a direct child in order; the caption scan skips every image-bearing block and
  re-runs the text check on the no-blank-line branch; the figure gains `cairn-figure-row` and
  `data-count="N"` when N is greater than one; four or more pictures fail loud at render with a
  message naming the limit (the same build-backstop posture as an unknown icon name). The
  markdown formatter's mirror of the role set is unchanged.
- `resolve-media.ts`: `SIZES_BY_ROLE` gains the row form per count and role against the
  documented 48rem default; the under-800px srcset guard is unchanged.
- The editor: `figure-editor.svelte.ts`'s wrap finds the paragraph at the cursor and, when it
  holds one to three consecutive media images, wraps them as one figure; edit and unwrap
  operate on the whole figure; the dialog title reflects the count; the editors doc's
  "Wrap the image" section gains one paragraph on rows.
- `prose.css`: `.prose figure.cairn-figure-row` as a grid per decision 5; `--cairn-figure-row-
  gap` and `--cairn-figure-row-aspect` as the override seams; the chassis README's component
  grammar names the row.
- Docs: `docs/reference/render.md` (the figure directive's row form and the emitted classes),
  `docs/editors/write-in-the-editor.md`, `docs/reference/core.md` if it shows the figure form,
  the emitted-class registry, `CHANGELOG.md` (additive; the caption-bug fix noted).
- Proof: unit tests on the figure step (one, two, three, four pictures; the caption with and
  without a blank line; a non-media image among media ones); the reading-surface fixture post
  gains a media-token single figure and a row (today's article baselines exercise only raw
  URLs, so they never reach the unwrap or the srcset); the styleguide gains a figure section
  (single and row) baselined at five widths in both schemes; the editor's wrap transform
  tested on a one-, two-, and three-picture paragraph.

## The gallery (theme)

- `PostGallery.svelte` in `src/theme/components`: props `pictures: { src; srcset?; alt;
  caption? }[]`; renders `<section id="gallery" aria-labelledby>` with a heading, an ordered
  grid of `<a href={largest}><img>`, and a `<dialog>` with the viewer; keyboard and focus per
  decision 8; captions rendered under the viewer's picture and as `figcaption` in the grid when
  present.
- The article page's server load projects `frontmatter.gallery` through the public media
  resolver; `ArticleView.svelte` renders the component between the body and `related` when
  the projection is non-empty.
- CSS: the grid and the dialog in the component's scoped styles over chassis tokens, the
  dialog recipe imported into `docs/internal/public-design-system.md` from the admin's.
- Docs: the editors' `add-an-image.md` gains the gallery paragraph (add pictures under Gallery
  in Details, each with alt text and a caption; the story can link to `#gallery`); the chassis
  README's file table; `what-the-scaffold-wrote.md`.
- Proof: a component test for the viewer's keyboard and focus contract; the reading-surface
  fixture post gains a three-picture gallery, baselined at five widths in both schemes; an e2e
  case opens the viewer, cycles with the arrow keys, closes with Escape, and asserts focus
  returned; the container-editor e2e for the field is unchanged.

## Out of scope

Text-wrapped floats (no platform ships them; the accessibility guidance favors block figures);
per-picture captions in a row (Geoff's call); a masonry layout; more than three pictures in a
row (the gallery is the shape for more); a gallery placed inline by directive (the anchor is
the reference; a directive can come later if a story needs the set mid-flow); any engine
island; the consumer sites' chassis copies (their own passes).

## Risks

- The fixture post and the styleguide gain pictures, so the reading-surface and styleguide
  baselines move by design; the pass runs under B1's protocol and its intended-moves manifest.
- The first public dialog sets precedent; the admin recipe is the standard it imports, and the
  a11y reviewer gates it.
- The `sizes` hint for a row is only right for a theme that stacks at 48rem; the reference
  page states the assumption, and a theme that stacks elsewhere gets a conservative hint, never
  a wrong one.
- The caption-bug fix changes the output of any existing two-image figure; the survey of the
  family sites' content for that shape is a pass-start step, and the changelog names it.
