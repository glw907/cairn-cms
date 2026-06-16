# cairn media gallery, Phase 3a: the inline figure (captions and placement)

Date: 2026-06-16. Status: designed and approved (Geoff, 2026-06-16) after an adversarial critique that
reversed the carrier, ready to plan. This is the first slice of Phase 3 "placements." It builds on the
Phase 2b insert UI (`2026-06-16-cairn-media-2b-insert-ui-design.md`) and stays under the umbrella gallery
spec (`2026-06-15-cairn-media-gallery-design.md`).

## Summary

3a gives an inline body image two things it cannot carry today: a caption, and a placement (its width
and alignment in the page). An author wraps a media image in a `figure` directive, writes a caption as
the directive's body text, and picks a placement role (center, wide, or full). It renders as a real
`<figure><img><figcaption>` with a theme-owned role class, in the live preview and the public build. The
markdown source stays the source of truth and the preview stays read-only.

This slice is the keystone of Phase 3. It designs the caption-plus-alt-plus-role model once, on the
inline body image, so the hero frontmatter field (3b) and the gallery component (3c) reuse it rather than
re-inventing it.

## What this is not

cairn is not a WYSIWYG editor, and 3a holds that line (the `cairn-not-wysiwyg-best-markdown` memory). The
figure directive and its caption are markdown the author can read and hand-edit. The guided control
writes that markdown; it never becomes a drag-and-resize canvas, and the preview never becomes an editing
surface.

3a is the inline body image only. The hero frontmatter image field and the gallery component are Phase 3b
and 3c, separate passes that reuse this model. Float-with-text-wrap (left or right) is deliberately out of
3a (see Deferred).

## The adversarial review and what it changed

The pre-critique design (v1) carried a caption in the CommonMark image title (`![alt](media:hash "cap")`)
and a placement as a bounded inline class brace after the image (`![alt](media:hash){.wide}`). An
adversarial critique ran that syntax through the real parser and rejected the carrier on three confirmed
failures. The corrections it drove:

1. **The caption is element content, not a title attribute.** A CommonMark image title is quote
   delimited, so a literal `"` in a caption (`The "Blue Hour"`) demotes the whole `![...](...)` to plain
   text: no image node, a raw `media:` token shipped to the build, and the resolver cannot even mark it
   broken. The caption control is the most likely producer of that break, not an edge case. The caption
   moves to the figure directive's body text, which has no delimiter hazard.
2. **The placement rides a directive, not a brace after the image.** A `{.token}` brace parses as adjacent
   plain text, not an image attribute, so v1's plugin would have scavenged it from the next text node with
   unspecified whitespace and ordering semantics. The brace also looks like Pandoc or Kramdown attribute
   syntax without being it, so it degrades to literal junk text in every other markdown tool. The figure
   directive carries the role through real, tokenized directive attributes.
3. **The image is a child node of the figure directive.** This is why the 2b review killed
   `:::image{src=media:hash}`: the `media:` resolver visits mdast image nodes, and that directive carried
   its reference as an attribute, so it never resolved. A `figure` directive that wraps a real
   `![](media:hash)` keeps the image a child node, so the existing resolver resolves it untouched. The
   killed pattern and the chosen pattern differ exactly here.

The critique also forced an honest charter position (decision 5 below) instead of relabeling alignment as
"semantic intent," and it set the decomposition into 3a, 3b, and 3c.

One mechanism the critique slightly mis-stated, corrected here: the directive stamp processes only
registered component names, so an unregistered `:::figure` is not auto-stamped to a `<figure>`. cairn
reserves the `figure` directive name and handles it in a focused engine render step (a `remarkFigure`,
the sibling of the existing `resolveMedia` and `resolveLinks` steps), not as a registry component. So
`figure` is a built-in render feature, not the engine's first built-in component, which keeps the "no
built-in components" line the 2b review drew.

## Locked decisions

1. **The carrier is a cairn-reserved `figure` container directive wrapping a media image.**
   ```
   :::figure{.wide}
   ![alt](media:slug.hash)
   A quiet shore at dusk.
   :::
   ```
   The image is a child node (the resolver resolves it). The caption is the directive's body text. The
   placement role rides the directive's class attribute. A bare `![](media:slug.hash)` with no figure
   stays a plain inline image, so 2b output is unchanged and the figure is opt-in.
2. **The caption is the figure's body text, rendered to `<figcaption>`.** No title overloading, no quote
   hazard. The caption may carry inline markdown (emphasis, a link). A figure with no caption text renders
   `<figure>` with the image and no `<figcaption>`.
3. **Placement is a closed role set: `center`, `wide`, `full`, plus the bare measure default.** The role
   is a class on the figure (`:::figure{.wide}` stamps `<figure class="cairn-place-wide">`). The
   `remarkFigure` step validates the class against the closed set and ignores anything outside it, so the
   directive can never carry a freeform value. cairn ships sensible default CSS for the four states; a site
   restyles `.cairn-place-*` and owns the pixels.
4. **`figure` is a reserved directive name handled by an engine render step.** The `remarkFigure` step,
   not a registry component, builds the figure. A site cannot register a component named `figure`; the
   registry rejects it (the same posture as the reserved `media:` scheme).
5. **The layer charter is an owned, bounded exception, not a rename.** Content may carry a closed,
   theme-owned set of layout role classes (a figure's `center`, `wide`, `full`); the theme owns every
   pixel. Content never carries a freeform presentation value: no pixel size, no color, no margin, no
   float, no literal `align=` or `width=`. The boundedness is the defended invariant. This is stated as a
   deliberate exception to "no presentation in content," because `wide` and `full` are layout, and calling
   them "semantic intent" would not change that. A directive still carries no freeform presentation; it
   carries identity, decorative wrapping, and a bounded role from a closed set.
6. **The editor control is persistent, never a contextual toolbar that mounts on caret movement** (the 2b
   rule). It is enabled when the caret sits on a media image (bare or already in a figure) and edits the
   caption and the role in the source. The 2b source chip surfaces the figure and role state, so the
   visible decoration and the source agree.

## The pieces

### 1. The `figure` directive and the `remarkFigure` render step

A new engine remark step, `remarkFigure`, handles the reserved `figure` container directive, running in
the shared render pipeline beside `remarkResolveMedia`. For a `figure` container directive it:

- reads the directive's class attribute and keeps it only when it is one of the closed role set
  (`center`, `wide`, `full`); it stamps `<figure>` (`data.hName = 'figure'`) with
  `class="cairn-place-<role>"` when a role is present, and a bare `<figure>` (the measure default) when
  none is;
- leaves the child media image in place, so `remarkResolveMedia` resolves it exactly as a bare inline
  image (the carrier's whole point);
- takes the figure's caption from its body text: the non-image block content becomes the `<figcaption>`
  (`data.hName = 'figcaption'` on that node). The first media image is the figure content; a following
  text paragraph is the caption.

The step is engine-owned and reserved, like `resolveMedia`. It is not a registry component, so it adds no
public component and a site cannot shadow it. The exact handling of the caption-paragraph identification
and the image-paragraph unwrap (so the output is `<figure><img><figcaption>` rather than a stray nested
`<p>`) is an implementation detail for the plan; the rendered shape is the contract.

### 2. The caption

The caption is the figure body text. It supports inline markdown. It renders to `<figcaption>` after the
image. It is distinct from alt text (see Accessibility): alt is what a non-sighted reader needs to know
the image shows; the caption is supplementary context shown to everyone.

### 3. The placement role and the default CSS

The closed role set is `center`, `wide`, `full`, with the bare figure as the measure default. cairn ships
default CSS for each: the default figure sits at the text measure, `center` centers a below-measure image,
`wide` breaks past the measure to a wider band, `full` is full-bleed. The CSS lives with the admin and the
render output so a fresh site looks right, and a site overrides `.cairn-place-*` to own the look. The role
names are the contract; the pixels are the theme's.

### 4. The render wiring and the sanitize floor

`remarkFigure` joins the remark plugin list in `pipeline.ts`, ordered so the figure structure is set
before `remarkRehype` flattens the tree and so the child image still resolves through
`remarkResolveMedia`. `figure` and `figcaption` are added to the **base** sanitize schema in
`buildSanitizeSchema` (beside `nav`, `details`, `summary`), not to a renderer option a consumer can
replace, so a site that supplies its own `sanitizeSchema` still keeps captions. A free-form `className`
already survives the floor, so the role class needs no separate allow-list entry; the closed-set
validation happens in `remarkFigure`, before the floor ever sees the class.

### 5. The editor: the figure control and the chip

A persistent control in the editor (the Edit-block pattern) is enabled when the caret sits on a media
image. It wraps a bare image in a `figure` directive, edits an existing figure's caption and role, and
unwraps a figure back to a bare image. It writes the source through the existing `registerReplaceRange`
and `registerSelectRange` seams; the preview stays read-only. The 2b source chip
(`editor-media.ts`) surfaces the figure and role state (a small "wide" pill on the chip, the way it
already shows the needs-alt flag), so the author never manipulates a placement the source decoration
hides. The figure directive itself gets the editor's existing directive rail and fold treatment.

### 6. The needs-alt surface, made caption-aware

The 2b needs-alt scanner (`findMediaImagesNeedingAlt`) keys off an empty alt. A captioned figure with an
empty alt is a distinct state: a decorative image with a visible caption is unusual, and a screen reader
that meets an empty-alt image then a caption gets a confusing pair. 3a decides: alt and caption are
different, so a caption does not satisfy the alt requirement, but the figure control warns when an author
marks an image decorative and also gives it a caption. The scanner stays alt-keyed; the editor surfaces
the contradiction at authoring time rather than letting it ship silently.

## Engine and contract changes

- **`remarkFigure`**, a new engine render step for the reserved `figure` directive, in the shared
  pipeline. Engine-internal, exported from no public subpath, like the other render steps.
- **The reserved `figure` directive name.** The registry rejects a site component named `figure`.
- **`figure` and `figcaption` in the base sanitize schema.** A behavior change for the public render
  output: a captioned figure now survives the floor on every site.
- **The editor figure control** and the **chip role/figure surfacing**, additive UI.
- **The needs-alt scanner** gains caption awareness in the editor's warning, not in its core predicate.

No new public component is added. The `media:` codec, the delivery route, and the insert popover are
unchanged from 2b. The render-output change (figures now render) rides the bundled media release; a site
that authors no figure sees no change, so the consumer action is the same as the 2b release (wire the R2
bucket and the `/media` route); a site that wants to restyle the placements overrides `.cairn-place-*`.

## Accessibility

A figure's alt and caption are distinct and both are kept. Alt is the non-sighted reader's description of
the image; the caption is supplementary context for everyone. The figure control captures alt the 2b way
(write alt or mark decorative) and the caption separately. HTML allows a decorative (empty-alt) image
with a caption, but it reads as unusual, so the control warns rather than silently shipping it. A
`<figcaption>` associates with its `<figure>` natively. The control is a persistent, keyboard-reachable button with a
clear label and state; it never mounts or unmounts on caret movement. State carries a glyph or a label,
never hue alone.

## Verification

The standing gate holds: `npm run check` 0/0, `npm test` exit 0, the reference, signature, package, docs,
readiness, and version gates green. Unit tests for `remarkFigure` (a figure with a role renders
`<figure class><img><figcaption>`; a bare figure renders the measure default; an out-of-set role is
ignored; a figure with no caption omits `<figcaption>`; the child media image still resolves; a `figure`
directive with no media image degrades safely). A sanitize test that a captioned figure survives the base
floor and a consumer's custom schema. Component tests for the figure control (wrap, edit caption, change
role, unwrap; the chip surfaces the role; the decorative-plus-caption warning). A showcase E2E extends the
2b slice: an author adds a caption and a placement, the figure renders in the preview and commits with the
entry. The build carries a `frontend-design` mockup and polish pass for the four placement states and the
control, in both themes, before the gate.

## Documentation dimension

A guide section on captions and placement (extending the add-an-image guide); the editor reference and the
admin-design-system doc for the figure control, the chip role surfacing, and the `.cairn-place-*` default
CSS and how a site overrides it; the changelog entry for the render-output change (figures now render) and
the reserved `figure` directive name; the layer-charter statement recorded in the explanation arm; the
upgrade-guide entry. The three doc gates pass.

## Deferred

### Phase 3b: the hero frontmatter image field

A new `image` frontmatter field type, reusing the 2b picker and the alt model, with its own alt and
caption as frontmatter sub-fields. The template places the hero (a designed slot owns its layout), so the
hero needs no per-image role. The caption-plus-alt model 3a designs is reused as frontmatter fields.

### Phase 3c: the gallery component

A registry component (site-defined, consistent with callout and alert being site-defined) with ordered
tiles referencing library assets, each tile carrying its own alt and caption. Picking existing assets is
the picker's multi-select against the committed library; bulk-uploading new images into a gallery needs
the batch-coalesced ingest deferred from 2b (open risk 5), so 3c ships gallery-from-library first and
gallery-with-bulk-upload rides the batch-ingest work.

### Out of 3a entirely

- **Float-with-text-wrap (left or right).** The single most-requested classic placement, and deliberately
  omitted: float-wrap fights the text measure and the caption box, and the best markdown-first tools
  (Ghost ships regular, wide, full, and card, no float) cut it for the same reason. Revisit only with a
  real design for how a wrapped caption and a floated image behave.
- **Multi-paragraph or rich-block captions.** 3a takes one caption per figure; a richer caption is a later
  refinement.
- **Sizing as a numeric width.** Never; the role set is the sizing vocabulary, the theme owns the pixels.

## Open risks carried into the build

1. **Caption identification inside the directive.** Distinguishing the image content from the caption text
   in the figure body, and unwrapping the image's paragraph so the output is
   `<figure><img><figcaption>`, is the load-bearing render detail; it gets its own tests, and the
   acceptance bar is the exact rendered shape with the caption associated to the figure.
2. **The reserved name collision.** A site that already authored a `:::figure` for its own purpose, or
   registered a `figure` component, must be caught by the registry rejection and called out in the upgrade
   guide.
3. **The writeback control and the atomic chip.** The figure control edits source adjacent to the 2b
   atomic `media:` token; the wrap or unwrap must not corrupt the token, and the chip must keep showing the
   true state. The control reuses the proven `registerReplaceRange`/`registerSelectRange` seams.
4. **The `frontend-design` and review gates** carry the class-A bar for the four placement states and the
   control, benchmarked against the best non-WYSIWYG markdown editors, in both themes.
