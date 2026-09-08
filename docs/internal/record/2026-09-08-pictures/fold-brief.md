# Pictures spec fold brief (2026-09-08)

Consolidated from the three-lens review; revision 2 of the spec was written from it. Write-once.


Folds three adversarial reviews of `docs/superpowers/specs/2026-09-08-pictures-design.md`:
grounding (G1..G16), design and accessibility (D1..D40), charter and precedent (C1..C10).
Read-only; every fact below was re-verified against `main` (`d565ab77`) while folding.

Structure: §1 corrections (settled by fact or precedent, with exact replacement text),
§2 open taste calls for Geoff, §3 conflicts between lenses adjudicated, §4 sizing,
§5 verified sound.

---

## 1. Corrections, by spec section

**22 corrections.** Each is settled: a fact in the tree or a recorded precedent decides it, so
none needs Geoff. Replacement text is exact; where a line is struck the strike is stated.

### 1.1 Header / status (spec `:3-10`)

**K1, Geoff's calls and the spec's own additions are not separated** (C10).
*Defect:* the status block presents the spec's three consequential additions (the hard
three-picture cap enforced at build, the engine adopting a 48rem breakpoint, the first public
dialog as a standing precedent) as if they came out of the brainstorm.

*Add after the existing status paragraph:*

> Geoff's calls above are the brainstorm's. Everything else is the spec's own reading. Three
> additions are consequential and are marked open for his read: the three-picture cap and how it
> is enforced (decision 1), the engine's `sizes` posture for a row (decision 4), and whether the
> viewer's dialog sets a standing public precedent or is scoped to this component (decision 8).

### 1.2 "What exists and what is missing"

**K2, the float claim launders an inference into a fact** (G15).
*Defect:* the section says "none of them ships text-wrapped floats anymore" and Out of scope says
"no platform ships them", but the input record flags its own finding as inference
(`docs/internal/record/2026-09-08-pictures/conventions-research.md:33-37`).

*Replace* "and none of them ships text-wrapped floats anymore, so the single-picture vocabulary is
complete" *with:*

> and no platform in the survey documents a text-wrapped float option, so the single-picture
> vocabulary is complete.

*And in Out of scope, replace* "(no platform ships them; the accessibility guidance favors block
figures)" *with* "(no platform in the survey documents one; the accessibility guidance favors block
figures)".

### 1.3 Decision 1, a row is a shape, not a placement

**K3, `data-count` does not survive the sanitize floor, and no count is needed in the DOM**
(G1, D1, C2). *Blocking in all three lenses.*
*Defect:* `src/lib/render/sanitize-schema.ts:13` fixes the surviving data attributes to
`FIXED_MARKERS = ['dataPrimitive', 'dataSlot', 'dataRole', 'dataRise']`, and the `*` allowlist is
`[...(attributes['*'] ?? []), 'className', ...markers]`. `data-count` camelCases to `dataCount`,
which is in neither list, so the floor (`pipeline.ts:113`, after `remarkFigure`) deletes it. The
preview path is unsanitized, so the mechanism would appear to work in the editor and fail in
production. Separately, the count is not needed in the DOM at all: `sizes` is computed in
`resolve-media.ts` from the mdast, pre-sanitize, and a grid sizes N columns intrinsically.

*Replace decision 1's* "a figure holding more than one is a row, marked `cairn-figure-row` with
`data-count`, and it still takes any placement from the closed set" *with:*

> a figure holding more than one is a row, marked `cairn-figure-row` and nothing else. No count
> reaches the DOM: the sanitize floor admits no `data-*` attribute outside the registry markers
> (`sanitize-schema.ts:13,31`), the `sizes` step counts the figure's image children off the mdast
> before the floor runs, and the grid sizes its columns intrinsically, so neither CSS nor script
> needs to know N.

*And in "The row (engine and chassis)", replace* "the figure gains `cairn-figure-row` and
`data-count="N"` when N is greater than one" *with* "the figure gains `cairn-figure-row` when N is
greater than one".

**K4, a row exists only for `media:` tokens, and the spec never says so** (G2, D9).
*Defect:* `remark-figure.ts:52` gates on `parseMediaToken(n.url) !== null`, so two raw external
image URLs in one `:::figure` never unwrap and never become a row. This is not a corner case: all
three figures in the showcase's own reading-surface post are raw Unsplash URLs
(`2026-04-05-the-reading-surface.md:107,115,123`), and `site.css:118-130` documents raw URLs as a
supported authoring path.

*Add to decision 1, after the first sentence:*

> A row is a managed-media shape by design: the figure step's lift matches only `media:` tokens
> (`remark-figure.ts:52`), so pictures pasted as plain web addresses stay a stacked figure and form
> no row. `docs/reference/render.md` and the editors doc both state the precondition, so the author
> is never left with a silent no-op.

**K5, the four-picture posture cites a precedent that does the opposite, and puts author input on
the published page** (G16, C5, D37). *Blocking in the charter lens.*
*Defect:* the spec says a fourth picture "is an author-input error the step reports the way an
unknown icon name is reported" and "four or more pictures fail loud at render". The cited
precedent runs the other way: `glyph.ts:12` yields the bare svg shell for an unknown icon and never
serializes, and `remark-figure.ts:90-92` documents its own posture as "leave its children, invent
no image, never throw". The one throw-on-unknown-icon is `normalizeAdminNav`, which validates a
*developer's* config at construction. A render throw here fires in the admin preview, where the
author is mid-edit and the preview has no error surface, and on Publish it would take a
non-technical author's site build down with the only diagnostic in a CI log they cannot read.

*Replace* "a fourth is an author-input error the step reports the way an unknown icon name is
reported" *with:*

> a fourth is refused where the author is standing: the editor's wrap declines a run longer than
> three and says why ("A row holds at most three pictures"), through the same non-blocking
> surfacing `MediaFigureControl` already uses for the decorative-plus-caption contradiction.

*And replace the row bullet's* "four or more pictures fail loud at render with a message naming the
limit (the same build-backstop posture as an unknown icon name)" *with:*

> four or more degrade at render rather than throwing, matching `glyph.ts:12` and
> `remark-figure.ts:90-92`: the first three lift as a row, the rest stay ordinary images in the
> figure body, and the step emits a log event so an operator sees it. The event joins
> `docs/reference/log-events.md` in the same change.

**K6, `center` + row is incoherent against the site's own center rule** (D6, D38).
*Defect:* `site.css` gives `.site-main .cairn-place-center img { max-width: min(100%, 22rem) }`
inside a 44rem column, so a three-up center row cannot fit; and the `:not(.cairn-place-center)`
exemption means a center row alone dodges the height cap. The center placement's own comment scopes
it to "a portrait or a detail shot", the single-picture case.

*Replace* "and it still takes any placement from the closed set, so a row can sit at the measure,
wide, or full" *with:*

> and it takes the measure default, `wide`, or `full`. `center` stays a single-picture placement
> (`site.css`'s 22rem image cap is written for a portrait or a detail shot), so the editor's
> placement radiogroup drops the `Center` option for a row; removing an option changes the roving
> tabindex arithmetic and the Home/End targets in `MediaFigureControl.svelte:25-30`, so it is a
> real change, not a cosmetic one.

### 1.4 Decision 2, one shared caption

**K7, the caption bug has a mirror in `readCaption`, and fixing only the render half converts it
into editor data loss** (G5).
*Defect:* the render bug is at `remark-figure.ts:106-118`, the no-blank-line branch, which splices
`rest` into a caption paragraph with no `hasText` call, unlike the blank-line scan at `:124-129`.
`src/lib/components/markdown-format.ts:388` mirrors that branch for the editor and has the same
hole: it returns the *source text of the second image* as the caption string, which the dialog
prefills and `updateFigure` writes back as literal caption text.

*Replace* "The latent caption bug is fixed in the same change, since the row's own authoring form
(consecutive image lines) is exactly the case it breaks" *with:*

> The latent caption bug is fixed in the same change on both sides, since the row's own authoring
> form (consecutive image lines) is exactly the case it breaks: the render step's no-blank-line
> branch (`remark-figure.ts:106-118`) re-runs the text check the blank-line branch already does,
> and `readCaption` (`markdown-format.ts:388`) gets the same guard. Fixing one without the other
> turns a render bug into editor data loss.

**K8, the figure's accessible name is already correct and must not be overridden** (D11).
*Defect:* nothing states it, so an implementer may reach for ARIA. HTML-AAM maps `<figure>` to
`role="figure"` and lets `figcaption` supply the name, which is exactly the shared-caption
semantics; an `aria-label` or `aria-labelledby` on the figure would suppress it.

*Add to decision 2:*

> The shared caption names the figure group through `<figcaption>`, which satisfies 1.3.1 with no
> ARIA. The figure never carries `aria-label` or `aria-labelledby`, either of which would suppress
> the caption as the name.

### 1.5 Decision 4, the row's `sizes`

**K9, a measure-default row has no role at all and falls to `100vw`, the one hint it must never
emit** (G6). *This is the correction; the wider posture question is taste call T3.*
*Defect:* the hint is selected at `resolve-media.ts` by
`props.sizes = (role && SIZES_BY_ROLE[role]) || '100vw'`, where `role` comes from `roleFromParent`,
which scans the parent figure's `className` for a `cairn-place-` prefix and returns nothing else.
Two consequences the spec reads as a table extension: the count is not available to the lookup at
all, and a row at the measure default carries no `cairn-place-*` class (`remark-figure.ts:84-87`
stamps `hProperties` only when a role survives), so `roleFromParent` returns `undefined` and a
three-across measure row emits the full-viewport hint.

*Add to the resolver bullet:*

> `roleFromParent` widens to a figure-context read returning `{ role?, count }`, counting the
> parent figure's image children off the mdast, and the hint is selected from both. The map gains
> an explicit measure-default entry, since a measure row carries no `cairn-place-*` class today and
> would otherwise fall to the `100vw` worst case. Roughly 25 lines, a small refactor rather than a
> table edit. Two existing behaviors are unchanged: the under-800px srcset guard, and a single
> figure's hints, which stay byte-identical.

**K10, the stated formula ignores the gap and is measured against widths the theme does not
paint, and the hint is silently dropped for small assets** (D33).
*Defect:* three separate errors. Dividing the role width by N over-declares by the total gap.
`SIZES_BY_ROLE` says `wide: '(min-width: 1200px) 1200px, 100vw'`, but the theme's
`--container-measure-wide` is 58rem = 928px (`theme.css:260`), further clamped by
`min(…, 100vw - 3rem)`, so divided by three the engine asks for 400px where the theme paints ~296px,
a ~35% over-fetch per picture across the row. And `applyImageDetail` sets `sizes` only inside
`if (detail.srcSet)`, while `srcSet` is omitted when fewer than two ladder rungs fit, so a row of
sub-800px assets gets no hint at all.

*Replace decision 4's formula sentence* "`(min-width: 48rem) <role width divided by N>, 100vw`"
*with:*

> `(min-width: <stack width>) calc((<role width> - (N - 1) * <gap>) / N), 100vw`, the gap
> subtracted rather than ignored. The role widths stay the engine's own vocabulary and are
> deliberately wider than any one theme paints (Waymark's wide band is 58rem where the engine says
> 1200px), so the hint over-declares and never under-declares. A row whose assets are all under
> 800px gets no srcset and therefore no hint at all, by the existing single-candidate refusal
> (`resolve-media.ts:119`), and that is correct.

**K11, the `sizes` behavior is not provable in the showcase** (G7).
*Defect:* `src/lib/media/config.ts:73` defaults `transformations` to `false` and the showcase passes
only `{ bucketBinding: 'MEDIA_BUCKET' }`, so `imageDetail` never builds a `srcSet` and
`applyImageDetail` never sets `sizes`. No showcase artifact (fixture, styleguide, e2e, baseline)
can exercise the row's hint.

*Add to the row's Proof list:*

> The row's `sizes` is provable only by engine unit tests over a resolver constructed with
> transformations forced on; the showcase runs with transformations off, so no fixture, styleguide
> shot, e2e case, or baseline reaches the srcset path.

### 1.6 Decision 5, the row's geometry

**K12, cascade layers defeat the placement, and three unlayered `site.css` rules already hit a
row** (D2, C4, G10, G11). *Blocking in two lenses.*
*Defect:* `prose.css` is `@layer components` in its entirety (`:43`); `site.css` carries no
`@layer` at all, and the chassis README states the consequence: an unlayered site rule always beats
a layered one regardless of specificity. So a `prose.css` row rule cannot override any of the three
`site.css` rules that hit a row:

1. `.site-main figure figcaption, .site-main figure > * + *` applies caption typography and
   `margin-top` to *every figure child after the first*, which in a row is pictures two and three.
   The selector was written for the raw-URL caption fallback and never anticipated sibling images.
2. `.site-main figure:not(.cairn-place-center) img { max-height: 32rem; object-fit: cover }` is not
   inert for rows: at 2560 a full three-up row gives each cell ~845px, and a 3:2 aspect wants
   ~35.2rem of height, above the cap, so the declared aspect is silently violated at the top
   viewport and the row renders a different shape at 2560 than at 1440.
3. `.site-main figure img { height: auto }` beats any `height: 100%` equal-height mechanism written
   in `prose.css` (an `aspect-ratio` approach survives it; a `height: 100%` approach does not).

Independently, `prose.css:15-17` and `site.css:19-20` both state the tier split in their own
headers ("site.css owns the figure-placement geometry"; "cairn defines the figure class contract;
the site owns the pixels"), which decision 5 contradicts silently.

*Replace decision 5's* "The row's geometry is a chassis mechanic in `prose.css` … the single-figure
`max-height` rule in `site.css` untouched for singles and inert for rows" *with:*

> **The row's geometry lives in `examples/showcase/src/theme/site.css`, beside the
> `.cairn-place-*` placement rules**, which is where that file's own header puts figure geometry
> and where the cascade requires it: `prose.css` is `@layer components` in its entirety, `site.css`
> is unlayered, and an unlayered site rule beats a layered one regardless of specificity (chassis
> README, "Cascade layers"). Three existing `site.css` rules gain a `:not(.cairn-figure-row)` guard
> in the same change, because a layered sheet could not have overridden them: the
> `> * + *` caption fallback (which would put caption typography and a stray `margin-top` on
> pictures two and three), the `max-height: 32rem` cap (which would silently override the row's
> declared aspect at 2560), and the `height: auto` rule if the equal-height mechanism is anything
> but `aspect-ratio`. The row copies the composition idiom otherwise: mobile-first single column,
> one width query, the gap as an overridable custom property, and the comment that a media query
> cannot read a token. `--cairn-figure-row-gap` and `--cairn-figure-row-aspect` are the override
> seams.

*And add `examples/showcase/src/theme/site.css` to the row's file list.*

**K13, the `figcaption` becomes an extra grid column** (D3, D10).
*Defect:* decision 3 makes the `<figure>` itself the grid, so its children are N images *and* the
`<figcaption>`, which at the multi-column width sits beside the pictures as an (N+1)th column. The
mechanics research named the required rule; the spec kept the option and dropped the rule. The
raw-`<p>` caption fallback needs the same rule, which is reachable through the "a non-media image
among media ones" case already in the Proof list.

*Add to decision 5:*

> The caption spans the row: `figure.cairn-figure-row > figcaption, figure.cairn-figure-row > p
> { grid-column: 1 / -1; }`. The `> p` arm catches the raw-`<p>` caption fallback, which is
> reachable when a row mixes a media token with a raw URL.

**K14, a wide row's caption runs past the measure** (D8).
*Defect:* `site.css` returns a caption to `--container-measure` for `.cairn-place-full` only.
`.cairn-place-wide` has no such rule, so a wide caption already runs the full 58rem band today, and
under a wide row at 2560 with the ultrawide root clamp it runs to ~65rem.

*Add to the row's file list:* "the `.cairn-place-wide` caption's measure return, or a recorded
decision to leave the existing wide-caption behavior alone."

### 1.7 Decision 6 / the editor bullet

**K15, the editor half lives in `markdown-format.ts`, not `figure-editor.svelte.ts`, and as
specified an edit would delete pictures two and three** (G4). *Ranked #2 by the grounding lens.*
*Defect:* `figure-editor.svelte.ts` holds no parsing. It reads a `FigureAtImage` snapshot from the
shell and calls pure transforms it imports from `markdown-format.ts`. Every mechanism a row needs
is in that file, and every one of them is single-token today: `FigureAtImage` carries exactly one
image's offsets (`:282`), `figureAtImage` returns one image (`:434`), `wrapImageInFigure` takes a
single `imageFrom`/`imageTo` pair (`:482`), and both `updateFigure` (`:518`) and `unwrapFigure`
(`:534`) rebuild from that single token. `readCaption` (`:388`) carries the caption-bug mirror of
K7. The formatter's *role set* is unchanged, which is the only part the spec's sentence gets right.

*Replace the editor bullet's first clause* "`figure-editor.svelte.ts`'s wrap finds the paragraph at
the cursor and, when it holds one to three consecutive media images, wraps them as one figure; edit
and unwrap operate on the whole figure" *with:*

> `src/lib/components/markdown-format.ts` is the largest single code change in the pass. The
> `FigureAtImage` interface (`:282`) gains the sibling-image list, and the four exported
> single-token transforms go N-image: `figureAtImage` (`:434`) collects the consecutive media
> images in the paragraph at the cursor, `wrapImageInFigure` (`:482`) takes the run rather than one
> offset pair, and `updateFigure` (`:518`) and `unwrapFigure` (`:534`) rebuild every token rather
> than the first, so an edit that changes only the caption cannot drop pictures two and three. The
> fifth change is `readCaption` (`:388`), the caption bug's editor mirror (decision 2). Every media
> token stays byte-identical through wrap, edit, and unwrap, the standing invariant. The role set
> the formatter mirrors is unchanged. `figure-editor.svelte.ts` and `MediaFigureControl.svelte` are
> the small, mechanical half once the formatter lands.

**K16, the toolbar button's own label is the feature's front door and does not change** (D35, D36).
*Defect:* decision 6 changes only the dialog title, but the author sees the button first:
`EditPage.svelte:1940-1963` binds both `title` and `aria-label` to `figureEditor.figureLabel`, whose
strings are all singular ("Wrap the image at the cursor in a figure"). With the caret in a run of
three, the control's accessible name would describe something other than what it does (4.1.2). And
since there is deliberately no new toolbar item, that label is the only discovery path besides the
editors doc.

*Replace decision 6's* "the dialog's title reads 'Row of N pictures'" *with:*

> the button's own label changes first and is the feature's discovery mechanism: with the caret in
> a run of two or three pictures, `figureLabel` (`figure-editor.svelte.ts:84-91`) reads "Wrap these
> N pictures in a figure", and for an existing row "Edit the row at the cursor". The dialog title
> then reads "Row of N pictures". Any new `$state` respects the `RESET_BLOCK` contract
> (`figure-editor.svelte.ts:65-75`). The Markdown help entry carries the row too, so discovery does
> not rest on the author happening to notice a label change.

**K17, `decorative` is derived from one token and has no answer for a row** (D13).
*Defect:* `figure-editor.svelte.ts:96-102` derives `decorative` by regex over *the* token slice, and
`MediaFigureControl.svelte:62`'s `decorativeWithCaption` surfaces the decorative-plus-caption
contradiction. With N pictures there is no single answer.

*Add to the editor bullet:* "`decorative` stays per-picture and therefore leaves the shared dialog;
`decorativeWithCaption` warns for a row when every picture is decorative, since a caption on a row
of decorative pictures is the same contradiction it already flags."

### 1.8 Decision 7, the gallery

**K18, heading level, `id` collision, and a dead anchor** (D20).
*Defect:* three problems in one sentence. The heading level is unstated, and the gallery sits after
`{@html data.html}` whose body may end on an `h2` or `h3`; choosing a level to match the preceding
one is a 1.3.1 defect. `rehypeSlug` runs over the body (`pipeline.ts:119`), so a post with a body
heading "Gallery" already emits `id="gallery"` and the page then carries a duplicate id that breaks
the fragment link. And the component renders only when the projection is non-empty, so an author who
writes "see the gallery below" against an empty Gallery field gets a link to nothing.

*Replace decision 7's* "with `id=\"gallery\"` and a heading so the story can reference it by link"
*with:*

> with `id="cairn-gallery"` (namespaced so it cannot collide with a `rehypeSlug` id from a body
> heading named "Gallery") and an `h2` heading, a sibling of the body's own top-level sections and
> never a level chosen to match the preceding one. The editors doc gives the author the exact link
> text and says the anchor is dead while the Gallery field is empty.

**K19, the projection belongs in `$chassis/entry-data.ts`, or the gallery vanishes in preview**
(G9).
*Defect:* two routes render `ArticleView`, the prerendered `(site)/[...path]/+page.server.ts` and
the runtime `(site)/preview/[token]/+page.server.ts`. The showcase already has one module built to
stop those two drifting, `examples/showcase/src/chassis/entry-data.ts`, whose `withReferences` is
the existing precedent for exactly this augmentation, and `ArticleView.svelte`'s own component block
makes the no-structural-drift claim load-bearing.

*Replace the gallery bullet's* "The article page's server load projects `frontmatter.gallery`
through the public media resolver" *with:*

> `examples/showcase/src/chassis/entry-data.ts` projects `frontmatter.gallery` beside
> `withReferences`, so the prerendered route and the preview route both carry it; putting the
> projection in one route's load would ship a gallery that disappears in preview, which
> `ArticleView.svelte`'s contract forbids.

**K20, the component's name is off the theme's grammar and collides with a live retire target**
(C8).
*Defect:* the theme's sibling components are plain nouns with no concept prefix (`ArticleView`,
`Carousel`, `IntroLedger`). And `src/theme/components/Carousel.svelte` (197 lines, zero referrers)
is a retire target owned by a chassis pass
(`record/2026-08-26-any-site-audit/int-rank-site-chassis.md:255-258`). A cycling picture viewer is
functionally what `Carousel` was, so without a sequencing statement the pass re-adds
dead-shaped code one slice after deleting it.

*Replace* "`PostGallery.svelte` in `src/theme/components`" *with:*

> `Gallery.svelte` in `src/theme/components`, matching the theme's plain-noun component names. The
> `Carousel.svelte` retire lands first (it is a chassis-pass retire target with zero referrers);
> the viewer does not resurrect it, and the pass states so in its own sequencing.

### 1.9 Decision 8, the viewer

**K21, the DaisyUI dialog recipe does not compile on the public side** (D22, G14). *Blocking.*
*Defect:* the admin recipe is expressed in DaisyUI component classes, verbatim
(`admin-design-system.md`): "a native `<dialog class=\"modal\">` with a `modal-box`, an
`aria-labelledby` title, a close button, and the `method=\"dialog\"` backdrop". The chassis excludes
`modal` from the DaisyUI build (`examples/showcase/src/chassis/tokens.css`, the `exclude:` list
contains `modal` and `carousel`), so those classes emit nothing. The behavioral half transfers
cleanly; the class vocabulary does not.

*Replace decision 8's* "The public design system imports the admin's dialog recipe for this, its
first public dialog" *with:*

> The public design system adopts the admin dialog recipe's **behavioral** contract, not its
> classes: a native `<dialog>` opened with `showModal()` (which gives the focus trap and Escape for
> free), an `aria-labelledby` title, a close button, and backdrop light dismiss. The DaisyUI
> `modal`/`modal-box` classes are unavailable on the public side, since the chassis excludes
> `modal` from the DaisyUI build (`tokens.css`), so the box is hand-written over chassis tokens.
> `carousel` stays excluded too: DaisyUI's carousel is a scroll-snap strip with no keyboard or focus
> contract, and the viewer is not a carousel. Reuse neither, deliberately.

**K22, the dialog has no accessible name, no stated focus landing, and no position announcement**
(D23, D24). *Blocking.*
*Defect:* decision 8 lists feature names and omits the dialog's own identity. Without
`aria-labelledby` the viewer announces as an unnamed dialog (4.1.2). `showModal()` autofocuses the
first focusable descendant, so with "Previous" first in the DOM a keyboard user lands on "Previous"
with no context (2.4.3); the admin's own convention is explicit that focus moves to the close button
on open and returns to the trigger on close. And pressing Right Arrow swaps the image silently: the
`alt` and the caption are in no live region and focus has not moved, so a screen-reader user gets
nothing (4.1.3).

*Replace decision 8's feature list* "previous and next, the caption, arrow keys, Escape, close,
focus returned to the picture that opened it, reduced motion honored" *with:*

> the dialog carries `aria-labelledby` pointing at its own visible title; focus moves to the close
> button on open and returns to the picture that opened it on close, the admin's stated convention.
> Previous and next are real buttons with accessible names (an `aria-label` or `sr-only` text if
> icon-only) and a pointer target of at least 24x24 CSS px, 44x44 recommended for a control a phone
> user taps; they wrap, so no disabled state exists. A visible position indicator ("3 of 7") sits
> with the caption in a container carrying `aria-live="polite"` that exists in the DOM from the
> moment the dialog opens, since a live region created together with its first content does not
> reliably announce. The caption is visible text and is not also wired through `aria-describedby`,
> which would announce it twice. Reduced motion: the backdrop fade and the between-picture
> transition are removed under `prefers-reduced-motion: reduce`, not shortened, matching the three
> existing chassis instances.

### 1.10 Decision 9, frontmatter image resolution

**K23, the `/media` barrel deliberately withholds what the gallery projection is specified to use**
(G8). *Ranked #3 by the grounding lens.*
*Defect:* `createMediaResolver` is public, but its declared return type is `MediaResolve`, and
`MediaResolveWithDetail`, `MediaImageDetail`, and `variantUrl` are not exported from
`src/lib/media/index.ts`. The barrel's header states the withholding as policy: "the raw
transform-URL builders … stay in their modules unexported here". The showcase runs `svelte-check`,
so reading `.imageDetail` needs an unchecked cast, which would be a documented seam violation in the
one repo that exists to prove the seams. The spec hides a scope fork inside the word "public".

*Replace decision 9's* "resolves each gallery picture through the public media resolver into
`{ src, srcset, alt, caption }`, with the variant ladder when transformations are on and the bare
path when they are off" *with:*

> resolves each gallery picture through the public `createMediaResolver`, whose declared return type
> is `MediaResolve`, into `{ src, alt, caption }`. No srcset: `MediaImageDetail`,
> `MediaResolveWithDetail`, and `variantUrl` are deliberately withheld from the `/media` barrel
> (its own header states the policy), so a site cannot reach the variant ladder without a cast into
> engine internals, and widening that seam is not this pass's job. The projection reads intrinsic
> `width`/`height` from `readCommittedManifest`, which the barrel does export, so the grid still
> sets dimensions and avoids layout shift. If a ladder is later wanted, widening the barrel is its
> own scoped change with a reference page and a `check:surface` cost.

*And add to Risks:* "the gallery ships without a srcset this pass, and with transformations off the
grid loads full-size originals; the fixture's pictures are sized accordingly."

### 1.11 Decision 10, sequencing

**K24, this is two passes, and the fixture task blocks both** (G-feasibility, C9).
*Defect:* decision 10 says "One pass, after chassis-B2, engine half first". The spec carries two
separately paint-graded surfaces, each owed B1's full protocol, which is the protocol run twice
inside one pass; the engine half has grown past its stated shape (K15's formatter work, K9's
resolver refactor, K27's cross-package fixtures); and the two halves share exactly one artifact and
depend on each other nowhere. See §4.

*Replace decision 10 with the two-pass form in §4, and add the contended files and the rebake:*

> Two passes after chassis-B2, both under B1's paint protocol. The contended files are named so the
> passes can run sequentially or in two worktrees:
> `examples/showcase/src/chassis/prose.css`, `examples/showcase/src/theme/site.css`, the
> reading-surface fixture post, the styleguide route, and the `site-visual` baselines. Each pass
> carries its own `emit:template` rebake, since B2's final rebake closes before this work lands and
> both passes change the emitted class contract and the theme sheets.

**K25, the pass has no harvest step** (C7).
*Defect:* the family rule is that every theme or site built on the chassis banks its harvest before
the pass closes, and a port or rebuild is not done until it is banked. The spec lists proof and no
harvest, and no mid-pass mechanic triage against `docs/internal/engine-rulings.md`.

*Add to decision 10:*

> Each pass ends by enumerating what it built, asking of each item whether it is a mechanic or a
> choice, and banking the harvest before reporting done: frictions and gaps into the chassis first,
> the engine where deeper, triaged through `engine-triage` against
> `docs/internal/engine-rulings.md`. The `sizes` posture (decision 4) is filed as a new ruling
> either way it lands, since the ledger carries no figure, placement, or srcset entry today.

### 1.12 Proof and fixtures

**K26, the media fixtures the visual proof needs do not exist, and their bytes are not seeded**
(G3). *Ranked #1 by the grounding lens; the pass's hidden dependency.*
*Defect:* the showcase's committed manifest
(`examples/showcase/src/content/.cairn/media.json`) has exactly one row, `00112233445566aa` /
`hello-hero`. The dev backend's seeded R2 bytes are enumerated in
`packages/cairn-cms-dev/src/fake-github.ts`'s `SEED_MEDIA_KEYS`, drawn from `SEED_MEDIA`,
`PASS_B_MEDIA`, `PASS_C_UNREF`, and `PASS_C_ORPHAN_BYTE`, and `00112233445566aa` is in none of
them, so the hello post's hero image 404s in the e2e server today. Nobody noticed because
`media-hero.spec.ts:137-139` asserts only `src`, `alt`, and caption, never a 200. The bytes that do
exist are a synthesized 240x160 PNG (`fake-r2.ts:88-89`). A row or gallery baselined on `media:`
tokens would therefore capture either a broken image or a 240x160 placeholder stretched into a photo
slot, which is not evidence for a pass whose merge gate is Geoff's five-viewport read.

*Add as the first task of the row pass (see §4, task R1), and add to Risks:*

> The visual proof rests on `media:` fixtures that have neither manifest rows nor seeded bytes, and
> the gap spans a second package the file list did not name (`packages/cairn-cms-dev`). The fixture
> task lands first in the row pass and both passes depend on it.

**K27, the emitted-class registry does not list the figure family at all** (G13).
*Defect:* `docs/reference/render.md`'s "Emitted classes" lists exactly five names (`cairn-head`,
`cairn-icon` plus `cairn-icon-secondary`, `cairn-glyph`, `cairn-grid`) and frames itself as "the
emitted-markup side's registry". `cairn-place-*` and `cairn-broken-media` are emitted by
`remark-figure.ts` and `resolve-media.ts` and appear nowhere on that page. Adding `cairn-figure-row`
alone would document the new name while its siblings stay missing.

*Replace the docs bullet's* "the emitted-class registry" *with:*

> `docs/reference/render.md`'s emitted-class registry gains the whole figure family in one change:
> `cairn-place-center`/`-wide`/`-full`, `cairn-broken-media`, and the new `cairn-figure-row`, all of
> which are emitted today or by this pass and none of which the registry lists. Three lines, and it
> closes a standing gap this pass would otherwise widen. The chassis custom properties
> (`--cairn-figure-row-*`) stay out of the registry, per the live chassis-A ruling that the chassis
> classes stay out of the engine registry. The pass greps the roughly sixty admin `cairn-*` names
> for a collision before landing, as the registry's own "Registration" note requires.

**K28, the changelog says both "additive" and "changes the output", and the caption fix needs a
`Consumers must:` line** (C6).
*Defect:* the docs bullet calls the changelog entry "additive; the caption-bug fix noted", while
Risks says the fix "changes the output of any existing two-image figure". Both cannot stand. The
charter's rule for 0.x is that the gate detects and discloses a break through the changelog's
`Consumers must:` line, and `check:surface` cannot see this one, since it is emitted HTML rather
than an export, so prose is the only channel. Separately, "the family sites" is unnamed.

*Replace the docs bullet's* "`CHANGELOG.md` (additive; the caption-bug fix noted)" *with:*

> `CHANGELOG.md` under `## Unreleased`, carrying a `Consumers must:` line for the caption fix, which
> is a behavior break rather than an additive change: a two-image figure written without a blank
> line renders differently after the fix, and `check:surface` cannot see it because it is emitted
> HTML and not an export.

*And replace the Risks entry* "the survey of the family sites' content for that shape is a pass-start
step" *with:*

> the survey is a pass **precondition**, not a step, and its scope is named: ecxc-ski, 907-life,
> aksailingclub-org, xcathletes-org, and cairn-pub. A hit is a blocking input to the changelog
> wording, which then states the before and after rather than naming the fix.

**K29, a consumer inherits the emitted class without the CSS** (D15).
*Defect:* the engine emits `cairn-figure-row`; the CSS lives in each site's own copy of the theme
sheets. A consumer that upgrades the engine before copying the new sheet gets a `:::figure` with
stacked full-width pictures, no grid, no gap, and the `> * + *` caption typography on pictures two
and three.

*Add to Risks:*

> A consumer that upgrades the engine before copying the new theme sheet gets the row's class with
> none of its geometry, and picks up the `> * + *` caption typography on pictures two and three.
> The `Consumers must:` line names the sheet to copy alongside the caption-fix disclosure.

### 1.13 Docs, editors track

**K30, one paragraph in the editors doc is not enough, and the gallery paragraph is
under-specified** (D39, D40).
*Defect:* the row bullet promises "one paragraph on rows", but the facts an author needs are at
least five, and `write-in-the-editor.md:113-130` is written entirely in the singular, so its caption
and placement bullets each need a plural case. The gallery paragraph likewise omits that the caption
appears in two places, that alt text is still required and is not the caption, and the exact link
text to type.

*Replace* "the editors doc's 'Wrap the image' section gains one paragraph on rows" *with:*

> the editors doc's "Wrap the image" section carries the row's five author-facing facts: how to make
> one (consecutive picture lines, then the same button), the limit of three, that the caption is
> shared while each picture keeps its own alt, that pictures may be cropped to a shared shape so a
> portrait whose subject sits near an edge is a poor row candidate, and that a picture pasted as a
> plain web address forms no row. The section's singular caption and placement bullets each gain a
> plural case.

*And replace the gallery docs bullet's* "add pictures under Gallery in Details, each with alt text
and a caption; the story can link to `#gallery`" *with:*

> add pictures under Gallery in Details, each with alt text and a caption; alt text is still
> required and is not the caption; the caption shows both in the grid and in the viewer; and the
> exact link text to type to reference the set, which the doc spells out rather than saying "link
> to the anchor". The container-field e2e gains a caption assertion, which it does not exercise
> today.

---

## 2. Open taste calls for Geoff

Six. Each is a design choice no fact in the tree settles.

### T1, What rule gives a row its equal heights?

*Options.*
(a) **A fixed aspect with `object-fit: cover`**, the spec's implied choice, with the ratio named:
3:2 matches the showcase's landscape content, 4:3 is safer for mixed sets, 1:1 is the platform
convention but reads as a contact sheet rather than a narrative row.
(b) **A justified row from intrinsic dimensions** (the Flickr / Google Photos shape): give each
picture `flex-grow` proportional to its own aspect and the heights match by construction, with no
crop.
(c) **Tallest matches**: let each picture keep its aspect and its own height, aligning tops.

*Evidence.* D4: the spec commits to (a) and names `--cairn-figure-row-aspect` as the seam but never
states the default, and for a spec whose entire visual claim is the row, the aspect **is** the
design. A 3:4 portrait in a 3:2 cell keeps 44% of its height, centered, and `object-position` is not
offered as a seam, so an author cannot save a subject near the frame's edge and cannot see the loss
coming. For (b), the engine already writes intrinsic `width`/`height` on every resolved media image,
so the ratio is available and would be emitted as an inline custom property per picture; its honest
weakness is that `imageDetail` is absent for a hand-rolled `resolveMedia` and for any raw external
URL, so a fallback (all cells equal) must be defined. D7 adds, for any option that crops: the crop
belongs only in the multi-column state, since at 320 the pictures stack full-width and there is
nothing to equalize, so cropping there is pure loss.

*Recommendation.* **(b), the justified row, with (a) at 3:2 as the fallback when intrinsic
dimensions are unavailable.** The pictures are described as ones "a story depends on", and (b) is
the only option that never silently discards part of one. It costs one inline custom property per
picture and a defined fallback. If (b) is judged too clever for a first row, take (a) at 3:2 and add
`--cairn-figure-row-fit` and `object-position` to the seams so an author has a repair. Either way:
no crop in the stacked state.

### T2, Where does a row stack, and what stops it at 2560?

*Options.*
(a) **One `@media (min-width: 48rem)` for every count and role**, as specified.
(b) **Promote by count and role**: a two-up promotes earlier than a three-up, a `full` row earlier
than a measure row, and a measure row may never go three-up.
(c) **Cap the columns by width intrinsically**:
`grid-template-columns: repeat(auto-fit, minmax(<floor>, 1fr))`, which composes at both ends with no
media query and matches `site.css`'s existing idiom (that sheet has no width breakpoint at all;
every responsive behavior is `min()`/`clamp()`/intrinsic).

*Evidence.* D5: 48rem is 768px and `--container-measure` is 44rem = 704px, so a measure-default
three-up row promotes to three columns at the exact moment each picture is `(44rem − 2 gaps) / 3` ≈
13.7rem ≈ **219px**. Three 219px photographs is a thumbnail strip in the middle of a reading column,
not a composed row. At the top, a full three-up at 2560 gives each picture ~845px, and the ultrawide
root clamp grows the rem-based measures another ~12.5%; the spec sets no ceiling, and combined with
the 32rem cap (K12) the row silently reshapes between 1440 and 2560. D19 notes the chassis has
exactly one breakpoint precedent (48rem) and the site sheet has none. The real tension, stated
plainly: (c) composes best but costs the numeric agreement `sizes` needs (K10), because an intrinsic
grid has no width the hint can name.

*Recommendation.* **A hybrid: (c) for the geometry with a named minimum picture width, and a
declared stack width for the `sizes` hint alone.** Set the floor so no picture is ever narrower than
about 260px, which forces a measure three-up to stack rather than paint 219px thumbnails, and cap
the row's total width at the wide band so 2560 does not run away. The `sizes` hint then names the
floor's implied stack width, which over-declares slightly and never under-declares, which is the
posture K10 already establishes. If that hybrid reads as too much machinery, take (b): a measure row
caps at two columns and a three-up forces `wide`.

### T3, What `sizes` does the engine state for a row?

*Options.*
(a) **`100vw`**, the existing worst-case fallback, no row-specific hint at all.
(b) **The engine's own documented default breakpoint (48rem)**, as the spec proposes.
(c) **An adapter-supplied breakpoint**: an optional `rowStackWidth?: string` on `AssetConfig` /
`createMediaResolver` with **no engine default**, so a site that supplies it gets a divided hint and
a site that does not gets `100vw`.

*Evidence.* C3, the charter lens's second-ranked finding. `resolve-media.ts:27-34` records the
refusal in the code's own doc comment: the role map is "in the engine's own placement vocabulary …
not any one theme's exact breakpoints: cairn's public render stays design-agnostic". The stronger
text the spec does not cite is `resolve-media.ts:41-45`: intrinsic dimensions and srcset "are
**omitted when unknowable, never guessed**", and `:119` refuses a one-candidate srcset as "no more
honest than no srcset at all". The settled posture is decline rather than guess. And 48rem is not a
general convention: it is one value from one site-layer file
(`examples/showcase/src/chassis/composition.css`, the sidebar layout's stack point), in a tree the
charter classes as the site's. The spec names it honestly as "the chassis's own", which is exactly
the objection. No ruling exists either way, so this is a new ruling the spec would be making rather
than applying, and it should be filed as one. Against all that: K9 is real regardless, and (a) means
a three-across measure row asks the browser for a full-viewport image three times.

*Recommendation.* **(c), the adapter seam, with (a) as the default.** It is the leanest form that
closes the over-fetch, it leaves the code comment true, and it is "seam, not feature" as the charter
puts it. The cost is one optional config field and a reference-page paragraph. Do not take the
research's other option (having `remarkFigure` write `hProperties.sizes` directly): it requires
`applyImageDetail` to stop overwriting, which widens a second contract to fix the first.

### T4, Does the viewer support swipe on phones?

*Options.* (a) Buttons and keyboard only. (b) Add swipe as an enhancement alongside the buttons.

*Evidence.* D27 answers the "is it required for modern" question directly: it is not. A swipe is a
path-based gesture, and WCAG 2.5.1 requires a single-pointer alternative, which the previous and
next buttons already are; 2.5.7 Dragging Movements bites only when dragging is the *only* way. So
swipe is a legitimate enhancement with a clear rule if taken: never remove the buttons, and never
bind it so tightly that a slow drag on a scrollable caption is captured as navigation.

*Recommendation.* **(b), but not in the first pass.** Ship buttons and keyboard, and state the
clause in decision 8 so the implementer does not invent it either way. Swipe is the kind of thing
that reads as missing on a phone, so it is a good first harvest item once the a11y contract is
banked.

### T5, Do captions appear in the grid, or only in the viewer?

*Options.* (a) Both, as the spec says ("captions rendered under the viewer's picture and as
`figcaption` in the grid when present"). (b) Viewer only, the grid staying a clean set of pictures.

*Evidence.* D17: "both" is what forces each grid cell to be a `<figure>`, which then inherits
`.site-main figure { margin: var(--spacing-l) 0 }` (2rem of vertical margin on every cell, on top of
the grid gap) and the 32rem cap, so the cell markup needs an explicit opt-out from those rules.
"Viewer only" keeps each cell a bare `<a><img></a>` and sidesteps the whole interaction. D40 notes
the editing path already collects a caption per picture with no change
(`MediaHeroField.svelte:477`), so the data exists either way. Against (b): a caption an author wrote
and cannot see without opening the viewer reads as a lost edit.

*Recommendation.* **(b), viewer only, with the caption available to assistive technology through
the grid link's accessible name.** It keeps the grid reading as a set rather than a list of
captioned items, avoids inheriting the article's figure geometry into every cell, and the caption is
one click away. If Geoff wants the caption visible in the grid, take (a) and state which
`.site-main figure` rules each cell opts out of.

### T6, Do the gallery grid and the dialog recipe become chassis primitives now?

*Options.* (a) Both stay in the theme this pass; the mechanic half is banked as a harvest item and
promoted in a later chassis pass. (b) The dialog's behavioral half lands as a chassis primitive now,
on the `theme-toggle.ts` model, with the theme keeping the columns, heading, and type.

*Evidence.* C7 and D14 both argue (b) from the family rule: a UI mechanic belongs to cairn, a design
choice belongs to the site, and "a public picture viewer over a set of captioned images" recurs in
any component of that shape on any cairn site. Split by that test, the mechanics are the
`<dialog>` open/close contract, focus return, Escape and arrow cycling, reduced-motion honoring, and
the no-scripting fallback; the choices are three-across / two / one, the heading text and level, the
caption type scale, and the gap. The spec files the mechanic half as a paragraph in
`public-design-system.md`, which is the weakest form the rule names: the next theme reads prose and
hand-rolls the behavior again. Against (b): the charter's premise check asks whether each addition
is cairn's job in its leanest form, and a chassis primitive built for exactly one caller is the
classic premature abstraction.

*Recommendation.* **(a) for the grid, (b) for the dialog behavior.** The grid is entirely choice and
belongs to the theme. The dialog's behavioral half is the expensive, a11y-graded part, and it is
precisely what a sibling site would otherwise rediscover; landing it as a chassis primitive with
every value passed in (the `theme-toggle.ts` model) costs little more than writing it in the
component. If Geoff prefers to see it work once before promoting it, take (a) for both and make the
promotion the pass's named harvest item, not a doc paragraph.

---

## 3. Conflicts between lenses, adjudicated

**A. Where the row's CSS lives.** The spec says `prose.css` (chassis mechanic). G10 says the file's
own header assigns figure geometry to `site.css`. C4 says the tier split assigns it to `site.css`
and the cascade makes `prose.css` unable to win anyway. D2 says put the guards in `site.css`
regardless of where the row rules go.
*Adjudication: settled by fact, not preference.* `prose.css` is `@layer components` in its entirety
and `site.css` is unlayered, so a `prose.css` row rule cannot override the three existing rules that
hit a row. Whatever sheet the row's own rules land in, the guards must be in `site.css`. Given that,
splitting the row across two sheets buys nothing: **all of it goes in `site.css` beside
`.cairn-place-*`** (K12), and no doc header needs amending, because that is what both headers
already say. The spec's argument for `prose.css` (it is what a next theme inherits) is real but is
answered better by T6's harvest: promote the row geometry to the chassis when a second theme wants
it, with the layering problem solved once rather than worked around now.

**B. Whether the engine should state a row's `sizes` at all.** G6 treats the count-aware hint as a
straightforward extension and finds a bug in it (the measure default falls to `100vw`). C3 says the
whole hint contradicts a recorded refusal and the "omitted when unknowable, never guessed" doctrine.
D33 says the specified formula is wrong on three counts.
*Adjudication: the lenses are answering different questions and both hold.* C3 governs the posture
and it wins on precedent, which is why the posture goes to Geoff as T3 rather than being decided
here. G6's finding is independent of the posture and is a correction either way: a measure-default
row has no `cairn-place-*` class, so `roleFromParent` returns `undefined` and the row falls to
`100vw` whether or not the count is consulted (K9). D33's three formula defects apply to any option
that emits a divided hint (K10). So: K9 and K10 land as corrections, T3 decides whether the divided
hint exists at all.

**C. Whether a count reaches the DOM.** G1 offers two repairs, adding `dataCount` to `FIXED_MARKERS`
or emitting a second per-count class. C2 recommends the marker class and additionally objects that a
bare `data-count` is off the engine's namespaced data-attribute grammar. D1 says neither is needed.
*Adjudication: D1 wins.* `sizes` is computed from the mdast before the floor runs, so the resolver
counts the children directly; and a grid sizes N columns intrinsically with
`grid-auto-flow: column; grid-auto-columns: 1fr` (or the auto-fit form of T2), so no CSS selector
needs the count either. Emit `cairn-figure-row` alone, change no schema, add no per-count class
(K3). This also disposes of C2's naming objection without a ruling.

**D. What happens on a fourth picture.** G16 wants a preview-safe form and offers two. C5 ranks the
refusal in the editor first and the render degrade second, and objects that the cited precedent does
the opposite of what the spec claims. D37 wants an editor-side refusal, a legible preview, and an
answer on whether four can be saved at all.
*Adjudication: no conflict; all three converge.* Take both halves, which is what K5 writes: refuse
in the dialog where the author is standing, and degrade at render (first three as a row, the rest as
ordinary images) so a saved four-picture figure never fails a build. Add the log event, which C5
alone raises and the repo's own diagnosability rule requires. The one open sub-question, whether a
four-picture figure can be *saved*, resolves as yes: the editor refuses to wrap it, but raw markdown
can always carry anything, which is exactly why the render half degrades.

**E. Whether the gallery needs a srcset, and at what seam cost.** G8 presents a fork: widen the
`/media` barrel, or ship without a ladder and say so. D30 wants a full loading strategy (what shows
while the large variant decodes, preloading the next picture, `loading`/`decoding`/`fetchpriority`)
and notes that with transformations off the "thumbnail" grid loads N full-size originals. C1's
charter test asks whether each addition is cairn's job in its leanest form.
*Adjudication: ship without the ladder (K23).* The barrel's withholding is stated policy in its own
header, the showcase cannot exercise the ladder anyway (K11, transformations are off), and widening
a public seam as a side effect of a theme component is the shape the charter exists to catch. D30's
loading strategy is still owed and is cheap without a ladder: `loading="lazy"` on grid thumbnails
below the fold, eager on the viewer's current picture, the thumbnail held under a loading cue while
the large variant decodes, and the next picture preloaded. Add those to the gallery bullet.

**F. Whether the viewer belongs in the theme.** The spec places it in the theme and lists the
consumer chassis copies as out of scope. C7 and D14 both say the behavioral half is a mechanic and
the doc-paragraph filing is the weakest form. C1's leanness test cuts the other way.
*Adjudication: genuinely a taste call, routed to T6.* What is settled and does not need Geoff: the
*behavioral* recipe is what transfers, not the DaisyUI classes (K21), and the a11y contract is
specified rather than listed (K22). Where the code lives is the open half.

**G. Pass sizing.** The spec says one pass. The grounding lens counts 11 to 13 tasks and two paint
gates and recommends two passes. C9 reaches the same conclusion from the workstation sizing rule.
*Adjudication: no conflict; two passes.* See §4. Note the one thing both feasibility readings agree
on that the spec does not: the fixture-media groundwork (K26) blocks both halves and must be task
one.

---

## 4. Sizing: two passes

**Why two.** Three independent reasons, and the reviews reached them separately. The spec carries
two separately paint-graded surfaces (the row's geometry across three placements; the gallery plus
its first public dialog), each owed B1's full protocol, which is that protocol run twice inside one
pass. The engine half has grown past its stated shape: K15's formatter work, K9's resolver refactor,
and K26's cross-package fixtures are three substantial items the spec's file list reads as one and a
half. And the halves share exactly one artifact (the fixture post) and depend on each other nowhere,
which is the textbook cut.

**Contended files**, named so the passes can run sequentially or in two worktrees:
`examples/showcase/src/theme/site.css`, `examples/showcase/src/chassis/prose.css`, the
reading-surface fixture post, the styleguide route, and the `site-visual` baselines.

### Pass 1, the row (7 tasks)

| # | Task | Notes |
| --- | --- | --- |
| R1 | **Media fixtures and seeded bytes** | Do first; blocks every visual proof in both passes. Manifest rows in `examples/showcase/src/content/.cairn/media.json` with realistic dimensions, matching keys in `SEED_MEDIA_KEYS` (`packages/cairn-cms-dev/src/fake-github.ts`), bytes proportioned to the declared width and height rather than the flat 240x160 default. Close the standing gap: `00112233445566aa` is seeded, and `media-hero.spec.ts` gains a response-status assertion so it cannot reopen. Spans three packages. (K26) |
| R2 | **The render step lifts every media image and fixes the caption scan** | `findMediaImages` replaces `findMediaImage`; the unwrap lifts one to three in document order; the no-blank-line branch re-runs the text check; the figure gains `cairn-figure-row` and nothing else; four or more degrade preview-safely with a log event. Acceptance includes the marker surviving `buildSanitizeSchema` in a rendered-output assertion, not only in the mdast. (K3, K5, K7) |
| R3 | **Count-aware `sizes`** | `roleFromParent` widens to `{ role?, count }`; explicit measure-default entry; the formula per T3's ruling. Provable only over a transformations-on resolver. (K9, K10, K11, T3) |
| R4 | **The formatter goes N-image** | The correctness-critical task; consider `model: opus`. `FigureAtImage` plus the four exported transforms plus `readCaption`. Every media token byte-identical through wrap, edit, and unwrap; the existing 60 formatter cases stay green untouched. (K15, K7) |
| R5 | **The editor surface** | `figureLabel`'s new strings (the feature's discovery mechanism), the dialog title, the `Center` option dropped for a row and the roving-tabindex arithmetic corrected, `decorative` per-picture. `RESET_BLOCK` contract respected. (K16, K6, K17) |
| R6 | **The row's geometry** | In `site.css` beside `.cairn-place-*`; the three `:not(.cairn-figure-row)` guards; `grid-column: 1 / -1` for the caption and its `<p>` fallback; the height rule per T1; the promotion rule and the 2560 cap per T2; no crop in the stacked state. Styleguide gains a figure section baselined at five widths in both schemes. (K12, K13, K14, T1, T2) |
| R7 | **Docs, changelog, harvest** | The whole figure family into the emitted-class registry; the media-only precondition; the editors doc's five row facts; the `Consumers must:` line with the five-repo survey as a precondition; `emit:template` rebake; the harvest banked and the `sizes` ruling filed. (K2, K4, K25, K27, K28, K29, K30) |

**Rough ceiling: 450k tokens**, checkpoint every three tasks. R4 is the upshift candidate and the
regression-risk concentration; R1 is the one that must not be deferred.

### Pass 2, the gallery (5 tasks)

| # | Task | Notes |
| --- | --- | --- |
| G1 | **The projection** | `frontmatter.gallery` → `{ src, alt, caption }[]` in `$chassis/entry-data.ts` beside `withReferences`, so both the prerendered and the preview route carry it. No cast into engine internals; `svelte-check` clean. Intrinsic dimensions from `readCommittedManifest`. (K19, K23) |
| G2 | **`Gallery.svelte`** | `<section id="cairn-gallery">` with an `h2`, the grid, the no-JS link with its accessible name in both states, the width band named, the loading strategy. The `Carousel` retire lands first and is not resurrected. (K18, K20, conflict E) |
| G3 | **The viewer** | Native `<dialog>` over chassis tokens following the *behavioral* admin recipe only; `aria-labelledby`; focus to the close button on open and back to the trigger on close; the live region for position; wrapping prev/next with names and target size; reduced motion removed not shortened; scroll lock with no layout shift; the sizing departure from the admin's 85vh rule recorded. `daisyui-a11y-reviewer` gates it. (K21, K22, T4, T6) |
| G4 | **Proof** | Component tests for the keyboard and focus contract; the fixture post's three-picture gallery baselined at five widths in both schemes; an e2e case that opens, cycles with the arrow keys, closes with Escape, and asserts the focus return (including that the sticky header does not cover the restored thumbnail). |
| G5 | **Docs, changelog, harvest** | `add-an-image.md` per K30, the chassis README file table, `what-the-scaffold-wrote.md`, `public-design-system.md`'s dialog section, the container-field e2e caption assertion, `emit:template` rebake, harvest banked. |

**Rough ceiling: 350k tokens**, checkpoint every two tasks. G3 is the a11y-graded task and the one
whose scope moves with T6.

---

## 5. Verified sound

Claims opened and confirmed, recorded so the plans do not re-litigate them.

- **The caption bug is real and precisely located.** `remark-figure.ts:106-118` skips the `hasText`
  check the blank-line branch performs at `:124-129`. Two images in one paragraph do make image two
  the caption. The blank-line form already handles multiple images correctly, since an image-only
  paragraph carries no text node, so the bug is exactly as narrow as the spec says.
- **The placement set is closed and single-valued.** `remark-figure.ts:20,82-83` keeps a class only
  when `ROLES.has(className)` on the whole attribute string, so `{.wide .row}` would drop the role.
  A row cannot be a fifth placement. Decision 1's premise holds.
- **Pictures as direct children leave the resolver's role scan intact.** `roleFromParent` reads the
  parent figure's `className` array with `.find()`, so an additive `cairn-figure-row` alongside
  `cairn-place-wide` still resolves `wide`.
- **One `<figure>` holding N `<img>` and one `<figcaption>` is valid HTML and correct semantics.**
  HTML-AAM maps `<figure>` to `role="figure"` and lets the `figcaption` supply the name, so a screen
  reader announces the shared caption once and then each picture's own `alt`. That is Geoff's "one
  shared caption" with no ARIA, satisfying 1.3.1.
- **A three-image figure passes the sanitize floor.** `figure` and `figcaption` are in `tagNames`,
  `img` keeps `srcSet` and `sizes`, and three `<img>` children plus one `<figcaption>` violate no
  ancestor or required-attribute rule. Only `data-count` fails.
- **The hero path returns a bare URL and there is no `array(image)` projection.**
  `public-routes.ts:86-107` emits `{ url, absoluteUrl, alt, caption? }` from `frontmatter.image`
  only. Decision 9's premise is accurate.
- **The gallery field exists and the container editor drives it end to end.** `cairn.config.ts:427`
  declares `gallery: fields.array(fields.image(...))` and
  `examples/showcase/e2e/container-fields.spec.ts:102-132` is the round trip. Nothing renders it.
- **`ImageValue.caption` is real and the array-row editor already collects it.**
  `src/lib/content/types.ts:31-37`; `MediaHeroField.svelte:60,121,477` backs an `array(image)` row
  and submits `<name>.caption`. Decision 7's "no schema change" holds, and per-picture gallery
  captions need no editor work.
- **`prose.css` is reached by the editor preview frame as well as the public page** (`:18-20`), so
  geometry placed there does show in the preview. A genuine argument for the spec's `prose.css`
  instinct that the spec never makes, and one the cascade fact (§3A) overrides anyway.
- **The five-viewport visual matrix and its baselines are as assumed.**
  `examples/showcase/e2e/site-visual.spec.ts:23` runs `[320, 390, 768, 1440, 2560]` in two schemes,
  plus the 1920 mid-clamp article shot.
- **The row belongs at engine altitude**, and the charter argument survives the boundary test even
  though the spec asserts rather than argues it (C1): `figure` is a reserved directive name, so a
  site-level `:::row` would be a second parallel picture vocabulary; the authoring affordance is
  engine UI (`figure-editor.svelte.ts`, `MediaFigureControl.svelte`, `markdown-format.ts`), and a
  site directive gets no toolbar button, no dialog, and no byte-intact media-token guarantee; and
  `sizes` works only because `remarkFigure` unwraps the image to a direct child the resolver can
  read the placement off. A short premise-check paragraph should still be added ahead of
  `## Decisions`, per the charter's own rule that the test runs on every spec.
- **Keeping the row out of a chassis pass is already ruled**, not a judgment call: the chassis
  design's "Out of scope for both" names "any engine feature".
- **Native `<dialog>` restores focus to the previously focused element on close**, which the spec
  relies on and the e2e asserts; the theme's existing `scroll-padding-top` likely already handles
  the sticky-header overlap, which is worth an explicit e2e assertion rather than an assumption.
- **DaisyUI supplies nothing worth reusing here, deliberately.** `tokens.css` excludes both `modal`
  and `carousel`; DaisyUI's carousel is a scroll-snap strip with no keyboard or focus contract, and
  its modal is a thin skin over `<dialog>` that adds no behavior the platform lacks. Record it so a
  later pass does not reopen it.
