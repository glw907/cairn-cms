import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import CairnAdminShell from '../../lib/components/CairnAdminShell.svelte';
import { resolveNavLayout } from '../../lib/sveltekit/admin-nav.js';

const child = createRawSnippet(() => ({ render: () => '<p>page body</p>' }));

function data(canManageEditors: boolean, navLabel: string | null = null, pathname = '/admin/posts') {
  const role = canManageEditors ? ('owner' as const) : ('editor' as const);
  const capability = role;
  const concepts = [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }];
  return {
    public: false as const,
    siteName: 'Test Site',
    user: { displayName: 'Ed', email: 'ed@example.com', role, capability },
    concepts,
    nav: resolveNavLayout({ layout: undefined, adminNav: [], concepts, navMenuLabel: navLabel, capability, role }),
    pathname,
    theme: 'cairn-admin' as const,
    collapsedNav: [] as string[],
    csrf: 'test-csrf-token',
    pendingEntries: Promise.resolve(null) as Promise<{ concept: string; id: string }[] | null>,
  };
}

describe('CairnAdminShell Help home', () => {
  it('pins a Help home that is current on /admin/help', async () => {
    const screen = render(CairnAdminShell, { data: data(true, null, '/admin/help'), children: child });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' });
    const help = sidebar.getByRole('link', { name: 'Help' });
    await expect.element(help).toHaveAttribute('href', '/admin/help');
    await expect.element(help).toHaveAttribute('aria-current', 'page');
  });

  it('the Help home is not current on another route', async () => {
    const screen = render(CairnAdminShell, { data: data(true, null, '/admin/posts'), children: child });
    const sidebar = screen.getByRole('navigation', { name: 'Site content' });
    const help = sidebar.getByRole('link', { name: 'Help' });
    await expect.element(help).not.toHaveAttribute('aria-current');
  });
});
