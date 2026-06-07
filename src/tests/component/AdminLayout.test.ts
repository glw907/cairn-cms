import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import AdminLayout from '../../lib/components/AdminLayout.svelte';

const child = createRawSnippet(() => ({ render: () => '<p>page body</p>' }));

function data(canManageEditors: boolean, navLabel: string | null = null) {
  return {
    siteName: 'Test Site',
    user: { displayName: 'Ed', email: 'ed@example.com', role: canManageEditors ? ('owner' as const) : ('editor' as const) },
    concepts: [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }],
    pathname: '/admin/posts',
    canManageEditors,
    navLabel,
    theme: 'cairn-admin' as const,
  };
}

describe('AdminLayout', () => {
  it('applies the cairn-admin theme and renders the concept nav and child', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText('page body')).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Posts' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Pages' })).toBeInTheDocument();
    expect(document.querySelector('[data-theme="cairn-admin"]')).not.toBeNull();
  });

  it('shows the manage-editors link to an owner', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByRole('link', { name: /editors/i })).toBeInTheDocument();
  });

  it('hides the manage-editors link from an editor', async () => {
    const screen = render(AdminLayout, { data: data(false), children: child });
    await expect.element(screen.getByRole('link', { name: /editors/i })).not.toBeInTheDocument();
  });

  it('shows the navigation link when a nav menu is configured', async () => {
    const screen = render(AdminLayout, { data: data(false, 'Primary nav'), children: child });
    await expect.element(screen.getByRole('link', { name: 'Primary nav' })).toBeInTheDocument();
  });
});
