# Editor accessibility hardening design

The second CodeMirror integration pass. It finishes the identity-through-facets accessibility discipline the
suggestion-popover pass established, extending it to the surfaces the popover pass left untouched. The pass
is deliberately narrow: no find/replace, no autocomplete restyle, no gate machinery. It closes the concrete
accessibility gaps in the markdown editor, all through CodeMirror's public extension points.

Provenance: brainstormed 2026-06-30 after the suggestion-popover pass merged to `main`. Prior-art review and
a full a11y-surface map preceded it (both captured in the pass's scratch notes and folded in below). Scope
was settled with Geoff: find/replace and the autocomplete tint were both deferred as separate future
decisions. Subordinate to the charter; keep the CodeMirror seam narrow per the `cairn-scope-opinionated-stack`
memory. Companion framing lives in `docs/internal/cm-editing-surface-alignment.md`.

## Goal and the three constraints

The goal is unchanged from the suggestion-popover pass, applied to a new surface: the editor should be a fully
accessible part of cairn, keep CodeMirror easy to upgrade, and never subvert CodeMirror's editing UX for
purity. Concretely, hold all three:

- **Full accessibility.** A non-sighted or keyboard-only author can discover, reach, and act on the editor's
  diagnostics and fold controls, on par with the suggestion popover the last pass built.
- **Easy to upgrade.** Every addition binds a public CodeMirror extension point (`forEachDiagnostic`, the
  keymap facet, `Decoration` attributes, a `ViewPlugin`), never an internal `.cm-*` chrome class. The pass
  adds zero new coupling to CodeMirror internals, so `check:cm-internals` stays at its current floor.
- **Do not subvert CodeMirror's UX.** Where CodeMirror already ships a proven accessibility model, inherit it
  rather than rebuild it. Link-completion is the case in point: CodeMirror carries a screen-reader-verified
  APG combobox, so the pass guards that inherited behavior with a test rather than re-implementing it.

## What is already accessible (the map's finding)

The editor is already strong, so this pass is surgical, not foundational. The suggestion popover is a complete
accessible surface: `role="group"`, an `aria-label` carrying the diagnostic message, `Alt-Enter` to move focus
in, a native Escape listener that returns focus to `.cm-content`, and a visually hidden `aria-live="polite"`
region that announces the flagged word and the key that opens the popover, all without stealing focus on caret
entry. Non-color cues are in place across the lint underline, the tidy-review decorations, and the media
markers (WCAG 1.4.1). Focus returns to the editor after every popover action. Link-completion rides
CodeMirror's stock completion UI, which carries CodeMirror 6's APG combobox ARIA for free. One editor-scoped
live region exists today (the popover's), so a new announcer must not duplicate it.

The pass does not touch any of that. It closes the gaps the map surfaced, plus one the map itself omitted:
the editing surface's own accessible name.

## Scope

**In scope**

1. A diagnostics-summary live region: a debounced, polite announcer that tells an author diagnostics exist
   without their having to caret onto a flagged word.
2. Keyboard traversal between diagnostics, so a keyboard or screen-reader author can jump to the next or
   previous flagged range and act on it through the existing popover.
3. Fold-control disclosure semantics: proper `aria-expanded` and a naming `aria-label` on the directive-fold
   control.
4. An autocomplete ARIA regression guard: a test that locks in CodeMirror's inherited combobox semantics so a
   future custom render cannot silently break them.
5. A WCAG 1.4.13 and focus-discipline audit of the suggestion popover, converting its load-bearing
   expectations into assertions (the watch-becomes-failing-test standard).
6. An accessible name on the editor's own text surface. The live `.cm-content` (a `role="textbox"`) carries
   no accessible name today, a WCAG 4.1.2 (Level A) gap the map missed. One line via
   `EditorView.contentAttributes` closes it.

**Out of scope (deferred, with reasons)**

- **Find/replace.** A recipe-built `@codemirror/search` `createPanel` is a clean, well-precedented seam, but
  it is a new capability, not accessibility hardening. cairn edits short Posts and Pages and the browser's own
  Ctrl+F already finds visible text. Filed in `ROADMAP.md` under `## Considering`; scope it on its own merit
  if wanted.
- **Autocomplete restyle / Warm Stone tint.** CodeMirror exposes no public seam to replace the completion
  popup container; a tint would restyle a rarely-seen surface for low value. Left stock. Filed under
  `## Considering`.
- **Inline `aria-invalid` / `aria-describedby` on the underline spans.** A deliberate tradeoff, see below.
- **`check:cm-internals` gate machinery.** No new `.cm-*` chrome, so nothing to gate. See below.

## Two deliberate tradeoffs

**Announce-plus-traverse over inline ARIA on the flagged text.** The ROADMAP named "the lint underline is a
bare `text-decoration` with no `aria-invalid` or described-by." The pass does not add inline ARIA to the
`Decoration.mark` spans. Screen-reader support for ARIA attributes on inline marks inside a `contenteditable`
is inconsistent across AT, and shipping it invites false confidence that a flagged word is announced when it
often is not. The robust path, and the one CodeMirror's own patterns favor, is to make diagnostics
*discoverable* (the summary announcer) and *reachable* (keyboard traversal), then let the already-accessible
popover do the per-word exposure. This is recorded as a chosen tradeoff, not an oversight.

**The `check:cm-internals` gate is left untouched.** The prior-art review clarified that overriding a
documented `.cm-*` class from inside `EditorView.theme`/`baseTheme` is sanctioned CodeMirror usage, not an
internals violation, and that the gate's existing allowlist is already the sanctioned mechanism to admit such
a class. This pass adds no new `.cm-*` chrome: the summary announcer is cairn's own DOM, and the fold ARIA
lands on the already-`cm-cairn-`-prefixed fold button. So there is nothing new to allowlist and no machinery
to build. The theme-scope-is-sanctioned clarification is recorded in
`docs/internal/cm-editing-surface-alignment.md` for the future autocomplete or search pass that will actually
need it. Building gate machinery now, with no consumer, is the speculative complexity the pass's own ethos
rejects.

## Design

### 1. Diagnostics-summary announcer

A new editor extension, `editor-diagnostics-announcer.ts`, that owns a single visually hidden
`aria-live="polite"` region and updates it with a settled summary of the current diagnostic set.

- **Reads diagnostics through the public API.** The extension is a `ViewPlugin` that, on an update whose
  transactions carry diagnostic changes (the lint `setDiagnostics` effect, the same signal the popover field
  watches), counts the current diagnostics via the public `forEachDiagnostic(view.state, ...)`, grouped by
  source (`cairn-spellcheck` versus `cairn-objective`).
- **Debounced and deduped.** It announces only after a short quiet period (a dedicated debounce on the order
  of a second, so it never chatters per keystroke) and only when the composed summary string actually changed
  since the last announcement. Typing that leaves the summary unchanged says nothing.
- **The summary copy** is a plain, countable sentence: for example "3 spelling suggestions, 1 style issue" or
  "1 spelling suggestion" or, when a set that had issues clears, "No issues." The exact copy is editor-facing
  and follows the admin voice; wording is finalized during implementation and reviewed against the prose gate.
  Backtick handling mirrors the popover's known friction (literal backticks in messages), so the summary
  counts, it does not read message bodies.
- **A separate region from the popover's.** The popover's `.cairn-cm-suggest-live` region announces the
  specific word; this announcer's region (a distinct `cm-cairn-`-prefixed, visually hidden element) announces
  the document-level count. They carry different content, not a duplicate. On the caret-move and
  `F8`-traversal path they are cleanly separate: a pure selection change carries no `setDiagnostics` effect,
  so the summary never fires there, and that is the load-bearing guarantee. On the type-a-word-then-pause path
  they share one settle: the `setDiagnostics` effect that lands a fresh diagnostic under the resting caret
  fires the popover region immediately (the word) and the summary region on its ~1s debounce (the count), so
  the author hears the word, then the count, sequentially and as complementary information. Both are
  `aria-live="polite"`, so they queue rather than clobber; the design adds no cross-region coordination, which
  would be over-engineering for two polite, different-content regions.
- **Lifecycle.** The region mounts once at plugin construction and is removed on destroy, matching the
  popover's pattern. No focus is taken; the region is `aria-live="polite"`, `aria-atomic="true"`, and
  visually hidden by the existing sr-only technique.

### 2. Diagnostic traversal

`F8` and `Shift-F8` move between diagnostics, bound through the editor's keymap facet. Verified
against the installed `@codemirror/lint` 6.9.7: it exports `nextDiagnostic` and `previousDiagnostic` as
standalone `Command`s, and `forEachDiagnostic(state, (d, from, to) => …)` for a hand-rolled alternative.

- **Bind the exported commands directly, not `lintKeymap`.** `lintKeymap` binds `F8` to `nextDiagnostic` but
  also binds `Mod-Shift-m` to `openLintPanel`, which summons the stock, unaligned `.cm-panel-lint` the
  suggestion-popover pass spent its effort avoiding. So the pass binds the two individual commands
  (`nextDiagnostic`, `previousDiagnostic`) to `F8`/`Shift-F8` and never installs `lintKeymap` or the panel.
  This reuses CodeMirror's tested traversal (including its wrap behavior) rather than re-implementing it.
- **Verify the commands compose, fall back only if they do not.** Two behaviors of the stock commands are
  checked test-first. First, `nextDiagnostic` calls `activateHover`, which tries to surface the diagnostic's
  tooltip; cairn suppresses the built-in lint tooltip through `tooltipFilter` (returns `null`), and the
  popover shows on caret-in-range, so the stock command should trigger cairn's popover, not the stock tooltip.
  Second, `nextDiagnostic` / `previousDiagnostic` dispatch a *selection* spanning the range (`anchor` at the
  start, `head` at the end), not a collapsed caret; because `head` equals the range end the caret-in-range
  check still matches and the popover composes, but the flagged word ends up selected. The exported commands
  are the default. The pass falls back to a cairn-owned `forEachDiagnostic` pair (same keys, full control of
  wrap and a collapsed landed caret) only if the stock tooltip is not suppressed or the select-the-word
  behavior proves unwanted in the composition test.
- **Behavior.** `F8` selects the next diagnostic range after the caret and wraps at the end; `Shift-F8`
  selects the previous and wraps backward. Landing inside a range triggers the existing popover:
  `F8` to reach a flagged word, hear it announced, `Alt-Enter` to open the suggestions. With no diagnostics
  present the commands are a no-op, and the announcer's "No issues" summary already conveys the state.
- **Discoverability.** `F8` / `Shift-F8` join the `Ctrl+/` shortcuts sheet so a sighted keyboard user finds
  them. `F8` is CodeMirror's own lint-traversal convention and does not collide with any current cairn
  binding (verified against the keymap map: `completionKeymap`, `defaultKeymap`, `historyKeymap`, the custom
  fold keymap on `Mod-Shift-[`/`]`, and the popover's `Alt-Enter`).

### 3. Fold-control disclosure semantics

The directive-fold control in `editor-folding.ts` is a disclosure widget with no `aria-expanded`. Both fold
controls already carry an `aria-label` (the gutter button says "Fold this section" / "Unfold this section";
the folded-row pill says "Show N hidden lines"), so the label is not missing. The gaps are `aria-expanded` and
a state-neutral name. Give the control the standard disclosure contract:

- `aria-expanded` reflects state: `true` when the block is expanded (content visible), `false` when folded
  (content hidden), on both visual forms of the control (the gutter chevron and the folded-row pill) for the
  same block. It is feasible in `FoldMarker.toDOM` via `setAttribute` keyed on the marker's `folded` flag,
  which `eq` already rebuilds on a fold-state flip. When folded, both the chevron and the pill read
  `aria-expanded="false"` for the block; that redundancy is intended and coherent.
- The `aria-label` becomes state-neutral and names the block. Replace the state-verb label ("Fold this
  section" / "Unfold this section", "Show N hidden lines") with a name for the block itself (for example the
  directive name), so `aria-expanded` is the sole state signal rather than double-signalling against a verb
  label. Implementation note: the marker carries only line numbers (`FoldMarker.container` is a
  `ContainerRange` of `{ fromLine, toLine, depth }`), so `toDOM` must read the opener line's text from
  `view.state` to derive the name, and the pill's `placeholderDOM(view, onclick, lines)` has no
  `ContainerRange` at all and needs that plumbing added to name its block.
- No `.cm-*` chrome class is added; the attributes land on the existing `cm-cairn-fold-btn` DOM via
  `setAttribute`, so `check:cm-internals` is unaffected.

### 4. Autocomplete ARIA regression guard

Link-completion uses CodeMirror's stock completion UI, so it inherits CodeMirror 6's APG combobox ARIA. The
pass adds no rendering; it adds a component test that opens the `[[` completion popup and asserts the inherited
chain is intact: `aria-autocomplete` / `aria-controls` on `.cm-content`, `role="listbox"` with an
`aria-label` on the completion list, `role="option"` per item, and `aria-selected` on the active option. The
guard means a future pass that reaches for `addToOptions.render` or `optionClass` cannot silently strip the
semantics CodeMirror provides today.

### 5. WCAG 1.4.13 and focus-discipline assertions

Audit the suggestion popover against WCAG 2.1 SC 1.4.13 (Content on Hover or Focus) and the editor's focus
discipline, and lock the load-bearing expectations as tests so they cannot regress:

- **Dismissable.** Escape dismisses the popover and returns focus to `.cm-content` (extend the existing
  assertion to frame it as 1.4.13 Dismissable).
- **Persistent.** The popover stays while the caret remains in the diagnostic range and is not torn down by an
  unrelated background lint effect (the memoized-`Tooltip` stability the last pass fixed; assert it holds).
- **No focus theft.** The popover does not grab focus on caret entry (assert focus stays on `.cm-content`
  until `Alt-Enter`).
- **Overlapping diagnostics.** Add the missing case the map flagged: when two diagnostics overlap a caret
  position, assert that the popover and the announcer resolve to the *same* diagnostic and that exactly one
  announcement fires. Derive the expected winner from what `diagnosticAtCaret` / `forEachDiagnostic` actually
  yields over the fixture, not from an "innermost" model: `forEachDiagnostic` documents no ordering contract,
  so the test asserts agreement and a single announcement, never a hardcoded emission order that a CodeMirror
  upgrade could shift.

### 6. An accessible name on the editing surface

The live `.cm-content` node is a `role="textbox"` with no accessible name: the only `aria-label` in
`MarkdownEditor.svelte` sits on the SSR-fallback `<textarea>`, which is removed on hydration, and
`EditPage.svelte`'s `aria-label="Editor"` labels the wrapping `role="group"` card, not the inner textbox. A
screen reader lands in an unnamed multiline text box (WCAG 4.1.2 Name, Role, Value, Level A). Close it by
adding `EditorView.contentAttributes.of({ 'aria-label': 'Markdown source' })` to `MarkdownEditor`'s extensions
array, reusing the exact string the SSR-fallback textarea already carries so the SSR-to-hydrated swap stays
consistent. `contentAttributes` is a public facet, so this adds no CodeMirror-internal coupling and does not
move the `check:cm-internals` floor. A component test asserts `.cm-content` exposes the name.

## Architecture and isolation

Each unit is small, single-purpose, and public-API-bound:

- `editor-diagnostics-announcer.ts` (new): a `ViewPlugin` plus one owned live region. Input: the editor's
  diagnostic set via `forEachDiagnostic`. Output: a polite announcement. Depends only on `@codemirror/view`,
  `@codemirror/lint`'s public `forEachDiagnostic`, and cairn's sr-only styling. Testable headless (drive
  `setDiagnostics`, read the region's text).
- The traversal keymap: a small addition beside the announcer that binds the exported `nextDiagnostic` /
  `previousDiagnostic` to `F8` / `Shift-F8`. Only if the test-first composition check fails does the pass add
  a cairn-owned `forEachDiagnostic` pair (in an `editor-diagnostic-traversal.ts`); that module is the
  documented contingency, not the default artifact.
- `editor-folding.ts` (edit): add `aria-expanded` and the state-neutral name to the existing fold controls;
  no structural change.
- `MarkdownEditor.svelte` (edit): add the `contentAttributes` accessible name (section 6).
- Wiring: the announcer extension and the traversal keymap are added at the top level of
  `MarkdownEditor.svelte`'s extensions array, on by default with no new prop. They are a *general*
  diagnostics-a11y surface keyed off `forEachDiagnostic` (any lint source), which is why they sit at the top
  level rather than inside the spellcheck bundle. The spellcheck-specific suggestion popover, by contrast,
  lives inside `cairnSpellcheck`'s returned array within `spellcheckCompartment`, so it is gated by the
  spellcheck toggle. With spellcheck off there are no diagnostics, so the always-mounted announcer is silent
  and the traversal keys are a harmless no-op: inert by design, not incoherent. Top-level placement also
  avoids re-announcing the count each time the spellcheck compartment reconstructs.

The `@codemirror/state` singleton hazard the prior art flagged is handled by cairn bundling a single instance
of both packages. One `@codemirror/state` keeps the extension-install `instanceof` checks intact so `linter()`
installs `lintState`; one `@codemirror/lint` keeps that `lintState` identity shared between the `linter()`
that installed it and the `forEachDiagnostic` that reads it. A duplicate copy of either would break the
install, not merely the read.

## Testing

The suite is the acceptance contract, test-first per task. The layers:

- **Component (real browser, vitest-browser-svelte):** the announcer's region text after a debounced settle;
  the summary changing and clearing; `.cm-content` exposing the `Markdown source` accessible name;
  `F8`/`Shift-F8` selecting the expected diagnostic range (assert the landed selection, since the stock
  commands select rather than collapse) and opening the popover on arrival; the fold control's `aria-expanded`
  and state-neutral `aria-label` across fold and unfold; the autocomplete ARIA chain on the open `[[` popup;
  the settle-under-resting-caret case (the popover word, then the debounced count, sequential, one each); the
  1.4.13 assertions (Escape dismiss + focus return, no focus theft, persistence under a background lint
  effect, overlapping-diagnostic agreement with a single announcement).
- **Unit (node):** the two traversal commands over a fixture diagnostic set (next, previous, wrap, empty); the
  announcer's debounce/dedupe logic (same summary says nothing, changed summary announces once); extend
  `codemirror-public-api.test.ts` to assert `forEachDiagnostic` and any newly relied-on public export stay on
  the surface.
- **Gates:** `npm run check` 0/0, `npm test` exit 0, `npm run check:comments`, `npm run check:cm-internals`
  (expected PASS unchanged, the floor is not moved), `check:custom-surface`, `check:docs`, and the four doc
  gates. The showcase e2e / from-scratch consumer build proves the packaged behavior before the pass is called
  releasable.

Fixtures reuse the shipped `fake-spell-worker.ts` seam and the non-adjacent-occurrence discipline the last
pass learned (`'teh teh'` is a doubled word that adds a third underline); the spellcheck e2e is the repo's
flakiest surface, so assert computed structure and tokens over pixels and settle-aware, not single-count,
waits.

## Public API, consumers, and docs

- **Consumer impact: none.** Every change is additive and internal to the editor. A site embedding
  `MarkdownEditor` gets the announcer, the traversal keys, and the fold semantics automatically, with no new
  config and no new required prop. The `CHANGELOG.md` entry is a non-breaking, no-consumer-action note under
  `## Unreleased`; the pass holds unpublished and batches per the release policy.
- **New exports: expected none.** The extensions are wired inside `MarkdownEditor`, not exported. If
  implementation surfaces a genuinely reusable export, it gets a reference page and the `check:reference`
  coverage, but the default is internal.
- **Docs to update in-pass:** the `write-in-the-editor` guide (jump-between-issues keys and the announcer);
  the `Ctrl+/` shortcuts sheet content (`F8`/`Shift-F8`); `docs/internal/admin-design-system.md` if the
  announcer introduces a documented live-region recipe; `docs/internal/cm-editing-surface-alignment.md` (mark
  the a11y-hardening item progressed and record the theme-scope-sanctioned clarification);
  the friction log for anything the writing surfaces; and `ROADMAP.md` (mark "Editor accessibility hardening"
  done or advanced, and prune).

## Decisions locked

- Announce-plus-traverse is the diagnostic-exposure model; no inline `aria-invalid`/`aria-describedby` on the
  underline spans.
- Traversal binds CodeMirror's exported `nextDiagnostic` / `previousDiagnostic` to `F8` / `Shift-F8` by
  default; `lintKeymap` and its `openLintPanel` are never wired. A cairn-owned `forEachDiagnostic` pair is the
  test-first contingency, used only if the stock commands fight the popover or their select-the-range behavior
  proves unwanted.
- The announcer and traversal are general, keyed off `forEachDiagnostic`, and wired at the top level of
  `MarkdownEditor`; the spellcheck-specific popover stays inside the spellcheck compartment.
- The editor's `.cm-content` gets an accessible name via `contentAttributes` (WCAG 4.1.2), an in-scope item
  added after the adversarial review.
- The diagnostics-summary region is separate from the popover's per-caret region, polite, debounced, and
  deduped; no cross-region coordination is added.
- `check:cm-internals` is not modified; the floor stays at `.cm-tooltip`; the theme-scope clarification is
  documented, not coded.
- Find/replace and the autocomplete tint stay deferred in `ROADMAP.md`.

## Open questions for implementation

- The exact debounce interval and the exact summary copy (countable, admin-voice) are settled during
  implementation against the prose gate and a quick read of how the announcement feels in the browser test.
- Whether the stock select-the-range traversal is kept or the collapsed-caret `forEachDiagnostic` contingency
  is taken is decided by the test-first composition check, not pre-committed here.
