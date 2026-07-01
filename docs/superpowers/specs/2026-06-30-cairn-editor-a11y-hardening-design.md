# Editor accessibility hardening design

The second CodeMirror integration pass. It finishes the identity-through-facets accessibility discipline the
suggestion-popover pass established, extending it to the surfaces the popover pass left untouched. The pass
is deliberately narrow: no find/replace, no autocomplete restyle, no gate machinery. It closes four concrete
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

The pass does not touch any of that. It closes the four gaps the map surfaced.

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
  specific word on caret entry; this announcer's region (a distinct `cm-cairn-`-prefixed, visually hidden
  element) announces the document-level count on settle. The two speak different things at different moments
  (settle-after-typing versus caret-move), so they do not race in practice; the debounce keeps the summary off
  the caret-move path.
- **Lifecycle.** The region mounts once at plugin construction and is removed on destroy, matching the
  popover's pattern. No focus is taken; the region is `aria-live="polite"`, `aria-atomic="true"`, and
  visually hidden by the existing sr-only technique.

### 2. Diagnostic traversal

`F8` and `Shift-F8` move the caret between diagnostics, bound through the editor's keymap facet. Verified
against the installed `@codemirror/lint` 6.9.7: it exports `nextDiagnostic` and `previousDiagnostic` as
standalone `Command`s, and `forEachDiagnostic(state, (d, from, to) => …)` for a hand-rolled alternative.

- **Bind the exported commands directly, not `lintKeymap`.** `lintKeymap` binds `F8` to `nextDiagnostic` but
  also binds `Mod-Shift-m` to `openLintPanel`, which summons the stock, unaligned `.cm-panel-lint` the
  suggestion-popover pass spent its effort avoiding. So the pass binds the two individual commands
  (`nextDiagnostic`, `previousDiagnostic`) to `F8`/`Shift-F8` and never installs `lintKeymap` or the panel.
  This reuses CodeMirror's tested traversal (including its wrap behavior) rather than re-implementing it.
- **Verify the commands compose, fall back only if they do not.** `nextDiagnostic` also tries to surface the
  diagnostic's tooltip. cairn suppresses the built-in lint tooltip through `tooltipFilter` (returns `null`),
  and the popover shows on caret-in-range, so landing a caret via `nextDiagnostic` should trigger cairn's
  popover and its per-word announcement, not the stock tooltip. The implementer confirms this composes
  test-first; only if the stock commands force the built-in tooltip or otherwise fight the popover does the
  pass fall back to two cairn-owned commands built on `forEachDiagnostic` (same keys, same behavior, full
  control of wrap and the landed state). The exported commands are the default; the hand-rolled pair is the
  contingency.
- **Behavior.** `F8` moves the caret to the next diagnostic range after the caret and wraps at the end;
  `Shift-F8` moves to the previous and wraps backward. Landing inside a range triggers the existing popover:
  `F8` to reach a flagged word, hear it announced, `Alt-Enter` to open the suggestions. With no diagnostics
  present the commands are a no-op, and the announcer's "No issues" summary already conveys the state.
- **Discoverability.** `F8` / `Shift-F8` join the `Ctrl+/` shortcuts sheet so a sighted keyboard user finds
  them. `F8` is CodeMirror's own lint-traversal convention and does not collide with any current cairn
  binding (verified against the keymap map: `completionKeymap`, `defaultKeymap`, `historyKeymap`, the custom
  fold keymap on `Mod-Shift-[`/`]`, and the popover's `Alt-Enter`).

### 3. Fold-control disclosure semantics

The directive-fold control in `editor-folding.ts` is a disclosure widget with no `aria-expanded`. Give it the
standard disclosure contract:

- `aria-expanded` reflects state: `true` when the block is expanded (content visible), `false` when folded
  (content hidden). Both visual forms of the control, the gutter chevron and the folded-row "Show N hidden
  lines" pill, carry consistent disclosure semantics for the same block.
- `aria-label` names the target so the control is not an unlabeled button: it identifies the directive block
  it folds (for example the directive name), rather than a bare glyph.
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
  position, assert the popover and the announcer behave deterministically (the caret's innermost or
  first-published diagnostic wins, matching the popover field's current mapping), with a single announcement,
  not two racing ones.

## Architecture and isolation

Each unit is small, single-purpose, and public-API-bound:

- `editor-diagnostics-announcer.ts` (new): a `ViewPlugin` plus one owned live region. Input: the editor's
  diagnostic set via `forEachDiagnostic`. Output: a polite announcement. Depends only on `@codemirror/view`,
  `@codemirror/lint`'s public `forEachDiagnostic`, and cairn's sr-only styling. Testable headless (drive
  `setDiagnostics`, read the region's text).
- `editor-diagnostic-traversal.ts` (new, or a small addition beside the announcer): two `Command`s plus the
  keymap binding. Input: state and selection. Output: a selection move. Depends only on
  `@codemirror/state`/`view` and `forEachDiagnostic`. Testable at the command level (assert the caret lands on
  the expected range, including wrap).
- `editor-folding.ts` (edit): add the two ARIA attributes to the existing fold button; no structural change.
- Wiring: `MarkdownEditor.svelte` adds the announcer extension and the traversal keymap to its extensions
  array, beside the existing popover and spellcheck extensions. The behaviors are on by default and carry no
  new prop; accessibility is not opt-in.

The `@codemirror/state` singleton hazard the prior art flagged does not apply: cairn ships a single bundled
CodeMirror instance, so `forEachDiagnostic`'s `instanceof` checks see one `@codemirror/state`.

## Testing

The suite is the acceptance contract, test-first per task. The layers:

- **Component (real browser, vitest-browser-svelte):** the announcer's region text after a debounced settle;
  the summary changing and clearing; `F8`/`Shift-F8` landing the caret on the expected diagnostic and opening
  the popover on arrival; the fold control's `aria-expanded`/`aria-label` across fold and unfold; the
  autocomplete ARIA chain on the open `[[` popup; the 1.4.13 assertions (Escape dismiss + focus return, no
  focus theft, persistence under a background lint effect, overlapping-diagnostic determinism).
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
- Traversal is two cairn-owned commands on `forEachDiagnostic`, bound to `F8`/`Shift-F8`; `lintKeymap` and its
  `openLintPanel` are never wired.
- The diagnostics-summary region is separate from the popover's per-caret region, polite, debounced, and
  deduped.
- `check:cm-internals` is not modified; the floor stays at `.cm-tooltip`; the theme-scope clarification is
  documented, not coded.
- Find/replace and the autocomplete tint stay deferred in `ROADMAP.md`.

## Open questions for implementation

- The exact debounce interval and the exact summary copy (countable, admin-voice) are settled during
  implementation against the prose gate and a quick read of how the announcement feels in the browser test.
- Whether the two traversal commands live in the announcer module or a sibling file is an implementation
  organization call; both are single-purpose and public-API-bound.
