# Plan: media Phase 3a, the inline figure (captions and placement)

> **For agentic workers:** Execute task-by-task by dispatching each task to `cairn-implementer`
> (pinned Sonnet), test-first against the suite. The main loop reviews each diff and clears the full
> gate before the next dispatch, and upshifts a dispatch (`model: opus`) only for the high-blast tasks
> the plan flags. Honor the cairn conventions and the `cairn-pass` ritual.

**Goal:** Give an inline body media image a caption and a placement (center, wide, full) through a
cairn-reserved `:::figure` container directive that wraps the image as a child node, rendering a real
`<figure><img><figcaption>` with a theme-owned role class in the preview and the public build.

**Architecture:** A focused engine render step (`remarkFigure`, the sibling of `resolveMedia`) handles
the reserved `figure` directive: the child image resolves through the untouched resolver, the caption is
the directive's body text, and a closed role set rides the directive's class. `figure`/`figcaption` join
the base sanitize schema. The editor gains a persistent figure control (the Edit-block pattern) that wraps
and edits the figure through pure source transforms, and the 2b source chip surfaces the figure and role
state. cairn stays markdown-first: the control writes markdown, the preview stays read-only.

**Tech Stack:** unified/remark/rehype (the render pipeline), `remark-directive`/`mdast-util-directive`,
`rehype-sanitize`, Svelte 5 runes, CodeMirror 6 (the editor seams), Vitest (unit + a real-browser
component project), Playwright (the showcase E2E).

Source spec: `docs/superpowers/specs/2026-06-16-cairn-media-3a-inline-figure-design.md` (the
adversarially reviewed design, with the contract each task must meet). Umbrella: the gallery spec
`docs/superpowers/specs/2026-06-15-cairn-media-gallery-design.md`. Builds on the 2b insert UI
(`src/lib/components/MediaInsertPopover.svelte`, `editor-media.ts`, `markdown-format.ts`, the
`registerInsertImage`/`registerReplaceRange`/`registerSelectRange` editor seams) and the foundation
render resolver (`src/lib/render/resolve-media.ts`).

---

## Execution

Standard loop: one `cairn-implementer` per task, test-first, on a feature worktree off `main` (one
worktree per pass), the main loop reviewing each diff and clearing the full gate (`npm run check` 0/0,
`npm test` exit 0, the reference, signature, package, docs, readiness, and version gates) between
dispatches. Effort: high. **Task 1 (the `remarkFigure` render step) and Task 5 (the editor figure
control) are high-blast-radius: review closely and upshift to `model: opus` if the logic warrants.**
Tasks 3, 8, and 9 run in the main loop (the mockup, the polish, the pass-end). The render-output change
(figures render) and the base-sanitize change ride the bundled media release; a site that authors no
figure sees no behavior change, and a site that wants to restyle the placements overrides `.cairn-place-*`.

This pass keeps the cairn methodology's mockup step (Geoff's call): Task 3 builds a `frontend-design`
mockup of the four placement states, the figure control, and the chip role pill, lightly critiqued, as
the visual target for Tasks 4 through 6. The end-of-pass `frontend-design` polish (Task 8) holds the
class-A bar over the real rendered components in both themes.

Build-dependency order: Task 1 (the render step) before 2, 4, 6, 7 (they need figures to render); Task 2
(sanitize base + reserved name) before 7; Task 3 (the mockup) before 4, 5, 6; Tasks 4 and 5 before 6;
Task 5 before 7 (the E2E drives the control).

---

## Task 1 (high-blast, main loop reviews closely): the `remarkFigure` render step

Spec: "The `figure` directive and the `remarkFigure` render step," locked decisions 1, 2, 3, 4.

**Files:**
- Create: `src/lib/render/remark-figure.ts`
- Modify: `src/lib/render/pipeline.ts` (add `remarkFigure` to the remark plugin list)
- Test: `src/tests/unit/remark-figure.test.ts`

Build a remark step `remarkFigure()` that visits `containerDirective` nodes named `figure` and rewrites
each into a figure structure, leaving every other directive to the existing `remarkDirectiveStamp` (which
already skips unregistered names). For a `figure` directive:

- Read `node.attributes?.class`. Keep it only when it is exactly one of the closed role set
  `center`, `wide`, `full`; otherwise treat it as no role. Set `node.data.hName = 'figure'`, and when a
  role is present set `node.data.hProperties = { className: ['cairn-place-' + role] }`. A bare figure
  (no role, the measure default) gets `hName = 'figure'` and no class.
- Find the first descendant media image (an `image` node whose `url` parses as a `media:` reference via
  `parseMediaToken` from `../media/reference.js`). Leave it in place so `remarkResolveMedia` resolves it
  exactly as a bare inline image. Unwrap the image from its enclosing paragraph so the rendered figure is
  `<figure><img>…`, not `<figure><p><img></p>…` (move the image node up to be a direct child of the
  directive, dropping the now-empty wrapper paragraph).
- Take the caption from the figure's body: the first block child that is NOT the image's paragraph and
  carries text becomes the `<figcaption>` (set that node's `data.hName = 'figcaption'`). When no such
  caption block exists, render no `<figcaption>`.
- A `figure` directive with no media image is a degraded authoring state: leave its children as plain
  content (set `hName = 'figure'` but do not invent an image), and never throw.

Order `remarkFigure` in `pipeline.ts` after `remarkDirective` and `[remarkDirectiveStamp, registry]` and
before `remarkResolveMedia`, so the figure structure is set before the media resolver runs over the child
image and before `remarkRehype` flattens the tree. Confirm the child image still resolves (the resolver
visits `image` nodes regardless of their parent).

**Tests** (`src/tests/unit/remark-figure.test.ts`), rendering through the real pipeline with a
`mediaTargets`/resolver fixture (mirror `resolve-media.test.ts`):
- a `:::figure{.wide}` wrapping a media image plus a caption paragraph renders
  `<figure class="cairn-place-wide"><img src="/media/…"><figcaption>…</figcaption></figure>` (assert the
  class, the resolved `img` src, and the figcaption text).
- a bare `:::figure` (no class) renders `<figure>` with no `cairn-place-*` class (the measure default).
- an out-of-set class (`:::figure{.left}`) renders `<figure>` with no `cairn-place-*` class (the role is
  ignored, never passed through).
- a `:::figure` with the image but no caption block renders no `<figcaption>`.
- the child media image resolves to its delivery path (the resolver is untouched by the wrapping).
- a `:::figure` with no media image renders a `<figure>` without throwing.
- the output is `<figure><img>…`, not `<figure><p><img></p>…` (the image paragraph is unwrapped).

**Gate:** the targeted test green, `npm run check` 0/0, `npm test` exit 0, the reference/signature/docs
gates green (a new internal render step adds no public export; confirm no drift).

---

## Task 2: the base sanitize allow-list and the reserved `figure` name

Spec: "The render wiring and the sanitize floor," locked decision 4, engine changes (minor finding M1
from the critique: add to the base, not a renderer option).

**Files:**
- Modify: `src/lib/render/sanitize-schema.ts` (`buildSanitizeSchema`: add `figure`, `figcaption` to the
  base `tagNames`, beside the existing `nav`/`details`/`summary`)
- Modify: `src/lib/render/registry.ts` (`defineRegistry`: reject a component named `figure`)
- Test: `src/tests/unit/sanitize-schema.test.ts` (extend), `src/tests/unit/registry.test.ts` (extend; if
  no such file exists, add the case to the nearest registry test)

Add `figure` and `figcaption` to the base sanitize tag allow-list inside `buildSanitizeSchema`, so a
captioned figure survives the floor on every site, including one that supplies its own `sanitizeSchema`
extension (the schema the consumer extends already carries the tags). A free-form `className` already
survives the floor (the `'*': [… , 'className']` entry), so the `cairn-place-*` class needs no separate
entry; the closed-set validation already happened in `remarkFigure` before the floor sees the class.

Reserve the `figure` directive name: `defineRegistry` throws when a site registers a component whose name
is `figure`, the same fail-closed posture as the reserved `media:` scheme, so a site cannot shadow the
engine's figure handling.

**Tests:**
- a captioned `<figure class="cairn-place-wide"><figcaption>…</figcaption></figure>` survives
  `buildSanitizeSchema()` with no consumer override (the tags and the class are kept).
- the same survives when the consumer passes a `sanitizeSchema` that adds an unrelated tag (the figure
  tags ride the base the consumer extends).
- the default floor (without cairn's additions) would strip `<figure>` (a guard assertion documenting why
  the base addition is required).
- `defineRegistry({ components: [{ name: 'figure', … }] })` throws a clear error.

**Gate:** full gate green.

---

## Task 3 (main loop): the frontend-design mockup of the placement states and the figure control

Spec: "The placement role and the default CSS," "The editor: the figure control and the chip,"
Verification (the `frontend-design` mockup note). Geoff's call: keep the mockup step.

**Files:**
- Create: `docs/internal/design/2026-06-16-media-figure-mockup.html`

Run the `frontend-design` skill to build a static mockup, against the editor-shell gold standard
(`docs/internal/design/2026-06-12-editor-shell-gold-standard.html`) and the admin design system, in both
the light and dark Warm Stone themes, covering:
- the four rendered placement states (the measure default, `center`, `wide`, `full`) for a figure with a
  caption, so the default `.cairn-place-*` CSS values (Task 4) have a visual target;
- the figure control (the caption text field and the role segmented control: None/Center/Wide/Full),
  following the capture-card and segmented-control recipes;
- the 2b source chip carrying a figure/role pill (the "wide" state surfaced on the chip, the way the chip
  already shows the needs-alt flag).

Run a light adversarial UI critique of the mockup (one `general-purpose` Opus critic, the 2b pattern:
pair each failure with a better-pattern counter-example) and fold its findings into a rev. 2 in the same
file. Commit the mockup. This is the visual contract Tasks 4 through 6 implement.

**Gate:** none beyond the mockup committing; this is a design artifact, no engine change.

---

## Task 4: the default placement CSS

Spec: "The placement role and the default CSS." cairn defines the class contract; the showcase carries
the reference implementation and the docs carry the snippet (cairn's sites-own-render-CSS model).

**Files:**
- Modify: `examples/showcase/src` site stylesheet (the showcase's rendered-content CSS; locate the
  stylesheet the showcase preview and build already link, e.g. `app.css` or the site layout's `<style>`)
- Test: covered by the Task 7 E2E (the rendered figure shows the placement) and the Task 3 mockup is the
  visual reference; no unit test for CSS values

Implement the default `.cairn-place-center`, `.cairn-place-wide`, `.cairn-place-full`, and the bare
`figure` (measure default) CSS in the showcase, with the values from the Task 3 mockup: the default figure
at the text measure, `center` centering a below-measure image, `wide` breaking past the measure,
`full` full-bleed, each with the `<figcaption>` styled. Keep the values theme-token-driven where the
showcase uses tokens. The docs task in Task 9 carries the copy-paste snippet for a consumer site.

**Gate:** `npm run check` 0/0 (the showcase typechecks), the showcase builds; visual confirmation rides
Task 7's E2E and Task 8's polish.

---

## Task 5 (high-blast, main loop reviews closely): the editor figure control and the source transforms

Spec: "The editor: the figure control and the chip," open risk 3 (the writeback adjacent to the atomic
token). cairn stays markdown-first: the control writes source, the preview is read-only.

**Files:**
- Modify: `src/lib/components/markdown-format.ts` (the pure transforms)
- Create: `src/lib/components/MediaFigureControl.svelte` (the caption + role form)
- Modify: `src/lib/components/EditPage.svelte` (mount the control, wire it to the toolbar and the editor
  seams), `src/lib/components/MarkdownEditor.svelte` only if a new seam is required (prefer reusing
  `registerReplaceRange`/`registerSelectRange`/`registerCaretCoords`)
- Test: `src/tests/unit/markdown-format.test.ts` (extend), `src/tests/component/MediaFigureControl.test.ts`

Add pure, unit-testable source transforms to `markdown-format.ts`, mirroring `insertImage` and
`findMediaImagesNeedingAlt`:
- `figureAtImage(doc, pos)`: given a caret position on or in a media image, return the existing
  `:::figure` block (its source range, current caption, current role) or null when the image is bare.
- `wrapImageInFigure(doc, imageFrom, imageTo, caption, role)`: produce the `:::figure{.role}` block (role
  omitted when none), the image line, and the caption body, returning the new doc and the selection.
- `updateFigure(doc, figureRange, caption, role)`: rewrite an existing figure's caption and role in place.
- `unwrapFigure(doc, figureRange)`: replace the figure block with its bare image line.
Each escapes a caption the same controlled way `insertImage` escapes alt; each leaves the inner
`![alt](media:slug.hash)` token byte-intact (open risk 3: never corrupt the atomic reference).

Add `MediaFigureControl.svelte`: a small form (the capture-card and segmented-control recipes) with a
caption text input and a role segmented control (None, Center, Wide, Full), emitting the chosen
`{ caption, role }` to its host. It carries the decorative-plus-caption warning (Task 6 owns the
needs-alt wiring; here the control surfaces the warning text when the host reports the image is
decorative).

In `EditPage.svelte`, add a persistent toolbar control (the Edit-block pattern, enabled when the caret
sits on a media image) that opens `MediaFigureControl`, pre-filled from `figureAtImage`, and applies the
result through `registerReplaceRange` (wrap a bare image, update an existing figure, or unwrap). The
preview stays read-only.

**Tests:**
- unit: `wrapImageInFigure` produces `:::figure{.wide}\n![alt](media:ref)\nCap\n:::` and leaves the
  media token intact; `updateFigure` changes the role and caption in place; `unwrapFigure` restores the
  bare image; `figureAtImage` detects an existing figure and returns null for a bare image; a caption with
  a `]`/`:::` is escaped/handled safely.
- component (real browser): the control pre-fills from an existing figure, the role segmented control is
  keyboard-operable with the pressed-state cue, applying wraps/updates/unwraps the source, the inner media
  token is unchanged, and the control is the persistent Edit-block pattern (never mounts on caret move).

**Gate:** full gate green, the editor-boundary test green (no `@codemirror` leak), the reference/signature
gates green for any new MarkdownEditor seam.

---

## Task 6: the chip figure/role surfacing and the caption-aware needs-alt warning

Spec: "The editor: the figure control and the chip," "The needs-alt surface, made caption-aware,"
Accessibility.

**Files:**
- Modify: `src/lib/components/editor-media.ts` (the chip role/figure pill)
- Modify: `src/lib/components/markdown-format.ts` or `src/lib/components/MediaFigureControl.svelte` (the
  decorative-plus-caption detection feeding the warning)
- Modify: `src/lib/components/MarkdownEditor.svelte` (`EditorView.theme` for the chip pill style; reuse
  the directive accent language and `--cairn-warning-ink`)
- Test: `src/tests/component/MarkdownEditor.test.ts` (extend), `src/tests/unit/markdown-format.test.ts`
  (extend)

Surface the figure and role state on the 2b source chip: when a `media:` token sits inside a `:::figure`,
the chip shows a small role pill (the role name, or "figure" for the measure default), styled in the
directive accent language so the visible decoration and the source agree (open risk 3, the
no-hidden-state rule). The chip's needs-alt marker stays.

Make the needs-alt surface caption-aware in the editor warning only (the core scanner stays alt-keyed):
the figure control warns when an author marks an image decorative (empty alt) and also gives it a caption,
since a decorative image with a visible caption is the contradictory state. Alt and caption stay distinct;
a caption never satisfies the alt requirement.

**Tests:**
- component: a `media:` token inside a `:::figure{.wide}` renders the chip with a "wide" role pill; a bare
  token shows no role pill; the pill uses the accent language and holds contrast in both themes.
- unit/component: the decorative-plus-caption state is detected and the control surfaces the warning; a
  captioned image with real alt shows no warning; the alt-debt scanner still flags an empty-alt image.

**Gate:** full gate green.

---

## Task 7: the showcase vertical slice and the E2E

Spec: Verification.

**Files:**
- Modify: `examples/showcase/e2e/media-insert.spec.ts` (extend) or create
  `examples/showcase/e2e/media-figure.spec.ts`
- Modify: showcase wiring only if needed (the figure renders through `CairnAdmin`/`EditPage` and the
  showcase render already threads `resolveMedia`)

Extend the showcase E2E behind `SHOWCASE_FAKE_BACKEND=1` (reuse the 2b fake R2 and fake GitHub, the
seeded post, the real decodable image fixture from `media-insert.spec.ts`): an editor inserts an image
(the 2b flow), opens the figure control, writes a caption and picks `wide`, and the editor source becomes
a `:::figure{.wide}` wrapping the `media:` reference with the caption. The live preview renders
`<figure class="cairn-place-wide"><img src="/media/…"><figcaption>…</figcaption></figure>`. Saving commits
the body (carrying the `:::figure` block and the `media:` reference) plus `media.json`; assert both the
commit body and the manifest in the fake-github recorder. Keep the existing 2b assertions green.

**Tests:** the E2E green in a real browser; the standing engine gate green.

**Gate:** the showcase E2E suite green (one worker, the 2b config), `npm run check` 0/0, `npm test` exit 0.

---

## Task 8 (main loop): the frontend-design polish pass

Spec: Verification (the `frontend-design` polish note), open risk 4.

With the figure rendering in the showcase in both themes, run the `frontend-design` polish pass over the
real rendered output against the Task 3 mockup and the editor-shell gold standard: the four placement
states and their captions, the figure control, and the chip role pill, to the class-A visual bar. Fold the
refinements in (the showcase placement CSS, the control, the chip). Re-confirm contrast on the chip pill
and the warning ink in both themes.

**Gate:** full gate green after any fold-in.

---

## Task 9 (main loop): pass-end ritual

Simplify (code-simplifier over the pass's changed code), the review gate (the relevant reviewers in
parallel: `svelte-reviewer`, `daisyui-a11y-reviewer`, and a render/correctness pass over `remarkFigure`
and the sanitize change; suggest the adversarial review-gate workflow for Geoff's opt-in), the live admin
smoke if proportionate (the render-and-editor change is presentation; the E2E plus both-theme captures may
cover it, the 2b judgment), the docs arm (the add-an-image guide's caption/placement section, the editor
reference and the admin-design-system doc for the figure control and the chip pill, the `.cairn-place-*`
default CSS snippet for a consumer site, the changelog entry for the render-output change and the reserved
`figure` name, the layer-charter statement in the explanation arm, the upgrade-guide entry, the three doc
gates), and the tracking (the post-mortem in this plan, STATUS on `main`, the gallery memory). The bundled
media release that ships Phases 1, 2a, 2b, and 3a together is Geoff's separate call.

---

## Carry-forward (into Phase 3b and beyond)

- **Phase 3b (the hero frontmatter image field):** a new `image` frontmatter field type reusing the 2b
  picker and the alt model, with the caption and alt as frontmatter sub-fields; the template owns the hero
  layout, so no per-image role. Reuses the caption-plus-alt model 3a designs.
- **Phase 3c (the gallery component):** a site-defined registry component with ordered tiles referencing
  library assets, each with its own alt and caption; gallery-from-library first (the picker's multi-select
  against the committed library), gallery-with-bulk-upload after the batch-coalesced ingest (2b open risk
  5).
- **Out of 3a:** float-with-text-wrap (left/right), deliberately cut (it fights the measure and the caption
  box; revisit only with a real wrapped-caption design); multi-paragraph/rich-block captions; numeric width
  sizing (never; the role set is the sizing vocabulary).
- If a shipped cairn content stylesheet (rather than the showcase reference plus the docs snippet) is
  wanted so a fresh non-scaffolded site gets the placement defaults out of the box, that is a separate
  engine call (cairn ships admin CSS today, not content CSS).

---

## Post-mortem (2026-06-16)

**LANDED on `feat/media-3a`** (off `main` at `8410e9e`, which already carried the whole media stack
through 2b). All nine tasks, the code-simplifier pass, the three-reviewer gate with its fold-in, and
the docs arm. Commits `1f3c15f..40603af`. The version stays `0.57.0`: 3a folds into the unreleased
bundled media release, additive to the public API with no new consumer action beyond the 2b R2 wiring.

**Built.** A `remarkFigure` engine render step rewrites the reserved `:::figure` directive into
`<figure><img><figcaption>`, the child media image left for the untouched resolver, the role validated
against the closed set `center`/`wide`/`full`. `figure`/`figcaption` joined the base sanitize floor and
`figure` became a reserved registry name. The showcase carries the default `.cairn-place-*` CSS (the
viewport-breakout model, so `wide`/`full` escape the measure without a grid). The editor gained four
pure source transforms (`figureAtImage`, `wrapImageInFigure`, `updateFigure`, `unwrapFigure`), a new
`onMediaImageAtCaret` seam mirroring `onComponentAtCaret`, the `MediaFigureControl` form (the Edit-block
dialog pattern), and the source-chip role pill. A `frontend-design` mockup (rev. 2, adversarially
critiqued) was the visual contract.

**Verified, first-hand.** `npm run check` 973 files 0/0, `npm test` 184 files / 1913 tests exit 0 (run
fresh, stable, not cache-dependent), the showcase Playwright E2E 14 passed in a real browser (the new
`media-figure.spec.ts` drives insert -> Figure control -> `:::figure{.wide}` source -> preview
`<figure class><img><figcaption>` -> commit body + `media.json`), the reference/package/docs/prose and
editor-boundary gates green. The role-pill and warning-ink contrast was computed: pill text 5.28:1
light / 5.86:1 dark, warning ink AA on base-100 and the 8% tint in both themes.

**Decisions locked.** The emitted source uses a blank line between the image and the caption, but
`remarkFigure` and `figureAtImage` both handle the no-blank-line form too, so a hand-authored figure in
either form renders and round-trips. The caption is raw single-line markdown (inline markup preserved),
fence-escaped only against a leading directive colon. The inner `media:` token is preserved
byte-for-byte across wrap/update/unwrap (open risk 3 held). The chip role pill mirrors `remarkFigure`
exactly (a role only for exactly one closed-set class, via the `.class` shorthand or `class="..."`).
The layer charter is an owned, bounded exception: content carries a closed theme-owned role set, never
freeform presentation (recorded in the render-safety explanation).

**Review gate.** Three reviewers (svelte, daisyui-a11y, an Opus render/transform-correctness pass). One
**Critical**, caught only by the adversarial correctness pass: `readCaption` read only the blank-line
caption form, so opening a hand-authored no-blank-line figure showed an empty caption and "Update"
silently dropped it. Fixed and tested. One **Important** (both UI reviewers): the disabled Figure
button's `.btn-disabled` set `pointer-events: none`, suppressing the title tooltip; switched to
`opacity`/`cursor` utilities. Minors folded: clear the dialog snapshot on close, tie the alt-status row
to its label, make the warning an always-present `role="status"` live region, read the explicit
`class="..."` form in the chip. All at `cb3df0f`.

**Watch items / carry-forward.** A caption authored with a literal leading `\:` loses its backslash on
round-trip (a deliberately deferred extreme edge). The figure apply rewrites the whole doc via
`replaceRange(0, body.length, ...)` (correct, undo reverts in one step via the selection-only second
dispatch, but coarser than a targeted range; a future refinement could return a minimal change range).
The live admin smoke rides the first site cutover (the render-and-editor change is presentation, proven
by the E2E and the 2a workerd suite), matching the 2b deferral. Phases 3b (the hero frontmatter image
field) and 3c (the gallery component) reuse the caption-plus-alt-plus-role model designed here.

**Next (Geoff's calls).** Merge `feat/media-3a` to `main`, then cut the bundled `0.57.0` release
(`gh release create v0.57.0 --target main`, the changelog window as the body, carrying the R2-wiring
Consumers-must line) which fires OIDC trusted publishing, then the per-site R2 cutover (the deferred
live smoke). Then Phase 3b. The `backup-media-2b-pre-scrub` branch can be deleted after the push.
