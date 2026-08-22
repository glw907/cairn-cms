import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DeleteDialog from '../../lib/components/DeleteDialog.svelte';
import type { InboundLink } from '../../lib/content/manifest.js';

async function open(props: {
  conceptId: string;
  id: string;
  singular: string;
  inboundLinks: InboundLink[];
  pending?: boolean;
  inboundKind?: 'link' | 'include';
}) {
  return await render(DeleteDialog, props);
}

describe('DeleteDialog', () => {
  it('confirms a delete when nothing links here', async () => {
    const screen = await open({ conceptId: 'posts', id: '2026-05-hi', singular: 'Post', inboundLinks: [] });
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
    const screen = await open({ conceptId: 'posts', id: '2026-05-hi', singular: 'Post', inboundLinks: [], pending: true });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('Unpublished edits to this entry are discarded too.');
  });

  it('omits the pending-edits warning by default', async () => {
    const screen = await open({ conceptId: 'posts', id: '2026-05-hi', singular: 'Post', inboundLinks: [] });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).not.toContain('Unpublished edits');
  });

  it('renders no trigger with trigger=false but still opens through the exported open()', async () => {
    const screen = await render(DeleteDialog, {
      conceptId: 'posts',
      id: '2026-05-hi',
      singular: 'Post',
      inboundLinks: [],
      trigger: false,
    });
    // Headless: only the dialog renders, no button outside it.
    expect(screen.container.querySelector('button[aria-haspopup="dialog"]')).toBeNull();
    const dialog = screen.container.querySelector('dialog')!;
    expect(dialog.open).toBe(false);
    screen.component.open();
    expect(dialog.open).toBe(true);
  });

  it('blocks the delete and names inbound links', async () => {
    const screen = await open({
      conceptId: 'pages', id: 'home', singular: 'Page',
      inboundLinks: [{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }],
    });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    // The linker (a post) belongs to a different concept than the deleted entry (a page), so the
    // count names an anonymous entry, never the deleted entry's own noun.
    expect(text).toContain('1 entry links here');
    expect(text).toContain('Post B');
    // No confirm form when blocked.
    expect(screen.container.querySelector('dialog form[action="?/delete"]')).toBeNull();
    // The link to the referrer's edit page is present.
    const link = screen.container.querySelector('dialog a[href="/admin/posts/b"]');
    expect(link).not.toBeNull();
  });

  it('defaults inboundKind to link, keeping the linking copy byte-identical', async () => {
    const screen = await open({
      conceptId: 'pages', id: 'home', singular: 'Page',
      inboundLinks: [{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }],
    });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('link');
    expect(text).not.toContain('include');
  });

  it('renders inclusion copy when blocked with inboundKind="include"', async () => {
    const screen = await open({
      conceptId: 'fragments', id: 'welcome', singular: 'Fragment',
      inboundLinks: [{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }],
      inboundKind: 'include',
    });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toMatch(/included by/i);
    expect(text).toContain('1 entry');
    expect(text).toMatch(/remove the include first/i);
    expect(text).toContain('Post B');
    // No confirm form when blocked.
    expect(screen.container.querySelector('dialog form[action="?/delete"]')).toBeNull();
  });

  it('names the deleted entry by its singular noun, in the title and both confirm prompts', async () => {
    // A concept whose singular differs from its label the way every real call site's data.singular
    // does (label "Posts", singular "Post"); the component must never lowercase the plural itself.
    const screen = await open({ conceptId: 'posts', id: '2026-05-hi', singular: 'Post', inboundLinks: [] });
    await screen.getByRole('button', { name: /delete/i }).click();
    const dialog = screen.container.querySelector('dialog')!;
    const heading = dialog.querySelector('#cairn-delete-dialog-title')!;
    expect(heading.textContent).toBe('Delete this post?');
    const confirm = screen.getByRole('button', { name: /^delete this/i });
    expect((confirm.element() as HTMLButtonElement).textContent).toBe('Delete this post');
  });

  it('never derives the inbound-linker count from the deleted entry’s own noun', async () => {
    // Two linkers spanning two different concepts (a post and a page), the case the old
    // label-derived plural got wrong: it read "2 postss link here" (label "Posts" already plural,
    // then pluralized again), which was also the wrong noun regardless, since a page linking here
    // has nothing to do with the deleted post's own concept.
    const screen = await open({
      conceptId: 'posts', id: '2026-05-hi', singular: 'Post',
      inboundLinks: [
        { concept: 'pages', id: 'about', title: 'About', permalink: '/about' },
        { concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' },
      ],
    });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('2 entries link here');
    expect(text).not.toContain('postss');
  });

  it('pluralizes the inclusion copy for more than one includer', async () => {
    const screen = await open({
      conceptId: 'fragments', id: 'welcome', singular: 'Fragment',
      inboundLinks: [
        { concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' },
        { concept: 'pages', id: 'about', title: 'About', permalink: '/about' },
      ],
      inboundKind: 'include',
    });
    await screen.getByRole('button', { name: /delete/i }).click();
    const text = screen.container.querySelector('dialog')!.textContent ?? '';
    expect(text).toContain('2 entries');
  });
});
