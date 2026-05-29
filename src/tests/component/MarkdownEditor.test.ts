import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownEditor from '../../lib/components/MarkdownEditor.svelte';

describe('MarkdownEditor', () => {
  it('mirrors the bindable value into a hidden field named for the form', async () => {
    const screen = render(MarkdownEditor, { value: 'hello world', name: 'body' });
    // The seam exposes the current value through a hidden form field named `body`.
    await expect.element(screen.container.querySelector<HTMLInputElement>('input[name="body"]')!).toHaveValue('hello world');
  });
});
