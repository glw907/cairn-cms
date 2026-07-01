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
