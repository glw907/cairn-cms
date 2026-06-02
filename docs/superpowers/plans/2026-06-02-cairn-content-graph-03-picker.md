# Content Graph Plan 3: the editor link picker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an author insert a `cairn:` internal link two ways, both writing `[Display](cairn:<concept>/<id>)`: a "Link to page" dialog and a `[[` autocomplete, both reading the `linkTargets` Plan 2 already ships to the editor.

**Architecture:** Two pure helpers (`formatCairnToken`, `insertInlineLink`) and a pure `[[` completion module carry all the logic so they unit-test without a DOM. `MarkdownEditor` gains a generic `completionSources` prop (wired through `@codemirror/autocomplete`) and a `registerInsertLink` seam (an inline, selection-aware link insert). `LinkPicker.svelte` mirrors `ComponentInsertDialog.svelte`, and `EditPage` registers the link completion source and renders the picker beside the component dialog.

**Tech Stack:** TypeScript, Svelte 5 runes, CodeMirror 6 (`@codemirror/autocomplete`), vitest (unit + `vitest-browser-svelte` component project).

**Design reference:** `docs/superpowers/specs/2026-06-02-cairn-content-graph-03-picker-design.md` (approved).

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. A cairn-cms push deploys no site, so this additive UI pass runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement the minimal code, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`). A passing assertion count is not enough; an unhandled rejection can leave tests green while the process exits 1.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies or code comments; plain voice.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` (and other CodeMirror-mounting component tests) can fail once on a mount timeout under parallel load. If `npm test` exits non-zero solely on a CodeMirror mount timeout, re-run once to confirm green.
- `npm run check` can fail solely on the showcase `svelte.config.js` (it imports `@sveltejs/adapter-node`) unless the showcase deps are installed. The svelte-check scan itself is 0/0 either way; if the showcase config import is the only failure, the 0/0 scan result is the gate.

## Reference values (verified against the live tree, 2026-06-02)

- `src/lib/content/links.ts` exports `parseCairnToken(href): CairnRef | null` and `extractCairnLinks(body): CairnRef[]`, and the types `CairnRef` (`{ concept: string; id: string }`) and `LinkResolve`. This plan adds `formatCairnToken`.
- `src/lib/content/manifest.ts` exports `interface LinkTarget { concept: string; id: string; permalink: string; title: string; date?: string; draft: boolean }`. It is re-exported from the package main entry.
- `src/lib/components/markdown-format.ts` exports `type FormatKind`, `interface FormatResult { doc: string; from: number; to: number }`, and `applyMarkdownFormat(doc, from, to, kind): FormatResult`. The `'link'` branch wraps a selection as `[text](url)`. This plan adds `insertInlineLink`.
- `src/lib/components/MarkdownEditor.svelte` (120 lines): props are `{ value (bindable), name, registerInsert? }`. It dynamically imports `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`, `@codemirror/commands`, `@codemirror/language` in `onMount`, builds the `EditorView`, then calls `registerInsert?.(insertAtCursor)`. `insertAtCursor` block-inserts with a `\n\n` prefix. `applyFormat(kind)` dispatches `applyMarkdownFormat`. The keymap is `keymap.of([...defaultKeymap, ...historyKeymap])`.
- `src/lib/components/ComponentInsertDialog.svelte`: a native `<dialog class="modal">` with an inline trigger `<button>Insert</button>`, props `{ registry?, insert, icons? }`. The model to mirror for `LinkPicker`.
- `src/lib/components/EditPage.svelte`: holds `let insert = $state.raw<(text: string) => void>(() => {})`, renders `<ComponentInsertDialog {registry} {insert} {icons} />` (around line 87) and `<MarkdownEditor bind:value={body} name="body" registerInsert={(fn) => (insert = fn)} />` (around line 112). It already builds `const resolveLink = $derived(manifestLinkResolver(data.linkTargets))` and reads `data.linkTargets`.
- `src/lib/components/index.ts` exports each component as `export { default as X } from './X.svelte'`. This plan adds `LinkPicker`.
- `src/lib/index.ts` (main entry) has `export { parseCairnToken, extractCairnLinks } from './content/links.js';`. This plan adds `formatCairnToken` there.
- Component tests use `vitest-browser-svelte`: `import { render } from 'vitest-browser-svelte'`, then `screen.container.querySelector(...)`, `screen.getByRole(...)`, `expect.element(...)`, `expect.poll(() => ...)`. Keyboard interaction uses `import { userEvent } from '@vitest/browser/context'`.
- `@codemirror/autocomplete` is present transitively but is NOT a declared dependency. Task 1 declares it.
- Current version: `package.json` `"version": "0.18.0"`. Task 10 bumps a minor.

## File structure

- Modify `src/lib/content/links.ts`: add `formatCairnToken(ref): string`.
- Modify `src/lib/components/markdown-format.ts`: add `insertInlineLink(doc, from, to, href, title): FormatResult`.
- Create `src/lib/components/link-completion.ts`: the pure `[[` matcher (`matchCairnTrigger`) and the completion builder (`linkCompletions`), plus the thin `cairnLinkCompletionSource(targets)` factory returning a CodeMirror `CompletionSource`.
- Modify `src/lib/components/MarkdownEditor.svelte`: add the `completionSources` prop (wired through `autocompletion`) and the `registerInsertLink` seam.
- Create `src/lib/components/LinkPicker.svelte`: the "Link to page" trigger plus its `<dialog>`.
- Modify `src/lib/components/EditPage.svelte`: register the completion source and the inline insert, render `<LinkPicker>`.
- Modify `src/lib/index.ts` and `src/lib/components/index.ts`: the new public exports.
- Modify `package.json`: declare `@codemirror/autocomplete`, then bump the version.

---

## Task 1: declare the `@codemirror/autocomplete` dependency

**Files:**
- Modify: `package.json`

The generic completion seam (Task 6) imports `autocompletion` and `completionKeymap` from `@codemirror/autocomplete`, and the pure module (Task 4) imports its types. The package is present only transitively, so declare it directly.

- [ ] **Step 1: Find the installed version**

Run: `node -p "require('@codemirror/autocomplete/package.json').version"`
Note the version (for example `6.18.6`).

- [ ] **Step 2: Add the dependency**

In `package.json`, add `@codemirror/autocomplete` to `dependencies` beside the other `@codemirror/*` entries, pinned with a caret to the installed major (for example `"@codemirror/autocomplete": "^6.18.6"`, using the version from Step 1).

- [ ] **Step 3: Install and verify**

Run: `npm install`
Then: `node -p "require('@codemirror/autocomplete').autocompletion ? 'ok' : 'missing'"`
Expected: `ok`. The install relocks `package-lock.json` to record the now-direct dependency.

- [ ] **Step 4: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add package.json package-lock.json
git commit -m "build: declare @codemirror/autocomplete as a direct dependency

The link picker's [[ autocomplete wires @codemirror/autocomplete into the editor.
It was present only transitively; declare it directly so the editor's completion
seam does not rely on a transitive pull.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `formatCairnToken`, the token writer

**Files:**
- Modify: `src/lib/content/links.ts`
- Modify: `src/tests/unit/links.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/tests/unit/links.test.ts`, add `formatCairnToken` to the existing import from `../../lib/content/links.js`, then append:

```ts
describe('formatCairnToken', () => {
  it('writes the cairn: token for a ref', () => {
    expect(formatCairnToken({ concept: 'posts', id: '2026-01-04-waxing-guide' })).toBe(
      'cairn:posts/2026-01-04-waxing-guide',
    );
    expect(formatCairnToken({ concept: 'pages', id: 'about' })).toBe('cairn:pages/about');
  });
  it('round-trips with parseCairnToken', () => {
    const ref = { concept: 'posts', id: 'hello' };
    expect(parseCairnToken(formatCairnToken(ref))).toEqual(ref);
  });
});
```

(`parseCairnToken` is already imported in this file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/links.test.ts`
Expected: FAIL, `formatCairnToken` is not exported.

- [ ] **Step 3: Implement `formatCairnToken`**

In `src/lib/content/links.ts`, add after `parseCairnToken`:

```ts
/** Write the `cairn:<concept>/<id>` token for a ref. The inverse of parseCairnToken, so the editor
 *  link picker and the autocomplete write exactly the form the resolver reads back. */
export function formatCairnToken(ref: CairnRef): string {
  return `cairn:${ref.concept}/${ref.id}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/links.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/content/links.ts src/tests/unit/links.test.ts
git commit -m "feat(content): formatCairnToken, the cairn: token writer

Add formatCairnToken, the inverse of parseCairnToken, so the editor link picker
and the [[ autocomplete write exactly the token form the resolver reads back.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `insertInlineLink`, the inline link transform

**Files:**
- Modify: `src/lib/components/markdown-format.ts`
- Modify: `src/tests/unit/markdown-format.test.ts` (mirror the existing file; if it does not exist, search `grep -rln "applyMarkdownFormat" src/tests/` and add to that file)

- [ ] **Step 1: Write the failing test**

Add `insertInlineLink` to the import from `../../lib/components/markdown-format.js` in the markdown-format test file, then add:

```ts
describe('insertInlineLink', () => {
  it('wraps a selection as the display text', () => {
    const doc = 'see the guide here';
    const from = 8; // 'guide'
    const to = 13;
    const res = insertInlineLink(doc, from, to, 'cairn:posts/guide', 'Guide');
    expect(res.doc).toBe('see the [guide](cairn:posts/guide) here');
    // the cursor collapses just after the inserted link
    expect(res.from).toBe(res.to);
    expect(res.doc.slice(0, res.from)).toBe('see the [guide](cairn:posts/guide)');
  });
  it('inserts the title as the display text when there is no selection', () => {
    const doc = 'see  here';
    const at = 4; // between the two spaces
    const res = insertInlineLink(doc, at, at, 'cairn:pages/about', 'About');
    expect(res.doc).toBe('see [About](cairn:pages/about) here');
    expect(res.from).toBe(res.to);
    expect(res.doc.slice(0, res.from)).toBe('see [About](cairn:pages/about)');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: FAIL, `insertInlineLink` is not exported.

- [ ] **Step 3: Implement `insertInlineLink`**

In `src/lib/components/markdown-format.ts`, add after `applyMarkdownFormat`:

```ts
/**
 * Insert an inline markdown link at the selection. With a non-empty selection the selected text
 * becomes the display text; with an empty selection the title is the display text. The cursor
 * collapses just after the inserted link. Unlike the block insert, this adds no surrounding
 * blank lines, since a link is inline. Pure, so the editor dispatches the result.
 */
export function insertInlineLink(doc: string, from: number, to: number, href: string, title: string): FormatResult {
  const text = from < to ? doc.slice(from, to) : title;
  const inserted = `[${text}](${href})`;
  const end = from + inserted.length;
  return { doc: doc.slice(0, from) + inserted + doc.slice(to), from: end, to: end };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/markdown-format.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/markdown-format.ts src/tests/unit/markdown-format.test.ts
git commit -m "feat(editor): insertInlineLink, the inline link transform

Add insertInlineLink, a pure transform that wraps a selection as a markdown
link's display text or inserts the title when nothing is selected, with no block
padding. The editor dispatches the result the same way it dispatches a format.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: the `[[` completion module

**Files:**
- Create: `src/lib/components/link-completion.ts`
- Create: `src/tests/unit/link-completion.test.ts`

The pure matcher and the completion builder, plus a thin factory returning a CodeMirror `CompletionSource`. Only the matcher and the builder carry logic and they test without a DOM; the factory is a thin adapter.

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/link-completion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { matchCairnTrigger, linkCompletions } from '../../lib/components/link-completion.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

const targets: LinkTarget[] = [
  { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
  { concept: 'posts', id: '2026-01-04-waxing', permalink: '/2026/01/waxing', title: 'Waxing Guide', date: '2026-01-04', draft: false },
  { concept: 'posts', id: '2026-02-02-draft', permalink: '/2026/02/draft', title: 'A Draft Post', date: '2026-02-02', draft: true },
];

describe('matchCairnTrigger', () => {
  it('matches an open [[ and captures the query', () => {
    expect(matchCairnTrigger('see [[wax')).toEqual({ query: 'wax', from: 4 });
    expect(matchCairnTrigger('[[')).toEqual({ query: '', from: 0 });
  });
  it('does not match a closed or absent trigger', () => {
    expect(matchCairnTrigger('see [[wax]] done')).toBeNull(); // closed
    expect(matchCairnTrigger('a single [ bracket')).toBeNull();
    expect(matchCairnTrigger('no trigger here')).toBeNull();
    expect(matchCairnTrigger('[[has a\nnewline')).toBeNull(); // query stops at newline
  });
});

describe('linkCompletions', () => {
  it('filters by a case-insensitive title substring', () => {
    const labels = linkCompletions(targets, 'wax').map((c) => c.label);
    expect(labels).toEqual(['Waxing Guide']);
  });
  it('returns every target for an empty query', () => {
    expect(linkCompletions(targets, '').map((c) => c.label)).toEqual(['About Us', 'Waxing Guide', 'A Draft Post']);
  });
  it('applies the full cairn link and groups by concept', () => {
    const about = linkCompletions(targets, 'about')[0];
    expect(about.apply).toBe('[About Us](cairn:pages/about)');
    expect(about.section).toEqual({ name: 'Pages', rank: 0 });
  });
  it('marks a draft and shows a post date in the detail', () => {
    const draft = linkCompletions(targets, 'draft')[0];
    expect(draft.detail).toBe('Draft');
    const waxing = linkCompletions(targets, 'waxing')[0];
    expect(waxing.detail).toBe('2026-01-04');
    expect(waxing.section).toEqual({ name: 'Posts', rank: 1 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project unit src/tests/unit/link-completion.test.ts`
Expected: FAIL, the module does not exist.

- [ ] **Step 3: Implement the matcher, the builder, and the source factory**

Create `src/lib/components/link-completion.ts`:

```ts
// cairn-cms: the [[ link autocomplete (content-graph design). The matcher and the completion
// builder are pure so they unit-test without a DOM; cairnLinkCompletionSource is a thin adapter
// to CodeMirror's CompletionSource. The editor wires the source through a generic completionSources
// prop, so this stays the only link-aware piece and the seam itself knows nothing about links.
import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete';
import type { LinkTarget } from '../content/manifest.js';
import { formatCairnToken } from '../content/links.js';

/** The known concepts in display order; an unlisted concept sorts after these under its own name. */
const CONCEPT_SECTIONS: Record<string, { name: string; rank: number }> = {
  pages: { name: 'Pages', rank: 0 },
  posts: { name: 'Posts', rank: 1 },
};

function sectionFor(concept: string): { name: string; rank: number } {
  return CONCEPT_SECTIONS[concept] ?? { name: concept.charAt(0).toUpperCase() + concept.slice(1), rank: 2 };
}

/** The open `[[query` before the cursor, or null. The query stops at a closing bracket or a newline,
 *  so a finished `[[x]]` link and ordinary prose never trigger. `from` is the index of the `[[`. */
export function matchCairnTrigger(before: string): { query: string; from: number } | null {
  const match = /\[\[([^[\]\n]*)$/.exec(before);
  return match ? { query: match[1], from: match.index } : null;
}

/** The completion options for a query: a case-insensitive title substring match, each option grouped
 *  by concept, a draft marked and a post date shown in the detail, and the apply text the full link. */
export function linkCompletions(targets: LinkTarget[], query: string): Completion[] {
  const q = query.trim().toLowerCase();
  const matched = q ? targets.filter((t) => t.title.toLowerCase().includes(q)) : targets;
  return matched.map((t) => ({
    label: t.title,
    section: sectionFor(t.concept),
    detail: t.draft ? 'Draft' : t.date,
    apply: `[${t.title}](${formatCairnToken(t)})`,
  }));
}

/** A CodeMirror CompletionSource over the site's link targets, triggered by `[[`. It replaces the
 *  whole `[[query` with the chosen link, and sets filter:false because linkCompletions already
 *  filtered by the query (CodeMirror would otherwise re-filter against the literal `[[query`). */
export function cairnLinkCompletionSource(targets: LinkTarget[]): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const line = context.state.doc.lineAt(context.pos);
    const before = context.state.sliceDoc(line.from, context.pos);
    const trigger = matchCairnTrigger(before);
    if (!trigger) return null;
    return { from: line.from + trigger.from, options: linkCompletions(targets, trigger.query), filter: false };
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project unit src/tests/unit/link-completion.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/link-completion.ts src/tests/unit/link-completion.test.ts
git commit -m "feat(editor): the [[ link completion module

Add the pure matchCairnTrigger and linkCompletions plus cairnLinkCompletionSource,
the CodeMirror CompletionSource the editor wires in. The [[ trigger offers the
site's link targets, filtered by title, grouped by concept, drafts marked, and
replaces the [[query with the full cairn link.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: the `registerInsertLink` seam on `MarkdownEditor`

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte`
- Modify: `src/tests/component/MarkdownEditor.test.ts`

Add the inline link insert seam, symmetric with `registerInsert`. The editor owns selection handling.

- [ ] **Step 1: Write the failing test**

In `src/tests/component/MarkdownEditor.test.ts`, add:

```ts
it('inserts an inline link through registerInsertLink', async () => {
  let insertLink: ((href: string, title: string) => void) | undefined;
  const screen = render(MarkdownEditor, {
    value: 'start',
    name: 'body',
    registerInsertLink: (fn: (href: string, title: string) => void) => {
      insertLink = fn;
    },
  });
  await expect.poll(() => typeof insertLink).toBe('function');
  insertLink!('cairn:pages/about', 'About');
  await expect
    .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
    .toContain('[About](cairn:pages/about)');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: FAIL, `registerInsertLink` is not a prop and no link is inserted.

- [ ] **Step 3: Add the seam**

In `src/lib/components/MarkdownEditor.svelte`:

1. Import `insertInlineLink` beside the existing format import:

```ts
  import { applyMarkdownFormat, insertInlineLink, type FormatKind } from './markdown-format.js';
```

2. Add the prop to the `Props` interface (after `registerInsert`):

```ts
    /** Receives a `(href, title) => void` that inserts an inline link; the link picker calls it. */
    registerInsertLink?: (insert: (href: string, title: string) => void) => void;
```

3. Destructure it:

```ts
  let { value = $bindable(), name, registerInsert, registerInsertLink }: Props = $props();
```

4. Register the inline insert in `onMount`, beside `registerInsert?.(insertAtCursor)`:

```ts
    registerInsert?.(insertAtCursor);
    registerInsertLink?.(insertLink);
```

5. Add the `insertLink` function beside `applyFormat`:

```ts
  function insertLink(href: string, title: string) {
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc.toString();
    const next = insertInlineLink(doc, from, to, href, title);
    view.dispatch({
      changes: { from: 0, to: doc.length, insert: next.doc },
      selection: { anchor: next.from, head: next.to },
    });
    view.focus();
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: PASS. (If the run fails solely on a CodeMirror mount timeout on an unrelated case, re-run once.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/MarkdownEditor.svelte src/tests/component/MarkdownEditor.test.ts
git commit -m "feat(editor): the registerInsertLink seam

Add registerInsertLink, an inline link insert symmetric with registerInsert. The
editor owns selection handling: it wraps a selection as the display text or
inserts the title inline, with no block padding. The link picker calls it.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: the generic `completionSources` seam on `MarkdownEditor`

**Files:**
- Modify: `src/lib/components/MarkdownEditor.svelte`
- Modify: `src/tests/component/MarkdownEditor.test.ts`

Add the generic completion seam and prove it end to end with the link source: typing `[[` shows the options, selecting one inserts the link.

- [ ] **Step 1: Write the failing test**

In `src/tests/component/MarkdownEditor.test.ts`, add the imports at the top of the file:

```ts
import { userEvent } from '@vitest/browser/context';
import { cairnLinkCompletionSource } from '../../lib/components/link-completion.js';
import type { LinkTarget } from '../../lib/content/manifest.js';
```

Then add the test:

```ts
it('offers and applies a cairn link through the [[ autocomplete', async () => {
  const targets: LinkTarget[] = [
    { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
  ];
  const screen = render(MarkdownEditor, {
    value: '',
    name: 'body',
    completionSources: [cairnLinkCompletionSource(targets)],
  });
  await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
  const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
  content.focus();
  await userEvent.keyboard('[[Ab');
  // the autocomplete tooltip appears with the matching title
  await expect
    .poll(() => screen.container.querySelector('.cm-tooltip-autocomplete')?.textContent ?? '')
    .toContain('About Us');
  // accept the first option
  await userEvent.keyboard('{Enter}');
  await expect
    .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
    .toContain('[About Us](cairn:pages/about)');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: FAIL, `completionSources` is not a prop, so no autocomplete tooltip appears.

- [ ] **Step 3: Add the generic completion seam**

In `src/lib/components/MarkdownEditor.svelte`:

1. Add the type-only import near the top of the `<script>` (a type import, erased from the bundle):

```ts
  import type { CompletionSource } from '@codemirror/autocomplete';
```

2. Add the prop to `Props` (after `registerInsertLink`):

```ts
    /** Generic CodeMirror completion sources wired into the editor; the link autocomplete is one. */
    completionSources?: CompletionSource[];
```

3. Destructure it with a default:

```ts
  let { value = $bindable(), name, registerInsert, registerInsertLink, completionSources = [] }: Props = $props();
```

4. In `onMount`, dynamically import the autocomplete module beside the other CodeMirror imports:

```ts
    const autocompleteMod = await import('@codemirror/autocomplete');
```

5. Add the completion keymap and the autocompletion extension. Change the keymap line to put the completion keymap first, and add the extension to the `extensions` array. The relevant part of the `EditorState.create` extensions becomes:

```ts
          commandsMod.history(),
          keymap.of([...autocompleteMod.completionKeymap, ...commandsMod.defaultKeymap, ...commandsMod.historyKeymap]),
          markdownMod.markdown(),
          ...(completionSources.length ? [autocompleteMod.autocompletion({ override: completionSources })] : []),
          EditorView.lineWrapping,
```

(Keep the remaining extensions, `syntaxHighlighting`, `theme`, and the `updateListener`, unchanged after these.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/MarkdownEditor.test.ts`
Expected: PASS. The `[[Ab` keystrokes open the autocomplete (CodeMirror activates on typing when a source matches), and `{Enter}` applies the option. If the run fails solely on a CodeMirror mount timeout on an unrelated case, re-run once. If the tooltip is slow to appear, the `expect.poll` default timeout covers it; do not add fixed sleeps.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/MarkdownEditor.svelte src/tests/component/MarkdownEditor.test.ts
git commit -m "feat(editor): the generic completionSources seam

Add a completionSources prop wired through @codemirror/autocomplete, a generic
seam the editor exposes for any CodeMirror completion. The link autocomplete is
its first client: typing [[ offers the site's targets and selecting one inserts
the cairn link. The completion keymap leads so Enter and Escape drive the popup.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: `LinkPicker.svelte`, the dialog

**Files:**
- Create: `src/lib/components/LinkPicker.svelte`
- Create: `src/tests/component/LinkPicker.test.ts`

The "Link to page" trigger and its modal, mirroring `ComponentInsertDialog.svelte`.

- [ ] **Step 1: Write the failing test**

Create `src/tests/component/LinkPicker.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LinkPicker from '../../lib/components/LinkPicker.svelte';
import type { LinkTarget } from '../../lib/content/manifest.js';

const targets: LinkTarget[] = [
  { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
  { concept: 'posts', id: '2026-01-04-waxing', permalink: '/2026/01/waxing', title: 'Waxing Guide', date: '2026-01-04', draft: false },
  { concept: 'posts', id: '2026-02-02-draft', permalink: '/2026/02/draft', title: 'Secret Draft', date: '2026-02-02', draft: true },
];

function open(props: Partial<{ linkTargets: LinkTarget[]; insert: (href: string, title: string) => void }> = {}) {
  const calls: { href: string; title: string }[] = [];
  const screen = render(LinkPicker, {
    linkTargets: props.linkTargets ?? targets,
    insert: props.insert ?? ((href, title) => calls.push({ href, title })),
  });
  return { screen, calls };
}

describe('LinkPicker', () => {
  it('opens the dialog from the trigger and lists targets grouped with Pages first', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const text = dialog.textContent ?? '';
    expect(text).toContain('Pages');
    expect(text).toContain('Posts');
    expect(text.indexOf('Pages')).toBeLessThan(text.indexOf('Posts'));
    expect(text).toContain('About Us');
    expect(text).toContain('Waxing Guide');
  });

  it('shows a post date and a draft badge', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('2026-01-04');
    expect(text).toContain('Draft');
  });

  it('filters by a case-insensitive title substring', async () => {
    const { screen } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    await screen.getByRole('searchbox', { name: /search/i }).fill('wax');
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('Waxing Guide');
    expect(text).not.toContain('About Us');
  });

  it('inserts the cairn token for the picked target and closes', async () => {
    const { screen, calls } = open();
    await screen.getByRole('button', { name: /link to page/i }).click();
    await screen.getByRole('button', { name: /About Us/ }).click();
    expect(calls).toEqual([{ href: 'cairn:pages/about', title: 'About Us' }]);
    await expect.poll(() => screen.container.querySelector('dialog')!.open).toBe(false);
  });

  it('shows an empty state with no targets', async () => {
    const { screen } = open({ linkTargets: [] });
    await screen.getByRole('button', { name: /link to page/i }).click();
    expect(screen.container.querySelector('dialog')!.textContent ?? '').toMatch(/no pages or posts/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project component src/tests/component/LinkPicker.test.ts`
Expected: FAIL, the component does not exist.

- [ ] **Step 3: Implement `LinkPicker.svelte`**

Create `src/lib/components/LinkPicker.svelte`:

```svelte
<!--
@component
The "Link to page" control and its modal. It lists the site's posts and pages from the committed
manifest (the linkTargets the editor receives), grouped by concept with Pages first, each post
showing its date and each draft marked. Picking a target inserts a cairn: internal link through the
editor's registerInsertLink seam. Built on a native <dialog>, following the component dialog's a11y
conventions. The plain-URL link stays the toolbar's link button; this is for an internal target.
-->
<script lang="ts">
  import type { LinkTarget } from '../content/manifest.js';
  import { formatCairnToken } from '../content/links.js';

  interface Props {
    /** The site's link targets, from the committed manifest (editLoad ships them). */
    linkTargets: LinkTarget[];
    /** Insert an inline cairn link at the editor cursor. */
    insert: (href: string, title: string) => void;
  }

  let { linkTargets, insert }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let query = $state('');

  // Group filtered targets by concept, Pages first then Posts then any other concept, so the list
  // reads in a stable order. The filter is a case-insensitive title substring.
  const ORDER: Record<string, number> = { pages: 0, posts: 1 };
  function rank(concept: string): number {
    return ORDER[concept] ?? 2;
  }
  function heading(concept: string): string {
    if (concept === 'pages') return 'Pages';
    if (concept === 'posts') return 'Posts';
    return concept.charAt(0).toUpperCase() + concept.slice(1);
  }

  const groups = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const matched = q ? linkTargets.filter((t) => t.title.toLowerCase().includes(q)) : linkTargets;
    const byConcept = new Map<string, LinkTarget[]>();
    for (const t of matched) {
      const list = byConcept.get(t.concept) ?? [];
      list.push(t);
      byConcept.set(t.concept, list);
    }
    return [...byConcept.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([concept, items]) => ({ concept, heading: heading(concept), items }));
  });

  function open() {
    query = '';
    dialog?.showModal();
  }
  function close() {
    dialog?.close();
  }
  function choose(target: LinkTarget) {
    insert(formatCairnToken(target), target.title);
    close();
  }
</script>

<button type="button" class="btn btn-sm btn-ghost" aria-haspopup="dialog" aria-label="Link to page" onclick={open}>
  Link to page
</button>

<dialog class="modal" aria-labelledby="cairn-link-dialog-title" bind:this={dialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-link-dialog-title" class="text-base font-semibold">Link to a page</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={close}>✕</button>
    </div>

    <input
      type="search"
      class="input input-bordered mb-3 w-full"
      placeholder="Search by title"
      aria-label="Search pages and posts"
      bind:value={query}
    />

    {#if groups.length === 0}
      <p class="text-sm text-[var(--color-muted)]">No pages or posts to link to.</p>
    {:else}
      {#each groups as group (group.concept)}
        <h3 class="mt-2 mb-1 text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">{group.heading}</h3>
        <ul class="menu w-full">
          {#each group.items as target (target.concept + '/' + target.id)}
            <li>
              <button type="button" onclick={() => choose(target)}>
                <span class="flex flex-col items-start">
                  <span class="font-medium">{target.title}</span>
                  <span class="text-xs text-[var(--color-muted)]">
                    {#if target.draft}<span class="badge badge-ghost badge-sm mr-1">Draft</span>{/if}
                    {#if target.date}{target.date}{/if}
                  </span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/each}
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/LinkPicker.test.ts`
Expected: PASS. (The `searchbox` role is the native role of `<input type="search">`; the picked-target buttons are matched by their accessible name, the title text.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/LinkPicker.svelte src/tests/component/LinkPicker.test.ts
git commit -m "feat(admin): the LinkPicker dialog

Add LinkPicker, the Link to page control and its modal. It lists the site's
posts and pages from the manifest targets, grouped by concept with Pages first,
posts dated and drafts marked, filtered by a title substring. Picking a target
inserts a cairn link. It mirrors the component insert dialog's a11y conventions.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: wire the picker and the autocomplete into `EditPage`

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Modify: `src/tests/component/EditPage.test.ts`

`EditPage` registers the link completion source and the inline insert, and renders `<LinkPicker>` beside the component dialog.

- [ ] **Step 1: Write the failing test**

In `src/tests/component/EditPage.test.ts`, add a test. The existing `postProps()`/`pageProps()` helpers build the props; `data.linkTargets` defaults to `[]` (Plan 2). Add a case that passes targets and asserts the picker inserts into the editor body:

```ts
it('inserts a cairn link from the Link to page picker', async () => {
  const props = postProps();
  props.data.linkTargets = [
    { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
  ];
  const screen = render(EditPage, props);
  await screen.getByRole('button', { name: /link to page/i }).click();
  await screen.getByRole('button', { name: /About Us/ }).click();
  await expect
    .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
    .toContain('[About Us](cairn:pages/about)');
});
```

(If `postProps()` returns a frozen or shared object, clone it first: `const props = structuredClone(postProps())` or build the `linkTargets` into a fresh props object the way the file's other tests set fields. Mirror how the existing tests mutate props.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: FAIL, there is no "Link to page" button yet.

- [ ] **Step 3: Wire EditPage**

In `src/lib/components/EditPage.svelte`:

1. Add the imports beside the existing component imports:

```ts
  import LinkPicker from './LinkPicker.svelte';
  import { cairnLinkCompletionSource } from './link-completion.js';
```

2. Add the inline-insert holder beside the existing `let insert = ...`:

```ts
  let insertLink = $state.raw<(href: string, title: string) => void>(() => {});
```

3. Build the completion source from the link targets (a `$derived`, beside `resolveLink`):

```ts
  const completionSources = $derived([cairnLinkCompletionSource(data.linkTargets)]);
```

4. Render `<LinkPicker>` beside `<ComponentInsertDialog ... />` (the chrome row near line 87):

```svelte
    <ComponentInsertDialog {registry} {insert} {icons} />
    <LinkPicker linkTargets={data.linkTargets} insert={insertLink} />
```

5. Pass the new props to `<MarkdownEditor>` (near line 112):

```svelte
    <MarkdownEditor
      bind:value={body}
      name="body"
      registerInsert={(fn) => (insert = fn)}
      registerInsertLink={(fn) => (insertLink = fn)}
      {completionSources}
    />
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS. (If the run fails solely on a CodeMirror mount timeout on an unrelated case, re-run once.)

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts
git commit -m "feat(admin): wire the link picker and the [[ autocomplete into EditPage

EditPage registers the link completion source and the inline insert with the
editor, and renders the Link to page picker beside the component insert dialog.
Both read the linkTargets the load already ships, so an author inserts a cairn
link by dialog or by typing [[.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: the public exports

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `src/lib/components/index.ts`
- Modify: `src/tests/component/components-barrel.test.ts` (the barrel test; confirm its shape first)

- [ ] **Step 1: Add the exports**

In `src/lib/index.ts`, change the links re-export to add `formatCairnToken`:

```ts
export { parseCairnToken, extractCairnLinks, formatCairnToken } from './content/links.js';
```

In `src/lib/components/index.ts`, add beside the other component exports:

```ts
export { default as LinkPicker } from './LinkPicker.svelte';
```

- [ ] **Step 2: Assert the barrel exports it (test-first where the barrel is tested)**

Open `src/tests/component/components-barrel.test.ts` and read how it asserts the barrel (it imports from `../../lib/components/index.js` and checks each component is defined). Add `LinkPicker` to whatever list or assertion it uses, mirroring the existing entries. If the test enumerates a list of names, add `'LinkPicker'`; if it asserts each import is truthy, add a `LinkPicker` assertion.

Run: `npx vitest run --project component src/tests/component/components-barrel.test.ts`
Expected: PASS (the export now exists).

- [ ] **Step 3: Verify the package surface**

Run: `npm run check:package`
Expected: all-green across the existing entries, with the new exports resolving and no export-condition change.

- [ ] **Step 4: Full gate**

Run `npm run check` (0/0) and `npm test` (exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/lib/index.ts src/lib/components/index.ts src/tests/component/components-barrel.test.ts
git commit -m "feat: export formatCairnToken and LinkPicker

Export formatCairnToken from the main entry beside the other cairn: token
helpers, and LinkPicker from the components entry, the surface a site uses to
offer the internal-link picker.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: the version bump

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.18.0"` to `"version": "0.19.0"` (additive minor: two new optional `MarkdownEditor` props, a new `LinkPicker` component, a new `formatCairnToken` export, and the pure helpers; nothing a consuming site already wires breaks). Confirm the current value is `0.18.0` before editing.

- [ ] **Step 2: Final gate**

Run `npm run check` (0/0), `npm test` (exit 0), and `npm run check:package` (green).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: bump 0.19.0 for the editor link picker

The link picker pass is additive: the Link to page dialog and the [[ autocomplete,
two new optional MarkdownEditor props, a new component, and formatCairnToken.
Nothing a consuming site already wires breaks, so the minor moves to 0.19.0.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification items (no implementation task)

- **The completion seam is generic.** Confirm `MarkdownEditor`'s `completionSources` prop is typed `CompletionSource[]` and the editor wires it through `autocompletion({ override: completionSources })` with no link-specific knowledge; the only link-aware code is `link-completion.ts` and the EditPage wiring.
- **The plain link button is untouched.** Confirm the toolbar's existing `link` format button still inserts `[text](url)` and was not changed; "Link to page" is a separate affordance.
- **Drafts are offered, flagged.** Confirm both `linkCompletions` and `LinkPicker` include a draft target and mark it, matching the design decision.
- **Selection wrap.** Confirm the toolbar picker path wraps a selection as the display text through `insertInlineLink` (the unit test covers the transform; the `registerInsertLink` seam applies it with the live selection).

## Pass-end review gate

This pass is editor UI: Svelte 5 runes, a CodeMirror seam, and a DaisyUI dialog. The gate runs the simplifier over the changed code, then `svelte-reviewer` (the `$derived` completion source and the picker reactivity) and `daisyui-a11y-reviewer` (the dialog, the search box, the keyboard and focus path, the draft badge, the autocomplete popup's keyboard contract), both Opus, plus a high-effort `/code-review`. `cloudflare-workers-reviewer` and `web-auth-security-reviewer` do not apply (no Worker, D1, auth, session, or cookie code). The live `/admin` interactive smoke (open the dialog, pick a target, type `[[` and accept a completion, confirm the inserted link in a real browser against a Worker) is a carried fast-follow for the ecnordic migration, since the showcase runs `adapter-node` and the browser component tests cover the dialog and the autocomplete here.

## Self-review notes

- **Spec coverage.** The two entry points are Task 7 (dialog) and Tasks 4 plus 6 (the `[[` autocomplete). The generic seam is Task 6. The inline insert is Tasks 3 and 5. The shared pure code is Tasks 2, 3, and 4. Drafts-shown-flagged is in Tasks 4 and 7. Substring search is in Tasks 4 and 7. The dependency add is Task 1. The exports and the bump are Tasks 9 and 10.
- **Type consistency.** `formatCairnToken(ref: CairnRef): string`, `insertInlineLink(doc, from, to, href, title): FormatResult`, `matchCairnTrigger(before): { query, from } | null`, `linkCompletions(targets: LinkTarget[], query): Completion[]`, `cairnLinkCompletionSource(targets: LinkTarget[]): CompletionSource`, the `MarkdownEditor` props `registerInsertLink?: (insert: (href, title) => void) => void` and `completionSources?: CompletionSource[]`, and `LinkPicker` props `{ linkTargets: LinkTarget[]; insert: (href, title) => void }` are used identically everywhere they appear.
- **No placeholders.** Every code step shows complete code. The three tests that mirror an existing harness (Task 8 EditPage, Task 9 the barrel, and the markdown-format test file in Task 3) name the file to mirror and the exact assertions, since the existing setup is the cheapest correct fixture.
- **Dependency.** Task 1 adds `@codemirror/autocomplete` as a direct dependency before any task imports it. Plan 2's "no dependency changes" rule was Plan-2-specific; this plan adds one deliberately.
