import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';
import { COLD_START, makeFakeWorker } from './fake-spell-worker.js';

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
