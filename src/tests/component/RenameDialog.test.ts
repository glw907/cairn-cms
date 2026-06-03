import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RenameDialog from '../../lib/components/RenameDialog.svelte';

function open(props: { conceptId: string; id: string; label: string; slug: string }) {
  return render(RenameDialog, props);
}

describe('RenameDialog', () => {
  it('opens a dialog prefilled with the current slug and posts to ?/rename', async () => {
    const screen = open({ conceptId: 'posts', id: '2026-05-hi', label: 'Post', slug: 'hi' });
    await screen.getByRole('button', { name: /change url/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const input = dialog.querySelector<HTMLInputElement>('input[name="slug"]')!;
    expect(input.value).toBe('hi');
    const form = dialog.querySelector('form[action="?/rename"]');
    expect(form).not.toBeNull();
  });
  it('seeds focus into the slug input when the dialog opens', async () => {
    const screen = open({ conceptId: 'posts', id: '2026-05-hi', label: 'Post', slug: 'hi' });
    await screen.getByRole('button', { name: /change url/i }).click();
    const input = screen.container.querySelector<HTMLInputElement>('input[name="slug"]')!;
    await expect.poll(() => document.activeElement).toBe(input);
  });

  it('notes that links update automatically', async () => {
    const screen = open({ conceptId: 'pages', id: 'home', label: 'Page', slug: 'home' });
    await screen.getByRole('button', { name: /change url/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toMatch(/links/i);
    expect(text).toMatch(/automatically|update/i);
  });
});
