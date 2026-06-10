import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DeleteDialog from '../../lib/components/DeleteDialog.svelte';
import type { InboundLink } from '../../lib/content/manifest.js';

function open(props: { conceptId: string; id: string; label: string; inboundLinks: InboundLink[]; pending?: boolean }) {
  return render(DeleteDialog, props);
}

describe('DeleteDialog', () => {
  it('confirms a delete when nothing links here', async () => {
    const screen = open({ conceptId: 'posts', id: '2026-05-hi', label: 'Post', inboundLinks: [] });
    await screen.getByRole('button', { name: /delete/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    // A delete form posts to ?/delete.
    const form = dialog.querySelector('form[action="?/delete"]');
    expect(form).not.toBeNull();
    // The mutation form carries the CSRF field the guard validates.
    expect(form!.querySelector('input[name="csrf"]')).not.toBeNull();
    // The confirm button is enabled.
    const confirm = screen.getByRole('button', { name: /^delete this/i });
    expect((confirm.element() as HTMLButtonElement).disabled).toBe(false);
  });

  it('warns that a delete discards pending edits too', async () => {
    const screen = open({ conceptId: 'posts', id: '2026-05-hi', label: 'Post', inboundLinks: [], pending: true });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('Unpublished edits to this entry are discarded too.');
  });

  it('omits the pending-edits warning by default', async () => {
    const screen = open({ conceptId: 'posts', id: '2026-05-hi', label: 'Post', inboundLinks: [] });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).not.toContain('Unpublished edits');
  });

  it('blocks the delete and names inbound links', async () => {
    const screen = open({
      conceptId: 'pages', id: 'home', label: 'Page',
      inboundLinks: [{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }],
    });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toMatch(/1 page/i); // names the count
    expect(text).toContain('Post B');
    // No confirm form when blocked.
    expect(screen.container.querySelector('dialog form[action="?/delete"]')).toBeNull();
    // The link to the referrer's edit page is present.
    const link = screen.container.querySelector('dialog a[href="/admin/posts/b"]');
    expect(link).not.toBeNull();
  });
});
