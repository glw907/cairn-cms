# Pictures spec review (2026-09-08, three Opus lenses, fresh context each)

Grounding and feasibility, design and accessibility (the daisyui-a11y-reviewer agent), charter and precedent, on the spec at its first draft (`9a1a2898`). The fold brief and revision 2 follow; the taste calls are parked for Geoff. Write-once.

---


Object: `docs/superpowers/specs/2026-09-08-pictures-design.md` (DRAFT, 2026-09-08).
Lens: grounding (every claim opened against the tree) and feasibility (sizing, tasks).
Read-only review; nothing in the tree was edited. `node_modules` is absent in this checkout, so
every verdict below is static reading of source, not an executed test.

---

## Findings, G1..G16

### G1 (blocking), `data-count` does not survive the sanitize floor

**Claim.** Decision 1 and the render bullet: the figure "gains `cairn-figure-row` and
`data-count="N"` when N is greater than one"; the gallery/row CSS keys off it.

**Evidence.** `src/lib/render/sanitize-schema.ts:13` fixes the surviving data attributes to an
explicit list, `FIXED_MARKERS = ['dataPrimitive', 'dataSlot', 'dataRole', 'dataRise']`, and
`:52-58` builds the allowlist as `'*': [...(attributes['*'] ?? []), 'className', ...markers]`.
`hast-util-sanitize` admits nothing else; a data attribute reaches the floor as its camelCased hast
property (`data-count` → `dataCount`), which is in neither the wildcard nor `figure`'s entry. The
floor runs at `src/lib/render/pipeline.ts:113`, i.e. after `remarkFigure` (`:104`), so a row's
`data-count` is stripped before delivery. That the engine had to name `dataRole`/`dataRise`
explicitly is the proof of the rule.

**Correction.** Either add the marker to `FIXED_MARKERS` (one line, plus a sanitize unit test that
pins it, since nothing else in the tree would catch the regression), or drop `data-count` for a
second class, `cairn-figure-row-2` / `-3`, which rides the already-admitted `className` and needs no
schema change. The second is cheaper and matches how CSS would consume it anyway
(`.cairn-figure-row-3` beats `[data-count="3"]` for nothing, and the class needs no attribute
selector). Whichever is chosen, the spec must state it: today it states a mechanism that silently
does not survive.

Everything else in the emitted row markup does pass: `figure` and `figcaption` are in `tagNames`
(`sanitize-schema.ts:50`), `img` keeps `srcSet`/`sizes` (`:47`, `:59`), and three `<img>` direct
children plus one `<figcaption>` under a `<figure>` violate no ancestor or required-attribute rule
in the schema. **The three-image figure itself is fine; only `data-count` is not.**

### G2 (blocking), a row exists only for `media:` tokens, and the spec never says so

**Claim.** Decision 1 and the proof line, which plan the row's visual baselines onto the
reading-surface fixture and the styleguide.

**Evidence.** `src/lib/render/remark-figure.ts:52`, `findMediaImage` matches only
`n.type === 'image' && parseMediaToken(n.url) !== null`; `:92` returns early with no unwrap when
nothing matches. The reading-surface fixture's three figures are raw Unsplash URLs
(`examples/showcase/src/content/posts/2026-04-05-the-reading-surface.md:107-127`), as is the
styleguide's (`examples/showcase/src/routes/(site)/styleguide/+page.server.ts:77-81`). So today
those figures render `<figure class="cairn-place-…"><p><img></p><p>caption</p></figure>` with **no
`<figcaption>` at all**, the theme knows this and carries a plain-`<p>` fallback selector
(`examples/showcase/src/theme/site.css`, the figcaption gutter comment around `:168-172`).

**Correction.** The spec's own aside ("today's article baselines exercise only raw URLs, so they
never reach the unwrap or the srcset") is correct but understates the consequence: a raw-URL figure
can never become a row. Two things must be decided and written: (a) whether a row is media-only by
design (recommended, consistent with the caption behavior today), stated in `docs/reference/render.md`
and the editors doc so an author is not left with a silent no-op; and (b) that the fixture and
styleguide row proof therefore *requires* real `media:` fixtures, which is G3.

### G3 (blocking), the media fixtures the visual proof needs do not exist, and their bytes are not seeded

**Claim.** Proof: "the reading-surface fixture post gains a media-token single figure and a row";
"the styleguide gains a figure section (single and row) baselined at five widths"; "the
reading-surface fixture post gains a three-picture gallery".

**Evidence.** The showcase's committed manifest has exactly one row:
`examples/showcase/src/content/.cairn/media.json`, `00112233445566aa` / `hello-hero`, 1200×630. The
dev backend's seeded R2 bytes are enumerated at
`packages/cairn-cms-dev/src/fake-github.ts:228-232` (`SEED_MEDIA_KEYS`, drawn from `SEED_MEDIA`,
`PASS_B_MEDIA`, `PASS_C_UNREF`, `PASS_C_ORPHAN_BYTE`) and seeded at
`packages/cairn-cms-dev/src/handle.ts:78`. **`00112233445566aa` is not among them**, so the hello
post's hero image 404s in the e2e server today; `media-hero.spec.ts:137-139` only asserts the `src`,
`alt`, and caption attributes, never a 200, which is why nobody has noticed. The seeded bytes that do
exist are a synthesized 240×160 PNG (`packages/cairn-cms-dev/src/fake-r2.ts:88-89`).

**Correction.** A row or gallery placed in the visual fixture on `media:` tokens will baseline as
either a broken image (no bytes) or a 240×160 synthetic placeholder stretched into a photo slot , 
neither is usable evidence for a paint pass whose merge gate is Geoff's five-viewport read. The pass
must add manifest rows plus matching `SEED_MEDIA_KEYS` entries (a second package, `cairn-cms-dev`,
which the spec's file list does not mention), and should seed realistically-proportioned bytes.
Budget this as its own task; it is the pass's hidden dependency.

### G4 (major), the editor half is not confined to `figure-editor.svelte.ts`

**Claim.** "The editor: `figure-editor.svelte.ts`'s wrap finds the paragraph at the cursor and, when
it holds one to three consecutive media images, wraps them as one figure; edit and unwrap operate on
the whole figure"; "The markdown formatter's mirror of the role set is unchanged."

**Evidence.** `figure-editor.svelte.ts` holds no parsing at all. It reads a `FigureAtImage` snapshot
supplied by the shell (`:20-27`, `getMediaAtCaret`) and calls three pure transforms it imports from
`markdown-format.ts` (`:4`). Every mechanism the row needs lives in `markdown-format.ts`:
`FigureAtImage` carries exactly one image's offsets (`:282-299`); `locateMediaImage` returns one
image (`:314-342`); `buildFigureBlock` emits one image line (`:466-471`); `wrapImageInFigure` takes a
single `imageFrom`/`imageTo` pair (`:482-488`); `figureImageSrc` extracts one token (`:508-511`),
and both `updateFigure` (`:519`) and `unwrapFigure` (`:539`) rebuild from that single token, so
**editing or unwrapping an existing row would today silently delete pictures two and three.**

**Correction.** The formatter's *role set* is unchanged; the formatter itself is the largest single
code change in the pass. Name it: `FigureAtImage` gains the sibling-image list, `locateMediaImage`
gains paragraph-scoped collection, and `buildFigureBlock` / `wrapImageInFigure` / `figureImageSrc` /
`updateFigure` / `unwrapFigure` all become N-image. The dialog surface (`MediaFigureControl.svelte`,
plus the `label` derivation at `figure-editor.svelte.ts:88-97`) is the small part.

### G5 (major), `readCaption` carries the same latent bug, and the fix must be paired

**Claim.** Decision 2: "the latent caption bug is fixed in the same change" (naming only the render
step).

**Evidence.** The render bug is real and located: `remark-figure.ts:106-118`, the no-blank-line
branch, splices `rest` into a caption paragraph with **no `hasText` call**, unlike the blank-line
scan at `:124-129` which does check. Two images on consecutive lines in one paragraph therefore make
image two the `<figcaption>`. But `markdown-format.ts:388-402` mirrors that branch for the editor and
has the same hole: `if (blockEnd != null && doc.slice(imageEnd, blockEnd).trim() !== '')` returns the
*source text of the second image* as the caption string, which the dialog would then prefill and
`updateFigure` would write back as literal caption text.

**Correction.** The spec must name `readCaption` alongside the render step. Fixing one without the
other converts a render bug into a data-loss bug in the editor.

### G6 (major), `SIZES_BY_ROLE` cannot see the count, and a measure-default row has no role at all

**Claim.** Decision 4 / the resolver bullet: "`SIZES_BY_ROLE` gains the row form per count and role."

**Evidence.** The sizes hint is chosen at `resolve-media.ts:180`,
`props.sizes = (role && SIZES_BY_ROLE[role]) || '100vw'`, where `role` comes from `roleFromParent`
(`:155-164`), which scans the parent figure's `className` for a `cairn-place-` prefix **and returns
nothing else**. Two consequences: the count is not available to the lookup at all (it would have to
be read off the same parent's `data-count` or a second class, see G1), and a row at the measure
default carries no `cairn-place-*` class (`remark-figure.ts:84-87` sets `hProperties` only when a
role survives), so `roleFromParent` returns `undefined` and the row falls to the worst-case `100vw`
,  the one hint a three-across row should never emit.

**Correction.** `roleFromParent` becomes a small "figure context" read returning `{ role?, count }`,
and the sizes selection becomes a function of both, with an explicit measure-default row entry.
Roughly 25 lines, but it is a named design change the spec currently reads as a table extension.

### G7 (major), the showcase never has transformations on, so no `sizes` claim is provable there

**Claim.** Decision 4 and the risk about a row's `sizes`; decision 9's "variant ladder when
transformations are on".

**Evidence.** `src/lib/media/config.ts:73`, `transformations: assets.transformations ?? false`. The
showcase passes `{ bucketBinding: 'MEDIA_BUCKET' }` only
(`examples/showcase/src/theme/cairn.config.ts:367,373`), so `resolved.transformations` is `false` and
`imageDetail` never builds a `srcSet` (`resolve-media.ts:105`), which means `applyImageDetail` never
sets `sizes` (`:178-181`).

**Correction.** The row's `sizes` behavior is provable only by engine unit tests over a
transformations-on resolver; no showcase artifact (fixture, styleguide, e2e, baseline) can exercise
it. Say so in the proof list, or the pass will believe it shipped verified behavior it did not.

### G8 (major), decision 9 needs public surface the engine deliberately withholds

**Claim.** "the showcase's page load resolves each gallery picture through the public media resolver
into `{ src, srcset, alt, caption }`, with the variant ladder when transformations are on."

**Evidence.** `createMediaResolver` is public (`src/lib/media/index.ts:19`) and its returned function
does carry `imageDetail` at runtime, but its **declared return type is `MediaResolve`**
(`resolve-media.ts:87`), and `MediaResolveWithDetail` / `MediaImageDetail` are not exported from the
`/media` barrel. `variantUrl` is deliberately withheld: the barrel's header states "the raw
transform-URL builders … stay in their modules unexported here"
(`src/lib/media/index.ts:1-14`). The showcase runs `svelte-check`, so a site cannot read `.imageDetail`
without an unchecked cast.

**Correction.** Either the pass adds public surface (export `MediaImageDetail` and widen or expose
the detail channel, which pulls in `check:reference`, `check:surface`, `docs/reference/media.md`, and
a `Consumers must:`-free but still additive changelog line), or the gallery ships without a srcset
and the spec says so. A cast in the showcase would be a documented seam violation in the one repo
that is supposed to prove the seams. This is a scope decision the spec currently hides inside the
word "public".

### G9 (major), the projection belongs in `entry-data.ts`, not "the article page's server load"

**Claim.** "The article page's server load projects `frontmatter.gallery` …; `ArticleView.svelte`
renders the component between the body and `related`."

**Evidence.** Two routes render `ArticleView`: the prerendered
`examples/showcase/src/routes/(site)/[...path]/+page.server.ts` and the runtime
`(site)/preview/[token]/+page.server.ts`. The showcase already has one module built precisely to stop
those two from drifting, `examples/showcase/src/chassis/entry-data.ts`, whose header says so
verbatim, and whose `withReferences` is the existing precedent for exactly this kind of augmentation.
`ArticleView.svelte`'s own component block (`:1-19`) makes the no-structural-drift claim load-bearing.

**Correction.** Put the gallery projection in `withReferences`' neighborhood in
`$chassis/entry-data.ts` so both routes get it. As written, the spec would ship a gallery that
disappears in preview, a fidelity break the component's contract explicitly forbids.

### G10 (major), the row's geometry in `prose.css` contradicts that file's stated ownership split

**Claim.** Decision 5: "The row's geometry is a chassis mechanic in `prose.css`, under
`@layer components`, copying the composition idiom."

**Evidence.** `examples/showcase/src/chassis/prose.css:15-17` states the split in the file's own
header: "site.css owns the figure-placement geometry (`.cairn-place-center/wide/full` breakout)
scoped to `.site-main`; the article sits inside `.site-main`, so those rules still apply. **This
sheet adds only the figure flow rhythm.**" The rule at `:438-440` is that one flow rule
(`--flow-space`). The actual placement geometry lives in `examples/showcase/src/theme/site.css`
(the `.site-main figure:not(.cairn-place-center) img` cap and the three `.cairn-place-*` blocks,
roughly `:130-172`), and `admin-design-system.md:863-867` documents that contract as site-owned.

**Correction.** A row's grid, gap, and aspect ratio are figure geometry. Either put them in
`site.css` beside the placement rules, or put them in `prose.css` **and amend that file's "what
lives where" header plus `admin-design-system.md:1257-1260`** in the same change. The spec's argument
for `prose.css` (it is the chassis, and the chassis is what a next theme inherits) is defensible; it
just cannot be made silently against a written contract.

### G11 (major), the `max-height: 32rem` rule is not "inert for rows"

**Claim.** Decision 5: "the single-figure `max-height` rule in `site.css` untouched for singles and
inert for rows."

**Evidence.** The rule is `.site-main figure:not(.cairn-place-center) img { max-height: 32rem;
object-fit: cover; }` (`site.css`, around `:136-141`). Its selector is *every* `img` inside a
non-center figure, which includes all three images of a row. It is not inert: it caps each cell and
already imposes `object-fit: cover`, which will interact with (not defer to) the row's own
aspect-ratio + cover rule, and it does nothing at all for a row that carries `.cairn-place-center`.

**Correction.** State the interaction and decide it: either the row rule wins by specificity in the
same sheet, or the existing rule gains a `:not(.cairn-figure-row)` guard. Also note the row at
`.cairn-place-center` inherits `max-width: min(100%, 22rem)` on its `img` (`site.css`, the center
block), which would crush a three-across row; decision 1 says a row "still takes any placement from
the closed set", so center-row is a real combination the geometry must answer.

### G12 (moderate), a gallery placed inside `<article class="prose">` inherits the measure

**Claim.** Decision 7: the gallery is "a plain Svelte component in the article view between the body
and the related list", "three across".

**Evidence.** `ArticleView.svelte` wraps everything in `<article class="prose">`, and the reading
column is capped by `--container-measure` in the chassis; the only escape mechanism in the tree is
the `.cairn-place-wide` / `.cairn-place-full` breakout in `site.css`, which is scoped to
`.site-main` descendants and keyed off those classes. A three-across grid at the text measure gives
roughly 12rem-wide cells.

**Correction.** The spec must say which width band the gallery occupies and which mechanism gets it
there (reuse the `.cairn-place-wide` breakout, or a component-local breakout). This is a paint
decision Geoff will see first at 1440 and 2560.

### G13 (moderate), the emitted-class registry does not currently list the figure classes

**Claim.** Docs bullet: update "the emitted-class registry" for the row's class.

**Evidence.** `docs/reference/render.md:22-43` lists exactly five names, `cairn-head`, `cairn-icon`
(+ `cairn-icon-secondary`), `cairn-glyph`, `cairn-grid`, and explicitly frames itself as "the
emitted-markup side's registry". `cairn-place-*` and `cairn-broken-media` are emitted by
`remark-figure.ts:86` and `resolve-media.ts` and appear nowhere on that page; they are documented
only in internal design docs (`admin-design-system.md:863`, `public-design-system.md:48`).

**Correction.** Adding `cairn-figure-row` alone would document the new name while its siblings stay
missing. Fold the whole figure family into the registry in the same change; it is three lines and
closes a standing gap that the pass would otherwise widen.

### G14 (moderate), the dialog recipe being imported is DaisyUI-shaped

**Claim.** Decision 8: "The public design system imports the admin's dialog recipe for this, its
first public dialog."

**Evidence.** The recipe at `docs/internal/admin-design-system.md:489-501` is expressed in DaisyUI
component classes: "a native `<dialog class="modal">` with a `modal-box`, an `aria-labelledby` title,
a close button, and the `method="dialog"` backdrop". The behavioral half (`showModal()` for focus
trap and Escape, light dismiss only for non-destructive dialogs, the full-height sheet below the
narrow breakpoint) is design-system-agnostic and transfers cleanly; the class vocabulary does not,
even though `theme.css` does bundle DaisyUI for the public layer (`prose.css:26-27`).

**Correction.** Say that what is imported is the *behavioral* recipe rendered over chassis tokens
(which the theme bullet already implies), so the a11y reviewer grades against the behavior contract
and nobody ships `modal-box` into a design-agnostic public component.

### G15 (minor), "none of them ships text-wrapped floats" overstates the input record

**Claim.** "none of them ships text-wrapped floats anymore" (framing) and, in Out of scope, "no
platform ships them".

**Evidence.** `docs/internal/record/2026-09-08-pictures/conventions-research.md:33-37` says the
opposite of a finding: "no evidence found of a true CSS-float text-wrap option in Medium's own
editor. … (Absence of a floated-image option is **inference from the documented tier list**, not an
explicit 'Medium has no float' statement, flag as inference)." The record is scrupulous about its own
confidence; the spec launders the inference into a fact. The same record flags a possible
misattribution of the per-image-caption claim between Medium and Ghost (`:28-32`).

**Correction.** "No platform in the survey documents one" is the honest form and costs nothing, the
decision does not depend on the stronger claim.

### G16 (minor), the four-picture failure mode is not the same shape as an unknown icon name

**Claim.** Decision 1 and the render bullet: "a fourth is an author-input error the step reports the
way an unknown icon name is reported"; "four or more pictures fail loud at render with a message
naming the limit (the same build-backstop posture)".

**Evidence.** `remark-figure.ts` throws nowhere today; its documented posture for a degraded
authoring state is the opposite, `:90-92`, "A figure with no media image is a degraded authoring
state: leave its children, invent no image, never throw." The throwing backstop in this area belongs
to the *resolver* (`resolve-media.ts:71-74`: a preview miss marks broken, a build resolver throws),
which is a two-mode contract keyed on preview vs build. A bare `throw` in `remarkFigure` would fire
in the **admin preview** too, where an author is mid-edit and has just pasted a fourth picture, and
the preview has no error surface for a thrown render.

**Correction.** Pick the preview-safe form: render the first three as a row and mark the rest broken
(the `markNodeBroken` idiom), or degrade the whole figure the way a no-image figure degrades, and let
a lint or the save guard carry the loud half. If a throw really is wanted, the spec must say what the
preview does with it.

---

## CORRECT

Claims opened and confirmed, worth recording so the plan does not re-litigate them:

- **The no-blank-line caption bug is real and precisely located.** `remark-figure.ts:106-118` skips
  the `hasText` check the blank-line branch does at `:124-129`. Two images in one paragraph do make
  image two the caption. (The blank-line form already handles multiple images correctly, since an
  image-only paragraph carries no text node and `hasText` returns false, so the bug is exactly as
  narrow as the spec says.)
- **The placement set is closed and single-valued.** `remark-figure.ts:20,82-83` keeps a class only
  when `ROLES.has(className)` on the whole attribute string, so `{.wide .row}` would indeed drop the
  role. A row cannot be a fifth placement. Decision 1's premise holds.
- **The pictures as direct children leave the resolver's role scan intact.** `roleFromParent`
  (`resolve-media.ts:155-164`) reads the parent figure's `className` array with `.find()`, so an
  additive `cairn-figure-row` marker alongside `cairn-place-wide` changes nothing for the role read
  (the count, separately, is G6).
- **The hero path returns a bare URL, and there is no `array(image)` projection.**
  `public-routes.ts:86-107`, `deriveHeroImage` emits `{ url, absoluteUrl, alt, caption? }` from
  `frontmatter.image` only, with no srcset and no array arm. Decision 9's premise is accurate.
- **The gallery field exists and the container editor drives it end to end.**
  `cairn.config.ts:427` declares `gallery: fields.array(fields.image(...))`;
  `examples/showcase/e2e/container-fields.spec.ts:102-132` is the round-trip. Nothing renders it.
- **`ImageValue.caption` is real and the array-row editor already collects it.**
  `src/lib/content/types.ts:31-37`; `MediaHeroField.svelte:60,121,477`, the same field component
  backs an array(image) row and submits `<name>.caption`. Decision 7's "no schema change" holds, and
  per-picture gallery captions need no editor work.
- **`prose.css` is reached by the editor preview frame as well as the public page**
  (`prose.css:18-20`), so row geometry placed there does show in the preview, a genuine argument for
  decision 5 that the spec does not make.
- **The five-viewport visual matrix and its baselines are exactly as assumed.**
  `examples/showcase/e2e/site-visual.spec.ts:23` (`[320, 390, 768, 1440, 2560]`), two schemes, plus
  the 1920 mid-clamp article shot at `:66-72`.
- **A `<figure>` with three `<img>` children plus a `<figcaption>` passes the floor.** See G1;
  only `data-count` fails.

---

## Ranked top five

1. **G3, the media fixtures and their R2 bytes do not exist.** The whole visual proof (row and
   gallery, fixture and styleguide, five widths, two schemes) rests on `media:` pictures that have
   no manifest rows and no seeded bytes, in a second package the spec never names. Fix first or the
   pass baselines broken images.
2. **G4 + G5, the editor half is `markdown-format.ts`, not `figure-editor.svelte.ts`.** Five pure
   transforms plus a public type go N-image, and `readCaption` carries the same caption bug the
   render step does. As specified, editing a row would delete pictures two and three.
3. **G8, decision 9's gallery srcset needs public surface the barrel deliberately withholds.**
   Either widen the seam (with the reference-doc and `check:surface` cost) or ship the gallery
   without a ladder. It is a scope fork, not a detail.
4. **G1, `data-count` is stripped by the sanitize floor.** One line to fix, but the spec currently
   specifies a mechanism that does not reach the browser; a second marker class avoids the schema
   change entirely.
5. **G2 + G6, the row is media-only and a measure-default row emits `sizes: 100vw`.** The first is
   an unstated authoring precondition that will read as a silent no-op; the second is the exact wrong
   hint for the exact shape the pass exists to add.

---

## Feasibility

**Line estimates** (changed or added, excluding tests and baselines):

| Change | Lines | Note |
| --- | --- | --- |
| `remark-figure.ts` multi-image unwrap, caption re-check, marker, over-limit | 60–80 | file is 134 lines today; near a rewrite of the visitor body |
| `resolve-media.ts` figure-context read + count-aware sizes | 25–35 | G6 makes it a small refactor, not a table edit |
| `sanitize-schema.ts` marker admission (if `data-count` is kept) | 1–3 | plus one unit test |
| `markdown-format.ts` N-image transforms + `readCaption` fix | 120–170 | the largest single change; five exported functions plus `FigureAtImage` |
| `MediaFigureControl.svelte` + `figure-editor.svelte.ts` labels/title | 25–40 | mechanical once the formatter lands |
| chassis/theme CSS for the row (grid, gap, aspect, placement interplay) | 30–50 | plus the header-comment amendment of G10 |
| `PostGallery.svelte` (grid, `<dialog>` viewer, keyboard, focus, styles) | 200–260 | the second-largest change; a11y-graded |
| showcase gallery projection in `$chassis/entry-data.ts` | 30–50 | both routes via G9 |
| fixtures: manifest rows, `SEED_MEDIA_KEYS`, fixture post, styleguide sample | 40–70 | spans three packages |
| public surface for `MediaImageDetail`, if G8 is taken | 10–20 | plus reference page |
| docs: `render.md`, `write-in-the-editor.md`, `add-an-image.md`, chassis README, `public-design-system.md`, `what-the-scaffold-wrote.md`, CHANGELOG | 120–180 | seven files |

**Test counts.** `src/tests/unit/remark-figure.test.ts` holds 12 cases today (145 lines); the row
adds 8–10 (one/two/three/four images, caption with and without a blank line, a non-media image among
media ones, the marker, the degraded cases). `markdown-format.test.ts` holds 60 cases (401 lines);
the N-image transforms and the `readCaption` fix add 10–14, and this is where the regression risk
concentrates. Add 3–4 resolver cases for the count-aware `sizes` (transformations forced on, since
the showcase cannot reach them, G7), 1 sanitize case, 4–6 component cases for the viewer's keyboard
and focus contract, and 1 e2e spec (~80–120 lines) for open/cycle/Escape/focus-return. Visual
baselines that move: 10 article + 1 article-1920 + 10 styleguide = **21 regenerated on CI**, and every
one is graded by eye.

**Is "one pass, roughly eight tasks" right? No, recommend two passes.** Three independent reasons.
(1) The spec carries **two** separately paint-graded surfaces (the row's geometry across four
placements, and the gallery plus its first public dialog), each owed the full B1 protocol: before and
after captures, an intended-moves manifest, contact sheets, the verifier loop, and Geoff's
five-viewport read. That is the protocol run twice inside one pass. (2) The engine half has grown
past its stated shape: G4's formatter work, G6's resolver refactor, G8's possible public-surface
addition, and G3's cross-package fixture plumbing are four substantial items the spec's file list
reads as two. (3) The two halves share exactly one artifact, the fixture post, and depend on each
other nowhere, the textbook split. Counting honestly, the work is 11–13 tasks and roughly two paint
gates; the cut point is clean.

Proposed shape: **Pass N (the row)** = engine, chassis, editor, docs, one paint gate. **Pass N+1 (the
gallery)** = fixtures, projection, component, viewer, e2e, docs, one paint gate. Pass N+1 depends on
N only for the fixture-media groundwork, which Task 1 below front-loads deliberately.

---

## Task proposal (liftable)

### Pass N, the row

**Task 1. Media fixtures and seeded bytes (do first; blocks every visual proof).**
Add three manifest rows to `examples/showcase/src/content/.cairn/media.json` with realistic
dimensions, add their object keys to `SEED_MEDIA_KEYS`
(`packages/cairn-cms-dev/src/fake-github.ts:228`), and seed bytes proportioned to the declared
width/height rather than the flat 240×160 default (`fake-r2.ts:88-89`).
*Acceptance:* a `GET /media/<slug>.<hash>.png` against the e2e preview server returns 200 with
`image/png` for every new hash and for `00112233445566aa`; `media-hero.spec.ts` gains a response-status
assertion so the standing gap cannot reopen; `npm test` green.

**Task 2. The render step lifts every media image and fixes the caption scan.**
`findMediaImages` replaces `findMediaImage`; the unwrap lifts one to three media images as direct
children in document order; the no-blank-line branch re-runs the text check before stamping a
caption; the figure gains the row marker when N > 1; N ≥ 4 degrades preview-safely per G16.
*Acceptance:* unit cases for one, two, three, and four images; caption with and without a blank line;
a non-media image among media ones; a figure with no media image still degrades as documented
(`remark-figure.ts:90-92`); the marker appears only for N > 1; **the marker survives
`buildSanitizeSchema` in a rendered-output assertion, not only in the mdast** (G1); no throw reaches
the preview path.

**Task 3. Count-aware `sizes`.**
Extend the parent read from a role string to a figure context `{ role?, count }` and select the hint
from both, including an explicit measure-default row entry; the under-800px srcset guard
(`resolve-media.ts:105-108`) is unchanged.
*Acceptance:* unit cases over a transformations-on resolver for each of {measure, center, wide,
full} × {1, 2, 3}; a single figure's existing hints are byte-identical to today's; no row emits a bare
`100vw` unless `full`; the reference page states the 48rem assumption.

**Task 4. The formatter goes N-image (the correctness-critical one; consider an upshift).**
`FigureAtImage`, `locateMediaImage`, `buildFigureBlock`, `wrapImageInFigure`, `figureImageSrc`,
`updateFigure`, `unwrapFigure`, and `readCaption` all handle one to three images; every media token
stays byte-identical through wrap, edit, and unwrap (the standing open-risk-3 invariant).
*Acceptance:* round-trip cases at one, two, and three pictures for wrap → edit → unwrap; a row's
second and third tokens survive an edit that changes only the caption; `readCaption` returns `''`
(not image source) for a two-image no-blank-line figure; the existing 60 formatter cases stay green
untouched.

**Task 5. The dialog reflects the count.**
`figure-editor.svelte.ts`'s label/title derivation and `MediaFigureControl.svelte` read the count from
the snapshot; the title reads "Row of N pictures"; no new toolbar item.
*Acceptance:* component or unit coverage of the label at one, two, and three; the caret-snapshot
contract (`figure-editor.svelte.ts:100-115`) is unchanged; the entry-key reset block still passes
`edit-page-state-reset-coverage.test.ts`.

**Task 6. The row's geometry.**
Mobile-first single column, one `@media (min-width: 48rem)`, gap and aspect as overridable custom
properties, and an explicit answer for `.cairn-place-center` + row and for the `max-height: 32rem`
interaction (G11). Whichever sheet is chosen, the sheet's "what lives where" header and
`admin-design-system.md:1257-1260` are amended in the same commit (G10).
*Acceptance:* the styleguide gains a figure section (single and row, at the measure and wide)
baselined at five widths in both schemes; no horizontal scrollbar at 320 or 2560; the single-figure
rendering is pixel-unchanged where no row is present.

**Task 7. Docs and changelog for the row.**
`docs/reference/render.md` (the row form, and the whole figure class family per G13), the media-only
precondition (G2), `docs/editors/write-in-the-editor.md:115` gains the row paragraph, `CHANGELOG.md`
under `## Unreleased` naming the caption-bug fix and its output change.
*Acceptance:* `npm run check:reference` and `check:package` green; Vale clean; the
existing-two-image-figure survey named in the risk list is run against the family sites and its result
recorded in the changelog entry.

### Pass N+1, the gallery

**Task 8. The projection.**
`frontmatter.gallery` → `{ src, srcset?, alt, caption? }[]` in `$chassis/entry-data.ts` beside
`withReferences`, so both the prerendered and the preview route carry it (G9); resolve the G8 fork
explicitly (widen the seam, or ship without a ladder and say so).
*Acceptance:* the projection is non-empty on both routes for the fixture post and empty-safe for an
entry with no gallery; a raw external URL degrades the way `ArticleView`'s `rawHeroFallback` does;
`svelte-check` clean with no cast into engine internals.

**Task 9. `PostGallery.svelte`.**
`<section id="gallery">` with a heading, an ordered grid linking each picture to its largest variant,
and the width band named per G12; rendered between the body and `related`.
*Acceptance:* the grid works with scripting disabled (each link opens the picture); three across,
two at tablet, one on phone; `#gallery` is linkable from body prose; the fixture post's three-picture
gallery is baselined at five widths in both schemes.

**Task 10. The viewer.**
A native `<dialog>` opened by selecting a picture: previous/next, caption, arrow keys, Escape, close,
focus returned to the opening picture, reduced motion honored, over chassis tokens following the
*behavioral* admin dialog recipe (G14).
*Acceptance:* component tests for the keyboard and focus contract; an e2e case opens, cycles with the
arrow keys, closes with Escape, and asserts the focus return; the `daisyui-a11y-reviewer` gates it;
`public-design-system.md` records the public dialog recipe.

**Task 11. Gallery docs.**
`docs/editors/add-an-image.md` gains the gallery paragraph, the chassis README's file table, and
`what-the-scaffold-wrote.md`.
*Acceptance:* Vale clean; the editors track stays on the Microsoft register; `container-fields.spec.ts`
is unchanged.

---


Object: `docs/superpowers/specs/2026-09-08-pictures-design.md` @ main (d565ab77), DRAFT.
Read-only. Findings numbered D1..D35, severity `blocking` / `should-fix` / `note`.
WCAG 2.2 AA criteria cited where they apply.

---

## A. The row: correctness against the code the spec builds on

### D1 `data-count="N"` is stripped by the delivery sanitizer, blocking

Decision 1 stamps the figure with `data-count`. The delivery sanitize floor admits, on `*`,
only `className` plus a fixed marker list:

- `src/lib/render/sanitize-schema.ts:13`, `const FIXED_MARKERS = ['dataPrimitive', 'dataSlot', 'dataRole', 'dataRise'];`
- `src/lib/render/sanitize-schema.ts:31`, `const markers = [...FIXED_MARKERS, ...attrMarkers];`
- `src/lib/render/sanitize-schema.ts` `'*': [...(attributes['*'] ?? []), 'className', ...markers]`

`dataCount` is in neither list, and `attrMarkers` is derived from the *component registry*, which
`figure` (a reserved directive) is not in. So `data-count` never reaches the DOM, and any CSS or
JS keyed on it fails silently in production while passing any unit test that inspects the mdast.
The mechanics research flagged exactly this (`mechanics-research.md` A2, "a `data-*` attribute
would need a schema addition"); the spec adopted the attribute and dropped the caveat.

Also: the count is not needed in the DOM at all. `sizes` is computed in `resolve-media.ts` from
the mdast, pre-sanitize, so it can count the figure's image children directly. And the grid needs
no count either: `grid-auto-flow: column; grid-auto-columns: 1fr` sizes N columns without knowing
N (this is the `composition.css:77-93` sidebar idiom's sibling). Neither `data-count`, nor
`:has(> img:nth-of-type(3))`, nor a per-count class is required.

**Change decision 1**: strike `with \`data-count\`` and replace with "marked `cairn-figure-row`
only; the count is read from the mdast for `sizes` and never emitted, since the grid sizes its
columns intrinsically and the sanitize floor (`sanitize-schema.ts:13,31`) admits no `data-*`
attribute outside the registry markers." If a count attribute is kept for any reason,
`src/lib/render/sanitize-schema.ts` must be named in the file list and `dataCount` added to
`FIXED_MARKERS`.

### D2 Cascade layers defeat decision 5; three site.css rules already own the row, blocking

Decision 5 puts the row's geometry in `prose.css` and asserts the `site.css` height cap is
"untouched for singles and inert for rows." Both halves are wrong.

- `examples/showcase/src/chassis/prose.css:43`, the **whole file** is `@layer components`.
- `examples/showcase/src/theme/site.css` contains no `@layer` at all; its rules are unlayered.
- `examples/showcase/src/chassis/README.md:81-84` states the consequence: "an unlayered site rule
  always beats a layered Tailwind utility."

An unlayered rule wins over a layered one **regardless of specificity**, so `prose.css` cannot
override any of these three, all of which hit a row:

1. `site.css:118-130`, `.site-main figure figcaption, .site-main figure > * + *` applies
   `margin-top: var(--spacing-2xs)`, `font-size: var(--text-step--1)`, `line-height: 1.5`,
   `color: var(--color-muted)` to **every figure child after the first**. In a row the 2nd and 3rd
   `<img>` are exactly that, so each picture after the first gains a stray `margin-top` on top of
   the grid gap. The `> * + *` selector was written for the raw-URL caption fallback and its
   comment says so; it never anticipated sibling images.
2. `site.css:132-141`, `.site-main figure:not(.cairn-place-center) img { max-height: 32rem; object-fit: cover; }`
   applies to every wide/full row picture. It is not inert: at 2560 a full 3-up row gives each cell
   ~845px, and a 3:2 aspect wants ~563px = ~35.2rem of height, above the 32rem cap. The cap wins,
   so the declared aspect is silently violated at the top viewport and the row renders at a
   different shape at 2560 than at 1440. That is the "composed at the extremes" bar failing on the
   exact viewport the standard names.
3. `site.css:112-117`, `.site-main figure img { height: auto }` beats any `height: 100%`
   equal-height mechanism written in `prose.css`. (An `aspect-ratio` approach survives `height: auto`;
   a `height: 100%` approach does not. The spec does not say which it uses.)

**Change decision 5**: name `examples/showcase/src/theme/site.css` in the file list and state that
the `> * + *` caption fallback and the `max-height: 32rem` cap both gain a
`:not(.cairn-figure-row)` guard (or that the row's own rules move to `site.css` alongside
`.cairn-place-*`). Replace "the single-figure `max-height` rule in `site.css` untouched for singles
and inert for rows" with the accurate statement.

### D3 The `figcaption` has no `grid-column: 1 / -1`, blocking

Decision 3 makes the `<figure>` itself the grid. Its children are then N images **and** the
`<figcaption>`, so at ≥48rem the caption becomes an (N+1)th column sitting beside the pictures.
The mechanics research spelled this out (`mechanics-research.md` A1, option (a) "with `figcaption`
as a full-width grid item (`grid-column: 1 / -1`)"); the spec kept option (a) and dropped its one
required rule. The same rule must catch the raw-`<p>` caption fallback, which is not a `figcaption`
(see D20).

**Change decision 5**: add "the caption spans the row (`figure.cairn-figure-row > figcaption,
figure.cairn-figure-row > p { grid-column: 1 / -1; }`)".

### D4 The row's aspect ratio is never given a value, and cropping a story's photographs is decided by omission, blocking

Decision 5 commits to "equal heights by a fixed aspect ratio with `object-fit: cover`" and names
`--cairn-figure-row-aspect` as the seam, but the spec never states the default. For a design spec
whose entire visual claim is the row, the aspect **is** the design. Three sub-problems:

- **Which aspect.** 3:2 matches the showcase's landscape content; 4:3 is safer for mixed sets;
  1:1 is the platform convention for a grid (Squarespace's "same size and dimensions arranged
  uniformly", `conventions-research.md` §Squarespace) but reads as a contact sheet, not a
  narrative row.
- **What a portrait loses.** A 3:4 portrait in a 3:2 cell keeps 44% of its height, centered.
  `object-position` is not offered as a seam, so the author cannot save a subject at the top or
  bottom of the frame. For photographs "a story depends on" this is content loss the author cannot
  see coming and cannot fix.
- **The alternative the spec does not consider.** A justified row (the Flickr/Google Photos shape)
  gives equal heights with **no crop**: give each item `flex-grow` proportional to its aspect and
  the row's heights match by construction. The engine already writes intrinsic `width`/`height` on
  every resolved media image (`resolve-media.ts:161-173`, "writes `width`/`height` always"), so the
  ratio is available; it would be emitted as an inline custom property per image. Its weakness is
  honest and citable: `imageDetail` is absent for a hand-rolled `resolveMedia`
  (`resolve-media.ts:59-71`) and for any raw external URL, so the fallback (all cells equal) must
  be defined.

**Change decision 5**: state the default aspect and its number; state what happens to a portrait;
and either adopt the justified-row alternative or record it as considered and rejected with the
reason. Add `--cairn-figure-row-fit` and `object-position` to the override seams if `cover` stays.

### D5 One 48rem breakpoint is wrong for the measure placement, and unbounded at the top, should-fix

Decision 4 and 5 pin a single `@media (min-width: 48rem)` for every count and every role.

- 48rem = 768px. `--container-measure: 44rem` = 704px (`theme.css:259`). A **measure-default 3-up
  row** therefore promotes to three columns at the exact moment each picture is
  `(44rem - 2 gaps) / 3` ≈ 13.7rem ≈ 219px wide. Three 219px photographs is not "composed"; it is
  a thumbnail strip in the middle of a reading column.
- At the top, a **full 3-up row at 2560** gives each picture ~845px (and the root `clamp()` in the
  ultrawide posture, `public-design-system.md:107-116`, grows the rem-based measures another
  ~12.5%). The spec sets no ceiling. Combined with D2's 32rem cap, the row silently reshapes.

Neither end is addressed. Options: vary the breakpoint by count (2-up promotes earlier than 3-up),
vary it by role (a `full` row can promote at 48rem; a measure row should promote much later or
never go 3-up), or drop the breakpoint for an intrinsic
`grid-template-columns: repeat(auto-fit, minmax(<floor>, 1fr))`, which composes at both ends
without a media query. The intrinsic form costs the numeric agreement `sizes` needs (D31), which is
the real tension and should be stated as such.

**Change decisions 4 and 5**: state the promotion rule per count and per role, name the minimum
picture width a row is allowed to produce, and state the row's maximum total width at 2560.

### D6 `center` + row is incoherent, should-fix

Decision 1: a row "still takes any placement from the closed set." For `center`, `site.css:145-151`
sets `text-align: center` and `img { max-width: min(100%, 22rem); margin-inline: auto }`. A 3-up
center row is three 22rem-capped images inside a 44rem column, i.e. it cannot fit, and the
`:not(.cairn-place-center)` height-cap exemption means center rows alone dodge D2's cap. `center`
exists for "a portrait or a detail shot" (its own comment), the single-picture case.

**Change decision 1** to "a row takes `wide`, `full`, or the measure default; `center` is a
single-picture placement and the editor does not offer it for a row", and mirror that in the
`MediaFigureControl` change under "The row (engine and chassis)".

### D7 The stacked state at 320/390 should not crop, should-fix

"equal heights by a fixed aspect ratio with `object-fit: cover` inside rows" is ambiguous about the
single-column state. At 320 the pictures are stacked full-width, one under another; there is
nothing to equalize, so cropping there is pure loss. The aspect rule belongs inside the
`@media (min-width: 48rem)` block only.

**Change decision 5**: "the aspect and `object-fit` apply only in the multi-column state; a stacked
row renders every picture at its own proportions."

### D8 A wide row's caption runs past the measure, should-fix (note at singles, worse at rows)

`site.css:173-181` returns a caption to `--container-measure` for `.cairn-place-full` only.
`.cairn-place-wide` has no such rule, so a wide caption already runs the full 58rem band today.
Under a wide **row** at 2560, with the ultrawide root clamp, a shared caption is the one line of
prose in the figure and it runs to ~65rem. The design system's own measure discipline
(`public-design-system.md:107-116`) argues against it.

**Change** the file list to note the `.cairn-place-wide figcaption` measure return, or record the
decision to leave it.

### D9 Rows require `media:` tokens, and the spec never says so, should-fix

`findMediaImage`'s gate is `parseMediaToken(n.url) !== null` (`remark-figure.ts:52`). A raw external
image URL never matches, so **two raw-URL pictures in one `:::figure` do not become a row**, they
stay a stacked, unstyled figure (and today hit the caption bug). This is not a corner case: the
showcase's own reading-surface post uses raw Unsplash URLs in all three of its figures
(`2026-04-05-the-reading-surface.md:107,115,123`), and `site.css:118-130` documents raw URLs as
"media 3a's other supported authoring path."

**Change** "The row (engine and chassis)" to state the limit, and the editors-doc bullet to carry it.

### D10 The caption-fallback `<p>` is not a `figcaption`, so a row's fallback caption is also a grid item, should-fix

Same root as D3 and D9: when the caption is a plain `<p>` (raw-URL path), the `grid-column: 1 / -1`
rule must catch it too. Since a raw-URL figure is never a row (D9) this is only reachable if a row
mixes a media token with a raw URL, which "a non-media image among media ones" is an explicit test
case in the Proof list. State the expected output for that case.

---

## B. Semantics of one `<figure>`, N `<img>`, one `<figcaption>`

### D11 The structure is correct; record it so the pass does not re-litigate, note

One `<figure>` containing N `<img>` and one `<figcaption>` is valid HTML (a `figure` accepts flow
content plus at most one `figcaption`, in first or last position). HTML-AAM maps `<figure>` to
`role="figure"` and the `figcaption` supplies the figure's accessible name, so a screen reader
announces the group's caption once and then each image's own `alt` in sequence. The caption is
associated with the **group**, which is precisely Geoff's "one shared caption" and satisfies 1.3.1
(Info and Relationships) without any ARIA. One constraint: do **not** also put `aria-label` or
`aria-labelledby` on the figure, which would suppress the caption as the name.

**Add to decision 2**: "the shared caption names the figure group; no ARIA is added, and the figure
never carries `aria-label`."

### D12 The alt-then-caption reading sequence needs authoring guidance, should-fix (1.1.1)

In a 3-up row a screen-reader user hears three `alt` strings back to back, then the caption. Two
failure modes the spec does not address:

- **Redundancy.** If each `alt` restates the caption, the reader hears the same sentence four
  times (NN/g's alt-redundancy guidance, cited in `conventions-research.md` §Accessibility).
- **Count mismatch.** A picture marked decorative gets `alt=""` and drops out of the sequence
  entirely, so a caption reading "three views of the pass" is heard alongside two images.

**Change** the editors-doc bullet: alt text in a row describes what is different about each picture
and does not repeat the shared caption; marking one picture in a row decorative is almost always
wrong.

### D13 `decorative` is computed from one token, and the spec does not say which, should-fix

`figure-editor.svelte.ts:96-102` derives `decorative` by regex over **the** token slice, and
`MediaFigureControl.svelte:62`'s `decorativeWithCaption` surfaces the decorative-plus-caption
contradiction. With N pictures there is no single answer.

**Change** the editor bullet: state whether `decorative` is per-picture (and therefore leaves the
dialog) or is the AND/OR across the row, and what `decorativeWithCaption` warns about for a row.

---

## C. The gallery grid

### D14 The gallery viewer is an engine-level mechanic placed in the site, should-fix

`PostGallery.svelte` lands in `examples/showcase/src/theme/components`, and "the consumer sites'
chassis copies" are out of scope. But "a public picture viewer over a set of captioned images" is
the textbook case in CLAUDE.md's engine-level UI mechanics rule: it recurs in any component of that
shape on any cairn site, and leaving it in one theme leaves ecxc-ski and 907-life to rediscover the
whole dialog contract (focus, Escape, position announcement, reduced motion). The mechanics
research reached the same conclusion for the row (`mechanics-research.md` A4, "this reads as a
mechanic") and the same reasoning applies harder here, because the a11y contract is the expensive
part. At minimum the *behavioral* half (the keyboard and focus contract) belongs in the chassis.

**Change** decision 7 or the Out-of-scope list: either place the viewer in the chassis, or state
why the row is a mechanic and the viewer is not, in the rule's own terms.

### D15 Consumers inherit the class without the CSS, should-fix

The engine emits `cairn-figure-row`; the CSS lives in each site's **own copy** of `prose.css`. A
consumer site that upgrades the engine before copying the new chassis gets a `:::figure` with three
full-width stacked pictures, no grid, no gap, and the `> * + *` caption typography on pictures 2
and 3 (D2). The Risks section names the caption-bug output change but not this window.

**Change** Risks: add the class-without-CSS window and say what the `CHANGELOG` `Consumers must:`
line will read.

### D16 The no-JS fallback link: acceptable, but its accessible name is not, should-fix (2.4.4)

Linking a thumbnail to its largest variant is the honest no-JS fallback and matches the platform
convention. But the anchor's accessible name comes from the `<img>` `alt`, so the link announces as
the picture's description with no hint that it navigates away from the article to a bare image
resource with no chrome, no caption, and no title. Two fixes, both cheap: append a visually hidden
suffix ("full size") to the link's name, and when JS upgrades the same anchor, add
`aria-haspopup="dialog"` and keep the `href` intact (so middle-click and "open in new tab" still
work).

**Change** the `PostGallery.svelte` bullet to state the link's accessible name in both states.

### D17 Grid markup shape unspecified, and `<figure>` items inherit the wrong geometry, should-fix

The bullet says "an ordered grid of `<a href={largest}><img>`" and separately "as `figcaption` in
the grid when present". A `figcaption` requires a `<figure>` parent, so the markup is
under-determined: is each cell `<figure><a><img></a><figcaption></figcaption></figure>`? If so, and
the gallery sits inside `<article class="prose">` under `.site-main`, each cell inherits
`site.css:109-111` `.site-main figure { margin: var(--spacing-l) 0 }` (2rem of vertical margin on
every grid cell, on top of the grid gap) and `site.css:132-141`'s 32rem cap. "an ordered grid" also
reads as `<ol>`, which is a third possible shape.

**Change** the bullet to give the exact per-cell markup and to say which `.site-main figure` rules
the gallery opts out of.

### D18 Thumbnail aspect and cropping unspecified, should-fix

Same omission as D4, one level down. "three across, two at the tablet width, one on a phone" gives
the column count and nothing about cell shape. A uniform grid needs a uniform aspect (this is the
one place `object-fit: cover` is genuinely conventional, per `conventions-research.md` §Squarespace),
but the spec should say so and name the ratio, and say whether the phone's single column crops.

### D19 The grid's breakpoints are unnamed numbers, note

"three across, two at the tablet width, one on a phone" names no values. The chassis has exactly one
precedent (48rem, `composition.css:77-93`) and the site.css sheet has **no width breakpoint at all**
(every responsive behavior is `min()`/`clamp()`/intrinsic sizing). A `repeat(auto-fill, minmax(…, 1fr))`
grid would match the sheet's existing idiom and need no breakpoint.

### D20 Heading level unstated (1.3.1), `id="gallery"` can collide, and the anchor can be dead, should-fix

Three separate problems in decision 7's one sentence:

- **Level.** The gallery `<section aria-labelledby>` sits after `{@html data.html}`, whose body may
  end on an `h2` or `h3`. The heading must be an `h2` (a sibling of the body's top-level sections),
  never chosen to match the preceding level. Skipped or sized-for-looks heading levels are 1.3.1.
- **Collision.** `rehypeSlug` runs over the body (`pipeline.ts:119`), so a post with a body heading
  "Gallery" already emits `id="gallery"`, and the page then has two. The document-wide duplicate id
  breaks the fragment link and is a 4.1.1-lineage parsing defect.
- **Dead anchor.** The component renders only "when the projection is non-empty", so an author who
  writes "see the gallery below" linking `#gallery` in a post whose Gallery field is empty gets a
  link to nothing, with no warning.

**Change** decision 7: state the heading level and its default text, state the id-collision
resolution (prefix it, e.g. `cairn-gallery`, or defer to `rehypeSlug`'s own de-duplication), and say
what happens to a `#gallery` link when the field is empty.

### D21 "The story references it" has no affordance, should-fix

Decision 7 says "so the story can reference it by link" and the editors-doc bullet says "the story
can link to `#gallery`". For a non-technical editor, "link to `#gallery`" is a raw-markdown
instruction with no toolbar path, no autocomplete, and no validation, in a product whose whole
premise is that authors do not need to know that. What "reference" means for a **reader** is also
undecided: a link in a sentence, a standing "See the gallery" line the theme emits, or nothing (the
heading alone, discovered by scrolling).

**Change** decision 7 to name the reader-facing form, and say whether the editor gains any
affordance or whether the raw-markdown link is the accepted answer with the editors doc carrying
the exact string to type.

---

## D. The viewer dialog

### D22 The imported dialog recipe does not compile on the public side, blocking

Decision 8 says "The public design system imports the admin's dialog recipe for this." That recipe
is, verbatim (`admin-design-system.md:489-493`), "a native `<dialog class="modal">` with a
`modal-box`, an `aria-labelledby` title, a close button, and the `method="dialog"` backdrop."
`modal`, `modal-box`, and `modal-backdrop` are **DaisyUI component classes**, and the chassis
excludes `modal` from the DaisyUI build:

- `examples/showcase/src/chassis/tokens.css:55-60`, the `exclude:` list contains `modal` (and
  `carousel`, and `dropdown`).
- The file's own comment (`tokens.css:22-23`) states the remedy: "A theme that adopts a
  currently-excluded component (a `.tooltip`, a `.modal`) drops its key from the `exclude` list
  below; this is chassis-level, shared by every theme."

So the spec must choose, and it does not: drop `modal` from the exclude list (a chassis-level change
every theme inherits, contradicting "the grid and the dialog in the component's scoped styles over
chassis tokens"), or hand-write the dialog CSS and import only the **behavioral** half of the admin
recipe. The second is almost certainly right, and is what the CSS bullet implies, but then the
sentence "imports the admin's dialog recipe" is false as written.

**Change decision 8** to: "the public design system adopts the admin dialog recipe's *behavioral*
contract (native `<dialog>` + `showModal()`, `aria-labelledby`, close button, backdrop light
dismiss, focus in on open and back to the trigger on close); its DaisyUI `modal`/`modal-box`
classes are not available on the public side (`tokens.css:55-60` excludes `modal`), so the box is
hand-written over chassis tokens." Then say explicitly that `carousel` stays excluded and the
viewer is not a carousel.

### D23 No accessible name for the dialog, and no statement of where focus lands on open, blocking (4.1.2, 2.4.3)

Decision 8 lists "previous and next, the caption, arrow keys, Escape, close, focus returned to the
picture that opened it, reduced motion honored", and omits both halves of the dialog's own
identity:

- **Name.** The admin recipe requires `aria-labelledby` on every dialog (`admin-design-system.md:489`).
  Without it the viewer announces as an unnamed dialog. 4.1.2 Name, Role, Value.
- **Focus on open.** `showModal()` autofocuses the first focusable descendant (or the dialog itself
  when none is focusable / with `autofocus`). If "Previous" is first in the DOM, a keyboard user
  lands on "Previous" with no context. The admin's own convention is explicit
  (`admin-design-system.md:559-573`, zen mode: "Focus moves to the close button on open and returns
  to the trigger on close"). 2.4.3 Focus Order.

**Change decision 8** to name both: the dialog's `aria-labelledby` target, and that focus moves to
the close button (or an `autofocus`'d dialog with a visible name) on open.

### D24 No position indicator and no live region, should-fix (4.1.3)

Nothing in the spec announces which picture of how many is showing. Pressing Right Arrow changes
the image silently: the `<img>` swaps, and neither its `alt` nor the caption is announced, because
neither is in a live region and focus has not moved. A sighted user sees the change; a screen-reader
user gets nothing. 4.1.3 Status Messages.

The fix and its trap: a visible "3 of 7" plus the caption inside a container that carries
`aria-live="polite"` **and exists in the DOM from the moment the dialog opens** (a live region
created at the same time as its first content does not reliably announce). Do not also wire the
caption through `aria-describedby` on the image, the caption is already in the dialog's reading
order, and describedby would announce it twice.

**Add to decision 8**: the position indicator, its live region, and the "region exists at open"
requirement; and state that the caption is visible text, not `aria-describedby`.

### D25 The imported dialog-sizing rule is wrong for a picture viewer, should-fix

`admin-design-system.md:494-502` governs "every modal": "a modal never fills the viewport on a
normal screen… `max-height: min(content, 85vh)`… Filling the height is correct in exactly one place,
the small viewport." A lightbox is the counter-example: its whole job is to give the picture the
viewport. Importing the admin recipe wholesale (decision 8) imports this rule with it.

**Change decision 8** to record the deliberate departure and state the viewer's own sizing
(the picture bounded by `min(100%, …)` against `100dvh` minus the chrome, with the caption and
controls inside the bound), so the public design system's new dialog section does not inherit a rule
it contradicts.

### D26 Previous/next: accessible names, target size, and the ends, should-fix (1.1.1, 2.5.8)

"previous and next … as real buttons" is right and the spec says the buttons exist. Three
unstated details:

- If they are icon-only (the convention), each needs an `aria-label` or `sr-only` text. 1.1.1.
- Pointer target minimum is 24x24 CSS px with spacing under 2.5.8 (AA). The repo has a live
  precedent for meeting it deliberately: `Carousel.svelte`'s dot targets are padded to the 24px
  floor with `content-box` sizing plus `background-clip` (`mechanics-research.md` B5). Recommend
  44x44 for a viewer control a phone user taps.
- "cycles the set" implies wrap-around. If it wraps, no disabled state exists and that is simpler;
  if it stops at the ends, the disabled buttons must use `aria-disabled` (the admin's guarded-button
  convention, `EditPage.svelte:1940-1963`) rather than native `disabled`, so the reason reaches AT.

### D27 Swipe is not required, and if added must not become the only path, note (2.5.1, 2.5.7)

The review question asks whether swipe is required for "modern". It is not: a swipe is a path-based
gesture, and 2.5.1 requires a single-pointer alternative, which the prev/next buttons already are.
2.5.7 Dragging Movements likewise only bites if dragging is the *only* way. So swipe is a legitimate
enhancement with a clear rule: add it if wanted, never remove the buttons, and never bind it so
tightly that a slow drag on a scrollable caption is captured as navigation.

**Add to decision 8** one clause either way, so the implementer does not invent it.

### D28 Pinch-zoom and page scroll behind the dialog, should-fix (1.4.4, 1.4.10)

Two unstated behaviors:

- **Zoom.** A viewer is exactly where a low-vision user pinches. Nothing may set
  `user-scalable=no` or `maximum-scale`, and the dialog must not intercept the pinch gesture for its
  own zoom without leaving the native one available. 1.4.4 Resize Text / 1.4.10 Reflow.
- **Page scroll.** `showModal()` makes the rest of the document inert and the `::backdrop` swallows
  pointer events, but wheel scrolling of the page behind an open dialog is not uniformly prevented.
  The conventional fix (`overflow: hidden` on `<body>` while open) interacts with
  `site.css:106-108`'s `body { overflow-x: clip }`, the full-bleed guard, and must not cause a
  scrollbar-removal layout shift or lose the scroll position on close.

**Add to decision 8**: the scroll-lock approach, its restore, and the no-shift requirement.

### D29 Reduced motion: name the motion, note

"reduced motion honored" is a checkbox, not a decision. State what motion exists (a backdrop fade?
a crossfade between pictures, as `Carousel.svelte`'s 650ms opacity transition does?) and that under
`prefers-reduced-motion: reduce` it is **removed**, not shortened. The chassis has the idiom in
three places (`prose.css:735`, `prose.css:852`, `site.css:51`) and `Carousel.svelte` fully suppresses
its auto-advance under reduce.

### D30 The largest variant's load behavior is undecided, should-fix

Decision 9 gives the variant ladder and stops. For a viewer this is the interesting half:

- Nothing says what shows while the large variant decodes. A blank dialog after Right Arrow is a
  worse experience than the thumbnail held under a loading cue.
- Nothing decides preloading the next picture (the obvious win) or the cost of doing it on a phone.
- Nothing sets `loading`/`decoding`/`fetchpriority` on either the grid or the viewer. The grid
  thumbnails below the fold want `loading="lazy"`; the viewer's current image does not.
- `createMediaResolver` returns the **bare full-size path**, not a variant, when transformations are
  off (`resolve-media.ts:82-88`). With transformations off the "thumbnail" grid loads N full-size
  originals. The spec's decision 9 mentions the degrade but not its weight.

**Add to decision 8 or 9**: the loading strategy for the grid and the viewer, the preload-next call,
and the transformations-off cost.

### D31 The dialog inherits `.prose` typography if mounted inside the article, note

CSS inheritance follows the DOM tree, not the top layer, so a `<dialog>` rendered inside
`<article class="prose">` inherits every `.prose` and `.site-main figure` rule that applies to its
ancestors and descendants. The admin's own recipe mounts dialogs "headless at the bottom"
(`admin-design-system.md:489-493`) for the nested-form reason; the CSS-inheritance reason applies
here independently.

**Add to the `PostGallery.svelte` bullet**: where the `<dialog>` mounts relative to `.prose`.

### D32 Focus return and the sticky header, note (2.4.11)

Native `<dialog>` restores focus to the previously focused element on close, which the spec relies on
and the e2e asserts. One residual: if the thumbnail scrolled out of view, the browser scrolls it back
and the sticky header (`public-design-system.md`, the chrome section) can cover it. The theme already
sets `html { scroll-padding-top: <header height> }` for anchor jumps, which also covers
programmatic scroll-into-view on focus, so this is likely already satisfied, worth an explicit
assertion in the e2e rather than an assumption.

---

## E. `sizes`, DaisyUI, and delivery

### D33 The row `sizes` formula is wrong against the theme's actual measures, should-fix

Decision 4 states `(min-width: 48rem) <role width divided by N>, 100vw`. Three defects:

- **The gap is ignored.** Dividing the role width by N over-declares by the total gap.
- **The role widths do not match the theme.** `SIZES_BY_ROLE` (`resolve-media.ts:35-39`) says
  `wide: '(min-width: 1200px) 1200px, 100vw'`, but Waymark's `--container-measure-wide` is **58rem
  = 928px** (`theme.css:260`), further clamped by `min(…, 100vw - 3rem)` (`site.css:153-161`).
  Divided by 3 the engine hint asks for 400px where the theme paints ~296px, a ~35% over-fetch per
  picture, tripled across the row. The spec's own Risk ("only right for a theme that stacks at
  48rem") names the breakpoint half and misses the width half.
- **`sizes` is silently dropped for small assets.** `applyImageDetail` sets `sizes` **only inside
  `if (detail.srcSet)`** (`resolve-media.ts:166-169`), and `srcSet` is omitted when fewer than two
  ladder rungs fit (`resolve-media.ts:119`), i.e. for any asset under 800px. A row of small assets
  gets no hint at all. Also note `applyImageDetail` spreads new props **over** existing ones
  (`resolve-media.ts:172`), so the alternative of having `remarkFigure` pre-write `sizes` would be
  clobbered unless that spread changes.

**Change decision 4** to give the formula including the gap, and state that the hint is deliberately
conservative against a theme whose wide measure is narrower than the engine's 1200px vocabulary.

### D34 DaisyUI: reuse nothing, and say so, note

Answering the review question directly, with the evidence: `tokens.css:55-60` excludes both `modal`
and `carousel` from the DaisyUI build, and the file's ownership note explains the policy (the
component set is scoped to what the public template genuinely renders: `button`, `badge`, `alert`,
`card`). DaisyUI's `carousel` is a scroll-snap strip, not a viewer, and has no keyboard or focus
contract at all, it would be the wrong component even if it were compiled. DaisyUI's `modal` is a
thin skin over `<dialog>` that supplies no behavior the platform does not already give. So the right
answer is "reuse neither, deliberately", and the spec should record it so a later pass does not
re-open it.

**Add to decision 8**: one sentence naming both exclusions and the reason.

---

## F. The editor side

### D35 The toolbar button's own label does not change, should-fix (4.1.2)

Decision 6 changes only "the dialog's title reads 'Row of N pictures'". But the author sees the
**button** before any dialog: `EditPage.svelte:1940-1963` binds both `title` and `aria-label` to
`figureEditor.figureLabel`, whose five strings are all singular
(`figure-editor.svelte.ts:84-91`, e.g. "Wrap the image at the cursor in a figure"). With the caret in
a run of three pictures, the control's accessible name would still say "the image", describing
something other than what it does. The mechanics research listed this as a required change
(`mechanics-research.md` A3, item 6, "must gain a third state"); the spec dropped it.

**Change decision 6 and the editor bullet**: name the new label string(s), e.g. "Wrap these N
pictures in a figure" / "Edit the row at the cursor", and note the `RESET_BLOCK` contract
(`figure-editor.svelte.ts:65-75`) if any new `$state` is added.

### D36 Discoverability is accidental, should-fix

Decision 6's whole affordance argument is "the button they already use". But nothing anywhere tells
an author that putting two pictures on consecutive lines and pressing the same button makes a row.
The only discovery paths are (a) noticing the label change from D35 while the caret happens to sit
in a run, or (b) reading the editors doc. There is no toolbar item (deliberately), no Markdown-help
entry, and no hint in the dialog. The label change is therefore load-bearing for discovery, which
raises D35 from a correctness fix to the feature's entire front door.

**Add to decision 6**: the Markdown help entry, and state that the label change is the discovery
mechanism.

### D37 Four-or-more pictures failing "loud at render" puts author input on the published page, should-fix

Decision 1: "a fourth is an author-input error the step reports the way an unknown icon name is
reported", and the row bullet says "four or more pictures fail loud at render with a message naming
the limit (the same build-backstop posture as an unknown icon name)."

The precedent does not transfer. An unknown icon name is written by a **developer** in a component
definition and caught at build. A fourth picture is written by a **non-technical editor** in the
editor, and cairn's premise is that such an author never sees a build error. Three gaps:

- The editor's own wrap should refuse before it writes, with a stated reason ("A row holds at most
  three pictures"), the same guarded-control posture the toolbar already uses.
- The preview iframe must show the failure legibly, not blank.
- If a saved entry can carry four, the failure lands on the **live page**, not a build log.

**Change decision 1 and the row bullet**: state the editor-side refusal, the preview behavior, and
whether a four-picture figure can be saved at all.

### D38 The dialog must drop `center` for a row, should-fix

Follows D6. `MediaFigureControl.svelte:25-30`'s `ROLE_OPTIONS` is
`{null:'Measure'}, {center:'Center'}, {wide:'Wide'}, {full:'Full'}` in a roving-tabindex radiogroup.
For a row, `Center` must not be offered (removing an option changes the roving-tabindex arithmetic
and the Home/End targets, so it is a real change, not a cosmetic one).

### D39 One paragraph in the editors doc is not enough, should-fix

The row bullet promises the editors doc "gains one paragraph on rows". The facts an author needs
are at least five: how to make a row (consecutive picture lines, then the same button), the limit of
three, that the caption is shared while each picture keeps its own alt, that pictures may be cropped
to a shared shape (so a portrait whose subject sits near an edge is a bad row candidate, D4), and
that a picture pasted as a plain web address does not form a row (D9). The existing section is
written entirely in the singular (`write-in-the-editor.md:113-130`), so its caption and placement
bullets each need a plural case too.

**Change** the row bullet's doc line to name the facts, not the paragraph count.

### D40 `add-an-image.md`'s gallery paragraph is under-specified, note

The gallery editing path already works: `MediaHeroField.svelte` renders a caption input and commits
`<name>.caption` (`:477`), so a leaf `array(image)` row surfaces the caption with no change. The
doc paragraph should say that the caption appears **both** in the grid and in the viewer (D17), that
alt text is still required and is not the caption, and give the exact `#gallery` link text to type
(D21). The container-field e2e does not exercise a caption today
(`container-fields.spec.ts:91-166`), so the Proof list should add it.

---

## Verdict

Strong shape, right instincts, and the two research inputs did their job, but the spec systematically
dropped the caveats its own mechanics research surfaced (the sanitize floor, the `grid-column: 1 / -1`,
the unlayered-site.css cascade), and the viewer's a11y contract is a list of feature names rather than
a specification. Four blockers (D1, D2, D3, D4 on the row; D22, D23 on the dialog) must be resolved
before an implementer can build from this, and the aspect-ratio decision (D4) is a taste call that
belongs in Geoff's parked read, not an implementer's.

---


Read-only, main checkout @ `d565ab77`. Findings C1..C10, ranked list at the end.

---

## C1. Altitude: the row IS the engine's, but the spec never runs the premise check

**Charter text.** `docs/internal/what-cairn-is-and-is-not.md:56-58`: "cairn owns its core job,
**managing markdown content and the editor/admin frame**, and little else." And `:104-106`: "the
premise check, 'is this cairn's job, and is it the leanest form?', **runs before the correctness
checks, on every spec**."

**Position: the engine altitude is correct, and the spec must say why in its own words.**
The argument that survives the boundary test, which the spec asserts rather than argues:

- `figure` is a **reserved** directive name (`remark-figure.ts:1-8`); a site cannot register a
  component named `figure`. A site-level `:::row` would therefore be a *second, parallel* picture
  vocabulary next to a reserved one the engine already owns, which is more surface, not less.
- The authoring affordance is engine UI: `src/lib/components/figure-editor.svelte.ts`,
  `MediaFigureControl.svelte`, `EditPage.svelte:1940-1963`, `markdown-format.ts:271-541`. A site
  directive gets **no toolbar button, no dialog, no byte-intact media-token guarantee**
  (`markdown-format.ts:489`), so the editor-frame half cannot follow it out of the engine. That is
  the decisive fact.
- The `sizes` mechanism only works because `remarkFigure` unwraps the image to a direct child of
  the figure and `roleFromParent` (`resolve-media.ts:149-156`) reads the placement off that parent.
  A site directive cannot reach that; it would ship `sizes="100vw"` forever.
- Leanness: `findMediaImage` → `findMediaImages` plus a caption-scan guard is a widening of one
  existing step, not a new subsystem or actor. Charter `:98-100` ("prefer the leanest seam over a
  general feature") is satisfied on the narrower reading.

**Change:** add a short "Premise check" paragraph ahead of `## Decisions` stating the boundary test
and the four facts above. A spec that changes the engine's public render contract without the
charter test on the page is the exact failure mode `:102-106` records ("correctness and security
reviews all passed, each checking the design within the wrong premise").

---

## C2. `data-count` is stripped by the sanitize floor, and is off the data-attribute grammar

**Precedent text.** `src/lib/render/sanitize-schema.ts:29-31,53`: the `*` allowlist admits
`'className'` plus `markers`, where `markers = [...FIXED_MARKERS, ...attrMarkers]` and
`FIXED_MARKERS = ['dataPrimitive','dataSlot','dataRole','dataRise']` (`:13`), the registry-derived
`dataAttrProp(key)` names being the only other admissions. `:115-116`: "data-\* attributes camelCase
to dataFoo". `data-count` camelCases to `dataCount`, which is in neither list, so
**`rehype-sanitize` deletes it.** The mechanics research already flagged the risk
(`mechanics-research.md`, A1: "a `data-*` attribute would need a schema addition"); the spec adopted
the attribute and dropped the caveat.

Consequence: spec `:38` (`marked cairn-figure-row with data-count`), `:82-83`
(`data-count="N"`), and any `[data-count="3"]` CSS selector in decision 5 are inert in the delivered
HTML. Only the preview path (unsanitized) would appear to work, which is the worst shape of bug.

**Naming, separately.** The engine's own data-attribute grammar is namespaced:
`data-cairn-island`, `data-cairn-props`, `data-cairn-hydrate` (`rehype-dispatch.ts:150-166`),
`data-primitive`/`data-slot`/`data-role`/`data-rise` being the pre-existing internal stamps. A bare
`data-count` in a shared namespace is off-grammar in both directions.

**Position:** drop the attribute. The count is already expressible as a second marker class, which
the floor admits free-form (`:53`) and which `roleFromParent`'s first-match scan tolerates
(`resolve-media.ts:153-155`, and the research confirms `['cairn-place-wide','cairn-figure-row']`
still resolves `wide`). Emit `cairn-figure-row` plus `cairn-figure-row-N`, or nothing at all if C3
removes the need for a count in CSS.

**Change:** spec `:38` and `:82-83`, replace `data-count` with a count-bearing marker class; if the
attribute is kept instead, the spec must name the `sanitize-schema.ts` `FIXED_MARKERS` addition as a
deliverable and the `data-cairn-count` name, and add a sanitize-floor unit test to the Proof list at
`:97-102`.

---

## C3. The 48rem `sizes` breakpoint violates a recorded refusal and a stated in-code doctrine

**Recorded refusal.** `resolve-media.ts:27-34`: the role map is "in the engine's own placement
vocabulary ... **not any one theme's exact breakpoints**: cairn's public render stays
design-agnostic, so this is a reasonable general convention rather than a value tuned to a specific
site's CSS." The map's own values are px and role-keyed, and carry no breakpoint claim about where a
theme stacks.

**The stronger text**, one the spec does not cite. `resolve-media.ts:41-45` (`MediaImageDetail`):
"Both are **omitted when unknowable, never guessed**." And `:119` refuses a one-candidate srcset
because it is "no more honest than no srcset at all". The engine's settled posture on responsive
delivery is *decline rather than guess*.

48rem is not a general convention. It is one specific value from one specific site-layer file:
`examples/showcase/src/chassis/composition.css:77,89`, `.cairn-sidebar-layout`'s stack point, in a
tree the charter classes as the site's ("The chassis is site-owned code over the versioned engine
API", chassis README, "Subtracting an element"). Spec `:46-47` names it honestly as "the chassis's
own", which is precisely the objection: the engine would be importing a theme constant it just spent
a doc comment refusing to know.

**No ruling exists either way.** `docs/internal/engine-rulings.md` has no figure/`sizes`/breakpoint
entry (grepped for figure, placement, srcset, sizes, media, row). So this is a new ruling the spec
is making, not one it is applying, and it should be filed as one.

**Position and the lean alternative.** Two admissible forms, in order:

1. **Default to the honest conservative value.** A row's `sizes` stays `100vw` (the existing
   worst-case fallback at `:168`), exactly the "omitted when unknowable" doctrine. The row still
   gets width/height and a srcset; only the hint over-fetches, and only for a shape that does not
   exist today.
2. **If the over-fetch is worth closing, take the breakpoint from the site, not from the chassis.**
   The seam already exists and is the leanest one available: `AssetConfig` /
   `createMediaResolver`'s own preset parameter (`resolve-media.ts:69-71,104-124`), an
   optional `rowStackWidth?: string` with **no engine default**. A site that supplies it gets a
   divided hint; a site that does not gets `100vw`. That is "seam, not feature"
   (`what-cairn-is-and-is-not.md:70-73`) and it leaves `:27-34` true.

Do not take option 2 of the research (`remarkFigure` writes `hProperties.sizes` directly): it
requires `applyImageDetail` to stop overwriting (`:172`), which widens a second contract to fix the
first.

**Change:** spec `:46-49` (decision 4) and `:85-86`; replace the "documented default breakpoint
(48rem)" with the conservative default, plus the optional adapter-supplied hint as the stated seam.
Spec `:138-140` (the risk paragraph) then dissolves rather than being mitigated by a doc sentence.

---

## C4. The row grid cannot live in `prose.css` as specified: the cascade beats it, and it contradicts the stated tier split

**Two texts, both load-bearing.**

`examples/showcase/src/theme/site.css:19-20`: "Tier 2 (owned): the `.site-main` reading column and
the `.cairn-place-center/wide/full` figure contract. **cairn defines the figure class contract; the
site owns the pixels by styling them.**" `prose.css:432-437` says the same from the other side: "The
placement geometry ... live in site.css scoped to `.site-main` ... This only gives a figure its own
flow rhythm."

Chassis README, "Cascade layers": "**an unlayered site rule always beats a layered one
unconditionally, regardless of source order or specificity**."

**The concrete failure.** `prose.css` is wrapped in `@layer components` in its entirety
(`:29,:43`). `site.css:132-141` is unlayered and reads
`.site-main figure:not(.cairn-place-center) img { max-height: 32rem; object-fit: cover; }`. A row
inside a `.cairn-place-wide` figure matches it. So spec `:53-54`'s claim, "the single-figure
`max-height` rule in `site.css` untouched for singles and **inert for rows**", is false in the exact
direction the chassis README warns about: the unlayered `site.css` cap wins over any layered
`prose.css` aspect-ratio rule, and a fixed-aspect-ratio row silently keeps a 32rem cap it did not
ask for. This is also the repo's own repeated-workaround signal (the README records two ports hitting
the same layering class of bug).

**Position:** the row's *class contract* is engine-emitted and belongs in `render.md`'s registry;
the row's *pixels* follow the tier-2 rule and belong in `site.css` beside `.cairn-place-*`, unless
the pass explicitly re-rules the split. If the row genuinely is a chassis mechanic (it plausibly is,
by the family "Engine-level UI mechanics" rule: "A mechanic recurs in any component of that shape on
any cairn site"), then the same change must (a) amend `site.css:19-20` and `prose.css:432-437` so
neither doc lies, and (b) edit `site.css:132-141` to exempt `.cairn-figure-row`, since prose.css
cannot do it from inside a layer.

**Change:** spec `:52-54` (decision 5) and `:91-93`. State the layering fact, name the `site.css`
`:not(.cairn-figure-row)` edit as a deliverable, and name the two doc comments the change makes
stale.

---

## C5. "Four pictures fail loud" misreads its cited precedent and is wrong for an editor-facing surface

**The spec's claim.** `:36-37`: "a fourth is an author-input error the step reports the way an
unknown icon name is reported"; `:83`: "four or more pictures fail loud at render with a message
naming the limit (the same build-backstop posture as an unknown icon name)."

**The precedent says the opposite.** `src/lib/render/glyph.ts:12`: "**An unknown icon name yields
the bare svg shell with no path child, so it never serializes**", the render-side icon behavior is a
graceful degrade, deliberately fixed *away* from failing
(`docs/superpowers/plans/2026-06-01-cairn-components-03-slot-render.md:488,812`). The one
throw-on-unknown-icon is `normalizeAdminNav`
(`2026-06-28-cairn-extensibility-1-admin-shell-and-nav.md:302`), which validates a **developer's
config at construction**, not an author's content at render.

**The figure step's own posture is also degrade.** `remark-figure.ts:91`: a `:::figure` with no media
image "returns early ... children left alone, no image invented, **never throws**."

**The charter objection.** cairn's audience for this surface is the `docs/editors/` track: someone
with no terminal and no GitHub account (`CLAUDE.md`, top). Publishing copies the edit to `main` and
**auto-deploys**. So a render-time throw on a fourth picture means a non-technical author's Publish
takes the site's build down, with the only diagnostic in a CI log they cannot read. That converts an
authoring mistake into an outage, on a product whose stated job is making a non-technical author
productive (`what-cairn-is-and-is-not.md:11-14`).

**Position, in preference order:**

1. **Refuse in the editor dialog**, where the author is standing and can fix it: the wrap action
   already knows the run length, and `MediaFigureControl` already carries a non-blocking surfacing
   idiom for a contradiction (`decorativeWithCaption`, `:62`). Wrap the first three and say so, or
   disable the button with the existing `figureLabel` tooltip mechanism.
2. **Degrade at render**, matching `glyph.ts` and `remark-figure.ts:91`: render the first three as a
   row and the rest as ordinary images, and emit a `log/` event so the operator sees it
   (`CLAUDE.md`, "Diagnosing a running site": "When a pass adds a diagnosable code path, give it an
   event in the vocabulary rather than a bare `console` call").
3. Never a build failure from author content.

**Change:** spec `:36-37` and `:83`; delete the fail-loud posture and its false precedent citation,
adopt (1) plus (2), and add the new log event plus its `docs/reference/log-events.md` row to the
doc list at `:94-96`.

---

## C6. The caption-bug fix needs a `Consumers must:` line, and the spec contradicts itself about it

**Charter text.** `what-cairn-is-and-is-not.md:74-81`: "Until 1.0 the gate **detects and discloses**
a break (the changelog's `Consumers must:` line and the migration notes), never prevents one."
`CLAUDE.md`: "Four production sites depend on the package, each on its own version range."

**The change is a real behavior break.** Per the research (A1), a two-image no-blank-line figure
today stamps the second image's paragraph as the `figcaption` and drops the real caption. After the
fix the same source renders differently. `check:surface` cannot see this: it is emitted HTML, not an
export. So prose is the only disclosure channel, which is exactly the case `:74-81` describes.

**The spec says both things.** `:95-96` calls the changelog entry "**additive**; the caption-bug fix
noted". `:141-143` says "The caption-bug fix **changes the output of any existing two-image figure**
... the changelog names it." Those cannot both stand.

**On the survey.** `:142` puts the family-site content survey at pass start. That is right, and it
should be strengthened: the survey is a **precondition**, not a step, and its scope is the four
production consumers plus `cairn-pub`, not "the family sites" unnamed. If any site has the shape, the
`Consumers must:` line has to state the before/after rather than just naming the fix.

**Change:** spec `:95-96`, strike "additive" and state a `Consumers must:` line. Spec `:141-143`,
name the repos surveyed and make a hit a blocking input to the changelog wording.

---

## C7. The gallery's viewer is a mechanic; the spec files it as a doc paragraph, and the pass has no harvest step

**Family rule** (`CLAUDE.md`, "Engine-level UI mechanics, every cairn site"): "A UI **mechanic**
belongs to cairn; a design **choice** belongs to the site. A mechanic recurs in any component of that
shape on any cairn site ... Patching one in a site's theme or a route's scoped `<style>` leaves every
sibling site to rediscover it." And: "**A repeated local workaround is the loudest signal that
something sits at the wrong altitude.**"

Split spec decision 8 (`:64-68`) by that test:

- **Mechanics** (recur on every cairn site with a picture set): the native `<dialog>` open/close
  contract, focus returned to the opening element, Escape and arrow-key cycling, the
  `prefers-reduced-motion` honoring, and the no-scripting fallback of linking each picture to its
  largest variant. None of these depends on what the pictures mean.
- **Choices** (this theme's): three-across / two / one, the heading text and level, the caption
  type scale, the grid gap.

Spec `:114-115` files the mechanic half as "the dialog recipe **imported into
`docs/internal/public-design-system.md`** from the admin's", a doc paragraph. That is the weakest
form: the next theme reads prose and hand-rolls the behavior again, which is the rediscovery the rule
exists to stop, and the chassis README's own posture is against it ("The chassis is deliberately
generous, not minimal ... the point is a developer's ease building a theme on top").

**Position:** the dialog behavior lands as a chassis primitive on the `theme-toggle.ts` model
(mechanism in chassis, every value passed in by the caller: "`resolveTheme`/`applyTheme`/`toggleTheme`
know nothing about which two DaisyUI theme names or which cookie name a theme uses"), plus its CSS in
`composition.css` with `--cairn-<primitive>-*` overrides. `PostGallery.svelte` keeps the columns, the
heading, and the type. Both get their rows in the chassis README's file table and removal table,
which the spec's doc list (`:116-118`) currently omits for the new chassis file.

**Separately: the pass has no harvest.** `CLAUDE.md`, "The harvest": "every theme or site built on
the chassis banks its harvest before the pass closes ... A port or rebuild is **not done** until its
harvest is banked." Spec `:103,:119-122` list proof but no harvest step, and no mid-pass mechanic
triage against `docs/internal/engine-rulings.md`.

**Change:** spec `:64-68`, `:106-115` (split mechanic from choice, name the chassis primitive);
`:116-118`, add the chassis README file table and removal table rows; add a harvest step to decision
10 at `:76-77`.

---

## C8. Naming, against the registry grammar and the live chassis-A rulings

**Registry text.** `docs/reference/render.md:22-42`: five emitted names (`cairn-head`, `cairn-icon`
`+ -secondary`, `cairn-glyph`, `cairn-grid`), plus the figure contract `cairn-place-*`. "**`cairn-*`
is a shared namespace** ... a new name on either side should check the other's list before landing,
so the two vocabularies never collide."

- **`cairn-figure-row`.** Admissible. It is a shape marker, not a placement, so it correctly does
  *not* join the `cairn-place-` family, and the first-match scan at `resolve-media.ts:153-155` is
  unaffected. Requirement: it lands in the `render.md:22-42` list, and the pass greps the ~60 admin
  `cairn-*` names for a collision, which `:96` gestures at but does not commit to.
- **`data-count`.** See C2. Off-grammar and stripped.
- **`--cairn-figure-row-gap` / `--cairn-figure-row-aspect`.** Correct by the composition-primitive
  convention (chassis README: "Each primitive exposes its own `--cairn-<primitive>-*` custom
  properties"). But they are **chassis** properties, and STATUS records the live chassis-A ruling
  that "the chassis classes [stay] out of the engine registry". So `render.md`'s registry takes the
  emitted class only, never the custom properties. Spec `:96` lists "the emitted-class registry"
  next to `prose.css` names without drawing that line.
- **`PostGallery`.** Off the theme's own naming: the sibling components are `ArticleView`,
  `Carousel`, `IntroLedger`, plain nouns with no concept prefix. `Gallery` is the fitting name, and
  it also forces the collision to be looked at: `src/theme/components/Carousel.svelte` (197 lines,
  zero referrers) is a **retire target owned by a chassis pass**
  (`record/2026-08-26-any-site-audit/int-rank-site-chassis.md:255-258`,
  `record/2026-09-04-chassis-inputs/routed-inputs.md:60`). A cycling picture viewer is functionally
  the thing `Carousel` was. The spec must state that the retire lands first and that the new
  component does not resurrect it, or the pass re-adds 200 lines of dead-shaped code one slice after
  deleting them.

**Change:** spec `:106`, rename to `Gallery.svelte` and add a sentence on the `Carousel` retire.
Spec `:96`, state that the registry takes `cairn-figure-row` only and that the collision grep against
the admin sheet is a step.

---

## C9. Sequencing and pass size

**Ruling text.** The chassis passes design, "Out of scope for both": "the polish slice's
cover-to-cover reads; **any engine feature**." So the row cannot fold into a chassis pass; the spec's
instinct to keep it separate is correct and already ruled.

Three sequencing facts the spec misses:

1. **B2 ends the rebake.** Chassis-B scope item 9: "`templates/waymark` adapted to the changed engine
   on purpose ... then the **final `emit:template` before the release window closes**." A pictures
   pass landing after B2 changes `prose.css`/`site.css` and the emitted class contract, so it must
   carry its own `emit:template` rebake or it invalidates B2's. The spec's deliverable list has no
   rebake.
2. **Baseline contention.** B2 owns the corpus, the archive, and the CSS conformance work, and the
   pictures pass adds pictures to the same reading-surface fixture and the same styleguide. Running
   strictly after B2's merge (spec `:76`) is right; the spec should name the contended files
   (`examples/showcase/src/chassis/prose.css`, `src/theme/site.css`, the reading-surface post, the
   styleguide route, the `site-visual` baselines) the way the chassis design names its own
   contention.
3. **Nothing in the gallery half depends on the row half.** They share only the word "picture".

**Pass size.** Counting the spec's own bullets: the row half is 6 deliverables (`:79-102`) plus 5
proof artifacts; the gallery half is 4 (`:106-122`) plus 4 proof artifacts; the baselines move at
five widths in two schemes under B1's full paint protocol. That is well past the workstation rule's
"roughly four" per task and reads as two passes wearing one header
(`CLAUDE.md` global, "Pass sizing is the orchestrator's job": "**a second task split in one pass is
the prompt to propose splitting the pass**").

**Position:** two passes with a named cut. Pass 1, engine + chassis + the row's paint (the engine
contract change, the caption fix, `sizes`, the editor, `prose.css`/`site.css`, the styleguide figure
section, the `emit:template` rebake). Pass 2, the gallery: the chassis dialog primitive from C7, the
theme component, the frontmatter projection. Pass 2 depends on pass 1 for nothing, so it can also run
in parallel if two worktrees are available and the contended files above are partitioned.

**Change:** spec `:76-77` (decision 10), state the cut, the contended files, and the rebake.

---

## C10. What the spec adds beyond the brainstorm

Geoff's recorded calls (`:5-8`): pictures live in the narrative's flow; a gallery is a separate thing
the story references and that cycles through captioned pictures; the row carries one shared caption;
modern conventions and easy for the author. Everything below is the spec's own addition, three of
them consequential:

1. **A hard three-picture cap enforced by a build failure** (`:36-37`, `:83`, `:129`). The cap itself
   is defensible from the platform survey; the enforcement posture is not, and neither was put to
   Geoff. See C5.
2. **The engine adopting a documented default breakpoint** (`:46-49`). A new engine ruling on
   design-agnosticism, made inside a feature spec. See C3. This is the item most worth an explicit
   Geoff call, since it trades a recorded principle for bytes.
3. **The first public dialog as a design-system precedent** (`:67-68`, `:114-115`, `:136-137`). A
   standing decision about how every future cairn theme does modals, arriving as a sub-clause of a
   gallery. Either state it as a precedent decision in its own right (and then C7 says it must be
   code, not a doc paragraph), or scope it to this component and say so.

Benign additions, no action: the caption-bug fix folded in (a genuine prerequisite, `:41-42`),
decision 9's frontmatter resolution (`:70-72`, unavoidable given no `array(image)` projection
exists), `id="gallery"` and the heading (a fair reading of "the story references it"), and the
reduced-motion and focus-return contracts (correct defaults, not scope).

**Change:** spec `:3-10`, add a line separating Geoff's calls from the spec's own additions, and mark
items 1 to 3 as open for his read since `:3-4` already parks the doc for exactly that.

---

## Ranked, top five

1. **C2**, `data-count` is deleted by the sanitize floor (`sanitize-schema.ts:29-31,53,115-116`);
   the row's count never reaches the browser. Use a marker class.
2. **C3**, the 48rem `sizes` default contradicts `resolve-media.ts:27-34` and the "omitted when
   unknowable, never guessed" doctrine at `:41-45`. Default to `100vw`; take the breakpoint from the
   adapter if at all.
3. **C4**, a layered `prose.css` row rule cannot beat unlayered `site.css:132-141`, so "inert for
   rows" is false; and the placement is contradicted by `site.css:19-20`'s tier split.
4. **C5**, "four pictures fail loud" cites `glyph.ts:12`, which does the opposite, and turns an
   author's mistake into a deploy failure on an editor-facing surface.
5. **C6**, the caption-bug fix is a behavior break needing a `Consumers must:` line; the spec calls
   it "additive" at `:95` and a behavior change at `:141`.
