import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
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
