# Edit Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the edit page into the spec's four zones and give the markdown editor full syntax highlighting, directive awareness, a complete GFM toolbar, spell check, and dirty tracking, polished to an exceptional standard for the non-technical editor.

**Architecture:** The `MarkdownEditor` seam stays thin: it gains a highlight theme, directive decorations, spellcheck attributes, and a `registerFormat` registration, while the toolbar moves OUT of the seam into the editor card that `EditPage` owns, where it can host the relocated pickers and the Write/Preview tabs. `EditPage` restructures into the four zones (sticky action header, editor column with hoisted title, grouped sidebar, feedback strip). No engine action, load, or type changes; this is an admin-surface pass over existing contracts.

**Tech Stack:** Svelte 5 runes, CodeMirror 6 (`@codemirror/lang-markdown`, `@lezer/highlight`), Tailwind 4 + DaisyUI 5 (scoped admin sheet), Vitest + vitest-browser-svelte, Playwright (showcase E2E and the design render loop).

**Spec:** `docs/superpowers/specs/2026-06-10-cairn-edit-page-redesign-design.md`. Read it first, and read `docs/internal/admin-design-system.md` before any component markup.

**Project gate (every task ends green):** the task's targeted test passes, `npm run check` 0/0, `npm test` exit 0 (re-run once if only the known `delivery-*-split` import-timeout flake fails), `npm run check:prose` clean when admin copy changed. Bump the minor to `0.40.0` in the docs task.

**Execution notes settled at plan time:**
1. Tasks 1 through 9 and 11 are well-specified mechanics: dispatch each to `cairn-implementer` (Sonnet). Task 10 is the design pass: it runs through the `frontend-design:frontend-design` skill on the frontier model with a fresh-agent critique loop (Geoff's call; "mythos" is not an available dispatch model in this harness, so the frontier dispatches use `fable`).
2. The toolbar leaves the `MarkdownEditor` seam. The seam's contract is "swapping the editor is a one-file change"; a toolbar hosting site pickers does not belong inside it. `EditorToolbar` becomes a child of the editor card in `EditPage`.
3. `RenameDialog` and `DeleteDialog` gain a programmatic `open()` and an optional hidden trigger, so the header overflow menu and the sidebar Address group can drive them without duplicating dialog markup.
4. Nothing changes in `src/lib/sveltekit/` or the engine. `EditData` already carries everything the new layout needs.

---

### Task 1: Complete the format command set

**Files:**
- Modify: `src/lib/components/markdown-format.ts`
- Test: `src/tests/unit/markdown-format.test.ts` (extend)

`FormatKind` grows from 7 kinds to the full GFM set. New kinds: `h2`, `h3` (replacing the single `heading`), `ol`, `strike`, `codeblock`, `hr`, `table`, `task`. The existing `heading` kind is removed (its two call sites are the toolbar, rewired in Task 4, and tests).

- [ ] **Step 1: Write the failing tests.** Extend `markdown-format.test.ts` with cases per new kind, following the file's existing table style:
  - `h2` on a plain line prefixes `## `; on a line already `## ` removes it (toggle); on a `### ` line replaces with `## `.
  - `h3` mirrors `h2` with `### `.
  - `ol` prefixes selected lines `1. `, `2. `, ... and toggles off; `task` prefixes `- [ ] ` and toggles; both follow the existing `ul` line-prefix mechanics.
  - `strike` wraps the selection in `~~` and unwraps when already wrapped (the `bold`/`italic` mechanics with a `~~` marker).
  - `codeblock` wraps the selected lines in ``` fences on their own lines, and unwraps when the selection is already fenced.
  - `hr` inserts `\n\n---\n\n` at the cursor (no selection semantics).
  - `table` inserts a starter grid at the cursor on its own blank-line-separated block, with the selection placed inside the first header cell:

    ```
    | Column 1 | Column 2 |
    | -------- | -------- |
    |          |          |
    |          |          |
    ```

- [ ] **Step 2: Run to verify the new cases fail** (`npx vitest run src/tests/unit/markdown-format.test.ts`).
- [ ] **Step 3: Implement.** Extend the `FormatKind` union and `applyMarkdownFormat`'s switch. Reuse the existing wrap/unwrap and line-prefix helpers; add a numbered-line-prefix variant for `ol` (each line gets its index) and a block-fence helper for `codeblock`. `table` and `hr` are pure insertions returning the selection positions per the test.
- [ ] **Step 4: Targeted test passes. Step 5: project gate** (the toolbar still references `heading`; update its single usage to `h2` minimally here so `check` stays green; Task 4 rebuilds the toolbar properly). **Step 6: Commit** (`Complete the markdown format command set`).

---

### Task 2: Directive detection (pure functions)

**Files:**
- Create: `src/lib/components/markdown-directives.ts`
- Test: `src/tests/unit/markdown-directives.test.ts`

Pure detection logic, no CodeMirror imports, so the decoration plugin in Task 3 stays a thin wrapper and the parsing is unit-testable.

- [ ] **Step 1: Write the failing tests.**

```ts
// src/tests/unit/markdown-directives.test.ts
import { describe, it, expect } from 'vitest';
import { directiveLineKind, findInlineDirectives } from '../../lib/components/markdown-directives.js';

describe('directiveLineKind', () => {
  it('recognizes container fences with and without names and attributes', () => {
    expect(directiveLineKind(':::gallery')).toBe('fence');
    expect(directiveLineKind('::: gallery')).toBe('fence');
    expect(directiveLineKind(':::gallery{cols=3}')).toBe('fence');
    expect(directiveLineKind(':::')).toBe('fence');
    expect(directiveLineKind('  :::')).toBe('fence');
  });
  it('recognizes leaf directives', () => {
    expect(directiveLineKind('::hr')).toBe('leaf');
    expect(directiveLineKind('::youtube[Intro]{id=abc}')).toBe('leaf');
  });
  it('rejects prose, emphasis, and URLs', () => {
    expect(directiveLineKind('Plain prose line')).toBeNull();
    expect(directiveLineKind('a sentence with :colons: inside')).toBeNull();
    expect(directiveLineKind('https://example.com')).toBeNull();
  });
});

describe('findInlineDirectives', () => {
  it('finds inline directives with ranges', () => {
    expect(findInlineDirectives('See :icon[ski]{size=16} here')).toEqual([{ from: 4, to: 23 }]);
  });
  it('ignores URLs, bare colons, and leaf/container forms', () => {
    expect(findInlineDirectives('https://example.com and ::leaf')).toEqual([]);
    expect(findInlineDirectives('a :smile: emoji')).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify they fail** (module not found). **Step 3: Implement.**

```ts
// src/lib/components/markdown-directives.ts
// Remark-directive detection for the editor's machinery highlighting (spec: directive syntax is
// styled distinctly so an editor can tell component scaffolding from prose). Pure functions; the
// CodeMirror decoration plugin wraps them.

const FENCE = /^\s{0,3}:::+\s*[\w-]*\s*(\{[^}]*\})?\s*$/;
const LEAF = /^\s{0,3}::[\w-]+(\[[^\]]*\])?(\{[^}]*\})?\s*$/;
const INLINE = /(?<![:\w]):[\w-]+\[[^\]]*\](\{[^}]*\})?/g;

/** Classify a whole line as a container fence, a leaf directive, or neither. */
export function directiveLineKind(line: string): 'fence' | 'leaf' | null {
  if (FENCE.test(line)) return 'fence';
  if (LEAF.test(line)) return 'leaf';
  return null;
}

/** Inline directive ranges (`:name[...]{...}`) within a line of text. */
export function findInlineDirectives(text: string): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const m of text.matchAll(INLINE)) {
    out.push({ from: m.index, to: m.index + m[0].length });
  }
  return out;
}
```

- [ ] **Step 4: Targeted pass. Step 5: gate. Step 6: Commit** (`Add directive detection for editor highlighting`).

---

### Task 3: The highlight theme, directive decorations, and spell check

**Files:**
- Create: `src/lib/components/editor-highlight.ts`
- Modify: `src/lib/components/MarkdownEditor.svelte`, `package.json` (add `@lezer/highlight` to dependencies; it is already transitive)
- Test: `src/tests/component/MarkdownEditor.test.ts` (extend), `src/tests/unit/editor-boundary.test.ts` (confirm still green; the new module must stay out of the server bundle path)

`editor-highlight.ts` exports two factories the editor consumes in `onMount` (it imports `@lezer/highlight` and `@codemirror/view` statically, so it may only ever be imported dynamically from the client path, like the rest of the CodeMirror surface):

```ts
// src/lib/components/editor-highlight.ts
// The editor's syntax colors and the directive machinery decorations. Colors reference the Warm
// Stone CSS variables so light and dark themes both resolve, and every token pair must hold WCAG
// AA against --color-base-100 (checked in the design pass).
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { directiveLineKind, findInlineDirectives } from './markdown-directives.js';

/** Markdown token colors over the admin theme variables. */
export function cairnHighlightStyle(): HighlightStyle {
  return HighlightStyle.define([
    { tag: tags.heading, color: 'var(--color-primary)', fontWeight: '700' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: tags.link, color: 'var(--color-info)' },
    { tag: tags.url, color: 'var(--color-info)' },
    { tag: tags.quote, color: 'var(--color-muted)', fontStyle: 'italic' },
    { tag: tags.monospace, color: 'var(--color-accent)' },
    { tag: tags.processingInstruction, color: 'var(--color-muted)' },
    { tag: tags.list, color: 'var(--color-muted)' },
  ]);
}

const fenceLine = Decoration.line({ class: 'cm-cairn-directive-fence' });
const leafLine = Decoration.line({ class: 'cm-cairn-directive-leaf' });
const inlineMark = Decoration.mark({ class: 'cm-cairn-directive-inline' });

function buildDirectiveDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const kind = directiveLineKind(line.text);
      if (kind === 'fence') builder.add(line.from, line.from, fenceLine);
      else if (kind === 'leaf') builder.add(line.from, line.from, leafLine);
      else {
        for (const r of findInlineDirectives(line.text)) {
          builder.add(line.from + r.from, line.from + r.to, inlineMark);
        }
      }
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

/** Line and mark decorations flagging remark-directive machinery. */
export function cairnDirectivePlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildDirectiveDecorations(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) this.decorations = buildDirectiveDecorations(update.view);
      }
    },
    { decorations: (v) => v.decorations },
  );
}
```

`MarkdownEditor.svelte` changes in `onMount`:
- Dynamic-import `./editor-highlight.js` alongside the CodeMirror modules.
- Replace `languageMod.syntaxHighlighting(languageMod.defaultHighlightStyle, { fallback: true })` with `languageMod.syntaxHighlighting(highlightMod.cairnHighlightStyle())` and add `highlightMod.cairnDirectivePlugin()`.
- Add spellcheck content attributes: `EditorView.contentAttributes.of({ spellcheck: 'true', autocorrect: 'on', autocapitalize: 'sentences' })`.
- Extend the inline `EditorView.theme` with the directive classes: `.cm-cairn-directive-fence` and `.cm-cairn-directive-leaf` get `backgroundColor: 'color-mix(in oklab, var(--color-accent) 8%, transparent)'` plus `color: 'var(--color-accent)'`; `.cm-cairn-directive-inline` gets `color: 'var(--color-accent)'` with the same soft background.

- [ ] **Step 1: Write the failing component tests.** Extend `MarkdownEditor.test.ts`: (a) mount with a doc containing `## Title`, `**bold**`, `:::gallery`, `::hr`, and `:icon[ski]{s=1}` lines, await the CodeMirror mount (the file shows the await pattern), and assert the content element has `spellcheck="true"`, a `.cm-cairn-directive-fence` line, a `.cm-cairn-directive-leaf` line, and a `.cm-cairn-directive-inline` mark; (b) assert a heading line renders with a styled span (the highlight style emits class-bearing spans; assert via `getComputedStyle` color differing from body text or the presence of a token class).
- [ ] **Step 2: Verify they fail. Step 3: Implement** (the module above plus the editor wiring). **Step 4: Targeted pass**, including the untouched `editor-boundary.test.ts`. **Step 5: gate. Step 6: Commit** (`Add the editor highlight theme, directive decorations, and spell check`).

---

### Task 4: The toolbar leaves the seam and grows the full set

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte` (remove the embedded toolbar; add `registerFormat`), `src/lib/components/EditorToolbar.svelte` (rebuild), `src/lib/components/EditPage.svelte` (host the toolbar in the editor card), `src/lib/components/LinkPicker.svelte` and `src/lib/components/ComponentInsertDialog.svelte` (trigger styling only if needed to sit in the toolbar row)
- Test: `src/tests/component/EditorToolbar.test.ts` (create), `src/tests/component/EditPage.test.ts` and `MarkdownEditor.test.ts` (adjust)

Mechanics:
- `MarkdownEditor` gains `registerFormat?: (fn: (kind: FormatKind) => void) => void`, registered in `onMount` beside `registerInsert`, and loses the `<EditorToolbar>` render and the `format` plumbing. The card chrome (border, rounded box) moves to the EditPage editor card so the toolbar and surface share one frame.
- `EditorToolbar` becomes the full spec toolbar. Props: `format: (kind: FormatKind) => void`, `mode: 'write' | 'preview'`, `onMode: (m: 'write' | 'preview') => void`, plus a Svelte 5 snippet prop `insertControls` rendered inside the Insert group (EditPage passes the LinkPicker, the ComponentInsertDialog trigger, and the disabled Image button through it).
- Groups, left to right with `divider` separators, per the spec: Text (Bold `bold`, Italic `italic`), Structure (H2 `h2`, H3 `h3`, Bulleted `ul`, Numbered `ol`, Quote `quote`, then a More dropdown with Strikethrough `strike`, Inline code `code`, Code block `codeblock`, Table `table`, Horizontal rule `hr`, Task list `task`), Insert (the `insertControls` snippet), and the Write/Preview segmented tabs pinned to the right end.
- The disabled Image button renders in EditPage's `insertControls`: `<button type="button" class="btn btn-ghost btn-sm btn-square" disabled aria-label="Image (coming soon)" title="Image (coming soon)">` with an image glyph in the house stroke style.
- ARIA toolbar pattern: `role="toolbar"` stays; implement a roving tabindex (one tab stop; ArrowLeft/ArrowRight move focus among enabled controls). The More menu is a DaisyUI dropdown whose menu items call `format` and close.
- Keyboard shortcuts: in EditPage, a `keydown` handler on the editor card maps Ctrl/Cmd+B to `format('bold')`, Ctrl/Cmd+I to `format('italic')`; Ctrl/Cmd+K opens the LinkPicker (it exposes `open()` in Task 7 style if it does not already; check its markup first). Save's Ctrl/Cmd+S arrives in Task 6.

- [ ] **Step 1: Write the failing tests.** `EditorToolbar.test.ts`: renders all primary controls with accessible names; the More menu lists the six secondary controls and clicking one calls `format` with the right kind; the tabs reflect `mode` and call `onMode`; roving tabindex (exactly one control with `tabindex="0"`, arrow keys move it). EditPage test additions: the toolbar renders inside the editor card; the Image button is present and disabled; Ctrl/Cmd+B reaches the registered format function (spyable via the registerFormat seam).
- [ ] **Step 2: Verify failures. Step 3: Implement. Step 4: Targeted pass. Step 5: gate** (`check:prose` covers the new labels). **Step 6: Commit** (`Move the toolbar to the editor card and complete the control set`).

---

### Task 5: Write / Preview tabs

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Test: `src/tests/component/EditPage.test.ts` (extend)

- Replace `showPreview`/`togglePreview`/`PREVIEW_KEY` with `mode = $state<'write' | 'preview'>('write')`. Remove the header preview toggle button (the header is rebuilt in Task 7; remove just the toggle here).
- The editor card renders the toolbar always; below it, the editor surface wrapped in a `class:hidden={mode === 'preview'}` container (CodeMirror stays mounted so caret, scroll, and undo history survive), and the preview section rendered when `mode === 'preview'` at full card width. The existing debounced render effect keys on `mode === 'preview'` instead of `showPreview`.
- Tab semantics live in the toolbar (Task 4's segmented control): `role="tablist"`/`role="tab"` with `aria-selected`, controlling `aria-controls` ids on the two panes.

- [ ] **Step 1: Failing tests.** Switching to Preview hides the editor surface (still in the DOM) and shows the rendered preview; switching back shows the editor with its content intact; the old localStorage key is never written.
- [ ] **Steps 2-5: fail, implement, pass, gate. Step 6: Commit** (`Replace the stacked preview with Write/Preview tabs`).

---

### Task 6: Dirty tracking, the leave guard, and Ctrl/Cmd+S

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Test: `src/tests/component/EditPage.test.ts` (extend)

- Dirty state: `const bodyDirty = $derived(body !== (form?.body ?? data.body));` plus `let fieldsDirty = $state(false)` set by an `oninput` listener on the form element (the sidebar fields are uncontrolled, so any input event marks them dirty; a save navigates and reloads, which resets state naturally). `const dirty = $derived(bodyDirty || fieldsDirty)`.
- The save-state indicator is consumed by the Task 7 header; this task exposes it as a derived string: `'Unsaved changes'` when dirty, `'Saved'` when `data.saved && !dirty`, empty otherwise. Render it temporarily beside the existing Save button so this task is testable standalone; Task 7 relocates it.
- Leave guard, both halves gated on `dirty && !busy`: a `beforeunload` listener (`event.preventDefault()`), and a SvelteKit `beforeNavigate` registered via dynamic import in `onMount` (`const nav = await import('$app/navigation').catch(() => null); nav?.beforeNavigate((n) => { if (dirtyNow() && !confirm('You have unsaved changes. Leave anyway?')) n.cancel(); })`). The dynamic import resolves in a real app and rejects silently in the component test project, which is the established workaround for `$app/*` in that project. The form's own submit must not trigger the guard (`busy` covers it).
- Ctrl/Cmd+S on the page (a window keydown listener added on mount, removed on destroy): `preventDefault()` and submit the edit form via `requestSubmit()` so the normal save path runs.

- [ ] **Step 1: Failing tests.** Typing in the body shows "Unsaved changes"; an input event in a sidebar field shows it too; mounting clean shows no indicator; `data.saved` with no edits shows "Saved"; Ctrl/Cmd+S calls `requestSubmit` on the form (spy via a submit listener that prevents default); a `beforeunload` listener is registered while dirty (dispatch a `beforeunload` Event and assert `defaultPrevented`).
- [ ] **Steps 2-5: fail, implement, pass, gate. Step 6: Commit** (`Track dirtiness, guard navigation, and add Ctrl+S save`).

---

### Task 7: The sticky action header

**Files:**
- Modify: `src/lib/components/EditPage.svelte`, `src/lib/components/DeleteDialog.svelte`, `src/lib/components/RenameDialog.svelte`
- Test: `src/tests/component/EditPage.test.ts`, `DeleteDialog.test.ts` (extend)

Dialog refactor first: `DeleteDialog` and `RenameDialog` each gain `export function open(): void` (calling their internal `showModal`) and a `trigger = true` prop; with `trigger={false}` they render only the dialog. Existing usages elsewhere are unaffected (the default keeps the button).

The header replaces the current `<header>` block:
- Wrapper: sticky under the admin topbar (`sticky z-10` with a top offset aligned to the topbar height; final value confirmed against `AdminLayout`'s topbar in the design pass), full-width, the admin surface background so content scrolls under it cleanly.
- Left: a breadcrumb link back to `/admin/${data.conceptId}` (label from `data.label`), then the title (`data.title`) with the id as the existing muted sub-line, then the status cluster: a status badge derived as `data.pending ? (data.published ? 'Edited' : 'New') : 'Published'` with the Task 9 colors matching ConceptList's vocabulary (`badge-warning`/`badge-info`/`badge-ghost`), the Hidden `badge-neutral` when the frontmatter draft field is set, and the Task 6 save-state indicator text.
- Right: an overflow dropdown (`aria-label="More actions"`, the "..." glyph) whose menu holds Discard changes (only when `data.pending`; opens the existing discard dialog) and Delete (calls `deleteDialog.open()`); then Publish (`btn btn-outline btn-primary`, `formaction="?/publish"`) and Save (`btn btn-primary`) rightmost. Both carry `form="cairn-edit-form"` (the edit form gains that id) so they can sit outside the form element; the busy/disabled wiring and `onEditSubmit` submitter logic move here unchanged.
- The sidebar's old action block (Save/Publish/Discard) is removed. The standing pending banner is removed (the badge cluster replaces it). The discard `<dialog>` itself stays where it is; only its trigger moved.

- [ ] **Step 1: Failing tests.** The header carries the breadcrumb, badge (each of the three states), Hidden badge stacking, and the indicator; Save and Publish sit in the header with `form="cairn-edit-form"` and still cross-disable; the overflow menu lists Delete always and Discard only when pending; the sidebar no longer contains buttons; the pending banner is gone.
- [ ] **Steps 2-5: fail, implement, pass, gate (`check:prose`). Step 6: Commit** (`Move lifecycle actions into a sticky edit header`).

---

### Task 8: Sidebar groups, the Address group, and the hoisted title

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Test: `src/tests/component/EditPage.test.ts` (extend)

- Title hoist: when `data.fields` contains a field named `title`, render it at the top of the editor column as a document-title input: `<input class="cairn-doc-title" name="title" ...>` styled large and borderless (the design pass owns the final look; functionally it is the same form field), and skip it in the sidebar loop. Adapters without a `title` field render nothing extra.
- The sidebar fieldset becomes three labeled groups, each a small uppercase eyebrow heading in the list-table label style: Details (all remaining fields except booleans named `draft`), Visibility (the `draft` boolean rendered as the Hidden toggle with the one-line explanation "Hidden entries stay off the site's lists and feeds, even when published."), and Address (the current slug shown read-only as `/{data.slug}` with a Change URL button beside it calling `renameDialog.open()`; the rename dialog renders with `trigger={false}`).
- A field literally named `draft` is the Hidden toggle by convention (both production adapters use it); a concept without one simply has no Visibility group.

- [ ] **Step 1: Failing tests.** The title field renders atop the editor column and not in the sidebar; the three groups render with their headings; the Hidden toggle carries the explanation; Address shows the slug and its button opens the rename dialog; a fields list without `title` or `draft` renders only Details.
- [ ] **Steps 2-5: fail, implement, pass, gate (`check:prose`). Step 6: Commit** (`Group the sidebar and hoist the document title`).

---

### Task 9: The feedback strip, word count, and Markdown help

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Create: `src/lib/components/MarkdownHelpDialog.svelte`
- Test: `src/tests/component/EditPage.test.ts` (extend)

- Feedback strip: the four transient flashes (`saved` without draft warning, `publishedFlash`, `discardedFlash`, `renamed`) consolidate into one strip rendered directly under the sticky header (one `{#if}` chain, one element, `alert-success` styling). The blocking alerts (error, renameError, deleteRefused list, brokenLinks list, draftWarning) keep their current inline treatment and placement above the form. The two sr-only live regions are unchanged.
- Editor card footer: a slim row under the editing surface with the word count (`body.trim() ? body.trim().split(/\s+/).length : 0`, label "N words") and a "Markdown help" link-button opening the new dialog.
- `MarkdownHelpDialog.svelte`: the house native-`<dialog>` pattern (the DeleteDialog recipe) holding a one-screen cheat sheet table: heading, bold, italic, link, list, numbered list, quote, code, table, horizontal rule, each as syntax beside its result description, plus one line naming the component blocks ("Lines starting with ::: are layout blocks; edit the text inside and leave the ::: lines alone."). All copy must clear `check:prose`.

- [ ] **Step 1: Failing tests.** One flash strip renders per flash type (and only one at a time); the word count updates as the body changes; the help dialog opens from the footer and lists the cheat rows.
- [ ] **Steps 2-5: fail, implement, pass, gate (`check:prose`). Step 6: Commit** (`Consolidate feedback and add word count and markdown help`).

---

### Task 10: The design pass (frontend-design plus fresh-agent critique)

**Files:** any admin component or `cairn-admin.css` touched by Tasks 3 through 9; no engine files.

This task is NOT a `cairn-implementer` dispatch. Process, run from the main loop:
1. Invoke the `frontend-design:frontend-design` skill and apply it to the rebuilt edit page on the frontier model (`fable`; "mythos" is not an available dispatch model). Drive the showcase with the Playwright render-and-compare loop (the precedent is the 0.32.0 polish pass): light and dark, desktop and narrow, Write and Preview tabs, all three status states, the dirty indicator, the More menu open, the help dialog open. Work within `docs/internal/admin-design-system.md` (Warm Stone tokens, Bricolage/Figtree, the load-bearing scoping rules); refine spacing, hierarchy, the sticky header's surface treatment, the hoisted title's type, the toolbar's density, and the highlight palette's harmony.
2. Verify every highlight token color and the directive machinery tint clear WCAG AA against `--color-base-100` in BOTH themes (compute the ratios; the spec requires it), and that the native spellcheck squiggle stays legible over the theme.
3. Dispatch a FRESH agent (no prior context, `fable` or the Opus-pinned `daisyui-a11y-reviewer`) with the screenshots and the diff for design critique against the audience (Google-Docs-level editor) and the design system. Fold in Critical and Important findings; iterate the render loop once more if anything Critical surfaced.
4. Update `docs/internal/admin-design-system.md` with the new recipes (the sticky edit header, the editor toolbar grammar, the document-title input, the highlight palette tokens) so the design language stays documented.
5. Full gate plus `check:prose`. Commit (`Polish the edit page design`).

---

### Task 11: Showcase E2E and the live proof

**Files:**
- Modify: `examples/showcase/e2e/golden-path.spec.ts`
- Test: the E2E suite plus `cd examples/showcase && npm run check` (0 errors in `src/`)

- Extend the golden path: open an entry, select a word, click Bold in the toolbar and assert the `**` wrap lands in the textarea/hidden field; switch to Preview and assert the rendered body appears; switch back and assert the editor content survived; assert the sticky header's Save button is visible after scrolling the page; save and assert the indicator returns to Saved.
- Run `npm run package` first if `dist/` is stale (the showcase resolves the engine through `dist`).

- [ ] **Step 1: Extend the spec, run the E2E** (`cd examples/showcase && npm run test:e2e`), all green. **Step 2: showcase check 0 errors in `src/`. Step 3: root gate. Step 4: Commit** (`Extend the golden path over the new editor`).

---

### Task 12: Docs, changelog, and the 0.40.0 bump

**Files:**
- Modify: `docs/reference/components.md` (EditPage's new layout and props surface, MarkdownEditor's `registerFormat`, the new MarkdownHelpDialog if exported, EditorToolbar's contract), `docs/guides/publish-and-discard.md` (the relocated Publish/Save/Discard and the status badges in the header), `docs/internal/admin-design-system.md` (confirm Task 10's recipe additions landed), `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`, `package.json` (`0.40.0`)
- New: an editor-facing guide `docs/guides/write-in-the-editor.md` (the toolbar, formatting, links to pages, the help dialog, Write/Preview, what the colored ::: blocks are, spell check, the unsaved indicator), indexed from `docs/guides/README.md` under Edit content.

- The change is additive for consumers (no shim, action, or load change; `EditPage`/`MarkdownEditor` props grew optionally), so the changelog entry is a "Consumers may" note: rebuilt edit page, no action required; sites embedding `MarkdownEditor` directly may adopt `registerFormat`.
- Grep the docs tree for claims the redesign stales (the preview-below-the-editor description, the sidebar Save button, the header dialog triggers) and fix every hit.

- [ ] **Step 1: Write the docs and bump. Step 2: all three doc gates plus the full gate plus `check:prose`. Step 3: Commit** (`Document the edit page redesign; bump 0.40.0`).

---

## Self-review notes

- **Spec coverage.** Zone 1 header (Task 7), zone 2 editor column with hoisted title (Tasks 4, 5, 8), zone 3 sidebar groups (Task 8), zone 4 feedback (Task 9); highlight theme and directive machinery (Tasks 2, 3); spell check (Task 3); full GFM toolbar with More menu, table starter, image placeholder, relocated pickers, tabs (Tasks 1, 4, 5); save model with dirty tracking, leave guard, Ctrl/Cmd+S (Task 6); word count and cheat sheet (Task 9); polish and contrast verification (Task 10); E2E (Task 11); docs dimension (Task 12). Toolbar undo/redo intentionally omitted per the spec's open items.
- **Type consistency.** `FormatKind` gains `h2 | h3 | ol | strike | codeblock | hr | table | task` and loses `heading` (Task 1); every later task references kinds from that set. `registerFormat` matches the existing register-callback idiom. Dialog `open()` exports are used by Tasks 7 and 8 and defined in Task 7.
- **Order-of-operations.** Task 1 retargets the old toolbar's `heading` button minimally so the gate holds before Task 4 rebuilds it. Task 5 depends on Task 4's tabs; Task 7 depends on Task 6's indicator; Task 8 depends on Task 7's dialog refactor. The design pass runs after all functional tasks so it polishes the final structure.
- **Risk.** The `$app/navigation` dynamic import in Task 6 is the one platform-coupled piece; it degrades to beforeunload-only in tests and in any non-SvelteKit mount, which is acceptable (the guard is advisory UX, not a data-integrity mechanism; the branch holds saved work regardless).
- **Review gate (ritual, not tasks).** `svelte-reviewer` (the reactive dirty tracking, the tab state, the dialog open() exports), `daisyui-a11y-reviewer` (the toolbar pattern, roving tabindex, the sticky header, contrast on the highlight palette), `web-auth-security-reviewer` (light touch: no auth change, but the header buttons move outside the form element and must keep the CSRF field association). The live admin smoke applies (the `/admin` surface changes substantially).
