# cairn media gallery, Phase 2b: the insert UI

Date: 2026-06-16. Status: designed and approved (Geoff, 2026-06-16) after a five-lens adversarial
review, ready to plan. This is the first author-visible slice of the media gallery. It builds on the
Phase 2a ingest and delivery infrastructure (`2026-06-15-cairn-media-2a-ingest-delivery-design.md`) and
implements the inline-image insert experience from the umbrella gallery spec
(`2026-06-15-cairn-media-gallery-design.md`), which stays the umbrella design.

## Summary

Phase 2b makes media author-usable for the first time: an editor drops, pastes, or picks an image and it
lands in the post as a plain `![alt](media:slug.hash)` reference that renders in the live preview and on
the public build. The slice covers the at-caret insert popover, the combobox picker over the site's
committed media library, the one-step capture card, paste and drag ingest, the optimistic upload loop
with dedup, inline placement, and the editor-side render wiring. This is the release that ships the whole
media stack (Phase 1 foundation plus 2a infrastructure plus this UI) behind the `transformations: false`
default, with one per-site consumer action.

## What this is not

cairn is not a WYSIWYG editor, and 2b holds that line (see the `cairn-not-wysiwyg-best-markdown` memory).
The markdown source in the CodeMirror editor is the primary surface and the source of truth. The insert
popover and the capture card are guided forms that write markdown. The live preview renders the result
and stays read-only: an author never drags a rendered image or manipulates the preview to place or size
it.

## The adversarial review and what it changed

The pre-spec design carried a `:::image{src=media:hash align=wide caption="..."}` directive for per-image
alignment and a contextual toolbar group that appeared when the caret entered the block. A five-lens
adversarial review (author experience, architecture, competitive best-in-class, markdown purity, scope
and accessibility) rejected that direction, and three independent lenses reached the same verdict for
different reasons. The directive is gone. The corrections it drove:

1. **No `:::image` figure directive.** The `media:` resolver visits mdast image nodes; a directive
   carries its reference as an attribute, so the resolver never resolves it, and wiring around that
   either pollutes the component context, breaks the preview-versus-public resolver split, or duplicates
   the resolver. The directive also bakes presentation (`align`, `width`) into committed content, which
   is incoherent with cairn's class-driven render (it already strips inline `style` wholesale), and it
   makes a content payload survive only inside proprietary syntax. The engine ships no built-in
   components today; callout and alert are site-defined.
2. **Per-image presentation moves to Phase 3.** Alignment, sizing, and captions are the "placements"
   work. Doing them well needs the theme-class contract and the hero-and-gallery context, so rushing a
   weaker version into 2b is a net loss. 2b ships the plain inline image, which is exactly what the
   umbrella spec scoped for the first slice.
3. **Paste and drag are primary, not a prose promise.** Every serious markdown editor treats
   paste-from-clipboard and drag as the main ingest gesture; the toolbar button is the discoverable
   fallback. These are first-class 2b build tasks with their own tests.
4. **Alt is a debt, not a hard block.** Blocking insert until alt is resolved makes a hurried author
   click "decorative" reflexively, which is worse for accessibility than deferred alt. Insert proceeds;
   missing alt is a persistent flag and a publish-time surface.
5. **No contextual toolbar group that appears and disappears on caret movement.** That pattern loses
   focus, corrupts the toolbar's roving order, and either stays silent or spams a screen reader. The
   codebase already solved per-block editing with a persistent, always-focusable control whose enabled
   state tracks the caret.

The review validated two things: the combobox picker belongs in 2b (do not under-build to upload-only),
and the not-WYSIWYG constraint held across every lens.

## Locked decisions

1. **2b ships the plain `![alt](media:slug.hash)` inline image only.** No figure directive, no per-image
   alignment or sizing in committed content. The site CSS renders an inline image responsively.
2. **Paste and drag are the primary ingest gestures**, wired to the CodeMirror surface through the 2a
   `client-ingest` helper, with the toolbar Insert-media button as the discoverable fallback. A failed
   paste or drop shows a typed failure card; it never writes a `blob:` or base64 URL into the source.
3. **The capture card never blocks insert on alt.** It captures the file, a slug-proposed editable
   display name, and alt (a real `role="radiogroup"`: write alt, or mark decorative). Insert proceeds
   with alt unset; a decorative choice emits an empty `alt=""` (not the literal word). Missing alt is
   surfaced as a debt, not a wall.
4. **The popover leads with upload and biases by signal.** Opened by paste or drag, it goes straight to
   the capture card (the bytes are already in hand). Opened by the button, it leads with the drop zone
   and choose-file, with "or reuse an image" secondary; the search-first combobox earns top billing only
   when the library is large.
5. **The combobox picker browses the committed library read-only.** Rows carry a thumbnail, the display
   name, and a needs-alt flag, searchable across name and alt. The cross-entry usage pill ("found in N
   entries") needs the Phase 4 usage index and is not in 2b. A media-type facet (Images, Documents) is a
   designed-in seam, hidden while only one stored type exists.
6. **The `media:` token is decorated in the source.** A CodeMirror decoration renders the reference as
   the asset's thumbnail and human display name, and treats the `media:slug.hash` token as atomic so a
   stray keystroke cannot silently corrupt the hash (a bad reference throws on the public build).
7. **The contextual edit affordance is a persistent control**, never a toolbar group that mounts and
   unmounts on caret movement. In 2b the only placed-image action is re-insert; replace-in-place is
   Phase 4.
8. **The toolbar gains one Insert-media entry**, replacing the disabled "Image (coming soon)" button in
   the `insertControls` group, opening the at-caret popover.

## The pieces

### 1. The insert popover

An at-caret popover anchored to the CodeMirror cursor, opened three ways: the toolbar Insert-media
button, a paste of image bytes, and a drag-drop onto the editor surface. It routes by the opening
signal. Paste and drag carry bytes, so they skip the chooser and open the capture card directly. The
button opens the chooser, which in 2b is the stored-media surface: the upload drop zone and choose-file
as the persistent primary, and the combobox picker over the committed library below. The popover moves
focus in on open, traps Tab, and restores the exact prior editor selection on close or Escape, reusing
the edit page's existing focus-restore seam. It falls back to a full-height sheet below the narrow
breakpoint (the admin design system's modal-sizing rule).

### 2. The combobox picker

A real combobox over a listbox: focus stays in the search input, `aria-activedescendant` moves through
real `option` rows, search runs across the display name and alt. Each row carries a thumbnail, the name,
and a needs-alt flag. Picking a row inserts that asset's `media:` reference at the caret, prefilling the
placement's alt from the asset's manifest alt. The library read is projected from the committed media
manifest (see the engine changes); the picker never reaches R2 directly.

### 3. The capture card

One step takes the file, a slug-proposed editable display name (never `image.png`; a generic camera stem
leaves the name empty-required with no Suggested tag, per the 2a `proposedNameFor` helper), and alt as a
required-or-decorative radiogroup. Insert is enabled throughout; the radiogroup's requirement is
surfaced through `aria-describedby`, and an author who proceeds without alt inserts an image flagged as
needing alt. A decorative choice writes `alt=""`.

### 4. The optimistic upload loop

On insert, an optimistic placeholder lands at the caret with determinate progress, rendered from a local
object URL so the author sees the image immediately. The client runs `ingestFile` then
`buildUploadRequest` then `sendUpload` (the 2a helper), reading the CSRF token from the `cairn:csrf`
context. The response is a SvelteKit form-action envelope: success carries the `media:` reference and the
server-owned record, which the editor swaps into the placeholder as the real `![alt](media:slug.hash)`;
a dedup result collapses the placeholder to "reused existing" and points at the existing reference; a
failure shows the typed card (decode-unsupported, transcode-failed, too-large, network) with a retry. An
opaque or status-0 response is treated as session-expired (the guard's redirect under `redirect:
'manual'`). The optimistic record rides the editor's client state and commits with the entry at Save (2a
threads it into the save and publish commits); the upload itself commits nothing.

### 5. Inline placement and the source decoration

The committed form is a plain `![alt](media:slug.hash)` at the caret. In the source the editor decorates
the `media:` token with the asset's thumbnail and display name and makes the token atomic. A placement
whose alt is empty carries a persistent needs-alt marker on that decoration.

### 6. Paste and drag ingest

The MarkdownEditor seam gains CodeMirror `domEventHandlers` for `paste`, `dragover`, and `drop`. A
pasted or dropped image is normalized through the 2a `normalizeDataTransfer` and `guardDropTarget`
helpers and routed into the same ingest-and-insert pipeline as the button. A paste that carries no image
(plain text, markdown) falls through to CodeMirror's normal handling. A paste of an image that fails
ingest shows the typed failure card and leaves the source untouched.

### 7. The render wiring

The edit page builds a media resolver from the projected library (the analog of the existing
`manifestLinkResolver` for `cairn:` links) and passes it as the `resolveMedia` render opt, so a
`media:` reference renders a thumbnail in the live preview the moment it is inserted. The `render` prop
on `EditPage` and `CairnAdmin` gains the trailing `resolveMedia` opt the render pipeline already accepts
(2a added it to the adapter and runtime signatures). The showcase adapter already threads a default
resolver for the public build (2a).

### 8. The toolbar integration

The disabled "Image (coming soon)" button in the `insertControls` snippet becomes the real Insert-media
control, opening the popover. It sits in the existing Insert group beside Insert block and the link
controls. The umbrella vision of one insert entry point that later also routes to embeds and icons is a
direction this control is shaped toward, but consolidating the existing component-insert and link
controls under one entry is its own future pass, not 2b.

## Engine and contract changes

- **The library projection.** `editLoad`'s media read grows from the minimal `mediaTargets` resolver
  input (hash to slug, ext, contentType) to also carry the picker's human layer (display name, alt,
  dimensions, needs-alt), either as a fuller projection on `EditData` or a second field parallel to
  `mediaTargets`. The minimal resolver input stays lean for the render path; the picker reads the
  fuller projection. A no-media site issues no read.
- **The `render` prop signature** on `EditPage` and `CairnAdmin` gains the trailing optional
  `resolveMedia?: MediaResolve` opt, matching the adapter and runtime signatures 2a added. This is a
  prop-type change on two components, additive.
- **The MarkdownEditor seam** gains the paste/drop `domEventHandlers` and the `media:` source
  decoration. The decoration reads the projected library for the thumbnail and name.
- **A manifest-style media resolver helper** built from the projected library, the analog of
  `manifestLinkResolver`.
- **The CSRF token read** for the upload fetch, via the `cairn:csrf` context getter the edit page can
  reach in-component.
- **The needs-alt surface.** A placed image with empty alt is flagged in the editor (the source
  decoration) and in the picker rows. A publish-time surface that counts images still needing alt, with
  jump-to-each, is a non-blocking addition consistent with the broken-link list pattern (loud, not a
  wall).

No new public component is added (no built-in `:::image`). The `media:` codec and the delivery route are
unchanged from 2a. The release carries one per-site consumer action (wire the `MEDIA_BUCKET` r2_buckets
binding and mount the `/media` route) plus the additive render-signature note.

## Accessibility

The combobox is a real combobox over a listbox with a live `aria-activedescendant` and focus held in the
input. Alt capture is a `role="radiogroup"` of real radios with `aria-required` and grouped error text;
the insert button stays enabled (no skipped-disabled-reason trap), with the requirement surfaced through
`aria-describedby`. The results count and the active-row narration use two separate live regions so one
never clobbers the other. The popover traps and restores focus to the exact prior editor selection. The
upload progress is announced politely. State carries a glyph or a label, never hue alone; muted text
never stacks opacity. No control mounts or unmounts on caret movement.

## Image states to design and test

Upload in progress with determinate progress; each failure (oversize, wrong type, network,
binding-missing) with a retry; drag-and-drop with a guarded drop target; paste from the clipboard
becoming a named asset; a paste that fails ingest leaving the source clean; the dedup sequence
(placeholder, hash resolves, collapses to "reused existing"); a HEIC converting state; empty-library
first run; a large library with search; a missing-alt placement with its persistent flag; the messy
content (long filenames, missing dimensions, a generic camera stem, many items, one item).

## Verification

The standing gate holds: `npm run check` 0/0, `npm test` exit 0, the reference, signature, package,
docs, readiness, and version gates green. Unit tests for the pure parts (the popover routing logic, the
library projection, the placeholder-to-reference swap, the needs-alt detection). Component tests in a
real browser for the popover, the combobox picker, the capture card, and the paste/drop handlers.
A showcase E2E proves the vertical slice end to end in a real browser: paste or choose an image, the
optimistic placeholder lands, the upload resolves to a `media:` reference that renders a thumbnail in the
preview, and saving commits the body plus `media.json`. The build carries a `frontend-design` polish pass
against the editor-shell gold standard, in both themes, before the gate, and an adversarial review-gate
workflow at the end.

## Documentation dimension

A guide for adding and placing an image (the editor's view); an update to the editor reference and the
admin-design-system doc for the Insert-media control and the popover; the changelog `Consumers must:`
line for the per-site R2 wiring and the `/media` route mount, carried on the bundled release that ships
the whole media stack; the upgrade-guide per-version entry. The `media.*` log events are already
documented (2a).

## Deferred

### Phase 3 (placements), with the durable carriers this review settled

- **Captions** via the standard CommonMark image title (`![alt](media:slug.hash "caption")`, which the
  resolver already writes to `title`), promoted to `<figure><figcaption>` by a render step, with
  `figure`/`figcaption` added to the sanitize floor allow-list once.
- **Alignment and sizing** as a closed set of theme-resolved intent, carried as a class the site's CSS
  owns (for example `{.align-center}` on the image, or a small site-defined figure component), never
  `align`/`width` numbers in content. The author picks the intent through a persistent guided Align
  control; cairn ships sensible default CSS for the intent classes; a site can restyle them. The exact
  carrier (an inline class versus a child-node figure component) is the Phase 3 decision; the model is
  fixed: a guided control writes a semantic intent, the theme owns the look.
- **A layer charter** recorded for the directive layer: a directive may carry semantic identity and
  decorative wrapping, never presentation parameters (size, alignment, color, spacing). This is the rule
  that keeps the "it's just markdown plus a bounded directive layer" promise true.
- The hero frontmatter image field and the gallery component, and the alt model carried across all three
  placements.

### Phase 4 (management)

The Media management screen, the branch-spanning usage index, the "found in N entries" picker pill,
replace-in-place, and safe-delete.

### Phase 5 (referenced media and tokens)

The embed directive (oEmbed resolve with a bookmark-card fallback) and the chooser routing to the icon
picker. A unified insert entry point that consolidates components, media, links, embeds, and icons under
one affordance, and a slash trigger that serves every insert, are cross-cutting and belong with this
consolidation, not with media alone.

## Open risks carried into the build

1. **The paste interception in CodeMirror.** Distinguishing a clipboard image from pasted text or
   markdown, routing it to ingest, and leaving normal paste untouched is the load-bearing new
   interaction; it gets its own task and tests, and the acceptance bar is that a screenshot paste lands a
   named, alt-flagged image or shows an error card, never a blob URL.
2. **The optimistic placeholder representation in the source.** The placeholder is a transient editor
   decoration at the insert position, swapped to the committed markdown on resolve; it must never leave a
   half-written token in the source if the upload fails or the session expires.
3. **Batch ingest.** 2b does not offer multi-select drag-drop; the umbrella batch-coalesced ingest (many
   R2 puts, one save commit) is unbuilt, so a single-file ingest per gesture is the 2b bound (2a open
   risk 5).
4. **The frontend-design and adversarial gates** carry the class-A bar for both function and visual,
   benchmarked against the best non-WYSIWYG markdown editors, with each review lens pairing a failure
   probe with a better-pattern counter-example.
