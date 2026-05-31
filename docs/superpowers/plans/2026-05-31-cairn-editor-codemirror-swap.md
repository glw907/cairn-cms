# Editor Foundation Swap: Carta to CodeMirror 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Carta with a CodeMirror 6 edit surface behind the existing `MarkdownEditor` seam, own a small formatting toolbar, and keep cairn's design-accurate preview, so later editor affordances (the internal-link picker first) build on a syntax-aware foundation.

**Architecture:** `MarkdownEditor.svelte` keeps its public contract (a bindable `value`, a hidden-field `name` mirror, a `registerInsert` cursor-insert callback) and swaps its internals from Carta to a client-only CodeMirror 6 view. CodeMirror loads through a dynamic import in `onMount`, so the server bundle never pulls it, the same discipline Carta followed. A new `EditorToolbar.svelte` renders the formatting buttons Carta used to supply, and a pure `markdown-format.ts` helper holds the selection-transform logic so it unit-tests without a browser. The preview stays where it already lives. `EditPage` renders the adapter's `render` output and sanitizes it, so Carta's own preview tab and the dormant `preview` extension prop both go away, which removes a double-preview redundancy.

**Tech Stack:** CodeMirror 6 (`codemirror`, `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/lang-markdown`), Svelte 5 runes, DaisyUI 5 / Tailwind 4, Vitest (unit + `vitest-browser-svelte` component projects).

---

## Design decisions

- **CodeMirror is a bundled dependency, not a peer.** Carta was a peer dependency because a consumer might dedupe a heavy editor. cairn owns the CodeMirror integration end to end and a consumer never touches it, so the CodeMirror packages move into `dependencies`. carta-md leaves the peer set.
- **The edit surface is edit-only.** CodeMirror renders the markdown source. The live, design-accurate preview stays in `EditPage` through the adapter `render`. This deletes Carta's tab preview and the `preview` (Carta-extensions) prop, which the real route never passed anyway.
- **The seam contract is preserved except for `preview`.** `value`, `name`, and `registerInsert` keep their shapes, so `ComponentPalette` and `EditPage` need no rewiring beyond dropping `preview`. The internal-link picker pass adds its own prop later.
- **Format logic is pure and lives apart from the view.** `markdown-format.ts` transforms `(doc, from, to, kind)` into a new doc and selection with no DOM, so the toolbar's behavior is table-tested in the node `unit` project. The component test covers mount, the value mirror, the insert seam, and toolbar accessibility.
- **Version bumps to 0.9.0.** Dropping the `preview` prop and changing the peer set is a breaking change to the package surface.

## File structure

- Create `src/lib/components/markdown-format.ts`: pure selection-transform helper and `FormatKind` type.
- Create `src/lib/components/EditorToolbar.svelte`: the formatting button row.
- Rewrite `src/lib/components/MarkdownEditor.svelte`: Carta internals replaced by CodeMirror, same seam.
- Modify `src/lib/components/EditPage.svelte`: remove the `preview` prop and its wiring.
- Modify `package.json`: add CodeMirror deps, remove carta-md, bump to 0.9.0.
- Create `src/tests/unit/markdown-format.test.ts`: table-driven format cases.
- Rename `src/tests/unit/carta-boundary.test.ts` to `src/tests/unit/editor-boundary.test.ts`: guard CodeMirror off the server.
- Modify `src/tests/unit/peer-deps.test.ts`: peers drop carta-md, assert the editor packages are bundled deps.
- Modify `src/tests/component/MarkdownEditor.test.ts`: CodeMirror mount, value mirror, insert seam.
- Create `src/tests/component/EditorToolbar.test.ts`: buttons render and dispatch.
- Modify `src/tests/component/EditPage.test.ts`: drop `preview` from props.
- Modify `src/tests/component/setup.ts`: remove the Carta teardown swallow.

---

## Task 1: Pure markdown-format helper

**Files:**
- Create: `src/lib/components/markdown-format.ts`
- Test: `src/tests/unit/markdown-format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/markdown-format.test.ts
import { describe, it, expect } from 'vitest';
import { applyMarkdownFormat, type FormatKind } from '../../lib/components/markdown-format.js';

describe('applyMarkdownFormat', () => {
  const wrap: { kind: FormatKind; doc: string; out: string; from: number; to: number }[] = [
    { kind: 'bold', doc: 'abc', out: '**abc**', from: 2, to: 5 },
    { kind: 'italic', doc: 'abc', out: '_abc_', from: 1, to: 4 },
    { kind: 'code', doc: 'abc', out: '`abc`', from: 1, to: 4 },
  ];
  for (const c of wrap) {
    it(`wraps a selection for ${c.kind}`, () => {
      expect(applyMarkdownFormat(c.doc, 0, 3, c.kind)).toEqual({ doc: c.out, from: c.from, to: c.to });
    });
  }

  const linePrefix: { kind: FormatKind; out: string; to: number }[] = [
    { kind: 'heading', out: '# abc', to: 5 },
    { kind: 'quote', out: '> abc', to: 5 },
    { kind: 'ul', out: '- abc', to: 5 },
  ];
  for (const c of linePrefix) {
    it(`prefixes the line for ${c.kind}`, () => {
      expect(applyMarkdownFormat('abc', 0, 3, c.kind)).toEqual({ doc: c.out, from: 2, to: c.to });
    });
  }

  it('builds a link with the selection on the url placeholder', () => {
    expect(applyMarkdownFormat('abc', 0, 3, 'link')).toEqual({ doc: '[abc](url)', from: 6, to: 9 });
  });

  it('prefixes every line of a multi-line selection', () => {
    expect(applyMarkdownFormat('a\nb', 0, 3, 'heading')).toEqual({ doc: '# a\n# b', from: 2, to: 7 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: FAIL, cannot resolve `../../lib/components/markdown-format.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/components/markdown-format.ts
/**
 * Pure markdown selection transforms for the editor toolbar. Each call maps a document and a
 * selection range to a new document and a new selection, with no DOM. The MarkdownEditor view
 * dispatches the result; keeping the logic here lets it unit-test without a browser.
 */
export type FormatKind = 'bold' | 'italic' | 'code' | 'heading' | 'quote' | 'ul' | 'link';

export interface FormatResult {
  doc: string;
  from: number;
  to: number;
}

const WRAP: Record<'bold' | 'italic' | 'code', string> = { bold: '**', italic: '_', code: '`' };
const LINE_PREFIX: Record<'heading' | 'quote' | 'ul', string> = { heading: '# ', quote: '> ', ul: '- ' };

export function applyMarkdownFormat(doc: string, from: number, to: number, kind: FormatKind): FormatResult {
  if (kind === 'bold' || kind === 'italic' || kind === 'code') {
    const marker = WRAP[kind];
    const next = doc.slice(0, from) + marker + doc.slice(from, to) + marker + doc.slice(to);
    return { doc: next, from: from + marker.length, to: to + marker.length };
  }

  if (kind === 'link') {
    const text = doc.slice(from, to);
    const inserted = `[${text}](url)`;
    const urlStart = from + 1 + text.length + 2; // past "[text]("
    return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: urlStart, to: urlStart + 3 };
  }

  const prefix = LINE_PREFIX[kind];
  const lineStart = doc.lastIndexOf('\n', from - 1) + 1; // 0 when the selection is on the first line
  const region = doc.slice(lineStart, to);
  const prefixed = region.replace(/^/gm, prefix);
  const added = prefixed.length - region.length;
  return { doc: doc.slice(0, lineStart) + prefixed + doc.slice(to), from: from + prefix.length, to: to + added };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/markdown-format.ts src/tests/unit/markdown-format.test.ts
git commit -m "feat(editor): add pure markdown-format helper for the toolbar"
```

---

## Task 2: Editor-boundary test guards CodeMirror off the server

**Files:**
- Rename: `src/tests/unit/carta-boundary.test.ts` to `src/tests/unit/editor-boundary.test.ts`
- Modify: the renamed file

- [ ] **Step 1: Rename the file**

Run: `git mv src/tests/unit/carta-boundary.test.ts src/tests/unit/editor-boundary.test.ts`

- [ ] **Step 2: Rewrite it to guard the CodeMirror packages**

Replace the whole file with:

```ts
// src/tests/unit/editor-boundary.test.ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Server-reachable engine code: everything a Worker can import. The .svelte components are client-only
// and excluded; the editor library belongs behind their dynamic import, not here.
const SERVER_DIRS = ['src/lib/sveltekit', 'src/lib/github', 'src/lib/auth', 'src/lib/content', 'src/lib/render'];

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...tsFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

// Matches a static `import ... from '@codemirror/...'`, `from 'codemirror'`, or the bare forms, but not
// the dynamic `import('@codemirror/...')` the editor component uses on the client.
const STATIC_EDITOR =
  /(?:^|\s)import\s[^(][\s\S]*?from\s+['"](?:codemirror|@codemirror\/[^'"]+)['"]|(?:^|\s)import\s+['"](?:codemirror|@codemirror\/[^'"]+)['"]/m;

const STATIC_DOMPURIFY =
  /(?:^|\s)import\s[^(][\s\S]*?from\s+['"]dompurify['"]|(?:^|\s)import\s+['"]dompurify['"]/m;

describe('CodeMirror stays off the server', () => {
  it('no server-reachable module imports a codemirror package', () => {
    const offenders: string[] = [];
    for (const dir of SERVER_DIRS) {
      for (const file of tsFiles(dir)) {
        if (STATIC_EDITOR.test(readFileSync(file, 'utf8'))) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the engine entry does not import a codemirror package', () => {
    expect(STATIC_EDITOR.test(readFileSync('src/lib/index.ts', 'utf8'))).toBe(false);
  });

  it('the editor component loads codemirror only through a dynamic import', () => {
    const source = readFileSync('src/lib/components/MarkdownEditor.svelte', 'utf8');
    expect(STATIC_EDITOR.test(source)).toBe(false);
  });
});

describe('DOMPurify stays off the server', () => {
  it('no server-reachable module statically imports dompurify', () => {
    const offenders: string[] = [];
    for (const dir of SERVER_DIRS) {
      for (const file of tsFiles(dir)) {
        if (STATIC_DOMPURIFY.test(readFileSync(file, 'utf8'))) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the engine entry does not statically import dompurify', () => {
    expect(STATIC_DOMPURIFY.test(readFileSync('src/lib/index.ts', 'utf8'))).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run --project unit src/tests/unit/editor-boundary.test.ts`
Expected: PASS. At this point MarkdownEditor still uses Carta (dynamic), so the codemirror guard passes with nothing to find; the third assertion confirms the rewrite keeps the dynamic-only discipline once Task 5 lands.

- [ ] **Step 4: Commit**

```bash
git add src/tests/unit/editor-boundary.test.ts
git commit -m "test(editor): guard codemirror off the server bundle"
```

---

## Task 3: Swap dependencies and bump the version

**Files:**
- Modify: `src/tests/unit/peer-deps.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Update the peer-deps contract test (test-first)**

Replace the body of `src/tests/unit/peer-deps.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

describe('package dependency contract', () => {
  const peers = ['@sveltejs/kit', 'svelte'];
  const editorDeps = ['codemirror', '@codemirror/lang-markdown', '@codemirror/state', '@codemirror/view'];

  it('declares the framework packages as peers', () => {
    for (const p of peers) expect(pkg.peerDependencies?.[p], `${p} must be a peer`).toBeTruthy();
  });

  it('never lists a framework package as a hard dependency', () => {
    for (const p of peers) expect(pkg.dependencies?.[p], `${p} must not be a dependency`).toBeUndefined();
  });

  it('no longer declares carta-md anywhere', () => {
    expect(pkg.peerDependencies?.['carta-md']).toBeUndefined();
    expect(pkg.dependencies?.['carta-md']).toBeUndefined();
  });

  it('bundles the codemirror packages as hard dependencies', () => {
    for (const d of editorDeps) expect(pkg.dependencies?.[d], `${d} must be a dependency`).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/peer-deps.test.ts`
Expected: FAIL, carta-md still present and codemirror deps absent.

- [ ] **Step 3: Update package.json**

Apply these edits to `package.json`:
- Bump `"version"` to `"0.9.0"`.
- In `dependencies`, add:
  ```json
  "codemirror": "^6.0.2",
  "@codemirror/state": "^6.6.0",
  "@codemirror/view": "^6.43.0",
  "@codemirror/commands": "^6.10.3",
  "@codemirror/language": "^6.12.3",
  "@codemirror/lang-markdown": "^6.5.0"
  ```
- In `peerDependencies`, remove the `"carta-md": "^4.11"` line.
- In `devDependencies`, remove the `"carta-md": "^4.11"` line.

- [ ] **Step 4: Install and verify the test passes**

Run: `npm install`
Run: `npx vitest run --project unit src/tests/unit/peer-deps.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/tests/unit/peer-deps.test.ts
git commit -m "build(editor): swap carta-md deps for codemirror, bump 0.9.0"
```

---

## Task 4: The formatting toolbar

**Files:**
- Create: `src/lib/components/EditorToolbar.svelte`
- Test: `src/tests/component/EditorToolbar.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/component/EditorToolbar.test.ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditorToolbar from '../../lib/components/EditorToolbar.svelte';

describe('EditorToolbar', () => {
  it('renders a labelled button for each format', async () => {
    const screen = render(EditorToolbar, { format: () => {} });
    for (const label of ['Bold', 'Italic', 'Heading', 'Link', 'Bulleted list', 'Quote', 'Code']) {
      await expect.element(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('asks the host to apply a format on click', async () => {
    const calls: string[] = [];
    const screen = render(EditorToolbar, { format: (k: string) => calls.push(k) });
    await screen.getByRole('button', { name: 'Bold' }).click();
    await screen.getByRole('button', { name: 'Link' }).click();
    expect(calls).toEqual(['bold', 'link']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project component src/tests/component/EditorToolbar.test.ts`
Expected: FAIL, cannot resolve `EditorToolbar.svelte`.

- [ ] **Step 3: Write the component**

```svelte
<!--
@component
The editor's formatting toolbar: bold, italic, heading, link, bulleted list, quote, code. Each button
asks the host to apply a markdown transform to the current selection. Carta supplied this row before;
cairn owns it now so the edit surface stays swappable.
-->
<script lang="ts">
  import type { FormatKind } from './markdown-format.js';

  interface Props {
    /** Apply a markdown transform to the editor's current selection. */
    format: (kind: FormatKind) => void;
  }

  let { format }: Props = $props();

  const buttons: { kind: FormatKind; label: string; glyph: string }[] = [
    { kind: 'bold', label: 'Bold', glyph: 'B' },
    { kind: 'italic', label: 'Italic', glyph: 'I' },
    { kind: 'heading', label: 'Heading', glyph: 'H' },
    { kind: 'link', label: 'Link', glyph: '🔗' },
    { kind: 'ul', label: 'Bulleted list', glyph: '•' },
    { kind: 'quote', label: 'Quote', glyph: '“' },
    { kind: 'code', label: 'Code', glyph: '</>' },
  ];
</script>

<div class="border-base-300 bg-base-200 flex gap-1 border-b p-1" role="toolbar" aria-label="Formatting">
  {#each buttons as button (button.kind)}
    <button
      type="button"
      class="btn btn-ghost btn-xs"
      aria-label={button.label}
      title={button.label}
      onclick={() => format(button.kind)}
    >{button.glyph}</button>
  {/each}
</div>
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run --project component src/tests/component/EditorToolbar.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/EditorToolbar.svelte src/tests/component/EditorToolbar.test.ts
git commit -m "feat(editor): add the formatting toolbar"
```

---

## Task 5: Rebuild MarkdownEditor on CodeMirror

**Files:**
- Rewrite: `src/lib/components/MarkdownEditor.svelte`
- Modify: `src/tests/component/MarkdownEditor.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace `src/tests/component/MarkdownEditor.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';

describe('MarkdownEditor', () => {
  it('mirrors the bindable value into a hidden field named for the form', async () => {
    const screen = render(MarkdownEditor, { value: 'hello world', name: 'body' });
    await expect
      .element(screen.container.querySelector<HTMLInputElement>('input[name="body"]')!)
      .toHaveValue('hello world');
  });

  it('mounts a CodeMirror surface seeded with the value', async () => {
    const screen = render(MarkdownEditor, { value: 'mountain weather', name: 'body' });
    await expect
      .poll(() => screen.container.querySelector('.cm-editor')?.textContent ?? '')
      .toContain('mountain weather');
  });

  it('inserts text at the cursor through registerInsert and mirrors it', async () => {
    let insert: ((text: string) => void) | undefined;
    const screen = render(MarkdownEditor, {
      value: 'start',
      name: 'body',
      registerInsert: (fn: (text: string) => void) => {
        insert = fn;
      },
    });
    await expect.poll(() => typeof insert).toBe('function');
    insert!('INSERTED');
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('INSERTED');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: FAIL, the `.cm-editor` mount and the insert mirror fail against the Carta implementation.

- [ ] **Step 3: Rewrite the component**

```svelte
<!--
@component
The `MarkdownEditor` seam (spec §6, seam 5): a thin wrapper over CodeMirror 6 exposing a bindable
value and a cursor-insert callback. CodeMirror is client-only, so it mounts after the component does
through a dynamic import; until then a plain textarea carries the value so the form still submits, and
the hidden field mirrors the value throughout. The edit surface owns its toolbar; the design-accurate
preview lives in EditPage through the adapter's render. Swapping the editor stays a one-file change.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import EditorToolbar from './EditorToolbar.svelte';
  import { applyMarkdownFormat, type FormatKind } from './markdown-format.js';

  interface Props {
    /** The markdown source; bindable so the parent reads edits back. */
    value: string;
    /** The hidden field name the value is mirrored to for form submit. */
    name: string;
    /** Receives a `(text) => void` that inserts at the cursor; the palette calls it. */
    registerInsert?: (insert: (text: string) => void) => void;
  }

  let { value = $bindable(), name, registerInsert }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let mounted = $state(false);
  // The CodeMirror view, untyped at the runtime boundary because @codemirror/* loads only in the
  // browser. The type-only `import(...)` annotation is erased; the value import is dynamic in onMount,
  // so the server bundle never pulls CodeMirror (guarded by the editor-boundary test).
  let view: import('@codemirror/view').EditorView | null = null;

  onMount(async () => {
    const viewMod = await import('@codemirror/view');
    const stateMod = await import('@codemirror/state');
    const markdownMod = await import('@codemirror/lang-markdown');
    const commandsMod = await import('@codemirror/commands');
    const languageMod = await import('@codemirror/language');

    const { EditorView, keymap } = viewMod;
    const theme = EditorView.theme(
      {
        '&': { backgroundColor: 'var(--color-base-100)', color: 'var(--color-base-content)', fontSize: '0.875rem' },
        '.cm-content': { fontFamily: 'ui-monospace, monospace', padding: '0.75rem', lineHeight: '1.7' },
        '.cm-cursor': { borderLeftColor: 'var(--color-primary)' },
        '&.cm-focused': { outline: 'none' },
        '.cm-line': { padding: '0' },
      },
      { dark: false },
    );

    view = new EditorView({
      parent: host!,
      state: stateMod.EditorState.create({
        doc: value,
        extensions: [
          commandsMod.history(),
          keymap.of([...commandsMod.defaultKeymap, ...commandsMod.historyKeymap]),
          markdownMod.markdown(),
          EditorView.lineWrapping,
          languageMod.syntaxHighlighting(languageMod.defaultHighlightStyle, { fallback: true }),
          theme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) value = update.state.doc.toString();
          }),
        ],
      }),
    });

    registerInsert?.(insertAtCursor);
    mounted = true;
  });

  onDestroy(() => view?.destroy());

  function insertAtCursor(text: string) {
    if (!view) {
      value = value ? `${value}\n\n${text}` : text;
      return;
    }
    const pos = view.state.selection.main.head;
    const prefix = pos > 0 ? '\n\n' : '';
    const insert = `${prefix}${text}`;
    view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length } });
    view.focus();
  }

  function applyFormat(kind: FormatKind) {
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc.toString();
    const next = applyMarkdownFormat(doc, from, to, kind);
    view.dispatch({
      changes: { from: 0, to: doc.length, insert: next.doc },
      selection: { anchor: next.from, head: next.to },
    });
    view.focus();
  }
</script>

<input type="hidden" {name} value={value} />

<div class="border-base-300 overflow-hidden rounded-box border">
  <EditorToolbar format={applyFormat} />
  <div bind:this={host}></div>
  {#if !mounted}
    <textarea class="textarea min-h-64 w-full font-mono text-sm" bind:value aria-label="Markdown source"></textarea>
  {/if}
</div>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/MarkdownEditor.svelte src/tests/component/MarkdownEditor.test.ts
git commit -m "feat(editor): rebuild MarkdownEditor on codemirror 6"
```

---

## Task 6: Drop the Carta preview prop from EditPage

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Modify: `src/tests/component/EditPage.test.ts`

- [ ] **Step 1: Update the EditPage tests to the new prop shape (test-first)**

In `src/tests/component/EditPage.test.ts`, remove the `preview: []` line from the object returned by `postProps`. Leave every assertion unchanged.

- [ ] **Step 2: Confirm the type contract is now out of step**

Run: `npm run check`
Expected: FAIL. `EditPage` still declares and forwards `preview`, so removing it from the test props leaves the component and its callers inconsistent under `svelte-check`. The next step removes the prop to reach 0/0.

- [ ] **Step 3: Remove the prop and its wiring**

In `src/lib/components/EditPage.svelte`:
- Delete the `preview` line from the `Props` interface:
  ```ts
  /** Carta preview plugins from the adapter, for the design-accurate preview. */
  preview?: unknown[];
  ```
- Remove `preview = []` from the `$props()` destructure, so it reads:
  ```ts
  let { data, registry, render }: Props = $props();
  ```
- Change the editor element to stop passing `plugins`:
  ```svelte
  <MarkdownEditor bind:value={body} name="body" registerInsert={(fn) => (insert = fn)} />
  ```

- [ ] **Step 4: Verify types and the suite pass**

Run: `npm run check`
Expected: 0 errors, 0 warnings.
Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS (all existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts
git commit -m "refactor(editor): drop the carta preview prop from EditPage"
```

---

## Task 7: Remove the Carta teardown swallow

**Files:**
- Modify: `src/tests/component/setup.ts`

- [ ] **Step 1: Replace the file with a bare comment**

```ts
// Component-project test setup.
//
// CodeMirror disposes cleanly on unmount (view.destroy in MarkdownEditor's onDestroy), so the
// component run needs no unhandled-rejection swallow. This file is kept as the configured setupFile
// seam for the component project.
export {};
```

- [ ] **Step 2: Run the whole component project to confirm it stays green without the swallow**

Run: `npm run test:component`
Expected: PASS, with no unhandled-rejection failures.

- [ ] **Step 3: Commit**

```bash
git add src/tests/component/setup.ts
git commit -m "test(editor): drop the carta teardown-rejection swallow"
```

---

## Task 8: Full gate and manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Run the full type check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: every project green (unit, integration, component).

- [ ] **Step 3: Manual smoke of the showcase editor**

Run the showcase admin per `docs/runbooks/symlink-dev.md` (or `npm run dev` in `examples/showcase`), open an edit page, and confirm the CodeMirror surface mounts and types, the toolbar buttons format the selection, the component palette still inserts at the cursor, and the preview toggle renders the design-accurate preview. Note any gap as a follow-up rather than fixing inline.

- [ ] **Step 4: Confirm carta-md is fully gone**

Run: `grep -rln "carta-md" src/ && echo "FOUND" || echo "clean"`
Expected: `clean`, with no source references remaining.

---

## Self-review notes

- **Spec coverage:** the swap keeps the seam (`value`/`name`/`registerInsert`) so `ComponentPalette` and the save form are untouched; the toolbar reproduces the spec §7.6 button set (bold, italic, heading, link, list, quote, code); the preview stays the adapter `render` path. The internal-link picker is explicitly out of scope and lands in its own later pass on this surface.
- **Carta removal is complete:** dependencies (Task 3), the component internals (Task 5), the boundary test (Task 2), the teardown swallow (Task 7), and a final grep (Task 8) each remove or verify a piece.
- **Type consistency:** `FormatKind` and `applyMarkdownFormat`'s `{ doc, from, to }` shape are defined in Task 1 and consumed unchanged by `EditorToolbar` (Task 4) and `MarkdownEditor` (Task 5).
