# Pictures research: figure rows (A) and post galleries (B)

Read-only survey of `/var/home/glw907/Projects/cairn-cms` @ `main` (d565ab77). All paths absolute
unless rooted at the repo.

---

## A1. `src/lib/render/remark-figure.ts` end to end

File: `/var/home/glw907/Projects/cairn-cms/src/lib/render/remark-figure.ts` (135 lines).

### Where it runs
`/var/home/glw907/Projects/cairn-cms/src/lib/render/pipeline.ts:97-107`, the remark chain is
`remarkDirective` → `remarkResolveIncludes` → `[remarkDirectiveStamp, registry]` →
`remarkResolveCairnLinks` → **`remarkFigure` (:104)** → **`remarkResolveMedia` (:105)** → site
plugins. So the figure rewrite happens on mdast, before `remark-rehype`, and `remarkResolveMedia`
sees the tree remarkFigure already reshaped. That ordering is the whole reason `resolve-media.ts`
can read the placement role off the image's *parent*.

`figure` is a **reserved** directive name (header comment, :1-8): a site cannot register a component
named `figure`, so it cannot be shadowed. `remarkDirectiveStamp` skips unregistered names, so every
other container directive is left alone.

### The directive shape accepted
- A **container** directive named `figure` (`:::figure` … `:::`), matched at
  `remark-figure.ts:78-79` (`visit(tree, 'containerDirective')`, `node.name !== 'figure'` bails).
- The body must contain **one media image**, `![alt](media:slug.hash)`, found by
  `findMediaImage()` (`:45-57`).

### `findMediaImage`, the single-image assumption (the key constraint for a row)
```ts
// remark-figure.ts:45-57
for (let i = 0; i < directive.children.length; i++) {
  const child = directive.children[i];
  if (child.type !== 'paragraph') continue;
  const image = child.children.find(
    (n) => n.type === 'image' && parseMediaToken(n.url) !== null,
  );
  if (image) return { image, childIndex: i };   // <-- FIRST hit only, returns immediately
}
return null;
```
Three facts fall out:
1. Only **direct-child paragraphs** are scanned (`child.type !== 'paragraph'` skips everything
   else). An image inside a list, a blockquote, or a nested directive is invisible.
2. Only the **first** media image in the **first** matching paragraph is found. `Array.find` inside
   the paragraph, and an early `return` across paragraphs.
3. A non-media image (a raw `https://…` URL) is **never** matched, `parseMediaToken(n.url) !== null`
   is the gate. The showcase's reading-surface post uses raw Unsplash URLs in its `:::figure` blocks
   (see A5), so those figures never take the unwrap/figcaption path at all; they render as
   `<figure><p><img></p><p>caption</p></figure>` and the theme's `> * + *` fallback selector styles
   the caption (`examples/showcase/src/theme/site.css:118-130` documents exactly this).

### What happens with TWO images in the body today
Nothing crashes, but the second image is a second-class citizen. Trace it:

**Blank-line form** (each image alone in its own paragraph):
```
:::figure{.wide}
![a](media:one.aaa)

![b](media:two.bbb)

Shared caption.
:::
```
- `findMediaImage` returns image *a* at `childIndex 0`.
- `paragraph.children.length === 1`, so `:105` splices the paragraph out and puts the bare image
  node in its place. Image *a* is now a **direct child of the figure**.
- Image *b*'s paragraph is untouched, it stays a `<p><img></p>` inside the figure.
- The caption scan (`:122-130`) walks blocks after image *a* looking for the first `hasText()` block.
  `hasText` (`:35-41`) visits `'text'` nodes; an mdast `image` node carries its alt as a **property,
  not a text child**, so image *b*'s paragraph has no text and is **skipped**. The scan lands on
  "Shared caption." and stamps `hName: 'figcaption'` on it.
- Emitted hast: `<figure class="cairn-place-wide"><img a><p><img b></p><figcaption>Shared caption.</figcaption></figure>`.

**No-blank-line form** (both images in one paragraph): `paragraph.children.length !== 1`, so the
split branch (`:106-118`) runs. `rest` = everything after image *a*, which **includes image *b***.
That becomes a `<p>` and, since a paragraph holding only an image has no text, `captionNode` is set
to it anyway at `:113-115` (the split branch sets `captionNode` unconditionally when `rest.length > 0`,
it does **not** re-run `hasText`). So image *b*'s paragraph is stamped `figcaption` and the real
caption is lost. **This is a latent bug the row work would have to confront.**

So the practical answer: a two-image `:::figure` today produces a stacked, structurally-lopsided
figure. It is not a row, the two images are not siblings in the hast, and only one of them is inside
the placement-classed parent.

### The `class` attribute roles
- `const ROLES = new Set(['center', 'wide', 'full'])`, `remark-figure.ts:20`.
- Read at `:82-83`: `node.attributes?.class`, kept **only when it is exactly one closed-set value**.
  A class outside the set is silently dropped, never passed through. Two classes
  (`{.wide .row}`) would produce the string `"wide row"`, which is not in the set, so the whole role
  is discarded, a row that piggybacks on `class` must extend `ROLES`, not add a second class.
- Absent/invalid role ⇒ `role === undefined` ⇒ **no className at all** on the `<figure>` (`:84-87`).
  That is the "Measure" default in the editor's vocabulary.

### The hast it emits
Set via mdast `data.hName` / `data.hProperties` (the `mdast-util-to-hast` override protocol,
`:22-32`):
- `<figure>`, `setData(node, { hName: 'figure', ... })` at `:84-87`.
- `className: ['cairn-place-' + role]`, only when a role survived. So `cairn-place-center`,
  `cairn-place-wide`, `cairn-place-full`. **No class for the measure default.**
- The `<img>` is the plain mdast image node lifted to block position, later resolved by
  `remarkResolveMedia`. `remark-figure.ts:14-17` names the type-system hack: `FigureChild` aliases
  the directive's child slot because a phrasing node in block position is legal for
  `mdast-util-to-hast` but outside mdast's block-content union.
- `<figcaption>`, `setData(captionNode, { hName: 'figcaption' })` at `:131`. The caption node is a
  **paragraph** whose element name is overridden; its children are untouched, so inline markdown
  (emphasis, links) survives.

Sanitize floor: `/var/home/glw907/Projects/cairn-cms/src/lib/render/sanitize-schema.ts:50` adds
`figure` and `figcaption` to `tagNames`; `:53` allows free-form `className` on `*`; `:42` allows
`srcSet` and `sizes` on `img`. A row's `<div>`/`<p>` wrappers are already in `defaultSchema`.

### How the caption is derived
Two authoring forms, both handled:
1. **Blank-line form** (`:102-105`): image alone in its paragraph. The paragraph is replaced by the
   bare image; the caption is then found by scanning forward for the first `hasText()` block
   (`:122-130`).
2. **No-blank-line form** (`:106-118`): image and caption share a paragraph. The paragraph is split
   into `[bareImage, paragraph(rest)]`; `trimLeadingNewline` (`:61-70`) strips the softbreak so the
   caption reads cleanly. `captionNode` is that new paragraph.

`hasText` (`:35-41`) is the caption-candidate test: any non-whitespace `text` descendant.

Degraded state: a `:::figure` with **no** media image returns early at `:91`, children left alone,
no image invented, never throws. It still renders as a `<figure>`.

### Where a second image would have to be handled
Every touch point, in order:
- **`ROLES` (`:20`)**, a row is a fourth placement, or an orthogonal attribute. If it rides `class`,
  the closed set must grow (`row`?) and the editor's `FIGURE_ROLES` at
  `src/lib/components/markdown-format.ts:272` must mirror it (the comment there says "Mirrors the set
  in render/remark-figure.ts").
- **`findMediaImage` (`:45-57`)**, must become `findMediaImages`, collecting **all** direct-child
  paragraphs holding a media image, returning an ordered list with their indices.
- **The unwrap (`:100-118`)**, must lift *every* image to a direct child of the figure (or into one
  shared row wrapper), not just the first, and must not consume a following image as the caption.
- **The caption scan (`:122-130`)**, must skip *all* image-bearing blocks, and the no-blank-line
  branch's unconditional `captionNode` assignment (`:113-115`) must gain the `hasText` guard it
  currently lacks, or a two-image single paragraph will stamp an image paragraph as the figcaption.
- **A row wrapper element**, for CSS grid you need a container. Either (a) emit
  `className: ['cairn-place-*', 'cairn-figure-row']` on the `<figure>` itself and make the figure the
  grid, with `figcaption` as a full-width grid item (`grid-column: 1 / -1`); or (b) add an inner
  `<div class="cairn-figure-row">`, which needs a synthetic mdast node with
  `hName: 'div'` + `hProperties`. Option (a) needs no new node type and no sanitize change; it is
  the leaner fit for this codebase's idiom.
- **The role propagation to `resolve-media.ts`**, see A2: `roleFromParent` reads the className off
  the image's **direct parent**. If images are lifted to direct children of the `<figure>`, each one
  gets the role. If they are wrapped in a row `<div>`, that div must carry the `cairn-place-*` class
  too, or every image in the row falls back to `sizes="100vw"`, which is exactly wrong for a row.

---

## A2. `src/lib/render/resolve-media.ts`

File: `/var/home/glw907/Projects/cairn-cms/src/lib/render/resolve-media.ts` (201 lines).

### The `sizes` hint per placement role
```ts
// resolve-media.ts:35-39
const SIZES_BY_ROLE: Record<string, string> = {
  center: '(min-width: 800px) 800px, 100vw',
  wide:   '(min-width: 1200px) 1200px, 100vw',
  full:   '100vw',
};
```
Doc comment `:27-34` is explicit that these are the engine's own *placement vocabulary*, "not any one
theme's exact breakpoints", a "reasonable general convention" because cairn's render stays
design-agnostic. A role outside the map, a bare `:::figure` with no class, or a bare inline image
with no figure, falls back to the **worst case** `'100vw'` (`:168`).

Note the **measure default has no entry**. A classless figure gets `100vw`, which over-fetches.

### The srcset width ladder
```ts
// resolve-media.ts:25
const SRCSET_WIDTHS = [400, 800, 1200, 1600];
```
Doc `:19-24`: fixed and small rather than per-asset derived, so the variant set stays cache-friendly;
a rung wider than the asset's recorded width is dropped so Cloudflare Images never upscales.

Built in `createMediaResolver`'s `imageDetail` side channel (`:107-124`):
- Requires `resolved.enabled`, a manifest hit, `resolved.transformations` on, and
  `entry.width !== null` (`:114`).
- `widths = SRCSET_WIDTHS.filter(w => w <= width)` (`:117`).
- **`if (widths.length > 1)`** (`:119`), fewer than two candidates is "a single-source srcset, no
  more honest than no srcset at all", so it is omitted. An asset under 800px wide therefore gets
  **no srcset and no sizes at all**.
- `detail.srcSet = widths.map(w => `${variantUrl(path, { width: w })} ${w}w`).join(', ')` (`:120`).

`imageDetail` is a **same-object side channel** on the resolver function, not a widened return type
(`:69-71`, `:104-106`). The `MediaResolve` contract stays `(ref) => string | undefined`, so a
hand-rolled site resolver simply carries no `imageDetail` and its images resolve to a bare `src` with
no width/height/srcset. **A row design cannot assume srcset exists.**

### How the role reaches the image
```ts
// resolve-media.ts:149-156
function roleFromParent(parent: unknown): string | undefined {
  ...const className = parent.data?.hProperties?.className;
  if (!Array.isArray(className)) return undefined;
  const marker = className.find((c) => typeof c === 'string' && c.startsWith('cairn-place-'));
  return marker.slice('cairn-place-'.length);
}
```
Called at `:193` with `visit`'s third argument, the **direct parent** node. Because `remarkFigure`
already unwrapped the image to a direct child of the figure directive, the parent *is* the figure and
carries `data.hProperties.className`. `applyImageDetail` (`:161-173`) then writes
`width`/`height` always, and `srcSet` + `sizes` together (`:166-169`).

Two consequences for a row:
- The `className` **array scan** takes the *first* string starting with `cairn-place-`, so a figure
  carrying `['cairn-place-wide', 'cairn-figure-row']` still resolves `wide`, an extra marker class
  is safe.
- If a row introduces an intermediate wrapper node between figure and image, `roleFromParent` sees
  the wrapper, not the figure, and every image silently drops to `sizes="100vw"`.

### How a row of N images would need its own `sizes`
The current map is keyed by **role alone**. A row's correct `sizes` depends on *N* and on the stack
breakpoint, e.g. for a 3-up `wide` row stacking below 768px:
`'(min-width: 768px) calc((min(1200px, 100vw - 3rem) - 2 * gap) / 3), 100vw'`.

That is not expressible in `SIZES_BY_ROLE` as it stands. Three options, in order of leanness:
1. Widen the key to `role + count` (`SIZES_BY_ROLE['wide-3']`), passed by having `remarkFigure`
   stamp the count on the figure (e.g. a second marker class `cairn-figure-row-3`, or
   `hProperties['data-count']`) and having `roleFromParent` return both. The sanitize floor already
   allows free-form `className` (`sanitize-schema.ts:53`), so a marker class is free; a `data-*`
   attribute would need a schema addition.
2. Have `remarkFigure` itself write `hProperties.sizes` on each image and have `applyImageDetail`
   not overwrite a pre-set `sizes` (currently `:172` spreads new props **over** existing ones, so it
   would clobber).
3. Accept `100vw` in a row and eat the over-fetch. Honest but wasteful, a 3-up row asking for
   `100vw` fetches ~3× the bytes it needs at every width.

Also note the **768px stack breakpoint the spec wants is a CSS concern, but `sizes` must agree with
it numerically**, and the engine deliberately refuses to know a theme's breakpoints (`:27-34`). That
tension is the sharpest design constraint on A2: either the engine adopts a documented default row
breakpoint (768px, matching `composition.css:89`'s sidebar precedent), or `sizes` stays conservative.

### `variantUrl`
`/var/home/glw907/Projects/cairn-cms/src/lib/media/transform-url.ts`, see B4.

---

## A3. The editor: `figure-editor.svelte.ts`, `markdown-format.ts`, and the toolbar

### The pure transforms (`src/lib/components/markdown-format.ts`)

| Symbol | Lines | Contract |
|---|---|---|
| `FigureRole` | `:271` | `'center' \| 'wide' \| 'full'` |
| `FIGURE_ROLES` | `:272` | `Set(['center','wide','full'])`, comment says it **mirrors** `remark-figure.ts:20` |
| `FigureAtImage` | `:282-298` | `{ imageFrom, imageTo, figure: { from, to, caption, role } \| null }` |
| `parseFigureDoc` | `:304-306` | `unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(doc)`, the render step's grammar, so editor and render agree |
| `locateMediaImage` | `:313-341` | Finds the media image whose range contains `pos`, **or** whose enclosing figure's range contains `pos`. A figure hit beats a bare hit (`:341`) |
| `enclosingFigure` | `:347-359` | Walks the tree for the `figure`-named container directive holding `target` |
| `readCaption` | `:381-414` | Mirrors the render step's caption rule for both authoring forms |
| `blockHasText` | `:420-426` | The same `visit('text')` test as `remark-figure.ts:35-41` |
| `figureAtImage` | `:434-449` | The public entry: parse, locate, return offsets + figure info |
| `sanitizeCaption` | `:457-460` | Collapse newlines to spaces, trim, and escape **only** a leading `:` with one backslash (the directive-fence hazard). Inline markdown preserved |
| `unescapeCaption` / `finishCaption` | `:363-376` | The read-side inverse, for a clean round-trip |
| `buildFigureBlock` | `:468-473` | `` `${role ? `:::figure{.${role}}` : ':::figure'}\n${imageSrc}${cap ? `\n\n${cap}` : ''}\n:::` ``, always the **blank-line form** |
| `wrapImageInFigure` | `:482-501` | Bare image ⇒ figure block. Image token sliced verbatim (`:489`), never reserialized ("open risk 3": the atomic `media:` reference stays byte-identical). Blank-line padding computed at `:495-496`. Selection collapses just past the block |
| `figureImageSrc` | `:508-511` | Re-reads the inner token verbatim from source; empty string when no media image, leaving the rebuild image-less rather than throwing |
| `updateFigure` | `:518-527` | Rebuild in place with new caption/role, image token byte-preserved |
| `unwrapFigure` | `:534-541` | Replace the whole figure range with the bare image token; selection lands **on** the restored image |

**The byte-intact invariant is the load-bearing rule** across all three transforms: the media token is
always `doc.slice(from, to)`, never re-emitted from the AST.

### "The image at the cursor"
`MarkdownEditor.svelte`:
- Prop `onMediaImageAtCaret?: (info: FigureAtImage | null) => void`, `:138`.
- `reportMediaImageAtCaret`, `:1092-1111`. Calls
  `figureAtImage(state.doc.toString(), state.selection.main.head)` (`:1097`) and **dedupes** against
  `lastMediaReport` (`:1092`, `:1095`) so a caret move that stays on the same image does not refire.
- Fired from the CodeMirror update listener on `update.docChanged || update.selectionSet` (`:910`)
  and once on mount (`:967`).

`EditPage.svelte:2005` wires it: `onMediaImageAtCaret={(info) => (mediaAtCaret = info)}` into
`let mediaAtCaret = $state<FigureAtImage | null>(null)` (`:695`).

### The controller (`src/lib/components/figure-editor.svelte.ts`, 191 lines)
- `FigureEditorParams` (`:17-28`), **all getters, never snapshots**: `getEditor`, `getMediaAtCaret`,
  `getBody`, `getInsertDisabled`, `getEntryKey`. The comment (`:7-16`) explains why: `EditorApi` is
  `$state.raw` and loses reactivity across the `.svelte.ts` seam.
- `prefill` (`:43-50`), the open dialog's snapshot:
  `{ mode: 'wrap'|'edit', caption, role, decorative, image: {from,to}, figureRange: {from,to}|null }`.
  Snapshotted at open so a caret move while the dialog is open never re-targets it (`:104-108`).
- Entry-key reset (`:55-75`), a `RESET_BLOCK` span parsed by
  `src/tests/unit/edit-page-state-reset-coverage.test.ts:34-35`. **Any new `$state` declared in this
  module must appear in the reset block or the `RESET_EXEMPT` list, or that test fails.**
- `available` (`:80`), `getMediaAtCaret() != null && !getInsertDisabled()`.
- `label` (`:84-91`), four strings: "Place the cursor on an image to add a figure" /
  "Switch to Write to edit this figure" / "Switch to Write to wrap this image in a figure" /
  "Edit the figure at the cursor" / "Wrap the image at the cursor in a figure".
- `decorative` (`:96-102`), regex `/^!\[([\s\S]*?)\]\(/` over the token slice; empty-or-whitespace
  alt ⇒ decorative.
- `openFigure` (`:110-121`), `writeFigureResult` (`:130-133`, `replaceRange(0, len, doc)` then
  `selectRange` so **one undo reverts the whole write**), `applyFigure` (`:141-150`, dispatches to
  `updateFigure` or `wrapImageInFigure`), `unwrapFigureAction` (`:157-161`), `closePrefill` (`:184`).
- The module **never touches the `<dialog>` element** (`:33-37`); the host owns `showModal()`/`close()`.

### The toolbar button
`EditPage.svelte:1940-1963`. A `btn btn-sm btn-ghost btn-square cairn-btn-guarded` with an
`ImageIcon`. Notable: `aria-haspopup="dialog"`, `aria-disabled` (**not** the native `disabled`, so the
control stays focusable and its reason reaches AT), `class:cursor-not-allowed`, and `title` +
`aria-label` both bound to `figureEditor.figureLabel`. The long comment (`:1941-1952`) records that
`.btn-disabled` is banned here because `pointer-events: none` would suppress the tooltip.

Handler `openFigure` at `EditPage.svelte:805-810`: calls `figureEditor.openFigure()` then
`if (figureEditor.figurePrefill) figureDialog?.showModal()`.

### The dialog and its fields
`EditPage.svelte:2390-2424`. A native `<dialog class="modal">` mounted **headless outside the edit
form** (the control holds its own `<form>`), `aria-labelledby="cairn-figure-dialog-title"`,
`onclose={() => figureEditor.closePrefill()}`. The content is keyed
`{#key figureEditor.figurePrefill}` so it remounts fresh per open. Native `<dialog>` supplies the
focus trap and Escape "for free" (comment `:2391-2394`). A `<form method="dialog" class="modal-backdrop">`
gives the backdrop click-to-close.

`src/lib/components/MediaFigureControl.svelte`, the form content:
- Props (`:32-47`): `caption`, `role`, `mode: 'wrap'|'edit'`, `decorative`, `onapply`, `onunwrap`.
- **Two fields only**: a caption text input, and a placement segmented control.
- `ROLE_OPTIONS` (`:25-30`): `{null:'Measure'}, {center:'Center'}, {wide:'Wide'}, {full:'Full'}` , 
  Measure maps to the null role (no role brace).
- The placement control is a **roving-tabindex radiogroup** (`:71-84`): Arrow keys move *and* select
  (selection follows focus), Home/End jump to the ends, the active segment is tinted **with a check
  glyph as the non-color state cue (WCAG 1.4.1)**, stated in the `@component` block `:14-17`.
- `decorativeWithCaption` (`:62`), surfaces (never blocks) the decorative-image-with-caption
  contradiction.
- `submit` (`:86-89`), `onapply({ caption: captionValue.trim(), role: roleValue })`.

### What would change to wrap 2-3 consecutive images into one figure
1. **`figureAtImage` / `locateMediaImage`** must report a *set*. Today `FigureAtImage` carries one
   `imageFrom`/`imageTo` pair (`markdown-format.ts:284-289`). A row needs either an array of ranges
   or a paragraph-level range covering the run.
2. **A new locator**, "the run of consecutive media images at the caret". Today the caret must sit
   on or inside one image (or anywhere in its figure). A row wrap needs to detect *adjacency*: N
   images in one paragraph separated only by whitespace/softbreaks, or N consecutive
   image-only paragraphs. Neither concept exists.
3. **`buildFigureBlock` (`:468-473`)** must emit N image lines. It currently interpolates exactly one
   `imageSrc`. The blank-line form generalizes cleanly:
   `:::figure{.row}\n![a]\n![b]\n![c]\n\ncaption\n:::`, but note that consecutive image lines with no
   blank line between them parse as **one paragraph with softbreaks**, which is the render side's
   fragile no-blank-line branch (see A1). Blank lines between them give three paragraphs, which is the
   robust branch. The generated form should use blank lines.
4. **`figureImageSrc` (`:508-511`)** must return N tokens for `updateFigure`/`unwrapFigure` to
   preserve byte-intact. `unwrapFigure` must restore N image lines, not one.
5. **`MediaFigureControl`** needs no new field for a shared caption (it already has one), but the
   placement control's four options must grow, or a separate "row" affordance must appear. Per A1, a
   second class is not viable, a `row` role in `ROLES`/`FIGURE_ROLES` is, but then `row` is
   orthogonal to `wide`/`full`, which the closed single-value set cannot express. **This is the
   sharpest A3 design fork: either `row` becomes a fifth mutually-exclusive placement (a row is
   always, say, measure-width), or the role attribute must stop being a single closed-set string.**
6. **`available` / `label` (`figure-editor.svelte.ts:80-91`)** must gain a third state (caret on a run
   of images ⇒ "Wrap these N images in a figure").
7. **The `RESET_BLOCK` contract** (`figure-editor.svelte.ts:65-75`), any new `$state` must be listed.

### The editors doc
`/var/home/glw907/Projects/cairn-cms/docs/editors/write-in-the-editor.md:113-130`:
- `:113-118`, "Once an image is in your draft, you can give it a caption and choose how it sits on
  the page. Put your cursor on the image, then select the toolbar button whose tooltip reads **Wrap
  the image at the cursor in a figure**. It stays dim until your cursor is on an image. Once you've
  used it on that image, the image sits in a figure. The same button then reads **Edit the figure at
  the cursor**, whether you've given it a caption or not."
- `:120-122`, the **caption** bullet: "the line of text shown under the image for everyone reading
  the page. This is different from alt text: a caption is always visible, and alt text is only read
  aloud by a screen reader or shown when the image itself can't load."
- `:123-125`, the **placement** bullet: "Measure keeps the image at the same width as your text,
  Center suits an image narrower than the text column, and Wide or Full let it spread further across
  the page."
- `:127-130`, the decorative-plus-caption warning copy.
- Preceding context `:101-111` covers alt text and the "marking a picture decorative doesn't clear the
  flag" caveat.

The doc is written entirely in the singular ("the image", "an image"). A row adds a plural case to
every one of these paragraphs.

---

## A4. The chassis CSS for figures

### `examples/showcase/src/chassis/prose.css`
`@layer components` wraps the **whole file** (`:29`, `:43`), "the same layer theme.css uses".

Figures, `:432-440`:
```css
/* Figures. The placement geometry (center/wide/full breakout) and the caption
   styling live in site.css scoped to .site-main, and the article sits inside
   it, so those apply. This only gives a figure its own flow rhythm. The hero
   figure (frontmatter image) is a leading figure with no placement class. */
.prose figure {
  --flow-space: var(--spacing-l);
}
```
That is **the entire figure rule in prose.css**, one flow-rhythm declaration. Everything visual is
delegated to `site.css`. Directly below, `:442-480+`, are the directive-component rules (`.callout`
et al.), scoped `.prose .callout` "to beat DaisyUI's own `.alert`/`.card` on specificity".

Breakpoint idiom in prose.css: `@media (min-width: 64rem)` at `:206` (the pullquote's flourish
breakout), plus two `@media (prefers-reduced-motion: reduce)` blocks at `:735` and `:852`. **rem
units, `min-width` only, mobile-first.**

### `examples/showcase/src/theme/site.css`
Header `:1-20` states the ownership split explicitly:
- `:19-20`, "Tier 2 (owned): the `.site-main` reading column and the
  `.cairn-place-center/wide/full` figure contract. **cairn defines the figure class contract; the site
  owns the pixels by styling them.**"

The rules:
| Lines | Rule |
|---|---|
| `:106-108` | `body { overflow-x: clip; }`, the full-bleed guard, "clip is sticky-safe" |
| `:109-111` | `.site-main figure { margin: var(--spacing-l) 0; }` |
| `:112-117` | `.site-main figure img { display:block; width:100%; height:auto; border-radius: var(--radius-box); }` |
| `:118-130` | `.site-main figure figcaption, .site-main figure > * + *`, caption type: `margin-top: var(--spacing-2xs)`, `font-size: var(--text-step--1)`, `line-height: 1.5`, `color: var(--color-muted)`. The `> * + *` fallback exists because a **raw external image URL never matches the media-reference check**, so its trailing text stays a plain `<p>` |
| `:132-141` | `.site-main figure:not(.cairn-place-center) img { max-height: 32rem; object-fit: cover; }`, the height cap so an extreme-ratio photo cannot blow the column out; center is exempt |
| `:145-151` | `.cairn-place-center { text-align: center }` + `img { max-width: min(100%, 22rem); margin-inline: auto }` |
| `:153-161` | `.cairn-place-wide { width: min(var(--container-measure-wide), 100vw - 3rem); position: relative; left: 50%; transform: translateX(-50%); }` |
| `:163-171` | `.cairn-place-full { width: 100vw; ...same breakout...}` + `img { border-radius: 0 }` |
| `:173-181` | `.cairn-place-full figcaption, .cairn-place-full > * + * { max-width: var(--container-measure); margin-inline: auto; }`, the caption returns to the measure |

`.site-main` itself: `:97-99`, `max-width: var(--container-measure); margin-inline: auto; padding: var(--spacing-l) var(--spacing-m);`

**site.css contains exactly one media query**, `@media (prefers-reduced-motion: reduce)` at `:51`.
There is **no width breakpoint in site.css at all**, every responsive behavior is achieved with
`min()`, `clamp()`, and intrinsic sizing.

### Where a `.cairn-figure-row` grid would live
The prompt's premise is right and the codebase confirms it in two places:
- `site.css:19-20`, "cairn defines the figure class contract; the site owns the pixels."
- `prose.css:432-437`, the comment that placement geometry lives in site.css *because the article
  sits inside `.site-main`*.

So there are two defensible homes, and they are **not** interchangeable:
- **The class name (`cairn-figure-row`) is engine-emitted**, so it belongs to the *contract* the
  engine documents, same as `cairn-place-*`.
- **The grid pixels** belong in `site.css` alongside `.cairn-place-*`, by the tier-2 rule, *unless*
  the row is deemed a chassis-level **mechanic** (see the family-wide "engine-level UI mechanics"
  rule), in which case a default grid lands in `prose.css` under `@layer components` and the theme
  overrides it. Given that "how a row of pictures stacks" recurs identically on every cairn site and
  a site would otherwise rediscover it, this reads as a **mechanic**, and `prose.css` is the correct
  home for the default with `site.css` free to override.

### The responsive breakpoint idiom for a stack-below-768px rule
The chassis has one direct precedent, and it is nearly identical to the requested behavior:
`examples/showcase/src/chassis/composition.css:77-93`:
```css
/* Sidebar layout: a main column plus a narrower aside, stacking below a fixed 48rem breakpoint
   (a media query condition cannot read a custom property, so the breakpoint itself is not a
   token seam) so a phone reader never gets a squeezed two-column layout. ... */
.cairn-sidebar-layout {
  --cairn-sidebar-width: 16rem;
  --cairn-sidebar-gap: var(--spacing-l);
  display: grid;
  grid-template-columns: 1fr;      /* stacked by default */
  gap: var(--cairn-sidebar-gap);
}
@media (min-width: 48rem) {
  .cairn-sidebar-layout { grid-template-columns: 1fr var(--cairn-sidebar-width); }
}
```
**48rem === 768px.** So the idiom is exactly: mobile-first single column, one `@media (min-width: 48rem)`
promoting to the grid, gap exposed as an overridable custom property, and a comment explaining that
the breakpoint itself cannot be a token because a media query cannot read a custom property.

A `.cairn-figure-row` should follow it literally:
```css
.cairn-figure-row { --cairn-figure-row-gap: var(--spacing-s); display: grid;
                    grid-template-columns: 1fr; gap: var(--cairn-figure-row-gap); }
@media (min-width: 48rem) { .cairn-figure-row { grid-auto-flow: column; grid-auto-columns: 1fr; } }
```
Equal-height pictures come from `img { height: 100%; object-fit: cover; }` inside the row, note
this **collides with `site.css:139-141`'s `max-height: 32rem; object-fit: cover`**, which already
applies to any non-center figure. A row inside a `.cairn-place-wide` figure inherits that cap.

---

## A5. Visual e2e coverage of figures

### The visual suite
`/var/home/glw907/Projects/cairn-cms/examples/showcase/e2e/site-visual.spec.ts`
- `:23-24`, `VIEWPORT_WIDTHS = [320, 390, 768, 1440, 2560]`, `COLOR_SCHEMES = ['light','dark']`.
- `:12-22`, the header comment names the three surfaces: home (chrome), **the reading-surface
  article ("the richest content page: figures, a table, a pull-quote")**, and the styleguide.
- `:35-46`, the article test: `/posts/the-reading-surface`, wait for the h1, `waitForImagesToLoad`,
  `toHaveScreenshot('site-article-<scheme>-<width>.png', { fullPage: true, timeout: 20000 })`.
- `:7-11`, `waitForImagesToLoad` polls `document.images.every(img => img.complete && naturalWidth > 0)`,
  because "the reading-surface article carries several real (network-fetched) images: a hero and
  three figure placements" and a late decode kept shifting the page between stability polls.
- `:66-73`, an extra `site-article-light-1920.png` for the clamp slope.

### Committed baselines
`examples/showcase/e2e/site-visual.spec.ts-snapshots/`, 31 PNGs:
- `site-article-{light,dark}-{320,390,768,1440,2560}-linux.png` + `site-article-light-1920-linux.png`
  (**11 article baselines, every one of which shows the figures**)
- `site-home-{light,dark}-{320,390,768,1440,2560}-linux.png` (10)
- `styleguide-{light,dark}-{320,390,768,1440,2560}-linux.png` (10)

There is also `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` for the admin.

### Does the reading-surface post carry images? Yes, four.
`/var/home/glw907/Projects/cairn-cms/examples/showcase/src/content/posts/2026-04-05-the-reading-surface.md`
- `:6-9`, frontmatter hero: `image: { src: <unsplash 1200px URL>, alt, caption }`
- `:107-108`, `:::figure{.center}` + `![A still mountain lake…](https://images.unsplash.com/…w=1200&q=80)`
- `:115-116`, `:::figure{.wide}` + `![A long alpine ridge…](…w=1600&q=80)`
- `:123-124`, `:::figure{.full}` + `![Layered mountains…](…w=2000&q=80)`
- `:105` is the prose that introduces them.

**Critical**: every one of these is a **raw external Unsplash URL, not a `media:` token.** So the
committed article baselines exercise the *fallback* path only:
- `remark-figure.ts:52`'s `parseMediaToken(n.url) !== null` never matches ⇒ `findMediaImage` returns
  `null` ⇒ **the early return at `:91`** ⇒ no unwrap, no `figcaption`, only the `<figure>` hName and
  the `cairn-place-*` class.
- The captions render as plain sibling `<p>` and are styled by `site.css:125`'s `> * + *` fallback.
- `remarkResolveMedia` skips them entirely, so **no `srcset`, no `sizes`, no intrinsic
  width/height** in any committed visual baseline.

The one post using `media:` tokens is
`examples/showcase/src/content/posts/2026-01-15-hello.md:6` (hero) and `:21` (gallery), and it is
**not** in the visual matrix.

### The other figure-touching specs
- `examples/showcase/e2e/design-review-fixes.spec.ts`, five Waymark-review bugs asserted as
  geometry/computed-style, not screenshots. `:11` "a hero/wide/full figure image carried no height
  cap"; `:51-75` "wide and full figure images carry a height cap that crops rather than distorts";
  `:66` records the center exemption; `:77-85` the full-bleed overflow guard.
- `examples/showcase/e2e/media-figure.spec.ts`, the **functional** figure e2e (not visual). It
  creates its own post, uploads a real 8x8 PNG, drives the figure control to wrap in
  `:::figure{.wide}` with a caption distinct from the alt, asserts the media token stayed
  byte-intact, renders in the preview iframe, and saves. The header comment `:9-15` explains it
  creates its own post because the fake-github recorder is module-level singleton state shared across
  specs on one worker.
- `examples/showcase/e2e/prose-flow-rhythm.spec.ts` and `prose-table.spec.ts` also load
  `/posts/the-reading-surface`.

### The styleguide has no figure section
`examples/showcase/src/routes/(site)/styleguide/+page.svelte` headings: Color tokens (`:126`), Type
scale (`:170`), The reading surface (`:206`), Components (`:220`) → Buttons, Tags and a badge, Card,
Tabs, Accordion, Call to action, Stat. The only `<figure>` in the file is `:136-139`, a
`<figure class="sg-swatch">` for a **color swatch**, unrelated to the media figure contract.

**So a figure row would have no styleguide surface to demonstrate it on, and no `media:`-token figure
in any committed visual baseline.** Both are gaps a row pass would need to close.

---

## B1. The `gallery` frontmatter field

### The showcase declaration
`/var/home/glw907/Projects/cairn-cms/examples/showcase/src/theme/cairn.config.ts:416-427`, in the
posts fieldset:
```ts
faq: fields.array(fields.object({ fields: {
        question: fields.text(...), answer: fields.textarea(...) } }),
      { label: 'FAQ', itemLabel: 'question' }),
gallery: fields.array(fields.image({ label: 'Image' }), { label: 'Gallery' }),
```
The comment at `:425-427` describes gallery as "a repeatable image: `array(image)` exercising the
leaf-array editor arm, each row a hero-style image field."

Live data: `examples/showcase/src/content/posts/2026-01-15-hello.md:20-22`
```yaml
gallery:
  - src: media:hello-hero.00112233445566aa
    alt: A cairn of stacked stones on a misty ridge
```
**One item, and it reuses the hero's own asset.** That is the entire gallery content in the repo.

### What an image field value carries
`fields.image` / `fields.object` / `fields.array` are declared in
`/var/home/glw907/Projects/cairn-cms/src/lib/content/fields.ts:145-184` (`image` `:168-169`,
`object` `:171-173`, `array` `:180-183`).

The value type is `ImageValue`, `/var/home/glw907/Projects/cairn-cms/src/lib/content/types.ts:31-37`:
```ts
export interface ImageValue {
  src: string;          // a `media:slug.hash` reference token
  alt: string;
  caption?: string;
  decorative?: boolean;
}
```
Normalization in `/var/home/glw907/Projects/cairn-cms/src/lib/content/fieldset.ts`: `alt` defaults to
`''` (`:239`), `caption` is optional and trimmed (`:241-242`), `decorative` is an explicit opt-in
(`:243`). TS mapping via `ValueOf`, `fieldset.ts:75-76`.

**This is the single most consequential fact for design B: `ImageValue` already carries an optional
`caption`.** The per-picture caption the gallery wants needs **no new field shape at all** , 
`fields.array(fields.image(...))` already supports it at rest. The `hello.md` gallery item simply
does not use it.

The open question is whether the **admin editor surfaces** the caption input for a gallery row (see
below), and whether the showcase content should be updated to carry captions.

### Is `fields.array(fields.object({ image, caption }))` supported?
Structurally yes, but it is unused and untested.
- `checkContainerNesting` (`fieldset.ts:388-416`) forbids only a **container** (`object`/`array`) as
  an object-leaf or an array-item. `isLeaf` (`fieldset.ts:381-383`) is `type !== 'object' && type !== 'array'`,
  so `image` is a leaf and passes.
- Two explicit rejections that do *not* apply: a `reference` leaf inside an object (`:398-401`) and
  array-of-array (`:411-413`).
- The editor would render it: `RepeatableField` → `ObjectGroupField` → `FieldInput`'s image arm
  (`FieldInput.svelte:349-350`).
- **But nothing exercises it**: no showcase concept, no e2e, no doc. The showcase deliberately keeps
  `faq` (object of text leaves) and `gallery` (array of bare image leaves) as separate, simpler
  exercises (`cairn.config.ts:413-427`).

Given `ImageValue.caption` exists, `array(object({ image, caption }))` would be a **redundant and
strictly worse** shape: it duplicates a field the leaf already has, and it walks an untested nesting
path.

### The container-field e2e
`/var/home/glw907/Projects/cairn-cms/examples/showcase/e2e/container-fields.spec.ts`
- **Part A, `:30-89`**, `faq` = `array(object)`: add / reorder / remove / save / reload two
  text-leaf rows.
- **Part B, `:91-166`**, `gallery` = `array(image)`: open Details, click "Add Gallery" (adds an
  empty row), click the row's "Add image" button, upload a PNG through the `MediaHeroField` dialog
  (`dialog[aria-labelledby^="cairn-hero-title"][open]`), fill alt text, confirm, then assert the
  hidden inputs `gallery.0.src` / `gallery.0.alt` round-trip through save and reload.
- **No caption is exercised** in Part B, and no object-wrapped image row is tested anywhere.

### The admin components
- `/var/home/glw907/Projects/cairn-cms/src/lib/components/MediaHeroField.svelte`, the image-field
  editor, invoked from `FieldInput.svelte:332-344` on `field.type === 'image'`. Opens a native
  `<dialog class="modal">` (`:27` doc comment names "the admin Dialog recipe"; `showModal()` at
  `:202` and `:381`; markup at `:484`).
- `/var/home/glw907/Projects/cairn-cms/src/lib/components/RepeatableField.svelte`, the container-array
  editor. Doc comment `:1-6`: "each row either a single leaf (`array(text)`, `array(image)`) or a flat
  object group (`array(object({...}))`)". Rows are `{ id, value }` envelopes (`:82-90`) keyed by id,
  not index, so identity survives reorder/remove (`:210-217`). The object branch is at `:110`.
- A leaf-array row renders `FieldInput`'s image arm directly, i.e. **one `MediaHeroField` per gallery
  row**, at form names `gallery.0.src`, `gallery.0.alt`, etc.

---

## B2. How the article page renders a post

### The route
`/var/home/glw907/Projects/cairn-cms/examples/showcase/src/routes/(site)/[...path]/+page.svelte:1-9`
,  it does nothing but `<ArticleView {data} />` from `$theme/components/ArticleView.svelte`.

### The load
`/var/home/glw907/Projects/cairn-cms/examples/showcase/src/routes/(site)/[...path]/+page.server.ts:1-16`
,  `export const prerender = true`; `routes = createPublicRoutes(publicRoutesConfig)`; `load` calls
`routes.entryLoad({ url })` then `withReferences(data)` from `$chassis/entry-data`. So `data` is
`EntryData & { references: Record<string, ResolvedReference | ResolvedReference[]> }`
(`ArticleView.svelte:19,25`).

### `EntryData`
`/var/home/glw907/Projects/cairn-cms/src/lib/delivery/public-routes.ts:53-70`:
```ts
export interface EntryData {
  concept: string;
  entry: ContentEntry;
  html: string;
  canonicalUrl: string;
  seo: SeoMeta;
  newer?: ContentSummary;
  older?: ContentSummary;
  heroImage?: { url: string; absoluteUrl?: string; alt: string; caption?: string };
}
```

### Where frontmatter fields live, **`data.entry.frontmatter`, not `data.entry.fields`**
There is **no `fields` projection**. `ArticleView.svelte:67` reads
`(data.entry.frontmatter as Record<string, unknown>).image`, with a cast, because `frontmatter` is
the raw validated object. A theme reading `gallery` would do the same:
`(data.entry.frontmatter as Record<string, unknown>).gallery as ImageValue[] | undefined`.

That cast-at-the-call-site pattern is the existing idiom and is worth noting as friction: a gallery
block inherits it.

### `ArticleView.svelte`
`/var/home/glw907/Projects/cairn-cms/examples/showcase/src/theme/components/ArticleView.svelte`
- Props `:23-28`: `data: EntryData & { references: ... }`, `preview?: boolean`.
- `<article class="prose">` opens at `:99`.
- Hero image `:100-110`, from `data.heroImage` (the engine projection) or `rawHeroFallback`
  (`:65-76`, for a raw external URL the projection does not resolve).
- **Body HTML: `{@html data.html}` at `:128`.**
- **`related`: `<nav class="related" ...>` at `:129-139`**, immediately after the body.
- **Natural insertion point for a gallery block: between `:128` and `:129`**, still inside
  `<article class="prose">`, after the rendered body, before the related-posts nav.

---

## B3. Islands

### The files
`/var/home/glw907/Projects/cairn-cms/examples/showcase/src/theme/islands/`
- `registry.ts`, the registry
- `Banner.svelte`, the one live island component
- `banner-expiry.ts`, a helper shared by the server-side `build()` and the client component

### The registry
`registry.ts:1-11`:
```ts
export const siteIslands: IslandRegistry = { banner: Banner };
```
`IslandRegistry` = `Record<string, Component<Record<string, unknown>>>`,
`/var/home/glw907/Projects/cairn-cms/src/lib/islands/types.ts:12`. Comment `registry.ts:5-6`:
`defineAdapter` **validates this registry against every component that declares `hydrate: true`** , 
so a registered island name and a hydrating component must agree, checked at config time.

### How a component declares it wants an island
**There is no selector scan and no manifest file.** A component in the site's `cairn.config.ts`
component registry sets `hydrate: true` (or `hydrate: 'visible'`) on its `defineComponent({...})`
call. Example: `examples/showcase/src/theme/cairn.config.ts:312-319`, `hydrate: true` at `:319`.

The render pipeline does the rest. `islandBoundary()`,
`/var/home/glw907/Projects/cairn-cms/src/lib/render/rehype-dispatch.ts:150-166`, checks `def.hydrate`
and wraps the static `build()` output in:
```html
<div data-cairn-island="<name>" data-cairn-props="<json>" [data-cairn-hydrate="visible"]>…fallback…</div>
```
`data-cairn-hydrate="visible"` appears only when `hydrate === 'visible'`. Called from `transformNode`
(`rehype-dispatch.ts:167-169+`).

Props are serialized by `serializeIslandProps()` (`rehype-dispatch.ts:133-146`) over the component's
declared `attributes`, coercing `number`-typed attrs from string to JSON number, then
`JSON.stringify`-ed into `data-cairn-props` (`:161`).

### Mount, not hydrate
`/var/home/glw907/Projects/cairn-cms/src/lib/islands/index.ts`:
- `hydrateIslands(islands, root = document)`, `:78-87`. Queries `[data-cairn-island]` (`:80`), reads
  the attribute for the registry key, and either `observeIsland()` (IntersectionObserver, for
  `data-cairn-hydrate="visible"`, `:56-67`) or `mountIsland()` directly (`:85`).
- `mountIsland()`, `:39-53`. Parses `data-cairn-props` as JSON, **clears the fallback DOM
  (`node.replaceChildren()`)**, and calls Svelte's own **`mount()`** (not `hydrate()`), pushing the
  instance onto a module-level `mounted` array for later `unmount()`. On a mount failure it restores
  the original fallback children.

**So the SSR markup is a throwaway fallback, replaced wholesale.** A viewer island does not need its
SSR output to match the client render, which is a real freedom for design B.

### The client entry
`/var/home/glw907/Projects/cairn-cms/examples/showcase/src/routes/+layout.svelte:1-28`. `afterNavigate`
dynamically imports `@glw907/cairn-cms/islands` and `$theme/islands/registry.js` **only when
`data.hasIslands`** (computed server-side from the site's island registry, so a site with no islands
never ships the runtime), then calls `hydrateIslands(siteIslands)` (`:24`).

### The banner, end to end
1. Declared `cairn.config.ts:312-346`, `hydrate: true` (`:319`),
   `attributes: { message: fields.text(...), expires: fields.date(...) }` (`:322-329`).
2. `build()` (`:330-345`) emits the static fallback: `<div hidden class="banner-expired">` when
   expired (and **clears `ctx.attributes = {}` at `:341` so no announcement text or date leaks into
   `data-cairn-props`**), else `<div class="banner" role="status"><p class="banner-message">…</p></div>`.
3. `rehype-dispatch.ts` wraps it: `<div data-cairn-island="banner" data-cairn-props='{"message":…}'>`.
4. `+layout.svelte:19-25` fires `hydrateIslands(siteIslands)` after navigation.
5. `islands/index.ts:78-87` finds the node, resolves `Comp = islands['banner']` from `registry.ts:8`,
   and (no `data-cairn-hydrate="visible"`) calls `mountIsland()` eagerly.
6. `mountIsland()` parses props, clears the children, `mount(Banner, { target: node, props })`.
7. `Banner.svelte` re-derives `expired` via `$derived(isBannerExpired(expires))` at hydration time.
   Doc comment `:3-10` explains why: a statically built and cached page can outlive its `expires` date.

### The catch for design B
Every island today is born from a **markdown directive** in the body, dispatched by
`rehype-dispatch.ts`. A **gallery rendered from frontmatter by a theme component** is not in that
path at all: `ArticleView.svelte` is a Svelte component that runs through SvelteKit's own SSR and
hydration, so a gallery viewer placed there is simply an ordinary Svelte component with
`onclick`/`onkeydown`, **it needs no island machinery at all**. The island registry is the idiom for
*directive-emitted* interactive content, not for theme chrome.

Two viable shapes, then:
- **(a) A plain Svelte component in `ArticleView`.** Simplest, fully SvelteKit-hydrated, no registry
  entry, no `data-cairn-island` attribute. This is almost certainly right for a frontmatter gallery.
- **(b) An island**, if the gallery must also be placeable from the body via a directive
  (`:::gallery`). Then it needs a `defineComponent` with `hydrate: true`, a `registry.ts` entry, a
  `build()` fallback, and props serializable to JSON in `data-cairn-props`.

---

## B4. Media URLs for a frontmatter image

### The hero projection
`deriveHeroImage()`, `/var/home/glw907/Projects/cairn-cms/src/lib/delivery/public-routes.ts:86-107`.
```
(frontmatter, resolveMedia: MediaResolve | undefined, origin: string) => EntryData['heroImage']
```
It reads **`frontmatter.image`, a hardcoded key**, the comment at `:79-84` states this as a known
scope gap: a renamed hero field (say `cover`) is not resolved. It parses the `media:` token, calls
`resolveMedia(ref)` for the bare delivery path, and returns:
```ts
{ url: path, absoluteUrl: resolveImageUrl(path, origin), alt: obj.alt ?? '', caption?: obj.caption }
```

### **No srcset for a frontmatter image**
The return is a bare string-based object: no `width`, no `height`, no `srcSet`. This is deliberate
and documented at `/var/home/glw907/Projects/cairn-cms/src/lib/render/resolve-media.ts:59-67`, which
names "the frontmatter hero projection, for one" as an existing caller of **only the plain string
result**, never the `imageDetail` side channel. So today:
- **Body images** (inline and `:::figure`) get width/height/srcset/sizes automatically, via
  `imageDetail()` (`resolve-media.ts:107-124`) over `SRCSET_WIDTHS = [400,800,1200,1600]` (`:25`).
- **Frontmatter images** (hero and gallery) get a bare full-size URL and nothing else.

### **There is no projection for `array(image)` at all**
`deriveHeroImage` reads only the top-level `image` key. A theme wanting gallery URLs must resolve
each `ImageValue.src` itself, using the exported `publicMediaResolver`
(`examples/showcase/src/theme/cairn.config.ts:374`, built from `createMediaResolver`) plus
`parseMediaToken`, and, for a thumbnail grid and a full-size viewer, call `variantUrl` directly.

**This is the sharpest B-side gap**: a gallery of N pictures with a full-size viewer is exactly the
case where responsive variants matter most (a small thumbnail and a large viewer image from one
asset), and the engine currently hands frontmatter images no variant machinery whatsoever.

### `variantUrl`
`/var/home/glw907/Projects/cairn-cms/src/lib/media/transform-url.ts:46`, spec interface at `:13-33`:
```ts
export function variantUrl(publicPath: string, spec: VariantSpec): string
interface VariantSpec {
  width?: number; height?: number; quality?: number;
  fit?: 'scale-down'|'contain'|'cover'|'crop'|'pad'|'aspect-crop'|'scale-up'|'squeeze';
  gravity?: 'auto'|'face'|string;
  format?: 'auto'|'webp'|'avif'|string;
  upscale?: …;
}
```
It builds a Cloudflare Image Transformations URL; `format` and `gravity` are always emitted,
defaulting to `auto`. A **`WATCH` comment at `:55-62`** flags that `gravity` and `format` interpolate
unescaped strings, safe today only because every caller-supplied spec is engine-owned. A viewer that
varies only `width`/`height`/`fit` adds no new risk, but a viewer building specs from user data would.

Also relevant: `createMediaResolver` returns the **bare full-size path**, not a variant, so "a fresh
zone with Image Transformations disabled serves correct thumbnails rather than dead `/cdn-cgi/image`
URLs" (`resolve-media.ts:82-88`). A gallery must degrade the same way: **variants are an enhancement,
never the only URL.**

---

## B5. Lightbox / dialog / carousel prior art

### `Carousel.svelte`, **still present on `main`**
Correction to the premise. Repo HEAD is `6a97b37e`; `examples/showcase/src/theme/components/Carousel.svelte`
**exists**. The deletion commit `274374f2` ("Delete the dead IntroLedger, Carousel, and
reference-capture scripts") is on the **`chassis-a` branch only** (`git branch --contains 274374f2`
→ `chassis-a`), not merged to `main`. It has **zero importers** in `examples/showcase/src` or
`examples/showcase/e2e`, which confirms the chassis-a rationale, but the file is live.

**Note the worktree hazard**: chassis-a is in flight and will delete this file. A design that plans
to revive or extend `Carousel.svelte` would collide with that branch.

What it does:
- Props: `slides: { src, alt, label, note?, width, height }[]`, `ariaLabel: string`, `caption?: string`.
- `<section aria-roledescription="carousel" aria-label={ariaLabel}>` wrapping a `.frame`
  (`role="group" aria-label="Slides"`) of stacked, opacity-crossfaded `<img>`s (650ms), an info row
  (`aria-live="polite"` label/note), and a dot row of `<button>`s (`onclick={() => selectSlide(i)}`).
- Auto-advance every 7000ms for **exactly one full cycle**, pausing on pointer-over or focus-within,
  permanently stopped once the reader clicks a dot or the cycle completes; fully suppressed under
  `prefers-reduced-motion: reduce`.
- Dot hit targets padded to the **24px WCAG 2.5.8 floor** via `content-box` sizing + `background-clip`.
- **No arrow-key handling beyond native Tab, no Escape, no `<dialog>`, no lightbox or full-size
  viewer.** It is an inline crossfade slideshow, not a viewer.

So it is **prior art for the dot-navigation and reduced-motion conventions, and for nothing else**
the design B viewer needs.

### Dialog / modal / Escape occurrences, all in the admin
Representative (dozens of hits across `src/lib/components/`):
- `src/lib/components/MediaHeroField.svelte:27` (doc: "a native `<dialog class="modal">` (the admin
  Dialog recipe: native focus trap and Escape…)"), `showModal()` at `:202` and `:381`, markup `:484`.
- `src/lib/components/CairnMediaLibrary.svelte:269-311`, an explicit Escape-precedence comment ("an
  open dialog claims Escape natively… so this only needs to handle Escape when no dialog is open");
  a two-faced safe-delete `alertdialog` at `:1152-1156`.
- `src/lib/components/EditPage.svelte:286` (`if (e.key === 'Escape' && (detailsOpen || prefs.zen))`),
  plus the discard confirm `:2527`, the figure dialog `:2390-2424`, the tidy dialogs `:2461-2498`.
- `src/lib/components/CairnAdminShell.svelte:384-386` (command palette `showModal()`, guarded against
  double-open), `:535` Escape, `:726` the palette `<dialog>`.
- `src/lib/admin-toolkit/ToolbarDisclosure.svelte:240`, Escape closes a disclosure.
- `src/lib/components/editor-suggestion-popover.ts:102,220`; `MediaInsertPopover.svelte:157`.
- Every other admin dialog (`DeleteDialog`, `RenameDialog`, `WebLinkDialog`, `EntryPicker`,
  `ComponentInsertDialog`, `ShortcutsDialog`, `MarkdownHelpDialog`, `MediaUploadDialog`,
  `MediaAltFillDialog`, `MediaBulkDeleteDialog`, `MediaReplaceDialog`, `TidyReview`) is native
  `<dialog>` + `showModal()`, "following the DeleteDialog a11y conventions."

### **No `<dialog>`, no focus trap, and no lightbox anywhere on the public side**
Every occurrence above lives in `src/lib/components/` (the admin) or `src/lib/admin-toolkit/`.
Nothing under `examples/showcase/src/theme` or `src/lib/render` uses `<dialog>`, `showModal`, or
Escape handling. **There is no public-facing modal precedent in the repo at all.**

### `docs/internal/admin-design-system.md`, the dialog conventions
- **`:489-493`**, "**Dialog:** a native `<dialog class="modal">` with a `modal-box`, an
  `aria-labelledby` title, a close button, and the `method="dialog"` backdrop. `showModal()` gives
  focus trap and Escape for free. A dialog that holds its own `<form>` must mount outside any
  page-level form: nested forms are invalid… [the shell] mounts all its dialogs headless at the
  bottom and renders plain triggers where they belong."
- **`:494-502`**, dialog sizing, governing every modal: "a modal never fills the viewport on a normal
  screen. The `modal-box` sizes to its content under a cap… Filling the height is correct in exactly
  one place, the small viewport: below the narrow breakpoint a dialog may become a full-height or
  bottom sheet. **Light dismiss on the backdrop is for a non-destructive dialog**; a destructive
  `alertdialog` keeps an explicit confirm and does not [light-dismiss]."
- `:503-521`, the `ComponentInsertDialog` two-step pattern (catalog step, search past eight items,
  `aria-live` count, configure step).
- `:526-531`, popovers use DaisyUI v5 `popovertarget`/`popover`/`position-anchor`, "never the
  focus-driven `.dropdown` wrapper, which opens on focus-in-transit and ignores Escape."
- `:531-535`, the command palette: a `<dialog>` opened by trigger or Cmd/Ctrl+K, `:focus-visible`
  brand ring on its search input.
- **`:559-573`**, zen-mode focus management: "Focus moves to the close button on open and **returns
  to the trigger on close**; Escape closes it."
- `:636-647`, the focus-ring color rule (field and button `:focus-visible` both resolve to
  `base-content`).
- `:772-783`, the Alt-fill popover's non-modal posture: `role="group"`, "never `role="dialog"`, and
  has no `aria-modal`, no focus trap, and no auto-focus: it is ambient chrome"; `Alt-Enter` moves
  focus in, native Escape returns focus to `.cm-content`.
- `:24-29`, `:45-48`, "cleanly responsive: composed at every width, not merely unbroken (the family
  five-viewport bar: 320, 390, 768, 1440, 2560)".
- `:180`, `--radius-box: 1rem` for "cards, modals".

### `docs/internal/public-design-system.md`
- **`:145-157`**, "The reading surface (`prose.css`)", scoped to `.prose`, listing "figures on the
  `center`/`wide`/`full` contract" (`:153`). **This is the only figure vocabulary the doc states, and
  there is no mention of galleries or lightboxes anywhere in it.**
- `:107-116`, "The ultrawide posture (locked)": root font-size `clamp()` scaling above ~1440px,
  floored at 1rem at and below 1440px, "so a 2560px render fills meaningfully more of the viewport
  than a layout pinned to its 1440px proportions." The explicit 320/390/768/1440/2560 bar language
  lives in the admin doc and the family CLAUDE.md rule, not restated here.
- `:124-126`, the skip-link focus target (`<main id="main" tabindex="-1">`), the one keyboard-focus
  convention this doc states for the public side.
- `:153-154`, `:focus-visible` ring for `.prose a` and "future interactive control": 2px `primary`,
  2px offset, `base-100` halo.
- **No dialog, modal, gallery, or lightbox guidance at all.** A public viewer would be establishing a
  new precedent, and the public design system doc would need to gain that section.
