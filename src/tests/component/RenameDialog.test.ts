import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RenameDialog from '../../lib/components/RenameDialog.svelte';

function open(props: { conceptId: string; id: string; label: string; slug: string; routable?: boolean }) {
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
    // The mutation form carries the CSRF field the guard validates.
    expect(form!.querySelector('input[name="csrf"]')).not.toBeNull();
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

  // A non-routable entry has no URL to change, and it is includes, not links, that repoint on
  // rename. Naming a URL here would promise an address the entry does not have, and naming links
  // would point the author at the wrong thing to check.
  it('renames a name, not a URL, for a non-routable concept', async () => {
    const screen = open({ conceptId: 'fragments', id: 'welcome', label: 'Fragment', slug: 'welcome', routable: false });
    await screen.getByRole('button', { name: /^rename$/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    const text = dialog.textContent ?? '';
    expect(text).toMatch(/rename this fragment/i);
    expect(text).toMatch(/entries that include this fragment/i);
    expect(text).not.toMatch(/URL/i);
    expect(text).not.toMatch(/address/i);
    // The rename still posts through the same action, so only the copy differs.
    expect(dialog.querySelector('form[action="?/rename"]')).not.toBeNull();
  });
});
