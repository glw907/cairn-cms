# The editor experience: quiet surface, directive treatment, iA modes (0.52.0)

> **For agentic workers:** execute task-by-task with `cairn-implementer` (the repo default);
> the main loop reviews each diff and verifies the full gate between dispatches. Steps use
> checkbox syntax for tracking.

**Status: LANDED on `main` 2026-06-12. Post-mortem at the end.**

**Goal:** rebuild the in-editor writing experience per the approved spec
(`docs/superpowers/specs/2026-06-12-cairn-editor-experience-design.md`): a quiet monospace
writing surface with real hierarchy and marker discipline, the directive machinery as rails with
meaning-over-machinery fences and cursor-aware emphasis, the two missing table-stakes behaviors
(GFM parsing, markdown keymap), and focus mode plus typewriter scroll as persisted toggles.

**Architecture:** every change lives behind the `MarkdownEditor` seam or in the highlight layer
beside it (`editor-highlight.ts`, `markdown-directives.ts`), plus the toolbar toggles in
`EditorToolbar`/`EditPage` and the theme variables in `cairn-admin.css`. No server, action, load,
or adapter change; additive for consumers; minor bump `0.52.0`.

**Tech stack:** CodeMirror 6 (`@codemirror/lang-markdown` GFM base, `markdownKeymap`,
`Decoration`/`ViewPlugin`, `Compartment`), Svelte 5 runes, the existing unit + component (real
browser) test projects.

**Facts the implementer should not re-derive** (verified 2026-06-12 against the installed
packages):

- `markdown()` defaults `base` to `commonmarkLanguage`; `markdownLanguage` is the GFM variant
  (strikethrough, tables, task lists, autolink). (Task 1 correction: `markdown()` also wires
  `markdownKeymap` at `Prec.high` through its `addKeymap` default, so the keymap was never
  missing; Task 1 pins the behavior with tests instead of adding a redundant binding, and
  `deleteMarkupBackward`'s real contract leaves marker-width indentation behind.)
- `@lezer/markdown` styles `ATXHeading1/SetextHeading1` as `tags.heading1` (and so on per level),
  and `"HeaderMark HardBreak QuoteMark ListMark LinkMark EmphasisMark CodeMark"` as
  `tags.processingInstruction`. GFM adds `Strikethrough` with `tags.strikethrough` and a
  `StrikethroughMark`.
- Today the marks render at full content strength even though our `HighlightStyle` colors
  `processingInstruction` muted; the heading/link rules win on the mark spans. The component
  tests in Task 2 pin the *desired* computed styles; resolving the precedence (rule order, or
  `prec`/scope options on the `HighlightStyle`) is implementation detail inside the task.
- The editor-preferences idiom is `localStorage` (`cairn-editor-preview-device` in `EditPage`);
  the More menu in `EditorToolbar` is a Popover-API menu (`moreMenu`, `pickMore`).
- The directive depth model (`fenceDepths`) is cached per doc change and decorations build per
  viewport (`editor-highlight.ts`); keep that cost model.

---

### Task 1: table stakes (GFM base and the markdown keymap)

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (the `onMount` extensions)
- Test: `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Write the failing tests** (component project; the suite drives a real browser):

```ts
test('strikethrough parses and renders struck (GFM base)', async () => {
  render(MarkdownEditor, { value: 'a ~~struck~~ word', name: 'body' });
  const struck = await waitForSelector('.cm-content [class*="strikethrough"], .cm-content [style*="line-through"]');
  expect(struck.textContent).toContain('struck');
});

test('Enter continues a list item (markdownKeymap)', async () => {
  render(MarkdownEditor, { value: '- first', name: 'body' });
  const content = await focusEditorEnd(); // click .cm-content, move caret to doc end
  await userEvent.keyboard('{Enter}second');
  expect(getHiddenValue('body')).toBe('- first\n- second');
});

test('Backspace on an empty list marker removes the markup', async () => {
  render(MarkdownEditor, { value: '- first\n- ', name: 'body' });
  await focusEditorEnd();
  await userEvent.keyboard('{Backspace}');
  expect(getHiddenValue('body')).toBe('- first\n');
});
```

Match the suite's existing helpers for mounting and reading the hidden field; write the small
`focusEditorEnd`/`getHiddenValue` helpers if the file does not already have equivalents.

- [ ] **Run them; expect all three to fail** (no strikethrough node, Enter inserts a bare
  newline).
- [ ] **Implement**: in `MarkdownEditor.svelte`'s `onMount`,

```ts
markdownMod.markdown({ base: markdownMod.markdownLanguage }),
```

and in the keymap, ahead of the default set:

```ts
keymap.of([
  ...autocompleteMod.completionKeymap,
  ...markdownMod.markdownKeymap,
  ...commandsMod.defaultKeymap,
  ...commandsMod.historyKeymap,
]),
```

- [ ] **Run the suite file; expect green.** Full gate (`npm run check` 0/0, `npm test` exit 0).
- [ ] **Commit** (`git add` the two files): `Parse GFM and wire the markdown keymap in the editor`.

### Task 2: the quiet surface (hierarchy, marker discipline, measure)

**Files:**
- Modify: `src/lib/components/editor-highlight.ts` (`cairnHighlightStyle`)
- Modify: `src/lib/components/MarkdownEditor.svelte` (the `EditorView.theme` block)
- Modify: `src/lib/components/cairn-admin.css` (the `--cairn-code-chip` variable, both themes)
- Test: `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Write the failing tests.** Computed-style assertions in the real browser, one per spec
  point (follow the file's existing computed-style pattern if present; otherwise
  `getComputedStyle` on the queried span):

```ts
// heading hierarchy: sizes step by level, ink is content color, not primary
test('h2 and h3 step their size and use content ink', async () => { /* value: '## A\n### B\nbody' */
  // h2 span font-size > h3 span font-size > body font-size
  // h2 color equals body color (not the primary purple)
});

// markers recede
test('heading and emphasis markers render muted', async () => { /* value: '## A **b**' */
  // the '##' span and the '**' spans have the muted color, distinct from their content spans
});

// URL dimmed, link text keeps one accent
test('link text carries the accent and the URL is muted', async () => { /* '[t](https://e.com)' */ });

// inline code chip
test('inline code renders as a chip in content ink', async () => { /* '`code`' */
  // background differs from the editor base, color is content ink (not accent)
});

// the measure
test('the content column is capped and centered', async () => {
  // .cm-content max-width resolves to 70ch and horizontal margins are auto
});
```

- [ ] **Run; expect failures** (uniform sizes, full-strength markers, no chip, full-width).
- [ ] **Implement** in `cairnHighlightStyle()` (replace the heading/link/monospace rules; keep
  the directive plugin untouched):

```ts
{ tag: tags.heading1, fontSize: '1.5em', fontWeight: '700', color: 'var(--color-base-content)' },
{ tag: tags.heading2, fontSize: '1.3em', fontWeight: '700', color: 'var(--color-base-content)' },
{ tag: tags.heading3, fontSize: '1.12em', fontWeight: '700', color: 'var(--color-base-content)' },
{ tag: tags.heading, fontWeight: '700', color: 'var(--color-base-content)' },   // h4+ share weight only
{ tag: tags.link, color: 'var(--color-accent)' },
{ tag: tags.url, color: 'var(--color-muted)' },
{ tag: tags.monospace, color: 'var(--color-base-content)', backgroundColor: 'var(--cairn-code-chip)', borderRadius: '0.25rem', padding: '0.05em 0.3em' },
{ tag: tags.processingInstruction, color: 'var(--color-muted)', fontWeight: '400' },
```

with whatever precedence arrangement makes the `processingInstruction` rule actually win on the
mark spans (verify against this task's tests, not by assumption). Add `--cairn-code-chip` to both
theme blocks in `cairn-admin.css` (a base-200-adjacent tint; respect the AA comment style there).
In the `EditorView.theme`: `fontSize: '1rem'`, and on `.cm-content`:
`maxWidth: '70ch'`, `margin: '0 auto'`, with the existing padding kept.

- [ ] **Run the suite file, then the full gate.**
- [ ] **Commit**: `Step the heading hierarchy and quiet the markers in the editor`.

### Task 3: the directive treatment (rails, meaning over machinery)

**Files:**
- Modify: `src/lib/components/markdown-directives.ts` (new `fenceTokens`)
- Modify: `src/lib/components/editor-highlight.ts` (fence decorations)
- Modify: `src/lib/components/MarkdownEditor.svelte` (theme: drop bands, keep rails)
- Modify: `src/lib/components/cairn-admin.css` (variable scheme: rail/label steps, bands retired)
- Test: `src/tests/unit/markdown-directives.test.ts`, `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Write the failing unit tests** for the token splitter:

```ts
describe('fenceTokens', () => {
  it('splits a labeled opener', () => {
    expect(fenceTokens('::::split[Costs & volunteers]')).toEqual([
      { from: 0, to: 4, kind: 'mark' },          // ::::
      { from: 4, to: 9, kind: 'label' },          // split
      { from: 9, to: 10, kind: 'mark' },          // [
      { from: 10, to: 28, kind: 'label' },        // Costs & volunteers
      { from: 28, to: 29, kind: 'mark' },         // ]
    ]);
  });
  it('marks attributes as machinery', () => { /* ':::panel{title="Day pass"}' gives a name label and a mark for {…} */ });
  it('treats a bare closer as all machinery', () => { /* ':::' is one mark span */ });
  it('tolerates indent and trailing space', () => { /* '  ::: ' */ });
});
```

- [ ] **Implement `fenceTokens(line)`** beside `directiveLineKind` (reuse the `FENCE` regex's
  groups; return `{ from, to, kind: 'mark' | 'label' }[]`, empty array for a non-fence line).
- [ ] **Write the failing component tests** on the nested split/panel fixture (the verbatim
  field-report fixture already in the suite from 0.51):
  - fence rows carry no full-width background (the band class/style is gone) but do carry the
    depth-stepped rail (the same `boxShadow` inset the content rows use);
  - within an opener row, the colon-run span has the muted marker color and the name/label spans
    carry the accent ink;
  - a bare closer row's text is entirely muted.
- [ ] **Implement.** In `buildDirectiveDecorations`: fence lines get a rail line-decoration
  (depth-stepped, sharing the content-rail treatment) instead of the band, plus mark decorations
  from `fenceTokens` (`cm-cairn-directive-mark` muted, `cm-cairn-directive-label` depth-stepped
  accent ink). Leaf and inline directives keep their current treatment. In the theme: delete the
  `backgroundColor` bands; keep and extend the rail and ink variables. In `cairn-admin.css`:
  retire `--cairn-directive-band-*`, keep `--cairn-directive-rail-*` and
  `--cairn-directive-ink-*` (per-theme, AA-commented as the file does).
- [ ] **Run both suite files, then the full gate.**
- [ ] **Commit**: `Trade the directive bands for rails and dim the fence machinery`.

### Task 4: cursor-aware emphasis on the caret's container

**Files:**
- Modify: `src/lib/components/markdown-directives.ts` (new `caretContainerRange`)
- Modify: `src/lib/components/editor-highlight.ts` (selection-tracking plugin)
- Modify: `src/lib/components/cairn-admin.css` (the emphasis-step variables)
- Test: `src/tests/unit/markdown-directives.test.ts`, `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Write the failing unit tests** for the pure range helper:

```ts
describe('caretContainerRange', () => {
  // lines plus the fenceDepths array for them; caret line index in; expect the innermost
  // container's [fromLine, toLine] back, or null outside any container.
  it('finds the innermost container around the caret', () => { /* nested fixture, caret in inner panel */ });
  it('returns the outer container when the caret sits between panels', () => {});
  it('returns null outside any container', () => {});
  it('survives an unclosed container (runs to document end)', () => {});
});
```

- [ ] **Implement `caretContainerRange(lines, depths, caretLine)`** from the cached depth array
  (scan outward for the opener at the caret's depth and its closer; no re-parse).
- [ ] **Write the failing component test**: with the caret inside the inner panel, only that
  panel's rows carry `cm-cairn-caret-block`; moving the caret to the outer container moves the
  class; outside, nobody carries it.
- [ ] **Implement**: the directive ViewPlugin also rebuilds on `update.selectionSet`, adding the
  `cm-cairn-caret-block` line class over the caret container's rows. Theme: that class steps the
  rail and label ink up one notch (one new pair of per-theme variables in `cairn-admin.css`,
  following the existing scheme). Keep the rebuild viewport-scoped; the range comes from the
  cached depths plus one helper call, so the cost model holds.
- [ ] **Run both suite files, then the full gate.**
- [ ] **Commit**: `Strengthen the caret's directive container one step`.

### Task 5: focus mode and typewriter scroll, persisted

**Files:**
- Create: `src/lib/components/editor-modes.ts` (the pure paragraph helper plus the two extensions)
- Modify: `src/lib/components/MarkdownEditor.svelte` (two compartments plus props)
- Modify: `src/lib/components/EditorToolbar.svelte` (two toggles in the More menu)
- Modify: `src/lib/components/EditPage.svelte` (state, persistence, wiring)
- Modify: `src/lib/components/cairn-admin.css` (the `--cairn-focus-dim-ink` pair)
- Test: `src/tests/unit/editor-modes.test.ts`, `src/tests/component/MarkdownEditor.test.ts`,
  `src/tests/component/EditPage.test.ts`

- [ ] **Write the failing unit tests** for the paragraph helper in `editor-modes.ts`:

```ts
describe('paragraphRange', () => {
  it('returns the contiguous non-blank block around the caret line', () => {});
  it('returns just the caret line inside a blank run', () => {});
  it('clamps at the document edges', () => {});
});
```

- [ ] **Implement `editor-modes.ts`**: `paragraphRange(lines, caretLine)`; `focusMode()` (a
  ViewPlugin adding a `cm-cairn-focus-dim` line class outside the caret paragraph, rebuilding on
  `selectionSet`/`docChanged`); `typewriterScroll()` (an update listener that, on `docChanged`,
  dispatches `EditorView.scrollIntoView(head, { y: 'center' })` for the selection head). Both
  exported as plain extensions.
- [ ] **Write the failing component tests**: enabling focus mode dims the other paragraphs (class
  present, caret paragraph clean) and follows the caret; both modes default off; `EditPage`
  persists `cairn-editor-focus-mode` / `cairn-editor-typewriter` through `localStorage` the way
  the device pick already does, and the More menu carries the two checked toggles
  (`role="menuitemcheckbox"`, `aria-checked`, the design system's popover pattern).
- [ ] **Implement the wiring**: `MarkdownEditor` gains `focusMode`/`typewriter` boolean props
  applied through two `Compartment`s (reconfigured from an `$effect` beside the value-reconcile
  one); `EditorToolbar`'s More menu gains the toggles above its format items; `EditPage` owns the
  two `$state` flags with the same load/save shape as `deviceStorageKey`. The dim style: the
  `cm-cairn-focus-dim` class sets `color: var(--cairn-focus-dim-ink)`, a per-theme muted value
  in `cairn-admin.css` that stays AA-readable as text (record the measured pairs in the comment,
  the file's convention; color is the mechanism rather than opacity, so contrast is checkable).
- [ ] **Run all three suite files, then the full gate.**
- [ ] **Commit**: `Add focus mode and typewriter scroll as persisted editor toggles`.

### Task 6: the frontend-design loop (main loop, not an implementer dispatch)

Run the `frontend-design:frontend-design` skill over the showcase editor, three iterations with
a fresh-agent critique between each (the 0.40 Task 10 precedent), screenshots in both themes via
the Playwright capture loop:

- [ ] **General surface**: type scale, measure, padding, the heading steps, marker dosage.
- [ ] **Directive-heavy iteration**: the nested split/panel fixture only; rails, fence labels,
  caret emphasis, focus-mode interplay. The spec's grammar (rail plus labeled head, meaning over
  machinery) is the brief.
- [ ] **The monospace-face mission**: render the spec's candidate faces (Monaspace, iA Writer
  Mono, Courier Prime, JetBrains Mono, Intel One Mono, Atkinson Hyperlegible Mono) on the
  showcase surface with the directive fixture; criteria per the spec (OFL variable woff2, prose
  texture, true italic, weight range for the heading steps, ~16px rendering). "No new font" is
  an acceptable verdict. If a face wins, self-host it the way `cairn-admin.css` hosts Bricolage
  (the post-compile `@font-face` append; license file beside the woff2) and update the
  `ui-monospace` stack to fall back.
- [ ] **Fold the critique fixes in, gate, commit** (one commit per iteration if they land code).

### Task 7: pass end

- [ ] Simplifier over the pass's diff (`code-simplifier:code-simplifier`).
- [ ] Full gate: `npm run check` 0/0, `npm test` exit 0, all five doc/readiness gates.
- [ ] Reviewers in parallel: `svelte-reviewer`, `daisyui-a11y-reviewer` (the dim-state and
  marker contrast assertions are theirs to verify computed).
- [ ] Docs: `CHANGELOG.md` `0.52.0` (additive; "Consumers may" tone), the editor section of the
  relevant guide (focus/typewriter toggles, the quieted machinery), the admin design system's
  editor recipe (new variables, the rail/label grammar, the caret-emphasis step), the
  upgrade-guide entry.
- [ ] Post-mortem into this plan; STATUS top section; memory refresh.
- [ ] Bump `0.52.0`, push, `gh release create v0.52.0 --target main` with the changelog entry.

## Out of scope

Marker hiding and live widgets; toolbar, header, and footer redesign; the preview pane; the
render pipeline; in-place machinery affordances (recorded in the spec as a later pass).

## Post-mortem (2026-06-12)

**What shipped.** All seven tasks, commits `98472bb..4c4b3b9` plus the docs arm. The GFM base and
the keymap pins (`98472bb`), the quiet surface (`a20661b`), the rail/label directive treatment
(`a836b60`), the caret-container emphasis (`b4aedc5`), the persisted focus and typewriter modes
(`71698c6`), the critique fold-in (`d831e62`), iA Writer Mono self-hosted (`a8197f2`), the
simplifier touch (`73e0326`), and the review fold-in (`4c4b3b9`).

**One plan fact was false, caught red-first.** `markdown()` wires `markdownKeymap` at high
precedence by default, so list continuation and markup-aware Backspace worked all along; the
spec's "two defects" was really one (the commonmark-only base). Task 1 pinned the keymap behavior
with tests instead of adding a dead binding, and the spec and plan both carry the correction.

**The design loop earned its three iterations.** The fresh-eyes critique measured rather than
eyeballed and found the gray economy collapsed into one band (full ink 14% gray; muted, quote,
and focus dim all crowded into 37 to 43%), which made focus mode and the caret emphasis
invisible and a focused blockquote read *lighter* than its dim surroundings. The fixes: focus dim
to a deliberate sub-AA ~3:1 (the spec's transient-state permission), quote text to full ink
(muted means machinery, never content; now a design-system rule), and nested-bracket rails at
2/6/10px offsets with a caret-side width step. The critique's proposed rail-alpha spread failed
the 3:1 non-text floor when priced (35/50/65% measured 1.6 to 2.7:1), so depth legibility rides
the bar count and the width step rather than color spread, the honest resolution of taste versus
floor. The font trial rendered six candidates on the real surface; iA Writer Mono won on prose
warmth and its true italic, with Atkinson Hyperlegible Mono the runner-up, and ships self-hosted
through the existing post-compile @font-face mechanism as `--font-editor`.

**A capture gotcha worth keeping.** The showcase resolves the engine through `dist`, so every
visual-loop iteration needs `npm run package` plus a preview-server restart first; a stale dist
silently shows the previous design. (It also produced a phantom: the first focus-mode "failure"
was a pre-pass build with no toggles at all.)

**The review gate.** Both reviewers converged on one Blocker: `role="menuitemcheckbox"` inside
the deliberately non-menu popover list (invalid ARIA context); fixed to `aria-pressed` toggle
buttons per the file's own device-list idiom, and a toggle flip now leaves the menu open so the
state change is perceivable. The a11y reviewer verified every locked contrast pair
computationally (all reproduced exactly; one comment corrected to the gamut-clipped 8.84:1) and
endorsed the sub-AA focus dim as G174-shaped, while catching that dim ink over chip backgrounds
fell to 2.6:1; dimmed lines now flatten their chips. The svelte reviewer's sharpest catch:
`caretContainerRange` re-parsed fence lines blind to code blocks, so a fence-shaped example
inside a code block could clip the emphasis range; `fenceScan` now derives roles during the one
cached scan. SSR safety, the compartment effects, and the queueMicrotask dispatch guard all
verified clean; no load/action contract impact.

**Verification evidence (run first-hand at the tip).** `npm run check` 904 files 0/0; `npm test`
157 files / 1404 tests exit 0; all five doc gates exit 0; showcase E2E 7/7 in a real browser
against a freshly packaged dist; the design loop's final captures confirmed both themes.

**Carry-forwards.**
1. **Commit a contrast verifier** (the a11y reviewer rebuilt the oklch math by hand; a small
   script plus a unit test over the locked pairs in `cairn-admin.css` would make the ledger
   re-checkable). The gamut-clip pricing rule is in the implementer memory.
2. **The directive hover hints are mouse-only** (pre-existing, carried): an always-visible
   affordance on the caret-active fence row would reach keyboard and touch authors.
3. **Typewriter recenter fires on the external value-reconcile replace** (an annotation-tagged
   transaction would exempt it if it ever annoys).
4. **The leaf/inline chip's literal 8% accent tint** can be retuned if it reads too quiet on
   dark; the band variables it replaced are gone.
5. **`docLines` is mirrored** across `editor-highlight.ts` and `editor-modes.ts` (documented,
   deliberate); consolidate if a third consumer appears.
