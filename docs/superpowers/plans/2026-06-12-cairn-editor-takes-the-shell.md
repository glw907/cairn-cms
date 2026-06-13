# The editor takes the shell: one band, receding chrome, folding (0.54.0)

> **For agentic workers:** execute task-by-task with `cairn-implementer` (the repo default);
> the main loop reviews each diff and verifies the full gate between dispatches. Task 3 is the
> one model upshift (`model: opus`). Steps use checkbox syntax for tracking.

**Goal:** give an open document the shell, per the approved spec
(`docs/superpowers/specs/2026-06-12-cairn-editor-takes-the-shell-design.md`): the four shell
rungs (one header band, receding nav, details slide-over, zen), the editor ergonomics set
(8px rail pitch with strength-only active, hanging indents, the completed keyboard system with
the Ctrl+/ sheet, adjudicated container folding), and the gold-standard sweep across the entire
admin. The approved mockup (`docs/internal/design/2026-06-12-editor-shell-gold-standard.html`)
is the visual standard; the folding fine grain is in
`docs/internal/design/2026-06-12-folding-interaction-notes.md`.

**Architecture:** presentation only. The same one form, the same actions, the same loads;
`CairnAdmin`'s view switching is untouched and consumer sites see only the new layout. The
shell work lives in `AdminLayout.svelte` and `EditPage.svelte` joined by a new topbar context
portal; the editor work lives behind the `MarkdownEditor` seam (`editor-highlight.ts`,
`markdown-directives.ts`, a new `editor-folding.ts`). Additive, minor bump `0.54.0`.

**Tech stack:** Svelte 5 runes, CodeMirror 6 (`Decoration`/`ViewPlugin`, `@codemirror/language`
folding), DaisyUI v5 + scoped Tailwind, the unit + component (real browser) + showcase E2E
projects.

## Plan-time decisions (settled here so no task re-derives them)

The spec left four mechanics to plan time. The calls, with reasons:

1. **Topbar seam: a context portal.** `AdminLayout` owns a `$state` holder
   (`{ desk: Snippet | null }`) provided via `setContext`; `EditPage`, a descendant through the
   children snippet, registers its desk-controls snippet in an `$effect` and clears it on
   teardown. Unmount on view switch clears the band automatically, so it survives `CairnAdmin`'s
   switching with no route plumbing. The alternative (the layout reads typed page data) loses:
   the band renders live editor state (`dirty`, `busy`, `saving`, `status`) that only EditPage
   owns.
2. **Promoted strip set: inline code, strikethrough, table**, in that order after Quote, with
   the More overflow keeping code block, divider, and task list. The mockup demonstrates the
   single-row fit at the 49rem prose cap; Task 5 asserts it in both postures and demotes table
   first if a real browser disagrees.
3. **Bindings** (mockup screen 5, one change): Save `Ctrl+S` (existing), Publish
   `Ctrl+Shift+S`, Details panel `Ctrl+.`, Zen `Ctrl+Shift+.`, Focus mode `Ctrl+Shift+F`,
   Write/Preview `Ctrl+Alt+P`, shortcuts sheet `Ctrl+/`, fold/unfold `Ctrl+Shift+[` /
   `Ctrl+Shift+]`, inline code `Ctrl+E`, quote `Ctrl+Shift+9`, bulleted list `Ctrl+Shift+8`,
   numbered list `Ctrl+Shift+7`, headings `Ctrl+Alt+2` / `Ctrl+Alt+3` (the Google Docs idiom).
   The one divergence from the mockup: Write/Preview moves off `Ctrl+Shift+P` because Firefox
   reserves it for private browsing at the browser level, where `preventDefault` cannot reach.
   `Ctrl+Alt+2/3` can collide with AltGr layouts; acceptable for v1 since typing markdown always
   works. Mod = `metaKey` on mac everywhere, matching the existing handlers.
4. **Folding architecture:** `@codemirror/language`'s `codeFolding({ placeholderDOM })` plus
   `foldEffect`/`unfoldEffect`, never a custom fold store. Ranges come only from a new pure
   `containerRanges(scan)` pairing helper beside `fenceScan`. The safety invariant lives in one
   `EditorState.transactionExtender` that appends unfold effects when a change or selection
   touches a folded range. Chevrons are widget decorations from the directive ViewPlugin layer,
   not `foldGutter` (the rails are box-shadows, there is no CM gutter element).

**Facts the implementer should not re-derive** (verified 2026-06-12 against the working tree):

- The rail geometry lives in `rails()` at `src/lib/components/MarkdownEditor.svelte:102-115`
  (current pitch 6px: `edge = 6 * d - 4`), the gutter at line 166 (`paddingLeft: '1.5rem'`),
  the caret-active +1px step at lines 107-112. Alpha variables sit in `cairn-admin.css:40-73`
  (light) and `:144-172` (dark); comments there describe the 2px-bar contrast margins.
- `fenceScan` (`markdown-directives.ts:46-82`) returns per-line `depths` and `roles` arrays,
  no paired ranges; `caretContainerRange` (`:106-125`) pairs on demand for the caret only. The
  scan is cached in the ViewPlugin (`editor-highlight.ts:125-144`) and recomputed on
  `docChanged`; it is sub-millisecond, so a second consumer may rerun it.
- The editor card's format shortcuts are a card-scoped programmatic keydown listener
  (`EditPage.svelte:414-434`); window-scoped `Ctrl+S` lives at `:143-155` and gates on open
  dialogs via `document.activeElement?.closest('dialog')`-style checks. `Ctrl+K` in the card
  preventDefaults ahead of AdminLayout's window palette listener; the coexistence works today,
  keep the pattern.
- `markdown-format.ts` already has every needed command (`FormatKind` at `:13-27` includes
  `code`, `quote`, `ul`, `ol`, `h2`, `h3`); the keymap work is wiring, not new commands.
- The sticky edit header is `EditPage.svelte:511-596`; the sr-only default Save submitter that
  keeps Enter-submits-Save is `:490-505` (a 0.40.0 review Critical; preserve the guarantee, not
  the markup). The details aside is `:879-974`, hidden-never-unmounted (uncontrolled fields).
  The capture-phase invalid handler is `:113-117`; dirty tracking `onFormInput` is `:95-103`.
- `AdminLayout.svelte`: topbar at `:250-296` (`h-16 min-h-16`), drawer shell at `:242`
  (`lg:drawer-open` is a static class; the checkbox only governs the mobile overlay), crumbs
  derivation at `:216-224` (`crumbs.length > 1` ⇔ an edit route, derived from SSR'd
  `data.pathname`), `Cmd/Ctrl+B` drawer toggle at `:109-113`, `Cmd/Ctrl+K` palette at
  `:114-117`. Children render as a snippet at `:298-300` inside `<main class="flex-1 p-4
  lg:px-10 lg:py-8">`.
- `cairn-admin.css:301-307` pins `scroll-margin-top: 8.5rem` to the current two-band sticky
  stack (WCAG 2.4.11); the merge shrinks the stack to the 4rem topbar.
- Editor preferences persist as localStorage keys (`cairn-editor-focus-mode`,
  `cairn-editor-typewriter`, `cairn-editor-surface`) read in one run-once `$effect`
  (`EditPage.svelte:188-212`). Zen joins this family as `cairn-editor-zen`.
- Form association is by the `form="cairn-edit-form"` attribute and survives any DOM position;
  but the form's implicit-submission default is the **first associated submit button in tree
  order**, and the topbar precedes the form. The sr-only default Save submitter must therefore
  render first inside the topbar desk cluster, ahead of Publish.
- `src/tests/unit/editor-boundary.test.ts` whitelists which modules may statically import
  `@codemirror/*`; a new `editor-folding.ts` must be added to the whitelist.
- The component project runs in a real headless Chromium (`vitest.config.ts:35-58`); follow
  `MarkdownEditor.test.ts`'s computed-style and helper patterns. The showcase resolves the
  package through `dist`, so every visual iteration needs `npm run package` plus a preview
  restart first.
- The mockup is served per `docs/internal/design/README.md` (copy `dist/components/cairn-admin.css`
  and the fonts beside it, port 4180).

Every task ends on the full gate: targeted test file green, `npm run check` 0 errors 0
warnings, `npm test` exit 0. Commit per task, specific files, repo conventions.

---

### Task 1: rail geometry (8px pitch, strength-only active) and the H4 step

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (`rails()`, the gutter padding, geometry comments)
- Modify: `src/lib/components/editor-highlight.ts` (`cairnHighlightStyle` heading sizes)
- Modify: `src/lib/components/cairn-admin.css` (comments only: the contrast notes that mention the 1px-wider active bar)
- Test: `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Update the failing tests first.** The existing rail assertions encode the 6px pitch and
  the +1px active step; rewrite them to the new geometry and add the spec's equal-width
  assertion:

```ts
// bars at 0-2, 8-10, 16-18 (8px pitch, 6px gaps): depth-2 quiet line shows
// inset 2px ... , inset 8px ... base-100, inset 10px ... accent
test('nested rails sit on the 8px pitch', async () => { /* computed box-shadow insets 2/8/10 */ });

// the caret-active emphasis is strength only: same widths, different alpha
test('active and quiet rail segments have equal bar widths', async () => {
  // two sibling depth-2 containers, caret in the first; both lines' box-shadows
  // carry the same inset offsets (10px), only the color-mix percentage differs
});

test('the gutter clears the depth-3 bar', async () => { /* paddingLeft 1.75rem = 28px */ });
```

- [ ] **Run them; expect the geometry assertions to fail.**
- [ ] **Implement:** in `rails()`, `const edge = 8 * d - 6;` (bar right edges at 2, 10, 18,
  bars at 0-2, 8-10, 16-18). Keep the existing two-layer idiom (a base-100 spacer covering
  `0..edge-2`, then the bar to `edge`); only the pitch constant changes. Drop the `edge + 1`
  branch entirely; the active layer differs only in `railColor('active', '100%')`. Set the
  gutter `paddingLeft` to `'1.75rem'` and rewrite the geometry comments (lines 87-96, 163-165)
  to the new numbers. In `cairn-admin.css`, fix the two comment blocks that say the active bar
  is also 1px wider.
- [ ] **The H4 step:** in `cairnHighlightStyle`, give `tags.heading4` a real size step of
  `1.05em` (between H3 and body) so a hand-typed `####` reads as a heading. Add one computed-style
  test (`#### D` sized above body, below `### C`).
- [ ] **Run the suite file, then the full gate.**
- [ ] **Commit:** `Widen the rail pitch to 8px and make the caret emphasis strength-only`

### Task 2: hanging indents for wrapped quote and list lines

**Files:**
- Modify: `src/lib/components/markdown-directives.ts` (new pure helper)
- Modify: `src/lib/components/editor-highlight.ts` (the decoration pass)
- Test: `src/tests/unit/markdown-directives.test.ts`, `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Write the failing unit tests** for a new pure helper that measures the marker prefix of
  a line, returning the prefix string or null:

```ts
// markerPrefix('> quoted text')   === '> '
// markerPrefix('- item')          === '- '
// markerPrefix('12. item')        === '12. '
// markerPrefix('- [ ] task')      === '- [ ] '
// markerPrefix('plain text')      === null
// markerPrefix('  - nested item') === '  - ' (leading indentation counts toward the hang)
```

- [ ] **Implement `markerPrefix(line: string): string | null`** in `markdown-directives.ts`
  beside the other pure scanners. Ordered-list markers measure wider than 2ch, so compute the
  prefix length from the match, never assume it.
- [ ] **Write the failing component test:** a quote line and an ordered-list line carry a line
  decoration whose computed `padding-left` and `text-indent` offset each other by the prefix
  width (the surface is iA Writer Mono, fixed pitch, so prefix chars × 1ch is exact; assert the
  two computed values are equal in magnitude and opposite in sign).
- [ ] **Implement in the decoration pass** (`buildDirectiveDecorations`): for each visible line
  with a non-null `markerPrefix`, add a `Decoration.line` with
  `attributes: { style: \`padding-left:${n}ch;text-indent:-${n}ch\` }`, the Obsidian/HyperMD
  wrap idiom. Plain quote/list lines outside containers receive no line decoration today, so
  this is a new decoration source inside the same pass; respect the existing add-order rule at
  equal positions. Inside a container the directive `paddingLeft` (the gutter) and the hang
  compose; verify with a nested-list-in-container case in the component test.
- [ ] **Run both suite files, then the full gate.**
- [ ] **Commit:** `Hang wrapped quote and list lines under their content`

### Task 3: container folding (dispatch with `model: opus`)

The one correctness-critical task: CodeMirror fold integration with cairn's own affordance
grammar. The behavior is fully prescribed; read the spec's "Containers fold" bullet and the
whole of `docs/internal/design/2026-06-12-folding-interaction-notes.md` before writing code.
The mockup's screen 1 (chevron on the opener row, folded row with pill and wash) is the visual
contract.

**Files:**
- Modify: `src/lib/components/markdown-directives.ts` (`containerRanges`)
- Create: `src/lib/components/editor-folding.ts`
- Modify: `src/lib/components/MarkdownEditor.svelte` (wire the extension, the wash/pill/chevron theme rules)
- Modify: `src/lib/components/editor-highlight.ts` (suppress the innermost bar on opener rows where the chevron sits)
- Modify: `src/tests/unit/editor-boundary.test.ts` (whitelist `editor-folding.ts`)
- Test: `src/tests/unit/markdown-directives.test.ts`, `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Write the failing unit tests for `containerRanges(scan)`:** walks `roles` with a stack
  and returns every paired `{ fromLine, toLine, depth }`; an unbalanced opener yields **no
  range** (the explicit no-chevron test the notes ask for); fences disowned inside code blocks
  never pair.
- [ ] **Implement `containerRanges`** beside `caretContainerRange`, pure, reusing the
  `ContainerRange` type.
- [ ] **Write the failing component tests**, the behavior pins in rough order of importance:

```ts
// fold/unfold round trip: clicking the opener-row gutter band hides opener-end..closer-end,
// the folded row shows the "N lines" pill (a real button, aria-label "Show N hidden lines"),
// clicking the pill restores
// keyboard: Ctrl+Shift+[ folds the innermost container at the caret; Ctrl+Shift+] unfolds
// safety: typing at the fold boundary unfolds in the same transaction
// safety: extending a selection into a folded range unfolds it
// safety: undo after fold moves text only (the fold survives history)
// arrows: ArrowDown from the opener row lands after the closer (atomic skip)
// affordance: the opener row's innermost rail bar is absent where the chevron renders
// affordance: clicking the opener TEXT places the caret and never folds
// folded presentation: the opener row carries the wash (square, full row, rails unbroken)
// unbalanced opener: no chevron, no foldable range
```

- [ ] **Implement `editor-folding.ts`.** The shape:
  - `codeFolding({ placeholderDOM })` from `@codemirror/language`; the placeholder is the pill
    button (`aria-label="Show N hidden lines"`, line count from the folded range), which
    unfolds on click.
  - Fold ranges run end-of-opener-line to end-of-closer-line, derived only from
    `containerRanges`; fold via `foldEffect`, unfold via `unfoldEffect`.
  - A `transactionExtender` reads `foldedRanges(state)` and appends unfold effects when a
    change range or the new selection touches a folded range (covers Enter at the boundary,
    Backspace after the closer, paste across, undo/redo landing inside, Shift+arrow entry). A
    replace landing inside a fold leaves it open afterward.
  - Chevron widgets: one per opener row, positioned at the container's own innermost bar x
    (depth 1 at 0, depth 2 at 8, depth 3 at 16), in the container's stepped label ink. Down
    while the caret is inside (every enclosing opener shows its own), right while folded
    (always visible), otherwise fading in over ~120ms while the pointer is inside the 28px rail
    band on any line of that container (a mousemove tracker on `scrollDOM` mapping x < 28px and
    the hovered line to its innermost container; reveal only the innermost container's
    chevron). Never reveal over prose.
  - The whole 28px band on the opener row is the click target (`cursor: pointer` over the band
    only); the band element handles the click, the opener text never does.
  - On unfold, flash the revealed lines with a low-alpha accent line decoration fading over
    ~400ms (one-time, removed after the animation).
  - Keymap entries for `Ctrl+Shift+[` / `Ctrl+Shift+]` against the innermost container at the
    caret (`caretContainerRange` already finds it). No fold-all, no chords.
  - Fold state is session-local (never persisted) and folds dim like machinery under focus
    mode through the existing dim variables (pill and chevron included).
  - The wash: `cm-cairn-folded-row` line decoration, background
    `color-mix(in oklab, var(--color-accent) 7%, transparent)`, square and full-row (no
    radius; the rails are inset box-shadows on the same element and render above the
    background, so they run through unbroken). Re-check the pill's accent-ink contrast on the
    7% wash against the locked leaf-chip pair; if AA fails at 7%, raise the ink, not the wash.
  - The notes' diagnostics rules (warning-tinted pill on a refolded erroring container) have no
    trigger today; the editor has no lint source. Skip them, leave a comment, do not invent a
    lint system.
- [ ] **Suppress the innermost bar on opener rows** in the highlight pass (the chevron REPLACES
  it; outer bars on that row stay).
- [ ] **Run both suite files, then the full gate.** Eyeball on the showcase (`npm run package`
  first): fold, unfold, hover reveal, both themes.
- [ ] **Commit:** `Fold directive containers from the rail band`

### Task 4: the format keymap completes; page-level keys

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (`onEditorKeydown`, `onWindowKeydown`)
- Modify: `src/lib/components/EditorToolbar.svelte` (tooltip labels gain their bindings)
- Test: `src/tests/component/EditPage.test.ts`

- [ ] **Write the failing tests:** card-scoped keys dispatch their formats (`Ctrl+E` inline
  code, `Ctrl+Shift+9` quote, `Ctrl+Shift+8` ul, `Ctrl+Shift+7` ol, `Ctrl+Alt+2` h2,
  `Ctrl+Alt+3` h3); window-scoped keys flip their states (`Ctrl+Shift+S` requests submit with
  the publish formaction when pending, `Ctrl+Alt+P` toggles Write/Preview, `Ctrl+Shift+F`
  toggles focus mode); every window-scoped key gates on an open dialog the way `Ctrl+S` does.
- [ ] **Implement.** Extend `onEditorKeydown` (the card listener) for the format keys,
  following the existing preventDefault pattern; mind that `e.key` for `Ctrl+Shift+8` arrives
  as `'*'` on US layouts, so match on `e.code` (`Digit8`) for the shifted digit trio. Extend
  the window-scoped handler for Publish/mode/focus. Publish via
  `editForm?.requestSubmit(publishButton)` so the formaction and the busy flags follow the
  existing submit path; no-op when `!data.pending`.
- [ ] **Update the toolbar tooltips** so every button with a binding carries it
  (`'Inline code (Ctrl+E)'`, `'Quote (Ctrl+Shift+9)'`, and so on), the literal-Ctrl convention
  already in the file.
- [ ] **Run the suite file, then the full gate.**
- [ ] **Commit:** `Complete the format keymap and add the page-level keys`

### Task 5: the strip promotes; the footer dresses its controls

**Files:**
- Modify: `src/lib/components/EditorToolbar.svelte` (promotion, More trim)
- Modify: `src/lib/components/EditPage.svelte` (the footer strip markup)
- Test: `src/tests/component/EditorToolbar.test.ts`, `src/tests/component/EditPage.test.ts`

- [ ] **Write the failing tests:** the strip renders inline code, strikethrough, table after
  Quote and before More; More holds exactly code block, divider, task list; **the fit
  assertion**: at a 49rem-wide container (and 56rem for Markup) every strip control shares one
  row (compare first and last controls' `offsetTop`). The footer: the posture pair is one
  bordered segmented control (`role="group"`, `aria-label="Editing surface"`, check glyph
  inside the active segment), Focus mode and Typewriter are standalone check-and-tint toggles
  (`aria-pressed` with the check glyph as the non-color cue, the established WCAG 1.4.1
  pattern), and Markdown help is a plain underlined link-styled button, no border.
- [ ] **Implement.** Move `code`, `strike`, `table` from `moreItems` into `structureButtons`
  (or a sibling group matching the mockup's divider rhythm); keep every promoted button on the
  strip's icon grammar (the declarative stroke-path arrays). Dress the footer per the mockup's
  `.seg` / `.ftr-toggle` / `.ftr-link` treatments using the scoped Tailwind idiom. No group
  labels (considered and declined in the spec; the segmented border carries the pick-one
  semantics).
- [ ] **If the fit assertion fails at 49rem**, demote table back to More and record the
  adjustment in the commit body.
- [ ] **Run both suite files, then the full gate.**
- [ ] **Commit:** `Promote the everyday formats and dress the footer controls`

### Task 6: one header band (rung 1)

**Files:**
- Create: `src/lib/components/topbar-context.ts` (the portal seam)
- Modify: `src/lib/components/AdminLayout.svelte` (render the desk cluster)
- Modify: `src/lib/components/EditPage.svelte` (register the snippet; delete the sticky header)
- Modify: `src/lib/components/cairn-admin.css` (`scroll-margin-top`)
- Test: `src/tests/component/EditPage.test.ts`, `src/tests/component/AdminLayout.test.ts`

- [ ] **Write the failing tests:**

```ts
// EditPage mounted inside AdminLayout (follow CairnAdmin's composition) renders Save, Publish,
// the status badge, the save-state indicator, the Details trigger, and the overflow menu
// inside the topbar; the page body carries no second header and no second breadcrumb
// a list view renders none of those in the topbar (the band is unchanged there)
// Enter in a text field still submits ?/save, not ?/publish (the sr-only default submitter
// precedes Publish in tree order inside the band)
// the feedback strip renders directly under the band
```

- [ ] **Implement the seam** (`topbar-context.ts`): a context key, a
  `{ desk: Snippet | null }` holder, `provideTopbar()` called by AdminLayout,
  `useTopbar()` returning the holder for EditPage. EditPage registers in an `$effect` with a
  teardown that nulls it.
- [ ] **Rebuild the band on edit routes** per mockup screen 1, three clusters: the way back
  (drawer toggle, then the breadcrumb trail with the entry title in content ink); the document
  status behind a hairline (status badge, save-state with the warning-dot); the actions split
  by a second hairline into the quiet pair (Details with its panel icon, the overflow) and the
  lifecycle pair (Publish outline, Save solid). The desk snippet carries the status and action
  clusters; AdminLayout renders it after the crumb and hides its own palette trigger and
  "Publish site (N)" on desk routes (the band has one job there). The sr-only default Save
  submitter renders first inside the actions cluster. The Details trigger lands here but stays
  inert until Task 8 wires the panel (give it the `panel` icon and a no-op handler with a
  comment, or wire it to the existing aside's visibility if trivial; Task 8 owns the real
  panel).
- [ ] **Delete the sticky glass header** from EditPage along with its duplicate breadcrumb and
  the sr-only `<h1>` hoist that depends on it (keep the page's accessible name; the document
  title H1 in the manuscript column remains). The feedback strip and banners stay, now directly
  under the band. Reduce `scroll-margin-top` to the one-band stack (`5.5rem`: the 4rem bar plus
  slack; update the comment). Keep `onFormInvalid`, dirty tracking, and the leave guards
  untouched.
- [ ] **Run both suite files, then the full gate.** Eyeball on the showcase, both themes.
- [ ] **Commit:** `Dissolve the edit header into the one band`

### Task 7: the nav recedes inside a document (rung 2)

**Files:**
- Modify: `src/lib/components/AdminLayout.svelte`
- Test: `src/tests/component/AdminLayout.test.ts`

- [ ] **Write the failing tests:** with an edit-route `pathname` the drawer shell omits
  `lg:drawer-open` (SSR markup, no effect involved, so no flash); with a list `pathname` it
  keeps it; the drawer toggle is visible at desktop width on edit routes and reopens the nav as
  an overlay.
- [ ] **Implement:** derive `isDeskRoute` from the existing crumbs/pathname logic
  (`segs.length > 2`), make the `lg:drawer-open` class conditional on `!isDeskRoute`, and drop
  the toggle's `lg:hidden` on desk routes. `Cmd/Ctrl+B` already toggles the checkbox and now
  means something at desktop; list and settings routes keep the persistent sidebar exactly as
  today. The `cairn-admin-nav-collapsed` cookie family (section collapse) is untouched.
- [ ] **Run the suite file, then the full gate.**
- [ ] **Commit:** `Recede the nav drawer inside a document`

### Task 8: details on demand (rung 3)

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Test: `src/tests/component/EditPage.test.ts`

- [ ] **Write the failing tests:**

```ts
// the Details trigger opens the slide-over; the panel is a labeled region
// (role="region", aria-label "Entry details") with a close button; focus moves to the
// close button on open and returns to the trigger on close; Escape closes
// the panel's fields stay part of the one edit form: edit a detail field, save, and the
// posted FormData carries it (the aside never unmounts, closed = hidden)
// the capture-phase invalid handler opens the panel when the invalid control lives there
// (and still flips Preview back to Write when it lives in the write pane)
// Ctrl+. toggles the panel
// the editor column centers truly: write mode no longer renders the two-column grid
```

- [ ] **Implement.** The aside stays physically inside the form (form association and the
  uncontrolled-field guarantee are free); it becomes a fixed slide-over below the band per the
  mockup (right 0, top the band height, 19rem, border-left, the card shadow), `hidden` when
  closed (out of the a11y tree and tab order; `display:none` fields still submit). The
  Details/Visibility/Address groups keep their eyebrows; a panel header row carries the
  "Details" eyebrow and the close button. Drop the `lg:grid lg:grid-cols-[1fr_17rem]` mode
  class; the column centers in the freed width in both postures. `onFormInvalid` gains the
  panel arm (`flushSync(() => (detailsOpen = true))` when the control sits in the aside).
  Dirty tracking needs nothing: the panel never unmounts. The a11y reviewer adjudicates
  dialog-vs-region at the review gate; build region-with-focus-management as specced and flag
  it in the dispatch report.
- [ ] **Run the suite file, then the full gate.** Eyeball open/close both themes.
- [ ] **Commit:** `Move the details column behind a slide-over panel`

### Task 9: zen (rung 4)

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Modify: `src/lib/components/AdminLayout.svelte` (the band hides under zen)
- Test: `src/tests/component/EditPage.test.ts`

- [ ] **Write the failing tests:**

```ts
// the footer Zen toggle (and Ctrl+Shift+.) hides the band, the document title, the toolbar
// strip, and the footer; the manuscript stays; a floating chip carries the save state and an
// "Exit zen" control with the Esc hint
// Escape restores everything and focus is not stranded (it lands in the editor if its
// holder hid)
// the preference persists (localStorage 'cairn-editor-zen') and re-applies on mount
// zen composes with focus mode (both on: chrome gone AND machinery dimmed)
// the save-state in the chip is live (dirty flips the dot)
```

- [ ] **Implement.** A `zen` state in the localStorage family; the desk snippet portal is the
  lever for the band (EditPage swaps its registered snippet to null, or AdminLayout reads a
  zen flag through the same context holder; pick whichever keeps the slide-away transition
  simple). EditPage hides the title wrap, strip, and footer under a `zen` class; the chip is
  the mockup's `.zen-chip` (fixed top-right, save state + exit button). Escape exits ahead of
  any dialog semantics (guard: only when no dialog is open). The WordPress/Ghost rule holds: the
  exit affordance and the save state never disappear. Entering zen moves focus into the editor
  if the previously focused control hid.
- [ ] **Run the suite file, then the full gate.** Eyeball both themes, focus mode on and off.
- [ ] **Commit:** `Add zen: the manuscript alone on the recessed ground`

### Task 10: the shortcuts sheet and the help section

**Files:**
- Create: `src/lib/components/editor-shortcuts.ts` (the one shortcut table)
- Create: `src/lib/components/ShortcutsDialog.svelte`
- Modify: `src/lib/components/EditPage.svelte` (wire `Ctrl+/`, mount the dialog)
- Modify: `src/lib/components/MarkdownHelpDialog.svelte` (the shortcuts section; the H4 note)
- Test: `src/tests/component/EditPage.test.ts`

- [ ] **Write the failing tests:** `Ctrl+/` opens the sheet; the sheet lists every binding from
  the table (spot-check Save, Publish, fold, zen, the sheet itself); Escape closes; the
  Markdown help dialog renders the same shortcut rows and documents that `####` types a
  fourth-level heading.
- [ ] **Implement.** `editor-shortcuts.ts` exports the rows
  (`{ label: string, keys: string }[]`), the single source both dialogs render, per mockup
  screen 5 (two-column grid, `Ctrl K (global)` for the palette, the closing line "Typing
  markdown always works; the keys are conveniences, never requirements."). `ShortcutsDialog`
  follows the native-dialog recipe (`MarkdownHelpDialog` is the template; dialogs mount outside
  the form, the 0.40.0 rule). The help dialog gains a "Keyboard shortcuts" section above its
  closing paragraph and one syntax row or note for `####`.
- [ ] **Run the suite file, then the full gate.**
- [ ] **Commit:** `Add the Ctrl+/ shortcuts sheet`

### Task 11: the gold-standard sweep (main loop, not a dispatch)

The release carries the mockup's grade of polish across the entire admin. The surfaces the
pass already rebuilt (the desk, the band, the footer) landed at standard in their tasks; this
task sweeps the rest: the office (list pages, the create dialog, the office topbar), the auth
pages (login, confirm), the editors and nav screens, the dialogs and pickers (delete, rename,
web link, link picker, icon picker, component insert), and the command palette.

**Method** (the one that produced the standard): run the `frontend-design:frontend-design`
loop in the main loop, per surface, with measured fresh-eyes critiques in both themes.
Concretely, per surface: capture (the ad-hoc Playwright recipe from the 0.32.0/0.52.0 passes;
`npm run package`, showcase build, `SHOWCASE_FAKE_BACKEND=1 npm run preview`, screenshot light
and dark), critique against the standard's grammar (cluster rhythm over uniform rows; controls
dressed as what they are: segmented switches, toggles with non-color state cues, plain links
for references), apply, re-capture. The office and desk get separate critique rounds, per the
spec's testing section.

- [ ] **Sweep the office:** the list-route topbar keeps the palette trigger and "Publish site
  (N)" but adopts the cluster rhythm; the list header row, the create dialog, and the empty
  states get the dressing check.
- [ ] **Sweep the auth pages** (login, confirm), **editors, and nav** screens.
- [ ] **Sweep the dialogs, pickers, and the command palette.**
- [ ] **Capture the final set:** office and desk, both themes (four canonical captures plus
  any surface that changed), kept for the review gate.
- [ ] **Full gate** (the sweep may touch component tests' computed-style pins).
- [ ] **Commit per coherent batch** (office, auth, dialogs), not one monolith.

### Task 12: the showcase E2E catches up

**Files:**
- Modify: `examples/showcase/e2e/golden-path.spec.ts`

- [ ] **Update the moved selectors:** the Save/Publish/status assertions that anchored on the
  sticky header now anchor on the band (the `header`-scoped locators at `:102-103`, `:172`,
  `:186-187`, `:206`, the More-actions menu at `:215-216`). The golden path itself (open from
  list, edit, save, publish round trip) stays identical in substance.
- [ ] **Add one zen round trip:** enter zen, assert the band is gone and the chip shows the
  save state, type, exit with Escape, save.
- [ ] **Run** `npm run package`, then `npm run test:e2e` in `examples/showcase`; expect all
  green (8 tests).
- [ ] **Commit:** `Update the golden path for the one band and add a zen round trip`

### Task 13: the docs arm

**Files:**
- Modify: `docs/internal/admin-design-system.md`
- Modify: `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`
- Check: `docs/reference/components.md` (or wherever the components reference describes the edit page), `README.md`
- Modify: `docs/internal/docs-friction-log.md` (if the writing surfaces friction)

- [ ] **The design system gains the context model** as load-bearing language, a new section
  after "Load-bearing rules": the office/desk model (list pages are the office, an open
  document takes the shell), the one-band rule (a desk route renders exactly one header band,
  fed through the topbar context portal), and the permanent-affordances rule (the way back and
  the save state never disappear, zen included). Update the component recipes that the pass
  changed (the band's three clusters, the slide-over panel, the segmented control and
  check-and-tint toggle dressings, the fold affordance).
- [ ] **Hunt drift:** `grep -rn` the docs tree and `README.md` for the sticky header, the
  details sidebar/column, and the old rail pitch wherever described; repoint every hit.
- [ ] **Changelog `0.54.0`** (additive, no consumer action; say so) summarizing the four rungs,
  the ergonomics set, and the sweep; the matching upgrade-guide entry appends at the bottom of
  `docs/guides/upgrade-cairn.md`.
- [ ] **Run the doc gates:** `npm run check:reference`, `check:package`, `check:docs`,
  `check:prose` all exit 0.
- [ ] **Commit:** `Teach the docs the office/desk context model`

---

## Pass end (the cairn-pass ritual, in order)

1. **Simplifier** over the pass's changed code (`code-simplifier:code-simplifier`).
2. **Full gate at the tip,** run first-hand: `npm run check` 0/0, `npm test` exit 0, the five
   doc/readiness gates, showcase E2E.
3. **Review gate:** fan out `svelte-reviewer` and `daisyui-a11y-reviewer` in parallel (the
   a11y reviewer explicitly adjudicates the Details panel pattern, dialog vs region, and the
   zen focus story; hand both the final captures). No auth, worker, or signing code changes, so
   the other two reviewers sit out unless the diff says otherwise. Fold findings in.
4. **Live admin smoke** (the pass touches `/admin` everywhere): mint a D1 session row per
   `docs/internal/admin-smoke-test.md` against `wrangler dev`, walk the desk (open, edit, fold,
   panel, zen, save, publish) and the office.
5. **Version bump `0.54.0`** plus the release-notes-ready changelog window.
6. **Post-mortem** appended here; **STATUS.md** updated on `main` (the queue after this pass:
   the gates-and-tooling pass, the gallery brainstorm, P4).

## Out of scope (the spec's list, binding)

The list pages' own design beyond the sweep's dressing check; the preview pane; the render
pipeline; mobile-specific rework beyond keeping the drawer behavior sane; in-place directive
affordances; heading/list folding, fold-all, fold persistence, any fold affordance in Preview.

---

## Post-mortem (LANDED on `main` 2026-06-13 as `0.54.0`, unpublished)

All thirteen tasks plus the simplifier and the review fold-in landed on `main`. The work spans
commits `7e2aedb..46d55c5` (the plan and STATUS pre-bake at `0fc1bbe`). Gate green at the tip, run
first-hand: `npm run check` 915 files 0/0, `npm test` 157 files / 1483 tests exit 0, the five
doc/readiness gates clean, and the showcase E2E 8/8 in a real browser (the golden path plus the new
zen round trip).

### What was built

The four shell rungs: the edit page's sticky header dissolves into the single 64px topbar through a
new context portal (`topbar-context.ts`: `AdminLayout` holds a `$state` holder, `EditPage` registers
a `desk` snippet into it in an `$effect` and clears it on teardown, so `CairnAdmin`'s view switch
reverts the band with no route plumbing); the nav drawer opens closed on a desk route, resolved at
SSR via a conditional `lg:drawer-open` so it never flashes; the frontmatter fields move to a right
slide-over panel (`role="region"`, focus-managed, `hidden`-toggled so closed fields still submit);
and zen fades the chrome through the holder's `zen` flag, leaving the manuscript and a floating chip
that keeps the save state and the way out.

The editor ergonomics set: the directive rail pitch widened to 8px with a strength-only caret rail
(the `+1px` width step gone); hanging indents on wrapped quote and list lines via a new
`markerPrefix` helper feeding a line decoration; container folding from the rail band
(`editor-folding.ts` on `@codemirror/language`, ranges only from `fenceScan`'s paired `containerRanges`,
the safety invariant in one `transactionExtender`, the chevron-replaces-innermost-bar affordance, the
square accent wash and the focusable `N lines` pill); the completed format keymap plus the page-level
keys, the `Ctrl+/` sheet, and the `####` heading step; the strip promotion (inline code, strikethrough,
table, with horizontal rule kept behind the ellipsis after a plan-wording correction); and the footer
controls dressed as a segmented control, check-and-tint toggles, and a plain help link.

### Decisions locked

- **The topbar context portal** over typed page data: the band renders EditPage-owned live state
  (`dirty`/`busy`/`status`/save-state), so a snippet carrying its defining component's reactive scope
  is the clean seam. Both reviewers confirmed the cross-component snippet reactivity and the teardown.
- **Folding on `@codemirror/language`** with a pure `containerRanges` pairing helper, never a custom
  fold store; the safety invariant (any edit or selection touching a folded range unfolds it in the
  same transaction) lives in one `transactionExtender`, verified against CM's own `foldState` idiom.
- **Write/Preview moved off `Ctrl+Shift+P`** (Firefox reserves it at the browser level) to
  `Ctrl+Alt+P`; the rest of the bindings follow mockup screen 5.
- **The details panel is a region, not a dialog** (a11y verdict): the fields must stay in the one edit
  form, so a modal `<dialog>` is off the table, and the panel is non-modal by design (the editor stays
  live behind it), which `aria-modal` would misreport.

### The gold-standard sweep found a systemic defect

The sweep's headline find was not cosmetic. The chrome-isolated admin sheet ships no global Preflight
(so it can't reset the host site's elements), so every bare-utility `<button>` (the footer toggles,
the list's sort-column headers, the zen chip's exit) kept the UA outset border and gray fill while
DaisyUI `.btn` buttons reset themselves. One scoped rule (`button:not(.btn)` in `cairn-admin.css`,
generalizing the existing menu-button reset) levels them all; verified by computed-style probe that
`.btn` buttons keep their chrome and bare buttons flatten. This had been a latent blemish since the
self-styling work. The sweep also deduped the details panel's doubled "Details" label.

### Review gate

`svelte-reviewer` and `daisyui-a11y-reviewer` (both Opus). Svelte: no Critical or Important, three
Minor documentation notes. a11y: both adjudications resolved in favor of the built patterns
(region-with-focus-management for Details, zen exit always reachable), with one Important folded in
(`46d55c5`): entering zen via `Ctrl+Shift+.` while focus sat on a band action or the hoisted title
stranded focus on the detached node (WCAG 2.4.3), because the relocation guard only covered the editor
card. Widened to relocate whenever focus sits outside the surviving `.cm-editor`, with a title-focus
regression test.

### Live admin smoke: judged not proportionate

This is a presentation-only pass: no server, auth, session, action, or SSR code changed (both reviewers
confirmed the load/action contract is untouched). The desk and zen flows are proven in a real browser
by the showcase E2E (8/8, the golden path plus the zen round trip) and by first-hand showcase captures
of the office, desk, details panel, zen, and login in both themes (kept under `/tmp/cairn-shots/` for
the session). The live `wrangler dev` + D1-session smoke would only re-verify the unchanged server path,
so it was not run, the documented precedent for a behavior-preserving presentation pass.

### A test-infra fix the pass forced

The component file grew from 38 to 50 CodeMirror mounts, which tipped the documented first-mount
cold-start timeout from intermittent to deterministic under the full tri-project run (the component
project alone stayed green). Fixed at the source (`716794c`): a 20s poll on the first mount absorbs the
one-time dynamic-import cold start, after which the cached modules serve the rest.

### Carry-forwards

1. The a11y reviewer's Minors, all non-blocking: the posture segmented control could move to
   `role="radiogroup"` for a closer mental model (the `aria-pressed` toggle-group passes as built); the
   Details trigger could gain `aria-controls` (4.1.2 supporting); the breadcrumb hides below `sm` on a
   desk route (the drawer toggle is the small-screen way back, worth documenting or a compact affordance);
   the fold pill's 30% accent border is sub-3:1 but the full-ink `N lines` text is the real identifier;
   the fold chevron band is pointer-only (keyboard parity via `Ctrl+Shift+[`/`]` and the focusable pill).
2. The svelte reviewer's Minors: a one-line note that `proseTheme`/`markupTheme` are deliberately
   non-reactive `let` assigned once in `onMount`; a note at `AdminLayout` that the office-route band
   visibility rests on EditPage's teardown resetting `topbar.zen`; the fold pill line-count derives from
   char positions, so a future `foldCharRange` boundary change could drift it.
3. The body-line hover-reveal tracker for fold chevrons was scoped to CSS on the opener band rather than
   a `scrollDOM` pointer tracker (Task 3 deviation 3); the caret and folded chevron states the mockup
   shows are implemented. Revisit if the hover affordance wants the fuller behavior.
4. The strip-fit test imports the compiled `dist` admin sheet to measure real button widths, coupling
   that one component test to a fresh `dist` build (a candidate for the gates-and-tooling pass).
