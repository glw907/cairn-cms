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

  it('reflects an external value reassignment into the mounted editor', async () => {
    const screen = render(MarkdownEditor, { value: 'first', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-editor')?.textContent ?? '').toContain('first');
    await screen.rerender({ value: 'second', name: 'body' });
    await expect.poll(() => screen.container.querySelector('.cm-editor')?.textContent ?? '').toContain('second');
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('second');
  });
});
