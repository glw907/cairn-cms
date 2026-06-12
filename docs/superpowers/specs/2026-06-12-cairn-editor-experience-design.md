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
- Two outright defects. The editor parses commonmark only (`markdown()` defaults to
  `commonmarkLanguage`), so the toolbar's own strikethrough button inserts syntax the editor
  cannot parse, and tables and task lists get no styling either. And `markdownKeymap` is not
  wired, so Enter does not continue a list or quote and Backspace is not markup-aware.
- The directive treatment is heavy: every fence row carries a solid tinted band, so a nested
  split/panel block reads as zebra striping.

## Decisions (settled 2026-06-12)

- **The surface stays monospace.** The feel comes from scale, measure, hierarchy, and color
  discipline, not a new face. iA Writer Quattro and Duo were considered and declined.
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
- Directive machinery lightened: fence rows lose the full-width band in favor of the
  depth-stepped left rail plus tinted fence text, so nesting still reads without the zebra. The
  exact treatment lands through the frontend-design loop, holding the existing AA-checked
  variable scheme in `cairn-admin.css`.

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
  focus toggles persisting through the prefs idiom.
- Visual: the frontend-design critique loop on the showcase in both themes; the
  `daisyui-a11y-reviewer` checks the dimmed markers and dim-state text against AA (muted on
  base-100 already passes; the focus-dim opacity must keep the dimmed text readable as text).
- The golden-path E2E stays green untouched.

## Versioning

Additive for consumers (no adapter, action, or load change): a minor bump, `0.52.0`.
