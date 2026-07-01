import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { COLD_START, makeFakeWorker } from './fake-spell-worker.js';
import { cairnLinkCompletionSource } from '../../lib/components/link-completion.js';
import type { LinkTarget } from '../../lib/content/manifest.js';

describe('editor accessible name', () => {
  it('gives the .cm-content textbox an accessible name', async () => {
    const { container } = render(MarkdownEditor, { value: 'hello', name: 'body' });
    await expect.poll(() => container.querySelector('.cm-content'), COLD_START).toBeTruthy();
    const content = container.querySelector('.cm-content')!;
    expect(content.getAttribute('role')).toBe('textbox');
    expect(content.getAttribute('aria-label')).toBe('Markdown source');
  });
});

describe('diagnostics-summary announcer', () => {
  it('announces a settled diagnostics summary through a polite region', async () => {
    const fake = makeFakeWorker({ wrong: ['teh'], suggestions: ['the'] });
    const { container } = render(MarkdownEditor, {
      value: 'teh cat teh dog',
      name: 'body',
      spellcheck: true,
      spellcheckTest: { createWorker: fake.create, assumeReady: true },
    });
    await expect
      .poll(() => container.querySelector('[aria-live="polite"].cairn-cm-diagnostics-live')?.textContent, COLD_START)
      .toContain('spelling');
  });
});

describe('diagnostic traversal', () => {
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
});

describe('fold-control disclosure semantics', () => {
  it('fold control exposes aria-expanded and a state-neutral name', async () => {
    const doc = ':::note\nbody line one\nbody line two\n:::\n';
    const { container } = render(MarkdownEditor, { value: doc, name: 'body' });
    await expect.poll(() => container.querySelector('.cm-cairn-fold-btn'), COLD_START).toBeTruthy();
    const btn = container.querySelector('.cm-cairn-fold-btn')!;
    expect(btn.getAttribute('aria-expanded')).toBe('true'); // expanded at rest
    const label = btn.getAttribute('aria-label') ?? '';
    expect(label.toLowerCase()).not.toMatch(/fold|unfold|show/); // state-neutral, names the block
  });
});

describe('fold-control name stays in sync with an in-place directive rename', () => {
  it('updates the gutter aria-label when the opener directive is renamed in place', async () => {
    const doc = ':::note\nbody line one\nbody line two\n:::\n';
    let replace: ((from: number, to: number, text: string) => void) | undefined;
    const { container } = render(MarkdownEditor, {
      value: doc,
      name: 'body',
      registerReplaceRange: (fn: (from: number, to: number, text: string) => void) => {
        replace = fn;
      },
    });
    await expect.poll(() => container.querySelector('.cm-cairn-fold-btn'), COLD_START).toBeTruthy();
    const before = container.querySelector('.cm-cairn-fold-btn')!.getAttribute('aria-label');
    expect(before).toBe('note section');
    await expect.poll(() => typeof replace).toBe('function');
    // Rename the opener in place: same span, same fold state, caret lands on the opener line.
    const from = doc.indexOf('note');
    replace!(from, from + 'note'.length, 'warning');
    await expect
      .poll(() => container.querySelector('.cm-cairn-fold-btn')?.getAttribute('aria-label'), COLD_START)
      .toBe('warning section');
  });
});

describe('folded pill name stays in sync with an in-place directive rename', () => {
  it('updates the folded pill aria-label when the opener directive is renamed while folded', async () => {
    const doc = ':::note\nbody line one\nbody line two\n:::\n';
    let replace: ((from: number, to: number, text: string) => void) | undefined;
    const { container } = render(MarkdownEditor, {
      value: doc,
      name: 'body',
      registerReplaceRange: (fn: (from: number, to: number, text: string) => void) => {
        replace = fn;
      },
    });
    await expect.poll(() => container.querySelector('.cm-cairn-fold-btn'), COLD_START).toBeTruthy();
    await userEvent.click(container.querySelector<HTMLButtonElement>('.cm-cairn-fold-btn')!);
    await expect.poll(() => container.querySelector('.cm-cairn-fold-pill'), COLD_START).toBeTruthy();
    const before = container.querySelector('.cm-cairn-fold-pill')!.getAttribute('aria-label') ?? '';
    expect(before.startsWith('note section,')).toBe(true);
    await expect.poll(() => typeof replace).toBe('function');
    // Rename the opener while the block stays folded; the opener line is always visible.
    const from = doc.indexOf('note');
    replace!(from, from + 'note'.length, 'warning');
    await expect
      .poll(() => container.querySelector('.cm-cairn-fold-pill')?.getAttribute('aria-label'), COLD_START)
      .toBe(before.replace('note section,', 'warning section,'));
  });
});

describe('autocomplete ARIA regression guard', () => {
  it("link-completion inherits CodeMirror's combobox ARIA", async () => {
    const targets: LinkTarget[] = [
      { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
    ];
    const { container } = render(MarkdownEditor, {
      value: '',
      name: 'body',
      completionSources: [cairnLinkCompletionSource(targets)],
    });
    await expect.poll(() => container.querySelector('.cm-content'), COLD_START).toBeTruthy();
    const content = container.querySelector<HTMLElement>('.cm-content')!;
    content.focus();
    // userEvent.keyboard treats [ as a key-descriptor opener, so a literal [ is escaped as [[.
    await userEvent.keyboard('[[[[Ab');
    await expect
      .poll(() => container.querySelector('.cm-tooltip-autocomplete [role="listbox"]'), COLD_START)
      .toBeTruthy();
    expect(content.getAttribute('aria-autocomplete')).toBe('list');
    expect(content.getAttribute('aria-controls')).toBeTruthy();
    const listbox = container.querySelector('.cm-tooltip-autocomplete [role="listbox"]')!;
    expect(listbox.getAttribute('aria-label')).toBeTruthy();
    expect(listbox.querySelector('[role="option"]')).toBeTruthy();
  });
});
