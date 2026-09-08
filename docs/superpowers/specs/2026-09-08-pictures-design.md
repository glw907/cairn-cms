# Pictures design (a row in the narrative, and a post gallery with a viewer)

> Status: REVISION 2, folded 2026-09-08 from the three-lens adversarial review (grounding and
> feasibility, design and accessibility, charter and precedent; record
> `docs/internal/record/2026-09-08-pictures/spec-review.md`, fold brief `fold-brief.md`).
> PARKED for Geoff's read: the design changes paint, and six taste calls in the last section
> are his. Brainstormed 2026-09-07 with Geoff; his calls: pictures live in the narrative's flow
> (a grid is the wrong frame for that); a gallery for a post is a separate thing the story
> references and that cycles through captioned pictures; the row carries ONE shared caption;
> the design follows modern conventions and is easy for the author. Everything else is the
> spec's own reading. Inputs banked beside the review (the platform-convention survey and the
> engine and theme mechanics).

## What exists and what is missing

A picture in the narrative is the engine's reserved `figure` directive: the editor's "Wrap the
image at the cursor in a figure" button gives it a caption and a placement from the closed set
(the measure default, `center`, `wide`, `full`), the figure step lifts the one media image into
`<figure>`, and the chassis supplies the geometry. That matches the width model every
mainstream platform in the survey converged on (Medium, Ghost, Substack, Squarespace), and no
platform in the survey documents a text-wrapped float option, so the single-picture vocabulary
is complete. What is missing is the one multi-picture shape those platforms all have: two or
three pictures as one figure in a row.

A gallery for a post exists as the showcase's `gallery` frontmatter field, an `array(image)`
the container editor drives end to end in e2e, and nothing renders it. The image value already
carries an optional `caption`, so the field is the gallery's data shape as it stands.

Three facts from the mechanics research shape everything below. The figure step returns the
first media image and stops, and its no-blank-line branch stamps the trailing paragraph as the
caption without re-checking for text, so two pictures in one figure today make the second
picture the caption; the editor's `readCaption` mirrors the same hole. The placement set is
closed and single-valued (`{.wide .row}` drops the role). And the showcase's media fixtures do
not exist as bytes: the manifest's one row is not among the dev package's seeded keys, so the
hello post's hero 404s in the e2e server today and nothing asserts otherwise.

## Decisions

1. **A row is a shape, not a placement.** The figure step lifts every media image in the
   directive's body (one to three, in document order); a figure holding more than one is a row,
   marked `cairn-figure-row` and nothing else. No count reaches the DOM: the sanitize floor
   admits no `data-*` attribute outside the registry markers (`sanitize-schema.ts:13,31`), the
   `sizes` step counts the figure's image children off the mdast before the floor runs, and the
   grid sizes its columns intrinsically. A row takes the measure default, `wide`, or `full`;
   `center` stays a single-picture placement (`site.css`'s 22rem image cap is written for a
   portrait or a detail shot), so the editor's placement radiogroup drops `Center` for a row,
   which changes the roving-tabindex arithmetic in `MediaFigureControl.svelte`. A row is a
   managed-media shape by design: the lift matches only `media:` tokens (`remark-figure.ts:52`),
   so pictures pasted as plain web addresses stay a stacked figure and form no row, and the
   reference page and the editors doc both say so. A fourth picture is refused where the author
   is standing: the editor's wrap declines a run longer than three and says why ("A row holds
   at most three pictures"), through the same non-blocking surfacing `MediaFigureControl`
   already uses for the decorative-plus-caption contradiction; at render, four or more degrade
   rather than throw (the first three lift as a row, the rest stay ordinary images in the
   body, and the step emits a log event so an operator sees it), matching `glyph.ts:12` and
   `remark-figure.ts:90-92`, since a render throw would take a non-technical author's Publish
   down with the only diagnostic in a CI log.
2. **One shared caption** (Geoff): the body text after the pictures, as today. Each picture
   keeps its own alt text. The caption names the figure group through `<figcaption>`, which
   satisfies WCAG 1.3.1 with no ARIA; the figure never carries `aria-label` or
   `aria-labelledby`, either of which would suppress the caption as the name. The latent
   caption bug is fixed on both sides in the same change, since the row's own authoring form is
   exactly the case it breaks: the render step's no-blank-line branch (`remark-figure.ts:106-118`)
   re-runs the text check the blank-line branch already does, and `readCaption`
   (`markdown-format.ts:388`) gets the same guard; fixing one without the other turns a render
   bug into editor data loss.
3. **The pictures are the figure's direct children.** The `sizes` resolver reads the placement
   off the image's direct parent, so the `<figure>` itself is the grid and no wrapper is
   introduced; the marker class is additive and the resolver's role scan is unaffected.
4. **The row's `sizes` hint** (posture open for Geoff, taste call T3). Whatever the posture,
   two facts hold: `roleFromParent` widens to a figure-context read returning `{ role?, count }`
   with an explicit measure-default entry (a measure row carries no `cairn-place-*` class today
   and would otherwise fall to the `100vw` worst case); and the formula subtracts the gap,
   `(min-width: <stack width>) calc((<role width> - (N - 1) * <gap>) / N), 100vw`, over-declaring
   against the engine's own role widths and never under-declaring. A row whose assets are all
   under 800px gets no srcset and therefore no hint, by the existing single-candidate refusal.
   The hint is provable only by engine unit tests over a resolver with transformations forced
   on; the showcase runs with them off. The ruling on the posture is filed in the ledger either
   way, since it carries no figure, placement, or srcset entry today.
5. **The row's geometry lives in `examples/showcase/src/theme/site.css`, beside the
   `.cairn-place-*` placement rules**, which is where that file's own header puts figure
   geometry and where the cascade requires it: `prose.css` is `@layer components` in its
   entirety, `site.css` is unlayered, and an unlayered site rule beats a layered one regardless
   of specificity (chassis README, "Cascade layers"). Three existing `site.css` rules gain a
   `:not(.cairn-figure-row)` guard in the same change: the `> * + *` caption fallback (which
   would put caption typography and a stray `margin-top` on pictures two and three), the
   `max-height: 32rem` cap (which would silently override the row's declared shape at 2560),
   and the `height: auto` rule if the equal-height mechanism is anything but `aspect-ratio`.
   The caption spans the row: `figure.cairn-figure-row > figcaption, figure.cairn-figure-row >
   p { grid-column: 1 / -1; }`, the `> p` arm catching the raw-`<p>` caption fallback. The row
   copies the composition idiom otherwise: mobile-first single column, the gap as an
   overridable custom property, the comment that a media query cannot read a token. No crop in
   the stacked state. `--cairn-figure-row-gap` and `--cairn-figure-row-aspect` are the override
   seams. The height rule and the stacking rule are Geoff's (T1, T2). The `.cairn-place-wide`
   caption's measure return, absent today, is decided in the same task.
6. **The author affordance is the button they already use, and its label is the discovery
   mechanism.** With the caret in a run of two or three pictures, `figureLabel`
   (`figure-editor.svelte.ts:84-91`) reads "Wrap these N pictures in a figure", and for an
   existing row "Edit the row at the cursor"; the dialog title reads "Row of N pictures" and
   offers the shared caption and the placement without `Center`. `decorative` stays
   per-picture and leaves the shared dialog; `decorativeWithCaption` warns for a row when every
   picture is decorative. The Markdown help entry carries the row too. No new toolbar item.
7. **The gallery renders from the existing field with no schema change**, as a plain Svelte
   component `Gallery.svelte` in the article view between the body and the related list (the
   island machinery exists for directive-emitted content and is the wrong tool here), with
   `id="cairn-gallery"` (namespaced so it cannot collide with a `rehypeSlug` id from a body
   heading named "Gallery") and an `h2` heading, a sibling of the body's top-level sections. The
   editors doc gives the author the exact link text and says the anchor is dead while the field
   is empty. The `Carousel.svelte` retire (chassis-A's) lands first and the viewer does not
   resurrect it.
8. **The gallery works without scripting, then gets a viewer.** The grid (three across, two at
   the tablet width, one on a phone) links each picture to its largest available source. With
   scripting, selecting a picture opens a native `<dialog>` viewer that cycles the set, adopting
   the admin dialog recipe's BEHAVIORAL contract and none of its classes (the chassis excludes
   DaisyUI's `modal` and `carousel` from the public build, so the box is hand-written over
   chassis tokens; DaisyUI's carousel is a scroll-snap strip with no keyboard contract and is
   reused deliberately not at all): opened with `showModal()` (the focus trap and Escape for
   free); `aria-labelledby` pointing at its own visible title; focus moves to the close button on
   open and returns to the picture that opened it on close; previous and next are real buttons
   with accessible names and a pointer target of at least 24 by 24 CSS px (44 recommended), and
   they wrap so no disabled state exists; a visible position indicator ("3 of 7") sits with the
   caption in a container carrying `aria-live="polite"` that exists from the moment the dialog
   opens; the caption is visible text and not also `aria-describedby`; the backdrop fade and the
   between-picture transition are removed, not shortened, under `prefers-reduced-motion`; page
   scroll is locked with no layout shift. Swipe is not in the first pass (T4). Whether the
   dialog's behavior is a chassis primitive or a theme component is Geoff's (T6).
9. **Frontmatter images resolve their own URLs, without a srcset this pass.** The projection
   lives in `examples/showcase/src/chassis/entry-data.ts` beside `withReferences`, so the
   prerendered route and the preview route both carry it (a projection in one route's load
   would ship a gallery that disappears in preview, which `ArticleView.svelte`'s contract
   forbids). It resolves each picture through the public `createMediaResolver` into
   `{ src, alt, caption }` plus intrinsic `width`/`height` from `readCommittedManifest`, so the
   grid sets dimensions and avoids layout shift. No srcset: `MediaImageDetail`,
   `MediaResolveWithDetail`, and `variantUrl` are deliberately withheld from the `/media`
   barrel (its header states the policy), and widening that seam is its own scoped change with
   a reference page and a `check:surface` cost.
10. **Two passes after chassis-B2, the row first, both under B1's paint protocol** (before and
    after captures, the committed intended-moves manifest, contact sheets, the verifier loop,
    Geoff's five-viewport read as the merge gate). The halves share one artifact (the fixture
    post) and depend on each other nowhere; the media-fixture task is first in the row pass and
    both depend on it. Contended files, so the passes run sequentially or in two worktrees:
    `site.css`, `prose.css`, the reading-surface fixture post, the styleguide route, the
    `site-visual` baselines. Each pass carries its own `emit:template` rebake. Each pass ends by
    enumerating what it built, asking of each item whether it is a mechanic or a choice, and
    banking the harvest before reporting done, triaged through `engine-triage` against the
    rulings ledger. Ceilings are set at plan time from chassis-A's observed per-task rate.

## The row pass (engine, editor, chassis), seven tasks

1. **Media fixtures and seeded bytes** (first; blocks every visual proof in both passes):
   manifest rows in `examples/showcase/src/content/.cairn/media.json` with realistic
   dimensions, matching keys in the dev package's `SEED_MEDIA_KEYS`
   (`packages/cairn-cms-dev/src/fake-github.ts`), bytes proportioned to the declared width and
   height rather than the flat 240 by 160 default; the standing gap closed (`00112233445566aa`
   seeded) and `media-hero.spec.ts` gaining a response-status assertion so it cannot reopen.
2. **The render step**: `findMediaImages` replaces `findMediaImage`; the unwrap lifts one to
   three in document order; the no-blank-line branch re-runs the text check; the figure gains
   `cairn-figure-row` and nothing else; four or more degrade with a log event; the marker
   proven to survive `buildSanitizeSchema` in a rendered-output assertion.
3. **Count-aware `sizes`** per decision 4 and the T3 ruling, provable over a
   transformations-on resolver.
4. **The formatter goes N-image** (the correctness-critical task; an Opus upshift candidate):
   `FigureAtImage` gains the sibling-image list; `figureAtImage`, `wrapImageInFigure`,
   `updateFigure`, and `unwrapFigure` rebuild every token rather than the first, so a caption
   edit cannot drop pictures two and three; `readCaption` gets the caption-bug guard; every
   media token byte-identical through wrap, edit, and unwrap; the existing formatter cases
   green untouched.
5. **The editor surface**: `figureLabel`'s new strings, the dialog title, `Center` dropped for
   a row with the roving-tabindex arithmetic corrected, `decorative` per-picture, the
   `RESET_BLOCK` contract respected.
6. **The row's geometry** per decision 5 and the T1 and T2 rulings; the styleguide gains a
   figure section (single and row) baselined at five widths in both schemes; the
   reading-surface fixture post gains a media-token single figure and a row (today's article
   baselines exercise only raw URLs, so they never reach the unwrap).
7. **Docs, changelog, harvest**: `docs/reference/render.md`'s emitted-class registry gains the
   whole figure family in one change (`cairn-place-center`/`-wide`/`-full`,
   `cairn-broken-media`, `cairn-figure-row`; none is listed today), with the admin `cairn-*`
   collision grep the registry's own note requires; the media-only precondition on the
   reference page and the editors doc; the editors doc's "Wrap the image" section carrying the
   row's five author-facing facts (how to make one, the limit of three, the shared caption
   with per-picture alt, that pictures may be cropped to a shared shape so a portrait with its
   subject near an edge is a poor row candidate, that a plain web address forms no row) with
   the singular caption and placement bullets each gaining a plural case; the Markdown help
   entry; `CHANGELOG.md` under `## Unreleased` with a `Consumers must:` line for the caption
   fix (a behavior break, since a two-image figure written without a blank line renders
   differently after it, and `check:surface` cannot see emitted HTML) and for the theme sheet a
   consumer must copy to get the row's geometry; `emit:template`; the harvest and the `sizes`
   ruling filed.

## The gallery pass (theme), five tasks

1. **The projection** per decision 9.
2. **`Gallery.svelte`**: the section, the `h2`, the grid, the no-JS link with its accessible name
   (carrying the caption when the grid shows none, T5), the width band, the loading strategy.
3. **The viewer** per decision 8; the `daisyui-a11y-reviewer` gates it; the sizing departure
   from the admin's viewport rule recorded.
4. **Proof**: component tests for the keyboard and focus contract; the fixture post's
   three-picture gallery baselined at five widths in both schemes; an e2e case that opens,
   cycles with the arrow keys, closes with Escape, and asserts the focus return (including that
   the sticky header does not cover the restored thumbnail).
5. **Docs, changelog, harvest**: the editors' `add-an-image.md` (add pictures under Gallery in
   Details, each with alt text and a caption; alt text is still required and is not the
   caption; where the caption shows; the exact link text to type), the chassis README's file
   table, `what-the-scaffold-wrote.md`, `public-design-system.md`'s dialog section, the
   container-field e2e gaining a caption assertion, `emit:template`, the harvest.

## Out of scope

Text-wrapped floats (no platform in the survey documents one; the accessibility guidance favors
block figures); per-picture captions in a row (Geoff's call); a masonry layout; more than three
pictures in a row (the gallery is the shape for more); a gallery placed inline by directive (the
anchor is the reference; a directive can come later); any engine island; a gallery srcset (the
barrel widening is its own change); swipe in the first pass; the consumer sites' chassis copies
(their own passes).

## Risks

- The visual proof rests on `media:` fixtures that have neither manifest rows nor seeded bytes,
  and the gap spans a second package (`packages/cairn-cms-dev`); the fixture task lands first.
- The caption fix changes the output of any existing two-image figure written without a blank
  line. The survey of ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, and cairn-pub for
  that shape is a pass PRECONDITION; a hit is a blocking input to the changelog wording, which
  then states the before and after.
- A consumer that upgrades the engine before copying the new theme sheet gets the row's class
  with none of its geometry, and the `> * + *` caption typography on pictures two and three;
  the `Consumers must:` line names the sheet.
- The gallery ships without a srcset this pass, and with transformations off the grid loads
  full-size originals; the fixture's pictures are sized accordingly.
- The reading-surface and styleguide baselines move by design; both passes run under B1's
  protocol and its intended-moves manifest.
- The first public dialog sets precedent; the admin's behavioral recipe is the standard it
  imports, and the a11y reviewer gates it.

## Open taste calls for Geoff

No fact in the tree settles these. Each carries the reviewers' evidence and a recommendation.

- **T1, the row's equal heights.** (a) A fixed aspect with `object-fit: cover`, ratio named
  (3:2 fits the showcase's landscape content; a 3:4 portrait in a 3:2 cell keeps 44% of its
  height with no `object-position` seam to save a subject near an edge). (b) A justified row
  from intrinsic dimensions (the Flickr shape: each picture grows in proportion to its own
  aspect, heights match by construction, no crop; the engine already writes intrinsic
  width and height on every resolved media image; needs a fallback when they are absent).
  (c) Tallest matches, tops aligned. **Recommendation: (b), with (a) at 3:2 as the fallback**;
  it is the only option that never silently discards part of a picture a story depends on. If
  (b) reads as too clever for a first row, take (a) at 3:2 and add `--cairn-figure-row-fit`
  and `object-position` as seams. Either way, no crop in the stacked state.
- **T2, where a row stacks and what stops it at 2560.** (a) One `min-width: 48rem` query for
  every count and role: a measure three-up then promotes at the moment each picture is about
  219 px wide, a thumbnail strip in a reading column. (b) Promote by count and role (a
  measure row caps at two columns; a three-up forces `wide`). (c) An intrinsic
  `repeat(auto-fit, minmax(<floor>, 1fr))` grid with a named minimum picture width, which
  composes at both ends with no media query and matches `site.css`'s existing idiom (that
  sheet has no width breakpoint at all). **Recommendation: (c) for the geometry with a floor
  of about 260 px and the row capped at the wide band, plus a declared stack width for the
  `sizes` hint alone.** If that is too much machinery, take (b).
- **T3, the `sizes` posture.** (a) `100vw`, no row hint. (b) The engine states 48rem as its
  default breakpoint, which breaks the resolver's recorded refusal ("not any one theme's exact
  breakpoints"; dimensions "omitted when unknowable, never guessed") and lifts one site-layer
  constant into the engine. (c) An optional adapter field (`rowStackWidth`) with no engine
  default, so a site that supplies it gets a divided hint and one that does not gets `100vw`.
  **Recommendation: (c) with (a) as the default**, the leanest seam that closes the over-fetch
  and leaves the code comment true.
- **T4, swipe on phones.** Not required (the buttons are the single-pointer alternative WCAG
  2.5.1 asks for). **Recommendation: buttons and keyboard first; swipe as the first harvest
  item** once the a11y contract is banked.
- **T5, captions in the grid or only in the viewer.** Both forces every cell to be a `<figure>`
  inheriting the article's figure margins and cap. **Recommendation: viewer only, with the
  caption in the grid link's accessible name**; if you want it visible in the grid, the cells
  opt out of the named `.site-main figure` rules.
- **T6, the dialog behavior as a chassis primitive now, or a harvest item.** The mechanic half
  (open and close, focus return, Escape and arrow cycling, reduced motion, the no-scripting
  fallback) recurs on any cairn site; the choice half (columns, heading, type, gap) is the
  theme's. **Recommendation: the grid stays in the theme; the dialog's behavior lands as a
  chassis primitive on the `theme-toggle.ts` model.** If you prefer to see it work once first,
  keep both in the theme and make the promotion the pass's named harvest item.
