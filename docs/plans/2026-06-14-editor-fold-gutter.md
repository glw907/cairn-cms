# Editor fold gutter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move directive-container folding out of the in-text chevron band and into a real fixed-x
CodeMirror gutter column, the Obsidian / VS Code pattern, without changing the fold engine.

**Architecture:** Replace `FoldBandWidget` and the widget arm of `foldPlugin` with a custom
`gutter()` (from `@codemirror/view`) whose `GutterMarker` is a focusable `<button>` holding one
rotating chevron. The gutter's `lineMarker` lights up only paired-opener rows; its `lineMarkerChange`
recomputes on `selectionSet` so the caret-inside state stays live. The pill placeholder, the
folded-row wash, the unfold flash, the safety invariant, and the `Mod-Shift-[ / ]` keymap are
unchanged. The opener row's innermost rail bar, dropped today for the in-text chevron, is restored.

**Tech Stack:** TypeScript, Svelte 5, CodeMirror 6 (`@codemirror/view` `gutter`/`GutterMarker`,
`@codemirror/language` `codeFolding`), Vitest browser component tests.

**Spec:** `docs/superpowers/specs/2026-06-14-fold-gutter-design.md`. **Mockup:**
`docs/internal/design/2026-06-14-fold-gutter-mockup.html`.

**Model note:** Tasks 1 and 2 carry the novel CodeMirror gutter logic the plan specifies but cannot
fully de-risk (gutter marker reactivity, the mouse/keyboard toggle, the per-state memo); implement
them in the main loop or upshift the dispatch. Tasks 3 through 6 are mechanical (CSS, a coupled rail
revert, test-selector sweeps, docs) and suit a `cairn-implementer` (Sonnet) dispatch with a diff
review and the full gate between each.

**Gate (every task):** the task's targeted test green, then `npm run check` 0 errors / 0 warnings,
then `npm test` exit 0. Component tests import the variables-only `cairn-admin.css`, so the final
visual confirmation is the showcase (`npm run package`, then build/preview `examples/showcase` at
`/admin/posts`); call it out in Task 3.

---

### Task 1: Replace the in-text band with a gutter button

**Files:**
- Modify: `src/lib/components/editor-folding.ts`
- Test: `src/tests/component/MarkdownEditor.test.ts`

This task swaps the affordance and keeps every behavior. The fold helpers (`foldCharRange`,
`toggleFold`, `foldExists`, `caretFoldRange`), the keymap, the flash, the wash, and the safety
extender are untouched. The chevron glyph becomes a single down path that CSS rotates.

- [ ] **Step 1: Point the test helper at the new button and rewrite the primary fold test**

In `src/tests/component/MarkdownEditor.test.ts`, replace the `foldBand` helper (around line 71) with
a gutter-button helper. Leave `foldPill` and `pressFoldKey` as they are.

```ts
// The fold control now lives in a real gutter column: a focusable button on each paired-opener row.
const foldBtn = (container: Element) => container.querySelector<HTMLButtonElement>('.cm-cairn-fold-btn');
```

Rewrite the primary fold test (currently "folds and unfolds a container from the opener-row gutter
band", around line 770) to drive the button:

```ts
it('folds and unfolds a container from the gutter fold button', async () => {
  const screen = await renderEditor({ value: FOLDABLE_DOC });
  await waitForEditor(screen.container);

  // The opener row's gutter carries a real focusable button.
  await expect.poll(() => foldBtn(screen.container)).toBeTruthy();
  const btn = foldBtn(screen.container)!;
  expect(btn.tagName).toBe('BUTTON');
  expect(btn.getAttribute('aria-label')).toBe('Fold this section');

  // Clicking it hides the body and the closer.
  await userEvent.click(btn);
  await expect.poll(() => foldPill(screen.container)).toBeTruthy();
  const pill = foldPill(screen.container)!;
  expect(pill.tagName).toBe('BUTTON');
  expect(pill.getAttribute('aria-label')).toBe('Show 3 hidden lines');
  expect(pill.textContent).toContain('3 lines');

  // The button now reads as the unfold control, and clicking the pill restores the lines.
  await expect.poll(() => foldBtn(screen.container)?.getAttribute('aria-label')).toBe('Unfold this section');
  await userEvent.click(pill);
  await expect.poll(() => foldPill(screen.container)).toBeNull();
});
```

(Use whatever `renderEditor` / `waitForEditor` / `FOLDABLE_DOC` names the file already defines; keep
its existing setup helpers.)

- [ ] **Step 2: Run the test, watch it fail**

Run: `npx vitest run src/tests/component/MarkdownEditor.test.ts -t "gutter fold button"`
Expected: FAIL (no `.cm-cairn-fold-btn` element; the old `.cm-cairn-fold-band` still renders).

- [ ] **Step 3: Make the chevron a single rotating glyph**

In `src/lib/components/editor-folding.ts`, drop the `'down' | 'right'` direction. Keep `CHEVRON_DOWN`,
remove `CHEVRON_RIGHT`, and make `chevronSvg` take no argument:

```ts
const CHEVRON_DOWN = 'm6 9 6 6 6-6';

function chevronSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CHEVRON_DOWN);
  svg.appendChild(path);
  return svg;
}
```

- [ ] **Step 4: Add the per-state scan memo and the opener/caret helpers**

Still in `editor-folding.ts`, add a memo so the gutter does not rescan the document per line, plus the
two lookups the marker needs. Place them near `caretFoldRange`. Import `EditorState` is already
present.

```ts
// The scan and its paired ranges, memoized per state so the gutter's per-line lookups stay linear.
const scanCache = new WeakMap<EditorState, { scan: ReturnType<typeof fenceScan>; ranges: ContainerRange[] }>();
function foldScanFor(state: EditorState): { scan: ReturnType<typeof fenceScan>; ranges: ContainerRange[] } {
  let cached = scanCache.get(state);
  if (!cached) {
    const lines: string[] = [];
    for (let n = 1; n <= state.doc.lines; n++) lines.push(state.doc.line(n).text);
    const scan = fenceScan(lines);
    cached = { scan, ranges: containerRanges(scan) };
    scanCache.set(state, cached);
  }
  return cached;
}

// The paired container whose opener sits at this line start, or null (a closer, prose, or unbalanced
// opener gets nothing). Sole source of which rows carry a fold control.
function openerRangeAt(state: EditorState, lineFrom: number): ContainerRange | null {
  const lineIndex = state.doc.lineAt(lineFrom).number - 1;
  return foldScanFor(state).ranges.find((r) => r.fromLine === lineIndex) ?? null;
}

// Whether the caret's innermost container is exactly this one (the caret-inside active state).
function caretInside(state: EditorState, range: ContainerRange): boolean {
  const { scan } = foldScanFor(state);
  const caretLine = state.doc.lineAt(state.selection.main.head).number - 1;
  const inner = caretContainerRange(scan, caretLine);
  return !!inner && inner.fromLine === range.fromLine && inner.toLine === range.toLine;
}
```

- [ ] **Step 5: Add the gutter marker and the gutter extension**

Add `gutter` and `GutterMarker` to the `@codemirror/view` import. Then add the marker and the gutter,
near the bottom of the file before `cairnFolding`:

```ts
const FOLD_KEY_HINT = ' (Ctrl+Shift+[)';
const UNFOLD_KEY_HINT = ' (Ctrl+Shift+])';

// The gutter control: a real focusable button per paired-opener row, holding one chevron that CSS
// rotates (down open, right folded) and reveals on gutter hover. mousedown keeps the caret and
// focus where they are; click toggles, so one handler serves a mouse click and a keyboard
// activation (Enter/Space) with no double-toggle.
class FoldMarker extends GutterMarker {
  constructor(
    readonly range: ContainerRange,
    readonly folded: boolean,
    readonly active: boolean,
  ) {
    super();
  }
  eq(other: FoldMarker) {
    return (
      other.range.fromLine === this.range.fromLine &&
      other.range.toLine === this.range.toLine &&
      other.folded === this.folded &&
      other.active === this.active
    );
  }
  toDOM(view: EditorView) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const label = this.folded ? 'Unfold this section' : 'Fold this section';
    btn.className =
      'cm-cairn-fold-btn' +
      (this.folded ? ' cm-cairn-fold-folded' : '') +
      (this.active ? ' cm-cairn-fold-active' : '');
    btn.setAttribute('aria-label', label);
    btn.title = label + (this.folded ? UNFOLD_KEY_HINT : FOLD_KEY_HINT);
    btn.appendChild(chevronSvg());
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFold(view, this.range);
    });
    return btn;
  }
}

function foldGutterColumn(): Extension {
  return gutter({
    class: 'cm-cairn-fold-gutter',
    lineMarker(view, line) {
      const range = openerRangeAt(view.state, line.from);
      if (!range) return null;
      const span = foldCharRange(view.state, range);
      if (!span) return null;
      const folded = foldExists(view.state, span.from, span.to);
      return new FoldMarker(range, folded, caretInside(view.state, range));
    },
    lineMarkerChange(update) {
      return (
        update.docChanged ||
        update.selectionSet ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(foldEffect) || e.is(unfoldEffect)),
        )
      );
    },
  });
}
```

- [ ] **Step 6: Remove the widget arm and wire the gutter into the extension**

In `editor-folding.ts`: delete the `FoldBandWidget` class entirely. In `foldDecorations`, remove the
caret/`inner` computation and the widget `builder.add(...)`; keep only the wash:

```ts
function foldDecorations(view: EditorView, ranges: ContainerRange[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const byOpener = [...ranges].sort((a, b) => a.fromLine - b.fromLine);
  for (const range of byOpener) {
    const span = foldCharRange(view.state, range);
    if (!span) continue;
    const opener = view.state.doc.line(range.fromLine + 1);
    if (foldExists(view.state, span.from, span.to)) builder.add(opener.from, opener.from, washLine);
  }
  return builder.finish();
}
```

Update `foldDecorations`' two call sites in `foldPlugin` to pass `(view, this.ranges)` /
`(update.view, this.ranges)` (drop the `scan` argument). Add the gutter to `cairnFolding`:

```ts
export function cairnFolding(): Extension {
  return [
    codeFolding({ preparePlaceholder, placeholderDOM }),
    flashField,
    safetyExtender(),
    foldPlugin(),
    foldGutterColumn(),
    foldKeymap,
  ];
}
```

- [ ] **Step 7: Run the targeted test, watch it pass**

Run: `npx vitest run src/tests/component/MarkdownEditor.test.ts -t "gutter fold button"`
Expected: PASS.

- [ ] **Step 8: Gate and commit**

Run: `npm run check` (0/0) and `npm test` (other fold tests in this file still reference
`.cm-cairn-fold-band` and will fail; that is expected and Task 5 fixes them. To keep this commit
green, this task may be committed together with Task 5, or run only the non-fold suites here). Commit:

```bash
git add src/lib/components/editor-folding.ts src/tests/component/MarkdownEditor.test.ts
git commit -m "Render the fold control in a gutter, not an in-text band"
```

---

### Task 2: Caret-inside reveal and keyboard fold

**Files:**
- Test: `src/tests/component/MarkdownEditor.test.ts`

The marker already computes `active` (caret-inside) and `lineMarkerChange` already fires on
`selectionSet`, and the keymap already folds at the caret. This task pins both behaviors with tests
so they cannot regress.

- [ ] **Step 1: Write the caret-inside and keyboard tests**

```ts
it('marks the open container active while the caret is inside it', async () => {
  const screen = await renderEditor({ value: FOLDABLE_DOC });
  await waitForEditor(screen.container);
  // Park the caret inside the container body, then assert the opener's button reads active.
  placeCaretInBody(screen.container); // use the file's existing caret helper for a body line
  await expect.poll(() => foldBtn(screen.container)?.classList.contains('cm-cairn-fold-active')).toBe(true);
});

it('folds from the gutter button via keyboard activation', async () => {
  const screen = await renderEditor({ value: FOLDABLE_DOC });
  await waitForEditor(screen.container);
  const btn = foldBtn(screen.container)!;
  btn.focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => foldPill(screen.container)).toBeTruthy();
});
```

If the file has no caret-in-body helper, set the selection through the view the way the existing
`pressFoldKey`-based tests position the caret, then assert the class.

- [ ] **Step 2: Run, expect pass (behavior already implemented in Task 1)**

Run: `npx vitest run src/tests/component/MarkdownEditor.test.ts -t "active while the caret" -t "keyboard activation"`
Expected: PASS. If the caret-inside test fails, confirm `lineMarkerChange` includes `selectionSet`
and `caretInside` compares the innermost container; if the keyboard test fails, confirm the button's
`click` handler (not only `mousedown`) calls `toggleFold`.

- [ ] **Step 3: Gate and commit**

```bash
git add src/tests/component/MarkdownEditor.test.ts
git commit -m "Pin caret-inside reveal and keyboard fold on the gutter button"
```

---

### Task 3: Gutter and reveal CSS; remove the band CSS

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (the `EditorView.theme` object, the fold block around lines 202-263)

- [ ] **Step 1: Remove the band rules**

Delete the `.cm-line:has(.cm-cairn-fold-band)` rule and every `.cm-cairn-fold-band` rule (the block
roughly lines 202-234). Keep the `.cm-cairn-folded-row` wash, the `.cm-cairn-fold-pill` rules, and
the `.cm-cairn-fold-flash` rule.

- [ ] **Step 2: Add the gutter rules**

Add, in the same theme object:

```ts
// The fold gutter: a fixed ~22px column left of the content. Empty at rest; the chevron reveals on
// hovering the gutter cell (the VS Code / Zed / Obsidian standard), and a folded or caret-active
// row forces it on. One rotating chevron in the directive ink; the rails carry depth, so the ink
// does not restep.
'.cm-cairn-fold-gutter': { width: '22px' },
'.cm-cairn-fold-gutter .cm-gutterElement': { display: 'flex', alignItems: 'stretch', padding: '0' },
'.cm-cairn-fold-btn': {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  padding: '0',
  background: 'transparent',
  border: '0',
  cursor: 'pointer',
  color: 'var(--cairn-directive-ink-2, oklch(50% 0.16 300))',
},
'.cm-cairn-fold-btn svg': {
  width: '11px',
  height: '11px',
  opacity: '0',
  transition: 'opacity 120ms ease, transform 120ms ease',
},
// Reveal on gutter-cell hover; folded and caret-active force it on.
'.cm-cairn-fold-gutter .cm-gutterElement:hover .cm-cairn-fold-btn svg, .cm-cairn-fold-folded svg, .cm-cairn-fold-active svg':
  { opacity: '1' },
// Folded rotates the single chevron to point right.
'.cm-cairn-fold-folded svg': { transform: 'rotate(-90deg)' },
// Caret-active takes the stronger ink.
'.cm-cairn-fold-active': { color: 'var(--cairn-directive-ink-active, oklch(46% 0.16 300))' },
// A visible focus ring for keyboard users.
'.cm-cairn-fold-btn:focus-visible': {
  outline: '2px solid color-mix(in oklab, var(--color-primary) 70%, transparent)',
  outlineOffset: '-2px',
  borderRadius: '4px',
},
// No-hover pointers (touch) cannot reveal on hover, so the chevron is persistent and legible.
'@media (hover: none)': { '.cm-cairn-fold-btn svg': { opacity: '0.65' } },
```

- [ ] **Step 3: Extend focus-mode dimming to the gutter button, keeping a folded chevron legible**

Find the focus-dim fold rule (around line 279, `.cm-cairn-focus-dim .cm-cairn-fold-band svg, .cm-cairn-focus-dim .cm-cairn-fold-pill`). Replace the `fold-band` selector with the gutter button, and add a floor so a folded chevron stays visible when dimmed:

```ts
'.cm-cairn-focus-dim .cm-cairn-fold-btn svg, .cm-cairn-focus-dim .cm-cairn-fold-pill': {
  color: 'var(--cairn-focus-dim-ink, oklch(66% 0.01 75))',
},
// A folded block outside the focus paragraph must stay findable: keep its chevron visible.
'.cm-cairn-focus-dim .cm-cairn-fold-folded svg': { opacity: '1' },
```

- [ ] **Step 4: Verify in the showcase (visual)**

Run: `npm run package`, then build and preview `examples/showcase` and open `/admin/posts`, open a
post with a directive block. Confirm: empty gutter at rest, chevron on gutter hover, right-chevron +
wash + pill when folded, down active chevron with the caret inside, both themes. The component-test
screenshots regenerate in Task 5.

- [ ] **Step 5: Gate and commit**

```bash
git add src/lib/components/MarkdownEditor.svelte
git commit -m "Style the fold gutter and drop the in-text band CSS"
```

---

### Task 4: Restore the opener row's innermost rail bar

**Files:**
- Modify: `src/lib/components/editor-highlight.ts`
- Modify: `src/lib/components/MarkdownEditor.svelte` (the `rails` helper and `railRules`)
- Test: `src/tests/component/MarkdownEditor.test.ts`

The in-text chevron used to stand in for the opener's innermost bar, so the rail dropped it. The
gutter chevron sits left of all rails, so the opener row paints its full rail now.

- [ ] **Step 1: Update the rail test**

Rewrite the test "replaces the opener-row innermost rail bar with the chevron and keeps it clickable"
(around line 858) to assert the opener now carries its full rail and the gutter button:

```ts
it('keeps the opener row full rail and a gutter fold button', async () => {
  const screen = await renderEditor({ value: NESTED_FOLDABLE_DOC }); // a depth-2 panel inside a depth-1 split
  await waitForEditor(screen.container);
  const opener = lineWith(screen.container, ':::panel')!;
  // The opener paints its own innermost bar (no dropped bar); assert the inner box-shadow is present.
  const shadow = getComputedStyle(opener).boxShadow;
  expect(shadow).not.toBe('none');
  // And the fold control lives in the gutter, not on the opener line.
  await expect.poll(() => foldBtn(screen.container)).toBeTruthy();
  expect(opener.querySelector('.cm-cairn-fold-btn')).toBeNull();
});
```

In the wash test "washes the folded opener row..." (around line 890), fold via the gutter button
instead of the band, and update the comment that said the panel's innermost bar is the one the
chevron replaces (it is no longer replaced):

```ts
const btn = foldBtn(screen.container)!;
await userEvent.click(btn);
```

- [ ] **Step 2: Run the rail test, watch it fail**

Run: `npx vitest run src/tests/component/MarkdownEditor.test.ts -t "full rail and a gutter fold button"`
Expected: FAIL (the opener still drops its inner bar via the `dropInnermost` rule).

- [ ] **Step 3: Remove the opener bar-drop**

In `src/lib/components/editor-highlight.ts`: delete the `openerLine` decoration (the
`const openerLine = Decoration.line({ class: 'cm-cairn-directive-opener' })` line) and its use in
`buildDirectiveDecorations` (the `openerLines` set and the `if (openerLines.has(...)) builder.add(...,
openerLine)` block). The `containerRanges` import stays only if still used; remove it from the import
if it becomes unused.

In `src/lib/components/MarkdownEditor.svelte`: remove the `dropInnermost` parameter from the `rails`
helper and its branch, and delete the two opener `railRules` entries
(`.cm-cairn-directive-fence.cm-cairn-directive-opener...` and `.cm-cairn-caret-block.cm-cairn-directive-opener...`).
The remaining `rails(depth)` / `rails(depth, true)` calls keep every bar.

- [ ] **Step 4: Run the rail test, watch it pass; run the full file**

Run: `npx vitest run src/tests/component/MarkdownEditor.test.ts -t "full rail and a gutter fold button"`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

```bash
git add src/lib/components/editor-highlight.ts src/lib/components/MarkdownEditor.svelte src/tests/component/MarkdownEditor.test.ts
git commit -m "Restore the opener row's full rail now the chevron is in the gutter"
```

---

### Task 5: Sweep the remaining fold tests onto the gutter button

**Files:**
- Modify: `src/tests/component/MarkdownEditor.test.ts`

Every remaining test that clicks `.cm-cairn-fold-band` (the safety-invariant tests around lines
805-852, the caret-without-fold test around 880, the unbalanced-opener test around 914) must use the
gutter button. Behavior assertions stay identical.

- [ ] **Step 1: Replace the band clicks and queries**

In each remaining fold test, replace `foldBand(screen.container)` with `foldBtn(screen.container)`
and the `.cm-cairn-fold-band` queries with `.cm-cairn-fold-btn`. For the unbalanced-opener test,
assert `foldBtn(screen.container)` is null (an unbalanced opener gets no gutter control). For the
"places the caret without folding when the opener text is clicked" test, drop the comment about the
gutter band; clicking the opener text places the caret and the block stays open (assert
`foldPill(...)` is null), and there is no in-text band to avoid anymore.

Confirm no `.cm-cairn-fold-band` references remain:

```bash
grep -n "cm-cairn-fold-band\|foldBand" src/tests/component/MarkdownEditor.test.ts
```

Expected: no output.

- [ ] **Step 2: Run the whole fold suite and the probe screenshots**

Run: `npx vitest run src/tests/component/MarkdownEditor.test.ts`
Run: `npx vitest run src/tests/component/probe.test.ts -u` (regenerate the fold-related screenshots:
`probe-focus-then-fold`, `probe-shifted-char-event-folds`, `probe-select-all-unfolds`, and the
`MarkdownEditor` fold screenshots). Inspect the regenerated PNGs to confirm the gutter renders as
intended, then keep them.

Expected: PASS, with regenerated snapshots that show the gutter affordance.

- [ ] **Step 3: Full gate and commit**

Run: `npm run check` (0/0) and `npm test` (exit 0).

```bash
git add src/tests/component/MarkdownEditor.test.ts src/tests/component/__screenshots__
git commit -m "Move the remaining fold tests onto the gutter button"
```

---

### Task 6: Update the docs

**Files:**
- Modify: `docs/internal/design/2026-06-12-folding-interaction-notes.md`
- Modify: `docs/internal/admin-design-system.md`
- Modify: `docs/internal/design/2026-06-12-editor-shell-gold-standard.html`

Docs-only; no `code-simplifier`, no test gate beyond `prose-guard` on the markdown.

- [ ] **Step 1: Supersede the old folding note**

At the top of `2026-06-12-folding-interaction-notes.md`, add a short superseded banner pointing to
`docs/superpowers/specs/2026-06-14-fold-gutter-design.md` and naming the reversed decisions (the
in-text band, the depth-shifting chevron x, gutter-hover replacing the 28px-band reveal). Leave the
rest as history.

- [ ] **Step 2: Sanction the gutter in the design system**

In `docs/internal/admin-design-system.md`, add a short note (near the editor/surface guidance) that
the fold gutter is a sanctioned exception to the otherwise gutter-free prose surface: empty-until-
hover keeps it quiet, the chevron lives in a fixed column, and the Obsidian precedent is the
rationale. This stops a later pass from "fixing" the chevron back into the text.

- [ ] **Step 3: Annotate the gold-standard mockup**

In `2026-06-12-editor-shell-gold-standard.html`, add a comment by the fold rows noting the affordance
is superseded by `docs/internal/design/2026-06-14-fold-gutter-mockup.html` (the gutter treatment), so
the gold standard is not read as current for folding.

- [ ] **Step 4: Commit**

```bash
git add docs/internal/design/2026-06-12-folding-interaction-notes.md docs/internal/admin-design-system.md docs/internal/design/2026-06-12-editor-shell-gold-standard.html
git commit -m "Point the fold docs at the gutter design"
```

---

## Self-review notes

- **Spec coverage:** gutter architecture (Tasks 1, 3), caret-inside (Tasks 1, 2), a11y focusable
  button + keyboard + tooltip (Tasks 1, 2), single rotating chevron + uniform ink (Tasks 1, 3),
  nothing-at-rest + gutter-hover reveal (Task 3), dark floor + touch + focus-dim (Task 3), opener
  rail restore (Task 4), pill/wash/flash/safety/keymap kept (no task changes them, verified by the
  swept tests in Task 5), docs (Task 6). The `Fold / unfold` help-sheet row already exists; verified,
  no task.
- **Non-goals untouched:** no heading/list folding, no fold-all, no body height animation, no fold in
  Preview, no persistence. The deferred whole-line-hover bridge and first-run nudge stay in the
  spec's watch items.
- **Type consistency:** the test helper is `foldBtn` and the class is `cm-cairn-fold-btn` throughout;
  the marker is `FoldMarker`; the gutter is `foldGutterColumn`. `foldDecorations` is called with
  `(view, ranges)` after Task 1 trims its signature.
