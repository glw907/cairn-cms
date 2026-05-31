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
