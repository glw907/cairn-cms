# The editor experience: a quiet writing surface (design)

**Date 2026-06-12. Scope and font settled with Geoff the same day; spec awaiting his read.**

## Why

Geoff's field report: the in-editor experience is a mess, while the top and bottom bars are fine.
The target feel is iA Writer plus the live markdown styling we already started: complete, lean,
refined. A capture of the real editor (showcase, both themes, representative content) plus a code
read against the installed packages turned the impression into specifics:

- The surface reads as code, not writing: system monospace at 15px with every heading the same
  size as body text.
- Color soup: purple headings, purple inline code, blue links with the full URL exposed at full
  strength, purple directive bands. Nothing recedes.
- Syntax markers (`##`, `**`, `](https://…)`) render at the same weight as the words around them.
- One outright defect. The editor parses commonmark only (`markdown()` defaults to
  `commonmarkLanguage`), so the toolbar's own strikethrough button inserts syntax the editor
  cannot parse, and tables and task lists get no styling either. (Correction, found red-first in
  Task 1: the markdown keymap was already active through `markdown()`'s `addKeymap` default, so
  Enter list-continuation and markup-aware Backspace worked all along; the pass pins both with
  tests rather than adding a binding.)
- The directive treatment is heavy: every fence row carries a solid tinted band, so a nested
  split/panel block reads as zebra striping.

## Decisions (settled 2026-06-12)

- **The surface stays monospace, and the specific face is a frontend-design mission.** The feel
  comes from scale, measure, hierarchy, and color discipline; proportional writing faces (iA
  Writer Quattro, Duo) were considered and declined. Within the pass, the frontend-design loop
  evaluates candidate monospace faces for prose by rendering them in the showcase: criteria are
  OFL-licensed self-hostable variable woff2 (the Bricolage precedent), prose texture in long
  paragraphs (texture healing weighs here), a true italic for emphasis-in-place, a weight range
  that can carry the heading hierarchy, and rendering quality at ~16px. Candidates to evaluate
  include Monaspace, iA Writer Mono, Courier Prime, JetBrains Mono, Intel One Mono, and Atkinson
  Hyperlegible Mono; `ui-monospace` stays the fallback stack either way, and "no new font" is an
  acceptable verdict if nothing beats the system face on the showcase samples.
- **Scope is the quiet surface plus the two iA modes** (focus mode, typewriter scroll).
  Obsidian-style marker hiding and live widgets are out: heaviest, caret edge cases, and
  redundant with the iframe Preview tab, which is cairn's design-accurate view.
- **The pass ends with a `frontend-design` critique loop** over the showcase (the 0.40 Task 10
  precedent) before the review gate.

## The shape

**Table stakes (the defects).**

- Parse GFM: `markdown({ base: markdownLanguage })` from `@codemirror/lang-markdown`, so
  strikethrough, tables, task lists, and autolinks get real syntax nodes.
- Wire `markdownKeymap` ahead of the default keymap: Enter continues lists and quotes
  (`insertNewlineContinueMarkup`), Backspace deletes markup sensibly (`deleteMarkupBackward`).

**The quiet surface.**

- Scale and measure: the body stays mono but grows to ~16px with the existing generous leading,
  and the content column takes a centered max measure (~70ch) inside the editor card, so a wide
  window stops stretching paragraphs to the card edge.
- Heading hierarchy: per-level sizes through `tags.heading1`..`heading3` (deeper levels share the
  third step), bold, in the content color rather than primary. The `##` marker itself dims to
  muted.
- Marker discipline: header, emphasis, quote, list, and link markers plus the URL body all drop
  to muted; link text keeps one quiet accent; inline code trades its accent color for a subtle
  background chip in the content color; strikethrough renders struck.
- Color budget: content ink is base-content; one accent for links; the directive machinery is the
  only other tint on the page.

**The directive treatment (a focus arm; Geoff's call 2026-06-12).** The machinery is critical to
cairn (it is how a site's components reach the author) and it is the hardest UI problem on the
surface, so it gets its own design attention rather than riding the general restyle. The field
gives a grammar but no finished answer: Obsidian's callouts put block identity in a left rail
plus a labeled head, never in painted rows, and reveal machinery by cursor position; HackMD has
the literal `:::` syntax and does nothing with it in-editor. Direction, refined from that:

- Rails, not bands. Fence rows lose the full-width tinted band; the depth-stepped left rail
  (already shipped in 0.51) extends through the fence rows so a container reads as one bracketed
  region from opener to closer, without the zebra.
- Meaning over machinery on the fence line. In `::::split[Costs & volunteers]`, the name and
  label carry the accent ink; the colons and attribute braces dim to marker-muted, the same level
  as `##`. A bare closer is all machinery, so it sits fully muted at its rail.
- Cursor-aware emphasis, not hiding. The block the caret sits inside strengthens its rail and
  fence labels one step; the others sit quieter. No layout shift, no marker hiding, no caret
  jank; composes with focus mode. Tracked per update from the cached depth scan, so the cost
  model the 0.51 plugin set does not change.
- The hover hint stays, and the existing per-theme AA-checked variable scheme in
  `cairn-admin.css` keeps governing the tints; new depth/emphasis steps land in the same scheme.
- The frontend-design loop runs a dedicated critique iteration on directive-heavy content
  (Geoff's nested split/panel report is the fixture) in both themes, separate from the general
  surface critique.
- Later-pass pointer, out of scope here: in-place machinery affordances (change a block's type
  or label without editing syntax, the Obsidian right-click lesson). The Insert block dialog
  already covers creation.

**The iA modes.** Two persisted toggles in the toolbar's overflow menu, following the
editor-preferences idiom the page already uses (mode, device). Both default off, both
client-only with no form or SSR impact.

- Focus mode: the paragraph around the cursor (contiguous non-blank lines) keeps full ink;
  everything else dims via line decorations. Updates with the selection.
- Typewriter scroll: while typing, the cursor line holds vertical center
  (`scrollIntoView(..., { y: 'center' })` on doc changes).

**Out of scope.** Marker hiding and live widgets; any toolbar, header, or footer redesign; the
preview pane; the render pipeline; the title field.

## Testing

- Unit: list/quote continuation and markup-aware backspace through the keymap; a parse-level
  assertion that strikethrough/table nodes exist under the GFM base; the focus-mode
  paragraph-range helper as a pure function.
- Component (real browser, the existing MarkdownEditor/EditPage suites): heading size classes by
  level, marker-dimming styles, the focus-mode dim following the cursor, the typewriter and
  focus toggles persisting through the prefs idiom. For the directive arm: the fence name/label
  carries the accent class while the colon run carries the muted class, the rail classes span
  fence rows, and the caret block's emphasis step follows the cursor across nested containers
  (the split/panel fixture).
- Visual: the frontend-design critique loop on the showcase in both themes; the
  `daisyui-a11y-reviewer` checks the dimmed markers and dim-state text against AA (muted on
  base-100 already passes; the focus-dim opacity must keep the dimmed text readable as text).
- The golden-path E2E stays green untouched.

## Versioning

Additive for consumers (no adapter, action, or load change): a minor bump, `0.52.0`.
