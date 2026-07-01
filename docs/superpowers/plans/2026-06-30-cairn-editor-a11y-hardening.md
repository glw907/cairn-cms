# Editor accessibility hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the cairn markdown editor a coherent accessibility model, diagnostic awareness and traversal, fold-control disclosure semantics, an accessible name on the text surface, and an autocomplete-ARIA regression guard, all through CodeMirror's public extension points.

**Architecture:** Add a general, top-level diagnostics-a11y surface (a summary live-region `ViewPlugin` plus an `F8`/`Shift-F8` traversal keymap) keyed off the public `forEachDiagnostic`, beside the existing spellcheck-gated suggestion popover; give the fold control `aria-expanded` and a state-neutral name; name the `.cm-content` textbox via `contentAttributes`; and lock the inherited and new a11y with tests. No CodeMirror-internal coupling is added, so the `check:cm-internals` floor does not move.

**Tech Stack:** Svelte 5 (runes), CodeMirror 6 (`@codemirror/view` 6.43, `@codemirror/state` 6.6, `@codemirror/lint` 6.9.7, `@codemirror/autocomplete` 6.20.2), vitest + vitest-browser-svelte (chromium component project), the `fake-spell-worker` seam.

**Design reference (authoritative):** `docs/superpowers/specs/2026-06-30-cairn-editor-a11y-hardening-design.md`. Every task honors it; where this plan and the spec disagree, the spec wins and the discrepancy is a plan bug to fix.

## Global Constraints

- **Public API only.** Every extension binds a public CodeMirror seam (`forEachDiagnostic`, `nextDiagnostic`/`previousDiagnostic`, the `keymap` facet, `EditorView.contentAttributes`, `ViewPlugin`). No new `.cm-*` chrome class in any external stylesheet or dynamic selector. `npm run check:cm-internals` must stay PASS at its current floor (`.cm-tooltip`); do not edit `scripts/cm-internals-allowlist.json`.
- **Reuse the editor's own CodeMirror module instances.** Wire new extensions from the already-imported `viewMod`, `stateMod`, `lintMod` inside `MarkdownEditor.svelte`'s `onMount` (a separate dynamic import resolves to a different instance and breaks `instanceof`). Pass modules in, the way `cairnSpellcheck` and the popover already do.
- **Traversal default = the stock exported commands.** Bind `lintMod.nextDiagnostic` / `lintMod.previousDiagnostic` to `F8` / `Shift-F8`. Never wire `lintKeymap` or `openLintPanel`. The hand-rolled `forEachDiagnostic` pair is a contingency, added only if a test proves the stock commands surface the built-in tooltip or their select-the-range behavior is unwanted.
- **On by default, no new prop.** The announcer, traversal, and accessible name are always on; accessibility is not opt-in. The announcer and traversal are top-level (general, any lint source); the spellcheck-specific popover stays inside `spellcheckCompartment`.
- **Additive and non-breaking.** No public export is expected. The `CHANGELOG.md` entry is a no-consumer-action note under `## Unreleased`; `package.json` is untouched; the pass holds unpublished.
- **Test discipline.** Component tests render `MarkdownEditor` with flat props and the `makeFakeWorker` seam (`spellcheckTest: { createWorker: fake.create, assumeReady: true }`), poll with `COLD_START`, and assert computed structure/tokens, never pixels. Use NON-adjacent misspelling occurrences (`teh cat teh dog`, not `teh teh`, which the objective linter flags as a doubled word). The spellcheck surface is the repo's flakiest; prefer settle-aware polls over fixed counts.
- **Full gate before a pass is done** (run by the orchestrator, not necessarily each task): `npm run check` 0/0, `npm test` exit 0, `npm run check:comments`, `npm run check:cm-internals`, `npm run check:custom-surface`, `npm run check:docs`, and the reference/package doc gates.

---

## File structure

- **Create** `src/lib/components/editor-diagnostics-announcer.ts` — the summary live-region `ViewPlugin` and the pure `summarizeDiagnostics` helper. Owns one visually hidden polite region.
- **Create (contingency only)** `src/lib/components/editor-diagnostic-traversal.ts` — the hand-rolled `forEachDiagnostic` next/previous commands. Created only if Task 3's composition check fails.
- **Modify** `src/lib/components/MarkdownEditor.svelte` — add three top-level extensions to the `EditorView` array (lines 648-733): the `contentAttributes` name, the announcer, the traversal keymap.
- **Modify** `src/lib/components/editor-folding.ts` — add `aria-expanded` and a state-neutral block name to `FoldMarker.toDOM` and the folded-row `placeholderDOM`.
- **Modify** `src/lib/components/ShortcutsDialog.svelte` — add the `F8` / `Shift-F8` rows to the shortcuts sheet.
- **Create** `src/tests/component/editor-a11y.test.ts` — accessible name, announcer, traversal, fold disclosure, autocomplete-ARIA guard, and the settle-under-resting-caret case.
- **Create** `src/tests/unit/diagnostics-announcer.test.ts` — the pure `summarizeDiagnostics` cases.
- **Modify** `src/tests/component/suggestion-popover.test.ts` — add the WCAG 1.4.13 and no-focus-theft and overlapping-diagnostic assertions (they extend the popover's existing suite).
- **Modify** `src/tests/unit/codemirror-public-api.test.ts` — assert `nextDiagnostic`, `previousDiagnostic`, `forEachDiagnostic`, and `EditorView.contentAttributes` stay on the public surface.
- **Modify docs** `CHANGELOG.md`, `docs/guides/write-in-the-editor.md`, `docs/internal/cm-editing-surface-alignment.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md`.

Tasks 1-3 all edit the `MarkdownEditor.svelte` extensions array, so they run in order. Tasks 4-7 touch disjoint files and may run after Task 3 in any order. Task 8 (docs) runs last.

---

## Task 1: Accessible name on the editing surface

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (the `EditorView` `extensions` array, 648-733)
- Test: `src/tests/component/editor-a11y.test.ts` (create)

**Interfaces:**
- Consumes: `viewMod.EditorView` (already in scope in `onMount`).
- Produces: nothing exported. The live `.cm-content` carries `aria-label="Markdown source"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { COLD_START } from './fake-spell-worker.js';

describe('editor accessible name', () => {
  it('gives the .cm-content textbox an accessible name', async () => {
    const { container } = render(MarkdownEditor, { value: 'hello', name: 'body' });
    await expect.poll(() => container.querySelector('.cm-content'), COLD_START).toBeTruthy();
    const content = container.querySelector('.cm-content')!;
    expect(content.getAttribute('role')).toBe('textbox');
    expect(content.getAttribute('aria-label')).toBe('Markdown source');
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/tests/component/editor-a11y.test.ts -t "accessible name"`
Expected: FAIL — `aria-label` is null on the live content node.

- [ ] **Step 3: Add the extension**

In the `extensions` array (beside `theme`, around line 720), add:

```ts
EditorView.contentAttributes.of({ 'aria-label': 'Markdown source' }),
```

Reuse the exact string the SSR-fallback `<textarea>` already carries (search the file for `aria-label` on the fallback textarea) so the SSR-to-hydrated swap is consistent.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/tests/component/editor-a11y.test.ts -t "accessible name"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/MarkdownEditor.svelte src/tests/component/editor-a11y.test.ts
git commit -m "feat(editor): give the .cm-content textbox an accessible name"
```

---

## Task 2: Diagnostics-summary announcer

**Files:**
- Create: `src/lib/components/editor-diagnostics-announcer.ts`
- Modify: `src/lib/components/MarkdownEditor.svelte` (extensions array; wire the announcer top-level)
- Test: `src/tests/unit/diagnostics-announcer.test.ts` (create), `src/tests/component/editor-a11y.test.ts` (extend)

**Interfaces:**
- Consumes: `{ view: typeof import('@codemirror/view'); lint: typeof import('@codemirror/lint') }` (pass `viewMod` and `lintMod`). Reads diagnostics via `lint.forEachDiagnostic(state, (d) => …)`; groups by `d.source` (`'cairn-spellcheck'` vs `'cairn-objective'`).
- Produces:
  - `export function summarizeDiagnostics(counts: { spelling: number; style: number }): string` — pure; returns e.g. `"3 spelling suggestions, 1 style issue"`, correctly pluralized; returns `""` for `{ spelling: 0, style: 0 }`.
  - `export function cairnDiagnosticsAnnouncer(modules: { view; lint }): Extension` — a `ViewPlugin` owning one visually hidden `aria-live="polite"` region (class `cairn-cm-diagnostics-live`).

Mirror the popover's live-region pattern exactly (see `editor-suggestion-popover.ts:146-178`): a `ViewPlugin.fromClass` that appends a visually hidden polite/atomic `<div>` in the constructor, updates on `docChanged || selectionSet || any tr.effects.length`, and removes the node on destroy. Two differences: (1) debounce the announcement (a `setTimeout` cleared on each update, ~1 second) so typing does not chatter; (2) dedupe by the composed summary string. Announce `next = summarizeDiagnostics(counts) || (prevAnnounced ? 'No issues' : '')`; announce only when `next && next !== prevAnnounced`, then set `prevAnnounced = next` (an empty summary resets it to `''`). This makes a cleared set say "No issues" once and never announce empty→empty.

- [ ] **Step 1: Write the failing unit test (the pure helper)**

```ts
import { describe, it, expect } from 'vitest';
import { summarizeDiagnostics } from '../../lib/components/editor-diagnostics-announcer.js';

describe('summarizeDiagnostics', () => {
  it('pluralizes and joins both kinds', () => {
    expect(summarizeDiagnostics({ spelling: 3, style: 1 })).toBe('3 spelling suggestions, 1 style issue');
  });
  it('drops a zero kind and singularizes', () => {
    expect(summarizeDiagnostics({ spelling: 1, style: 0 })).toBe('1 spelling suggestion');
    expect(summarizeDiagnostics({ spelling: 0, style: 2 })).toBe('2 style issues');
  });
  it('is empty for no diagnostics', () => {
    expect(summarizeDiagnostics({ spelling: 0, style: 0 })).toBe('');
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/tests/unit/diagnostics-announcer.test.ts`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Implement `summarizeDiagnostics` and `cairnDiagnosticsAnnouncer`**

Write `editor-diagnostics-announcer.ts` with the pure helper and the `ViewPlugin` per the Interfaces block. Copy the visually hidden style string and the update-trigger predicate from `editor-suggestion-popover.ts`; class name `cairn-cm-diagnostics-live`. The count read:

```ts
const counts = { spelling: 0, style: 0 };
lint.forEachDiagnostic(view.state, (d) => {
  if (d.source === 'cairn-objective') counts.style += 1;
  else counts.spelling += 1;
});
```

- [ ] **Step 4: Run the unit test, verify it passes**

Run: `npx vitest run src/tests/unit/diagnostics-announcer.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the announcer top-level and write the component test**

In `MarkdownEditor.svelte`, add to the extensions array (top level, NOT inside `spellcheckCompartment`):

```ts
announcerMod.cairnDiagnosticsAnnouncer({ view: viewMod, lint: lintMod }),
```

Import it beside the other editor-module imports (`const announcerMod = await import('./editor-diagnostics-announcer.js');`). Add a component test:

```ts
it('announces a settled diagnostics summary through a polite region', async () => {
  const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
  const { container } = render(MarkdownEditor, {
    value: 'teh cat teh dog', name: 'body', spellcheck: true,
    spellcheckTest: { createWorker: fake.create, assumeReady: true },
  });
  await expect
    .poll(() => container.querySelector('[aria-live="polite"].cairn-cm-diagnostics-live')?.textContent, COLD_START)
    .toContain('spelling');
});
```

(Import `makeFakeWorker`, `COLD_START` from `./fake-spell-worker.js`.)

- [ ] **Step 6: Run the component test, verify it passes**

Run: `npx vitest run src/tests/component/editor-a11y.test.ts -t "announces a settled"`
Expected: PASS. If flaky, widen the poll to `COLD_START` and assert `.toContain('spelling')` rather than an exact string.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/editor-diagnostics-announcer.ts src/lib/components/MarkdownEditor.svelte \
        src/tests/unit/diagnostics-announcer.test.ts src/tests/component/editor-a11y.test.ts
git commit -m "feat(editor): announce a settled diagnostics summary to a polite live region"
```

---

## Task 3: Diagnostic traversal (F8 / Shift-F8)

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (extensions array; add the traversal keymap)
- Modify: `src/lib/components/ShortcutsDialog.svelte` (add the two rows)
- Create (contingency only): `src/lib/components/editor-diagnostic-traversal.ts`
- Test: `src/tests/component/editor-a11y.test.ts` (extend)

**Interfaces:**
- Consumes: `lintMod.nextDiagnostic`, `lintMod.previousDiagnostic` (`Command`s), `viewMod.keymap`.
- Produces: `F8` selects the next diagnostic range and opens the popover on arrival; `Shift-F8` the previous.

- [ ] **Step 1: Write the failing test (composition check)**

```ts
it('F8 selects the next diagnostic and opens the popover, not the stock tooltip', async () => {
  const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the', 'ten'] });
  const { container } = render(MarkdownEditor, {
    value: 'teh cat teh dog', name: 'body', spellcheck: true,
    spellcheckTest: { createWorker: fake.create, assumeReady: true },
  });
  await expect.poll(() => container.querySelector('.cm-lintRange-info'), COLD_START).toBeTruthy();
  await userEvent.click(container.querySelector('.cm-content')!); // focus the editor, caret at start
  await userEvent.keyboard('{F8}');
  // The recipe popover appears (caret landed in a diagnostic range); the stock lint tooltip never mounts.
  await expect.poll(() => container.querySelector('.cairn-cm-suggest'), COLD_START).toBeTruthy();
  expect(container.querySelector('.cm-tooltip-lint')).toBeNull();
  expect(document.querySelector('.cm-diagnosticAction')).toBeNull();
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/tests/component/editor-a11y.test.ts -t "F8 selects"`
Expected: FAIL — no popover appears (F8 unbound).

- [ ] **Step 3: Bind the stock commands**

In `MarkdownEditor.svelte`, add to the extensions array (top level):

```ts
keymap.of([
  { key: 'F8', run: lintMod.nextDiagnostic },
  { key: 'Shift-F8', run: lintMod.previousDiagnostic },
]),
```

- [ ] **Step 4: Run it, verify it passes (the composition check)**

Run: `npx vitest run src/tests/component/editor-a11y.test.ts -t "F8 selects"`
Expected: PASS. **If it fails because a `.cm-tooltip-lint` mounts or the select-the-word behavior is unwanted** (the two contingency triggers from the spec), create `editor-diagnostic-traversal.ts` with `moveToNextDiagnostic`/`moveToPreviousDiagnostic` built on `lint.forEachDiagnostic` (land a collapsed caret at the range start, wrap at the ends) and bind those instead. Add a note in the commit body if the contingency was taken.

- [ ] **Step 5: Add the shortcuts-sheet rows**

In `ShortcutsDialog.svelte`, add rows for `F8` (Next issue) and `Shift+F8` (Previous issue) beside the existing editor shortcuts. Match the file's existing row markup and copy voice.

- [ ] **Step 6: Run the full editor-a11y file, verify green**

Run: `npx vitest run src/tests/component/editor-a11y.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/MarkdownEditor.svelte src/lib/components/ShortcutsDialog.svelte \
        src/tests/component/editor-a11y.test.ts
git commit -m "feat(editor): bind F8/Shift-F8 to diagnostic traversal"
```

---

## Task 4: Fold-control disclosure semantics

**Files:**
- Modify: `src/lib/components/editor-folding.ts` (`FoldMarker.toDOM`, the folded-row `placeholderDOM`)
- Test: `src/tests/component/editor-a11y.test.ts` (extend)

**Interfaces:**
- Consumes: the existing `FoldMarker` (whose `container` is a `ContainerRange` of `{ fromLine, toLine, depth }`) and `placeholderDOM(view, onclick, lines)`. Read the current code first.
- Produces: both fold controls carry `aria-expanded` (`"true"` expanded, `"false"` folded) and a state-neutral `aria-label` naming the block.

Read `editor-folding.ts` before editing. The gutter button already sets `aria-label` "Fold this section" / "Unfold this section" and the pill "Show N hidden lines"; the label is present, so the work is (a) add `aria-expanded` keyed on the marker's `folded` flag in `toDOM` (its `eq` already forces a rebuild when `folded` flips), and (b) REPLACE the state-verb label with a state-neutral name for the block, so `aria-expanded` is the sole state signal. The marker carries only line numbers, so read the opener line's text from `view.state.doc.line(container.fromLine + 1).text` to derive the name; the pill's `placeholderDOM` has no `ContainerRange`, so thread the name (or the container) in to name its block.

- [ ] **Step 1: Write the failing test**

```ts
it('fold control exposes aria-expanded and a state-neutral name', async () => {
  const doc = ':::note\nbody line one\nbody line two\n:::\n';
  const { container } = render(MarkdownEditor, { value: doc, name: 'body' });
  await expect.poll(() => container.querySelector('.cm-cairn-fold-btn'), COLD_START).toBeTruthy();
  const btn = container.querySelector('.cm-cairn-fold-btn')!;
  expect(btn.getAttribute('aria-expanded')).toBe('true'); // expanded at rest
  const label = btn.getAttribute('aria-label') ?? '';
  expect(label.toLowerCase()).not.toMatch(/fold|unfold|show/); // state-neutral, names the block
});
```

(Adjust the fixture and selector to the real fold markup after reading `editor-folding.ts`; the assertion contract is: `aria-expanded` present and correct, label state-neutral.)

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/tests/component/editor-a11y.test.ts -t "fold control exposes"`
Expected: FAIL — no `aria-expanded`, label is a state verb.

- [ ] **Step 3: Implement the disclosure semantics** in `toDOM` and `placeholderDOM` per the Interfaces block. No `.cm-*` chrome selector is added; attributes go on the existing `cm-cairn-fold-btn` DOM via `setAttribute`.

- [ ] **Step 4: Run it, verify it passes**

Run: `npx vitest run src/tests/component/editor-a11y.test.ts -t "fold control exposes"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/editor-folding.ts src/tests/component/editor-a11y.test.ts
git commit -m "feat(editor): give the fold control aria-expanded and a state-neutral name"
```

---

## Task 5: Autocomplete ARIA regression guard

**Files:**
- Test only: `src/tests/component/editor-a11y.test.ts` (extend)

**Interfaces:** none. Asserts CodeMirror's inherited APG combobox ARIA on the `[[` link-completion popup. No production change.

- [ ] **Step 1: Write the test**

```ts
it('link-completion inherits CodeMirror\'s combobox ARIA', async () => {
  const { container } = render(MarkdownEditor, {
    value: '', name: 'body',
    // supply the completion source the editor wires (see link-completion.ts); if the harness needs a
    // linkCompletions fixture, build a minimal one per that module's signature.
  });
  await expect.poll(() => container.querySelector('.cm-content'), COLD_START).toBeTruthy();
  await userEvent.click(container.querySelector('.cm-content')!);
  await userEvent.keyboard('[[');
  await expect.poll(() => container.querySelector('.cm-tooltip-autocomplete [role="listbox"]'), COLD_START).toBeTruthy();
  const content = container.querySelector('.cm-content')!;
  expect(content.getAttribute('aria-autocomplete')).toBe('list');
  expect(content.getAttribute('aria-controls')).toBeTruthy();
  const listbox = container.querySelector('.cm-tooltip-autocomplete [role="listbox"]')!;
  expect(listbox.getAttribute('aria-label')).toBeTruthy();
  expect(listbox.querySelector('[role="option"]')).toBeTruthy();
});
```

Read `link-completion.ts` and the existing autocomplete wiring to supply whatever prop makes `completionSources` non-empty in the test render. If the completion needs committed content to suggest, provide a minimal fixture the module accepts.

- [ ] **Step 2: Run it, verify it passes** (this guards existing behavior, so it should pass immediately)

Run: `npx vitest run src/tests/component/editor-a11y.test.ts -t "combobox ARIA"`
Expected: PASS. A failure here means the completion is not wired in the test render; fix the fixture, not production.

- [ ] **Step 3: Commit**

```bash
git add src/tests/component/editor-a11y.test.ts
git commit -m "test(editor): guard the inherited autocomplete combobox ARIA"
```

---

## Task 6: WCAG 1.4.13 and focus-discipline assertions

**Files:**
- Modify: `src/tests/component/suggestion-popover.test.ts` (extend the existing suite)
- Possibly modify: `src/lib/components/editor-suggestion-popover.ts` (only if an assertion exposes a real gap)

**Interfaces:** none new. Locks the popover's existing behavior as named WCAG 1.4.13 assertions and adds the missing cases.

- [ ] **Step 1: Add the assertions** to `suggestion-popover.test.ts`:
  - **No focus theft:** after the popover appears (caret in range) but before `Alt-Enter`, `document.activeElement` is inside `.cm-content`, not a popover button.
  - **1.4.13 Dismissable + persistent:** Escape returns focus to `.cm-content` (the existing test frames this); add that the popover stays mounted while the caret remains in the range across an unrelated re-lint (drive a second `setDiagnostics` via the fake worker and assert `.cairn-cm-suggest` is still the same node / still present).
  - **Overlapping diagnostics:** with a fixture where a spelling and an objective diagnostic cover one caret position, assert the popover and the diagnostics-summary announcer resolve to the same message and exactly one popover renders. Derive the expected winner from what actually renders, not a hardcoded ordering.

```ts
it('does not steal focus when the popover appears (WCAG 1.4.13, no focus theft)', async () => {
  const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
  const { container } = render(MarkdownEditor, props(fake));
  await openPopover(container); // clicks the underline, which focuses the content
  expect(document.activeElement?.closest('.cairn-cm-suggest')).toBeNull();
  expect(document.activeElement?.closest('.cm-content')).toBeTruthy();
});
```

- [ ] **Step 2: Run them, verify they pass** (behavior already holds)

Run: `npx vitest run src/tests/component/suggestion-popover.test.ts`
Expected: PASS. If the no-focus-theft or persistence assertion fails, that is a real regression — fix `editor-suggestion-popover.ts` minimally and note it in the commit.

- [ ] **Step 3: Commit**

```bash
git add src/tests/component/suggestion-popover.test.ts src/lib/components/editor-suggestion-popover.ts
git commit -m "test(editor): lock the popover WCAG 1.4.13 and focus-discipline behavior"
```

---

## Task 7: Public-API surface guard

**Files:**
- Modify: `src/tests/unit/codemirror-public-api.test.ts`

**Interfaces:** asserts the pass's newly relied-on public exports stay on the CodeMirror surface, so an upgrade that drops one fails loudly.

- [ ] **Step 1: Add assertions** that `@codemirror/lint` exports `nextDiagnostic`, `previousDiagnostic`, and `forEachDiagnostic` (functions), and that `@codemirror/view`'s `EditorView` has a `contentAttributes` facet. Match the file's existing assertion style.

- [ ] **Step 2: Run it, verify it passes**

Run: `npx vitest run src/tests/unit/codemirror-public-api.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tests/unit/codemirror-public-api.test.ts
git commit -m "test(editor): guard the CodeMirror public API the a11y pass binds"
```

---

## Task 8: Documentation

**Files:**
- Modify: `CHANGELOG.md`, `docs/guides/write-in-the-editor.md`, `docs/internal/cm-editing-surface-alignment.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md`

- [ ] **Step 1: CHANGELOG** — under `## Unreleased`, add an additive, no-consumer-action note: the editor gains a diagnostics-summary announcer, `F8`/`Shift-F8` issue traversal, fold-control disclosure semantics, and an accessible name on the text surface; no public API change, no action required.
- [ ] **Step 2: `write-in-the-editor.md`** — document jumping between issues with `F8`/`Shift-F8` and the spoken summary.
- [ ] **Step 3: `cm-editing-surface-alignment.md`** — mark the "Editor accessibility hardening" item advanced/done for the diagnostics, fold, and textbox-name work; record the theme-scope-is-sanctioned clarification for the future autocomplete/search pass.
- [ ] **Step 4: `ROADMAP.md`** — mark "Editor accessibility hardening (beyond the suggestion popover)" done (or note the residue) and prune it from `## Later`.
- [ ] **Step 5: `docs-friction-log.md`** — add any friction the writing surfaced (developer or editor perspective), including the backtick-in-message polish carried from the popover pass if it recurs.
- [ ] **Step 6: Run the doc gates**

Run: `npm run check:docs && npm run check:reference && npm run check:reference:signatures && npm run check:package`
Expected: all PASS. (No new export is expected, so `check:reference` should be unaffected.)

- [ ] **Step 7: Commit**

```bash
git add CHANGELOG.md docs/ ROADMAP.md
git commit -m "docs(editor): record the a11y hardening pass"
```

---

## Self-review notes

- **Spec coverage:** the spec's six in-scope items map to Task 1 (accessible name), Task 2 (announcer), Task 3 (traversal), Task 4 (fold), Task 5 (autocomplete guard), Task 6 (1.4.13 + overlap). The settle-under-resting-caret two-region case (spec §1) is covered by Task 2's component assertion plus Task 6's overlap case; add an explicit sequential assertion in Task 6 if the reviewer wants it named.
- **Type consistency:** `summarizeDiagnostics` and `cairnDiagnosticsAnnouncer` names are used identically in Task 2's create and MarkdownEditor wiring. The traversal binds `lintMod.nextDiagnostic`/`previousDiagnostic` (Task 3), the same names Task 7 guards.
- **Gate:** the orchestrator runs the full gate after Task 8; `check:cm-internals` must stay PASS with `cm-internals-allowlist.json` unchanged.
