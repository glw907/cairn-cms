# Plan: media Phase 2b, the insert UI

Source spec: `docs/superpowers/specs/2026-06-16-cairn-media-2b-insert-ui-design.md` (the adversarially
reviewed design, with the contract each task must meet). Umbrella: the gallery spec
`docs/superpowers/specs/2026-06-15-cairn-media-gallery-design.md`. Builds on the Phase 1 foundation
(`src/lib/media/`) and the Phase 2a infrastructure (the `/media` route, `uploadAction`, the
`client-ingest` helper, the `editLoad` `mediaTargets` projection, the render resolver).

This is the first author-visible slice: an editor drops, pastes, or picks an image and it lands in the
post as `![alt](media:slug.hash)`, rendering in the preview and the public build. Per-image presentation
(captions, alignment, sizing) is Phase 3; this ships the plain inline image done to a class-A bar. cairn
stays markdown-first, not WYSIWYG: the guided forms write markdown, the preview is read-only.

## Execution

This pass skips the dedicated mockup-first design loop, a deliberate departure from
[[cairn-ui-design-pass-methodology]] that the settled direction earns. The five-lens adversarial design
review already did the hard design thinking and the best-in-class benchmarking (it removed the contested
`:::image` directive and the alignment controls, and made paste-first ingest and alt-as-debt
first-class), and
the umbrella design pass already produced the rev.2 insert mockup
(`docs/internal/design/2026-06-15-media-gallery-mockup.html`). What remains composes mostly from
established patterns: the component-picker combobox-over-listbox (the 0.56.2 pass), the dialog chrome,
the editor's directive treatment, and the toolbar Insert group. So the build targets the existing rev.2
mockup and those precedents rather than a fresh mockup. The two new visual elements (the `media:` source
decoration and the optimistic placeholder, both CodeMirror decorations with no precedent) get a focused
`frontend-design` treatment inside their build tasks, designed against the real editor rather than a
low-fidelity static mockup. The class-A visual bar is held at the end by the `frontend-design` polish
pass over the real rendered components in both themes (Task 10) and the adversarial review-gate workflow
(Task 11).

Implementation is the standard loop: one `cairn-implementer` per task, test-first, on this feature
worktree, the main loop reviewing each diff and clearing the full gate (`npm run check` 0/0, `npm test`
exit 0, the reference, signature, package, docs, readiness, and version gates) between dispatches.
Effort: high. The high-blast-radius tasks (Task 3 the editor paste/drop seam and source decoration, Task
6 the popover and the optimistic loop) get a careful main-loop review and may be upshifted. Tasks 10 and
11 run in the main loop (the polish and the pass-end). It ships behind the `transformations: false`
default and a `Consumers must:` line on the bundled release that carries the whole media stack.

Build-dependency order: Task 1 (the library projection) before 2 and 5; Task 3 (the editor seam) before
6 and 7; Tasks 4 and 5 (the card and picker) before 6 (the popover composes them); Task 6 before 9 (the
E2E).

## Task 1: the library projection on editLoad

Spec: "Engine and contract changes," the library projection. In `editLoad`
(`src/lib/sveltekit/content-routes.ts`), extend the gated media read so it carries the picker's human
layer alongside the existing minimal `mediaTargets`. Add a `mediaLibrary` field to `EditData`: an array
(or hash-keyed record) of `{ hash, slug, ext, contentType, displayName, alt, width, height, bytes }`
projected from the committed media manifest, parallel to `mediaTargets` (which stays the lean
`{ slug, ext, contentType }` resolver input). Both come from the one gated read (no second backend
call); a no-media site issues no read and gets an empty projection; a corrupt or failed read degrades to
empty. Keep the existing `mediaTargets` shape unchanged so the resolver path is untouched.

Tests (`src/tests/unit/content-routes-edit.test.ts`): `editLoad` with media enabled populates
`mediaLibrary` with the full per-asset fields from one read; a failed media read degrades both
`mediaTargets` and `mediaLibrary` to empty without throwing; a no-media site issues no read and both are
empty; the projection carries the human layer (displayName, alt, dimensions), not just the resolver
triple. Update the `EditData` reference entry in `docs/reference/sveltekit.md`.

## Task 2: the preview media resolver and the render prop wiring

Spec: "The render wiring" and "Engine and contract changes." Add a manifest-style media resolver helper
(the analog of `manifestLinkResolver` in `src/lib/content/manifest.ts`), e.g. `manifestMediaResolver`
in `src/lib/media/` or beside the link one, that takes the `mediaTargets` projection and returns a
`MediaResolve` (`(ref) => url | undefined`) building the delivery `publicPath` from the projected
slug/ext per hash, degrading to undefined on a miss. In `EditPage.svelte` and `CairnAdmin.svelte`, add
the trailing optional `resolveMedia?: MediaResolve` to the `render` prop type (matching the adapter and
runtime signatures 2a added), build the resolver from `data.mediaTargets` with `$derived` (mirroring the
existing `resolveLink = manifestLinkResolver(data.linkTargets)`), and pass it as `resolveMedia` in the
preview render call alongside `resolve: resolveLink`.

Tests (unit + component): `manifestMediaResolver` resolves a known hash to its delivery path and misses
to undefined; an `EditPage` component test renders a `media:` reference in the preview to a thumbnail
`<img>` whose src is the `/media/...` delivery path, using a `mediaTargets` fixture; the render prop
typechecks with the added opt. Confirm `check:reference:signatures` green after the prop-type change and
update the affected reference pages.

## Task 3 (main loop reviews carefully): the editor paste/drop seam and the media: source decoration

Spec: "Paste and drag ingest" and "Inline placement and the source decoration," locked decisions 2 and
6. In `MarkdownEditor.svelte`, add CodeMirror `EditorView.domEventHandlers` for `paste`, `dragover`, and
`drop`: a dropped or pasted image (detected via the 2a `normalizeDataTransfer`) is `preventDefault`'d
(via `guardDropTarget`) and handed to a `registerImageIngest` callback the host wires; a paste carrying
no image falls through to CodeMirror's default. Add a CodeMirror decoration extension that renders each
`media:slug.hash` token in the source with the asset's thumbnail and display name (read from the
`mediaLibrary` projection passed into the editor) and treats the token as atomic (a stray keystroke
selects/replaces the whole reference rather than corrupting a hex digit), with a persistent needs-alt
marker when the placement's alt is empty. Add a pure `insertImage(doc, from, to, alt, ref)` transform to
`src/lib/components/markdown-format.ts` producing `![alt](media:slug.hash)`, and a `registerInsertImage`
seam on the editor that dispatches it at the caret (mirroring `registerInsertLink`). The decoration is
the first new visual element: design it against the real editor with the `frontend-design` eye, reusing
the directive-treatment visual language (rails, the token highlight), in both themes.

Tests: unit tests for `insertImage` (produces the right `![alt](media:ref)`, escapes a bracket in alt);
unit tests for the paste/drop routing decision (an image DataTransfer routes to ingest, a text paste
falls through); a component test that a dropped image file triggers the ingest callback; the source
decoration renders the display name and the needs-alt marker for a fixture token. The browser-coupled
decoration is proven in a component test; keep the pure routing/transform logic unit-tested.

## Task 4: the capture card component

Spec: "The capture card," locked decision 3. Add `MediaCaptureCard.svelte` (under
`src/lib/components/`): one step taking the file, a slug-proposed editable display name (from the 2a
`proposedNameFor`; a generic stem leaves the name empty-required with no Suggested tag), and alt as a
real `role="radiogroup"` (write alt, or mark decorative). Insert stays enabled throughout; the alt
requirement is surfaced through `aria-describedby` (not a disabled button), an author who proceeds
without alt produces an image flagged as needing alt, and a decorative choice resolves alt to `""`. The
card emits the captured `{ file, displayName, alt }` to its host.

Tests (component, real browser): the card renders the proposed name for a real filename and empty for a
generic stem; the radiogroup is keyboard-operable with `aria-required` and grouped error text; insert is
never disabled; choosing decorative yields `alt=""`; submitting without alt emits the record flagged
needs-alt. Follow the existing dialog/component-test harness (`ComponentForm`/`WebLinkDialog` tests).

## Task 5: the combobox picker component

Spec: "The combobox picker," locked decision 5. Add `MediaPicker.svelte` (under `src/lib/components/`):
a combobox over a listbox, focus held in the search input, `aria-activedescendant` moving through real
`option` rows, search across the display name and alt, fed by the `mediaLibrary` projection. Each row
carries a thumbnail (the `thumb` preset URL or the bare path under `transformations: false`), the
display name, and a needs-alt flag. Selecting a row emits the chosen asset (its `media:` reference and
the manifest alt to prefill the placement). Include the media-type facet as a seam: a filter derived
from `contentType`, hidden while only one stored type exists. No cross-entry usage pill (Phase 4).

Tests (component): the combobox holds focus in the input and moves `aria-activedescendant` over rows;
search narrows by name and alt; a row carries the thumbnail, name, and needs-alt flag; selecting emits
the reference and the prefilled alt; the type facet stays hidden with one stored type. Match the
component-picker combobox a11y pattern.

## Task 6 (main loop reviews carefully): the insert popover and the optimistic upload loop

Spec: "The insert popover" and "The optimistic upload loop," locked decisions 2 and 4, open risks 1 and
2. Add `MediaInsertPopover.svelte` (under `src/lib/components/`): an at-caret popover anchored to the
CodeMirror cursor, opened by the toolbar button, by paste, and by drop. Route by the opening signal:
paste and drag carry bytes and open `MediaCaptureCard` directly; the button opens the chooser
(upload-first, `MediaPicker` below). Move focus in on open, trap Tab, restore the exact prior editor
selection on close or Escape (reuse the edit page's focus-restore seam), and fall back to a full-height
sheet below the narrow breakpoint. Drive the optimistic loop: on insert, land an optimistic placeholder
at the caret (a CodeMirror decoration from a local object URL, with determinate progress), run
`ingestFile` then `buildUploadRequest` then `sendUpload` (the 2a helper, reading the CSRF token from the
`cairn:csrf` context getter), and on the success envelope swap the placeholder for the real
`![alt](media:slug.hash)` (via `registerInsertImage`/`registerReplaceRange` from Task 3); a dedup result
collapses to "reused existing" pointing at the existing reference; a typed failure (decode-unsupported,
transcode-failed, too-large, network) shows the card with a retry; an opaque or status-0 response is
treated as session-expired. The placeholder never leaves a half-written token in the source on failure
(open risk 2). The optimistic placeholder is the second new visual element: give it the
`frontend-design` eye in both themes.

Tests (component + unit): the popover routes a button-open to the chooser and a paste/drag-open to the
capture card; focus traps and restores on Escape; the optimistic placeholder appears then resolves to
the `media:` reference on a success envelope; a dedup envelope collapses to "reused existing"; a failure
envelope shows the typed card and leaves the source unchanged; a status-0 response surfaces
session-expired. The pure envelope-handling and placeholder-swap logic is unit-tested; the popover and
focus behavior in a component test.

## Task 7: inline placement and the needs-alt surface

Spec: "Inline placement and the source decoration," "The needs-alt surface." Wire the committed inline
placement (the `registerInsertImage` path from Task 3) into the popover's success path so a picked or
uploaded image lands as `![alt](media:slug.hash)` at the caret. Add the needs-alt detection: a pure
helper that scans a markdown body for media images with empty alt (`![](media:...)`), surfaced as the
source-decoration marker (Task 3) and the picker-row flag (Task 5), and a non-blocking publish-time
count on the edit page (a "N images need alt text" notice with jump-to-each, modeled on the broken-link
list but a warning, not a block). The publish path itself is unchanged (alt is a11y debt, not a render
failure).

Tests (unit + component): the needs-alt scanner finds empty-alt media images and ignores captioned or
alt-bearing ones and non-media images; the edit page surfaces the count when placements lack alt and
clears it when filled; placement inserts the right `![alt](media:ref)` at the caret.

## Task 8: the toolbar Insert-media entry

Spec: "The toolbar integration," locked decision 8. In `EditPage.svelte`, replace the disabled "Image
(coming soon)" button in the `insertControls` snippet with the real Insert-media control that opens
`MediaInsertPopover` (the `trigger={false}` + `bind:this` + exported `open()` idiom every existing
dialog uses), gated `disabled={insertDisabled}` in Preview like its siblings. Mount the popover headless
at the bottom beside the other dialogs.

Tests (component): the toolbar shows an enabled Insert-media control in Write mode and disabled in
Preview; clicking it opens the popover. Extend the existing toolbar/EditPage component tests.

## Task 9: the showcase vertical slice and the E2E

Spec: "Verification." Wire the insert UI into the showcase edit page (the components compose through
`CairnAdmin`/`EditPage`, so the wiring is the render-resolver and the editor projections from Tasks 1-3
reaching the showcase). Add a showcase E2E (`examples/showcase/e2e/media-insert.spec.ts`, behind
`SHOWCASE_FAKE_BACKEND=1`, using the 2a fake R2 and fake GitHub): an editor opens a post, chooses or
pastes an image, the optimistic placeholder lands, the upload resolves to a `media:` reference that
renders a thumbnail in the live preview, and saving commits the body plus `media.json` (assert both
paths in the fake-github commit). Reuse the 2a media-slice fixtures.

Tests: the E2E green in a real browser; the standing gate green.

## Task 10 (main loop): the frontend-design polish pass

Spec: locked decision 9 (umbrella), the "Verification" frontend-design note. With the components
rendering in the showcase in both themes, run the `frontend-design` polish pass against the editor-shell
gold standard: the popover, the picker rows, the capture card, the optimistic and failure states, and
the source decoration, to the class-A visual bar. Fold the refinements in.

## Task 11 (main loop): pass-end ritual

Simplify (code-simplifier over the pass's changed code), the review gate (the adversarial review-gate
workflow Geoff opts into, plus `svelte-reviewer`, `daisyui-a11y-reviewer`, and the
`web-auth-security-reviewer` for the upload-fetch and CSRF-context path), the live admin smoke against a
real Worker for the upload flow (proportionate here: a new author-facing write path through the editor),
the docs arm (the add-an-image guide, the editor reference, the admin-design-system update, the changelog
`Consumers must:` line, the three doc gates), and the tracking (the post-mortem in this plan, STATUS on
main, the gallery memory). The bundled release that ships the whole media stack is Geoff's separate call.

## Carry-forward (into Phase 3 and beyond)

- Phase 3 (placements): captions via the standard CommonMark image title promoted to `<figcaption>`;
  alignment and sizing as theme-resolved intent classes (the author picks the intent through a
  persistent guided Align control, the site CSS owns the look), with the layer charter (a directive
  carries identity and decorative wrapping, never presentation parameters); the hero frontmatter image
  field; the gallery component. The exact alignment carrier (an inline class versus a child-node figure
  component) is the Phase 3 decision.
- Phase 4 (management): the Media screen, the branch-spanning usage index, the "found in N entries"
  picker pill, replace-in-place, and safe-delete.
- Phase 5: the embed directive and the icon-picker routing, the unified insert entry point
  consolidating components/media/links/embeds/icons, and a slash trigger that serves every insert.
- Batch-coalesced ingest (many R2 puts, one save commit) before any multi-select drag-drop (2a open
  risk 5).
- The Obsidian-style source-writeback badge (a value rendered at the token that opens the guided form
  and writes the source) as a class-A refinement for the Phase 3 alignment control, if the editor can
  host a non-WYSIWYG affordance without becoming an editing canvas.
